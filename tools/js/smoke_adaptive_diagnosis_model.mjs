import assert from 'node:assert/strict';

import { computeAdaptiveDiagnosis, computeAdaptiveDiagnosisScores, createAdaptiveEvidenceSnapshot, validateAdaptiveEvidenceSnapshot } from '../../src/core/benchmark/AdaptiveDiagnosisModel.js';
import { createAdaptiveMissionManagerConfig } from '../../src/core/benchmark/AdaptiveMissionManagerContract.js';
import { createAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';

const config = createAdaptiveMissionManagerConfig();
const expectations = [
  ['highUncertainty', 'reduceUncertainty', 'switchToReduceUncertainty', 'reduceUncertainty'],
  ['shiftedFrontForecastError', 'likelyForecastError', 'switchToValidateForecast', 'validateForecast'],
  ['possibleHiddenPlume', 'possibleHiddenEvent', 'switchToConfirmHiddenEvent', 'confirmHiddenEvent'],
  ['noisyFalseAlarm', 'likelyNoiseOrFalseAlarm', 'pauseForMoreEvidence', 'reconnaissanceSurvey'],
  ['staleMonitoringRevisit', 'staleRegionNeedsRevisit', 'switchToRevisitStaleRegion', 'revisitStaleRegion']
];

for (const [fixtureId, diagnosisId, transitionId, objectiveId] of expectations) {
  const fixture = createAdaptiveManagerFixture(fixtureId);
  const before = JSON.stringify(fixture.evidence);
  const diagnosis = computeAdaptiveDiagnosis(fixture.evidence, config);
  assert.equal(diagnosis.primaryDiagnosis, diagnosisId, `${fixtureId} diagnosis`);
  assert.equal(diagnosis.recommendedTransitionId, transitionId, `${fixtureId} transition`);
  assert.equal(diagnosis.recommendedObjectiveId, objectiveId, `${fixtureId} objective`);
  assert.ok(diagnosis.rationale.length > 20, `${fixtureId} rationale`);
  assert.ok(Number(diagnosis.confidence) > 0, `${fixtureId} confidence`);
  assert.equal(JSON.stringify(fixture.evidence), before, `${fixtureId} evidence is not mutated`);
  const scores = computeAdaptiveDiagnosisScores(fixture.evidence, config);
  assert.equal(Number.isFinite(scores[diagnosisId]), true, `${fixtureId} score finite`);
}

const evidence = createAdaptiveEvidenceSnapshot({ episodeId: 'adaptive-smoke', observationCount: 3, meanUncertainty: 0.5 });
assert.equal(validateAdaptiveEvidenceSnapshot(evidence).valid, true, 'evidence validates');

console.log('smoke_adaptive_diagnosis_model: ok');
