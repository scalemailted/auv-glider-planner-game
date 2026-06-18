import { SimulationEngine } from '../../core/sim/SimulationEngine.js';
import { buildSimulationWorldRenderViewModel, simulationWorldRenderViewModelSummary } from '../../core/rendering/SimulationWorldRenderViewModel.js';

export const BROWSER_MISSION_SIMULATION_CONTROLLER_VERSION = 'browser-mission-simulation-controller-mig-r2';

export function createBrowserMissionSimulationController(options = {}) {
  return new BrowserMissionSimulationController(options);
}

export class BrowserMissionSimulationController {
  constructor({ sessionStore, lifecycleController = null, scheduler = null, engineFactory = null, onFrame = null } = {}) {
    if (!sessionStore) throw new Error('BrowserMissionSimulationController requires a sessionStore.');
    this.sessionStore = sessionStore;
    this.lifecycleController = lifecycleController;
    this.scheduler = scheduler ?? createIntervalScheduler();
    this.engineFactory = engineFactory ?? ((config) => new SimulationEngine(config));
    this.onFrame = onFrame;
    this.engine = null;
    this.intervalHandle = null;
    this.speedScale = 1;
    this.lastViewModel = null;
  }

  createEngine() {
    const state = this.sessionStore.getState();
    if (!state.level || !state.mission || !state.plan) throw new Error('Simulation requires loaded level, mission, and plan.');
    this.engine = this.engineFactory({ level: state.level, mission: state.mission, plan: state.plan, resumeState: null });
    this.syncStore('ready');
    return this.engine;
  }

  getEngine() {
    return this.engine ?? this.createEngine();
  }

  play() {
    const engine = this.getEngine();
    engine.play?.();
    this.syncStore('running');
    if (!this.intervalHandle) {
      this.intervalHandle = this.scheduler.start(() => this.stepFrame(), getSafeStepDt(this.sessionStore.getState().level));
    }
    return engine;
  }

  pause() {
    this.engine?.pause?.();
    this.stopScheduler();
    this.syncStore('paused');
  }

  stepOnce() {
    const engine = this.getEngine();
    engine.stepOnce?.();
    this.afterStep('stepped');
    return engine;
  }

  runToEnd(maxSteps = 2000) {
    const engine = this.getEngine();
    engine.runUntilComplete?.(maxSteps);
    this.afterStep(engine.aborted ? 'aborted' : 'complete');
    this.finishIfComplete();
    return engine.getResult?.();
  }

  stepFrame() {
    const engine = this.getEngine();
    if (engine.complete || engine.aborted || engine.awaitingSurfaceDecision || engine.routeFailureDecision?.active) {
      this.finishIfComplete();
      return;
    }
    const dt = getSafeStepDt(this.sessionStore.getState().level) * this.speedScale;
    engine.step(dt);
    this.afterStep('running');
    this.finishIfComplete();
  }

  afterStep(status = 'running') {
    this.syncStore(status);
    this.lastViewModel = this.buildViewModel();
    this.onFrame?.(this.lastViewModel, this.engine, this.sessionStore.getState());
  }

  finishIfComplete() {
    if (!this.engine) return false;
    if (!this.engine.complete && !this.engine.aborted) return false;
    this.stopScheduler();
    const result = this.engine.getResult?.();
    this.lifecycleController?.completeSimulation?.(result, { type: 'simulationComplete' });
    this.syncStore(this.engine.aborted ? 'aborted' : 'complete');
    return true;
  }

  buildViewModel() {
    const state = this.sessionStore.getState();
    const engine = this.engine;
    const frames = engine?.logger?.frames ?? [];
    const observations = (engine?.events ?? []).filter((event) => event.type === 'sample' || event.type === 'observation' || event.type === 'roiSample');
    const surfacingEvents = (engine?.events ?? []).filter((event) => event.type === 'surfaced' || event.type === 'surfaceDecisionRequired');
    const routeFailures = (engine?.events ?? []).filter((event) => event.type === 'blocked' || event.type === 'missedWaypoint' || event.type === 'routeFailureDecision');
    const trajectories = (engine?.agents ?? []).map((agent) => ({ agentId: agent.id, history: agent.history ?? [], status: agent.status }));
    return buildSimulationWorldRenderViewModel({
      level: state.level,
      mission: state.mission,
      plan: state.plan,
      selectedAgentId: state.selectedAgentId,
      activeTimeSeconds: engine?.t ?? state.simulation?.timeSeconds ?? 0,
      simulationStatus: this.getSimulationStatus(),
      realizedTrajectories: trajectories,
      sampledTrajectories: trajectories,
      observations,
      surfacingEvents,
      routeFailures,
      missedWaypoints: routeFailures.filter((event) => event.type === 'missedWaypoint'),
      scoreSummary: engine?.getSummary?.() ?? state.result?.summary ?? null,
      options: { gliders: engine?.agents ?? state.mission?.agents ?? [] }
    });
  }

  getSimulationStatus() {
    const engine = this.engine;
    return {
      status: engine?.aborted ? 'aborted' : engine?.complete ? 'complete' : engine?.running ? 'running' : 'paused',
      running: engine?.running === true,
      paused: engine?.running !== true,
      complete: engine?.complete === true,
      aborted: engine?.aborted === true,
      routeFailureDecisionActive: Boolean(engine?.routeFailureDecision?.active),
      surfaceDecisionActive: Boolean(engine?.surfaceDecision?.active ?? engine?.awaitingSurfaceDecision),
      timeSeconds: Number(engine?.t ?? 0),
      stepCount: Number(engine?.stepCount ?? 0)
    };
  }

  syncStore(status = null) {
    const simStatus = this.getSimulationStatus();
    this.sessionStore.patch({
      simulation: {
        status: status ?? simStatus.status,
        running: simStatus.running,
        paused: simStatus.paused,
        timeSeconds: simStatus.timeSeconds,
        stepCount: simStatus.stepCount,
        complete: simStatus.complete,
        aborted: simStatus.aborted,
        speedScale: this.speedScale
      }
    }, { type: 'simulationSync' });
  }

  stopScheduler() {
    if (!this.intervalHandle) return;
    this.scheduler.stop(this.intervalHandle);
    this.intervalHandle = null;
  }

  dispose() {
    this.pause();
    this.engine = null;
  }

  getDebugState() {
    return {
      type: 'anchor.browser-mission-simulation.debug',
      version: BROWSER_MISSION_SIMULATION_CONTROLLER_VERSION,
      status: this.getSimulationStatus(),
      viewModel: this.lastViewModel ? simulationWorldRenderViewModelSummary(this.lastViewModel) : null,
      usesPhaserUpdate: false,
      ownsPhysics: false,
      ownsScoring: false
    };
  }
}

function createIntervalScheduler() {
  return {
    start(callback, dtSeconds) {
      const ms = Math.max(16, Math.round(Number(dtSeconds ?? 0.25) * 1000));
      return globalThis.setInterval?.(callback, ms);
    },
    stop(handle) {
      if (handle != null) globalThis.clearInterval?.(handle);
    }
  };
}

function getSafeStepDt(level) {
  const dt = Number(level?.world?.time?.dt ?? 0.25);
  return Number.isFinite(dt) && dt > 0 ? dt : 0.25;
}
