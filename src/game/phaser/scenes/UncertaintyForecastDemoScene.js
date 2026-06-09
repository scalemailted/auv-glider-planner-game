import {
  UNCERTAINTY_DEMO_BEHAVIORS,
  UNCERTAINTY_DEMO_FORECAST_MODELS,
  UNCERTAINTY_DEMO_GRID,
  UNCERTAINTY_DEMO_PATTERNS,
  UNCERTAINTY_DEMO_UPDATE_MODELS,
  UNCERTAINTY_DEMO_VIEW_MODES,
  createUncertaintyForecastField,
  forecastModelLabel,
  normalizeUncertaintyDemoChoice,
  uncertaintyBehaviorLabel,
  uncertaintyPatternLabel,
  uncertaintyViewLabel,
  updateModelLabel
} from '../../../core/demo/UncertaintyForecastDemo.js';
import { buildDemoArtifactEnvelope, cloneField, demoArtifactFilename, normalizeDemoExportSettings, validateDemoExportSettings } from '../../../core/io/DemoArtifactExporter.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class UncertaintyForecastDemoScene extends PhaserScene {
  constructor() {
    super('UncertaintyForecastDemoScene');
    this.objects = [];
    this.transportRefs = {};
    this.seed = 'anchor-uncertainty-demo';
    this.viewMode = 'uncertainty';
    this.uncertaintyPattern = 'clusteredUncertainty';
    this.forecastModel = 'regionalBias';
    this.uncertaintyBehavior = 'confidenceDecay';
    this.updateModel = 'neighborUpdate';
    this.demoTime = 0;
    this.playbackSpeedScale = 1;
    this.playbackDirection = 1;
    this.paused = false;
    this.selectedCell = null;
    this.observations = [];
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
    this.exportMode = 'currentFrame';
    this.exportStartTime = 0;
    this.exportEndTime = 120;
    this.exportFrameCount = 1;
  }

  init(data = {}) {
    this.seed = data.seed ?? 'anchor-uncertainty-demo';
    this.viewMode = normalizeUncertaintyDemoChoice(data.viewMode ?? 'uncertainty', UNCERTAINTY_DEMO_VIEW_MODES, 'uncertainty');
    this.uncertaintyPattern = normalizeUncertaintyDemoChoice(data.uncertaintyPattern ?? 'clusteredUncertainty', UNCERTAINTY_DEMO_PATTERNS, 'clusteredUncertainty');
    this.forecastModel = normalizeUncertaintyDemoChoice(data.forecastModel ?? 'regionalBias', UNCERTAINTY_DEMO_FORECAST_MODELS, 'regionalBias');
    this.uncertaintyBehavior = normalizeUncertaintyDemoChoice(data.uncertaintyBehavior ?? 'confidenceDecay', UNCERTAINTY_DEMO_BEHAVIORS, 'confidenceDecay');
    this.updateModel = normalizeUncertaintyDemoChoice(data.updateModel ?? 'neighborUpdate', UNCERTAINTY_DEMO_UPDATE_MODELS, 'neighborUpdate');
    this.demoTime = finiteNumber(data.demoTime, 0);
    this.playbackSpeedScale = finiteNumber(data.playbackSpeedScale, 1);
    this.playbackDirection = normalizePlaybackDirection(data.playbackDirection);
    this.paused = false;
    this.selectedCell = normalizeSelectedCell(data.selectedCell);
    this.observations = Array.isArray(data.observations) ? data.observations.slice(0, 64) : [];
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
    this.exportMode = normalizeExportMode(data.exportMode);
    this.exportStartTime = finiteNumber(data.exportStartTime ?? this.demoTime, this.demoTime);
    this.exportEndTime = finiteNumber(data.exportEndTime ?? Math.max(120, this.demoTime), Math.max(120, this.demoTime));
    this.exportFrameCount = Math.max(1, Math.round(finiteNumber(data.exportFrameCount, 1)));
    this.rebuildField();
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'uncertaintyForecastDemo';
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
    this.rebuildField();
    this.draw();
  }

  title() {
    return 'Uncertainty / Forecast Demo';
  }

  subtitle() {
    return 'Inspect forecast, truth, uncertainty, information gain, forecast error, and update effects.';
  }

  sceneConfig(overrides = {}) {
    return {
      seed: this.seed,
      viewMode: this.viewMode,
      uncertaintyPattern: this.uncertaintyPattern,
      forecastModel: this.forecastModel,
      uncertaintyBehavior: this.uncertaintyBehavior,
      updateModel: this.updateModel,
      demoTime: this.demoTime,
      playbackSpeedScale: this.playbackSpeedScale,
      playbackDirection: this.playbackDirection,
      selectedCell: this.selectedCell,
      observations: this.observations,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount,
      ...overrides
    };
  }

  rebuildField() {
    this.field = createUncertaintyForecastField({ ...this.sceneConfig(), time: this.demoTime });
  }

  renderConsole() {
    this.app.console?.renderUncertaintyForecastDemoControls?.({
      title: this.title(),
      status: `${uncertaintyViewLabel(this.viewMode)} layer`,
      seed: this.seed,
      viewMode: this.viewMode,
      viewModeLabel: uncertaintyViewLabel(this.viewMode),
      uncertaintyPattern: this.uncertaintyPattern,
      uncertaintyPatternLabel: uncertaintyPatternLabel(this.uncertaintyPattern),
      forecastModel: this.forecastModel,
      forecastModelLabel: forecastModelLabel(this.forecastModel),
      uncertaintyBehavior: this.uncertaintyBehavior,
      uncertaintyBehaviorLabel: uncertaintyBehaviorLabel(this.uncertaintyBehavior),
      updateModel: this.updateModel,
      updateModelLabel: updateModelLabel(this.updateModel),
      playbackSpeedScale: this.playbackSpeedScale,
      paused: this.paused,
      time: this.demoTime,
      observationCount: this.observations.length,
      stats: this.field?.stats,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount
    }, {
      viewMode: (viewMode) => this.scene.restart(this.sceneConfig({ viewMode, demoTime: 0 })),
      uncertaintyPattern: (uncertaintyPattern) => this.scene.restart(this.sceneConfig({ uncertaintyPattern, demoTime: 0, observations: [] })),
      forecastModel: (forecastModel) => this.scene.restart(this.sceneConfig({ forecastModel, demoTime: 0, observations: [] })),
      uncertaintyBehavior: (uncertaintyBehavior) => this.scene.restart(this.sceneConfig({ uncertaintyBehavior, demoTime: 0, observations: [] })),
      updateModel: (updateModel) => this.scene.restart(this.sceneConfig({ updateModel, demoTime: 0 })),
      seed: (seed) => this.scene.restart(this.sceneConfig({ seed: String(seed ?? '').trim() || 'anchor-uncertainty-demo', demoTime: 0, observations: [] })),
      playbackSpeedScale: (playbackSpeedScale) => {
        this.playbackSpeedScale = Number(playbackSpeedScale) || 1;
        this.renderConsole();
        this.updateTransportBar();
      },
      applySampleUpdate: () => this.applySampleUpdate(),
      resetObservations: () => this.resetObservations(),
      surfaceUpdate: () => this.applySurfaceUpdate(),
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
      wordWrap: { width: 820 }
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
    return {
      width,
      height,
      margin,
      top,
      map: {
        x: margin,
        y: mapTop,
        width: Math.max(320, width - margin * 2),
        height: Math.max(260, height - mapTop - 118)
      }
    };
  }

  draw() {
    if (!this.graphics || !this.field) return;
    const layout = this.layout();
    this.graphics.clear();
    this.drawBackground(layout);
    this.drawHeatmap(layout.map);
    this.drawObservations(layout.map);
    this.drawSelectedCell(layout.map);
    this.layoutText(layout);
    this.updateTransportBar();
    this.renderCellInspector();
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x08101d, 0x10243b, 0x18233d, 0x06101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x081827, 0.96);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x8aa2ff, 0.52);
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
        this.graphics.fillStyle(layerColor(value, this.viewMode), 0.24 + value * 0.68);
        this.graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
      }
    }
    this.graphics.lineStyle(1, 0x26344f, 0.28);
    for (let x = 0; x <= width; x += 1) this.graphics.lineBetween(map.x + x * cellW, map.y, map.x + x * cellW, map.y + map.height);
    for (let y = 0; y <= height; y += 1) this.graphics.lineBetween(map.x, map.y + y * cellH, map.x + map.width, map.y + y * cellH);
  }

  drawObservations(map) {
    const cellW = map.width / this.field.width;
    const cellH = map.height / this.field.height;
    for (const observation of this.observations) {
      const cx = map.x + (Number(observation.x) + 0.5) * cellW;
      const cy = map.y + (Number(observation.y) + 0.5) * cellH;
      this.graphics.lineStyle(2, 0xffffff, 0.85);
      this.graphics.strokeCircle(cx, cy, Math.max(5, Math.min(cellW, cellH) * 0.28));
    }
  }

  drawSelectedCell(map) {
    if (!this.selectedCell) return;
    const cellW = map.width / this.field.width;
    const cellH = map.height / this.field.height;
    const x = map.x + this.selectedCell.col * cellW;
    const y = map.y + this.selectedCell.row * cellH;
    this.graphics.fillStyle(0xffffff, 0.1);
    this.graphics.fillRect(x + 1, y + 1, Math.max(1, cellW - 2), Math.max(1, cellH - 2));
    this.graphics.lineStyle(3, 0xffffff, 0.96);
    this.graphics.strokeRect(x + 1.5, y + 1.5, Math.max(1, cellW - 3), Math.max(1, cellH - 3));
  }

  layoutText({ margin, top, map }) {
    this.titleText?.setPosition(margin, top);
    this.subtitleText?.setPosition(margin, top + 42);
    this.subtitleText?.setWordWrapWidth(Math.min(860, map.width));
    const stats = this.field?.stats ?? {};
    this.statusText?.setText(`View: ${uncertaintyViewLabel(this.viewMode)} | Pattern: ${uncertaintyPatternLabel(this.uncertaintyPattern)} | Forecast: ${forecastModelLabel(this.forecastModel)} | Update: ${updateModelLabel(this.updateModel)} | Observations: ${this.observations.length} | t=${this.demoTime.toFixed(1)} | Mean ${formatStat(stats.mean)} | Max ${formatStat(stats.max)}`);
    this.statusText?.setWordWrapWidth(Math.min(1080, map.width));
    this.statusText?.setPosition(margin, map.y + map.height + 18);
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
    if (this.selectedCell) this.addObservation(this.selectedCell);
    this.rebuildField();
    this.lastInspectorRenderTime = -Infinity;
    this.renderConsole();
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

  addObservation(cell) {
    this.observations = [...this.observations, { x: cell.col, y: cell.row, t: this.demoTime, type: 'sample' }].slice(-64);
  }

  applySampleUpdate() {
    const cell = this.selectedCell ?? { col: Math.floor(UNCERTAINTY_DEMO_GRID.width / 2), row: Math.floor(UNCERTAINTY_DEMO_GRID.height / 2) };
    this.selectedCell = cell;
    this.addObservation(cell);
    this.rebuildField();
    this.renderConsole();
    this.renderCellInspector(true);
    this.draw();
  }

  applySurfaceUpdate() {
    const center = { col: Math.floor(UNCERTAINTY_DEMO_GRID.width / 2), row: Math.floor(UNCERTAINTY_DEMO_GRID.height / 2) };
    this.observations = [...this.observations, { x: center.col, y: center.row, t: this.demoTime, type: 'surface' }].slice(-64);
    this.rebuildField();
    this.renderConsole();
    this.renderCellInspector(true);
    this.draw();
  }

  resetObservations() {
    this.observations = [];
    this.rebuildField();
    this.renderConsole();
    this.renderCellInspector(true);
    this.draw();
  }

  renderTransportBar() {
    const root = this.app?.elements?.overlay?.bottomTimeline;
    if (!root) return;
    root.innerHTML = `
      <section class="hud-panel flow-demo-transport uncertainty-demo-transport" aria-label="Uncertainty / Forecast Demo transport controls">
        <div class="timeline-buttons flow-demo-transport-actions">
          <button type="button" data-action="uncertainty-demo-reset">Reset</button>
          <button type="button" data-action="uncertainty-demo-direction">Direction: Forward</button>
          <button type="button" data-action="uncertainty-demo-pause">Pause</button>
        </div>
        <div class="timeline-readout flow-demo-time-readout">
          <strong data-uncertainty-demo-time>Demo Time: 0.0 s</strong>
          <span class="hud-muted" data-uncertainty-demo-state>Forecast uncertainty playback</span>
        </div>
        <div class="flow-demo-transport-summary">
          <span data-uncertainty-demo-speed>Playback: 1x</span>
          <span data-uncertainty-demo-view>View: Uncertainty</span>
          <span>Infinite timeline</span>
        </div>
      </section>
    `;
    root.querySelector('[data-action="uncertainty-demo-reset"]')?.addEventListener('click', () => this.resetDemoState());
    root.querySelector('[data-action="uncertainty-demo-direction"]')?.addEventListener('click', () => this.togglePlaybackDirection());
    root.querySelector('[data-action="uncertainty-demo-pause"]')?.addEventListener('click', () => {
      this.paused = !this.paused;
      this.renderConsole();
      this.updateTransportBar();
      this.renderCellInspector(true);
    });
    this.transportRefs = {
      root,
      directionButton: root.querySelector('[data-action="uncertainty-demo-direction"]'),
      pauseButton: root.querySelector('[data-action="uncertainty-demo-pause"]'),
      time: root.querySelector('[data-uncertainty-demo-time]'),
      state: root.querySelector('[data-uncertainty-demo-state]'),
      speed: root.querySelector('[data-uncertainty-demo-speed]'),
      view: root.querySelector('[data-uncertainty-demo-view]')
    };
    this.updateTransportBar();
  }

  updateTransportBar() {
    const refs = this.transportRefs ?? {};
    if (!refs.root?.isConnected) return;
    const directionLabel = this.playbackDirection === -1 ? 'Reverse' : 'Forward';
    if (refs.time) refs.time.textContent = `${this.paused ? 'Paused at' : 'Demo Time'}: ${this.demoTime.toFixed(1)} s`;
    if (refs.state) refs.state.textContent = `${directionLabel.toLowerCase()} forecast/uncertainty field`;
    if (refs.directionButton) refs.directionButton.textContent = `Direction: ${directionLabel}`;
    if (refs.pauseButton) refs.pauseButton.textContent = this.paused ? 'Resume' : 'Pause';
    if (refs.speed) refs.speed.textContent = `Playback: ${this.playbackSpeedScale}x`;
    if (refs.view) refs.view.textContent = `View: ${uncertaintyViewLabel(this.viewMode)}`;
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
    this.observations = [];
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
        root.innerHTML = uncertaintyInspectorEmptyHtml();
        this.lastInspectorKey = 'empty';
      }
      return;
    }
    const key = `${this.selectedCell.col},${this.selectedCell.row}:${this.viewMode}:${this.observations.length}:${this.paused}`;
    if (!force && key === this.lastInspectorKey && Math.abs(this.demoTime - this.lastInspectorRenderTime) < 0.25) return;
    this.lastInspectorKey = key;
    this.lastInspectorRenderTime = this.demoTime;
    root.innerHTML = uncertaintyInspectorHtml(this.inspectSelectedCell());
  }

  clearCellInspector() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
    this.lastInspectorKey = '';
  }

  inspectSelectedCell() {
    const cell = this.selectedCell;
    const layer = (name) => Number(this.field?.layers?.[name]?.[cell.row]?.[cell.col] ?? 0);
    const observations = this.observations.filter((entry) => Number(entry.x) === cell.col && Number(entry.y) === cell.row);
    const lastObserved = observations.length ? Math.max(...observations.map((entry) => Number(entry.t) || 0)) : null;
    return {
      cell,
      forecast: layer('forecast'),
      truth: layer('truth'),
      uncertainty: layer('uncertainty'),
      informationGain: layer('informationGain'),
      forecastError: layer('forecastError'),
      deltaAfterUpdate: layer('deltaAfterUpdate'),
      displayedLayer: uncertaintyViewLabel(this.viewMode),
      lastObserved,
      observationCount: observations.length,
      updateEffect: layer('deltaAfterUpdate'),
      confidence: 1 - layer('uncertainty')
    };
  }

  exportDemoJson() {
    const errors = validateDemoExportSettings(this.exportSettings(), this.demoTime);
    if (errors.length) {
      this.app?.toast?.(errors[0], 'warning');
      return;
    }
    const artifact = this.buildDemoArtifactExport();
    downloadJSON(demoArtifactFilename('uncertainty-forecast', { kind: artifact.timeSampling?.kind }), artifact);
    this.app?.toast?.('Uncertainty / Forecast Demo JSON exported.', 'success');
  }

  buildDemoArtifactExport() {
    const sampling = this.demoExportSampling();
    const currentFrame = this.buildDemoArtifactFrame(this.demoTime, null, this.field);
    const frames = sampling.timesSeconds.map((time, index) => this.buildDemoArtifactFrame(time, index));
    return buildDemoArtifactEnvelope({
      type: 'anchor.demo.uncertainty-forecast',
      demo: this.title(),
      grid: UNCERTAINTY_DEMO_GRID,
      time: {
        demoTimeSeconds: this.demoTime,
        fieldTimeSeconds: this.field?.time ?? this.demoTime,
        playbackDirection: this.playbackDirection,
        playbackSpeed: this.playbackSpeedScale
      },
      timeSampling: sampling,
      config: this.sceneConfig(),
      fields: currentFrame.fields,
      frames,
      selectedCell: this.selectedCell ? this.inspectSelectedCell() : null,
      fairness: {
        truthVisibleInDemo: true,
        fairSolverDefault: 'forecast_and_uncertainty_only',
        truthAllowedForFairSolver: false
      },
      metadata: {
        coordinateConvention: 'Row-major arrays indexed fields[layer][row][col]; values represent cell centers on the uncertainty demo grid.',
        units: {
          forecast: 'normalized scalar, 0..1',
          truth: 'normalized hidden-truth demo scalar, 0..1',
          uncertainty: 'normalized uncertainty, 0..1',
          informationGain: 'normalized expected information gain, 0..1',
          forecastError: 'absolute normalized forecast error, 0..1',
          deltaAfterUpdate: 'normalized post-update change, signed when model emits signed values'
        },
        stats: this.field?.stats,
        observationCount: this.observations.length,
        exportFrameLimit: 240
      }
    });
  }

  buildDemoArtifactFrame(demoTime, index, existingField = null) {
    const field = existingField ?? createUncertaintyForecastField({ ...this.sceneConfig(), time: demoTime, demoTime });
    const layers = field?.layers ?? {};
    return {
      index,
      timeSeconds: demoTime,
      demoTimeSeconds: demoTime,
      fieldTimeSeconds: field?.time ?? demoTime,
      fields: {
        displayedValue: cloneField(field?.field),
        forecast: cloneField(layers.forecast),
        truth: cloneField(layers.truth),
        uncertainty: cloneField(layers.uncertainty),
        informationGain: cloneField(layers.informationGain),
        forecastError: cloneField(layers.forecastError),
        deltaAfterUpdate: cloneField(layers.deltaAfterUpdate)
      }
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

function uncertaintyInspectorEmptyHtml() {
  return `
    <section class="cell-inspector-shell">
      <div class="cell-inspector-header">
        <span>Uncertainty / Forecast Demo</span>
        <h2>Cell Inspector</h2>
        <p>Click a cell to inspect forecast, truth, uncertainty, and information gain.</p>
      </div>
      <div class="cell-inspector-card">
        <strong>Educational truth view</strong>
        <p>Truth is shown here for demonstration. Fair solver packets do not expose hidden truth unless oracle mode is explicit.</p>
      </div>
    </section>
  `;
}

function uncertaintyInspectorHtml(inspection) {
  return `
    <section class="cell-inspector-shell" data-uncertainty-cell-inspector>
      <div class="cell-inspector-header">
        <span>Cell Inspector</span>
        <h2>Cell (${escapeHtml(inspection.cell.col)}, ${escapeHtml(inspection.cell.row)})</h2>
        <p>Displayed Layer: ${escapeHtml(inspection.displayedLayer)}</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Forecast vs Truth</span>
        ${metricRows([
          ['forecast', formatStat(inspection.forecast)],
          ['truth', formatStat(inspection.truth)],
          ['forecast error', formatStat(inspection.forecastError)],
          ['confidence', formatStat(inspection.confidence)]
        ])}
        <small>Truth is visible here for educational inspection only.</small>
      </div>
      <div class="cell-inspector-card">
        <span>Uncertainty / Learning</span>
        ${metricRows([
          ['uncertainty', formatStat(inspection.uncertainty)],
          ['information gain', formatStat(inspection.informationGain)],
          ['delta after update', formatStat(inspection.deltaAfterUpdate)],
          ['update effect', formatStat(inspection.updateEffect)]
        ])}
      </div>
      <div class="cell-inspector-card">
        <span>Observation State</span>
        ${metricRows([
          ['last observed', inspection.lastObserved === null ? 'n/a' : `${formatStat(inspection.lastObserved)} s`],
          ['observation count', inspection.observationCount],
          ['fair solver truth', 'hidden unless oracle']
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

function layerColor(value, viewMode) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  if (viewMode === 'forecastError') {
    if (v < 0.2) return 0x1d3557;
    if (v < 0.45) return 0x457b9d;
    if (v < 0.7) return 0xffc857;
    return 0xff6b6b;
  }
  if (viewMode === 'truth') {
    if (v < 0.25) return 0x0b1d2b;
    if (v < 0.5) return 0x1f7a8c;
    if (v < 0.75) return 0x63c56f;
    return 0xf4d35e;
  }
  if (v < 0.22) return 0x10243b;
  if (v < 0.45) return 0x395b9c;
  if (v < 0.68) return 0x8aa2ff;
  if (v < 0.84) return 0xf4d35e;
  return 0xff7b54;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeExportMode(mode) {
  return mode === 'timeWindow' || mode === 'timeSeries' ? 'timeWindow' : 'currentFrame';
}

function formatStat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : 'N/A';
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
