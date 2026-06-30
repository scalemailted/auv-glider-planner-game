import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createReferenceBathymetryAtlas,
  referenceAtlasPatchOverlays,
  referenceFixtureAvailabilityForBounds
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  findTileSetsForBounds,
  normalizeReferenceTileLibraryManifest,
  referenceTileLibraryFixtures,
  selectBestTileSetForBounds
} from '../../src/core/editor/ReferenceBathymetryTileLibrary.js';

const ROOT = process.cwd();
const manifest = await readJson('assets/reference_bathymetry/manifest.json');
const tileLibrary = normalizeReferenceTileLibraryManifest(await readJson('assets/reference_bathymetry/tile-library-manifest.json'));
const overviewArtifact = await readJson(manifest.overview.overviewPath);
const overviewRasterArtifact = await readJson(manifest.overview.previewPath);
const tileLibraryFixtures = referenceTileLibraryFixtures(tileLibrary);
const atlas = createReferenceBathymetryAtlas({
  manifest: {
    ...manifest,
    fixtures: mergeFixtures(manifest.fixtures, tileLibraryFixtures)
  },
  overviewArtifact,
  overviewRasterArtifact,
  referenceFixtures: await Promise.all(tileLibraryFixtures.map(async (fixture) => ({
    ...fixture,
    rasterArtifact: await readJson(fixture.rasterPath)
  })))
});

const montereyBounds = {
  westLon: -123.0,
  eastLon: -121.5,
  southLat: 36.0,
  northLat: 37.2
};
const bestMontereyTile = selectBestTileSetForBounds(montereyBounds, tileLibrary);
assert.equal(bestMontereyTile?.tileSetId, 'monterey_canyon_15s', 'tile library prefers Monterey 15s');
const montereyAvailability = referenceFixtureAvailabilityForBounds(atlas, montereyBounds);
assert.equal(montereyAvailability.available, true, 'Monterey bounds are staged');
assert.equal(montereyAvailability.matchedFixtureId, 'monterey_canyon_15s', 'Monterey availability uses 15s tile-library fixture');
assert.equal(montereyAvailability.matchedFixture?.tileLibraryTileSetId, 'monterey_canyon_15s', 'Monterey matched fixture preserves tile-library ID');
assert.ok(montereyAvailability.matchedFixture?.meshLods?.length >= 2, 'Monterey matched fixture exposes mesh LODs');

const gulfBounds = {
  westLon: -94.0,
  eastLon: -84.0,
  southLat: 24.0,
  northLat: 30.0
};
const gulfAvailability = referenceFixtureAvailabilityForBounds(atlas, gulfBounds);
assert.equal(gulfAvailability.available, false, 'Gulf is not staged as a browser tile');
assert.equal(gulfAvailability.boundaryBudget?.multiTileRecommended, true, 'Gulf remains multi-tile request');
assert.equal(gulfAvailability.recommendedAction, 'exportMultiTilePatchRequest', 'Gulf recommends multi-tile patch request');

const gulfDemoBounds = {
  westLon: -90.5,
  eastLon: -83.8,
  southLat: 26.7,
  northLat: 30.7
};
const gulfDemoAvailability = referenceFixtureAvailabilityForBounds(atlas, gulfDemoBounds);
assert.equal(gulfDemoAvailability.available, false, 'Gulf demo is not staged as a browser tile');
assert.equal(gulfDemoAvailability.boundaryBudget?.budgetStatus, 'MULTI_TILE_REQUIRED', 'Gulf demo is multi-tile required');
const gulfDemoRequests = findTileSetsForBounds(gulfDemoBounds, tileLibrary, { includeRequestOnly: true });
assert.ok(gulfDemoRequests.some((tileSet) => tileSet.tileSetId === 'gulf_segment_demo_15s'), 'Gulf demo request-only tile set is discoverable');

const overlays = referenceAtlasPatchOverlays(atlas, {}, { width: 900, height: 450 });
const montereyOverlay = overlays.find((overlay) => overlay.fixtureId === 'monterey_canyon_15s');
assert.ok(montereyOverlay, 'Monterey overlay exists');
assert.equal(montereyOverlay.tileLibraryTileSetId, 'monterey_canyon_15s', 'overlay preserves tile-library tile set ID');
assert.equal(montereyOverlay.meshLodAvailable, true, 'overlay reports mesh availability');

console.log('smoke_reference_tile_library_atlas_coverage: ok', {
  tileLibraryDigest: tileLibrary.digest,
  montereyMatchedFixture: montereyAvailability.matchedFixtureId,
  gulfAction: gulfAvailability.recommendedAction
});

function mergeFixtures(existing = [], tileFixtures = []) {
  const byId = new Map();
  for (const fixture of existing) byId.set(fixture.fixtureId, fixture);
  for (const fixture of tileFixtures) byId.set(fixture.fixtureId, { ...(byId.get(fixture.fixtureId) ?? {}), ...fixture });
  return [...byId.values()];
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, String(relativePath).replaceAll('/', path.sep)), 'utf8'));
}
