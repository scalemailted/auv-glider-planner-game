import assert from 'node:assert/strict';
import {
  beginThreePerformanceFrame,
  createThreeMissionPerformanceMonitor,
  endThreePerformanceFrame,
  resetThreePerformanceWindow,
  threeMissionPerformanceSummary
} from '../../src/game/three/ThreeMissionPerformanceMonitor.js';

const monitor = createThreeMissionPerformanceMonitor({ windowSize: 5 });
for (const t of [0, 16, 32, 64, 100, 150, 210]) {
  beginThreePerformanceFrame(monitor, t);
  endThreePerformanceFrame(monitor, t + 2, { render: { calls: 12, triangles: 300, lines: 20, points: 4 }, memory: { geometries: 9, textures: 3 } });
}
const summary = threeMissionPerformanceSummary(monitor);
assert.equal(summary.sampleCount, 5, 'rolling frame buffer is bounded to window size');
assert.equal(summary.totalSampleCount, 6, 'total sample count records rolled-off samples');
assert.equal(summary.averageFrameMilliseconds, 38.8, 'average uses the active rolling window');
assert.equal(summary.medianFrameMilliseconds, 36, 'median is calculated from sorted samples');
assert.equal(summary.p95FrameMilliseconds, 60, 'p95 is calculated from sorted samples');
assert.equal(summary.p99FrameMilliseconds, 60, 'p99 is calculated from sorted samples');
assert.equal(summary.maximumFrameMilliseconds, 60, 'maximum is calculated from samples');
assert.equal(summary.framesOver33Milliseconds, 3, 'long-frame threshold counts are exposed');
assert.equal(summary.framesOver50Milliseconds, 1, '50 ms threshold count is exposed');
assert.equal(summary.rendererCalls, 12, 'renderer.info render calls are retained');
assert.equal(summary.rendererTriangles, 300, 'renderer.info triangle count is retained');
assert.equal(summary.rendererLines, 20, 'renderer.info line count is retained');
assert.equal(summary.rendererPoints, 4, 'renderer.info point count is retained');
assert.equal(summary.rendererGeometries, 9, 'renderer.info geometry count is retained');
assert.equal(summary.rendererTextures, 3, 'renderer.info texture count is retained');
resetThreePerformanceWindow(monitor);
const reset = threeMissionPerformanceSummary(monitor);
assert.equal(reset.sampleCount, 0, 'reset clears frame samples');
assert.equal(reset.totalSampleCount, 0, 'reset clears total samples');
assert.equal(reset.status, 'idle', 'reset leaves a stable idle summary');
console.log(JSON.stringify({ ok: true, summary, reset }));
