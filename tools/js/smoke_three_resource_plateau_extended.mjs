import assert from 'node:assert/strict';
import { createThreePerformanceDebugPayload, inactiveThreePerformanceDebugPayload } from '../../src/game/three/ThreeMissionPerformanceMonitor.js';

function plateau(counts, tolerance = 2) {
  const warm = counts.slice(Math.max(0, counts.length - 5));
  return Math.max(...warm) - Math.min(...warm) <= tolerance;
}

const objectCounts = [180, 192, 196, 197, 198, 198, 199, 198, 199, 198];
const geometryCounts = [62, 68, 70, 70, 71, 70, 71, 70, 71, 70];
const textureCounts = [8, 10, 12, 12, 12, 12, 12, 12, 12, 12];
assert.equal(plateau(objectCounts), true, 'object counts plateau after warmup');
assert.equal(plateau(geometryCounts), true, 'geometry counts plateau after warmup');
assert.equal(plateau(textureCounts, 0), true, 'texture counts plateau exactly after warmup');
const debug = createThreePerformanceDebugPayload({ rendererSummary: { disposed: false, activeRafCount: 1, sceneObjectCount: objectCounts.at(-1), geometryCount: geometryCounts.at(-1), textureCount: textureCounts.at(-1), performanceSummary: { enabled: true, sampleCount: 10, warnings: [] } } });
assert.equal(debug.activeRendererCount, 1, 'one renderer is active during mission');
assert.equal(debug.activeRafCount, 1, 'one RAF is active during mission');
const inactive = inactiveThreePerformanceDebugPayload();
assert.equal(inactive.activeRendererCount, 0, 'teardown reaches zero renderers');
assert.equal(inactive.activeRafCount, 0, 'teardown reaches zero RAFs');
console.log(JSON.stringify({ ok: true, plateau: { objectCounts, geometryCounts, textureCounts }, inactive }));
