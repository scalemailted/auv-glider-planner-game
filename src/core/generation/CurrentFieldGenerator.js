import { generateFluidCurrentFrames, isFluidCurrentPattern } from '../fluids/FluidPresets.js';
import { buildTemporalFrameTimes } from '../time/TemporalFrameTimes.js';

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
  const variability = clamp(Number(config.currentVariability ?? config.variability ?? config.currentGenerator?.variability ?? 0.5), 0, 1);
  const eddies = config.eddies ?? [];
  const terrain = config.terrain ?? [];
  const time = makeTimeContext(t, config);

  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    if (terrain[y]?.[x]) return [0, 0];
    const vector = currentAt(pattern, x, y, width, height, time, strength, variability, eddies, terrain);
    return [round(vector[0]), round(vector[1])];
  }));
}

function currentAt(pattern, x, y, width, height, time, strength, variability, eddies, terrain) {
  const { cycle, slowCycle, pulseCycle, frameIndex } = time;
  const tau = cycle;
  const temporal = variability > 0 ? 1 : 0;
  if (pattern === 'none' || pattern === 'calm') {
    return [
      strength * (0.04 + 0.04 * temporal * Math.sin(slowCycle + y * 0.35)),
      strength * (0.03 * temporal * Math.cos(slowCycle * 1.1 + x * 0.28))
    ];
  }
  if (pattern === 'uniform' || pattern === 'uniformDrift') {
    const direction = 0.28 * temporal * Math.sin(slowCycle);
    const magnitude = 0.34 + 0.12 * temporal * Math.sin(cycle * 0.7);
    return [
      Math.cos(direction) * magnitude * strength,
      Math.sin(direction) * magnitude * strength + 0.08 * temporal * Math.cos(cycle * 0.55) * strength
    ];
  }
  if (pattern === 'corridor') {
    const center = height * (0.5 + 0.22 * temporal * Math.sin(slowCycle));
    const bend = Math.sin((x / Math.max(1, width - 1)) * Math.PI * 2 + cycle) * height * 0.08 * temporal;
    const band = Math.exp(-((y - center - bend) ** 2) / Math.max(1, height * 0.7));
    const pulse = 0.78 + 0.38 * temporal * Math.sin(pulseCycle);
    return [
      0.42 * strength * band * pulse * Math.cos(0.35 * Math.sin(slowCycle)),
      (0.12 * temporal * Math.sin(cycle + x * 0.18) + 0.1 * Math.cos((x / width) * Math.PI + cycle * 0.5)) * strength * band
    ];
  }
  if (pattern === 'shearFlow') {
    const shear = ((y / Math.max(1, height - 1)) - 0.5) * 2;
    const bandFlip = Math.sin((y / Math.max(1, height)) * Math.PI * 4 + cycle * 0.65) > 0 ? 1 : -1;
    const reversal = Math.cos(slowCycle * 0.8);
    return [
      strength * ((0.22 * shear + 0.22 * bandFlip) * (0.7 + 0.35 * reversal) + 0.12 * temporal * Math.sin(cycle)),
      strength * 0.12 * temporal * Math.sin((x / width) * Math.PI * 2 + cycle)
    ];
  }
  if (pattern === 'doubleGyre') {
    const boundary = 0.5 + 0.08 * temporal * Math.sin(slowCycle);
    const left = vortex(x, y, width * (boundary - 0.22 + 0.04 * Math.sin(cycle)), height * (0.5 + 0.06 * Math.cos(cycle)), strength * (1 + 0.25 * Math.sin(pulseCycle)));
    const right = vortex(x, y, width * (boundary + 0.22 + 0.04 * Math.cos(cycle)), height * (0.5 + 0.06 * Math.sin(cycle)), -strength * (1 + 0.25 * Math.cos(pulseCycle)));
    const meander = 0.12 * temporal * Math.sin((x / width) * Math.PI * 2 + cycle);
    return [left[0] + right[0] + meander, left[1] + right[1]];
  }
  if (pattern === 'tidalOscillation') {
    const phase = Math.sin(cycle);
    const cross = Math.cos(cycle) * 0.18;
    return [
      strength * phase * (0.42 + 0.08 * Math.sin(y * 0.4)),
      strength * cross * Math.cos((x / width) * Math.PI)
    ];
  }
  if (pattern === 'stormPulse') {
    const pulse = 0.15 + (0.45 + variability * 0.9) * Math.max(0, Math.sin(pulseCycle));
    const stormShift = Math.sin(slowCycle) * width * 0.18;
    return [
      strength * pulse * (0.45 + 0.18 * Math.sin(y * 0.6 + cycle)),
      strength * pulse * (0.18 * Math.cos((x - stormShift) * 0.5 - cycle * 0.8))
    ];
  }
  if (pattern === 'islandWake') {
    const island = terrainIslandCenter(terrain, width, height);
    const islandX = island.x;
    const islandY = island.y;
    const upstreamAngle = 0.62 * temporal * Math.sin(slowCycle);
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
    const loop = vortex(x, y, width * (0.58 + 0.12 * Math.sin(slowCycle)), height * (0.45 + 0.12 * Math.cos(slowCycle * 0.9)), strength * (1 + 0.25 * Math.sin(pulseCycle)));
    const eddy = vortex(x, y, width * (0.32 + 0.1 * Math.cos(cycle * 0.8)), height * (0.68 + 0.1 * Math.sin(cycle)), -strength * (0.75 + 0.25 * Math.cos(pulseCycle)));
    const band = Math.sin((y / Math.max(1, height)) * Math.PI);
    return [
      loop[0] + eddy[0] + strength * (0.22 * band + 0.16 * temporal * Math.sin((y / height) * Math.PI * 2 + cycle)),
      loop[1] + eddy[1] + strength * (0.18 * Math.cos((x / width) * Math.PI * 1.5 - cycle * 0.8))
    ];
  }
  if (pattern === 'chaotic') {
    return [
      strength * (0.32 * Math.sin(x * 0.7 + y * 0.25 + cycle * 1.2) + 0.22 * Math.cos(y * 0.5 - slowCycle)),
      strength * (0.32 * Math.cos(y * 0.65 - x * 0.2 + cycle) + 0.2 * Math.sin(x * 0.4 + pulseCycle))
    ];
  }
  if (pattern === 'vortex') {
    return vortex(
      x,
      y,
      width * (0.5 + 0.16 * temporal * Math.sin(cycle)),
      height * (0.5 + 0.16 * temporal * Math.cos(cycle)),
      strength * (0.85 + 0.3 * temporal * Math.sin(pulseCycle))
    );
  }
  if (pattern === 'eddies') {
    return eddies.reduce((sum, eddy, index) => {
      const driftPhase = cycle + index * 1.7;
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

function makeTimeContext(t, config = {}) {
  const frameCount = Math.max(1, Number(config.frameCount ?? 1));
  const frameIndex = Math.max(0, Number(config.frameIndex ?? 0));
  const duration = Math.max(1, Number(config.durationHours ?? config.duration ?? frameCount));
  const normalizedByFrame = frameCount > 1 ? frameIndex / (frameCount - 1) : 0;
  const normalizedByTime = Number.isFinite(Number(t)) ? clamp(Number(t) / duration, 0, 1) : normalizedByFrame;
  const phase = frameCount > 1 ? normalizedByFrame : normalizedByTime;
  const variability = clamp(Number(config.currentVariability ?? config.variability ?? config.currentGenerator?.variability ?? 0.5), 0, 1);
  const cycleCount = 0.85 + variability * 1.65;
  const cycle = phase * Math.PI * 2 * cycleCount;
  return {
    t: Number(t) || 0,
    frameIndex,
    frameCount,
    phase,
    cycle,
    slowCycle: cycle * 0.55 + Math.PI * 0.25,
    pulseCycle: cycle * (1.15 + variability * 0.75) + Math.PI * 0.5
  };
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
