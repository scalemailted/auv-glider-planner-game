import assert from 'node:assert/strict';
import * as THREE from 'three';
import { updateThreeDepthTrajectoryLayer, threeDepthTrajectoryLayerSummary, clearThreeDepthTrajectoryLayer } from '../../src/game/three/layers/ThreeDepthTrajectoryLayer.js';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const group = new THREE.Group();
const viewModel = makeVolumetricViewModel();
updateThreeDepthTrajectoryLayer(group, viewModel);
const summary = threeDepthTrajectoryLayerSummary(group);
assert.equal(summary.ownsPlanning, false);
assert.equal(summary.predictedPathCount > 0, true);
assert.equal(summary.pointCount > 1, true);
clearThreeDepthTrajectoryLayer(group);
assert.equal(group.children.length, 0);
console.log(JSON.stringify({ ok: true, summary }));
