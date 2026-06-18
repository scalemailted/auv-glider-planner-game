import * as THREE from 'three';

export const THREE_MISSION_CAMERA_CONTROLLER_VERSION = 'three-mission-camera-controller-three-r1-1b';

const DEFAULT_MIN_POLAR = 0.14;
const DEFAULT_MAX_POLAR = 1.34;

export function createThreeMissionCameraController(options = {}) {
  const camera = options.camera ?? options.renderer?.camera ?? null;
  if (!camera) throw new Error('createThreeMissionCameraController requires a Three camera.');
  const controller = {
    type: 'anchor.renderer.three-mission-camera-controller',
    version: THREE_MISSION_CAMERA_CONTROLLER_VERSION,
    camera,
    renderer: options.renderer ?? null,
    mode: options.mode ?? 'orbit',
    presetId: options.presetId ?? options.preset ?? 'obliqueMission',
    cameraMode: options.cameraMode ?? 'missionPlanning',
    target: vector3(options.target ?? { x: 0, y: 0, z: 0 }),
    azimuthRadians: finiteNumber(options.azimuthRadians, -0.58),
    polarRadians: finiteNumber(options.polarRadians, 0.78),
    distance: finiteNumber(options.distance, 24),
    minPolarRadians: finiteNumber(options.minPolarRadians, DEFAULT_MIN_POLAR),
    maxPolarRadians: finiteNumber(options.maxPolarRadians, DEFAULT_MAX_POLAR),
    minDistance: finiteNumber(options.minDistance, 4),
    maxDistance: finiteNumber(options.maxDistance, 96),
    bounds: normalizeBounds(options.bounds),
    interactionToolId: options.interactionToolId ?? 'selectInspect',
    orbitEnabled: options.orbitEnabled !== false,
    panEnabled: options.panEnabled !== false,
    zoomEnabled: options.zoomEnabled !== false,
    gestureActive: false,
    gestureType: null,
    pointerButton: null,
    orbitChangeCount: 0,
    panChangeCount: 0,
    zoomChangeCount: 0,
    disposed: false,
    listeners: []
  };
  updateThreeMissionCameraBounds(controller, controller.bounds);
  setThreeMissionCameraPreset(controller, controller.presetId, { preserveTarget: Boolean(options.target) });
  return installControllerMethods(controller);
}

export function setThreeMissionCameraMode(controller, mode) {
  if (!controller) return controller;
  controller.mode = mode ?? 'orbit';
  return controller;
}

export function setThreeMissionCameraPreset(controller, presetId, context = {}) {
  if (!controller || controller.disposed) return controller;
  const preset = normalizePresetId(presetId);
  controller.presetId = preset;
  const bounds = normalizeBounds(context.bounds ?? controller.bounds);
  controller.bounds = bounds;
  const radius = Math.max(6, bounds.radius);
  if (!context.preserveTarget) {
    controller.target = vector3(context.target ?? bounds.center);
  }
  if (preset === 'tacticalTopDown') {
    controller.azimuthRadians = 0.001;
    controller.polarRadians = 0.16;
    controller.distance = radius * 1.72;
  } else if (preset === 'waterColumnProfile') {
    controller.azimuthRadians = 0;
    controller.polarRadians = 1.18;
    controller.distance = radius * 1.78;
  } else if (preset === 'fleetOverview') {
    controller.azimuthRadians = -0.72;
    controller.polarRadians = 0.68;
    controller.distance = radius * 2.12;
  } else {
    controller.azimuthRadians = -0.62;
    controller.polarRadians = 0.78;
    controller.distance = radius * 1.72;
  }
  clampController(controller);
  applyCamera(controller);
  markRendererCamera(controller, { manual: false, preset });
  return controller;
}

export function focusThreeMissionCamera(controller, target, options = {}) {
  if (!controller || controller.disposed || !target) return controller;
  controller.target = clampTarget(controller, vector3(target));
  if (options.distance) controller.distance = finiteNumber(options.distance, controller.distance);
  if (options.presetId) controller.presetId = normalizePresetId(options.presetId);
  clampController(controller);
  applyCamera(controller);
  markRendererCamera(controller, { manual: true, preset: options.presetId ?? 'manualFocus' });
  return controller;
}

export function resetThreeMissionCamera(controller, options = {}) {
  return setThreeMissionCameraPreset(controller, options.presetId ?? 'obliqueMission', { bounds: options.bounds ?? controller?.bounds });
}

export function updateThreeMissionCameraBounds(controller, bounds) {
  if (!controller || controller.disposed) return controller;
  controller.bounds = normalizeBounds(bounds);
  controller.minDistance = Math.max(3, controller.bounds.radius * 0.32);
  controller.maxDistance = Math.max(18, controller.bounds.radius * 4.2);
  controller.target = clampTarget(controller, controller.target);
  controller.distance = clamp(controller.distance, controller.minDistance, controller.maxDistance);
  applyCamera(controller);
  return controller;
}

export function setThreeMissionCameraInteractionMode(controller, toolId) {
  if (!controller) return controller;
  controller.interactionToolId = toolId ?? 'selectInspect';
  return controller;
}

export function threeMissionCameraControllerSummary(controller = {}) {
  return {
    type: 'anchor.renderer.three-mission-camera-controller-summary',
    version: THREE_MISSION_CAMERA_CONTROLLER_VERSION,
    cameraPresetId: controller.presetId ?? null,
    cameraMode: controller.cameraMode ?? controller.mode ?? null,
    cameraAzimuthRadians: round(controller.azimuthRadians),
    cameraPolarRadians: round(controller.polarRadians),
    cameraDistance: round(controller.distance),
    cameraTarget: plainVector(controller.target),
    cameraOrbitEnabled: controller.orbitEnabled === true,
    cameraPanEnabled: controller.panEnabled === true,
    cameraZoomEnabled: controller.zoomEnabled === true,
    cameraGestureActive: controller.gestureActive === true,
    cameraGestureType: controller.gestureType ?? null,
    cameraPointerButton: controller.pointerButton ?? null,
    cameraOrbitChangeCount: Number(controller.orbitChangeCount ?? 0),
    cameraPanChangeCount: Number(controller.panChangeCount ?? 0),
    cameraZoomChangeCount: Number(controller.zoomChangeCount ?? 0),
    lastCameraPosition: plainVector(controller.camera?.position),
    lastCameraTarget: plainVector(controller.target),
    bounds: controller.bounds ? {
      minX: round(controller.bounds.minX),
      maxX: round(controller.bounds.maxX),
      minZ: round(controller.bounds.minZ),
      maxZ: round(controller.bounds.maxZ),
      radius: round(controller.bounds.radius)
    } : null,
    disposed: controller.disposed === true,
    listenerCount: controller.listeners?.length ?? 0,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    changesOfficialBrowserScoring: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    exposesHiddenTruth: false
  };
}

export function disposeThreeMissionCameraController(controller) {
  if (!controller || controller.disposed) return;
  for (const { target, type, listener, options } of controller.listeners ?? []) target?.removeEventListener?.(type, listener, options);
  controller.listeners = [];
  controller.disposed = true;
}

function installControllerMethods(controller) {
  controller.beginGesture = (type, pointerButton = null) => beginCameraGesture(controller, type, pointerButton);
  controller.endGesture = () => endCameraGesture(controller);
  controller.orbitBy = (deltaX, deltaY) => orbitCameraBy(controller, deltaX, deltaY);
  controller.panBy = (deltaX, deltaY) => panCameraBy(controller, deltaX, deltaY);
  controller.zoomByDelta = (deltaY) => zoomCameraByDelta(controller, deltaY);
  controller.apply = () => applyCamera(controller);
  return controller;
}

function beginCameraGesture(controller, type, pointerButton = null) {
  controller.gestureActive = true;
  controller.gestureType = type;
  controller.pointerButton = pointerButton;
  return controller;
}

function endCameraGesture(controller) {
  controller.gestureActive = false;
  controller.gestureType = null;
  controller.pointerButton = null;
  return controller;
}

function orbitCameraBy(controller, deltaX, deltaY) {
  if (!controller?.orbitEnabled || controller.disposed) return controller;
  controller.azimuthRadians -= finiteNumber(deltaX, 0) * 0.008;
  controller.polarRadians += finiteNumber(deltaY, 0) * 0.006;
  controller.orbitChangeCount += 1;
  clampController(controller);
  applyCamera(controller);
  markRendererCamera(controller, { manual: true, preset: 'manualOrbit' });
  return controller;
}

function panCameraBy(controller, deltaX, deltaY) {
  if (!controller?.panEnabled || controller.disposed) return controller;
  const camera = controller.camera;
  const panScale = Math.max(0.008, controller.distance * 0.0018);
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const nextTarget = controller.target.clone()
    .addScaledVector(right, -finiteNumber(deltaX, 0) * panScale)
    .addScaledVector(forward, finiteNumber(deltaY, 0) * panScale);
  controller.target = clampTarget(controller, nextTarget);
  controller.panChangeCount += 1;
  applyCamera(controller);
  markRendererCamera(controller, { manual: true, preset: 'manualPan' });
  return controller;
}

function zoomCameraByDelta(controller, deltaY) {
  if (!controller?.zoomEnabled || controller.disposed) return controller;
  const factor = finiteNumber(deltaY, 0) > 0 ? 1.1 : 0.9;
  controller.distance = clamp(controller.distance * factor, controller.minDistance, controller.maxDistance);
  controller.zoomChangeCount += 1;
  applyCamera(controller);
  markRendererCamera(controller, { manual: true, preset: 'manualZoom' });
  return controller;
}

function applyCamera(controller) {
  if (!controller?.camera || controller.disposed) return controller;
  clampController(controller);
  const sinPolar = Math.sin(controller.polarRadians);
  const offset = new THREE.Vector3(
    Math.sin(controller.azimuthRadians) * sinPolar * controller.distance,
    Math.cos(controller.polarRadians) * controller.distance,
    Math.cos(controller.azimuthRadians) * sinPolar * controller.distance
  );
  const position = controller.target.clone().add(offset);
  position.y = Math.max(0.65, position.y);
  controller.camera.position.copy(position);
  controller.camera.lookAt(controller.target);
  controller.camera.updateMatrixWorld?.(true);
  controller.camera.updateProjectionMatrix?.();
  return controller;
}

function markRendererCamera(controller, patch = {}) {
  if (!controller?.renderer) return;
  controller.renderer.cameraState = {
    ...(controller.renderer.cameraState ?? {}),
    preset: patch.preset ?? controller.presetId ?? 'manual',
    manual: patch.manual ?? true,
    azimuthRadians: controller.azimuthRadians,
    polarRadians: controller.polarRadians,
    distance: controller.distance,
    target: plainVector(controller.target)
  };
}

function clampController(controller) {
  controller.polarRadians = clamp(controller.polarRadians, controller.minPolarRadians, controller.maxPolarRadians);
  controller.distance = clamp(controller.distance, controller.minDistance, controller.maxDistance);
  controller.target = clampTarget(controller, controller.target);
}

function clampTarget(controller, target) {
  const bounds = normalizeBounds(controller.bounds);
  return new THREE.Vector3(
    clamp(finiteNumber(target?.x, 0), bounds.minX, bounds.maxX),
    clamp(finiteNumber(target?.y, 0), bounds.minY, bounds.maxY),
    clamp(finiteNumber(target?.z, 0), bounds.minZ, bounds.maxZ)
  );
}

function normalizePresetId(presetId) {
  if (presetId === 'tacticalTopDown' || presetId === 'waterColumnProfile' || presetId === 'fleetOverview') return presetId;
  if (presetId === 'resetCamera') return 'obliqueMission';
  return 'obliqueMission';
}

function normalizeBounds(input = {}) {
  const radius = Math.max(6, finiteNumber(input.radius, Math.max(Math.abs(input.maxX ?? 8), Math.abs(input.maxZ ?? 8), 8)));
  const padding = finiteNumber(input.padding, Math.max(2, radius * 0.35));
  const minX = finiteNumber(input.minX, -radius) - padding;
  const maxX = finiteNumber(input.maxX, radius) + padding;
  const minZ = finiteNumber(input.minZ, -radius) - padding;
  const maxZ = finiteNumber(input.maxZ, radius) + padding;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    minY: finiteNumber(input.minY, -2),
    maxY: finiteNumber(input.maxY, 8),
    radius,
    padding,
    center: vector3(input.center ?? { x: (minX + maxX) / 2, y: 0, z: (minZ + maxZ) / 2 })
  };
}

function vector3(input = {}) {
  if (input?.isVector3) return input.clone();
  return new THREE.Vector3(finiteNumber(input.x, 0), finiteNumber(input.y, 0), finiteNumber(input.z, 0));
}

function plainVector(input = {}) {
  if (!input) return null;
  return { x: round(input.x), y: round(input.y), z: round(input.z) };
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, finiteNumber(value, min)));
}

function round(value, digits = 6) {
  return Number(finiteNumber(value, 0).toFixed(digits));
}
