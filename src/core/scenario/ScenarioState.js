import { normalizeExperienceMode } from '../experience/ExperienceMode.js';

export function beginScenario(state, { level, mission, challengeMode = null, source = 'unknown', experienceMode = null } = {}) {
  if (!state) return null;
  state.level = level ?? null;
  state.mission = mission ?? null;
  state.missionOptions = {
    ignoreUpdateEvents: Boolean(mission?.rules?.missionOptions?.ignoreUpdateEvents ?? false)
  };
  state.challengeMode = challengeMode ?? level?.challengeMode ?? state.challengeMode ?? 'perfectKnowledge';
  state.experienceMode = normalizeExperienceMode(experienceMode ?? level?.meta?.experienceMode ?? mission?.meta?.experienceMode ?? state.experienceMode);
  state.missionMode = level?.meta?.missionMode ?? mission?.meta?.missionMode ?? level?.meta?.generationConfig?.missionMode ?? mission?.rules?.missionMode ?? state.missionMode ?? null;
  if (state.level) {
    state.level.meta ??= {};
    state.level.meta.experienceMode = state.experienceMode;
    state.level.meta.missionMode ??= state.missionMode;
  }
  if (state.mission) {
    state.mission.meta ??= {};
    state.mission.meta.experienceMode = state.experienceMode;
    state.mission.meta.missionMode ??= state.missionMode;
  }
  state.currentScenario = {
    levelId: level?.levelId ?? null,
    instanceId: level?.instanceId ?? null,
    missionId: mission?.missionId ?? mission?.id ?? null,
    challengeMode: state.challengeMode,
    experienceMode: state.experienceMode,
    missionMode: state.missionMode,
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
