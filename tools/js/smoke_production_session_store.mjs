import assert from 'node:assert/strict';
import { createAnchorProductionSessionStore, validateAnchorProductionSessionStore } from '../../src/app/production/AnchorProductionSessionStore.js';

const store = createAnchorProductionSessionStore();
store.loadMission();
const first = store.summary();
assert.ok(first.missionId, 'mission ID exists');
assert.ok(first.planDigest, 'plan digest exists');
store.addWaypoint();
const second = store.summary();
assert.notEqual(first.planDigest, second.planDigest, 'waypoint mutation changes plan digest');
store.launchMission();
store.completeMission('completed');
assert.ok(store.summary().resultDigest, 'result digest exists');
assert.ok(store.summary().replayDigest, 'replay digest exists');
store.reset('smoke');
assert.equal(store.summary().missionId, null, 'reset clears mission');
assert.equal(validateAnchorProductionSessionStore(store).valid, true, 'session validates');
console.log('production session store smoke passed');
