import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { makeFixtureCurrentField } from './flow_r2a1_test_helpers.mjs';
import { createOceanCurrentSampler, getOceanCurrentSamplerRuntimeCounters, resetOceanCurrentSamplerRuntimeCounters } from '../../src/core/science/OceanCurrentFieldSampler.js';
import { createOceanCurrentField4D, getOceanCurrentFieldRuntimeCounters, resetOceanCurrentFieldRuntimeCounters } from '../../src/core/science/OceanCurrentField4D.js';

const field = makeFixtureCurrentField();
const sampler = createOceanCurrentSampler(field);
resetOceanCurrentFieldRuntimeCounters();
resetOceanCurrentSamplerRuntimeCounters();
let last = null;
const start = performance.now();
for (let index = 0; index < 100000; index += 1) {
  last = sampler.sample({ eastMeters: (index % 7) + 0.25, northMeters: (index % 5) + 0.5, depthMeters: [0, 15, 35, 75, 150][index % 5], timeSeconds: (index % 1800), interpolation: 'linear4d' });
}
const elapsedMs = performance.now() - start;
const fieldStats = getOceanCurrentFieldRuntimeCounters();
const samplerStats = getOceanCurrentSamplerRuntimeCounters();
assert.equal(fieldStats.normalizeCount, 0, 'sampling does not normalize field');
assert.equal(fieldStats.digestCount, 0, 'sampling does not digest field');
assert.equal(samplerStats.sampleCallCount, 100000, 'sample counter tracks hot-loop calls');
assert.equal(Number.isFinite(last.uEastMetersPerSecond), true);
assert.equal(Number.isFinite(last.vNorthMetersPerSecond), true);
assert.ok(samplerStats.bracketLookupCount <= 100000 * 4, 'bounded lookup count per sample');
const singleAxisField = createOceanCurrentField4D({
  id: 'single-axis-current-smoke',
  grid: { width: 1, height: 1 },
  eastAxisMeters: [0],
  northAxisMeters: [0],
  depthAxisMeters: [0],
  timeAxisSeconds: [0],
  uEastMetersPerSecond: [[[[0.12]]]],
  vNorthMetersPerSecond: [[[[-0.03]]]]
});
const singleAxisSample = createOceanCurrentSampler(singleAxisField).sample({ eastMeters: 0, northMeters: 0, depthMeters: 0, timeSeconds: 0, interpolation: 'nearest' });
assert.equal(Number.isFinite(singleAxisSample.uEastMetersPerSecond), true, 'single-point axes sample without recursion');
assert.equal(Number.isFinite(singleAxisSample.vNorthMetersPerSecond), true, 'single-point axes sample without recursion');
console.log('[smoke_current_sampler_hot_path] PASS', { elapsedMs: Number(elapsedMs.toFixed(3)), samplerStats });