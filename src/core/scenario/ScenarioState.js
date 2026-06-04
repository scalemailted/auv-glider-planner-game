export function beginScenario(state, { level, mission, challengeMode = null, source = 'unknown' } = {}) {
  if (!state) return null;
  state.level = level ?? null;
  state.mission = mission ?? null;
  state.missionOptions = {
    ignoreUpdateEvents: Boolean(mission?.rules?.missionOptions?.ignoreUpdateEvents ?? false)
  };
  state.challengeMode = challengeMode ?? level?.challengeMode ?? state.challengeMode ?? 'perfectKnowledge';
  state.currentScenario = {
    levelId: level?.levelId ?? null,
    instanceId: level?.instanceId ?? null,
    missionId: mission?.missionId ?? mission?.id ?? null,
    challengeMode: state.challengeMode,
    source,
    briefingSeen: false
  };
  state.plan = null;
  state.result = null;
  state.simulationResume = null;
  state.surfacedAgents = [];
  state.surfaceDecision = null;
  state.routeFailureDecision = null;
  state.simulation = createIdleSimulationState();
  state.missionOptions = {
    ignoreUpdateEvents: Boolean(state.mission?.rules?.missionOptions?.ignoreUpdateEvents ?? false)
  };
  state.selectedAgentId = null;
  state.selectedWindow = 0;
  state.planningTime = 0;
  if (state.ui) state.ui.mapCamera = { zoom: 1, panX: 0, panY: 0 };
  state.currentPlanSource = 'manual';
  state.manualPlan = null;
  state.manualResult = null;
  return state.currentScenario;
}

export function markBriefingSeen(state) {
  if (!state) return null;
  state.currentScenario ??= {};
  state.currentScenario.briefingSeen = true;
  return state.currentScenario;
}

export function resetScenarioForRetry(state) {
  if (!state) return;
  state.plan = null;
  state.result = null;
  state.simulationResume = null;
  state.surfacedAgents = [];
  state.surfaceDecision = null;
  state.routeFailureDecision = null;
  state.simulation = createIdleSimulationState();
  state.selectedWindow = 0;
  state.planningTime = 0;
  if (state.currentScenario) state.currentScenario.briefingSeen = false;
}

function createIdleSimulationState() {
  return {
    running: false,
    paused: false,
    waitingForPlayerDecision: false,
    waitingForImport: false,
    waitingForExternalSolver: false,
    pauseReason: null
  };
}
