const FluidFieldStats = require('./FluidFieldStats.js')
function fieldToCurrentMatrix(field, config = {}) {
  const scale = Number(config.scale ?? 1);
  const terrain = config.terrain ?? null;
  return Array.from({ length: field.height }, (_, y) => Array.from({ length: field.width }, (_, x) => {
    const [u, v] = field.getVelocity(x, y);
    const blocked = terrain?.[y]?.[x];
    return [
      round(blocked ? 0 : u * scale),
      round(blocked ? 0 : v * scale)
    ];
  }));
}

 function currentMagnitudeStats(current) {
  const stats = FluidFieldStats.computeCurrentMagnitudeStats(current);
  return {
    min: stats.minSpeed,
    max: stats.maxSpeed,
    mean: stats.meanSpeed,
    median: stats.medianSpeed,
    std: stats.stdSpeed,
    calmCellRatio: stats.calmCellRatio,
    strongCellRatio: stats.strongCellRatio,
    classification: stats.classification,
    warnings: stats.warnings
  };
}

function round(value) {
  return Number(value.toFixed(3));
}

module.exports = {currentMagnitudeStats}