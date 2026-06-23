import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics, distinctVectors } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
const repeat = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.sourceTimeAxis.length >= 4, 'normal production current exposes at least four source times');
assert.ok(m.timeDistinctness >= 2, 'fixed x/y/depth current changes over canonical source times');
assert.equal(distinctVectors(repeat.timeSamples), m.timeDistinctness, 'repeated time sampling is deterministic');
assert.ok(Number.isFinite(m.midpointSample.timeInterpolationFraction), 'midpoint sample exposes a time interpolation fraction');
console.log('[smoke_production_current_time_distinctness] PASS', { times: m.sourceTimeAxis, timeDistinctness: m.timeDistinctness, midpoint: m.midpointSample.timeInterpolationFraction });
