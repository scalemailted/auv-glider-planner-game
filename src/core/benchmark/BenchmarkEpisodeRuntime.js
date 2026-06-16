import {
  createBenchmarkEpisodeConfig,
  createBenchmarkEpisodeState,
  normalizeBenchmarkAttemptSource
} from './BenchmarkEpisodeContract.js';
import { createBenchmarkModeConfig, informationAccessTierById } from './BenchmarkModeContract.js';
import { extractBenchmarkMetadata } from './BenchmarkMetadata.js';
import {
  attemptSourceFromRouteSourceLabel,
  fairnessLabelFromAttemptSourceAndAccess,
  routeSourceLabelFromAttemptSource
} from './BenchmarkAttemptSourceMapping.js';

export const BENCHMARK_EPISODE_RUNTIME_VERSION = 'benchmark-episode-runtime-p2';

export function createBenchmarkEpisodeId(options = {}) {
  const existing = stringOrNull(options.episodeId ?? options.id ?? options.episodeConfig?.episodeId ?? options.metadata?.episodeId);
  if (existing) return existing;
  const mode = String(options.benchmarkMode ?? options.benchmarkModeConfig?.benchmarkMode ?? 'plannerBenchmark').replace(/[^a-z0-9_-]/gi, '-');
  const seed = String(options.seed ?? options.levelId ?? options.missionId ?? options.scenarioId ?? '').replace(/[^a-z0-9_-]/gi, '-').slice(0, 24);
  const createdAt = String(options.createdAt ?? new Date().toISOString()).replace(/[^0-9a-z]/gi, '').slice(0, 18);
  return [mode, seed, createdAt].filter(Boolean).join('-') || `plannerBenchmark-${Date.now().toString(36)}`;
}

export function initializePlannerBenchmarkEpisode(options = {}) {
  const existing = options.context ?? contextFromMetadata(options.metadata);
  if (existing?.benchmarkMode === 'plannerBenchmark' && !options.force) return normalizeRuntimeContext(existing, options);
  const benchmarkModeConfig = createBenchmarkModeConfig({
    ...(options.benchmarkModeConfig ?? {}),
    benchmarkMode: 'plannerBenchmark',
    objectiveAuthority: 'fixed',
    routeAuthority: 'playerOrSolver',
    informationAccessTier: options.informationAccessTier ?? options.benchmarkModeConfig?.informationAccessTier ?? 'forecastOnly',
    worldModelTier: options.worldModelTier ?? options.benchmarkModeConfig?.worldModelTier ?? 'flowCoupledAction'
  });
  const episodeConfig = options.episodeConfig ?? createBenchmarkEpisodeConfig({
    benchmarkModeConfig,
    objective: options.objective ?? options.activeObjective,
    levelId: options.levelId,
    missionId: options.missionId,
    scenarioId: options.scenarioId,
    seed: options.seed,
    allowedAttemptSources: options.allowedAttemptSources
  });
  const episodeState = options.episodeState ?? createBenchmarkEpisodeState({
    episodeConfig,
    episodeId: options.episodeId,
    phase: options.phase ?? 'setup',
    activeAttemptSource: options.activeAttemptSource ?? 'manualPlayer',
    createdAt: options.createdAt
  });
  return normalizeRuntimeContext({
    episodeId: options.episodeId ?? episodeState.episodeId ?? createBenchmarkEpisodeId(options),
    benchmarkMode: 'plannerBenchmark',
    benchmarkModeConfig,
    episodeConfig,
    activeObjective: options.activeObjective ?? episodeConfig.objective ?? null,
    informationAccessTier: benchmarkModeConfig.informationAccessTier,
    worldModelTier: benchmarkModeConfig.worldModelTier,
    objectiveAuthority: 'fixed',
    routeAuthority: 'playerOrSolver',
    fairnessLabel: options.fairnessLabel ?? benchmarkModeConfig.fairnessLabel,
    allowedAttemptSources: options.allowedAttemptSources ?? episodeConfig.allowedAttemptSources,
    activeAttemptSource: options.activeAttemptSource ?? episodeState.activeAttemptSource ?? 'manualPlayer',
    createdAt: options.createdAt ?? episodeState.createdAt ?? new Date().toISOString(),
    notes: options.notes
  });
}

export function derivePlannerBenchmarkEpisodeFromLevel(level, options = {}) {
  const metadata = extractBenchmarkMetadata(level);
  if (!metadata && !options.createIfMissing) return null;
  return initializePlannerBenchmarkEpisode({
    ...options,
    metadata,
    levelId: level?.levelId ?? level?.id,
    seed: level?.meta?.seed ?? level?.instanceId
  });
}

export function derivePlannerBenchmarkEpisodeFromMission(mission, options = {}) {
  const metadata = extractBenchmarkMetadata(mission);
  if (!metadata && !options.createIfMissing) return null;
  return initializePlannerBenchmarkEpisode({
    ...options,
    metadata,
    missionId: mission?.missionId ?? mission?.id
  });
}

export function derivePlannerBenchmarkAttemptContext(options = {}) {
  const base = initializePlannerBenchmarkEpisode(options);
  const attemptSource = normalizeBenchmarkAttemptSource(
    options.attemptSource
      ?? attemptSourceFromRouteSourceLabel(options.routeSourceLabel ?? options.routeSource)
      ?? base.activeAttemptSource
  );
  return normalizeRuntimeContext({
    ...base,
    activeAttemptSource: attemptSource,
    routeSourceLabel: options.routeSourceLabel ?? routeSourceLabelFromAttemptSource(attemptSource),
    fairnessLabel: options.fairnessLabel ?? fairnessLabelFromAttemptSourceAndAccess(attemptSource, base.informationAccessTier)
  });
}

export function attachPlannerBenchmarkContextToState(state, context) {
  const clone = cloneJson(state ?? {});
  const normalized = validatePlannerBenchmarkRuntimeContext(context).valid
    ? normalizeRuntimeContext(context)
    : null;
  if (!normalized) return clone;
  clone.benchmarkRuntimeContext = normalized;
  clone.benchmarkModeConfig = cloneJson(normalized.benchmarkModeConfig);
  clone.benchmarkEpisode = {
    ...(clone.benchmarkEpisode ?? {}),
    episodeId: normalized.episodeId,
    phase: clone.benchmarkEpisode?.phase ?? 'planning',
    activeAttemptSource: normalized.activeAttemptSource,
    activeObjective: cloneJson(normalized.activeObjective),
    createdAt: normalized.createdAt,
    updatedAt: new Date().toISOString()
  };
  return clone;
}

export function extractPlannerBenchmarkContextFromState(state = {}) {
  if (!state || typeof state !== 'object') return null;
  if (state.benchmarkRuntimeContext?.benchmarkMode === 'plannerBenchmark') {
    return normalizeRuntimeContext(state.benchmarkRuntimeContext);
  }
  const pending = state.pendingBenchmarkEpisode;
  if (pending?.benchmarkModeConfig?.benchmarkMode === 'plannerBenchmark') {
    return initializePlannerBenchmarkEpisode({
      benchmarkModeConfig: pending.benchmarkModeConfig,
      episodeConfig: pending.episodeConfig,
      episodeState: pending.episodeState,
      activeAttemptSource: pending.episodeState?.activeAttemptSource
    });
  }
  const metadata = extractBenchmarkMetadata(state.result)
    ?? extractBenchmarkMetadata(state.plan)
    ?? extractBenchmarkMetadata(state.mission)
    ?? extractBenchmarkMetadata(state.level)
    ?? state.currentScenario?.benchmarkMetadata
    ?? null;
  if (!metadata || metadata.benchmarkMode !== 'plannerBenchmark') return null;
  return initializePlannerBenchmarkEpisode({
    metadata,
    benchmarkModeConfig: state.benchmarkModeConfig ?? metadata,
    episodeState: state.benchmarkEpisode,
    activeAttemptSource: metadata.attemptSource ?? state.benchmarkEpisode?.activeAttemptSource ?? attemptSourceFromRouteSourceLabel(state.currentPlanSource),
    levelId: state.level?.levelId,
    missionId: state.mission?.missionId ?? state.mission?.id
  });
}

export function validatePlannerBenchmarkRuntimeContext(context = {}) {
  const errors = [];
  if (!context || typeof context !== 'object') errors.push('Planner benchmark runtime context must be an object.');
  if (context?.benchmarkMode !== 'plannerBenchmark') errors.push('benchmarkMode must be plannerBenchmark.');
  if (!stringOrNull(context?.episodeId)) errors.push('episodeId is required.');
  if (context?.objectiveAuthority !== 'fixed') errors.push('objectiveAuthority must be fixed.');
  if (context?.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (!stringOrNull(context?.informationAccessTier)) errors.push('informationAccessTier is required.');
  if (!stringOrNull(context?.worldModelTier)) errors.push('worldModelTier is required.');
  return {
    status: errors.length ? 'FAIL' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}

function normalizeRuntimeContext(context = {}, fallback = {}) {
  const benchmarkModeConfig = createBenchmarkModeConfig({
    ...(context.benchmarkModeConfig ?? fallback.benchmarkModeConfig ?? context),
    benchmarkMode: 'plannerBenchmark',
    objectiveAuthority: 'fixed',
    routeAuthority: 'playerOrSolver'
  });
  const activeAttemptSource = normalizeBenchmarkAttemptSource(context.activeAttemptSource ?? fallback.activeAttemptSource ?? context.attemptSource ?? 'manualPlayer');
  return {
    episodeId: createBenchmarkEpisodeId({ ...fallback, ...context, benchmarkModeConfig }),
    benchmarkMode: 'plannerBenchmark',
    benchmarkModeConfig,
    episodeConfig: cloneJson(context.episodeConfig ?? fallback.episodeConfig ?? null),
    activeObjective: cloneJson(context.activeObjective ?? fallback.activeObjective ?? context.objective ?? context.episodeConfig?.objective ?? null),
    informationAccessTier: context.informationAccessTier ?? benchmarkModeConfig.informationAccessTier,
    worldModelTier: context.worldModelTier ?? benchmarkModeConfig.worldModelTier,
    objectiveAuthority: 'fixed',
    routeAuthority: 'playerOrSolver',
    fairnessLabel: context.fairnessLabel ?? fallback.fairnessLabel ?? informationAccessTierById(benchmarkModeConfig.informationAccessTier).fairnessLabel,
    allowedAttemptSources: normalizeStringList(context.allowedAttemptSources ?? context.episodeConfig?.allowedAttemptSources ?? ['manualPlayer', 'greedyPlanner', 'importedSolver', 'externalSolver']),
    activeAttemptSource,
    routeSourceLabel: context.routeSourceLabel ?? routeSourceLabelFromAttemptSource(activeAttemptSource),
    createdAt: context.createdAt ?? fallback.createdAt ?? new Date().toISOString(),
    notes: normalizeStringList(context.notes ?? fallback.notes)
  };
}

function contextFromMetadata(metadata) {
  if (!metadata || metadata.benchmarkMode !== 'plannerBenchmark') return null;
  return {
    episodeId: metadata.episodeId,
    benchmarkMode: metadata.benchmarkMode,
    benchmarkModeConfig: metadata,
    informationAccessTier: metadata.informationAccessTier,
    worldModelTier: metadata.worldModelTier,
    objectiveAuthority: metadata.objectiveAuthority,
    routeAuthority: metadata.routeAuthority,
    fairnessLabel: metadata.fairnessLabel,
    activeAttemptSource: metadata.attemptSource
  };
}

function normalizeStringList(values) {
  return Array.isArray(values) ? values.map((value) => String(value ?? '').trim()).filter(Boolean) : [];
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

