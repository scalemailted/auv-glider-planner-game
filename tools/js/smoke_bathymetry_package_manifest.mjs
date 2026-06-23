import assert from 'node:assert/strict';
import { bathymetryManifestDigest, bathymetryManifestSummary, createBathymetryManifest, validateBathymetryManifest } from '../../packages/bathymetry/src/index.js';

const manifest = createBathymetryManifest({
  id: 'bathy-pkg-r1-manifest-smoke',
  seed: 'bathy-pkg-r1-manifest',
  generatorId: 'anchor.science.bathymetry-field',
  generatorVersion: 'test',
  physicalExtentMeters: { east: 3000, north: 2000 },
  resolution: { eastCount: 4, northCount: 3 },
  components: ['coastline', 'continentalShelf'],
  sourceMetadata: { sourceId: 'manifest-smoke', synthetic: true }
});
const again = createBathymetryManifest({ ...manifest });
const validation = validateBathymetryManifest(manifest);
const summary = bathymetryManifestSummary(manifest);
assert.equal(validation.status, 'ok');
assert.equal(manifest.manifestDigest, bathymetryManifestDigest(manifest));
assert.equal(manifest.manifestDigest, again.manifestDigest);
assert.equal(summary.eastCount, 4);
assert.equal(summary.northCount, 3);
assert.equal(summary.calibratedBathymetry, false);
console.log('smoke_bathymetry_package_manifest: ok');