 function createSeededRandom(seed = 1) {
  let state = hashSeed(seed);
  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

 function hashSeed(seed) {
  const text = String(seed ?? 1);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

module.exports = {createSeededRandom, hashSeed}