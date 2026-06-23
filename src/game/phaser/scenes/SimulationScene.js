import * as THREE from 'three';
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
import {
  SURFACING_DECISION_ACTION,
  SURFACING_DECISION_STATUS,
  createSurfacingDecisionState,
  normalizeSurfacingDecisionAction,
  surfacingDecisionStateSummary,
  validateSurfacingDecisionState
} from '../../../core/simulation/SurfacingDecisionState.js';
import {
  acceptSurfacingDecisionAction,
  commitSurfacingDecisionAction,
  createSurfacingDecisionTransaction,
  startSurfacingReplan,
  surfacingDecisionTransactionSummary
} from '../../../core/simulation/SurfacingDecisionTransaction.js';
import {
  createSurfacingReplanHandoff,
  surfacingReplanHandoffSummary,
  validateSurfacingReplanHandoff
} from '../../../core/planning/SurfacingReplanHandoff.js';
import { createHtmlSurfacingDecisionModal } from '../../../ui/simulation/HtmlSurfacingDecisionModal.js';
import { getAgentPlan, removeWaypoint } from '../../../core/planning/WaypointPlan.js';
import {
  derivePlannerBenchmarkAttemptContext,
  extractPlannerBenchmarkContextFromState
} from '../../../core/benchmark/BenchmarkEpisodeRuntime.js';
import { deriveAdaptiveBenchmarkContextFromState } from '../../../core/benchmark/AdaptiveBenchmarkRuntime.js';
import { attemptSourceFromRouteSourceLabel } from '../../../core/benchmark/BenchmarkAttemptSourceMapping.js';
import { buildSimulationWorldRenderViewModel, validateSimulationWorldRenderViewModel, simulationWorldRenderViewModelSummary } from '../../../core/rendering/SimulationWorldRenderViewModel.js';
import { gridCellToWorld } from '../../../core/rendering/MissionWorldCoordinates.js';
import { depthLayerCellCenterToWorld } from '../../../core/rendering/VolumetricMissionCoordinates.js';
import { augmentMissionWorldWithVolumetricModel, waterColumnRenderDebugPayload, volumetricCurrentDebugPayload } from '../../../core/rendering/VolumetricMissionWorldViewModel.js';
import { buildCurrentPresentationDebug } from '../../../core/rendering/CurrentPresentationState.js';
import { createThreeMissionSceneLifecycle, registerThreeMissionSceneResource, disposeThreeMissionSceneLifecycle, threeMissionSceneLifecycleSummary } from '../../three/ThreeMissionSceneLifecycle.js';
import { publishSceneIsolationDebug } from '../../../ui/MissionShellReset.js';
import { createMissionWorldInteractionResult } from '../../../core/rendering/MissionWorldInteractionResult.js';
import { simulationWorldRenderInputFromScene, simulationWorldRenderInputSummary } from '../../../core/rendering/SimulationWorldStateAdapter.js';
import { createThreeMissionWorldRenderer, updateThreeMissionWorldRenderer, resizeThreeMissionWorldRenderer, setThreeMissionWorldCamera, setThreeMissionLayerVisibility, threeMissionWorldRendererSummary, resetThreeMissionWorldRendererPerformance, disposeThreeMissionWorldRenderer } from '../../three/ThreeMissionWorldRenderer.js';
import { createThreePerformanceDebugPayload, inactiveThreePerformanceDebugPayload } from '../../three/ThreeMissionPerformanceMonitor.js';
import {
  createThreeSimulationPresentationScheduler,
  dirtyCategoriesForSimulationPresentationEvent,
  disposeSimulationPresentationScheduler,
  markSimulationPresentationDirty,
  publishSimulationPresentationSnapshot,
  consumeSimulationPresentationFrame,
  threeSimulationPresentationSchedulerSummary
} from '../../three/ThreeSimulationPresentationScheduler.js';
import {
  createThreeMissionInteractionController,
  updateThreeMissionInteractionContext,
  setThreeMissionInteractionEnabled,
  disposeThreeMissionInteractionController,
  threeMissionInteractionControllerSummary
} from '../../three/ThreeMissionInteractionController.js';
import { legacyPhaserMissionRendererEnabled, preferredMissionRendererBackend, publishMigrationDebug } from '../../../core/runtime/MigrationRuntimeConfig.js';
import {
  startSimulationLaunchProfiler,
  markSimulationLaunchStage,
  completeSimulationLaunchStage,
  completeSimulationLaunchProfiler,
  failSimulationLaunchProfiler,
  setSimulationLaunchRendererCounts,
  simulationLaunchDebugSnapshot
} from '../../../core/runtime/SimulationLaunchProfiler.js';
import {
  advanceMissionExecutionTransaction,
  failMissionExecutionTransaction,
  missionExecutionTransactionSummary
} from '../../../core/simulation/MissionExecutionTransaction.js';
import {
  digestExecutionPlan,
  normalizeMissionLaunchPayload,
  summarizeMissionLaunchPayload,
  summarizeTerrainAwareValidation
} from '../../../core/simulation/MissionExecutionSnapshot.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class SimulationScene extends PhaserScene {
  constructor() {
    super('SimulationScene');
    this.threeSimulationContainer = null;
    this.threeSimulationRenderer = null;
    this.simulationRenderInput = null;
    this.simulationRenderViewModel = null;
    this.threeSimulationInteractionController = null;
    this.lastThreeSimulationIntent = null;
    this.lastThreeSimulationResult = null;
    this.rawLaunchPayload = null;
    this.launchPayload = null;
    this.executionTransaction = null;
    this.simulationReceivedPlanDigest = null;
    this.enginePlanDigest = null;
    this.firstStepCompleted = false;
    this.rendererMountedReported = false;
    this.resultBuildCount = 0;
    this.debriefTransitionCount = 0;
    this.simulationLoopCount = 0;
    this.threeRenderLoopCount = 0;
    this.runningReported = false;
    this.terminalReported = false;
    this.terminalResultRecorded = false;
    this.sceneCleanupDisposed = false;
    this.sceneLifecycleDisposalCount = 0;
    this.threeSceneLifecycle = null;
    this.surfaceDecisionModal = null;
    this.surfaceDecisionTransaction = null;
    this.surfaceDecisionOpenedEvents = new Set();
    this.surfacingActionDispatchCount = 0;
    this.surfacingDuplicateActionCount = 0;
    this.lastSurfaceDecisionDebug = null;
    this.cleanupInvocationCount = 0;
    this.duplicateCleanupInvocationCount = 0;
    this.cleanupErrorCount = 0;
    this.lifecycleWasNullAtCleanup = false;
    this.lifecycleResourceCountBefore = 0;
    this.lifecycleResourceCountAfter = 0;
    this.cleanupReason = null;
    this.simulationViewModelBuildCount = 0;
    this.shutdownHandlerBindCount = 0;
    this.destroyHandlerBindCount = 0;
    this.duplicateLifecycleHandlerCount = 0;
    this.presentationScheduler = null;
    this.latestPresentationFrame = null;
    this.lastPresentedEngineStepCount = 0;
    this.lastPresentedEventCount = 0;
    this.lastPresentedTrajectoryPointCount = 0;
    this.lastHudRenderAt = 0;
    this.hudRenderCount = 0;
    this.rightPanelRenderCount = 0;
    this.timelineRenderCount = 0;
    this.hudRenderSkipCount = 0;
    this.rightPanelRenderSkipCount = 0;
    this.timelineRenderSkipCount = 0;
    this.finishPresentationUpdateCount = 0;
    this.finishEngineMilliseconds = 0;
    this.finishPresentationMilliseconds = 0;
    this.finishChunkCount = 0;
  }

  init(data = {}) {
    this.rawLaunchPayload = data ?? null;
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.sceneCleanupDisposed = false;
    this.sceneLifecycleEventsBound = false;
    this.bindThreeSceneLifecycleEvents();
    this.threeSceneLifecycle = createThreeMissionSceneLifecycle({ sceneKey: 'SimulationScene' });
    markSimulationLaunchStage('prepareLaunchSnapshot');
    this.initializeLaunchPayload();
    this.launchProfiler = startSimulationLaunchProfiler({
      level: this.launchPayload?.level ?? this.app.state.level,
      mission: this.launchPayload?.mission ?? this.app.state.mission,
      agentCount: (this.launchPayload?.mission ?? this.app.state.mission)?.agents?.length ?? 0,
      safeCurrentDisplayMode: new URLSearchParams(globalThis.location?.search ?? '').get('currentDisplay') === 'safe'
    });
    completeSimulationLaunchStage('prepareLaunchSnapshot');
    markSimulationLaunchStage('validateLaunchSnapshot');
    completeSimulationLaunchStage('validateLaunchSnapshot');
    this.app.setSceneLabel('Simulation');
    this.app.state.mode = 'simulation';
    this.app.state.ui ??= {};
    this.app.state.ui.legacyPhaserMissionRendererEnabled = legacyPhaserMissionRendererEnabled();
    this.app.state.ui.rendererBackend = preferredMissionRendererBackend({ requested: this.app.state.ui.rendererBackend });
    this.applyInitialWaterColumnSimulationDefaults();
    clearPlanningOverlayState(this.app.state);
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.graphics = this.add.graphics();
    this.graphics.setVisible(this.getSimulationRendererBackend() === 'legacyPhaser2d');
    this.app.clearPanels();
    this.modal = new Modal(this);
    this.surfaceDecisionModal = createHtmlSurfacingDecisionModal({
      root: globalThis.document?.body ?? this.app.elements.shell ?? null,
      onAction: (action, details) => this.handleSurfacingDecisionAction(action, details)
    });
    normalizeStochasticState(this.app.state);
    applyStochasticToMission(this.app.state);
    applyMissionOptionsToMission(this.app.state);
    this.trace = this.app.state.simulationTrace ?? createSimulationTrace();
    this.app.state.simulationTrace = this.trace;
    markSimulationLaunchStage('constructSimulationEngine');
    try {
      this.engine = new SimulationEngine({
        level: this.launchPayload?.level ?? this.app.state.level,
        mission: this.launchPayload?.mission ?? this.app.state.mission,
        plan: this.launchPayload?.plan ?? this.app.state.plan,
        resumeState: this.launchPayload?.simulationResume ?? this.app.state.simulationResume,
        trace: this.trace,
        time: this.launchPayload?.playback?.time ?? this.app.state.playback.time
      });
    } catch (error) {
      this.handleCanonicalLaunchFailure(error);
      return;
    }
    completeSimulationLaunchStage('constructSimulationEngine');
    markSimulationLaunchStage('initializeAgents');
    completeSimulationLaunchStage('initializeAgents', { agentCount: this.engine.agents?.length ?? 0 });
    markSimulationLaunchStage('buildInitialSimulationState');
    completeSimulationLaunchStage('buildInitialSimulationState');
    this.enginePlanDigest = digestExecutionPlan(this.engine.plan);
    this.presentationScheduler = createThreeSimulationPresentationScheduler({ maxHz: 30 });
    const shouldAutoResumeAfterSurfacingReplan = this.app.state.pendingSurfacingResumePlay === true;
    if (shouldAutoResumeAfterSurfacingReplan) {
      this.app.state.pendingSurfacingResumePlay = false;
      if (!this.engine.awaitingSurfaceDecision && !this.engine.routeFailureDecision?.active && !this.engine.complete && !this.engine.aborted) {
        this.engine.play();
      }
    }
    if (this.executionTransaction) {
      advanceMissionExecutionTransaction(this.executionTransaction, 'engineInitialized', {
        engineSummary: {
          status: this.engine.aborted ? 'aborted' : this.engine.complete ? 'complete' : this.engine.running ? 'running' : 'paused',
          timeSeconds: this.engine.t,
          stepCount: this.engine.stepCount,
          agentCount: this.engine.agents?.length ?? 0,
          enginePlanDigest: this.enginePlanDigest,
          initialValidationOk: this.engine.initialValidation?.ok === true,
          configValidationOk: this.engine.configValidation?.ok === true
        }
      });
      this.app.state.executionTransaction = this.executionTransaction;
    }
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
    completeSimulationLaunchStage('bindSimulationControls');
    this.onViewportResize = () => {
      globalThis.requestAnimationFrame?.(() => this.refresh());
    };
    globalThis.addEventListener?.('resize', this.onViewportResize);
    registerThreeMissionSceneResource(this.threeSceneLifecycle, 'eventListener', { target: globalThis, type: 'resize', listener: this.onViewportResize });
    this.resizeObserver = globalThis.ResizeObserver
      ? new globalThis.ResizeObserver(this.onViewportResize)
      : null;
    if (this.resizeObserver && this.app.elements.viewportShell) {
      this.resizeObserver.observe(this.app.elements.viewportShell);
      registerThreeMissionSceneResource(this.threeSceneLifecycle, 'resizeObserver', this.resizeObserver);
    }
    this.syncResult();
    this.refresh();
    this.notifyAbortIfNeeded();
    this.notifyStopReasonIfNeeded();
    this.refreshRouteFailureDecision();
    completeSimulationLaunchProfiler('interactive', {
      activeRendererCount: this.threeSimulationRenderer && !this.threeSimulationRenderer.disposed ? 1 : 0,
      activeRafCount: this.threeSimulationRenderer?.animationFrame == null ? 0 : 1
    });
  }

  bindThreeSceneLifecycleEvents() {
    if (this.sceneLifecycleEventsBound) {
      this.duplicateLifecycleHandlerCount = Number(this.duplicateLifecycleHandlerCount ?? 0) + 1;
      return;
    }
    this.sceneLifecycleEventsBound = true;
    this.shutdownHandlerBindCount = Number(this.shutdownHandlerBindCount ?? 0) + 1;
    this.destroyHandlerBindCount = Number(this.destroyHandlerBindCount ?? 0) + 1;
    this.events?.once?.('shutdown', () => this.cleanupSimulationScene('shutdown-event'));
    this.events?.once?.('destroy', () => this.cleanupSimulationScene('destroy-event'));
  }

  shutdown() {
    this.cleanupSimulationScene('shutdown-method');
  }

  cleanupSimulationScene(reason = 'cleanup') {
    this.cleanupInvocationCount = Number(this.cleanupInvocationCount ?? 0) + 1;
    this.cleanupReason = reason;
    if (this.sceneCleanupDisposed) {
      this.duplicateCleanupInvocationCount = Number(this.duplicateCleanupInvocationCount ?? 0) + 1;
      this.publishSimulationCleanupDebug(reason, {
        duplicate: true,
        lifecycleSummary: threeMissionSceneLifecycleSummary(this.threeSceneLifecycle)
      });
      return;
    }
    this.sceneCleanupDisposed = true;
    this.sceneLifecycleDisposalCount = Number(this.sceneLifecycleDisposalCount ?? 0) + 1;
    const lifecycle = this.threeSceneLifecycle;
    const before = threeMissionSceneLifecycleSummary(lifecycle);
    this.lifecycleWasNullAtCleanup = !lifecycle;
    this.lifecycleResourceCountBefore = Number(before.registeredResourceCount ?? before.resourceCount ?? 0);
    let cleanupError = null;
    try {
      this.finishingAsync = false;
      this.engine?.pause?.();
      this.unbindSurfaceDecisionFallbacks?.();
      globalThis.removeEventListener?.('resize', this.onViewportResize);
      this.resizeObserver?.disconnect?.();
      if (this.app?.elements?.overlay?.bottomTimeline) this.app.elements.overlay.bottomTimeline.innerHTML = '';
      disposeSimulationPresentationScheduler(this.presentationScheduler);
      this.disposeThreeSimulationRenderer();
      this.surfaceDecisionModal?.destroy?.();
      this.surfaceDecisionModal = null;
      this.modal?.destroy?.();
      this.modal = null;
      disposeThreeMissionSceneLifecycle(lifecycle, reason);
    } catch (error) {
      cleanupError = error;
      this.cleanupErrorCount = Number(this.cleanupErrorCount ?? 0) + 1;
      globalThis.console?.warn?.('SimulationScene cleanup warning', error);
    }
    const after = threeMissionSceneLifecycleSummary(lifecycle);
    this.lifecycleResourceCountAfter = Number(after.activeResourceCount ?? 0);
    this.threeSceneLifecycle = null;
    this.publishSimulationCleanupDebug(reason, { before, after, cleanupError });
  }

  publishSimulationCleanupDebug(reason = 'cleanup', patch = {}) {
    const cleanup = {
      ...(globalThis.ANCHOR_SCENE_CLEANUP_DEBUG ?? {}),
      simulationCleanupInvocationCount: Number(this.cleanupInvocationCount ?? 0),
      simulationCleanupCompleted: this.sceneCleanupDisposed === true,
      simulationDuplicateCleanupInvocationCount: Number(this.duplicateCleanupInvocationCount ?? 0),
      simulationLifecycleWasNullAtCleanup: this.lifecycleWasNullAtCleanup === true,
      simulationLifecycleResourceCountBefore: Number(this.lifecycleResourceCountBefore ?? 0),
      simulationLifecycleResourceCountAfter: Number(this.lifecycleResourceCountAfter ?? 0),
      simulationCleanupErrorCount: Number(this.cleanupErrorCount ?? 0),
      simulationCleanupReason: reason,
      simulationShutdownHandlerBindCount: Number(this.shutdownHandlerBindCount ?? 0),
      simulationDestroyHandlerBindCount: Number(this.destroyHandlerBindCount ?? 0),
      simulationDuplicateLifecycleHandlerCount: Number(this.duplicateLifecycleHandlerCount ?? 0)
    };
    globalThis.ANCHOR_SCENE_CLEANUP_DEBUG = cleanup;
    publishSceneIsolationDebug(this.app, {
      reason,
      disposedRendererCount: this.sceneLifecycleDisposalCount,
      lifecycleSummary: patch.after ?? patch.lifecycleSummary ?? threeMissionSceneLifecycleSummary(this.threeSceneLifecycle),
      simulationCleanupInvocationCount: cleanup.simulationCleanupInvocationCount,
      simulationCleanupErrorCount: cleanup.simulationCleanupErrorCount,
      nullLifecycleSummaryCount: (patch.before?.status === 'inactive' || patch.lifecycleSummary?.status === 'inactive') ? 1 : 0,
      duplicateCleanupInvocationCount: cleanup.simulationDuplicateCleanupInvocationCount,
      activeWaterColumnSlabCount: 0,
      activeWaterColumnLabelCount: 0,
      activeWaterColumnFrameCount: 0
    });
  }

  goMainMenu(reason = 'simulation-menu') {
    this.cleanupSimulationScene(reason);
    this.scene.start('MainMenuScene');
  }

  renderPanel() {
    this.add.rectangle(20, 18, 520, 92, 0x0f1b2e, 0.9).setOrigin(0, 0).setStrokeStyle(1, 0x6d86aa, 0.4);
    this.add.text(36, 30, 'Simulation', { fontFamily: 'system-ui', fontSize: '22px', fontStyle: '700', color: '#eef6ff' });
    this.statusText = this.add.text(36, 66, 'Ready.', { fontFamily: 'system-ui', fontSize: '14px', color: '#b9c7dc', wordWrap: { width: 480 } });
    this.summaryText = this.add.text(970, 128, '', { fontFamily: 'system-ui', fontSize: '13px', color: '#eef6ff', wordWrap: { width: 250 } });
  }

  handleCanonicalLaunchFailure(error) {
    const message = error?.message ?? 'Simulation launch failed before the canonical engine could start.';
    this.app.state.simulationLaunchError = {
      type: 'anchor.simulation.launch-error',
      stage: 'constructSimulationEngine',
      message,
      name: error?.name ?? 'Error',
      planPreserved: Boolean(this.app.state.plan),
      missionPreserved: Boolean(this.app.state.mission),
      levelPreserved: Boolean(this.app.state.level)
    };
    failSimulationLaunchProfiler(message, { launchAbortedCleanly: true });
    if (this.executionTransaction) {
      this.app.state.executionTransaction = failMissionExecutionTransaction(this.executionTransaction, 'constructSimulationEngine', message, {
        launchPayloadSummary: summarizeMissionLaunchPayload(this.launchPayload),
        planPreserved: Boolean(this.app.state.plan)
      });
    }
    this.renderPanel();
    if (this.statusText) this.statusText.setText('Launch failed before Simulation started. Return to Planning to inspect the route and current-field data.');
    this.renderCanonicalLaunchFailureConsole(message);
    this.app.toast?.(`Simulation launch failed: ${message}`, 'danger');
    globalThis.console?.error?.('Simulation launch failed cleanly', error);
  }

  renderCanonicalLaunchFailureConsole(message) {
    const root = this.app.elements.consoleRoot;
    if (!root) return;
    root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Simulation Launch</div>
        <h1>Launch Failed Cleanly</h1>
        <p>The canonical Simulation engine did not start because required launch data failed validation.</p>
      </section>
      <section class="console-section warning-card" data-simulation-launch-error="true">
        <h2>Current-field validation</h2>
        <p>${escapeHtml(message)}</p>
        <p class="hud-muted">No partial Simulation was started. The existing plan and mission state remain available for inspection.</p>
        <button class="console-button primary" data-action="return-planning">Return To Planning</button>
      </section>
    `;
    root.querySelector('[data-action="return-planning"]')?.addEventListener('click', () => this.scene.start('MissionWorkspaceScene'));
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
        <button class="console-button" data-action="start">Start</button>
        <button class="console-button primary" data-action="play">Play / Pause</button>
        <button class="console-button" data-action="pause">Pause</button>
        <button class="console-button" data-action="step">Step</button>
        <button class="console-button" data-action="finish">Finish Instantly</button>
        <button class="console-button" data-action="reset">Reset Simulation</button>
        <button class="console-button" data-action="planning">Return / Replan</button>
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
    root.querySelector('[data-action="start"]')?.addEventListener('click', () => this.goToSimulationFrame(0));
    root.querySelector('[data-action="play"]')?.addEventListener('click', () => this.togglePlay());
    root.querySelector('[data-action="pause"]')?.addEventListener('click', () => { this.engine.pause(); this.refreshControls(); this.renderSimulationTimeline(); this.publishExecutionDebug(); });
    root.querySelector('[data-action="step"]')?.addEventListener('click', () => this.stepOnce());
    root.querySelector('[data-action="finish"]')?.addEventListener('click', () => this.finishSimulation());
    root.querySelector('[data-action="reset"]')?.addEventListener('click', () => this.resetSimulation());
    root.querySelector('[data-action="planning"]')?.addEventListener('click', () => this.scene.start('MissionWorkspaceScene'));
    root.querySelector('[data-action="debrief"]')?.addEventListener('click', () => this.goDebrief());
    root.querySelector('[data-action="menu"]')?.addEventListener('click', () => this.goMainMenu('simulation-main-menu'));
    root.querySelector('[data-action="sim-camera-top"]')?.addEventListener('click', () => this.setThreeSimulationCameraPreset('tacticalTopDown'));
    root.querySelector('[data-action="sim-camera-oblique"]')?.addEventListener('click', () => this.setThreeSimulationCameraPreset('obliqueMission'));
    root.querySelector('[data-action="sim-camera-profile"]')?.addEventListener('click', () => this.setThreeSimulationCameraPreset('waterColumnProfile'));
  }


  initializeLaunchPayload() {
    try {
      const payload = normalizeMissionLaunchPayload(this.rawLaunchPayload, this.app.state);
      this.launchPayload = payload;
      this.app.state.executionLaunchPayload = payload;
      if (payload.level) this.app.state.level = payload.level;
      if (payload.mission) this.app.state.mission = payload.mission;
      if (payload.plan) this.app.state.plan = payload.plan;
      if (payload.selectedAgentId) this.app.state.selectedAgentId = payload.selectedAgentId;
      if (payload.currentPlanSource) this.app.state.currentPlanSource = payload.currentPlanSource;
      if (payload.challengeMode) this.app.state.challengeMode = payload.challengeMode;
      if (payload.experienceMode) this.app.state.experienceMode = payload.experienceMode;
      if (payload.missionOptions) this.app.state.missionOptions = payload.missionOptions;
      if (payload.stochastic) this.app.state.stochastic = payload.stochastic;
      if (payload.playback) this.app.state.playback = { ...(this.app.state.playback ?? {}), ...payload.playback };
      if (payload.simulationResume) this.app.state.simulationResume = payload.simulationResume;
      this.executionTransaction = payload.transaction ?? this.app.state.executionTransaction ?? null;
      this.simulationReceivedPlanDigest = payload.planDigest ?? digestExecutionPlan(payload.plan);
      if (this.executionTransaction) {
        advanceMissionExecutionTransaction(this.executionTransaction, 'simulationSceneInitialized', {
          launchPayloadSummary: summarizeMissionLaunchPayload(payload),
          simulationReceivedPlanDigest: this.simulationReceivedPlanDigest
        });
        this.app.state.executionTransaction = this.executionTransaction;
      }
    } catch (error) {
      const reason = String(error?.message ?? error ?? 'Simulation launch payload failed to initialize.');
      this.launchInitializationError = reason;
      this.app.toast?.(`Simulation launch payload failed: ${reason}`, 'error');
      this.executionTransaction = this.app.state.executionTransaction ?? null;
      if (this.executionTransaction) {
        failMissionExecutionTransaction(this.executionTransaction, 'simulationSceneInitialized', reason);
        this.app.state.executionTransaction = this.executionTransaction;
      }
    }
  }

  publishExecutionDebug(patch = {}) {
    const transaction = patch.transaction ?? this.executionTransaction ?? this.app?.state?.executionTransaction ?? null;
    const control = globalThis.ANCHOR_EXECUTION_DEBUG ?? {};
    const engineSummary = this.engine ? {
      status: this.engine.aborted ? 'aborted' : this.engine.complete ? 'complete' : this.engine.running ? 'running' : 'paused',
      timeSeconds: this.engine.t,
      stepCount: this.engine.stepCount,
      agentCount: this.engine.agents?.length ?? 0,
      complete: this.engine.complete === true,
      aborted: this.engine.aborted === true,
      abortReason: this.engine.abortReason ?? null
    } : null;
    const canonicalTrajectoryPointCount = (this.engine?.agents ?? []).reduce((sum, agent) => sum + (agent.history?.length ?? 0), 0);
    const canonicalObservationCount = (this.engine?.events ?? []).filter((event) => ['sample', 'duplicateSample', 'probabilityOutcome'].includes(event.type)).length;
    const terrainDiagnosticCounters = this.engine?.terrainDiagnostics?.counters ?? {};
    const terrainEventSummary = this.engine?.terrainDiagnostics?.eventSummary ?? null;
    const movingAgentCount = (this.engine?.agents ?? []).filter((agent) => agent.status !== 'complete' && agent.status !== 'batteryDepleted').length;
    const renderDebug = globalThis.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    const completedStages = transaction ? missionExecutionTransactionSummary(transaction).completedStages : control.completedStages ?? [];
    const planningDigest = control.planningPlanDigest ?? this.launchPayload?.planDigest ?? null;
    globalThis.ANCHOR_EXECUTION_DEBUG = {
      version: 'three-r1-1d',
      transactionId: transaction?.transactionId ?? this.launchPayload?.transactionId ?? null,
      currentStage: patch.currentStage ?? transaction?.currentStage ?? control.currentStage ?? null,
      completedStages,
      failureStage: transaction?.failureStage ?? control.failureStage ?? null,
      failureReason: transaction?.failureReason ?? control.failureReason ?? null,
      executeControlPresent: control.executeControlPresent ?? null,
      executeControlEnabled: control.executeControlEnabled ?? null,
      executeControlDisabledReason: control.executeControlDisabledReason ?? null,
      executeControlBindCount: control.executeControlBindCount ?? null,
      executeControlClickCount: control.executeControlClickCount ?? null,
      duplicateExecuteDispatchCount: control.duplicateExecuteDispatchCount ?? 0,
      planningPlanDigest: planningDigest,
      launchPlanDigest: this.launchPayload?.planDigest ?? control.launchPlanDigest ?? null,
      simulationReceivedPlanDigest: this.simulationReceivedPlanDigest ?? null,
      enginePlanDigest: this.enginePlanDigest ?? null,
      planDigestMatch: Boolean(planningDigest && this.simulationReceivedPlanDigest && this.enginePlanDigest)
        ? planningDigest === this.simulationReceivedPlanDigest && this.simulationReceivedPlanDigest === this.enginePlanDigest
        : null,
      selectedStartCount: this.launchPayload?.planSummary?.selectedStartCount ?? control.selectedStartCount ?? 0,
      executableAgentPlanCount: this.launchPayload?.planSummary?.executableAgentPlanCount ?? control.executableAgentPlanCount ?? 0,
      executableWaypointCount: this.launchPayload?.planSummary?.executableWaypointCount ?? control.executableWaypointCount ?? 0,
      planningMarkerCount: this.launchPayload?.planSummary?.planningMarkerCount ?? control.planningMarkerCount ?? 0,
      terrainAwareValidationSummary: this.launchPayload?.terrainAwareValidationSummary ?? control.terrainAwareValidationSummary ?? null,
      sceneTransitionRequested: true,
      simulationSceneActive: this.sys?.isActive?.() === true,
      engineInitialized: Boolean(this.engine),
      engineStatus: engineSummary,
      engineStepCount: this.engine?.stepCount ?? 0,
      presentationScheduler: threeSimulationPresentationSchedulerSummary(this.presentationScheduler),
      presentationFrameCount: this.latestPresentationFrame?.counters?.presentationFrameCount ?? 0,
      presentationRequestCount: this.latestPresentationFrame?.counters?.presentationRequestCount ?? 0,
      coalescedPresentationRequestCount: this.latestPresentationFrame?.counters?.coalescedPresentationRequestCount ?? 0,
      snapshotPublishCount: this.latestPresentationFrame?.counters?.snapshotPublishCount ?? 0,
      presentationDirtyCategories: [...(this.latestPresentationFrame?.dirtyCategories ?? [])],
      hudRenderCount: this.hudRenderCount,
      rightPanelRenderCount: this.rightPanelRenderCount,
      timelineRenderCount: this.timelineRenderCount,
      hudRenderSkipCount: this.hudRenderSkipCount,
      rightPanelRenderSkipCount: this.rightPanelRenderSkipCount,
      timelineRenderSkipCount: this.timelineRenderSkipCount,
      finishEngineMilliseconds: Number(this.finishEngineMilliseconds ?? 0),
      finishPresentationMilliseconds: Number(this.finishPresentationMilliseconds ?? 0),
      finishChunkCount: Number(this.finishChunkCount ?? 0),
      finishPresentationUpdateCount: Number(this.finishPresentationUpdateCount ?? 0),
      firstStepCompleted: this.firstStepCompleted === true,
      simulationTimeSeconds: this.engine?.t ?? 0,
      activeAgentCount: this.engine?.agents?.length ?? 0,
      movingAgentCount,
      canonicalTrajectoryPointCount,
      threeTrajectoryPointCount: renderDebug.realizedTrajectoryPointCount ?? 0,
      canonicalObservationCount,
      actualTerrainDiagnostics: this.app.state.result?.actualTerrainDiagnostics ?? this.app.state.result?.terrainAwareValidation?.actual ?? null,
      incrementalTerrainDiagnosticsUpdateCount: terrainDiagnosticCounters.incrementalTerrainDiagnosticsUpdateCount ?? terrainDiagnosticCounters.updateCount ?? 0,
      runtimeTerrainDiagnosticsUpdateCount: terrainDiagnosticCounters.incrementalTerrainDiagnosticsUpdateCount ?? terrainDiagnosticCounters.updateCount ?? 0,
      fullTerrainDiagnosticsRebuildCount: terrainDiagnosticCounters.fullTerrainDiagnosticsRebuildCount ?? 0,
      trajectoryPointsScannedDuringLastDiagnosticsUpdate: terrainDiagnosticCounters.trajectoryPointsScannedDuringLastUpdate ?? 0,
      eventsScannedDuringLastDiagnosticsUpdate: terrainDiagnosticCounters.eventsScannedDuringLastUpdate ?? 0,
      terrainEventSummaryIncrementCount: terrainDiagnosticCounters.terrainEventSummaryIncrementCount ?? 0,
      terrainEventSummaryFullRebuildCount: terrainDiagnosticCounters.terrainEventSummaryFullRebuildCount ?? 0,
      terrainEventSummaryCompact: terrainEventSummary ? { eventCount: terrainEventSummary.eventCount, eventTypeCounts: terrainEventSummary.eventTypeCounts, severityCounts: terrainEventSummary.severityCounts, latestEvent: terrainEventSummary.latestEvent } : null,
      terrainEventsSupported: this.app.state.result?.terrainAwareValidation?.terrainEventsSupported === true,
      minimumActualClearanceMeters: this.app.state.result?.actualTerrainDiagnostics?.minimumActualClearanceMeters ?? null,
      maximumActualDepthMeters: this.app.state.result?.actualTerrainDiagnostics?.maximumActualDepthMeters ?? null,
      terrainEventCount: this.app.state.result?.terrainEvents?.length ?? 0,
      threeObservationCount: renderDebug.observationCount ?? 0,
      canonicalWaypointStatusCount: (this.engine?.agents ?? []).reduce((sum, agent) => sum + (agent.completedWaypoints?.length ?? 0) + (agent.missedWaypoints?.length ?? 0), 0),
      rightPanelWaypointStatusCount: renderDebug.rightPanelWaypointStatusCount ?? renderDebug.canonicalWaypointStatusCount ?? 0,
      timelineWaypointStatusCount: renderDebug.timelineWaypointStatusCount ?? 0,
      resultAvailable: Boolean(this.app?.state?.result),
      debriefRequested: this.debriefTransitionCount > 0,
      simulationLoopCount: this.engine?.running ? 1 : 0,
      threeRenderLoopCount: this.engine?.running && this.threeSimulationRenderer ? 1 : 0,
      resultBuildCount: this.resultBuildCount,
      debriefTransitionCount: this.debriefTransitionCount,
      duplicateObservationCount: 0,
      duplicateTrajectoryPointCount: 0,
      rendererBackend: 'threeMission3d',
      rendererOwnsExecution: false,
      rendererOwnsSimulationState: false,
      rendererOwnsScoring: false,
      changesOfficialBrowserScoring: false,
      usesCanonicalPlan: true,
      transactionSummary: transaction ? missionExecutionTransactionSummary(transaction) : null,
      ...patch
    };
    return globalThis.ANCHOR_EXECUTION_DEBUG;
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

  applyInitialWaterColumnSimulationDefaults() {
    this.app.state.ui ??= {};
    const config = this.app.state.level?.world?.waterColumnConfig
      ?? this.app.state.mission?.world?.waterColumnConfig
      ?? this.app.state.mission?.waterColumnConfig
      ?? null;
    const layers = config?.depthLayerIds ?? ['surface'];
    const legacy = config?.source === 'importedLegacySurfaceFallback' || config?.compatibility?.importedLegacySurfaceFallback === true || layers.length <= 1;
    const existing = this.app.state.ui.waterColumn ?? {};
    if (existing.userModified === true) return;
    this.app.state.ui.waterColumn = {
      ...existing,
      verticalDisplayMode: 'physicalDepth',
      activeDepthLayerId: legacy ? 'surface' : (existing.activeDepthLayerId ?? config?.defaultPlanningLayerId ?? (layers.includes('thermocline') ? 'thermocline' : layers[0] ?? 'surface')),
      hiddenLayerIds: legacy ? [] : (existing.hiddenLayerIds ?? []),
      visibleLayerIds: null,
      selectedDiveProfileId: existing.selectedDiveProfileId ?? config?.defaultDiveProfileId ?? 'surfaceOnly',
      selectedTargetDepthLayerId: existing.selectedTargetDepthLayerId ?? config?.defaultTargetDepthLayerId ?? 'surface',
      fieldDisplayMode: existing.fieldDisplayMode === 'allLayers' || existing.showFieldOnAllLayers === true ? 'allLayers' : 'activeLayerOnly',
      showFieldOnAllLayers: existing.fieldDisplayMode === 'allLayers' || existing.showFieldOnAllLayers === true,
      qualityProfile: normalizeThreeQualityProfile(existing.qualityProfile ?? this.app.state.ui.threeMissionQualityProfile ?? 'balanced'),
      currentDisplayMode: normalizeCurrentDisplayModeAlias(existing.currentDisplayMode ?? 'activeSlice'),
      currentLayerMode: existing.currentLayerMode ?? 'followSelectedGlider',
      currentVectorDensity: normalizeCurrentVectorDensity(existing.currentVectorDensity ?? 'balanced'),
      currentMagnitudeScale: clampNumber(existing.currentMagnitudeScale, 1.8, 0.25, 6),
      currentColorMode: ['speed', 'direction', 'depthLayer', 'assistOpposeRoute'].includes(existing.currentColorMode) ? existing.currentColorMode : 'speed',
      showContextCurrents: existing.showContextCurrents === true,
      userModified: false,
      defaultDisplayModeApplied: true
    };
    if (!this.app.state.ui.threeMissionCameraPreset || this.app.state.ui.threeMissionCameraPreset === 'obliqueMission' || this.app.state.ui.threeMissionCameraPreset === 'obliqueWaterColumn') {
      this.app.state.ui.threeMissionCameraPreset = legacy ? 'tacticalTopDown' : 'obliqueWaterColumn';
    }
  }
  setThreeSimulationCameraPreset(preset) {
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionCameraPreset = ['tacticalTopDown', 'obliqueMission', 'obliqueWaterColumn', 'waterColumnProfile', 'sideProfile', 'layerStackOverview', 'activeLayer', 'selectedDive', 'fleetOverview'].includes(preset) ? preset : 'obliqueMission';
    if (this.threeSimulationRenderer) {
      setThreeMissionWorldCamera(this.threeSimulationRenderer, { preset: this.app.state.ui.threeMissionCameraPreset });
      this.threeSimulationRenderer.lastRequestedCameraPreset = this.app.state.ui.threeMissionCameraPreset;
    }
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
    const beforeStepCount = this.engine.stepCount;
    this.engine.stepOnce();
    this.recordSimulationProgressStage(beforeStepCount, 'manualStep');
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
    markSimulationLaunchStage('constructSimulationEngine');
    this.engine = new SimulationEngine({ level: this.app.state.level, mission: this.app.state.mission, plan: this.app.state.plan, trace: this.trace, time: this.app.state.playback.time });
    completeSimulationLaunchStage('constructSimulationEngine');
    markSimulationLaunchStage('initializeAgents');
    completeSimulationLaunchStage('initializeAgents', { agentCount: this.engine.agents?.length ?? 0 });
    markSimulationLaunchStage('buildInitialSimulationState');
    completeSimulationLaunchStage('buildInitialSimulationState');
    this.enginePlanDigest = digestExecutionPlan(this.engine.plan);
    this.presentationScheduler = createThreeSimulationPresentationScheduler({ maxHz: 30 });
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
    markSimulationLaunchStage('constructSimulationEngine');
    this.engine = new SimulationEngine({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      trace: this.trace,
      time: this.app.state.playback.time
    });
    completeSimulationLaunchStage('constructSimulationEngine');
    markSimulationLaunchStage('initializeAgents');
    completeSimulationLaunchStage('initializeAgents', { agentCount: this.engine.agents?.length ?? 0 });
    markSimulationLaunchStage('buildInitialSimulationState');
    completeSimulationLaunchStage('buildInitialSimulationState');
    this.enginePlanDigest = digestExecutionPlan(this.engine.plan);
    this.presentationScheduler = createThreeSimulationPresentationScheduler({ maxHz: 30 });
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
        this.publishLatestSimulationSnapshot('finishChunk');
        const elapsed = (globalThis.performance?.now?.() ?? Date.now()) - started;
        this.finishEngineMilliseconds += elapsed;
        this.finishChunkCount += 1;
        traceSimulation(this.trace, {
          scene: 'SimulationScene',
          phase: 'finish.chunk.end',
          simTime: this.engine.t,
          message: 'Finish chunk completed',
          details: { totalSteps, elapsed }
        });
        if (elapsed > 250) {
          this.handleWatchdogAbort(this.buildManualWatchdogSnapshot('finishChunkWallTimeExceeded', { elapsed, totalSteps }));
          break;
        }
        if (totalSteps % Math.max(stepsPerChunk, 1) === 0) {
          this.consumeScheduledPresentationFrame({ force: true, reason: 'finishProgress', presentationOnly: true });
          this.finishPresentationUpdateCount += 1;
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
      this.consumeScheduledPresentationFrame({ force: true, reason: 'finishFinal' });
      this.notifyAbortIfNeeded();
      this.notifyStopReasonIfNeeded();
    }
  }


  recordDebriefRequested(reason = 'user') {
    if (this.debriefTransitionCount === 0 && this.executionTransaction) {
      advanceMissionExecutionTransaction(this.executionTransaction, 'debriefRequested', {
        reason,
        resultAvailable: Boolean(this.app.state.result),
        timeSeconds: this.engine?.t ?? 0
      });
      this.app.state.executionTransaction = this.executionTransaction;
    }
    this.debriefTransitionCount += 1;
    this.engine?.pause?.();
    this.publishExecutionDebug({ debriefRequested: true });
  }
  goDebrief() {
    this.syncResult();
    if (this.engine.complete) recordStochasticRun(this.app.state, this.app.state.result);
    clearPlanningOverlayState(this.app.state);
    this.graphics?.clear();
    this.app.state.mode = 'debrief';
    this.clearSimulationWaitState();
    this.recordDebriefRequested('debrief');
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
    this.recordSimulationProgressStage(beforeStepCount, wasRunning ? 'playbackUpdate' : 'update');
    if (wasRunning) {
      traceSimulation(this.trace, {
        scene: 'SimulationScene',
        phase: 'simulation.step.end',
        simTime: this.engine.t,
        message: 'Scene update step returned',
        details: { stepsThisFrame: this.engine.stepCount - beforeStepCount }
      });
    }
    if (wasRunning || this.engine.complete || this.engine.awaitingSurfaceDecision || this.engine.routeFailureDecision?.active) {
      this.syncSimulationTimeToState();
      this.publishLatestSimulationSnapshot(wasRunning ? 'playbackStep' : 'status');
    }
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
      this.consumeScheduledPresentationFrame({ force: decisionActive || this.engine.complete, reason: 'update' });
      this.renderAccumulator = 0;
    }
    this.refreshSurfaceDecision();
    this.refreshRouteFailureDecision();
    this.notifyAbortIfNeeded();
    this.notifyStopReasonIfNeeded();
  }


  recordSimulationProgressStage(beforeStepCount = 0, reason = 'step') {
    if (!this.engine) return;
    if (!this.firstStepCompleted && this.engine.stepCount > beforeStepCount) {
      this.firstStepCompleted = true;
      if (this.executionTransaction) {
        advanceMissionExecutionTransaction(this.executionTransaction, 'firstStepCompleted', {
          reason,
          timeSeconds: this.engine.t,
          stepCount: this.engine.stepCount,
          activeAgentPositions: (this.engine.agents ?? []).map((agent) => ({ agentId: agent.id, x: agent.x, y: agent.y, energy: agent.energy ?? agent.battery ?? null }))
        });
      }
    }
    if (!this.runningReported && this.engine.running) {
      this.runningReported = true;
      if (this.executionTransaction) advanceMissionExecutionTransaction(this.executionTransaction, 'running', { timeSeconds: this.engine.t, stepCount: this.engine.stepCount });
    }
    if (!this.terminalReported && (this.engine.complete || this.engine.aborted)) {
      this.terminalReported = true;
      if (this.executionTransaction) advanceMissionExecutionTransaction(this.executionTransaction, 'terminal', {
        timeSeconds: this.engine.t,
        complete: this.engine.complete === true,
        aborted: this.engine.aborted === true,
        abortReason: this.engine.abortReason ?? null
      });
    }
    if (this.executionTransaction) this.app.state.executionTransaction = this.executionTransaction;
    this.publishExecutionDebug();
  }
  syncResult() {
    const source = this.app.state.currentPlanSource ?? 'manual';
    const engineResult = this.engine.getResult();
    const summary = engineResult.summary ?? {};
    const terrainAwareValidation = buildTerrainAwareSimulationResultSummary(this.launchPayload, engineResult);
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
      },
      terrainAwareValidation
    }, this.app.state.level, this.app.state.mission);
    this.annotateBenchmarkResult(result, source);
    annotateStochasticResult(this.app.state, result);
    storePlanResult(this.app.state, { source, plan: this.app.state.plan, result });
    result.comparison = comparePlanResults(this.app.state.planResults);
    this.app.state.result = result;
    if (!this.terminalReported && (this.engine.complete || this.engine.aborted)) {
      this.terminalReported = true;
      if (this.executionTransaction) {
        advanceMissionExecutionTransaction(this.executionTransaction, 'terminal', {
          reason: 'syncResult',
          timeSeconds: this.engine.t,
          complete: this.engine.complete === true,
          aborted: this.engine.aborted === true,
          abortReason: this.engine.abortReason ?? null
        });
        this.app.state.executionTransaction = this.executionTransaction;
      }
    }
    if (!this.terminalResultRecorded && (this.engine.complete || this.engine.aborted)) {
      this.terminalResultRecorded = true;
      this.resultBuildCount += 1;
      if (this.executionTransaction) {
        advanceMissionExecutionTransaction(this.executionTransaction, 'resultBuilt', {
          resultId: result.resultId ?? result.id ?? null,
          finalScore: result.summary?.finalScore ?? null,
          terminalReason: result.summary?.stopReason?.code ?? null
        });
        this.app.state.executionTransaction = this.executionTransaction;
      }
      this.publishExecutionDebug();
    }
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

  publishLatestSimulationSnapshot(reason = 'snapshot') {
    if (!this.presentationScheduler || !this.engine) return;
    const engineStepCount = Number(this.engine.stepCount ?? 0);
    const eventCount = Number(this.engine.events?.length ?? 0);
    const trajectoryPointCount = (this.engine.agents ?? []).reduce((sum, agent) => sum + Number(agent.history?.length ?? 0), 0);
    const categories = [];
    if (engineStepCount !== Number(this.lastPresentedEngineStepCount ?? -1)) {
      categories.push(...dirtyCategoriesForSimulationPresentationEvent('motionSnapshot', {
        newTrajectoryPoint: trajectoryPointCount > Number(this.lastPresentedTrajectoryPointCount ?? 0),
        routeStatusChanged: Boolean(this.engine.awaitingSurfaceDecision || this.engine.routeFailureDecision?.active || this.engine.complete || this.engine.aborted),
        includeHud: true
      }));
    }
    if (eventCount > Number(this.lastPresentedEventCount ?? 0)) {
      const events = this.engine.events ?? [];
      const added = events.slice(Number(this.lastPresentedEventCount ?? 0));
      if (added.some((event) => ['sample', 'duplicateSample', 'probabilityOutcome'].includes(event.type))) categories.push(...dirtyCategoriesForSimulationPresentationEvent('observation'));
      if (added.some((event) => /surface/i.test(event.type ?? '') || event.gpsFix === true || event.canReplan === true)) categories.push(...dirtyCategoriesForSimulationPresentationEvent('surfacing'));
    }
    if (this.engine.complete || this.engine.aborted) categories.push(...dirtyCategoriesForSimulationPresentationEvent('terminal'));
    publishSimulationPresentationSnapshot(this.presentationScheduler, {
      engineStepCount,
      eventCount,
      trajectoryPointCount,
      simulationTimeSeconds: this.engine.t,
      complete: this.engine.complete === true,
      running: this.engine.running === true,
      reason
    }, { engineStepCount });
    markSimulationPresentationDirty(this.presentationScheduler, [...new Set(categories)], reason);
    this.lastPresentedEngineStepCount = engineStepCount;
    this.lastPresentedEventCount = eventCount;
    this.lastPresentedTrajectoryPointCount = trajectoryPointCount;
  }

  consumeScheduledPresentationFrame(options = {}) {
    const started = globalThis.performance?.now?.() ?? Date.now();
    const frame = consumeSimulationPresentationFrame(this.presentationScheduler, started, { force: options.force === true });
    if (!frame.shouldPresent) return frame;
    this.latestPresentationFrame = frame;
    this.refresh({ reason: options.reason ?? frame.reasons?.at?.(-1) ?? 'scheduled', presentationOnly: options.presentationOnly === true, dirtyCategories: frame.dirtyCategories });
    this.finishPresentationMilliseconds += Math.max(0, (globalThis.performance?.now?.() ?? Date.now()) - started);
    return frame;
  }
  refresh(options = {}) {
    this.currentPresentationDirtyCategories = Array.isArray(options.dirtyCategories) ? [...options.dirtyCategories] : null;
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
    const uiNow = globalThis.performance?.now?.() ?? Date.now();
    const criticalUi = options.presentationOnly !== true && (this.engine.complete || this.engine.aborted || this.engine.awaitingSurfaceDecision || this.engine.routeFailureDecision?.active || /selection|terminal|finish/i.test(String(options.reason ?? '')));
    const hudDue = criticalUi || uiNow - Number(this.lastHudRenderAt ?? 0) >= 100;
    if (hudDue) {
      this.app.waypointPanel?.refresh(this.app.state, { engine: this.engine });
      this.app.summaryHud?.refresh(this.app.state, { engine: this.engine });
      this.app.agentPerformanceHud?.refresh(this.app.state, { engine: this.engine });
      this.refreshControls();
      this.renderSimulationTimeline();
      this.hudRenderCount += 1;
      this.rightPanelRenderCount += 1;
      this.timelineRenderCount += 1;
      this.lastHudRenderAt = uiNow;
    } else {
      this.hudRenderSkipCount += 1;
      this.rightPanelRenderSkipCount += 1;
      this.timelineRenderSkipCount += 1;
    }
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
      markSimulationLaunchStage('createThreeRenderer');
      this.threeSimulationRenderer = createThreeMissionWorldRenderer(container, {
        camera: { preset: this.app.state.ui?.threeMissionCameraPreset ?? 'obliqueMission' },
        layerVisibility: this.threeSimulationLayerVisibilityPatch()
      });
      registerThreeMissionSceneResource(this.threeSceneLifecycle, 'renderer', this.threeSimulationRenderer);
      registerThreeMissionSceneResource(this.threeSceneLifecycle, 'cameraController', this.threeSimulationRenderer.cameraController);
      registerThreeMissionSceneResource(this.threeSceneLifecycle, 'canvas', this.threeSimulationRenderer.renderer?.domElement);
      completeSimulationLaunchStage('createThreeRenderer');
    }
    this.ensureThreeSimulationInteractionController();
    resizeThreeMissionWorldRenderer(this.threeSimulationRenderer, container.clientWidth, container.clientHeight);
    return this.threeSimulationRenderer;
  }

  hideThreeSimulationRenderer() {
    if (this.threeSimulationContainer) this.threeSimulationContainer.hidden = true;
  }

  disposeThreeSimulationRenderer() {
    disposeThreeMissionInteractionController(this.threeSimulationInteractionController);
    this.threeSimulationInteractionController = null;
    disposeThreeMissionWorldRenderer(this.threeSimulationRenderer);
    this.threeSimulationRenderer = null;
    this.threeSimulationContainer?.remove?.();
    this.threeSimulationContainer = null;
    globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG = inactiveThreePerformanceDebugPayload();
  }

  ensureThreeSimulationInteractionController() {
    if (!this.threeSimulationRenderer?.renderer?.domElement) return null;
    if (!this.threeSimulationInteractionController || this.threeSimulationInteractionController.disposed) {
      this.threeSimulationInteractionController = createThreeMissionInteractionController({
        renderer: this.threeSimulationRenderer,
        camera: this.threeSimulationRenderer.camera,
        domElement: this.threeSimulationRenderer.renderer.domElement,
        getViewModel: () => this.simulationRenderViewModel,
        emitIntent: (intent) => this.handleThreeSimulationIntent(intent),
        options: { interactionMode: 'selectInspect', allowEditing: false }
      });
      registerThreeMissionSceneResource(this.threeSceneLifecycle, 'interactionController', this.threeSimulationInteractionController);
    }
    setThreeMissionInteractionEnabled(this.threeSimulationInteractionController, this.getSimulationRendererBackend() === 'threeMission3d');
    return this.threeSimulationInteractionController;
  }
  buildSimulationWorldViewModelForScene(renderTime = null) {
    this.simulationViewModelBuildCount = Number(this.simulationViewModelBuildCount ?? 0) + 1;
    markSimulationLaunchStage('buildSimulationRenderViewModel');
    const layerVisibility = this.threeSimulationLayerVisibilityPatch();
    const input = simulationWorldRenderInputFromScene(this, {
      activeTimeSeconds: renderTime ?? this.engine?.t ?? 0,
      displaySettings: {
        rendererBackend: 'threeMission3d',
        cameraPreset: this.app.state.ui?.threeMissionCameraPreset ?? 'obliqueMission',
        ...layerVisibility,
        showCurrents: layerVisibility.currentVectors
      }
    });
    this.simulationRenderInput = input;
    const flatViewModel = buildSimulationWorldRenderViewModel(input);
    const viewModel = augmentMissionWorldWithVolumetricModel(flatViewModel, {
      ...input,
      displaySettings: { ...(input.displaySettings ?? {}), waterColumn: this.app.state.ui?.waterColumn ?? {} },
      waterColumn: this.app.state.ui?.waterColumn ?? {},
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan
    });
    if (this.currentPresentationDirtyCategories) viewModel.presentationDirtyCategories = [...this.currentPresentationDirtyCategories];
    viewModel.presentationSchedulerSummary = threeSimulationPresentationSchedulerSummary(this.presentationScheduler);
    this.simulationRenderViewModel = viewModel;
    completeSimulationLaunchStage('buildSimulationRenderViewModel');
    return viewModel;
  }

  refreshThreeSimulationRenderer(renderTime = null) {
    const renderer = this.ensureThreeSimulationRenderer();
    const viewModel = this.buildSimulationWorldViewModelForScene(renderTime);
    updateThreeMissionInteractionContext(this.ensureThreeSimulationInteractionController(), viewModel);
    if (!renderer) {
      this.updateSimulationRenderDebug({ activeBackend: 'threeMission3d', threeMounted: false, viewModel, parityWarnings: ['Three simulation renderer could not mount DOM container.'] });
      return;
    }
    const requestedCameraPreset = this.app.state.ui?.threeMissionCameraPreset ?? 'obliqueMission';
    if (renderer.lastRequestedCameraPreset !== requestedCameraPreset || renderer.cameraState?.manual !== true) {
      setThreeMissionWorldCamera(renderer, { preset: requestedCameraPreset });
      renderer.lastRequestedCameraPreset = requestedCameraPreset;
    }
    setThreeMissionLayerVisibility(renderer, this.threeSimulationLayerVisibilityPatch());
    updateThreeMissionWorldRenderer(renderer, viewModel);
    resizeThreeMissionWorldRenderer(renderer, this.threeSimulationContainer?.clientWidth, this.threeSimulationContainer?.clientHeight);
    if (!this.rendererMountedReported) {
      this.rendererMountedReported = true;
      if (this.executionTransaction) {
        advanceMissionExecutionTransaction(this.executionTransaction, 'rendererMounted', {
          rendererBackend: 'threeMission3d',
          realizedTrajectoryCount: viewModel.realizedTrajectories?.length ?? 0,
          plannedRouteCount: viewModel.routes?.length ?? 0
        });
        this.app.state.executionTransaction = this.executionTransaction;
      }
    }
    const validation = validateSimulationWorldRenderViewModel(viewModel);
    const parityWarnings = [...(validation.warnings ?? [])];
    if (renderer.currentGlyphPresentationWarning) {
      parityWarnings.push(renderer.currentGlyphPresentationWarning);
      if (!this.currentGlyphPresentationWarningShown) {
        this.currentGlyphPresentationWarningShown = true;
        this.app.toast?.(renderer.currentGlyphPresentationWarning, 'warning');
      }
    }
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
      currentVectors: layers.currentVectors !== false && this.app.state.ui?.showCurrents !== false && new URLSearchParams(globalThis.location?.search ?? '').get('currentDisplay') !== 'safe',
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
      interaction: true
    };
  }

  handleThreeSimulationIntent(intent) {
    this.lastThreeSimulationIntent = intent;
    const result = this.routeThreeSimulationIntent(intent);
    this.lastThreeSimulationResult = result;
    this.app.state.ui ??= {};
    const state = this.app.state.ui.threeSimulationInteraction ??= {};
    state.lastIntent = summarizeSimulationIntent(intent);
    state.lastResult = summarizeSimulationResult(result);
    state.lastInteractionIntents = [...(state.lastInteractionIntents ?? []), state.lastIntent].slice(-12);
    if (result.status === 'rejected' || result.status === 'invalid') this.app.toast?.(result.userMessage || 'That simulation object is not selectable.', 'warning');
    if (result.accepted) this.refreshThreeSimulationRenderer(this.engine?.t ?? null);
    else this.updateSimulationRenderDebug({ activeBackend: this.getSimulationRendererBackend(), threeMounted: Boolean(this.threeSimulationRenderer), viewModel: this.simulationRenderViewModel, renderer: this.threeSimulationRenderer });
    return result;
  }

  routeThreeSimulationIntent(intent) {
    switch (intent?.intentId) {
      case 'selectAgent':
        return this.selectSimulationAgentFromThree(intent.agentId ?? intent.metadata?.objectId, intent);
      case 'selectObservation':
        return this.selectSimulationObservationFromThree(intent.observationId ?? intent.metadata?.objectId, intent);
      case 'selectSurfacingEvent':
        return this.selectSimulationSurfacingEventFromThree(intent.surfacingEventId ?? intent.metadata?.objectId, intent);
      case 'selectRouteSegment':
        return this.selectSimulationRouteSegmentFromThree(intent.routeSegmentId ?? intent.metadata?.objectId, intent);
      case 'selectRouteFailure':
        return this.selectSimulationRouteFailureFromThree(intent.routeFailureId ?? intent.metadata?.objectId, intent);
      case 'clearHover':
      case 'cancelInteraction':
        return this.clearThreeSimulationInspection(intent);
      case 'hoverCell':
        return this.simulationInteractionResult(intent, 'noChange', { userMessage: '' });
      case 'cameraChanged':
        this.updateSimulationRenderDebug({
          activeBackend: this.getSimulationRendererBackend(),
          threeMounted: Boolean(this.threeSimulationRenderer),
          viewModel: this.simulationRenderViewModel,
          renderer: this.threeSimulationRenderer
        });
        return this.simulationInteractionResult(intent, 'noChange', { userMessage: '' });
      default:
        return this.simulationInteractionResult(intent, 'noChange', { userMessage: 'Simulation renderer received a non-editing intent.' });
    }
  }

  simulationInteractionResult(intent, status, patch = {}) {
    return createMissionWorldInteractionResult({
      intentId: intent?.intentId ?? null,
      status,
      changedCanonicalState: patch.changedCanonicalState === true,
      selectedAgentId: patch.selectedAgentId ?? this.app.state.selectedAgentId ?? null,
      selectedObservationId: patch.selectedObservationId ?? null,
      selectedSurfacingEventId: patch.selectedSurfacingEventId ?? null,
      selectedRouteSegmentId: patch.selectedRouteSegmentId ?? null,
      selectedRouteFailureId: patch.selectedRouteFailureId ?? null,
      warnings: patch.warnings ?? [],
      userMessage: patch.userMessage ?? '',
      boundaryFlags: {
        ownsPlanning: false,
        ownsSimulation: false,
        ownsScoring: false,
        changesOfficialBrowserScoring: false,
        usesNewPlanner: false,
        usesRouteOptimizer: false
      }
    });
  }

  selectSimulationAgentFromThree(agentId, intent) {
    const id = agentId ?? this.simulationRenderViewModel?.gliders?.[0]?.agentId ?? null;
    const record = this.findSimulationRecord('glider', id);
    if (!record?.agentId) return this.simulationInteractionResult(intent, 'rejected', { userMessage: 'No live glider was found at that point.' });
    this.app.state.selectedAgentId = record.agentId;
    return this.recordThreeSimulationInspection(intent, 'glider', record, `Selected ${record.agentId}.`, {
      selectedAgentId: record.agentId,
      changedCanonicalState: true
    });
  }

  selectSimulationObservationFromThree(observationId, intent) {
    const record = this.findSimulationRecord('observation', observationId);
    if (!record?.id) return this.simulationInteractionResult(intent, 'rejected', { userMessage: 'No public observation was found at that point.' });
    return this.recordThreeSimulationInspection(intent, 'observation', record, `Observation at ${formatMissionTime(this.app.state.level, record.timeSeconds ?? 0)}.`, {
      selectedObservationId: record.id,
      changedCanonicalState: true
    });
  }

  selectSimulationSurfacingEventFromThree(surfacingEventId, intent) {
    const record = this.findSimulationRecord('surfacingEvent', surfacingEventId);
    if (!record?.id) return this.simulationInteractionResult(intent, 'rejected', { userMessage: 'No surfacing or communication event was found at that point.' });
    return this.recordThreeSimulationInspection(intent, 'surfacingEvent', record, `Surfacing event at ${formatMissionTime(this.app.state.level, record.timeSeconds ?? 0)}.`, {
      selectedSurfacingEventId: record.id,
      changedCanonicalState: true
    });
  }

  selectSimulationRouteSegmentFromThree(routeSegmentId, intent) {
    const record = this.findSimulationRecord('routeSegment', routeSegmentId);
    if (!record?.id) return this.simulationInteractionResult(intent, 'rejected', { userMessage: 'No planned or realized route segment was found at that point.' });
    const label = record.status === 'realized' || record.sampled ? 'Realized route' : 'Planned route';
    return this.recordThreeSimulationInspection(intent, 'routeSegment', record, `${label} inspected.`, {
      selectedRouteSegmentId: record.id,
      changedCanonicalState: true
    });
  }

  selectSimulationRouteFailureFromThree(routeFailureId, intent) {
    const record = this.findSimulationRecord('routeFailure', routeFailureId);
    if (!record?.id) return this.simulationInteractionResult(intent, 'rejected', { userMessage: 'No route failure was found at that point.' });
    return this.recordThreeSimulationInspection(intent, 'routeFailure', record, `Route failure inspected: ${routeFailureTitle(record.type ?? record.status ?? 'routeFailure')}.`, {
      selectedRouteFailureId: record.id,
      changedCanonicalState: true
    });
  }

  recordThreeSimulationInspection(intent, objectType, record, message, patch = {}) {
    this.recordSelectedSimulationObject(objectType, record?.id ?? record?.agentId ?? patch.selectedAgentId ?? null, record);
    this.updateSimulationSelectionPanels();
    return this.simulationInteractionResult(intent, 'accepted', { ...patch, userMessage: message });
  }

  recordSelectedSimulationObject(objectType, objectId, record = {}) {
    this.app.state.ui ??= {};
    const state = this.app.state.ui.threeSimulationInteraction ??= {};
    state.selectedObjectType = objectType ?? null;
    state.selectedObjectId = objectId ?? null;
    state.selectedSummary = publicSimulationRecordSummary(objectType, record);
    state.selectedObservationId = objectType === 'observation' ? objectId : null;
    state.selectedSurfacingEventId = objectType === 'surfacingEvent' ? objectId : null;
    state.selectedRouteSegmentId = objectType === 'routeSegment' ? objectId : null;
    state.selectedRouteFailureId = objectType === 'routeFailure' ? objectId : null;
    state.selectedAgentId = objectType === 'glider' ? objectId : this.app.state.selectedAgentId ?? null;
    return state;
  }

  clearThreeSimulationInspection(intent) {
    this.app.state.ui ??= {};
    this.app.state.ui.threeSimulationInteraction = {
      ...(this.app.state.ui.threeSimulationInteraction ?? {}),
      selectedObjectType: null,
      selectedObjectId: null,
      selectedSummary: null,
      selectedObservationId: null,
      selectedSurfacingEventId: null,
      selectedRouteSegmentId: null,
      selectedRouteFailureId: null
    };
    return this.simulationInteractionResult(intent, 'cancelled', { changedCanonicalState: true, userMessage: 'Simulation inspection cleared.' });
  }

  findSimulationRecord(kind, id) {
    const viewModel = this.simulationRenderViewModel ?? this.buildSimulationWorldViewModelForScene(this.engine?.t ?? null);
    const matchesId = (record) => !id || record?.id === id || record?.agentId === id || record?.routeSegmentId === id;
    if (kind === 'glider') return (viewModel.gliders ?? []).find((record) => record.agentId === id) ?? null;
    if (kind === 'observation') return (viewModel.observations ?? []).find(matchesId) ?? null;
    if (kind === 'surfacingEvent') return [...(viewModel.surfacingEvents ?? []), ...(viewModel.communicationEvents ?? [])].find(matchesId) ?? null;
    if (kind === 'routeFailure') return [...(viewModel.routeFailures ?? []), ...(viewModel.missedWaypoints ?? [])].find(matchesId) ?? null;
    if (kind === 'routeSegment') return [...(viewModel.realizedTrajectories ?? []), ...(viewModel.sampledTrajectories ?? []), ...(viewModel.routes ?? [])].find(matchesId) ?? null;
    return null;
  }

  updateSimulationSelectionPanels() {
    this.app.waypointPanel?.refresh?.(this.app.state, { engine: this.engine });
    this.app.summaryHud?.refresh?.(this.app.state, { engine: this.engine });
    this.app.agentPerformanceHud?.refresh?.(this.app.state, { engine: this.engine });
    this.refreshControls?.();
    this.renderSimulationTimeline?.();
  }

  installSimulationRenderTestApi() {
    globalThis.ANCHOR_MISSION_RENDER_TEST_API = {
      version: 'three-r1-simulation',
      rendererBackend: this.getSimulationRendererBackend(),
      hasThreeRenderer: Boolean(this.threeSimulationRenderer),
      screenPointForGridCell: (x, y) => this.screenPointForSimulationCell({ x, y }),
      screenPointForDepthCell: (layerId, x, y) => this.screenPointForSimulationDepthCell(layerId, { x, y }),
      screenPointForWaypoint: () => null,
      screenPointForAgent: (agentId = null) => this.screenPointForSimulationRecord(this.findSimulationRecord('glider', agentId ?? this.app.state.selectedAgentId ?? this.simulationRenderViewModel?.gliders?.[0]?.agentId)),
      screenPointForMarker: () => null,
      screenPointForPriorityTarget: () => null,
      screenPointForObservation: (observationId = null) => this.screenPointForSimulationRecord(this.findSimulationRecord('observation', observationId)),
      screenPointForSurfacingEvent: (surfacingEventId = null) => this.screenPointForSimulationRecord(this.findSimulationRecord('surfacingEvent', surfacingEventId)),
      screenPointForRouteSegment: (routeSegmentId = null) => this.screenPointForSimulationRecord(this.findSimulationRecord('routeSegment', routeSegmentId)),
      screenPointForRouteFailure: (routeFailureId = null) => this.screenPointForSimulationRecord(this.findSimulationRecord('routeFailure', routeFailureId)),
      setCameraPresetForTest: (preset) => {
        this.setThreeSimulationCameraPreset(preset);
        return this.threeSimulationRenderer?.cameraState ?? null;
      },
      interactionControllerSummary: () => threeMissionInteractionControllerSummary(this.threeSimulationInteractionController ?? {}),
      renderDebug: () => globalThis.ANCHOR_SIMULATION_RENDER_DEBUG ?? null,
      resetPerformanceWindow: () => {
        resetThreeMissionWorldRendererPerformance(this.threeSimulationRenderer);
        this.presentationScheduler = createThreeSimulationPresentationScheduler({ maxHz: 30 });
        this.latestPresentationFrame = null;
        this.lastPresentedEngineStepCount = Number(this.engine?.stepCount ?? 0);
        this.lastPresentedEventCount = Number(this.engine?.events?.length ?? 0);
        this.lastPresentedTrajectoryPointCount = (this.engine?.agents ?? []).reduce((sum, agent) => sum + Number(agent.history?.length ?? 0), 0);
        this.hudRenderCount = 0;
        this.rightPanelRenderCount = 0;
        this.timelineRenderCount = 0;
        this.hudRenderSkipCount = 0;
        this.rightPanelRenderSkipCount = 0;
        this.timelineRenderSkipCount = 0;
        return true;
      },
      performanceDebug: () => globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG ?? null
    };
  }

  screenPointForSimulationCell(cell) {
    if (!this.threeSimulationRenderer || !this.simulationRenderViewModel?.coordinateSystem || !cell) return null;
    const world = gridCellToWorld(this.simulationRenderViewModel.coordinateSystem, cell.x, cell.y, 0);
    return this.projectSimulationThreeWorldPoint({ x: world.x, y: Number(world.y ?? 0) + 0.68, z: world.z });
  }

  screenPointForSimulationDepthCell(layerId, cell) {
    if (!this.threeSimulationRenderer || !this.simulationRenderViewModel?.coordinateModel || !cell) return null;
    const world = depthLayerCellCenterToWorld(layerId, cell.x, cell.y, this.simulationRenderViewModel.coordinateModel);
    return this.projectSimulationThreeWorldPoint({ x: world.x, y: Number(world.y ?? 0) + 0.08, z: world.z });
  }

  screenPointForSimulationRecord(record) {
    if (!record) return null;
    const points = record.points ?? [];
    if (points.length) {
      const mid = points[Math.floor((points.length - 1) / 2)];
      return this.screenPointForSimulationCell({ x: mid.x ?? mid.col, y: mid.y ?? mid.row });
    }
    return this.screenPointForSimulationCell({ x: record.x ?? record.col, y: record.y ?? record.row });
  }

  projectSimulationThreeWorldPoint(point) {
    const renderer = this.threeSimulationRenderer;
    const rect = renderer?.renderer?.domElement?.getBoundingClientRect?.();
    if (!renderer?.camera || !rect) return null;
    const vector = new THREE.Vector3(Number(point.x), Number(point.y), Number(point.z));
    vector.project(renderer.camera);
    return {
      x: rect.left + ((vector.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - vector.y) / 2) * rect.height,
      ndcX: vector.x,
      ndcY: vector.y,
      visible: vector.z >= -1 && vector.z <= 1
    };
  }
  updateSimulationRenderDebug({ activeBackend, threeMounted, viewModel, renderer = null, parityWarnings = [] } = {}) {
    const summary = simulationWorldRenderViewModelSummary(viewModel ?? {});
    const rendererSummary = renderer ? threeMissionWorldRendererSummary(renderer) : null;
    const controllerSummary = this.threeSimulationInteractionController ? threeMissionInteractionControllerSummary(this.threeSimulationInteractionController) : null;
    const interactionState = this.app.state.ui?.threeSimulationInteraction ?? {};
    const canvas = renderer?.renderer?.domElement ?? null;
    const canvasPointerEvents = canvas ? globalThis.getComputedStyle?.(canvas)?.pointerEvents ?? canvas.style?.pointerEvents ?? 'auto' : null;
    const status = viewModel?.simulationStatus ?? {};
    const progress = viewModel?.missionProgress ?? {};
    const selectedAgentIdForDebug = this.app.state.selectedAgentId ?? viewModel?.selectedAgentId ?? null;
    const selectedPoseSummary = (rendererSummary?.gliderPoseSummaries ?? []).find((pose) => pose.agentId === selectedAgentIdForDebug) ?? rendererSummary?.gliderPoseSummaries?.[0] ?? null;
    const selectedGliderMesh = renderer?.groups?.gliderGroup?.children?.find?.((mesh) => mesh.userData?.agentId === selectedAgentIdForDebug) ?? null;
    const guidanceSummary = rendererSummary?.guidanceSummary ?? {};
    const waterColumnUi = this.app.state.ui?.waterColumn ?? {};
    const canonicalObservationCount = (this.engine?.events ?? []).filter((event) => ['sample', 'duplicateSample', 'probabilityOutcome'].includes(event.type)).length;
    const terrainDiagnosticCounters = this.engine?.terrainDiagnostics?.counters ?? {};
    const terrainEventSummary = this.engine?.terrainDiagnostics?.eventSummary ?? null;
    const waterColumnDebug = waterColumnRenderDebugPayload(viewModel ?? {}, rendererSummary, {
      phase: 'simulation',
      selectedDiveProfileId: waterColumnUi.selectedDiveProfileId,
      selectedTargetDepthLayerId: waterColumnUi.selectedTargetDepthLayerId,
      defaultDisplayModeApplied: waterColumnUi.defaultDisplayModeApplied === true,
      cameraPresetId: this.app.state.ui?.threeMissionCameraPreset ?? null,
      lifecycleCleanupErrorCount: Number(this.cleanupErrorCount ?? 0),
      canonicalObservationCount
    });
    globalThis.ANCHOR_WATER_COLUMN_RENDER_DEBUG = waterColumnDebug;
    const volumetricCurrentDebug = volumetricCurrentDebugPayload(viewModel ?? {}, rendererSummary, { terrainDigest: rendererSummary?.terrainSourceDigest ?? null });
    globalThis.ANCHOR_VOLUMETRIC_CURRENT_DEBUG = volumetricCurrentDebug;
    globalThis.ANCHOR_CURRENT_PRESENTATION_DEBUG = buildCurrentPresentationDebug({
      phase: 'simulation',
      runtimeShell: 'default',
      viewModel,
      rendererSummary,
      currentDebug: volumetricCurrentDebug,
      ui: this.app.state.ui ?? {},
      layerVisibility: this.threeSimulationLayerVisibilityPatch(),
      warnings: parityWarnings
    });
    const currentViewportWarning = currentVectorViewportWarning(volumetricCurrentDebug);
    const performanceDebug = createThreePerformanceDebugPayload({
      rendererSummary,
      phase: 'simulation',
      qualityProfile: this.app.state.ui?.waterColumn?.qualityProfile ?? this.app.state.ui?.threeMissionQualityProfile ?? 'balanced',
      missionViewModelBuildCount: Number(this.simulationViewModelBuildCount ?? 0),
      counters: {
        ...(this.latestPresentationFrame?.counters ?? {}),
        hudRender: this.hudRenderCount,
        rightPanelRender: this.rightPanelRenderCount,
        timelineRender: this.timelineRenderCount,
        incrementalTerrainDiagnosticsUpdateCount: terrainDiagnosticCounters.incrementalTerrainDiagnosticsUpdateCount ?? terrainDiagnosticCounters.updateCount ?? 0,
        runtimeTerrainDiagnosticsUpdateCount: terrainDiagnosticCounters.incrementalTerrainDiagnosticsUpdateCount ?? terrainDiagnosticCounters.updateCount ?? 0,
        fullTerrainDiagnosticsRebuildCount: terrainDiagnosticCounters.fullTerrainDiagnosticsRebuildCount ?? 0,
        trajectoryPointsScannedDuringLastUpdate: terrainDiagnosticCounters.trajectoryPointsScannedDuringLastUpdate ?? 0,
        eventsScannedDuringLastUpdate: terrainDiagnosticCounters.eventsScannedDuringLastUpdate ?? 0,
        terrainEventSummaryIncrementCount: terrainDiagnosticCounters.terrainEventSummaryIncrementCount ?? 0,
        terrainEventSummaryFullRebuildCount: terrainDiagnosticCounters.terrainEventSummaryFullRebuildCount ?? 0,
        resultExportBuildCount: this.resultBuildCount ?? 0
      },
      renderOnDemandEnabled: true,
      continuousAnimationReason: 'presentation-scheduler-coalesced-updates'
    });
    globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG = performanceDebug;
    setSimulationLaunchRendererCounts({
      activeRendererCount: rendererSummary?.activeRendererCount ?? 0,
      activeRafCount: rendererSummary?.activeRafCount ?? 0,
      estimatedRenderBufferBytes: rendererSummary?.estimatedRenderBufferBytes ?? 0
    });
    const launchDebug = simulationLaunchDebugSnapshot(this.launchProfiler);
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
      currentVisualizationAvailable: viewModel?.currentVisualizationAvailable === true,
      currentPresentationRequested: volumetricCurrentDebug.currentPresentationRequested === true,
      currentPresentationEnabled: volumetricCurrentDebug.currentPresentationEnabled === true,
      currentGlyphPresentationEnabled: volumetricCurrentDebug.currentPresentationEnabled === true,
      currentDisplayMode: volumetricCurrentDebug.currentDisplayMode ?? null,
      currentSafeModeExplicit: volumetricCurrentDebug.currentSafeModeExplicit === true,
      currentActiveLayerId: volumetricCurrentDebug.currentActiveLayerId ?? null,
      currentActiveDepthMeters: volumetricCurrentDebug.currentActiveDepthMeters ?? null,
      currentActiveTimeSeconds: volumetricCurrentDebug.currentActiveTimeSeconds ?? null,
      currentVectorSampleCount: volumetricCurrentDebug.sourceVectorSampleCount ?? 0,
      currentVectorValidCount: volumetricCurrentDebug.finiteVectorSampleCount ?? 0,
      currentNonzeroVectorCount: volumetricCurrentDebug.nonzeroVectorSampleCount ?? 0,
      currentVisibleVectorInstanceCount: volumetricCurrentDebug.visibleVectorInstanceCount ?? 0,
      currentGlyphBoundsInFrustum: volumetricCurrentDebug.glyphBoundsInFrustum ?? null,
      currentGlyphOpacity: volumetricCurrentDebug.glyphOpacity ?? null,
      currentGlyphRenderOrder: volumetricCurrentDebug.glyphRenderOrder ?? null,
      currentNoVisibleVectorsReason: volumetricCurrentDebug.noVisibleVectorsReason ?? null,
      currentViewportWarning,
      terrainSourceDigest: rendererSummary?.terrainSourceDigest ?? null,
      terrainMeshDigest: rendererSummary?.terrainMeshDigest ?? null,
      terrainCoordinateProfileId: rendererSummary?.terrainCoordinateProfileId ?? null,
      terrainLayerImplementationId: rendererSummary?.terrainLayerImplementationId ?? null,
      usesSharedTerrainLayer: rendererSummary?.usesSharedTerrainLayer === true,
      usesLegacyTerrainLayer: rendererSummary?.usesLegacyTerrainLayer === true,
      lastWaypointTerrainValidationSource: 'canonicalPlanExecutionValidator',
      lastRouteTerrainValidationSource: 'canonicalSimulationEngine',
      usesMeshRaycastForValidity: false,
      selectedAgentId: selectedAgentIdForDebug,
      poseSummaryCount: rendererSummary?.gliderPoseSummaries?.length ?? 0,
      poseWarnings: (rendererSummary?.gliderPoseSummaries ?? []).flatMap((pose) => pose.warnings ?? []),
      currentBodyHeadingRadians: selectedPoseSummary?.headingRadians ?? null,
      currentActualCourseRadians: selectedPoseSummary?.courseOverGroundRadians ?? null,
      selectedAgentPitchRadians: selectedPoseSummary?.pitchRadians ?? null,
      selectedAgentOrientationSource: selectedPoseSummary?.orientationSource ?? null,
      selectedAgentCourseSource: selectedPoseSummary?.courseSource ?? null,
      currentBodyQuaternion: selectedGliderMesh?.quaternion ? { x: selectedGliderMesh.quaternion.x, y: selectedGliderMesh.quaternion.y, z: selectedGliderMesh.quaternion.z, w: selectedGliderMesh.quaternion.w } : null,
      guidanceLayerCount: rendererSummary?.guidanceObjectCount ?? 0,
      guidanceAvailable: guidanceSummary.guidanceAvailable === true,
      guidanceConeVisible: guidanceSummary.guidanceConeVisible === true,
      unreachedTimeOverrunWaypointCount: (this.engine?.agents ?? []).reduce((sum, agent) => sum + (agent.missedWaypoints ?? []).filter((item) => item.reason === 'missionTimeExpired').length, 0),
      selectedObservationId: interactionState.selectedObservationId ?? null,
      selectedRouteSegmentId: interactionState.selectedRouteSegmentId ?? null,
      selectedSurfacingEventId: interactionState.selectedSurfacingEventId ?? null,
      selectedRouteFailureId: interactionState.selectedRouteFailureId ?? null,
      selectedInspectionType: interactionState.selectedObjectType ?? null,
      selectedInspectionSummary: interactionState.selectedSummary ?? null,
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
      engineStepCount: this.engine?.stepCount ?? 0,
      presentationScheduler: threeSimulationPresentationSchedulerSummary(this.presentationScheduler),
      presentationFrameCount: this.latestPresentationFrame?.counters?.presentationFrameCount ?? 0,
      presentationRequestCount: this.latestPresentationFrame?.counters?.presentationRequestCount ?? 0,
      coalescedPresentationRequestCount: this.latestPresentationFrame?.counters?.coalescedPresentationRequestCount ?? 0,
      snapshotPublishCount: this.latestPresentationFrame?.counters?.snapshotPublishCount ?? 0,
      presentationDirtyCategories: [...(this.latestPresentationFrame?.dirtyCategories ?? [])],
      hudRenderCount: this.hudRenderCount,
      rightPanelRenderCount: this.rightPanelRenderCount,
      timelineRenderCount: this.timelineRenderCount,
      hudRenderSkipCount: this.hudRenderSkipCount,
      rightPanelRenderSkipCount: this.rightPanelRenderSkipCount,
      timelineRenderSkipCount: this.timelineRenderSkipCount,
      finishEngineMilliseconds: Number(this.finishEngineMilliseconds ?? 0),
      finishPresentationMilliseconds: Number(this.finishPresentationMilliseconds ?? 0),
      finishChunkCount: Number(this.finishChunkCount ?? 0),
      finishPresentationUpdateCount: Number(this.finishPresentationUpdateCount ?? 0),
      firstStepCompleted: this.firstStepCompleted === true,
      simulationReceivedPlanDigest: this.simulationReceivedPlanDigest ?? null,
      enginePlanDigest: this.enginePlanDigest ?? null,
      planDigestMatch: Boolean(this.launchPayload?.planDigest && this.simulationReceivedPlanDigest && this.enginePlanDigest)
        ? this.launchPayload.planDigest === this.simulationReceivedPlanDigest && this.simulationReceivedPlanDigest === this.enginePlanDigest
        : null,
      canonicalTrajectoryPointCount: (this.engine?.agents ?? []).reduce((sum, agent) => sum + (agent.history?.length ?? 0), 0),
      canonicalObservationCount,
      actualTerrainDiagnostics: this.app.state.result?.actualTerrainDiagnostics ?? this.app.state.result?.terrainAwareValidation?.actual ?? null,
      incrementalTerrainDiagnosticsUpdateCount: terrainDiagnosticCounters.incrementalTerrainDiagnosticsUpdateCount ?? terrainDiagnosticCounters.updateCount ?? 0,
      runtimeTerrainDiagnosticsUpdateCount: terrainDiagnosticCounters.incrementalTerrainDiagnosticsUpdateCount ?? terrainDiagnosticCounters.updateCount ?? 0,
      fullTerrainDiagnosticsRebuildCount: terrainDiagnosticCounters.fullTerrainDiagnosticsRebuildCount ?? 0,
      trajectoryPointsScannedDuringLastDiagnosticsUpdate: terrainDiagnosticCounters.trajectoryPointsScannedDuringLastUpdate ?? 0,
      eventsScannedDuringLastDiagnosticsUpdate: terrainDiagnosticCounters.eventsScannedDuringLastUpdate ?? 0,
      terrainEventSummaryIncrementCount: terrainDiagnosticCounters.terrainEventSummaryIncrementCount ?? 0,
      terrainEventSummaryFullRebuildCount: terrainDiagnosticCounters.terrainEventSummaryFullRebuildCount ?? 0,
      terrainEventSummaryCompact: terrainEventSummary ? { eventCount: terrainEventSummary.eventCount, eventTypeCounts: terrainEventSummary.eventTypeCounts, severityCounts: terrainEventSummary.severityCounts, latestEvent: terrainEventSummary.latestEvent } : null,
      terrainEventsSupported: this.app.state.result?.terrainAwareValidation?.terrainEventsSupported === true,
      minimumActualClearanceMeters: this.app.state.result?.actualTerrainDiagnostics?.minimumActualClearanceMeters ?? null,
      maximumActualDepthMeters: this.app.state.result?.actualTerrainDiagnostics?.maximumActualDepthMeters ?? null,
      terrainEventCount: this.app.state.result?.terrainEvents?.length ?? 0,
      canonicalWaypointStatusCount: (this.engine?.agents ?? []).reduce((sum, agent) => sum + (agent.completedWaypoints?.length ?? 0) + (agent.missedWaypoints?.length ?? 0), 0),
      rightPanelWaypointStatusCount: (this.engine?.agents ?? []).reduce((sum, agent) => sum + (agent.completedWaypoints?.length ?? 0) + (agent.missedWaypoints?.length ?? 0), 0),
      timelineWaypointStatusCount: (this.engine?.agents ?? []).reduce((sum, agent) => sum + (agent.completedWaypoints?.length ?? 0) + (agent.missedWaypoints?.length ?? 0), 0),
      simulationLoopCount: this.engine?.running ? 1 : 0,
      threeRenderLoopCount: this.engine?.running && this.threeSimulationRenderer ? 1 : 0,
      resultBuildCount: this.resultBuildCount,
      debriefTransitionCount: this.debriefTransitionCount,
      duplicateObservationCount: 0,
      duplicateTrajectoryPointCount: 0,
      threeObjectCount: rendererSummary?.threeObjectCount ?? 0,
      threeGeometryCount: rendererSummary?.threeGeometryCount ?? 0,
      threeMaterialCount: rendererSummary?.threeMaterialCount ?? 0,
      threeTextureCount: rendererSummary?.threeTextureCount ?? 0,
      objectGrowthWarnings: rendererSummary?.objectGrowthWarnings ?? [],
      inputSummary: simulationWorldRenderInputSummary(this.simulationRenderInput ?? {}),
      rendererSummary,
      waterColumnDebug,
      performanceDebug,
      threePerformanceDebug: performanceDebug,
      interactionControllerSummary: controllerSummary,
      parityWarnings: currentViewportWarning ? [...parityWarnings, currentViewportWarning] : parityWarnings,
      pointerOwner: this.getSimulationRendererBackend() === 'threeMission3d' ? 'three' : 'phaser',
      lastPointerConsumer: this.lastThreeSimulationIntent ? 'three' : null,
      threeCanvasPointerEvents: canvasPointerEvents,
      phaserWorldInputEnabled: this.getSimulationRendererBackend() !== 'threeMission3d',
      duplicatePointerDispatchCount: 0,
      lastIntentId: this.lastThreeSimulationIntent?.intentId ?? null,
      lastIntentStatus: this.lastThreeSimulationResult?.status ?? null,
      lastIntentChangedCanonicalState: this.lastThreeSimulationResult?.changedCanonicalState === true,
      lastIntentWarning: this.lastThreeSimulationResult?.warnings?.[0] ?? this.lastThreeSimulationResult?.userMessage ?? null,
      ownsPlanning: false,
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
      usesMARL: false,
    };
    globalThis.ANCHOR_MISSION_RENDER_DEBUG = {
      ...globalThis.ANCHOR_SIMULATION_RENDER_DEBUG,
      version: 'three-r1-simulation',
      mode: 'simulation',
      ownsPlanning: false,
      ownsSimulationState: false,
      ownsScoring: false,
      changesOfficialBrowserScoring: false,
      exposesHiddenTruth: false
    };
    if (currentViewportWarning && currentViewportWarning !== this.lastCurrentViewportWarning) {
      this.lastCurrentViewportWarning = currentViewportWarning;
      this.app.toast?.(currentViewportWarning, 'warning');
    }
    this.installSimulationRenderTestApi();
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
    root.querySelector('[data-action="abort-menu"]')?.addEventListener('click', () => this.goMainMenu('simulation-main-menu'));
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
    const htmlModalVisible = Boolean(this.surfaceDecisionModal?.isVisible?.());
    const fallbackVisible = this.isSurfaceFallbackVisible();
    if (this.app.state.surfaceDecision) {
      this.app.state.surfaceDecision.modalVisible = htmlModalVisible || phaserModalVisible;
      this.app.state.surfaceDecision.fallbackVisible = fallbackVisible;
      this.app.state.surfaceDecision.uiMounted = htmlModalVisible || phaserModalVisible || fallbackVisible;
      this.app.state.surfaceDecision.ui = {
        ...(this.app.state.surfaceDecision.ui ?? {}),
        modalVisible: htmlModalVisible || phaserModalVisible,
        fallbackVisible,
        uiMounted: htmlModalVisible || phaserModalVisible || fallbackVisible,
        modalKind: htmlModalVisible ? 'html' : phaserModalVisible ? 'phaser' : null
      };
    }
    return Boolean(htmlModalVisible || phaserModalVisible || isSurfaceDecisionModalVisible(this.app.state, globalThis.document ?? this.app.elements.consoleRoot));
  }

  refreshSurfaceDecision() {
    const decision = this.engine.awaitingSurfaceDecision;
    if (!decision) {
      this.surfaceDecisionModal?.hide?.();
      this.app.state.surfaceDecision = null;
      this.app.state.surfacingDecisionTransaction = null;
      this.surfaceDecisionTransaction = null;
      this.clearSurfaceDecisionFallback();
      this.syncSimulationDecisionWaitState();
      this.publishSurfacingDecisionDebug({ active: false, currentStage: 'idle' });
      return;
    }

    const first = decision.agents?.[0] ?? {};
    const decisionState = createSurfacingDecisionState({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      engine: this.engine,
      decision,
      agentId: first.agentId ?? decision.agentId ?? this.app.state.selectedAgentId,
      activeDecisionIndex: 0,
      pendingDecisionCount: decision.agents?.length ?? 1,
      ui: {
        modalVisible: Boolean(this.surfaceDecisionModal?.isVisible?.() || this.modal?.isVisible?.()),
        fallbackVisible: this.isSurfaceFallbackVisible(),
        modalKind: this.surfaceDecisionModal?.isVisible?.() ? 'html' : this.modal?.isVisible?.() ? 'phaser' : null
      }
    });
    const validation = validateSurfacingDecisionState(decisionState);
    this.app.state.surfaceDecision = decisionState;
    this.setSimulationWaitState('surfaceDecision');
    const previousDecisionKey = this.activeSurfaceDecisionKey;

    const previousTransaction = this.surfaceDecisionTransaction ?? this.app.state.surfacingDecisionTransaction ?? null;
    this.surfaceDecisionTransaction = createSurfacingDecisionTransaction({ decisionState, previous: previousTransaction });
    this.app.state.surfacingDecisionTransaction = this.surfaceDecisionTransaction;
    this.activeSurfaceDecisionKey = decisionState.id;

    debugSurfaceDecision('surface state created', {
      decisionKey: decisionState.id,
      time: decisionState.time,
      agentId: decisionState.agentId,
      validationOk: validation.ok
    });

    if (!this.surfaceDecisionOpenedEvents.has(decisionState.id)) {
      this.surfaceDecisionOpenedEvents.add(decisionState.id);
      this.engine.recordEvent({
        type: 'anchor.simulation.surfacing-decision-opened',
        t: this.engine.t,
        agentId: decisionState.agentId,
        surfacingDecisionId: decisionState.id,
        transactionId: this.surfaceDecisionTransaction.transactionId,
        changesOfficialScoring: false
      });
      traceSimulation(this.trace, {
        scene: 'SimulationScene',
        phase: 'surfacing.decision.opened',
        simTime: decisionState.time,
        agentId: decisionState.agentId,
        message: 'Surface decision opened',
        details: { decisionKey: decisionState.id, transactionId: this.surfaceDecisionTransaction.transactionId }
      });
    }

    let modalShown = Boolean(this.surfaceDecisionModal?.isVisible?.());
    const shouldRenderModal = previousDecisionKey !== decisionState.id || !modalShown;
    if (shouldRenderModal) {
      modalShown = this.surfaceDecisionModal?.show?.({
        decision: decisionState,
        transaction: this.surfaceDecisionTransaction,
        queue: { index: decisionState.activeDecisionIndex, count: decisionState.pendingDecisionCount },
        onAction: (action, details) => this.handleSurfacingDecisionAction(action, details)
      }) === true;
      if (!modalShown) {
        this.app.toast?.('Surface decision required. Use the Simulation Console fallback controls.', 'warning');
      }
    }
    this.ensureSurfaceDecisionFallback();
    this.app.state.surfaceDecision.ui.modalVisible = Boolean(modalShown || this.modal?.isVisible?.());
    this.app.state.surfaceDecision.ui.fallbackVisible = this.isSurfaceFallbackVisible();
    this.app.state.surfaceDecision.ui.uiMounted = this.app.state.surfaceDecision.ui.modalVisible || this.app.state.surfaceDecision.ui.fallbackVisible;
    this.publishSurfacingDecisionDebug({ active: true, currentStage: 'decisionOpened', validation });
  }

  publishSurfacingDecisionDebug(patch = {}) {
    const state = this.app?.state?.surfaceDecision ?? null;
    const transaction = this.surfaceDecisionTransaction ?? this.app?.state?.surfacingDecisionTransaction ?? null;
    const handoff = this.app?.state?.surfacingReplanHandoff ?? null;
    const debug = {
      version: 'surface-r1',
      active: Boolean(state?.active || this.engine?.awaitingSurfaceDecision),
      currentStage: patch.currentStage ?? transaction?.status ?? null,
      decisionSummary: state ? surfacingDecisionStateSummary(state) : null,
      transactionSummary: transaction ? surfacingDecisionTransactionSummary(transaction) : null,
      handoffSummary: handoff ? surfacingReplanHandoffSummary(handoff) : null,
      modalSummary: this.surfaceDecisionModal?.summary?.() ?? null,
      fallbackVisible: this.isSurfaceFallbackVisible(),
      engineAwaitingSurfaceDecision: Boolean(this.engine?.awaitingSurfaceDecision),
      simulationRunning: Boolean(this.engine?.running),
      actionDispatchCount: this.surfacingActionDispatchCount,
      duplicateActionCount: this.surfacingDuplicateActionCount,
      pendingDecisionCount: state?.pendingDecisionCount ?? this.engine?.awaitingSurfaceDecision?.agents?.length ?? 0,
      createsNewPlanner: false,
      changesOfficialScoring: false,
      rendererOwnsSimulationState: false,
      ...patch
    };
    this.lastSurfaceDecisionDebug = debug;
    globalThis.ANCHOR_SURFACING_DECISION_DEBUG = debug;
    return debug;
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
      { label: 'Main Menu', onClick: () => this.goMainMenu('simulation-main-menu') }
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
    root.querySelector('[data-action="failure-menu"]')?.addEventListener('click', () => this.goMainMenu('simulation-main-menu'));
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
    this.recordDebriefRequested('debrief');
    this.scene.start('DebriefScene');
  }

  handleSurfacingDecisionAction(action, details = {}) {
    const normalizedAction = normalizeSurfacingDecisionAction(action);
    this.surfacingActionDispatchCount += 1;
    if (!normalizedAction) {
      this.surfacingDuplicateActionCount += 1;
      this.publishSurfacingDecisionDebug({ currentStage: 'unknownAction', action, details });
      this.app.toast?.(`Unknown surface decision action: ${action}`, 'warning');
      return;
    }
    if (!this.engine?.awaitingSurfaceDecision) {
      this.surfacingDuplicateActionCount += 1;
      this.publishSurfacingDecisionDebug({ currentStage: 'staleActionIgnored', action: normalizedAction, details });
      return;
    }
    if (normalizedAction === SURFACING_DECISION_ACTION.EXPORT_OBSERVATIONS) {
      this.engine.recordEvent({ type: 'anchor.simulation.surfacing-observations-export-requested', t: this.engine.t, agentId: this.app.state.surfaceDecision?.agentId ?? null });
      this.publishSurfacingDecisionDebug({ currentStage: 'exportObservationsRequested', action: normalizedAction, details });
      this.exportObservationData('surfaceDecision');
      return;
    }
    if (normalizedAction === SURFACING_DECISION_ACTION.IMPORT_WAYPOINTS) {
      this.engine.recordEvent({ type: 'anchor.simulation.surfacing-waypoint-import-requested', t: this.engine.t, agentId: this.app.state.surfaceDecision?.agentId ?? null });
      this.publishSurfacingDecisionDebug({ currentStage: 'importWaypointsRequested', action: normalizedAction, details });
      this.importWaypointData('surfaceDecision');
      return;
    }
    if (normalizedAction === SURFACING_DECISION_ACTION.CONTINUE_ORIGINAL_PLAN) {
      this.continueFromSurfaceDecision();
      return;
    }
    if (normalizedAction === SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS) {
      this.updateWaypointsFromSurface();
      return;
    }
    if (normalizedAction === SURFACING_DECISION_ACTION.FINISH_MISSION) {
      this.finishFromSurface();
    }
  }

  continueFromSurfaceDecision() {
    if (!this.engine.awaitingSurfaceDecision) return;
    traceSimulation(this.trace, { scene: 'SimulationScene', phase: 'surfacing.continue', simTime: this.engine.t, message: 'Continue surface decision clicked' });
    const decisionState = this.app.state.surfaceDecision ?? createSurfacingDecisionState({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      engine: this.engine,
      decision: this.engine.awaitingSurfaceDecision
    });
    const transaction = this.surfaceDecisionTransaction ?? this.app.state.surfacingDecisionTransaction ?? createSurfacingDecisionTransaction({ decisionState });
    this.surfaceDecisionTransaction = commitSurfacingDecisionAction(
      transaction,
      SURFACING_DECISION_ACTION.CONTINUE_ORIGINAL_PLAN,
      { time: this.engine.t, source: 'surfaceDecision' }
    );
    this.app.state.lastSurfacingDecisionTransaction = this.surfaceDecisionTransaction;
    this.engine.recordEvent({
      type: 'anchor.simulation.surfacing-continue-selected',
      t: this.engine.t,
      agentId: this.app.state.surfaceDecision?.agentId ?? null,
      surfacingDecisionId: this.app.state.surfaceDecision?.id ?? null,
      transactionId: this.surfaceDecisionTransaction?.transactionId ?? null,
      changesOfficialScoring: false
    });
    this.engine.continueFromSurface();
    this.surfaceDecisionModal?.hide?.();
    this.app.state.surfaceDecision = null;
    this.app.state.surfacingDecisionTransaction = null;
    this.clearSurfaceDecisionFallback();
    this.clearSimulationWaitState();
    this.watchdog?.reset();
    this.syncResult();
    this.refresh();
    this.publishSurfacingDecisionDebug({ active: false, currentStage: 'continueCommitted' });
  }

  updateWaypointsFromSurface() {
    const decision = this.engine.awaitingSurfaceDecision;
    if (!decision) return;
    traceSimulation(this.trace, { scene: 'SimulationScene', phase: 'surfacing.update', simTime: this.engine.t, message: 'Update waypoints from surface clicked' });
    const selectedAgentId = decision?.agentId ?? decision?.agents?.[0]?.agentId ?? this.app.state.selectedAgentId;
    const decisionState = this.app.state.surfaceDecision ?? createSurfacingDecisionState({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      engine: this.engine,
      decision,
      agentId: selectedAgentId
    });
    this.surfaceDecisionTransaction = startSurfacingReplan(
      this.surfaceDecisionTransaction ?? this.app.state.surfacingDecisionTransaction ?? createSurfacingDecisionTransaction({ decisionState }),
      { time: this.engine.t, source: 'surfaceDecision' }
    );
    const resumeState = this.engine.createResumeState();
    const handoff = createSurfacingReplanHandoff({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      engine: this.engine,
      decisionState,
      decision,
      transaction: this.surfaceDecisionTransaction,
      resumeState,
      surfacedAgentId: selectedAgentId
    });
    const handoffValidation = validateSurfacingReplanHandoff(handoff);
    if (!handoffValidation.ok) {
      this.app.toast?.(`Surface replan handoff warning: ${handoffValidation.errors[0]}`, 'warning');
    }
    const engineAgent = this.engine.agents.find((agent) => agent.id === selectedAgentId) ?? this.engine.agents[0] ?? null;
    const actual = decisionState.actualPosition ?? decisionState.actual ?? (engineAgent ? { x: engineAgent.x, y: engineAgent.y } : null);
    this.engine.recordEvent({
      type: 'anchor.simulation.surfacing-replan-started',
      t: this.engine.t,
      agentId: selectedAgentId,
      surfacingDecisionId: decisionState.id,
      transactionId: this.surfaceDecisionTransaction.transactionId,
      actualPosition: actual,
      changesOfficialScoring: false
    });
    this.syncResult();
    this.app.state.simulationResume = resumeState;
    this.app.state.surfacingReplanHandoff = handoff;
    this.app.state.surfacingDecisionTransaction = this.surfaceDecisionTransaction;
    this.app.state.surfaceDecision = {
      ...decisionState,
      status: SURFACING_DECISION_STATUS.REPLAN_SELECTED,
      mode: 'editingFutureWaypoints',
      ui: { ...(decisionState.ui ?? {}), modalVisible: false, fallbackVisible: false, uiMounted: false }
    };
    this.app.state.surfacedAgents = this.engine.agents.map((agent) => ({
      id: agent.id,
      agentId: agent.id,
      x: agent.x,
      y: agent.y,
      t: this.engine.t,
      heading: agent.heading,
      depthMeters: agent.depthMeters ?? 0,
      commsState: agent.commsState,
      status: agent.status
    }));
    this.app.state.ui ??= {};
    this.app.state.ui.planningAnchor = actual ? {
      agentId: selectedAgentId,
      x: actual.x,
      y: actual.y,
      t: this.engine.t,
      source: 'surfaced',
      surfacingDecisionId: decisionState.id
    } : null;
    const agentPlan = getAgentPlan(this.app.state.plan, selectedAgentId);
    const nextIndex = Math.max(0, Math.min((agentPlan?.waypoints?.length ?? 1) - 1, Number(engineAgent?.currentWaypointIndex ?? 0)));
    if (agentPlan?.waypoints?.[nextIndex]) {
      this.app.state.ui.selectedWaypoint = { agentId: selectedAgentId, index: nextIndex };
      this.app.state.ui.hoverCell = { x: agentPlan.waypoints[nextIndex].x, y: agentPlan.waypoints[nextIndex].y };
    }
    this.surfaceDecisionModal?.hide?.();
    this.clearSurfaceDecisionFallback();
    this.clearSimulationWaitState();
    this.engine.pause();
    this.app.state.mode = 'planning';
    this.app.state.planningTime = this.engine.t;
    this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.engine.t);
    this.app.state.selectedAgentId = selectedAgentId;
    this.publishSurfacingDecisionDebug({ currentStage: 'replanHandoffCreated', handoffValidation });
    this.scene.start('MissionWorkspaceScene');
  }

  finishFromSurface() {
    traceSimulation(this.trace, { scene: 'SimulationScene', phase: 'surfacing.finish', simTime: this.engine?.t ?? 0, message: 'Finish from surface clicked' });
    if (this.engine.awaitingSurfaceDecision) {
      const decisionState = this.app.state.surfaceDecision ?? createSurfacingDecisionState({
        level: this.app.state.level,
        mission: this.app.state.mission,
        plan: this.app.state.plan,
        engine: this.engine,
        decision: this.engine.awaitingSurfaceDecision
      });
      const transaction = this.surfaceDecisionTransaction ?? this.app.state.surfacingDecisionTransaction ?? createSurfacingDecisionTransaction({ decisionState });
      this.surfaceDecisionTransaction = commitSurfacingDecisionAction(
        transaction,
        SURFACING_DECISION_ACTION.FINISH_MISSION,
        { time: this.engine.t, source: 'surfaceDecision' }
      );
      this.app.state.lastSurfacingDecisionTransaction = this.surfaceDecisionTransaction;
      this.engine.recordEvent({
        type: 'anchor.simulation.surfacing-finish-selected',
        t: this.engine.t,
        agentId: this.app.state.surfaceDecision?.agentId ?? null,
        surfacingDecisionId: this.app.state.surfaceDecision?.id ?? null,
        transactionId: this.surfaceDecisionTransaction?.transactionId ?? null,
        changesOfficialScoring: false
      });
      this.engine.finishFromSurfaceDecision();
    } else {
      this.finishSimulation();
      return;
    }
    this.surfaceDecisionModal?.hide?.();
    this.syncResult();
    if (this.engine.complete) recordStochasticRun(this.app.state, this.app.state.result);
    clearPlanningOverlayState(this.app.state);
    this.graphics?.clear();
    this.app.state.surfaceDecision = null;
    this.app.state.surfacingDecisionTransaction = null;
    this.clearSurfaceDecisionFallback();
    this.clearSimulationWaitState();
    this.publishSurfacingDecisionDebug({ active: false, currentStage: 'finishCommitted' });
    this.app.state.mode = 'debrief';
    this.recordDebriefRequested('debrief');
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
    this.input?.keyboard?.on('keydown-C', this.onContinueSurfaceKey);
    this.input?.keyboard?.on('keydown-U', this.onUpdateSurfaceKey);
    this.input?.keyboard?.on('keydown-F', this.onFinishSurfaceKey);
  }

  unbindSurfaceDecisionFallbacks() {
    this.input?.keyboard?.off('keydown-C', this.onContinueSurfaceKey);
    this.input?.keyboard?.off('keydown-U', this.onUpdateSurfaceKey);
    this.input?.keyboard?.off('keydown-F', this.onFinishSurfaceKey);
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

function currentVectorViewportWarning(debug = {}) {
  if (debug.currentSafeModeExplicit === true) return 'Current-vector display is disabled by Safe Display mode. Mission physics still use the canonical current field.';
  if (debug.currentPresentationRequested !== true) return null;
  if (debug.currentPresentationEnabled === true) return null;
  if (Number(debug.sourceVectorSampleCount ?? 0) <= 0) return null;
  return 'Current physics are active, but no current vectors are visible. Reason: ' + (debug.noVisibleVectorsReason ?? 'unknown') + '.';
}

function normalizeCurrentDisplayModeAlias(value) {
  if (value === 'allLayers' || value === 'stackedCurrentSlabs') return 'allLayers';
  if (value === 'explodedCurrentSlabs' || value === 'explodedDepthField') return 'explodedDepthField';
  if (value === 'stackedDepthField') return 'stackedDepthField';
  if (value === 'sparseVolumetricField') return 'sparseVolumetricField';
  if (value === 'hidden') return 'hidden';
  return 'activeSlice';
}

function normalizeCurrentVectorDensity(value) {
  if (value === 'sparse' || Number(value) >= 2) return 'sparse';
  if (value === 'dense') return 'dense';
  return 'balanced';
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  const resolved = Number.isFinite(numeric) ? numeric : fallback;
  return Math.max(min, Math.min(max, resolved));
}
function normalizeThreeQualityProfile(value) {
  const id = String(value ?? '').trim().toLowerCase();
  if (id === 'performance' || id === 'perf') return 'performance';
  if (id === 'high' || id === 'quality') return 'high';
  return 'balanced';
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

function summarizeSimulationIntent(intent = {}) {
  return {
    intentId: intent.intentId ?? null,
    interactionMode: intent.interactionMode ?? null,
    agentId: intent.agentId ?? null,
    observationId: intent.observationId ?? null,
    surfacingEventId: intent.surfacingEventId ?? null,
    routeSegmentId: intent.routeSegmentId ?? null,
    routeFailureId: intent.routeFailureId ?? null,
    objectType: intent.metadata?.objectType ?? null,
    objectId: intent.metadata?.objectId ?? null,
    gridCell: intent.gridCell ? { x: intent.gridCell.x, y: intent.gridCell.y } : null,
    sequence: intent.sequence ?? null
  };
}

function summarizeSimulationResult(result = {}) {
  return {
    status: result.status ?? null,
    accepted: result.accepted === true,
    changedCanonicalState: result.changedCanonicalState === true,
    selectedAgentId: result.selectedAgentId ?? null,
    selectedObservationId: result.selectedObservationId ?? null,
    selectedSurfacingEventId: result.selectedSurfacingEventId ?? null,
    selectedRouteSegmentId: result.selectedRouteSegmentId ?? null,
    selectedRouteFailureId: result.selectedRouteFailureId ?? null,
    userMessage: result.userMessage ?? ''
  };
}

function publicSimulationRecordSummary(objectType, record = {}) {
  if (!record || typeof record !== 'object') return null;
  const points = Array.isArray(record.points) ? record.points : null;
  return {
    objectType,
    id: record.id ?? null,
    agentId: record.agentId ?? null,
    type: record.type ?? record.status ?? objectType,
    status: record.status ?? null,
    x: finiteMetric(record.x ?? points?.[0]?.x),
    y: finiteMetric(record.y ?? points?.[0]?.y),
    depthMeters: finiteMetric(record.depthMeters ?? points?.[0]?.depthMeters),
    timeSeconds: finiteMetric(record.timeSeconds ?? record.t ?? points?.[0]?.timeSeconds),
    pointCount: points?.length ?? null,
    value: record.value ?? null,
    sourceVisibility: record.sourceVisibility ?? 'publicResult'
  };
}

function finiteMetric(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
function buildTerrainAwareSimulationResultSummary(launchPayload = null, engineResult = null) {
  const launchReport = launchPayload?.terrainAwareValidationReport ?? null;
  const launchSummary = launchPayload?.terrainAwareValidationSummary ?? summarizeTerrainAwareValidation(launchReport);
  const actual = engineResult?.actualTerrainDiagnostics ?? engineResult?.summary?.terrainDiagnostics ?? null;
  const terrainEvents = engineResult?.terrainEvents ?? (engineResult?.events ?? []).filter((event) => String(event.type ?? '').startsWith('anchor.simulation.terrain-'));
  const predictedMinimumClearanceMeters = minimumPredictedClearance(launchReport);
  const predictedMaximumDepthMeters = maximumPredictedDepth(launchReport);
  const actualMinimumClearanceMeters = finiteOrNull(actual?.minimumActualClearanceMeters);
  const actualMaximumDepthMeters = finiteOrNull(actual?.maximumActualDepthMeters);
  return {
    type: 'anchor.validation.terrain-aware-simulation-summary',
    version: launchSummary?.version ?? launchReport?.version ?? actual?.version ?? null,
    launch: {
      version: launchReport?.version ?? launchSummary?.version ?? null,
      digest: launchReport?.planDigest ?? launchPayload?.planDigest ?? null,
      terrainSourceDigest: launchReport?.terrainSourceDigest ?? null,
      status: launchSummary?.status ?? launchReport?.status ?? null,
      executable: launchSummary?.executable ?? launchReport?.executable ?? null,
      issueSummary: launchSummary,
      predictedMinimumClearanceMeters,
      predictedMaximumDepthMeters,
      predictedTargetCoverage: predictedTargetCoverage(launchReport),
      predictedTerrainRisks: launchSummary?.issueCodes ?? []
    },
    actual: {
      version: actual?.version ?? null,
      minimumActualClearanceMeters: actualMinimumClearanceMeters,
      maximumActualDepthMeters: actualMaximumDepthMeters,
      eventSummary: actual?.terrainEventSummary ?? { eventCount: terrainEvents.length, eventTypes: {} },
      actualTargetCoverage: actual?.actualTargetCoverage ?? null,
      terrainRelatedTerminalReason: actual?.terrainRelatedTerminalReason ?? null,
      terrainEventsSupported: actual?.terrainEventsSupported === true
    },
    comparison: {
      predictedMinimumClearanceMeters,
      actualMinimumClearanceMeters,
      clearanceDifferenceMeters: predictedMinimumClearanceMeters != null && actualMinimumClearanceMeters != null
        ? Number((actualMinimumClearanceMeters - predictedMinimumClearanceMeters).toFixed(6))
        : null,
      predictedMaximumDepthMeters,
      actualMaximumDepthMeters,
      predictedTargetCoverage: predictedTargetCoverage(launchReport),
      actualTargetCoverage: actual?.actualTargetCoverage ?? null,
      predictedSurfacingOffset: predictedSurfacingOffset(launchReport),
      actualSurfacingOffset: null
    },
    launchSummary,
    launchReport,
    actualSummary: actual,
    terrainEvents: terrainEvents.map((event) => ({ ...event })),
    terrainEventsSupported: actual?.terrainEventsSupported === true,
    plannedAndActualDistinct: true,
    officialScoringChanged: false,
    rendererOwnsValidation: false,
    usesMeshRaycastForValidity: false,
    containsHiddenTruth: false
  };
}

function minimumPredictedClearance(report = null) {
  const values = (report?.segmentReports ?? [])
    .map((segment) => Number(segment.diveClearance?.minimumClearanceMeters ?? segment.minimumPredictedClearanceMeters ?? segment.predictedMinimumClearanceMeters))
    .filter(Number.isFinite);
  return values.length ? Number(Math.min(...values).toFixed(6)) : null;
}

function maximumPredictedDepth(report = null) {
  const values = (report?.segmentReports ?? [])
    .flatMap((segment) => [segment.diveClearance?.requestedMaximumDepthMeters, segment.diveClearance?.achievableMaximumDepthMeters, segment.requestedMaximumDepthMeters, segment.achievableMaximumDepthMeters])
    .map(Number)
    .filter(Number.isFinite);
  return values.length ? Number(Math.max(...values).toFixed(6)) : null;
}

function predictedTargetCoverage(report = null) {
  const targetReports = report?.targetReports ?? [];
  const byStatus = {};
  for (const target of targetReports) byStatus[target.status ?? 'UNKNOWN'] = (byStatus[target.status ?? 'UNKNOWN'] ?? 0) + 1;
  return { targetCount: targetReports.length, byStatus };
}

function predictedSurfacingOffset(report = null) {
  const offsets = (report?.segmentReports ?? []).map((segment) => segment.diveClearance?.predictedSurfacingOffset ?? segment.predictedSurfacingOffset).filter(Boolean);
  return offsets[0] ?? null;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(6)) : null;
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
