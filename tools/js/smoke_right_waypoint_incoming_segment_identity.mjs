import assert from 'node:assert/strict';
import { buildRightWaypointSegmentEditorViewModel } from '../../src/core/rendering/RightWaypointSegmentEditorViewModel.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
const vmW1 = buildRightWaypointSegmentEditorViewModel({ state: { ...fx, selectedAgentId: 'glider-1', ui: { selectedWaypoint: { agentId: 'glider-1', index: 0 } } }, agentId: 'glider-1' });
const vmW2 = buildRightWaypointSegmentEditorViewModel({ state: { ...fx, selectedAgentId: 'glider-1', ui: { selectedWaypoint: { agentId: 'glider-1', index: 1 } } }, agentId: 'glider-1' });
assert.equal(vmW1.rows[0].incomingSegmentLabel, 'Selected Start -> W1');
assert.equal(vmW2.rows[1].incomingSegmentLabel, 'W1 -> W2');
console.log('smoke_right_waypoint_incoming_segment_identity: ok', { first: vmW1.rows[0].incomingSegmentLabel, second: vmW2.rows[1].incomingSegmentLabel });
