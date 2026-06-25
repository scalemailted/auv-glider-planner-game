import { normalizeEnvironmentGeneratorBackend, ENVIRONMENT_GENERATOR_BACKEND_CONTRACT_VERSION } from './EnvironmentGeneratorBackendContract.js';
import { domainFromAxes, normalizeClaimBoundary, normalizeOperationalDomain, stableDigest } from './EnvironmentUtil.js';

export const ENVIRONMENT_MANIFEST_VERSION = 'environment-manifest-env-pkg-r1';
export const SYNTHETIC_ENVIRONMENT_MANIFEST_VERSION = 'synthetic-environment-manifest-flow-r2a-5-1';

export function createEnvironmentManifest(options = {}) {
  const backend = normalizeEnvironmentGeneratorBackend(options.generatorBackend ?? options.backendId ?? options.backend ?? 'cpuBathymetryConditionedSyntheticV3');
  const operationalDomain = normalizeOperationalDomain(
    options.operationalDomain,
    domainFromAxes({
      eastAxisMeters: options.eastAxisMeters,
      northAxisMeters: options.northAxisMeters,
      depthAxisMeters: options.depthAxisMeters,
      timeAxisSeconds: options.timeAxisSeconds,
      coordinateFrame: options.coordinateFrame
    })
  );
  const manifest = {
    type: 'anchor.environment.manifest',
    version: options.version ?? ENVIRONMENT_MANIFEST_VERSION,
    id: String(options.id ?? options.manifestId ?? 'environment-manifest'),
    seed: options.seed == null ? null : String(options.seed),
    generatorId: options.generatorId ?? 'app-owned-environment-composer',
    generatorVersion: options.generatorVersion ?? ENVIRONMENT_MANIFEST_VERSION,
    generatorBackend: backend,
    backendContractVersion: ENVIRONMENT_GENERATOR_BACKEND_CONTRACT_VERSION,
    coordinateFrame: options.coordinateFrame ?? operationalDomain.coordinateFrame ?? 'localEastNorthDown',
    operationalDomain,
    bathymetryManifest: options.bathymetryManifest ?? null,
    currentManifests: normalizeMapOrArray(options.currentManifests),
    scalarFieldManifests: normalizeMapOrArray(options.scalarFieldManifests),
    fieldRoles: normalizeFieldRoles(options.fieldRoles),
    resolutionProfile: options.resolutionProfile ?? null,
    sourceMetadata: normalizeSourceMetadata(options.sourceMetadata),
    provenance: normalizeProvenance(options.provenance),
    claimBoundary: normalizeClaimBoundary(options.claimBoundary ?? options.sourceMetadata?.claimBoundary ?? options.source ?? {})
  };
  return { ...manifest, manifestDigest: options.manifestDigest ?? environmentManifestDigest(manifest) };
}

export function normalizeEnvironmentManifest(value = {}) {
  if (value?.type === 'anchor.environment.manifest' && value.manifestDigest) return value;
  return createEnvironmentManifest({
    ...value,
    id: value.id ?? value.manifestId ?? value.digest ?? value.levelId ?? 'environment-manifest',
    generatorId: value.generatorId ?? value.backendId ?? value.backend?.id ?? value.type,
    generatorVersion: value.generatorVersion ?? value.version,
    generatorBackend: value.generatorBackend ?? value.backend ?? value.backendId,
    seed: value.seed,
    coordinateFrame: value.coordinateFrame,
    operationalDomain: value.operationalDomain ?? value.domain,
    resolutionProfile: value.resolutionProfile,
    sourceMetadata: value.sourceMetadata ?? value.source,
    provenance: value.provenance,
    claimBoundary: value.claimBoundary ?? value.source
  });
}

export function validateEnvironmentManifest(value = {}) {
  const manifest = normalizeEnvironmentManifest(value);
  const errors = [];
  const warnings = [];
  if (manifest.type !== 'anchor.environment.manifest') errors.push('Environment manifest type must be anchor.environment.manifest.');
  if (manifest.version !== ENVIRONMENT_MANIFEST_VERSION) warnings.push(`Environment manifest version is ${manifest.version}; expected ${ENVIRONMENT_MANIFEST_VERSION}.`);
  if (!manifest.id) errors.push('Environment manifest id is required.');
  if (!manifest.coordinateFrame) errors.push('Environment coordinateFrame is required.');
  const horizontal = manifest.operationalDomain?.horizontal ?? {};
  if (!(Number(horizontal.widthMeters) > 0) || !(Number(horizontal.heightMeters) > 0)) errors.push('Operational domain horizontal extents must be positive.');
  if (manifest.claimBoundary?.synthetic === true && manifest.claimBoundary?.calibratedOceanProduct === true) errors.push('Synthetic environment manifests cannot claim calibrated ocean products.');
  if (manifest.claimBoundary?.certifiedForNavigation === true) errors.push('Environment manifest cannot claim certified navigation product status.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, manifest };
}

export function environmentManifestSummary(value = {}) {
  const manifest = normalizeEnvironmentManifest(value);
  return {
    type: 'anchor.environment.manifest-summary',
    version: ENVIRONMENT_MANIFEST_VERSION,
    id: manifest.id,
    seed: manifest.seed,
    generatorId: manifest.generatorId,
    generatorBackendId: manifest.generatorBackend?.id ?? null,
    coordinateFrame: manifest.coordinateFrame,
    operationalDomainId: manifest.operationalDomain?.id ?? null,
    bathymetryManifestDigest: digestOf(manifest.bathymetryManifest),
    currentManifestCount: manifest.currentManifests.length,
    scalarManifestCount: manifest.scalarFieldManifests.length,
    fieldRoleCount: Object.keys(manifest.fieldRoles ?? {}).length,
    synthetic: manifest.claimBoundary?.synthetic === true,
    calibratedOceanProduct: manifest.claimBoundary?.calibratedOceanProduct === true,
    operationalForecast: manifest.claimBoundary?.operationalForecast === true,
    certifiedForNavigation: manifest.claimBoundary?.certifiedForNavigation === true,
    manifestDigest: manifest.manifestDigest ?? environmentManifestDigest(manifest)
  };
}

export function environmentManifestDigest(value = {}) {
  const manifest = { ...value };
  delete manifest.manifestDigest;
  delete manifest.digest;
  return stableDigest(manifest);
}

export function createSyntheticEnvironmentManifest(options = {}) {
  const backend = normalizeEnvironmentGeneratorBackend(options.backendId ?? options.backend ?? 'cpuBathymetryConditionedSyntheticV3');
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
      currentField4D: { model: backend.id === 'cpuBathymetryConditionedSyntheticV3' ? 'bathymetryConditionedDepthStructuredSyntheticV3' : 'bathymetryConditionedStreamfunctionSyntheticV2', source: 'browserGenerator' },
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
  const implementedCurrentBackends = ['cpuBathymetryConditionedSyntheticV2', 'cpuBathymetryConditionedSyntheticV3'];
  if (!implementedCurrentBackends.includes(manifest.backendId)) errors.push(`Only cpuBathymetryConditionedSyntheticV2 and cpuBathymetryConditionedSyntheticV3 are implemented; got ${manifest.backendId}.`);
  if (manifest.source?.calibratedForecast || manifest.source?.usesRealHycom || manifest.source?.usesRealMarineCopernicus) errors.push('Synthetic environment manifest cannot claim calibrated HYCOM/Copernicus data.');
  if (!Array.isArray(manifest.timeAxisSeconds) || manifest.timeAxisSeconds.length < 2) errors.push('Manifest must include at least two time samples.');
  if (Number(manifest.timeAxisSeconds.at(-1)) < Number(manifest.validTimeEndSeconds)) warnings.push('Manifest source time axis is shorter than validTimeEndSeconds; generator should extend bounded fields.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, manifest };
}

export function syntheticEnvironmentManifestDigest(manifest = {}) {
  const copy = { ...manifest };
  delete copy.digest;
  return stableDigest(copy);
}

function normalizeFieldRoles(value = {}) {
  return {
    bathymetry: value.bathymetry ?? value.bathymetryRole ?? null,
    currentFields: { ...(value.currentFields ?? {}) },
    scalarFields: { ...(value.scalarFields ?? {}) },
    ...(value.extraRoles ?? {})
  };
}

function normalizeSourceMetadata(value = {}) {
  return {
    sourceTier: value.sourceTier ?? (value.synthetic === false ? 'imported' : 'scientificallyConstrainedSynthetic'),
    sourceId: value.sourceId ?? value.id ?? null,
    synthetic: value.synthetic !== false,
    imported: value.imported === true,
    calibratedOceanProduct: value.calibratedOceanProduct === true,
    operationalForecast: value.operationalForecast === true,
    certifiedForNavigation: value.certifiedForNavigation === true,
    attribution: value.attribution ?? null
  };
}

function normalizeProvenance(value = {}) {
  return {
    generatedBy: value.generatedBy ?? 'app-owned-environment-composer',
    generatorVersion: value.generatorVersion ?? ENVIRONMENT_MANIFEST_VERSION,
    seed: value.seed == null ? null : String(value.seed),
    componentPackageVersions: { ...(value.componentPackageVersions ?? {}) },
    notes: Array.isArray(value.notes) ? [...value.notes] : []
  };
}

function normalizeMapOrArray(value = null) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).map(([id, item]) => ({ id, ...(item && typeof item === 'object' ? item : { digest: item }) }));
}

function digestOf(value = null) {
  if (!value) return null;
  return value.manifestDigest ?? value.artifactDigest ?? value.digest ?? null;
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

function round(value, digits = 6) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
}
