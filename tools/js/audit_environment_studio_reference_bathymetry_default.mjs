import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  NO_REFERENCE_DATA_FIXTURE,
  REFERENCE_BATHYMETRY_BLOCKED_MESSAGE,
  REFERENCE_BATHYMETRY_SOURCE_MODES,
  buildEnvironmentStudioProject,
  createEnvironmentStudioSession,
  environmentStudioDebugPayload,
  environmentStudioSessionSummary,
  generateEnvironmentStudioRegionFromReferenceWindow,
  selectEnvironmentStudioReferenceWindow,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';

const session = createEnvironmentStudioSession();
const summary = environmentStudioSessionSummary(session);
const debug = environmentStudioDebugPayload(session);

assert.equal(session.sourceMode, 'referenceBathymetryAtlas');
assert.equal(session.studioStage, 'referenceAtlas');
assert.equal(summary.defaultSourceMode, 'referenceBathymetryAtlas');
assert.equal(summary.proceduralSandboxDefault, false);
assert.equal(debug.defaultSourceMode, 'referenceBathymetryAtlas');
assert.equal(debug.proceduralSandboxDefault, false);
assert.equal(debug.referenceDatasetName, NO_REFERENCE_DATA_FIXTURE);
assert.equal(debug.referenceFixtureStatus, NO_REFERENCE_DATA_FIXTURE);
assert.equal(debug.hiddenTruthExposed, false);
assert.equal(debug.simulationChanged, false);
assert.equal(debug.scoringChanged, false);

const defaultMode = REFERENCE_BATHYMETRY_SOURCE_MODES.find((mode) => mode.default === true);
assert.equal(defaultMode?.id, 'referenceBathymetryAtlas', 'reference bathymetry atlas is the declared default source mode');
const proceduralMode = REFERENCE_BATHYMETRY_SOURCE_MODES.find((mode) => mode.id === 'proceduralSyntheticSandbox');
assert.equal(proceduralMode?.default, false, 'procedural synthetic sandbox is not the default source mode');

const project = buildEnvironmentStudioProject(session);
assert.equal(project.sourceMode, 'referenceBathymetryAtlas');
assert.equal(project.referenceAtlas.sourceDataset.name, NO_REFERENCE_DATA_FIXTURE);
assert.equal(project.provenance.referenceBathymetryPatch, true);
assert.equal(project.provenance.hiddenTruthExposed, false);
assert.equal(project.provenance.operationalForecast, false);
assert.equal(project.provenance.certifiedForNavigation, false);

const selected = selectEnvironmentStudioReferenceWindow(session, {
  westLon: -124.4,
  eastLon: -121.7,
  southLat: 35.6,
  northLat: 37.4
});
assert.throws(
  () => generateEnvironmentStudioRegionFromReferenceWindow(selected, {
    seed: 'bathy-data-r1-default-audit'
  }),
  new RegExp(REFERENCE_BATHYMETRY_BLOCKED_MESSAGE.split(':')[0]),
  'default reference bathymetry path blocks generation without a preprocessed fixture'
);

const selectedProject = buildEnvironmentStudioProject(selected);
const validation = validateEnvironmentStudioProject(selectedProject);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const generatedText = canonicalJsonStringify(selectedProject);
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(generatedText));
assert.ok(!/"currentField4D"\s*:\s*true/.test(generatedText));
assert.ok(!/"scalarField4D"\s*:\s*true/.test(generatedText));
assert.ok(!/"calibratedOceanProduct"\s*:\s*true/.test(generatedText));
assert.ok(!/"operationalForecast"\s*:\s*true/.test(generatedText));
assert.ok(!/"certifiedForNavigation"\s*:\s*true/.test(generatedText));

const ownerReviewPath = path.resolve('test-results', 'bathy-data-r1-owner-review', 'qa-summary.json');
try {
  const ownerReview = JSON.parse(await fs.readFile(ownerReviewPath, 'utf8'));
  assert.equal(ownerReview.defaultSourceMode, 'referenceBathymetryAtlas');
  assert.equal(ownerReview.proceduralSandboxDefault, false);
  assert.equal(ownerReview.fixtureStatus, NO_REFERENCE_DATA_FIXTURE);
  assert.equal(ownerReview.fixtureCount, 0);
  assert.equal(ownerReview.bathymetryArtifactDigest, null);
  assert.equal(ownerReview.hiddenTruthExposed, false);
  assert.equal(ownerReview.simulationChanged, false);
  assert.equal(ownerReview.scoringChanged, false);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

console.log('audit_environment_studio_reference_bathymetry_default: ok', {
  sourceMode: session.sourceMode,
  fixtureStatus: debug.referenceFixtureStatus,
  generationBlocked: true,
  validationStatus: validation.status
});
