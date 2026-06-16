import { createSeededRng } from '../../random/SeededRng.js';
import { clamp01, sampleBilinear } from './UncertaintyFieldMath.js';

export const OBSERVATION_PATHS = [
  'singlePoint',
  'crossSectionTransect',
  'diagonalTransect',
  'sparseRandom',
  'clusterFollowup',
  'boundaryProbe'
];

export function observationPathLabel(pattern) {
  return {
    singlePoint: 'Single Point',
    crossSectionTransect: 'Cross-Section Transect',
    diagonalTransect: 'Diagonal Transect',
    sparseRandom: 'Sparse Random',
    clusterFollowup: 'Cluster Follow-Up',
    boundaryProbe: 'Boundary Probe'
  }[normalizeObservationPath(pattern)] ?? 'Cross-Section Transect';
}

export function normalizeObservationPath(pattern) {
  return OBSERVATION_PATHS.includes(pattern) ? pattern : 'crossSectionTransect';
}

export function sampleObservation({
  truthField,
  forecastField,
  uncertaintyField,
  x,
  y,
  sensorNoise = 0.08,
  seed = 'anchor-observation',
  time = 0,
  sensorType = 'synthetic-scalar'
} = {}) {
  const width = Math.max(1, truthField?.[0]?.length ?? forecastField?.[0]?.length ?? uncertaintyField?.[0]?.length ?? 1);
  const height = Math.max(1, truthField?.length ?? forecastField?.length ?? uncertaintyField?.length ?? 1);
  const sx = Math.max(0, Math.min(width - 1, Number(x) || 0));
  const sy = Math.max(0, Math.min(height - 1, Number(y) || 0));
  const noiseScale = Math.max(0, Number(sensorNoise) || 0);
  const truthValue = clamp01(sampleBilinear(truthField, sx, sy));
  const expectedValue = clamp01(sampleBilinear(forecastField, sx, sy));
  const expectedUncertainty = clamp01(sampleBilinear(uncertaintyField, sx, sy));
  const noise = noiseScale > 0 ? deterministicNormal(`${seed}:${time}:${sx.toFixed(3)}:${sy.toFixed(3)}:${sensorType}`) * noiseScale : 0;
  const observedValue = clamp01(truthValue + noise);
  const innovation = round6(observedValue - expectedValue);
  const denominator = Math.max(0.025, Math.sqrt(expectedUncertainty ** 2 + noiseScale ** 2));
  const surprise = Math.abs(innovation) / denominator;
  const col = Math.max(0, Math.min(width - 1, Math.round(sx)));
  const row = Math.max(0, Math.min(height - 1, Math.round(sy)));
  return {
    id: `obs-${hashString(`${seed}:${time}:${sx}:${sy}:${sensorType}`).toString(16)}`,
    x: sx,
    y: sy,
    row,
    col,
    time: round6(Number(time) || 0),
    truthValue: round6(truthValue),
    expectedValue: round6(expectedValue),
    observedValue: round6(observedValue),
    expectedUncertainty: round6(expectedUncertainty),
    sensorNoise: round6(noiseScale),
    innovation,
    surprise: round6(surprise),
    normalizedSurprise: round6(clamp01(surprise / 4)),
    sensorType
  };
}

export function generateObservationPath({
  pattern = 'crossSectionTransect',
  width = 24,
  height = 16,
  count = 8,
  seed = 'anchor-observation-path',
  scenarioId = null,
  centerX = null,
  centerY = null
} = {}) {
  const path = normalizeObservationPath(pattern);
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const n = Math.max(1, Math.round(Number(count) || 1));
  const rng = createSeededRng(`${seed}:${path}:${scenarioId ?? 'scenario'}`);
  const points = [];

  if (path === 'singlePoint') {
    const point = scenarioCenter(scenarioId, w, h, centerX, centerY);
    for (let i = 0; i < n; i += 1) points.push({ ...point, index: i });
    return points;
  }

  if (path === 'crossSectionTransect') {
    const y = Math.round(h * 0.52);
    for (let i = 0; i < n; i += 1) {
      const x = n === 1 ? Math.round(w / 2) : Math.round((w - 1) * i / (n - 1));
      points.push(point(x, y, w, h, i));
    }
    return points;
  }

  if (path === 'diagonalTransect') {
    for (let i = 0; i < n; i += 1) {
      const f = n === 1 ? 0.5 : i / (n - 1);
      points.push(point(Math.round((w - 1) * f), Math.round((h - 1) * f), w, h, i));
    }
    return points;
  }

  if (path === 'sparseRandom') {
    for (let i = 0; i < n; i += 1) points.push(point(Math.round(rng() * (w - 1)), Math.round(rng() * (h - 1)), w, h, i));
    return points;
  }

  if (path === 'clusterFollowup') {
    const center = scenarioCenter(scenarioId, w, h, centerX, centerY);
    for (let i = 0; i < n; i += 1) {
      const angle = i * Math.PI * 2 / Math.max(1, n);
      const radius = i === 0 ? 0 : 1.1 + (i % 3) * 0.85;
      points.push(point(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, w, h, i));
    }
    return points;
  }

  const midX = Math.round(w * 0.52);
  for (let i = 0; i < n; i += 1) {
    const y = n === 1 ? Math.round(h / 2) : Math.round((h - 1) * i / (n - 1));
    const offset = i % 2 === 0 ? -1 : 1;
    points.push(point(midX + offset, y, w, h, i));
  }
  return points;
}

export function applyObservationSet({
  truthField,
  forecastField,
  uncertaintyField,
  points = [],
  pattern = 'crossSectionTransect',
  width = null,
  height = null,
  count = null,
  seed = 'anchor-observation-set',
  time = 0,
  sensorNoise = 0.08,
  sensorType = 'synthetic-scalar',
  scenarioId = null
} = {}) {
  const w = Math.max(1, Math.round(Number(width ?? truthField?.[0]?.length ?? forecastField?.[0]?.length ?? 24) || 24));
  const h = Math.max(1, Math.round(Number(height ?? truthField?.length ?? forecastField?.length ?? 16) || 16));
  const selectedPoints = Array.isArray(points) && points.length
    ? points
    : generateObservationPath({ pattern, width: w, height: h, count: count ?? 8, seed, scenarioId });
  return selectedPoints.map((entry, index) => sampleObservation({
    truthField,
    forecastField,
    uncertaintyField,
    x: entry.x ?? entry.col,
    y: entry.y ?? entry.row,
    sensorNoise,
    seed: `${seed}:obs:${index}`,
    time: Number(time) + index * 0.01,
    sensorType
  }));
}

function scenarioCenter(scenarioId, width, height, centerX, centerY) {
  if (Number.isFinite(Number(centerX)) && Number.isFinite(Number(centerY))) {
    return point(Number(centerX), Number(centerY), width, height, 0);
  }
  const centers = {
    shiftedFront: [0.48, 0.52],
    weakenedHotspot: [0.62, 0.38],
    hiddenPlume: [0.33, 0.7],
    hiddenBloomLayer: [0.7, 0.66],
    noisyFalseAlarm: [0.55, 0.46],
    staleMonitoringField: [0.72, 0.24],
    accurateForecast: [0.62, 0.42]
  };
  const [nx, ny] = centers[scenarioId] ?? [0.5, 0.5];
  return point(nx * (width - 1), ny * (height - 1), width, height, 0);
}

function point(x, y, width, height, index) {
  const px = Math.max(0, Math.min(width - 1, Number(x) || 0));
  const py = Math.max(0, Math.min(height - 1, Number(y) || 0));
  const col = Math.max(0, Math.min(width - 1, Math.round(px)));
  const row = Math.max(0, Math.min(height - 1, Math.round(py)));
  return { x: px, y: py, col, row, index };
}

function deterministicNormal(seed) {
  const rng = createSeededRng(seed);
  const u1 = Math.max(0.000001, rng());
  const u2 = Math.max(0.000001, rng());
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function hashString(value) {
  const text = String(value ?? '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function round6(value) {
  return Number((Number(value) || 0).toFixed(6));
}