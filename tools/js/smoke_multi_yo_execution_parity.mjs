import assert from 'node:assert/strict';
import { buildPlannedDiveSegmentViewModel } from '../../src/core/rendering/PlannedDiveSegmentViewModel.js';
import { advanceGliderDiveStateMachine } from '../../src/core/sim/GliderDiveStateMachine.js';
import { TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

const segment = buildPlannedDiveSegmentViewModel({
  segmentId: 'multi-yo-parity',
  startWaypoint: { x: 0, y: 2 },
  targetWaypoint: { x: 12, y: 2, diveProfileId: 'fullProfile', targetDepthLayerId: 'deep' },
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  bottomBoundary: { bottomDepthField: Array.from({ length: 5 }, () => Array.from({ length: 14 }, () => 220)) },
  requestedMaximumDepthMeters: 120,
  cycleCount: 3,
  sampleCount: 120
});
let state = { agentId: 'g1', position: { x: 0, y: 2, depthMeters: 0 }, divePhase: 'surfaced', segmentProgress: 0, timeSeconds: 0 };
const actualPhases = [];
const crossings = [];
for (const progress of [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1]) {
  const result = advanceGliderDiveStateMachine(state, { waterColumnConfig: TEST_WATER_COLUMN_CONFIG, diveProfileId: 'fullProfile', targetDepthLayerId: 'deep', maximumDepthMeters: 120, cycleCount: 3, segmentProgress: progress, localBathymetryMeters: 220, dt: 100, timeSeconds: progress * 1000 });
  state = result.state;
  actualPhases.push(result.phase);
  crossings.push(...result.layerCrossingEvents.map((event) => event.layerId));
}
assert.equal(segment.cycleCount, 3, 'prediction keeps requested feasible cycles');
assert.ok(new Set(segment.predictedDivePath.map((point) => point.cycleIndex)).size >= 3, 'prediction has multiple cycles');
assert.ok(actualPhases.includes('bottomTurn'), 'actual execution reaches bottom turn');
assert.ok(actualPhases.includes('ascending') || actualPhases.includes('inflectingUp'), 'actual execution ascends');
assert.ok(crossings.includes('thermocline') || crossings.includes('deep'), 'actual layer crossings occur');
console.log(JSON.stringify({ ok: true, predictedCycles: segment.cycleCount, actualPhases }));