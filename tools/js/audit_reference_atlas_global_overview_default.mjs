import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  createEnvironmentStudioSession,
  environmentStudioDebugPayload,
  environmentStudioSessionSummary
} from '../../src/core/editor/EnvironmentStudioProject.js';

const ROOT = process.cwd();
const manifest = await readJson('assets/reference_bathymetry/manifest.json');
const overviewArtifact = await readJson(manifest.overview.overviewPath);
const referenceFixtures = await Promise.all(manifest.fixtures.map(async (fixture) => ({
  ...fixture,
  rasterArtifact: await readJson(fixture.rasterPath)
})));

assert.equal(manifest.fixtureStatus, 'AVAILABLE', 'reference manifest is available');
assert.equal(manifest.overview.role, 'globalOverview', 'manifest overview role');
assert.equal(manifest.overview.bounds.westLon, -180, 'global overview westLon');
assert.equal(manifest.overview.bounds.eastLon, 180, 'global overview eastLon');
assert.equal(manifest.overview.bounds.southLat, -90, 'global overview southLat');
assert.equal(manifest.overview.bounds.northLat, 90, 'global overview northLat');
assert.equal(overviewArtifact.artifactType, 'anchor.reference-bathymetry-overview', 'overview artifact type');
assert.equal(overviewArtifact.role, 'globalOverview', 'overview artifact role');
assert.equal(overviewArtifact.claimBoundary?.missionResolutionBathymetry, false, 'overview is not mission-resolution bathymetry');
assert.equal(overviewArtifact.claimBoundary?.hiddenTruthExposed, false, 'overview has no hidden truth');

const session = createEnvironmentStudioSession({
  referenceBathymetryManifest: manifest,
  overviewArtifact,
  referenceFixtures
});
const summary = environmentStudioSessionSummary(session);
const debug = environmentStudioDebugPayload(session);

assert.equal(session.sourceMode, 'referenceBathymetryAtlas', 'default source mode');
assert.equal(session.studioStage, 'globalAtlasSelector', 'default stage is global atlas selector');
assert.equal(session.referenceAtlas.sourceDataset.referenceDataAvailable, true, 'reference data is available when rasters load');
assert.equal(summary.defaultStage, 'globalAtlasSelector', 'summary default stage');
assert.equal(debug.defaultStage, 'globalAtlasSelector', 'debug default stage');
assert.equal(debug.defaultViewIsRegionalPatch, false, 'default view is not a regional patch');
assert.equal(debug.overviewIsGlobal, true, 'debug overview is global');
assert.equal(debug.rawExternalDataPathExposed, false, 'debug does not expose raw paths');
assert.equal(debug.hiddenTruthExposed, false, 'debug does not expose hidden truth');
assert.ok(debug.missionReadyPatchCount >= 1, 'at least one mission-ready patch');
assert.ok(debug.lowResolutionPatchCount >= 1, 'at least one low-resolution patch');

const publicText = canonicalJsonStringify({ manifest, overviewArtifact, summary, debug });
assert.doesNotMatch(publicText, /external_data|[A-Z]:\\\\|\/Users\//, 'public atlas metadata does not expose raw/local paths');
assert.doesNotMatch(publicText, /"hiddenTruthExposed"\s*:\s*true/, 'public atlas metadata does not expose hidden truth');
assert.doesNotMatch(publicText, /"operationalOceanForecast"\s*:\s*true|"calibratedForecastSystem"\s*:\s*true/, 'public atlas metadata does not claim calibrated forecast');

console.log('audit_reference_atlas_global_overview_default: ok', {
  defaultStage: session.studioStage,
  overviewDigest: debug.overviewDigest,
  missionReadyPatchCount: debug.missionReadyPatchCount,
  lowResolutionPatchCount: debug.lowResolutionPatchCount
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
