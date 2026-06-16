import {
  fieldStats,
  finiteFieldCheck
} from './FlowCoupledSamplingFieldMath.js';
import { generateGliderActionCandidates } from './GliderActionCandidates.js';
import {
  computeGliderActionValue,
  GLIDER_ACTION_METHOD_IDS
} from './GliderActionValueModel.js';
import {
  createFlowCoupledSamplingScenario,
  FLOW_COUPLED_SAMPLING_SCENARIO_IDS
} from './FlowCoupledSamplingScenarios.js';

export function validateGliderActionValueResult(result = {}) {
  const checks = [];
  const warnings = [];
  const scenario = result.scenario ?? {};
  const components = result.components ?? {};
  const actionValueField = result.actionValueField;
  const width = Number(scenario.width ?? actionValueField?.[0]?.length ?? 0);
  const height = Number(scenario.height ?? actionValueField?.length ?? 0);

  pushCheck(checks, 'action value finite', finiteFieldCheck(actionValueField).ok);
  pushCheck(checks, 'action value in [0,1]', fieldInRange(actionValueField, 0, 1));
  pushCheck(checks, 'action value differs from global priority when vehicle costs exist', !sameField(actionValueField, components.globalPriority));

  for (const [key, field] of Object.entries(components)) {
    if (!Array.isArray(field)) continue;
    const finite = finiteFieldCheck(field);
    pushCheck(checks, `${key} finite`, finite.ok);
    pushCheck(checks, `${key} shape`, finite.width === width && finite.height === height);
  }

  const timeBudget = Number(components.timeBudget ?? components.glider?.timeBudget ?? 12);
  const energyBudget = Number(components.energyBudget ?? components.glider?.energyBudget ?? 0.82);
  pushCheck(checks, 'reachable mask respects time budget', maskRespectsLimit(components.reachableMask, components.arrivalTimeRaw, timeBudget));
  pushCheck(checks, 'reachable mask respects energy budget', maskRespectsLimit(components.reachableMask, components.energyCost, energyBudget));
  pushCheck(checks, 'accessible mask suppresses action value', suppressedWhereMaskZero(actionValueField, components.accessibleMask));

  if (fieldStats(components.hazardPenalty).max > 0.4) {
    const hazardPeak = maxPoint(components.hazardPenalty);
    pushCheck(
      checks,
      'hazard suppresses action value',
      valueAt(actionValueField, hazardPeak.x, hazardPeak.y) < 0.32 || valueAt(components.accessibleMask, hazardPeak.x, hazardPeak.y, 1) === 0
    );
  }

  if (scenario.scenarioId === 'crossCurrentRisk') {
    pushCheck(checks, 'cross-current fixture has nonzero risk', fieldStats(components.crossCurrentRisk).max > 0.25);
  }

  if (result.methodId === 'currentAssisted') {
    const top = maxPoint(actionValueField);
    pushCheck(checks, 'current-assisted method favors assisted cells', valueAt(components.currentAssist, top.x, top.y) >= fieldStats(components.currentAssist).mean);
  }

  if (result.methodId === 'riskAvoidant') {
    const top = maxPoint(actionValueField);
    pushCheck(checks, 'riskAvoidant avoids high cross-current/hazard cells',
      valueAt(components.crossCurrentRisk, top.x, top.y) < 0.72 && valueAt(components.hazardPenalty, top.x, top.y) < 0.55);
  }

  if (result.methodId === 'interceptFuturePriority') {
    const top = maxPoint(actionValueField);
    pushCheck(checks, 'interceptFuturePriority favors future priority', valueAt(components.futurePriority, top.x, top.y) >= fieldStats(components.futurePriority).mean);
  }

  if (result.methodId === 'redundancyAware') {
    const top = maxPoint(actionValueField);
    pushCheck(checks, 'redundancyAware suppresses redundant regions', valueAt(components.redundancyPenalty, top.x, top.y) <= 0.72);
  }

  const candidates = result.candidateTargets ?? [];
  if (candidates.length) {
    pushCheck(checks, 'candidate points include reason labels', candidates.every((point) => Boolean(point.reason)));
    const reachRequired = ['reachableTopK', 'currentAssistedTargets', 'lowRiskTargets', 'interceptTargets', 'energyEfficientTargets', 'redundancyAvoidingTargets', 'scienceFirstReachable'].includes(result.candidateMode);
    if (reachRequired) {
      pushCheck(checks, 'candidate points are reachable when mode requires it', candidates.every((point) => point.reachable && point.accessible));
    }
  } else {
    warnings.push('No candidate targets were provided to validation.');
  }

  const failed = checks.filter((check) => check.status === 'FAIL');
  return {
    status: failed.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    checks,
    metrics: {
      actionValueStats: fieldStats(actionValueField),
      globalPriorityStats: fieldStats(components.globalPriority),
      currentAssistStats: fieldStats(components.currentAssist),
      currentOppositionStats: fieldStats(components.currentOpposition),
      crossCurrentRiskStats: fieldStats(components.crossCurrentRisk),
      energyCostStats: fieldStats(components.energyCost),
      hazardStats: fieldStats(components.hazardPenalty),
      redundancyStats: fieldStats(components.redundancyPenalty),
      candidateCount: candidates.length
    },
    warnings
  };
}

export function runFlowCoupledSamplingFixture(scenarioId = 'currentOpposedTarget', methodId = 'balancedActionValue') {
  const scenario = createFlowCoupledSamplingScenario({
    scenarioId,
    seed: 'flow-coupled-sampling-fixture'
  });
  const result = computeGliderActionValue({ scenario, methodId });
  const candidateTargets = generateGliderActionCandidates({
    actionValueField: result.actionValueField,
    components: result.components,
    glider: result.components.glider,
    candidateCount: 6,
    minDistance: 3,
    accessibleMask: result.components.accessibleMask,
    reachableMask: result.components.reachableMask,
    candidateMode: fixtureCandidateMode(methodId)
  });
  const repeatScenario = createFlowCoupledSamplingScenario({
    scenarioId,
    seed: 'flow-coupled-sampling-fixture'
  });
  const repeat = computeGliderActionValue({ scenario: repeatScenario, methodId });
  const validation = validateGliderActionValueResult({
    ...result,
    scenario,
    candidateTargets,
    candidateMode: fixtureCandidateMode(methodId)
  });
  pushCheck(validation.checks, 'deterministic seed produces repeatable output', sameField(result.actionValueField, repeat.actionValueField));
  if (scenarioId === 'currentOpposedTarget') {
    const assisted = runComparableActionMax('currentAssistedTarget', methodId);
    const opposed = fieldStats(result.actionValueField).max;
    pushCheck(validation.checks, 'opposing current lowers action value relative to aligned-current fixture', opposed < assisted);
  }
  validation.status = validation.checks.some((check) => check.status === 'FAIL') ? 'FAIL' : validation.warnings.length ? 'WARN' : 'PASS';
  return {
    ...result,
    scenario,
    candidateTargets,
    candidateMode: fixtureCandidateMode(methodId),
    validation
  };
}

export function summarizeGliderActionResult(result = {}) {
  const validation = result.validation ?? validateGliderActionValueResult(result);
  return {
    scenarioId: result.scenario?.scenarioId ?? result.scenarioId,
    scenarioLabel: result.scenario?.scenarioLabel ?? result.scenarioLabel,
    methodId: result.methodId,
    methodLabel: result.methodLabel,
    status: validation.status,
    actionValueStats: fieldStats(result.actionValueField),
    candidateCount: result.candidateTargets?.length ?? 0,
    topCandidates: (result.candidateTargets ?? []).slice(0, 3).map((candidate) => ({
      id: candidate.id,
      x: candidate.x,
      y: candidate.y,
      actionValue: candidate.actionValue,
      reason: candidate.reason
    })),
    warnings: validation.warnings ?? []
  };
}

export function runFlowCoupledSamplingValidationMatrix() {
  return FLOW_COUPLED_SAMPLING_SCENARIO_IDS.flatMap((scenarioId) => (
    GLIDER_ACTION_METHOD_IDS.map((methodId) => summarizeGliderActionResult(runFlowCoupledSamplingFixture(scenarioId, methodId)))
  ));
}

function fixtureCandidateMode(methodId) {
  return {
    currentAssisted: 'currentAssistedTargets',
    riskAvoidant: 'lowRiskTargets',
    interceptFuturePriority: 'interceptTargets',
    energyAware: 'energyEfficientTargets',
    redundancyAware: 'redundancyAvoidingTargets',
    scienceFirst: 'scienceFirstReachable'
  }[methodId] ?? 'reachableTopK';
}

function runComparableActionMax(scenarioId, methodId) {
  const scenario = createFlowCoupledSamplingScenario({
    scenarioId,
    seed: 'flow-coupled-sampling-fixture'
  });
  return fieldStats(computeGliderActionValue({ scenario, methodId }).actionValueField).max;
}

function pushCheck(checks, name, pass, detail = '') {
  checks.push({ name, status: pass ? 'PASS' : 'FAIL', detail });
}

function fieldInRange(field, min, max) {
  if (!Array.isArray(field)) return false;
  return field.every((row) => Array.isArray(row) && row.every((value) => Number(value) >= min - 1e-9 && Number(value) <= max + 1e-9));
}

function maskRespectsLimit(mask, field, limit) {
  if (!Array.isArray(mask) || !Array.isArray(field)) return false;
  for (let row = 0; row < mask.length; row += 1) {
    for (let col = 0; col < (mask[0]?.length ?? 0); col += 1) {
      if (valueAt(mask, col, row) > 0 && valueAt(field, col, row, Infinity) > limit + 1e-6) return false;
    }
  }
  return true;
}

function suppressedWhereMaskZero(field, mask) {
  if (!Array.isArray(mask)) return true;
  for (let row = 0; row < mask.length; row += 1) {
    for (let col = 0; col < (mask[0]?.length ?? 0); col += 1) {
      if (valueAt(mask, col, row, 1) <= 0 && valueAt(field, col, row) > 1e-9) return false;
    }
  }
  return true;
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

function maxPoint(field) {
  let best = { x: 0, y: 0, value: -Infinity };
  for (let row = 0; row < (field?.length ?? 0); row += 1) {
    for (let col = 0; col < (field?.[0]?.length ?? 0); col += 1) {
      const value = valueAt(field, col, row);
      if (value > best.value) best = { x: col, y: row, value };
    }
  }
  return best;
}

function valueAt(field, col, row, fallback = 0) {
  const value = Number(field?.[row]?.[col]);
  return Number.isFinite(value) ? value : fallback;
}
