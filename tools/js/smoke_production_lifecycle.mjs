import assert from 'node:assert/strict';
import { createAnchorProductionLifecycle, dispatchAnchorLifecycleCommand, validateAnchorProductionLifecycle } from '../../src/app/production/AnchorProductionLifecycle.js';
import { createAnchorProductionSessionStore } from '../../src/app/production/AnchorProductionSessionStore.js';

const store = createAnchorProductionSessionStore();
const lifecycle = createAnchorProductionLifecycle({ sessionStore: store });
assert.equal(dispatchAnchorLifecycleCommand(lifecycle, 'executeMission').accepted, false, 'execute cannot start from Product Hub');
assert.equal(lifecycle.invalidTransitionCount, 1, 'illegal transition is recorded');
for (const command of ['openMissionSetup', 'loadMission', 'startPlanning', 'executeMission', 'surfaceMission', 'continueMission', 'finishMission', 'openReplayReview', 'returnFromReplay', 'returnToMainMenu']) {
  const result = dispatchAnchorLifecycleCommand(lifecycle, command);
  assert.equal(result.accepted, true, `${command} should be accepted`);
}
assert.equal(validateAnchorProductionLifecycle(lifecycle).valid, true, 'lifecycle validates');
assert.ok(store.summary().resultDigest, 'result digest is preserved after finish');
assert.ok(store.summary().replayDigest, 'replay digest is preserved after replay route');
console.log('production lifecycle smoke passed');
