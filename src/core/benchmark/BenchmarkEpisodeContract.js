import {
  BENCHMARK_MODE_IDS,
  benchmarkModeById,
  createBenchmarkModeConfig,
  validateBenchmarkModeConfig
} from './BenchmarkModeContract.js';
import { missionObjectiveById } from './MissionObjectiveTaxonomy.js';

export const BENCHMARK_EPISODE_CONTRACT_VERSION = 'benchmark-episode-contract-p1';

export const BENCHMARK_EPISODE_PHASES = [
  'setup',
  'briefing',
  'planning',
  'readyToExecute',
  'executing',
  'debrief',
  'complete',
  'aborted'
];

export const BENCHMARK_ATTEMPT_SOURCE_IDS = [
  'manualPlayer',
  'greedyPlanner',
  'importedSolver',
  'externalSolver',
  'oraclePlanner',
  'benchmarkPlaceholder'
];

export const BENCHMARK_EXECUTION_STATUS_IDS = [
  'notStarted',
  'planning',
  'executable',
  'invalidPlan',
  'executing',
  'completed',
  'failed',
  'aborted',
  'timedOut'
];

export function normalizeBenchmarkAttemptSource(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    manual: 'manualPlayer',
    player: 'manualPlayer',
    manualPlayer: 'manualPlayer',
    temporalGreedy: 'greedyPlanner',
    greedy: 'greedyPlanner',
    greedyPlanner: 'greedyPlanner',
    greedyBaseline: 'greedyPlanner',
    imported: 'importedSolver',
    importedPlan: 'importedSolver',
    importedSolver: 'importedSolver',
    solver: 'importedSolver',
    external: 'externalSolver',
    externalSolver: 'externalSolver',
    solverOrAgent: 'externalSolver',
    oracle: 'oraclePlanner',
    oraclePlanner: 'oraclePlanner',
    placeholder: 'benchmarkPlaceholder',
    benchmarkPlaceholder: 'benchmarkPlaceholder',
    unknown: 'benchmarkPlaceholder'
  };
  return aliases[value] ?? (BENCHMARK_ATTEMPT_SOURCE_IDS.includes(value) ? value : 'benchmarkPlaceholder');
}

export function normalizeBenchmarkExecutionStatus(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    ready: 'executable',
    valid: 'executable',
    invalid: 'invalidPlan',
    complete: 'completed',
    done: 'completed',
    timeout: 'timedOut',
    timedOut: 'timedOut'
  };
  return aliases[value] ?? (BENCHMARK_EXECUTION_STATUS_IDS.includes(value) ? value : 'notStarted');
}

export function createBenchmarkEpisodeConfig(options = {}) {
  const benchmarkModeConfig = createBenchmarkModeConfig(options.benchmarkModeConfig ?? options);
  const objective = normalizeObjective(options.objective ?? options.objectiveId ?? 'reconnaissanceSurvey');
  return {
    type: 'anchor.benchmark.episode-config',
    version: BENCHMARK_EPISODE_CONTRACT_VERSION,
    benchmarkMode: benchmarkModeConfig.benchmarkMode,
    benchmarkModeConfig,
    objective,
    objectiveAuthority: benchmarkModeConfig.objectiveAuthority,
    routeAuthority: benchmarkModeConfig.routeAuthority,
    informationAccessTier: benchmarkModeConfig.informationAccessTier,
    worldModelTier: benchmarkModeConfig.worldModelTier,
    fairnessLabel: benchmarkModeConfig.fairnessLabel,
    scenarioId: stringOrNull(options.scenarioId),
    missionId: stringOrNull(options.missionId),
    levelId: stringOrNull(options.levelId),
    seed: stringOrNull(options.seed),
    allowedAttemptSources: normalizeAttemptSources(options.allowedAttemptSources ?? defaultAttemptSources(benchmarkModeConfig.benchmarkMode)),
    requiredExports: normalizeStringList(options.requiredExports ?? [
      'anchor.benchmark.run-record',
      'anchor.benchmark.route-execution',
      'anchor.benchmark.attempt-set'
    ]),
    notes: normalizeStringList(options.notes)
  };
}

export function createBenchmarkEpisodeState(options = {}) {
  const config = options.episodeConfig ?? createBenchmarkEpisodeConfig(options);
  const now = options.updatedAt ?? options.createdAt ?? new Date().toISOString();
  const phase = normalizeEpisodePhase(options.phase ?? 'setup');
  return {
    episodeId: String(options.episodeId ?? config.episodeId ?? makeEpisodeId(config, now)),
    phase,
    activeAttemptSource: options.activeAttemptSource == null ? null : normalizeBenchmarkAttemptSource(options.activeAttemptSource),
    attempts: Array.isArray(options.attempts) ? options.attempts.map(cloneJson) : [],
    activeObjective: cloneJson(options.activeObjective ?? config.objective ?? null),
    activePlanId: stringOrNull(options.activePlanId),
    activeResultId: stringOrNull(options.activeResultId),
    diagnostics: plainObject(options.diagnostics),
    createdAt: options.createdAt ?? now,
    updatedAt: now
  };
}

export function validateBenchmarkEpisodeConfig(config = {}) {
  const errors = [];
  const warnings = [];
  if (!config || typeof config !== 'object') errors.push('Benchmark episode config must be an object.');
  if (config?.type !== 'anchor.benchmark.episode-config') errors.push('Episode config type must be anchor.benchmark.episode-config.');
  if (config?.version !== BENCHMARK_EPISODE_CONTRACT_VERSION) errors.push(`Episode config version must be ${BENCHMARK_EPISODE_CONTRACT_VERSION}.`);
  if (!BENCHMARK_MODE_IDS.includes(config?.benchmarkMode)) errors.push(`Unknown benchmarkMode: ${config?.benchmarkMode ?? 'missing'}`);
  const modeValidation = validateBenchmarkModeConfig(config?.benchmarkModeConfig ?? {});
  errors.push(...modeValidation.errors.map((error) => `benchmarkModeConfig: ${error}`));
  warnings.push(...modeValidation.warnings);
  if (!config?.objective || typeof config.objective !== 'object') errors.push('Episode config objective must be an object.');
  if (!Array.isArray(config?.allowedAttemptSources) || !config.allowedAttemptSources.length) errors.push('Episode config needs at least one allowedAttemptSource.');
  for (const source of config?.allowedAttemptSources ?? []) {
    if (!BENCHMARK_ATTEMPT_SOURCE_IDS.includes(source)) errors.push(`Unknown allowedAttemptSource: ${source}`);
  }
  if (!Array.isArray(config?.requiredExports)) errors.push('Episode config requiredExports must be an array.');
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function summarizeBenchmarkEpisode(config = {}) {
  const mode = benchmarkModeById(config.benchmarkMode);
  return {
    benchmarkMode: config.benchmarkMode ?? null,
    label: mode.label,
    objective: config.objective?.label ?? config.objective?.id ?? 'N/A',
    objectiveAuthority: config.objectiveAuthority ?? null,
    routeAuthority: config.routeAuthority ?? null,
    informationAccessTier: config.informationAccessTier ?? null,
    worldModelTier: config.worldModelTier ?? null,
    fairnessLabel: config.fairnessLabel ?? null,
    allowedAttemptSources: [...(config.allowedAttemptSources ?? [])],
    requiredExports: [...(config.requiredExports ?? [])],
    executableInP1: config.benchmarkMode === 'plannerBenchmark'
  };
}

function defaultAttemptSources(mode) {
  return {
    plannerBenchmark: ['manualPlayer', 'greedyPlanner', 'importedSolver', 'externalSolver'],
    adaptiveBenchmark: ['manualPlayer', 'importedSolver', 'externalSolver', 'benchmarkPlaceholder'],
    fullAutonomyBenchmark: ['externalSolver', 'oraclePlanner', 'benchmarkPlaceholder']
  }[mode] ?? ['benchmarkPlaceholder'];
}

function normalizeAttemptSources(sources) {
  const values = Array.isArray(sources) ? sources : [sources];
  return [...new Set(values.map(normalizeBenchmarkAttemptSource))];
}

function normalizeObjective(value) {
  if (value && typeof value === 'object') {
    const id = value.id ?? value.objectiveId ?? 'reconnaissanceSurvey';
    const base = missionObjectiveById(id);
    return {
      id: base.id,
      label: value.label ?? base.label,
      description: value.description ?? base.description,
      authority: value.authority ?? null,
      source: value.source ?? 'missionObjectiveTaxonomy',
      fields: Array.isArray(value.fields) ? value.fields.map(String) : [...base.usesFields]
    };
  }
  const base = missionObjectiveById(value);
  return {
    id: base.id,
    label: base.label,
    description: base.description,
    authority: null,
    source: 'missionObjectiveTaxonomy',
    fields: [...base.usesFields]
  };
}

function normalizeEpisodePhase(value) {
  const phase = String(value ?? '').trim();
  return BENCHMARK_EPISODE_PHASES.includes(phase) ? phase : 'setup';
}

function makeEpisodeId(config, now) {
  const safeMode = String(config?.benchmarkMode ?? 'benchmark').replace(/[^a-z0-9_-]/gi, '-');
  const safeTime = String(now ?? Date.now()).replace(/[^0-9a-z]/gi, '').slice(0, 18);
  return `${safeMode}-${safeTime || Date.now()}`;
}

function normalizeStringList(values) {
  return Array.isArray(values) ? values.map((value) => String(value ?? '').trim()).filter(Boolean) : [];
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? cloneJson(value) : {};
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
