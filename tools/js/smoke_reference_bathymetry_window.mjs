import assert from 'node:assert/strict';
import {
  NO_REFERENCE_DATA_FIXTURE,
  REFERENCE_BATHYMETRY_WINDOW_TYPE,
  createDefaultReferenceBathymetryWindow,
  createReferenceBathymetryAtlas,
  createReferenceBathymetryWindow,
  normalizeReferenceBathymetryWindow
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';

const atlas = createReferenceBathymetryAtlas();
const window = createDefaultReferenceBathymetryWindow(atlas);
const repeat = createDefaultReferenceBathymetryWindow(atlas);

assert.equal(window.artifactType, REFERENCE_BATHYMETRY_WINDOW_TYPE);
assert.ok(window.patchDigest.startsWith('fnv1a32:'));
assert.equal(repeat.patchDigest, window.patchDigest, 'default reference window is deterministic');
assert.equal(window.atlasDigest, atlas.atlasDigest);
assert.equal(window.validation.valid, true);
assert.equal(window.provenance.fixtureStatus, NO_REFERENCE_DATA_FIXTURE);
assert.equal(window.claimBoundary.realDataBacked, false);
assert.equal(window.claimBoundary.certifiedForNavigation, false);
assert.equal(window.claimBoundary.operationalOceanForecast, false);
assert.equal(window.claimBoundary.hiddenTruthExposed, false);

const stats = window.sampledStats;
for (const key of [
  'minElevationMeters',
  'maxElevationMeters',
  'minDepthMeters',
  'maxDepthMeters',
  'meanDepthMeters',
  'landFraction',
  'oceanFraction',
  'wetConnectedFraction'
]) {
  assert.ok(Number.isFinite(Number(stats[key])), `${key} is finite`);
}
assert.ok(stats.sampleCount > 0, 'window samples atlas values');
assert.ok(window.detectedRegionTags.length > 0, 'window records detected context tags');

const normalized = normalizeReferenceBathymetryWindow(JSON.parse(JSON.stringify(window)), atlas);
assert.equal(normalized.patchDigest, window.patchDigest, 'window normalizes without digest drift');

const moved = createReferenceBathymetryWindow({
  westLon: window.bounds.westLon + 1,
  eastLon: window.bounds.eastLon + 1,
  southLat: window.bounds.southLat,
  northLat: window.bounds.northLat
}, atlas);
assert.notEqual(moved.patchDigest, window.patchDigest, 'patch digest changes when bounds change');

const invalid = createReferenceBathymetryWindow({
  westLon: -123,
  eastLon: -123.01,
  southLat: 36,
  northLat: 36.5
}, atlas);
assert.equal(invalid.validation.valid, false, 'invalid bounds are rejected by window validation');
assert.match(invalid.validation.errors.join('\n'), /too small/);

console.log('smoke_reference_bathymetry_window: ok', {
  atlasDigest: atlas.atlasDigest,
  patchDigest: window.patchDigest,
  fixtureStatus: window.provenance.fixtureStatus,
  tags: window.detectedRegionTags
});
