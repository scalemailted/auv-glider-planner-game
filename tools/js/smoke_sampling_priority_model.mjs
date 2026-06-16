import assert from 'node:assert/strict';

import { fieldStats, finiteFieldCheck, normalizeField } from '../../src/core/demo/samplingPriority/SamplingPriorityFieldMath.js';
import {
  SAMPLING_PRIORITY_METHOD_IDS,
  computeSamplingPriority
} from '../../src/core/demo/samplingPriority/SamplingPriorityModel.js';
import { createSamplingPriorityScenario } from '../../src/core/demo/samplingPriority/SamplingPriorityScenarios.js';

function assertField01(field, label) {
  assert.equal(finiteFieldCheck(field).ok, true, `${label} finite`);
  const stats = fieldStats(field);
  assert.ok(stats.min >= 0, `${label} min >= 0`);
  assert.ok(stats.max <= 1, `${label} max <= 1`);
}

const mixed = createSamplingPriorityScenario({ scenarioId: 'mixedMission', seed: 'sampling-priority-model-smoke' });
for (const methodId of SAMPLING_PRIORITY_METHOD_IDS) {
  const result = computeSamplingPriority({ scenario: mixed, methodId });
  assertField01(result.priorityField, `${methodId} priority`);
  assert.equal(result.usesRoutePlanning, false, `${methodId} excludes route planning`);
  assert.equal(result.usesFlowCoupling, false, `${methodId} excludes flow coupling`);
}

const weighted = computeSamplingPriority({ scenario: mixed, methodId: 'weightedAcquisition' });
assert.notDeepEqual(weighted.priorityField, weighted.components.eventIntensity, 'weightedAcquisition does not equal event intensity');

const known = createSamplingPriorityScenario({ scenarioId: 'knownHotspot', seed: 'sampling-priority-ucb-smoke' });
const ucb = computeSamplingPriority({ scenario: known, methodId: 'ucbStyle', beta: 0.5, weights: { hazard: 0, redundancy: 0, mask: 0 } });
const expectedUcb = normalizeField(known.beliefRoiField.map((row, y) => row.map((value, x) => value + 0.5 * known.expectedUncertaintyField[y][x])));
assert.deepEqual(ucb.priorityField, expectedUcb, 'ucbStyle equals normalized belief + beta uncertainty without suppression');

const threshold = computeSamplingPriority({ scenario: known, methodId: 'thresholdAmbiguity', threshold: 0.5, weights: { hazard: 0, redundancy: 0, mask: 0 } });
const ambiguityPeak = maxPoint(threshold.components.thresholdAmbiguity);
assert.ok(threshold.priorityField[ambiguityPeak.y][ambiguityPeak.x] >= fieldStats(threshold.priorityField).mean, 'thresholdAmbiguity favors near-threshold areas');

const hazardScenario = createSamplingPriorityScenario({ scenarioId: 'hazardSuppression', seed: 'sampling-priority-hazard-smoke' });
const hazard = computeSamplingPriority({ scenario: hazardScenario, methodId: 'weightedAcquisition' });
const hazardPeak = maxPoint(hazard.components.hazard);
assert.ok(hazard.priorityField[hazardPeak.y][hazardPeak.x] < 0.55 || hazard.components.accessibleMask[hazardPeak.y][hazardPeak.x] === 0, 'hazard suppresses priority');

const redundantScenario = createSamplingPriorityScenario({ scenarioId: 'uncertainFront', seed: 'sampling-priority-redundancy-smoke' });
const redundant = computeSamplingPriority({ scenario: redundantScenario, methodId: 'weightedAcquisition' });
const recentPeak = maxPoint(redundant.components.recentSamplePenalty);
assert.ok(redundant.priorityField[recentPeak.y][recentPeak.x] < 0.85, 'redundancy suppresses priority');

console.log('smoke_sampling_priority_model: ok');

function maxPoint(field) {
  let best = { x: 0, y: 0, value: -Infinity };
  for (let y = 0; y < field.length; y += 1) {
    for (let x = 0; x < field[0].length; x += 1) {
      const value = Number(field[y][x]);
      if (value > best.value) best = { x, y, value };
    }
  }
  return best;
}
