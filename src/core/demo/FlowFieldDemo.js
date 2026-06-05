import { createSeededRng } from '../random/SeededRng.js';

const TAU = Math.PI * 2;
const DEFAULT_TRAIL_LIMIT = 44;

export function sampleDemoFlow(mode = 'static', x = 0, y = 0, time = 0) {
  return mode === 'temporal'
    ? sampleTemporalFlow(x, y, time)
    : sampleStaticFlow(x, y);
}

export function sampleStaticFlow(x = 0, y = 0) {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const eddy = {
    u: -dy * 0.9,
    v: dx * 0.9
  };
  const channel = {
    u: 0.58 + 0.22 * Math.sin(y * TAU * 1.7),
    v: 0.1 * Math.cos(x * TAU * 1.2)
  };
  return clampVector({
    u: channel.u + eddy.u,
    v: channel.v + eddy.v
  }, 1.1);
}

export function sampleTemporalFlow(x = 0, y = 0, time = 0) {
  const phase = time * 0.55;
  const tide = Math.sin(phase);
  const gyre = Math.cos(phase * 0.72);
  return clampVector({
    u: 0.46 * tide + 0.38 * Math.sin(y * TAU * 1.5 + phase) - 0.2 * (y - 0.5) * gyre,
    v: 0.32 * gyre + 0.34 * Math.cos(x * TAU * 1.3 - phase * 0.8) + 0.18 * (x - 0.5) * tide
  }, 1.05);
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
  trailLimit = DEFAULT_TRAIL_LIMIT
} = {}) {
  if (!Array.isArray(particles)) return [];
  for (const particle of particles) {
    const flow = field(mode, particle.x, particle.y, time);
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

function clampVector(vector, maxMagnitude) {
  const magnitude = Math.hypot(vector.u, vector.v);
  if (!Number.isFinite(magnitude) || magnitude <= maxMagnitude) return vector;
  const scale = maxMagnitude / magnitude;
  return {
    u: vector.u * scale,
    v: vector.v * scale
  };
}
