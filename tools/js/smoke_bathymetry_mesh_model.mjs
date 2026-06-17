import assert from 'node:assert/strict';
import { createSyntheticBathymetryField } from '../../src/core/science/BathymetryFieldModel.js';
import {
  bathymetryMeshSummary,
  createBathymetryCamera,
  createBathymetryMesh,
  projectBathymetryMesh,
  projectBathymetryPoint,
  updateBathymetryCamera,
  validateBathymetryMesh
} from '../../src/core/science/BathymetryMeshModel.js';

const bathymetry = createSyntheticBathymetryField({ seed: 'mesh-smoke', width: 10, height: 8 });
const before = JSON.stringify(bathymetry.depthMeters);
const mesh = createBathymetryMesh({ bathymetry, waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] } });
assert.equal(validateBathymetryMesh(mesh).valid, true);
assert.ok(mesh.bottomSurface.points.length > 0);
assert.ok(mesh.waterSurface.corners.length === 4);
assert.ok(mesh.depthLayerPlanes.length >= 3);
const camera = createBathymetryCamera({ yaw: -20, pitch: 42, zoom: 12, centerX: 5, centerY: 4 });
const point = projectBathymetryPoint(mesh.bottomSurface.points[0], camera);
assert.ok(Number.isFinite(point.screenX));
assert.ok(Number.isFinite(point.screenY));
const projected = projectBathymetryMesh(mesh, camera);
assert.ok(projected.bottomSurface.points.every((entry) => Number.isFinite(entry.screenX) && Number.isFinite(entry.screenY)));
assert.equal(updateBathymetryCamera(camera, { zoom: 18 }).zoom, 18);
assert.equal(JSON.stringify(bathymetry.depthMeters), before, 'mesh projection does not mutate bathymetry input');
assert.ok(bathymetryMeshSummary(mesh).bottomPointCount > 0);
console.log('smoke_bathymetry_mesh_model: ok');