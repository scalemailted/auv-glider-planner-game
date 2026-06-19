import assert from 'node:assert/strict';
import { createThreeOperationalDepthSlabLayer, updateThreeOperationalDepthSlabLayer, threeOperationalDepthSlabLayerSummary, disposeThreeOperationalDepthSlabLayer } from '../../src/game/three/layers/ThreeOperationalDepthSlabLayer.js';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const viewModel = makeVolumetricViewModel();
const layer = createThreeOperationalDepthSlabLayer({ name: 'smoke-slabs' });
updateThreeOperationalDepthSlabLayer(layer, viewModel, { labels: false });
const summary = threeOperationalDepthSlabLayerSummary(layer, viewModel);
assert.equal(summary.ownsPlanning, false);
assert.equal(summary.slabObjectCount >= 3, true);
assert.equal(summary.slabTextureCount, summary.slabObjectCount);
assert.equal([...layer.slabs.values()].every((record) => record.mesh.userData.missionObjectType === 'depthCellSlab'), true);
disposeThreeOperationalDepthSlabLayer(layer);
assert.equal(layer.disposed, true);
console.log(JSON.stringify({ ok: true, summary }));
