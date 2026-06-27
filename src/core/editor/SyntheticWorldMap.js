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

const DEFAULT_WORLD_RESOLUTION = Object.freeze({ columns: 160, rows: 90 });
const DEFAULT_WINDOW_BOUNDS = Object.freeze({ x: 0.22, y: 0.2, width: 0.34, height: 0.34 });
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
  const atlasPreset = style.id === 'mixedRandom'
    ? atlasPresetForMixedRandom(seed)
    : style.atlasPreset;
  const sourceAtlas = createSyntheticOceanAtlas({
    presetId: atlasPreset,
    seed,
    resolution
  });
  const layers = transformAtlasLayersToWorldLayers(sourceAtlas);
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
    resolution,
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
      topologySource: 'structured distance fields, seeded feature primitives, coast transforms, shelf/basin fields, and controlled roughness',
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
    resolution: worldMap.resolution,
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
