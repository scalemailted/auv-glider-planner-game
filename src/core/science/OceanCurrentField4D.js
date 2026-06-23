import {
  completeSimulationLaunchStage,
  incrementSimulationLaunchCounter,
  markSimulationLaunchStage,
  setSimulationLaunchCurrentField
} from '../runtime/SimulationLaunchProfiler.js';
import { normalizeOceanCurrentSourceMetadata, validateOceanCurrentSourceMetadata } from './OceanCurrentSourceMetadata.js';
import { computeCurrentFieldScientificDiagnostics } from './CurrentFieldScientificDiagnostics.js';
export const OCEAN_CURRENT_FIELD_4D_VERSION = 'ocean-current-field-4d-flow-r2a-3';

const oceanCurrentFieldRuntimeCounters = { buildCount: 0, normalizeCount: 0, normalizeHitCount: 0, digestCount: 0, summaryBuildCount: 0 };

export function resetOceanCurrentFieldRuntimeCounters() {
  oceanCurrentFieldRuntimeCounters.buildCount = 0;
  oceanCurrentFieldRuntimeCounters.normalizeCount = 0;
  oceanCurrentFieldRuntimeCounters.normalizeHitCount = 0;
  oceanCurrentFieldRuntimeCounters.digestCount = 0;
  oceanCurrentFieldRuntimeCounters.summaryBuildCount = 0;
}

export function getOceanCurrentFieldRuntimeCounters() {
  return { ...oceanCurrentFieldRuntimeCounters };
}

export function createOceanCurrentField4D(options = {}) {
  oceanCurrentFieldRuntimeCounters.buildCount += 1;
  const dims = inferDims(options);
  const eastAxisMeters = axis(options.eastAxisMeters, dims.width, (i) => i);
  const northAxisMeters = axis(options.northAxisMeters, dims.height, (i) => i);
  const depthAxisMeters = axis(options.depthAxisMeters, dims.depth, (i) => i === 0 ? 0 : i * 50);
  const timeAxisSeconds = axis(options.timeAxisSeconds, dims.time, (i) => i * 600);
  const shape = { width: eastAxisMeters.length, height: northAxisMeters.length, depth: depthAxisMeters.length, time: timeAxisSeconds.length };
  const seed = finite(options.seed, 17);
  const sourceMetadata = normalizeSourceMetadata(options.sourceMetadata ?? options.metadata ?? {}, seed);
  const field = {
    type: 'anchor.science.ocean-current-field-4d',
    version: OCEAN_CURRENT_FIELD_4D_VERSION,
    id: options.id ?? sourceMetadata.fieldId ?? 'synthetic-current-cube',
    label: options.label ?? sourceMetadata.label,
    coordinateFrame: options.coordinateFrame ?? 'localEastNorthDown',
    eastAxisMeters,
    northAxisMeters,
    depthAxisMeters,
    timeAxisSeconds,
    uEastMetersPerSecond: cube(options.uEastMetersPerSecond ?? options.u ?? options.F_u, shape, (t, z, y, x) => syntheticU(t, z, y, x, shape, seed)),
    vNorthMetersPerSecond: cube(options.vNorthMetersPerSecond ?? options.v ?? options.F_v, shape, (t, z, y, x) => syntheticV(t, z, y, x, shape, seed)),
    wDownMetersPerSecond: options.wDownMetersPerSecond || options.w || options.F_w ? cube(options.wDownMetersPerSecond ?? options.w ?? options.F_w, shape, () => 0) : null,
    wetMask: mask(options.wetMask ?? options.waterMask ?? options.landMask, shape, Boolean(options.landMask)),
    bottomDepthMeters: bottom(options.bottomDepthMeters ?? options.bathymetry?.depthMeters ?? options.depthMeters, shape, depthAxisMeters),
    sourceMetadata,
    boundaryFlags: {
      rendererOwnsCurrent: false,
      displayLayerChangesCurrent: false,
      changesOfficialScoring: false,
      usesNewPlanner: false,
      usesWebGpu: false,
      usesRealHycom: sourceMetadata.usesRealHycom === true,
      usesRealMarineCopernicus: sourceMetadata.usesRealMarineCopernicus === true,
      calibratedForecast: sourceMetadata.calibratedForecast === true,
      ...(options.boundaryFlags ?? {})
    },
    units: {
      axes: 'meters, seconds',
      uEastMetersPerSecond: 'm/s eastward',
      vNorthMetersPerSecond: 'm/s northward',
      wDownMetersPerSecond: 'm/s positive down when supplied'
    }
  };
  field.digest = oceanCurrentField4DDigest(field);
  markNormalizedField(field);
  setSimulationLaunchCurrentField(field);
  return field;
}

export function normalizeOceanCurrentField4D(field = {}) {
  if (isNormalizedOceanCurrentField4D(field)) {
    oceanCurrentFieldRuntimeCounters.normalizeHitCount += 1;
    setSimulationLaunchCurrentField(field);
    return field;
  }
  oceanCurrentFieldRuntimeCounters.normalizeCount += 1;
  incrementSimulationLaunchCounter('currentCubeNormalizeCount');
  markSimulationLaunchStage('normalizeCurrentCube');
  const normalized = createOceanCurrentField4D(field ?? {});
  completeSimulationLaunchStage('normalizeCurrentCube');
  return normalized;
}

export function validateOceanCurrentField4D(field = {}) {
  const rawErrors = [];
  if (field?.type === 'anchor.science.ocean-current-field-4d') {
    for (const key of ['eastAxisMeters', 'northAxisMeters', 'depthAxisMeters', 'timeAxisSeconds', 'uEastMetersPerSecond', 'vNorthMetersPerSecond']) {
      if (!Array.isArray(field[key]) || !field[key].length) rawErrors.push(`${key} must be supplied on typed current fields.`);
    }
    if (rawErrors.length) return { valid: false, status: 'FAIL', errors: rawErrors, warnings: [], field, summary: null };
  }
  const normalized = normalizeOceanCurrentField4D(field);
  const errors = [];
  const warnings = [];
  const dims = dimensionsForField(normalized);
  for (const key of ['eastAxisMeters', 'northAxisMeters', 'depthAxisMeters', 'timeAxisSeconds']) {
    if (!Array.isArray(normalized[key]) || !normalized[key].length) errors.push(`${key} must be a non-empty axis.`);
    if (!normalized[key].every((value) => Number.isFinite(Number(value)))) errors.push(`${key} must contain finite values.`);
    if (!monotonic(normalized[key])) errors.push(`${key} must be monotonic.`);
  }
  for (const key of ['uEastMetersPerSecond', 'vNorthMetersPerSecond']) {
    const got = cubeDims(normalized[key]);
    if (got.time !== dims.time || got.depth !== dims.depth || got.height !== dims.height || got.width !== dims.width) errors.push(`${key} shape must match current axes.`);
    if (!finiteCube(normalized[key])) errors.push(`${key} contains non-finite values.`);
  }
  const metadataValidation = validateOceanCurrentSourceMetadata(normalized.sourceMetadata ?? {});
  errors.push(...metadataValidation.errors);
  warnings.push(...metadataValidation.warnings);
  const label = String(normalized.label ?? normalized.sourceMetadata?.label ?? normalized.sourceMetadata?.sourceLabel ?? '');
  const syntheticClaimText = `${label} ${(normalized.sourceMetadata?.warnings ?? []).join(' ')}`;
  if (normalized.sourceMetadata?.sourceTier === 'scientificallyConstrainedSynthetic' && /\breal\s+HYCOM\b|\bMarine\s+Copernicus\b/i.test(label) && !/not real HYCOM or Marine Copernicus/i.test(syntheticClaimText)) errors.push('Synthetic fields must not claim real HYCOM or Marine Copernicus data.');
  if (normalized.sourceMetadata?.usesRealHycom || normalized.sourceMetadata?.usesRealMarineCopernicus || normalized.sourceMetadata?.calibratedForecast) warnings.push('Field claims real or calibrated source metadata; verify provenance.');
  if (normalized.wDownMetersPerSecond && normalized.sourceMetadata?.includesVerticalVelocity !== true) warnings.push('A vertical W field is present but source metadata does not mark includesVerticalVelocity=true.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, field: normalized, summary: oceanCurrentField4DSummary(normalized) };
}

export function oceanCurrentField4DSummary(field = {}) {
  const normalized = normalizeOceanCurrentField4D(field);
  if (normalized?.__anchorCurrentFieldSummary) return normalized.__anchorCurrentFieldSummary;
  oceanCurrentFieldRuntimeCounters.summaryBuildCount += 1;
  const speeds = [];
  const dims = dimensionsForField(normalized);
  for (let t = 0; t < dims.time; t += 1) for (let z = 0; z < dims.depth; z += 1) for (let y = 0; y < dims.height; y += 1) for (let x = 0; x < dims.width; x += 1) {
    speeds.push(Math.hypot(normalized.uEastMetersPerSecond[t][z][y][x], normalized.vNorthMetersPerSecond[t][z][y][x]));
  }
  const diagnostics = normalized.scientificDiagnostics ?? computeCurrentFieldScientificDiagnostics(normalized);
  const sourceMetadata = normalized.sourceMetadata ?? {};
  const summary = {
    type: 'anchor.science.ocean-current-field-4d-summary',
    version: normalized.version,
    fieldId: normalized.id,
    label: normalized.label,
    coordinateFrame: normalized.coordinateFrame,
    eastSampleCount: normalized.eastAxisMeters.length,
    northSampleCount: normalized.northAxisMeters.length,
    depthSampleCount: normalized.depthAxisMeters.length,
    timeSampleCount: normalized.timeAxisSeconds.length,
    sourceTier: sourceMetadata.sourceTier ?? null,
    sourceType: sourceMetadata.sourceType ?? null,
    sourceLabel: sourceMetadata.sourceLabel ?? sourceMetadata.label ?? null,
    equationFamily: sourceMetadata.equationFamily ?? null,
    depthDependent: sourceMetadata.depthDependent === true,
    timeDependent: sourceMetadata.timeDependent === true,
    usesBathymetryMask: sourceMetadata.usesBathymetryMask === true,
    usesCoastlineBoundary: sourceMetadata.usesCoastlineBoundary === true,
    usesIsobathSteering: sourceMetadata.usesIsobathSteering === true,
    usesRealHycom: sourceMetadata.usesRealHycom === true,
    usesRealMarineCopernicus: sourceMetadata.usesRealMarineCopernicus === true,
    calibratedForecast: sourceMetadata.calibratedForecast === true,
    wComponentSupplied: normalized.wDownMetersPerSecond != null,
    speedStatistics: stats(speeds),
    diagnostics,
    divergenceRms: diagnostics.divergenceRms ?? null,
    divergenceMaximum: diagnostics.divergenceMaximum ?? null,
    vorticityMean: diagnostics.vorticityMean ?? null,
    vorticityMaximum: diagnostics.vorticityMaximum ?? null,
    coastlineNormalSpeedRms: diagnostics.coastlineNormalSpeedRms ?? null,
    coastlineNormalSpeedMaximum: diagnostics.coastlineNormalSpeedMaximum ?? null,
    verticalShearRms: diagnostics.verticalShearRms ?? null,
    temporalChangeRms: diagnostics.temporalChangeRms ?? null,
    alongIsobathFraction: diagnostics.alongIsobathFraction ?? null,
    crossIsobathFraction: diagnostics.crossIsobathFraction ?? null,
    landVectorCount: diagnostics.landVectorCount ?? 0,
    belowBottomVectorCount: diagnostics.belowBottomVectorCount ?? 0,
    sourceMetadata,
    digest: normalized.digest ?? oceanCurrentField4DDigest(normalized),
    boundaryFlags: normalized.boundaryFlags
  };
  defineHidden(normalized, '__anchorCurrentFieldSummary', summary);
  return summary;
}

export function oceanCurrentField4DDigest(field = {}) {
  oceanCurrentFieldRuntimeCounters.digestCount += 1;
  incrementSimulationLaunchCounter('currentCubeDigestCount');
  return `fnv1a32:${fnv(stable({
    coordinateFrame: field.coordinateFrame,
    eastAxisMeters: field.eastAxisMeters,
    northAxisMeters: field.northAxisMeters,
    depthAxisMeters: field.depthAxisMeters,
    timeAxisSeconds: field.timeAxisSeconds,
    uEastMetersPerSecond: field.uEastMetersPerSecond,
    vNorthMetersPerSecond: field.vNorthMetersPerSecond,
    wDownMetersPerSecond: field.wDownMetersPerSecond,
    wetMask: field.wetMask,
    bottomDepthMeters: field.bottomDepthMeters,
    sourceMetadata: field.sourceMetadata
  }))}`;
}

function isNormalizedOceanCurrentField4D(field = {}) {
  return field?.type === 'anchor.science.ocean-current-field-4d'
    && field.__anchorCurrentFieldNormalized === true
    && Array.isArray(field.eastAxisMeters)
    && Array.isArray(field.northAxisMeters)
    && Array.isArray(field.depthAxisMeters)
    && Array.isArray(field.timeAxisSeconds)
    && Array.isArray(field.uEastMetersPerSecond)
    && Array.isArray(field.vNorthMetersPerSecond);
}

function markNormalizedField(field = {}) {
  defineHidden(field, '__anchorCurrentFieldNormalized', true);
  return field;
}

function defineHidden(target, key, value) {
  try {
    Object.defineProperty(target, key, { value, configurable: true, enumerable: false, writable: true });
  } catch (_error) {
    target[key] = value;
  }
}
export function dimensionsForField(field = {}) {
  return { width: field.eastAxisMeters?.length ?? 0, height: field.northAxisMeters?.length ?? 0, depth: field.depthAxisMeters?.length ?? 0, time: field.timeAxisSeconds?.length ?? 0 };
}

function inferDims(options = {}) {
  const d = cubeLikeDims(options.uEastMetersPerSecond ?? options.u ?? options.F_u ?? options.vNorthMetersPerSecond ?? options.v ?? options.F_v);
  return {
    width: Math.max(1, Number(options.width ?? options.grid?.width ?? options.eastAxisMeters?.length ?? d.width ?? 8)),
    height: Math.max(1, Number(options.height ?? options.grid?.height ?? options.northAxisMeters?.length ?? d.height ?? 8)),
    depth: Math.max(1, Number(options.depthAxisMeters?.length ?? d.depth ?? 4)),
    time: Math.max(1, Number(options.timeAxisSeconds?.length ?? d.time ?? 3))
  };
}

function axis(values, count, fallback) {
  const source = Array.isArray(values) && values.length ? values : Array.from({ length: count }, (_value, index) => fallback(index));
  return source.map((value, index) => finite(value, fallback(index))).sort((a, b) => a - b);
}

function cube(input, shape, fallback) {
  const rank = arrayRank(input);
  return Array.from({ length: shape.time }, (_tt, t) => Array.from({ length: shape.depth }, (_zz, z) => Array.from({ length: shape.height }, (_yy, y) => Array.from({ length: shape.width }, (_xx, x) => {
    const value = rank >= 4 ? input?.[t]?.[z]?.[y]?.[x] : rank === 3 ? input?.[z]?.[y]?.[x] : rank === 2 ? input?.[y]?.[x] : undefined;
    return round(finite(value, fallback(t, z, y, x)), 8);
  }))));
}

function mask(input, shape, inputIsLandMask) {
  if (!Array.isArray(input)) return Array.from({ length: shape.height }, () => Array.from({ length: shape.width }, () => true));
  return Array.from({ length: shape.height }, (_row, y) => Array.from({ length: shape.width }, (_cell, x) => inputIsLandMask ? !Boolean(input?.[y]?.[x]) : input?.[y]?.[x] !== false));
}

function bottom(input, shape, depthAxisMeters) {
  const fallback = Math.max(...depthAxisMeters, 150) + 50;
  return Array.from({ length: shape.height }, (_row, y) => Array.from({ length: shape.width }, (_cell, x) => Math.max(0, finite(input?.[y]?.[x], fallback))));
}

function normalizeSourceMetadata(input = {}, seed = 17) {
  return normalizeOceanCurrentSourceMetadata(input, { seed });
}

function cubeLikeDims(input) {
  const rank = arrayRank(input);
  if (rank >= 4) return { time: input.length, depth: input[0]?.length ?? 0, height: input[0]?.[0]?.length ?? 0, width: input[0]?.[0]?.[0]?.length ?? 0 };
  if (rank === 3) return { time: 1, depth: input.length, height: input[0]?.length ?? 0, width: input[0]?.[0]?.length ?? 0 };
  if (rank === 2) return { time: 1, depth: 1, height: input.length, width: input[0]?.length ?? 0 };
  return { time: 0, depth: 0, height: 0, width: 0 };
}

function cubeDims(cubeValue = []) {
  return { time: cubeValue.length, depth: cubeValue[0]?.length ?? 0, height: cubeValue[0]?.[0]?.length ?? 0, width: cubeValue[0]?.[0]?.[0]?.length ?? 0 };
}
function arrayRank(value) { let rank = 0; let current = value; while (Array.isArray(current)) { rank += 1; current = current[0]; } return rank; }
function syntheticU(t, z, y, x, s, seed) { return 0.16 + 0.08 * Math.sin((x / Math.max(1, s.width - 1) * 2 + t * 0.35 + seed * 0.01) * Math.PI) + z * 0.035 - y * 0.006; }
function syntheticV(t, z, y, x, s, seed) { return -0.06 + 0.07 * Math.cos((y / Math.max(1, s.height - 1) * 2 - t * 0.29 + seed * 0.013) * Math.PI) - z * 0.028 + x * 0.004; }
function finiteCube(cubeValue) { return (cubeValue ?? []).every((t) => t.every((z) => z.every((row) => row.every((value) => Number.isFinite(Number(value)))))); }
function monotonic(values) { return values.every((value, index) => index === 0 || Number(value) >= Number(values[index - 1])); }
function stats(values) { const v = values.map(Number).filter(Number.isFinite); return v.length ? { count: v.length, min: round(Math.min(...v)), mean: round(v.reduce((a, b) => a + b, 0) / v.length), max: round(Math.max(...v)) } : { count: 0, min: null, mean: null, max: null }; }
function stable(value) { if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`; return JSON.stringify(value); }
function fnv(text) { let hash = 2166136261; for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(16).padStart(8, '0'); }
function finite(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function round(value, digits = 6) { const n = Number(value); return Number.isFinite(n) ? Number(n.toFixed(digits)) : null; }
