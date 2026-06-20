import assert from 'node:assert/strict';

import { createIslandArcBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshGeometry.js';
import {
  createThreeLandmassLayer,
  updateThreeLandmassLayer,
  threeLandmassLayerSummary,
  disposeThreeLandmassLayer
} from '../../src/game/three/layers/ThreeLandmassLayer.js';

const bathymetry = createIslandArcBathymetry({ seed: 'landmass-layer', width: 20, height: 14 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const mesh = buildBathymetryMeshGeometry({ surfaceModel: surface });
const layer = createThreeLandmassLayer();
updateThreeLandmassLayer(layer, mesh);
const uuid = layer.mesh.uuid;
updateThreeLandmassLayer(layer, mesh);
const summary = threeLandmassLayerSummary(layer, mesh);

assert.equal(layer.mesh.uuid, uuid, 'landmass reuses stable mesh for unchanged source');
assert.equal(summary.landBuildCount, 1);
assert.ok(summary.landVertexCount > 0);
assert.equal(summary.rendererOwnsRouteBlocking, false);
assert.equal(summary.landElevationDisplayOnly, true);
disposeThreeLandmassLayer(layer);
console.log('smoke_three_landmass_layer: ok');
