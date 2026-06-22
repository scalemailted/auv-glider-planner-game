import { assert, makeCurrentCubeFixture } from './current_cube_test_helpers.mjs';
import { validateOceanCurrentField4D, oceanCurrentField4DSummary } from '../../src/core/science/OceanCurrentField4D.js';

const field = makeCurrentCubeFixture();
const validation = validateOceanCurrentField4D(field);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const summary = oceanCurrentField4DSummary(field);
assert.equal(summary.coordinateFrame, 'localEastNorthDown');
assert.equal(summary.depthSampleCount, 5);
assert.equal(summary.timeSampleCount, 3);
assert.equal(summary.usesRealHycom, false);
assert.equal(summary.usesRealMarineCopernicus, false);
assert.equal(summary.calibratedForecast, false);
assert.match(summary.label, /HYCOM-style synthetic/i);
console.log('[smoke_ocean_current_field_4d] PASS', summary.digest);
