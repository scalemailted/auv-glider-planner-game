import { assert, assertFiniteCurrent, sampleFixture } from './current_cube_test_helpers.mjs';
import { validateOceanCurrentSample } from '../../src/core/science/OceanCurrentFieldSampler.js';

const sample = sampleFixture(35, 600);
assertFiniteCurrent(sample);
assert.equal(sample.wet, true);
assert.equal(validateOceanCurrentSample(sample).valid, true);
assert.equal(sample.lowerDepthIndex <= sample.upperDepthIndex, true);
assert.equal(sample.lowerTimeIndex <= sample.upperTimeIndex, true);
console.log('[smoke_ocean_current_sampler_4d] PASS', sample);
