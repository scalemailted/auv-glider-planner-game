export function hashSeed(value) {
  const text = String(value ?? 'anchor');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRng(seed) {
  let state = hashSeed(seed) || 1;
  return function next() {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) / 4294967296);
  };
}

export function seededUnit(seed) {
  return createSeededRng(seed)();
}
