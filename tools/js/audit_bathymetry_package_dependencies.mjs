import assert from 'node:assert/strict';
import { auditPackageBoundaries } from './audit_package_boundaries.mjs';

const violations = await auditPackageBoundaries();
const bathymetryViolations = violations.filter((entry) => entry.includes('packages/bathymetry') || entry.includes('packages\\bathymetry'));
assert.deepEqual(bathymetryViolations, []);
console.log('audit_bathymetry_package_dependencies: ok');