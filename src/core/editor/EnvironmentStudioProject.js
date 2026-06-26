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
import {
  createRegionalMissionRecipe,
  createSyntheticOceanAtlas,
  environmentStudioOptionsFromRegionalRecipe,
  normalizeOperationalWindow
} from './SyntheticOceanAtlas.js';

export const ENVIRONMENT_STUDIO_PROJECT_TYPE = 'anchor.environment-studio-project';
export const ENVIRONMENT_STUDIO_PROJECT_VERSION = '1.0.0';
export const ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION = 'environment-studio-r1-1-project';

export const ENVIRONMENT_STUDIO_PREVIEW_MODES = Object.freeze([
  { id: 'bathymetry3d', label: '3D Bathymetry', description: 'Main regional terrain preview derived from the canonical 2.5D bottom surface.' },
  { id: 'topDownDepthMap', label: 'Top-Down Depth Map', description: 'Diagnostic source-grid depth and land/water view.', aliases: ['sourceGrid'] },
  { id: 'seamDiagnostics', label: 'Seam Diagnostics', description: 'Tile boundary and seam-status diagnostic view.', aliases: ['seams'] },
  { id: 'slopeDiagnostics', label: 'Slope Diagnostics', description: 'Diagnostic preview of slope-risk heuristics.' },
  { id: 'wetLandMask', label: 'Wet / Land Mask', description: 'Diagnostic preview of navigable water and land cells.' },
  { id: 'crossSectionProfile', label: 'Cross-Section Profile', description: 'East-west and north-south centerline bathymetry profiles.', aliases: ['depthProfile'] },
  { id: 'multiGliderSuitability', label: 'Multi-Glider Suitability', description: 'Mission-design heuristic summary for multi-glider planning.' }
]);

export const ENVIRONMENT_STUDIO_MISSION_SCALES = Object.freeze([
  { id: 'localTeaching', label: 'Local Teaching', intendedGliders: 1, durationHours: 12 },
  { id: 'singleGliderSurvey', label: 'Single-Glider Survey', intendedGliders: 1, durationHours: 24 },
  { id: 'regionalSurvey2to3', label: '2-3 Glider Regional Survey', intendedGliders: 3, durationHours: 48 },
  { id: 'fleetBenchmark4to6', label: '4-6 Glider Fleet Benchmark', intendedGliders: 6, durationHours: 120 },
  { id: 'custom', label: 'Custom', intendedGliders: 1, durationHours: 24 }
]);

export const ENVIRONMENT_STUDIO_REGIONAL_TEMPLATES = Object.freeze([
  { id: 'openShelf', label: 'Open Shelf', defaultCoastlineOrientation: 'westCoast', defaultOpenOceanBoundaries: ['north', 'south', 'east'] },
  { id: 'shelfBreakDeepBasin', label: 'Shelf Break + Deep Basin', defaultCoastlineOrientation: 'westCoast', defaultOpenOceanBoundaries: ['east', 'south'] },
  { id: 'semiEnclosedGulf', label: 'Semi-Enclosed Gulf / Basin', defaultCoastlineOrientation: 'curvedGulf', defaultOpenOceanBoundaries: ['east'] },
  { id: 'islandChain', label: 'Island Chain', defaultCoastlineOrientation: 'islandArchipelago', defaultOpenOceanBoundaries: ['north', 'south', 'east', 'west'] },
  { id: 'canyonSystem', label: 'Canyon System', defaultCoastlineOrientation: 'westCoast', defaultOpenOceanBoundaries: ['east'] },
  { id: 'riverMouthDelta', label: 'River Mouth / Delta-Inspired Coast', defaultCoastlineOrientation: 'northCoast', defaultOpenOceanBoundaries: ['south', 'east'] },
  { id: 'ridgeSillBasin', label: 'Ridge / Sill Constrained Basin', defaultCoastlineOrientation: 'curvedGulf', defaultOpenOceanBoundaries: ['east'] },
  { id: 'mixedRegionalComposite', label: 'Mixed Regional Composite', defaultCoastlineOrientation: 'curvedGulf', defaultOpenOceanBoundaries: ['east', 'south'] }
]);

export const ENVIRONMENT_STUDIO_COASTLINE_ORIENTATIONS = Object.freeze([
  { id: 'westCoast', label: 'West Coast' },
  { id: 'eastCoast', label: 'East Coast' },
  { id: 'northCoast', label: 'North Coast' },
  { id: 'southCoast', label: 'South Coast' },
  { id: 'curvedGulf', label: 'Curved / Gulf' },
  { id: 'islandArchipelago', label: 'Island / Archipelago' },
  { id: 'noLandBoundary', label: 'No Land Boundary' }
]);

export const ENVIRONMENT_STUDIO_BATHYMETRY_SOURCES = Object.freeze([
  { id: 'syntheticProcedural', label: 'Synthetic Procedural', enabled: true },
  { id: 'syntheticRegionalTemplate', label: 'Synthetic Regional Template', enabled: true },
  { id: 'importedBathymetryArtifact', label: 'Imported Bathymetry Artifact', enabled: true },
  { id: 'realPatchTemplatePlanned', label: 'Real Patch Template - Planned', enabled: false },
  { id: 'referenceComparisonOnlyPlanned', label: 'Reference Comparison Only - Planned', enabled: false }
]);

export const ENVIRONMENT_STUDIO_PREVIEW_DETAILS = Object.freeze([
  { id: 'low', label: 'Low', maxPreviewCells: 650 },
  { id: 'medium', label: 'Medium', maxPreviewCells: 1400 },
  { id: 'high', label: 'High', maxPreviewCells: 2600 }
]);

export const ENVIRONMENT_STUDIO_PANEL_SECTIONS = Object.freeze([
  { id: 'basic', label: 'Basic Authoring', defaultExpanded: true },
  { id: 'advanced', label: 'Advanced Region Controls', defaultExpanded: false },
  { id: 'diagnostics', label: 'Diagnostics', defaultExpanded: false }
]);

export const ENVIRONMENT_STUDIO_CAMERA_PRESETS = Object.freeze([
  { id: 'oblique', label: 'Oblique' },
  { id: 'topDown', label: 'Top-down' },
  { id: 'crossSection', label: 'Cross-section' }
]);

const DEFAULT_PREVIEW_CAMERA_STATE = Object.freeze({
  preset: 'oblique',
  yawDegrees: -32,
  pitchDegrees: 54,
  panX: 0,
  panY: 0,
  zoom: 1,
  verticalExaggeration: 1.6
});

export const ENVIRONMENT_STUDIO_DEFAULT_TILE_CONFIGS = Object.freeze([
  { id: 'northwest', label: 'Northwest', tileCoordinate: { row: 0, column: 0 }, archetypeId: 'riverMouthDelta', seedOffset: 'nw', featureRole: 'coastal shelf / river-mouth region' },
  { id: 'northeast', label: 'Northeast', tileCoordinate: { row: 0, column: 1 }, archetypeId: 'submarineCanyon', seedOffset: 'ne', featureRole: 'shelf break / submarine canyon' },
  { id: 'southwest', label: 'Southwest', tileCoordinate: { row: 1, column: 0 }, archetypeId: 'gulfBay', seedOffset: 'sw', featureRole: 'semi-enclosed bay / shallow gulf' },
  { id: 'southeast', label: 'Southeast', tileCoordinate: { row: 1, column: 1 }, archetypeId: 'islandSeamount', seedOffset: 'se', featureRole: 'deep basin / seamount' }
]);

const DEFAULT_FEATURE_MIX = Object.freeze({
  shelfFraction: 'medium',
  deepBasinFraction: 'medium',
  canyonDensity: 'medium',
  islandSeamountCount: 'medium',
  coastlineComplexity: 'medium',
  riverMouthDeltaInfluence: 'medium',
  ridgeSillStrength: 'medium',
  shelfBreakSharpness: 'medium',
  featureDiversity: 'high'
});

export const ENVIRONMENT_STUDIO_DOMAIN_PROFILES = Object.freeze([
  {
    id: 'tutorialCoast',
    label: 'Tutorial Cove',
    description: 'Small browser-safe domain for classroom walkthroughs.',
    horizontal: { widthMeters: 24000, heightMeters: 16000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 180 },
    time: { durationSeconds: 3600, dtSeconds: 300 },
    expectedFeatures: ['coastal shelf', 'small basin'],
    intendedGliders: 1,
    missionScale: 'localTeaching',
    regionalTemplate: 'openShelf',
    defaultFeatureMix: { ...DEFAULT_FEATURE_MIX, deepBasinFraction: 'low', canyonDensity: 'low', islandSeamountCount: 'low', featureDiversity: 'medium' },
    defaultPreviewDetail: 'high',
    performanceWarning: 'Low-cost tutorial domain.'
  },
  {
    id: 'compactRegional',
    label: 'Compact Shelf',
    description: 'Balanced regional tile for quick bathymetry authoring.',
    horizontal: { widthMeters: 48000, heightMeters: 32000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 240 },
    time: { durationSeconds: 5400, dtSeconds: 300 },
    expectedFeatures: ['coastal shelf', 'shelf break'],
    intendedGliders: 1,
    missionScale: 'singleGliderSurvey',
    regionalTemplate: 'shelfBreakDeepBasin',
    defaultFeatureMix: { ...DEFAULT_FEATURE_MIX, islandSeamountCount: 'low', ridgeSillStrength: 'low' },
    defaultPreviewDetail: 'high',
    performanceWarning: 'Good default for browser tests.'
  },
  {
    id: 'regionalShelf',
    label: 'Coastal Canyon',
    description: 'Larger shelf/canyon domain that remains below browser limits.',
    horizontal: { widthMeters: 80000, heightMeters: 48000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 280 },
    time: { durationSeconds: 7200, dtSeconds: 300 },
    expectedFeatures: ['coastal shelf', 'shelf break', 'submarine canyon'],
    intendedGliders: 2,
    missionScale: 'regionalSurvey2to3',
    regionalTemplate: 'canyonSystem',
    defaultFeatureMix: { ...DEFAULT_FEATURE_MIX, canyonDensity: 'high', shelfBreakSharpness: 'high', islandSeamountCount: 'low' },
    defaultPreviewDetail: 'medium',
    performanceWarning: 'Moderate regional preview.'
  },
  {
    id: 'islandChain',
    label: 'Island Chain',
    description: 'Island/seamount survey region with separated terrain features.',
    horizontal: { widthMeters: 90000, heightMeters: 60000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 340 },
    time: { durationSeconds: 9000, dtSeconds: 450 },
    expectedFeatures: ['islands', 'seamounts', 'open-water corridors'],
    intendedGliders: 2,
    missionScale: 'regionalSurvey2to3',
    regionalTemplate: 'islandChain',
    defaultFeatureMix: { ...DEFAULT_FEATURE_MIX, islandSeamountCount: 'high', coastlineComplexity: 'high', riverMouthDeltaInfluence: 'low' },
    defaultPreviewDetail: 'medium',
    performanceWarning: 'Uses preview decimation on smaller screens.'
  },
  {
    id: 'semiEnclosedGulf',
    label: 'Semi-Enclosed Gulf',
    description: 'Regional gulf/bay setting with shelf, bay, river-mouth, and basin context.',
    horizontal: { widthMeters: 140000, heightMeters: 90000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 360 },
    time: { durationSeconds: 12600, dtSeconds: 600 },
    expectedFeatures: ['gulf/bay', 'river mouth', 'shelf', 'deep basin'],
    intendedGliders: 3,
    missionScale: 'regionalSurvey2to3',
    regionalTemplate: 'semiEnclosedGulf',
    defaultFeatureMix: { ...DEFAULT_FEATURE_MIX, riverMouthDeltaInfluence: 'high', coastlineComplexity: 'high', deepBasinFraction: 'medium' },
    defaultPreviewDetail: 'medium',
    performanceWarning: 'Large source grid; preview mesh is decimated.'
  },
  {
    id: 'shelfToBasinTransect',
    label: 'Shelf-to-Basin Transect',
    description: 'Wide shelf-to-deep-basin transect for multi-glider route tradeoffs.',
    horizontal: { widthMeters: 160000, heightMeters: 90000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 420 },
    time: { durationSeconds: 14400, dtSeconds: 600 },
    expectedFeatures: ['shelf', 'shelf break', 'canyon', 'deep basin'],
    intendedGliders: 3,
    missionScale: 'regionalSurvey2to3',
    regionalTemplate: 'shelfBreakDeepBasin',
    defaultFeatureMix: { ...DEFAULT_FEATURE_MIX, deepBasinFraction: 'high', canyonDensity: 'high', shelfBreakSharpness: 'high' },
    defaultPreviewDetail: 'medium',
    performanceWarning: 'Large source grid; preview mesh is decimated.'
  },
  {
    id: 'largeRegionalSurvey',
    label: 'Large Regional Survey',
    description: 'Upper R1.1 regional preview profile with LOD/decimated terrain preview.',
    horizontal: { widthMeters: 240000, heightMeters: 160000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 520 },
    time: { durationSeconds: 21600, dtSeconds: 900 },
    expectedFeatures: ['coastal shelf', 'canyon', 'island/seamount', 'deep basin', 'open-water corridors'],
    intendedGliders: 4,
    missionScale: 'fleetBenchmark4to6',
    regionalTemplate: 'mixedRegionalComposite',
    defaultFeatureMix: { ...DEFAULT_FEATURE_MIX, deepBasinFraction: 'high', canyonDensity: 'high', islandSeamountCount: 'high', featureDiversity: 'high' },
    defaultPreviewDetail: 'low',
    performanceWarning: 'Large source grid; preview mesh is decimated and export preserves source grid.'
  },
  {
    id: 'largeRegional',
    label: 'Large Regional Survey (Legacy Alias)',
    description: 'Compatibility alias for the R1 large regional profile.',
    horizontal: { widthMeters: 120000, heightMeters: 80000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 320 },
    time: { durationSeconds: 10800, dtSeconds: 600 },
    expectedFeatures: ['coastal shelf', 'deep basin'],
    intendedGliders: 2,
    missionScale: 'regionalSurvey2to3',
    regionalTemplate: 'mixedRegionalComposite',
    defaultFeatureMix: DEFAULT_FEATURE_MIX,
    defaultPreviewDetail: 'medium',
    performanceWarning: 'Legacy profile retained for imported R1 projects.'
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'User-authored domain size, resolution, template, and feature mix.',
    horizontal: { widthMeters: 80000, heightMeters: 48000, cellSizeMeters: 1000 },
    vertical: { maxDepthMeters: 280 },
    time: { durationSeconds: 7200, dtSeconds: 300 },
    expectedFeatures: ['custom synthetic bathymetry'],
    intendedGliders: 1,
    missionScale: 'custom',
    regionalTemplate: 'mixedRegionalComposite',
    defaultFeatureMix: DEFAULT_FEATURE_MIX,
    defaultPreviewDetail: 'medium',
    performanceWarning: 'Custom domains still obey browser source-grid and preview-grid limits.'
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
  const recipe = normalizeRegionalRecipe(options, profile);
  const atlas = normalizeAtlas(options.atlas ?? {
    presetId: options.atlasPreset ?? options.atlasPresetId,
    seed: options.atlasSeed ?? options.seed ?? recipe.randomization?.worldSeed
  });
  const selectedOperationalWindow = normalizeOperationalWindow(options.selectedOperationalWindow ?? options.selectedWindow ?? {
    windowPresetId: options.windowPresetId ?? 'semiEnclosedGulfSurvey',
    selectedBy: 'preset'
  }, atlas);
  const regionalMissionRecipe = normalizeRegionalMissionRecipe(options.regionalMissionRecipe ?? {
    atlas,
    selectedWindow: selectedOperationalWindow,
    seed: options.seed ?? recipe.randomization?.worldSeed
  });
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
    environmentType: recipe.environmentType,
    missionScale: recipe.missionScale,
    intendedGliders: recipe.intendedGliders,
    estimatedMissionDuration: recipe.estimatedMissionDuration,
    bathymetrySource: recipe.bathymetrySource,
    regionalTemplate: recipe.regionalTemplate,
    coastlineOrientation: recipe.coastlineOrientation,
    openOceanBoundaries: recipe.openOceanBoundaries,
    featureMix: recipe.featureMix,
    randomization: recipe.randomization,
    studioStage: normalizeStudioStage(options.studioStage),
    atlas,
    atlasPreset: atlas.atlasPreset,
    atlasSeed: atlas.seed,
    selectedOperationalWindow,
    regionalMissionRecipe,
    previewMode: previewModeById(options.previewMode ?? recipe.previewMode).id,
    previewDetail: previewDetailById(options.previewDetail ?? recipe.previewDetail).id,
    simplifiedPanelState: normalizeSimplifiedPanelState(options.simplifiedPanelState),
    expandedAdvancedSections: normalizeExpandedAdvancedSections(options.expandedAdvancedSections),
    previewCameraState: normalizePreviewCameraState(options.previewCameraState),
    tileConfigs: normalizeTileConfigs(options.tileConfigs ?? recipe.tileConfigs, { seed: options.seed ?? 'env-studio-r1', featureMix: recipe.featureMix, regionalTemplate: recipe.regionalTemplate }),
    selectedObject: normalizeSelectedObject(options.selectedObject),
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

export function setEnvironmentStudioPreviewMode(sessionInput = {}, previewModeId = 'bathymetry3d') {
  const session = normalizeSession(sessionInput);
  return refreshEnvironmentStudioSession({
    ...session,
    previewMode: previewModeById(previewModeId).id,
    lastAction: 'preview-mode-changed'
  });
}

export function setEnvironmentStudioPreviewCameraState(sessionInput = {}, patch = {}) {
  const session = normalizeSession(sessionInput);
  return refreshEnvironmentStudioSession({
    ...session,
    previewCameraState: normalizePreviewCameraState({
      ...session.previewCameraState,
      ...(patch ?? {})
    }),
    lastAction: 'preview-camera-changed'
  });
}

export function setEnvironmentStudioAtlasPreset(sessionInput = {}, atlasPreset = 'mixedRegionalWorld', options = {}) {
  const session = normalizeSession(sessionInput);
  const atlas = normalizeAtlas({
    presetId: atlasPreset,
    seed: options.seed ?? session.atlasSeed ?? session.seed
  });
  const selectedOperationalWindow = normalizeOperationalWindow({
    ...(session.selectedOperationalWindow ?? {}),
    selectedBy: 'preset-retained'
  }, atlas);
  const regionalMissionRecipe = createRegionalMissionRecipe({
    atlas,
    selectedWindow: selectedOperationalWindow,
    seed: `${atlas.seed}:${selectedOperationalWindow.windowId}`
  });
  return refreshEnvironmentStudioSession({
    ...session,
    studioStage: 'atlasWindow',
    atlas,
    atlasPreset: atlas.atlasPreset,
    atlasSeed: atlas.seed,
    selectedOperationalWindow,
    regionalMissionRecipe,
    lastAction: 'atlas-preset-changed'
  });
}

export function selectEnvironmentStudioOperationalWindow(sessionInput = {}, windowPresetId = 'semiEnclosedGulfSurvey') {
  const session = normalizeSession(sessionInput);
  const selectedOperationalWindow = normalizeOperationalWindow({ windowPresetId, selectedBy: 'preset' }, session.atlas);
  const regionalMissionRecipe = createRegionalMissionRecipe({
    atlas: session.atlas,
    selectedWindow: selectedOperationalWindow,
    seed: `${session.atlasSeed}:${selectedOperationalWindow.windowId}`
  });
  return refreshEnvironmentStudioSession({
    ...session,
    studioStage: 'atlasWindow',
    selectedOperationalWindow,
    regionalMissionRecipe,
    lastAction: 'operational-window-selected'
  });
}

export function patchEnvironmentStudioOperationalWindow(sessionInput = {}, patch = {}) {
  const session = normalizeSession(sessionInput);
  const selectedOperationalWindow = normalizeOperationalWindow({
    ...(session.selectedOperationalWindow ?? {}),
    ...patch,
    selectedBy: patch.selectedBy ?? 'controls'
  }, session.atlas);
  const regionalMissionRecipe = createRegionalMissionRecipe({
    atlas: session.atlas,
    selectedWindow: selectedOperationalWindow,
    seed: `${session.atlasSeed}:${selectedOperationalWindow.windowId}`
  });
  return refreshEnvironmentStudioSession({
    ...session,
    studioStage: 'atlasWindow',
    selectedOperationalWindow,
    regionalMissionRecipe,
    lastAction: 'operational-window-adjusted'
  });
}

export function randomizeEnvironmentStudioAtlasSeed(sessionInput = {}) {
  const session = normalizeSession(sessionInput);
  const nextSeed = `${session.atlasPreset}:${stableToken(canonicalJsonDigest({
    previous: session.atlasSeed,
    window: session.selectedOperationalWindow?.windowDigest,
    project: session.projectId
  }))}`;
  return setEnvironmentStudioAtlasPreset(session, session.atlasPreset, { seed: nextSeed });
}

export function generateEnvironmentStudioRegionFromAtlasWindow(sessionInput = {}, options = {}) {
  const session = normalizeSession(sessionInput);
  const atlas = normalizeAtlas(options.atlas ?? session.atlas);
  const selectedOperationalWindow = options.selectedOperationalWindow?.windowDigest
    ? options.selectedOperationalWindow
    : normalizeOperationalWindow(options.selectedOperationalWindow ?? session.selectedOperationalWindow, atlas);
  const regionalMissionRecipe = createRegionalMissionRecipe({
    atlas,
    selectedWindow: selectedOperationalWindow,
    seed: options.seed ?? `${atlas.seed}:${selectedOperationalWindow.windowId}`
  });
  const recipeOptions = environmentStudioOptionsFromRegionalRecipe(regionalMissionRecipe);
  const prepared = createEnvironmentStudioSession({
    ...recipeOptions,
    projectId: session.projectId,
    atlas,
    atlasPreset: atlas.atlasPreset,
    atlasSeed: atlas.seed,
    selectedOperationalWindow,
    regionalMissionRecipe,
    studioStage: 'regionalDetail',
    selectedObject: { type: 'region', id: 'region' },
    previewMode: 'bathymetry3d',
    previewCameraState: session.previewCameraState,
    simplifiedPanelState: session.simplifiedPanelState,
    expandedAdvancedSections: session.expandedAdvancedSections
  });
  return createEnvironmentStudioMosaic(prepared, { seed: regionalMissionRecipe.randomSeed });
}

export function environmentStudioPanelViewModel(sessionInput = {}) {
  const session = refreshEnvironmentStudioSession(normalizeSession(sessionInput));
  const state = normalizeSimplifiedPanelState(session.simplifiedPanelState);
  const expandedAdvancedSections = normalizeExpandedAdvancedSections(session.expandedAdvancedSections);
  return {
    type: 'anchor.environment-studio.panel-view-model',
    sections: ENVIRONMENT_STUDIO_PANEL_SECTIONS.map((section) => ({
      ...section,
      expanded: section.id === 'basic'
        ? state.basicExpanded !== false
        : section.id === 'advanced'
          ? state.advancedExpanded === true
          : state.diagnosticsExpanded === true
    })),
    expandedAdvancedSections,
    sourceTilesVisibleByDefault: false,
    primaryWorkflow: 'basic-authoring',
    diagnosticsHiddenByDefault: state.diagnosticsExpanded !== true,
    advancedHiddenByDefault: state.advancedExpanded !== true,
    primaryPreviewLabel: 'Regional 3D Bathymetry Preview',
    previewCameraState: session.previewCameraState,
    previewBudget: session.previewBudget
  };
}

export function updateEnvironmentStudioRegionalRecipe(sessionInput = {}, patch = {}) {
  const session = normalizeSession(sessionInput);
  const profile = domainProfileById(patch.environmentType ?? patch.profileId ?? session.environmentType ?? session.profileId);
  const recipe = normalizeRegionalRecipe({
    ...session,
    ...patch,
    featureMix: {
      ...(session.featureMix ?? {}),
      ...(patch.featureMix ?? {})
    },
    randomization: {
      ...(session.randomization ?? {}),
      ...(patch.randomization ?? {}),
      locks: {
        ...(session.randomization?.locks ?? {}),
        ...(patch.randomization?.locks ?? {})
      }
    }
  }, profile);
  return refreshEnvironmentStudioSession({
    ...session,
    ...recipe,
    profileId: patch.profileId ?? session.profileId,
    previewMode: previewModeById(patch.previewMode ?? session.previewMode).id,
    previewDetail: previewDetailById(patch.previewDetail ?? session.previewDetail).id,
    tileConfigs: normalizeTileConfigs(patch.tileConfigs ?? session.tileConfigs ?? recipe.tileConfigs, {
      seed: patch.seed ?? session.seed,
      featureMix: recipe.featureMix,
      regionalTemplate: recipe.regionalTemplate
    }),
    lastAction: 'regional-recipe-changed'
  });
}

export function selectEnvironmentStudioObject(sessionInput = {}, selection = {}) {
  const session = normalizeSession(sessionInput);
  return refreshEnvironmentStudioSession({
    ...session,
    selectedObject: normalizeSelectedObject(selection),
    lastAction: 'selected-object-changed'
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
  const tileConfigs = normalizeTileConfigs(options.tileConfigs ?? session.tileConfigs, {
    seed,
    featureMix: session.featureMix,
    regionalTemplate: session.regionalTemplate
  });
  const tileRows = positiveInteger(options.tileRows, Math.max(5, Math.floor((session.domainSpec.horizontal.rows + 1) / 2)));
  const tileColumns = positiveInteger(options.tileColumns, Math.max(5, Math.floor((session.domainSpec.horizontal.columns + 1) / 2)));
  const tileSources = tileConfigs.slice(0, 4).map((config) => ({
    config,
    archetype: archetypeById(config.archetypeId),
    depthMeters: bathymetryForArchetype(config.archetypeId, {
      seed: `${seed}:regional:${config.id}:${config.seedOffset}`,
      width: tileColumns,
      height: tileRows,
      maxDepthMeters: session.domainSpec.vertical.maxDepthMeters
    }).depthMeters
  }));
  shapeRegionalMosaicFeatures(tileSources, session);
  blendRegionalTileEdges(tileSources);
  const tiles = tileSources.map(({ config, archetype, depthMeters }) => {
    const bathymetry = createBathymetryField({
      seed: `${seed}:regional:${config.id}:${config.seedOffset}:blended`,
      width: tileColumns,
      height: tileRows,
      maxDepthMeters: session.domainSpec.vertical.maxDepthMeters,
      features: archetype.featureIds,
      depthMeters,
      synthetic: true
    });
    return createTileFromBathymetry({
      id: `env-studio-mosaic-r${config.tileCoordinate.row}-c${config.tileCoordinate.column}`,
      tileCoordinate: config.tileCoordinate,
      domainSpec: session.domainSpec,
      archetypeSpec: session.archetypeSpec,
      archetypeId: archetype.id,
      seed: `${seed}:${config.seedOffset}`,
      rows: tileRows,
      columns: tileColumns,
      eastMeters: session.domainSpec.horizontal.widthMeters / 2,
      northMeters: session.domainSpec.horizontal.heightMeters / 2,
      bathymetry,
      tileConfig: config,
      featureRole: config.featureRole
    });
  });
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
      source: 'environment-studio-r1-1-regional-authoring',
      deterministicSeed: seed,
      operations: [
        { id: 'create-2x2-regional-mosaic', type: 'deterministic-multi-archetype-regional-mosaic', target: 'bathymetryTiles' },
        { id: 'shape-regional-basin-features', type: 'deterministic-region-scale-feature-overlay', target: 'bottomDepthMeters' },
        { id: 'blend-shared-tile-edges', type: 'edge-profile-blend', target: 'tileSeams' }
      ]
    }
  });
  const mosaic = withDigest({
    type: 'anchor.environment-studio.mosaic',
    version: ENVIRONMENT_STUDIO_PROJECT_MODULE_VERSION,
    id: mosaicManifest.id,
    manifest: mosaicManifest,
    seamReport,
    regionalTemplate: session.regionalTemplate,
    featureMix: session.featureMix,
    tileConfigs,
    seamBlendPolicy: {
      mode: 'shared-edge-average',
      deterministic: true,
      preservesSourceGridExport: true
    },
    tileIds: tiles.map((tile) => tile.id),
    sourceDigest: canonicalJsonDigest({
      seed,
      regionalTemplate: session.regionalTemplate,
      featureMix: session.featureMix,
      tileConfigs,
      tileRows,
      tileColumns,
      sourceFieldDigest: canonicalJsonDigest(tileSources.map((tile) => tile.depthMeters))
    })
  }, 'digest');
  return refreshEnvironmentStudioSession({
    ...session,
    seed,
    archetypeId: tiles[0]?.archetypeId ?? session.archetypeId,
    tileConfigs,
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
    environmentType: session.environmentType,
    missionScale: session.missionScale,
    intendedGliders: session.intendedGliders,
    estimatedMissionDuration: session.estimatedMissionDuration,
    bathymetrySource: session.bathymetrySource,
    regionalTemplate: session.regionalTemplate,
    coastlineOrientation: session.coastlineOrientation,
    openOceanBoundaries: session.openOceanBoundaries,
    featureMix: session.featureMix,
    randomization: session.randomization,
    studioStage: session.studioStage,
    atlas: session.atlas,
    atlasPreset: session.atlasPreset,
    atlasSeed: session.atlasSeed,
    selectedOperationalWindow: session.selectedOperationalWindow,
    regionalMissionRecipe: session.regionalMissionRecipe,
    previewMode: session.previewMode,
    previewDetail: session.previewDetail,
    sourceGridShape: session.sourceGridShape,
    previewGridShape: session.previewGridShape,
    previewDecimation: session.previewDecimation,
    previewBudget: session.previewBudget,
    regionalFeatureSummary: session.regionalFeatureSummary,
    featureRecords: session.featureRecords,
    multiGliderSuitability: session.multiGliderSuitability,
    selectedObject: session.selectedObject,
    domainSpec: session.domainSpec,
    archetypeSpec: session.archetypeSpec,
    tileConfigs: session.tileConfigs,
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
    noncanonicalUiMetadata: {
      simplifiedPanelState: session.simplifiedPanelState,
      expandedAdvancedSections: session.expandedAdvancedSections,
      previewCameraState: session.previewCameraState,
      note: 'UI metadata preserves authoring panel/camera state only. It is not a simulation, scoring, hidden-truth, or renderer-state input.'
    },
    packageVersions: environmentStudioPackageVersions()
  };
  return withProjectDigest(projectBase, 'projectDigest');
}

export function normalizeEnvironmentStudioProject(input = {}) {
  const source = input.projectType === ENVIRONMENT_STUDIO_PROJECT_TYPE ? input : (input.project ?? input);
  const session = createEnvironmentStudioSession({
    projectId: source.projectId,
    label: source.label ?? source.domainSpec?.meta?.name,
    seed: source.provenance?.deterministicSeed ?? source.seed ?? 'env-studio-r1',
    domainSpec: source.domainSpec ?? source.domain ?? {},
    archetypeId: source.archetypeId ?? source.archetypeSpec?.id ?? source.tiles?.[0]?.archetypeId ?? 'coastalShelf',
    environmentType: source.environmentType,
    missionScale: source.missionScale,
    intendedGliders: source.intendedGliders,
    estimatedMissionDuration: source.estimatedMissionDuration,
    bathymetrySource: source.bathymetrySource,
    regionalTemplate: source.regionalTemplate,
    coastlineOrientation: source.coastlineOrientation,
    openOceanBoundaries: source.openOceanBoundaries,
    featureMix: source.featureMix,
    randomization: source.randomization,
    studioStage: source.studioStage,
    atlas: source.atlas,
    atlasPreset: source.atlasPreset,
    atlasSeed: source.atlasSeed,
    selectedOperationalWindow: source.selectedOperationalWindow,
    regionalMissionRecipe: source.regionalMissionRecipe,
    previewMode: source.previewMode,
    previewDetail: source.previewDetail,
    simplifiedPanelState: source.noncanonicalUiMetadata?.simplifiedPanelState ?? source.simplifiedPanelState,
    expandedAdvancedSections: source.noncanonicalUiMetadata?.expandedAdvancedSections ?? source.expandedAdvancedSections,
    previewCameraState: source.noncanonicalUiMetadata?.previewCameraState ?? source.previewCameraState,
    tileConfigs: source.tileConfigs,
    selectedObject: source.selectedObject
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
    tileConfigs: normalizeTileConfigs(source.tileConfigs ?? session.tileConfigs, {
      seed: source.provenance?.deterministicSeed ?? source.seed ?? 'env-studio-r1',
      featureMix: source.featureMix ?? session.featureMix,
      regionalTemplate: source.regionalTemplate ?? session.regionalTemplate
    }),
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
  const validated = withProjectDigest({ ...project, validationReport }, 'projectDigest');
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
  const sourceGridShape = deriveSourceGridShape(session.domainSpec);
  const previewDecimation = derivePreviewDecimation(sourceGridShape, session.previewDetail);
  const previewGridShape = derivePreviewGridShape(sourceGridShape, previewDecimation);
  const regionalFeatureSummary = computeRegionalFeatureSummary(session, sourceGridShape);
  const featureRecords = computeRegionalFeatureRecords(session, regionalFeatureSummary);
  const previewBudget = computePreviewBudget(sourceGridShape, previewGridShape, previewDecimation);
  const multiGliderSuitability = computeMultiGliderSuitability(session, regionalFeatureSummary, sourceGridShape, previewBudget);
  const dependencyGraph = dependencyGraphForState(session);
  const validationReport = validationReportForState({
    ...session,
    sourceGridShape,
    previewGridShape,
    previewDecimation,
    previewBudget,
    regionalFeatureSummary,
    featureRecords,
    multiGliderSuitability,
    dependencyGraph
  });
  return {
    ...session,
    sourceGridShape,
    previewGridShape,
    previewDecimation,
    previewBudget,
    regionalFeatureSummary,
    featureRecords,
    multiGliderSuitability,
    dependencyGraph,
    validationReport
  };
}

export function environmentStudioInspectorViewModel(sessionInput = {}) {
  const session = refreshEnvironmentStudioSession(normalizeSession(sessionInput));
  const selected = normalizeSelectedObject(session.selectedObject);
  if (selected.type === 'tile') {
    const tile = session.tiles.find((entry) => entry.id === selected.id) ?? session.tiles[0] ?? null;
    return {
      type: 'Selected Source Tile',
      objectType: 'tile',
      objectId: tile?.id ?? selected.id,
      title: tile ? `${tile.id} provenance component` : 'Tile not generated',
      status: tile ? tile.diagnostics?.validationStatus ?? 'CURRENT' : 'NOT_GENERATED',
      properties: tile ? [
        ['Legacy Label', 'Selected Tile'],
        ['Source Tile Meaning', 'Provenance component for the synthetic regional surface, not a depth slab.'],
        ['Tile ID', tile.id],
        ['Archetype', archetypeById(tile.archetypeId).label],
        ['Feature Role', tile.featureRole],
        ['Seed', tile.manifest?.editProvenance?.deterministicSeed],
        ['Size', `${tile.manifest?.cells?.columns ?? 0} x ${tile.manifest?.cells?.rows ?? 0}`],
        ['Depth Min / Mean / Max', `${formatMetric(tile.diagnostics?.minDepthMeters)} / ${formatMetric(tile.diagnostics?.meanDepthMeters)} / ${formatMetric(tile.diagnostics?.maxDepthMeters)} m`],
        ['Wet Fraction', formatMetric(tileFraction(tile, 'wet'))],
        ['Land Fraction', formatMetric(tileFraction(tile, 'land'))],
        ['Largest Wet Component', formatMetric(tile.diagnostics?.largestWetComponentFraction)],
        ['Edge Digest', tile.manifest?.edgeProfileDigest]
      ] : [['Status', 'Generate a regional mosaic or tile before selecting tile properties.']],
      actions: [
        { id: 'regenerateTile', label: 'Regenerate tile', enabled: true },
        { id: 'changeArchetype', label: 'Change archetype', enabled: true },
        { id: 'rotateFlip', label: 'Rotate / flip', enabled: false, reason: 'Planned after regional preview validation.' },
        { id: 'lockEdges', label: 'Lock edges', enabled: false, reason: 'Planned with sculpting and seam editing.' },
        { id: 'blendSeams', label: 'Blend seams', enabled: true }
      ]
    };
  }
  if (selected.type === 'seam') {
    const seam = seamById(session.mosaic?.seamReport, selected.id) ?? session.mosaic?.seamReport?.seams?.[0] ?? null;
    return {
      type: 'Selected Seam',
      objectType: 'seam',
      objectId: seam ? seamId(seam) : selected.id,
      title: seam ? `${seam.fromTileId} ${seam.edgePair} ${seam.toTileId}` : 'No adjacent seam selected',
      status: seam?.passed ? 'PASS' : seam ? 'FAIL' : 'NOT_GENERATED',
      properties: seam ? [
        ['Between', `${seam.fromTileId} and ${seam.toTileId}`],
        ['Depth Delta Max', `${formatMetric(seam.maxDeltaMeters)} m`],
        ['Depth Delta Mean', `${formatMetric(seam.meanDeltaMeters)} m`],
        ['Wet-Mask Continuity', 'tracked by shared edge depths in R1.1'],
        ['Blend Width', '1 shared edge'],
        ['Suggested Repair', seam.passed ? 'No repair required.' : 'Regenerate or blend this shared edge.']
      ] : [['Status', 'Generate a 2x2 regional mosaic to inspect seams.']],
      actions: [
        { id: 'lockSeam', label: 'Lock seam', enabled: false, reason: 'Locking is planned with edit brushes.' },
        { id: 'blendSeam', label: 'Blend seam', enabled: true }
      ]
    };
  }
  if (selected.type === 'validationIssue') {
    const issueKey = String(selected.id ?? 'warning:0').split(':').slice(1).join(':');
    const issue = selected.id?.startsWith('error:')
      ? session.validationReport?.errors?.[Number(selected.id.split(':')[1])]
      : session.validationReport?.warnings?.[Number(String(selected.id ?? 'warning:0').split(':')[1])]
        ?? (issueKey ? `${labelize(issueKey)} heuristic check` : null);
    return {
      type: 'Selected Validation Issue',
      objectType: 'validationIssue',
      objectId: selected.id,
      title: issue ?? 'No validation issue selected',
      status: issue ? 'NEEDS_VALIDATION' : session.validationReport?.status ?? 'EMPTY',
      properties: [
        ['Issue Code', selected.id],
        ['Severity', selected.id?.startsWith('error:') ? 'Failure' : 'Warning'],
        ['Affected Region', 'Environment Studio project'],
        ['Why It Matters', issue ?? 'Validation messages explain export and launch readiness.'],
        ['Suggested Repair', 'Adjust domain, regenerate regional bathymetry, or inspect dependency state.'],
        ['Blocks Export', selected.id?.startsWith('error:') ? 'yes' : 'no']
      ],
      actions: []
    };
  }
  if (selected.type === 'dependency') {
    const node = session.dependencyGraph?.nodes?.[selected.id] ?? session.dependencyGraph?.nodes?.environmentArtifact;
    return {
      type: 'Selected Dependency',
      objectType: 'dependency',
      objectId: selected.id ?? 'environmentArtifact',
      title: labelize(selected.id ?? 'environmentArtifact'),
      status: node?.state ?? 'NOT_GENERATED',
      properties: [
        ['State', node?.state ?? 'NOT_GENERATED'],
        ['Digest', node?.artifactDigest ?? 'none'],
        ['Reason', node?.reason ?? 'Dependency state is derived from generated bathymetry and validation.'],
        ['Launch Impact', selected.id === 'environmentArtifact' ? 'Launch to Planning remains disabled in R1.1.' : 'No mission simulation change in R1.1.']
      ],
      actions: []
    };
  }
  if (selected.type === 'feature') {
    const record = session.featureRecords.find((entry) => entry.featureId === selected.id)
      ?? session.featureRecords[0]
      ?? null;
    return {
      type: 'Selected Feature',
      objectType: 'feature',
      objectId: record?.featureId ?? selected.id,
      title: record?.label ?? labelize(selected.id ?? 'regional feature summary'),
      status: record ? 'CURRENT' : 'SUMMARY',
      properties: record ? [
        ['Feature ID', record.featureId],
        ['Feature Type', labelize(record.type)],
        ['Approx Center', `${formatMetric(record.approximateCenterMeters.eastMeters)} E, ${formatMetric(record.approximateCenterMeters.northMeters)} N m`],
        ['Area / Length', record.areaSquareMeters != null ? `${formatMetric(record.areaSquareMeters)} m2` : `${formatMetric(record.lengthMeters)} m`],
        ['Depth Range', `${formatMetric(record.depthRangeMeters[0])}-${formatMetric(record.depthRangeMeters[1])} m`],
        ['Slope Range', `${formatMetric(record.slopeRangeMetersPerCell[0])}-${formatMetric(record.slopeRangeMetersPerCell[1])} m/cell`],
        ['Confidence', formatMetric(record.confidence)],
        ['Related Source Tiles', record.relatedTileIds.join(', ') || 'none'],
        ['Validation Notes', record.validationNotes],
        ['Individual Editing', 'Planned after regional preview validation.']
      ] : [
        ['Feature Families', (session.regionalFeatureSummary?.featureFamilies ?? []).join(', ') || 'not generated'],
        ['Feature Diversity Score', formatMetric(session.regionalFeatureSummary?.featureDiversityScore)]
      ],
      actions: [
        { id: 'editFeature', label: 'Edit individual feature', enabled: false, reason: 'Feature-level editing is planned.' }
      ]
    };
  }
  return {
    type: 'Selected Region',
    objectType: 'region',
    objectId: 'region',
    title: session.label,
    status: session.validationReport?.status ?? 'EMPTY',
    properties: [
      ['Region Type', domainProfileById(session.environmentType).label],
      ['Mission Scale', missionScaleById(session.missionScale).label],
      ['Intended Gliders', session.intendedGliders],
      ['Domain Size', `${formatMetric(session.domainSpec.horizontal.widthMeters / 1000)} x ${formatMetric(session.domainSpec.horizontal.heightMeters / 1000)} km`],
      ['Resolution', `${session.domainSpec.horizontal.cellSizeMeters} m source cells`],
      ['Regional Template', regionalTemplateById(session.regionalTemplate).label],
      ['Feature Mix', featureMixLabel(session.featureMix)],
      ['Detected Feature Records', session.featureRecords.length],
      ['Preview Budget', session.previewBudget?.label ?? 'Not measured'],
      ['Validation Status', session.validationReport?.status ?? 'EMPTY'],
      ['Suitability', session.multiGliderSuitability?.status ?? 'WARN']
    ],
    actions: []
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
    environmentType: session.environmentType,
    missionScale: session.missionScale,
    intendedGliders: session.intendedGliders,
    atlasMode: true,
    studioStage: session.studioStage,
    atlasPreset: session.atlasPreset,
    atlasSeed: session.atlasSeed,
    selectedWindow: compactSelectedWindow(session.selectedOperationalWindow),
    detectedContext: session.selectedOperationalWindow?.detectedContext ?? null,
    regionalMissionRecipeDigest: session.regionalMissionRecipe?.recipeDigest ?? null,
    bathymetryRegime: session.regionalMissionRecipe?.bathymetryRegime ?? session.selectedOperationalWindow?.bathymetryRegime ?? null,
    currentRegime: session.regionalMissionRecipe?.currentRegime ?? session.selectedOperationalWindow?.currentRegime ?? [],
    scalarRegime: session.regionalMissionRecipe?.scalarRegime ?? session.selectedOperationalWindow?.scalarRegime ?? [],
    missionDuration: session.regionalMissionRecipe?.missionDuration ?? null,
    regionalTemplate: session.regionalTemplate,
    coastlineOrientation: session.coastlineOrientation,
    openOceanBoundaries: session.openOceanBoundaries,
    featureMix: session.featureMix,
    previewMode: session.previewMode,
    sourceGridShape: session.sourceGridShape,
    previewGridShape: session.previewGridShape,
    previewDecimation: session.previewDecimation,
    previewBudget: session.previewBudget,
    previewCameraState: session.previewCameraState,
    panelViewModel: environmentStudioPanelViewModel(session),
    selectedObjectType: session.selectedObject?.type ?? 'region',
    selectedObjectId: session.selectedObject?.id ?? 'region',
    regionalFeatureSummary: session.regionalFeatureSummary,
    featureRecords: session.featureRecords,
    featureRecordCount: session.featureRecords.length,
    multiGliderSuitability: session.multiGliderSuitability,
    domainSpec: domainDebugSummary(session.domainSpec),
    domainDigest: session.domainSpec?.domainSpecDigest ?? null,
    tileCount: session.tiles.length,
    tileArchetypes: session.tiles.map((tile) => tile.archetypeId),
    tileSeeds: session.tiles.map((tile) => tile.manifest?.editProvenance?.deterministicSeed).filter(Boolean),
    tileDigests: session.tiles.map((tile) => tile.manifest?.tileDigest ?? tile.digest).filter(Boolean),
    mosaicDigest: session.mosaic?.manifest?.mosaicDigest ?? session.mosaic?.digest ?? null,
    projectDigest: project.projectDigest,
    validationStatus: session.validationReport?.status ?? 'EMPTY',
    warningCount: warnings.length,
    failureCount: failures.length,
    dependencyGraph: session.dependencyGraph,
    terrainPreviewRendererCount: 0,
    terrainPreviewRafCount: 0,
    stalePreviewObjects: 0,
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
    environmentType: session.environmentType,
    missionScale: session.missionScale,
    intendedGliders: session.intendedGliders,
    studioStage: session.studioStage,
    atlasPreset: session.atlasPreset,
    atlasSeed: session.atlasSeed,
    selectedWindow: compactSelectedWindow(session.selectedOperationalWindow),
    regionalMissionRecipeDigest: session.regionalMissionRecipe?.recipeDigest ?? null,
    regionalTemplate: session.regionalTemplate,
    previewMode: session.previewMode,
    sourceGridShape: session.sourceGridShape,
    previewGridShape: session.previewGridShape,
    previewDecimation: session.previewDecimation,
    previewBudget: session.previewBudget,
    previewCameraState: session.previewCameraState,
    regionalFeatureSummary: session.regionalFeatureSummary,
    featureRecords: session.featureRecords,
    multiGliderSuitability: session.multiGliderSuitability,
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
    featureRole: String(options.featureRole ?? archetypeById(options.archetypeId).label),
    featureIds: archetypeById(options.archetypeId).featureIds,
    tileConfig: options.tileConfig ?? null,
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
    featureRole: String(input.featureRole ?? archetypeById(input.archetypeId).label),
    featureIds: Array.isArray(input.featureIds) ? input.featureIds.map(String) : archetypeById(input.archetypeId).featureIds,
    tileConfig: input.tileConfig ?? null,
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
      environmentArtifact: node(hasMosaic ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.REQUIRES_REGENERATION : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED, null, hasMosaic ? 'Launch-to-planning adapter is deferred to ENV-STUDIO-R1.2.' : null),
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
  if (state.sourceGridShape) {
    checks.push(check('source-grid-cell-limit', Number(state.sourceGridShape.cellCount ?? 0) <= ENVIRONMENT_STUDIO_LIMITS.maxDomainCellCount, state.sourceGridShape));
  }
  if (state.previewGridShape) {
    checks.push(check('preview-grid-lod-limit', Number(state.previewGridShape.cellCount ?? 0) <= previewDetailById(state.previewDetail).maxPreviewCells, {
      previewGridShape: state.previewGridShape,
      previewDecimation: state.previewDecimation
    }));
  }
  if (state.regionalFeatureSummary) {
    checks.push(check('regional-feature-summary-finite', finiteSummaryValues(state.regionalFeatureSummary), {
      featureDiversityScore: state.regionalFeatureSummary.featureDiversityScore,
      featureFamilies: state.regionalFeatureSummary.featureFamilies
    }));
    checks.push(check('regional-feature-diversity-heuristic', Number(state.regionalFeatureSummary.featureDiversityScore ?? 0) >= 0.35 || tiles.length === 0, {
      featureDiversityScore: state.regionalFeatureSummary.featureDiversityScore
    }));
  }
  if (state.featureRecords) {
    checks.push(check('regional-feature-records-present', !tiles.length || state.featureRecords.length >= 3, {
      featureRecordCount: state.featureRecords.length,
      featureTypes: state.featureRecords.map((record) => record.type)
    }));
  }
  if (state.previewBudget) {
    checks.push(check('preview-budget-measured', state.previewBudget.measured === true || tiles.length === 0, state.previewBudget));
  }
  if (state.multiGliderSuitability) {
    checks.push(check('multi-glider-suitability-heuristic', state.multiGliderSuitability.status !== 'FAIL' || tiles.length === 0, state.multiGliderSuitability));
    if (state.multiGliderSuitability.status === 'WARN') warnings.push('Multi-glider suitability is a mission-design heuristic and currently has warnings.');
    if (state.multiGliderSuitability.status === 'FAIL') warnings.push('Multi-glider suitability heuristic failed; adjust scale, feature mix, or domain resolution.');
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
    environmentType: project.environmentType,
    missionScale: project.missionScale,
    intendedGliders: project.intendedGliders,
    estimatedMissionDuration: project.estimatedMissionDuration,
    bathymetrySource: project.bathymetrySource,
    regionalTemplate: project.regionalTemplate,
    coastlineOrientation: project.coastlineOrientation,
    openOceanBoundaries: project.openOceanBoundaries,
    featureMix: project.featureMix,
    randomization: project.randomization,
    studioStage: project.studioStage,
    atlas: project.atlas,
    atlasPreset: project.atlasPreset,
    atlasSeed: project.atlasSeed,
    selectedOperationalWindow: project.selectedOperationalWindow,
    regionalMissionRecipe: project.regionalMissionRecipe,
    previewMode: project.previewMode,
    previewDetail: project.previewDetail,
    simplifiedPanelState: project.noncanonicalUiMetadata?.simplifiedPanelState ?? project.simplifiedPanelState,
    expandedAdvancedSections: project.noncanonicalUiMetadata?.expandedAdvancedSections ?? project.expandedAdvancedSections,
    previewCameraState: project.noncanonicalUiMetadata?.previewCameraState ?? project.previewCameraState,
    tileConfigs: project.tileConfigs,
    selectedObject: project.selectedObject,
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
  const profile = domainProfileById(input.environmentType ?? input.profileId);
  const recipe = normalizeRegionalRecipe(input, profile);
  const atlas = normalizeAtlas(input.atlas ?? {
    presetId: input.atlasPreset ?? input.atlasPresetId,
    seed: input.atlasSeed ?? input.seed ?? recipe.randomization?.worldSeed
  });
  const selectedOperationalWindow = input.selectedOperationalWindow?.windowDigest
    ? input.selectedOperationalWindow
    : normalizeOperationalWindow(input.selectedOperationalWindow ?? input.selectedWindow ?? { windowPresetId: input.windowPresetId ?? 'semiEnclosedGulfSurvey' }, atlas);
  const regionalMissionRecipe = normalizeRegionalMissionRecipe(input.regionalMissionRecipe ?? {
    atlas,
    selectedWindow: selectedOperationalWindow,
    seed: input.seed ?? recipe.randomization?.worldSeed
  });
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
    environmentType: recipe.environmentType,
    missionScale: recipe.missionScale,
    intendedGliders: recipe.intendedGliders,
    estimatedMissionDuration: recipe.estimatedMissionDuration,
    bathymetrySource: recipe.bathymetrySource,
    regionalTemplate: recipe.regionalTemplate,
    coastlineOrientation: recipe.coastlineOrientation,
    openOceanBoundaries: recipe.openOceanBoundaries,
    featureMix: recipe.featureMix,
    randomization: recipe.randomization,
    studioStage: normalizeStudioStage(input.studioStage ?? (input.tiles?.length ? 'regionalDetail' : 'atlasWindow')),
    atlas,
    atlasPreset: atlas.atlasPreset,
    atlasSeed: atlas.seed,
    selectedOperationalWindow,
    regionalMissionRecipe,
    previewMode: previewModeById(input.previewMode ?? recipe.previewMode).id,
    previewDetail: previewDetailById(input.previewDetail ?? recipe.previewDetail).id,
    simplifiedPanelState: normalizeSimplifiedPanelState(input.noncanonicalUiMetadata?.simplifiedPanelState ?? input.simplifiedPanelState),
    expandedAdvancedSections: normalizeExpandedAdvancedSections(input.noncanonicalUiMetadata?.expandedAdvancedSections ?? input.expandedAdvancedSections),
    previewCameraState: normalizePreviewCameraState(input.noncanonicalUiMetadata?.previewCameraState ?? input.previewCameraState),
    tileConfigs: normalizeTileConfigs(input.tileConfigs ?? recipe.tileConfigs, {
      seed: input.seed ?? 'env-studio-r1',
      featureMix: recipe.featureMix,
      regionalTemplate: recipe.regionalTemplate
    }),
    selectedObject: normalizeSelectedObject(input.selectedObject),
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

export function previewModeById(id = 'bathymetry3d') {
  const key = String(id ?? 'bathymetry3d');
  return ENVIRONMENT_STUDIO_PREVIEW_MODES.find((entry) => entry.id === key || entry.aliases?.includes(key))
    ?? ENVIRONMENT_STUDIO_PREVIEW_MODES[0];
}

export function previewDetailById(id = 'medium') {
  const key = String(id ?? 'medium');
  return ENVIRONMENT_STUDIO_PREVIEW_DETAILS.find((entry) => entry.id === key)
    ?? ENVIRONMENT_STUDIO_PREVIEW_DETAILS[1];
}

export function missionScaleById(id = 'singleGliderSurvey') {
  const key = String(id ?? 'singleGliderSurvey');
  return ENVIRONMENT_STUDIO_MISSION_SCALES.find((entry) => entry.id === key)
    ?? ENVIRONMENT_STUDIO_MISSION_SCALES[1];
}

export function regionalTemplateById(id = 'mixedRegionalComposite') {
  const key = String(id ?? 'mixedRegionalComposite');
  return ENVIRONMENT_STUDIO_REGIONAL_TEMPLATES.find((entry) => entry.id === key)
    ?? ENVIRONMENT_STUDIO_REGIONAL_TEMPLATES.at(-1);
}

export function coastlineOrientationById(id = 'westCoast') {
  const key = String(id ?? 'westCoast');
  return ENVIRONMENT_STUDIO_COASTLINE_ORIENTATIONS.find((entry) => entry.id === key)
    ?? ENVIRONMENT_STUDIO_COASTLINE_ORIENTATIONS[0];
}

export function bathymetrySourceById(id = 'syntheticRegionalTemplate') {
  const key = String(id ?? 'syntheticRegionalTemplate');
  return ENVIRONMENT_STUDIO_BATHYMETRY_SOURCES.find((entry) => entry.id === key)
    ?? ENVIRONMENT_STUDIO_BATHYMETRY_SOURCES[1];
}

function normalizeRegionalRecipe(input = {}, profile = domainProfileById()) {
  const environmentType = domainProfileById(input.environmentType ?? input.profileId ?? profile?.id ?? 'compactRegional').id;
  const missionScale = missionScaleById(input.missionScale ?? profile?.missionScale).id;
  const scale = missionScaleById(missionScale);
  const regionalTemplate = regionalTemplateById(input.regionalTemplate ?? profile?.regionalTemplate).id;
  const template = regionalTemplateById(regionalTemplate);
  const featureMix = normalizeFeatureMix(input.featureMix ?? profile?.defaultFeatureMix ?? DEFAULT_FEATURE_MIX);
  const randomization = normalizeRandomization(input.randomization);
  const tileConfigs = normalizeTileConfigs(input.tileConfigs ?? defaultTileConfigsForRegionalTemplate(regionalTemplate, featureMix), {
    seed: input.seed,
    featureMix,
    regionalTemplate
  });
  return {
    environmentType,
    missionScale,
    intendedGliders: intendedGliderCount(input.intendedGliders ?? profile?.intendedGliders ?? scale.intendedGliders),
    estimatedMissionDuration: String(input.estimatedMissionDuration ?? `${scale.durationHours} hr`),
    bathymetrySource: bathymetrySourceById(input.bathymetrySource ?? 'syntheticRegionalTemplate').id,
    regionalTemplate,
    coastlineOrientation: coastlineOrientationById(input.coastlineOrientation ?? template.defaultCoastlineOrientation).id,
    openOceanBoundaries: normalizeBoundaryList(input.openOceanBoundaries ?? template.defaultOpenOceanBoundaries),
    featureMix,
    randomization,
    previewMode: previewModeById(input.previewMode ?? 'bathymetry3d').id,
    previewDetail: previewDetailById(input.previewDetail ?? profile?.defaultPreviewDetail ?? 'medium').id,
    tileConfigs
  };
}

function normalizeFeatureMix(input = {}) {
  const source = { ...DEFAULT_FEATURE_MIX, ...(input ?? {}) };
  return {
    shelfFraction: normalizeLevel(source.shelfFraction),
    deepBasinFraction: normalizeLevel(source.deepBasinFraction),
    canyonDensity: normalizeLevel(source.canyonDensity),
    islandSeamountCount: normalizeLevel(source.islandSeamountCount),
    coastlineComplexity: normalizeLevel(source.coastlineComplexity),
    riverMouthDeltaInfluence: normalizeLevel(source.riverMouthDeltaInfluence ?? source.riverMouthInfluence),
    ridgeSillStrength: normalizeLevel(source.ridgeSillStrength),
    shelfBreakSharpness: normalizeLevel(source.shelfBreakSharpness),
    featureDiversity: normalizeLevel(source.featureDiversity)
  };
}

function normalizeRandomization(input = {}) {
  return {
    worldSeed: String(input.worldSeed ?? input.seed ?? 'env-studio-r1'),
    variationLevel: normalizeLevel(input.variationLevel ?? 'medium'),
    locks: {
      coastline: input.locks?.coastline === true || input.lockCoastline === true,
      deepBasin: input.locks?.deepBasin === true || input.lockDeepBasin === true,
      selectedFeatures: input.locks?.selectedFeatures === true || input.lockSelectedFeatures === true,
      tileSeams: input.locks?.tileSeams !== false
    }
  };
}

function normalizeSimplifiedPanelState(input = {}) {
  return {
    basicExpanded: input.basicExpanded !== false,
    advancedExpanded: input.advancedExpanded === true,
    diagnosticsExpanded: input.diagnosticsExpanded === true
  };
}

function normalizeExpandedAdvancedSections(input = []) {
  const allowed = new Set([
    'domain-resolution',
    'regional-layout-template',
    'regional-feature-mix',
    'randomization',
    'tile-configuration',
    'import-export'
  ]);
  return [...new Set((Array.isArray(input) ? input : String(input ?? '').split(','))
    .map((entry) => String(entry).trim())
    .filter((entry) => allowed.has(entry)))].sort();
}

function normalizePreviewCameraState(input = {}) {
  const preset = ENVIRONMENT_STUDIO_CAMERA_PRESETS.some((entry) => entry.id === input.preset)
    ? input.preset
    : DEFAULT_PREVIEW_CAMERA_STATE.preset;
  return {
    preset,
    yawDegrees: clampFinite(input.yawDegrees, -180, 180, DEFAULT_PREVIEW_CAMERA_STATE.yawDegrees),
    pitchDegrees: clampFinite(input.pitchDegrees, 15, 85, DEFAULT_PREVIEW_CAMERA_STATE.pitchDegrees),
    panX: clampFinite(input.panX, -180, 180, DEFAULT_PREVIEW_CAMERA_STATE.panX),
    panY: clampFinite(input.panY, -120, 120, DEFAULT_PREVIEW_CAMERA_STATE.panY),
    zoom: clampFinite(input.zoom, 0.6, 2.6, DEFAULT_PREVIEW_CAMERA_STATE.zoom),
    verticalExaggeration: clampFinite(input.verticalExaggeration, 0.5, 4, DEFAULT_PREVIEW_CAMERA_STATE.verticalExaggeration)
  };
}

function normalizeStudioStage(value = 'atlasWindow') {
  const text = String(value ?? 'atlasWindow');
  return text === 'regionalDetail' ? 'regionalDetail' : 'atlasWindow';
}

function normalizeAtlas(input = {}) {
  if (input?.atlasType === 'anchor.synthetic-ocean-atlas' && input.atlasDigest) return input;
  return createSyntheticOceanAtlas({
    presetId: input.atlasPreset ?? input.presetId ?? input.atlasPresetId ?? 'mixedRegionalWorld',
    seed: input.atlasSeed ?? input.seed ?? 'env-atlas-r1',
    atlasId: input.atlasId,
    label: input.label
  });
}

function normalizeRegionalMissionRecipe(input = {}) {
  if (input?.recipeType === 'anchor.regional-mission-recipe' && input.recipeDigest) return input;
  return createRegionalMissionRecipe(input);
}

function normalizeBoundaryList(value = []) {
  const allowed = new Set(['north', 'south', 'east', 'west']);
  const list = (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((entry) => String(entry).trim().toLowerCase())
    .filter((entry) => allowed.has(entry));
  return [...new Set(list)].sort();
}

function normalizeLevel(value = 'medium') {
  const text = String(value ?? 'medium').trim().toLowerCase();
  if (['low', 'medium', 'high'].includes(text)) return text;
  const number = Number(value);
  if (!Number.isFinite(number)) return 'medium';
  if (number <= 0.33) return 'low';
  if (number >= 0.67) return 'high';
  return 'medium';
}

function levelScore(value = 'medium') {
  return { low: 0.25, medium: 0.55, high: 0.85 }[normalizeLevel(value)] ?? 0.55;
}

function defaultTileConfigsForRegionalTemplate(regionalTemplate = 'mixedRegionalComposite', featureMix = DEFAULT_FEATURE_MIX) {
  const configs = ENVIRONMENT_STUDIO_DEFAULT_TILE_CONFIGS.map((entry) => ({ ...entry, tileCoordinate: { ...entry.tileCoordinate } }));
  const templateId = regionalTemplateById(regionalTemplate).id;
  if (templateId === 'openShelf') {
    configs[0].archetypeId = 'coastalShelf';
    configs[1].archetypeId = levelScore(featureMix.canyonDensity) > 0.6 ? 'submarineCanyon' : 'shelfBreak';
    configs[2].archetypeId = 'coastalShelf';
    configs[3].archetypeId = levelScore(featureMix.deepBasinFraction) > 0.6 ? 'deepBasin' : 'shelfBreak';
  } else if (templateId === 'semiEnclosedGulf') {
    configs[0].archetypeId = 'riverMouthDelta';
    configs[1].archetypeId = 'shelfBreak';
    configs[2].archetypeId = 'gulfBay';
    configs[3].archetypeId = levelScore(featureMix.islandSeamountCount) > 0.6 ? 'islandSeamount' : 'deepBasin';
  } else if (templateId === 'islandChain') {
    configs[0].archetypeId = 'islandSeamount';
    configs[1].archetypeId = 'ridgeSill';
    configs[2].archetypeId = 'coastalShelf';
    configs[3].archetypeId = 'islandSeamount';
  } else if (templateId === 'canyonSystem') {
    configs[0].archetypeId = 'coastalShelf';
    configs[1].archetypeId = 'submarineCanyon';
    configs[2].archetypeId = 'shelfBreak';
    configs[3].archetypeId = 'deepBasin';
  } else if (templateId === 'riverMouthDelta') {
    configs[0].archetypeId = 'riverMouthDelta';
    configs[1].archetypeId = 'coastalShelf';
    configs[2].archetypeId = 'gulfBay';
    configs[3].archetypeId = levelScore(featureMix.canyonDensity) > 0.6 ? 'submarineCanyon' : 'shelfBreak';
  } else if (templateId === 'ridgeSillBasin') {
    configs[0].archetypeId = 'gulfBay';
    configs[1].archetypeId = 'ridgeSill';
    configs[2].archetypeId = 'deepBasin';
    configs[3].archetypeId = 'islandSeamount';
  }
  if (levelScore(featureMix.ridgeSillStrength) > 0.75) configs[3].archetypeId = 'ridgeSill';
  if (levelScore(featureMix.islandSeamountCount) > 0.75) configs[3].archetypeId = 'islandSeamount';
  if (levelScore(featureMix.canyonDensity) > 0.75) configs[1].archetypeId = 'submarineCanyon';
  return configs.map((entry) => ({
    ...entry,
    featureRole: `${archetypeById(entry.archetypeId).label} tile - ${entry.featureRole}`
  }));
}

function normalizeTileConfigs(input = [], options = {}) {
  const base = Array.isArray(input) && input.length
    ? input
    : defaultTileConfigsForRegionalTemplate(options.regionalTemplate, options.featureMix);
  const normalized = base.slice(0, 4).map((entry, index) => {
    const fallback = ENVIRONMENT_STUDIO_DEFAULT_TILE_CONFIGS[index] ?? ENVIRONMENT_STUDIO_DEFAULT_TILE_CONFIGS[0];
    const coordinate = entry.tileCoordinate ?? fallback.tileCoordinate;
    const archetype = archetypeById(entry.archetypeId ?? fallback.archetypeId);
    return {
      id: String(entry.id ?? fallback.id ?? `tile-${index}`),
      label: String(entry.label ?? fallback.label ?? `Tile ${index + 1}`),
      tileCoordinate: {
        row: Math.max(0, Math.min(1, positiveInteger(coordinate?.row, fallback.tileCoordinate.row))),
        column: Math.max(0, Math.min(1, positiveInteger(coordinate?.column, fallback.tileCoordinate.column)))
      },
      archetypeId: archetype.id,
      seedOffset: String(entry.seedOffset ?? fallback.seedOffset ?? `tile-${index}`),
      featureRole: String(entry.featureRole ?? fallback.featureRole ?? archetype.label),
      locked: entry.locked === true
    };
  });
  while (normalized.length < 4) {
    const fallback = ENVIRONMENT_STUDIO_DEFAULT_TILE_CONFIGS[normalized.length];
    normalized.push({
      ...fallback,
      tileCoordinate: { ...fallback.tileCoordinate },
      archetypeId: archetypeById(fallback.archetypeId).id,
      locked: false
    });
  }
  return normalized;
}

function normalizeSelectedObject(input = {}) {
  const type = String(input.type ?? input.objectType ?? 'region');
  const supported = new Set(['region', 'tile', 'feature', 'seam', 'validationIssue', 'dependency', 'crossSection']);
  return {
    type: supported.has(type) ? type : 'region',
    id: String(input.id ?? input.objectId ?? (type === 'region' ? 'region' : ''))
  };
}

function deriveSourceGridShape(domainSpec = {}) {
  return {
    rows: positiveInteger(domainSpec.horizontal?.rows, 1),
    columns: positiveInteger(domainSpec.horizontal?.columns, 1),
    cellCount: positiveInteger(domainSpec.horizontal?.cellCount, 1),
    widthMeters: round(domainSpec.horizontal?.widthMeters ?? 0),
    heightMeters: round(domainSpec.horizontal?.heightMeters ?? 0),
    cellSizeMeters: round(domainSpec.horizontal?.cellSizeMeters ?? 1)
  };
}

function derivePreviewDecimation(sourceGridShape = {}, previewDetail = 'medium') {
  const detail = previewDetailById(previewDetail);
  const cellCount = positiveInteger(sourceGridShape.cellCount, 1);
  let factor = Math.max(1, Math.ceil(Math.sqrt(cellCount / detail.maxPreviewCells)));
  while (previewCellCountForFactor(sourceGridShape, factor) > detail.maxPreviewCells) factor += 1;
  return {
    mode: factor > 1 ? 'decimated-preview-mesh' : 'source-grid-preview',
    factor,
    maxPreviewCells: detail.maxPreviewCells,
    sourceCellCount: cellCount,
    preservesSourceGridExport: true,
    reason: factor > 1 ? 'Preview is simplified for interactivity. Export preserves the source grid.' : 'Source grid is small enough for direct preview.'
  };
}

function previewCellCountForFactor(sourceGridShape = {}, factor = 1) {
  const rows = Math.floor((positiveInteger(sourceGridShape.rows, 1) - 1) / factor) + 1;
  const columns = Math.floor((positiveInteger(sourceGridShape.columns, 1) - 1) / factor) + 1;
  return rows * columns;
}

function derivePreviewGridShape(sourceGridShape = {}, decimation = {}) {
  const factor = positiveInteger(decimation.factor, 1);
  const rows = Math.floor((positiveInteger(sourceGridShape.rows, 1) - 1) / factor) + 1;
  const columns = Math.floor((positiveInteger(sourceGridShape.columns, 1) - 1) / factor) + 1;
  return {
    rows,
    columns,
    cellCount: rows * columns,
    decimationFactor: factor,
    widthMeters: sourceGridShape.widthMeters ?? 0,
    heightMeters: sourceGridShape.heightMeters ?? 0
  };
}

function computeRegionalFeatureSummary(session = {}, sourceGridShape = {}) {
  const tiles = Array.isArray(session.tiles) ? session.tiles : [];
  const depths = [];
  let wetCells = 0;
  let landCells = 0;
  let coastlineTransitions = 0;
  let gradientMax = 0;
  let gradientMin = Infinity;
  let gradientSum = 0;
  let gradientCount = 0;
  let canyonLikeGradientCount = 0;
  let connectedWaterWeighted = 0;
  let connectedWaterWeight = 0;
  const families = new Set();
  const featureIds = new Set();
  for (const tile of tiles) {
    const grid = tile.bathymetryArtifact?.bottomDepthMeters ?? [];
    const rows = grid.length;
    const columns = grid[0]?.length ?? 0;
    const archetype = archetypeById(tile.archetypeId);
    families.add(archetype.family);
    for (const feature of tile.featureIds ?? archetype.featureIds) featureIds.add(feature);
    const tileWet = Number(tile.diagnostics?.wetCellCount ?? 0);
    connectedWaterWeighted += tileWet * Number(tile.diagnostics?.largestWetComponentFraction ?? 0);
    connectedWaterWeight += tileWet;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const depth = Number(grid[y]?.[x] ?? 0);
        if (!Number.isFinite(depth)) continue;
        depths.push(depth);
        if (depth > 0) wetCells += 1;
        else landCells += 1;
        const right = Number(grid[y]?.[x + 1] ?? depth);
        const down = Number(grid[y + 1]?.[x] ?? depth);
        if ((depth > 0) !== (right > 0)) coastlineTransitions += 1;
        if ((depth > 0) !== (down > 0)) coastlineTransitions += 1;
        const gradient = Math.max(Math.abs(right - depth), Math.abs(down - depth));
        if (Number.isFinite(gradient)) {
          gradientMin = Math.min(gradientMin, gradient);
          gradientMax = Math.max(gradientMax, gradient);
          gradientSum += gradient;
          gradientCount += 1;
        }
      }
    }
  }
  const waterDepths = depths.filter((value) => value > 0);
  const totalCells = depths.length || Number(sourceGridShape.cellCount ?? 0) || 1;
  const maxDepth = waterDepths.length ? Math.max(...waterDepths) : Number(session.domainSpec?.vertical?.maxDepthMeters ?? 0);
  const shallowCutoff = Math.max(25, Math.min(90, maxDepth * 0.35));
  const deepCutoff = Math.max(shallowCutoff + 1, maxDepth * 0.68);
  const shallowCells = waterDepths.filter((value) => value <= shallowCutoff).length;
  const deepCells = waterDepths.filter((value) => value >= deepCutoff).length;
  canyonLikeGradientCount = gradientCount ? depths.filter((_value, index) => index < gradientCount).length && Math.round((gradientMax > 0 ? gradientSum / Math.max(1, gradientMax) : 0)) : 0;
  const steepThreshold = Math.max(12, maxDepth * 0.07);
  canyonLikeGradientCount = estimateSteepGradientCount(tiles, steepThreshold);
  const familyCount = families.size;
  const balance = Math.min(1, (shallowCells > 0 ? 0.22 : 0) + (deepCells > 0 ? 0.22 : 0) + (coastlineTransitions > 0 ? 0.18 : 0) + (canyonLikeGradientCount > 0 ? 0.18 : 0));
  const diversityScore = Math.min(1, familyCount / 6 * 0.55 + balance);
  return {
    type: 'anchor.environment-studio.regional-feature-summary',
    label: 'mission-design heuristic',
    generated: tiles.length > 0,
    tileCount: tiles.length,
    landFraction: round(landCells / totalCells),
    wetFraction: round(wetCells / totalCells),
    shallowShelfFraction: round(shallowCells / totalCells),
    deepWaterFraction: round(deepCells / totalCells),
    slopeRange: {
      minMetersPerCell: gradientCount ? round(gradientMin) : 0,
      meanMetersPerCell: gradientCount ? round(gradientSum / gradientCount) : 0,
      maxMetersPerCell: gradientCount ? round(gradientMax) : 0
    },
    deepestBasinDepthMeters: round(maxDepth),
    coastlineLengthEstimateMeters: round(coastlineTransitions * Number(session.domainSpec?.horizontal?.cellSizeMeters ?? 1)),
    canyonLikeGradientCount,
    islandSeamountCount: [...featureIds].filter((id) => /island|seamount/i.test(id)).length,
    navigableConnectedWaterFraction: connectedWaterWeight ? round(connectedWaterWeighted / connectedWaterWeight) : 0,
    featureDiversityScore: round(diversityScore),
    featureFamilies: [...families].sort(),
    featureIds: [...featureIds].sort(),
    claimBoundary: {
      synthetic: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false
    }
  };
}

function computeRegionalFeatureRecords(session = {}, summary = {}) {
  const tiles = Array.isArray(session.tiles) ? session.tiles : [];
  if (!tiles.length || summary.generated !== true) return [];
  const width = Number(session.domainSpec?.horizontal?.widthMeters ?? 0);
  const height = Number(session.domainSpec?.horizontal?.heightMeters ?? 0);
  const cellSize = Number(session.domainSpec?.horizontal?.cellSizeMeters ?? 1);
  const tileIds = tiles.map((tile) => tile.id);
  const byArchetype = new Map(tiles.map((tile) => [tile.archetypeId, tile]));
  const allDepths = tiles.flatMap((tile) => (tile.bathymetryArtifact?.bottomDepthMeters ?? []).flat().map(Number).filter(Number.isFinite));
  const wetDepths = allDepths.filter((value) => value > 0);
  const maxDepth = Math.max(1, ...wetDepths, Number(session.domainSpec?.vertical?.maxDepthMeters ?? 1));
  const meanSlope = Number(summary.slopeRange?.meanMetersPerCell ?? 0);
  const maxSlope = Number(summary.slopeRange?.maxMetersPerCell ?? 0);
  const featureScale = Math.max(width, height, cellSize);
  const records = [
    featureRecord({
      id: 'feature-shelf-west',
      type: 'shelf',
      label: 'Broad Shelf',
      center: { eastMeters: width * 0.24, northMeters: height * 0.42 },
      areaSquareMeters: width * height * Math.max(0.05, Number(summary.shallowShelfFraction ?? 0.12)),
      depthRangeMeters: [5, Math.max(20, maxDepth * 0.28)],
      slopeRangeMetersPerCell: [0, Math.max(2, meanSlope)],
      confidence: summary.shallowShelfFraction > 0 ? 0.84 : 0.58,
      relatedTileIds: relatedTiles(tiles, ['coastalShelf', 'riverMouthDelta', 'gulfBay'], tileIds.slice(0, 2)),
      validationNotes: 'Public shallow-depth fraction and coastline continuity indicate a broad shelf opportunity.'
    }),
    featureRecord({
      id: 'feature-shelf-break-central',
      type: 'shelfBreak',
      label: 'Shelf Break',
      center: { eastMeters: width * 0.47, northMeters: height * 0.52 },
      lengthMeters: Math.max(featureScale * 0.35, height * 0.76),
      depthRangeMeters: [Math.max(30, maxDepth * 0.22), Math.max(80, maxDepth * 0.62)],
      slopeRangeMetersPerCell: [Math.max(3, meanSlope), Math.max(6, maxSlope * 0.7)],
      confidence: 0.78,
      relatedTileIds: relatedTiles(tiles, ['shelfBreak', 'submarineCanyon'], tileIds),
      validationNotes: 'Derived from public depth gradient and mixed shelf/deep regional template controls.'
    }),
    featureRecord({
      id: 'feature-canyon-incision',
      type: 'canyon',
      label: 'Canyon Incision',
      center: { eastMeters: width * 0.58, northMeters: height * 0.34 },
      lengthMeters: Math.max(featureScale * 0.25, height * 0.58),
      depthRangeMeters: [Math.max(40, maxDepth * 0.32), maxDepth],
      slopeRangeMetersPerCell: [Math.max(6, meanSlope), Math.max(12, maxSlope)],
      confidence: summary.canyonLikeGradientCount > 0 ? 0.86 : 0.52,
      relatedTileIds: relatedTiles(tiles, ['submarineCanyon'], [byArchetype.get('submarineCanyon')?.id, tileIds[1]].filter(Boolean)),
      validationNotes: 'Uses public steep-gradient count; it is a synthetic canyon-like feature, not surveyed geomorphology.'
    }),
    featureRecord({
      id: 'feature-deep-basin',
      type: 'deepBasin',
      label: 'Deep Central Basin',
      center: { eastMeters: width * 0.68, northMeters: height * 0.64 },
      areaSquareMeters: width * height * Math.max(0.06, Number(summary.deepWaterFraction ?? 0.1)),
      depthRangeMeters: [Math.max(80, maxDepth * 0.55), maxDepth],
      slopeRangeMetersPerCell: [Math.max(1, meanSlope * 0.35), Math.max(4, meanSlope * 1.2)],
      confidence: summary.deepWaterFraction > 0 ? 0.82 : 0.55,
      relatedTileIds: relatedTiles(tiles, ['deepBasin', 'islandSeamount'], tileIds.slice(-2)),
      validationNotes: 'Deep-water opportunity is measured from public bottom-depth values.'
    }),
    featureRecord({
      id: 'feature-island-seamount',
      type: 'islandSeamount',
      label: 'Island / Seamount',
      center: { eastMeters: width * 0.76, northMeters: height * 0.42 },
      areaSquareMeters: width * height * 0.035,
      depthRangeMeters: [0, Math.max(35, maxDepth * 0.38)],
      slopeRangeMetersPerCell: [Math.max(2, meanSlope), Math.max(7, maxSlope * 0.8)],
      confidence: summary.islandSeamountCount > 0 ? 0.82 : 0.5,
      relatedTileIds: relatedTiles(tiles, ['islandSeamount'], [byArchetype.get('islandSeamount')?.id, tileIds.at(-1)].filter(Boolean)),
      validationNotes: 'Synthetic island/seamount indicator is carried as mission-design metadata.'
    }),
    featureRecord({
      id: 'feature-river-delta',
      type: 'riverDelta',
      label: 'River / Delta Zone',
      center: { eastMeters: width * 0.18, northMeters: height * 0.18 },
      areaSquareMeters: width * height * 0.04,
      depthRangeMeters: [0, Math.max(25, maxDepth * 0.18)],
      slopeRangeMetersPerCell: [0, Math.max(2, meanSlope * 0.7)],
      confidence: hasFeatureId(summary, /river|delta/i) ? 0.76 : 0.48,
      relatedTileIds: relatedTiles(tiles, ['riverMouthDelta', 'gulfBay'], tileIds.slice(0, 2)),
      validationNotes: 'Included when regional template or tile provenance indicates river-mouth/delta influence.'
    }),
    featureRecord({
      id: 'feature-ridge-sill',
      type: 'ridgeSill',
      label: 'Ridge / Sill',
      center: { eastMeters: width * 0.52, northMeters: height * 0.72 },
      lengthMeters: Math.max(featureScale * 0.3, width * 0.42),
      depthRangeMeters: [Math.max(20, maxDepth * 0.18), Math.max(90, maxDepth * 0.5)],
      slopeRangeMetersPerCell: [Math.max(2, meanSlope * 0.8), Math.max(8, maxSlope * 0.75)],
      confidence: hasFeatureId(summary, /ridge|sill/i) ? 0.78 : 0.52,
      relatedTileIds: relatedTiles(tiles, ['ridgeSill', 'islandSeamount'], tileIds.slice(-2)),
      validationNotes: 'Synthetic ridge/sill support is tracked for route-separation and basin-exchange teaching.'
    }),
    featureRecord({
      id: 'feature-gulf-bay',
      type: 'gulfBay',
      label: 'Semi-Enclosed Gulf / Bay',
      center: { eastMeters: width * 0.34, northMeters: height * 0.55 },
      areaSquareMeters: width * height * Math.max(0.08, Number(summary.wetFraction ?? 0.3) * 0.18),
      depthRangeMeters: [0, Math.max(70, maxDepth * 0.48)],
      slopeRangeMetersPerCell: [0, Math.max(5, meanSlope)],
      confidence: session.regionalTemplate === 'semiEnclosedGulf' ? 0.88 : 0.58,
      relatedTileIds: relatedTiles(tiles, ['gulfBay', 'riverMouthDelta'], tileIds),
      validationNotes: 'Represents semi-enclosed coastline structure for regional authoring, not a real mapped basin.'
    })
  ];
  return records.filter((record) => record.confidence >= 0.45);
}

function featureRecord(input = {}) {
  const depthRange = Array.isArray(input.depthRangeMeters) ? input.depthRangeMeters : [0, 0];
  const slopeRange = Array.isArray(input.slopeRangeMetersPerCell) ? input.slopeRangeMetersPerCell : [0, 0];
  return {
    featureId: String(input.id),
    type: String(input.type),
    label: String(input.label ?? input.type),
    approximateCenterMeters: {
      eastMeters: round(input.center?.eastMeters),
      northMeters: round(input.center?.northMeters)
    },
    areaSquareMeters: input.areaSquareMeters == null ? null : round(input.areaSquareMeters),
    lengthMeters: input.lengthMeters == null ? null : round(input.lengthMeters),
    depthRangeMeters: [round(depthRange[0]), round(depthRange[1])],
    slopeRangeMetersPerCell: [round(slopeRange[0]), round(slopeRange[1])],
    confidence: round(input.confidence),
    relatedTileIds: [...new Set((input.relatedTileIds ?? []).filter(Boolean).map(String))],
    validationNotes: String(input.validationNotes ?? 'Synthetic public feature record.')
  };
}

function relatedTiles(tiles = [], archetypeIds = [], fallbackIds = []) {
  const allowed = new Set(archetypeIds);
  const matches = tiles.filter((tile) => allowed.has(tile.archetypeId)).map((tile) => tile.id);
  return matches.length ? matches : fallbackIds;
}

function hasFeatureId(summary = {}, pattern = /./) {
  return (summary.featureIds ?? []).some((id) => pattern.test(String(id)));
}

function computePreviewBudget(sourceGridShape = {}, previewGridShape = {}, previewDecimation = {}) {
  const sourceCells = Number(sourceGridShape.cellCount ?? 0);
  const previewCells = Number(previewGridShape.cellCount ?? 0);
  const factor = Number(previewDecimation.factor ?? 1);
  const measured = sourceCells > 0 && previewCells > 0;
  return {
    type: 'anchor.environment-studio.preview-budget',
    measured,
    status: measured ? (previewCells <= Number(previewDecimation.maxPreviewCells ?? previewCells) ? 'PASS' : 'WARN') : 'NOT_MEASURED',
    sourceCells: measured ? sourceCells : null,
    previewCells: measured ? previewCells : null,
    decimationFactor: measured ? factor : null,
    maxPreviewCells: Number(previewDecimation.maxPreviewCells ?? 0) || null,
    estimatedRenderCost: measured
      ? (sourceCells > 50000 || previewCells > 2200 ? 'high but bounded' : sourceCells > 15000 || previewCells > 1000 ? 'moderate' : 'low')
      : 'Not measured',
    label: measured
      ? `${sourceCells} source cells, ${previewCells} preview cells, ${factor}x decimation`
      : 'Not measured'
  };
}

function computeMultiGliderSuitability(session = {}, summary = {}, sourceGridShape = {}, previewBudget = null) {
  const intended = intendedGliderCount(session.intendedGliders);
  const checks = [
    suitabilityCheck('navigable-water-area', Number(summary.wetFraction ?? 0) >= 0.38, summary.wetFraction),
    suitabilityCheck('connected-water-fraction', Number(summary.navigableConnectedWaterFraction ?? 0) >= 0.55 || !summary.generated, summary.navigableConnectedWaterFraction),
    suitabilityCheck('feature-diversity', Number(summary.featureDiversityScore ?? 0) >= (intended > 1 ? 0.45 : 0.25), summary.featureDiversityScore),
    suitabilityCheck('deep-water-opportunity', Number(summary.deepWaterFraction ?? 0) >= (intended > 2 ? 0.08 : 0.02) || !summary.generated, summary.deepWaterFraction),
    suitabilityCheck('shallow-shelf-opportunity', Number(summary.shallowShelfFraction ?? 0) >= 0.03 || !summary.generated, summary.shallowShelfFraction),
    suitabilityCheck('browser-source-budget', Number(sourceGridShape.cellCount ?? 0) <= ENVIRONMENT_STUDIO_LIMITS.maxDomainCellCount, sourceGridShape.cellCount),
    suitabilityCheck('browser-preview-budget', previewBudget?.status !== 'WARN', previewBudget?.label ?? 'Not measured')
  ];
  const separatedCandidateDeploymentZones = Math.max(0, Math.min(6, Math.floor(Number(summary.wetFraction ?? 0) * Number(sourceGridShape.cellCount ?? 0) / 1200) + Math.floor(Number(summary.featureDiversityScore ?? 0) * 3)));
  checks.push(suitabilityCheck('separated-candidate-deployment-zones', separatedCandidateDeploymentZones >= Math.min(intended, 4) || !summary.generated, separatedCandidateDeploymentZones));
  const failed = checks.filter((entry) => entry.passed === false);
  const status = !summary.generated ? 'WARN' : failed.length >= 3 ? 'FAIL' : failed.length ? 'WARN' : 'PASS';
  return {
    type: 'anchor.environment-studio.multi-glider-suitability',
    label: 'mission-design heuristic',
    status,
    intendedGliders: intended,
    separatedCandidateDeploymentZones,
    checks,
    summary: status === 'PASS'
      ? 'Regional bathymetry has enough scale and feature diversity for the intended glider count.'
      : 'Adjust domain scale, feature mix, or resolution before using this region for multi-glider evaluation.',
    officialScienceValidation: false,
    officialScoringInput: false
  };
}

function shapeRegionalMosaicFeatures(tileSources = [], session = {}) {
  if (!tileSources.length) return;
  const template = String(session.regionalTemplate ?? 'mixedRegionalComposite');
  const environmentType = String(session.environmentType ?? '');
  const featureMix = session.featureMix ?? {};
  const maxDepth = Math.max(1, Number(session.domainSpec?.vertical?.maxDepthMeters ?? 320));
  const applyRegionalOverlay = [
    'semiEnclosedGulf',
    'shelfBreakDeepBasin',
    'mixedRegionalComposite',
    'ridgeSillBasin',
    'canyonSystem'
  ].includes(template) || /regional|gulf|basin/i.test(environmentType);
  if (!applyRegionalOverlay) return;

  const rowsPerTile = tileSources[0]?.depthMeters?.length ?? 0;
  const columnsPerTile = tileSources[0]?.depthMeters?.[0]?.length ?? 0;
  const tileGridRows = Math.max(1, ...tileSources.map((entry) => Number(entry.config?.tileCoordinate?.row ?? 0) + 1));
  const tileGridColumns = Math.max(1, ...tileSources.map((entry) => Number(entry.config?.tileCoordinate?.column ?? 0) + 1));
  const shelfStrength = levelScore(featureMix.shelfFraction);
  const basinStrength = levelScore(featureMix.deepBasinFraction);
  const canyonStrength = levelScore(featureMix.canyonDensity);
  const islandStrength = levelScore(featureMix.islandSeamountCount);
  const ridgeStrength = levelScore(featureMix.ridgeSillStrength);
  const coastlineStrength = levelScore(featureMix.coastlineComplexity);

  for (const entry of tileSources) {
    const grid = entry.depthMeters ?? [];
    const tileRow = Number(entry.config?.tileCoordinate?.row ?? 0);
    const tileColumn = Number(entry.config?.tileCoordinate?.column ?? 0);
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
        const gx = ((tileColumn * columnsPerTile) + x) / Math.max(1, tileGridColumns * columnsPerTile - 1);
        const gy = ((tileRow * rowsPerTile) + y) / Math.max(1, tileGridRows * rowsPerTile - 1);
        let depth = Number(grid[y][x] ?? 0);

        if (template === 'semiEnclosedGulf' || session.coastlineOrientation === 'curvedGulf') {
          const curvedCoast = 0.08 + coastlineStrength * 0.12 + Math.sin(gy * Math.PI) * 0.1;
          const northPocket = gy < 0.18 && gx < 0.35 + coastlineStrength * 0.08;
          if ((gx < curvedCoast && gy > 0.08 && gy < 0.94) || northPocket) {
            depth = 0;
          }
        }

        const shelfEdge = 0.23 + shelfStrength * 0.22 + Math.sin(gy * Math.PI * 1.4) * 0.045;
        if (gx < shelfEdge && depth > 0) {
          const shelfTarget = maxDepth * (0.08 + 0.17 * gx / Math.max(0.01, shelfEdge));
          depth = Math.min(depth, shelfTarget);
        }

        const basin = gaussian2d(gx, gy, 0.66, 0.62, 0.18, 0.2);
        if (basin > 0.08) {
          depth = Math.max(depth, maxDepth * (0.42 + 0.48 * basin * basinStrength));
        }

        const canyonCenter = 0.33 + 0.42 * gy;
        const canyonDistance = Math.abs(gx - canyonCenter);
        const canyon = Math.max(0, 1 - canyonDistance / 0.065) * Math.max(0, 1 - Math.abs(gy - 0.43) / 0.42);
        if (canyon > 0) {
          depth = Math.max(depth, maxDepth * (0.32 + 0.55 * canyon * canyonStrength));
        }

        const seamount = gaussian2d(gx, gy, 0.78, 0.36, 0.09, 0.11);
        if (seamount > 0.04 && depth > 0) {
          depth = Math.max(0, depth - maxDepth * 0.48 * seamount * islandStrength);
          if (seamount > 0.82 && islandStrength > 0.75) depth = Math.min(depth, maxDepth * 0.04);
        }

        const ridge = Math.max(0, 1 - Math.abs(gy - (0.72 - gx * 0.16)) / 0.055) * Math.max(0, 1 - Math.abs(gx - 0.55) / 0.36);
        if (ridge > 0.02 && depth > 0) {
          depth = Math.max(maxDepth * 0.08, depth - maxDepth * 0.32 * ridge * ridgeStrength);
        }

        grid[y][x] = round(depth, 3);
      }
    }
  }
}

function gaussian2d(x, y, cx, cy, sx, sy) {
  const dx = (x - cx) / Math.max(0.0001, sx);
  const dy = (y - cy) / Math.max(0.0001, sy);
  return Math.exp(-0.5 * (dx * dx + dy * dy));
}

function blendRegionalTileEdges(tileSources = []) {
  const byPosition = new Map(tileSources.map((entry) => [`${entry.config.tileCoordinate.row}:${entry.config.tileCoordinate.column}`, entry]));
  for (const entry of tileSources) {
    const { row, column } = entry.config.tileCoordinate;
    const right = byPosition.get(`${row}:${column + 1}`);
    if (right) blendVerticalEdge(entry.depthMeters, right.depthMeters);
    const bottom = byPosition.get(`${row + 1}:${column}`);
    if (bottom) blendHorizontalEdge(entry.depthMeters, bottom.depthMeters);
  }
  blendFourWayIntersection(byPosition);
}

function blendVerticalEdge(leftGrid = [], rightGrid = []) {
  const rows = Math.min(leftGrid.length, rightGrid.length);
  const leftColumn = leftGrid[0]?.length - 1;
  if (!Number.isFinite(leftColumn) || leftColumn < 0) return;
  for (let y = 0; y < rows; y += 1) {
    const average = round((Number(leftGrid[y]?.[leftColumn] ?? 0) + Number(rightGrid[y]?.[0] ?? 0)) / 2);
    leftGrid[y][leftColumn] = average;
    rightGrid[y][0] = average;
  }
}

function blendHorizontalEdge(topGrid = [], bottomGrid = []) {
  const topRow = topGrid.length - 1;
  const columns = Math.min(topGrid[0]?.length ?? 0, bottomGrid[0]?.length ?? 0);
  if (topRow < 0) return;
  for (let x = 0; x < columns; x += 1) {
    const average = round((Number(topGrid[topRow]?.[x] ?? 0) + Number(bottomGrid[0]?.[x] ?? 0)) / 2);
    topGrid[topRow][x] = average;
    bottomGrid[0][x] = average;
  }
}

function blendFourWayIntersection(byPosition = new Map()) {
  const nw = byPosition.get('0:0')?.depthMeters;
  const ne = byPosition.get('0:1')?.depthMeters;
  const sw = byPosition.get('1:0')?.depthMeters;
  const se = byPosition.get('1:1')?.depthMeters;
  if (!nw?.length || !ne?.length || !sw?.length || !se?.length) return;
  const nwY = nw.length - 1;
  const nwX = nw[0].length - 1;
  const swX = sw[0].length - 1;
  const values = [
    nw[nwY]?.[nwX],
    ne[nwY]?.[0],
    sw[0]?.[swX],
    se[0]?.[0]
  ].map(Number).filter(Number.isFinite);
  if (!values.length) return;
  const average = round(values.reduce((sum, value) => sum + value, 0) / values.length);
  nw[nwY][nwX] = average;
  ne[nwY][0] = average;
  sw[0][swX] = average;
  se[0][0] = average;
}

function estimateSteepGradientCount(tiles = [], threshold = 12) {
  let count = 0;
  for (const tile of tiles) {
    const grid = tile.bathymetryArtifact?.bottomDepthMeters ?? [];
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < (grid[0]?.length ?? 0); x += 1) {
        const depth = Number(grid[y]?.[x] ?? 0);
        const right = Number(grid[y]?.[x + 1] ?? depth);
        const down = Number(grid[y + 1]?.[x] ?? depth);
        if (Math.max(Math.abs(right - depth), Math.abs(down - depth)) >= threshold) count += 1;
      }
    }
  }
  return count;
}

function finiteSummaryValues(summary = {}) {
  const values = [
    summary.landFraction,
    summary.wetFraction,
    summary.shallowShelfFraction,
    summary.deepWaterFraction,
    summary.deepestBasinDepthMeters,
    summary.coastlineLengthEstimateMeters,
    summary.featureDiversityScore,
    summary.navigableConnectedWaterFraction,
    summary.slopeRange?.minMetersPerCell,
    summary.slopeRange?.meanMetersPerCell,
    summary.slopeRange?.maxMetersPerCell
  ];
  return values.every((value) => Number.isFinite(Number(value)));
}

function suitabilityCheck(id, passed, value) {
  return { id, passed: passed === true, value: Number.isFinite(Number(value)) ? round(value) : value };
}

function intendedGliderCount(value) {
  if (typeof value === 'string' && value.includes('-')) return positiveInteger(value.split('-').at(-1), 1);
  return Math.max(1, positiveInteger(value, 1));
}

function seamId(seam = {}) {
  return `${seam.fromTileId}:${seam.edgePair}:${seam.toTileId}`;
}

function seamById(seamReport = {}, id = '') {
  return (seamReport?.seams ?? []).find((seam) => seamId(seam) === id);
}

function tileFraction(tile = {}, mode = 'wet') {
  const wet = Number(tile.diagnostics?.wetCellCount ?? 0);
  const land = Number(tile.diagnostics?.landCellCount ?? 0);
  const total = Math.max(1, wet + land);
  return mode === 'land' ? round(land / total) : round(wet / total);
}

function featureMixLabel(featureMix = {}) {
  return Object.entries(featureMix).map(([key, value]) => `${labelize(key)}: ${value}`).join('; ');
}

function formatMetric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(round(number, 3)) : 'n/a';
}

function labelize(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function edgeProfilesFromDepth(grid = []) {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  return {
    top: columns ? grid[0].map((value) => round(value)) : [],
    bottom: rows && columns ? grid[rows - 1].map((value) => round(value)) : [],
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

function compactSelectedWindow(window = {}) {
  if (!window) return null;
  return {
    windowId: window.windowId,
    label: window.label,
    x: window.x,
    y: window.y,
    width: window.width,
    height: window.height,
    center: window.center,
    primaryContext: window.detectedContext?.primaryContext,
    primaryContextLabel: window.detectedContext?.primaryContextLabel,
    recommendedGliders: window.recommendedGliders,
    recommendedDurationSeconds: window.recommendedDurationSeconds,
    windowDigest: window.windowDigest
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

function withProjectDigest(value, digestKey) {
  const payload = { ...value };
  delete payload[digestKey];
  delete payload.noncanonicalUiMetadata;
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

function clampFinite(value, min, max, fallback) {
  const number = finite(value, fallback);
  return Math.min(max, Math.max(min, number));
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}
