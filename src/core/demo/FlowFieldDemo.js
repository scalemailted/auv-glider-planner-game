import { createSeededRng } from '../random/SeededRng.js';
import { CURRENT_COORDINATES, sampleCurrentField } from '../currents/CurrentFieldSampler.js';
import { getVectorPresetConfig } from '../generation/VectorFieldPresets.js';

const TAU = Math.PI * 2;
const DEFAULT_TRAIL_LIMIT = 44;
export const FLOW_DEMO_GRID = { width: 18, height: 12 };
export const FLOW_DEMO_PRESET_CHOICES = [
  'calm',
  'uniformDrift',
  'eddyField',
  'tidalOscillation',
  'meanderingJet',
  'hycomInspiredComposite'
];
export const FLOW_DEMO_DEFAULT_PRESETS = {
  static: 'currentCorridor',
  temporal: 'tidalOscillation'
};

export function getFlowDemoPresetConfig(mode = 'static', preset = null) {
  const normalizedMode = mode === 'temporal' ? 'temporal' : 'static';
  const presetId = preset ?? FLOW_DEMO_DEFAULT_PRESETS[normalizedMode];
  const temporal = normalizedMode === 'temporal';
  return getVectorPresetConfig(presetId, {
    temporalEvolution: temporal,
    currentVariability: temporal ? undefined : 0
  });
}

export function sampleDemoFlow(mode = 'static', x = 0, y = 0, time = 0, preset = null) {
  const presetConfig = getFlowDemoPresetConfig(mode, preset);
  return sampleCurrentField({
    x,
    y,
    time,
    grid: FLOW_DEMO_GRID,
    coordinates: CURRENT_COORDINATES.NORMALIZED,
    config: presetConfig
  });
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
  trailLimit = DEFAULT_TRAIL_LIMIT
} = {}) {
  if (!Array.isArray(particles)) return [];
  for (const particle of particles) {
    const flow = field(mode, particle.x, particle.y, time, preset);
    const glideBias = {
      u: 0.1 * Math.cos(particle.biasAngle),
      v: 0.1 * Math.sin(particle.biasAngle)
    };
    const u = (flow.u + glideBias.u) * particle.speedScale;
    const v = (flow.v + glideBias.v) * particle.speedScale;
    particle.x += u * dt * 0.18;
    particle.y += v * dt * 0.18;
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
