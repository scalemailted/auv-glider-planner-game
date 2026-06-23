import assert from 'node:assert/strict';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const field = createBathymetryConditionedCurrentField({ grid: { width: 10, height: 7 }, timeAxisSeconds: [0, 600, 1200, 1800], landMask: Array.from({ length: 7 }, () => Array.from({ length: 10 }, () => false)) });
const depthSamples = [0, 10, 35, 75, 150].map((depthMeters) => sampleOceanCurrent({ field, eastMeters: 5, northMeters: 3, depthMeters, timeSeconds: 600 }));
const timeSamples = [0, 600, 1200, 1800].map((timeSeconds) => sampleOceanCurrent({ field, eastMeters: 5, northMeters: 3, depthMeters: 35, timeSeconds }));
const depthSignatures = new Set(depthSamples.map((sample) => `${sample.uEastMetersPerSecond.toFixed(4)},${sample.vNorthMetersPerSecond.toFixed(4)}`));
const timeSignatures = new Set(timeSamples.map((sample) => `${sample.uEastMetersPerSecond.toFixed(4)},${sample.vNorthMetersPerSecond.toFixed(4)}`));
assert.ok(depthSignatures.size >= 2, 'depth values must differ');
assert.ok(timeSignatures.size >= 2, 'time values must differ');
console.log('[audit_current_depth_time_distinctness] PASS', { depth: depthSignatures.size, time: timeSignatures.size });
