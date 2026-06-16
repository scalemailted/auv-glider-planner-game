import {
  benchmarkModeById,
  createBenchmarkModeConfig,
  informationAccessTierById,
  worldModelTierById
} from './BenchmarkModeContract.js';

export function createBenchmarkModeState(config = {}) {
  const normalized = createBenchmarkModeConfig(config);
  return {
    config: normalized,
    summary: {
      label: benchmarkModeById(normalized.benchmarkMode).label,
      description: normalized.description,
      informationAccess: informationAccessTierById(normalized.informationAccessTier),
      worldModel: worldModelTierById(normalized.worldModelTier)
    },
    visibleLayers: benchmarkModeVisibleLayers(normalized),
    exportFlags: benchmarkModeExportFlags(normalized),
    debugFlags: benchmarkModeDebugFlags(normalized),
    implementedSystems: implementedSystems(normalized),
    missingSystems: missingSystems(normalized)
  };
}

export function deriveBenchmarkModeStateFromDemo(demoState = {}) {
  const benchmarkMode = demoState.benchmarkMode
    ?? (demoState.flowCoupledSamplingModel ? 'plannerBenchmark' : null)
    ?? (demoState.uncertaintyModel ? 'adaptiveBenchmark' : null)
    ?? 'plannerBenchmark';
  return createBenchmarkModeState({
    benchmarkMode,
    informationAccessTier: demoState.informationAccessTier,
    worldModelTier: demoState.worldModelTier,
    notes: ['Derived from existing demo state for P0 architecture skeleton.']
  });
}

export function benchmarkModeVisibleLayers(config = {}) {
  const mode = config.benchmarkMode ?? createBenchmarkModeConfig(config).benchmarkMode;
  return {
    plannerBenchmark: [
      'deterministicCoupledOracleObjective',
      'samplingPriorityMap',
      'flowCoupledActionValue',
      'flowField',
      'routePathFuture'
    ],
    adaptiveBenchmark: [
      'forecast',
      'belief',
      'uncertainty',
      'observations',
      'samplingPriorityMap',
      'flowCoupledActionValue'
    ],
    fullAutonomyBenchmark: [
      'solverPacketViewFuture',
      'episodeTrace',
      'observationActionRewardLoop',
      'policyDebugFuture'
    ]
  }[mode] ?? [];
}

export function benchmarkModeExportFlags(config = {}) {
  const mode = config.benchmarkMode ?? createBenchmarkModeConfig(config).benchmarkMode;
  return {
    benchmarkModeConfig: true,
    runRecordSkeleton: true,
    episodeTraceSkeleton: mode === 'fullAutonomyBenchmark',
    solverPacketFuture: mode === 'fullAutonomyBenchmark',
    routePlanFuture: true,
    missionScoringFuture: true
  };
}

export function benchmarkModeDebugFlags(config = {}) {
  const normalized = createBenchmarkModeConfig(config);
  return {
    version: normalized.version,
    benchmarkMode: normalized.benchmarkMode,
    objectiveAuthority: normalized.objectiveAuthority,
    routeAuthority: normalized.routeAuthority,
    informationAccessTier: normalized.informationAccessTier,
    worldModelTier: normalized.worldModelTier,
    fairnessLabel: normalized.fairnessLabel,
    usesRoutePlanning: false,
    usesMissionScoring: false,
    usesMARL: false
  };
}

function implementedSystems(config) {
  return [
    'benchmarkModeContract',
    'benchmarkRunRecordSchema',
    'missionObjectiveTaxonomy',
    'benchmarkModeConfigExport',
    'benchmarkOverviewUi',
    ...(config.prerequisiteSystems ?? [])
  ];
}

function missingSystems(config) {
  return [
    ...(config.nextRequiredSystems ?? []),
    'fullRoutePlanning',
    'missionScoring',
    'MARLTraining'
  ];
}
