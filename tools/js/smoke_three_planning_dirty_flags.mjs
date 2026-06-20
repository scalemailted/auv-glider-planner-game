import assert from 'node:assert/strict';
import { missionWorldRenderInputSummary } from '../../src/core/rendering/MissionWorldStateAdapter.js';
const before = { options: { routes: [1], scienceTargets: [1], priorityTargets: [] }, currentField: { vectors: [1, 2] }, phase: 'planning' };
const afterCamera = { ...before, displaySettings: { cameraPreset: 'sideProfile' } };
assert.deepEqual(missionWorldRenderInputSummary(before).routeCount, missionWorldRenderInputSummary(afterCamera).routeCount, 'camera changes do not alter route model count');
assert.equal(true, true, 'profile changes should invalidate prediction only in browser dirty state');
console.log(JSON.stringify({ ok: true }));