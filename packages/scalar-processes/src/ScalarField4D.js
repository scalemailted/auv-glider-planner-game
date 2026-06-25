import { normalizeScalarSourceMetadata, validateScalarSourceMetadata } from './ScalarSourceMetadata.js';
import { computeScalarFieldDiagnostics, scalarFieldDigest, validateScalarFieldDiagnostics } from './ScalarFieldDiagnostics.js';
import { sampleScalarFieldContinuous } from './VolumetricFieldSampler.js';

export const SCALAR_FIELD_4D_VERSION = 'scalar-field-4d-process-pkg-r1';

const scalarFieldRuntimeCounters = { buildCount: 0, normalizeCount: 0, normalizeHitCount: 0, digestCount: 0, summaryBuildCount: 0 };

export function resetScalarField4DRuntimeCounters() {
  scalarFieldRuntimeCounters.buildCount = 0;
  scalarFieldRuntimeCounters.normalizeCount = 0;
  scalarFieldRuntimeCounters.normalizeHitCount = 0;
  scalarFieldRuntimeCounters.digestCount = 0;
  scalarFieldRuntimeCounters.summaryBuildCount = 0;
}

export function getScalarField4DRuntimeCounters() {
  return { ...scalarFieldRuntimeCounters };
}

export function createScalarField4D(options = {}) {
  scalarFieldRuntimeCounters.buildCount += 1;
  const dims = inferDims(options);
  const xAxis = axis(options.xAxis ?? options.eastAxisMeters ?? options.xCoordinates, dims.width, (index) => index);
  const yAxis = axis(options.yAxis ?? options.northAxisMeters ?? options.yCoordinates, dims.height, (index) => index);
  const depthAxisMeters = axis(options.depthAxisMeters ?? options.depthCoordinates, dims.depth, (index) => index === 0 ? 0 : index * 50);
  const timeAxisSeconds = axis(options.timeAxisSeconds ?? options.timeCoordinates, dims.time, (index) => index * 600);
  const shape = { width: xAxis.length, height: yAxis.length, depth: depthAxisMeters.length, time: timeAxisSeconds.length };
  const seed = finite(options.seed, 31);
  const sourceMetadata = normalizeScalarSourceMetadata(options.sourceMetadata ?? options.metadata ?? options.provenance ?? {}, { seed });
  const field = {
    type: 'anchor.scalar-processes.scalar-field-4d',
    version: SCALAR_FIELD_4D_VERSION,
    id: options.id ?? sourceMetadata.fieldId ?? 'synthetic-scalar-field',
    label: options.label ?? sourceMetadata.label,
    coordinateFrame: options.coordinateFrame ?? 'localGridXYDepthTime',
    xAxis,
    yAxis,
    depthAxisMeters,
    timeAxisSeconds,
    scalarValue: cube(options.scalarValue ?? options.value ?? options.values ?? options.field ?? options.fields?.value?.values, shape, (t, z, y, x) => syntheticScalar(t, z, y, x, shape, seed)),
    forecastValue: optionalCube(options.forecastValue ?? options.forecast ?? options.fields?.forecastValue?.values, shape),
    beliefMean: optionalCube(options.beliefMean ?? options.belief ?? options.fields?.beliefMean?.values, shape),
    uncertainty: optionalCube(options.uncertainty ?? options.fields?.uncertainty?.values, shape),
    sourceMetadata,
    boundaryFlags: {
      rendererOwnsScalarTruth: false,
      displayLayerChangesScalarTruth: false,
      changesOfficialScoring: false,
      ownsVehiclePhysics: false,
      ownsObservationNoise: false,
      ownsBathymetry: false,
      ownsCurrents: false,
      ...(options.boundaryFlags ?? {})
    },
    units: {
      axes: 'grid x/y, meters depth-positive-down, seconds',
      scalarValue: sourceMetadata.units ?? 'normalized science value'
    }
  };
  field.diagnostics = options.diagnostics ?? computeScalarFieldDiagnostics(field);
  field.digest = scalarField4DDigest(field);
  markNormalizedField(field);
  return field;
}

export function normalizeScalarField4D(field = {}) {
  if (isNormalizedScalarField4D(field)) {
    scalarFieldRuntimeCounters.normalizeHitCount += 1;
    return field;
  }
  scalarFieldRuntimeCounters.normalizeCount += 1;
  return createScalarField4D(field ?? {});
}

export function validateScalarField4D(field = {}) {
  const rawErrors = [];
  if (field?.type === 'anchor.scalar-processes.scalar-field-4d') {
    for (const key of ['xAxis', 'yAxis', 'depthAxisMeters', 'timeAxisSeconds', 'scalarValue']) {
      if (!Array.isArray(field[key]) || !field[key].length) rawErrors.push(`${key} must be supplied on typed scalar fields.`);
    }
    if (rawErrors.length) return { valid: false, status: 'FAIL', errors: rawErrors, warnings: [], field, summary: null };
  }
  const normalized = normalizeScalarField4D(field);
  const errors = [];
  const warnings = [];
  const dims = dimensionsForScalarField(normalized);
  for (const key of ['xAxis', 'yAxis', 'depthAxisMeters', 'timeAxisSeconds']) {
    if (!Array.isArray(normalized[key]) || !normalized[key].length) errors.push(`${key} must be a non-empty axis.`);
    if (!normalized[key].every((value) => Number.isFinite(Number(value)))) errors.push(`${key} must contain finite values.`);
    if (!monotonic(normalized[key])) errors.push(`${key} must be monotonic.`);
  }
  const got = cubeDims(normalized.scalarValue);
  if (got.time !== dims.time || got.depth !== dims.depth || got.height !== dims.height || got.width !== dims.width) errors.push('scalarValue shape must match scalar axes.');
  if (!finiteCube(normalized.scalarValue)) errors.push('scalarValue contains non-finite values.');
  const metadataValidation = validateScalarSourceMetadata(normalized.sourceMetadata ?? {});
  errors.push(...metadataValidation.errors);
  warnings.push(...metadataValidation.warnings);
  const diagnosticsValidation = validateScalarFieldDiagnostics(normalized.diagnostics ?? computeScalarFieldDiagnostics(normalized));
  errors.push(...diagnosticsValidation.errors);
  warnings.push(...diagnosticsValidation.warnings);
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, field: normalized, summary: scalarField4DSummary(normalized) };
}

export function scalarField4DSummary(field = {}) {
  const normalized = normalizeScalarField4D(field);
  if (normalized.__anchorScalarFieldSummary) return normalized.__anchorScalarFieldSummary;
  scalarFieldRuntimeCounters.summaryBuildCount += 1;
  const diagnostics = normalized.diagnostics ?? computeScalarFieldDiagnostics(normalized);
  const sourceMetadata = normalized.sourceMetadata ?? {};
  const summary = {
    type: 'anchor.scalar-processes.scalar-field-4d-summary',
    version: normalized.version,
    fieldId: normalized.id,
    label: normalized.label,
    coordinateFrame: normalized.coordinateFrame,
    xSampleCount: normalized.xAxis.length,
    ySampleCount: normalized.yAxis.length,
    depthSampleCount: normalized.depthAxisMeters.length,
    timeSampleCount: normalized.timeAxisSeconds.length,
    depthAxisMeters: [...normalized.depthAxisMeters],
    timeAxisSeconds: [...normalized.timeAxisSeconds],
    sourceTier: sourceMetadata.sourceTier ?? null,
    sourceType: sourceMetadata.sourceType ?? null,
    processKind: sourceMetadata.processKind ?? null,
    equationFamily: sourceMetadata.equationFamily ?? null,
    generatorBackend: sourceMetadata.generatorBackend ?? null,
    generatorVersion: sourceMetadata.generatorVersion ?? null,
    synthetic: sourceMetadata.synthetic !== false,
    calibratedForecast: sourceMetadata.calibratedForecast === true,
    calibratedOceanForecast: sourceMetadata.calibratedOceanForecast === true,
    calibratedBiogeochemicalForecast: sourceMetadata.calibratedBiogeochemicalForecast === true,
    publicSafe: sourceMetadata.publicSafe !== false,
    hiddenTruthIncluded: sourceMetadata.hiddenTruthIncluded === true,
    scalarStatistics: diagnostics.scalarStatistics,
    depthMeanRange: diagnostics.depthMeanRange,
    timeMeanRange: diagnostics.timeMeanRange,
    depthLayerDigestCount: diagnostics.depthLayerDigestCount,
    materiallyDepthVarying: diagnostics.materiallyDepthVarying,
    temporallyVarying: diagnostics.temporallyVarying,
    massByTime: diagnostics.massByTime,
    sourceMetadata,
    digest: normalized.digest ?? scalarField4DDigest(normalized),
    boundaryFlags: normalized.boundaryFlags
  };
  defineHidden(normalized, '__anchorScalarFieldSummary', summary);
  return summary;
}

export function scalarField4DDigest(field = {}) {
  scalarFieldRuntimeCounters.digestCount += 1;
  return scalarFieldDigest({
    coordinateFrame: field.coordinateFrame,
    xAxis: field.xAxis,
    yAxis: field.yAxis,
    depthAxisMeters: field.depthAxisMeters,
    timeAxisSeconds: field.timeAxisSeconds,
    scalarValue: field.scalarValue,
    forecastValue: field.forecastValue,
    beliefMean: field.beliefMean,
    uncertainty: field.uncertainty,
    sourceMetadata: field.sourceMetadata
  });
}

export function createScalarField4DSampler(field = {}, options = {}) {
  const normalized = normalizeScalarField4D(field);
  return {
    type: 'anchor.scalar-processes.scalar-field-4d-sampler',
    fieldId: normalized.id,
    interpolation: options.interpolation ?? 'quadrilinearTimeVolumeV1',
    sample: (sampleOptions = {}) => sampleScalarField4D(normalized, sampleOptions)
  };
}

export function sampleScalarField4D(field = {}, sampleOptions = {}) {
  const normalized = normalizeScalarField4D(field);
  return sampleScalarFieldContinuous({
    field: normalized.scalarValue,
    x: sampleOptions.x ?? sampleOptions.eastMeters ?? sampleOptions.col,
    y: sampleOptions.y ?? sampleOptions.northMeters ?? sampleOptions.row,
    depthMeters: sampleOptions.depthMeters,
    timeSeconds: sampleOptions.timeSeconds,
    depthCoordinates: normalized.depthAxisMeters,
    timeCoordinates: normalized.timeAxisSeconds,
    interpolationProfileId: sampleOptions.interpolationProfileId ?? sampleOptions.interpolation ?? 'quadrilinearTimeVolumeV1'
  });
}

export function dimensionsForScalarField(field = {}) {
  return { width: field.xAxis?.length ?? 0, height: field.yAxis?.length ?? 0, depth: field.depthAxisMeters?.length ?? 0, time: field.timeAxisSeconds?.length ?? 0 };
}

function isNormalizedScalarField4D(field = {}) {
  return field?.type === 'anchor.scalar-processes.scalar-field-4d'
    && field.__anchorScalarFieldNormalized === true
    && Array.isArray(field.xAxis)
    && Array.isArray(field.yAxis)
    && Array.isArray(field.depthAxisMeters)
    && Array.isArray(field.timeAxisSeconds)
    && Array.isArray(field.scalarValue);
}

function markNormalizedField(field = {}) {
  defineHidden(field, '__anchorScalarFieldNormalized', true);
  return field;
}

function defineHidden(target, key, value) {
  try {
    Object.defineProperty(target, key, { value, configurable: true, enumerable: false, writable: true });
  } catch (_error) {
    target[key] = value;
  }
}

function inferDims(options = {}) {
  const d = cubeLikeDims(options.scalarValue ?? options.value ?? options.values ?? options.field ?? options.fields?.value?.values);
  return {
    width: Math.max(1, Number(options.width ?? options.grid?.width ?? options.xAxis?.length ?? options.eastAxisMeters?.length ?? d.width ?? 8)),
    height: Math.max(1, Number(options.height ?? options.grid?.height ?? options.yAxis?.length ?? options.northAxisMeters?.length ?? d.height ?? 8)),
    depth: Math.max(1, Number(options.depthAxisMeters?.length ?? options.depthCoordinates?.length ?? d.depth ?? 4)),
    time: Math.max(1, Number(options.timeAxisSeconds?.length ?? options.timeCoordinates?.length ?? d.time ?? 3))
  };
}

function axis(values, count, fallback) {
  const source = Array.isArray(values) && values.length ? values : Array.from({ length: count }, (_value, index) => fallback(index));
  return source.map((value, index) => finite(value, fallback(index)));
}

function optionalCube(input, shape) {
  return input == null ? null : cube(input, shape, () => 0);
}

function cube(input, shape, fallback) {
  const rank = arrayRank(input);
  return Array.from({ length: shape.time }, (_tt, t) => Array.from({ length: shape.depth }, (_zz, z) => Array.from({ length: shape.height }, (_yy, y) => Array.from({ length: shape.width }, (_xx, x) => {
    const value = rank >= 4 ? input?.[t]?.[z]?.[y]?.[x] : rank === 3 ? input?.[z]?.[y]?.[x] : rank === 2 ? input?.[y]?.[x] : undefined;
    return round(finite(value, fallback(t, z, y, x)), 8);
  }))));
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

function arrayRank(value) {
  let rank = 0;
  let current = value;
  while (Array.isArray(current)) {
    rank += 1;
    current = current[0];
  }
  return rank;
}

function finiteCube(cubeValue) {
  return (cubeValue ?? []).every((timeLayer) => timeLayer.every((depthLayer) => depthLayer.every((row) => row.every((value) => Number.isFinite(Number(value))))));
}

function monotonic(values) {
  return values.every((value, index) => index === 0 || Number(value) >= Number(values[index - 1]));
}

function syntheticScalar(t, z, y, x, shape, seed) {
  const nx = shape.width > 1 ? x / (shape.width - 1) : 0;
  const ny = shape.height > 1 ? y / (shape.height - 1) : 0;
  return 0.2 + 0.35 * nx + 0.2 * ny + 0.06 * z + 0.025 * t + 0.015 * Math.sin(seed * 0.01 + x * 0.7 + y * 0.4);
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
