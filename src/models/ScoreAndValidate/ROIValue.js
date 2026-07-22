 function normalizeROIValue(cell) {
  if (cell && typeof cell === 'object') {
    const value = clamp01(Number(cell.value ?? cell.rewardValue ?? cell.expectedValue ?? 0));
    const probability = clamp01(Number(cell.probability ?? 1));
    return {
      value,
      probability,
      expectedValue: clamp01(Number(cell.expectedValue ?? value * probability))
    };
  }
  const value = clamp01(Number(cell ?? 0));
  return { value, probability: 1, expectedValue: value };
}

 function roiScalar(cell, mode = 'expectedValue') {
  const roi = normalizeROIValue(cell);
  if (mode === 'value') return roi.value;
  if (mode === 'probability') return roi.probability;
  return roi.expectedValue;
}

 function normalizeROIGrid(grid, probabilityMode = 'certain', random = Math.random) {
  return (grid ?? []).map((row) => row.map((cell) => {
    const roi = normalizeROIValue(cell);
    if (cell && typeof cell === 'object') return roi;
    const probability = probabilityMode === 'variable'
      ? clamp01(0.35 + random() * 0.65)
      : 1;
    return {
      value: roi.value,
      probability,
      expectedValue: round01(roi.value * probability)
    };
  }));
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round01(value) {
  return Number(clamp01(value).toFixed(3));
}

module.exports = {normalizeROIValue, roiScalar, normalizeROIGrid}