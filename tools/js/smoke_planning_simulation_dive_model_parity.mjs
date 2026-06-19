import assert from 'node:assert/strict';
import { buildPlannedDiveSegmentViewModel } from '../../src/core/rendering/PlannedDiveSegmentViewModel.js';
import { advanceGliderDiveStateMachine } from '../../src/core/sim/GliderDiveStateMachine.js';
import { TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

const segment = buildPlannedDiveSegmentViewModel({
  agentId: 'glider-1',
  segmentId: 'parity-segment',
  startWaypoint: { id: 'wp-a', x: 0, y: 1 },
  targetWaypoint: { id: 'wp-b', x: 6, y: 1, diveProfileId: 'thermoclineDive', targetDepthLayerId: 'thermocline' },
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  bottomBoundary: { bottomDepthField: Array.from({ length: 3 }, () => Array.from({ length: 8 }, () => 180)) },
  requestedMaximumDepthMeters: 35,
  cycleCount: 1,
  sampleCount: 65
});
let state = { agentId: 'glider-1', position: { x: 0, y: 1, depthMeters: 0 }, divePhase: 'surfaced', segmentProgress: 0, timeSeconds: 0 };
const actualPhases = [];
const layerCrossings = [];
let maxActualDepth = 0;
for (const progress of [0, 0.25, 0.5, 0.6, 0.75, 0.98]) {
  const result = advanceGliderDiveStateMachine(state, {
    waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
    diveProfileId: 'thermoclineDive',
    targetDepthLayerId: 'thermocline',
    maximumDepthMeters: 35,
    localBathymetryMeters: 180,
    minimumBottomClearanceMeters: 5,
    segmentProgress: progress,
    dt: 500,
    timeSeconds: progress * 1000
  });
  state = result.state;
  actualPhases.push(result.phase);
  layerCrossings.push(...result.layerCrossingEvents.map((event) => event.layerId));
  maxActualDepth = Math.max(maxActualDepth, Number(result.state.position.depthMeters ?? 0));
}
const predictedMaxDepth = Math.max(...segment.predictedDivePath.map((point) => Number(point.depthMeters)));
assert.equal(Math.abs(predictedMaxDepth - maxActualDepth) <= 1e-6, true, 'predicted maximum depth matches canonical state-machine target in no-current single-cycle fixture');
assert.equal(segment.cycleCount, 1, 'predicted cycle count is single-cycle');
assert.equal(actualPhases.includes('bottomTurn'), true, 'actual phase order includes bottom turn');
assert.equal(segment.predictedDivePath.some((point) => point.phase === 'bottomTurn'), true, 'predicted phase order includes bottom turn');
assert.equal(segment.layerCrossings.some((crossing) => crossing.to === 'thermocline' || crossing.from === 'thermocline'), true, 'predicted path crosses thermocline');
assert.equal(layerCrossings.includes('thermocline'), true, 'actual state-machine crossing includes thermocline');
assert.equal(Math.hypot((segment.predictedSurfacingPosition.x ?? 0) - 6, (segment.predictedSurfacingPosition.y ?? 0) - 1) <= 1e-6, true, 'no-current predicted surfacing reaches target surface waypoint');
console.log(JSON.stringify({ ok: true, predictedMaxDepth, maxActualDepth, actualPhases }));