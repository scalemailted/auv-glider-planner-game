import {
  createSamplingPriorityScenario,
  normalizeSamplingPriorityScenarioId,
  samplingPriorityScenarioLabel
} from '../../../core/demo/samplingPriority/SamplingPriorityScenarios.js';
import {
  computeSamplingPriority,
  defaultSamplingPriorityWeights,
  explainSamplingPriorityMethod,
  normalizeSamplingPriorityMethodId,
  samplingPriorityMethodLabel
} from '../../../core/demo/samplingPriority/SamplingPriorityModel.js';
import {
  generateCandidateSamplePoints,
  normalizeSamplingPriorityCandidateMode,
  samplingPriorityCandidateModeLabel
} from '../../../core/demo/samplingPriority/SamplingPriorityCandidates.js';
import { absFieldDifference, fieldStats } from '../../../core/demo/samplingPriority/SamplingPriorityFieldMath.js';
import { validateSamplingPriorityResult } from '../../../core/demo/samplingPriority/SamplingPriorityValidation.js';
import { buildDemoArtifactEnvelope, cloneField, demoArtifactFilename, normalizeDemoExportSettings, validateDemoExportSettings } from '../../../core/io/DemoArtifactExporter.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const SAMPLING_PRIORITY_DEMO_GRID = { width: 28, height: 18 };
export const SAMPLING_PRIORITY_VIEW_LAYERS = [
  'eventIntensity',
  'trueRoi',
  'beliefRoi',
  'expectedUncertainty',
  'boundaryStrength',
  'forecastValidation',
  'hiddenEventProbability',
  'staleness',
  'hazard',
  'recentSamplePenalty',
  'samplingPriority',
  'candidateSamplePoints',
  'priorityEventDifference'
];

export class SamplingPriorityDemoScene extends PhaserScene {
  constructor() {
    super('SamplingPriorityDemoScene');
    this.objects = [];
    this.candidateLabels = [];
    this.seed = 'anchor-sampling-priority-demo';
    this.scenarioId = 'uncertainFront';
    this.methodId = 'weightedAcquisition';
    this.viewLayer = 'samplingPriority';
    this.candidateMode = 'diverseTopK';
    this.candidateCount = 6;
    this.minDistance = 3;
    this.missionObjectivePreset = 'balancedScience';
    this.threshold = 0.5;
    this.beta = 0.65;
    this.weights = null;
    this.demoTime = 0;
    this.selectedCell = null;
    this.exportMode = 'currentFrame';
    this.exportStartTime = 0;
    this.exportEndTime = 120;
    this.exportFrameCount = 1;
  }

  init(data = {}) {
    this.seed = String(data.seed ?? 'anchor-sampling-priority-demo');
    this.scenarioId = normalizeSamplingPriorityScenarioId(data.scenarioId ?? 'uncertainFront');
    this.methodId = normalizeSamplingPriorityMethodId(data.methodId ?? data.method ?? 'weightedAcquisition');
    this.viewLayer = normalizeSamplingPriorityViewLayer(data.viewLayer ?? data.viewMode ?? 'samplingPriority');
    this.candidateMode = normalizeSamplingPriorityCandidateMode(data.candidateMode ?? 'diverseTopK');
    this.candidateCount = Math.max(1, Math.min(16, Math.round(finiteNumber(data.candidateCount, 6))));
    this.minDistance = clamp(finiteNumber(data.minDistance, 3), 1, 8);
    this.missionObjectivePreset = normalizeObjectivePreset(data.missionObjectivePreset ?? 'balancedScience');
    this.threshold = clamp(finiteNumber(data.threshold, 0.5), 0.05, 0.95);
    this.beta = clamp(finiteNumber(data.beta, 0.65), 0, 3);
    this.weights = normalizeWeightsPatch(data.weights);
    this.demoTime = finiteNumber(data.demoTime, 0);
    this.selectedCell = normalizeSelectedCell(data.selectedCell);
    this.exportMode = normalizeExportMode(data.exportMode);
    this.exportStartTime = finiteNumber(data.exportStartTime ?? this.demoTime, this.demoTime);
    this.exportEndTime = finiteNumber(data.exportEndTime ?? Math.max(120, this.demoTime), Math.max(120, this.demoTime));
    this.exportFrameCount = Math.max(1, Math.round(finiteNumber(data.exportFrameCount, 1)));
    this.rebuildModel();
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'samplingPriorityDemo';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel(this.title());
    this.renderConsole();
    this.renderExplanationPanel(true);
    this.buildSceneObjects();
    this.bindInputHandlers();
    this.draw();
  }

  shutdown() {
    this.unbindInputHandlers();
    this.destroyObjects();
    this.clearExplanationPanel();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.buildSceneObjects();
    this.draw();
  }

  title() {
    return 'Sampling Priority Demo';
  }

  subtitle() {
    return 'Global vehicle-independent acquisition value A_global(x,y,t): where a measurement would be scientifically useful next.';
  }

  sceneConfig(overrides = {}) {
    return {
      seed: this.seed,
      scenarioId: this.scenarioId,
      methodId: this.methodId,
      viewLayer: this.viewLayer,
      candidateMode: this.candidateMode,
      candidateCount: this.candidateCount,
      minDistance: this.minDistance,
      missionObjectivePreset: this.missionObjectivePreset,
      threshold: this.threshold,
      beta: this.beta,
      weights: this.effectiveWeights(),
      demoTime: this.demoTime,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount,
      selectedCell: this.selectedCell,
      ...overrides
    };
  }

  effectiveWeights() {
    return {
      ...defaultSamplingPriorityWeights(this.methodId, { scenarioId: this.scenarioId }),
      ...(this.weights ?? {})
    };
  }

  rebuildModel() {
    this.scenario = createSamplingPriorityScenario({
      grid: SAMPLING_PRIORITY_DEMO_GRID,
      seed: this.seed,
      scenarioId: this.scenarioId,
      time: this.demoTime
    });
    this.priorityResult = computeSamplingPriority({
      scenario: this.scenario,
      methodId: this.methodId,
      weights: this.effectiveWeights(),
      threshold: this.threshold,
      beta: this.beta
    });
    this.candidateSamplePoints = generateCandidateSamplePoints({
      priorityField: this.priorityResult.priorityField,
      components: this.priorityResult.components,
      method: this.methodId,
      candidateMode: this.candidateMode,
      candidateCount: this.candidateCount,
      minDistance: this.minDistance,
      missionObjectivePreset: this.missionObjectivePreset,
      accessibleMask: this.scenario.accessibleMask,
      recentSamples: this.scenario.recentSamples
    });
    this.validation = validateSamplingPriorityResult({
      ...this.priorityResult,
      scenario: this.scenario,
      candidateSamplePoints: this.candidateSamplePoints
    });
    this.field = this.fieldForLayer(this.viewLayer);
    this.stats = fieldStats(this.field);
    this.refreshDebugObject();
  }

  fieldForLayer(layer) {
    const components = this.priorityResult?.components ?? {};
    const map = {
      eventIntensity: components.eventIntensity,
      trueRoi: components.trueRoi,
      beliefRoi: components.beliefRoi,
      expectedUncertainty: components.expectedUncertainty,
      boundaryStrength: components.boundaryStrength,
      forecastValidation: components.forecastValidation,
      hiddenEventProbability: components.hiddenEventProbability,
      staleness: components.staleness,
      hazard: components.hazard,
      recentSamplePenalty: components.recentSamplePenalty,
      samplingPriority: this.priorityResult?.priorityField,
      candidateSamplePoints: this.priorityResult?.priorityField,
      priorityEventDifference: absFieldDifference(this.priorityResult?.priorityField, components.eventIntensity)
    };
    return map[normalizeSamplingPriorityViewLayer(layer)] ?? this.priorityResult?.priorityField;
  }

  renderConsole() {
    this.app.console?.renderSamplingPriorityDemoControls?.({
      title: this.title(),
      status: `${samplingPriorityViewLayerLabel(this.viewLayer)} layer`,
      seed: this.seed,
      scenarioId: this.scenarioId,
      scenarioLabel: samplingPriorityScenarioLabel(this.scenarioId),
      scenarioNote: this.scenario?.teachingNotes,
      methodId: this.methodId,
      methodLabel: samplingPriorityMethodLabel(this.methodId),
      methodExplanation: explainSamplingPriorityMethod(this.methodId),
      viewLayer: this.viewLayer,
      viewLayerLabel: samplingPriorityViewLayerLabel(this.viewLayer),
      viewLayerCaption: samplingPriorityLayerCaption(this.viewLayer),
      candidateMode: this.candidateMode,
      candidateModeLabel: samplingPriorityCandidateModeLabel(this.candidateMode),
      candidateCount: this.candidateCount,
      minDistance: this.minDistance,
      missionObjectivePreset: this.missionObjectivePreset,
      threshold: this.threshold,
      beta: this.beta,
      weights: this.effectiveWeights(),
      stats: this.stats,
      candidateSamplePoints: this.candidateSamplePoints,
      validation: this.validation,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount
    }, {
      scenarioId: (scenarioId) => this.restartWith({ scenarioId: normalizeSamplingPriorityScenarioId(scenarioId), selectedCell: null, weights: null }),
      methodId: (methodId) => this.patchControls({ methodId: normalizeSamplingPriorityMethodId(methodId), weights: null }),
      viewLayer: (viewLayer) => this.patchControls({ viewLayer: normalizeSamplingPriorityViewLayer(viewLayer) }),
      candidateMode: (candidateMode) => this.patchControls({ candidateMode: normalizeSamplingPriorityCandidateMode(candidateMode) }),
      candidateCount: (candidateCount) => this.patchControls({ candidateCount: Math.max(1, Math.min(16, Math.round(Number(candidateCount) || 6))) }),
      minDistance: (minDistance) => this.patchControls({ minDistance: clamp(Number(minDistance), 1, 8) }),
      threshold: (threshold) => this.patchControls({ threshold: clamp(Number(threshold), 0.05, 0.95) }),
      beta: (beta) => this.patchControls({ beta: clamp(Number(beta), 0, 3) }),
      seed: (seed) => this.restartWith({ seed: String(seed ?? '').trim() || 'anchor-sampling-priority-demo', selectedCell: null }),
      objectivePreset: (preset) => this.applyObjectivePreset(preset),
      weight: (key, value) => this.patchWeight(key, value),
      reset: () => this.resetDemoState(),
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
    this.rebuildModel();
    this.renderConsole();
    this.renderExplanationPanel(true);
    this.draw();
  }

  patchWeight(key, value) {
    const weights = { ...this.effectiveWeights() };
    weights[key] = Math.max(0, Number(value) || 0);
    this.patchControls({ weights });
  }

  applyObjectivePreset(preset) {
    const normalized = normalizeObjectivePreset(preset);
    const patch = objectivePresetPatch(normalized);
    this.patchControls({
      missionObjectivePreset: normalized,
      methodId: patch.methodId,
      weights: patch.weights
    });
  }

  resetDemoState() {
    this.seed = 'anchor-sampling-priority-demo';
    this.scenarioId = 'uncertainFront';
    this.methodId = 'weightedAcquisition';
    this.viewLayer = 'samplingPriority';
    this.candidateMode = 'diverseTopK';
    this.candidateCount = 6;
    this.minDistance = 3;
    this.missionObjectivePreset = 'balancedScience';
    this.threshold = 0.5;
    this.beta = 0.65;
    this.weights = null;
    this.selectedCell = null;
    this.demoTime = 0;
    this.rebuildModel();
    this.renderConsole();
    this.renderExplanationPanel(true);
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
      wordWrap: { width: 860 }
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
    this.clearCandidateLabels();
    this.drawBackground(layout);
    this.drawHeatmap(layout.map);
    this.drawRecentSamples(layout.map);
    this.drawCandidates(layout.map);
    this.drawSelectedCell(layout.map);
    this.layoutText(layout);
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x07101d, 0x12243a, 0x152132, 0x07101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x081827, 0.96);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x8aa2ff, 0.52);
    this.graphics.strokeRoundedRect(map.x, map.y, map.width, map.height, 8);
  }

  drawHeatmap(map) {
    const width = this.scenario.width;
    const height = this.scenario.height;
    const cellW = map.width / width;
    const cellH = map.height / height;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = Number(this.field[y]?.[x] ?? 0);
        this.graphics.fillStyle(layerColor(value, this.viewLayer), 0.18 + clamp(value, 0, 1) * 0.76);
        this.graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
      }
    }
    this.graphics.lineStyle(1, 0x26344f, 0.24);
    for (let x = 0; x <= width; x += 1) this.graphics.lineBetween(map.x + x * cellW, map.y, map.x + x * cellW, map.y + map.height);
    for (let y = 0; y <= height; y += 1) this.graphics.lineBetween(map.x, map.y + y * cellH, map.x + map.width, map.y + y * cellH);
  }

  drawRecentSamples(map) {
    const cellW = map.width / this.scenario.width;
    const cellH = map.height / this.scenario.height;
    for (const sample of this.scenario.recentSamples ?? []) {
      const cx = map.x + (Number(sample.x ?? sample.col) + 0.5) * cellW;
      const cy = map.y + (Number(sample.y ?? sample.row) + 0.5) * cellH;
      this.graphics.lineStyle(1.5, 0xffffff, 0.48);
      this.graphics.strokeCircle(cx, cy, Math.max(4, Math.min(cellW, cellH) * 0.22));
    }
  }

  drawCandidates(map) {
    const cellW = map.width / this.scenario.width;
    const cellH = map.height / this.scenario.height;
    for (const [index, candidate] of this.candidateSamplePoints.entries()) {
      const cx = map.x + (candidate.x + 0.5) * cellW;
      const cy = map.y + (candidate.y + 0.5) * cellH;
      const radius = Math.max(8, Math.min(cellW, cellH) * 0.36);
      this.graphics.lineStyle(3, candidate.accessible === false ? 0xff6b6b : 0xffffff, 0.95);
      this.graphics.fillStyle(0x08111f, 0.78);
      this.graphics.fillCircle(cx, cy, radius);
      this.graphics.strokeCircle(cx, cy, radius);
      const label = this.add.text(cx, cy, String(index + 1), {
        fontFamily: 'system-ui',
        fontSize: '12px',
        fontStyle: '700',
        color: '#ffffff'
      }).setOrigin(0.5, 0.5).setDepth(20);
      this.candidateLabels.push(label);
      this.objects.push(label);
    }
  }

  drawSelectedCell(map) {
    if (!this.selectedCell) return;
    const cellW = map.width / this.scenario.width;
    const cellH = map.height / this.scenario.height;
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
    this.statusText?.setText(`Scenario: ${samplingPriorityScenarioLabel(this.scenarioId)} | Method: ${samplingPriorityMethodLabel(this.methodId)} | View: ${samplingPriorityViewLayerLabel(this.viewLayer)} | Candidates: ${this.candidateSamplePoints.length} | Validation: ${this.validation?.status ?? 'n/a'} | Mean ${formatStat(this.stats?.mean)} | Max ${formatStat(this.stats?.max)}`);
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
    this.renderExplanationPanel(true);
    this.draw();
  }

  cellFromPointer(pointer) {
    const map = this.layout().map;
    const x = Number(pointer?.x);
    const y = Number(pointer?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !this.scenario) return null;
    if (x < map.x || y < map.y || x > map.x + map.width || y > map.y + map.height) return null;
    const col = Math.max(0, Math.min(this.scenario.width - 1, Math.floor(((x - map.x) / map.width) * this.scenario.width)));
    const row = Math.max(0, Math.min(this.scenario.height - 1, Math.floor(((y - map.y) / map.height) * this.scenario.height)));
    return { col, row, x: col, y: row };
  }

  renderExplanationPanel() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (!root) return;
    root.innerHTML = samplingPriorityExplanationHtml({
      scenario: this.scenario,
      method: explainSamplingPriorityMethod(this.methodId),
      viewLayer: this.viewLayer,
      viewLayerLabel: samplingPriorityViewLayerLabel(this.viewLayer),
      viewLayerCaption: samplingPriorityLayerCaption(this.viewLayer),
      candidates: this.candidateSamplePoints,
      validation: this.validation,
      selectedCell: this.selectedCell ? this.inspectSelectedCell() : null,
      stats: this.stats
    });
  }

  clearExplanationPanel() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
  }

  inspectSelectedCell() {
    const cell = this.selectedCell;
    const components = this.priorityResult?.components ?? {};
    const layer = (field) => Number(field?.[cell.row]?.[cell.col] ?? 0);
    return {
      cell,
      eventIntensity: layer(components.eventIntensity),
      trueRoi: layer(components.trueRoi),
      beliefRoi: layer(components.beliefRoi),
      expectedUncertainty: layer(components.expectedUncertainty),
      boundaryStrength: layer(components.boundaryStrength),
      forecastValidation: layer(components.forecastValidation),
      hiddenEventProbability: layer(components.hiddenEventProbability),
      staleness: layer(components.staleness),
      hazard: layer(components.hazard),
      recentSamplePenalty: layer(components.recentSamplePenalty),
      samplingPriority: layer(this.priorityResult?.priorityField)
    };
  }

  exportDemoJson() {
    const errors = validateDemoExportSettings(this.exportSettings(), this.demoTime);
    if (errors.length) {
      this.app?.toast?.(errors[0], 'warning');
      return;
    }
    const artifact = this.buildDemoArtifactExport();
    downloadJSON(demoArtifactFilename('sampling-priority', { kind: artifact.timeSampling?.kind }), artifact);
    this.app?.toast?.('Sampling Priority Demo JSON exported.', 'success');
  }

  buildDemoArtifactExport() {
    const sampling = this.demoExportSampling();
    const currentFrame = this.buildDemoArtifactFrame(this.demoTime, null);
    const frames = sampling.timesSeconds.map((time, index) => this.buildDemoArtifactFrame(time, index));
    return buildDemoArtifactEnvelope({
      type: 'anchor.demo.sampling-priority',
      demo: this.title(),
      grid: SAMPLING_PRIORITY_DEMO_GRID,
      time: {
        demoTimeSeconds: this.demoTime,
        fieldTimeSeconds: this.demoTime,
        playbackDirection: 'forward',
        playbackSpeed: 0
      },
      timeSampling: sampling,
      config: this.sceneConfig(),
      fields: currentFrame.fields,
      frames,
      selectedCell: this.selectedCell ? this.inspectSelectedCell() : null,
      samplingPriorityModel: this.samplingPriorityModelMetadata(),
      candidateSamplePoints: this.candidateSamplePoints,
      priorityDiagnostics: this.priorityDiagnostics(),
      metadata: {
        coordinateConvention: 'Row-major arrays indexed fields[layer][row][col]; values represent cell centers on the sampling-priority demo grid.',
        eventIntensityVsPriority: 'Event intensity says what is present. Sampling priority says where a next measurement may be scientifically useful.',
        notA: 'Educational acquisition model, not route planning, not flow-coupled action value, not production GP/GMRF inference, not calibrated data assimilation, and not a mission scoring engine.'
      }
    });
  }

  buildDemoArtifactFrame(demoTime, index) {
    const scenario = createSamplingPriorityScenario({
      grid: SAMPLING_PRIORITY_DEMO_GRID,
      seed: this.seed,
      scenarioId: this.scenarioId,
      time: demoTime
    });
    const priority = computeSamplingPriority({
      scenario,
      methodId: this.methodId,
      weights: this.effectiveWeights(),
      threshold: this.threshold,
      beta: this.beta
    });
    return {
      index,
      timeSeconds: demoTime,
      demoTimeSeconds: demoTime,
      fields: exportFields(priority, scenario),
      candidateSamplePoints: generateCandidateSamplePoints({
        priorityField: priority.priorityField,
        components: priority.components,
        method: this.methodId,
        candidateMode: this.candidateMode,
        candidateCount: this.candidateCount,
        minDistance: this.minDistance,
        accessibleMask: scenario.accessibleMask,
        recentSamples: scenario.recentSamples
      })
    };
  }

  samplingPriorityModelMetadata() {
    return {
      version: this.priorityResult?.version,
      scenarioId: this.scenarioId,
      scenarioLabel: samplingPriorityScenarioLabel(this.scenarioId),
      methodId: this.methodId,
      methodLabel: samplingPriorityMethodLabel(this.methodId),
      candidateMode: this.candidateMode,
      weights: this.effectiveWeights(),
      formula: this.priorityResult?.formula,
      claimLevel: 'educational_global_acquisition_model',
      notA: this.priorityResult?.notA
    };
  }

  priorityDiagnostics() {
    return {
      validationStatus: this.validation?.status,
      validationChecks: this.validation?.checks,
      stats: {
        priority: this.priorityResult?.stats,
        components: this.priorityResult?.componentStats
      },
      priorityNotEventIntensity: this.priorityResult?.priorityNotEventIntensity === true,
      usesRoutePlanning: false,
      usesFlowCoupling: false
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
        this.exportFrameCount = 12;
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
    const stats = this.priorityResult?.componentStats ?? {};
    globalThis.ANCHOR_SAMPLING_PRIORITY_DEMO_DEBUG = {
      version: this.priorityResult?.version,
      scenarioId: this.scenarioId,
      scenarioLabel: samplingPriorityScenarioLabel(this.scenarioId),
      methodId: this.methodId,
      methodLabel: samplingPriorityMethodLabel(this.methodId),
      candidateMode: this.candidateMode,
      viewLayer: this.viewLayer,
      weights: this.effectiveWeights(),
      candidateCount: this.candidateCount,
      minDistance: this.minDistance,
      eventIntensityStats: stats.eventIntensity,
      beliefRoiStats: stats.beliefRoi,
      uncertaintyStats: stats.expectedUncertainty,
      boundaryStats: stats.boundaryStrength,
      forecastValidationStats: stats.forecastValidation,
      hiddenEventStats: stats.hiddenEventProbability,
      stalenessStats: stats.staleness,
      hazardStats: stats.hazard,
      priorityStats: this.priorityResult?.stats,
      candidateSamplePoints: this.candidateSamplePoints,
      validationStatus: this.validation?.status,
      validationChecks: this.validation?.checks,
      usesRoutePlanning: false,
      usesFlowCoupling: false,
      usesProductionGp: false,
      usesProductionGmrf: false
    };
  }

  destroyObjects() {
    this.clearCandidateLabels();
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
  }

  clearCandidateLabels() {
    this.candidateLabels?.forEach((label) => label.destroy?.());
    this.candidateLabels = [];
    this.objects = (this.objects ?? []).filter((object) => !object?.destroyed);
  }
}

export function normalizeSamplingPriorityViewLayer(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    event: 'eventIntensity',
    oracle: 'trueRoi',
    trueROI: 'trueRoi',
    belief: 'beliefRoi',
    uncertainty: 'expectedUncertainty',
    boundary: 'boundaryStrength',
    forecast: 'forecastValidation',
    hidden: 'hiddenEventProbability',
    stale: 'staleness',
    hazardPenalty: 'hazard',
    redundancy: 'recentSamplePenalty',
    priority: 'samplingPriority',
    candidates: 'candidateSamplePoints',
    difference: 'priorityEventDifference'
  };
  const normalized = aliases[value] ?? value;
  return SAMPLING_PRIORITY_VIEW_LAYERS.includes(normalized) ? normalized : 'samplingPriority';
}

export function samplingPriorityViewLayerLabel(id) {
  return {
    eventIntensity: 'Event Intensity',
    trueRoi: 'True ROI / Oracle Value',
    beliefRoi: 'Forecast / Belief ROI',
    expectedUncertainty: 'Expected-State Uncertainty',
    boundaryStrength: 'Boundary / Gradient Value',
    forecastValidation: 'Forecast-Validation Value',
    hiddenEventProbability: 'Hidden-Event Probability',
    staleness: 'Staleness / Revisit Value',
    hazard: 'Hazard / Constraint Penalty',
    recentSamplePenalty: 'Redundancy / Recent-Sample Penalty',
    samplingPriority: 'Sampling Priority',
    candidateSamplePoints: 'Candidate Sample Points',
    priorityEventDifference: 'Priority vs Event Difference'
  }[normalizeSamplingPriorityViewLayer(id)] ?? 'Sampling Priority';
}

export function samplingPriorityLayerCaption(id) {
  return {
    eventIntensity: 'High value means the synthetic phenomenon is physically present or active.',
    trueRoi: 'High value means scientific value if the truth were known. This is oracle teaching context.',
    beliefRoi: 'High value means the current forecast or belief says the area is valuable.',
    expectedUncertainty: 'High value means the expected state is uncertain.',
    boundaryStrength: 'High value marks fronts, gradients, and edges where samples localize structure.',
    forecastValidation: 'High value marks places where a measurement can test whether the forecast is wrong.',
    hiddenEventProbability: 'High value marks coherent suspicion of a feature missing from the expected state.',
    staleness: 'High value marks revisit or age-of-information value.',
    hazard: 'High value marks areas that should suppress sampling priority.',
    recentSamplePenalty: 'High value marks redundant cells near recent samples.',
    samplingPriority: 'Sampling priority is not event intensity. High value means sampling may be scientifically useful now before route planning.',
    candidateSamplePoints: 'Numbered markers are discrete candidate sample locations derived from the priority field.',
    priorityEventDifference: 'High value means sampling priority differs strongly from event intensity.'
  }[normalizeSamplingPriorityViewLayer(id)] ?? 'High value means more of the selected sampling-priority layer.';
}

function exportFields(priority, scenario) {
  const components = priority.components ?? {};
  return {
    eventIntensityField: cloneField(components.eventIntensity),
    trueRoiField: cloneField(components.trueRoi),
    beliefRoiField: cloneField(components.beliefRoi),
    expectedUncertaintyField: cloneField(components.expectedUncertainty),
    boundaryStrengthField: cloneField(components.boundaryStrength),
    forecastValidationField: cloneField(components.forecastValidation),
    hiddenEventProbabilityField: cloneField(components.hiddenEventProbability),
    stalenessField: cloneField(components.staleness),
    hazardField: cloneField(components.hazard),
    recentSamplePenaltyField: cloneField(components.recentSamplePenalty),
    accessibleMask: cloneField(scenario.accessibleMask),
    samplingPriorityField: cloneField(priority.priorityField),
    priorityEventDifferenceField: cloneField(absFieldDifference(priority.priorityField, components.eventIntensity))
  };
}

function samplingPriorityExplanationHtml(panel) {
  const topCandidates = (panel.candidates ?? []).slice(0, 3);
  return `
    <section class="cell-inspector-shell" data-sampling-priority-explanation-panel>
      <div class="cell-inspector-header">
        <span>Sampling Priority / Acquisition Demo</span>
        <h2>${escapeHtml(panel.viewLayerLabel)}</h2>
        <p>${escapeHtml(panel.viewLayerCaption)}</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Event intensity is not sampling priority</span>
        <p>Event intensity says how much phenomenon is present. Sampling priority says where a measurement is useful before considering this glider's travel cost.</p>
      </div>
      <div class="cell-inspector-card">
        <span>Current Method</span>
        <p><strong>${escapeHtml(panel.method.label)}</strong>: ${escapeHtml(panel.method.description)}</p>
        <small>Formula: ${escapeHtml(panel.method.formula)}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Current Scenario</span>
        <p><strong>${escapeHtml(panel.scenario?.scenarioLabel)}</strong>: ${escapeHtml(panel.scenario?.teachingNotes)}</p>
        <small>This map shows where a measurement is useful before considering route planning or flow-coupled action value.</small>
      </div>
      <div class="cell-inspector-card">
        <span>Candidate rationale</span>
        ${topCandidates.length ? metricRows(topCandidates.map((candidate) => [
          `#${candidate.id.replace('candidate-', '')} (${candidate.x},${candidate.y})`,
          `${candidate.reason} | ${formatStat(candidate.priority)}`
        ])) : '<p>No candidate sample points available.</p>'}
      </div>
      ${panel.selectedCell ? selectedCellHtml(panel.selectedCell) : ''}
      <div class="cell-inspector-card">
        <span>What this is not</span>
        <p>Educational acquisition model, not route planning, not flow-coupled action value, not a production GP/GMRF acquisition optimizer, not calibrated data assimilation, and not an operational ocean forecast.</p>
      </div>
      <div class="cell-inspector-card">
        <span>Coming Next</span>
        <p>S2 can add Q_glider(g,x,y,t): flow-coupled action value after reachability, energy, time, risk, and vehicle state are considered.</p>
      </div>
    </section>
  `;
}

function selectedCellHtml(cell) {
  return `
    <div class="cell-inspector-card">
      <span>Selected Cell (${escapeHtml(cell.cell.col)}, ${escapeHtml(cell.cell.row)})</span>
      ${metricRows([
        ['event intensity', formatStat(cell.eventIntensity)],
        ['belief ROI', formatStat(cell.beliefRoi)],
        ['uncertainty', formatStat(cell.expectedUncertainty)],
        ['boundary', formatStat(cell.boundaryStrength)],
        ['forecast validation', formatStat(cell.forecastValidation)],
        ['hidden event', formatStat(cell.hiddenEventProbability)],
        ['staleness', formatStat(cell.staleness)],
        ['hazard', formatStat(cell.hazard)],
        ['redundancy', formatStat(cell.recentSamplePenalty)],
        ['sampling priority', formatStat(cell.samplingPriority)]
      ])}
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

function layerColor(value, viewLayer) {
  const v = clamp(Number(value) || 0, 0, 1);
  if (viewLayer === 'hazard' || viewLayer === 'recentSamplePenalty') {
    if (v < 0.25) return 0x10243b;
    if (v < 0.5) return 0x7a3e3e;
    if (v < 0.75) return 0xd95d39;
    return 0xff6b35;
  }
  if (viewLayer === 'hiddenEventProbability') {
    if (v < 0.25) return 0x101526;
    if (v < 0.5) return 0x663399;
    if (v < 0.72) return 0xc75d9b;
    return 0xffb000;
  }
  if (viewLayer === 'priorityEventDifference') {
    if (v < 0.25) return 0x10243b;
    if (v < 0.5) return 0x395b9c;
    if (v < 0.75) return 0xffc857;
    return 0xef476f;
  }
  if (viewLayer === 'samplingPriority' || viewLayer === 'candidateSamplePoints') {
    if (v < 0.25) return 0x10243b;
    if (v < 0.5) return 0x1f7a8c;
    if (v < 0.74) return 0xf4d35e;
    return 0xff7b54;
  }
  if (v < 0.22) return 0x10243b;
  if (v < 0.45) return 0x26657a;
  if (v < 0.68) return 0x63c56f;
  if (v < 0.84) return 0xf4d35e;
  return 0xff7b54;
}

function normalizeObjectivePreset(value) {
  const id = String(value ?? '').trim();
  return ['balancedScience', 'mappingFronts', 'validateForecast', 'hiddenEventFollowup', 'revisitMonitoring'].includes(id) ? id : 'balancedScience';
}

function objectivePresetPatch(preset) {
  const id = normalizeObjectivePreset(preset);
  const patches = {
    balancedScience: {
      methodId: 'balancedMission',
      weights: { value: 0.42, uncertainty: 0.42, boundary: 0.42, forecast: 0.34, unknown: 0.34, staleness: 0.34, hazard: 0.86, redundancy: 0.52, mask: 1 }
    },
    mappingFronts: {
      methodId: 'boundaryMapping',
      weights: { value: 0.18, uncertainty: 0.28, boundary: 0.95, forecast: 0.18, unknown: 0.08, staleness: 0.08, hazard: 0.72, redundancy: 0.46, mask: 1 }
    },
    validateForecast: {
      methodId: 'forecastValidation',
      weights: { value: 0.22, uncertainty: 0.28, boundary: 0.25, forecast: 0.92, unknown: 0.12, staleness: 0.08, hazard: 0.72, redundancy: 0.46, mask: 1 }
    },
    hiddenEventFollowup: {
      methodId: 'hiddenEventFollowup',
      weights: { value: 0.18, uncertainty: 0.25, boundary: 0.18, forecast: 0.2, unknown: 1, staleness: 0.08, hazard: 0.72, redundancy: 0.42, mask: 1 }
    },
    revisitMonitoring: {
      methodId: 'stalenessRevisit',
      weights: { value: 0.24, uncertainty: 0.22, boundary: 0.08, forecast: 0.08, unknown: 0.08, staleness: 1, hazard: 0.72, redundancy: 0.18, mask: 1 }
    }
  };
  return patches[id] ?? patches.balancedScience;
}
function normalizeWeightsPatch(value) {
  if (!value || typeof value !== 'object') return null;
  const weights = {};
  for (const [key, entry] of Object.entries(value)) weights[key] = Math.max(0, Number(entry) || 0);
  return weights;
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
