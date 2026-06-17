import { createBenchmarkModeConfig, benchmarkModeSummary } from '../../../core/benchmark/BenchmarkModeContract.js';
import { createBenchmarkModeState } from '../../../core/benchmark/BenchmarkModeState.js';
import {
  adaptiveBenchmarkExportFilename,
  benchmarkEpisodeConfigFilename,
  benchmarkModeConfigFilename,
  buildAdaptiveManagerConfigExport,
  buildAdaptiveManagerPreviewExport,
  buildAdaptiveManagerStateExport,
  buildAdaptiveLaunchConfigExport,
  buildAdaptiveObjectiveTransitionExport,
  buildAdaptiveSurfacingEventExport,
  buildBenchmarkEpisodeConfigExport,
  buildBenchmarkModeConfigExport
} from '../../../core/benchmark/BenchmarkModeExporter.js';
import { createBenchmarkEpisodeConfig, createBenchmarkEpisodeState, BENCHMARK_ATTEMPT_SOURCE_IDS, BENCHMARK_EPISODE_CONTRACT_VERSION } from '../../../core/benchmark/BenchmarkEpisodeContract.js';
import { BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION } from '../../../core/benchmark/BenchmarkRouteExecutionRecord.js';
import { BENCHMARK_RUN_RECORD_VERSION } from '../../../core/benchmark/BenchmarkRunRecord.js';
import { missionObjectiveOptions } from '../../../core/benchmark/MissionObjectiveTaxonomy.js';
import { createAdaptiveContinueLegPayload, openAdaptiveBenchmarkSetup, openPlannerBenchmarkSetup } from '../../../core/benchmark/BenchmarkLaunchBridge.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';
import { listBenchmarkAttemptSessions } from '../../../core/benchmark/BenchmarkAttemptPersistence.js';
import { listAdaptiveEpisodeSessions } from '../../../core/benchmark/AdaptiveEpisodePersistence.js';
import { ADAPTIVE_MISSION_MANAGER_CONTRACT_VERSION, adaptiveManagerPolicyOptions } from '../../../core/benchmark/AdaptiveMissionManagerContract.js';
import { adaptiveManagerFixtureOptions, runAdaptiveManagerFixture } from '../../../core/benchmark/AdaptiveMissionManagerFixtures.js';
import { buildAdaptiveBenchmarkViewModel } from '../../../core/benchmark/AdaptiveBenchmarkViewModel.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class BenchmarkModeOverviewScene extends PhaserScene {
  constructor() {
    super('BenchmarkModeOverviewScene');
    this.objects = [];
  }

  init(data = {}) {
    this.config = createBenchmarkModeConfig({
      benchmarkMode: data.benchmarkMode ?? data.mode ?? 'plannerBenchmark',
      informationAccessTier: data.informationAccessTier,
      worldModelTier: data.worldModelTier,
      notes: ['Created from Benchmark Mode overview scene.']
    });
    this.state = createBenchmarkModeState(this.config);
    this.episodeConfig = createBenchmarkEpisodeConfig({
      benchmarkModeConfig: this.config,
      notes: ['Created from Benchmark Mode overview scene.']
    });
    this.episodeState = createBenchmarkEpisodeState({
      episodeConfig: this.episodeConfig,
      phase: 'setup',
      activeAttemptSource: this.config.benchmarkMode === 'fullAutonomyBenchmark' ? 'externalSolver' : 'manualPlayer'
    });
    this.adaptiveFixtureId = data.adaptiveFixtureId ?? 'shiftedFrontForecastError';
    this.adaptivePolicyId = data.adaptivePolicyId ?? 'transparentRuleManager';
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'benchmarkModeOverview';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel(this.config.label);
    this.renderConsole();
    this.refreshDebugObject();
    this.draw();
  }

  shutdown() {
    this.destroyObjects();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.draw();
  }

  buildAdaptivePreview() {
    if (this.config.benchmarkMode !== 'adaptiveBenchmark') return null;
    const fixture = runAdaptiveManagerFixture(this.adaptiveFixtureId, {
      policyId: this.adaptivePolicyId,
      episodeId: this.episodeState?.episodeId ?? this.episodeConfig?.episodeId
    });
    const viewModel = buildAdaptiveBenchmarkViewModel({
      managerConfig: fixture.managerConfig,
      managerState: fixture.managerState,
      evidence: fixture.evidence,
      diagnosis: fixture.diagnosis,
      transition: fixture.transition,
      fixture
    });
    return { ...fixture, viewModel };
  }

  renderConsole() {
    const adaptivePreview = this.buildAdaptivePreview();
    const p2ImplementedSystems = ['benchmarkEpisodeRuntime', 'benchmarkAttemptSession', 'benchmarkResultAdapter', 'result/debrief adapter'];
    const adaptiveImplemented = this.config.benchmarkMode === 'adaptiveBenchmark'
      ? [
          'adaptive mission-manager contract',
          'adaptive diagnosis model',
          'objective-transition policy',
          'surfacing/communication records',
          'adaptive manager preview',
          'adaptive setup metadata',
          'surfacing decision in Debrief',
          'next-leg handoff config',
          'adaptive multi-leg session persistence',
          'objective history review',
          'adaptive episode/session exports',
          'adaptive manager exports'
        ]
      : [];
    const p1NotImplemented = this.config.benchmarkMode === 'adaptiveBenchmark'
      ? [
          'automatic route generation',
          'automatic multi-leg route execution',
          'new route planner',
          'mission scoring redesign',
          'full autonomy',
          'MARL/RL',
          'production data assimilation'
        ]
      : [
          'new route planner',
          'mission-manager objective switching',
          'full autonomy',
          'MARL/RL',
          'production scoring redesign'
        ];
    this.app.console?.renderBenchmarkModeOverviewControls?.({
      config: this.config,
      state: {
        ...this.state,
        implementedSystems: [...this.state.implementedSystems, ...p2ImplementedSystems, ...adaptiveImplemented]
      },
      summary: benchmarkModeSummary(this.config),
      episodeConfig: this.episodeConfig,
      episodeState: this.episodeState,
      objectiveOptions: missionObjectiveOptions().slice(0, 8),
      savedAttemptSessions: this.savedBenchmarkAttemptSessionSummaries(),
      savedAdaptiveSessions: this.savedAdaptiveEpisodeSessionSummaries(),
      adaptivePreview,
      adaptiveFixtureId: this.adaptiveFixtureId,
      adaptivePolicyId: this.adaptivePolicyId,
      adaptiveFixtureOptions: adaptiveManagerFixtureOptions(),
      adaptivePolicyOptions: adaptiveManagerPolicyOptions(),
      p1Implemented: [
        'benchmark mode config',
        'episode metadata propagation',
        'existing setup/planning/simulation/debrief path',
        'result/debrief adapter',
        'benchmark run-record export from Debrief',
        'route-execution export from Debrief',
        'attempt-set comparison export',
        ...adaptiveImplemented
      ],
      p1NotImplemented
    }, {
      exportConfig: () => this.exportConfigJson(),
      exportEpisode: () => this.exportEpisodeConfigJson(),
      exportAdaptiveManagerConfig: () => this.exportAdaptiveManagerConfigJson(),
      exportAdaptiveManagerState: () => this.exportAdaptiveManagerStateJson(),
      exportAdaptiveObjectiveTransition: () => this.exportAdaptiveObjectiveTransitionJson(),
      exportAdaptiveSurfacingEvent: () => this.exportAdaptiveSurfacingEventJson(),
      exportAdaptiveManagerPreview: () => this.exportAdaptiveManagerPreviewJson(),
      exportAdaptiveLaunchConfig: () => this.exportAdaptiveLaunchConfigJson(),
      continueAdaptiveSession: () => this.continueSavedAdaptiveSession(),
      selectAdaptiveFixture: (fixtureId) => this.selectAdaptiveFixture(fixtureId),
      selectAdaptivePolicy: (policyId) => this.selectAdaptivePolicy(policyId),
      openBenchmarkSetup: () => this.openPlannerBenchmarkSetup(),
      openSamplingPriority: () => this.scene.start('SamplingPriorityDemoScene'),
      openFlowCoupledSampling: () => this.scene.start('FlowCoupledSamplingDemoScene'),
      openUncertainty: () => this.scene.start('UncertaintyForecastDemoScene'),
      openPlannerEvaluation: () => this.scene.start('DatasetExportScene'),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  selectAdaptiveFixture(fixtureId) {
    this.adaptiveFixtureId = fixtureId;
    this.renderConsole();
    this.refreshDebugObject();
    this.draw();
  }

  selectAdaptivePolicy(policyId) {
    this.adaptivePolicyId = policyId;
    this.renderConsole();
    this.refreshDebugObject();
    this.draw();
  }

  savedBenchmarkAttemptSessionSummaries() {
    return (listBenchmarkAttemptSessions().sessions ?? []).map((session) => ({
      episodeId: session.episodeId,
      benchmarkMode: session.benchmarkMode,
      attemptCount: session.attemptCount,
      routeGeometryCount: session.routeGeometryCount,
      savedAt: session.savedAt
    }));
  }

  savedAdaptiveEpisodeSessionSummaries() {
    return (listAdaptiveEpisodeSessions().sessions ?? []).map((session) => ({
      episodeId: session.episodeId,
      benchmarkMode: session.benchmarkMode,
      policyId: session.policyId,
      legCount: session.legCount,
      surfacingDecisionCount: session.surfacingDecisionCount,
      currentObjectiveId: session.currentObjectiveId,
      currentObjectiveLabel: session.currentObjectiveLabel,
      updatedAt: session.updatedAt ?? session.savedAt,
      session: session.session
    }));
  }

  exportConfigJson() {
    const exportData = buildBenchmarkModeConfigExport(this.config);
    downloadJSON(benchmarkModeConfigFilename(this.config), exportData);
  }

  exportEpisodeConfigJson() {
    const exportData = buildBenchmarkEpisodeConfigExport(this.episodeConfig);
    downloadJSON(benchmarkEpisodeConfigFilename(this.episodeConfig), exportData);
  }

  exportAdaptiveManagerConfigJson() {
    const preview = this.buildAdaptivePreview();
    if (!preview) return;
    downloadJSON(adaptiveBenchmarkExportFilename('manager-config', { fixtureId: this.adaptiveFixtureId }), buildAdaptiveManagerConfigExport(preview.managerConfig));
  }

  exportAdaptiveManagerStateJson() {
    const preview = this.buildAdaptivePreview();
    if (!preview) return;
    downloadJSON(adaptiveBenchmarkExportFilename('manager-state', { fixtureId: this.adaptiveFixtureId }), buildAdaptiveManagerStateExport(preview.managerState));
  }

  exportAdaptiveObjectiveTransitionJson() {
    const preview = this.buildAdaptivePreview();
    if (!preview) return;
    downloadJSON(adaptiveBenchmarkExportFilename('objective-transition', { fixtureId: this.adaptiveFixtureId }), buildAdaptiveObjectiveTransitionExport(preview.transition));
  }

  exportAdaptiveSurfacingEventJson() {
    const preview = this.buildAdaptivePreview();
    if (!preview) return;
    downloadJSON(adaptiveBenchmarkExportFilename('surfacing-event', { fixtureId: this.adaptiveFixtureId }), buildAdaptiveSurfacingEventExport({
      episodeId: this.episodeState.episodeId,
      time: preview.evidence.time,
      samplesUploaded: preview.evidence.observationCount,
      observationsReceived: preview.evidence.recentObservationCount,
      diagnosisTriggered: true,
      objectiveUpdateAllowed: true,
      notes: ['Synthetic P7 surfacing event generated from adaptive benchmark preview.']
    }));
  }

  exportAdaptiveManagerPreviewJson() {
    const preview = this.buildAdaptivePreview();
    if (!preview) return;
    downloadJSON(adaptiveBenchmarkExportFilename('manager-preview', { fixtureId: this.adaptiveFixtureId }), buildAdaptiveManagerPreviewExport(preview));
  }

  exportAdaptiveLaunchConfigJson() {
    const preview = this.buildAdaptivePreview();
    if (!preview) return;
    downloadJSON(adaptiveBenchmarkExportFilename('launch-config', { fixtureId: this.adaptiveFixtureId }), buildAdaptiveLaunchConfigExport({
      benchmarkModeConfig: this.config,
      adaptiveManagerConfig: preview.managerConfig,
      adaptiveManagerState: preview.initialState ?? preview.managerState,
      activeObjective: preview.viewModel.currentObjective,
      episodeId: this.episodeState.episodeId,
      activeLegIndex: 0,
      notes: ['Exported from Adaptive Benchmark overview.']
    }));
  }

  continueSavedAdaptiveSession() {
    const saved = this.savedAdaptiveEpisodeSessionSummaries()[0];
    if (!saved?.session) {
      this.app.toast?.('No saved Adaptive Benchmark session is available to continue.', 'warning');
      return;
    }
    const payload = createAdaptiveContinueLegPayload(saved.session, saved.session.nextLegHandoffs?.at(-1));
    const result = openAdaptiveBenchmarkSetup({
      app: this.app,
      scene: this,
      runtimeContext: payload.runtimeContext,
      adaptiveManagerConfig: payload.runtimeContext.adaptiveManagerConfig,
      adaptiveManagerState: payload.runtimeContext.adaptiveManagerState,
      benchmarkModeConfig: payload.runtimeContext.benchmarkModeConfig,
      activeObjective: payload.runtimeContext.activeObjective,
      legIndex: payload.legIndex
    });
    if (!result.launched) this.app.toast?.('Adaptive setup bridge is unavailable; export the saved session instead.', 'warning');
    this.refreshDebugObject();
  }
  openPlannerBenchmarkSetup() {
    if (this.config.benchmarkMode === 'adaptiveBenchmark') {
      const preview = this.buildAdaptivePreview();
      const result = openAdaptiveBenchmarkSetup({
        app: this.app,
        scene: this,
        benchmarkModeConfig: this.config,
        adaptiveManagerConfig: preview?.managerConfig,
        adaptiveManagerState: preview?.initialState ?? preview?.managerState,
        activeObjective: preview?.viewModel?.currentObjective,
        legIndex: 0
      });
      if (!result.launched) this.app.toast?.('Adaptive setup bridge is unavailable; export the launch config instead.', 'warning');
      this.refreshDebugObject();
      return;
    }
    if (this.config.benchmarkMode !== 'plannerBenchmark') {
      this.app.toast?.('This benchmark mode is contract-only in P7.', 'info');
      return;
    }
    const result = openPlannerBenchmarkSetup({
      app: this.app,
      scene: this,
      benchmarkModeConfig: this.config,
      episodeConfig: this.episodeConfig,
      episodeState: this.episodeState
    });
    if (!result.launched) this.app.toast?.('Benchmark setup bridge is unavailable; export the episode config instead.', 'warning');
    this.refreshDebugObject();
  }

  refreshDebugObject() {
    const adaptivePreview = this.buildAdaptivePreview();
    const supportedExportTypes = [
      'anchor.benchmark.mode-config',
      'anchor.benchmark.episode-config',
      'anchor.benchmark.run-record',
      'anchor.benchmark.route-execution',
      'anchor.benchmark.attempt-set',
      'anchor.benchmark.route-overlay',
      'anchor.benchmark.attempt-session'
    ];
    const adaptiveExportTypes = [
      'anchor.benchmark.adaptive-manager-config',
      'anchor.benchmark.adaptive-manager-state',
      'anchor.benchmark.adaptive-objective-transition',
      'anchor.benchmark.adaptive-surfacing-event',
      'anchor.benchmark.adaptive-manager-preview',
      'anchor.benchmark.adaptive-surfacing-decision',
      'anchor.benchmark.adaptive-next-leg-config',
      'anchor.benchmark.adaptive-episode-trace',
      'anchor.benchmark.adaptive-launch-config',
      'anchor.benchmark.adaptive-episode-session',
      'anchor.benchmark.adaptive-objective-history',
      'anchor.benchmark.adaptive-leg-record',
      'anchor.benchmark.adaptive-session-summary'
    ];
    globalThis.ANCHOR_BENCHMARK_MODE_DEBUG = {
      ...this.state.debugFlags,
      episodeContractVersion: BENCHMARK_EPISODE_CONTRACT_VERSION,
      runRecordVersion: BENCHMARK_RUN_RECORD_VERSION,
      routeExecutionRecordVersion: BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION,
      savedAttemptSessionCount: this.savedBenchmarkAttemptSessionSummaries().length,
      savedAdaptiveSessionCount: this.savedAdaptiveEpisodeSessionSummaries().length,
      plannerBenchmarkLaunchAvailable: this.config.benchmarkMode === 'plannerBenchmark',
      routeExecutionImplemented: 'existing-simulator-debrief-export',
      missionScoringImplemented: false,
      usesExistingSimulation: true,
      usesExistingDebrief: true,
      supportedAttemptSources: [...BENCHMARK_ATTEMPT_SOURCE_IDS],
      supportedExportTypes: [...supportedExportTypes, ...(adaptivePreview ? adaptiveExportTypes : [])],
      implementedSystems: [...this.state.implementedSystems, 'benchmarkEpisodeRuntime', 'benchmarkAttemptSession', 'benchmarkResultAdapter', ...(adaptivePreview ? ['adaptiveMissionManagerContract', 'adaptiveDiagnosisModel', 'adaptiveObjectivePolicy'] : [])],
      missingSystems: [...this.state.missingSystems],
      visibleLayers: [...this.state.visibleLayers],
      exportFlags: { ...this.state.exportFlags, benchmarkEpisodeConfig: true, routeExecutionRecord: true, adaptiveManagerPreview: Boolean(adaptivePreview), adaptiveLaunchConfig: Boolean(adaptivePreview) },
      ...(adaptivePreview ? adaptiveDebugFields(adaptivePreview, adaptiveExportTypes) : {})
    };
    globalThis.ANCHOR_BENCHMARK_EPISODE_DEBUG = {
      episodeId: this.episodeState.episodeId,
      benchmarkMode: this.config.benchmarkMode,
      phase: this.episodeState.phase,
      attemptSources: [...this.episodeConfig.allowedAttemptSources],
      activeAttemptSource: this.episodeState.activeAttemptSource,
      informationAccessTier: this.config.informationAccessTier,
      objectiveAuthority: this.config.objectiveAuthority,
      routeAuthority: this.config.routeAuthority,
      fairnessLabel: this.config.fairnessLabel
    };
    globalThis.ANCHOR_ADAPTIVE_BENCHMARK_DEBUG = adaptivePreview ? {
      version: ADAPTIVE_MISSION_MANAGER_CONTRACT_VERSION,
      fixtureId: adaptivePreview.fixtureId,
      managerConfig: adaptivePreview.managerConfig,
      managerState: adaptivePreview.managerState,
      evidence: adaptivePreview.evidence,
      diagnosis: adaptivePreview.diagnosis,
      transition: adaptivePreview.transition,
      viewModel: adaptivePreview.viewModel,
      exports: {
        managerConfig: 'anchor.benchmark.adaptive-manager-config',
        managerState: 'anchor.benchmark.adaptive-manager-state',
        objectiveTransition: 'anchor.benchmark.adaptive-objective-transition',
        surfacingEvent: 'anchor.benchmark.adaptive-surfacing-event',
        managerPreview: 'anchor.benchmark.adaptive-manager-preview',
        surfacingDecision: 'anchor.benchmark.adaptive-surfacing-decision',
        nextLegConfig: 'anchor.benchmark.adaptive-next-leg-config',
        episodeTrace: 'anchor.benchmark.adaptive-episode-trace',
        launchConfig: 'anchor.benchmark.adaptive-launch-config',
        episodeSession: 'anchor.benchmark.adaptive-episode-session',
        objectiveHistory: 'anchor.benchmark.adaptive-objective-history',
        legRecord: 'anchor.benchmark.adaptive-leg-record',
        sessionSummary: 'anchor.benchmark.adaptive-session-summary',
        scienceDiagnosisContext: 'anchor.benchmark.adaptive-science-diagnosis-context',
        scienceDiagnosisHandoff: 'anchor.benchmark.adaptive-science-diagnosis-handoff',
        missionManagerRationale: 'anchor.benchmark.adaptive-mission-manager-rationale'
      },
      scienceDiagnosis: adaptivePreview.viewModel?.scienceDiagnosis ?? adaptivePreview.scienceDiagnosis ?? null,
      scienceDiagnosisIsPlannerAuthority: false,
      usesRoutePlanning: false,
      usesNewPlanner: false,
      generatesWaypoints: false,
      usesMissionScoring: false,
      usesProductionDataAssimilation: false,
      usesMARL: false
    } : {
      available: false,
      benchmarkMode: this.config.benchmarkMode
    };
  }

  draw() {
    this.destroyObjects();
    const width = Number(this.sys?.game?.scale?.width ?? 960);
    const height = Number(this.sys?.game?.scale?.height ?? 640);
    const x = Math.max(32, Math.round(width * 0.08));
    let y = Math.max(48, Math.round(height * 0.12));
    const titleStyle = { fontFamily: 'system-ui', fontSize: '34px', color: '#eef6ff', fontStyle: '700' };
    const bodyStyle = { fontFamily: 'system-ui', fontSize: '18px', color: '#c7d7ee', lineSpacing: 8, wordWrap: { width: Math.max(420, width * 0.72) } };
    const mutedStyle = { fontFamily: 'system-ui', fontSize: '15px', color: '#8fa8c8', lineSpacing: 6, wordWrap: { width: Math.max(420, width * 0.72) } };
    const adaptivePreview = this.buildAdaptivePreview();
    this.objects.push(this.add.text(x, y, this.config.label, titleStyle));
    y += 52;
    this.objects.push(this.add.text(x, y, modeCardText(this.config.benchmarkMode, adaptivePreview), bodyStyle));
    y += adaptivePreview ? 120 : 88;
    this.objects.push(this.add.text(x, y, [
      `Objective authority: ${authorityLabel(this.config.objectiveAuthority)}`,
      `Route authority: ${authorityLabel(this.config.routeAuthority)}`,
      `Information access: ${this.state.summary.informationAccess.label} (${this.config.fairnessLabel})`,
      `World model tier: ${this.state.summary.worldModel.label}`
    ], bodyStyle));
    y += 128;
    this.objects.push(this.add.text(x, y, adaptivePreview
      ? `P8 status: mission-manager preview recommends ${adaptivePreview.viewModel.recommendedObjective.label} from ${adaptivePreview.viewModel.diagnosis.label}.`
      : 'P2 status: existing planning, simulator, and debrief can emit benchmark run, route-execution, and attempt-set records.', mutedStyle));
    y += 60;
    this.objects.push(this.add.text(x, y, 'Not implemented here: adaptive route execution, new route planner, mission scoring redesign, full autonomy, MARL/RL, or production data assimilation.', mutedStyle));
  }

  destroyObjects() {
    for (const object of this.objects) object?.destroy?.();
    this.objects = [];
  }
}

function adaptiveDebugFields(preview, exportTypes) {
  return {
    adaptiveManagerContractVersion: ADAPTIVE_MISSION_MANAGER_CONTRACT_VERSION,
    adaptiveManagerPolicyId: preview.managerConfig.policyId,
    adaptiveFixtureId: preview.fixtureId,
    adaptiveCurrentObjectiveId: preview.transition.fromObjectiveId,
    adaptiveRecommendedObjectiveId: preview.transition.toObjectiveId,
    adaptivePrimaryDiagnosis: preview.diagnosis.primaryDiagnosis,
    adaptiveDiagnosisConfidence: preview.diagnosis.confidence,
    adaptiveTransitionId: preview.transition.transitionId,
    adaptiveObjectiveAuthority: 'missionManager',
    adaptiveRouteAuthority: 'playerOrSolver',
    adaptiveExportsAvailable: [...exportTypes],
    adaptiveLaunchAvailable: true,
    adaptiveExecutionPreviewAvailable: true,
    adaptiveMultiLegSessionAvailable: true,
    adaptiveNextLegHandoffAvailable: true,
    adaptiveCurrentLegIndex: 0,
    adaptiveSurfacingDecisionAvailable: false,
    adaptiveExecutionImplemented: 'session-persistence-only',
    usesAdaptiveMissionManager: true,
    usesAdaptiveRouteExecution: 'existing-simulator-leg-only',
    usesRoutePlanning: false,
    usesMissionScoring: false,
    usesMARL: false
  };
}

function modeCardText(mode, adaptivePreview = null) {
  if (mode === 'adaptiveBenchmark' && adaptivePreview) {
    return [
      'Adaptive Benchmark gives objective authority to a transparent mission manager. The player or solver still chooses the route.',
      `Preview fixture: ${adaptivePreview.label}. Diagnosis: ${adaptivePreview.viewModel.diagnosis.label}. Recommended objective: ${adaptivePreview.viewModel.recommendedObjective.label}.`
    ];
  }
  return {
    plannerBenchmark: 'Objective is fixed. Plan manually, use Greedy Planner, or import a solver plan. Execute through the existing simulator and compare results in Debrief.',
    adaptiveBenchmark: 'Mission manager objective updates run at surfacing/debrief; P8 persists leg-by-leg adaptive session history for manual continuation.',
    fullAutonomyBenchmark: 'Solver/agent objective and route authority are defined by contract; execution later.'
  }[mode] ?? 'Benchmark mode contract.';
}

function authorityLabel(value) {
  return {
    fixed: 'fixed / given objective',
    missionManager: 'transparent mission manager',
    playerOrSolver: 'player or solver',
    solverOrAgent: 'solver or agent'
  }[value] ?? value;
}
