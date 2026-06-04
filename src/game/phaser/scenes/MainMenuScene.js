import { downloadJSON, loadJSON, readJSONFile } from '../../../core/io/ImportExport.js';
import { applyTutorialMissionConfig, loadCampaignLevel, CAMPAIGN_LEVELS } from '../../../core/campaign/CampaignLevels.js';
import { ensureLevelIdentity } from '../../../core/identity/GameInstanceId.js';
import { resetPlanResultStore } from '../../../core/evaluation/PlanResultStore.js';
import { beginScenario } from '../../../core/scenario/ScenarioState.js';
import { createDefaultScenarioConfig, generateScenarioFromConfig, regenerateScenarioFromReplayContract } from '../../../core/generation/ScenarioConfig.js';
import { CenterLeaderboardView } from '../../../ui/CenterLeaderboardView.js';
import { CenterTutorialBrowser } from '../../../ui/CenterTutorialBrowser.js';
import { buildChallengeExport } from '../../../core/io/ChallengeExporter.js';
import { buildLeaderboardExport, buildLeaderboardRecordExport } from '../../../core/io/LeaderboardExporter.js';
import { buildResultExport } from '../../../core/io/ResultExporter.js';
import { evaluateExactReplayAvailability } from '../../../core/random/ReplaySeedContract.js';
import { normalizePlan } from '../../../core/planning/WaypointPlan.js';
import {
  clearLeaderboard,
  clearLeaderboardRecord,
  deleteLeaderboardAttempt,
  getBestAttempt,
  importLeaderboard,
  loadLeaderboard
} from '../../../core/storage/LeaderboardStore.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class MainMenuScene extends PhaserScene {
  constructor() {
    super('MainMenuScene');
    this.objects = [];
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.destroyLeaderboardView();
    this.destroyTutorialBrowser();
    this.app.state.mode = 'menu';
    this.app.clearPanels();
    this.app.console?.renderIdle({ mode: 'Idle', status: 'No mission loaded' });
    this.app.waypointPanel?.renderIdle();
    this.app.agentPerformanceHud?.setHandlers({});
    this.app.summaryHud?.renderIdle();
    this.app.agentPerformanceHud?.renderIdle();
    this.app.setSceneLabel('Main Menu');
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.buttons = [];
    this.drawIdleViewport();
  }

  shutdown() {
    this.clearObjects();
    this.destroyLeaderboardView();
    this.destroyTutorialBrowser();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.drawIdleViewport();
  }

  drawIdleViewport() {
    this.clearObjects();
    const width = Math.max(1, Number(this.scale?.width ?? this.sys?.game?.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? this.sys?.game?.scale?.height ?? 820));
    const safeX = Math.max(28, Math.min(76, width * 0.08));
    const safeY = Math.max(28, Math.min(70, height * 0.1));
    const contentWidth = Math.max(260, width - safeX * 2);
    const centerX = width / 2;
    const centerY = height / 2;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x06111f, 0x0b2137, 0x08243a, 0x06111f, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(1, 0x54c7ec, 0.12);
    for (let y = safeY + 52; y < height; y += 58) {
      graphics.beginPath();
      graphics.moveTo(0, y);
      graphics.lineTo(width, y + Math.sin(y * 0.02) * 18);
      graphics.strokePath();
    }
    graphics.fillStyle(0x54c7ec, 0.08);
    graphics.fillCircle(width * 0.76, height * 0.24, Math.min(width, height) * 0.24);
    graphics.fillStyle(0x63e6be, 0.06);
    graphics.fillCircle(width * 0.68, height * 0.72, Math.min(width, height) * 0.32);

    for (let x = safeX; x < width - safeX; x += 80) {
      graphics.lineStyle(1, 0x54c7ec, 0.08);
      graphics.lineBetween(x, safeY, x, height - safeY);
    }
    for (let y = safeY; y < height - safeY; y += 80) {
      graphics.lineStyle(1, 0x54c7ec, 0.08);
      graphics.lineBetween(safeX, y, width - safeX, y);
    }
    const ringRadius = Math.min(width, height) * 0.18;
    graphics.lineStyle(3, 0x63e6be, 0.22);
    graphics.strokeCircle(centerX, centerY + 18, ringRadius);
    graphics.strokeCircle(centerX, centerY + 18, ringRadius * 1.55);
    graphics.lineStyle(2, 0x63e6be, 0.32);
    graphics.lineBetween(centerX, centerY + 18, Math.min(width - safeX, centerX + ringRadius * 1.72), Math.max(safeY, centerY - ringRadius * 0.55));
    graphics.fillStyle(0x54c7ec, 0.18);
    graphics.fillTriangle(centerX - 20, centerY - 22, centerX + 34, centerY + 88, centerX, centerY + 58);
    graphics.lineStyle(2, 0xbef6ff, 0.58);
    graphics.strokeTriangle(centerX - 20, centerY - 22, centerX + 34, centerY + 88, centerX, centerY + 58);
    this.objects.push(graphics);

    const titleY = Math.max(safeY, centerY - Math.min(210, height * 0.3));
    this.addIdleText(centerX, titleY, 'Simulator Viewport', {
      fontFamily: 'system-ui',
      fontSize: `${Math.max(22, Math.min(34, width * 0.045))}px`,
      fontStyle: '700',
      color: '#eef6ff',
      align: 'center'
    }, contentWidth);
    this.addIdleText(centerX, titleY + Math.max(42, height * 0.07), 'Awaiting Mission Launch', {
      fontFamily: 'system-ui',
      fontSize: `${Math.max(28, Math.min(52, width * 0.062))}px`,
      fontStyle: '700',
      color: '#63e6be',
      align: 'center'
    }, contentWidth);
    this.addIdleText(centerX, titleY + Math.max(104, height * 0.15), 'Choose a mode from the Mission Console to load the map, editor, or dataset tools.', {
      fontFamily: 'system-ui',
      fontSize: '17px',
      color: '#9cb4d8',
      align: 'center',
      wordWrap: { width: Math.min(560, contentWidth) }
    }, Math.min(560, contentWidth));
    this.addIdleText(centerX, height - Math.max(44, safeY * 0.85), 'Phaser viewport: map, currents, gliders, waypoints, drift cones, and simulation playback', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#7898bd',
      align: 'center',
      wordWrap: { width: contentWidth }
    }, contentWidth);
  }

  addIdleText(x, y, value, style, width) {
    const text = this.add.text(x, y, value, {
      ...style,
      wordWrap: style.wordWrap ?? { width }
    }).setOrigin(0.5, 0);
    this.objects.push(text);
    return text;
  }

  clearObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
  }

  renderMainMenu() {
    this.app.console?.renderIdle({ mode: 'Idle', status: 'No mission loaded' });
  }

  openLeaderboard() {
    this.app ??= this.sys.game.anchorApp;
    this.app.state.mode = 'leaderboard';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Leaderboard');
    this.app.summaryHud?.renderIdle?.();
    this.app.agentPerformanceHud?.setHandlers({});
    this.app.agentPerformanceHud?.renderIdle?.();
    this.clearObjects();
    this.drawIdleViewport();
    const view = new CenterLeaderboardView(this.app, {
      handlers: this.leaderboardHandlers()
    });
    this.app.leaderboardView = view;
    view.mount();
    this.renderLeaderboardControls();
  }

  openTutorialBrowser() {
    this.app ??= this.sys.game.anchorApp;
    this.app.state.mode = 'tutorialBrowser';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Tutorial Browser');
    this.app.summaryHud?.renderIdle?.();
    this.app.agentPerformanceHud?.setHandlers({});
    this.app.agentPerformanceHud?.renderIdle?.();
    this.destroyLeaderboardView();
    this.clearObjects();
    this.drawIdleViewport();
    const view = new CenterTutorialBrowser(this.app, {
      handlers: {
        start: (id) => this.startCampaignLevel(id)
      }
    });
    this.app.tutorialBrowser = view;
    view.mount();
    this.renderTutorialControls();
  }

  renderTutorialControls() {
    const view = this.app?.tutorialBrowser;
    this.app.console?.renderTutorialControls(view?.getState?.() ?? {}, {
      search: (search) => {
        view?.setSearch(search);
        this.renderTutorialControls();
      },
      difficulty: (difficulty) => {
        view?.setDifficulty(difficulty);
        this.renderTutorialControls();
      },
      status: (status) => {
        view?.setStatus(status);
        this.renderTutorialControls();
      },
      focus: (focus) => {
        view?.setFocus(focus);
        this.renderTutorialControls();
      },
      start: (id) => this.startCampaignLevel(id),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  renderLeaderboardControls() {
    const view = this.app?.leaderboardView;
    this.app.console?.renderLeaderboardControls(view?.getState?.() ?? {}, {
      filter: (filter) => {
        view?.setFilter(filter);
        this.renderLeaderboardControls();
      },
      search: (search) => {
        view?.setSearch(search);
      },
      sort: (sort) => {
        view?.setSort(sort);
        this.renderLeaderboardControls();
      },
      import: () => this.importLeaderboardJson(),
      export: () => downloadJSON('anchor.leaderboard.json', buildLeaderboardExport(loadLeaderboard())),
      clearAll: () => this.clearAllLeaderboardData(),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  leaderboardHandlers() {
    return {
      replayChallenge: (record) => this.loadLeaderboardChallenge(record, {
        withPlan: false,
        showBestPathOverlay: false,
        targetScene: 'MissionWorkspaceScene'
      }),
      showPath: (record) => this.loadLeaderboardChallenge(record, {
        withPlan: false,
        showBestPathOverlay: true,
        targetScene: 'MissionWorkspaceScene'
      }),
      hidePath: (record) => this.loadLeaderboardChallenge(record, {
        withPlan: false,
        showBestPathOverlay: false,
        targetScene: 'MissionWorkspaceScene'
      }),
      rerunPath: (record) => this.rerunLeaderboardPath(record),
      loadPathAsPlan: (record) => this.loadLeaderboardChallenge(record, {
        withPlan: true,
        showBestPathOverlay: false,
        targetScene: 'MissionWorkspaceScene',
        planSource: 'loadedFromLeaderboard',
        planNamePrefix: 'Leaderboard Saved Path'
      }),
      loadChallenge: (record) => this.loadLeaderboardChallenge(record, { withPlan: false }),
      loadBestPlan: (record) => this.loadLeaderboardChallenge(record, { withPlan: true }),
      exportPlan: (record) => this.exportLeaderboardPlan(record),
      exportLevel: (record) => this.exportLeaderboardLevel(record),
      exportResult: (record) => this.exportLeaderboardResult(record),
      exportRecord: (record) => this.exportLeaderboardRecord(record),
      deleteAttempt: (instanceId, attemptId) => this.deleteLeaderboardAttempt(instanceId, attemptId),
      clearRecord: (instanceId) => this.clearLeaderboardMapRecord(instanceId)
    };
  }

  loadLeaderboardChallenge(record, {
    withPlan = false,
    showBestPathOverlay = false,
    targetScene = null,
    planSource = 'loadedFromLeaderboard',
    planNamePrefix = 'Leaderboard Saved Path'
  } = {}) {
    const restored = restoreLeaderboardChallenge(record);
    if (!restored) {
      const replay = evaluateExactReplayAvailability(record);
      this.app.toast?.(replay.reason ?? 'This leaderboard record does not include replayable challenge data.', 'error');
      return;
    }
    const restoredRecord = { ...record, level: restored.level, mission: restored.mission };
    const best = getBestAttempt(loadLeaderboard(), record.instanceId);
    const plan = withPlan ? this.prepareLeaderboardPlan(restoredRecord, best, { planSource, planNamePrefix }) : null;
    if (withPlan && !plan) {
      this.app.toast?.('No saved plan is available for this record.', 'error');
      return;
    }
    beginScenario(this.app.state, {
      level: restored.level,
      mission: restored.mission,
      challengeMode: record.challengeMode ?? record.mode ?? 'perfectKnowledge',
      source: restored.source
    });
    resetPlanResultStore(this.app.state);
    this.app.state.ui ??= {};
    this.app.state.ui.showBestPathOverlay = Boolean(showBestPathOverlay);
    if (plan) {
      this.app.state.plan = plan;
      this.app.state.manualPlan = plan;
      this.app.state.currentPlanSource = planSource;
      this.app.state.selectedAgentId = this.app.state.mission?.agents?.[0]?.id ?? null;
      this.app.state.loadedLeaderboardPlan = {
        recordInstanceId: record.instanceId,
        attemptId: best?.attemptId ?? null,
        score: best?.score ?? null
      };
    }
    if (showBestPathOverlay) {
      this.app.toast?.(`Saved path overlay enabled for this challenge (${restored.replayMethod}).`, 'info');
    } else if (plan) {
      this.app.toast?.('Saved leaderboard path loaded as the editable plan.', 'success');
    }
    this.scene.start(targetScene ?? (withPlan ? 'MissionWorkspaceScene' : 'MissionBriefingScene'));
  }

  rerunLeaderboardPath(record) {
    const restored = restoreLeaderboardChallenge(record);
    if (!restored) {
      const replay = evaluateExactReplayAvailability(record);
      this.app.toast?.(replay.reason ?? 'This leaderboard record does not include replayable challenge data.', 'error');
      return;
    }
    const restoredRecord = { ...record, level: restored.level, mission: restored.mission };
    const best = getBestAttempt(loadLeaderboard(), record.instanceId);
    const plan = this.prepareLeaderboardPlan(restoredRecord, best, {
      planSource: 'bestPriorRerun',
      planNamePrefix: 'Leaderboard Saved Path Rerun'
    });
    if (!plan) {
      this.app.toast?.('No saved plan is available to rerun for this record.', 'error');
      return;
    }
    beginScenario(this.app.state, {
      level: restored.level,
      mission: restored.mission,
      challengeMode: record.challengeMode ?? record.mode ?? 'perfectKnowledge',
      source: restored.source
    });
    resetPlanResultStore(this.app.state);
    this.app.state.ui ??= {};
    this.app.state.ui.showBestPathOverlay = true;
    this.app.state.plan = plan;
    this.app.state.manualPlan = plan;
    this.app.state.currentPlanSource = 'bestPriorRerun';
    this.app.state.selectedAgentId = this.app.state.mission?.agents?.[0]?.id ?? null;
    this.app.state.bestPriorRerun = {
      attemptId: best?.attemptId ?? null,
      originalScore: best?.score ?? null,
      recordInstanceId: record.instanceId,
      rerunUnderSavedChallenge: true
    };
    this.app.state.pendingWorkspaceAutoExecute = {
      source: 'leaderboardSavedPath',
      attemptId: best?.attemptId ?? null
    };
    this.app.toast?.('Rerunning saved leaderboard path.', 'info');
    this.scene.start('MissionWorkspaceScene');
  }

  prepareLeaderboardPlan(record, best, { planSource, planNamePrefix } = {}) {
    const rawPlan = cloneJson(best?.plan);
    if (!rawPlan) return null;
    try {
      const plan = normalizePlan(rawPlan, record.level, record.mission);
      plan.meta ??= {};
      plan.meta.source = planSource ?? 'loadedFromLeaderboard';
      plan.meta.name = `${planNamePrefix ?? 'Leaderboard Saved Path'} (${formatScore(best?.score)})`;
      plan.meta.originalAttemptId = best?.attemptId ?? null;
      plan.meta.originalScore = best?.score ?? null;
      plan.meta.recordInstanceId = record.instanceId;
      return plan;
    } catch (error) {
      this.app.toast?.(error?.message ?? 'Saved plan could not be loaded.', 'error');
      return null;
    }
  }

  exportLeaderboardPlan(record) {
    const best = getBestAttempt(loadLeaderboard(), record?.instanceId);
    if (!best?.plan) {
      this.app.toast?.('No saved plan is available for export.', 'error');
      return;
    }
    downloadJSON(`anchor_plan_${record.instanceId}.json`, best.plan);
  }

  exportLeaderboardLevel(record) {
    if (!record?.level) {
      this.app.toast?.('No saved level is available for export.', 'error');
      return;
    }
    downloadJSON(`anchor.challenge.${record.instanceId}.json`, buildChallengeExport({
      level: record.level,
      mission: record.mission,
      challengeMode: record.challengeMode ?? record.mode,
      includeHiddenTruth: false
    }));
  }

  exportLeaderboardResult(record) {
    const best = getBestAttempt(loadLeaderboard(), record?.instanceId);
    if (!best?.result) {
      this.app.toast?.('No saved result is available for export.', 'error');
      return;
    }
    downloadJSON(`anchor.result.${record.instanceId}.json`, buildResultExport({
      level: record.level,
      mission: record.mission,
      plan: best.plan,
      result: best.result,
      label: best.label ?? 'Leaderboard Best Plan'
    }));
  }

  exportLeaderboardRecord(record) {
    if (!record?.instanceId) return;
    downloadJSON(`anchor.leaderboard-record.${record.instanceId}.json`, buildLeaderboardRecordExport(record));
  }

  deleteLeaderboardAttempt(instanceId, attemptId) {
    deleteLeaderboardAttempt(instanceId, attemptId);
    this.app.leaderboardView?.reload?.();
    this.renderLeaderboardControls();
  }

  clearLeaderboardMapRecord(instanceId) {
    if (!globalThis.confirm?.('Clear all attempts for this saved challenge?')) return;
    clearLeaderboardRecord(instanceId);
    this.app.leaderboardView?.reload?.();
    this.renderLeaderboardControls();
  }

  clearAllLeaderboardData() {
    if (!globalThis.confirm?.('Clear all local leaderboard records? This cannot be undone.')) return;
    clearLeaderboard();
    this.app.leaderboardView?.reload?.();
    this.renderLeaderboardControls();
  }

  importLeaderboardJson() {
    const input = document.getElementById('hidden-file-input');
    if (!input) {
      this.app.toast?.('File input is unavailable.', 'error');
      return;
    }
    input.value = '';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = await readJSONFile(file);
        const saved = importLeaderboard(data, { merge: true });
        if (!saved.ok) throw new Error(saved.message ?? 'Import failed');
        this.app.leaderboardView?.reload?.();
        this.renderLeaderboardControls();
        this.app.toast?.('Leaderboard JSON imported.', 'success');
      } catch (error) {
        this.app.toast?.(error?.message ?? 'Failed to import leaderboard JSON.', 'error');
      }
    };
    input.click();
  }

  destroyLeaderboardView() {
    this.app?.leaderboardView?.destroy?.();
    if (this.app) this.app.leaderboardView = null;
  }

  destroyTutorialBrowser() {
    this.app?.tutorialBrowser?.destroy?.();
    if (this.app) this.app.tutorialBrowser = null;
  }

  showCampaignList() {
    this.openTutorialBrowser();
  }

  async startCampaignLevel(id, forcedMode = null) {
    this.app ??= this.sys.game.anchorApp;
    const entry = CAMPAIGN_LEVELS.find((candidate) => candidate.id === id) ?? CAMPAIGN_LEVELS[0];
    const level = ensureLevelIdentity(await loadCampaignLevel(entry));
    const mission = applyTutorialMissionConfig(await loadJSON('missions/tutorial_sampling.json'), entry.id);
    beginScenario(this.app.state, {
      level,
      mission,
      challengeMode: forcedMode ?? level.challengeMode ?? entry.mode ?? 'perfectKnowledge',
      source: 'tutorial'
    });
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  openChallengeSetup(mode) {
    this.app ??= this.sys.game.anchorApp;
    const stochastic = mode === 'forecast';
    this.app.state.ui.revealTruth = false;
    this.app.state.ui.forecastMemberId = stochastic ? 'ensemble_mean' : null;
    this.app.state.ui.roiViewMode = stochastic ? 'expectedValue' : 'expectedValue';
    this.app.state.pendingScenarioSetup = createDefaultScenarioConfig(mode);
    this.app.state.level = null;
    this.app.state.mission = null;
    this.app.state.challengeMode = mode;
    this.app.state.currentScenario = {
      levelId: null,
      instanceId: null,
      missionId: null,
      challengeMode: mode,
      source: stochastic ? 'stochasticChallenge' : 'deterministicChallenge',
      briefingSeen: false,
      setupPending: true
    };
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  startRandomChallenge(mode) {
    this.app ??= this.sys.game.anchorApp;
    const stochastic = mode === 'forecast';
    const { level, mission } = generateScenarioFromConfig(createDefaultScenarioConfig(mode));
    this.app.state.ui.revealTruth = false;
    this.app.state.ui.forecastMemberId = stochastic ? 'ensemble_mean' : null;
    this.app.state.ui.roiViewMode = 'expectedValue';
    beginScenario(this.app.state, {
      level,
      mission,
      challengeMode: mode,
      source: stochastic ? 'stochasticChallenge' : 'deterministicChallenge'
    });
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  destroyMenuButtons() {
    this.buttons?.forEach((button) => button.destroy());
    this.buttons = [];
  }
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function restoreLeaderboardChallenge(record) {
  if (record?.level && record?.mission) {
    return {
      level: cloneJson(record.level),
      mission: cloneJson(record.mission),
      source: 'leaderboard',
      replayMethod: 'snapshot'
    };
  }
  const replay = evaluateExactReplayAvailability(record);
  if (!replay.available || replay.method !== 'regeneration') return null;
  const regenerated = regenerateScenarioFromReplayContract(record);
  if (!regenerated?.level || !regenerated?.mission) return null;
  return {
    level: regenerated.level,
    mission: regenerated.mission,
    source: 'leaderboardRegenerated',
    replayMethod: 'regeneration'
  };
}

function formatScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : 'N/A';
}
