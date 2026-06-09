import { createSeededRng } from '../random/SeededRng.js';

export const UNCERTAINTY_DEMO_GRID = { width: 24, height: 16 };

export const UNCERTAINTY_DEMO_VIEW_MODES = [
  'forecast',
  'truth',
  'uncertainty',
  'informationGain',
  'forecastError',
  'deltaAfterUpdate'
];

export const UNCERTAINTY_DEMO_PATTERNS = [
  'uniformUncertainty',
  'gaussianRegion',
  'clusteredUncertainty',
  'boundaryFront',
  'sparseUnknownTargets',
  'patchyUncertainty',
  'unobservedRegions'
];

export const UNCERTAINTY_DEMO_FORECAST_MODELS = [
  'perfectForecast',
  'noisyForecast',
  'biasedForecast',
  'regionalBias',
  'driftingForecast',
  'delayedForecast',
  'hiddenTruthMismatch'
];

export const UNCERTAINTY_DEMO_BEHAVIORS = [
  'constant',
  'growthOverTime',
  'confidenceDecay',
  'burstyBreakdown',
  'reductionAfterSampling',
  'recoveryRegrowth'
];

export const UNCERTAINTY_DEMO_UPDATE_MODELS = [
  'none',
  'localSample',
  'neighborUpdate',
  'surfaceUpdate',
  'globalRefresh'
];

export function normalizeUncertaintyDemoChoice(value, choices, fallback) {
  return choices.includes(value) ? value : fallback;
}

export function createUncertaintyForecastField({
  seed = 'anchor-uncertainty-demo',
  time = 0,
  grid = UNCERTAINTY_DEMO_GRID,
  viewMode = 'uncertainty',
  uncertaintyPattern = 'clusteredUncertainty',
  forecastModel = 'regionalBias',
  uncertaintyBehavior = 'confidenceDecay',
  updateModel = 'neighborUpdate',
  observations = []
} = {}) {
  const width = Math.max(1, Number(grid.width ?? UNCERTAINTY_DEMO_GRID.width));
  const height = Math.max(1, Number(grid.height ?? UNCERTAINTY_DEMO_GRID.height));
  const t = Number(time) || 0;
  const normalized = {
    viewMode: normalizeUncertaintyDemoChoice(viewMode, UNCERTAINTY_DEMO_VIEW_MODES, 'uncertainty'),
    uncertaintyPattern: normalizeUncertaintyDemoChoice(uncertaintyPattern, UNCERTAINTY_DEMO_PATTERNS, 'clusteredUncertainty'),
    forecastModel: normalizeUncertaintyDemoChoice(forecastModel, UNCERTAINTY_DEMO_FORECAST_MODELS, 'regionalBias'),
    uncertaintyBehavior: normalizeUncertaintyDemoChoice(uncertaintyBehavior, UNCERTAINTY_DEMO_BEHAVIORS, 'confidenceDecay'),
    updateModel: normalizeUncertaintyDemoChoice(updateModel, UNCERTAINTY_DEMO_UPDATE_MODELS, 'neighborUpdate')
  };
  const truth = createTruthField({ seed, width, height, time: t });
  const forecast = createForecastField({ truth, seed, time: t, forecastModel: normalized.forecastModel });
  const baseUncertainty = createUncertaintyField({ seed, width, height, time: t, pattern: normalized.uncertaintyPattern, behavior: normalized.uncertaintyBehavior });
  const uncertainty = applyUpdates(baseUncertainty, { observations, updateModel: normalized.updateModel, time: t });
  const updatedForecast = applyForecastUpdates(forecast, truth, uncertainty, { observations, updateModel: normalized.updateModel, time: t });
  const forecastError = mapGrid(updatedForecast, (value, x, y) => Math.abs(value - Number(truth[y]?.[x] ?? 0)));
  const informationGain = mapGrid(uncertainty, (value, x, y) => clamp01(value * (0.45 + 0.55 * Math.abs(0.5 - Number(updatedForecast[y]?.[x] ?? 0)) * 2)));
  const deltaAfterUpdate = mapGrid(baseUncertainty, (value, x, y) => clamp01(value - Number(uncertainty[y]?.[x] ?? 0)));
  const layers = { forecast: updatedForecast, truth, uncertainty, informationGain, forecastError, deltaAfterUpdate };
  const field = layers[normalized.viewMode] ?? uncertainty;
  return {
    ...normalized,
    field,
    layers,
    width,
    height,
    time: t,
    observations,
    stats: summarizeField(field)
  };
}

export function uncertaintyViewLabel(value) {
  return {
    forecast: 'Forecast',
    truth: 'Truth',
    uncertainty: 'Uncertainty',
    informationGain: 'Information Gain',
    forecastError: 'Forecast Error',
    deltaAfterUpdate: 'Delta After Update'
  }[value] ?? 'Uncertainty';
}

export function uncertaintyPatternLabel(value) {
  return {
    uniformUncertainty: 'Uniform Uncertainty',
    gaussianRegion: 'Gaussian Uncertainty Region',
    clusteredUncertainty: 'Clustered Uncertainty',
    boundaryFront: 'Boundary / Front Uncertainty',
    sparseUnknownTargets: 'Sparse Unknown Targets',
    patchyUncertainty: 'Patchy Uncertainty',
    unobservedRegions: 'High Uncertainty Near Unobserved Regions'
  }[value] ?? 'Clustered Uncertainty';
}

export function forecastModelLabel(value) {
  return {
    perfectForecast: 'Perfect Forecast',
    noisyForecast: 'Noisy Forecast',
    biasedForecast: 'Biased Forecast',
    regionalBias: 'Regional Bias',
    driftingForecast: 'Drifting Forecast',
    delayedForecast: 'Delayed Forecast',
    hiddenTruthMismatch: 'Hidden Truth Mismatch'
  }[value] ?? 'Regional Bias';
}

export function uncertaintyBehaviorLabel(value) {
  return {
    constant: 'Constant',
    growthOverTime: 'Growth Over Time',
    confidenceDecay: 'Confidence Decay',
    burstyBreakdown: 'Bursty Forecast Breakdown',
    reductionAfterSampling: 'Reduction After Sampling',
    recoveryRegrowth: 'Recovery / Regrowth'
  }[value] ?? 'Confidence Decay';
}

export function updateModelLabel(value) {
  return {
    none: 'No Update',
    localSample: 'Local Sample Update',
    neighborUpdate: 'Neighbor Update',
    surfaceUpdate: 'Surface Update',
    globalRefresh: 'Global Refresh'
  }[value] ?? 'Neighbor Update';
}

function createTruthField({ seed, width, height, time }) {
  const rng = createSeededRng(`${seed}:truth`);
  const centers = Array.from({ length: 4 }, (_, index) => ({
    x: rng() * (width - 1),
    y: rng() * (height - 1),
    radius: 2.2 + rng() * 2.8,
    strength: 0.45 + rng() * 0.5,
    phase: rng() * Math.PI * 2 + index
  }));
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const value = centers.reduce((sum, center) => {
      const cx = center.x + Math.sin(time * 0.08 + center.phase) * 1.2;
      const cy = center.y + Math.cos(time * 0.07 + center.phase) * 0.8;
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      return sum + center.strength * Math.exp(-d2 / (2 * center.radius ** 2));
    }, 0.06);
    return round3(clamp01(value));
  }));
}

function createForecastField({ truth, seed, time, forecastModel }) {
  if (forecastModel === 'perfectForecast') return truth.map((row) => row.map(round3));
  const height = truth.length;
  const width = truth[0]?.length ?? 0;
  return truth.map((row, y) => row.map((truthValue, x) => {
    let value = Number(truthValue) || 0;
    if (forecastModel === 'noisyForecast') value += (seededUnit(`${seed}:noise:${x}:${y}`) - 0.5) * 0.24;
    if (forecastModel === 'biasedForecast') value += 0.16;
    if (forecastModel === 'regionalBias') value += x > width * 0.52 && y < height * 0.62 ? -0.24 : 0.08;
    if (forecastModel === 'driftingForecast') value += (seededUnit(`${seed}:drift:${x}:${y}`) - 0.5) * Math.min(0.42, time * 0.018);
    if (forecastModel === 'delayedForecast') value += Math.sin((x + y) * 0.35 - time * 0.18) * 0.14;
    if (forecastModel === 'hiddenTruthMismatch') value *= x < width * 0.35 ? 0.45 : 1.08;
    return round3(clamp01(value));
  }));
}

function createUncertaintyField({ seed, width, height, time, pattern, behavior }) {
  const envelope = uncertaintyEnvelope(behavior, time, seed);
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    let value = 0.32;
    if (pattern === 'uniformUncertainty') value = 0.45;
    if (pattern === 'gaussianRegion') value = 0.12 + 0.78 * gaussian(nx, ny, 0.58, 0.42, 0.18);
    if (pattern === 'clusteredUncertainty') value = 0.1 + clustered(seed, x, y, width, height);
    if (pattern === 'boundaryFront') value = 0.16 + 0.72 * smoothstep(0.42, 0.58, Math.abs(nx - 0.48 + Math.sin(time * 0.08) * 0.05));
    if (pattern === 'sparseUnknownTargets') value = seededUnit(`${seed}:sparse:${x}:${y}`) > 0.925 ? 0.92 : 0.12;
    if (pattern === 'patchyUncertainty') value = 0.14 + 0.68 * seededUnit(`${seed}:patch:${Math.floor(x / 3)}:${Math.floor(y / 3)}`);
    if (pattern === 'unobservedRegions') value = 0.18 + 0.74 * Math.max(0, 1 - gaussian(nx, ny, 0.25, 0.72, 0.22));
    return round3(clamp01(value * envelope));
  }));
}

function applyUpdates(field, { observations, updateModel, time }) {
  if (updateModel === 'none' || !observations.length) return field.map((row) => row.map(round3));
  const radius = { localSample: 0.8, neighborUpdate: 2.2, surfaceUpdate: 4.2, globalRefresh: 999 }[updateModel] ?? 1;
  const strength = { localSample: 0.68, neighborUpdate: 0.58, surfaceUpdate: 0.5, globalRefresh: 0.38 }[updateModel] ?? 0.55;
  return field.map((row, y) => row.map((value, x) => {
    const effect = observations.reduce((max, obs) => {
      const age = Math.max(0, time - Number(obs.t ?? time));
      const recovery = Math.min(0.42, age * 0.025);
      const distance = Math.hypot(x - Number(obs.x), y - Number(obs.y));
      const local = radius > 100 ? strength : strength * Math.exp(-(distance ** 2) / (2 * radius ** 2));
      return Math.max(max, Math.max(0, local - recovery));
    }, 0);
    return round3(clamp01(value * (1 - effect)));
  }));
}

function applyForecastUpdates(forecast, truth, uncertainty, { observations, updateModel }) {
  if (updateModel === 'none' || !observations.length) return forecast.map((row) => row.map(round3));
  return forecast.map((row, y) => row.map((value, x) => {
    const confidence = 1 - Number(uncertainty[y]?.[x] ?? 0);
    return round3(clamp01(value * (1 - confidence * 0.36) + Number(truth[y]?.[x] ?? value) * confidence * 0.36));
  }));
}

function uncertaintyEnvelope(behavior, time, seed) {
  if (behavior === 'constant') return 1;
  if (behavior === 'growthOverTime') return Math.min(1.3, 0.65 + time * 0.025);
  if (behavior === 'confidenceDecay') return Math.min(1.25, 0.7 + time * 0.018);
  if (behavior === 'burstyBreakdown') return seededUnit(`${seed}:breakdown:${Math.floor(time / 4)}`) > 0.55 ? 1.28 : 0.58;
  if (behavior === 'reductionAfterSampling') return 0.9;
  if (behavior === 'recoveryRegrowth') return 0.62 + 0.45 * (0.5 + 0.5 * Math.sin(time * 0.11));
  return 1;
}

function clustered(seed, x, y, width, height) {
  let value = 0;
  for (let i = 0; i < 4; i += 1) {
    const cx = seededUnit(`${seed}:cluster:x:${i}`) * (width - 1);
    const cy = seededUnit(`${seed}:cluster:y:${i}`) * (height - 1);
    const radius = 1.8 + seededUnit(`${seed}:cluster:r:${i}`) * 3;
    value += 0.38 * Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * radius ** 2)));
  }
  return clamp01(value);
}

function mapGrid(grid, mapper) {
  return grid.map((row, y) => row.map((value, x) => round3(clamp01(mapper(Number(value) || 0, x, y)))));
}

function summarizeField(field) {
  const values = field.flat().map(Number);
  const count = Math.max(1, values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  return { min: round3(min), max: round3(max), mean: round3(mean), totalValue: round3(values.reduce((sum, value) => sum + value, 0)) };
}

function seededUnit(seed) {
  return createSeededRng(seed)();
}

function gaussian(x, y, cx, cy, radius) {
  return Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * radius ** 2)));
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
