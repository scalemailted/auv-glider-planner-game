const HeadlessGrid = require('./HeadlessGrid.js')
const WaterColumnSchema = require('./WaterColumnSchema.js')
const MOTION_ENVIRONMENT_SAMPLER_VERSION = 'motion-environment-sampler-motion-r1';

 function sampleMotionEnvironment({
  fieldPack,
  waterColumnConfig,
  bathymetry,
  hazardField,
  constraintMask,
  state,
  timeSeconds,
  options = {}
} = {}) {
  const warnings = [];
  const sampleState = state ?? {};
  const zIndex = Math.max(0, Math.round(finiteNumber(sampleState.zIndex ?? sampleState.z, 0)));
  const depthLayerId = sampleState.depthLayerId
    ?? sampleState.depthLayer
    ?? fieldPack?.grid?.depthLayers?.[zIndex]
    ?? waterColumnConfig?.depthLayerIds?.[zIndex]
    ?? 'surface';
  const depthMeters = finiteNumber(sampleState.depthMeters, WaterColumnSchema.waterColumnLayerMetadata(depthLayerId).nominalDepthMeters ?? 0);
  const currentVector = sampleCurrentVectorForMotion(fieldPack, { ...sampleState, zIndex }, options);
  const bathymetryDepthMeters = sampleBathymetryForMotion(bathymetry, sampleState, options);
  if (bathymetryDepthMeters === null) warnings.push('Bathymetry not provided; bottom clearance is unavailable.');
  const bottomClearanceMeters = bathymetryDepthMeters === null ? null : bathymetryDepthMeters - depthMeters;
  const hazard = hazardField
    ? HeadlessGrid.sampleNearest3d(wrapScalar2d(hazardField), sampleState.x, sampleState.y, zIndex)
    : sampleHazardForMotion(fieldPack, { ...sampleState, zIndex }, options);
  const constraint = constraintMask
    ? HeadlessGrid.sampleNearest3d(wrapScalar2d(constraintMask), sampleState.x, sampleState.y, zIndex)
    : sampleDepthAccessibilityForMotion(fieldPack, { ...sampleState, zIndex }, options).constraint;
  const depthAccessible = bottomClearanceMeters === null ? constraint < 0.5 : bottomClearanceMeters >= finiteNumber(options.minimumBottomClearanceMeters, 2) && constraint < 0.5;
  if (!depthAccessible) warnings.push('Depth or constraint sample is not accessible.');
  return {
    type: 'anchor.motion.environment-sample',
    version: MOTION_ENVIRONMENT_SAMPLER_VERSION,
    timeSeconds: finiteNumber(timeSeconds ?? sampleState.timeSeconds, 0),
    x: finiteNumber(sampleState.x, 0),
    y: finiteNumber(sampleState.y, 0),
    z: finiteNumber(sampleState.z ?? zIndex, zIndex),
    zIndex,
    depthLayerId,
    depthMeters,
    currentVector,
    currentSpeed: Math.hypot(currentVector.u, currentVector.v, currentVector.w ?? 0),
    bathymetryDepthMeters,
    bottomClearanceMeters,
    hazard,
    constraint,
    depthAccessible,
    waterColumnLayer: {
      id: depthLayerId,
      ...WaterColumnSchema.waterColumnLayerMetadata(depthLayerId)
    },
    warnings
  };
}

 function sampleCurrentVectorForMotion(fieldPack, state = {}, options = {}) {
  const fields = fieldPack?.fields ?? {};
  const x = finiteNumber(state.x, 0);
  const y = finiteNumber(state.y, 0);
  const z = Math.max(0, Math.round(finiteNumber(state.zIndex ?? state.z, 0)));
  const strength = finiteNumber(options.currentStrength ?? options.flowScale, 1);
  const u = HeadlessGrid.sampleNearest3d(fields.F_u ?? fields.u ?? fields.flowU, x, y, z) * strength;
  const v = HeadlessGrid.sampleNearest3d(fields.F_v ?? fields.v ?? fields.flowV, x, y, z) * strength;
  const w = HeadlessGrid.sampleNearest3d(fields.F_w ?? fields.w ?? fields.flowW, x, y, z) * strength;
  return { u: round(u), v: round(v), w: round(w) };
}

 function sampleBathymetryForMotion(bathymetry, state = {}, _options = {}) {
  if (!bathymetry) return null;
  const field = Array.isArray(bathymetry?.field) ? bathymetry.field : bathymetry;
  if (!Array.isArray(field)) return null;
  const y = clampInt(Math.round(finiteNumber(state.y, 0)), 0, field.length - 1);
  const row = field[y];
  if (!Array.isArray(row)) return null;
  const x = clampInt(Math.round(finiteNumber(state.x, 0)), 0, row.length - 1);
  const value = Number(row[x]);
  return Number.isFinite(value) ? value : null;
}

 function sampleHazardForMotion(fieldPack, state = {}, _options = {}) {
  return HeadlessGrid.sampleNearest3d(fieldPack?.fields?.hazard, state.x, state.y, state.zIndex ?? state.z ?? 0);
}

 function sampleDepthAccessibilityForMotion(fieldPack, state = {}, _options = {}) {
  const constraint = HeadlessGrid.sampleNearest3d(fieldPack?.fields?.constraintMask, state.x, state.y, state.zIndex ?? state.z ?? 0);
  return {
    constraint,
    depthAccessible: constraint < 0.5,
    warning: constraint >= 0.5 ? 'Constraint mask marks this cell as blocked.' : null
  };
}

 function motionEnvironmentSummary(samples = []) {
  const list = Array.isArray(samples) ? samples : [];
  const currents = list.map((sample) => Number(sample.currentSpeed)).filter(Number.isFinite);
  const hazards = list.map((sample) => Number(sample.hazard)).filter(Number.isFinite);
  const constraints = list.map((sample) => Number(sample.constraint)).filter(Number.isFinite);
  return {
    type: 'anchor.motion.environment-summary',
    version: MOTION_ENVIRONMENT_SAMPLER_VERSION,
    sampleCount: list.length,
    meanCurrentSpeed: mean(currents),
    maxCurrentSpeed: max(currents),
    meanHazard: mean(hazards),
    constraintViolationCount: constraints.filter((value) => value >= 0.5).length,
    bottomClearanceWarningCount: list.filter((sample) => sample.bottomClearanceMeters !== null && Number(sample.bottomClearanceMeters) < 2).length,
    warningCount: list.reduce((sum, sample) => sum + (sample.warnings?.length ?? 0), 0),
    notA: ['not calibrated ocean physics', 'not terrain-flow accumulation', 'not WebGPU']
  };
}

function wrapScalar2d(field) {
  if (!Array.isArray(field)) return field;
  if (Array.isArray(field[0]?.[0])) return field;
  return [field];
}

function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : 0;
}

function max(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(Math.max(...finite)) : 0;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}

module.exports = {sampleMotionEnvironment, sampleCurrentVectorForMotion, sampleBathymetryForMotion, sampleHazardForMotion, sampleDepthAccessibilityForMotion, motionEnvironmentSummary}