import * as THREE from 'three';
import { createThreeScalarFieldLayer, updateThreeScalarFieldLayer, setThreeScalarFieldVisibility, disposeThreeScalarFieldLayer } from './layers/ThreeScalarFieldLayer.js';
import {
  createThreeVolumetricScalarFieldLayer,
  updateThreeVolumetricScalarFieldLayer,
  setThreeVolumetricScalarFieldLayerVisibility,
  disposeThreeVolumetricScalarFieldLayer,
  threeVolumetricScalarFieldLayerSummary
} from './layers/ThreeVolumetricScalarFieldLayer.js';
import { updateThreeDropZoneLayer } from './layers/ThreeDropZoneLayer.js';
import { updateThreeGliderLayer } from './layers/ThreeGliderLayer.js';
import { updateThreeWaypointLayer } from './layers/ThreeWaypointLayer.js';
import { updateThreeRouteLayer } from './layers/ThreeRouteLayer.js';
import { updateThreePlanningMarkerLayer } from './layers/ThreePlanningMarkerLayer.js';
import { updateThreePriorityTargetLayer } from './layers/ThreePriorityTargetLayer.js';
import { updateThreeSamplingTargetLayer, clearThreeSamplingTargetLayer, threeSamplingTargetLayerSummary } from './layers/ThreeSamplingTargetLayer.js';
import { updateThreeCurrentVectorLayer } from './layers/ThreeCurrentVectorLayer.js';
import { updateThreeHazardLayer, updateThreeConstraintLayer } from './layers/ThreeHazardLayer.js';
import { updateThreeSelectionLayer } from './layers/ThreeSelectionLayer.js';
import { updateThreeGuidanceConeLayer } from './layers/ThreeGuidanceConeLayer.js';
import { createThreeOperationalDepthSlabLayer, updateThreeOperationalDepthSlabLayer, setThreeOperationalDepthSlabLayerVisibility, disposeThreeOperationalDepthSlabLayer, threeOperationalDepthSlabLayerSummary } from './layers/ThreeOperationalDepthSlabLayer.js';
import { createThreeWaterColumnVolumeFrameLayer, updateThreeWaterColumnVolumeFrameLayer, disposeThreeWaterColumnVolumeFrameLayer, threeWaterColumnVolumeFrameLayerSummary } from './layers/ThreeWaterColumnVolumeFrameLayer.js';
import { updateThreeDepthTrajectoryLayer, clearThreeDepthTrajectoryLayer, threeDepthTrajectoryLayerSummary } from './layers/ThreeDepthTrajectoryLayer.js';
import { updateThreePlannedDiveTrajectoryLayer, clearThreePlannedDiveTrajectoryLayer, threePlannedDiveTrajectoryLayerSummary } from './layers/ThreePlannedDiveTrajectoryLayer.js';
import { updateThreeRealizedTrajectoryLayer, clearThreeRealizedTrajectoryLayer } from './layers/ThreeRealizedTrajectoryLayer.js';
import { updateThreeObservationLayer, clearThreeObservationLayer } from './layers/ThreeObservationLayer.js';
import { updateThreeSurfacingEventLayer, clearThreeSurfacingEventLayer } from './layers/ThreeSurfacingEventLayer.js';
import { updateThreeRouteStatusLayer, clearThreeRouteStatusLayer } from './layers/ThreeRouteStatusLayer.js';
import { updateThreeSimulationStatusLayer, clearThreeSimulationStatusLayer } from './layers/ThreeSimulationStatusLayer.js';
import {
  createThreePlanningInteractionLayer,
  updateThreePlanningInteractionLayer,
  setThreePlanningInteractionLayerVisibility,
  disposeThreePlanningInteractionLayer
} from './layers/ThreePlanningInteractionLayer.js';
import { clearGroup, makeBoxCell } from './layers/ThreeMissionLayerUtils.js';
import { missionWorldRenderViewModelSummary } from '../../core/rendering/MissionWorldRenderViewModel.js';
import {
  beginThreePerformanceFrame,
  createThreeMissionPerformanceMonitor,
  endThreePerformanceFrame,
  recordThreePerformanceEvent,
  recordThreePresentationUpdateDuration,
  recordThreeRendererSubmissionDuration,
  resetThreePerformanceWindow,
  setThreePerformanceCadenceLimit,
  threeMissionPerformanceSummary
} from './ThreeMissionPerformanceMonitor.js';
import {
  createThreeMissionCameraController,
  disposeThreeMissionCameraController,
  setThreeMissionCameraPreset,
  threeMissionCameraControllerSummary,
  updateThreeMissionCameraBounds
} from './ThreeMissionCameraController.js';
import { createThreeWebGLGpuTimer, beginThreeGpuTimerQuery, endThreeGpuTimerQuery, threeGpuTimerSummary, disposeThreeGpuTimer } from './ThreeWebGLGpuTimer.js';
import { effectiveThreePixelRatio, renderCostPolicySummary, shouldRenderVolumetricFieldPlanes, threeQualityProfileSettings, waterColumnDisplayPolicy } from './ThreeRenderCostPolicy.js';

export const THREE_MISSION_WORLD_RENDERER_VERSION = 'three-mission-world-renderer-r1-2a-4-4';

const GROUP_KEYS = [
  'bathymetryGroup',
  'waterSurfaceGroup',
  'depthLayerGroup',
  'waterColumnFrameGroup',
  'scalarFieldGroup',
  'currentVectorGroup',
  'hazardGroup',
  'constraintGroup',
  'dropZoneGroup',
  'gliderGroup',
  'waypointGroup',
  'routeGroup',
  'plannedDiveTrajectoryGroup',
  'depthTrajectoryGroup',
  'realizedTrajectoryGroup',
  'markerGroup',
  'samplingTargetGroup',
  'priorityTargetGroup',
  'observationGroup',
  'surfacingEventGroup',
  'routeStatusGroup',
  'simulationStatusGroup',
  'selectionGroup',
  'guidanceGroup',
  'interactionGroup'
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
  const qualityProfile = options.qualityProfile ?? options.viewModel?.displaySettings?.waterColumn?.qualityProfile ?? 'balanced';
  const qualitySettings = threeQualityProfileSettings(qualityProfile);
  const pixelRatio = effectiveThreePixelRatio({ devicePixelRatio: globalThis.devicePixelRatio || 1, qualityProfile });
  webglRenderer.setPixelRatio(pixelRatio);
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
  const volumetricScalarFieldLayer = createThreeVolumetricScalarFieldLayer({ name: 'mission-volumetric-scalar-field' });
  groups.scalarFieldGroup.add(volumetricScalarFieldLayer.group);
  const operationalDepthSlabLayer = createThreeOperationalDepthSlabLayer({ name: 'mission-operational-depth-slabs' });
  groups.depthLayerGroup.add(operationalDepthSlabLayer.group);
  const waterColumnVolumeFrameLayer = createThreeWaterColumnVolumeFrameLayer({ name: 'mission-water-column-volume-frame' });
  groups.waterColumnFrameGroup.add(waterColumnVolumeFrameLayer.group);
  const planningInteractionLayer = createThreePlanningInteractionLayer({ name: 'mission-planning-interaction-layer' });
  groups.interactionGroup.add(planningInteractionLayer.group);
  const interactionSurface = createInteractionSurface();
  groups.interactionGroup.add(interactionSurface);
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
    volumetricScalarFieldLayer,
    operationalDepthSlabLayer,
    waterColumnVolumeFrameLayer,
    planningInteractionLayer,
    interactionSurface,
    cameraController: null,
    viewModel: null,
    rendererPixelRatio: pixelRatio,
    pixelRatioLimit: qualitySettings.pixelRatioLimit,
    qualityProfile: qualitySettings.id,
    presentationCadenceLimit: qualitySettings.presentationCadenceLimit,
    lastSize: { width, height, pixelRatio, resizeSequence: 0 },
    layerVisibility: defaultLayerVisibility(options.layerVisibility),
    cameraState: normalizeCameraPatch(options.camera ?? { preset: 'obliqueMission' }),
    disposed: false,
    animationFrame: null,
    performanceMonitor: createThreeMissionPerformanceMonitor({ windowSize: options.performanceWindowSize ?? 360, presentationCadenceLimit: qualitySettings.presentationCadenceLimit }),
    gpuTimer: createThreeWebGLGpuTimer(webglRenderer.getContext?.(), { maxPendingQueries: 8 }),
    needsRender: true,
    renderRequestReason: 'initial',
    renderFrameSequence: 0,
    renderCallsThisPresentationFrame: 0,
    lastRenderCallsPerPresentationFrame: 0,
    duplicateRenderCallWarningCount: 0,
    renderOnDemandEnabled: true,
    continuousAnimationReason: 'render-on-demand-raf-loop',
    staticMatrixFrozenObjectCount: 0,
    dynamicMatrixObjectCount: 0,
    presentationInitialized: false,
    presentationCache: {
      lastRenderedScalarFieldFrameId: null,
      lastRenderedCurrentFieldFrameId: null,
      scalarFieldFrameSkipCount: 0,
      currentFieldFrameSkipCount: 0
    },
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
  renderer.requestRender = (reason = 'external') => requestThreeMissionWorldRender(renderer, reason);
  setThreePerformanceCadenceLimit(renderer.performanceMonitor, renderer.presentationCadenceLimit);
  renderer.cameraController = createThreeMissionCameraController({
    camera,
    renderer,
    presetId: renderer.cameraState.preset,
    bounds: missionBoundsFromViewModel(options.viewModel ?? { grid: { width: 12, height: 12 }, coordinateSystem: { cellSize: 1 } })
  });
  renderLoop(renderer);
  return renderer;
}

export function updateThreeMissionWorldRenderer(renderer, viewModel = {}) {
  if (!renderer || renderer.disposed) return renderer;
  const presentationUpdateStart = frameNow();
  renderer.viewModel = viewModel;
  applyThreeRendererQuality(renderer, viewModel);
  recordRendererUpdateEvents(renderer, viewModel);
  renderer.layerVisibility = defaultLayerVisibility({ ...(renderer.layerVisibility ?? {}), ...(viewModel.visibility ?? {}) });
  const dirty = dirtyCategorySet(viewModel);
  const initial = renderer.presentationInitialized !== true;
  const shouldUpdate = (...categories) => initial || !dirty || categories.some((category) => dirty.has(category));
  const cache = renderer.presentationCache ??= {};

  if (shouldUpdate('bathymetry')) {
    updateBathymetry(renderer, viewModel);
    recordThreePerformanceEvent(renderer.performanceMonitor, 'bathymetryUpdate');
  }
  if (shouldUpdate('waterColumn', 'bathymetry')) {
    updateWaterSurface(renderer, viewModel);
    updateDepthLayers(renderer, viewModel);
    updateThreeWaterColumnVolumeFrameLayer(renderer.waterColumnVolumeFrameLayer, viewModel);
    recordThreePerformanceEvent(renderer.performanceMonitor, 'waterColumnUpdate');
  }
  if (shouldUpdate('scalarField', 'waterColumn')) {
    const signature = scalarFieldFrameSignature(viewModel);
    if (initial || signature !== cache.lastRenderedScalarFieldFrameId) {
      updateThreeScalarFieldLayer(renderer.scalarLayer, viewModel.scalarFieldLayer, { transform: viewModel.coordinateSystem, yOffset: 0.08 });
      if (shouldRenderVolumetricFieldPlanes(viewModel)) updateThreeVolumetricScalarFieldLayer(renderer.volumetricScalarFieldLayer, viewModel, { transform: viewModel.coordinateSystem, yOffset: 0.12 });
      else { disposeThreeVolumetricScalarFieldLayer(renderer.volumetricScalarFieldLayer); renderer.volumetricScalarFieldLayer.group.visible = false; renderer.volumetricScalarFieldLayer.lastSummary = threeVolumetricScalarFieldLayerSummary(renderer.volumetricScalarFieldLayer, viewModel, { mode: viewModel.displaySettings?.waterColumn?.scalarRenderMode ?? 'smoothedSlices', selectedFieldId: viewModel.selectedFieldId ?? null, recordCount: 0 }); }
      cache.lastRenderedScalarFieldFrameId = signature;
      recordThreePerformanceEvent(renderer.performanceMonitor, 'fieldTextureUpdate');
    } else {
      cache.scalarFieldFrameSkipCount = Number(cache.scalarFieldFrameSkipCount ?? 0) + 1;
      recordThreePerformanceEvent(renderer.performanceMonitor, 'scalarFieldFrameSkip');
    }
  }
  if (shouldUpdate('currentVectors', 'waterColumn')) {
    const signature = currentFieldFrameSignature(viewModel);
    if (initial || signature !== cache.lastRenderedCurrentFieldFrameId) {
      updateThreeCurrentVectorLayer(renderer.groups.currentVectorGroup, viewModel);
      cache.lastRenderedCurrentFieldFrameId = signature;
      recordThreePerformanceEvent(renderer.performanceMonitor, 'currentBufferUpdate');
    } else {
      cache.currentFieldFrameSkipCount = Number(cache.currentFieldFrameSkipCount ?? 0) + 1;
      recordThreePerformanceEvent(renderer.performanceMonitor, 'currentFieldFrameSkip');
    }
  }
  if (shouldUpdate('bathymetry', 'routeStatus')) {
    updateThreeHazardLayer(renderer.groups.hazardGroup, viewModel);
    updateThreeConstraintLayer(renderer.groups.constraintGroup, viewModel);
    updateThreeDropZoneLayer(renderer.groups.dropZoneGroup, viewModel);
  }
  if (shouldUpdate('vehiclePose')) updateThreeGliderLayer(renderer.groups.gliderGroup, viewModel);
  if (shouldUpdate('plannedRoute')) {
    updateThreeWaypointLayer(renderer.groups.waypointGroup, viewModel);
    updateThreeRouteLayer(renderer.groups.routeGroup, viewModel);
    updateThreePlannedDiveTrajectoryLayer(renderer.groups.plannedDiveTrajectoryGroup, viewModel);
    updateThreeDepthTrajectoryLayer(renderer.groups.depthTrajectoryGroup, viewModel);
    recordThreePerformanceEvent(renderer.performanceMonitor, 'routeGeometryUpdate');
    if ((viewModel.plannedDiveSegments ?? []).length) recordThreePerformanceEvent(renderer.performanceMonitor, 'predictedTrajectoryBuild');
  }
  if (shouldUpdate('realizedTrajectory')) updateThreeRealizedTrajectoryLayer(renderer.groups.realizedTrajectoryGroup, viewModel);
  if (shouldUpdate('selection', 'labels')) updateThreePlanningMarkerLayer(renderer.groups.markerGroup, viewModel);
  if (shouldUpdate('samplingTargets', 'plannedRoute')) {
    updateThreeSamplingTargetLayer(renderer.groups.samplingTargetGroup, viewModel);
    recordThreePerformanceEvent(renderer.performanceMonitor, 'samplingTargetGeometryUpdate');
  }
  if (shouldUpdate('samplingTargets', 'scalarField')) updateThreePriorityTargetLayer(renderer.groups.priorityTargetGroup, viewModel);
  if (shouldUpdate('observations')) {
    if (viewModel.phase === 'simulation' || viewModel.type === 'anchor.rendering.simulation-world') updateThreeObservationLayer(renderer.groups.observationGroup, viewModel);
    else updateObservationLayer(renderer.groups.observationGroup, viewModel);
  }
  if (shouldUpdate('surfacingEvents')) updateThreeSurfacingEventLayer(renderer.groups.surfacingEventGroup, viewModel);
  if (shouldUpdate('routeStatus', 'simulationStatus')) updateThreeRouteStatusLayer(renderer.groups.routeStatusGroup, viewModel);
  if (shouldUpdate('vehiclePose', 'simulationStatus')) updateThreeSimulationStatusLayer(renderer.groups.simulationStatusGroup, viewModel);
  if (shouldUpdate('selection')) updateThreeSelectionLayer(renderer.groups.selectionGroup, viewModel);
  if (shouldUpdate('vehiclePose', 'plannedRoute')) updateThreeGuidanceConeLayer(renderer.groups.guidanceGroup, viewModel);
  updateInteractionSurface(renderer, viewModel);
  if (shouldUpdate('selection', 'plannedRoute')) updateThreePlanningInteractionLayer(renderer.planningInteractionLayer, viewModel.interactionViewModel, { transform: viewModel.coordinateSystem, viewModel });
  setThreeMissionLayerVisibility(renderer, renderer.layerVisibility);
  syncCameraBounds(renderer, viewModel);
  applyStaticMatrixPolicy(renderer);
  renderer.presentationInitialized = true;
  renderer.lastPresentationDirtyCategories = dirty ? [...dirty] : ['full'];
  recordThreePresentationUpdateDuration(renderer.performanceMonitor, frameNow() - presentationUpdateStart);
  requestThreeMissionWorldRender(renderer, 'presentationUpdate');
  return renderer;
}
export function resizeThreeMissionWorldRenderer(renderer, width, height) {
  if (!renderer || renderer.disposed) return renderer;
  const rect = renderer.container?.getBoundingClientRect?.() ?? null;
  const w = Math.max(1, Number(width ?? rect?.width ?? renderer.container?.clientWidth ?? 1));
  const h = Math.max(1, Number(height ?? rect?.height ?? renderer.container?.clientHeight ?? 1));
  const pixelRatio = effectiveThreePixelRatio({ devicePixelRatio: globalThis.devicePixelRatio || 1, qualityProfile: renderer.qualityProfile ?? 'balanced' });
  renderer.renderer.setPixelRatio(pixelRatio);
  renderer.camera.aspect = w / h;
  renderer.camera.updateProjectionMatrix();
  renderer.renderer.setSize(w, h, false);
  renderer.rendererPixelRatio = pixelRatio;
  renderer.lastSize = {
    width: w,
    height: h,
    pixelRatio,
    backingWidth: renderer.renderer.domElement?.width ?? null,
    backingHeight: renderer.renderer.domElement?.height ?? null,
    resizeSequence: Number(renderer.lastSize?.resizeSequence ?? 0) + 1
  };
  requestThreeMissionWorldRender(renderer, 'resize');
  return renderer;
}

export function setThreeMissionWorldCamera(renderer, cameraPatch = {}) {
  if (!renderer) return renderer;
  renderer.cameraState = normalizeCameraPatch({ ...(renderer.cameraState ?? {}), ...(cameraPatch ?? {}) });
  if (renderer.cameraController) {
    const bounds = renderer.viewModel ? missionBoundsFromViewModel(renderer.viewModel) : renderer.cameraController.bounds;
    updateThreeMissionCameraBounds(renderer.cameraController, bounds);
    setThreeMissionCameraPreset(renderer.cameraController, renderer.cameraState.preset, { bounds });
  } else {
    applyCamera(renderer);
  }
  requestThreeMissionWorldRender(renderer, 'cameraPreset');
  return renderer;
}

export function setThreeMissionLayerVisibility(renderer, visibilityPatch = {}) {
  if (!renderer) return renderer;
  renderer.layerVisibility = defaultLayerVisibility({ ...(renderer.layerVisibility ?? {}), ...(visibilityPatch ?? {}) });
  const v = renderer.layerVisibility;
  renderer.groups.bathymetryGroup.visible = v.bathymetry !== false;
  renderer.groups.waterSurfaceGroup.visible = v.waterSurface !== false;
  renderer.groups.depthLayerGroup.visible = v.depthLayers !== false;
  renderer.groups.waterColumnFrameGroup.visible = v.depthLayers !== false && v.waterColumnFrame !== false;
  renderer.groups.currentVectorGroup.visible = v.currentVectors !== false;
  renderer.groups.hazardGroup.visible = v.hazards !== false;
  renderer.groups.constraintGroup.visible = v.constraints !== false;
  renderer.groups.dropZoneGroup.visible = v.dropZones !== false;
  renderer.groups.gliderGroup.visible = v.gliders !== false;
  renderer.groups.waypointGroup.visible = v.waypoints !== false;
  renderer.groups.routeGroup.visible = v.routes !== false;
  renderer.groups.plannedDiveTrajectoryGroup.visible = v.routes !== false;
  renderer.groups.depthTrajectoryGroup.visible = v.routes !== false || v.realizedTrajectories !== false;
  renderer.groups.realizedTrajectoryGroup.visible = v.realizedTrajectories !== false;
  renderer.groups.markerGroup.visible = v.planningMarkers !== false;
  renderer.groups.samplingTargetGroup.visible = v.samplingTargets !== false;
  renderer.groups.priorityTargetGroup.visible = v.priorityTargets !== false;
  renderer.groups.observationGroup.visible = v.observations !== false;
  renderer.groups.surfacingEventGroup.visible = v.surfacingEvents !== false;
  renderer.groups.routeStatusGroup.visible = v.routeStatus !== false;
  renderer.groups.simulationStatusGroup.visible = true;
  renderer.groups.selectionGroup.visible = v.selection !== false;
  renderer.groups.guidanceGroup.visible = v.guidance !== false;
  renderer.groups.interactionGroup.visible = v.interaction !== false;
  setThreePlanningInteractionLayerVisibility(renderer.planningInteractionLayer, v.interaction !== false);
  setThreeOperationalDepthSlabLayerVisibility(renderer.operationalDepthSlabLayer, v.depthLayers !== false);
  setThreeScalarFieldVisibility(renderer.scalarLayer, v.scalarField !== false);
  setThreeVolumetricScalarFieldLayerVisibility(renderer.volumetricScalarFieldLayer, v.scalarField !== false && v.depthLayers !== false);
  requestThreeMissionWorldRender(renderer, 'visibility');
  return renderer;
}

export function threeMissionWorldRendererSummary(renderer = {}) {
  const vm = renderer.viewModel ?? {};
  const rendererInfo = renderer.renderer?.info ?? {};
  const performanceSummary = threeMissionPerformanceSummary(renderer.performanceMonitor ?? null);
  const sceneObjectCount = countSceneObjects(renderer.scene);
  const geometryCount = countSceneResources(renderer.scene, 'geometry');
  const materialCount = countSceneResources(renderer.scene, 'material');
  const textureCount = Math.max(Number(rendererInfo.memory?.textures ?? 0), countSceneTextures(renderer.scene));
  const growthWarnings = renderer.scene ? objectGrowthWarnings(renderer) : [];
  const renderCostCounts = renderCostSceneCounts(renderer);
  const slabSummary = renderer.operationalDepthSlabLayer?.lastSummary ?? threeOperationalDepthSlabLayerSummary(renderer.operationalDepthSlabLayer ?? {}, vm);
  const renderPolicy = renderCostPolicySummary(vm);
  const gate = performanceGate(renderer);
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
    volumetricScalarFieldSummary: renderer.volumetricScalarFieldLayer?.lastSummary ?? threeVolumetricScalarFieldLayerSummary(renderer.volumetricScalarFieldLayer ?? {}, vm),
    currentVectorObjectCount: renderer.groups?.currentVectorGroup?.children?.length ?? 0,
    hazardObjectCount: renderer.groups?.hazardGroup?.children?.length ?? 0,
    dropZoneObjectCount: renderer.groups?.dropZoneGroup?.children?.length ?? 0,
    gliderObjectCount: renderer.groups?.gliderGroup?.children?.length ?? 0,
    waypointObjectCount: renderer.groups?.waypointGroup?.children?.length ?? 0,
    routeObjectCount: renderer.groups?.routeGroup?.children?.length ?? 0,
    plannedDiveTrajectorySummary: threePlannedDiveTrajectoryLayerSummary(renderer.groups?.plannedDiveTrajectoryGroup),
    depthTrajectorySummary: threeDepthTrajectoryLayerSummary(renderer.groups?.depthTrajectoryGroup),
    operationalDepthSlabSummary: slabSummary,
    waterColumnVolumeFrameSummary: threeWaterColumnVolumeFrameLayerSummary(renderer.waterColumnVolumeFrameLayer ?? {}, vm),
    volumeFrameObjectCount: renderer.waterColumnVolumeFrameLayer?.lastSummary?.volumeFrameObjectCount ?? renderer.groups?.waterColumnFrameGroup?.children?.reduce?.((sum, child) => sum + 1 + (child.children?.length ?? 0), 0) ?? 0,
    depthTickCount: renderer.waterColumnVolumeFrameLayer?.lastSummary?.depthTickCount ?? 0,
    slabObjectCount: renderer.operationalDepthSlabLayer?.slabs?.size ?? 0,
    slabTextureCount: [...(renderer.operationalDepthSlabLayer?.slabs?.values?.() ?? [])].filter((record) => record.texture).length,
    slabLabelCount: renderer.operationalDepthSlabLayer?.labels?.size ?? 0,
    realizedTrajectoryObjectCount: renderer.groups?.realizedTrajectoryGroup?.children?.length ?? 0,
    realizedTrajectoryPointCount: countTrajectoryPoints(renderer.groups?.realizedTrajectoryGroup),
    markerObjectCount: renderer.groups?.markerGroup?.children?.length ?? 0,
    samplingTargetSummary: threeSamplingTargetLayerSummary(renderer.groups?.samplingTargetGroup),
    samplingTargetObjectCount: renderer.groups?.samplingTargetGroup?.children?.length ?? 0,
    priorityTargetObjectCount: renderer.groups?.priorityTargetGroup?.children?.length ?? 0,
    interactionObjectCount: renderer.groups?.interactionGroup?.children?.length ?? 0,
    guidanceObjectCount: renderer.groups?.guidanceGroup?.children?.length ?? 0,
    guidanceSummary: renderer.groups?.guidanceGroup?.userData ?? null,
    gliderPoseSummaries: renderer.groups?.gliderGroup?.userData?.poseSummaries ?? [],
    interactionSurfaceAvailable: Boolean(renderer.interactionSurface),
    canvasBackingWidth: renderer.renderer?.domElement?.width ?? null,
    canvasBackingHeight: renderer.renderer?.domElement?.height ?? null,
    rendererPixelRatio: renderer.rendererPixelRatio ?? null,
    effectivePixelRatio: renderer.rendererPixelRatio ?? null,
    pixelRatioLimit: renderer.pixelRatioLimit ?? null,
    qualityProfile: renderer.qualityProfile ?? renderPolicy.qualityProfile ?? 'balanced',
    presentationCadenceLimit: renderer.presentationCadenceLimit ?? renderPolicy.presentationCadenceLimit ?? null,
    rendererCalls: Number(rendererInfo.render?.calls ?? performanceSummary.rendererCalls ?? 0),
    renderFrameSequence: Number(renderer.renderFrameSequence ?? 0),
    renderCallsPerPresentationFrame: Number(renderer.lastRenderCallsPerPresentationFrame ?? 0),
    lastRenderCallsPerPresentationFrame: Number(renderer.lastRenderCallsPerPresentationFrame ?? 0),
    duplicateRenderCallWarningCount: Number(renderer.duplicateRenderCallWarningCount ?? 0),
    renderOnDemandEnabled: renderer.renderOnDemandEnabled === true,
    continuousAnimationReason: renderer.continuousAnimationReason ?? null,
    rendererTriangles: Number(rendererInfo.render?.triangles ?? performanceSummary.rendererTriangles ?? 0),
    rendererLines: Number(rendererInfo.render?.lines ?? performanceSummary.rendererLines ?? 0),
    rendererPoints: Number(rendererInfo.render?.points ?? performanceSummary.rendererPoints ?? 0),
    sceneObjectCount,
    threeObjectCount: sceneObjectCount,
    geometryCount,
    threeGeometryCount: geometryCount,
    materialCount,
    threeMaterialCount: materialCount,
    textureCount,
    threeTextureCount: textureCount,
    transparentObjectCount: renderCostCounts.transparentObjectCount,
    fullDomainTransparentPlaneCount: renderCostCounts.fullDomainTransparentPlaneCount,
    fullDomainTexturedPlaneCount: renderCostCounts.fullDomainTexturedPlaneCount,
    activeTexturedSlabCount: Number(slabSummary.activeTexturedSlabCount ?? 0),
    contextOutlineSlabCount: Number(slabSummary.contextOutlineSlabCount ?? 0),
    contextSlabMode: renderer.contextSlabMode ?? renderPolicy.contextSlabMode ?? null,
    allLayerFieldTexturesEnabled: renderer.allLayerFieldTexturesEnabled === true || renderPolicy.allLayerFieldTexturesEnabled === true,
    staticMatrixFrozenObjectCount: Number(renderer.staticMatrixFrozenObjectCount ?? 0),
    dynamicMatrixObjectCount: Number(renderer.dynamicMatrixObjectCount ?? 0),
    instancedObjectCount: renderCostCounts.instancedObjectCount,
    visibleSceneObjectCount: renderCostCounts.visibleSceneObjectCount,
    hiddenSceneObjectCount: renderCostCounts.hiddenSceneObjectCount,
    interactiveHitObjectCount: renderCostCounts.interactiveHitObjectCount,
    renderCostPolicy: renderPolicy,
    gpuTimerSummary: threeGpuTimerSummary(renderer.gpuTimer),
    performanceGateStatus: gate.performanceGateStatus,
    performanceGateFailures: gate.performanceGateFailures,
    labelObjectCount: renderer.operationalDepthSlabLayer?.labels?.size ?? 0,
    currentGlyphCount: Math.floor((renderer.groups?.currentVectorGroup?.children?.length ?? 0) / 2),
    predictedDiveObjectCount: threePlannedDiveTrajectoryLayerSummary(renderer.groups?.plannedDiveTrajectoryGroup).objectCount ?? 0,
    activeRendererCount: renderer.disposed === true ? 0 : 1,
    activeRafCount: renderer.disposed === true || renderer.animationFrame == null ? 0 : 1,
    performanceSummary,
    performanceCounters: { ...(renderer.performanceMonitor?.eventCounts ?? {}) },
    lastPresentationDirtyCategories: [...(renderer.lastPresentationDirtyCategories ?? [])],
    lastRenderedScalarFieldFrameId: renderer.presentationCache?.lastRenderedScalarFieldFrameId ?? null,
    lastRenderedCurrentFieldFrameId: renderer.presentationCache?.lastRenderedCurrentFieldFrameId ?? null,
    scalarFieldFrameSkipCount: Number(renderer.presentationCache?.scalarFieldFrameSkipCount ?? 0),
    currentFieldFrameSkipCount: Number(renderer.presentationCache?.currentFieldFrameSkipCount ?? 0),
    trajectoryAppendCount: Number(renderer.groups?.realizedTrajectoryGroup?.userData?.trajectoryAppendCount ?? 0),
    trajectoryFullRebuildCount: Number(renderer.groups?.realizedTrajectoryGroup?.userData?.trajectoryFullRebuildCount ?? 0),
    trajectoryBufferResizeCount: Number(renderer.groups?.realizedTrajectoryGroup?.userData?.trajectoryBufferResizeCount ?? 0),
    duplicateTrajectoryPointCount: Number(renderer.groups?.realizedTrajectoryGroup?.userData?.duplicateTrajectoryPointCount ?? 0),
    observationObjectCreateCount: Number(renderer.groups?.observationGroup?.userData?.observationObjectCreateCount ?? 0),
    observationObjectReuseCount: Number(renderer.groups?.observationGroup?.userData?.observationObjectReuseCount ?? 0),
    duplicateObservationObjectCount: Number(renderer.groups?.observationGroup?.userData?.duplicateObservationObjectCount ?? 0),
    surfacingObjectCreateCount: Number(renderer.groups?.surfacingEventGroup?.userData?.surfacingObjectCreateCount ?? 0),
    objectGrowthWarnings: growthWarnings,
    cameraAspect: renderer.camera?.aspect ?? null,
    hostWidth: renderer.lastSize?.width ?? null,
    hostHeight: renderer.lastSize?.height ?? null,
    resizeSequence: renderer.lastSize?.resizeSequence ?? 0,
    layerVisibility: { ...(renderer.layerVisibility ?? {}) },
    camera: { ...(renderer.cameraState ?? {}) },
    cameraController: threeMissionCameraControllerSummary(renderer.cameraController ?? {}),
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

export function resetThreeMissionWorldRendererPerformance(renderer) {
  if (!renderer) return renderer;
  resetThreePerformanceWindow(renderer.performanceMonitor);
  return renderer;
}

export function disposeThreeMissionWorldRenderer(renderer) {
  if (!renderer || renderer.disposed) return;
  renderer.disposed = true;
  if (renderer.animationFrame) globalThis.cancelAnimationFrame?.(renderer.animationFrame);
  renderer.animationFrame = null;
  disposeThreeScalarFieldLayer(renderer.scalarLayer);
  disposeThreeVolumetricScalarFieldLayer(renderer.volumetricScalarFieldLayer);
  disposeThreeOperationalDepthSlabLayer(renderer.operationalDepthSlabLayer);
  disposeThreeWaterColumnVolumeFrameLayer(renderer.waterColumnVolumeFrameLayer);
  disposeThreeGpuTimer(renderer.gpuTimer);
  disposeThreeGpuTimer(renderer.gpuTimer);
  clearThreePlannedDiveTrajectoryLayer(renderer.groups?.plannedDiveTrajectoryGroup);
  clearThreeDepthTrajectoryLayer(renderer.groups?.depthTrajectoryGroup);
  clearThreeSamplingTargetLayer(renderer.groups?.samplingTargetGroup);
  disposeThreePlanningInteractionLayer(renderer.planningInteractionLayer);
  disposeThreeMissionCameraController(renderer.cameraController);
  clearThreeRealizedTrajectoryLayer(renderer.groups?.realizedTrajectoryGroup);
  clearThreeObservationLayer(renderer.groups?.observationGroup);
  clearThreeSurfacingEventLayer(renderer.groups?.surfacingEventGroup);
  clearThreeRouteStatusLayer(renderer.groups?.routeStatusGroup);
  clearThreeSimulationStatusLayer(renderer.groups?.simulationStatusGroup);
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

function createInteractionSurface() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1, 1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  );
  mesh.name = 'mission-grid-interaction-surface';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.5;
  mesh.renderOrder = 999;
  mesh.userData = { missionObjectType: 'gridCell', missionObjectId: 'mission-grid-interaction-surface', planeId: 'surface', depthLayerId: 'surface', depthMeters: 0, interactionEnabled: true, visualGridEnabled: true, ownsPlanning: false, ownsSimulationState: false, ownsScoring: false };
  return mesh;
}

function updateInteractionSurface(renderer, viewModel = {}) {
  const surface = renderer.interactionSurface;
  const transform = viewModel.coordinateSystem;
  if (!surface || !transform) return;
  const width = Math.max(1, Number(viewModel.grid?.width ?? transform.width ?? 1)) * transform.cellSize;
  const height = Math.max(1, Number(viewModel.grid?.height ?? transform.height ?? 1)) * transform.cellSize;
  surface.scale.set(width, height, 1);
  surface.position.set(0, 0.5, 0);
  surface.userData = {
    ...(surface.userData ?? {}),
    gridWidth: viewModel.grid?.width ?? transform.width,
    gridHeight: viewModel.grid?.height ?? transform.height,
    coordinateSystem: transform,
    planeId: 'surface',
    depthLayerId: 'surface',
    depthMeters: 0,
    interactionEnabled: true,
    visualGridEnabled: true
  };
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
  updateThreeOperationalDepthSlabLayer(renderer.operationalDepthSlabLayer, viewModel);
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

function syncCameraBounds(renderer, viewModel) {
  if (renderer.cameraController) {
    updateThreeMissionCameraBounds(renderer.cameraController, missionBoundsFromViewModel(viewModel));
    return;
  }
  fitCamera(renderer, viewModel);
}

function fitCamera(renderer, viewModel) {
  if (renderer.cameraState?.manual) return;
  const width = Number(viewModel.grid?.width ?? 10);
  const height = Number(viewModel.grid?.height ?? 10);
  const radius = Math.max(width, height, 8);
  const preset = renderer.cameraState?.preset ?? 'obliqueMission';
  if (preset === 'tacticalTopDown') setCameraPose(renderer, { x: 0, y: radius * 1.65, z: 0.001, lookAt: [0, 0, 0] });
  else if (preset === 'waterColumnProfile' || preset === 'sideProfile') setCameraPose(renderer, { x: 0, y: radius * 0.62, z: radius * 1.78, lookAt: [0, -radius * 0.08, 0] });
  else if (preset === 'obliqueWaterColumn' || preset === 'layerStackOverview' || preset === 'activeLayer' || preset === 'selectedDive') setCameraPose(renderer, { x: -radius * 0.94, y: radius * 0.92, z: radius * 1.34, lookAt: [0, -radius * 0.12, 0] });
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
  return {
    preset: patch.preset ?? patch.cameraPreset ?? 'obliqueMission',
    manual: patch.manual === true,
    azimuthRadians: patch.azimuthRadians,
    polarRadians: patch.polarRadians,
    distance: patch.distance,
    target: patch.target ?? null
  };
}

function missionBoundsFromViewModel(viewModel = {}) {
  const grid = viewModel.grid ?? {};
  const transform = viewModel.coordinateSystem ?? {};
  const cellSize = Number(transform.cellSize ?? 1);
  const width = Math.max(1, Number(grid.width ?? transform.width ?? 12)) * cellSize;
  const height = Math.max(1, Number(grid.height ?? transform.height ?? 12)) * cellSize;
  const depthScale = Number(transform.depthScale ?? 0.045) * Number(transform.verticalExaggeration ?? viewModel.verticalExaggeration ?? 1);
  const maxDepth = Math.max(0, ...((viewModel.depthLayers ?? []).map((layer) => Number(layer.representativeDepthMeters ?? layer.depthMeters ?? 0)).filter(Number.isFinite)), Number(viewModel.bottomBoundary?.depthRange?.max ?? viewModel.bottomBoundary?.maximumDepth ?? 0));
  const minY = -Math.max(4, maxDepth * depthScale + 1);
  return {
    minX: -width / 2,
    maxX: width / 2,
    minZ: -height / 2,
    maxZ: height / 2,
    minY,
    maxY: Math.max(6, Math.max(width, height, 8) * 0.35),
    radius: Math.max(width, height, Math.abs(minY), 8),
    center: { x: 0, y: minY / 2, z: 0 }
  };
}

function defaultLayerVisibility(input = {}) {
  return {
    bathymetry: input.bathymetry !== false,
    waterSurface: input.waterSurface !== false,
    depthLayers: input.depthLayers !== false,
    waterColumnFrame: input.waterColumnFrame !== false,
    scalarField: input.scalarField !== false,
    currentVectors: input.currentVectors !== false,
    hazards: input.hazards !== false,
    constraints: input.constraints !== false,
    dropZones: input.dropZones !== false,
    gliders: input.gliders !== false,
    waypoints: input.waypoints !== false,
    routes: input.routes !== false,
    realizedTrajectories: input.realizedTrajectories !== false,
    planningMarkers: input.planningMarkers !== false,
    priorityTargets: input.priorityTargets !== false,
    samplingTargets: input.samplingTargets !== false,
    observations: input.observations !== false,
    surfacingEvents: input.surfacingEvents !== false,
    routeStatus: input.routeStatus !== false,
    selection: input.selection !== false,
    guidance: input.guidance !== false,
    interaction: input.interaction !== false
  };
}

function depthLayerColor(id) {
  if (id === 'surface') return 0x9ee7ff;
  if (id === 'thermocline') return 0x63e6be;
  if (id === 'deep') return 0xb197fc;
  return 0x54c7ec;
}

function countTrajectoryPoints(group) {
  let count = 0;
  for (const child of group?.children ?? []) count += Number(child.userData?.pointCount ?? 0);
  return count;
}

function countSceneObjects(scene) {
  let count = 0;
  scene?.traverse?.(() => { count += 1; });
  return count;
}

function countSceneResources(scene, key) {
  const seen = new Set();
  scene?.traverse?.((object) => {
    const value = object?.[key];
    if (Array.isArray(value)) value.forEach((item) => item && seen.add(item));
    else if (value) seen.add(value);
  });
  return seen.size;
}

function countSceneTextures(scene) {
  const seen = new Set();
  scene?.traverse?.((object) => {
    const materials = Array.isArray(object?.material) ? object.material : object?.material ? [object.material] : [];
    for (const material of materials) {
      for (const value of Object.values(material ?? {})) {
        if (value?.isTexture) seen.add(value);
      }
    }
  });
  return seen.size;
}

function objectGrowthWarnings(renderer) {
  const objectCount = countSceneObjects(renderer.scene);
  const warnings = [];
  if (objectCount > 2500) warnings.push(`Three mission renderer object count is high (${objectCount}).`);
  return warnings;
}

function renderLoop(renderer, timestamp = frameNow()) {
  if (!renderer || renderer.disposed) return;
  const cadenceRender = shouldRenderAtPresentationCadence(renderer, timestamp);
  if (renderer.needsRender === true || cadenceRender) {
    submitThreeMissionWorldRender(renderer, timestamp, renderer.renderRequestReason ?? (cadenceRender ? 'simulationCadence' : 'scheduled'));
  }
  renderer.continuousAnimationReason = cadenceRender ? 'simulation-presentation-cadence' : 'render-on-demand-raf-loop';
  renderer.animationFrame = globalThis.requestAnimationFrame?.((nextTimestamp) => renderLoop(renderer, nextTimestamp)) ?? null;
}

function shouldRenderAtPresentationCadence(renderer, timestamp = frameNow()) {
  if (!renderer || renderer.disposed || renderer.needsRender === true) return false;
  const viewModel = renderer.viewModel ?? {};
  const simulationActive = viewModel.phase === 'simulation' || viewModel.type === 'anchor.rendering.simulation-world';
  if (!simulationActive || viewModel.simulationStatus?.running !== true) return false;
  const maxHz = Number(renderer.presentationCadenceLimit ?? 0);
  if (!Number.isFinite(maxHz) || maxHz < 20) return false;
  const interval = 1000 / maxHz;
  const last = Number(renderer.lastRenderTimestamp ?? 0);
  return !last || Number(timestamp) - last >= interval;
}

export function requestThreeMissionWorldRender(renderer, reason = 'external') {
  if (!renderer || renderer.disposed) return renderer;
  renderer.needsRender = true;
  renderer.renderRequestReason = reason;
  recordThreePerformanceEvent(renderer.performanceMonitor, 'renderRequested', { reason });
  return renderer;
}

export function submitThreeMissionWorldRender(renderer, timestamp = frameNow(), reason = 'scheduled') {
  if (!renderer || renderer.disposed) return renderer;
  renderer.needsRender = false;
  renderer.renderRequestReason = null;
  renderer.renderCallsThisPresentationFrame = 0;
  renderer.renderFrameSequence = Number(renderer.renderFrameSequence ?? 0) + 1;
  beginThreePerformanceFrame(renderer.performanceMonitor, timestamp);
  const start = frameNow();
  beginThreeGpuTimerQuery(renderer.gpuTimer);
  renderer.renderer.render(renderer.scene, renderer.camera);
  renderer.renderCallsThisPresentationFrame += 1;
  endThreeGpuTimerQuery(renderer.gpuTimer);
  const elapsed = frameNow() - start;
  const gpuSummary = threeGpuTimerSummary(renderer.gpuTimer);
  renderer.lastRenderCallsPerPresentationFrame = Number(renderer.renderCallsThisPresentationFrame ?? 0);
  if (renderer.lastRenderCallsPerPresentationFrame > 1) renderer.duplicateRenderCallWarningCount = Number(renderer.duplicateRenderCallWarningCount ?? 0) + 1;
  renderer.lastRendererSubmissionMilliseconds = elapsed;
  renderer.lastRenderReason = reason;
  recordThreeRendererSubmissionDuration(renderer.performanceMonitor, elapsed, renderer.renderer?.info ?? null, gpuSummary);
  endThreePerformanceFrame(renderer.performanceMonitor, frameNow(), renderer.renderer?.info ?? null);
  recordThreePerformanceEvent(renderer.performanceMonitor, 'renderSubmitted', { reason, renderCallsThisPresentationFrame: renderer.lastRenderCallsPerPresentationFrame });
  return renderer;
}

function applyThreeRendererQuality(renderer, viewModel = {}) {
  const policy = waterColumnDisplayPolicy(viewModel);
  const pixelRatio = effectiveThreePixelRatio({ devicePixelRatio: globalThis.devicePixelRatio || 1, qualityProfile: policy.qualityProfile });
  renderer.qualityProfile = policy.qualityProfile;
  renderer.pixelRatioLimit = policy.pixelRatioLimit;
  renderer.presentationCadenceLimit = policy.presentationCadenceLimit;
  renderer.contextSlabMode = policy.contextSlabMode;
  renderer.allLayerFieldTexturesEnabled = policy.allLayerFieldTexturesEnabled === true;
  setThreePerformanceCadenceLimit(renderer.performanceMonitor, policy.presentationCadenceLimit);
  if (Math.abs(Number(renderer.rendererPixelRatio ?? 0) - pixelRatio) > 1e-6) {
    renderer.renderer.setPixelRatio(pixelRatio);
    renderer.rendererPixelRatio = pixelRatio;
    renderer.lastSize = { ...(renderer.lastSize ?? {}), pixelRatio, backingWidth: renderer.renderer.domElement?.width ?? null, backingHeight: renderer.renderer.domElement?.height ?? null, resizeSequence: Number(renderer.lastSize?.resizeSequence ?? 0) + 1 };
    requestThreeMissionWorldRender(renderer, 'pixelRatio');
  }
  return renderer;
}

function applyStaticMatrixPolicy(renderer) {
  let frozen = 0;
  let dynamic = 0;
  renderer.scene?.traverse?.((object) => {
    if (!object || object === renderer.scene || object === renderer.root) return;
    if (isStaticMatrixCandidate(object)) {
      object.matrixAutoUpdate = false;
      object.updateMatrix?.();
      frozen += 1;
    } else if (object.isMesh || object.isLine || object.isSprite || object.isGroup) {
      object.matrixAutoUpdate = true;
      dynamic += 1;
    }
  });
  renderer.staticMatrixFrozenObjectCount = frozen;
  renderer.dynamicMatrixObjectCount = dynamic;
  return renderer;
}

function isStaticMatrixCandidate(object = {}) {
  const name = String(object.name ?? '');
  const type = String(object.userData?.missionObjectType ?? '');
  if (object.isSprite) return false;
  if (/glider|trajectory|observation|surfacing|selection|guidance|interaction|current|waypoint|target|route/i.test(name)) return false;
  if (/glider|observation|surfacing|selection|interaction|current|waypoint|samplingTarget|priorityTarget|route/i.test(type)) return false;
  return /bathymetry|water-surface|operational-depth-slab|water-column|volume-frame|constraint|hazard|drop-zone/i.test(name) || /depthCellSlab|terrain|constraint|hazard/i.test(type);
}

function renderCostSceneCounts(renderer) {
  const counts = {
    transparentObjectCount: 0,
    fullDomainTransparentPlaneCount: 0,
    fullDomainTexturedPlaneCount: 0,
    visibleSceneObjectCount: 0,
    hiddenSceneObjectCount: 0,
    interactiveHitObjectCount: 0,
    instancedObjectCount: 0
  };
  const grid = renderer.viewModel?.grid ?? {};
  const transform = renderer.viewModel?.coordinateSystem ?? {};
  const domainArea = Math.max(1, Number(grid.width ?? transform.width ?? 1) * Number(grid.height ?? transform.height ?? 1) * Math.max(0.0001, Number(transform.cellSize ?? 1) ** 2));
  renderer.scene?.traverse?.((object) => {
    if (!object || object === renderer.scene) return;
    if (object.visible === false) counts.hiddenSceneObjectCount += 1;
    else counts.visibleSceneObjectCount += 1;
    if (object.isInstancedMesh) counts.instancedObjectCount += 1;
    if (object.userData?.interactionEnabled === true || object.userData?.interactive === true) counts.interactiveHitObjectCount += 1;
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    const transparent = materials.some((material) => material?.transparent === true || Number(material?.opacity ?? 1) < 1);
    if (transparent && object.visible !== false) counts.transparentObjectCount += 1;
    if (transparent && isFullDomainPlane(object, domainArea)) {
      counts.fullDomainTransparentPlaneCount += 1;
      if (materials.some((material) => material?.map)) counts.fullDomainTexturedPlaneCount += 1;
    }
  });
  return counts;
}

function isFullDomainPlane(object, domainArea) {
  if (!object?.isMesh || !object.geometry?.parameters) return false;
  const parameters = object.geometry.parameters;
  const width = Number(parameters.width ?? 0);
  const height = Number(parameters.height ?? 0);
  if (!(width > 0 && height > 0)) return false;
  return width * height >= domainArea * 0.82;
}

function performanceGate(renderer) {
  const summary = threeMissionPerformanceSummary(renderer.performanceMonitor ?? null);
  const failures = [];
  if (summary.sampleCount >= 10 && Number(summary.averageFrameMilliseconds) > 50) failures.push('averageFrameIntervalOver50ms');
  if (summary.sampleCount >= 10 && Number(summary.p95FrameMilliseconds) > 100) failures.push('p95FrameIntervalOver100ms');
  if (summary.sampleCount >= 10 && Number(summary.renderedFramesPerSecond) < 20) failures.push('renderedFpsUnder20');
  if (Number(renderer.lastRenderCallsPerPresentationFrame ?? 0) > 1) failures.push('duplicateRenderCalls');
  return { performanceGateStatus: failures.length ? 'FAIL' : summary.sampleCount >= 10 ? 'PASS' : 'INSUFFICIENT_SAMPLES', performanceGateFailures: failures };
}
function recordRendererUpdateEvents(renderer, viewModel = {}) {
  if (!renderer?.performanceMonitor) return;
  const cameraGestureActive = renderer.cameraController?.gestureActive === true;
  const dirty = dirtyCategorySet(viewModel);
  const has = (...categories) => !dirty || categories.some((category) => dirty.has(category));
  recordThreePerformanceEvent(renderer.performanceMonitor, 'rendererUpdate');
  if (has('scalarField', 'waterColumn') && ((viewModel.depthLayers ?? []).length || viewModel.layerFields || viewModel.scalarFieldLayer)) {
    if (cameraGestureActive) recordThreePerformanceEvent(renderer.performanceMonitor, 'textureUpdateDuringCameraGesture');
  }
  if (has('currentVectors', 'waterColumn') && ((viewModel.layerCurrents && Object.keys(viewModel.layerCurrents).length) || (viewModel.vectorFieldLayer?.vectors ?? []).length)) {
    if (cameraGestureActive) recordThreePerformanceEvent(renderer.performanceMonitor, 'currentBufferUpdateDuringCameraGesture');
  }
  if (has('plannedRoute') && cameraGestureActive && (viewModel.plannedDiveSegments ?? []).length) {
    recordThreePerformanceEvent(renderer.performanceMonitor, 'predictionBuildDuringCameraGesture');
  }
}
function dirtyCategorySet(viewModel = {}) {
  if (!Object.prototype.hasOwnProperty.call(viewModel, 'presentationDirtyCategories')) return null;
  return new Set((viewModel.presentationDirtyCategories ?? []).map((item) => String(item)).filter(Boolean));
}

function scalarFieldFrameSignature(viewModel = {}) {
  const field = viewModel.scalarFieldLayer ?? {};
  const volumetric = viewModel.layerFields ?? {};
  return [
    field.id ?? 'none',
    field.timeSeconds ?? viewModel.activeTimeSeconds ?? 0,
    viewModel.activeDepthLayerId ?? 'surface',
    viewModel.visibility?.activeLayerOnlyFields !== false,
    Object.keys(volumetric).join('|'),
    viewModel.displaySettings?.qualityProfile ?? viewModel.options?.qualityProfile ?? 'balanced'
  ].join(':');
}

function currentFieldFrameSignature(viewModel = {}) {
  const field = viewModel.vectorFieldLayer ?? {};
  const layers = viewModel.layerCurrents ?? {};
  return [
    field.id ?? 'none',
    field.timeSeconds ?? viewModel.activeTimeSeconds ?? 0,
    viewModel.activeDepthLayerId ?? 'surface',
    viewModel.visibility?.activeLayerOnlyCurrents !== false,
    Object.keys(layers).join('|'),
    viewModel.displaySettings?.qualityProfile ?? viewModel.options?.qualityProfile ?? 'balanced'
  ].join(':');
}
function frameNow() {
  return globalThis.performance?.now?.() ?? Date.now?.() ?? 0;
}
