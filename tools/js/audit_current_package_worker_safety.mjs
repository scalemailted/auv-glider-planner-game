import assert from 'node:assert/strict';
import { currents } from './current_package_test_helpers.mjs';
import { createPackageFixtureField } from './current_package_test_helpers.mjs';

const manifest = currents.createCurrentFieldManifest({ id: 'worker-safe-current-manifest' });
const field = createPackageFixtureField({ id: 'worker-safe-current-field' });
const clonedManifest = structuredClone(manifest);
const clonedField = structuredClone(field);
assert.equal(clonedManifest.digest, manifest.digest);
assert.equal(clonedField.digest, field.digest);
assert.equal(typeof clonedField.uEastMetersPerSecond[0][0][0][0], 'number');
assert.equal(JSON.stringify(clonedField).includes('function'), false);
console.log('audit_current_package_worker_safety: ok', { manifestDigest: manifest.digest, fieldDigest: field.digest });