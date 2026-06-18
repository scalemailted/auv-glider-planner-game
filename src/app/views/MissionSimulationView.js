import {
  createThreeMissionWorldRenderer,
  disposeThreeMissionWorldRenderer,
  resizeThreeMissionWorldRenderer,
  updateThreeMissionWorldRenderer
} from '../../game/three/ThreeMissionWorldRenderer.js';
import { createBrowserMissionSimulationController } from '../simulation/BrowserMissionSimulationController.js';
import { createAnchorViewContract, button, createDomElement, formatNumber, metricList, panel } from './AnchorViewContract.js';

export const MISSION_SIMULATION_VIEW_VERSION = 'mission-simulation-view-mig-r2';

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
    this.element = null;
  }

  mount({ documentRef, shell }) {
    shell.clearSidePanels?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-simulation');
    this.rendererHost = createDomElement(documentRef, 'div', 'anchor-three-simulation-host');
    this.controls = createDomElement(documentRef, 'aside', 'anchor-dom-simulation-controls');
    root.append(this.rendererHost, this.controls);
    this.element = root;
    this.renderer = this.rendererFactory(this.rendererHost, { layerVisibility: { interaction: false } });
    this.controller = this.simulationControllerFactory({
      sessionStore: this.sessionStore,
      lifecycleController: this.lifecycleController,
      onFrame: (viewModel) => this.renderFrame(viewModel)
    });
    this.controller.createEngine();
    this.renderControls(documentRef, shell);
    this.renderFrame(this.controller.buildViewModel());
    this.unsubscribe = this.sessionStore?.subscribe?.(() => this.renderControls(documentRef, shell));
    globalThis.addEventListener?.('resize', () => this.resize());
    return root;
  }

  renderControls(documentRef, shell) {
    if (!this.controls) return;
    const state = this.sessionStore?.getState?.() ?? {};
    this.controls.innerHTML = '';
    const controls = panel(documentRef, 'Simulation Control', 'The browser controller advances the shared SimulationEngine and sends public render view models to Three.js.');
    controls.appendChild(metricList(documentRef, [
      { label: 'Status', value: state.simulation?.status ?? 'idle' },
      { label: 'Time', value: `${formatNumber(state.simulation?.timeSeconds, 1)} s` },
      { label: 'Steps', value: state.simulation?.stepCount ?? 0 },
      { label: 'Score', value: state.result?.summary?.finalScore ?? state.result?.summary?.score ?? 'pending' }
    ]));
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    actions.append(
      button(documentRef, 'Play', () => this.controller?.play?.(), 'anchor-dom-button anchor-dom-button-primary'),
      button(documentRef, 'Pause', () => this.controller?.pause?.()),
      button(documentRef, 'Step', () => this.controller?.stepOnce?.()),
      button(documentRef, 'Run to End', () => this.controller?.runToEnd?.()),
      button(documentRef, 'Back to Planning', () => this.lifecycleController?.beginPlanning?.())
    );
    controls.appendChild(actions);
    this.controls.appendChild(controls);
    shell.setConsole?.('<h2>Mission Simulation</h2><p>Simulation uses deterministic browser-side runtime state. Rendering is a view only.</p>');
  }

  renderFrame(viewModel) {
    if (!this.renderer || !viewModel) return;
    this.rendererApi.update(this.renderer, viewModel);
    this.resize();
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
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
    this.controller?.dispose?.();
    this.rendererApi.dispose(this.renderer);
    this.renderer = null;
    this.element?.remove?.();
    this.element = null;
  }
}


