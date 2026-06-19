import assert from 'node:assert/strict';
import { createMissionWorldCoordinateTransform, gridCellCenterToWorld, gridCellBoundsToWorld, gridVertexToWorld, worldPointToGridCell, fieldUvForGridCell, gridExtentToWorldBounds } from '../../src/core/rendering/MissionWorldCoordinates.js';

const transform = createMissionWorldCoordinateTransform({ grid: { width: 10, height: 8 }, cellSize: 2 });
const center = gridCellCenterToWorld(transform, 0, 0);
assert.deepEqual({ x: center.x, z: center.z }, { x: -9, z: -7 });
const roundtrip = worldPointToGridCell(transform, center);
assert.equal(roundtrip.col, 0);
assert.equal(roundtrip.row, 0);
const bounds = gridCellBoundsToWorld(transform, 0, 0);
assert.equal(bounds.center.x, center.x);
assert.equal(bounds.center.z, center.z);
assert.equal(gridVertexToWorld(transform, 0, 0).x, -10);
assert.equal(fieldUvForGridCell(transform, 0, 0).u, 0.05);
assert.equal(gridExtentToWorldBounds(transform).width, 20);
console.log('smoke_mission_grid_coordinate_contract passed');
