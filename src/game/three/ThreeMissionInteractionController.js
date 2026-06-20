import { createMissionWorldInteractionIntent, normalizeMissionWorldInteractionMode } from '../../core/rendering/MissionWorldInteractionIntent.js';
import { createThreeMissionHitTestContext, hitTestThreeMissionWorld } from './ThreeMissionHitTest.js';
import { THREE_MISSION_CAMERA_MOUSE_MAPPING, setThreeMissionCameraInteractionMode, threeMissionCameraControllerSummary } from './ThreeMissionCameraController.js';

export const THREE_MISSION_INTERACTION_CONTROLLER_VERSION = 'three-mission-interaction-controller-three-r1-1c';
export const THREE_MISSION_CLICK_THRESHOLD_CSS_PX = 5;

export function createThreeMissionInteractionController({ renderer, camera, domElement, coordinates, getViewModel, emitIntent, options = {} } = {}) {
  if (!domElement) throw new Error('createThreeMissionInteractionController requires a domElement.');
  const controller = {
    type: 'anchor.renderer.three-mission-interaction-controller',
    version: THREE_MISSION_INTERACTION_CONTROLLER_VERSION,
    renderer,
    camera: camera ?? renderer?.camera ?? null,
    cameraController: options.cameraController ?? renderer?.cameraController ?? null,
    domElement,
    coordinates,
    getViewModel: getViewModel ?? (() => renderer?.viewModel ?? null),
    emitIntent: emitIntent ?? (() => null),
    interactionMode: normalizeMissionWorldInteractionMode(options.interactionMode ?? 'selectInspect'),
    enabled: options.enabled !== false,
    allowEditing: options.allowEditing !== false,
    clickThresholdCssPx: Number(options.clickThresholdCssPx ?? THREE_MISSION_CLICK_THRESHOLD_CSS_PX),
    hoverFrame: null,
    pendingHoverEvent: null,
    lastHoverKey: null,
    sequence: 0,
    pointerDown: null,
    dragState: null,
    pointerCaptured: false,
    cameraGestureActive: false,
    cameraGestureType: null,
    cameraPointerButton: null,
    disposed: false,
    lastHit: null,
    lastPointerDiagnostics: null,
    lastPointerGesture: null,
    missionClickSuppressedReason: null,
    contextMenuPreventedCount: 0,
    lastIntent: null,
    lastResult: null,
    listeners: []
  };
  addListener(controller, domElement, 'pointerdown', (event) => onPointerDown(controller, event));
  addListener(controller, domElement, 'pointermove', (event) => onPointerMove(controller, event));
  addListener(controller, domElement, 'pointerup', (event) => onPointerUp(controller, event));
  addListener(controller, domElement, 'pointercancel', (event) => onPointerCancel(controller, event));
  addListener(controller, domElement, 'wheel', (event) => onWheel(controller, event), { passive: false });
  addListener(controller, domElement, 'contextmenu', (event) => {
    controller.contextMenuPreventedCount += 1;
    event.preventDefault();
  });
  const keyTarget = domElement.ownerDocument ?? globalThis.document;
  addListener(controller, keyTarget, 'keydown', (event) => onKeyDown(controller, event));
  return controller;
}

export function setThreeMissionInteractionMode(controller, mode) {
  if (!controller) return controller;
  controller.interactionMode = normalizeMissionWorldInteractionMode(mode);
  setThreeMissionCameraInteractionMode(controller.cameraController, controller.interactionMode);
  cancelThreeMissionInteraction(controller, { keepHover: true });
  return controller;
}

export function setThreeMissionInteractionEnabled(controller, enabled) {
  if (!controller) return controller;
  controller.enabled = enabled !== false;
  if (!controller.enabled) cancelThreeMissionInteraction(controller);
  return controller;
}

export function updateThreeMissionInteractionContext(controller, viewModel) {
  if (!controller) return controller;
  controller.viewModel = viewModel ?? controller.getViewModel?.() ?? null;
  return controller;
}

export function cancelThreeMissionInteraction(controller, options = {}) {
  if (!controller) return controller;
  releasePointer(controller);
  const dragWasActive = Boolean(controller.dragState?.active);
  controller.pointerDown = null;
  controller.dragState = null;
  controller.cameraGestureActive = false;
  controller.cameraGestureType = null;
  controller.cameraPointerButton = null;
  controller.cameraController?.endGesture?.();
  if (!options.keepHover) {
    controller.lastHoverKey = null;
    emit(controller, 'clearHover', { metadata: { objectType: null } });
  }
  if (dragWasActive) emit(controller, 'cancelWaypointMove', { waypointId: options.waypointId ?? null });
  return controller;
}

export function threeMissionInteractionControllerSummary(controller = {}) {
  return {
    type: 'anchor.renderer.three-mission-interaction-controller-summary',
    version: THREE_MISSION_INTERACTION_CONTROLLER_VERSION,
    interactionMode: controller.interactionMode ?? null,
    enabled: controller.enabled === true,
    allowEditing: controller.allowEditing !== false,
    clickThresholdCssPx: controller.clickThresholdCssPx ?? THREE_MISSION_CLICK_THRESHOLD_CSS_PX,
    hoverThrottledByAnimationFrame: true,
    pointerCaptured: controller.pointerCaptured === true,
    cameraGestureActive: controller.cameraGestureActive === true,
    cameraGestureType: controller.cameraGestureType ?? null,
    cameraPointerButton: controller.cameraPointerButton ?? null,
    pointerButton: controller.lastPointerGesture?.button ?? null,
    pointerDownClient: controller.lastPointerGesture?.pointerDownClient ?? null,
    pointerUpClient: controller.lastPointerGesture?.pointerUpClient ?? null,
    pointerMovementPixels: controller.lastPointerGesture?.movementPixels ?? 0,
    pointerGestureClassification: controller.lastPointerGesture?.classification ?? null,
    cameraMovedSincePointerDown: controller.lastPointerGesture?.cameraMovedSincePointerDown === true,
    missionClickSuppressedReason: controller.lastPointerGesture?.missionClickSuppressedReason ?? controller.missionClickSuppressedReason ?? null,
    cameraMouseMapping: { ...THREE_MISSION_CAMERA_MOUSE_MAPPING },
    contextMenuScopedToCanvas: true,
    contextMenuPreventedCount: Number(controller.contextMenuPreventedCount ?? 0),
    cameraController: threeMissionCameraControllerSummary(controller.cameraController ?? {}),
    waypointDragActive: controller.dragState?.active === true,
    dragWaypointId: controller.dragState?.waypointId ?? null,
    lastIntentId: controller.lastIntent?.intentId ?? null,
    disposed: controller.disposed === true,
    listenerCount: controller.listeners?.length ?? 0,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    usesRouteOptimizer: false
  };
}

export function disposeThreeMissionInteractionController(controller) {
  if (!controller || controller.disposed) return;
  cancelThreeMissionInteraction(controller);
  if (controller.hoverFrame) globalThis.cancelAnimationFrame?.(controller.hoverFrame);
  for (const { target, type, listener, options } of controller.listeners ?? []) target?.removeEventListener?.(type, listener, options);
  controller.listeners = [];
  controller.disposed = true;
}

function onPointerDown(controller, event) {
  if (!controller.enabled || controller.disposed) return;
  const hit = hitTest(controller, event);
  controller.lastHit = hit;
  const cameraGestureType = cameraGestureTypeForEvent(controller, event);
  const cameraGesture = Boolean(cameraGestureType);
  controller.pointerDown = {
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    button: event.button,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false,
    movementPixels: 0,
    hit,
    cameraGesture,
    cameraGestureType,
    cameraCountsBefore: cameraCounts(controller.cameraController),
    cameraTargetBefore: targetPlain(controller.cameraController?.target),
    cameraMovedSincePointerDown: false,
    waypointDragCandidate: controller.allowEditing !== false && !cameraGesture && isPrimaryButton(event) && isEditMode(controller) && hit.category === 'waypoint' && hit.waypointId
  };
  setPointerCapture(controller, event.pointerId);
  if (cameraGesture) {
    event.preventDefault?.();
    startCameraGestureFromPointer(controller, cameraGestureType, event.button);
  }
}

function onPointerMove(controller, event) {
  if (!controller.enabled || controller.disposed) return;
  scheduleHover(controller, event);
  if (!controller.pointerDown || controller.pointerDown.pointerId !== event.pointerId) return;
  const dx = event.clientX - controller.pointerDown.startX;
  const dy = event.clientY - controller.pointerDown.startY;
  const movementPixels = Math.hypot(dx, dy);
  const moved = movementPixels > controller.clickThresholdCssPx;
  controller.pointerDown.movementPixels = movementPixels;
  controller.pointerDown.moved = controller.pointerDown.moved || moved;
  if (!moved) return;
  if (controller.pointerDown.cameraGesture) {
    applyCameraDrag(controller, event.clientX - controller.pointerDown.lastX, event.clientY - controller.pointerDown.lastY, event);
    controller.pointerDown.lastX = event.clientX;
    controller.pointerDown.lastY = event.clientY;
    controller.pointerDown.cameraMovedSincePointerDown = cameraMovedSincePointerDown(controller, controller.pointerDown);
    return;
  }
  if (controller.pointerDown.waypointDragCandidate) {
    const hit = hitTest(controller, event, { preferGrid: true });
    const gridCell = hit.gridCell;
    const continuousPoint = hit.continuousPoint ?? hit.gridCell?.continuousPoint ?? hit.gridHit?.continuousPoint ?? hit.gridHit?.gridCell?.continuousPoint ?? null;
    controller.dragState = {
      active: true,
      waypointId: controller.pointerDown.hit.waypointId,
      agentId: controller.pointerDown.hit.agentId,
      startCell: controller.pointerDown.hit.gridCell,
      previewCell: gridCell,
      previewContinuousPoint: continuousPoint
    };
    emit(controller, 'previewWaypointMove', {
      waypointId: controller.dragState.waypointId,
      agentId: controller.dragState.agentId,
      gridCell,
      continuousPoint,
      worldPoint: hit.worldPoint,
      metadata: { objectType: 'waypoint', objectId: controller.dragState.waypointId, hitCategory: hit.category }
    });
    return;
  }
  if (isPrimaryButtonValue(controller.pointerDown.button)) {
    event.preventDefault?.();
    controller.pointerDown.cameraGesture = true;
    controller.pointerDown.cameraGestureType = 'pan';
    startCameraGestureFromPointer(controller, 'pan', controller.pointerDown.button);
    applyCameraDrag(controller, event.clientX - controller.pointerDown.lastX, event.clientY - controller.pointerDown.lastY, event);
    controller.pointerDown.lastX = event.clientX;
    controller.pointerDown.lastY = event.clientY;
    controller.pointerDown.cameraMovedSincePointerDown = cameraMovedSincePointerDown(controller, controller.pointerDown);
  }
}

function onPointerUp(controller, event) {
  if (!controller.enabled || controller.disposed) return;
  const pointerDown = controller.pointerDown;
  releasePointer(controller, event.pointerId);
  controller.pointerDown = null;
  if (!pointerDown || pointerDown.pointerId !== event.pointerId) return;
  pointerDown.endX = event.clientX;
  pointerDown.endY = event.clientY;
  pointerDown.movementPixels = Math.hypot(event.clientX - pointerDown.startX, event.clientY - pointerDown.startY);
  const preferGrid = controller.dragState?.active === true || prefersGridHitOnPointerUp(controller);
  const hit = hitTest(controller, event, preferGrid ? { preferGrid: true } : {});
  if (controller.dragState?.active) {
    recordPointerGesture(controller, pointerDown, {
      classification: 'waypointDrag',
      cameraMoved: false,
      missionClickSuppressedReason: 'waypointDragActive'
    });
    const continuousPoint = hit.continuousPoint ?? hit.gridCell?.continuousPoint ?? hit.gridHit?.continuousPoint ?? hit.gridHit?.gridCell?.continuousPoint ?? null;
    emit(controller, 'commitWaypointMove', {
      waypointId: controller.dragState.waypointId,
      agentId: controller.dragState.agentId,
      gridCell: hit.gridCell,
      continuousPoint,
      worldPoint: hit.worldPoint,
      metadata: { objectType: 'waypoint', objectId: controller.dragState.waypointId, hitCategory: hit.category }
    });
    controller.dragState = null;
    return;
  }
  const cameraMoved = pointerDown.cameraMovedSincePointerDown === true || cameraMovedSincePointerDown(controller, pointerDown);
  if (pointerDown.cameraGesture || pointerDown.moved || cameraMoved) {
    const classification = pointerDown.cameraGestureType ?? (isPrimaryButtonValue(pointerDown.button) ? 'pan' : 'cameraGesture');
    recordPointerGesture(controller, pointerDown, {
      classification,
      cameraMoved,
      missionClickSuppressedReason: cameraMoved || pointerDown.cameraGesture ? `${classification}Gesture` : 'pointerMovedBeyondClickThreshold'
    });
    controller.cameraGestureActive = false;
    controller.cameraGestureType = null;
    controller.cameraPointerButton = null;
    controller.cameraController?.endGesture?.();
    emit(controller, 'cameraChanged', { metadata: { objectType: 'camera', objectId: controller.renderer?.cameraState?.preset ?? 'manual', pointerGestureClassification: classification } });
    return;
  }
  if (!isPrimaryButton(event)) {
    recordPointerGesture(controller, pointerDown, {
      classification: 'nonPrimaryClickSuppressed',
      cameraMoved: false,
      missionClickSuppressedReason: 'nonPrimaryButton'
    });
    return;
  }
  recordPointerGesture(controller, pointerDown, {
    classification: 'missionClick',
    cameraMoved: false,
    missionClickSuppressedReason: null
  });
  handleClick(controller, hit, event);
}

function onPointerCancel(controller, event) {
  releasePointer(controller, event.pointerId);
  recordPointerGesture(controller, controller.pointerDown, {
    classification: 'cancelled',
    cameraMoved: false,
    missionClickSuppressedReason: 'pointerCancelled'
  });
  cancelThreeMissionInteraction(controller);
}

function onWheel(controller, event) {
  if (!controller.enabled || controller.disposed) return;
  event.preventDefault?.();
  controller.cameraController?.beginGesture?.('zoom', event.button ?? null);
  controller.cameraGestureActive = true;
  controller.cameraGestureType = 'zoom';
  controller.cameraPointerButton = event.button ?? null;
  controller.cameraController?.zoomByDelta?.(event.deltaY);
  controller.cameraController?.endGesture?.();
  controller.cameraGestureActive = false;
  controller.missionClickSuppressedReason = 'wheelZoom';
  controller.lastPointerGesture = {
    button: 'wheel',
    buttonIndex: null,
    pointerDownClient: null,
    pointerUpClient: null,
    movementPixels: 0,
    classification: 'wheelZoom',
    cameraMovedSincePointerDown: true,
    missionClickSuppressedReason: 'wheelZoom',
    cameraTargetBeforeGesture: null,
    cameraTargetAfterGesture: targetPlain(controller.cameraController?.target)
  };
  emit(controller, 'cameraChanged', { metadata: { objectType: 'camera', objectId: 'wheelZoom', cameraGestureType: 'zoom' } });
  controller.cameraGestureType = null;
  controller.cameraPointerButton = null;
}

function onKeyDown(controller, event) {
  if (controller.disposed || isTypingTarget(event.target)) return;
  if (event.key === 'Escape') {
    event.preventDefault?.();
    emit(controller, 'cancelInteraction', { metadata: { objectType: 'keyboard', objectId: 'Escape' } });
    cancelThreeMissionInteraction(controller);
    return;
  }
  if (controller.allowEditing !== false && (event.key === 'Delete' || event.key === 'Backspace')) {
    const viewModel = controller.viewModel ?? controller.getViewModel?.() ?? null;
    const selectedWaypoint = (viewModel?.waypoints ?? []).find((waypoint) => waypoint.selected);
    const selectedMarker = selectedWaypoint ? null : selectedMarkerFromViewModel(viewModel);
    if (selectedWaypoint?.waypointId) {
      event.preventDefault?.();
      emit(controller, 'deleteWaypoint', { waypointId: selectedWaypoint.waypointId, agentId: selectedWaypoint.agentId, metadata: { objectType: 'waypoint', objectId: selectedWaypoint.waypointId } });
    } else if (selectedMarker?.markerId) {
      event.preventDefault?.();
      emit(controller, 'deletePlanningMarker', { markerId: selectedMarker.markerId, metadata: { objectType: 'planningMarker', objectId: selectedMarker.markerId } });
    }
  }
}

function handleClick(controller, hit, event) {
  const gridCell = hit.gridCell;
  const continuousPoint = hit.continuousPoint ?? hit.gridCell?.continuousPoint ?? hit.gridHit?.continuousPoint ?? hit.gridHit?.gridCell?.continuousPoint ?? null;
  const viewModel = controller.viewModel ?? controller.getViewModel?.() ?? null;
  const deploymentActive = viewModel?.interactionViewModel?.deploymentSelectionActive === true;
  if (controller.interactionMode === 'placeWaypoint') {
    emit(controller, 'placeWaypoint', { gridCell, continuousPoint, worldPoint: hit.worldPoint, metadata: { objectType: hit.objectType, objectId: hit.objectId, hitCategory: hit.category } });
    return;
  }
  if (controller.interactionMode === 'placeSamplingTarget') {
    emit(controller, 'placeSamplingTarget', { gridCell, continuousPoint, worldPoint: hit.worldPoint, depthLayerId: gridCell?.depthLayerId ?? hit.depthLayerId ?? null, metadata: { objectType: hit.objectType, objectId: hit.objectId, hitCategory: hit.category } });
    return;
  }
  if (controller.interactionMode === 'placeMarker') {
    emit(controller, 'placePlanningMarker', { gridCell, continuousPoint, worldPoint: hit.worldPoint, metadata: { objectType: hit.objectType, objectId: hit.objectId, hitCategory: hit.category } });
    return;
  }
  if (controller.interactionMode === 'selectDeployment' || deploymentActive) {
    emit(controller, 'selectDeploymentCell', { gridCell, continuousPoint, worldPoint: hit.worldPoint, metadata: { objectType: hit.objectType, objectId: hit.objectId, hitCategory: hit.category } });
    return;
  }
  if (controller.interactionMode === 'navigate') {
    emit(controller, 'hoverCell', { gridCell, continuousPoint, worldPoint: hit.worldPoint, metadata: { objectType: hit.objectType, objectId: hit.objectId, hitCategory: hit.category } });
    return;
  }
  if (hit.category === 'waypoint') emit(controller, 'selectWaypoint', { waypointId: hit.waypointId, agentId: hit.agentId, gridCell, metadata: { objectType: 'waypoint', objectId: hit.waypointId } });
  else if (hit.category === 'planningMarker') emit(controller, 'deletePlanningMarker', { markerId: hit.markerId, gridCell, metadata: { objectType: 'planningMarker', objectId: hit.markerId, selectOnly: true } });
  else if (hit.category === 'glider') emit(controller, 'selectAgent', { agentId: hit.agentId, gridCell, metadata: { objectType: 'glider', objectId: hit.agentId } });
  else if (hit.category === 'priorityTarget') emit(controller, 'selectPriorityTarget', { targetId: hit.targetId, gridCell, metadata: { objectType: 'priorityTarget', objectId: hit.targetId } });
  else if (hit.category === 'samplingTarget') emit(controller, 'selectSamplingTarget', { targetId: hit.targetId, gridCell, metadata: { objectType: 'samplingTarget', objectId: hit.targetId } });
  else if (hit.category === 'observation') emit(controller, 'selectObservation', { observationId: hit.observationId ?? hit.objectId, agentId: hit.agentId, gridCell, metadata: { objectType: 'observation', objectId: hit.observationId ?? hit.objectId } });
  else if (hit.category === 'surfacingEvent') emit(controller, 'selectSurfacingEvent', { surfacingEventId: hit.surfacingEventId ?? hit.objectId, agentId: hit.agentId, gridCell, metadata: { objectType: 'surfacingEvent', objectId: hit.surfacingEventId ?? hit.objectId } });
  else if (hit.category === 'routeFailure') emit(controller, 'selectRouteFailure', { routeFailureId: hit.routeFailureId ?? hit.objectId, agentId: hit.agentId, gridCell, metadata: { objectType: 'routeFailure', objectId: hit.routeFailureId ?? hit.objectId } });
  else if (hit.category === 'realizedTrajectory' || hit.category === 'routeSegment') emit(controller, 'selectRouteSegment', { routeSegmentId: hit.routeSegmentId ?? hit.objectId, agentId: hit.agentId, gridCell, metadata: { objectType: hit.category, objectId: hit.routeSegmentId ?? hit.objectId } });
  else emit(controller, 'hoverCell', { gridCell, worldPoint: hit.worldPoint, metadata: { objectType: hit.objectType, objectId: hit.objectId, hitCategory: hit.category } });
}

function scheduleHover(controller, event) {
  controller.pendingHoverEvent = copyPointerEvent(event);
  if (controller.hoverFrame) return;
  controller.hoverFrame = globalThis.requestAnimationFrame?.(() => {
    controller.hoverFrame = null;
    const pointer = controller.pendingHoverEvent;
    controller.pendingHoverEvent = null;
    if (!pointer) return;
    const hit = hitTest(controller, pointer);
    const key = `${hit.category}:${hit.objectId ?? ''}:${hit.gridCell?.x ?? ''}:${hit.gridCell?.y ?? ''}`;
    if (key === controller.lastHoverKey) return;
    controller.lastHoverKey = key;
    emit(controller, 'hoverCell', { gridCell: hit.gridCell, worldPoint: hit.worldPoint, metadata: { objectType: hit.objectType, objectId: hit.objectId, hitCategory: hit.category } });
  }) ?? null;
}

function hitTest(controller, event, options = {}) {
  const viewModel = controller.viewModel ?? controller.getViewModel?.() ?? null;
  const context = createThreeMissionHitTestContext({ renderer: controller.renderer, camera: controller.camera, domElement: controller.domElement, viewModel });
  const hit = hitTestThreeMissionWorld(context, event, options);
  controller.lastPointerDiagnostics = hit.pointerDiagnostics ?? context.lastPointerDiagnostics ?? null;
  controller.lastHit = hit;
  return hit;
}

function emit(controller, intentId, patch = {}) {
  const viewModel = controller.viewModel ?? controller.getViewModel?.() ?? null;
  const intent = createMissionWorldInteractionIntent({
    intentId,
    interactionMode: controller.interactionMode,
    pointerType: patch.pointerType ?? controller.pointerDown?.pointerType ?? null,
    pointerId: patch.pointerId ?? controller.pointerDown?.pointerId ?? null,
    modifiers: patch.modifiers ?? {},
    missionId: viewModel?.missionId ?? null,
    continuousPoint: patch.continuousPoint ?? patch.gridCell?.continuousPoint ?? null,
    activeTimeSeconds: viewModel?.activeTimeSeconds ?? 0,
    sourceBackend: 'threeMission3d',
    sequence: ++controller.sequence,
    ...patch
  });
  controller.lastIntent = intent;
  const result = controller.emitIntent?.(intent) ?? null;
  controller.lastResult = result;
  return result;
}

function prefersGridHitOnPointerUp(controller) {
  const viewModel = controller.viewModel ?? controller.getViewModel?.() ?? null;
  const deploymentActive = viewModel?.interactionViewModel?.deploymentSelectionActive === true;
  return deploymentActive === true || ['placeWaypoint', 'placeSamplingTarget', 'placeMarker', 'selectDeployment', 'navigate'].includes(controller.interactionMode);
}
function cameraGestureTypeForEvent(controller, event) {
  if (event.button === 2) return 'orbit';
  if (event.button === 1) return 'dolly';
  return null;
}

function isEditMode(controller) {
  return controller.interactionMode === 'selectInspect' || controller.interactionMode === 'editWaypoint';
}

function isPrimaryButton(event) {
  return Number(event.button ?? 0) === 0;
}

function applyCameraDrag(controller, dx, dy, event) {
  const gestureType = controller.pointerDown?.cameraGestureType ?? cameraGestureTypeForEvent(controller, event);
  if (gestureType === 'pan') controller.cameraController?.panBy?.(dx, dy);
  else if (gestureType === 'dolly') controller.cameraController?.zoomByDelta?.(dy);
  else controller.cameraController?.orbitBy?.(dx, dy);
}

function startCameraGestureFromPointer(controller, gestureType, button) {
  controller.cameraGestureActive = true;
  controller.cameraGestureType = gestureType;
  controller.cameraPointerButton = button;
  controller.cameraController?.beginGesture?.(gestureType, button);
  if (controller.domElement?.style && gestureType === 'pan') controller.domElement.style.cursor = 'grabbing';
}

function cameraMovedSincePointerDown(controller, pointerDown = {}) {
  const before = pointerDown.cameraCountsBefore ?? {};
  const after = cameraCounts(controller.cameraController);
  return after.orbit !== before.orbit || after.pan !== before.pan || after.zoom !== before.zoom;
}

function cameraCounts(cameraController = {}) {
  return {
    orbit: Number(cameraController?.orbitChangeCount ?? 0),
    pan: Number(cameraController?.panChangeCount ?? 0),
    zoom: Number(cameraController?.zoomChangeCount ?? 0)
  };
}

function recordPointerGesture(controller, pointerDown, options = {}) {
  if (!pointerDown) return;
  controller.missionClickSuppressedReason = options.missionClickSuppressedReason ?? null;
  controller.lastPointerGesture = {
    button: pointerButtonName(pointerDown.button),
    buttonIndex: Number(pointerDown.button ?? 0),
    pointerDownClient: { x: round(pointerDown.startX), y: round(pointerDown.startY) },
    pointerUpClient: { x: round(pointerDown.endX ?? pointerDown.lastX ?? pointerDown.startX), y: round(pointerDown.endY ?? pointerDown.lastY ?? pointerDown.startY) },
    movementPixels: round(pointerDown.movementPixels ?? 0),
    classification: options.classification ?? 'unknown',
    cameraMovedSincePointerDown: options.cameraMoved === true,
    missionClickSuppressedReason: options.missionClickSuppressedReason ?? null,
    cameraTargetBeforeGesture: pointerDown.cameraTargetBefore ?? null,
    cameraTargetAfterGesture: targetPlain(controller.cameraController?.target)
  };
  if (controller.domElement?.style && options.classification !== 'pan') controller.domElement.style.cursor = '';
}

function targetPlain(target = {}) {
  if (!target) return null;
  return { x: round(target.x), y: round(target.y), z: round(target.z) };
}

function pointerButtonName(button) {
  if (Number(button) === 0) return 'left';
  if (Number(button) === 1) return 'middle';
  if (Number(button) === 2) return 'right';
  return String(button ?? 'unknown');
}

function isPrimaryButtonValue(button) {
  return Number(button ?? 0) === 0;
}

function round(value, digits = 3) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : null;
}

function setPointerCapture(controller, pointerId) {
  try {
    controller.domElement.setPointerCapture?.(pointerId);
    controller.pointerCaptured = true;
  } catch {}
}

function releasePointer(controller, pointerId = controller.pointerDown?.pointerId) {
  if (pointerId != null) {
    try { controller.domElement.releasePointerCapture?.(pointerId); } catch {}
  }
  controller.pointerCaptured = false;
}

function addListener(controller, target, type, listener, options = undefined) {
  target?.addEventListener?.(type, listener, options);
  controller.listeners.push({ target, type, listener, options });
}

function copyPointerEvent(event) {
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    pointerType: event.pointerType,
    pointerId: event.pointerId,
    button: event.button,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey
  };
}

function isTypingTarget(target) {
  const tag = String(target?.tagName ?? '').toLowerCase();
  return tag === 'input' || tag === 'select' || tag === 'textarea' || target?.isContentEditable === true;
}

function selectedMarkerFromViewModel(viewModel = {}) {
  return (viewModel?.planningMarkers ?? []).find((marker) => marker.selected) ?? null;
}
