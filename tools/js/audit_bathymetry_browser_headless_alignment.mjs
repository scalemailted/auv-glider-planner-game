import assert from 'node:assert/strict';

import { createShelfCanyonBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshGeometry.js';
import { compareBathymetryMeshAndCanonicalSampler } from '../../src/core/rendering/BathymetryMeshSampler.js';
import { buildBottomBoundaryViewModel } from '../../src/core/rendering/BottomBoundaryViewModel.js';

const bathymetry = createShelfCanyonBathymetry({ seed: 'browser-headless-align', width: 24, height: 16 });
const browserSurface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const headlessBottom = buildBottomBoundaryViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const headlessSurface = buildBathymetrySurfaceViewModel({ bottomBoundary: headlessBottom, sourceMetadata: bathymetry.sourceMetadata, terrainFeatures: bathymetry.terrainFeatures });
const mesh = buildBathymetryMeshGeometry({ surfaceModel: browserSurface });
const alignment = compareBathymetryMeshAndCanonicalSampler({ geometry: mesh, surfaceModel: headlessSurface });

assert.deepEqual(browserSurface.bottomDepthField, headlessSurface.bottomDepthField, 'browser/headless bottom field aligns');
assert.deepEqual(browserSurface.landMask, headlessSurface.landMask, 'browser/headless land mask aligns');
assert.equal(browserSurface.sourceMetadata.synthetic, true);
assert.equal(alignment.status, 'PASS');
console.log('audit_bathymetry_browser_headless_alignment: ok');
