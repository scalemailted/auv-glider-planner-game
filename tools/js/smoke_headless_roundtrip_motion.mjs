import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessRoundtrip.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildBrowserHeadlessRoundtripSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const packet = JSON.parse(fs.readFileSync('tools/js/examples/sample_solver_packet.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('tools/js/examples/sample_headless_roundtrip_plan.json', 'utf8'));

const oldPlanRoundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, { seed: 'motion-roundtrip-old-plan', includeHiddenTruth: false, motionAware: true });
assert.equal(oldPlanRoundtrip.planValidation.status, 'PASS', 'roundtrip accepts old plan without explicit motion fields');
const motionPlan = { ...plan, desiredSpeedThroughWater: 1.1, diveProfileId: 'sawtoothProfile', sampleIntervalSeconds: 90, surfaceAtEnd: true, motionIntent: { note: 'smoke motion intent' } };
const roundtrip = buildHeadlessSolverPacketRoundtrip(packet, motionPlan, {
  outputDir: 'tmp/motion-roundtrip-smoke',
  includeHiddenTruth: false,
  seed: 'motion-roundtrip-smoke',
  createdAt: '2026-06-17T00:00:00.000Z',
  motionAware: true,
  motionModelId: 'depthLayerKinematic',
  gliderSpeed: 1,
  controlStepSeconds: 45,
  driftGain: 1
});

assert.equal(roundtrip.report.summary.status, 'PASS', 'motion roundtrip status passes');
assert.equal(roundtrip.report.runtime.usesMotionDynamics, true, 'report marks motion dynamics');
assert.equal(roundtrip.report.runtime.usesWebGPUFluid, false, 'report does not claim WebGPU');
assert.equal(roundtrip.report.runtime.usesMARL, false, 'report does not claim MARL/RL');
assert.equal(roundtrip.report.runtime.usesNewPlanner, false, 'report does not claim new planner');
assert.equal(roundtrip.report.runtime.usesPythonSimulator, false, 'report does not claim Python simulator');
assert.equal(roundtrip.runtimePlan.generatesRoute, false, 'runtime plan remains submitted plan');
assert.equal(Boolean(roundtrip.episode.motionTrajectory), true, 'roundtrip episode includes motion trajectory');
assert.equal(roundtrip.episode.motionTrajectory.usesWebGPUFluid, false, 'trajectory does not claim WebGPU');
assert.equal(roundtrip.report.motionSummary.present, true, 'report includes motion summary');
assert.equal(Number.isFinite(roundtrip.report.motionSummary.meanTrackError), true, 'motion summary mean track error finite');

roundtrip.episode.roundtripReport = roundtrip.report;
const combined = createHeadlessCombinedBundle(roundtrip.episode, { includeHiddenTruth: false, combinedJson: true, roundtripReport: roundtrip.report });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: combined }]);
const artifact = buildBrowserHeadlessRoundtripSummaryArtifact(bundle);
assert.equal(artifact.usesMotionDynamics, true, 'browser summary marks motion dynamics');
assert.equal(artifact.usesWebGPUFluid, false, 'browser summary does not claim WebGPU');
assert.equal(artifact.motionSummary.present, true, 'browser summary includes motion summary');
assert.equal(JSON.stringify(artifact).includes('T_hiddenTruth'), false, 'browser summary omits hidden truth');

console.log('Headless motion roundtrip smoke passed', {
  score: roundtrip.report.summary.finalScore,
  meanTrackError: roundtrip.report.motionSummary.meanTrackError
});
