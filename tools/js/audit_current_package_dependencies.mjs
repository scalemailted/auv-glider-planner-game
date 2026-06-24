import assert from 'node:assert/strict';
import { auditPackageBoundaries } from './audit_package_boundaries.mjs';

const violations = await auditPackageBoundaries();
const currentViolations = violations.filter((entry) => entry.includes('packages/currents') || entry.includes('packages\\currents'));
assert.deepEqual(currentViolations, []);
console.log('audit_current_package_dependencies: ok');