export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function distance(a, b) { return Math.hypot(Number(a?.x ?? 0) - Number(b?.x ?? 0), Number(a?.y ?? 0) - Number(b?.y ?? 0)); }
export function normalize(x, y) { const mag = Math.hypot(Number(x), Number(y)); return mag <= 1e-9 || !Number.isFinite(mag) ? [0, 0] : [Number(x) / mag, Number(y) / mag]; }
export function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
