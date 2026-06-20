import assert from 'node:assert/strict';

import { buildBottomBoundaryViewModel } from '../../src/core/rendering/BottomBoundaryViewModel.js';
import { buildOperationalDepthLayerViewModel } from '../../src/core/rendering/OperationalDepthLayerViewModel.js';

const bottomDepthField = [
  [0, 0, 0, 0, 0, 0],
  [20, 20, 35, 150, 180, 200],
  [20, 25, 40, 160, 190, 210],
  [20, 25, 45, 170, 200, 220]
];
const landMask = bottomDepthField.map((row) => row.map((depth) => depth <= 0));
const bottom = buildBottomBoundaryViewModel({ bottomDepthField, landMask, grid: { width: 6, height: 4 } });
const model = buildOperationalDepthLayerViewModel({
  bottomBoundary: bottom,
  waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] },
  activeDepthLayerId: 'deep'
});
const deep = model.layers.find((layer) => layer.id === 'deep');
const thermocline = model.layers.find((layer) => layer.id === 'thermocline');

assert.equal(deep.validCellMask[1][1], false, 'deep slab is masked on shallow shelf');
assert.equal(deep.validCellMask[1][4], true, 'deep slab remains valid in basin');
assert.equal(thermocline.validCellMask[0][2], false, 'layers are masked through land');
assert.ok(model.maskedBySeabedCounts.deep > 0);
console.log('smoke_terrain_depth_slab_mask_alignment: ok');
