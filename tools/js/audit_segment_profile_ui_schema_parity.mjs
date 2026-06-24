import assert from 'node:assert/strict';
import { SEGMENT_ARRIVAL_BEHAVIORS, SEGMENT_FLIGHT_PROFILE_CHOICES, SEGMENT_SAMPLING_PHASES } from '../../src/core/planning/SegmentFlightPlan.js';
import { buildRightWaypointSegmentEditorViewModel } from '../../src/core/rendering/RightWaypointSegmentEditorViewModel.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
const vm = buildRightWaypointSegmentEditorViewModel({ state: { ...fx, selectedAgentId: 'glider-1', ui: {} }, agentId: 'glider-1' });
assert.deepEqual(vm.samplingPhaseOptions, SEGMENT_SAMPLING_PHASES);
assert.deepEqual(vm.arrivalBehaviorOptions, SEGMENT_ARRIVAL_BEHAVIORS);
assert.equal(vm.profileOptions.length, SEGMENT_FLIGHT_PROFILE_CHOICES.length);
console.log('audit_segment_profile_ui_schema_parity: ok');
