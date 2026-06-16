import {
  clamp01,
  createScalarField,
  localMaxima,
  maskField,
  suppressNearPoints
} from './SamplingPriorityFieldMath.js';

export const SAMPLING_PRIORITY_CANDIDATE_MODES = [
  'diverseTopK',
  'topLocalMaxima',
  'boundaryCandidates',
  'uncertaintyCandidates',
  'hiddenEventCandidates',
  'stalenessCandidates',
  'forecastValidationCandidates'
];

export const SAMPLING_PRIORITY_CANDIDATE_MODE_METADATA = {
  diverseTopK: { label: 'Diverse Top-K', description: 'Choose high-priority cells while enforcing spacing between candidates.' },
  topLocalMaxima: { label: 'Top Local Maxima', description: 'Choose local peaks in the priority surface.' },
  boundaryCandidates: { label: 'Boundary Candidates', description: 'Choose candidates from boundary / gradient value.' },
  uncertaintyCandidates: { label: 'Uncertainty Candidates', description: 'Choose candidates from expected-state uncertainty.' },
  hiddenEventCandidates: { label: 'Hidden-Event Candidates', description: 'Choose candidates from hidden-event suspicion.' },
  stalenessCandidates: { label: 'Staleness Candidates', description: 'Choose candidates from revisit / age-of-information value.' },
  forecastValidationCandidates: { label: 'Forecast-Validation Candidates', description: 'Choose candidates from forecast-validation value.' }
};

export function samplingPriorityCandidateModeOptions() {
  return SAMPLING_PRIORITY_CANDIDATE_MODES.map((id) => ({
    id,
    label: samplingPriorityCandidateModeLabel(id),
    description: SAMPLING_PRIORITY_CANDIDATE_MODE_METADATA[id]?.description ?? ''
  }));
}

export function normalizeSamplingPriorityCandidateMode(id) {
  const value = String(id ?? '').trim();
  if (SAMPLING_PRIORITY_CANDIDATE_MODES.includes(value)) return value;
  const aliases = {
    topK: 'diverseTopK',
    maxima: 'topLocalMaxima',
    boundary: 'boundaryCandidates',
    uncertainty: 'uncertaintyCandidates',
    hidden: 'hiddenEventCandidates',
    stale: 'stalenessCandidates',
    validation: 'forecastValidationCandidates'
  };
  return aliases[value] ?? 'diverseTopK';
}

export function samplingPriorityCandidateModeLabel(id) {
  return SAMPLING_PRIORITY_CANDIDATE_MODE_METADATA[normalizeSamplingPriorityCandidateMode(id)]?.label ?? 'Diverse Top-K';
}

export function generateCandidateSamplePoints({
  priorityField,
  components = {},
  method = 'weightedAcquisition',
  candidateMode = 'diverseTopK',
  candidateCount = 6,
  minDistance = 3,
  accessibleMask = null,
  recentSamples = []
} = {}) {
  const mode = normalizeSamplingPriorityCandidateMode(candidateMode);
  const width = Array.isArray(priorityField?.[0]) ? priorityField[0].length : Array.isArray(components.beliefRoi?.[0]) ? components.beliefRoi[0].length : 1;
  const height = Array.isArray(priorityField) ? priorityField.length : Array.isArray(components.beliefRoi) ? components.beliefRoi.length : 1;
  const count = Math.max(1, Math.min(24, Math.round(Number(candidateCount) || 6)));
  const spacing = Math.max(0, Number(minDistance) || 0);
  const mask = accessibleMask ?? components.accessibleMask ?? createScalarField(width, height, 1);
  const sourceField = fieldForMode(mode, priorityField, components);
  const redundancySuppressed = suppressNearPoints(sourceField, recentSamples, Math.max(1, spacing));
  const rankedField = maskField(mode === 'topLocalMaxima' ? sourceField : redundancySuppressed, mask);
  const maxima = localMaxima(rankedField, {
    count: count * 3,
    minDistance: mode === 'topLocalMaxima' ? 0 : spacing,
    threshold: 0.02,
    accessibleMask: mask
  });
  const selected = [];
  for (const point of maxima) {
    if (selected.some((entry) => Math.hypot(entry.x - point.x, entry.y - point.y) < spacing)) continue;
    selected.push(point);
    if (selected.length >= count) break;
  }
  if (selected.length < count) {
    const fallback = localMaxima(maskField(sourceField, mask), {
      count: count * 4,
      minDistance: Math.max(1, spacing * 0.5),
      threshold: 0,
      accessibleMask: mask
    });
    for (const point of fallback) {
      if (selected.some((entry) => entry.x === point.x && entry.y === point.y)) continue;
      if (selected.some((entry) => Math.hypot(entry.x - point.x, entry.y - point.y) < Math.max(1, spacing * 0.5))) continue;
      selected.push(point);
      if (selected.length >= count) break;
    }
  }
  return selected.slice(0, count).map((point, index) => {
    const breakdown = componentBreakdownAt(components, point.x, point.y);
    const priority = clamp01(valueAt(priorityField, point.x, point.y, point.value));
    const suppressedByRedundancy = breakdown.recentSamplePenalty > 0.35;
    const accessible = valueAt(mask, point.x, point.y, 1) > 0;
    return {
      id: `candidate-${index + 1}`,
      x: point.x,
      y: point.y,
      row: point.y,
      col: point.x,
      priority,
      reason: reasonForCandidate({ mode, method, breakdown, suppressedByRedundancy, accessible }),
      componentBreakdown: breakdown,
      suppressedByRedundancy,
      accessible
    };
  });
}

function fieldForMode(mode, priorityField, components) {
  if (mode === 'boundaryCandidates') return components.boundaryStrength ?? priorityField;
  if (mode === 'uncertaintyCandidates') return components.expectedUncertainty ?? priorityField;
  if (mode === 'hiddenEventCandidates') return components.hiddenEventProbability ?? priorityField;
  if (mode === 'stalenessCandidates') return components.staleness ?? priorityField;
  if (mode === 'forecastValidationCandidates') return components.forecastValidation ?? priorityField;
  return priorityField;
}

function componentBreakdownAt(components, x, y) {
  return {
    eventIntensity: round4(valueAt(components.eventIntensity, x, y)),
    trueRoi: round4(valueAt(components.trueRoi, x, y)),
    beliefRoi: round4(valueAt(components.beliefRoi, x, y)),
    expectedUncertainty: round4(valueAt(components.expectedUncertainty, x, y)),
    boundaryStrength: round4(valueAt(components.boundaryStrength, x, y)),
    forecastValidation: round4(valueAt(components.forecastValidation, x, y)),
    hiddenEventProbability: round4(valueAt(components.hiddenEventProbability, x, y)),
    staleness: round4(valueAt(components.staleness, x, y)),
    hazard: round4(valueAt(components.hazard, x, y)),
    recentSamplePenalty: round4(valueAt(components.recentSamplePenalty, x, y))
  };
}

function reasonForCandidate({ mode, breakdown, suppressedByRedundancy, accessible }) {
  if (!accessible) return 'hazard-suppressed';
  if (suppressedByRedundancy) return 'redundancy-suppressed';
  const modeReasons = {
    boundaryCandidates: 'uncertain boundary',
    uncertaintyCandidates: 'high uncertainty',
    hiddenEventCandidates: 'hidden-event follow-up',
    stalenessCandidates: 'stale / revisit',
    forecastValidationCandidates: 'forecast validation'
  };
  if (modeReasons[mode]) return modeReasons[mode];
  const candidates = [
    ['high belief value', breakdown.beliefRoi],
    ['high uncertainty', breakdown.expectedUncertainty],
    ['uncertain boundary', breakdown.boundaryStrength],
    ['forecast validation', breakdown.forecastValidation],
    ['hidden-event follow-up', breakdown.hiddenEventProbability],
    ['stale / revisit', breakdown.staleness]
  ].sort((a, b) => b[1] - a[1]);
  if (breakdown.hazard > 0.5) return 'hazard-suppressed';
  return candidates[0]?.[0] ?? 'high belief value';
}

function valueAt(field, x, y, fallback = 0) {
  const value = Number(field?.[y]?.[x]);
  return Number.isFinite(value) ? value : fallback;
}

function round4(value) {
  return Number((Number(value) || 0).toFixed(4));
}
