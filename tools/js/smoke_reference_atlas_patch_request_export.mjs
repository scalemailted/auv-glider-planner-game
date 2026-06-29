import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  createReferenceBathymetryAtlas,
  createReferenceBathymetryPatchRequest,
  referenceFixtureAvailabilityForBounds
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';

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
const bounds = {
  westLon: -80.8,
  eastLon: -79.6,
  southLat: 24.6,
  northLat: 25.8
};
const availability = referenceFixtureAvailabilityForBounds(atlas, bounds);
assert.equal(availability.available, false, 'patch request export starts from unstaged bounds');
const request = createReferenceBathymetryPatchRequest(bounds, atlas);
assert.equal(request.artifactType, 'anchor.reference-bathymetry-patch-request', 'request type');
assert.equal(request.browserRunsPython, false, 'browser does not run Python');
assert.equal(request.claimBoundary?.hiddenTruthExposed, false, 'request exposes no hidden truth');
assert.equal(request.claimBoundary?.currentField4DGenerated, false, 'request does not claim currents');
assert.equal(request.claimBoundary?.scalarField4DGenerated, false, 'request does not claim scalars');
assert.match(request.downloadCommand, /download_reference_bathymetry\.py patch/, 'download command references patch downloader');
assert.match(request.preprocessCommand, /preprocess:reference-bathy/, 'preprocess command recorded');

const text = canonicalJsonStringify(request);
assert.doesNotMatch(text, /external_data|[A-Z]:\\\\|\/Users\//, 'patch request export does not expose raw/local paths');
assert.doesNotMatch(text, /"hiddenTruthExposed"\s*:\s*true/, 'patch request export has no hidden truth true');

console.log('smoke_reference_atlas_patch_request_export: ok', {
  requestDigest: request.requestDigest,
  suggestedFixtureId: request.suggestedFixtureId
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
