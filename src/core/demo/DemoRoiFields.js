import { generateROI, createHotspots } from '../generation/ROIFieldGenerator.js';
import { createSeededRng } from '../random/SeededRng.js';

export const ROI_DEMO_GRID = { width: 24, height: 16 };
export const ROI_DEMO_DISTRIBUTIONS = [
  'uniformRandom',
  'gaussianHotspots',
  'clusteredHotspots',
  'gradientFront',
  'sparseTargets',
  'ridgeCorridor'
];
export const ROI_DEMO_TIME_MODES = ['static', 'dynamic'];

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
  time = 0,
  grid = ROI_DEMO_GRID
} = {}) {
  const width = Math.max(1, Number(grid.width ?? ROI_DEMO_GRID.width));
  const height = Math.max(1, Number(grid.height ?? ROI_DEMO_GRID.height));
  const normalizedDistribution = normalizeRoiDemoDistribution(distribution);
  const normalizedTimeMode = normalizeRoiDemoTimeMode(timeMode);
  const t = normalizedTimeMode === 'dynamic' ? Number(time) || 0 : 0;
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
    time: t,
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
    ridgeCorridor: 'Ridge / Corridor'
  }[value] ?? 'Gaussian Hotspots';
}

function buildDistribution({ distribution, rng, seed, width, height, hotspotCount, noise, timeMode, time }) {
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
  return withNoise(generateROI(width, height, time, {
    roiPattern: timeMode === 'dynamic' ? 'moving' : 'multiple',
    temporalHotspots: timeMode === 'dynamic',
    hotspots: createHotspots(width, height, hotspotCount, 'multiple', createSeededRng(`${seed}:gaussian:${hotspotCount}`))
  }), rng, noise);
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
