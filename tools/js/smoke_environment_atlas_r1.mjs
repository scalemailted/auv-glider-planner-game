import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  OPERATIONAL_WINDOW_PRESETS,
  REGIONAL_MISSION_RECIPE_TYPE,
  SYNTHETIC_OCEAN_ATLAS_TYPE,
  createRegionalMissionRecipe,
  createSyntheticOceanAtlas,
  environmentStudioOptionsFromRegionalRecipe,
  inferAtlasContext,
  normalizeOperationalWindow
} from '../../src/core/editor/SyntheticOceanAtlas.js';
import {
  buildEnvironmentStudioProject,
  createEnvironmentStudioSession,
  generateEnvironmentStudioRegionFromAtlasWindow,
  importEnvironmentStudioProject,
  randomizeEnvironmentStudioAtlasSeed,
  selectEnvironmentStudioOperationalWindow,
  validateEnvironmentStudioProject
} from '../../src/core/editor/EnvironmentStudioProject.js';

const atlas = createSyntheticOceanAtlas({
  presetId: 'mixedRegionalWorld',
  seed: 'env-atlas-r1-smoke'
});
assert.equal(atlas.atlasType, SYNTHETIC_OCEAN_ATLAS_TYPE);
assert.equal(atlas.widthNormalized, 1);
assert.equal(atlas.heightNormalized, 1);
assert.ok(atlas.atlasDigest.startsWith('fnv1a32:'));
assert.equal(atlas.claimBoundary.realEarthMap, false);
assert.equal(atlas.claimBoundary.operationalForecast, false);

const repeatAtlas = createSyntheticOceanAtlas({
  presetId: 'mixedRegionalWorld',
  seed: 'env-atlas-r1-smoke'
});
assert.equal(repeatAtlas.atlasDigest, atlas.atlasDigest, 'atlas digest is stable by preset/seed');
assert.ok(atlas.regions.length >= 8, 'atlas has multiple synthetic context regions');

const gulfWindow = normalizeOperationalWindow({ windowPresetId: 'semiEnclosedGulfSurvey' }, atlas);
assert.ok(gulfWindow.windowDigest.startsWith('fnv1a32:'));
assert.equal(gulfWindow.detectedContext.primaryContext, 'gulfBasin');
assert.ok(gulfWindow.detectedContext.secondaryContexts.length > 0);
assert.ok(gulfWindow.detectedContext.waterFraction > 0.4);
assert.ok(gulfWindow.recommendedDomain.widthMeters > 0);
assert.ok(gulfWindow.currentRegime.includes('basinRecirculation'));
assert.ok(gulfWindow.scalarRegime.includes('bloomPatch'));

const context = inferAtlasContext(atlas, gulfWindow);
assert.equal(context.primaryContext, gulfWindow.detectedContext.primaryContext);
assert.equal(context.openBoundarySides.includes('east'), true);

for (const preset of OPERATIONAL_WINDOW_PRESETS) {
  const window = normalizeOperationalWindow({ windowPresetId: preset.id }, atlas);
  assert.ok(window.detectedContext.primaryContext, `${preset.id} infers a primary context`);
  assert.ok(window.currentRegime.length > 0, `${preset.id} records current regime hints`);
  assert.ok(window.scalarRegime.length > 0, `${preset.id} records scalar regime hints`);
}

const recipe = createRegionalMissionRecipe({
  atlas,
  selectedWindow: gulfWindow,
  seed: 'env-atlas-r1-smoke:gulf'
});
assert.equal(recipe.recipeType, REGIONAL_MISSION_RECIPE_TYPE);
assert.equal(recipe.atlasDigest, atlas.atlasDigest);
assert.equal(recipe.windowDigest, gulfWindow.windowDigest);
assert.ok(recipe.recipeDigest.startsWith('fnv1a32:'));
assert.equal(recipe.dependencyPlan.currents, 'REQUIRES_REGENERATION');
assert.equal(recipe.dependencyPlan.scalarFields, 'REQUIRES_REGENERATION');
assert.equal(recipe.claimBoundary.hiddenTruthExposed, false);

const studioOptions = environmentStudioOptionsFromRegionalRecipe(recipe);
assert.equal(studioOptions.regionalTemplate, 'semiEnclosedGulf');
assert.equal(studioOptions.coastlineOrientation, 'curvedGulf');
assert.ok(studioOptions.domainSpec.horizontal.widthMeters > 0);

let session = createEnvironmentStudioSession({
  atlas,
  selectedOperationalWindow: gulfWindow,
  regionalMissionRecipe: recipe,
  seed: 'env-atlas-r1-smoke:gulf'
});
assert.equal(session.studioStage, 'atlasWindow');
assert.equal(session.atlasPreset, 'mixedRegionalWorld');
assert.equal(session.selectedOperationalWindow.windowDigest, gulfWindow.windowDigest);
assert.equal(session.regionalMissionRecipe.recipeDigest, recipe.recipeDigest);

session = selectEnvironmentStudioOperationalWindow(session, 'islandChainSurvey');
assert.equal(session.studioStage, 'atlasWindow');
assert.equal(session.selectedOperationalWindow.windowId, 'islandChainSurvey');
assert.ok(session.regionalMissionRecipe.recipeDigest);

const randomized = randomizeEnvironmentStudioAtlasSeed(session);
assert.equal(randomized.studioStage, 'atlasWindow');
assert.notEqual(randomized.atlasSeed, session.atlasSeed);

const generated = generateEnvironmentStudioRegionFromAtlasWindow(session, { seed: 'env-atlas-r1-smoke:generated' });
assert.equal(generated.studioStage, 'regionalDetail');
assert.equal(generated.tiles.length, 4);
assert.equal(generated.dependencyGraph.nodes.currentArtifact.state, 'REQUIRES_REGENERATION');
assert.equal(generated.dependencyGraph.nodes.scalarArtifact.state, 'REQUIRES_REGENERATION');
assert.ok(generated.bathymetryBuilderResult.builderDigest.startsWith('fnv1a32:'), 'builder digest recorded');
assert.ok(generated.bathymetryBuilderResult.bathymetryArtifactDigest, 'builder bathymetry artifact digest recorded');
assert.ok(generated.bathymetryBuilderResult.generationAttempts.length >= 1, 'builder attempts recorded');
assert.ok(generated.featureRecords.length >= 3);
assert.ok(generated.previewBudget.measured);

const project = buildEnvironmentStudioProject(generated);
assert.equal(project.studioStage, 'regionalDetail');
assert.equal(project.atlas.atlasDigest, session.atlas.atlasDigest);
assert.equal(project.selectedOperationalWindow.windowId, session.selectedOperationalWindow.windowId);
assert.ok(project.regionalMissionRecipe.recipeDigest);
assert.equal(project.bathymetryBuilderResult.builderDigest, generated.bathymetryBuilderResult.builderDigest);
assert.equal(project.bathymetryArtifactDigest, generated.bathymetryArtifactDigest);
assert.equal(project.provenance.hiddenTruthExposed, false);
assert.equal(project.provenance.operationalForecast, false);

const imported = importEnvironmentStudioProject(JSON.parse(canonicalJsonStringify(project)));
const reexported = buildEnvironmentStudioProject(imported);
assert.equal(reexported.projectDigest, project.projectDigest, 'atlas-generated project round trip keeps digest stable');
assert.equal(reexported.studioStage, 'regionalDetail');
assert.equal(reexported.selectedOperationalWindow.windowId, project.selectedOperationalWindow.windowId);

const validation = validateEnvironmentStudioProject(project);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const hiddenValidation = validateEnvironmentStudioProject({ ...project, T_hiddenTruth: [[1, 2, 3]] });
assert.equal(hiddenValidation.valid, false, 'hidden-truth keys are rejected');

const projectText = canonicalJsonStringify(project);
assert.ok(!/"calibratedOceanProduct"\s*:\s*true/.test(projectText));
assert.ok(!/"operationalForecast"\s*:\s*true/.test(projectText));
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(projectText));
assert.ok(!/"rendererState"/.test(projectText));

console.log('smoke_environment_atlas_r1: ok', {
  atlasDigest: atlas.atlasDigest,
  windowDigest: gulfWindow.windowDigest,
  recipeDigest: recipe.recipeDigest,
  projectDigest: project.projectDigest,
  generatedTiles: generated.tiles.length
});
