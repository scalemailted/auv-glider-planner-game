import { createBenchmarkModeConfig, informationAccessTierById } from './BenchmarkModeContract.js';
import { createAdaptiveMissionManagerConfig } from './AdaptiveMissionManagerContract.js';
import { createAdaptiveMissionManagerState, validateAdaptiveMissionManagerState } from './AdaptiveMissionManagerState.js';
import { missionObjectiveById, normalizeMissionObjectiveId } from './MissionObjectiveTaxonomy.js';
import { extractBenchmarkMetadata } from './BenchmarkMetadata.js';

export const ADAPTIVE_BENCHMARK_RUNTIME_VERSION = 'adaptive-benchmark-runtime-p7';

export function createAdaptiveBenchmarkEpisodeId(options = {}) {
  const existing = stringOrNull(options.episodeId ?? options.id ?? options.runtimeContext?.episodeId ?? options.adaptiveManagerState?.episodeId ?? options.managerState?.episodeId ?? options.metadata?.episodeId);
  if (existing) return existing;
  const seed = String(options.seed ?? options.levelId ?? options.missionId ?? options.fixtureId ?? '').replace(/[^a-z0-9_-]/gi, '-').slice(0, 24);
  const createdAt = String(options.createdAt ?? new Date().toISOString()).replace(/[^0-9a-z]/gi, '').slice(0, 18);
  return ['adaptiveBenchmark', seed, createdAt].filter(Boolean).join('-') || `adaptiveBenchmark-${Date.now().toString(36)}`;
}

export function initializeAdaptiveBenchmarkEpisode(options = {}) {
  const existing = options.context ?? options.runtimeContext;
  if (existing?.benchmarkMode === 'adaptiveBenchmark' && !options.force) return normalizeRuntimeContext(existing, options);
  const episodeId = createAdaptiveBenchmarkEpisodeId(options);
  const managerConfig = normalizeAdaptiveManagerConfig(options.adaptiveManagerConfig ?? options.managerConfig ?? options, {
    episodeId,
    informationAccessTier: options.informationAccessTier,
    worldModelTier: options.worldModelTier,
    policyId: options.policyId ?? options.managerPolicyId
  });
  const currentObjectiveId = normalizeMissionObjectiveId(
    options.currentObjectiveId
      ?? options.activeObjectiveId
      ?? options.activeObjective?.id
      ?? options.adaptiveManagerState?.currentObjectiveId
      ?? options.managerState?.currentObjectiveId
      ?? options.objectiveId
      ?? 'reconnaissanceSurvey'
  );
  const managerState = normalizeAdaptiveManagerState(options.adaptiveManagerState ?? options.managerState, {
    episodeId,
    policyId: managerConfig.policyId,
    currentObjectiveId,
    time: options.time,
    status: options.status ?? 'awaitingEvidence'
  });
  const benchmarkModeConfig = createBenchmarkModeConfig({
    ...(options.benchmarkModeConfig ?? {}),
    benchmarkMode: 'adaptiveBenchmark',
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    informationAccessTier: options.informationAccessTier ?? managerConfig.informationAccessTier ?? options.benchmarkModeConfig?.informationAccessTier ?? 'beliefOnly',
    worldModelTier: options.worldModelTier ?? managerConfig.worldModelTier ?? options.benchmarkModeConfig?.worldModelTier ?? 'stochasticBelief',
    notes: [
      'P7 adaptive execution preview uses the existing setup, planning, simulator, and debrief flow.',
      ...(Array.isArray(options.benchmarkModeConfig?.notes) ? options.benchmarkModeConfig.notes : []),
      ...(Array.isArray(options.notes) ? options.notes : [])
    ]
  });
  return normalizeRuntimeContext({
    episodeId,
    benchmarkMode: 'adaptiveBenchmark',
    benchmarkModeConfig,
    adaptiveManagerConfig: managerConfig,
    adaptiveManagerState: managerState,
    activeObjective: options.activeObjective ?? missionObjectiveById(managerState.currentObjectiveId),
    informationAccessTier: benchmarkModeConfig.informationAccessTier,
    worldModelTier: benchmarkModeConfig.worldModelTier,
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    fairnessLabel: options.fairnessLabel ?? benchmarkModeConfig.fairnessLabel ?? informationAccessTierById(benchmarkModeConfig.informationAccessTier).fairnessLabel,
    activeLegIndex: options.activeLegIndex ?? options.legIndex ?? 0,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
    notes: options.notes
  }, options);
}

export function deriveAdaptiveBenchmarkEpisodeFromConfig(config = {}, options = {}) {
  const source = config?.type === 'anchor.benchmark.adaptive-launch-config'
    ? config.runtimeContext ?? config
    : config;
  return initializeAdaptiveBenchmarkEpisode({
    ...options,
    ...source,
    benchmarkModeConfig: source.benchmarkModeConfig ?? config.benchmarkModeConfig ?? config,
    adaptiveManagerConfig: source.adaptiveManagerConfig ?? config.adaptiveManagerConfig,
    adaptiveManagerState: source.adaptiveManagerState ?? source.managerState ?? config.adaptiveManagerState,
    episodeId: source.episodeId ?? config.episodeId ?? options.episodeId,
    activeLegIndex: source.activeLegIndex ?? source.legIndex ?? options.activeLegIndex
  });
}

export function deriveAdaptiveBenchmarkContextFromState(state = {}) {
  if (!state || typeof state !== 'object') return null;
  if (state.adaptiveBenchmarkRuntimeContext?.benchmarkMode === 'adaptiveBenchmark') {
    return initializeAdaptiveBenchmarkEpisode({ context: state.adaptiveBenchmarkRuntimeContext });
  }
  if (state.benchmarkRuntimeContext?.benchmarkMode === 'adaptiveBenchmark') {
    return initializeAdaptiveBenchmarkEpisode({ context: state.benchmarkRuntimeContext });
  }
  const pending = state.pendingBenchmarkEpisode ?? state.pendingAdaptiveBenchmarkLaunch;
  if (pending?.benchmarkModeConfig?.benchmarkMode === 'adaptiveBenchmark') {
    return initializeAdaptiveBenchmarkEpisode({
      benchmarkModeConfig: pending.benchmarkModeConfig,
      adaptiveManagerConfig: pending.adaptiveManagerConfig,
      adaptiveManagerState: pending.adaptiveManagerState,
      activeObjective: pending.activeObjective,
      activeLegIndex: pending.legIndex ?? pending.activeLegIndex,
      episodeId: pending.episodeState?.episodeId ?? pending.episodeId,
      notes: pending.notes
    });
  }
  const metadata = extractBenchmarkMetadata(state.result)
    ?? extractBenchmarkMetadata(state.plan)
    ?? extractBenchmarkMetadata(state.mission)
    ?? extractBenchmarkMetadata(state.level)
    ?? state.currentScenario?.benchmarkMetadata
    ?? null;
  const adaptiveMetadata = state.result?.adaptiveBenchmark
    ?? state.plan?.meta?.adaptiveBenchmark
    ?? state.mission?.meta?.adaptiveBenchmark
    ?? state.level?.meta?.adaptiveBenchmark
    ?? state.currentScenario?.adaptiveBenchmark
    ?? null;
  if (metadata?.benchmarkMode !== 'adaptiveBenchmark' && !adaptiveMetadata) return null;
  return initializeAdaptiveBenchmarkEpisode({
    metadata,
    benchmarkModeConfig: state.benchmarkModeConfig ?? metadata ?? { benchmarkMode: 'adaptiveBenchmark' },
    adaptiveManagerConfig: state.adaptiveManagerConfig ?? adaptiveMetadata?.adaptiveManagerConfig ?? adaptiveMetadata?.managerConfig,
    adaptiveManagerState: state.adaptiveManagerState ?? adaptiveMetadata?.adaptiveManagerState ?? adaptiveMetadata?.managerState,
    activeObjective: adaptiveMetadata?.activeObjective,
    activeLegIndex: adaptiveMetadata?.activeLegIndex ?? adaptiveMetadata?.legIndex ?? state.benchmarkEpisode?.activeLegIndex ?? 0,
    episodeId: metadata?.episodeId ?? adaptiveMetadata?.episodeId ?? state.benchmarkEpisode?.episodeId,
    levelId: state.level?.levelId,
    missionId: state.mission?.missionId ?? state.mission?.id
  });
}

export function validateAdaptiveBenchmarkRuntimeContext(context = {}) {
  const errors = [];
  const warnings = [];
  if (!context || typeof context !== 'object') errors.push('Adaptive benchmark runtime context must be an object.');
  if (context?.benchmarkMode !== 'adaptiveBenchmark') errors.push('benchmarkMode must be adaptiveBenchmark.');
  if (!stringOrNull(context?.episodeId)) errors.push('episodeId is required.');
  if (context?.objectiveAuthority !== 'missionManager') errors.push('objectiveAuthority must be missionManager.');
  if (context?.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (!context?.adaptiveManagerConfig) errors.push('adaptiveManagerConfig is required.');
  if (!context?.adaptiveManagerState) errors.push('adaptiveManagerState is required.');
  if (!Number.isFinite(Number(context?.activeLegIndex))) errors.push('activeLegIndex must be finite.');
  const stateValidation = validateAdaptiveMissionManagerState(context?.adaptiveManagerState ?? {});
  if (!stateValidation.valid) warnings.push(...stateValidation.errors.map((message) => `adaptiveManagerState: ${message}`));
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function adaptiveBenchmarkRuntimeSummary(contextInput = {}) {
  const context = initializeAdaptiveBenchmarkEpisode({ context: contextInput });
  const validation = validateAdaptiveBenchmarkRuntimeContext(context);
  return {
    version: context.version,
    episodeId: context.episodeId,
    benchmarkMode: context.benchmarkMode,
    policyId: context.adaptiveManagerConfig?.policyId,
    activeObjectiveId: context.activeObjective?.id ?? context.adaptiveManagerState?.currentObjectiveId,
    activeLegIndex: context.activeLegIndex,
    informationAccessTier: context.informationAccessTier,
    worldModelTier: context.worldModelTier,
    objectiveAuthority: context.objectiveAuthority,
    routeAuthority: context.routeAuthority,
    fairnessLabel: context.fairnessLabel,
    valid: validation.valid,
    status: validation.status,
    boundarySummary: 'Mission manager recommends the objective; the player or solver still plans the route.'
  };
}

function normalizeRuntimeContext(context = {}, fallback = {}) {
  const episodeId = createAdaptiveBenchmarkEpisodeId({ ...fallback, ...context });
  const benchmarkModeConfig = createBenchmarkModeConfig({
    ...(context.benchmarkModeConfig ?? fallback.benchmarkModeConfig ?? context),
    benchmarkMode: 'adaptiveBenchmark',
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver'
  });
  const adaptiveManagerConfig = normalizeAdaptiveManagerConfig(context.adaptiveManagerConfig ?? fallback.adaptiveManagerConfig ?? context.managerConfig, {
    episodeId,
    informationAccessTier: benchmarkModeConfig.informationAccessTier,
    worldModelTier: benchmarkModeConfig.worldModelTier,
    policyId: context.policyId ?? fallback.policyId
  });
  const adaptiveManagerState = normalizeAdaptiveManagerState(context.adaptiveManagerState ?? fallback.adaptiveManagerState ?? context.managerState, {
    episodeId,
    policyId: adaptiveManagerConfig.policyId,
    currentObjectiveId: context.currentObjectiveId ?? context.activeObjectiveId ?? context.activeObjective?.id ?? fallback.currentObjectiveId ?? 'reconnaissanceSurvey',
    status: context.status ?? fallback.status
  });
  const activeObjectiveId = normalizeMissionObjectiveId(context.activeObjective?.id ?? context.activeObjectiveId ?? adaptiveManagerState.currentObjectiveId);
  const createdAt = context.createdAt ?? fallback.createdAt ?? new Date().toISOString();
  return {
    type: 'anchor.benchmark.adaptive-runtime-context',
    version: ADAPTIVE_BENCHMARK_RUNTIME_VERSION,
    episodeId,
    benchmarkMode: 'adaptiveBenchmark',
    benchmarkModeConfig,
    adaptiveManagerConfig,
    adaptiveManagerState,
    activeObjective: missionObjectiveById(activeObjectiveId),
    informationAccessTier: context.informationAccessTier ?? benchmarkModeConfig.informationAccessTier,
    worldModelTier: context.worldModelTier ?? benchmarkModeConfig.worldModelTier,
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    fairnessLabel: context.fairnessLabel ?? fallback.fairnessLabel ?? benchmarkModeConfig.fairnessLabel ?? informationAccessTierById(benchmarkModeConfig.informationAccessTier).fairnessLabel,
    activeLegIndex: Math.max(0, Math.round(finiteNumber(context.activeLegIndex ?? context.legIndex ?? fallback.activeLegIndex, 0))),
    createdAt,
    updatedAt: context.updatedAt ?? fallback.updatedAt ?? createdAt,
    notes: normalizeStringList(context.notes ?? fallback.notes)
  };
}

function normalizeAdaptiveManagerConfig(value, fallback = {}) {
  if (value?.type === 'anchor.benchmark.adaptive-manager-config') return cloneJson(value);
  return createAdaptiveMissionManagerConfig({ ...fallback, ...(value ?? {}) });
}

function normalizeAdaptiveManagerState(value, fallback = {}) {
  if (value?.type === 'anchor.benchmark.adaptive-manager-state') return createAdaptiveMissionManagerState({ ...cloneJson(value), episodeId: value.episodeId ?? fallback.episodeId });
  return createAdaptiveMissionManagerState({ ...fallback, ...(value ?? {}) });
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeStringList(values) {
  return Array.isArray(values) ? values.map((value) => String(value ?? '').trim()).filter(Boolean) : [];
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
