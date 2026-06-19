import assert from 'node:assert/strict';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { compareMissionLayerCoordinates, missionLayerAlignmentSummary } from '../../src/core/rendering/MissionLayerAlignment.js';

const coordinateSystem = createMissionWorldCoordinateTransform({ grid: { width: 5, height: 5 }, cellSize: 1 });
const report = compareMissionLayerCoordinates({ viewModel: { grid: { width: 5, height: 5 }, coordinateSystem } });
const summary = missionLayerAlignmentSummary(report);
assert.equal(summary.status, 'PASS');
assert.equal(summary.maxHorizontalDelta, 0);
console.log('audit_three_mission_layer_alignment passed');
