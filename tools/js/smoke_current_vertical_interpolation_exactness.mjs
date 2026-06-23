import { near } from './current_r2a3_test_helpers.mjs';
import { createManufacturedCurrentField, evaluateExpectedCurrent } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const field = createManufacturedCurrentField('linearShearWithDepth');
const depth = 55;
const sample = sampleOceanCurrent({ field, eastMeters: 1.5, northMeters: 2.5, depthMeters: depth, timeSeconds: 600 });
const expected = evaluateExpectedCurrent(field, 1.5, 2.5, depth, 600);
near(sample.uEastMetersPerSecond, expected.u, 1e-6, 'vertical interpolated u');
near(sample.depthInterpolationFraction > 0 && sample.depthInterpolationFraction < 1 ? 1 : 0, 1, 0, 'fraction in bracket');
console.log('[smoke_current_vertical_interpolation_exactness] PASS', { lower: sample.lowerDepthMeters, upper: sample.upperDepthMeters, fraction: sample.depthInterpolationFraction });
