import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  buildEnvironmentStudioProject,
  createEnvironmentStudioSession,
  generateEnvironmentStudioRegionFromWorldWindow,
  importEnvironmentStudioProject,
  selectEnvironmentStudioWorldWindow,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';

let session = createEnvironmentStudioSession({
  worldStyle: 'shelfToBasinWorld',
  worldSeed: 'env-studio-r2-bathymetry-smoke',
  worldMap: {
    style: 'shelfToBasinWorld',
    seed: 'env-studio-r2-bathymetry-smoke',
    resolution: { columns: 96, rows: 54 }
  }
});
assert.equal(session.studioStage, 'worldMap');
assert.equal(session.worldMap.artifactType, 'anchor.synthetic-world-map');
assert.equal(session.selectedOperationalWindow, null);

session = selectEnvironmentStudioWorldWindow(session, {
  x: 0.26,
  y: 0.24,
  width: 0.32,
  height: 0.3,
  sourceResolutionMeters: 1800,
  previewResolutionMeters: 7200
});
assert.equal(session.selectedOperationalWindow.artifactType, 'anchor.operational-window');
assert.ok(session.selectedOperationalWindow.windowDigest.startsWith('fnv1a32:'));
assert.ok(session.selectedOperationalWindow.sampledFieldStats.fieldStatsDigest.startsWith('fnv1a32:'));
assert.ok(session.regionalMissionRecipe.recipeDigest.startsWith('fnv1a32:'));
assert.equal(session.regionalMissionRecipe.dependencyPlan.currents, 'REQUIRES_REGENERATION');
assert.equal(session.regionalMissionRecipe.dependencyPlan.scalarFields, 'REQUIRES_REGENERATION');
assert.equal(session.regionalMissionRecipe.dependencyPlan.hotspots, 'REQUIRES_REGENERATION');

const generated = generateEnvironmentStudioRegionFromWorldWindow(session, {
  seed: 'env-studio-r2-bathymetry-smoke:region'
});
assert.equal(generated.studioStage, 'regionalBathymetry');
assert.equal(generated.tiles.length, 4);
assert.ok(generated.bathymetryBuilderResult.builderDigest.startsWith('fnv1a32:'));
assert.ok(generated.bathymetryArtifactDigest, 'bathymetry artifact digest exists');
assert.equal(generated.dependencyGraph.nodes.bathymetryArtifact.state, 'CURRENT');
assert.equal(generated.dependencyGraph.nodes.wetLandMask.state, 'CURRENT');
assert.equal(generated.dependencyGraph.nodes.coastline.state, 'CURRENT');
assert.equal(generated.dependencyGraph.nodes.currentArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(generated.dependencyGraph.nodes.scalarArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(generated.dependencyGraph.nodes.hotspots.state, 'REQUIRES_REGENERATION');
assert.equal(generated.dependencyGraph.nodes.startsDropZones.state, 'NEEDS_VALIDATION');
assert.equal(generated.dependencyGraph.nodes.benchmarkBundle.state, 'REQUIRES_REGENERATION');
assert.equal(generated.flowGenerationInputs.generatedArtifacts.currentField4D, false);
assert.equal(generated.flowGenerationInputs.generatedArtifacts.scalarField4D, false);
assert.ok(generated.flowGenerationInputs.wetLandMaskIdentity, 'wet/land mask identity preserved');
assert.ok(generated.flowGenerationInputs.coastlineSummary, 'coastline summary preserved');
assert.ok(generated.featureRecords.length >= 3);
assert.equal(generated.validationReport.status === 'FAIL', false, generated.validationReport.errors.join('\n'));

for (const tile of generated.tiles) {
  assert.equal(tile.diagnostics.finiteDepths, true);
  assert.ok(tile.diagnostics.maxDepthMeters > 0, 'positive-down depth range exists');
  assert.ok(tile.diagnostics.wetCellCount > 0, 'wet cells exist');
}

const project = buildEnvironmentStudioProject(generated);
assert.equal(project.studioStage, 'regionalBathymetry');
assert.equal(project.worldMap.artifactType, 'anchor.synthetic-world-map');
assert.equal(project.selectedOperationalWindow.artifactType, 'anchor.operational-window');
assert.equal(project.dependencyGraph.nodes.currentArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(project.flowGenerationInputs.generatedArtifacts.hotspots, false);

const validation = validateEnvironmentStudioProject(project);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const imported = importEnvironmentStudioProject(JSON.parse(canonicalJsonStringify(project)));
const reexported = buildEnvironmentStudioProject(imported);
assert.equal(reexported.projectDigest, project.projectDigest, 'world-window project roundtrip keeps digest stable');
assert.equal(reexported.worldDigest, project.worldDigest);
assert.equal(reexported.selectedOperationalWindow.windowDigest, project.selectedOperationalWindow.windowDigest);

const text = canonicalJsonStringify(project);
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text));
assert.ok(!/"operationalForecast"\s*:\s*true/.test(text));
assert.ok(!/"calibratedOceanProduct"\s*:\s*true/.test(text));
assert.ok(!/"currentField4D"\s*:\s*true/.test(text));
assert.ok(!/"scalarField4D"\s*:\s*true/.test(text));

console.log('smoke_world_window_bathymetry_generation: ok', {
  worldDigest: project.worldDigest,
  windowDigest: project.selectedOperationalWindow.windowDigest,
  bathymetryArtifactDigest: project.bathymetryArtifactDigest,
  projectDigest: project.projectDigest
});
