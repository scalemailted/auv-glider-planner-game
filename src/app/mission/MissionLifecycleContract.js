export const MISSION_LIFECYCLE_CONTRACT_VERSION = 'mission-lifecycle-contract-mig-r2';

export const MISSION_LIFECYCLE_STATES = Object.freeze({
  idle: 'idle',
  setup: 'setup',
  briefing: 'briefing',
  planning: 'planning',
  simulation: 'simulation',
  debrief: 'debrief',
  legacy: 'legacy'
});

export const MISSION_LIFECYCLE_EVENTS = Object.freeze({
  reset: 'reset',
  beginSetup: 'beginSetup',
  loadMission: 'loadMission',
  showBriefing: 'showBriefing',
  beginPlanning: 'beginPlanning',
  updatePlan: 'updatePlan',
  launchSimulation: 'launchSimulation',
  pauseSimulation: 'pauseSimulation',
  resumeSimulation: 'resumeSimulation',
  completeSimulation: 'completeSimulation',
  showDebrief: 'showDebrief',
  openLegacy: 'openLegacy'
});

const TRANSITIONS = Object.freeze({
  [MISSION_LIFECYCLE_STATES.idle]: ['beginSetup', 'loadMission', 'openLegacy'],
  [MISSION_LIFECYCLE_STATES.setup]: ['loadMission', 'showBriefing', 'reset', 'openLegacy'],
  [MISSION_LIFECYCLE_STATES.briefing]: ['beginPlanning', 'reset', 'openLegacy'],
  [MISSION_LIFECYCLE_STATES.planning]: ['updatePlan', 'launchSimulation', 'showBriefing', 'reset', 'openLegacy'],
  [MISSION_LIFECYCLE_STATES.simulation]: ['pauseSimulation', 'resumeSimulation', 'completeSimulation', 'showDebrief', 'beginPlanning', 'reset', 'openLegacy'],
  [MISSION_LIFECYCLE_STATES.debrief]: ['beginPlanning', 'launchSimulation', 'reset', 'openLegacy'],
  [MISSION_LIFECYCLE_STATES.legacy]: ['reset', 'beginSetup', 'loadMission', 'showBriefing', 'beginPlanning', 'showDebrief', 'openLegacy']
});

export function createMissionLifecycleState(patch = {}) {
  return {
    type: 'anchor.mission.lifecycle-state',
    version: MISSION_LIFECYCLE_CONTRACT_VERSION,
    state: patch.state ?? MISSION_LIFECYCLE_STATES.idle,
    mode: patch.mode ?? null,
    lastEvent: patch.lastEvent ?? null,
    warnings: [...(patch.warnings ?? [])],
    updatedAt: patch.updatedAt ?? new Date().toISOString()
  };
}

export function canApplyMissionTransition(currentState, eventName, session = {}) {
  const state = normalizeMissionLifecycleState(currentState);
  const event = String(eventName ?? '').trim();
  const errors = [];
  const warnings = [];
  if (!Object.values(MISSION_LIFECYCLE_EVENTS).includes(event)) errors.push(`Unknown lifecycle event: ${eventName}`);
  if (!(TRANSITIONS[state.state] ?? []).includes(event)) errors.push(`Lifecycle event ${event} is not allowed from ${state.state}.`);
  if (event === MISSION_LIFECYCLE_EVENTS.beginPlanning && (!session.level || !session.mission)) errors.push('Planning requires a loaded level and mission.');
  if (event === MISSION_LIFECYCLE_EVENTS.launchSimulation && (!session.level || !session.mission || !session.plan)) errors.push('Simulation requires a loaded level, mission, and plan.');
  if ((event === MISSION_LIFECYCLE_EVENTS.showDebrief || event === MISSION_LIFECYCLE_EVENTS.completeSimulation) && !session.result) warnings.push('Debrief is opening without a completed result yet.');
  return { valid: errors.length === 0, errors, warnings };
}

export function applyMissionLifecycleTransition(currentState, eventName, session = {}) {
  const state = normalizeMissionLifecycleState(currentState);
  const validation = canApplyMissionTransition(state, eventName, session);
  if (!validation.valid) return { state, validation };
  const next = createMissionLifecycleState({
    state: nextStateForEvent(state.state, eventName),
    mode: session.missionMode ?? session.mode ?? state.mode,
    lastEvent: eventName,
    warnings: validation.warnings
  });
  return { state: next, validation };
}

export function normalizeMissionLifecycleState(value = {}) {
  if (typeof value === 'string') return createMissionLifecycleState({ state: normalizeStateId(value) });
  return createMissionLifecycleState({ ...value, state: normalizeStateId(value.state) });
}

export function missionLifecycleSummary(lifecycle = {}) {
  const state = normalizeMissionLifecycleState(lifecycle);
  return {
    type: 'anchor.mission.lifecycle-summary',
    version: MISSION_LIFECYCLE_CONTRACT_VERSION,
    state: state.state,
    lastEvent: state.lastEvent,
    mode: state.mode,
    deterministicController: true,
    usesPhaserUpdate: false,
    warnings: state.warnings
  };
}

function nextStateForEvent(currentState, eventName) {
  const map = {
    reset: MISSION_LIFECYCLE_STATES.idle,
    beginSetup: MISSION_LIFECYCLE_STATES.setup,
    loadMission: MISSION_LIFECYCLE_STATES.briefing,
    showBriefing: MISSION_LIFECYCLE_STATES.briefing,
    beginPlanning: MISSION_LIFECYCLE_STATES.planning,
    updatePlan: currentState,
    launchSimulation: MISSION_LIFECYCLE_STATES.simulation,
    pauseSimulation: MISSION_LIFECYCLE_STATES.simulation,
    resumeSimulation: MISSION_LIFECYCLE_STATES.simulation,
    completeSimulation: MISSION_LIFECYCLE_STATES.debrief,
    showDebrief: MISSION_LIFECYCLE_STATES.debrief,
    openLegacy: MISSION_LIFECYCLE_STATES.legacy
  };
  return map[eventName] ?? currentState;
}

function normalizeStateId(value) {
  const input = String(value ?? '').trim();
  return Object.values(MISSION_LIFECYCLE_STATES).includes(input) ? input : MISSION_LIFECYCLE_STATES.idle;
}
