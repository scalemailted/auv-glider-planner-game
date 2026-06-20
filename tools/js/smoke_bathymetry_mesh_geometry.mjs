import assert from 'node:assert/strict';

import { createBasinSeamountBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import {
  buildBathymetryMeshGeometry,
  validateBathymetryMeshGeometry,
  bathymetryMeshGeometrySummary
} from '../../src/core/rendering/BathymetryMeshGeometry.js';

const bathymetry = createBasinSeamountBathymetry({ seed: 'mesh-geometry', width: 24, height: 16 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const transform = createMissionWorldCoordinateTransform({ grid: { width: bathymetry.width, height: bathymetry.height }, verticalExaggeration: 1.4 });
const mesh = buildBathymetryMeshGeometry({ surfaceModel: surface, coordinateSystem: transform });
const again = buildBathymetryMeshGeometry({ surfaceModel: surface, coordinateSystem: transform });
const validation = validateBathymetryMeshGeometry(mesh);
const summary = bathymetryMeshGeometrySummary(mesh);

assert.equal(validation.valid, true);
assert.equal(summary.indexed, true);
assert.equal(mesh.vertexCount, bathymetry.width * bathymetry.height);
assert.equal(mesh.triangleCount, (bathymetry.width - 1) * (bathymetry.height - 1) * 2);
assert.deepEqual(mesh.positions, again.positions, 'mesh geometry is deterministic');
assert.ok(mesh.positions.every(Number.isFinite));
assert.ok(mesh.normals.every(Number.isFinite));
assert.ok(Math.max(...mesh.indices) < mesh.vertexCount);
assert.ok(summary.waterVertexCount > 0);
assert.ok(summary.landVertexCount > 0);
console.log('smoke_bathymetry_mesh_geometry: ok');
