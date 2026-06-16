import { EXPORT_SCHEMA_VERSION, cloneJson } from './ExportVisibility.js';
import { ensureLevelIdentity } from '../identity/GameInstanceId.js';
import { evaluateExactReplayAvailability, getReplaySeedContract } from '../random/ReplaySeedContract.js';
import { summarizeCurrentFieldConfig } from '../generation/FlowFieldConfig.js';
import { normalizeExperienceMode } from '../experience/ExperienceMode.js';
import { normalizeNavigationUncertaintyConfig } from '../navigation/NavigationUncertainty.js';
import { extractBenchmarkMetadata } from '../benchmark/BenchmarkMetadata.js';
import {
  buildScenarioFingerprint,
  classifyRouteSource,
  leaderboardScopeForExperience
} from '../storage/LeaderboardStore.js';

export function buildResultExport({ level, mission, plan, result, label = 'Manual Player Plan', challenge = null, experienceMode = null } = {}) {
  if (level) ensureLevelIdentity(level);
  const replaySeedContract = getReplaySeedContract({
    level,
    mission,
    challenge,
    generationConfig: level?.meta?.generationConfig ?? challenge?.generationConfig ?? null
  });
  const exactReplay = evaluateExactReplayAvailability({
    level,
    mission,
    challenge,
    replaySeedContract
  });
  const resolvedExperienceMode = normalizeExperienceMode(experienceMode ?? result?.experienceMode ?? level?.meta?.experienceMode ?? mission?.meta?.experienceMode ?? challenge?.experienceMode);
  const leaderboardScope = leaderboardScopeForExperience(resolvedExperienceMode);
  const routeSource = classifyRouteSource(plan, { label, result });
  const planner = plan?.planner ?? plan?.meta?.planner ?? null;
  const scenarioFingerprint = buildScenarioFingerprint({ level, mission, result, replaySeedContract });
  const missionMode = result?.missionMode
    ?? level?.meta?.missionMode
    ?? mission?.meta?.missionMode
    ?? challenge?.missionMode
    ?? level?.meta?.generationConfig?.missionMode
    ?? null;
  const benchmarkMetadata = extractBenchmarkMetadata(result)
    ?? extractBenchmarkMetadata(plan)
    ?? extractBenchmarkMetadata(mission)
    ?? extractBenchmarkMetadata(level)
    ?? null;
  const navigationUncertainty = normalizeNavigationUncertaintyConfig(
    result?.navigationUncertainty
      ?? mission?.rules?.navigationUncertainty
      ?? mission?.meta?.navigationUncertainty
      ?? level?.meta?.generationConfig?.navigationUncertainty
      ?? challenge?.navigationUncertainty
      ?? {}
  );
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    type: 'anchor.result',
    createdAt: new Date().toISOString(),
    levelId: result?.levelId ?? level?.levelId ?? null,
    instanceId: result?.instanceId ?? level?.instanceId ?? null,
    challengeId: result?.instanceId ?? level?.instanceId ?? null,
    missionId: result?.missionId ?? mission?.missionId ?? mission?.id ?? null,
    challengeMode: result?.challengeMode ?? level?.challengeMode ?? null,
    experienceMode: resolvedExperienceMode,
    leaderboardScope,
    scenarioFingerprint,
    missionMode,
    missionModePreset: cloneJson(level?.meta?.missionModePreset ?? mission?.meta?.missionModePreset ?? challenge?.missionModePreset ?? level?.meta?.generationConfig?.missionModePreset ?? null),
    replaySeedAnchor: replaySeedContract?.replaySeedAnchor ?? result?.instanceId ?? level?.instanceId ?? null,
    generationVersion: replaySeedContract?.generationVersion ?? null,
    generationConfig: cloneJson(replaySeedContract?.generationConfig ?? level?.meta?.generationConfig ?? null),
    navigationUncertainty: cloneJson(navigationUncertainty),
    sampleFieldConfig: cloneJson(level?.meta?.generationConfig?.sampleFieldConfig ?? level?.meta?.generationConfig?.sampleField ?? null),
    currentFieldConfig: cloneJson(level?.meta?.generationConfig?.currentFieldConfig ?? level?.meta?.generationConfig?.currentField ?? null),
    currentFieldSummary: summarizeCurrentFieldConfig(level?.meta?.generationConfig?.currentFieldConfig ?? level?.meta?.generationConfig?.currentField ?? {}),
    importedFlowField: cloneJson(level?.meta?.generationConfig?.importedFlowField ?? null),
    waypointSemantics: {
      defaultKind: 'navigation',
      kinds: ['navigation', 'surface', 'samplingTarget', 'terminalCarryThrough'],
      eventTypes: ['navigation_intent', 'surface_update', 'sampling_target', 'terminal_carry_through']
    },
    derivedSeeds: cloneJson(replaySeedContract?.derivedSeeds ?? null),
    replaySeedContract: cloneJson(replaySeedContract),
    exactReplay: {
      available: exactReplay.available,
      method: exactReplay.method,
      reason: exactReplay.reason
    },
    label,
    routeSource,
    solverId: planner?.id ?? planner?.solverId ?? plan?.meta?.solver ?? null,
    solverLabel: routeSource === 'manual' ? null : (planner?.label ?? planner?.name ?? plan?.meta?.name ?? plan?.meta?.solver ?? null),
    executionMode: plan?.executionMode ?? plan?.meta?.executionMode ?? 'openLoop',
    importedPlanMetadata: plan?.importMetadata ?? null,
    planner,
    ...(benchmarkMetadata ? { benchmarkMetadata: cloneJson(benchmarkMetadata) } : {}),
    fairness: {
      usesForecast: Boolean(plan?.planner?.usesForecast ?? plan?.meta?.planner?.usesForecast),
      usesTruth: Boolean(plan?.planner?.usesTruth ?? plan?.meta?.planner?.usesTruth),
      usesOracle: Boolean(plan?.planner?.usesOracle ?? plan?.meta?.planner?.usesOracle),
      oracleAssisted: Boolean(plan?.planner?.usesOracle ?? plan?.meta?.planner?.usesOracle),
      fairForLeaderboard: !Boolean(plan?.planner?.usesOracle ?? plan?.meta?.planner?.usesOracle)
        && !Boolean(plan?.planner?.usesTruth ?? plan?.meta?.planner?.usesTruth)
    },
    surfaceUpdate: {
      modeRecognized: (plan?.executionMode ?? plan?.meta?.executionMode) === 'surfaceUpdateBundle',
      segmentsAvailable: plan?.surfaceSegments?.length ?? 0,
      segmentsApplied: result?.surfaceUpdate?.segmentsApplied ?? 0,
      automatedExecution: false,
      ignoreUpdateEvents: Boolean(result?.missionOptions?.ignoreUpdateEvents),
      ignoredUpdateEvents: Number(result?.missionOptions?.ignoredUpdateEvents ?? result?.updateEventsIgnored ?? 0)
    },
    missionOptions: cloneJson(result?.missionOptions ?? mission?.rules?.missionOptions ?? { ignoreUpdateEvents: false }),
    challengeReference: challenge ? {
      levelId: challenge.levelId,
      instanceId: challenge.instanceId,
      challengeId: challenge.challengeId ?? challenge.instanceId,
      missionId: challenge.missionId,
      challengeMode: challenge.challengeMode,
      experienceMode: challenge.experienceMode ?? resolvedExperienceMode,
      missionMode: challenge.missionMode ?? missionMode,
      replaySeedAnchor: challenge.replaySeedAnchor ?? challenge.replaySeedContract?.replaySeedAnchor ?? challenge.instanceId,
      generationVersion: challenge.generationVersion ?? challenge.replaySeedContract?.generationVersion ?? null,
      visibility: challenge.visibility
    } : null,
    plan: cloneJson(plan ?? result?.plan ?? null),
    selectedStarts: cloneJson((mission?.agents ?? []).map((agent) => ({
      agentId: agent.id,
      selectedStart: agent.deployment?.selectedStart ?? agent.selectedStart ?? agent.start ?? null
    }))),
    planningMarkers: cloneJson(plan?.planningMarkers ?? []),
    routeQuality: cloneJson(result?.routeQuality ?? null),
    routeExecution: {
      frames: cloneJson(result?.frames ?? []),
      trajectories: cloneJson(result?.trajectories ?? result?.frames ?? []),
      events: cloneJson(result?.events ?? [])
    },
    scoreSummary: cloneJson(result?.summary ?? {}),
    energySummary: cloneJson(result?.energy ?? {
      energyUsed: result?.summary?.energyUsed ?? null,
      energyPenalty: result?.summary?.energyPenalty ?? null
    }),
    hazards: cloneJson(result?.risk ?? {
      hazardsHit: result?.summary?.hazardsHit ?? 0,
      mobileHazardsHit: result?.summary?.mobileHazardsHit ?? 0
    }),
    missedInvalidReasons: cloneJson({
      stopReason: result?.stopReason ?? result?.summary?.stopReason ?? null,
      missedWaypoints: result?.summary?.missedWaypoints ?? null,
      routeFailureDecisions: (result?.events ?? []).filter((event) => event.type === 'routeFailureDecision')
    }),
    stochastic: cloneJson(result?.stochastic ?? result?.stochasticRun ?? null),
    forecastConfidence: cloneJson(result?.ensembleMetrics ?? result?.forecastScore ?? null),
    debriefMetrics: cloneJson({
      comparison: result?.comparison ?? null,
      rating: result?.rating ?? null,
      objectives: result?.objectives ?? null,
      regret: result?.regret ?? null,
      drift: result?.drift ?? null,
      endCondition: result?.endCondition ?? result?.summary?.endCondition ?? null,
      sampling: result?.sampling ?? null,
      priorityTargets: result?.priorityTargets ?? result?.summary?.priorityTargets ?? null
    }),
    debugTrace: cloneJson(result?.debugTrace ?? result?.simulationTrace ?? null),
    rawResult: cloneJson(result ?? null)
  };
}
