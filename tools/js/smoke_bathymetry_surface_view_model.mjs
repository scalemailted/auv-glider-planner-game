import assert from 'node:assert/strict';

import { createShelfCanyonBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import {
  buildBathymetrySurfaceViewModel,
  validateBathymetrySurfaceViewModel,
  bathymetrySurfaceViewModelSummary
} from '../../src/core/rendering/BathymetrySurfaceViewModel.js';

const bathymetry = createShelfCanyonBathymetry({ seed: 'surface-vm', width: 28, height: 18 });
const model = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const validation = validateBathymetrySurfaceViewModel(model);
const summary = bathymetrySurfaceViewModelSummary(model);

assert.equal(validation.valid, true);
assert.equal(model.boundaryFlags.canonicalBottomOwnedByCore, true);
assert.equal(model.boundaryFlags.rendererOwnsBathymetry, false);
assert.equal(model.boundaryFlags.usesVisualMeshForPhysics, false);
assert.equal(model.sourceMetadata.synthetic, true);
assert.equal(model.sourceMetadata.calibrated, false);
assert.equal(model.sourceMetadata.operationallyValidated, false);
assert.ok(summary.waterCellCount > 0);
assert.ok(summary.landCellCount > 0);
assert.ok(model.terrainFeatures.length >= 4);
console.log('smoke_bathymetry_surface_view_model: ok');
