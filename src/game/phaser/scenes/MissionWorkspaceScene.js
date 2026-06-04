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
  validatePlan
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
import {
  getDeploymentZonesForAgent,
  getSelectedStart,
  normalizeDeploymentState,
  requiresDeploymentSelection,
  setSelectedStart
} from '../../../core/deployment/DeploymentZones.js';

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
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.setSceneLabel('Mission Workspace');
    this.app.state.mode = 'planning';
    this.app.elements.shell?.classList.add('planning-workspace');
    this.app.state.ui ??= {};
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
    this.app.state.planningTime = clampMissionTime(this.app.state.level, this.app.state.planningTime ?? 0);
    this.app.state.selectedWindow = getWindowForTime(this.app.state.level, this.app.state.planningTime);
    normalizeStochasticState(this.app.state);
    recomputeAllWaypointTiming(this.app.state);
    applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
    this.mapGraphics = this.add.graphics();
    this.mapGraphics.setDepth(0);
    this.app.clearPanels();
    this.modal = new Modal(this);
    this.fileBridge = new FileBridge({ onFile: (file) => this.importPlanFile(file) });
    this.renderHud();
    this.renderCameraControls();
    this.setupMapCameraControls();
    this.refreshPanels();
    this.refreshMap();
    this.consumePendingAutoExecute();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.onViewportResize = () => {
      globalThis.requestAnimationFrame?.(() => this.refreshMap());
    };
    globalThis.addEventListener?.('resize', this.onViewportResize);
    this.resizeObserver = globalThis.ResizeObserver
      ? new globalThis.ResizeObserver(this.onViewportResize)
      : null;
    if (this.resizeObserver && this.app.elements.viewportShell) {
      this.resizeObserver.observe(this.app.elements.viewportShell);
    }
    this.focusManager = new FocusManager(this);
    this.focusManager.setActions([
      () => this.executePlan(),
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

  shutdown() {
    this.app.mapHoverTooltip?.hide();
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    globalThis.removeEventListener?.('resize', this.onViewportResize);
    this.resizeObserver?.disconnect();
    this.input.off('wheel', this.onWheelZoom, this);
    this.input.keyboard?.off('keydown', this.onCameraKeyDown, this);
    this.clearPlanningOverlayObjects();
    this.cameraObjects.forEach((object) => object.destroy?.());
    this.cameraObjects = [];
    this.hud?.destroy();
    this.executeHotspot?.destroy();
    this.modal?.destroy();
    this.fileBridge?.destroy();
  }

  update() {
    this.focusManager?.update();
  }

  renderHud() {
    this.hud = new HtmlMissionWorkspaceOverlay(this.app, {
      execute: () => this.executePlan(),
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
      rerunSamePlan: () => this.rerunSamePlan(),
      rerunWithNewSeed: () => this.rerunWithNewSeed(),
      toggleGuidance: () => this.toggleGuidance(),
      mainMenu: () => this.scene.start('MainMenuScene')
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
    this.executeHotspot.on('pointerup', () => this.executePlan());
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
    this.hud?.refresh(this.app.state);
    this.app.waypointPanel?.refresh(this.app.state);
    this.app.summaryHud?.refresh(this.app.state);
    this.app.agentPerformanceHud?.refresh(this.app.state);
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
    return this.app.state.ui.routeAudit;
  }

  refreshMap() {
    this.clearPlanningOverlayObjects();
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
    this.markManualPlan();
    this.afterPlanChanged(agentId);
    this.app.toast(`Deployment start selected at (${cell.x}, ${cell.y}).`, 'success');
    this.refreshPanels();
    this.refreshMap();
    return true;
  }

  selectWaypoint(agentId, index) {
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
    this.app.state.selectedAgentId = agentId;
    this.app.state.ui.hoverCell = null;
    this.clearSelectedWaypoint();
    applyPlanningAnchor(this.app.state, agentId);
    this.refreshPanels();
    this.refreshMap();
  }

  promptStartChange(agentId) {
    this.app.state.selectedAgentId = agentId;
    this.app.state.ui.hoverCell = null;
    this.clearSelectedWaypoint();
    applyPlanningAnchor(this.app.state, agentId);
    this.app.toast('Click a valid drop-zone cell to set or change this glider start.', 'info');
    this.refreshPanels();
    this.refreshMap();
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


  addWaypointForSelected({ x, y, action }) {
    const targetX = Math.round(x);
    const targetY = Math.round(y);
    if (requiresDeploymentSelection(this.app.state.mission, this.app.state.selectedAgentId)) {
      this.app.toast('Choose a deployment cell first.', 'warning');
      return;
    }
    const disabledReason = getPlacementDisabledReason(this.app.state, this.app.state.selectedAgentId);
    if (disabledReason) {
      this.app.toast(`Placement disabled: ${disabledReason}. Delete, move, reorder, or clear waypoints to repair the plan.`, 'warning');
      return;
    }
    const validity = isValidWaypointCell(this.app.state.level, targetX, targetY);
    if (!validity.valid && validity.block) {
      this.app.toast(validity.message, 'warning');
      return;
    }
    if (validity.warning) this.app.toast(validity.message, 'warning');
    const placement = canPlaceWaypoint(this.app.state, this.app.state.selectedAgentId, { x: targetX, y: targetY, action });
    if (!placement.allowed) {
      this.app.toast(placement.message || 'Waypoint placement is not available for this route.', 'warning');
      return;
    }
    if (placement.estimate?.warnings?.length) {
      this.app.toast(placement.estimate.warnings[0], 'warning');
    }
    const waypoint = addWaypoint(this.app.state.plan, this.app.state.selectedAgentId, {
      window: placement.estimate.window,
      t: placement.estimate.arrivalTime,
      x: targetX,
      y: targetY,
      action
    });
    const absorbedMarker = absorbPlanningMarkersForWaypoint(this.app.state.plan, waypoint);
    const index = (this.app.state.plan.agentPlans.find((plan) => plan.agentId === this.app.state.selectedAgentId)?.waypoints?.length ?? 1) - 1;
    this.app.state.ui.selectedWaypoint = { agentId: this.app.state.selectedAgentId, index };
    this.app.state.ui.selectedMarker = null;
    this.afterPlanChanged(this.app.state.selectedAgentId, { selectedIndex: index });
    if (waypoint?.warnings?.some((warning) => String(warning).toLowerCase().includes('blocked'))) {
      this.app.toast('Route preview is blocked by land; planning anchor stayed at the previous reachable point.', 'warning');
    } else if (waypoint?.warnings?.some((warning) => String(warning).toLowerCase().includes('surfacing'))) {
      this.app.toast('Waypoint is likely beyond the next surfacing window.', 'warning');
    } else if (absorbedMarker) {
      this.app.toast('Marker converted to waypoint.', 'success');
    }
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
  }

  addMarkerForSelected({ x, y }) {
    const agentId = this.app.state.selectedAgentId ?? this.app.state.mission?.agents?.[0]?.id ?? null;
    const validity = isValidWaypointCell(this.app.state.level, x, y);
    if (!validity.valid && validity.block) {
      this.app.toast(validity.message.replace('Waypoints', 'Markers'), 'warning');
      return;
    }
    if (validity.warning) this.app.toast('Marker placed inside a hazard cell.', 'warning');
    const target = findPriorityTargetNearCell(this.app.state.level, this.app.state.planningTime, x, y);
    const inspection = inspectCellAtTime({
      level: this.app.state.level,
      mission: this.app.state.mission,
      state: this.app.state,
      x,
      y,
      t: this.app.state.planningTime
    });
    addMarker(this.app.state.plan, agentId, {
      x,
      y,
      t: this.app.state.planningTime,
      window: this.app.state.selectedWindow,
      type: target ? 'priorityTargetMarker' : 'futureTarget',
      label: target?.label ?? (inspection?.roiValue > 0 ? 'Future sample' : 'Planning Marker'),
      linkedTargetId: target?.id ?? null,
      roiValueAtPlacement: inspection?.roiValue ?? null,
      priorityValueAtPlacement: target?.value ?? null
    });
    recomputePlanningMarkerReachability(this.app.state, agentId);
    const markerIndex = (this.app.state.plan.planningMarkers?.length ?? 1) - 1;
    this.app.state.ui.selectedMarker = { index: markerIndex };
    this.app.state.ui.selectedWaypoint = null;
    this.markManualPlan();
    this.refreshPanels();
    this.refreshMap();
    this.app.toast(target ? `Marker linked to ${target.label ?? target.id}.` : 'Planning marker added.', 'success');
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
    if (this.app.state.currentPlanSource === 'importedSolver' || this.app.state.currentPlanSource === 'oracleSolver') this.app.state.solverPlan = normalized;
    else this.app.state.manualPlan = normalized;
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
    this.app.state.manualPlan = this.app.state.plan;
  }

  executePlan() {
    this.app.state.simulationTrace = createSimulationTrace();
    traceSimulation(this.app.state.simulationTrace, {
      scene: 'MissionWorkspaceScene',
      phase: 'execute.clicked',
      simTime: this.app.state.planningTime ?? 0,
      message: 'Execute clicked'
    });
    this.applyMissionOptionsToMission();
    applyStochasticToMission(this.app.state);
    normalizeDeploymentState(this.app.state.level, this.app.state.mission, this.app.state.plan);
    const missingDeployment = (this.app.state.mission.agents ?? []).find((agent) => requiresDeploymentSelection(this.app.state.mission, agent.id));
    if (missingDeployment) {
      this.app.state.selectedAgentId = missingDeployment.id;
      this.showRouteValidationModal({
        message: `${missingDeployment.label ?? missingDeployment.id} needs a deployment cell before simulation.`,
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
    recomputeAllWaypointTiming(this.app.state);
    const routeAudit = this.refreshRouteAudit();
    traceSimulation(this.app.state.simulationTrace, {
      scene: 'MissionWorkspaceScene',
      phase: 'validation.start',
      simTime: this.app.state.planningTime ?? 0,
      message: 'Validating plan before simulation'
    });
    const validation = validatePlanForExecution({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan
    });
    if (!validation.ok) {
      this.app.state.ui.routeAudit = validation.routeAudit ?? routeAudit;
      const blockingIssue = firstBlockingRouteIssue(validation);
      this.focusRouteIssue(blockingIssue);
      traceSimulation(this.app.state.simulationTrace, {
        scene: 'MissionWorkspaceScene',
        phase: 'validation.fail',
        simTime: this.app.state.planningTime ?? 0,
        message: validation.errors[0] ?? 'Validation failed',
        details: { errors: validation.errors }
      });
      this.refreshPanels();
      this.refreshMap();
      this.showRouteValidationModal(blockingIssue, validation);
      return;
    }
    traceSimulation(this.app.state.simulationTrace, {
      scene: 'MissionWorkspaceScene',
      phase: 'validation.pass',
      simTime: this.app.state.planningTime ?? 0,
      message: 'Plan validation passed'
    });
    attachIdentityToPlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
    if (this.app.state.currentPlanSource === 'manual') this.app.state.manualPlan = this.app.state.plan;
    this.clearPlanningPreviewState();
    this.app.state.mode = 'simulation';
    this.scene.start('SimulationScene');
  }

  focusRouteIssue(issue = {}) {
    const agentId = issue.agentId ?? issue.to?.agentId ?? this.app.state.selectedAgentId ?? this.app.state.mission?.agents?.[0]?.id ?? null;
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
      this.app.toast?.('Temporal Greedy planner is already running.', 'info');
      return;
    }
    const requestId = createGameInstanceId('TPLAN');
    this.app.state.ui.plannerState.temporalGreedyRunning = true;
    this.app.state.ui.plannerState.activePlannerRequestId = requestId;
    this.app.state.ui.temporalGreedyRunning = true;
    this.refreshPanels();
    this.app.toast?.('Planning Temporal Greedy route...', 'info');
    try {
      const request = buildTemporalGreedyRequest({
        level: this.app.state.level,
        mission: this.app.state.mission,
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
          if (progress?.phase === 'running') this.app.toast?.('Temporal Greedy planner running...', 'info');
        }
      });
      if (!this.isActiveTemporalGreedyRequest(requestId)) return;
      if (result?.requestId && result.requestId !== requestId) return;
      if (!result.ok) throw new Error(result.error ?? 'Temporal Greedy planning failed.');
      this.app.state.plan = result.plan;
      attachIdentityToPlan(this.app.state.plan, this.app.state.level, this.app.state.mission);
      recomputeAllWaypointTiming(this.app.state);
      applyPlanningAnchor(this.app.state, this.app.state.selectedAgentId);
      this.app.state.currentPlanSource = 'temporalGreedy';
      this.app.state.temporalGreedyPlan = this.app.state.plan;
      this.refreshMap();
      this.app.toast?.(temporalGreedySummary(this.app.state.plan, this.app.state.level, this.app.state.mission), this.app.state.plan?.meta?.valid === false ? 'warning' : 'success');
    } catch (error) {
      if (this.isActiveTemporalGreedyRequest(requestId)) {
        console.error('Temporal Greedy planning failed.', error);
        this.app.toast?.(error?.name === 'AbortError' ? 'Temporal Greedy cancelled.' : error?.message ?? 'Temporal Greedy planning failed.', 'warning');
      }
    } finally {
      if (this.isActiveTemporalGreedyRequest(requestId)) {
        this.clearTemporalGreedyBusyState();
        this.refreshPanels();
      }
    }
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
  const depletion = plan?.meta?.sharedDepletion ?? {};
  const guardFailure = Boolean(stop.guardFailure || (stop.agents ?? []).some((agentStop) => agentStop.guardFailure));
  const complete = !guardFailure && (!stop.remainingMissionTime || stop.stopReason === 'mission_time_exhausted' || stop.stopReason === 'fuel_exhausted');
  const lines = [
    guardFailure ? 'Temporal Greedy guard stopped' : complete ? 'Temporal Greedy complete' : 'Temporal Greedy stopped early',
    `Waypoints: ${waypointCount}`,
    `Planned time: ${formatRouteNumber(stopTime)} / ${formatRouteNumber(duration)} hr`,
    `Fuel used: ${formatRouteNumber(fuelUsed)} / ${formatRouteNumber(startingFuel)}`,
    depletion.enabled
      ? `Shared depletion: enabled, duplicate samples avoided: ${depletion.duplicateSamplesAvoided ?? 0}`
      : 'Shared depletion: single-agent not needed',
    `Stop reason: ${labelizeStopReason(stop.stopReason)}`
  ];
  if (unreachableCandidates > 0) lines.splice(5, 0, `Skipped unreachable candidates: ${unreachableCandidates}`);
  if (blockedCandidates > 0) lines.splice(5, 0, `Skipped blocked candidates: ${blockedCandidates}`);
  if (stochasticRiskCandidates > 0) lines.splice(5, 0, `Skipped unknown-current shoreline risks: ${stochasticRiskCandidates}`);
  if (guardFailure) lines.splice(5, 0, 'Planner guard hit before a normal stop condition.');
  return lines.join('\n');
}

function labelizeStopReason(reason) {
  return String(reason ?? 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
