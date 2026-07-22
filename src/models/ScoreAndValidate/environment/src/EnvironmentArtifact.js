const bathymetryIndex = require('../../bathymetry/src/index.js')
const currentsIndex = require('../../currents/src/index.js')
const scalarProcessesIndex = require('../../scalar-processes/src/index.js')
const EnvironmentFieldRegistry = require('./EnvironmentFieldRegistry.js')
const EnvironmentManifest = require('./EnvironmentManifest.js')
const EnvironmentValidation = require('./EnvironmentValidation.js')
const EnvironmentUtil = require('./EnvironmentUtil.js')
const ENVIRONMENT_ARTIFACT_VERSION = 'environment-artifact-env-pkg-r1';

const environmentArtifactRuntimeCounters = {
  artifactBuildCount: 0,
  validationCount: 0
};

 function resetEnvironmentArtifactRuntimeCounters() {
  environmentArtifactRuntimeCounters.artifactBuildCount = 0;
  environmentArtifactRuntimeCounters.validationCount = 0;
}

 function getEnvironmentArtifactRuntimeCounters() {
  return { ...environmentArtifactRuntimeCounters };
}

 function createEnvironmentArtifact(options = {}) {
  environmentArtifactRuntimeCounters.artifactBuildCount += 1;
  return normalizeEnvironmentArtifact(options);
}

 function normalizeEnvironmentArtifact(value = {}) {
  if (value?.type === 'anchor.environment.artifact' && value.__anchorEnvironmentArtifactNormalized === true) return value;
  const bathymetry = value.bathymetry ? bathymetryIndex.normalizeBathymetryArtifact(value.bathymetry) : null;
  const currentFields = EnvironmentUtil.arrayify(value.currentFields ?? value.currentField4D ?? value.currentField).map((field) => currentsIndex.normalizeCurrentField4D(field));
  const scalarFields = EnvironmentUtil.arrayify(value.scalarFields ?? value.scalarField).map((field) => scalarProcessesIndex.normalizeScalarField4D(field));
  const coordinateFrame = value.coordinateFrame ?? bathymetry?.coordinateFrame ?? currentFields[0]?.coordinateFrame ?? scalarFields[0]?.coordinateFrame ?? 'localEastNorthDown';
  const operationalDomain = EnvironmentUtil.normalizeOperationalDomain(
    value.operationalDomain,
    domainFromComponents({ bathymetry, currentFields, scalarFields, coordinateFrame })
  );
  const componentDigests = value.componentDigests ?? environmentComponentDigests({ bathymetry, currentFields, scalarFields });
  const manifest = normalizeManifestForArtifact(value, { bathymetry, currentFields, scalarFields, coordinateFrame, operationalDomain, componentDigests });
  const fieldRegistry = value.fieldRegistry?.type === 'anchor.environment.field-registry'
    ? EnvironmentFieldRegistry.normalizeEnvironmentFieldRegistry(value.fieldRegistry)
    : EnvironmentFieldRegistry.createEnvironmentFieldRegistry({
      entries: value.fieldRegistry?.entries ?? value.registryEntries,
      bathymetry,
      currentFields,
      scalarFields,
      fieldRoles: value.fieldRoles ?? manifest.fieldRoles
    });
  const artifactBase = {
    type: 'anchor.environment.artifact',
    version: value.version ?? ENVIRONMENT_ARTIFACT_VERSION,
    id: String(value.id ?? value.artifactId ?? manifest.id ?? 'environment-artifact'),
    coordinateFrame,
    operationalDomain,
    bathymetry,
    currentFields,
    scalarFields,
    fieldRegistry,
    componentDigests,
    sourceMetadata: aggregateSourceMetadata(value.sourceMetadata, { bathymetry, currentFields, scalarFields }),
    provenance: aggregateProvenance(value.provenance, { bathymetry, currentFields, scalarFields }),
    manifest,
    manifestDigest: value.manifestDigest ?? manifest.manifestDigest ?? EnvironmentManifest.environmentManifestDigest(manifest),
    boundaryFlags: normalizeEnvironmentBoundaryFlags(value.boundaryFlags ?? {}, manifest.claimBoundary),
    claimBoundary: EnvironmentUtil.normalizeClaimBoundary(value.claimBoundary ?? manifest.claimBoundary)
  };
  environmentArtifactRuntimeCounters.validationCount += 1;
  const validationReport = EnvironmentValidation.validateEnvironmentArtifact(artifactBase);
  const artifact = {
    ...artifactBase,
    validationReport,
    artifactDigest: value.artifactDigest ?? environmentArtifactDigest(artifactBase)
  };
  markNormalized(artifact);
  return artifact;
}

 function validateEnvironmentArtifactContract(value = {}) {
  return EnvironmentValidation.validateEnvironmentArtifact(normalizeEnvironmentArtifact(value));
}

 function environmentArtifactSummary(value = {}) {
  const artifact = value?.type === 'anchor.environment.artifact' ? value : normalizeEnvironmentArtifact(value);
  return {
    type: 'anchor.environment.artifact-summary',
    version: ENVIRONMENT_ARTIFACT_VERSION,
    id: artifact.id,
    coordinateFrame: artifact.coordinateFrame,
    operationalDomainId: artifact.operationalDomain?.id ?? null,
    manifestDigest: artifact.manifestDigest,
    artifactDigest: artifact.artifactDigest ?? environmentArtifactDigest(artifact),
    componentDigests: environmentComponentDigests(artifact),
    fieldRegistry: EnvironmentFieldRegistry.environmentFieldRegistrySummary(artifact.fieldRegistry),
    fieldRoleSummary: EnvironmentFieldRegistry.fieldRoleSummary(artifact.fieldRegistry),
    bathymetry: artifact.bathymetry ? bathymetryIndex.bathymetryArtifactSummary(artifact.bathymetry) : null,
    currentFields: artifact.currentFields.map((field) => currentsIndex.currentFieldSummary(field)),
    scalarFields: artifact.scalarFields.map((field) => scalarProcessesIndex.scalarField4DSummary(field)),
    timeCoverage: environmentTimeCoverage(artifact),
    depthCoverage: environmentDepthCoverage(artifact),
    validationSummary: EnvironmentValidation.environmentValidationSummary(artifact.validationReport),
    synthetic: artifact.claimBoundary?.synthetic === true,
    calibratedOceanProduct: artifact.claimBoundary?.calibratedOceanProduct === true,
    operationalForecast: artifact.claimBoundary?.operationalForecast === true,
    certifiedForNavigation: artifact.claimBoundary?.certifiedForNavigation === true,
    boundaryFlags: compactBoundaryFlags(artifact.boundaryFlags)
  };
}

 function environmentArtifactDigest(value = {}) {
  const artifact = value?.type === 'anchor.environment.artifact' ? value : normalizeEnvironmentArtifact(value);
  return EnvironmentUtil.stableDigest({
    version: artifact.version ?? ENVIRONMENT_ARTIFACT_VERSION,
    id: artifact.id,
    coordinateFrame: artifact.coordinateFrame,
    operationalDomain: artifact.operationalDomain,
    manifestDigest: artifact.manifestDigest,
    componentDigests: environmentComponentDigests(artifact),
    fieldRegistryDigest: artifact.fieldRegistry?.registryDigest ?? null,
    claimBoundary: artifact.claimBoundary ?? artifact.boundaryFlags?.claimBoundary ?? null
  });
}

 function environmentComponentDigests(environmentArtifact = {}) {
  const bathymetry = environmentArtifact.bathymetry ?? null;
  const currentFields = environmentArtifact.currentFields ?? [];
  const scalarFields = environmentArtifact.scalarFields ?? [];
  return {
    bathymetryArtifactDigest: bathymetry ? EnvironmentUtil.fieldDigestOf(bathymetry) : null,
    bathymetryManifestDigest: bathymetry?.manifestDigest ?? bathymetry?.manifest?.manifestDigest ?? null,
    currentFieldDigests: Object.fromEntries(currentFields.map((field) => [field.id, EnvironmentUtil.fieldDigestOf(field)])),
    scalarFieldDigests: Object.fromEntries(scalarFields.map((field) => [field.id, EnvironmentUtil.fieldDigestOf(field)])),
    currentFieldDigestList: currentFields.map(fieldDigestOf),
    scalarFieldDigestList: scalarFields.map(fieldDigestOf)
  };
}

 function environmentTimeCoverage(environmentArtifact = {}) {
  const ranges = [...(environmentArtifact.currentFields ?? []), ...(environmentArtifact.scalarFields ?? [])]
    .map((field) => range(field.timeAxisSeconds))
    .filter(Boolean);
  if (!ranges.length) return { static: true, startSeconds: 0, endSeconds: 0, fieldCount: 0 };
  return {
    static: ranges.every((item) => item.min === item.max),
    startSeconds: Math.min(...ranges.map((item) => item.min)),
    endSeconds: Math.max(...ranges.map((item) => item.max)),
    fieldCount: ranges.length,
    ranges
  };
}

 function environmentDepthCoverage(environmentArtifact = {}) {
  const ranges = [...(environmentArtifact.currentFields ?? []), ...(environmentArtifact.scalarFields ?? [])]
    .map((field) => range(field.depthAxisMeters))
    .filter(Boolean);
  if (!ranges.length) return { surfaceOnly: true, minDepthMeters: 0, maxDepthMeters: 0, fieldCount: 0 };
  return {
    surfaceOnly: ranges.every((item) => item.max <= 0),
    minDepthMeters: Math.min(...ranges.map((item) => item.min)),
    maxDepthMeters: Math.max(...ranges.map((item) => item.max)),
    fieldCount: ranges.length,
    ranges
  };
}

function normalizeManifestForArtifact(value, context) {
  if (value.manifest?.type === 'anchor.environment.manifest') return EnvironmentManifest.normalizeEnvironmentManifest(value.manifest);
  const bathymetryManifest = context.bathymetry?.manifest ?? null;
  const currentManifests = Object.fromEntries(context.currentFields.map((field) => [field.id, field.manifest ?? { id: field.id, digest: field.manifestDigest ?? field.digest }]));
  const scalarFieldManifests = Object.fromEntries(context.scalarFields.map((field) => [field.id, field.manifest ?? { id: field.id, digest: field.manifestDigest ?? field.digest }]));
  const manifestSeed = value.seed ?? value.manifest?.seed ?? value.syntheticManifest?.seed ?? value.manifest?.sourceMetadata?.seed ?? null;
  return EnvironmentManifest.createEnvironmentManifest({
    id: value.manifest?.id ?? value.id ?? value.syntheticManifest?.digest ?? 'environment-manifest',
    seed: manifestSeed,
    generatorId: value.generatorId ?? value.syntheticManifest?.backendId ?? value.manifest?.generatorId,
    generatorVersion: value.generatorVersion ?? value.syntheticManifest?.version ?? value.manifest?.generatorVersion,
    generatorBackend: value.generatorBackend ?? value.syntheticManifest?.backend ?? value.syntheticManifest?.backendId ?? value.manifest?.backend,
    coordinateFrame: context.coordinateFrame,
    operationalDomain: context.operationalDomain,
    bathymetryManifest,
    currentManifests,
    scalarFieldManifests,
    fieldRoles: value.fieldRoles ?? value.manifest?.fieldRoles,
    resolutionProfile: value.resolutionProfile ?? value.manifest?.resolutionProfile,
    sourceMetadata: value.sourceMetadata ?? value.syntheticManifest?.source ?? value.manifest?.sourceMetadata,
    provenance: value.provenance,
    claimBoundary: value.claimBoundary ?? value.syntheticManifest?.source ?? value.manifest?.claimBoundary
  });
}

function domainFromComponents({ bathymetry, currentFields, scalarFields, coordinateFrame }) {
  if (bathymetry) {
    return EnvironmentUtil.domainFromAxes({
      eastAxisMeters: bathymetry.eastAxisMeters,
      northAxisMeters: bathymetry.northAxisMeters,
      depthAxisMeters: [0, max2d(bathymetry.bottomDepthMeters)],
      coordinateFrame: bathymetry.coordinateFrame ?? coordinateFrame
    });
  }
  const field = currentFields[0] ?? scalarFields[0] ?? {};
  return EnvironmentUtil.domainFromAxes({
    eastAxisMeters: field.eastAxisMeters ?? field.xAxis,
    northAxisMeters: field.northAxisMeters ?? field.yAxis,
    depthAxisMeters: field.depthAxisMeters,
    timeAxisSeconds: field.timeAxisSeconds,
    coordinateFrame
  });
}

function aggregateSourceMetadata(explicit = {}, { bathymetry, currentFields, scalarFields }) {
  return {
    sourceTier: explicit.sourceTier ?? 'composedEnvironment',
    synthetic: explicit.synthetic !== false,
    imported: explicit.imported === true,
    calibratedOceanProduct: explicit.calibratedOceanProduct === true,
    operationalForecast: explicit.operationalForecast === true,
    certifiedForNavigation: explicit.certifiedForNavigation === true,
    componentSourceIds: [
      bathymetry?.sourceMetadata?.sourceId,
      ...currentFields.map((field) => field.sourceMetadata?.sourceId ?? field.sourceMetadata?.fieldId ?? field.id),
      ...scalarFields.map((field) => field.sourceMetadata?.sourceId ?? field.sourceMetadata?.fieldId ?? field.id)
    ].filter(Boolean),
    warnings: Array.isArray(explicit.warnings) ? [...explicit.warnings] : []
  };
}

function aggregateProvenance(explicit = {}, { bathymetry, currentFields, scalarFields }) {
  return {
    generatedBy: explicit.generatedBy ?? 'app-owned-environment-composer',
    generatorVersion: explicit.generatorVersion ?? ENVIRONMENT_ARTIFACT_VERSION,
    seed: explicit.seed == null ? null : String(explicit.seed),
    componentCount: Number(Boolean(bathymetry)) + currentFields.length + scalarFields.length,
    componentDigests: {
      bathymetry: bathymetry ? EnvironmentUtil.fieldDigestOf(bathymetry) : null,
      currents: currentFields.map(fieldDigestOf),
      scalars: scalarFields.map(fieldDigestOf)
    },
    notes: Array.isArray(explicit.notes) ? [...explicit.notes] : []
  };
}

function normalizeEnvironmentBoundaryFlags(value = {}, claimBoundary = {}) {
  return {
    packageOwnsGenerationEquations: false,
    packageOwnsVisibilityPolicy: false,
    packageOwnsObservationNoise: false,
    packageOwnsSimulation: false,
    packageOwnsScoring: false,
    rendererOwnsEnvironmentTruth: false,
    packageUsesThree: false,
    packageUsesPhaser: false,
    packageUsesDom: false,
    environmentTimeUnit: 'seconds',
    environmentDepthConvention: 'positiveDownMeters',
    immutableAfterComposition: value.immutableAfterComposition !== false,
    claimBoundary: EnvironmentUtil.normalizeClaimBoundary(value.claimBoundary ?? claimBoundary),
    ...value,
    packageOwnsGenerationEquations: false,
    packageOwnsVisibilityPolicy: false,
    packageOwnsObservationNoise: false,
    packageOwnsSimulation: false,
    packageOwnsScoring: false,
    rendererOwnsEnvironmentTruth: false,
    packageUsesThree: false,
    packageUsesPhaser: false,
    packageUsesDom: false
  };
}

function compactBoundaryFlags(flags = {}) {
  return {
    packageOwnsGenerationEquations: flags.packageOwnsGenerationEquations === true,
    packageOwnsVisibilityPolicy: flags.packageOwnsVisibilityPolicy === true,
    packageOwnsObservationNoise: flags.packageOwnsObservationNoise === true,
    packageOwnsSimulation: flags.packageOwnsSimulation === true,
    packageOwnsScoring: flags.packageOwnsScoring === true,
    rendererOwnsEnvironmentTruth: flags.rendererOwnsEnvironmentTruth === true,
    packageUsesThree: flags.packageUsesThree === true,
    packageUsesPhaser: flags.packageUsesPhaser === true,
    packageUsesDom: flags.packageUsesDom === true,
    environmentTimeUnit: flags.environmentTimeUnit ?? 'seconds',
    environmentDepthConvention: flags.environmentDepthConvention ?? 'positiveDownMeters'
  };
}

function range(axis = []) {
  const values = (Array.isArray(axis) ? axis : []).map(Number).filter(Number.isFinite);
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values), count: values.length };
}

function max2d(grid = []) {
  const values = (grid ?? []).flat().map(Number).filter(Number.isFinite);
  return values.length ? Math.max(...values) : 0;
}

function markNormalized(artifact) {
  try {
    Object.defineProperty(artifact, '__anchorEnvironmentArtifactNormalized', { value: true, enumerable: false, configurable: true });
  } catch (_error) {
    artifact.__anchorEnvironmentArtifactNormalized = true;
  }
}

module.exports = {resetEnvironmentArtifactRuntimeCounters, getEnvironmentArtifactRuntimeCounters, createEnvironmentArtifact, normalizeEnvironmentArtifact, validateEnvironmentArtifactContract, environmentArtifactSummary, environmentArtifactDigest, environmentComponentDigests, environmentTimeCoverage, environmentDepthCoverage}