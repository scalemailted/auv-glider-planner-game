import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import {
  clearThreeTerrainValidationLayer,
  threeTerrainValidationLayerSummary,
  updateThreeTerrainValidationLayer
} from '../../src/game/three/layers/ThreeTerrainValidationLayer.js';

const transform = createMissionWorldCoordinateTransform({ grid: { width: 5, height: 5 }, cellSize: 1 });
const baseReport = {
  status: 'INVALID',
  executable: false,
  hardErrors: [{ code: 'SEGMENT_LAND_INTERSECTION', severity: 'HARD_ERROR', message: 'crosses land', segmentId: 's1', position: { x: 1, y: 1 } }],
  warnings: [{ code: 'LOW_BOTTOM_CLEARANCE', severity: 'WARNING', message: 'low clearance', segmentId: 's2', position: { x: 2, y: 2, depthMeters: 30 } }],
  advisories: [],
  segmentReports: [{ segmentId: 's1', status: 'INVALID', from: { x: 0, y: 0 }, to: { x: 2, y: 2 } }]
};
const group = new THREE.Group();
updateThreeTerrainValidationLayer(group, { coordinateSystem: transform, terrainValidation: baseReport });
const first = threeTerrainValidationLayerSummary(group, { terrainValidation: baseReport });
assert.equal(first.validationLayerFullRebuildCount, 0);
assert.ok(first.validationLayerObjectCreateCount >= 2);
updateThreeTerrainValidationLayer(group, { coordinateSystem: transform, terrainValidation: baseReport });
const second = threeTerrainValidationLayerSummary(group, { terrainValidation: baseReport });
assert.equal(second.validationLayerDigest, first.validationLayerDigest);
assert.ok(second.validationLayerObjectReuseCount > first.validationLayerObjectReuseCount);
updateThreeTerrainValidationLayer(group, { coordinateSystem: transform, terrainValidation: baseReport, selectedRouteSegmentId: 's1' });
const selected = threeTerrainValidationLayerSummary(group, { terrainValidation: baseReport, selectedRouteSegmentId: 's1' });
assert.equal(selected.validationLayerDigest, first.validationLayerDigest);
assert.equal(selected.selectedIssueEmphasisAvailable, true);
const runtimeReport = { ...baseReport, warnings: [...baseReport.warnings, { code: 'CURRENT_BEACHING_RISK', severity: 'WARNING', message: 'coastline risk', segmentId: 's3', position: { x: 3, y: 2 } }] };
updateThreeTerrainValidationLayer(group, { coordinateSystem: transform, terrainValidation: runtimeReport });
const runtime = threeTerrainValidationLayerSummary(group, { terrainValidation: runtimeReport });
assert.ok(runtime.validationLayerObjectCreateCount > selected.validationLayerObjectCreateCount);
clearThreeTerrainValidationLayer(group);
assert.equal(group.children.length, 0);
console.log('three terrain validation layer incremental smoke passed');