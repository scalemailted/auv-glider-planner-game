import { normalizeBathymetryViewMode } from '../../../core/science/BathymetrySchema.js';
import { createSyntheticBathymetryField } from '../../../core/science/BathymetryFieldModel.js';
import { createBathymetryCamera, updateBathymetryCamera } from '../../../core/science/BathymetryMeshModel.js';
import { buildOceanWorldGeometry, oceanWorldGeometrySummary } from '../../../core/science/OceanWorldGeometryAdapter.js';
import { normalizeWaterColumnConfig } from '../../../core/science/WaterColumnSchema.js';
import { drawBathymetryWorld, BATHYMETRY_WORLD_RENDERER_VERSION } from '../renderers/BathymetryWorldRenderer.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const BATHYMETRY_WORLD_VIEW_SCENE_VERSION = 'bathymetry-world-view-scene-env-r1';

export class BathymetryWorldViewScene extends PhaserScene {
  constructor() {
    super('BathymetryWorldViewScene');
    this.objects = [];
    this.legendObjects = [];
    this.viewMode = 'obliqueBathymetry';
    this.camera = createBathymetryCamera({ yaw: -34, pitch: 48, zoom: 20, verticalExaggeration: 1.5 });
    this.layerVisibility = {
      bathymetry: true,
      waterSurface: true,
      surface: true,
      thermocline: true,
      deep: true,
      plannedPath: true,
      realizedTrajectory: true,
      samplingPoints: true,
      diveProfilePath: true
    };
  }

  create() {
    this.app = this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    if (!this.app) return;
    this.app.state.mode = 'bathymetryWorldView';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Bathymetric World View');
    this.rebuildGeometry();
    this.renderConsole();
    this.buildSceneObjects();
    this.draw();
    this.refreshDebugObject(true);
  }

  shutdown() {
    this.destroyObjects();
    this.refreshDebugObject(false);
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.buildSceneObjects();
    this.draw();
  }

  rebuildGeometry() {
    this.waterColumnConfig = normalizeWaterColumnConfig({
      depthLayerIds: ['surface', 'thermocline', 'deep'],
      diveProfileId: 'sawtoothProfile'
    });
    this.bathymetry = createSyntheticBathymetryField({
      seed: 'env-r1-bathymetry-view',
      width: 30,
      height: 20,
      maxDepthMeters: 180,
      verticalExaggeration: this.camera.verticalExaggeration,
      defaultViewMode: this.viewMode,
      features: ['continentalShelf', 'shelfBreak', 'submarineCanyon', 'abyssalPlain', 'seamount', 'riverMouth']
    });
    this.plan = {
      type: 'anchor.demo.bathymetry-view-plan',
      planId: 'env-r1-example-plan',
      gliderId: 'glider-env-r1',
      diveProfileId: 'sawtoothProfile',
      generatesRoute: false,
      waypoints: [
        { waypointId: 'wp-1', x: 4, y: 16, depthLayerId: 'surface', depthMeters: 0 },
        { waypointId: 'wp-2', x: 9, y: 12, depthLayerId: 'thermocline', depthMeters: 35 },
        { waypointId: 'wp-3', x: 15, y: 10, depthLayerId: 'deep', depthMeters: 120 },
        { waypointId: 'wp-4', x: 22, y: 7, depthLayerId: 'thermocline', depthMeters: 35 },
        { waypointId: 'wp-5', x: 27, y: 4, depthLayerId: 'surface', depthMeters: 0 }
      ]
    };
    this.tracks = [
      { id: 'track-1', x: 4, y: 16, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 0 },
      { id: 'track-2', x: 7.8, y: 13.1, depthLayerId: 'thermocline', depthMeters: 32, timeSeconds: 600, trackError: 0.2 },
      { id: 'track-3', x: 13.7, y: 10.9, depthLayerId: 'deep', depthMeters: 112, timeSeconds: 1320, trackError: 0.6 },
      { id: 'track-4', x: 20.5, y: 7.7, depthLayerId: 'thermocline', depthMeters: 38, timeSeconds: 2040, trackError: 0.5 },
      { id: 'track-5', x: 26.2, y: 4.8, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 2760, trackError: 0.4 }
    ];
    this.observations = [
      { observationId: 'obs-surface-1', x: 4, y: 16, depthLayerId: 'surface', depthMeters: 0, observedValue: 0.34, timeSeconds: 0 },
      { observationId: 'obs-thermocline-1', x: 7.8, y: 13.1, depthLayerId: 'thermocline', depthMeters: 32, observedValue: 0.66, timeSeconds: 600 },
      { observationId: 'obs-deep-1', x: 13.7, y: 10.9, depthLayerId: 'deep', depthMeters: 112, observedValue: 0.48, timeSeconds: 1320 },
      { observationId: 'obs-thermocline-2', x: 20.5, y: 7.7, depthLayerId: 'thermocline', depthMeters: 38, observedValue: 0.72, timeSeconds: 2040 }
    ];
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
          plannedDistance: 27.8,
          realizedDistance: 29.1,
          meanTrackError: 0.42,
          energyUsed: 21.4,
          sampledPointCount: this.observations.length
        }
      },
      generatedRoute: false,
      usesWebGPUFluid: false,
      usesMARL: false
    };
    this.geometry = buildOceanWorldGeometry({
      missionConfig: { world: { width: 30, height: 20, waterColumnConfig: this.waterColumnConfig, bathymetryConfig: this.bathymetry.config } },
      bathymetry: this.bathymetry,
      waterColumnConfig: this.waterColumnConfig,
      observations: this.observations,
      tracks: this.tracks,
      motionTrajectory: this.motionTrajectory,
      plan: this.plan,
      options: {
        flowOverlaySummary: { present: true, currentField: 'F(x,y,z,t)', note: 'Terrain-flow accumulation is not ocean current.' },
        motionDynamicsSummary: this.motionTrajectory.motionDiagnostics.summary
      }
    });
  }

  renderConsole() {
    this.app.console?.renderBathymetryWorldViewControls?.(this.controlState(), {
      viewMode: (value) => this.patch({ viewMode: normalizeBathymetryViewMode(value) }),
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
      title: 'Bathymetric World View',
      status: 'Layered ocean view',
      viewMode: this.viewMode,
      camera: this.camera,
      layerVisibility: this.layerVisibility,
      summary: oceanWorldGeometrySummary(this.geometry)
    };
  }

  patch(patch = {}) {
    Object.assign(this, patch);
    this.rebuildGeometry();
    this.renderConsole();
    this.draw();
    this.refreshDebugObject(true);
  }

  patchCamera(patch = {}, rebuild = false) {
    this.camera = updateBathymetryCamera(this.camera, patch);
    if (rebuild) this.rebuildGeometry();
    this.renderConsole();
    this.draw();
    this.refreshDebugObject(true);
  }

  patchLayerVisibility(key, value) {
    this.layerVisibility = { ...this.layerVisibility, [key]: Boolean(value) };
    this.renderConsole();
    this.draw();
    this.refreshDebugObject(true);
  }

  resetCamera() {
    this.camera = createBathymetryCamera({ yaw: -34, pitch: 48, zoom: 20, verticalExaggeration: 1.5 });
    this.layerVisibility = {
      bathymetry: true,
      waterSurface: true,
      surface: true,
      thermocline: true,
      deep: true,
      plannedPath: true,
      realizedTrajectory: true,
      samplingPoints: true,
      diveProfilePath: true
    };
    this.patch({});
  }

  buildSceneObjects() {
    this.destroyObjects();
    this.graphics = this.add.graphics();
    this.titleText = this.add.text(0, 0, 'Bathymetric World View', {
      fontFamily: 'system-ui',
      fontSize: '29px',
      fontStyle: '700',
      color: '#eef6ff'
    }).setOrigin(0, 0);
    this.subtitleText = this.add.text(0, 0, '2.5D mission state rendered as synthetic bathymetry, transparent depth layers, route intent, sampling points, and realized trajectory.', {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#b5cbe5',
      wordWrap: { width: 960 }
    }).setOrigin(0, 0);
    this.copyText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#d7e7f7',
      lineSpacing: 5,
      wordWrap: { width: 760 }
    }).setOrigin(0, 0);
    this.objects.push(this.graphics, this.titleText, this.subtitleText, this.copyText);
  }

  draw() {
    if (!this.graphics) return;
    this.destroyLegendObjects();
    this.graphics.clear();
    const layout = this.layout();
    this.graphics.fillGradientStyle(0x06111f, 0x0b273d, 0x071827, 0x04101d, 1);
    this.graphics.fillRect(0, 0, layout.width, layout.height);
    this.graphics.lineStyle(1, 0x65c7f0, 0.08);
    for (let y = layout.top + 72; y < layout.height; y += 54) this.graphics.lineBetween(0, y, layout.width, y + Math.sin(y * 0.02) * 12);
    this.titleText.setPosition(layout.margin, layout.top);
    this.subtitleText.setPosition(layout.margin, layout.top + 40);
    this.copyText.setPosition(layout.margin, layout.height - layout.copyHeight).setText([
      '2.5D means the mission remains waypoint/dive-profile based, while the view shows simplified depth layers under the tactical map.',
      'Bathymetry is environmental geometry. It does not replace the water-column state model.',
      'Surface waypoints are route intent. Sampling points show where observations were actually collected.',
      'ENV-R1 does not add full 3D route planning, a new planner, production hydrodynamics, or MARL/RL.'
    ].join('\n'));
    const camera = updateBathymetryCamera(this.camera, {
      centerX: 14.5,
      centerY: 9.5,
      panX: layout.map.x + layout.map.width * 0.5 + Number(this.camera.panX ?? 0),
      panY: layout.map.y + layout.map.height * 0.52 + Number(this.camera.panY ?? 0)
    });
    this.graphics.fillStyle(0x081827, 0.78);
    this.graphics.fillRoundedRect(layout.map.x, layout.map.y, layout.map.width, layout.map.height, 8);
    this.graphics.lineStyle(1, 0x8fe9ff, 0.26);
    this.graphics.strokeRoundedRect(layout.map.x, layout.map.y, layout.map.width, layout.map.height, 8);
    drawBathymetryWorld(this.graphics, this.geometry, camera, {
      showBathymetry: this.layerVisibility.bathymetry,
      showWaterSurface: this.layerVisibility.waterSurface,
      layerVisibility: this.layerVisibility,
      showPlannedPath: this.layerVisibility.plannedPath,
      showRealizedTrajectory: this.layerVisibility.realizedTrajectory,
      showSamplingPoints: this.layerVisibility.samplingPoints,
      showDiveProfilePath: this.layerVisibility.diveProfilePath,
      drawLabels: false
    });
    this.drawLegend(layout);
  }

  drawLegend(layout) {
    const x = layout.map.x + 16;
    let y = layout.map.y + 14;
    const items = [
      ['Water surface', 0x8fe9ff],
      ['Surface layer', 0x8fe9ff],
      ['Thermocline layer', 0xf6d365],
      ['Deep layer', 0xcba6f7],
      ['Planned route', 0xf6d365],
      ['Realized trajectory', 0x63e6be],
      ['Sampling points', 0xffffff]
    ];
    this.graphics.fillStyle(0x06111f, 0.62);
    this.graphics.fillRoundedRect(x - 10, y - 8, 188, items.length * 19 + 14, 6);
    for (const [label, color] of items) {
      this.graphics.fillStyle(color, 0.85);
      this.graphics.fillCircle(x, y + 6, 4);
      const text = this.add.text(x + 12, y, label, {
        fontFamily: 'system-ui',
        fontSize: '11px',
        color: '#d7e7f7'
      }).setOrigin(0, 0);
      this.legendObjects.push(text);
      this.objects.push(text);
      y += 19;
    }
  }

  layout() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(22, Math.min(54, width * 0.045));
    const top = Math.max(22, Math.min(42, height * 0.055));
    const copyHeight = 92;
    return {
      width,
      height,
      margin,
      top,
      copyHeight,
      map: {
        x: margin,
        y: top + 88,
        width: Math.max(320, width - margin * 2),
        height: Math.max(260, height - top - 112 - copyHeight)
      }
    };
  }

  refreshDebugObject(active = true) {
    const summary = oceanWorldGeometrySummary(this.geometry ?? {});
    globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG = {
      version: BATHYMETRY_WORLD_VIEW_SCENE_VERSION,
      active: Boolean(active),
      rendererBackend: 'phaserGraphicsPseudo3D',
      rendererVersion: BATHYMETRY_WORLD_RENDERER_VERSION,
      usesThree: false,
      usesPseudo3DProjection: true,
      bathymetryConfig: this.bathymetry?.config ?? null,
      depthRange: summary.bathymetryDepthRange,
      featureIds: summary.bathymetryFeatureIds,
      camera: this.camera,
      layerVisibility: this.layerVisibility,
      surfaceWaypointCount: summary.surfaceWaypointCount,
      samplingPointCount: summary.samplingPointCount,
      plannedPathPointCount: summary.plannedPathPointCount,
      realizedTrajectoryPointCount: summary.realizedTrajectoryPointCount,
      hasDiveProfilePath: summary.hasDiveProfilePath,
      usesFull3DPlanning: false,
      usesHydrodynamicSolver: false,
      usesTerrainFlowAsOceanCurrent: false,
      usesWebGPUFluid: false,
      usesMARL: false,
      ownsSimulationState: false,
      ownsScoring: false,
      ownsPlanning: false
    };
  }

  destroyObjects() {
    this.destroyLegendObjects();
    for (const object of this.objects ?? []) object?.destroy?.();
    this.objects = [];
  }

  destroyLegendObjects() {
    for (const object of this.legendObjects ?? []) object?.destroy?.();
    this.legendObjects = [];
    this.objects = (this.objects ?? []).filter((object) => !object?.destroyed);
  }
}
