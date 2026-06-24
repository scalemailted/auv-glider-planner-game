import { assert, createPackageFixtureField, sampleAt } from './current_package_test_helpers.mjs';

const field = createPackageFixtureField();
const early = sampleAt(field, { timeSeconds: 0, depthMeters: 0 });
const late = sampleAt(field, { timeSeconds: 100, depthMeters: 0 });
const mid = sampleAt(field, { timeSeconds: 50, depthMeters: 0 });
assert.equal(mid.timeInterpolationFraction, 0.5);
assert.ok(mid.uEastMetersPerSecond > Math.min(early.uEastMetersPerSecond, late.uEastMetersPerSecond));
assert.ok(mid.uEastMetersPerSecond < Math.max(early.uEastMetersPerSecond, late.uEastMetersPerSecond));
console.log('smoke_current_package_time_interpolation: ok', { early: early.uEastMetersPerSecond, mid: mid.uEastMetersPerSecond, late: late.uEastMetersPerSecond });