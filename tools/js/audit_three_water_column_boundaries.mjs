import assert from 'node:assert/strict';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';
import { depthScienceScoreProfileMetadata } from '../../src/core/science/DepthScoringProfiles.js';

const model = makeVolumetricViewModel();
const flags = model.boundaryFlags;
assert.equal(model.waterColumnConfig?.source === 'importedLegacySurfaceFallback', false);
assert.equal(flags.usesFree3DPlanning, false);
assert.equal(flags.usesHorizontalWaypoints, true);
assert.equal(flags.usesDiveProfiles, true);
assert.equal(flags.ownsPlanning, false);
assert.equal(flags.ownsSimulationState, false);
assert.equal(flags.ownsScoring, false);
assert.equal(flags.changesCanonicalDepth, false);
assert.equal(depthScienceScoreProfileMetadata('depthAwareScienceV1').usesActualObservationDepthForScoring, true);
assert.equal(depthScienceScoreProfileMetadata('depthAwareScienceV1').awardsIntegratedValueToSurfaceSample, false);
assert.equal(flags.usesWebGPUFluid, false);
assert.equal(flags.usesNewPlanner, false);
assert.equal(flags.waterColumnConfigSource != null, true);
for (const layer of model.depthLayers) {
  assert.equal(layer.interactive === false || typeof layer.id === 'string', true);
}
console.log(JSON.stringify({ ok: true, boundaryFlags: flags }));
