import { assert, currents, createPackageFixtureField } from './current_package_test_helpers.mjs';

const field = createPackageFixtureField();
const land = currents.sampleOceanCurrent({ field, eastMeters: 10, northMeters: 0, depthMeters: 0, timeSeconds: 0 });
const below = currents.sampleOceanCurrent({ field, eastMeters: 10, northMeters: 10, depthMeters: 75, timeSeconds: 0 });
const outside = currents.sampleOceanCurrent({ field, eastMeters: -1, northMeters: 0, depthMeters: 0, timeSeconds: 0 });
assert.equal(land.wet, false);
assert.equal(land.maskReason, 'landOrDryCell');
assert.equal(below.belowBottom, true);
assert.equal(below.maskReason, 'belowBottom');
assert.equal(outside.outsideDomain, true);
assert.equal(outside.maskReason, 'outsideDomain');
console.log('smoke_current_package_masks: ok');