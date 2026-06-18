import { createEmptyPlan, normalizePlan } from '../../core/planning/WaypointPlan.js';
import { createMissionLifecycleState } from './MissionLifecycleContract.js';

export const MISSION_SESSION_STORE_VERSION = 'mission-session-store-mig-r2';

export function createMissionSessionStore(initialState = {}) {
  return new MissionSessionStore(initialState);
}

export class MissionSessionStore {
  constructor(initialState = {}) {
    this.state = normalizeMissionSessionState(initialState);
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    listener(this.state, { type: 'subscribe' });
    return () => this.listeners.delete(listener);
  }

  patch(patch = {}, meta = {}) {
    this.state = normalizeMissionSessionState({ ...this.state, ...(patch ?? {}) });
    this.notify({ type: meta.type ?? 'patch', meta });
    return this.state;
  }

  replace(nextState = {}, meta = {}) {
    this.state = normalizeMissionSessionState(nextState);
    this.notify({ type: meta.type ?? 'replace', meta });
    return this.state;
  }

  reset(meta = {}) {
    this.state = normalizeMissionSessionState();
    this.notify({ type: meta.type ?? 'reset', meta });
    return this.state;
  }

  ensurePlan() {
    if (!this.state.plan && this.state.level && this.state.mission) {
      this.patch({ plan: createEmptyPlan(this.state.level, this.state.mission) }, { type: 'ensurePlan' });
    } else if (this.state.plan && this.state.level && this.state.mission) {
      this.patch({ plan: normalizePlan(this.state.plan, this.state.level, this.state.mission) }, { type: 'normalizePlan' });
    }
    return this.state.plan;
  }

  notify(event = {}) {
    for (const listener of [...this.listeners]) listener(this.state, event);
  }

  getDebugState() {
    return missionSessionStoreSummary(this.state, this.listeners.size);
  }
}

export function normalizeMissionSessionState(value = {}) {
  const level = cloneData(value.level ?? null);
  const mission = cloneData(value.mission ?? null);
  const plan = value.plan && level && mission ? normalizePlan(cloneData(value.plan), level, mission) : cloneData(value.plan ?? null);
  return {
    type: 'anchor.mission.session',
    version: MISSION_SESSION_STORE_VERSION,
    lifecycle: createMissionLifecycleState(value.lifecycle ?? {}),
    source: value.source ?? null,
    level,
    mission,
    plan,
    result: cloneData(value.result ?? null),
    selectedAgentId: value.selectedAgentId ?? firstAgentId(mission),
    selectedWindow: Number.isFinite(Number(value.selectedWindow)) ? Number(value.selectedWindow) : 0,
    planningTime: Number.isFinite(Number(value.planningTime)) ? Number(value.planningTime) : 0,
    challengeMode: value.challengeMode ?? level?.challengeMode ?? 'perfectKnowledge',
    experienceMode: value.experienceMode ?? level?.meta?.experienceMode ?? mission?.meta?.experienceMode ?? null,
    missionMode: value.missionMode ?? level?.meta?.missionMode ?? mission?.meta?.missionMode ?? null,
    currentScenario: cloneData(value.currentScenario ?? null),
    simulation: normalizeSimulationSession(value.simulation),
    warnings: [...(value.warnings ?? [])],
    updatedAt: new Date().toISOString()
  };
}

export function missionSessionStoreSummary(state = {}, listenerCount = 0) {
  return {
    type: 'anchor.mission.session-summary',
    version: MISSION_SESSION_STORE_VERSION,
    lifecycleState: state.lifecycle?.state ?? null,
    levelId: state.level?.levelId ?? null,
    missionId: state.mission?.missionId ?? state.mission?.id ?? null,
    selectedAgentId: state.selectedAgentId ?? null,
    waypointCount: (state.plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    hasResult: Boolean(state.result),
    simulationStatus: state.simulation?.status ?? null,
    listenerCount,
    containsPhaserObjects: containsRuntimeObject(state, ['scene', 'phaser', 'canvas', 'game'])
  };
}

function normalizeSimulationSession(simulation = {}) {
  return {
    status: simulation?.status ?? 'idle',
    running: simulation?.running === true,
    paused: simulation?.paused === true,
    timeSeconds: finiteNumber(simulation?.timeSeconds),
    stepCount: finiteNumber(simulation?.stepCount),
    speedScale: finiteNumber(simulation?.speedScale, 1),
    complete: simulation?.complete === true,
    aborted: simulation?.aborted === true,
    stopReason: simulation?.stopReason ?? null
  };
}

function firstAgentId(mission) {
  return mission?.agents?.[0]?.id ?? null;
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function cloneData(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function containsRuntimeObject(value, bannedKeys = []) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((entry) => containsRuntimeObject(entry, bannedKeys));
  for (const [key, child] of Object.entries(value)) {
    if (bannedKeys.includes(key)) return true;
    if (child && typeof child === 'object' && containsRuntimeObject(child, bannedKeys)) return true;
  }
  return false;
}
