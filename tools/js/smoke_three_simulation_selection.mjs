import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { MISSION_WORLD_INTERACTION_INTENT_IDS } from '../../src/core/rendering/MissionWorldInteractionIntent.js';
import { THREE_MISSION_SIMULATION_HIT_PRIORITY, createThreeMissionHitTestContext } from '../../src/game/three/ThreeMissionHitTest.js';

for (const id of ['selectObservation', 'selectSurfacingEvent', 'selectRouteSegment', 'selectRouteFailure']) {
  assert.ok(MISSION_WORLD_INTERACTION_INTENT_IDS.includes(id), `${id} must be supported by the shared intent contract.`);
}
assert.deepEqual(THREE_MISSION_SIMULATION_HIT_PRIORITY.slice(0, 7), ['glider', 'observation', 'surfacingEvent', 'routeFailure', 'realizedTrajectory', 'routeSegment', 'gridCell']);
const context = createThreeMissionHitTestContext({ renderer: { viewModel: { phase: 'simulation' } } });
assert.deepEqual(context.priority, THREE_MISSION_SIMULATION_HIT_PRIORITY);

const simulation = readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
for (const method of ['handleThreeSimulationIntent', 'selectSimulationAgentFromThree', 'selectSimulationObservationFromThree', 'selectSimulationSurfacingEventFromThree', 'selectSimulationRouteSegmentFromThree', 'selectSimulationRouteFailureFromThree']) {
  assert.ok(simulation.includes(method), `SimulationScene must implement ${method}.`);
}
assert.match(simulation, /allowEditing:\s*false/, 'simulation interaction controller must be non-editable.');
assert.match(simulation, /advancesSimulationClock:\s*false/, 'simulation debug must state Three does not advance time.');
assert.doesNotMatch(simulation, /new SimulationEngine[\s\S]{0,200}handleThreeSimulationIntent/, 'Three simulation intent handling must not create a new simulation engine.');

console.log('Three simulation selection smoke passed.');