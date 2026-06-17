import { normalizeBathymetryViewMode } from '../../../core/science/BathymetrySchema.js';
import {
  createBasinSeamountBathymetry,
  createCoastalOperationalBathymetry,
  createIslandArcBathymetry,
  createShelfCanyonBathymetry
} from '../../../core/science/BathymetryFieldModel.js';
import { createBathymetryCamera, updateBathymetryCamera } from '../../../core/science/BathymetryMeshModel.js';
import { normalizeWaterColumnConfig } from '../../../core/science/WaterColumnSchema.js';
import {
  buildBathymetryWorldRenderViewModel,
  bathymetryWorldRenderViewModelSummary
} from '../../../core/rendering/BathymetryWorldRenderViewModel.js';
import {
  createThreeBathymetryRenderer,
  disposeThreeBathymetryRenderer,
  resizeThreeBathymetryRenderer,
  setBathymetryCamera,
  setBathymetryLayerVisibility,
  threeBathymetryRendererSummary,
  updateThreeBathymetryScene
} from '../../three/ThreeBathymetryRenderer.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const BATHYMETRY_WORLD_VIEW_SCENE_VERSION = 'bathymetry-world-view-scene-gfx-r2';

const TERRAIN_SCENARIOS = {
  coastalShelf: { label: 'Coastal Shelf', create: createCoastalOperationalBathymetry },
  shelfCanyon: { label: 'Shelf Canyon', create: createShelfCanyonBathymetry },
  islandArc: { label: 'Island Arc', create: createIslandArcBathymetry },
  basinSeamount: { label: 'Basin + Seamount', create: createBasinSeamountBathymetry }
};

export class BathymetryWorldViewScene extends PhaserScene {
  constructor() {
    super('BathymetryWorldViewScene');
    this.objects = [];
    this.viewMode = 'obliqueBathymetry';
    this.terrainScenario = 'coastalShelf';
    this.camera = createBathymetryCamera({ yaw: -42, pitch: 42, zoom: 58, verticalExaggeration: 1.8 });
    this.layerVisibility = {
      bathymetry: true,
      waterSurface: true,
      surface: true,
      thermocline: true,
      deep: true,
      surfaceWaypoints: true,
      samplingPoints: true,
      plannedRoute: true,
      realizedTrajectory: true,
      diveProfilePath: true,
      flowVectors: true
    };
  }

  create() {
    this.app = this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    if (!this.app) return;
    this.app.state.mode = 'bathymetryWorldView';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('3D Bathymetric World View');
    this.drawPhaserBackdrop();
    this.mountRendererContainer();
    this.rebuildWorld();
    this.initializeRenderer();
    this.renderConsole();
    this.renderThreeScene();
    this.refreshDebugObject(true);
  }

  shutdown() {
    this.destroyRenderer();
    this.clearObjects();
    this.refreshDebugObject(false);
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.drawPhaserBackdrop();
    resizeThreeBathymetryRenderer(this.threeRenderer);
    this.refreshDebugObject(true);
  }

  rebuildWorld() {
    this.waterColumnConfig = normalizeWaterColumnConfig({
      depthLayerIds: ['surface', 'thermocline', 'deep'],
      diveProfileId: 'sawtoothProfile'
    });
    const createBathymetry = TERRAIN_SCENARIOS[this.terrainScenario]?.create ?? createCoastalOperationalBathymetry;
    this.bathymetry = createBathymetry({
      seed: `gfx-r2-${this.terrainScenario}`,
      width: 58,
      height: 38,
      maxDepthMeters: 280,
      verticalExaggeration: this.camera.verticalExaggeration,
      defaultViewMode: this.viewMode
    });
    this.plan = createDemoPlan(this.terrainScenario);
    this.tracks = createDemoTrack(this.plan);
    this.observations = createDemoObservations(this.tracks);
    this.motionTrajectory = {
      type: 'anchor.motion.trajectory',
      planId: this.plan.planId,
      gliderId: this.plan.gliderId,
      plannedWaypoints: this.plan.waypoints,
      realizedTrack: this.tracks,
      sampledObservations: this.observations,
      motionDiagnostics: {
        summary: {
          motionModelId: 'depthLayerKinematic',
          plannedDistance: 42.6,
          realizedDistance: 44.3,
          meanTrackError: 0.54,
          energyUsed: 29.2,
          sampledPointCount: this.observations.length
        }
      },
      generatedRoute: false,
      usesWebGPUFluid: false,
      usesMARL: false
    };
    this.viewModel = buildBathymetryWorldRenderViewModel({
      bathymetry: this.bathymetry,
      waterColumnConfig: this.waterColumnConfig,
      plan: this.plan,
      tracks: this.tracks,
      observations: this.observations,
      motionTrajectory: this.motionTrajectory,
      scienceDiagnostics: { primaryDiagnosis: 'syntheticBathymetryInspection', publicSafe: true },
      options: {
        verticalExaggeration: this.camera.verticalExaggeration,
        terrainScenario: this.terrainScenario,
        layerVisibility: this.layerVisibility,
        flowVectorStride: 6
      }
    });
  }

  initializeRenderer() {
    if (this.threeRenderer || !this.rendererContainer) return;
    this.threeRenderer = createThreeBathymetryRenderer(this.rendererContainer, {
      camera: this.camera,
      layerVisibility: this.layerVisibility
    });
  }

  renderThreeScene() {
    if (!this.threeRenderer) return;
    updateThreeBathymetryScene(this.threeRenderer, this.viewModel);
    setBathymetryLayerVisibility(this.threeRenderer, this.layerVisibility);
    setBathymetryCamera(this.threeRenderer, this.camera);
  }

  renderConsole() {
    this.app.console?.renderBathymetryWorldViewControls?.(this.controlState(), {
      viewMode: (value) => this.patch({ viewMode: normalizeBathymetryViewMode(value) }),
      terrainScenario: (value) => this.patch({ terrainScenario: TERRAIN_SCENARIOS[value] ? value : 'coastalShelf' }, true),
      yaw: (value) => this.patchCamera({ yaw: Number(value) }),
      pitch: (value) => this.patchCamera({ pitch: Number(value) }),
      zoom: (value) => this.patchCamera({ zoom: Number(value) }),
      verticalExaggeration: (value) => this.patchCamera({ verticalExaggeration: Number(value) }, true),
      toggle: (key, value) => this.patchLayerVisibility(key, value),
      resetCamera: () => this.resetCamera(),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  controlState() {
    return {
      title: '3D Bathymetric World View',
      status: 'Three.js ocean terrain renderer',
      viewMode: this.viewMode,
      terrainScenario: this.terrainScenario,
      terrainScenarios: Object.entries(TERRAIN_SCENARIOS).map(([id, value]) => ({ id, label: value.label })),
      camera: this.camera,
      layerVisibility: this.layerVisibility,
      summary: bathymetryWorldRenderViewModelSummary(this.viewModel ?? {})
    };
  }

  patch(patch = {}, forceRebuild = false) {
    Object.assign(this, patch);
    if (forceRebuild || patch.viewMode || patch.terrainScenario) this.rebuildWorld();
    this.renderConsole();
    this.renderThreeScene();
    this.refreshDebugObject(true);
  }

  patchCamera(patch = {}, rebuild = false) {
    this.camera = updateBathymetryCamera(this.camera, patch);
    if (rebuild) this.rebuildWorld();
    this.renderConsole();
    this.renderThreeScene();
    this.refreshDebugObject(true);
  }

  patchLayerVisibility(key, value) {
    this.layerVisibility = { ...this.layerVisibility, [key]: Boolean(value) };
    this.renderConsole();
    setBathymetryLayerVisibility(this.threeRenderer, this.layerVisibility);
    this.refreshDebugObject(true);
  }

  resetCamera() {
    this.camera = createBathymetryCamera({ yaw: -42, pitch: 42, zoom: 58, verticalExaggeration: 1.8 });
    this.layerVisibility = {
      bathymetry: true,
      waterSurface: true,
      surface: true,
      thermocline: true,
      deep: true,
      surfaceWaypoints: true,
      samplingPoints: true,
      plannedRoute: true,
      realizedTrajectory: true,
      diveProfilePath: true,
      flowVectors: true
    };
    this.rebuildWorld();
    this.renderConsole();
    this.renderThreeScene();
    this.refreshDebugObject(true);
  }

  mountRendererContainer() {
    const host = this.app?.elements?.viewportShell ?? this.app?.elements?.gameContainer ?? globalThis.document?.getElementById?.('viewport-shell');
    if (!host || this.rendererContainer) return;
    this.rendererContainer = globalThis.document.createElement('div');
    this.rendererContainer.id = 'bathymetry-three-renderer-host';
    this.rendererContainer.className = 'bathymetry-three-renderer-host';
    host.appendChild(this.rendererContainer);
  }

  destroyRenderer() {
    disposeThreeBathymetryRenderer(this.threeRenderer);
    this.threeRenderer = null;
    this.rendererContainer?.remove?.();
    this.rendererContainer = null;
    this.resizeObserver?.disconnect?.();
    this.resizeObserver = null;
  }

  drawPhaserBackdrop() {
    this.clearObjects();
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x03101d, 0x08243a, 0x061827, 0x020812, 1);
    graphics.fillRect(0, 0, width, height);
    this.objects.push(graphics);
  }

  clearObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
  }

  refreshDebugObject(active = true) {
    const summary = bathymetryWorldRenderViewModelSummary(this.viewModel ?? {});
    const rendererSummary = threeBathymetryRendererSummary(this.threeRenderer ?? {});
    globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG = {
      version: BATHYMETRY_WORLD_VIEW_SCENE_VERSION,
      active: Boolean(active),
      renderer: 'three',
      rendererBackend: 'three',
      threeAvailable: rendererSummary.threeAvailable === true,
      terrainScenario: this.terrainScenario,
      bathymetryDepthRange: summary.depthRange,
      depthRange: summary.depthRange,
      featureIds: summary.featureIds,
      terrainVertexCount: summary.terrainVertexCount,
      coastlineEdgeCount: summary.coastlineEdgeCount,
      depthLayerCount: summary.depthLayerCount,
      bottomHazardZoneCount: summary.bottomHazardZoneCount,
      layerVisibility: this.layerVisibility,
      camera: this.camera,
      surfaceWaypointCount: summary.surfaceWaypointCount,
      samplingPointCount: summary.samplingPointCount,
      plannedPathPointCount: summary.plannedPathPointCount,
      realizedTrajectoryPointCount: summary.realizedTrajectoryPointCount,
      flowVectorCount: summary.flowVectorCount,
      usesThreeRenderer: true,
      usesThree: true,
      usesEnable3D: false,
      usesFull3DPlanning: false,
      usesWebGPUFluid: false,
      usesHydrodynamicSolver: false,
      usesTerrainFlowAsOceanCurrent: false,
      usesMARL: false,
      ownsSimulationState: false,
      ownsScoring: false,
      ownsPlanning: false,
      rendererSummary
    };
  }
}

function createDemoPlan(scenarioId) {
  const canyonRoute = scenarioId === 'shelfCanyon' || scenarioId === 'coastalShelf';
  const waypoints = canyonRoute
    ? [
        { waypointId: 'wp-1', x: 7, y: 30, depthLayerId: 'surface', depthMeters: 0 },
        { waypointId: 'wp-2', x: 15, y: 25, depthLayerId: 'thermocline', depthMeters: 35 },
        { waypointId: 'wp-3', x: 25, y: 19, depthLayerId: 'deep', depthMeters: 120 },
        { waypointId: 'wp-4', x: 38, y: 13, depthLayerId: 'thermocline', depthMeters: 35 },
        { waypointId: 'wp-5', x: 50, y: 8, depthLayerId: 'surface', depthMeters: 0 }
      ]
    : [
        { waypointId: 'wp-1', x: 8, y: 29, depthLayerId: 'surface', depthMeters: 0 },
        { waypointId: 'wp-2', x: 20, y: 22, depthLayerId: 'thermocline', depthMeters: 35 },
        { waypointId: 'wp-3', x: 32, y: 16, depthLayerId: 'deep', depthMeters: 120 },
        { waypointId: 'wp-4', x: 44, y: 21, depthLayerId: 'thermocline', depthMeters: 35 },
        { waypointId: 'wp-5', x: 52, y: 12, depthLayerId: 'surface', depthMeters: 0 }
      ];
  return {
    type: 'anchor.demo.bathymetry-view-plan',
    planId: `gfx-r2-${scenarioId}-plan`,
    gliderId: 'glider-gfx-r2',
    diveProfileId: 'sawtoothProfile',
    generatesRoute: false,
    waypoints
  };
}

function createDemoTrack(plan) {
  return (plan.waypoints ?? []).map((point, index) => ({
    id: `track-${index + 1}`,
    x: Number(point.x) + (index % 2 === 0 ? 0.4 : -0.7),
    y: Number(point.y) + (index % 2 === 0 ? -0.5 : 0.6),
    depthLayerId: point.depthLayerId,
    depthMeters: point.depthMeters,
    timeSeconds: index * 660,
    trackError: index === 0 ? 0 : 0.3 + index * 0.08
  }));
}

function createDemoObservations(tracks) {
  return (tracks ?? []).filter((_point, index) => index > 0 && index < tracks.length - 1).map((point, index) => ({
    observationId: `obs-${index + 1}`,
    x: point.x,
    y: point.y,
    depthLayerId: point.depthLayerId,
    depthMeters: point.depthMeters,
    observedValue: Number((0.42 + index * 0.12).toFixed(2)),
    timeSeconds: point.timeSeconds
  }));
}