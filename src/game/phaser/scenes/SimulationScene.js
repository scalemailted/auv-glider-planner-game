import { SimulationEngine } from '../../../core/sim/SimulationEngine.js';
import { createSimulationWatchdog } from '../../../core/sim/SimulationWatchdog.js';
import { downloadJSON, readJSONFile } from '../../../core/io/ImportExport.js';
import { attachIdentityToResult } from '../../../core/identity/GameInstanceId.js';
import {
  formatMissionTime,
  getMissionTimelineFrames,
  getNextTimelineFrameIndex,
  getPrevTimelineFrameIndex,
  getTimeConfig,
  getWindowForTime
} from '../../../core/time/MissionTime.js';
import { getActiveRenderTime } from '../../../core/time/ActiveRenderTime.js';
import { drawMissionMap } from '../PhaserCoreAdapter.js';
import { getViewportMapBounds } from '../ViewportMapBounds.js';
import { Modal } from '../ui/Modal.js';
import { createSimulationTrace, traceSimulation } from '../../../core/debug/SimulationTrace.js';
import { summarizeEnsembleForPlan } from '../../../core/evaluation/EnsembleMetrics.js';
import { storePlanResult } from '../../../core/evaluation/PlanResultStore.js';
import { comparePlanResults } from '../../../core/evaluation/PlanComparison.js';
import { labelReason } from '../../../core/planning/StopReasonSummarizer.js';
import {
  annotateStochasticResult,
  applyStochasticToMission,
  normalizeStochasticState,
  recordStochasticRun
} from '../../../core/evaluation/StochasticRunStore.js';
import { clearPlanningOverlayState } from '../../../core/planning/PlanningOverlayState.js';
import { routeFailureTitle } from '../../../core/sim/RouteFailureDecision.js';
import { applyImportedWaypointData, importWaypointDataJson } from '../../../core/io/PlanSegmentImporter.js';
import { buildSurfaceObservationExport } from '../../../core/io/SurfaceObservationExporter.js';
import { recomputeAllWaypointTiming } from '../../../core/planning/TemporalWaypointPlanner.js';
import { buildRouteValidationDiagnostic, formatDiagnosticDetails } from '../../../core/planning/RouteDiagnostic.js';
import { gradeRouteContributions } from '../../../core/planning/SegmentContributionGrader.js';
import {
  debugSurfaceDecision,
  isSurfaceDecisionModalVisible
} from '../../../core/sim/SurfaceDecisionVisibility.js';
import { getAgentPlan, removeWaypoint } from '../../../core/planning/WaypointPlan.js';
import {
  derivePlannerBenchmarkAttemptContext,
  extractPlannerBenchmarkContextFromState
} from '../../../core/benchmark/BenchmarkEpisodeRuntime.js';
import { deriveAdaptiveBenchmarkContextFromState } from '../../../core/benchmark/AdaptiveBenchmarkRuntime.js';
import { attemptSourceFromRouteSourceLabel } from '../../../core/benchmark/BenchmarkAttemptSourceMapping.js';
import { buildSimulationWorldRenderViewModel, validateSimulationWorldRenderViewModel, simulationWorldRenderViewModelSummary } from '../../../core/rendering/SimulationWorldRenderViewModel.js';
import { simulationWorldRenderInputFromScene, simulationWorldRenderInputSummary } from '../../../core/rendering/SimulationWorldStateAdapter.js';
import { createThreeMissionWorldRenderer, updateThreeMissionWorldRenderer, resizeThreeMissionWorldRenderer, setThreeMissionWorldCamera, setThreeMissionLayerVisibility, threeMissionWorldRendererSummary, disposeThreeMissionWorldRenderer } from '../../three/ThreeMissionWorldRenderer.js';
import { legacyPhaserMissionRendererEnabled, preferredMissionRendererBackend, publishMigrationDebug } from '../../../core/runtime/MigrationRuntimeConfig.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class SimulationScene extends PhaserScene {
  constructor() {
    super('SimulationScene');
    this.threeSimulationContainer = null;
    this.threeSimulationRenderer = null;
    this.simulationRenderInput = null;
    this.simulationRenderViewModel = null;
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.setSceneLabel('Simulation');
    this.app.state.mode = 'simulation';
    this.app.state.ui ??= {};
    this.app.state.ui.legacyPhaserMissionRendererEnabled = legacyPhaserMissionRendererEnabled();
    this.app.state.ui.rendererBackend = preferredMissionRendererBackend({ requested: this.app.state.ui.rendererBackend });
    clearPlanningOverlayState(this.app.state);
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.graphics = this.add.graphics();
    this.graphics.setVisible(this.getSimulationRendererBackend() === 'legacyPhaser2d');
    this.app.clearPanels();
    this.modal = new Modal(this);
    normalizeStochasticState(this.app.state);
    applyStochasticToMission(this.app.state);
    applyMissionOptionsToMission(this.app.state);
    this.trace = this.app.state.simulationTrace ?? createSimulationTrace();
    this.app.state.simulationTrace = this.trace;
    this.engine = new SimulationEngine({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      resumeState: this.app.state.simulationResume,
      trace: this.trace,
      time: this.app.state.playback.time
    });
    this.syncSimulationDecisionWaitState();
    traceSimulation(this.trace, {
      scene: 'SimulationScene',
      phase: 'simulation.init',
      simTime: this.engine.t,
      message: 'Simulation scene created'
    });
    this.abortNoticeShown = false;
    this.stopReasonNoticeShown = false;
    this.activeRouteFailureKey = null;
    this.routeFailureFallbackShownFor = null;
    this.renderAccumulator = 0;
    this.syncAccumulator = 0;
    this.finishingAsync = false;
    this.app.state.simulationResume = null;
    this.watchdog = createSimulationWatchdog({
      onAbort: (snapshot) => this.handleWatchdogAbort(snapshot)
    });
    this.renderPanel();
    this.renderConsole();
    this.app.waypointPanel?.setHandlers({
      selectAgent: (agentId) => {
        this.app.state.selectedAgentId = agentId;
        this.app.waypointPanel?.refresh(this.app.state, { engine: this.engine });
        this.app.agentPerformanceHud?.refresh(this.app.state, { engine: this.engine });
      }
    });
    this.app.agentPerformanceHud?.setHandlers({
      selectAgent: (agentId) => {
        this.app.state.selectedAgentId = agentId;
        this.app.waypointPanel?.refresh(this.app.state, { engine: this.engine });
        this.app.agentPerformanceHud?.refresh(this.app.state, { engine: this.engine });
      }
    });
    this.renderSimulationTimeline();
    this.bindSurfaceDecisionFallbacks();
    this.onViewportResize = () => {
      globalThis.requestAnimationFrame?.(() => this.refresh());
    };
    globalThis.addEventListener?.('resize', this.onViewportResize);
    this.resizeObserver = globalThis.ResizeObserver
      ? new globalThis.ResizeObserver(this.onViewportResize)
      : null;
    if (this.resizeObserver && this.app.elements.viewportShell) {
      this.resizeObserver.observe(this.app.elements.viewportShell);
    }
    this.syncResult();
    this.refresh();
    this.notifyAbortIfNeeded();
    this.notifyStopReasonIfNeeded();
    this.refreshRouteFailureDecision();
  }

  shutdown() {
    this.unbindSurfaceDecisionFallbacks();
    globalThis.removeEventListener?.('resize', this.onViewportResize);
    this.resizeObserver?.disconnect();
    if (this.app.elements.overlay?.bottomTimeline) this.app.elements.overlay.bottomTimeline.innerHTML = '';
    this.disposeThreeSimulationRenderer();
    this.modal?.destroy();
  }

  renderPanel() {
    this.add.rectangle(20, 18, 520, 92, 0x0f1b2e, 0.9).setOrigin(0, 0).setStrokeStyle(1, 0x6d86aa, 0.4);
    this.add.text(36, 30, 'Simulation', { fontFamily: 'system-ui', fontSize: '22px', fontStyle: '700', color: '#eef6ff' });
    this.statusText = this.add.text(36, 66, 'Ready.', { fontFamily: 'system-ui', fontSize: '14px', color: '#b9c7dc', wordWrap: { width: 480 } });
    this.summaryText = this.add.text(970, 128, '', { fontFamily: 'system-ui', fontSize: '13px', color: '#eef6ff', wordWrap: { width: 250 } });
  }

  renderConsole() {
    const root = this.app.elements.consoleRoot;
    if (!root) return;
    root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Simulation Console</div>
        <h1>Mission Playback</h1>
        <p>Glider execution under currents, hazards, and energy limits.</p>
      </section>
      <section class="console-section">
        <h2>Playback</h2>
        <button class="console-button primary" data-action="play">Play / Pause</button>
        <button class="console-button" data-action="step">Step</button>
        <button class="console-button" data-action="finish">Finish Instantly</button>
        <button class="console-button" data-action="planning">Return To Planning</button>
        <button class="console-button" data-action="debrief">Debrief</button>
      </section>
      <section id="simulation-abort-actions" class="console-section" hidden></section>
      <section id="simulation-surface-decision-actions" class="console-section" hidden data-surface-decision-fallback="true"></section>
      <section id="simulation-route-failure-actions" class="console-section" hidden></section>
      <section class="console-status">
        <span>Simulation Status</span>
        <strong id="simulation-console-status">Ready</strong>
        <small id="simulation-console-summary">Waiting for playback.</small>
      </section>
      <section class="console-section">
        <h2>Three Mission World</h2>
        <p class="hud-muted">Three.js is the default simulation environment. The portable simulation engine owns time, vehicle motion, observations, and score.</p>
        <div class="console-button-row">
          <button class="console-button secondary" data-action="sim-camera-top">Top Down</button>
          <button class="console-button secondary" data-action="sim-camera-oblique">Oblique</button>
          <button class="console-button secondary" data-action="sim-camera-profile">Water Column</button>
        </div>
      </section>
      <section class="console-section">
        <h2>Recent Events</h2>
        <div id="simulation-console-events" class="event-list">
          <div class="hud-muted">No events yet.</div>
        </div>
      </section>
      <section class="console-footer">
        <button class="console-button secondary" data-action="menu">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('simulation');
    root.querySelector('[data-action="play"]')?.addEventListener('click', () => this.togglePlay());
    root.querySelector('[data-action="step"]')?.addEventListener('click', () => this.stepOnce());
    root.querySelector('[data-action="finish"]')?.addEventListener('click', () => this.finishSimulation());
    root.querySelector('[data-action="planning"]')?.addEventListener('click', () => this.scene.start('MissionWorkspaceScene'));
    root.querySelector('[data-action="debrief"]')?.addEventListener('click', () => this.goDebrief());
    root.querySelector('[data-action="menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
    root.querySelector('[data-action="sim-camera-top"]')?.addEventListener('click', () => this.setThreeSimulationCameraPreset('tacticalTopDown'));
    root.querySelector('[data-action="sim-camera-oblique"]')?.addEventListener('click', () => this.setThreeSimulationCameraPreset('obliqueMission'));
    root.querySelector('[data-action="sim-camera-profile"]')?.addEventListener('click', () => this.setThreeSimulationCameraPreset('waterColumnProfile'));
  }

  getSimulationRendererBackend() {
    return preferredMissionRendererBackend({ requested: this.app.state.ui?.rendererBackend });
  }

  refreshMigrationDebug() {
    return publishMigrationDebug({
      legacyFallbackEnabled: legacyPhaserMissionRendererEnabled(),
      planningBackend: 'threeMission3d',
      simulationBackend: this.getSimulationRendererBackend(),
      remainingPhaserProductionRoutes: ['scene-lifecycle', 'mission-briefing', 'simulation-lifecycle', 'debrief', 'editor']
    });
  }

  setThreeSimulationCameraPreset(preset) {
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionCameraPreset = ['tacticalTopDown', 'obliqueMission', 'waterColumnProfile'].includes(preset) ? preset : 'obliqueMission';
    if (this.threeSimulationRenderer) setThreeMissionWorldCamera(this.threeSimulationRenderer, { preset: this.app.state.ui.threeMissionCameraPreset });
    this.refresh();
  }

  togglePlay() {
    if (this.engine.running) this.engine.pause();
    else this.engine.play();
    this.syncSimulationDecisionWaitState();
    this.refreshControls();
    this.renderSimulationTimeline();
  }

  stepOnce() {
    this.engine.pause();
    this.engine.stepOnce();
    this.syncResult();
    this.refresh();
    this.refreshSurfaceDecision();
    this.refreshRouteFailureDecision();
    this.notifyAbortIfNeeded();
    this.notifyStopReasonIfNeeded();
  }

  resetSimulation() {
    applyStochasticToMission(this.app.state);
    applyMissionOptionsToMission(this.app.state);
    console.log(this.app);
    this.engine = new SimulationEngine({ level: this.app.state.level, mission: this.app.state.mission, plan: this.app.state.plan, trace: this.trace, time: this.app.state.playback.time });
    this.abortNoticeShown = false;
    this.stopReasonNoticeShown = false;
    this.app.state.surfaceDecision = null;
    this.clearSurfaceDecisionFallback();
    this.app.state.routeFailureDecision = null;
    this.clearRouteFailureFallback();
    this.clearSimulationWaitState();
    this.finishingAsync = false;
    this.watchdog?.reset();
    this.syncResult();
    this.refresh();
  }

  seekSimulationTime(time = 0) {
    const target = clampTime(this.app.state.level, time);
    this.engine.pause();
    applyStochasticToMission(this.app.state);
    applyMissionOptionsToMission(this.app.state);
    this.engine = new SimulationEngine({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      trace: this.trace,
      time: this.app.state.playback.time
    });
    this.abortNoticeShown = false;
    this.stopReasonNoticeShown = false;
    this.app.state.surfaceDecision = null;
    this.clearSurfaceDecisionFallback();
    this.app.state.routeFailureDecision = null;
    this.clearRouteFailureFallback();
    this.clearSimulationWaitState();
    this.finishingAsync = false;
    this.watchdog?.reset();
    const dt = getSafeSceneStepDt(this.app.state.level);
    const maxSteps = Math.ceil(target / Math.max(dt, 0.001)) + 4;
    for (let index = 0; index < maxSteps && this.engine.t < target && !this.engine.complete && !this.engine.aborted && !this.engine.routeFailureDecision?.active; index += 1) {
      this.engine.step(Math.min(dt, target - this.engine.t), { force: true });
    }
    this.syncResult();
    this.refresh();
    this.refreshSurfaceDecision();
    this.refreshRouteFailureDecision();
    this.notifyAbortIfNeeded();
    this.notifyStopReasonIfNeeded();
  }

  goToSimulationFrame(frameIndex) {
    const frames = getMissionTimelineFrames(this.app.state.level, this.app.state.mission);
    const bounded = Math.max(0, Math.min(frames.length - 1, Math.round(Number(frameIndex) || 0)));
    this.seekSimulationTime(frames[bounded]?.t ?? 0);
  }

  finishSimulation() {
    if (this.finishingAsync) return;
    if (this.engine.routeFailureDecision?.active) {
      this.finishFromRouteFailure();
      return;
    }
    if (this.engine.awaitingSurfaceDecision) {
      this.finishFromSurface();
      return;
    }
    this.runUntilCompleteAsync();
  }

  async runUntilCompleteAsync({ maxTotalSteps = 10000, stepsPerChunk = 50 } = {}) {
    this.finishingAsync = true;
    this.engine.pause();
    const previousIgnoreSurfacePauses = this.engine.ignoreSurfacePauses;
    this.engine.ignoreSurfacePauses = true;
    let totalSteps = 0;
    const dt = getSafeSceneStepDt(this.app.state.level);
    try {
      while (!this.engine.complete && !this.engine.aborted && !this.engine.routeFailureDecision?.active && totalSteps < maxTotalSteps) {
        traceSimulation(this.trace, {
          scene: 'SimulationScene',
          phase: 'finish.chunk.start',
          simTime: this.engine.t,
          message: 'Finish chunk started',
          details: { totalSteps }
        });
        const started = globalThis.performance?.now?.() ?? Date.now();
        for (let index = 0; index < stepsPerChunk && !this.engine.complete && !this.engine.aborted && !this.engine.routeFailureDecision?.active; index += 1) {
          this.engine.step(dt, { force: true });
          totalSteps += 1;
        }
        this.syncResult();
        this.refresh();
        traceSimulation(this.trace, {
          scene: 'SimulationScene',
          phase: 'finish.chunk.end',
          simTime: this.engine.t,
          message: 'Finish chunk completed',
          details: { totalSteps, elapsed }
        });
        const elapsed = (globalThis.performance?.now?.() ?? Date.now()) - started;
        if (elapsed > 250) {
          this.handleWatchdogAbort(this.buildManualWatchdogSnapshot('finishChunkWallTimeExceeded', { elapsed, totalSteps }));
          break;
        }
        await yieldToBrowser();
      }
      if (!this.engine.complete && !this.engine.aborted && totalSteps >= maxTotalSteps) {
        this.handleWatchdogAbort(this.buildManualWatchdogSnapshot('finishMaxTotalStepsExceeded', { totalSteps, maxTotalSteps }));
      }
    } finally {
      this.engine.ignoreSurfacePauses = previousIgnoreSurfacePauses;
      this.finishingAsync = false;
      this.syncResult();
      this.refresh();
      this.notifyAbortIfNeeded();
      this.notifyStopReasonIfNeeded();
    }
  }

  goDebrief() {
    this.syncResult();
    if (this.engine.complete) recordStochasticRun(this.app.state, this.app.state.result);
    clearPlanningOverlayState(this.app.state);
    this.graphics?.clear();
    this.app.state.mode = 'debrief';
    this.clearSimulationWaitState();
    this.scene.start('DebriefScene');
  }

  update(_time, delta) {
    if (!this.engine) return;
    const beforeStepCount = this.engine.stepCount;
    const wasRunning = this.engine.running;
    if (wasRunning) {
      traceSimulation(this.trace, {
        scene: 'SimulationScene',
        phase: 'simulation.step.start',
        simTime: this.engine.t,
        message: 'Scene update stepping engine',
        details: { delta }
      });
    }
    this.engine.step(delta / 1000);
    if (wasRunning) {
      traceSimulation(this.trace, {
        scene: 'SimulationScene',
        phase: 'simulation.step.end',
        simTime: this.engine.t,
        message: 'Scene update step returned',
        details: { stepsThisFrame: this.engine.stepCount - beforeStepCount }
      });
    }
    if (wasRunning || this.engine.complete || this.engine.awaitingSurfaceDecision || this.engine.routeFailureDecision?.active) this.syncSimulationTimeToState();
    if (this.engine.awaitingSurfaceDecision) this.refreshSurfaceDecision();
    const snapshot = this.watchdog?.observe({
      engine: this.engine,
      sceneName: 'SimulationScene',
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      mode: this.app.state.mode,
      gameState: this.app.state,
      simulationState: this.app.state.simulation,
      waitingForPlayerDecision: Boolean(this.app.state.simulation?.waitingForPlayerDecision),
      waitingForImport: Boolean(this.app.state.simulation?.waitingForImport),
      waitingForExternalSolver: Boolean(this.app.state.simulation?.waitingForExternalSolver),
      surfaceDecisionActive: Boolean(this.app.state.surfaceDecision?.active || this.engine.awaitingSurfaceDecision),
      routeFailureDecisionActive: Boolean(this.app.state.routeFailureDecision?.active || this.engine.routeFailureDecision?.active),
      surfaceModalVisible: Boolean(this.modal?.isVisible?.()),
      surfaceFallbackVisible: this.isSurfaceFallbackVisible(),
      surfaceDecisionUiAvailable: this.isSurfaceDecisionUiVisible(),
      renderObjectCount: getRenderObjectCount(this),
      stepsThisFrame: this.engine.stepCount - beforeStepCount,
      trace: this.trace?.snapshot?.() ?? []
    });
    if (snapshot) return;
    this.syncAccumulator += delta;
    this.renderAccumulator += delta;
    const decisionActive = Boolean(this.engine.awaitingSurfaceDecision || this.engine.routeFailureDecision?.active);
    const shouldSync = this.engine.complete || decisionActive || this.syncAccumulator >= 250;
    const shouldRender = this.engine.complete || decisionActive || this.renderAccumulator >= 100;
    if (shouldSync) {
      this.syncResult();
      this.syncAccumulator = 0;
    }
    if (shouldRender) {
      this.refresh();
      this.renderAccumulator = 0;
    }
    this.refreshSurfaceDecision();
    this.refreshRouteFailureDecision();
    this.notifyAbortIfNeeded();
    this.notifyStopReasonIfNeeded();
  }

  syncResult() {
    const source = this.app.state.currentPlanSource ?? 'manual';
    const engineResult = this.engine.getResult();
    const summary = engineResult.summary ?? {};
    const ensembleMetrics = summarizeEnsembleForPlan(this.app.state.level, this.app.state.plan, this.engine.t, {
      selectedForecastMemberId: this.app.state.ui.forecastMemberId ?? null,
      actualRealizedValue: summary.realizedSampleScore ?? summary.sampleScore
    });
    const result = attachIdentityToResult({
      ...engineResult,
      challengeMode: this.app.state.challengeMode,
      experienceMode: this.app.state.experienceMode,
      missionMode: this.app.state.missionMode ?? this.app.state.level?.meta?.missionMode ?? this.app.state.mission?.meta?.missionMode ?? null,
      missionModePreset: this.app.state.level?.meta?.missionModePreset ?? this.app.state.mission?.meta?.missionModePreset ?? null,
      navigationUncertainty: this.app.state.mission?.rules?.navigationUncertainty
        ?? this.app.state.mission?.meta?.navigationUncertainty
        ?? this.app.state.level?.meta?.generationConfig?.navigationUncertainty
        ?? null,
      routeQuality: gradeRouteContributions({
        level: this.app.state.level,
        mission: this.app.state.mission,
        plan: this.app.state.plan,
        challengeMode: this.app.state.challengeMode,
        revealTruth: this.app.state.ui?.revealTruth,
        forecastMemberId: this.app.state.ui?.forecastMemberId
      }),
      source,
      planName: planDisplayName(this.app.state.plan, source),
      planMetadata: this.app.state.plan?.meta ?? {},
      forecastMemberId: this.app.state.ui.forecastMemberId ?? null,
      roiViewMode: this.app.state.ui.roiViewMode ?? 'expectedValue',
      ensembleMetadata: {
        count: this.app.state.level?.layers?.forecasts?.length ?? 0,
        members: (this.app.state.level?.layers?.forecasts ?? []).map((member) => ({ id: member.id, label: member.label ?? member.id }))
      },
      ensembleMetrics,
      regret: ensembleMetrics ? {
        forecastRegret: ensembleMetrics.ensembleRegretEstimate,
        regretRatio: ensembleMetrics.regretRatio
      } : null,
      risk: {
        ...(engineResult.risk ?? {}),
        ensembleDisagreement: ensembleMetrics?.ensembleDisagreement ?? null,
        forecastRegret: ensembleMetrics?.ensembleRegretEstimate ?? null
      },
      stochasticLayers: {
        probabilisticROI: true,
        mobileHazards: this.app.state.level?.layers?.mobileHazards?.length ?? 0,
        depth: Boolean(this.app.state.level?.layers?.depth)
      }
    }, this.app.state.level, this.app.state.mission);
    this.annotateBenchmarkResult(result, source);
    annotateStochasticResult(this.app.state, result);
    storePlanResult(this.app.state, { source, plan: this.app.state.plan, result });
    result.comparison = comparePlanResults(this.app.state.planResults);
    this.app.state.result = result;
  }

  annotateBenchmarkResult(result, source = 'manual') {
    if (!result) return null;
    const context = extractPlannerBenchmarkContextFromState(this.app.state);
    if (context) {
      const attemptContext = derivePlannerBenchmarkAttemptContext({
        ...context,
        attemptSource: attemptSourceFromRouteSourceLabel(source),
        routeSourceLabel: source
      });
      this.app.state.benchmarkRuntimeContext = attemptContext;
      this.app.state.benchmarkModeConfig = attemptContext.benchmarkModeConfig;
      this.app.state.benchmarkEpisode = {
        ...(this.app.state.benchmarkEpisode ?? {}),
        episodeId: attemptContext.episodeId,
        phase: this.engine?.complete ? 'debrief' : 'executing',
        activeAttemptSource: attemptContext.activeAttemptSource,
        activeObjective: attemptContext.activeObjective,
        activeResultId: result.resultId ?? result.id ?? null,
        updatedAt: new Date().toISOString()
      };
      const baseMetadata = this.app.state.plan?.meta?.benchmarkMetadata
        ?? this.app.state.mission?.meta?.benchmarkMetadata
        ?? this.app.state.level?.meta?.benchmarkMetadata
        ?? {};
      result.benchmarkMetadata = {
        ...baseMetadata,
        benchmarkMode: 'plannerBenchmark',
        benchmarkModeConfigVersion: attemptContext.benchmarkModeConfig?.version ?? baseMetadata.benchmarkModeConfigVersion ?? null,
        episodeId: attemptContext.episodeId,
        informationAccessTier: attemptContext.informationAccessTier,
        objectiveAuthority: 'fixed',
        routeAuthority: 'playerOrSolver',
        fairnessLabel: attemptContext.fairnessLabel,
        attemptSource: attemptContext.activeAttemptSource,
        worldModelTier: attemptContext.worldModelTier,
        metadataVersion: baseMetadata.metadataVersion ?? 'benchmark-metadata-p2'
      };
      result.benchmarkRuntimeContext = attemptContext;
      return attemptContext;
    }
    const adaptiveContext = deriveAdaptiveBenchmarkContextFromState(this.app.state);
    if (!adaptiveContext) return null;
    this.app.state.benchmarkRuntimeContext = adaptiveContext;
    this.app.state.adaptiveBenchmarkRuntimeContext = adaptiveContext;
    this.app.state.benchmarkModeConfig = adaptiveContext.benchmarkModeConfig;
    this.app.state.adaptiveManagerConfig = adaptiveContext.adaptiveManagerConfig;
    this.app.state.adaptiveManagerState = adaptiveContext.adaptiveManagerState;
    this.app.state.benchmarkEpisode = {
      ...(this.app.state.benchmarkEpisode ?? {}),
      episodeId: adaptiveContext.episodeId,
      phase: this.engine?.complete ? 'debrief' : 'executing',
      activeObjective: adaptiveContext.activeObjective,
      activeLegIndex: adaptiveContext.activeLegIndex,
      adaptiveManagerState: adaptiveContext.adaptiveManagerState,
      activeResultId: result.resultId ?? result.id ?? null,
      updatedAt: new Date().toISOString()
    };
    const baseMetadata = this.app.state.plan?.meta?.benchmarkMetadata
      ?? this.app.state.mission?.meta?.benchmarkMetadata
      ?? this.app.state.level?.meta?.benchmarkMetadata
      ?? {};
    result.benchmarkMetadata = {
      ...baseMetadata,
      benchmarkMode: 'adaptiveBenchmark',
      benchmarkModeConfigVersion: adaptiveContext.benchmarkModeConfig?.version ?? baseMetadata.benchmarkModeConfigVersion ?? null,
      episodeId: adaptiveContext.episodeId,
      informationAccessTier: adaptiveContext.informationAccessTier,
      objectiveAuthority: 'missionManager',
      routeAuthority: 'playerOrSolver',
      fairnessLabel: adaptiveContext.fairnessLabel,
      attemptSource: 'manualPlayer',
      worldModelTier: adaptiveContext.worldModelTier,
      activeObjectiveId: adaptiveContext.activeObjective?.id,
      activeLegIndex: adaptiveContext.activeLegIndex,
      metadataVersion: baseMetadata.metadataVersion ?? 'benchmark-metadata-p7'
    };
    result.adaptiveBenchmark = {
      benchmarkMode: 'adaptiveBenchmark',
      episodeId: adaptiveContext.episodeId,
      activeLegIndex: adaptiveContext.activeLegIndex,
      activeObjective: adaptiveContext.activeObjective,
      adaptiveManagerConfig: adaptiveContext.adaptiveManagerConfig,
      adaptiveManagerState: adaptiveContext.adaptiveManagerState,
      runtimeContext: adaptiveContext,
      objectiveAuthority: 'missionManager',
      routeAuthority: 'playerOrSolver'
    };
    result.benchmarkRuntimeContext = adaptiveContext;
    return adaptiveContext;
  }

  refresh() {
    const renderTime = getActiveRenderTime(this.app.state, this.engine);
    traceSimulation(this.trace, {
      scene: 'SimulationScene',
      phase: 'renderer.frame.start',
      simTime: renderTime,
      message: 'Rendering simulation frame'
    });
    this.trace?.markFrame?.(this.app.state.level, renderTime, 'SimulationScene');
    this.graphics.clear();
    this.syncSimulationTimeToState(renderTime);
    if (this.getSimulationRendererBackend() === 'threeMission3d') {
      this.graphics.setVisible(false);
      this.refreshThreeSimulationRenderer(renderTime);
    } else {
      this.hideThreeSimulationRenderer();
      this.graphics.setVisible(true);
      this.app.adapter.layout = drawMissionMap(this.graphics, {
        level: this.app.state.level,
        mission: this.app.state.mission,
        plan: this.app.state.plan,
        engine: this.engine,
        time: renderTime,
        guidanceSettings: {
          mode: 'simulation',
          showWater: this.app.state.ui.showWater,
          showROI: this.app.state.ui.showROI,
          showCurrents: this.app.state.ui.showCurrents,
          showHazards: this.app.state.ui.showHazards,
          showTerrain: this.app.state.ui.showTerrain,
          showPlannedPath: this.app.state.ui.showPlannedPath,
          showActualPath: this.app.state.ui.showActualPath,
          showGuidance: false,
          planningAnchor: null
        },
        mapBounds: getViewportMapBounds(this.app, {
          topPadding: 28,
          sidePadding: 34,
          bottomPadding: 18,
          fallbackTop: 132,
          fallbackBottom: 100
        }),
        mapCamera: this.app.state.ui.mapCamera
      });
    }
    traceSimulation(this.trace, {
      scene: 'SimulationScene',
      phase: 'ui.waypointPanel.update',
      simTime: renderTime,
      message: 'Refreshing simulation UI panels'
    });
    this.app.waypointPanel?.refresh(this.app.state, { engine: this.engine });
    this.app.summaryHud?.refresh(this.app.state, { engine: this.engine });
    this.app.agentPerformanceHud?.refresh(this.app.state, { engine: this.engine });
    this.refreshControls();
    this.renderSimulationTimeline();
    traceSimulation(this.trace, {
      scene: 'SimulationScene',
      phase: 'renderer.frame.end',
      simTime: renderTime,
      message: 'Simulation frame rendered'
    });
  }
  ensureThreeSimulationContainer() {
    if (this.threeSimulationContainer?.isConnected) return this.threeSimulationContainer;
    const host = this.app?.elements?.viewportShell ?? this.app?.elements?.gameContainer ?? globalThis.document?.getElementById?.('viewport-shell');
    if (!host?.appendChild) return null;
    const container = globalThis.document.createElement('div');
    container.className = 'three-mission-world-host';
    container.dataset.rendererBackend = 'threeMission3d';
    container.dataset.simulationRenderer = 'true';
    container.setAttribute('aria-label', 'Three.js live mission simulation renderer');
    host.appendChild(container);
    this.threeSimulationContainer = container;
    return container;
  }

  ensureThreeSimulationRenderer() {
    const container = this.ensureThreeSimulationContainer();
    if (!container) return null;
    container.hidden = false;
    if (!this.threeSimulationRenderer) {
      this.threeSimulationRenderer = createThreeMissionWorldRenderer(container, {
        camera: { preset: this.app.state.ui?.threeMissionCameraPreset ?? 'obliqueMission' },
        layerVisibility: this.threeSimulationLayerVisibilityPatch()
      });
    }
    resizeThreeMissionWorldRenderer(this.threeSimulationRenderer, container.clientWidth, container.clientHeight);
    return this.threeSimulationRenderer;
  }

  hideThreeSimulationRenderer() {
    if (this.threeSimulationContainer) this.threeSimulationContainer.hidden = true;
  }

  disposeThreeSimulationRenderer() {
    disposeThreeMissionWorldRenderer(this.threeSimulationRenderer);
    this.threeSimulationRenderer = null;
    this.threeSimulationContainer?.remove?.();
    this.threeSimulationContainer = null;
  }

  buildSimulationWorldViewModelForScene(renderTime = null) {
    const input = simulationWorldRenderInputFromScene(this, {
      activeTimeSeconds: renderTime ?? this.engine?.t ?? 0,
      displaySettings: {
        rendererBackend: 'threeMission3d',
        cameraPreset: this.app.state.ui?.threeMissionCameraPreset ?? 'obliqueMission',
        ...(this.threeSimulationLayerVisibilityPatch())
      }
    });
    this.simulationRenderInput = input;
    const viewModel = buildSimulationWorldRenderViewModel(input);
    this.simulationRenderViewModel = viewModel;
    return viewModel;
  }

  refreshThreeSimulationRenderer(renderTime = null) {
    const renderer = this.ensureThreeSimulationRenderer();
    const viewModel = this.buildSimulationWorldViewModelForScene(renderTime);
    if (!renderer) {
      this.updateSimulationRenderDebug({ activeBackend: 'threeMission3d', threeMounted: false, viewModel, parityWarnings: ['Three simulation renderer could not mount DOM container.'] });
      return;
    }
    setThreeMissionWorldCamera(renderer, { preset: this.app.state.ui?.threeMissionCameraPreset ?? 'obliqueMission' });
    setThreeMissionLayerVisibility(renderer, this.threeSimulationLayerVisibilityPatch());
    updateThreeMissionWorldRenderer(renderer, viewModel);
    resizeThreeMissionWorldRenderer(renderer, this.threeSimulationContainer?.clientWidth, this.threeSimulationContainer?.clientHeight);
    const validation = validateSimulationWorldRenderViewModel(viewModel);
    const parityWarnings = [...(validation.warnings ?? [])];
    if (!validation.valid) parityWarnings.push(...validation.errors);
    this.updateSimulationRenderDebug({ activeBackend: 'threeMission3d', threeMounted: true, viewModel, renderer, parityWarnings });
  }

  threeSimulationLayerVisibilityPatch() {
    const layers = this.app.state.ui?.threeMissionLayers ?? {};
    return {
      bathymetry: layers.bathymetry !== false,
      waterSurface: layers.waterSurface !== false,
      depthLayers: layers.depthLayers !== false,
      scalarField: layers.scalarField !== false && this.app.state.ui?.showROI !== false,
      currentVectors: layers.currentVectors !== false && this.app.state.ui?.showCurrents !== false,
      hazards: layers.hazards !== false && this.app.state.ui?.showHazards !== false,
      constraints: layers.constraints !== false && this.app.state.ui?.showTerrain !== false,
      dropZones: layers.dropZones !== false,
      gliders: layers.gliders !== false,
      waypoints: layers.waypoints !== false,
      routes: layers.routes !== false && this.app.state.ui?.showPlannedPath !== false,
      realizedTrajectories: layers.realizedTrajectories !== false && this.app.state.ui?.showActualPath !== false,
      observations: layers.observations !== false,
      surfacingEvents: layers.surfacingEvents !== false,
      routeStatus: layers.routeStatus !== false,
      priorityTargets: layers.priorityTargets !== false,
      selection: layers.selection !== false,
      guidance: false,
      interaction: false
    };
  }

  updateSimulationRenderDebug({ activeBackend, threeMounted, viewModel, renderer = null, parityWarnings = [] } = {}) {
    const summary = simulationWorldRenderViewModelSummary(viewModel ?? {});
    const rendererSummary = renderer ? threeMissionWorldRendererSummary(renderer) : null;
    const status = viewModel?.simulationStatus ?? {};
    const progress = viewModel?.missionProgress ?? {};
    globalThis.ANCHOR_SIMULATION_RENDER_DEBUG = {
      version: 'mig-r1',
      activeBackend: activeBackend ?? this.getSimulationRendererBackend(),
      threeMounted: threeMounted === true,
      simulationStatus: status.status ?? null,
      paused: status.paused !== false,
      speedScale: Number(this.app.state.playback?.speedScale ?? 1) || 1,
      simulationTimeSeconds: status.timeSeconds ?? this.engine?.t ?? 0,
      renderedSimulationTimeSeconds: viewModel?.activeTimeSeconds ?? null,
      renderedScalarFieldTimeSeconds: viewModel?.scalarFieldLayer?.timeSeconds ?? null,
      renderedCurrentFieldTimeSeconds: viewModel?.vectorFieldLayer?.timeSeconds ?? null,
      selectedAgentId: this.app.state.selectedAgentId ?? null,
      agentCount: this.engine?.agents?.length ?? 0,
      activeAgentCount: progress.activeAgentCount ?? 0,
      completedAgentCount: progress.completedAgentCount ?? 0,
      failedAgentCount: progress.failedAgentCount ?? 0,
      plannedRouteCount: summary.routeCount ?? 0,
      realizedTrajectoryCount: summary.realizedTrajectoryCount ?? 0,
      realizedTrajectoryPointCount: summary.realizedTrajectoryPointCount ?? 0,
      sampledTrajectoryPointCount: summary.sampledTrajectoryPointCount ?? 0,
      observationCount: summary.observationCount ?? 0,
      surfacingEventCount: summary.surfacingEventCount ?? 0,
      communicationEventCount: summary.communicationEventCount ?? 0,
      routeFailureCount: summary.routeFailureCount ?? 0,
      threeObjectCount: rendererSummary?.threeObjectCount ?? 0,
      threeGeometryCount: rendererSummary?.threeGeometryCount ?? 0,
      threeMaterialCount: rendererSummary?.threeMaterialCount ?? 0,
      threeTextureCount: rendererSummary?.threeTextureCount ?? 0,
      objectGrowthWarnings: rendererSummary?.objectGrowthWarnings ?? [],
      inputSummary: simulationWorldRenderInputSummary(this.simulationRenderInput ?? {}),
      rendererSummary,
      parityWarnings,
      ownsSimulationState: false,
      advancesSimulationClock: false,
      computesVehicleMotion: false,
      generatesObservations: false,
      ownsScoring: false,
      changesOfficialBrowserScoring: false,
      exposesHiddenTruth: false,
      phaserWorldRendererActive: this.getSimulationRendererBackend() === 'legacyPhaser2d',
      legacyPhaserFallbackEnabled: legacyPhaserMissionRendererEnabled(),
      usesNewPlanner: false,
      usesRouteOptimizer: false,
      usesMARL: false
    };
    this.refreshMigrationDebug();
  }
  syncSimulationTimeToState(time = null) {
    const renderTime = time ?? getActiveRenderTime(this.app.state, this.engine);
    this.app.state.simulationTime = renderTime;
    this.app.state.planningTime = renderTime;
    this.app.state.selectedWindow = getWindowForTime(this.app.state.level, renderTime);
    this.app.state.playback.time = renderTime;
    this.updateSimulationRunState();
  }

  ensureSimulationState() {
    this.app.state.simulation ??= {};
    return this.app.state.simulation;
  }

  updateSimulationRunState() {
    const simulation = this.ensureSimulationState();
    simulation.running = Boolean(this.engine?.running);
    simulation.paused = Boolean(this.engine && !this.engine.running);
  }

  setSimulationWaitState(reason, flags = {}) {
    const simulation = this.ensureSimulationState();
    this.updateSimulationRunState();
    simulation.waitingForPlayerDecision = Boolean(flags.waitingForPlayerDecision ?? reason);
    simulation.waitingForImport = Boolean(flags.waitingForImport ?? simulation.waitingForImport);
    simulation.waitingForExternalSolver = Boolean(flags.waitingForExternalSolver ?? simulation.waitingForExternalSolver);
    simulation.pauseReason = reason ?? simulation.pauseReason ?? null;
  }

  clearSimulationWaitState() {
    const simulation = this.ensureSimulationState();
    this.updateSimulationRunState();
    simulation.waitingForPlayerDecision = false;
    simulation.waitingForImport = false;
    simulation.waitingForExternalSolver = false;
    simulation.pauseReason = null;
  }

  syncSimulationDecisionWaitState() {
    if (this.engine?.awaitingSurfaceDecision || this.app.state.surfaceDecision?.active) {
      this.setSimulationWaitState('surfaceDecision');
      return;
    }
    if (this.engine?.routeFailureDecision?.active || this.app.state.routeFailureDecision?.active) {
      this.setSimulationWaitState('routeFailureDecision');
      return;
    }
    const simulation = this.ensureSimulationState();
    if (simulation.waitingForImport || simulation.waitingForExternalSolver) {
      this.updateSimulationRunState();
      return;
    }
    this.clearSimulationWaitState();
  }

  setSimulationImportWait(active, context = 'surfaceDecision') {
    const reason = context === 'routeFailure' ? 'routeFailureDecision' : 'surfaceDecision';
    if (active) {
      this.setSimulationWaitState(reason, { waitingForImport: true, waitingForExternalSolver: false });
      return;
    }
    const simulation = this.ensureSimulationState();
    simulation.waitingForImport = false;
    this.syncSimulationDecisionWaitState();
  }

  setSimulationExternalSolverWait(active, context = 'surfaceDecision') {
    const reason = context === 'routeFailure' ? 'routeFailureDecision' : 'surfaceDecision';
    if (active) {
      this.setSimulationWaitState(reason, { waitingForExternalSolver: true });
      return;
    }
    const simulation = this.ensureSimulationState();
    simulation.waitingForExternalSolver = false;
    this.syncSimulationDecisionWaitState();
  }

  refreshControls() {
    const summary = this.engine.getSummary();
    if (this.statusText) this.statusText.setText(this.engine.complete
      ? (this.engine.aborted
        ? `Simulation stopped: ${formatAbortReason(this.engine.abortReason)}.`
        : `Complete at ${summary.elapsedTime}s. Final score ${summary.finalScore}.`)
      : `Time ${summary.elapsedTime}s, energy ${summary.energyUsed}, samples ${summary.sampledCells}.`);
    if (this.summaryText) {
      traceSimulation(this.trace, {
        scene: 'SimulationScene',
        phase: 'ui.eventLog.update',
        simTime: this.engine.t,
        message: 'Updating recent event log',
        details: { renderedEvents: Math.min(5, this.engine.events.length), totalEvents: this.engine.events.length }
      });
      const events = this.engine.events.slice(-5).map((event) => `${formatMissionTime(this.app.state.level, event.t)} ${event.type}`).join('\n');
      this.summaryText.setText(`Final ${summary.finalScore}\nEnergy ${summary.energyUsed}\nHazards ${summary.hazardsHit + summary.mobileHazardsHit}\nSamples ${summary.sampledCells}\nStars ${summary.priorityTargets?.captured ?? 0}/${summary.priorityTargets?.available ?? 0}\n\nRecent Events\n${events || 'None'}`);
    }
    const status = this.app.elements.consoleRoot?.querySelector('#simulation-console-status');
    const consoleSummary = this.app.elements.consoleRoot?.querySelector('#simulation-console-summary');
    const consoleEvents = this.app.elements.consoleRoot?.querySelector('#simulation-console-events');
    if (status) status.textContent = this.engine.routeFailureDecision?.active
      ? 'Route failure decision required'
      : this.engine.aborted
      ? `Stopped: ${formatAbortReason(this.engine.abortReason)}`
      : (summary.stopReason?.code && summary.stopReason.code !== 'complete'
        ? summary.stopReason.title
        : (this.engine.complete ? `Complete: ${summary.finalScore}` : `${this.engine.running ? 'Running' : 'Paused'} at ${summary.elapsedTime}s`));
    if (consoleSummary) {
      consoleSummary.textContent = this.engine.routeFailureDecision?.active
        ? routeFailureConsoleText(this.engine.routeFailureDecision)
        : summary.stopReason?.code && summary.stopReason.code !== 'complete'
        ? stopReasonConsoleText(summary.stopReason)
        : this.engine.aborted
          ? 'Fix the plan by moving or deleting unreachable waypoints, then run again.'
          : `Energy ${summary.energyUsed} | Samples ${summary.sampledCells} | Stars ${summary.priorityTargets?.captured ?? 0}/${summary.priorityTargets?.available ?? 0} | Hazards ${summary.hazardsHit + summary.mobileHazardsHit}`;
    }
    if (consoleEvents) {
      const events = this.engine.events.slice(-5);
      consoleEvents.innerHTML = events.length
        ? events.map((event) => `<div class="hud-muted">${escapeHtml(formatMissionTime(this.app.state.level, event.t))} ${escapeHtml(event.type)}</div>`).join('')
        : '<div class="hud-muted">No events yet.</div>';
    }
  }

  renderSimulationTimeline() {
    const root = this.app.elements.overlay?.bottomTimeline;
    if (!root || !this.engine) return;
    const config = getTimeConfig(this.app.state.level);
    const duration = config.duration || 1;
    const time = clampTime(this.app.state.level, this.engine.t ?? this.app.state.planningTime ?? 0);
    const pct = Math.max(0, Math.min(100, (time / duration) * 100));
    const prevFrame = getPrevTimelineFrameIndex(this.app.state.level, this.app.state.mission, time);
    const nextFrame = getNextTimelineFrameIndex(this.app.state.level, this.app.state.mission, time);
    root.innerHTML = `
      <section class="hud-panel timeline-overlay simulation-timeline">
        <div class="timeline-readout">${escapeHtml(formatMissionTime(this.app.state.level, time))}<br><span class="hud-muted">Window ${Number(this.app.state.selectedWindow ?? 0)} | ${escapeHtml(this.engine.running ? 'Playing' : this.engine.complete ? 'Complete' : 'Paused')}</span></div>
        <input data-action="simulation-time-slider" type="range" min="0" max="${duration}" step="${Number(config.dt ?? 0.25) || 'any'}" value="${time}" />
        <div class="timeline-markers" aria-hidden="true">${simulationTimelineMarkers(this.app.state, duration)}</div>
        <div class="simulation-playhead" style="left:${pct}%"></div>
        <div class="timeline-buttons simulation-playback-buttons">
          <button data-action="sim-start">Start</button>
          <button data-action="sim-prev">Prev</button>
          <button data-action="sim-next">Next</button>
          <button data-action="sim-end">End</button>
          <button data-action="sim-play">${this.engine.running ? 'Pause' : 'Play'}</button>
          <button data-action="sim-step">Step</button>
          <button data-action="sim-finish">Finish</button>
        </div>
      </section>
    `;
    const slider = root.querySelector('[data-action="simulation-time-slider"]');
    slider?.addEventListener('change', () => this.seekSimulationTime(Number(slider.value)));
    root.querySelector('[data-action="sim-start"]')?.addEventListener('click', () => this.goToSimulationFrame(0));
    root.querySelector('[data-action="sim-prev"]')?.addEventListener('click', () => this.goToSimulationFrame(prevFrame));
    root.querySelector('[data-action="sim-next"]')?.addEventListener('click', () => this.goToSimulationFrame(nextFrame));
    root.querySelector('[data-action="sim-end"]')?.addEventListener('click', () => this.finishSimulation());
    root.querySelector('[data-action="sim-play"]')?.addEventListener('click', () => this.togglePlay());
    root.querySelector('[data-action="sim-step"]')?.addEventListener('click', () => this.stepOnce());
    root.querySelector('[data-action="sim-finish"]')?.addEventListener('click', () => this.finishSimulation());
  }

  notifyAbortIfNeeded() {
    if (!this.engine?.aborted || this.abortNoticeShown) return;
    this.abortNoticeShown = true;
    this.app.toast?.(`Simulation stopped safely. Reason: ${formatAbortReason(this.engine.abortReason)}.`, 'warning');
    this.renderAbortActions();
  }

  notifyStopReasonIfNeeded() {
    const stop = this.engine?.getSummary?.().stopReason;
    if (!stop || stop.code === 'complete' || this.engine?.aborted || this.stopReasonNoticeShown) return;
    this.stopReasonNoticeShown = true;
    this.app.toast?.(`${stop.title} ${stop.suggestedFix}`, 'warning');
  }

  handleWatchdogAbort(snapshot) {
    if (!snapshot || this.engine?.aborted) return;
    console.warn('[simulation-watchdog]', snapshot);
    traceSimulation(this.trace, {
      scene: 'SimulationScene',
      phase: 'abort',
      simTime: this.engine.t,
      message: `Watchdog abort: ${snapshot.reason}`,
      details: snapshot
    });
    this.trace?.warn?.(snapshot.reason, { watchdogSnapshot: snapshot });
    this.engine.abortSimulation('simulationWatchdogAbort', { watchdogSnapshot: { ...snapshot, trace: this.trace?.snapshot?.() ?? [] } });
    this.syncResult();
    this.refresh();
    this.renderAbortActions(snapshot);
    this.app.toast?.(`Simulation stopped safely. Reason: ${formatAbortReason(snapshot.reason)}.`, 'warning');
  }

  buildManualWatchdogSnapshot(reason, extra = {}) {
    return this.watchdog?.createAbortSnapshot?.(reason, {
      engine: this.engine,
      sceneName: 'SimulationScene',
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      mode: this.app.state.mode,
      gameState: this.app.state,
      simulationState: this.app.state.simulation,
      waitingForPlayerDecision: Boolean(this.app.state.simulation?.waitingForPlayerDecision),
      waitingForImport: Boolean(this.app.state.simulation?.waitingForImport),
      waitingForExternalSolver: Boolean(this.app.state.simulation?.waitingForExternalSolver),
      surfaceDecisionActive: Boolean(this.app.state.surfaceDecision?.active || this.engine?.awaitingSurfaceDecision),
      routeFailureDecisionActive: Boolean(this.app.state.routeFailureDecision?.active || this.engine?.routeFailureDecision?.active),
      surfaceModalVisible: Boolean(this.modal?.isVisible?.()),
      surfaceFallbackVisible: this.isSurfaceFallbackVisible(),
      surfaceDecisionUiAvailable: this.isSurfaceDecisionUiVisible(),
      renderObjectCount: getRenderObjectCount(this),
      trace: this.trace?.snapshot?.() ?? [],
      ...extra
    }) ?? { type: 'simulationWatchdogAbort', reason, ...extra };
  }

  renderAbortActions(snapshot = null) {
    const root = this.app.elements.consoleRoot?.querySelector('#simulation-abort-actions');
    if (!root) return;
    const reason = snapshot?.reason ?? this.engine?.debug?.watchdogAbort?.reason ?? this.engine?.abortReason ?? 'safety guard triggered';
    root.hidden = false;
    root.innerHTML = `
      <h2>Simulation stopped safely</h2>
      <p class="hud-muted">Reason: ${escapeHtml(formatAbortReason(reason))}. You can revise the plan or export debug data.</p>
      <button class="console-button primary" data-action="abort-planning">Return To Planning</button>
      <button class="console-button" data-action="abort-export">Export Debug Result</button>
      <button class="console-button secondary" data-action="abort-menu">Main Menu</button>
    `;
    root.querySelector('[data-action="abort-planning"]')?.addEventListener('click', () => this.scene.start('MissionWorkspaceScene'));
    root.querySelector('[data-action="abort-export"]')?.addEventListener('click', () => this.exportDebugResult());
    root.querySelector('[data-action="abort-menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
  }

  exportDebugResult() {
    this.syncResult();
    const result = this.app.state.result ?? this.engine.getResult();
    result.debug ??= {};
    result.debug.trace = this.trace?.snapshot?.() ?? [];
    result.debug.currentSimTime = this.engine?.t ?? null;
    result.debug.lastActiveWaypoints = (this.engine?.agents ?? []).map((agent) => ({
      agentId: agent.id,
      activeWaypointIndex: agent.currentWaypointIndex,
      activeWaypoint: agent.activeWaypoint ?? null
    }));
    downloadJSON('anchor_debug_result.json', result);
  }

  isSurfaceFallbackVisible() {
    const root = this.app.elements.consoleRoot?.querySelector('#simulation-surface-decision-actions');
    return Boolean(root && !root.hidden);
  }

  isSurfaceDecisionUiVisible() {
    const phaserModalVisible = Boolean(this.modal?.isVisible?.());
    const fallbackVisible = this.isSurfaceFallbackVisible();
    if (this.app.state.surfaceDecision) {
      this.app.state.surfaceDecision.modalVisible = phaserModalVisible;
      this.app.state.surfaceDecision.fallbackVisible = fallbackVisible;
      this.app.state.surfaceDecision.uiMounted = phaserModalVisible || fallbackVisible;
    }
    return Boolean(phaserModalVisible || isSurfaceDecisionModalVisible(this.app.state, this.app.elements.consoleRoot));
  }

  refreshSurfaceDecision() {
    const decision = this.engine.awaitingSurfaceDecision;
    this.app.state.surfaceDecision = decision ? normalizeSurfaceDecisionState(this.app.state.level, decision, {
      modalVisible: Boolean(this.modal?.isVisible?.()),
      fallbackVisible: this.isSurfaceFallbackVisible()
    }) : null;
    if (!decision) {
      this.clearSurfaceDecisionFallback();
      this.syncSimulationDecisionWaitState();
      return;
    }
    this.setSimulationWaitState('surfaceDecision');
    const decisionKey = `${decision.t}:${decision.agents?.map((agent) => agent.agentId).join(',')}`;
    debugSurfaceDecision('surface state created', {
      decisionKey,
      time: decision.t ?? decision.time,
      agentId: this.app.state.surfaceDecision?.agentId ?? null
    });
    if (this.activeSurfaceDecisionKey === decisionKey) {
      this.ensureSurfaceDecisionFallback();
      return;
    }
    this.activeSurfaceDecisionKey = decisionKey;
    const first = decision.agents?.[0];
    const agent = this.engine.agents?.find((candidate) => candidate.id === first?.agentId);
    const drift = first?.expected && first?.actual
      ? Math.hypot(Number(first.actual.x) - Number(first.expected.x), Number(first.actual.y) - Number(first.expected.y))
      : 0;
    debugSurfaceDecision('surface modal render attempted', { decisionKey, agentId: first?.agentId ?? null });
    this.modal.show({
      title: 'Glider Surfaced',
      body: `${first?.agentId ?? 'Glider'} surfaced at ${formatMissionTime(this.app.state.level, decision.t)}.\nExpected position: ${formatPoint(first?.expected)}\nActual position: ${formatPoint(first?.actual)}\nBattery remaining: ${formatMetric(agent?.battery)}\nSamples collected: ${formatMetric(agent?.sampleScore)}${drift > 1 ? '\nWarning: actual position differs from expected by more than one cell.' : ''}\n\nContinue, update future waypoints, or finish the mission.`,
      buttons: [
        { label: 'Continue Mission', onClick: () => this.continueFromSurfaceDecision() },
        { label: 'Update Waypoints / Replan', onClick: () => this.updateWaypointsFromSurface() },
        { label: 'Export Observation Data', onClick: () => this.exportObservationData('surfaceDecision'), close: false },
        { label: 'Import Waypoint Data', onClick: () => this.importWaypointData('surfaceDecision'), close: false },
        { label: 'Finish Mission / Debrief', onClick: () => this.finishFromSurface() }
      ]
    });
    traceSimulation(this.trace, {
      scene: 'SimulationScene',
      phase: 'surfacing.modal.show',
      simTime: decision.t,
      agentId: first?.agentId ?? null,
      message: 'Surface decision modal requested',
      details: { decisionKey }
    });
    this.ensureSurfaceDecisionFallback();
  }

  ensureSurfaceDecisionFallback() {
    if (!this.engine.awaitingSurfaceDecision) return;
    this.renderSurfaceDecisionFallback(this.engine.awaitingSurfaceDecision);
    if (this.modal?.isVisible?.()) {
      traceSimulation(this.trace, {
        scene: 'SimulationScene',
        phase: 'surfacing.modal.visible',
        simTime: this.engine.t,
        message: 'Surface decision modal visible',
        details: { decisionKey: this.activeSurfaceDecisionKey }
      });
      debugSurfaceDecision('surface modal DOM visible', { decisionKey: this.activeSurfaceDecisionKey });
      return;
    }
    if (this.surfaceFallbackShownFor === this.activeSurfaceDecisionKey) return;
    this.surfaceFallbackShownFor = this.activeSurfaceDecisionKey;
    traceSimulation(this.trace, {
      scene: 'SimulationScene',
      phase: 'surfacing.modal.fallback',
      simTime: this.engine.t,
      message: 'Surface decision modal fallback shown',
      details: { decisionKey: this.activeSurfaceDecisionKey }
    });
    debugSurfaceDecision('surface fallback visible', { decisionKey: this.activeSurfaceDecisionKey });
    this.app.toast?.('Surface decision required. Use the Simulation Console controls to continue, replan, export, import, or finish.', 'warning');
    const status = this.app.elements.consoleRoot?.querySelector('#simulation-console-status');
    const summary = this.app.elements.consoleRoot?.querySelector('#simulation-console-summary');
    if (status) status.textContent = 'Surface decision required';
    if (summary) summary.textContent = 'Surface controls are available in the Simulation Console.';
  }

  renderSurfaceDecisionFallback(decision) {
    const root = this.app.elements.consoleRoot?.querySelector('#simulation-surface-decision-actions');
    if (!root) return;
    const first = decision.agents?.[0];
    const agent = this.engine.agents?.find((candidate) => candidate.id === first?.agentId);
    root.hidden = false;
    root.dataset.surfaceDecisionFallback = 'true';
    root.innerHTML = `
      <h2>Surface Decision</h2>
      <p class="hud-muted">${escapeHtml(first?.agentId ?? 'Glider')} surfaced at ${escapeHtml(formatMissionTime(this.app.state.level, decision.t ?? decision.time))}. Actual ${escapeHtml(formatPoint(first?.actual ?? decision.actual))}; battery ${escapeHtml(formatMetric(agent?.battery))}.</p>
      <button class="console-button primary" data-action="surface-continue">Continue Mission</button>
      <button class="console-button" data-action="surface-update">Update Waypoints / Replan</button>
      <button class="console-button" data-action="surface-export-observation">Export Observation Data</button>
      <button class="console-button" data-action="surface-import-waypoints">Import Waypoint Data</button>
      <button class="console-button secondary" data-action="surface-debrief">Finish Mission / Debrief</button>
    `;
    root.querySelector('[data-action="surface-continue"]')?.addEventListener('click', () => this.continueFromSurfaceDecision());
    root.querySelector('[data-action="surface-update"]')?.addEventListener('click', () => this.updateWaypointsFromSurface());
    root.querySelector('[data-action="surface-export-observation"]')?.addEventListener('click', () => this.exportObservationData('surfaceDecision'));
    root.querySelector('[data-action="surface-import-waypoints"]')?.addEventListener('click', () => this.importWaypointData('surfaceDecision'));
    root.querySelector('[data-action="surface-debrief"]')?.addEventListener('click', () => this.finishFromSurface());
    if (this.app.state.surfaceDecision) {
      this.app.state.surfaceDecision.fallbackVisible = true;
      this.app.state.surfaceDecision.uiMounted = true;
    }
  }

  clearSurfaceDecisionFallback() {
    const root = this.app.elements.consoleRoot?.querySelector('#simulation-surface-decision-actions');
    if (root) {
      root.hidden = true;
      root.innerHTML = '';
    }
    this.activeSurfaceDecisionKey = null;
    this.surfaceFallbackShownFor = null;
  }

  refreshRouteFailureDecision() {
    const decision = this.engine.routeFailureDecision;
    this.app.state.routeFailureDecision = decision?.active ? decision : null;
    if (!decision?.active) {
      this.clearRouteFailureFallback();
      this.syncSimulationDecisionWaitState();
      return;
    }
    this.setSimulationWaitState('routeFailureDecision');
    const decisionKey = `${decision.agentId}:${decision.time}:${decision.reason}:${decision.failedWaypointIndex}`;
    if (this.activeRouteFailureKey === decisionKey) {
      this.ensureRouteFailureFallback();
      return;
    }
    this.activeRouteFailureKey = decisionKey;
    this.engine.pause();
    this.syncResult();
    this.refresh();
    const buttons = [
      { label: 'Replan From Here', onClick: () => this.replanFromRouteFailure() },
      decision.canSkip ? { label: 'Skip Failed Waypoint', onClick: () => this.skipFailedWaypoint() } : null,
      { label: 'Export Observation Data', onClick: () => this.exportObservationData('routeFailure'), close: false },
      { label: 'Import Waypoint Data', onClick: () => this.importWaypointData('routeFailure'), close: false },
      { label: 'End Mission / Debrief', onClick: () => this.finishFromRouteFailure() },
      { label: 'Main Menu', onClick: () => this.scene.start('MainMenuScene') }
    ].filter(Boolean);
    this.modal.show({
      title: routeFailureTitle(decision.reason),
      body: routeFailureBody(this.app.state.level, this.app.state.mission, decision),
      buttons
    });
    traceSimulation(this.trace, {
      scene: 'SimulationScene',
      phase: 'routeFailure.modal.show',
      simTime: decision.time,
      agentId: decision.agentId,
      message: 'Route failure decision modal requested',
      details: { decisionKey, reason: decision.reason }
    });
    this.ensureRouteFailureFallback();
  }

  ensureRouteFailureFallback() {
    const decision = this.engine.routeFailureDecision;
    if (!decision?.active) return;
    this.renderRouteFailureFallback(decision);
    if (this.modal?.isVisible?.()) return;
    if (this.routeFailureFallbackShownFor === this.activeRouteFailureKey) return;
    this.routeFailureFallbackShownFor = this.activeRouteFailureKey;
    this.app.toast?.('Route failure detected. Use the recovery buttons in the Simulation Console.', 'warning');
  }

  renderRouteFailureFallback(decision) {
    const root = this.app.elements.consoleRoot?.querySelector('#simulation-route-failure-actions');
    if (!root) return;
    root.hidden = false;
    root.innerHTML = `
      <h2>Route Failure</h2>
      <p class="hud-muted">Reason: ${escapeHtml(labelReason(decision.reason))}${Number.isFinite(Number(decision.failedWaypointIndex)) ? ` after Waypoint ${Number(decision.failedWaypointIndex) + 1}` : ''}.</p>
      <button class="console-button primary" data-action="failure-replan">Replan From Here</button>
      ${decision.canSkip ? '<button class="console-button" data-action="failure-skip">Skip Failed Waypoint</button>' : ''}
      <button class="console-button" data-action="failure-export-observation">Export Observation Data</button>
      <button class="console-button" data-action="failure-import-waypoints">Import Waypoint Data</button>
      <button class="console-button" data-action="failure-debrief">End Mission / Debrief</button>
      <button class="console-button secondary" data-action="failure-menu">Main Menu</button>
    `;
    root.querySelector('[data-action="failure-replan"]')?.addEventListener('click', () => this.replanFromRouteFailure());
    root.querySelector('[data-action="failure-skip"]')?.addEventListener('click', () => this.skipFailedWaypoint());
    root.querySelector('[data-action="failure-export-observation"]')?.addEventListener('click', () => this.exportObservationData('routeFailure'));
    root.querySelector('[data-action="failure-import-waypoints"]')?.addEventListener('click', () => this.importWaypointData('routeFailure'));
    root.querySelector('[data-action="failure-debrief"]')?.addEventListener('click', () => this.finishFromRouteFailure());
    root.querySelector('[data-action="failure-menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
  }

  clearRouteFailureFallback() {
    const root = this.app.elements.consoleRoot?.querySelector('#simulation-route-failure-actions');
    if (root) {
      root.hidden = true;
      root.innerHTML = '';
    }
    this.activeRouteFailureKey = null;
    this.routeFailureFallbackShownFor = null;
  }

  exportObservationData(context = 'surfaceDecision') {
    this.setSimulationWaitState(context === 'routeFailure' ? 'routeFailureDecision' : 'surfaceDecision');
    this.setSimulationExternalSolverWait(true, context);
    const decision = context === 'routeFailure'
      ? this.engine.routeFailureDecision
      : this.engine.awaitingSurfaceDecision;
    downloadJSON('anchor.surface-observation.json', buildSurfaceObservationExport({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      engine: this.engine,
      context,
      decision
    }));
    this.app.toast?.('Surface observation data exported.', 'success');
  }

  importWaypointData(context = 'surfaceDecision') {
    this.setSimulationImportWait(true, context);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.hidden = true;
    document.body.appendChild(input);
    const clearImportWait = () => {
      this.setSimulationImportWait(false, context);
      input.remove();
    };
    input.oncancel = clearImportWait;
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        const selectedAgentId = this.importTargetAgentId(context);
        const imported = importWaypointDataJson(await readJSONFile(file), {
          level: this.app.state.level,
          mission: this.app.state.mission,
          plan: this.app.state.plan,
          instanceId: this.app.state.level?.instanceId,
          missionId: this.app.state.mission?.missionId ?? this.app.state.mission?.id,
          agentId: selectedAgentId,
          currentTime: this.engine?.t ?? 0,
          engineAgents: this.engine?.agents ?? [],
          surfacedAgents: this.currentSurfacedAgents(context)
        });
        if (!imported.ok) {
          this.showWaypointImportSummary(imported, context, false);
          return;
        }
        const applied = applyImportedWaypointData(this.app.state.plan, imported, {
          currentTime: this.engine?.t ?? 0,
          engineAgents: this.engine?.agents ?? []
        }, { mode: 'replaceFuture' });
        if (!applied.ok) {
          this.showWaypointImportSummary({ ...imported, errors: [applied.message], summary: { ...imported.summary, validation: 'failed', errors: [applied.message] } }, context, false);
          return;
        }
        this.engine.plan = this.app.state.plan;
        this.app.state.importedPlanMetadata = this.app.state.plan.importMetadata ?? null;
        recomputeAllWaypointTiming(this.app.state);
        this.syncResult();
        this.refresh();
        this.app.waypointPanel?.refresh?.(this.app.state, { engine: this.engine });
        this.showWaypointImportSummary(imported, context, true, applied);
      } catch (error) {
        this.app.toast?.(error?.message ?? 'Waypoint import failed.', 'error');
      } finally {
        clearImportWait();
      }
    };
    input.click();
  }

  importTargetAgentId(context) {
    if (context === 'routeFailure') return this.engine.routeFailureDecision?.agentId ?? this.app.state.selectedAgentId;
    const decision = this.engine.awaitingSurfaceDecision;
    return decision?.agentId ?? decision?.agents?.[0]?.agentId ?? this.app.state.selectedAgentId;
  }

  currentSurfacedAgents(context) {
    if (context === 'routeFailure') {
      const decision = this.engine.routeFailureDecision;
      return decision?.currentPosition ? [{
        id: decision.agentId,
        agentId: decision.agentId,
        x: decision.currentPosition.x,
        y: decision.currentPosition.y,
        t: decision.time
      }] : [];
    }
    return (this.engine.awaitingSurfaceDecision?.agents ?? []).map((agent) => ({
      id: agent.agentId,
      agentId: agent.agentId,
      x: agent.actual?.x,
      y: agent.actual?.y,
      t: this.engine.awaitingSurfaceDecision?.t
    }));
  }

  showWaypointImportSummary(imported, context, applied, appliedResult = null) {
    const summary = imported?.summary ?? {};
    const changed = appliedResult?.changedAgents ?? [];
    const lines = [
      applied ? 'Waypoint data imported successfully.' : 'Waypoint data was not applied.',
      `Source: ${summary.sourceType ?? imported?.sourceType ?? 'unknown'}`,
      `Planner: ${summary.plannerName ?? imported?.planner?.name ?? 'unknown'}`,
      `Agents: ${summary.agents ?? changed.length ?? 0}`,
      `Waypoints: ${summary.waypointCount ?? changed.reduce((sum, item) => sum + item.loaded, 0)}`,
      `Anchor: ${summary.anchorMode ?? changed[0]?.anchorMode ?? 'actualSurfacePosition'}`,
      `Validation: ${summary.validation ?? (applied ? 'passed' : 'failed')}`,
      ...(imported?.fairness?.usesOracle ? ['Warning: imported plan used hidden truth/oracle data. This attempt will be marked oracle-assisted.'] : []),
      ...((summary.errors ?? imported?.errors ?? []).slice(0, 5).map((item) => `Error: ${item}`)),
      ...((summary.warnings ?? imported?.warnings ?? []).slice(0, 6).map((item) => `Warning: ${item}`))
    ];
    const buttons = applied
      ? [
        { label: 'Continue Mission', onClick: () => context === 'routeFailure' ? this.continueAfterRouteFailure() : this.continueFromSurfaceDecision() },
        { label: 'Close', onClick: () => this.modal.hide() }
      ]
      : [{ label: 'Close', onClick: () => this.modal.hide() }];
    this.modal.show({
      title: 'Imported Waypoint Data',
      body: lines.join('\n'),
      buttons
    });
  }

  replanFromRouteFailure() {
    const decision = this.engine.routeFailureDecision;
    if (!decision?.active) return;
    const selectedAgentId = decision.agentId ?? this.app.state.selectedAgentId;
    this.engine.clearRouteFailureForReplan();
    this.syncResult();
    const resumeState = this.engine.createResumeState();
    resumeState.missionState ??= {};
    resumeState.missionState.aborted = false;
    resumeState.missionState.abortReason = null;
    resumeState.routeFailureDecision = null;
    this.app.state.simulationResume = resumeState;
    this.app.state.surfacedAgents = this.engine.agents.map((agent) => ({
      id: agent.id,
      agentId: agent.id,
      x: agent.x,
      y: agent.y,
      t: this.engine.t,
      heading: agent.heading,
      commsState: agent.commsState
    }));
    this.app.state.selectedAgentId = selectedAgentId;
    this.app.state.ui.hoverCell = null;
    this.app.state.ui.selectedWaypoint = null;
    this.app.state.ui.planningAnchor = this.app.state.surfacedAgents.find((agent) => agent.id === selectedAgentId) ?? null;
    this.app.state.routeFailureDecision = null;
    this.clearSimulationWaitState();
    this.app.state.mode = 'planning';
    this.app.state.planningTime = this.engine.t;
    this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.engine.t);
    this.app.toast?.(`Replanning from ${selectedAgentId ?? 'glider'} position at ${formatMissionTime(this.app.state.level, this.engine.t)}.`, 'warning');
    this.scene.start('MissionWorkspaceScene');
  }

  skipFailedWaypoint() {
    this.engine.skipFailedWaypoint();
    this.app.state.routeFailureDecision = null;
    this.clearRouteFailureFallback();
    this.clearSimulationWaitState();
    this.watchdog?.reset();
    this.syncResult();
    this.refresh();
  }

  continueAfterRouteFailure() {
    this.engine.continueAfterRouteFailure();
    this.app.state.routeFailureDecision = null;
    this.clearRouteFailureFallback();
    this.clearSimulationWaitState();
    this.watchdog?.reset();
    this.syncResult();
    this.refresh();
  }

  finishFromRouteFailure() {
    if (this.engine.routeFailureDecision?.active) this.engine.finishFromRouteFailure();
    this.syncResult();
    clearPlanningOverlayState(this.app.state);
    this.graphics?.clear();
    this.app.state.routeFailureDecision = null;
    this.clearSimulationWaitState();
    this.app.state.mode = 'debrief';
    this.scene.start('DebriefScene');
  }

  continueFromSurfaceDecision() {
    traceSimulation(this.trace, { scene: 'SimulationScene', phase: 'surfacing.continue', simTime: this.engine.t, message: 'Continue surface decision clicked' });
    this.engine.continueFromSurface();
    this.app.state.surfaceDecision = null;
    this.clearSurfaceDecisionFallback();
    this.clearSimulationWaitState();
    this.watchdog?.reset();
    this.refreshControls();
  }

  updateWaypointsFromSurface() {
    const decision = this.engine.awaitingSurfaceDecision;
    traceSimulation(this.trace, { scene: 'SimulationScene', phase: 'surfacing.update', simTime: this.engine.t, message: 'Update waypoints from surface clicked' });
    const selectedAgentId = decision?.agentId ?? decision?.agents?.[0]?.agentId ?? this.app.state.selectedAgentId;
    this.engine.recordReplanDecision();
    this.syncResult();
    this.app.state.simulationResume = this.engine.createResumeState();
    this.app.state.surfacedAgents = this.engine.agents.map((agent) => ({
      id: agent.id,
      agentId: agent.id,
      x: agent.x,
      y: agent.y,
      t: this.engine.t,
      heading: agent.heading,
      commsState: agent.commsState
    }));
    console.log(this.app)
    const waypoints = getAgentPlan(this.app.state.plan, this.app.state.selectedAgentId).waypoints;
    for (const agent of this.engine.agents) {
      if (this.app.state.selectedAgentId == agent.id) {
        var engineAgent = agent;
        break;
      }
    }
    for (let agent = 0; agent <  this.app.state.mission.agents.length; agent++) {
      if (this.app.state.selectedAgentId == this.app.state.mission.agents[agent].id) {
        var missionAgentIndex = agent;
        break;
      }
    }
      for (const waypoint of engineAgent.completedWaypoints) {
        this.app.phaser.scene.scenes[3].hud.handlers.remove(this.app.state.agentId, waypoint.waypointIndex);
      }
    this.app.state.surfaceDecision = null;
    this.clearSurfaceDecisionFallback();
    this.clearSimulationWaitState();
    this.app.state.mode = 'planning';
    this.app.state.planningTime = this.engine.t;
    this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.engine.t);
    this.scene.start('MissionWorkspaceScene');
    this.app.state.selectedAgentId = selectedAgentId;
    this.app.state.ui.hoverCell = {
      x:waypoints[waypoints.length - 1].x,
      y:waypoints[waypoints.length - 1].y
    }
    this.app.state.plan.agentPlans[missionAgentIndex].selectedStart = {
      x:engineAgent.x,
      y:engineAgent.y
    };
    this.app.state.mission.agents[missionAgentIndex].deployment.selectedStart = {
      x:engineAgent.x,
      y:engineAgent.y
    };
    this.app.state.mission.agents[missionAgentIndex].start = {
      x:engineAgent.x,
      y:engineAgent.y
    };
    this.app.state.mission.agents[missionAgentIndex].deployment.mode = "fixedStart";
    this.app.phaser.scene.scenes[3].hud.handlers.focusWaypoint(this.app.state.selectedAgentId, waypoints.length - 1);
    this.app.state.ui.selectedWaypoint = {agentId: this.app.state.agentId, waypoint:waypoints[waypoints.length - 1]};
    this.app.state.ui.planningAnchor.x = waypoints[waypoints.length - 1].x;
    this.app.state.ui.planningAnchor.y = waypoints[waypoints.length - 1].y;
    this.refresh();
  }

  finishFromSurface() {
    traceSimulation(this.trace, { scene: 'SimulationScene', phase: 'surfacing.finish', simTime: this.engine?.t ?? 0, message: 'Finish from surface clicked' });
    if (this.engine.awaitingSurfaceDecision) this.engine.finishFromSurfaceDecision();
    else {
      this.finishSimulation();
      return;
    }
    this.syncResult();
    if (this.engine.complete) recordStochasticRun(this.app.state, this.app.state.result);
    clearPlanningOverlayState(this.app.state);
    this.graphics?.clear();
    this.app.state.surfaceDecision = null;
    this.clearSurfaceDecisionFallback();
    this.clearSimulationWaitState();
    this.app.state.mode = 'debrief';
    this.scene.start('DebriefScene');
  }

  bindSurfaceDecisionFallbacks() {
    this.onContinueSurfaceKey = () => {
      if (this.engine?.awaitingSurfaceDecision) this.continueFromSurfaceDecision();
    };
    this.onUpdateSurfaceKey = () => {
      if (this.engine?.awaitingSurfaceDecision) this.updateWaypointsFromSurface();
    };
    this.onFinishSurfaceKey = () => {
      if (this.engine?.awaitingSurfaceDecision) this.finishFromSurface();
    };
    this.input.keyboard?.on('keydown-C', this.onContinueSurfaceKey);
    this.input.keyboard?.on('keydown-U', this.onUpdateSurfaceKey);
    this.input.keyboard?.on('keydown-F', this.onFinishSurfaceKey);
  }

  unbindSurfaceDecisionFallbacks() {
    this.input.keyboard?.off('keydown-C', this.onContinueSurfaceKey);
    this.input.keyboard?.off('keydown-U', this.onUpdateSurfaceKey);
    this.input.keyboard?.off('keydown-F', this.onFinishSurfaceKey);
  }
}

function formatPoint(point) {
  if (!point) return 'N/A';
  return `(${Number(point.x).toFixed(1)}, ${Number(point.y).toFixed(1)})`;
}

function normalizeSurfaceDecisionState(level, decision, ui = {}) {
  const first = decision?.agents?.[0] ?? {};
  const time = decision?.t ?? decision?.time ?? 0;
  const expected = decision?.expected ?? first.expected ?? null;
  const actual = decision?.actual ?? first.actual ?? null;
  const uiMounted = Boolean(ui.modalVisible || ui.fallbackVisible);
  return {
    active: true,
    agentId: decision?.agentId ?? first.agentId ?? null,
    time,
    window: getWindowForTime(level, time),
    expected,
    actual,
    expectedPosition: expected,
    actualPosition: actual,
    reason: decision?.reason ?? 'scheduledSurface',
    agents: decision?.agents ?? [],
    actions: {
      continueMission: true,
      updateWaypoints: true,
      exportObservationData: true,
      importWaypointData: true,
      finishMission: true
    },
    modalVisible: Boolean(ui.modalVisible),
    fallbackVisible: Boolean(ui.fallbackVisible),
    uiMounted
  };
}

function simulationTimelineMarkers(state, duration) {
  if (!duration) return '';
  return getMissionTimelineFrames(state.level, state.mission).map((frame) => {
    const left = Math.max(0, Math.min(100, (Number(frame.t ?? 0) / duration) * 100));
    const kind = `window${frame.isSurfaceFrame ? ' surface' : ''}${frame.isFinalFrame ? ' mission-end' : ''}`;
    return `<span class="timeline-tick ${kind}" style="left:${left}%"></span>`;
  }).join('');
}

function applyMissionOptionsToMission(state = {}) {
  state.missionOptions ??= { ignoreUpdateEvents: false };
  state.mission ??= {};
  state.mission.rules ??= {};
  state.mission.rules.missionOptions = {
    ...(state.mission.rules.missionOptions ?? {}),
    ignoreUpdateEvents: Boolean(state.missionOptions.ignoreUpdateEvents)
  };
}

function clampTime(level, time = 0) {
  const duration = Number(getTimeConfig(level).duration ?? level?.world?.time?.duration ?? 0);
  const numeric = Number(time);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(Number.isFinite(duration) ? duration : numeric, numeric));
}

function routeFailureBody(level, mission, decision) {
  const agent = mission?.agents?.find((candidate) => candidate.id === decision.agentId);
  const glider = agent?.label ?? decision.agentId ?? 'Glider';
  const failed = Number.isFinite(Number(decision.failedWaypointIndex))
    ? `Waypoint ${Number(decision.failedWaypointIndex) + 1}`
    : 'the active waypoint';
  const last = Number.isFinite(Number(decision.lastCompletedWaypointIndex))
    ? `Waypoint ${Number(decision.lastCompletedWaypointIndex) + 1}`
    : 'none';
  const diagnostics = decision.plannerDiagnostics ?? {};
  const target = diagnostics.targetWaypoint ? formatPoint(diagnostics.targetWaypoint) : 'N/A';
  const plannedFrom = diagnostics.plannedFromCell ? formatPoint(diagnostics.plannedFromCell) : 'N/A';
  const routeBlock = diagnostics.routeBlockDiagnostic ?? diagnostics.prevalidationResult?.routeBlockDiagnostic ?? null;
  const routeDiagnostic = diagnostics.routeValidationDiagnostic
    ?? diagnostics.prevalidationResult?.routeValidationDiagnostic
    ?? (routeBlock ? buildRouteValidationDiagnostic({
      type: 'segmentBlocked',
      reason: diagnostics.simulationBlockReason ?? decision.reason,
      severity: 'error',
      agentId: diagnostics.agentId ?? decision.agentId,
      agentLabel: glider,
      segmentIndex: Number(decision.failedWaypointIndex ?? 0),
      waypointIndex: Number(decision.failedWaypointIndex ?? 0),
      blockedAt: routeBlock.blocking?.blockedCell ?? diagnostics.blockedCell ?? null,
      routeBlockDiagnostic: routeBlock
    }) : null);
  const blockedCell = routeBlock?.blocking?.blockedCell ? formatPoint(routeBlock.blocking.blockedCell) : diagnostics.blockedCell ? formatPoint(diagnostics.blockedCell) : 'N/A';
  const reportedCell = routeBlock?.blocking?.reportedCell ? formatPoint(routeBlock.blocking.reportedCell) : diagnostics.reportedCell ? formatPoint(diagnostics.reportedCell) : null;
  const blockExplanation = routeDiagnostic ? formatDiagnosticDetails(routeDiagnostic) : formatRouteBlockExplanation(routeBlock);
  const prevalidation = diagnostics.prevalidationResult
    ? `${diagnostics.prevalidationResult.ok ? 'passed' : 'failed'}${diagnostics.prevalidationResult.reason ? ` (${diagnostics.prevalidationResult.reason})` : ''}`
    : 'unknown';
  return [
    'Summary',
    `${glider} could not continue to ${failed}.`,
    `Reason: ${labelReason(decision.reason)}.`,
    `Last successful waypoint: ${last}.`,
    `Current time: ${formatMissionTime(level, decision.time)}.`,
    `Current position: ${formatPoint(decision.currentPosition)}.`,
    '',
    'Segment',
    `Planned segment: ${diagnostics.plannedSegment?.fromLabel ?? 'previous'} -> ${diagnostics.plannedSegment?.toLabel ?? failed}`,
    `Planned from cell: ${plannedFrom}`,
    `Target waypoint: ${target}`,
    `Reported/current cell: ${reportedCell ?? formatPoint(decision.currentPosition)}`,
    `Actual blocked cell: ${blockedCell}`,
    `Prevalidation: ${prevalidation}`,
    '',
    'Blocking condition',
    blockExplanation,
    '',
    'Suggested fix',
    routeDiagnostic?.fixHint ?? decision.suggestedFix,
    '',
    'Recovery',
    'Choose how to recover. Replan returns to Planning from this actual position and time.'
  ].join('\n');
}

function formatRouteBlockExplanation(diagnostic) {
  const blocking = diagnostic?.blocking;
  if (!blocking) return 'Route block detail: unavailable.';
  const blocked = blocking.blockedCell ? formatPoint(blocking.blockedCell) : 'unknown';
  const reported = blocking.reportedCell ? formatPoint(blocking.reportedCell) : null;
  if (reported && blocking.reportedCellNavigability === 'water' && !sameCell(blocking.reportedCell, blocking.blockedCell)) {
    return `Route block detail: reported/current cell ${reported} is navigable, but the segment crosses blocked terrain at ${blocked}.`;
  }
  if (blocking.reason === 'actual_drift_into_land') {
    return `Route block detail: the glider's actual drifted position made the segment unsafe near blocked terrain at ${blocked}.`;
  }
  if (blocking.reason === 'blocked_endpoint') {
    return `Route block detail: the target endpoint is blocked at ${blocked}.`;
  }
  if (blocking.reason === 'no_path') {
    return 'Route block detail: no legal navigable path exists between these cells.';
  }
  if (blocking.reason === 'waypoint_timeout') {
    return 'Route block detail: the segment did not reach the waypoint within the validation time budget.';
  }
  return `Route block detail: segment crosses blocked terrain at ${blocked}.`;
}

function sameCell(a, b) {
  return Boolean(a && b && Math.floor(Number(a.x)) === Math.floor(Number(b.x)) && Math.floor(Number(a.y)) === Math.floor(Number(b.y)));
}

function routeFailureConsoleText(decision) {
  const failed = Number.isFinite(Number(decision.failedWaypointIndex))
    ? `Waypoint ${Number(decision.failedWaypointIndex) + 1}`
    : 'active waypoint';
  return `${failed}: ${labelReason(decision.reason)}. Suggested fix: ${decision.suggestedFix}`;
}

function formatMetric(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function planDisplayName(plan, source) {
  if (plan?.meta?.name) return plan.meta.name;
  if (plan?.meta?.solver) return `Imported Solver (${plan.meta.solver})`;
  if (source === 'temporalGreedy') return 'Greedy Planner';
  if (source === 'greedyBaseline') return 'Legacy Greedy Result';
  if (source === 'importedSolver') return 'Imported Solver';
  if (source === 'loadedFromBestPriorRun') return 'Loaded Best Prior Path';
  if (source === 'bestPriorRerun') return 'Best Prior Path Rerun';
  return 'Player Plan';
}

function formatAbortReason(reason) {
  const labels = {
    invalidDt: 'invalid simulation time step',
    invalidSimulationTime: 'invalid simulation time',
    timeDidNotAdvanceSafely: 'simulation time stopped advancing',
    timeStalled: 'simulation time stalled',
    maxStepsExceeded: 'route exceeded safety step limit',
    maxPlaybackStepsExceeded: 'playback exceeded safety step limit',
    invalidPhysicsStep: 'invalid physics step',
    invalidAgentOrWaypointPosition: 'invalid waypoint or glider position',
    simulationWatchdogAbort: 'simulation watchdog stopped playback',
    noSimulationTimeProgress: 'simulation time stopped advancing',
    waypointNoProgress: 'active waypoint made no progress',
    maxStepsPerFrameExceeded: 'too many simulation steps in one browser frame',
    wallClockFrameStall: 'browser frame took too long',
    surfaceDecisionModalHidden: 'surface decision was waiting without a visible modal',
    surfaceDecisionModalMissing: 'surface decision was waiting without a visible modal',
    renderObjectGrowth: 'render object count grew unexpectedly',
    finishChunkWallTimeExceeded: 'finish chunk took too long',
    finishMaxTotalStepsExceeded: 'finish exceeded safety step limit',
    tooManyWaypointMissesInOneUpdate: 'too many waypoint misses in one update; revise route or reduce unreachable waypoints',
    tooManyWaypointTransitionsInOneUpdate: 'too many waypoint transitions in one update; revise route or reduce unreachable waypoints',
    waypointCascadeLimit: 'too many waypoint misses at once; revise the route',
    tooManyEventsInOneUpdate: 'too many simulation events in one update; revise route or reduce unreachable waypoints'
  };
  return labels[reason] ?? reason ?? 'safety guard triggered';
}

function stopReasonConsoleText(stopReason) {
  const last = stopReason.lastSuccessfulWaypoint
    ? `Last successful waypoint: ${Number(stopReason.lastSuccessfulWaypoint.waypointIndex ?? 0) + 1}. `
    : 'Last successful waypoint: none. ';
  const failed = stopReason.firstFailedWaypoint
    ? `First failed waypoint: ${Number(stopReason.firstFailedWaypoint.waypointIndex ?? 0) + 1} (${labelReason(stopReason.firstFailedWaypoint.reason)}). `
    : '';
  return `${last}${failed}Suggested fix: ${stopReason.suggestedFix}`;
}

function getSafeSceneStepDt(level) {
  const dt = Number(level?.world?.time?.dt ?? 0.25);
  return Number.isFinite(dt) && dt > 0 ? dt : 0.25;
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    if (globalThis.requestAnimationFrame) globalThis.requestAnimationFrame(() => resolve());
    else globalThis.setTimeout(resolve, 0);
  });
}

function getRenderObjectCount(scene) {
  return scene?.children?.list?.length ?? scene?.children?.length ?? 0;
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
