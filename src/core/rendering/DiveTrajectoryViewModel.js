import { createDiveProfileSequence, normalizeDiveProfile } from '../science/DiveProfileModel.js';
import { normalizeWaterColumnConfig, waterColumnLayerMetadata } from '../science/WaterColumnSchema.js';

export const DIVE_TRAJECTORY_VIEW_MODEL_VERSION = 'dive-trajectory-view-model-three-r1-2a';

export function buildPredictedDiveTrajectory(options = {}) {
  const waterColumnConfig = normalizeWaterColumnConfig(options.waterColumnConfig ?? options.level?.world?.waterColumnConfig ?? options);
  const profile = normalizeDiveProfile(options.diveProfile ?? options.diveProfileId ?? options.profileId ?? waterColumnConfig.diveProfileId, waterColumnConfig);
  const route = normalizeRoutePoints(options.route ?? options.points ?? options.waypoints ?? [], options.start);
  const warnings = [];
  if (route.length < 2) warnings.push('Predicted dive trajectory needs at least two horizontal route points.');
  const sampleCount = Math.max(2, Math.min(64, Number(options.sampleCount ?? Math.max(8, route.length * 5)) || 8));
  const profileSequence = createDiveProfileSequence(profile, waterColumnConfig, { sampleCount });
  const points = profileSequence.map((entry, index) => {
    const progress = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
    const horizontal = interpolateRoute(route, progress);
    const depthLayerId = options.targetDepthLayerId && progress > 0.38 && progress < 0.68 ? options.targetDepthLayerId : entry.depthLayerId;
    const depthMeters = clampDepth(options.maximumDepthMeters, waterColumnLayerMetadata(depthLayerId).nominalDepthMeters ?? entry.depthMeters ?? 0);
    return {
      id: `predicted-dive-${index}`,
      x: round(horizontal.x),
      y: round(horizontal.y),
      row: Math.round(horizontal.y),
      col: Math.round(horizontal.x),
      routeProgress: round(progress),
      zIndex: entry.zIndex,
      depthLayerId,
      depthLayer: depthLayerId,
      depthMeters,
      diveProfileId: profile.id,
      phase: phaseForProgress(progress),
      predicted: true
    };
  });
  return {
    type: 'anchor.rendering.dive-trajectory-view-model',
    version: DIVE_TRAJECTORY_VIEW_MODEL_VERSION,
    trajectoryKind: 'predicted',
    id: options.id ?? `predicted-${profile.id}`,
    agentId: options.agentId ?? null,
    routeId: options.routeId ?? null,
    diveProfileId: profile.id,
    targetDepthLayerId: options.targetDepthLayerId ?? null,
    maximumDepthMeters: maxDepth(points),
    points,
    start: points[0] ?? null,
    targetDepth: maxDepth(points),
    bottomTurn: points.find((point) => point.phase === 'bottomTurn') ?? null,
    surfacingPoint: points.at(-1) ?? null,
    layerCrossings: layerCrossings(points),
    predictedSampleLocations: points.filter((_point, index) => index % Math.max(1, Math.floor(points.length / 5)) === 0),
    warnings,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesFull3DPlanning: false,
    publicSafe: true
  };
}

export function buildRealizedDiveTrajectory(options = {}) {
  const source = options.points ?? options.history ?? options.realizedTrack ?? [];
  const points = source.map((point, index) => {
    const depthLayerId = point.depthLayerId ?? point.depthLayer ?? layerForDepth(point.depthMeters);
    return {
      id: point.id ?? `realized-dive-${index}`,
      x: finiteNumber(point.x),
      y: finiteNumber(point.y),
      row: Math.round(finiteNumber(point.y)),
      col: Math.round(finiteNumber(point.x)),
      timeSeconds: finiteNumber(point.timeSeconds ?? point.t),
      depthLayerId,
      depthLayer: depthLayerId,
      depthMeters: finiteNumber(point.depthMeters, depthForLayer(depthLayerId)),
      zIndex: point.zIndex ?? null,
      diveProfileId: point.diveProfileId ?? options.diveProfileId ?? null,
      phase: point.phase ?? point.divePhase ?? phaseForDepthTrend(source, index),
      realized: true
    };
  });
  return {
    type: 'anchor.rendering.dive-trajectory-view-model',
    version: DIVE_TRAJECTORY_VIEW_MODEL_VERSION,
    trajectoryKind: 'realized',
    id: options.id ?? `realized-${options.agentId ?? 'agent'}`,
    agentId: options.agentId ?? points[0]?.agentId ?? null,
    diveProfileId: options.diveProfileId ?? points.find((point) => point.diveProfileId)?.diveProfileId ?? null,
    maximumDepthMeters: maxDepth(points),
    points,
    start: points[0] ?? null,
    bottomTurn: deepestPoint(points),
    surfacingPoint: points.at(-1) ?? null,
    layerCrossings: layerCrossings(points),
    predictedSampleLocations: [],
    warnings: [],
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesFull3DPlanning: false,
    publicSafe: true
  };
}

export function validateDiveTrajectoryViewModel(trajectory = {}) {
  const errors = [];
  const warnings = [...(trajectory.warnings ?? [])];
  if (trajectory.type !== 'anchor.rendering.dive-trajectory-view-model') errors.push('Dive trajectory view model type is invalid.');
  if (!Array.isArray(trajectory.points)) errors.push('Dive trajectory points must be an array.');
  if (trajectory.usesFull3DPlanning === true) errors.push('Dive trajectory view model must not claim free-flight 3D planning.');
  for (const point of trajectory.points ?? []) {
    if (!Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) errors.push('Dive trajectory points require finite horizontal x/y.');
    if (!Number.isFinite(Number(point.depthMeters)) || Number(point.depthMeters) < 0) errors.push('Dive trajectory depth must be finite and positive downward.');
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: diveTrajectoryViewModelSummary(trajectory) };
}

export function diveTrajectoryViewModelSummary(trajectory = {}) {
  return {
    type: 'anchor.rendering.dive-trajectory-summary',
    version: DIVE_TRAJECTORY_VIEW_MODEL_VERSION,
    trajectoryKind: trajectory.trajectoryKind ?? null,
    id: trajectory.id ?? null,
    agentId: trajectory.agentId ?? null,
    diveProfileId: trajectory.diveProfileId ?? null,
    targetDepthLayerId: trajectory.targetDepthLayerId ?? null,
    pointCount: trajectory.points?.length ?? 0,
    maximumDepthMeters: maxDepth(trajectory.points ?? []),
    layerCrossingCount: trajectory.layerCrossings?.length ?? 0,
    ownsPlanning: trajectory.ownsPlanning === true,
    ownsSimulation: trajectory.ownsSimulation === true,
    ownsScoring: trajectory.ownsScoring === true,
    usesFull3DPlanning: trajectory.usesFull3DPlanning === true,
    publicSafe: trajectory.publicSafe !== false
  };
}

function normalizeRoutePoints(points, start = null) {
  const raw = Array.isArray(points?.points) ? points.points : points;
  const list = (Array.isArray(raw) ? raw : []).map((point) => ({ x: finiteNumber(point.x ?? point.col), y: finiteNumber(point.y ?? point.row), depthLayerId: point.depthLayerId ?? point.depthLayer ?? null }));
  if (start && list.length && (list[0].x !== finiteNumber(start.x) || list[0].y !== finiteNumber(start.y))) return [{ x: finiteNumber(start.x), y: finiteNumber(start.y), depthLayerId: start.depthLayerId ?? 'surface' }, ...list];
  return list;
}

function interpolateRoute(route, progress) {
  if (!route.length) return { x: 0, y: 0 };
  if (route.length === 1) return route[0];
  const scaled = clamp01(progress) * (route.length - 1);
  const index = Math.min(route.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const a = route[index];
  const b = route[index + 1];
  return { x: Number(a.x) + (Number(b.x) - Number(a.x)) * local, y: Number(a.y) + (Number(b.y) - Number(a.y)) * local };
}

function layerCrossings(points) {
  const crossings = [];
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].depthLayerId !== points[index - 1].depthLayerId) crossings.push({ index, from: points[index - 1].depthLayerId, to: points[index].depthLayerId, routeProgress: points[index].routeProgress ?? null });
  }
  return crossings;
}

function phaseForProgress(progress) {
  if (progress <= 0.18) return 'surfaceStart';
  if (progress < 0.45) return 'descent';
  if (progress <= 0.62) return 'bottomTurn';
  if (progress < 0.9) return 'ascent';
  return 'surfacing';
}

function phaseForDepthTrend(points, index) {
  const previous = Number(points[index - 1]?.depthMeters ?? points[index]?.depthMeters ?? 0);
  const current = Number(points[index]?.depthMeters ?? 0);
  const next = Number(points[index + 1]?.depthMeters ?? current);
  if (current > previous && next >= current) return 'descent';
  if (current < previous || next < current) return 'ascent';
  return current > 0 ? 'bottomTurn' : 'surface';
}

function layerForDepth(depthMeters) {
  const depth = Number(depthMeters);
  if (!Number.isFinite(depth) || depth <= 5) return 'surface';
  if (depth <= 25) return 'shallow';
  if (depth <= 55) return 'thermocline';
  if (depth <= 110) return 'midwater';
  return 'deep';
}

function depthForLayer(layerId) {
  return waterColumnLayerMetadata(layerId).nominalDepthMeters ?? 0;
}

function clampDepth(maximumDepthMeters, value) {
  const depth = finiteNumber(value, 0);
  const max = Number(maximumDepthMeters);
  return round(Number.isFinite(max) && max > 0 ? Math.min(depth, max) : depth);
}

function deepestPoint(points = []) {
  return points.reduce((best, point) => Number(point.depthMeters ?? 0) > Number(best?.depthMeters ?? -1) ? point : best, null);
}

function maxDepth(points = []) {
  return round(Math.max(0, ...points.map((point) => Number(point.depthMeters)).filter(Number.isFinite)));
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
