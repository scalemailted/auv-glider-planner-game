export function computeForecastRegret(referenceScore, actualScore) {
  if (!Number.isFinite(referenceScore) || !Number.isFinite(actualScore)) return null;
  return Number((referenceScore - actualScore).toFixed(2));
}

export function computeRegretRatio(referenceScore, actualScore) {
  if (!Number.isFinite(referenceScore) || !Number.isFinite(actualScore) || Math.abs(referenceScore) < 1e-9) return null;
  return Number(((referenceScore - actualScore) / Math.abs(referenceScore)).toFixed(3));
}

export function formatRegretMetric(value) {
  return value === null || value === undefined ? 'N/A' : String(value);
}
