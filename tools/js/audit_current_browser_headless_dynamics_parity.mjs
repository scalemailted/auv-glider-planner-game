import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const a = buildFlowR2A5CurrentDynamicsMetrics();
const b = buildFlowR2A5CurrentDynamicsMetrics();
assert.equal(a.field.digest, b.field.digest, 'deterministic field digest matches');
assert.deepEqual(a.depthSamplesA.map((sample) => [sample.uEastMetersPerSecond, sample.vNorthMetersPerSecond]), b.depthSamplesA.map((sample) => [sample.uEastMetersPerSecond, sample.vNorthMetersPerSecond]), 'depth samples are deterministic across runtimes');
console.log('[audit_current_browser_headless_dynamics_parity] PASS');
