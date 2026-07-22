const ObservationSurpriseModel = require('./ObservationSurpriseModel.js')
const EVIDENCE_COHERENCE_MODEL_VERSION = 'evidence-coherence-model-p9';

 function computeEvidenceCoherence(observations = [], options = {}) {
  const thresholds = {
    surprise: positiveNumber(options.surpriseThreshold, 3),
    radius: positiveNumber(options.spatialRadius, 2.5),
    temporalGapSeconds: positiveNumber(options.temporalGapSeconds, 600)
  };
  const surpriseRows = ObservationSurpriseModel.computeObservationSurpriseBatch(observations, options.surpriseOptions ?? options);
  const summary = ObservationSurpriseModel.observationSurpriseSummary(surpriseRows, options.surpriseOptions ?? options);
  const highRows = surpriseRows.filter((row) => Number(row.surprise) >= thresholds.surprise);
  const spatial = spatialCoherence(highRows, thresholds.radius);
  const temporal = temporalCoherence(highRows, thresholds.temporalGapSeconds);
  const sign = sensorSignCoherence(highRows);
  const flow = flowConsistency(highRows, options.flowContext ?? options);
  const evidenceConfidence = round(clamp01(
    (Math.min(1, highRows.length / 4) * 0.28)
    + ((summary.meanSurprise ?? 0) >= thresholds.surprise ? 0.16 : 0)
    + spatial.score * 0.2
    + temporal.score * 0.14
    + sign.score * 0.14
    + (flow.score ?? 0.5) * 0.08
  ));
  const warnings = [];
  if (!surpriseRows.length) warnings.push('No observations were provided for coherence analysis.');
  if (flow.status === 'unavailable') warnings.push('Flow consistency was not evaluated because no public flow direction context was provided.');
  return {
    type: 'anchor.science.evidence-coherence',
    version: EVIDENCE_COHERENCE_MODEL_VERSION,
    observationCount: surpriseRows.length,
    highSurpriseCount: highRows.length,
    highSurpriseRatio: round(surpriseRows.length ? highRows.length / surpriseRows.length : 0),
    meanSurprise: summary.meanSurprise,
    maxSurprise: summary.maxSurprise,
    meanInnovation: summary.meanInnovation,
    meanAbsInnovation: summary.meanAbsInnovation,
    spatialCoherence: spatial,
    temporalCoherence: temporal,
    sensorSignCoherence: sign,
    flowConsistency: flow,
    evidenceConfidence,
    coherenceLevel: coherenceLevelFor(evidenceConfidence),
    publicSafe: true,
    warnings,
    notA: ['not Bayesian inference', 'not production data assimilation', 'not calibrated ocean forecast']
  };
}

 function evidenceCoherenceSummary(coherence = {}) {
  return {
    type: 'anchor.science.evidence-coherence-summary',
    version: EVIDENCE_COHERENCE_MODEL_VERSION,
    observationCount: Math.max(0, Math.round(Number(coherence.observationCount ?? 0) || 0)),
    highSurpriseCount: Math.max(0, Math.round(Number(coherence.highSurpriseCount ?? 0) || 0)),
    highSurpriseRatio: finiteOrNull(coherence.highSurpriseRatio),
    evidenceConfidence: finiteOrNull(coherence.evidenceConfidence),
    coherenceLevel: coherence.coherenceLevel ?? 'unknown',
    spatialScore: finiteOrNull(coherence.spatialCoherence?.score),
    temporalScore: finiteOrNull(coherence.temporalCoherence?.score),
    signScore: finiteOrNull(coherence.sensorSignCoherence?.score),
    flowStatus: coherence.flowConsistency?.status ?? 'unavailable',
    publicSafe: true
  };
}

function spatialCoherence(rows, radius) {
  const points = rows.filter((row) => Number.isFinite(Number(row.x)) && Number.isFinite(Number(row.y)));
  if (points.length < 2) return { status: points.length ? 'single-sample' : 'unavailable', radius, meanNearestDistance: null, score: points.length ? 0.35 : 0 };
  const nearest = points.map((point, index) => {
    let best = Infinity;
    for (const [otherIndex, other] of points.entries()) {
      if (otherIndex === index) continue;
      best = Math.min(best, distance(point, other));
    }
    return best;
  }).filter(Number.isFinite);
  const meanNearestDistance = mean(nearest);
  const score = clamp01(1 - (meanNearestDistance / Math.max(radius, 1e-6)));
  return { status: score >= 0.5 ? 'clustered' : 'diffuse', radius, meanNearestDistance: round(meanNearestDistance), score: round(score) };
}

function temporalCoherence(rows, temporalGapSeconds) {
  const times = rows.map((row) => Number(row.timeSeconds)).filter(Number.isFinite).sort((a, b) => a - b);
  if (times.length < 2) return { status: times.length ? 'single-sample' : 'unavailable', spanSeconds: null, persistentCount: times.length, score: times.length ? 0.35 : 0 };
  const gaps = [];
  for (let index = 1; index < times.length; index += 1) gaps.push(times[index] - times[index - 1]);
  const closeGapCount = gaps.filter((gap) => gap <= temporalGapSeconds).length;
  const spanSeconds = times.at(-1) - times[0];
  const score = clamp01((closeGapCount / gaps.length) * 0.65 + Math.min(1, spanSeconds / Math.max(temporalGapSeconds, 1)) * 0.35);
  return { status: score >= 0.55 ? 'persistent' : 'sporadic', spanSeconds: round(spanSeconds), persistentCount: closeGapCount + 1, score: round(score) };
}

function sensorSignCoherence(rows) {
  const signs = rows.map((row) => Math.sign(Number(row.innovation))).filter((value) => value !== 0 && Number.isFinite(value));
  if (!signs.length) return { status: 'unavailable', dominantSign: null, agreementRatio: null, score: 0 };
  const positives = signs.filter((value) => value > 0).length;
  const negatives = signs.length - positives;
  const dominant = positives >= negatives ? 1 : -1;
  const agreementRatio = Math.max(positives, negatives) / signs.length;
  return { status: agreementRatio >= 0.7 ? 'consistent' : 'mixed', dominantSign: dominant > 0 ? 'positive' : 'negative', agreementRatio: round(agreementRatio), score: round(clamp01(agreementRatio)) };
}

function flowConsistency(rows, context = {}) {
  const hasContext = context.flowDirection || context.meanFlowDirection || rows.some((row) => Number.isFinite(Number(row.flowU)) && Number.isFinite(Number(row.flowV)));
  if (!hasContext) return { status: 'unavailable', score: null, note: 'No public flow direction context was provided.' };
  const score = positiveNumber(context.flowConsistencyScore, null);
  if (score != null) return { status: score >= 0.5 ? 'consistent' : 'inconsistent', score: round(clamp01(score)) };
  return { status: 'available-unscored', score: 0.5, note: 'Flow fields are available, but this lightweight model does not infer plume transport.' };
}

function coherenceLevelFor(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'unknown';
  if (number >= 0.72) return 'strong';
  if (number >= 0.45) return 'moderate';
  if (number >= 0.18) return 'weak';
  return 'none';
}

function distance(a, b) { return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y)); }
function sum(values) { return values.reduce((total, value) => total + value, 0); }
function mean(values) { return values.length ? sum(values) / values.length : null; }
function clamp01(value) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0; }
function positiveNumber(value, fallback) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : fallback; }
function finiteOrNull(value) { const number = Number(value); return Number.isFinite(number) ? round(number) : null; }
function round(value) { const number = Number(value); return Number.isFinite(number) ? Number(number.toFixed(4)) : null; }

module.exports = {computeEvidenceCoherence, evidenceCoherenceSummary}