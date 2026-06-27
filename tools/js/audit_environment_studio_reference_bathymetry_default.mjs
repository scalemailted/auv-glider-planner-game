import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  NO_REFERENCE_DATA_FIXTURE,
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
const generated = generateEnvironmentStudioRegionFromReferenceWindow(selected, {
  seed: 'real-bathy-r1-default-audit'
});
assert.equal(generated.sourceMode, 'referenceBathymetryAtlas');
assert.equal(generated.studioStage, 'regionalBathymetry');
assert.equal(generated.flowGenerationInputs.generatedArtifacts.currentField4D, false);
assert.equal(generated.flowGenerationInputs.generatedArtifacts.scalarField4D, false);
assert.equal(generated.flowGenerationInputs.generatedArtifacts.hotspots, false);
assert.equal(generated.dependencyGraph.nodes.currentArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(generated.dependencyGraph.nodes.scalarArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(generated.dependencyGraph.nodes.startsDropZones.state, 'NEEDS_VALIDATION');
assert.equal(generated.dependencyGraph.nodes.benchmarkBundle.state, 'REQUIRES_REGENERATION');

const generatedProject = buildEnvironmentStudioProject(generated);
const validation = validateEnvironmentStudioProject(generatedProject);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const generatedText = canonicalJsonStringify(generatedProject);
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(generatedText));
assert.ok(!/"currentField4D"\s*:\s*true/.test(generatedText));
assert.ok(!/"scalarField4D"\s*:\s*true/.test(generatedText));
assert.ok(!/"calibratedOceanProduct"\s*:\s*true/.test(generatedText));
assert.ok(!/"operationalForecast"\s*:\s*true/.test(generatedText));
assert.ok(!/"certifiedForNavigation"\s*:\s*true/.test(generatedText));

const ownerReviewPath = path.resolve('test-results', 'real-bathy-r1-owner-review', 'qa-summary.json');
try {
  const ownerReview = JSON.parse(await fs.readFile(ownerReviewPath, 'utf8'));
  assert.equal(ownerReview.defaultSourceMode, 'referenceBathymetryAtlas');
  assert.equal(ownerReview.proceduralSandboxDefault, false);
  assert.equal(ownerReview.referenceDatasetName, NO_REFERENCE_DATA_FIXTURE);
  assert.ok(ownerReview.referenceAtlasDigest, 'owner review records reference atlas digest');
  assert.equal(ownerReview.forbiddenPrimaryControlCount, 0);
  assert.equal(ownerReview.hiddenTruthExposed, false);
  assert.equal(ownerReview.simulationChanged, false);
  assert.equal(ownerReview.scoringChanged, false);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

console.log('audit_environment_studio_reference_bathymetry_default: ok', {
  sourceMode: session.sourceMode,
  fixtureStatus: debug.referenceFixtureStatus,
  generatedBathymetryArtifactDigest: generatedProject.bathymetryArtifactDigest,
  validationStatus: validation.status
});
