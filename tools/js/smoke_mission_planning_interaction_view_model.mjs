import assert from 'node:assert/strict';

import {
  buildMissionPlanningInteractionViewModel,
  missionPlanningInteractionViewModelSummary
} from '../../src/core/rendering/MissionPlanningInteractionViewModel.js';

const viewModel = buildMissionPlanningInteractionViewModel({
  missionWorldViewModel: {
    waypoints: [{ waypointId: 'wp-1', agentId: 'alpha', x: 1, y: 2, selected: false }],
    planningMarkers: [{ markerId: 'marker-1', x: 3, y: 4, selected: true }],
    priorityTargets: [{ targetId: 'star-1', x: 5, y: 2, selected: false }],
    gliders: [{ agentId: 'alpha', x: 0, y: 0, selected: true }]
  },
  interactionState: {
    interactionMode: 'editWaypoint',
    hoveredCell: { x: 2, y: 3 },
    hoveredEntity: { objectType: 'waypoint', waypointId: 'wp-1', gridCell: { x: 1, y: 2 } },
    placementValidation: { valid: false, message: 'Blocked terrain.' },
    dragPreview: { active: true, waypointId: 'wp-1', gridCell: { x: 2, y: 3 } },
    routePreview: { active: true, from: { x: 1, y: 2 }, to: { x: 2, y: 3 }, hiddenTruth: { value: 9 } },
    T_hiddenTruth: { shouldNotLeak: true }
  },
  options: { expectGuidance: true }
});
const summary = missionPlanningInteractionViewModelSummary(viewModel);
assert.equal(summary.interactionMode, 'editWaypoint');
assert.equal(summary.hoveredObjectType, 'waypoint');
assert.equal(summary.selectedObjectType, 'planningMarker');
assert.equal(summary.placementValid, false);
assert.equal(summary.routePreviewActive, true);
assert.equal(summary.dragPreviewActive, true);
assert.equal(summary.warningCount, 1, 'missing canonical guidance should warn rather than fabricate');
assert.equal(JSON.stringify(viewModel).includes('hiddenTruth'), false, 'hidden truth keys are scrubbed');
assert.equal(JSON.stringify(viewModel).includes('T_hiddenTruth'), false, 'T_hiddenTruth keys are scrubbed');
assert.equal(summary.ownsPlanning, false);
assert.equal(summary.exposesHiddenTruth, false);

console.log('Mission planning interaction view-model smoke passed');