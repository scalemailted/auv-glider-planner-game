import { clamp01, cloneScalarField, createScalarField } from './UncertaintyFieldMath.js';

export const BELIEF_UPDATE_MODELS = [
  'noUpdate',
  'nearestSampleBlend',
  'kernelSmoother',
  'bayesianCellUpdateLite'
];

export function normalizeBeliefUpdateModel(model) {
  const value = String(model ?? '').trim();
  const legacyMap = {
    none: 'noUpdate',
    localSample: 'nearestSampleBlend',
    neighborUpdate: 'kernelSmoother',
    surfaceUpdate: 'kernelSmoother',
    globalRefresh: 'bayesianCellUpdateLite'
  };
  if (BELIEF_UPDATE_MODELS.includes(value)) return value;
  return legacyMap[value] ?? 'kernelSmoother';
}

export function beliefUpdateModelLabel(model) {
  return {
    noUpdate: 'No Update',
    nearestSampleBlend: 'Nearest Sample Blend',
    kernelSmoother: 'Kernel Smoother',
    bayesianCellUpdateLite: 'Bayesian-Lite Cell Update'
  }[normalizeBeliefUpdateModel(model)] ?? 'Kernel Smoother';
}

export function updateBeliefFromObservations({
  forecastField,
  priorBeliefField = null,
  priorUncertaintyField,
  observations = [],
  model = 'kernelSmoother',
  lengthScale = 2.5,
  sensorNoise = 0.08,
  confidence = 0.72,
  stalenessRate = 0.01,
  time = 0
} = {}) {
  const updateModel = normalizeBeliefUpdateModel(model);
  const width = Math.max(1, forecastField?.[0]?.length ?? priorBeliefField?.[0]?.length ?? priorUncertaintyField?.[0]?.length ?? 1);
  const height = Math.max(1, forecastField?.length ?? priorBeliefField?.length ?? priorUncertaintyField?.length ?? 1);
  const priorBelief = priorBeliefField ? cloneScalarField(priorBeliefField) : cloneScalarField(forecastField);
  const priorUncertainty = priorUncertaintyField ? cloneScalarField(priorUncertaintyField) : createScalarField(width, height, 0.45);
  const normalizedObservations = normalizeObservations(observations);
  const radius = Math.max(0.3, Number(lengthScale) || 2.5);
  const observationNoise = Math.max(0.001, Number(sensorNoise) || 0.001);
  const trust = clamp01(confidence);
  const now = Number(time) || 0;

  if (updateModel === 'noUpdate' || !normalizedObservations.length) {
    return {
      beliefMeanField: priorBelief,
      expectedUncertaintyField: createScalarField(width, height, (x, y) => clamp01(valueAt(priorUncertainty, x, y) + Math.max(0, stalenessRate) * 0.5)),
      updateDiagnostics: diagnostics(updateModel, normalizedObservations.length, 0, 'No observations changed the belief state.')
    };
  }

  let totalInfluence = 0;
  const beliefMeanField = createScalarField(width, height, (x, y) => {
    const prior = clamp01(valueAt(priorBelief, x, y));
    const kernel = observationKernel(normalizedObservations, x, y, radius, now);
    totalInfluence += kernel.influence;
    if (kernel.influence <= 0.0001) return prior;
    if (updateModel === 'nearestSampleBlend') {
      const nearest = nearestObservation(normalizedObservations, x, y);
      const weight = trust * Math.exp(-(nearest.distance ** 2) / (2 * radius ** 2));
      return clamp01(prior * (1 - weight) + nearest.observation.observedValue * weight);
    }
    if (updateModel === 'bayesianCellUpdateLite') {
      const priorVariance = Math.max(0.0001, valueAt(priorUncertainty, x, y, 0.4) ** 2);
      const sampleVariance = Math.max(0.0001, observationNoise ** 2 / Math.max(0.2, kernel.influence));
      const posterior = (prior / priorVariance + kernel.mean / sampleVariance) / (1 / priorVariance + 1 / sampleVariance);
      const weight = clamp01(trust * Math.min(1, kernel.influence));
      return clamp01(prior * (1 - weight) + posterior * weight);
    }
    const weight = clamp01(trust * kernel.influence / (kernel.influence + 0.35));
    return clamp01(prior * (1 - weight) + kernel.mean * weight);
  });

  const expectedUncertaintyField = createScalarField(width, height, (x, y) => {
    const prior = clamp01(valueAt(priorUncertainty, x, y, 0.45));
    const kernel = observationKernel(normalizedObservations, x, y, radius, now);
    const recent = kernel.influence;
    const lastAge = kernel.youngestAge;
    const staleness = clamp01(Math.max(0, stalenessRate) * Math.max(0, lastAge));
    const reduction = clamp01(trust * Math.min(0.88, recent / (recent + 0.25)));
    const noiseFloor = clamp01(observationNoise * 0.6);
    return clamp01(Math.max(noiseFloor, prior * (1 - reduction)) + staleness);
  });

  return {
    beliefMeanField,
    expectedUncertaintyField,
    updateDiagnostics: diagnostics(
      updateModel,
      normalizedObservations.length,
      totalInfluence / Math.max(1, width * height),
      'Kernel smoother / Bayesian-lite educational update, not a production GP/GMRF solver.'
    )
  };
}

function diagnostics(model, observationCount, meanInfluence, note) {
  return {
    model,
    modelLabel: beliefUpdateModelLabel(model),
    observationCount,
    meanInfluence: round6(meanInfluence),
    claimLevel: 'educational_belief_update',
    note,
    notA: 'Not a production GP solver, GMRF solver, Kalman filter, EnKF, calibrated data-assimilation system, or route planner.',
    usesProductionGp: false,
    usesProductionGmrf: false
  };
}

function observationKernel(observations, x, y, lengthScale, now) {
  let weighted = 0;
  let total = 0;
  let youngestAge = Infinity;
  for (const observation of observations) {
    const d2 = (x - observation.x) ** 2 + (y - observation.y) ** 2;
    const weight = Math.exp(-d2 / (2 * lengthScale ** 2));
    weighted += weight * observation.observedValue;
    total += weight;
    youngestAge = Math.min(youngestAge, Math.max(0, now - observation.time));
  }
  return {
    mean: total > 0 ? weighted / total : 0,
    influence: total,
    youngestAge: Number.isFinite(youngestAge) ? youngestAge : 0
  };
}

function nearestObservation(observations, x, y) {
  return observations.reduce((best, observation) => {
    const distance = Math.hypot(x - observation.x, y - observation.y);
    return distance < best.distance ? { observation, distance } : best;
  }, { observation: observations[0], distance: Infinity });
}

function normalizeObservations(observations) {
  return observations
    .map((observation) => {
      const x = Number(observation.x ?? observation.col);
      const y = Number(observation.y ?? observation.row);
      const observedValue = clamp01(observation.observedValue ?? observation.value ?? observation.truthValue ?? 0);
      const time = Number(observation.time ?? observation.t ?? 0) || 0;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { ...observation, x, y, observedValue, time };
    })
    .filter(Boolean);
}

function valueAt(field, x, y, fallback = 0) {
  const value = Number(field?.[y]?.[x]);
  return Number.isFinite(value) ? value : fallback;
}

function round6(value) {
  return Number((Number(value) || 0).toFixed(6));
}