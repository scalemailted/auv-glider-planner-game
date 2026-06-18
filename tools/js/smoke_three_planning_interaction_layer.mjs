import assert from 'node:assert/strict';

import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import {
  createThreePlanningInteractionLayer,
  disposeThreePlanningInteractionLayer,
  setThreePlanningInteractionLayerVisibility,
  updateThreePlanningInteractionLayer
} from '../../src/game/three/layers/ThreePlanningInteractionLayer.js';

const transform = createMissionWorldCoordinateTransform({ grid: { width: 8, height: 6 }, cellSize: 1 });
const layer = createThreePlanningInteractionLayer();
updateThreePlanningInteractionLayer(layer, {
  hoveredCell: { x: 2, y: 3 },
  placementValid: false,
  selectedEntity: { objectType: 'waypoint', gridCell: { x: 1, y: 1 } },
  dragPreview: { active: true, gridCell: { x: 4, y: 3 }, valid: true },
  routePreview: { active: true, from: { x: 1, y: 1 }, to: { x: 4, y: 3 }, valid: true },
  guidanceCone: { polygon: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }] },
  reachableRegion: { center: { x: 2, y: 2 }, radiusX: 2, radiusY: 1 }
}, { transform });
const names = layer.group.children.map((child) => child.name);
assert.ok(names.includes('hovered-grid-cell'));
assert.ok(names.includes('three-route-preview-segment'));
assert.ok(names.includes('waypoint-drag-ghost'));
assert.ok(names.includes('selected-waypoint-outline'));
assert.ok(names.includes('canonical-guidance-cone-outline'));
assert.ok(names.includes('canonical-reachable-region-outline'));
assert.equal(layer.group.userData.ownsPlanning, false);
setThreePlanningInteractionLayerVisibility(layer, false);
assert.equal(layer.group.visible, false);
disposeThreePlanningInteractionLayer(layer);
assert.equal(layer.group.children.length, 0);

console.log('Three planning interaction layer smoke passed');