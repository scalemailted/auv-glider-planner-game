import assert from 'node:assert/strict';
import { auditPackageBoundaries } from './audit_package_boundaries.mjs';

const violations = await auditPackageBoundaries();
const scoringViolations = violations.filter((entry) => entry.includes('packages/scoring') || entry.includes('packages\\scoring'));
assert.deepEqual(scoringViolations, []);
console.log('audit_scoring_package_dependencies: ok');
