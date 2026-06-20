import { createSeededRng, seededUnit } from '../random/SeededRng.js';
import { createBathymetryConfig, validateBathymetryConfig } from './BathymetrySchema.js';
import { createBathymetrySourceMetadata } from './BathymetrySourceMetadata.js';

export const BATHYMETRY_FIELD_MODEL_VERSION = 'bathymetry-field-model-gfx-r2';

export function createBathymetryField(options = {}) {
  if (options.depthMeters && Array.isArray(options.depthMeters)) {
    const config = createBathymetryConfig({
      ...options,
      width: options.width ?? options.depthMeters[0]?.length,
      height: options.height ?? options.depthMeters.length
    });
    const depthMeters = normalizeDepthGrid(options.depthMeters, config.width, config.height);
    const bathymetry = {
      type: 'anchor.science.bathymetry-field',
      version: BATHYMETRY_FIELD_MODEL_VERSION,
      seed: String(options.seed ?? 'provided'),
      config,
      width: config.width,
      height: config.height,
      depthMeters,
      landSeaMask: options.landSeaMask ?? createLandSeaMaskFromDepth(depthMeters),
      featureIds: config.features.map((feature) => feature.id),
      publicSafe: true,
      synthetic: options.synthetic !== false,
      calibratedSurveyData: false,
      calibrated: false,
      operationallyValidated: false,
      sourceMetadata: createBathymetrySourceMetadata({ sourceId: options.seed ?? 'provided-bathymetry', synthetic: options.synthetic !== false }),
      notA: config.notA.slice()
    };
    bathymetry.stats = bathymetryFieldStats(bathymetry);
    bathymetry.featureSummary = bathymetryFeatureSummary(bathymetry);
    bathymetry.terrainFeatures = terrainFeatureMetadata(bathymetry);
    return bathymetry;
  }
  return createSyntheticBathymetryField(options);
}

export function createSyntheticBathymetryField(options = {}) {
  const config = createBathymetryConfig(options);
  const rng = createSeededRng(options.seed ?? 'bathymetry-env-r1');
  const depthMeters = [];
  const featureIds = new Set(config.features.filter((feature) => feature.enabled !== false).map((feature) => feature.id));
  for (let y = 0; y < config.height; y += 1) {
    const row = [];
    const ny = config.height <= 1 ? 0 : y / (config.height - 1);
    for (let x = 0; x < config.width; x += 1) {
      const nx = config.width <= 1 ? 0 : x / (config.width - 1);
      const coast = coastDepth(nx, ny, config);
      const shelf = 18 + 82 * smoothstep(0.16, 0.52, nx);
      const basin = 80 + 0.55 * config.maxDepthMeters * smoothstep(0.4, 0.92, nx);
      let depth = Math.max(coast, Math.min(config.maxDepthMeters, shelf + basin * 0.45));
      if (featureIds.has('shelfBreak')) depth += 34 * ridgeShape(nx, 0.5, 0.055);
      if (featureIds.has('submarineCanyon') || featureIds.has('trench')) {
        const canyonCenter = 0.56 + 0.12 * Math.sin(ny * Math.PI * 2.2);
        const canyon = Math.exp(-((nx - canyonCenter) ** 2) / 0.004) * Math.exp(-((ny - 0.56) ** 2) / 0.2);
        depth += (featureIds.has('trench') ? 72 : 48) * canyon;
      }
      if (featureIds.has('seamount')) {
        const mount = Math.exp(-(((nx - 0.74) ** 2) / 0.018 + ((ny - 0.34) ** 2) / 0.034));
        depth -= 46 * mount;
      }
      if (featureIds.has('ridge')) {
        depth -= 24 * Math.exp(-((ny - 0.72) ** 2) / 0.018) * smoothstep(0.38, 0.76, nx);
      }
      if (featureIds.has('riverMouth') || featureIds.has('estuaryChannel')) {
        const river = Math.exp(-(((nx - 0.12) ** 2) / 0.01 + ((ny - 0.62) ** 2) / 0.018));
        depth = Math.max(depth, 7 + 22 * river);
      }
      const noise = (rng() - 0.5) * 2.2 + (seededUnit(`${options.seed ?? 'bathymetry'}:${x}:${y}`) - 0.5) * 1.8;
      if (nx < coastlineX(ny, config)) depth = 0;
      else depth = clamp(depth + noise, config.minDepthMeters, config.maxDepthMeters);
      row.push(round(depth));
    }
    depthMeters.push(row);
  }
  const bathymetry = {
    type: 'anchor.science.bathymetry-field',
    version: BATHYMETRY_FIELD_MODEL_VERSION,
    seed: String(options.seed ?? 'bathymetry-env-r1'),
    config,
    width: config.width,
    height: config.height,
    depthMeters,
    landSeaMask: createLandSeaMaskFromDepth(depthMeters),
    featureIds: [...featureIds],
    publicSafe: true,
    synthetic: true,
    calibratedSurveyData: false,
    calibrated: false,
    operationallyValidated: false,
    sourceMetadata: createBathymetrySourceMetadata({ sourceId: options.seed ?? 'bathymetry-env-r1', seed: options.seed ?? 'bathymetry-env-r1', synthetic: true }),
    notA: config.notA.slice()
  };
  bathymetry.depthAccessibility = createDepthAccessibilityField(bathymetry, options);
  bathymetry.hazardField = createBathymetryHazardField(bathymetry, options);
  bathymetry.stats = bathymetryFieldStats(bathymetry);
  bathymetry.featureSummary = bathymetryFeatureSummary(bathymetry);
  bathymetry.terrainFeatures = terrainFeatureMetadata(bathymetry);
  return bathymetry;
}

export function createLandSeaMaskFromBathymetry(bathymetry, options = {}) {
  const threshold = finiteNumber(options.landDepthThresholdMeters, 0);
  const depth = bathymetry?.depthMeters ?? [];
  return depth.map((row) => row.map((value) => Number(value) <= threshold ? 'land' : 'water'));
}

export function createDepthAccessibilityField(bathymetry, options = {}) {
  const minimumDepth = finiteNumber(options.minimumNavigableDepthMeters, 6);
  return (bathymetry?.depthMeters ?? []).map((row) => row.map((depth) => Number(depth) >= minimumDepth ? 1 : 0));
}

export function createBathymetryHazardField(bathymetry, options = {}) {
  const slope = bathymetrySlopeField(bathymetry);
  const bottomDepthLimit = finiteNumber(options.shallowHazardDepthMeters, 10);
  return (bathymetry?.depthMeters ?? []).map((row, y) => row.map((depth, x) => {
    if (Number(depth) <= 0) return 1;
    const shallow = Number(depth) < bottomDepthLimit ? 0.6 : 0;
    return round(clamp(shallow + Number(slope[y]?.[x] ?? 0) / 28, 0, 1));
  }));
}

export function bathymetryFieldStats(bathymetry) {
  const values = flattenDepths(bathymetry?.depthMeters).filter((value) => value > 0);
  const all = flattenDepths(bathymetry?.depthMeters);
  const landCells = all.filter((value) => value <= 0).length;
  return {
    type: 'anchor.science.bathymetry-field-stats',
    width: bathymetry?.width ?? bathymetry?.depthMeters?.[0]?.length ?? 0,
    height: bathymetry?.height ?? bathymetry?.depthMeters?.length ?? 0,
    minDepthMeters: values.length ? round(Math.min(...values)) : 0,
    maxDepthMeters: values.length ? round(Math.max(...values)) : 0,
    meanDepthMeters: values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
    waterCellCount: values.length,
    landCellCount: landCells,
    finite: all.every(Number.isFinite)
  };
}

export function bathymetryGradientField(bathymetry) {
  const depth = bathymetry?.depthMeters ?? [];
  return depth.map((row, y) => row.map((_value, x) => {
    const dx = sampleNearest(depth, x + 1, y) - sampleNearest(depth, x - 1, y);
    const dy = sampleNearest(depth, x, y + 1) - sampleNearest(depth, x, y - 1);
    return { dx: round(dx / 2), dy: round(dy / 2), magnitude: round(Math.sqrt(dx * dx + dy * dy) / 2) };
  }));
}

export function bathymetrySlopeField(bathymetry) {
  return bathymetryGradientField(bathymetry).map((row) => row.map((cell) => round(cell.magnitude)));
}

export function bathymetryFeatureSummary(bathymetry, options = {}) {
  const stats = bathymetryFieldStats(bathymetry);
  const slope = bathymetrySlopeField(bathymetry);
  const slopeValues = slope.flat().map(Number).filter(Number.isFinite);
  const steepCells = slopeValues.filter((value) => value >= finiteNumber(options.steepSlopeThreshold, 12)).length;
  return {
    type: 'anchor.science.bathymetry-feature-summary',
    version: BATHYMETRY_FIELD_MODEL_VERSION,
    featureIds: bathymetry?.featureIds ?? bathymetry?.config?.features?.map((feature) => feature.id) ?? [],
    depthRange: { minDepthMeters: stats.minDepthMeters, maxDepthMeters: stats.maxDepthMeters },
    landWaterMaskSummary: { landCellCount: stats.landCellCount, waterCellCount: stats.waterCellCount },
    shelfSummary: { shallowCellCount: flattenDepths(bathymetry?.depthMeters).filter((value) => value > 0 && value <= 60).length },
    canyonSummary: { steepCellCount: steepCells },
    deepBasinSummary: { deepCellCount: flattenDepths(bathymetry?.depthMeters).filter((value) => value >= stats.maxDepthMeters * 0.72).length },
    publicSafe: true,
    calibratedSurveyData: false
  };
}

export function sampleBathymetryAt(bathymetry, x, y) {
  const depth = bathymetry?.depthMeters ?? [];
  if (!depth.length || !depth[0]?.length) return 0;
  const x0 = clamp(Math.floor(Number(x) || 0), 0, depth[0].length - 1);
  const y0 = clamp(Math.floor(Number(y) || 0), 0, depth.length - 1);
  const x1 = clamp(x0 + 1, 0, depth[0].length - 1);
  const y1 = clamp(y0 + 1, 0, depth.length - 1);
  const tx = clamp((Number(x) || 0) - x0, 0, 1);
  const ty = clamp((Number(y) || 0) - y0, 0, 1);
  const a = lerp(depth[y0][x0], depth[y0][x1], tx);
  const b = lerp(depth[y1][x0], depth[y1][x1], tx);
  return round(lerp(a, b, ty));
}

export function createCoastalOperationalBathymetry(options = {}) {
  return createScenarioBathymetry({ ...options, scenarioId: 'coastalShelf', featureIds: ['landCoast', 'continentalShelf', 'shelfBreak', 'deepBasin', 'submarineCanyon', 'seamount', 'riverMouth', 'bottomHazards'] });
}

export function createIslandArcBathymetry(options = {}) {
  return createScenarioBathymetry({ ...options, scenarioId: 'islandArc', featureIds: ['landCoast', 'continentalShelf', 'deepBasin', 'islandArc', 'submarineRidge', 'seamount', 'bottomHazards'] });
}

export function createShelfCanyonBathymetry(options = {}) {
  return createScenarioBathymetry({ ...options, scenarioId: 'shelfCanyon', featureIds: ['landCoast', 'continentalShelf', 'shelfBreak', 'submarineCanyon', 'deepBasin', 'riverMouth', 'bottomHazards'] });
}

export function createBasinSeamountBathymetry(options = {}) {
  return createScenarioBathymetry({ ...options, scenarioId: 'basinSeamount', featureIds: ['landCoast', 'continentalShelf', 'deepBasin', 'seamount', 'submarineRidge', 'bottomHazards'] });
}

export function bathymetryToTerrainMeshData(bathymetry, options = {}) {
  const depth = bathymetry?.depthMeters ?? [];
  const height = depth.length;
  const width = depth[0]?.length ?? 0;
  const verticalExaggeration = finiteNumber(options.verticalExaggeration, bathymetry?.config?.verticalExaggeration ?? 1.5);
  const horizontalScale = finiteNumber(options.horizontalScale, 1);
  const depthScale = finiteNumber(options.depthScale, 0.055);
  const vertices = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const landMask = booleanLandMask(bathymetry);
  const maxDepth = Math.max(1, bathymetryFieldStats(bathymetry).maxDepthMeters);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const d = Number(depth[y]?.[x] ?? 0);
      const isLand = landMask[y]?.[x] === true;
      const worldX = (x - (width - 1) / 2) * horizontalScale;
      const worldZ = (y - (height - 1) / 2) * horizontalScale;
      const worldY = isLand ? 1.8 + terrainNoise(x, y, bathymetry.seed) * 0.7 : -d * depthScale * verticalExaggeration;
      vertices.push(round(worldX), round(worldY), round(worldZ));
      const color = terrainColor(d, maxDepth, isLand);
      colors.push(color[0], color[1], color[2]);
      uvs.push(width <= 1 ? 0 : x / (width - 1), height <= 1 ? 0 : y / (height - 1));
    }
  }
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const a = y * width + x;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return {
    type: 'anchor.science.bathymetry-terrain-mesh-data',
    version: BATHYMETRY_FIELD_MODEL_VERSION,
    width,
    height,
    verticalExaggeration,
    horizontalScale,
    depthScale,
    vertices,
    colors,
    uvs,
    indices,
    vertexCount: vertices.length / 3,
    triangleCount: indices.length / 3,
    landMask,
    coastlineEdges: extractCoastlineEdges(landMask),
    depthRange: bathymetryFeatureSummary(bathymetry).depthRange,
    publicSafe: true,
    calibratedSurveyData: false,
    containsHiddenTruth: false
  };
}

export function extractCoastlineEdges(landMaskInput, options = {}) {
  const landMask = normalizeLandMaskInput(landMaskInput);
  const height = landMask.length;
  const width = landMask[0]?.length ?? 0;
  const edges = [];
  const scale = finiteNumber(options.horizontalScale, 1);
  const offsetX = (width - 1) / 2;
  const offsetY = (height - 1) / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isLand = landMask[y]?.[x] === true;
      if (x < width - 1 && isLand !== (landMask[y]?.[x + 1] === true)) {
        edges.push(coastEdge(x + 0.5, y - 0.5, x + 0.5, y + 0.5, offsetX, offsetY, scale));
      }
      if (y < height - 1 && isLand !== (landMask[y + 1]?.[x] === true)) {
        edges.push(coastEdge(x - 0.5, y + 0.5, x + 0.5, y + 0.5, offsetX, offsetY, scale));
      }
    }
  }
  return edges.map((edge, index) => ({ id: `coastline-edge-${index + 1}`, ...edge }));
}

function createScenarioBathymetry(options = {}) {
  const scenarioId = options.scenarioId ?? 'coastalShelf';
  const featureIds = options.featureIds ?? ['landCoast', 'continentalShelf', 'shelfBreak', 'deepBasin', 'submarineCanyon', 'seamount', 'bottomHazards'];
  const config = createBathymetryConfig({
    ...options,
    width: options.width ?? 56,
    height: options.height ?? 36,
    maxDepthMeters: options.maxDepthMeters ?? 260,
    features: featureIds
  });
  const seed = String(options.seed ?? `bathymetry-${scenarioId}`);
  const depthMeters = [];
  const landMask = [];
  for (let y = 0; y < config.height; y += 1) {
    const row = [];
    const landRow = [];
    const ny = config.height <= 1 ? 0 : y / (config.height - 1);
    for (let x = 0; x < config.width; x += 1) {
      const nx = config.width <= 1 ? 0 : x / (config.width - 1);
      const cell = scenarioDepthCell(nx, ny, scenarioId, config, seed, x, y);
      row.push(round(cell.depthMeters));
      landRow.push(cell.land);
    }
    depthMeters.push(row);
    landMask.push(landRow);
  }
  const bathymetry = createBathymetryField({ ...options, seed, width: config.width, height: config.height, maxDepthMeters: config.maxDepthMeters, features: featureIds, depthMeters, synthetic: true });
  bathymetry.version = 'bathymetry-field-model-gfx-r2';
  bathymetry.scenarioId = scenarioId;
  bathymetry.landMask = landMask;
  bathymetry.landSeaMask = landMask.map((row) => row.map((cell) => cell ? 'land' : 'water'));
  bathymetry.depthAccessibility = createDepthAccessibilityField(bathymetry, options);
  bathymetry.hazardField = createBathymetryHazardField(bathymetry, options);
  bathymetry.bottomHazardZones = extractBottomHazardZones(bathymetry, { maxZones: options.maxHazardZones ?? 18 });
  bathymetry.coastlineEdges = extractCoastlineEdges(landMask);
  bathymetry.featureIds = featureIds.slice();
  bathymetry.featureSummary = bathymetryFeatureSummary(bathymetry);
  bathymetry.stats = bathymetryFieldStats(bathymetry);
  bathymetry.synthetic = true;
  bathymetry.publicSafe = true;
  bathymetry.calibratedSurveyData = false;
  bathymetry.calibrated = false;
  bathymetry.operationallyValidated = false;
  bathymetry.sourceMetadata = createBathymetrySourceMetadata({ sourceId: seed, seed, label: "Synthetic  bathymetry", synthetic: true });
  bathymetry.containsHiddenTruth = false;
  bathymetry.terrainFeatures = terrainFeatureMetadata(bathymetry);
  return bathymetry;
}

function scenarioDepthCell(nx, ny, scenarioId, config, seed, x, y) {
  const coast = scenarioCoastlineX(ny, scenarioId);
  const islandInfluence = islandArcLandInfluence(nx, ny, scenarioId);
  const land = nx < coast || islandInfluence.land;
  if (land) return { depthMeters: 0, land: true };
  const offshore = clamp((nx - coast) / Math.max(0.02, 1 - coast), 0, 1);
  const shelf = 10 + 64 * smoothstep(0.02, 0.34, offshore);
  const shelfBreak = 58 * ridgeShape(offshore, 0.42, 0.055);
  const basin = 58 + config.maxDepthMeters * 0.72 * smoothstep(0.34, 0.96, offshore);
  let depth = shelf + basin * 0.54 + shelfBreak;
  if (scenarioId === 'shelfCanyon' || scenarioId === 'coastalShelf') {
    const canyonAxis = coast + 0.18 + 0.2 * ny + 0.035 * Math.sin(ny * Math.PI * 4.2);
    const canyon = Math.exp(-((nx - canyonAxis) ** 2) / 0.0028) * smoothstep(0.1, 0.86, offshore);
    depth += 92 * canyon;
  }
  if (scenarioId === 'islandArc') {
    depth += 32 * Math.sin(ny * Math.PI * 5.5) * smoothstep(0.35, 0.82, offshore);
    depth -= 72 * islandInfluence.seamount;
    depth -= 28 * Math.exp(-((ny - 0.63) ** 2) / 0.012) * smoothstep(0.36, 0.72, nx);
  }
  if (scenarioId === 'basinSeamount') {
    depth += 54 * smoothstep(0.48, 0.9, nx);
    depth -= 112 * Math.exp(-(((nx - 0.72) ** 2) / 0.012 + ((ny - 0.42) ** 2) / 0.02));
    depth -= 42 * Math.exp(-((ny - 0.68) ** 2) / 0.01) * smoothstep(0.46, 0.85, nx);
  } else {
    depth -= 62 * Math.exp(-(((nx - 0.76) ** 2) / 0.014 + ((ny - 0.3) ** 2) / 0.025));
  }
  const estuary = Math.exp(-(((nx - coast - 0.025) ** 2) / 0.006 + ((ny - 0.62) ** 2) / 0.016));
  if (scenarioId !== 'basinSeamount') depth = Math.max(depth, 8 + 24 * estuary);
  const roughness = (seededUnit(`${seed}:rough:${x}:${y}`) - 0.5) * 5.6 + terrainNoise(x, y, seed) * 2.4;
  return { depthMeters: clamp(depth + roughness, config.minDepthMeters, config.maxDepthMeters), land: false };
}

function scenarioCoastlineX(ny, scenarioId) {
  const bay = scenarioId === 'shelfCanyon' || scenarioId === 'coastalShelf' ? 0.07 * Math.exp(-((ny - 0.6) ** 2) / 0.028) : 0.025 * Math.exp(-((ny - 0.28) ** 2) / 0.02);
  const headland = scenarioId === 'basinSeamount' ? 0.035 * Math.exp(-((ny - 0.18) ** 2) / 0.016) : 0;
  return clamp(0.1 + 0.045 * Math.sin(ny * Math.PI * 2.7 + 0.45) + bay + headland, 0.03, 0.27);
}

function islandArcLandInfluence(nx, ny, scenarioId) {
  if (scenarioId !== 'islandArc') return { land: false, seamount: 0 };
  const islands = [
    { x: 0.52, y: 0.24, rx: 0.045, ry: 0.072 },
    { x: 0.6, y: 0.42, rx: 0.036, ry: 0.06 },
    { x: 0.68, y: 0.61, rx: 0.032, ry: 0.052 }
  ];
  let seamount = 0;
  for (const island of islands) {
    const d = ((nx - island.x) ** 2) / (island.rx ** 2) + ((ny - island.y) ** 2) / (island.ry ** 2);
    if (d <= 1) return { land: true, seamount: 1 };
    seamount = Math.max(seamount, Math.exp(-d * 0.62));
  }
  return { land: false, seamount };
}

function extractBottomHazardZones(bathymetry, options = {}) {
  const hazard = bathymetry?.hazardField ?? createBathymetryHazardField(bathymetry);
  const zones = [];
  for (let y = 0; y < hazard.length; y += 1) {
    for (let x = 0; x < (hazard[y]?.length ?? 0); x += 1) {
      const value = Number(hazard[y][x]);
      if (value >= 0.58) zones.push({ id: `bottom-hazard-${x}-${y}`, x, y, value: round(value), kind: value >= 0.95 ? 'land-or-grounding' : 'steep-or-shallow-bottom' });
    }
  }
  return zones.sort((a, b) => b.value - a.value).slice(0, Math.max(0, Number(options.maxZones ?? 18) || 18));
}

function terrainFeatureMetadata(bathymetry) {
  const width = Number(bathymetry?.width ?? bathymetry?.depthMeters?.[0]?.length ?? 0);
  const height = Number(bathymetry?.height ?? bathymetry?.depthMeters?.length ?? 0);
  const stats = bathymetryFieldStats(bathymetry);
  const ids = new Set(bathymetry?.featureIds ?? []);
  const features = [
    feature('land-coast', 'landCoast', 'Land / Coastline', 0.08, 0.5, 0, 0, 'along-coast'),
    feature('continental-shelf', 'continentalShelf', 'Continental Shelf', 0.34, 0.5, stats.minDepthMeters, Math.min(90, stats.maxDepthMeters), 'along-coast'),
    feature('shelf-break', 'shelfBreak', 'Shelf Break', 0.52, 0.5, 45, Math.min(165, stats.maxDepthMeters), 'along-coast'),
    feature('continental-slope', 'continentalSlope', 'Continental Slope', 0.62, 0.5, 80, Math.min(220, stats.maxDepthMeters), 'offshore'),
    feature('deep-basin', 'deepBasin', 'Deep Basin', 0.82, 0.54, Math.max(90, stats.maxDepthMeters * 0.55), stats.maxDepthMeters, 'offshore')
  ];
  if (ids.has('submarineCanyon') || ids.has('trench')) features.push(feature('submarine-canyon', ids.has('trench') ? 'trench' : 'submarineCanyon', ids.has('trench') ? 'Synthetic Trench' : 'Submarine Canyon', 0.58, 0.58, 70, stats.maxDepthMeters, 'cross-shelf'));
  if (ids.has('seamount')) features.push(feature('seamount', 'seamount', 'Seamount / Island Base', 0.74, 0.34, Math.max(15, stats.minDepthMeters), Math.max(120, stats.maxDepthMeters * 0.75), 'local-rise'));
  if (ids.has('ridge') || ids.has('submarineRidge')) features.push(feature('ridge', 'ridge', 'Submarine Ridge', 0.68, 0.7, 30, Math.max(120, stats.maxDepthMeters * 0.8), 'along-basin'));
  if (ids.has('bottomHazards')) features.push(feature('bottom-hazards', 'shallowBank', 'Local Bottom Hazards', 0.42, 0.62, stats.minDepthMeters, Math.min(60, stats.maxDepthMeters), 'local'));
  return features.map((entry) => ({
    ...entry,
    center: { x: round(entry.center.x * Math.max(0, width - 1)), y: round(entry.center.y * Math.max(0, height - 1)) },
    bounds: {
      minX: round(Math.max(0, entry.center.x * width - width * 0.12)),
      maxX: round(Math.min(width, entry.center.x * width + width * 0.16)),
      minY: round(Math.max(0, entry.center.y * height - height * 0.18)),
      maxY: round(Math.min(height, entry.center.y * height + height * 0.18))
    },
    canonical: true,
    synthetic: true,
    warnings: []
  }));
}

function feature(id, type, label, cx, cy, minimumDepth, maximumDepth, orientation) {
  return {
    id: `terrain-feature-${id}`,
    type,
    label,
    center: { x: cx, y: cy },
    minimumDepth: round(minimumDepth),
    maximumDepth: round(maximumDepth),
    orientation,
    scale: 1
  };
}
function booleanLandMask(bathymetry) {
  if (Array.isArray(bathymetry?.landMask)) return normalizeLandMaskInput(bathymetry.landMask);
  return normalizeLandMaskInput(bathymetry?.landSeaMask ?? createLandSeaMaskFromBathymetry(bathymetry));
}

function normalizeLandMaskInput(input = []) {
  return (Array.isArray(input) ? input : []).map((row) => (Array.isArray(row) ? row : []).map((value) => {
    if (value === true || value === 'land') return true;
    if (value === false || value === 'water') return false;
    const number = Number(value);
    return Number.isFinite(number) ? number <= 0 : false;
  }));
}

function coastEdge(x1, y1, x2, y2, offsetX, offsetY, scale) {
  return {
    start: { x: round((x1 - offsetX) * scale), y: 0.18, z: round((y1 - offsetY) * scale) },
    end: { x: round((x2 - offsetX) * scale), y: 0.18, z: round((y2 - offsetY) * scale) },
    publicSafe: true
  };
}

function terrainColor(depth, maxDepth, isLand) {
  if (isLand) return [0.32, 0.38, 0.24];
  const t = clamp(Number(depth) / Math.max(1, maxDepth), 0, 1);
  if (t < 0.2) return [0.18, 0.58, 0.58];
  if (t < 0.42) return [0.1, 0.38, 0.58];
  if (t < 0.72) return [0.05, 0.18, 0.4];
  return [0.025, 0.065, 0.18];
}

function terrainNoise(x, y, seed) {
  return (seededUnit(`${seed}:terrain:${Math.floor(x / 2)}:${Math.floor(y / 2)}`) - 0.5)
    + (seededUnit(`${seed}:terrain-hi:${x}:${y}`) - 0.5) * 0.55;
}
export function validateBathymetryField(bathymetry, configInput = bathymetry?.config ?? {}) {
  const errors = [];
  const warnings = [];
  const configValidation = validateBathymetryConfig(configInput);
  if (!configValidation.valid) errors.push(...configValidation.errors.map((entry) => `config: ${entry}`));
  if (bathymetry?.type !== 'anchor.science.bathymetry-field') errors.push(`Expected type anchor.science.bathymetry-field, got ${bathymetry?.type ?? 'missing'}.`);
  if (!Array.isArray(bathymetry?.depthMeters) || !bathymetry.depthMeters.length) errors.push('depthMeters grid is required.');
  const width = bathymetry?.width ?? bathymetry?.depthMeters?.[0]?.length ?? 0;
  const height = bathymetry?.height ?? bathymetry?.depthMeters?.length ?? 0;
  if (width !== configValidation.config.width) warnings.push('Bathymetry field width differs from config width.');
  if (height !== configValidation.config.height) warnings.push('Bathymetry field height differs from config height.');
  const values = flattenDepths(bathymetry?.depthMeters);
  if (!values.length || !values.every(Number.isFinite)) errors.push('All bathymetry depth cells must be finite numbers.');
  if (bathymetry?.calibratedSurveyData === true) errors.push('ENV-R1 bathymetry must not claim calibrated survey data.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

function normalizeDepthGrid(grid, width, height) {
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => round(Math.max(0, finiteNumber(grid[y]?.[x], 0)))));
}

function createLandSeaMaskFromDepth(depthMeters) {
  return depthMeters.map((row) => row.map((depth) => Number(depth) <= 0 ? 'land' : 'water'));
}

function coastDepth(nx, ny, config) {
  const coast = coastlineX(ny, config);
  if (nx < coast) return 0;
  return 4 + 60 * smoothstep(coast, 0.32, nx);
}

function coastlineX(ny, config) {
  const bay = config.coastlineMode === 'coastal-bay' ? 0.06 * Math.exp(-((ny - 0.55) ** 2) / 0.03) : 0;
  return clamp(0.08 + 0.03 * Math.sin(ny * Math.PI * 3) + bay, 0.02, 0.24);
}

function ridgeShape(value, center, width) {
  return Math.exp(-((value - center) ** 2) / (2 * width * width));
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function sampleNearest(grid, x, y) {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (!height || !width) return 0;
  return Number(grid[clamp(Math.round(y), 0, height - 1)]?.[clamp(Math.round(x), 0, width - 1)] ?? 0);
}

function flattenDepths(grid = []) {
  return (Array.isArray(grid) ? grid : []).flat().map(Number).filter(Number.isFinite);
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return Number(a) + (Number(b) - Number(a)) * t;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}
