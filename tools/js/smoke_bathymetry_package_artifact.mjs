import assert from 'node:assert/strict';
import { bathymetryArtifactDigest, bathymetryArtifactSummary, createBathymetryArtifact, validateBathymetryArtifact } from '../../packages/bathymetry/src/index.js';

const artifact = createBathymetryArtifact({
  id: 'bathy-pkg-r1-artifact-smoke',
  bathymetry: {
    seed: 'artifact-smoke',
    width: 3,
    height: 2,
    depthMeters: [[0, 10, 20], [0, 30, 40]],
    landSeaMask: [['land', 'water', 'water'], ['land', 'water', 'water']],
    sourceMetadata: { sourceId: 'artifact-smoke', synthetic: true }
  },
  physicalExtentMeters: { east: 200, north: 100 }
});
const validation = validateBathymetryArtifact(artifact);
const summary = bathymetryArtifactSummary(artifact);
assert.equal(validation.status, 'ok');
assert.equal(summary.wetCellCount, 4);
assert.equal(summary.landCellCount, 2);
assert.equal(artifact.artifactDigest, bathymetryArtifactDigest(artifact));
assert.equal(artifact.boundaryFlags.packageUsesThree, false);
console.log('smoke_bathymetry_package_artifact: ok');