import {
  canonicalJsonDigest,
  canonicalizeJsonValue
} from '../../../packages/codecs/src/index.js';
import {
  createRegionalMissionRecipe,
  createSyntheticOceanAtlas,
  environmentStudioOptionsFromRegionalRecipe,
  normalizeOperationalWindow
} from './SyntheticOceanAtlas.js';
import {
  clamp,
  round,
  seededUnit,
  smoothstep
} from './SyntheticAtlasNoise.js';

export const SYNTHETIC_GLOBE_WORLD_TYPE = 'anchor.synthetic-globe-world';
export const SYNTHETIC_GLOBE_WORLD_VERSION = '1.0.0';
export const OPERATIONAL_GLOBE_WINDOW_TYPE = 'anchor.operational-globe-window';
export const OPERATIONAL_GLOBE_WINDOW_VERSION = '1.0.0';
export const SYNTHETIC_GLOBE_WORLD_ENGINE_VERSION = 'synthetic-equirectangular-globe-field-engine-r1';

export const SYNTHETIC_GLOBE_STYLES = Object.freeze([
  { id: 'earthlikeSyntheticOcean', label: 'Earthlike Synthetic Ocean', atlasPreset: 'mixedRegionalWorld', defaultSeed: 'env-globe-earthlike-001' },
  { id: 'archipelagoWorld', label: 'Archipelago Planet', atlasPreset: 'islandChainWorld', defaultSeed: 'env-globe-archipelago-001' },
  { id: 'continentalMargins', label: 'Continental Margins Planet', atlasPreset: 'riverDeltaShelfWorld', defaultSeed: 'env-globe-margin-001' },
  { id: 'gulfInlandSea', label: 'Gulf / Inland Sea Planet', atlasPreset: 'syntheticGulfWorld', defaultSeed: 'env-globe-gulf-001' },
  { id: 'oceanBasin', label: 'Ocean Basin Planet', atlasPreset: 'openOceanEddyWorld', defaultSeed: 'env-globe-ocean-basin-001' },
  { id: 'mixedSyntheticPlanet', label: 'Mixed Synthetic Planet', atlasPreset: 'mixedRegionalWorld', defaultSeed: 'env-globe-mixed-001' },
  { id: 'shelfToBasinWorld', label: 'Continental Margins Planet', atlasPreset: 'shelfToBasinWorld', defaultSeed: 'env-globe-shelf-basin-001', aliasOf: 'continentalMargins' },
  { id: 'openOceanBasin', label: 'Ocean Basin Planet', atlasPreset: 'openOceanEddyWorld', defaultSeed: 'env-globe-open-ocean-001', aliasOf: 'oceanBasin' },
  { id: 'mixedRandom', label: 'Mixed Synthetic Planet', atlasPreset: 'mixedRegionalWorld', defaultSeed: 'env-globe-mixed-random-001', aliasOf: 'mixedSyntheticPlanet' }
]);

export const SYNTHETIC_GLOBE_LAYER_OPTIONS = Object.freeze([
  { id: 'landOceanMask', label: 'Land / Ocean' },
  { id: 'bathymetryContext', label: 'Bathymetry Context' },
  { id: 'coarseFlowRegime', label: 'Coarse Flow' },
  { id: 'scalarRegime', label: 'Scalar Regime' },
  { id: 'suitability', label: 'Suitability' }
]);

const DEFAULT_CANONICAL_RESOLUTION = Object.freeze({ width: 4096, height: 2048 });
const MIN_CANONICAL_RESOLUTION = Object.freeze({ width: 2048, height: 1024 });
const DEFAULT_DISPLAY_TEXTURE_RESOLUTION = Object.freeze({ width: 1024, height: 512 });
const DEFAULT_REGION_BOUNDS = Object.freeze({
  centerLonNormalized: 0.75,
  centerLatNormalized: 0.44,
  widthNormalized: 0.18,
  heightNormalized: 0.16
});
const DEFAULT_GENERATOR_PARAMETERS = Object.freeze({
  waterLevel: 0.5,
  landmassScale: 0.55,
  islandDensity: 0.5,
  coastlineComplexity: 0.45,
  basinScale: 0.55,
  shelfWidth: 0.5,
  flowIntensity: 0.55,
  roughness: 0.35
});
const STYLE_PARAMETER_PRESETS = Object.freeze({
  earthlikeSyntheticOcean: { waterLevel: 0.5, landmassScale: 0.62, islandDensity: 0.46, coastlineComplexity: 0.56, basinScale: 0.58, shelfWidth: 0.52, flowIntensity: 0.58, roughness: 0.42 },
  archipelagoWorld: { waterLevel: 0.58, landmassScale: 0.35, islandDensity: 0.88, coastlineComplexity: 0.72, basinScale: 0.52, shelfWidth: 0.42, flowIntensity: 0.64, roughness: 0.5 },
  continentalMargins: { waterLevel: 0.46, landmassScale: 0.74, islandDensity: 0.28, coastlineComplexity: 0.54, basinScale: 0.66, shelfWidth: 0.72, flowIntensity: 0.56, roughness: 0.34 },
  gulfInlandSea: { waterLevel: 0.48, landmassScale: 0.7, islandDensity: 0.36, coastlineComplexity: 0.66, basinScale: 0.5, shelfWidth: 0.62, flowIntensity: 0.64, roughness: 0.46 },
  oceanBasin: { waterLevel: 0.57, landmassScale: 0.28, islandDensity: 0.66, coastlineComplexity: 0.3, basinScale: 0.9, shelfWidth: 0.28, flowIntensity: 0.7, roughness: 0.26 },
  mixedSyntheticPlanet: DEFAULT_GENERATOR_PARAMETERS
});
const FIELD_NAMES = Object.freeze([
  'landOceanMask',
  'bathymetryContext',
  'distanceToCoast',
  'shelfZone',
  'shelfBreakZone',
  'deepBasinPotential',
  'islandSeamountPotential',
  'canyonPotential',
  'riverMouthInfluence',
  'straitSillInfluence',
  'gulfBayInfluence',
  'openOceanCorridor',
  'coarseFlowRegime',
  'scalarRegime',
  'suitability'
]);
const CONTEXT_LABELS = Object.freeze({
  coastShelf: 'coastal shelf',
  gulfBasin: 'semi-enclosed gulf / basin',
  islandChain: 'island chain / seamount region',
  shelfBreak: 'shelf break / canyon',
  deepBasin: 'deep ocean basin',
  straitSill: 'strait / sill exchange',
  riverMouth: 'river-mouth / delta source',
  openOcean: 'open ocean basin'
});

export function createSyntheticGlobeWorld(options = {}) {
  const style = syntheticGlobeStyleById(options.style ?? options.worldStyle ?? options.styleId);
  const canonicalStyle = canonicalStyleId(style.id);
  const seed = String(options.seed ?? style.defaultSeed);
  const textureResolution = normalizeCanonicalResolution(options.textureResolution ?? options.canonicalWorldResolution ?? options.resolution);
  const displayTextureResolution = normalizeDisplayTextureResolution(options.displayTextureResolution ?? options.displayResolution);
  const generatorParameters = normalizeGeneratorParameters(options.generatorParameters ?? options.worldGeneratorParameters, canonicalStyle);
  const features = generateStructuredGlobeFeatures({ seed, style: canonicalStyle, generatorParameters });
  const layerSummaries = summarizeProceduralLayers({ seed, style: canonicalStyle, generatorParameters, features, textureResolution });
  const worldBase = {
    artifactType: SYNTHETIC_GLOBE_WORLD_TYPE,
    artifactVersion: SYNTHETIC_GLOBE_WORLD_VERSION,
    worldId: String(options.worldId ?? `synthetic-globe-${canonicalStyle}-${stableToken(seed)}`),
    seed,
    style: style.id,
    canonicalStyle,
    styleLabel: style.label,
    coordinateFrame: 'syntheticSphericalEquirectangular',
    textureResolution,
    canonicalWorldResolution: textureResolution,
    displayTextureResolution,
    sourceResolution: { columns: textureResolution.width, rows: textureResolution.height },
    resolution: { columns: textureResolution.width, rows: textureResolution.height },
    generatorParameters,
    layers: Object.fromEntries(FIELD_NAMES.map((name) => [name, {
      encoding: 'procedural-equirectangular-field',
      fieldName: name,
      textureResolution,
      deterministicSampler: 'sampleSyntheticGlobeWorldLayer'
    }])),
    layerSummaries,
    features,
    validation: validateSyntheticGlobeWorld({ layerSummaries, textureResolution, features }),
    sourceAtlasSummary: {
      atlasPreset: style.atlasPreset,
      resolution: { columns: 144, rows: 96 },
      usage: 'Compatibility and regional-recipe bridge only; globe fields are canonical for ENV-GLOBE-R1.'
    },
    provenance: {
      generator: SYNTHETIC_GLOBE_WORLD_ENGINE_VERSION,
      topologySource: 'structured equirectangular feature primitives: continent ellipses, archipelagos, gulfs, straits, shelves, shelf breaks, basins, rivers, canyons, and seeded roughness',
      rawNoiseOnly: false,
      rendererIndependent: true,
      synthetic: true,
      notEarth: true,
      notOperationalForecast: true,
      highResolutionArtifact: true,
      displayTexturesMayBeDownsampled: true
    },
    claimBoundary: {
      deterministicSyntheticGlobe: true,
      syntheticEquirectangularWorldFields: true,
      scientificallyConstrained: true,
      benchmarkOriented: true,
      realEarthMap: false,
      gebco: false,
      etopo: false,
      hycom: false,
      copernicus: false,
      calibratedSurveyData: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest(worldBase, 'worldDigest');
}

export function normalizeSyntheticGlobeWorld(input = {}) {
  if (input?.artifactType === SYNTHETIC_GLOBE_WORLD_TYPE && input.worldDigest) return input;
  return createSyntheticGlobeWorld(input);
}

export function compactSyntheticGlobeWorld(worldInput = {}) {
  const world = normalizeSyntheticGlobeWorld(worldInput);
  return {
    artifactType: world.artifactType,
    artifactVersion: world.artifactVersion,
    worldId: world.worldId,
    seed: world.seed,
    style: world.style,
    canonicalStyle: world.canonicalStyle,
    styleLabel: world.styleLabel,
    coordinateFrame: world.coordinateFrame,
    textureResolution: world.textureResolution,
    canonicalWorldResolution: world.canonicalWorldResolution,
    displayTextureResolution: world.displayTextureResolution,
    sourceResolution: world.sourceResolution,
    resolution: world.resolution,
    generatorParameters: world.generatorParameters,
    layerSummaries: world.layerSummaries,
    featureCount: world.features?.length ?? 0,
    features: (world.features ?? []).slice(0, 48),
    validation: world.validation,
    sourceAtlasSummary: world.sourceAtlasSummary,
    provenance: world.provenance,
    claimBoundary: world.claimBoundary,
    worldDigest: world.worldDigest
  };
}

export function sampleSyntheticGlobeWorldLayer(worldInput = {}, layerName = 'suitability', lonNormalized = 0.5, latNormalized = 0.5) {
  const world = normalizeSyntheticGlobeWorld(worldInput);
  const fields = evaluateGlobeFields(world, lonNormalized, latNormalized);
  return round(fields[layerName] ?? fields[layerAlias(layerName)] ?? 0);
}

export function syntheticGlobeLayerColor(worldInput = {}, layer = 'bathymetryContext', lonNormalized = 0.5, latNormalized = 0.5) {
  const world = normalizeSyntheticGlobeWorld(worldInput);
  const fields = evaluateGlobeFields(world, lonNormalized, latNormalized);
  const land = fields.landOceanMask;
  if (land > 0.56) {
    const inland = clamp(fields.distanceToCoast + land * 0.28, 0, 1);
    return rgba(mixRgb([70, 110, 64], [164, 139, 86], inland));
  }
  if (layer === 'landOceanMask') {
    return rgba(mixRgb([7, 35, 88], [62, 176, 182], clamp(1 - fields.distanceToCoast + fields.shelfZone * 0.2, 0, 1)));
  }
  if (layer === 'coarseFlowRegime') {
    return rgba(mixRgb([7, 36, 92], [70, 216, 203], clamp(fields.coarseFlowRegime / 8 + fields.straitSillInfluence * 0.15, 0, 1)));
  }
  if (layer === 'scalarRegime') {
    return rgba(mixRgb([27, 48, 112], [202, 120, 172], clamp(fields.scalarRegime / 8 + fields.riverMouthInfluence * 0.12, 0, 1)));
  }
  if (layer === 'suitability') {
    return rgba(mixRgb([12, 45, 100], [89, 216, 154], fields.suitability));
  }
  if (fields.riverMouthInfluence > 0.34) return [94, 158, 96, 255];
  if (fields.straitSillInfluence > 0.32) return [74, 179, 174, 255];
  if (fields.islandSeamountPotential > 0.38) return [182, 164, 94, 255];
  if (fields.canyonPotential > 0.3) return [60, 76, 150, 255];
  if (fields.shelfZone > fields.deepBasinPotential) return rgba(mixRgb([33, 99, 136], [60, 180, 180], fields.shelfZone));
  return rgba(mixRgb([6, 26, 76], [30, 76, 140], fields.deepBasinPotential));
}

export function createOperationalGlobeWindow(input = {}, worldInput = createSyntheticGlobeWorld()) {
  const world = normalizeSyntheticGlobeWorld(worldInput);
  const bounds = normalizeGlobeWindowBounds(input.bounds ?? input);
  const sampledFieldStats = sampleGlobeWindowStats(world, bounds);
  const detectedContext = detectGlobeWindowContext(sampledFieldStats);
  const recommendedDomain = recommendedDomainForGlobeWindow(bounds, detectedContext, input);
  const environmentRegimes = environmentRegimesForContext(detectedContext, sampledFieldStats);
  const environmentSuitability = globeWindowSuitability(sampledFieldStats, detectedContext);
  const windowBase = {
    artifactType: OPERATIONAL_GLOBE_WINDOW_TYPE,
    artifactVersion: OPERATIONAL_GLOBE_WINDOW_VERSION,
    windowId: String(input.windowId ?? `globe-window-${stableToken(canonicalJsonDigest({ worldDigest: world.worldDigest, bounds }))}`),
    label: String(input.label ?? 'Selected Globe Region'),
    worldId: world.worldId,
    worldDigest: world.worldDigest,
    bounds,
    sampledFieldStats,
    detectedContext,
    recommendedDomain,
    environmentRegimes,
    environmentSuitability,
    datasetTags: datasetTagsForContext(detectedContext, sampledFieldStats),
    selectedBy: String(input.selectedBy ?? 'globe-selector'),
    validation: validateOperationalGlobeWindow({ bounds, sampledFieldStats, recommendedDomain }),
    claimBoundary: {
      synthetic: true,
      realEarthMap: false,
      calibratedOceanProduct: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    }
  };
  const withWindowDigest = withDigest(windowBase, 'windowDigest');
  return {
    ...withWindowDigest,
    x: withWindowDigest.bounds.centerLonNormalized - withWindowDigest.bounds.widthNormalized / 2,
    y: withWindowDigest.bounds.centerLatNormalized - withWindowDigest.bounds.heightNormalized / 2,
    width: withWindowDigest.bounds.widthNormalized,
    height: withWindowDigest.bounds.heightNormalized,
    center: {
      x: withWindowDigest.bounds.centerLonNormalized,
      y: withWindowDigest.bounds.centerLatNormalized
    },
    primaryContext: withWindowDigest.detectedContext.primary,
    bathymetryRegime: withWindowDigest.environmentRegimes.bathymetry,
    currentRegime: withWindowDigest.environmentRegimes.flow,
    scalarRegime: withWindowDigest.environmentRegimes.scalar,
    currentRegimeHints: withWindowDigest.environmentRegimes.flow,
    scalarRegimeHints: withWindowDigest.environmentRegimes.scalar,
    recommendedGliders: 1,
    recommendedDurationSeconds: withWindowDigest.recommendedDomain.durationSeconds,
    coastlineOrientation: coastlineOrientationForContext(withWindowDigest.detectedContext.primary),
    openBoundarySides: openBoundarySidesForWindow(withWindowDigest.bounds, withWindowDigest.detectedContext),
    featureMix: featureMixForWindow(withWindowDigest.sampledFieldStats, withWindowDigest.detectedContext),
    validationProfile: withWindowDigest.environmentSuitability.status,
    flowGenerationInputSummary: createGlobeWindowFlowInputSummary(world, withWindowDigest)
  };
}

export function createRegionalMissionRecipeFromGlobeWindow(options = {}) {
  const world = normalizeSyntheticGlobeWorld(options.world ?? options.worldMap ?? options.syntheticGlobeWorld ?? {});
  const selectedWindow = options.selectedWindow?.artifactType === OPERATIONAL_GLOBE_WINDOW_TYPE
    ? options.selectedWindow
    : createOperationalGlobeWindow(options.selectedWindow ?? options.window ?? DEFAULT_REGION_BOUNDS, world);
  const atlas = createSyntheticOceanAtlas({
    presetId: world.sourceAtlasSummary?.atlasPreset ?? syntheticGlobeStyleById(world.style).atlasPreset,
    seed: world.seed,
    resolution: { columns: 144, rows: 96 }
  });
  const atlasWindow = normalizeOperationalWindow({
    windowId: selectedWindow.windowId,
    label: selectedWindow.label,
    x: selectedWindow.x,
    y: selectedWindow.y,
    width: selectedWindow.width,
    height: selectedWindow.height,
    selectedBy: selectedWindow.selectedBy ?? 'globe-region-selector',
    recommendedDomain: selectedWindow.recommendedDomain
  }, atlas);
  const recipe = createRegionalMissionRecipe({
    atlas,
    selectedWindow: {
      ...atlasWindow,
      globeWindow: compactOperationalGlobeWindow(selectedWindow),
      sampledFieldStats: selectedWindow.sampledFieldStats,
      detectedContext: selectedWindow.detectedContext,
      recommendedDomain: selectedWindow.recommendedDomain,
      recommendedGliders: 1,
      recommendedDurationSeconds: selectedWindow.recommendedDomain?.durationSeconds ?? 86400,
      bathymetryRegime: selectedWindow.environmentRegimes?.bathymetry ?? atlasWindow.bathymetryRegime,
      currentRegime: selectedWindow.environmentRegimes?.flow ?? atlasWindow.currentRegime,
      scalarRegime: selectedWindow.environmentRegimes?.scalar ?? atlasWindow.scalarRegime,
      currentRegimeHints: selectedWindow.environmentRegimes?.flow ?? atlasWindow.currentRegimeHints,
      scalarRegimeHints: selectedWindow.environmentRegimes?.scalar ?? atlasWindow.scalarRegimeHints,
      coastlineOrientation: selectedWindow.coastlineOrientation,
      openBoundarySides: selectedWindow.openBoundarySides,
      featureMix: selectedWindow.featureMix,
      validationProfile: selectedWindow.environmentSuitability?.status ?? 'WARN',
      flowGenerationInputSummary: selectedWindow.flowGenerationInputSummary
    },
    seed: options.seed ?? `${world.seed}:${selectedWindow.windowDigest}`
  });
  return {
    ...recipe,
    sourceSyntheticGlobe: {
      artifactType: world.artifactType,
      worldId: world.worldId,
      style: world.style,
      seed: world.seed,
      worldDigest: world.worldDigest,
      textureResolution: world.textureResolution,
      coordinateFrame: world.coordinateFrame
    },
    selectedOperationalWindow: selectedWindow,
    datasetTags: selectedWindow.datasetTags ?? recipe.datasetTags,
    recipeDigest: canonicalJsonDigest({
      recipe,
      worldDigest: world.worldDigest,
      windowDigest: selectedWindow.windowDigest
    })
  };
}

export function environmentStudioOptionsFromGlobeRecipe(recipe = {}) {
  return environmentStudioOptionsFromRegionalRecipe({
    ...recipe,
    intendedGliders: 1,
    missionDuration: {
      durationSeconds: recipe.missionDuration?.durationSeconds ?? recipe.selectedOperationalWindow?.recommendedDomain?.durationSeconds ?? 86400,
      label: recipe.missionDuration?.label ?? '24 hr'
    }
  });
}

export function compactOperationalGlobeWindow(window = {}) {
  if (!window) return null;
  return {
    artifactType: window.artifactType,
    artifactVersion: window.artifactVersion,
    windowId: window.windowId,
    label: window.label,
    worldDigest: window.worldDigest,
    bounds: window.bounds,
    sampledFieldStats: window.sampledFieldStats,
    detectedContext: window.detectedContext,
    recommendedDomain: window.recommendedDomain,
    environmentRegimes: window.environmentRegimes,
    environmentSuitability: window.environmentSuitability,
    datasetTags: window.datasetTags,
    windowDigest: window.windowDigest
  };
}

export function syntheticGlobeViewportVisualMetrics(worldInput = {}, viewInput = {}) {
  const world = normalizeSyntheticGlobeWorld(worldInput);
  const columns = Math.max(8, Math.min(96, Math.round(Number(viewInput.sampleColumns ?? 32))));
  const rows = Math.max(8, Math.min(64, Math.round(Number(viewInput.sampleRows ?? 18))));
  let landSum = 0;
  let islandSum = 0;
  let oceanSum = 0;
  let coastlineSum = 0;
  let sampleCount = 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const lon = (x + 0.5) / columns;
      const lat = (y + 0.5) / rows;
      const fields = evaluateGlobeFields(world, lon, lat);
      landSum += fields.landOceanMask;
      oceanSum += 1 - fields.landOceanMask;
      islandSum += fields.islandSeamountPotential;
      coastlineSum += clamp(1 - fields.distanceToCoast, 0, 1);
      sampleCount += 1;
    }
  }
  return {
    type: 'anchor.synthetic-globe-world.visual-acceptance-metrics',
    globeRendered: true,
    sphereVisible: true,
    flatMapPrimaryView: false,
    canonicalWorldResolution: world.canonicalWorldResolution ?? world.textureResolution,
    displayTextureResolution: world.displayTextureResolution,
    worldDigest: world.worldDigest,
    worldStyle: world.style,
    worldSeed: world.seed,
    visibleLandFraction: round(sampleCount ? landSum / sampleCount : 0),
    visibleOceanFraction: round(sampleCount ? oceanSum / sampleCount : 0),
    visibleIslandCount: Math.max(1, Math.round((world.features ?? []).filter((feature) => /island|seamount/i.test(feature.type)).length * clamp(islandSum / Math.max(1, sampleCount) + 0.22, 0, 1))),
    visibleCoastlineComplexity: round(sampleCount ? coastlineSum / sampleCount : 0),
    pixelGridPrimaryView: false,
    symbolicAtlasShapeCount: 0,
    hiddenTruthExposed: false,
    realEarthMap: false,
    operationalForecast: false,
    calibratedOceanProduct: false,
    rendererCreatesScience: false
  };
}

export function syntheticGlobeStyleById(id = 'earthlikeSyntheticOcean') {
  const key = String(id ?? 'earthlikeSyntheticOcean');
  return SYNTHETIC_GLOBE_STYLES.find((entry) => entry.id === key || entry.label === key)
    ?? SYNTHETIC_GLOBE_STYLES[0];
}

export function normalizedWindowCenterToLonLat(bounds = DEFAULT_REGION_BOUNDS) {
  const normalized = normalizeGlobeWindowBounds(bounds);
  return {
    lonDegrees: round((normalized.centerLonNormalized - 0.5) * 360, 3),
    latDegrees: round((0.5 - normalized.centerLatNormalized) * 180, 3)
  };
}

function generateStructuredGlobeFeatures({ seed = '', style = 'earthlikeSyntheticOcean', generatorParameters = DEFAULT_GENERATOR_PARAMETERS } = {}) {
  const continentCount = style === 'oceanBasin' ? 2 : style === 'archipelagoWorld' ? 2 : style === 'continentalMargins' ? 4 : style === 'gulfInlandSea' ? 3 : 5;
  const islandCount = Math.round(8 + generatorParameters.islandDensity * (style === 'archipelagoWorld' ? 34 : style === 'oceanBasin' ? 18 : 22));
  const basinCount = style === 'oceanBasin' ? 5 : 3;
  const features = [];
  for (let index = 0; index < continentCount; index += 1) {
    const lon = seededUnit(seed, style, 'continent-lon', index);
    const lat = 0.15 + seededUnit(seed, style, 'continent-lat', index) * 0.7;
    const rx = (0.1 + seededUnit(seed, style, 'continent-rx', index) * 0.18) * (0.75 + generatorParameters.landmassScale);
    const ry = (0.12 + seededUnit(seed, style, 'continent-ry', index) * 0.2) * (0.75 + generatorParameters.landmassScale);
    features.push({
      featureId: `continent-${index}`,
      type: 'continentLandmass',
      center: { lonNormalized: round(lon), latNormalized: round(lat) },
      radius: { lonNormalized: round(rx), latNormalized: round(ry) },
      strength: round(0.82 + seededUnit(seed, style, 'continent-strength', index) * 0.24),
      synthetic: true
    });
  }
  for (let index = 0; index < islandCount; index += 1) {
    const arc = Math.floor(index / Math.max(1, islandCount / 4));
    const lon = fract01(0.08 + seededUnit(seed, style, 'island-arc-lon', arc) * 0.78 + index * 0.027);
    const lat = clamp(0.18 + seededUnit(seed, style, 'island-arc-lat', arc) * 0.62 + Math.sin(index * 0.76) * 0.08, 0.06, 0.94);
    const radius = 0.009 + seededUnit(seed, style, 'island-radius', index) * (style === 'archipelagoWorld' ? 0.03 : 0.018);
    features.push({
      featureId: `island-seamount-${index}`,
      type: index % 3 === 0 ? 'islandSeamount' : 'island',
      center: { lonNormalized: round(lon), latNormalized: round(lat) },
      radius: { lonNormalized: round(radius * 1.4), latNormalized: round(radius) },
      strength: round(0.72 + seededUnit(seed, style, 'island-strength', index) * 0.28),
      synthetic: true
    });
  }
  for (let index = 0; index < basinCount; index += 1) {
    features.push({
      featureId: `deep-basin-${index}`,
      type: 'deepBasin',
      center: {
        lonNormalized: round(seededUnit(seed, style, 'basin-lon', index)),
        latNormalized: round(0.18 + seededUnit(seed, style, 'basin-lat', index) * 0.64)
      },
      radius: {
        lonNormalized: round(0.12 + seededUnit(seed, style, 'basin-rx', index) * 0.18 * generatorParameters.basinScale),
        latNormalized: round(0.12 + seededUnit(seed, style, 'basin-ry', index) * 0.16 * generatorParameters.basinScale)
      },
      strength: round(0.68 + seededUnit(seed, style, 'basin-strength', index) * 0.32),
      synthetic: true
    });
  }
  const riverCount = style === 'gulfInlandSea' || style === 'continentalMargins' ? 5 : 3;
  for (let index = 0; index < riverCount; index += 1) {
    features.push({
      featureId: `river-mouth-${index}`,
      type: 'riverMouthDelta',
      center: {
        lonNormalized: round(seededUnit(seed, style, 'river-lon', index)),
        latNormalized: round(0.12 + seededUnit(seed, style, 'river-lat', index) * 0.76)
      },
      radius: { lonNormalized: 0.045, latNormalized: 0.035 },
      strength: round(0.55 + seededUnit(seed, style, 'river-strength', index) * 0.35),
      synthetic: true
    });
  }
  const straitCount = style === 'gulfInlandSea' ? 4 : style === 'archipelagoWorld' ? 3 : 2;
  for (let index = 0; index < straitCount; index += 1) {
    features.push({
      featureId: `strait-sill-${index}`,
      type: 'straitSill',
      center: {
        lonNormalized: round(seededUnit(seed, style, 'strait-lon', index)),
        latNormalized: round(0.18 + seededUnit(seed, style, 'strait-lat', index) * 0.66)
      },
      radius: { lonNormalized: 0.07, latNormalized: 0.028 },
      strength: round(0.52 + seededUnit(seed, style, 'strait-strength', index) * 0.38),
      synthetic: true
    });
  }
  return features;
}

function evaluateGlobeFields(world = {}, lonNormalized = 0.5, latNormalized = 0.5) {
  const u = fract01(lonNormalized);
  const v = clamp(latNormalized, 0, 1);
  const features = Array.isArray(world.features) ? world.features : [];
  const params = world.generatorParameters ?? DEFAULT_GENERATOR_PARAMETERS;
  let landPotential = -0.18;
  let islandPotential = 0;
  let basinPotential = 0;
  let river = 0;
  let strait = 0;
  let gulf = 0;
  for (const feature of features) {
    const cx = Number(feature.center?.lonNormalized ?? 0.5);
    const cy = Number(feature.center?.latNormalized ?? 0.5);
    const rx = Math.max(0.002, Number(feature.radius?.lonNormalized ?? feature.radius ?? 0.04));
    const ry = Math.max(0.002, Number(feature.radius?.latNormalized ?? feature.radius ?? 0.04));
    const strength = Number(feature.strength ?? 0.7);
    const distance = ellipticalDistanceWrapped(u, v, cx, cy, rx, ry);
    const influence = clamp(1 - distance, 0, 1) * strength;
    if (feature.type === 'continentLandmass') landPotential = Math.max(landPotential, influence);
    if (/island|seamount/i.test(feature.type)) {
      islandPotential = Math.max(islandPotential, influence);
      if (feature.type === 'island') landPotential = Math.max(landPotential, influence * 1.08);
    }
    if (feature.type === 'deepBasin') basinPotential = Math.max(basinPotential, influence);
    if (feature.type === 'riverMouthDelta') river = Math.max(river, influence * (1 - Math.max(0, landPotential - 0.55)));
    if (feature.type === 'straitSill') strait = Math.max(strait, influence);
  }
  const rough = structuredRoughness(world.seed, u, v, params.roughness);
  const landThreshold = clamp(params.waterLevel, 0.05, 0.95);
  const landRaw = clamp(landPotential + islandPotential * 0.46 + rough * params.coastlineComplexity * 0.12 - landThreshold + 0.5, 0, 1);
  const landOceanMask = smoothstep(0.42, 0.58, landRaw);
  const coastAffinity = 1 - Math.abs(landRaw - 0.5) * 2;
  const distanceToCoast = clamp(1 - Math.max(0, coastAffinity), 0, 1);
  const water = 1 - landOceanMask;
  const shelfZone = water * smoothstep(0.12, 0.82, coastAffinity + params.shelfWidth * 0.34);
  const shelfBreakZone = water * smoothstep(0.42, 0.9, 1 - Math.abs(coastAffinity - 0.42) * 2);
  const deepBasinPotential = water * clamp(basinPotential * 0.82 + (1 - coastAffinity) * 0.42 + params.basinScale * 0.18, 0, 1);
  const gulfBayInfluence = water * clamp(smoothstep(0.55, 0.94, landPotential) * (0.3 + params.landmassScale * 0.44), 0, 1);
  const openOceanCorridor = water * clamp(deepBasinPotential * 0.62 + distanceToCoast * 0.38, 0, 1);
  const canyonPotential = water * shelfBreakZone * clamp(0.25 + Math.abs(Math.sin((u * 5.1 + v * 2.7 + seededUnit(world.seed, 'canyon')) * Math.PI * 2)) * 0.8, 0, 1);
  const coarseFlowRegime = water * clamp((shelfZone * 2.2 + deepBasinPotential * 3.1 + strait * 4.5 + islandPotential * 2.4 + openOceanCorridor * 3.2) * params.flowIntensity, 0, 8);
  const scalarRegime = water * clamp(river * 4.8 + shelfZone * 2.1 + islandPotential * 2.2 + canyonPotential * 2.6 + deepBasinPotential * 1.6, 0, 8);
  const suitability = water * clamp(0.22 + shelfZone * 0.28 + shelfBreakZone * 0.24 + islandPotential * 0.16 + river * 0.12 + strait * 0.12 + deepBasinPotential * 0.16, 0, 1);
  const bathymetryContext = water * clamp(shelfZone * 0.24 + shelfBreakZone * 0.42 + deepBasinPotential * 0.76 + canyonPotential * 0.34 + islandPotential * 0.14, 0, 1);
  return {
    landOceanMask: round(landOceanMask),
    bathymetryContext: round(bathymetryContext),
    distanceToCoast: round(distanceToCoast),
    shelfZone: round(shelfZone),
    shelfBreakZone: round(shelfBreakZone),
    deepBasinPotential: round(deepBasinPotential),
    islandSeamountPotential: round(water * islandPotential),
    canyonPotential: round(canyonPotential),
    riverMouthInfluence: round(water * river),
    straitSillInfluence: round(water * strait),
    gulfBayInfluence: round(gulfBayInfluence + gulf),
    openOceanCorridor: round(openOceanCorridor),
    coarseFlowRegime: round(coarseFlowRegime),
    scalarRegime: round(scalarRegime),
    suitability: round(suitability)
  };
}

function summarizeProceduralLayers({ seed, style, generatorParameters, features, textureResolution } = {}) {
  const world = { seed, style, generatorParameters, features };
  const columns = 96;
  const rows = 48;
  const valuesByLayer = Object.fromEntries(FIELD_NAMES.map((name) => [name, []]));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const fields = evaluateGlobeFields(world, (x + 0.5) / columns, (y + 0.5) / rows);
      for (const name of FIELD_NAMES) valuesByLayer[name].push(fields[name]);
    }
  }
  return Object.fromEntries(Object.entries(valuesByLayer).map(([name, values]) => [name, summarizeValues(values, {
    canonicalResolution: textureResolution,
    sampledGrid: { columns, rows }
  })]));
}

function sampleGlobeWindowStats(world = {}, bounds = DEFAULT_REGION_BOUNDS) {
  const names = FIELD_NAMES;
  const valuesByLayer = Object.fromEntries(names.map((name) => [name, []]));
  const sampleCount = 14;
  const x0 = bounds.centerLonNormalized - bounds.widthNormalized / 2;
  const y0 = bounds.centerLatNormalized - bounds.heightNormalized / 2;
  for (let y = 0; y < sampleCount; y += 1) {
    for (let x = 0; x < sampleCount; x += 1) {
      const lon = x0 + ((x + 0.5) / sampleCount) * bounds.widthNormalized;
      const lat = y0 + ((y + 0.5) / sampleCount) * bounds.heightNormalized;
      const fields = evaluateGlobeFields(world, lon, lat);
      for (const name of names) valuesByLayer[name].push(fields[name]);
    }
  }
  const layerMeans = {};
  const layerMin = {};
  const layerMax = {};
  for (const [name, values] of Object.entries(valuesByLayer)) {
    const finite = values.map(Number).filter(Number.isFinite);
    layerMeans[name] = finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : 0;
    layerMin[name] = finite.length ? round(Math.min(...finite)) : 0;
    layerMax[name] = finite.length ? round(Math.max(...finite)) : 0;
  }
  return {
    type: 'anchor.synthetic-globe-world.window-field-stats',
    worldDigest: world.worldDigest,
    sampleCount: sampleCount * sampleCount,
    bounds,
    layerMeans,
    layerMin,
    layerMax,
    fieldStatsDigest: canonicalJsonDigest({ worldDigest: world.worldDigest, bounds, layerMeans, layerMin, layerMax })
  };
}

function detectGlobeWindowContext(stats = {}) {
  const means = stats.layerMeans ?? {};
  const water = clamp(1 - Number(means.landOceanMask ?? 0), 0, 1);
  const entries = [
    ['riverMouth', Number(means.riverMouthInfluence ?? 0) * 1.35],
    ['straitSill', Number(means.straitSillInfluence ?? 0) * 1.3],
    ['gulfBasin', Number(means.gulfBayInfluence ?? 0) * 1.2],
    ['islandChain', Number(means.islandSeamountPotential ?? 0) * 1.15],
    ['shelfBreak', Number(means.shelfBreakZone ?? 0) + Number(means.canyonPotential ?? 0) * 0.48],
    ['coastShelf', Number(means.shelfZone ?? 0) + Math.max(0, 0.2 - Number(means.distanceToCoast ?? 0))],
    ['deepBasin', Number(means.deepBasinPotential ?? 0)],
    ['openOcean', Number(means.openOceanCorridor ?? 0) * (water > 0.8 ? 1.25 : 0.9)]
  ].sort((a, b) => b[1] - a[1]);
  const primary = entries[0]?.[1] > 0.08 ? entries[0][0] : 'openOcean';
  return {
    primary,
    primaryLabel: CONTEXT_LABELS[primary] ?? labelize(primary),
    secondary: entries.slice(1).filter((entry) => entry[1] >= 0.15).map((entry) => entry[0]),
    contextScores: Object.fromEntries(entries.map(([key, value]) => [key, round(value)])),
    source: 'sampled synthetic-globe-world fields'
  };
}

function recommendedDomainForGlobeWindow(bounds = DEFAULT_REGION_BOUNDS, context = {}, input = {}) {
  const widthMeters = clampInteger(input.widthMeters ?? Math.round(bounds.widthNormalized * 1100000), 24000, 320000);
  const heightMeters = clampInteger(input.heightMeters ?? Math.round(bounds.heightNormalized * 860000), 16000, 240000);
  const sourceResolutionMeters = clampInteger(input.sourceResolutionMeters ?? input.sourceResolution ?? 1500, 500, 6000);
  const previewResolutionMeters = clampInteger(input.previewResolutionMeters ?? input.previewResolution ?? Math.max(3000, sourceResolutionMeters * 4), sourceResolutionMeters, 12000);
  const columns = Math.max(9, Math.min(161, Math.round(widthMeters / sourceResolutionMeters) + 1));
  const rows = Math.max(9, Math.min(121, Math.round(heightMeters / sourceResolutionMeters) + 1));
  const durationSeconds = context.primary === 'openOcean' ? 172800 : context.primary === 'coastShelf' ? 86400 : 129600;
  return {
    widthMeters,
    heightMeters,
    sourceResolutionMeters,
    previewResolutionMeters,
    rows,
    columns,
    durationSeconds
  };
}

function environmentRegimesForContext(context = {}, stats = {}) {
  const means = stats.layerMeans ?? {};
  const flow = [];
  if ((means.shelfZone ?? 0) > 0.28) flow.push('coastParallelShelfCurrent');
  if ((means.deepBasinPotential ?? 0) > 0.25 || context.primary === 'deepBasin') flow.push('basinGyre');
  if ((means.gulfBayInfluence ?? 0) > 0.2) flow.push('gulfMouthExchange');
  if ((means.straitSillInfluence ?? 0) > 0.18 || context.primary === 'straitSill') flow.push('straitJet');
  if ((means.islandSeamountPotential ?? 0) > 0.18) flow.push('islandWakePotential');
  if ((means.openOceanCorridor ?? 0) > 0.28) flow.push('openOceanEddyField');
  const scalar = [];
  if ((means.riverMouthInfluence ?? 0) > 0.12) scalar.push('riverPlume');
  if ((means.shelfZone ?? 0) > 0.25) scalar.push('shelfNutrientPatch');
  if ((means.shelfBreakZone ?? 0) > 0.16) scalar.push('thermoclineHotspot');
  if ((means.islandSeamountPotential ?? 0) > 0.18) scalar.push('islandWakePatch');
  if ((means.deepBasinPotential ?? 0) > 0.22) scalar.push('bloomPatch');
  if ((means.openOceanCorridor ?? 0) > 0.3) scalar.push('eddyTrappedHotspot');
  return {
    bathymetry: bathymetryRegimeForContext(context.primary, means),
    flow: unique(flow.length ? flow : ['broadBackgroundCurrent']),
    scalar: unique(scalar.length ? scalar : ['sparseOpenOceanPatch'])
  };
}

function createGlobeWindowFlowInputSummary(world = {}, window = {}) {
  const stats = window.sampledFieldStats ?? {};
  return withDigest({
    type: 'anchor.synthetic-globe-world.window-flow-input-summary',
    version: '1.0.0',
    worldDigest: world.worldDigest,
    windowId: window.windowId,
    windowBounds: window.bounds,
    wetLandMaskIdentity: {
      source: 'anchor.synthetic-globe-world.landOceanMask',
      worldDigest: world.worldDigest,
      layerSummary: layerStatSummary(stats, 'landOceanMask'),
      hiddenTruthExposed: false
    },
    coastlineSignedDistanceFieldSummary: {
      distanceToCoast: layerStatSummary(stats, 'distanceToCoast'),
      fieldStatsDigest: stats.fieldStatsDigest ?? null
    },
    openBoundarySides: window.openBoundarySides ?? [],
    gulfMouthBaySegments: zoneIf(stats, 'gulfBayInfluence', 'gulf-bay-mouth'),
    straitSillSegments: zoneIf(stats, 'straitSillInfluence', 'strait-sill'),
    islandSeamountZones: zoneIf(stats, 'islandSeamountPotential', 'island-seamount'),
    shelfBreakZones: zoneIf(stats, 'shelfBreakZone', 'shelf-break'),
    deepBasinCenters: zoneIf(stats, 'deepBasinPotential', 'deep-basin'),
    riverMouthDeltaSourceZones: zoneIf(stats, 'riverMouthInfluence', 'river-mouth-delta'),
    canyonCenterlines: zoneIf(stats, 'canyonPotential', 'canyon-centerline'),
    canyonPotentialZones: zoneIf(stats, 'canyonPotential', 'canyon-potential'),
    currentRegimeHints: window.environmentRegimes?.flow ?? [],
    scalarRegimeHints: window.environmentRegimes?.scalar ?? [],
    validationStatus: window.environmentSuitability?.status ?? 'WARN',
    generatedArtifacts: {
      currentField4D: false,
      scalarField4D: false,
      hotspots: false,
      startsDropZones: false,
      benchmarkBundle: false
    },
    hiddenTruthExposed: false
  }, 'flowInputSummaryDigest');
}

function globeWindowSuitability(stats = {}, context = {}) {
  const means = stats.layerMeans ?? {};
  const water = clamp(1 - Number(means.landOceanMask ?? 0), 0, 1);
  const diversity = clamp(Number(means.suitability ?? 0) + Number(means.shelfBreakZone ?? 0) * 0.2 + Number(means.islandSeamountPotential ?? 0) * 0.18, 0, 1);
  const score = round(clamp(water * 0.38 + diversity * 0.4 + Number(means.openOceanCorridor ?? 0) * 0.22, 0, 1));
  const warnings = [];
  if (water < 0.42) warnings.push('Selected globe region is land-heavy.');
  if (water > 0.96 && diversity < 0.25) warnings.push('Selected globe region is mostly open water with low feature diversity.');
  if (score < 0.35) warnings.push('Selected globe region may be low value for benchmark environment generation.');
  return {
    score,
    status: warnings.length ? 'WARN' : 'PASS',
    warnings,
    summary: `${CONTEXT_LABELS[context.primary] ?? labelize(context.primary)}; suitability ${score}`
  };
}

function validateOperationalGlobeWindow({ bounds, sampledFieldStats, recommendedDomain } = {}) {
  const errors = [];
  const warnings = [];
  const area = Number(bounds.widthNormalized ?? 0) * Number(bounds.heightNormalized ?? 0);
  if (area <= 0.002) errors.push('Operational globe region is too small.');
  if (area >= 0.05) errors.push('Operational globe region is too large for the default browser-friendly extraction workflow.');
  if ((sampledFieldStats?.layerMeans?.landOceanMask ?? 0) > 0.72) errors.push('Operational globe region is too land-heavy for bathymetry generation.');
  if (!Number.isFinite(recommendedDomain?.widthMeters) || !Number.isFinite(recommendedDomain?.heightMeters)) errors.push('Recommended domain is not finite.');
  if (area >= 0.035) warnings.push('Selected globe region is near the upper R1 size limit.');
  return {
    valid: errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings
  };
}

function validateSyntheticGlobeWorld({ layerSummaries = {}, textureResolution = DEFAULT_CANONICAL_RESOLUTION, features = [] } = {}) {
  const errors = [];
  const warnings = [];
  if (textureResolution.width < MIN_CANONICAL_RESOLUTION.width || textureResolution.height < MIN_CANONICAL_RESOLUTION.height) {
    errors.push('Canonical synthetic globe resolution is below 2048 x 1024.');
  }
  for (const name of FIELD_NAMES) {
    const summary = layerSummaries[name];
    if (!summary || !Number.isFinite(summary.mean)) errors.push(`Layer summary ${name} is missing or non-finite.`);
  }
  const land = Number(layerSummaries.landOceanMask?.mean ?? 0);
  if (land < 0.02) warnings.push('Synthetic globe has very little land context.');
  if (land > 0.82) warnings.push('Synthetic globe is mostly land.');
  if (!features.some((feature) => /island|seamount/i.test(feature.type))) warnings.push('Synthetic globe has no island or seamount feature records.');
  return {
    valid: errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings,
    hiddenTruthExposed: false,
    realEarthMap: false,
    operationalForecast: false
  };
}

function normalizeGlobeWindowBounds(input = DEFAULT_REGION_BOUNDS) {
  const widthNormalized = clamp(Number(input.widthNormalized ?? input.width ?? DEFAULT_REGION_BOUNDS.widthNormalized), 0.01, 0.78);
  const heightNormalized = clamp(Number(input.heightNormalized ?? input.height ?? DEFAULT_REGION_BOUNDS.heightNormalized), 0.01, 0.78);
  const fallbackLon = Number.isFinite(Number(input.x)) ? Number(input.x) + widthNormalized / 2 : DEFAULT_REGION_BOUNDS.centerLonNormalized;
  const fallbackLat = Number.isFinite(Number(input.y)) ? Number(input.y) + heightNormalized / 2 : DEFAULT_REGION_BOUNDS.centerLatNormalized;
  const centerLonNormalized = fract01(Number(input.centerLonNormalized ?? input.centerX ?? fallbackLon));
  const centerLatNormalized = clamp(Number(input.centerLatNormalized ?? input.centerY ?? fallbackLat), heightNormalized / 2, 1 - heightNormalized / 2);
  return {
    centerLonNormalized: round(centerLonNormalized),
    centerLatNormalized: round(centerLatNormalized),
    widthNormalized: round(widthNormalized),
    heightNormalized: round(heightNormalized)
  };
}

function normalizeCanonicalResolution(input = {}) {
  const width = Math.max(MIN_CANONICAL_RESOLUTION.width, Math.min(8192, Math.round(Number(input.width ?? input.columns ?? DEFAULT_CANONICAL_RESOLUTION.width))));
  const height = Math.max(MIN_CANONICAL_RESOLUTION.height, Math.min(4096, Math.round(Number(input.height ?? input.rows ?? DEFAULT_CANONICAL_RESOLUTION.height))));
  return { width, height };
}

function normalizeDisplayTextureResolution(input = {}) {
  const width = Math.max(256, Math.min(2048, Math.round(Number(input.width ?? input.columns ?? DEFAULT_DISPLAY_TEXTURE_RESOLUTION.width))));
  const height = Math.max(128, Math.min(1024, Math.round(Number(input.height ?? input.rows ?? DEFAULT_DISPLAY_TEXTURE_RESOLUTION.height))));
  return { width, height };
}

function normalizeGeneratorParameters(input = {}, styleId = 'earthlikeSyntheticOcean') {
  const preset = STYLE_PARAMETER_PRESETS[canonicalStyleId(styleId)] ?? DEFAULT_GENERATOR_PARAMETERS;
  return {
    waterLevel: round(clamp(input.waterLevel ?? preset.waterLevel, 0.05, 0.95)),
    landmassScale: round(clamp(input.landmassScale ?? preset.landmassScale, 0.05, 1)),
    islandDensity: round(clamp(input.islandDensity ?? preset.islandDensity, 0, 1)),
    coastlineComplexity: round(clamp(input.coastlineComplexity ?? preset.coastlineComplexity, 0, 1)),
    basinScale: round(clamp(input.basinScale ?? preset.basinScale, 0, 1)),
    shelfWidth: round(clamp(input.shelfWidth ?? preset.shelfWidth, 0, 1)),
    flowIntensity: round(clamp(input.flowIntensity ?? preset.flowIntensity, 0, 1)),
    roughness: round(clamp(input.roughness ?? preset.roughness, 0, 1))
  };
}

function canonicalStyleId(styleId = 'earthlikeSyntheticOcean') {
  const style = syntheticGlobeStyleById(styleId);
  return style.aliasOf ?? style.id;
}

function summarizeValues(values = [], extra = {}) {
  const finite = values.map(Number).filter(Number.isFinite);
  return {
    min: finite.length ? round(Math.min(...finite)) : 0,
    mean: finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : 0,
    max: finite.length ? round(Math.max(...finite)) : 0,
    finite: finite.length === values.length,
    ...extra
  };
}

function layerAlias(layerName = '') {
  if (layerName === 'continentalShelf') return 'shelfZone';
  if (layerName === 'shelfBreak') return 'shelfBreakZone';
  if (layerName === 'deepBasin') return 'deepBasinPotential';
  if (layerName === 'islandSeamount') return 'islandSeamountPotential';
  if (layerName === 'dominantCurrentRegime') return 'coarseFlowRegime';
  if (layerName === 'missionSuitability') return 'suitability';
  return layerName;
}

function layerStatSummary(stats = {}, layerName = '') {
  return {
    mean: stats.layerMeans?.[layerName] ?? null,
    min: stats.layerMin?.[layerName] ?? null,
    max: stats.layerMax?.[layerName] ?? null
  };
}

function zoneIf(stats = {}, layerName = '', zoneType = '') {
  const mean = Number(stats.layerMeans?.[layerName] ?? 0);
  if (mean < 0.08) return [];
  return [{
    zoneType,
    confidence: round(Math.min(1, mean)),
    source: 'synthetic-globe-window-stats',
    fieldStatsDigest: stats.fieldStatsDigest ?? null
  }];
}

function datasetTagsForContext(context = {}, stats = {}) {
  const means = stats.layerMeans ?? {};
  const tags = ['synthetic-globe-window'];
  if (context.primary) tags.push(context.primary);
  for (const secondary of context.secondary ?? []) tags.push(secondary);
  if ((means.suitability ?? 0) > 0.5) tags.push('environmentally-diverse');
  if ((means.openOceanCorridor ?? 0) > 0.5) tags.push('open-ocean-context');
  return unique(tags);
}

function featureMixForWindow(stats = {}, context = {}) {
  const means = stats.layerMeans ?? {};
  return {
    shelfFraction: levelFor(means.shelfZone),
    deepBasinFraction: levelFor(means.deepBasinPotential),
    canyonDensity: levelFor(means.canyonPotential),
    islandSeamountCount: levelFor(means.islandSeamountPotential),
    coastlineComplexity: context.primary === 'openOcean' ? 'low' : levelFor(1 - (means.distanceToCoast ?? 0)),
    riverMouthDeltaInfluence: levelFor(means.riverMouthInfluence),
    ridgeSillStrength: levelFor(means.straitSillInfluence),
    shelfBreakSharpness: levelFor(means.shelfBreakZone),
    featureDiversity: levelFor(means.suitability)
  };
}

function bathymetryRegimeForContext(primary = 'openOcean', means = {}) {
  if (primary === 'gulfBasin') return 'gulfShelfBasin';
  if (primary === 'islandChain') return 'islandArcSeamounts';
  if (primary === 'straitSill') return 'ridgeSillConstrainedBasin';
  if (primary === 'riverMouth') return 'riverMouthDeltaShelf';
  if (primary === 'shelfBreak' || (means.canyonPotential ?? 0) > 0.22) return 'shelfBreakCanyon';
  if (primary === 'coastShelf') return 'coastalShelf';
  if (primary === 'deepBasin') return 'shelfToDeepBasin';
  return 'openOceanBasin';
}

function coastlineOrientationForContext(primary = 'openOcean') {
  if (primary === 'gulfBasin' || primary === 'straitSill') return 'curvedGulf';
  if (primary === 'islandChain' || primary === 'openOcean') return 'islandArchipelago';
  if (primary === 'riverMouth') return 'northCoast';
  return 'westCoast';
}

function openBoundarySidesForWindow(bounds = DEFAULT_REGION_BOUNDS, context = {}) {
  const x = bounds.centerLonNormalized - bounds.widthNormalized / 2;
  const y = bounds.centerLatNormalized - bounds.heightNormalized / 2;
  const sides = [];
  if (x > 0.05) sides.push('west');
  if (x + bounds.widthNormalized < 0.95) sides.push('east');
  if (y > 0.05) sides.push('north');
  if (y + bounds.heightNormalized < 0.95) sides.push('south');
  if (context.primary === 'gulfBasin') return sides.includes('east') ? ['east'] : sides.slice(0, 1);
  if (context.primary === 'straitSill') return unique(['east', 'west'].filter((side) => sides.includes(side)));
  return unique(sides).slice(0, 4);
}

function ellipticalDistanceWrapped(x, y, cx, cy, rx, ry) {
  const dx = Math.min(Math.abs(x - cx), 1 - Math.abs(x - cx)) / Math.max(0.0001, rx);
  const dy = Math.abs(y - cy) / Math.max(0.0001, ry);
  return Math.sqrt(dx * dx + dy * dy);
}

function structuredRoughness(seed = '', x = 0, y = 0, amount = 0.35) {
  const a = seededUnit(seed, 'rough-a') * Math.PI * 2;
  const b = seededUnit(seed, 'rough-b') * Math.PI * 2;
  const wave = Math.sin(x * Math.PI * 12 + y * Math.PI * 2 + a) * 0.5
    + Math.cos(y * Math.PI * 9 + x * Math.PI * 3 + b) * 0.34
    + Math.sin((x + y) * Math.PI * 7 + a - b) * 0.2;
  return wave * clamp(amount, 0, 1);
}

function fract01(value = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return ((number % 1) + 1) % 1;
}

function withDigest(base = {}, key = 'digest') {
  const payload = { ...base };
  delete payload[key];
  return {
    ...base,
    [key]: canonicalJsonDigest(canonicalizeJsonValue(payload))
  };
}

function stableToken(value = '') {
  return String(canonicalJsonDigest({ value })).replace(/^fnv1a32:/, '').slice(0, 8);
}

function levelFor(value = 0) {
  const number = Number(value) || 0;
  if (number >= 0.52) return 'high';
  if (number >= 0.22) return 'medium';
  return 'low';
}

function clampInteger(value, min, max) {
  return Math.round(clamp(value, min, max));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function mixRgb(a = [0, 0, 0], b = [0, 0, 0], t = 0) {
  const amount = clamp(t, 0, 1);
  return [
    Math.round(Number(a[0] ?? 0) + (Number(b[0] ?? 0) - Number(a[0] ?? 0)) * amount),
    Math.round(Number(a[1] ?? 0) + (Number(b[1] ?? 0) - Number(a[1] ?? 0)) * amount),
    Math.round(Number(a[2] ?? 0) + (Number(b[2] ?? 0) - Number(a[2] ?? 0)) * amount)
  ];
}

function rgba(rgb = [0, 0, 0], alpha = 255) {
  return [rgb[0], rgb[1], rgb[2], alpha];
}

function labelize(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
