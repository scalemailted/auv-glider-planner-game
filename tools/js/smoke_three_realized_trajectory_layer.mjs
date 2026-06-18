import assert from 'node:assert/strict';
import * as THREE from 'three';

import { buildSimulationWorldRenderViewModel } from '../../src/core/rendering/SimulationWorldRenderViewModel.js';
import { updateThreeRealizedTrajectoryLayer } from '../../src/game/three/layers/ThreeRealizedTrajectoryLayer.js';

const viewModel = buildSimulationWorldRenderViewModel({ level: { world: { grid: { width: 4, height: 4 } }, layers: { terrain: [] } }, mission: { agents: [] }, plan: { agentPlans: [] }, realizedTrajectories: [{ id: 't1', agentId: 'a1', points: [{ x: 1, y: 1, t: 0 }, { x: 2, y: 2, t: 1 }] }] });
const group = new THREE.Group();
updateThreeRealizedTrajectoryLayer(group, viewModel);
assert.equal(group.children.length, 1);
assert.equal(group.children[0].userData.pointCount, 2);
updateThreeRealizedTrajectoryLayer(group, viewModel);
assert.equal(group.children.length, 1, 'stable update does not duplicate trajectory object');
console.log('smoke_three_realized_trajectory_layer: ok');
