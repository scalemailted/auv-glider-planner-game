import { normalizeSampleFieldConfig, sampleFieldConfigFromLegacyRoi } from './SampleFieldConfig.js';
import { seededUnit } from '../random/SeededRng.js';

export function generateROI(width, height, t, config = {}) {
  const sampleFieldConfig = normalizeSampleFieldConfig(
    config.sampleFieldConfig ?? config.sampleField ?? sampleFieldConfigFromLegacyRoi(config),
    {
      mode: config.challengeMode === 'forecast' || config.forecastMode === 'noisy' ? 'forecast' : 'perfectKnowledge',
      roiHotspots: config.roiHotspots
    }
  );
  return generateSampleField(width, height, t, { ...config, sampleFieldConfig });
}

export function generateSampleField(width, height, t, config = {}) {
  const fieldConfig = normalizeSampleFieldConfig(config.sampleFieldConfig ?? config.sampleField ?? {});
  const seed = config.sampleFieldSeed ?? config.seed ?? config.replaySeedAnchor ?? config.challengeId ?? 'anchor-sample-field';
  const hotspots = normalizeHotspots(config.hotspots, width, height, fieldConfig);
  const temporal = fieldConfig.mode === 'dynamic' && fieldConfig.temporalBehavior !== 'static';

  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const base = spatialBaseValue(x, y, width, height, fieldConfig, seed, t);
    const hotspotValue = hotspotContribution({
      x,
      y,
      width,
      height,
      t,
      hotspots,
      temporal,
      fieldConfig,
      currentFrame: config.currentFrame ?? config.current,
      seed
    });
    const noise = temporalNoise(x, y, width, height, t, fieldConfig, seed);
    const value = base + hotspotValue + noise;
    return round3(clamp01(value));
  }));
}

export function createHotspots(width, height, count, pattern, random = Math.random) {
  if (pattern === 'single') count = 1;
  const clustered = pattern === 'clustered';
  const center = {
    x: width * (0.35 + random() * 0.35),
    y: height * (0.3 + random() * 0.4)
  };

  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    x: clustered ? center.x + (random() - 0.5) * width * 0.22 : 2 + random() * Math.max(1, width - 4),
    y: clustered ? center.y + (random() - 0.5) * height * 0.22 : 2 + random() * Math.max(1, height - 4),
    strength: 0.65 + random() * 0.45,
    radius: 2.2 + random() * 2.4,
    phase: index * 0.9 + random() * Math.PI
  }));
}

function getHotspotDrift(pattern, t, index, width, height, temporal) {
  if (pattern !== 'moving' && !temporal) return { x: 0, y: 0 };
  return {
    x: Math.sin(t * 0.18 + index * 0.9) * width * 0.12,
    y: Math.cos(t * 0.14 + index * 1.1) * height * 0.1
  };
}

function normalizeHotspots(hotspots, width, height, fieldConfig) {
  const fallback = [{ x: width * 0.65, y: height * 0.45, strength: 1, radius: 3.5, phase: 0 }];
  const source = Array.isArray(hotspots) && hotspots.length ? hotspots : fallback;
  if (fieldConfig.spatialPattern === 'singleHotspot') return source.slice(0, 1);
  if (fieldConfig.spatialPattern === 'bimodal') return source.slice(0, 2).length >= 2 ? source.slice(0, 2) : [
    { ...source[0], x: width * 0.32, y: height * 0.42, phase: 0 },
    { ...source[0], x: width * 0.72, y: height * 0.58, phase: 1.8 }
  ];
  return source.slice(0, Math.max(1, fieldConfig.hotspotCount ?? source.length));
}

function spatialBaseValue(x, y, width, height, fieldConfig, seed, t) {
  const nx = width > 1 ? x / (width - 1) : 0;
  const ny = height > 1 ? y / (height - 1) : 0;
  if (fieldConfig.spatialPattern === 'uniform') return 0.35;
  if (fieldConfig.spatialPattern === 'gradient') {
    const front = nx + 0.18 * Math.sin(ny * Math.PI * 2 + t * 0.12);
    return 0.12 + 0.5 * smoothstep(0.25, 0.82, front);
  }
  if (fieldConfig.spatialPattern === 'coastalBand') {
    return 0.64 * Math.exp(-((nx - 0.12) ** 2) / (2 * 0.08 ** 2));
  }
  if (fieldConfig.spatialPattern === 'channelCorridor') {
    const center = 0.5 + 0.12 * Math.sin(nx * Math.PI * 2.4 + t * 0.12);
    return 0.7 * Math.exp(-((ny - center) ** 2) / (2 * 0.07 ** 2));
  }
  if (fieldConfig.spatialPattern === 'plume') {
    const sourceX = 0.08;
    const sourceY = 0.38 + 0.08 * Math.sin(t * 0.08);
    const spread = 0.08 + nx * 0.22;
    const downstream = smoothstep(sourceX, 0.95, nx);
    return downstream * 0.72 * Math.exp(-((ny - sourceY - nx * 0.22) ** 2) / (2 * spread ** 2));
  }
  if (fieldConfig.spatialPattern === 'randomTexture') {
    const coarse = seededUnit(`${seed}:texture:${Math.floor(x / 2)}:${Math.floor(y / 2)}`);
    const fine = seededUnit(`${seed}:texture:fine:${x}:${y}`);
    return 0.18 + 0.58 * (coarse * 0.7 + fine * 0.3);
  }
  return 0;
}

function hotspotContribution({ x, y, width, height, t, hotspots, temporal, fieldConfig, currentFrame, seed }) {
  const selected = fieldConfig.spatialPattern === 'plume'
    ? hotspots.slice(0, Math.max(1, Math.ceil(hotspots.length / 2)))
    : hotspots;
  return selected.reduce((sum, hotspot, index) => {
    const drift = getSampleHotspotDrift(fieldConfig, t, index, width, height, temporal, hotspot, currentFrame);
    const hx = hotspot.x + drift.x;
    const hy = hotspot.y + drift.y;
    const pulse = getTemporalPulse(fieldConfig, t, index, hotspot, seed);
    const radius = getTemporalRadius(fieldConfig, t, index, hotspot);
    const anisotropy = fieldConfig.spatialCorrelation?.anisotropy;
    const dx = x - hx;
    const dy = y - hy;
    const d2 = anisotropy === 'currentAligned'
      ? (dx ** 2) / 1.8 + (dy ** 2) * 1.2
      : anisotropy === 'shorelineAligned'
        ? (dx ** 2) * 0.75 + (dy ** 2) * 1.45
        : dx ** 2 + dy ** 2;
    const heavyTail = fieldConfig.distribution === 'heavyTail' ? 1 / (1 + d2 / Math.max(0.01, radius ** 2)) : Math.exp(-d2 / (2 * radius ** 2));
    return sum + (hotspot.strength ?? 1) * pulse * heavyTail;
  }, 0);
}

function getSampleHotspotDrift(fieldConfig, t, index, width, height, temporal, hotspot, currentFrame) {
  if (!temporal) return { x: 0, y: 0 };
  if (fieldConfig.temporalBehavior === 'moving') return getHotspotDrift('moving', t, index, width, height, true);
  if (fieldConfig.temporalBehavior === 'currentAdvected') {
    const current = sampleCurrentAt(currentFrame, hotspot.x, hotspot.y);
    const strength = fieldConfig.currentCoupling?.enabled === false ? 0.35 : fieldConfig.currentCoupling?.advectionStrength ?? 0.6;
    return {
      x: current.u * t * strength * 0.85 + Math.sin(t * 0.1 + index) * width * 0.035,
      y: current.v * t * strength * 0.85 + Math.cos(t * 0.08 + index) * height * 0.025
    };
  }
  if (fieldConfig.temporalBehavior === 'diffusive' || fieldConfig.temporalBehavior === 'markovNeighbor') {
    return {
      x: Math.sin(t * 0.08 + index) * width * 0.035,
      y: Math.cos(t * 0.07 + index) * height * 0.03
    };
  }
  return { x: 0, y: 0 };
}

function getTemporalPulse(fieldConfig, t, index, hotspot, seed) {
  if (fieldConfig.temporalBehavior === 'static') return 1;
  const phase = hotspot.phase ?? index;
  if (fieldConfig.temporalBehavior === 'periodic' || fieldConfig.temporalBehavior === 'moving') {
    return 0.68 + 0.42 * (0.5 + 0.5 * Math.sin(t * 0.32 + phase));
  }
  if (fieldConfig.temporalBehavior === 'bursty') {
    const cycle = 24;
    const peak = 3 + seededUnit(`${seed}:burst-peak:${index}`) * 18;
    const localTime = ((t + cycle - peak) % cycle);
    const centered = Math.min(localTime, cycle - localTime);
    const duration = 1.8 + seededUnit(`${seed}:burst-duration:${index}`) * 3.8;
    return 0.12 + 1.25 * Math.exp(-(centered ** 2) / (2 * duration ** 2));
  }
  if (fieldConfig.temporalBehavior === 'currentAdvected') {
    return 0.72 + 0.25 * Math.sin(t * 0.22 + phase);
  }
  if (fieldConfig.temporalBehavior === 'markovNeighbor') {
    const activation = seededUnit(`${seed}:markov:${index}:${Math.floor(t / 3)}`) > 0.48 ? 1 : 0.45;
    return activation * (0.78 + 0.18 * Math.sin(t * 0.2 + phase));
  }
  return 1;
}

function getTemporalRadius(fieldConfig, t, index, hotspot) {
  const base = Math.max(0.3, Number(hotspot.radius ?? fieldConfig.spatialCorrelation?.radiusCells ?? 3.5));
  if (fieldConfig.temporalBehavior === 'diffusive' || fieldConfig.temporalBehavior === 'currentAdvected') {
    const diffusion = fieldConfig.neighborInfluence?.enabled ? fieldConfig.neighborInfluence.diffusionRate ?? 0.12 : 0.08;
    return base * (0.78 + Math.min(0.55, diffusion * (1 + (t % 12))));
  }
  if (fieldConfig.temporalBehavior === 'bursty') return base * (0.7 + 0.22 * Math.sin(t * 0.3 + index));
  if (fieldConfig.temporalBehavior !== 'static') return base * (0.86 + 0.18 * Math.sin(t * 0.2 + index));
  return base;
}

function temporalNoise(x, y, width, height, t, fieldConfig, seed) {
  const behavior = fieldConfig.temporalBehavior;
  if (behavior !== 'uniformRandom' && behavior !== 'nonuniformRandom') return 0;
  const phase = seededUnit(`${seed}:phase:${x}:${y}`) * Math.PI * 2;
  const freq = 0.14 + seededUnit(`${seed}:freq:${x}:${y}`) * 0.28;
  const baseAmp = behavior === 'nonuniformRandom'
    ? 0.08 + 0.28 * (1 - Math.min(x / Math.max(1, width - 1), y / Math.max(1, height - 1)))
    : 0.18;
  return baseAmp * Math.sin(t * freq + phase);
}

function sampleCurrentAt(currentFrame, x, y) {
  const grid = Array.isArray(currentFrame?.current) ? currentFrame.current : currentFrame;
  if (!Array.isArray(grid) || !grid.length) return { u: 0.28, v: 0.08 };
  const row = grid[Math.max(0, Math.min(grid.length - 1, Math.round(y)))];
  const vector = row?.[Math.max(0, Math.min(row.length - 1, Math.round(x)))] ?? [0, 0];
  return { u: Number(vector[0] ?? vector.u ?? 0), v: Number(vector[1] ?? vector.v ?? 0) };
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
