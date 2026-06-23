import * as THREE from 'three';
import { downloadJSON, loadJSON, readJSONFile } from '../../../core/io/ImportExport.js';
import { buildSolverPacket } from '../../../core/io/SolverPacketExporter.js';
import { buildChallengeExport } from '../../../core/io/ChallengeExporter.js';
import { buildOracleDatasetExport } from '../../../core/io/OracleDatasetExporter.js';
import { buildResultExport } from '../../../core/io/ResultExporter.js';
import { buildLeaderboardExport } from '../../../core/io/LeaderboardExporter.js';
import { importLeaderboard, loadLeaderboard } from '../../../core/storage/LeaderboardStore.js';
import { getBestAttemptForChallenge } from '../../../core/storage/BestAttemptSelector.js';
import { buildBestPriorRunViewModel, bestPriorRunLogPayload, debugBestPath } from '../../../core/storage/BestPriorRunViewModel.js';
import { importPlanJson } from '../../../core/io/PlanImporter.js';
import { importResultJson } from '../../../core/io/ResultImporter.js';
import { saveChallengeToLocalStore } from '../../../core/storage/LocalChallengeStore.js';
import { buildTemporalGreedyRequest, runTemporalGreedyAsync } from '../../../core/planning/PlannerWorkerClient.js';
import { ensureForecastFields } from '../../../core/sim/ChallengeMode.js';
import { getLevelObjectiveSummary, getPlanningPrompts } from '../../../core/campaign/LevelObjectives.js';
import {
  addWaypoint,
  addScienceTarget,
  updateScienceTarget,
  getScienceTargetById,
  addMarker,
  absorbPlanningMarkersForWaypoint,
  clearAgentWaypoints,
  clearAgentMarkers,
  convertMarkerToWaypoint,
  createEmptyPlan,
  getMarkerAtCell,
  getAgentStartAtCell,
  getUnknownAgentIds,
  getWaypointAtCell,
  isValidWaypointCell,
  moveWaypointDown,
  moveWaypointUp,
  normalizePlan,
  removeMarker,
  removeWaypoint,
  updateWaypoint,
  getAgentPlan
} from '../../../core/planning/WaypointPlan.js';
import {
  clampMissionTime,
  getPlanningWindowCount,
  getTimelineFrameTime,
  getWindowForTime,
  getWindowStartTime
} from '../../../core/time/MissionTime.js';
import {
  applyPlanningAnchor,
  recomputeAgentWaypointTiming,
  recomputeAllWaypointTiming
} from '../../../core/planning/TemporalWaypointPlanner.js';
import { buildPlanningGuidance } from '../../../core/planning/PlanningGuidance.js';
import { recomputePlanningMarkerReachability } from '../../../core/planning/PlanningMarkers.js';
import { clearPlanningOverlayState, shouldRenderPlanningGuidance } from '../../../core/planning/PlanningOverlayState.js';
import { validatePlanForExecution } from '../../../core/planning/PlanExecutionValidator.js';
import { validateRoutePlanForExecution } from '../../../core/planning/RouteValidityAudit.js';
import {
  buildTerrainAwareMissionValidationReport,
  terrainAwareMissionValidationSummary,
  validateTerrainAwareSurfaceWaypoint
} from '../../../core/planning/TerrainAwareMissionValidation.js';
import {
  createMissionExecutionTransaction,
  advanceMissionExecutionTransaction,
  failMissionExecutionTransaction,
  missionExecutionTransactionSummary
} from '../../../core/simulation/MissionExecutionTransaction.js';
import { failSimulationLaunchProfiler } from '../../../core/runtime/SimulationLaunchProfiler.js';
import {
  SURFACING_DECISION_ACTION,
  SURFACING_DECISION_STATUS
} from '../../../core/simulation/SurfacingDecisionState.js';
import {
  cancelSurfacingReplan as cancelSurfacingReplanTransaction,
  commitSurfacingReplan,
  surfacingDecisionTransactionSummary
} from '../../../core/simulation/SurfacingDecisionTransaction.js';
import {
  commitSurfacingReplanResumeState,
  normalizeSurfacingReplanHandoff,
  surfacingReplanHandoffSummary,
  validateSurfacingReplanHandoff
} from '../../../core/planning/SurfacingReplanHandoff.js';
import {
  createMissionExecutionSnapshot,
  createMissionLaunchPayload,
  summarizeMissionLaunchPayload,
  summarizeValidation
} from '../../../core/simulation/MissionExecutionSnapshot.js';
import { createSimulationTrace, traceSimulation } from '../../../core/debug/SimulationTrace.js';
import { canPlaceWaypoint, getPlacementDisabledReason } from '../../../core/planning/WaypointPlacementGuard.js';
import {
  attachIdentityToPlan,
  createGameInstanceId,
  ensureLevelIdentity,
  planMatchesLevel,
  shortInstanceId
} from '../../../core/identity/GameInstanceId.js';
import { buildGuidanceLabel, cellToWorld, clampZoom, drawMissionMap, getMapLayout, pointerToCanvasPoint, pointerToCell } from '../PhaserCoreAdapter.js';
import { saveLevelToRegistry } from '../../../core/storage/LevelRegistry.js';
import { getViewportMapBounds } from '../ViewportMapBounds.js';
import { getActiveRenderTime } from '../../../core/time/ActiveRenderTime.js';
import { getActivePriorityTargets } from '../../../core/sim/PriorityTargets.js';
import { inspectCellAtTime } from '../../../core/exploration/CellInspection.js';
import { cellToCenterPosition, isCellNavigable } from '../../../core/planning/Navigability.js';
import { getNextRoiMode, getRoiModeLabel, normalizeRoiMode } from '../../../core/roi/RoiMode.js';
import { nextAllowedRoiMode } from '../../../core/tutorial/TutorialFeatureGates.js';
import {
  applyStochasticToMission,
  normalizeStochasticState,
  prepareStochasticRerun,
  randomizeStochasticSeed,
  setStochasticForecastMember,
  setStochasticRoiMode,
  setStochasticSeed
} from '../../../core/evaluation/StochasticRunStore.js';
import { Modal } from '../ui/Modal.js';
import { FileBridge } from '../ui/FileBridge.js';
import { FocusManager } from '../ui/FocusManager.js';
import { PhaserButton } from '../ui/Button.js';
import { HtmlMissionWorkspaceOverlay } from '../../../ui/HtmlMissionWorkspaceOverlay.js';
import { missionWorldRenderInputFromWorkspace, missionWorldRenderInputSummary } from '../../../core/rendering/MissionWorldStateAdapter.js';
import {
  buildMissionWorldRenderViewModel,
  missionWorldRenderViewModelSummary,
  validateMissionWorldRenderViewModel
} from '../../../core/rendering/MissionWorldRenderViewModel.js';
import {
  createThreeMissionWorldRenderer,
  updateThreeMissionWorldRenderer,
  resizeThreeMissionWorldRenderer,
  setThreeMissionWorldCamera,
  setThreeMissionLayerVisibility,
  threeMissionWorldRendererSummary,
  resetThreeMissionWorldRendererPerformance,
  disposeThreeMissionWorldRenderer
} from '../../three/ThreeMissionWorldRenderer.js';
import { createThreePerformanceDebugPayload, inactiveThreePerformanceDebugPayload } from '../../three/ThreeMissionPerformanceMonitor.js';
import {
  focusThreeMissionCamera,
  resetThreeMissionCamera,
  setThreeMissionCameraPreset,
  threeMissionCameraControllerSummary
} from '../../three/ThreeMissionCameraController.js';
import {
  createThreeMissionInteractionController,
  setThreeMissionInteractionMode,
  setThreeMissionInteractionEnabled,
  updateThreeMissionInteractionContext,
  cancelThreeMissionInteraction,
  threeMissionInteractionControllerSummary,
  disposeThreeMissionInteractionController
} from '../../three/ThreeMissionInteractionController.js';
import {
  createMissionWorkspaceThreeInteractionBridge,
  handleMissionWorldInteractionIntent,
  missionWorkspaceThreeInteractionBridgeSummary,
  disposeMissionWorkspaceThreeInteractionBridge
} from '../interaction/MissionWorkspaceThreeInteractionBridge.js';
import {
  buildMissionPlanningInteractionViewModel,
  missionPlanningInteractionViewModelSummary
} from '../../../core/rendering/MissionPlanningInteractionViewModel.js';
import { buildPlanningGuidePreviewViewModel } from '../../../core/rendering/PlanningGuidePreviewViewModel.js';
import { createMissionWorldInteractionResult } from '../../../core/rendering/MissionWorldInteractionResult.js';
import { normalizeMissionWorldInteractionMode } from '../../../core/rendering/MissionWorldInteractionIntent.js';
import {
  cancelMissionPlanningTool,
  createMissionPlanningToolState,
  cursorForTool,
  interactionModeForTool,
  labelForTool,
  missionPlanningToolStateSummary,
  setMissionPlanningTool,
  toolIdForInteractionMode,
  validateMissionPlanningToolState
} from '../../../core/rendering/MissionPlanningToolState.js';
import { gridCellToWorld } from '../../../core/rendering/MissionWorldCoordinates.js';
import { depthLayerCellCenterToWorld } from '../../../core/rendering/VolumetricMissionCoordinates.js';
import { augmentMissionWorldWithVolumetricModel, waterColumnRenderDebugPayload, volumetricCurrentDebugPayload } from '../../../core/rendering/VolumetricMissionWorldViewModel.js';
import {
  continuousMissionUiStateSummary,
  normalizeContinuousMissionUiState,
  normalizeVolumeRenderMode,
  validateContinuousMissionUiState
} from '../../../core/rendering/ContinuousMissionUiState.js';
import { normalizeWaterColumnLayerId, normalizeWaterColumnProfileId, waterColumnLayerMetadata } from '../../../core/science/WaterColumnSchema.js';
import { sampleBathymetryAt } from '../../../core/science/BathymetryFieldModel.js';
import { compareMissionLayerCoordinates, missionLayerAlignmentSummary } from '../../../core/rendering/MissionLayerAlignment.js';
import { createThreeMissionSceneLifecycle, registerThreeMissionSceneResource, disposeThreeMissionSceneLifecycle, threeMissionSceneLifecycleSummary } from '../../three/ThreeMissionSceneLifecycle.js';
import { publishSceneIsolationDebug } from '../../../ui/MissionShellReset.js';
import {
  getDeploymentZonesForAgent,
  getSelectedStart,
  normalizeDeploymentState,
  requiresDeploymentSelection,
  setSelectedStart
} from '../../../core/deployment/DeploymentZones.js';
import { attachBenchmarkMetadataToPlan } from '../../../core/benchmark/BenchmarkMetadata.js';
import {
  derivePlannerBenchmarkAttemptContext,
  extractPlannerBenchmarkContextFromState
} from '../../../core/benchmark/BenchmarkEpisodeRuntime.js';
import { deriveAdaptiveBenchmarkContextFromState } from '../../../core/benchmark/AdaptiveBenchmarkRuntime.js';
import { attemptSourceFromRouteSourceLabel } from '../../../core/benchmark/BenchmarkAttemptSourceMapping.js';
import { legacyPhaserMissionRendererEnabled, preferredMissionRendererBackend, publishMigrationDebug } from '../../../core/runtime/MigrationRuntimeConfig.js';


const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class MissionWorkspaceScene extends PhaserScene {
  constructor() {
    super('MissionWorkspaceScene');
    this.pointerInteraction = null;
    this.suppressNextPointerUp = false;
    this.markerObjects = [];
    this.gliderObjects = [];
    this.labelObjects = [];
    this.cameraObjects = [];
    this.threeMissionContainer = null;
    this.threeMissionRenderer = null;
    this.threeRendererLifecycle = { state: 'idle', mountCompleted: false, firstRefreshCompleted: false, refreshDeferredReason: null, runtimeErrorCount: 0, resizeSequence: 0, lastError: null };
    this.threeInteractionController = null;
    this.threeInteractionBridge = null;
    this.missionRenderViewModel = null;
    this.missionRenderInput = null;
    this.activePlanningToolId = 'selectInspect';
    this.autoArmedWaypointAfterDeployment = false;
    this.planningToolControlBindCount = 1;
    this.planningToolControlDispatchCount = 0;
    this.duplicateToolControlDispatchCount = 0;
    this.lastPlanningToolDispatch = null;
    this.executeControlBindCount = 1;
    this.executeControlClickCount = 0;
    this.duplicateExecuteDispatchCount = 0;
    this.executeLaunchInProgress = false;
    this.lastExecuteControlDispatch = null;
    this.executionTransaction = null;
    this.sceneCleanupDisposed = false;
    this.threeSceneLifecycle = null;
    this.sceneLifecycleDisposalCount = 0;
    this.cleanupInvocationCount = 0;
    this.duplicateCleanupInvocationCount = 0;
    this.cleanupErrorCount = 0;
    this.lifecycleWasNullAtCleanup = false;
    this.lifecycleResourceCountBefore = 0;
    this.lifecycleResourceCountAfter = 0;
    this.cleanupReason = null;
    this.shutdownHandlerBindCount = 0;
    this.destroyHandlerBindCount = 0;
    this.duplicateLifecycleHandlerCount = 0;
    this.continuousUiStateCreated = false;
    this.continuousUiStateValidated = false;
    this.planningSceneCreateCompleted = false;
    this.threePerformanceDiagnostics = createMissionWorkspacePerformanceCounters();
    this.terrainValidationCache = createTerrainValidationCacheState();
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.executeLaunchInProgress = false;
    this.lastExecuteControlDispatch = null;
    this.sceneCleanupDisposed = false;
    this.sceneLifecycleEventsBound = false;
    this.bindThreeSceneLifecycleEvents();
    this.threeSceneLifecycle = createThreeMissionSceneLifecycle({ sceneKey: 'MissionWorkspaceScene' });
    this.app.setSceneLabel('Mission Workspace');
    this.app.state.mode = 'planning';
    this.app.elements.shell?.classList.add('planning-workspace');
    this.app.state.ui ??= {};
    this.app.state.ui.legacyPhaserMissionRendererEnabled = legacyPhaserMissionRendererEnabled();
    this.app.state.ui.rendererBackend = preferredMissionRendererBackend({ requested: this.app.state.ui.rendererBackend });
    this.app.state.ui.threeMissionCameraPreset ??= 'obliqueMission';
    this.app.state.ui.threeMissionLayers ??= {};
    this.app.state.ui.threeMissionInteractionMode ??= 'selectInspect';
    this.app.state.ui.threeMissionInteraction ??= { interactionMode: this.app.state.ui.threeMissionInteractionMode };
    this.syncMissionOptionsFromMission();
    if (!String(this.app.state.currentScenario?.source ?? '').startsWith('leaderboard')) {
      this.app.state.ui.showBestPathOverlay = false;
    }
    ensureLevelIdentity(this.app.state.level);
    if (this.app.state.challengeMode === 'forecast') ensureForecastFields(this.app.state.level);
    normalizeDeploymentState(this.app.state.level, this.app.state.mission, this.app.state.plan);
    if (!this.app.state.plan) {
      this.app.state.plan = createEmptyPlan(this.app.state.level, this.app.state.mission);
      this.app.state.currentPlanSource = 'manual';
      this.app.state.manualPlan = this.app.state.plan;
    } else {
      this.app.state.plan = normalizePlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
    }
    normalizeDeploymentState(this.app.state.level, this.app.state.mission, this.app.state.plan);
    this.app.state.selectedAgentId ??= this.app.state.mission.agents?.[0]?.id ?? null;
    this.ensureMissionPlanningToolState();
    this.app.state.planningTime = clampMissionTime(this.app.state.level, this.app.state.planningTime ?? 0);
    this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.app.state.planningTime);
    normalizeStochasticState(this.app.state);
    recomputeAllWaypointTiming(this.app.state);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
    this.mapGraphics = this.add.graphics();
    this.mapGraphics.setDepth(0);
    this.app.clearPanels();
    this.applyInitialWaterColumnSceneDefaults('planning');
    this.ensureContinuousMissionUiState();
    this.modal = new Modal(this);
    this.fileBridge = new FileBridge({ onFile: (file) => this.importPlanFile(file) });
    this.renderHud();
    this.renderCameraControls();
    this.setupMapCameraControls();
    this.refreshPanels();
    this.refreshMap();
    this.consumePendingAutoExecute();
    this.planningSceneCreateCompleted = true;
    this.publishContinuousMissionDebug();
    this.refreshMigrationDebug();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.onViewportResize = () => {
      globalThis.requestAnimationFrame?.(() => this.refreshMap());
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
    this.focusManager = new FocusManager(this);
    this.focusManager.setActions([
      () => this.handleExecuteControlAction('focusManager'),
      () => this.showHelpModal(),
      () => {
        if (!this.hud) return;
        this.hud.collapsedRight = !this.hud.collapsedRight;
        this.refreshPanels();
      }
    ]);
  }

  consumePendingAutoExecute() {
    if (!this.app.state.pendingWorkspaceAutoExecute) return;
    this.app.state.pendingWorkspaceAutoExecute = null;
    const run = () => this.executePlan();
    if (this.time?.delayedCall) {
      this.time.delayedCall(0, run);
    } else {
      globalThis.setTimeout?.(run, 0);
    }
  }

  bindThreeSceneLifecycleEvents() {
    if (this.sceneLifecycleEventsBound) {
      this.duplicateLifecycleHandlerCount = Number(this.duplicateLifecycleHandlerCount ?? 0) + 1;
      return;
    }
    this.sceneLifecycleEventsBound = true;
    this.shutdownHandlerBindCount = Number(this.shutdownHandlerBindCount ?? 0) + 1;
    this.destroyHandlerBindCount = Number(this.destroyHandlerBindCount ?? 0) + 1;
    this.events?.once?.('shutdown', () => this.cleanupMissionWorkspaceScene('shutdown-event'));
    this.events?.once?.('destroy', () => this.cleanupMissionWorkspaceScene('destroy-event'));
  }

  shutdown() {
    this.cleanupMissionWorkspaceScene('shutdown-method');
  }

  cleanupMissionWorkspaceScene(reason = 'cleanup') {
    this.cleanupInvocationCount = Number(this.cleanupInvocationCount ?? 0) + 1;
    this.cleanupReason = reason;
    if (this.sceneCleanupDisposed) {
      this.duplicateCleanupInvocationCount = Number(this.duplicateCleanupInvocationCount ?? 0) + 1;
      this.publishMissionWorkspaceCleanupDebug(reason, {
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
      this.app?.mapHoverTooltip?.hide?.();
      this.disableThreeInteractionSilently();
      this.input?.off?.('pointerdown', this.onPointerDown, this);
      this.input?.off?.('pointermove', this.onPointerMove, this);
      this.input?.off?.('pointerup', this.onPointerUp, this);
      globalThis.removeEventListener?.('resize', this.onViewportResize);
      this.resizeObserver?.disconnect?.();
      this.input?.off?.('wheel', this.onWheelZoom, this);
      this.input?.keyboard?.off?.('keydown', this.onCameraKeyDown, this);
      this.clearPlanningOverlayObjects?.();
      this.cameraObjects?.forEach?.((object) => object.destroy?.());
      this.cameraObjects = [];
      this.hud?.destroy?.();
      this.hud = null;
      this.executeHotspot?.destroy?.();
      this.executeHotspot = null;
      this.disposeThreeMissionRenderer();
      this.modal?.destroy?.();
      this.modal = null;
      this.fileBridge?.destroy?.();
      this.fileBridge = null;
      clearPlanningOverlayState(this.app?.state);
      if (this.app?.state?.ui?.threeMissionInteraction) {
        this.app.state.ui.threeMissionInteraction.dragPreview = null;
        this.app.state.ui.threeMissionInteraction.routePreview = null;
        this.app.state.ui.threeMissionInteraction.placementValidation = null;
        this.app.state.ui.threeMissionInteraction.waypointPlacementActive = false;
      }
      disposeThreeMissionSceneLifecycle(lifecycle, reason);
    } catch (error) {
      cleanupError = error;
      this.cleanupErrorCount = Number(this.cleanupErrorCount ?? 0) + 1;
      globalThis.console?.warn?.('MissionWorkspaceScene cleanup warning', error);
    }
    const after = threeMissionSceneLifecycleSummary(lifecycle);
    this.lifecycleResourceCountAfter = Number(after.activeResourceCount ?? 0);
    this.threeSceneLifecycle = null;
    this.publishMissionWorkspaceCleanupDebug(reason, { before, after, cleanupError });
  }

  publishMissionWorkspaceCleanupDebug(reason = 'cleanup', patch = {}) {
    const cleanup = {
      ...(globalThis.ANCHOR_SCENE_CLEANUP_DEBUG ?? {}),
      planningCleanupInvocationCount: Number(this.cleanupInvocationCount ?? 0),
      planningCleanupCompleted: this.sceneCleanupDisposed === true,
      planningDuplicateCleanupInvocationCount: Number(this.duplicateCleanupInvocationCount ?? 0),
      planningLifecycleWasNullAtCleanup: this.lifecycleWasNullAtCleanup === true,
      planningLifecycleResourceCountBefore: Number(this.lifecycleResourceCountBefore ?? 0),
      planningLifecycleResourceCountAfter: Number(this.lifecycleResourceCountAfter ?? 0),
      planningCleanupErrorCount: Number(this.cleanupErrorCount ?? 0),
      planningCleanupReason: reason,
      planningShutdownHandlerBindCount: Number(this.shutdownHandlerBindCount ?? 0),
      planningDestroyHandlerBindCount: Number(this.destroyHandlerBindCount ?? 0),
      planningDuplicateLifecycleHandlerCount: Number(this.duplicateLifecycleHandlerCount ?? 0)
    };
    globalThis.ANCHOR_SCENE_CLEANUP_DEBUG = cleanup;
    publishSceneIsolationDebug(this.app, {
      reason,
      disposedRendererCount: this.sceneLifecycleDisposalCount,
      lifecycleSummary: patch.after ?? patch.lifecycleSummary ?? threeMissionSceneLifecycleSummary(this.threeSceneLifecycle),
      planningCleanupInvocationCount: cleanup.planningCleanupInvocationCount,
      planningCleanupErrorCount: cleanup.planningCleanupErrorCount,
      nullLifecycleSummaryCount: (patch.before?.status === 'inactive' || patch.lifecycleSummary?.status === 'inactive') ? 1 : 0,
      duplicateCleanupInvocationCount: cleanup.planningDuplicateCleanupInvocationCount,
      activeWaterColumnSlabCount: 0,
      activeWaterColumnLabelCount: 0,
      activeWaterColumnFrameCount: 0
    });
  }

  goMainMenu(reason = 'mission-workspace-menu') {
    this.cleanupMissionWorkspaceScene(reason);
    this.scene.start('MainMenuScene');
  }

  update() {
    this.focusManager?.update();
  }

  renderHud() {
    this.hud = new HtmlMissionWorkspaceOverlay(this.app, {
      execute: () => this.handleExecuteControlAction('missionConsole'),
      help: () => this.showHelpModal(),
      saveLevel: () => this.saveCurrentLevel(),
      exportPlan: () => this.exportPlan(),
      exportSolver: () => this.exportSolverPacket(),
      exportChallenge: () => this.exportChallenge(),
      importChallenge: () => this.scene.start('LoadLevelJsonScene'),
      exportOracle: () => this.exportOracleDataset(),
      exportResult: () => this.exportResult(),
      importResult: () => this.importResultJson(),
      exportLeaderboard: () => this.exportLeaderboard(),
      importLeaderboard: () => this.importLeaderboardJson(),
      importPlan: () => this.fileBridge.open(),
      loadDemoPlan: () => this.loadBuiltInDemoPlan(),
      downloadDemoPlan: () => this.downloadBuiltInDemoPlan(),
      clearImportedPlan: () => this.clearImportedPlan(),
      toggleIgnoreUpdateEvents: () => this.toggleIgnoreUpdateEvents(),
      showBestPath: () => this.showBestPathOverlay(true),
      hideBestPath: () => this.showBestPathOverlay(false),
      rerunBestPath: () => this.rerunBestPath(),
      loadBestPath: () => this.loadBestPathAsPlan(),
      exportBestPath: () => this.exportBestPath(),
      temporalGreedy: () => this.applyTemporalGreedyPlan(),
      clear: () => this.clearSelectedAgentPlan(),
      cancelSurfacingReplan: () => this.cancelSurfacingReplan(),
      markerMode: () => this.togglePlacementMode(),
      clearMarkers: () => this.clearSelectedAgentMarkers(),
      focusWaypoint: (agentId, index) => this.focusWaypointFromTimeline(agentId, index),
      focusMarker: (index) => this.focusMarkerTime(index),
      nextGlider: () => this.selectNextGlider(),
      toggleMode: () => this.toggleChallengeMode(),
      toggleRoiMode: () => this.toggleRoiViewMode(),
      toggleLayer: (key) => this.toggleLayer(key),
      setStochasticSeed: (seed) => this.setStochasticSeed(seed),
      randomizeStochasticSeed: () => this.randomizeStochasticSeed(),
      copyStochasticSeed: () => this.copyStochasticSeed(),
      setStochasticRoiMode: (mode) => this.setStochasticRoiMode(mode),
      setForecastMember: (memberId) => this.setForecastMember(memberId),
      setRendererBackend: (backend) => this.setRendererBackend(backend),
      setThreeCameraPreset: (preset) => this.setThreeCameraPreset(preset),
      setMissionPlanningTool: (toolId) => this.setPlanningToolFromUi(toolId),
      setWaypointSnapMode: (mode) => this.setWaypointSnapMode(mode),
      toggleThreeLayer: (layerId) => this.toggleThreeMissionLayer(layerId),
      setThreeInteractionMode: (mode) => this.setThreeInteractionMode(mode),
      setWaterColumnDisplayMode: (mode) => this.setWaterColumnDisplayMode(mode),
      setWaterColumnActiveLayer: (layerId) => this.setWaterColumnActiveLayer(layerId),
      toggleWaterColumnLayer: (layerId) => this.toggleWaterColumnLayer(layerId),
      setWaterColumnLayerVisibilityMode: (mode) => this.setWaterColumnLayerVisibilityMode(mode),
      adjustWaterColumnOpacity: (delta) => this.adjustWaterColumnOpacity(delta),
      setWaterColumnScalarField: (fieldId) => this.setWaterColumnScalarField(fieldId),
      setWaterColumnCurrentMode: (mode) => this.setWaterColumnCurrentMode(mode),
      setWaterColumnCurrentLayerMode: (mode) => this.setWaterColumnCurrentLayerMode(mode),
      setWaterColumnCurrentDensity: (density) => this.setWaterColumnCurrentDensity(density),
      setWaterColumnCurrentMagnitudeScale: (scale) => this.setWaterColumnCurrentMagnitudeScale(scale),
      setWaterColumnCurrentColorMode: (mode) => this.setWaterColumnCurrentColorMode(mode),
      toggleWaterColumnContextCurrents: () => this.toggleWaterColumnContextCurrents(),
      setWaterColumnFieldDisplayMode: (mode) => this.setWaterColumnFieldDisplayMode(mode),
      setThreeQualityProfile: (profile) => this.setThreeQualityProfile(profile),
      setWaterColumnVolumeRenderMode: (mode) => this.setWaterColumnVolumeRenderMode(mode),
      setWaterColumnDiveProfile: (profileId) => this.setWaterColumnDiveProfile(profileId),
      setWaterColumnTargetLayer: (layerId) => this.setWaterColumnTargetLayer(layerId),
      setWaterColumnMaximumDepth: (depth) => this.setWaterColumnMaximumDepth(depth),
      setWaterColumnCycleCount: (count) => this.setWaterColumnCycleCount(count),
      setWaterColumnSampleInterval: (seconds) => this.setWaterColumnSampleInterval(seconds),
      setWaterColumnSamplingPhase: (phase) => this.setWaterColumnSamplingPhase(phase),
      applyWaterColumnProfileToThisSegment: () => this.applyWaterColumnProfileToThisSegment(),
      setWaterColumnProfileAsGliderDefault: () => this.setWaterColumnProfileAsGliderDefault(),
      resetWaterColumnSegmentToGliderDefault: () => this.resetWaterColumnSegmentToGliderDefault(),
      setWaterColumnVerticalExaggeration: (value) => this.setWaterColumnVerticalExaggeration(value),
      attachScienceTargetToSelectedSegment: () => this.attachScienceTargetToSelectedSegment(),
      detachSelectedScienceTarget: () => this.detachSelectedScienceTarget(),
      focusSelectedScienceTarget: () => this.focusSelectedScienceTarget(),
      setTargetLayerFromSelectedScienceTarget: () => this.setTargetLayerFromSelectedScienceTarget(),
      copyTargetDepthToRequestedDepth: () => this.copyTargetDepthToRequestedDepth(),
      recommendScienceTargetProfiles: () => this.recommendScienceTargetProfiles(),
      resetWaterColumnSegmentProfile: () => this.resetWaterColumnSegmentProfile(),
      applyWaterColumnProfileToRemainingSegments: () => this.applyWaterColumnProfileToRemainingSegments(),
      cancelThreeInteraction: () => this.cancelThreeInteraction(),
      rerunSamePlan: () => this.rerunSamePlan(),
      rerunWithNewSeed: () => this.rerunWithNewSeed(),
      toggleGuidance: () => this.toggleGuidance(),
      mainMenu: () => this.goMainMenu('mission-console-main-menu')
    });
    this.hud.handlers.remove = (index) => {
      removeWaypoint(this.app.state.plan, this.app.state.selectedAgentId, index);
      this.afterPlanChanged(this.app.state.selectedAgentId, { selectedIndex: index - 1 });
      this.clearSelectedWaypoint();
      this.markManualPlan();
      this.refreshPanels();
      this.refreshMap();
    };
    this.hud.handlers.moveUp = (index) => {
      if (moveWaypointUp(this.app.state.plan, this.app.state.selectedAgentId, index)) {
        this.afterPlanChanged(this.app.state.selectedAgentId, { selectedIndex: index - 1 });
        this.markManualPlan();
        this.refreshPanels();
        this.refreshMap();
      }
    };
    this.hud.handlers.moveDown = (index) => {
      if (moveWaypointDown(this.app.state.plan, this.app.state.selectedAgentId, index)) {
        this.afterPlanChanged(this.app.state.selectedAgentId, { selectedIndex: index + 1 });
        this.markManualPlan();
        this.refreshPanels();
        this.refreshMap();
      }
    };
    this.hud.handlers.time = (time) => this.setPlanningTime(time);
    this.hud.handlers.frame = (frameIndex) => this.setTimelineFrame(frameIndex);
    this.hud.handlers.window = (windowIndex) => this.setActiveWindow(windowIndex);
    this.app.waypointPanel?.setHandlers({
      selectAgent: (agentId) => this.selectGlider(agentId),
      selectWaypoint: (agentId, index) => this.selectWaypoint(agentId, index),
      remove: (agentId, index) => this.removeWaypointFromPanel(agentId, index),
      moveUp: (agentId, index) => this.moveWaypointFromPanel(agentId, index, 'up'),
      moveDown: (agentId, index) => this.moveWaypointFromPanel(agentId, index, 'down'),
      changeStart: (agentId) => this.promptStartChange(agentId),
      convertMarker: (agentId, index) => this.convertMarkerFromPanel(agentId, index),
      deleteMarker: (agentId, index) => this.deleteMarkerFromPanel(agentId, index),
      focusMarker: (agentId, index) => this.focusMarkerTime(index)
    });
    this.app.agentPerformanceHud?.setHandlers({
      selectAgent: (agentId) => this.selectGlider(agentId)
    });
    this.executeHotspot = this.add.rectangle(1110, 40, 150, 40, 0x000000, 0)
      .setInteractive()
      .setDepth(2);
    this.executeHotspot.on('pointerup', () => this.handleExecuteControlAction('legacyHotspot'));
    this.executeHotspot.on('pointerdown', () => {
      this.suppressNextPointerUp = true;
    });
  }

  renderCameraControls() {
    const y = 86;
    const controls = [
      ['Zoom +', () => this.zoomMap(1.2)],
      ['Zoom -', () => this.zoomMap(1 / 1.2)],
      ['Fit', () => this.fitMapCamera()],
      ['Reset', () => this.resetMapCamera()]
    ];
    controls.forEach(([label, onClick], index) => {
      const button = new PhaserButton(this, {
        x: 898 + index * 92,
        y,
        width: 82,
        height: 30,
        label,
        onClick
      });
      button.background?.setDepth?.(12);
      button.label?.setDepth?.(13);
      this.cameraObjects.push(button);
    });
  }

  setupMapCameraControls() {
    this.app.state.ui.mapCamera ??= { zoom: 1, panX: 0, panY: 0 };
    this.input.mouse?.disableContextMenu?.();
    this.spaceKey = this.input.keyboard?.addKey?.('SPACE');
    this.input.on('wheel', this.onWheelZoom, this);
    this.onCameraKeyDown = (event) => {
      const key = String(event.key ?? '').toLowerCase();
      if (key === '+' || key === '=') this.zoomMap(1.18);
      else if (key === '-' || key === '_') this.zoomMap(1 / 1.18);
      else if (key === 'f') this.fitMapCamera();
      else if (key === 'r') this.resetMapCamera();
      else if (key === 'arrowleft' || key === 'a') this.panMap(48, 0);
      else if (key === 'arrowright' || key === 'd') this.panMap(-48, 0);
      else if (key === 'arrowup' || key === 'w') this.panMap(0, 48);
      else if (key === 'arrowdown' || key === 's') this.panMap(0, -48);
      else return;
      event.preventDefault?.();
    };
    this.input.keyboard?.on('keydown', this.onCameraKeyDown);
  }

  onWheelZoom(pointer, _gameObjects, _deltaX, deltaY) {
    this.zoomMap(deltaY < 0 ? 1.14 : 1 / 1.14, pointer);
  }

  shouldPanMap(pointer) {
    return pointer.rightButtonDown?.()
      || pointer.middleButtonDown?.()
      || Boolean(this.spaceKey?.isDown);
  }

  zoomMap(factor, pointer = null) {
    this.app.state.ui.mapCamera ??= { zoom: 1, panX: 0, panY: 0 };
    const camera = this.app.state.ui.mapCamera;
    const previousZoom = clampZoom(camera.zoom ?? 1);
    const nextZoom = clampZoom(previousZoom * factor);
    if (Math.abs(nextZoom - previousZoom) < 0.001) return;
    if (pointer && this.app.adapter.layout) {
      const layout = this.app.adapter.layout;
      const point = this.resolvePointerPoint(pointer);
      const gridX = (point.x - layout.ox) / layout.cell;
      const gridY = (point.y - layout.oy) / layout.cell;
      const nextLayout = getMapLayout(this.app.state.level, undefined, undefined, this.getCurrentMapBounds(), {
        zoom: nextZoom,
        panX: 0,
        panY: 0
      });
      camera.panX = point.x - gridX * nextLayout.cell - nextLayout.baseOx;
      camera.panY = point.y - gridY * nextLayout.cell - nextLayout.baseOy;
    }
    camera.zoom = nextZoom;
    this.constrainCurrentMapCamera();
    this.refreshMap();
  }

  panMap(dx, dy) {
    this.app.state.ui.mapCamera ??= { zoom: 1, panX: 0, panY: 0 };
    this.app.state.ui.mapCamera.panX = Number(this.app.state.ui.mapCamera.panX ?? 0) + dx;
    this.app.state.ui.mapCamera.panY = Number(this.app.state.ui.mapCamera.panY ?? 0) + dy;
    this.constrainCurrentMapCamera();
    this.refreshMap();
  }

  fitMapCamera() {
    this.app.state.ui.mapCamera = { zoom: 1, panX: 0, panY: 0 };
    this.refreshMap();
  }

  resetMapCamera() {
    this.app.state.ui.mapCamera = { zoom: 1, panX: 0, panY: 0 };
    this.refreshMap();
  }

  getCurrentMapBounds() {
    return getViewportMapBounds(this.app, {
      topPadding: 18,
      sidePadding: 34,
      bottomPadding: 18,
      fallbackTop: 70,
      fallbackBottom: 100
    });
  }

  constrainCurrentMapCamera() {
    const camera = this.app.state.ui.mapCamera;
    if (!camera) return;
    const layout = getMapLayout(this.app.state.level, undefined, undefined, this.getCurrentMapBounds(), camera);
    camera.zoom = layout.zoom;
    camera.panX = layout.panX;
    camera.panY = layout.panY;
  }

  refreshPanels() {
    recomputePlanningMarkerReachability(this.app.state);
    this.refreshBestPriorPath();
    this.refreshRouteAudit();
    this.ensureContinuousMissionUiState();
    this.hud?.refresh(this.app.state);
    this.app.waypointPanel?.refresh(this.app.state);
    this.app.summaryHud?.refresh(this.app.state);
    this.app.agentPerformanceHud?.refresh(this.app.state);
    this.publishContinuousMissionDebug();
  }

  refreshRouteAudit() {
    if (!this.app.state?.level || !this.app.state?.mission || !this.app.state?.plan) return null;
    this.app.state.ui ??= {};
    this.app.state.ui.routeAudit = validateRoutePlanForExecution({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      gameState: this.app.state
    });
    this.refreshTerrainAwareMissionValidation();
    return this.app.state.ui.routeAudit;
  }

  refreshTerrainAwareMissionValidation() {
    if (!this.app.state?.level || !this.app.state?.mission || !this.app.state?.plan) return null;
    this.app.state.ui ??= {};
    this.terrainValidationCache ??= createTerrainValidationCacheState();
    const frame = terrainValidationVisibleFrame(this.app.state);
    const keyRecord = this.buildTerrainValidationCacheKey(frame);
    const cache = this.terrainValidationCache;
    const cameraGestureActive = this.threeInteractionController?.cameraGestureActive === true || this.threeInteractionController?.cameraController?.gestureActive === true;
    if (cache.key === keyRecord.key && cache.report) {
      cache.counters.planningValidationCacheHitCount += 1;
      this.app.state.ui.terrainAwareValidationReport = cache.report;
      this.app.state.ui.missionReadiness = cache.summary;
      this.app.state.ui.terrainAwareValidationError = null;
      if (cameraGestureActive) cache.counters.validationCacheHitCountDuringCameraGesture += 1;
      return cache.report;
    }
    cache.counters.planningValidationCacheMissCount += 1;
    cache.counters.planningValidationBuildCount += 1;
    cache.counters.lastPlanningValidationInvalidationReason = this.terrainValidationInvalidationReason(cache.keyRecord, keyRecord);
    if (cameraGestureActive) {
      cache.counters.validationBuildCountDuringCameraGesture += 1;
      cache.counters.validationInvalidationCountDuringCameraGesture += 1;
      cache.counters.lastCameraGestureValidationReason = cache.counters.lastPlanningValidationInvalidationReason;
    }
    try {
      const report = buildTerrainAwareMissionValidationReport({
        level: this.app.state.level,
        mission: this.app.state.mission,
        plan: this.app.state.plan,
        appState: this.app.state,
        frame
      });
      const summary = terrainAwareMissionValidationSummary(report);
      this.app.state.ui.terrainAwareValidationReport = report;
      this.app.state.ui.missionReadiness = summary;
      this.app.state.ui.terrainAwareValidationError = null;
      cache.key = keyRecord.key;
      cache.keyRecord = keyRecord;
      cache.report = report;
      cache.summary = summary;
      this.recordMissionReadinessRender(summary, keyRecord.key, cameraGestureActive);
      return report;
    } catch (error) {
      this.app.state.ui.terrainAwareValidationReport = null;
      this.app.state.ui.missionReadiness = { status: 'INVALID', executable: false, hardErrorCount: 1, warningCount: 0, advisoryCount: 0, firstIssue: { code: 'INVALID_DIVE_PROFILE', severity: 'HARD_ERROR', message: String(error?.message ?? error) } };
      this.app.state.ui.terrainAwareValidationError = String(error?.message ?? error);
      cache.counters.lastPlanningValidationInvalidationReason = 'validation-error';
      return null;
    }
  }

  buildTerrainValidationCacheKey(frame = null) {
    const state = this.app.state ?? {};
    const level = state.level ?? {};
    const mission = state.mission ?? {};
    const plan = state.plan ?? {};
    const ui = state.ui ?? {};
    const keyParts = {
      version: 'terrain-validation-cache-r1-2c-2',
      levelId: level.levelId ?? level.scenarioId ?? null,
      missionId: mission.missionId ?? mission.id ?? null,
      grid: level.world?.grid ?? null,
      time: level.world?.time ?? null,
      plan: terrainValidationPlanKey(plan),
      mission: terrainValidationMissionKey(mission),
      terrainSourceDigest: level.bathymetry?.sourceDigest ?? stableDigestForScene({ bathymetry: level.bathymetry, terrain: level.layers?.terrain, bottomDepthMeters: level.layers?.bottomDepthMeters }),
      constraintDigest: stableDigestForScene({ hazards: level.layers?.hazards, restrictedZones: level.layers?.restrictedZones ?? level.layers?.static?.restrictedZones, bases: level.layers?.bases ?? level.layers?.static?.bases, zones: level.zones }),
      frameDigest: stableDigestForScene({ t: frame?.t ?? frame?.timeSeconds ?? null, current: frame?.currentDigest ?? frame?.vectorDigest ?? null, forecastMemberId: ui.forecastMemberId ?? null, challengeMode: state.challengeMode ?? null }),
      vehicleDigest: stableDigestForScene((mission.agents ?? []).map((agent) => ({ id: agent.id, start: agent.start, deployment: agent.deployment, maxDepthMeters: agent.maxDepthMeters ?? agent.depthRatingMeters, speed: agent.speed ?? agent.speedMetersPerSecond }))),
      duration: mission.rules?.durationSeconds ?? level.world?.time?.duration ?? null
    };
    return { key: stableDigestForScene(keyParts), parts: keyParts };
  }

  terrainValidationInvalidationReason(previous = null, next = null) {
    if (!previous) return 'initial-build';
    const before = previous.parts ?? {};
    const after = next?.parts ?? {};
    for (const key of ['plan', 'terrainSourceDigest', 'constraintDigest', 'frameDigest', 'vehicleDigest', 'mission', 'duration', 'grid', 'time']) {
      if (stableDigestForScene(before[key]) !== stableDigestForScene(after[key])) return key;
    }
    return previous.key === next?.key ? 'cache-hit' : 'unknown-input-change';
  }

  recordMissionReadinessRender(summary = {}, validationKey = null, cameraGestureActive = false) {
    this.terrainValidationCache ??= createTerrainValidationCacheState();
    const cache = this.terrainValidationCache;
    const digest = stableDigestForScene({ validationKey, summary });
    if (cache.lastMissionReadinessDigest === digest) {
      cache.counters.missionReadinessIssueRowReuseCount += Number(summary.issueCodes?.length ?? 0);
      return;
    }
    cache.lastMissionReadinessDigest = digest;
    cache.counters.missionReadinessRenderCount += 1;
    cache.counters.missionReadinessIssueRowCreateCount += Number(summary.issueCodes?.length ?? 0);
    if (cameraGestureActive) cache.counters.missionReadinessRenderCountDuringCameraGesture += 1;
  }

  terrainValidationDebugCounters() {
    return { ...(this.terrainValidationCache?.counters ?? createTerrainValidationCacheState().counters) };
  }

  refreshMap() {
    this.clearPlanningOverlayObjects();
    if (this.getMissionRendererBackend() === 'threeMission3d') {
      this.mapGraphics?.setVisible?.(false);
      this.refreshThreeMissionRenderer();
      return;
    }
    this.hideThreeMissionRenderer();
    this.mapGraphics?.setVisible?.(true);
    const markerMode = this.app.state.ui.placementMode === 'marker';
    const guidanceSettings = {
      mode: markerMode ? 'marker' : 'planning',
      showWater: this.app.state.ui.showWater,
      showROI: this.app.state.ui.showROI,
      showCurrents: this.app.state.ui.showCurrents,
      showHazards: this.app.state.ui.showHazards,
      showTerrain: this.app.state.ui.showTerrain,
      showPlannedPath: markerMode ? false : this.app.state.ui.showPlannedPath,
      showActualPath: this.app.state.ui.showActualPath,
      showGuidance: markerMode ? false : this.app.state.ui.showGuidance,
      showDrift: markerMode ? false : this.app.state.ui.showDriftCone,
      showReachable: markerMode ? false : this.app.state.ui.showReachableArea,
      showSurfacing: this.app.state.ui.showPredictedSurfacing,
      showEnergy: markerMode ? false : this.app.state.ui.showEnergyPreview,
      showPlanningMarkers: this.app.state.ui.showPlanningMarkers,
      showBestPathOverlay: this.app.state.ui.showBestPathOverlay,
      planningAnchor: this.app.state.ui.planningAnchor,
      surfaceDecision: this.app.state.surfaceDecision
    };
    const renderTime = getActiveRenderTime(this.app.state, null);
    const layout = drawMissionMap(this.mapGraphics, {
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      selectedAgentId: this.app.state.selectedAgentId,
      selectedWaypoint: this.app.state.ui.selectedWaypoint,
      selectedMarker: this.app.state.ui.selectedMarker,
      selectedWindow: this.app.state.selectedWindow,
      surfacedAgents: this.app.state.surfacedAgents,
      hoverCell: this.app.state.ui.hoverCell,
      guidanceSettings,
      time: renderTime,
      challengeMode: this.app.state.challengeMode,
      revealTruth: this.app.state.ui.revealTruth,
      forecastMemberId: this.app.state.ui.forecastMemberId,
      roiViewMode: this.app.state.ui.roiViewMode,
      showEnsembleDisagreement: this.app.state.ui.showEnsembleDisagreement,
      mapBounds: this.getCurrentMapBounds(),
      mapCamera: this.app.state.ui.mapCamera,
      bestPathOverlay: this.app.state.bestPriorPath
    });
    this.app.state.ui.overlayDebug = guidanceSettings.overlayDebug;
    this.app.adapter.layout = layout;
    this.addGuidanceLabel(layout);
    this.addDeploymentSelectionLabels(layout);
    this.addWaypointLabels(layout);
    this.addGliderHitTargets(layout);
    this.updateMissionRenderDebug({ activeBackend: 'legacyPhaser2d', threeMounted: false, viewModel: this.buildMissionWorldViewModelForScene(), parityWarnings: [] });
    this.refreshMigrationDebug();
  }

  getMissionRendererBackend() {
    return preferredMissionRendererBackend({ requested: this.app.state.ui?.rendererBackend });
  }

  refreshMigrationDebug() {
    return publishMigrationDebug({
      legacyFallbackEnabled: legacyPhaserMissionRendererEnabled(),
      planningBackend: this.getMissionRendererBackend(),
      simulationBackend: 'threeMission3d',
      remainingPhaserProductionRoutes: ['scene-lifecycle', 'mission-briefing', 'simulation-lifecycle', 'debrief', 'editor']
    });
  }

  setRendererBackend(backend) {
    this.app.state.ui ??= {};
    const normalized = preferredMissionRendererBackend({ requested: backend });
    const previous = preferredMissionRendererBackend({ requested: this.app.state.ui.rendererBackend });
    if (previous === normalized) return;
    this.app.state.ui.rendererBackend = normalized;
    if (previous === 'threeMission3d' && normalized !== 'threeMission3d') {
      this.disableThreeInteractionSilently();
      this.app.state.ui.hoverCell = null;
      this.app.state.ui.threeMissionInteraction ??= {};
      this.app.state.ui.threeMissionInteraction.dragPreview = null;
      this.app.state.ui.threeMissionInteraction.routePreview = null;
      this.app.state.ui.threeMissionInteraction.placementValidation = null;
    }
    this.refreshPanels();
    this.refreshMap();
  }

  ensureMissionPlanningToolState() {
    this.app.state.ui ??= {};
    const existing = this.app.state.ui.missionPlanningTool;
    const activeToolId = existing?.activeToolId ?? toolIdForInteractionMode(this.app.state.ui.threeMissionInteractionMode ?? 'selectInspect');
    const context = this.toolContextForAgent(this.app.state.selectedAgentId);
    const next = existing
      ? setMissionPlanningTool(existing, activeToolId, context)
      : createMissionPlanningToolState({ activeToolId, interactionMode: this.app.state.ui.threeMissionInteractionMode ?? 'selectInspect', ...context });
    const validation = validateMissionPlanningToolState(next);
    this.app.state.ui.missionPlanningTool = validation.valid
      ? next
      : createMissionPlanningToolState({ activeToolId: 'selectInspect', ...context, statusMessage: 'Planning tools reset after invalid state.', validationReason: validation.errors.join(' ') });
    this.activePlanningToolId = this.app.state.ui.missionPlanningTool.activeToolId;
    return this.app.state.ui.missionPlanningTool;
  }

  toolContextForAgent(agentId = this.app.state.selectedAgentId) {
    const agent = this.app.state.mission?.agents?.find((candidate) => candidate.id === agentId);
    return {
      selectedAgentId: agentId ?? null,
      selectedAgentLabel: agent?.label ?? agent?.name ?? agentId ?? 'selected glider',
      deploymentAgentId: agentId ?? null,
      deploymentDropZoneId: agent?.deployment?.zoneId ?? null
    };
  }

  activatePlanningTool(toolId, context = {}) {
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    const existing = this.ensureMissionPlanningToolState();
    const selectedAgentId = context.selectedAgentId ?? this.app.state.selectedAgentId ?? existing.selectedAgentId ?? this.app.state.mission?.agents?.[0]?.id ?? null;
    if (selectedAgentId) this.app.state.selectedAgentId = selectedAgentId;
    const next = setMissionPlanningTool(existing, toolId, { ...this.toolContextForAgent(selectedAgentId), ...context });
    const mode = interactionModeForTool(next.activeToolId);
    const interaction = this.app.state.ui.threeMissionInteraction;
    interaction.interactionMode = mode;
    interaction.userHint = next.instructions;
    interaction.planningToolState = missionPlanningToolStateSummary(next);
    interaction.waypointPlacementActive = next.activeToolId === 'placeWaypoint';
    interaction.samplingTargetPlacementActive = next.activeToolId === 'placeSamplingTarget';
    interaction.waypointValidationReason = next.activeToolId === 'placeWaypoint' ? next.validationReason ?? null : null;
    if (next.activeToolId === 'selectDeploymentCell') {
      interaction.deploymentSelectionActive = true;
      interaction.deploymentAgentId = next.deploymentAgentId ?? selectedAgentId;
      interaction.previousInteractionMode = interactionModeForTool(next.previousToolId ?? 'selectInspect');
      interaction.deploymentCandidateCell = null;
      interaction.deploymentCandidateValid = null;
      interaction.deploymentValidationReason = next.instructions;
      this.clearSelectedWaypoint();
      applyPlanningAnchor(this.app.state, interaction.deploymentAgentId);
      this.app.toast?.(next.instructions, 'info');
    } else {
      interaction.deploymentSelectionActive = false;
      interaction.deploymentCandidateCell = null;
      interaction.deploymentCandidateValid = null;
      interaction.deploymentValidationReason = null;
    }
    if (next.activeToolId !== 'placeWaypoint') {
      interaction.waypointCandidateCell = null;
      interaction.waypointCandidateValid = null;
      interaction.waypointValidationReason = null;
      interaction.routePreview = null;
    }
    if (next.activeToolId !== 'placeSamplingTarget') interaction.samplingTargetCandidateCell = null;
    this.app.state.ui.missionPlanningTool = next;
    this.activePlanningToolId = next.activeToolId;
    this.app.state.ui.threeMissionInteractionMode = mode;
    this.syncPlanningToolToThreeController();
    this.updateThreeToolOverlay();
    this.refreshPanels();
    this.refreshMap();
    return next;
  }

  setPlanningTool(toolId, context = {}) {
    return this.activatePlanningTool(toolId, context);
  }

  setWaypointSnapMode(mode) {
    const normalized = mode === 'freePlacement' || mode === 'snapToFeature' || mode === 'snapToCellCenters'
      ? mode
      : (this.currentCoordinateProfileId() === 'continuousGridV1' ? 'freePlacement' : 'snapToCellCenters');
    const effective = normalized === 'freePlacement' && this.currentCoordinateProfileId() !== 'continuousGridV1'
      ? 'snapToCellCenters'
      : normalized;
    this.app.state.ui ??= {};
    this.app.state.ui.waypointSnapMode = effective;
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.waypointSnapMode = effective;
    this.app.state.ui.threeMissionInteraction.snapModeUpdatedAt = Date.now();
    this.syncPlanningToolToThreeController();
    this.refreshPanels();
    this.refreshMap();
    this.app.toast?.(`Waypoint placement: ${labelForSnapMode(effective)}.`, 'info');
    return effective;
  }

  cancelPlanningTool(reason = 'user') {
    this.cancelThreeInteraction();
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.lastCancelReason = reason;
    return this.ensureMissionPlanningToolState();
  }

  syncPlanningToolToThreeController() {
    const state = this.ensureMissionPlanningToolState();
    const mode = interactionModeForTool(state.activeToolId);
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteractionMode = mode;
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.interactionMode = mode;
    this.app.state.ui.threeMissionInteraction.planningToolState = missionPlanningToolStateSummary(state);
    if (this.threeInteractionController) setThreeMissionInteractionMode(this.threeInteractionController, mode);
    return mode;
  }

  planningToolStateSummary() {
    return missionPlanningToolStateSummary(this.ensureMissionPlanningToolState());
  }

  visiblePlanningToolButtonId() {
    const root = globalThis.document?.getElementById?.('mission-console');
    const activeButton = root?.querySelector?.('[data-action="mission-planning-tool"].primary');
    return activeButton?.dataset?.tool ?? null;
  }

  planningToolStateMismatches() {
    const state = this.ensureMissionPlanningToolState();
    const expectedMode = interactionModeForTool(state.activeToolId);
    const visibleToolButtonId = this.visiblePlanningToolButtonId();
    const mismatches = [];
    if (this.activePlanningToolId !== state.activeToolId) mismatches.push({ field: 'scene.activePlanningToolId', expected: state.activeToolId, actual: this.activePlanningToolId ?? null });
    if ((this.app.state.ui?.threeMissionInteractionMode ?? null) !== expectedMode) mismatches.push({ field: 'ui.threeMissionInteractionMode', expected: expectedMode, actual: this.app.state.ui?.threeMissionInteractionMode ?? null });
    if ((this.threeInteractionController?.interactionMode ?? expectedMode) !== expectedMode) mismatches.push({ field: 'threeInteractionController.interactionMode', expected: expectedMode, actual: this.threeInteractionController?.interactionMode ?? null });
    if (visibleToolButtonId && visibleToolButtonId !== state.activeToolId) mismatches.push({ field: 'visible active button', expected: state.activeToolId, actual: visibleToolButtonId });
    return mismatches;
  }

  waypointToolAvailability(agentId = this.app.state.selectedAgentId) {
    const missionPhaseAllowsPlanning = this.app.state.mode === 'planning';
    const agent = this.app.state.mission?.agents?.find((candidate) => candidate.id === agentId);
    if (!agentId || !agent) return { enabled: false, selectedAgentId: agentId ?? null, hasDeploymentStart: false, missionPhaseAllowsPlanning, reason: 'Select a glider first.' };
    if (!missionPhaseAllowsPlanning) return { enabled: false, selectedAgentId: agentId, hasDeploymentStart: Boolean(getSelectedStart(agent)), missionPhaseAllowsPlanning, reason: 'Planning is unavailable in the current mission phase.' };
    if (agent.locked === true || agent.planningLocked === true) return { enabled: false, selectedAgentId: agentId, hasDeploymentStart: Boolean(getSelectedStart(agent)), missionPhaseAllowsPlanning, reason: 'This agent is locked.' };
    if (requiresDeploymentSelection(this.app.state.mission, agentId)) return { enabled: false, selectedAgentId: agentId, hasDeploymentStart: false, missionPhaseAllowsPlanning, reason: 'Deploy this glider first.' };
    if (!getSelectedStart(agent)) return { enabled: false, selectedAgentId: agentId, hasDeploymentStart: false, missionPhaseAllowsPlanning, reason: 'No valid deployment exists.' };
    const disabledReason = getPlacementDisabledReason(this.app.state, agentId);
    if (disabledReason) return { enabled: false, selectedAgentId: agentId, hasDeploymentStart: true, missionPhaseAllowsPlanning, reason: disabledReason.endsWith('.') ? disabledReason : `${disabledReason}.` };
    return { enabled: true, selectedAgentId: agentId, hasDeploymentStart: true, missionPhaseAllowsPlanning, reason: 'Ready to add waypoints.' };
  }

  recordPlanningToolControlDispatch(toolId) {
    const now = Date.now();
    if (this.lastPlanningToolDispatch?.toolId === toolId && now - this.lastPlanningToolDispatch.time < 30) this.duplicateToolControlDispatchCount += 1;
    this.planningToolControlDispatchCount += 1;
    this.lastPlanningToolDispatch = { toolId, time: now };
  }

  setPlanningToolFromUi(toolId) {
    this.recordPlanningToolControlDispatch(toolId);
    if (toolId === 'placeWaypoint') {
      const availability = this.waypointToolAvailability(this.app.state.selectedAgentId);
      if (!availability.enabled) {
        this.updatePlanningToolValidation({ canPlace: false, validationReason: availability.reason, statusMessage: availability.reason, instructions: availability.reason });
        this.app.toast?.(availability.reason, 'warning');
        this.refreshPanels();
        this.refreshMap();
        return this.ensureMissionPlanningToolState();
      }
    }
    return this.setPlanningTool(toolId, this.toolContextForAgent(this.app.state.selectedAgentId));
  }

  completeDeploymentPlanningTool(agentId = this.app.state.selectedAgentId) {
    const agent = this.app.state.mission?.agents?.find((candidate) => candidate.id === agentId);
    const label = agent?.label ?? agent?.name ?? agentId ?? 'Glider';
    const agentPlan = getAgentPlan(this.app.state.plan, agentId);
    const routeWaypointCount = agentPlan.waypoints?.length ?? 0;
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    if (routeWaypointCount === 0) {
      const message = `${label} deployed. Click the mission plane to add its first waypoint.`;
      this.autoArmedWaypointAfterDeployment = true;
      this.app.state.ui.threeMissionInteraction.autoArmedWaypointAfterDeployment = true;
      this.app.state.ui.threeMissionInteraction.lastDeploymentTransition = { agentId, routeWaypointCount, nextToolId: 'placeWaypoint', message };
      const next = this.activatePlanningTool('placeWaypoint', {
        ...this.toolContextForAgent(agentId),
        selectedAgentId: agentId,
        canPlace: true,
        validationReason: null,
        statusMessage: message,
        instructions: message
      });
      return { nextToolId: next.activeToolId, autoArmed: true, message };
    }
    const message = 'Start changed. Existing route has been revalidated.';
    this.autoArmedWaypointAfterDeployment = false;
    this.app.state.ui.threeMissionInteraction.autoArmedWaypointAfterDeployment = false;
    this.app.state.ui.threeMissionInteraction.lastDeploymentTransition = { agentId, routeWaypointCount, nextToolId: 'selectInspect', message };
    const next = this.activatePlanningTool('selectInspect', {
      ...this.toolContextForAgent(agentId),
      selectedAgentId: agentId,
      statusMessage: message,
      instructions: 'Click objects to select or inspect. Empty-cell clicks do not add route waypoints.'
    });
    return { nextToolId: next.activeToolId, autoArmed: false, message };
  }
  completeOneShotPlanningTool() {
    const state = this.ensureMissionPlanningToolState();
    if (state.oneShot !== true) return state;
    const next = setMissionPlanningTool(state, 'selectInspect', { ...this.toolContextForAgent(this.app.state.selectedAgentId), statusMessage: 'Deployment start selected.', instructions: 'Click objects to select or inspect. Empty-cell clicks do not add route waypoints.' });
    this.app.state.ui.missionPlanningTool = next;
    this.activePlanningToolId = next.activeToolId;
    this.app.state.ui.threeMissionInteractionMode = interactionModeForTool(next.activeToolId);
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.interactionMode = this.app.state.ui.threeMissionInteractionMode;
    this.app.state.ui.threeMissionInteraction.planningToolState = missionPlanningToolStateSummary(next);
    this.syncPlanningToolToThreeController();
    return next;
  }

  updatePlanningToolValidation({ canPlace = null, validationReason = null, statusMessage = null, instructions = null } = {}) {
    const state = this.ensureMissionPlanningToolState();
    const next = setMissionPlanningTool(state, state.activeToolId, { ...this.toolContextForAgent(this.app.state.selectedAgentId), canPlace, validationReason, statusMessage, instructions });
    this.app.state.ui.missionPlanningTool = next;
    this.activePlanningToolId = next.activeToolId;
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.planningToolState = missionPlanningToolStateSummary(next);
    return next;
  }

  ensureThreeToolOverlay() {
    const container = this.threeMissionContainer;
    if (!container?.appendChild) return null;
    if (this.threeMissionToolOverlay?.isConnected) return this.threeMissionToolOverlay;
    const overlay = globalThis.document?.createElement?.('div');
    if (!overlay) return null;
    overlay.className = 'three-mission-tool-overlay';
    overlay.setAttribute('aria-live', 'polite');
    container.appendChild(overlay);
    this.threeMissionToolOverlay = overlay;
    return overlay;
  }

  updateThreeToolOverlay() {
    const overlay = this.ensureThreeToolOverlay();
    const state = this.ensureMissionPlanningToolState();
    if (!overlay || !state) return;
    overlay.dataset.activePlanningTool = state.activeToolId;
    const config = this.currentWaterColumnConfig();
    const layers = config?.depthLayerIds ?? ['surface'];
    const ui = this.app.state.ui?.waterColumn ?? {};
    const legacy = config?.source === 'importedLegacySurfaceFallback' || config?.compatibility?.importedLegacySurfaceFallback === true || layers.length <= 1;
    const waterColumnBadge = legacy ? 'Legacy surface-only mission' : `${layers.length}-layer water column - ${ui.verticalDisplayMode === 'explodedLayers' ? 'Exploded view' : 'Physical depth'}`;
    overlay.innerHTML = `<div class="three-mission-tool-badge">${escapeSceneHtml(labelForTool(state.activeToolId))}</div><div class="three-mission-water-column-badge">${escapeSceneHtml(waterColumnBadge)}</div><div class="three-mission-tool-instruction">${escapeSceneHtml(state.instructions ?? '')}</div>`;
    const canvas = this.threeMissionRenderer?.renderer?.domElement;
    if (canvas?.style) canvas.style.cursor = cursorForTool(state.activeToolId, { dragging: this.threeInteractionController?.cameraGestureActive === true });
  }
  setThreeCameraPreset(preset) {
    this.app.state.ui ??= {};
    const renderer = this.threeMissionRenderer;
    const controller = renderer?.cameraController;
    const presetId = String(preset ?? 'obliqueMission');
    if (presetId === 'focusSelectedGlider') {
      focusThreeMissionCamera(controller, this.threeCameraFocusTargetForSelectedGlider(), { distance: controller?.distance });
      this.app.state.ui.threeMissionCameraPreset = 'focusSelectedGlider';
    } else if (presetId === 'focusRoute') {
      focusThreeMissionCamera(controller, this.threeCameraFocusTargetForRoute(), { distance: controller?.distance });
      this.app.state.ui.threeMissionCameraPreset = 'focusRoute';
    } else if (presetId === 'resetCamera') {
      resetThreeMissionCamera(controller, { presetId: 'obliqueMission' });
      this.app.state.ui.threeMissionCameraPreset = 'obliqueMission';
    } else {
      const normalized = ['tacticalTopDown', 'obliqueMission', 'obliqueWaterColumn', 'waterColumnProfile', 'sideProfile', 'layerStackOverview', 'activeLayer', 'selectedDive', 'selectedSegmentDive', 'divePlanningView', 'obliqueDive', 'fullRouteDiveOverview', 'fleetOverview'].includes(presetId) ? presetId : 'obliqueMission';
      this.app.state.ui.threeMissionCameraPreset = normalized;
      if (controller) setThreeMissionCameraPreset(controller, normalized);
      else if (renderer) setThreeMissionWorldCamera(renderer, { preset: normalized });
    }
    this.updateThreeToolOverlay();
    this.updateMissionRenderDebug({ activeBackend: 'threeMission3d', threeMounted: Boolean(renderer), viewModel: this.missionRenderViewModel, renderer, parityWarnings: [] });
    this.refreshPanels();
    this.refreshMap();
  }

  threeCameraFocusTargetForSelectedGlider() {
    const viewModel = this.missionRenderViewModel ?? this.buildMissionWorldViewModelForScene();
    const glider = (viewModel?.gliders ?? []).find((candidate) => candidate.agentId === this.app.state.selectedAgentId) ?? viewModel?.gliders?.[0];
    return this.threeCameraTargetForRecord(glider);
  }

  threeCameraFocusTargetForRoute() {
    const viewModel = this.missionRenderViewModel ?? this.buildMissionWorldViewModelForScene();
    const routePoints = (viewModel?.routes ?? [])
      .filter((route) => !this.app.state.selectedAgentId || route.agentId === this.app.state.selectedAgentId)
      .flatMap((route) => route.points ?? route.cells ?? []);
    if (!routePoints.length) return this.threeCameraFocusTargetForSelectedGlider();
    const mean = routePoints.reduce((sum, point) => ({ x: sum.x + Number(point.x ?? point.col ?? 0), y: sum.y + Number(point.y ?? point.row ?? 0) }), { x: 0, y: 0 });
    return this.threeCameraTargetForRecord({ x: mean.x / routePoints.length, y: mean.y / routePoints.length });
  }

  threeCameraTargetForRecord(record) {
    if (!record || !this.missionRenderViewModel?.coordinateSystem) return { x: 0, y: 0, z: 0 };
    const world = gridCellToWorld(this.missionRenderViewModel.coordinateSystem, Number(record.x ?? 0), Number(record.y ?? 0), 0);
    return { x: world.x, y: Number(world.y ?? 0), z: world.z };
  }

  setThreeInteractionMode(mode) {
    const normalized = normalizeMissionWorldInteractionMode(mode);
    return this.activatePlanningTool(toolIdForInteractionMode(normalized), this.toolContextForAgent(this.app.state.selectedAgentId));
  }

  cancelThreeInteraction() {
    cancelThreeMissionInteraction(this.threeInteractionController);
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    const next = cancelMissionPlanningTool(this.ensureMissionPlanningToolState(), this.toolContextForAgent(this.app.state.selectedAgentId));
    this.app.state.ui.missionPlanningTool = next;
    this.app.state.ui.threeMissionInteractionMode = interactionModeForTool(next.activeToolId);
    this.app.state.ui.threeMissionInteraction.interactionMode = this.app.state.ui.threeMissionInteractionMode;
    this.app.state.ui.threeMissionInteraction.planningToolState = missionPlanningToolStateSummary(next);
    this.app.state.ui.threeMissionInteraction.dragPreview = null;
    this.app.state.ui.threeMissionInteraction.routePreview = null;
    this.app.state.ui.threeMissionInteraction.placementValidation = null;
    this.app.state.ui.threeMissionInteraction.deploymentSelectionActive = false;
    this.app.state.ui.threeMissionInteraction.waypointPlacementActive = false;
    setThreeMissionInteractionMode(this.threeInteractionController, this.app.state.ui.threeMissionInteractionMode);
    this.updateThreeToolOverlay();
    this.refreshPanels();
    this.refreshMap();
  }

  toggleThreeMissionLayer(layerId) {
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionLayers ??= {};
    this.app.state.ui.threeMissionInteractionMode ??= 'selectInspect';
    this.app.state.ui.threeMissionInteraction ??= { interactionMode: this.app.state.ui.threeMissionInteractionMode };
    this.app.state.ui.threeMissionLayers[layerId] = this.app.state.ui.threeMissionLayers[layerId] === false;
    if (this.threeMissionRenderer) setThreeMissionLayerVisibility(this.threeMissionRenderer, this.threeLayerVisibilityPatch());
    this.refreshPanels();
    this.refreshMap();
  }

  ensureWaterColumnUiState() {
    this.app.state.ui ??= {};
    const existing = this.app.state.ui.waterColumn ?? {};
    const config = this.missionRenderViewModel?.waterColumnConfig ?? this.currentWaterColumnConfig();
    const layers = config?.depthLayerIds ?? ['surface'];
    const activeFallback = config?.defaultPlanningLayerId ?? (layers.includes('thermocline') ? 'thermocline' : layers[0] ?? 'surface');
    const active = layers.includes(existing.activeDepthLayerId) ? existing.activeDepthLayerId : activeFallback;
    const hidden = Array.isArray(existing.hiddenLayerIds) ? existing.hiddenLayerIds.filter((id) => layers.includes(id) || id === 'integratedWaterColumn' || id === 'waterSurface') : [];
    const next = {
      verticalDisplayMode: existing.verticalDisplayMode === 'explodedLayers' ? 'explodedLayers' : (config?.defaultDisplayMode === 'explodedLayers' ? 'explodedLayers' : 'physicalDepth'),
      activeDepthLayerId: active,
      hiddenLayerIds: hidden,
      visibleLayerIds: Array.isArray(existing.visibleLayerIds) ? existing.visibleLayerIds.filter((id) => layers.includes(id) || id === 'integratedWaterColumn' || id === 'waterSurface') : null,
      globalOpacity: clampNumber(existing.globalOpacity, layers.length > 1 ? 0.32 : 0.26, 0.05, 0.72),
      verticalExaggeration: [1, 2, 4, 8].includes(Number(existing.verticalExaggeration)) ? Number(existing.verticalExaggeration) : 1,
      activeLayerEmphasis: clampNumber(existing.activeLayerEmphasis, 1.85, 1, 3.2),
      selectedScalarFieldId: existing.selectedScalarFieldId ?? 'sampleValue',
      scalarRenderMode: normalizeVolumeRenderMode(existing.scalarRenderMode ?? existing.volumeRenderMode),
      fieldDisplayMode: existing.fieldDisplayMode === 'allLayers' || existing.showFieldOnAllLayers === true ? 'allLayers' : 'activeLayerOnly',
      showFieldOnAllLayers: existing.fieldDisplayMode === 'allLayers' || existing.showFieldOnAllLayers === true,
      qualityProfile: normalizeThreeQualityProfile(existing.qualityProfile ?? this.app.state.ui.threeMissionQualityProfile ?? 'balanced'),
      currentDisplayMode: normalizeCurrentDisplayModeAlias(existing.currentDisplayMode ?? 'activeSlice'),
      currentLayerMode: existing.currentLayerMode ?? 'followSelectedGlider',
      currentVectorDensity: normalizeCurrentVectorDensity(existing.currentVectorDensity ?? 'balanced'),
      currentMagnitudeScale: clampNumber(existing.currentMagnitudeScale, 1.8, 0.25, 6),
      currentColorMode: ['speed', 'direction', 'depthLayer', 'assistOpposeRoute'].includes(existing.currentColorMode) ? existing.currentColorMode : 'speed',
      showContextCurrents: existing.showContextCurrents === true,
      selectedDiveProfileId: normalizeWaterColumnProfileId(existing.selectedDiveProfileId ?? this.selectedAgentPlanWaterColumnValue('diveProfileId') ?? config?.defaultDiveProfileId ?? config?.diveProfileId ?? 'surfaceOnly'),
      selectedTargetDepthLayerId: normalizeWaterColumnLayerId(existing.selectedTargetDepthLayerId ?? this.selectedAgentPlanWaterColumnValue('targetDepthLayerId') ?? config?.defaultTargetDepthLayerId ?? 'surface', active),
      maximumDiveDepthMeters: Number.isFinite(Number(existing.maximumDiveDepthMeters)) ? Number(existing.maximumDiveDepthMeters) : (Number.isFinite(Number(this.selectedAgentPlanWaterColumnValue('maximumDiveDepthMeters'))) ? Number(this.selectedAgentPlanWaterColumnValue('maximumDiveDepthMeters')) : null),
      cycleCount: Number.isFinite(Number(existing.cycleCount)) ? Number(existing.cycleCount) : (Number.isFinite(Number(this.selectedAgentPlanWaterColumnValue('cycleCount'))) ? Number(this.selectedAgentPlanWaterColumnValue('cycleCount')) : null),
      sampleIntervalSeconds: Number.isFinite(Number(existing.sampleIntervalSeconds)) ? Number(existing.sampleIntervalSeconds) : (Number.isFinite(Number(this.selectedAgentPlanWaterColumnValue('sampleIntervalSeconds'))) ? Number(this.selectedAgentPlanWaterColumnValue('sampleIntervalSeconds')) : null),
      samplingPhase: ['descent', 'ascent', 'both', 'profileDefault', 'disabled'].includes(existing.samplingPhase ?? this.selectedAgentPlanWaterColumnValue('samplingPhase')) ? (existing.samplingPhase ?? this.selectedAgentPlanWaterColumnValue('samplingPhase')) : 'profileDefault',
      userModified: existing.userModified === true,
      defaultDisplayModeApplied: existing.defaultDisplayModeApplied === true
    };
    this.app.state.ui.waterColumn = next;
    return next;
  }

  ensureContinuousMissionUiState() {
    this.app.state.ui ??= {};
    const waterColumn = this.ensureWaterColumnUiState();
    const normalized = normalizeContinuousMissionUiState({
      ...this.app.state,
      waypointSnapMode: this.app.state.ui.waypointSnapMode,
      waterColumn,
      volumeRenderMode: waterColumn.scalarRenderMode
    });
    const validation = validateContinuousMissionUiState(normalized);
    this.app.state.ui.continuousMission = normalized;
    this.app.state.ui.continuousMissionValidation = validation;
    this.continuousUiStateCreated = true;
    this.continuousUiStateValidated = validation.valid === true;
    globalThis.ANCHOR_CONTINUOUS_UI_DEBUG = {
      ...continuousMissionUiStateSummary(normalized),
      uiStateVersion: normalized.version,
      uiStateValid: validation.valid === true,
      uiStateWarnings: validation.warnings ?? normalized.warnings ?? [],
      uiStateErrors: validation.errors ?? [],
      continuousUiStateCreated: this.continuousUiStateCreated,
      continuousUiStateValidated: this.continuousUiStateValidated
    };
    return normalized;
  }

  publishContinuousMissionDebug(patch = {}) {
    const continuousUi = this.app?.state?.ui?.continuousMission ?? this.ensureContinuousMissionUiState();
    const validation = this.app?.state?.ui?.continuousMissionValidation ?? validateContinuousMissionUiState(continuousUi);
    const uiDebug = globalThis.ANCHOR_CONTINUOUS_UI_DEBUG ?? {};
    const consoleText = this.app?.elements?.consoleRoot?.textContent ?? '';
    const planningControlsVisible = consoleText.includes('Planning Tools') && consoleText.includes('Waypoint Placement');
    const terrainAuthority = this.missionRenderViewModel?.terrainAuthority ?? this.app?.state?.level?.terrainAuthority ?? null;
    const signedTerrain = this.app?.state?.level?.signedTerrainSurface ?? null;
    const rendererSummary = patch.rendererSummary ?? null;
    const terrainDigest = terrainAuthority?.terrainSourceDigest ?? signedTerrain?.digest ?? rendererSummary?.terrainSourceDigest ?? null;
    const debug = {
      type: 'anchor.continuous-mission.planning-ui-debug',
      version: 'three-r1-2a-3-1',
      uiStateVersion: continuousUi.version,
      uiStateValid: validation.valid === true,
      uiStateWarnings: validation.warnings ?? continuousUi.warnings ?? [],
      uiStateErrors: validation.errors ?? [],
      coordinateProfileId: continuousUi.coordinateProfileId,
      waypointSnapMode: continuousUi.waypointSnapMode,
      availableWaypointSnapModes: continuousUi.availableWaypointSnapModes,
      fieldSamplingProfileId: continuousUi.fieldSamplingProfileId,
      volumeRenderProfileId: continuousUi.volumeRenderProfileId,
      volumeRenderMode: continuousUi.volumeRenderMode,
      availableVolumeRenderModes: continuousUi.availableVolumeRenderModes,
      volumeFallbackUsed: continuousUi.volumeRenderMode === 'volumetricCloud',
      activeDepthLayerId: continuousUi.activeDepthLayerId,
      verticalDisplayMode: continuousUi.verticalDisplayMode,
      selectedDiveProfileId: continuousUi.selectedDiveProfileId,
      selectedTargetDepthLayerId: continuousUi.selectedTargetDepthLayerId,
      continuousPlacementEnabled: continuousUi.continuousPlacementEnabled === true,
      volumetricFieldEnabled: continuousUi.volumetricFieldEnabled === true,
      depthPlanningEnabled: continuousUi.depthPlanningEnabled === true,
      currentMissionPhase: this.app?.state?.mode ?? null,
      scenarioStartVisible: false,
      planningWorkspaceVisible: this.app?.state?.mode === 'planning',
      planningControlsVisible,
      planningInteractionEnabled: this.app?.state?.mode === 'planning' && Boolean(this.threeInteractionController),
      overlayRenderCount: Number(this.hud?.overlayRenderCount ?? uiDebug.overlayRenderCount ?? 0),
      overlayControlBindCount: Number(this.hud?.overlayControlBindCount ?? uiDebug.overlayControlBindCount ?? 0),
      overlayControlDispatchCount: Number(this.hud?.overlayControlDispatchCount ?? uiDebug.overlayControlDispatchCount ?? 0),
      duplicateOverlayControlDispatchCount: Number(this.hud?.duplicateOverlayControlDispatchCount ?? uiDebug.duplicateOverlayControlDispatchCount ?? 0),
      overlayRuntimeErrorCount: Number(this.hud?.overlayRuntimeErrorCount ?? uiDebug.overlayRuntimeErrorCount ?? 0),
      overlayFirstRenderCompleted: this.hud?.overlayFirstRenderCompleted === true || uiDebug.overlayFirstRenderCompleted === true,
      continuousUiStateCreated: this.continuousUiStateCreated === true,
      continuousUiStateValidated: this.continuousUiStateValidated === true,
      planningSceneCreateCompleted: this.planningSceneCreateCompleted === true,
      usesContinuousWaypoints: true,
      usesCanonical3DDiveState: true,
      usesArbitraryXYZRoutePlanning: false,
      rendererOwnsPlanning: false,
      rendererOwnsSimulation: false,
      rendererOwnsScoring: false,
      terrainAuthorityMode: terrainAuthority?.terrainAuthorityMode ?? (signedTerrain ? 'signedElevationV1' : 'legacyGridCompatibility'),
      terrainSourceDigest: terrainDigest,
      landWaterSourceDigest: terrainAuthority?.landWaterSourceDigest ?? signedTerrain?.landWaterSourceDigest ?? terrainDigest,
      coastlineSourceDigest: terrainAuthority?.coastlineSourceDigest ?? signedTerrain?.coastlineSourceDigest ?? terrainDigest,
      bottomBoundarySourceDigest: terrainAuthority?.bottomBoundarySourceDigest ?? signedTerrain?.bottomBoundarySourceDigest ?? terrainDigest,
      usesSignedTerrainAuthority: terrainAuthority?.usesSignedTerrainAuthority === true || Boolean(signedTerrain),
      usesLegacyLandTileGenerator: terrainAuthority?.usesLegacyLandTileGenerator === true ? true : false,
      usesPerCellLandMeshes: terrainAuthority?.usesPerCellLandMeshes === true ? true : false,
      landTileMeshCount: Number(terrainAuthority?.landTileMeshCount ?? 0),
      routeUsesContinuousMeters: continuousUi.coordinateProfileId === 'continuousGridV1',
      executionUsesContinuousMeters: continuousUi.coordinateProfileId === 'continuousGridV1',
      executionSnapsToPlanningCell: continuousUi.coordinateProfileId !== 'continuousGridV1',
      analysisLatticeVisible: this.app?.state?.ui?.threeMissionLayers?.analysisLattice === true,
      terrainVertexCount: Number(rendererSummary?.terrainVertexCount ?? 0),
      terrainTriangleCount: Number(rendererSummary?.terrainTriangleCount ?? 0),
      terrainDrawCallCount: Number(rendererSummary?.terrainDrawCallEstimate ?? 0),
      scalarSourceSampleCount: Number(this.app?.state?.level?.resolutionProfile?.scienceGrid?.columns ?? this.app?.state?.level?.regionalFields?.grids?.scienceGrid?.columns ?? 0) * Number(this.app?.state?.level?.resolutionProfile?.scienceGrid?.rows ?? this.app?.state?.level?.regionalFields?.grids?.scienceGrid?.rows ?? 0),
      scalarDisplayPixelCount: Number(rendererSummary?.volumetricScalarFieldSummary?.texturePixelCount ?? rendererSummary?.scalarFieldCellCount ?? 0),
      currentSourceSampleCount: Number(this.app?.state?.level?.resolutionProfile?.currentGrid?.columns ?? this.app?.state?.level?.regionalFields?.grids?.currentGrid?.columns ?? 0) * Number(this.app?.state?.level?.resolutionProfile?.currentGrid?.rows ?? this.app?.state?.level?.regionalFields?.grids?.currentGrid?.rows ?? 0),
      currentGlyphCount: Number(rendererSummary?.currentGlyphCount ?? 0),
      rendererSummary: patch.rendererSummary ?? null,
      waterColumnDebug: patch.waterColumnDebug ?? null,
      predictedDiveAvailable: patch.plannedDiveDebug?.predictedDiveAvailable === true,
      predictedDiveSource: patch.plannedDiveDebug?.predictedDiveSource ?? null,
      predictedDiveModelVersion: patch.plannedDiveDebug?.predictedDiveModelVersion ?? null,
      selectedSegmentId: patch.plannedDiveDebug?.selectedSegmentId ?? null,
      selectedSegmentStartWaypointId: patch.plannedDiveDebug?.selectedSegmentStartWaypointId ?? null,
      selectedSegmentTargetWaypointId: patch.plannedDiveDebug?.selectedSegmentTargetWaypointId ?? null,
      selectedSegmentDiveProfileId: patch.plannedDiveDebug?.selectedSegmentDiveProfileId ?? null,
      selectedSegmentTargetLayerId: patch.plannedDiveDebug?.selectedSegmentTargetLayerId ?? null,
      selectedSegmentRequestedDepth: patch.plannedDiveDebug?.selectedSegmentRequestedDepth ?? null,
      selectedSegmentAchievableDepth: patch.plannedDiveDebug?.selectedSegmentAchievableDepth ?? null,
      selectedSegmentCycleCount: patch.plannedDiveDebug?.selectedSegmentCycleCount ?? null,
      selectedSegmentLimitingFactor: patch.plannedDiveDebug?.selectedSegmentLimitingFactor ?? null,
      surfaceIntentPointCount: patch.plannedDiveDebug?.surfaceIntentPointCount ?? 0,
      predictedDivePointCount: patch.plannedDiveDebug?.predictedDivePointCount ?? 0,
      predictedCurrentPathPointCount: patch.plannedDiveDebug?.predictedCurrentPathPointCount ?? 0,
      predictedSampleCount: patch.plannedDiveDebug?.predictedSampleCount ?? 0,
      scienceTargetIds: patch.plannedDiveDebug?.scienceTargetIds ?? [],
      targetCoverageStatuses: patch.plannedDiveDebug?.targetCoverageStatuses ?? [],
      predictedLayerCrossingCount: patch.plannedDiveDebug?.predictedLayerCrossingCount ?? 0,
      predictedBottomTurnCount: patch.plannedDiveDebug?.predictedBottomTurnCount ?? 0,
      predictedSurfacingPosition: patch.plannedDiveDebug?.predictedSurfacingPosition ?? null,
      predictedSurfacingOffset: patch.plannedDiveDebug?.predictedSurfacingOffset ?? null,
      predictedMinimumBottomClearance: patch.plannedDiveDebug?.predictedMinimumBottomClearance ?? null,
      predictedTerrainLimited: patch.plannedDiveDebug?.predictedTerrainLimited === true,
      plannedDiveThreeObjectCount: patch.plannedDiveDebug?.plannedDiveThreeObjectCount ?? 0,
      plannedSampleThreeObjectCount: patch.plannedDiveDebug?.plannedSampleThreeObjectCount ?? 0,
      predictionCanonicalParityStatus: patch.plannedDiveDebug?.predictionCanonicalParityStatus ?? null,
      physicalExplodedPredictionDigestMatch: patch.plannedDiveDebug?.physicalExplodedPredictionDigestMatch === true,
      bathymetryDemoPathSource: 'fixtureExplicitDepthWaypoints',
      bathymetryDemoUsesCanonicalDiveModel: false,
      rendererOwnsPrediction: false,
      usesArbitraryXYZWaypoints: false
    };
    globalThis.ANCHOR_CONTINUOUS_MISSION_DEBUG = debug;
    globalThis.ANCHOR_OPERATIONAL_DOMAIN_DEBUG = {
      version: 'world-r1-1-operational-domain-debug',
      operationalDomainId: this.app?.state?.level?.operationalDomain?.domainId ?? this.app?.state?.level?.world?.operationalDomain?.domainId ?? null,
      resolutionProfileId: this.app?.state?.level?.resolutionProfile?.profileId ?? this.app?.state?.level?.world?.resolutionProfile?.profileId ?? null,
      terrainAuthorityMode: debug.terrainAuthorityMode,
      terrainSourceDigest: debug.terrainSourceDigest,
      landWaterSourceDigest: debug.landWaterSourceDigest,
      coastlineSourceDigest: debug.coastlineSourceDigest,
      bottomBoundarySourceDigest: debug.bottomBoundarySourceDigest,
      usesSignedTerrainAuthority: debug.usesSignedTerrainAuthority,
      usesLegacyLandTileGenerator: debug.usesLegacyLandTileGenerator,
      usesPerCellLandMeshes: debug.usesPerCellLandMeshes,
      landTileMeshCount: debug.landTileMeshCount,
      routeUsesContinuousMeters: debug.routeUsesContinuousMeters,
      executionUsesContinuousMeters: debug.executionUsesContinuousMeters,
      executionSnapsToPlanningCell: debug.executionSnapsToPlanningCell,
      analysisLatticeVisible: debug.analysisLatticeVisible,
      terrainVertexCount: debug.terrainVertexCount,
      terrainTriangleCount: debug.terrainTriangleCount,
      terrainDrawCallCount: debug.terrainDrawCallCount,
      scalarSourceSampleCount: debug.scalarSourceSampleCount,
      scalarDisplayPixelCount: debug.scalarDisplayPixelCount,
      currentSourceSampleCount: debug.currentSourceSampleCount,
      currentGlyphCount: debug.currentGlyphCount
    };
    globalThis.ANCHOR_CONTINUOUS_UI_DEBUG = {
      ...uiDebug,
      ...continuousMissionUiStateSummary(continuousUi),
      uiStateVersion: continuousUi.version,
      uiStateValid: validation.valid === true,
      uiStateWarnings: validation.warnings ?? continuousUi.warnings ?? [],
      uiStateErrors: validation.errors ?? [],
      planningControlsVisible,
      overlayRuntimeErrorCount: debug.overlayRuntimeErrorCount,
      overlayFirstRenderCompleted: debug.overlayFirstRenderCompleted
    };
    return debug;
  }

  currentWaterColumnConfig() {
    return this.app.state.level?.world?.waterColumnConfig
      ?? this.app.state.mission?.world?.waterColumnConfig
      ?? this.app.state.mission?.waterColumnConfig
      ?? null;
  }

  applyInitialWaterColumnSceneDefaults(phase = 'planning') {
    this.app.state.ui ??= {};
    const config = this.currentWaterColumnConfig();
    const layers = config?.depthLayerIds ?? ['surface'];
    const missionKey = `${this.app.state.currentScenario?.instanceId ?? this.app.state.level?.instanceId ?? 'unknown'}:${this.app.state.currentScenario?.missionId ?? this.app.state.mission?.missionId ?? 'unknown'}:${phase}`;
    const existing = this.app.state.ui.waterColumn ?? null;
    if (existing?.userModified === true && this.app.state.ui.waterColumnDefaultsAppliedForMission === missionKey) return;
    const legacy = config?.source === 'importedLegacySurfaceFallback' || config?.compatibility?.importedLegacySurfaceFallback === true || layers.length <= 1;
    const activeDepthLayerId = legacy ? 'surface' : (config?.defaultPlanningLayerId ?? (layers.includes('thermocline') ? 'thermocline' : layers[0] ?? 'surface'));
    this.app.state.ui.waterColumn = {
      ...(existing ?? {}),
      verticalDisplayMode: legacy ? 'physicalDepth' : 'explodedLayers',
      activeDepthLayerId,
      hiddenLayerIds: [],
      visibleLayerIds: null,
      globalOpacity: legacy ? 0.26 : 0.32,
      activeLayerEmphasis: 1.9,
      selectedScalarFieldId: 'sampleValue',
      scalarRenderMode: normalizeVolumeRenderMode(existing?.scalarRenderMode ?? 'smoothedSlices'),
      fieldDisplayMode: existing?.fieldDisplayMode === 'allLayers' || existing?.showFieldOnAllLayers === true ? 'allLayers' : 'activeLayerOnly',
      showFieldOnAllLayers: existing?.fieldDisplayMode === 'allLayers' || existing?.showFieldOnAllLayers === true,
      qualityProfile: normalizeThreeQualityProfile(existing?.qualityProfile ?? this.app.state.ui.threeMissionQualityProfile ?? 'balanced'),
      currentDisplayMode: normalizeCurrentDisplayModeAlias(existing?.currentDisplayMode ?? 'activeSlice'),
      currentLayerMode: existing?.currentLayerMode ?? 'followSelectedGlider',
      currentVectorDensity: normalizeCurrentVectorDensity(existing?.currentVectorDensity ?? 'balanced'),
      currentMagnitudeScale: clampNumber(existing?.currentMagnitudeScale, 1.8, 0.25, 6),
      currentColorMode: ['speed', 'direction', 'depthLayer', 'assistOpposeRoute'].includes(existing?.currentColorMode) ? existing.currentColorMode : 'speed',
      showContextCurrents: existing?.showContextCurrents === true,
      selectedDiveProfileId: config?.defaultDiveProfileId ?? config?.diveProfileId ?? 'surfaceOnly',
      selectedTargetDepthLayerId: config?.defaultTargetDepthLayerId ?? 'surface',
      maximumDiveDepthMeters: null,
      cycleCount: null,
      sampleIntervalSeconds: null,
      verticalExaggeration: 1,
      userModified: false,
      defaultDisplayModeApplied: true
    };
    const currentCameraPreset = this.app.state.ui.threeMissionCameraPreset;
    const cameraPresetLooksDefault = !currentCameraPreset || ['obliqueMission', 'obliqueWaterColumn'].includes(currentCameraPreset);
    if (cameraPresetLooksDefault && existing?.userModified !== true) {
      this.app.state.ui.threeMissionCameraPreset = legacy ? 'tacticalTopDown' : (config?.defaultPlanningCameraPresetId ?? 'obliqueWaterColumn');
    }
    this.app.state.ui.waterColumnDefaultsAppliedForMission = missionKey;
  }

  selectedAgentPlanWaterColumnValue(key) {
    const agentPlan = (this.app.state.plan?.agentPlans ?? []).find((candidate) => candidate.agentId === this.app.state.selectedAgentId);
    const selected = this.app.state.ui?.selectedWaypoint;
    const waypoint = selected?.agentId && selected.agentId === this.app.state.selectedAgentId
      ? agentPlan?.waypoints?.[Number(selected.index)]
      : null;
    return waypoint?.[key] ?? agentPlan?.[key] ?? null;
  }

  setWaterColumnDisplayMode(mode) {
    const ui = this.ensureWaterColumnUiState();
    ui.verticalDisplayMode = mode === 'explodedLayers' ? 'explodedLayers' : 'physicalDepth';
    ui.userModified = true;
    this.refreshPanels();
    this.refreshMap();
  }

  setWaterColumnActiveLayer(layerId) {
    const ui = this.ensureWaterColumnUiState();
    const layers = this.missionRenderViewModel?.waterColumnConfig?.depthLayerIds ?? ['surface'];
    const normalized = normalizeWaterColumnLayerId(layerId, ui.activeDepthLayerId ?? layers[0] ?? 'surface');
    ui.activeDepthLayerId = layers.includes(normalized) ? normalized : layers[0] ?? 'surface';
    ui.selectedTargetDepthLayerId = ui.activeDepthLayerId;
    ui.userModified = true;
    this.refreshPanels();
    this.refreshMap();
  }

  toggleWaterColumnLayer(layerId) {
    const ui = this.ensureWaterColumnUiState();
    const id = String(layerId ?? '').trim();
    if (!id) return;
    const hidden = new Set(ui.hiddenLayerIds ?? []);
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    ui.hiddenLayerIds = [...hidden];
    ui.visibleLayerIds = null;
    ui.userModified = true;
    this.refreshPanels();
    this.refreshMap();
  }

  setWaterColumnLayerVisibilityMode(mode) {
    const ui = this.ensureWaterColumnUiState();
    const layers = this.currentWaterColumnConfig()?.depthLayerIds ?? this.missionRenderViewModel?.waterColumnConfig?.depthLayerIds ?? ['surface'];
    if (mode === 'isolateActive') {
      ui.visibleLayerIds = [ui.activeDepthLayerId ?? layers[0] ?? 'surface'];
      ui.hiddenLayerIds = [];
    } else if (mode === 'hideContext') {
      const active = ui.activeDepthLayerId ?? layers[0] ?? 'surface';
      ui.visibleLayerIds = null;
      ui.hiddenLayerIds = layers.filter((id) => id !== active);
    } else {
      ui.visibleLayerIds = null;
      ui.hiddenLayerIds = [];
    }
    ui.userModified = true;
    this.refreshPanels();
    this.refreshMap();
  }

  adjustWaterColumnOpacity(delta) {
    const ui = this.ensureWaterColumnUiState();
    ui.globalOpacity = clampNumber(Number(ui.globalOpacity ?? 0.26) + Number(delta ?? 0), 0.26, 0.05, 0.72);
    ui.userModified = true;
    this.refreshPanels();
    this.refreshMap();
  }

  setWaterColumnScalarField(fieldId) {
    const ui = this.ensureWaterColumnUiState();
    ui.selectedScalarFieldId = ['sampleValue', 'A_global_depth', 'A_global_topdown'].includes(fieldId) ? fieldId : 'sampleValue';
    ui.userModified = true;
    this.refreshPanels();
    this.refreshMap();
  }

  setWaterColumnCurrentMode(mode) {
    const ui = this.ensureWaterColumnUiState();
    ui.currentDisplayMode = normalizeCurrentDisplayModeAlias(mode);
    ui.userModified = true;
    this.ensureContinuousMissionUiState();
    this.refreshPanels();
    this.refreshMap();
  }

  setWaterColumnCurrentLayerMode(mode) {
    const ui = this.ensureWaterColumnUiState();
    ui.currentLayerMode = mode === 'manualActiveLayer' ? 'manualActiveLayer' : 'followSelectedGlider';
    ui.userModified = true;
    this.ensureContinuousMissionUiState();
    this.refreshPanels();
    this.refreshMap();
  }

  setWaterColumnCurrentDensity(density) {
    const ui = this.ensureWaterColumnUiState();
    ui.currentVectorDensity = normalizeCurrentVectorDensity(density);
    ui.userModified = true;
    this.ensureContinuousMissionUiState();
    this.refreshPanels();
    this.refreshMap();
  }

  setWaterColumnCurrentMagnitudeScale(scale) {
    const ui = this.ensureWaterColumnUiState();
    ui.currentMagnitudeScale = clampNumber(scale, 1.8, 0.25, 6);
    ui.userModified = true;
    this.ensureContinuousMissionUiState();
    this.refreshPanels();
    this.refreshMap();
  }

  setWaterColumnCurrentColorMode(mode) {
    const ui = this.ensureWaterColumnUiState();
    ui.currentColorMode = ['speed', 'direction', 'depthLayer', 'assistOpposeRoute'].includes(mode) ? mode : 'speed';
    ui.userModified = true;
    this.ensureContinuousMissionUiState();
    this.refreshPanels();
    this.refreshMap();
  }

  toggleWaterColumnContextCurrents() {
    const ui = this.ensureWaterColumnUiState();
    ui.showContextCurrents = ui.showContextCurrents !== true;
    ui.userModified = true;
    this.ensureContinuousMissionUiState();
    this.refreshPanels();
    this.refreshMap();
  }

  setWaterColumnFieldDisplayMode(mode) {
    const ui = this.ensureWaterColumnUiState();
    ui.fieldDisplayMode = mode === 'allLayers' ? 'allLayers' : 'activeLayerOnly';
    ui.showFieldOnAllLayers = ui.fieldDisplayMode === 'allLayers';
    ui.userModified = true;
    this.ensureContinuousMissionUiState();
    this.refreshPanels();
    this.refreshMap();
  }

  setThreeQualityProfile(profile) {
    const ui = this.ensureWaterColumnUiState();
    ui.qualityProfile = normalizeThreeQualityProfile(profile);
    this.app.state.ui.threeMissionQualityProfile = ui.qualityProfile;
    ui.userModified = true;
    this.ensureContinuousMissionUiState();
    this.refreshPanels();
    this.refreshMap();
  }

  setWaterColumnVolumeRenderMode(mode) {
    const ui = this.ensureWaterColumnUiState();
    ui.scalarRenderMode = normalizeVolumeRenderMode(mode);
    ui.volumeRenderMode = ui.scalarRenderMode;
    ui.userModified = true;
    this.ensureContinuousMissionUiState();
    this.refreshPanels();
    this.refreshMap();
    this.app.toast?.(`Field rendering: ${labelForVolumeRenderMode(ui.scalarRenderMode)}.`, 'info');
  }

  setWaterColumnDiveProfile(profileId) {
    const ui = this.ensureWaterColumnUiState();
    ui.selectedDiveProfileId = normalizeWaterColumnProfileId(profileId);
    ui.userModified = true;
    this.applyWaterColumnPlanMetadata({ diveProfileId: ui.selectedDiveProfileId });
  }

  setWaterColumnTargetLayer(layerId) {
    const ui = this.ensureWaterColumnUiState();
    const layers = this.missionRenderViewModel?.waterColumnConfig?.depthLayerIds ?? ['surface'];
    const normalized = normalizeWaterColumnLayerId(layerId, ui.activeDepthLayerId ?? layers[0] ?? 'surface');
    ui.selectedTargetDepthLayerId = layers.includes(normalized) ? normalized : layers[0] ?? 'surface';
    ui.userModified = true;
    ui.activeDepthLayerId = ui.selectedTargetDepthLayerId;
    this.applyWaterColumnPlanMetadata({ targetDepthLayerId: ui.selectedTargetDepthLayerId, depthLayerId: ui.selectedTargetDepthLayerId });
  }

  setWaterColumnMaximumDepth(depth) {
    const ui = this.ensureWaterColumnUiState();
    const value = Number(depth);
    if (!Number.isFinite(value) || value < 0) return;
    ui.maximumDiveDepthMeters = value;
    ui.userModified = true;
    this.applyWaterColumnPlanMetadata({ maximumDiveDepthMeters: value, maximumDepthMeters: value });
  }

  setWaterColumnCycleCount(count) {
    const ui = this.ensureWaterColumnUiState();
    const value = Math.max(0, Math.round(Number(count)));
    if (!Number.isFinite(value)) return;
    ui.cycleCount = value;
    ui.userModified = true;
    this.applyWaterColumnPlanMetadata({ cycleCount: value });
  }

  setWaterColumnSampleInterval(seconds) {
    const ui = this.ensureWaterColumnUiState();
    const value = Math.max(30, Math.round(Number(seconds)));
    if (!Number.isFinite(value)) return;
    ui.sampleIntervalSeconds = value;
    ui.userModified = true;
    this.applyWaterColumnPlanMetadata({ sampleIntervalSeconds: value });
  }

  setWaterColumnSamplingPhase(phase) {
    const ui = this.ensureWaterColumnUiState();
    const normalized = ['descent', 'ascent', 'both', 'profileDefault', 'disabled'].includes(String(phase)) ? String(phase) : 'profileDefault';
    ui.samplingPhase = normalized;
    ui.userModified = true;
    this.applyWaterColumnPlanMetadata({ samplingPhase: normalized });
  }

  setWaterColumnVerticalExaggeration(value) {
    const ui = this.ensureWaterColumnUiState();
    const numeric = Number(value);
    ui.verticalExaggeration = [1, 2, 4, 8].includes(numeric) ? numeric : 1;
    ui.userModified = true;
    this.ensureContinuousMissionUiState();
    this.refreshPanels();
    this.refreshMap();
  }

  resetWaterColumnSegmentProfile() {
    const ui = this.ensureWaterColumnUiState();
    const config = this.currentWaterColumnConfig() ?? {};
    const layers = config.depthLayerIds ?? ['surface'];
    ui.selectedDiveProfileId = config.defaultDiveProfileId ?? config.diveProfileId ?? 'surfaceOnly';
    ui.selectedTargetDepthLayerId = config.defaultTargetDepthLayerId ?? layers[0] ?? 'surface';
    ui.maximumDiveDepthMeters = null;
    ui.cycleCount = null;
    ui.sampleIntervalSeconds = null;
    ui.userModified = true;
    this.applyWaterColumnPlanMetadata({
      diveProfileId: ui.selectedDiveProfileId,
      targetDepthLayerId: ui.selectedTargetDepthLayerId,
      depthLayerId: ui.selectedTargetDepthLayerId,
      maximumDiveDepthMeters: undefined,
      maximumDepthMeters: undefined,
      cycleCount: undefined,
      sampleIntervalSeconds: undefined,
      samplingPhase: undefined
    });
  }

  applyWaterColumnProfileToThisSegment() {
    this.applyWaterColumnPlanMetadata(this.currentWaterColumnPlanPatch(), { scope: 'selectedSegment' });
  }

  setWaterColumnProfileAsGliderDefault() {
    this.applyWaterColumnPlanMetadata(this.currentWaterColumnPlanPatch(), { scope: 'gliderDefault' });
  }

  resetWaterColumnSegmentToGliderDefault() {
    const agentId = this.app.state.selectedAgentId;
    const agentPlan = getAgentPlan(this.app.state.plan, agentId);
    if (!agentPlan) return;
    const patch = {};
    for (const key of ['diveProfileId', 'targetDepthLayerId', 'depthLayerId', 'maximumDiveDepthMeters', 'maximumDepthMeters', 'cycleCount', 'sampleIntervalSeconds', 'samplingPhase']) {
      if (agentPlan[key] !== undefined) patch[key] = agentPlan[key];
    }
    this.applyWaterColumnPlanMetadata(patch, { scope: 'selectedSegment' });
  }

  applyWaterColumnProfileToRemainingSegments() {
    const agentId = this.app.state.selectedAgentId;
    if (!agentId || !this.app.state.plan) return;
    const agentPlan = getAgentPlan(this.app.state.plan, agentId);
    const selected = this.app.state.ui?.selectedWaypoint;
    const selectedIndex = selected?.agentId === agentId && Number.isInteger(Number(selected.index))
      ? Number(selected.index)
      : 0;
    const ui = this.ensureWaterColumnUiState();
    const patch = this.currentWaterColumnPlanPatch(ui);
    for (let index = Math.max(0, selectedIndex); index < (agentPlan.waypoints ?? []).length; index += 1) {
      updateWaypoint(this.app.state.plan, agentId, index, patch);
    }
    this.afterPlanChanged(agentId, { selectedIndex });
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
  }

  currentWaterColumnPlanPatch(ui = this.ensureWaterColumnUiState()) {
    const patch = {
      diveProfileId: ui.selectedDiveProfileId,
      targetDepthLayerId: ui.selectedTargetDepthLayerId,
      depthLayerId: ui.selectedTargetDepthLayerId
    };
    if (Number.isFinite(Number(ui.maximumDiveDepthMeters))) {
      patch.maximumDiveDepthMeters = Number(ui.maximumDiveDepthMeters);
      patch.maximumDepthMeters = Number(ui.maximumDiveDepthMeters);
    }
    if (Number.isFinite(Number(ui.cycleCount))) patch.cycleCount = Math.max(0, Math.round(Number(ui.cycleCount)));
    if (Number.isFinite(Number(ui.sampleIntervalSeconds))) patch.sampleIntervalSeconds = Math.max(30, Math.round(Number(ui.sampleIntervalSeconds)));
    if (ui.samplingPhase) patch.samplingPhase = ui.samplingPhase;
    return patch;
  }

  applyWaterColumnPlanMetadata(patch = {}, options = {}) {
    const agentId = this.app.state.selectedAgentId;
    if (!agentId || !this.app.state.plan) return;
    const selected = this.app.state.ui?.selectedWaypoint;
    let selectedIndex = null;
    const agentPlan = getAgentPlan(this.app.state.plan, agentId);
    const scope = options.scope ?? 'selectedSegment';
    if (scope === 'gliderDefault') {
      Object.assign(agentPlan, patch);
    } else if (selected?.agentId === agentId && Number.isInteger(Number(selected.index))) {
      selectedIndex = Number(selected.index);
      updateWaypoint(this.app.state.plan, agentId, selectedIndex, patch);
      this.app.state.ui.selectedWaypoint = { agentId, index: selectedIndex };
    } else {
      Object.assign(agentPlan, patch);
    }
    this.afterPlanChanged(agentId, { selectedIndex });
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
  }

  ensureThreeMissionContainer() {
    if (this.threeMissionContainer?.isConnected) return this.threeMissionContainer;
    const host = this.app?.elements?.viewportShell ?? this.app?.elements?.gameContainer ?? globalThis.document?.getElementById?.('viewport-shell');
    if (!host?.appendChild) {
      this.updateThreeRendererLifecycle({ state: 'deferred', refreshDeferredReason: 'missingRendererHost' });
      return null;
    }
    const container = globalThis.document.createElement('div');
    container.className = 'three-mission-world-host';
    container.dataset.rendererBackend = 'threeMission3d';
    container.setAttribute('aria-label', 'Three.js Bathymetric 3D mission renderer');
    host.appendChild(container);
    this.threeMissionContainer = container;
    this.updateThreeRendererLifecycle({ state: 'mounted', mountCompleted: true, refreshDeferredReason: null });
    return container;
  }

  ensureThreeMissionRenderer() {
    const container = this.ensureThreeMissionContainer();
    if (!container) return null;
    container.hidden = false;
    try {
      if (!this.threeMissionRenderer) {
        this.updateThreeRendererLifecycle({ state: 'initializing', refreshDeferredReason: null });
        this.threeMissionRenderer = createThreeMissionWorldRenderer(container, {
          camera: { preset: this.app.state.ui?.threeMissionCameraPreset ?? 'obliqueMission' },
          layerVisibility: this.threeLayerVisibilityPatch()
        });
        registerThreeMissionSceneResource(this.threeSceneLifecycle, 'renderer', this.threeMissionRenderer);
        registerThreeMissionSceneResource(this.threeSceneLifecycle, 'cameraController', this.threeMissionRenderer.cameraController);
        registerThreeMissionSceneResource(this.threeSceneLifecycle, 'canvas', this.threeMissionRenderer.renderer?.domElement);
      }
      this.ensureThreeInteractionController();
      const rect = container.getBoundingClientRect?.();
      resizeThreeMissionWorldRenderer(this.threeMissionRenderer, rect?.width ?? container.clientWidth, rect?.height ?? container.clientHeight);
      this.updateThreeRendererLifecycle({ state: 'ready', mountCompleted: true, rendererReady: true, refreshDeferredReason: null, resizeSequence: this.threeMissionRenderer?.lastSize?.resizeSequence ?? this.threeRendererLifecycle?.resizeSequence ?? 0 });
      return this.threeMissionRenderer;
    } catch (error) {
      this.recordThreeRendererRuntimeError(error, 'ensureThreeMissionRenderer');
      return null;
    }
  }

  updateThreeRendererLifecycle(patch = {}) {
    this.threeRendererLifecycle = {
      state: patch.state ?? this.threeRendererLifecycle?.state ?? 'idle',
      mountCompleted: patch.mountCompleted ?? this.threeRendererLifecycle?.mountCompleted ?? false,
      firstRefreshCompleted: patch.firstRefreshCompleted ?? this.threeRendererLifecycle?.firstRefreshCompleted ?? false,
      refreshDeferredReason: patch.refreshDeferredReason ?? this.threeRendererLifecycle?.refreshDeferredReason ?? null,
      runtimeErrorCount: patch.runtimeErrorCount ?? this.threeRendererLifecycle?.runtimeErrorCount ?? 0,
      resizeSequence: patch.resizeSequence ?? this.threeRendererLifecycle?.resizeSequence ?? 0,
      rendererReady: patch.rendererReady ?? this.threeRendererLifecycle?.rendererReady ?? false,
      lastError: patch.lastError ?? this.threeRendererLifecycle?.lastError ?? null
    };
    return this.threeRendererLifecycle;
  }

  recordThreeRendererRuntimeError(error, phase = 'unknown') {
    const message = String(error?.message ?? error ?? 'Unknown Three renderer error.');
    this.updateThreeRendererLifecycle({
      state: 'error',
      rendererReady: false,
      runtimeErrorCount: Number(this.threeRendererLifecycle?.runtimeErrorCount ?? 0) + 1,
      lastError: { phase, message }
    });
    this.app?.toast?.('Three renderer error: ' + message, 'error');
  }

  hideThreeMissionRenderer() {
    this.disableThreeInteractionSilently();
    if (this.threeMissionContainer) this.threeMissionContainer.hidden = true;
  }

  disableThreeInteractionSilently() {
    if (!this.threeInteractionController) return;
    this.threeInteractionController.enabled = false;
    this.threeInteractionController.pointerDown = null;
    this.threeInteractionController.dragState = null;
    this.threeInteractionController.cameraGestureActive = false;
    this.threeInteractionController.pointerCaptured = false;
  }

  disposeThreeMissionRenderer() {
    disposeThreeMissionInteractionController(this.threeInteractionController);
    disposeMissionWorkspaceThreeInteractionBridge(this.threeInteractionBridge);
    this.threeInteractionController = null;
    this.threeInteractionBridge = null;
    disposeThreeMissionWorldRenderer(this.threeMissionRenderer);
    this.threeMissionRenderer = null;
    this.threeMissionContainer?.remove?.();
    this.threeMissionContainer = null;
    globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG = inactiveThreePerformanceDebugPayload();
  }

  ensureThreeInteractionController() {
    if (!this.threeMissionRenderer?.renderer?.domElement) return null;
    if (!this.threeInteractionBridge || this.threeInteractionBridge.disposed) {
      this.threeInteractionBridge = createMissionWorkspaceThreeInteractionBridge(this);
    }
    if (!this.threeInteractionController || this.threeInteractionController.disposed) {
      this.threeInteractionController = createThreeMissionInteractionController({
        renderer: this.threeMissionRenderer,
        camera: this.threeMissionRenderer.camera,
        domElement: this.threeMissionRenderer.renderer.domElement,
        getViewModel: () => this.missionRenderViewModel,
        emitIntent: (intent) => handleMissionWorldInteractionIntent(this.threeInteractionBridge, intent),
        options: { interactionMode: this.app.state.ui?.threeMissionInteractionMode ?? 'selectInspect', cameraController: this.threeMissionRenderer.cameraController }
      });
      registerThreeMissionSceneResource(this.threeSceneLifecycle, 'interactionController', this.threeInteractionController);
    }
    setThreeMissionInteractionEnabled(this.threeInteractionController, this.getMissionRendererBackend() === 'threeMission3d');
    const mode = this.app.state.ui?.threeMissionInteractionMode ?? 'selectInspect';
    if (this.threeInteractionController.interactionMode !== mode) setThreeMissionInteractionMode(this.threeInteractionController, mode);
    return this.threeInteractionController;
  }

  refreshCanonicalPlanningGuidanceForThree() {
    this.app.state.ui ??= {};
    const markerMode = this.app.state.ui.placementMode === 'marker';
    const guidanceSettings = {
      mode: markerMode ? 'marker' : 'planning',
      showGuidance: markerMode ? false : this.app.state.ui.showGuidance,
      showDrift: markerMode ? false : this.app.state.ui.showDriftCone,
      showReachable: markerMode ? false : this.app.state.ui.showReachableArea,
      showSurfacing: this.app.state.ui.showPredictedSurfacing,
      showEnergy: markerMode ? false : this.app.state.ui.showEnergyPreview
    };
    if (!shouldRenderPlanningGuidance({
      mode: 'planning',
      selectedAgentId: this.app.state.selectedAgentId,
      planningAnchor: this.app.state.ui.planningAnchor,
      guidanceSettings,
      surfaceDecision: this.app.state.surfaceDecision
    })) {
      this.app.state.ui.overlayDebug = null;
      return null;
    }
    const guidance = buildPlanningGuidance({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      selectedAgentId: this.app.state.selectedAgentId,
      selectedWaypoint: this.app.state.ui.selectedWaypoint,
      selectedWindow: this.app.state.selectedWindow,
      surfacedAgents: this.app.state.surfacedAgents,
      hoverCell: this.app.state.ui.hoverCell,
      time: this.app.state.planningTime,
      challengeMode: this.app.state.challengeMode,
      revealTruth: this.app.state.ui.revealTruth,
      forecastMemberId: this.app.state.ui.forecastMemberId,
      planningAnchor: this.app.state.ui.planningAnchor,
      settings: guidanceSettings
    });
    this.app.state.ui.overlayDebug = guidance;
    return guidance;
  }
  buildMissionWorldViewModelForScene() {
    this.threePerformanceDiagnostics ??= createMissionWorkspacePerformanceCounters();
    this.threePerformanceDiagnostics.missionViewModelBuildCount += 1;
    const cameraGestureActive = this.threeInteractionController?.cameraGestureActive === true || this.threeMissionRenderer?.cameraController?.gestureActive === true;
    if (cameraGestureActive) this.threePerformanceDiagnostics.modelBuildCountDuringCameraGesture += 1;
    this.refreshCanonicalPlanningGuidanceForThree();
    const input = missionWorldRenderInputFromWorkspace(this, {
      visibilityTier: this.app.state.challengeMode === 'forecast' && this.app.state.ui?.revealTruth ? 'oracle' : 'fair',
      displaySettings: {
        rendererBackend: this.getMissionRendererBackend(),
        cameraPreset: this.app.state.ui?.threeMissionCameraPreset ?? 'obliqueMission',
        ...(this.threeLayerVisibilityPatch())
      }
    });
    this.missionRenderInput = input;
    const flatViewModel = buildMissionWorldRenderViewModel(input);
    const viewModel = augmentMissionWorldWithVolumetricModel(flatViewModel, {
      ...input,
      displaySettings: { ...(input.displaySettings ?? {}), waterColumn: this.app.state.ui?.waterColumn ?? {} },
      waterColumn: this.app.state.ui?.waterColumn ?? {},
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan
    });
    const interactionState = this.app.state.ui?.threeMissionInteraction ?? {};
    const planningToolState = this.ensureMissionPlanningToolState();
    viewModel.interactionViewModel = buildMissionPlanningInteractionViewModel({
      missionWorldViewModel: viewModel,
      interactionState: {
        ...interactionState,
        planningToolState: missionPlanningToolStateSummary(planningToolState),
        activePlanningToolId: planningToolState.activeToolId,
        activePlanningToolLabel: labelForTool(planningToolState.activeToolId),
        planningToolInstruction: planningToolState.instructions,
        planningToolCursor: planningToolState.cursorId,
        interactionMode: this.app.state.ui?.threeMissionInteractionMode ?? interactionState.interactionMode ?? interactionModeForTool(planningToolState.activeToolId)
      },
      routePreview: interactionState.routePreview ?? null,
      placementValidation: interactionState.placementValidation ?? null,
      guidanceState: this.app.state.ui?.overlayDebug ?? null,
      options: { interactionMode: this.app.state.ui?.threeMissionInteractionMode ?? interactionModeForTool(planningToolState.activeToolId) }
    });
    viewModel.terrainValidation = this.app.state.ui?.terrainAwareValidationReport ?? null;
    viewModel.terrainValidationSummary = this.app.state.ui?.missionReadiness ?? null;
    this.missionRenderViewModel = viewModel;
    if ((viewModel.plannedDiveSegments ?? []).length) {
      this.threePerformanceDiagnostics.predictedTrajectoryBuildCount += 1;
      if (cameraGestureActive) this.threePerformanceDiagnostics.predictionBuildCountDuringCameraGesture += 1;
    }
    return viewModel;
  }

  refreshThreeMissionRenderer() {
    const renderer = this.ensureThreeMissionRenderer();
    if (!renderer) {
      const viewModel = this.buildMissionWorldViewModelForScene();
      this.updateThreeRendererLifecycle({ state: this.threeRendererLifecycle?.state ?? 'deferred', rendererReady: false, refreshDeferredReason: this.threeRendererLifecycle?.refreshDeferredReason ?? 'rendererUnavailable' });
      this.updateMissionRenderDebug({ activeBackend: 'threeMission3d', threeMounted: false, viewModel, parityWarnings: ['Three mission renderer could not mount DOM container.'] });
      return;
    }
    try {
      const rect = this.threeMissionContainer?.getBoundingClientRect?.();
      resizeThreeMissionWorldRenderer(renderer, rect?.width ?? this.threeMissionContainer?.clientWidth, rect?.height ?? this.threeMissionContainer?.clientHeight);
      const viewModel = this.buildMissionWorldViewModelForScene();
      updateThreeMissionInteractionContext(this.ensureThreeInteractionController(), viewModel);
      updateThreeMissionWorldRenderer(renderer, viewModel);
      this.updateThreeToolOverlay();
      const validation = validateMissionWorldRenderViewModel(viewModel);
      const parityWarnings = [...(validation.warnings ?? [])];
      if (!validation.valid) parityWarnings.push(...validation.errors);
      this.updateThreeRendererLifecycle({ state: 'ready', rendererReady: true, mountCompleted: true, firstRefreshCompleted: true, refreshDeferredReason: null, resizeSequence: renderer.lastSize?.resizeSequence ?? 0 });
      this.updateMissionRenderDebug({ activeBackend: 'threeMission3d', threeMounted: true, viewModel, renderer, parityWarnings });
      this.refreshMigrationDebug();
    } catch (error) {
      this.recordThreeRendererRuntimeError(error, 'refreshThreeMissionRenderer');
      this.updateMissionRenderDebug({ activeBackend: 'threeMission3d', threeMounted: Boolean(renderer), viewModel: this.missionRenderViewModel, renderer, parityWarnings: [String(error?.message ?? error)] });
    }
  }

  threeLayerVisibilityPatch() {
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
      routes: layers.routes !== false,
      planningMarkers: layers.planningMarkers !== false && this.app.state.ui?.showPlanningMarkers !== false,
      priorityTargets: layers.priorityTargets !== false && this.app.state.ui?.showPriorityStars !== false,
      observations: layers.observations !== false,
      selection: layers.selection !== false,
      guidance: layers.guidance !== false && this.app.state.ui?.showGuidance !== false,
      interaction: layers.interaction !== false
    };
  }

  updateMissionRenderDebug({ activeBackend, threeMounted, viewModel, renderer = null, parityWarnings = [] } = {}) {
    const summary = missionWorldRenderViewModelSummary(viewModel ?? {});
    const rendererSummary = renderer ? threeMissionWorldRendererSummary(renderer) : null;
    const interactionSummary = viewModel?.interactionViewModel ? missionPlanningInteractionViewModelSummary(viewModel.interactionViewModel) : null;
    const controllerSummary = this.threeInteractionController ? threeMissionInteractionControllerSummary(this.threeInteractionController) : null;
    const bridgeSummary = this.threeInteractionBridge ? missionWorkspaceThreeInteractionBridgeSummary(this.threeInteractionBridge) : null;
    const toolSummary = missionPlanningToolStateSummary(this.ensureMissionPlanningToolState());
    const cameraControllerSummary = rendererSummary?.cameraController ?? controllerSummary?.cameraController ?? threeMissionCameraControllerSummary(this.threeMissionRenderer?.cameraController ?? {});
    const legacyArtifactCounts = { ...summary };
    const threeArtifactCounts = rendererSummary ? {
      gliderCount: rendererSummary.gliderObjectCount,
      waypointCount: rendererSummary.waypointObjectCount,
      routeCount: rendererSummary.routeObjectCount,
      planningMarkerCount: rendererSummary.markerObjectCount,
      priorityTargetCount: rendererSummary.priorityTargetObjectCount,
      currentVectorCount: Math.floor(rendererSummary.currentVectorObjectCount / 2),
      hazardCount: rendererSummary.hazardObjectCount,
      dropZoneCount: rendererSummary.dropZoneObjectCount
    } : null;
    const mismatches = [];
    if (threeArtifactCounts) {
      for (const key of ['gliderCount', 'waypointCount', 'routeCount', 'planningMarkerCount', 'priorityTargetCount']) {
        if (Number(threeArtifactCounts[key] ?? 0) !== Number(summary[key] ?? 0)) mismatches.push({ key, expected: summary[key] ?? 0, actual: threeArtifactCounts[key] ?? 0 });
      }
    }
    const interactionState = this.app.state.ui?.threeMissionInteraction ?? {};
    const canvas = renderer?.renderer?.domElement ?? this.threeMissionRenderer?.renderer?.domElement ?? null;
    const canvasRect = canvas?.getBoundingClientRect?.() ?? null;
    const canvasPointerEvents = canvas ? globalThis.getComputedStyle?.(canvas)?.pointerEvents ?? canvas.style?.pointerEvents ?? 'auto' : null;
    const backingSize = canvas ? { width: canvas.width ?? null, height: canvas.height ?? null } : null;
    const lifecycle = this.threeRendererLifecycle ?? {};
    const pointerDiagnostics = this.threeInteractionController?.lastPointerDiagnostics ?? null;
    const lastHit = this.threeInteractionController?.lastHit ?? null;
    const expectedGridCell = interactionState.expectedGridCell ?? null;
    const actualGridCell = lastHit?.gridCell ? { x: lastHit.gridCell.x, y: lastHit.gridCell.y } : null;
    const pointerCellDelta = expectedGridCell && actualGridCell ? { dx: actualGridCell.x - expectedGridCell.x, dy: actualGridCell.y - expectedGridCell.y } : null;
    const interactionVm = viewModel?.interactionViewModel ?? {};
    const hoveredEntity = interactionVm.hoveredEntity ?? interactionState.hoveredEntity ?? null;
    const hoveredCell = interactionVm.hoveredCell ?? interactionState.hoveredCell ?? null;
    const rawPlacementValidation = interactionState.placementValidation ?? null;
    const placementValidation = interactionVm.placementValid !== undefined
      ? { ...(rawPlacementValidation ?? {}), valid: interactionVm.placementValid, message: interactionVm.placementReason ?? rawPlacementValidation?.message ?? null }
      : rawPlacementValidation;
    const dragPreview = interactionVm.dragPreview ?? interactionState.dragPreview ?? null;
    const routePreview = interactionVm.routePreview ?? interactionState.routePreview ?? null;
    const lastInteractionIntent = interactionState.lastIntent ?? null;
    const lastInteractionResult = interactionState.lastResult ?? null;
    const waypointAvailability = this.waypointToolAvailability(this.app.state.selectedAgentId);
    const planningToolStateMismatches = this.planningToolStateMismatches();
    const visibleToolButtonId = this.visiblePlanningToolButtonId();
    const selectedAgent = this.app.state.mission?.agents?.find((candidate) => candidate.id === this.app.state.selectedAgentId);
    const selectedAgentIdForDebug = viewModel?.selectedAgentId ?? this.app.state.selectedAgentId ?? null;
    const selectedPoseSummary = (rendererSummary?.gliderPoseSummaries ?? []).find((pose) => pose.agentId === selectedAgentIdForDebug) ?? rendererSummary?.gliderPoseSummaries?.[0] ?? null;
    const selectedGliderMesh = renderer?.groups?.gliderGroup?.children?.find?.((mesh) => mesh.userData?.agentId === selectedAgentIdForDebug) ?? null;
    const guidanceSummary = rendererSummary?.guidanceSummary ?? {};
    const alignmentReport = viewModel?.coordinateSystem ? compareMissionLayerCoordinates({ viewModel }) : null;
    const alignmentSummary = alignmentReport ? missionLayerAlignmentSummary(alignmentReport) : null;
    const hoveredExpectedWorld = hoveredCell && viewModel?.coordinateSystem ? gridCellToWorld(viewModel.coordinateSystem, hoveredCell.x, hoveredCell.y, 0) : null;
    const placementWarnings = placementValidation?.warnings ?? interactionState.placementValidation?.warnings ?? [];
    const placementWarningCodes = placementValidation?.warningCodes ?? interactionState.placementValidation?.warningCodes ?? [];
    const waypointBeyondMissionWindow = placementWarningCodes.includes('BEYOND_MISSION_WINDOW');
    const waypointCandidateStatus = placementValidation?.valid === false ? 'INVALID' : placementWarnings.length ? 'VALID_WITH_WARNINGS' : placementValidation ? 'VALID' : null;
    const waterColumnUi = this.ensureWaterColumnUiState();
    const plannedDiveDebug = plannedDiveDebugPayload(viewModel ?? {}, rendererSummary, this.app.state.ui?.selectedWaypoint, selectedAgentIdForDebug);
    const samplingTargetTerrainDebug = samplingTargetTerrainValidationDebug(viewModel ?? {}, this.app.state.ui?.selectedScienceTargetId ?? null);
    const waterColumnDebug = waterColumnRenderDebugPayload(viewModel ?? {}, rendererSummary, {
      phase: viewModel?.phase ?? this.app.state.mode ?? 'planning',
      selectedDiveProfileId: waterColumnUi.selectedDiveProfileId,
      selectedTargetDepthLayerId: waterColumnUi.selectedTargetDepthLayerId,
      defaultDisplayModeApplied: waterColumnUi.defaultDisplayModeApplied === true,
      cameraPresetId: this.app.state.ui?.threeMissionCameraPreset ?? null,
      lifecycleCleanupErrorCount: Number(this.cleanupErrorCount ?? 0)
    });
    const segmentFlightPlanDebug = segmentFlightPlanDebugPayload(viewModel ?? {}, plannedDiveDebug, selectedAgentIdForDebug);
    const waterColumnExplorerDebug = waterColumnExplorerDebugPayload(viewModel ?? {}, rendererSummary, waterColumnDebug);
    const volumetricCurrentDebug = volumetricCurrentDebugPayload(viewModel ?? {}, rendererSummary, { terrainDigest: rendererSummary?.terrainSourceDigest ?? null });
    globalThis.ANCHOR_WATER_COLUMN_RENDER_DEBUG = waterColumnDebug;
    globalThis.ANCHOR_DIVE_PLAN_DEBUG = plannedDiveDebug;
    globalThis.ANCHOR_SEGMENT_FLIGHT_PLAN_DEBUG = segmentFlightPlanDebug;
    globalThis.ANCHOR_WATER_COLUMN_EXPLORER_DEBUG = {
      ...waterColumnExplorerDebug,
      currentSourceDigest: volumetricCurrentDebug.currentSourceDigest,
      selectedCurrentProfileSampleCount: viewModel?.waterColumnExplorer?.selectedCurrentProfile?.samplesByDepth?.length ?? 0,
      activeCurrentVectorCount: volumetricCurrentDebug.activeVectorCount,
      glyphInstanceCount: volumetricCurrentDebug.glyphInstanceCount
    };
    globalThis.ANCHOR_VOLUMETRIC_CURRENT_DEBUG = volumetricCurrentDebug;
    const currentViewportWarning = currentVectorViewportWarning(volumetricCurrentDebug);
    if (currentViewportWarning && currentViewportWarning !== this.lastCurrentViewportWarning) {
      this.lastCurrentViewportWarning = currentViewportWarning;
      this.app.toast?.(currentViewportWarning, 'warning');
    }
    this.app.state.ui ??= {};
    this.app.state.ui.divePlanDebug = plannedDiveDebug;
    this.app.state.ui.segmentFlightPlanDebug = segmentFlightPlanDebug;
    this.app.state.ui.waterColumnExplorerDebug = waterColumnExplorerDebug;
    this.publishContinuousMissionDebug({ rendererSummary, waterColumnDebug, plannedDiveDebug });
    const terrainValidationCounters = this.terrainValidationDebugCounters();
    const terrainLayerSummary = rendererSummary?.terrainValidationSummary ?? {};
    globalThis.ANCHOR_TERRAIN_VALIDATION_DEBUG = {
      ...(globalThis.ANCHOR_TERRAIN_VALIDATION_DEBUG ?? {}),
      ...terrainValidationCounters,
      terrainAwareValidationStatus: viewModel?.terrainValidation?.status ?? this.app.state.ui?.missionReadiness?.status ?? null,
      terrainAwareValidationExecutable: viewModel?.terrainValidation?.executable ?? this.app.state.ui?.missionReadiness?.executable ?? null,
      terrainAwareValidationIssueCodes: this.app.state.ui?.missionReadiness?.issueCodes ?? [],
      validationLayerFullRebuildCount: terrainLayerSummary.validationLayerFullRebuildCount ?? 0,
      validationLayerIncrementalUpdateCount: terrainLayerSummary.validationLayerIncrementalUpdateCount ?? 0,
      validationLayerObjectReuseCount: terrainLayerSummary.validationLayerObjectReuseCount ?? 0,
      validationLayerObjectCreateCount: terrainLayerSummary.validationLayerObjectCreateCount ?? 0,
      validationLayerObjectDisposeCount: terrainLayerSummary.validationLayerObjectDisposeCount ?? 0,
      validationLayerDigest: terrainLayerSummary.validationLayerDigest ?? null,
      resultExportBuildCount: globalThis.ANCHOR_RESULT_EXPORT_DEBUG?.buildCount ?? 0,
      replayManifestBuildCount: globalThis.ANCHOR_REPLAY_DEBUG?.manifestBuildCount ?? 0,
      replayCheckpointBuildCount: globalThis.ANCHOR_REPLAY_DEBUG?.checkpointBuildCount ?? 0,
      replayDigestBuildCount: globalThis.ANCHOR_REPLAY_DEBUG?.digestBuildCount ?? 0,
      headlessBundleBuildCount: globalThis.ANCHOR_HEADLESS_BUNDLE_DEBUG?.buildCount ?? 0,
      roundtripReportBuildCount: globalThis.ANCHOR_ROUNDTRIP_DEBUG?.buildCount ?? 0
    };
    const performanceDebug = this.publishThreePerformanceDebug({ rendererSummary, phase: viewModel?.phase ?? this.app.state.mode ?? 'planning' });
    globalThis.ANCHOR_MISSION_RENDER_DEBUG = {
      version: 'gfx-r3b',
      activeBackend: activeBackend ?? this.getMissionRendererBackend(),
      threeMounted: threeMounted === true,
      rendererLifecycleState: lifecycle.state ?? (threeMounted ? 'ready' : 'idle'),
      rendererReady: lifecycle.rendererReady === true || threeMounted === true,
      rendererMountCompleted: lifecycle.mountCompleted === true,
      rendererFirstRefreshCompleted: lifecycle.firstRefreshCompleted === true,
      rendererRefreshDeferredReason: lifecycle.refreshDeferredReason ?? null,
      rendererRuntimeErrorCount: Number(lifecycle.runtimeErrorCount ?? 0),
      rendererLastError: lifecycle.lastError ?? null,
      phase: viewModel?.phase ?? this.app.state.mode ?? 'planning',
      missionId: viewModel?.missionId ?? this.app.state.mission?.missionId ?? null,
      levelId: viewModel?.levelId ?? this.app.state.level?.levelId ?? null,
      terrainSourceDigest: rendererSummary?.terrainSourceDigest ?? null,
      terrainMeshDigest: rendererSummary?.terrainMeshDigest ?? null,
      terrainCoordinateProfileId: rendererSummary?.terrainCoordinateProfileId ?? null,
      terrainLayerImplementationId: rendererSummary?.terrainLayerImplementationId ?? null,
      usesSharedTerrainLayer: rendererSummary?.usesSharedTerrainLayer === true,
      usesLegacyTerrainLayer: rendererSummary?.usesLegacyTerrainLayer === true,
      lastWaypointTerrainValidationSource: placementValidation ? 'canonicalWaypointPlacementGuard' : null,
      lastRouteTerrainValidationSource: routePreview ? 'canonicalRoutePreview' : null,
      usesMeshRaycastForValidity: false,
      terrainAwareValidationStatus: viewModel?.terrainValidation?.status ?? this.app.state.ui?.missionReadiness?.status ?? null,
      terrainAwareValidationExecutable: viewModel?.terrainValidation?.executable ?? this.app.state.ui?.missionReadiness?.executable ?? null,
      terrainAwareValidationHardErrorCount: viewModel?.terrainValidation?.hardErrors?.length ?? this.app.state.ui?.missionReadiness?.hardErrorCount ?? 0,
      terrainAwareValidationWarningCount: viewModel?.terrainValidation?.warnings?.length ?? this.app.state.ui?.missionReadiness?.warningCount ?? 0,
      terrainAwareValidationAdvisoryCount: viewModel?.terrainValidation?.advisories?.length ?? this.app.state.ui?.missionReadiness?.advisoryCount ?? 0,
      terrainAwareValidationIssueCodes: this.app.state.ui?.missionReadiness?.issueCodes ?? [],
      terrainAwareValidationSummary: this.app.state.ui?.missionReadiness ?? null,
      planningValidationBuildCount: terrainValidationCounters.planningValidationBuildCount ?? 0,
      planningValidationCacheHitCount: terrainValidationCounters.planningValidationCacheHitCount ?? 0,
      planningValidationCacheMissCount: terrainValidationCounters.planningValidationCacheMissCount ?? 0,
      lastPlanningValidationInvalidationReason: terrainValidationCounters.lastPlanningValidationInvalidationReason ?? null,
      missionReadinessRenderCount: terrainValidationCounters.missionReadinessRenderCount ?? 0,
      missionReadinessRenderCountDuringCameraGesture: terrainValidationCounters.missionReadinessRenderCountDuringCameraGesture ?? 0,
      missionReadinessIssueRowCreateCount: terrainValidationCounters.missionReadinessIssueRowCreateCount ?? 0,
      missionReadinessIssueRowReuseCount: terrainValidationCounters.missionReadinessIssueRowReuseCount ?? 0,
      terrainValidationObjectCount: rendererSummary?.terrainValidationObjectCount ?? 0,
      rendererOwnsTerrainValidation: false,
      lastSamplingTargetBottomDepthMeters: samplingTargetTerrainDebug.bottomDepthMeters,
      lastSamplingTargetRequestedDepthMeters: samplingTargetTerrainDebug.requestedDepthMeters,
      lastSamplingTargetClearanceMeters: samplingTargetTerrainDebug.clearanceMeters,
      lastSamplingTargetValidationSource: samplingTargetTerrainDebug.validationSource,
      activeTimeSeconds: summary.activeTimeSeconds ?? this.app.state.planningTime ?? 0,
      renderedFieldTimeSeconds: viewModel?.scalarFieldLayer?.timeSeconds ?? null,
      renderedCurrentTimeSeconds: viewModel?.vectorFieldLayer?.timeSeconds ?? null,
      activePriorityTargetCount: summary.priorityTargetCount ?? 0,
      scienceTargetCount: summary.scienceTargetCount ?? viewModel?.scienceTargets?.length ?? 0,
      selectedAgentId: selectedAgentIdForDebug,
      selectedAgentHeadingRadians: selectedPoseSummary?.headingRadians ?? null,
      selectedAgentCourseRadians: selectedPoseSummary?.courseOverGroundRadians ?? null,
      selectedAgentPitchRadians: selectedPoseSummary?.pitchRadians ?? null,
      selectedAgentOrientationSource: selectedPoseSummary?.orientationSource ?? null,
      selectedAgentCourseSource: selectedPoseSummary?.courseSource ?? null,
      selectedAgentRenderedQuaternion: selectedGliderMesh?.quaternion ? { x: selectedGliderMesh.quaternion.x, y: selectedGliderMesh.quaternion.y, z: selectedGliderMesh.quaternion.z, w: selectedGliderMesh.quaternion.w } : null,
      selectedAgentPoseWarnings: selectedPoseSummary?.warnings ?? [],
      guidanceAvailable: guidanceSummary.guidanceAvailable === true,
      guidanceSource: guidanceSummary.guidanceSource ?? null,
      guidanceConeVisible: guidanceSummary.guidanceConeVisible === true,
      guidanceConeOrigin: guidanceSummary.guidanceConeOrigin ?? null,
      guidanceConeDirection: guidanceSummary.guidanceConeDirection ?? null,
      guidanceConeAngularWidth: guidanceSummary.guidanceConeAngularWidth ?? null,
      guidanceConeRadius: guidanceSummary.guidanceConeRadius ?? null,
      guidanceRiskStatus: guidanceSummary.guidanceRiskStatus ?? null,
      activeGridTransformVersion: viewModel?.coordinateSystem?.version ?? null,
      hoveredCellExpectedWorldCenter: hoveredExpectedWorld,
      hoveredCellRenderedWorldCenter: hoveredExpectedWorld,
      hoveredCellAlignmentDelta: 0,
      layerAlignmentStatus: alignmentSummary?.status ?? null,
      maxLayerAlignmentDelta: alignmentSummary?.maxHorizontalDelta ?? null,
      misalignedLayerIds: alignmentSummary?.misalignedLayerIds ?? [],
      selectedWaypointId: viewModel?.selectedWaypointId ?? null,
      selectedMarkerId: viewModel?.selectedMarkerId ?? null,
      selectedPriorityTargetId: viewModel?.selectedPriorityTargetId ?? null,
      selectedScienceTargetId: viewModel?.selectedScienceTargetId ?? this.app.state.ui?.selectedScienceTargetId ?? null,
      terrainCellCount: summary.terrainCellCount ?? 0,
      scalarFieldCellCount: summary.scalarFieldCellCount ?? 0,
      currentVectorCount: summary.currentVectorCount ?? 0,
      hazardCount: summary.hazardCount ?? 0,
      constraintCount: summary.constraintCount ?? 0,
      dropZoneCount: summary.dropZoneCount ?? 0,
      gliderCount: summary.gliderCount ?? 0,
      waypointCount: summary.waypointCount ?? 0,
      routeCount: summary.routeCount ?? 0,
      planningMarkerCount: summary.planningMarkerCount ?? 0,
      priorityTargetCount: summary.priorityTargetCount ?? 0,
      scienceTargetCount: summary.scienceTargetCount ?? viewModel?.scienceTargets?.length ?? 0,
      viewModelWarnings: viewModel?.warnings ?? [],
      parityWarnings,
      inputSummary: missionWorldRenderInputSummary(this.missionRenderInput ?? {}),
      rendererSummary,
      waterColumnDebug,
      segmentFlightPlanDebug,
      waterColumnExplorerDebug,
      performanceDebug,
      threePerformanceDebug: performanceDebug,
      interactionSummary,
      interactionControllerSummary: controllerSummary,
      interactionBridgeSummary: bridgeSummary,
      interactionMode: this.app.state.ui?.threeMissionInteractionMode ?? 'selectInspect',
      activePlanningToolId: interactionVm.activePlanningToolId ?? toolSummary.activeToolId,
      activePlanningToolLabel: interactionVm.activePlanningToolLabel ?? toolSummary.activeToolLabel,
      scenePlanningToolId: this.activePlanningToolId ?? null,
      controllerInteractionMode: controllerSummary?.interactionMode ?? null,
      visibleToolButtonId,
      planningToolStateMismatches,
      planningToolControlBindCount: Number(this.planningToolControlBindCount ?? 0),
      planningToolControlDispatchCount: Number(this.planningToolControlDispatchCount ?? 0),
      duplicateThreeHoverSuppressionCount: Number(this.duplicateThreeHoverSuppressionCount ?? 0),
      duplicateToolControlDispatchCount: Number(this.duplicateToolControlDispatchCount ?? 0),
      planningToolInstruction: interactionVm.planningToolInstruction ?? toolSummary.instructions,
      planningToolCursor: interactionVm.planningToolCursor ?? toolSummary.cursorId,
      planningToolStateSummary: toolSummary,
      interactionEnabled: Boolean(this.threeInteractionController?.enabled),
      pointerOwner: this.getMissionRendererBackend() === 'threeMission3d' ? 'three' : 'phaser',
      lastPointerConsumer: lastInteractionIntent ? 'three' : null,
      threeCanvasPointerEvents: canvasPointerEvents,
      canvasCssRect: canvasRect ? { left: canvasRect.left, top: canvasRect.top, width: canvasRect.width, height: canvasRect.height, right: canvasRect.right, bottom: canvasRect.bottom } : null,
      canvasBackingWidth: backingSize?.width ?? rendererSummary?.canvasBackingWidth ?? null,
      canvasBackingHeight: backingSize?.height ?? rendererSummary?.canvasBackingHeight ?? null,
      canvasBackingSize: backingSize,
      rendererPixelRatio: rendererSummary?.rendererPixelRatio ?? null,
      cameraAspect: rendererSummary?.cameraAspect ?? null,
      cameraControllerVersion: cameraControllerSummary?.version ?? null,
      cameraPresetId: cameraControllerSummary?.cameraPresetId ?? null,
      cameraMode: cameraControllerSummary?.cameraMode ?? null,
      cameraAzimuthRadians: cameraControllerSummary?.cameraAzimuthRadians ?? null,
      cameraPolarRadians: cameraControllerSummary?.cameraPolarRadians ?? null,
      cameraMinPolarRadians: cameraControllerSummary?.cameraMinPolarRadians ?? null,
      cameraMaxPolarRadians: cameraControllerSummary?.cameraMaxPolarRadians ?? null,
      cameraCurrentPolarRadians: cameraControllerSummary?.cameraCurrentPolarRadians ?? cameraControllerSummary?.cameraPolarRadians ?? null,
      cameraClampReason: cameraControllerSummary?.cameraClampReason ?? null,
      cameraDistance: cameraControllerSummary?.cameraDistance ?? null,
      cameraTarget: cameraControllerSummary?.cameraTarget ?? null,
      cameraOrbitEnabled: cameraControllerSummary?.cameraOrbitEnabled === true,
      cameraPanEnabled: cameraControllerSummary?.cameraPanEnabled === true,
      cameraZoomEnabled: cameraControllerSummary?.cameraZoomEnabled === true,
      cameraMouseMapping: cameraControllerSummary?.cameraMouseMapping ?? null,
      screenSpacePanning: cameraControllerSummary?.screenSpacePanning ?? null,
      cameraAzimuthDelta: cameraControllerSummary?.cameraAzimuthDelta ?? 0,
      cameraPolarDelta: cameraControllerSummary?.cameraPolarDelta ?? 0,
      cameraTargetBeforeGesture: cameraControllerSummary?.cameraTargetBeforeGesture ?? null,
      cameraTargetAfterGesture: cameraControllerSummary?.cameraTargetAfterGesture ?? null,
      cameraPanDelta: cameraControllerSummary?.cameraPanDelta ?? null,
      cameraGestureType: this.threeInteractionController?.cameraGestureType ?? cameraControllerSummary?.cameraGestureType ?? null,
      cameraPointerButton: this.threeInteractionController?.cameraPointerButton ?? cameraControllerSummary?.cameraPointerButton ?? null,
      cameraOrbitChangeCount: cameraControllerSummary?.cameraOrbitChangeCount ?? 0,
      cameraPanChangeCount: cameraControllerSummary?.cameraPanChangeCount ?? 0,
      cameraZoomChangeCount: cameraControllerSummary?.cameraZoomChangeCount ?? 0,
      lastCameraPosition: cameraControllerSummary?.lastCameraPosition ?? null,
      lastCameraTarget: cameraControllerSummary?.lastCameraTarget ?? null,
      hostWidth: rendererSummary?.hostWidth ?? null,
      hostHeight: rendererSummary?.hostHeight ?? null,
      resizeSequence: rendererSummary?.resizeSequence ?? lifecycle.resizeSequence ?? 0,
      devicePixelRatio: Number(globalThis.devicePixelRatio ?? 1),
      phaserWorldInputEnabled: this.getMissionRendererBackend() !== 'threeMission3d',
      duplicatePointerDispatchCount: 0,
      selectedObservationId: null,
      selectedRouteSegmentId: null,
      selectedSurfacingEventId: null,
      deploymentSelectionActive: interactionVm.deploymentSelectionActive === true || interactionState.deploymentSelectionActive === true,
      deploymentAgentId: interactionVm.deploymentAgentId ?? interactionState.deploymentAgentId ?? null,
      deploymentDropZoneId: toolSummary.deploymentDropZoneId ?? interactionState.selectedDropZoneId ?? null,
      deploymentCandidateCell: interactionVm.deploymentCandidateCell ?? interactionState.deploymentCandidateCell ?? null,
      deploymentCandidateValid: interactionVm.deploymentCandidateValid ?? interactionState.deploymentCandidateValid ?? null,
      deploymentValidationReason: interactionVm.deploymentValidationReason ?? interactionState.deploymentValidationReason ?? null,
      waypointPlacementActive: interactionState.waypointPlacementActive === true || toolSummary.activeToolId === 'placeWaypoint',
      waypointPreviewIndex: Number((this.app.state.plan?.agentPlans ?? []).find((plan) => plan.agentId === this.app.state.selectedAgentId)?.waypoints?.length ?? 0),
      waypointCandidateCell: interactionState.waypointCandidateCell ?? placementValidation?.cell ?? null,
      waypointCandidateValid: interactionState.waypointCandidateValid ?? placementValidation?.valid ?? null,
      waypointValidationReason: interactionState.waypointValidationReason ?? placementValidation?.message ?? placementValidation?.reason ?? null,
      waypointToolEnabled: waypointAvailability.enabled === true,
      waypointToolDisabledReason: waypointAvailability.enabled === true ? null : waypointAvailability.reason,
      selectedAgentDeployed: waypointAvailability.hasDeploymentStart === true,
      autoArmedWaypointAfterDeployment: interactionState.autoArmedWaypointAfterDeployment === true || this.autoArmedWaypointAfterDeployment === true,
      lastWaypointPipelineStage: interactionState.lastWaypointPipelineStage ?? null,
      lastWaypointPipelineStatus: interactionState.lastWaypointPipelineStatus ?? null,
      lastWaypointPipelineReason: interactionState.lastWaypointPipelineReason ?? null,
      lastWaypointCandidateCell: interactionState.lastWaypointCandidateCell ?? null,
      lastWaypointHitWorldPoint: interactionState.lastWaypointHitWorldPoint ?? null,
      lastWaypointIntent: interactionState.lastWaypointIntent ?? null,
      lastWaypointBridgeResult: interactionState.lastWaypointBridgeResult ?? null,
      lastWaypointValidation: interactionState.lastWaypointValidation ?? null,
      lastWaypointCommandResult: interactionState.lastWaypointCommandResult ?? null,
      selectedStartCell: interactionVm.selectedStartCell ?? interactionState.selectedStartCell ?? (getSelectedStart(selectedAgent) ? { x: getSelectedStart(selectedAgent).x, y: getSelectedStart(selectedAgent).y } : null),
      selectedDropZoneId: interactionVm.selectedDropZoneId ?? interactionState.selectedDropZoneId ?? null,
      lastPointerClient: pointerDiagnostics?.pointerClient ?? null,
      lastPointerLocal: pointerDiagnostics?.pointerLocal ?? null,
      lastPointerNdc: pointerDiagnostics?.pointerNdc ?? null,
      lastRayOrigin: pointerDiagnostics?.rayOrigin ?? null,
      lastRayDirection: pointerDiagnostics?.rayDirection ?? null,
      lastHitObjectType: lastHit?.objectType ?? null,
      lastHitObjectId: lastHit?.objectId ?? null,
      lastHitWorldPoint: lastHit?.worldPoint ?? null,
      lastHitGridCell: actualGridCell,
      expectedGridCell,
      actualGridCell,
      pointerCellDelta,
      pointerCalibrationStatus: pointerCellDelta ? (pointerCellDelta.dx === 0 && pointerCellDelta.dy === 0 ? 'ok' : 'mismatch') : 'unknown',
      hoveredObjectType: hoveredEntity?.objectType ?? null,
      hoveredObjectId: hoveredEntity?.objectId ?? hoveredEntity?.waypointId ?? hoveredEntity?.markerId ?? hoveredEntity?.targetId ?? hoveredEntity?.agentId ?? null,
      hoveredGridCell: hoveredCell ? { x: hoveredCell.x, y: hoveredCell.y, blocked: hoveredCell.blocked === true, reason: hoveredCell.reason ?? null } : null,
      placementPreviewActive: placementValidation != null,
      placementPreviewValid: placementValidation?.valid ?? null,
      placementPreviewReason: placementValidation?.message ?? placementValidation?.reason ?? null,
      waypointCandidateStatus,
      waypointCommitAllowed: placementValidation?.commitAllowed ?? null,
      waypointHardErrors: placementValidation?.hardErrors ?? [],
      waypointWarnings: placementWarnings,
      waypointPrimaryMessage: placementValidation?.message ?? placementValidation?.reason ?? null,
      waypointEstimatedArrivalTime: placementValidation?.estimate?.estimatedArrivalTime ?? placementValidation?.estimate?.arrivalTime ?? null,
      missionDurationSeconds: Number(this.app.state.level?.world?.time?.duration ?? 0),
      waypointBeyondMissionWindow,
      waypointDragActive: dragPreview?.active === true,
      dragWaypointId: dragPreview?.waypointId ?? null,
      dragPreviewCell: dragPreview?.gridCell ?? dragPreview?.to ?? null,
      routePreviewActive: routePreview?.active === true,
      routePreviewDistance: routePreview?.distance ?? routePreview?.distanceCells ?? null,
      routePreviewEta: routePreview?.eta ?? routePreview?.etaSeconds ?? routePreview?.etaPreview ?? null,
      routePreviewEnergy: routePreview?.energy ?? routePreview?.energyUsed ?? routePreview?.energyPreview ?? null,
      guidanceVisible: Boolean(interactionVm.guidanceCone ?? viewModel?.guidance?.visible),
      reachableRegionVisible: Boolean(interactionVm.reachableRegion ?? viewModel?.guidance?.reachableRegion),
      pointerCaptured: this.threeInteractionController?.pointerCaptured === true,
      pointerButton: controllerSummary?.pointerButton ?? null,
      pointerDownClient: controllerSummary?.pointerDownClient ?? null,
      pointerUpClient: controllerSummary?.pointerUpClient ?? null,
      pointerMovementPixels: controllerSummary?.pointerMovementPixels ?? 0,
      pointerGestureClassification: controllerSummary?.pointerGestureClassification ?? null,
      cameraMovedSincePointerDown: controllerSummary?.cameraMovedSincePointerDown === true,
      missionClickSuppressedReason: controllerSummary?.missionClickSuppressedReason ?? null,
      cameraGestureActive: this.threeInteractionController?.cameraGestureActive === true || cameraControllerSummary?.cameraGestureActive === true,
      lastIntentId: lastInteractionIntent?.intentId ?? null,
      lastIntentStatus: lastInteractionResult?.status ?? null,
      lastIntentChangedCanonicalState: lastInteractionResult?.changedCanonicalState === true,
      lastIntentWarning: lastInteractionResult?.warnings?.[0] ?? lastInteractionResult?.userMessage ?? null,
      lastInteractionIntents: interactionState.lastInteractionIntents ?? [],
      canonicalWaypointCount: summary.waypointCount ?? 0,
      threeWaypointCount: threeArtifactCounts?.waypointCount ?? null,
      legacyWaypointCount: summary.waypointCount ?? 0,
      canonicalMarkerCount: summary.planningMarkerCount ?? 0,
      threeMarkerCount: threeArtifactCounts?.planningMarkerCount ?? null,
      legacyMarkerCount: summary.planningMarkerCount ?? 0,
      rightPanelWaypointCount: summary.waypointCount ?? 0,
      timelineWaypointCount: summary.waypointCount ?? 0,
      waypointCountMismatch: Boolean((threeArtifactCounts?.waypointCount ?? summary.waypointCount ?? 0) !== (summary.waypointCount ?? 0)),
      lastInteractionIntent: this.app.state.ui?.threeMissionInteraction?.lastIntent ?? null,
      lastInteractionResult: this.app.state.ui?.threeMissionInteraction?.lastResult ?? null,
      interactionTrail: this.app.state.ui?.threeMissionInteraction?.lastInteractionIntents ?? [],
      legacyArtifactCounts,
      threeArtifactCounts,
      artifactCountMismatches: mismatches,
      ownsSimulationState: false,
      ownsPlanning: false,
      ownsScoring: false,
      ownsReplaySemantics: false,
      changesMissionState: false,
      changesOfficialBrowserScoring: false,
      phaserWorldRendererActive: this.getMissionRendererBackend() === 'legacyPhaser2d',
      legacyPhaserFallbackEnabled: legacyPhaserMissionRendererEnabled(),
      productionMissionUsesPhaserDrawing: this.getMissionRendererBackend() === 'legacyPhaser2d',
      exposesHiddenTruth: viewModel?.boundaryFlags?.includesHiddenTruth === true,
      usesWebGPUFluid: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false,
      usesMARL: false
    };
    this.installMissionRenderTestApi();
  }

  resetThreePerformanceDiagnosticsWindow() {
    this.threePerformanceDiagnostics = createMissionWorkspacePerformanceCounters();
    this.terrainValidationCache = createTerrainValidationCacheState();
    resetThreeMissionWorldRendererPerformance(this.threeMissionRenderer);
    return this.publishThreePerformanceDebug({
      rendererSummary: this.threeMissionRenderer ? threeMissionWorldRendererSummary(this.threeMissionRenderer) : null,
      phase: this.app.state.mode ?? 'planning'
    });
  }

  buildThreePerformanceDebugPayload({ rendererSummary = null, phase = 'planning' } = {}) {
    const diagnostics = this.threePerformanceDiagnostics ?? createMissionWorkspacePerformanceCounters();
    const overlayRenderCount = Number(this.hud?.overlayRenderCount ?? globalThis.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayRenderCount ?? 0);
    return createThreePerformanceDebugPayload({
      rendererSummary,
      phase,
      qualityProfile: this.app.state.ui?.waterColumn?.qualityProfile ?? this.app.state.ui?.threeMissionQualityProfile ?? 'balanced',
      counters: diagnostics,
      missionViewModelBuildCount: diagnostics.missionViewModelBuildCount,
      predictedTrajectoryBuildCount: diagnostics.predictedTrajectoryBuildCount,
      predictedTrajectoryCacheHitCount: diagnostics.predictedTrajectoryCacheHitCount,
      predictedTrajectoryCacheMissCount: diagnostics.predictedTrajectoryCacheMissCount,
      missionConsoleRenderCount: overlayRenderCount,
      rightPanelRenderCount: overlayRenderCount,
      timelineRenderCount: overlayRenderCount,
      modelBuildCountDuringCameraGesture: diagnostics.modelBuildCountDuringCameraGesture,
      predictionBuildCountDuringCameraGesture: diagnostics.predictionBuildCountDuringCameraGesture,
      textureUpdateCountDuringCameraGesture: rendererSummary?.performanceCounters?.textureUpdateDuringCameraGesture ?? 0,
      panelRenderCountDuringCameraGesture: diagnostics.panelRenderCountDuringCameraGesture,
      timelineRenderCountDuringCameraGesture: diagnostics.timelineRenderCountDuringCameraGesture,
      planningValidationBuildCount: this.terrainValidationCache?.counters?.planningValidationBuildCount ?? 0,
      planningValidationCacheHitCount: this.terrainValidationCache?.counters?.planningValidationCacheHitCount ?? 0,
      planningValidationCacheMissCount: this.terrainValidationCache?.counters?.planningValidationCacheMissCount ?? 0,
      lastPlanningValidationInvalidationReason: this.terrainValidationCache?.counters?.lastPlanningValidationInvalidationReason ?? null,
      missionReadinessRenderCount: this.terrainValidationCache?.counters?.missionReadinessRenderCount ?? 0,
      missionReadinessRenderCountDuringCameraGesture: this.terrainValidationCache?.counters?.missionReadinessRenderCountDuringCameraGesture ?? 0
    });
  }

  publishThreePerformanceDebug(options = {}) {
    const debug = this.buildThreePerformanceDebugPayload(options);
    globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG = debug;
    return debug;
  }

  installMissionRenderTestApi() {
    globalThis.ANCHOR_MISSION_RENDER_TEST_API = {
      version: 'gfx-r3b',
      rendererBackend: this.getMissionRendererBackend(),
      hasThreeRenderer: Boolean(this.threeMissionRenderer),
      screenPointForGridCell: (x, y) => {
        this.app.state.ui ??= {};
        this.app.state.ui.threeMissionInteraction ??= {};
        this.app.state.ui.threeMissionInteraction.expectedGridCell = { x: Math.round(Number(x)), y: Math.round(Number(y)) };
        return this.screenPointForMissionCell({ x, y });
      },
      screenPointForGridGroundCell: (x, y) => {
        this.app.state.ui ??= {};
        this.app.state.ui.threeMissionInteraction ??= {};
        this.app.state.ui.threeMissionInteraction.expectedGridCell = { x: Math.round(Number(x)), y: Math.round(Number(y)) };
        return this.screenPointForMissionGroundCell({ x, y });
      },
      screenPointForDepthCell: (layerId, x, y) => this.screenPointForMissionDepthCell(layerId, { x, y }),
      screenPointForWaypoint: (waypointId) => this.screenPointForMissionObject('waypoint', waypointId, (this.missionRenderViewModel?.waypoints ?? []).find((record) => record.waypointId === waypointId)),
      screenPointForAgent: (agentId) => this.screenPointForMissionObject('glider', agentId, (this.missionRenderViewModel?.gliders ?? []).find((record) => record.agentId === agentId)),
      screenPointForMarker: (markerId) => this.screenPointForMissionObject('planningMarker', markerId, (this.missionRenderViewModel?.planningMarkers ?? []).find((record) => record.markerId === markerId)),
      screenPointForPriorityTarget: (targetId) => this.screenPointForMissionObject('priorityTarget', targetId, (this.missionRenderViewModel?.priorityTargets ?? []).find((record) => record.targetId === targetId)),
      screenPointForSamplingTarget: (targetId) => this.screenPointForMissionObject('samplingTarget', targetId, (this.missionRenderViewModel?.scienceTargets ?? []).find((record) => record.targetId === targetId || record.id === targetId)),
      screenPointForObservation: () => null,
      screenPointForSurfacingEvent: () => null,
      screenPointForRouteSegment: (routeSegmentId) => this.screenPointForMissionRouteSegment(routeSegmentId),
      setCameraPresetForTest: (preset) => {
        this.setThreeCameraPreset(preset);
        return this.threeMissionRenderer?.cameraState ?? null;
      },
      interactionControllerSummary: () => threeMissionInteractionControllerSummary(this.threeInteractionController ?? {}),
      resetPerformanceWindow: () => this.resetThreePerformanceDiagnosticsWindow(),
      performanceDebug: () => this.publishThreePerformanceDebug({ rendererSummary: this.threeMissionRenderer ? threeMissionWorldRendererSummary(this.threeMissionRenderer) : null, phase: this.app.state.mode ?? 'planning' }),
      renderDebug: () => globalThis.ANCHOR_MISSION_RENDER_DEBUG ?? null
    };
  }

  screenPointForMissionCell(cell) {
    if (!this.threeMissionRenderer || !this.missionRenderViewModel?.coordinateSystem || !cell) return null;
    const world = gridCellToWorld(this.missionRenderViewModel.coordinateSystem, cell.x, cell.y, 0);
    return this.projectThreeWorldPoint({ x: world.x, y: Number(world.y ?? 0) + 0.62, z: world.z });
  }

  screenPointForMissionGroundCell(cell) {
    if (!this.threeMissionRenderer || !this.missionRenderViewModel?.coordinateSystem || !cell) return null;
    const world = gridCellToWorld(this.missionRenderViewModel.coordinateSystem, cell.x, cell.y, 0);
    return this.projectThreeWorldPoint({ x: world.x, y: Number(world.y ?? 0) + 0.12, z: world.z });
  }

  screenPointForMissionDepthCell(layerId, cell) {
    if (!this.threeMissionRenderer || !this.missionRenderViewModel?.coordinateModel || !cell) return null;
    const bottomDepthField = this.missionRenderViewModel?.bottomBoundary?.bottomDepthField ?? null;
    const landMask = this.missionRenderViewModel?.bottomBoundary?.landMask ?? null;
    const x = Number(cell.x);
    const y = Number(cell.y);
    const col = Math.round(x);
    const row = Math.round(y);
    if (Array.isArray(bottomDepthField) && bottomDepthField.length) {
      const layerDepth = Number(waterColumnLayerMetadata(layerId).nominalDepthMeters ?? 0);
      const bottomDepth = sampleBathymetryAt({ depthMeters: bottomDepthField }, x, y);
      const minimumClearance = Math.max(0, Number(this.app.state.mission?.physics?.minimumBottomClearanceMeters ?? this.app.state.mission?.physics?.bottomClearanceMeters ?? 5));
      if (landMask?.[row]?.[col] || !Number.isFinite(bottomDepth) || bottomDepth <= 0 || bottomDepth - layerDepth < minimumClearance) return null;
    }
    const world = depthLayerCellCenterToWorld(layerId, x, y, this.missionRenderViewModel.coordinateModel);
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.expectedGridCell = { x: Math.round(x), y: Math.round(y), depthLayerId: layerId };
    return this.projectThreeWorldPoint({ x: world.x, y: Number(world.y ?? 0), z: world.z });
  }

  screenPointForMissionRecord(record) {
    if (!this.threeMissionRenderer || !this.missionRenderViewModel?.coordinateSystem || !record) return null;
    const world = gridCellToWorld(this.missionRenderViewModel.coordinateSystem, record.x, record.y, Number(record.depthMeters ?? 0));
    const yOffset = screenProjectionYOffsetForMissionRecord(record);
    return this.projectThreeWorldPoint({ x: world.x, y: Number(world.y ?? 0) + yOffset, z: world.z });
  }

  screenPointForMissionObject(kind, id, fallbackRecord = null) {
    const object = this.findThreeMissionObject(kind, id);
    if (object) {
      object.updateWorldMatrix?.(true, false);
      const position = object.getWorldPosition?.(new THREE.Vector3()) ?? object.position;
      if (position) return this.projectThreeWorldPoint({ x: position.x, y: position.y, z: position.z });
    }
    return this.screenPointForMissionRecord(fallbackRecord);
  }

  findThreeMissionObject(kind, id) {
    const groups = this.threeMissionRenderer?.groups ?? {};
    const group = {
      glider: groups.gliderGroup,
      waypoint: groups.waypointGroup,
      planningMarker: groups.planningMarkerGroup,
      priorityTarget: groups.priorityTargetGroup,
      samplingTarget: groups.samplingTargetGroup
    }[kind];
    if (!group || id == null) return null;
    let match = null;
    group.traverse?.((object) => {
      if (match) return;
      const data = object.userData ?? {};
      if (kind === 'glider' && data.agentId === id) match = object;
      else if (kind === 'waypoint' && data.waypointId === id) match = object;
      else if (kind === 'planningMarker' && data.markerId === id) match = object;
      else if (kind === 'priorityTarget' && data.targetId === id) match = object;
      else if (kind === 'samplingTarget' && (data.targetId === id || data.missionObjectId === id)) match = object;
    });
    return match;
  }

  screenPointForMissionRouteSegment(routeSegmentId) {
    const route = (this.missionRenderViewModel?.routes ?? []).find((record) => record.id === routeSegmentId || record.routeSegmentId === routeSegmentId);
    const points = route?.points ?? route?.cells ?? [];
    if (!points.length) return null;
    const mid = points[Math.floor((points.length - 1) / 2)];
    return this.screenPointForMissionCell({ x: mid.x ?? mid.col, y: mid.y ?? mid.row });
  }

  projectThreeWorldPoint(point) {
    const renderer = this.threeMissionRenderer;
    const rect = renderer?.renderer?.domElement?.getBoundingClientRect?.();
    if (!renderer?.camera || !rect) return null;
    const vector = new THREE.Vector3(Number(point.x), Number(point.y), Number(point.z));
    vector.project(renderer.camera);
    return {
      x: rect.left + ((vector.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - vector.y) / 2) * rect.height,
      ndcX: vector.x,
      ndcY: vector.y,
      visible: vector.x >= -1 && vector.x <= 1 && vector.y >= -1 && vector.y <= 1 && vector.z >= -1 && vector.z <= 1
    };
  }

  refreshBestPriorPath() {
    this.app.state.ui ??= {};
    this.app.state.ui.showBestPathOverlay ??= false;
    this.app.state.bestPriorPath = getBestAttemptForChallenge(loadLeaderboard(), {
      level: this.app.state.level,
      mission: this.app.state.mission
    });
    this.app.state.bestPriorRunVm = buildBestPriorRunViewModel(this.app.state, this.app.state.bestPriorPath);
    debugBestPath('Diagnostics', bestPriorRunLogPayload(this.app.state.bestPriorRunVm));
  }

  clearPlanningOverlayObjects() {
    this.mapGraphics?.clear();
    this.markerObjects.forEach((object) => object.destroy());
    this.gliderObjects.forEach((object) => object.destroy());
    this.labelObjects.forEach((object) => object.destroy());
    this.markerObjects = [];
    this.gliderObjects = [];
    this.labelObjects = [];
  }

  addDeploymentSelectionLabels(layout) {
    const agentId = this.app.state.selectedAgentId;
    const selectedAgent = this.app.state.mission?.agents?.find((agent) => agent.id === agentId);
    const zones = selectedAgent ? getDeploymentZonesForAgent(this.app.state.level, this.app.state.mission, agentId) : [];
    if ((selectedAgent?.deployment?.mode === 'chooseFromZone' || selectedAgent?.deployment?.mode === 'chooseFromZones') && requiresDeploymentSelection(this.app.state.mission, agentId)) {
      const promptX = layout.ox + 10;
      const promptY = layout.oy + 10;
      this.addMapLabel(promptX, promptY, `Choose deployment cell for ${selectedAgent.label ?? selectedAgent.name ?? selectedAgent.id}`, {
        fill: 0x062033,
        stroke: 0x9ee7ff,
        color: '#eaf8ff',
        width: 292
      });
      const hover = this.app.state.ui.hoverCell;
      const hoverValid = hover && zones.some((zone) => zone.cells?.some((cell) => cell.x === hover.x && cell.y === hover.y));
      if (hoverValid) {
        const p = cellToWorld(layout, hover.x, hover.y);
        this.addMapLabel(p.x + layout.cell * 0.32, p.y - layout.cell * 0.62, 'Deploy here', {
          fill: 0x062033,
          stroke: 0x9ee7ff,
          color: '#dff9ff',
          width: 106
        });
      }
    }
    for (const agent of this.app.state.mission?.agents ?? []) {
      if (agent.deployment?.mode !== 'chooseFromZone' && agent.deployment?.mode !== 'chooseFromZones') continue;
      const start = getSelectedStart(agent);
      if (!start) continue;
      const p = cellToWorld(layout, start.x, start.y);
      this.addMapLabel(p.x + layout.cell * 0.32, p.y - layout.cell * 0.7, 'DEPLOY', {
        fill: 0x062d2b,
        stroke: agent.id === agentId ? 0xffffff : 0x63e6be,
        color: '#dfffee',
        width: 78
      });
    }
  }

  addMapLabel(x, y, text, { fill = 0x08111f, stroke = 0x54c7ec, color = '#eaf6ff', width = 180 } = {}) {
    const background = this.add.rectangle(x, y, width, 24, fill, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(2, stroke, 0.88)
      .setDepth(8);
    const label = this.add.text(x + 9, y + 5, text, {
      fontFamily: 'system-ui',
      fontSize: '12px',
      fontStyle: '800',
      color
    }).setDepth(9);
    this.labelObjects.push(background, label);
  }

  addGuidanceLabel(layout) {
    if (this.app.state.ui.showGuidance === false || this.app.state.ui.showEnergyPreview === false) return;
    const guidanceSettings = {
      mode: 'planning',
      showGuidance: this.app.state.ui.showGuidance,
      showDrift: this.app.state.ui.showDriftCone,
      showReachable: this.app.state.ui.showReachableArea,
      showSurfacing: this.app.state.ui.showPredictedSurfacing,
      showEnergy: this.app.state.ui.showEnergyPreview
    };
    if (!shouldRenderPlanningGuidance({
      mode: 'planning',
      selectedAgentId: this.app.state.selectedAgentId,
      planningAnchor: this.app.state.ui.planningAnchor,
      guidanceSettings,
      surfaceDecision: this.app.state.surfaceDecision
    })) return;
    const guidance = buildPlanningGuidance({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      selectedAgentId: this.app.state.selectedAgentId,
      selectedWaypoint: this.app.state.ui.selectedWaypoint,
      selectedWindow: this.app.state.selectedWindow,
      surfacedAgents: this.app.state.surfacedAgents,
      hoverCell: this.app.state.ui.hoverCell,
      time: this.app.state.planningTime,
      challengeMode: this.app.state.challengeMode,
      revealTruth: this.app.state.ui.revealTruth,
      forecastMemberId: this.app.state.ui.forecastMemberId,
      planningAnchor: this.app.state.ui.planningAnchor,
      settings: guidanceSettings
    });
    const label = buildGuidanceLabel(guidance);
    if (!label.text || !guidance?.previewPath?.length) return;

    const target = guidance.previewPath.at(-1);
    const p = cellToWorld(layout, target.x, target.y);
    const width = Math.min(230, Math.max(118, label.text.length * 7 + 18));
    const height = 24;
    const x = Math.min(layout.ox + layout.width * layout.cell - width - 6, p.x + 14);
    const y = Math.max(layout.oy + 6, p.y - 32);
    const background = this.add.rectangle(x, y, width, height, 0x08111f, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(2, label.warning ? 0xffb347 : 0x54c7ec, 0.9)
      .setDepth(8);
    const text = this.add.text(x + 9, y + 5, label.text, {
      fontFamily: 'system-ui',
      fontSize: '12px',
      fontStyle: '700',
      color: label.warning ? '#ffd6a0' : '#eaf6ff'
    }).setDepth(9);
    this.labelObjects.push(background, text);
  }

  addWaypointLabels(layout) {
    for (const agentPlan of this.app.state.plan?.agentPlans ?? []) {
      const stacks = buildWaypointStacks(agentPlan.waypoints ?? []);
      const labeledStacks = new Set();
      for (const [index, waypoint] of (agentPlan.waypoints ?? []).entries()) {
        const stack = stacks.get(waypointStackKey(waypoint));
        const stackIndex = stack?.indexes.indexOf(index) ?? 0;
        const offset = waypointStackOffset(stackIndex, stack?.indexes.length ?? 1, layout.cell);
        const base = cellToWorld(layout, waypoint.x, waypoint.y);
        const p = { x: base.x + offset.x, y: base.y + offset.y };
        this.labelObjects.push(this.add.text(p.x - 5, p.y - 8, String(index + 1), {
          fontFamily: 'system-ui',
          fontSize: '13px',
          fontStyle: '700',
          color: '#08111f'
        }).setDepth(9));
        if (stack?.indexes.length > 1 && !labeledStacks.has(stack.key)) {
          labeledStacks.add(stack.key);
          const badge = this.add.text(base.x + layout.cell * 0.18, base.y - layout.cell * 0.42, `x${stack.indexes.length}`, {
            fontFamily: 'system-ui',
            fontSize: '11px',
            fontStyle: '800',
            color: '#fff7c2',
            backgroundColor: '#08111f',
            padding: { left: 4, right: 4, top: 2, bottom: 2 }
          }).setDepth(10);
          this.labelObjects.push(badge);
        }
      }
    }
  }

  addGliderHitTargets(layout) {
    for (const agent of this.app.state.mission?.agents ?? []) {
      const surfaced = (this.app.state.surfacedAgents ?? []).find((candidate) => candidate.id === agent.id);
      const selectedStart = getSelectedStart(agent);
      if (!surfaced && (agent.deployment?.mode === 'chooseFromZone' || agent.deployment?.mode === 'chooseFromZones') && !selectedStart) continue;
      const x = surfaced?.x ?? selectedStart?.x ?? agent.start?.x;
      const y = surfaced?.y ?? selectedStart?.y ?? agent.start?.y;
      if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) continue;
      const p = cellToWorld(layout, x, y);
      const target = this.add.circle(p.x, p.y, layout.cell * 0.42, 0x63e6be, 0.01);
      target.setInteractive({ draggable: canPlaceGliderStarts(this.app.state.mission) });
      target.on('pointerdown', () => {
        this.suppressNextPointerUp = true;
        this.selectGlider(agent.id);
      });
      target.on('drag', (_pointer, dragX, dragY) => this.dragGliderStart(agent.id, dragX, dragY));
      this.gliderObjects.push(target);
    }
  }

  resolvePointerPoint(pointer) {
    return pointerToCanvasPoint(pointer, this.app?.phaser?.canvas);
  }

  resolvePointerCell(pointer) {
    return pointerToCell(pointer, this.app.adapter.layout, { canvas: this.app?.phaser?.canvas });
  }

  onPointerDown(pointer) {
    if (this.getMissionRendererBackend() === 'threeMission3d') return;
    const point = this.resolvePointerPoint(pointer);
    if (this.shouldPanMap(pointer)) {
      this.cameraPan = {
        x: point.x,
        y: point.y,
        panX: Number(this.app.state.ui.mapCamera?.panX ?? 0),
        panY: Number(this.app.state.ui.mapCamera?.panY ?? 0)
      };
      this.suppressNextPointerUp = true;
      return;
    }
    this.pointerInteraction = {
      cell: this.resolvePointerCell(pointer),
      moved: false
    };
  }

  onPointerMove(pointer) {
    if (this.getMissionRendererBackend() === 'threeMission3d') return;
    const point = this.resolvePointerPoint(pointer);
    if (this.cameraPan) {
      this.app.state.ui.mapCamera ??= { zoom: 1, panX: 0, panY: 0 };
      this.app.state.ui.mapCamera.panX = this.cameraPan.panX + point.x - this.cameraPan.x;
      this.app.state.ui.mapCamera.panY = this.cameraPan.panY + point.y - this.cameraPan.y;
      this.constrainCurrentMapCamera();
      this.refreshMap();
      return;
    }
    const cell = this.resolvePointerCell(pointer);
    if (this.pointerInteraction?.cell && cell && (cell.x !== this.pointerInteraction.cell.x || cell.y !== this.pointerInteraction.cell.y)) {
      this.pointerInteraction.moved = true;
    }
    const hover = this.app.state.ui.hoverCell;
    if (hover?.x !== cell?.x || hover?.y !== cell?.y) {
      this.app.state.ui.hoverCell = cell;
      this.debugCoordinateHover(pointer, cell);
      if (this.app.state.ui.placementMode === 'marker') this.refreshPanels();
      this.refreshMap();
    }
    if (this.app.state.ui.placementMode === 'marker' && cell) {
      this.app.mapHoverTooltip?.show({ state: this.app.state, cell, pointer });
    } else {
      this.app.mapHoverTooltip?.hide();
    }
  }

  onPointerUp(pointer) {
    if (this.getMissionRendererBackend() === 'threeMission3d') return;
    if (this.cameraPan) {
      this.cameraPan = null;
      return;
    }
    if (this.ignoreMapPointerUntil && performance.now() < this.ignoreMapPointerUntil) return;
    if (this.suppressNextPointerUp) {
      this.suppressNextPointerUp = false;
      return;
    }
    const cell = this.resolvePointerCell(pointer);
    if (!cell || !this.pointerInteraction || this.pointerInteraction.moved) return;
    if (this.app.state.ui.placementMode === 'marker') {
      const marker = getMarkerAtCell(this.app.state.plan, cell.x, cell.y, this.app.state.selectedAgentId);
      if (marker) this.focusMarkerTime(marker.index);
      else this.addMarkerForSelected(cell);
      this.app.mapHoverTooltip?.show({ state: this.app.state, cell, pointer });
      return;
    }
    const selectionModifier = Boolean(pointer.event?.shiftKey || pointer.event?.altKey);
    if (selectionModifier) {
      const existing = getWaypointAtCell(this.app.state.plan, cell.x, cell.y, this.app.state.selectedAgentId)
        ?? getWaypointAtCell(this.app.state.plan, cell.x, cell.y);
      if (existing) {
        this.selectWaypoint(existing.agentId, existing.index);
        return;
      }
    }
    const agent = this.getAgentAtCell(cell);
    if (agent) {
      this.selectGlider(agent.id);
      return;
    }
    if (this.trySelectDeploymentStart(cell)) return;
    this.addWaypointForSelected({ x: cell.x, y: cell.y, action: 'sample' });
  }

  trySelectDeploymentStart(cell) {
    const agentId = this.app.state.selectedAgentId;
    const agent = this.app.state.mission?.agents?.find((candidate) => candidate.id === agentId);
    if (!agent || (agent.deployment?.mode !== 'chooseFromZone' && agent.deployment?.mode !== 'chooseFromZones')) return false;
    const zones = getDeploymentZonesForAgent(this.app.state.level, this.app.state.mission, agentId);
    const inZone = zones.some((zone) => zone.cells?.some((candidate) => candidate.x === cell.x && candidate.y === cell.y));
    if (!inZone && requiresDeploymentSelection(this.app.state.mission, agentId)) {
      this.app.toast('Choose a deployment cell inside the drop zone first.', 'warning');
      return true;
    }
    if (!inZone) return false;
    const result = setSelectedStart(this.app.state.level, this.app.state.mission, this.app.state.plan, agentId, cell);
    if (!result.valid) {
      this.app.toast(result.message, 'warning');
      return true;
    }
    this.app.state.surfacedAgents = (this.app.state.surfacedAgents ?? []).filter((candidate) => candidate.id !== agentId);
    this.app.state.ui.hoverCell = null;
    this.clearSelectedWaypoint();
    this.app.state.ui.planningAnchor = { agentId, ...result.selectedStart, t: 0, source: 'selectedStart' };
    this.app.state.selectedAgentId = agentId;
    const deploymentTransition = this.completeDeploymentPlanningTool(agentId);
    this.markManualPlan();
    this.afterPlanChanged(agentId);
    this.app.toast(`Deployment start selected at (${cell.x}, ${cell.y}).`, 'success');
    this.refreshPanels();
    this.refreshMap();
    return true;
  }

  selectWaypoint(agentId, index) {
    const agentPlan = getAgentPlan(this.app.state.plan, agentId);
    this.previousWaypointSelected = agentPlan.waypoints.length != index+1 ? true : false;
    this.app.state.selectedAgentId = agentId;
    this.app.state.ui.selectedWaypoint = { agentId, index };
    this.app.state.ui.selectedMarker = null;
    this.afterPlanChanged(agentId, { selectedIndex: index });
    this.refreshPanels();
    this.refreshMap();
  }

  removeWaypointFromPanel(agentId, index) {
    removeWaypoint(this.app.state.plan, agentId, index);
    this.afterPlanChanged(agentId, { selectedIndex: index - 1 });
    this.clearSelectedWaypoint();
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
  }

  moveWaypointFromPanel(agentId, index, direction) {
    const moved = direction === 'up'
      ? moveWaypointUp(this.app.state.plan, agentId, index)
      : moveWaypointDown(this.app.state.plan, agentId, index);
    if (!moved) return;
    this.afterPlanChanged(agentId, { selectedIndex: direction === 'up' ? index - 1 : index + 1 });
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
  }

  selectGlider(agentId) {
    this.previousWaypointSelected = false;
    this.app.state.selectedAgentId = agentId;
    this.app.state.ui.hoverCell = null;
    this.clearSelectedWaypoint();
    applyPlanningAnchor(this.app.state, agentId);
    this.refreshPanels();
    this.refreshMap();
  }

  recordWaypointPipeline(patch = {}) {
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    const interaction = this.app.state.ui.threeMissionInteraction;
    if (patch.stage !== undefined) interaction.lastWaypointPipelineStage = patch.stage;
    if (patch.status !== undefined) interaction.lastWaypointPipelineStatus = patch.status;
    if (patch.reason !== undefined) interaction.lastWaypointPipelineReason = patch.reason;
    if (patch.candidateCell !== undefined) interaction.lastWaypointCandidateCell = patch.candidateCell ? { x: patch.candidateCell.x, y: patch.candidateCell.y } : null;
    if (patch.hitWorldPoint !== undefined) interaction.lastWaypointHitWorldPoint = patch.hitWorldPoint ?? null;
    if (patch.intent !== undefined) interaction.lastWaypointIntent = this.waypointIntentSummary(patch.intent);
    if (patch.bridgeResult !== undefined) interaction.lastWaypointBridgeResult = this.interactionResultSummary(patch.bridgeResult);
    if (patch.validation !== undefined) interaction.lastWaypointValidation = patch.validation ?? null;
    if (patch.commandResult !== undefined) interaction.lastWaypointCommandResult = patch.commandResult ?? null;
    if (globalThis.ANCHOR_MISSION_RENDER_DEBUG) {
      globalThis.ANCHOR_MISSION_RENDER_DEBUG.lastWaypointPipelineStage = interaction.lastWaypointPipelineStage ?? null;
      globalThis.ANCHOR_MISSION_RENDER_DEBUG.lastWaypointPipelineStatus = interaction.lastWaypointPipelineStatus ?? null;
      globalThis.ANCHOR_MISSION_RENDER_DEBUG.lastWaypointPipelineReason = interaction.lastWaypointPipelineReason ?? null;
      globalThis.ANCHOR_MISSION_RENDER_DEBUG.lastWaypointCandidateCell = interaction.lastWaypointCandidateCell ?? null;
      globalThis.ANCHOR_MISSION_RENDER_DEBUG.lastWaypointHitWorldPoint = interaction.lastWaypointHitWorldPoint ?? null;
      globalThis.ANCHOR_MISSION_RENDER_DEBUG.lastWaypointIntent = interaction.lastWaypointIntent ?? null;
      globalThis.ANCHOR_MISSION_RENDER_DEBUG.lastWaypointBridgeResult = interaction.lastWaypointBridgeResult ?? null;
      globalThis.ANCHOR_MISSION_RENDER_DEBUG.lastWaypointValidation = interaction.lastWaypointValidation ?? null;
      globalThis.ANCHOR_MISSION_RENDER_DEBUG.lastWaypointCommandResult = interaction.lastWaypointCommandResult ?? null;
    }
  }

  waypointIntentSummary(intent = {}) {
    return {
      intentId: intent.intentId ?? null,
      interactionMode: intent.interactionMode ?? null,
      gridCell: intent.gridCell ? { x: intent.gridCell.x, y: intent.gridCell.y } : null,
      objectType: intent.metadata?.objectType ?? null,
      objectId: intent.metadata?.objectId ?? null,
      sequence: intent.sequence ?? null
    };
  }

  interactionResultSummary(result = {}) {
    return {
      status: result.status ?? null,
      changedCanonicalState: result.changedCanonicalState === true,
      committedGridCell: result.committedGridCell ? { x: result.committedGridCell.x, y: result.committedGridCell.y } : null,
      selectedWaypointId: result.selectedWaypointId ?? null,
      userMessage: result.userMessage ?? null,
      warnings: result.warnings ?? []
    };
  }

  threeInteractionResult(intent, status, patch = {}) {
    const result = createMissionWorldInteractionResult({
      intentId: intent?.intentId ?? null,
      status,
      selectedAgentId: this.app.state.selectedAgentId ?? null,
      ...patch
    });
    if (intent?.intentId === 'placeWaypoint') {
      this.recordWaypointPipeline({ status: result.status, reason: result.userMessage ?? result.warnings?.[0] ?? null, bridgeResult: result });
    }
    return result;
  }

  handleThreeHoverIntent(intent) {
    const cell = intent.gridCell ?? null;
    const hoverKey = String(intent.metadata?.objectType ?? 'gridCell') + ':' + String(intent.metadata?.objectId ?? '') + ':' + String(cell?.x ?? '') + ':' + String(cell?.y ?? '') + ':' + String(cell?.depthLayerId ?? '');
    if (this.lastThreeHoverKey === hoverKey) {
      this.duplicateThreeHoverSuppressionCount = Number(this.duplicateThreeHoverSuppressionCount ?? 0) + 1;
      return this.threeInteractionResult(intent, 'noChange', { userMessage: 'Hover unchanged.' });
    }
    this.lastThreeHoverKey = hoverKey;
    this.app.state.ui ??= {};
    this.app.state.ui.hoverCell = cell ? { x: cell.x, y: cell.y } : null;
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.hoveredCell = cell ? { x: cell.x, y: cell.y, blocked: cell.blocked === true, reason: cell.reason ?? null } : null;
    this.app.state.ui.threeMissionInteraction.hoveredEntity = intent.metadata?.objectType && intent.metadata.objectType !== 'gridCell'
      ? { objectType: intent.metadata.objectType, objectId: intent.metadata.objectId ?? null, agentId: intent.agentId, waypointId: intent.waypointId, markerId: intent.markerId, targetId: intent.targetId, gridCell: cell }
      : null;
    const placementPreview = this.validateThreePlacementPreview(intent);
    this.app.state.ui.threeMissionInteraction.placementValidation = placementPreview;
    this.updatePlanningGuidePreviewFromIntent(intent, placementPreview);
    if (this.app.state.ui.threeMissionInteraction.deploymentSelectionActive === true) {
      const validation = cell ? setSelectedStartPreview(this.app.state.level, this.app.state.mission, this.app.state.ui.threeMissionInteraction.deploymentAgentId ?? this.app.state.selectedAgentId, cell) : { valid: false, message: 'Pointer is outside the mission grid.' };
      this.app.state.ui.threeMissionInteraction.deploymentCandidateCell = cell ? { x: cell.x, y: cell.y } : null;
      this.app.state.ui.threeMissionInteraction.deploymentCandidateValid = validation.valid;
      this.app.state.ui.threeMissionInteraction.deploymentValidationReason = validation.message;
      this.updatePlanningToolValidation({ canPlace: validation.valid, validationReason: validation.message });
    } else if ((this.app.state.ui?.missionPlanningTool?.activeToolId ?? null) === 'placeWaypoint') {
      this.app.state.ui.threeMissionInteraction.waypointCandidateCell = cell ? { x: cell.x, y: cell.y } : null;
      this.app.state.ui.threeMissionInteraction.waypointCandidateValid = placementPreview?.valid ?? null;
      this.app.state.ui.threeMissionInteraction.waypointValidationReason = placementPreview?.message ?? placementPreview?.reason ?? null;
    }
    this.refreshPanels();
    this.refreshMap();
    return this.threeInteractionResult(intent, 'noChange', { userMessage: cell ? `Hover (${cell.x}, ${cell.y})` : 'Hover cleared.' });
  }

  clearThreeHoverIntent(intent) {
    this.lastThreeHoverKey = null;
    this.app.state.ui ??= {};
    this.app.state.ui.hoverCell = null;
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.hoveredCell = null;
    this.app.state.ui.threeMissionInteraction.hoveredEntity = null;
    this.app.state.ui.threeMissionInteraction.placementValidation = null;
    this.app.state.ui.threeMissionInteraction.deploymentCandidateCell = null;
    this.app.state.ui.threeMissionInteraction.deploymentCandidateValid = null;
    this.app.state.ui.threeMissionInteraction.deploymentValidationReason = this.app.state.ui.threeMissionInteraction.deploymentSelectionActive === true ? 'Click a highlighted drop-zone cell to deploy this glider.' : null;
    this.app.state.ui.threeMissionInteraction.waypointCandidateCell = null;
    this.app.state.ui.threeMissionInteraction.waypointCandidateValid = null;
    this.app.state.ui.threeMissionInteraction.waypointValidationReason = null;
    this.app.state.ui.threeMissionInteraction.routePreview = null;
    this.refreshPanels();
    this.refreshMap();
    return this.threeInteractionResult(intent, 'noChange', { userMessage: 'Hover cleared.' });
  }

  selectGliderFromThree(agentId, intent) {
    const agent = this.app.state.mission?.agents?.find((candidate) => candidate.id === agentId);
    if (!agent) return this.threeInteractionResult(intent, 'rejected', { userMessage: 'No glider found for selection.', warnings: ['No glider found for selection.'] });
    this.selectGlider(agentId);
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.routePreview = null;
    return this.threeInteractionResult(intent, 'accepted', { selectedAgentId: agentId, userMessage: `Selected ${agent.label ?? agent.name ?? agent.id}.` });
  }

  selectWaypointById(waypointId, intent) {
    const match = this.findWaypointById(waypointId);
    if (!match) return this.threeInteractionResult(intent, 'rejected', { userMessage: 'No waypoint found for selection.', warnings: ['No waypoint found for selection.'] });
    this.selectWaypoint(match.agentId, match.index);
    return this.threeInteractionResult(intent, 'accepted', { selectedWaypointId: match.waypoint.id ?? waypointId, userMessage: 'Waypoint selected.' });
  }

  deleteWaypointById(waypointId, intent) {
    const match = this.findWaypointById(waypointId) ?? this.findSelectedWaypoint();
    if (!match) return this.threeInteractionResult(intent, 'rejected', { userMessage: 'No waypoint is selected for deletion.', warnings: ['No waypoint is selected for deletion.'] });
    this.removeWaypointFromPanel(match.agentId, match.index);
    return this.threeInteractionResult(intent, 'accepted', {
      changedCanonicalState: true,
      selectedWaypointId: match.waypoint.id ?? waypointId,
      userMessage: 'Waypoint deleted.'
    });
  }

  selectPriorityTargetFromThree(targetId, intent) {
    const target = this.findPriorityTargetById(targetId);
    if (!target) return this.threeInteractionResult(intent, 'rejected', { userMessage: 'No priority target found for inspection.', warnings: ['No priority target found for inspection.'] });
    this.app.state.ui ??= {};
    this.app.state.ui.selectedPriorityTargetId = target.id ?? target.targetId ?? targetId;
    this.app.state.ui.selectedMarker = null;
    this.app.state.ui.selectedWaypoint = null;
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.selectedEntity = { objectType: 'priorityTarget', objectId: this.app.state.ui.selectedPriorityTargetId, targetId: this.app.state.ui.selectedPriorityTargetId, gridCell: intent.gridCell };
    this.refreshPanels();
    this.refreshMap();
    return this.threeInteractionResult(intent, 'accepted', { selectedTargetId: this.app.state.ui.selectedPriorityTargetId, userMessage: `Gold Star inspected: ${target.label ?? target.id ?? targetId}.` });
  }


  selectDeploymentCellFromThree(intent) {
    const cell = intent.gridCell;
    const agentId = this.app.state.ui?.threeMissionInteraction?.deploymentAgentId ?? this.app.state.selectedAgentId;
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    const interaction = this.app.state.ui.threeMissionInteraction;
    interaction.deploymentSelectionActive = true;
    interaction.deploymentAgentId = agentId;
    interaction.deploymentCandidateCell = cell ? { x: cell.x, y: cell.y } : null;
    const agent = this.app.state.mission?.agents?.find((candidate) => candidate.id === agentId);
    if (!cell || !agent) {
      const message = !agent ? 'No active glider selected.' : 'Click a valid drop-zone cell.';
      interaction.deploymentCandidateValid = false;
      interaction.deploymentValidationReason = message;
      this.app.toast(message, 'warning');
      this.refreshPanels();
      this.refreshMap();
      return this.threeInteractionResult(intent, 'rejected', { committedGridCell: cell, userMessage: message, warnings: [message] });
    }
    const beforeWaypointCount = (this.app.state.plan?.agentPlans ?? []).reduce((sum, plan) => sum + (plan.waypoints?.length ?? 0), 0);
    const result = setSelectedStart(this.app.state.level, this.app.state.mission, this.app.state.plan, agentId, { x: cell.x, y: cell.y });
    interaction.deploymentCandidateValid = result.valid === true;
    interaction.deploymentValidationReason = result.message || (result.valid ? 'Deployment start selected.' : 'Deployment rejected.');
    if (!result.valid) {
      this.app.toast(result.message || 'Deployment start rejected.', 'warning');
      this.refreshPanels();
      this.refreshMap();
      return this.threeInteractionResult(intent, 'rejected', { committedGridCell: cell, userMessage: result.message || 'Deployment start rejected.', warnings: [result.message || 'Deployment start rejected.'] });
    }
    this.app.state.surfacedAgents = (this.app.state.surfacedAgents ?? []).filter((candidate) => candidate.id !== agentId);
    this.app.state.ui.hoverCell = null;
    this.clearSelectedWaypoint();
    this.app.state.ui.planningAnchor = { agentId, ...result.selectedStart, t: 0, source: 'selectedStart' };
    interaction.selectedStartCell = { x: result.selectedStart.x, y: result.selectedStart.y };
    const zone = getDeploymentZonesForAgent(this.app.state.level, this.app.state.mission, agentId).find((candidate) => candidate.cells?.some((zoneCell) => zoneCell.x === result.selectedStart.x && zoneCell.y === result.selectedStart.y));
    interaction.selectedDropZoneId = zone?.id ?? null;
    interaction.deploymentSelectionActive = false;
    this.app.state.selectedAgentId = agentId;
    const deploymentTransition = this.completeDeploymentPlanningTool(agentId);
    this.markManualPlan();
    this.afterPlanChanged(agentId);
    const afterWaypointCount = (this.app.state.plan?.agentPlans ?? []).reduce((sum, plan) => sum + (plan.waypoints?.length ?? 0), 0);
    this.app.toast(deploymentTransition?.message ?? ('Deployment start selected at (' + cell.x + ', ' + cell.y + ').'), 'success');
    this.refreshPanels();
    this.refreshMap();
    return this.threeInteractionResult(intent, 'accepted', {
      changedCanonicalState: true,
      committedGridCell: cell,
      userMessage: deploymentTransition?.message ?? 'Deployment start selected.',
      preview: { waypointCountUnchanged: beforeWaypointCount === afterWaypointCount, autoArmedWaypointAfterDeployment: deploymentTransition?.autoArmed === true }
    });
  }
  placeSamplingTargetFromThree(intent) {
    const cell = intent.gridCell;
    if (!cell) return this.threeInteractionResult(intent, 'rejected', { userMessage: 'Click an active depth slab to place a sampling target.', warnings: ['Missing grid cell.'] });
    const placement = this.resolveSamplingTargetPlacementPoint(intent);
    const validation = this.validateSamplingTargetBathymetryPlacement(placement);
    if (!validation.allowed) {
      this.setThreePlacementValidation({ valid: false, message: validation.message, cell });
      return this.threeInteractionResult(intent, 'rejected', { userMessage: validation.message, warnings: validation.warnings, committedGridCell: null });
    }
    const target = addScienceTarget(this.app.state.plan, {
      label: placement.label,
      geometryType: 'layerPoint',
      position: { x: placement.x, y: placement.y, depthMeters: placement.depthMeters, coordinateFrame: placement.coordinateFrame },
      depthLayerId: placement.depthLayerId,
      objectiveId: 'manual-science-target',
      fieldId: this.app.state.ui?.waterColumn?.selectedScalarFieldId ?? 'sampleValue',
      desiredSampleCount: 1,
      minimumCoverage: 0.65,
      publicVisibility: 'publicPlanningObjective'
    });
    this.app.state.ui ??= {};
    this.app.state.ui.selectedScienceTargetId = target.id;
    this.app.state.ui.selectedWaypoint = null;
    this.app.state.ui.selectedMarker = null;
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.selectedEntity = { objectType: 'samplingTarget', objectId: target.id, targetId: target.id, gridCell: cell };
    this.app.state.ui.threeMissionInteraction.lastSamplingTargetPlacement = {
      targetId: target.id,
      targetCanonicalDepthMeters: target.position.depthMeters,
      targetDepthLayerId: target.depthLayerId,
      targetDisplayWorldY: intent.worldPoint?.y ?? null,
      targetDepthRoundtripError: 0
    };
    this.setThreePlacementValidation({ valid: true, message: validation.warnings.length ? validation.warnings[0] : 'Sampling target placed.', cell });
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
    return this.threeInteractionResult(intent, 'accepted', { changedCanonicalState: true, committedGridCell: cell, selectedTargetId: target.id, userMessage: 'Sampling target placed.', warnings: validation.warnings, bottomClearanceMeters: validation.bottomClearanceMeters });
  }

  resolveSamplingTargetPlacementPoint(intent = {}) {
    const cell = intent.gridCell ?? {};
    const continuousPoint = intent.continuousPoint ?? cell.continuousPoint ?? {};
    const ui = this.ensureWaterColumnUiState();
    const layerId = cell.depthLayerId ?? cell.selectedDepthLayerId ?? intent.depthLayerId ?? ui.activeDepthLayerId ?? ui.selectedTargetDepthLayerId ?? 'surface';
    const metadata = waterColumnLayerMetadata(layerId);
    const depthMeters = Number(cell.depthMeters ?? cell.selectedDepthMeters ?? intent.worldPoint?.depthMeters ?? metadata.nominalDepthMeters ?? 0);
    const x = Number.isFinite(Number(continuousPoint.x)) ? Number(continuousPoint.x) : Number(cell.continuousX ?? cell.x ?? 0);
    const y = Number.isFinite(Number(continuousPoint.y)) ? Number(continuousPoint.y) : Number(cell.continuousY ?? cell.y ?? 0);
    return {
      x: this.roundContinuousCoordinate(x),
      y: this.roundContinuousCoordinate(y),
      depthMeters: Math.max(0, Number.isFinite(depthMeters) ? Number(depthMeters) : 0),
      depthLayerId: layerId,
      coordinateFrame: continuousPoint.coordinateFrame ?? 'continuousGridV1',
      label: `${labelizeForScene(layerId)} Sampling Target`
    };
  }

  validateSamplingTargetBathymetryPlacement(placement = {}) {
    const warnings = [];
    const level = this.app.state.level ?? {};
    const mission = this.app.state.mission ?? {};
    const bathymetry = level.bathymetry ?? level.world?.bathymetry ?? level.layers?.bathymetry ?? this.missionRenderViewModel?.bathymetry ?? null;
    const bottomBoundary = this.missionRenderViewModel?.bottomBoundary ?? null;
    const depthGrid = bottomBoundary?.bottomDepthField ?? level.layers?.depthMeters ?? level.layers?.depth ?? level.world?.bathymetry?.depthMeters ?? bathymetry?.depthMeters ?? null;
    const terrain = level.layers?.terrain ?? level.terrain ?? level.mask ?? null;
    const landMask = bottomBoundary?.landMask ?? terrain ?? level.world?.bathymetry?.landMask ?? level.world?.bathymetry?.landSeaMask ?? bathymetry?.landMask ?? bathymetry?.landSeaMask ?? null;
    const width = Number(level.world?.grid?.width ?? level.grid?.width ?? level.width ?? bottomBoundary?.width ?? depthGrid?.[0]?.length ?? terrain?.[0]?.length ?? landMask?.[0]?.length ?? bathymetry?.width ?? 0);
    const height = Number(level.world?.grid?.height ?? level.grid?.height ?? level.height ?? bottomBoundary?.height ?? depthGrid?.length ?? terrain?.length ?? landMask?.length ?? bathymetry?.height ?? 0);
    const x = Number(placement.x);
    const y = Number(placement.y);
    const requestedDepth = Math.max(0, Number(placement.depthMeters ?? 0));
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { allowed: false, message: 'Sampling target must be placed inside the mission grid.', warnings: ['Missing target position.'], bottomDepthMeters: null, bottomClearanceMeters: null };
    }
    if (width > 0 && height > 0 && (x < 0 || y < 0 || x > width - 1 || y > height - 1)) {
      return { allowed: false, message: 'Sampling target must stay inside the mission grid.', warnings: ['Target outside mission domain.'], bottomDepthMeters: null, bottomClearanceMeters: null };
    }
    const col = Math.max(0, Math.min(Math.max(0, width - 1), Math.round(x)));
    const row = Math.max(0, Math.min(Math.max(0, height - 1), Math.round(y)));
    const terrainValue = terrain?.[row]?.[col];
    const landValue = landMask?.[row]?.[col];
    const terrainIsLand = terrainValue === true || terrainValue === 1 || terrainValue === 'land';
    const maskIsLand = landValue === true || landValue === 1 || landValue === 'land';
    if (terrainIsLand || maskIsLand) {
      return { allowed: false, message: 'Sampling target must be placed in water, not on land.', warnings: ['Target intersects land mask.'], bottomDepthMeters: 0, bottomClearanceMeters: null };
    }
    let bottomDepth = null;
    if (Array.isArray(depthGrid) && depthGrid.length) {
      bottomDepth = sampleBathymetryAt({ depthMeters: depthGrid }, x, y);
    } else if (bathymetry?.depthMeters?.length) {
      bottomDepth = sampleBathymetryAt(bathymetry, x, y);
    }
    if (!Number.isFinite(bottomDepth) || bottomDepth <= 0) {
      warnings.push('No canonical bathymetry depth was available for this target; placement is allowed for legacy compatibility.');
      return { allowed: true, message: warnings[0], warnings, bottomDepthMeters: null, bottomClearanceMeters: null };
    }
    const minimumClearance = Math.max(0, Number(mission.physics?.minimumBottomClearanceMeters ?? mission.physics?.bottomClearanceMeters ?? mission.constraints?.minimumBottomClearanceMeters ?? 5));
    const clearance = bottomDepth - requestedDepth;
    if (clearance < minimumClearance) {
      const message = clearance < 0
        ? 'Sampling target depth is below the canonical seabed.'
        : 'Sampling target is too close to the canonical seabed.';
      return {
        allowed: false,
        message,
        warnings: [`${message} Bottom ${roundSceneMetric(bottomDepth, 2)} m, target ${roundSceneMetric(requestedDepth, 2)} m, clearance ${roundSceneMetric(clearance, 2)} m.`],
        bottomDepthMeters: roundSceneMetric(bottomDepth, 3),
        bottomClearanceMeters: roundSceneMetric(clearance, 3)
      };
    }
    if (clearance < minimumClearance * 2) warnings.push(`Sampling target is near the canonical seabed (${roundSceneMetric(clearance, 2)} m clearance).`);
    return {
      allowed: true,
      message: warnings[0] ?? 'Sampling target depth clears canonical bathymetry.',
      warnings,
      bottomDepthMeters: roundSceneMetric(bottomDepth, 3),
      bottomClearanceMeters: roundSceneMetric(clearance, 3)
    };
  }
  selectSamplingTargetFromThree(targetId, intent) {
    const target = this.findScienceTargetById(targetId);
    if (!target) return this.threeInteractionResult(intent, 'rejected', { userMessage: 'No sampling target found for inspection.', warnings: ['No sampling target found for inspection.'] });
    this.app.state.ui ??= {};
    this.app.state.ui.selectedScienceTargetId = target.id ?? targetId;
    this.app.state.ui.selectedWaypoint = null;
    this.app.state.ui.selectedMarker = null;
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.selectedEntity = { objectType: 'samplingTarget', objectId: this.app.state.ui.selectedScienceTargetId, targetId: this.app.state.ui.selectedScienceTargetId, gridCell: intent.gridCell };
    this.refreshPanels();
    this.refreshMap();
    return this.threeInteractionResult(intent, 'accepted', { selectedTargetId: this.app.state.ui.selectedScienceTargetId, userMessage: 'Sampling target selected.' });
  }

  findScienceTargetById(targetId) {
    return getScienceTargetById(this.app.state.plan, targetId);
  }

  selectedPlannedDiveSegment() {
    const selectedId = this.app.state.ui?.divePlanDebug?.selectedSegmentId ?? globalThis.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentId ?? null;
    return (this.missionRenderViewModel?.plannedDiveSegments ?? []).find((segment) => segment.segmentId === selectedId)
      ?? (this.missionRenderViewModel?.plannedDiveSegments ?? []).find((segment) => segment.agentId === this.app.state.selectedAgentId)
      ?? this.missionRenderViewModel?.plannedDiveSegments?.[0]
      ?? null;
  }

  attachScienceTargetToSelectedSegment() {
    const targetId = this.app.state.ui?.selectedScienceTargetId;
    const target = this.findScienceTargetById(targetId);
    const segment = this.selectedPlannedDiveSegment();
    if (!target || !segment) {
      this.app.toast?.('Select a sampling target and a route segment first.', 'warning');
      return null;
    }
    const attachedSegmentIds = [...new Set([...(target.attachedSegmentIds ?? []), segment.segmentId])];
    const updated = updateScienceTarget(this.app.state.plan, target.id, { attachedSegmentIds });
    const agentPlan = (this.app.state.plan?.agentPlans ?? []).find((plan) => plan.agentId === segment.agentId);
    const waypoint = agentPlan?.waypoints?.[Number(segment.segmentIndex)];
    if (waypoint) {
      waypoint.scienceTargetIds = [...new Set([...(waypoint.scienceTargetIds ?? []), target.id])];
      waypoint.targetDepthLayerId = target.depthLayerId ?? waypoint.targetDepthLayerId;
      waypoint.maximumDiveDepthMeters = Math.max(Number(waypoint.maximumDiveDepthMeters ?? 0), Number(target.position?.depthMeters ?? target.depthMeters ?? 0));
    }
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
    this.app.toast?.('Sampling target attached to selected segment.', 'success');
    return updated;
  }

  detachSelectedScienceTarget() {
    const targetId = this.app.state.ui?.selectedScienceTargetId;
    const target = this.findScienceTargetById(targetId);
    if (!target) return null;
    const segment = this.selectedPlannedDiveSegment();
    const attachedSegmentIds = segment ? (target.attachedSegmentIds ?? []).filter((id) => id !== segment.segmentId) : [];
    const updated = updateScienceTarget(this.app.state.plan, target.id, { attachedSegmentIds });
    for (const agentPlan of this.app.state.plan?.agentPlans ?? []) {
      for (const waypoint of agentPlan.waypoints ?? []) waypoint.scienceTargetIds = (waypoint.scienceTargetIds ?? []).filter((id) => id !== target.id);
    }
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
    this.app.toast?.('Sampling target detached.', 'info');
    return updated;
  }

  focusSelectedScienceTarget() {
    this.setThreeCameraPreset('divePlanningView');
  }

  setTargetLayerFromSelectedScienceTarget() {
    const target = this.findScienceTargetById(this.app.state.ui?.selectedScienceTargetId);
    if (!target?.depthLayerId) return;
    this.setWaterColumnTargetLayer(target.depthLayerId);
    this.setWaterColumnActiveLayer(target.depthLayerId);
  }

  copyTargetDepthToRequestedDepth() {
    const target = this.findScienceTargetById(this.app.state.ui?.selectedScienceTargetId);
    const depth = Number(target?.position?.depthMeters ?? target?.depthMeters);
    if (!Number.isFinite(depth)) return;
    this.setWaterColumnMaximumDepth(depth);
  }

  recommendScienceTargetProfiles() {
    const target = this.findScienceTargetById(this.app.state.ui?.selectedScienceTargetId);
    const depth = Number(target?.position?.depthMeters ?? target?.depthMeters ?? 0);
    const recommendation = depth <= 5 ? 'Surface Only' : depth <= 45 ? 'Thermocline Dive' : depth <= 100 ? 'Sawtooth Profile' : 'Full Profile';
    this.app.state.ui ??= {};
    this.app.state.ui.scienceTargetProfileRecommendation = { targetId: target?.id ?? null, recommendation, depthMeters: depth };
    this.refreshPanels();
    this.app.toast?.(`Recommended profile: ${recommendation}.`, 'info');
  }
  placeWaypointFromThree(intent) {
    const cell = intent.gridCell;
    this.recordWaypointPipeline({ stage: 'intent', status: 'received', reason: null, intent, candidateCell: cell, hitWorldPoint: intent.worldPoint });
    if (!cell) {
      const message = 'Click inside the mission grid to place a waypoint.';
      this.recordWaypointPipeline({ stage: 'noGridHit', status: 'rejected', reason: message, validation: { valid: false, reason: 'noGridHit', message } });
      this.updatePlanningToolValidation({ canPlace: false, validationReason: message, statusMessage: message, instructions: message });
      return this.threeInteractionResult(intent, 'rejected', { userMessage: message, warnings: [message] });
    }
    if (requiresDeploymentSelection(this.app.state.mission, this.app.state.selectedAgentId)) {
      const message = 'Deploy this glider before adding waypoints.';
      const validation = { valid: false, reason: 'selectedAgentNotDeployed', message, cell };
      this.setThreePlacementValidation({ valid: false, message, cell });
      this.recordWaypointPipeline({ stage: 'placementValidation', status: 'rejected', reason: message, validation });
      this.updatePlanningToolValidation({ canPlace: false, validationReason: message, statusMessage: message, instructions: 'Use Deploy / Change Start, then click a valid drop-zone cell.' });
      this.app.toast?.(message, 'warning');
      this.refreshPanels();
      this.refreshMap();
      return this.threeInteractionResult(intent, 'rejected', { committedGridCell: cell, userMessage: message, warnings: [message] });
    }
    const placementPoint = this.resolveWaypointPlacementPoint(intent);
    const result = this.addWaypointForSelected({ x: placementPoint.x, y: placementPoint.y, action: 'sample', continuousPoint: placementPoint, legacyCell: cell });
    if (!result?.ok) {
      const message = result?.message ?? 'Waypoint placement rejected.';
      const validation = { valid: false, reason: result?.reason ?? 'canonicalCommandFailure', message, cell };
      this.setThreePlacementValidation({ valid: false, message, cell });
      this.recordWaypointPipeline({ stage: 'canonicalCommand', status: 'rejected', reason: message, validation, commandResult: { ok: false, message } });
      this.updatePlanningToolValidation({ canPlace: false, validationReason: message, statusMessage: message, instructions: message });
      return this.threeInteractionResult(intent, 'rejected', { committedGridCell: cell, userMessage: message, warnings: [message] });
    }
    this.setThreePlacementValidation({ valid: true, message: 'Waypoint placed.', cell });
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.routePreview = null;
    this.recordWaypointPipeline({ stage: 'canonicalCommand', status: 'accepted', reason: 'Waypoint placed.', validation: { valid: true, reason: 'accepted', message: 'Waypoint placed.', cell }, commandResult: { ok: true, waypointId: result.waypoint?.id ?? null, index: result.index ?? null, agentId: result.agentId ?? null } });
    this.updatePlanningToolValidation({ canPlace: true, validationReason: 'Waypoint placed.', statusMessage: 'Waypoint placed. Continue clicking cells to append route waypoints.' });
    return this.threeInteractionResult(intent, 'accepted', {
      changedCanonicalState: true,
      committedGridCell: cell,
      selectedWaypointId: result.waypoint?.id ?? null,
      userMessage: 'Waypoint placed.'
    });
  }

  previewWaypointMoveFromThree(intent) {
    const cell = intent.gridCell;
    const match = this.findWaypointById(intent.waypointId);
    const validation = this.validateThreeMoveCell(cell, match?.agentId, match?.index);
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.dragPreview = {
      active: true,
      waypointId: intent.waypointId,
      agentId: match?.agentId ?? intent.agentId ?? null,
      from: match ? { x: match.waypoint.x, y: match.waypoint.y } : null,
      to: cell ? { x: cell.x, y: cell.y } : null,
      gridCell: cell ? { x: cell.x, y: cell.y } : null,
      valid: validation.valid
    };
    this.app.state.ui.threeMissionInteraction.placementValidation = validation;
    this.refreshMap();
    return this.threeInteractionResult(intent, 'preview', { preview: this.app.state.ui.threeMissionInteraction.dragPreview, userMessage: validation.message ?? 'Waypoint move preview.' });
  }

  commitWaypointMoveFromThree(intent) {
    const result = this.moveWaypointById(intent.waypointId, intent.continuousPoint ?? intent.gridCell);
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.dragPreview = null;
    this.app.state.ui.threeMissionInteraction.placementValidation = result.ok ? { valid: true, message: 'Waypoint moved.', cell: intent.gridCell } : { valid: false, message: result.message, cell: intent.gridCell };
    if (!result.ok) return this.threeInteractionResult(intent, 'rejected', { userMessage: result.message, warnings: [result.message], committedGridCell: intent.gridCell });
    return this.threeInteractionResult(intent, result.changed ? 'accepted' : 'noChange', {
      changedCanonicalState: result.changed,
      selectedWaypointId: result.waypoint?.id ?? intent.waypointId,
      committedGridCell: intent.gridCell,
      userMessage: result.changed ? 'Waypoint moved.' : 'Waypoint already at that cell.'
    });
  }

  cancelWaypointMoveFromThree(intent) {
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.dragPreview = null;
    this.app.state.ui.threeMissionInteraction.placementValidation = null;
    this.refreshMap();
    return this.threeInteractionResult(intent, 'cancelled', { userMessage: 'Waypoint move cancelled.' });
  }

  placePlanningMarkerFromThree(intent) {
    const cell = intent.gridCell;
    if (!cell) return this.threeInteractionResult(intent, 'rejected', { userMessage: 'Click inside the mission grid to place a planning marker.', warnings: ['Missing grid cell.'] });
    const result = this.addMarkerForSelected({ x: cell.x, y: cell.y });
    if (!result?.ok) return this.threeInteractionResult(intent, 'rejected', { committedGridCell: cell, userMessage: result?.message ?? 'Planning marker placement rejected.', warnings: [result?.message ?? 'Planning marker placement rejected.'] });
    return this.threeInteractionResult(intent, 'accepted', {
      changedCanonicalState: true,
      committedGridCell: cell,
      selectedMarkerId: result.marker?.id ?? null,
      userMessage: 'Planning marker added.'
    });
  }

  deletePlanningMarkerFromThree(intent) {
    if (intent.metadata?.selectOnly === true) return this.selectPlanningMarkerById(intent.markerId, intent);
    const match = this.findMarkerById(intent.markerId) ?? this.findSelectedMarker();
    if (!match) return this.threeInteractionResult(intent, 'rejected', { userMessage: 'No planning marker is selected for deletion.', warnings: ['No planning marker is selected for deletion.'] });
    removeMarker(this.app.state.plan, match.marker.agentId ?? match.agentId ?? this.app.state.selectedAgentId, match.index);
    this.app.state.ui.selectedMarker = null;
    recomputePlanningMarkerReachability(this.app.state, match.marker.agentId ?? this.app.state.selectedAgentId);
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
    return this.threeInteractionResult(intent, 'accepted', { changedCanonicalState: true, selectedMarkerId: match.marker.id ?? intent.markerId, userMessage: 'Planning marker deleted.' });
  }

  selectPlanningMarkerById(markerId, intent) {
    const match = this.findMarkerById(markerId);
    if (!match) return this.threeInteractionResult(intent, 'rejected', { userMessage: 'No planning marker found for inspection.', warnings: ['No planning marker found for inspection.'] });
    this.app.state.selectedAgentId = match.marker.agentId ?? this.app.state.selectedAgentId;
    this.app.state.ui.selectedMarker = { index: match.index, markerId: match.marker.id ?? markerId };
    this.app.state.ui.selectedWaypoint = null;
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.selectedEntity = { objectType: 'planningMarker', objectId: match.marker.id ?? markerId, markerId: match.marker.id ?? markerId, agentId: match.marker.agentId ?? null, gridCell: { x: match.marker.x, y: match.marker.y } };
    this.refreshPanels();
    this.refreshMap();
    return this.threeInteractionResult(intent, 'accepted', { selectedMarkerId: match.marker.id ?? markerId, userMessage: 'Planning marker selected.' });
  }

  handleThreeCameraChanged(intent) {
    this.updateMissionRenderDebug({ activeBackend: 'threeMission3d', threeMounted: true, viewModel: this.missionRenderViewModel, renderer: this.threeMissionRenderer, parityWarnings: [] });
    return this.threeInteractionResult(intent, 'noChange', { userMessage: 'Three camera adjusted.' });
  }

  cancelThreeInteractionFromIntent(intent) {
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.dragPreview = null;
    this.app.state.ui.threeMissionInteraction.routePreview = null;
    this.app.state.ui.threeMissionInteraction.placementValidation = null;
    this.refreshPanels();
    this.refreshMap();
    return this.threeInteractionResult(intent, 'cancelled', { userMessage: 'Three interaction cancelled.' });
  }

  moveWaypointById(waypointId, cell) {
    const match = this.findWaypointById(waypointId);
    if (!match) return { ok: false, message: 'Waypoint was not found.' };
    const validation = this.validateThreeMoveCell(cell, match.agentId, match.index);
    if (!validation.valid) return { ok: false, message: validation.message ?? 'Waypoint move rejected.' };
    const coordinateProfileId = this.currentCoordinateProfileId();
    const freePlacement = coordinateProfileId === 'continuousGridV1' && this.currentWaypointSnapMode() === 'freePlacement';
    const targetX = freePlacement ? this.roundContinuousCoordinate(cell.x) : Math.round(cell.x);
    const targetY = freePlacement ? this.roundContinuousCoordinate(cell.y) : Math.round(cell.y);
    if (Math.abs(Number(match.waypoint.x) - targetX) < 1e-6 && Math.abs(Number(match.waypoint.y) - targetY) < 1e-6) return { ok: true, changed: false, waypoint: match.waypoint };
    const waypoint = updateWaypoint(this.app.state.plan, match.agentId, match.index, { x: targetX, y: targetY, position: { x: targetX, y: targetY, coordinateFrame: cell.coordinateFrame ?? 'continuousGridV1' }, coordinateProfileId, legacyCell: { col: Math.round(targetX), row: Math.round(targetY), x: Math.round(targetX), y: Math.round(targetY), compatibilityOnly: true } });
    this.app.state.ui.selectedWaypoint = { agentId: match.agentId, index: match.index };
    this.app.state.ui.selectedMarker = null;
    this.afterPlanChanged(match.agentId, { selectedIndex: match.index });
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
    return { ok: true, changed: true, waypoint };
  }

  validateThreeMoveCell(cell, agentId = this.app.state.selectedAgentId) {
    if (!cell) return { valid: false, allowed: false, message: 'Move inside the mission grid.' };
    const position = cell.continuousPoint ?? cell;
    const terrain = validateTerrainAwareSurfaceWaypoint({
      level: this.app.state.level,
      mission: this.app.state.mission,
      agentId,
      position
    });
    if (!terrain.accepted) {
      const message = terrain.hardErrors?.[0]?.message ?? 'Waypoint must stay in navigable water.';
      return { valid: false, allowed: false, message, reason: terrain.hardErrors?.[0]?.code ?? 'terrainRejected', cell, hardErrors: terrain.hardErrors, terrainAwareValidation: terrain };
    }
    const validity = isValidWaypointCell(this.app.state.level, position.x, position.y);
    if (!validity.valid && validity.block) return { valid: false, allowed: false, message: validity.message, reason: 'blockedTerrain', cell, hardErrors: [validity.message], terrainAwareValidation: terrain };
    const warnings = [...(terrain.warnings ?? []).map((entry) => entry.message), ...(validity.warning ? [validity.message] : [])].filter(Boolean);
    return { valid: true, allowed: true, status: warnings.length ? 'VALID_WITH_WARNINGS' : 'VALID', message: warnings[0] ?? 'Valid waypoint cell.', warnings, warningCodes: (terrain.warnings ?? []).map((entry) => entry.code), cell, terrainAwareValidation: terrain };
  }

  updatePlanningGuidePreviewFromIntent(intent, placementPreview = null) {
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    const interaction = this.app.state.ui.threeMissionInteraction;
    const activeToolId = this.app.state.ui?.missionPlanningTool?.activeToolId ?? interaction.activePlanningToolId ?? interaction.interactionMode ?? intent?.interactionMode ?? null;
    if (activeToolId !== 'placeWaypoint' || !intent?.gridCell) {
      interaction.routePreview = null;
      return null;
    }
    const placementPoint = this.resolveWaypointPlacementPoint(intent);
    const preview = buildPlanningGuidePreviewViewModel({
      tool: activeToolId,
      interactionMode: intent.interactionMode,
      selectedAgentId: this.app.state.selectedAgentId,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      candidatePoint: placementPoint,
      candidateCell: intent.gridCell,
      placementValidation: placementPreview,
      active: true
    });
    interaction.routePreview = preview.active ? preview : null;
    return interaction.routePreview;
  }

  validateThreePlacementPreview(intent) {
    const cell = intent.gridCell;
    if (!cell) return null;
    if (intent.interactionMode !== 'placeWaypoint' && intent.interactionMode !== 'editWaypoint') return null;
    const position = intent.continuousPoint ?? cell.continuousPoint ?? cell;
    const terrain = validateTerrainAwareSurfaceWaypoint({
      level: this.app.state.level,
      mission: this.app.state.mission,
      agentId: this.app.state.selectedAgentId,
      position
    });
    if (!terrain.accepted) {
      const message = terrain.hardErrors?.[0]?.message ?? 'Waypoint placement rejected by terrain validation.';
      return { valid: false, allowed: false, commitAllowed: false, reason: terrain.hardErrors?.[0]?.code ?? 'terrainRejected', message, cell, hardErrors: terrain.hardErrors, terrainAwareValidation: terrain };
    }
    const validity = isValidWaypointCell(this.app.state.level, position.x, position.y);
    if (!validity.valid && validity.block) return { valid: false, allowed: false, commitAllowed: false, reason: 'blockedTerrain', message: validity.message, cell, hardErrors: [validity.message], terrainAwareValidation: terrain };
    const disabledReason = getPlacementDisabledReason(this.app.state, this.app.state.selectedAgentId);
    if (disabledReason) return { valid: false, allowed: false, commitAllowed: false, reason: 'placementDisabled', message: disabledReason, cell, hardErrors: [disabledReason], terrainAwareValidation: terrain };
    const placement = canPlaceWaypoint(this.app.state, this.app.state.selectedAgentId, { x: position.x, y: position.y, action: 'sample' });
    if (!placement.allowed) {
      const message = placement.message || 'Waypoint placement is not available for this route.';
      return { valid: false, allowed: false, commitAllowed: false, reason: placement.reason ?? 'routeRejected', message, cell, hardErrors: [message], estimate: placement.estimate ?? null, terrainAwareValidation: terrain };
    }
    const warnings = [...(terrain.warnings ?? []).map((entry) => entry.message), ...(validity.warning ? [validity.message] : []), ...(placement.estimate?.warnings ?? [])].filter(Boolean);
    const warningCodes = [...(terrain.warnings ?? []).map((entry) => entry.code), ...(placement.estimate?.warningCodes ?? [])];
    const beyondMissionWindow = warningCodes.includes('BEYOND_MISSION_WINDOW');
    return { valid: true, allowed: true, commitAllowed: true, status: warnings.length ? 'VALID_WITH_WARNINGS' : 'VALID', reason: warnings.length ? (beyondMissionWindow ? 'missionWindowWarning' : 'warning') : null, message: warnings[0] ?? 'Valid placement cell.', cell, warnings, warningCodes, estimate: placement.estimate ?? null, beyondMissionWindow, terrainAwareValidation: terrain };
  }

  setThreePlacementValidation(validation) {
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.placementValidation = validation;
  }

  findWaypointById(waypointId) {
    if (!waypointId) return null;
    for (const agentPlan of this.app.state.plan?.agentPlans ?? []) {
      const index = (agentPlan.waypoints ?? []).findIndex((waypoint) => waypoint.id === waypointId || waypoint.waypointId === waypointId);
      if (index >= 0) return { agentId: agentPlan.agentId, index, waypoint: agentPlan.waypoints[index] };
    }
    return null;
  }

  findSelectedWaypoint() {
    const selected = this.app.state.ui?.selectedWaypoint;
    if (!selected) return null;
    const waypoint = this.app.state.plan?.agentPlans?.find((plan) => plan.agentId === selected.agentId)?.waypoints?.[selected.index];
    return waypoint ? { agentId: selected.agentId, index: selected.index, waypoint } : null;
  }

  findMarkerById(markerId) {
    if (!markerId) return null;
    const index = (this.app.state.plan?.planningMarkers ?? []).findIndex((marker) => marker.id === markerId || marker.markerId === markerId);
    if (index < 0) return null;
    const marker = this.app.state.plan.planningMarkers[index];
    return { index, marker, agentId: marker.agentId ?? this.app.state.selectedAgentId };
  }

  findSelectedMarker() {
    const index = Number(this.app.state.ui?.selectedMarker?.index);
    if (!Number.isInteger(index)) return null;
    const marker = this.app.state.plan?.planningMarkers?.[index];
    return marker ? { index, marker, agentId: marker.agentId ?? this.app.state.selectedAgentId } : null;
  }

  findPriorityTargetById(targetId) {
    const active = getActivePriorityTargets(this.app.state.level, this.app.state.planningTime ?? 0);
    return active.find((target) => target.id === targetId || target.targetId === targetId) ?? null;
  }
  promptStartChange(agentId) {
    this.activatePlanningTool('selectDeploymentCell', { ...this.toolContextForAgent(agentId), selectedAgentId: agentId, deploymentAgentId: agentId, instructions: 'Click a valid drop-zone cell to set or change this glider start.' });
  }

  dragGliderStart(agentId, dragX, dragY) {
    if (!canPlaceGliderStarts(this.app.state.mission)) return;
    const cell = pointerToCell({ x: dragX, y: dragY }, this.app.adapter.layout);
    if (!cell) return;
    const validity = isValidWaypointCell(this.app.state.level, cell.x, cell.y);
    if (!validity.valid && validity.block) {
      this.app.toast(validity.message, 'warning');
      return;
    }
    if (!isValidDropCell(this.app.state.level, cell, this.app.state.mission, agentId)) {
      this.app.toast('Glider must be placed inside a valid drop zone.', 'warning');
      return;
    }
    const agent = this.app.state.mission.agents?.find((candidate) => candidate.id === agentId);
    if (!agent) return;
    if (agent.deployment?.mode === 'chooseFromZone' || agent.deployment?.mode === 'chooseFromZones') {
      const result = setSelectedStart(this.app.state.level, this.app.state.mission, this.app.state.plan, agentId, cell);
      if (!result.valid) {
        this.app.toast(result.message, 'warning');
        return;
      }
    } else {
      agent.start = { x: cell.x, y: cell.y };
      agent.deployment ??= { mode: 'fixedStart', zoneId: null, selectedStart: { x: cell.x, y: cell.y } };
      agent.deployment.selectedStart = { x: cell.x, y: cell.y };
    }
    this.app.state.surfacedAgents = (this.app.state.surfacedAgents ?? []).filter((candidate) => candidate.id !== agentId);
    this.app.state.ui.hoverCell = null;
    this.selectGlider(agentId);
  }


  currentCoordinateProfileId() {
    return this.app.state.plan?.coordinateProfileId
      ?? this.app.state.plan?.meta?.coordinateProfileId
      ?? this.app.state.mission?.meta?.coordinateProfileId
      ?? this.app.state.level?.meta?.coordinateProfileId
      ?? (this.app.state.mission?.meta?.waterColumnConfigSource === 'generatedModernMission' || this.app.state.level?.meta?.waterColumnConfigSource === 'generatedModernMission' ? 'continuousGridV1' : 'legacyIntegerCellsV1');
  }

  currentFieldSamplingProfileId() {
    return this.app.state.plan?.fieldSamplingProfileId
      ?? this.app.state.plan?.meta?.fieldSamplingProfileId
      ?? (this.currentCoordinateProfileId() === 'continuousGridV1' ? 'continuousTrilinearV1' : 'legacyNearestCellV1');
  }

  currentWaypointSnapMode(intent = null) {
    const configured = this.app.state.ui?.waypointSnapMode ?? this.app.state.ui?.threeMissionInteraction?.waypointSnapMode ?? null;
    if (intent?.modifiers?.shiftKey) return 'snapToCellCenters';
    if (configured === 'freePlacement' || configured === 'snapToCellCenters' || configured === 'snapToFeature') return configured;
    return this.currentCoordinateProfileId() === 'continuousGridV1' ? 'freePlacement' : 'snapToCellCenters';
  }

  resolveWaypointPlacementPoint(intent = {}) {
    const cell = intent.gridCell ?? null;
    const continuous = intent.continuousPoint ?? cell?.continuousPoint ?? null;
    const mode = this.currentWaypointSnapMode(intent);
    this.app.state.ui ??= {};
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.waypointSnapMode = mode;
    this.app.state.ui.threeMissionInteraction.selectedWaypointPosition = continuous ? { x: continuous.x, y: continuous.y, coordinateFrame: continuous.coordinateFrame ?? 'continuousGridV1' } : null;
    this.app.state.ui.threeMissionInteraction.selectedWaypointContainingCell = cell ? { x: cell.x, y: cell.y, col: cell.col, row: cell.row } : null;
    if (mode === 'freePlacement' && this.currentCoordinateProfileId() === 'continuousGridV1' && continuous) {
      return {
        x: Number(continuous.x),
        y: Number(continuous.y),
        coordinateFrame: continuous.coordinateFrame ?? 'continuousGridV1',
        derivedCell: continuous.derivedCell ?? { col: cell?.col ?? Math.round(continuous.x), row: cell?.row ?? Math.round(continuous.y) }
      };
    }
    return {
      x: Math.round(Number(cell?.x ?? continuous?.x ?? 0)),
      y: Math.round(Number(cell?.y ?? continuous?.y ?? 0)),
      coordinateFrame: 'continuousGridV1',
      derivedCell: { col: Math.round(Number(cell?.x ?? continuous?.x ?? 0)), row: Math.round(Number(cell?.y ?? continuous?.y ?? 0)) }
    };
  }

  roundContinuousCoordinate(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(6)) : NaN;
  }
  addWaypointForSelected({ x, y, action, continuousPoint = null, legacyCell = null }) {
    if (this.previousWaypointSelected) {
      const agentPlan = getAgentPlan(this.app.state.plan, this.app.state.selectedAgentId);
      for (let i = this.app.state.ui.selectedWaypoint.index + 1; i < agentPlan.waypoints.length; i = i) {
        this.removeWaypointFromPanel(this.app.state.selectedAgentId, i);
      }
      this.previousWaypointSelected = false;
    }
    const coordinateProfileId = this.currentCoordinateProfileId();
    const snapMode = this.currentWaypointSnapMode();
    const freePlacement = coordinateProfileId === 'continuousGridV1' && snapMode === 'freePlacement';
    const targetX = freePlacement ? this.roundContinuousCoordinate(x) : Math.round(x);
    const targetY = freePlacement ? this.roundContinuousCoordinate(y) : Math.round(y);
    this.app.state.plan.coordinateProfileId ??= coordinateProfileId;
    this.app.state.plan.fieldSamplingProfileId ??= this.currentFieldSamplingProfileId();
    this.app.state.plan.meta ??= {};
    this.app.state.plan.meta.coordinateProfileId ??= coordinateProfileId;
    this.app.state.plan.meta.fieldSamplingProfileId ??= this.app.state.plan.fieldSamplingProfileId;
    if (requiresDeploymentSelection(this.app.state.mission, this.app.state.selectedAgentId)) {
      const message = 'Choose a deployment cell first.';
      this.app.toast(message, 'warning');
      return { ok: false, message };
    }
    const disabledReason = getPlacementDisabledReason(this.app.state, this.app.state.selectedAgentId);
    if (disabledReason) {
      const message = `Placement disabled: ${disabledReason}. Delete, move, reorder, or clear waypoints to repair the plan.`;
      this.app.toast(message, 'warning');
      return { ok: false, message };
    }
    const terrainValidation = validateTerrainAwareSurfaceWaypoint({ level: this.app.state.level, mission: this.app.state.mission, agentId: this.app.state.selectedAgentId, position: { x: targetX, y: targetY } });
    if (!terrainValidation.accepted) {
      const message = terrainValidation.hardErrors?.[0]?.message ?? 'Waypoint placement rejected by terrain validation.';
      this.app.toast(message, 'warning');
      return { ok: false, message, reason: terrainValidation.hardErrors?.[0]?.code ?? 'terrainRejected', terrainAwareValidation: terrainValidation };
    }
    if (terrainValidation.warnings?.length) this.app.toast(terrainValidation.warnings[0].message, 'warning');
    const validity = isValidWaypointCell(this.app.state.level, targetX, targetY);
    if (!validity.valid && validity.block) {
      this.app.toast(validity.message, 'warning');
      return { ok: false, message: validity.message };
    }
    if (validity.warning) this.app.toast(validity.message, 'warning');
    const placement = canPlaceWaypoint(this.app.state, this.app.state.selectedAgentId, { x: targetX, y: targetY, action });
    if (!placement.allowed) {
      const message = placement.message || 'Waypoint placement is not available for this route.';
      this.app.toast(message, 'warning');
      return { ok: false, message };
    }
    if (placement.estimate?.warnings?.length) {
      this.app.toast(placement.estimate.warnings[0], 'warning');
    }
    const warningCodes = placement.estimate?.warningCodes ?? [];
    const beyondMissionWindow = warningCodes.includes('BEYOND_MISSION_WINDOW');
    const waypoint = addWaypoint(this.app.state.plan, this.app.state.selectedAgentId, {
      window: placement.estimate.window,
      t: placement.estimate.arrivalTime,
      estimatedArrivalTime: placement.estimate.arrivalTime,
      missionDurationAtPlanning: placement.estimate.missionDurationAtPlanning ?? placement.estimate.missionDuration,
      likelyReachedWithinWindow: placement.estimate.likelyReachedWithinWindow !== false,
      warningCodes,
      warnings: placement.estimate?.warnings ?? [],
      validity: beyondMissionWindow ? { valid: true, reasons: ['waypoint_exceeds_mission_duration'] } : { valid: true, reasons: [] },
      runtimeBehavior: beyondMissionWindow ? 'truncate_at_mission_end' : undefined,
      riskSummary: placement.estimate?.segment?.riskSummary ?? null,
      energyMargin: placement.estimate?.remainingFuel,
      x: targetX,
      y: targetY,
      position: { x: targetX, y: targetY, coordinateFrame: continuousPoint?.coordinateFrame ?? 'continuousGridV1' },
      coordinateProfileId,
      fieldSamplingProfileId: this.currentFieldSamplingProfileId(),
      validationRadius: this.app.state.mission?.rules?.waypointValidationRadius ?? this.app.state.mission?.rules?.waypointTolerance ?? 0.35,
      legacyCell: legacyCell ? { col: legacyCell.col ?? legacyCell.x, row: legacyCell.row ?? legacyCell.y, x: legacyCell.x, y: legacyCell.y, compatibilityOnly: true } : null,
      kind: 'navigation',
      action
    });
    this.debugCoordinateWaypointPlaced({
      clickCell: legacyCell ?? { x: Math.round(targetX), y: Math.round(targetY) },
      storedWaypoint: waypoint
    });
    const absorbedMarker = absorbPlanningMarkersForWaypoint(this.app.state.plan, waypoint);
    const index = (this.app.state.plan.agentPlans.find((plan) => plan.agentId === this.app.state.selectedAgentId)?.waypoints?.length ?? 1) - 1;
    this.app.state.ui.selectedWaypoint = { agentId: this.app.state.selectedAgentId, index };
    this.app.state.ui.selectedMarker = null;
    this.afterPlanChanged(this.app.state.selectedAgentId, { selectedIndex: index });
    let message = 'Waypoint placed.';
    if (waypoint?.warnings?.some((warning) => String(warning).toLowerCase().includes('blocked'))) {
      message = 'Route preview is blocked by land; planning anchor stayed at the previous reachable point.';
      this.app.toast(message, 'warning');
    } else if (waypoint?.warnings?.some((warning) => String(warning).toLowerCase().includes('surfacing'))) {
      message = 'Waypoint is likely beyond the next surfacing window.';
      this.app.toast(message, 'warning');
    } else if (waypoint?.warningCodes?.includes('BEYOND_MISSION_WINDOW')) {
      message = 'Waypoint accepted with mission-window warning; it may remain pending or missed at mission end.';
      this.app.toast(message, 'warning');
    } else if (absorbedMarker) {
      message = 'Marker converted to waypoint.';
      this.app.toast(message, 'success');
    }
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
    return { ok: true, waypoint, index, agentId: this.app.state.selectedAgentId, message };
  }

  debugCoordinateHover(pointer, cell) {
    if (!globalThis.ANCHOR_DEBUG_COORDINATES || !cell) return;
    const canvasLocal = this.resolvePointerPoint(pointer);
    const layout = this.app.adapter?.layout;
    const worldPosition = layout ? {
      x: (canvasLocal.x - layout.ox) / layout.cell,
      y: (canvasLocal.y - layout.oy) / layout.cell
    } : null;
    globalThis.console?.debug?.('[CoordinateDebug][Hover]', {
      pointer: {
        x: Number(pointer?.x ?? pointer?.event?.clientX ?? NaN),
        y: Number(pointer?.y ?? pointer?.event?.clientY ?? NaN),
        clientX: Number(pointer?.event?.clientX ?? NaN),
        clientY: Number(pointer?.event?.clientY ?? NaN)
      },
      canvasLocal,
      worldPosition,
      hoverCell: cell,
      cellCenter: cellToCenterPosition(cell),
      terrainAtHoverCell: terrainAt(this.app.state.level, cell),
      navigability: isCellNavigable(this.app.state.level, this.app.state.mission, cell.x, cell.y)
    });
  }

  debugCoordinateWaypointPlaced({ clickCell, storedWaypoint }) {
    if (!globalThis.ANCHOR_DEBUG_COORDINATES) return;
    const displayCell = storedWaypoint ? {
      x: Math.round(Number(storedWaypoint.x)),
      y: Math.round(Number(storedWaypoint.y))
    } : null;
    globalThis.console?.debug?.('[CoordinateDebug][WaypointPlaced]', {
      clickCell,
      storedWaypoint,
      displayCell,
      validationPosition: displayCell ? cellToCenterPosition(displayCell) : null,
      terrainAtWaypoint: displayCell ? terrainAt(this.app.state.level, displayCell) : null,
      navigability: displayCell ? isCellNavigable(this.app.state.level, this.app.state.mission, displayCell.x, displayCell.y) : null
    });
  }

  addMarkerForSelected({ x, y }) {
    const agentId = this.app.state.selectedAgentId ?? this.app.state.mission?.agents?.[0]?.id ?? null;
    const coordinateProfileId = this.currentCoordinateProfileId();
    const snapMode = this.currentWaypointSnapMode();
    const freePlacement = coordinateProfileId === 'continuousGridV1' && snapMode === 'freePlacement';
    const targetX = freePlacement ? this.roundContinuousCoordinate(x) : Math.round(x);
    const targetY = freePlacement ? this.roundContinuousCoordinate(y) : Math.round(y);
    this.app.state.plan.coordinateProfileId ??= coordinateProfileId;
    this.app.state.plan.fieldSamplingProfileId ??= this.currentFieldSamplingProfileId();
    this.app.state.plan.meta ??= {};
    this.app.state.plan.meta.coordinateProfileId ??= coordinateProfileId;
    this.app.state.plan.meta.fieldSamplingProfileId ??= this.app.state.plan.fieldSamplingProfileId;
    const validity = isValidWaypointCell(this.app.state.level, targetX, targetY);
    if (!validity.valid && validity.block) {
      const message = validity.message.replace('Waypoints', 'Markers');
      this.app.toast(message, 'warning');
      return { ok: false, message };
    }
    if (validity.warning) this.app.toast('Marker placed inside a hazard cell.', 'warning');
    const target = findPriorityTargetNearCell(this.app.state.level, this.app.state.planningTime, targetX, targetY);
    const inspection = inspectCellAtTime({
      level: this.app.state.level,
      mission: this.app.state.mission,
      state: this.app.state,
      x: targetX,
      y: targetY,
      t: this.app.state.planningTime
    });
    const marker = addMarker(this.app.state.plan, agentId, {
      x: targetX,
      y: targetY,
      t: this.app.state.planningTime,
      window: this.app.state.selectedWindow,
      type: target ? 'priorityTargetMarker' : 'futureTarget',
      executable: false,
      label: target?.label ?? (inspection?.roiValue > 0 ? 'Future sample' : 'Planning Marker'),
      linkedTargetId: target?.id ?? null,
      roiValueAtPlacement: inspection?.roiValue ?? null,
      priorityValueAtPlacement: target?.value ?? null
    });
    recomputePlanningMarkerReachability(this.app.state, agentId);
    const markerIndex = (this.app.state.plan.planningMarkers?.length ?? 1) - 1;
    this.app.state.ui.selectedMarker = { index: markerIndex, markerId: marker?.id ?? null };
    this.app.state.ui.selectedWaypoint = null;
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
    const message = target ? `Marker linked to ${target.label ?? target.id}.` : 'Planning marker added.';
    this.app.toast(message, 'success');
    return { ok: true, marker, index: markerIndex, agentId, message };
  }

  togglePlacementMode() {
    this.app.state.ui.placementMode = this.app.state.ui.placementMode === 'marker' ? 'waypoint' : 'marker';
    if (this.app.state.ui.placementMode !== 'marker') this.app.mapHoverTooltip?.hide();
    this.refreshPanels();
    this.app.toast(`Placement mode: ${this.app.state.ui.placementMode === 'marker' ? 'Planning Marker' : 'Waypoint'}.`, 'info');
  }

  clearSelectedAgentMarkers() {
    clearAgentMarkers(this.app.state.plan, this.app.state.selectedAgentId);
    this.app.state.ui.selectedMarker = null;
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
  }

  convertMarkerFromPanel(agentId, index) {
    this.app.state.selectedAgentId = agentId;
    const waypoint = convertMarkerToWaypoint(this.app.state.plan, agentId, index);
    if (!waypoint) return;
    const selectedIndex = (this.app.state.plan.agentPlans.find((plan) => plan.agentId === agentId)?.waypoints?.length ?? 1) - 1;
    this.app.state.ui.selectedWaypoint = { agentId, index: selectedIndex };
    this.app.state.ui.selectedMarker = null;
    this.afterPlanChanged(agentId, { selectedIndex });
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
    this.app.toast('Marker converted to executable waypoint.', 'success');
  }

  deleteMarkerFromPanel(agentId, index) {
    removeMarker(this.app.state.plan, agentId, index);
    if (this.app.state.ui.selectedMarker?.index === index) {
      this.app.state.ui.selectedMarker = null;
    }
    recomputePlanningMarkerReachability(this.app.state, agentId);
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
  }

  focusMarkerTime(index) {
    const marker = this.app.state.plan?.planningMarkers?.[index];
    if (!marker) return;
    this.app.state.ui.selectedMarker = { index };
    this.app.state.ui.selectedWaypoint = null;
    this.app.state.planningTime = clampMissionTime(this.app.state.level, marker.t);
    this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.app.state.planningTime);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
    this.refreshPanels();
    this.refreshMap();
  }

  focusWaypointFromTimeline(agentId, index) {
    const waypoint = this.app.state.plan?.agentPlans?.find((plan) => plan.agentId === agentId)?.waypoints?.[index];
    if (!waypoint) return;
    this.selectWaypoint(agentId, index);
    const nextTime = waypoint.estimatedArrivalTime ?? waypoint.t;
    if (Number.isFinite(Number(nextTime))) {
      this.app.state.planningTime = clampMissionTime(this.app.state.level, Number(nextTime));
      this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.app.state.planningTime);
      applyPlanningAnchor(this.app.state, agentId, { selectedIndex: index });
      this.refreshPanels();
      this.refreshMap();
    }
  }

  async importPlanFile(file) {
    if (!file) return;
    try {
      this.applyImportedPlanJson(await readJSONFile(file), { source: 'file' });
    } catch (error) {
      this.app.toast(`Plan import failed: ${error.message ?? error}`, 'error');
    }
  }

  async loadBuiltInDemoPlan() {
    const demo = this.app.state.level?.tutorial?.importDemo;
    const planUrl = demo?.planUrl;
    if (!planUrl) return this.app.toast?.('No built-in demo plan is configured for this tutorial.', 'warning');
    try {
      await this.applyImportedPlanJson(await loadJSON(planUrl), { source: 'builtInDemo', demo });
    } catch (error) {
      this.app.toast?.(`Demo plan load failed: ${error.message ?? error}`, 'error');
    }
  }

  async downloadBuiltInDemoPlan() {
    const demo = this.app.state.level?.tutorial?.importDemo;
    const planUrl = demo?.planUrl;
    if (!planUrl) return this.app.toast?.('No built-in demo plan is configured for this tutorial.', 'warning');
    try {
      downloadJSON(demo.planFilename ?? 'import-demo-waypoints.json', await loadJSON(planUrl));
      this.app.toast?.('Demo plan JSON downloaded.', 'success');
    } catch (error) {
      this.app.toast?.(`Demo plan download failed: ${error.message ?? error}`, 'error');
    }
  }

  applyImportedPlanJson(json, { source = 'file', demo = null } = {}) {
    const imported = importPlanJson(json, {
      level: this.app.state.level,
      mission: this.app.state.mission
    });
    if (!imported.canImport || !imported.ok) {
      this.showPlanImportSummary(imported);
      return false;
    }
    const normalized = imported.plan;
    const validation = validatePlan(normalized, this.app.state.mission);
    if (!validation.valid) {
      this.app.toast(`Plan import failed: ${validation.errors[0]}`, 'error');
      return false;
    }
    const identityMatch = planMatchesLevel(normalized, this.app.state.level);
    const tutorialActive = Boolean(this.app.state.level?.tutorial?.importDemo);
    if (identityMatch === false && !tutorialActive) {
      const proceed = globalThis.confirm?.(`Imported plan instance ${shortInstanceId(normalized.instanceId ?? normalized.meta?.levelIdentity?.instanceId)} differs from active instance ${shortInstanceId(this.app.state.level)}. Import anyway?`);
      if (!proceed) {
        this.app.toast('Plan import cancelled.', 'info');
        return false;
      }
    }
    normalized.meta ??= {};
    if (source === 'builtInDemo' || normalized.planner?.type === 'demo' || normalized.meta.source === 'tutorialDemo') {
      normalized.meta.name = normalized.meta.name ?? demo?.label ?? 'Tutorial Demo Plan';
      normalized.meta.source = 'tutorialDemo';
      normalized.importMetadata ??= {};
      normalized.importMetadata.demoPlan = true;
      normalized.importMetadata.importSource = source;
    }
    this.app.state.plan = normalized;
    this.app.state.importedPlanSummary = imported.summary;
    this.app.state.importedPlanMetadata = normalized.importMetadata ?? null;
    recomputeAllWaypointTiming(this.app.state);
    recomputePlanningMarkerReachability(this.app.state);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
    this.app.state.currentPlanSource = normalized.planner?.usesOracle
      ? 'oracleSolver'
      : normalized.meta?.solver || normalized.meta?.source === 'solver' || normalized.meta?.source === 'importedSolver' || normalized.meta?.source === 'tutorialDemo' || normalized.planner
        ? 'importedSolver'
        : 'manual';
    this.syncPlannerBenchmarkPlanContext(this.app.state.currentPlanSource);
    if (this.app.state.currentPlanSource === 'importedSolver' || this.app.state.currentPlanSource === 'oracleSolver') this.app.state.solverPlan = this.app.state.plan;
    else this.app.state.manualPlan = this.app.state.plan;
    this.clearSelectedWaypoint();
    this.refreshPanels();
    this.refreshMap();
    if (identityMatch === true) this.app.toast(`Plan matches active instance ${shortInstanceId(this.app.state.level)}.`, 'success');
    else if (identityMatch === false) this.app.toast(`Plan identity differs from active tutorial, but coordinates are compatible and were imported.`, 'warning');
    const unknown = getUnknownAgentIds(normalized, this.app.state.mission);
    if (unknown.length) this.app.toast(`Imported plan has unknown agentId: ${unknown.join(', ')}`, 'warning');
    this.showPlanImportSummary(imported);
    return true;
  }

  clearImportedPlan() {
    this.app.state.plan = createEmptyPlan(this.app.state.level, this.app.state.mission);
    this.app.state.currentPlanSource = 'manual';
    this.syncPlannerBenchmarkPlanContext('manual');
    this.syncAdaptiveBenchmarkPlanContext();
    this.app.state.manualPlan = this.app.state.plan;
    this.app.state.solverPlan = null;
    this.app.state.importedPlanSummary = null;
    this.app.state.importedPlanMetadata = null;
    normalizeDeploymentState(this.app.state.level, this.app.state.mission, this.app.state.plan);
    recomputeAllWaypointTiming(this.app.state);
    recomputePlanningMarkerReachability(this.app.state);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
    this.clearSelectedWaypoint();
    this.refreshPanels();
    this.refreshMap();
    this.app.toast?.('Imported plan cleared.', 'info');
  }

  syncMissionOptionsFromMission() {
    const existing = this.app.state.missionOptions ?? this.app.state.mission?.rules?.missionOptions ?? {};
    this.app.state.missionOptions = {
      ignoreUpdateEvents: Boolean(existing.ignoreUpdateEvents ?? this.app.state.mission?.rules?.missionOptions?.ignoreUpdateEvents ?? false)
    };
    this.applyMissionOptionsToMission();
  }

  applyMissionOptionsToMission() {
    this.app.state.missionOptions ??= { ignoreUpdateEvents: false };
    this.app.state.mission ??= {};
    this.app.state.mission.rules ??= {};
    this.app.state.mission.rules.missionOptions = {
      ...(this.app.state.mission.rules.missionOptions ?? {}),
      ignoreUpdateEvents: Boolean(this.app.state.missionOptions.ignoreUpdateEvents)
    };
  }

  toggleIgnoreUpdateEvents() {
    this.app.state.missionOptions ??= { ignoreUpdateEvents: false };
    this.app.state.missionOptions.ignoreUpdateEvents = !this.app.state.missionOptions.ignoreUpdateEvents;
    this.applyMissionOptionsToMission();
    this.refreshPanels();
    this.refreshMap();
    this.app.toast?.(
      this.app.state.missionOptions.ignoreUpdateEvents
        ? 'Update events ignored. Continuous run mode enabled.'
        : 'Update events respected.',
      this.app.state.missionOptions.ignoreUpdateEvents ? 'warning' : 'info'
    );
  }

  resolveBestPriorRunVm(action) {
    if (!this.app.state.bestPriorRunVm) this.refreshBestPriorPath();
    const vm = this.app.state.bestPriorRunVm;
    const payload = bestPriorRunLogPayload(vm, {
      action,
      hasBestPriorRun: Boolean(vm?.bestPriorRun),
      hasCurrentScene: Boolean(this),
      currentSceneKey: this.scene?.key ?? this.sys?.settings?.key ?? 'MissionWorkspaceScene'
    });
    debugBestPath('Dispatch', payload);
    debugBestPath(action, payload);
    return vm;
  }

  showBestPathOverlay(show) {
    const vm = this.resolveBestPriorRunVm(show ? 'show-best-path' : 'hide-best-path');
    if (show && !vm?.canShowBestPath) {
      return this.app.toast?.(bestPathActionError('show', vm), 'warning');
    }
    this.app.state.ui.showBestPathOverlay = Boolean(show);
    this.app.state.bestPriorPath = vm.bestPriorRun;
    this.refreshPanels();
    this.refreshMap();
    this.app.toast?.(show ? 'Best path overlay shown.' : 'Best path overlay hidden.', show ? 'success' : 'info');
  }

  loadBestPathAsPlan() {
    const vm = this.resolveBestPriorRunVm('load-best-path-as-plan');
    if (!vm?.canLoadBestPathAsPlan) return this.app.toast?.(bestPathActionError('load', vm), 'warning');
    const plan = cloneJson(vm.plannedWaypoints);
    this.app.state.plan = normalizePlan(plan, this.app.state.level, this.app.state.mission);
    this.app.state.plan.meta ??= {};
    this.app.state.plan.meta.source = 'loadedFromBestPriorRun';
    this.app.state.plan.meta.name = `Best Prior Path (${formatScore(vm.bestPriorRun?.bestScore)})`;
    this.app.state.plan.meta.originalAttemptId = vm.attemptId;
    this.app.state.plan.meta.replaySeedAnchor = vm.replaySeedAnchor;
    this.app.state.plan.meta.generationVersion = vm.generationVersion;
    this.app.state.currentPlanSource = 'loadedFromBestPriorRun';
    this.app.state.loadedBestPriorPlan = cloneJson(this.app.state.plan);
    recomputeAllWaypointTiming(this.app.state);
    recomputePlanningMarkerReachability(this.app.state);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
    this.clearSelectedWaypoint();
    const routeAudit = this.refreshRouteAudit();
    if (routeAudit?.ok === false) {
      const validation = validatePlanForExecution({
        level: this.app.state.level,
        mission: this.app.state.mission,
        plan: this.app.state.plan
      });
      const issue = firstBlockingRouteIssue(validation);
      this.focusRouteIssue(issue);
      this.refreshPanels();
      this.refreshMap();
      this.showRouteValidationModal(issue, validation);
      return;
    }
    this.refreshPanels();
    this.refreshMap();
    this.app.toast?.('Best path loaded as plan.', 'success');
  }

  rerunBestPath() {
    const vm = this.resolveBestPriorRunVm('rerun-best-path');
    if (!vm?.canRerunBestPath) return this.app.toast?.(bestPathActionError('rerun', vm), 'warning');
    if (vm.challengeSnapshot?.level && vm.challengeSnapshot?.mission) {
      this.app.state.level = cloneJson(vm.challengeSnapshot.level);
      this.app.state.mission = cloneJson(vm.challengeSnapshot.mission);
    }
    const plan = cloneJson(vm.plannedWaypoints);
    const normalized = normalizePlan(plan, this.app.state.level, this.app.state.mission);
    normalized.meta ??= {};
    normalized.meta.source = 'bestPriorRerun';
    normalized.meta.name = `Best Prior Path Rerun (${formatScore(vm.bestPriorRun?.bestScore)})`;
    normalized.meta.originalAttemptId = vm.attemptId;
    normalized.meta.replaySeedAnchor = vm.replaySeedAnchor;
    normalized.meta.generationVersion = vm.generationVersion;
    this.app.state.planBeforeBestRerun = cloneJson(this.app.state.plan);
    this.app.state.planSourceBeforeBestRerun = this.app.state.currentPlanSource;
    this.app.state.bestPriorRerun = {
      attemptId: vm.attemptId,
      originalScore: vm.bestPriorRun?.bestScore,
      rerunUnderCurrentChallenge: true,
      replaySeedAnchor: vm.replaySeedAnchor,
      generationVersion: vm.generationVersion
    };
    this.app.state.plan = normalized;
    this.app.state.currentPlanSource = 'bestPriorRerun';
    this.app.toast?.('Rerunning best path.', 'info');
    this.executePlan();
  }

  exportBestPath() {
    const vm = this.resolveBestPriorRunVm('export-best-path');
    if (!vm?.canExportBestPath) return this.app.toast?.(bestPathActionError('export', vm), 'warning');
    const plan = cloneJson(vm.plannedWaypoints ?? {});
    plan.source = 'bestPriorRun';
    plan.attemptId = vm.attemptId;
    plan.challengeId = vm.challengeId;
    plan.replaySeedAnchor = vm.replaySeedAnchor;
    plan.generationVersion = vm.generationVersion;
    plan.generationConfig = cloneJson(vm.replaySeedContract?.generationConfig ?? this.app.state.level?.meta?.generationConfig ?? null);
    plan.derivedSeeds = cloneJson(vm.replaySeedContract?.derivedSeeds ?? null);
    plan.replaySeedContract = cloneJson(vm.replaySeedContract);
    plan.exactReplay = {
      available: vm.exactReplayAvailable,
      method: vm.diagnostics?.method ?? null,
      reason: vm.diagnostics?.reason ?? null
    };
    plan.routeExecution = {
      frames: cloneJson(vm.actualPathFrames ?? []),
      events: cloneJson(vm.actualPathEvents ?? [])
    };
    plan.bestPathRecord = {
      attemptId: vm.attemptId,
      challengeId: vm.challengeId,
      replayStatus: vm.replayStatus,
      plannedPathAvailable: vm.plannedPathAvailable,
      actualPathAvailable: vm.actualPathAvailable,
      missingFields: cloneJson(vm.missingFields)
    };
    plan.meta = {
      ...(plan.meta ?? {}),
      source: 'bestPriorRun',
      originalAttemptId: vm.attemptId,
      originalScore: vm.bestPriorRun?.bestScore,
      originalPlannerLabel: vm.attempt?.label ?? vm.plannedWaypoints?.meta?.name ?? null,
      challengeId: plan.challengeId,
      replaySeedAnchor: plan.replaySeedAnchor,
      generationVersion: plan.generationVersion,
      generationConfig: cloneJson(plan.generationConfig),
      derivedSeeds: cloneJson(plan.derivedSeeds),
      exactReplay: cloneJson(plan.exactReplay),
      challengeName: this.app.state.level?.meta?.name ?? this.app.state.level?.name ?? null,
      pathType: vm.actualPathAvailable ? 'planned+actual' : 'planned',
      pathSummary: vm.bestPriorRun?.bestPathSummary ?? null
    };
    downloadJSON(`anchor-best-path-${shortInstanceId(this.app.state.level)}-${vm.attemptId ?? 'attempt'}.json`, plan);
    this.app.toast?.('Best path exported.', 'success');
  }

  showPlanImportSummary(imported) {
    const summary = imported?.summary;
    const routeAudit = this.app.state.ui?.routeAudit ?? imported?.plan?.importMetadata?.routeAudit ?? null;
    const demoPlan = Boolean(imported?.plan?.importMetadata?.demoPlan || imported?.plan?.planner?.type === 'demo' || imported?.plan?.meta?.source === 'tutorialDemo');
    const lines = summary ? [
      `Planner: ${summary.plannerName}`,
      `Mode: ${summary.executionMode}`,
      `Agents: ${summary.agents}`,
      `Waypoints: ${summary.waypointCount}`,
      `Uses Forecast: ${summary.usesForecast ? 'yes' : 'no'}`,
      `Uses Hidden Truth: ${summary.usesTruth || summary.usesOracle ? 'yes' : 'no'}`,
      `Source: ${demoPlan ? 'tutorial demo JSON' : 'external JSON'}`,
      `Surface Segments: ${summary.surfaceSegments}`,
      `Validation: ${summary.validation}`,
      `Route Audit: ${routeAudit ? (routeAudit.ok === false ? 'failed' : 'passed') : 'not run'}`,
      ...(summary.usesOracle ? ['Warning: This plan used hidden truth/oracle data.'] : []),
      ...((summary.errors ?? []).slice(0, 4).map((item) => `Error: ${item}`)),
      ...((summary.warnings ?? []).slice(0, 6).map((item) => `Warning: ${item}`))
    ] : imported?.errors ?? ['Plan import failed.'];
    this.modal.show({
      title: summary?.title ?? 'Plan Import',
      body: lines.join('\n'),
      buttons: [{ label: 'Close', onClick: () => this.modal.hide() }]
    });
  }

  setPlanningTime(time) {
    this.app.state.planningTime = clampMissionTime(this.app.state.level, time);
    this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.app.state.planningTime);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
    this.refreshPanels();
    this.refreshMap();
  }

  setActiveWindow(windowIndex) {
    const bounded = Math.max(0, Math.min(getPlanningWindowCount(this.app.state.level) - 1, Number(windowIndex) || 0));
    this.setPlanningTime(getWindowStartTime(this.app.state.level, bounded));
  }

  setTimelineFrame(frameIndex) {
    this.app.state.planningTime = clampMissionTime(this.app.state.level, getTimelineFrameTime(this.app.state.level, this.app.state.mission, frameIndex));
    this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.app.state.planningTime);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
    this.refreshPanels();
    this.refreshMap();
  }

  getAgentAtCell(cell) {
    const surfaced = (this.app.state.surfacedAgents ?? []).find((agent) => Math.round(agent.x) === cell.x && Math.round(agent.y) === cell.y);
    if (surfaced) return this.app.state.mission.agents?.find((agent) => agent.id === surfaced.id) ?? null;
    return getAgentStartAtCell(this.app.state.mission, cell.x, cell.y);
  }

  clearSelectedWaypoint() {
    this.app.state.ui.selectedWaypoint = null;
  }

  clearPlanningPreviewState() {
    clearPlanningOverlayState(this.app.state);
    this.clearPlanningOverlayObjects();
  }

  afterPlanChanged(agentId, { selectedIndex = null } = {}) {
    recomputeAgentWaypointTiming(this.app.state, agentId);
    recomputePlanningMarkerReachability(this.app.state, agentId);
    const anchor = applyPlanningAnchor(this.app.state, agentId, { selectedIndex });
    const waypoint = Number.isInteger(selectedIndex)
      ? this.app.state.plan?.agentPlans?.find((plan) => plan.agentId === agentId)?.waypoints?.[selectedIndex]
      : null;
    const invalid = waypoint?.validity && waypoint.validity.valid === false;
    const nextTime = invalid ? anchor?.t : waypoint?.estimatedArrivalTime ?? anchor?.t;
    if (Number.isFinite(Number(nextTime))) {
      this.app.state.planningTime = clampMissionTime(this.app.state.level, Number(nextTime));
      this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.app.state.planningTime);
      applyPlanningAnchor(this.app.state, agentId, { selectedIndex: invalid ? null : selectedIndex });
    }
  }

  markManualPlan() {
    this.app.state.currentPlanSource = 'manual';
    this.syncPlannerBenchmarkPlanContext('manual');
    this.syncAdaptiveBenchmarkPlanContext();
    this.app.state.manualPlan = this.app.state.plan;
  }

  syncPlannerBenchmarkPlanContext(routeSource = 'manual') {
    const context = extractPlannerBenchmarkContextFromState(this.app.state);
    if (!context || !this.app.state.plan) return null;
    const attemptSource = attemptSourceFromRouteSourceLabel(routeSource);
    const attemptContext = derivePlannerBenchmarkAttemptContext({
      ...context,
      attemptSource,
      routeSourceLabel: routeSource
    });
    this.app.state.benchmarkRuntimeContext = attemptContext;
    this.app.state.benchmarkModeConfig = attemptContext.benchmarkModeConfig;
    this.app.state.benchmarkEpisode = {
      ...(this.app.state.benchmarkEpisode ?? {}),
      episodeId: attemptContext.episodeId,
      phase: 'planning',
      activeAttemptSource: attemptContext.activeAttemptSource,
      activeObjective: attemptContext.activeObjective,
      updatedAt: new Date().toISOString()
    };
    this.app.state.plan = attachBenchmarkMetadataToPlan(this.app.state.plan, attemptContext);
    return attemptContext;
  }

  syncAdaptiveBenchmarkPlanContext() {
    const context = deriveAdaptiveBenchmarkContextFromState(this.app.state);
    if (!context || !this.app.state.plan) return null;
    const updatedAt = new Date().toISOString();
    this.app.state.adaptiveBenchmarkRuntimeContext = context;
    this.app.state.benchmarkRuntimeContext = context;
    this.app.state.benchmarkModeConfig = context.benchmarkModeConfig;
    this.app.state.adaptiveManagerConfig = context.adaptiveManagerConfig;
    this.app.state.adaptiveManagerState = context.adaptiveManagerState;
    this.app.state.benchmarkEpisode = {
      ...(this.app.state.benchmarkEpisode ?? {}),
      episodeId: context.episodeId,
      benchmarkMode: 'adaptiveBenchmark',
      phase: 'planning',
      activeObjective: context.activeObjective,
      activeLegIndex: context.activeLegIndex,
      updatedAt
    };
    const plan = attachBenchmarkMetadataToPlan(this.app.state.plan, context);
    plan.meta ??= {};
    plan.meta.adaptiveBenchmark = {
      version: context.version,
      episodeId: context.episodeId,
      benchmarkMode: 'adaptiveBenchmark',
      activeLegIndex: context.activeLegIndex,
      activeObjective: context.activeObjective,
      adaptiveManagerConfig: context.adaptiveManagerConfig,
      adaptiveManagerState: context.adaptiveManagerState,
      objectiveAuthority: context.objectiveAuthority,
      routeAuthority: context.routeAuthority,
      informationAccessTier: context.informationAccessTier,
      worldModelTier: context.worldModelTier,
      updatedAt
    };
    this.app.state.plan = plan;
    return context;
  }
  isSurfacingReplanMode() {
    return Boolean(this.app?.state?.surfacingReplanHandoff?.type === 'anchor.planning.surfacing-replan-handoff'
      || this.app?.state?.surfaceDecision?.mode === 'editingFutureWaypoints');
  }

  cancelSurfacingReplan() {
    const handoff = normalizeSurfacingReplanHandoff(this.app.state.surfacingReplanHandoff);
    if (!handoff) {
      this.app.toast?.('No active surface replan to cancel.', 'warning');
      return;
    }
    const transaction = cancelSurfacingReplanTransaction(this.app.state.surfacingDecisionTransaction, {
      time: handoff.simulationTime,
      source: 'missionWorkspaceCancel'
    });
    this.app.state.plan = cloneJson(handoff.sourcePlan ?? this.app.state.plan);
    if (this.app.state.currentPlanSource === 'manual') this.app.state.manualPlan = this.app.state.plan;
    this.app.state.simulationResume = cloneJson(handoff.resumeState ?? this.app.state.simulationResume);
    const pendingDecision = this.app.state.simulationResume?.awaitingSurfaceDecision ?? null;
    this.app.state.surfaceDecision = {
      ...(this.app.state.surfaceDecision ?? pendingDecision ?? {}),
      active: true,
      status: SURFACING_DECISION_STATUS.PENDING,
      mode: null,
      ui: { modalVisible: false, fallbackVisible: false, uiMounted: false }
    };
    this.app.state.surfacingReplanHandoff = null;
    this.app.state.surfacingDecisionTransaction = transaction;
    this.app.state.lastSurfacingDecisionTransaction = transaction;
    this.app.state.pendingSurfacingResumePlay = false;
    this.app.state.mode = 'simulation';
    clearPlanningOverlayState(this.app.state);
    this.publishSurfacingReplanDebug({ currentStage: 'cancelled', transaction, handoff });
    this.scene.start('SimulationScene');
  }

  prepareSurfacingReplanCommit({ snapshot = null } = {}) {
    const handoff = normalizeSurfacingReplanHandoff(this.app.state.surfacingReplanHandoff);
    if (!handoff) return null;
    const validation = validateSurfacingReplanHandoff(handoff);
    if (!validation.ok) {
      throw new Error(validation.errors[0] ?? 'Surface replan handoff is invalid.');
    }
    let transaction = commitSurfacingReplan(this.app.state.surfacingDecisionTransaction, {
      time: handoff.simulationTime,
      source: 'missionWorkspaceCommit',
      planDigest: snapshot?.planDigest ?? null
    });
    const committedResume = commitSurfacingReplanResumeState(this.app.state.simulationResume ?? handoff.resumeState, {
      decisionState: this.app.state.surfaceDecision,
      transaction,
      updatePenalty: this.app.state.mission?.rules?.communication?.updatePenalty ?? this.app.state.mission?.rules?.updatePenalty ?? null,
      action: SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS
    });
    this.app.state.simulationResume = committedResume;
    if (snapshot) {
      snapshot.simulationResume = committedResume;
      snapshot.surfacingReplan = surfacingReplanHandoffSummary(handoff);
    }
    this.app.state.lastSurfacingReplanHandoff = handoff;
    this.app.state.lastSurfacingDecisionTransaction = transaction;
    this.app.state.surfacingDecisionTransaction = transaction;
    this.app.state.surfacingReplanHandoff = null;
    this.app.state.surfaceDecision = null;
    this.app.state.pendingSurfacingResumePlay = true;
    this.publishSurfacingReplanDebug({ currentStage: 'committed', transaction, handoff, committedResume });
    return { transaction, handoff, committedResume, validation };
  }

  publishSurfacingReplanDebug(patch = {}) {
    const transaction = patch.transaction ?? this.app.state.surfacingDecisionTransaction ?? this.app.state.lastSurfacingDecisionTransaction ?? null;
    const handoff = patch.handoff ?? this.app.state.surfacingReplanHandoff ?? this.app.state.lastSurfacingReplanHandoff ?? null;
    const debug = {
      version: 'surface-r1',
      active: this.isSurfacingReplanMode(),
      currentStage: patch.currentStage ?? (handoff ? 'editingFutureWaypoints' : 'idle'),
      handoffSummary: handoff ? surfacingReplanHandoffSummary(handoff) : null,
      transactionSummary: transaction ? surfacingDecisionTransactionSummary(transaction) : null,
      hasPendingResumeState: Boolean((patch.committedResume ?? this.app.state.simulationResume)?.awaitingSurfaceDecision),
      pendingSurfacingResumePlay: this.app.state.pendingSurfacingResumePlay === true,
      startsNewMission: false,
      usesNewPlanner: false,
      changesOfficialBrowserScoring: false,
      rendererOwnsSimulationState: false
    };
    globalThis.ANCHOR_SURFACING_REPLAN_DEBUG = debug;
    return debug;
  }
  handleExecuteControlAction(source = 'missionConsole') {
    const control = this.executeControlState();
    this.executeControlClickCount += 1;
    if (this.executeLaunchInProgress) {
      this.duplicateExecuteDispatchCount += 1;
      this.lastExecuteControlDispatch = { source, duplicate: true, control, at: new Date().toISOString() };
      this.publishExecutionDebug({ currentStage: this.executionTransaction?.currentStage ?? 'executeRequested' });
      return;
    }
    this.lastExecuteControlDispatch = { source, duplicate: false, control, at: new Date().toISOString() };
    this.executePlan({ source });
  }

  executeControlState() {
    const root = globalThis.document?.getElementById?.('mission-console') ?? this.app?.elements?.consoleRoot ?? null;
    const execute = root?.querySelector?.('[data-action="execute"]') ?? null;
    const routeAudit = this.app?.state?.ui?.routeAudit ?? null;
    const terrainReadiness = this.app?.state?.ui?.missionReadiness ?? null;
    const routeBlocked = routeAudit?.ok === false;
    const terrainBlocked = terrainReadiness?.executable === false;
    return {
      executeControlPresent: Boolean(execute),
      executeControlEnabled: Boolean(execute && !execute.disabled && !routeBlocked && !terrainBlocked),
      executeControlDisabledReason: execute?.disabled
        ? execute.title || 'Execute control is disabled.'
        : routeBlocked
          ? ((routeAudit.errors ?? routeAudit.issues ?? [])[0]?.message ?? (routeAudit.errors ?? [])[0] ?? 'Review route validation before simulation.')
          : terrainBlocked
            ? (terrainReadiness?.firstIssue?.message ?? 'Review terrain-aware mission readiness before simulation.')
            : null,
      executeControlBindCount: this.executeControlBindCount,
      executeControlClickCount: this.executeControlClickCount,
      duplicateExecuteDispatchCount: this.duplicateExecuteDispatchCount
    };
  }

  publishExecutionDebug(patch = {}) {
    const transaction = patch.transaction ?? this.executionTransaction ?? this.app?.state?.executionTransaction ?? null;
    const transactionSummary = transaction ? missionExecutionTransactionSummary(transaction) : null;
    const snapshot = patch.snapshot ?? this.app?.state?.executionSnapshot ?? null;
    const launchPayload = patch.launchPayload ?? this.app?.state?.executionLaunchPayload ?? null;
    const planSummary = patch.planSummary ?? snapshot?.planSummary ?? launchPayload?.planSummary ?? null;
    const control = this.executeControlState();
    const planningDigest = patch.planningPlanDigest ?? snapshot?.planDigest ?? null;
    const launchDigest = patch.launchPlanDigest ?? launchPayload?.planDigest ?? null;
    globalThis.ANCHOR_EXECUTION_DEBUG = {
      version: 'three-r1-1d',
      transactionId: transaction?.transactionId ?? launchPayload?.transactionId ?? null,
      currentStage: patch.currentStage ?? transaction?.currentStage ?? null,
      completedStages: transactionSummary?.completedStages ?? [],
      failureStage: transaction?.failureStage ?? null,
      failureReason: transaction?.failureReason ?? null,
      ...control,
      planningPlanDigest: planningDigest,
      launchPlanDigest: launchDigest,
      simulationReceivedPlanDigest: patch.simulationReceivedPlanDigest ?? null,
      enginePlanDigest: patch.enginePlanDigest ?? null,
      planDigestMatch: launchDigest && planningDigest ? launchDigest === planningDigest : null,
      selectedStartCount: planSummary?.selectedStartCount ?? 0,
      executableAgentPlanCount: planSummary?.executableAgentPlanCount ?? 0,
      executableWaypointCount: planSummary?.executableWaypointCount ?? 0,
      planningMarkerCount: planSummary?.planningMarkerCount ?? 0,
      terrainAwareValidationSummary: patch.terrainValidationSummary ?? snapshot?.terrainAwareValidationSummary ?? launchPayload?.terrainAwareValidationSummary ?? this.app.state.ui?.missionReadiness ?? null,
      sceneTransitionRequested: patch.sceneTransitionRequested === true,
      simulationSceneActive: false,
      engineInitialized: false,
      engineStatus: null,
      engineStepCount: 0,
      firstStepCompleted: false,
      simulationTimeSeconds: 0,
      activeAgentCount: 0,
      movingAgentCount: 0,
      canonicalTrajectoryPointCount: 0,
      threeTrajectoryPointCount: 0,
      canonicalObservationCount: 0,
      threeObservationCount: 0,
      canonicalWaypointStatusCount: 0,
      rightPanelWaypointStatusCount: 0,
      timelineWaypointStatusCount: 0,
      resultAvailable: false,
      debriefRequested: false,
      planningInteractionDisposed: patch.planningInteractionDisposed ?? false,
      planningRendererDisposed: patch.planningRendererDisposed ?? false,
      planningCanvasCountAfterExit: patch.planningCanvasCountAfterExit ?? null,
      stalePlanningListenerCount: patch.stalePlanningListenerCount ?? 0,
      rendererBackend: 'threeMission3d',
      rendererOwnsExecution: false,
      rendererOwnsSimulationState: false,
      rendererOwnsScoring: false,
      changesOfficialBrowserScoring: false,
      usesCanonicalPlan: true,
      transactionSummary
    };
    return globalThis.ANCHOR_EXECUTION_DEBUG;
  }

  preparePlanningInteractionForExecution({ disableThreeInteraction = false } = {}) {
    this.cancelThreeInteraction();
    this.app.state.ui ??= {};
    this.app.state.ui.hoverCell = null;
    this.app.state.ui.selectedMarker = null;
    this.app.state.ui.threeMissionInteraction ??= {};
    this.app.state.ui.threeMissionInteraction.dragPreview = null;
    this.app.state.ui.threeMissionInteraction.routePreview = null;
    this.app.state.ui.threeMissionInteraction.placementValidation = null;
    this.app.state.ui.threeMissionInteraction.deploymentCandidateCell = null;
    this.app.state.ui.threeMissionInteraction.waypointCandidateCell = null;
    clearPlanningOverlayState(this.app.state);
    this.clearPlanningOverlayObjects();
    if (disableThreeInteraction) {
      cancelThreeMissionInteraction(this.threeInteractionController);
      setThreeMissionInteractionEnabled(this.threeInteractionController, false);
      this.disableThreeInteractionSilently();
    }
    return {
      planningInteractionDisposed: this.threeInteractionController?.disposed === true,
      planningRendererDisposed: this.threeMissionRenderer?.disposed === true,
      planningCanvasCountAfterExit: globalThis.document?.querySelectorAll?.('.three-mission-world-host canvas')?.length ?? null,
      stalePlanningListenerCount: disableThreeInteraction && this.threeInteractionController?.enabled ? 1 : 0
    };
  }

  executePlan({ source = 'direct' } = {}) {
    if (this.executeLaunchInProgress) {
      this.duplicateExecuteDispatchCount += 1;
      this.publishExecutionDebug({ currentStage: this.executionTransaction?.currentStage ?? 'executeRequested' });
      return;
    }
    const surfacingReplanActive = this.isSurfacingReplanMode();
    if (surfacingReplanActive && source === 'missionConsole') source = 'surfacingReplanCommit';
    this.executeLaunchInProgress = true;
    this.app.state.simulationTrace = createSimulationTrace();
    let transaction = createMissionExecutionTransaction({
      source,
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      seed: this.app.state.level?.meta?.seed ?? this.app.state.mission?.rules?.stochasticSeed ?? null
    });
    this.executionTransaction = transaction;
    this.app.state.executionTransaction = transaction;
    this.publishExecutionDebug({ transaction });
    traceSimulation(this.app.state.simulationTrace, {
      scene: 'MissionWorkspaceScene',
      phase: 'execute.clicked',
      simTime: this.app.state.planningTime ?? 0,
      message: 'Execute clicked'
    });
    try {
      const cleanup = this.preparePlanningInteractionForExecution({ disableThreeInteraction: false });
      transaction = advanceMissionExecutionTransaction(transaction, 'planningToolCancelled', cleanup);
      this.publishExecutionDebug({ transaction, ...cleanup });
      this.applyMissionOptionsToMission();
      applyStochasticToMission(this.app.state);
      normalizeDeploymentState(this.app.state.level, this.app.state.mission, this.app.state.plan);
      const missingDeployment = (this.app.state.mission.agents ?? []).find((agent) => requiresDeploymentSelection(this.app.state.mission, agent.id));
      if (missingDeployment) {
        const reason = `${missingDeployment.label ?? missingDeployment.id} needs a deployment cell before simulation.`;
        transaction = failMissionExecutionTransaction(transaction, 'planValidated', reason, { agentId: missingDeployment.id });
        this.executeLaunchInProgress = false;
        this.publishExecutionDebug({ transaction, currentStage: 'failed' });
        this.app.state.selectedAgentId = missingDeployment.id;
        this.showRouteValidationModal({
          message: reason,
          agentId: missingDeployment.id,
          type: 'invalidStart',
          reason: 'deployment',
          fixHint: 'Choose a valid deployment cell, then click Execute again.'
        });
        this.refreshPanels();
        this.refreshMap();
        return;
      }
      this.app.state.plan = normalizePlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
      this.syncPlannerBenchmarkPlanContext(this.app.state.currentPlanSource ?? 'manual');
      this.syncAdaptiveBenchmarkPlanContext();
      recomputeAllWaypointTiming(this.app.state);
      const routeAudit = this.refreshRouteAudit();
      const terrainReport = this.app.state.ui?.terrainAwareValidationReport ?? this.refreshTerrainAwareMissionValidation();
      if (terrainReport?.executable === false) {
        const blockingIssue = terrainReport.hardErrors?.[0] ?? { message: 'Terrain-aware mission validation failed.', agentId: this.app.state.selectedAgentId };
        this.focusRouteIssue(blockingIssue);
        transaction = failMissionExecutionTransaction(transaction, 'planValidated', blockingIssue.message ?? 'Terrain-aware mission validation failed', { terrainValidationSummary: terrainAwareMissionValidationSummary(terrainReport) });
        this.executeLaunchInProgress = false;
        this.publishExecutionDebug({ transaction, currentStage: 'failed', terrainValidationSummary: terrainAwareMissionValidationSummary(terrainReport) });
        this.refreshPanels();
        this.refreshMap();
        this.showRouteValidationModal(blockingIssue, { ok: false, errors: [blockingIssue.message ?? 'Terrain-aware mission validation failed'], terrainAwareValidationReport: terrainReport });
        return;
      }
      const snapshot = createMissionExecutionSnapshot({
        level: this.app.state.level,
        mission: this.app.state.mission,
        plan: this.app.state.plan,
        selectedAgentId: this.app.state.selectedAgentId,
        currentPlanSource: this.app.state.currentPlanSource ?? 'manual',
        challengeMode: this.app.state.challengeMode,
        experienceMode: this.app.state.experienceMode,
        missionOptions: this.app.state.missionOptions,
        stochastic: this.app.state.stochastic,
        playback: this.app.state.playback,
        simulationResume: this.app.state.simulationResume,
        routeAudit,
        terrainAwareValidationReport: terrainReport
      });
      this.app.state.executionSnapshot = snapshot;
      transaction = advanceMissionExecutionTransaction(transaction, 'planSnapshotBuilt', { planSummary: snapshot.planSummary, planningPlanDigest: snapshot.planDigest });
      this.publishExecutionDebug({ transaction, snapshot, planningPlanDigest: snapshot.planDigest });
      traceSimulation(this.app.state.simulationTrace, {
        scene: 'MissionWorkspaceScene',
        phase: 'validation.start',
        simTime: this.app.state.planningTime ?? 0,
        message: 'Validating plan before simulation'
      });
      const validation = snapshot.validation ?? validatePlanForExecution({
        level: snapshot.level,
        mission: snapshot.mission,
        plan: snapshot.plan
      });
      if (!validation.ok) {
        this.app.state.ui.routeAudit = validation.routeAudit ?? routeAudit;
        const blockingIssue = firstBlockingRouteIssue(validation);
        this.focusRouteIssue(blockingIssue);
        transaction = failMissionExecutionTransaction(transaction, 'planValidated', validation.errors?.[0] ?? 'Validation failed', {
          validationSummary: summarizeValidation(validation)
        });
        traceSimulation(this.app.state.simulationTrace, {
          scene: 'MissionWorkspaceScene',
          phase: 'validation.fail',
          simTime: this.app.state.planningTime ?? 0,
          message: validation.errors[0] ?? 'Validation failed',
          details: { errors: validation.errors }
        });
        this.executeLaunchInProgress = false;
        this.publishExecutionDebug({ transaction, snapshot, currentStage: 'failed' });
        this.refreshPanels();
        this.refreshMap();
        this.showRouteValidationModal(blockingIssue, validation);
        return;
      }
      const surfacingCommit = surfacingReplanActive ? this.prepareSurfacingReplanCommit({ snapshot }) : null;
      transaction = advanceMissionExecutionTransaction(transaction, 'planValidated', {
        validationSummary: summarizeValidation(validation),
        surfacingReplan: surfacingCommit ? {
          handoffSummary: surfacingReplanHandoffSummary(surfacingCommit.handoff),
          transactionSummary: surfacingDecisionTransactionSummary(surfacingCommit.transaction),
          resumeTime: surfacingCommit.committedResume?.t ?? null,
          pendingDecisionCleared: !surfacingCommit.committedResume?.awaitingSurfaceDecision
        } : null
      });
      const missionDurationWarning = validation.warnings?.find((warning) => /mission duration|mission time limit/i.test(warning));
      if (missionDurationWarning) this.app.toast?.(missionDurationWarning, 'warning');
      traceSimulation(this.app.state.simulationTrace, {
        scene: 'MissionWorkspaceScene',
        phase: 'validation.pass',
        simTime: this.app.state.planningTime ?? 0,
        message: 'Plan validation passed'
      });
      attachIdentityToPlan(snapshot.plan, snapshot.level, snapshot.mission);
      this.app.state.level = snapshot.level;
      this.app.state.mission = snapshot.mission;
      this.app.state.plan = snapshot.plan;
      this.app.state.selectedAgentId = snapshot.selectedAgentId ?? this.app.state.selectedAgentId;
      this.syncPlannerBenchmarkPlanContext(this.app.state.currentPlanSource ?? 'manual');
      this.syncAdaptiveBenchmarkPlanContext();
      if (this.app.state.currentPlanSource === 'manual') this.app.state.manualPlan = this.app.state.plan;
      const launchPayload = createMissionLaunchPayload({ snapshot, transaction });
      snapshot.planDigest = launchPayload.planDigest;
      snapshot.planSummary = launchPayload.planSummary;
      this.app.state.executionSnapshot = snapshot;
      this.app.state.executionLaunchPayload = launchPayload;
      transaction = advanceMissionExecutionTransaction(transaction, 'launchPayloadBuilt', {
        launchPayloadSummary: summarizeMissionLaunchPayload(launchPayload),
        launchPlanDigest: launchPayload.planDigest
      });
      const exitCleanup = this.preparePlanningInteractionForExecution({ disableThreeInteraction: true });
      this.clearPlanningPreviewState();
      this.app.state.mode = 'simulation';
      transaction = advanceMissionExecutionTransaction(transaction, 'sceneTransitionRequested', {
        scene: 'SimulationScene',
        ...exitCleanup
      });
      launchPayload.transaction = cloneJson(transaction);
      launchPayload.transactionId = transaction.transactionId;
      this.app.state.executionLaunchPayload = launchPayload;
      this.app.state.executionTransaction = transaction;
      this.publishExecutionDebug({
        transaction,
        snapshot,
        launchPayload,
        planningPlanDigest: snapshot.planDigest,
        launchPlanDigest: launchPayload.planDigest,
        sceneTransitionRequested: true,
        ...exitCleanup
      });
      this.scene.start('SimulationScene', launchPayload);
    } catch (error) {
      const reason = String(error?.message ?? error ?? 'Execute failed.');
      transaction = failMissionExecutionTransaction(transaction, this.executionTransaction?.currentStage ?? 'executeRequested', reason);
      this.executeLaunchInProgress = false;
      this.publishExecutionDebug({ transaction, currentStage: 'failed' });
      if (error?.name === 'CanonicalCurrentFieldError') {
        this.handlePreSceneCanonicalLaunchFailure(error, transaction);
      } else {
        this.app.toast?.(`Simulation launch failed: ${reason}`, 'error');
      }
      traceSimulation(this.app.state.simulationTrace, {
        scene: 'MissionWorkspaceScene',
        phase: 'execute.fail',
        simTime: this.app.state.planningTime ?? 0,
        message: reason
      });
    }
  }
  handlePreSceneCanonicalLaunchFailure(error, transaction = null) {
    const message = String(error?.message ?? error ?? 'Simulation launch failed before the canonical engine could start.');
    this.app.state.simulationLaunchError = {
      type: 'anchor.simulation.launch-error',
      stage: transaction?.currentStage ?? 'executeRequested',
      message,
      name: error?.name ?? 'Error',
      planPreserved: Boolean(this.app.state.plan),
      missionPreserved: Boolean(this.app.state.mission),
      levelPreserved: Boolean(this.app.state.level),
      sceneTransitionRequested: false
    };
    failSimulationLaunchProfiler(message, { launchAbortedCleanly: true });
    this.renderPreSceneCanonicalLaunchFailureConsole(message);
    this.app.toast?.(`Simulation launch failed: ${message}`, 'danger');
  }

  renderPreSceneCanonicalLaunchFailureConsole(message) {
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
        <p>${escapeSceneHtml(message)}</p>
        <p class="hud-muted">No partial Simulation was started. The existing plan and mission state remain available for inspection.</p>
        <button class="console-button primary" data-action="return-planning">Return To Planning</button>
      </section>
    `;
    root.querySelector('[data-action="return-planning"]')?.addEventListener('click', () => {
      this.app.state.mode = 'planning';
      this.refreshPanels();
      this.refreshMap();
    });
  }

  focusRouteIssue(issue = {}) {    const agentId = issue.agentId ?? issue.to?.agentId ?? this.app.state.selectedAgentId ?? this.app.state.mission?.agents?.[0]?.id ?? null;
    const waypointIndex = Number(issue.waypointIndex ?? issue.to?.index);
    if (agentId) this.app.state.selectedAgentId = agentId;
    this.app.state.ui ??= {};
    if (agentId && Number.isInteger(waypointIndex) && waypointIndex >= 0) {
      this.app.state.ui.selectedWaypoint = { agentId, index: waypointIndex };
      this.app.state.ui.selectedMarker = null;
    }
  }

  showRouteValidationModal(issue = {}, validation = null) {
    const message = issue?.message ?? validation?.errors?.[0] ?? 'Route validation failed.';
    const detailLines = routeIssueDetails(issue, this.app.state);
    const body = [
      `${agentLabel(this.app.state, issue?.agentId)} cannot start simulation.`,
      '',
      'Reason:',
      message,
      '',
      ...(detailLines.length ? ['Details:', ...detailLines, ''] : []),
      'Fix:',
      issue?.fixHint ?? routeIssueFixHint(issue)
    ].join('\n');
    this.app.toast?.(`Simulation blocked: ${message}`, 'warning');
    this.modal.show({
      title: 'Route Cannot Run',
      body,
      buttons: [
        {
          label: 'Review Route',
          onClick: () => {
            this.focusRouteIssue(issue);
            this.refreshPanels();
            this.refreshMap();
          }
        },
        ...(Number.isInteger(Number(issue?.waypointIndex ?? issue?.to?.index)) ? [{
          label: 'Select Waypoint',
          onClick: () => {
            this.focusRouteIssue(issue);
            this.refreshPanels();
            this.refreshMap();
          }
        }] : []),
        { label: 'Close', onClick: () => {} }
      ]
    });
  }

  showHelpModal() {
    const objectiveSummary = getLevelObjectiveSummary(this.app.state.level, this.app.state.mission);
    const prompts = getPlanningPrompts(this.app.state.level);
    const body = [
      ...(objectiveSummary.learningObjectives ?? []).map((item) => `- ${item}`),
      '',
      ...prompts.map((prompt, index) => `${index + 1}. ${prompt.title}: ${prompt.body}`)
    ].join('\n');
    this.modal.show({
      title: objectiveSummary.concept || 'Mission Briefing',
      body: body || 'Plan waypoints on the map, then execute the mission.'
    });
  }

  saveCurrentLevel() {
    const saved = saveLevelToRegistry(this.app.state.level);
    if (!saved.ok) return this.app.toast(saved.error, 'warning');
    this.app.state.level = saved.level;
    this.app.toast(`Saved level ${shortInstanceId(saved.instanceId)}.`, 'success');
    this.refreshPanels();
  }

  exportPlan() {
    applyStochasticToMission(this.app.state);
    normalizeDeploymentState(this.app.state.level, this.app.state.mission, this.app.state.plan);
    this.app.state.plan = normalizePlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
    recomputeAllWaypointTiming(this.app.state);
    recomputePlanningMarkerReachability(this.app.state);
    attachIdentityToPlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
    this.app.state.plan.meta ??= {};
    this.app.state.plan.executionMode ??= this.app.state.plan.meta.executionMode ?? 'openLoop';
    this.app.state.plan.planner ??= this.app.state.plan.meta.planner ?? {
      name: this.app.state.currentPlanSource === 'manual' ? 'Manual Player Plan' : this.app.state.currentPlanSource,
      type: this.app.state.currentPlanSource ?? 'manual',
      usesForecast: this.app.state.challengeMode === 'forecast',
      usesTruth: false,
      usesOracle: false,
      source: 'game'
    };
    this.syncPlannerBenchmarkPlanContext(this.app.state.currentPlanSource ?? 'manual');
    this.syncAdaptiveBenchmarkPlanContext();
    this.app.state.plan.meta.stochastic = this.app.state.stochastic?.enabled ? {
      seed: this.app.state.stochastic.seed,
      roiScoringMode: this.app.state.stochastic.roiScoringMode,
      selectedForecastMember: this.app.state.stochastic.selectedForecastMember,
      rerunGroupId: this.app.state.stochastic.rerunGroupId ?? null
    } : { enabled: false };
    downloadJSON('anchor.plan.json', this.app.state.plan);
  }

  exportSolverPacket() {
    applyStochasticToMission(this.app.state);
    normalizeDeploymentState(this.app.state.level, this.app.state.mission, this.app.state.plan);
    recomputePlanningMarkerReachability(this.app.state);
    downloadJSON('anchor.solver-packet.json', buildSolverPacket({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      challengeMode: this.app.state.challengeMode,
      experienceMode: this.app.state.experienceMode,
      forecastMemberId: this.app.state.ui.forecastMemberId,
      roiViewMode: this.app.state.ui.roiViewMode,
      stochasticConfig: this.app.state.stochastic
    }));
  }

  exportChallenge() {
    applyStochasticToMission(this.app.state);
    normalizeDeploymentState(this.app.state.level, this.app.state.mission, this.app.state.plan);
    const challenge = buildChallengeExport({
      level: this.app.state.level,
      mission: this.app.state.mission,
      challengeMode: this.app.state.challengeMode,
      experienceMode: this.app.state.experienceMode,
      includeHiddenTruth: false
    });
    saveChallengeToLocalStore(challenge);
    downloadJSON('anchor.challenge.json', challenge);
  }

  exportOracleDataset() {
    applyStochasticToMission(this.app.state);
    normalizeDeploymentState(this.app.state.level, this.app.state.mission, this.app.state.plan);
    downloadJSON('anchor.oracle-dataset.json', buildOracleDatasetExport({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      result: this.app.state.result,
      challengeMode: this.app.state.challengeMode,
      forecastMemberId: this.app.state.ui.forecastMemberId,
      roiViewMode: this.app.state.ui.roiViewMode,
      stochasticConfig: this.app.state.stochastic
    }));
  }

  exportResult() {
    if (!this.app.state.result) {
      this.app.toast?.('No result is available to export yet.', 'warning');
      return;
    }
    downloadJSON('anchor.result.json', buildResultExport({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      result: this.app.state.result,
      experienceMode: this.app.state.experienceMode,
      label: this.app.state.currentPlanSource ?? 'Manual Player Plan'
    }));
  }

  importResultJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.hidden = true;
    document.body.appendChild(input);
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        const imported = importResultJson(await readJSONFile(file), this.app.state);
        if (!imported.ok) throw new Error(imported.errors?.[0] ?? 'Result import failed');
        if (!imported.compatible) {
          this.modal.show({
            title: imported.summary.title,
            body: imported.summary.message,
            buttons: [{ label: 'Close', onClick: () => this.modal.hide() }]
          });
          return;
        }
        this.app.state.result = imported.result;
        this.scene.start('DebriefScene');
      } catch (error) {
        this.app.toast?.(error?.message ?? 'Failed to import result JSON.', 'error');
      } finally {
        input.remove();
      }
    };
    input.click();
  }

  exportLeaderboard() {
    downloadJSON('anchor.leaderboard.json', buildLeaderboardExport(loadLeaderboard()));
  }

  importLeaderboardJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.hidden = true;
    document.body.appendChild(input);
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        const saved = importLeaderboard(await readJSONFile(file), { merge: true });
        if (!saved.ok) throw new Error(saved.message ?? 'Import failed');
        this.app.toast?.('Leaderboard JSON imported.', 'success');
      } catch (error) {
        this.app.toast?.(error?.message ?? 'Failed to import leaderboard JSON.', 'error');
      } finally {
        input.remove();
      }
    };
    input.click();
  }

  async applyTemporalGreedyPlan() {
    this.app.state.ui ??= {};
    this.app.state.ui.plannerState ??= {};
    if (this.app.state.ui.plannerState.temporalGreedyRunning || this.app.state.ui.temporalGreedyRunning) {
      this.app.toast?.('Greedy Planner is already running.', 'info');
      return;
    }
    const requestId = createGameInstanceId('TPLAN');
    this.app.state.ui.plannerState.temporalGreedyRunning = true;
    this.app.state.ui.plannerState.activePlannerRequestId = requestId;
    this.app.state.ui.temporalGreedyRunning = true;
    const liveAppendState = {
      started: false,
      acceptedWaypoints: 0,
      selectedAgentId: this.app.state.selectedAgentId
    };
    this.refreshPanels();
    this.app.toast?.('Planning Greedy Planner route...', 'info');
    try {
      const request = buildTemporalGreedyRequest({
        level: this.app.state.level,
        mission: this.app.state.mission,
        plan: this.app.state.plan,
        selectedAgentId: this.app.state.selectedAgentId,
        options: {
          challengeMode: this.app.state.challengeMode,
          revealTruth: this.app.state.ui?.revealTruth,
          forecastMemberId: this.app.state.ui?.forecastMemberId
        }
      });
      request.requestId = requestId;
      const result = await runTemporalGreedyAsync(request, {
        onProgress: (progress) => {
          if (!this.isActiveTemporalGreedyRequest(requestId)) return;
          this.applyTemporalGreedyProgress(progress, liveAppendState);
        }
      });
      if (!this.isActiveTemporalGreedyRequest(requestId)) return;
      if (result?.requestId && result.requestId !== requestId) return;
      if (!result.ok && liveAppendState.acceptedWaypoints <= 0) throw new Error(result.error ?? 'Greedy Planner planning failed.');
      this.finishTemporalGreedyLivePlan(result, liveAppendState);
      this.app.state.currentPlanSource = 'temporalGreedy';
      this.syncPlannerBenchmarkPlanContext('temporalGreedy');
      this.app.state.temporalGreedyPlan = this.app.state.plan;
      this.refreshMap();
      const toastLevel = !result.ok || this.app.state.plan?.meta?.valid === false ? 'warning' : 'success';
      this.app.toast?.(temporalGreedySummary(this.app.state.plan, this.app.state.level, this.app.state.mission), toastLevel);
    } catch (error) {
      if (this.isActiveTemporalGreedyRequest(requestId)) {
        console.error('Greedy Planner planning failed.', error);
        this.app.toast?.(error?.name === 'AbortError' ? 'Greedy Planner cancelled.' : error?.message ?? 'Greedy Planner planning failed.', 'warning');
      }
    } finally {
      if (this.isActiveTemporalGreedyRequest(requestId)) {
        this.clearTemporalGreedyBusyState();
        this.refreshPanels();
      }
    }
  }

  applyTemporalGreedyProgress(progress = {}, liveAppendState = {}) {
    if (progress?.phase === 'running' || progress?.type === 'planningStarted') {
      this.app.toast?.('Greedy Planner running...', 'info');
      return;
    }
    if (progress?.type === 'waypointAccepted' || progress?.phase === 'waypointAccepted') {
      const agentId = progress.agentId ?? liveAppendState.selectedAgentId ?? this.app.state.selectedAgentId;
      const waypoint = progress.waypoint;
      if (!agentId || !waypoint) return;
      if (!liveAppendState.started) {
        clearAgentWaypoints(this.app.state.plan, agentId);
        liveAppendState.started = true;
      }
      const accepted = addWaypoint(this.app.state.plan, agentId, waypoint);
      liveAppendState.acceptedWaypoints = Number(liveAppendState.acceptedWaypoints ?? 0) + 1;
      const selectedIndex = Math.max(0, (this.app.state.plan?.agentPlans?.find((plan) => plan.agentId === agentId)?.waypoints?.length ?? 1) - 1);
      this.afterPlanChanged(agentId, { selectedIndex });
      this.app.state.currentPlanSource = 'temporalGreedy';
      this.syncPlannerBenchmarkPlanContext('temporalGreedy');
      this.app.state.temporalGreedyPlan = this.app.state.plan;
      this.app.state.ui.plannerState ??= {};
      this.app.state.ui.plannerState.temporalGreedyLastProgress = progress.summarySoFar ?? null;
      this.refreshPanels();
      this.refreshMap();
      this.app.toast?.(`Greedy Planner: added W${selectedIndex + 1} at ${Number(accepted.estimatedArrivalTime ?? accepted.t ?? 0).toFixed(1)} hr`, 'info');
      return;
    }
    if (progress?.type === 'plannerStopped' || progress?.phase === 'stopped') {
      this.app.state.ui.plannerState ??= {};
      this.app.state.ui.plannerState.temporalGreedyLastStop = {
        reason: progress.stopReason ?? null,
        summary: progress.summarySoFar ?? null
      };
    }
  }

  finishTemporalGreedyLivePlan(result = {}, liveAppendState = {}) {
    if (liveAppendState.acceptedWaypoints <= 0 && result?.plan) {
      this.app.state.plan = result.plan;
    } else if (result?.plan) {
      this.app.state.plan.meta = {
        ...(this.app.state.plan.meta ?? {}),
        ...(result.plan.meta ?? {})
      };
      this.app.state.plan.planner = result.plan.planner ?? this.app.state.plan.planner;
      this.app.state.plan.executionMode = result.plan.executionMode ?? this.app.state.plan.executionMode;
      this.app.state.plan.challengeId = result.plan.challengeId ?? this.app.state.plan.challengeId;
      this.app.state.plan.instanceId = result.plan.instanceId ?? this.app.state.plan.instanceId;
    }
    attachIdentityToPlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
    recomputeAllWaypointTiming(this.app.state);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
  }

  isActiveTemporalGreedyRequest(requestId) {
    return this.app.state.ui?.plannerState?.activePlannerRequestId === requestId;
  }

  clearTemporalGreedyBusyState() {
    this.app.state.ui ??= {};
    this.app.state.ui.plannerState ??= {};
    this.app.state.ui.plannerState.temporalGreedyRunning = false;
    this.app.state.ui.plannerState.activePlannerRequestId = null;
    this.app.state.ui.temporalGreedyRunning = false;
  }

  clearSelectedAgentPlan() {
    clearAgentWaypoints(this.app.state.plan, this.app.state.selectedAgentId);
    this.app.state.ui.hoverCell = null;
    this.clearSelectedWaypoint();
    this.afterPlanChanged(this.app.state.selectedAgentId);
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
  }

  selectNextGlider() {
    const agents = this.app.state.mission?.agents ?? [];
    if (!agents.length) return;
    const index = agents.findIndex((agent) => agent.id === this.app.state.selectedAgentId);
    this.selectGlider(agents[(index + 1 + agents.length) % agents.length].id);
  }

  toggleChallengeMode() {
    this.app.state.challengeMode = this.app.state.challengeMode === 'forecast' ? 'perfectKnowledge' : 'forecast';
    if (this.app.state.challengeMode === 'forecast') ensureForecastFields(this.app.state.level);
    normalizeStochasticState(this.app.state);
    recomputeAllWaypointTiming(this.app.state);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
    this.refreshPanels();
    this.refreshMap();
  }

  toggleGuidance() {
    this.app.state.ui.showGuidance = !this.app.state.ui.showGuidance;
    this.refreshPanels();
    this.refreshMap();
  }

  toggleLayer(key) {
    if (!key || !(key in this.app.state.ui)) return;
    if (key === 'showBestPathOverlay') {
      this.showBestPathOverlay(!this.app.state.ui.showBestPathOverlay);
      return;
    }
    this.app.state.ui[key] = !this.app.state.ui[key];
    this.refreshPanels();
    this.refreshMap();
  }

  toggleRoiViewMode() {
    const current = normalizeRoiMode(this.app.state.ui.roiViewMode);
    const next = nextAllowedRoiMode(current, this.app.state, getNextRoiMode(current));
    this.app.state.ui.roiViewMode = normalizeRoiMode(next);
    this.app.toast(`ROI Mode: ${getRoiModeLabel(next)}`, 'info');
    this.refreshPanels();
    this.refreshMap();
  }

  setStochasticSeed(seed) {
    const next = setStochasticSeed(this.app.state, seed);
    this.app.toast(`Stochastic seed: ${next}`, 'info');
    this.recomputeTemporalPlanning();
    this.refreshPanels();
  }

  randomizeStochasticSeed() {
    const next = randomizeStochasticSeed(this.app.state);
    this.app.toast(`New stochastic seed: ${next}`, 'info');
    this.recomputeTemporalPlanning();
    this.refreshPanels();
  }

  copyStochasticSeed() {
    const seed = String(this.app.state.stochastic?.seed ?? '');
    if (globalThis.navigator?.clipboard?.writeText) {
      globalThis.navigator.clipboard.writeText(seed).catch(() => {});
      this.app.toast(`Copied seed ${seed}.`, 'success');
    } else {
      this.app.toast(`Seed: ${seed}`, 'info');
    }
  }

  setStochasticRoiMode(mode) {
    const next = setStochasticRoiMode(this.app.state, mode);
    this.app.toast(`ROI scoring: ${next}`, 'info');
    this.recomputeTemporalPlanning();
    this.refreshPanels();
    this.refreshMap();
  }

  setForecastMember(memberId) {
    const next = setStochasticForecastMember(this.app.state, memberId);
    this.app.toast(`Forecast member: ${next ?? 'N/A'}`, 'info');
    this.recomputeTemporalPlanning();
    this.refreshPanels();
    this.refreshMap();
  }

  rerunSamePlan() {
    prepareStochasticRerun(this.app.state, { newSeed: false });
    this.executePlan();
  }

  rerunWithNewSeed() {
    prepareStochasticRerun(this.app.state, { newSeed: true });
    this.executePlan();
  }

  recomputeTemporalPlanning() {
    recomputeAllWaypointTiming(this.app.state);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
  }
}

function canPlaceGliderStarts(mission) {
  return Boolean(
    mission?.rules?.allowStartPlacement
    || mission?.rules?.startPlacement?.enabled
    || mission?.rules?.dropPlacement?.enabled
    || (mission?.agents ?? []).some((agent) => agent.deployment?.mode === 'chooseFromZone' || agent.deployment?.mode === 'chooseFromZones')
  );
}

function firstBlockingRouteIssue(validation = {}) {
  const issues = (validation.routeAudit?.agentResults ?? [])
    .flatMap((result) => (result.issues ?? []).map((issue) => ({ agentId: result.agentId, ...issue })));
  return issues.find((issue) => issue.severity === 'error')
    ?? {
      type: 'validationError',
      reason: 'validation',
      severity: 'error',
      message: validation.errors?.[0] ?? 'Route validation failed.'
    };
}

function bestPathActionError(action, vm) {
  const missing = vm?.missingFields?.length ? vm.missingFields.join(', ') : 'best prior run';
  if (vm?.compatibility?.ok === false) {
    return `Cannot ${bestPathActionVerb(action)} best path: ${vm.compatibility.reason}`;
  }
  if (action === 'show') {
    return `Cannot show best path: diagnostics record has no actualPathFrames or plannedWaypoints at click time. Missing: ${missing}.`;
  }
  if (action === 'load') {
    return `Cannot load best path as plan: diagnostics record has no plannedWaypoints at click time. Missing: ${missing}.`;
  }
  if (action === 'rerun') {
    return `Cannot rerun best path: diagnostics record is missing plannedWaypoints or exact replay. Missing: ${missing}.`;
  }
  return `Cannot export best path: diagnostics record has no plannedWaypoints or actualPathFrames at click time. Missing: ${missing}.`;
}

function bestPathActionVerb(action) {
  return {
    show: 'show',
    load: 'load',
    rerun: 'rerun',
    export: 'export'
  }[action] ?? 'use';
}

function temporalGreedySummary(plan, level, mission) {
  const stop = plan?.meta?.greedyStop ?? {};
  const waypointCount = (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
  const duration = Number(level?.world?.time?.duration ?? 0);
  const stopTime = Number(stop.stopTime ?? 0);
  const startingFuel = (mission?.agents ?? []).reduce((sum, agent) => sum + Number(agent.battery ?? agent.maxBattery ?? 100), 0);
  const remainingFuel = Number(stop.remainingFuel ?? 0);
  const fuelUsed = Math.max(0, startingFuel - remainingFuel);
  const unreachableCandidates = (stop.agents ?? []).reduce((sum, agentStop) => sum + Number(agentStop.unreachableCandidates ?? 0), Number(stop.unreachableCandidates ?? 0));
  const blockedCandidates = (stop.agents ?? []).reduce((sum, agentStop) => sum + Number(agentStop.blockedCandidates ?? 0), Number(stop.blockedCandidates ?? 0));
  const stochasticRiskCandidates = (stop.agents ?? []).reduce((sum, agentStop) => sum + Number(agentStop.stochasticRiskCandidates ?? 0), Number(stop.stochasticRiskCandidates ?? 0));
  const depletedCandidates = (stop.agents ?? []).reduce((sum, agentStop) => sum + Number(agentStop.depletedCandidates ?? agentStop.diagnostics?.rejectionSummary?.depleted ?? 0), 0);
  const clusteredCandidates = (stop.agents ?? []).reduce((sum, agentStop) => sum + Number(agentStop.clusteredCandidates ?? agentStop.diagnostics?.rejectionSummary?.clustered ?? 0), Number(stop.clusteredCandidates ?? 0));
  const tierStats = summarizeTemporalGreedyTiers(stop);
  const diagnosticCategories = summarizeTemporalGreedyDiagnosticCategories(stop);
  const topDiagnostic = Object.entries(diagnosticCategories).sort((a, b) => b[1] - a[1])[0] ?? null;
  const candidateEvaluations = Number(stop.candidateEvaluations ?? (stop.agents ?? []).reduce((sum, agentStop) => sum + Number(agentStop.diagnostics?.evaluatedCandidates ?? 0), 0));
  const depletion = plan?.meta?.sharedDepletion ?? {};
  const selectedAgentId = stop.selectedAgentId ?? plan?.meta?.selectedAgentId ?? depletion.selectedAgentId ?? null;
  const otherRoutesPreserved = Number(depletion.otherGliderRoutesPreserved ?? stop.sharedDepletion?.otherGliderRoutesPreserved ?? 0);
  const guardFailure = Boolean(stop.guardFailure || (stop.agents ?? []).some((agentStop) => agentStop.guardFailure));
  const missionCoverage = stop.missionCoverage ?? (duration > 0 && stopTime > duration ? 'full' : 'incomplete');
  const terminalWaypointIndex = Number.isInteger(stop.terminalCarryThroughWaypointIndex)
    ? stop.terminalCarryThroughWaypointIndex
    : null;
  const complete = !guardFailure && (
    missionCoverage === 'full'
    || !stop.remainingMissionTime
    || stop.stopReason === 'mission_horizon_covered'
    || stop.stopReason === 'mission_time_exhausted'
    || stop.stopReason === 'fuel_exhausted'
  );
  const lines = [
    guardFailure ? 'Greedy Planner guard stopped' : complete ? 'Greedy Planner complete' : 'Greedy Planner stopped early',
    selectedAgentId ? `Selected glider: ${agentLabel({ mission }, selectedAgentId)}` : null,
    `Other gliders preserved: ${otherRoutesPreserved}`,
    'Mode: iterative limited-horizon greedy',
    `Waypoints: ${waypointCount}`,
    `Planned time: ${formatRouteNumber(stopTime)} / ${formatRouteNumber(duration)} hr`,
    `Mission coverage: ${missionCoverage}`,
    terminalWaypointIndex !== null ? `Terminal carry-through waypoint: W${terminalWaypointIndex + 1}` : null,
    `Fuel used: ${formatRouteNumber(fuelUsed)} / ${formatRouteNumber(startingFuel)}`,
    `Candidate evaluations: ${candidateEvaluations}`,
    `Tier accepts: high ${tierStats.high_value.accepted}, moderate ${tierStats.moderate_value.accepted}, continuation ${tierStats.safe_continuation.accepted}`,
    topDiagnostic ? `Most common blocking reason: ${labelizeStopReason(topDiagnostic[0])} (${topDiagnostic[1]})` : null,
    Number.isFinite(Number(stop.runtimeMs)) ? `Planner runtime: ${formatRouteNumber(stop.runtimeMs)} ms` : null,
    depletion.enabled
      ? `Shared depletion: enabled, existing claimed cells: ${depletion.existingClaimedCells ?? 0}, duplicate samples avoided: ${depletion.duplicateSamplesAvoided ?? 0}`
      : 'Shared depletion: single-agent not needed',
    Number(depletion.collisionConflictsAvoided ?? 0) > 0 ? `Collision conflicts avoided: ${depletion.collisionConflictsAvoided}` : null,
    `Stop reason: ${labelizeStopReason(stop.stopReason)}`
  ].filter(Boolean);
  if (unreachableCandidates > 0) lines.splice(7, 0, `Skipped unreachable candidates: ${unreachableCandidates}`);
  if (blockedCandidates > 0) lines.splice(7, 0, `Skipped blocked candidates: ${blockedCandidates}`);
  if (clusteredCandidates > 0) lines.splice(7, 0, `Penalized clustered candidates: ${clusteredCandidates}`);
  if (depletedCandidates > 0) lines.splice(7, 0, `Skipped depleted candidates: ${depletedCandidates}`);
  if (stochasticRiskCandidates > 0) lines.splice(7, 0, `Skipped unknown-current shoreline risks: ${stochasticRiskCandidates}`);
  if (guardFailure) lines.splice(7, 0, 'Planner guard hit before a normal stop condition.');
  return lines.join('\n');
}

function summarizeTemporalGreedyDiagnosticCategories(stop = {}) {
  const summary = {};
  for (const agentStop of stop.agents ?? []) {
    const categories = agentStop.diagnostics?.diagnosticCategories ?? {};
    for (const [category, count] of Object.entries(categories)) {
      summary[category] = Number(summary[category] ?? 0) + Number(count ?? 0);
    }
  }
  return summary;
}

function summarizeTemporalGreedyTiers(stop = {}) {
  const summary = {
    high_value: { accepted: 0 },
    moderate_value: { accepted: 0 },
    safe_continuation: { accepted: 0 }
  };
  for (const agentStop of stop.agents ?? []) {
    const tiers = agentStop.diagnostics?.tierStats ?? {};
    for (const tier of Object.keys(summary)) {
      summary[tier].accepted += Number(tiers[tier]?.accepted ?? 0);
    }
  }
  return summary;
}

function labelizeForScene(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (char) => char.toUpperCase());
}

function labelizeStopReason(reason) {
  return String(reason ?? 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function roundSceneMetric(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

function screenProjectionYOffsetForMissionRecord(record = {}) {
  if (record.waypointId) return 0.22;
  if (record.markerId) return 0.28;
  if (record.targetId) return 0.34;
  if (record.agentId) return 0.32;
  return 0.32;
}
function labelForSnapMode(mode) {
  return {
    freePlacement: 'Free Placement',
    snapToCellCenters: 'Snap to Cell',
    snapToFeature: 'Snap to Feature'
  }[mode] ?? 'Snap to Cell';
}

function labelForVolumeRenderMode(mode) {
  return {
    layerSlices: 'Layer Slices',
    smoothedSlices: 'Smoothed Slices',
    volumetricCloud: 'Volumetric Cloud',
    hybrid: 'Hybrid'
  }[mode] ?? 'Smoothed Slices';
}

function routeIssueDetails(issue = {}, state = {}) {
  const lines = [];
  const waypointIndex = Number(issue.waypointIndex ?? issue.to?.index);
  const segmentIndex = Number(issue.segmentIndex);
  if (issue.agentId) lines.push(`Glider: ${agentLabel(state, issue.agentId)}`);
  if (Number.isInteger(waypointIndex) && waypointIndex >= 0) lines.push(`Waypoint: ${waypointIndex + 1}`);
  if (Number.isInteger(segmentIndex) && segmentIndex >= 0) {
    const fromLabel = segmentIndex === 0 ? 'start' : `Waypoint ${segmentIndex}`;
    lines.push(`Segment: ${fromLabel} to Waypoint ${segmentIndex + 1}`);
  }
  const blocked = issue.blockedAt ?? issue.risk?.cell ?? issue.cell;
  if (blocked) lines.push(`Cell: (${Math.round(Number(blocked.x))}, ${Math.round(Number(blocked.y))})`);
  const waypoint = getIssueWaypoint(state, issue);
  if (waypoint) {
    if (Number.isFinite(Number(waypoint.t ?? waypoint.estimatedArrivalTime))) {
      lines.push(`Waypoint time: ${formatRouteNumber(waypoint.estimatedArrivalTime ?? waypoint.t)} hr`);
    }
    if (Number.isFinite(Number(state.level?.world?.time?.duration))) {
      lines.push(`Mission duration: ${formatRouteNumber(state.level.world.time.duration)} hr`);
    }
    if (Number.isFinite(Number(waypoint.segmentEnergy))) lines.push(`Segment energy: ${formatRouteNumber(waypoint.segmentEnergy)}`);
    if (Number.isFinite(Number(waypoint.remainingFuelEstimate))) lines.push(`Remaining fuel estimate: ${formatRouteNumber(waypoint.remainingFuelEstimate)}`);
  }
  return lines;
}

function routeIssueFixHint(issue = {}) {
  const reason = String(issue.reason ?? issue.type ?? '').toLowerCase();
  if (reason.includes('terrain') || reason.includes('segmentblocked') || reason.includes('tooshallow')) {
    return 'Move the failed waypoint or add an intermediate waypoint around the blocked cell.';
  }
  if (reason.includes('time')) return 'Move the waypoint earlier, delete it, or shorten the route.';
  if (reason.includes('fuel')) return 'Shorten the route, remove a waypoint, or choose a lower-cost path.';
  if (reason.includes('deployment') || reason.includes('invalidstart')) return 'Choose a valid deployment/start cell before simulation.';
  if (reason.includes('coordinate') || reason.includes('outside')) return 'Move the waypoint onto a valid navigable map cell.';
  return 'Review the highlighted waypoint or segment, adjust the route, then click Execute again.';
}

function getIssueWaypoint(state = {}, issue = {}) {
  const agentId = issue.agentId ?? issue.to?.agentId;
  const index = Number(issue.waypointIndex ?? issue.to?.index);
  if (!agentId || !Number.isInteger(index)) return null;
  return state.plan?.agentPlans?.find((plan) => plan.agentId === agentId)?.waypoints?.[index] ?? null;
}

function agentLabel(state = {}, agentId) {
  const agent = state.mission?.agents?.find((candidate) => candidate.id === agentId);
  return agent?.label ?? agent?.name ?? agentId ?? 'Selected glider';
}

function formatRouteNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return Math.abs(number) >= 10 ? number.toFixed(1) : number.toFixed(2);
}

function terrainAt(level, cell) {
  const x = Math.round(Number(cell?.x));
  const y = Math.round(Number(cell?.y));
  return Number.isFinite(x) && Number.isFinite(y)
    ? level?.layers?.terrain?.[y]?.[x] ?? null
    : null;
}

function isValidDropCell(level, cell, mission, agentId = null) {
  const agent = mission?.agents?.find((candidate) => candidate.id === agentId);
  if (agent?.deployment?.mode === 'chooseFromZone' || agent?.deployment?.mode === 'chooseFromZones') {
    const zones = getDeploymentZonesForAgent(level, mission, agentId);
    if (zones.length) return zones.some((zone) => zone.cells.some((candidate) => candidate.x === cell.x && candidate.y === cell.y));
  }
  const zones = mission?.rules?.dropPlacement?.zones ?? level?.layers?.bases ?? [];
  if (!zones.length) return true;
  return zones.some((zone) => {
    const radius = Number(zone.radius ?? 1);
    return Math.hypot(cell.x - Number(zone.x), cell.y - Number(zone.y)) <= radius;
  });
}

function findPriorityTargetNearCell(level, time, x, y) {
  let best = null;
  for (const target of getActivePriorityTargets(level, time)) {
    const position = target.position;
    const distance = Math.hypot(Number(position.x) - Number(x), Number(position.y) - Number(y));
    const radius = Number(target.radius ?? 0.75) + 0.5;
    if (distance <= radius && (!best || distance < best.distance)) {
      best = { ...target, distance };
    }
  }
  return best;
}

function buildWaypointStacks(waypoints = []) {
  const stacks = new Map();
  waypoints.forEach((waypoint, index) => {
    const key = waypointStackKey(waypoint);
    const stack = stacks.get(key) ?? {
      key,
      x: Math.round(Number(waypoint.x)),
      y: Math.round(Number(waypoint.y)),
      indexes: []
    };
    stack.indexes.push(index);
    stacks.set(key, stack);
  });
  return stacks;
}

function waypointStackKey(waypoint) {
  return `${Math.round(Number(waypoint?.x))},${Math.round(Number(waypoint?.y))}`;
}

function waypointStackOffset(index, count, cell) {
  if (count <= 1) return { x: 0, y: 0 };
  const radius = Math.min(cell * 0.18, Math.max(4, cell * 0.12));
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  if (globalThis.structuredClone) return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function formatScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return Math.abs(number) >= 100 ? number.toFixed(0) : number.toFixed(2);
}




















function terrainValidationVisibleFrame(state = {}) {
  const level = state.level ?? {};
  const t = Number(getActiveRenderTime(state, null) ?? state.planningTime ?? 0);
  const truthFrames = level.layers?.truth?.frames ?? level.truth?.frames ?? [];
  const forecastFrames = level.layers?.forecast?.frames ?? level.forecast?.frames ?? [];
  const frames = state.ui?.revealTruth === false && forecastFrames.length ? forecastFrames : truthFrames.length ? truthFrames : forecastFrames;
  if (!Array.isArray(frames) || !frames.length) return null;
  let best = frames[0];
  let bestDistance = Math.abs(Number(best?.t ?? best?.timeSeconds ?? 0) - t);
  for (const frame of frames) {
    const distance = Math.abs(Number(frame?.t ?? frame?.timeSeconds ?? 0) - t);
    if (distance < bestDistance) {
      best = frame;
      bestDistance = distance;
    }
  }
  return best;
}
function createTerrainValidationCacheState() {
  return {
    key: null,
    keyRecord: null,
    report: null,
    summary: null,
    lastMissionReadinessDigest: null,
    counters: {
      planningValidationBuildCount: 0,
      planningValidationCacheHitCount: 0,
      planningValidationCacheMissCount: 0,
      lastPlanningValidationInvalidationReason: null,
      validationBuildCountDuringCameraGesture: 0,
      validationCacheHitCountDuringCameraGesture: 0,
      validationInvalidationCountDuringCameraGesture: 0,
      lastCameraGestureValidationReason: null,
      missionReadinessRenderCount: 0,
      missionReadinessRenderCountDuringCameraGesture: 0,
      missionReadinessIssueRowCreateCount: 0,
      missionReadinessIssueRowReuseCount: 0
    }
  };
}

function terrainValidationPlanKey(plan = {}) {
  return {
    type: plan.type ?? null,
    schemaVersion: plan.schemaVersion ?? null,
    levelId: plan.levelId ?? null,
    missionId: plan.missionId ?? null,
    agentPlans: (plan.agentPlans ?? []).map((agentPlan) => ({
      agentId: agentPlan.agentId,
      selectedStart: compactPointForScene(agentPlan.selectedStart),
      waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({
        id: waypoint.id ?? waypoint.waypointId ?? null,
        x: roundSceneNumberOrNull(waypoint.x),
        y: roundSceneNumberOrNull(waypoint.y),
        t: roundSceneNumberOrNull(waypoint.t ?? waypoint.estimatedArrivalTime),
        action: waypoint.action ?? null,
        diveProfileId: waypoint.diveProfileId ?? null,
        targetDepthLayerId: waypoint.targetDepthLayerId ?? waypoint.depthLayerId ?? null,
        maximumDiveDepthMeters: roundSceneNumberOrNull(waypoint.maximumDiveDepthMeters ?? waypoint.maximumDepthMeters),
        scienceTargetIds: waypoint.scienceTargetIds ?? []
      }))
    })),
    scienceTargets: (plan.scienceTargets ?? plan.samplingTargets ?? []).map((target) => ({
      id: target.id ?? target.targetId ?? null,
      position: compactPointForScene(target.position ?? target),
      geometryType: target.geometryType ?? target.targetType ?? null,
      attachedSegmentIds: target.attachedSegmentIds ?? [],
      targetDepthLayerId: target.targetDepthLayerId ?? target.depthLayerId ?? null
    }))
  };
}

function terrainValidationMissionKey(mission = {}) {
  return {
    rules: mission.rules ?? null,
    scoring: mission.scoring ?? null,
    physics: mission.physics ?? null,
    waterColumnConfig: mission.waterColumnConfig ?? null,
    agents: (mission.agents ?? []).map((agent) => ({ id: agent.id, optional: agent.optional, required: agent.required, requiredRoute: agent.requiredRoute, deployment: agent.deployment, maxDepthMeters: agent.maxDepthMeters ?? agent.depthRatingMeters }))
  };
}

function compactPointForScene(point = null) {
  if (!point) return null;
  const x = Number(point.x ?? point.col);
  const y = Number(point.y ?? point.row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const out = { x: roundSceneNumberOrNull(x), y: roundSceneNumberOrNull(y) };
  const depth = Number(point.depthMeters ?? point.z);
  if (Number.isFinite(depth)) out.depthMeters = roundSceneNumberOrNull(depth);
  return out;
}

function stableDigestForScene(value) {
  const text = stableStringifyForScene(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableStringifyForScene(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringifyForScene).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringifyForScene(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function roundSceneNumberOrNull(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
function currentVectorViewportWarning(debug = {}) {
  if (debug.currentSafeModeExplicit === true) return 'Current-vector display is disabled by Safe Display mode. Mission physics still use the canonical current field.';
  if (debug.currentPresentationRequested !== true) return null;
  if (debug.currentPresentationEnabled === true) return null;
  if (Number(debug.sourceVectorSampleCount ?? 0) <= 0) return null;
  return 'Current physics are active, but no current vectors are visible. Reason: ' + (debug.noVisibleVectorsReason ?? 'unknown') + '.';
}
function normalizeCurrentDisplayModeAlias(value) {
  if (value === 'allLayers' || value === 'stackedCurrentSlabs' || value === 'explodedCurrentSlabs') return 'allLayers';
  if (value === 'hidden') return 'hidden';
  return 'activeSlice';
}

function normalizeCurrentVectorDensity(value) {
  if (value === 'sparse' || Number(value) >= 2) return 'sparse';
  if (value === 'dense') return 'dense';
  return 'balanced';
}
function normalizeThreeQualityProfile(value) {
  const id = String(value ?? '').trim().toLowerCase();
  if (id === 'performance' || id === 'perf') return 'performance';
  if (id === 'high' || id === 'quality') return 'high';
  return 'balanced';
}
function createMissionWorkspacePerformanceCounters() {
  return {
    missionViewModelBuildCount: 0,
    predictedTrajectoryBuildCount: 0,
    predictedTrajectoryCacheHitCount: 0,
    predictedTrajectoryCacheMissCount: 0,
    modelBuildCountDuringCameraGesture: 0,
    predictionBuildCountDuringCameraGesture: 0,
    panelRenderCountDuringCameraGesture: 0,
    timelineRenderCountDuringCameraGesture: 0
  };
}

function samplingTargetTerrainValidationDebug(viewModel = {}, selectedTargetId = null) {
  const targets = viewModel.scienceTargets ?? [];
  const target = targets.find((candidate) => (candidate.id ?? candidate.targetId) === selectedTargetId) ?? targets[0] ?? null;
  if (!target) return { bottomDepthMeters: null, requestedDepthMeters: null, clearanceMeters: null, validationSource: null };
  const x = Number(target.x ?? target.position?.x ?? 0);
  const y = Number(target.y ?? target.position?.y ?? 0);
  const requestedDepthMeters = Number(target.depthMeters ?? target.position?.depthMeters ?? 0);
  const bottomDepthMeters = sampleGridBilinear(viewModel.bottomBoundary?.bottomDepthField, x, y);
  const clearanceMeters = Number.isFinite(bottomDepthMeters) && Number.isFinite(requestedDepthMeters) ? roundSceneNumber(bottomDepthMeters - requestedDepthMeters) : null;
  return {
    bottomDepthMeters: Number.isFinite(bottomDepthMeters) ? roundSceneNumber(bottomDepthMeters) : null,
    requestedDepthMeters: Number.isFinite(requestedDepthMeters) ? roundSceneNumber(requestedDepthMeters) : null,
    clearanceMeters,
    validationSource: Number.isFinite(bottomDepthMeters) ? 'canonicalBottomBoundary' : 'missingBottomBoundary'
  };
}

function sampleGridBilinear(grid = [], x = 0, y = 0) {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (!height || !width) return null;
  const bx = Math.max(0, Math.min(width - 1, Number(x) || 0));
  const by = Math.max(0, Math.min(height - 1, Number(y) || 0));
  const x0 = Math.floor(bx);
  const y0 = Math.floor(by);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = bx - x0;
  const ty = by - y0;
  const a = Number(grid[y0]?.[x0] ?? 0);
  const b = Number(grid[y0]?.[x1] ?? 0);
  const c = Number(grid[y1]?.[x0] ?? 0);
  const d = Number(grid[y1]?.[x1] ?? 0);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

function roundSceneNumber(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}

function plannedDiveDebugPayload(viewModel = {}, rendererSummary = null, selectedWaypoint = null, selectedAgentId = null) {
  const segments = viewModel.plannedDiveSegments ?? [];
  const selected = selectPlannedDiveSegmentForDebug(segments, selectedWaypoint, selectedAgentId) ?? segments[0] ?? null;
  const summary = rendererSummary?.plannedDiveTrajectorySummary ?? {};
  return {
    type: 'anchor.debug.dive-plan',
    version: 'three-r1-2a-4',
    predictedDiveAvailable: Boolean(selected && (selected.predictedDivePath?.length ?? 0) >= 2),
    predictedDiveSource: selected ? 'PlannedDiveSegmentViewModel' : null,
    predictedDiveModelVersion: selected?.version ?? null,
    selectedSegmentId: selected?.segmentId ?? null,
    selectedSegmentStartWaypointId: selected?.startWaypointId ?? null,
    selectedSegmentTargetWaypointId: selected?.targetWaypointId ?? null,
    selectedSegmentDiveProfileId: selected?.diveProfileId ?? null,
    selectedSegmentTargetLayerId: selected?.targetDepthLayerId ?? null,
    selectedSegmentRequestedDepth: selected?.requestedMaximumDepthMeters ?? null,
    selectedSegmentAchievableDepth: selected?.achievableMaximumDepthMeters ?? null,
    selectedSegmentCycleCount: selected?.cycleCount ?? null,
    selectedSegmentRequestedCycleCount: selected?.requestedCycleCount ?? selected?.cycleCount ?? null,
    selectedSegmentLimitingFactor: selected?.limitingFactor ?? null,
    selectedSegmentSurfaceDistanceMeters: selected?.surfaceDistanceMeters ?? null,
    surfaceIntentPointCount: selected?.surfaceIntentPath?.length ?? 0,
    predictedDivePointCount: selected?.predictedDivePath?.length ?? 0,
    predictedCurrentPathPointCount: selected?.predictedCurrentCorrectedPath?.length ?? 0,
    predictedSampleCount: selected?.predictedSamples?.length ?? 0,
    predictedLayerCrossingCount: selected?.layerCrossings?.length ?? 0,
    predictedBottomTurnCount: selected?.bottomTurns?.length ?? 0,
    predictedSurfacingPosition: selected?.predictedSurfacingPosition ?? null,
    predictedSurfacingOffset: selected?.predictedSurfacingOffset ?? null,
    predictedMinimumBottomClearance: selected?.bottomClearance?.minimumClearanceMeters ?? null,
    predictedTerrainLimited: selected?.bottomClearance?.terrainLimited === true,
    predictedSamplesByLayer: selected?.expectedScience?.samplesByLayer ?? {},
    scienceTargetIds: selected?.scienceTargetIds ?? [],
    targetCoverage: selected?.targetCoverage ?? [],
    targetCoverageStatuses: (selected?.targetCoverage ?? []).map((coverage) => coverage.status),
    warningCodes: selected?.warningCodes ?? [],
    plannedDiveThreeObjectCount: summary.objectCount ?? 0,
    plannedSampleThreeObjectCount: summary.predictedSampleObjectCount ?? 0,
    predictionCanonicalParityStatus: 'single-cycle shares canonical profile/depth constraints; multi-yo is planned prediction only until execution parity is expanded',
    physicalExplodedPredictionDigestMatch: Boolean(viewModel?.plannedDiveSegments),
    bathymetryDemoPathSource: 'fixtureExplicitDepthWaypoints',
    bathymetryDemoUsesCanonicalDiveModel: false,
    rendererOwnsPrediction: false,
    rendererOwnsPlanning: false,
    rendererOwnsSimulation: false,
    rendererOwnsScoring: false,
    usesArbitraryXYZWaypoints: false
  };
}

function segmentFlightPlanDebugPayload(viewModel = {}, plannedDiveDebug = {}, selectedAgentId = null) {
  const routeSegments = viewModel.routeSegments ?? [];
  const plannedSegments = viewModel.plannedDiveSegments ?? [];
  const segmentPlans = viewModel.segmentFlightPlans ?? [];
  const selectedSegmentId = plannedDiveDebug.selectedSegmentId ?? null;
  const selectedRouteSegment = routeSegments.find((segment) => segment.id === selectedSegmentId || segment.routeSegmentId === selectedSegmentId)
    ?? routeSegments.find((segment) => segment.agentId === selectedAgentId)
    ?? routeSegments[0]
    ?? null;
  const selectedPlannedSegment = plannedSegments.find((segment) => segment.segmentId === selectedSegmentId || segment.routeSegmentId === selectedSegmentId)
    ?? plannedSegments.find((segment) => segment.agentId === selectedAgentId)
    ?? plannedSegments[0]
    ?? null;
  const flightPlan = selectedRouteSegment?.flightProfile
    ?? segmentPlans.find((plan) => plan.segmentId === selectedRouteSegment?.id || plan.segmentId === selectedPlannedSegment?.segmentId)
    ?? segmentPlans.find((plan) => plan.agentId === selectedAgentId)
    ?? segmentPlans[0]
    ?? null;
  const planDigest = flightPlan?.digest ?? null;
  const predictionDigest = selectedPlannedSegment?.segmentPlanDigest ?? null;
  const profileDigestMismatch = Boolean(planDigest && predictionDigest && planDigest !== predictionDigest);
  const warnings = [
    ...(flightPlan?.warnings ?? []),
    ...(selectedRouteSegment?.warnings ?? []),
    ...(selectedPlannedSegment?.warnings ?? []),
    ...(profileDigestMismatch ? ['Segment flight plan digest differs from planned dive prediction digest.'] : [])
  ];
  return {
    type: 'anchor.debug.segment-flight-plan',
    version: flightPlan?.version ?? 'segment-flight-plan-dive-r1-1',
    selectedAgentId,
    selectedSegmentId: selectedRouteSegment?.id ?? selectedPlannedSegment?.segmentId ?? selectedSegmentId,
    selectedWaypointId: selectedRouteSegment?.target?.id ?? selectedPlannedSegment?.targetWaypointId ?? plannedDiveDebug.selectedSegmentTargetWaypointId ?? null,
    selectedSegmentStartWaypointId: selectedRouteSegment?.source?.id ?? selectedPlannedSegment?.startWaypointId ?? plannedDiveDebug.selectedSegmentStartWaypointId ?? null,
    selectedSegmentTargetWaypointId: selectedRouteSegment?.target?.id ?? selectedPlannedSegment?.targetWaypointId ?? plannedDiveDebug.selectedSegmentTargetWaypointId ?? null,
    segmentSourceId: selectedRouteSegment?.source?.id ?? selectedPlannedSegment?.startWaypointId ?? plannedDiveDebug.selectedSegmentStartWaypointId ?? null,
    segmentTargetId: selectedRouteSegment?.target?.id ?? selectedPlannedSegment?.targetWaypointId ?? plannedDiveDebug.selectedSegmentTargetWaypointId ?? null,
    selectedSegmentIndex: selectedRouteSegment?.segmentIndex ?? selectedPlannedSegment?.segmentIndex ?? null,
    routeSegmentCount: routeSegments.length,
    segmentFlightPlanCount: segmentPlans.length,
    profileId: flightPlan?.profileId ?? selectedPlannedSegment?.diveProfileId ?? plannedDiveDebug.selectedSegmentDiveProfileId ?? null,
    profileSource: flightPlan?.profileSource ?? selectedPlannedSegment?.profileSource ?? null,
    inheritedFrom: flightPlan?.profileSource ?? null,
    targetDepthLayerId: flightPlan?.targetDepthLayerId ?? selectedPlannedSegment?.targetDepthLayerId ?? plannedDiveDebug.selectedSegmentTargetLayerId ?? null,
    targetDepthMeters: flightPlan?.targetDepthMeters ?? null,
    minimumImmersionMeters: flightPlan?.minimumImmersionMeters ?? 0,
    maximumImmersionMeters: flightPlan?.maximumImmersionMeters ?? selectedPlannedSegment?.requestedMaximumDepthMeters ?? plannedDiveDebug.selectedSegmentRequestedDepth ?? null,
    requestedCycleCount: flightPlan?.cycleCount ?? selectedPlannedSegment?.requestedCycleCount ?? plannedDiveDebug.selectedSegmentRequestedCycleCount ?? null,
    achievableCycleCount: selectedPlannedSegment?.cycleCount ?? plannedDiveDebug.selectedSegmentCycleCount ?? null,
    sampleIntervalSeconds: flightPlan?.sampleIntervalSeconds ?? selectedPlannedSegment?.sampleIntervalSeconds ?? null,
    samplingPhase: flightPlan?.samplingPhase ?? selectedPlannedSegment?.samplingPhase ?? 'profileDefault',
    surfaceAtEnd: flightPlan?.surfaceAtEnd === true || selectedPlannedSegment?.surfaceAtEnd === true,
    arrivalBehavior: flightPlan?.arrivalBehavior ?? selectedPlannedSegment?.arrivalBehavior ?? null,
    communicationWaitSeconds: flightPlan?.communicationWaitSeconds ?? 0,
    predictedMinimumDepthMeters: 0,
    predictedMaximumDepthMeters: selectedPlannedSegment?.achievableMaximumDepthMeters ?? plannedDiveDebug.selectedSegmentAchievableDepth ?? null,
    predictedSampleLayerIds: Object.keys(selectedPlannedSegment?.expectedScience?.samplesByLayer ?? plannedDiveDebug.predictedSamplesByLayer ?? {}),
    limitingFactors: [selectedPlannedSegment?.limitingFactor ?? plannedDiveDebug.selectedSegmentLimitingFactor ?? flightPlan?.feasibility?.limitingFactor].filter(Boolean),
    segmentPlanDigest: planDigest,
    planDigest,
    predictionDigest,
    executionProfileDigest: planDigest,
    profileDigestMismatch,
    waypointIsHorizontalTarget: true,
    segmentOwnsFlightProfile: true,
    waypointOwnsVerticalCommand: false,
    targetDepthMetadataCanScore: false,
    descendAscendAreExecutionPhases: true,
    rendererOwnsPlanning: false,
    rendererOwnsSimulation: false,
    rendererOwnsScoring: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesNewPlanner: false,
    warnings,
    failures: profileDigestMismatch ? ['profileDigestMismatch'] : []
  };
}

function waterColumnExplorerDebugPayload(viewModel = {}, rendererSummary = null, waterColumnDebug = {}) {
  const explorer = viewModel.waterColumnExplorer ?? {};
  const summary = waterColumnDebug.waterColumnExplorer ?? {};
  const slabSummary = rendererSummary?.operationalDepthSlabSummary ?? {};
  return {
    type: 'anchor.debug.water-column-layer-explorer',
    version: explorer.version ?? summary.version ?? 'water-column-layer-explorer-dive-r1-1',
    activeVariable: explorer.activeVariable ?? summary.activeVariable ?? null,
    activeLayerId: explorer.activeLayerId ?? summary.activeLayerId ?? waterColumnDebug.activeDepthLayerId ?? null,
    activeDepthMeters: explorer.activeDepthMeters ?? summary.activeDepthMeters ?? null,
    displayMode: explorer.displayMode ?? summary.displayMode ?? null,
    comparisonLayerId: explorer.comparisonLayerId ?? summary.comparisonLayerId ?? null,
    interpolationMode: explorer.interpolationMode ?? summary.interpolationMode ?? null,
    lowerInterpolationLayerId: explorer.lowerInterpolationLayerId ?? summary.lowerInterpolationLayerId ?? null,
    upperInterpolationLayerId: explorer.upperInterpolationLayerId ?? summary.upperInterpolationLayerId ?? null,
    interpolationFraction: explorer.interpolationFraction ?? summary.interpolationFraction ?? null,
    layerCount: explorer.layers?.length ?? summary.layerCount ?? waterColumnDebug.availableLayerCount ?? 0,
    physicalLayerCount: summary.physicalLayerCount ?? explorer.layers?.filter?.((layer) => layer.id !== 'integratedWaterColumn').length ?? 0,
    includesIntegratedSummary: Boolean(explorer.integratedSummary ?? summary.includesIntegratedSummary),
    integratedWaterColumnAvailable: Boolean(explorer.integratedSummary ?? summary.includesIntegratedSummary),
    integratedWaterColumnIsDerived: explorer.boundaryFlags?.integratedWaterColumnIsDerived !== false,
    selectedVerticalProfile: explorer.selectedVerticalProfile ?? [],
    selectedLocation: explorer.selectedLocation ?? null,
    selectedEastMeters: explorer.selectedLocation?.x ?? summary.selectedEastMeters ?? null,
    selectedNorthMeters: explorer.selectedLocation?.y ?? summary.selectedNorthMeters ?? null,
    selectedActualDepthMeters: explorer.selectedLocation?.depthMeters ?? summary.selectedActualDepthMeters ?? null,
    sourceResolution: explorer.sourceResolution ?? { columns: summary.sourceColumns ?? null, rows: summary.sourceRows ?? null, depthLayers: summary.layerCount ?? null },
    displayResolution: explorer.displayResolution ?? { columns: summary.displayColumns ?? null, rows: summary.displayRows ?? null },
    sourceColumns: explorer.sourceResolution?.columns ?? summary.sourceColumns ?? null,
    sourceRows: explorer.sourceResolution?.rows ?? summary.sourceRows ?? null,
    displayColumns: explorer.displayResolution?.columns ?? summary.displayColumns ?? null,
    displayRows: explorer.displayResolution?.rows ?? summary.displayRows ?? null,
    activeScalarSourceDigest: explorer.activeScalarSourceDigest ?? summary.activeScalarSourceDigest ?? null,
    activeCurrentSourceDigest: explorer.activeCurrentSourceDigest ?? summary.activeCurrentSourceDigest ?? null,
    terrainBuildCount: rendererSummary?.terrainBuildCount ?? rendererSummary?.terrainObjectBuildCount ?? 0,
    slabBuildCount: slabSummary.slabBuildCount ?? slabSummary.slabObjectBuildCount ?? waterColumnDebug.slabObjectCount ?? 0,
    textureUpdateCount: slabSummary.textureUpdateCount ?? waterColumnDebug.fieldTextureCount ?? 0,
    texturedSlabCount: summary.texturedSlabCount ?? waterColumnDebug.activeTexturedSlabCount ?? 0,
    contextSlabCount: summary.contextSlabCount ?? waterColumnDebug.contextOutlineSlabCount ?? 0,
    vectorGlyphCount: summary.vectorGlyphCount ?? waterColumnDebug.currentVectorObjectCount ?? 0,
    displayOwnsScience: explorer.boundaryFlags?.displayOwnsScience === true,
    displayOwnsCurrent: explorer.boundaryFlags?.displayOwnsCurrent === true,
    displayOwnsSampling: explorer.boundaryFlags?.displayOwnsSampling === true,
    displayChangesScoring: explorer.boundaryFlags?.displayChangesScoring === true,
    ownsSimulation: explorer.boundaryFlags?.ownsSimulation === true,
    ownsPlanning: explorer.boundaryFlags?.ownsPlanning === true,
    ownsScoring: explorer.boundaryFlags?.ownsScoring === true,
    usesNewPlanner: explorer.boundaryFlags?.usesNewPlanner === true,
    publicSafe: explorer.boundaryFlags?.hiddenTruthIncluded !== true,
    warnings: [...(explorer.warnings ?? []), ...(summary.warnings ?? [])],
    failures: []
  };
}

function selectPlannedDiveSegmentForDebug(segments = [], selectedWaypoint = null, selectedAgentId = null) {
  if (!segments.length) return null;
  if (selectedWaypoint?.agentId) {
    const selectedIndex = Number(selectedWaypoint.index);
    const segment = segments.find((candidate) => candidate.agentId === selectedWaypoint.agentId && Number(candidate.segmentIndex) === selectedIndex);
    if (segment) return segment;
  }
  return segments.find((candidate) => candidate.agentId === selectedAgentId) ?? segments[0] ?? null;
}
function setSelectedStartPreview(level, mission, agentId, cell) {
  const agent = mission?.agents?.find((candidate) => candidate.id === agentId);
  if (!agent) return { valid: false, message: 'No active glider selected.' };
  const grid = level?.world?.grid ?? {};
  const rounded = { x: Math.round(Number(cell?.x)), y: Math.round(Number(cell?.y)) };
  if (!Number.isFinite(rounded.x) || !Number.isFinite(rounded.y)) return { valid: false, message: 'Pointer is outside the mission grid.' };
  if (rounded.x < 0 || rounded.y < 0 || rounded.x >= Number(grid.width ?? 0) || rounded.y >= Number(grid.height ?? 0)) return { valid: false, message: 'Deployment cell is outside the map.' };
  if (level?.layers?.terrain?.[rounded.y]?.[rounded.x]) return { valid: false, message: 'Deployment cell must be water.' };
  const zones = getDeploymentZonesForAgent(level, mission, agentId);
  if (!zones.some((zone) => zone.cells?.some((candidate) => candidate.x === rounded.x && candidate.y === rounded.y))) return { valid: false, message: 'Choose a deployment cell inside the drop zone first.' };
  return { valid: true, message: 'Valid deployment cell.' };
}
function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  const base = Number.isFinite(numeric) ? numeric : Number(fallback);
  return Math.max(Number(min), Math.min(Number(max), base));
}
function escapeSceneHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}
