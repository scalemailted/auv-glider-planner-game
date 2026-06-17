import assert from 'node:assert/strict';

import { createGliderControlCommand, createGliderMotionConfig, createGliderMotionState } from '../../src/core/motion/GliderMotionSchema.js';
import { applyHeadingRateLimit, computeDesiredHeadingToWaypoint, computeTrackError, computeRealizedVelocity, computeThroughWaterVelocity, stepGliderMotion } from '../../src/core/motion/GliderDynamicsModel.js';

const config = createGliderMotionConfig({ enabled: true, gliderSpeed: 1, controlStepSeconds: 30, headingRateLimitDegreesPerSecond: 20 });
const state = createGliderMotionState({ x: 1, y: 1, headingRadians: 0, energyBudget: 20 });
const target = { x: 5, y: 1, depthLayerId: 'surface' };
const command = createGliderControlCommand({
  targetWaypoint: target,
  desiredHeadingRadians: computeDesiredHeadingToWaypoint(state, target),
  desiredSpeedThroughWater: 1,
  sampleEnabled: true
});
const stepped = stepGliderMotion({
  state,
  control: command,
  environment: { currentVector: { u: 0.6, v: 0, w: 0 }, hazard: 0, constraint: 0, depthAccessible: true },
  config: { ...config, grid: { width: 12, height: 8 } },
  dt: 30
});

const throughWaterVelocity = computeThroughWaterVelocity(state, command, config);
const realizedVelocity = computeRealizedVelocity({ throughWaterVelocity, currentVector: { u: 0.6, v: 0.4, w: 0 }, driftGain: 1 });
const limitedHeading = applyHeadingRateLimit(0, Math.PI, Math.PI / 18, 1);
assert.equal(stepped.state.x > state.x, true, 'glider moves forward');
assert.equal(stepped.state.energyRemaining < state.energyRemaining, true, 'motion consumes energy');
assert.equal(realizedVelocity.y !== throughWaterVelocity.y, true, 'cross-current changes realized velocity');
assert.equal(Math.abs(limitedHeading) < Math.PI, true, 'heading rate limit limits a large desired turn');
assert.equal(Number.isFinite(stepped.trackPoint.currentAssist), true, 'current assist finite');
assert.equal(Number.isFinite(computeTrackError(stepped.state, { start: state, end: target })), true, 'track error finite');
const constrained = stepGliderMotion({ state, control: command, environment: { currentVector: { u: 0, v: 0, w: 0 }, hazard: 0, constraint: 1, bottomClearanceMeters: 1, waterColumnLayer: { id: 'surface' } }, config: { ...config, grid: { width: 12, height: 8 } }, dt: 30 });
assert.ok(constrained.warnings.some((warning) => warning.includes('Constraint mask')), 'constraint warning is possible');
assert.ok(constrained.warnings.some((warning) => warning.includes('Bottom clearance')), 'bottom clearance warning is possible');
assert.equal(stepped.trackPoint.usesWebGPUFluid, undefined, 'track point does not claim WebGPU');

console.log('Glider dynamics model smoke passed', { x: stepped.state.x, energy: stepped.state.energyRemaining });
