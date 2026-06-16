import { EXPORT_SCHEMA_VERSION, cloneJson } from './ExportVisibility.js';
import { ensureLevelIdentity } from '../identity/GameInstanceId.js';
import { evaluateExactReplayAvailability, getReplaySeedContract } from '../random/ReplaySeedContract.js';
import { summarizeCurrentFieldConfig } from '../generation/FlowFieldConfig.js';
import { normalizeExperienceMode } from '../experience/ExperienceMode.js';
import { normalizeNavigationUncertaintyConfig } from '../navigation/NavigationUncertainty.js';
import { extractBenchmarkMetadata } from '../benchmark/BenchmarkMetadata.js';
import {
  buildBenchmarkRunRecordFromResult,
  buildRouteExecutionRecordFromResult
} from '../benchmark/BenchmarkResultAdapter.js';
import {
  buildBenchmarkAttemptSetExport,
  buildBenchmarkRouteExecutionExport,
  buildBenchmarkRunRecordExport
} from '../benchmark/BenchmarkModeExporter.js';
import { createBenchmarkAttemptSet } from '../benchmark/BenchmarkAttemptRegistry.js';
import {
  attemptSourceFromRouteSourceLabel,
  fairnessLabelFromAttemptSourceAndAccess,
  routeSourceLabelFromAttemptSource
} from '../benchmark/BenchmarkAttemptSourceMapping.js';
import { initializePlannerBenchmarkEpisode } from '../benchmark/BenchmarkEpisodeRuntime.js';
import {
  benchmarkComparisonSummary,
  buildBenchmarkComparisonViewModel
} from '../benchmark/BenchmarkComparisonViewModel.js';
import {
  buildBenchmarkRouteReviewViewModel,
  routeReviewSummary
} from '../benchmark/BenchmarkRouteReviewViewModel.js';
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

export function buildBenchmarkRunRecordExportFromResult({
  level,
  mission,
  plan,
  result,
  debriefMetrics = null,
  benchmarkModeConfig = null,
  episodeConfig = null,
  attemptSource = null,
  routeSourceLabel = null,
  fairnessLabel = null
} = {}) {
  const context = normalizeBenchmarkExportContext({
    level,
    mission,
    plan,
    result,
    benchmarkModeConfig,
    episodeConfig,
    attemptSource,
    routeSourceLabel,
    fairnessLabel
  });
  const runRecord = buildBenchmarkRunRecordFromResult({
    benchmarkModeConfig: context.benchmarkModeConfig,
    episodeConfig: context.episodeConfig,
    level,
    mission,
    plan,
    result,
    attemptSource: context.attemptSource,
    routeSourceLabel: context.routeSourceLabel
  });
  runRecord.diagnostics = {
    ...(runRecord.diagnostics ?? {}),
    episodeId: context.episodeId,
    attemptSource: context.attemptSource,
    routeSourceLabel: context.routeSourceLabel,
    debriefMetrics: cloneJson(debriefMetrics),
    usesExistingSimulation: true,
    usesExistingDebrief: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
  return {
    ...buildBenchmarkRunRecordExport(runRecord, {
      notes: ['P2 export normalized from existing simulator and debrief data.']
    }),
    benchmarkMode: 'plannerBenchmark',
    episodeId: context.episodeId,
    objectiveAuthority: 'fixed',
    routeAuthority: 'playerOrSolver',
    informationAccessTier: context.benchmarkModeConfig.informationAccessTier,
    fairnessLabel: context.fairnessLabel,
    boundaryFlags: benchmarkExecutionBoundaryFlags()
  };
}

export function buildBenchmarkRouteExecutionExportFromResult({
  level,
  mission,
  plan,
  result,
  benchmarkModeConfig = null,
  episodeConfig = null,
  attemptSource = null,
  routeSourceLabel = null,
  fairnessLabel = null
} = {}) {
  const context = normalizeBenchmarkExportContext({
    level,
    mission,
    plan,
    result,
    benchmarkModeConfig,
    episodeConfig,
    attemptSource,
    routeSourceLabel,
    fairnessLabel
  });
  const routeExecutionRecord = buildRouteExecutionRecordFromResult({
    benchmarkModeConfig: context.benchmarkModeConfig,
    episodeConfig: context.episodeConfig,
    level,
    mission,
    plan,
    result,
    attemptSource: context.attemptSource,
    routeSourceLabel: context.routeSourceLabel,
    fairnessLabel: context.fairnessLabel
  });
  routeExecutionRecord.diagnostics = {
    ...(routeExecutionRecord.diagnostics ?? {}),
    usesExistingSimulation: true,
    usesExistingDebrief: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
  return {
    ...buildBenchmarkRouteExecutionExport(routeExecutionRecord),
    boundaryFlags: benchmarkExecutionBoundaryFlags()
  };
}

export function buildBenchmarkAttemptSetExportFromResult({
  level,
  mission,
  plan,
  result,
  attemptSession = null,
  benchmarkModeConfig = null,
  episodeConfig = null,
  attemptSource = null,
  routeSourceLabel = null,
  fairnessLabel = null
} = {}) {
  const context = normalizeBenchmarkExportContext({
    level,
    mission,
    plan,
    result,
    benchmarkModeConfig,
    episodeConfig,
    attemptSource,
    routeSourceLabel,
    fairnessLabel
  });
  const routeExecutionRecord = buildRouteExecutionRecordFromResult({
    benchmarkModeConfig: context.benchmarkModeConfig,
    episodeConfig: context.episodeConfig,
    level,
    mission,
    plan,
    result,
    attemptSource: context.attemptSource,
    routeSourceLabel: context.routeSourceLabel,
    fairnessLabel: context.fairnessLabel
  });
  const runRecord = buildBenchmarkRunRecordFromResult({
    benchmarkModeConfig: context.benchmarkModeConfig,
    episodeConfig: context.episodeConfig,
    level,
    mission,
    plan,
    result,
    attemptSource: context.attemptSource,
    routeSourceLabel: context.routeSourceLabel
  });
  const attempts = Array.isArray(attemptSession?.attempts) && attemptSession.attempts.length
    ? attemptSession.attempts
    : [{
        episodeId: context.episodeId,
        benchmarkMode: 'plannerBenchmark',
        attemptSource: context.attemptSource,
        routeSourceLabel: context.routeSourceLabel,
        fairnessLabel: context.fairnessLabel,
        routeExecutionRecord,
        runRecord,
        metrics: routeExecutionRecord.metrics,
        status: routeExecutionRecord.validation?.status ?? 'completed'
      }];
  const attemptSet = createBenchmarkAttemptSet({
    episodeId: context.episodeId,
    benchmarkMode: 'plannerBenchmark',
    attempts,
    notes: ['P2 attempt set compares existing route/simulation/debrief attempts; no new planner or scoring is introduced.']
  });
  return {
    ...buildBenchmarkAttemptSetExport(attemptSet),
    boundaryFlags: benchmarkExecutionBoundaryFlags()
  };
}
export function buildBenchmarkComparisonExportFromResult({
  level,
  mission,
  plan,
  result,
  attemptSession = null,
  benchmarkModeConfig = null,
  episodeConfig = null,
  attemptSource = null,
  routeSourceLabel = null,
  fairnessLabel = null
} = {}) {
  const context = normalizeBenchmarkExportContext({
    level,
    mission,
    plan,
    result,
    benchmarkModeConfig,
    episodeConfig,
    attemptSource,
    routeSourceLabel,
    fairnessLabel
  });
  const routeExecutionRecord = buildRouteExecutionRecordFromResult({
    benchmarkModeConfig: context.benchmarkModeConfig,
    episodeConfig: context.episodeConfig,
    level,
    mission,
    plan,
    result,
    attemptSource: context.attemptSource,
    routeSourceLabel: context.routeSourceLabel,
    fairnessLabel: context.fairnessLabel
  });
  routeExecutionRecord.diagnostics = {
    ...(routeExecutionRecord.diagnostics ?? {}),
    usesExistingSimulation: true,
    usesExistingDebrief: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
  const runRecord = buildBenchmarkRunRecordFromResult({
    benchmarkModeConfig: context.benchmarkModeConfig,
    episodeConfig: context.episodeConfig,
    level,
    mission,
    plan,
    result,
    attemptSource: context.attemptSource,
    routeSourceLabel: context.routeSourceLabel
  });
  const attempts = Array.isArray(attemptSession?.attempts) && attemptSession.attempts.length
    ? attemptSession.attempts
    : [{
        episodeId: context.episodeId,
        benchmarkMode: 'plannerBenchmark',
        attemptSource: context.attemptSource,
        routeSourceLabel: context.routeSourceLabel,
        fairnessLabel: context.fairnessLabel,
        routeExecutionRecord,
        runRecord,
        metrics: routeExecutionRecord.metrics,
        status: routeExecutionRecord.validation?.status ?? 'completed'
      }];
  const attemptSet = createBenchmarkAttemptSet({
    episodeId: context.episodeId,
    benchmarkMode: 'plannerBenchmark',
    attempts,
    notes: ['P3 comparison export summarizes existing attempts; it does not add a planner or redesign scoring.']
  });
  const activeAttempt = attemptSet.attempts.find((attempt) => attempt.resultId && attempt.resultId === routeExecutionRecord.resultId)
    ?? attemptSet.attempts.at(-1)
    ?? null;
  const comparisonViewModel = buildBenchmarkComparisonViewModel({
    attemptSet,
    activeAttempt,
    benchmarkModeConfig: context.benchmarkModeConfig,
    episodeConfig: context.episodeConfig,
    routeExecutionRecords: [routeExecutionRecord],
    runRecords: [runRecord]
  });
  const routeReview = buildBenchmarkRouteReviewViewModel({ routeExecutionRecord, plan, result });
  const availableBenchmarkExports = benchmarkExportTypes();
  return {
    type: 'anchor.benchmark.comparison',
    version: 'benchmark-comparison-export-p3',
    createdAt: new Date().toISOString(),
    benchmarkMode: comparisonViewModel.benchmarkMode,
    episodeId: comparisonViewModel.episodeId,
    attempts: cloneJson(comparisonViewModel.attempts),
    rankings: cloneJson(comparisonViewModel.rankings),
    comparisonSummary: benchmarkComparisonSummary(comparisonViewModel),
    routeReview: cloneJson(routeReview),
    routeReviewSummary: routeReviewSummary(routeReview),
    fairnessLabels: [...new Set(comparisonViewModel.attempts.map((attempt) => attempt.fairnessLabel).filter(Boolean))],
    availableBenchmarkExports,
    boundaryFlags: benchmarkExecutionBoundaryFlags(),
    usesExistingSimulation: true,
    usesExistingDebrief: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false,
    notes: [
      'Planner Benchmark compares attempts under a fixed objective.',
      'Comparison metrics are normalized from existing results. P3 does not add a new planner or redesign scoring.',
      'Route review explains what happened during execution; it is not an optimization algorithm.'
    ]
  };
}

function normalizeBenchmarkExportContext({
  level,
  mission,
  plan,
  result,
  benchmarkModeConfig,
  episodeConfig,
  attemptSource,
  routeSourceLabel,
  fairnessLabel
} = {}) {
  const metadata = extractBenchmarkMetadata(result)
    ?? extractBenchmarkMetadata(plan)
    ?? extractBenchmarkMetadata(mission)
    ?? extractBenchmarkMetadata(level)
    ?? null;
  const sourceLabel = routeSourceLabel ?? result?.planName ?? result?.source ?? classifyRouteSource(plan, { label: 'Manual Player Plan', result });
  const source = attemptSource ?? metadata?.attemptSource ?? attemptSourceFromRouteSourceLabel(sourceLabel);
  const context = initializePlannerBenchmarkEpisode({
    metadata,
    benchmarkModeConfig: benchmarkModeConfig ?? metadata ?? { benchmarkMode: 'plannerBenchmark' },
    episodeConfig,
    activeAttemptSource: source,
    levelId: level?.levelId,
    missionId: mission?.missionId ?? mission?.id,
    seed: level?.meta?.seed ?? result?.seed,
    createIfMissing: true
  });
  return {
    ...context,
    episodeConfig: episodeConfig ?? context.episodeConfig,
    attemptSource: source,
    routeSourceLabel: sourceLabel || routeSourceLabelFromAttemptSource(source),
    fairnessLabel: fairnessLabel ?? context.fairnessLabel ?? fairnessLabelFromAttemptSourceAndAccess(source, context.informationAccessTier)
  };
}

function benchmarkExecutionBoundaryFlags() {
  return {
    usesExistingSimulation: true,
    usesExistingDebrief: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
}

function benchmarkExportTypes() {
  return [
    'anchor.benchmark.run-record',
    'anchor.benchmark.route-execution',
    'anchor.benchmark.attempt-set',
    'anchor.benchmark.comparison'
  ];
}