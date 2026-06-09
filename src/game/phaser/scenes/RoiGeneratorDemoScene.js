import {
  createDemoRoiField,
  roiDistributionLabel,
  roiTemporalPatternLabel,
  roiEvolutionModelLabel,
  roiStateModelDescription,
  roiStateModelForEvolutionModel,
  roiStateModelLabel,
  sampleSpatialPatternLabel,
  sampleTemporalBehaviorLabel,
  roiDemoDistributionDefaults,
  normalizeRoiDemoDistribution,
  normalizeRoiDemoSpatialPattern,
  normalizeRoiDemoTemporalBehavior,
  normalizeRoiDemoTimeMode,
  normalizeRoiDemoTemporalPattern,
  normalizeRoiDemoEvolutionModel,
  normalizeRoiDemoDynamicComplexity
} from '../../../core/demo/DemoRoiFields.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class RoiGeneratorDemoScene extends PhaserScene {
  constructor() {
    super('RoiGeneratorDemoScene');
    this.objects = [];
    this.transportRefs = {};
    this.distribution = 'burstyBloom';
    this.seed = 'anchor-roi-demo';
    this.hotspotCount = 4;
    this.noise = 0.15;
    this.timeMode = 'dynamic';
    this.spatialPattern = 'multiHotspot';
    this.temporalPattern = 'bursty';
    this.temporalBehavior = 'bursty';
    this.evolutionModel = 'growthDecay';
    this.dynamicComplexity = 'medium';
    this.forecastView = 'forecast';
    this.demoTime = 0;
    this.timeSpeedScale = 1;
    this.playbackDirection = 1;
    this.paused = false;
    this.field = null;
    this.selectedCell = null;
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
  }

  init(data = {}) {
    this.distribution = normalizeRoiDemoDistribution(data.distribution ?? 'burstyBloom');
    const distributionDefaults = roiDemoDistributionDefaults(this.distribution);
    this.seed = data.seed ?? 'anchor-roi-demo';
    this.hotspotCount = finiteNumber(data.hotspotCount, 4);
    this.noise = finiteNumber(data.noise, 0.15);
    this.timeMode = normalizeRoiDemoTimeMode(data.timeMode ?? 'dynamic');
    this.spatialPattern = normalizeRoiDemoSpatialPattern(data.spatialPattern ?? distributionDefaults.spatialPattern);
    this.temporalPattern = normalizeRoiDemoTemporalPattern(data.temporalPattern ?? distributionDefaults.temporalPattern);
    this.evolutionModel = normalizeRoiDemoEvolutionModel(data.evolutionModel ?? distributionDefaults.evolutionModel);
    this.dynamicComplexity = normalizeRoiDemoDynamicComplexity(data.dynamicComplexity ?? 'medium');
    this.temporalBehavior = normalizeRoiDemoTemporalBehavior(data.temporalBehavior ?? distributionDefaults.temporalBehavior);
    this.forecastView = normalizeForecastView(data.forecastView ?? 'forecast');
    this.timeSpeedScale = finiteNumber(data.timeSpeedScale, 1);
    this.playbackDirection = normalizePlaybackDirection(data.playbackDirection);
    this.demoTime = finiteNumber(data.demoTime, 0);
    this.paused = false;
    this.selectedCell = normalizeSelectedCell(data.selectedCell);
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
    this.rebuildField();
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'roiDemo';
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
    if (this.paused || this.timeMode !== 'dynamic') {
      this.draw();
      return;
    }
    const dt = Math.min(0.05, Math.max(0, Number(delta ?? 16.67) / 1000));
    this.demoTime = Math.max(0, this.demoTime + dt * this.playbackDirection * this.timeSpeedScale);
    this.rebuildField();
    this.draw();
  }

  title() {
    return 'Sample / ROI Field Demo';
  }

  subtitle() {
    return 'Seeded S(x,y,t) sandbox for inspecting where and when sampling is valuable.';
  }

  sceneConfig(overrides = {}) {
    return {
      distribution: this.distribution,
      seed: this.seed,
      hotspotCount: this.hotspotCount,
      noise: this.noise,
      timeMode: this.timeMode,
      spatialPattern: this.spatialPattern,
      temporalPattern: this.temporalPattern,
      temporalBehavior: this.temporalBehavior,
      evolutionModel: this.evolutionModel,
      dynamicComplexity: this.dynamicComplexity,
      forecastView: this.forecastView,
      timeSpeedScale: this.timeSpeedScale,
      playbackDirection: this.playbackDirection,
      demoTime: this.demoTime,
      selectedCell: this.selectedCell,
      ...overrides
    };
  }

  rebuildField() {
    this.field = createDemoRoiField({ ...this.sceneConfig(), time: this.demoTime });
  }

  renderConsole() {
    this.app.console?.renderRoiDemoControls?.({
      title: this.title(),
      status: `${roiDistributionLabel(this.distribution)} field`,
      distribution: this.distribution,
      seed: this.seed,
      hotspotCount: this.hotspotCount,
      noise: this.noise,
      timeMode: this.timeMode,
      spatialPattern: this.field?.spatialPattern ?? this.spatialPattern,
      spatialPatternLabel: sampleSpatialPatternLabel(this.field?.spatialPattern ?? this.spatialPattern),
      temporalPattern: this.field?.temporalPattern ?? this.temporalPattern,
      temporalPatternLabel: roiTemporalPatternLabel(this.field?.temporalPattern ?? this.temporalPattern),
      temporalBehavior: this.field?.temporalBehavior ?? this.temporalBehavior,
      temporalBehaviorLabel: sampleTemporalBehaviorLabel(this.field?.temporalBehavior ?? this.temporalBehavior),
      evolutionModel: this.field?.evolutionModel ?? this.evolutionModel,
      evolutionModelLabel: roiEvolutionModelLabel(this.field?.evolutionModel ?? this.evolutionModel),
      dynamicComplexity: this.field?.dynamicComplexity ?? this.dynamicComplexity,
      stateModel: this.field?.stateModel ?? roiStateModelForEvolutionModel(this.field?.evolutionModel ?? this.evolutionModel),
      stateModelLabel: this.field?.stateModelLabel ?? roiStateModelLabel(roiStateModelForEvolutionModel(this.field?.evolutionModel ?? this.evolutionModel)),
      stateModelDescription: this.field?.stateModelDescription ?? roiStateModelDescription(roiStateModelForEvolutionModel(this.field?.evolutionModel ?? this.evolutionModel)),
      priorMode: this.field?.priorMode,
      forecastView: this.forecastView,
      timeSpeedScale: this.timeSpeedScale,
      playbackDirection: this.playbackDirection,
      time: this.demoTime,
      paused: this.paused,
      stats: this.field?.stats
    }, {
      distribution: (distribution) => {
        const defaults = roiDemoDistributionDefaults(distribution);
        this.scene.restart(this.sceneConfig({
          distribution,
          spatialPattern: defaults.spatialPattern,
          temporalPattern: defaults.temporalPattern,
          temporalBehavior: defaults.temporalBehavior,
          evolutionModel: defaults.evolutionModel,
          timeMode: defaults.temporalBehavior === 'static' ? 'static' : this.timeMode,
          demoTime: 0
        }));
      },
      seed: (seed) => {
        this.seed = String(seed ?? 'anchor-roi-demo').trim() || 'anchor-roi-demo';
        this.scene.restart(this.sceneConfig({ seed: this.seed, demoTime: 0 }));
      },
      hotspotCount: (hotspotCount) => this.scene.restart(this.sceneConfig({ hotspotCount: Number(hotspotCount), demoTime: 0 })),
      noise: (noise) => this.scene.restart(this.sceneConfig({ noise: Number(noise), demoTime: 0 })),
      timeMode: (timeMode) => this.scene.restart(this.sceneConfig({ timeMode, demoTime: 0 })),
      spatialPattern: (spatialPattern) => this.scene.restart(this.sceneConfig({ spatialPattern, demoTime: 0 })),
      temporalPattern: (temporalPattern) => this.scene.restart(this.sceneConfig({ temporalPattern, timeMode: temporalPattern === 'static' ? 'static' : 'dynamic', demoTime: 0 })),
      temporalBehavior: (temporalBehavior) => this.scene.restart(this.sceneConfig({ temporalBehavior, timeMode: temporalBehavior === 'static' ? 'static' : 'dynamic', demoTime: 0 })),
      evolutionModel: (evolutionModel) => this.scene.restart(this.sceneConfig({ evolutionModel, demoTime: 0 })),
      dynamicComplexity: (dynamicComplexity) => this.scene.restart(this.sceneConfig({ dynamicComplexity, demoTime: 0 })),
      forecastView: (forecastView) => this.scene.restart(this.sceneConfig({ forecastView, demoTime: 0 })),
      timeSpeedScale: (timeSpeedScale) => {
        this.timeSpeedScale = Number(timeSpeedScale) || 1;
        this.renderConsole();
        this.updateTransportBar();
      },
      regenerate: () => this.scene.restart(this.sceneConfig({ seed: nextSeed(this.seed), demoTime: 0 })),
      pause: () => {
        this.paused = !this.paused;
        this.renderConsole();
        this.updateTransportBar();
        this.renderCellInspector(true);
      },
      direction: () => this.togglePlaybackDirection(),
      reset: () => this.resetDemoState(),
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
      wordWrap: { width: 760 }
    }).setOrigin(0, 0);
    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#d7f7cc'
    }).setOrigin(0, 0);
    this.objects.push(this.titleText, this.subtitleText, this.statusText);
  }

  layout() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(24, Math.min(52, width * 0.045));
    const top = Math.max(24, Math.min(44, height * 0.06));
    const mapTop = top + 112;
    const mapHeight = Math.max(260, height - mapTop - 118);
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
    if (!this.graphics || !this.field) return;
    const layout = this.layout();
    this.graphics.clear();
    this.drawBackground(layout);
    this.drawHeatmap(layout.map);
    this.drawHighValueMarkers(layout.map);
    this.drawSelectedCell(layout.map);
    this.layoutText(layout);
    this.updateTransportBar();
    this.renderCellInspector();
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x08101d, 0x12351f, 0x152a3c, 0x06101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x081827, 0.96);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x7ebf78, 0.52);
    this.graphics.strokeRoundedRect(map.x, map.y, map.width, map.height, 8);
  }

  drawHeatmap(map) {
    const field = this.field.field;
    const width = this.field.width;
    const height = this.field.height;
    const cellW = map.width / width;
    const cellH = map.height / height;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = Number(field[y]?.[x] ?? 0);
        const color = heatColor(value);
        this.graphics.fillStyle(color, 0.24 + value * 0.72);
        this.graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
      }
    }
    this.graphics.lineStyle(1, 0x163747, 0.28);
    for (let x = 0; x <= width; x += 1) {
      this.graphics.lineBetween(map.x + x * cellW, map.y, map.x + x * cellW, map.y + map.height);
    }
    for (let y = 0; y <= height; y += 1) {
      this.graphics.lineBetween(map.x, map.y + y * cellH, map.x + map.width, map.y + y * cellH);
    }
  }

  drawHighValueMarkers(map) {
    const width = this.field.width;
    const height = this.field.height;
    const cellW = map.width / width;
    const cellH = map.height / height;
    for (const cell of this.field.highValueCells ?? []) {
      const cx = map.x + (cell.x + 0.5) * cellW;
      const cy = map.y + (cell.y + 0.5) * cellH;
      const radius = Math.max(3, Math.min(cellW, cellH) * 0.24);
      this.graphics.lineStyle(1, 0xf7f7c6, 0.72);
      this.graphics.strokeCircle(cx, cy, radius + cell.value * 3);
      if (cell.value >= 0.88) {
        this.graphics.fillStyle(0xffffff, 0.82);
        this.graphics.fillCircle(cx, cy, Math.max(1.5, radius * 0.36));
      }
    }
  }

  layoutText({ margin, top, map }) {
    this.titleText?.setPosition(margin, top);
    this.subtitleText?.setPosition(margin, top + 42);
    this.subtitleText?.setWordWrapWidth(Math.min(780, map.width));
    const stats = this.field?.stats ?? {};
    const dynamicText = this.timeMode === 'dynamic' ? ` | Demo Time: ${this.demoTime.toFixed(1)} hr | Playback: ${this.timeSpeedScale}x | Direction: ${this.playbackDirection === -1 ? 'Reverse' : 'Forward'}` : '';
    const stateModel = this.field?.stateModel ?? roiStateModelForEvolutionModel(this.field?.evolutionModel ?? this.evolutionModel);
    this.statusText?.setText(`Distribution: ${roiDistributionLabel(this.distribution)} | Spatial: ${sampleSpatialPatternLabel(this.field?.spatialPattern ?? this.spatialPattern)} | Temporal: ${roiTemporalPatternLabel(this.field?.temporalPattern ?? this.temporalPattern)} | Process: ${roiEvolutionModelLabel(this.field?.evolutionModel ?? this.evolutionModel)} | State Model: ${roiStateModelLabel(stateModel)} | View: ${forecastViewLabel(this.forecastView)} | Seed: ${this.seed}${dynamicText} | Max: ${formatStat(stats.max)} | Mean: ${formatStat(stats.mean)} | Total: ${formatStat(stats.totalValue)}`);
    this.statusText?.setWordWrapWidth(Math.min(1040, map.width));
    this.statusText?.setPosition(margin, map.y + map.height + 18);
  }

  destroyObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
  }

  drawSelectedCell(map) {
    if (!this.selectedCell || !this.field) return;
    const cellW = map.width / this.field.width;
    const cellH = map.height / this.field.height;
    const x = map.x + this.selectedCell.col * cellW;
    const y = map.y + this.selectedCell.row * cellH;
    this.graphics.fillStyle(0x63e6be, 0.1);
    this.graphics.fillRect(x + 1, y + 1, Math.max(1, cellW - 2), Math.max(1, cellH - 2));
    this.graphics.lineStyle(3, 0x63e6be, 0.96);
    this.graphics.strokeRect(x + 1.5, y + 1.5, Math.max(1, cellW - 3), Math.max(1, cellH - 3));
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
    if (this.selectedCell && this.selectedCell.col === cell.col && this.selectedCell.row === cell.row) {
      this.selectedCell = null;
    } else {
      this.selectedCell = cell;
    }
    this.lastInspectorRenderTime = -Infinity;
    this.renderCellInspector(true);
    this.draw();
  }

  cellFromPointer(pointer) {
    const map = this.layout().map;
    const x = Number(pointer?.x);
    const y = Number(pointer?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !this.field) return null;
    if (x < map.x || y < map.y || x > map.x + map.width || y > map.y + map.height) return null;
    const col = Math.max(0, Math.min(this.field.width - 1, Math.floor(((x - map.x) / map.width) * this.field.width)));
    const row = Math.max(0, Math.min(this.field.height - 1, Math.floor(((y - map.y) / map.height) * this.field.height)));
    return { col, row, x: col, y: row };
  }

  renderTransportBar() {
    const root = this.app?.elements?.overlay?.bottomTimeline;
    if (!root) return;
    root.innerHTML = `
      <section class="hud-panel flow-demo-transport roi-demo-transport" aria-label="Sample / ROI Field Demo transport controls">
        <div class="timeline-buttons flow-demo-transport-actions">
          <button type="button" data-action="roi-demo-reset">Reset</button>
          <button type="button" data-action="roi-demo-direction">Direction: Forward</button>
          <button type="button" data-action="roi-demo-pause">Pause</button>
        </div>
        <div class="timeline-readout flow-demo-time-readout">
          <strong data-roi-demo-time>Demo Time: 0.0 s</strong>
          <span class="hud-muted" data-roi-demo-state>Dynamic sample field</span>
        </div>
        <div class="flow-demo-transport-summary">
          <span data-roi-demo-speed>Playback: 1x</span>
          <span data-roi-demo-behavior>Behavior: Bursty Bloom</span>
          <span>Infinite timeline</span>
        </div>
      </section>
    `;
    root.querySelector('[data-action="roi-demo-reset"]')?.addEventListener('click', () => this.resetDemoState());
    root.querySelector('[data-action="roi-demo-direction"]')?.addEventListener('click', () => this.togglePlaybackDirection());
    root.querySelector('[data-action="roi-demo-pause"]')?.addEventListener('click', () => {
      this.paused = !this.paused;
      this.renderConsole();
      this.updateTransportBar();
      this.renderCellInspector(true);
    });
    this.transportRefs = {
      root,
      directionButton: root.querySelector('[data-action="roi-demo-direction"]'),
      pauseButton: root.querySelector('[data-action="roi-demo-pause"]'),
      time: root.querySelector('[data-roi-demo-time]'),
      state: root.querySelector('[data-roi-demo-state]'),
      speed: root.querySelector('[data-roi-demo-speed]'),
      behavior: root.querySelector('[data-roi-demo-behavior]')
    };
    this.updateTransportBar();
  }

  updateTransportBar() {
    const refs = this.transportRefs ?? {};
    if (!refs.root?.isConnected) return;
    const directionLabel = this.playbackDirection === -1 ? 'Reverse' : 'Forward';
    if (refs.time) refs.time.textContent = `${this.paused ? 'Paused at' : 'Demo Time'}: ${this.demoTime.toFixed(1)} s`;
    if (refs.state) refs.state.textContent = this.timeMode === 'dynamic' ? `Dynamic sample field - ${directionLabel.toLowerCase()}` : 'Static sample field';
    if (refs.directionButton) refs.directionButton.textContent = `Direction: ${directionLabel}`;
    if (refs.pauseButton) refs.pauseButton.textContent = this.paused ? 'Resume' : 'Pause';
    if (refs.speed) refs.speed.textContent = `Playback: ${this.timeSpeedScale}x`;
    if (refs.behavior) refs.behavior.textContent = `Behavior: ${roiTemporalPatternLabel(this.temporalPattern)}`;
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
    this.rebuildField();
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
        root.innerHTML = roiInspectorEmptyHtml();
        this.lastInspectorKey = 'empty';
      }
      return;
    }
    const key = `${this.selectedCell.col},${this.selectedCell.row}:${this.timeMode}:${this.temporalPattern}:${this.evolutionModel}:${this.forecastView}:${this.paused}`;
    if (!force && key === this.lastInspectorKey && Math.abs(this.demoTime - this.lastInspectorRenderTime) < 0.25) return;
    this.lastInspectorKey = key;
    this.lastInspectorRenderTime = this.demoTime;
    root.innerHTML = roiInspectorHtml(this.inspectSelectedCell());
  }

  clearCellInspector() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
    this.lastInspectorKey = '';
  }

  inspectSelectedCell() {
    const cell = this.selectedCell;
    const value = Number(this.field?.field?.[cell.row]?.[cell.col] ?? 0);
    const previousField = createDemoRoiField({ ...this.sceneConfig(), time: Math.max(0, this.demoTime - 1), demoTime: Math.max(0, this.demoTime - 1) });
    const previous = Number(previousField.field?.[cell.row]?.[cell.col] ?? value);
    const stats = this.field?.stats ?? {};
    const hotspot = (this.field?.highValueCells ?? []).find((entry) => entry.x === cell.col && entry.y === cell.row);
    const uncertainty = this.forecastView === 'uncertainty' ? value : estimateUncertainty(cell, this.seed, this.demoTime);
    const depleted = this.forecastView === 'depleted' ? value : Math.max(0, value - estimateDepletion(cell, this.field));
    return {
      cell,
      value,
      previous,
      delta: value - previous,
      normalizedValue: stats.max > stats.min ? (value - stats.min) / Math.max(0.0001, stats.max - stats.min) : value,
      mode: this.timeMode,
      distribution: this.distribution,
      spatialPattern: this.field?.spatialPattern ?? this.spatialPattern,
      temporalPattern: this.field?.temporalPattern ?? this.temporalPattern,
      temporalBehavior: this.field?.temporalBehavior ?? this.temporalBehavior,
      evolutionModel: this.field?.evolutionModel ?? this.evolutionModel,
      dynamicComplexity: this.field?.dynamicComplexity ?? this.dynamicComplexity,
      stateModel: this.field?.stateModel ?? roiStateModelForEvolutionModel(this.evolutionModel),
      stateModelLabel: this.field?.stateModelLabel ?? roiStateModelLabel(roiStateModelForEvolutionModel(this.evolutionModel)),
      stateModelDescription: this.field?.stateModelDescription ?? roiStateModelDescription(roiStateModelForEvolutionModel(this.evolutionModel)),
      behavior: this.field?.behavior,
      forecastView: this.forecastView,
      uncertainty,
      depleted,
      hotspotMembership: hotspot ? `high-value rank ${1 + (this.field.highValueCells ?? []).indexOf(hotspot)}` : 'none',
      sampleFieldConfig: this.field?.sampleFieldConfig,
      demoTime: this.demoTime,
      paused: this.paused
    };
  }
}

function heatColor(value) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  if (v < 0.22) return 0x10243b;
  if (v < 0.45) return 0x1f7a8c;
  if (v < 0.68) return 0x63c56f;
  if (v < 0.84) return 0xf4d35e;
  return 0xff7b54;
}

function nextSeed(seed) {
  const match = String(seed ?? '').match(/^(.*?)(\d+)$/);
  if (!match) return `${seed}-2`;
  return `${match[1]}${Number(match[2]) + 1}`;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatStat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : 'N/A';
}

function normalizeForecastView(value) {
  return ['forecast', 'truth', 'uncertainty', 'depleted'].includes(value) ? value : 'forecast';
}

function forecastViewLabel(value) {
  return {
    forecast: 'Forecast',
    truth: 'Truth',
    uncertainty: 'Uncertainty',
    depleted: 'Depleted'
  }[value] ?? 'Forecast';
}

function normalizePlaybackDirection(value) {
  return Number(value) === -1 || value === 'reverse' ? -1 : 1;
}

function normalizeSelectedCell(value) {
  if (!value || typeof value !== 'object') return null;
  const col = Number(value.col ?? value.x);
  const row = Number(value.row ?? value.y);
  if (!Number.isFinite(col) || !Number.isFinite(row)) return null;
  return { col: Math.max(0, Math.round(col)), row: Math.max(0, Math.round(row)), x: Math.max(0, Math.round(col)), y: Math.max(0, Math.round(row)) };
}

function roiInspectorEmptyHtml() {
  return `
    <section class="cell-inspector-shell">
      <div class="cell-inspector-header">
        <span>Sample / ROI Field Demo</span>
        <h2>Cell Inspector</h2>
        <p>Click a cell in the sample field to inspect its value behavior over time.</p>
      </div>
      <div class="cell-inspector-card">
        <strong>You can inspect</strong>
        <ul>
          <li>sample value and normalized value</li>
          <li>temporal trend and hotspot membership</li>
          <li>forecast, uncertainty, and depleted-value views</li>
          <li>shared sample-field configuration metadata</li>
        </ul>
      </div>
    </section>
  `;
}

function roiInspectorHtml(inspection) {
  return `
    <section class="cell-inspector-shell" data-roi-cell-inspector>
      <div class="cell-inspector-header">
        <span>Cell Inspector</span>
        <h2>Cell (${escapeHtml(inspection.cell.col)}, ${escapeHtml(inspection.cell.row)})</h2>
        <p>Type: Sample cell | t = ${formatStat(inspection.demoTime)} s</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Sample Value</span>
        ${metricRows([
          ['value', formatStat(inspection.value)],
          ['normalized', formatStat(inspection.normalizedValue)],
          ['trend', trendLabel(inspection.delta)],
          ['delta / 1s', formatSignedStat(inspection.delta)]
        ])}
      </div>
      <div class="cell-inspector-card">
        <span>Field Behavior</span>
        ${metricRows([
          ['field mode', inspection.mode === 'dynamic' ? 'Dynamic' : 'Static'],
          ['spatial pattern', sampleSpatialPatternLabel(inspection.spatialPattern)],
          ['temporal pattern', roiTemporalPatternLabel(inspection.temporalPattern)],
          ['state model', inspection.stateModelLabel],
          ['process model', roiEvolutionModelLabel(inspection.evolutionModel)],
          ['burst phase', inspection.behavior?.burstPhase ?? 'n/a'],
          ['dynamic complexity', complexityLabel(inspection.dynamicComplexity)],
          ['distribution', roiDistributionLabel(inspection.distribution)],
          ['view', forecastViewLabel(inspection.forecastView)]
        ])}
        <small>${escapeHtml(inspection.behavior?.explanation ?? '')}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Sampling Semantics</span>
        ${metricRows([
          ['uncertainty', formatStat(inspection.uncertainty)],
          ['depleted value', formatStat(inspection.depleted)],
          ['hotspot membership', inspection.hotspotMembership],
          ['neighbor influence', inspection.behavior?.neighborInfluence ?? (inspection.sampleFieldConfig?.neighborInfluence?.enabled ? 'enabled' : 'off')],
          ['current coupled', inspection.sampleFieldConfig?.currentCoupling?.enabled ? 'yes' : 'no'],
          ['depletion', inspection.sampleFieldConfig?.depletion?.mode ?? 'none']
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

function trendLabel(delta) {
  const value = Number(delta) || 0;
  if (value > 0.015) return 'rising';
  if (value < -0.015) return 'falling';
  return 'stable';
}

function formatSignedStat(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return `${number >= 0 ? '+' : ''}${number.toFixed(3)}`;
}

function complexityLabel(value) {
  return {
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[value] ?? 'Medium';
}

function estimateUncertainty(cell, seed, time) {
  const phase = seededHash(`${seed}:uncertainty:${cell.col}:${cell.row}`) * Math.PI * 2;
  return Math.max(0, Math.min(1, 0.22 + 0.42 * seededHash(`${seed}:uncertainty-block:${Math.floor(cell.col / 3)}:${Math.floor(cell.row / 3)}`) + 0.1 * Math.sin(time * 0.18 + phase)));
}

function estimateDepletion(cell, field) {
  const width = Math.max(1, Number(field?.width ?? 1));
  const height = Math.max(1, Number(field?.height ?? 1));
  const cx = width * 0.35;
  const cy = height * 0.52;
  const d2 = (cell.col - cx) ** 2 + (cell.row - cy) ** 2;
  return 0.35 * Math.exp(-d2 / (2 * 2.2 ** 2));
}

function seededHash(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
