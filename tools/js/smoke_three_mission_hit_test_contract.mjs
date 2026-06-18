import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  THREE_MISSION_HIT_PRIORITY,
  createThreeMissionHitTestContext,
  threeMissionHitTestSummary
} from '../../src/game/three/ThreeMissionHitTest.js';

assert.deepEqual(THREE_MISSION_HIT_PRIORITY, ['waypoint', 'planningMarker', 'glider', 'priorityTarget', 'dropZone', 'gridCell', 'terrain', 'none']);
const context = createThreeMissionHitTestContext({ renderer: { viewModel: { missionId: 'test' } } });
assert.deepEqual(context.priority, THREE_MISSION_HIT_PRIORITY);
assert.equal(context.version, 'three-mission-hit-test-gfx-r3b');
const summary = threeMissionHitTestSummary({ category: 'gridCell', objectType: 'gridCell', gridCell: { x: 1, y: 2 } });
assert.equal(summary.usesSharedMissionCoordinates, true);

const source = fs.readFileSync('src/game/three/ThreeMissionHitTest.js', 'utf8');
assert.match(source, /worldToGridCell/, 'grid hit testing must use shared mission coordinates');
assert.match(source, /missionObjectType/, 'entity hit testing must use stable object metadata');
for (const forbidden of ['addWaypoint', 'removeWaypoint', 'updateWaypoint', 'addMarker', 'removeMarker', 'SimulationEngine', 'Scoring']) {
  assert.equal(source.includes(forbidden), false, `hit testing must not own ${forbidden}`);
}
const rendererSource = fs.readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
assert.match(rendererSource, /interactionSurface/, 'renderer must expose a dedicated interaction surface');

console.log('Three mission hit-test contract smoke passed');