import { createSeededRng } from '../random/SeededRng.js';
import { CURRENT_COORDINATES, sampleCurrentField } from '../currents/CurrentFieldSampler.js';
import { getVectorPresetConfig } from '../generation/VectorFieldPresets.js';

const TAU = Math.PI * 2;
const DEFAULT_TRAIL_LIMIT = 44;
const MAX_DEMO_MAGNITUDE = 1.35;
const DEMO_EVOLUTION_PERIOD_SECONDS = 12;
export const FLOW_DEMO_FIELD_DURATION_HOURS = 24;
export const FLOW_DEMO_GRID = { width: 18, height: 12 };
export const FLOW_DEMO_FIELD_MODES = ['static', 'dynamic'];
export const FLOW_DEMO_EVOLUTION_SPEEDS = [0.25, 0.5, 1, 2, 5, 10];
export const FLOW_DEMO_VARIATION_LEVELS = ['off', 'low', 'medium', 'high'];
export const FLOW_DEMO_EVOLUTION_PATTERNS = ['tidalCycle', 'meanderingJet', 'eddyDrift', 'stormPulse', 'composite'];
export const FLOW_DEMO_MAGNITUDE_SCALES = [0.5, 1, 1.5, 2];
export const FLOW_DEMO_PARTICLE_SPEEDS = [0.5, 1, 2, 4];
export const FLOW_DEMO_LAYER_INFLUENCES = ['global', 'spatialPocket', 'partitionedRegion'];
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
  static: 'uniformDrift',
  dynamic: 'eddyField',
  additiveLayers: 'uniformDrift',
  partitioned: 'meanderingJet'
};
export const FLOW_DEMO_DEFAULT_LAYERS = [];
export const FLOW_DEMO_MAX_LAYERS = 4;

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
  additiveLayers = [],
  terrain = null,
  directionVariation = 'medium',
  magnitudeVariation = 'medium',
  evolutionPattern = 'composite'
} = {}) {
  const mode = normalizeFieldMode(fieldMode);
  const evolution = normalizeEvolutionControls({ directionVariation, magnitudeVariation, evolutionPattern });
  const base = sampleSingleDemoFlow({ fieldMode: mode, x, y, time, preset: primaryPreset, terrain, evolution });
  const layers = normalizeAdditiveLayers(additiveLayers);
  const enabledLayers = layers
    .filter((layer) => layer.enabled && layer.preset && layer.weight > 0)
    .map((layer) => {
      const influenceScale = layerInfluenceAt(layer, x, y);
      const sample = sampleSingleDemoFlow({
        fieldMode: mode,
        x,
        y,
        time,
        preset: layer.preset,
        terrain,
        evolution
      });
      return { ...layer, influenceScale, sample };
    })
    .filter((layer) => layer.influenceScale > 0);
  const combined = enabledLayers.reduce((sum, layer) => ({
    u: sum.u + layer.sample.u * layer.weight * layer.influenceScale,
    v: sum.v + layer.sample.v * layer.weight * layer.influenceScale,
    confidence: Math.min(sum.confidence ?? 1, layer.sample.confidence ?? 1),
    source: 'demo-composed'
  }), {
    u: base.u,
    v: base.v,
    confidence: base.confidence ?? 1,
    source: 'demo-composed'
  });
  return withCompositionMetadata(clampVector(combined), {
    mode,
    primaryPreset: base.preset,
    base,
    layers: enabledLayers.map(({ sample, ...layer }) => ({
      ...layer,
      presetLabel: sample.presetLabel,
      vector: { u: sample.u, v: sample.v, magnitude: Math.hypot(sample.u, sample.v) }
    })),
    timeVarying: mode !== 'static',
    evolution,
    contributors: { base, layers: enabledLayers.map((layer) => layer.sample) }
  });
}

function sampleSingleDemoFlow({ fieldMode = 'static', x = 0, y = 0, time = 0, preset = null, terrain = null, evolution = normalizeEvolutionControls() } = {}) {
  const presetConfig = getFlowDemoPresetConfig(fieldMode, preset);
  const mode = normalizeFieldMode(fieldMode);
  const rawTime = Number(time) || 0;
  const sampleTime = mode === 'static' ? 0 : rawTime;
  const sample = sampleCurrentField({
    x,
    y,
    time: sampleTime,
    grid: FLOW_DEMO_GRID,
    coordinates: CURRENT_COORDINATES.NORMALIZED,
    terrain,
    config: presetConfig
  });
  const evolved = mode === 'dynamic'
    ? applyDynamicEvolution(sample, {
        x,
        y,
        time: rawTime,
        preset: presetConfig.preset,
        evolution
      })
    : sample;
  return {
    ...evolved,
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
  particleSpeedScale = 1,
  trailLimit = DEFAULT_TRAIL_LIMIT
} = {}) {
  if (!Array.isArray(particles)) return [];
  for (const particle of particles) {
    const flow = fieldConfig
      ? field({ ...fieldConfig, x: particle.x, y: particle.y, time })
      : field(mode, particle.x, particle.y, time, preset);
    const glideBias = {
      u: 0.035 * Math.cos(particle.biasAngle),
      v: 0.035 * Math.sin(particle.biasAngle)
    };
    const u = (flow.u + glideBias.u) * particle.speedScale * particleSpeedScale;
    const v = (flow.v + glideBias.v) * particle.speedScale * particleSpeedScale;
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

export function summarizeDemoFlowMagnitudes(fieldConfig = {}, time = 0) {
  const values = [];
  for (let row = 0; row < FLOW_DEMO_GRID.height; row += 1) {
    for (let col = 0; col < FLOW_DEMO_GRID.width; col += 1) {
      const x = (col + 0.5) / FLOW_DEMO_GRID.width;
      const y = (row + 0.5) / FLOW_DEMO_GRID.height;
      if (fieldConfig.terrain && isDemoLand(fieldConfig.terrain, x, y)) continue;
      const sample = sampleDemoFlow({ ...fieldConfig, x, y, time });
      values.push(Math.hypot(sample.u, sample.v));
    }
  }
  if (!values.length) return { min: 0, mean: 0, max: 0, spread: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    min,
    mean,
    max,
    spread: max - min
  };
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

export function normalizeVariationLevel(value = 'medium') {
  return FLOW_DEMO_VARIATION_LEVELS.includes(value) ? value : 'medium';
}

export function normalizeEvolutionPattern(value = 'composite') {
  return FLOW_DEMO_EVOLUTION_PATTERNS.includes(value) ? value : 'composite';
}

export function normalizeEvolutionControls({
  directionVariation = 'medium',
  magnitudeVariation = 'medium',
  evolutionPattern = 'composite'
} = {}) {
  return {
    directionVariation: normalizeVariationLevel(directionVariation),
    magnitudeVariation: normalizeVariationLevel(magnitudeVariation),
    evolutionPattern: normalizeEvolutionPattern(evolutionPattern)
  };
}

export function normalizeFieldMode(value = 'static') {
  if (value === 'temporal') return 'dynamic';
  if (value === 'blended' || value === 'additiveLayers' || value === 'partitioned') return 'dynamic';
  return FLOW_DEMO_FIELD_MODES.includes(value) ? value : 'static';
}

export function normalizeAdditiveLayers(layers = FLOW_DEMO_DEFAULT_LAYERS) {
  const source = Array.isArray(layers) ? layers : FLOW_DEMO_DEFAULT_LAYERS;
  return source.slice(0, FLOW_DEMO_MAX_LAYERS).map((layer, index) => {
    const preset = FLOW_DEMO_PRESET_CHOICES.includes(layer?.preset) ? layer.preset : defaultLayerPreset(index);
    return {
      id: layer?.id ?? `layer-${index + 1}`,
      preset,
      weight: clampLayerWeight(layer?.weight ?? 0.5),
      enabled: layer?.enabled !== false,
      influence: FLOW_DEMO_LAYER_INFLUENCES.includes(layer?.influence) ? layer.influence : 'global',
      pocket: layer?.pocket ?? defaultPocket(index),
      partition: layer?.partition ?? defaultPartition(index)
    };
  });
}

export function createDefaultFlowLayer(existingLayers = [], basePreset = FLOW_DEMO_DEFAULT_PRESETS.additiveLayers) {
  const layers = normalizeAdditiveLayers(existingLayers);
  const preset = nextLayerPreset(basePreset, layers);
  return {
    id: `layer-${Date.now().toString(36)}-${layers.length + 1}`,
    preset,
    weight: 0.5,
    enabled: true,
    influence: 'global',
    pocket: defaultPocket(layers.length),
    partition: defaultPartition(layers.length)
  };
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

function clampLayerWeight(value) {
  return Math.max(0, Math.min(2, Number(value) || 0));
}

function applyDynamicEvolution(sample, { x = 0, y = 0, time = 0, preset = 'uniformDrift', evolution = normalizeEvolutionControls() } = {}) {
  const directionAmp = directionVariationAmplitude(evolution.directionVariation);
  const magnitudeAmp = magnitudeVariationAmplitude(evolution.magnitudeVariation);
  if (directionAmp <= 0 && magnitudeAmp <= 0) return sample;

  const nx = clamp01(x);
  const ny = clamp01(y);
  const phase = (Number(time) / DEMO_EVOLUTION_PERIOD_SECONDS) * TAU;
  const terms = dynamicEvolutionTerms(evolution.evolutionPattern, nx, ny, phase, preset);
  const structuralU = (0.1 + directionAmp * 0.13) * terms.u + magnitudeAmp * 0.05 * terms.magnitudeU;
  const structuralV = (0.1 + directionAmp * 0.13) * terms.v + magnitudeAmp * 0.05 * terms.magnitudeV;
  const mixedU = sample.u + structuralU;
  const mixedV = sample.v + structuralV;
  const baseMagnitude = Math.hypot(mixedU, mixedV);
  const baseAngle = baseMagnitude > 1e-9 ? Math.atan2(mixedV, mixedU) : terms.fallbackAngle;
  const angle = baseAngle + directionAmp * terms.direction;
  const multiplier = Math.max(0.05, 1 + magnitudeAmp * terms.magnitude);
  const spatialBoost = magnitudeAmp > 0 ? 1 + magnitudeAmp * 0.22 * terms.spatialMagnitude : 1;
  const magnitude = baseMagnitude * multiplier * spatialBoost;

  return {
    ...sample,
    u: Math.cos(angle) * magnitude,
    v: Math.sin(angle) * magnitude,
    magnitude,
    contributors: {
      ...(sample.contributors ?? {}),
      demoEvolution: {
        applied: true,
        pattern: evolution.evolutionPattern,
        directionVariation: evolution.directionVariation,
        magnitudeVariation: evolution.magnitudeVariation,
        directionOffset: directionAmp * terms.direction,
        magnitudeMultiplier: multiplier * spatialBoost,
        structuralVector: { u: structuralU, v: structuralV },
        continuousTime: Number(time) || 0
      }
    }
  };
}

function dynamicEvolutionTerms(pattern, x, y, phase, preset) {
  if (pattern === 'tidalCycle') return tidalCycleTerms(x, y, phase, preset);
  if (pattern === 'meanderingJet') return meanderingJetTerms(x, y, phase, preset);
  if (pattern === 'eddyDrift') return eddyDriftTerms(x, y, phase, preset);
  if (pattern === 'stormPulse') return stormPulseTerms(x, y, phase, preset);
  const tide = tidalCycleTerms(x, y, phase, preset);
  const jet = meanderingJetTerms(x, y, phase, preset);
  const eddy = eddyDriftTerms(x, y, phase, preset);
  const storm = stormPulseTerms(x, y, phase, preset);
  const broadDirection = Math.sin(phase * 0.92 + x * TAU * 0.55) + 0.45 * Math.cos(phase * 0.58 + y * TAU);
  const broadMagnitude = Math.cos(phase * 1.08 + y * TAU * 0.72) + 0.35 * Math.sin(phase * 0.7 + x * TAU);
  return {
    direction: 0.42 * broadDirection + 0.32 * tide.direction + 0.24 * jet.direction + 0.2 * eddy.direction + 0.12 * storm.direction,
    magnitude: 0.48 * broadMagnitude + 0.28 * tide.magnitude + 0.22 * jet.magnitude + 0.18 * eddy.magnitude + 0.2 * storm.magnitude,
    spatialMagnitude: 0.3 * broadMagnitude + 0.3 * jet.spatialMagnitude + 0.24 * eddy.spatialMagnitude + 0.2 * storm.spatialMagnitude,
    u: 0.34 * tide.u + 0.28 * jet.u + 0.24 * eddy.u + 0.14 * storm.u,
    v: 0.34 * tide.v + 0.28 * jet.v + 0.24 * eddy.v + 0.14 * storm.v,
    magnitudeU: 0.38 * tide.magnitudeU + 0.24 * jet.magnitudeU + 0.2 * eddy.magnitudeU + 0.18 * storm.magnitudeU,
    magnitudeV: 0.38 * tide.magnitudeV + 0.24 * jet.magnitudeV + 0.2 * eddy.magnitudeV + 0.18 * storm.magnitudeV,
    fallbackAngle: tide.fallbackAngle
  };
}

function tidalCycleTerms(x, y, phase, preset) {
  const presetPhase = presetPhaseOffset(preset);
  const wave = Math.sin(y * TAU * 1.4 + phase * 0.82 + presetPhase);
  const angle = presetPhase + 0.45 * Math.sin(phase * 0.7 + y * TAU);
  return {
    direction: Math.sin(phase * 0.85 + presetPhase) + 0.35 * Math.sin(y * TAU * 1.5 + phase * 0.42),
    magnitude: Math.sin(phase * 1.15 + presetPhase + x * TAU * 0.35),
    spatialMagnitude: Math.sin(y * TAU * 2 + phase * 0.65),
    u: Math.cos(angle) * wave,
    v: Math.sin(angle) * wave,
    magnitudeU: Math.cos(angle) * Math.sin(phase * 1.1 + x * TAU),
    magnitudeV: Math.sin(angle) * Math.cos(phase * 0.9 + y * TAU),
    fallbackAngle: presetPhase
  };
}

function meanderingJetTerms(x, y, phase, preset) {
  const presetPhase = presetPhaseOffset(preset) * 0.7;
  const center = 0.5 + 0.2 * Math.sin(x * TAU * 1.4 + phase * 0.74 + presetPhase);
  const distance = y - center;
  const jet = Math.exp(-(distance ** 2) / (2 * 0.12 ** 2));
  const bend = Math.sin(x * TAU * 1.4 + phase * 0.7 + presetPhase);
  return {
    direction: bend * (0.35 + jet),
    magnitude: (jet * 2 - 0.7) * Math.sin(phase * 0.6 + presetPhase),
    spatialMagnitude: jet * 2 - 1,
    u: jet * (0.75 + 0.25 * Math.sin(phase * 0.8 + presetPhase)),
    v: jet * 0.65 * Math.cos(x * TAU * 1.4 + phase * 0.7 + presetPhase),
    magnitudeU: jet * Math.sin(phase + y * TAU),
    magnitudeV: jet * Math.cos(phase * 0.8 + x * TAU),
    fallbackAngle: 0.2 + presetPhase
  };
}

function eddyDriftTerms(x, y, phase, preset) {
  const presetPhase = presetPhaseOffset(preset);
  const cx = 0.5 + 0.22 * Math.sin(phase * 0.32 + presetPhase);
  const cy = 0.5 + 0.18 * Math.cos(phase * 0.27 + presetPhase);
  const dx = x - cx;
  const dy = y - cy;
  const influence = Math.exp(-((dx ** 2 + dy ** 2) / (2 * 0.26 ** 2)));
  const swirl = Math.atan2(dy, dx) + Math.PI / 2;
  return {
    direction: Math.sin(swirl + phase * 0.45) * (0.35 + influence),
    magnitude: influence * Math.sin(phase * 0.9 + presetPhase) - 0.22,
    spatialMagnitude: influence * 2 - 1,
    u: Math.cos(swirl) * influence,
    v: Math.sin(swirl) * influence,
    magnitudeU: Math.cos(swirl) * influence * Math.sin(phase * 0.9 + presetPhase),
    magnitudeV: Math.sin(swirl) * influence * Math.cos(phase * 0.75 + presetPhase),
    fallbackAngle: swirl
  };
}

function stormPulseTerms(x, y, phase, preset) {
  const presetPhase = presetPhaseOffset(preset);
  const cx = 0.34 + 0.32 * (0.5 + 0.5 * Math.sin(phase * 0.18 + presetPhase));
  const cy = 0.34 + 0.32 * (0.5 + 0.5 * Math.cos(phase * 0.22 + presetPhase));
  const local = Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * 0.19 ** 2)));
  const pulse = Math.max(0, Math.sin(phase * 1.15 + presetPhase));
  const stormAngle = presetPhase + Math.PI * 0.25 + 0.35 * Math.sin(phase * 0.5);
  return {
    direction: local * Math.sin(Math.atan2(y - cy, x - cx) + phase),
    magnitude: local * (pulse * 2 - 0.35),
    spatialMagnitude: local * pulse * 2 - 0.4,
    u: Math.cos(stormAngle) * local * pulse,
    v: Math.sin(stormAngle) * local * pulse,
    magnitudeU: Math.cos(stormAngle) * local * (pulse * 2 - 0.4),
    magnitudeV: Math.sin(stormAngle) * local * (pulse * 2 - 0.4),
    fallbackAngle: presetPhase + Math.PI * 0.25
  };
}

function directionVariationAmplitude(level) {
  return {
    off: 0,
    low: 0.16,
    medium: 0.38,
    high: 0.72
  }[normalizeVariationLevel(level)] ?? 0.38;
}

function magnitudeVariationAmplitude(level) {
  return {
    off: 0,
    low: 0.12,
    medium: 0.3,
    high: 0.52
  }[normalizeVariationLevel(level)] ?? 0.3;
}

function presetPhaseOffset(preset) {
  let hash = 0;
  const text = String(preset ?? 'flow');
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return (hash / 0xffffffff) * TAU;
}

function defaultLayerPreset(index = 0) {
  return ['eddyField', 'tidalOscillation', 'stormPulse', 'curlNoise'][index % 4];
}

function nextLayerPreset(basePreset, layers = []) {
  const used = new Set([basePreset, ...layers.map((layer) => layer.preset)]);
  return ['eddyField', 'tidalOscillation', 'stormPulse', 'curlNoise', 'meanderingJet', 'shearFlow']
    .find((preset) => !used.has(preset)) ?? defaultLayerPreset(layers.length);
}

function layerInfluenceAt(layer, x, y) {
  if (layer.influence === 'spatialPocket') {
    const pocket = layer.pocket ?? defaultPocket(0);
    const distance = Math.hypot(Number(x) - pocket.x, Number(y) - pocket.y);
    const radius = Math.max(0.05, Number(pocket.radius) || 0.28);
    return Math.exp(-(distance ** 2) / (2 * radius ** 2));
  }
  if (layer.influence === 'partitionedRegion') {
    const partition = layer.partition ?? defaultPartition(0);
    if (partition === 'right') return Number(x) >= 0.5 ? 1 : 0;
    if (partition === 'top') return Number(y) < 0.5 ? 1 : 0;
    if (partition === 'bottom') return Number(y) >= 0.5 ? 1 : 0;
    if (partition === 'center') return Math.hypot(Number(x) - 0.5, Number(y) - 0.5) <= 0.32 ? 1 : 0;
    return Number(x) < 0.5 ? 1 : 0;
  }
  return 1;
}

function defaultPocket(index = 0) {
  const pockets = [
    { x: 0.38, y: 0.45, radius: 0.28 },
    { x: 0.66, y: 0.58, radius: 0.24 },
    { x: 0.52, y: 0.28, radius: 0.22 },
    { x: 0.72, y: 0.34, radius: 0.2 }
  ];
  return pockets[index % pockets.length];
}

function defaultPartition(index = 0) {
  return ['left', 'right', 'top', 'center'][index % 4];
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
