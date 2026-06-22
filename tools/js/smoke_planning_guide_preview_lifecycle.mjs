import assert from 'node:assert/strict';

import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import {
  buildPlanningGuidePreviewViewModel,
  planningGuidePreviewSummary
} from '../../src/core/rendering/PlanningGuidePreviewViewModel.js';
import {
  createThreePlanningInteractionLayer,
  updateThreePlanningInteractionLayer,
  threePlanningInteractionLayerSummary,
  disposeThreePlanningInteractionLayer
} from '../../src/game/three/layers/ThreePlanningInteractionLayer.js';

const mission = {
  agents: [
    { id: 'glider_1', start: { x: 1.25, y: 2.5, coordinateFrame: 'continuousGridV1' }, deployment: { selectedStart: { x: 1.25, y: 2.5 } } },
    { id: 'glider_2', start: { x: 7.75, y: 6.1, coordinateFrame: 'continuousGridV1' }, deployment: { selectedStart: { x: 7.75, y: 6.1 } } }
  ]
};
const plan = {
  agentPlans: [
    { agentId: 'glider_1', selectedStart: { x: 1.25, y: 2.5 }, waypoints: [] },
    { agentId: 'glider_2', selectedStart: { x: 7.75, y: 6.1 }, waypoints: [] }
  ]
};
const transform = createMissionWorldCoordinateTransform({ grid: { width: 10, height: 10 }, cellSize: 1 });
const layer = createThreePlanningInteractionLayer();

let preview = buildPlanningGuidePreviewViewModel({
  tool: 'placeWaypoint',
  selectedAgentId: 'glider_1',
  mission,
  plan,
  candidatePoint: { x: 3.4, y: 4.6, coordinateFrame: 'continuousGridV1' },
  candidateCell: { x: 3, y: 5 },
  placementValidation: { valid: true }
});
assert.equal(preview.originType, 'deploymentStart');
assert.equal(preview.originPoint.x, 1.25);
assert.equal(planningGuidePreviewSummary(preview).previewSegmentCount, 1);
updateThreePlanningInteractionLayer(layer, { routePreview: preview }, { transform });
let summary = threePlanningInteractionLayerSummary(layer, preview);
assert.equal(summary.previewSegmentCount, 1);
assert.equal(summary.objectCreateCount, 1);
assert.equal(summary.stalePreviewCount, 0);

preview = buildPlanningGuidePreviewViewModel({
  tool: 'placeWaypoint',
  selectedAgentId: 'glider_1',
  mission,
  plan,
  candidatePoint: { x: 3.85, y: 4.95, coordinateFrame: 'continuousGridV1' },
  candidateCell: { x: 4, y: 5 },
  placementValidation: { valid: true }
});
updateThreePlanningInteractionLayer(layer, { routePreview: preview }, { transform });
summary = threePlanningInteractionLayerSummary(layer, preview);
assert.equal(summary.previewSegmentCount, 1);
assert.equal(summary.objectCreateCount, 1, 'pointer movement must reuse the stable preview object');
assert.ok(summary.objectReuseCount >= 1, 'pointer movement should update existing preview geometry');

plan.agentPlans[0].waypoints.push({ id: 'glider_1_wp_001', x: 3.85, y: 4.95, coordinateFrame: 'continuousGridV1', executable: true });
preview = buildPlanningGuidePreviewViewModel({
  tool: 'placeWaypoint',
  selectedAgentId: 'glider_1',
  mission,
  plan,
  candidatePoint: { x: 6.2, y: 5.5, coordinateFrame: 'continuousGridV1' },
  candidateCell: { x: 6, y: 6 },
  placementValidation: { valid: true }
});
assert.equal(preview.originType, 'routeEndpoint');
assert.equal(preview.originId, 'glider_1_wp_001');
assert.equal(preview.originPoint.x, 3.85);
updateThreePlanningInteractionLayer(layer, { routePreview: preview }, { transform });
summary = threePlanningInteractionLayerSummary(layer, preview);
assert.equal(summary.previewSegmentCount, 1);
assert.equal(summary.stalePreviewCount, 0);

const gliderSwitchPreview = buildPlanningGuidePreviewViewModel({
  tool: 'placeWaypoint',
  selectedAgentId: 'glider_2',
  mission,
  plan,
  candidatePoint: { x: 8.6, y: 6.7, coordinateFrame: 'continuousGridV1' },
  candidateCell: { x: 9, y: 7 },
  placementValidation: { valid: true }
});
assert.equal(gliderSwitchPreview.originType, 'deploymentStart');
assert.equal(gliderSwitchPreview.originPoint.x, 7.75);
updateThreePlanningInteractionLayer(layer, { routePreview: gliderSwitchPreview }, { transform });
summary = threePlanningInteractionLayerSummary(layer, gliderSwitchPreview);
assert.equal(summary.previewSegmentCount, 1);

updateThreePlanningInteractionLayer(layer, { routePreview: null }, { transform });
summary = threePlanningInteractionLayerSummary(layer, null);
assert.equal(summary.previewSegmentCount, 0, 'tool cancellation clears preview segment');
assert.equal(globalThis.ANCHOR_PLANNING_GUIDE_DEBUG.previewSegmentCount, 0);

disposeThreePlanningInteractionLayer(layer);
summary = threePlanningInteractionLayerSummary(layer, null);
assert.equal(summary.disposed, true);
assert.equal(summary.previewSegmentCount, 0);
assert.equal(layer.previewGroup.children.length, 0);

console.log('smoke_planning_guide_preview_lifecycle: ok');