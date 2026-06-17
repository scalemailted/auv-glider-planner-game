import assert from 'node:assert/strict';

import { createHeadlessGrid } from '../../src/core/headless/runtime/HeadlessGrid.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import {
  motionEnvironmentSummary,
  sampleBathymetryForMotion,
  sampleCurrentVectorForMotion,
  sampleDepthAccessibilityForMotion,
  sampleHazardForMotion,
  sampleMotionEnvironment
} from '../../src/core/motion/MotionEnvironmentSampler.js';

const grid = createHeadlessGrid({ width: 6, height: 5, depthLayers: ['surface', 'thermocline', 'deep'] });
const fieldPack = createHeadlessFieldPack({ grid, seed: 'motion-env-smoke' });
const state = { x: 2.1, y: 2.3, zIndex: 1, depthLayerId: 'thermocline', depthMeters: 25 };
const originalStateJson = JSON.stringify(state);
const bathymetry = Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 80));
const current = sampleCurrentVectorForMotion(fieldPack, state, { currentStrength: 1.5 });
assert.equal(Number.isFinite(current.u), true, 'u current finite');
assert.equal(Number.isFinite(current.v), true, 'v current finite');
assert.equal(Number.isFinite(current.w), true, 'w current finite');
assert.equal(Number.isFinite(sampleHazardForMotion(fieldPack, state)), true, 'hazard finite');
assert.equal(sampleBathymetryForMotion(bathymetry, state), 80, 'bathymetry samples nearest cell');
assert.equal(sampleDepthAccessibilityForMotion(fieldPack, state).depthAccessible, true, 'default constraint is accessible');

const sample = sampleMotionEnvironment({ fieldPack, bathymetry, state, timeSeconds: 120, options: { currentStrength: 1.5 } });
assert.equal(sample.type, 'anchor.motion.environment-sample', 'environment sample type');
assert.equal(sample.depthLayerId, 'thermocline', 'depth layer preserved');
assert.equal(sample.depthAccessible, true, 'sample depth accessible');
assert.equal(Number.isFinite(sample.currentSpeed), true, 'current speed finite');
const missingBathymetrySample = sampleMotionEnvironment({ fieldPack, state, timeSeconds: 180 });
assert.ok(missingBathymetrySample.warnings.includes('Bathymetry not provided; bottom clearance is unavailable.'), 'missing bathymetry warns without failing');
assert.equal(JSON.stringify(state), originalStateJson, 'sampler does not mutate input state');
const summary = motionEnvironmentSummary([sample, missingBathymetrySample]);
assert.equal(summary.sampleCount, 2, 'summary counts samples');
assert.equal(summary.notA.includes('not WebGPU'), true, 'summary states no WebGPU');

console.log('Motion environment sampler smoke passed', { currentSpeed: sample.currentSpeed });
