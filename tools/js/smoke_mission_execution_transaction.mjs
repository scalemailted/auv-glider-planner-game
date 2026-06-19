function assert(condition, message) {
  if (!condition) throw new Error(message);
}

import {
  createMissionExecutionTransaction,
  advanceMissionExecutionTransaction,
  failMissionExecutionTransaction,
  missionExecutionTransactionSummary,
  validateMissionExecutionTransaction
} from '../../src/core/simulation/MissionExecutionTransaction.js';

const transaction = createMissionExecutionTransaction({ levelId: 'level-a', missionId: 'mission-a', seed: 'seed-a' });
advanceMissionExecutionTransaction(transaction, 'planningToolCancelled', { pointerCaptureReleased: true });
advanceMissionExecutionTransaction(transaction, 'planSnapshotBuilt', { planSummary: { executableWaypointCount: 2 } });
advanceMissionExecutionTransaction(transaction, 'planValidated', { validationSummary: { ok: true } });
advanceMissionExecutionTransaction(transaction, 'launchPayloadBuilt', { launchPayloadSummary: { hasPlan: true } });
advanceMissionExecutionTransaction(transaction, 'sceneTransitionRequested', { scene: 'SimulationScene' });
const validation = validateMissionExecutionTransaction(transaction);
assert(validation.valid, validation.errors.join('; '));
const summary = missionExecutionTransactionSummary(transaction);
assert(summary.boundaryFlags.rendererOwnsExecution === false, 'renderer must not own execution');
assert(summary.boundaryFlags.usesCanonicalPlan === true, 'transaction must use canonical plan');
assert(!JSON.stringify(summary).includes('renderer.domElement'), 'summary must not include renderer objects');

const failed = createMissionExecutionTransaction({ levelId: 'level-b', missionId: 'mission-b' });
failMissionExecutionTransaction(failed, 'planValidated', 'invalid waypoint', { details: { x: 1, y: 2 } });
const failedValidation = validateMissionExecutionTransaction(failed);
assert(failedValidation.valid, failedValidation.errors.join('; '));
assert(failed.failureStage === 'planValidated', 'failure stage should be preserved');
assert(failed.failureReason === 'invalid waypoint', 'failure reason should be preserved');

console.log('smoke_mission_execution_transaction passed');