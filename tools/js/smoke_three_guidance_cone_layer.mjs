import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { updateThreeGuidanceConeLayer } from '../../src/game/three/layers/ThreeGuidanceConeLayer.js';

const group = new THREE.Group();
const coordinateSystem = createMissionWorldCoordinateTransform({ grid: { width: 8, height: 8 }, cellSize: 1 });
const viewModel = { coordinateSystem, guidance: { source: 'truth', driftCone: { origin: { x: 1, y: 1 }, target: { x: 4, y: 1 }, polygon: [{ x: 1, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 0 }], feasibility: 'likely' }, reachableRegion: { center: { x: 1, y: 1 }, radiusX: 2, radiusY: 1 }, previewPath: [{ x: 1, y: 1 }, { x: 4, y: 1 }] } };
updateThreeGuidanceConeLayer(group, viewModel);
assert.equal(group.userData.guidanceAvailable, true);
assert.equal(group.userData.guidanceConeVisible, true);
assert.equal(group.userData.computesRouteFeasibility, false);
const count = group.children.length;
updateThreeGuidanceConeLayer(group, viewModel);
assert.equal(group.children.length, count, 'guidance update should not duplicate objects');
console.log('smoke_three_guidance_cone_layer passed');
