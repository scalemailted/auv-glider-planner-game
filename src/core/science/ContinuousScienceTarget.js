import { normalizeContinuousMissionPoint } from '../geometry/ContinuousMissionCoordinates.js';

export const CONTINUOUS_SCIENCE_TARGET_VERSION = 'continuous-science-target-three-r1-2a-3';
export const CONTINUOUS_SCIENCE_TARGET_TYPES = Object.freeze([
  'pointTarget',
  'depthLayerTarget',
  'ellipsoidalVolume',
  'frontSegment',
  'plumeVolume',
  'uncertaintyRegion'
]);

export function createContinuousScienceTarget(options = {}) {
  return normalizeContinuousScienceTarget(options);
}

export function normalizeContinuousScienceTarget(target = {}) {
  const targetType = CONTINUOUS_SCIENCE_TARGET_TYPES.includes(target.targetType ?? target.type) ? target.targetType ?? target.type : 'pointTarget';
  const position = normalizeContinuousMissionPoint(target.position ?? target.center ?? target);
  return {
    type: 'anchor.science.continuous-target',
    version: CONTINUOUS_SCIENCE_TARGET_VERSION,
    id: target.id ?? target.targetId ?? `science-target-${position.derivedCell.col}-${position.derivedCell.row}`,
    targetType,
    position: { x: position.x, y: position.y, coordinateFrame: position.coordinateFrame },
    depthLayerId: target.depthLayerId ?? target.targetDepthLayerId ?? null,
    depthMeters: finiteOrNull(target.depthMeters ?? target.targetDepthMeters),
    radiusMeters: finiteOrNull(target.radiusMeters ?? target.radius),
    radiusX: finiteOrNull(target.radiusX),
    radiusY: finiteOrNull(target.radiusY),
    radiusDepthMeters: finiteOrNull(target.radiusDepthMeters ?? target.radiusZ),
    segment: Array.isArray(target.segment) ? target.segment.map((point) => normalizeContinuousMissionPoint(point)) : null,
    value: finiteOrNull(target.value ?? target.priorityValue),
    uncertainty: finiteOrNull(target.uncertainty),
    navigationWaypoint: false,
    routeAuthority: 'surfaceWaypointPlusDiveProfile',
    notes: ['Science targets can guide planning, but they are not arbitrary midwater XYZ navigation waypoints.']
  };
}

export function validateContinuousScienceTarget(target = {}) {
  const normalized = normalizeContinuousScienceTarget(target);
  const errors = [];
  if (!normalized.id) errors.push('Science target requires an id.');
  if (!Number.isFinite(Number(normalized.position.x)) || !Number.isFinite(Number(normalized.position.y))) errors.push('Science target requires finite continuous x/y.');
  if (!CONTINUOUS_SCIENCE_TARGET_TYPES.includes(normalized.targetType)) errors.push(`Unsupported science target type: ${normalized.targetType}`);
  return { valid: errors.length === 0, errors, target: normalized };
}

export function continuousScienceTargetSummary(target = {}) {
  const normalized = normalizeContinuousScienceTarget(target);
  return {
    version: CONTINUOUS_SCIENCE_TARGET_VERSION,
    id: normalized.id,
    targetType: normalized.targetType,
    x: normalized.position.x,
    y: normalized.position.y,
    depthLayerId: normalized.depthLayerId,
    depthMeters: normalized.depthMeters,
    navigationWaypoint: false
  };
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
