import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createReferenceBathymetryAtlas,
  referenceAtlasBoundsFromDrag,
  referenceAtlasPanView,
  referenceAtlasViewport,
  referenceAtlasZoomView
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';

const ROOT = process.cwd();
const atlas = await loadReferenceAtlas();

const reset = referenceAtlasViewport({ panX: 0, panY: 0, zoom: 1 }, atlas);
assert.equal(reset.lonWest, -180, 'reset view starts at global west');
assert.equal(reset.lonEast, 180, 'reset view starts at global east');
assert.equal(reset.worldFractionVisible, 1, 'reset view shows the full overview');

const pannedView = referenceAtlasPanView({ panX: 0, panY: 0, zoom: 2 }, 0.1, -0.05, atlas);
const pannedViewport = referenceAtlasViewport(pannedView, atlas);
assert.ok(pannedViewport.centerLon < 0, 'dragging right pans the atlas west');
assert.ok(pannedViewport.centerLat < 0, 'dragging upward pans the atlas south');
assert.equal(pannedViewport.zoom, 2, 'panning preserves zoom');

const zoomedView = referenceAtlasZoomView(
  { panX: 0, panY: 0, zoom: 1 },
  1.5,
  atlas,
  { x: 0.1604167, y: 0.2966667 },
  { maxZoom: 5 }
);
const zoomedViewport = referenceAtlasViewport(zoomedView, atlas);
assert.equal(zoomedViewport.zoom, 1.5, 'wheel zoom applies deterministic factor');
assert.ok(zoomedViewport.lonSpan < reset.lonSpan, 'zoom reduces longitude span');
assert.ok(zoomedViewport.latSpan < reset.latSpan, 'zoom reduces latitude span');
assert.ok(zoomedViewport.centerLon < 0, 'zoom around Monterey moves center west');
assert.ok(zoomedViewport.centerLat > 0, 'zoom around Monterey moves center north');

const dragBounds = referenceAtlasBoundsFromDrag(
  { lon: -123, lat: 37.2 },
  { lon: -121.5, lat: 36 },
  { minLonSpanDegrees: 0.2, minLatSpanDegrees: 0.2 }
);
assert.equal(dragBounds.westLon, -123, 'drag west lon');
assert.equal(dragBounds.eastLon, -121.5, 'drag east lon');
assert.equal(dragBounds.southLat, 36, 'drag south lat');
assert.equal(dragBounds.northLat, 37.2, 'drag north lat');

const tinyDrag = referenceAtlasBoundsFromDrag(
  { lon: -122.25, lat: 36.6 },
  { lon: -122.251, lat: 36.601 },
  { minLonSpanDegrees: 2.7, minLatSpanDegrees: 1.8 }
);
assert.ok(tinyDrag.eastLon - tinyDrag.westLon >= 2.69, 'tiny drag expands to configured minimum width');
assert.ok(tinyDrag.northLat - tinyDrag.southLat >= 1.79, 'tiny drag expands to configured minimum height');

console.log('smoke_reference_atlas_interaction_model: ok', {
  reset,
  pannedViewport,
  zoomedViewport,
  dragBounds
});

async function loadReferenceAtlas() {
  const manifest = await readJson('assets/reference_bathymetry/manifest.json');
  const overviewArtifact = await readJson(manifest.overview.overviewPath);
  const overviewRasterArtifact = await readJson(overviewArtifact.previewPath ?? manifest.overview.previewPath);
  const referenceFixtures = await Promise.all(manifest.fixtures.map(async (fixture) => ({
    ...fixture,
    rasterArtifact: await readJson(fixture.rasterPath)
  })));
  return createReferenceBathymetryAtlas({
    manifest,
    overviewArtifact,
    overviewRasterArtifact,
    referenceFixtures
  });
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
