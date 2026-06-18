import assert from 'node:assert/strict';

import { createMissionWorldInteractionIntent } from '../../src/core/rendering/MissionWorldInteractionIntent.js';
import { createMissionWorldInteractionResult } from '../../src/core/rendering/MissionWorldInteractionResult.js';
import { createMissionWorkspaceThreeInteractionBridge, handleMissionWorldInteractionIntent } from '../../src/game/phaser/interaction/MissionWorkspaceThreeInteractionBridge.js';

const state = {
  selectedAgentId: 'glider-alpha',
  ui: {},
  mission: { agents: [{ id: 'glider-alpha' }, { id: 'glider-bravo' }] },
  plan: { agentPlans: [{ agentId: 'glider-alpha', waypoints: [] }], planningMarkers: [] }
};
const scene = {
  app: { state },
  selectGliderFromThree(agentId, intent) {
    if (!state.mission.agents.some((agent) => agent.id === agentId)) return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'rejected' });
    state.selectedAgentId = agentId;
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'accepted', selectedAgentId: agentId });
  },
  selectPriorityTargetFromThree(targetId, intent) {
    state.ui.selectedPriorityTargetId = targetId;
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'accepted', selectedTargetId: targetId });
  },
  handleThreeHoverIntent(intent) {
    state.ui.hoverCell = intent.gridCell;
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'noChange' });
  }
};
const bridge = createMissionWorkspaceThreeInteractionBridge(scene);
const waypointCount = state.plan.agentPlans[0].waypoints.length;
let result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'selectAgent', agentId: 'glider-bravo', metadata: { objectType: 'glider' } }));
assert.equal(result.status, 'accepted');
assert.equal(state.selectedAgentId, 'glider-bravo');
result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'selectPriorityTarget', targetId: 'star-1', metadata: { objectType: 'priorityTarget' } }));
assert.equal(result.status, 'accepted');
assert.equal(state.ui.selectedPriorityTargetId, 'star-1');
assert.equal(state.plan.agentPlans[0].waypoints.length, waypointCount, 'target inspection does not add a waypoint');
result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'hoverCell', gridCell: { x: 2, y: 2 }, metadata: { objectType: 'dropZone', objectId: 'zone-1' } }));
assert.equal(result.status, 'noChange');
assert.equal(state.selectedAgentId, 'glider-bravo', 'drop-zone inspection does not redeploy vehicle');

console.log('Three agent/target interaction smoke passed');