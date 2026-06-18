import assert from 'node:assert/strict';
import * as THREE from 'three';

import { buildSimulationWorldRenderViewModel } from '../../src/core/rendering/SimulationWorldRenderViewModel.js';
import { updateThreeSurfacingEventLayer } from '../../src/game/three/layers/ThreeSurfacingEventLayer.js';
import { updateThreeRouteStatusLayer } from '../../src/game/three/layers/ThreeRouteStatusLayer.js';
import { updateThreeSimulationStatusLayer } from '../../src/game/three/layers/ThreeSimulationStatusLayer.js';

const viewModel = buildSimulationWorldRenderViewModel({
  level: { world: { grid: { width: 4, height: 4 } }, layers: { terrain: [] } },
  mission: { agents: [] },
  plan: { agentPlans: [] },
  surfacingEvents: [{ id: 'surface-1', type: 'surfaced', x: 1, y: 1, t: 2 }],
  routeFailures: [{ id: 'blocked-1', type: 'blocked', x: 2, y: 2, t: 3 }],
  simulationStatus: { status: 'paused', timeSeconds: 3 }
});
const surfacing = new THREE.Group();
const route = new THREE.Group();
const status = new THREE.Group();
updateThreeSurfacingEventLayer(surfacing, viewModel);
updateThreeRouteStatusLayer(route, viewModel);
updateThreeSimulationStatusLayer(status, viewModel);
assert.equal(surfacing.children.length, 1);
assert.equal(route.children.length, 1);
assert.equal(status.userData.status.status, 'paused');
console.log('smoke_three_simulation_status_layers: ok');
