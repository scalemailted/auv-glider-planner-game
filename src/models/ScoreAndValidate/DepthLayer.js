 function sampleDepth(level, x, y) {
  const grid = level?.layers?.depth;
  if (!grid) return 1;
  const cx = Math.max(0, Math.min((level.world?.grid?.width ?? 1) - 1, Math.floor(x)));
  const cy = Math.max(0, Math.min((level.world?.grid?.height ?? 1) - 1, Math.floor(y)));
  const value = Number(grid[cy]?.[cx] ?? 1);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
}

 function depthEnergyMultiplier(level, mission, x, y) {
  const depth = sampleDepth(level, x, y);
  const config = mission?.rules?.depth ?? {};
  const shallowThreshold = Number(config.shallowThreshold ?? 0.28);
  const shallowPenalty = Number(config.shallowEnergyMultiplier ?? 1.35);
  const deepBonus = Number(config.deepEnergyMultiplier ?? 0.95);
  if (depth <= shallowThreshold) return shallowPenalty;
  if (depth >= 0.75) return deepBonus;
  return 1;
}

 function isTooShallow(level, mission, x, y) {
  const minimumDepth = mission?.rules?.depth?.minimumNavigableDepth;
  if (minimumDepth === undefined) return false;
  return sampleDepth(level, x, y) < Number(minimumDepth);
}

module.exports = {sampleDepth, depthEnergyMultiplier, isTooShallow}