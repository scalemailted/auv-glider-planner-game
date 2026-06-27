import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  NO_REFERENCE_DATA_FIXTURE,
  buildBathymetryFromReferenceWindow,
  createDefaultReferenceBathymetryWindow,
  createReferenceBathymetryAtlas
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  buildEnvironmentStudioProject,
  createEnvironmentStudioSession,
  generateEnvironmentStudioRegionFromReferenceWindow,
  importEnvironmentStudioProject,
  selectEnvironmentStudioReferenceWindow,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';

const atlas = createReferenceBathymetryAtlas();
const window = createDefaultReferenceBathymetryWindow(atlas);
const result = buildBathymetryFromReferenceWindow(atlas, window, {
  seed: 'real-bathy-r1-reference-patch-smoke'
});

assert.equal(result.type, 'anchor.reference-patch-bathymetry-builder-result');
assert.ok(result.builderDigest.startsWith('fnv1a32:'));
assert.equal(result.atlasDigest, atlas.atlasDigest);
assert.equal(result.patchDigest, window.patchDigest);
assert.ok(result.bathymetryArtifactDigest);
assert.equal(result.bathymetryArtifactDigest, result.bathymetryArtifact.artifactDigest);
assert.equal(result.validationReport.valid, true);
assert.equal(result.validationReport.status, 'WARN');
assert.match(result.validationReport.warnings.join('\n'), /REAL_BATHY_R1_BLOCKED_WAITING_FOR_REFERENCE_FIXTURE/);

const field = result.bathymetryField;
assert.ok(field.bottomDepthMeters.length > 0, 'field has depth rows');
assert.ok(field.bottomDepthMeters[0].length > 0, 'field has depth columns');
assert.ok(field.bottomDepthMeters.flat().every((depth) => Number.isFinite(Number(depth)) && Number(depth) >= 0), 'bottom depth is finite positive-down');
assert.ok(field.wetMask.flat().some(Boolean), 'field has wet cells');
assert.ok(field.landMask.flat().some(Boolean), 'field has land cells');
assert.ok(result.coastlineSummary.segmentCount >= 0, 'coastline summary exists');

const flow = result.flowGenerationInputs;
assert.equal(flow.generatedArtifacts.currentField4D, false);
assert.equal(flow.generatedArtifacts.scalarField4D, false);
assert.equal(flow.generatedArtifacts.hotspots, false);
assert.equal(flow.dependencyPlan.currents, 'REQUIRES_REGENERATION');
assert.equal(flow.dependencyPlan.scalarFields, 'REQUIRES_REGENERATION');
assert.equal(flow.dependencyPlan.hotspots, 'REQUIRES_REGENERATION');
assert.equal(flow.dependencyPlan.startsDropZones, 'NEEDS_VALIDATION');
assert.equal(flow.dependencyPlan.benchmarkBundle, 'REQUIRES_REGENERATION');
assert.equal(flow.sourceDataset.name, NO_REFERENCE_DATA_FIXTURE);

let session = createEnvironmentStudioSession({
  seed: 'real-bathy-r1-studio-smoke'
});
assert.equal(session.sourceMode, 'referenceBathymetryAtlas');
assert.equal(session.studioStage, 'referenceAtlas');
session = selectEnvironmentStudioReferenceWindow(session, window.bounds);
session = generateEnvironmentStudioRegionFromReferenceWindow(session, {
  seed: 'real-bathy-r1-studio-smoke:generated'
});

assert.equal(session.studioStage, 'regionalBathymetry');
assert.equal(session.tiles.length, 4);
assert.equal(session.bathymetryArtifactDigest, session.bathymetryBuilderResult.bathymetryArtifactDigest);
assert.equal(session.dependencyGraph.nodes.currentArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(session.dependencyGraph.nodes.scalarArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(session.dependencyGraph.nodes.hotspots.state, 'REQUIRES_REGENERATION');
assert.equal(session.dependencyGraph.nodes.startsDropZones.state, 'NEEDS_VALIDATION');

const project = buildEnvironmentStudioProject(session);
assert.equal(project.sourceMode, 'referenceBathymetryAtlas');
assert.equal(project.referenceAtlas.sourceDataset.name, NO_REFERENCE_DATA_FIXTURE);
assert.equal(project.selectedReferenceWindow.patchDigest, window.patchDigest);
assert.equal(project.selectedPatchDigest, window.patchDigest);
assert.equal(project.bathymetryBuilderResult.type, 'anchor.reference-patch-bathymetry-builder-summary');
assert.equal(project.bathymetryBuilderResult.patchDigest, window.patchDigest);
assert.equal(project.flowGenerationInputs.patchDigest, window.patchDigest);
assert.equal(project.provenance.hiddenTruthExposed, false);
assert.equal(project.provenance.operationalForecast, false);
assert.equal(project.provenance.certifiedForNavigation, false);

const validation = validateEnvironmentStudioProject(project);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const imported = importEnvironmentStudioProject(JSON.parse(canonicalJsonStringify(project)));
const reexported = buildEnvironmentStudioProject(imported);
assert.equal(reexported.projectDigest, project.projectDigest, 'reference patch project roundtrip keeps digest stable');

const text = canonicalJsonStringify(project);
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text));
assert.ok(!/"currentField4D"\s*:\s*true/.test(text));
assert.ok(!/"scalarField4D"\s*:\s*true/.test(text));
assert.ok(!/"certifiedForNavigation"\s*:\s*true/.test(text));

console.log('smoke_reference_patch_to_bathymetry_artifact: ok', {
  atlasDigest: atlas.atlasDigest,
  patchDigest: window.patchDigest,
  bathymetryArtifactDigest: project.bathymetryArtifactDigest,
  projectDigest: project.projectDigest
});
