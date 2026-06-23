import assert from 'node:assert/strict';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';

const level = { world: { grid: { width: 5, height: 4 }, operationalDomain: { time: { durationSeconds: 10800 } } } };
const bounded = createBathymetryConditionedCurrentField({ level, timeAxisSeconds: [0, 200, 400, 600], temporalBoundaryMode: 'bounded' });
assert.ok(bounded.timeAxisSeconds.includes(600), 'input source frame is preserved');
assert.ok(bounded.timeAxisSeconds.at(-1) >= 10800, 'bounded generated axis extends to mission end');
const periodic = createBathymetryConditionedCurrentField({ level, timeAxisSeconds: [0, 200, 400, 600], temporalBoundaryMode: 'periodic', temporalPeriodSeconds: 600 });
assert.deepEqual(periodic.timeAxisSeconds, [0, 200, 400, 600], 'periodic fields may intentionally keep a short cycle axis');
assert.equal(periodic.temporalBoundaryMode, 'periodic');
assert.equal(periodic.temporalPeriodSeconds, 600);
console.log('PASS audit_no_short_bounded_current_axis');