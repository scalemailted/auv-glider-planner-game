import { near } from './current_r2a3_test_helpers.mjs';
import { createManufacturedCurrentField, evaluateExpectedCurrent } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const field = createManufacturedCurrentField('translatingEddy');
const time = 900;
const sample = sampleOceanCurrent({ field, eastMeters: 2.4, northMeters: 2.1, depthMeters: 35, timeSeconds: time });
const expected = evaluateExpectedCurrent(field, 2.4, 2.1, 35, time);
near(sample.uEastMetersPerSecond, expected.u, 1e-6, 'temporal interpolated u');
near(sample.vNorthMetersPerSecond, expected.v, 1e-6, 'temporal interpolated v');
console.log('[smoke_current_temporal_interpolation_exactness] PASS', { lower: sample.lowerTimeSeconds, upper: sample.upperTimeSeconds, fraction: sample.timeInterpolationFraction });
