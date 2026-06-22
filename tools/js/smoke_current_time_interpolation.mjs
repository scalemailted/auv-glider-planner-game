import { assert, makeCurrentCubeFixture } from './current_cube_test_helpers.mjs';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const field = makeCurrentCubeFixture();
const early = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 35, timeSeconds: 0 });
const late = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 35, timeSeconds: 1800 });
const middle = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 35, timeSeconds: 900 });
assert.equal(middle.timeInterpolationFraction > 0 && middle.timeInterpolationFraction < 1, true);
assert.notEqual(Math.hypot(early.uEastMetersPerSecond - late.uEastMetersPerSecond, early.vNorthMetersPerSecond - late.vNorthMetersPerSecond) < 1e-9, true);
console.log('[smoke_current_time_interpolation] PASS', { early, middle, late });
