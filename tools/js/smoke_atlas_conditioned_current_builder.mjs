import assert from 'node:assert/strict';
import {
  createRegionalMissionRecipe,
  createSyntheticOceanAtlas,
  normalizeOperationalWindow
} from '../../src/core/editor/SyntheticOceanAtlas.js';
import { buildWindowConditionedBathymetry } from '../../src/core/generation/WindowConditionedBathymetryBuilder.js';
import {
  ATLAS_CONDITIONED_CURRENT_BUILDER_VERSION,
  buildAtlasConditionedCurrentArtifact
} from '../../packages/currents/src/index.js';

const atlas = createSyntheticOceanAtlas({
  presetId: 'syntheticGulfWorld',
  seed: 'atlas-current-builder-smoke'
});
const window = normalizeOperationalWindow({ windowPresetId: 'semiEnclosedGulfSurvey' }, atlas);
const recipe = createRegionalMissionRecipe({
  atlas,
  selectedWindow: window,
  seed: 'atlas-current-builder-smoke:gulf'
});
const bathymetry = buildWindowConditionedBathymetry(recipe, { atlas });

const result = buildAtlasConditionedCurrentArtifact({
  regionalMissionRecipe: recipe,
  flowGenerationInputs: bathymetry.flowGenerationInputs,
  bathymetryArtifact: bathymetry.bathymetryArtifact,
  featureRecords: bathymetry.featureRecords,
  seed: 'atlas-current-builder-smoke:current'
});
const repeat = buildAtlasConditionedCurrentArtifact({
  regionalMissionRecipe: recipe,
  flowGenerationInputs: bathymetry.flowGenerationInputs,
  bathymetryArtifact: bathymetry.bathymetryArtifact,
  featureRecords: bathymetry.featureRecords,
  seed: 'atlas-current-builder-smoke:current'
});
const changed = buildAtlasConditionedCurrentArtifact({
  regionalMissionRecipe: recipe,
  flowGenerationInputs: bathymetry.flowGenerationInputs,
  bathymetryArtifact: bathymetry.bathymetryArtifact,
  featureRecords: bathymetry.featureRecords,
  seed: 'atlas-current-builder-smoke:changed'
});

assert.equal(result.version, ATLAS_CONDITIONED_CURRENT_BUILDER_VERSION);
assert.equal(result.currentArtifactDigest, repeat.currentArtifactDigest, 'current generation is deterministic for same recipe/seed');
assert.notEqual(result.currentArtifactDigest, changed.currentArtifactDigest, 'different seed changes current artifact digest');
assert.equal(result.validation.valid, true, result.validation.errors.join('\n'));
assert.ok(result.currentArtifactDigest.startsWith('fnv1a32:'));
assert.equal(result.currentArtifact.sourceMetadata.sourceTier, 'scientificallyConstrainedSynthetic');
assert.equal(result.currentArtifact.sourceMetadata.sourceType, 'atlas-conditioned-synthetic-current');
assert.equal(result.currentArtifact.sourceMetadata.equationFamily, 'atlasConditionedReducedOrderStreamfunctionSyntheticV1');
assert.equal(result.currentArtifact.sourceMetadata.generatorBackend, 'atlasConditionedCurrentBuilder');
assert.equal(result.currentArtifact.sourceMetadata.generatorVersion, ATLAS_CONDITIONED_CURRENT_BUILDER_VERSION);
assert.equal(result.currentArtifact.sourceMetadata.usesBathymetryMask, true);
assert.ok(result.componentPlan.currentRegimeHints.length > 0, 'current regime hints are recorded');
assert.ok(result.currentArtifact.sourceMetadata.components.length > 0, 'component metadata is retained');
assert.equal(result.currentArtifact.sourceMetadata.usesRealHycom, false);
assert.equal(result.currentArtifact.sourceMetadata.usesRealMarineCopernicus, false);
assert.equal(result.currentArtifact.sourceMetadata.calibratedForecast, false);
assert.equal(result.claimBoundary.hiddenTruthExposed, false);
assert.equal(result.claimBoundary.simulationChanged, false);
assert.equal(result.claimBoundary.scoringChanged, false);

const diagnostics = result.currentDiagnostics;
assert.equal(diagnostics.landVectorCount, 0, 'no nonzero vectors on land');
assert.equal(diagnostics.belowBottomVectorCount, 0, 'no nonzero vectors below seabed');
assert.equal(diagnostics.invalidVectorCount, 0, 'all vectors finite');
assert.ok(Number.isFinite(diagnostics.speedMean), 'finite speed mean');
assert.ok(Number.isFinite(diagnostics.divergenceRms), 'finite divergence RMS');
assert.ok(Number.isFinite(diagnostics.coastlineNormalSpeedRms), 'finite coastline leakage diagnostic');
assert.ok(Number.isFinite(diagnostics.verticalShearRms), 'finite vertical shear diagnostic');
assert.ok(diagnostics.depthLayerDigestCount >= 2, 'depth layers are not copied as one static slab');
assert.ok(diagnostics.temporalChangeRms > 0, 'current evolves over mission time');
assert.ok(result.componentPlan.enabledComponents.length >= 2, 'component plan has multiple reduced-order pieces');
assert.ok(result.componentPlan.componentMetadata.every((entry) => entry.syntheticNotCalibrated === true));

const text = JSON.stringify({
  currentFieldSummary: result.currentFieldSummary,
  sourceMetadata: result.currentArtifact.sourceMetadata,
  claimBoundary: result.claimBoundary
});
assert.ok(!/"usesRealHycom"\s*:\s*true/.test(text));
assert.ok(!/"usesRealMarineCopernicus"\s*:\s*true/.test(text));
assert.ok(!/"calibratedForecast"\s*:\s*true/.test(text));
assert.ok(!/"operationalForecast"\s*:\s*true/.test(text));
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text));

console.log('smoke_atlas_conditioned_current_builder: ok', {
  currentArtifactDigest: result.currentArtifactDigest,
  status: result.validation.status,
  components: result.componentPlan.enabledComponents,
  speedMean: diagnostics.speedMean,
  divergenceRms: diagnostics.divergenceRms
});
