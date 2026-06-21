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
    const summary = replayReviewSessionSummary(this.session);
    const timeline = this.session?.timeline ?? {};
    const integrityStatus = summary.integrityStatus ?? 'N/A';
    const failed = integrityStatus === 'FAIL';
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
        ${failed ? '<div class="hud-muted"><strong>Integrity failed. Play is disabled; step and scrub remain available for inspection.</strong></div>' : ''}
        <div class="panel-stack">
          <button class="console-button primary" data-action="replay-toggle" ${summary.canPlay ? '' : 'disabled'}>${this.session?.playbackState?.playing ? 'Pause' : 'Play'}</button>
          <button class="console-button secondary" data-action="replay-step-back" ${summary.eventCount ? '' : 'disabled'}>Step Back</button>
          <button class="console-button secondary" data-action="replay-step-forward" ${summary.eventCount ? '' : 'disabled'}>Step</button>
          <button class="console-button secondary" data-action="replay-jump-start" ${summary.checkpointCount ? '' : 'disabled'}>Start</button>
          <button class="console-button secondary" data-action="replay-jump-prev" ${summary.checkpointCount ? '' : 'disabled'}>Prev Checkpoint</button>
          <button class="console-button secondary" data-action="replay-jump-next" ${summary.checkpointCount ? '' : 'disabled'}>Next Checkpoint</button>
          <button class="console-button secondary" data-action="replay-jump-terminal" ${summary.checkpointCount ? '' : 'disabled'}>Terminal</button>
        </div>
        <label class="hud-muted" for="three-replay-scrub">Timeline</label>
        <input id="three-replay-scrub" data-action="replay-scrub" type="range" min="0" max="${Math.max(0, Number(summary.eventCount ?? 0) - 1)}" value="${Math.max(0, Number(summary.currentEventIndex ?? 0))}" ${summary.eventCount ? '' : 'disabled'} />
      </section>
      <section class="console-section">
        <h2>Camera</h2>
        <div class="panel-stack">
          <button class="console-button secondary" data-camera-preset="obliqueMission">Oblique</button>
          <button class="console-button secondary" data-camera-preset="tacticalTopDown">Top Down</button>
          <button class="console-button secondary" data-camera-preset="obliqueWaterColumn">Water Column</button>
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
    root?.querySelector?.('[data-action="replay-jump-start"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'jumpCheckpoint', selector: 'start' }));
    root?.querySelector?.('[data-action="replay-jump-prev"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'jumpCheckpoint', selector: 'previous' }));
    root?.querySelector?.('[data-action="replay-jump-next"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'jumpCheckpoint', selector: 'next' }));
    root?.querySelector?.('[data-action="replay-jump-terminal"]')?.addEventListener('click', () => this.applyReplayAction({ type: 'jumpCheckpoint', selector: 'terminal' }));
    root?.querySelector?.('[data-action="replay-scrub"]')?.addEventListener('input', (event) => this.applyReplayAction({ type: 'scrub', eventIndex: Number(event.target.value) }));
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
    this.app.state.ui ??= {};
    this.app.state.ui.threeReplayCameraPreset = preset;
    setThreeMissionWorldCamera(this.threeReplayRenderer, { preset });
    this.refreshDebugObject();
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
    globalThis.ANCHOR_THREE_REPLAY_DEBUG = {
      type: 'anchor.debug.three-replay-review',
      version: 'three-r2a',
      active: true,
      threeMounted: Boolean(this.threeReplayRenderer?.renderer?.domElement?.isConnected),
      replayMode: this.session?.replayArtifacts?.manifest?.replayMode ?? null,
      replayFidelity: this.session?.replayArtifacts?.manifest?.replayFidelity ?? null,
      sourceKind: this.source?.sourceKind ?? null,
      integrityStatus: this.session?.integritySummary?.status ?? null,
      failureCodes: this.session?.integritySummary?.failureCodes ?? [],
      currentTick: this.session?.playbackState?.currentTick ?? null,
      currentEventIndex: this.session?.playbackState?.eventIndex ?? -1,
      currentCheckpointIndex: this.session?.playbackState?.checkpointIndex ?? -1,
      selectedAgentId: this.session?.playbackState?.selectedAgentId ?? null,
      playEnabled: this.session?.controls?.canPlay === true,
      timelineEventCount: this.session?.timeline?.eventCount ?? 0,
      timelineCheckpointCount: this.session?.timeline?.checkpointCount ?? 0,
      renderer: rendererSummary,
      controller: controllerSummary,
      session: replayReviewSessionSummary(this.session ?? {}),
      viewModel: this.controller?.viewModel ? replayWorldRenderViewModelSummary(this.controller.viewModel) : null,
      lifecycle: threeMissionSceneLifecycleSummary(this.threeSceneLifecycle),
      publicObservationPlayback: true,
      hiddenTruthIncluded: false,
      usesHiddenTruthResimulation: false,
      usesAuthoritativeHiddenStateReplay: false,
      changesOfficialBrowserScoring: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false,
      usesMARL: false
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
      version: 'three-r2a',
      active: false,
      threeMounted: false,
      lifecycle: threeMissionSceneLifecycleSummary(this.threeSceneLifecycle),
      usesHiddenTruthResimulation: false,
      changesOfficialBrowserScoring: false
    };
    globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG = inactiveThreePerformanceDebugPayload({ phase: 'replayReviewInactive' });
  }
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
