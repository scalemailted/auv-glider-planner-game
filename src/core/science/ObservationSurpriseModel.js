export const OBSERVATION_SURPRISE_MODEL_VERSION = 'observation-surprise-model-p9';

export const DEFAULT_SURPRISE_THRESHOLDS = Object.freeze({
  low: 1.5,
  medium: 3,
  high: 5
});

export function computeInnovation(observation = {}, options = {}) {
  const observed = finiteNumber(observation.observedValue ?? observation.value ?? observation.measurement, null);
  const expected = expectedValueForObservation(observation, options);
  if (observed == null || expected.value == null) {
    return { innovation: null, observedValue: observed, expectedValue: expected.value, expectedValueSource: expected.source };
  }
  return {
    innovation: round(observed - expected.value),
    observedValue: observed,
    expectedValue: expected.value,
    expectedValueSource: expected.source
  };
}

export function computeObservationSurprise(observation = {}, options = {}) {
  const thresholds = normalizeThresholds(options.thresholds);
  const innovationResult = computeInnovation(observation, options);
  const providedSurprise = finiteNumber(observation.surprise, null);
  const noiseScale = positiveNumber(
    options.noiseStd
      ?? observation.sensorNoiseStd
      ?? observation.noiseStd
      ?? observation.expectedNoiseStd
      ?? observation.sensorSigma,
    null
  );
  const fallbackScale = positiveNumber(options.fallbackScale ?? observation.expectedScale ?? observation.valueScale, 1);
  const scale = noiseScale ?? fallbackScale ?? 1;
  const surprise = providedSurprise != null && options.preserveProvidedSurprise !== false
    ? Math.abs(providedSurprise)
    : innovationResult.innovation == null
      ? null
      : Math.abs(innovationResult.innovation) / Math.max(scale, 1e-6);
  const normalized = surprise == null ? null : round(surprise);
  const surpriseLevel = surpriseLevelFor(normalized, thresholds);
  const warnings = [];
  if (innovationResult.expectedValue == null) warnings.push('Observation lacks a forecast or belief value for surprise calculation.');
  if (innovationResult.observedValue == null) warnings.push('Observation lacks an observed value for surprise calculation.');
  if (noiseScale == null && normalized != null) warnings.push('No explicit noise scale was provided; surprise used a transparent fallback scale.');

  return compactObject({
    type: 'anchor.science.observation-surprise',
    version: OBSERVATION_SURPRISE_MODEL_VERSION,
    observationId: String(observation.observationId ?? observation.id ?? ''),
    timeSeconds: finiteNumber(observation.timeSeconds ?? observation.time ?? observation.t, null),
    x: finiteNumber(observation.x ?? observation.position?.x, null),
    y: finiteNumber(observation.y ?? observation.position?.y, null),
    zIndex: finiteNumber(observation.zIndex ?? observation.z ?? observation.position?.z, null),
    observedValue: innovationResult.observedValue,
    expectedValue: innovationResult.expectedValue,
    expectedValueSource: innovationResult.expectedValueSource,
    innovation: innovationResult.innovation,
    surprise: normalized,
    surpriseLevel,
    scale: round(scale),
    publicSafe: true,
    warnings
  });
}

export function computeObservationSurpriseBatch(observations = [], options = {}) {
  const list = Array.isArray(observations) ? observations : [];
  return list.map((observation, index) => computeObservationSurprise({ observationId: `obs-${index + 1}`, ...observation }, options));
}

export function observationSurpriseSummary(observationsOrSurprises = [], options = {}) {
  const surprises = normalizeSurpriseRows(observationsOrSurprises, options);
  const finiteSurprises = surprises.map((row) => Number(row.surprise)).filter(Number.isFinite);
  const finiteInnovations = surprises.map((row) => Number(row.innovation)).filter(Number.isFinite);
  const highThreshold = normalizeThresholds(options.thresholds).medium;
  return {
    type: 'anchor.science.observation-surprise-summary',
    version: OBSERVATION_SURPRISE_MODEL_VERSION,
    count: surprises.length,
    finiteCount: finiteSurprises.length,
    meanSurprise: round(mean(finiteSurprises)),
    maxSurprise: round(max(finiteSurprises)),
    meanInnovation: round(mean(finiteInnovations)),
    meanAbsInnovation: round(mean(finiteInnovations.map(Math.abs))),
    highSurpriseCount: finiteSurprises.filter((value) => value >= highThreshold).length,
    extremeSurpriseCount: finiteSurprises.filter((value) => value >= normalizeThresholds(options.thresholds).high).length,
    publicSafe: true
  };
}

export function surpriseLevelFor(value, thresholds = DEFAULT_SURPRISE_THRESHOLDS) {
  const number = finiteNumber(value, null);
  if (number == null) return 'unknown';
  if (number >= thresholds.high) return 'extreme';
  if (number >= thresholds.medium) return 'high';
  if (number >= thresholds.low) return 'elevated';
  return 'low';
}

function normalizeSurpriseRows(observationsOrSurprises, options) {
  const list = Array.isArray(observationsOrSurprises) ? observationsOrSurprises : [];
  if (!list.length) return [];
  const looksComputed = list.some((row) => row?.type === 'anchor.science.observation-surprise' || row?.expectedValueSource !== undefined || row?.surpriseLevel !== undefined);
  return looksComputed ? list : computeObservationSurpriseBatch(list, options);
}

function expectedValueForObservation(observation = {}, options = {}) {
  const candidates = [
    ['expectedValue', observation.expectedValue],
    ['forecastValue', observation.forecastValue],
    ['beliefValue', observation.beliefValue],
    ['expected', observation.expected],
    ['forecast', observation.forecast],
    ['belief', observation.belief],
    ['optionDefault', options.expectedValue]
  ];
  for (const [source, value] of candidates) {
    const number = finiteNumber(value, null);
    if (number != null) return { value: number, source };
  }
  return { value: null, source: null };
}

function normalizeThresholds(thresholds = {}) {
  return {
    low: positiveNumber(thresholds.low, DEFAULT_SURPRISE_THRESHOLDS.low),
    medium: positiveNumber(thresholds.medium, DEFAULT_SURPRISE_THRESHOLDS.medium),
    high: positiveNumber(thresholds.high, DEFAULT_SURPRISE_THRESHOLDS.high)
  };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function sum(values) { return values.reduce((total, value) => total + value, 0); }
function mean(values) { return values.length ? sum(values) / values.length : null; }
function max(values) { return values.length ? Math.max(...values) : null; }
function round(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(4)) : null;
}
function compactObject(value = {}) { return Object.fromEntries(Object.entries(value).filter(([_key, entry]) => entry !== undefined)); }
