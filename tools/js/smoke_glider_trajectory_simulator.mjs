import assert from 'node:assert/strict';

import { createHeadlessGrid } from '../../src/core/headless/runtime/HeadlessGrid.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { simulateGliderMotionTrajectory, trajectoryMotionSummary, validateMotionTrajectory } from '../../src/core/motion/GliderTrajectorySimulator.js';

const grid = createHeadlessGrid({ width: 12, height: 8, depthLayers: ['surface', 'thermocline', 'deep'] });
const fieldPack = createHeadlessFieldPack({ grid, seed: 'motion-trajectory-smoke' });
const trajectory = simulateGliderMotionTrajectory({
  fieldPack,
  glider: { id: 'glider_01', start: { x: 1, y: 1 }, energyBudget: 50 },
  plan: {
    planId: 'trajectory-smoke-plan',
    waypoints: [
      { x: 1, y: 1, depthLayerId: 'surface' },
      { x: 6, y: 2, depthLayerId: 'thermocline' },
      { x: 10, y: 6, depthLayerId: 'deep' }
    ],
    desiredSpeedThroughWater: 1,
    sampleIntervalSeconds: 60
  },
  motionConfig: { motionModelId: 'depthLayerKinematic', controlStepSeconds: 30, driftGain: 1 },
  options: { maxSteps: 80, durationSeconds: 1800, seed: 'motion-trajectory-smoke' }
});
assert.equal(trajectory.type, 'anchor.motion.trajectory', 'trajectory type');
assert.equal(trajectory.generatedRoute, false, 'trajectory does not generate route');
assert.equal(trajectory.usesNewPlanner, false, 'trajectory does not claim planner');
assert.equal(trajectory.usesWebGPUFluid, false, 'trajectory does not claim WebGPU');
assert.equal(trajectory.usesMARL, false, 'trajectory does not claim MARL/RL');
assert.equal(trajectory.realizedTrack.length > 0, true, 'realized track generated');
assert.equal(trajectory.sampledObservations.length > 0, true, 'realized trajectory samples observations');
assert.equal(Number.isFinite(trajectory.plannedVsRealized.plannedDistance), true, 'planned distance finite');
assert.equal(Number.isFinite(trajectory.plannedVsRealized.realizedDistance), true, 'realized distance finite');
assert.equal(Number.isFinite(trajectory.plannedVsRealized.meanTrackError), true, 'track error diagnostic finite');
assert.equal(Number.isFinite(trajectory.plannedVsRealized.energyUsed), true, 'energy diagnostic finite');
assert.ok(trajectory.notA.includes('not a route planner'), 'trajectory notA includes no planner');
assert.ok(trajectory.notA.includes('not WebGPU'), 'trajectory notA includes no WebGPU');
assert.ok(trajectory.notA.includes('not MARL/RL'), 'trajectory notA includes no MARL/RL');
assert.equal(validateMotionTrajectory(trajectory).status, 'PASS', 'trajectory validates');
const summary = trajectoryMotionSummary(trajectory);
assert.equal(summary.present, true, 'summary marks trajectory present');
assert.equal(Number.isFinite(summary.meanTrackError), true, 'summary mean track error finite');

console.log('Glider trajectory simulator smoke passed', { points: trajectory.realizedTrack.length, observations: trajectory.sampledObservations.length });
