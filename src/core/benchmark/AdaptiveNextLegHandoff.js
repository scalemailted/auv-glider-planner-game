import { missionObjectiveById } from './MissionObjectiveTaxonomy.js';

export const ADAPTIVE_NEXT_LEG_HANDOFF_VERSION = 'adaptive-next-leg-handoff-p7';

export function createAdaptiveNextLegConfig({ runtimeContext = {}, surfacingDecision = {}, previousResult = null, options = {} } = {}) {
  const transition = surfacingDecision.objectiveTransition ?? options.transition ?? null;
  const recommendedObjectiveId = transition?.toObjectiveId ?? surfacingDecision.recommendedObjective?.id ?? options.recommendedObjectiveId ?? null;
  const objective = missionObjectiveById(recommendedObjectiveId ?? 'reconnaissanceSurvey');
  return {
    type: 'anchor.benchmark.adaptive-next-leg-config',
    version: ADAPTIVE_NEXT_LEG_HANDOFF_VERSION,
    episodeId: String(runtimeContext.episodeId ?? surfacingDecision.episodeId ?? options.episodeId ?? 'adaptive-preview-episode'),
    benchmarkMode: 'adaptiveBenchmark',
    legIndex: Math.max(0, Math.round(Number(runtimeContext.activeLegIndex ?? surfacingDecision.legIndex ?? options.legIndex ?? 0))) + 1,
    recommendedObjectiveId: objective.id,
    recommendedObjectiveLabel: objective.label,
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    informationAccessTier: runtimeContext.informationAccessTier ?? options.informationAccessTier ?? 'beliefOnly',
    worldModelTier: runtimeContext.worldModelTier ?? options.worldModelTier ?? 'stochasticBelief',
    fairnessLabel: runtimeContext.fairnessLabel ?? options.fairnessLabel ?? 'Belief-only',
    managerState: cloneJson(surfacingDecision.managerStateAfter ?? runtimeContext.adaptiveManagerState ?? options.managerState ?? null),
    objectiveHistory: cloneJson(surfacingDecision.managerStateAfter?.objectiveHistory ?? runtimeContext.adaptiveManagerState?.objectiveHistory ?? []),
    evidenceSummary: summarizeEvidence(surfacingDecision.evidence),
    transition: cloneJson(transition),
    previousResultId: previousResult?.resultId ?? previousResult?.id ?? null,
    notes: [
      'The mission manager recommends the next objective. The player or solver must still plan the route.',
      'P7 does not generate waypoints or an automatic route.',
      ...(Array.isArray(options.notes) ? options.notes : [])
    ]
  };
}

export function attachAdaptiveNextLegMetadata(target, handoff) {
  const clone = cloneJson(target ?? {});
  clone.meta ??= {};
  clone.meta.adaptiveNextLeg = cloneJson(handoff);
  clone.meta.benchmarkMetadata = {
    ...(clone.meta.benchmarkMetadata ?? {}),
    benchmarkMode: 'adaptiveBenchmark',
    episodeId: handoff?.episodeId ?? clone.meta.benchmarkMetadata?.episodeId ?? null,
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    informationAccessTier: handoff?.informationAccessTier ?? clone.meta.benchmarkMetadata?.informationAccessTier ?? 'beliefOnly',
    worldModelTier: handoff?.worldModelTier ?? clone.meta.benchmarkMetadata?.worldModelTier ?? 'stochasticBelief',
    fairnessLabel: handoff?.fairnessLabel ?? clone.meta.benchmarkMetadata?.fairnessLabel ?? 'Belief-only'
  };
  return clone;
}

export function validateAdaptiveNextLegConfig(config = {}) {
  const errors = [];
  const warnings = [];
  if (!config || typeof config !== 'object') errors.push('Adaptive next-leg config must be an object.');
  if (config?.type !== 'anchor.benchmark.adaptive-next-leg-config') errors.push(`Expected type anchor.benchmark.adaptive-next-leg-config, got ${config?.type ?? 'missing'}.`);
  if (!config?.episodeId) errors.push('episodeId is required.');
  if (config?.benchmarkMode !== 'adaptiveBenchmark') errors.push('benchmarkMode must be adaptiveBenchmark.');
  if (!config?.recommendedObjectiveId) errors.push('recommendedObjectiveId is required.');
  if (config?.objectiveAuthority !== 'missionManager') errors.push('objectiveAuthority must be missionManager.');
  if (config?.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (!config?.transition) errors.push('transition is required.');
  if (config?.waypoints || config?.route || config?.agentPlans) warnings.push('Next-leg handoff should not contain generated route waypoints.');
  return { status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', valid: errors.length === 0, errors, warnings };
}

export function adaptiveNextLegSummary(config = {}) {
  return {
    type: config.type,
    episodeId: config.episodeId,
    legIndex: config.legIndex,
    recommendedObjectiveId: config.recommendedObjectiveId,
    recommendedObjectiveLabel: config.recommendedObjectiveLabel,
    objectiveAuthority: config.objectiveAuthority,
    routeAuthority: config.routeAuthority,
    hasManagerState: Boolean(config.managerState),
    hasGeneratedRoute: Boolean(config.waypoints || config.route || config.agentPlans),
    summary: 'The mission manager recommends the next objective; route planning remains manual or solver-driven.'
  };
}

function summarizeEvidence(evidence = {}) {
  return {
    observationCount: Number(evidence?.observationCount ?? 0),
    recentObservationCount: Number(evidence?.recentObservationCount ?? 0),
    primaryDiagnosis: evidence?.diagnostics?.primaryDiagnosis ?? null,
    fieldsAvailable: Array.isArray(evidence?.fieldsAvailable) ? [...evidence.fieldsAvailable] : [],
    partialEvidence: Boolean(evidence?.diagnostics?.partialEvidence),
    warnings: Array.isArray(evidence?.diagnostics?.warnings) ? [...evidence.diagnostics.warnings] : []
  };
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
