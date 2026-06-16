import {
  absFieldDifference,
  clamp01,
  createScalarField,
  fieldStats,
  finiteFieldCheck,
  normalizeField,
  thresholdAmbiguity
} from './SamplingPriorityFieldMath.js';
import { createSamplingPriorityScenario, normalizeSamplingPriorityScenarioId } from './SamplingPriorityScenarios.js';

export const SAMPLING_PRIORITY_MODEL_VERSION = 's1-global-acquisition-v1';

export const SAMPLING_PRIORITY_METHOD_IDS = [
  'weightedAcquisition',
  'uncertaintyReduction',
  'boundaryMapping',
  'forecastValidation',
  'hiddenEventFollowup',
  'stalenessRevisit',
  'ucbStyle',
  'thresholdAmbiguity',
  'balancedMission'
];

export const SAMPLING_PRIORITY_METHOD_METADATA = {
  weightedAcquisition: {
    label: 'Weighted Acquisition',
    description: 'Combine believed value, uncertainty, boundary value, hidden-event suspicion, staleness, then suppress hazards and redundancy.'
  },
  uncertaintyReduction: {
    label: 'Uncertainty Reduction',
    description: 'Prioritize places where the expected-state uncertainty is high.'
  },
  boundaryMapping: {
    label: 'Boundary Mapping',
    description: 'Prioritize gradients, fronts, and threshold-adjacent ambiguity.'
  },
  forecastValidation: {
    label: 'Forecast Validation',
    description: 'Prioritize places likely to test whether the expected state is shifted or wrong.'
  },
  hiddenEventFollowup: {
    label: 'Hidden Event Follow-up',
    description: 'Prioritize coherent suspicion of missing phenomena.'
  },
  stalenessRevisit: {
    label: 'Staleness / Revisit',
    description: 'Prioritize places where information has aged and revisits are scientifically useful.'
  },
  ucbStyle: {
    label: 'UCB-style',
    description: 'Educational value-plus-uncertainty score: belief ROI plus beta times uncertainty.'
  },
  thresholdAmbiguity: {
    label: 'Threshold Ambiguity',
    description: 'Prioritize places near a decision threshold, especially where uncertainty remains high.'
  },
  balancedMission: {
    label: 'Balanced Mission',
    description: 'Balance value, uncertainty, boundary, hidden-event, staleness, hazard, and redundancy terms.'
  }
};

export function samplingPriorityMethodOptions() {
  return SAMPLING_PRIORITY_METHOD_IDS.map((id) => ({
    id,
    label: samplingPriorityMethodLabel(id),
    description: SAMPLING_PRIORITY_METHOD_METADATA[id]?.description ?? ''
  }));
}

export function normalizeSamplingPriorityMethodId(id) {
  const value = String(id ?? '').trim();
  if (SAMPLING_PRIORITY_METHOD_IDS.includes(value)) return value;
  const aliases = {
    weighted: 'weightedAcquisition',
    uncertainty: 'uncertaintyReduction',
    boundary: 'boundaryMapping',
    validation: 'forecastValidation',
    hidden: 'hiddenEventFollowup',
    stale: 'stalenessRevisit',
    ucb: 'ucbStyle',
    ambiguity: 'thresholdAmbiguity',
    balanced: 'balancedMission'
  };
  return aliases[value] ?? 'weightedAcquisition';
}

export function samplingPriorityMethodLabel(id) {
  return SAMPLING_PRIORITY_METHOD_METADATA[normalizeSamplingPriorityMethodId(id)]?.label ?? 'Weighted Acquisition';
}

export function defaultSamplingPriorityWeights(method = 'weightedAcquisition', scenario = {}) {
  const methodId = normalizeSamplingPriorityMethodId(method);
  const base = {
    value: 0.55,
    uncertainty: 0.42,
    boundary: 0.28,
    forecast: 0.24,
    unknown: 0.28,
    staleness: 0.2,
    hazard: 0.8,
    redundancy: 0.58,
    mask: 1
  };
  const scenarioId = normalizeSamplingPriorityScenarioId(scenario.scenarioId);
  if (scenarioId === 'hazardSuppression') base.hazard = 1;
  if (scenarioId === 'staleMonitoring') base.staleness = 0.58;
  if (scenarioId === 'hiddenPlumeFollowup') base.unknown = 0.62;
  if (scenarioId === 'uncertainFront' || scenarioId === 'bloomBoundary') base.boundary = 0.58;

  const methodOverrides = {
    uncertaintyReduction: { value: 0.12, uncertainty: 1, boundary: 0.16, forecast: 0.12, unknown: 0.18, staleness: 0.12, hazard: 0.72, redundancy: 0.5, mask: 1 },
    boundaryMapping: { value: 0.18, uncertainty: 0.28, boundary: 0.95, forecast: 0.18, unknown: 0.08, staleness: 0.08, hazard: 0.72, redundancy: 0.46, mask: 1 },
    forecastValidation: { value: 0.22, uncertainty: 0.28, boundary: 0.25, forecast: 0.92, unknown: 0.12, staleness: 0.08, hazard: 0.72, redundancy: 0.46, mask: 1 },
    hiddenEventFollowup: { value: 0.18, uncertainty: 0.25, boundary: 0.18, forecast: 0.2, unknown: 1, staleness: 0.08, hazard: 0.72, redundancy: 0.42, mask: 1 },
    stalenessRevisit: { value: 0.24, uncertainty: 0.22, boundary: 0.08, forecast: 0.08, unknown: 0.08, staleness: 1, hazard: 0.72, redundancy: 0.18, mask: 1 },
    ucbStyle: { value: 1, uncertainty: 0.65, boundary: 0, forecast: 0, unknown: 0, staleness: 0, hazard: 0.72, redundancy: 0.36, mask: 1 },
    thresholdAmbiguity: { value: 0.12, uncertainty: 0.55, boundary: 0.42, forecast: 0.12, unknown: 0.08, staleness: 0.08, hazard: 0.72, redundancy: 0.4, mask: 1 },
    balancedMission: { value: 0.42, uncertainty: 0.42, boundary: 0.42, forecast: 0.34, unknown: 0.34, staleness: 0.34, hazard: 0.86, redundancy: 0.52, mask: 1 }
  };
  return { ...base, ...(methodOverrides[methodId] ?? {}) };
}

export function computeSamplingPriorityComponents(context = {}) {
  const scenario = context.scenario ?? createSamplingPriorityScenario(context);
  const threshold = clamp01(context.threshold ?? 0.5);
  const beliefRoi = scenario.beliefRoiField;
  const components = {
    eventIntensity: scenario.eventIntensityField,
    trueRoi: scenario.trueRoiField,
    beliefRoi,
    expectedUncertainty: scenario.expectedUncertaintyField,
    boundaryStrength: scenario.boundaryStrengthField,
    forecastValidation: scenario.forecastValidationField,
    hiddenEventProbability: scenario.hiddenEventProbabilityField,
    staleness: scenario.stalenessField,
    hazard: scenario.hazardField,
    recentSamplePenalty: scenario.recentSamplePenaltyField,
    accessibleMask: scenario.accessibleMask,
    inaccessiblePenalty: createScalarField(scenario.width, scenario.height, (x, y) => 1 - clamp01(Number(scenario.accessibleMask?.[y]?.[x] ?? 1))),
    thresholdAmbiguity: thresholdAmbiguity(beliefRoi, threshold),
    forecastBeliefMismatch: absFieldDifference(scenario.trueRoiField, beliefRoi)
  };
  return components;
}

export function computeSamplingPriority(context = {}) {
  const scenario = context.scenario ?? createSamplingPriorityScenario(context);
  const methodId = normalizeSamplingPriorityMethodId(context.method ?? context.methodId);
  const components = computeSamplingPriorityComponents({ ...context, scenario });
  const defaultWeights = defaultSamplingPriorityWeights(methodId, scenario);
  const weights = normalizeWeights({ ...defaultWeights, ...(context.weights ?? {}) });
  const beta = Number.isFinite(Number(context.beta)) ? Number(context.beta) : 0.65;
  const threshold = clamp01(context.threshold ?? 0.5);
  const width = scenario.width;
  const height = scenario.height;
  const raw = createScalarField(width, height, (x, y) => rawPriorityValue({
    methodId,
    components,
    weights,
    beta,
    threshold,
    x,
    y
  }));
  const normalizedRaw = normalizeField(raw);
  const priorityField = createScalarField(width, height, (x, y) => {
    const hazard = valueAt(components.hazard, x, y);
    const redundancy = valueAt(components.recentSamplePenalty, x, y);
    const inaccessible = valueAt(components.inaccessiblePenalty, x, y);
    const suppression = (1 - clamp01(hazard * weights.hazard))
      * (1 - clamp01(redundancy * weights.redundancy))
      * (1 - clamp01(inaccessible * weights.mask));
    return clamp01(valueAt(normalizedRaw, x, y) * suppression);
  });
  const stats = fieldStats(priorityField);
  const eventStats = fieldStats(components.eventIntensity);
  return {
    version: SAMPLING_PRIORITY_MODEL_VERSION,
    scenarioId: scenario.scenarioId,
    scenarioLabel: scenario.scenarioLabel,
    methodId,
    methodLabel: samplingPriorityMethodLabel(methodId),
    methodDescription: SAMPLING_PRIORITY_METHOD_METADATA[methodId]?.description ?? '',
    formula: formulaForMethod(methodId),
    weights,
    beta,
    threshold,
    components,
    rawPriorityField: raw,
    samplingPriorityField: priorityField,
    priorityField,
    stats,
    componentStats: componentStats(components),
    priorityNotEventIntensity: !sameField(priorityField, components.eventIntensity),
    eventIntensityStats: eventStats,
    validation: finiteFieldCheck(priorityField),
    claimLevel: 'educational_global_acquisition_model',
    notA: 'Educational acquisition model, not a production GP/GMRF planner, calibrated data-assimilation system, route planner, flow-coupled action-value optimizer, vehicle controller, multi-agent planner, or mission scoring engine.',
    usesRoutePlanning: false,
    usesFlowCoupling: false,
    usesProductionGp: false,
    usesProductionGmrf: false
  };
}

export function explainSamplingPriorityMethod(methodId) {
  const id = normalizeSamplingPriorityMethodId(methodId);
  return {
    id,
    label: samplingPriorityMethodLabel(id),
    description: SAMPLING_PRIORITY_METHOD_METADATA[id]?.description ?? '',
    formula: formulaForMethod(id),
    inWords: methodInWords(id),
    notA: 'This is not route planning, not flow-coupled action value, not a vehicle controller, and not a production GP/GMRF acquisition optimizer.'
  };
}

function rawPriorityValue({ methodId, components, weights, beta, threshold, x, y }) {
  const value = valueAt(components.beliefRoi, x, y);
  const uncertainty = valueAt(components.expectedUncertainty, x, y);
  const boundary = valueAt(components.boundaryStrength, x, y);
  const forecast = valueAt(components.forecastValidation, x, y);
  const unknown = valueAt(components.hiddenEventProbability, x, y);
  const stale = valueAt(components.staleness, x, y);
  const ambiguity = valueAt(components.thresholdAmbiguity, x, y);
  const mismatch = valueAt(components.forecastBeliefMismatch, x, y);

  if (methodId === 'uncertaintyReduction') return uncertainty + 0.18 * value + 0.12 * unknown;
  if (methodId === 'boundaryMapping') return boundary + 0.36 * ambiguity + 0.16 * uncertainty;
  if (methodId === 'forecastValidation') return forecast + 0.28 * mismatch + 0.16 * boundary + 0.12 * uncertainty;
  if (methodId === 'hiddenEventFollowup') return unknown + 0.18 * uncertainty + 0.12 * forecast;
  if (methodId === 'stalenessRevisit') return stale + 0.25 * value + 0.12 * uncertainty;
  if (methodId === 'ucbStyle') return value + beta * uncertainty;
  if (methodId === 'thresholdAmbiguity') return ambiguity + 0.5 * uncertainty + 0.16 * boundary;
  if (methodId === 'balancedMission') {
    return 0.42 * value + 0.42 * uncertainty + 0.42 * boundary + 0.34 * forecast + 0.34 * unknown + 0.34 * stale;
  }
  return weights.value * value
    + weights.uncertainty * uncertainty
    + weights.boundary * boundary
    + weights.forecast * forecast
    + weights.unknown * unknown
    + weights.staleness * stale;
}

function formulaForMethod(methodId) {
  if (methodId === 'ucbStyle') return 'A_global = beliefRoi + beta * expectedUncertainty, then hazard/redundancy/mask suppression';
  if (methodId === 'thresholdAmbiguity') return 'A_global = thresholdAmbiguity(beliefRoi) + uncertainty + boundary, then suppression';
  return 'A_global = w_value*beliefRoi + w_uncertainty*expectedUncertainty + w_boundary*boundary + w_forecast*forecastValidation + w_unknown*hiddenEventProbability + w_staleness*staleness - hazard/redundancy/mask suppression';
}

function methodInWords(methodId) {
  return {
    weightedAcquisition: 'This map combines believed value, uncertainty, boundary value, forecast-validation value, hidden-event suspicion, and revisit value before considering any glider route.',
    uncertaintyReduction: 'This map asks where a measurement would most reduce expected-state uncertainty.',
    boundaryMapping: 'This map asks where a sample would best localize a front, edge, or threshold crossing.',
    forecastValidation: 'This map asks where a sample would most test whether the forecasted state is wrong.',
    hiddenEventFollowup: 'This map asks where a sample would most confirm or reject hidden-event suspicion.',
    stalenessRevisit: 'This map asks where information has aged enough that revisiting is scientifically useful.',
    ucbStyle: 'This educational UCB-style map adds uncertainty bonus to believed value.',
    thresholdAmbiguity: 'This map asks where the believed state sits near a decision threshold and remains uncertain.',
    balancedMission: 'This map keeps several science motives in play instead of optimizing only one.'
  }[methodId] ?? 'This map shows global sampling usefulness before vehicle routing.';
}

function normalizeWeights(weights = {}) {
  return Object.fromEntries(Object.entries({
    value: 0,
    uncertainty: 0,
    boundary: 0,
    forecast: 0,
    unknown: 0,
    staleness: 0,
    hazard: 0,
    redundancy: 0,
    mask: 0,
    ...weights
  }).map(([key, value]) => [key, Math.max(0, Number(value) || 0)]));
}

function componentStats(components = {}) {
  const stats = {};
  for (const [key, field] of Object.entries(components)) {
    if (Array.isArray(field)) stats[key] = fieldStats(field);
  }
  return stats;
}

function sameField(a, b, tolerance = 1e-6) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a[0]?.length !== b[0]?.length) return false;
  for (let y = 0; y < a.length; y += 1) {
    for (let x = 0; x < a[0].length; x += 1) {
      if (Math.abs(Number(a[y][x] ?? 0) - Number(b[y][x] ?? 0)) > tolerance) return false;
    }
  }
  return true;
}

function valueAt(field, x, y, fallback = 0) {
  const value = Number(field?.[y]?.[x]);
  return Number.isFinite(value) ? value : fallback;
}
