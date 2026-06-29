import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createReferenceBathymetryAtlas,
  referenceAtlasBoundsFromDrag,
  referenceFixtureAvailabilityForBounds
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  createEnvironmentStudioSession,
  selectEnvironmentStudioReferenceWindow
} from '../../src/core/editor/EnvironmentStudioProject.js';

const ROOT = process.cwd();
const { atlas, manifest, overviewArtifact, overviewRasterArtifact, referenceFixtures } = await loadReferenceAtlas();

const montereyBounds = referenceAtlasBoundsFromDrag(
  { lon: -123, lat: 37.2 },
  { lon: -121.5, lat: 36 },
  { minLonSpanDegrees: 0.2, minLatSpanDegrees: 0.2 }
);
const montereyAvailability = referenceFixtureAvailabilityForBounds(atlas, montereyBounds);
assert.equal(montereyAvailability.available, true, 'dragged Monterey region is staged');
assert.equal(montereyAvailability.matchedFixtureId, 'monterey_canyon_15s', 'dragged Monterey region matches mission fixture');
assert.equal(montereyAvailability.recommendedAction, 'loadMissionPatch', 'staged region recommends loading patch');

let session = createEnvironmentStudioSession({
  referenceBathymetryManifest: manifest,
  overviewArtifact,
  overviewRasterArtifact,
  referenceFixtures
});
session = selectEnvironmentStudioReferenceWindow(session, montereyBounds);
assert.equal(session.selectedReferenceAvailability.available, true, 'session stores staged boundary availability');
assert.equal(session.selectedReferenceAvailability.matchedFixtureId, 'monterey_canyon_15s', 'session stores staged fixture id');
assert.equal(session.referencePatchRequest, null, 'staged boundary does not require patch request export');

const floridaBounds = referenceAtlasBoundsFromDrag(
  { lon: -80.8, lat: 25.8 },
  { lon: -79.6, lat: 24.6 },
  { minLonSpanDegrees: 0.2, minLatSpanDegrees: 0.2 }
);
const floridaAvailability = referenceFixtureAvailabilityForBounds(atlas, floridaBounds);
assert.equal(floridaAvailability.available, false, 'Florida region is intentionally unstaged');
assert.equal(floridaAvailability.recommendedAction, 'exportPatchRequest', 'unstaged region recommends patch request');

session = selectEnvironmentStudioReferenceWindow(session, floridaBounds);
assert.equal(session.selectedReferenceAvailability.available, false, 'session stores unstaged boundary availability');
assert.equal(session.referencePatchRequest?.artifactType, 'anchor.reference-bathymetry-patch-request', 'session creates patch request for unstaged boundary');
assert.equal(session.referencePatchRequest?.claimBoundary?.hiddenTruthExposed, false, 'patch request exposes no hidden truth');

console.log('smoke_reference_atlas_boundary_selection: ok', {
  montereyStatus: montereyAvailability.status,
  floridaStatus: floridaAvailability.status,
  patchRequestDigest: session.referencePatchRequest?.requestDigest
});

async function loadReferenceAtlas() {
  const manifest = await readJson('assets/reference_bathymetry/manifest.json');
  const overviewArtifact = await readJson(manifest.overview.overviewPath);
  const overviewRasterArtifact = await readJson(overviewArtifact.previewPath ?? manifest.overview.previewPath);
  const referenceFixtures = await Promise.all(manifest.fixtures.map(async (fixture) => ({
    ...fixture,
    rasterArtifact: await readJson(fixture.rasterPath)
  })));
  return {
    manifest,
    overviewArtifact,
    overviewRasterArtifact,
    referenceFixtures,
    atlas: createReferenceBathymetryAtlas({
      manifest,
      overviewArtifact,
      overviewRasterArtifact,
      referenceFixtures
    })
  };
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
