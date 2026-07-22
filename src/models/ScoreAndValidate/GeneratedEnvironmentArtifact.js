const currentIndex = require('./currents/src/index.js')
const environmentIndex = require('./environment/src/index.js')
const CurrentFieldArtifactAdapter = require('./CurrentFieldArtifactAdapter.js')
const EnvironmentGeneratorBackendContract = require('./EnvironmentGeneratorBackendContract.js')
const GENERATED_ENVIRONMENT_ARTIFACT_VERSION = 'generated-environment-artifact-env-pkg-r1';
const CURRENT_FIELD_METADATA_GENERATOR_VERSION = 'generated-environment-artifact-flow-r2a-5-1';

 function createGeneratedEnvironmentArtifact(manifestOrOptions = {}, options = {}) {
  const manifest = environmentIndex.normalizeSyntheticEnvironmentManifest({ ...(manifestOrOptions ?? {}), ...(options.manifestPatch ?? {}) });
  const backendValidation = EnvironmentGeneratorBackendContract.validateEnvironmentGeneratorBackend(manifest.backendId);
  if (!backendValidation.valid) {
    const error = new Error(backendValidation.errors.join('; '));
    error.name = 'EnvironmentGeneratorBackendError';
    error.validation = backendValidation;
    throw error;
  }
  const level = options.level ?? manifestOrOptions.level ?? {};
  const builtCurrentField4D = currentIndex.createBathymetryConditionedCurrentField({
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
    environmentGeneratorBackendVersion: options.currentOptions?.environmentGeneratorBackendVersion ?? CURRENT_FIELD_METADATA_GENERATOR_VERSION,
    environmentManifestDigest: manifest.digest,
    id: options.id ?? manifestOrOptions.id ?? `environment-current-${manifest.digest?.slice(-8) ?? 'field'}`
  });
  const currentArtifactResult = CurrentFieldArtifactAdapter.normalizeCurrentFieldArtifact(builtCurrentField4D);
  const currentField4D = currentArtifactResult.artifact;
  const environmentArtifact = environmentIndexndex.createEnvironmentArtifact({
    id: options.environmentArtifactId ?? manifestOrOptions.environmentArtifactId ?? `environment-artifact-${manifest.digest?.slice(-8) ?? 'field'}`,
    syntheticManifest: manifest,
    seed: manifest.seed,
    generatorId: manifest.backendId,
    generatorVersion: GENERATED_ENVIRONMENT_ARTIFACT_VERSION,
    generatorBackend: manifest.backend,
    coordinateFrame: currentField4D.coordinateFrame ?? 'localEastNorthDown',
    operationalDomain: environmentDomainFromLevel(level, manifest, currentField4D),
    resolutionProfile: level.resolutionProfile ?? level.world?.resolutionProfile ?? null,
    bathymetry: selectBathymetryArtifact(level),
    currentFields: [currentField4D],
    scalarFields: selectScalarFields(level),
    fieldRoles: {
      bathymetry: { epistemicRole: 'publicReference', publicVisibility: 'publicScenario' },
      currentFields: {
        [currentField4D.id]: {
          epistemicRole: 'truth',
          publicVisibility: currentField4D.sourceMetadata?.hiddenTruthIncluded === true ? 'hidden' : 'publicScenario',
          tags: ['simulation-current', 'planning-visible-current']
        }
      },
      scalarFields: scalarFieldRoles(level)
    },
    sourceMetadata: {
      sourceTier: 'scientificallyConstrainedSynthetic',
      sourceId: manifest.digest,
      synthetic: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      warnings: [manifest.source?.warning ?? 'Synthetic educational environment. Not calibrated ocean forecast data.']
    },
    provenance: {
      generatedBy: 'src/core/environment/GeneratedEnvironmentArtifact.js',
      generatorVersion: GENERATED_ENVIRONMENT_ARTIFACT_VERSION,
      seed: manifest.seed,
      componentPackageVersions: {
        currents: currentField4D.version,
        bathymetry: level.bathymetryArtifact?.version ?? null,
        scalarProcesses: null
      }
    },
    claimBoundary: {
      synthetic: true,
      scientificallyConstrained: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      warning: manifest.source?.warning
    }
  });
  const artifact = {
    type: 'anchor.environment.generated-artifact',
    version: GENERATED_ENVIRONMENT_ARTIFACT_VERSION,
    manifest,
    manifestDigest: manifest.digest,
    backend: manifest.backend,
    currentField4D,
    currentFieldSummary: currentArtifactResult.summary,
    environmentArtifact,
    environmentArtifactDigest: environmentArtifact.artifactDigest,
    environmentArtifactSummary: environmentIndex.environmentArtifactSummary(environmentArtifact),
    componentDigests: environmentIndex.environmentComponentDigests(environmentArtifact),
    fieldRegistry: environmentArtifact.fieldRegistry,
    publicSafety: {
      hiddenTruthIncluded: false,
      synthetic: true,
      calibratedForecast: false,
      calibratedOceanProduct: false,
      usesRealHycom: false,
      usesRealMarineCopernicus: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      warning: manifest.source?.warning ?? 'Synthetic educational environment. Not calibrated ocean forecast data.'
    }
  };
  artifact.digest = generatedEnvironmentArtifactDigest(artifact);
  currentField4D.sourceMetadata.environmentArtifactDigest = legacyGeneratedEnvironmentArtifactDigest(artifact);
  attachEnvironmentIdentityToLevel(level, artifact);
  return artifact;
}

 function validateGeneratedEnvironmentArtifact(artifact = {}) {
  const errors = [];
  const warnings = [];
  const manifestValidation = environmentIndex.validateSyntheticEnvironmentManifest(artifact.manifest ?? artifact);
  errors.push(...manifestValidation.errors);
  warnings.push(...manifestValidation.warnings);
  if (artifact.currentFieldSummary?.calibratedForecast || artifact.currentFieldSummary?.usesRealHycom || artifact.currentFieldSummary?.usesRealMarineCopernicus) errors.push('Generated synthetic environment artifact cannot claim calibrated operational current data.');
  if (artifact.currentFieldSummary?.temporalBoundaryMode === 'bounded' && Number(artifact.currentFieldSummary.sourceTimeSeconds?.at(-1) ?? 0) < Number(artifact.currentFieldSummary.validTimeEndSeconds ?? 0)) warnings.push('Generated current field axis does not cover the declared valid end time.');
  if (artifact.environmentArtifact?.validationReport?.valid === false) errors.push(...(artifact.environmentArtifact.validationReport.errors ?? []).map((entry) => `EnvironmentArtifact: ${entry}`));
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, artifact };
}

 function generatedEnvironmentArtifactSummary(artifact = {}) {
  const environmentSummary = artifact.environmentArtifactSummary ?? (artifact.environmentArtifact ? environmentIndex.environmentArtifactSummary(artifact.environmentArtifact) : null);
  return {
    type: 'anchor.debug.environment-generator',
    version: GENERATED_ENVIRONMENT_ARTIFACT_VERSION,
    backendId: artifact.backend?.id ?? artifact.manifest?.backendId ?? null,
    backendImplemented: artifact.backend?.implemented === true,
    manifestDigest: artifact.manifestDigest ?? artifact.manifest?.digest ?? null,
    artifactDigest: artifact.digest ?? null,
    environmentPackageVersion: 'anchor-environment-env-pkg-r1',
    environmentManifestDigest: environmentSummary?.manifestDigest ?? null,
    environmentArtifactDigest: environmentSummary?.artifactDigest ?? artifact.environmentArtifactDigest ?? null,
    environmentValidationStatus: environmentSummary?.validationSummary?.status ?? null,
    environmentFieldCount: environmentSummary?.fieldRegistry?.fieldCount ?? 0,
    environmentFieldRoleSummary: environmentSummary?.fieldRoleSummary ?? [],
    environmentCoordinateFrame: environmentSummary?.coordinateFrame ?? null,
    environmentPhysicalExtent: environmentSummary?.operationalDomainId ? artifact.environmentArtifact?.operationalDomain?.horizontal ?? null : null,
    componentDigests: artifact.componentDigests ?? environmentSummary?.componentDigests ?? null,
    currentFieldDigest: artifact.currentField4D?.digest ?? artifact.currentFieldSummary?.digest ?? null,
    currentFieldDigests: artifact.componentDigests?.currentFieldDigests ?? null,
    scalarFieldDigests: artifact.componentDigests?.scalarFieldDigests ?? null,
    bathymetryArtifactDigest: artifact.componentDigests?.bathymetryArtifactDigest ?? null,
    temporalBoundaryMode: artifact.currentField4D?.temporalBoundaryMode ?? artifact.currentFieldSummary?.temporalBoundaryMode ?? null,
    temporalPeriodSeconds: artifact.currentField4D?.temporalPeriodSeconds ?? artifact.currentFieldSummary?.temporalPeriodSeconds ?? null,
    validTimeStartSeconds: artifact.currentField4D?.validTimeStartSeconds ?? artifact.currentFieldSummary?.validTimeStartSeconds ?? null,
    validTimeEndSeconds: artifact.currentField4D?.validTimeEndSeconds ?? artifact.currentFieldSummary?.validTimeEndSeconds ?? null,
    sourceTimeSeconds: artifact.currentField4D?.timeAxisSeconds ?? artifact.currentFieldSummary?.sourceTimeSeconds ?? [],
    synthetic: artifact.publicSafety?.synthetic === true,
    calibratedForecast: artifact.publicSafety?.calibratedForecast === true,
    calibratedOceanProduct: artifact.publicSafety?.calibratedOceanProduct === true,
    operationalForecast: artifact.publicSafety?.operationalForecast === true,
    certifiedForNavigation: artifact.publicSafety?.certifiedForNavigation === true,
    usesRealHycom: artifact.publicSafety?.usesRealHycom === true,
    usesRealMarineCopernicus: artifact.publicSafety?.usesRealMarineCopernicus === true,
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
    warning: artifact.publicSafety?.warning ?? null
  };
}

 function generatedEnvironmentArtifactDigest(artifact = {}) {
  return `fnv1a32:${fnv(stable({ manifestDigest: artifact.manifestDigest, currentFieldDigest: artifact.currentField4D?.digest ?? artifact.currentFieldSummary?.digest, environmentArtifactDigest: artifact.environmentArtifactDigest, backendId: artifact.backend?.id }))}`;
}

function legacyGeneratedEnvironmentArtifactDigest(artifact = {}) {
  return `fnv1a32:${fnv(stable({ manifestDigest: artifact.manifestDigest, currentFieldDigest: artifact.currentField4D?.digest ?? artifact.currentFieldSummary?.digest, backendId: artifact.backend?.id }))}`;
}

function selectBathymetryArtifact(level = {}) {
  return level.bathymetryArtifact ?? level.world?.bathymetryArtifact ?? null;
}

function selectScalarFields(level = {}) {
  const candidates = [
    ...(Array.isArray(level.scalarFields) ? level.scalarFields : []),
    ...(Array.isArray(level.layers?.scalarFields) ? level.layers.scalarFields : []),
    level.scalarField4D,
    level.layers?.waterColumn?.scalarField4D
  ];
  return candidates.filter(Boolean);
}

function scalarFieldRoles(level = {}) {
  const roles = {};
  for (const field of selectScalarFields(level)) {
    const id = field.id ?? field.sourceMetadata?.fieldId;
    if (id) roles[id] = { epistemicRole: field.sourceMetadata?.epistemicRole ?? 'truth', publicVisibility: field.sourceMetadata?.hiddenTruthIncluded === true ? 'hidden' : 'publicScenario' };
  }
  return roles;
}

function environmentDomainFromLevel(level = {}, manifest = {}, currentField4D = {}) {
  const existing = level.operationalDomain ?? level.world?.operationalDomain ?? level.meta?.operationalDomain ?? null;
  if (existing) return existing;
  const grid = manifest.grid ?? level.world?.grid ?? {};
  const cellSize = Number(grid.cellSizeMeters ?? 100);
  return {
    id: level.levelId ? `${level.levelId}:environment-domain` : 'generated-environment-domain',
    coordinateFrame: currentField4D.coordinateFrame ?? 'localEastNorthDown',
    horizontal: {
      minEastMeters: 0,
      minNorthMeters: 0,
      widthMeters: Math.max(1, (Number(grid.width ?? currentField4D.eastAxisMeters?.length ?? 1) - 1) * cellSize),
      heightMeters: Math.max(1, (Number(grid.height ?? currentField4D.northAxisMeters?.length ?? 1) - 1) * cellSize)
    },
    vertical: {
      minDepthMeters: 0,
      maxDepthMeters: Math.max(0, ...((currentField4D.depthAxisMeters ?? [0]).map(Number).filter(Number.isFinite)))
    },
    time: {
      startSeconds: Number(currentField4D.validTimeStartSeconds ?? currentField4D.timeAxisSeconds?.[0] ?? 0),
      durationSeconds: Number(currentField4D.validTimeEndSeconds ?? currentField4D.timeAxisSeconds?.at?.(-1) ?? 0),
      dtSeconds: Number(level.world?.time?.dtSeconds ?? level.world?.time?.dt ?? 0)
    }
  };
}

function attachEnvironmentIdentityToLevel(level, artifact) {
  if (!level || typeof level !== 'object') return;
  const summary = artifact.environmentArtifactSummary;
  level.environmentArtifactSummary = summary;
  level.environmentArtifactDigest = artifact.environmentArtifactDigest;
  level.componentDigests = artifact.componentDigests;
  level.meta ??= {};
  level.meta.environmentPackageVersion = 'anchor-environment-env-pkg-r1';
  level.meta.environmentManifestDigest = summary?.manifestDigest ?? null;
  level.meta.environmentArtifactDigest = artifact.environmentArtifactDigest;
  level.meta.environmentComponentDigests = artifact.componentDigests;
  level.meta.environmentValidationSummary = summary?.validationSummary ?? null;
  level.meta.environmentFieldRoleSummary = summary?.fieldRoleSummary ?? [];
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

module.exports = {createGeneratedEnvironmentArtifact, validateGeneratedEnvironmentArtifact, generatedEnvironmentArtifactSummary, generatedEnvironmentArtifactDigest}