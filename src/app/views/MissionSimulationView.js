import {
  createThreeMissionWorldRenderer,
  disposeThreeMissionWorldRenderer,
  resizeThreeMissionWorldRenderer,
  updateThreeMissionWorldRenderer
} from '../../game/three/ThreeMissionWorldRenderer.js';
import { RightWaypointPanel } from '../../ui/RightWaypointPanel.js';
import { createBrowserMissionSimulationController } from '../simulation/BrowserMissionSimulationController.js';
import { createAnchorViewContract, button, createDomElement, formatNumber, metricList, panel } from './AnchorViewContract.js';

export const MISSION_SIMULATION_VIEW_VERSION = 'mission-simulation-view-mig-r2-2';

export function createMissionSimulationView(context = {}) {
  return new MissionSimulationView(context);
}

export class MissionSimulationView {
  constructor({ sessionStore, lifecycleController, rendererFactory = createThreeMissionWorldRenderer, rendererApi = {}, simulationControllerFactory = createBrowserMissionSimulationController } = {}) {
    this.sessionStore = sessionStore;
    this.lifecycleController = lifecycleController;
    this.rendererFactory = rendererFactory;
    this.rendererApi = {
      update: rendererApi.update ?? updateThreeMissionWorldRenderer,
      resize: rendererApi.resize ?? resizeThreeMissionWorldRenderer,
      dispose: rendererApi.dispose ?? disposeThreeMissionWorldRenderer
    };
    this.simulationControllerFactory = simulationControllerFactory;
    this.contract = createAnchorViewContract('missionSimulation');
    this.renderer = null;
    this.rendererHost = null;
    this.controller = null;
    this.unsubscribe = null;
    this.resizeHandler = () => this.resize();
    this.element = null;
    this.shell = null;
    this.documentRef = null;
    this.rightPanel = null;
  }

  mount({ documentRef, shell }) {
    shell.clearRouteRegions?.();
    this.shell = shell;
    this.documentRef = documentRef;
    const root = createDomElement(documentRef, 'main', 'anchor-dom-simulation');
    root.dataset.testid = 'mission-simulation-view';
    root.dataset.sectionId = 'simulationStatus';
    const status = createDomElement(documentRef, 'div', 'mission-status-strip', 'Mission Simulation');
    status.dataset.sectionId = 'simulationStatus';
    this.rendererHost = createDomElement(documentRef, 'div', 'anchor-three-simulation-host mission-viewport-panel');
    this.rendererHost.dataset.testid = 'three-simulation-canvas';
    root.append(status, this.rendererHost);
    this.element = root;
    this.renderer = this.rendererFactory(this.rendererHost, { layerVisibility: { interaction: false } });
    this.controller = this.simulationControllerFactory({
      sessionStore: this.sessionStore,
      lifecycleController: this.lifecycleController,
      onFrame: (viewModel) => this.renderFrame(viewModel)
    });
    this.controller.createEngine();
    this.renderPanels();
    this.renderFrame(this.controller.buildViewModel());
    this.unsubscribe = this.sessionStore?.subscribe?.(() => this.renderPanels());
    globalThis.addEventListener?.('resize', this.resizeHandler);
    return root;
  }

  renderPanels() {
    if (!this.documentRef || !this.shell) return;
    const state = this.sessionStore?.getState?.() ?? {};
    this.shell.setConsole?.(this.buildConsole(this.documentRef, state));
    this.renderRightPanel(state);
    this.shell.setTimeline?.(this.buildTimeline(this.documentRef, state));
    this.shell.setPerformance?.(this.buildPerformance(this.documentRef, state));
    this.shell.setStatus?.(this.buildStatus(this.documentRef, state));
  }

  buildConsole(documentRef, state) {
    const controls = panel(documentRef, 'Simulation Control', 'Advance, pause, step, or finish the shared SimulationEngine. Planning edit controls are intentionally absent.');
    controls.dataset.sectionId = 'simulationTransport';
    controls.appendChild(metricList(documentRef, [
      { label: 'Status', value: state.simulation?.status ?? 'idle' },
      { label: 'Time', value: `${formatNumber(state.simulation?.timeSeconds, 1)} s` },
      { label: 'Steps', value: state.simulation?.stepCount ?? 0 },
      { label: 'Score', value: state.result?.summary?.finalScore ?? state.result?.summary?.score ?? 'pending' }
    ]));
    controls.append(
      statusLine(documentRef, 'simulation-time', `${formatNumber(state.simulation?.timeSeconds, 1)} s`),
      statusLine(documentRef, 'mission-performance', state.result?.summary?.finalScore ?? state.result?.summary?.score ?? 'pending')
    );
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    actions.append(
      buttonWithTestId(documentRef, 'Resume', () => this.controller?.play?.(), 'simulation-resume', 'anchor-dom-button anchor-dom-button-primary'),
      buttonWithTestId(documentRef, 'Pause', () => this.controller?.pause?.(), 'simulation-pause'),
      buttonWithTestId(documentRef, 'Step', () => this.controller?.stepOnce?.(), 'simulation-step'),
      buttonWithTestId(documentRef, 'Finish Mission', () => this.controller?.runToEnd?.(), 'simulation-finish'),
      button(documentRef, 'Back to Planning', () => this.lifecycleController?.beginPlanning?.(), 'anchor-dom-button')
    );
    controls.appendChild(actions);
    return controls;
  }

  renderRightPanel(state) {
    const root = this.shell?.elements?.waypointTimelineRoot;
    if (!root) return;
    this.rightPanel ??= new RightWaypointPanel({ state }, root);
    this.rightPanel.refresh(state, { result: state.result ?? null });
  }

  buildTimeline(documentRef, state) {
    const timeline = createDomElement(documentRef, 'section', 'mission-timeline-strip');
    timeline.dataset.sectionId = 'simulationTransport';
    timeline.textContent = `Mission time ${formatNumber(state.simulation?.timeSeconds ?? 0, 1)} s | ${state.simulation?.stepCount ?? 0} step(s)`;
    return timeline;
  }

  buildPerformance(documentRef, state) {
    const perf = createDomElement(documentRef, 'section', 'mission-performance-strip');
    perf.dataset.sectionId = 'missionPerformance';
    perf.textContent = `Score ${state.result?.summary?.finalScore ?? state.result?.summary?.score ?? 'pending'} | Status ${state.simulation?.status ?? 'idle'}`;
    return perf;
  }

  buildStatus(documentRef, state) {
    const status = createDomElement(documentRef, 'section', 'mission-status-strip');
    status.dataset.sectionId = 'simulationStatus';
    status.textContent = `${state.level?.meta?.name ?? 'Mission'} | Simulation ${state.simulation?.status ?? 'idle'}`;
    return status;
  }

  renderFrame(viewModel) {
    if (!this.renderer || !viewModel) return;
    this.rendererApi.update(this.renderer, viewModel);
    this.resize();
    globalThis.ANCHOR_SIMULATION_RENDER_DEBUG = {
      type: 'anchor.simulation-render.debug',
      activeBackend: 'threeMission3d',
      threeMounted: true,
      phaserWorldRendererActive: false,
      ownsSimulationState: false,
      advancesSimulationClock: false,
      computesVehicleMotion: false,
      generatesObservations: false,
      ownsScoring: false,
      simulationTimeSeconds: viewModel.simulationStatus?.timeSeconds ?? viewModel.activeTimeSeconds ?? 0,
      realizedTrajectoryPointCount: (viewModel.realizedTrajectories ?? []).reduce((sum, item) => sum + (item.points?.length ?? 0), 0)
    };
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.simulationView = {
      type: 'anchor.view.mission-simulation.debug',
      version: MISSION_SIMULATION_VIEW_VERSION,
      simulation: this.controller?.getDebugState?.() ?? null,
      usesPhaserUpdate: false
    };
  }

  resize() {
    if (!this.renderer || !this.rendererHost) return;
    this.rendererApi.resize(this.renderer, this.rendererHost.clientWidth, this.rendererHost.clientHeight);
  }

  unmount() {
    this.unsubscribe?.();
    globalThis.removeEventListener?.('resize', this.resizeHandler);
    this.controller?.dispose?.();
    this.rendererApi.dispose(this.renderer);
    this.renderer = null;
    this.element?.remove?.();
    this.element = null;
    this.rightPanel = null;
  }
}

function buttonWithTestId(documentRef, label, onClick, testId, className = 'anchor-dom-button') {
  const el = button(documentRef, label, onClick, className);
  el.dataset.testid = testId;
  return el;
}

function statusLine(documentRef, testId, value) {
  const el = createDomElement(documentRef, 'p', 'anchor-dom-copy', String(value ?? ''));
  el.dataset.testid = testId;
  return el;
}
