import assert from 'node:assert/strict';
import {
  createRegionalMissionRecipe,
  createSyntheticOceanAtlas,
  normalizeOperationalWindow
} from '../../src/core/editor/SyntheticOceanAtlas.js';
import { buildWindowConditionedBathymetry } from '../../src/core/generation/WindowConditionedBathymetryBuilder.js';

const cases = [
  ['coastal shelf', 'shelfToBasinWorld', 'coastalShelfSurvey'],
  ['semi-enclosed gulf', 'syntheticGulfWorld', 'semiEnclosedGulfSurvey'],
  ['island chain', 'islandChainWorld', 'islandChainSurvey'],
  ['shelf break/canyon', 'shelfToBasinWorld', 'shelfBreakCanyonSurvey'],
  ['river mouth', 'riverDeltaShelfWorld', 'riverMouthPlumeSurvey'],
  ['strait/sill', 'straitSillWorld', 'straitSillSurvey'],
  ['open ocean eddy', 'openOceanEddyWorld', 'openOceanEddySurvey']
];

const rows = [];
for (const [label, presetId, windowPresetId] of cases) {
  const atlas = createSyntheticOceanAtlas({ presetId, seed: `usefulness:${presetId}` });
  const window = normalizeOperationalWindow({ windowPresetId }, atlas);
  const recipe = createRegionalMissionRecipe({
    atlas,
    selectedWindow: window,
    seed: `usefulness:${presetId}:${windowPresetId}`
  });
  const result = buildWindowConditionedBathymetry(recipe, { atlas });
  const metrics = result.validationReport.metrics;
  assert.notEqual(result.validationReport.status, 'FAIL', `${label} should not hard-fail: ${result.validationReport.errors.join('; ')}`);
  assert.ok(metrics.connectedWetFraction >= 0.35, `${label} has enough connected wet area for inspection`);
  assert.ok(metrics.featureDiversity > 0, `${label} has nonzero feature diversity`);
  assert.ok(metrics.multiGliderSuitability?.status, `${label} records mission-suitability status`);
  assert.equal(result.provenance.hiddenTruthExposed, false, `${label} exposes no hidden truth`);
  rows.push({
    label,
    presetId,
    windowPresetId,
    status: result.validationReport.status,
    connectedWetFraction: metrics.connectedWetFraction,
    featureDiversity: metrics.featureDiversity,
    features: result.featureRecords.map((record) => record.type).join('|'),
    builderDigest: result.builderDigest
  });
}

assert.ok(rows.some((row) => row.features.includes('submarineCanyon')), 'audit includes canyon-capable case');
assert.ok(rows.some((row) => row.features.includes('riverDelta')), 'audit includes river/delta case');
assert.ok(rows.some((row) => row.features.includes('ridgeSill')), 'audit includes strait/sill case');
assert.ok(rows.some((row) => row.features.includes('islandSeamount')), 'audit includes island/seamount case');

console.log('audit_synthetic_atlas_bathymetry_usefulness: ok', rows);
