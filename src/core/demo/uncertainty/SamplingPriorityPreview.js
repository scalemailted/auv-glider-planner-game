import { clamp01, createScalarField, fieldStats } from './UncertaintyFieldMath.js';

export const DEFAULT_SAMPLING_PRIORITY_WEIGHTS = {
  value: 0.24,
  uncertainty: 0.26,
  forecastValidation: 0.2,
  hiddenEvent: 0.22,
  staleness: 0.12,
  redundancy: 0.18
};

export function computeSamplingPriorityPreview({
  beliefMeanField,
  expectedUncertaintyField,
  forecastErrorField,
  surpriseField,
  unknownEventProbabilityField,
  stalenessField = null,
  observations = [],
  weights = DEFAULT_SAMPLING_PRIORITY_WEIGHTS
} = {}) {
  const width = Math.max(
    1,
    beliefMeanField?.[0]?.length ?? expectedUncertaintyField?.[0]?.length ?? forecastErrorField?.[0]?.length ?? 1
  );
  const height = Math.max(
    1,
    beliefMeanField?.length ?? expectedUncertaintyField?.length ?? forecastErrorField?.length ?? 1
  );
  const normalizedWeights = { ...DEFAULT_SAMPLING_PRIORITY_WEIGHTS, ...(weights ?? {}) };
  const recentSamplePenalty = recentSamplePenaltyField(observations, width, height);
  const components = {
    value: createScalarField(width, height, (x, y) => valueAt(beliefMeanField, x, y)),
    uncertainty: createScalarField(width, height, (x, y) => valueAt(expectedUncertaintyField, x, y)),
    forecastValidation: createScalarField(width, height, (x, y) => Math.max(valueAt(forecastErrorField, x, y), valueAt(surpriseField, x, y))),
    hiddenEvent: createScalarField(width, height, (x, y) => valueAt(unknownEventProbabilityField, x, y)),
    staleness: createScalarField(width, height, (x, y) => valueAt(stalenessField, x, y, 0)),
    recentSamplePenalty
  };
  const raw = createScalarField(width, height, (x, y) => {
    const priority =
      normalizedWeights.value * valueAt(components.value, x, y) +
      normalizedWeights.uncertainty * valueAt(components.uncertainty, x, y) +
      normalizedWeights.forecastValidation * valueAt(components.forecastValidation, x, y) +
      normalizedWeights.hiddenEvent * valueAt(components.hiddenEvent, x, y) +
      normalizedWeights.staleness * valueAt(components.staleness, x, y) -
      normalizedWeights.redundancy * valueAt(components.recentSamplePenalty, x, y);
    return clamp01(priority);
  });
  return {
    priorityField: raw,
    components,
    weights: normalizedWeights,
    stats: fieldStats(raw),
    explanation: 'Event intensity says how much phenomenon is present. Sampling priority says how useful it may be to sample there now. This preview is not route planning and has no travel-cost optimization.'
  };
}

function recentSamplePenaltyField(observations, width, height) {
  if (!Array.isArray(observations) || !observations.length) return createScalarField(width, height, 0);
  const points = observations
    .map((observation) => ({ x: Number(observation.x ?? observation.col), y: Number(observation.y ?? observation.row) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!points.length) return createScalarField(width, height, 0);
  return createScalarField(width, height, (x, y) => {
    const penalty = points.reduce((max, point) => {
      const d2 = (x - point.x) ** 2 + (y - point.y) ** 2;
      return Math.max(max, Math.exp(-d2 / (2 * 1.8 ** 2)));
    }, 0);
    return clamp01(penalty);
  });
}

function valueAt(field, x, y, fallback = 0) {
  const value = Number(field?.[y]?.[x]);
  return Number.isFinite(value) ? value : fallback;
}