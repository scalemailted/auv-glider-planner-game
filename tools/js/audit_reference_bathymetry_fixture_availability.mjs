import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalJsonDigest, canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  NO_REFERENCE_DATA_FIXTURE,
  REFERENCE_BATHYMETRY_MANIFEST_TYPE,
  REFERENCE_BATHYMETRY_RASTER_TYPE,
  normalizeReferenceBathymetryManifest
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';

const ROOT = process.cwd();
const manifestPath = path.resolve(ROOT, 'assets', 'reference_bathymetry', 'manifest.json');

const manifestRaw = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
assert.equal(manifestRaw.artifactType, REFERENCE_BATHYMETRY_MANIFEST_TYPE, 'manifest artifact type');
assert.ok(manifestRaw.fixtureStatus, 'manifest fixtureStatus is explicit');
assert.ok(manifestRaw.manifestDigest && manifestRaw.manifestDigest !== 'PENDING', 'manifest digest is recorded');

const manifest = normalizeReferenceBathymetryManifest(manifestRaw);
assert.equal(manifest.provenance?.localAbsolutePathsIncluded, false, 'manifest excludes local absolute paths');
assert.equal(manifest.provenance?.hiddenTruthExposed, false, 'manifest does not expose hidden truth');
assert.equal(manifest.claimBoundary?.placeholderPresentedAsReferenceData, false, 'manifest rejects placeholder-as-reference');
assert.equal(manifest.claimBoundary?.currentField4DGenerated, false, 'manifest does not claim current generation');
assert.equal(manifest.claimBoundary?.scalarField4DGenerated, false, 'manifest does not claim scalar generation');
assert.equal(manifest.claimBoundary?.certifiedForNavigation, false, 'manifest is not navigation-certified');
assert.equal(manifest.claimBoundary?.operationalOceanForecast, false, 'manifest is not operational forecast');

if (manifest.fixtureStatus === NO_REFERENCE_DATA_FIXTURE) {
  assert.equal(manifest.overview, null, 'blocked manifest has no overview fixture');
  assert.deepEqual(manifest.fixtures, [], 'blocked manifest has no regional fixtures');
  assert.equal(manifest.claimBoundary.referenceBathymetryAvailable, false, 'blocked manifest does not claim reference availability');
  assert.match(manifest.instructions?.downloadCommand ?? '', /download:reference-bathy/, 'blocked manifest includes download command');
  assert.match(manifest.instructions?.preprocessCommand ?? '', /preprocess:reference-bathy/, 'blocked manifest includes preprocess command');
  console.log('audit_reference_bathymetry_fixture_availability: ok', {
    fixtureStatus: manifest.fixtureStatus,
    fixtureCount: 0,
    manifestDigest: manifest.manifestDigest
  });
  process.exit(0);
}

assert.equal(manifest.fixtureStatus, 'AVAILABLE', 'manifest status is AVAILABLE or NO_REFERENCE_DATA_FIXTURE');
assert.equal(manifest.overview?.role, 'globalOverview', 'available manifest has a global overview');
assert.ok(manifest.overview?.overviewPath, 'available manifest has overview artifact path');
assert.ok(Array.isArray(manifest.fixtures) && manifest.fixtures.length > 0, 'available manifest has fixtures');
assert.equal(manifest.claimBoundary.referenceBathymetryAvailable, true, 'available manifest claims reference availability');

const overviewPath = resolveRuntimeAsset(manifest.overview.overviewPath);
await assertReadable(overviewPath, 'overview artifact path exists');
const overviewArtifact = JSON.parse(await fs.readFile(overviewPath, 'utf8'));
assert.equal(overviewArtifact.artifactType, 'anchor.reference-bathymetry-overview', 'overview artifact type');
assert.equal(overviewArtifact.role, 'globalOverview', 'overview artifact role');
assert.equal(overviewArtifact.claimBoundary?.hiddenTruthExposed, false, 'overview has no hidden truth');
assert.equal(overviewArtifact.claimBoundary?.missionResolutionBathymetry, false, 'overview is not mission-resolution bathymetry');
assert.equal(overviewArtifact.localAbsolutePathsIncluded, false, 'overview has no local paths');
assert.equal(overviewArtifact.rawExternalDataPathIncluded, false, 'overview has no raw external path');
assert.equal(overviewArtifact.previewKind, 'compactRasterJson', 'overview uses compact raster JSON');
assert.ok(overviewArtifact.previewPath, 'overview has preview raster path');
const overviewRasterPath = resolveRuntimeAsset(overviewArtifact.previewPath);
await assertReadable(overviewRasterPath, 'overview preview raster path exists');
const overviewRasterArtifact = JSON.parse(await fs.readFile(overviewRasterPath, 'utf8'));
assert.equal(overviewRasterArtifact.artifactType, REFERENCE_BATHYMETRY_RASTER_TYPE, 'overview preview raster type');
assert.equal(overviewRasterArtifact.role, 'globalOverviewPreview', 'overview preview raster role');
assert.equal(overviewRasterArtifact.bounds?.westLon, -180, 'overview preview west');
assert.equal(overviewRasterArtifact.bounds?.eastLon, 180, 'overview preview east');
assert.equal(overviewRasterArtifact.bounds?.southLat, -90, 'overview preview south');
assert.equal(overviewRasterArtifact.bounds?.northLat, 90, 'overview preview north');
assert.equal(overviewRasterArtifact.provenance?.hiddenTruthExposed, false, 'overview preview has no hidden truth');
const fixtureReports = [];
for (const fixture of manifest.fixtures) {
  assert.ok(fixture.fixtureId, 'fixture has id');
  assert.ok(fixture.rasterPath, `fixture ${fixture.fixtureId} has rasterPath`);
  const artifactPath = resolveRuntimeAsset(fixture.rasterPath);
  await assertReadable(artifactPath, `fixture ${fixture.fixtureId} raster exists`);
  const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
  validateRasterArtifact(artifact, fixture);
  fixtureReports.push({
    fixtureId: fixture.fixtureId,
    digest: artifact.rasterDigest,
    columns: artifact.grid.columns,
    rows: artifact.grid.rows
  });
}

const manifestText = canonicalJsonStringify(manifest);
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(manifestText), 'manifest text has no hidden truth true');
assert.ok(!/"currentField4DGenerated"\s*:\s*true/.test(manifestText), 'manifest text has no current generation true');
assert.ok(!/"scalarField4DGenerated"\s*:\s*true/.test(manifestText), 'manifest text has no scalar generation true');

console.log('audit_reference_bathymetry_fixture_availability: ok', {
  fixtureStatus: manifest.fixtureStatus,
  fixtureCount: fixtureReports.length,
  manifestDigest: manifest.manifestDigest,
  fixtures: fixtureReports
});

function validateRasterArtifact(artifact, fixture) {
  assert.equal(artifact.artifactType, REFERENCE_BATHYMETRY_RASTER_TYPE, `${fixture.fixtureId} raster type`);
  assert.ok(artifact.sourceDataset?.name, `${fixture.fixtureId} source dataset name`);
  assert.ok(artifact.sourceDataset?.provider, `${fixture.fixtureId} source provider`);
  assertBounds(artifact.bounds, `${fixture.fixtureId} bounds`);
  const grid = artifact.grid ?? {};
  assert.ok(Number.isFinite(Number(grid.columns)) && Number(grid.columns) > 0, `${fixture.fixtureId} finite columns`);
  assert.ok(Number.isFinite(Number(grid.rows)) && Number(grid.rows) > 0, `${fixture.fixtureId} finite rows`);
  assert.equal(grid.elevationMeters?.length, grid.rows, `${fixture.fixtureId} elevation row count`);
  assert.equal(grid.elevationMeters?.[0]?.length, grid.columns, `${fixture.fixtureId} elevation column count`);
  assert.equal(artifact.derived?.depthMetersPositiveDown?.length, grid.rows, `${fixture.fixtureId} depth row count`);
  assert.equal(artifact.derived?.wetMask?.length, grid.rows, `${fixture.fixtureId} wet mask row count`);
  assert.equal(artifact.derived?.landMask?.length, grid.rows, `${fixture.fixtureId} land mask row count`);
  assert.ok(flatten(grid.elevationMeters).every((value) => Number.isFinite(Number(value))), `${fixture.fixtureId} finite elevations`);
  assert.ok(flatten(artifact.derived.depthMetersPositiveDown).every((value) => Number.isFinite(Number(value)) && Number(value) >= 0), `${fixture.fixtureId} finite positive-down depths`);
  assert.ok(flatten(artifact.derived.wetMask).every((value) => typeof value === 'boolean'), `${fixture.fixtureId} wet mask booleans`);
  assert.ok(flatten(artifact.derived.landMask).every((value) => typeof value === 'boolean'), `${fixture.fixtureId} land mask booleans`);
  assert.equal(artifact.provenance?.localAbsolutePathsIncluded, false, `${fixture.fixtureId} no local absolute paths`);
  assert.equal(artifact.provenance?.hiddenTruthExposed, false, `${fixture.fixtureId} no hidden truth`);
  assert.ok(artifact.rasterDigest, `${fixture.fixtureId} raster digest`);
  const stableDigest = canonicalJsonDigest({
    bounds: artifact.bounds,
    grid: artifact.grid,
    sourceDataset: artifact.sourceDataset
  });
  assert.equal(stableDigest, canonicalJsonDigest({
    bounds: artifact.bounds,
    grid: artifact.grid,
    sourceDataset: artifact.sourceDataset
  }), `${fixture.fixtureId} stable canonical digest check`);
  const text = canonicalJsonStringify(artifact);
  assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text), `${fixture.fixtureId} text has no hidden truth true`);
  assert.ok(!/"currentField4D"\s*:\s*true/.test(text), `${fixture.fixtureId} text has no current field true`);
  assert.ok(!/"scalarField4D"\s*:\s*true/.test(text), `${fixture.fixtureId} text has no scalar field true`);
}

function assertBounds(bounds, label) {
  assert.ok(Number(bounds?.eastLon) > Number(bounds?.westLon), `${label} east > west`);
  assert.ok(Number(bounds?.northLat) > Number(bounds?.southLat), `${label} north > south`);
  assert.ok(Number(bounds.westLon) >= -180 && Number(bounds.eastLon) <= 180, `${label} lon range`);
  assert.ok(Number(bounds.southLat) >= -90 && Number(bounds.northLat) <= 90, `${label} lat range`);
}

async function assertReadable(filePath, message) {
  const stat = await fs.stat(filePath);
  assert.ok(stat.isFile(), message);
}

function resolveRuntimeAsset(assetPath) {
  return path.resolve(ROOT, assetPath.replaceAll('/', path.sep));
}

function flatten(rows = []) {
  return rows.flat ? rows.flat() : [];
}
