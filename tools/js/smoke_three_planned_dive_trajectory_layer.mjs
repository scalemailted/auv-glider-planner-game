import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  updateThreePlannedDiveTrajectoryLayer,
  clearThreePlannedDiveTrajectoryLayer,
  threePlannedDiveTrajectoryLayerSummary
} from '../../src/game/three/layers/ThreePlannedDiveTrajectoryLayer.js';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const viewModel = makeVolumetricViewModel({ waterColumnUi: { maximumDiveDepthMeters: 95, cycleCount: 2, sampleIntervalSeconds: 180 } });
const group = new THREE.Group();
updateThreePlannedDiveTrajectoryLayer(group, viewModel);
const first = threePlannedDiveTrajectoryLayerSummary(group);
assert.equal(first.surfaceIntentObjectCount > 0, true, 'surface intent path renders separately');
assert.equal(first.predictedDiveObjectCount > 0, true, 'predicted dive path renders');
assert.equal(first.currentCorrectedObjectCount > 0, true, 'current-corrected expected path renders when forecast vectors exist');
assert.equal(first.predictedSampleObjectCount > 0, true, 'predicted sample markers render');
assert.equal(first.layerCrossingObjectCount > 0, true, 'layer-crossing markers render');
assert.equal(first.bottomTurnObjectCount > 0, true, 'bottom-turn markers render');
const objectCount = first.objectCount;
updateThreePlannedDiveTrajectoryLayer(group, viewModel);
const second = threePlannedDiveTrajectoryLayerSummary(group);
assert.equal(second.objectCount, objectCount, 'refresh updates stable objects without duplication');
assert.equal(second.ownsPlanning, false, 'Three layer does not own planning');
assert.equal(second.ownsSimulationState, false, 'Three layer does not own simulation');
assert.equal(second.ownsScoring, false, 'Three layer does not own scoring');
clearThreePlannedDiveTrajectoryLayer(group);
assert.equal(threePlannedDiveTrajectoryLayerSummary(group).objectCount, 0, 'layer disposal clears objects');
console.log(JSON.stringify({ ok: true, first, second }));