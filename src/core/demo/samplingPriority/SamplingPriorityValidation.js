import {
  fieldStats,
  finiteFieldCheck
} from './SamplingPriorityFieldMath.js';
import { generateCandidateSamplePoints } from './SamplingPriorityCandidates.js';
import { computeSamplingPriority } from './SamplingPriorityModel.js';
import { createSamplingPriorityScenario } from './SamplingPriorityScenarios.js';

export function validateSamplingPriorityResult(result = {}) {
  const checks = [];
  const warnings = [];
  const scenario = result.scenario ?? {};
  const priorityField = result.priorityField ?? result.samplingPriorityField;
  const components = result.components ?? {};
  const width = Number(scenario.width ?? priorityField?.[0]?.length ?? 0);
  const height = Number(scenario.height ?? priorityField?.length ?? 0);

  pushCheck(checks, 'priority field finite', finiteFieldCheck(priorityField).ok);
  pushCheck(checks, 'priority field in [0,1]', fieldInRange(priorityField, 0, 1));

  for (const [key, field] of Object.entries(components)) {
    if (!Array.isArray(field)) continue;
    const check = finiteFieldCheck(field);
    pushCheck(checks, `${key} finite`, check.ok);
    pushCheck(checks, `${key} shape`, check.width === width && check.height === height);
  }

  const activeScenario = ['uncertainFront', 'forecastValidation', 'hiddenPlumeFollowup', 'bloomBoundary', 'staleMonitoring', 'hazardSuppression', 'mixedMission'].includes(scenario.scenarioId);
  if (activeScenario) {
    pushCheck(checks, 'priority is not identical to event intensity', !sameField(priorityField, components.eventIntensity));
  }

  if (fieldStats(components.hazard).max > 0.4) {
    const point = maxPoint(components.hazard);
    const priority = valueAt(priorityField, point.x, point.y);
    pushCheck(checks, 'hazard suppresses priority', priority < 0.55 || valueAt(components.accessibleMask, point.x, point.y, 1) === 0);
  }

  if (fieldStats(components.recentSamplePenalty).max > 0.35) {
    const point = maxPoint(components.recentSamplePenalty);
    const priority = valueAt(priorityField, point.x, point.y);
    pushCheck(checks, 'recent sample penalty suppresses local priority', priority < 0.85);
  }

  const methodId = result.methodId ?? 'weightedAcquisition';
  const methodTargets = {
    boundaryMapping: 'boundaryStrength',
    uncertaintyReduction: 'expectedUncertainty',
    hiddenEventFollowup: 'hiddenEventProbability',
    stalenessRevisit: 'staleness',
    forecastValidation: 'forecastValidation'
  };
  const target = methodTargets[methodId];
  if (target && fieldStats(components[target]).max > 0.15) {
    const point = maxPoint(components[target]);
    pushCheck(checks, `${methodId} favors ${target}`, valueAt(priorityField, point.x, point.y) >= fieldStats(priorityField).mean);
  }

  const candidates = result.candidateSamplePoints ?? [];
  if (candidates.length) {
    pushCheck(checks, 'candidate points are accessible', candidates.every((point) => point.accessible !== false));
    pushCheck(checks, 'candidate points are not all duplicates', new Set(candidates.map((point) => `${point.x},${point.y}`)).size > 1 || candidates.length === 1);
    pushCheck(checks, 'candidate reason labels exist', candidates.every((point) => Boolean(point.reason)));
  } else {
    warnings.push('No candidate points were provided to validation.');
  }

  const failed = checks.filter((check) => check.status === 'FAIL');
  return {
    status: failed.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    checks,
    metrics: {
      priorityStats: fieldStats(priorityField),
      eventIntensityStats: fieldStats(components.eventIntensity),
      hazardStats: fieldStats(components.hazard),
      redundancyStats: fieldStats(components.recentSamplePenalty),
      candidateCount: candidates.length
    },
    warnings
  };
}

export function runSamplingPriorityFixture(scenarioId = 'uncertainFront', methodId = 'weightedAcquisition') {
  const scenario = createSamplingPriorityScenario({ scenarioId, seed: 'sampling-priority-fixture' });
  const result = computeSamplingPriority({ scenario, methodId });
  const candidateSamplePoints = generateCandidateSamplePoints({
    priorityField: result.priorityField,
    components: result.components,
    method: methodId,
    candidateMode: fixtureCandidateMode(methodId),
    candidateCount: 6,
    minDistance: 3,
    accessibleMask: scenario.accessibleMask,
    recentSamples: scenario.recentSamples
  });
  const repeatScenario = createSamplingPriorityScenario({ scenarioId, seed: 'sampling-priority-fixture' });
  const repeat = computeSamplingPriority({ scenario: repeatScenario, methodId });
  const validation = validateSamplingPriorityResult({
    ...result,
    scenario,
    candidateSamplePoints
  });
  const deterministicCheck = {
    name: 'deterministic seed produces repeatable output',
    status: sameField(result.priorityField, repeat.priorityField) ? 'PASS' : 'FAIL'
  };
  validation.checks.push(deterministicCheck);
  if (deterministicCheck.status === 'FAIL') validation.status = 'FAIL';
  return {
    ...result,
    scenario,
    candidateSamplePoints,
    validation
  };
}

export function summarizePriorityResult(result = {}) {
  const validation = result.validation ?? validateSamplingPriorityResult(result);
  return {
    scenarioId: result.scenario?.scenarioId ?? result.scenarioId,
    scenarioLabel: result.scenario?.scenarioLabel ?? result.scenarioLabel,
    methodId: result.methodId,
    methodLabel: result.methodLabel,
    status: validation.status,
    priorityStats: fieldStats(result.priorityField ?? result.samplingPriorityField),
    candidateCount: result.candidateSamplePoints?.length ?? 0,
    topCandidates: (result.candidateSamplePoints ?? []).slice(0, 3).map((candidate) => ({
      id: candidate.id,
      x: candidate.x,
      y: candidate.y,
      priority: candidate.priority,
      reason: candidate.reason
    })),
    warnings: validation.warnings ?? []
  };
}

function fixtureCandidateMode(methodId) {
  return {
    boundaryMapping: 'boundaryCandidates',
    uncertaintyReduction: 'uncertaintyCandidates',
    hiddenEventFollowup: 'hiddenEventCandidates',
    stalenessRevisit: 'stalenessCandidates',
    forecastValidation: 'forecastValidationCandidates'
  }[methodId] ?? 'diverseTopK';
}

function pushCheck(checks, name, pass, detail = '') {
  checks.push({ name, status: pass ? 'PASS' : 'FAIL', detail });
}

function fieldInRange(field, min, max) {
  if (!Array.isArray(field)) return false;
  return field.every((row) => Array.isArray(row) && row.every((value) => Number(value) >= min - 1e-9 && Number(value) <= max + 1e-9));
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

function maxPoint(field) {
  let best = { x: 0, y: 0, value: -Infinity };
  for (let y = 0; y < (field?.length ?? 0); y += 1) {
    for (let x = 0; x < (field?.[0]?.length ?? 0); x += 1) {
      const value = valueAt(field, x, y);
      if (value > best.value) best = { x, y, value };
    }
  }
  return best;
}

function valueAt(field, x, y, fallback = 0) {
  const value = Number(field?.[y]?.[x]);
  return Number.isFinite(value) ? value : fallback;
}
