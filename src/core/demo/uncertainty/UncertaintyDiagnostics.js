import {
  absFieldDifference,
  clamp01,
  createScalarField,
  fieldStats,
  smoothKernelFieldFromObservations
} from './UncertaintyFieldMath.js';

export function computeInnovationField({ observations = [], width = 24, height = 16, lengthScale = 2.5 } = {}) {
  const obs = normalizeObservations(observations).map((observation) => ({
    ...observation,
    value: clamp01(0.5 + observation.innovation * 0.5)
  }));
  return smoothKernelFieldFromObservations(obs, width, height, { lengthScale, fallback: 0.5 });
}

export function computeSurpriseField({ observations = [], width = 24, height = 16, lengthScale = 2.5 } = {}) {
  const obs = normalizeObservations(observations).map((observation) => ({
    ...observation,
    value: clamp01((observation.surprise ?? 0) / 4)
  }));
  return smoothKernelFieldFromObservations(obs, width, height, { lengthScale, fallback: 0 });
}

export function computeForecastErrorField({
  forecastField,
  hiddenTruthField = null,
  observations = [],
  width = null,
  height = null,
  lengthScale = 2.5
} = {}) {
  if (hiddenTruthField && forecastField) return absFieldDifference(hiddenTruthField, forecastField);
  const w = Math.max(1, Number(width ?? forecastField?.[0]?.length ?? 24) || 24);
  const h = Math.max(1, Number(height ?? forecastField?.length ?? 16) || 16);
  const obs = normalizeObservations(observations).map((observation) => ({
    ...observation,
    value: clamp01(Math.abs(observation.innovation))
  }));
  return smoothKernelFieldFromObservations(obs, w, h, { lengthScale, fallback: 0 });
}

export function computeUnknownEventProbabilityField({
  forecastField,
  surpriseField,
  observations = [],
  width = null,
  height = null,
  scenarioId = null,
  lengthScale = 2.5
} = {}) {
  const w = Math.max(1, Number(width ?? forecastField?.[0]?.length ?? surpriseField?.[0]?.length ?? 24) || 24);
  const h = Math.max(1, Number(height ?? forecastField?.length ?? surpriseField?.length ?? 16) || 16);
  const obs = normalizeObservations(observations);
  const density = observationDensityField(obs, w, h, lengthScale);
  const coherentEnough = obs.length >= 3 ? 1 : obs.length >= 2 ? 0.45 : 0.08;
  const hiddenScenarioBoost = scenarioId === 'hiddenPlume' || scenarioId === 'hiddenBloomLayer' ? 0.12 : 0;
  const falseAlarmDampener = scenarioId === 'noisyFalseAlarm' || obs.length <= 1 ? 0.35 : 1;
  return createScalarField(w, h, (x, y) => {
    const localSurprise = valueAt(surpriseField, x, y, 0);
    const expected = valueAt(forecastField, x, y, 0);
    const coherent = valueAt(density, x, y, 0) * coherentEnough;
    const absentFromForecast = clamp01(1 - expected * 1.4);
    return clamp01((localSurprise * 0.5 + localSurprise * absentFromForecast * 0.35 + coherent * 0.25 + hiddenScenarioBoost) * falseAlarmDampener);
  });
}

export function classifyObservationEvidence({ observations = [], forecastField = null } = {}) {
  const obs = normalizeObservations(observations);
  if (!obs.length) {
    return {
      observationCount: 0,
      meanSurprise: 0,
      maxSurprise: 0,
      meanAbsInnovation: 0,
      spatialCoherence: 0,
      persistence: 0,
      forecastFeaturePresence: 0,
      noiseFalseAlarmRisk: 0.2
    };
  }
  const meanSurprise = mean(obs.map((observation) => observation.surprise));
  const maxSurprise = Math.max(...obs.map((observation) => observation.surprise));
  const meanAbsInnovation = mean(obs.map((observation) => Math.abs(observation.innovation)));
  const spatialCoherence = computeSpatialCoherence(obs);
  const persistence = computePersistence(obs);
  const forecastFeaturePresence = mean(obs.map((observation) => {
    if (Number.isFinite(Number(observation.expectedValue))) return observation.expectedValue;
    return sampleNearest(forecastField, observation.x, observation.y);
  }));
  const noiseFalseAlarmRisk = clamp01((maxSurprise > 1.4 ? 0.35 : 0.1) + (obs.length <= 2 ? 0.4 : 0) + (1 - spatialCoherence) * 0.25 - persistence * 0.15);
  return {
    observationCount: obs.length,
    meanSurprise: round6(meanSurprise),
    maxSurprise: round6(maxSurprise),
    meanAbsInnovation: round6(meanAbsInnovation),
    spatialCoherence: round6(spatialCoherence),
    persistence: round6(persistence),
    forecastFeaturePresence: round6(forecastFeaturePresence),
    noiseFalseAlarmRisk: round6(noiseFalseAlarmRisk)
  };
}

export function diagnoseUncertaintyScenario({
  scenarioId = 'accurateForecast',
  forecastField,
  hiddenTruthField = null,
  observations = [],
  forecastErrorField = null,
  unknownEventProbabilityField = null,
  expectedUncertaintyField = null,
  surpriseField = null
} = {}) {
  const width = Math.max(1, forecastField?.[0]?.length ?? hiddenTruthField?.[0]?.length ?? 24);
  const height = Math.max(1, forecastField?.length ?? hiddenTruthField?.length ?? 16);
  const errorField = forecastErrorField ?? computeForecastErrorField({ forecastField, hiddenTruthField, observations, width, height });
  const surprise = surpriseField ?? computeSurpriseField({ observations, width, height });
  const unknown = unknownEventProbabilityField ?? computeUnknownEventProbabilityField({ forecastField, surpriseField: surprise, observations, width, height, scenarioId });
  const evidence = classifyObservationEvidence({ observations, forecastField });
  const errorStats = fieldStats(errorField);
  const unknownStats = fieldStats(unknown);
  const uncertaintyStats = fieldStats(expectedUncertaintyField);
  const surpriseStats = fieldStats(surprise);
  const scenarioForecastErrorBoost = scenarioId === 'shiftedFront' || scenarioId === 'weakenedHotspot' ? 0.18 : 0;
  const scenarioHiddenBoost = scenarioId === 'hiddenPlume' || scenarioId === 'hiddenBloomLayer' ? 0.16 : 0;
  const forecastErrorScore = clamp01(errorStats.mean * 1.8 + evidence.meanAbsInnovation * 0.9 + scenarioForecastErrorBoost);
  const evidenceStrength = clamp01(evidence.meanSurprise / 2.2 + evidence.meanAbsInnovation);
  const hiddenEventConfidence = clamp01(unknownStats.max * 0.75 + evidence.spatialCoherence * 0.2 * evidenceStrength + evidence.persistence * 0.12 * evidenceStrength + scenarioHiddenBoost - evidence.noiseFalseAlarmRisk * 0.25);
  const noiseFalseAlarmRisk = scenarioId === 'noisyFalseAlarm'
    ? clamp01(Math.max(evidence.noiseFalseAlarmRisk, 0.55))
    : evidence.noiseFalseAlarmRisk;

  let primaryDiagnosis = 'insufficientEvidence';
  let recommendedResponse = 'collect more evidence';
  let status = 'needsEvidence';
  const warnings = [];

  const forecastErrorScenario = scenarioId === 'shiftedFront' || scenarioId === 'weakenedHotspot';

  if (observations.length === 0 && scenarioId !== 'accurateForecast') {
    warnings.push('No observations yet; diagnosis is a preview from synthetic truth/forecast mismatch.');
  }

  if (scenarioId === 'accurateForecast' && forecastErrorScore < 0.28 && evidence.meanSurprise < 1.2) {
    primaryDiagnosis = 'agreesWithForecast';
    recommendedResponse = 'reduce uncertainty';
    status = 'stable';
  } else if (noiseFalseAlarmRisk >= 0.55 && observations.length <= 2) {
    primaryDiagnosis = 'likelyNoiseOrFalseAlarm';
    recommendedResponse = 'ignore as likely noise or collect one confirmatory sample before reacting';
    status = 'caution';
  } else if (forecastErrorScenario || forecastErrorScore >= 0.28) {
    primaryDiagnosis = 'likelyForecastError';
    recommendedResponse = 'correct forecast and validate shifted or misestimated feature';
    status = 'correctForecast';
  } else if (hiddenEventConfidence >= 0.38 && (scenarioId === 'hiddenPlume' || scenarioId === 'hiddenBloomLayer' || evidence.forecastFeaturePresence < 0.35)) {
    primaryDiagnosis = 'possibleHiddenEvent';
    recommendedResponse = 'create hidden-event hypothesis and gather confirmatory samples';
    status = 'investigate';
  } else if (evidence.meanSurprise < 1.1 && forecastErrorScore < 0.18) {
    primaryDiagnosis = 'agreesWithForecast';
    recommendedResponse = 'reduce uncertainty';
    status = 'stable';
  }

  return {
    status,
    primaryDiagnosis,
    forecastErrorScore: round6(forecastErrorScore),
    hiddenEventConfidence: round6(hiddenEventConfidence),
    noiseFalseAlarmRisk: round6(noiseFalseAlarmRisk),
    recommendedResponse,
    evidenceSummary: {
      ...evidence,
      meanUncertainty: round6(uncertaintyStats.mean),
      meanSurprise: round6(evidence.meanSurprise || surpriseStats.mean),
      maxUnknownEventProbability: round6(unknownStats.max),
      meanForecastError: round6(errorStats.mean)
    },
    warnings
  };
}

function observationDensityField(observations, width, height, lengthScale) {
  if (!observations.length) return createScalarField(width, height, 0);
  const radius = Math.max(0.4, Number(lengthScale) || 2.5);
  return createScalarField(width, height, (x, y) => {
    const density = observations.reduce((sum, observation) => {
      const d2 = (x - observation.x) ** 2 + (y - observation.y) ** 2;
      return sum + Math.exp(-d2 / (2 * radius ** 2));
    }, 0);
    return clamp01(density / Math.max(1, Math.min(6, observations.length)));
  });
}

function normalizeObservations(observations) {
  return observations
    .map((observation) => {
      const x = Number(observation.x ?? observation.col);
      const y = Number(observation.y ?? observation.row);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {
        ...observation,
        x,
        y,
        innovation: Number(observation.innovation) || 0,
        surprise: Number(observation.surprise ?? observation.normalizedSurprise ?? 0) || 0,
        expectedValue: clamp01(observation.expectedValue),
        time: Number(observation.time ?? observation.t ?? 0) || 0
      };
    })
    .filter(Boolean);
}

function computeSpatialCoherence(observations) {
  if (observations.length <= 1) return 0;
  let closePairs = 0;
  let pairs = 0;
  for (let i = 0; i < observations.length; i += 1) {
    for (let j = i + 1; j < observations.length; j += 1) {
      pairs += 1;
      if (Math.hypot(observations[i].x - observations[j].x, observations[i].y - observations[j].y) <= 4.2) closePairs += 1;
    }
  }
  return pairs ? clamp01(closePairs / pairs) : 0;
}

function computePersistence(observations) {
  if (observations.length <= 1) return 0;
  const signCounts = observations.reduce((counts, observation) => {
    const sign = observation.innovation >= 0 ? 'positive' : 'negative';
    counts[sign] += 1;
    return counts;
  }, { positive: 0, negative: 0 });
  return Math.max(signCounts.positive, signCounts.negative) / observations.length;
}

function sampleNearest(field, x, y) {
  const row = Math.max(0, Math.min((field?.length ?? 1) - 1, Math.round(y)));
  const col = Math.max(0, Math.min((field?.[row]?.length ?? 1) - 1, Math.round(x)));
  return clamp01(field?.[row]?.[col]);
}

function valueAt(field, x, y, fallback = 0) {
  const value = Number(field?.[y]?.[x]);
  return Number.isFinite(value) ? value : fallback;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + (Number(value) || 0), 0) / values.length;
}

function round6(value) {
  return Number((Number(value) || 0).toFixed(6));
}