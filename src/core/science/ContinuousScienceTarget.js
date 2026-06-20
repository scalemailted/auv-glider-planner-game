import { normalizeContinuousMissionPoint } from '../geometry/ContinuousMissionCoordinates.js';

export const CONTINUOUS_SCIENCE_TARGET_VERSION = 'continuous-science-target-three-r1-2a-4-1';
export const CONTINUOUS_SCIENCE_TARGET_GEOMETRY_TYPES = Object.freeze([
  'point',
  'layerPoint',
  'sphere',
  'ellipsoid',
  'depthInterval',
  'frontSegment',
  'volumeRegion'
]);

export const CONTINUOUS_SCIENCE_TARGET_TYPES = Object.freeze([
  'pointTarget',
  'depthLayerTarget',
  'ellipsoidalVolume',
  'frontSegment',
  'plumeVolume',
  'uncertaintyRegion',
  ...CONTINUOUS_SCIENCE_TARGET_GEOMETRY_TYPES
]);

const LEGACY_TYPE_TO_GEOMETRY = Object.freeze({
  pointTarget: 'point',
  depthLayerTarget: 'layerPoint',
  ellipsoidalVolume: 'ellipsoid',
  frontSegment: 'frontSegment',
  plumeVolume: 'volumeRegion',
  uncertaintyRegion: 'volumeRegion'
});

export function createContinuousScienceTarget(options = {}) {
  return normalizeContinuousScienceTarget(options);
}

export function normalizeContinuousScienceTarget(target = {}, context = {}) {
  const source = target && typeof target === 'object' ? target : {};
  const point = normalizeContinuousMissionPoint(source.position ?? source.center ?? source);
  const geometryType = normalizeGeometryType(source.geometryType ?? source.targetType ?? source.type);
  const depthLayerId = stringOrNull(source.depthLayerId ?? source.targetDepthLayerId ?? source.layerId ?? context.activeDepthLayerId ?? context.depthLayerId);
  const depthMeters = finiteOrNull(
    source.position?.depthMeters
      ?? source.depthMeters
      ?? source.targetDepthMeters
      ?? source.canonicalDepthMeters
      ?? context.depthMeters
      ?? context.targetDepthMeters
  );
  const normalizedDepth = Math.max(0, depthMeters ?? 0);
  const id = stringOrNull(source.id ?? source.targetId) ?? makeScienceTargetId(point.x, point.y, normalizedDepth, depthLayerId);
  const attachedSegmentIds = uniqueStrings(source.attachedSegmentIds ?? source.segmentIds ?? source.attachedSegments ?? source.segmentId ?? source.targetSegmentId);
  const desiredSampleCount = Math.max(0, Math.round(finiteNumber(source.desiredSampleCount ?? source.sampleCount, 1)));
  const minimumCoverage = clamp01(finiteNumber(source.minimumCoverage ?? source.requiredCoverage ?? 0.65, 0.65));
  const warnings = uniqueStrings(source.warnings ?? source.warningCodes);
  const boundaryFlags = samplingTargetBoundaryFlags(source.boundaryFlags);
  return {
    id,
    type: 'anchor.science.sampling-target',
    legacyType: source.type === 'anchor.science.continuous-target' ? source.type : null,
    version: CONTINUOUS_SCIENCE_TARGET_VERSION,
    label: source.label ? String(source.label) : labelForTarget(id, depthLayerId),
    geometryType,
    targetType: geometryToLegacyTargetType(geometryType),
    position: {
      x: round(point.x),
      y: round(point.y),
      depthMeters: round(normalizedDepth),
      coordinateFrame: point.coordinateFrame ?? 'continuousGridV1'
    },
    depthLayerId,
    depthMeters: round(normalizedDepth),
    depthInterval: normalizeDepthInterval(source.depthInterval ?? source.depthRange ?? source),
    radiusMeters: finiteOrNull(source.radiusMeters ?? source.radius),
    horizontalRadius: finiteOrNull(source.horizontalRadius ?? source.radiusX ?? source.radiusY ?? source.radiusMeters ?? source.radius) ?? 0.8,
    verticalRadius: finiteOrNull(source.verticalRadius ?? source.radiusDepthMeters ?? source.radiusZ ?? source.radiusMeters ?? source.radius) ?? 8,
    objectiveId: stringOrNull(source.objectiveId ?? source.objective),
    fieldId: stringOrNull(source.fieldId ?? source.field ?? source.scalarFieldId),
    minimumCoverage,
    desiredSampleCount,
    desiredSensorProfileId: stringOrNull(source.desiredSensorProfileId ?? source.sensorProfileId),
    attachedSegmentIds,
    generated: source.generated === true,
    executable: false,
    editable: source.editable !== false && source.generated !== true,
    publicVisibility: source.publicVisibility ?? 'publicPlanningObjective',
    value: finiteOrNull(source.value ?? source.priorityValue),
    uncertainty: finiteOrNull(source.uncertainty),
    navigationWaypoint: false,
    navigationAuthority: false,
    routeAuthority: 'surfaceWaypointPlusDiveProfile',
    scoreAuthority: false,
    warningCodes: warnings,
    warnings,
    boundaryFlags,
    notes: uniqueStrings(source.notes).length
      ? uniqueStrings(source.notes)
      : ['Sampling targets guide dive-profile planning but are not arbitrary midwater route waypoints.']
  };
}

export function validateContinuousScienceTarget(target = {}, context = {}) {
  const normalized = normalizeContinuousScienceTarget(target, context);
  const errors = [];
  const warnings = [...(normalized.warnings ?? [])];
  if (!normalized.id) errors.push('Science target requires an id.');
  if (!Number.isFinite(Number(normalized.position.x)) || !Number.isFinite(Number(normalized.position.y))) errors.push('Science target requires finite continuous x/y.');
  if (!Number.isFinite(Number(normalized.position.depthMeters)) || Number(normalized.position.depthMeters) < 0) errors.push('Science target requires a non-negative canonical depthMeters value.');
  if (!CONTINUOUS_SCIENCE_TARGET_GEOMETRY_TYPES.includes(normalized.geometryType)) errors.push(`Unsupported science target geometryType: ${normalized.geometryType}`);
  if (normalized.executable !== false || normalized.navigationAuthority !== false) errors.push('Sampling targets must be non-executable and must not own navigation authority.');
  if (normalized.boundaryFlags?.canCreateScoreWithoutObservation !== false) errors.push('Sampling targets must not create score without actual observations.');
  if (!normalized.depthLayerId && normalized.position.depthMeters > 0) warnings.push('Science target has depth but no explicit depthLayerId.');
  return { valid: errors.length === 0, errors, warnings, target: normalized };
}

export function attachScienceTargetToSegment(target = {}, segmentId) {
  const normalized = normalizeContinuousScienceTarget(target);
  const id = String(segmentId ?? '').trim();
  if (!id) return normalized;
  return {
    ...normalized,
    attachedSegmentIds: uniqueStrings([...(normalized.attachedSegmentIds ?? []), id])
  };
}

export function detachScienceTargetFromSegment(target = {}, segmentId) {
  const normalized = normalizeContinuousScienceTarget(target);
  const id = String(segmentId ?? '').trim();
  if (!id) return normalized;
  return {
    ...normalized,
    attachedSegmentIds: (normalized.attachedSegmentIds ?? []).filter((candidate) => candidate !== id)
  };
}

export function continuousScienceTargetSummary(target = {}) {
  const normalized = normalizeContinuousScienceTarget(target);
  return {
    version: CONTINUOUS_SCIENCE_TARGET_VERSION,
    id: normalized.id,
    type: normalized.type,
    geometryType: normalized.geometryType,
    targetType: normalized.targetType,
    x: normalized.position.x,
    y: normalized.position.y,
    depthLayerId: normalized.depthLayerId,
    depthMeters: normalized.position.depthMeters,
    attachedSegmentIds: [...(normalized.attachedSegmentIds ?? [])],
    executable: false,
    navigationAuthority: false,
    scoreAuthority: false,
    boundaryFlags: { ...(normalized.boundaryFlags ?? {}) }
  };
}

export function samplingTargetBoundaryFlags(input = {}) {
  return {
    isNavigationWaypoint: false,
    directlyCommandsVehicle: false,
    canCreateScoreWithoutObservation: false,
    rendererOwnsState: false,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    scoreAuthority: false,
    ...(input ?? {}),
    isNavigationWaypoint: false,
    directlyCommandsVehicle: false,
    canCreateScoreWithoutObservation: false,
    rendererOwnsState: false,
    ownsScoring: false
  };
}

function normalizeGeometryType(value) {
  const raw = String(value ?? '').trim();
  const mapped = LEGACY_TYPE_TO_GEOMETRY[raw] ?? raw;
  return CONTINUOUS_SCIENCE_TARGET_GEOMETRY_TYPES.includes(mapped) ? mapped : 'point';
}

function geometryToLegacyTargetType(geometryType) {
  if (geometryType === 'layerPoint') return 'depthLayerTarget';
  if (geometryType === 'sphere' || geometryType === 'ellipsoid') return 'ellipsoidalVolume';
  if (geometryType === 'frontSegment') return 'frontSegment';
  if (geometryType === 'volumeRegion') return 'plumeVolume';
  if (geometryType === 'depthInterval') return 'depthLayerTarget';
  return 'pointTarget';
}

function normalizeDepthInterval(value = {}) {
  const min = finiteOrNull(value.minDepthMeters ?? value.min ?? value.depthMinMeters);
  const max = finiteOrNull(value.maxDepthMeters ?? value.max ?? value.depthMaxMeters);
  if (min == null && max == null) return null;
  const a = Math.max(0, min ?? max ?? 0);
  const b = Math.max(0, max ?? min ?? 0);
  return { minDepthMeters: round(Math.min(a, b)), maxDepthMeters: round(Math.max(a, b)) };
}

function makeScienceTargetId(x, y, depthMeters, depthLayerId) {
  const col = Math.round(Number(x) || 0);
  const row = Math.round(Number(y) || 0);
  const depth = Math.round(Number(depthMeters) || 0);
  const layer = String(depthLayerId ?? 'layer').replace(/[^a-z0-9_-]/gi, '-');
  return `sampling-target-${layer}-${col}-${row}-${depth}`;
}

function labelForTarget(id, layerId) {
  return `${layerId ? labelize(layerId) : 'Water Column'} Target ${String(id ?? '').split('-').slice(-3).join('-')}`.trim();
}

function labelize(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (char) => char.toUpperCase());
}

function uniqueStrings(value) {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(raw.map((item) => String(item ?? '').trim()).filter(Boolean))];
}

function stringOrNull(value) {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}