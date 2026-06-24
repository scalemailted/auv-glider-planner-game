import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { currents, createPackageFixtureField } from './current_package_test_helpers.mjs';
import { planningTimelineTimeToCurrentSeconds } from '../../src/core/time/PlanningTimelineTimeBridge.js';

const packageIndex = readFileSync('packages/currents/src/index.js', 'utf8');
const packageSampler = readFileSync('packages/currents/src/OceanCurrentFieldSampler.js', 'utf8');
assert.equal(/PlanningTimelineTimeBridge|planningTime|timeline label|display hours/i.test(packageIndex + packageSampler), false, 'currents package must not import or know Planning display units');
assert.equal(planningTimelineTimeToCurrentSeconds({ world: { time: { units: 'hours' } } }, 8, { phase: 'planning' }), 28800);
assert.equal(planningTimelineTimeToCurrentSeconds({ world: { time: { units: 'hours' } } }, 16, { phase: 'planning' }), 57600);
assert.equal(planningTimelineTimeToCurrentSeconds({ world: { time: { units: 'hours' } } }, 48, { phase: 'planning' }), 172800);
const field = createPackageFixtureField({ timeAxisSeconds: [0, 28800, 57600, 172800], validTimeEndSeconds: 172800 });
const sample = currents.sampleOceanCurrent({ field, eastMeters: 0, northMeters: 0, depthMeters: 0, timeSeconds: 8 });
assert.equal(sample.timeSeconds, 8);
assert.equal(sample.currentSampleTimeSeconds, 8);
assert.throws(() => currents.sampleOceanCurrent({ field, eastMeters: 0, northMeters: 0, depthMeters: 0, timeSeconds: Number.NaN }), /finite canonical seconds/);
console.log('audit_current_package_time_units: ok');