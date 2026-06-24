import { assert, currents, createPackageFixtureField, sampleAt, assertFiniteSample } from './current_package_test_helpers.mjs';

const field = createPackageFixtureField();
const objectSample = sampleAt(field);
const positionalSample = currents.sampleOceanCurrent(field, 5, 5, 50, 50);
assertFiniteSample(objectSample);
assert.deepEqual(positionalSample.uEastMetersPerSecond, objectSample.uEastMetersPerSecond);
assert.equal(objectSample.lowerEastIndex, 0);
assert.equal(objectSample.upperEastIndex, 1);
assert.equal(objectSample.eastInterpolationFraction, 0.5);
assert.equal(objectSample.depthInterpolationFraction, 0.5);
assert.equal(objectSample.timeInterpolationFraction, 0.5);
assert.equal(objectSample.wet, true);
console.log('smoke_current_package_sampler: ok', { u: objectSample.uEastMetersPerSecond, v: objectSample.vNorthMetersPerSecond });