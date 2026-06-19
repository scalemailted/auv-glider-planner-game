import assert from 'node:assert/strict';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const viewModel = makeVolumetricViewModel();
const observation = viewModel.observations[0];
assert.equal(observation.depthLayerId, 'thermocline');
assert.equal(observation.depthMeters, 35);
assert.equal(observation.hiddenTruthIncluded, false);
assert.equal(observation.sourceVisibility, 'publicResult');
const pose = viewModel.gliderPoses[0];
assert.equal(Number.isFinite(Number(pose.depthMeters)), true);
console.log(JSON.stringify({ ok: true, observation, poseDepthMeters: pose.depthMeters }));
