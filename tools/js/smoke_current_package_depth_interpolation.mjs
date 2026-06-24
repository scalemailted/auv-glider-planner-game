import { assert, createPackageFixtureField, sampleAt } from './current_package_test_helpers.mjs';

const field = createPackageFixtureField();
const shallow = sampleAt(field, { depthMeters: 0, timeSeconds: 0 });
const deep = sampleAt(field, { depthMeters: 100, timeSeconds: 0 });
const mid = sampleAt(field, { depthMeters: 50, timeSeconds: 0 });
assert.equal(mid.depthInterpolationFraction, 0.5);
assert.ok(mid.uEastMetersPerSecond > Math.min(shallow.uEastMetersPerSecond, deep.uEastMetersPerSecond));
assert.ok(mid.uEastMetersPerSecond < Math.max(shallow.uEastMetersPerSecond, deep.uEastMetersPerSecond));
console.log('smoke_current_package_depth_interpolation: ok', { shallow: shallow.uEastMetersPerSecond, mid: mid.uEastMetersPerSecond, deep: deep.uEastMetersPerSecond });