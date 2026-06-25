import { assert, createPackageFixtureField, scalarProcesses } from './scalar_package_test_helpers.mjs';

const field = createPackageFixtureField({ id: 'smoke-scalar-package-artifact' });
const validation = scalarProcesses.validateScalarField4D(field);
assert.equal(validation.status, 'PASS');
assert.equal(field.type, 'anchor.scalar-processes.scalar-field-4d');
assert.equal(field.depthAxisMeters.length, 2);
assert.equal(field.timeAxisSeconds.length, 2);
assert.equal(validation.summary.materiallyDepthVarying, true);
assert.equal(validation.summary.temporallyVarying, true);
assert.equal(validation.summary.calibratedOceanForecast, false);
assert.match(field.digest, /^fnv1a32:/);
console.log('smoke_scalar_package_artifact: ok', { digest: field.digest });
