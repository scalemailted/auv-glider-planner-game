import { assert, currents, createPackageFixtureField } from './current_package_test_helpers.mjs';

const field = createPackageFixtureField();
const validation = currents.validateCurrentField4D(field);
const summary = currents.currentFieldSummary(field);
assert.equal(validation.valid, true);
assert.equal(summary.digest, field.digest);
assert.equal(currents.currentFieldDigest(field), field.digest);
assert.equal(summary.coordinateFrame, 'localEastNorthDown');
assert.equal(summary.eastSampleCount, 2);
assert.equal(summary.depthSampleCount, 2);
console.log('smoke_current_package_artifact: ok', { digest: field.digest });