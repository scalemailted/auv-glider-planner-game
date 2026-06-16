import assert from 'node:assert/strict';

import { createAdaptiveMissionManagerConfig } from '../../src/core/benchmark/AdaptiveMissionManagerContract.js';
import { selectNextAdaptiveObjective, validateAdaptiveObjectiveTransitionRecord } from '../../src/core/benchmark/AdaptiveObjectivePolicy.js';

const config = createAdaptiveMissionManagerConfig();
const expectations = [
  ['likelyForecastError', 'validateForecast'],
  ['likelyHiddenEvent', 'confirmHiddenEvent'],
  ['boundaryAmbiguous', 'mapBoundary'],
  ['sourceLikelyUpstream', 'localizeSource']
];

for (const [diagnosisId, objectiveId] of expectations) {
  const selected = selectNextAdaptiveObjective({
    diagnosis: { primaryDiagnosis: diagnosisId, confidence: 0.82, rationale: `Synthetic ${diagnosisId}` },
    currentObjective: 'reconnaissanceSurvey',
    managerConfig: config,
    missionContext: { episodeId: 'adaptive-policy-smoke', observationCount: 6, recentObservationCount: 3 }
  });
  assert.equal(selected.recommendedObjective.id, objectiveId, `${diagnosisId} maps to ${objectiveId}`);
  assert.equal(selected.transitionRecord.toObjectiveId, objectiveId, `${diagnosisId} transition target`);
  assert.equal(selected.transitionRecord.routeAuthority, 'playerOrSolver', `${diagnosisId} route authority`);
  assert.equal(validateAdaptiveObjectiveTransitionRecord(selected.transitionRecord).status, 'PASS', `${diagnosisId} transition validates`);
}

console.log('smoke_adaptive_objective_policy: ok');
