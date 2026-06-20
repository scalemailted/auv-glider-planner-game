import assert from 'node:assert/strict';

import { createCoastalOperationalBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshGeometry.js';
import {
  createThreeBathymetryTerrainLayer,
  updateThreeBathymetryTerrainLayer,
  threeBathymetryTerrainLayerSummary,
  disposeThreeBathymetryTerrainLayer
} from '../../src/game/three/layers/ThreeBathymetryTerrainLayer.js';

const bathymetry = createCoastalOperationalBathymetry({ seed: 'three-terrain-layer', width: 18, height: 12 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const transform = createMissionWorldCoordinateTransform({ grid: { width: bathymetry.width, height: bathymetry.height } });
const mesh = buildBathymetryMeshGeometry({ surfaceModel: surface, coordinateSystem: transform });
const layer = createThreeBathymetryTerrainLayer();
updateThreeBathymetryTerrainLayer(layer, mesh, { mode: 'filledContours', qualityProfile: 'balanced' });
const firstUuid = layer.mesh.uuid;
updateThreeBathymetryTerrainLayer(layer, mesh, { mode: 'wireframe', qualityProfile: 'balanced' });
const summary = threeBathymetryTerrainLayerSummary(layer, mesh);

assert.equal(layer.mesh.uuid, firstUuid, 'material-mode update does not rebuild terrain geometry');
assert.equal(summary.indexedGeometry, true);
assert.equal(summary.terrainBuildCount, 1);
assert.equal(summary.terrainVertexCount, mesh.vertexCount);
assert.equal(summary.rendererOwnsBathymetry, false);
assert.equal(summary.usesVisualMeshForPhysics, false);
disposeThreeBathymetryTerrainLayer(layer);
assert.equal(layer.mesh, null);
console.log('smoke_three_bathymetry_terrain_layer: ok');
