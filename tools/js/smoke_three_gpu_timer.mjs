import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  beginThreeGpuTimerQuery,
  createThreeWebGLGpuTimer,
  disposeThreeGpuTimer,
  endThreeGpuTimerQuery,
  pollThreeGpuTimer,
  threeGpuTimerSummary
} from '../../src/game/three/ThreeWebGLGpuTimer.js';

const unsupported = createThreeWebGLGpuTimer(null);
assert.equal(beginThreeGpuTimerQuery(unsupported), false, 'unsupported timers are inert');
assert.equal(threeGpuTimerSummary(unsupported).gpuTimingSupported, false);
assert.equal(threeGpuTimerSummary(unsupported).gpuAverageMilliseconds, null);

let nextQueryId = 0;
let available = false;
let disjoint = false;
const deleted = [];
const gl = {
  QUERY_RESULT_AVAILABLE: 1,
  QUERY_RESULT: 2,
  getExtension: (name) => name === 'EXT_disjoint_timer_query_webgl2' ? { TIME_ELAPSED_EXT: 35007, GPU_DISJOINT_EXT: 36795 } : null,
  createQuery: () => ({ id: ++nextQueryId }),
  beginQuery: () => {},
  endQuery: () => {},
  getParameter: () => disjoint,
  getQueryParameter: (_query, pname) => pname === 1 ? available : 5_000_000,
  deleteQuery: (query) => deleted.push(query.id)
};
const timer = createThreeWebGLGpuTimer(gl, { maxPendingQueries: 2 });
assert.equal(timer.supported, true);
assert.equal(beginThreeGpuTimerQuery(timer), true);
assert.equal(endThreeGpuTimerQuery(timer), true);
assert.equal(beginThreeGpuTimerQuery(timer), true);
assert.equal(endThreeGpuTimerQuery(timer), true);
assert.equal(beginThreeGpuTimerQuery(timer), false, 'bounded pending pool rejects excess queries');
assert.equal(timer.droppedQueryCount, 1);
available = true;
disjoint = true;
pollThreeGpuTimer(timer);
assert.equal(threeGpuTimerSummary(timer).gpuDisjointCount, 2, 'disjoint query results are ignored');
assert.equal(threeGpuTimerSummary(timer).sampleCount, 0);
disjoint = false;
assert.equal(beginThreeGpuTimerQuery(timer), true);
assert.equal(endThreeGpuTimerQuery(timer), true);
pollThreeGpuTimer(timer);
const summary = threeGpuTimerSummary(timer);
assert.equal(summary.gpuResolvedQueryCount, 1);
assert.equal(summary.gpuAverageMilliseconds, 5);
disposeThreeGpuTimer(timer);
assert.equal(timer.disposed, true);
assert.equal(timer.pendingQueryCount, 0);
const source = readFileSync('src/game/three/ThreeWebGLGpuTimer.js', 'utf8');
assert.doesNotMatch(source, /\.finish\s*\(/, 'GPU timer does not use gl.finish');
assert.doesNotMatch(source, /getQueryParameter\?\.\([^,]+,\s*gl\.QUERY_RESULT\)[\s\S]{0,120}QUERY_RESULT_AVAILABLE[^\n]*false/, 'query results are not synchronously forced');
assert.match(source, /ownsSimulationState:\s*false/, 'GPU timer owns no canonical state');
console.log(JSON.stringify({ ok: true, summary, deletedQueryCount: deleted.length }));
