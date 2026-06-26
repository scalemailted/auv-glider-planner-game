import {
  canonicalJsonDigest,
  canonicalizeJsonValue
} from '../../../packages/codecs/src/index.js';
import {
  SYNTHETIC_ATLAS_NOISE_VERSION,
  clamp,
  distanceToSegment,
  domainWarp2D,
  fractalBrownianMotion2D,
  gaussian2D,
  lerp,
  ridgedNoise2D,
  round,
  seededFeaturePoints,
  seededUnit,
  smoothstep,
  worleyDistance2D
} from './SyntheticAtlasNoise.js';

export const SYNTHETIC_OCEAN_ATLAS_TYPE = 'anchor.synthetic-ocean-atlas';
export const SYNTHETIC_OCEAN_ATLAS_VERSION = '1.1.0';
export const OPERATIONAL_WINDOW_VERSION = '1.1.0';
export const REGIONAL_MISSION_RECIPE_TYPE = 'anchor.regional-mission-recipe';
export const REGIONAL_MISSION_RECIPE_VERSION = '1.1.0';
export const FLOW_GENERATION_INPUTS_TYPE = 'anchor.synthetic-ocean-atlas.flow-generation-inputs';
export const FLOW_GENERATION_INPUTS_VERSION = '1.1.0';

export const SYNTHETIC_OCEAN_ATLAS_PRESETS = Object.freeze([
  { id: 'syntheticGulfWorld', label: 'Synthetic Gulf World', defaultSeed: 'atlas-gulf-r1-1' },
  { id: 'islandChainWorld', label: 'Island Chain World', defaultSeed: 'atlas-island-r1-1' },
  { id: 'shelfToBasinWorld', label: 'Shelf-to-Basin World', defaultSeed: 'atlas-shelf-basin-r1-1' },
  { id: 'openOceanEddyWorld', label: 'Open Ocean Eddy World', defaultSeed: 'atlas-open-ocean-r1-1' },
  { id: 'straitSillWorld', label: 'Strait / Sill World', defaultSeed: 'atlas-strait-r1-1' },
  { id: 'riverDeltaShelfWorld', label: 'River Delta Shelf World', defaultSeed: 'atlas-river-delta-r1-1' },
  { id: 'mixedRegionalWorld', label: 'Mixed Regional World', defaultSeed: 'atlas-mixed-r1-1' }
]);

export const OPERATIONAL_WINDOW_PRESETS = Object.freeze([
  { id: 'coastalShelfSurvey', label: 'Coastal Shelf Survey', x: 0.12, y: 0.28, width: 0.28, height: 0.34 },
  { id: 'semiEnclosedGulfSurvey', label: 'Semi-Enclosed Gulf Survey', x: 0.22, y: 0.19, width: 0.36, height: 0.42 },
  { id: 'islandChainSurvey', label: 'Island Chain Survey', x: 0.48, y: 0.2, width: 0.34, height: 0.36 },
  { id: 'shelfBreakCanyonSurvey', label: 'Shelf Break + Canyon Survey', x: 0.34, y: 0.32, width: 0.34, height: 0.34 },
  { id: 'riverMouthPlumeSurvey', label: 'River Mouth Plume Survey', x: 0.12, y: 0.08, width: 0.3, height: 0.3 },
  { id: 'straitSillSurvey', label: 'Strait / Sill Survey', x: 0.44, y: 0.52, width: 0.34, height: 0.26 },
  { id: 'openOceanEddySurvey', label: 'Open Ocean Eddy Survey', x: 0.62, y: 0.54, width: 0.28, height: 0.3 }
]);

const DEFAULT_RESOLUTION = Object.freeze({ columns: 72, rows: 48 });
const FIELD_NAMES = Object.freeze([
  'landOceanMask',
  'signedDistanceToCoast',
  'distanceToCoast',
  'continentalShelf',
  'shelfBreak',
  'deepBasin',
  'islandSeamount',
  'canyonPotential',
  'riverMouthInfluence',
  'straitSillInfluence',
  'gulfBayInfluence',
  'openOceanCorridor',
  'dominantCurrentRegime',
  'scalarRegime',
  'missionSuitability'
]);

const CONTEXT_LABELS = Object.freeze({
  coastShelf: 'coast / shelf',
  gulfBasin: 'gulf / basin',
  islandChain: 'island chain',
  shelfBreak: 'shelf break',
  deepBasin: 'deep basin',
  straitSill: 'strait / sill',
  riverMouth: 'river mouth',
  openOcean: 'open ocean'
});

const CURRENT_REGIME_IDS = Object.freeze([
  'coastParallelShelfCurrent',
  'basinRecirculation',
  'mouthInflowOutflow',
  'islandWake',
  'straitJet',
  'tidalReversal',
  'mesoscaleEddy',
  'broadBackgroundCurrent',
  'weakLandConstraint'
]);

const SCALAR_REGIME_IDS = Object.freeze([
  'riverPlume',
  'bloomPatch',
  'thermoclineHotspot',
  'shelfNutrientPatch',
  'islandWakePatch',
  'mixingFront',
  'eddyTrappedHotspot',
  'sparseOpenOceanPatch'
]);

const PRESET_CONFIGS = Object.freeze({
  syntheticGulfWorld: {
    domainStyle: 'semiEnclosedGulf',
    landmassStrategy: 'western-continent-with-curved-gulf',
    basinStrategy: 'protected-basin-mouth',
    islandStrategy: 'sparse-mouth-islands',
    shelfStrategy: 'wide-curved-shelf',
    currentBias: ['basinRecirculation', 'mouthInflowOutflow', 'coastParallelShelfCurrent'],
    scalarBias: ['bloomPatch', 'thermoclineHotspot', 'riverPlume'],
    missionScaleBias: 'regionalSurvey2to3',
    landEllipses: [{ cx: -0.08, cy: 0.48, rx: 0.3, ry: 0.78 }, { cx: 0.22, cy: -0.08, rx: 0.32, ry: 0.22 }],
    gulf: { cx: 0.35, cy: 0.43, rx: 0.28, ry: 0.31 },
    basin: { cx: 0.62, cy: 0.6, rx: 0.29, ry: 0.24 },
    riverMouths: [{ x: 0.2, y: 0.22 }],
    straits: [{ x: 0.52, y: 0.49, rx: 0.14, ry: 0.07 }]
  },
  islandChainWorld: {
    domainStyle: 'archipelago',
    landmassStrategy: 'small-island-chain',
    basinStrategy: 'deep-open-corridors',
    islandStrategy: 'dense-arc',
    shelfStrategy: 'island-fringing-shelves',
    currentBias: ['islandWake', 'broadBackgroundCurrent', 'mesoscaleEddy'],
    scalarBias: ['islandWakePatch', 'mixingFront', 'sparseOpenOceanPatch'],
    missionScaleBias: 'regionalSurvey2to3',
    landEllipses: [{ cx: -0.12, cy: 0.32, rx: 0.18, ry: 0.52 }],
    islands: [{ x: 0.52, y: 0.24 }, { x: 0.61, y: 0.32 }, { x: 0.72, y: 0.42 }, { x: 0.82, y: 0.55 }],
    basin: { cx: 0.72, cy: 0.66, rx: 0.32, ry: 0.26 },
    straits: [{ x: 0.62, y: 0.48, rx: 0.22, ry: 0.06 }]
  },
  shelfToBasinWorld: {
    domainStyle: 'shelfToBasin',
    landmassStrategy: 'western-continent',
    basinStrategy: 'broad-deep-basin',
    islandStrategy: 'rare-seamounts',
    shelfStrategy: 'wide-shelf-break',
    currentBias: ['coastParallelShelfCurrent', 'broadBackgroundCurrent'],
    scalarBias: ['shelfNutrientPatch', 'thermoclineHotspot'],
    missionScaleBias: 'regionalSurvey2to3',
    landEllipses: [{ cx: -0.14, cy: 0.5, rx: 0.28, ry: 0.86 }],
    basin: { cx: 0.72, cy: 0.58, rx: 0.33, ry: 0.33 },
    canyons: [{ start: { x: 0.35, y: 0.22 }, end: { x: 0.66, y: 0.72 } }, { start: { x: 0.4, y: 0.72 }, end: { x: 0.7, y: 0.46 } }]
  },
  openOceanEddyWorld: {
    domainStyle: 'openOcean',
    landmassStrategy: 'weak-distant-land',
    basinStrategy: 'open-ocean-eddy-field',
    islandStrategy: 'seamount-scatter',
    shelfStrategy: 'minimal-land-constraint',
    currentBias: ['mesoscaleEddy', 'broadBackgroundCurrent', 'weakLandConstraint'],
    scalarBias: ['eddyTrappedHotspot', 'sparseOpenOceanPatch'],
    missionScaleBias: 'fleetBenchmark4to6',
    landEllipses: [{ cx: -0.28, cy: 0.3, rx: 0.16, ry: 0.5 }],
    basin: { cx: 0.68, cy: 0.58, rx: 0.42, ry: 0.34 },
    eddies: [{ x: 0.7, y: 0.62 }, { x: 0.56, y: 0.4 }],
    seamountCount: 6
  },
  straitSillWorld: {
    domainStyle: 'straitSill',
    landmassStrategy: 'near-touching-landmasses',
    basinStrategy: 'two-basins-with-sill',
    islandStrategy: 'sill-islets',
    shelfStrategy: 'constrained-channel',
    currentBias: ['straitJet', 'tidalReversal', 'mouthInflowOutflow'],
    scalarBias: ['mixingFront', 'thermoclineHotspot'],
    missionScaleBias: 'regionalSurvey2to3',
    landEllipses: [{ cx: 0.16, cy: 0.2, rx: 0.32, ry: 0.34 }, { cx: 0.2, cy: 0.82, rx: 0.36, ry: 0.32 }],
    basin: { cx: 0.74, cy: 0.58, rx: 0.3, ry: 0.27 },
    straits: [{ x: 0.34, y: 0.52, rx: 0.18, ry: 0.08 }]
  },
  riverDeltaShelfWorld: {
    domainStyle: 'riverDeltaShelf',
    landmassStrategy: 'northwest-river-coast',
    basinStrategy: 'shelf-to-delta-basin',
    islandStrategy: 'rare-barrier-islands',
    shelfStrategy: 'deltaic-shelf',
    currentBias: ['coastParallelShelfCurrent', 'mouthInflowOutflow'],
    scalarBias: ['riverPlume', 'shelfNutrientPatch', 'bloomPatch'],
    missionScaleBias: 'singleGliderSurvey',
    landEllipses: [{ cx: -0.08, cy: 0.24, rx: 0.33, ry: 0.58 }, { cx: 0.16, cy: -0.12, rx: 0.48, ry: 0.2 }],
    basin: { cx: 0.7, cy: 0.65, rx: 0.28, ry: 0.26 },
    riverMouths: [{ x: 0.2, y: 0.18 }, { x: 0.28, y: 0.28 }]
  },
  mixedRegionalWorld: {
    domainStyle: 'mixedRegional',
    landmassStrategy: 'coast-gulf-island-composite',
    basinStrategy: 'mixed-basin-shelf-break',
    islandStrategy: 'moderate-archipelago',
    shelfStrategy: 'variable-shelf-break',
    currentBias: ['coastParallelShelfCurrent', 'basinRecirculation', 'islandWake', 'straitJet'],
    scalarBias: ['riverPlume', 'bloomPatch', 'islandWakePatch', 'mixingFront'],
    missionScaleBias: 'fleetBenchmark4to6',
    landEllipses: [{ cx: -0.1, cy: 0.48, rx: 0.29, ry: 0.78 }, { cx: 0.18, cy: -0.1, rx: 0.33, ry: 0.2 }],
    gulf: { cx: 0.36, cy: 0.42, rx: 0.24, ry: 0.28 },
    basin: { cx: 0.68, cy: 0.62, rx: 0.3, ry: 0.26 },
    islands: [{ x: 0.62, y: 0.24 }, { x: 0.72, y: 0.34 }, { x: 0.78, y: 0.46 }],
    riverMouths: [{ x: 0.22, y: 0.2 }],
    straits: [{ x: 0.48, y: 0.52, rx: 0.18, ry: 0.07 }],
    canyons: [{ start: { x: 0.36, y: 0.28 }, end: { x: 0.65, y: 0.7 } }]
  }
});

export function createSyntheticOceanAtlas(options = {}) {
  const preset = atlasPresetById(options.presetId ?? options.atlasPreset);
  const config = PRESET_CONFIGS[preset.id] ?? PRESET_CONFIGS.mixedRegionalWorld;
  const seed = String(options.seed ?? preset.defaultSeed ?? 'env-atlas-r1-1');
  const resolution = normalizeResolution(options.resolution);
  const generated = generateAtlasFields({ preset, config, seed, resolution });
  const atlasBase = {
    atlasType: SYNTHETIC_OCEAN_ATLAS_TYPE,
    atlasVersion: SYNTHETIC_OCEAN_ATLAS_VERSION,
    atlasId: String(options.atlasId ?? `${preset.id}-atlas`),
    label: String(options.label ?? preset.label),
    seed,
    atlasPreset: preset.id,
    coordinateFrame: 'normalizedSyntheticAtlas',
    width: 1,
    height: 1,
    widthNormalized: 1,
    heightNormalized: 1,
    resolution,
    presetDefinition: {
      domainStyle: config.domainStyle,
      landmassStrategy: config.landmassStrategy,
      basinStrategy: config.basinStrategy,
      islandStrategy: config.islandStrategy,
      shelfStrategy: config.shelfStrategy,
      currentRegimeBias: config.currentBias,
      scalarRegimeBias: config.scalarBias,
      missionScaleBias: config.missionScaleBias
    },
    layers: generated.layers,
    layerSummaries: summarizeAtlasLayers(generated.layers),
    currentRegimeLegend: CURRENT_REGIME_IDS,
    scalarRegimeLegend: SCALAR_REGIME_IDS,
    features: generated.features,
    regions: generated.regions,
    validation: validateAtlasFields(generated.layers, resolution),
    fieldEngine: {
      version: SYNTHETIC_ATLAS_NOISE_VERSION,
      topologySource: 'structured distance fields and feature primitives',
      roughnessUse: 'controlled coastline and seabed variability only',
      rawNoiseTerrain: false
    },
    claimBoundary: {
      deterministicSyntheticOceanAtlas: true,
      syntheticOceanAtlas: true,
      realEarthMap: false,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest(atlasBase, 'atlasDigest');
}

export function normalizeOperationalWindow(input = {}, atlasInput = createSyntheticOceanAtlas()) {
  const atlas = atlasInput.atlasType === SYNTHETIC_OCEAN_ATLAS_TYPE ? atlasInput : createSyntheticOceanAtlas(atlasInput);
  const preset = operationalWindowPresetById(input.windowPresetId ?? input.presetId);
  const width = clampFinite(input.width ?? preset.width, 0.12, 0.74, preset.width);
  const height = clampFinite(input.height ?? preset.height, 0.12, 0.74, preset.height);
  const x = clampFinite(input.x ?? preset.x, 0, 1 - width, preset.x);
  const y = clampFinite(input.y ?? preset.y, 0, 1 - height, preset.y);
  const windowBase = {
    windowType: 'anchor.synthetic-ocean-atlas.operational-window',
    windowVersion: OPERATIONAL_WINDOW_VERSION,
    windowId: String(input.windowId ?? preset.id),
    atlasId: atlas.atlasId,
    atlasDigest: atlas.atlasDigest,
    x,
    y,
    width,
    height,
    center: { x: round(x + width / 2), y: round(y + height / 2) },
    bounds: {
      xMin: round(x),
      yMin: round(y),
      xMax: round(x + width),
      yMax: round(y + height)
    },
    selectedBy: String(input.selectedBy ?? 'preset'),
    label: String(input.label ?? preset.label)
  };
  const sampledFieldStats = sampleAtlasWindowStats(atlas, windowBase);
  const detectedContext = inferAtlasContext(atlas, { ...windowBase, sampledFieldStats });
  const recommendations = recommendationsForContext(detectedContext, input, sampledFieldStats);
  const flowGenerationInputSummary = createAtlasWindowFlowGenerationInputSummary({
    atlas,
    window: windowBase,
    sampledFieldStats,
    detectedContext,
    recommendations
  });
  return withDigest({
    ...windowBase,
    sampledFieldStats,
    detectedContext,
    landFraction: detectedContext.landFraction,
    waterFraction: detectedContext.waterFraction,
    shelfFraction: detectedContext.shelfFraction,
    shelfBreakFraction: detectedContext.shelfBreakFraction,
    deepBasinFraction: detectedContext.deepBasinFraction,
    islandFraction: detectedContext.islandFraction,
    canyonPotential: detectedContext.canyonPotential,
    riverMouthInfluence: detectedContext.riverMouthInfluence,
    straitSillInfluence: detectedContext.straitSillInfluence,
    gulfBayInfluence: detectedContext.gulfBayInfluence,
    openOceanFraction: detectedContext.openOceanFraction,
    recommendedMissionScale: recommendations.recommendedMissionScale,
    recommendedDomain: recommendations.recommendedDomain,
    recommendedGliders: recommendations.recommendedGliders,
    recommendedDurationSeconds: recommendations.recommendedDurationSeconds,
    bathymetryRegime: recommendations.bathymetryRegime,
    currentRegime: recommendations.currentRegimeHints,
    scalarRegime: recommendations.scalarRegimeHints,
    currentRegimeHints: recommendations.currentRegimeHints,
    scalarRegimeHints: recommendations.scalarRegimeHints,
    coastlineOrientation: recommendations.coastlineOrientation,
    openBoundarySides: recommendations.openBoundarySides,
    featureMix: recommendations.featureMix,
    validationProfile: recommendations.validationProfile,
    futureCouplingMetadata: recommendations.futureCouplingMetadata,
    flowGenerationInputSummary,
    claimBoundary: {
      synthetic: true,
      realEarthMap: false,
      calibratedOceanProduct: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    }
  }, 'windowDigest');
}

export function inferAtlasContext(atlas = createSyntheticOceanAtlas(), window = {}) {
  const stats = window.sampledFieldStats ?? sampleAtlasWindowStats(atlas, window);
  const means = stats.layerMeans ?? {};
  const landFraction = clamp(round(means.landOceanMask ?? 0));
  const waterFraction = clamp(round(1 - landFraction));
  const shelfFraction = clamp(round((means.continentalShelf ?? 0) * waterFraction));
  const shelfBreakFraction = clamp(round(means.shelfBreak ?? 0));
  const deepBasinFraction = clamp(round(means.deepBasin ?? 0));
  const islandFraction = clamp(round(means.islandSeamount ?? 0));
  const canyonPotential = clamp(round(means.canyonPotential ?? 0));
  const riverMouthInfluence = clamp(round(means.riverMouthInfluence ?? 0));
  const straitSillInfluence = clamp(round(means.straitSillInfluence ?? means.straitInfluence ?? 0));
  const gulfBayInfluence = clamp(round(means.gulfBayInfluence ?? 0));
  const openOceanFraction = clamp(round(means.openOceanCorridor ?? 0));
  const scoreEntries = [
    ['riverMouth', riverMouthInfluence * 1.35],
    ['straitSill', straitSillInfluence * 1.3],
    ['gulfBasin', gulfBayInfluence * 1.22],
    ['islandChain', islandFraction * 1.12],
    ['shelfBreak', shelfBreakFraction + canyonPotential * 0.45],
    ['coastShelf', shelfFraction + Math.max(0, 0.24 - stats.meanDistanceToCoast) * 0.5],
    ['deepBasin', deepBasinFraction],
    ['openOcean', openOceanFraction * (waterFraction > 0.82 ? 1.2 : 0.9)]
  ];
  scoreEntries.sort((a, b) => b[1] - a[1]);
  const primaryContext = scoreEntries[0]?.[1] > 0.08 ? scoreEntries[0][0] : 'openOcean';
  const secondaryContexts = scoreEntries.slice(1).filter((entry) => entry[1] >= 0.14).map((entry) => entry[0]);
  const contextScores = Object.fromEntries(scoreEntries.map(([key, value]) => [key, round(value)]));
  const regimeHints = rankedRegimeHints(primaryContext, secondaryContexts, stats);
  return {
    primary: primaryContext,
    primaryContext,
    primaryContextLabel: CONTEXT_LABELS[primaryContext],
    secondary: secondaryContexts,
    secondaryContexts,
    contextScores,
    sampledFieldStats: stats,
    landFraction,
    waterFraction,
    shelfFraction,
    shelfBreakFraction,
    deepBasinFraction,
    basinFraction: round(deepBasinFraction + gulfBayInfluence * 0.45),
    islandFraction,
    canyonPotential,
    riverMouthInfluence,
    straitSillInfluence,
    straitInfluence: straitSillInfluence,
    gulfBayInfluence,
    openOceanFraction,
    openBoundarySides: boundarySidesForContext(primaryContext, secondaryContexts, stats),
    currentRegimeHint: regimeHints.currentRegime,
    scalarRegimeHint: regimeHints.scalarRegime,
    currentRegimeHints: regimeHints.currentRegime,
    scalarRegimeHints: regimeHints.scalarRegime,
    missionSuitabilityHint: missionSuitabilityForContext(primaryContext, waterFraction, stats),
    synthetic: true,
    notOperationalForecast: true
  };
}

export function createRegionalMissionRecipe(options = {}) {
  const atlas = options.atlas?.atlasType === SYNTHETIC_OCEAN_ATLAS_TYPE
    ? options.atlas
    : createSyntheticOceanAtlas(options.atlas ?? options);
  const selectedWindow = options.selectedWindow?.windowDigest
    ? options.selectedWindow
    : normalizeOperationalWindow(options.selectedWindow ?? options.window ?? {}, atlas);
  const datasetTags = datasetTagsForWindow(selectedWindow);
  const dependencyPlan = {
    bathymetry: 'CURRENT_AFTER_GENERATE',
    wetLandMask: 'CURRENT_AFTER_GENERATE',
    coastline: 'CURRENT_AFTER_GENERATE',
    currents: 'REQUIRES_REGENERATION',
    scalarFields: 'REQUIRES_REGENERATION',
    hotspots: 'REQUIRES_REGENERATION',
    startsDropZones: 'NEEDS_VALIDATION',
    benchmarkBundle: 'REQUIRES_REGENERATION',
    environmentArtifact: 'REQUIRES_REGENERATION'
  };
  const domainSize = {
    widthMeters: selectedWindow.recommendedDomain.widthMeters,
    heightMeters: selectedWindow.recommendedDomain.heightMeters
  };
  const sourceResolution = {
    cellSizeMeters: selectedWindow.recommendedDomain.sourceResolutionMeters,
    rows: selectedWindow.recommendedDomain.rows,
    columns: selectedWindow.recommendedDomain.columns
  };
  const previewResolution = {
    cellSizeMeters: selectedWindow.recommendedDomain.previewResolutionMeters
  };
  const flowGenerationInputs = createRecipeFlowGenerationInputs({
    atlas,
    selectedWindow,
    domainSize,
    sourceResolution,
    previewResolution,
    intendedGliders: selectedWindow.recommendedGliders,
    missionDurationSeconds: selectedWindow.recommendedDurationSeconds,
    dependencyPlan
  });
  const recipeBase = {
    recipeType: REGIONAL_MISSION_RECIPE_TYPE,
    recipeVersion: REGIONAL_MISSION_RECIPE_VERSION,
    atlasDigest: atlas.atlasDigest,
    windowDigest: selectedWindow.windowDigest,
    selectedWindow,
    domainSize,
    sourceResolution,
    previewResolution,
    coastlineOrientation: selectedWindow.coastlineOrientation,
    openBoundarySides: selectedWindow.openBoundarySides,
    bathymetryRegime: selectedWindow.bathymetryRegime,
    currentRegime: selectedWindow.currentRegimeHints ?? selectedWindow.currentRegime ?? [],
    scalarRegime: selectedWindow.scalarRegimeHints ?? selectedWindow.scalarRegime ?? [],
    currentRegimeHints: selectedWindow.currentRegimeHints ?? selectedWindow.currentRegime ?? [],
    scalarRegimeHints: selectedWindow.scalarRegimeHints ?? selectedWindow.scalarRegime ?? [],
    featureMix: selectedWindow.featureMix,
    atlasFieldStats: selectedWindow.sampledFieldStats,
    intendedGliders: selectedWindow.recommendedGliders,
    missionDuration: {
      durationSeconds: selectedWindow.recommendedDurationSeconds,
      label: `${Math.round(selectedWindow.recommendedDurationSeconds / 3600)} hr`
    },
    randomSeed: String(options.randomSeed ?? options.seed ?? `${atlas.seed}:${selectedWindow.windowId}`),
    validationProfile: selectedWindow.validationProfile,
    dependencyPlan,
    datasetTags,
    futureCouplingMetadata: selectedWindow.futureCouplingMetadata,
    flowGenerationInputs,
    claimBoundary: {
      synthetic: true,
      referenceInformed: true,
      realEarthMap: false,
      calibratedOceanProduct: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest(recipeBase, 'recipeDigest');
}

export function environmentStudioOptionsFromRegionalRecipe(recipe = {}) {
  const domain = recipe.domainSize ?? {};
  const source = recipe.sourceResolution ?? {};
  const missionScale = missionScaleForGliders(recipe.intendedGliders);
  return {
    profileId: 'custom',
    environmentType: 'custom',
    label: recipe.selectedWindow?.label ?? 'Atlas Selected Region',
    seed: recipe.randomSeed,
    missionScale,
    intendedGliders: recipe.intendedGliders,
    estimatedMissionDuration: recipe.missionDuration?.label,
    regionalTemplate: regionalTemplateForBathymetryRegime(recipe.bathymetryRegime),
    coastlineOrientation: recipe.coastlineOrientation,
    openOceanBoundaries: recipe.openBoundarySides,
    featureMix: recipe.featureMix,
    previewDetail: 'medium',
    domainSpec: {
      horizontal: {
        widthMeters: domain.widthMeters,
        heightMeters: domain.heightMeters,
        cellSizeMeters: source.cellSizeMeters
      },
      vertical: {
        maxDepthMeters: maxDepthForRegime(recipe.bathymetryRegime)
      },
      time: {
        durationSeconds: recipe.missionDuration?.durationSeconds,
        dtSeconds: 300
      }
    }
  };
}

export function atlasPresetById(id = 'mixedRegionalWorld') {
  const key = String(id ?? 'mixedRegionalWorld');
  return SYNTHETIC_OCEAN_ATLAS_PRESETS.find((preset) => preset.id === key) ?? SYNTHETIC_OCEAN_ATLAS_PRESETS.at(-1);
}

export function operationalWindowPresetById(id = 'semiEnclosedGulfSurvey') {
  const key = String(id ?? 'semiEnclosedGulfSurvey');
  return OPERATIONAL_WINDOW_PRESETS.find((preset) => preset.id === key) ?? OPERATIONAL_WINDOW_PRESETS[1];
}

export function sampleAtlasLayer(atlas = {}, layerName = 'distanceToCoast', x = 0.5, y = 0.5) {
  const grid = atlas.layers?.[layerName];
  if (!Array.isArray(grid) || !grid.length) return 0;
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  const gx = clamp(x) * (columns - 1);
  const gy = clamp(y) * (rows - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(columns - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);
  const tx = gx - x0;
  const ty = gy - y0;
  const top = lerp(Number(grid[y0]?.[x0] ?? 0), Number(grid[y0]?.[x1] ?? 0), tx);
  const bottom = lerp(Number(grid[y1]?.[x0] ?? 0), Number(grid[y1]?.[x1] ?? 0), tx);
  return round(lerp(top, bottom, ty));
}

export function sampleAtlasWindowStats(atlas = createSyntheticOceanAtlas(), window = {}) {
  const sampleCount = Math.max(5, Math.floor(Number(window.sampleCount ?? 11)));
  const layerValues = Object.fromEntries(FIELD_NAMES.map((name) => [name, []]));
  const xMin = Number(window.x ?? window.bounds?.xMin ?? 0);
  const yMin = Number(window.y ?? window.bounds?.yMin ?? 0);
  const width = Number(window.width ?? ((window.bounds?.xMax ?? 0.3) - xMin) ?? 0.3);
  const height = Number(window.height ?? ((window.bounds?.yMax ?? 0.3) - yMin) ?? 0.3);
  for (let sy = 0; sy < sampleCount; sy += 1) {
    for (let sx = 0; sx < sampleCount; sx += 1) {
      const x = xMin + (sx + 0.5) / sampleCount * width;
      const y = yMin + (sy + 0.5) / sampleCount * height;
      for (const layerName of FIELD_NAMES) layerValues[layerName].push(sampleAtlasLayer(atlas, layerName, x, y));
    }
  }
  const layerMeans = {};
  const layerMax = {};
  const layerMin = {};
  for (const [name, values] of Object.entries(layerValues)) {
    const finite = values.map(Number).filter(Number.isFinite);
    layerMeans[name] = finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : 0;
    layerMin[name] = finite.length ? round(Math.min(...finite)) : 0;
    layerMax[name] = finite.length ? round(Math.max(...finite)) : 0;
  }
  return {
    type: 'anchor.synthetic-ocean-atlas.window-field-stats',
    atlasDigest: atlas.atlasDigest,
    sampleCount: sampleCount * sampleCount,
    bounds: {
      xMin: round(xMin),
      yMin: round(yMin),
      xMax: round(xMin + width),
      yMax: round(yMin + height)
    },
    layerMeans,
    layerMin,
    layerMax,
    meanDistanceToCoast: layerMeans.distanceToCoast,
    fieldStatsDigest: canonicalJsonDigest({ layerMeans, layerMin, layerMax, bounds: { xMin, yMin, width, height } })
  };
}

function createAtlasWindowFlowGenerationInputSummary({
  atlas,
  window,
  sampledFieldStats,
  detectedContext,
  recommendations
} = {}) {
  const zones = atlasWindowFlowZones(atlas, window);
  const base = {
    type: 'anchor.synthetic-ocean-atlas.window-flow-input-summary',
    version: FLOW_GENERATION_INPUTS_VERSION,
    atlasDigest: atlas?.atlasDigest ?? null,
    windowId: window?.windowId ?? null,
    windowBounds: window?.bounds ?? null,
    wetLandMaskIdentity: {
      source: 'atlas.layer.landOceanMask',
      atlasDigest: atlas?.atlasDigest ?? null,
      layerSummary: layerStatSummary(sampledFieldStats, 'landOceanMask'),
      layerDigest: canonicalJsonDigest({
        atlasDigest: atlas?.atlasDigest ?? null,
        windowDigest: window?.windowDigest ?? null,
        layer: 'landOceanMask',
        stats: layerStatSummary(sampledFieldStats, 'landOceanMask')
      })
    },
    coastlineSignedDistanceFieldSummary: {
      signedDistanceToCoast: layerStatSummary(sampledFieldStats, 'signedDistanceToCoast'),
      distanceToCoast: layerStatSummary(sampledFieldStats, 'distanceToCoast'),
      fieldStatsDigest: sampledFieldStats?.fieldStatsDigest ?? null
    },
    openBoundarySides: recommendations?.openBoundarySides ?? detectedContext?.openBoundarySides ?? [],
    gulfMouthBaySegments: zones.gulfMouthBaySegments,
    straitSillSegments: zones.straitSillSegments,
    islandSeamountZones: zones.islandSeamountZones,
    shelfBreakZones: zones.shelfBreakZones,
    deepBasinCenters: zones.deepBasinCenters,
    riverMouthDeltaSourceZones: zones.riverMouthDeltaSourceZones,
    canyonCenterlines: zones.canyonCenterlines,
    canyonPotentialZones: zones.canyonPotentialZones,
    currentRegimeHints: recommendations?.currentRegimeHints ?? detectedContext?.currentRegimeHints ?? [],
    scalarRegimeHints: recommendations?.scalarRegimeHints ?? detectedContext?.scalarRegimeHints ?? [],
    validationStatus: detectedContext?.missionSuitabilityHint?.startsWith?.('WARN') ? 'WARN' : 'PASS',
    generatedArtifacts: generatedArtifactsDeferredFlags(),
    hiddenTruthExposed: false
  };
  return withDigest(base, 'flowInputSummaryDigest');
}

function createRecipeFlowGenerationInputs({
  atlas,
  selectedWindow,
  domainSize,
  sourceResolution,
  previewResolution,
  intendedGliders,
  missionDurationSeconds,
  dependencyPlan
} = {}) {
  const sourceGridShape = gridShapeForResolution(domainSize, sourceResolution);
  const previewGridShape = gridShapeForResolution(domainSize, {
    cellSizeMeters: previewResolution?.cellSizeMeters
  });
  const dtSeconds = Math.max(60, Math.round(Number(selectedWindow?.recommendedDomain?.timeStepSeconds ?? 300)));
  const base = {
    type: FLOW_GENERATION_INPUTS_TYPE,
    version: FLOW_GENERATION_INPUTS_VERSION,
    sourcePhase: 'ENV-ATLAS-R1.1',
    status: 'metadata-only-no-current-or-scalar-artifacts',
    atlasDigest: atlas?.atlasDigest ?? null,
    atlasPreset: atlas?.atlasPreset ?? null,
    windowDigest: selectedWindow?.windowDigest ?? null,
    windowId: selectedWindow?.windowId ?? null,
    selectedWindowBounds: selectedWindow?.bounds ?? null,
    wetLandMaskIdentity: selectedWindow?.flowGenerationInputSummary?.wetLandMaskIdentity ?? null,
    bottomDepthBathymetryArtifactDigest: null,
    bathymetryArtifactDigest: null,
    bottomDepthDigest: null,
    coastlineSummary: null,
    coastlineSignedDistanceFieldSummary: selectedWindow?.flowGenerationInputSummary?.coastlineSignedDistanceFieldSummary ?? null,
    coastNormalTangentSummary: {
      available: false,
      status: 'requires-generated-bathymetry-coastline',
      source: 'FIELD-REGEN-R1 input placeholder'
    },
    openBoundarySides: selectedWindow?.openBoundarySides ?? [],
    gulfMouthBaySegments: selectedWindow?.flowGenerationInputSummary?.gulfMouthBaySegments ?? [],
    straitSillSegments: selectedWindow?.flowGenerationInputSummary?.straitSillSegments ?? [],
    islandSeamountZones: selectedWindow?.flowGenerationInputSummary?.islandSeamountZones ?? [],
    shelfBreakZones: selectedWindow?.flowGenerationInputSummary?.shelfBreakZones ?? [],
    deepBasinCenters: selectedWindow?.flowGenerationInputSummary?.deepBasinCenters ?? [],
    riverMouthDeltaSourceZones: selectedWindow?.flowGenerationInputSummary?.riverMouthDeltaSourceZones ?? [],
    canyonCenterlines: selectedWindow?.flowGenerationInputSummary?.canyonCenterlines ?? [],
    canyonPotentialZones: selectedWindow?.flowGenerationInputSummary?.canyonPotentialZones ?? [],
    currentRegimeHints: selectedWindow?.currentRegimeHints ?? selectedWindow?.currentRegime ?? [],
    scalarRegimeHints: selectedWindow?.scalarRegimeHints ?? selectedWindow?.scalarRegime ?? [],
    depthAxisMeters: depthAxisForRegime(selectedWindow?.bathymetryRegime),
    timeAxisSeconds: compactTimeAxisSeconds(missionDurationSeconds, dtSeconds),
    timeAxisPolicy: {
      startSeconds: 0,
      durationSeconds: Math.round(Number(missionDurationSeconds ?? 0)),
      dtSeconds,
      compactedForMetadata: true
    },
    intendedGliders: Math.max(1, Math.round(Number(intendedGliders ?? 1))),
    missionDurationSeconds: Math.round(Number(missionDurationSeconds ?? 0)),
    sourceGridShape,
    previewGridShape,
    validationStatus: selectedWindow?.flowGenerationInputSummary?.validationStatus ?? 'PASS',
    dependencyPlan,
    generatedArtifacts: generatedArtifactsDeferredFlags(),
    claimBoundary: {
      synthetic: true,
      currentField4DGenerated: false,
      scalarField4DGenerated: false,
      hotspotsGenerated: false,
      calibratedOceanProduct: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest(base, 'flowGenerationInputDigest');
}

function atlasWindowFlowZones(atlas = {}, window = {}) {
  const zone = (layerName, threshold, label, role) => summarizeLayerZone(atlas, window, layerName, threshold, label, role);
  return {
    gulfMouthBaySegments: [
      zone('gulfBayInfluence', 0.24, 'Gulf / bay mouth influence zone', 'gulfBayMouth')
    ].filter(Boolean),
    straitSillSegments: [
      ...featurePrimitivesForWindow(atlas, window, ['straitSill']),
      zone('straitSillInfluence', 0.2, 'Strait / sill exchange segment', 'straitSill')
    ].filter(Boolean),
    islandSeamountZones: [
      ...featurePrimitivesForWindow(atlas, window, ['island', 'seamount']),
      zone('islandSeamount', 0.3, 'Island / seamount influence zone', 'islandSeamount')
    ].filter(Boolean),
    shelfBreakZones: [
      zone('shelfBreak', 0.35, 'Shelf-break zone', 'shelfBreak')
    ].filter(Boolean),
    deepBasinCenters: [
      zone('deepBasin', 0.45, 'Deep-basin center', 'deepBasin')
    ].filter(Boolean),
    riverMouthDeltaSourceZones: [
      ...featurePrimitivesForWindow(atlas, window, ['riverMouth']),
      zone('riverMouthInfluence', 0.18, 'River-mouth / delta source zone', 'riverMouthDelta')
    ].filter(Boolean),
    canyonCenterlines: featurePrimitivesForWindow(atlas, window, ['canyonPotentialSpline']),
    canyonPotentialZones: [
      zone('canyonPotential', 0.22, 'Canyon-potential zone', 'canyonPotential')
    ].filter(Boolean)
  };
}

function summarizeLayerZone(atlas = {}, window = {}, layerName = '', threshold = 0.2, label = layerName, role = layerName) {
  if (!atlas.layers?.[layerName]) return null;
  const bounds = normalizeWindowBounds(window);
  const sampleCount = 9;
  let weight = 0;
  let sx = 0;
  let sy = 0;
  let support = 0;
  let maxValue = 0;
  let sum = 0;
  for (let y = 0; y < sampleCount; y += 1) {
    for (let x = 0; x < sampleCount; x += 1) {
      const ax = bounds.xMin + (x + 0.5) / sampleCount * (bounds.xMax - bounds.xMin);
      const ay = bounds.yMin + (y + 0.5) / sampleCount * (bounds.yMax - bounds.yMin);
      const value = Number(sampleAtlasLayer(atlas, layerName, ax, ay));
      if (!Number.isFinite(value)) continue;
      sum += value;
      maxValue = Math.max(maxValue, value);
      if (value >= threshold) {
        support += 1;
        weight += value;
        sx += ax * value;
        sy += ay * value;
      }
    }
  }
  const supportFraction = support / (sampleCount * sampleCount);
  if (!support && maxValue < threshold) return null;
  const center = weight
    ? { x: round(sx / weight), y: round(sy / weight) }
    : { x: round((bounds.xMin + bounds.xMax) / 2), y: round((bounds.yMin + bounds.yMax) / 2) };
  return {
    zoneId: `${window.windowId ?? 'window'}-${role}`,
    type: role,
    label,
    sourceLayer: layerName,
    approximateCenterNormalized: center,
    supportFraction: round(supportFraction),
    mean: round(sum / (sampleCount * sampleCount)),
    max: round(maxValue),
    threshold,
    fieldSummaryDigest: canonicalJsonDigest({ atlasDigest: atlas.atlasDigest, window: bounds, layerName, threshold, center, supportFraction, maxValue }),
    synthetic: true,
    hiddenTruthExposed: false
  };
}

function featurePrimitivesForWindow(atlas = {}, window = {}, types = []) {
  const allowed = new Set(types);
  const bounds = normalizeWindowBounds(window);
  return (atlas.features ?? [])
    .filter((feature) => allowed.has(feature.type) && featureIntersectsWindow(feature, bounds))
    .map((feature) => compactFeaturePrimitive(feature));
}

function featureIntersectsWindow(feature = {}, bounds = {}) {
  const points = [];
  if (Number.isFinite(Number(feature.x)) && Number.isFinite(Number(feature.y))) points.push({ x: Number(feature.x), y: Number(feature.y) });
  if (feature.start) points.push({ x: Number(feature.start.x), y: Number(feature.start.y) });
  if (feature.end) points.push({ x: Number(feature.end.x), y: Number(feature.end.y) });
  if (feature.start && feature.end) {
    points.push({
      x: (Number(feature.start.x) + Number(feature.end.x)) / 2,
      y: (Number(feature.start.y) + Number(feature.end.y)) / 2
    });
  }
  return points.some((point) => point.x >= bounds.xMin && point.x <= bounds.xMax && point.y >= bounds.yMin && point.y <= bounds.yMax);
}

function compactFeaturePrimitive(feature = {}) {
  const compact = {
    featureId: feature.featureId,
    type: feature.type,
    source: feature.source,
    synthetic: true,
    hiddenTruthExposed: false
  };
  if (Number.isFinite(Number(feature.x)) && Number.isFinite(Number(feature.y))) {
    compact.approximateCenterNormalized = { x: round(feature.x), y: round(feature.y) };
  }
  if (feature.rx || feature.ry || feature.radius) {
    compact.radiusNormalized = round(feature.radius ?? Math.max(Number(feature.rx ?? 0), Number(feature.ry ?? 0)));
  }
  if (feature.start && feature.end) {
    compact.centerlineNormalized = {
      start: { x: round(feature.start.x), y: round(feature.start.y) },
      end: { x: round(feature.end.x), y: round(feature.end.y) },
      width: round(feature.width ?? 0)
    };
  }
  compact.primitiveDigest = canonicalJsonDigest(compact);
  return compact;
}

function normalizeWindowBounds(window = {}) {
  const xMin = Number(window.bounds?.xMin ?? window.x ?? 0);
  const yMin = Number(window.bounds?.yMin ?? window.y ?? 0);
  const xMax = Number(window.bounds?.xMax ?? (xMin + Number(window.width ?? 0.3)));
  const yMax = Number(window.bounds?.yMax ?? (yMin + Number(window.height ?? 0.3)));
  return {
    xMin: round(clamp(xMin)),
    yMin: round(clamp(yMin)),
    xMax: round(clamp(xMax)),
    yMax: round(clamp(yMax))
  };
}

function layerStatSummary(stats = {}, layerName = '') {
  return {
    layer: layerName,
    min: round(stats.layerMin?.[layerName] ?? 0),
    mean: round(stats.layerMeans?.[layerName] ?? 0),
    max: round(stats.layerMax?.[layerName] ?? 0)
  };
}

function gridShapeForResolution(domainSize = {}, resolution = {}) {
  const cellSizeMeters = Math.max(1, Number(resolution.cellSizeMeters ?? 1000));
  const columns = Math.max(2, Math.round(Number(resolution.columns ?? Math.floor(Number(domainSize.widthMeters ?? 0) / cellSizeMeters) + 1)));
  const rows = Math.max(2, Math.round(Number(resolution.rows ?? Math.floor(Number(domainSize.heightMeters ?? 0) / cellSizeMeters) + 1)));
  return {
    rows,
    columns,
    cellCount: rows * columns,
    widthMeters: round(Number(domainSize.widthMeters ?? 0)),
    heightMeters: round(Number(domainSize.heightMeters ?? 0)),
    cellSizeMeters: round(cellSizeMeters)
  };
}

function depthAxisForRegime(regime) {
  const maxDepth = maxDepthForRegime(regime);
  return [...new Set([0, 10, 35, 75, Math.min(150, maxDepth), maxDepth].map((value) => round(value)))].sort((a, b) => a - b);
}

function compactTimeAxisSeconds(durationSeconds = 0, dtSeconds = 300) {
  const duration = Math.max(0, Math.round(Number(durationSeconds ?? 0)));
  const dt = Math.max(1, Math.round(Number(dtSeconds ?? 300)));
  if (duration <= 0) return [0];
  const stepCount = Math.floor(duration / dt);
  if (stepCount <= 12) return Array.from({ length: stepCount + 1 }, (_entry, index) => index * dt);
  const samples = [];
  for (let index = 0; index <= 12; index += 1) samples.push(round(duration * index / 12));
  return [...new Set(samples)].sort((a, b) => a - b);
}

function generatedArtifactsDeferredFlags() {
  return {
    currentField4D: false,
    scalarField4D: false,
    hotspots: false,
    startsDropZonesValidated: false,
    benchmarkBundle: false
  };
}

function generateAtlasFields({ preset, config, seed, resolution }) {
  const rows = resolution.rows;
  const columns = resolution.columns;
  const layers = Object.fromEntries(FIELD_NAMES.map((name) => [name, emptyGrid(rows, columns)]));
  const featureConfig = proceduralFeatures(config, seed);
  const raw = Array.from({ length: rows }, () => Array.from({ length: columns }, () => ({})));

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const nx = columns <= 1 ? 0 : x / (columns - 1);
      const ny = rows <= 1 ? 0 : y / (rows - 1);
      raw[y][x] = evaluateStructuredAtlasCell(nx, ny, { preset, config, seed, features: featureConfig });
      layers.landOceanMask[y][x] = raw[y][x].land ? 1 : 0;
    }
  }

  const coastDistance = computeDistanceFields(layers.landOceanMask);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const cell = raw[y][x];
      const dist = coastDistance.distance[y][x];
      const signed = cell.land ? -dist : dist;
      const shelfWidth = clamp(0.16 + (cell.shelfWidthNoise - 0.5) * 0.09, 0.08, 0.28);
      const shelf = cell.land ? 0 : clamp(1 - smoothstep(shelfWidth * 0.25, shelfWidth, dist));
      const shelfBreak = cell.land ? 0 : gaussian1D(dist, shelfWidth, Math.max(0.025, shelfWidth * 0.18));
      const deepBasin = cell.land ? 0 : clamp(cell.basinPotential * 0.82 + smoothstep(shelfWidth * 0.8, 0.55, dist) * 0.55);
      const islandSeamount = cell.land ? clamp(cell.islandPotential) : clamp(cell.seamountPotential + cell.islandPotential * 0.45);
      const canyon = cell.land ? 0 : clamp(cell.canyonPotential * shelfBreak * (0.55 + deepBasin));
      const river = cell.land ? 0 : clamp(cell.riverMouthInfluence * (0.55 + shelf));
      const strait = cell.land ? 0 : clamp(cell.straitSillInfluence);
      const gulf = cell.land ? 0 : clamp(cell.gulfBayInfluence);
      const open = cell.land ? 0 : clamp((1 - shelf) * (0.45 + deepBasin * 0.55) * (1 - Math.max(gulf, strait) * 0.35));
      const currentIndex = dominantCurrentIndex({ shelf, shelfBreak, deepBasin, islandSeamount, river, strait, gulf, open }, config);
      const scalarIndex = dominantScalarIndex({ shelf, shelfBreak, deepBasin, islandSeamount, river, strait, gulf, open }, config);

      layers.signedDistanceToCoast[y][x] = round(clamp(signed, -1, 1));
      layers.distanceToCoast[y][x] = round(dist);
      layers.continentalShelf[y][x] = round(shelf);
      layers.shelfBreak[y][x] = round(shelfBreak);
      layers.deepBasin[y][x] = round(deepBasin);
      layers.islandSeamount[y][x] = round(islandSeamount);
      layers.canyonPotential[y][x] = round(canyon);
      layers.riverMouthInfluence[y][x] = round(river);
      layers.straitSillInfluence[y][x] = round(strait);
      layers.gulfBayInfluence[y][x] = round(gulf);
      layers.openOceanCorridor[y][x] = round(open);
      layers.dominantCurrentRegime[y][x] = currentIndex;
      layers.scalarRegime[y][x] = scalarIndex;
      layers.missionSuitability[y][x] = round(cell.land ? 0 : clamp(0.25 + shelf * 0.2 + deepBasin * 0.25 + Math.max(islandSeamount, canyon, river, strait, gulf, open) * 0.3));
    }
  }

  const features = atlasFeaturesFromConfig(featureConfig, config, seed);
  return {
    layers,
    features,
    regions: atlasRegionsFromFields(preset, config, features)
  };
}

function evaluateStructuredAtlasCell(x, y, context) {
  const { config, seed, features } = context;
  const warp = domainWarp2D(`${seed}:coast`, x, y, { strength: 0.035, frequency: 2.2 });
  const wx = warp.x;
  const wy = warp.y;
  let landScore = 0;
  for (const ellipse of config.landEllipses ?? []) {
    landScore = Math.max(landScore, ellipseScore(wx, wy, ellipse));
  }
  for (const island of features.islands) {
    landScore = Math.max(landScore, gaussian2D(wx, wy, island.x, island.y, island.rx, island.ry) * island.landStrength);
  }
  const coastlineRoughness = (fractalBrownianMotion2D(`${seed}:coastline`, x * 2.2, y * 2.2, { octaves: 4 }) - 0.5) * 0.18;
  let gulfBayInfluence = 0;
  if (config.gulf) {
    gulfBayInfluence = gaussian2D(x, y, config.gulf.cx, config.gulf.cy, config.gulf.rx, config.gulf.ry);
    landScore -= gulfBayInfluence * 0.72;
  }
  for (const strait of features.straits) {
    landScore -= gaussian2D(x, y, strait.x, strait.y, strait.rx, strait.ry) * 0.8;
  }
  const land = landScore + coastlineRoughness > 0.52;
  const basinPotential = config.basin ? gaussian2D(x, y, config.basin.cx, config.basin.cy, config.basin.rx, config.basin.ry) : 0;
  const islandPotential = Math.max(0, ...features.islands.map((island) => gaussian2D(x, y, island.x, island.y, island.rx * 2.2, island.ry * 2.2)));
  const seamountPotential = Math.max(0, ...features.seamounts.map((point) => gaussian2D(x, y, point.x, point.y, point.r, point.r)));
  const riverMouthInfluence = Math.max(0, ...(config.riverMouths ?? []).map((river) => gaussian2D(x, y, river.x, river.y, 0.1, 0.08)));
  const straitSillInfluence = Math.max(0, ...features.straits.map((strait) => gaussian2D(x, y, strait.x, strait.y, strait.rx, strait.ry)));
  const canyonPotential = Math.max(0, ...features.canyons.map((canyon) => {
    const segment = distanceToSegment(x, y, canyon.start.x, canyon.start.y, canyon.end.x, canyon.end.y);
    return Math.max(0, 1 - segment.distance / canyon.width) * Math.sin(segment.t * Math.PI);
  }));
  return {
    land,
    basinPotential,
    islandPotential,
    seamountPotential,
    canyonPotential,
    riverMouthInfluence,
    straitSillInfluence,
    gulfBayInfluence,
    shelfWidthNoise: fractalBrownianMotion2D(`${seed}:shelf-width`, x * 1.6, y * 1.6, { octaves: 3 })
  };
}

function proceduralFeatures(config, seed) {
  const seededIslands = (config.islands ?? []).map((point, index) => ({
    x: round(point.x + (seededUnit(seed, 'island-x', index) - 0.5) * 0.035),
    y: round(point.y + (seededUnit(seed, 'island-y', index) - 0.5) * 0.035),
    rx: round(0.035 + seededUnit(seed, 'island-rx', index) * 0.025),
    ry: round(0.028 + seededUnit(seed, 'island-ry', index) * 0.023),
    landStrength: round(0.85 + seededUnit(seed, 'island-strength', index) * 0.45)
  }));
  const seamounts = seededFeaturePoints(`${seed}:seamounts`, {
    count: Number(config.seamountCount ?? 5),
    minDistance: 0.11,
    bounds: { xMin: 0.42, yMin: 0.16, xMax: 0.92, yMax: 0.88 }
  }).map((point, index) => ({
    ...point,
    r: round(0.045 + seededUnit(seed, 'seamount-r', index) * 0.045)
  }));
  const straits = (config.straits ?? []).map((entry, index) => ({
    x: round(entry.x + (seededUnit(seed, 'strait-x', index) - 0.5) * 0.025),
    y: round(entry.y + (seededUnit(seed, 'strait-y', index) - 0.5) * 0.025),
    rx: entry.rx,
    ry: entry.ry
  }));
  const canyons = (config.canyons ?? [{ start: { x: 0.35, y: 0.28 }, end: { x: 0.66, y: 0.72 } }]).map((entry, index) => ({
    start: {
      x: round(entry.start.x + (seededUnit(seed, 'canyon-sx', index) - 0.5) * 0.04),
      y: round(entry.start.y + (seededUnit(seed, 'canyon-sy', index) - 0.5) * 0.04)
    },
    end: {
      x: round(entry.end.x + (seededUnit(seed, 'canyon-ex', index) - 0.5) * 0.05),
      y: round(entry.end.y + (seededUnit(seed, 'canyon-ey', index) - 0.5) * 0.05)
    },
    width: round(0.045 + seededUnit(seed, 'canyon-w', index) * 0.035)
  }));
  return { islands: seededIslands, seamounts, straits, canyons };
}

function computeDistanceFields(landMask = []) {
  const rows = landMask.length;
  const columns = landMask[0]?.length ?? 0;
  const boundary = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const value = landMask[y][x];
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx < 0 || ny < 0 || nx >= columns || ny >= rows || landMask[ny]?.[nx] !== value;
      });
      if (edge) boundary.push({ x, y });
    }
  }
  const diagonal = Math.sqrt(columns * columns + rows * rows);
  const distance = emptyGrid(rows, columns);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      let best = diagonal;
      for (const point of boundary) {
        const dx = x - point.x;
        const dy = y - point.y;
        best = Math.min(best, Math.sqrt(dx * dx + dy * dy));
      }
      distance[y][x] = round(best / Math.max(1, diagonal));
    }
  }
  return { distance };
}

function recommendationsForContext(context, input = {}, stats = {}) {
  const primary = context.primaryContext ?? 'openOcean';
  const fleet = input.missionScale === 'fleetBenchmark4to6' || primary === 'openOcean' || (primary === 'gulfBasin' && context.waterFraction > 0.62);
  const regional = input.missionScale === 'regionalSurvey2to3' || primary === 'shelfBreak' || primary === 'islandChain' || primary === 'straitSill';
  const gliders = Number.isFinite(Number(input.recommendedGliders))
    ? Number(input.recommendedGliders)
    : fleet ? 4 : regional ? 3 : 1;
  const duration = fleet ? 120 * 3600 : regional ? 72 * 3600 : 36 * 3600;
  const size = fleet ? [120000, 90000, 1500] : regional ? [76000, 56000, 1200] : [42000, 32000, 1000];
  const regimeHints = rankedRegimeHints(primary, context.secondaryContexts ?? [], stats);
  const domain = {
    widthMeters: size[0],
    heightMeters: size[1],
    sourceResolutionMeters: size[2],
    previewResolutionMeters: size[2] * 3,
    columns: Math.floor(size[0] / size[2]) + 1,
    rows: Math.floor(size[1] / size[2]) + 1
  };
  return {
    recommendedMissionScale: missionScaleForGliders(gliders),
    recommendedDomain: domain,
    recommendedGliders: gliders,
    recommendedDurationSeconds: duration,
    bathymetryRegime: bathymetryRegimeForContext(primary),
    currentRegimeHints: regimeHints.currentRegime,
    scalarRegimeHints: regimeHints.scalarRegime,
    coastlineOrientation: primary === 'islandChain' || primary === 'openOcean' ? 'islandArchipelago' : primary === 'gulfBasin' || primary === 'straitSill' ? 'curvedGulf' : 'westCoast',
    openBoundarySides: context.openBoundarySides ?? boundarySidesForContext(primary, context.secondaryContexts ?? [], stats),
    featureMix: featureMixForContext(primary, context),
    validationProfile: {
      id: `${primary}-synthetic-benchmark`,
      label: `${CONTEXT_LABELS[primary]} synthetic benchmark profile`,
      notOperationalValidation: true
    },
    futureCouplingMetadata: futureCouplingMetadata(context, regimeHints)
  };
}

function rankedRegimeHints(primary, secondary = [], stats = {}) {
  const contexts = [primary, ...secondary];
  const currentRegime = new Set();
  const scalarRegime = new Set();
  for (const context of contexts) {
    if (context === 'coastShelf') {
      ['coastParallelShelfCurrent', 'weakLandConstraint'].forEach((id) => currentRegime.add(id));
      ['shelfNutrientPatch', 'riverPlume'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'gulfBasin') {
      ['basinRecirculation', 'mouthInflowOutflow', 'coastParallelShelfCurrent'].forEach((id) => currentRegime.add(id));
      ['bloomPatch', 'thermoclineHotspot', 'riverPlume'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'islandChain') {
      ['islandWake', 'broadBackgroundCurrent', 'mesoscaleEddy'].forEach((id) => currentRegime.add(id));
      ['islandWakePatch', 'mixingFront'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'straitSill') {
      ['straitJet', 'tidalReversal', 'mouthInflowOutflow'].forEach((id) => currentRegime.add(id));
      ['mixingFront', 'thermoclineHotspot'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'openOcean' || context === 'deepBasin') {
      ['broadBackgroundCurrent', 'mesoscaleEddy', 'weakLandConstraint'].forEach((id) => currentRegime.add(id));
      ['sparseOpenOceanPatch', 'eddyTrappedHotspot'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'riverMouth') {
      ['mouthInflowOutflow', 'coastParallelShelfCurrent'].forEach((id) => currentRegime.add(id));
      ['riverPlume', 'shelfNutrientPatch'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'shelfBreak') {
      ['coastParallelShelfCurrent', 'broadBackgroundCurrent'].forEach((id) => currentRegime.add(id));
      ['shelfNutrientPatch', 'thermoclineHotspot'].forEach((id) => scalarRegime.add(id));
    }
  }
  const means = stats.layerMeans ?? {};
  if ((means.riverMouthInfluence ?? 0) > 0.12) scalarRegime.add('riverPlume');
  if ((means.straitSillInfluence ?? 0) > 0.12) currentRegime.add('straitJet');
  if ((means.openOceanCorridor ?? 0) > 0.28) currentRegime.add('mesoscaleEddy');
  return {
    currentRegime: [...currentRegime],
    scalarRegime: [...scalarRegime]
  };
}

function boundarySidesForContext(primary, secondary = [], stats = {}) {
  if (primary === 'gulfBasin') return ['east'];
  if (primary === 'straitSill') return ['east', 'west'];
  if (primary === 'islandChain' || primary === 'openOcean' || secondary.includes('openOcean')) return ['north', 'south', 'east', 'west'];
  if (primary === 'riverMouth') return ['south', 'east'];
  if ((stats.layerMeans?.openOceanCorridor ?? 0) > 0.36) return ['east', 'south', 'north'];
  return ['east', 'south'];
}

function missionSuitabilityForContext(primary, waterFraction, stats = {}) {
  if (waterFraction < 0.42) return 'WARN: limited navigable synthetic water area';
  if ((stats.layerMeans?.missionSuitability ?? 0) < 0.28) return 'WARN: limited route-diversity heuristic';
  if (primary === 'openOcean' || primary === 'gulfBasin' || primary === 'shelfBreak') return 'PASS: suitable for regional/fleet survey exercises';
  return 'PASS: suitable for focused synthetic mission exercises';
}

function bathymetryRegimeForContext(context) {
  return {
    coastShelf: 'coastalShelf',
    gulfBasin: 'semiEnclosedGulf',
    islandChain: 'islandChain',
    shelfBreak: 'shelfBreakDeepBasin',
    deepBasin: 'shelfBreakDeepBasin',
    straitSill: 'ridgeSillBasin',
    riverMouth: 'riverMouthDelta',
    openOcean: 'openOceanEddy'
  }[context] ?? 'mixedRegionalComposite';
}

function regionalTemplateForBathymetryRegime(regime) {
  return {
    coastalShelf: 'openShelf',
    semiEnclosedGulf: 'semiEnclosedGulf',
    islandChain: 'islandChain',
    shelfBreakDeepBasin: 'shelfBreakDeepBasin',
    ridgeSillBasin: 'ridgeSillBasin',
    riverMouthDelta: 'riverMouthDelta',
    openOceanEddy: 'mixedRegionalComposite'
  }[regime] ?? 'mixedRegionalComposite';
}

function featureMixForContext(primary, context) {
  const high = 'high';
  const medium = 'medium';
  const low = 'low';
  return {
    shelfFraction: primary === 'coastShelf' || primary === 'riverMouth' ? high : medium,
    deepBasinFraction: primary === 'deepBasin' || primary === 'openOcean' || primary === 'gulfBasin' ? high : medium,
    canyonDensity: primary === 'shelfBreak' || Number(context.canyonPotential ?? 0) > 0.08 ? high : medium,
    islandSeamountCount: primary === 'islandChain' || primary === 'openOcean' ? high : low,
    coastlineComplexity: primary === 'gulfBasin' || primary === 'islandChain' ? high : medium,
    riverMouthDeltaInfluence: primary === 'riverMouth' || Number(context.riverMouthInfluence ?? 0) > 0.08 ? high : low,
    ridgeSillStrength: primary === 'straitSill' ? high : medium,
    shelfBreakSharpness: primary === 'shelfBreak' || primary === 'deepBasin' ? high : medium,
    featureDiversity: high
  };
}

function futureCouplingMetadata(context, regimeHints) {
  return {
    currentRegimeHints: regimeHints.currentRegime,
    scalarRegimeHints: regimeHints.scalarRegime,
    openBoundarySides: context.openBoundarySides,
    coastlineOrientationHint: context.primaryContext === 'islandChain' || context.primaryContext === 'openOcean' ? 'islandArchipelago' : context.primaryContext === 'gulfBasin' ? 'curvedGulf' : 'westCoast',
    sourceZones: {
      riverMouthZones: context.riverMouthInfluence > 0.05,
      straitSillZones: context.straitSillInfluence > 0.05,
      shelfBreakZones: context.shelfBreakFraction > 0.08,
      basinGyreZones: context.deepBasinFraction > 0.12 || context.gulfBayInfluence > 0.12,
      islandWakeZones: context.islandFraction > 0.08
    },
    noFieldsGenerated: true
  };
}

function datasetTagsForWindow(window = {}) {
  const current = window.currentRegimeHints?.[0] ?? window.currentRegime?.[0] ?? 'notGenerated';
  const scalar = window.scalarRegimeHints?.[0] ?? window.scalarRegime?.[0] ?? 'notGenerated';
  return {
    regionType: window.detectedContext?.primaryContext ?? 'unknown',
    missionScale: window.recommendedMissionScale ?? 'singleGliderSurvey',
    currentRegime: current,
    scalarRegime: scalar,
    bathymetryRegime: window.bathymetryRegime ?? 'mixedRegionalComposite',
    heldOutCandidate: false
  };
}

function maxDepthForRegime(regime) {
  if (regime === 'openOceanEddy' || regime === 'shelfBreakDeepBasin') return 650;
  if (regime === 'semiEnclosedGulf' || regime === 'ridgeSillBasin') return 420;
  if (regime === 'islandChain') return 520;
  return 320;
}

function missionScaleForGliders(gliders = 1) {
  const count = Number(gliders) || 1;
  if (count >= 4) return 'fleetBenchmark4to6';
  if (count >= 2) return 'regionalSurvey2to3';
  return 'singleGliderSurvey';
}

function dominantCurrentIndex(values, config) {
  const candidates = [
    ['straitJet', values.strait],
    ['mouthInflowOutflow', Math.max(values.gulf, values.river)],
    ['islandWake', values.islandSeamount],
    ['coastParallelShelfCurrent', values.shelf],
    ['basinRecirculation', values.gulf + values.deepBasin * 0.4],
    ['mesoscaleEddy', values.open + values.deepBasin * 0.35],
    ['broadBackgroundCurrent', values.open],
    ['weakLandConstraint', values.open * (1 - values.shelf)]
  ];
  for (const bias of config.currentBias ?? []) candidates.push([bias, 0.2]);
  candidates.sort((a, b) => b[1] - a[1]);
  return CURRENT_REGIME_IDS.indexOf(candidates[0]?.[0]) + 1 || 1;
}

function dominantScalarIndex(values, config) {
  const candidates = [
    ['riverPlume', values.river],
    ['bloomPatch', values.gulf],
    ['islandWakePatch', values.islandSeamount],
    ['mixingFront', values.strait],
    ['shelfNutrientPatch', values.shelf + values.shelfBreak * 0.4],
    ['thermoclineHotspot', values.deepBasin + values.shelfBreak * 0.25],
    ['eddyTrappedHotspot', values.open + values.deepBasin * 0.35],
    ['sparseOpenOceanPatch', values.open]
  ];
  for (const bias of config.scalarBias ?? []) candidates.push([bias, 0.2]);
  candidates.sort((a, b) => b[1] - a[1]);
  return SCALAR_REGIME_IDS.indexOf(candidates[0]?.[0]) + 1 || 1;
}

function validateAtlasFields(layers, resolution) {
  const errors = [];
  const warnings = [];
  for (const name of FIELD_NAMES) {
    const grid = layers[name];
    if (!Array.isArray(grid) || grid.length !== resolution.rows) errors.push(`${name} row count mismatch.`);
    if (grid?.some?.((row) => !Array.isArray(row) || row.length !== resolution.columns)) errors.push(`${name} column count mismatch.`);
    const values = grid?.flat?.().map(Number) ?? [];
    if (!values.every(Number.isFinite)) errors.push(`${name} contains non-finite values.`);
    if (!['signedDistanceToCoast', 'dominantCurrentRegime', 'scalarRegime'].includes(name) && values.some((value) => value < 0 || value > 1)) {
      errors.push(`${name} must be bounded to 0..1.`);
    }
  }
  const landMean = meanGrid(layers.landOceanMask);
  if (landMean <= 0.01) warnings.push('Atlas has very little land constraint.');
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings,
    checks: [
      { id: 'atlas-required-layers', passed: errors.every((entry) => !entry.includes('mismatch')) },
      { id: 'atlas-finite-fields', passed: errors.every((entry) => !entry.includes('non-finite')) },
      { id: 'atlas-public-safe', passed: true }
    ],
    hiddenTruthExposed: false
  };
}

function summarizeAtlasLayers(layers) {
  const summaries = {};
  for (const [name, grid] of Object.entries(layers)) {
    const values = grid.flat().map(Number).filter(Number.isFinite);
    summaries[name] = {
      min: values.length ? round(Math.min(...values)) : 0,
      mean: values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
      max: values.length ? round(Math.max(...values)) : 0
    };
  }
  return summaries;
}

function atlasFeaturesFromConfig(features, config, seed) {
  return [
    ...(config.riverMouths ?? []).map((point, index) => ({
      featureId: `river-mouth-${index + 1}`,
      type: 'riverMouth',
      x: round(point.x),
      y: round(point.y),
      source: 'structured-coastline',
      synthetic: true
    })),
    ...features.straits.map((point, index) => ({
      featureId: `strait-sill-${index + 1}`,
      type: 'straitSill',
      x: point.x,
      y: point.y,
      rx: point.rx,
      ry: point.ry,
      source: 'near-touching-landmass-distance-field',
      synthetic: true
    })),
    ...features.canyons.map((canyon, index) => ({
      featureId: `canyon-spline-${index + 1}`,
      type: 'canyonPotentialSpline',
      start: canyon.start,
      end: canyon.end,
      width: canyon.width,
      source: 'seeded-shelf-break-to-basin-spline',
      synthetic: true
    })),
    ...features.islands.map((point, index) => ({
      featureId: `island-${index + 1}`,
      type: 'island',
      x: point.x,
      y: point.y,
      rx: point.rx,
      ry: point.ry,
      source: 'seeded-archipelago-primitive',
      synthetic: true
    })),
    ...features.seamounts.slice(0, 6).map((point, index) => ({
      featureId: `seamount-${index + 1}`,
      type: 'seamount',
      x: point.x,
      y: point.y,
      radius: point.r,
      source: 'blue-noise-like-seeded-placement',
      synthetic: true
    })),
    {
      featureId: 'atlas-roughness-control',
      type: 'controlledRoughness',
      source: SYNTHETIC_ATLAS_NOISE_VERSION,
      rawNoiseTerrain: false,
      seedDigest: canonicalJsonDigest({ seed })
    }
  ];
}

function atlasRegionsFromFields(preset, config, features) {
  return [
    region('coast-shelf-field', 'Coast / Shelf Field', 'coastShelf', 'field', { layer: 'continentalShelf' }),
    region('shelf-break-field', 'Shelf Break Field', 'shelfBreak', 'field', { layer: 'shelfBreak' }),
    region('deep-basin-field', 'Deep Basin Field', 'deepBasin', 'field', { layer: 'deepBasin' }),
    region('open-ocean-field', 'Open Ocean Corridor Field', 'openOcean', 'field', { layer: 'openOceanCorridor' }),
    region('gulf-bay-field', 'Gulf / Bay Field', 'gulfBasin', 'field', { layer: 'gulfBayInfluence' }),
    region('river-mouth-field', 'River Mouth Field', 'riverMouth', 'field', { layer: 'riverMouthInfluence' }),
    region('strait-sill-field', 'Strait / Sill Field', 'straitSill', 'field', { layer: 'straitSillInfluence' }),
    region('island-seamount-field', 'Island / Seamount Field', 'islandChain', 'field', { layer: 'islandSeamount' })
  ].map((entry) => ({
    ...entry,
    presetId: preset.id,
    domainStyle: config.domainStyle,
    featureRefs: features.filter((feature) => feature.type === entry.context || feature.type?.includes?.(entry.context)).map((feature) => feature.featureId),
    synthetic: true,
    notCalibratedRealOceanData: true
  }));
}

function region(regionId, label, context, shapeType, shape) {
  return { regionId, label, context, shape: { type: shapeType, ...shape } };
}

function ellipseScore(x, y, ellipse) {
  return gaussian2D(x, y, ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry);
}

function gaussian1D(value, center, sigma) {
  const z = (Number(value) - Number(center)) / Math.max(1e-6, Number(sigma));
  return Math.exp(-0.5 * z * z);
}

function normalizeResolution(input = {}) {
  return {
    columns: Math.max(24, Math.min(144, Math.floor(Number(input.columns ?? DEFAULT_RESOLUTION.columns)))),
    rows: Math.max(18, Math.min(96, Math.floor(Number(input.rows ?? DEFAULT_RESOLUTION.rows))))
  };
}

function emptyGrid(rows, columns) {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0));
}

function meanGrid(grid = []) {
  const values = grid.flat().map(Number).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function withDigest(value, digestKey) {
  const payload = { ...value };
  delete payload[digestKey];
  return { ...value, [digestKey]: canonicalJsonDigest(canonicalizeJsonValue(payload)) };
}

function clampFinite(value, min, max, fallback) {
  const number = Number(value);
  const finite = Number.isFinite(number) ? number : Number(fallback);
  return round(Math.min(max, Math.max(min, finite)));
}
