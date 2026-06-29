import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  createReferenceBathymetryAtlas,
  createReferenceBathymetryPatchRequest,
  referenceFixtureAvailabilityForBounds
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  createEnvironmentStudioSession,
  selectEnvironmentStudioReferenceWindow
} from '../../src/core/editor/EnvironmentStudioProject.js';

const ROOT = process.cwd();
const manifest = await readJson('assets/reference_bathymetry/manifest.json');
const overviewArtifact = await readJson(manifest.overview.overviewPath);
const overviewRasterArtifact = await readJson(overviewArtifact.previewPath ?? manifest.overview.previewPath);
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
const unstagedBounds = {
  westLon: -80.8,
  eastLon: -79.6,
  southLat: 24.6,
  northLat: 25.8
};
const availability = referenceFixtureAvailabilityForBounds(atlas, unstagedBounds);
assert.equal(availability.available, false, 'Florida test bounds are not a staged patch');
assert.equal(availability.recommendedAction, 'exportPatchRequest', 'unstaged bounds export a patch request');

const request = createReferenceBathymetryPatchRequest(unstagedBounds, atlas, {
  suggestedFixtureId: 'florida_straits_15s_request'
});
assert.equal(request.artifactType, 'anchor.reference-bathymetry-patch-request', 'patch request type');
assert.equal(request.browserRunsPython, false, 'browser does not run Python');
assert.equal(request.claimBoundary?.hiddenTruthExposed, false, 'request exposes no hidden truth');
assert.equal(request.claimBoundary?.currentField4DGenerated, false, 'request does not claim currents');
assert.equal(request.claimBoundary?.scalarField4DGenerated, false, 'request does not claim scalars');
assert.match(request.downloadCommand, /download_reference_bathymetry\.py patch/, 'download command references patch downloader');
assert.match(request.downloadCommand, /--resolution 15s/, 'download command requests 15s');
assert.match(request.preprocessCommand, /preprocess:reference-bathy/, 'preprocess command recorded');
assert.match(request.auditCommand, /audit:reference-bathy/, 'audit command recorded');

let session = createEnvironmentStudioSession({
  referenceBathymetryManifest: manifest,
  overviewArtifact,
  overviewRasterArtifact,
  referenceFixtures
});
session = selectEnvironmentStudioReferenceWindow(session, unstagedBounds);
assert.equal(session.studioStage, 'globalAtlasSelector', 'unstaged selection stays in atlas selector');
assert.equal(session.selectedReferenceAvailability.available, false, 'session records unstaged selection');
assert.equal(session.referencePatchRequest.artifactType, request.artifactType, 'session records patch request');
assert.equal(session.referencePatchRequest.claimBoundary?.hiddenTruthExposed, false, 'session request exposes no hidden truth');

const text = canonicalJsonStringify({
  request,
  selectedReferenceAvailability: session.selectedReferenceAvailability,
  referencePatchRequest: session.referencePatchRequest,
  referenceAtlas: {
    sourceDataset: session.referenceAtlas.sourceDataset,
    overviewDigest: session.referenceAtlas.overviewDigest,
    fixtureCoverageOverlays: session.referenceAtlas.fixtureCoverageOverlays
  }
});
assert.doesNotMatch(text, /external_data|[A-Z]:\\\\|\/Users\//, 'patch request does not expose raw/local paths');
assert.doesNotMatch(text, /"hiddenTruthExposed"\s*:\s*true/, 'patch request text has no hidden truth true');

console.log('smoke_reference_atlas_patch_request: ok', {
  requestDigest: request.requestDigest,
  recommendedAction: availability.recommendedAction,
  downloadCommand: request.downloadCommand
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
