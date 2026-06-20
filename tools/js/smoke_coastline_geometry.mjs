import assert from 'node:assert/strict';

import { createIslandArcBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import {
  extractCoastlineSegments,
  simplifyCoastlineSegments,
  validateCoastlineGeometry
} from '../../src/core/rendering/CoastlineGeometry.js';

const bathymetry = createIslandArcBathymetry({ seed: 'coastline', width: 34, height: 22 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const coastline = extractCoastlineSegments({ surfaceModel: surface });
const simplified = simplifyCoastlineSegments({ geometry: coastline });
const validation = validateCoastlineGeometry(simplified);

assert.equal(validation.valid, true);
assert.ok(simplified.segmentCount > 0);
assert.equal(simplified.segmentCount, new Set(simplified.segments.map((s) => `${s.start.x},${s.start.y}:${s.end.x},${s.end.y}`)).size);
assert.deepEqual(extractCoastlineSegments({ surfaceModel: surface }).segments, coastline.segments, 'coastline extraction is deterministic');
console.log('smoke_coastline_geometry: ok');
