import { assert, makeCurrentCubeFixture } from './current_cube_test_helpers.mjs';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const field = makeCurrentCubeFixture();
field.wetMask[1][1] = false;
field.bottomDepthMeters[2][2] = 20;
const dry = sampleOceanCurrent({ field, eastMeters: 1, northMeters: 1, depthMeters: 0, timeSeconds: 0 });
const below = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 150, timeSeconds: 0 });
assert.equal(dry.wet, false);
assert.equal(dry.maskReason, 'landOrDryCell');
assert.equal(below.belowBottom, true);
assert.equal(below.wet, false);
console.log('[smoke_current_wet_mask] PASS', { dry: dry.maskReason, below: below.maskReason });
