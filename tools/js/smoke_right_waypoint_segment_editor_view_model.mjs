import assert from 'node:assert/strict';
import { buildRightWaypointSegmentEditorViewModel } from '../../src/core/rendering/RightWaypointSegmentEditorViewModel.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
const state = { ...fx, selectedAgentId: 'glider-1', ui: { selectedWaypoint: { agentId: 'glider-1', index: 1 } } };
const vm = buildRightWaypointSegmentEditorViewModel({ state, agentId: 'glider-1' });
assert.equal(vm.selectedSegmentLabel, 'W1 -> W2');
assert.equal(vm.rows.filter((row) => row.expanded).length, 1);
assert.equal(vm.rows[1].flightPlan.profileId, 'thermoclineDive');
assert.equal(vm.uiOwnsFlightPlan, false);
console.log('smoke_right_waypoint_segment_editor_view_model: ok', { selected: vm.selectedSegmentLabel, rows: vm.rows.length });
