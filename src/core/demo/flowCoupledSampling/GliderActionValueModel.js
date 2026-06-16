import {
  clamp01,
  createScalarField,
  estimateArrivalTimeField,
  estimateCrossCurrentRiskField,
  estimateCurrentAssistField,
  estimateDirectDistanceField,
  estimateEnergyCostField,
  estimateReachableMask,
  fieldStats,
  finiteFieldCheck,
  normalizeField
} from './FlowCoupledSamplingFieldMath.js';
import {
  createFlowCoupledSamplingScenario,
  normalizeFlowCoupledSamplingScenarioId
} from './FlowCoupledSamplingScenarios.js';

export const GLIDER_ACTION_VALUE_MODEL_VERSION = 's2-flow-coupled-action-value-v1';

export const GLIDER_ACTION_METHOD_IDS = [
  'balancedActionValue',
  'fastestReachable',
  'energyAware',
  'currentAssisted',
  'riskAvoidant',
  'interceptFuturePriority',
  'redundancyAware',
  'scienceFirst'
];

export const GLIDER_ACTION_METHOD_METADATA = {
  balancedActionValue: {
    label: 'Balanced Action Value',
    description: 'Start with global sampling priority, then balance direct-leg travel, current assist/opposition, energy, timing, hazards, and redundancy.'
  },
  fastestReachable: {
    label: 'Fastest Reachable',
    description: 'Prefer targets that the selected glider can reach quickly within the mission window.'
  },
  energyAware: {
    label: 'Energy Aware',
    description: 'Discount targets that consume more energy because of distance, opposing current, or lateral drift.'
  },
  currentAssisted: {
    label: 'Current Assisted',
    description: 'Reward targets whose direct-leg direction is helped by the current and penalize current opposition.'
  },
  riskAvoidant: {
    label: 'Risk Avoidant',
    description: 'Strongly avoid high cross-current risk, hazards, and missed-window cells.'
  },
  interceptFuturePriority: {
    label: 'Intercept Future Priority',
    description: 'Favor targets where future sampling priority is high, such as downstream intercept points.'
  },
  redundancyAware: {
    label: 'Redundancy Aware',
    description: 'Discount cells near recent samples or locations another glider can already cover.'
  },
  scienceFirst: {
    label: 'Science First',
    description: 'Keep science priority dominant while still suppressing unreachable, inaccessible, and hazardous cells.'
  }
};

export function gliderActionMethodOptions() {
  return GLIDER_ACTION_METHOD_IDS.map((id) => ({
    id,
    label: gliderActionMethodLabel(id),
    description: GLIDER_ACTION_METHOD_METADATA[id]?.description ?? ''
  }));
}

export function normalizeGliderActionMethodId(id) {
  const value = String(id ?? '').trim();
  if (GLIDER_ACTION_METHOD_IDS.includes(value)) return value;
  const aliases = {
    balanced: 'balancedActionValue',
    fastest: 'fastestReachable',
    energy: 'energyAware',
    current: 'currentAssisted',
    risk: 'riskAvoidant',
    intercept: 'interceptFuturePriority',
    redundant: 'redundancyAware',
    science: 'scienceFirst'
  };
  return aliases[value] ?? 'balancedActionValue';
}

export function gliderActionMethodLabel(id) {
  return GLIDER_ACTION_METHOD_METADATA[normalizeGliderActionMethodId(id)]?.label ?? 'Balanced Action Value';
}

export function defaultGliderActionWeights(method = 'balancedActionValue', scenario = {}) {
  const methodId = normalizeGliderActionMethodId(method);
  const scenarioId = normalizeFlowCoupledSamplingScenarioId(scenario.scenarioId);
  const base = {
    priority: 0.7,
    future: 0.4,
    assist: 0.35,
    distance: 0.35,
    time: 0.34,
    energy: 0.42,
    current: 0.5,
    cross: 0.42,
    hazard: 0.9,
    window: 0.78,
    redundancy: 0.46
  };
  if (scenarioId === 'hazardGap') {
    base.hazard = 1;
    base.cross = 0.52;
  }
  if (scenarioId === 'downstreamIntercept') base.future = 0.72;
  if (scenarioId === 'twoGliderRedundancyPreview') base.redundancy = 0.76;

  const methodOverrides = {
    fastestReachable: { priority: 0.38, future: 0.2, assist: 0.28, distance: 0.82, time: 1, energy: 0.35, current: 0.42, cross: 0.28, hazard: 0.8, window: 1, redundancy: 0.28 },
    energyAware: { priority: 0.48, future: 0.24, assist: 0.22, distance: 0.48, time: 0.34, energy: 1, current: 0.7, cross: 0.54, hazard: 0.84, window: 0.62, redundancy: 0.34 },
    currentAssisted: { priority: 0.48, future: 0.22, assist: 1, distance: 0.22, time: 0.22, energy: 0.38, current: 0.94, cross: 0.36, hazard: 0.76, window: 0.48, redundancy: 0.28 },
    riskAvoidant: { priority: 0.44, future: 0.22, assist: 0.18, distance: 0.32, time: 0.42, energy: 0.54, current: 0.66, cross: 1, hazard: 1, window: 0.84, redundancy: 0.42 },
    interceptFuturePriority: { priority: 0.36, future: 1, assist: 0.34, distance: 0.28, time: 0.28, energy: 0.36, current: 0.44, cross: 0.34, hazard: 0.82, window: 0.66, redundancy: 0.34 },
    redundancyAware: { priority: 0.52, future: 0.32, assist: 0.28, distance: 0.32, time: 0.32, energy: 0.42, current: 0.48, cross: 0.42, hazard: 0.84, window: 0.64, redundancy: 1 },
    scienceFirst: { priority: 1, future: 0.66, assist: 0.16, distance: 0.16, time: 0.16, energy: 0.18, current: 0.22, cross: 0.22, hazard: 0.72, window: 0.42, redundancy: 0.22 }
  };
  return { ...base, ...(methodOverrides[methodId] ?? {}) };
}

export function computeGliderActionComponents(context = {}) {
  const scenario = context.scenario ?? createFlowCoupledSamplingScenario(context);
  const selectedGliderId = String(context.selectedGliderId ?? scenario.selectedGliderId ?? scenario.gliders?.[0]?.id ?? 'glider-a');
  const glider = normalizeGlider({
    ...(scenario.gliders ?? []).find((entry) => entry.id === selectedGliderId),
    ...(context.glider ?? {}),
    id: context.glider?.id ?? selectedGliderId
  });
  if (context.gliderSpeed ?? context.speed) glider.speed = Math.max(0.05, finiteNumber(context.gliderSpeed ?? context.speed, glider.speed));
  const timeBudget = Math.max(0.1, finiteNumber(context.timeBudget ?? glider.timeBudget, glider.timeBudget));
  const energyBudget = clamp01(context.energyBudget ?? glider.energyBudget);
  const width = scenario.width;
  const height = scenario.height;

  const travelDistanceRaw = estimateDirectDistanceField(glider, width, height);
  const arrivalTimeRaw = estimateArrivalTimeField({
    glider,
    flowField: scenario.flowField,
    width,
    height
  });
  const rawCurrentAssist = estimateCurrentAssistField({
    glider,
    flowField: scenario.flowField,
    width,
    height
  });
  const currentAssist = createScalarField(width, height, (col, row) => clamp01(Math.max(0, valueAt(rawCurrentAssist, col, row))));
  const currentOpposition = createScalarField(width, height, (col, row) => clamp01(Math.max(0, -valueAt(rawCurrentAssist, col, row))));
  const crossCurrentRisk = estimateCrossCurrentRiskField({
    glider,
    flowField: scenario.flowField,
    width,
    height
  });
  const energyCost = estimateEnergyCostField({
    distanceField: travelDistanceRaw,
    currentAssistField: rawCurrentAssist,
    crossCurrentRiskField: crossCurrentRisk,
    options: context.energyOptions
  });
  const reachableMask = estimateReachableMask({
    arrivalTimeField: arrivalTimeRaw,
    energyCostField: energyCost,
    glider,
    timeBudget,
    energyBudget,
    accessibleMask: scenario.accessibleMask
  });
  const travelDistance = normalizeField(travelDistanceRaw);
  const arrivalTime = normalizeField(arrivalTimeRaw);
  const hazardPenalty = normalizeField(scenario.hazardField);
  const accessibleMask = normalizeField(scenario.accessibleMask);
  const missedWindowPenalty = createScalarField(width, height, (col, row) => {
    const arrival = valueAt(arrivalTimeRaw, col, row);
    return clamp01((arrival - timeBudget * 0.82) / Math.max(0.1, timeBudget * 0.32));
  });
  const redundancyPenalty = estimateRedundancyPenalty({
    scenario,
    glider,
    selectedGliderId,
    width,
    height
  });

  return {
    globalPriority: normalizeField(scenario.globalPriorityField),
    futurePriority: normalizeField(scenario.futurePriorityField),
    travelDistance,
    arrivalTime,
    reachableMask,
    currentAssist,
    currentOpposition,
    crossCurrentRisk,
    energyCost,
    hazardPenalty,
    missedWindowPenalty,
    redundancyPenalty,
    accessibleMask,
    rawCurrentAssist,
    travelDistanceRaw,
    arrivalTimeRaw,
    glider,
    timeBudget,
    energyBudget
  };
}

export function computeGliderActionValue(context = {}) {
  const scenario = context.scenario ?? createFlowCoupledSamplingScenario(context);
  const methodId = normalizeGliderActionMethodId(context.methodId ?? context.method);
  const weights = normalizeWeights({
    ...defaultGliderActionWeights(methodId, scenario),
    ...(context.weights ?? {})
  });
  const components = computeGliderActionComponents({ ...context, scenario });
  const width = scenario.width;
  const height = scenario.height;
  const rawAction = createScalarField(width, height, (col, row) => (
    weights.priority * valueAt(components.globalPriority, col, row)
    + weights.future * valueAt(components.futurePriority, col, row)
    + weights.assist * valueAt(components.currentAssist, col, row)
    - weights.distance * valueAt(components.travelDistance, col, row)
    - weights.time * valueAt(components.arrivalTime, col, row)
    - weights.energy * valueAt(components.energyCost, col, row)
    - weights.current * valueAt(components.currentOpposition, col, row)
    - weights.cross * valueAt(components.crossCurrentRisk, col, row)
    - weights.hazard * valueAt(components.hazardPenalty, col, row)
    - weights.window * valueAt(components.missedWindowPenalty, col, row)
    - weights.redundancy * valueAt(components.redundancyPenalty, col, row)
  ));
  const normalizedRaw = normalizeField(rawAction);
  const actionValueField = createScalarField(width, height, (col, row) => {
    const reachable = valueAt(components.reachableMask, col, row);
    const accessible = valueAt(components.accessibleMask, col, row, 1);
    const hazardSuppression = 1 - clamp01(valueAt(components.hazardPenalty, col, row) * Math.min(1, weights.hazard));
    const windowSuppression = 1 - 0.5 * clamp01(valueAt(components.missedWindowPenalty, col, row) * Math.min(1, weights.window));
    return clamp01(valueAt(normalizedRaw, col, row) * reachable * accessible * hazardSuppression * windowSuppression);
  });
  components.actionValue = actionValueField;

  const diagnostics = buildDiagnostics({ scenario, components, actionValueField, rawAction });
  return {
    version: GLIDER_ACTION_VALUE_MODEL_VERSION,
    scenarioId: scenario.scenarioId,
    scenarioLabel: scenario.scenarioLabel,
    methodId,
    methodLabel: gliderActionMethodLabel(methodId),
    actionValueField,
    components,
    weights,
    diagnostics,
    explanation: explainGliderActionMethod(methodId),
    formula: actionValueFormula(),
    claimLevel: 'educational_flow_coupled_action_value_model',
    notA: 'Educational flow-coupled action-value model, not full route planning, not optimal path planning, not MPC, A*, Dijkstra, RRT, reinforcement learning, mission scoring, calibrated glider dynamics, calibrated ocean forecast, or production vehicle controller.',
    usesFlowCoupling: true,
    usesRoutePlanning: false,
    usesMissionScoring: false,
    usesProductionDynamics: false
  };
}

export function explainGliderActionMethod(methodId) {
  const id = normalizeGliderActionMethodId(methodId);
  return {
    id,
    label: gliderActionMethodLabel(id),
    description: GLIDER_ACTION_METHOD_METADATA[id]?.description ?? '',
    formula: actionValueFormula(),
    coreIdea: 'Start with global sampling priority, then adjust for this glider direct-leg current-assisted travel, energy, timing, risk, hazards, and redundancy.',
    inWords: methodInWords(id),
    sciencePriorityNotActionValue: true,
    notA: 'Not full route planning, not optimal path planning, not mission scoring, not a production glider controller, and not a calibrated ocean model.'
  };
}

function estimateRedundancyPenalty({ scenario, glider, selectedGliderId, width, height }) {
  const recent = normalizeField(scenario.recentSamplePenaltyField);
  const otherGliders = (scenario.gliders ?? []).filter((entry) => entry.id !== selectedGliderId);
  const diagonal = Math.max(1, Math.hypot(width, height));
  const otherPenalty = createScalarField(width, height, (col, row) => {
    if (!otherGliders.length) return 0;
    const target = { x: col + 0.5, y: row + 0.5 };
    const selectedDistance = Math.hypot(target.x - glider.x, target.y - glider.y);
    let penalty = 0;
    for (const other of otherGliders) {
      const ox = finiteNumber(other.x ?? other.col, 0);
      const oy = finiteNumber(other.y ?? other.row, 0);
      const otherDistance = Math.hypot(target.x - ox, target.y - oy);
      const closer = clamp01((selectedDistance - otherDistance + 1) / diagonal);
      const proximity = Math.exp(-((otherDistance ** 2) / (2 * 3.5 ** 2)));
      penalty = Math.max(penalty, clamp01(0.45 * closer + 0.65 * proximity));
    }
    return penalty;
  });
  return createScalarField(width, height, (col, row) => clamp01(0.72 * valueAt(recent, col, row) + 0.72 * valueAt(otherPenalty, col, row)));
}

function buildDiagnostics({ scenario, components, actionValueField, rawAction }) {
  return {
    stats: componentStats({
      globalPriority: components.globalPriority,
      futurePriority: components.futurePriority,
      travelDistance: components.travelDistance,
      arrivalTime: components.arrivalTime,
      reachableMask: components.reachableMask,
      currentAssist: components.currentAssist,
      currentOpposition: components.currentOpposition,
      crossCurrentRisk: components.crossCurrentRisk,
      energyCost: components.energyCost,
      hazardPenalty: components.hazardPenalty,
      missedWindowPenalty: components.missedWindowPenalty,
      redundancyPenalty: components.redundancyPenalty,
      actionValue: actionValueField
    }),
    rawActionStats: fieldStats(rawAction),
    rawCurrentAssistStats: fieldStats(components.rawCurrentAssist),
    topActionPoint: maxPoint(actionValueField),
    topGlobalPriorityPoint: maxPoint(components.globalPriority),
    actionValueNotGlobalPriority: !sameField(actionValueField, components.globalPriority),
    fieldValidation: finiteFieldCheck(actionValueField),
    scenarioId: scenario.scenarioId,
    sciencePriorityNotActionValue: true,
    usesFlowCoupling: true,
    usesRoutePlanning: false
  };
}

function componentStats(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, fieldStats(field)]));
}

function methodInWords(methodId) {
  return {
    balancedActionValue: 'This target map asks whether a scientifically useful cell is worth going to now for this glider.',
    fastestReachable: 'This target map emphasizes targets that can be reached quickly within the current time budget.',
    energyAware: 'This target map preserves science value while discounting expensive direct-leg travel.',
    currentAssisted: 'This target map explicitly rewards flow that pushes along the direct target leg and penalizes opposing current.',
    riskAvoidant: 'This target map suppresses cells with cross-current drift, hazards, missed windows, or accessibility problems.',
    interceptFuturePriority: 'This target map shifts attention toward where the science value is expected to be at arrival.',
    redundancyAware: 'This target map avoids spending this glider on cells recently sampled or already covered by another glider.',
    scienceFirst: 'This target map lets science dominate, then applies only essential reachability and safety suppression.'
  }[methodId] ?? 'This target map adjusts global science priority for this glider direct-leg action context.';
}

function actionValueFormula() {
  return 'Q_glider = w_priority*A_global + w_future*futurePriority + w_assist*currentAssist - w_distance*distance - w_time*arrivalTime - w_energy*energy - w_current*opposition - w_cross*crossCurrent - w_hazard*hazard - w_window*latePenalty - w_redundancy*redundancy, then reachable/access masks suppress it';
}

function normalizeWeights(weights = {}) {
  const normalized = {};
  for (const key of ['priority', 'future', 'assist', 'distance', 'time', 'energy', 'current', 'cross', 'hazard', 'window', 'redundancy']) {
    normalized[key] = Math.max(0, finiteNumber(weights[key], 0));
  }
  return normalized;
}

function normalizeGlider(glider = {}) {
  return {
    id: String(glider.id ?? 'glider-a'),
    label: String(glider.label ?? glider.id ?? 'Glider A'),
    x: finiteNumber(glider.x ?? glider.col, 0),
    y: finiteNumber(glider.y ?? glider.row, 0),
    speed: Math.max(0.05, finiteNumber(glider.speed, 2)),
    timeBudget: Math.max(0.1, finiteNumber(glider.timeBudget ?? glider.missionWindow, 12)),
    energyBudget: clamp01(glider.energyBudget ?? 0.82),
    flowAssistScale: Math.max(0, finiteNumber(glider.flowAssistScale, 0.42)),
    color: glider.color ?? '#65d2ff'
  };
}

function maxPoint(field) {
  let best = { x: 0, y: 0, col: 0, row: 0, value: -Infinity };
  for (let row = 0; row < (field?.length ?? 0); row += 1) {
    for (let col = 0; col < (field?.[0]?.length ?? 0); col += 1) {
      const value = valueAt(field, col, row);
      if (value > best.value) best = { x: col, y: row, col, row, value };
    }
  }
  return best.value === -Infinity ? { x: 0, y: 0, col: 0, row: 0, value: 0 } : best;
}

function sameField(a, b, tolerance = 1e-6) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a[0]?.length !== b[0]?.length) return false;
  for (let row = 0; row < a.length; row += 1) {
    for (let col = 0; col < a[0].length; col += 1) {
      if (Math.abs(valueAt(a, col, row) - valueAt(b, col, row)) > tolerance) return false;
    }
  }
  return true;
}

function valueAt(field, col, row, fallback = 0) {
  const value = Number(field?.[row]?.[col]);
  return Number.isFinite(value) ? value : fallback;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
