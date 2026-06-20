import assert from 'node:assert/strict';
import { createThreeOperationalDepthSlabLayer, updateThreeOperationalDepthSlabLayer, threeOperationalDepthSlabLayerSummary, disposeThreeOperationalDepthSlabLayer } from '../../src/game/three/layers/ThreeOperationalDepthSlabLayer.js';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const viewModel = makeVolumetricViewModel({ waterColumnUi: { qualityProfile: 'balanced', fieldDisplayMode: 'activeLayerOnly', showFieldOnAllLayers: false } });
const canonicalFieldDigest = JSON.stringify(viewModel.layerFields);
const layer = createThreeOperationalDepthSlabLayer({ name: 'smoke-slabs' });
updateThreeOperationalDepthSlabLayer(layer, viewModel, { labels: false });
const summary = threeOperationalDepthSlabLayerSummary(layer, viewModel);
assert.equal(summary.ownsPlanning, false);
assert.equal(summary.slabObjectCount >= 3, true);
assert.equal(summary.activeTexturedSlabCount, 1, 'Balanced default textures only the active slab');
assert.equal(summary.contextOutlineSlabCount, summary.slabObjectCount - 1, 'Balanced default keeps context slabs as outline/grid objects');
assert.equal(summary.slabTextureCount, 1, 'context slabs do not keep duplicate scalar textures');
assert.equal(summary.allLayerFieldTexturesEnabled, false);
assert.equal([...layer.slabs.values()].every((record) => record.mesh.userData.missionObjectType === 'depthCellSlab'), true);
assert.equal([...layer.slabs.values()].filter((record) => record.mesh.userData.interactive === true).length, 1, 'only the active slab is interactive by default');

const allLayerViewModel = makeVolumetricViewModel({ waterColumnUi: { qualityProfile: 'balanced', fieldDisplayMode: 'allLayers', showFieldOnAllLayers: true } });
assert.equal(JSON.stringify(allLayerViewModel.layerFields), canonicalFieldDigest, 'field display mode does not mutate canonical field data');
updateThreeOperationalDepthSlabLayer(layer, allLayerViewModel, { labels: false });
const allLayerSummary = threeOperationalDepthSlabLayerSummary(layer, allLayerViewModel);
assert.equal(allLayerSummary.allLayerFieldTexturesEnabled, true);
assert.equal(allLayerSummary.slabTextureCount, allLayerSummary.slabObjectCount, 'explicit all-layer field mode restores slab textures');
assert.equal(allLayerSummary.contextOutlineSlabCount, 0);
disposeThreeOperationalDepthSlabLayer(layer);
assert.equal(layer.disposed, true);
console.log(JSON.stringify({ ok: true, summary, allLayerSummary }));
