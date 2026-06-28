import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  buildEnvironmentStudioProject,
  createEnvironmentStudioSession,
  generateEnvironmentStudioRegionFromReferenceWindow,
  loadEnvironmentStudioReferenceFixture,
  selectEnvironmentStudioReferenceWindow,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';

const ROOT = process.cwd();
const manifest = await readJson('assets/reference_bathymetry/manifest.json');
const overviewArtifact = await readJson(manifest.overview.overviewPath);
const missionReady = manifest.fixtures.find((entry) => entry.fixtureId === 'monterey_canyon_15s')
  ?? manifest.fixtures.find((entry) => entry.role === 'missionReadyPatch');
assert.ok(missionReady, 'mission-ready Monterey fixture is available');
const referenceFixtures = await Promise.all(manifest.fixtures.map(async (fixture) => ({
  ...fixture,
  rasterArtifact: await readJson(fixture.rasterPath)
})));

let session = createEnvironmentStudioSession({
  seed: 'ref-atlas-ux-r1-load-workflow',
  referenceBathymetryManifest: manifest,
  overviewArtifact,
  referenceFixtures
});
assert.equal(session.studioStage, 'globalAtlasSelector', 'starts at global atlas selector');
assert.equal(session.loadedReferenceFixtureId, null, 'no patch loaded initially');

session = selectEnvironmentStudioReferenceWindow(session, missionReady.bounds);
assert.equal(session.studioStage, 'globalAtlasSelector', 'selection remains global atlas selector');
assert.equal(session.selectedReferenceAvailability.available, true, 'selected patch is available');
assert.equal(session.selectedReferenceAvailability.matchedFixtureId, 'monterey_canyon_15s', 'selected patch matches mission-ready fixture');
assert.throws(
  () => generateEnvironmentStudioRegionFromReferenceWindow(session, { seed: 'ref-atlas-ux-r1-before-load' }),
  /REFERENCE_PATCH_NOT_LOADED/,
  'generation requires loading the staged patch first'
);

session = loadEnvironmentStudioReferenceFixture(session, missionReady.fixtureId);
assert.equal(session.studioStage, 'regionalPatchWorkspace', 'loading patch enters regional patch workspace');
assert.equal(session.loadedReferenceFixtureId, 'monterey_canyon_15s', 'loaded fixture id');
assert.equal(session.loadedReferenceFixtureRole, 'missionReadyPatch', 'loaded fixture role');

session = generateEnvironmentStudioRegionFromReferenceWindow(session, {
  seed: 'ref-atlas-ux-r1-after-load'
});
assert.equal(session.studioStage, 'regionalPatchWorkspace', 'generation remains in patch workspace');
assert.ok(session.bathymetryArtifactDigest, 'bathymetry artifact digest exists');
assert.equal(session.dependencyGraph.nodes.currentArtifact.state, 'REQUIRES_REGENERATION', 'currents require regeneration after bathymetry');
assert.equal(session.dependencyGraph.nodes.scalarArtifact.state, 'REQUIRES_REGENERATION', 'scalars require regeneration after bathymetry');
assert.equal(session.dependencyGraph.nodes.hotspots.state, 'REQUIRES_REGENERATION', 'hotspots require regeneration after bathymetry');
assert.equal(session.dependencyGraph.nodes.startsDropZones.state, 'NEEDS_VALIDATION', 'starts/drop zones need validation');
assert.equal(session.dependencyGraph.nodes.benchmarkBundle.state, 'REQUIRES_REGENERATION', 'benchmark bundle requires regeneration');

const project = buildEnvironmentStudioProject(session);
const validation = validateEnvironmentStudioProject(project);
assert.equal(validation.valid, true, validation.errors.join('\n'));
assert.equal(project.loadedReferenceFixtureId, 'monterey_canyon_15s', 'project preserves loaded fixture id');
assert.equal(project.provenance.hiddenTruthExposed, false, 'project exposes no hidden truth');
assert.equal(project.provenance.operationalForecast, false, 'project does not claim operational forecast');
assert.equal(project.provenance.certifiedForNavigation, false, 'project is not navigation certified');
assert.equal(project.flowGenerationInputs?.status, 'reference-patch-bathymetry-ready-current-and-scalar-artifacts-not-generated', 'project records bathymetry-ready field regeneration inputs');
assert.equal(project.flowGenerationInputs?.claimBoundary?.currentField4DGenerated, false, 'bathymetry-stage project does not claim current generation');
assert.equal(project.flowGenerationInputs?.claimBoundary?.scalarField4DGenerated, false, 'bathymetry-stage project does not claim scalar generation');

const text = canonicalJsonStringify(project);
assert.doesNotMatch(text, /external_data|[A-Z]:\\\\|\/Users\//, 'project does not expose raw/local paths');
assert.doesNotMatch(text, /"hiddenTruthExposed"\s*:\s*true/, 'project text has no hidden truth true');

console.log('smoke_reference_atlas_load_patch_workflow: ok', {
  loadedFixtureId: project.loadedReferenceFixtureId,
  bathymetryArtifactDigest: project.bathymetryArtifactDigest,
  projectDigest: project.projectDigest
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
