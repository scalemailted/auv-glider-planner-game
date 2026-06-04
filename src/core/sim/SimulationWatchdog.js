import { getSelectedStart } from '../deployment/DeploymentZones.js';
import { debugSurfaceDecision } from './SurfaceDecisionVisibility.js';

export const DEBUG_SIMULATION_WATCHDOG = false;

export function createSimulationWatchdog(options = {}) {
  return new SimulationWatchdog(options);
}

class SimulationWatchdog {
  constructor({
    maxNoProgressFrames = 180,
    maxStepsPerFrame = 10,
    maxWallTimeMsPerFrame = 1500,
    maxNoWaypointProgressFrames = 240,
    maxSurfaceHiddenFrames = 45,
    maxRenderObjectGrowth = 120,
    onAbort = null
  } = {}) {
    this.limits = {
      maxNoProgressFrames,
      maxStepsPerFrame,
      maxWallTimeMsPerFrame,
      maxNoWaypointProgressFrames,
      maxSurfaceHiddenFrames,
      maxRenderObjectGrowth
    };
    this.onAbort = onAbort;
    this.reset();
  }

  reset() {
    this.frameCount = 0;
    this.lastSimulationTime = null;
    this.lastWallTime = null;
    this.lastStepCount = null;
    this.noProgressFrameCount = 0;
    this.surfaceHiddenFrames = 0;
    this.agentProgress = new Map();
    this.renderBaseline = null;
    this.lastRenderObjectCount = null;
    this.lastAbortSnapshot = null;
    this.lastStatus = { state: 'ready' };
  }

  observe(context = {}) {
    const engine = context.engine;
    if (!engine || engine.complete) {
      this.lastStatus = { state: engine?.complete ? 'complete' : 'idle' };
      return null;
    }

    const now = Number(context.wallTime ?? globalThis.performance?.now?.() ?? Date.now());
    const stepCount = Number(engine.stepCount ?? 0);
    const simTime = Number(engine.t ?? 0);
    const renderObjectCount = Number(context.renderObjectCount ?? 0);
    this.frameCount += 1;

    const wallDelta = this.lastWallTime === null ? 0 : now - this.lastWallTime;
    const contextSteps = Number(context.stepsThisFrame);
    const stepsThisFrame = Number.isFinite(contextSteps)
      ? Math.max(0, contextSteps)
      : (this.lastStepCount === null ? 0 : Math.max(0, stepCount - this.lastStepCount));
    const simAdvanced = this.lastSimulationTime === null || simTime > this.lastSimulationTime + 1e-9;
    const waitState = getSimulationWaitState(context, engine);

    if (engine.running && !waitState.waiting) {
      this.noProgressFrameCount = simAdvanced ? 0 : this.noProgressFrameCount + 1;
    } else {
      this.noProgressFrameCount = 0;
    }

    const surfaceUiAvailable = Boolean(
      context.surfaceModalVisible ||
      context.surfaceFallbackVisible ||
      context.surfaceDecisionUiAvailable
    );
    if (engine.awaitingSurfaceDecision && !surfaceUiAvailable) {
      this.surfaceHiddenFrames += 1;
    } else {
      this.surfaceHiddenFrames = 0;
    }
    if (engine.awaitingSurfaceDecision) {
      debugSurfaceDecision('watchdog surface decision visibility', {
        reason: surfaceUiAvailable ? 'uiAvailable' : 'uiMissing',
        modalVisible: Boolean(context.surfaceModalVisible),
        fallbackVisible: Boolean(context.surfaceFallbackVisible),
        uiAvailable: surfaceUiAvailable,
        hiddenFrames: this.surfaceHiddenFrames
      });
    }

    if (this.renderBaseline === null && renderObjectCount > 0) this.renderBaseline = renderObjectCount;
    const renderGrowth = this.renderBaseline === null ? 0 : renderObjectCount - this.renderBaseline;
    if (waitState.waiting) {
      this.freezeProgressTracking(waitState.reason, {
        simTime,
        now,
        stepCount,
        renderObjectCount,
        stepsThisFrame,
        wallDelta,
        surfaceHiddenFrames: this.surfaceHiddenFrames,
        pauseReason: waitState.pauseReason
      });
      const reason = this.surfaceHiddenFrames >= this.limits.maxSurfaceHiddenFrames
        ? 'surfaceDecisionModalMissing'
        : null;
      if (!reason) return null;
      const snapshot = this.createAbortSnapshot(reason, {
        ...context,
        wallTime: now,
        stepsThisFrame,
        wallDelta,
        renderGrowth: 0,
        waypointStall: null,
        waitState
      });
      this.lastAbortSnapshot = snapshot;
      this.onAbort?.(snapshot);
      return snapshot;
    }

    const waypointStall = this.trackWaypointProgress(engine);
    const reason = this.findAbortReason({
      wallDelta,
      stepsThisFrame,
      renderGrowth,
      waypointStall,
      engine
    });

    this.lastSimulationTime = simTime;
    this.lastWallTime = now;
    this.lastStepCount = stepCount;
    this.lastRenderObjectCount = renderObjectCount;
    this.lastStatus = {
      state: 'watching',
      frameCount: this.frameCount,
      simTime,
      noProgressFrameCount: this.noProgressFrameCount,
      stepsThisFrame,
      wallDelta,
      surfaceHiddenFrames: this.surfaceHiddenFrames,
      renderObjectCount,
      renderGrowth,
      waypointStall
    };

    if (!reason) return null;
    const snapshot = this.createAbortSnapshot(reason, {
      ...context,
      wallTime: now,
      stepsThisFrame,
      wallDelta,
      renderGrowth,
      waypointStall
    });
    this.lastAbortSnapshot = snapshot;
    this.onAbort?.(snapshot);
      return snapshot;
  }

  freezeProgressTracking(reason, {
    simTime,
    now,
    stepCount,
    renderObjectCount,
    stepsThisFrame,
    wallDelta,
    surfaceHiddenFrames,
    pauseReason
  }) {
    if (this.noProgressFrameCount || this.agentProgress.size) {
      debugWatchdog('no-progress reset/freeze', {
        reason,
        pauseReason,
        simTime,
        wallTime: now,
        trackedAgents: this.agentProgress.size
      });
    } else {
      debugWatchdog('watchdog skipped while waiting', { reason, pauseReason, simTime, wallTime: now });
    }
    this.noProgressFrameCount = 0;
    this.agentProgress.clear();
    this.lastSimulationTime = simTime;
    this.lastWallTime = now;
    this.lastStepCount = stepCount;
    this.lastRenderObjectCount = renderObjectCount;
    this.lastStatus = {
      state: 'waiting',
      reason,
      pauseReason,
      frameCount: this.frameCount,
      simTime,
      wallTime: now,
      stepsThisFrame,
      wallDelta,
      surfaceHiddenFrames
    };
  }

  findAbortReason({ wallDelta, stepsThisFrame, renderGrowth, waypointStall, engine }) {
    if (stepsThisFrame > this.limits.maxStepsPerFrame) return 'maxStepsPerFrameExceeded';
    if (wallDelta > this.limits.maxWallTimeMsPerFrame && engine.running) return 'wallClockFrameStall';
    if (this.noProgressFrameCount >= this.limits.maxNoProgressFrames) return 'noSimulationTimeProgress';
    if (waypointStall?.nonImprovingFrames >= this.limits.maxNoWaypointProgressFrames) return 'waypointNoProgress';
    if (this.surfaceHiddenFrames >= this.limits.maxSurfaceHiddenFrames) return 'surfaceDecisionModalMissing';
    if (renderGrowth > this.limits.maxRenderObjectGrowth) return 'renderObjectGrowth';
    return null;
  }

  trackWaypointProgress(engine) {
    let worst = null;
    for (const agent of engine.agents ?? []) {
      const waypoint = agent.activeWaypoint ?? null;
      const key = agent.id;
      const waypointIndex = Number(agent.currentWaypointIndex ?? 0);
      const distance = waypoint && isFinitePoint(agent) && isFinitePoint(waypoint)
        ? Math.hypot(Number(agent.x) - Number(waypoint.x), Number(agent.y) - Number(waypoint.y))
        : null;
      const previous = this.agentProgress.get(key);
      const sameWaypoint = previous?.waypointIndex === waypointIndex;
      const improved = distance === null || !sameWaypoint || distance < Number(previous?.bestDistance ?? Infinity) - 0.01;
      const nonImprovingFrames = improved ? 0 : Number(previous?.nonImprovingFrames ?? 0) + 1;
      const state = {
        waypointIndex,
        bestDistance: improved ? distance : previous?.bestDistance ?? distance,
        lastDistance: distance,
        nonImprovingFrames
      };
      this.agentProgress.set(key, state);
      if (!worst || nonImprovingFrames > worst.nonImprovingFrames) {
        worst = { agentId: agent.id, ...state };
      }
    }
    return worst;
  }

  createAbortSnapshot(reason, context = {}) {
    const engine = context.engine;
    return {
      type: 'simulationWatchdogAbort',
      reason,
      scene: context.sceneName ?? 'SimulationScene',
      simTime: Number(engine?.t ?? 0),
      wallTime: new Date().toISOString(),
      wallDelta: round(context.wallDelta),
      stepCount: Number(engine?.stepCount ?? 0),
      stepsThisFrame: Number(context.stepsThisFrame ?? 0),
      currentMode: context.mode ?? null,
      renderObjectCount: Number(context.renderObjectCount ?? 0),
      renderGrowth: Number(context.renderGrowth ?? 0),
      watchdog: this.lastStatus,
      simulationState: {
        ...(context.simulationState ?? context.gameState?.simulation ?? {}),
        waitState: context.waitState ?? getSimulationWaitState(context, engine)
      },
      agents: (engine?.agents ?? []).map((agent) => agentSnapshot(agent)),
      surfaceDecision: {
        waiting: Boolean(engine?.awaitingSurfaceDecision),
        modalVisible: Boolean(context.surfaceModalVisible),
        fallbackVisible: Boolean(context.surfaceFallbackVisible),
        uiAvailable: Boolean(context.surfaceModalVisible || context.surfaceFallbackVisible || context.surfaceDecisionUiAvailable),
        decision: engine?.awaitingSurfaceDecision ?? null
      },
      trace: context.trace ?? engine?.trace?.snapshot?.() ?? [],
      plan: planSnapshot(context.mission, context.plan),
      levelId: context.level?.levelId ?? null,
      instanceId: context.level?.instanceId ?? null
    };
  }
}

function getSimulationWaitState(context = {}, engine = null) {
  const state = context.simulationState ?? context.gameState?.simulation ?? {};
  const surfaceDecisionActive = Boolean(
    context.surfaceDecisionActive ||
    context.gameState?.surfaceDecision?.active ||
    engine?.awaitingSurfaceDecision
  );
  const routeFailureDecisionActive = Boolean(
    context.routeFailureDecisionActive ||
    context.gameState?.routeFailureDecision?.active ||
    engine?.routeFailureDecision?.active
  );
  const waitingForImport = Boolean(state.waitingForImport || context.waitingForImport);
  const waitingForExternalSolver = Boolean(state.waitingForExternalSolver || context.waitingForExternalSolver);
  const waitingForPlayerDecision = Boolean(
    state.waitingForPlayerDecision ||
    context.waitingForPlayerDecision ||
    surfaceDecisionActive ||
    routeFailureDecisionActive
  );
  const paused = Boolean(state.paused || state.isPaused || context.paused);
  const debrief = context.mode === 'debrief';
  const waiting = Boolean(
    waitingForPlayerDecision ||
    waitingForImport ||
    waitingForExternalSolver ||
    debrief ||
    (paused && !engine?.running)
  );
  return {
    waiting,
    reason: surfaceDecisionActive
      ? 'surfaceDecision'
      : routeFailureDecisionActive
      ? 'routeFailureDecision'
      : waitingForImport
      ? 'waitingForImport'
      : waitingForExternalSolver
      ? 'waitingForExternalSolver'
      : debrief
      ? 'debrief'
      : paused
      ? 'paused'
      : null,
    pauseReason: state.pauseReason ?? null,
    waitingForPlayerDecision,
    waitingForImport,
    waitingForExternalSolver,
    surfaceDecisionActive,
    routeFailureDecisionActive
  };
}

function debugWatchdog(message, details = {}) {
  if (!DEBUG_SIMULATION_WATCHDOG && !globalThis.DEBUG_SIMULATION_WATCHDOG) return;
  console.debug('[simulation-watchdog]', message, details);
}

function agentSnapshot(agent) {
  const activeWaypoint = agent.activeWaypoint ?? null;
  const nonImprovingFrames = agent.waypointSafety?.stalledSteps ?? null;
  return {
    agentId: agent.id,
    x: round(agent.x),
    y: round(agent.y),
    battery: round(agent.battery),
    energyUsed: round(agent.energyUsed),
    activeWaypointIndex: agent.currentWaypointIndex,
    activeWaypoint: activeWaypoint ? { x: activeWaypoint.x, y: activeWaypoint.y, t: activeWaypoint.t ?? null } : null,
    distanceToWaypoint: activeWaypoint && isFinitePoint(agent) && isFinitePoint(activeWaypoint)
      ? round(Math.hypot(Number(agent.x) - Number(activeWaypoint.x), Number(agent.y) - Number(activeWaypoint.y)))
      : null,
    nonImprovingFrames,
    status: agent.status,
    commsState: agent.commsState,
    blockedSteps: agent.blockedSteps ?? 0,
    historyLength: agent.history?.length ?? 0
  };
}

function planSnapshot(mission, plan) {
  const waypointCount = (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
  return {
    waypointCount,
    agents: (mission?.agents ?? []).map((agent) => ({
      agentId: agent.id,
      hasSelectedStart: Boolean(getSelectedStart(agent)),
      waypointCount: plan?.agentPlans?.find((agentPlan) => agentPlan.agentId === agent.id)?.waypoints?.length ?? 0
    }))
  };
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function round(value, digits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(digits));
}
