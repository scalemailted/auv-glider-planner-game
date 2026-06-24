import { createBathymetryConditionedCurrentField } from '../../../packages/currents/src/index.js';
import { normalizeCurrentFieldArtifact } from './CurrentFieldArtifactAdapter.js';
import { normalizeSyntheticEnvironmentManifest, validateSyntheticEnvironmentManifest } from './SyntheticEnvironmentManifest.js';
import { validateEnvironmentGeneratorBackend } from './EnvironmentGeneratorBackendContract.js';

export const GENERATED_ENVIRONMENT_ARTIFACT_VERSION = 'generated-environment-artifact-flow-r2a-5-1';

export function createGeneratedEnvironmentArtifact(manifestOrOptions = {}, options = {}) {
  const manifest = normalizeSyntheticEnvironmentManifest({ ...(manifestOrOptions ?? {}), ...(options.manifestPatch ?? {}) });
  const backendValidation = validateEnvironmentGeneratorBackend(manifest.backendId);
  if (!backendValidation.valid) {
    const error = new Error(backendValidation.errors.join('; '));
    error.name = 'EnvironmentGeneratorBackendError';
    error.validation = backendValidation;
    throw error;
  }
  const level = options.level ?? manifestOrOptions.level ?? {};
  const builtCurrentField4D = createBathymetryConditionedCurrentField({
    ...(options.currentOptions ?? {}),
    level,
    grid: manifest.grid,
    waterColumnConfig: manifest.waterColumnConfig,
    depthAxisMeters: manifest.depthAxisMeters,
    timeAxisSeconds: manifest.timeAxisSeconds,
    seed: manifest.seed,
    temporalBoundaryMode: manifest.temporalBoundaryMode,
    temporalPeriodSeconds: manifest.temporalPeriodSeconds,
    validTimeStartSeconds: manifest.validTimeStartSeconds,
    validTimeEndSeconds: manifest.validTimeEndSeconds,
    environmentGeneratorBackendId: manifest.backendId,
    environmentGeneratorBackendVersion: GENERATED_ENVIRONMENT_ARTIFACT_VERSION,
    environmentManifestDigest: manifest.digest,
    id: options.id ?? manifestOrOptions.id ?? `environment-current-${manifest.digest?.slice(-8) ?? 'field'}`
  });
  const currentArtifactResult = normalizeCurrentFieldArtifact(builtCurrentField4D);
  const currentField4D = currentArtifactResult.artifact;
  const artifact = {
    type: 'anchor.environment.generated-artifact',
    version: GENERATED_ENVIRONMENT_ARTIFACT_VERSION,
    manifest,
    manifestDigest: manifest.digest,
    backend: manifest.backend,
    currentField4D,
    currentFieldSummary: currentArtifactResult.summary,
    publicSafety: {
      hiddenTruthIncluded: false,
      synthetic: true,
      calibratedForecast: false,
      usesRealHycom: false,
      usesRealMarineCopernicus: false,
      warning: manifest.source?.warning ?? 'Synthetic educational environment. Not calibrated ocean forecast data.'
    }
  };
  artifact.digest = generatedEnvironmentArtifactDigest(artifact);
  currentField4D.sourceMetadata.environmentArtifactDigest = artifact.digest;
  return artifact;
}

export function validateGeneratedEnvironmentArtifact(artifact = {}) {
  const errors = [];
  const warnings = [];
  const manifestValidation = validateSyntheticEnvironmentManifest(artifact.manifest ?? artifact);
  errors.push(...manifestValidation.errors);
  warnings.push(...manifestValidation.warnings);
  if (artifact.currentFieldSummary?.calibratedForecast || artifact.currentFieldSummary?.usesRealHycom || artifact.currentFieldSummary?.usesRealMarineCopernicus) errors.push('Generated synthetic environment artifact cannot claim calibrated operational current data.');
  if (artifact.currentFieldSummary?.temporalBoundaryMode === 'bounded' && Number(artifact.currentFieldSummary.sourceTimeSeconds?.at(-1) ?? 0) < Number(artifact.currentFieldSummary.validTimeEndSeconds ?? 0)) warnings.push('Generated current field axis does not cover the declared valid end time.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, artifact };
}

export function generatedEnvironmentArtifactSummary(artifact = {}) {
  return {
    type: 'anchor.debug.environment-generator',
    version: GENERATED_ENVIRONMENT_ARTIFACT_VERSION,
    backendId: artifact.backend?.id ?? artifact.manifest?.backendId ?? null,
    backendImplemented: artifact.backend?.implemented === true,
    manifestDigest: artifact.manifestDigest ?? artifact.manifest?.digest ?? null,
    artifactDigest: artifact.digest ?? null,
    currentFieldDigest: artifact.currentField4D?.digest ?? artifact.currentFieldSummary?.digest ?? null,
    temporalBoundaryMode: artifact.currentField4D?.temporalBoundaryMode ?? artifact.currentFieldSummary?.temporalBoundaryMode ?? null,
    temporalPeriodSeconds: artifact.currentField4D?.temporalPeriodSeconds ?? artifact.currentFieldSummary?.temporalPeriodSeconds ?? null,
    validTimeStartSeconds: artifact.currentField4D?.validTimeStartSeconds ?? artifact.currentFieldSummary?.validTimeStartSeconds ?? null,
    validTimeEndSeconds: artifact.currentField4D?.validTimeEndSeconds ?? artifact.currentFieldSummary?.validTimeEndSeconds ?? null,
    sourceTimeSeconds: artifact.currentField4D?.timeAxisSeconds ?? artifact.currentFieldSummary?.sourceTimeSeconds ?? [],
    synthetic: artifact.publicSafety?.synthetic === true,
    calibratedForecast: artifact.publicSafety?.calibratedForecast === true,
    usesRealHycom: artifact.publicSafety?.usesRealHycom === true,
    usesRealMarineCopernicus: artifact.publicSafety?.usesRealMarineCopernicus === true,
    warning: artifact.publicSafety?.warning ?? null
  };
}

export function generatedEnvironmentArtifactDigest(artifact = {}) {
  return `fnv1a32:${fnv(stable({ manifestDigest: artifact.manifestDigest, currentFieldDigest: artifact.currentField4D?.digest ?? artifact.currentFieldSummary?.digest, backendId: artifact.backend?.id }))}`;
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