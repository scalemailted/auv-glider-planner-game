import assert from 'node:assert/strict';
import { auditPackageBoundaries } from './audit_package_boundaries.mjs';

const violations = await auditPackageBoundaries();
const missionViolations = violations.filter((entry) => entry.includes('packages/mission-simulator') || entry.includes('packages\\mission-simulator'));
assert.deepEqual(missionViolations, []);
console.log('audit_mission_simulator_package_dependencies: ok');