import { normalizeEnvironmentGeneratorBackend, ENVIRONMENT_GENERATOR_BACKEND_CONTRACT_VERSION } from './EnvironmentGeneratorBackendContract.js';

export const SYNTHETIC_ENVIRONMENT_MANIFEST_VERSION = 'synthetic-environment-manifest-flow-r2a-5-1';

export function createSyntheticEnvironmentManifest(options = {}) {
  const backend = normalizeEnvironmentGeneratorBackend(options.backendId ?? options.backend ?? 'cpuBathymetryConditionedSyntheticV2');
  const grid = normalizeGrid(options.grid ?? options.level?.world?.grid);
  const temporalBoundaryMode = normalizeTemporalBoundaryMode(options.temporalBoundaryMode ?? 'bounded');
  const validTimeStartSeconds = finite(options.validTimeStartSeconds, 0);
  const duration = Math.max(validTimeStartSeconds + 1e-6, finite(options.validTimeEndSeconds ?? options.missionDurationSeconds ?? options.level?.world?.operationalDomain?.time?.durationSeconds ?? options.level?.operationalDomain?.time?.durationSeconds ?? options.level?.world?.time?.duration ?? 2400, 2400));
  const temporalPeriodSeconds = temporalBoundaryMode === 'periodic' ? Math.max(1e-6, finite(options.temporalPeriodSeconds, duration - validTimeStartSeconds)) : null;
  const timeAxisSeconds = normalizeTimeAxis(options.timeAxisSeconds, validTimeStartSeconds, duration, temporalBoundaryMode);
  const manifest = {
    type: 'anchor.environment.synthetic-manifest',
    version: SYNTHETIC_ENVIRONMENT_MANIFEST_VERSION,
    backendContractVersion: ENVIRONMENT_GENERATOR_BACKEND_CONTRACT_VERSION,
    backendId: backend.id,
    backend,
    seed: String(options.seed ?? options.level?.meta?.derivedSeeds?.currents ?? options.level?.meta?.seed ?? options.level?.seed ?? 'environment-seed'),
    grid,
    waterColumnConfig: options.waterColumnConfig ?? options.level?.world?.waterColumnConfig ?? null,
    depthAxisMeters: normalizeNumberArray(options.depthAxisMeters, [0, 10, 35, 75, 150]),
    timeAxisSeconds,
    temporalBoundaryMode,
    temporalPeriodSeconds,
    validTimeStartSeconds,
    validTimeEndSeconds: duration,
    layers: {
      bathymetry: { model: 'deterministicSyntheticShelfBathymetry', source: 'browserGenerator' },
      wetMask: { model: 'bathymetryAndTerrainMask', source: 'browserGenerator' },
      currentField4D: { model: 'bathymetryConditionedStreamfunctionSyntheticV2', source: 'browserGenerator' },
      scalarScienceField: { model: 'existingGeneratedWaterColumnScience', source: 'scenarioOrFallback' }
    },
    source: {
      synthetic: true,
      calibratedForecast: false,
      usesRealHycom: false,
      usesRealMarineCopernicus: false,
      warning: 'Scientifically constrained synthetic environment. Not a calibrated ocean forecast. Not real HYCOM or Marine Copernicus data.'
    }
  };
  manifest.digest = syntheticEnvironmentManifestDigest(manifest);
  return manifest;
}

export function normalizeSyntheticEnvironmentManifest(input = {}) {
  if (input?.type === 'anchor.environment.synthetic-manifest' && input.digest) return input;
  return createSyntheticEnvironmentManifest(input);
}

export function validateSyntheticEnvironmentManifest(input = {}) {
  const manifest = normalizeSyntheticEnvironmentManifest(input);
  const errors = [];
  const warnings = [];
  if (manifest.backendId !== 'cpuBathymetryConditionedSyntheticV2') errors.push(`Only cpuBathymetryConditionedSyntheticV2 is implemented; got ${manifest.backendId}.`);
  if (manifest.source?.calibratedForecast || manifest.source?.usesRealHycom || manifest.source?.usesRealMarineCopernicus) errors.push('Synthetic environment manifest cannot claim calibrated HYCOM/Copernicus data.');
  if (!Array.isArray(manifest.timeAxisSeconds) || manifest.timeAxisSeconds.length < 2) errors.push('Manifest must include at least two time samples.');
  if (Number(manifest.timeAxisSeconds.at(-1)) < Number(manifest.validTimeEndSeconds)) warnings.push('Manifest source time axis is shorter than validTimeEndSeconds; generator should extend bounded fields.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, manifest };
}

export function syntheticEnvironmentManifestDigest(manifest = {}) {
  const copy = { ...manifest };
  delete copy.digest;
  return `fnv1a32:${fnv(stable(copy))}`;
}

function normalizeGrid(grid = {}) {
  return { width: Math.max(1, Math.round(finite(grid?.width, 8))), height: Math.max(1, Math.round(finite(grid?.height, 8))), cellSizeMeters: Math.max(1, finite(grid?.cellSizeMeters, 100)) };
}

function normalizeNumberArray(value, fallback) {
  const source = Array.isArray(value) && value.length ? value : fallback;
  return [...new Set(source.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
}

function normalizeTimeAxis(explicit, start, end, temporalBoundaryMode) {
  const generated = missionAxis(start, end);
  if (!Array.isArray(explicit) || !explicit.length) return generated;
  const base = normalizeNumberArray(explicit, generated);
  if (temporalBoundaryMode === 'periodic') return base;
  if (Number(base.at(-1) ?? start) + 1e-6 < Number(end)) return normalizeNumberArray([...base, ...generated], generated);
  return base;
}

function missionAxis(start, end) {
  const span = Math.max(1, Number(end) - Number(start));
  return Array.from({ length: 7 }, (_value, index) => round(Number(start) + span * index / 6, 6));
}

function normalizeTemporalBoundaryMode(value) {
  return String(value ?? '').trim() === 'periodic' ? 'periodic' : 'bounded';
}

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function finiteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value, digits = 6) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
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