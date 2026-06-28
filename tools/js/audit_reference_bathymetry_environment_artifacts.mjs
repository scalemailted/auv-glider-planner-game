import assert from 'node:assert/strict';
import {
  buildReferenceStudioSession,
  publicMetadataText
} from './reference_bathymetry_environment_test_helpers.mjs';

const { fixture, session, project, validation, reexported } = buildReferenceStudioSession('field-regen-r1-reference-artifact-audit');
const field = project.fieldRegenerationResult;
const graph = project.dependencyGraph.nodes;

assert.equal(fixture.fixtureId, 'monterey_canyon_15s');
assert.equal(project.sourceMode, 'referenceBathymetryAtlas');
assert.equal(project.referenceAtlas.sourceDataset.referenceDataAvailable, true);
assert.equal(field.referenceFixtureId, 'monterey_canyon_15s');
assert.equal(field.sourceLabel, 'Reference bathymetry + deterministic synthetic bathymetry-conditioned fields.');
assert.equal(field.fieldGenerationStatus, 'CURRENT');
assert.equal(field.fieldGenerationPolicy.label, 'Reference bathymetry + deterministic synthetic bathymetry-conditioned fields.');
assert.ok(field.currentArtifactDigest.startsWith('fnv1a32:'));
assert.ok(field.scalarArtifactDigest.startsWith('fnv1a32:'));
assert.ok(field.hotspotArtifactDigest.startsWith('fnv1a32:'));
assert.ok(field.hazardCandidateDigest.startsWith('fnv1a32:'));
assert.ok(field.startDropZoneCandidateDigest.startsWith('fnv1a32:'));
assert.ok(field.environmentArtifactDigest.startsWith('fnv1a32:'));
assert.equal(field.environmentArtifactStatus, 'CURRENT');
assert.ok(!('currentArtifact' in field), 'project field result must not store full current arrays');
assert.ok(!('scalarArtifact' in field), 'project field result must not store full scalar arrays');
assert.ok(!('environmentArtifact' in field), 'project field result must not store full environment arrays');

assert.equal(graph.bathymetryArtifact.state, 'CURRENT');
assert.equal(graph.wetLandMask.state, 'CURRENT');
assert.equal(graph.coastline.state, 'CURRENT');
assert.equal(graph.currentArtifact.state, 'CURRENT');
assert.equal(graph.scalarArtifact.state, 'CURRENT');
assert.equal(graph.hotspots.state, 'CURRENT');
assert.equal(graph.hazards.state, 'CURRENT');
assert.equal(graph.startsDropZones.state, 'NEEDS_VALIDATION');
assert.equal(graph.benchmarkBundle.state, 'REQUIRES_REGENERATION');
assert.equal(graph.environmentArtifact.state, 'CURRENT');
assert.equal(graph.validationReport.state, 'CURRENT');

assert.equal(project.flowGenerationInputs.generatedArtifacts.currentField4D, true);
assert.equal(project.flowGenerationInputs.generatedArtifacts.scalarField4D, true);
assert.equal(project.flowGenerationInputs.generatedArtifacts.hotspots, true);
assert.equal(project.flowGenerationInputs.generatedArtifacts.hazards, true);
assert.equal(project.flowGenerationInputs.dependencyPlan.currents, 'CURRENT');
assert.equal(project.flowGenerationInputs.dependencyPlan.scalarFields, 'CURRENT');
assert.equal(project.flowGenerationInputs.dependencyPlan.hotspots, 'CURRENT');
assert.equal(project.flowGenerationInputs.dependencyPlan.hazards, 'CURRENT');
assert.equal(project.flowGenerationInputs.dependencyPlan.startsDropZones, 'NEEDS_VALIDATION');
assert.equal(project.flowGenerationInputs.dependencyPlan.benchmarkBundle, 'REQUIRES_REGENERATION');
assert.equal(project.flowGenerationInputs.dependencyPlan.environmentArtifact, 'CURRENT');

assert.equal(validation.valid, true, validation.errors.join('\n'));
assert.equal(reexported.fieldRegenerationResult.fieldRegenerationDigest, project.fieldRegenerationResult.fieldRegenerationDigest);
assert.equal(reexported.fieldRegenerationResult.currentArtifactDigest, project.fieldRegenerationResult.currentArtifactDigest);
assert.equal(reexported.fieldRegenerationResult.hazardCandidateDigest, project.fieldRegenerationResult.hazardCandidateDigest);
assert.equal(reexported.fieldRegenerationResult.environmentArtifactDigest, project.fieldRegenerationResult.environmentArtifactDigest);

const text = publicMetadataText(project);
assert.ok(!/T_hiddenTruth|hiddenTruthExposed"\s*:\s*true|hiddenTruthIncluded"\s*:\s*true/.test(text), 'project metadata must not expose hidden truth');
assert.ok(!/[A-Z]:\\\\|external_data[\\/]/.test(text), 'project metadata must not include raw or local paths');
assert.ok(!/"usesRealHycom"\s*:\s*true|"usesRealMarineCopernicus"\s*:\s*true|"operationalForecast"\s*:\s*true|"calibratedOceanProduct"\s*:\s*true/.test(text), 'project metadata must not claim operational forecast products');
assert.equal(session.fieldRegenerationResult.claimBoundary.simulationChanged, false);
assert.equal(session.fieldRegenerationResult.claimBoundary.scoringChanged, false);

console.log('audit_reference_bathymetry_environment_artifacts: ok', {
  projectDigest: project.projectDigest,
  fieldRegenerationDigest: field.fieldRegenerationDigest,
  currentArtifactDigest: field.currentArtifactDigest,
  scalarArtifactDigest: field.scalarArtifactDigest,
  hotspotArtifactDigest: field.hotspotArtifactDigest,
  hazardCandidateDigest: field.hazardCandidateDigest,
  environmentArtifactStatus: field.environmentArtifactStatus,
  environmentArtifactDigest: field.environmentArtifactDigest
});
