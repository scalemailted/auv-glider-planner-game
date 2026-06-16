import assert from 'node:assert/strict';

import {
  generateCandidateSamplePoints
} from '../../src/core/demo/samplingPriority/SamplingPriorityCandidates.js';
import { computeSamplingPriority } from '../../src/core/demo/samplingPriority/SamplingPriorityModel.js';
import { createSamplingPriorityScenario } from '../../src/core/demo/samplingPriority/SamplingPriorityScenarios.js';

function fixture(scenarioId, methodId, candidateMode) {
  const scenario = createSamplingPriorityScenario({ scenarioId, seed: `sampling-priority-candidates-${scenarioId}` });
  const result = computeSamplingPriority({ scenario, methodId });
  const candidates = generateCandidateSamplePoints({
    priorityField: result.priorityField,
    components: result.components,
    method: methodId,
    candidateMode,
    candidateCount: 5,
    minDistance: 2.5,
    accessibleMask: scenario.accessibleMask,
    recentSamples: scenario.recentSamples
  });
  return { scenario, result, candidates };
}

const base = fixture('mixedMission', 'weightedAcquisition', 'diverseTopK');
assert.equal(base.candidates.length, 5, 'candidate generator returns requested count when possible');
assert.ok(base.candidates.every((candidate) => candidate.reason), 'candidates have reason labels');
assert.ok(base.candidates.every((candidate) => candidate.accessible), 'candidates are accessible');
assertMinDistance(base.candidates, 2.0);

const hidden = fixture('hiddenPlumeFollowup', 'hiddenEventFollowup', 'hiddenEventCandidates');
assert.ok(hidden.candidates[0].componentBreakdown.hiddenEventProbability >= 0.4, 'hiddenEventCandidates choose hidden-event regions');

const boundary = fixture('uncertainFront', 'boundaryMapping', 'boundaryCandidates');
assert.ok(boundary.candidates[0].componentBreakdown.boundaryStrength >= 0.35, 'boundaryCandidates choose boundary regions');

const stale = fixture('staleMonitoring', 'stalenessRevisit', 'stalenessCandidates');
assert.ok(stale.candidates[0].componentBreakdown.staleness >= 0.35, 'stalenessCandidates choose stale regions');

const validation = fixture('forecastValidation', 'forecastValidation', 'forecastValidationCandidates');
assert.ok(validation.candidates[0].componentBreakdown.forecastValidation >= 0.25, 'forecastValidationCandidates choose validation regions');

console.log('smoke_sampling_priority_candidates: ok');

function assertMinDistance(candidates, minDistance) {
  for (let a = 0; a < candidates.length; a += 1) {
    for (let b = a + 1; b < candidates.length; b += 1) {
      const distance = Math.hypot(candidates[a].x - candidates[b].x, candidates[a].y - candidates[b].y);
      assert.ok(distance >= minDistance, `candidate spacing ${distance.toFixed(2)} >= ${minDistance}`);
    }
  }
}
