import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  findTileSetsForBounds,
  loadMeshLod,
  loadTileSet,
  normalizeReferenceTileLibraryManifest,
  referenceTileLibraryDebugState,
  referenceTileLibraryFixtures,
  selectBestTileSetForBounds
} from '../../src/core/editor/ReferenceBathymetryTileLibrary.js';

const ROOT = process.cwd();
const library = normalizeReferenceTileLibraryManifest(await readJson('assets/reference_bathymetry/tile-library-manifest.json'));
const debug = referenceTileLibraryDebugState(library);

assert.equal(debug.staticAssetSafety.ok, true, 'tile library static safety is ok');
assert.ok(debug.stagedTileSetCount >= 2, 'Monterey staged tile sets are registered');
assert.ok(debug.requestOnlyTileSetCount >= 1, 'request-only regions are registered');

const fixtures = referenceTileLibraryFixtures(library);
const montereyFixture = fixtures.find((fixture) => fixture.fixtureId === 'monterey_canyon_15s');
assert.ok(montereyFixture, 'Monterey 15s fixture exported from tile library');
assert.equal(montereyFixture.role, 'missionReadyPatch', 'Monterey 15s maps to missionReadyPatch');
assert.ok(montereyFixture.meshLods.length >= 2, 'Monterey fixture exposes mesh LOD metadata');

const montereyBounds = {
  westLon: -123.0,
  eastLon: -121.5,
  southLat: 36.0,
  northLat: 37.2
};
const matches = findTileSetsForBounds(montereyBounds, library);
assert.ok(matches.length >= 2, 'Monterey staged tile sets match Monterey bounds');
const best = selectBestTileSetForBounds(montereyBounds, library);
assert.equal(best?.tileSetId, 'monterey_canyon_15s', 'mission-ready 15s tile set is preferred');
assert.equal(best?.role, 'missionReadyTileSet', 'preferred tile set role');

const gulfBounds = {
  westLon: -94.0,
  eastLon: -84.0,
  southLat: 24.0,
  northLat: 30.0
};
assert.equal(findTileSetsForBounds(gulfBounds, library).length, 0, 'Gulf has no staged browser tile set');
const gulfRequests = findTileSetsForBounds(gulfBounds, library, { includeRequestOnly: true });
assert.ok(gulfRequests.length >= 1, 'Gulf request-only tile sets are discoverable when requested');
assert.ok(gulfRequests.some((entry) => entry.tileSetId === 'gulf_segment_15s'), 'base Gulf request-only tile set remains discoverable');
assert.ok(gulfRequests.every((entry) => entry.coverageRole === 'requestOnly'), 'Gulf matches remain request-only');
const gulfDemo = library.tileSets.find((tileSet) => tileSet.tileSetId === 'gulf_segment_demo_15s');
assert.ok(gulfDemo, 'Gulf demo request-only tile set is registered');
assert.equal(gulfDemo.coverageRole, 'requestOnly', 'Gulf demo remains request-only');

const loaded = await loadTileSet('monterey_canyon_15s', { library, fetchJson: readJson });
assert.equal(loaded.rasterArtifact?.artifactType, 'anchor.reference-bathymetry-raster', 'loader fetches raster artifact');
assert.equal(loaded.rasterArtifact?.claimBoundary?.hiddenTruthExposed, false, 'loaded raster has no hidden truth');
const coarse = await loadMeshLod('monterey_canyon_15s', 'coarse', { library, fetchJson: readJson });
assert.equal(coarse.artifactType, 'anchor.reference-bathymetry-mesh-lod', 'loader fetches mesh LOD artifact');
assert.equal(coarse.isAuthoritativeForSimulation, false, 'mesh is non-authoritative');

console.log('smoke_reference_tile_library_loader: ok', {
  digest: library.digest,
  bestTileSet: best.tileSetId,
  gulfRequestOnlyMatches: gulfRequests.map((entry) => entry.tileSetId)
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, String(relativePath).replaceAll('/', path.sep)), 'utf8'));
}
