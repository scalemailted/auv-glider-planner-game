import { assert } from './current_r2a3_test_helpers.mjs';
import { runCurrentFieldMissionBenchmarks } from '../../src/core/evaluation/CurrentFieldMissionBenchmark.js';

const result = runCurrentFieldMissionBenchmarks();
assert.equal(result.pass, true, JSON.stringify(result.reports, null, 2));
assert.equal(result.reports.length >= 5, true);
console.log('[smoke_current_mission_benchmarks] PASS', result.reports.map((report) => report.id));
