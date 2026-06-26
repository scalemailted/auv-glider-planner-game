import assert from 'node:assert/strict';
import {
  createRegionalMissionRecipe,
  createSyntheticOceanAtlas,
  normalizeOperationalWindow
} from '../../src/core/editor/SyntheticOceanAtlas.js';
import {
  WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION,
  buildWindowConditionedBathymetry,
  compactWindowConditionedBathymetryResult
} from '../../src/core/generation/WindowConditionedBathymetryBuilder.js';

const atlas = createSyntheticOceanAtlas({
  presetId: 'riverDeltaShelfWorld',
  seed: 'window-builder-smoke-atlas'
});
const window = normalizeOperationalWindow({ windowPresetId: 'riverMouthPlumeSurvey' }, atlas);
const recipe = createRegionalMissionRecipe({
  atlas,
  selectedWindow: window,
  seed: 'window-builder-smoke-recipe'
});

const result = buildWindowConditionedBathymetry(recipe, { atlas });
const repeat = buildWindowConditionedBathymetry(recipe, { atlas });
const changed = buildWindowConditionedBathymetry({ ...recipe, randomSeed: `${recipe.randomSeed}:changed` }, { atlas });

assert.equal(result.builderVersion, WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION);
assert.equal(result.builderDigest, repeat.builderDigest, 'same recipe/seed produces stable builder digest');
assert.equal(result.bathymetryArtifactDigest, repeat.bathymetryArtifactDigest, 'same recipe/seed produces stable artifact digest');
assert.notEqual(result.builderDigest, changed.builderDigest, 'different seed changes generated bathymetry');
assert.equal(result.claimBoundary.hiddenTruthExposed, false);
assert.equal(result.provenance.rawNoiseTerrain, false);
assert.equal(result.provenance.operationalForecast, false);
assert.ok(result.generationAttempts.length >= 1 && result.generationAttempts.length <= 3, 'retry loop records bounded attempts');

const field = result.bathymetryField;
assert.equal(field.bottomDepthMeters.length, recipe.sourceResolution.rows, 'source rows match recipe');
assert.equal(field.bottomDepthMeters[0].length, recipe.sourceResolution.columns, 'source columns match recipe');
assert.ok(field.bottomDepthMeters.flat().every((value) => Number.isFinite(Number(value))), 'depth values finite');
assert.ok(field.bottomDepthMeters.flat().every((value) => Number(value) >= 0), 'positive-down depth convention');
assert.equal(field.wetMask.length, field.bottomDepthMeters.length, 'wet mask rows match depth');
assert.equal(field.landMask.length, field.bottomDepthMeters.length, 'land mask rows match depth');
assert.ok(field.wetMask.flat().some(Boolean), 'wet mask has navigable water');
assert.ok(field.landSeaMask.flat().every((value) => value === 'water' || value === 'land'), 'landSeaMask is explicit');
assert.ok(result.coastlineSummary.segmentCount >= 0, 'coastline summary exists');
assert.ok(result.featureRecords.length >= 2, 'feature records exist');
assert.ok(result.validationReport.validationReportDigest.startsWith('fnv1a32:'), 'validation report has digest');
assert.notEqual(result.validationReport.status, 'FAIL', result.validationReport.errors.join('\n'));
assert.ok(result.bathymetryArtifact.artifactDigest, 'BathymetryArtifact-compatible artifact has digest');
assert.equal(result.bathymetryArtifact.provenance.calibratedBathymetry, false);
assert.equal(result.bathymetryArtifact.boundaryFlags.operationalNavigationProduct, false);
assert.ok(result.flowGenerationInputs.flowGenerationInputDigest.startsWith('fnv1a32:'), 'flow-generation inputs have digest');
assert.equal(result.flowGenerationInputs.bathymetryArtifactDigest, result.bathymetryArtifactDigest);
assert.equal(result.flowGenerationInputs.bottomDepthBathymetryArtifactDigest, result.bathymetryArtifactDigest);
assert.ok(result.flowGenerationInputs.bottomDepthDigest.startsWith('fnv1a32:'), 'bottom-depth digest recorded');
assert.ok(result.flowGenerationInputs.wetLandMaskIdentity.wetMaskDigest.startsWith('fnv1a32:'), 'wet-mask digest recorded');
assert.ok(result.flowGenerationInputs.coastlineSummary.segmentCount >= 0, 'coastline summary preserved for flow regeneration');
assert.equal(result.flowGenerationInputs.generatedArtifacts.currentField4D, false, 'currents are not generated in ENV-ATLAS-R1.1');
assert.equal(result.flowGenerationInputs.generatedArtifacts.scalarField4D, false, 'scalars are not generated in ENV-ATLAS-R1.1');
assert.equal(result.flowGenerationInputs.dependencyPlan.currents, 'REQUIRES_REGENERATION');
assert.equal(result.flowGenerationInputs.dependencyPlan.hotspots, 'REQUIRES_REGENERATION');
assert.equal(result.flowGenerationInputs.dependencyPlan.startsDropZones, 'NEEDS_VALIDATION');

const compact = compactWindowConditionedBathymetryResult(result);
assert.equal(compact.builderDigest, result.builderDigest);
assert.equal(compact.bathymetryArtifactDigest, result.bathymetryArtifactDigest);
assert.equal(compact.flowGenerationInputs.flowGenerationInputDigest, result.flowGenerationInputs.flowGenerationInputDigest);
assert.ok(!('bathymetryField' in compact), 'compact summary omits full source grids');

assert.throws(() => buildWindowConditionedBathymetry({
  ...recipe,
  sourceResolution: { rows: 400, columns: 400, cellSizeMeters: 10 }
}, { atlas }), /exceeds maxDomainCellCount/, 'huge source grids are blocked');

const text = JSON.stringify(compact);
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text));
assert.ok(!/"operationalForecast"\s*:\s*true/.test(text));
assert.ok(!/"calibratedBathymetry"\s*:\s*true/.test(text));

console.log('smoke_window_conditioned_bathymetry_builder: ok', {
  builderDigest: result.builderDigest,
  bathymetryArtifactDigest: result.bathymetryArtifactDigest,
  status: result.validationReport.status,
  featureRecords: result.featureRecords.length
});
