import {
  canonicalJsonDigest,
  canonicalizeJsonValue
} from '../../../packages/codecs/src/index.js';

export const SYNTHETIC_OCEAN_ATLAS_TYPE = 'anchor.synthetic-ocean-atlas';
export const SYNTHETIC_OCEAN_ATLAS_VERSION = '1.0.0';
export const OPERATIONAL_WINDOW_VERSION = '1.0.0';
export const REGIONAL_MISSION_RECIPE_TYPE = 'anchor.regional-mission-recipe';
export const REGIONAL_MISSION_RECIPE_VERSION = '1.0.0';

export const SYNTHETIC_OCEAN_ATLAS_PRESETS = Object.freeze([
  { id: 'syntheticGulfWorld', label: 'Synthetic Gulf World' },
  { id: 'islandChainWorld', label: 'Island Chain World' },
  { id: 'shelfToBasinWorld', label: 'Shelf-to-Basin World' },
  { id: 'openOceanEddyWorld', label: 'Open Ocean Eddy World' },
  { id: 'mixedRegionalWorld', label: 'Mixed Regional World' }
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

export function createSyntheticOceanAtlas(options = {}) {
  const preset = atlasPresetById(options.presetId ?? options.atlasPreset);
  const seed = String(options.seed ?? 'env-atlas-r1');
  const zones = atlasZonesForPreset(preset.id, seed);
  const atlasBase = {
    atlasType: SYNTHETIC_OCEAN_ATLAS_TYPE,
    atlasVersion: SYNTHETIC_OCEAN_ATLAS_VERSION,
    atlasId: String(options.atlasId ?? `${preset.id}-atlas`),
    label: String(options.label ?? preset.label),
    seed,
    atlasPreset: preset.id,
    widthNormalized: 1,
    heightNormalized: 1,
    layers: {
      landOceanMask: zones.filter((zone) => zone.layer === 'landOceanMask'),
      continentalShelfZones: zones.filter((zone) => zone.context === 'coastShelf'),
      shelfBreakZones: zones.filter((zone) => zone.context === 'shelfBreak'),
      deepBasinZones: zones.filter((zone) => zone.context === 'deepBasin'),
      islandArchipelagoZones: zones.filter((zone) => zone.context === 'islandChain'),
      gulfBayZones: zones.filter((zone) => zone.context === 'gulfBasin'),
      straitSillZones: zones.filter((zone) => zone.context === 'straitSill'),
      riverMouthZones: zones.filter((zone) => zone.context === 'riverMouth'),
      openOceanCorridors: zones.filter((zone) => zone.context === 'openOcean'),
      dominantCurrentRegimes: dominantRegimeZones(preset.id),
      missionScaleSuitability: missionSuitabilityZones(preset.id)
    },
    regions: zones.map((zone) => ({
      regionId: zone.id,
      label: zone.label,
      context: zone.context,
      shape: zone.shape,
      synthetic: true,
      notCalibratedRealOceanData: true
    })),
    claimBoundary: {
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
  const detectedContext = inferAtlasContext(atlas, windowBase);
  const recommendations = recommendationsForContext(detectedContext, input);
  return withDigest({
    ...windowBase,
    detectedContext,
    recommendedMissionScale: recommendations.recommendedMissionScale,
    recommendedDomain: recommendations.recommendedDomain,
    recommendedGliders: recommendations.recommendedGliders,
    recommendedDurationSeconds: recommendations.recommendedDurationSeconds,
    bathymetryRegime: recommendations.bathymetryRegime,
    currentRegime: recommendations.currentRegime,
    scalarRegime: recommendations.scalarRegime,
    coastlineOrientation: recommendations.coastlineOrientation,
    openBoundarySides: recommendations.openBoundarySides,
    featureMix: recommendations.featureMix,
    validationProfile: recommendations.validationProfile,
    claimBoundary: {
      synthetic: true,
      realEarthMap: false,
      calibratedOceanProduct: false,
      operationalForecast: false
    }
  }, 'windowDigest');
}

export function inferAtlasContext(atlas = createSyntheticOceanAtlas(), window = {}) {
  const regions = atlas.regions ?? [];
  const scores = Object.fromEntries(Object.keys(CONTEXT_LABELS).map((key) => [key, 0]));
  const sampleCount = 9;
  let landHits = 0;
  for (let sy = 0; sy < sampleCount; sy += 1) {
    for (let sx = 0; sx < sampleCount; sx += 1) {
      const px = Number(window.x ?? 0) + (sx + 0.5) / sampleCount * Number(window.width ?? 0.3);
      const py = Number(window.y ?? 0) + (sy + 0.5) / sampleCount * Number(window.height ?? 0.3);
      for (const region of regions) {
        if (!pointInShape(px, py, region.shape)) continue;
        if (region.context && scores[region.context] != null) scores[region.context] += 1;
        if (region.context === 'coastShelf' && region.label?.toLowerCase?.().includes('land')) landHits += 1;
      }
    }
  }
  const total = sampleCount * sampleCount;
  const normalizedScores = Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, round(value / total)]));
  const sorted = Object.entries(normalizedScores).sort((a, b) => b[1] - a[1]);
  const primaryContext = sorted[0]?.[1] > 0 ? sorted[0][0] : 'openOcean';
  const secondaryContexts = sorted.slice(1).filter((entry) => entry[1] >= 0.08).map((entry) => entry[0]);
  const waterFraction = round(1 - Math.min(0.72, landHits / total));
  const regimeHints = regimeHintsForContext(primaryContext, secondaryContexts);
  return {
    primaryContext,
    primaryContextLabel: CONTEXT_LABELS[primaryContext],
    secondaryContexts,
    contextScores: normalizedScores,
    landFraction: round(1 - waterFraction),
    waterFraction,
    shelfFraction: normalizedScores.coastShelf,
    basinFraction: round(normalizedScores.deepBasin + normalizedScores.gulfBasin),
    islandFraction: normalizedScores.islandChain,
    riverMouthInfluence: normalizedScores.riverMouth,
    straitInfluence: normalizedScores.straitSill,
    openBoundarySides: boundarySidesForContext(primaryContext, secondaryContexts),
    currentRegimeHint: regimeHints.currentRegime,
    scalarRegimeHint: regimeHints.scalarRegime,
    missionSuitabilityHint: missionSuitabilityForContext(primaryContext, waterFraction),
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
  const recipeBase = {
    recipeType: REGIONAL_MISSION_RECIPE_TYPE,
    recipeVersion: REGIONAL_MISSION_RECIPE_VERSION,
    atlasDigest: atlas.atlasDigest,
    windowDigest: selectedWindow.windowDigest,
    selectedWindow,
    domainSize: {
      widthMeters: selectedWindow.recommendedDomain.widthMeters,
      heightMeters: selectedWindow.recommendedDomain.heightMeters
    },
    sourceResolution: {
      cellSizeMeters: selectedWindow.recommendedDomain.sourceResolutionMeters,
      rows: selectedWindow.recommendedDomain.rows,
      columns: selectedWindow.recommendedDomain.columns
    },
    previewResolution: {
      cellSizeMeters: selectedWindow.recommendedDomain.previewResolutionMeters
    },
    coastlineOrientation: selectedWindow.coastlineOrientation,
    openBoundarySides: selectedWindow.openBoundarySides,
    bathymetryRegime: selectedWindow.bathymetryRegime,
    currentRegime: selectedWindow.currentRegime,
    scalarRegime: selectedWindow.scalarRegime,
    featureMix: selectedWindow.featureMix,
    intendedGliders: selectedWindow.recommendedGliders,
    missionDuration: {
      durationSeconds: selectedWindow.recommendedDurationSeconds,
      label: `${Math.round(selectedWindow.recommendedDurationSeconds / 3600)} hr`
    },
    randomSeed: String(options.randomSeed ?? options.seed ?? `${atlas.seed}:${selectedWindow.windowId}`),
    validationProfile: selectedWindow.validationProfile,
    dependencyPlan: {
      bathymetry: 'CURRENT_AFTER_GENERATE',
      wetLandMask: 'CURRENT_AFTER_GENERATE',
      coastline: 'CURRENT_AFTER_GENERATE',
      currents: 'REQUIRES_REGENERATION',
      scalarFields: 'REQUIRES_REGENERATION',
      hotspots: 'REQUIRES_REGENERATION',
      startsDropZones: 'NEEDS_VALIDATION',
      benchmarkBundle: 'REQUIRES_REGENERATION',
      environmentArtifact: 'REQUIRES_REGENERATION'
    },
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

function atlasZonesForPreset(presetId, seed) {
  const jitter = seededJitter(seed);
  const common = [
    zone('land-west', 'Curved Synthetic Coastline', 'landOceanMask', 'coastShelf', 'blob', { cx: -0.12, cy: 0.42, rx: 0.28 + jitter * 0.02, ry: 0.72 }),
    zone('continental-shelf', 'Continental Shelf Zone', 'bathymetry', 'coastShelf', 'rect', { x: 0.1, y: 0.08, width: 0.28, height: 0.82 }),
    zone('shelf-break', 'Shelf Break Zone', 'bathymetry', 'shelfBreak', 'rect', { x: 0.34, y: 0.12, width: 0.16, height: 0.76 }),
    zone('deep-basin', 'Deep Basin Zone', 'bathymetry', 'deepBasin', 'ellipse', { cx: 0.7, cy: 0.62, rx: 0.24, ry: 0.24 }),
    zone('open-ocean', 'Open Ocean Corridor', 'bathymetry', 'openOcean', 'rect', { x: 0.58, y: 0.08, width: 0.36, height: 0.84 })
  ];
  const additions = {
    syntheticGulfWorld: [
      zone('gulf-bay', 'Semi-Enclosed Gulf / Basin', 'bathymetry', 'gulfBasin', 'ellipse', { cx: 0.36, cy: 0.42, rx: 0.26, ry: 0.3 }),
      zone('gulf-mouth-sill', 'Gulf Mouth Strait / Sill', 'bathymetry', 'straitSill', 'rect', { x: 0.5, y: 0.47, width: 0.18, height: 0.14 }),
      zone('river-mouth', 'River Mouth Influence', 'bathymetry', 'riverMouth', 'ellipse', { cx: 0.22, cy: 0.22, rx: 0.13, ry: 0.12 })
    ],
    islandChainWorld: [
      zone('island-chain', 'Island Chain', 'bathymetry', 'islandChain', 'ellipse', { cx: 0.62, cy: 0.34, rx: 0.26, ry: 0.15 }),
      zone('sheltered-channel', 'Sheltered Channel / Sill', 'bathymetry', 'straitSill', 'rect', { x: 0.48, y: 0.48, width: 0.28, height: 0.12 })
    ],
    shelfToBasinWorld: [
      zone('canyon-break', 'Shelf Break Canyon Corridor', 'bathymetry', 'shelfBreak', 'rect', { x: 0.4, y: 0.18, width: 0.12, height: 0.58 }),
      zone('deep-basin-expanded', 'Expanded Deep Basin', 'bathymetry', 'deepBasin', 'ellipse', { cx: 0.68, cy: 0.56, rx: 0.28, ry: 0.28 })
    ],
    openOceanEddyWorld: [
      zone('open-eddy-corridor', 'Open Ocean Eddy Corridor', 'bathymetry', 'openOcean', 'ellipse', { cx: 0.72, cy: 0.6, rx: 0.3, ry: 0.26 }),
      zone('weak-shelf-margin', 'Weak Shelf Margin', 'bathymetry', 'shelfBreak', 'rect', { x: 0.28, y: 0.12, width: 0.08, height: 0.76 })
    ],
    mixedRegionalWorld: [
      zone('gulf-bay', 'Semi-Enclosed Gulf / Basin', 'bathymetry', 'gulfBasin', 'ellipse', { cx: 0.36, cy: 0.42, rx: 0.24, ry: 0.28 }),
      zone('island-chain', 'Island Chain', 'bathymetry', 'islandChain', 'ellipse', { cx: 0.67, cy: 0.32, rx: 0.24, ry: 0.13 }),
      zone('river-mouth', 'River Mouth Influence', 'bathymetry', 'riverMouth', 'ellipse', { cx: 0.22, cy: 0.2, rx: 0.12, ry: 0.12 }),
      zone('strait-sill', 'Strait / Sill', 'bathymetry', 'straitSill', 'rect', { x: 0.45, y: 0.52, width: 0.22, height: 0.14 })
    ]
  };
  return [...common, ...(additions[presetId] ?? additions.mixedRegionalWorld)];
}

function dominantRegimeZones(presetId) {
  const regimes = {
    syntheticGulfWorld: ['basinRecirculation', 'inflowOutflowThroughMouth', 'coastalBoundaryLayer'],
    islandChainWorld: ['islandWake', 'flowSplitting', 'leeEddies'],
    shelfToBasinWorld: ['coastParallelShelfCurrent', 'shallowDeepShear', 'canyonExchange'],
    openOceanEddyWorld: ['broadBackgroundCurrent', 'mesoscaleEddy', 'weakLandConstraint'],
    mixedRegionalWorld: ['coastParallelShelfCurrent', 'basinRecirculation', 'islandWake', 'acceleratedJet']
  };
  return (regimes[presetId] ?? regimes.mixedRegionalWorld).map((id, index) => ({ id, order: index + 1, syntheticHint: true }));
}

function missionSuitabilityZones(presetId) {
  const fleet = presetId === 'openOceanEddyWorld' || presetId === 'mixedRegionalWorld' || presetId === 'syntheticGulfWorld';
  return [
    { id: 'single-glider', label: 'Single glider', suitability: 'PASS' },
    { id: 'regional-2-3', label: '2-3 glider regional survey', suitability: 'PASS' },
    { id: 'fleet-4-6', label: '4-6 glider fleet benchmark', suitability: fleet ? 'PASS' : 'WARN' }
  ];
}

function recommendationsForContext(context, input = {}) {
  const primary = context.primaryContext ?? 'openOcean';
  const fleet = input.missionScale === 'fleetBenchmark4to6' || primary === 'openOcean' || primary === 'gulfBasin';
  const regional = input.missionScale === 'regionalSurvey2to3' || primary === 'shelfBreak' || primary === 'islandChain' || primary === 'straitSill';
  const gliders = Number.isFinite(Number(input.recommendedGliders))
    ? Number(input.recommendedGliders)
    : fleet ? 4 : regional ? 3 : 1;
  const duration = fleet ? 120 * 3600 : regional ? 72 * 3600 : 36 * 3600;
  const size = fleet ? [120000, 90000, 1500] : regional ? [76000, 56000, 1200] : [42000, 32000, 1000];
  const regimes = regimeHintsForContext(primary, context.secondaryContexts ?? []);
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
    currentRegime: regimes.currentRegime,
    scalarRegime: regimes.scalarRegime,
    coastlineOrientation: primary === 'islandChain' || primary === 'openOcean' ? 'islandArchipelago' : primary === 'gulfBasin' || primary === 'straitSill' ? 'curvedGulf' : 'westCoast',
    openBoundarySides: context.openBoundarySides ?? boundarySidesForContext(primary, context.secondaryContexts ?? []),
    featureMix: featureMixForContext(primary, context),
    validationProfile: {
      id: `${primary}-synthetic-benchmark`,
      label: `${CONTEXT_LABELS[primary]} synthetic benchmark profile`,
      notOperationalValidation: true
    }
  };
}

function regimeHintsForContext(primary, secondary = []) {
  const contexts = [primary, ...secondary];
  const currentRegime = new Set();
  const scalarRegime = new Set();
  for (const context of contexts) {
    if (context === 'coastShelf') {
      ['coastParallelShelfCurrent', 'upwellingDownwellingOptional', 'shallowDeepShear'].forEach((id) => currentRegime.add(id));
      ['coastalFront', 'shelfNutrientPatch', 'riverPlumeOptional'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'gulfBasin') {
      ['basinRecirculation', 'inflowOutflowThroughMouth', 'coastalBoundaryLayer', 'eddyActivity'].forEach((id) => currentRegime.add(id));
      ['bloomPatch', 'thermoclineHotspot', 'plumeRetention'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'islandChain') {
      ['islandWake', 'flowSplitting', 'leeEddies', 'shelteredChannels'].forEach((id) => currentRegime.add(id));
      ['islandWakePatch', 'reefLikeProductivity', 'channelFront'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'straitSill') {
      ['acceleratedJet', 'tidalReversal', 'verticalShear', 'mixingHotspot'].forEach((id) => currentRegime.add(id));
      ['mixingFront', 'sillNutrientPatch'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'openOcean' || context === 'deepBasin') {
      ['broadBackgroundCurrent', 'mesoscaleEddy', 'weakLandConstraint'].forEach((id) => currentRegime.add(id));
      ['sparseOpenOceanPatch', 'eddyTrappedHotspot'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'riverMouth') {
      ['coastalBoundaryLayer', 'plumeOutflowShear'].forEach((id) => currentRegime.add(id));
      ['riverPlumeOptional', 'coastalFront'].forEach((id) => scalarRegime.add(id));
    } else if (context === 'shelfBreak') {
      ['coastParallelShelfCurrent', 'shallowDeepShear', 'shelfBreakJet'].forEach((id) => currentRegime.add(id));
      ['shelfNutrientPatch', 'shelfBreakFront'].forEach((id) => scalarRegime.add(id));
    }
  }
  return {
    currentRegime: [...currentRegime],
    scalarRegime: [...scalarRegime]
  };
}

function boundarySidesForContext(primary, secondary = []) {
  if (primary === 'gulfBasin') return ['east'];
  if (primary === 'straitSill') return ['east', 'west'];
  if (primary === 'islandChain' || primary === 'openOcean' || secondary.includes('openOcean')) return ['north', 'south', 'east', 'west'];
  if (primary === 'riverMouth') return ['south', 'east'];
  return ['east', 'south'];
}

function missionSuitabilityForContext(primary, waterFraction) {
  if (waterFraction < 0.42) return 'WARN: limited navigable synthetic water area';
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
    canyonDensity: primary === 'shelfBreak' ? high : medium,
    islandSeamountCount: primary === 'islandChain' || primary === 'openOcean' ? high : low,
    coastlineComplexity: primary === 'gulfBasin' || primary === 'islandChain' ? high : medium,
    riverMouthDeltaInfluence: primary === 'riverMouth' || Number(context.riverMouthInfluence ?? 0) > 0.08 ? high : low,
    ridgeSillStrength: primary === 'straitSill' ? high : medium,
    shelfBreakSharpness: primary === 'shelfBreak' || primary === 'deepBasin' ? high : medium,
    featureDiversity: high
  };
}

function missionScaleForGliders(gliders = 1) {
  const count = Number(gliders) || 1;
  if (count >= 4) return 'fleetBenchmark4to6';
  if (count >= 2) return 'regionalSurvey2to3';
  return 'singleGliderSurvey';
}

function maxDepthForRegime(regime) {
  if (regime === 'openOceanEddy' || regime === 'shelfBreakDeepBasin') return 650;
  if (regime === 'semiEnclosedGulf' || regime === 'ridgeSillBasin') return 420;
  if (regime === 'islandChain') return 520;
  return 320;
}

function zone(id, label, layer, context, shapeType, shape) {
  return { id, label, layer, context, shape: { type: shapeType, ...shape } };
}

function pointInShape(x, y, shape = {}) {
  if (shape.type === 'rect') {
    return x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height;
  }
  const cx = Number(shape.cx ?? 0.5);
  const cy = Number(shape.cy ?? 0.5);
  const rx = Number(shape.rx ?? 0.2);
  const ry = Number(shape.ry ?? 0.2);
  const dx = (x - cx) / Math.max(0.0001, rx);
  const dy = (y - cy) / Math.max(0.0001, ry);
  return dx * dx + dy * dy <= 1;
}

function seededJitter(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000 - 0.5;
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

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}
