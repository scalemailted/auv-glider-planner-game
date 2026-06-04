export function normalizeForecastRules(missionOrRules = null) {
  const rules = missionOrRules?.rules?.forecast ?? missionOrRules?.forecast ?? missionOrRules ?? {};
  const enabled = rules.enabled ?? rules.mode === 'decay';
  return {
    mode: enabled === false ? 'none' : rules.mode ?? 'none',
    initialConfidence: clamp01(Number(rules.initialConfidence ?? 0.95)),
    minConfidence: clamp01(Number(rules.minConfidence ?? 0.35)),
    decayRate: Math.max(0, Number(rules.decayRate ?? 0.04)),
    decayModel: rules.decayModel === 'linear' ? 'linear' : 'exponential',
    updateOnSurfacing: rules.updateOnSurfacing !== false
  };
}

export function getForecastConfidenceAtTime(t = 0, forecastRules = null, { updateTime = 0 } = {}) {
  const rules = normalizeForecastRules(forecastRules);
  if (rules.mode !== 'decay') return 1;
  const horizon = Math.max(0, Number(t ?? 0) - Number(updateTime ?? 0));
  const raw = rules.decayModel === 'linear'
    ? rules.initialConfidence - rules.decayRate * horizon
    : rules.initialConfidence * Math.exp(-rules.decayRate * horizon);
  return round01(Math.max(rules.minConfidence, Math.min(rules.initialConfidence, raw)));
}

export function applyForecastDecayToFrames(frames = [], forecastRules = null) {
  const rules = normalizeForecastRules(forecastRules);
  if (rules.mode !== 'decay') return frames;
  return (frames ?? []).map((frame) => {
    const confidenceScale = getForecastConfidenceAtTime(frame.t ?? 0, rules);
    return {
      ...frame,
      confidence: mapGrid(frame.confidence ?? frame.roi, (value) => {
        const base = typeof value === 'number' ? value : Number(value?.probability ?? 1);
        return round01(Math.min(base, confidenceScale));
      }),
      uncertainty: mapGrid(frame.confidence ?? frame.roi, (value) => {
        const base = typeof value === 'number' ? value : Number(value?.probability ?? 1);
        return round01(1 - Math.min(base, confidenceScale));
      }),
      roi: mapGrid(frame.roi, (cell) => applyConfidenceToRoi(cell, confidenceScale)),
      forecastConfidence: confidenceScale
    };
  });
}

function applyConfidenceToRoi(cell, confidence) {
  if (cell && typeof cell === 'object') {
    const value = clamp01(Number(cell.value ?? cell.expectedValue ?? 0));
    const probability = clamp01(Number(cell.probability ?? 1) * confidence);
    return {
      ...cell,
      value,
      probability: round01(probability),
      expectedValue: round01(value * probability)
    };
  }
  const value = clamp01(Number(cell ?? 0));
  if (value <= 0) return 0;
  return {
    value: round01(value),
    probability: round01(confidence),
    expectedValue: round01(value * confidence)
  };
}

function mapGrid(grid, mapper) {
  return (grid ?? []).map((row) => (row ?? []).map(mapper));
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round01(value) {
  return Number(clamp01(value).toFixed(3));
}
