export const DEFAULT_CURRENT_STATS_THRESHOLDS = {
  nearCalmThreshold: 0.05,
  strongCurrentThreshold: 0.75
};

export function computeCurrentMagnitudeStats(currentMatrix, config = {}) {
  const thresholds = { ...DEFAULT_CURRENT_STATS_THRESHOLDS, ...(config.thresholds ?? {}) };
  const speeds = [];
  for (const row of currentMatrix ?? []) {
    for (const cell of row ?? []) {
      speeds.push(Math.hypot(Number(cell?.[0] ?? 0), Number(cell?.[1] ?? 0)));
    }
  }
  return buildStatsFromSpeeds(speeds, thresholds);
}

export function computeCurrentFrameSetStats(frames, config = {}) {
  const thresholds = { ...DEFAULT_CURRENT_STATS_THRESHOLDS, ...(config.thresholds ?? {}) };
  const speeds = [];
  for (const frame of frames ?? []) {
    for (const row of frame.current ?? []) {
      for (const cell of row ?? []) {
        speeds.push(Math.hypot(Number(cell?.[0] ?? 0), Number(cell?.[1] ?? 0)));
      }
    }
  }
  return buildStatsFromSpeeds(speeds, thresholds);
}

export function classifyCurrentField(stats) {
  const mean = Number(stats?.meanSpeed ?? 0);
  const std = Number(stats?.stdSpeed ?? 0);
  const strongRatio = Number(stats?.strongCellRatio ?? 0);
  if (mean < 0.08) return 'Calm';
  if (mean < 0.2) return 'Gentle';
  if (mean < 0.5 && std < 0.35) return 'Moderate';
  if (mean < 0.9 && strongRatio < 0.35) return 'Strong';
  return 'Chaotic';
}

export function buildCurrentFieldWarnings(stats) {
  const warnings = [];
  const mean = Number(stats?.meanSpeed ?? 0);
  const max = Number(stats?.maxSpeed ?? 0);
  const std = Number(stats?.stdSpeed ?? 0);
  const calmRatio = Number(stats?.calmCellRatio ?? 0);
  const strongRatio = Number(stats?.strongCellRatio ?? 0);
  if (mean < 0.08 || calmRatio > 0.75) warnings.push('Field may be too calm to affect planning.');
  if (mean > 0.9 || max > 1.35 || strongRatio > 0.3) warnings.push('Field may be too strong for low-power gliders.');
  if (std < 0.06 && mean > 0.08) warnings.push('Field is highly uniform; routing puzzle may be less interesting.');
  if (std > 0.22 && mean >= 0.15 && mean <= 0.9) warnings.push('High variation: good for drift/strategy challenge.');
  return warnings;
}

export function summarizeCurrentField(stats) {
  const classification = stats?.classification ?? classifyCurrentField(stats);
  const mean = formatNumber(stats?.meanSpeed);
  const max = formatNumber(stats?.maxSpeed);
  const strong = formatPercent(stats?.strongCellRatio);
  return `${classification}: mean ${mean}, max ${max}, strong-current cells ${strong}`;
}

function buildStatsFromSpeeds(rawSpeeds, thresholds) {
  const speeds = rawSpeeds.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const count = speeds.length;
  const minSpeed = count ? speeds[0] : 0;
  const maxSpeed = count ? speeds[count - 1] : 0;
  const meanSpeed = count ? speeds.reduce((sum, value) => sum + value, 0) / count : 0;
  const medianSpeed = count ? median(speeds) : 0;
  const variance = count ? speeds.reduce((sum, value) => sum + (value - meanSpeed) ** 2, 0) / count : 0;
  const stdSpeed = Math.sqrt(variance);
  const calmCellRatio = count ? speeds.filter((value) => value < thresholds.nearCalmThreshold).length / count : 0;
  const strongCellRatio = count ? speeds.filter((value) => value > thresholds.strongCurrentThreshold).length / count : 0;
  const stats = {
    minSpeed: round(minSpeed),
    maxSpeed: round(maxSpeed),
    meanSpeed: round(meanSpeed),
    medianSpeed: round(medianSpeed),
    stdSpeed: round(stdSpeed),
    calmCellRatio: round(calmCellRatio),
    strongCellRatio: round(strongCellRatio),
    nearCalmThreshold: thresholds.nearCalmThreshold,
    strongCurrentThreshold: thresholds.strongCurrentThreshold
  };
  stats.classification = classifyCurrentField(stats);
  stats.warnings = buildCurrentFieldWarnings(stats);
  return stats;
}

function median(values) {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function formatNumber(value) {
  return Number(value ?? 0).toFixed(2);
}

function formatPercent(value) {
  return `${Math.round(Number(value ?? 0) * 100)}%`;
}

function round(value) {
  return Number(Number(value).toFixed(3));
}
