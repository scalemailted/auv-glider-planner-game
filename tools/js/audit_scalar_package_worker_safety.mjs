import assert from 'node:assert/strict';
import { scalarProcesses } from './scalar_package_test_helpers.mjs';
import { createPackageFixtureField } from './scalar_package_test_helpers.mjs';

const metadata = scalarProcesses.normalizeScalarSourceMetadata({ sourceId: 'worker-safe-scalar-source' });
const field = createPackageFixtureField({ id: 'worker-safe-scalar-field' });
const clonedMetadata = structuredClone(metadata);
const clonedField = structuredClone(field);
assert.equal(clonedMetadata.sourceId, metadata.sourceId);
assert.equal(clonedField.digest, field.digest);
assert.equal(typeof clonedField.scalarValue[0][0][0][0], 'number');
assert.equal(JSON.stringify(clonedField).includes('function'), false);
console.log('audit_scalar_package_worker_safety: ok', { fieldDigest: field.digest });
