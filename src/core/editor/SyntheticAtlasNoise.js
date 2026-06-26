export const SYNTHETIC_ATLAS_NOISE_VERSION = 'synthetic-atlas-noise-r1-1';

export function hashStringToUint32(value = '') {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededHash(seed = '', ...values) {
  let hash = hashStringToUint32(seed);
  for (const value of values) {
    hash ^= hashStringToUint32(String(value));
    hash = Math.imul(hash, 16777619);
    hash ^= hash >>> 13;
  }
  return hash >>> 0;
}

export function seededUnit(seed = '', ...values) {
  return (seededHash(seed, ...values) >>> 0) / 4294967295;
}

export function hash2D(seed = '', x = 0, y = 0) {
  return seededUnit(seed, Math.floor(Number(x) || 0), Math.floor(Number(y) || 0));
}

export function clamp(value, min = 0, max = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function lerp(a, b, t) {
  return Number(a) + (Number(b) - Number(a)) * Number(t);
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((Number(value) - Number(edge0)) / Math.max(1e-9, Number(edge1) - Number(edge0)));
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(seed = '', x = 0, y = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const sx = smoothstep(0, 1, xf);
  const sy = smoothstep(0, 1, yf);
  const n00 = hash2D(seed, xi, yi);
  const n10 = hash2D(seed, xi + 1, yi);
  const n01 = hash2D(seed, xi, yi + 1);
  const n11 = hash2D(seed, xi + 1, yi + 1);
  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
}

export function fractalBrownianMotion2D(seed = '', x = 0, y = 0, options = {}) {
  const octaves = Math.max(1, Math.floor(Number(options.octaves ?? 4)));
  let frequency = Number(options.frequency ?? 1);
  let amplitude = 1;
  let total = 0;
  let normalizer = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise2D(`${seed}:fbm:${octave}`, x * frequency, y * frequency) * amplitude;
    normalizer += amplitude;
    frequency *= Number(options.lacunarity ?? 2);
    amplitude *= Number(options.persistence ?? 0.5);
  }
  return normalizer > 0 ? total / normalizer : 0;
}

export function domainWarp2D(seed = '', x = 0, y = 0, options = {}) {
  const strength = Number(options.strength ?? 0.08);
  const frequency = Number(options.frequency ?? 2);
  const wx = (fractalBrownianMotion2D(`${seed}:warp:x`, x * frequency, y * frequency, { octaves: 3 }) - 0.5) * strength;
  const wy = (fractalBrownianMotion2D(`${seed}:warp:y`, x * frequency, y * frequency, { octaves: 3 }) - 0.5) * strength;
  return { x: x + wx, y: y + wy, dx: wx, dy: wy };
}

export function ridgedNoise2D(seed = '', x = 0, y = 0, options = {}) {
  const base = fractalBrownianMotion2D(seed, x, y, options);
  return clamp(1 - Math.abs(base * 2 - 1));
}

export function worleyDistance2D(seed = '', x = 0, y = 0, options = {}) {
  const cells = Math.max(2, Math.floor(Number(options.cells ?? 8)));
  const gx = Math.floor(x * cells);
  const gy = Math.floor(y * cells);
  let best = Infinity;
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      const cx = gx + ox;
      const cy = gy + oy;
      const px = (cx + seededUnit(`${seed}:worley:x`, cx, cy)) / cells;
      const py = (cy + seededUnit(`${seed}:worley:y`, cx, cy)) / cells;
      const dx = x - px;
      const dy = y - py;
      best = Math.min(best, Math.sqrt(dx * dx + dy * dy));
    }
  }
  return clamp(best * cells / Math.SQRT2);
}

export function seededFeaturePoints(seed = '', options = {}) {
  const count = Math.max(0, Math.floor(Number(options.count ?? 8)));
  const minDistance = Number(options.minDistance ?? 0.08);
  const bounds = options.bounds ?? { xMin: 0, yMin: 0, xMax: 1, yMax: 1 };
  const attempts = Math.max(count * 12, Number(options.attempts ?? count * 20));
  const candidates = [];
  for (let index = 0; index < attempts; index += 1) {
    const x = lerp(bounds.xMin, bounds.xMax, seededUnit(`${seed}:point:x`, index));
    const y = lerp(bounds.yMin, bounds.yMax, seededUnit(`${seed}:point:y`, index));
    const rank = seededUnit(`${seed}:point:rank`, index);
    candidates.push({ x, y, rank });
  }
  candidates.sort((a, b) => a.rank - b.rank);
  const accepted = [];
  for (const candidate of candidates) {
    if (accepted.length >= count) break;
    const farEnough = accepted.every((point) => {
      const dx = candidate.x - point.x;
      const dy = candidate.y - point.y;
      return Math.sqrt(dx * dx + dy * dy) >= minDistance;
    });
    if (farEnough) accepted.push({ x: round(candidate.x), y: round(candidate.y) });
  }
  return accepted;
}

export function gaussian2D(x, y, cx, cy, sx, sy) {
  const dx = (Number(x) - Number(cx)) / Math.max(1e-6, Number(sx));
  const dy = (Number(y) - Number(cy)) / Math.max(1e-6, Number(sy));
  return Math.exp(-0.5 * (dx * dx + dy * dy));
}

export function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = c2 > 0 ? clamp(c1 / c2) : 0;
  const x = ax + t * vx;
  const y = ay + t * vy;
  const dx = px - x;
  const dy = py - y;
  return { distance: Math.sqrt(dx * dx + dy * dy), t };
}

export function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}
