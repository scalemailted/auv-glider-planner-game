import { createSeededRng, seededUnit } from '../random/SeededRng.js';
import { createBathymetryConfig, validateBathymetryConfig } from './BathymetrySchema.js';

export const BATHYMETRY_FIELD_MODEL_VERSION = 'bathymetry-field-model-env-r1';

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
      notA: config.notA.slice()
    };
    bathymetry.stats = bathymetryFieldStats(bathymetry);
    bathymetry.featureSummary = bathymetryFeatureSummary(bathymetry);
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
    notA: config.notA.slice()
  };
  bathymetry.depthAccessibility = createDepthAccessibilityField(bathymetry, options);
  bathymetry.hazardField = createBathymetryHazardField(bathymetry, options);
  bathymetry.stats = bathymetryFieldStats(bathymetry);
  bathymetry.featureSummary = bathymetryFeatureSummary(bathymetry);
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
