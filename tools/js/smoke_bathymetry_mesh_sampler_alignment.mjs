import assert from 'node:assert/strict';

import { createCoastalOperationalBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshGeometry.js';
import {
  compareBathymetryMeshAndCanonicalSampler,
  sampleBathymetryMeshGeometry
} from '../../src/core/rendering/BathymetryMeshSampler.js';

const bathymetry = createCoastalOperationalBathymetry({ seed: 'mesh-align', width: 30, height: 20 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const transform = createMissionWorldCoordinateTransform({ grid: { width: bathymetry.width, height: bathymetry.height } });
const geometry = buildBathymetryMeshGeometry({ surfaceModel: surface, coordinateSystem: transform });
const samples = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 8.25, y: 6.5 },
  { x: 15.75, y: 11.125 },
  { x: 22.4, y: 7.2 },
  { x: 29, y: 19 }
];
const comparison = compareBathymetryMeshAndCanonicalSampler({ geometry, surfaceModel: surface, samples, toleranceMeters: 1e-6 });
assert.equal(comparison.status, 'PASS');
assert.equal(comparison.failedSamples.length, 0);
assert.ok(Number.isFinite(sampleBathymetryMeshGeometry({ geometry, x: 12.2, y: 8.7 }).bottomDepthMeters));
console.log('smoke_bathymetry_mesh_sampler_alignment: ok');
