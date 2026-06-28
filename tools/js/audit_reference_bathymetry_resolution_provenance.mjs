import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const manifestPath = path.resolve(ROOT, 'assets', 'reference_bathymetry', 'manifest.json');

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const manifestText = await fs.readFile(manifestPath, 'utf8');
assert.equal(manifest.artifactType, 'anchor.reference-bathymetry-manifest', 'manifest type');
assert.equal(manifest.provenance?.hiddenTruthExposed, false, 'manifest does not expose hidden truth');
assert.equal(manifest.claimBoundary?.hiddenTruthExposed, false, 'claim boundary does not expose hidden truth');
assert.equal(manifest.claimBoundary?.currentField4DGenerated, false, 'manifest does not claim generated currents');
assert.equal(manifest.claimBoundary?.scalarField4DGenerated, false, 'manifest does not claim generated scalars');
assert.doesNotMatch(manifestText, /external_data|rawDataDirectory|[A-Z]:\\\\|\/Users\//, 'manifest does not expose raw/local data paths');

if (manifest.fixtureStatus === 'AVAILABLE') {
  assert.doesNotMatch(
    String(manifest.instructions?.summary ?? ''),
    /no preprocessed public reference bathymetry fixture is available/i,
    'AVAILABLE manifest must not keep blocked-state summary text'
  );
}

assert.ok(Array.isArray(manifest.fixtures), 'manifest fixtures array exists');

const reports = [];
let missionReadyPatchCount = 0;
let lowResolutionPatchCount = 0;
for (const fixture of manifest.fixtures) {
  assert.ok(fixture.fixtureId, 'fixtureId is required');
  assert.ok(fixture.label, `${fixture.fixtureId} label is required`);
  assert.ok(fixture.role, `${fixture.fixtureId} role is required`);
  assert.ok(fixture.sourceDataset, `${fixture.fixtureId} sourceDataset is required`);
  assert.ok(fixture.provider, `${fixture.fixtureId} provider is required`);
  assert.ok(fixture.sourceResolution, `${fixture.fixtureId} sourceResolution is required`);
  assert.ok(fixture.sourceKey, `${fixture.fixtureId} sourceKey is required`);
  assert.ok(fixture.sourceVariant, `${fixture.fixtureId} sourceVariant is required`);
  assert.ok(Number.isFinite(Number(fixture.actualRasterResolutionArcSeconds)), `${fixture.fixtureId} actualRasterResolutionArcSeconds is required`);
  assert.ok(Number.isFinite(Number(fixture.columns)) && Number(fixture.columns) > 0, `${fixture.fixtureId} columns are required`);
  assert.ok(Number.isFinite(Number(fixture.rows)) && Number(fixture.rows) > 0, `${fixture.fixtureId} rows are required`);
  assert.ok(fixture.rasterPath, `${fixture.fixtureId} rasterPath is required`);
  assert.ok(fixture.digest, `${fixture.fixtureId} digest is required`);
  assert.ok(Array.isArray(fixture.tags), `${fixture.fixtureId} tags are required`);

  const artifactPath = path.resolve(ROOT, fixture.rasterPath.replaceAll('/', path.sep));
  const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
  assert.equal(artifact.artifactType, 'anchor.reference-bathymetry-raster', `${fixture.fixtureId} artifact type`);
  assert.equal(artifact.provenance?.hiddenTruthExposed, false, `${fixture.fixtureId} artifact does not expose hidden truth`);
  assert.equal(artifact.role, fixture.role, `${fixture.fixtureId} role matches artifact`);
  assert.equal(String(artifact.sourceResolution), String(fixture.sourceResolution), `${fixture.fixtureId} sourceResolution matches artifact`);
  assert.equal(String(artifact.sourceKey), String(fixture.sourceKey), `${fixture.fixtureId} sourceKey matches artifact`);
  assert.equal(String(artifact.sourceVariant), String(fixture.sourceVariant), `${fixture.fixtureId} sourceVariant matches artifact`);
  assert.equal(Number(artifact.actualRasterResolutionArcSeconds), Number(fixture.actualRasterResolutionArcSeconds), `${fixture.fixtureId} actual resolution matches artifact`);
  assert.equal(Number(artifact.grid?.columns), Number(fixture.columns), `${fixture.fixtureId} columns match artifact`);
  assert.equal(Number(artifact.grid?.rows), Number(fixture.rows), `${fixture.fixtureId} rows match artifact`);

  const actualArcSeconds = Number(artifact.actualRasterResolutionArcSeconds);
  const sourceFileName = String(artifact.provenance?.sourceFileName ?? '');
  assertFilenameResolution(sourceFileName, actualArcSeconds, `${fixture.fixtureId} source filename`);
  assertResolutionString(artifact.sourceResolution, actualArcSeconds, `${fixture.fixtureId} artifact sourceResolution`);
  assertResolutionString(fixture.sourceResolution, actualArcSeconds, `${fixture.fixtureId} manifest sourceResolution`);
  assert.equal(
    fixture.role,
    actualArcSeconds <= 15.1 ? 'missionReadyPatch' : 'lowResolutionReferencePatch',
    `${fixture.fixtureId} role matches actual resolution`
  );
  if (fixture.role === 'missionReadyPatch') {
    missionReadyPatchCount += 1;
    assert.ok(Math.abs(actualArcSeconds - 15) <= 0.1, `${fixture.fixtureId} missionReadyPatch must be true 15 arc-second`);
    assert.ok(Math.abs(Number(fixture.columns) - 360) <= 2, `${fixture.fixtureId} missionReadyPatch should be about 360 columns for Monterey bbox`);
    assert.ok(Math.abs(Number(fixture.rows) - 288) <= 2, `${fixture.fixtureId} missionReadyPatch should be about 288 rows for Monterey bbox`);
    assert.ok(fixture.tags.includes('mission-ready'), `${fixture.fixtureId} missionReadyPatch tag is required`);
  }
  if (fixture.role === 'lowResolutionReferencePatch') {
    lowResolutionPatchCount += 1;
  }

  const artifactText = JSON.stringify(artifact);
  assert.doesNotMatch(artifactText, /"hiddenTruthExposed"\s*:\s*true/, `${fixture.fixtureId} artifact text has no hiddenTruth true`);
  assert.doesNotMatch(artifactText, /"currentField4DGenerated"\s*:\s*true/, `${fixture.fixtureId} artifact text has no current generation true`);
  assert.doesNotMatch(artifactText, /"scalarField4DGenerated"\s*:\s*true/, `${fixture.fixtureId} artifact text has no scalar generation true`);

  reports.push({
    fixtureId: fixture.fixtureId,
    role: fixture.role,
    sourceResolution: fixture.sourceResolution,
    sourceKey: fixture.sourceKey,
    sourceVariant: fixture.sourceVariant,
    actualRasterResolutionArcSeconds: actualArcSeconds,
    columns: fixture.columns,
    rows: fixture.rows,
    sourceFileName
  });
}

if (manifest.fixtureStatus === 'AVAILABLE') {
  assert.ok(missionReadyPatchCount >= 1, 'AVAILABLE manifest must include a missionReadyPatch after BATHY-DATA-R1.2');
  assert.ok(lowResolutionPatchCount >= 1, 'AVAILABLE manifest must preserve the lowResolutionReferencePatch fallback');
}

if (manifest.overview) {
  assert.equal(manifest.overview.role, 'globalOverview', 'overview role is globalOverview');
  assert.ok(manifest.overview.sourceResolution, 'overview sourceResolution is required');
  assert.ok(manifest.overview.sourceKey, 'overview sourceKey is required');
  assert.ok(manifest.overview.sourceVariant, 'overview sourceVariant is required');
  assert.ok(Number.isFinite(Number(manifest.overview.actualRasterResolutionArcSeconds)), 'overview actual resolution is required');
  assert.ok(Number.isFinite(Number(manifest.overview.displayResolution?.columns)) && Number(manifest.overview.displayResolution.columns) > 0, 'overview display columns are required');
  assert.ok(Number.isFinite(Number(manifest.overview.displayResolution?.rows)) && Number(manifest.overview.displayResolution.rows) > 0, 'overview display rows are required');
  assert.ok(manifest.overview.overviewPath, 'overview overviewPath is required');
  assert.equal(manifest.overview.bounds?.westLon, -180, 'overview westLon is global');
  assert.equal(manifest.overview.bounds?.eastLon, 180, 'overview eastLon is global');
  assert.equal(manifest.overview.bounds?.southLat, -90, 'overview southLat is global');
  assert.equal(manifest.overview.bounds?.northLat, 90, 'overview northLat is global');
  const overviewPath = path.resolve(ROOT, manifest.overview.overviewPath.replaceAll('/', path.sep));
  const overviewText = await fs.readFile(overviewPath, 'utf8');
  const overview = JSON.parse(overviewText);
  assert.equal(overview.artifactType, 'anchor.reference-bathymetry-overview', 'overview artifact type');
  assert.equal(overview.role, 'globalOverview', 'overview artifact role');
  assert.equal(overview.localAbsolutePathsIncluded, false, 'overview has no local absolute paths');
  assert.equal(overview.rawExternalDataPathIncluded, false, 'overview has no raw external data path');
  assert.equal(overview.claimBoundary?.hiddenTruthExposed, false, 'overview has no hidden truth');
  assert.equal(overview.claimBoundary?.missionResolutionBathymetry, false, 'overview is not mission-resolution bathymetry');
  assert.doesNotMatch(overviewText, /external_data|[A-Z]:\\\\|\/Users\//, 'overview does not expose raw/local paths');
}

console.log('audit_reference_bathymetry_resolution_provenance: ok', {
  fixtureStatus: manifest.fixtureStatus,
  fixtureCount: reports.length,
  fixtures: reports
});

function assertFilenameResolution(fileName, actualArcSeconds, label) {
  const match = fileName.match(/(?:^|_)(15|30|60)s(?:_|$)/);
  if (!match) return;
  const claimed = Number(match[1]);
  assert.ok(Math.abs(claimed - actualArcSeconds) <= 0.1, `${label} claims ${claimed}s but actual is ${actualArcSeconds}s`);
}

function assertResolutionString(value, actualArcSeconds, label) {
  const match = String(value ?? '').match(/(\d+(?:\.\d+)?)\s*arc-second/i);
  assert.ok(match, `${label} must include an arc-second value`);
  const claimed = Number(match[1]);
  assert.ok(Math.abs(claimed - actualArcSeconds) <= 0.1, `${label} claims ${claimed}s but actual is ${actualArcSeconds}s`);
}
