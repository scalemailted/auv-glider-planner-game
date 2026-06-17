import assert from 'node:assert/strict';

import {
  GLIDER_MOTION_MODEL_IDS,
  GLIDER_CONTROL_MODE_IDS,
  createGliderControlCommand,
  createGliderMotionConfig,
  createGliderMotionState,
  gliderMotionConfigSummary,
  normalizeGliderControlModeId,
  normalizeGliderMotionModelId,
  validateGliderControlCommand,
  validateGliderMotionConfig,
  validateGliderMotionState
} from '../../src/core/motion/GliderMotionSchema.js';

assert.ok(GLIDER_MOTION_MODEL_IDS.includes('depthLayerKinematic'), 'depth-layer motion model id exists');
assert.ok(GLIDER_MOTION_MODEL_IDS.includes('webgpuFluidFuture'), 'future WebGPU contract id exists');
assert.ok(GLIDER_CONTROL_MODE_IDS.includes('waypointTracking'), 'waypoint tracking control id exists');
assert.equal(normalizeGliderMotionModelId('shear'), 'currentShearKinematic', 'motion model aliases normalize');
assert.equal(normalizeGliderControlModeId('surface'), 'surfaceAndReport', 'control aliases normalize');

const config = createGliderMotionConfig({ enabled: true, motionModelId: 'webgpuFluidFuture', gliderSpeed: 1.2 });
assert.equal(config.motionAware, true, 'motion config can be enabled');
assert.equal(config.webgpuFluidFutureContractOnly, true, 'future WebGPU model remains contract-only');
assert.equal(config.usesWebGPUFluid, false, 'motion config does not claim WebGPU runtime use');
assert.equal(config.usesNewPlanner, false, 'motion config does not claim route planning');
assert.equal(config.usesMARL, false, 'motion config does not claim MARL/RL');
assert.equal(validateGliderMotionConfig(config).status, 'PASS', 'config validates');

const state = createGliderMotionState({ x: 2, y: 3, energyBudget: 50, energyRemaining: 40 });
assert.equal(validateGliderMotionState(state).status, 'PASS', 'state validates');
assert.equal(state.batteryFraction, 0.8, 'battery fraction is normalized');

const command = createGliderControlCommand({ desiredSpeedThroughWater: 0.8, controlMode: 'waypoint' });
assert.equal(command.controlMode, 'waypointTracking', 'command control mode normalizes');
assert.equal(validateGliderControlCommand(command).status, 'PASS', 'control command validates');

const summary = gliderMotionConfigSummary(config);
assert.equal(summary.usesWebGPUFluid, false, 'summary preserves WebGPU boundary');
assert.equal(summary.usesNewPlanner, false, 'summary preserves planner boundary');

console.log('Glider motion schema smoke passed', { modelCount: GLIDER_MOTION_MODEL_IDS.length });
