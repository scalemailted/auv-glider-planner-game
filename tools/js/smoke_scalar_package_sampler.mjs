import { assert, assertFiniteSample, createPackageFixtureField, sampleAt, scalarProcesses } from './scalar_package_test_helpers.mjs';

const field = createPackageFixtureField({ id: 'smoke-scalar-package-sampler' });
const sample = sampleAt(field, { x: 0.5, y: 0.5, depthMeters: 50, timeSeconds: 50 });
assertFiniteSample(sample);
assert.equal(sample.value, 4.2);
const sampler = scalarProcesses.createScalarField4DSampler(field);
assert.deepEqual(sampler.sample({ x: 0.5, y: 0.5, depthMeters: 50, timeSeconds: 50 }), sample);
const nearest = scalarProcesses.sampleScalarFieldContinuous({ field: field.scalarValue, x: 0.49, y: 0.49, depthMeters: 50, timeSeconds: 50, depthCoordinates: field.depthAxisMeters, timeCoordinates: field.timeAxisSeconds, interpolationProfileId: 'legacyNearestCellV1' });
assert.equal(Number.isFinite(nearest.value), true);
console.log('smoke_scalar_package_sampler: ok', { value: sample.value });
