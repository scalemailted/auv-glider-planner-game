import {
  createBenchmarkActionRecord,
  createBenchmarkObjectiveRecord,
  createBenchmarkRewardRecord,
  createBenchmarkRunRecord
} from './BenchmarkRunRecord.js';
import { createBenchmarkModeConfig, informationAccessTierById } from './BenchmarkModeContract.js';
import { createBenchmarkEpisodeConfig, normalizeBenchmarkAttemptSource } from './BenchmarkEpisodeContract.js';
import {
  createScoreInput,
  createScoreProfile,
  evaluateScore,
  scoreResultSummary
} from '../../../packages/scoring/src/index.js';
import {
  createRouteExecutionMetrics,
  createRouteExecutionRecord,
  createRouteValidationSummary
} from './BenchmarkRouteExecutionRecord.js';

// This adapter normalizes existing ANCHOR result/debrief data into benchmark records.
// It does not simulate routes or own score calculation; package scoring supplies score metadata.
export function buildBenchmarkRunRecordFromResult({
  benchmarkModeConfig,
  episodeConfig,
  level,
  mission,
  plan,
  result,
  attemptSource = 'manualPlayer',
  routeSourceLabel = null
} = {}) {
  const modeConfig = createBenchmarkModeConfig(benchmarkModeConfig ?? episodeConfig?.benchmarkModeConfig ?? { benchmarkMode: episodeConfig?.benchmarkMode ?? 'plannerBenchmark' });
  const episode = episodeConfig ?? createBenchmarkEpisodeConfig({ benchmarkModeConfig: modeConfig, levelId: level?.levelId, missionId: mission?.missionId ?? mission?.id });
  const normalizedAttemptSource = normalizeBenchmarkAttemptSource(attemptSource);
  const fairnessLabel = inferBenchmarkFairnessLabel({ informationAccessTier: modeConfig.informationAccessTier, attemptSource: normalizedAttemptSource, plan, result });
  const routeExecutionRecord = buildRouteExecutionRecordFromResult({
    benchmarkModeConfig: modeConfig,
    episodeConfig: episode,
    level,
    mission,
    plan,
    result,
    attemptSource: normalizedAttemptSource,
    routeSourceLabel,
    fairnessLabel
  });
  const metrics = routeExecutionRecord.metrics;
  const packageScore = buildBenchmarkPackageScore({ level, mission, plan, result, metrics });
  return createBenchmarkRunRecord({
    benchmarkMode: modeConfig.benchmarkMode,
    worldModelTier: modeConfig.worldModelTier,
    informationAccessTier: modeConfig.informationAccessTier,
    objectiveAuthority: modeConfig.objectiveAuthority,
    routeAuthority: modeConfig.routeAuthority,
    fairnessLabel,
    scenarioId: level?.instanceId ?? level?.levelId ?? result?.instanceId ?? null,
    seed: level?.meta?.seed ?? level?.meta?.generationConfig?.seed ?? result?.seed ?? null,
    completedAt: result ? new Date().toISOString() : null,
    objectives: extractBenchmarkObjectivesFromMission(mission),
    observations: extractObservationRecords(result),
    actions: extractActionRecords(plan, normalizedAttemptSource, modeConfig.informationAccessTier),
    rewards: [createBenchmarkRewardRecord({
      rewardType: 'existingDebriefFinalScore',
      value: packageScore.scoreResult?.officialScore ?? metrics.finalScore ?? 0,
      components: { ...metrics, scoreResultDigest: packageScore.scoreResult?.resultDigest ?? null },
      note: 'Normalized from existing ANCHOR debrief/result summary through packages/scoring.'
    })],
    diagnostics: {
      adapterOnly: true,
      doesNotSimulateRoutes: true,
      doesNotComputeOfficialScores: true,
      usesPackageScoring: true,
      scoreResultSummary: packageScore.scoreResultSummary,
      episodeId: episode.episodeId ?? null,
      routeExecutionSummary: routeExecutionRecord.metrics,
      routeExecutionValidation: routeExecutionRecord.validation,
      routeSourceLabel: routeSourceLabel ?? routeExecutionRecord.routeSourceLabel
    },
    exports: {
      routeExecutionType: routeExecutionRecord.type,
      resultType: result?.type ?? 'anchor.result-compatible'
    },
    notes: ['P1 adapter record produced from existing route/simulation/debrief data.']
  });
}

export function buildRouteExecutionRecordFromResult({
  benchmarkModeConfig,
  episodeConfig,
  level,
  mission,
  plan,
  result,
  attemptSource = 'manualPlayer',
  routeSourceLabel = null,
  fairnessLabel = null
} = {}) {
  const modeConfig = createBenchmarkModeConfig(benchmarkModeConfig ?? episodeConfig?.benchmarkModeConfig ?? { benchmarkMode: episodeConfig?.benchmarkMode ?? 'plannerBenchmark' });
  const source = normalizeBenchmarkAttemptSource(attemptSource);
  return createRouteExecutionRecord({
    benchmarkMode: modeConfig.benchmarkMode,
    benchmarkModeConfig: modeConfig,
    episodeId: episodeConfig?.episodeId ?? result?.benchmarkMetadata?.episodeId ?? null,
    attemptId: result?.attemptId ?? plan?.meta?.attemptId ?? null,
    attemptSource: source,
    routeSourceLabel: routeSourceLabel ?? result?.planName ?? result?.label ?? null,
    fairnessLabel: fairnessLabel ?? inferBenchmarkFairnessLabel({ informationAccessTier: modeConfig.informationAccessTier, attemptSource: source, plan, result }),
    level,
    mission,
    plan,
    result,
    levelId: result?.levelId ?? level?.levelId,
    missionId: result?.missionId ?? mission?.missionId ?? mission?.id,
    planId: plan?.planId ?? plan?.id ?? plan?.meta?.planId,
    resultId: result?.resultId ?? result?.id,
    validation: extractBenchmarkValidationFromPlan(plan),
    metrics: extractBenchmarkMetricsFromResult(result),
    diagnostics: {
      adapterOnly: true,
      existingDebrief: Boolean(result?.summary),
      comparisonAvailable: Boolean(result?.comparison)
    },
    exportRefs: {
      resultType: result?.type ?? null,
      planType: plan?.type ?? null
    },
    notes: ['Normalized by BenchmarkResultAdapter; no route simulation was run here.']
  });
}

export function extractBenchmarkMetricsFromResult(result = {}) {
  if (!result || typeof result !== 'object') return createRouteExecutionMetrics({});
  return createRouteExecutionMetrics({
    ...result,
    summary: result.summary ?? result.scoreSummary ?? {},
    risk: result.risk ?? result.hazards ?? {},
    routeQuality: result.routeQuality ?? {},
    regret: result.regret ?? {}
  });
}

export function extractBenchmarkValidationFromPlan(plan = {}) {
  const errors = [];
  const warnings = [];
  const issues = normalizeIssueList(plan?.meta?.validationIssues ?? plan?.validationIssues);
  for (const issue of issues) {
    const message = typeof issue === 'string' ? issue : issue.message ?? issue.reason ?? JSON.stringify(issue);
    if (issue?.severity === 'warning') warnings.push(message);
    else errors.push(message);
  }
  for (const agentPlan of plan?.agentPlans ?? []) {
    for (const [index, waypoint] of (agentPlan.waypoints ?? []).entries()) {
      if (waypoint?.validity?.valid === false) {
        const reasons = (waypoint.validity.reasons ?? []).join(', ') || 'invalid route';
        errors.push(`${agentPlan.agentId ?? 'agent'} waypoint ${index + 1}: ${reasons}`);
      }
      for (const warning of waypoint?.warnings ?? []) warnings.push(String(warning));
    }
  }
  const valid = plan?.meta?.valid;
  return createRouteValidationSummary({
    ok: valid === undefined ? errors.length === 0 : Boolean(valid) && errors.length === 0,
    errors,
    warnings,
    invalidWaypointCount: countInvalidWaypoints(plan),
    overDurationCount: countWaypointsMatching(plan, (waypoint) => waypoint?.runtimeBehavior === 'truncate_at_mission_end' || waypoint?.intentionalOverDuration),
    fuelFailureCount: countMessages(errors, /fuel|battery|energy/i),
    terrainFailureCount: countMessages(errors, /terrain|blocked|navigable|land/i),
    startFailureCount: countMessages(errors, /start|deployment/i)
  });
}

export function extractBenchmarkObjectivesFromMission(mission = {}) {
  const objectives = Array.isArray(mission?.objectives)
    ? mission.objectives
    : Array.isArray(mission?.rules?.objectives)
      ? mission.rules.objectives
      : [];
  if (objectives.length) {
    return objectives.map((objective, index) => createBenchmarkObjectiveRecord({
      time: objective.time ?? 0,
      objectiveId: objective.id ?? objective.objectiveId ?? `mission-objective-${index + 1}`,
      objectiveType: objective.type ?? objective.objectiveType ?? objective.kind ?? 'reconnaissanceSurvey',
      authority: objective.authority ?? 'fixed',
      rationale: objective.description ?? objective.rationale ?? objective.label ?? '',
      status: objective.status ?? 'active'
    }));
  }
  return [createBenchmarkObjectiveRecord({
    objectiveId: mission?.missionId ?? mission?.id ?? 'mission-objective-default',
    objectiveType: mission?.meta?.missionMode ?? mission?.rules?.missionMode ?? 'reconnaissanceSurvey',
    authority: 'fixed',
    rationale: 'Default objective inferred from the existing mission configuration.',
    status: 'active'
  })];
}

export function inferBenchmarkFairnessLabel({ informationAccessTier, attemptSource, plan, result } = {}) {
  if (informationAccessTier === 'oracleTruth') return informationAccessTierById('oracleTruth').fairnessLabel;
  if (informationAccessTier === 'beliefOnly') return informationAccessTierById('beliefOnly').fairnessLabel;
  const fairness = result?.fairness ?? plan?.fairness ?? {};
  const planner = plan?.planner ?? plan?.meta?.planner ?? result?.planner ?? {};
  if (fairness.usesOracle || fairness.usesTruth || planner.usesOracle || planner.usesTruth) return informationAccessTierById('oracleTruth').fairnessLabel;
  if (normalizeBenchmarkAttemptSource(attemptSource) === 'oraclePlanner') return informationAccessTierById('oracleTruth').fairnessLabel;
  if (planner.usesBelief || result?.beliefState || informationAccessTier === 'beliefOnly') return informationAccessTierById('beliefOnly').fairnessLabel;
  return informationAccessTierById(informationAccessTier ?? 'forecastOnly').fairnessLabel;
}

function buildBenchmarkPackageScore({ level, mission, plan, result, metrics } = {}) {
  const profile = createScoreProfile({ profileId: metrics?.scoreProfileId ?? result?.summary?.scoreProfileId ?? 'balancedMission' });
  const scoreInput = createScoreInput({
    environmentArtifactDigest: level?.environmentArtifact?.artifactDigest ?? level?.instanceId ?? level?.levelId ?? null,
    planDigest: plan?.planDigest ?? plan?.id ?? plan?.planId ?? null,
    simulationInputDigest: result?.missionSimulation?.inputDigest ?? null,
    simulationResultDigest: result?.missionSimulation?.resultDigest ?? result?.resultDigest ?? null,
    terminalReason: result?.stopReason?.code ?? result?.summary?.abortReason ?? null,
    rawMetrics: { officialScoreSummary: result?.summary ?? metrics ?? {} },
    missionObjectives: mission?.objectives ?? mission?.rules?.objectives ?? [],
    missionMetadata: { missionId: mission?.missionId ?? mission?.id ?? result?.missionId ?? null },
    scoreProfileId: profile.id,
    scoreProfileVersion: profile.version
  });
  const scoreResult = evaluateScore(profile, scoreInput);
  return { profile, scoreInput, scoreResult, scoreResultSummary: scoreResultSummary(scoreResult) };
}
function extractActionRecords(plan, attemptSource, informationAccessTier) {
  const actions = [];
  for (const agentPlan of plan?.agentPlans ?? []) {
    for (const waypoint of agentPlan.waypoints ?? []) {
      actions.push(createBenchmarkActionRecord({
        time: waypoint.estimatedArrivalTime ?? waypoint.t ?? 0,
        gliderId: agentPlan.agentId,
        actionType: waypoint.action ?? waypoint.kind ?? 'navigation',
        target: waypoint,
        source: attemptSource,
        allowedInformation: informationAccessTier,
        actionValue: waypoint.actionValue ?? waypoint.expectedValue ?? null,
        routeId: plan?.planId ?? plan?.id ?? plan?.meta?.planId ?? null
      }));
    }
  }
  return actions;
}

function extractObservationRecords(result) {
  const events = Array.isArray(result?.events) ? result.events : [];
  return events
    .filter((event) => /sample|observe|surface/i.test(String(event.type ?? event.eventType ?? '')))
    .slice(0, 200)
    .map((event) => ({
      time: event.time ?? event.t ?? 0,
      gliderId: event.agentId ?? event.gliderId ?? null,
      position: event.position ?? event.cell ?? event,
      sensorType: event.sensorType ?? event.type ?? null,
      observedValue: event.value ?? event.observedValue ?? null,
      expectedValue: event.expectedValue ?? null,
      surprise: event.surprise ?? null,
      beliefUpdateId: event.beliefUpdateId ?? null
    }));
}

function normalizeIssueList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function countInvalidWaypoints(plan) {
  return countWaypointsMatching(plan, (waypoint) => waypoint?.validity?.valid === false);
}

function countWaypointsMatching(plan, predicate) {
  let count = 0;
  for (const agentPlan of plan?.agentPlans ?? []) {
    for (const waypoint of agentPlan.waypoints ?? []) {
      if (predicate(waypoint)) count += 1;
    }
  }
  return count;
}

function countMessages(messages, pattern) {
  return messages.filter((message) => pattern.test(String(message))).length;
}
