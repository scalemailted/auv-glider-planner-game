export const PACKAGE_VERSION = 'anchor-environment-env-pkg-r1';

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/environment',
  owns: [
    'canonical environment manifests',
    'environment artifact composition',
    'environment identity and digests',
    'field registry and epistemic role metadata',
    'cross-artifact validation',
    'provenance aggregation',
    'unified physical-coordinate sampling'
  ],
  dependsOn: ['@anchor/contracts', '@anchor/bathymetry', '@anchor/currents', '@anchor/scalar-processes'],
  doesNotOwn: [
    'scientific generation equations',
    'truth/forecast visibility policy',
    'observation noise',
    'belief updates',
    'mission execution',
    'scoring',
    'renderer state',
    'player UI'
  ]
});

export function packageBoundarySummary() {
  return {
    package: PACKAGE_BOUNDARY.package,
    version: PACKAGE_VERSION,
    owns: PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: PACKAGE_BOUNDARY.doesNotOwn.slice()
  };
}

export {
  ENVIRONMENT_STATUS,
  stableDigest,
  stable,
  createEnvironmentValidationReport,
  normalizeClaimBoundary,
  normalizeOperationalDomain,
  domainFromAxes,
  axisExtent
} from './EnvironmentUtil.js';

export {
  ENVIRONMENT_GENERATOR_BACKEND_CONTRACT_VERSION,
  ENVIRONMENT_GENERATOR_BACKENDS,
  normalizeEnvironmentGeneratorBackend,
  validateEnvironmentGeneratorBackend
} from './EnvironmentGeneratorBackendContract.js';

export {
  ENVIRONMENT_MANIFEST_VERSION,
  SYNTHETIC_ENVIRONMENT_MANIFEST_VERSION,
  createEnvironmentManifest,
  normalizeEnvironmentManifest,
  validateEnvironmentManifest,
  environmentManifestSummary,
  environmentManifestDigest,
  createSyntheticEnvironmentManifest,
  normalizeSyntheticEnvironmentManifest,
  validateSyntheticEnvironmentManifest,
  syntheticEnvironmentManifestDigest
} from './EnvironmentManifest.js';

export {
  ENVIRONMENT_FIELD_REGISTRY_VERSION,
  createEnvironmentFieldRegistry,
  normalizeEnvironmentFieldRegistry,
  validateEnvironmentFieldRegistry,
  environmentFieldRegistrySummary,
  environmentFieldRegistryDigest,
  fieldRoleSummary
} from './EnvironmentFieldRegistry.js';

export {
  ENVIRONMENT_ARTIFACT_VERSION,
  createEnvironmentArtifact,
  normalizeEnvironmentArtifact,
  validateEnvironmentArtifactContract,
  environmentArtifactSummary,
  environmentArtifactDigest,
  environmentComponentDigests,
  environmentTimeCoverage,
  environmentDepthCoverage,
  getEnvironmentArtifactRuntimeCounters,
  resetEnvironmentArtifactRuntimeCounters
} from './EnvironmentArtifact.js';

export {
  ENVIRONMENT_VALIDATION_VERSION,
  validateEnvironmentArtifact,
  environmentValidationSummary
} from './EnvironmentValidation.js';

export {
  ENVIRONMENT_SAMPLER_VERSION,
  createEnvironmentSampler,
  sampleEnvironment,
  sampleEnvironmentBathymetry,
  sampleEnvironmentCurrent,
  sampleEnvironmentScalar,
  getEnvironmentSamplerRuntimeCounters,
  resetEnvironmentSamplerRuntimeCounters
} from './EnvironmentSampler.js';
