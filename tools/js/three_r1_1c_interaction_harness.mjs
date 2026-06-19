import * as THREE from 'three';

import { createMissionWorldFixture } from './mission_world_fixture.mjs';
import { missionWorldRenderInputFromWorkspace } from '../../src/core/rendering/MissionWorldStateAdapter.js';
import { buildMissionWorldRenderViewModel } from '../../src/core/rendering/MissionWorldRenderViewModel.js';
import { gridCellToWorld } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeMissionCameraController } from '../../src/game/three/ThreeMissionCameraController.js';
import { createThreeMissionInteractionController } from '../../src/game/three/ThreeMissionInteractionController.js';

export function createFakeDomElement({ width = 520, height = 360 } = {}) {
  const listeners = [];
  const removed = [];
  const listenerMap = new Map();
  const rect = { left: 0, top: 0, width, height, right: width, bottom: height };

  function add(targetName, type, listener, options) {
    listeners.push({ targetName, type, listener, options, removed: false });
    listenerMap.set(`${targetName}:${type}`, listener);
  }

  function remove(targetName, type, listener) {
    removed.push({ targetName, type, listener });
    for (const record of listeners) {
      if (record.targetName === targetName && record.type === type && (!listener || record.listener === listener)) record.removed = true;
    }
    listenerMap.delete(`${targetName}:${type}`);
  }

  const ownerDocument = {
    addEventListener(type, listener, options) { add('document', type, listener, options); },
    removeEventListener(type, listener) { remove('document', type, listener); }
  };

  return {
    style: {},
    ownerDocument,
    __listeners: listeners,
    __removedListeners: removed,
    __listenerMap: listenerMap,
    __capturedPointers: new Set(),
    addEventListener(type, listener, options) { add('dom', type, listener, options); },
    removeEventListener(type, listener) { remove('dom', type, listener); },
    setPointerCapture(pointerId) { this.__capturedPointers.add(pointerId); },
    releasePointerCapture(pointerId) { this.__capturedPointers.delete(pointerId); },
    getBoundingClientRect() { return { ...rect }; }
  };
}

export function createThreeInteractionHarness({ interactionMode = 'placeWaypoint', width = 520, height = 360, emitIntent = null } = {}) {
  const fixture = createMissionWorldFixture();
  const app = { state: fixture.state };
  const renderInput = missionWorldRenderInputFromWorkspace({ app });
  const viewModel = buildMissionWorldRenderViewModel(renderInput);
  const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
  const renderer = { viewModel, camera, cameraState: { preset: 'obliqueMission' }, groups: {} };
  const cameraController = createThreeMissionCameraController({
    camera,
    renderer,
    presetId: 'obliqueMission',
    bounds: {
      minX: viewModel.worldBounds.minX,
      maxX: viewModel.worldBounds.maxX,
      minZ: viewModel.worldBounds.minZ,
      maxZ: viewModel.worldBounds.maxZ,
      radius: Math.max(viewModel.grid.width, viewModel.grid.height)
    }
  });
  renderer.cameraController = cameraController;
  renderer.interactionSurface = createInteractionSurface(viewModel);
  const domElement = createFakeDomElement({ width, height });
  const emitted = [];
  const controller = createThreeMissionInteractionController({
    renderer,
    camera,
    domElement,
    getViewModel: () => viewModel,
    emitIntent: emitIntent ?? ((intent) => {
      emitted.push(intent);
      return { status: 'accepted', changedCanonicalState: intent.intentId === 'placeWaypoint', userMessage: intent.intentId };
    }),
    options: { interactionMode, cameraController }
  });
  return {
    fixture,
    app,
    renderInput,
    viewModel,
    camera,
    renderer,
    cameraController,
    domElement,
    emitted,
    controller,
    pointForGridCell: (x, y) => screenPointForGridCell(viewModel, camera, width, height, x, y)
  };
}

export function dispatchDomEvent(domElement, type, patch = {}) {
  const listener = domElement.__listenerMap.get(`dom:${type}`);
  if (!listener) throw new Error(`No DOM listener registered for ${type}.`);
  const event = createEvent(patch);
  listener(event);
  return event;
}

export function dragPointer(domElement, from, to, { button = 0, pointerId = 1, steps = 1 } = {}) {
  dispatchDomEvent(domElement, 'pointerdown', { pointerId, button, clientX: from.x, clientY: from.y });
  for (let step = 1; step <= steps; step += 1) {
    const alpha = step / steps;
    dispatchDomEvent(domElement, 'pointermove', {
      pointerId,
      button,
      clientX: from.x + (to.x - from.x) * alpha,
      clientY: from.y + (to.y - from.y) * alpha
    });
  }
  dispatchDomEvent(domElement, 'pointerup', { pointerId, button, clientX: to.x, clientY: to.y });
}

export function clickPointer(domElement, point, { button = 0, pointerId = 1, jitter = { x: 0, y: 0 } } = {}) {
  dispatchDomEvent(domElement, 'pointerdown', { pointerId, button, clientX: point.x, clientY: point.y });
  dispatchDomEvent(domElement, 'pointerup', { pointerId, button, clientX: point.x + jitter.x, clientY: point.y + jitter.y });
}

function createInteractionSurface(viewModel) {
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1, 1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.5;
  surface.scale.set(viewModel.grid.width * viewModel.coordinateSystem.cellSize, viewModel.grid.height * viewModel.coordinateSystem.cellSize, 1);
  surface.updateMatrixWorld(true);
  return surface;
}

function screenPointForGridCell(viewModel, camera, width, height, x, y) {
  const world = gridCellToWorld(viewModel.coordinateSystem, x, y, 0);
  const projected = new THREE.Vector3(world.x, 0.6, world.z).project(camera);
  return {
    x: ((projected.x + 1) / 2) * width,
    y: ((1 - projected.y) / 2) * height
  };
}

function createEvent(patch = {}) {
  return {
    pointerId: patch.pointerId ?? 1,
    pointerType: patch.pointerType ?? 'mouse',
    button: patch.button ?? 0,
    clientX: Number(patch.clientX ?? 0),
    clientY: Number(patch.clientY ?? 0),
    deltaY: Number(patch.deltaY ?? 0),
    target: patch.target ?? null,
    shiftKey: patch.shiftKey === true,
    altKey: patch.altKey === true,
    ctrlKey: patch.ctrlKey === true,
    metaKey: patch.metaKey === true,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; }
  };
}
