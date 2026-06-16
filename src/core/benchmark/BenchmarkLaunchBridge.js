import { EXPERIENCE_MODES } from '../experience/ExperienceMode.js';
import { createBenchmarkEpisodeConfig, createBenchmarkEpisodeState } from './BenchmarkEpisodeContract.js';
import { createBenchmarkModeConfig } from './BenchmarkModeContract.js';
import { BENCHMARK_METADATA_VERSION } from './BenchmarkMetadata.js';
import { initializeAdaptiveBenchmarkEpisode } from './AdaptiveBenchmarkRuntime.js';

export function createPlannerBenchmarkSetupPayload(options = {}) {
  const benchmarkModeConfig = createBenchmarkModeConfig({
    benchmarkMode: 'plannerBenchmark',
    informationAccessTier: options.informationAccessTier ?? 'forecastOnly',
    worldModelTier: options.worldModelTier ?? 'flowCoupledAction',
    notes: ['Planner Benchmark P2 setup payload.']
  });
  const episodeConfig = createBenchmarkEpisodeConfig({
    benchmarkModeConfig,
    objective: options.objective,
    seed: options.seed,
    notes: ['P2 uses the existing planning workspace, simulator, and debrief to emit benchmark records.']
  });
  const episodeState = createBenchmarkEpisodeState({
    episodeConfig,
    phase: 'briefing',
    activeAttemptSource: 'manualPlayer'
  });
  return { benchmarkModeConfig, episodeConfig, episodeState };
}

export function createAdaptiveBenchmarkLaunchConfig(options = {}) {
  const runtimeContext = initializeAdaptiveBenchmarkEpisode(options.runtimeContext ?? options);
  return {
    type: 'anchor.benchmark.adaptive-launch-config',
    version: 'adaptive-launch-config-p7',
    episodeId: runtimeContext.episodeId,
    benchmarkMode: 'adaptiveBenchmark',
    benchmarkModeConfig: cloneJson(runtimeContext.benchmarkModeConfig),
    adaptiveManagerConfig: cloneJson(runtimeContext.adaptiveManagerConfig),
    adaptiveManagerState: cloneJson(runtimeContext.adaptiveManagerState),
    activeObjective: cloneJson(runtimeContext.activeObjective),
    activeLegIndex: runtimeContext.activeLegIndex,
    informationAccessTier: runtimeContext.informationAccessTier,
    worldModelTier: runtimeContext.worldModelTier,
    fairnessLabel: runtimeContext.fairnessLabel,
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    runtimeContext: cloneJson(runtimeContext),
    notes: [
      'Adaptive Benchmark P7 launch config opens the existing setup/planning flow for one leg.',
      'The mission manager recommends the objective. The player or solver still plans the route.',
      'No route planner, scoring redesign, or MARL/RL is added by this launch config.',
      ...(Array.isArray(options.notes) ? options.notes : [])
    ]
  };
}

export function createAdaptiveBenchmarkSetupPayload(options = {}) {
  const launchConfig = options.type === 'anchor.benchmark.adaptive-launch-config'
    ? cloneJson(options)
    : createAdaptiveBenchmarkLaunchConfig(options);
  const runtimeContext = initializeAdaptiveBenchmarkEpisode({ context: launchConfig.runtimeContext });
  const episodeConfig = createBenchmarkEpisodeConfig({
    benchmarkModeConfig: runtimeContext.benchmarkModeConfig,
    objective: runtimeContext.activeObjective,
    seed: options.seed,
    notes: ['P7 adaptive benchmark setup uses the existing mission briefing, planning workspace, simulator, and debrief.']
  });
  const episodeState = createBenchmarkEpisodeState({
    episodeConfig,
    episodeId: runtimeContext.episodeId,
    phase: 'briefing',
    activeAttemptSource: 'manualPlayer'
  });
  return {
    type: 'anchor.benchmark.adaptive-setup-payload',
    version: 'adaptive-setup-payload-p7',
    benchmarkModeConfig: runtimeContext.benchmarkModeConfig,
    episodeConfig,
    episodeState: {
      ...episodeState,
      activeLegIndex: runtimeContext.activeLegIndex,
      activeObjective: cloneJson(runtimeContext.activeObjective),
      adaptiveManagerState: cloneJson(runtimeContext.adaptiveManagerState)
    },
    adaptiveManagerConfig: cloneJson(runtimeContext.adaptiveManagerConfig),
    adaptiveManagerState: cloneJson(runtimeContext.adaptiveManagerState),
    adaptiveRuntimeContext: cloneJson(runtimeContext),
    activeObjective: cloneJson(runtimeContext.activeObjective),
    legIndex: runtimeContext.activeLegIndex,
    launchConfig
  };
}

export function isAdaptiveBenchmarkLaunchPayload(payload) {
  return Boolean(payload && typeof payload === 'object' && (
    payload.type === 'anchor.benchmark.adaptive-launch-config'
      || payload.type === 'anchor.benchmark.adaptive-setup-payload'
      || payload.benchmarkModeConfig?.benchmarkMode === 'adaptiveBenchmark'
      || payload.adaptiveRuntimeContext?.benchmarkMode === 'adaptiveBenchmark'
  ));
}

export function openPlannerBenchmarkSetup({ app, scene, benchmarkModeConfig, episodeConfig, episodeState } = {}) {
  if (!app) return { launched: false, reason: 'missing-app' };
  const payload = episodeConfig && episodeState
    ? { benchmarkModeConfig: benchmarkModeConfig ?? episodeConfig.benchmarkModeConfig, episodeConfig, episodeState }
    : createPlannerBenchmarkSetupPayload({ benchmarkModeConfig });
  app.state.pendingBenchmarkEpisode = cloneJson(payload);
  app.state.benchmarkModeConfig = cloneJson(payload.benchmarkModeConfig);
  app.state.benchmarkEpisode = cloneJson(payload.episodeState);
  const mainMenuScene = scene?.scene?.get?.('MainMenuScene') ?? app.phaser?.scene?.getScene?.('MainMenuScene');
  if (typeof mainMenuScene?.openChallengeSetup === 'function') {
    mainMenuScene.openChallengeSetup('perfectKnowledge', EXPERIENCE_MODES.simulationLab);
    app.state.pendingBenchmarkEpisode = cloneJson(payload);
    app.state.benchmarkModeConfig = cloneJson(payload.benchmarkModeConfig);
    app.state.benchmarkEpisode = cloneJson(payload.episodeState);
    app.state.currentScenario ??= {};
    app.state.currentScenario.source = 'plannerBenchmarkSetup';
    app.state.currentScenario.benchmarkMetadata = benchmarkMetadataFromPayload(payload);
    return { launched: true, scene: 'MissionBriefingScene', payload };
  }
  return { launched: false, reason: 'setup-entry-not-available', payload };
}

export function openAdaptiveBenchmarkSetup({ app, scene, runtimeContext, adaptiveManagerConfig, adaptiveManagerState, benchmarkModeConfig, activeObjective, legIndex } = {}) {
  if (!app) return { launched: false, reason: 'missing-app' };
  const payload = createAdaptiveBenchmarkSetupPayload({ runtimeContext, adaptiveManagerConfig, adaptiveManagerState, benchmarkModeConfig, activeObjective, activeLegIndex: legIndex });
  app.state.pendingBenchmarkEpisode = cloneJson(payload);
  app.state.benchmarkModeConfig = cloneJson(payload.benchmarkModeConfig);
  app.state.benchmarkEpisode = cloneJson(payload.episodeState);
  app.state.adaptiveBenchmarkRuntimeContext = cloneJson(payload.adaptiveRuntimeContext);
  app.state.adaptiveManagerConfig = cloneJson(payload.adaptiveManagerConfig);
  app.state.adaptiveManagerState = cloneJson(payload.adaptiveManagerState);
  const mainMenuScene = scene?.scene?.get?.('MainMenuScene') ?? app.phaser?.scene?.getScene?.('MainMenuScene');
  if (typeof mainMenuScene?.openChallengeSetup === 'function') {
    mainMenuScene.openChallengeSetup('forecast', EXPERIENCE_MODES.simulationLab);
    app.state.pendingBenchmarkEpisode = cloneJson(payload);
    app.state.benchmarkModeConfig = cloneJson(payload.benchmarkModeConfig);
    app.state.benchmarkEpisode = cloneJson(payload.episodeState);
    app.state.adaptiveBenchmarkRuntimeContext = cloneJson(payload.adaptiveRuntimeContext);
    app.state.adaptiveManagerConfig = cloneJson(payload.adaptiveManagerConfig);
    app.state.adaptiveManagerState = cloneJson(payload.adaptiveManagerState);
    app.state.currentScenario ??= {};
    app.state.currentScenario.source = 'adaptiveBenchmarkSetup';
    app.state.currentScenario.benchmarkMetadata = benchmarkMetadataFromPayload(payload);
    app.state.currentScenario.adaptiveBenchmark = adaptiveMetadataFromPayload(payload);
    return { launched: true, scene: 'MissionBriefingScene', payload };
  }
  return { launched: false, reason: 'setup-entry-not-available', payload };
}

export function benchmarkMetadataFromPayload(payload = {}) {
  const config = payload.benchmarkModeConfig ?? payload.episodeConfig?.benchmarkModeConfig ?? createBenchmarkModeConfig({ benchmarkMode: 'plannerBenchmark' });
  return {
    benchmarkMode: config.benchmarkMode,
    benchmarkModeConfigVersion: config.version,
    episodeId: payload.episodeState?.episodeId ?? payload.episodeId ?? null,
    informationAccessTier: config.informationAccessTier,
    objectiveAuthority: config.objectiveAuthority,
    routeAuthority: config.routeAuthority,
    fairnessLabel: config.fairnessLabel,
    attemptSource: payload.episodeState?.activeAttemptSource ?? 'manualPlayer',
    worldModelTier: config.worldModelTier,
    activeObjectiveId: payload.activeObjective?.id ?? payload.adaptiveManagerState?.currentObjectiveId ?? null,
    activeLegIndex: payload.legIndex ?? payload.episodeState?.activeLegIndex ?? 0,
    metadataVersion: BENCHMARK_METADATA_VERSION
  };
}

export function adaptiveMetadataFromPayload(payload = {}) {
  return {
    benchmarkMode: 'adaptiveBenchmark',
    episodeId: payload.episodeState?.episodeId ?? payload.episodeId ?? null,
    activeLegIndex: payload.legIndex ?? payload.episodeState?.activeLegIndex ?? 0,
    activeObjective: cloneJson(payload.activeObjective ?? payload.episodeState?.activeObjective ?? null),
    adaptiveManagerConfig: cloneJson(payload.adaptiveManagerConfig ?? null),
    adaptiveManagerState: cloneJson(payload.adaptiveManagerState ?? null),
    runtimeContext: cloneJson(payload.adaptiveRuntimeContext ?? null),
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    notes: ['Adaptive metadata is preserved for P7 surfacing/debrief review.']
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
