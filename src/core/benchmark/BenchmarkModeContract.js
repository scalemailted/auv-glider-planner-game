export const BENCHMARK_MODE_CONTRACT_VERSION = 'benchmark-mode-contract-p0';

export const OBJECTIVE_AUTHORITY_IDS = [
  'fixed',
  'missionManager',
  'solverOrAgent'
];

export const ROUTE_AUTHORITY_IDS = [
  'playerOrSolver',
  'solverOrAgent'
];

export const INFORMATION_ACCESS_TIERS = [
  {
    id: 'oracleTruth',
    label: 'Oracle Truth',
    fairnessLabel: 'Oracle / truth-assisted',
    description: 'Solver/player can see hidden truth or oracle fields.',
    debugOnly: false
  },
  {
    id: 'forecastOnly',
    label: 'Forecast Only',
    fairnessLabel: 'Forecast-only',
    description: 'Solver/player sees forecast or expected state only.',
    debugOnly: false
  },
  {
    id: 'beliefOnly',
    label: 'Belief Only',
    fairnessLabel: 'Belief-only',
    description: 'Solver/player sees updated belief and uncertainty but not hidden truth.',
    debugOnly: false
  },
  {
    id: 'debugAll',
    label: 'Debug All',
    fairnessLabel: 'Developer debug view',
    description: 'Developer/debug view only; not a fair benchmark tier.',
    debugOnly: true
  }
];

export const WORLD_MODEL_TIERS = [
  {
    id: 'deterministicOracle',
    label: 'Deterministic Oracle',
    description: 'Known deterministic process, flow, and constraints.'
  },
  {
    id: 'stochasticBelief',
    label: 'Stochastic Belief',
    description: 'Hidden truth, forecast, observations, belief, and uncertainty.'
  },
  {
    id: 'flowCoupledAction',
    label: 'Flow-Coupled Action',
    description: 'A_global science priority plus Q_glider action-value fields.'
  },
  {
    id: 'plannerMission',
    label: 'Planner Mission',
    description: 'Future route execution and scoring tier.'
  }
];

export const BENCHMARK_RUN_PHASES = [
  'setup',
  'objectiveAssigned',
  'observing',
  'planning',
  'acting',
  'evaluating',
  'completed'
];

export const BENCHMARK_MODE_OPTIONS = [
  {
    id: 'plannerBenchmark',
    label: 'Planner Benchmark',
    objectiveAuthority: 'fixed',
    routeAuthority: 'playerOrSolver',
    defaultInformationAccess: 'forecastOnly',
    defaultWorldModelTier: 'flowCoupledAction',
    description: 'Objective is fixed; player/solver chooses the route.',
    implemented: 'partial',
    nextRequiredSystems: ['routeExecutionContract', 'missionEvaluationContract', 'solverPacketContract']
  },
  {
    id: 'adaptiveBenchmark',
    label: 'Adaptive Benchmark',
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    defaultInformationAccess: 'beliefOnly',
    defaultWorldModelTier: 'stochasticBelief',
    description: 'Mission manager updates objectives after observations; player/solver chooses the route.',
    implemented: 'partial',
    nextRequiredSystems: ['objectiveManagerContract', 'observationLoopContract', 'routeExecutionContract']
  },
  {
    id: 'fullAutonomyBenchmark',
    label: 'Full Autonomy Benchmark',
    objectiveAuthority: 'solverOrAgent',
    routeAuthority: 'solverOrAgent',
    defaultInformationAccess: 'beliefOnly',
    defaultWorldModelTier: 'plannerMission',
    description: 'Solver/agent chooses both objectives and route. Placeholder in P0.',
    implemented: false,
    nextRequiredSystems: ['agentObjectiveContract', 'episodeTraceContract', 'missionScoringContract', 'solverTrainingInterface']
  }
];

export const BENCHMARK_MODE_IDS = BENCHMARK_MODE_OPTIONS.map((mode) => mode.id);

export function normalizeBenchmarkModeId(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    planner: 'plannerBenchmark',
    plannerBenchmark: 'plannerBenchmark',
    routeBenchmark: 'plannerBenchmark',
    adaptive: 'adaptiveBenchmark',
    adaptiveBenchmark: 'adaptiveBenchmark',
    missionManager: 'adaptiveBenchmark',
    autonomy: 'fullAutonomyBenchmark',
    fullAutonomy: 'fullAutonomyBenchmark',
    fullAutonomyBenchmark: 'fullAutonomyBenchmark',
    marl: 'fullAutonomyBenchmark'
  };
  return aliases[value] ?? (BENCHMARK_MODE_IDS.includes(value) ? value : 'plannerBenchmark');
}

export function benchmarkModeById(id) {
  const normalized = normalizeBenchmarkModeId(id);
  return BENCHMARK_MODE_OPTIONS.find((mode) => mode.id === normalized) ?? BENCHMARK_MODE_OPTIONS[0];
}

export function benchmarkModeOptions() {
  return BENCHMARK_MODE_OPTIONS.map((mode) => ({ ...mode }));
}

export function informationAccessTierById(id) {
  const value = String(id ?? '').trim();
  return INFORMATION_ACCESS_TIERS.find((tier) => tier.id === value)
    ?? INFORMATION_ACCESS_TIERS.find((tier) => tier.id === 'forecastOnly');
}

export function worldModelTierById(id) {
  const value = String(id ?? '').trim();
  return WORLD_MODEL_TIERS.find((tier) => tier.id === value)
    ?? WORLD_MODEL_TIERS.find((tier) => tier.id === 'flowCoupledAction');
}

export function createBenchmarkModeConfig(options = {}) {
  const requestedMode = String(options.benchmarkMode ?? options.mode ?? '').trim();
  const mode = benchmarkModeById(requestedMode);
  const informationTier = informationAccessTierById(options.informationAccessTier ?? mode.defaultInformationAccess);
  const worldTier = worldModelTierById(options.worldModelTier ?? mode.defaultWorldModelTier);
  return {
    version: BENCHMARK_MODE_CONTRACT_VERSION,
    benchmarkMode: mode.id,
    label: mode.label,
    description: mode.description,
    objectiveAuthority: normalizeObjectiveAuthority(options.objectiveAuthority ?? mode.objectiveAuthority),
    routeAuthority: normalizeRouteAuthority(options.routeAuthority ?? mode.routeAuthority),
    informationAccessTier: informationTier.id,
    worldModelTier: worldTier.id,
    fairnessLabel: informationTier.fairnessLabel,
    implemented: options.implemented ?? mode.implemented,
    prerequisiteSystems: normalizeStringList(options.prerequisiteSystems ?? benchmarkPrerequisites(mode.id)),
    nextRequiredSystems: normalizeStringList(options.nextRequiredSystems ?? mode.nextRequiredSystems),
    notes: normalizeStringList(options.notes)
  };
}

export function validateBenchmarkModeConfig(config = {}) {
  const errors = [];
  const warnings = [];
  if (!config || typeof config !== 'object') errors.push('Benchmark mode config must be an object.');
  if (!BENCHMARK_MODE_IDS.includes(config?.benchmarkMode)) errors.push(`Unknown benchmarkMode: ${config?.benchmarkMode ?? 'missing'}`);
  if (!OBJECTIVE_AUTHORITY_IDS.includes(config?.objectiveAuthority)) errors.push(`Unknown objectiveAuthority: ${config?.objectiveAuthority ?? 'missing'}`);
  if (!ROUTE_AUTHORITY_IDS.includes(config?.routeAuthority)) errors.push(`Unknown routeAuthority: ${config?.routeAuthority ?? 'missing'}`);
  if (!INFORMATION_ACCESS_TIERS.some((tier) => tier.id === config?.informationAccessTier)) errors.push(`Unknown informationAccessTier: ${config?.informationAccessTier ?? 'missing'}`);
  if (!WORLD_MODEL_TIERS.some((tier) => tier.id === config?.worldModelTier)) errors.push(`Unknown worldModelTier: ${config?.worldModelTier ?? 'missing'}`);
  const tier = informationAccessTierById(config?.informationAccessTier);
  if (tier?.debugOnly) warnings.push('debugAll is developer-only and should not be used for fair benchmark comparisons.');
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function benchmarkModeSummary(config = {}) {
  const mode = benchmarkModeById(config.benchmarkMode);
  const informationTier = informationAccessTierById(config.informationAccessTier ?? mode.defaultInformationAccess);
  const worldTier = worldModelTierById(config.worldModelTier ?? mode.defaultWorldModelTier);
  return {
    label: mode.label,
    benchmarkMode: mode.id,
    objectiveAuthority: config.objectiveAuthority ?? mode.objectiveAuthority,
    routeAuthority: config.routeAuthority ?? mode.routeAuthority,
    informationAccessTier: informationTier.id,
    worldModelTier: worldTier.id,
    fairnessLabel: informationTier.fairnessLabel,
    description: mode.description,
    authoritySummary: authoritySummary(config.objectiveAuthority ?? mode.objectiveAuthority, config.routeAuthority ?? mode.routeAuthority),
    worldModelSummary: worldTier.description
  };
}

function normalizeObjectiveAuthority(value) {
  const normalized = String(value ?? '').trim();
  return OBJECTIVE_AUTHORITY_IDS.includes(normalized) ? normalized : 'fixed';
}

function normalizeRouteAuthority(value) {
  const normalized = String(value ?? '').trim();
  return ROUTE_AUTHORITY_IDS.includes(normalized) ? normalized : 'playerOrSolver';
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];
}

function benchmarkPrerequisites(modeId) {
  return {
    plannerBenchmark: ['coupledFieldsDemo', 'samplingPriorityDemo', 'flowCoupledSamplingDemo'],
    adaptiveBenchmark: ['uncertaintyForecastDemo', 'samplingPriorityDemo', 'flowCoupledSamplingDemo'],
    fullAutonomyBenchmark: ['uncertaintyForecastDemo', 'samplingPriorityDemo', 'flowCoupledSamplingDemo', 'futureSolverPacketInterface']
  }[modeId] ?? [];
}

function authoritySummary(objectiveAuthority, routeAuthority) {
  return {
    fixed: 'Objective is fixed/given.',
    missionManager: 'Transparent mission manager chooses or updates objectives.',
    solverOrAgent: 'Solver/agent chooses objectives.'
  }[objectiveAuthority] + ' ' + {
    playerOrSolver: 'Player or solver chooses the route/path.',
    solverOrAgent: 'Solver/agent chooses the route/path.'
  }[routeAuthority];
}
