import assert from 'node:assert/strict';

import { createCoastalOperationalBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBottomBoundaryViewModel } from '../../src/core/rendering/BottomBoundaryViewModel.js';
import { buildOperationalDepthLayerViewModel, validateOperationalDepthLayerViewModel } from '../../src/core/rendering/OperationalDepthLayerViewModel.js';

const bathymetry = createCoastalOperationalBathymetry({ seed: 'terrain-layer-mask', width: 46, height: 30 });
const bottom = buildBottomBoundaryViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const model = buildOperationalDepthLayerViewModel({
  bottomBoundary: bottom,
  waterColumnConfig: { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'] },
  activeDepthLayerId: 'deep'
});
const validation = validateOperationalDepthLayerViewModel(model);
assert.equal(validation.valid, true);

const land = firstCell((x, y) => bottom.landMask[y]?.[x] === true, bathymetry.width, bathymetry.height);
const shelf = firstCell((x, y) => !bottom.landMask[y]?.[x] && bottom.bottomDepthField[y]?.[x] > 12 && bottom.bottomDepthField[y]?.[x] < 60, bathymetry.width, bathymetry.height);
const basin = firstCell((x, y) => !bottom.landMask[y]?.[x] && bottom.bottomDepthField[y]?.[x] > 170, bathymetry.width, bathymetry.height);
assert.ok(land && shelf && basin, 'fixture must include land, shelf, and basin cells');

for (const layer of model.layers) {
  assert.equal(layer.validCellMask[land.y][land.x], false, `${layer.id} must be masked through land`);
}
const deep = model.layers.find((layer) => layer.id === 'deep');
const midwater = model.layers.find((layer) => layer.id === 'midwater');
const integrated = model.layers.find((layer) => layer.id === 'integratedWaterColumn');
assert.equal(deep.validCellMask[shelf.y][shelf.x], false, 'deep slab is masked below shallow shelf bottom');
assert.equal(midwater.validCellMask[basin.y][basin.x], true, 'midwater slab is valid in deep basin');
assert.equal(deep.validCellMask[basin.y][basin.x], true, 'deep slab is valid in deep basin');
assert.equal(integrated.representativeDepthMeters, null, 'integrated summary is not a physical layer');
assert.match(integrated.warnings.join(' '), /top-down collapse/i, 'integrated summary warns that it is not physical');

console.log(JSON.stringify({
  ok: true,
  layerIds: model.layerIds,
  maskedBySeabedCounts: model.maskedBySeabedCounts,
  land,
  shelf: { ...shelf, bottomDepthMeters: bottom.bottomDepthField[shelf.y][shelf.x] },
  basin: { ...basin, bottomDepthMeters: bottom.bottomDepthField[basin.y][basin.x] }
}));

function firstCell(predicate, width, height) {
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) if (predicate(x, y)) return { x, y };
  return null;
}
