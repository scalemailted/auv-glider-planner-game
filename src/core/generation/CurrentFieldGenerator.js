import { generateFluidCurrentFrames, isFluidCurrentPattern } from '../fluids/FluidPresets.js';
import { buildTemporalFrameTimes } from '../time/TemporalFrameTimes.js';
import { createSeededRng } from '../random/SeededRng.js';

export function generateCurrentFrames(config = {}) {
  const width = clampInt(config.width, 2, 128);
  const height = clampInt(config.height, 2, 128);
  const dt = Math.max(0.1, Number(config.dt ?? 1));
  const duration = Math.max(1, Number(config.duration ?? 24));
  const frameTimes = buildTemporalFrameTimes({ duration, dt });
  const frameCount = frameTimes.length;
  const pattern = config.currentPattern ?? config.pattern ?? 'wave';
  if (config.currentGenerator?.type !== 'parametric' && (isFluidCurrentPattern(pattern) || config.currentGenerator?.type === 'fluid')) {
    return generateFluidCurrentFrames({ ...config, width, height, dt, duration });
  }
  return frameTimes.map((t, index) => ({
    t,
    current: generateCurrent(width, height, t, {
      ...config,
      frameIndex: index,
      frameCount,
      durationHours: duration,
      dtHours: dt
    })
  }));
}

export function generateCurrent(width, height, t, config = {}) {
  const pattern = config.currentPattern ?? config.pattern ?? 'wave';
  const strength = Number(config.currentStrength ?? config.strength ?? 1);
  const variability = currentVariability(config);
  const seedKey = currentSeedKey({ ...config, pattern, strength, variability }, width, height);
  const eddies = config.eddies ?? defaultEddies(width, height, seedKey);
  const terrain = config.terrain ?? [];
  const time = makeTimeContext(t, { ...config, pattern, strength, variability, seedKey });

  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    if (terrain[y]?.[x]) return [0, 0];
    return sampleGeneratedCurrent({ x, y, width, height, timeContext: time, config: { ...config, pattern, strength, variability, eddies, terrain } });
  }));
}

export function sampleGeneratedCurrent({ x = 0, y = 0, width = 1, height = 1, time = 0, timeContext = null, config = {} } = {}) {
  const pattern = config.currentPattern ?? config.pattern ?? config.currentGenerator?.currentPattern ?? 'wave';
  const strength = Number(config.currentStrength ?? config.strength ?? config.currentGenerator?.strength ?? 1);
  const variability = currentVariability(config);
  const seedKey = currentSeedKey({ ...config, pattern, strength, variability }, width, height);
  const eddies = config.eddies ?? defaultEddies(width, height, seedKey);
  const terrain = config.terrain ?? [];
  const cx = clamp(Number(x), 0, Math.max(0, Number(width) - 1));
  const cy = clamp(Number(y), 0, Math.max(0, Number(height) - 1));
  if (terrain[Math.round(cy)]?.[Math.round(cx)]) return [0, 0];
  const vector = currentAt(
    pattern,
    cx,
    cy,
    Math.max(1, Number(width) || 1),
    Math.max(1, Number(height) || 1),
    timeContext ?? makeTimeContext(time, { ...config, pattern, strength, variability, seedKey }),
    strength,
    variability,
    eddies,
    terrain
  );
  return [round(vector[0]), round(vector[1])];
}

function currentAt(pattern, x, y, width, height, time, strength, variability, eddies, terrain) {
  const { cycle, slowCycle, pulseCycle, seedDirection, jetPhase, noisePhase, stormPhase, stormCenterX, stormCenterY } = time;
  const tau = cycle;
  const temporal = variability > 0 ? 1 : 0;
  if (pattern === 'none' || pattern === 'calm') {
    return [
      strength * (0.025 * Math.cos(seedDirection) + 0.04 * temporal * Math.sin(slowCycle + y * 0.35)),
      strength * (0.025 * Math.sin(seedDirection) + 0.03 * temporal * Math.cos(slowCycle * 1.1 + x * 0.28))
    ];
  }
  if (pattern === 'uniform' || pattern === 'uniformDrift') {
    const direction = seedDirection + 0.28 * temporal * Math.sin(slowCycle);
    const magnitude = 0.3 + time.speedJitter * 0.16 + 0.12 * temporal * Math.sin(cycle * 0.7);
    return [
      Math.cos(direction) * magnitude * strength,
      Math.sin(direction) * magnitude * strength + 0.08 * temporal * Math.cos(cycle * 0.55) * strength
    ];
  }
  if (pattern === 'corridor') {
    const center = height * (0.5 + 0.08 * Math.sin(jetPhase) + 0.18 * temporal * Math.sin(slowCycle));
    const bend = Math.sin((x / Math.max(1, width - 1)) * Math.PI * 2 + cycle + jetPhase) * height * (0.04 + 0.06 * temporal);
    const band = Math.exp(-((y - center - bend) ** 2) / Math.max(1, height * 0.7));
    const pulse = 0.78 + 0.38 * temporal * Math.sin(pulseCycle);
    return [
      0.42 * strength * band * pulse * Math.cos(0.35 * Math.sin(slowCycle)),
      (0.12 * temporal * Math.sin(cycle + x * 0.18) + 0.1 * Math.cos((x / width) * Math.PI + cycle * 0.5)) * strength * band
    ];
  }
  if (pattern === 'meanderingJet') {
    const nx = x / Math.max(1, width - 1);
    const center = height * (0.5 + 0.2 * Math.sin(nx * Math.PI * 2.2 + cycle * 0.8 + jetPhase));
    const distance = y - center;
    const jet = Math.exp(-(distance ** 2) / Math.max(1, (height * 0.12) ** 2));
    const cross = 0.18 * temporal * Math.cos(nx * Math.PI * 2.2 + cycle * 0.8 + jetPhase);
    return [
      strength * (0.62 * jet + 0.08 * Math.sin(cycle + y * 0.25)),
      strength * cross * jet
    ];
  }
  if (pattern === 'shearFlow') {
    const shear = ((y / Math.max(1, height - 1)) - 0.5) * 2;
    const bandFlip = Math.sin((y / Math.max(1, height)) * Math.PI * 4 + cycle * 0.65 + jetPhase) > 0 ? 1 : -1;
    const reversal = Math.cos(slowCycle * 0.8);
    return [
      strength * ((0.22 * shear + 0.22 * bandFlip) * (0.7 + 0.35 * reversal) + 0.12 * temporal * Math.sin(cycle)),
      strength * 0.12 * temporal * Math.sin((x / width) * Math.PI * 2 + cycle)
    ];
  }
  if (pattern === 'doubleGyre') {
    const boundary = 0.5 + 0.05 * Math.sin(jetPhase) + 0.08 * temporal * Math.sin(slowCycle);
    const left = vortex(x, y, width * (boundary - 0.22 + 0.04 * Math.sin(cycle + jetPhase)), height * (0.5 + 0.06 * Math.cos(cycle + jetPhase)), strength * (1 + 0.25 * Math.sin(pulseCycle)));
    const right = vortex(x, y, width * (boundary + 0.22 + 0.04 * Math.cos(cycle + jetPhase)), height * (0.5 + 0.06 * Math.sin(cycle + jetPhase)), -strength * (1 + 0.25 * Math.cos(pulseCycle)));
    const meander = 0.12 * temporal * Math.sin((x / width) * Math.PI * 2 + cycle + jetPhase);
    return [left[0] + right[0] + meander, left[1] + right[1]];
  }
  if (pattern === 'tidalOscillation') {
    const phase = Math.sin(cycle + time.tidePhase);
    const cross = Math.cos(cycle + time.tidePhase) * 0.18;
    return [
      strength * phase * (0.42 + 0.08 * Math.sin(y * 0.4)),
      strength * cross * Math.cos((x / width) * Math.PI)
    ];
  }
  if (pattern === 'stormPulse') {
    const pulse = 0.15 + (0.45 + variability * 0.9) * Math.max(0, Math.sin(pulseCycle + stormPhase));
    const stormShift = (stormCenterX - 0.5) * width * 0.35 + Math.sin(slowCycle + stormPhase) * width * 0.18;
    return [
      strength * pulse * (0.45 + 0.18 * Math.sin(y * 0.6 + cycle)),
      strength * pulse * (0.18 * Math.cos((x - stormShift) * 0.5 - cycle * 0.8))
    ];
  }
  if (pattern === 'westernBoundaryCurrent') {
    const nx = x / Math.max(1, width - 1);
    const boundary = Math.exp(-((nx - 0.14) ** 2) / 0.018);
    const phase = Math.sin(cycle + y * 0.18 + jetPhase);
    const eddy = vortex(
      x,
      y,
      width * (0.28 + stormCenterX * 0.16 + 0.08 * Math.sin(slowCycle)),
      height * (0.45 + stormCenterY * 0.24 + 0.16 * Math.cos(cycle * 0.7)),
      -strength * (0.45 + variability * 0.35)
    );
    return [
      strength * (0.12 * phase + eddy[0] * 0.65),
      strength * (-0.68 * boundary * (0.78 + 0.22 * Math.sin(pulseCycle)) + eddy[1] * 0.65)
    ];
  }
  if (pattern === 'islandWake') {
    const island = terrainIslandCenter(terrain, width, height);
    const islandX = island.x;
    const islandY = island.y;
    const upstreamAngle = seedDirection * 0.28 + 0.62 * temporal * Math.sin(slowCycle);
    const relX = Math.cos(upstreamAngle) * (x - islandX) + Math.sin(upstreamAngle) * (y - islandY);
    const relY = -Math.sin(upstreamAngle) * (x - islandX) + Math.cos(upstreamAngle) * (y - islandY);
    const downstream = relX > 0 ? 1 : 0.28;
    const wake = Math.exp(-Math.abs(relY) / Math.max(1, height * 0.2)) * downstream * (0.65 + 0.55 * Math.sin(pulseCycle));
    const swirl = vortex(x, y, islandX, islandY, strength * (0.55 + variability * 0.45) * (0.65 + 0.45 * Math.cos(cycle)));
    return [
      strength * (0.38 * wake * Math.cos(upstreamAngle) + 0.14 * temporal * Math.sin(cycle)) + swirl[0] * 0.62,
      strength * (0.38 * wake * Math.sin(upstreamAngle)) + swirl[1] * 0.62 + strength * 0.14 * temporal * Math.sin(cycle + x * 0.25)
    ];
  }
  if (pattern === 'gulfInspired') {
    const loop = vortex(x, y, width * (0.58 + 0.12 * Math.sin(slowCycle + jetPhase)), height * (0.45 + 0.12 * Math.cos(slowCycle * 0.9 + jetPhase)), strength * (1 + 0.25 * Math.sin(pulseCycle)));
    const eddy = vortex(x, y, width * (0.28 + stormCenterX * 0.16 + 0.1 * Math.cos(cycle * 0.8 + jetPhase)), height * (0.58 + stormCenterY * 0.2 + 0.1 * Math.sin(cycle + jetPhase)), -strength * (0.75 + 0.25 * Math.cos(pulseCycle)));
    const band = Math.sin((y / Math.max(1, height)) * Math.PI);
    return [
      loop[0] + eddy[0] + strength * (0.22 * band + 0.16 * temporal * Math.sin((y / height) * Math.PI * 2 + cycle)),
      loop[1] + eddy[1] + strength * (0.18 * Math.cos((x / width) * Math.PI * 1.5 - cycle * 0.8))
    ];
  }
  if (pattern === 'hycomInspiredComposite') {
    const jet = currentAt('meanderingJet', x, y, width, height, time, strength * 0.85, variability, eddies, terrain);
    const gyre = currentAt('doubleGyre', x, y, width, height, time, strength * 0.42, variability, eddies, terrain);
    const boundary = currentAt('westernBoundaryCurrent', x, y, width, height, time, strength * 0.34, variability, eddies, terrain);
    const tide = currentAt('tidalOscillation', x, y, width, height, time, strength * 0.24, variability, eddies, terrain);
    const texture = currentAt('curlNoise', x, y, width, height, time, strength * 0.18, variability, eddies, terrain);
    return [
      jet[0] + gyre[0] + boundary[0] + tide[0] + texture[0],
      jet[1] + gyre[1] + boundary[1] + tide[1] + texture[1]
    ];
  }
  if (pattern === 'curlNoise') {
    const s1 = Math.sin(x * 0.72 + y * 0.31 + cycle + noisePhase);
    const s2 = Math.sin(x * 0.27 - y * 0.64 - slowCycle * 0.9 + noisePhase * 0.7);
    const c1 = Math.cos(x * 0.72 + y * 0.31 + cycle + noisePhase);
    const c2 = Math.cos(x * 0.27 - y * 0.64 - slowCycle * 0.9 + noisePhase * 0.7);
    return [
      strength * (0.18 * c1 * 0.31 - 0.22 * c2 * 0.64 + 0.08 * Math.sin(pulseCycle + y * 0.2)),
      strength * (-0.18 * c1 * 0.72 - 0.22 * c2 * 0.27 + 0.08 * Math.cos(pulseCycle + x * 0.2))
    ];
  }
  if (pattern === 'chaotic') {
    return [
      strength * (0.32 * Math.sin(x * 0.7 + y * 0.25 + cycle * 1.2 + noisePhase) + 0.22 * Math.cos(y * 0.5 - slowCycle + jetPhase)),
      strength * (0.32 * Math.cos(y * 0.65 - x * 0.2 + cycle + noisePhase) + 0.2 * Math.sin(x * 0.4 + pulseCycle + stormPhase))
    ];
  }
  if (pattern === 'vortex') {
    return vortex(
      x,
      y,
      width * (0.5 + 0.1 * Math.sin(jetPhase) + 0.16 * temporal * Math.sin(cycle)),
      height * (0.5 + 0.1 * Math.cos(jetPhase) + 0.16 * temporal * Math.cos(cycle)),
      strength * (0.85 + 0.3 * temporal * Math.sin(pulseCycle))
    );
  }
  if (pattern === 'eddies') {
    return eddies.reduce((sum, eddy, index) => {
      const driftPhase = cycle + index * 1.7 + jetPhase;
      const ex = eddy.x + Math.sin(driftPhase) * width * 0.16 * temporal;
      const ey = eddy.y + Math.cos(driftPhase * 0.85) * height * 0.14 * temporal;
      const eddyStrength = strength * eddy.strength * (0.65 + 0.45 * temporal * (0.5 + 0.5 * Math.sin(pulseCycle + index)));
      const [u, v] = vortex(x, y, ex, ey, eddyStrength);
      return [sum[0] + u, sum[1] + v];
    }, [0, 0]);
  }

  const u = Math.sin((y / height) * Math.PI * 2 + cycle) * 0.35 * strength;
  const v = Math.cos((x / width) * Math.PI * 2 - cycle) * 0.35 * strength;
  return [u, v];
}

function vortex(x, y, cx, cy, strength) {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const scale = Math.min(0.45, strength / dist);
  return [(-dy / dist) * scale, (dx / dist) * scale];
}

function terrainIslandCenter(terrain, width, height) {
  let count = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!terrain[y]?.[x]) continue;
      if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) continue;
      count += 1;
      sx += x;
      sy += y;
    }
  }
  return count ? { x: sx / count, y: sy / count } : { x: width * 0.45, y: height * 0.5 };
}

function defaultEddies(width, height, seedKey = 'anchor-current') {
  const rng = createSeededRng(`${seedKey}:eddy-centers`);
  const templates = [
    { x: 0.32, y: 0.36, strength: 0.9 },
    { x: 0.68, y: 0.62, strength: -0.75 },
    { x: 0.52, y: 0.48, strength: 0.45 }
  ];
  return templates.map((template) => ({
    x: clamp((template.x + (rng() - 0.5) * 0.22) * width, 0, Math.max(0, width - 1)),
    y: clamp((template.y + (rng() - 0.5) * 0.22) * height, 0, Math.max(0, height - 1)),
    strength: template.strength * (0.78 + rng() * 0.44)
  }));
}

function makeTimeContext(t, config = {}) {
  const frameCount = Math.max(1, Number(config.frameCount ?? 1));
  const frameIndex = Math.max(0, Number(config.frameIndex ?? 0));
  const duration = Math.max(1, Number(config.durationHours ?? config.duration ?? frameCount));
  const normalizedByFrame = frameCount > 1 ? frameIndex / (frameCount - 1) : 0;
  const normalizedByTime = Number.isFinite(Number(t)) ? clamp(Number(t) / duration, 0, 1) : normalizedByFrame;
  const phase = frameCount > 1 ? normalizedByFrame : normalizedByTime;
  const variability = currentVariability(config);
  const cycleCount = 0.85 + variability * 1.65;
  const seedKey = config.seedKey ?? currentSeedKey(config, config.width, config.height);
  const rng = createSeededRng(`${seedKey}:phases`);
  const seedPhase = rng() * Math.PI * 2;
  const jetPhase = rng() * Math.PI * 2;
  const tidePhase = rng() * Math.PI * 2;
  const noisePhase = rng() * Math.PI * 2;
  const stormPhase = rng() * Math.PI * 2;
  const cycle = phase * Math.PI * 2 * cycleCount + seedPhase;
  return {
    t: Number(t) || 0,
    frameIndex,
    frameCount,
    phase,
    cycle,
    slowCycle: cycle * 0.55 + Math.PI * 0.25,
    pulseCycle: cycle * (1.15 + variability * 0.75) + Math.PI * 0.5,
    seedKey,
    seedPhase,
    seedDirection: rng() * Math.PI * 2,
    speedJitter: rng(),
    jetPhase,
    tidePhase,
    noisePhase,
    stormPhase,
    stormCenterX: rng(),
    stormCenterY: rng()
  };
}

function currentSeedKey(config = {}, width = 1, height = 1) {
  const generator = config.currentGenerator ?? {};
  const anchor = config.seed
    ?? generator.seed
    ?? config.replaySeedAnchor
    ?? config.challengeId
    ?? config.instanceId
    ?? config.levelId
    ?? 'anchor-current';
  const preset = config.preset ?? generator.preset ?? config.currentPreset ?? config.vectorPreset ?? config.currentPattern ?? config.pattern ?? generator.currentPattern ?? 'current';
  const version = config.generationVersion ?? config.generatorVersion ?? generator.generationVersion ?? 'anchor-generator-v1';
  const strength = Number(config.currentStrength ?? config.strength ?? generator.strength ?? 1).toFixed(4);
  const variability = Number(config.currentVariability ?? config.variability ?? generator.variability ?? 0.5).toFixed(4);
  return `${anchor}:${preset}:${version}:${width}x${height}:s${strength}:v${variability}`;
}

function currentVariability(config = {}) {
  if (config.temporalEvolution === false || config.currentGenerator?.temporalEvolution === false) return 0;
  return clamp(Number(config.currentVariability ?? config.variability ?? config.currentGenerator?.variability ?? 0.5), 0, 1);
}

function round(value) {
  return Number(value.toFixed(3));
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampInt(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}
