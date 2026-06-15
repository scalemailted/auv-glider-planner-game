import {
  advanceDemoParticles,
  buildFlowDemoDiagnostics,
  buildFlowDemoModelMetadata,
  createDemoParticles,
  createDefaultFlowLayer,
  createDemoTerrain,
  FLOW_DEMO_DEFAULT_LAYERS,
  FLOW_DEMO_DEFAULT_PRESETS,
  FLOW_DEMO_GRID,
  normalizeBoundaryMode,
  normalizeDynamicComplexity,
  getFlowDemoPresetConfig,
  getFlowDemoPresetMetadata,
  isDemoLand,
  normalizeAdditiveLayers,
  normalizeEvolutionControls,
  normalizeTerrainMode,
  normalizeFieldMode,
  normalizeEvolutionBehavior,
  normalizeEvolutionPattern,
  normalizeSpatialMotion,
  normalizeVariationLevel,
  sampleDemoFlow,
  summarizeDemoFlowMagnitudes
} from '../../../core/demo/FlowFieldDemo.js';
import {
  flowFieldBehaviorExplainer,
  flowFieldCompositionExplainer
} from '../../../core/demo/FlowFieldBehaviorExplainers.js';
import { buildDemoArtifactEnvelope, buildGridFields, demoArtifactFilename, normalizeDemoExportSettings, validateDemoExportSettings } from '../../../core/io/DemoArtifactExporter.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class FlowFieldDemoScene extends PhaserScene {
  constructor() {
    super('FlowFieldDemoScene');
    this.objects = [];
    this.transportRefs = {};
    this.fieldMode = 'dynamic';
    this.preset = FLOW_DEMO_DEFAULT_PRESETS.dynamic;
    this.additiveLayers = normalizeAdditiveLayers(FLOW_DEMO_DEFAULT_LAYERS);
    this.terrainMode = 'blendedCoastal';
    this.terrainSeed = 'anchor-demo-1';
    this.terrain = createDemoTerrain({ mode: this.terrainMode, seed: this.terrainSeed });
    this.playbackSpeedScale = 1;
    this.flowEvolutionSpeedScale = 1;
    this.evolutionSpeedScale = 1;
    this.evolutionBehavior = 'continuous';
    this.cycleDuration = 60;
    this.directionVariation = 'high';
    this.magnitudeVariation = 'high';
    this.dynamicComplexity = 'high';
    this.evolutionPattern = 'composite';
    this.spatialMotion = 'meander';
    this.spatialMotionSpeed = 1;
    this.boundaryMode = 'deflectAlongShore';
    this.magnitudeScale = 1.5;
    this.particleSpeedScale = 1;
    this.demoTime = 0;
    this.paused = false;
    this.playbackDirection = 1;
    this.lastDeltaSeconds = 0;
    this.lastDebugDemoTime = -Infinity;
    this.flowDiagnostics = null;
    this.flowFieldModel = null;
    this.selectedCell = null;
    this.rightPanelMode = 'cellInspector';
    this.selectedHelpTopic = null;
    this.lastInspectorRenderTime = -Infinity;
    this.lastInspectorKey = '';
    this.exportMode = 'currentFrame';
    this.exportStartTime = 0;
    this.exportEndTime = 120;
    this.exportFrameCount = 1;
  }

  init(data = {}) {
    this.fieldMode = normalizeFieldMode(data.fieldMode ?? data.mode ?? 'dynamic');
    this.preset = data.preset ?? FLOW_DEMO_DEFAULT_PRESETS[this.fieldMode] ?? FLOW_DEMO_DEFAULT_PRESETS.dynamic;
    this.additiveLayers = normalizeAdditiveLayers(data.additiveLayers ?? legacyAdditiveLayers(data));
    this.terrainMode = normalizeTerrainMode(data.terrainMode ?? 'blendedCoastal');
    this.terrainSeed = data.terrainSeed ?? 'anchor-demo-1';
    this.terrain = createDemoTerrain({ mode: this.terrainMode, seed: this.terrainSeed });
    this.playbackSpeedScale = finiteNumber(data.playbackSpeedScale ?? data.evolutionSpeedScale ?? data.timeSpeedScale, 1);
    this.flowEvolutionSpeedScale = finiteNumber(data.flowEvolutionSpeedScale ?? data.currentEvolutionSpeedScale, 1);
    this.evolutionSpeedScale = this.playbackSpeedScale;
    this.evolutionBehavior = normalizeEvolutionBehavior(data.evolutionBehavior ?? 'continuous');
    this.cycleDuration = finiteNumber(data.cycleDuration, 60);
    this.directionVariation = normalizeVariationLevel(data.directionVariation ?? 'high');
    this.magnitudeVariation = normalizeVariationLevel(data.magnitudeVariation ?? 'high');
    this.dynamicComplexity = normalizeDynamicComplexity(data.dynamicComplexity ?? 'high');
    this.evolutionPattern = normalizeEvolutionPattern(data.evolutionPattern ?? 'composite');
    this.spatialMotion = normalizeSpatialMotion(data.spatialMotion ?? 'meander');
    this.spatialMotionSpeed = finiteNumber(data.spatialMotionSpeed, 1);
    this.boundaryMode = normalizeBoundaryMode(data.boundaryMode ?? 'deflectAlongShore');
    this.magnitudeScale = finiteNumber(data.magnitudeScale, 1.5);
    this.particleSpeedScale = finiteNumber(data.particleSpeedScale, 1);
    this.demoTime = 0;
    this.paused = false;
    this.playbackDirection = normalizePlaybackDirection(data.playbackDirection);
    this.lastDeltaSeconds = 0;
    this.lastDebugDemoTime = -Infinity;
    this.flowDiagnostics = null;
    this.flowFieldModel = null;
    this.selectedCell = normalizeSelectedCell(data.selectedCell);
    this.rightPanelMode = normalizeRightPanelMode(data.rightPanelMode);
    this.selectedHelpTopic = normalizeHelpTopic(data.selectedHelpTopic);
    this.lastInspectorRenderTime = -Infinity;
    this.lastInspectorKey = '';
    this.exportMode = normalizeExportMode(data.exportMode);
    this.exportStartTime = finiteNumber(data.exportStartTime ?? this.demoTime, this.demoTime);
    this.exportEndTime = finiteNumber(data.exportEndTime ?? Math.max(120, this.demoTime), Math.max(120, this.demoTime));
    this.exportFrameCount = Math.max(1, Math.round(finiteNumber(data.exportFrameCount, 1)));
    this.particles = createDemoParticles({
      count: this.fieldMode === 'static' ? 18 : 22,
      seed: this.particleSeed()
    });
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'flowDemo';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel(this.title());
    this.renderConsole();
    this.renderTransportBar();
    this.renderCellInspector(true);
    this.buildSceneObjects();
    this.bindInputHandlers();
    this.draw();
  }

  shutdown() {
    this.unbindInputHandlers();
    this.destroyObjects();
    this.clearTransportBar();
    this.clearCellInspector();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.buildSceneObjects();
    this.draw();
  }

  update(_time, delta) {
    if (this.paused) {
      this.draw();
      return;
    }
    const dt = Math.min(0.05, Math.max(0, Number(delta ?? 16.67) / 1000));
    this.lastDeltaSeconds = dt;
    const nextTime = Math.max(0, this.demoTime + dt * this.playbackDirection * this.playbackSpeedScale);
    const timeAdvanced = Math.abs(nextTime - this.demoTime) > 1e-9;
    this.demoTime = nextTime;
    if (timeAdvanced) {
      advanceDemoParticles(this.particles, {
        time: this.flowSampleTime(),
        dt,
        field: sampleDemoFlow,
        fieldConfig: this.fieldConfig(),
        particleSpeedScale: this.particleSpeedScale
      });
    }
    this.debugFlowSample();
    this.draw();
  }

  title() {
    return 'Flow Fields Demo';
  }

  subtitle() {
    if (this.fieldMode === 'static') return 'Static fields hold direction and magnitude while particles reveal flow structure.';
    return 'Dynamic fields continuously morph F(x,y,t), changing direction and magnitude over simulated time.';
  }

  renderConsole() {
    const primaryConfig = getFlowDemoPresetConfig(this.fieldMode, this.preset);
    const flowDiagnosticState = this.refreshFlowDiagnostics();
    this.app.console?.renderFlowDemoControls?.({
      title: this.title(),
      fieldMode: this.fieldMode,
      preset: this.preset,
      additiveLayers: this.additiveLayers,
      terrainMode: this.terrainMode,
      terrainSeed: this.terrainSeed,
      playbackSpeedScale: this.playbackSpeedScale,
      flowEvolutionSpeedScale: this.flowEvolutionSpeedScale,
      evolutionSpeedScale: this.playbackSpeedScale,
      evolutionBehavior: this.evolutionBehavior,
      cycleDuration: this.cycleDuration,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      dynamicComplexity: this.dynamicComplexity,
      evolutionPattern: this.evolutionPattern,
      spatialMotion: this.spatialMotion,
      spatialMotionSpeed: this.spatialMotionSpeed,
      boundaryMode: this.boundaryMode,
      magnitudeScale: this.magnitudeScale,
      particleSpeedScale: this.particleSpeedScale,
      playbackDirection: this.playbackDirection,
      magnitudeStats: summarizeDemoFlowMagnitudes(this.fieldConfig(), this.flowSampleTime()),
      flowFieldDiagnostics: flowDiagnosticState.diagnostics,
      flowFieldModel: flowDiagnosticState.model,
      presetMetadata: flowDiagnosticState.presetMetadata,
      presetConfig: primaryConfig,
      status: `${fieldModeLabel(this.fieldMode)} field`,
      time: this.demoTime,
      paused: this.paused,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount
    }, {
      fieldMode: (fieldMode) => this.scene.restart({ ...this.sceneConfig(), fieldMode }),
      preset: (preset) => this.scene.restart({ ...this.sceneConfig(), preset }),
      addLayer: () => this.scene.restart({
        ...this.sceneConfig(),
        additiveLayers: addLayer(this.additiveLayers, this.preset)
      }),
      updateLayer: (id, patch) => this.scene.restart({
        ...this.sceneConfig(),
        additiveLayers: updateLayer(this.additiveLayers, id, patch)
      }),
      removeLayer: (id) => this.scene.restart({
        ...this.sceneConfig(),
        additiveLayers: removeLayer(this.additiveLayers, id)
      }),
      terrainMode: (terrainMode) => this.scene.restart({ ...this.sceneConfig(), terrainMode }),
      resetTerrain: () => this.scene.restart({ ...this.sceneConfig(), terrainSeed: nextTerrainSeed(this.terrainSeed) }),
      playbackSpeedScale: (playbackSpeedScale) => {
        this.playbackSpeedScale = Number(playbackSpeedScale) || 1;
        this.evolutionSpeedScale = this.playbackSpeedScale;
        this.renderConsole();
        this.renderCellInspector(true);
      },
      evolutionSpeedScale: (evolutionSpeedScale) => {
        this.playbackSpeedScale = Number(evolutionSpeedScale) || 1;
        this.evolutionSpeedScale = this.playbackSpeedScale;
        this.renderConsole();
        this.renderCellInspector(true);
      },
      flowEvolutionSpeedScale: (flowEvolutionSpeedScale) => {
        this.flowEvolutionSpeedScale = Number(flowEvolutionSpeedScale) || 1;
        this.renderConsole();
        this.renderCellInspector(true);
      },
      evolutionBehavior: (evolutionBehavior) => {
        this.evolutionBehavior = normalizeEvolutionBehavior(evolutionBehavior);
        this.renderConsole();
        this.renderCellInspector(true);
      },
      cycleDuration: (cycleDuration) => {
        this.cycleDuration = finiteNumber(cycleDuration, 60);
        this.renderConsole();
        this.renderCellInspector(true);
      },
      directionVariation: (directionVariation) => {
        this.directionVariation = normalizeVariationLevel(directionVariation);
        this.renderConsole();
        this.renderCellInspector(true);
      },
      magnitudeVariation: (magnitudeVariation) => {
        this.magnitudeVariation = normalizeVariationLevel(magnitudeVariation);
        this.renderConsole();
        this.renderCellInspector(true);
      },
      dynamicComplexity: (dynamicComplexity) => {
        this.dynamicComplexity = normalizeDynamicComplexity(dynamicComplexity);
        this.renderConsole();
        this.renderCellInspector(true);
      },
      evolutionPattern: (evolutionPattern) => {
        this.evolutionPattern = normalizeEvolutionPattern(evolutionPattern);
        this.renderConsole();
        this.renderCellInspector(true);
      },
      spatialMotion: (spatialMotion) => {
        this.spatialMotion = normalizeSpatialMotion(spatialMotion);
        this.renderConsole();
        this.renderCellInspector(true);
      },
      spatialMotionSpeed: (spatialMotionSpeed) => {
        this.spatialMotionSpeed = finiteNumber(spatialMotionSpeed, 1);
        this.renderConsole();
        this.renderCellInspector(true);
      },
      boundaryMode: (boundaryMode) => {
        this.boundaryMode = normalizeBoundaryMode(boundaryMode);
        this.renderConsole();
        this.renderCellInspector(true);
      },
      magnitudeScale: (magnitudeScale) => {
        this.magnitudeScale = Number(magnitudeScale) || 1;
        this.renderConsole();
      },
      particleSpeedScale: (particleSpeedScale) => {
        this.particleSpeedScale = Number(particleSpeedScale) || 1;
        this.renderConsole();
      },
      behaviorHelp: (groupId) => this.showBehaviorHelp(groupId),
      pause: () => {
        this.paused = !this.paused;
        this.updateTransportBar();
        this.renderConsole();
        this.renderCellInspector(true);
      },
      direction: () => this.togglePlaybackDirection(),
      reset: () => this.resetDemoState(),
      exportSettings: (patch) => this.updateExportSettings(patch),
      exportDemoJson: () => this.exportDemoJson(),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  fieldConfig() {
    return {
      fieldMode: this.fieldMode,
      primaryPreset: this.preset,
      additiveLayers: this.additiveLayers,
      terrain: this.terrain,
      ...normalizeEvolutionControls({
        directionVariation: this.directionVariation,
        magnitudeVariation: this.magnitudeVariation,
        dynamicComplexity: this.dynamicComplexity,
        evolutionPattern: this.evolutionPattern,
        evolutionBehavior: this.evolutionBehavior,
        cycleDuration: this.cycleDuration,
        spatialMotion: this.spatialMotion,
        spatialMotionSpeed: this.spatialMotionSpeed
      }),
      boundaryMode: this.boundaryMode
    };
  }

  sceneConfig() {
    return {
      fieldMode: this.fieldMode,
      preset: this.preset,
      additiveLayers: this.additiveLayers,
      terrainMode: this.terrainMode,
      terrainSeed: this.terrainSeed,
      playbackSpeedScale: this.playbackSpeedScale,
      flowEvolutionSpeedScale: this.flowEvolutionSpeedScale,
      evolutionSpeedScale: this.playbackSpeedScale,
      evolutionBehavior: this.evolutionBehavior,
      cycleDuration: this.cycleDuration,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      dynamicComplexity: this.dynamicComplexity,
      evolutionPattern: this.evolutionPattern,
      spatialMotion: this.spatialMotion,
      spatialMotionSpeed: this.spatialMotionSpeed,
      boundaryMode: this.boundaryMode,
      magnitudeScale: this.magnitudeScale,
      particleSpeedScale: this.particleSpeedScale,
      playbackDirection: this.playbackDirection,
      selectedCell: this.selectedCell,
      rightPanelMode: this.rightPanelMode,
      selectedHelpTopic: this.selectedHelpTopic,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount
    };
  }

  flowSampleTime(time = this.demoTime) {
    return Math.max(0, finiteNumber(time, 0)) * this.flowEvolutionSpeedScale;
  }

  flowDiagnosticsForTime(fieldTime = this.flowSampleTime(), fieldConfig = this.fieldConfig()) {
    const presetMetadata = getFlowDemoPresetMetadata(this.preset);
    return {
      diagnostics: buildFlowDemoDiagnostics(fieldConfig, fieldTime, {
        deterministicSeed: this.particleSeed(),
        presetMetadata
      }),
      model: buildFlowDemoModelMetadata(fieldConfig, {
        terrainMode: this.terrainMode,
        flowEvolutionSpeedScale: this.flowEvolutionSpeedScale,
        presetMetadata
      }),
      presetMetadata
    };
  }

  refreshFlowDiagnostics() {
    const state = this.flowDiagnosticsForTime();
    this.flowDiagnostics = state.diagnostics;
    this.flowFieldModel = state.model;
    globalThis.ANCHOR_FLOW_DEMO_DEBUG = {
      ...(globalThis.ANCHOR_FLOW_DEMO_DEBUG ?? {}),
      scene: 'FlowFieldDemoScene',
      title: this.title(),
      mode: this.fieldMode,
      preset: this.preset,
      terrainMode: this.terrainMode,
      boundaryMode: this.boundaryMode,
      demoTime: Number(this.demoTime.toFixed(3)),
      flowSampleTime: Number(this.flowSampleTime().toFixed(3)),
      playbackSpeed: this.playbackSpeedScale,
      flowEvolutionSpeed: this.flowEvolutionSpeedScale,
      particleSpeed: this.particleSpeedScale,
      magnitudeScale: this.magnitudeScale,
      flowFieldDiagnostics: state.diagnostics,
      flowFieldModel: state.model,
      presetMetadata: state.presetMetadata,
      warnings: state.diagnostics?.warnings ?? []
    };
    return state;
  }

  buildSceneObjects() {
    this.destroyObjects();
    this.graphics = this.add.graphics();
    this.objects.push(this.graphics);
    this.titleText = this.add.text(0, 0, this.title(), {
      fontFamily: 'system-ui',
      fontSize: '28px',
      fontStyle: '700',
      color: '#eef6ff'
    }).setOrigin(0, 0);
    this.subtitleText = this.add.text(0, 0, this.subtitle(), {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#9cb4d8',
      wordWrap: { width: 720 }
    }).setOrigin(0, 0);
    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#c9f7e5'
    }).setOrigin(0, 0);
    this.objects.push(this.titleText, this.subtitleText, this.statusText);
  }

  layout() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(24, Math.min(52, width * 0.045));
    const top = Math.max(24, Math.min(44, height * 0.06));
    const mapTop = top + 112;
    const mapHeight = Math.max(220, height - mapTop - 188);
    const mapWidth = Math.max(320, width - margin * 2);
    return {
      width,
      height,
      margin,
      top,
      map: {
        x: margin,
        y: mapTop,
        width: mapWidth,
        height: mapHeight
      }
    };
  }

  draw() {
    if (!this.graphics) return;
    this.refreshFlowDiagnostics();
    const layout = this.layout();
    this.graphics.clear();
    this.drawBackground(layout);
    this.drawTerrain(layout.map);
    this.drawField(layout.map);
    this.drawSelectedCell(layout.map);
    this.drawTrails(layout.map);
    this.drawParticles(layout.map);
    this.layoutText(layout);
    this.updateTransportBar();
    this.renderCellInspector();
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x06101d, 0x0b2137, 0x092943, 0x06101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x071a2b, 0.94);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x456d93, 0.55);
    this.graphics.strokeRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x2b4c6d, 0.24);
    for (let x = map.x + map.width / 12; x < map.x + map.width; x += map.width / 12) {
      this.graphics.lineBetween(x, map.y, x, map.y + map.height);
    }
    for (let y = map.y + map.height / 8; y < map.y + map.height; y += map.height / 8) {
      this.graphics.lineBetween(map.x, y, map.x + map.width, y);
    }
  }

  drawField(map) {
    const cols = FLOW_DEMO_GRID.width;
    const rows = FLOW_DEMO_GRID.height;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const nx = (col + 0.5) / cols;
        const ny = (row + 0.5) / rows;
        if (isDemoLand(this.terrain, nx, ny)) continue;
        const flow = sampleDemoFlow({ ...this.fieldConfig(), x: nx, y: ny, time: this.flowSampleTime() });
        const rawMagnitude = Math.hypot(flow.u, flow.v);
        const magnitude = Math.min(1.35, rawMagnitude);
        const point = this.toScreen(map, nx, ny);
        const angle = Math.atan2(flow.v, flow.u);
        const length = 5 + Math.max(0, magnitude) * 24 * this.magnitudeScale;
        const color = modeColor(this.fieldMode, flow.composition?.activeRegion);
        this.drawArrow(point.x, point.y, angle, length, color, 0.26 + Math.min(0.62, magnitude * 0.5), 1.2 + magnitude * 2.1);
      }
    }
  }

  drawTerrain(map) {
    if (this.terrainMode === 'none') return;
    const cols = FLOW_DEMO_GRID.width;
    const rows = FLOW_DEMO_GRID.height;
    const cellW = map.width / cols;
    const cellH = map.height / rows;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (!this.terrain?.[y]?.[x]) continue;
        this.graphics.fillStyle(0x394238, 0.94);
        this.graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
        this.graphics.lineStyle(1, 0x8aa178, 0.38);
        this.graphics.strokeRect(map.x + x * cellW, map.y + y * cellH, cellW, cellH);
      }
    }
  }

  drawSelectedCell(map) {
    if (!this.selectedCell) return;
    const cols = FLOW_DEMO_GRID.width;
    const rows = FLOW_DEMO_GRID.height;
    const cellW = map.width / cols;
    const cellH = map.height / rows;
    const x = map.x + this.selectedCell.col * cellW;
    const y = map.y + this.selectedCell.row * cellH;
    const centerX = x + cellW / 2;
    const centerY = y + cellH / 2;
    const land = isDemoLand(this.terrain, this.selectedCell.x, this.selectedCell.y);
    const color = land ? 0xff8a5c : 0x63e6be;
    this.graphics.fillStyle(color, 0.08);
    this.graphics.fillRect(x + 1, y + 1, Math.max(1, cellW - 2), Math.max(1, cellH - 2));
    this.graphics.lineStyle(3, color, 0.96);
    this.graphics.strokeRect(x + 1.5, y + 1.5, Math.max(1, cellW - 3), Math.max(1, cellH - 3));
    this.graphics.lineStyle(1, 0xffffff, 0.72);
    this.graphics.lineBetween(centerX - Math.min(12, cellW * 0.28), centerY, centerX + Math.min(12, cellW * 0.28), centerY);
    this.graphics.lineBetween(centerX, centerY - Math.min(12, cellH * 0.28), centerX, centerY + Math.min(12, cellH * 0.28));
  }

  drawArrow(x, y, angle, length, color, alpha, thickness = 2) {
    const head = Math.max(5, length * 0.22);
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    this.graphics.lineStyle(thickness, color, alpha);
    this.graphics.lineBetween(x, y, endX, endY);
    this.graphics.fillStyle(color, Math.min(0.92, alpha + 0.12));
    this.graphics.fillTriangle(
      endX,
      endY,
      endX - Math.cos(angle - 0.46) * head,
      endY - Math.sin(angle - 0.46) * head,
      endX - Math.cos(angle + 0.46) * head,
      endY - Math.sin(angle + 0.46) * head
    );
  }

  drawTrails(map) {
    for (const particle of this.particles ?? []) {
      const trail = particle.trail ?? [];
      if (trail.length < 2) continue;
      for (let index = 1; index < trail.length; index += 1) {
        const prev = this.toScreen(map, trail[index - 1].x, trail[index - 1].y);
        const next = this.toScreen(map, trail[index].x, trail[index].y);
        const alpha = 0.04 + (index / trail.length) * 0.34;
        this.graphics.lineStyle(2, 0xffd166, alpha);
        this.graphics.lineBetween(prev.x, prev.y, next.x, next.y);
      }
    }
  }

  drawParticles(map) {
    for (const particle of this.particles ?? []) {
      const point = this.toScreen(map, particle.x, particle.y);
      if (point.x < map.x - 16 || point.x > map.x + map.width + 16 || point.y < map.y - 16 || point.y > map.y + map.height + 16) continue;
      const angle = particle.heading;
      const nose = 13;
      const tail = 8;
      const side = 6;
      this.graphics.fillStyle(0xffd166, 0.96);
      this.graphics.fillTriangle(
        point.x + Math.cos(angle) * nose,
        point.y + Math.sin(angle) * nose,
        point.x - Math.cos(angle) * tail + Math.cos(angle + Math.PI / 2) * side,
        point.y - Math.sin(angle) * tail + Math.sin(angle + Math.PI / 2) * side,
        point.x - Math.cos(angle) * tail + Math.cos(angle - Math.PI / 2) * side,
        point.y - Math.sin(angle) * tail + Math.sin(angle - Math.PI / 2) * side
      );
      this.graphics.lineStyle(1, 0x06101d, 0.75);
      this.graphics.strokeTriangle(
        point.x + Math.cos(angle) * nose,
        point.y + Math.sin(angle) * nose,
        point.x - Math.cos(angle) * tail + Math.cos(angle + Math.PI / 2) * side,
        point.y - Math.sin(angle) * tail + Math.sin(angle + Math.PI / 2) * side,
        point.x - Math.cos(angle) * tail + Math.cos(angle - Math.PI / 2) * side,
        point.y - Math.sin(angle) * tail + Math.sin(angle - Math.PI / 2) * side
      );
    }
  }

  layoutText({ margin, top, map }) {
    this.titleText?.setPosition(margin, top);
    this.subtitleText?.setPosition(margin, top + 42);
    this.subtitleText?.setWordWrapWidth(Math.min(760, map.width));
    const preset = getFlowDemoPresetConfig(this.fieldMode, this.preset);
    const layerText = ` | Layers: ${formatLayerSummary(this.additiveLayers)}`;
    const centerSample = sampleDemoFlow({ ...this.fieldConfig(), x: 0.5, y: 0.5, time: this.flowSampleTime() });
    const stats = summarizeDemoFlowMagnitudes(this.fieldConfig(), this.flowSampleTime());
    const evolutionText = this.fieldMode === 'dynamic'
      ? ` | Evolution: ${evolutionBehaviorLabel(this.evolutionBehavior)}${this.evolutionBehavior === 'looping' ? ` ${this.cycleDuration}s` : ''} | Spatial: ${spatialMotionLabel(this.spatialMotion)} | Complexity: ${dynamicComplexityLabel(this.dynamicComplexity)} | Direction: ${variationLabel(this.directionVariation)} | Magnitude: ${variationLabel(this.magnitudeVariation)} | Pattern: ${evolutionPatternLabel(this.evolutionPattern)}`
      : '';
    const modePrefix = this.fieldMode === 'dynamic' ? 'Continuous F(x,y,t)' : 'Fixed F(x,y,0)';
    this.statusText?.setText(`${modePrefix} | Mode: ${fieldModeLabel(this.fieldMode)} | Base Flow Field: ${preset?.label ?? 'Current Field'}${layerText}${evolutionText} | Boundary: ${boundaryModeLabel(this.boundaryMode)} | Demo Time: ${this.demoTime.toFixed(1)} | Playback Speed: ${this.playbackSpeedScale}x | Flow Evolution: ${this.flowEvolutionSpeedScale}x | Direction: ${this.playbackDirection === -1 ? 'Reverse' : 'Forward'} | Particle Speed: ${this.particleSpeedScale}x | Magnitude Scale: ${this.magnitudeScale}x | Mag min/mean/max: ${stats.min.toFixed(2)} / ${stats.mean.toFixed(2)} / ${stats.max.toFixed(2)} | Sample: (${centerSample.u.toFixed(2)}, ${centerSample.v.toFixed(2)}) mag ${Math.hypot(centerSample.u, centerSample.v).toFixed(2)} | Terrain: ${terrainModeLabel(this.terrainMode)}`);
    this.statusText?.setWordWrapWidth(Math.min(980, map.width));
    this.statusText?.setPosition(margin, map.y + map.height + 18);
  }

  togglePlaybackDirection() {
    this.playbackDirection = this.playbackDirection === 1 ? -1 : 1;
    this.updateTransportBar();
    this.renderConsole();
    this.renderCellInspector(true);
  }

  toScreen(map, x, y) {
    return {
      x: map.x + Number(x) * map.width,
      y: map.y + Number(y) * map.height
    };
  }

  destroyObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
  }

  bindInputHandlers() {
    this.input?.off?.('pointerdown', this.handlePointerDown, this);
    this.input?.on?.('pointerdown', this.handlePointerDown, this);
  }

  unbindInputHandlers() {
    this.input?.off?.('pointerdown', this.handlePointerDown, this);
  }

  handlePointerDown(pointer) {
    const cell = this.cellFromPointer(pointer);
    if (!cell) return;
    this.rightPanelMode = 'cellInspector';
    if (this.selectedCell && this.selectedCell.col === cell.col && this.selectedCell.row === cell.row) {
      this.selectedCell = null;
    } else {
      this.selectedCell = cell;
    }
    this.lastInspectorRenderTime = -Infinity;
    this.renderCellInspector(true);
    this.draw();
  }

  showBehaviorHelp(groupId) {
    this.rightPanelMode = 'behaviorHelp';
    this.selectedHelpTopic = {
      groupId,
      optionId: behaviorHelpOptionForGroup(groupId, this.behaviorHelpState())
    };
    this.renderCellInspector(true);
  }

  cellFromPointer(pointer) {
    const map = this.layout().map;
    const x = Number(pointer?.x);
    const y = Number(pointer?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < map.x || y < map.y || x > map.x + map.width || y > map.y + map.height) return null;
    const col = Math.max(0, Math.min(FLOW_DEMO_GRID.width - 1, Math.floor(((x - map.x) / map.width) * FLOW_DEMO_GRID.width)));
    const row = Math.max(0, Math.min(FLOW_DEMO_GRID.height - 1, Math.floor(((y - map.y) / map.height) * FLOW_DEMO_GRID.height)));
    return cellFromRowCol(row, col);
  }

  renderTransportBar() {
    const root = this.app?.elements?.overlay?.bottomTimeline;
    if (!root) return;
    root.innerHTML = `
      <section class="hud-panel timeline-overlay flow-demo-transport" aria-label="Flow Fields Demo transport controls">
        <div class="timeline-buttons flow-demo-transport-actions">
          <button type="button" data-action="flow-demo-reset">Reset</button>
          <button type="button" data-action="flow-demo-direction">Direction: Forward</button>
          <button type="button" data-action="flow-demo-pause">Pause</button>
        </div>
        <div class="timeline-readout flow-demo-time-readout">
          <strong data-flow-demo-time>Demo Time: 0.0 s</strong>
          <span class="hud-muted" data-flow-demo-state>Continuous demo time</span>
        </div>
        <div class="flow-demo-transport-summary">
          <span data-flow-demo-direction>Forward</span>
          <span data-flow-demo-behavior>Behavior: Continuous</span>
          <span data-flow-demo-speed>Playback: 1x</span>
          <span data-flow-demo-flow-speed>Flow: 1x</span>
          <span>Infinite timeline</span>
        </div>
      </section>
    `;
    root.querySelector('[data-action="flow-demo-reset"]')?.addEventListener('click', () => this.resetDemoState());
    root.querySelector('[data-action="flow-demo-direction"]')?.addEventListener('click', () => this.togglePlaybackDirection());
    root.querySelector('[data-action="flow-demo-pause"]')?.addEventListener('click', () => {
      this.paused = !this.paused;
      this.renderConsole();
      this.updateTransportBar();
      this.renderCellInspector(true);
    });
    this.transportRefs = {
      root,
      directionButton: root.querySelector('[data-action="flow-demo-direction"]'),
      pauseButton: root.querySelector('[data-action="flow-demo-pause"]'),
      time: root.querySelector('[data-flow-demo-time]'),
      state: root.querySelector('[data-flow-demo-state]'),
      direction: root.querySelector('[data-flow-demo-direction]'),
      behavior: root.querySelector('[data-flow-demo-behavior]'),
      speed: root.querySelector('[data-flow-demo-speed]'),
      flowSpeed: root.querySelector('[data-flow-demo-flow-speed]')
    };
    this.updateTransportBar();
  }

  updateTransportBar() {
    const refs = this.transportRefs ?? {};
    if (!refs.root?.isConnected) return;
    const timeText = `${this.paused ? 'Paused at' : 'Demo Time'}: ${this.demoTime.toFixed(1)} s`;
    const directionLabel = this.playbackDirection === -1 ? 'Reverse' : 'Forward';
    if (refs.time) refs.time.textContent = timeText;
    if (refs.state) refs.state.textContent = this.transportStateLabel();
    if (refs.directionButton) refs.directionButton.textContent = `Direction: ${directionLabel}`;
    if (refs.direction) refs.direction.textContent = `Direction: ${directionLabel}`;
    if (refs.behavior) refs.behavior.textContent = `Behavior: ${evolutionBehaviorLabel(this.evolutionBehavior)}`;
    if (refs.speed) refs.speed.textContent = `Playback: ${this.playbackSpeedScale}x`;
    if (refs.flowSpeed) refs.flowSpeed.textContent = `Flow: ${this.flowEvolutionSpeedScale}x`;
    if (refs.pauseButton) refs.pauseButton.textContent = this.paused ? 'Resume' : 'Pause';
  }

  transportStateLabel() {
    const directionLabel = this.playbackDirection === -1 ? 'reverse' : 'forward';
    if (this.paused) return `Paused at t = ${this.demoTime.toFixed(1)}s - ${directionLabel}`;
    if (this.evolutionBehavior === 'looping') return `Looping - cycle ${this.cycleDuration}s`;
    return `Continuous demo time - ${directionLabel} - infinite timeline`;
  }

  resetDemoState() {
    const wasPaused = this.paused;
    this.demoTime = 0;
    this.paused = wasPaused;
    this.lastDeltaSeconds = 0;
    this.lastDebugDemoTime = -Infinity;
    this.particles = createDemoParticles({
      count: this.fieldMode === 'static' ? 18 : 22,
      seed: this.particleSeed()
    });
    this.renderConsole();
    this.updateTransportBar();
    this.renderCellInspector(true);
    this.draw();
  }

  particleSeed() {
    return `flow-demo-${this.fieldMode}:${this.preset}:${this.terrainMode}:${this.terrainSeed}:${JSON.stringify(this.additiveLayers)}`;
  }

  clearTransportBar() {
    const root = this.app?.elements?.overlay?.bottomTimeline;
    if (root) root.innerHTML = '';
    this.transportRefs = {};
  }

  renderCellInspector(force = false) {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (!root) return;
    if (this.rightPanelMode === 'behaviorHelp') {
      const topic = this.selectedHelpTopic ?? null;
      const state = this.behaviorHelpState();
      const key = `behaviorHelp:${topic?.groupId ?? 'empty'}:${topic?.optionId ?? 'empty'}:${state.fieldMode}:${state.preset}:${state.evolutionBehavior}:${state.dynamicComplexity}:${state.directionVariation}:${state.magnitudeVariation}:${state.spatialMotion}:${state.terrainMode}:${state.boundaryMode}:${state.flowEvolutionSpeedScale}`;
      if (!force && key === this.lastInspectorKey) return;
      this.lastInspectorKey = key;
      this.lastInspectorRenderTime = this.demoTime;
      root.innerHTML = topic ? flowBehaviorHelpHtml(topic, state) : flowBehaviorHelpEmptyHtml();
      root.querySelector('[data-action="flow-show-cell-inspector"]')?.addEventListener('click', () => {
        this.rightPanelMode = 'cellInspector';
        this.renderCellInspector(true);
      });
      return;
    }
    if (!this.selectedCell) {
      if (force || this.lastInspectorKey !== 'empty') {
        root.innerHTML = cellInspectorEmptyHtml();
        this.lastInspectorKey = 'empty';
      }
      return;
    }
    const key = `${this.selectedCell.col},${this.selectedCell.row}:${this.paused}:${this.fieldMode}:${this.preset}:${this.terrainMode}:${this.boundaryMode}`;
    if (!force && key === this.lastInspectorKey && Math.abs(this.demoTime - this.lastInspectorRenderTime) < 0.25) return;
    this.lastInspectorKey = key;
    this.lastInspectorRenderTime = this.demoTime;
    root.innerHTML = cellInspectorHtml(this.inspectSelectedCell());
  }

  behaviorHelpState() {
    return {
      fieldMode: this.fieldMode,
      preset: this.preset,
      additiveLayers: this.additiveLayers,
      terrainMode: this.terrainMode,
      evolutionBehavior: this.evolutionBehavior,
      dynamicComplexity: this.dynamicComplexity,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      evolutionPattern: this.evolutionPattern,
      spatialMotion: this.spatialMotion,
      boundaryMode: this.boundaryMode,
      playbackSpeedScale: this.playbackSpeedScale,
      flowEvolutionSpeedScale: this.flowEvolutionSpeedScale,
      magnitudeScale: this.magnitudeScale,
      particleSpeedScale: this.particleSpeedScale
    };
  }

  clearCellInspector() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
    this.lastInspectorKey = '';
  }

  inspectSelectedCell() {
    const cell = this.selectedCell;
    const land = isDemoLand(this.terrain, cell.x, cell.y);
    const current = sampleDemoFlow({ ...this.fieldConfig(), x: cell.x, y: cell.y, time: this.flowSampleTime() });
    const previous = sampleDemoFlow({ ...this.fieldConfig(), x: cell.x, y: cell.y, time: this.flowSampleTime(Math.max(0, this.demoTime - 1)) });
    const magnitude = Math.hypot(current.u, current.v);
    const previousMagnitude = Math.hypot(previous.u, previous.v);
    const directionRadians = Math.atan2(current.v, current.u);
    const previousDirection = Math.atan2(previous.v, previous.u);
    const directionDegrees = radiansToDegrees(directionRadians);
    return {
      cell,
      land,
      current,
      previous,
      magnitude,
      previousMagnitude,
      magnitudeDelta: magnitude - previousMagnitude,
      directionDegrees,
      directionDelta: signedAngleDeltaDegrees(directionRadians, previousDirection),
      compass: compassLabel(directionDegrees),
      mode: this.fieldMode,
      evolutionBehavior: this.evolutionBehavior,
      dynamicComplexity: this.dynamicComplexity,
      evolutionPattern: this.evolutionPattern,
      boundaryMode: current.boundaryMode ?? this.boundaryMode,
      paused: this.paused,
      demoTime: this.demoTime,
      flowSampleTime: this.flowSampleTime(),
      flowEvolutionSpeedScale: this.flowEvolutionSpeedScale
    };
  }

  exportDemoJson() {
    const errors = validateDemoExportSettings(this.exportSettings(), this.demoTime);
    if (errors.length) {
      this.app?.toast?.(errors[0], 'warning');
      return;
    }
    const artifact = this.buildDemoArtifactExport();
    downloadJSON(demoArtifactFilename('flow-field', { kind: artifact.timeSampling?.kind }), artifact);
    this.app?.toast?.('Flow Fields Demo JSON exported.', 'success');
  }

  buildDemoArtifactExport() {
    const sampling = this.demoExportSampling();
    const currentFrame = this.buildDemoArtifactFrame(this.demoTime, null);
    const frames = sampling.timesSeconds.map((time, index) => this.buildDemoArtifactFrame(time, index));
    const flowDiagnosticState = this.refreshFlowDiagnostics();
    const artifact = buildDemoArtifactEnvelope({
      type: 'anchor.demo.flow-field',
      demo: this.title(),
      grid: FLOW_DEMO_GRID,
      time: {
        demoTimeSeconds: this.demoTime,
        fieldTimeSeconds: this.flowSampleTime(),
        playbackDirection: this.playbackDirection,
        playbackSpeed: this.playbackSpeedScale
      },
      timeSampling: sampling,
      config: this.sceneConfig(),
      fields: currentFrame.fields,
      frames,
      selectedCell: this.selectedCell ? this.inspectSelectedCell() : null,
      metadata: {
        coordinateConvention: 'Values are sampled at normalized cell centers: x=(col+0.5)/width, y=(row+0.5)/height.',
        units: {
          u: 'normalized grid-widths per demo second',
          v: 'normalized grid-heights per demo second',
          magnitude: 'normalized vector magnitude per demo second',
          directionRadians: 'atan2(v,u), screen-y positive downward'
        },
        magnitudeStats: summarizeDemoFlowMagnitudes(this.fieldConfig(), this.flowSampleTime()),
        flowFieldDiagnostics: flowDiagnosticState.diagnostics,
        flowFieldModel: flowDiagnosticState.model,
        exportFrameLimit: 240
      },
      flowFieldDiagnostics: flowDiagnosticState.diagnostics,
      flowFieldModel: flowDiagnosticState.model
    });
    return {
      ...artifact,
      flowFieldDiagnostics: flowDiagnosticState.diagnostics,
      flowFieldModel: flowDiagnosticState.model
    };
  }

  buildDemoArtifactFrame(demoTime, index) {
    const width = FLOW_DEMO_GRID.width;
    const height = FLOW_DEMO_GRID.height;
    const fieldConfig = this.fieldConfig();
    const fieldTime = this.flowSampleTime(demoTime);
    const diagnosticsState = this.flowDiagnosticsForTime(fieldTime, fieldConfig);
    const fields = buildGridFields(width, height, (col, row) => {
      const x = (col + 0.5) / width;
      const y = (row + 0.5) / height;
      const sample = sampleDemoFlow({ ...fieldConfig, x, y, time: fieldTime });
      const land = isDemoLand(this.terrain, x, y, FLOW_DEMO_GRID);
      return {
        u: land ? null : sample.u,
        v: land ? null : sample.v,
        magnitude: land ? null : Math.hypot(sample.u, sample.v),
        directionRadians: land ? null : Math.atan2(sample.v, sample.u),
        landMask: land,
        shorelineRisk: sample.shorelineRisk ?? sample.composition?.base?.shorelineRisk ?? null,
        topologyRegion: sample.topologyRegion ?? sample.composition?.base?.topologyRegion ?? null,
        dominantBehavior: sample.dominantBehavior ?? sample.composition?.base?.dominantBehavior ?? null
      };
    });
    return {
      index,
      timeSeconds: demoTime,
      demoTimeSeconds: demoTime,
      fieldTimeSeconds: fieldTime,
      fields,
      flowFieldDiagnostics: diagnosticsState.diagnostics
    };
  }

  demoExportSampling() {
    return normalizeDemoExportSettings({
      exportMode: this.exportMode,
      startTimeSeconds: this.exportStartTime,
      endTimeSeconds: this.exportEndTime,
      frameCount: this.exportFrameCount
    }, this.demoTime);
  }

  updateExportSettings(patch = {}) {
    if (patch.exportMode !== undefined) {
      this.exportMode = normalizeExportMode(patch.exportMode);
      if (this.exportMode === 'timeWindow' && this.exportFrameCount <= 1) {
        this.exportStartTime = 0;
        this.exportEndTime = Math.max(120, this.demoTime);
        this.exportFrameCount = 25;
      }
    }
    if (patch.startTimeSeconds !== undefined) this.exportStartTime = finiteNumber(patch.startTimeSeconds, this.exportStartTime);
    if (patch.endTimeSeconds !== undefined) this.exportEndTime = finiteNumber(patch.endTimeSeconds, this.exportEndTime);
    if (patch.frameCount !== undefined) this.exportFrameCount = Math.max(1, Math.min(240, Math.round(finiteNumber(patch.frameCount, this.exportFrameCount))));
    this.renderConsole();
  }

  exportSettings() {
    return {
      exportMode: this.exportMode,
      startTimeSeconds: this.exportStartTime,
      endTimeSeconds: this.exportEndTime,
      frameCount: this.exportFrameCount
    };
  }

  debugFlowSample() {
    if (!globalThis.ANCHOR_DEBUG_FLOW_DEMO) return;
    if (this.demoTime - this.lastDebugDemoTime < 1) return;
    this.lastDebugDemoTime = this.demoTime;
    const flowTime = this.flowSampleTime();
    const futureFlowTime = this.flowSampleTime(this.demoTime + 1);
    const sample = sampleDemoFlow({ ...this.fieldConfig(), x: 0.5, y: 0.5, time: flowTime });
    const futureSample = sampleDemoFlow({ ...this.fieldConfig(), x: 0.5, y: 0.5, time: futureFlowTime });
    const composition = sample.composition ?? {};
    globalThis.console?.debug?.('[FlowDemo][DynamicFieldSample]', {
      mode: fieldModeLabel(this.fieldMode),
      basePreset: this.preset,
      preset: this.preset,
      layers: this.additiveLayers,
      demoTime: Number(this.demoTime.toFixed(2)),
      flowSampleTime: Number(flowTime.toFixed(2)),
      playbackSpeed: this.playbackSpeedScale,
      evolutionSpeed: this.flowEvolutionSpeedScale,
      evolutionBehavior: this.evolutionBehavior,
      cycleDuration: this.cycleDuration,
      spatialMotion: this.spatialMotion,
      spatialMotionSpeed: this.spatialMotionSpeed,
      particleSpeed: this.particleSpeedScale,
      magnitudeScale: this.magnitudeScale,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      dynamicComplexity: this.dynamicComplexity,
      evolutionPattern: this.evolutionPattern,
      boundaryMode: this.boundaryMode,
      magnitudeStats: summarizeDemoFlowMagnitudes(this.fieldConfig(), flowTime),
      center: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4)),
        magnitude: Number(Math.hypot(sample.u, sample.v).toFixed(4))
      }
    });
    globalThis.console?.debug?.('[FlowDemo][FixedPointEvolution]', {
      mode: this.fieldMode,
      baseField: this.preset,
      point: { x: 0.5, y: 0.5 },
      t0: Number(this.demoTime.toFixed(2)),
      t1: Number((this.demoTime + 1).toFixed(2)),
      flowT0: Number(flowTime.toFixed(2)),
      flowT1: Number(futureFlowTime.toFixed(2)),
      playbackSpeed: this.playbackSpeedScale,
      evolutionSpeed: this.flowEvolutionSpeedScale,
      evolutionBehavior: this.evolutionBehavior,
      cycleDuration: this.cycleDuration,
      spatialMotion: this.spatialMotion,
      particleSpeed: this.particleSpeedScale,
      magnitudeScale: this.magnitudeScale,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      dynamicComplexity: this.dynamicComplexity,
      boundaryMode: this.boundaryMode,
      t0Vector: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4)),
        magnitude: Number(Math.hypot(sample.u, sample.v).toFixed(4))
      },
      t1Vector: {
        u: Number(futureSample.u.toFixed(4)),
        v: Number(futureSample.v.toFixed(4)),
        magnitude: Number(Math.hypot(futureSample.u, futureSample.v).toFixed(4))
      },
      deltaU: Number((futureSample.u - sample.u).toFixed(4)),
      deltaV: Number((futureSample.v - sample.v).toFixed(4)),
      deltaMagnitude: Number((Math.hypot(futureSample.u, futureSample.v) - Math.hypot(sample.u, sample.v)).toFixed(4))
    });
    globalThis.console?.debug?.('[FlowDemo][ContinuousEvolution]', {
      mode: this.fieldMode,
      demoTime: Number(this.demoTime.toFixed(3)),
      flowSampleTime: Number(flowTime.toFixed(3)),
      playbackSpeed: this.playbackSpeedScale,
      evolutionSpeed: this.flowEvolutionSpeedScale,
      evolutionBehavior: this.evolutionBehavior,
      cycleDuration: this.cycleDuration,
      spatialMotion: this.spatialMotion,
      particleSpeed: this.particleSpeedScale,
      magnitudeScale: this.magnitudeScale,
      point: { x: 0.5, y: 0.5 },
      vector: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4))
      },
      magnitude: Number(Math.hypot(sample.u, sample.v).toFixed(4)),
      angle: Number(Math.atan2(sample.v, sample.u).toFixed(4)),
      evolution: sample.composition?.evolution ?? null
    });
    globalThis.console?.debug?.('[FlowDemo][TimeState]', {
      demoTime: Number(this.demoTime.toFixed(3)),
      flowSampleTime: Number(flowTime.toFixed(3)),
      playbackSpeed: this.playbackSpeedScale,
      evolutionSpeed: this.flowEvolutionSpeedScale,
      particleSpeed: this.particleSpeedScale,
      magnitudeScale: this.magnitudeScale,
      deltaSeconds: Number((this.lastDeltaSeconds ?? 0).toFixed(4)),
      arrowRedrawOnly: false
    });
    globalThis.console?.debug?.('[FlowDemo][EvolutionState]', {
      mode: this.fieldMode,
      evolutionBehavior: this.evolutionBehavior,
      demoTime: Number(this.demoTime.toFixed(3)),
      flowSampleTime: Number(flowTime.toFixed(3)),
      playbackSpeed: this.playbackSpeedScale,
      evolutionSpeed: this.flowEvolutionSpeedScale,
      cycleDuration: this.cycleDuration,
      spatialMotion: this.spatialMotion,
      spatialMotionSpeed: this.spatialMotionSpeed,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      dynamicComplexity: this.dynamicComplexity,
      boundaryMode: this.boundaryMode,
      sampleVectorAtCenter: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4))
      },
      magnitudeAtCenter: Number(Math.hypot(sample.u, sample.v).toFixed(4))
    });
    globalThis.console?.debug?.('[FlowDemo][MagnitudeStats]', {
      ...summarizeDemoFlowMagnitudes(this.fieldConfig(), flowTime),
      time: Number(flowTime.toFixed(2))
    });
    globalThis.console?.debug?.('[FlowDemo][LayerComposition]', {
      baseFieldId: this.preset,
      layers: this.additiveLayers,
      samplePoint: { x: 0.5, y: 0.5 },
      baseVector: composition.base ? {
        u: Number(composition.base.u.toFixed(4)),
        v: Number(composition.base.v.toFixed(4)),
        magnitude: Number(Math.hypot(composition.base.u, composition.base.v).toFixed(4))
      } : null,
      layerVectors: (composition.layers ?? []).map((layer) => ({
        id: layer.id,
        preset: layer.preset,
        weight: layer.weight,
        influence: layer.influence,
        influenceAtPoint: Number((layer.influenceScale ?? 1).toFixed(4)),
        vector: {
          u: Number(layer.vector.u.toFixed(4)),
          v: Number(layer.vector.v.toFixed(4)),
          magnitude: Number(layer.vector.magnitude.toFixed(4))
        }
      })),
      finalVector: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4))
      },
      finalMagnitude: Number(Math.hypot(sample.u, sample.v).toFixed(4))
    });
    for (const layer of composition.layers ?? []) {
      globalThis.console?.debug?.('[FlowDemo][LayerEvolution]', {
        layerId: layer.id,
        presetId: layer.preset,
        evolutionBehavior: layer.evolution?.evolutionBehavior ?? layer.evolutionBehavior,
        layerTime: Number(flowTime.toFixed(3)),
        spatialMotion: layer.evolution?.spatialMotion ?? layer.spatialMotion,
        spatialOffset: layer.vector?.spatialOffset ?? null,
        vector: {
          u: Number(layer.vector.u.toFixed(4)),
          v: Number(layer.vector.v.toFixed(4))
        },
        magnitude: Number(layer.vector.magnitude.toFixed(4))
      });
    }
  }
}

function cellInspectorEmptyHtml() {
  return `
    <section class="cell-inspector-shell">
      <div class="cell-inspector-header">
        <span>Flow Fields Demo</span>
        <h2>Cell Inspector</h2>
        <p>Click a cell in the flow field to inspect its vector behavior over time.</p>
      </div>
      <div class="cell-inspector-card">
        <strong>You can inspect</strong>
        <ul>
          <li>magnitude and direction</li>
          <li>u/v current components</li>
          <li>topology region and boundary adjustment</li>
          <li>shoreline risk and dominant flow behavior</li>
        </ul>
      </div>
    </section>
  `;
}

function flowBehaviorHelpEmptyHtml() {
  return `
    <section class="cell-inspector-shell behavior-help-shell" data-flow-behavior-help>
      <div class="cell-inspector-header">
        <span>Behavior Help</span>
        <h2>Behavior Help</h2>
        <p>Click an Explain button beside a Flow Fields Demo control to learn what that component does.</p>
      </div>
      <div class="cell-inspector-card">
        <strong>Available help</strong>
        <ul>
          <li>Flow Field / Base Preset</li>
          <li>Evolution Behavior</li>
          <li>Dynamic Complexity</li>
          <li>Direction and Magnitude Variation</li>
          <li>Spatial Motion</li>
          <li>Land / Topology and Boundary Mode</li>
          <li>Display Layers and Speed Controls</li>
        </ul>
      </div>
      <button class="console-button secondary" data-action="flow-show-cell-inspector">Show Cell Inspector</button>
    </section>
  `;
}

function flowBehaviorHelpHtml(topic, state) {
  const optionId = topic.optionId ?? behaviorHelpOptionForGroup(topic.groupId, state);
  const help = flowFieldBehaviorExplainer(topic.groupId, optionId);
  const composition = flowFieldCompositionExplainer(state);
  return `
    <section class="cell-inspector-shell behavior-help-shell" data-flow-behavior-help>
      <div class="cell-inspector-header">
        <span>Behavior Help</span>
        <h2>About ${escapeHtml(help.groupLabel)}: ${escapeHtml(help.label)}</h2>
        <p>${escapeHtml(help.question)}</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Selected Behavior</span>
        ${metricRows([
          ['component', help.groupLabel],
          ['selected', help.label]
        ])}
        <small>${escapeHtml(help.short)}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Meaning</span>
        <p>${escapeHtml(help.meaning)}</p>
      </div>
      <div class="cell-inspector-card">
        <span>Expected Visual Behavior</span>
        <p>${escapeHtml(help.expectedBehavior)}</p>
      </div>
      <div class="cell-inspector-card">
        <span>Important Parameters</span>
        <p>${escapeHtml((help.parameters ?? []).join(', ') || 'N/A')}</p>
      </div>
      <div class="cell-inspector-card">
        <span>Strategy</span>
        <p>${escapeHtml(help.strategy)}</p>
        <small>${escapeHtml((help.pairsWellWith ?? []).length ? `Related concepts: ${help.pairsWellWith.join(', ')}` : '')}</small>
        <small>${escapeHtml(help.boundaryNote)}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Current Composition</span>
        <small>${escapeHtml(composition.label)}</small>
        <small>${escapeHtml(composition.summary)}</small>
        <small>${escapeHtml(composition.routeNote)}</small>
      </div>
      <button class="console-button secondary" data-action="flow-show-cell-inspector">Show Cell Inspector</button>
    </section>
  `;
}

function behaviorHelpOptionForGroup(groupId, state) {
  return {
    basePreset: state.preset,
    evolutionBehavior: state.evolutionBehavior,
    dynamicComplexity: state.dynamicComplexity,
    directionVariation: state.directionVariation,
    magnitudeVariation: state.magnitudeVariation,
    spatialMotion: state.spatialMotion,
    topologyMode: state.terrainMode,
    boundaryMode: state.boundaryMode,
    displayLayer: 'composedField',
    speedModel: 'playbackEvolution'
  }[groupId] ?? null;
}

function cellInspectorHtml(inspection) {
  if (inspection.land) return landCellInspectorHtml(inspection);
  const sample = inspection.current ?? {};
  return `
    <section class="cell-inspector-shell" data-flow-cell-inspector>
      <div class="cell-inspector-header">
        <span>Cell Inspector</span>
        <h2>Cell (${escapeHtml(inspection.cell.col)}, ${escapeHtml(inspection.cell.row)})</h2>
        <p>Type: Water | t = ${formatNumber(inspection.demoTime, 1)} s</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Region</span>
        <strong>${escapeHtml(labelize(sample.topologyRegion ?? 'unavailable'))}</strong>
        <small>Dominant behavior: ${escapeHtml(labelize(sample.dominantBehavior ?? 'unavailable'))}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Current Vector</span>
        ${metricRows([
          ['u', formatSignedNumber(sample.u, 3)],
          ['v', formatSignedNumber(sample.v, 3)],
          ['magnitude', formatNumber(inspection.magnitude, 3)],
          ['direction', `${formatNumber(inspection.directionDegrees, 1)} deg ${inspection.compass}`]
        ])}
      </div>
      <div class="cell-inspector-card">
        <span>Temporal Behavior</span>
        ${metricRows([
          ['mode', fieldModeLabel(inspection.mode)],
          ['evolution', evolutionBehaviorLabel(inspection.evolutionBehavior)],
          ['flow time', `${formatNumber(inspection.flowSampleTime, 1)} s`],
          ['flow speed', `${formatNumber(inspection.flowEvolutionSpeedScale, 2)}x`],
          ['complexity', dynamicComplexityLabel(inspection.dynamicComplexity)],
          ['pattern', evolutionPatternLabel(inspection.evolutionPattern)],
          ['magnitude trend', magnitudeTrendLabel(inspection.magnitudeDelta)],
          ['angular change', `${formatSignedNumber(inspection.directionDelta, 1)} deg / 1s`]
        ])}
      </div>
      <div class="cell-inspector-card">
        <span>Topology / Boundary</span>
        ${metricRows([
          ['shore distance', formatMaybeNumber(sample.shoreDistance, 2)],
          ['current toward land', formatMaybeSignedNumber(sample.normalTowardLand, 3)],
          ['tangential component', formatMaybeSignedNumber(sample.tangentialComponent, 3)],
          ['boundary mode', boundaryModeLabel(inspection.boundaryMode)],
          ['topology adjusted', sample.topologyAdjusted ? 'yes' : 'no'],
          ['shoreline risk', shorelineRiskLabel(sample.shorelineRisk)],
          ['hazard exposure', formatMaybeNumber(sample.hazardExposure, 2)]
        ])}
      </div>
    </section>
  `;
}

function landCellInspectorHtml(inspection) {
  return `
    <section class="cell-inspector-shell" data-flow-cell-inspector>
      <div class="cell-inspector-header">
        <span>Cell Inspector</span>
        <h2>Cell (${escapeHtml(inspection.cell.col)}, ${escapeHtml(inspection.cell.row)})</h2>
        <p>Type: Land | t = ${formatNumber(inspection.demoTime, 1)} s</p>
      </div>
      <div class="cell-inspector-card warning">
        <strong>No navigable water current is applied here.</strong>
        <p>Nearby water flow may be deflected, damped, or marked risky depending on boundary mode.</p>
      </div>
      <div class="cell-inspector-card">
        <span>Boundary Context</span>
        ${metricRows([
          ['boundary mode', boundaryModeLabel(inspection.boundaryMode)],
          ['sample magnitude', formatNumber(inspection.magnitude, 3)],
          ['shoreline risk', shorelineRiskLabel(inspection.current?.shorelineRisk)]
        ])}
      </div>
    </section>
  `;
}

function metricRows(rows) {
  return `<div class="cell-inspector-metrics">${rows.map(([label, value]) => `
    <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join('')}</div>`;
}

function fieldModeLabel(mode) {
  return {
    static: 'Static',
    dynamic: 'Dynamic'
  }[mode] ?? 'Static';
}

function modeColor(mode, activeRegion = null) {
  if (mode === 'static') return 0x63e6be;
  return 0x70d6ff;
}

function terrainModeLabel(mode) {
  return {
    blendedCoastal: 'Blended Coastal Map',
    coastIslands: 'Coast + Islands',
    coastalEstuary: 'Coastal Estuary',
    channelIslands: 'Channel + Islands',
    none: 'No Land',
    islands: 'Random Islands',
    coastline: 'Coastline',
    channel: 'Channel',
    bayPocket: 'Bay / Pocket',
    islandChain: 'Island Chain'
  }[mode] ?? 'No Land';
}

function variationLabel(level) {
  return {
    off: 'Off',
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[level] ?? 'Medium';
}

function dynamicComplexityLabel(level) {
  return {
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[level] ?? 'High';
}

function boundaryModeLabel(mode) {
  return {
    none: 'None',
    riskOnly: 'Risk Only',
    dampenIntoLand: 'Dampen Into Land',
    deflectAlongShore: 'Deflect Along Shore'
  }[mode] ?? 'Deflect Along Shore';
}

function evolutionPatternLabel(pattern) {
  return {
    tidalCycle: 'Tidal Cycle',
    meanderingJet: 'Meandering Jet',
    eddyDrift: 'Eddy Drift',
    stormPulse: 'Storm Pulse',
    composite: 'Composite'
  }[pattern] ?? 'Composite';
}

function evolutionBehaviorLabel(behavior) {
  return {
    continuous: 'Continuous',
    looping: 'Looping',
    pulse: 'One-Shot Pulse',
    translating: 'Meandering / Translating'
  }[behavior] ?? 'Continuous';
}

function spatialMotionLabel(motion) {
  return {
    none: 'Off',
    driftEast: 'Drift East',
    driftWest: 'Drift West',
    driftNorth: 'Drift North',
    driftSouth: 'Drift South',
    circularDrift: 'Circular Drift',
    meander: 'Meander'
  }[motion] ?? 'Off';
}

function cellFromRowCol(row, col) {
  return {
    row: Math.max(0, Math.min(FLOW_DEMO_GRID.height - 1, Math.round(Number(row) || 0))),
    col: Math.max(0, Math.min(FLOW_DEMO_GRID.width - 1, Math.round(Number(col) || 0))),
    x: (Math.max(0, Math.min(FLOW_DEMO_GRID.width - 1, Math.round(Number(col) || 0))) + 0.5) / FLOW_DEMO_GRID.width,
    y: (Math.max(0, Math.min(FLOW_DEMO_GRID.height - 1, Math.round(Number(row) || 0))) + 0.5) / FLOW_DEMO_GRID.height
  };
}

function normalizeSelectedCell(cell) {
  if (!cell || !Number.isFinite(Number(cell.row)) || !Number.isFinite(Number(cell.col))) return null;
  return cellFromRowCol(cell.row, cell.col);
}

function normalizeRightPanelMode(value) {
  return value === 'behaviorHelp' ? 'behaviorHelp' : 'cellInspector';
}

function normalizeHelpTopic(value) {
  if (!value || typeof value !== 'object') return null;
  const groupId = String(value.groupId ?? '');
  if (!groupId) return null;
  return {
    groupId,
    optionId: value.optionId == null ? null : String(value.optionId)
  };
}

function radiansToDegrees(radians) {
  const degrees = (Number(radians) * 180) / Math.PI;
  return ((degrees % 360) + 360) % 360;
}

function signedAngleDeltaDegrees(current, previous) {
  const delta = ((Number(current) - Number(previous) + Math.PI) % (Math.PI * 2)) - Math.PI;
  return (delta * 180) / Math.PI;
}

function compassLabel(degrees) {
  const labels = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const index = Math.round((((Number(degrees) % 360) + 360) % 360) / 45) % labels.length;
  return labels[index];
}

function magnitudeTrendLabel(delta) {
  const value = Number(delta);
  if (!Number.isFinite(value) || Math.abs(value) < 0.01) return 'stable';
  return value > 0 ? `strengthening (${formatSignedNumber(value, 3)})` : `weakening (${formatSignedNumber(value, 3)})`;
}

function shorelineRiskLabel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';
  const label = numeric >= 0.7 ? 'high' : numeric >= 0.35 ? 'medium' : numeric > 0 ? 'low' : 'none';
  return `${label} (${formatNumber(numeric, 2)})`;
}

function formatNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';
  return numeric.toFixed(digits);
}

function formatSignedNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(digits)}`;
}

function formatMaybeNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';
  return numeric.toFixed(digits);
}

function formatMaybeSignedNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(digits)}`;
}

function labelize(value) {
  return String(value ?? 'n/a')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function nextTerrainSeed(seed) {
  const match = String(seed ?? '').match(/^(.*?)(\d+)$/);
  if (!match) return `${seed}-2`;
  return `${match[1]}${Number(match[2]) + 1}`;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeExportMode(mode) {
  return mode === 'timeWindow' || mode === 'timeSeries' ? 'timeWindow' : 'currentFrame';
}

function normalizePlaybackDirection(value) {
  return Number(value) < 0 ? -1 : 1;
}

function updateLayer(layers, id, patch = {}) {
  const next = normalizeAdditiveLayers(layers);
  const layerIndex = next.findIndex((layer) => layer.id === id);
  if (layerIndex < 0) return next;
  next[layerIndex] = normalizeAdditiveLayers([{ ...next[layerIndex], ...patch }])[0];
  return next;
}

function addLayer(layers, basePreset) {
  const next = normalizeAdditiveLayers(layers);
  if (next.length >= 4) return next;
  return [...next, createDefaultFlowLayer(next, basePreset)];
}

function removeLayer(layers, id) {
  return normalizeAdditiveLayers(layers).filter((layer) => layer.id !== id);
}

function legacyAdditiveLayers(data = {}) {
  if (!data || data.fieldMode !== 'blended') return FLOW_DEMO_DEFAULT_LAYERS;
  return [
    { id: 'layer1', preset: data.secondaryPreset ?? 'eddyField', weight: Math.max(0, Math.min(1, 1 - finiteNumber(data.blendWeight, 0.6))), enabled: true, influence: 'global' },
  ];
}

function formatLayerSummary(layers = []) {
  const enabled = normalizeAdditiveLayers(layers).filter((layer) => layer.enabled);
  if (!enabled.length) return 'none';
  return enabled.map((layer) => `${getFlowDemoPresetConfig('dynamic', layer.preset).label} ${layer.weight.toFixed(2)}x`).join(', ');
}
