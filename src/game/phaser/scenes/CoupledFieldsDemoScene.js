import {
  FLOW_DEMO_DYNAMIC_COMPLEXITY_LEVELS,
  FLOW_DEMO_EVOLUTION_BEHAVIORS,
  FLOW_DEMO_PRESET_CHOICES,
  FLOW_DEMO_TERRAIN_MODES,
  FLOW_DEMO_BOUNDARY_MODES,
  createDemoParticles,
  createDemoTerrain,
  isDemoLand,
  normalizeBoundaryMode,
  normalizeDynamicComplexity,
  normalizeEvolutionBehavior,
  normalizeFieldMode,
  normalizeTerrainMode,
  sampleDemoFlow,
  advanceDemoParticles
} from '../../../core/demo/FlowFieldDemo.js';
import {
  ROI_DEMO_GRID,
  ROI_DEMO_DISTRIBUTIONS,
  ROI_DEMO_SPATIAL_PATTERNS,
  ROI_DEMO_TEMPORAL_BEHAVIORS,
  createDemoRoiField,
  normalizeRoiDemoDistribution,
  normalizeRoiDemoSpatialPattern,
  normalizeRoiDemoTemporalBehavior,
  roiDistributionLabel,
  roiStateModelDescription,
  roiStateModelForEvolutionModel,
  roiStateModelLabel,
  sampleSpatialPatternLabel,
  sampleTemporalBehaviorLabel
} from '../../../core/demo/DemoRoiFields.js';
import { getVectorPresetConfig } from '../../../core/generation/VectorFieldPresets.js';
import { buildDemoArtifactEnvelope, buildGridFields, cloneField, demoArtifactFilename, normalizeDemoExportSettings, validateDemoExportSettings } from '../../../core/io/DemoArtifactExporter.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

const COUPLING_MODES = ['off', 'currentAdvected', 'currentStretched', 'shorelineRunoff', 'eddyCarried'];
const LAYER_DEFAULTS = {
  flowArrows: true,
  flowParticles: false,
  sampleHeatmap: true,
  landTopology: true
};

export class CoupledFieldsDemoScene extends PhaserScene {
  constructor() {
    super('CoupledFieldsDemoScene');
    this.objects = [];
    this.transportRefs = {};
    this.fieldMode = 'dynamic';
    this.flowPreset = 'topologyAwareComposite';
    this.dynamicComplexity = 'high';
    this.evolutionBehavior = 'continuous';
    this.boundaryMode = 'deflectAlongShore';
    this.terrainMode = 'blendedCoastal';
    this.terrainSeed = 'anchor-coupled-demo';
    this.sampleDistribution = 'currentAdvectedPlume';
    this.spatialPattern = 'plume';
    this.temporalBehavior = 'currentAdvected';
    this.forecastView = 'forecast';
    this.couplingMode = 'currentAdvected';
    this.layerToggles = { ...LAYER_DEFAULTS };
    this.demoTime = 0;
    this.playbackSpeedScale = 1;
    this.playbackDirection = 1;
    this.paused = false;
    this.selectedCell = null;
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
    this.exportMode = 'currentFrame';
    this.exportStartTime = 0;
    this.exportEndTime = 120;
    this.exportFrameCount = 1;
  }

  init(data = {}) {
    this.fieldMode = normalizeFieldMode(data.fieldMode ?? 'dynamic');
    this.flowPreset = FLOW_DEMO_PRESET_CHOICES.includes(data.flowPreset) ? data.flowPreset : 'topologyAwareComposite';
    this.dynamicComplexity = normalizeDynamicComplexity(data.dynamicComplexity ?? 'high');
    this.evolutionBehavior = normalizeEvolutionBehavior(data.evolutionBehavior ?? 'continuous');
    this.boundaryMode = normalizeBoundaryMode(data.boundaryMode ?? 'deflectAlongShore');
    this.terrainMode = normalizeTerrainMode(data.terrainMode ?? 'blendedCoastal');
    this.terrainSeed = data.terrainSeed ?? 'anchor-coupled-demo';
    this.sampleDistribution = normalizeRoiDemoDistribution(data.sampleDistribution ?? 'currentAdvectedPlume');
    this.spatialPattern = normalizeRoiDemoSpatialPattern(data.spatialPattern ?? 'plume');
    this.temporalBehavior = normalizeRoiDemoTemporalBehavior(data.temporalBehavior ?? 'currentAdvected');
    this.forecastView = normalizeForecastView(data.forecastView ?? 'forecast');
    this.couplingMode = normalizeCouplingMode(data.couplingMode ?? 'currentAdvected');
    this.layerToggles = { ...LAYER_DEFAULTS, ...(data.layerToggles ?? {}) };
    this.demoTime = finiteNumber(data.demoTime, 0);
    this.playbackSpeedScale = finiteNumber(data.playbackSpeedScale, 1);
    this.playbackDirection = normalizePlaybackDirection(data.playbackDirection);
    this.paused = false;
    this.selectedCell = normalizeSelectedCell(data.selectedCell);
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
    this.exportMode = normalizeExportMode(data.exportMode);
    this.exportStartTime = finiteNumber(data.exportStartTime ?? this.demoTime, this.demoTime);
    this.exportEndTime = finiteNumber(data.exportEndTime ?? Math.max(120, this.demoTime), Math.max(120, this.demoTime));
    this.exportFrameCount = Math.max(1, Math.round(finiteNumber(data.exportFrameCount, 1)));
    this.terrain = createDemoTerrain({ mode: this.terrainMode, seed: this.terrainSeed, grid: ROI_DEMO_GRID });
    this.particles = createDemoParticles({ count: 18, seed: this.particleSeed() });
    this.rebuildSampleField();
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'coupledFieldsDemo';
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
    this.demoTime = Math.max(0, this.demoTime + dt * this.playbackDirection * this.playbackSpeedScale);
    this.rebuildSampleField();
    if (this.layerToggles.flowParticles) {
      advanceDemoParticles(this.particles, {
        time: this.demoTime,
        dt,
        field: sampleDemoFlow,
        fieldConfig: this.flowConfig(),
        particleSpeedScale: 1
      });
    }
    this.draw();
  }

  title() {
    return 'Coupled Fields Demo';
  }

  subtitle() {
    return 'Overlay F(x,y,t) currents with S(x,y,t) sample value to inspect field interaction.';
  }

  sceneConfig(overrides = {}) {
    return {
      fieldMode: this.fieldMode,
      flowPreset: this.flowPreset,
      dynamicComplexity: this.dynamicComplexity,
      evolutionBehavior: this.evolutionBehavior,
      boundaryMode: this.boundaryMode,
      terrainMode: this.terrainMode,
      terrainSeed: this.terrainSeed,
      sampleDistribution: this.sampleDistribution,
      spatialPattern: this.spatialPattern,
      temporalBehavior: this.temporalBehavior,
      forecastView: this.forecastView,
      couplingMode: this.couplingMode,
      layerToggles: this.layerToggles,
      demoTime: this.demoTime,
      playbackSpeedScale: this.playbackSpeedScale,
      playbackDirection: this.playbackDirection,
      selectedCell: this.selectedCell,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount,
      ...overrides
    };
  }

  flowConfig() {
    return {
      fieldMode: this.fieldMode,
      primaryPreset: this.flowPreset,
      terrain: this.terrain,
      dynamicComplexity: this.dynamicComplexity,
      evolutionBehavior: this.evolutionBehavior,
      directionVariation: 'high',
      magnitudeVariation: 'high',
      evolutionPattern: this.couplingMode === 'eddyCarried' ? 'eddyDrift' : 'composite',
      spatialMotion: 'meander',
      spatialMotionSpeed: 1,
      boundaryMode: this.boundaryMode
    };
  }

  rebuildSampleField() {
    const distribution = distributionForCoupling(this.sampleDistribution, this.couplingMode);
    const temporalBehavior = temporalBehaviorForCoupling(this.temporalBehavior, this.couplingMode);
    const spatialPattern = spatialPatternForCoupling(this.spatialPattern, this.couplingMode);
    const base = createDemoRoiField({
      distribution,
      seed: this.sampleSeed(),
      hotspotCount: 5,
      noise: 0.12,
      timeMode: 'dynamic',
      spatialPattern,
      temporalBehavior,
      forecastView: this.forecastView,
      time: this.demoTime,
      grid: ROI_DEMO_GRID
    });
    const coupledField = this.couplingMode === 'off'
      ? base.field
      : this.applyFlowCoupling(base.field, this.demoTime);
    this.sampleField = {
      ...base,
      field: coupledField,
      stats: summarizeField(coupledField),
      highValueCells: findHighValueCells(coupledField)
    };
  }

  applyFlowCoupling(baseField, time = this.demoTime) {
    const height = baseField.length;
    const width = baseField[0]?.length ?? 0;
    return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => {
      const x = (col + 0.5) / width;
      const y = (row + 0.5) / height;
      const flow = this.sampleFlow(x, y, time);
      const strength = couplingStrength(this.couplingMode);
      const backX = wrap01(x - flow.u * strength * Math.min(8, time) * 0.025);
      const backY = wrap01(y - flow.v * strength * Math.min(8, time) * 0.025);
      const sampled = sampleGrid(baseField, backX, backY);
      if (this.couplingMode === 'currentStretched') return clamp01(sampled + Math.hypot(flow.u, flow.v) * 0.08);
      if (this.couplingMode === 'shorelineRunoff') {
        const runoff = shorelineRunoffBoost(this.terrain, x, y, flow);
        return clamp01(sampled * 0.85 + runoff);
      }
      if (this.couplingMode === 'eddyCarried') return clamp01(sampled + 0.08 * Math.sin(time * 0.4 + Math.atan2(flow.v, flow.u) * 2));
      return clamp01(sampled);
    }));
  }

  sampleFlow(x, y, time = this.demoTime) {
    return sampleDemoFlow({ ...this.flowConfig(), x, y, time });
  }

  sampleSeed() {
    return `anchor-coupled:${this.terrainSeed}:${this.sampleDistribution}:${this.couplingMode}`;
  }

  particleSeed() {
    return `anchor-coupled-particles:${this.flowPreset}:${this.terrainMode}:${this.terrainSeed}`;
  }

  renderConsole() {
    this.app.console?.renderCoupledFieldsDemoControls?.({
      title: this.title(),
      status: `${couplingModeLabel(this.couplingMode)} coupling`,
      flowPreset: this.flowPreset,
      dynamicComplexity: this.dynamicComplexity,
      evolutionBehavior: this.evolutionBehavior,
      boundaryMode: this.boundaryMode,
      terrainMode: this.terrainMode,
      sampleDistribution: this.sampleDistribution,
      spatialPattern: this.spatialPattern,
      temporalBehavior: this.temporalBehavior,
      forecastView: this.forecastView,
      couplingMode: this.couplingMode,
      layerToggles: this.layerToggles,
      playbackSpeedScale: this.playbackSpeedScale,
      paused: this.paused,
      time: this.demoTime,
      stats: this.sampleField?.stats,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount
    }, {
      flowPreset: (flowPreset) => this.scene.restart(this.sceneConfig({ flowPreset, demoTime: 0 })),
      dynamicComplexity: (dynamicComplexity) => this.scene.restart(this.sceneConfig({ dynamicComplexity, demoTime: 0 })),
      evolutionBehavior: (evolutionBehavior) => this.scene.restart(this.sceneConfig({ evolutionBehavior, demoTime: 0 })),
      boundaryMode: (boundaryMode) => this.scene.restart(this.sceneConfig({ boundaryMode, demoTime: 0 })),
      terrainMode: (terrainMode) => this.scene.restart(this.sceneConfig({ terrainMode, demoTime: 0 })),
      sampleDistribution: (sampleDistribution) => this.scene.restart(this.sceneConfig({ sampleDistribution, demoTime: 0 })),
      spatialPattern: (spatialPattern) => this.scene.restart(this.sceneConfig({ spatialPattern, demoTime: 0 })),
      temporalBehavior: (temporalBehavior) => this.scene.restart(this.sceneConfig({ temporalBehavior, demoTime: 0 })),
      forecastView: (forecastView) => this.scene.restart(this.sceneConfig({ forecastView, demoTime: 0 })),
      couplingMode: (couplingMode) => this.scene.restart(this.sceneConfig({ couplingMode, demoTime: 0 })),
      layerToggle: (key, enabled) => {
        this.layerToggles = { ...this.layerToggles, [key]: Boolean(enabled) };
        this.renderConsole();
        this.draw();
      },
      playbackSpeedScale: (playbackSpeedScale) => {
        this.playbackSpeedScale = Number(playbackSpeedScale) || 1;
        this.renderConsole();
        this.updateTransportBar();
      },
      reset: () => this.resetDemoState(),
      direction: () => this.togglePlaybackDirection(),
      pause: () => {
        this.paused = !this.paused;
        this.renderConsole();
        this.updateTransportBar();
        this.renderCellInspector(true);
      },
      exportSettings: (patch) => this.updateExportSettings(patch),
      exportDemoJson: () => this.exportDemoJson(),
      menu: () => this.scene.start('MainMenuScene')
    });
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
      wordWrap: { width: 780 }
    }).setOrigin(0, 0);
    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#dff8ff'
    }).setOrigin(0, 0);
    this.objects.push(this.titleText, this.subtitleText, this.statusText);
  }

  layout() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(24, Math.min(52, width * 0.045));
    const top = Math.max(24, Math.min(44, height * 0.06));
    const mapTop = top + 112;
    return {
      width,
      height,
      margin,
      top,
      map: {
        x: margin,
        y: mapTop,
        width: Math.max(320, width - margin * 2),
        height: Math.max(250, height - mapTop - 118)
      }
    };
  }

  draw() {
    if (!this.graphics || !this.sampleField) return;
    const layout = this.layout();
    this.graphics.clear();
    this.drawBackground(layout);
    if (this.layerToggles.sampleHeatmap) this.drawSampleHeatmap(layout.map);
    if (this.layerToggles.landTopology) this.drawTerrain(layout.map);
    if (this.layerToggles.flowArrows) this.drawFlowArrows(layout.map);
    if (this.layerToggles.flowParticles) this.drawParticles(layout.map);
    this.drawSelectedCell(layout.map);
    this.layoutText(layout);
    this.updateTransportBar();
    this.renderCellInspector();
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x06101d, 0x0b2137, 0x10243b, 0x06101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x071827, 0.96);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x63e6be, 0.38);
    this.graphics.strokeRoundedRect(map.x, map.y, map.width, map.height, 8);
  }

  drawSampleHeatmap(map) {
    const field = this.sampleField.field;
    const cellW = map.width / this.sampleField.width;
    const cellH = map.height / this.sampleField.height;
    for (let row = 0; row < this.sampleField.height; row += 1) {
      for (let col = 0; col < this.sampleField.width; col += 1) {
        const value = Number(field[row]?.[col] ?? 0);
        this.graphics.fillStyle(heatColor(value), 0.18 + value * 0.62);
        this.graphics.fillRect(map.x + col * cellW, map.y + row * cellH, cellW + 1, cellH + 1);
      }
    }
  }

  drawTerrain(map) {
    const cellW = map.width / ROI_DEMO_GRID.width;
    const cellH = map.height / ROI_DEMO_GRID.height;
    for (let row = 0; row < ROI_DEMO_GRID.height; row += 1) {
      for (let col = 0; col < ROI_DEMO_GRID.width; col += 1) {
        if (!this.terrain?.[row]?.[col]) continue;
        this.graphics.fillStyle(0x394238, 0.9);
        this.graphics.fillRect(map.x + col * cellW, map.y + row * cellH, cellW + 1, cellH + 1);
      }
    }
  }

  drawFlowArrows(map) {
    const cols = 18;
    const rows = 12;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = (col + 0.5) / cols;
        const y = (row + 0.5) / rows;
        if (this.layerToggles.landTopology && isDemoLand(this.terrain, x, y, ROI_DEMO_GRID)) continue;
        const flow = this.sampleFlow(x, y);
        const magnitude = Math.min(1.35, Math.hypot(flow.u, flow.v));
        const point = this.toScreen(map, x, y);
        this.drawArrow(point.x, point.y, Math.atan2(flow.v, flow.u), 5 + magnitude * 22, 0xbef6ff, 0.35 + magnitude * 0.45, 1.2 + magnitude * 1.8);
      }
    }
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

  drawParticles(map) {
    for (const particle of this.particles ?? []) {
      const point = this.toScreen(map, particle.x, particle.y);
      this.graphics.fillStyle(0xffd166, 0.92);
      this.graphics.fillCircle(point.x, point.y, 3.2);
    }
  }

  drawSelectedCell(map) {
    if (!this.selectedCell) return;
    const cellW = map.width / ROI_DEMO_GRID.width;
    const cellH = map.height / ROI_DEMO_GRID.height;
    const x = map.x + this.selectedCell.col * cellW;
    const y = map.y + this.selectedCell.row * cellH;
    this.graphics.fillStyle(0xffffff, 0.08);
    this.graphics.fillRect(x + 1, y + 1, Math.max(1, cellW - 2), Math.max(1, cellH - 2));
    this.graphics.lineStyle(3, 0xffffff, 0.92);
    this.graphics.strokeRect(x + 1.5, y + 1.5, Math.max(1, cellW - 3), Math.max(1, cellH - 3));
  }

  layoutText({ margin, top, map }) {
    this.titleText?.setPosition(margin, top);
    this.subtitleText?.setPosition(margin, top + 42);
    this.subtitleText?.setWordWrapWidth(Math.min(780, map.width));
    const stats = this.sampleField?.stats ?? {};
    const preset = getVectorPresetConfig(this.flowPreset);
    this.statusText?.setText(`Flow: ${preset.label} | Sample: ${roiDistributionLabel(this.sampleDistribution)} | Coupling: ${couplingModeLabel(this.couplingMode)} | t=${this.demoTime.toFixed(1)} | Playback ${this.playbackSpeedScale}x | Value min/mean/max ${formatNumber(stats.min)} / ${formatNumber(stats.mean)} / ${formatNumber(stats.max)}`);
    this.statusText?.setWordWrapWidth(Math.min(1040, map.width));
    this.statusText?.setPosition(margin, map.y + map.height + 18);
  }

  toScreen(map, x, y) {
    return { x: map.x + Number(x) * map.width, y: map.y + Number(y) * map.height };
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
    this.selectedCell = this.selectedCell?.col === cell.col && this.selectedCell?.row === cell.row ? null : cell;
    this.lastInspectorRenderTime = -Infinity;
    this.renderCellInspector(true);
    this.draw();
  }

  cellFromPointer(pointer) {
    const map = this.layout().map;
    const x = Number(pointer?.x);
    const y = Number(pointer?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < map.x || y < map.y || x > map.x + map.width || y > map.y + map.height) return null;
    const col = Math.max(0, Math.min(ROI_DEMO_GRID.width - 1, Math.floor(((x - map.x) / map.width) * ROI_DEMO_GRID.width)));
    const row = Math.max(0, Math.min(ROI_DEMO_GRID.height - 1, Math.floor(((y - map.y) / map.height) * ROI_DEMO_GRID.height)));
    return { col, row, x: (col + 0.5) / ROI_DEMO_GRID.width, y: (row + 0.5) / ROI_DEMO_GRID.height };
  }

  renderTransportBar() {
    const root = this.app?.elements?.overlay?.bottomTimeline;
    if (!root) return;
    root.innerHTML = `
      <section class="hud-panel flow-demo-transport coupled-demo-transport" aria-label="Coupled Fields Demo transport controls">
        <div class="timeline-buttons flow-demo-transport-actions">
          <button type="button" data-action="coupled-demo-reset">Reset</button>
          <button type="button" data-action="coupled-demo-direction">Direction: Forward</button>
          <button type="button" data-action="coupled-demo-pause">Pause</button>
        </div>
        <div class="timeline-readout flow-demo-time-readout">
          <strong data-coupled-demo-time>Demo Time: 0.0 s</strong>
          <span class="hud-muted" data-coupled-demo-state>Coupled field playback</span>
        </div>
        <div class="flow-demo-transport-summary">
          <span data-coupled-demo-speed>Playback: 1x</span>
          <span data-coupled-demo-behavior>Coupling: Current-Advected</span>
          <span>Infinite timeline</span>
        </div>
      </section>
    `;
    root.querySelector('[data-action="coupled-demo-reset"]')?.addEventListener('click', () => this.resetDemoState());
    root.querySelector('[data-action="coupled-demo-direction"]')?.addEventListener('click', () => this.togglePlaybackDirection());
    root.querySelector('[data-action="coupled-demo-pause"]')?.addEventListener('click', () => {
      this.paused = !this.paused;
      this.renderConsole();
      this.updateTransportBar();
      this.renderCellInspector(true);
    });
    this.transportRefs = {
      root,
      directionButton: root.querySelector('[data-action="coupled-demo-direction"]'),
      pauseButton: root.querySelector('[data-action="coupled-demo-pause"]'),
      time: root.querySelector('[data-coupled-demo-time]'),
      state: root.querySelector('[data-coupled-demo-state]'),
      speed: root.querySelector('[data-coupled-demo-speed]'),
      behavior: root.querySelector('[data-coupled-demo-behavior]')
    };
    this.updateTransportBar();
  }

  updateTransportBar() {
    const refs = this.transportRefs ?? {};
    if (!refs.root?.isConnected) return;
    const directionLabel = this.playbackDirection === -1 ? 'Reverse' : 'Forward';
    if (refs.time) refs.time.textContent = `${this.paused ? 'Paused at' : 'Demo Time'}: ${this.demoTime.toFixed(1)} s`;
    if (refs.state) refs.state.textContent = `${directionLabel.toLowerCase()} coupled playback`;
    if (refs.directionButton) refs.directionButton.textContent = `Direction: ${directionLabel}`;
    if (refs.pauseButton) refs.pauseButton.textContent = this.paused ? 'Resume' : 'Pause';
    if (refs.speed) refs.speed.textContent = `Playback: ${this.playbackSpeedScale}x`;
    if (refs.behavior) refs.behavior.textContent = `Coupling: ${couplingModeLabel(this.couplingMode)}`;
  }

  clearTransportBar() {
    const root = this.app?.elements?.overlay?.bottomTimeline;
    if (root) root.innerHTML = '';
    this.transportRefs = {};
  }

  togglePlaybackDirection() {
    this.playbackDirection = this.playbackDirection === 1 ? -1 : 1;
    this.updateTransportBar();
    this.renderConsole();
    this.renderCellInspector(true);
  }

  resetDemoState() {
    this.demoTime = 0;
    this.rebuildSampleField();
    this.renderConsole();
    this.updateTransportBar();
    this.renderCellInspector(true);
    this.draw();
  }

  renderCellInspector(force = false) {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (!root) return;
    if (!this.selectedCell) {
      if (force || this.lastInspectorKey !== 'empty') {
        root.innerHTML = coupledInspectorEmptyHtml();
        this.lastInspectorKey = 'empty';
      }
      return;
    }
    const key = `${this.selectedCell.col},${this.selectedCell.row}:${this.couplingMode}:${this.paused}`;
    if (!force && key === this.lastInspectorKey && Math.abs(this.demoTime - this.lastInspectorRenderTime) < 0.25) return;
    this.lastInspectorKey = key;
    this.lastInspectorRenderTime = this.demoTime;
    root.innerHTML = coupledInspectorHtml(this.inspectSelectedCell());
  }

  clearCellInspector() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
    this.lastInspectorKey = '';
  }

  inspectSelectedCell() {
    const cell = this.selectedCell;
    const x = (cell.col + 0.5) / ROI_DEMO_GRID.width;
    const y = (cell.row + 0.5) / ROI_DEMO_GRID.height;
    const flow = this.sampleFlow(x, y);
    const value = Number(this.sampleField?.field?.[cell.row]?.[cell.col] ?? 0);
    const previous = createDemoRoiField({
      distribution: distributionForCoupling(this.sampleDistribution, this.couplingMode),
      seed: this.sampleSeed(),
      hotspotCount: 5,
      noise: 0.12,
      timeMode: 'dynamic',
      spatialPattern: spatialPatternForCoupling(this.spatialPattern, this.couplingMode),
      temporalBehavior: temporalBehaviorForCoupling(this.temporalBehavior, this.couplingMode),
      forecastView: this.forecastView,
      time: Math.max(0, this.demoTime - 1),
      grid: ROI_DEMO_GRID
    });
    const previousValue = Number(previous.field?.[cell.row]?.[cell.col] ?? value);
    return {
      cell,
      terrain: isDemoLand(this.terrain, x, y, ROI_DEMO_GRID) ? 'Land' : 'Water',
      flow,
      flowMagnitude: Math.hypot(flow.u, flow.v),
      flowDirection: radiansToDegrees(Math.atan2(flow.v, flow.u)),
      sampleValue: value,
      sampleDelta: value - previousValue,
      hotspotMembership: (this.sampleField?.highValueCells ?? []).some((entry) => entry.x === cell.col && entry.y === cell.row) ? 'high-value cell' : 'none',
      stateModel: this.sampleField?.stateModel ?? roiStateModelForEvolutionModel(this.sampleField?.evolutionModel),
      stateModelLabel: this.sampleField?.stateModelLabel ?? roiStateModelLabel(roiStateModelForEvolutionModel(this.sampleField?.evolutionModel)),
      stateModelDescription: this.sampleField?.stateModelDescription ?? roiStateModelDescription(roiStateModelForEvolutionModel(this.sampleField?.evolutionModel)),
      couplingMode: this.couplingMode,
      currentInfluence: currentInfluenceLabel(this.couplingMode, flow),
      advectionDirection: compassLabel(radiansToDegrees(Math.atan2(flow.v, flow.u))),
      topologyRegion: flow.topologyRegion ?? flow.composition?.base?.topologyRegion ?? 'n/a',
      dominantBehavior: flow.dominantBehavior ?? flow.composition?.base?.dominantBehavior ?? 'n/a',
      shorelineRisk: flow.shorelineRisk ?? flow.composition?.base?.shorelineRisk ?? 'n/a'
    };
  }

  exportDemoJson() {
    const errors = validateDemoExportSettings(this.exportSettings(), this.demoTime);
    if (errors.length) {
      this.app?.toast?.(errors[0], 'warning');
      return;
    }
    const artifact = this.buildDemoArtifactExport();
    downloadJSON(demoArtifactFilename('coupled-fields', { kind: artifact.timeSampling?.kind }), artifact);
    this.app?.toast?.('Coupled Fields Demo JSON exported.', 'success');
  }

  buildDemoArtifactExport() {
    const sampling = this.demoExportSampling();
    const currentFrame = this.buildDemoArtifactFrame(this.demoTime, null, this.sampleField);
    const frames = sampling.timesSeconds.map((time, index) => this.buildDemoArtifactFrame(time, index));
    return buildDemoArtifactEnvelope({
      type: 'anchor.demo.coupled-fields',
      demo: this.title(),
      grid: ROI_DEMO_GRID,
      time: {
        demoTimeSeconds: this.demoTime,
        fieldTimeSeconds: this.demoTime,
        playbackDirection: this.playbackDirection,
        playbackSpeed: this.playbackSpeedScale
      },
      timeSampling: sampling,
      config: this.sceneConfig(),
      fields: currentFrame.fields,
      frames,
      selectedCell: this.selectedCell ? this.inspectSelectedCell() : null,
      coupling: {
        mode: this.couplingMode,
        flowSampler: 'sampleDemoFlow',
        sampleFieldSource: 'createDemoRoiField plus optional flow coupling'
      },
      metadata: {
        coordinateConvention: 'Flow vectors and sample values are row-major cell-center samples on the ROI demo grid.',
        units: {
          flowU: 'normalized grid-widths per demo second',
          flowV: 'normalized grid-heights per demo second',
          sampleValue: 'normalized scalar, 0..1'
        },
        sampleStats: this.sampleField?.stats,
        highValueCells: this.sampleField?.highValueCells,
        exportFrameLimit: 240
      }
    });
  }

  buildDemoArtifactFrame(demoTime, index, existingSampleField = null) {
    const width = ROI_DEMO_GRID.width;
    const height = ROI_DEMO_GRID.height;
    const flow = buildGridFields(width, height, (col, row) => {
      const x = (col + 0.5) / width;
      const y = (row + 0.5) / height;
      const sample = this.sampleFlow(x, y, demoTime);
      const land = isDemoLand(this.terrain, x, y, ROI_DEMO_GRID);
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
    const sampleField = existingSampleField ?? this.buildSampleFieldAtTime(demoTime);
    return {
      index,
      timeSeconds: demoTime,
      demoTimeSeconds: demoTime,
      fieldTimeSeconds: demoTime,
      fields: {
        flow,
        sample: {
          displayedValue: cloneField(sampleField?.field),
          sampleValue: cloneField(sampleField?.field),
          rawBaseValue: cloneField(sampleField?.rawBaseField),
          evolvedValue: cloneField(sampleField?.evolvedField),
          eventLikelihood: cloneField(sampleField?.eventLikelihoodField)
        }
      }
    };
  }

  buildSampleFieldAtTime(time) {
    const distribution = distributionForCoupling(this.sampleDistribution, this.couplingMode);
    const temporalBehavior = temporalBehaviorForCoupling(this.temporalBehavior, this.couplingMode);
    const spatialPattern = spatialPatternForCoupling(this.spatialPattern, this.couplingMode);
    const base = createDemoRoiField({
      distribution,
      seed: this.sampleSeed(),
      hotspotCount: 5,
      noise: 0.12,
      timeMode: 'dynamic',
      spatialPattern,
      temporalBehavior,
      forecastView: this.forecastView,
      time,
      grid: ROI_DEMO_GRID
    });
    const coupledField = this.couplingMode === 'off'
      ? base.field
      : this.applyFlowCoupling(base.field, time);
    return {
      ...base,
      field: coupledField,
      stats: summarizeField(coupledField),
      highValueCells: findHighValueCells(coupledField)
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

  destroyObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
  }
}

function coupledInspectorEmptyHtml() {
  return `
    <section class="cell-inspector-shell">
      <div class="cell-inspector-header">
        <span>Coupled Fields Demo</span>
        <h2>Cell Inspector</h2>
        <p>Click a cell to inspect both current vector behavior and sample value behavior.</p>
      </div>
      <div class="cell-inspector-card">
        <strong>Inspect interaction</strong>
        <ul>
          <li>flow direction, magnitude, and topology response</li>
          <li>sample value, hotspot membership, and temporal trend</li>
          <li>how the selected coupling mode uses the visible current</li>
        </ul>
      </div>
    </section>
  `;
}

function coupledInspectorHtml(inspection) {
  return `
    <section class="cell-inspector-shell" data-coupled-cell-inspector>
      <div class="cell-inspector-header">
        <span>Cell Inspector</span>
        <h2>Cell (${escapeHtml(inspection.cell.col)}, ${escapeHtml(inspection.cell.row)})</h2>
        <p>Terrain: ${escapeHtml(inspection.terrain)} | Topology: ${escapeHtml(labelize(inspection.topologyRegion))}</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Flow</span>
        ${metricRows([
          ['u', formatSignedNumber(inspection.flow.u, 3)],
          ['v', formatSignedNumber(inspection.flow.v, 3)],
          ['magnitude', formatNumber(inspection.flowMagnitude, 3)],
          ['direction', `${formatNumber(inspection.flowDirection, 1)} deg ${inspection.advectionDirection}`],
          ['dominant behavior', labelize(inspection.dominantBehavior)],
          ['shoreline risk', labelize(inspection.shorelineRisk)]
        ])}
      </div>
      <div class="cell-inspector-card">
        <span>Sample / ROI</span>
        ${metricRows([
          ['value', formatNumber(inspection.sampleValue, 3)],
          ['state model', inspection.stateModelLabel],
          ['temporal trend', trendLabel(inspection.sampleDelta)],
          ['delta / 1s', formatSignedNumber(inspection.sampleDelta, 3)],
          ['hotspot membership', inspection.hotspotMembership]
        ])}
        <small>${escapeHtml(inspection.stateModelDescription)}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Coupling</span>
        ${metricRows([
          ['mode', couplingModeLabel(inspection.couplingMode)],
          ['current influence', inspection.currentInfluence],
          ['advection direction', inspection.advectionDirection],
          ['uses visible flow', inspection.couplingMode === 'off' ? 'no' : 'yes']
        ])}
      </div>
    </section>
  `;
}

function metricRows(rows) {
  return `
    <div class="cell-inspector-metrics">
      ${rows.map(([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function heatColor(value) {
  const v = clamp01(value);
  if (v < 0.22) return 0x10243b;
  if (v < 0.45) return 0x1f7a8c;
  if (v < 0.68) return 0x63c56f;
  if (v < 0.84) return 0xf4d35e;
  return 0xff7b54;
}

function sampleGrid(field, x, y) {
  const height = field.length;
  const width = field[0]?.length ?? 1;
  const col = Math.max(0, Math.min(width - 1, Math.round(clamp01(x) * (width - 1))));
  const row = Math.max(0, Math.min(height - 1, Math.round(clamp01(y) * (height - 1))));
  return Number(field[row]?.[col] ?? 0);
}

function summarizeField(field) {
  const values = field.flat().map(Number);
  const count = Math.max(1, values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  return { min, max, mean, totalValue: values.reduce((sum, value) => sum + value, 0) };
}

function findHighValueCells(field) {
  const stats = summarizeField(field);
  const threshold = Math.max(0.68, stats.mean + (stats.max - stats.mean) * 0.55);
  const cells = [];
  field.forEach((row, y) => row.forEach((value, x) => {
    if (Number(value) >= threshold) cells.push({ x, y, value: Number(value) });
  }));
  return cells.sort((a, b) => b.value - a.value).slice(0, 24);
}

function shorelineRunoffBoost(terrain, x, y, flow) {
  let nearest = 1;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const tx = x + dx / ROI_DEMO_GRID.width;
      const ty = y + dy / ROI_DEMO_GRID.height;
      if (isDemoLand(terrain, tx, ty, ROI_DEMO_GRID)) nearest = Math.min(nearest, Math.hypot(dx, dy) / 3);
    }
  }
  const offshore = Math.max(0, Math.hypot(flow.u, flow.v));
  return clamp01((1 - nearest) * 0.42 + offshore * 0.05);
}

function distributionForCoupling(distribution, couplingMode) {
  if (couplingMode === 'shorelineRunoff') return 'currentAdvectedPlume';
  if (couplingMode === 'eddyCarried') return 'movingHotspot';
  return normalizeRoiDemoDistribution(distribution);
}

function spatialPatternForCoupling(spatialPattern, couplingMode) {
  if (couplingMode === 'shorelineRunoff') return 'coastalBand';
  if (couplingMode === 'currentStretched') return 'multiHotspot';
  return normalizeRoiDemoSpatialPattern(spatialPattern);
}

function temporalBehaviorForCoupling(temporalBehavior, couplingMode) {
  if (couplingMode === 'off') return normalizeRoiDemoTemporalBehavior(temporalBehavior);
  if (couplingMode === 'currentAdvected' || couplingMode === 'shorelineRunoff') return 'currentAdvected';
  if (couplingMode === 'eddyCarried') return 'moving';
  return normalizeRoiDemoTemporalBehavior(temporalBehavior);
}

function couplingStrength(mode) {
  return { currentAdvected: 1, currentStretched: 0.7, shorelineRunoff: 0.9, eddyCarried: 0.85 }[mode] ?? 0;
}

function couplingModeLabel(value) {
  return {
    off: 'Off',
    currentAdvected: 'Current-Advected',
    currentStretched: 'Current-Stretched',
    shorelineRunoff: 'Shoreline Source / Runoff',
    eddyCarried: 'Eddy-Carried'
  }[value] ?? 'Current-Advected';
}

function currentInfluenceLabel(mode, flow) {
  if (mode === 'off') return 'sample field independent';
  return `visible current ${formatNumber(Math.hypot(flow.u, flow.v), 2)} mag`;
}

function normalizeCouplingMode(value) {
  return COUPLING_MODES.includes(value) ? value : 'currentAdvected';
}

function normalizeForecastView(value) {
  return ['forecast', 'truth', 'uncertainty', 'depleted'].includes(value) ? value : 'forecast';
}

function normalizePlaybackDirection(value) {
  return Number(value) === -1 || value === 'reverse' ? -1 : 1;
}

function normalizeSelectedCell(value) {
  if (!value || typeof value !== 'object') return null;
  const col = Number(value.col ?? value.x);
  const row = Number(value.row ?? value.y);
  if (!Number.isFinite(col) || !Number.isFinite(row)) return null;
  return { col: Math.max(0, Math.round(col)), row: Math.max(0, Math.round(row)) };
}

function trendLabel(delta) {
  const value = Number(delta) || 0;
  if (value > 0.015) return 'rising';
  if (value < -0.015) return 'falling';
  return 'stable';
}

function compassLabel(degrees) {
  const normalized = ((Number(degrees) % 360) + 360) % 360;
  const labels = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
  return labels[Math.round(normalized / 45) % labels.length];
}

function radiansToDegrees(radians) {
  return ((radians * 180 / Math.PI) + 360) % 360;
}

function labelize(value) {
  return String(value ?? 'n/a')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : 'N/A';
}

function formatSignedNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return `${number >= 0 ? '+' : ''}${number.toFixed(digits)}`;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeExportMode(mode) {
  return mode === 'timeWindow' || mode === 'timeSeries' ? 'timeWindow' : 'currentFrame';
}

function wrap01(value) {
  const number = Number(value) || 0;
  return ((number % 1) + 1) % 1;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
