import {
  canonicalJsonDigest,
  canonicalizeJsonValue
} from '../../../packages/codecs/src/index.js';
import {
  BATHYMETRY_PACKAGE_VERSION,
  bathymetryArtifactSummary
} from '../../../packages/bathymetry/src/index.js';
import {
  BATHYMETRY_ARTIFACT_ADAPTER_VERSION,
  createBathymetryArtifactFromField
} from '../generation/BathymetryArtifactAdapter.js';
import {
  BATHYMETRY_FIELD_MODEL_VERSION,
  createBasinSeamountBathymetry,
  createBathymetryField,
  createCoastalOperationalBathymetry,
  createIslandArcBathymetry,
  createShelfCanyonBathymetry
} from '../science/BathymetryFieldModel.js';
import {
  ENVIRONMENT_STUDIO_CONTRACT_VERSION,
  ENVIRONMENT_STUDIO_DEPENDENCY_STATE,
  ENVIRONMENT_STUDIO_LIMITS,
  ENVIRONMENT_STUDIO_STATUS,
  buildEnvironmentStudioValidationReport,
  createEnvironmentStudioDependencyGraph,
  normalizeBathymetryArchetypeSpec,
  normalizeBathymetryTileManifest,
  normalizeEnvironmentStudioDomainSpec,
  normalizeTileMosaicManifest,
  validateNoHiddenTruth,
  validateTileSeams
} from './EnvironmentStudioContracts.js';

export const ENVIRONMENT_STUDIO_PROJECT_TYPE = 'anchor.environment-studio-project';
export const ENVIRONMENT_STUDIO_PROJECT_VERSION = '1.0.0';
export const ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION = 'environment-studio-r1-project';

export const ENVIRONMENT_STUDIO_DOMAIN_PROFILES = Object.freeze([
  {
    id: 'tutorialCoast',
    label: 'Tutorial Coast',
    description: 'Small browser-safe domain for classroom walkthroughs.',
    horizontal: { widthMeters: 24000, heightMeters: 16000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 180 },
    time: { durationSeconds: 3600, dtSeconds: 300 }
  },
  {
    id: 'compactRegional',
    label: 'Compact Regional',
    description: 'Balanced regional tile for quick bathymetry authoring.',
    horizontal: { widthMeters: 48000, heightMeters: 32000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 240 },
    time: { durationSeconds: 5400, dtSeconds: 300 }
  },
  {
    id: 'regionalShelf',
    label: 'Regional Shelf',
    description: 'Larger shelf/canyon domain that remains below browser limits.',
    horizontal: { widthMeters: 80000, heightMeters: 48000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 280 },
    time: { durationSeconds: 7200, dtSeconds: 300 }
  },
  {
    id: 'largeRegional',
    label: 'Large Regional',
    description: 'Upper R1 browser preview profile; validation still enforces hard limits.',
    horizontal: { widthMeters: 120000, heightMeters: 80000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 320 },
    time: { durationSeconds: 10800, dtSeconds: 600 }
  }
]);

export const ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES = Object.freeze([
  {
    id: 'coastalShelf',
    label: 'Coastal Shelf',
    family: 'coastalShelf',
    description: 'Coastline, shelf, shelf break, deep basin, canyon, seamount, and river mouth.',
    featureIds: ['continentalShelf', 'shelfBreak', 'submarineCanyon', 'abyssalPlain', 'seamount', 'riverMouth'],
    create: createCoastalOperationalBathymetry
  },
  {
    id: 'shelfBreak',
    label: 'Shelf Break',
    family: 'shelfBreak',
    description: 'Continental shelf and slope with an emphasized shelf break.',
    featureIds: ['continentalShelf', 'shelfBreak', 'abyssalPlain'],
    create: (options) => createBathymetryField({ ...options, features: ['continentalShelf', 'shelfBreak', 'abyssalPlain'] })
  },
  {
    id: 'submarineCanyon',
    label: 'Submarine Canyon',
    family: 'shelfCanyon',
    description: 'Cross-shelf canyon over a synthetic coastal margin.',
    featureIds: ['continentalShelf', 'shelfBreak', 'submarineCanyon', 'abyssalPlain', 'riverMouth'],
    create: createShelfCanyonBathymetry
  },
  {
    id: 'deepBasin',
    label: 'Deep Basin',
    family: 'deepBasin',
    description: 'Offshore basin with weak coastal structure and broad deep water.',
    featureIds: ['continentalShelf', 'abyssalPlain'],
    create: (options) => createBathymetryField({ ...options, features: ['continentalShelf', 'abyssalPlain'] })
  },
  {
    id: 'islandSeamount',
    label: 'Island / Seamount',
    family: 'islandSeamount',
    description: 'Island arc and seamount context for 2.5D mission planning.',
    featureIds: ['islandArc', 'seamount', 'ridge', 'abyssalPlain'],
    create: createIslandArcBathymetry
  },
  {
    id: 'gulfBay',
    label: 'Gulf / Bay',
    family: 'gulfBay',
    description: 'Coastal bay with shallow shelf structure and estuary-like indentation.',
    featureIds: ['continentalShelf', 'coastalBay', 'riverMouth', 'estuaryChannel'],
    create: (options) => createBathymetryField({ ...options, coastlineMode: 'coastal-bay', features: ['continentalShelf', 'coastalBay', 'riverMouth', 'estuaryChannel'] })
  },
  {
    id: 'riverMouthDelta',
    label: 'River Mouth / Delta',
    family: 'riverMouthDelta',
    description: 'River-mouth control with shelf and estuary channel features.',
    featureIds: ['continentalShelf', 'riverMouth', 'estuaryChannel', 'shelfBreak'],
    create: (options) => createBathymetryField({ ...options, coastlineMode: 'coastal-bay', features: ['continentalShelf', 'riverMouth', 'estuaryChannel', 'shelfBreak'] })
  },
  {
    id: 'ridgeSill',
    label: 'Ridge / Sill',
    family: 'ridgeSill',
    description: 'Ridge and sill features over a basin/seamount setting.',
    featureIds: ['ridge', 'seamount', 'abyssalPlain'],
    create: createBasinSeamountBathymetry
  },
  {
    id: 'mixedRegionalComposite',
    label: 'Mixed Regional Composite',
    family: 'mixedRegionalComposite',
    description: 'Mixed coastal, canyon, basin, seamount, river, and ridge structure.',
    featureIds: ['continentalShelf', 'shelfBreak', 'submarineCanyon', 'seamount', 'ridge', 'riverMouth', 'abyssalPlain'],
    create: (options) => createBathymetryField({ ...options, features: ['continentalShelf', 'shelfBreak', 'submarineCanyon', 'seamount', 'ridge', 'riverMouth', 'abyssalPlain'] })
  }
]);

export function createEnvironmentStudioSession(options = {}) {
  const profile = domainProfileById(options.profileId ?? options.domainProfileId);
  const domainSpec = normalizeEnvironmentStudioDomainSpec({
    id: options.domainId ?? 'environment-studio-domain',
    meta: {
      name: options.label ?? profile.label ?? 'Environment Studio Domain',
      description: profile.description ?? 'Synthetic reproducible authoring domain.'
    },
    ...(profile ?? {}),
    ...(options.domainSpec ?? {}),
    horizontal: {
      ...(profile?.horizontal ?? {}),
      ...(options.domainSpec?.horizontal ?? {}),
      ...(options.horizontal ?? {})
    },
    vertical: {
      ...(profile?.vertical ?? {}),
      ...(options.domainSpec?.vertical ?? {}),
      ...(options.vertical ?? {})
    },
    time: {
      ...(profile?.time ?? {}),
      ...(options.domainSpec?.time ?? {}),
      ...(options.time ?? {})
    }
  });
  const archetype = archetypeById(options.archetypeId);
  const archetypeSpec = normalizeBathymetryArchetypeSpec({
    id: archetype.id,
    label: archetype.label,
    archetypeFamily: archetype.family,
    domainSpecDigest: domainSpec.domainSpecDigest,
    parameters: {
      maxDepthMeters: domainSpec.vertical.maxDepthMeters,
      roughness: finite(options.roughness, 0.18),
      featureScale: finite(options.featureScale, 1)
    },
    provenance: {
      source: 'environment-studio-r1-browser-thin-slice',
      deterministicSeed: String(options.seed ?? 'env-studio-r1'),
      operations: []
    }
  });
  const dependencyGraph = dependencyGraphForState({ domainSpec, archetypeSpec, tiles: [], mosaic: null, validationReport: null });
  const session = {
    type: 'anchor.environment-studio-session',
    version: ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION,
    projectId: String(options.projectId ?? `env-studio-${stableToken(domainSpec.domainSpecDigest)}`),
    label: String(options.label ?? profile.label ?? 'Environment Studio Project'),
    seed: String(options.seed ?? 'env-studio-r1'),
    profileId: profile.id,
    archetypeId: archetype.id,
    domainSpec,
    archetypeSpec,
    tiles: [],
    mosaic: null,
    dependencyGraph,
    validationReport: null,
    lastAction: 'created',
    importWarning: null
  };
  return refreshEnvironmentStudioSession(session);
}

export function patchEnvironmentStudioDomain(sessionInput = {}, patch = {}) {
  const session = normalizeSession(sessionInput);
  const domainSpec = normalizeEnvironmentStudioDomainSpec({
    ...session.domainSpec,
    meta: {
      ...(session.domainSpec?.meta ?? {}),
      name: patch.label ?? session.domainSpec?.meta?.name
    },
    horizontal: {
      originEastMeters: session.domainSpec?.horizontal?.originEastMeters,
      originNorthMeters: session.domainSpec?.horizontal?.originNorthMeters,
      ...(patch.horizontal ?? {}),
      widthMeters: patch.widthMeters ?? patch.horizontal?.widthMeters ?? session.domainSpec?.horizontal?.widthMeters,
      heightMeters: patch.heightMeters ?? patch.horizontal?.heightMeters ?? session.domainSpec?.horizontal?.heightMeters,
      cellSizeMeters: patch.cellSizeMeters ?? patch.horizontal?.cellSizeMeters ?? session.domainSpec?.horizontal?.cellSizeMeters,
      columns: patch.horizontal?.columns ?? null,
      rows: patch.horizontal?.rows ?? null
    },
    vertical: {
      ...(session.domainSpec?.vertical ?? {}),
      maxDepthMeters: patch.maxDepthMeters ?? patch.vertical?.maxDepthMeters ?? session.domainSpec?.vertical?.maxDepthMeters
    },
    time: {
      ...(session.domainSpec?.time ?? {}),
      durationSeconds: patch.durationSeconds ?? patch.time?.durationSeconds ?? session.domainSpec?.time?.durationSeconds,
      dtSeconds: patch.dtSeconds ?? patch.time?.dtSeconds ?? session.domainSpec?.time?.dtSeconds
    }
  });
  const archetypeSpec = normalizeBathymetryArchetypeSpec({
    ...session.archetypeSpec,
    domainSpecDigest: domainSpec.domainSpecDigest
  });
  return refreshEnvironmentStudioSession({
    ...session,
    label: String(patch.label ?? session.label ?? 'Environment Studio Project'),
    domainSpec,
    archetypeSpec,
    tiles: [],
    mosaic: null,
    lastAction: 'domain-changed'
  });
}

export function setEnvironmentStudioArchetype(sessionInput = {}, archetypeId, options = {}) {
  const session = normalizeSession(sessionInput);
  const archetype = archetypeById(archetypeId);
  const archetypeSpec = normalizeBathymetryArchetypeSpec({
    id: archetype.id,
    label: archetype.label,
    archetypeFamily: archetype.family,
    domainSpecDigest: session.domainSpec.domainSpecDigest,
    parameters: {
      ...(session.archetypeSpec?.parameters ?? {}),
      maxDepthMeters: session.domainSpec.vertical.maxDepthMeters,
      roughness: finite(options.roughness, session.archetypeSpec?.parameters?.roughness ?? 0.18),
      featureScale: finite(options.featureScale, session.archetypeSpec?.parameters?.featureScale ?? 1)
    },
    provenance: {
      source: 'environment-studio-r1-browser-thin-slice',
      deterministicSeed: String(options.seed ?? session.seed ?? 'env-studio-r1'),
      operations: []
    }
  });
  return refreshEnvironmentStudioSession({
    ...session,
    seed: String(options.seed ?? session.seed ?? 'env-studio-r1'),
    archetypeId: archetype.id,
    archetypeSpec,
    tiles: [],
    mosaic: null,
    lastAction: 'archetype-changed'
  });
}

export function generateEnvironmentStudioTile(sessionInput = {}, options = {}) {
  const session = normalizeSession(sessionInput);
  const seed = String(options.seed ?? session.seed ?? 'env-studio-r1');
  const archetypeId = options.archetypeId ?? session.archetypeId;
  const tile = createTileFromBathymetry({
    id: options.id ?? 'env-studio-tile-1',
    tileCoordinate: options.tileCoordinate ?? { row: 0, column: 0 },
    domainSpec: session.domainSpec,
    archetypeSpec: session.archetypeSpec,
    archetypeId,
    seed,
    rows: positiveInteger(options.rows, session.domainSpec.horizontal.rows),
    columns: positiveInteger(options.columns, session.domainSpec.horizontal.columns),
    eastMeters: positive(options.eastMeters, session.domainSpec.horizontal.widthMeters),
    northMeters: positive(options.northMeters, session.domainSpec.horizontal.heightMeters)
  });
  return refreshEnvironmentStudioSession({
    ...session,
    seed,
    archetypeId,
    tiles: [tile],
    mosaic: null,
    lastAction: 'tile-generated'
  });
}

export function createEnvironmentStudioMosaic(sessionInput = {}, options = {}) {
  const session = normalizeSession(sessionInput);
  const seed = String(options.seed ?? session.seed ?? 'env-studio-r1');
  const archetypeId = options.archetypeId ?? session.archetypeId;
  const tileRows = positiveInteger(options.tileRows, Math.max(5, Math.floor((session.domainSpec.horizontal.rows + 1) / 2)));
  const tileColumns = positiveInteger(options.tileColumns, Math.max(5, Math.floor((session.domainSpec.horizontal.columns + 1) / 2)));
  const sourceRows = tileRows * 2 - 1;
  const sourceColumns = tileColumns * 2 - 1;
  const sourceBathymetry = bathymetryForArchetype(archetypeId, {
    seed: `${seed}:mosaic`,
    width: sourceColumns,
    height: sourceRows,
    maxDepthMeters: session.domainSpec.vertical.maxDepthMeters
  });
  const tiles = [];
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const depthMeters = extractDepthWindow(sourceBathymetry.depthMeters, column * (tileColumns - 1), row * (tileRows - 1), tileColumns, tileRows);
      const bathymetry = createBathymetryField({
        seed: `${seed}:mosaic:${row}:${column}`,
        width: tileColumns,
        height: tileRows,
        maxDepthMeters: session.domainSpec.vertical.maxDepthMeters,
        features: archetypeById(archetypeId).featureIds,
        depthMeters,
        synthetic: true
      });
      tiles.push(createTileFromBathymetry({
        id: `env-studio-mosaic-r${row}-c${column}`,
        tileCoordinate: { row, column },
        domainSpec: session.domainSpec,
        archetypeSpec: session.archetypeSpec,
        archetypeId,
        seed,
        rows: tileRows,
        columns: tileColumns,
        eastMeters: session.domainSpec.horizontal.widthMeters / 2,
        northMeters: session.domainSpec.horizontal.heightMeters / 2,
        bathymetry
      }));
    }
  }
  const seamReport = validateTileSeams({
    tileManifests: tiles.map((tile) => tile.manifest),
    seamPolicy: { maxDepthDeltaMeters: finite(options.maxDepthDeltaMeters, ENVIRONMENT_STUDIO_LIMITS.maxMosaicSeamDeltaMeters) }
  });
  const mosaicManifest = normalizeTileMosaicManifest({
    id: 'environment-studio-2x2-mosaic',
    domainSpecDigest: session.domainSpec.domainSpecDigest,
    tileGrid: { rows: 2, columns: 2 },
    tiles: tiles.map((tile) => tile.manifest),
    seamPolicy: seamReport.seamPolicy,
    editProvenance: {
      source: 'environment-studio-r1-browser-thin-slice',
      deterministicSeed: seed,
      operations: [{ id: 'create-2x2-mosaic', type: 'deterministic-mosaic-split', target: 'bathymetryTiles' }]
    }
  });
  const mosaic = withDigest({
    type: 'anchor.environment-studio.mosaic',
    version: ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION,
    id: mosaicManifest.id,
    manifest: mosaicManifest,
    seamReport,
    tileIds: tiles.map((tile) => tile.id),
    sourceDigest: canonicalJsonDigest({
      seed,
      archetypeId,
      sourceRows,
      sourceColumns,
      sourceFieldDigest: canonicalJsonDigest(sourceBathymetry.depthMeters)
    })
  }, 'digest');
  return refreshEnvironmentStudioSession({
    ...session,
    seed,
    archetypeId,
    tiles,
    mosaic,
    lastAction: 'mosaic-generated'
  });
}

export function buildEnvironmentStudioProject(sessionInput = {}) {
  const session = refreshEnvironmentStudioSession(normalizeSession(sessionInput));
  const validationReport = session.validationReport ?? validationReportForState(session);
  const projectBase = {
    projectType: ENVIRONMENT_STUDIO_PROJECT_TYPE,
    projectVersion: ENVIRONMENT_STUDIO_PROJECT_VERSION,
    projectId: String(session.projectId ?? `env-studio-${stableToken(session.domainSpec?.domainSpecDigest)}`),
    label: String(session.label ?? session.domainSpec?.meta?.name ?? 'Environment Studio Project'),
    domainSpec: session.domainSpec,
    archetypeSpec: session.archetypeSpec,
    tiles: session.tiles,
    mosaic: session.mosaic ?? {},
    dependencyGraph: session.dependencyGraph,
    validationReport,
    provenance: {
      generatedBy: 'src/core/editor/EnvironmentStudioProject.js',
      generatorVersion: ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION,
      deterministicSeed: String(session.seed ?? 'env-studio-r1'),
      synthetic: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false
    },
    packageVersions: environmentStudioPackageVersions()
  };
  return withDigest(projectBase, 'projectDigest');
}

export function normalizeEnvironmentStudioProject(input = {}) {
  const source = input.projectType === ENVIRONMENT_STUDIO_PROJECT_TYPE ? input : (input.project ?? input);
  const session = createEnvironmentStudioSession({
    projectId: source.projectId,
    label: source.label ?? source.domainSpec?.meta?.name,
    seed: source.provenance?.deterministicSeed ?? source.seed ?? 'env-studio-r1',
    domainSpec: source.domainSpec ?? source.domain ?? {},
    archetypeId: source.archetypeId ?? source.archetypeSpec?.id ?? source.tiles?.[0]?.archetypeId ?? 'coastalShelf'
  });
  const tiles = (Array.isArray(source.tiles) ? source.tiles : []).map(normalizeProjectTile);
  const mosaic = source.mosaic?.manifest
    ? {
        ...source.mosaic,
        manifest: normalizeTileMosaicManifest(source.mosaic.manifest),
        seamReport: source.mosaic.seamReport ?? validateTileSeams({ tileManifests: tiles.map((tile) => tile.manifest) })
      }
    : null;
  return buildEnvironmentStudioProject(refreshEnvironmentStudioSession({
    ...session,
    tiles,
    mosaic,
    archetypeSpec: source.archetypeSpec ?? session.archetypeSpec,
    dependencyGraph: source.dependencyGraph ?? session.dependencyGraph,
    validationReport: source.validationReport ?? null,
    lastAction: source.dependencyGraph?.transitionLog?.[0] ?? 'project-normalized'
  }));
}

export function validateEnvironmentStudioProject(input = {}) {
  const rawHiddenReport = validateNoHiddenTruth(input);
  const project = normalizeEnvironmentStudioProject(input);
  const validationReport = validationReportForState(projectStateFromProject(project), rawHiddenReport);
  const validated = withDigest({ ...project, validationReport }, 'projectDigest');
  return {
    valid: validationReport.status !== ENVIRONMENT_STUDIO_STATUS.FAIL,
    status: validationReport.status,
    errors: validationReport.errors,
    warnings: validationReport.warnings,
    project: validated,
    validationReport
  };
}

export function importEnvironmentStudioProject(input = {}) {
  const validation = validateEnvironmentStudioProject(input);
  if (!validation.valid) {
    const error = new Error(validation.errors[0] ?? 'Environment Studio project failed validation.');
    error.validation = validation;
    throw error;
  }
  return projectStateFromProject(validation.project);
}

export function refreshEnvironmentStudioSession(sessionInput = {}) {
  const session = normalizeSession(sessionInput);
  const dependencyGraph = dependencyGraphForState(session);
  const validationReport = validationReportForState({ ...session, dependencyGraph });
  return {
    ...session,
    dependencyGraph,
    validationReport
  };
}

export function environmentStudioDebugPayload(sessionInput = {}) {
  const session = refreshEnvironmentStudioSession(normalizeSession(sessionInput));
  const project = buildEnvironmentStudioProject(session);
  const failures = session.validationReport?.errors ?? [];
  const warnings = session.validationReport?.warnings ?? [];
  return {
    projectType: ENVIRONMENT_STUDIO_PROJECT_TYPE,
    projectVersion: ENVIRONMENT_STUDIO_PROJECT_VERSION,
    routeActive: true,
    domainSpec: domainDebugSummary(session.domainSpec),
    domainDigest: session.domainSpec?.domainSpecDigest ?? null,
    tileCount: session.tiles.length,
    tileDigests: session.tiles.map((tile) => tile.manifest?.tileDigest ?? tile.digest).filter(Boolean),
    mosaicDigest: session.mosaic?.manifest?.mosaicDigest ?? session.mosaic?.digest ?? null,
    projectDigest: project.projectDigest,
    validationStatus: session.validationReport?.status ?? 'EMPTY',
    warningCount: warnings.length,
    failureCount: failures.length,
    dependencyGraph: session.dependencyGraph,
    previewRendererCount: 0,
    activeRafCount: 0,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false,
    warnings,
    failures
  };
}

export function environmentStudioSessionSummary(sessionInput = {}) {
  const session = refreshEnvironmentStudioSession(normalizeSession(sessionInput));
  const project = buildEnvironmentStudioProject(session);
  return {
    projectId: project.projectId,
    label: project.label,
    projectDigest: project.projectDigest,
    domainDigest: session.domainSpec.domainSpecDigest,
    domain: domainDebugSummary(session.domainSpec),
    archetypeId: session.archetypeId,
    seed: session.seed,
    tileCount: session.tiles.length,
    mosaicDigest: session.mosaic?.manifest?.mosaicDigest ?? null,
    validationStatus: session.validationReport?.status ?? 'EMPTY',
    warningCount: session.validationReport?.warnings?.length ?? 0,
    failureCount: session.validationReport?.errors?.length ?? 0
  };
}

export function environmentStudioPackageVersions() {
  return {
    environmentStudioProject: ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION,
    environmentStudioContracts: ENVIRONMENT_STUDIO_CONTRACT_VERSION,
    bathymetryFieldModel: BATHYMETRY_FIELD_MODEL_VERSION,
    bathymetryArtifactAdapter: BATHYMETRY_ARTIFACT_ADAPTER_VERSION,
    bathymetryPackage: BATHYMETRY_PACKAGE_VERSION
  };
}

export function domainProfileById(id = 'compactRegional') {
  return ENVIRONMENT_STUDIO_DOMAIN_PROFILES.find((profile) => profile.id === id)
    ?? ENVIRONMENT_STUDIO_DOMAIN_PROFILES[1];
}

export function archetypeById(id = 'coastalShelf') {
  return ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.find((entry) => entry.id === id)
    ?? ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES[0];
}

function createTileFromBathymetry(options = {}) {
  const bathymetry = options.bathymetry ?? bathymetryForArchetype(options.archetypeId, {
    seed: options.seed,
    width: options.columns,
    height: options.rows,
    maxDepthMeters: options.domainSpec?.vertical?.maxDepthMeters
  });
  const artifact = createBathymetryArtifactFromField(bathymetry, {
    id: `${options.id}-artifact`,
    operationalDomain: {
      horizontal: {
        widthMeters: options.eastMeters,
        heightMeters: options.northMeters
      }
    },
    provenance: {
      generatedBy: 'src/core/editor/EnvironmentStudioProject.js',
      generatorVersion: ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION,
      deterministicSeed: options.seed
    }
  });
  const edgeProfiles = edgeProfilesFromDepth(artifact.bottomDepthMeters);
  const manifest = normalizeBathymetryTileManifest({
    id: options.id,
    domainSpecDigest: options.domainSpec?.domainSpecDigest,
    archetypeSpecDigest: options.archetypeSpec?.archetypeSpecDigest,
    tileCoordinate: options.tileCoordinate,
    rows: artifact.bottomDepthMeters.length,
    columns: artifact.bottomDepthMeters[0]?.length ?? 0,
    physicalExtentMeters: { east: positive(options.eastMeters, artifact.eastAxisMeters?.at?.(-1) ?? 1), north: positive(options.northMeters, artifact.northAxisMeters?.at?.(-1) ?? 1) },
    edgeProfiles,
    bathymetrySource: {
      mode: 'archetypeGenerated',
      publicVisibility: 'publicScenario',
      containsHiddenTruth: false
    },
    editProvenance: {
      source: 'environment-studio-r1-browser-thin-slice',
      deterministicSeed: String(options.seed ?? 'env-studio-r1'),
      operations: [{ id: `generate-${options.id}`, type: 'generate-bathymetry-tile', target: 'bottomDepthMeters' }]
    }
  });
  const diagnostics = tileDiagnostics(artifact);
  return withDigest({
    type: 'anchor.environment-studio.bathymetry-tile',
    version: ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION,
    id: String(options.id ?? manifest.id),
    archetypeId: archetypeById(options.archetypeId).id,
    manifest,
    bathymetryArtifact: artifact,
    artifactSummary: bathymetryArtifactSummary(artifact),
    diagnostics,
    bottomDepthPreview: downsampleGrid(artifact.bottomDepthMeters, 36, 24),
    publicVisibility: 'publicScenario',
    containsHiddenTruth: false
  }, 'digest');
}

function normalizeProjectTile(input = {}) {
  const manifest = normalizeBathymetryTileManifest(input.manifest ?? input.tileManifest ?? input);
  const artifact = input.bathymetryArtifact ?? null;
  return withDigest({
    type: 'anchor.environment-studio.bathymetry-tile',
    version: input.version ?? ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION,
    id: String(input.id ?? manifest.id),
    archetypeId: String(input.archetypeId ?? 'coastalShelf'),
    manifest,
    bathymetryArtifact: artifact,
    artifactSummary: input.artifactSummary ?? (artifact ? bathymetryArtifactSummary(artifact) : null),
    diagnostics: input.diagnostics ?? (artifact ? tileDiagnostics(artifact) : {}),
    bottomDepthPreview: input.bottomDepthPreview ?? (artifact?.bottomDepthMeters ? downsampleGrid(artifact.bottomDepthMeters, 36, 24) : []),
    publicVisibility: input.publicVisibility ?? 'publicScenario',
    containsHiddenTruth: false
  }, 'digest');
}

function bathymetryForArchetype(archetypeId, options = {}) {
  const archetype = archetypeById(archetypeId);
  return archetype.create({
    seed: options.seed ?? `env-studio-${archetype.id}`,
    width: positiveInteger(options.width, 49),
    height: positiveInteger(options.height, 33),
    maxDepthMeters: positive(options.maxDepthMeters, 240),
    features: archetype.featureIds,
    defaultViewMode: 'topDown'
  });
}

function dependencyGraphForState(state = {}) {
  const tiles = Array.isArray(state.tiles) ? state.tiles : [];
  const hasTiles = tiles.length > 0;
  const hasMosaic = Boolean(state.mosaic?.manifest);
  const validationReport = state.validationReport ?? null;
  return createEnvironmentStudioDependencyGraph({
    id: 'environment-studio-r1-dependency-graph',
    nodes: {
      domainSpec: node(ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT, state.domainSpec?.domainSpecDigest),
      bathymetryArchetypeSpec: node(ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT, state.archetypeSpec?.archetypeSpecDigest),
      bathymetryTiles: node(hasTiles ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED, tileDigestListDigest(tiles)),
      tileMosaic: node(hasMosaic ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED, state.mosaic?.manifest?.mosaicDigest ?? null),
      bathymetryArtifact: node(hasTiles ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED, tileArtifactDigest(tiles)),
      currentArtifact: node(hasMosaic ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.REQUIRES_REGENERATION : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED, null, hasMosaic ? 'Currents are deferred to a later regeneration pass.' : null),
      scalarArtifact: node(hasMosaic ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.REQUIRES_REGENERATION : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED, null, hasMosaic ? 'Scalar fields are deferred to a later regeneration pass.' : null),
      environmentArtifact: node(hasMosaic ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.REQUIRES_REGENERATION : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED, null, hasMosaic ? 'Launch-to-planning adapter is deferred to ENV-STUDIO-R1.1.' : null),
      validationReport: node(validationReport ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED, null, validationReport ? 'Validation report digest is stored on the report to avoid a circular dependency graph digest.' : null),
      preview: node(hasTiles ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED, tileDigestListDigest(tiles))
    },
    transitionLog: [state.lastAction ?? 'refresh']
  });
}

function validationReportForState(state = {}, rawHiddenReport = null) {
  const tiles = Array.isArray(state.tiles) ? state.tiles : [];
  const seamReport = state.mosaic?.seamReport ?? (tiles.length > 1 ? validateTileSeams({ tileManifests: tiles.map((tile) => tile.manifest) }) : null);
  const extras = validationExtras(state);
  const base = buildEnvironmentStudioValidationReport({
    id: 'environment-studio-r1-validation-report',
    domainSpec: state.domainSpec,
    tileManifests: tiles.map((tile) => tile.manifest),
    mosaicManifest: state.mosaic?.manifest,
    seamReport,
    dependencyGraph: state.dependencyGraph,
    publicArtifacts: {
      domainSpec: state.domainSpec,
      archetypeSpec: state.archetypeSpec,
      tileManifests: tiles.map((tile) => tile.manifest),
      mosaicManifest: state.mosaic?.manifest ?? null,
      seamReport,
      hiddenTruthExposed: false
    },
    errors: [...extras.errors, ...(rawHiddenReport?.errors ?? [])],
    warnings: [...extras.warnings, ...(rawHiddenReport?.warnings ?? [])]
  });
  const checks = [...base.checks, ...extras.checks, ...(rawHiddenReport?.checks ?? [])];
  const errors = [...new Set(base.errors)];
  const warnings = [...new Set(base.warnings)];
  const report = {
    ...base,
    valid: errors.length === 0,
    status: errors.length ? ENVIRONMENT_STUDIO_STATUS.FAIL : warnings.length ? ENVIRONMENT_STUDIO_STATUS.WARN : ENVIRONMENT_STUDIO_STATUS.PASS,
    errors,
    warnings,
    checks,
    summary: {
      ...base.summary,
      checkCount: checks.length,
      failedCheckCount: checks.filter((entry) => entry.passed === false).length,
      warningCount: warnings.length,
      hiddenTruthIncluded: false,
      tileCount: tiles.length,
      hasMosaic: Boolean(state.mosaic?.manifest)
    }
  };
  return withDigest(report, 'validationReportDigest');
}

function validationExtras(state = {}) {
  const tiles = Array.isArray(state.tiles) ? state.tiles : [];
  const checks = [];
  const errors = [];
  const warnings = [];
  if (!tiles.length) warnings.push('No bathymetry tile has been generated yet.');
  for (const tile of tiles) {
    const diagnostics = tile.diagnostics ?? {};
    checks.push(check(`tile-${tile.id}-finite-depths`, diagnostics.finiteDepths === true, diagnostics));
    checks.push(check(`tile-${tile.id}-wet-cells`, Number(diagnostics.wetCellCount ?? 0) > 0, diagnostics));
    checks.push(check(`tile-${tile.id}-navigable-component`, Number(diagnostics.largestWetComponentFraction ?? 0) >= 0.5, diagnostics));
    if (diagnostics.finiteDepths !== true) errors.push(`Tile ${tile.id} contains non-finite depths.`);
    if (Number(diagnostics.wetCellCount ?? 0) <= 0) errors.push(`Tile ${tile.id} has no wet cells.`);
    if (Number(diagnostics.largestWetComponentFraction ?? 0) < 0.5) warnings.push(`Tile ${tile.id} has fragmented navigable wet cells.`);
  }
  if (state.mosaic?.seamReport) {
    checks.push(check('mosaic-seams-pass', state.mosaic.seamReport.valid === true, {
      seamCount: state.mosaic.seamReport.seamCount,
      seamDigest: state.mosaic.seamReport.seamDigest
    }));
  }
  if (state.dependencyGraph?.nodes?.environmentArtifact?.state === ENVIRONMENT_STUDIO_DEPENDENCY_STATE.REQUIRES_REGENERATION) {
    warnings.push('Launch-to-planning is deferred until an environment adapter regenerates current/scalar/environment artifacts.');
  }
  return { errors, warnings, checks };
}

function projectStateFromProject(project = {}) {
  const domainSpec = normalizeEnvironmentStudioDomainSpec(project.domainSpec ?? {});
  const tiles = (project.tiles ?? []).map(normalizeProjectTile);
  const mosaic = project.mosaic?.manifest
    ? {
        ...project.mosaic,
        manifest: normalizeTileMosaicManifest(project.mosaic.manifest),
        seamReport: project.mosaic.seamReport ?? validateTileSeams({ tileManifests: tiles.map((tile) => tile.manifest) })
      }
    : null;
  const archetypeId = project.archetypeSpec?.id ?? tiles[0]?.archetypeId ?? 'coastalShelf';
  const archetype = archetypeById(archetypeId);
  const archetypeSpec = project.archetypeSpec
    ? normalizeBathymetryArchetypeSpec(project.archetypeSpec)
    : normalizeBathymetryArchetypeSpec({
        id: archetype.id,
        label: archetype.label,
        archetypeFamily: archetype.family,
        domainSpecDigest: domainSpec.domainSpecDigest
      });
  return refreshEnvironmentStudioSession({
    projectId: project.projectId,
    label: project.label,
    seed: project.provenance?.deterministicSeed ?? 'env-studio-r1',
    profileId: 'imported',
    archetypeId,
    domainSpec,
    archetypeSpec,
    tiles,
    mosaic,
    dependencyGraph: project.dependencyGraph,
    validationReport: project.validationReport,
    lastAction: project.dependencyGraph?.transitionLog?.[0] ?? 'project-imported'
  });
}

function normalizeSession(input = {}) {
  if (input.projectType === ENVIRONMENT_STUDIO_PROJECT_TYPE) return projectStateFromProject(input);
  const domainSpec = input.domainSpec?.type ? input.domainSpec : normalizeEnvironmentStudioDomainSpec(input.domainSpec ?? {});
  const archetypeId = archetypeById(input.archetypeId).id;
  const archetype = archetypeById(archetypeId);
  const archetypeSpec = input.archetypeSpec?.type
    ? normalizeBathymetryArchetypeSpec(input.archetypeSpec)
    : normalizeBathymetryArchetypeSpec({
        id: archetype.id,
        label: archetype.label,
        archetypeFamily: archetype.family,
        domainSpecDigest: domainSpec.domainSpecDigest
      });
  return {
    type: 'anchor.environment-studio-session',
    version: ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION,
    projectId: String(input.projectId ?? `env-studio-${stableToken(domainSpec.domainSpecDigest)}`),
    label: String(input.label ?? domainSpec.meta?.name ?? 'Environment Studio Project'),
    seed: String(input.seed ?? 'env-studio-r1'),
    profileId: String(input.profileId ?? 'compactRegional'),
    archetypeId,
    domainSpec,
    archetypeSpec,
    tiles: (Array.isArray(input.tiles) ? input.tiles : []).map(normalizeProjectTile),
    mosaic: input.mosaic?.manifest ? input.mosaic : null,
    dependencyGraph: input.dependencyGraph ?? null,
    validationReport: input.validationReport ?? null,
    lastAction: input.lastAction ?? 'normalized',
    importWarning: input.importWarning ?? null
  };
}

function edgeProfilesFromDepth(grid = []) {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  return {
    top: columns ? grid[0].map(round) : [],
    bottom: rows && columns ? grid[rows - 1].map(round) : [],
    left: grid.map((row) => round(row?.[0] ?? 0)),
    right: grid.map((row) => round(row?.[columns - 1] ?? 0))
  };
}

function tileDiagnostics(artifact = {}) {
  const depths = (artifact.bottomDepthMeters ?? []).flat().map(Number);
  const finiteDepths = depths.every(Number.isFinite);
  const wetMask = artifact.wetMask ?? [];
  const wetCellCount = wetMask.flat().filter(Boolean).length;
  const landCellCount = (artifact.landMask ?? []).flat().filter(Boolean).length;
  const waterDepths = depths.filter((value) => Number.isFinite(value) && value > 0);
  return {
    finiteDepths,
    minDepthMeters: waterDepths.length ? round(Math.min(...waterDepths)) : 0,
    maxDepthMeters: waterDepths.length ? round(Math.max(...waterDepths)) : 0,
    meanDepthMeters: waterDepths.length ? round(waterDepths.reduce((sum, value) => sum + value, 0) / waterDepths.length) : 0,
    wetCellCount,
    landCellCount,
    largestWetComponentFraction: wetCellCount ? round(largestWetComponent(wetMask) / wetCellCount) : 0,
    coastlineSegmentCount: artifact.coastline?.length ?? 0,
    validationStatus: artifact.validationReport?.status ?? 'UNKNOWN'
  };
}

function largestWetComponent(wetMask = []) {
  const rows = wetMask.length;
  const columns = wetMask[0]?.length ?? 0;
  const seen = new Set();
  let best = 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const key = `${x}:${y}`;
      if (seen.has(key) || wetMask[y]?.[x] !== true) continue;
      let count = 0;
      const stack = [[x, y]];
      seen.add(key);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        count += 1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const nextKey = `${nx}:${ny}`;
          if (nx < 0 || ny < 0 || nx >= columns || ny >= rows || seen.has(nextKey) || wetMask[ny]?.[nx] !== true) continue;
          seen.add(nextKey);
          stack.push([nx, ny]);
        }
      }
      best = Math.max(best, count);
    }
  }
  return best;
}

function extractDepthWindow(grid = [], x0 = 0, y0 = 0, width = 1, height = 1) {
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => round(grid[y0 + y]?.[x0 + x] ?? 0)));
}

function downsampleGrid(grid = [], maxColumns = 36, maxRows = 24) {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  if (!rows || !columns) return [];
  const outRows = Math.min(rows, maxRows);
  const outColumns = Math.min(columns, maxColumns);
  return Array.from({ length: outRows }, (_row, y) => {
    const sy = outRows <= 1 ? 0 : Math.round((y * (rows - 1)) / (outRows - 1));
    return Array.from({ length: outColumns }, (_cell, x) => {
      const sx = outColumns <= 1 ? 0 : Math.round((x * (columns - 1)) / (outColumns - 1));
      return round(grid[sy]?.[sx] ?? 0);
    });
  });
}

function domainDebugSummary(domain = {}) {
  return {
    id: domain.id ?? null,
    widthMeters: domain.horizontal?.widthMeters ?? null,
    heightMeters: domain.horizontal?.heightMeters ?? null,
    cellSizeMeters: domain.horizontal?.cellSizeMeters ?? null,
    rows: domain.horizontal?.rows ?? null,
    columns: domain.horizontal?.columns ?? null,
    cellCount: domain.horizontal?.cellCount ?? null,
    maxDepthMeters: domain.vertical?.maxDepthMeters ?? null,
    durationSeconds: domain.time?.durationSeconds ?? null,
    dtSeconds: domain.time?.dtSeconds ?? null
  };
}

function tileDigestListDigest(tiles = []) {
  return tiles.length ? canonicalJsonDigest(tiles.map((tile) => tile.manifest?.tileDigest ?? tile.digest ?? tile.id)) : null;
}

function tileArtifactDigest(tiles = []) {
  const digests = tiles.map((tile) => tile.bathymetryArtifact?.artifactDigest).filter(Boolean);
  return digests.length ? canonicalJsonDigest(digests) : null;
}

function node(state, artifactDigest = null, reason = null) {
  return { state, artifactDigest, reason };
}

function check(id, passed, details = {}) {
  return { id, passed: passed === true, details };
}

function withDigest(value, digestKey) {
  const payload = { ...value };
  delete payload[digestKey];
  return { ...value, [digestKey]: canonicalJsonDigest(canonicalizeJsonValue(payload)) };
}

function stableToken(digest = '') {
  return String(digest).replace(/^fnv1a32:/, '').slice(0, 10) || 'project';
}

function positiveInteger(value, fallback) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}
