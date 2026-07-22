const Random = require('./Random.js')
const TemporalFrameTimes = require('./TemporalFrameTimes.js')
const FluidField2D = require('./FluidField2D.js')
const FluidFieldExporter = require('./FluidFieldExporter.js')
const FLUID_PRESETS = [
  'eddyField',
  'shearFlow',
  'currentCorridor',
  'islandWake',
  'stormPulse'
];

 function isFluidCurrentPattern(pattern) {
  return pattern === 'fluid' || FLUID_PRESETS.includes(pattern);
}

 function normalizeFluidPreset(config = {}) {
  const pattern = config.currentPattern ?? config.pattern;
  const preset = config.fluidPreset ?? config.preset ?? (FLUID_PRESETS.includes(pattern) ? pattern : 'eddyField');
  return FLUID_PRESETS.includes(preset) ? preset : 'eddyField';
}

 function buildFluidGeneratorMetadata(config = {}) {
  return {
    type: 'fluid',
    preset: normalizeFluidPreset(config),
    seed: config.seed ?? null,
    strength: Number(config.currentStrength ?? config.strength ?? 1),
    viscosity: Number(config.fluidViscosity ?? config.viscosity ?? 0.0008),
    iterations: clampInt(config.fluidIterations ?? config.iterations ?? 8, 1, 32),
    vorticityConfinement: Number(config.fluidVorticityConfinement ?? config.vorticityConfinement ?? 0.08),
    vorticity: Number(config.fluidVorticityConfinement ?? config.vorticityConfinement ?? 0.08) > 0,
    synthetic: true,
    note: 'Synthetic fluid-inspired gameplay current field; not a real ocean model or HYCOM/Navier-Stokes product.'
  };
}

 function generateFluidCurrentFrames(config = {}) {
  const width = clampInt(config.width, 2, 128);
  const height = clampInt(config.height, 2, 128);
  const duration = Math.max(1, Number(config.duration ?? 24));
  const dt = Math.max(0.1, Number(config.dt ?? 1));
  const frameTimes = TemporalFrameTimes.buildTemporalFrameTimes({ duration, dt });
  const frameCount = frameTimes.length;
  const preset = normalizeFluidPreset(config);
  const strength = Number(config.currentStrength ?? config.strength ?? 1);
  const random = Random.createSeededRandom(`${config.seed ?? 1}:${preset}`);
  const field = new FluidField2D.FluidField2D({
    width,
    height,
    dt: Number(config.fluidDt ?? 0.22),
    viscosity: Number(config.fluidViscosity ?? config.viscosity ?? 0.0008),
    iterations: clampInt(config.fluidIterations ?? config.iterations ?? 8, 1, 32),
    wrapX: config.wrapX ?? preset !== 'islandWake',
    wrapY: config.wrapY ?? false,
    vorticityConfinement: Number(config.fluidVorticityConfinement ?? config.vorticityConfinement ?? 0.08)
  });
  seedPreset(field, preset, strength, random, config);
  const frames = [];
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    injectPresetForces(field, preset, strength, random, frameIndex, frameCount, config);
    for (let step = 0; step < clampInt(config.stepsPerFrame ?? 3, 1, 12); step += 1) {
      field.step();
      field.dampTerrain(config.terrain, 0.05);
    }
    const current = FluidFieldExporter.fieldToCurrentMatrix(field, { scale: Number(config.outputScale ?? 1), terrain: config.terrain });
    frames.push({
      t: frameTimes[frameIndex] ?? frameIndex * dt,
      current,
      currentStats: FluidFieldExporter.currentMagnitudeStats(current)
    });
  }
  return frames;
}

function seedPreset(field, preset, strength, random, config) {
  const width = field.width;
  const height = field.height;
  if (preset === 'shearFlow') {
    for (let y = 0; y < height; y += 1) {
      const band = (y / Math.max(1, height - 1)) - 0.5;
      for (let x = 0; x < width; x += 1) field.addForce(x, y, strength * (0.22 + band * 0.22), band * 0.06 * strength, 0.6);
    }
    return;
  }
  if (preset === 'currentCorridor') {
    for (let x = 0; x < width; x += 1) {
      field.addForce(x, height * 0.55, 0.5 * strength, 0.03 * strength, Math.max(1.5, height * 0.14));
    }
    return;
  }
  if (preset === 'islandWake') {
    field.addForce(width * 0.18, height * 0.5, 0.55 * strength, 0, Math.max(2, height * 0.42));
    field.addVortex(width * 0.55, height * 0.38, 0.45 * strength, Math.max(2, width * 0.2));
    field.addVortex(width * 0.58, height * 0.63, -0.45 * strength, Math.max(2, width * 0.2));
    return;
  }
  if (preset === 'stormPulse') {
    field.addForce(width * 0.45, height * 0.45, 0.55 * strength, 0.25 * strength, Math.max(2, width * 0.35));
    field.addVortex(width * 0.6, height * 0.45, 0.6 * strength, Math.max(2, width * 0.28));
    return;
  }
  const count = clampInt(config.fluidEddyCount ?? 5, 2, 12);
  for (let i = 0; i < count; i += 1) {
    field.addVortex(
      1 + random() * Math.max(1, width - 2),
      1 + random() * Math.max(1, height - 2),
      (random() > 0.5 ? 1 : -1) * strength * (0.35 + random() * 0.45),
      1.8 + random() * Math.max(width, height) * 0.22
    );
  }
  field.addForce(width * 0.2, height * 0.5, 0.15 * strength, 0.02 * strength, Math.max(2, height * 0.3));
}

function injectPresetForces(field, preset, strength, random, frameIndex, frameCount) {
  const width = field.width;
  const height = field.height;
  const phase = frameIndex / Math.max(1, frameCount - 1);
  if (preset === 'stormPulse') {
    const pulse = Math.sin(phase * Math.PI) ** 2;
    field.addForce(width * (0.25 + 0.45 * phase), height * (0.35 + 0.2 * Math.sin(phase * Math.PI * 2)), 0.45 * strength * pulse, 0.22 * strength * pulse, Math.max(2, width * 0.25));
    field.addVortex(width * (0.52 + 0.1 * Math.sin(phase * Math.PI)), height * 0.5, 0.35 * strength * pulse, Math.max(2, width * 0.25));
    return;
  }
  if (preset === 'currentCorridor') {
    field.addForce(width * 0.5, height * (0.52 + 0.08 * Math.sin(frameIndex * 0.45)), 0.16 * strength, 0.03 * strength * Math.cos(frameIndex * 0.3), Math.max(1.5, height * 0.16));
    return;
  }
  if (preset === 'islandWake') {
    field.addForce(width * 0.1, height * 0.5, 0.16 * strength, 0, Math.max(2, height * 0.4));
    field.addVortex(width * 0.62, height * (0.42 + 0.16 * Math.sin(frameIndex * 0.25)), 0.12 * strength, Math.max(1.5, width * 0.15));
    return;
  }
  if (preset === 'shearFlow') {
    field.addForce(width * random(), height * random(), 0.04 * strength, (random() - 0.5) * 0.05 * strength, 1.5);
    return;
  }
  if (frameIndex % 3 === 0) {
    field.addVortex(
      1 + random() * Math.max(1, width - 2),
      1 + random() * Math.max(1, height - 2),
      (random() > 0.5 ? 1 : -1) * 0.12 * strength,
      1.5 + random() * Math.max(width, height) * 0.14
    );
  }
}

function clampInt(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

module.exports = {isFluidCurrentPattern, normalizeFluidPreset, buildFluidGeneratorMetadata, generateFluidCurrentFrames}