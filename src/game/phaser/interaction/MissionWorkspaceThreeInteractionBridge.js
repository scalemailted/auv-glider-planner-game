import { validateMissionWorldInteractionIntent } from '../../../core/rendering/MissionWorldInteractionIntent.js';
import {
  createMissionWorldInteractionResult,
  validateMissionWorldInteractionResult
} from '../../../core/rendering/MissionWorldInteractionResult.js';

export const MISSION_WORKSPACE_THREE_INTERACTION_BRIDGE_VERSION = 'mission-workspace-three-interaction-bridge-gfx-r3b';
const TRAIL_LIMIT = 20;

export function createMissionWorkspaceThreeInteractionBridge(scene, options = {}) {
  if (!scene) throw new Error('createMissionWorkspaceThreeInteractionBridge requires a MissionWorkspaceScene.');
  return {
    type: 'anchor.phaser.mission-workspace-three-interaction-bridge',
    version: MISSION_WORKSPACE_THREE_INTERACTION_BRIDGE_VERSION,
    scene,
    options,
    handledCount: 0,
    failedCount: 0,
    disposed: false,
    lastIntent: null,
    lastResult: null,
    boundaryFlags: {
      ownsPlanning: false,
      ownsSimulation: false,
      ownsScoring: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false
    }
  };
}

export function handleMissionWorldInteractionIntent(bridge, intent) {
  if (!bridge || bridge.disposed) return invalidResult(intent, 'Three interaction bridge is not active.');
  const scene = bridge.scene;
  bridge.handledCount += 1;
  bridge.lastIntent = intent;
  const validation = validateMissionWorldInteractionIntent(intent);
  if (!validation.valid) {
    bridge.failedCount += 1;
    return recordResult(bridge, invalidResult(intent, validation.errors[0] ?? 'Invalid Three interaction intent.'));
  }
  try {
    const result = routeIntent(scene, intent);
    return recordResult(bridge, result);
  } catch (error) {
    bridge.failedCount += 1;
    return recordResult(bridge, createMissionWorldInteractionResult({
      intentId: intent?.intentId,
      status: 'rejected',
      userMessage: `Three interaction failed: ${error?.message ?? error}`,
      warnings: [String(error?.message ?? error)],
      severity: 'error'
    }));
  }
}

export function missionWorkspaceThreeInteractionBridgeSummary(bridge = {}) {
  return {
    type: 'anchor.phaser.mission-workspace-three-interaction-bridge-summary',
    version: MISSION_WORKSPACE_THREE_INTERACTION_BRIDGE_VERSION,
    handledCount: bridge.handledCount ?? 0,
    failedCount: bridge.failedCount ?? 0,
    lastIntentId: bridge.lastIntent?.intentId ?? null,
    lastResultStatus: bridge.lastResult?.status ?? null,
    disposed: bridge.disposed === true,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false
  };
}

export function disposeMissionWorkspaceThreeInteractionBridge(bridge) {
  if (bridge) bridge.disposed = true;
}

function routeIntent(scene, intent) {
  const id = intent.intentId;
  if (id === 'hoverCell') return scene.handleThreeHoverIntent?.(intent) ?? noChange(intent, 'Hover updated.');
  if (id === 'clearHover') return scene.clearThreeHoverIntent?.(intent) ?? noChange(intent, 'Hover cleared.');
  if (id === 'selectAgent') return scene.selectGliderFromThree?.(intent.agentId, intent) ?? rejected(intent, 'No glider is available at that point.');
  if (id === 'selectWaypoint') return scene.selectWaypointById?.(intent.waypointId, intent) ?? rejected(intent, 'No waypoint is available at that point.');
  if (id === 'selectPriorityTarget') return scene.selectPriorityTargetFromThree?.(intent.targetId, intent) ?? rejected(intent, 'No priority target is available at that point.');
  if (id === 'placeWaypoint') return scene.placeWaypointFromThree?.(intent) ?? rejected(intent, 'Waypoint placement is not available.');
  if (id === 'previewWaypointMove') return scene.previewWaypointMoveFromThree?.(intent) ?? noChange(intent, 'Waypoint move preview unavailable.');
  if (id === 'commitWaypointMove') return scene.commitWaypointMoveFromThree?.(intent) ?? rejected(intent, 'Waypoint move is not available.');
  if (id === 'cancelWaypointMove') return scene.cancelWaypointMoveFromThree?.(intent) ?? cancelled(intent, 'Waypoint move cancelled.');
  if (id === 'deleteWaypoint') return scene.deleteWaypointById?.(intent.waypointId, intent) ?? rejected(intent, 'No waypoint is selected for deletion.');
  if (id === 'placePlanningMarker') return scene.placePlanningMarkerFromThree?.(intent) ?? rejected(intent, 'Planning marker placement is not available.');
  if (id === 'deletePlanningMarker') return scene.deletePlanningMarkerFromThree?.(intent) ?? rejected(intent, 'No planning marker is selected for deletion.');
  if (id === 'requestRoutePreview') return scene.requestRoutePreviewFromThree?.(intent) ?? noChange(intent, 'Route preview uses the canonical guidance overlay.');
  if (id === 'clearRoutePreview') return scene.clearRoutePreviewFromThree?.(intent) ?? noChange(intent, 'Route preview cleared.');
  if (id === 'cameraChanged') return scene.handleThreeCameraChanged?.(intent) ?? noChange(intent, 'Three camera changed.');
  if (id === 'cancelInteraction') return scene.cancelThreeInteractionFromIntent?.(intent) ?? cancelled(intent, 'Interaction cancelled.');
  return noChange(intent, 'Interaction ignored.');
}

function recordResult(bridge, result) {
  bridge.lastResult = result;
  const ui = bridge.scene?.app?.state?.ui;
  if (ui) {
    ui.threeMissionInteraction ??= {};
    ui.threeMissionInteraction.lastIntent = summarizeIntent(bridge.lastIntent);
    ui.threeMissionInteraction.lastResult = summarizeResult(result);
    ui.threeMissionInteraction.lastResultStatus = result?.status ?? null;
    ui.threeMissionInteraction.lastUserMessage = result?.userMessage ?? '';
    ui.threeMissionInteraction.lastUpdatedAt = Date.now();
    ui.threeMissionInteraction.lastInteractionIntents = [
      ...(ui.threeMissionInteraction.lastInteractionIntents ?? []),
      { intent: summarizeIntent(bridge.lastIntent), result: summarizeResult(result) }
    ].slice(-TRAIL_LIMIT);
  }
  const resultValidation = validateMissionWorldInteractionResult(result);
  if (!resultValidation.valid) bridge.failedCount += 1;
  return result;
}

function invalidResult(intent, message) {
  return createMissionWorldInteractionResult({ intentId: intent?.intentId, status: 'invalid', userMessage: message, warnings: [message] });
}

function rejected(intent, message, patch = {}) {
  return createMissionWorldInteractionResult({ intentId: intent?.intentId, status: 'rejected', userMessage: message, warnings: [message], ...patch });
}

function noChange(intent, message, patch = {}) {
  return createMissionWorldInteractionResult({ intentId: intent?.intentId, status: 'noChange', userMessage: message, ...patch });
}

function cancelled(intent, message, patch = {}) {
  return createMissionWorldInteractionResult({ intentId: intent?.intentId, status: 'cancelled', userMessage: message, ...patch });
}

function summarizeIntent(intent = {}) {
  return {
    intentId: intent.intentId ?? null,
    interactionMode: intent.interactionMode ?? null,
    agentId: intent.agentId ?? null,
    waypointId: intent.waypointId ?? null,
    markerId: intent.markerId ?? null,
    targetId: intent.targetId ?? null,
    gridCell: intent.gridCell ? { x: intent.gridCell.x, y: intent.gridCell.y } : null,
    objectType: intent.metadata?.objectType ?? null,
    objectId: intent.metadata?.objectId ?? null,
    sequence: intent.sequence ?? null
  };
}

function summarizeResult(result = {}) {
  return {
    status: result.status ?? null,
    accepted: result.accepted === true,
    changedCanonicalState: result.changedCanonicalState === true,
    selectedAgentId: result.selectedAgentId ?? null,
    selectedWaypointId: result.selectedWaypointId ?? null,
    selectedMarkerId: result.selectedMarkerId ?? null,
    selectedTargetId: result.selectedTargetId ?? null,
    committedGridCell: result.committedGridCell ? { x: result.committedGridCell.x, y: result.committedGridCell.y } : null,
    userMessage: result.userMessage ?? '',
    severity: result.severity ?? null
  };
}
