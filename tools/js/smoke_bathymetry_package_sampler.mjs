import assert from 'node:assert/strict';
import { createBathymetryArtifact, createBathymetrySampler, sampleBathymetry, sampleBottomDepth, sampleSignedElevation, classifyWetLocation } from '../../packages/bathymetry/src/index.js';

const artifact = createBathymetryArtifact({
  id: 'bathy-pkg-r1-sampler-smoke',
  bathymetry: { width: 2, height: 2, depthMeters: [[10, 20], [30, 40]], landSeaMask: [['water', 'water'], ['water', 'water']] },
  physicalExtentMeters: { east: 10, north: 10 }
});
const sampler = createBathymetrySampler(artifact);
const center = sampleBathymetry(sampler, 5, 5);
const nearest = sampleBathymetry(sampler, 9.9, 9.9, { interpolation: 'nearest' });
const outside = sampleBathymetry(sampler, 12, 5);
assert.equal(center.bottomDepthMeters, 25);
assert.equal(center.wet, true);
assert.equal(nearest.bottomDepthMeters, 40);
assert.equal(outside.outsideDomain, true);
assert.equal(sampleBottomDepth(sampler, 5, 5), 25);
assert.equal(sampleSignedElevation(sampler, 5, 5), -25);
assert.deepEqual(classifyWetLocation(sampler, 5, 5), { wet: true, land: false, outsideDomain: false, bottomDepthMeters: 25 });
console.log('smoke_bathymetry_package_sampler: ok');