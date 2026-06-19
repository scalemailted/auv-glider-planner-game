import { normalizeExperienceMode } from '../experience/ExperienceMode.js';
import {
  ensureLegacySurfaceOnlyWaterColumnConfig,
  ensureModernWaterColumnMissionConfig,
  existingWaterColumnConfig,
  waterColumnMissionConfigSummary
} from '../science/WaterColumnMissionDefaults.js';

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
  const waterColumnConfig = ensureScenarioWaterColumnConfig(state.level, state.mission, { source, challengeMode: state.challengeMode });
  const waterColumnSummary = waterColumnMissionConfigSummary(waterColumnConfig ?? existingWaterColumnConfig(state.level, state.mission));
  state.currentScenario = {
    levelId: level?.levelId ?? null,
    instanceId: level?.instanceId ?? null,
    missionId: mission?.missionId ?? mission?.id ?? null,
    challengeMode: state.challengeMode,
    experienceMode: state.experienceMode,
    missionMode: state.missionMode,
    source,
    waterColumnConfigSource: waterColumnSummary.source,
    waterColumnLayerCount: waterColumnSummary.layerCount,
    waterColumnFallbackUsed: waterColumnSummary.importedLegacySurfaceFallback === true,
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
  if (state.ui) {
    state.ui.mapCamera = { zoom: 1, panX: 0, panY: 0 };
    state.ui.waterColumn = null;
    state.ui.waterColumnDefaultsAppliedForMission = null;
    state.ui.threeMissionCameraPreset = null;
  }
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

function ensureScenarioWaterColumnConfig(level, mission, options = {}) {
  if (!level && !mission) return null;
  const existing = existingWaterColumnConfig(level, mission);
  if (existing) return existing;
  if (isModernGeneratedScenarioSource(options.source)) {
    return ensureModernWaterColumnMissionConfig(level, mission, { source: 'generatedModernMission', scenarioSource: options.source, challengeMode: options.challengeMode });
  }
  return ensureLegacySurfaceOnlyWaterColumnConfig(level, mission, {
    reason: 'Scenario source did not provide waterColumnConfig.',
    sourceArtifactType: options.source ?? 'unknown',
    sourceSchemaVersion: level?.schemaVersion ?? mission?.schemaVersion ?? null
  });
}

function isModernGeneratedScenarioSource(source) {
  return new Set([
    'deterministicChallenge',
    'stochasticChallenge',
    'deterministicExperiment',
    'stochasticExperiment',
    'greedyPlannerRace',
    'plannerBenchmarkSetup',
    'adaptiveBenchmarkSetup',
    'tutorial',
    'generatedModernMission',
    'leaderboardRegenerated'
  ]).has(String(source ?? ''));
}