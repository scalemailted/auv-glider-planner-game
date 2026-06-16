import {
  UNCERTAINTY_DEMO_GRID,
  UNCERTAINTY_DEMO_UPDATE_MODELS,
  createUncertaintyForecastField,
  forecastModelLabel,
  normalizeObservationPath,
  normalizeUncertaintyDemoChoice,
  normalizeUncertaintyScenarioId,
  normalizeUncertaintyViewLayer,
  observationPathLabel,
  uncertaintyScenarioTeachingNote,
  uncertaintyViewLabel,
  updateModelLabel
} from '../../../core/demo/UncertaintyForecastDemo.js';
import { applyObservationSet, sampleObservation } from '../../../core/demo/uncertainty/ObservationModel.js';
import { buildDemoArtifactEnvelope, cloneField, demoArtifactFilename, normalizeDemoExportSettings, validateDemoExportSettings } from '../../../core/io/DemoArtifactExporter.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class UncertaintyForecastDemoScene extends PhaserScene {
  constructor() {
    super('UncertaintyForecastDemoScene');
    this.objects = [];
    this.transportRefs = {};
    this.seed = 'anchor-uncertainty-demo';
    this.scenarioId = 'shiftedFront';
    this.viewMode = 'uncertainty';
    this.updateModel = 'kernelSmoother';
    this.sensorNoise = 0.08;
    this.sampleCount = 8;
    this.observationPath = 'crossSectionTransect';
    this.lengthScale = 2.6;
    this.stalenessRate = 0.012;
    this.revealTruth = false;
    this.demoTime = 0;
    this.playbackSpeedScale = 1;
    this.playbackDirection = 1;
    this.paused = false;
    this.selectedCell = null;
    this.observations = [];
    this.beliefUpdateCount = 0;
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
    this.exportMode = 'currentFrame';
    this.exportStartTime = 0;
    this.exportEndTime = 120;
    this.exportFrameCount = 1;
  }

  init(data = {}) {
    this.seed = data.seed ?? 'anchor-uncertainty-demo';
    this.scenarioId = normalizeUncertaintyScenarioId(data.scenarioId ?? data.forecastModel ?? data.uncertaintyPattern ?? 'shiftedFront');
    this.viewMode = normalizeUncertaintyViewLayer(data.viewMode ?? data.viewLayer ?? 'uncertainty');
    this.updateModel = normalizeUncertaintyDemoChoice(data.updateModel ?? 'kernelSmoother', UNCERTAINTY_DEMO_UPDATE_MODELS, 'kernelSmoother');
    this.sensorNoise = clamp(Number(data.sensorNoise ?? defaultSensorNoise(this.scenarioId)), 0, 0.6);
    this.sampleCount = Math.max(1, Math.min(32, Math.round(finiteNumber(data.sampleCount, defaultSampleCount(this.scenarioId)))));
    this.observationPath = normalizeObservationPath(data.observationPath ?? defaultObservationPath(this.scenarioId));
    this.lengthScale = clamp(finiteNumber(data.lengthScale, 2.6), 0.5, 8);
    this.stalenessRate = clamp(finiteNumber(data.stalenessRate, 0.012), 0, 0.08);
    this.revealTruth = Boolean(data.revealTruth ?? false);
    this.demoTime = finiteNumber(data.demoTime, 0);
    this.playbackSpeedScale = finiteNumber(data.playbackSpeedScale, 1);
    this.playbackDirection = normalizePlaybackDirection(data.playbackDirection);
    this.paused = false;
    this.selectedCell = normalizeSelectedCell(data.selectedCell);
    this.observations = Array.isArray(data.observations) ? data.observations.slice(0, 128) : [];
    this.beliefUpdateCount = Math.max(0, Math.round(finiteNumber(data.beliefUpdateCount, 0)));
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
    return 'Hidden truth, forecast, noisy observations, belief update, surprise, forecast error, hidden-event suspicion, and sampling-priority preview.';
  }

  sceneConfig(overrides = {}) {
    return {
      seed: this.seed,
      scenarioId: this.scenarioId,
      viewMode: this.viewMode,
      viewLayer: this.viewMode,
      updateModel: this.updateModel,
      sensorNoise: this.sensorNoise,
      sampleCount: this.sampleCount,
      observationPath: this.observationPath,
      lengthScale: this.lengthScale,
      stalenessRate: this.stalenessRate,
      revealTruth: this.revealTruth,
      demoTime: this.demoTime,
      time: this.demoTime,
      playbackSpeedScale: this.playbackSpeedScale,
      playbackDirection: this.playbackDirection,
      selectedCell: this.selectedCell,
      observations: this.observations,
      beliefUpdateCount: this.beliefUpdateCount,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount,
      ...overrides
    };
  }

  rebuildField() {
    this.field = createUncertaintyForecastField({ ...this.sceneConfig(), time: this.demoTime });
    this.refreshDebugObject();
  }
  renderConsole() {
    this.app.console?.renderUncertaintyForecastDemoControls?.({
      title: this.title(),
      status: `${uncertaintyViewLabel(this.viewMode)} layer`,
      seed: this.seed,
      scenarioId: this.scenarioId,
      scenarioLabel: forecastModelLabel(this.scenarioId),
      scenarioNote: uncertaintyScenarioTeachingNote(this.scenarioId),
      viewMode: this.viewMode,
      viewModeLabel: uncertaintyViewLabel(this.viewMode),
      updateModel: this.updateModel,
      updateModelLabel: updateModelLabel(this.updateModel),
      sensorNoise: this.sensorNoise,
      sampleCount: this.sampleCount,
      observationPath: this.observationPath,
      observationPathLabel: observationPathLabel(this.observationPath),
      lengthScale: this.lengthScale,
      stalenessRate: this.stalenessRate,
      revealTruth: this.revealTruth,
      playbackSpeedScale: this.playbackSpeedScale,
      paused: this.paused,
      time: this.demoTime,
      observationCount: this.observations.length,
      stats: this.field?.stats,
      diagnostics: this.field?.diagnostics,
      layerCaption: layerCaption(this.viewMode),
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount
    }, {
      viewMode: (viewMode) => this.restartWith({ viewMode: normalizeUncertaintyViewLayer(viewMode), demoTime: 0 }),
      scenarioId: (scenarioId) => {
        const normalized = normalizeUncertaintyScenarioId(scenarioId);
        this.restartWith({
          scenarioId: normalized,
          demoTime: 0,
          observations: [],
          selectedCell: null,
          sensorNoise: defaultSensorNoise(normalized),
          sampleCount: defaultSampleCount(normalized),
          observationPath: defaultObservationPath(normalized),
          beliefUpdateCount: 0
        });
      },
      uncertaintyPattern: (scenarioId) => this.restartWith({ scenarioId: normalizeUncertaintyScenarioId(scenarioId), demoTime: 0, observations: [] }),
      forecastModel: (scenarioId) => this.restartWith({ scenarioId: normalizeUncertaintyScenarioId(scenarioId), demoTime: 0, observations: [] }),
      updateModel: (updateModel) => this.restartWith({ updateModel, demoTime: 0 }),
      seed: (seed) => this.restartWith({ seed: String(seed ?? '').trim() || 'anchor-uncertainty-demo', demoTime: 0, observations: [], beliefUpdateCount: 0 }),
      sensorNoise: (sensorNoise) => this.patchControls({ sensorNoise: clamp(Number(sensorNoise), 0, 0.6) }),
      sampleCount: (sampleCount) => this.patchControls({ sampleCount: Math.max(1, Math.min(32, Math.round(Number(sampleCount) || 1))) }),
      observationPath: (observationPath) => this.patchControls({ observationPath: normalizeObservationPath(observationPath) }),
      lengthScale: (lengthScale) => this.patchControls({ lengthScale: clamp(Number(lengthScale), 0.5, 8) }),
      stalenessRate: (stalenessRate) => this.patchControls({ stalenessRate: clamp(Number(stalenessRate), 0, 0.08) }),
      revealTruth: (revealTruth) => this.patchControls({ revealTruth: Boolean(revealTruth) }),
      playbackSpeedScale: (playbackSpeedScale) => {
        this.playbackSpeedScale = Number(playbackSpeedScale) || 1;
        this.renderConsole();
        this.updateTransportBar();
      },
      addSamples: () => this.addSampleBatch(),
      updateBelief: () => this.updateBelief(),
      applySampleUpdate: () => this.addSampleBatch(),
      resetObservations: () => this.resetObservations(),
      surfaceUpdate: () => this.updateBelief(),
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

  restartWith(patch) {
    this.scene.restart(this.sceneConfig(patch));
  }

  patchControls(patch) {
    Object.assign(this, patch);
    this.rebuildField();
    this.renderConsole();
    this.renderCellInspector(true);
    this.draw();
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
      color: '#d7f7cc',
      wordWrap: { width: 1080 }
    }).setOrigin(0, 0);
    this.objects.push(this.titleText, this.subtitleText, this.statusText);
  }

  layout() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(24, Math.min(52, width * 0.045));
    const top = Math.max(24, Math.min(44, height * 0.06));
    const mapTop = top + 118;
    return {
      width,
      height,
      margin,
      top,
      map: {
        x: margin,
        y: mapTop,
        width: Math.max(320, width - margin * 2),
        height: Math.max(260, height - mapTop - 124)
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
        this.graphics.fillStyle(layerColor(value, this.viewMode), 0.2 + clamp(value, 0, 1) * 0.72);
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
      const cx = map.x + (Number(observation.x ?? observation.col) + 0.5) * cellW;
      const cy = map.y + (Number(observation.y ?? observation.row) + 0.5) * cellH;
      const surprise = clamp(Number(observation.normalizedSurprise ?? observation.surprise / 4), 0, 1);
      const radius = Math.max(5, Math.min(cellW, cellH) * (0.24 + surprise * 0.28));
      this.graphics.lineStyle(2, surprise > 0.55 ? 0xffd166 : 0xffffff, 0.9);
      this.graphics.strokeCircle(cx, cy, radius);
      this.graphics.fillStyle(0xffffff, 0.22 + surprise * 0.28);
      this.graphics.fillCircle(cx, cy, Math.max(2, radius * 0.28));
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
    this.subtitleText?.setWordWrapWidth(Math.min(900, map.width));
    const stats = this.field?.stats ?? {};
    const diagnosis = this.field?.diagnostics?.primaryDiagnosis ?? 'insufficientEvidence';
    this.statusText?.setText(`Scenario: ${forecastModelLabel(this.scenarioId)} | View: ${uncertaintyViewLabel(this.viewMode)} | ${layerCaption(this.viewMode)} | Diagnosis: ${diagnosis} | Observations: ${this.observations.length} | t=${this.demoTime.toFixed(1)} | Mean ${formatStat(stats.mean)} | Max ${formatStat(stats.max)}`);
    this.statusText?.setWordWrapWidth(Math.min(1100, map.width));
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
    const observation = sampleObservation({
      truthField: this.field.hiddenTruthField,
      forecastField: this.field.forecastField,
      uncertaintyField: this.field.expectedUncertaintyField,
      x: cell.col,
      y: cell.row,
      sensorNoise: this.sensorNoise,
      seed: `${this.seed}:${this.scenarioId}:manual:${this.observations.length}`,
      time: this.demoTime,
      sensorType: 'manual-cell-sample'
    });
    this.observations = [...this.observations, observation].slice(-128);
  }

  addSampleBatch() {
    const newObservations = applyObservationSet({
      truthField: this.field.hiddenTruthField,
      forecastField: this.field.forecastField,
      uncertaintyField: this.field.expectedUncertaintyField,
      pattern: this.observationPath,
      count: this.sampleCount,
      seed: `${this.seed}:${this.scenarioId}:batch:${this.observations.length}`,
      time: this.demoTime,
      sensorNoise: this.sensorNoise,
      scenarioId: this.scenarioId,
      sensorType: 'path-sample'
    });
    this.observations = [...this.observations, ...newObservations].slice(-128);
    this.beliefUpdateCount += 1;
    this.rebuildField();
    this.renderConsole();
    this.renderCellInspector(true);
    this.draw();
  }

  updateBelief() {
    this.beliefUpdateCount += 1;
    this.rebuildField();
    this.renderConsole();
    this.renderCellInspector(true);
    this.draw();
  }

  resetObservations() {
    this.observations = [];
    this.beliefUpdateCount = 0;
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
          <button type="button" data-action="uncertainty-demo-reset">Reset Scenario</button>
          <button type="button" data-action="uncertainty-demo-direction">Direction: Forward</button>
          <button type="button" data-action="uncertainty-demo-pause">Pause</button>
        </div>
        <div class="timeline-readout flow-demo-time-readout">
          <strong data-uncertainty-demo-time>Demo Time: 0.0 s</strong>
          <span class="hud-muted" data-uncertainty-demo-state>Belief-state playground</span>
        </div>
        <div class="flow-demo-transport-summary">
          <span data-uncertainty-demo-speed>Playback: 1x</span>
          <span data-uncertainty-demo-view>View: Expected-State Uncertainty</span>
          <span>Truth hidden from fair planning</span>
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
    if (refs.state) refs.state.textContent = `${directionLabel.toLowerCase()} synthetic belief-state field`;
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
    this.beliefUpdateCount = 0;
    this.selectedCell = null;
    this.rebuildField();
    this.renderConsole();
    this.updateTransportBar();
    this.renderCellInspector(true);
    this.draw();
  }

  renderCellInspector(force = false) {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (!root) return;
    const panel = this.inspectorPanelData();
    if (!this.selectedCell) {
      const key = `empty:${this.viewMode}:${this.scenarioId}:${this.observations.length}:${panel.primaryDiagnosis}`;
      if (force || this.lastInspectorKey !== key) {
        root.innerHTML = uncertaintyInspectorEmptyHtml(panel);
        this.lastInspectorKey = key;
      }
      return;
    }
    const key = `${this.selectedCell.col},${this.selectedCell.row}:${this.viewMode}:${this.scenarioId}:${this.observations.length}:${this.paused}:${panel.primaryDiagnosis}`;
    if (!force && key === this.lastInspectorKey && Math.abs(this.demoTime - this.lastInspectorRenderTime) < 0.25) return;
    this.lastInspectorKey = key;
    this.lastInspectorRenderTime = this.demoTime;
    root.innerHTML = uncertaintyInspectorHtml(this.inspectSelectedCell(), panel);
  }

  clearCellInspector() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
    this.lastInspectorKey = '';
  }

  inspectorPanelData() {
    const diagnostics = this.field?.diagnostics ?? {};
    return {
      currentLayer: uncertaintyViewLabel(this.viewMode),
      layerCaption: layerCaption(this.viewMode),
      scenarioId: this.scenarioId,
      scenarioLabel: forecastModelLabel(this.scenarioId),
      scenarioNote: uncertaintyScenarioTeachingNote(this.scenarioId),
      primaryDiagnosis: diagnostics.primaryDiagnosis ?? 'insufficientEvidence',
      recommendedResponse: diagnostics.recommendedResponse ?? 'collect more evidence',
      forecastErrorScore: diagnostics.forecastErrorScore ?? 0,
      hiddenEventConfidence: diagnostics.hiddenEventConfidence ?? 0,
      noiseFalseAlarmRisk: diagnostics.noiseFalseAlarmRisk ?? 0,
      meanUncertainty: diagnostics.meanUncertainty ?? diagnostics.evidenceSummary?.meanUncertainty ?? 0,
      meanSurprise: diagnostics.meanSurprise ?? diagnostics.evidenceSummary?.meanSurprise ?? 0,
      observationCount: this.observations.length,
      revealTruth: this.revealTruth,
      fieldsFinite: this.field?.fieldsFinite ?? false
    };
  }

  inspectSelectedCell() {
    const cell = this.selectedCell;
    const layer = (name) => Number(this.field?.layers?.[name]?.[cell.row]?.[cell.col] ?? 0);
    const observations = this.observations.filter((entry) => Math.round(Number(entry.x ?? entry.col)) === cell.col && Math.round(Number(entry.y ?? entry.row)) === cell.row);
    const lastObserved = observations.length ? Math.max(...observations.map((entry) => Number(entry.time ?? entry.t) || 0)) : null;
    return {
      cell,
      hiddenTruth: layer('hiddenTruth'),
      forecast: layer('forecast'),
      belief: layer('belief'),
      uncertainty: layer('uncertainty'),
      innovation: layer('innovation'),
      surprise: layer('surprise'),
      forecastError: layer('forecastError'),
      unknownEventProbability: layer('unknownEventProbability'),
      samplingPriorityPreview: layer('samplingPriorityPreview'),
      displayedLayer: uncertaintyViewLabel(this.viewMode),
      lastObserved,
      observationCount: observations.length,
      lastObservation: observations.at(-1) ?? null
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
      uncertaintyModel: this.uncertaintyModelMetadata(),
      observationModel: this.observationModelMetadata(),
      beliefState: this.beliefStateMetadata(),
      diagnostics: this.field?.diagnostics,
      fairness: {
        truthVisibleInDemo: this.revealTruth,
        fairSolverDefault: 'forecast_belief_uncertainty_observations_only',
        truthAllowedForFairSolver: false
      },
      metadata: {
        coordinateConvention: 'Row-major arrays indexed fields[layer][row][col]; values represent cell centers on the uncertainty demo grid.',
        units: {
          hiddenTruth: 'normalized hidden-truth demo scalar, 0..1',
          truth: 'legacy alias of hiddenTruth, 0..1',
          forecast: 'normalized expected-state scalar, 0..1',
          belief: 'normalized posterior-like belief mean, 0..1',
          uncertainty: 'normalized expected-state uncertainty, 0..1',
          innovation: 'display-normalized signed innovation: 0.5 means no mismatch',
          surprise: 'normalized display surprise, raw surprise preserved on observations',
          forecastError: 'absolute normalized forecast error, 0..1',
          unknownEventProbability: 'normalized hidden-event suspicion, 0..1',
          samplingPriorityPreview: 'normalized non-route-aware sampling priority preview, 0..1',
          informationGain: 'legacy alias of samplingPriorityPreview',
          deltaAfterUpdate: 'legacy alias: absolute belief minus forecast, 0..1'
        },
        stats: this.field?.stats,
        observationCount: this.observations.length,
        exportFrameLimit: 240,
        notA: 'Educational belief-update model, not a production GP/GMRF/data-assimilation system, calibrated ocean forecast, mission planner, or route optimizer.'
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
      diagnostics: field?.diagnostics,
      fields: {
        displayedValue: cloneField(field?.field),
        hiddenTruth: cloneField(layers.hiddenTruth),
        truth: cloneField(layers.truth),
        forecast: cloneField(layers.forecast),
        observations: cloneField(layers.observations),
        belief: cloneField(layers.belief),
        beliefMean: cloneField(layers.beliefMean),
        uncertainty: cloneField(layers.uncertainty),
        expectedUncertainty: cloneField(layers.expectedUncertainty),
        innovation: cloneField(layers.innovation),
        surprise: cloneField(layers.surprise),
        forecastError: cloneField(layers.forecastError),
        unknownEventProbability: cloneField(layers.unknownEventProbability),
        samplingPriorityPreview: cloneField(layers.samplingPriorityPreview),
        informationGain: cloneField(layers.informationGain),
        deltaAfterUpdate: cloneField(layers.deltaAfterUpdate)
      },
      observations: field?.observations ?? []
    };
  }

  uncertaintyModelMetadata() {
    return {
      version: this.field?.metadata?.version,
      scenarioId: this.scenarioId,
      scenarioLabel: forecastModelLabel(this.scenarioId),
      updateModel: this.updateModel,
      sensorNoise: this.sensorNoise,
      lengthScale: this.lengthScale,
      stalenessRate: this.stalenessRate,
      claimLevel: 'educational_belief_update',
      notA: 'Educational belief-update model, not a production data-assimilation system, GP/GMRF solver, calibrated ocean model, mission planner, or route optimizer.'
    };
  }

  observationModelMetadata() {
    return {
      formula: 'z_i = T(x_i,y_i,t_i) + epsilon_i',
      sensorNoise: this.sensorNoise,
      sampleCount: this.sampleCount,
      observationPath: this.observationPath,
      observationPathLabel: observationPathLabel(this.observationPath)
    };
  }

  beliefStateMetadata() {
    return {
      hasHiddenTruth: Boolean(this.field?.hiddenTruthField),
      hasForecast: Boolean(this.field?.forecastField),
      hasBeliefMean: Boolean(this.field?.beliefMeanField),
      hasExpectedUncertainty: Boolean(this.field?.expectedUncertaintyField),
      hasUnknownEventProbability: Boolean(this.field?.unknownEventProbabilityField),
      observationCount: this.observations.length
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

  refreshDebugObject() {
    const stats = this.field?.diagnostics?.fieldStats ?? {};
    globalThis.ANCHOR_UNCERTAINTY_DEMO_DEBUG = {
      version: this.field?.metadata?.version,
      scenarioId: this.scenarioId,
      scenarioLabel: forecastModelLabel(this.scenarioId),
      viewLayer: this.viewMode,
      updateModel: this.updateModel,
      sensorNoise: this.sensorNoise,
      observationCount: this.observations.length,
      truthStats: stats.truth,
      forecastStats: stats.forecast,
      beliefStats: stats.belief,
      uncertaintyStats: stats.uncertainty,
      surpriseStats: stats.surprise,
      priorityStats: stats.priority,
      forecastErrorScore: this.field?.diagnostics?.forecastErrorScore,
      hiddenEventConfidence: this.field?.diagnostics?.hiddenEventConfidence,
      noiseFalseAlarmRisk: this.field?.diagnostics?.noiseFalseAlarmRisk,
      primaryDiagnosis: this.field?.diagnostics?.primaryDiagnosis,
      recommendedResponse: this.field?.diagnostics?.recommendedResponse,
      fieldsFinite: Boolean(this.field?.fieldsFinite),
      usesProductionGp: false,
      usesProductionGmrf: false,
      usesPlanner: false
    };
  }

  destroyObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
  }
}

function uncertaintyInspectorEmptyHtml(panel) {
  return `
    <section class="cell-inspector-shell" data-uncertainty-explanation-panel>
      <div class="cell-inspector-header">
        <span>Uncertainty / Forecast Demo</span>
        <h2>${escapeHtml(panel.currentLayer)}</h2>
        <p>${escapeHtml(panel.layerCaption)}</p>
      </div>
      ${diagnosisCardHtml(panel)}
      ${meaningCardHtml(panel)}
      ${colorMeaningCardHtml(panel)}
      <div class="cell-inspector-card">
        <span>What this is not</span>
        <p>Educational belief-update model, not a production data-assimilation system or calibrated ocean model.</p>
      </div>
    </section>
  `;
}

function uncertaintyInspectorHtml(inspection, panel) {
  return `
    <section class="cell-inspector-shell" data-uncertainty-cell-inspector>
      <div class="cell-inspector-header">
        <span>Cell Inspector</span>
        <h2>Cell (${escapeHtml(inspection.cell.col)}, ${escapeHtml(inspection.cell.row)})</h2>
        <p>Displayed Layer: ${escapeHtml(inspection.displayedLayer)}</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Forecast, Truth, Belief</span>
        ${metricRows([
          ['hidden truth', formatStat(inspection.hiddenTruth)],
          ['forecast / expected', formatStat(inspection.forecast)],
          ['belief mean', formatStat(inspection.belief)],
          ['forecast error', formatStat(inspection.forecastError)]
        ])}
        <small>Truth is visible here for education only; fair planning should use forecast, belief, uncertainty, and observations.</small>
      </div>
      <div class="cell-inspector-card">
        <span>Uncertainty Evidence</span>
        ${metricRows([
          ['expected uncertainty', formatStat(inspection.uncertainty)],
          ['innovation', formatStat(inspection.innovation)],
          ['surprise', formatStat(inspection.surprise)],
          ['unknown-event probability', formatStat(inspection.unknownEventProbability)]
        ])}
      </div>
      <div class="cell-inspector-card">
        <span>Sampling Preview</span>
        ${metricRows([
          ['sampling priority', formatStat(inspection.samplingPriorityPreview)],
          ['last observed', inspection.lastObserved === null ? 'n/a' : `${formatStat(inspection.lastObserved)} s`],
          ['cell observations', inspection.observationCount],
          ['last observed value', inspection.lastObservation ? formatStat(inspection.lastObservation.observedValue) : 'n/a']
        ])}
        <small>Sampling priority is not event intensity and is not route planning.</small>
      </div>
      ${diagnosisCardHtml(panel)}
      ${meaningCardHtml(panel)}
    </section>
  `;
}
function diagnosisCardHtml(panel) {
  return `
    <div class="cell-inspector-card">
      <span>Scenario / Diagnosis</span>
      <p><strong>${escapeHtml(panel.scenarioLabel)}</strong>: ${escapeHtml(panel.scenarioNote)}</p>
      ${metricRows([
        ['primary diagnosis', diagnosisLabel(panel.primaryDiagnosis)],
        ['forecast error score', formatStat(panel.forecastErrorScore)],
        ['hidden-event confidence', formatStat(panel.hiddenEventConfidence)],
        ['noise false-alarm risk', formatStat(panel.noiseFalseAlarmRisk)],
        ['mean uncertainty', formatStat(panel.meanUncertainty)],
        ['observation count', panel.observationCount]
      ])}
      <small>Recommended response: ${escapeHtml(panel.recommendedResponse)}</small>
    </div>
  `;
}

function meaningCardHtml(panel) {
  return `
    <div class="cell-inspector-card">
      <span>What this means</span>
      <p>${escapeHtml(diagnosisExplanation(panel.primaryDiagnosis))}</p>
      <small>Expected-state uncertainty and unknown-event probability are separate. One asks how unsure the forecasted state is; the other asks whether evidence suggests a missing phenomenon.</small>
    </div>
  `;
}

function colorMeaningCardHtml(panel) {
  return `
    <div class="cell-inspector-card">
      <span>What Colors Mean</span>
      <p>${escapeHtml(panel.currentLayer)}: ${escapeHtml(panel.layerCaption)}</p>
      <small>Low values render dark. Medium values render blue/teal. High values render yellow/orange/red depending on the layer.</small>
    </div>
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
  const v = clamp(Number(value) || 0, 0, 1);
  if (viewMode === 'innovation') {
    if (v < 0.38) return 0x2f74c0;
    if (v < 0.48) return 0x6aa5d8;
    if (v < 0.52) return 0xc7d7df;
    if (v < 0.66) return 0xffc857;
    return 0xef476f;
  }
  if (viewMode === 'surprise' || viewMode === 'forecastError') {
    if (v < 0.2) return 0x1d3557;
    if (v < 0.45) return 0x457b9d;
    if (v < 0.7) return 0xffc857;
    return 0xff6b6b;
  }
  if (viewMode === 'hiddenTruth' || viewMode === 'forecast' || viewMode === 'belief') {
    if (v < 0.25) return 0x0b1d2b;
    if (v < 0.5) return 0x1f7a8c;
    if (v < 0.75) return 0x63c56f;
    return 0xf4d35e;
  }
  if (viewMode === 'unknownEventProbability') {
    if (v < 0.25) return 0x101526;
    if (v < 0.5) return 0x663399;
    if (v < 0.72) return 0xc75d9b;
    return 0xffb000;
  }
  if (viewMode === 'samplingPriorityPreview') {
    if (v < 0.25) return 0x10243b;
    if (v < 0.5) return 0x1f7a8c;
    if (v < 0.74) return 0xf4d35e;
    return 0xff7b54;
  }
  if (v < 0.22) return 0x10243b;
  if (v < 0.45) return 0x395b9c;
  if (v < 0.68) return 0x8aa2ff;
  if (v < 0.84) return 0xf4d35e;
  return 0xff7b54;
}

function layerCaption(viewMode) {
  return {
    hiddenTruth: 'High value means the synthetic hidden phenomenon is actually present. This layer is for teaching, not fair planning.',
    forecast: 'High value means the expected state says a phenomenon should be present before sampling.',
    observations: 'Bright markers indicate noisy samples; ring size grows with surprise.',
    belief: 'High value means the posterior-like educational estimate after observations is high.',
    uncertainty: 'High value means expected-state uncertainty remains high or the area is stale.',
    innovation: 'Blue means observed lower than expected; warm colors mean observed higher than expected.',
    surprise: 'High value means the observation mismatched the expected state after normalizing by uncertainty and noise.',
    forecastError: 'High value means the forecasted layer exists but is wrong in position, timing, shape, or strength.',
    unknownEventProbability: 'High value means coherent evidence suggests a phenomenon missing from the forecast.',
    samplingPriorityPreview: 'Sampling priority is not event intensity. High value means sampling may be scientifically useful now; this is not route planning.'
  }[viewMode] ?? 'High value means more of the selected educational uncertainty layer.';
}

function diagnosisExplanation(diagnosis) {
  return {
    likelyForecastError: 'The forecasted feature exists, but observations suggest it is misplaced or misestimated.',
    possibleHiddenEvent: 'Observations suggest a coherent feature that was not represented in the forecast.',
    likelyNoiseOrFalseAlarm: 'A surprising sample exists, but it lacks coherence. Do not overreact.',
    agreesWithForecast: 'Samples confirm the forecast and mostly reduce uncertainty.',
    insufficientEvidence: 'There is not enough evidence yet. Collect more samples before changing the hypothesis.'
  }[diagnosis] ?? 'Collect more evidence before interpreting the uncertainty state.';
}

function diagnosisLabel(diagnosis) {
  return {
    likelyForecastError: 'likely forecast error',
    possibleHiddenEvent: 'possible hidden event',
    likelyNoiseOrFalseAlarm: 'likely noise or false alarm',
    agreesWithForecast: 'agrees with forecast',
    insufficientEvidence: 'insufficient evidence'
  }[diagnosis] ?? String(diagnosis ?? 'insufficient evidence');
}

function defaultObservationPath(scenarioId) {
  return {
    accurateForecast: 'crossSectionTransect',
    shiftedFront: 'boundaryProbe',
    weakenedHotspot: 'clusterFollowup',
    hiddenPlume: 'clusterFollowup',
    hiddenBloomLayer: 'sparseRandom',
    noisyFalseAlarm: 'singlePoint',
    staleMonitoringField: 'diagonalTransect'
  }[scenarioId] ?? 'crossSectionTransect';
}

function defaultSampleCount(scenarioId) {
  return scenarioId === 'noisyFalseAlarm' ? 1 : 8;
}

function defaultSensorNoise(scenarioId) {
  return scenarioId === 'noisyFalseAlarm' ? 0.24 : 0.08;
}

function normalizeExportMode(mode) {
  return mode === 'timeWindow' || mode === 'timeSeries' ? 'timeWindow' : 'currentFrame';
}

function formatStat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : 'N/A';
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
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