import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createReferenceBathymetryAtlas,
  referenceBathymetryLayerColor,
  referenceBathymetryVisualMetrics,
  referenceFixtureAtLonLat,
  referenceFixtureAvailabilityForBounds,
  referenceFixtureCoverageOverlays
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';

const ROOT = process.cwd();
const manifest = await readJson('assets/reference_bathymetry/manifest.json');
const overviewArtifact = await readJson(manifest.overview.overviewPath);
const atlas = createReferenceBathymetryAtlas({
  manifest,
  overviewArtifact,
  referenceFixtures: manifest.fixtures
});
const overlays = referenceFixtureCoverageOverlays(atlas);
const missionReady = overlays.find((entry) => entry.fixtureId === 'monterey_canyon_15s');
const lowResolution = overlays.find((entry) => entry.fixtureId === 'monterey_canyon');

assert.ok(missionReady, 'Monterey mission-ready patch overlay exists');
assert.ok(lowResolution, 'Monterey low-resolution patch overlay exists');
assert.equal(missionReady.role, 'missionReadyPatch', 'mission-ready role');
assert.equal(lowResolution.role, 'lowResolutionReferencePatch', 'low-resolution role');
assert.equal(missionReady.bounds.westLon, -123, 'mission-ready west lon');
assert.equal(missionReady.bounds.eastLon, -121.5, 'mission-ready east lon');
assert.equal(missionReady.bounds.southLat, 36, 'mission-ready south lat');
assert.equal(missionReady.bounds.northLat, 37.2, 'mission-ready north lat');

const centerFixture = referenceFixtureAtLonLat(atlas, -122.25, 36.6);
assert.equal(centerFixture.fixtureId, 'monterey_canyon_15s', 'center click resolves mission-ready patch');
assert.equal(centerFixture.role, 'missionReadyPatch', 'center click resolves mission-ready role');

const availability = referenceFixtureAvailabilityForBounds(atlas, {
  westLon: -123,
  eastLon: -121.5,
  southLat: 36,
  northLat: 37.2
});
assert.equal(availability.available, true, 'selected Monterey bounds are available');
assert.equal(availability.matchedFixtureId, 'monterey_canyon_15s', 'availability prefers mission-ready patch');
assert.equal(availability.recommendedAction, 'loadMissionPatch', 'availability recommends loading patch');

const patchColor = referenceBathymetryLayerColor(atlas, 'patchCoverage', -122.25, 36.6);
const outsideColor = referenceBathymetryLayerColor(atlas, 'patchCoverage', -80, 25);
assert.deepEqual(patchColor, [244, 180, 70, 255], 'mission patch coverage color');
assert.notDeepEqual(outsideColor, patchColor, 'outside patch coverage differs');

const metrics = referenceBathymetryVisualMetrics(atlas);
assert.equal(metrics.defaultStage, 'globalAtlasSelector', 'metrics default stage');
assert.equal(metrics.overviewIsGlobal, true, 'metrics overview global');
assert.equal(metrics.defaultViewIsRegionalPatch, false, 'metrics default is not regional');
assert.ok(metrics.patchCoverageOverlays.length >= 2, 'metrics expose patch overlays');
assert.equal(metrics.hiddenTruthExposed, false, 'metrics expose no hidden truth');

console.log('smoke_reference_atlas_patch_coverage: ok', {
  overlayCount: overlays.length,
  matchedFixtureId: availability.matchedFixtureId,
  missionReadyPatchCount: metrics.missionReadyPatchCount
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
