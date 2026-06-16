import {
  createFlowCoupledSamplingScenario,
  flowCoupledSamplingScenarioLabel,
  normalizeFlowCoupledSamplingScenarioId
} from '../../../core/demo/flowCoupledSampling/FlowCoupledSamplingScenarios.js';
import {
  computeGliderActionValue,
  defaultGliderActionWeights,
  explainGliderActionMethod,
  gliderActionMethodLabel,
  normalizeGliderActionMethodId
} from '../../../core/demo/flowCoupledSampling/GliderActionValueModel.js';
import {
  generateGliderActionCandidates,
  gliderActionCandidateModeLabel,
  normalizeGliderActionCandidateMode
} from '../../../core/demo/flowCoupledSampling/GliderActionCandidates.js';
import {
  fieldStats,
  normalizeField
} from '../../../core/demo/flowCoupledSampling/FlowCoupledSamplingFieldMath.js';
import { validateGliderActionValueResult } from '../../../core/demo/flowCoupledSampling/FlowCoupledSamplingValidation.js';
import { buildDemoArtifactEnvelope, cloneField, demoArtifactFilename, normalizeDemoExportSettings, validateDemoExportSettings } from '../../../core/io/DemoArtifactExporter.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const FLOW_COUPLED_SAMPLING_DEMO_GRID = { width: 30, height: 20 };
export const FLOW_COUPLED_SAMPLING_VIEW_LAYERS = [
  'globalSciencePriority',
  'futurePriority',
  'flowField',
  'currentAssist',
  'currentOpposition',
  'crossCurrentRisk',
  'travelDistance',
  'arrivalTime',
  'energyCost',
  'reachableMask',
  'hazardPenalty',
  'redundancyPenalty',
  'gliderActionValue',
  'candidateTargets',
  'priorityActionDifference'
];

export class FlowCoupledSamplingDemoScene extends PhaserScene {
  constructor() {
    super('FlowCoupledSamplingDemoScene');
    this.objects = [];
    this.candidateLabels = [];
    this.seed = 'anchor-flow-coupled-sampling-demo';
    this.scenarioId = 'currentOpposedTarget';
    this.methodId = 'balancedActionValue';
    this.viewLayer = 'gliderActionValue';
    this.candidateMode = 'reachableTopK';
    this.candidateCount = 6;
    this.minDistance = 3;
    this.selectedGliderId = 'glider-a';
    this.gliderSpeed = null;
    this.timeBudget = null;
    this.energyBudget = null;
    this.weights = null;
    this.showFlowArrows = true;
    this.demoTime = 0;
    this.selectedCell = null;
    this.exportMode = 'currentFrame';
    this.exportStartTime = 0;
    this.exportEndTime = 120;
    this.exportFrameCount = 1;
  }

  init(data = {}) {
    this.seed = String(data.seed ?? 'anchor-flow-coupled-sampling-demo');
    this.scenarioId = normalizeFlowCoupledSamplingScenarioId(data.scenarioId ?? 'currentOpposedTarget');
    this.methodId = normalizeGliderActionMethodId(data.methodId ?? data.method ?? 'balancedActionValue');
    this.viewLayer = normalizeFlowCoupledSamplingViewLayer(data.viewLayer ?? data.viewMode ?? 'gliderActionValue');
    this.candidateMode = normalizeGliderActionCandidateMode(data.candidateMode ?? 'reachableTopK');
    this.candidateCount = Math.max(1, Math.min(16, Math.round(finiteNumber(data.candidateCount, 6))));
    this.minDistance = clamp(finiteNumber(data.minDistance, 3), 1, 8);
    this.selectedGliderId = String(data.selectedGliderId ?? 'glider-a');
    this.gliderSpeed = optionalNumber(data.gliderSpeed);
    this.timeBudget = optionalNumber(data.timeBudget);
    this.energyBudget = data.energyBudget == null ? null : clamp(finiteNumber(data.energyBudget, 0.82), 0.05, 1);
    this.weights = normalizeWeightsPatch(data.weights);
    this.showFlowArrows = data.showFlowArrows !== false;
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
    this.app.state.mode = 'flowCoupledSamplingDemo';
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
    return 'Flow-Coupled Sampling Demo';
  }

  subtitle() {
    return 'Glider-specific action value Q_glider(g,x,y,t): A_global adjusted by direct-leg currents, reachability, energy, timing, hazards, and redundancy.';
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
      selectedGliderId: this.selectedGliderId,
      gliderSpeed: this.currentGlider()?.speed,
      timeBudget: this.effectiveTimeBudget(),
      energyBudget: this.effectiveEnergyBudget(),
      weights: this.effectiveWeights(),
      showFlowArrows: this.showFlowArrows,
      demoTime: this.demoTime,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount,
      selectedCell: this.selectedCell,
      ...overrides
    };
  }

  currentGlider() {
    const source = (this.scenario?.gliders ?? []).find((glider) => glider.id === this.selectedGliderId)
      ?? this.scenario?.gliders?.[0]
      ?? { id: 'glider-a', x: 0, y: 0, speed: 2, timeBudget: 12, energyBudget: 0.82 };
    return {
      ...source,
      speed: this.gliderSpeed == null ? source.speed : Math.max(0.05, this.gliderSpeed),
      timeBudget: this.timeBudget == null ? source.timeBudget : Math.max(0.1, this.timeBudget),
      energyBudget: this.energyBudget == null ? source.energyBudget : clamp(this.energyBudget, 0.05, 1)
    };
  }

  effectiveTimeBudget() {
    return this.currentGlider()?.timeBudget ?? 12;
  }

  effectiveEnergyBudget() {
    return this.currentGlider()?.energyBudget ?? 0.82;
  }

  effectiveWeights() {
    return {
      ...defaultGliderActionWeights(this.methodId, { scenarioId: this.scenarioId }),
      ...(this.weights ?? {})
    };
  }

  rebuildModel() {
    this.scenario = createFlowCoupledSamplingScenario({
      grid: FLOW_COUPLED_SAMPLING_DEMO_GRID,
      seed: this.seed,
      scenarioId: this.scenarioId,
      time: this.demoTime
    });
    if (!this.scenario.gliders.some((glider) => glider.id === this.selectedGliderId)) {
      this.selectedGliderId = this.scenario.selectedGliderId ?? this.scenario.gliders[0]?.id ?? 'glider-a';
    }
    const glider = this.currentGlider();
    this.actionResult = computeGliderActionValue({
      scenario: this.scenario,
      selectedGliderId: this.selectedGliderId,
      glider,
      methodId: this.methodId,
      weights: this.effectiveWeights(),
      timeBudget: glider.timeBudget,
      energyBudget: glider.energyBudget
    });
    this.candidateTargets = generateGliderActionCandidates({
      actionValueField: this.actionResult.actionValueField,
      components: this.actionResult.components,
      glider,
      candidateMode: this.candidateMode,
      candidateCount: this.candidateCount,
      minDistance: this.minDistance,
      accessibleMask: this.actionResult.components.accessibleMask,
      reachableMask: this.actionResult.components.reachableMask
    });
    this.validation = validateGliderActionValueResult({
      ...this.actionResult,
      scenario: this.scenario,
      candidateTargets: this.candidateTargets,
      candidateMode: this.candidateMode
    });
    this.field = this.fieldForLayer(this.viewLayer);
    this.stats = fieldStats(this.field);
    this.refreshDebugObject();
  }

  fieldForLayer(layer) {
    const components = this.actionResult?.components ?? {};
    const flowSpeed = flowSpeedField(this.scenario?.flowField);
    const difference = absFieldDifference(this.actionResult?.actionValueField, components.globalPriority);
    const map = {
      globalSciencePriority: components.globalPriority,
      futurePriority: components.futurePriority,
      flowField: flowSpeed,
      currentAssist: components.currentAssist,
      currentOpposition: components.currentOpposition,
      crossCurrentRisk: components.crossCurrentRisk,
      travelDistance: components.travelDistance,
      arrivalTime: components.arrivalTime,
      energyCost: components.energyCost,
      reachableMask: components.reachableMask,
      hazardPenalty: components.hazardPenalty,
      redundancyPenalty: components.redundancyPenalty,
      gliderActionValue: this.actionResult?.actionValueField,
      candidateTargets: this.actionResult?.actionValueField,
      priorityActionDifference: difference
    };
    return map[normalizeFlowCoupledSamplingViewLayer(layer)] ?? this.actionResult?.actionValueField;
  }

  renderConsole() {
    this.app.console?.renderFlowCoupledSamplingDemoControls?.({
      title: this.title(),
      status: `${flowCoupledSamplingViewLayerLabel(this.viewLayer)} layer`,
      seed: this.seed,
      scenarioId: this.scenarioId,
      scenarioLabel: flowCoupledSamplingScenarioLabel(this.scenarioId),
      scenarioNote: this.scenario?.teachingNotes,
      methodId: this.methodId,
      methodLabel: gliderActionMethodLabel(this.methodId),
      methodExplanation: explainGliderActionMethod(this.methodId),
      viewLayer: this.viewLayer,
      viewLayerLabel: flowCoupledSamplingViewLayerLabel(this.viewLayer),
      viewLayerCaption: flowCoupledSamplingLayerCaption(this.viewLayer),
      candidateMode: this.candidateMode,
      candidateModeLabel: gliderActionCandidateModeLabel(this.candidateMode),
      candidateCount: this.candidateCount,
      minDistance: this.minDistance,
      selectedGliderId: this.selectedGliderId,
      gliders: this.scenario?.gliders ?? [],
      glider: this.currentGlider(),
      gliderSpeed: this.currentGlider()?.speed,
      timeBudget: this.effectiveTimeBudget(),
      energyBudget: this.effectiveEnergyBudget(),
      weights: this.effectiveWeights(),
      showFlowArrows: this.showFlowArrows,
      stats: this.stats,
      candidateTargets: this.candidateTargets,
      validation: this.validation,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount
    }, {
      scenarioId: (scenarioId) => this.restartWith({ scenarioId: normalizeFlowCoupledSamplingScenarioId(scenarioId), selectedCell: null, weights: null, gliderSpeed: null, timeBudget: null, energyBudget: null }),
      methodId: (methodId) => this.patchControls({ methodId: normalizeGliderActionMethodId(methodId), weights: null }),
      viewLayer: (viewLayer) => this.patchControls({ viewLayer: normalizeFlowCoupledSamplingViewLayer(viewLayer) }),
      candidateMode: (candidateMode) => this.patchControls({ candidateMode: normalizeGliderActionCandidateMode(candidateMode) }),
      candidateCount: (candidateCount) => this.patchControls({ candidateCount: Math.max(1, Math.min(16, Math.round(Number(candidateCount) || 6))) }),
      minDistance: (minDistance) => this.patchControls({ minDistance: clamp(Number(minDistance), 1, 8) }),
      selectedGliderId: (selectedGliderId) => this.patchControls({ selectedGliderId: String(selectedGliderId), gliderSpeed: null, timeBudget: null, energyBudget: null }),
      gliderSpeed: (speed) => this.patchControls({ gliderSpeed: clamp(Number(speed), 0.2, 5) }),
      timeBudget: (budget) => this.patchControls({ timeBudget: clamp(Number(budget), 1, 30) }),
      energyBudget: (budget) => this.patchControls({ energyBudget: clamp(Number(budget), 0.05, 1) }),
      seed: (seed) => this.restartWith({ seed: String(seed ?? '').trim() || 'anchor-flow-coupled-sampling-demo', selectedCell: null }),
      showFlowArrows: (checked) => this.patchControls({ showFlowArrows: Boolean(checked) }),
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

  resetDemoState() {
    this.seed = 'anchor-flow-coupled-sampling-demo';
    this.scenarioId = 'currentOpposedTarget';
    this.methodId = 'balancedActionValue';
    this.viewLayer = 'gliderActionValue';
    this.candidateMode = 'reachableTopK';
    this.candidateCount = 6;
    this.minDistance = 3;
    this.selectedGliderId = 'glider-a';
    this.gliderSpeed = null;
    this.timeBudget = null;
    this.energyBudget = null;
    this.weights = null;
    this.showFlowArrows = true;
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
      wordWrap: { width: 900 }
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
    if (this.showFlowArrows || this.viewLayer === 'flowField') this.drawFlowArrows(layout.map);
    this.drawGliders(layout.map);
    this.drawCandidates(layout.map);
    this.drawSelectedCell(layout.map);
    this.layoutText(layout);
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x07101d, 0x12243a, 0x142d2d, 0x07101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x081827, 0.96);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x7ce6bd, 0.5);
    this.graphics.strokeRoundedRect(map.x, map.y, map.width, map.height, 8);
  }

  drawHeatmap(map) {
    const width = this.scenario.width;
    const height = this.scenario.height;
    const cellW = map.width / width;
    const cellH = map.height / height;
    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const value = Number(this.field[row]?.[col] ?? 0);
        this.graphics.fillStyle(layerColor(value, this.viewLayer), 0.18 + clamp(value, 0, 1) * 0.76);
        this.graphics.fillRect(map.x + col * cellW, map.y + row * cellH, cellW + 1, cellH + 1);
      }
    }
    this.graphics.lineStyle(1, 0x26344f, 0.22);
    for (let col = 0; col <= width; col += 1) this.graphics.lineBetween(map.x + col * cellW, map.y, map.x + col * cellW, map.y + map.height);
    for (let row = 0; row <= height; row += 1) this.graphics.lineBetween(map.x, map.y + row * cellH, map.x + map.width, map.y + row * cellH);
  }

  drawFlowArrows(map) {
    const cellW = map.width / this.scenario.width;
    const cellH = map.height / this.scenario.height;
    const step = Math.max(2, Math.round(this.scenario.width / 10));
    for (let row = 1; row < this.scenario.height; row += step) {
      for (let col = 1; col < this.scenario.width; col += step) {
        const vector = this.scenario.flowField?.[row]?.[col] ?? { u: 0, v: 0 };
        const magnitude = Math.hypot(Number(vector.u) || 0, Number(vector.v) || 0);
        if (magnitude <= 0.01) continue;
        const cx = map.x + (col + 0.5) * cellW;
        const cy = map.y + (row + 0.5) * cellH;
        const length = Math.min(cellW, cellH) * (0.72 + Math.min(1, magnitude) * 0.9);
        const dx = ((Number(vector.u) || 0) / magnitude) * length;
        const dy = ((Number(vector.v) || 0) / magnitude) * length;
        this.graphics.lineStyle(1.7, 0xffffff, 0.72);
        this.graphics.lineBetween(cx - dx * 0.45, cy - dy * 0.45, cx + dx * 0.45, cy + dy * 0.45);
        this.graphics.fillStyle(0xffffff, 0.78);
        this.graphics.fillCircle(cx + dx * 0.45, cy + dy * 0.45, Math.max(2, Math.min(cellW, cellH) * 0.08));
      }
    }
  }

  drawGliders(map) {
    const cellW = map.width / this.scenario.width;
    const cellH = map.height / this.scenario.height;
    for (const glider of this.scenario.gliders ?? []) {
      const isSelected = glider.id === this.selectedGliderId;
      const color = parseColor(glider.color, isSelected ? 0x65d2ff : 0xffd166);
      const cx = map.x + Number(glider.x ?? 0) * cellW;
      const cy = map.y + Number(glider.y ?? 0) * cellH;
      this.graphics.fillStyle(0x061421, 0.84);
      this.graphics.fillCircle(cx, cy, isSelected ? 13 : 10);
      this.graphics.lineStyle(isSelected ? 4 : 2, color, 0.96);
      this.graphics.strokeCircle(cx, cy, isSelected ? 13 : 10);
      this.graphics.lineStyle(2, color, 0.82);
      this.graphics.lineBetween(cx - 10, cy, cx + 10, cy);
      this.graphics.lineBetween(cx, cy - 10, cx, cy + 10);
    }
  }

  drawCandidates(map) {
    const cellW = map.width / this.scenario.width;
    const cellH = map.height / this.scenario.height;
    for (const [index, candidate] of this.candidateTargets.entries()) {
      const cx = map.x + (candidate.x + 0.5) * cellW;
      const cy = map.y + (candidate.y + 0.5) * cellH;
      const radius = Math.max(8, Math.min(cellW, cellH) * 0.36);
      this.graphics.lineStyle(3, candidate.reachable && candidate.accessible ? 0xffffff : 0xff6b6b, 0.95);
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
    this.subtitleText?.setWordWrapWidth(Math.min(980, map.width));
    this.statusText?.setText(`Scenario: ${flowCoupledSamplingScenarioLabel(this.scenarioId)} | Method: ${gliderActionMethodLabel(this.methodId)} | View: ${flowCoupledSamplingViewLayerLabel(this.viewLayer)} | Glider: ${this.selectedGliderId} | Candidates: ${this.candidateTargets.length} | Validation: ${this.validation?.status ?? 'n/a'} | Mean ${formatStat(this.stats?.mean)} | Max ${formatStat(this.stats?.max)}`);
    this.statusText?.setWordWrapWidth(Math.min(1120, map.width));
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
    root.innerHTML = flowCoupledSamplingExplanationHtml({
      scenario: this.scenario,
      method: explainGliderActionMethod(this.methodId),
      viewLayer: this.viewLayer,
      viewLayerLabel: flowCoupledSamplingViewLayerLabel(this.viewLayer),
      viewLayerCaption: flowCoupledSamplingLayerCaption(this.viewLayer),
      candidates: this.candidateTargets,
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
    const components = this.actionResult?.components ?? {};
    const layer = (field) => Number(field?.[cell.row]?.[cell.col] ?? 0);
    return {
      cell,
      globalPriority: layer(components.globalPriority),
      futurePriority: layer(components.futurePriority),
      currentAssist: layer(components.currentAssist),
      currentOpposition: layer(components.currentOpposition),
      crossCurrentRisk: layer(components.crossCurrentRisk),
      travelDistance: layer(components.travelDistance),
      arrivalTime: layer(components.arrivalTime),
      energyCost: layer(components.energyCost),
      hazardPenalty: layer(components.hazardPenalty),
      missedWindowPenalty: layer(components.missedWindowPenalty),
      redundancyPenalty: layer(components.redundancyPenalty),
      reachable: layer(components.reachableMask),
      actionValue: layer(this.actionResult?.actionValueField)
    };
  }

  exportDemoJson() {
    const errors = validateDemoExportSettings(this.exportSettings(), this.demoTime);
    if (errors.length) {
      this.app?.toast?.(errors[0], 'warning');
      return;
    }
    const artifact = this.buildDemoArtifactExport();
    downloadJSON(demoArtifactFilename('flow-coupled-sampling', { kind: artifact.timeSampling?.kind }), artifact);
    this.app?.toast?.('Flow-Coupled Sampling Demo JSON exported.', 'success');
  }

  buildDemoArtifactExport() {
    const sampling = this.demoExportSampling();
    const currentFrame = this.buildDemoArtifactFrame(this.demoTime, null);
    const frames = sampling.timesSeconds.map((time, index) => this.buildDemoArtifactFrame(time, index));
    return buildDemoArtifactEnvelope({
      type: 'anchor.demo.flow-coupled-sampling',
      demo: this.title(),
      grid: FLOW_COUPLED_SAMPLING_DEMO_GRID,
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
      flowCoupledSamplingModel: this.flowCoupledSamplingModelMetadata(),
      gliderActionContext: this.gliderActionContext(),
      candidateTargets: this.candidateTargets,
      actionValueDiagnostics: this.actionValueDiagnostics(),
      metadata: {
        coordinateConvention: 'Row-major arrays indexed fields[layer][row][col]; values represent cell centers on the flow-coupled sampling demo grid.',
        sciencePriorityNotActionValue: true,
        notA: 'Educational flow-coupled action-value model, not full route planning, not optimal path planning, not mission scoring, not calibrated glider dynamics, not calibrated ocean forecast, and not a production vehicle controller.'
      }
    });
  }

  buildDemoArtifactFrame(demoTime, index) {
    const scenario = createFlowCoupledSamplingScenario({
      grid: FLOW_COUPLED_SAMPLING_DEMO_GRID,
      seed: this.seed,
      scenarioId: this.scenarioId,
      time: demoTime
    });
    const glider = {
      ...((scenario.gliders ?? []).find((entry) => entry.id === this.selectedGliderId) ?? scenario.gliders?.[0]),
      speed: this.currentGlider()?.speed,
      timeBudget: this.effectiveTimeBudget(),
      energyBudget: this.effectiveEnergyBudget()
    };
    const action = computeGliderActionValue({
      scenario,
      selectedGliderId: this.selectedGliderId,
      glider,
      methodId: this.methodId,
      weights: this.effectiveWeights(),
      timeBudget: glider.timeBudget,
      energyBudget: glider.energyBudget
    });
    const candidateTargets = generateGliderActionCandidates({
      actionValueField: action.actionValueField,
      components: action.components,
      glider,
      candidateMode: this.candidateMode,
      candidateCount: this.candidateCount,
      minDistance: this.minDistance,
      accessibleMask: action.components.accessibleMask,
      reachableMask: action.components.reachableMask
    });
    return {
      index,
      timeSeconds: demoTime,
      demoTimeSeconds: demoTime,
      fields: exportFields(action, scenario),
      candidateTargets
    };
  }

  flowCoupledSamplingModelMetadata() {
    return {
      version: this.actionResult?.version,
      scenarioId: this.scenarioId,
      scenarioLabel: flowCoupledSamplingScenarioLabel(this.scenarioId),
      methodId: this.methodId,
      methodLabel: gliderActionMethodLabel(this.methodId),
      candidateMode: this.candidateMode,
      weights: this.effectiveWeights(),
      formula: this.actionResult?.formula,
      claimLevel: 'educational_flow_coupled_action_value_model',
      notA: this.actionResult?.notA,
      usesFlowCoupling: true,
      usesRoutePlanning: false,
      usesMissionScoring: false
    };
  }

  gliderActionContext() {
    return {
      selectedGliderId: this.selectedGliderId,
      gliders: this.scenario?.gliders ?? [],
      gliderSpeed: this.currentGlider()?.speed,
      timeBudget: this.effectiveTimeBudget(),
      energyBudget: this.effectiveEnergyBudget()
    };
  }

  actionValueDiagnostics() {
    return {
      validationStatus: this.validation?.status,
      validationChecks: this.validation?.checks,
      stats: this.actionResult?.diagnostics?.stats,
      topActionPoint: this.actionResult?.diagnostics?.topActionPoint,
      sciencePriorityNotActionValue: true,
      usesFlowCoupling: true,
      usesRoutePlanning: false
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
    const stats = this.actionResult?.diagnostics?.stats ?? {};
    globalThis.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG = {
      version: this.actionResult?.version,
      scenarioId: this.scenarioId,
      scenarioLabel: flowCoupledSamplingScenarioLabel(this.scenarioId),
      methodId: this.methodId,
      methodLabel: gliderActionMethodLabel(this.methodId),
      candidateMode: this.candidateMode,
      viewLayer: this.viewLayer,
      selectedGliderId: this.selectedGliderId,
      gliders: this.scenario?.gliders ?? [],
      weights: this.effectiveWeights(),
      candidateCount: this.candidateCount,
      minDistance: this.minDistance,
      timeBudget: this.effectiveTimeBudget(),
      energyBudget: this.effectiveEnergyBudget(),
      globalPriorityStats: stats.globalPriority,
      futurePriorityStats: stats.futurePriority,
      flowStats: fieldStats(flowSpeedField(this.scenario?.flowField)),
      currentAssistStats: stats.currentAssist,
      currentOppositionStats: stats.currentOpposition,
      crossCurrentRiskStats: stats.crossCurrentRisk,
      arrivalTimeStats: stats.arrivalTime,
      energyCostStats: stats.energyCost,
      reachableStats: stats.reachableMask,
      hazardStats: stats.hazardPenalty,
      redundancyStats: stats.redundancyPenalty,
      actionValueStats: stats.actionValue,
      candidateTargets: this.candidateTargets,
      validationStatus: this.validation?.status,
      validationChecks: this.validation?.checks,
      usesFlowCoupling: true,
      usesRoutePlanning: false,
      usesMissionScoring: false,
      usesProductionDynamics: false
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

export function normalizeFlowCoupledSamplingViewLayer(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    global: 'globalSciencePriority',
    priority: 'globalSciencePriority',
    future: 'futurePriority',
    flow: 'flowField',
    assist: 'currentAssist',
    opposition: 'currentOpposition',
    cross: 'crossCurrentRisk',
    distance: 'travelDistance',
    time: 'arrivalTime',
    energy: 'energyCost',
    reachable: 'reachableMask',
    hazard: 'hazardPenalty',
    redundancy: 'redundancyPenalty',
    action: 'gliderActionValue',
    q: 'gliderActionValue',
    candidates: 'candidateTargets',
    difference: 'priorityActionDifference'
  };
  const normalized = aliases[value] ?? value;
  return FLOW_COUPLED_SAMPLING_VIEW_LAYERS.includes(normalized) ? normalized : 'gliderActionValue';
}

export function flowCoupledSamplingViewLayerLabel(id) {
  return {
    globalSciencePriority: 'Global Science Priority A_global',
    futurePriority: 'Future Priority',
    flowField: 'Flow Field F(x,y,t)',
    currentAssist: 'Current Assist',
    currentOpposition: 'Current Opposition',
    crossCurrentRisk: 'Cross-Current Risk',
    travelDistance: 'Travel Distance',
    arrivalTime: 'Arrival Time',
    energyCost: 'Energy Cost',
    reachableMask: 'Reachable Mask',
    hazardPenalty: 'Hazard / Constraint Penalty',
    redundancyPenalty: 'Redundancy Penalty',
    gliderActionValue: 'Glider Action Value Q_glider',
    candidateTargets: 'Candidate Targets',
    priorityActionDifference: 'Priority vs Action Difference'
  }[normalizeFlowCoupledSamplingViewLayer(id)] ?? 'Glider Action Value Q_glider';
}

export function flowCoupledSamplingLayerCaption(id) {
  return {
    globalSciencePriority: 'High value means a measurement is scientifically useful before considering any glider.',
    futurePriority: 'High value means science value expected at arrival or downstream intercept time.',
    flowField: 'High value means stronger current magnitude; arrows show flow direction.',
    currentAssist: 'High value means current helps the selected glider travel toward that target.',
    currentOpposition: 'High value means current opposes the direct target leg.',
    crossCurrentRisk: 'High value means lateral current can push the glider sideways across the direct leg.',
    travelDistance: 'High value means the target is farther from the selected glider.',
    arrivalTime: 'High value means longer estimated direct-leg arrival time.',
    energyCost: 'High value means more estimated energy cost from distance, opposition, and cross-current.',
    reachableMask: 'Bright cells are reachable within the current time, energy, and accessibility limits.',
    hazardPenalty: 'High value marks constraints or hazards that suppress action value.',
    redundancyPenalty: 'High value marks recent samples or cells another glider is already close to covering.',
    gliderActionValue: 'High value means this scientifically useful location is a good direct target for this specific glider now.',
    candidateTargets: 'Numbered markers are direct-leg candidate targets ranked from Q_glider, not a route plan.',
    priorityActionDifference: 'High value means global science priority differs strongly from glider-specific action value.'
  }[normalizeFlowCoupledSamplingViewLayer(id)] ?? 'High value means more of the selected flow-coupled sampling layer.';
}

function exportFields(action, scenario) {
  const components = action.components ?? {};
  const flow = flowComponents(scenario.flowField);
  return {
    globalPriorityField: cloneField(components.globalPriority),
    futurePriorityField: cloneField(components.futurePriority),
    flowU: cloneField(flow.u),
    flowV: cloneField(flow.v),
    currentAssistField: cloneField(components.currentAssist),
    currentOppositionField: cloneField(components.currentOpposition),
    crossCurrentRiskField: cloneField(components.crossCurrentRisk),
    travelDistanceField: cloneField(components.travelDistance),
    arrivalTimeField: cloneField(components.arrivalTime),
    energyCostField: cloneField(components.energyCost),
    reachableMask: cloneField(components.reachableMask),
    hazardField: cloneField(components.hazardPenalty),
    redundancyPenaltyField: cloneField(components.redundancyPenalty),
    actionValueField: cloneField(action.actionValueField)
  };
}

function flowCoupledSamplingExplanationHtml(panel) {
  const topCandidates = (panel.candidates ?? []).slice(0, 3);
  return `
    <section class="cell-inspector-shell" data-flow-coupled-sampling-explanation-panel>
      <div class="cell-inspector-header">
        <span>Flow-Coupled Sampling / Glider Action Value</span>
        <h2>${escapeHtml(panel.viewLayerLabel)}</h2>
        <p>${escapeHtml(panel.viewLayerCaption)}</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Science priority is not action value</span>
        <p>A_global says where a sample is scientifically useful. Q_glider says whether that target is a good direct action for this specific glider now.</p>
      </div>
      <div class="cell-inspector-card">
        <span>Current Method</span>
        <p><strong>${escapeHtml(panel.method.label)}</strong>: ${escapeHtml(panel.method.description)}</p>
        <small>Formula: ${escapeHtml(panel.method.formula)}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Core idea</span>
        <p>${escapeHtml(panel.method.coreIdea)}</p>
        <small>This map uses flow/current assist and opposition, direct-leg reachability, energy, timing, hazards, and redundancy.</small>
      </div>
      <div class="cell-inspector-card">
        <span>Current Scenario</span>
        <p><strong>${escapeHtml(panel.scenario?.scenarioLabel)}</strong>: ${escapeHtml(panel.scenario?.teachingNotes)}</p>
        <small>Educational synthetic scenario, not a calibrated ocean forecast.</small>
      </div>
      <div class="cell-inspector-card">
        <span>Candidate rationale</span>
        ${topCandidates.length ? metricRows(topCandidates.map((candidate) => [
          `#${candidate.id.replace('candidate-', '')} (${candidate.x},${candidate.y})`,
          `${candidate.reason} | Q ${formatStat(candidate.actionValue)}`
        ])) : '<p>No candidate targets available.</p>'}
      </div>
      ${panel.selectedCell ? selectedCellHtml(panel.selectedCell) : ''}
      <div class="cell-inspector-card">
        <span>What this is not</span>
        <p>Not full route planning. Not optimal path planning. Not MPC, A*, Dijkstra, RRT, reinforcement learning, mission scoring, calibrated glider dynamics, calibrated ocean forecast, or a production vehicle controller.</p>
      </div>
      <div class="cell-inspector-card">
        <span>Callouts</span>
        <p>A good science target can be a bad glider action. Flow can help, oppose, or push sideways.</p>
      </div>
    </section>
  `;
}

function selectedCellHtml(cell) {
  return `
    <div class="cell-inspector-card">
      <span>Selected Cell (${escapeHtml(cell.cell.col)}, ${escapeHtml(cell.cell.row)})</span>
      ${metricRows([
        ['A_global', formatStat(cell.globalPriority)],
        ['future priority', formatStat(cell.futurePriority)],
        ['current assist', formatStat(cell.currentAssist)],
        ['current opposition', formatStat(cell.currentOpposition)],
        ['cross-current risk', formatStat(cell.crossCurrentRisk)],
        ['arrival time', formatStat(cell.arrivalTime)],
        ['energy cost', formatStat(cell.energyCost)],
        ['hazard', formatStat(cell.hazardPenalty)],
        ['redundancy', formatStat(cell.redundancyPenalty)],
        ['reachable', formatStat(cell.reachable)],
        ['Q_glider', formatStat(cell.actionValue)]
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
  if (['hazardPenalty', 'redundancyPenalty', 'currentOpposition', 'crossCurrentRisk'].includes(viewLayer)) {
    if (v < 0.25) return 0x10243b;
    if (v < 0.5) return 0x7a3e3e;
    if (v < 0.75) return 0xd95d39;
    return 0xff6b35;
  }
  if (viewLayer === 'reachableMask') return v > 0.5 ? 0x65d2a8 : 0x2a3348;
  if (viewLayer === 'priorityActionDifference') {
    if (v < 0.25) return 0x10243b;
    if (v < 0.5) return 0x395b9c;
    if (v < 0.75) return 0xffc857;
    return 0xef476f;
  }
  if (viewLayer === 'gliderActionValue' || viewLayer === 'candidateTargets') {
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

function flowSpeedField(flowField) {
  if (!Array.isArray(flowField) || !flowField.length) return [[0]];
  return normalizeField(flowField.map((row) => row.map((cell) => Math.hypot(Number(cell?.u) || 0, Number(cell?.v) || 0))));
}

function flowComponents(flowField) {
  const height = Array.isArray(flowField) ? flowField.length : 0;
  const width = Array.isArray(flowField?.[0]) ? flowField[0].length : 0;
  return {
    u: Array.from({ length: height }, (_row, row) => Array.from({ length: width }, (_col, col) => Number(flowField[row]?.[col]?.u) || 0)),
    v: Array.from({ length: height }, (_row, row) => Array.from({ length: width }, (_col, col) => Number(flowField[row]?.[col]?.v) || 0))
  };
}

function absFieldDifference(a, b) {
  const height = Math.max(Array.isArray(a) ? a.length : 0, Array.isArray(b) ? b.length : 0, 1);
  const width = Math.max(Array.isArray(a?.[0]) ? a[0].length : 0, Array.isArray(b?.[0]) ? b[0].length : 0, 1);
  return Array.from({ length: height }, (_row, row) => Array.from({ length: width }, (_col, col) => clamp(Math.abs(Number(a?.[row]?.[col] ?? 0) - Number(b?.[row]?.[col] ?? 0)), 0, 1)));
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

function optionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

function parseColor(value, fallback) {
  const text = String(value ?? '').replace('#', '');
  const parsed = Number.parseInt(text, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
