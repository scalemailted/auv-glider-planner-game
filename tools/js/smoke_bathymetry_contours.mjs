import assert from 'node:assert/strict';

import { createShelfCanyonBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import {
  buildBathymetryContourGeometry,
  validateBathymetryContourGeometry
} from '../../src/core/rendering/BathymetryContourGeometry.js';

const bathymetry = createShelfCanyonBathymetry({ seed: 'contours', width: 30, height: 20 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const contours = buildBathymetryContourGeometry({ surfaceModel: surface, levels: [10, 25, 50, 100, 150] });
const validation = validateBathymetryContourGeometry(contours);

assert.equal(validation.valid, true);
assert.ok(contours.levelsMeters.length >= 3);
assert.ok(contours.segmentCount > 0);
assert.deepEqual(buildBathymetryContourGeometry({ surfaceModel: surface, levels: [10, 25, 50, 100, 150] }).segments, contours.segments);
console.log('smoke_bathymetry_contours: ok');
