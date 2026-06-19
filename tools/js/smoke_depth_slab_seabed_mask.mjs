import assert from 'node:assert/strict';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const model = makeVolumetricViewModel();
const deep = model.depthLayers.find((layer) => layer.id === 'deep');
const surface = model.depthLayers.find((layer) => layer.id === 'surface');
assert.equal(deep.validCellMask[0][0], false, 'Land cell should mask deep slab.');
assert.equal(deep.validCellMask[1][1], false, 'Shallow bottom should mask deep slab.');
assert.equal(surface.validCellMask[1][1], true, 'Surface remains valid in shallow water.');
assert.equal(model.operationalDepthLayerModel.maskedBySeabedCounts.deep > model.operationalDepthLayerModel.maskedBySeabedCounts.surface, true);
console.log(JSON.stringify({ ok: true, maskedBySeabedCounts: model.operationalDepthLayerModel.maskedBySeabedCounts }));
