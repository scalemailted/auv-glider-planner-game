import assert from 'node:assert/strict';

import {
  MISSION_WORLD_INTERACTION_RESULT_STATUSES,
  createMissionWorldInteractionResult,
  missionWorldInteractionResultSummary,
  validateMissionWorldInteractionResult
} from '../../src/core/rendering/MissionWorldInteractionResult.js';

for (const status of ['accepted', 'rejected', 'preview', 'cancelled', 'noChange', 'invalid']) {
  assert.ok(MISSION_WORLD_INTERACTION_RESULT_STATUSES.includes(status), `missing status ${status}`);
}

const accepted = createMissionWorldInteractionResult({ intentId: 'placeWaypoint', status: 'accepted', changedCanonicalState: true, selectedWaypointId: 'wp-1' });
assert.equal(validateMissionWorldInteractionResult(accepted).valid, true);
assert.equal(accepted.accepted, true);
assert.equal(accepted.changedCanonicalState, true);
assert.equal(accepted.boundaryFlags.usesNewPlanner, false);
assert.equal(accepted.boundaryFlags.usesRouteOptimizer, false);

const rejected = createMissionWorldInteractionResult({ intentId: 'placeWaypoint', status: 'rejected', changedCanonicalState: true, warnings: ['blocked terrain'] });
assert.equal(validateMissionWorldInteractionResult(rejected).valid, true);
assert.equal(rejected.accepted, false);
assert.equal(rejected.changedCanonicalState, false, 'rejected placement must not report canonical mutation');
assert.deepEqual(rejected.warnings, ['blocked terrain']);

const preview = createMissionWorldInteractionResult({ intentId: 'previewWaypointMove', status: 'preview', preview: { active: true, to: { x: 2, y: 3 } } });
assert.equal(validateMissionWorldInteractionResult(preview).valid, true);
assert.equal(preview.status, 'preview');
assert.equal(preview.changedCanonicalState, false);

const invalid = { ...accepted, status: 'bogus' };
assert.equal(validateMissionWorldInteractionResult(invalid).valid, false);
const boundaryInvalid = { ...accepted, boundaryFlags: { ...accepted.boundaryFlags, ownsPlanning: true } };
assert.equal(validateMissionWorldInteractionResult(boundaryInvalid).valid, false);
const summary = missionWorldInteractionResultSummary(rejected);
assert.equal(summary.warningCount, 1);
assert.equal(summary.ownsPlanning, false);

console.log('Mission world interaction result smoke passed');