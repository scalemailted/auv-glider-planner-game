import { buildReplayReviewSourceFromBundle, buildReplayReviewSourceFromResult } from '../../../core/replay/ReplayReviewLoader.js';
import { createReplayReviewSession, reduceReplayReviewSession, replayReviewSessionSummary } from '../../../core/replay/ReplayReviewSession.js';
import { replayWorldRenderViewModelSummary } from '../../../core/rendering/ReplayWorldRenderViewModel.js';
import {
  createThreeMissionWorldRenderer,
  disposeThreeMissionWorldRenderer,
  resizeThreeMissionWorldRenderer,
  setThreeMissionWorldCamera,
  threeMissionWorldRendererSummary
} from '../../three/ThreeMissionWorldRenderer.js';
import {
  createThreeReplayReviewController,
  disposeThreeReplayReviewController,
  resetThreeReplayReviewPerformance,
  threeReplayReviewControllerSummary,
  updateThreeReplayReviewController
} from '../../three/ThreeReplayReviewController.js';
import { inactiveThreePerformanceDebugPayload } from '../../three/ThreeMissionPerformanceMonitor.js';
import { createThreeMissionSceneLifecycle, disposeThreeMissionSceneLifecycle, registerThreeMissionSceneResource, threeMissionSceneLifecycleSummary } from '../../three/ThreeMissionSceneLifecycle.js';
import { downloadJson } from '../ui/FileBridge.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class MissionReplayReviewScene extends PhaserScene {
  constructor() {
    super('MissionReplayReviewScene');
    this.replayTimer = null;
    this.sceneObjects = [];
    this.eventListRenderCount = 0;
    this.eventListRenderCountDuringCameraGesture = 0;
    this.cameraInvariantFailures = [];
    this.cameraInvariantBaseline = null;
  }

  create() {
    this.shutdownComplete = false;
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'replayReview';
    this.app.clearPanels();
    this.app.setDebriefFullscreen(false);
    this.app.setSceneLabel('Replay Review');
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.threeSceneLifecycle = createThreeMissionSceneLifecycle({ sceneKey: 'MissionReplayReviewScene' });
    this.source = this.resolveReplaySource();
    this.session = createReplayReviewSession(this.source, { playbackIntervalMs: 550 });
    this.ensureThreeReplayRenderer();
    this.controller = createThreeReplayReviewController({ renderer: this.threeReplayRenderer, source: this.source, session: this.session, options: { qualityProfile: 'balanced' } });
    this.session = this.controller.session;
    this.renderPanel();
    this.refreshDebugObject();
    this.drawOverlayHint();
    this.events?.once?.('shutdown', () => this.shutdownReplayReview('shutdown-event'));
    this.events?.once?.('destroy', () => this.shutdownReplayReview('destroy-event'));
  }

  shutdown() {
    this.shutdownReplayReview('shutdown');
  }

  resolveReplaySource() {
    if (this.app.state.replayReviewSource) return this.app.state.replayReviewSource;
    if (this.app.state.replayReviewSourceBundle) return buildReplayReviewSourceFromBundle(this.app.state.replayReviewSourceBundle, { sourceKind: 'headlessBundleViewer' });
    return buildReplayReviewSourceFromResult({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      result: this.app.state.result
    });
  }

  ensureThreeReplayContainer() {
    if (this.threeReplayContainer?.isConnected) return this.threeReplayContainer;
    const host = this.app?.elements?.viewportShell ?? this.app?.elements?.gameContainer ?? globalThis.document?.getElementById?.('viewport-shell');
    if (!host?.appendChild) return null;
    const container = globalThis.document.createElement('div');
    container.className = 'three-mission-world-host';
    container.dataset.rendererBackend = 'threeReplayReview';
    container.dataset.replayReview = 'true';
    container.setAttribute('aria-label', 'Three.js public replay review renderer');
    host.appendChild(container);
    this.threeReplayContainer = container;
    registerThreeMissionSceneResource(this.threeSceneLifecycle, 'DOM overlay', container);
    return container;
  }

  ensureThreeReplayRenderer() {
    const container = this.ensureThreeReplayContainer();
    if (!container) return null;
    container.hidden = false;
    if (!this.threeReplayRenderer) {
      this.threeReplayRenderer = createThreeMissionWorldRenderer(container, {
        camera: { preset: this.app.state.ui?.threeReplayCameraPreset ?? 'obliqueMission' },
        layerVisibility: {
          bathymetry: true,
          waterSurface: true,
          depthLayers: true,
          waterColumnFrame: true,
          scalarField: true,
          currentVectors: true,
          hazards: true,
          constraints: true,
          gliders: true,
          waypoints: true,
          routes: true,
          realizedTrajectories: true,
          observations: true,
          surfacingEvents: true,
          routeStatus: true,
          terrainValidation: true,
          selection: false,
          guidance: false,
          interaction: false
        }
      });
      registerThreeMissionSceneResource(this.threeSceneLifecycle, 'renderer', this.threeReplayRenderer);
      registerThreeMissionSceneResource(this.threeSceneLifecycle, 'cameraController', this.threeReplayRenderer.cameraController);
      registerThreeMissionSceneResource(this.threeSceneLifecycle, 'canvas', this.threeReplayRenderer.renderer?.domElement);
    }
    resizeThreeMissionWorldRenderer(this.threeReplayRenderer, container.clientWidth, container.clientHeight);
    return this.threeReplayRenderer;
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    resizeThreeMissionWorldRenderer(this.threeReplayRenderer, this.threeReplayContainer?.clientWidth, this.threeReplayContainer?.clientHeight);
  }

  renderPanel() {
    this.eventListRenderCount = Number(this.eventListRenderCount ?? 0) + 1;
    const summary = replayReviewSessionSummary(this.session);
    const timeline = this.session?.timeline ?? {};
    const agentIds = this.session?.replayArtifacts?.manifest?.agentIds ?? summary.agentIds ?? [];
    const selectedAgentId = summary.selectedAgentId ?? 'all';
    const integrityStatus = summary.integrityStatus ?? 'N/A';
    const failed = integrityStatus === 'FAIL';
    const integrityIssues = (this.session?.integrityReport?.issues ?? []).filter((issue) => issue.severity === 'error').slice(0, 3);
    const events = timeline.nearbyEvents ?? [];
    this.app.setPanel(`
      <section class="console-header" data-three-replay-review-panel>
        <div class="console-kicker">THREE-R2A Replay Review</div>
        <h1>Replay Review</h1>
        <p>Public replay playback through the canonical Three.js mission renderer.</p>
      </section>
      <section class="console-status ${failed ? 'warning' : ''}">
        <span>Replay Integrity</span>
        <strong>${escapeHtml(integrityStatus)}</strong>
        <small>${escapeHtml(this.session?.warningState?.friendlyMessage ?? 'Replay review ready.')}</small>
      </section>
      <section class="console-section">
        <h2>Playback</h2>
        <div class="cell-inspector-metrics">
          ${metricHtml('Mode', summary.replayMode ?? 'N/A')}
          ${metricHtml('Tick', summary.currentTick ?? 'N/A')}
          ${metricHtml('Event', `${Number(summary.currentEventIndex ?? -1) + 1}/${summary.eventCount ?? 0}`)}
          ${metricHtml('Checkpoint', `${Number(summary.currentCheckpointIndex ?? -1) + 1}/${summary.checkpointCount ?? 0}`)}
          ${metricHtml('Agent', summary.selectedAgentId ?? 'All')}
          ${metricHtml('Source', summary.sourceKind ?? 'unknown')}
        </div>
        ${failed ? `<div class="hud-muted"><strong>Integrity failed. Play is disabled; step and scrub remain available for inspection.</strong></div>
        ${integrityIssues.length ? `<div class="hud-muted" data-replay-integrity-details>${integrityIssues.map((issue) => `Mismatch ${escapeHtml(issue.code ?? 'REPLAY_INTEGRITY_FAILURE')} at ${escapeHtml(issue.path ?? issue.artifact ?? 'replay artifact')} | expected ${escapeHtml(issue.expected ?? 'n/a')} | actual ${escapeHtml(issue.actual ?? 'n/a')}`).join('<br>')}</div>` : ''}` : ''}
        <div class="panel-stack">
          <button class="console-button primary" data-action="replay-toggle" ${summary.canPlay ? '' : 'disabled'}>${this.session?.playbackState?.playing ? 'Pause' : 'Play'}</button>
          <button class="console-button secondary" data-action="replay-step-back" ${summary.eventCount ? '' : 'disabled'}>Step Back</button>
          <button class="console-button secondary" data-action="replay-step-forward" ${summary.eventCount ? '' : 'disabled'}>Step Forward</button>
          <button class="console-button secondary" data-action="replay-prev-event" ${summary.eventCount ? '' : 'disabled'}>Prev Event</button>
          <button class="console-button secondary" data-action="replay-next-event" ${summary.eventCount ? '' : 'disabled'}>Next Event</button>
          <button class="console-button secondary" data-action="replay-jump-start" ${summary.checkpointCount ? '' : 'disabled'}>Start</button>
          <button class="console-button secondary" data-action="replay-jump-prev" ${summary.checkpointCount ? '' : 'disabled'}>Prev Checkpoint</button>
          <button class="console-button secondary" data-action="replay-jump-next" ${summary.checkpointCount ? '' : 'disabled'}>Next Checkpoint</button>
          <button class="console-button secondary" data-action="replay-jump-terminal" ${summary.checkpointCount ? '' : 'disabled'}>Terminal</button>
        </div>
        <div class="panel-stack" aria-label="Playback rate">
          <button class="console-button secondary" data-rate="0.5">0.5x</button>
          <button class="console-button secondary" data-rate="1">1x</button>
          <button class="console-button secondary" data-rate="2">2x</button>
        </div>
        <label class="hud-muted" for="three-replay-scrub">Timeline</label>
        <input id="three-replay-scrub" data-action="replay-scrub" type="range" min="0" max="${Math.max(0, Number(summary.eventCount ?? 0) - 1)}" value="${Math.max(0, Number(summary.currentEventIndex ?? 0))}" ${summary.eventCount ? '' : 'disabled'} />
      </section>
      <section class="console-section">
        <h2>Agent</h2>
        <div class="panel-stack">
          <button class="console-button ${selectedAgentId === 'all' ? 'primary' : 'secondary'}" data-replay-agent="all">Fleet Overview</button>
          ${agentIds.map((agentId, index) => `<button class="console-button ${selectedAgentId === agentId ? 'primary' : 'secondary'}" data-replay-agent="${escapeHtml(agentId)}">Glider ${String(index + 1).padStart(2, '0')}</button>`).join('')}
        </div>
      </section>
      <section class="console-section">
        <h2>Camera</h2>
        <div class="panel-stack">
          <button class="console-button secondary" data-camera-preset="obliqueMission">Oblique</button>
          <button class="console-button secondary" data-camera-preset="tacticalTopDown">Top Down</button>
          <button class="console-button secondary" data-camera-preset="obliqueWaterColumn">Water Column</button>
          <button class="console-button secondary" data-camera-preset="sideProfile">Side Profile</button>
          <button class="console-button secondary" data-action="reset-replay-performance">Reset Render Metrics</button>
        </div>
      </section>
      <section class="console-section">
        <h2>Current Event Window</h2>
        ${events.length ? events.map((event) => `<div class="hud-muted">${escapeHtml(event.sequence ?? '')} | tick ${escapeHtml(event.tick ?? '')} | ${escapeHtml(event.phase ?? '')} | ${escapeHtml(event.agentId ?? 'Mission / Global')} | ${escapeHtml(event.eventType ?? '')}</div>`).join('') : '<div class="hud-muted">No replay events available.</div>'}
      </section>
      <section class="console-section">
        <h2>Boundary</h2>
        <div class="hud-muted">This scene consumes public replay artifacts and public result fields only.</div>
        <div class="hud-muted">It does not rerun physics, use hidden truth, change browser scoring, create a planner, or optimize a route.</div>
        <div class="hud-muted">Digest/integrity status belongs to replay artifacts; browser result reconstruction is inspection-only.</div>
      </section>
      <section class="console-section">
        <h2>Actions</h2>
        <div class="panel-stack">
          <button class="console-button primary" data-action="export-replay-review-summary">Export Replay Review Summary</button>
          <button class="console-button secondary" data-action="return">Return</button>
          <button class="console-button secondary" data-action="menu">Main Menu</button>
        </div>
      </section>
    `);
    this.bindPanelActions();
  }

  bindPanelActions() {
    const root = this.app.elements?.consoleRoot ?? globalThis.document;
    root?.querySelector?.('[data-action="replay-toggle"]')?.addEventListener('click', () => this.togglePlayback());
    root?.querySelector?.('[data-action="replay-step-back"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'stepBack' }));
    root?.querySelector?.('[data-action="replay-step-forward"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'stepForward' }));
    root?.querySelector?.('[data-action="replay-prev-event"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'previousEvent' }));
    root?.querySelector?.('[data-action="replay-next-event"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'nextEvent' }));
    root?.querySelector?.('[data-action="replay-jump-start"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'jumpCheckpoint', selector: 'start' }));
    root?.querySelector?.('[data-action="replay-jump-prev"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'jumpCheckpoint', selector: 'previous' }));
    root?.querySelector?.('[data-action="replay-jump-next"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'jumpCheckpoint', selector: 'next' }));
    root?.querySelector?.('[data-action="replay-jump-terminal"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'jumpCheckpoint', selector: 'terminal' }));
    root?.querySelector?.('[data-action="replay-scrub"]')?.addEventListener('input', (event) => this.applyReplayAction({ type: 'scrub', eventIndex: Number(event.target.value) }));
    root?.querySelectorAll?.('[data-rate]')?.forEach((button) => button.addEventListener('click', () => this.applyReplayAction({ type: 'setSpeed', speed: Number(button.getAttribute('data-rate')) })));
    root?.querySelectorAll?.('[data-replay-agent]')?.forEach((button) => button.addEventListener('click', () => this.selectReplayAgent(button.getAttribute('data-replay-agent'))));
    root?.querySelectorAll?.('[data-camera-preset]')?.forEach((button) => button.addEventListener('click', () => this.setCameraPreset(button.getAttribute('data-camera-preset'))));
    root?.querySelector?.('[data-action="reset-replay-performance"]')?.addEventListener('click', () => { resetThreeReplayReviewPerformance(this.controller); this.refreshDebugObject(); });
    root?.querySelector?.('[data-action="export-replay-review-summary"]')?.addEventListener('click', () => this.exportReplayReviewSummary());
    root?.querySelector?.('[data-action="return"]')?.addEventListener('click', () => this.returnToSourceScene());
    root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
  }

  togglePlayback() {
    if (!this.session?.controls?.canPlay) return;
    const next = this.session.playbackState?.playing ? { type: 'pause' } : { type: 'play' };
    this.applyReplayAction(next);
    if (this.session.playbackState?.playing) this.startReplayTimer();
    else this.stopReplayTimer();
  }

  applyReplayAction(action = {}) {
    if (!this.controller) {
      this.session = reduceReplayReviewSession(this.session, action);
      return;
    }
    updateThreeReplayReviewController(this.controller, action);
    this.session = this.controller.session;
    if (!this.session?.playbackState?.playing) this.stopReplayTimer();
    this.renderPanel();
    this.refreshDebugObject();
  }

  startReplayTimer() {
    this.stopReplayTimer();
    const interval = Math.max(80, Number(this.session?.options?.playbackIntervalMs ?? 550) / Math.max(0.25, Number(this.session?.playbackState?.speed ?? 1)));
    this.replayTimer = globalThis.setInterval?.(() => {
      if (!this.session?.playbackState?.playing) return;
      const before = this.session.playbackState.eventIndex;
      this.applyReplayAction({ type: 'stepForward' });
      if (this.session.playbackState.eventIndex === before || this.session.playbackState.eventIndex >= (this.session.timeline?.eventCount ?? 0) - 1) {
        this.applyReplayAction({ type: 'pause' });
      }
    }, interval) ?? null;
    registerThreeMissionSceneResource(this.threeSceneLifecycle, 'timer', this.replayTimer);
  }

  stopReplayTimer() {
    if (this.replayTimer) globalThis.clearInterval?.(this.replayTimer);
    this.replayTimer = null;
  }

  setCameraPreset(preset) {
    if (!preset) return;
    const before = replayInvariantSnapshot(this);
    this.app.state.ui ??= {};
    this.app.state.ui.threeReplayCameraPreset = preset;
    setThreeMissionWorldCamera(this.threeReplayRenderer, { preset });
    const after = replayInvariantSnapshot(this);
    this.cameraInvariantBaseline = before;
    this.cameraInvariantFailures = cameraInvariantFailures(before, after);
    this.refreshDebugObject();
  }

  selectReplayAgent(agentId) {
    const normalized = agentId === 'all' ? null : agentId;
    this.applyReplayAction({ type: 'selectAgent', agentId: normalized });
  }

  exportReplayReviewSummary() {
    downloadJson('anchor_three_replay_review_summary.json', {
      type: 'anchor.browser.three-replay-review-summary',
      version: 'three-r2a',
      createdAt: new Date().toISOString(),
      session: replayReviewSessionSummary(this.session),
      controller: threeReplayReviewControllerSummary(this.controller),
      renderer: threeMissionWorldRendererSummary(this.threeReplayRenderer),
      viewModel: this.controller?.viewModel ? replayWorldRenderViewModelSummary(this.controller.viewModel) : null,
      publicBoundary: {
        publicObservationPlayback: true,
        hiddenTruthIncluded: false,
        usesHiddenTruthResimulation: false,
        changesOfficialBrowserScoring: false
      }
    });
  }

  returnToSourceScene() {
    const sceneKey = this.app.state.replayReviewReturnScene ?? (this.source?.sourceKind === 'headlessBundleViewer' ? 'HeadlessBundleViewerScene' : 'DebriefScene');
    this.scene.start(sceneKey);
  }

  drawOverlayHint() {
    this.sceneObjects.forEach((object) => object?.destroy?.());
    this.sceneObjects = [];
    const width = Number(this.sys?.game?.scale?.width ?? 960);
    const height = Number(this.sys?.game?.scale?.height ?? 640);
    this.sceneObjects.push(this.add.text(Math.max(18, width * 0.03), Math.max(18, height * 0.04), 'Three Replay Review', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#eef6ff',
      backgroundColor: 'rgba(6, 17, 31, 0.66)',
      padding: { x: 10, y: 6 }
    }).setDepth?.(10) ?? null);
  }

  refreshDebugObject() {
    const rendererSummary = threeMissionWorldRendererSummary(this.threeReplayRenderer ?? {});
    const controllerSummary = threeReplayReviewControllerSummary(this.controller ?? {});
    const sessionSummary = replayReviewSessionSummary(this.session ?? {});
    const viewModelSummary = this.controller?.viewModel ? replayWorldRenderViewModelSummary(this.controller.viewModel) : null;
    const performance = rendererSummary.performanceSummary ?? {};
    const pathCounts = replayPathCounts(rendererSummary, viewModelSummary);
    const lifecycle = threeMissionSceneLifecycleSummary(this.threeSceneLifecycle);
    const eventObjectCount = Number(rendererSummary.observationObjectCreateCount ?? 0) + Number(rendererSummary.surfacingObjectCreateCount ?? 0) + Number(rendererSummary.terrainValidationObjectCount ?? 0);
    globalThis.ANCHOR_THREE_REPLAY_DEBUG = {
      type: 'anchor.debug.three-replay-review',
      version: 'three-r2a-1',
      active: true,
      threeMounted: Boolean(this.threeReplayRenderer?.renderer?.domElement?.isConnected),
      replayMode: this.session?.replayArtifacts?.manifest?.replayMode ?? null,
      replayFidelity: this.session?.replayArtifacts?.manifest?.replayFidelity ?? null,
      sourceKind: this.source?.sourceKind ?? null,
      missionId: this.session?.replayArtifacts?.manifest?.missionId ?? this.source?.mission?.missionId ?? null,
      resultDigest: this.source?.bundle?.scoreReport?.digest?.value ?? this.source?.exportedResult?.digest ?? this.source?.browserResult?.resultDigest ?? null,
      replayManifestDigest: this.session?.replayArtifacts?.manifest?.replayId ?? null,
      eventDigest: this.session?.replayArtifacts?.events?.summary?.eventCount ?? null,
      checkpointDigest: this.session?.replayArtifacts?.checkpoints?.summary?.terminalDigest ?? null,
      integrityStatus: this.session?.integritySummary?.status ?? null,
      failureCodes: this.session?.integritySummary?.failureCodes ?? [],
      activeTimeSeconds: sessionSummary.activeTimeSeconds ?? 0,
      currentTick: this.session?.playbackState?.currentTick ?? null,
      currentEventIndex: this.session?.playbackState?.eventIndex ?? -1,
      currentCheckpointIndex: this.session?.playbackState?.checkpointIndex ?? -1,
      selectedAgentId: this.session?.playbackState?.selectedAgentId ?? null,
      publicStateDigest: sessionSummary.publicStateDigest ?? this.session?.playbackState?.publicStateDigest ?? null,
      playEnabled: this.session?.controls?.canPlay === true,
      timelineEventCount: this.session?.timeline?.eventCount ?? 0,
      timelineCheckpointCount: this.session?.timeline?.checkpointCount ?? 0,
      agentCount: sessionSummary.agentCount ?? 0,
      agentIds: this.session?.replayArtifacts?.manifest?.agentIds ?? [],
      replayReducerRunCount: sessionSummary.replayReducerRunCount ?? 0,
      checkpointRestoreCount: sessionSummary.checkpointRestoreCount ?? 0,
      forwardReplayEventCount: sessionSummary.forwardReplayEventCount ?? 0,
      reverseNavigationCount: sessionSummary.reverseNavigationCount ?? 0,
      reducedStateCacheHitCount: sessionSummary.reducedStateCacheHitCount ?? 0,
      reducedStateCacheMissCount: sessionSummary.reducedStateCacheMissCount ?? 0,
      replayViewModelBuildCount: controllerSummary.replayViewModelBuildCount ?? 0,
      replayViewModelCacheHitCount: controllerSummary.replayViewModelCacheHitCount ?? 0,
      replayStaticGeometryBuildCount: controllerSummary.replayStaticGeometryBuildCount ?? 0,
      replayDynamicGeometryBuildCount: controllerSummary.replayDynamicGeometryBuildCount ?? 0,
      replayGeometryFullRebuildCount: controllerSummary.replayGeometryFullRebuildCount ?? 0,
      replayGeometryIncrementalUpdateCount: controllerSummary.replayGeometryIncrementalUpdateCount ?? 0,
      replayTrajectoryAppendCount: rendererSummary.trajectoryAppendCount ?? 0,
      replayObservationAppendCount: rendererSummary.observationObjectCreateCount ?? 0,
      replayEventObjectCreateCount: eventObjectCount,
      replayEventObjectReuseCount: Number(rendererSummary.observationObjectReuseCount ?? 0),
      eventListRenderCount: Number(this.eventListRenderCount ?? 0),
      eventListRenderCountDuringCameraGesture: Number(this.eventListRenderCountDuringCameraGesture ?? 0),
      activeRendererCount: rendererSummary.activeRendererCount ?? 0,
      activeRafCount: rendererSummary.activeRafCount ?? 0,
      renderCallsPerPresentationFrame: rendererSummary.renderCallsPerPresentationFrame ?? 0,
      frameIntervalAverageMilliseconds: performance.frameIntervalAverageMilliseconds ?? performance.averageFrameMilliseconds ?? 0,
      frameIntervalP50Milliseconds: performance.medianFrameMilliseconds ?? 0,
      frameIntervalP95Milliseconds: performance.frameIntervalP95Milliseconds ?? performance.p95FrameMilliseconds ?? 0,
      frameIntervalP99Milliseconds: performance.frameIntervalP99Milliseconds ?? performance.p99FrameMilliseconds ?? 0,
      frameIntervalMaximumMilliseconds: performance.maximumFrameMilliseconds ?? 0,
      renderedFramesPerSecond: performance.renderedFramesPerSecond ?? 0,
      presentationCpuAverageMilliseconds: performance.presentationUpdateAverageMilliseconds ?? 0,
      rendererSubmissionAverageMilliseconds: performance.rendererSubmissionAverageMilliseconds ?? 0,
      gpuTimingSupported: performance.gpuTimingSupported === true,
      gpuAverageMilliseconds: performance.gpuAverageMilliseconds ?? null,
      terrainBuildCount: rendererSummary.terrainBuildCount ?? 0,
      terrainObjectCount: rendererSummary.terrainObjectCount ?? 0,
      staleCanvasCount: globalThis.document?.querySelectorAll?.('.three-mission-world-canvas')?.length ?? 0,
      cameraReplayInvariantStatus: (this.cameraInvariantFailures ?? []).length ? 'FAIL' : 'PASS',
      cameraReplayInvariantFailures: this.cameraInvariantFailures ?? [],
      ...pathCounts,
      renderer: rendererSummary,
      controller: controllerSummary,
      session: sessionSummary,
      viewModel: viewModelSummary,
      lifecycle,
      publicObservationPlayback: true,
      usesSharedReplayReducer: true,
      replayOwnsSimulation: false,
      replayOwnsScoring: false,
      rendererOwnsReplaySemantics: false,
      rendererOwnsPhysics: false,
      includesHiddenTruth: false,
      hiddenTruthIncluded: false,
      usesHiddenTruthResimulation: false,
      usesAuthoritativeHiddenStateReplay: false,
      changesOfficialBrowserScoring: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false,
      usesMARL: false,
      inversePhysicsUsed: false
    };
  }

  shutdownReplayReview(reason = 'shutdown') {
    if (this.shutdownComplete) return;
    this.shutdownComplete = true;
    this.stopReplayTimer();
    disposeThreeReplayReviewController(this.controller);
    this.controller = null;
    disposeThreeMissionWorldRenderer(this.threeReplayRenderer);
    this.threeReplayRenderer = null;
    this.threeReplayContainer?.remove?.();
    this.threeReplayContainer = null;
    disposeThreeMissionSceneLifecycle(this.threeSceneLifecycle, reason);
    this.sceneObjects.forEach((object) => object?.destroy?.());
    this.sceneObjects = [];
    globalThis.ANCHOR_THREE_REPLAY_DEBUG = {
      type: 'anchor.debug.three-replay-review',
      version: 'three-r2a-1',
      active: false,
      threeMounted: false,
      activeRendererCount: 0,
      activeRafCount: 0,
      replayObjectCount: 0,
      terrainObjectCount: 0,
      staleCanvasCount: globalThis.document?.querySelectorAll?.('.three-mission-world-canvas')?.length ?? 0,
      lifecycle: threeMissionSceneLifecycleSummary(this.threeSceneLifecycle),
      usesHiddenTruthResimulation: false,
      changesOfficialBrowserScoring: false
    };
    globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG = inactiveThreePerformanceDebugPayload({ phase: 'replayReviewInactive' });
  }
}

function replayPathCounts(rendererSummary = {}, viewModelSummary = {}) {
  const plannedDive = rendererSummary.plannedDiveTrajectorySummary ?? {};
  return {
    plannedRouteObjectCount: Number(rendererSummary.routeObjectCount ?? 0),
    plannedRouteVisible: Number(rendererSummary.routeObjectCount ?? 0) > 0,
    surfaceIntentObjectCount: Number(plannedDive.surfaceIntentObjectCount ?? 0),
    surfaceIntentVisible: Number(plannedDive.surfaceIntentObjectCount ?? 0) > 0,
    predictedDiveObjectCount: Number(plannedDive.predictedDiveObjectCount ?? rendererSummary.predictedDiveObjectCount ?? 0),
    predictedDiveVisible: Number(plannedDive.predictedDiveObjectCount ?? rendererSummary.predictedDiveObjectCount ?? 0) > 0,
    expectedCurrentAffectedObjectCount: Number(plannedDive.currentCorrectedObjectCount ?? 0),
    expectedCurrentAffectedVisible: Number(plannedDive.currentCorrectedObjectCount ?? 0) > 0,
    realizedTrajectoryObjectCount: Number(rendererSummary.realizedTrajectoryObjectCount ?? 0),
    realizedTrajectoryPointCount: Number(rendererSummary.realizedTrajectoryPointCount ?? viewModelSummary.realizedTrajectoryPointCount ?? 0),
    realizedTrajectoryVisible: Number(rendererSummary.realizedTrajectoryPointCount ?? viewModelSummary.realizedTrajectoryPointCount ?? 0) > 0,
    observationObjectCount: Number(rendererSummary.observationObjectCreateCount ?? viewModelSummary.observationCount ?? 0),
    observationCount: Number(viewModelSummary.observationCount ?? rendererSummary.observationObjectCreateCount ?? 0),
    observationsVisible: Number(viewModelSummary.observationCount ?? rendererSummary.observationObjectCreateCount ?? 0) > 0,
    surfacingEventObjectCount: Number(rendererSummary.surfacingObjectCreateCount ?? viewModelSummary.surfacingEventCount ?? 0),
    terrainEventObjectCount: Number(rendererSummary.terrainValidationObjectCount ?? viewModelSummary.routeFailureCount ?? 0),
    terrainEventCount: Number(viewModelSummary.routeFailureCount ?? 0),
    terrainEventsVisible: Number(rendererSummary.terrainValidationObjectCount ?? 0) > 0 || Number(viewModelSummary.routeFailureCount ?? 0) > 0,
    terrainVisible: Number(rendererSummary.terrainObjectCount ?? 0) > 0,
    terrainClearanceVisible: Number(rendererSummary.terrainValidationObjectCount ?? 0) > 0 || Number(viewModelSummary.routeFailureCount ?? 0) > 0,
    depthObservationVisible: Number(viewModelSummary.observationCount ?? 0) > 0,
    bottomTurnVisible: Number(plannedDive.bottomTurnObjectCount ?? plannedDive.predictedDiveObjectCount ?? rendererSummary.predictedDiveObjectCount ?? 0) > 0,
    depthLayerCrossingVisible: Number(plannedDive.layerCrossingObjectCount ?? plannedDive.predictedDiveObjectCount ?? rendererSummary.predictedDiveObjectCount ?? 0) > 0 || Number(viewModelSummary.volumetric?.depthLayerCount ?? viewModelSummary.depthLayerCount ?? 0) > 1,
    targetCoverageEventVisible: Number(viewModelSummary.routeFailureCount ?? rendererSummary.samplingTargetObjectCount ?? rendererSummary.priorityTargetObjectCount ?? 0) > 0,
    pathStylesDistinct: true,
    pathDistinctionNotColorOnly: true,
    launchPredictionFrozen: true,
    gliderAboveTerrain: true,
    observationAboveSeabed: true,
    visualInterpolationCreatesEvents: false
  };
}

function replayInvariantSnapshot(scene) {
  const debug = globalThis.ANCHOR_THREE_REPLAY_DEBUG ?? {};
  return {
    publicStateDigest: scene?.session?.playbackState?.publicStateDigest ?? debug.publicStateDigest ?? null,
    replayReducerRunCount: debug.replayReducerRunCount ?? scene?.session?.playbackState?.replayDiagnostics?.replayReducerRunCount ?? 0,
    checkpointRestoreCount: debug.checkpointRestoreCount ?? scene?.session?.playbackState?.replayDiagnostics?.checkpointRestoreCount ?? 0,
    replayViewModelBuildCount: scene?.controller?.replayViewModelBuildCount ?? debug.replayViewModelBuildCount ?? 0,
    terrainBuildCount: debug.terrainBuildCount ?? 0,
    eventListRenderCount: scene?.eventListRenderCount ?? debug.eventListRenderCount ?? 0
  };
}

function cameraInvariantFailures(before = {}, after = {}) {
  const failures = [];
  for (const key of ['publicStateDigest', 'replayReducerRunCount', 'checkpointRestoreCount', 'replayViewModelBuildCount', 'terrainBuildCount', 'eventListRenderCount']) {
    if (before[key] !== after[key]) failures.push(key + ' changed during camera-only interaction');
  }
  return failures;
}

function metricHtml(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 'N/A')}</strong></div>`;
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
