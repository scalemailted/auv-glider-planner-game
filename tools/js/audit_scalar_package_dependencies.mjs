import assert from 'node:assert/strict';
import { auditPackageBoundaries } from './audit_package_boundaries.mjs';

const violations = await auditPackageBoundaries();
const scalarViolations = violations.filter((entry) => entry.includes('packages/scalar-processes') || entry.includes('packages\\scalar-processes'));
assert.deepEqual(scalarViolations, []);
console.log('audit_scalar_package_dependencies: ok');
