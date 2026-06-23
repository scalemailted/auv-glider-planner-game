import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.sourceDepthAxis.length >= 5, 'normal production current exposes at least five source depths');
assert.ok(m.sourceWetDepthCountAtColumn >= 5, 'chosen wet column supports all operational source depths');
assert.ok(m.depthSamplesA.length >= 5, 'depth samples are wet and finite');
assert.ok(m.depthSamplesA.every((sample) => Number.isFinite(sample.uEastMetersPerSecond) && Number.isFinite(sample.vNorthMetersPerSecond)), 'depth samples are finite');
assert.ok(m.depthDistinctness >= 2, 'fixed x/y/time has materially different depth vectors');
console.log('[smoke_production_current_depth_distinctness] PASS', { depths: m.sourceDepthAxis, depthDistinctness: m.depthDistinctness, column: m.column });
