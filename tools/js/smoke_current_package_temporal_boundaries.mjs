import { assert, currents, createPackageFixtureField } from './current_package_test_helpers.mjs';

const bounded = createPackageFixtureField({ timeAxisSeconds: [0, 100], validTimeEndSeconds: 100 });
const clamped = currents.sampleOceanCurrent({ field: bounded, eastMeters: 0, northMeters: 0, depthMeters: 0, timeSeconds: 150 });
assert.equal(clamped.temporalBoundaryMode, 'bounded');
assert.equal(clamped.timeClampedToBoundary, true);
assert.equal(clamped.currentSampleTimeSeconds, 100);
const periodic = createPackageFixtureField({ temporalBoundaryMode: 'periodic', temporalPeriodSeconds: 100, timeAxisSeconds: [0, 50, 100], validTimeEndSeconds: 100 });
const wrapped = currents.sampleOceanCurrent({ field: periodic, eastMeters: 0, northMeters: 0, depthMeters: 0, timeSeconds: 125 });
assert.equal(wrapped.temporalBoundaryMode, 'periodic');
assert.equal(wrapped.timeWrappedPeriodically, true);
assert.equal(wrapped.currentSampleTimeSeconds, 25);
const resolved = currents.resolveCurrentSamplingTime(periodic, 225);
assert.equal(resolved.timeWrapped, true);
assert.equal(resolved.resolvedTimeSeconds, 25);
console.log('smoke_current_package_temporal_boundaries: ok');