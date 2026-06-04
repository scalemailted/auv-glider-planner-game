import { EXPORT_SCHEMA_VERSION, cloneJson } from './ExportVisibility.js';
import { ensureLevelIdentity } from '../identity/GameInstanceId.js';
import { evaluateExactReplayAvailability, getReplaySeedContract } from '../random/ReplaySeedContract.js';

export function buildResultExport({ level, mission, plan, result, label = 'Manual Player Plan', challenge = null } = {}) {
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
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    type: 'anchor.result',
    createdAt: new Date().toISOString(),
    levelId: result?.levelId ?? level?.levelId ?? null,
    instanceId: result?.instanceId ?? level?.instanceId ?? null,
    challengeId: result?.instanceId ?? level?.instanceId ?? null,
    missionId: result?.missionId ?? mission?.missionId ?? mission?.id ?? null,
    challengeMode: result?.challengeMode ?? level?.challengeMode ?? null,
    replaySeedAnchor: replaySeedContract?.replaySeedAnchor ?? result?.instanceId ?? level?.instanceId ?? null,
    generationVersion: replaySeedContract?.generationVersion ?? null,
    generationConfig: cloneJson(replaySeedContract?.generationConfig ?? level?.meta?.generationConfig ?? null),
    derivedSeeds: cloneJson(replaySeedContract?.derivedSeeds ?? null),
    replaySeedContract: cloneJson(replaySeedContract),
    exactReplay: {
      available: exactReplay.available,
      method: exactReplay.method,
      reason: exactReplay.reason
    },
    label,
    executionMode: plan?.executionMode ?? plan?.meta?.executionMode ?? 'openLoop',
    importedPlanMetadata: plan?.importMetadata ?? null,
    planner: plan?.planner ?? plan?.meta?.planner ?? null,
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
