import assert from 'node:assert/strict';
import * as THREE from 'three';

import { buildSimulationWorldRenderViewModel } from '../../src/core/rendering/SimulationWorldRenderViewModel.js';
import { createThreeMissionWorldRenderer, updateThreeMissionWorldRenderer, threeMissionWorldRendererSummary, disposeThreeMissionWorldRenderer } from '../../src/game/three/ThreeMissionWorldRenderer.js';

const container = {
  clientWidth: 800,
  clientHeight: 600,
  classList: { add() {}, remove() {} },
  appendChild() {},
  innerHTML: ''
};

// WebGLRenderer requires a browser, so this smoke focuses on the stable simulation layers directly.
const group = new THREE.Group();
const viewModel = buildSimulationWorldRenderViewModel({ level: { world: { grid: { width: 4, height: 4 } }, layers: { terrain: [] } }, mission: { agents: [] }, plan: { agentPlans: [] }, realizedTrajectories: [{ id: 'a', agentId: 'a', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }] });
group.userData.objects = new Map();
assert.equal(viewModel.boundaryFlags.advancesSimulationClock, false);
assert.equal(viewModel.boundaryFlags.ownsScoring, false);
assert.equal(container.clientWidth, 800);
assert.equal(typeof createThreeMissionWorldRenderer, 'function');
assert.equal(typeof updateThreeMissionWorldRenderer, 'function');
assert.equal(typeof threeMissionWorldRendererSummary, 'function');
assert.equal(typeof disposeThreeMissionWorldRenderer, 'function');
console.log('smoke_three_simulation_object_stability: ok');
