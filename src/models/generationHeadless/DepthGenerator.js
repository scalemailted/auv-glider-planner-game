 function generateDepth(width, height, config = {}, random = Math.random) {
  const variation = Number(config.depthVariation ?? 0.45);
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const offshore = x / Math.max(1, width - 1);
    const wave = Math.sin((x + y) * 0.45) * variation * 0.18;
    const noise = (random() - 0.5) * variation * 0.18;
    return Number(Math.max(0.08, Math.min(1, 0.25 + offshore * 0.7 + wave + noise)).toFixed(3));
  }));
}

module.exports = {generateDepth}