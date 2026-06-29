import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  createReferenceBathymetryAtlas,
  referenceAtlasPatchOverlays,
  referenceAtlasViewport,
  sampleReferenceBathymetryElevation
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

assert.equal(manifest.overview.role, 'globalOverview', 'manifest overview is global');
assert.equal(manifest.overview.bounds.westLon, -180, 'overview west');
assert.equal(manifest.overview.bounds.eastLon, 180, 'overview east');
assert.equal(manifest.overview.bounds.southLat, -90, 'overview south');
assert.equal(manifest.overview.bounds.northLat, 90, 'overview north');
assert.equal(manifest.overview.previewKind, 'compactRasterJson', 'manifest records compact raster preview');
assert.equal(overviewArtifact.previewKind, 'compactRasterJson', 'overview artifact records compact raster preview');
assert.equal(overviewRasterArtifact.role, 'globalOverviewPreview', 'overview raster role');
assert.equal(overviewRasterArtifact.provenance?.hiddenTruthExposed, false, 'overview raster hides truth');
assert.equal(overviewArtifact.claimBoundary?.missionResolutionBathymetry, false, 'overview is selection layer');
assert.equal(overviewArtifact.claimBoundary?.operationalOceanForecast, false, 'overview is not forecast');

const displayAspect = manifest.overview.displayResolution.columns / manifest.overview.displayResolution.rows;
const rasterAspect = overviewRasterArtifact.grid.columns / overviewRasterArtifact.grid.rows;
assert.ok(Math.abs(displayAspect - 2) < 0.01, `display aspect ${displayAspect}`);
assert.ok(Math.abs(rasterAspect - 2) < 0.02, `raster aspect ${rasterAspect}`);
assert.ok(overviewRasterArtifact.grid.columns >= 600, 'overview raster has enough columns for world land/ocean recognition');
assert.ok(overviewRasterArtifact.grid.rows >= 300, 'overview raster has enough rows for world land/ocean recognition');

const samples = {
  pacific: sampleReferenceBathymetryElevation(atlas, -150, 0),
  atlantic: sampleReferenceBathymetryElevation(atlas, -30, 0),
  africa: sampleReferenceBathymetryElevation(atlas, 20, 0),
  himalaya: sampleReferenceBathymetryElevation(atlas, 86, 28),
  antarctica: sampleReferenceBathymetryElevation(atlas, 20, -80)
};
for (const [label, value] of Object.entries(samples)) {
  assert.ok(Number.isFinite(value), `${label} overview sample finite`);
}
assert.ok(Object.values(samples).some((value) => value > 0), 'overview contains land elevations');
assert.ok(Object.values(samples).some((value) => value < 0), 'overview contains ocean depths');
assert.ok(samples.pacific < 0, 'Pacific sample is ocean');
assert.ok(samples.himalaya > 0, 'Himalaya sample is land/topography');

const viewport = referenceAtlasViewport({ panX: 0, panY: 0, zoom: 1 }, atlas);
assert.ok(viewport.lonSpan >= 300, 'reset lon span covers world');
assert.ok(viewport.latSpan >= 140, 'reset lat span covers world');
assert.ok(Math.abs(viewport.centerLon) < 0.001, 'reset center lon near zero');
assert.ok(Math.abs(viewport.centerLat) < 0.001, 'reset center lat near zero');
assert.equal(viewport.worldFractionVisible, 1, 'reset world fraction visible');

const overlays = referenceAtlasPatchOverlays(atlas, { panX: 0, panY: 0, zoom: 1 }, { width: 900, height: 450 });
const monterey = overlays.find((entry) => entry.fixtureId === 'monterey_canyon_15s');
assert.ok(monterey, 'Monterey mission overlay exists');
assert.equal(monterey.visible, true, 'Monterey mission overlay visible on full world');
assert.equal(monterey.selectable, true, 'Monterey mission overlay selectable');
assert.ok(Math.abs((monterey.normalizedBounds.x + monterey.normalizedBounds.width / 2) - 0.1604167) < 0.00001, 'Monterey normalized x center');
assert.ok(Math.abs((monterey.normalizedBounds.y + monterey.normalizedBounds.height / 2) - 0.2966667) < 0.00001, 'Monterey normalized y center');

const publicText = canonicalJsonStringify({ manifest, overviewArtifact, overviewRasterArtifact, overlays });
assert.doesNotMatch(publicText, /external_data|[A-Z]:\\\\|\/Users\//, 'public overview data exposes no raw/local paths');
assert.doesNotMatch(publicText, /"hiddenTruthExposed"\s*:\s*true/, 'public overview data exposes no hidden truth');
assert.doesNotMatch(publicText, /"operationalOceanForecast"\s*:\s*true|"calibratedForecastSystem"\s*:\s*true/, 'public overview data does not claim forecast calibration');

console.log('audit_reference_atlas_visual_acceptance: ok', {
  overviewDigest: overviewArtifact.digest,
  previewRasterDigest: overviewArtifact.previewRasterDigest,
  displayAspect,
  rasterAspect,
  samples,
  montereyOverlay: monterey.screenBounds
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
