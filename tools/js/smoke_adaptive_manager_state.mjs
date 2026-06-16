import assert from 'node:assert/strict';

import { createAdaptiveEvidenceSnapshot, computeAdaptiveDiagnosis } from '../../src/core/benchmark/AdaptiveDiagnosisModel.js';
import { createAdaptiveMissionManagerConfig } from '../../src/core/benchmark/AdaptiveMissionManagerContract.js';
import { createAdaptiveMissionManagerState, applyAdaptiveEvidenceSnapshot, applyAdaptiveObjectiveTransition, validateAdaptiveMissionManagerState } from '../../src/core/benchmark/AdaptiveMissionManagerState.js';
import { selectNextAdaptiveObjective } from '../../src/core/benchmark/AdaptiveObjectivePolicy.js';

const config = createAdaptiveMissionManagerConfig();
const state = createAdaptiveMissionManagerState({ episodeId: 'adaptive-state-smoke', policyId: config.policyId });
assert.equal(validateAdaptiveMissionManagerState(state).status, 'PASS', 'state initializes');

const evidence = createAdaptiveEvidenceSnapshot({ episodeId: state.episodeId, observationCount: 8, recentObservationCount: 4, meanUncertainty: 0.8, maxUncertainty: 0.9 });
const diagnosis = computeAdaptiveDiagnosis(evidence, config);
const withEvidence = applyAdaptiveEvidenceSnapshot(state, { ...evidence, diagnosis });
assert.equal(withEvidence.evidenceHistory.length, 1, 'evidence snapshot appended');
assert.equal(withEvidence.status, 'diagnosisReady', 'status moves to diagnosisReady');

const selection = selectNextAdaptiveObjective({ diagnosis, currentObjective: state.currentObjectiveId, managerConfig: config, missionContext: { episodeId: state.episodeId } });
const updated = applyAdaptiveObjectiveTransition(withEvidence, selection.transitionRecord);
assert.equal(updated.currentObjectiveId, 'reduceUncertainty', 'objective updates');
assert.equal(updated.objectiveHistory.at(-1).objectiveId, 'reduceUncertainty', 'objective history updates');
assert.equal(updated.status, 'routePlanningNeeded', 'status moves to routePlanningNeeded after objective update');
assert.equal(validateAdaptiveMissionManagerState(updated).status, 'PASS', 'updated state validates');

const invalid = validateAdaptiveMissionManagerState({
  type: 'anchor.benchmark.adaptive-manager-state',
  benchmarkMode: 'adaptiveBenchmark',
  policyId: 'transparentRuleManager',
  currentObjectiveId: 'reconnaissanceSurvey',
  objectiveHistory: [],
  diagnosisHistory: [],
  evidenceHistory: [],
  surfacingEvents: [],
  decisionCount: 0,
  routeAuthority: 'playerOrSolver',
  objectiveAuthority: 'missionManager',
  status: 'idle',
  warnings: []
});
assert.equal(invalid.valid, false, 'validation catches missing episodeId');

console.log('smoke_adaptive_manager_state: ok');
