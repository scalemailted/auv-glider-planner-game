import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig, headlessRuntimeConfigSummary } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { validateHeadlessBundle } from '../../src/core/headless/HeadlessBundleValidation.js';

const config = createDefaultHeadlessRuntimeConfig({
  seed: 'motion-runtime-smoke',
  width: 10,
  height: 8,
  motionAware: true,
  motionModelId: 'depthLayerKinematic',
  gliderSpeed: 1,
  controlStepSeconds: 45,
  headingRateLimitDegreesPerSecond: 10,
  driftGain: 1
});
const summary = headlessRuntimeConfigSummary(config);
assert.equal(summary.motionAware, true, 'runtime config is motion-aware');
assert.equal(summary.motion.motionAware, true, 'runtime summary marks motion-aware mode');
assert.equal(summary.motion.usesWebGPUFluid, false, 'runtime summary does not claim WebGPU');

const episode = runHeadlessMission(config);
assert.equal(Boolean(episode.motionTrajectory), true, 'episode includes motion trajectory');
assert.equal(episode.diagnostics.usesMotionDynamics, true, 'episode diagnostics mark motion dynamics');
assert.equal(episode.diagnostics.usesWebGPUFluid, false, 'episode diagnostics do not claim WebGPU');
assert.equal(episode.motionTrajectory.generatedRoute, false, 'motion trajectory executes submitted/runtime route only');
assert.equal(episode.motionTrajectory.usesNewPlanner, false, 'motion trajectory does not add a planner');
assert.equal(episode.motionTrajectory.sampledObservations.length, episode.observations.length, 'observations follow realized motion trajectory');
assert.equal(episode.motionTrajectory.realizedTrack.length, episode.tracks.length, 'tracks follow realized motion trajectory');

const bundlePayload = createHeadlessCombinedBundle(episode, { includeHiddenTruth: false, combinedJson: true });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: bundlePayload }]);
const validation = validateHeadlessBundle(bundle);
assert.equal(validation.status, 'PASS', `bundle validates: ${validation.failures.join('; ')}`);
assert.equal(Boolean(bundle.motionTrajectory), true, 'loader preserves motion trajectory');
assert.equal(Boolean(bundle.motionDiagnostics), true, 'loader preserves motion diagnostics');
assert.equal(Boolean(bundle.waterColumnSummary), true, 'waterColumnSummary still present');
assert.equal(bundle.motionDiagnostics.usesWebGPUFluid, false, 'motion diagnostics do not claim WebGPU');
assert.equal(bundle.motionDiagnostics.usesMARL, false, 'motion diagnostics do not claim MARL/RL');
assert.equal(JSON.stringify(bundle.visibleFields).includes('T_hiddenTruth'), false, 'public visible fields omit hidden truth');
assert.equal(JSON.stringify(bundle.motionTrajectory).includes('T_hiddenTruth'), false, 'public motion trajectory omits hidden truth field ids');
assert.equal(JSON.stringify(bundle.motionTrajectory).includes('truthValue'), false, 'public motion trajectory omits truth values');

console.log('Headless motion runtime smoke passed', {
  observations: episode.observations.length,
  tracks: episode.tracks.length,
  motionModelId: episode.motionTrajectory.motionModelId
});
