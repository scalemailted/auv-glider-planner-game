import assert from 'node:assert/strict';
import * as THREE from 'three';

import { buildSimulationWorldRenderViewModel } from '../../src/core/rendering/SimulationWorldRenderViewModel.js';
import { updateThreeObservationLayer } from '../../src/game/three/layers/ThreeObservationLayer.js';

const viewModel = buildSimulationWorldRenderViewModel({ level: { world: { grid: { width: 4, height: 4 } }, layers: { terrain: [] } }, mission: { agents: [] }, plan: { agentPlans: [] }, observations: [{ id: 'obs-1', type: 'sample', x: 2, y: 2, t: 1, status: 'collected' }] });
const group = new THREE.Group();
updateThreeObservationLayer(group, viewModel);
assert.equal(group.children.length, 1);
assert.equal(group.children[0].userData.sourceVisibility, 'publicResult');
updateThreeObservationLayer(group, viewModel);
assert.equal(group.children.length, 1, 'stable update does not duplicate observation marker');
console.log('smoke_three_observation_layer: ok');
