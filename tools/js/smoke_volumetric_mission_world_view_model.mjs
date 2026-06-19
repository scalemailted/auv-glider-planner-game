import assert from 'node:assert/strict';
import { validateVolumetricMissionWorldViewModel, volumetricDisplayStateDigest, waterColumnRenderDebugPayload } from '../../src/core/rendering/VolumetricMissionWorldViewModel.js';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const model = makeVolumetricViewModel();
const validation = validateVolumetricMissionWorldViewModel(model);
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(model.boundaryFlags.usesFree3DPlanning, false);
assert.equal(model.boundaryFlags.usesHorizontalWaypoints, true);
assert.equal(model.predictedDiveTrajectories.length > 0, true);
assert.equal(model.selectedDepthCell.depthLayerId, 'thermocline');
const debug = waterColumnRenderDebugPayload(model, { currentVectorObjectCount: 3, slabObjectCount: 4, slabTextureCount: 4, slabLabelCount: 0 });
assert.equal(debug.ownsPlanning, false);
assert.equal(debug.usesDiveProfiles, true);
assert.equal(typeof volumetricDisplayStateDigest(model), 'string');
console.log(JSON.stringify({ ok: true, debug }));
