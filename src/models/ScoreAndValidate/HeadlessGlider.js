const HeadlessGrid = require('./HeadlessGrid.js')
const HeadlessFlow = require('./HeadlessFlow.js')
const HeadlessObservation = require('./HeadlessObservation.js')
const DiveProfileModel = require('./DiveProfileModel.js')
const WaterColumnSchema = require('./WaterColumnSchema.js')
function createHeadlessGliderState(config = {}) {
  const missionGlider = config.missionConfig?.gliders?.[0] ?? config.glider ?? {};
  const start = missionGlider.start ?? config.start ?? { x: 0, y: 0, z: 0 };
  return {
    gliderId: missionGlider.id ?? config.gliderId ?? 'glider-1',
    x: finiteNumber(start.x, 0),
    y: finiteNumber(start.y, 0),
    zIndex: Math.max(0, Math.round(finiteNumber(start.z ?? start.zIndex, 0))),
    depthLayer: config.grid?.depthLayers?.[Math.max(0, Math.round(finiteNumber(start.z ?? start.zIndex, 0)))] ?? 'surface',
    timeSeconds: 0,
    distanceTraveled: 0,
    energyUsed: 0,
    hazardExposureCount: 0,
    completed: false
  };
}

 function createHeadlessWaypoint(value = {}) {
  const hasExplicitDepth = value.zIndex !== undefined || value.z !== undefined || value.depthLayer !== undefined || value.depthLayerId !== undefined;
  return {
    waypointId: value.waypointId ?? value.id ?? null,
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    zIndex: Math.max(0, Math.round(finiteNumber(value.zIndex ?? value.z, 0))),
    depthLayer: value.depthLayer ?? value.depthLayerId ?? null,
    depthLayerId: value.depthLayerId ?? value.depthLayer ?? null,
    diveProfileId: value.diveProfileId ?? value.profileId ?? null,
    hasExplicitDepth
  };
}

 function interpolateHeadlessRoute(waypoints = [], stepDistance = 1) {
  const points = [];
  const normalized = (Array.isArray(waypoints) ? waypoints : []).map(createHeadlessWaypoint);
  if (!normalized.length) return points;
  const totalDistance = routeDistance(normalized) || 1;
  let traveled = 0;
  points.push({ ...normalized[0], routeProgress: 0, segmentIndex: 0, distanceFromStart: 0 });
  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const next = normalized[index];
    const distance = distance2d(previous, next);
    const steps = Math.max(1, Math.ceil(distance / Math.max(0.1, finiteNumber(stepDistance, 1))));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const segmentDistance = distance * t;
      const zFloat = previous.zIndex + (next.zIndex - previous.zIndex) * t;
      points.push({
        waypointId: step === steps ? next.waypointId : null,
        x: previous.x + (next.x - previous.x) * t,
        y: previous.y + (next.y - previous.y) * t,
        zIndex: Math.round(zFloat),
        depthLayer: next.depthLayer ?? previous.depthLayer ?? null,
        depthLayerId: next.depthLayerId ?? next.depthLayer ?? previous.depthLayerId ?? previous.depthLayer ?? null,
        diveProfileId: next.diveProfileId ?? previous.diveProfileId ?? null,
        hasExplicitDepth: previous.hasExplicitDepth || next.hasExplicitDepth,
        segmentIndex: index - 1,
        routeProgress: (traveled + segmentDistance) / totalDistance,
        distanceFromStart: traveled + segmentDistance
      });
    }
    traveled += distance;
  }
  return points;
}

 function depthIndexForDiveProfile(profile = {}, progress = 0) {
  const minZ = Math.max(0, Math.round(finiteNumber(profile.minZ, 0)));
  const maxZ = Math.max(minZ, Math.round(finiteNumber(profile.maxZ, minZ)));
  if (profile.mode !== 'sawtooth' || maxZ === minZ) return minZ;
  const cycleLength = Math.max(0.01, finiteNumber(profile.cycleLength, 0.5));
  const phase = (finiteNumber(progress, 0) / cycleLength) % 1;
  const triangle = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  return Math.round(minZ + triangle * (maxZ - minZ));
}

 function simulateHeadlessGliderRoute({ fieldPack, glider, waypoints, missionConfig, seed = 'demo-001' } = {}) {
  const grid = fieldPack?.grid ?? {};
  const missionGlider = glider ?? missionConfig?.gliders?.[0] ?? {};
  const gliderId = missionGlider.id ?? 'glider-1';
  const waterColumnConfig = WaterColumnSchema.normalizeWaterColumnConfig(missionConfig?.world?.waterColumnConfig ?? {
    depthLayerIds: grid.depthLayers,
    diveProfileId: missionGlider.diveProfileId ?? missionGlider.diveProfile?.id ?? missionGlider.diveProfile?.profileId
  });
  const diveProfile = DiveProfileModel.normalizeDiveProfile(missionGlider.diveProfile ?? missionGlider.diveProfileId ?? waterColumnConfig.diveProfileId, waterColumnConfig);
  const state = createHeadlessGliderState({ missionConfig: { gliders: [missionGlider] }, grid });
  const route = interpolateHeadlessRoute(waypoints, missionConfig?.planningRules?.stepDistance ?? 1.25);
  const tracks = [];
  const observations = [];
  const sensorNoise = finiteNumber(missionConfig?.sensorNoise, 0.03);
  const speed = Math.max(0.1, finiteNumber(missionGlider.speed, 1));
  let previous = route[0] ?? { x: state.x, y: state.y, zIndex: state.zIndex, routeProgress: 0 };
  for (let index = 0; index < route.length; index += 1) {
    const point = route[index];
    const pointProfile = point.diveProfileId ? { ...diveProfile, id: point.diveProfileId, profileId: point.diveProfileId } : diveProfile;
    const zIndex = point.hasExplicitDepth
      ? Math.max(0, Math.min((grid.depthCount ?? 1) - 1, Math.round(point.zIndex)))
      : DiveProfileModel.depthIndexForWaterColumnDiveProfile(pointProfile, point.routeProgress ?? 0, waterColumnConfig);
    const segmentDistance = index === 0 ? 0 : distance2d(previous, point);
    const direction = index === 0 ? { x: 1, y: 0 } : { x: point.x - previous.x, y: point.y - previous.y };
    const flow = HeadlessFlow.sampleHeadlessFlow(fieldPack, point.x, point.y, zIndex);
    const assist = HeadlessFlow.currentAssist(flow, direction);
    const cross = HeadlessFlow.crossCurrentMagnitude(flow, direction);
    const hazard = HeadlessGrid.sampleNearest3d(fieldPack?.fields?.hazard, point.x, point.y, zIndex);
    const mask = HeadlessGrid.sampleNearest3d(fieldPack?.fields?.constraintMask, point.x, point.y, zIndex);
    const timeIncrement = segmentDistance > 0 ? (segmentDistance / speed) * 60 : 0;
    state.timeSeconds += timeIncrement;
    state.distanceTraveled += segmentDistance;
    const opposition = Math.max(0, -assist);
    const energyUsedIncrement = segmentDistance * (1 + 2.2 * opposition + 0.5 * cross + 1.5 * hazard + 2 * mask);
    state.energyUsed += energyUsedIncrement;
    if (hazard >= 0.35 || mask >= 0.5) state.hazardExposureCount += 1;
    const depthLayer = grid.depthLayers?.[zIndex] ?? point.depthLayer ?? 'surface';
    tracks.push({
      timeSeconds: Number(state.timeSeconds.toFixed(3)),
      gliderId,
      x: Number(point.x.toFixed(3)),
      y: Number(point.y.toFixed(3)),
      zIndex,
      depthLayer,
      depthLayerId: depthLayer,
      diveProfileId: pointProfile.id ?? diveProfile.id,
      flowU: Number(flow.u.toFixed(6)),
      flowV: Number(flow.v.toFixed(6)),
      currentAssist: Number(assist.toFixed(6)),
      crossCurrent: Number(cross.toFixed(6)),
      energyUsedIncrement: Number(energyUsedIncrement.toFixed(6)),
      hazard: Number(hazard.toFixed(6)),
      constraintMask: Number(mask.toFixed(6))
    });
    observations.push(HeadlessObservation.sampleHeadlessObservation({
      fieldPack,
      x: point.x,
      y: point.y,
      zIndex,
      gliderId,
      timeSeconds: state.timeSeconds,
      sensorNoise,
      seed,
      diveProfileId: pointProfile.id ?? diveProfile.id
    }));
    previous = point;
  }
  state.x = previous.x ?? state.x;
  state.y = previous.y ?? state.y;
  state.zIndex = previous.zIndex ?? state.zIndex;
  state.depthLayer = grid.depthLayers?.[state.zIndex] ?? state.depthLayer;
  state.completed = route.length > 1;
  return { state, route, tracks, observations };
}

function routeDistance(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += distance2d(points[index - 1], points[index]);
  return total;
}

function distance2d(a, b) {
  return Math.hypot(finiteNumber(b.x, 0) - finiteNumber(a.x, 0), finiteNumber(b.y, 0) - finiteNumber(a.y, 0));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
module.exports = {createHeadlessWaypoint, interpolateHeadlessRoute, depthIndexForDiveProfile, simulateHeadlessGliderRoute}