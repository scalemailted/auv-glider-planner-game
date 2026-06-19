import { normalizeDiveProfile } from '../science/DiveProfileModel.js';
import { assessDiveProfileFeasibility } from '../science/DiveProfileFeasibility.js';
import { normalizeWaterColumnConfig, waterColumnLayerMetadata } from '../science/WaterColumnSchema.js';

export const PLANNED_DIVE_SEGMENT_VIEW_MODEL_VERSION = 'planned-dive-segment-view-model-three-r1-2a-4';

const DEFAULT_CELL_DISTANCE_METERS = 1200;
const DEFAULT_MIN_BOTTOM_CLEARANCE_METERS = 5;

export function buildPlannedDiveSegmentViewModel(options = {}) {
  const waterColumnConfig = normalizeWaterColumnConfig(options.waterColumnConfig ?? options.level?.world?.waterColumnConfig ?? options);
  const start = normalizeSurfacePoint(options.startWaypoint ?? options.start ?? options.from, 'segment-start');
  const target = normalizeSurfacePoint(options.targetWaypoint ?? options.target ?? options.to ?? options.end, 'segment-target');
  const profile = normalizeDiveProfile(options.diveProfile ?? options.diveProfileId ?? target.diveProfileId ?? options.route?.diveProfileId ?? waterColumnConfig.diveProfileId ?? 'surfaceOnly', waterColumnConfig);
  const targetDepthLayerId = normalizeLayerId(options.targetDepthLayerId ?? target.targetDepthLayerId ?? target.depthLayerId ?? options.activeDepthLayerId ?? waterColumnConfig.defaultPlanningLayerId ?? waterColumnConfig.depthLayerIds[0] ?? 'surface', waterColumnConfig);
  const segmentId = options.segmentId ?? `${options.agentId ?? 'agent'}-segment-${Number(options.segmentIndex ?? 0) + 1}`;
  const distanceCells = distance(start, target);
  const cellDistanceMeters = positive(options.cellDistanceMeters, DEFAULT_CELL_DISTANCE_METERS);
  const surfaceDistanceMeters = distanceCells * cellDistanceMeters;
  const requestedMaximumDepthMeters = requestedDepth(options, profile, targetDepthLayerId);
  const requestedCycleCount = requestedCycles(options, profile, distanceCells);
  const sampleCount = Math.max(8, Math.min(160, Math.round(Number(options.sampleCount ?? Math.max(18, distanceCells * 8 + requestedCycleCount * 10))) || 24));
  const bottomSamples = sampleBottomAlongSegment({ start, target, sampleCount, bottomBoundary: options.bottomBoundary, level: options.level });
  const minimumBottomDepthMeters = bottomSamples.reduce((min, sample) => Math.min(min, sample.bottomDepthMeters), Infinity);
  const requiredBottomClearanceMeters = finite(options.requiredBottomClearanceMeters, DEFAULT_MIN_BOTTOM_CLEARANCE_METERS);
  const bottomDepthForFeasibility = Number.isFinite(minimumBottomDepthMeters) ? minimumBottomDepthMeters : undefined;
  const feasibility = assessDiveProfileFeasibility({
    waterColumnConfig,
    level: options.level,
    start,
    end: target,
    requestedProfileId: profile.id,
    requestedTargetLayerId: targetDepthLayerId,
    requestedMaximumDepthMeters,
    segmentHorizontalDistanceMeters: surfaceDistanceMeters,
    segmentDurationAvailableSeconds: options.segmentDurationAvailableSeconds ?? options.expectedDurationSeconds,
    missionTimeRemainingSeconds: options.missionTimeRemainingSeconds,
    vehicleDepthRatingMeters: options.vehicleDepthRatingMeters,
    bottomDepthMeters: bottomDepthForFeasibility,
    requiredBottomClearanceMeters
  });
  const achievableMaximumDepthMeters = Math.max(0, finite(feasibility.achievableMaximumDepthMeters, requestedMaximumDepthMeters));
  const feasibleCycleCount = feasibleCycles({ requestedCycleCount, distanceCells, profile, achievableMaximumDepthMeters });
  const predictedDivePath = buildDivePath({
    segmentId,
    start,
    target,
    profile,
    targetDepthLayerId,
    sampleCount,
    cycleCount: feasibleCycleCount,
    requestedCycleCount,
    requestedMaximumDepthMeters,
    achievableMaximumDepthMeters,
    bottomSamples,
    requiredBottomClearanceMeters,
    waterColumnConfig
  });
  const predictedCurrentCorrectedPath = buildCurrentCorrectedPath(predictedDivePath, options.vectorFieldLayer ?? options.currentField ?? null, options.currentScale ?? 0.18);
  const descentSections = sectionsForPhase(predictedDivePath, 'descent');
  const ascentSections = sectionsForPhase(predictedDivePath, 'ascent');
  const bottomTurns = predictedDivePath.filter((point) => point.phase === 'bottomTurn');
  const layerCrossings = layerCrossingsForPath(predictedDivePath);
  const predictedSamples = predictedSamplesForPath(predictedDivePath, options.layerFields, options.sampleIntervalSeconds ?? target.sampleIntervalSeconds ?? options.sampleInterval ?? null);
  const clearance = bottomClearanceSummary(predictedDivePath, requiredBottomClearanceMeters);
  const predictedSurfacingPosition = predictedCurrentCorrectedPath.at(-1) ?? predictedDivePath.at(-1) ?? { ...target, depthMeters: 0 };
  const predictedSurfacingOffset = {
    dx: round(Number(predictedSurfacingPosition.x ?? 0) - Number(target.x ?? 0)),
    dy: round(Number(predictedSurfacingPosition.y ?? 0) - Number(target.y ?? 0)),
    distance: round(Math.hypot(Number(predictedSurfacingPosition.x ?? 0) - Number(target.x ?? 0), Number(predictedSurfacingPosition.y ?? 0) - Number(target.y ?? 0)))
  };
  const warningCodes = warningCodesFor({ feasibility, clearance, requestedCycleCount, feasibleCycleCount });
  const segment = {
    type: 'anchor.rendering.planned-dive-segment-view-model',
    version: PLANNED_DIVE_SEGMENT_VIEW_MODEL_VERSION,
    segmentId,
    agentId: options.agentId ?? options.route?.agentId ?? null,
    segmentIndex: Number.isFinite(Number(options.segmentIndex)) ? Number(options.segmentIndex) : null,
    startWaypointId: start.waypointId ?? start.id ?? null,
    targetWaypointId: target.waypointId ?? target.id ?? null,
    startSurfacePosition: { ...start, depthMeters: 0, depthLayerId: 'surface' },
    targetSurfacePosition: { ...target, depthMeters: 0, depthLayerId: 'surface' },
    diveProfileId: profile.id,
    targetDepthLayerId,
    requestedMaximumDepthMeters: round(requestedMaximumDepthMeters),
    achievableMaximumDepthMeters: round(achievableMaximumDepthMeters),
    requestedCycleCount,
    cycleCount: feasibleCycleCount,
    limitingFactor: feasibility.limitingFactor ?? 'none',
    profileTruncationReason: profileTruncationReason({ feasibility, requestedCycleCount, feasibleCycleCount }),
    surfaceIntentPath: [
      { id: `${segmentId}-surface-start`, ...start, depthMeters: 0, depthLayerId: 'surface', routeProgress: 0, surfaceIntent: true },
      { id: `${segmentId}-surface-target`, ...target, depthMeters: 0, depthLayerId: 'surface', routeProgress: 1, surfaceIntent: true }
    ],
    predictedDivePath,
    predictedCurrentCorrectedPath,
    descentSections,
    ascentSections,
    bottomTurns,
    layerCrossings,
    predictedSamples,
    predictedSurfacingPosition,
    predictedSurfacingOffset,
    bottomClearance: clearance,
    feasibility,
    expectedScience: expectedScienceSummary(predictedSamples),
    expectedEnergy: feasibility.energyEstimate ?? null,
    expectedDuration: expectedDuration(surfaceDistanceMeters, achievableMaximumDepthMeters, options),
    surfaceDistanceMeters: round(surfaceDistanceMeters),
    surfaceDistanceCells: round(distanceCells),
    warningCodes,
    warnings: [...(feasibility.warnings ?? []), ...(clearance.warnings ?? [])],
    boundaryFlags: {
      derivedFromCanonicalDiveModel: true,
      decorativeOnly: false,
      ownsSimulation: false,
      ownsPlanning: false,
      ownsScoring: false,
      usesArbitraryXYZWaypoints: false,
      rendererOwnsPrediction: false
    }
  };
  return segment;
}

export function validatePlannedDiveSegmentViewModel(segment = {}) {
  const errors = [];
  const warnings = [...(segment.warnings ?? [])];
  if (segment.type !== 'anchor.rendering.planned-dive-segment-view-model') errors.push('Planned dive segment type is invalid.');
  if (!segment.segmentId) errors.push('Planned dive segment requires segmentId.');
  if (!segment.startSurfacePosition || !segment.targetSurfacePosition) errors.push('Surface endpoint positions are required.');
  if (!Array.isArray(segment.surfaceIntentPath) || segment.surfaceIntentPath.length < 2) errors.push('Surface intent path needs at least two points.');
  if (!Array.isArray(segment.predictedDivePath) || segment.predictedDivePath.length < 2) errors.push('Predicted dive path needs at least two points.');
  if (segment.boundaryFlags?.usesArbitraryXYZWaypoints === true) errors.push('Planned segment must not use arbitrary XYZ waypoints.');
  if (segment.boundaryFlags?.ownsPlanning === true || segment.boundaryFlags?.ownsSimulation === true || segment.boundaryFlags?.ownsScoring === true) errors.push('Planned segment view model must not own planning, simulation, or scoring.');
  for (const point of segment.predictedDivePath ?? []) {
    if (!Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) errors.push('Predicted points require finite surface coordinates.');
    if (!Number.isFinite(Number(point.depthMeters)) || Number(point.depthMeters) < 0) errors.push('Predicted points require non-negative depth.');
    if (point.clearanceMeters != null && Number(point.clearanceMeters) < -1e-6) errors.push('Predicted path penetrates the canonical bottom boundary.');
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: plannedDiveSegmentViewModelSummary(segment) };
}

export function plannedDiveSegmentViewModelSummary(segment = {}) {
  return {
    type: 'anchor.rendering.planned-dive-segment-summary',
    version: PLANNED_DIVE_SEGMENT_VIEW_MODEL_VERSION,
    segmentId: segment.segmentId ?? null,
    agentId: segment.agentId ?? null,
    startWaypointId: segment.startWaypointId ?? null,
    targetWaypointId: segment.targetWaypointId ?? null,
    diveProfileId: segment.diveProfileId ?? null,
    targetDepthLayerId: segment.targetDepthLayerId ?? null,
    requestedMaximumDepthMeters: finiteOrNull(segment.requestedMaximumDepthMeters),
    achievableMaximumDepthMeters: finiteOrNull(segment.achievableMaximumDepthMeters),
    cycleCount: Number(segment.cycleCount ?? 0),
    requestedCycleCount: Number(segment.requestedCycleCount ?? segment.cycleCount ?? 0),
    limitingFactor: segment.limitingFactor ?? null,
    surfaceIntentPointCount: segment.surfaceIntentPath?.length ?? 0,
    predictedDivePointCount: segment.predictedDivePath?.length ?? 0,
    predictedCurrentPathPointCount: segment.predictedCurrentCorrectedPath?.length ?? 0,
    predictedSampleCount: segment.predictedSamples?.length ?? 0,
    predictedLayerCrossingCount: segment.layerCrossings?.length ?? 0,
    predictedBottomTurnCount: segment.bottomTurns?.length ?? 0,
    predictedSurfacingPosition: segment.predictedSurfacingPosition ?? null,
    predictedSurfacingOffset: segment.predictedSurfacingOffset ?? null,
    predictedMinimumBottomClearance: segment.bottomClearance?.minimumClearanceMeters ?? null,
    predictedTerrainLimited: segment.bottomClearance?.terrainLimited === true,
    warningCodes: [...(segment.warningCodes ?? [])],
    derivedFromCanonicalDiveModel: segment.boundaryFlags?.derivedFromCanonicalDiveModel === true,
    decorativeOnly: segment.boundaryFlags?.decorativeOnly === true,
    ownsPlanning: segment.boundaryFlags?.ownsPlanning === true,
    ownsSimulation: segment.boundaryFlags?.ownsSimulation === true,
    ownsScoring: segment.boundaryFlags?.ownsScoring === true,
    usesArbitraryXYZWaypoints: segment.boundaryFlags?.usesArbitraryXYZWaypoints === true
  };
}

export function buildPlannedDiveSegmentsForRoutes(options = {}) {
  const routes = options.routes ?? [];
  return routes.flatMap((route) => {
    const points = route.points ?? [];
    const segments = [];
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const target = points[index];
      segments.push(buildPlannedDiveSegmentViewModel({
        ...options,
        route,
        startWaypoint: start,
        targetWaypoint: target,
        agentId: route.agentId ?? options.agentId,
        segmentIndex: index - 1,
        segmentId: `${route.id ?? route.agentId ?? 'route'}-segment-${index}`,
        diveProfileId: target.diveProfileId ?? route.diveProfileId ?? options.diveProfileId,
        targetDepthLayerId: target.targetDepthLayerId ?? target.depthLayerId ?? route.targetDepthLayerId ?? options.targetDepthLayerId,
        requestedMaximumDepthMeters: target.maximumDiveDepthMeters ?? target.maximumDepthMeters ?? route.maximumDepthMeters ?? options.requestedMaximumDepthMeters,
        sampleIntervalSeconds: target.sampleIntervalSeconds ?? route.sampleIntervalSeconds ?? options.sampleIntervalSeconds,
        cycleCount: target.cycleCount ?? route.cycleCount ?? options.cycleCount
      }));
    }
    return segments;
  });
}

function buildDivePath({ segmentId, start, target, profile, targetDepthLayerId, sampleCount, cycleCount, requestedCycleCount, requestedMaximumDepthMeters, achievableMaximumDepthMeters, bottomSamples, requiredBottomClearanceMeters, waterColumnConfig }) {
  const maxDepth = profile.id === 'surfaceOnly' ? 0 : Math.max(0, achievableMaximumDepthMeters);
  return Array.from({ length: sampleCount }, (_value, index) => {
    const routeProgress = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
    const x = lerp(start.x, target.x, routeProgress);
    const y = lerp(start.y, target.y, routeProgress);
    const cycleProgress = cycleCount <= 0 ? 0 : routeProgress * cycleCount;
    const cycleIndex = Math.min(Math.max(0, cycleCount - 1), Math.floor(cycleProgress));
    const local = cycleCount <= 0 ? 0 : cycleProgress - Math.floor(cycleProgress);
    const localProgress = index === sampleCount - 1 ? 1 : local;
    const shape = profile.id === 'surfaceOnly' ? 0 : triangular(localProgress);
    const bottomDepthMeters = finite(bottomSamples[index]?.bottomDepthMeters, Infinity);
    const bottomLimit = Number.isFinite(bottomDepthMeters) ? Math.max(0, bottomDepthMeters - requiredBottomClearanceMeters) : maxDepth;
    const limitedDepth = Math.min(maxDepth * shape, bottomLimit);
    const depthMeters = round(Math.max(0, limitedDepth));
    const depthLayerId = depthLayerForDepth(depthMeters, waterColumnConfig, targetDepthLayerId);
    const clearanceMeters = Number.isFinite(bottomDepthMeters) ? round(bottomDepthMeters - depthMeters) : null;
    return {
      id: `${segmentId}-predicted-${index}`,
      segmentId,
      x: round(x),
      y: round(y),
      row: Math.round(y),
      col: Math.round(x),
      z: -depthMeters,
      depthMeters,
      depthLayerId,
      depthLayer: depthLayerId,
      routeProgress: round(routeProgress),
      cycleIndex,
      cycleProgress: round(localProgress),
      cycleCount,
      requestedCycleCount,
      phase: phaseFor(localProgress, routeProgress, depthMeters, profile.id),
      diveProfileId: profile.id,
      targetDepthLayerId,
      requestedMaximumDepthMeters: round(requestedMaximumDepthMeters),
      achievableMaximumDepthMeters: round(achievableMaximumDepthMeters),
      bottomDepthMeters: Number.isFinite(bottomDepthMeters) ? round(bottomDepthMeters) : null,
      clearanceMeters,
      terrainLimited: Number.isFinite(bottomDepthMeters) && requestedMaximumDepthMeters * shape > bottomLimit + 1e-6,
      predicted: true
    };
  });
}

function buildCurrentCorrectedPath(points, vectorFieldLayer, scale) {
  if (!points.length || !vectorFieldLayer) return [];
  let driftX = 0;
  let driftY = 0;
  return points.map((point, index) => {
    const vector = sampleVector(vectorFieldLayer, point.x, point.y);
    if (index > 0 && vector) {
      driftX += Number(vector.u ?? 0) * scale;
      driftY += Number(vector.v ?? 0) * scale;
    }
    return {
      ...point,
      id: `${point.segmentId}-current-${index}`,
      x: round(point.x + driftX),
      y: round(point.y + driftY),
      currentU: vector ? round(vector.u) : 0,
      currentV: vector ? round(vector.v) : 0,
      currentCorrected: true
    };
  });
}

function sampleVector(layer, x, y) {
  const vectors = layer.vectors ?? [];
  if (!vectors.length) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const vector of vectors) {
    const d = Math.hypot(Number(vector.x ?? 0) - Number(x), Number(vector.y ?? 0) - Number(y));
    if (d < bestDistance) {
      best = vector;
      bestDistance = d;
    }
  }
  return best;
}

function sampleBottomAlongSegment({ start, target, sampleCount, bottomBoundary, level }) {
  return Array.from({ length: sampleCount }, (_value, index) => {
    const progress = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
    const x = lerp(start.x, target.x, progress);
    const y = lerp(start.y, target.y, progress);
    return { x, y, bottomDepthMeters: sampleBottomDepth(bottomBoundary, level, x, y) };
  });
}

function sampleBottomDepth(bottomBoundary, level, x, y) {
  const grid = bottomBoundary?.bottomDepthField ?? bottomBoundary?.depthValues ?? level?.layers?.depth ?? level?.layers?.depthMeters ?? level?.bathymetry?.depthMeters ?? [];
  if (!Array.isArray(grid) || !grid.length || !Array.isArray(grid[0])) return Infinity;
  const width = grid[0].length;
  const height = grid.length;
  const px = clamp(Number(x), 0, width - 1);
  const py = clamp(Number(y), 0, height - 1);
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = px - x0;
  const ty = py - y0;
  const top = lerp(finite(grid[y0]?.[x0], 0), finite(grid[y0]?.[x1], 0), tx);
  const bottom = lerp(finite(grid[y1]?.[x0], 0), finite(grid[y1]?.[x1], 0), tx);
  const value = lerp(top, bottom, ty);
  if (!Number.isFinite(value)) return Infinity;
  return value <= 2 ? round(20 + value * 220) : round(value);
}

function sectionsForPhase(points, phase) {
  const sections = [];
  let current = [];
  for (const point of points) {
    if (point.phase === phase || (phase === 'descent' && point.phase === 'descending') || (phase === 'ascent' && point.phase === 'ascending')) current.push(point);
    else if (current.length) {
      sections.push(sectionFromPoints(current, phase, sections.length));
      current = [];
    }
  }
  if (current.length) sections.push(sectionFromPoints(current, phase, sections.length));
  return sections;
}

function sectionFromPoints(points, phase, index) {
  return { id: `${points[0]?.segmentId ?? 'segment'}-${phase}-${index + 1}`, phase, startIndex: points[0]?.id ?? null, endIndex: points.at(-1)?.id ?? null, points: points.map((point) => point.id), cycleIndex: points[0]?.cycleIndex ?? null };
}

function layerCrossingsForPath(points) {
  const crossings = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous.depthLayerId !== current.depthLayerId) {
      crossings.push({ id: `${current.segmentId}-crossing-${crossings.length + 1}`, segmentId: current.segmentId, from: previous.depthLayerId, to: current.depthLayerId, routeProgress: current.routeProgress, x: current.x, y: current.y, depthMeters: current.depthMeters, cycleIndex: current.cycleIndex });
    }
  }
  return crossings;
}

function predictedSamplesForPath(points, layerFields, sampleIntervalSeconds) {
  const spacing = Math.max(3, Math.round(Number(sampleIntervalSeconds) > 0 ? Number(sampleIntervalSeconds) / 60 : points.length / 6));
  return points.filter((point, index) => point.depthMeters > 0.5 && (index % spacing === 0 || point.phase === 'bottomTurn')).map((point, index) => ({
    id: `${point.segmentId}-expected-sample-${index + 1}`,
    segmentId: point.segmentId,
    x: point.x,
    y: point.y,
    z: -point.depthMeters,
    depthMeters: point.depthMeters,
    depthLayerId: point.depthLayerId,
    routeProgress: point.routeProgress,
    cycleIndex: point.cycleIndex,
    sampleTimeSeconds: null,
    expectedFieldValue: sampleLayerField(layerFields, point.depthLayerId, point.x, point.y),
    expectedScienceValue: sampleLayerField(layerFields, point.depthLayerId, point.x, point.y),
    markerType: 'expectedSample',
    createsScoreEvent: false,
    predicted: true
  }));
}

function sampleLayerField(layerFields, layerId, x, y) {
  const grid = layerFields?.sampleValue?.[layerId]?.values ?? layerFields?.A_global_depth?.[layerId] ?? null;
  if (!Array.isArray(grid) || !grid.length) return null;
  const row = Math.max(0, Math.min(grid.length - 1, Math.round(Number(y))));
  const col = Math.max(0, Math.min((grid[0]?.length ?? 1) - 1, Math.round(Number(x))));
  const value = Number(grid[row]?.[col]);
  return Number.isFinite(value) ? round(value) : null;
}

function bottomClearanceSummary(points, requiredBottomClearanceMeters) {
  const clearances = points.map((point) => Number(point.clearanceMeters)).filter(Number.isFinite);
  const minimum = clearances.length ? Math.min(...clearances) : null;
  const terrainLimitedSections = points.filter((point) => point.terrainLimited === true).map((point) => point.id);
  const warnings = [];
  if (minimum != null && minimum < requiredBottomClearanceMeters + 1e-6) warnings.push('Predicted profile is limited by local bathymetry clearance.');
  if (minimum != null && minimum < 0) warnings.push('Predicted profile attempted seabed penetration and was clipped.');
  return {
    requiredBottomClearanceMeters: round(requiredBottomClearanceMeters),
    minimumClearanceMeters: minimum == null ? null : round(minimum),
    terrainLimited: terrainLimitedSections.length > 0,
    terrainLimitedSections,
    hardInvalid: minimum != null && minimum < 0,
    warnings
  };
}

function expectedScienceSummary(samples) {
  const values = samples.map((sample) => Number(sample.expectedScienceValue)).filter(Number.isFinite);
  const byLayer = {};
  for (const sample of samples) byLayer[sample.depthLayerId] = (byLayer[sample.depthLayerId] ?? 0) + 1;
  return {
    predictedSampleCount: samples.length,
    meanExpectedScienceValue: values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null,
    samplesByLayer: byLayer,
    createsScoreEvents: false
  };
}

function warningCodesFor({ feasibility, clearance, requestedCycleCount, feasibleCycleCount }) {
  const codes = [];
  if (feasibility.status === 'infeasible') codes.push('PROFILE_INFEASIBLE');
  if (feasibility.limitingFactor && feasibility.limitingFactor !== 'none') codes.push(`LIMITED_BY_${String(feasibility.limitingFactor).toUpperCase()}`);
  if (clearance.terrainLimited) codes.push('TERRAIN_LIMITED');
  if (clearance.hardInvalid) codes.push('SEABED_PENETRATION_PREVENTED');
  if (feasibleCycleCount < requestedCycleCount) codes.push('CYCLES_TRUNCATED');
  return codes;
}

function profileTruncationReason({ feasibility, requestedCycleCount, feasibleCycleCount }) {
  if (feasibleCycleCount < requestedCycleCount) return 'segment too short';
  if (feasibility.limitingFactor && feasibility.limitingFactor !== 'none') return feasibility.limitingFactor;
  return 'none';
}

function expectedDuration(surfaceDistanceMeters, maxDepth, options) {
  const speed = positive(options.horizontalSpeedMetersPerSecond, 0.35);
  const vertical = positive(options.verticalSpeedMetersPerSecond, 0.25);
  return round(surfaceDistanceMeters / speed + (maxDepth * 2) / vertical);
}

function requestedDepth(options, profile, targetDepthLayerId) {
  const explicit = Number(options.requestedMaximumDepthMeters ?? options.maximumDiveDepthMeters ?? options.maximumDepthMeters);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const sequenceDepth = Math.max(0, ...profile.sequence.map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0)).filter(Number.isFinite));
  const targetDepth = Number(waterColumnLayerMetadata(targetDepthLayerId).nominalDepthMeters ?? 0);
  return Math.max(sequenceDepth, targetDepth);
}

function requestedCycles(options, profile, distanceCells) {
  const explicit = Number(options.cycleCount ?? options.requestedCycleCount);
  if (Number.isFinite(explicit) && explicit >= 0) return Math.round(explicit);
  if (profile.id === 'surfaceOnly') return 0;
  if (profile.id === 'sawtoothProfile' || profile.id === 'fullProfile' || profile.id === 'adaptiveVerticalProfile' || profile.id === 'integratedWaterColumn') return Math.max(1, Math.min(5, Math.floor(distanceCells / 3.5) + 1));
  return 1;
}

function feasibleCycles({ requestedCycleCount, distanceCells, profile, achievableMaximumDepthMeters }) {
  if (profile.id === 'surfaceOnly' || achievableMaximumDepthMeters <= 0.5) return 0;
  const distanceLimit = Math.max(1, Math.floor(distanceCells / 2.4) + 1);
  return Math.max(1, Math.min(requestedCycleCount, distanceLimit));
}

function normalizeSurfacePoint(point = {}, fallbackId) {
  const x = finite(point.x ?? point.col, 0);
  const y = finite(point.y ?? point.row, 0);
  return {
    ...point,
    id: point.id ?? point.waypointId ?? fallbackId,
    waypointId: point.waypointId ?? point.id ?? fallbackId,
    x,
    y,
    col: Math.round(x),
    row: Math.round(y),
    z: 0,
    depthMeters: 0,
    depthLayerId: 'surface'
  };
}

function normalizeLayerId(value, config) {
  const id = String(value ?? '').trim();
  if (config.depthLayerIds.includes(id)) return id;
  return config.depthLayerIds.includes('thermocline') ? 'thermocline' : config.depthLayerIds[0] ?? 'surface';
}

function depthLayerForDepth(depthMeters, config, targetDepthLayerId) {
  const depth = Number(depthMeters);
  if (!Number.isFinite(depth) || depth <= 1) return 'surface';
  const candidates = (config.depthLayerIds ?? ['surface']).map((id) => ({ id, depth: Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0) })).sort((a, b) => a.depth - b.depth);
  let selected = candidates[0]?.id ?? 'surface';
  for (const candidate of candidates) if (depth >= candidate.depth - 1e-6) selected = candidate.id;
  const targetDepth = Number(waterColumnLayerMetadata(targetDepthLayerId).nominalDepthMeters ?? 0);
  if (depth >= targetDepth - 3 && targetDepthLayerId) return targetDepthLayerId;
  return selected;
}

function phaseFor(localProgress, routeProgress, depthMeters, profileId) {
  if (profileId === 'surfaceOnly' || depthMeters <= 0.25) {
    if (routeProgress <= 0.02) return 'surfaceStart';
    if (routeProgress >= 0.98) return 'surfacing';
    return 'surfaceTransit';
  }
  if (localProgress <= 0.04) return 'inflectingDown';
  if (localProgress < 0.46) return 'descent';
  if (localProgress <= 0.54) return 'bottomTurn';
  if (localProgress < 0.96) return 'ascent';
  return 'inflectingUp';
}

function triangular(value) {
  const local = clamp(value, 0, 1);
  return local <= 0.5 ? local * 2 : (1 - local) * 2;
}

function distance(a, b) {
  return Math.hypot(Number(b.x ?? 0) - Number(a.x ?? 0), Number(b.y ?? 0) - Number(a.y ?? 0));
}

function lerp(a, b, t) {
  return Number(a ?? 0) + (Number(b ?? 0) - Number(a ?? 0)) * clamp(t, 0, 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function finite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function finiteOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function positive(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
