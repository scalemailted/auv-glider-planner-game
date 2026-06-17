import assert from 'node:assert/strict';
import {
  BATHYMETRY_FEATURE_IDS,
  BATHYMETRY_VIEW_MODE_IDS,
  createBathymetryConfig,
  validateBathymetryConfig,
  bathymetryConfigSummary
} from '../../src/core/science/BathymetrySchema.js';

for (const id of ['continentalShelf', 'shelfBreak', 'submarineCanyon', 'trench', 'seamount', 'ridge', 'abyssalPlain', 'coastalBay', 'islandArc', 'riverMouth', 'estuaryChannel', 'bottomHazard']) {
  assert.ok(BATHYMETRY_FEATURE_IDS.includes(id), `feature ${id} exists`);
}
for (const mode of ['topDown', 'obliqueBathymetry', 'layerStack', 'surfaceAndBottom', 'missionProfile', 'replayView']) {
  assert.ok(BATHYMETRY_VIEW_MODE_IDS.includes(mode), `view mode ${mode} exists`);
}
const config = createBathymetryConfig({ width: 16, height: 12, maxDepthMeters: 220, defaultViewMode: 'layerStack' });
const validation = validateBathymetryConfig(config);
assert.equal(validation.valid, true, validation.errors.join('; '));
const notA = config.notA.join(' ').toLowerCase();
assert.match(notA, /not full 3d route planning/);
assert.match(notA, /not hydrodynamic current solver/);
assert.match(notA, /not marl\/rl/);
const summary = bathymetryConfigSummary(config);
assert.equal(summary.usesFull3DPlanning, false);
assert.equal(summary.usesHydrodynamicSolver, false);
assert.equal(summary.usesTerrainFlowAsOceanCurrent, false);
console.log('smoke_bathymetry_schema: ok');