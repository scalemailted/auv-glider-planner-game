import assert from 'node:assert/strict';
import { makeFixtureCurrentField } from './flow_r2a1_test_helpers.mjs';
import { estimateCurrentFieldBytes } from '../../src/core/runtime/SimulationLaunchProfiler.js';

const field = makeFixtureCurrentField();
const scalarCount = field.eastAxisMeters.length * field.northAxisMeters.length * field.depthAxisMeters.length * field.timeAxisSeconds.length;
const bytes = estimateCurrentFieldBytes(field);
assert.ok(scalarCount > 0);
assert.ok(bytes > scalarCount * 16, 'memory estimate includes U/V plus metadata/masks');
assert.equal(JSON.stringify({ fieldId: field.id, bytes }).includes('uEastMetersPerSecond'), false, 'memory audit summary does not clone current arrays');
console.log('[audit_current_launch_memory] PASS', { scalarCount, bytes });