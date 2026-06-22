import { assert, makeCurrentCubeFixture, sampleFixture } from './current_cube_test_helpers.mjs';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const field = makeCurrentCubeFixture();
const shallow = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 15, timeSeconds: 600 });
const thermo = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 35, timeSeconds: 600 });
const mid = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 25, timeSeconds: 600 });
assert.equal(mid.depthInterpolationFraction > 0 && mid.depthInterpolationFraction < 1, true);
assert.equal(Number.isFinite(mid.uEastMetersPerSecond), true);
const minU = Math.min(shallow.uEastMetersPerSecond, thermo.uEastMetersPerSecond);
const maxU = Math.max(shallow.uEastMetersPerSecond, thermo.uEastMetersPerSecond);
assert.equal(mid.uEastMetersPerSecond >= minU - 1e-6 && mid.uEastMetersPerSecond <= maxU + 1e-6, true);
assert.notDeepEqual(sampleFixture(0, 600), sampleFixture(150, 600));
console.log('[smoke_current_depth_interpolation] PASS', { shallow, mid, thermo });
