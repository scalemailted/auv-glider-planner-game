import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  THREE_MISSION_HIT_PRIORITY,
  THREE_MISSION_SIMULATION_HIT_PRIORITY,
  createThreeMissionHitTestContext,
  threeMissionHitTestSummary
} from '../../src/game/three/ThreeMissionHitTest.js';

assert.deepEqual(THREE_MISSION_HIT_PRIORITY, ['waypoint', 'planningMarker', 'glider', 'priorityTarget', 'dropZone', 'gridCell', 'terrain', 'none']);
assert.deepEqual(THREE_MISSION_SIMULATION_HIT_PRIORITY, ['glider', 'observation', 'surfacingEvent', 'routeFailure', 'realizedTrajectory', 'routeSegment', 'gridCell', 'terrain', 'none']);
const planningContext = createThreeMissionHitTestContext({ renderer: { viewModel: { missionId: 'test', phase: 'planning' } } });
assert.deepEqual(planningContext.priority, THREE_MISSION_HIT_PRIORITY);
const simulationContext = createThreeMissionHitTestContext({ renderer: { viewModel: { missionId: 'test', phase: 'simulation' } } });
assert.deepEqual(simulationContext.priority, THREE_MISSION_SIMULATION_HIT_PRIORITY);
assert.equal(planningContext.version, 'three-mission-hit-test-three-r1-1');
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
