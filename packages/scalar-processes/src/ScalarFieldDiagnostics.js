import { normalizeScalarSourceMetadata, validateScalarSourceMetadata } from './ScalarSourceMetadata.js';

export const SCALAR_FIELD_DIAGNOSTICS_VERSION = 'scalar-field-diagnostics-process-pkg-r1';

export function computeScalarFieldDiagnostics(field = {}) {
  const normalized = normalizeFieldInput(field);
  const values = [];
  const byDepth = Array.from({ length: normalized.shape.depth }, () => []);
  const byTime = Array.from({ length: normalized.shape.time }, () => []);
  for (let t = 0; t < normalized.shape.time; t += 1) {
    for (let z = 0; z < normalized.shape.depth; z += 1) {
      for (let y = 0; y < normalized.shape.height; y += 1) {
        for (let x = 0; x < normalized.shape.width; x += 1) {
          const value = Number(normalized.values?.[t]?.[z]?.[y]?.[x]);
          values.push(value);
          byDepth[z].push(value);
          byTime[t].push(value);
        }
      }
    }
  }
  const depthMeans = byDepth.map((items) => stats(items).mean);
  const timeMeans = byTime.map((items) => stats(items).mean);
  const diagnostics = {
    type: 'anchor.scalar-processes.diagnostics',
    version: SCALAR_FIELD_DIAGNOSTICS_VERSION,
    fieldId: normalized.id ?? null,
    shape: normalized.shape,
    sourceMetadata: normalized.sourceMetadata ?? null,
    scalarStatistics: stats(values),
    perDepthStatistics: byDepth.map(stats),
    perTimeStatistics: byTime.map(stats),
    depthMeanRange: range(depthMeans),
    timeMeanRange: range(timeMeans),
    depthLayerDigestCount: new Set(normalized.values[0]?.map((layer) => scalarFieldDigest(layer)) ?? []).size,
    materiallyDepthVarying: range(depthMeans) > Number(normalized.materialDifferenceThreshold ?? 1e-6),
    temporallyVarying: range(timeMeans) > Number(normalized.materialDifferenceThreshold ?? 1e-6),
    massByTime: byTime.map((items) => round(items.filter(Number.isFinite).reduce((sum, value) => sum + value, 0))),
    publicSafe: normalized.sourceMetadata?.publicSafe !== false,
    hiddenTruthIncluded: normalized.sourceMetadata?.hiddenTruthIncluded === true,
    syntheticTeachingModel: normalized.sourceMetadata?.synthetic !== false,
    calibratedOceanForecast: normalized.sourceMetadata?.calibratedOceanForecast === true,
    calibratedBiogeochemicalForecast: normalized.sourceMetadata?.calibratedBiogeochemicalForecast === true,
    boundaryFlags: {
      rendererOwnsScalarTruth: false,
      displayLayerChangesScalarTruth: false,
      changesOfficialScoring: false,
      ownsObservationNoise: false,
      ownsVehiclePhysics: false,
      ...(normalized.boundaryFlags ?? {})
    }
  };
  return diagnostics;
}

export function validateScalarFieldDiagnostics(diagnostics = {}) {
  const errors = [];
  const warnings = [];
  if (diagnostics?.type !== 'anchor.scalar-processes.diagnostics') errors.push('Scalar diagnostics have an unexpected type.');
  if (!Number.isFinite(Number(diagnostics?.scalarStatistics?.mean))) errors.push('Scalar diagnostics require finite scalar statistics.');
  if (diagnostics?.hiddenTruthIncluded === true && diagnostics?.publicSafe === true) errors.push('Public-safe scalar diagnostics must not include hidden truth.');
  if (diagnostics?.syntheticTeachingModel === true && diagnostics?.calibratedOceanForecast === true) errors.push('Synthetic scalar diagnostics must not claim calibrated ocean forecast status.');
  if (diagnostics?.boundaryFlags?.rendererOwnsScalarTruth === true) errors.push('Renderer must not own scalar truth.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function scalarFieldStats(field = []) {
  const values = [];
  walkNested(field, (value) => values.push(Number(value)));
  return stats(values);
}

export function scalarFieldMass(field = []) {
  const values = [];
  walkNested(field, (value) => values.push(Number(value)));
  return round(values.filter(Number.isFinite).reduce((sum, value) => sum + value, 0));
}

export function scalarFieldDigest(value = {}) {
  return `fnv1a32:${fnv(stable(value))}`;
}

export function noCalibratedScalarClaims(value = {}) {
  const text = stable(value);
  return !/calibratedOceanForecast":true|calibratedBiogeochemicalForecast":true|usesRealHycom":true|usesRealMarineCopernicus":true/i.test(text);
}

export function validateScalarClaimBoundary(value = {}) {
  const metadata = normalizeScalarSourceMetadata(value.sourceMetadata ?? value.metadata ?? value);
  const metadataValidation = validateScalarSourceMetadata(metadata);
  const diagnostics = value.type === 'anchor.scalar-processes.diagnostics' ? value : computeScalarFieldDiagnostics(value);
  const diagnosticValidation = validateScalarFieldDiagnostics(diagnostics);
  const errors = [...metadataValidation.errors, ...diagnosticValidation.errors];
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : 'PASS', errors, warnings: [...metadataValidation.warnings, ...diagnosticValidation.warnings] };
}

function normalizeFieldInput(field = {}) {
  if (Array.isArray(field)) {
    const rank = arrayRank(field);
    const values = rank >= 4 ? field : rank === 3 ? [field] : rank === 2 ? [[field]] : [];
    return { values, shape: cubeShape(values), sourceMetadata: normalizeScalarSourceMetadata({}), boundaryFlags: {} };
  }
  const values = field.scalarValue ?? field.value ?? field.values ?? field.fields?.value?.values ?? field.fields?.scalarValue?.values ?? [];
  const rank = arrayRank(values);
  const cube = rank >= 4 ? values : rank === 3 ? [values] : rank === 2 ? [[values]] : [];
  return { ...field, values: cube, shape: cubeShape(cube), sourceMetadata: normalizeScalarSourceMetadata(field.sourceMetadata ?? field.provenance ?? {}) };
}

function cubeShape(values = []) {
  return { time: values.length, depth: values[0]?.length ?? 0, height: values[0]?.[0]?.length ?? 0, width: values[0]?.[0]?.[0]?.length ?? 0 };
}

function stats(values = []) {
  const finite = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return { count: values.length, finiteCount: 0, invalidCount: values.length, min: null, mean: null, max: null, rms: null, p50: null, p95: null };
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  const rms = Math.sqrt(finite.reduce((sum, value) => sum + value * value, 0) / finite.length);
  return {
    count: values.length,
    finiteCount: finite.length,
    invalidCount: values.length - finite.length,
    min: round(finite[0]),
    mean: round(mean),
    max: round(finite.at(-1)),
    rms: round(rms),
    p50: round(finite[Math.min(finite.length - 1, Math.floor(finite.length * 0.5))]),
    p95: round(finite[Math.min(finite.length - 1, Math.floor(finite.length * 0.95))])
  };
}

function range(values = []) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(Math.max(...finite) - Math.min(...finite)) : 0;
}

function walkNested(value, visitor) {
  if (Array.isArray(value)) {
    for (const entry of value) walkNested(entry, visitor);
    return;
  }
  visitor(value);
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

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function fnv(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
