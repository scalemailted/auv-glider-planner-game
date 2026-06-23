import assert from 'node:assert/strict';
import * as packageMetadata from '../../packages/bathymetry/src/BathymetrySourceMetadata.js';
import * as sourceMetadata from '../../src/core/science/BathymetrySourceMetadata.js';
import * as packageTerrain from '../../packages/bathymetry/src/SignedTerrainSurface.js';
import * as sourceTerrain from '../../src/core/science/SignedTerrainSurfaceModel.js';

const metadataA = packageMetadata.createBathymetrySourceMetadata({ sourceId: 'forwarder-smoke' });
const metadataB = sourceMetadata.createBathymetrySourceMetadata({ sourceId: 'forwarder-smoke' });
assert.deepEqual(metadataB, metadataA);
const surfaceA = packageTerrain.createSignedTerrainSurfaceFromBathymetry({ width: 2, height: 2, depthMeters: [[0, 12], [0, 24]] });
const surfaceB = sourceTerrain.createSignedTerrainSurfaceFromBathymetry({ width: 2, height: 2, depthMeters: [[0, 12], [0, 24]] });
assert.deepEqual(surfaceB, surfaceA);
console.log('smoke_bathymetry_package_forwarders: ok');