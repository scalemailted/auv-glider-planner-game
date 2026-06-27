import {
  canonicalJsonDigest
} from '../../../packages/codecs/src/index.js';
import {
  createRegionalMissionRecipe,
  createSyntheticOceanAtlas,
  environmentStudioOptionsFromRegionalRecipe,
  normalizeOperationalWindow,
  sampleAtlasLayer
} from './SyntheticOceanAtlas.js';

export const SYNTHETIC_WORLD_MAP_TYPE = 'anchor.synthetic-world-map';
export const SYNTHETIC_WORLD_MAP_VERSION = '1.0.0';
export const OPERATIONAL_WINDOW_TYPE = 'anchor.operational-window';
export const OPERATIONAL_WINDOW_WORLD_VERSION = '1.0.0';
export const SYNTHETIC_WORLD_MAP_ENGINE_VERSION = 'synthetic-world-field-engine-v1';
export const SYNTHETIC_WORLD_TILE_TYPE = 'anchor.synthetic-world-map-tile';
export const SYNTHETIC_WORLD_TILE_VERSION = '1.0.0';

export const SYNTHETIC_WORLD_STYLES = Object.freeze([
  { id: 'earthlikeSyntheticOcean', label: 'Earthlike Synthetic Ocean', atlasPreset: 'mixedRegionalWorld', defaultSeed: 'env-world-earthlike-001' },
  { id: 'archipelagoWorld', label: 'Archipelago World', atlasPreset: 'islandChainWorld', defaultSeed: 'env-world-archipelago-001' },
  { id: 'continentalMargins', label: 'Continental Margins', atlasPreset: 'riverDeltaShelfWorld', defaultSeed: 'env-world-margin-001' },
  { id: 'gulfInlandSea', label: 'Gulf / Inland Sea', atlasPreset: 'syntheticGulfWorld', defaultSeed: 'env-world-gulf-001' },
  { id: 'shelfToBasinWorld', label: 'Shelf-to-Basin World', atlasPreset: 'shelfToBasinWorld', defaultSeed: 'env-world-shelf-basin-001' },
  { id: 'openOceanBasin', label: 'Open Ocean Basin', atlasPreset: 'openOceanEddyWorld', defaultSeed: 'env-world-open-ocean-001' },
  { id: 'mixedRandom', label: 'Mixed Random', atlasPreset: 'mixedRegionalWorld', defaultSeed: 'env-world-mixed-001' }
]);

export const SYNTHETIC_WORLD_LAYER_OPTIONS = Object.freeze([
  { id: 'landOceanMask', label: 'Land / Ocean' },
  { id: 'bathymetryContext', label: 'Bathymetry Context' },
  { id: 'coarseFlowRegime', label: 'Flow Regime' },
  { id: 'scalarRegime', label: 'Scalar Regime' },
  { id: 'suitability', label: 'Suitability' }
]);

const DEFAULT_WORLD_RESOLUTION = Object.freeze({ columns: 192, rows: 108 });
const DEFAULT_VIRTUAL_WORLD_SIZE = Object.freeze({ width: 8192, height: 4608 });
const DEFAULT_TILE_SIZE = 512;
const DEFAULT_LOD_LEVELS = Object.freeze([0, 1, 2, 3]);
const DEFAULT_WINDOW_BOUNDS = Object.freeze({ x: 0.22, y: 0.2, width: 0.34, height: 0.34 });
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
const WORLD_STYLE_PARAMETER_PRESETS = Object.freeze({
  earthlikeSyntheticOcean: { waterLevel: 0.5, landmassScale: 0.62, islandDensity: 0.46, coastlineComplexity: 0.56, basinScale: 0.58, shelfWidth: 0.52, flowIntensity: 0.58, roughness: 0.42 },
  archipelagoWorld: { waterLevel: 0.58, landmassScale: 0.38, islandDensity: 0.86, coastlineComplexity: 0.7, basinScale: 0.5, shelfWidth: 0.44, flowIntensity: 0.62, roughness: 0.5 },
  continentalMargins: { waterLevel: 0.46, landmassScale: 0.72, islandDensity: 0.28, coastlineComplexity: 0.52, basinScale: 0.64, shelfWidth: 0.7, flowIntensity: 0.56, roughness: 0.34 },
  gulfInlandSea: { waterLevel: 0.48, landmassScale: 0.68, islandDensity: 0.36, coastlineComplexity: 0.66, basinScale: 0.48, shelfWidth: 0.6, flowIntensity: 0.64, roughness: 0.46 },
  shelfToBasinWorld: { waterLevel: 0.52, landmassScale: 0.58, islandDensity: 0.3, coastlineComplexity: 0.42, basinScale: 0.76, shelfWidth: 0.72, flowIntensity: 0.5, roughness: 0.3 },
  openOceanBasin: { waterLevel: 0.55, landmassScale: 0.4, islandDensity: 0.8, coastlineComplexity: 0.3, basinScale: 0.86, shelfWidth: 0.28, flowIntensity: 0.7, roughness: 0.26 },
  mixedRandom: DEFAULT_GENERATOR_PARAMETERS
});
const WORLD_LAYER_SOURCES = Object.freeze({
  landOceanMask: 'landOceanMask',
  distanceToCoast: 'distanceToCoast',
  shelfZone: 'continentalShelf',
  shelfBreakZone: 'shelfBreak',
  deepBasinPotential: 'deepBasin',
  islandSeamountPotential: 'islandSeamount',
  canyonPotential: 'canyonPotential',
  riverMouthInfluence: 'riverMouthInfluence',
  straitSillInfluence: 'straitSillInfluence',
  gulfBayInfluence: 'gulfBayInfluence',
  openOceanCorridor: 'openOceanCorridor',
  coarseFlowRegime: 'dominantCurrentRegime',
  scalarRegime: 'scalarRegime',
  suitability: 'missionSuitability'
});
const CONTEXT_LABELS = Object.freeze({
  coastShelf: 'coastal shelf',
  gulfBasin: 'semi-enclosed basin',
  islandChain: 'island / seamount chain',
  shelfBreak: 'shelf break',
  deepBasin: 'deep basin',
  straitSill: 'strait / sill exchange',
  riverMouth: 'river-mouth / delta',
  openOcean: 'open ocean basin'
});

export function createSyntheticWorldMap(options = {}) {
  const style = syntheticWorldStyleById(options.style ?? options.worldStyle ?? options.styleId);
  const seed = String(options.seed ?? style.defaultSeed);
  const resolution = normalizeWorldResolution(options.resolution);
  const virtualSize = normalizeVirtualSize(options.virtualSize);
  const tileSize = clampInteger(options.tileSize ?? DEFAULT_TILE_SIZE, 128, 1024);
  const lodLevels = normalizeLodLevels(options.lodLevels);
  const generatorParameters = normalizeWorldGeneratorParameters(options.generatorParameters ?? options.worldGeneratorParameters, style.id);
  const atlasPreset = style.id === 'mixedRandom'
    ? atlasPresetForMixedRandom(seed)
    : style.atlasPreset;
  const sourceAtlas = createSyntheticOceanAtlas({
    presetId: atlasPreset,
    seed,
    resolution
  });
  const layers = applyWorldGeneratorParameters(transformAtlasLayersToWorldLayers(sourceAtlas), generatorParameters, { seed, style: style.id });
  const generatedLayers = {
    ...layers,
    bathymetryContext: buildBathymetryContextLayer(layers),
    environmentDiversity: buildEnvironmentDiversityLayer(layers)
  };
  const layerSummaries = summarizeWorldLayers(generatedLayers);
  const validation = validateSyntheticWorldMapLayers(generatedLayers, resolution);
  const base = {
    artifactType: SYNTHETIC_WORLD_MAP_TYPE,
    artifactVersion: SYNTHETIC_WORLD_MAP_VERSION,
    worldId: String(options.worldId ?? `synthetic-world-${style.id}-${stableToken(seed)}`),
    seed,
    style: style.id,
    styleLabel: style.label,
    coordinateFrame: 'normalizedSyntheticWorld',
    virtualSize,
    sourceResolution: resolution,
    resolution,
    tileSize,
    lodLevels,
    generatorParameters,
    layers: generatedLayers,
    layerSummaries,
    features: normalizeWorldFeatures(sourceAtlas.features, sourceAtlas.regions),
    validation,
    provenance: {
      generator: SYNTHETIC_WORLD_MAP_ENGINE_VERSION,
      sourceAtlasType: sourceAtlas.atlasType,
      sourceAtlasVersion: sourceAtlas.atlasVersion,
      sourceAtlasPreset: sourceAtlas.atlasPreset,
      sourceAtlasDigest: sourceAtlas.atlasDigest,
      topologySource: 'structured distance fields, continent-scale blobs, island blobs, bay/gulf/strait primitives, shelf/basin fields, and controlled roughness',
      tileArchitecture: 'deterministic chunk keys and tile summaries derived from world seed, style, tile coordinate, LOD, layer, and generator parameters',
      rawNoiseOnly: false,
      claimBoundary: 'synthetic, benchmark-oriented, not real Earth, not calibrated survey data, not an operational forecast'
    },
    sourceAtlasSummary: {
      atlasPreset: sourceAtlas.atlasPreset,
      atlasDigest: sourceAtlas.atlasDigest,
      resolution: sourceAtlas.resolution,
      currentRegimeLegend: sourceAtlas.currentRegimeLegend,
      scalarRegimeLegend: sourceAtlas.scalarRegimeLegend,
      layerSummaries: sourceAtlas.layerSummaries
    },
    claimBoundary: {
      deterministicSyntheticWorldMap: true,
      realEarthMap: false,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest(base, 'worldDigest');
}

export function createSyntheticWorldTileKey(input = {}) {
  const lodLevel = clampInteger(input.lodLevel ?? input.lod ?? 0, 0, 8);
  const tileX = Math.max(0, Math.floor(Number(input.tileX ?? input.x ?? 0)));
  const tileY = Math.max(0, Math.floor(Number(input.tileY ?? input.y ?? 0)));
  const layer = String(input.layer ?? input.layerId ?? 'bathymetryContext');
  const worldDigest = String(input.worldDigest ?? input.worldMap?.worldDigest ?? 'unresolved-world');
  const key = {
    worldDigest,
    tileX,
    tileY,
    lodLevel,
    layer
  };
  return {
    ...key,
    tileKey: canonicalJsonDigest(key)
  };
}

export function createSyntheticWorldTile(worldMapInput = {}, input = {}) {
  const worldMap = normalizeSyntheticWorldMap(worldMapInput);
  const key = createSyntheticWorldTileKey({
    ...input,
    worldDigest: worldMap.worldDigest
  });
  const gridSize = clampInteger(input.gridSize ?? 24, 8, 96);
  const bounds = syntheticWorldTileBounds(worldMap, key);
  const samples = [];
  const values = [];
  for (let y = 0; y < gridSize; y += 1) {
    const row = [];
    for (let x = 0; x < gridSize; x += 1) {
      const sx = bounds.x + ((x + 0.5) / gridSize) * bounds.width;
      const sy = bounds.y + ((y + 0.5) / gridSize) * bounds.height;
      const value = sampleWorldMapLayer(worldMap, key.layer, sx, sy);
      row.push(value);
      values.push(value);
    }
    samples.push(row);
  }
  const finite = values.map(Number).filter(Number.isFinite);
  const summary = {
    min: finite.length ? round(Math.min(...finite)) : 0,
    mean: finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : 0,
    max: finite.length ? round(Math.max(...finite)) : 0,
    landFraction: round(tileMean(worldMap, bounds, 'landOceanMask', gridSize)),
    waterFraction: round(1 - tileMean(worldMap, bounds, 'landOceanMask', gridSize)),
    finite: finite.length === values.length
  };
  const tileBase = {
    artifactType: SYNTHETIC_WORLD_TILE_TYPE,
    artifactVersion: SYNTHETIC_WORLD_TILE_VERSION,
    worldDigest: worldMap.worldDigest,
    seed: worldMap.seed,
    style: worldMap.style,
    tileKey: key.tileKey,
    tileX: key.tileX,
    tileY: key.tileY,
    lodLevel: key.lodLevel,
    layer: key.layer,
    bounds,
    gridSize,
    samples,
    summary,
    provenance: {
      deterministicFrom: ['worldDigest', 'seed', 'style', 'generatorParameters', 'tileX', 'tileY', 'lodLevel', 'layer'],
      rendererIndependent: true,
      hiddenTruthExposed: false,
      realEarthMap: false,
      operationalForecast: false
    }
  };
  return withDigest(tileBase, 'tileDigest');
}

export function createSyntheticWorldTileCache() {
  const cache = new Map();
  return {
    get(worldMap, key) {
      const normalizedKey = createSyntheticWorldTileKey({ ...key, worldDigest: worldMap?.worldDigest });
      const cacheKey = normalizedKey.tileKey;
      if (!cache.has(cacheKey)) cache.set(cacheKey, createSyntheticWorldTile(worldMap, normalizedKey));
      return cache.get(cacheKey);
    },
    clear() {
      cache.clear();
    },
    size() {
      return cache.size;
    }
  };
}

export function createSyntheticWorldViewportState(input = {}) {
  return {
    panX: clamp(Number(input.panX ?? 0), -1, 1),
    panY: clamp(Number(input.panY ?? 0), -1, 1),
    zoom: clamp(Number(input.zoom ?? 1), 0.75, 8),
    canvasWidth: clampInteger(input.canvasWidth ?? input.width ?? 960, 240, 4096),
    canvasHeight: clampInteger(input.canvasHeight ?? input.height ?? 520, 160, 4096),
    lodLevel: clampInteger(input.lodLevel ?? input.lod ?? lodForZoom(input.zoom ?? 1), 0, 8)
  };
}

export function visibleSyntheticWorldTileKeys(worldMapInput = {}, viewportInput = {}) {
  const worldMap = normalizeSyntheticWorldMap(worldMapInput);
  const viewport = createSyntheticWorldViewportState(viewportInput);
  const tilesPerAxis = tilesPerAxisForLod(worldMap, viewport.lodLevel);
  const viewBounds = viewportWorldBounds(viewport);
  const minTileX = clampInteger(Math.floor(viewBounds.x * tilesPerAxis), 0, tilesPerAxis - 1);
  const maxTileX = clampInteger(Math.floor((viewBounds.x + viewBounds.width) * tilesPerAxis), 0, tilesPerAxis - 1);
  const minTileY = clampInteger(Math.floor(viewBounds.y * tilesPerAxis), 0, tilesPerAxis - 1);
  const maxTileY = clampInteger(Math.floor((viewBounds.y + viewBounds.height) * tilesPerAxis), 0, tilesPerAxis - 1);
  const keys = [];
  for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
    for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
      keys.push(createSyntheticWorldTileKey({
        worldDigest: worldMap.worldDigest,
        tileX,
        tileY,
        lodLevel: viewport.lodLevel,
        layer: viewportInput.layer ?? viewportInput.layerId ?? 'bathymetryContext'
      }));
    }
  }
  return {
    viewport,
    worldBounds: viewBounds,
    tilesPerAxis,
    keys,
    visibleTileDigest: canonicalJsonDigest({ worldDigest: worldMap.worldDigest, viewport, keys })
  };
}

export function syntheticWorldViewportVisualMetrics(worldMapInput = {}, viewportInput = {}) {
  const worldMap = normalizeSyntheticWorldMap(worldMapInput);
  const visible = visibleSyntheticWorldTileKeys(worldMap, viewportInput);
  const bounds = visible.worldBounds;
  const columns = clampInteger(viewportInput.sampleColumns ?? 28, 8, 96);
  const rows = clampInteger(viewportInput.sampleRows ?? 16, 8, 96);
  const landFlags = [];
  const islandFlags = [];
  let landSum = 0;
  let openOceanSum = 0;
  let coastlineAffinitySum = 0;
  let suitabilitySum = 0;
  let sampleCount = 0;
  for (let y = 0; y < rows; y += 1) {
    const landRow = [];
    const islandRow = [];
    for (let x = 0; x < columns; x += 1) {
      const sx = bounds.x + ((x + 0.5) / columns) * bounds.width;
      const sy = bounds.y + ((y + 0.5) / rows) * bounds.height;
      const land = sampleWorldMapLayer(worldMap, 'landOceanMask', sx, sy);
      const island = sampleWorldMapLayer(worldMap, 'islandSeamountPotential', sx, sy);
      const distance = sampleWorldMapLayer(worldMap, 'distanceToCoast', sx, sy);
      const openOcean = sampleWorldMapLayer(worldMap, 'openOceanCorridor', sx, sy);
      landRow.push(land > 0.55);
      islandRow.push(land <= 0.56 && island > 0.18);
      landSum += land;
      openOceanSum += Math.max(openOcean, land <= 0.42 ? 0.55 : 0);
      coastlineAffinitySum += clamp01(1 - distance) * (land > 0.15 && land < 0.85 ? 1 : 0.42);
      suitabilitySum += sampleWorldMapLayer(worldMap, 'suitability', sx, sy);
      sampleCount += 1;
    }
    landFlags.push(landRow);
    islandFlags.push(islandRow);
  }
  const landmassCount = connectedComponentCount(landFlags);
  const islandComponentCount = connectedComponentCount(islandFlags);
  const featureIslandCount = (worldMap.features ?? []).filter((feature) => {
    if (!/island|seamount/i.test(`${feature.type ?? ''} ${feature.featureId ?? ''} ${feature.label ?? ''}`)) return false;
    return featureIntersectsBounds(feature, bounds);
  }).length;
  const edgeTransitions = normalizedLandOceanTransitions(landFlags);
  const coastlineComplexity = round(
    edgeTransitions * 0.54
    + (sampleCount ? coastlineAffinitySum / sampleCount : 0) * 0.34
    + (sampleCount ? suitabilitySum / sampleCount : 0) * 0.12
  );
  return {
    type: 'anchor.synthetic-world-map.viewport-visual-metrics',
    worldDigest: worldMap.worldDigest,
    worldStyle: worldMap.style,
    worldSeed: worldMap.seed,
    viewportDigest: visible.visibleTileDigest,
    viewportWorldFraction: round(bounds.width * bounds.height),
    visibleTileCount: visible.keys.length,
    visibleLandmassCount: landmassCount,
    visibleIslandCount: Math.max(islandComponentCount, featureIslandCount),
    visibleCoastlineComplexity: coastlineComplexity,
    visibleOpenOceanFraction: round(sampleCount ? openOceanSum / sampleCount : 0),
    visibleLandFraction: round(sampleCount ? landSum / sampleCount : 0),
    visibleCellGridDefault: false,
    symbolicAtlasShapeCount: 0,
    hiddenTruthExposed: false,
    realEarthMap: false,
    operationalForecast: false,
    calibratedOceanProduct: false,
    rendererCreatesScience: false
  };
}

export function createOperationalWindowFromWorldMap(input = {}, worldMapInput = createSyntheticWorldMap()) {
  const worldMap = normalizeSyntheticWorldMap(worldMapInput);
  const bounds = normalizeWindowBounds(input.bounds ?? input);
  const sampledFieldStats = sampleWorldWindowStats(worldMap, bounds);
  const detectedContext = detectWorldWindowContext(sampledFieldStats);
  const recommendedDomain = recommendedDomainForWindow(bounds, detectedContext, input);
  const environmentRegimes = environmentRegimesForWindow(detectedContext, sampledFieldStats);
  const environmentSuitability = windowSuitability(sampledFieldStats, detectedContext);
  const windowBase = {
    artifactType: OPERATIONAL_WINDOW_TYPE,
    artifactVersion: OPERATIONAL_WINDOW_WORLD_VERSION,
    windowId: String(input.windowId ?? `world-window-${stableToken(canonicalJsonDigest({ worldDigest: worldMap.worldDigest, bounds }))}`),
    label: String(input.label ?? 'Selected Environment Window'),
    worldId: worldMap.worldId,
    worldDigest: worldMap.worldDigest,
    sourceAtlasDigest: worldMap.provenance?.sourceAtlasDigest ?? worldMap.sourceAtlasSummary?.atlasDigest ?? null,
    bounds,
    sampledFieldStats,
    detectedContext,
    recommendedDomain,
    environmentRegimes,
    environmentSuitability,
    datasetTags: datasetTagsForContext(detectedContext, sampledFieldStats),
    selectedBy: String(input.selectedBy ?? 'boundary-tool'),
    validation: validateOperationalWindow({ bounds, sampledFieldStats, detectedContext, recommendedDomain }),
    claimBoundary: {
      synthetic: true,
      realEarthMap: false,
      calibratedOceanProduct: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    }
  };
  const digestable = withDigest(windowBase, 'windowDigest');
  return {
    ...digestable,
    atlasDigest: digestable.sourceAtlasDigest,
    x: digestable.bounds.x,
    y: digestable.bounds.y,
    width: digestable.bounds.width,
    height: digestable.bounds.height,
    center: {
      x: round(digestable.bounds.x + digestable.bounds.width / 2),
      y: round(digestable.bounds.y + digestable.bounds.height / 2)
    },
    primaryContext: digestable.detectedContext.primary,
    detectedContext: {
      ...digestable.detectedContext,
      primaryContext: digestable.detectedContext.primary,
      primaryContextLabel: CONTEXT_LABELS[digestable.detectedContext.primary] ?? labelize(digestable.detectedContext.primary),
      secondaryContexts: digestable.detectedContext.secondary,
      landFraction: digestable.sampledFieldStats.layerMeans.landOceanMask,
      waterFraction: round(1 - digestable.sampledFieldStats.layerMeans.landOceanMask),
      shelfFraction: digestable.sampledFieldStats.layerMeans.shelfZone,
      shelfBreakFraction: digestable.sampledFieldStats.layerMeans.shelfBreakZone,
      deepBasinFraction: digestable.sampledFieldStats.layerMeans.deepBasinPotential,
      basinFraction: digestable.sampledFieldStats.layerMeans.deepBasinPotential,
      islandFraction: digestable.sampledFieldStats.layerMeans.islandSeamountPotential,
      canyonPotential: digestable.sampledFieldStats.layerMeans.canyonPotential,
      riverMouthInfluence: digestable.sampledFieldStats.layerMeans.riverMouthInfluence,
      straitSillInfluence: digestable.sampledFieldStats.layerMeans.straitSillInfluence,
      straitInfluence: digestable.sampledFieldStats.layerMeans.straitSillInfluence,
      gulfBayInfluence: digestable.sampledFieldStats.layerMeans.gulfBayInfluence,
      openOceanFraction: digestable.sampledFieldStats.layerMeans.openOceanCorridor,
      currentRegimeHints: digestable.environmentRegimes.flow,
      scalarRegimeHints: digestable.environmentRegimes.scalar,
      missionSuitabilityHint: digestable.datasetTags.join(', ')
    },
    recommendedMissionScale: 'recommended-use-tags-only',
    recommendedGliders: null,
    recommendedDurationSeconds: digestable.recommendedDomain.durationSeconds,
    bathymetryRegime: digestable.environmentRegimes.bathymetry,
    currentRegime: digestable.environmentRegimes.flow,
    scalarRegime: digestable.environmentRegimes.scalar,
    currentRegimeHints: digestable.environmentRegimes.flow,
    scalarRegimeHints: digestable.environmentRegimes.scalar,
    coastlineOrientation: coastlineOrientationForContext(digestable.detectedContext.primary),
    openBoundarySides: openBoundarySidesForWindow(bounds, detectedContext),
    featureMix: featureMixForWindow(sampledFieldStats, detectedContext),
    validationProfile: environmentSuitability.status,
    recommendedDomain: {
      ...digestable.recommendedDomain,
      widthMeters: digestable.recommendedDomain.widthMeters,
      heightMeters: digestable.recommendedDomain.heightMeters,
      sourceResolutionMeters: digestable.recommendedDomain.sourceResolutionMeters,
      previewResolutionMeters: digestable.recommendedDomain.previewResolutionMeters,
      rows: digestable.recommendedDomain.rows,
      columns: digestable.recommendedDomain.columns
    }
  };
}

export function createRegionalMissionRecipeFromWorldWindow(options = {}) {
  const worldMap = normalizeSyntheticWorldMap(options.worldMap ?? options.syntheticWorldMap ?? {});
  const selectedWindow = options.selectedWindow?.artifactType === OPERATIONAL_WINDOW_TYPE
    ? options.selectedWindow
    : createOperationalWindowFromWorldMap(options.selectedWindow ?? options.window ?? DEFAULT_WINDOW_BOUNDS, worldMap);
  const atlas = createSyntheticOceanAtlas({
    presetId: worldMap.sourceAtlasSummary?.atlasPreset ?? styleToAtlasPreset(worldMap.style),
    seed: worldMap.seed,
    resolution: worldMap.resolution
  });
  const atlasWindow = normalizeOperationalWindow({
    windowId: selectedWindow.windowId,
    label: selectedWindow.label,
    x: selectedWindow.bounds.x,
    y: selectedWindow.bounds.y,
    width: selectedWindow.bounds.width,
    height: selectedWindow.bounds.height,
    selectedBy: selectedWindow.selectedBy ?? 'world-map-boundary',
    recommendedDomain: selectedWindow.recommendedDomain
  }, atlas);
  const recipe = createRegionalMissionRecipe({
    atlas,
    selectedWindow: {
      ...atlasWindow,
      worldWindow: compactOperationalWindow(selectedWindow),
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
      coastlineOrientation: coastlineOrientationForContext(selectedWindow.detectedContext?.primary),
      openBoundarySides: openBoundarySidesForWindow(selectedWindow.bounds, selectedWindow.detectedContext),
      featureMix: featureMixForWindow(selectedWindow.sampledFieldStats, selectedWindow.detectedContext),
      validationProfile: selectedWindow.environmentSuitability?.status ?? 'WARN'
    },
    seed: options.seed ?? `${worldMap.seed}:${selectedWindow.windowDigest}`
  });
  return {
    ...recipe,
    sourceWorldMap: {
      artifactType: worldMap.artifactType,
      worldId: worldMap.worldId,
      style: worldMap.style,
      seed: worldMap.seed,
      worldDigest: worldMap.worldDigest,
      resolution: worldMap.resolution
    },
    selectedOperationalWindow: selectedWindow,
    datasetTags: selectedWindow.datasetTags ?? recipe.datasetTags,
    recipeDigest: canonicalJsonDigest({
      recipe,
      worldDigest: worldMap.worldDigest,
      windowDigest: selectedWindow.windowDigest
    })
  };
}

export function environmentStudioOptionsFromWorldRecipe(recipe = {}) {
  return environmentStudioOptionsFromRegionalRecipe({
    ...recipe,
    intendedGliders: 1,
    missionDuration: {
      durationSeconds: recipe.missionDuration?.durationSeconds ?? recipe.selectedOperationalWindow?.recommendedDomain?.durationSeconds ?? 86400,
      label: recipe.missionDuration?.label ?? '24 hr'
    }
  });
}

export function sampleWorldMapLayer(worldMap = {}, layerName = 'suitability', x = 0.5, y = 0.5) {
  const grid = worldMap.layers?.[layerName];
  if (!Array.isArray(grid) || !grid.length) return 0;
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  const gx = clamp01(x) * Math.max(0, columns - 1);
  const gy = clamp01(y) * Math.max(0, rows - 1);
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

export function normalizeSyntheticWorldMap(input = {}) {
  if (input?.artifactType === SYNTHETIC_WORLD_MAP_TYPE && input.worldDigest && input.layers) return input;
  return createSyntheticWorldMap(input);
}

export function compactSyntheticWorldMap(worldMap = {}) {
  return {
    artifactType: worldMap.artifactType,
    artifactVersion: worldMap.artifactVersion,
    worldId: worldMap.worldId,
    seed: worldMap.seed,
    style: worldMap.style,
    styleLabel: worldMap.styleLabel,
    coordinateFrame: worldMap.coordinateFrame,
    virtualSize: worldMap.virtualSize,
    sourceResolution: worldMap.sourceResolution,
    resolution: worldMap.resolution,
    tileSize: worldMap.tileSize,
    lodLevels: worldMap.lodLevels,
    generatorParameters: worldMap.generatorParameters,
    layerSummaries: worldMap.layerSummaries,
    featureCount: worldMap.features?.length ?? 0,
    validation: worldMap.validation,
    provenance: worldMap.provenance,
    claimBoundary: worldMap.claimBoundary,
    worldDigest: worldMap.worldDigest
  };
}

export function compactOperationalWindow(window = {}) {
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

export function syntheticWorldStyleById(id = 'earthlikeSyntheticOcean') {
  const key = String(id ?? 'earthlikeSyntheticOcean');
  return SYNTHETIC_WORLD_STYLES.find((entry) => entry.id === key || entry.label === key)
    ?? SYNTHETIC_WORLD_STYLES[0];
}

function transformAtlasLayersToWorldLayers(atlas = {}) {
  const result = {};
  for (const [target, source] of Object.entries(WORLD_LAYER_SOURCES)) {
    result[target] = cloneGrid(atlas.layers?.[source]);
  }
  return result;
}

function normalizeWorldGeneratorParameters(input = {}, styleId = 'earthlikeSyntheticOcean') {
  const preset = {
    ...DEFAULT_GENERATOR_PARAMETERS,
    ...(WORLD_STYLE_PARAMETER_PRESETS[styleId] ?? {})
  };
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

function applyWorldGeneratorParameters(layers = {}, params = DEFAULT_GENERATOR_PARAMETERS, context = {}) {
  const landOceanMask = combineLayerRows(layers.landOceanMask, (x, y) => {
    const base = valueAt(layers.landOceanMask, x, y);
    const nx = x / Math.max(1, (layers.landOceanMask?.[0]?.length ?? 1) - 1);
    const ny = y / Math.max(1, (layers.landOceanMask?.length ?? 1) - 1);
    const continentBias = 0.5 + (params.landmassScale - 0.55) * 0.55;
    const waterBias = (0.5 - params.waterLevel) * 0.7;
    const islandBias = valueAt(layers.islandSeamountPotential, x, y) * (params.islandDensity - 0.5) * 0.5;
    const coastTexture = structuredVariation(nx, ny, context.seed, 2.4 + params.coastlineComplexity * 3.2) * params.coastlineComplexity * 0.24;
    return round(clamp01(base * continentBias + waterBias + islandBias + coastTexture));
  });
  const shelfZone = combineLayerRows(layers.shelfZone, (x, y) => {
    if (valueAt(landOceanMask, x, y) > 0.6) return 0;
    const distance = valueAt(layers.distanceToCoast, x, y);
    return round(clamp01(valueAt(layers.shelfZone, x, y) * (0.55 + params.shelfWidth * 0.9) + Math.max(0, 0.34 - distance) * params.shelfWidth));
  });
  const deepBasinPotential = combineLayerRows(layers.deepBasinPotential, (x, y) => {
    if (valueAt(landOceanMask, x, y) > 0.6) return 0;
    return round(clamp01(valueAt(layers.deepBasinPotential, x, y) * (0.45 + params.basinScale) + (1 - valueAt(shelfZone, x, y)) * params.basinScale * 0.22));
  });
  const islandSeamountPotential = combineLayerRows(layers.islandSeamountPotential, (x, y) => {
    const base = valueAt(layers.islandSeamountPotential, x, y);
    const land = valueAt(landOceanMask, x, y);
    return round(clamp01(base * (0.45 + params.islandDensity) + Math.max(0, 0.58 - land) * params.islandDensity * 0.12));
  });
  const canyonPotential = combineLayerRows(layers.canyonPotential, (x, y) => round(clamp01(valueAt(layers.canyonPotential, x, y) * (0.7 + params.coastlineComplexity * 0.65))));
  const shelfBreakZone = combineLayerRows(layers.shelfBreakZone, (x, y) => round(clamp01(valueAt(layers.shelfBreakZone, x, y) * (0.7 + params.shelfWidth * 0.45 + params.basinScale * 0.25))));
  const coarseFlowRegime = combineLayerRows(layers.coarseFlowRegime, (x, y) => {
    if (valueAt(landOceanMask, x, y) > 0.58) return 0;
    const scaled = Number(valueAt(layers.coarseFlowRegime, x, y)) * (0.55 + params.flowIntensity * 0.8);
    return round(clamp(scaled, 0, 8));
  });
  const scalarRegime = combineLayerRows(layers.scalarRegime, (x, y) => {
    if (valueAt(landOceanMask, x, y) > 0.7) return 0;
    const plume = valueAt(layers.riverMouthInfluence, x, y) * params.shelfWidth * 1.2;
    const bloom = valueAt(deepBasinPotential, x, y) * params.basinScale * 0.28;
    return round(clamp(Number(valueAt(layers.scalarRegime, x, y)) + plume + bloom, 0, 8));
  });
  return {
    ...layers,
    landOceanMask,
    shelfZone,
    shelfBreakZone,
    deepBasinPotential,
    islandSeamountPotential,
    canyonPotential,
    coarseFlowRegime,
    scalarRegime,
    suitability: combineLayerRows(layers.suitability, (x, y) => {
      if (valueAt(landOceanMask, x, y) > 0.72) return 0;
      return round(clamp01(
        valueAt(layers.suitability, x, y) * 0.44
        + valueAt(shelfZone, x, y) * 0.2
        + valueAt(deepBasinPotential, x, y) * 0.18
        + valueAt(islandSeamountPotential, x, y) * 0.1
        + params.flowIntensity * 0.08
      ));
    })
  };
}

function buildBathymetryContextLayer(layers = {}) {
  return combineLayerRows(layers.landOceanMask, (x, y) => {
    const land = valueAt(layers.landOceanMask, x, y);
    if (land > 0.5) return 0;
    return round(clamp01(
      valueAt(layers.shelfZone, x, y) * 0.34
      + valueAt(layers.shelfBreakZone, x, y) * 0.24
      + valueAt(layers.deepBasinPotential, x, y) * 0.22
      + valueAt(layers.canyonPotential, x, y) * 0.12
      + valueAt(layers.islandSeamountPotential, x, y) * 0.08
    ));
  });
}

function buildEnvironmentDiversityLayer(layers = {}) {
  return combineLayerRows(layers.landOceanMask, (x, y) => {
    const land = valueAt(layers.landOceanMask, x, y);
    if (land > 0.7) return 0.08;
    const components = [
      valueAt(layers.shelfZone, x, y),
      valueAt(layers.shelfBreakZone, x, y),
      valueAt(layers.deepBasinPotential, x, y),
      valueAt(layers.islandSeamountPotential, x, y),
      valueAt(layers.canyonPotential, x, y),
      valueAt(layers.riverMouthInfluence, x, y),
      valueAt(layers.straitSillInfluence, x, y),
      valueAt(layers.gulfBayInfluence, x, y),
      valueAt(layers.openOceanCorridor, x, y)
    ];
    const active = components.filter((value) => value > 0.18).length;
    return round(clamp01(active / 5 + valueAt(layers.suitability, x, y) * 0.38));
  });
}

function sampleWorldWindowStats(worldMap = {}, bounds = DEFAULT_WINDOW_BOUNDS) {
  const layerNames = Object.keys(worldMap.layers ?? {});
  const sampleCount = Math.max(7, Math.floor(Number(bounds.sampleCount ?? 13)));
  const valuesByLayer = Object.fromEntries(layerNames.map((name) => [name, []]));
  for (let sy = 0; sy < sampleCount; sy += 1) {
    for (let sx = 0; sx < sampleCount; sx += 1) {
      const x = bounds.x + (sx + 0.5) / sampleCount * bounds.width;
      const y = bounds.y + (sy + 0.5) / sampleCount * bounds.height;
      for (const name of layerNames) {
        valuesByLayer[name].push(sampleWorldMapLayer(worldMap, name, x, y));
      }
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
  const compactBounds = {
    x: round(bounds.x),
    y: round(bounds.y),
    width: round(bounds.width),
    height: round(bounds.height)
  };
  return {
    type: 'anchor.synthetic-world-map.window-field-stats',
    worldDigest: worldMap.worldDigest,
    sampleCount: sampleCount * sampleCount,
    bounds: compactBounds,
    layerMeans,
    layerMin,
    layerMax,
    fieldStatsDigest: canonicalJsonDigest({ worldDigest: worldMap.worldDigest, compactBounds, layerMeans, layerMin, layerMax })
  };
}

function detectWorldWindowContext(stats = {}) {
  const means = stats.layerMeans ?? {};
  const water = clamp01(1 - Number(means.landOceanMask ?? 0));
  const entries = [
    ['riverMouth', Number(means.riverMouthInfluence ?? 0) * 1.35],
    ['straitSill', Number(means.straitSillInfluence ?? 0) * 1.3],
    ['gulfBasin', Number(means.gulfBayInfluence ?? 0) * 1.22],
    ['islandChain', Number(means.islandSeamountPotential ?? 0) * 1.15],
    ['shelfBreak', Number(means.shelfBreakZone ?? 0) + Number(means.canyonPotential ?? 0) * 0.45],
    ['coastShelf', Number(means.shelfZone ?? 0) + Math.max(0, 0.22 - Number(means.distanceToCoast ?? 0))],
    ['deepBasin', Number(means.deepBasinPotential ?? 0)],
    ['openOcean', Number(means.openOceanCorridor ?? 0) * (water > 0.8 ? 1.25 : 0.9)]
  ].sort((a, b) => b[1] - a[1]);
  const primary = entries[0]?.[1] > 0.08 ? entries[0][0] : 'openOcean';
  return {
    primary,
    primaryLabel: CONTEXT_LABELS[primary] ?? labelize(primary),
    secondary: entries.slice(1).filter((entry) => entry[1] >= 0.15).map((entry) => entry[0]),
    contextScores: Object.fromEntries(entries.map(([key, value]) => [key, round(value)])),
    source: 'sampled synthetic-world-map fields'
  };
}

function recommendedDomainForWindow(bounds = DEFAULT_WINDOW_BOUNDS, context = {}, input = {}) {
  const widthMeters = clampInteger(input.widthMeters ?? Math.round(bounds.width * 850000), 24000, 320000);
  const heightMeters = clampInteger(input.heightMeters ?? Math.round(bounds.height * 720000), 16000, 240000);
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

function environmentRegimesForWindow(context = {}, stats = {}) {
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

function windowSuitability(stats = {}, context = {}) {
  const means = stats.layerMeans ?? {};
  const water = clamp01(1 - Number(means.landOceanMask ?? 0));
  const diversity = Number(means.environmentDiversity ?? 0);
  const suitability = Number(means.suitability ?? 0);
  const score = round(clamp01(water * 0.38 + diversity * 0.36 + suitability * 0.26));
  const warnings = [];
  if (water < 0.42) warnings.push('Selected window is land-heavy.');
  if (water > 0.96 && diversity < 0.25) warnings.push('Selected window is mostly open water with low feature diversity.');
  if (score < 0.35) warnings.push('Selected window may be low value for benchmark environment generation.');
  return {
    score,
    status: warnings.length ? 'WARN' : 'PASS',
    warnings,
    summary: `${CONTEXT_LABELS[context.primary] ?? labelize(context.primary)}; suitability ${score}`
  };
}

function validateOperationalWindow({ bounds, sampledFieldStats, recommendedDomain } = {}) {
  const errors = [];
  const warnings = [];
  if (bounds.width <= 0.08 || bounds.height <= 0.08) errors.push('Operational window is too small.');
  if (bounds.width > 0.78 || bounds.height > 0.78) warnings.push('Operational window is large; regional generation may need preview decimation.');
  if ((sampledFieldStats?.layerMeans?.landOceanMask ?? 0) > 0.72) errors.push('Operational window is too land-heavy for bathymetry generation.');
  if (!Number.isFinite(recommendedDomain?.widthMeters) || !Number.isFinite(recommendedDomain?.heightMeters)) errors.push('Recommended domain is not finite.');
  return {
    valid: errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings
  };
}

function validateSyntheticWorldMapLayers(layers = {}, resolution = DEFAULT_WORLD_RESOLUTION) {
  const errors = [];
  const warnings = [];
  const expected = [
    'landOceanMask',
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
    'environmentDiversity',
    'suitability'
  ];
  for (const name of expected) {
    const grid = layers[name];
    if (!Array.isArray(grid) || grid.length !== resolution.rows || grid[0]?.length !== resolution.columns) {
      errors.push(`World layer ${name} does not match resolution.`);
      continue;
    }
    if (!grid.every((row) => row.every((value) => Number.isFinite(Number(value))))) {
      errors.push(`World layer ${name} contains non-finite values.`);
    }
  }
  const landMean = meanGrid(layers.landOceanMask);
  if (landMean <= 0.02) warnings.push('World has very little land context.');
  if (landMean >= 0.82) warnings.push('World is mostly land.');
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

function summarizeWorldLayers(layers = {}) {
  return Object.fromEntries(Object.entries(layers).map(([name, grid]) => [name, summarizeGrid(grid)]));
}

function summarizeGrid(grid = []) {
  const finite = grid.flat().map(Number).filter(Number.isFinite);
  if (!finite.length) return { min: 0, mean: 0, max: 0 };
  return {
    min: round(Math.min(...finite)),
    mean: round(finite.reduce((sum, value) => sum + value, 0) / finite.length),
    max: round(Math.max(...finite))
  };
}

function normalizeWorldFeatures(features = [], regions = []) {
  return [
    ...features.map((feature) => ({
      ...feature,
      source: feature.source ?? 'synthetic-world-field-engine',
      synthetic: true
    })),
    ...regions.map((region) => ({
      featureId: region.regionId,
      type: region.context,
      label: region.label,
      shape: region.shape,
      source: 'semantic-world-region',
      synthetic: true,
      notRealEarth: true
    }))
  ];
}

function datasetTagsForContext(context = {}, stats = {}) {
  const means = stats.layerMeans ?? {};
  const tags = ['synthetic-world-map-window'];
  if (context.primary) tags.push(context.primary);
  for (const secondary of context.secondary ?? []) tags.push(secondary);
  if ((means.environmentDiversity ?? 0) > 0.5) tags.push('environmentally-diverse');
  if ((means.suitability ?? 0) > 0.6) tags.push('benchmark-suitable');
  return unique(tags);
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

function openBoundarySidesForWindow(bounds = DEFAULT_WINDOW_BOUNDS, context = {}) {
  const sides = [];
  if (bounds.x > 0.08) sides.push('west');
  if (bounds.x + bounds.width < 0.92) sides.push('east');
  if (bounds.y > 0.08) sides.push('north');
  if (bounds.y + bounds.height < 0.92) sides.push('south');
  if (context.primary === 'gulfBasin') return sides.includes('east') ? ['east'] : sides.slice(0, 1);
  if (context.primary === 'straitSill') return unique(['east', 'west'].filter((side) => sides.includes(side)));
  return unique(sides).slice(0, 4);
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
    featureDiversity: levelFor(means.environmentDiversity)
  };
}

function normalizeWorldResolution(input = {}) {
  const columns = clampInteger(input.columns ?? input.width ?? DEFAULT_WORLD_RESOLUTION.columns, 48, 512);
  const rows = clampInteger(input.rows ?? input.height ?? DEFAULT_WORLD_RESOLUTION.rows, 32, 256);
  return { columns, rows };
}

function normalizeVirtualSize(input = {}) {
  return {
    width: clampInteger(input.width ?? DEFAULT_VIRTUAL_WORLD_SIZE.width, 1024, 65536),
    height: clampInteger(input.height ?? DEFAULT_VIRTUAL_WORLD_SIZE.height, 768, 65536)
  };
}

function normalizeLodLevels(input = DEFAULT_LOD_LEVELS) {
  const values = (Array.isArray(input) ? input : DEFAULT_LOD_LEVELS)
    .map((value) => clampInteger(value, 0, 8))
    .filter(Number.isFinite);
  const uniqueValues = [...new Set(values)];
  return uniqueValues.length ? uniqueValues.sort((a, b) => a - b) : [...DEFAULT_LOD_LEVELS];
}

function syntheticWorldTileBounds(worldMap = {}, key = {}) {
  const tilesPerAxis = tilesPerAxisForLod(worldMap, key.lodLevel);
  return {
    x: round(key.tileX / tilesPerAxis),
    y: round(key.tileY / tilesPerAxis),
    width: round(1 / tilesPerAxis),
    height: round(1 / tilesPerAxis)
  };
}

function tilesPerAxisForLod(worldMap = {}, lodLevel = 0) {
  const base = Math.max(2, Math.ceil(Math.max(Number(worldMap.virtualSize?.width ?? DEFAULT_VIRTUAL_WORLD_SIZE.width), Number(worldMap.virtualSize?.height ?? DEFAULT_VIRTUAL_WORLD_SIZE.height)) / Math.max(128, Number(worldMap.tileSize ?? DEFAULT_TILE_SIZE))));
  return Math.max(2, base * Math.max(1, 2 ** clampInteger(lodLevel, 0, 8)));
}

function viewportWorldBounds(viewport = {}) {
  const zoom = Math.max(0.75, Number(viewport.zoom ?? 1));
  const width = clamp01(1 / zoom);
  const height = clamp01(1 / zoom);
  const centerX = clamp01(0.5 - Number(viewport.panX ?? 0));
  const centerY = clamp01(0.5 - Number(viewport.panY ?? 0));
  return {
    x: round(clamp(centerX - width / 2, 0, 1 - width)),
    y: round(clamp(centerY - height / 2, 0, 1 - height)),
    width: round(width),
    height: round(height)
  };
}

function lodForZoom(zoom = 1) {
  const z = Number(zoom) || 1;
  if (z >= 4) return 3;
  if (z >= 2.2) return 2;
  if (z >= 1.25) return 1;
  return 0;
}

function tileMean(worldMap = {}, bounds = {}, layer = 'landOceanMask', gridSize = 8) {
  let sum = 0;
  let count = 0;
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      sum += sampleWorldMapLayer(worldMap, layer, bounds.x + ((x + 0.5) / gridSize) * bounds.width, bounds.y + ((y + 0.5) / gridSize) * bounds.height);
      count += 1;
    }
  }
  return count ? sum / count : 0;
}

function connectedComponentCount(flags = []) {
  const rows = flags.length;
  const columns = flags[0]?.length ?? 0;
  if (!rows || !columns) return 0;
  const visited = Array.from({ length: rows }, () => Array.from({ length: columns }, () => false));
  let count = 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (!flags[y]?.[x] || visited[y][x]) continue;
      count += 1;
      const stack = [[x, y]];
      visited[y][x] = true;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= columns || ny >= rows) continue;
          if (visited[ny][nx] || !flags[ny]?.[nx]) continue;
          visited[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }
    }
  }
  return count;
}

function normalizedLandOceanTransitions(flags = []) {
  const rows = flags.length;
  const columns = flags[0]?.length ?? 0;
  if (!rows || !columns) return 0;
  let transitions = 0;
  let edges = 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (x + 1 < columns) {
        edges += 1;
        if (Boolean(flags[y][x]) !== Boolean(flags[y][x + 1])) transitions += 1;
      }
      if (y + 1 < rows) {
        edges += 1;
        if (Boolean(flags[y][x]) !== Boolean(flags[y + 1][x])) transitions += 1;
      }
    }
  }
  return edges ? transitions / edges : 0;
}

function featureIntersectsBounds(feature = {}, bounds = {}) {
  const shape = feature.shape ?? {};
  const cx = Number(shape.center?.x ?? shape.x ?? feature.center?.x ?? feature.x ?? 0.5);
  const cy = Number(shape.center?.y ?? shape.y ?? feature.center?.y ?? feature.y ?? 0.5);
  const radius = Number(shape.radius ?? shape.rx ?? shape.ry ?? feature.radius ?? 0.04);
  return cx + radius >= bounds.x
    && cx - radius <= bounds.x + bounds.width
    && cy + radius >= bounds.y
    && cy - radius <= bounds.y + bounds.height;
}

function structuredVariation(x = 0, y = 0, seed = '', frequency = 2) {
  const token = String(canonicalJsonDigest({ seed })).replace(/^fnv1a32:/, '');
  const a = (parseInt(token.slice(0, 4), 16) || 1) / 65535;
  const b = (parseInt(token.slice(4, 8), 16) || 1) / 65535;
  const phaseA = a * Math.PI * 2;
  const phaseB = b * Math.PI * 2;
  const wave = Math.sin((x * frequency + a) * Math.PI * 2 + phaseA) * 0.55
    + Math.cos((y * (frequency * 0.72) + b) * Math.PI * 2 + phaseB) * 0.45
    + Math.sin(((x + y) * (frequency * 0.48) + a - b) * Math.PI * 2) * 0.28;
  return round(wave / 1.28);
}

function normalizeWindowBounds(input = DEFAULT_WINDOW_BOUNDS) {
  const width = clamp(Number(input.width ?? DEFAULT_WINDOW_BOUNDS.width), 0.08, 0.78);
  const height = clamp(Number(input.height ?? DEFAULT_WINDOW_BOUNDS.height), 0.08, 0.78);
  const x = clamp(Number(input.x ?? DEFAULT_WINDOW_BOUNDS.x), 0, 1 - width);
  const y = clamp(Number(input.y ?? DEFAULT_WINDOW_BOUNDS.y), 0, 1 - height);
  return { x: round(x), y: round(y), width: round(width), height: round(height) };
}

function styleToAtlasPreset(styleId) {
  return syntheticWorldStyleById(styleId).atlasPreset;
}

function atlasPresetForMixedRandom(seed = '') {
  const choices = SYNTHETIC_WORLD_STYLES.filter((entry) => entry.id !== 'mixedRandom').map((entry) => entry.atlasPreset);
  const hash = String(canonicalJsonDigest({ seed })).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return choices[hash % choices.length] ?? 'mixedRegionalWorld';
}

function cloneGrid(grid = []) {
  return (Array.isArray(grid) ? grid : []).map((row) => (Array.isArray(row) ? row : []).map((value) => round(value)));
}

function combineLayerRows(template = [], compute) {
  return template.map((row, y) => row.map((_value, x) => compute(x, y)));
}

function valueAt(grid = [], x = 0, y = 0) {
  return Number(grid[y]?.[x] ?? 0);
}

function meanGrid(grid = []) {
  const finite = grid.flat().map(Number).filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
}

function withDigest(base = {}, key = 'digest') {
  const { [key]: _ignored, ...payload } = base;
  return {
    ...payload,
    [key]: canonicalJsonDigest(payload)
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

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function clampInteger(value, min, max) {
  return Math.round(clamp(value, min, max));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function round(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000000) / 1000000 : 0;
}

function labelize(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
