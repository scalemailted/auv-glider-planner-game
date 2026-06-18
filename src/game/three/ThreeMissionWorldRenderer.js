import * as THREE from '../../../node_modules/three/build/three.module.js';
import { createThreeScalarFieldLayer, updateThreeScalarFieldLayer, setThreeScalarFieldVisibility, disposeThreeScalarFieldLayer } from './layers/ThreeScalarFieldLayer.js';
import { updateThreeDropZoneLayer } from './layers/ThreeDropZoneLayer.js';
import { updateThreeGliderLayer } from './layers/ThreeGliderLayer.js';
import { updateThreeWaypointLayer } from './layers/ThreeWaypointLayer.js';
import { updateThreeRouteLayer } from './layers/ThreeRouteLayer.js';
import { updateThreePlanningMarkerLayer } from './layers/ThreePlanningMarkerLayer.js';
import { updateThreePriorityTargetLayer } from './layers/ThreePriorityTargetLayer.js';
import { updateThreeCurrentVectorLayer } from './layers/ThreeCurrentVectorLayer.js';
import { updateThreeHazardLayer, updateThreeConstraintLayer } from './layers/ThreeHazardLayer.js';
import { updateThreeSelectionLayer, updateThreeGuidanceLayer } from './layers/ThreeSelectionLayer.js';
import { clearGroup, makeBoxCell } from './layers/ThreeMissionLayerUtils.js';
import { missionWorldRenderViewModelSummary } from '../../core/rendering/MissionWorldRenderViewModel.js';

export const THREE_MISSION_WORLD_RENDERER_VERSION = 'three-mission-world-renderer-gfx-r3a';

const GROUP_KEYS = [
  'bathymetryGroup',
  'waterSurfaceGroup',
  'depthLayerGroup',
  'scalarFieldGroup',
  'currentVectorGroup',
  'hazardGroup',
  'constraintGroup',
  'dropZoneGroup',
  'gliderGroup',
  'waypointGroup',
  'routeGroup',
  'markerGroup',
  'priorityTargetGroup',
  'observationGroup',
  'selectionGroup',
  'guidanceGroup'
];

export function createThreeMissionWorldRenderer(container, options = {}) {
  if (!container) throw new Error('createThreeMissionWorldRenderer requires a DOM container.');
  const width = Math.max(1, Number(container.clientWidth || options.width || 960));
  const height = Math.max(1, Number(container.clientHeight || options.height || 640));
  container.classList?.add?.('three-mission-world-host');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06111f);
  scene.fog = new THREE.FogExp2(0x06111f, 0.014);
  const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 4000);
  const webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  webglRenderer.setPixelRatio(Math.min(2, Number(globalThis.devicePixelRatio || 1)));
  webglRenderer.setSize(width, height, false);
  webglRenderer.domElement.className = 'three-mission-world-canvas';
  webglRenderer.domElement.setAttribute('aria-label', 'Three.js live mission world renderer');
  container.innerHTML = '';
  container.appendChild(webglRenderer.domElement);
  const root = new THREE.Group();
  root.name = 'mission-world-root';
  scene.add(root);
  const groups = Object.fromEntries(GROUP_KEYS.map((key) => [key, new THREE.Group()]));
  for (const [key, group] of Object.entries(groups)) {
    group.name = key;
    root.add(group);
  }
  const scalarLayer = createThreeScalarFieldLayer({ name: 'mission-scalar-field' });
  groups.scalarFieldGroup.add(scalarLayer.group);
  scene.add(new THREE.HemisphereLight(0xdff9ff, 0x07111f, 1.35));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-24, 38, 22);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x54c7ec, 0.72);
  fill.position.set(22, 16, -28);
  scene.add(fill);
  const renderer = {
    type: 'anchor.renderer.three-mission-world',
    version: THREE_MISSION_WORLD_RENDERER_VERSION,
    container,
    scene,
    camera,
    renderer: webglRenderer,
    root,
    groups,
    scalarLayer,
    viewModel: null,
    layerVisibility: defaultLayerVisibility(options.layerVisibility),
    cameraState: normalizeCameraPatch(options.camera ?? { preset: 'obliqueMission' }),
    disposed: false,
    animationFrame: null,
    threeAvailable: Boolean(THREE?.Scene),
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    ownsReplaySemantics: false,
    changesMissionState: false,
    changesOfficialBrowserScoring: false,
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  };
  setThreeMissionWorldCamera(renderer, renderer.cameraState);
  renderLoop(renderer);
  return renderer;
}

export function updateThreeMissionWorldRenderer(renderer, viewModel = {}) {
  if (!renderer || renderer.disposed) return renderer;
  renderer.viewModel = viewModel;
  renderer.layerVisibility = defaultLayerVisibility({ ...(renderer.layerVisibility ?? {}), ...(viewModel.visibility ?? {}) });
  updateBathymetry(renderer, viewModel);
  updateWaterSurface(renderer, viewModel);
  updateDepthLayers(renderer, viewModel);
  updateThreeScalarFieldLayer(renderer.scalarLayer, viewModel.scalarFieldLayer, { transform: viewModel.coordinateSystem, yOffset: 0.08 });
  updateThreeCurrentVectorLayer(renderer.groups.currentVectorGroup, viewModel);
  updateThreeHazardLayer(renderer.groups.hazardGroup, viewModel);
  updateThreeConstraintLayer(renderer.groups.constraintGroup, viewModel);
  updateThreeDropZoneLayer(renderer.groups.dropZoneGroup, viewModel);
  updateThreeGliderLayer(renderer.groups.gliderGroup, viewModel);
  updateThreeWaypointLayer(renderer.groups.waypointGroup, viewModel);
  updateThreeRouteLayer(renderer.groups.routeGroup, viewModel);
  updateThreePlanningMarkerLayer(renderer.groups.markerGroup, viewModel);
  updateThreePriorityTargetLayer(renderer.groups.priorityTargetGroup, viewModel);
  updateObservationLayer(renderer.groups.observationGroup, viewModel);
  updateThreeSelectionLayer(renderer.groups.selectionGroup, viewModel);
  updateThreeGuidanceLayer(renderer.groups.guidanceGroup, viewModel);
  setThreeMissionLayerVisibility(renderer, renderer.layerVisibility);
  fitCamera(renderer, viewModel);
  renderer.renderer.render(renderer.scene, renderer.camera);
  return renderer;
}

export function resizeThreeMissionWorldRenderer(renderer, width, height) {
  if (!renderer || renderer.disposed) return renderer;
  const w = Math.max(1, Number(width ?? renderer.container?.clientWidth ?? 1));
  const h = Math.max(1, Number(height ?? renderer.container?.clientHeight ?? 1));
  renderer.camera.aspect = w / h;
  renderer.camera.updateProjectionMatrix();
  renderer.renderer.setSize(w, h, false);
  renderer.renderer.render(renderer.scene, renderer.camera);
  return renderer;
}

export function setThreeMissionWorldCamera(renderer, cameraPatch = {}) {
  if (!renderer) return renderer;
  renderer.cameraState = normalizeCameraPatch({ ...(renderer.cameraState ?? {}), ...(cameraPatch ?? {}) });
  applyCamera(renderer);
  return renderer;
}

export function setThreeMissionLayerVisibility(renderer, visibilityPatch = {}) {
  if (!renderer) return renderer;
  renderer.layerVisibility = defaultLayerVisibility({ ...(renderer.layerVisibility ?? {}), ...(visibilityPatch ?? {}) });
  const v = renderer.layerVisibility;
  renderer.groups.bathymetryGroup.visible = v.bathymetry !== false;
  renderer.groups.waterSurfaceGroup.visible = v.waterSurface !== false;
  renderer.groups.depthLayerGroup.visible = v.depthLayers !== false;
  renderer.groups.currentVectorGroup.visible = v.currentVectors !== false;
  renderer.groups.hazardGroup.visible = v.hazards !== false;
  renderer.groups.constraintGroup.visible = v.constraints !== false;
  renderer.groups.dropZoneGroup.visible = v.dropZones !== false;
  renderer.groups.gliderGroup.visible = v.gliders !== false;
  renderer.groups.waypointGroup.visible = v.waypoints !== false;
  renderer.groups.routeGroup.visible = v.routes !== false;
  renderer.groups.markerGroup.visible = v.planningMarkers !== false;
  renderer.groups.priorityTargetGroup.visible = v.priorityTargets !== false;
  renderer.groups.observationGroup.visible = v.observations !== false;
  renderer.groups.selectionGroup.visible = v.selection !== false;
  renderer.groups.guidanceGroup.visible = v.guidance !== false;
  setThreeScalarFieldVisibility(renderer.scalarLayer, v.scalarField !== false);
  return renderer;
}

export function threeMissionWorldRendererSummary(renderer = {}) {
  const vm = renderer.viewModel ?? {};
  return {
    type: 'anchor.renderer.three-mission-world-summary',
    version: THREE_MISSION_WORLD_RENDERER_VERSION,
    renderer: 'three',
    threeAvailable: renderer.threeAvailable === true,
    disposed: renderer.disposed === true,
    groupKeys: GROUP_KEYS,
    viewModel: missionWorldRenderViewModelSummary(vm),
    bathymetryObjectCount: renderer.groups?.bathymetryGroup?.children?.length ?? 0,
    scalarFieldObjectCount: renderer.groups?.scalarFieldGroup?.children?.length ?? 0,
    currentVectorObjectCount: renderer.groups?.currentVectorGroup?.children?.length ?? 0,
    hazardObjectCount: renderer.groups?.hazardGroup?.children?.length ?? 0,
    dropZoneObjectCount: renderer.groups?.dropZoneGroup?.children?.length ?? 0,
    gliderObjectCount: renderer.groups?.gliderGroup?.children?.length ?? 0,
    waypointObjectCount: renderer.groups?.waypointGroup?.children?.length ?? 0,
    routeObjectCount: renderer.groups?.routeGroup?.children?.length ?? 0,
    markerObjectCount: renderer.groups?.markerGroup?.children?.length ?? 0,
    priorityTargetObjectCount: renderer.groups?.priorityTargetGroup?.children?.length ?? 0,
    layerVisibility: { ...(renderer.layerVisibility ?? {}) },
    camera: { ...(renderer.cameraState ?? {}) },
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    ownsReplaySemantics: false,
    changesMissionState: false,
    changesOfficialBrowserScoring: false,
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  };
}

export function disposeThreeMissionWorldRenderer(renderer) {
  if (!renderer || renderer.disposed) return;
  renderer.disposed = true;
  if (renderer.animationFrame) globalThis.cancelAnimationFrame?.(renderer.animationFrame);
  disposeThreeScalarFieldLayer(renderer.scalarLayer);
  for (const group of Object.values(renderer.groups ?? {})) clearGroup(group);
  renderer.scene?.traverse?.((object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach((material) => material?.dispose?.());
    else object.material?.dispose?.();
  });
  renderer.renderer?.dispose?.();
  renderer.renderer?.domElement?.remove?.();
  renderer.container?.classList?.remove?.('three-mission-world-host');
}

function updateBathymetry(renderer, viewModel) {
  const group = renderer.groups.bathymetryGroup;
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (let y = 0; y < viewModel.grid?.height; y += 1) {
    for (let x = 0; x < viewModel.grid?.width; x += 1) {
      const terrain = viewModel.terrain?.values?.[y]?.[x];
      const depth = Number(viewModel.bathymetry?.depthValues?.[y]?.[x] ?? 0);
      const mesh = makeBoxCell(transform, { id: `bathymetry-${x}-${y}`, x, y }, {
        color: terrain ? 0x536844 : depth > 0.65 ? 0x0a4f78 : 0x1578a4,
        opacity: terrain ? 0.92 : 0.34,
        height: terrain ? 0.18 : 0.02,
        yOffset: terrain ? 0.02 : -Math.max(0, depth) * 0.025
      });
      mesh.userData = { id: mesh.name, terrain: Boolean(terrain), depth };
      group.add(mesh);
    }
  }
}

function updateWaterSurface(renderer, viewModel) {
  const group = renderer.groups.waterSurfaceGroup;
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(viewModel.grid.width * transform.cellSize, viewModel.grid.height * transform.cellSize, 1, 1),
    new THREE.MeshPhysicalMaterial({ color: 0x54c7ec, transparent: true, opacity: 0.2, roughness: 0.35, metalness: 0.02, side: THREE.DoubleSide, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  mesh.name = 'mission-water-surface';
  group.add(mesh);
}

function updateDepthLayers(renderer, viewModel) {
  const group = renderer.groups.depthLayerGroup;
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const layer of viewModel.depthLayers ?? []) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(viewModel.grid.width * transform.cellSize, viewModel.grid.height * transform.cellSize, 1, 1),
      new THREE.MeshBasicMaterial({ color: depthLayerColor(layer.id), transparent: true, opacity: Number(layer.opacity ?? 0.12), side: THREE.DoubleSide, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -Number(layer.depthMeters ?? 0) * transform.depthScale * transform.verticalExaggeration;
    mesh.name = `depth-layer-${layer.id}`;
    mesh.userData = { id: layer.id, depthMeters: layer.depthMeters };
    group.add(mesh);
  }
}

function updateObservationLayer(group, viewModel) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const observation of viewModel.observations ?? []) {
    const mesh = makeBoxCell(transform, observation, { color: 0xffffff, opacity: 0.68, height: 0.035, yOffset: 0.3 });
    mesh.userData = { id: observation.id, observation };
    group.add(mesh);
  }
}

function fitCamera(renderer, viewModel) {
  if (renderer.cameraState?.manual) return;
  const width = Number(viewModel.grid?.width ?? 10);
  const height = Number(viewModel.grid?.height ?? 10);
  const radius = Math.max(width, height, 8);
  const preset = renderer.cameraState?.preset ?? 'obliqueMission';
  if (preset === 'tacticalTopDown') setCameraPose(renderer, { x: 0, y: radius * 1.65, z: 0.001, lookAt: [0, 0, 0] });
  else if (preset === 'waterColumnProfile') setCameraPose(renderer, { x: 0, y: radius * 0.62, z: radius * 1.78, lookAt: [0, -radius * 0.08, 0] });
  else setCameraPose(renderer, { x: -radius * 0.82, y: radius * 1.08, z: radius * 1.24, lookAt: [0, -radius * 0.05, 0] });
}

function applyCamera(renderer) {
  fitCamera(renderer, renderer.viewModel ?? { grid: { width: 12, height: 12 } });
}

function setCameraPose(renderer, pose) {
  renderer.camera.position.set(pose.x, pose.y, pose.z);
  renderer.camera.lookAt(new THREE.Vector3(...pose.lookAt));
  renderer.camera.updateProjectionMatrix();
}

function normalizeCameraPatch(patch = {}) {
  return { preset: patch.preset ?? patch.cameraPreset ?? 'obliqueMission', manual: patch.manual === true };
}

function defaultLayerVisibility(input = {}) {
  return {
    bathymetry: input.bathymetry !== false,
    waterSurface: input.waterSurface !== false,
    depthLayers: input.depthLayers !== false,
    scalarField: input.scalarField !== false,
    currentVectors: input.currentVectors !== false,
    hazards: input.hazards !== false,
    constraints: input.constraints !== false,
    dropZones: input.dropZones !== false,
    gliders: input.gliders !== false,
    waypoints: input.waypoints !== false,
    routes: input.routes !== false,
    planningMarkers: input.planningMarkers !== false,
    priorityTargets: input.priorityTargets !== false,
    observations: input.observations !== false,
    selection: input.selection !== false,
    guidance: input.guidance !== false
  };
}

function depthLayerColor(id) {
  if (id === 'surface') return 0x9ee7ff;
  if (id === 'thermocline') return 0x63e6be;
  if (id === 'deep') return 0xb197fc;
  return 0x54c7ec;
}

function renderLoop(renderer) {
  if (!renderer || renderer.disposed) return;
  renderer.renderer.render(renderer.scene, renderer.camera);
  renderer.animationFrame = globalThis.requestAnimationFrame?.(() => renderLoop(renderer)) ?? null;
}
