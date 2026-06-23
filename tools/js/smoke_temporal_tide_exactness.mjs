import { assert, near } from './current_r2a3_test_helpers.mjs';
import { createManufacturedCurrentField, evaluateExpectedCurrent } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const field = createManufacturedCurrentField('oscillatingTide');
const samples = field.timeAxisSeconds.map((time) => sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 10, timeSeconds: time }));
for (const sample of samples) {
  const expected = evaluateExpectedCurrent(field, 2, 2, 10, sample.timeSeconds);
  near(sample.uEastMetersPerSecond, expected.u, 1e-6, 'tide u at source time');
  near(sample.vNorthMetersPerSecond, expected.v, 1e-6, 'tide v at source time');
}
assert.ok(Math.sign(samples[1].uEastMetersPerSecond) !== Math.sign(samples[3].uEastMetersPerSecond), 'tide reverses direction');
console.log('[smoke_temporal_tide_exactness] PASS', samples.map((sample) => [sample.timeSeconds, sample.uEastMetersPerSecond]));
