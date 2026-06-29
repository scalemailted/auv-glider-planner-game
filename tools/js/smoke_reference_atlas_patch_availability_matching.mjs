import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createReferenceBathymetryAtlas,
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

assert.ok(referenceFixtures.length >= 1, 'reference fixture inventory is available');
for (const fixture of referenceFixtures) {
  const availability = referenceFixtureAvailabilityForBounds(atlas, fixture.bounds);
  assert.equal(availability.available, true, `${fixture.fixtureId} fixture bounds are available`);
  assert.equal(availability.hiddenTruthExposed, false, `${fixture.fixtureId} availability exposes no hidden truth`);
  if (fixture.role === 'missionReadyPatch') {
    assert.equal(availability.matchedFixtureId, fixture.fixtureId, `${fixture.fixtureId} matches itself`);
    assert.equal(availability.recommendedAction, 'loadMissionPatch', `${fixture.fixtureId} mission patch loads directly`);
  }
}

const unstagedAvailability = referenceFixtureAvailabilityForBounds(atlas, {
  westLon: -80.8,
  eastLon: -79.6,
  southLat: 24.6,
  northLat: 25.8
});
assert.equal(unstagedAvailability.available, false, 'unstaged Florida test region is not available');
assert.equal(unstagedAvailability.recommendedAction, 'exportPatchRequest', 'unstaged region recommends export');
assert.equal(unstagedAvailability.hiddenTruthExposed, false, 'unstaged availability exposes no hidden truth');

console.log('smoke_reference_atlas_patch_availability_matching: ok', {
  fixtureCount: referenceFixtures.length,
  unstagedStatus: unstagedAvailability.status
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
