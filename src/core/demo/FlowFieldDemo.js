import { createSeededRng } from '../random/SeededRng.js';
import { CURRENT_COORDINATES, sampleCurrentField } from '../currents/CurrentFieldSampler.js';
import { getVectorPresetConfig } from '../generation/VectorFieldPresets.js';

const TAU = Math.PI * 2;
const DEFAULT_TRAIL_LIMIT = 44;
const MAX_DEMO_MAGNITUDE = 1.35;
export const FLOW_DEMO_FIELD_DURATION_HOURS = 24;
export const FLOW_DEMO_GRID = { width: 18, height: 12 };
export const FLOW_DEMO_FIELD_MODES = ['static', 'dynamic', 'blended', 'partitioned'];
export const FLOW_DEMO_TIME_SPEEDS = [0.1, 0.5, 1, 2, 5, 10];
export const FLOW_DEMO_PARTITION_TYPES = ['vertical', 'horizontal', 'quadrants', 'radial'];
export const FLOW_DEMO_TERRAIN_MODES = ['none', 'islands', 'coastline', 'channel'];
export const FLOW_DEMO_PRESET_CHOICES = [
  'calm',
  'uniformDrift',
  'shearFlow',
  'eddyField',
  'doubleGyre',
  'tidalOscillation',
  'meanderingJet',
  'stormPulse',
  'curlNoise',
  'hycomInspiredComposite'
];
export const FLOW_DEMO_DEFAULT_PRESETS = {
  static: 'currentCorridor',
  dynamic: 'tidalOscillation',
  blended: 'uniformDrift',
  partitioned: 'meanderingJet',
  secondary: 'eddyField'
};

export function getFlowDemoPresetConfig(mode = 'static', preset = null) {
  const normalizedMode = normalizeFieldMode(mode);
  const presetId = preset ?? FLOW_DEMO_DEFAULT_PRESETS[normalizedMode] ?? FLOW_DEMO_DEFAULT_PRESETS.static;
  const temporal = normalizedMode !== 'static';
  return getVectorPresetConfig(presetId, {
    temporalEvolution: temporal,
    currentVariability: temporal ? undefined : 0,
    duration: FLOW_DEMO_FIELD_DURATION_HOURS,
    durationHours: FLOW_DEMO_FIELD_DURATION_HOURS
  });
}

export function sampleDemoFlow(mode = 'static', x = 0, y = 0, time = 0, preset = null) {
  if (typeof mode === 'object') return sampleComposedDemoFlow(mode);
  return sampleComposedDemoFlow({
    fieldMode: mode,
    x,
    y,
    time,
    primaryPreset: preset
  });
}

export function sampleComposedDemoFlow({
  fieldMode = 'static',
  x = 0,
  y = 0,
  time = 0,
  primaryPreset = null,
  secondaryPreset = FLOW_DEMO_DEFAULT_PRESETS.secondary,
  blendWeight = 0.6,
  partitionType = 'vertical',
  terrain = null
} = {}) {
  const mode = normalizeFieldMode(fieldMode);
  if (mode === 'blended') {
    const primary = sampleSingleDemoFlow({ fieldMode: 'dynamic', x, y, time, preset: primaryPreset ?? FLOW_DEMO_DEFAULT_PRESETS.blended, terrain });
    const secondary = sampleSingleDemoFlow({ fieldMode: 'dynamic', x, y, time, preset: secondaryPreset, terrain });
    const weight = clamp01(blendWeight);
    return withCompositionMetadata(clampVector({
      u: primary.u * weight + secondary.u * (1 - weight),
      v: primary.v * weight + secondary.v * (1 - weight),
      confidence: Math.min(primary.confidence ?? 1, secondary.confidence ?? 1),
      source: 'demo-composite'
    }), {
      mode,
      primaryPreset: primary.preset,
      secondaryPreset: secondary.preset,
      blendWeight: weight,
      timeVarying: true,
      contributors: { primary, secondary }
    });
  }
  if (mode === 'partitioned') {
    const selected = partitionSelect({ x, y, partitionType });
    const preset = selected === 'primary'
      ? (primaryPreset ?? FLOW_DEMO_DEFAULT_PRESETS.partitioned)
      : secondaryPreset;
    const sample = sampleSingleDemoFlow({ fieldMode: 'dynamic', x, y, time, preset, terrain });
    return withCompositionMetadata(sample, {
      mode,
      primaryPreset: primaryPreset ?? FLOW_DEMO_DEFAULT_PRESETS.partitioned,
      secondaryPreset,
      partitionType,
      activeRegion: selected,
      timeVarying: true
    });
  }
  const sample = sampleSingleDemoFlow({ fieldMode: mode, x, y, time, preset: primaryPreset, terrain });
  return withCompositionMetadata(sample, {
    mode,
    primaryPreset: sample.preset,
    secondaryPreset: null,
    timeVarying: mode !== 'static'
  });
}

function sampleSingleDemoFlow({ fieldMode = 'static', x = 0, y = 0, time = 0, preset = null, terrain = null } = {}) {
  const presetConfig = getFlowDemoPresetConfig(fieldMode, preset);
  const mode = normalizeFieldMode(fieldMode);
  const sampleTime = mode === 'static' ? 0 : positiveModulo(time, FLOW_DEMO_FIELD_DURATION_HOURS);
  const sample = sampleCurrentField({
    x,
    y,
    time: sampleTime,
    grid: FLOW_DEMO_GRID,
    coordinates: CURRENT_COORDINATES.NORMALIZED,
    terrain,
    config: presetConfig
  });
  return {
    ...sample,
    preset: presetConfig.preset,
    presetLabel: presetConfig.label,
    warning: presetConfig.warning
  };
}

export function createDemoParticles({ count = 18, seed = 'anchor-flow-demo' } = {}) {
  const rng = createSeededRng(seed);
  return Array.from({ length: count }, (_, index) => createParticle(index, rng));
}

export function advanceDemoParticles(particles, {
  mode = 'static',
  time = 0,
  dt = 1 / 60,
  field = sampleDemoFlow,
  preset = null,
  fieldConfig = null,
  trailLimit = DEFAULT_TRAIL_LIMIT
} = {}) {
  if (!Array.isArray(particles)) return [];
  for (const particle of particles) {
    const flow = fieldConfig
      ? field({ ...fieldConfig, x: particle.x, y: particle.y, time })
      : field(mode, particle.x, particle.y, time, preset);
    const glideBias = {
      u: 0.1 * Math.cos(particle.biasAngle),
      v: 0.1 * Math.sin(particle.biasAngle)
    };
    const u = (flow.u + glideBias.u) * particle.speedScale;
    const v = (flow.v + glideBias.v) * particle.speedScale;
    const nextX = particle.x + u * dt * 0.18;
    const nextY = particle.y + v * dt * 0.18;
    if (fieldConfig?.terrain && isDemoLand(fieldConfig.terrain, nextX, nextY)) {
      particle.landHits = Number(particle.landHits ?? 0) + 1;
      resetParticle(particle);
      continue;
    }
    particle.x = nextX;
    particle.y = nextY;
    particle.heading = Math.atan2(v, u);
    particle.age += dt;
    particle.trail.push({ x: particle.x, y: particle.y });
    if (particle.trail.length > trailLimit) particle.trail.shift();
    if (particle.x < -0.08 || particle.x > 1.08 || particle.y < -0.08 || particle.y > 1.08 || particle.age > particle.maxAge) {
      resetParticle(particle);
    }
  }
  return particles;
}

export function createDemoTerrain({ mode = 'none', seed = 'anchor-demo-1', grid = FLOW_DEMO_GRID } = {}) {
  const width = Number(grid.width ?? FLOW_DEMO_GRID.width);
  const height = Number(grid.height ?? FLOW_DEMO_GRID.height);
  const terrain = Array.from({ length: height }, () => Array(width).fill(0));
  const normalized = normalizeTerrainMode(mode);
  if (normalized === 'none') return terrain;
  const rng = createSeededRng(`${seed}:${normalized}:${width}x${height}`);
  if (normalized === 'islands') addRandomIslands(terrain, rng);
  else if (normalized === 'coastline') addCoastline(terrain, rng);
  else if (normalized === 'channel') addChannel(terrain, rng);
  clearWaterEdge(terrain);
  return terrain;
}

export function isDemoLand(terrain, x, y, grid = FLOW_DEMO_GRID) {
  if (!terrain) return false;
  const cx = Math.max(0, Math.min(Number(grid.width ?? FLOW_DEMO_GRID.width) - 1, Math.round(Number(x) * (Number(grid.width ?? FLOW_DEMO_GRID.width) - 1))));
  const cy = Math.max(0, Math.min(Number(grid.height ?? FLOW_DEMO_GRID.height) - 1, Math.round(Number(y) * (Number(grid.height ?? FLOW_DEMO_GRID.height) - 1))));
  return Boolean(terrain[cy]?.[cx]);
}

export function normalizeTerrainMode(value = 'none') {
  return FLOW_DEMO_TERRAIN_MODES.includes(value) ? value : 'none';
}

export function normalizeFieldMode(value = 'static') {
  if (value === 'temporal') return 'dynamic';
  return FLOW_DEMO_FIELD_MODES.includes(value) ? value : 'static';
}

function partitionSelect({ x = 0, y = 0, partitionType = 'vertical' } = {}) {
  if (partitionType === 'horizontal') return y < 0.5 ? 'primary' : 'secondary';
  if (partitionType === 'quadrants') return (x < 0.5) === (y < 0.5) ? 'primary' : 'secondary';
  if (partitionType === 'radial') return Math.hypot(Number(x) - 0.5, Number(y) - 0.5) < 0.28 ? 'secondary' : 'primary';
  return x < 0.5 ? 'primary' : 'secondary';
}

function withCompositionMetadata(sample, metadata) {
  return {
    ...sample,
    magnitude: Math.hypot(sample.u, sample.v),
    composition: metadata
  };
}

function clampVector(vector) {
  const magnitude = Math.hypot(vector.u, vector.v);
  if (!Number.isFinite(magnitude) || magnitude <= MAX_DEMO_MAGNITUDE) {
    return {
      ...vector,
      magnitude: Number.isFinite(magnitude) ? magnitude : 0
    };
  }
  const scale = MAX_DEMO_MAGNITUDE / magnitude;
  return {
    ...vector,
    u: vector.u * scale,
    v: vector.v * scale,
    magnitude: MAX_DEMO_MAGNITUDE
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function positiveModulo(value, modulus) {
  const number = Number(value) || 0;
  const base = Math.max(1, Number(modulus) || 1);
  return ((number % base) + base) % base;
}

function addRandomIslands(terrain, rng) {
  const height = terrain.length;
  const width = terrain[0]?.length ?? 0;
  const count = 2 + Math.floor(rng() * 4);
  const islands = Array.from({ length: count }, () => ({
    x: 0.18 + rng() * 0.64,
    y: 0.18 + rng() * 0.64,
    rx: 0.08 + rng() * 0.11,
    ry: 0.07 + rng() * 0.1
  }));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = width > 1 ? x / (width - 1) : 0;
      const ny = height > 1 ? y / (height - 1) : 0;
      if (islands.some((island) => {
        const wobble = 1 + 0.22 * Math.sin((nx + island.x) * 18) * Math.cos((ny + island.y) * 15);
        return (((nx - island.x) / island.rx) ** 2 + ((ny - island.y) / island.ry) ** 2) <= wobble;
      })) terrain[y][x] = 1;
    }
  }
}

function addCoastline(terrain, rng) {
  const height = terrain.length;
  const width = terrain[0]?.length ?? 0;
  const side = rng() < 0.5 ? 'left' : 'right';
  for (let y = 0; y < height; y += 1) {
    const boundary = Math.round(width * (0.22 + 0.07 * Math.sin(y * 0.85 + rng() * 2)));
    for (let x = 0; x < width; x += 1) {
      if (side === 'left' ? x <= boundary : x >= width - boundary - 1) terrain[y][x] = 1;
    }
  }
}

function addChannel(terrain, rng) {
  const height = terrain.length;
  const width = terrain[0]?.length ?? 0;
  for (let y = 0; y < height; y += 1) {
    const center = width * (0.5 + 0.08 * Math.sin(y * 0.75 + rng() * 2));
    const halfWidth = Math.max(2, width * 0.16);
    for (let x = 0; x < width; x += 1) {
      terrain[y][x] = Math.abs(x - center) <= halfWidth ? 0 : 1;
    }
  }
}

function clearWaterEdge(terrain) {
  const height = terrain.length;
  const width = terrain[0]?.length ?? 0;
  for (let x = 0; x < width; x += 1) {
    terrain[0][x] = 0;
    terrain[height - 1][x] = 0;
  }
  for (let y = 0; y < height; y += 1) {
    terrain[y][0] = 0;
    terrain[y][width - 1] = 0;
  }
}

function createParticle(index, rng) {
  const particle = {
    id: `demo-glider-${index + 1}`,
    lane: index,
    seedX: rng(),
    seedY: rng(),
    speedScale: 0.72 + rng() * 0.36,
    biasAngle: rng() * TAU,
    maxAge: 20 + rng() * 20,
    x: 0,
    y: 0,
    heading: 0,
    age: 0,
    trail: []
  };
  resetParticle(particle);
  return particle;
}

function resetParticle(particle) {
  const edge = particle.lane % 4;
  const offset = ((particle.seedY + particle.age * 0.037 + particle.lane * 0.131) % 1);
  if (edge === 0) {
    particle.x = -0.02;
    particle.y = offset;
  } else if (edge === 1) {
    particle.x = offset;
    particle.y = -0.02;
  } else if (edge === 2) {
    particle.x = 1.02;
    particle.y = offset;
  } else {
    particle.x = offset;
    particle.y = 1.02;
  }
  particle.age = 0;
  particle.trail = [{ x: particle.x, y: particle.y }];
}
