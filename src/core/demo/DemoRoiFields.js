import { generateROI, createHotspots } from '../generation/ROIFieldGenerator.js';
import { createSeededRng } from '../random/SeededRng.js';
import {
  SAMPLE_SPATIAL_PATTERNS,
  SAMPLE_TEMPORAL_BEHAVIORS,
  normalizeSampleFieldConfig,
  sampleSpatialPatternLabel,
  sampleTemporalBehaviorLabel
} from '../generation/SampleFieldConfig.js';

export const ROI_DEMO_GRID = { width: 24, height: 16 };
export const ROI_DEMO_DISTRIBUTIONS = [
  'uniformRandom',
  'gaussianHotspots',
  'clusteredHotspots',
  'gradientFront',
  'sparseTargets',
  'ridgeCorridor',
  'bimodalHotspots',
  'movingHotspot',
  'burstyBloom',
  'currentAdvectedPlume',
  'nonuniformRandom'
];
export const ROI_DEMO_TIME_MODES = ['static', 'dynamic'];
export const ROI_DEMO_SPATIAL_PATTERNS = SAMPLE_SPATIAL_PATTERNS;
export const ROI_DEMO_TEMPORAL_BEHAVIORS = SAMPLE_TEMPORAL_BEHAVIORS;

export function normalizeRoiDemoDistribution(value = 'gaussianHotspots') {
  return ROI_DEMO_DISTRIBUTIONS.includes(value) ? value : 'gaussianHotspots';
}

export function normalizeRoiDemoTimeMode(value = 'static') {
  return ROI_DEMO_TIME_MODES.includes(value) ? value : 'static';
}

export function createDemoRoiField({
  distribution = 'gaussianHotspots',
  seed = 'anchor-roi-demo',
  hotspotCount = 4,
  noise = 0.15,
  timeMode = 'static',
  spatialPattern = null,
  temporalBehavior = null,
  forecastView = 'forecast',
  time = 0,
  demoTime = null,
  grid = ROI_DEMO_GRID
} = {}) {
  const width = Math.max(1, Number(grid.width ?? ROI_DEMO_GRID.width));
  const height = Math.max(1, Number(grid.height ?? ROI_DEMO_GRID.height));
  const normalizedDistribution = normalizeRoiDemoDistribution(distribution);
  const normalizedTimeMode = normalizeRoiDemoTimeMode(timeMode);
  const sourceTime = demoTime ?? time;
  const t = normalizedTimeMode === 'dynamic' ? Number(sourceTime) || 0 : 0;
  const rng = createSeededRng(`${seed}:${normalizedDistribution}:${width}x${height}:${hotspotCount}:${noise}`);
  const field = buildDistribution({
    distribution: normalizedDistribution,
    rng,
    seed,
    width,
    height,
    hotspotCount: Math.max(1, Math.min(8, Math.round(Number(hotspotCount) || 4))),
    noise: clamp01(noise),
    timeMode: normalizedTimeMode,
    spatialPattern,
    temporalBehavior,
    forecastView,
    time: t
  });
  const stats = summarizeField(field);
  return {
    field,
    width,
    height,
    distribution: normalizedDistribution,
    distributionLabel: roiDistributionLabel(normalizedDistribution),
    timeMode: normalizedTimeMode,
    spatialPattern: normalizeRoiDemoSpatialPattern(spatialPattern ?? distributionToSampleConfig(normalizedDistribution).spatialPattern),
    temporalBehavior: normalizeRoiDemoTemporalBehavior(temporalBehavior ?? distributionToSampleConfig(normalizedDistribution).temporalBehavior),
    forecastView,
    time: t,
    sampleFieldConfig: sampleFieldConfigForDemo({
      distribution: normalizedDistribution,
      timeMode: normalizedTimeMode,
      spatialPattern,
      temporalBehavior,
      hotspotCount
    }),
    stats,
    highValueCells: findHighValueCells(field, Math.max(0.68, stats.mean + stats.stdDev * 1.35))
  };
}

export function roiDistributionLabel(value) {
  return {
    uniformRandom: 'Uniform Random',
    gaussianHotspots: 'Gaussian Hotspots',
    clusteredHotspots: 'Clustered Hotspots',
    gradientFront: 'Gradient / Front',
    sparseTargets: 'Sparse Targets',
    ridgeCorridor: 'Ridge / Corridor',
    bimodalHotspots: 'Bimodal Hotspots',
    movingHotspot: 'Moving Hotspot',
    burstyBloom: 'Bursty Bloom',
    currentAdvectedPlume: 'Current-Advected Plume',
    nonuniformRandom: 'Nonuniform Random'
  }[value] ?? 'Gaussian Hotspots';
}

export function normalizeRoiDemoSpatialPattern(value = 'multiHotspot') {
  return ROI_DEMO_SPATIAL_PATTERNS.includes(value) ? value : 'multiHotspot';
}

export function normalizeRoiDemoTemporalBehavior(value = 'static') {
  return ROI_DEMO_TEMPORAL_BEHAVIORS.includes(value) ? value : 'static';
}

export function roiDemoDistributionDefaults(distribution = 'gaussianHotspots') {
  const defaults = distributionToSampleConfig(normalizeRoiDemoDistribution(distribution));
  return {
    spatialPattern: defaults.spatialPattern,
    temporalBehavior: defaults.temporalBehavior,
    distribution: defaults.distribution
  };
}

export { sampleSpatialPatternLabel, sampleTemporalBehaviorLabel };

function buildDistribution({ distribution, rng, seed, width, height, hotspotCount, noise, timeMode, spatialPattern, temporalBehavior, forecastView, time }) {
  if (distribution === 'uniformRandom') return withNoise(createUniformRandom(width, height, rng), rng, noise * 0.35);
  if (distribution === 'clusteredHotspots') {
    return withNoise(generateROI(width, height, time, {
      roiPattern: 'clustered',
      temporalHotspots: timeMode === 'dynamic',
      hotspots: createHotspots(width, height, hotspotCount, 'clustered', rng)
    }), rng, noise);
  }
  if (distribution === 'gradientFront') return createGradientFront({ width, height, rng, noise, time });
  if (distribution === 'sparseTargets') return createSparseTargets({ width, height, rng, hotspotCount, noise, time });
  if (distribution === 'ridgeCorridor') return createRidgeCorridor({ width, height, rng, noise, time });
  const sampleFieldConfig = sampleFieldConfigForDemo({ distribution, timeMode, spatialPattern, temporalBehavior, hotspotCount });
  const generated = generateROI(width, height, time, {
    seed,
    sampleFieldSeed: `${seed}:${distribution}:sample-field`,
    sampleFieldConfig,
    temporalHotspots: timeMode === 'dynamic',
    currentFrame: makeDemoCurrentFrame(width, height, time),
    hotspots: createHotspots(width, height, hotspotCount, legacyPattern(sampleFieldConfig), createSeededRng(`${seed}:sample-hotspots:${hotspotCount}`))
  });
  const viewAdjusted = applyForecastView(generated, forecastView, seed, time);
  return withNoise(viewAdjusted, rng, noise);
}

function sampleFieldConfigForDemo({ distribution, timeMode, spatialPattern, temporalBehavior, hotspotCount }) {
  const defaults = distributionToSampleConfig(distribution);
  const selectedTemporal = timeMode === 'dynamic'
    ? temporalBehavior ?? defaults.temporalBehavior
    : 'static';
  return normalizeSampleFieldConfig({
    ...defaults,
    spatialPattern: spatialPattern ?? defaults.spatialPattern,
    temporalBehavior: selectedTemporal,
    mode: timeMode === 'dynamic' ? 'dynamic' : 'static',
    hotspotCount,
    spatialCorrelation: { enabled: true, radiusCells: 3, anisotropy: distribution === 'currentAdvectedPlume' || selectedTemporal === 'currentAdvected' ? 'currentAligned' : 'none' },
    neighborInfluence: { enabled: selectedTemporal === 'diffusive' || selectedTemporal === 'markovNeighbor' || selectedTemporal === 'currentAdvected', diffusionRate: 0.14, growthRate: 0.04, decayRate: 0.03 },
    currentCoupling: { enabled: distribution === 'currentAdvectedPlume' || selectedTemporal === 'currentAdvected', advectionStrength: 0.8 }
  }, { roiHotspots: hotspotCount });
}

function distributionToSampleConfig(distribution) {
  return {
    uniformRandom: { spatialPattern: 'randomTexture', temporalBehavior: 'uniformRandom', distribution: 'uniform' },
    gaussianHotspots: { spatialPattern: 'multiHotspot', temporalBehavior: 'periodic', distribution: 'multimodal' },
    clusteredHotspots: { spatialPattern: 'multiHotspot', temporalBehavior: 'moving', distribution: 'clustered' },
    gradientFront: { spatialPattern: 'gradient', temporalBehavior: 'periodic', distribution: 'uniform' },
    sparseTargets: { spatialPattern: 'multiHotspot', temporalBehavior: 'bursty', distribution: 'multimodal' },
    ridgeCorridor: { spatialPattern: 'channelCorridor', temporalBehavior: 'periodic', distribution: 'gaussian' },
    bimodalHotspots: { spatialPattern: 'bimodal', temporalBehavior: 'periodic', distribution: 'bimodal' },
    movingHotspot: { spatialPattern: 'singleHotspot', temporalBehavior: 'moving', distribution: 'gaussian' },
    burstyBloom: { spatialPattern: 'multiHotspot', temporalBehavior: 'bursty', distribution: 'multimodal' },
    currentAdvectedPlume: { spatialPattern: 'plume', temporalBehavior: 'currentAdvected', distribution: 'heavyTail' },
    nonuniformRandom: { spatialPattern: 'randomTexture', temporalBehavior: 'nonuniformRandom', distribution: 'heavyTail' }
  }[distribution] ?? { spatialPattern: 'multiHotspot', temporalBehavior: 'periodic', distribution: 'multimodal' };
}

function legacyPattern(sampleFieldConfig) {
  if (sampleFieldConfig.spatialPattern === 'singleHotspot') return 'single';
  if (sampleFieldConfig.spatialPattern === 'bimodal') return 'bimodal';
  if (sampleFieldConfig.spatialPattern === 'plume') return 'plume';
  if (sampleFieldConfig.distribution === 'clustered') return 'clustered';
  if (sampleFieldConfig.temporalBehavior === 'moving') return 'moving';
  return 'multiple';
}

function makeDemoCurrentFrame(width, height, time) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    return [
      0.28 + 0.16 * Math.sin(ny * Math.PI * 2 + time * 0.18),
      0.08 * Math.cos(nx * Math.PI * 2 + time * 0.12)
    ];
  }));
}

function applyForecastView(field, forecastView, seed, time) {
  if (forecastView === 'truth') return field;
  if (forecastView === 'depleted') {
    const cx = field[0]?.length ? field[0].length * (0.32 + 0.18 * Math.sin(time * 0.15)) : 0;
    const cy = field.length * 0.52;
    return field.map((row, y) => row.map((value, x) => {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      const depletion = 0.55 * Math.exp(-d2 / (2 * 2.2 ** 2));
      return round3(clamp01(value * (1 - depletion)));
    }));
  }
  if (forecastView === 'uncertainty') {
    return field.map((row, y) => row.map((_value, x) => {
      const uncertainty = 0.18 + 0.62 * seededUnitLike(`${seed}:uncertainty:${Math.floor(x / 3)}:${Math.floor(y / 3)}`);
      return round3(clamp01(uncertainty + 0.08 * Math.sin(time * 0.2 + x * 0.3)));
    }));
  }
  return field.map((row, y) => row.map((value, x) => {
    const bias = (seededUnitLike(`${seed}:forecast-bias:${x}:${y}`) - 0.5) * 0.18;
    return round3(clamp01(value + bias));
  }));
}

function seededUnitLike(seed) {
  return createSeededRng(seed)();
}

function createUniformRandom(width, height, rng) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => round3(rng())));
}

function createGradientFront({ width, height, rng, noise, time }) {
  const phase = (rng() - 0.5) * 0.12 + Math.sin(time * 0.28) * 0.16;
  const wave = 0.18 + rng() * 0.18;
  const tilt = (rng() - 0.5) * 0.32;
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const front = nx + (ny - 0.5) * tilt + Math.sin(ny * Math.PI * 2 + time * 0.18) * wave;
    const value = smoothstep(0.26 + phase, 0.74 + phase, front) + (rng() - 0.5) * noise;
    return round3(clamp01(value));
  }));
}

function createSparseTargets({ width, height, rng, hotspotCount, noise, time }) {
  const targets = Array.from({ length: Math.max(3, hotspotCount * 2) }, (_, index) => ({
    x: rng() * Math.max(1, width - 1),
    y: rng() * Math.max(1, height - 1),
    strength: 0.58 + rng() * 0.42,
    radius: 0.55 + rng() * 0.7,
    phase: rng() * Math.PI * 2 + index
  }));
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const value = targets.reduce((sum, target) => {
      const pulse = 0.8 + 0.22 * Math.sin(time * 0.35 + target.phase);
      const d2 = (x - target.x) ** 2 + (y - target.y) ** 2;
      return sum + target.strength * pulse * Math.exp(-d2 / (2 * target.radius ** 2));
    }, rng() * noise * 0.18);
    return round3(clamp01(value));
  }));
}

function createRidgeCorridor({ width, height, rng, noise, time }) {
  const amplitude = 0.12 + rng() * 0.18;
  const center = 0.36 + rng() * 0.28;
  const frequency = 1.2 + rng() * 1.4;
  const phase = rng() * Math.PI * 2 + time * 0.22;
  const thickness = 0.075 + rng() * 0.045;
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const ridgeY = center + Math.sin(nx * Math.PI * 2 * frequency + phase) * amplitude;
    const distance = Math.abs(ny - ridgeY);
    const value = Math.exp(-(distance ** 2) / (2 * thickness ** 2)) + (rng() - 0.5) * noise;
    return round3(clamp01(value));
  }));
}

function withNoise(field, rng, noise) {
  const amount = clamp01(noise);
  if (amount <= 0) return field;
  return field.map((row) => row.map((value) => round3(clamp01(Number(value) + (rng() - 0.5) * amount))));
}

function summarizeField(field) {
  const values = field.flat().map(Number);
  const count = Math.max(1, values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count;
  return {
    min: round3(min),
    max: round3(max),
    mean: round3(mean),
    stdDev: round3(Math.sqrt(variance)),
    totalValue: round3(values.reduce((sum, value) => sum + value, 0))
  };
}

function findHighValueCells(field, threshold) {
  const cells = [];
  field.forEach((row, y) => {
    row.forEach((value, x) => {
      if (Number(value) >= threshold) cells.push({ x, y, value: Number(value) });
    });
  });
  return cells
    .sort((a, b) => b.value - a.value)
    .slice(0, 24);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function round3(value) {
  return Number((Number(value) || 0).toFixed(3));
}
