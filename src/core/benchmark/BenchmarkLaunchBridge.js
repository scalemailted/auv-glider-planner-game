import { EXPERIENCE_MODES } from '../experience/ExperienceMode.js';
import { createBenchmarkEpisodeConfig, createBenchmarkEpisodeState } from './BenchmarkEpisodeContract.js';
import { createBenchmarkModeConfig } from './BenchmarkModeContract.js';
import { BENCHMARK_METADATA_VERSION } from './BenchmarkMetadata.js';

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

export function benchmarkMetadataFromPayload(payload = {}) {
  const config = payload.benchmarkModeConfig ?? payload.episodeConfig?.benchmarkModeConfig ?? createBenchmarkModeConfig({ benchmarkMode: 'plannerBenchmark' });
  return {
    benchmarkMode: config.benchmarkMode,
    benchmarkModeConfigVersion: config.version,
    episodeId: payload.episodeState?.episodeId ?? null,
    informationAccessTier: config.informationAccessTier,
    objectiveAuthority: config.objectiveAuthority,
    routeAuthority: config.routeAuthority,
    fairnessLabel: config.fairnessLabel,
    attemptSource: payload.episodeState?.activeAttemptSource ?? 'manualPlayer',
    worldModelTier: config.worldModelTier,
    metadataVersion: BENCHMARK_METADATA_VERSION
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
