import assert from 'node:assert/strict';
import { auditPackageBoundaries } from './audit_package_boundaries.mjs';

const violations = await auditPackageBoundaries();
const environmentViolations = violations.filter((entry) => entry.includes('packages/environment') || entry.includes('packages\\environment'));
assert.deepEqual(environmentViolations, []);
console.log('audit_environment_package_dependencies: ok');