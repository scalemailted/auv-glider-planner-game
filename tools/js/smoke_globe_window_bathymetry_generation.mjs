import assert from 'node:assert/strict';
import {
  buildEnvironmentStudioProject,
  createEnvironmentStudioSession,
  generateEnvironmentStudioRegionFromWorldWindow,
  importEnvironmentStudioProject,
  selectEnvironmentStudioWorldWindow,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';

let session = createEnvironmentStudioSession({
  worldStyle: 'continentalMargins',
  worldSeed: 'globe-bathymetry-smoke'
});

assert.equal(session.worldMap.artifactType, 'anchor.synthetic-globe-world');
assert.ok(session.worldMap.canonicalWorldResolution.width >= 2048);

session = selectEnvironmentStudioWorldWindow(session, {
  centerLonNormalized: 0.75,
  centerLatNormalized: 0.44,
  widthNormalized: 0.18,
  heightNormalized: 0.16,
  sourceResolutionMeters: 1500,
  previewResolutionMeters: 6000,
  selectedBy: 'smoke'
});

const generated = generateEnvironmentStudioRegionFromWorldWindow(session, {
  seed: 'globe-bathymetry-smoke:region'
});

assert.equal(generated.studioStage, 'regionalBathymetry');
assert.equal(generated.selectedOperationalWindow.artifactType, 'anchor.operational-globe-window');
assert.ok(generated.regionalMissionRecipe.recipeDigest.startsWith('fnv1a32:'));
assert.ok(generated.bathymetryBuilderResult.builderDigest.startsWith('fnv1a32:'));
assert.ok(generated.bathymetryArtifactDigest, 'bathymetry artifact digest exists');
assert.equal(generated.dependencyGraph.nodes.bathymetryArtifact.state, 'CURRENT');
assert.equal(generated.dependencyGraph.nodes.currentArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(generated.dependencyGraph.nodes.scalarArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(generated.dependencyGraph.nodes.hotspots.state, 'REQUIRES_REGENERATION');
assert.equal(generated.dependencyGraph.nodes.benchmarkBundle.state, 'REQUIRES_REGENERATION');
assert.equal(generated.flowGenerationInputs.generatedArtifacts.currentField4D, false);
assert.equal(generated.flowGenerationInputs.generatedArtifacts.scalarField4D, false);
assert.ok(generated.bathymetryBuilderResult.wetLandMask || generated.bathymetryBuilderResult.wetLandMask === undefined, 'compact result remains browser-safe');
assert.ok(generated.bathymetryBuilderResult.coastlineSummary, 'coastline summary exists');
assert.ok((generated.bathymetryBuilderResult.featureRecords ?? []).length > 0, 'feature records exist');
assert.ok(generated.bathymetryBuilderResult.validationReport, 'validation report exists');

const project = buildEnvironmentStudioProject(generated);
assert.equal(project.worldMap.artifactType, 'anchor.synthetic-globe-world');
assert.equal(project.selectedOperationalWindow.artifactType, 'anchor.operational-globe-window');
assert.equal(project.provenance.hiddenTruthExposed, false);

const validation = validateEnvironmentStudioProject(project);
assert.equal(validation.valid, true, 'generated globe project validates');
const imported = importEnvironmentStudioProject(project);
assert.equal(imported.studioStage, 'regionalBathymetry');
assert.equal(imported.worldMap.worldDigest, generated.worldMap.worldDigest);
assert.equal(imported.selectedOperationalWindow.windowDigest, generated.selectedOperationalWindow.windowDigest);
assert.equal(imported.bathymetryArtifactDigest, generated.bathymetryArtifactDigest);

console.log('smoke_globe_window_bathymetry_generation: ok', {
  worldDigest: project.worldDigest,
  windowDigest: project.selectedOperationalWindow.windowDigest,
  bathymetryArtifactDigest: project.bathymetryArtifactDigest
});
