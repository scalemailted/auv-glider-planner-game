import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createReferenceBathymetryAtlas,
  referenceAtlasBoundsToNormalized,
  referenceAtlasLonLatToNormalized,
  referenceAtlasNormalizedToLonLat,
  referenceAtlasPatchOverlays,
  referenceAtlasViewport
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';

const ROOT = process.cwd();
const manifest = await readJson('assets/reference_bathymetry/manifest.json');
const overviewArtifact = await readJson(manifest.overview.overviewPath);
const overviewRasterArtifact = await readJson(overviewArtifact.previewPath);
const referenceFixtures = await Promise.all(manifest.fixtures.map(async (fixture) => ({
  ...fixture,
  rasterArtifact: await readJson(fixture.rasterPath)
})));
const atlas = createReferenceBathymetryAtlas({
  manifest,
  overviewArtifact,
  overviewRasterArtifact,
  referenceFixtures
});

const topLeft = referenceAtlasLonLatToNormalized(-180, 90, atlas);
const bottomRight = referenceAtlasLonLatToNormalized(180, -90, atlas);
assert.deepEqual(topLeft, { x: 0, y: 0 }, 'global top-left maps to normalized 0,0');
assert.deepEqual(bottomRight, { x: 1, y: 1 }, 'global bottom-right maps to normalized 1,1');

const montereyCenter = referenceAtlasLonLatToNormalized(-122.25, 36.6, atlas);
assert.ok(Math.abs(montereyCenter.x - 0.1604167) < 0.00001, `Monterey x normalized ${montereyCenter.x}`);
assert.ok(Math.abs(montereyCenter.y - 0.2966667) < 0.00001, `Monterey y normalized ${montereyCenter.y}`);

const roundTrip = referenceAtlasNormalizedToLonLat(montereyCenter.x, montereyCenter.y, atlas);
assert.ok(Math.abs(roundTrip.lon - -122.25) < 0.0002, 'Monterey lon round-trips within normalized debug precision');
assert.ok(Math.abs(roundTrip.lat - 36.6) < 0.0002, 'Monterey lat round-trips within normalized debug precision');

const viewport = referenceAtlasViewport({ panX: 0, panY: 0, zoom: 1 }, atlas);
assert.equal(viewport.lonWest, -180, 'reset viewport west');
assert.equal(viewport.lonEast, 180, 'reset viewport east');
assert.equal(viewport.latSouth, -90, 'reset viewport south');
assert.equal(viewport.latNorth, 90, 'reset viewport north');
assert.equal(viewport.centerLon, 0, 'reset center lon');
assert.equal(viewport.centerLat, 0, 'reset center lat');
assert.equal(viewport.worldFractionVisible, 1, 'reset shows full world');

const montereyBounds = {
  westLon: -123,
  eastLon: -121.5,
  southLat: 36,
  northLat: 37.2
};
const normalizedBounds = referenceAtlasBoundsToNormalized(montereyBounds, atlas);
assert.ok(Math.abs(normalizedBounds.x - 0.1583333) < 0.00001, 'Monterey west x normalized');
assert.ok(Math.abs(normalizedBounds.y - 0.2933333) < 0.00001, 'Monterey north y normalized');
assert.ok(normalizedBounds.width > 0 && normalizedBounds.height > 0, 'Monterey normalized bounds have area');

const overlays = referenceAtlasPatchOverlays(atlas, { panX: 0, panY: 0, zoom: 1 }, { width: 900, height: 450 });
const montereyOverlay = overlays.find((entry) => entry.fixtureId === 'monterey_canyon_15s');
assert.ok(montereyOverlay, 'Monterey overlay exists');
assert.equal(montereyOverlay.visible, true, 'Monterey overlay visible at reset');
assert.equal(montereyOverlay.selectable, true, 'Monterey overlay selectable');
assert.ok(Math.abs((montereyOverlay.screenBounds.x + montereyOverlay.screenBounds.width / 2) - (0.1604167 * 900)) < 1, 'Monterey overlay screen center x');
assert.ok(Math.abs((montereyOverlay.screenBounds.y + montereyOverlay.screenBounds.height / 2) - (0.2966667 * 450)) < 1, 'Monterey overlay screen center y');

console.log('smoke_reference_atlas_coordinate_mapping: ok', {
  center: montereyCenter,
  viewport,
  montereyOverlay: montereyOverlay.screenBounds
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
