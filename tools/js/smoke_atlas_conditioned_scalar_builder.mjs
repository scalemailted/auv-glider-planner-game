import assert from 'node:assert/strict';
import {
  createRegionalMissionRecipe,
  createSyntheticOceanAtlas,
  normalizeOperationalWindow
} from '../../src/core/editor/SyntheticOceanAtlas.js';
import { buildWindowConditionedBathymetry } from '../../src/core/generation/WindowConditionedBathymetryBuilder.js';
import { buildAtlasConditionedCurrentArtifact } from '../../packages/currents/src/index.js';
import {
  ATLAS_CONDITIONED_SCALAR_BUILDER_VERSION,
  buildAtlasConditionedScalarArtifact
} from '../../packages/scalar-processes/src/index.js';

const atlas = createSyntheticOceanAtlas({
  presetId: 'riverDeltaShelfWorld',
  seed: 'atlas-scalar-builder-smoke'
});
const window = normalizeOperationalWindow({ windowPresetId: 'riverMouthPlumeSurvey' }, atlas);
const recipe = createRegionalMissionRecipe({
  atlas,
  selectedWindow: window,
  seed: 'atlas-scalar-builder-smoke:river'
});
const bathymetry = buildWindowConditionedBathymetry(recipe, { atlas });
const current = buildAtlasConditionedCurrentArtifact({
  regionalMissionRecipe: recipe,
  flowGenerationInputs: bathymetry.flowGenerationInputs,
  bathymetryArtifact: bathymetry.bathymetryArtifact,
  featureRecords: bathymetry.featureRecords,
  seed: 'atlas-scalar-builder-smoke:current'
});
const result = buildAtlasConditionedScalarArtifact({
  regionalMissionRecipe: recipe,
  flowGenerationInputs: bathymetry.flowGenerationInputs,
  bathymetryArtifact: bathymetry.bathymetryArtifact,
  featureRecords: bathymetry.featureRecords,
  currentArtifact: current.currentArtifact,
  currentArtifactDigest: current.currentArtifactDigest,
  seed: 'atlas-scalar-builder-smoke:scalar'
});
const repeat = buildAtlasConditionedScalarArtifact({
  regionalMissionRecipe: recipe,
  flowGenerationInputs: bathymetry.flowGenerationInputs,
  bathymetryArtifact: bathymetry.bathymetryArtifact,
  featureRecords: bathymetry.featureRecords,
  currentArtifact: current.currentArtifact,
  currentArtifactDigest: current.currentArtifactDigest,
  seed: 'atlas-scalar-builder-smoke:scalar'
});

assert.equal(result.version, ATLAS_CONDITIONED_SCALAR_BUILDER_VERSION);
assert.equal(result.scalarArtifactDigest, repeat.scalarArtifactDigest, 'scalar generation is deterministic for same inputs');
assert.equal(result.validation.valid, true, result.validation.errors.join('\n'));
assert.ok(result.scalarArtifactDigest.startsWith('fnv1a32:'));
assert.ok(result.hotspotArtifactDigest.startsWith('fnv1a32:'));
assert.equal(result.scalarArtifact.sourceMetadata.sourceTier, 'scientificallyConstrainedSynthetic');
assert.equal(result.scalarArtifact.sourceMetadata.sourceType, 'atlas-conditioned-synthetic-scalar');
assert.equal(result.scalarArtifact.sourceMetadata.publicSafe, true);
assert.equal(result.scalarArtifact.sourceMetadata.hiddenTruthIncluded, false);
assert.equal(result.scalarArtifact.sourceMetadata.calibratedOceanForecast, false);
assert.equal(result.scalarArtifact.sourceMetadata.calibratedBiogeochemicalForecast, false);
assert.equal(result.scalarArtifact.sourceMetadata.usesRealHycom, false);
assert.equal(result.scalarArtifact.sourceMetadata.usesRealMarineCopernicus, false);
assert.equal(result.claimBoundary.hiddenTruthExposed, false);
assert.equal(result.claimBoundary.simulationChanged, false);
assert.equal(result.claimBoundary.scoringChanged, false);

const diagnostics = result.scalarDiagnostics;
assert.ok(Number.isFinite(diagnostics.scalarStatistics.mean), 'finite scalar mean');
assert.ok(Number.isFinite(diagnostics.scalarStatistics.max), 'finite scalar maximum');
assert.equal(diagnostics.hiddenTruthIncluded, false);
assert.equal(diagnostics.publicSafe, true);
assert.equal(diagnostics.calibratedOceanForecast, false);
assert.equal(diagnostics.calibratedBiogeochemicalForecast, false);
assert.equal(diagnostics.materiallyDepthVarying, true, 'scalar field has material depth structure');
assert.equal(diagnostics.temporallyVarying, true, 'scalar field evolves over mission time');
assert.ok(result.hotspotArtifact.hotspots.length > 0, 'hotspot candidates generated');
assert.ok(result.hotspotArtifact.hotspots.every((entry) => entry.validationStatus === 'NEEDS_VALIDATION'));
assert.ok(result.componentPlan.componentMetadata.length >= 1, 'scalar component plan records regime components');

const text = JSON.stringify({
  scalarFieldSummary: result.scalarFieldSummary,
  sourceMetadata: result.scalarArtifact.sourceMetadata,
  hotspotArtifact: result.hotspotArtifact,
  claimBoundary: result.claimBoundary
});
assert.ok(!/"usesRealHycom"\s*:\s*true/.test(text));
assert.ok(!/"usesRealMarineCopernicus"\s*:\s*true/.test(text));
assert.ok(!/"calibratedOceanForecast"\s*:\s*true/.test(text));
assert.ok(!/"calibratedBiogeochemicalForecast"\s*:\s*true/.test(text));
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text));

console.log('smoke_atlas_conditioned_scalar_builder: ok', {
  scalarArtifactDigest: result.scalarArtifactDigest,
  hotspotArtifactDigest: result.hotspotArtifactDigest,
  status: result.validation.status,
  hotspotCount: result.hotspotArtifact.hotspots.length,
  scalarMean: diagnostics.scalarStatistics.mean
});
