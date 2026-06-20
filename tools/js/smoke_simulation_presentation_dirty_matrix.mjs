import assert from 'node:assert/strict';
import { dirtyCategoriesForSimulationPresentationEvent } from '../../src/game/three/ThreeSimulationPresentationScheduler.js';

const motion = dirtyCategoriesForSimulationPresentationEvent('motionSnapshot', { newTrajectoryPoint: true, routeStatusChanged: true, includeHud: true });
assert.deepEqual(new Set(motion), new Set(['vehiclePose', 'simulationStatus', 'realizedTrajectory', 'routeStatus', 'hud']));
assert.deepEqual(new Set(dirtyCategoriesForSimulationPresentationEvent('observation')), new Set(['observations', 'hud', 'rightPanel']));
assert.deepEqual(new Set(dirtyCategoriesForSimulationPresentationEvent('surfacing')), new Set(['surfacingEvents', 'routeStatus', 'hud', 'rightPanel', 'timeline']));
assert.deepEqual(dirtyCategoriesForSimulationPresentationEvent('scalarFieldFrame'), ['scalarField']);
assert.deepEqual(dirtyCategoriesForSimulationPresentationEvent('currentFieldFrame'), ['currentVectors']);
assert.deepEqual(dirtyCategoriesForSimulationPresentationEvent('cameraOnly'), []);
assert.deepEqual(new Set(dirtyCategoriesForSimulationPresentationEvent('selection')), new Set(['selection', 'rightPanel']));
console.log('PASS smoke_simulation_presentation_dirty_matrix');
