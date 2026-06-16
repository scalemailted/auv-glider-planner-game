import { BENCHMARK_MODE_CONTRACT_VERSION, createBenchmarkModeConfig } from './BenchmarkModeContract.js';
import { createBenchmarkModeState } from './BenchmarkModeState.js';
import { MISSION_OBJECTIVE_TAXONOMY_VERSION } from './MissionObjectiveTaxonomy.js';
import { BENCHMARK_RUN_RECORD_VERSION } from './BenchmarkRunRecord.js';
import { createBenchmarkEpisodeConfig, BENCHMARK_EPISODE_CONTRACT_VERSION } from './BenchmarkEpisodeContract.js';
import {
  BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION,
  createRouteExecutionRecord
} from './BenchmarkRouteExecutionRecord.js';
import { BENCHMARK_ATTEMPT_SET_VERSION, createBenchmarkAttemptSet } from './BenchmarkAttemptRegistry.js';
import {
  ADAPTIVE_MISSION_MANAGER_CONTRACT_VERSION,
  adaptiveMissionManagerSummary,
  createAdaptiveMissionManagerConfig
} from './AdaptiveMissionManagerContract.js';
import {
  ADAPTIVE_MISSION_MANAGER_STATE_VERSION,
  adaptiveMissionManagerStateSummary,
  createAdaptiveMissionManagerState
} from './AdaptiveMissionManagerState.js';
import {
  ADAPTIVE_OBJECTIVE_POLICY_VERSION,
  adaptiveObjectiveTransitionSummary,
  createAdaptiveObjectiveTransitionRecord
} from './AdaptiveObjectivePolicy.js';
import {
  ADAPTIVE_SURFACING_EVENT_VERSION,
  adaptiveSurfacingEventSummary,
  createAdaptiveSurfacingEvent
} from './AdaptiveSurfacingEvent.js';
import { runAdaptiveManagerFixture } from './AdaptiveMissionManagerFixtures.js';
import {
  ADAPTIVE_BENCHMARK_VIEW_MODEL_VERSION,
  adaptiveBenchmarkViewModelSummary,
  buildAdaptiveBenchmarkViewModel
} from './AdaptiveBenchmarkViewModel.js';
import {
  ADAPTIVE_SURFACING_LOOP_VERSION,
  adaptiveSurfacingDecisionSummary,
  runAdaptiveSurfacingDecision
} from './AdaptiveSurfacingLoop.js';
import {
  ADAPTIVE_NEXT_LEG_HANDOFF_VERSION,
  adaptiveNextLegSummary,
  createAdaptiveNextLegConfig
} from './AdaptiveNextLegHandoff.js';
import {
  ADAPTIVE_EPISODE_TRACE_VERSION,
  adaptiveEpisodeTraceSummary,
  createAdaptiveEpisodeTrace
} from './AdaptiveEpisodeTrace.js';
import { createAdaptiveBenchmarkLaunchConfig } from './BenchmarkLaunchBridge.js';

export const BENCHMARK_MODE_CONFIG_EXPORT_TYPE = 'anchor.benchmark.mode-config';
export const BENCHMARK_MODE_CONFIG_EXPORT_VERSION = 'benchmark-mode-config-export-p0';
export const BENCHMARK_EPISODE_CONFIG_EXPORT_TYPE = 'anchor.benchmark.episode-config';
export const BENCHMARK_RUN_RECORD_EXPORT_TYPE = 'anchor.benchmark.run-record';
export const BENCHMARK_ROUTE_EXECUTION_EXPORT_TYPE = 'anchor.benchmark.route-execution';
export const BENCHMARK_ATTEMPT_SET_EXPORT_TYPE = 'anchor.benchmark.attempt-set';
export const BENCHMARK_P1_EXPORT_VERSION = 'benchmark-contract-export-p1';
export const BENCHMARK_ADAPTIVE_EXPORT_VERSION = 'benchmark-adaptive-export-p6';
export const BENCHMARK_ADAPTIVE_MANAGER_CONFIG_EXPORT_TYPE = 'anchor.benchmark.adaptive-manager-config';
export const BENCHMARK_ADAPTIVE_MANAGER_STATE_EXPORT_TYPE = 'anchor.benchmark.adaptive-manager-state';
export const BENCHMARK_ADAPTIVE_OBJECTIVE_TRANSITION_EXPORT_TYPE = 'anchor.benchmark.adaptive-objective-transition';
export const BENCHMARK_ADAPTIVE_SURFACING_EVENT_EXPORT_TYPE = 'anchor.benchmark.adaptive-surfacing-event';
export const BENCHMARK_ADAPTIVE_MANAGER_PREVIEW_EXPORT_TYPE = 'anchor.benchmark.adaptive-manager-preview';
export const BENCHMARK_ADAPTIVE_SURFACING_DECISION_EXPORT_TYPE = 'anchor.benchmark.adaptive-surfacing-decision';
export const BENCHMARK_ADAPTIVE_NEXT_LEG_CONFIG_EXPORT_TYPE = 'anchor.benchmark.adaptive-next-leg-config';
export const BENCHMARK_ADAPTIVE_EPISODE_TRACE_EXPORT_TYPE = 'anchor.benchmark.adaptive-episode-trace';
export const BENCHMARK_ADAPTIVE_LAUNCH_CONFIG_EXPORT_TYPE = 'anchor.benchmark.adaptive-launch-config';

export function buildBenchmarkModeConfigExport(options = {}) {
  const benchmarkModeConfig = createBenchmarkModeConfig(options);
  const state = createBenchmarkModeState(benchmarkModeConfig);
  return {
    type: BENCHMARK_MODE_CONFIG_EXPORT_TYPE,
    version: BENCHMARK_MODE_CONFIG_EXPORT_VERSION,
    benchmarkModeContractVersion: BENCHMARK_MODE_CONTRACT_VERSION,
    benchmarkModeConfig,
    objectiveTaxonomyVersion: MISSION_OBJECTIVE_TAXONOMY_VERSION,
    runRecordVersion: BENCHMARK_RUN_RECORD_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    implemented: benchmarkModeConfig.implemented,
    implementedSystems: state.implementedSystems,
    missingSystems: state.missingSystems,
    nextRequiredSystems: benchmarkModeConfig.nextRequiredSystems,
    visibleLayers: state.visibleLayers,
    exportFlags: state.exportFlags,
    debugFlags: state.debugFlags,
    boundaryFlags: {
      usesRoutePlanning: false,
      usesMissionScoring: false,
      usesMARL: false
    },
    notes: [
      'P0 defines benchmark architecture contracts only.',
      'P2 emits benchmark run, route-execution, and attempt-set records from existing planning, simulation, and debrief data.',
      'P6 adds Adaptive Benchmark mission-manager preview exports without adaptive route execution.',
      'P7 adds an adaptive execution preview loop at surfacing/debrief time without adding a route planner or scoring redesign.',
      'Route planning, mission scoring, and MARL/RL training are not implemented by this export.',
      ...(Array.isArray(options.notes) ? options.notes : [])
    ]
  };
}

export function buildBenchmarkEpisodeConfigExport(options = {}) {
  const episodeConfig = options.type === BENCHMARK_EPISODE_CONFIG_EXPORT_TYPE
    ? options
    : createBenchmarkEpisodeConfig(options);
  return {
    ...cloneJson(episodeConfig),
    exportVersion: BENCHMARK_P1_EXPORT_VERSION,
    episodeContractVersion: BENCHMARK_EPISODE_CONTRACT_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    notes: [
      ...(Array.isArray(episodeConfig.notes) ? episodeConfig.notes : []),
      'P2 episode config follows existing planning/simulation/debrief execution. It does not add a new planner or scoring redesign.'
    ]
  };
}

export function buildBenchmarkRunRecordExport(runRecord = {}, options = {}) {
  return {
    type: BENCHMARK_RUN_RECORD_EXPORT_TYPE,
    version: BENCHMARK_P1_EXPORT_VERSION,
    runRecordVersion: BENCHMARK_RUN_RECORD_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    runRecord: cloneJson(runRecord),
    notes: normalizeNotes(options.notes)
  };
}

export function buildBenchmarkRouteExecutionExport(routeExecutionRecord = {}, options = {}) {
  const record = routeExecutionRecord?.type === BENCHMARK_ROUTE_EXECUTION_EXPORT_TYPE
    ? routeExecutionRecord
    : createRouteExecutionRecord(routeExecutionRecord);
  return {
    ...cloneJson(record),
    exportVersion: BENCHMARK_P1_EXPORT_VERSION,
    routeExecutionRecordVersion: BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString()
  };
}

export function buildBenchmarkAttemptSetExport(attemptSet = {}, options = {}) {
  const set = attemptSet?.type === BENCHMARK_ATTEMPT_SET_EXPORT_TYPE
    ? attemptSet
    : createBenchmarkAttemptSet(attemptSet);
  return {
    ...cloneJson(set),
    exportVersion: BENCHMARK_P1_EXPORT_VERSION,
    attemptSetVersion: BENCHMARK_ATTEMPT_SET_VERSION,
    createdAt: options.createdAt ?? set.createdAt ?? new Date().toISOString()
  };
}

export function buildAdaptiveManagerConfigExport(configOrOptions = {}, options = {}) {
  const config = configOrOptions?.type === BENCHMARK_ADAPTIVE_MANAGER_CONFIG_EXPORT_TYPE
    ? configOrOptions
    : createAdaptiveMissionManagerConfig(configOrOptions);
  return {
    ...cloneJson(config),
    exportVersion: BENCHMARK_ADAPTIVE_EXPORT_VERSION,
    adaptiveManagerContractVersion: ADAPTIVE_MISSION_MANAGER_CONTRACT_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    summary: adaptiveMissionManagerSummary(config),
    boundaryFlags: adaptiveBoundaryFlags(),
    notes: [
      ...(Array.isArray(config.notes) ? config.notes : []),
      'P6 Adaptive Benchmark config gives objective authority to the mission manager and route authority to the player or solver.'
    ]
  };
}

export function buildAdaptiveManagerStateExport(stateOrOptions = {}, options = {}) {
  const state = stateOrOptions?.type === BENCHMARK_ADAPTIVE_MANAGER_STATE_EXPORT_TYPE
    ? stateOrOptions
    : createAdaptiveMissionManagerState(stateOrOptions);
  return {
    ...cloneJson(state),
    exportVersion: BENCHMARK_ADAPTIVE_EXPORT_VERSION,
    adaptiveManagerStateVersion: ADAPTIVE_MISSION_MANAGER_STATE_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    summary: adaptiveMissionManagerStateSummary(state),
    boundaryFlags: adaptiveBoundaryFlags()
  };
}

export function buildAdaptiveObjectiveTransitionExport(transitionOrOptions = {}, options = {}) {
  const transition = transitionOrOptions?.type === BENCHMARK_ADAPTIVE_OBJECTIVE_TRANSITION_EXPORT_TYPE
    ? transitionOrOptions
    : createAdaptiveObjectiveTransitionRecord(transitionOrOptions);
  return {
    ...cloneJson(transition),
    exportVersion: BENCHMARK_ADAPTIVE_EXPORT_VERSION,
    adaptiveObjectivePolicyVersion: ADAPTIVE_OBJECTIVE_POLICY_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    summary: adaptiveObjectiveTransitionSummary(transition),
    boundaryFlags: adaptiveBoundaryFlags()
  };
}

export function buildAdaptiveSurfacingEventExport(eventOrOptions = {}, options = {}) {
  const event = eventOrOptions?.type === BENCHMARK_ADAPTIVE_SURFACING_EVENT_EXPORT_TYPE
    ? eventOrOptions
    : createAdaptiveSurfacingEvent(eventOrOptions);
  return {
    ...cloneJson(event),
    exportVersion: BENCHMARK_ADAPTIVE_EXPORT_VERSION,
    adaptiveSurfacingEventVersion: ADAPTIVE_SURFACING_EVENT_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    summary: adaptiveSurfacingEventSummary(event),
    boundaryFlags: adaptiveBoundaryFlags()
  };
}

export function buildAdaptiveManagerPreviewExport(previewOrOptions = {}, options = {}) {
  const source = previewOrOptions.viewModel || previewOrOptions.managerConfig
    ? previewOrOptions
    : runAdaptiveManagerFixture(previewOrOptions.fixtureId ?? options.fixtureId ?? 'shiftedFrontForecastError', previewOrOptions);
  const viewModel = source.viewModel ?? buildAdaptiveBenchmarkViewModel({
    managerConfig: source.managerConfig,
    managerState: source.managerState,
    evidence: source.evidence,
    diagnosis: source.diagnosis,
    transition: source.transition,
    fixture: source
  });
  return {
    type: BENCHMARK_ADAPTIVE_MANAGER_PREVIEW_EXPORT_TYPE,
    version: BENCHMARK_ADAPTIVE_EXPORT_VERSION,
    adaptiveBenchmarkViewModelVersion: ADAPTIVE_BENCHMARK_VIEW_MODEL_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    benchmarkMode: 'adaptiveBenchmark',
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    fixtureId: source.fixtureId ?? viewModel.fixtureId ?? null,
    managerConfig: cloneJson(source.managerConfig),
    managerState: cloneJson(source.managerState),
    evidence: cloneJson(source.evidence),
    diagnosis: cloneJson(source.diagnosis),
    transition: cloneJson(source.transition),
    viewModel: cloneJson(viewModel),
    summary: adaptiveBenchmarkViewModelSummary(viewModel),
    boundaryFlags: adaptiveBoundaryFlags(),
    usesRoutePlanning: false,
    usesMissionScoring: false,
    usesMARL: false,
    notes: [
      'P6 Adaptive Benchmark preview is contract-first and does not execute adaptive routes.',
      'The mission manager recommends objectives; route planning remains with the player or solver.'
    ]
  };
}

export function buildAdaptiveSurfacingDecisionExport(decisionOrOptions = {}, options = {}) {
  const decision = decisionOrOptions?.type === BENCHMARK_ADAPTIVE_SURFACING_DECISION_EXPORT_TYPE
    ? decisionOrOptions
    : runAdaptiveSurfacingDecision(decisionOrOptions);
  return {
    ...cloneJson(decision),
    exportVersion: 'benchmark-adaptive-export-p7',
    adaptiveSurfacingLoopVersion: ADAPTIVE_SURFACING_LOOP_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    summary: adaptiveSurfacingDecisionSummary(decision),
    boundaryFlags: adaptiveBoundaryFlags(),
    usesExistingSimulation: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
}

export function buildAdaptiveNextLegConfigExport(configOrOptions = {}, options = {}) {
  const config = configOrOptions?.type === BENCHMARK_ADAPTIVE_NEXT_LEG_CONFIG_EXPORT_TYPE
    ? configOrOptions
    : createAdaptiveNextLegConfig(configOrOptions);
  return {
    ...cloneJson(config),
    exportVersion: 'benchmark-adaptive-export-p7',
    adaptiveNextLegHandoffVersion: ADAPTIVE_NEXT_LEG_HANDOFF_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    summary: adaptiveNextLegSummary(config),
    boundaryFlags: adaptiveBoundaryFlags(),
    usesExistingSimulation: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
}

export function buildAdaptiveEpisodeTraceExport(traceOrOptions = {}, options = {}) {
  const trace = traceOrOptions?.type === BENCHMARK_ADAPTIVE_EPISODE_TRACE_EXPORT_TYPE
    ? traceOrOptions
    : createAdaptiveEpisodeTrace(traceOrOptions);
  return {
    ...cloneJson(trace),
    exportVersion: 'benchmark-adaptive-export-p7',
    adaptiveEpisodeTraceVersion: ADAPTIVE_EPISODE_TRACE_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    summary: adaptiveEpisodeTraceSummary(trace),
    boundaryFlags: adaptiveBoundaryFlags(),
    usesExistingSimulation: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
}

export function buildAdaptiveLaunchConfigExport(configOrOptions = {}, options = {}) {
  const config = configOrOptions?.type === BENCHMARK_ADAPTIVE_LAUNCH_CONFIG_EXPORT_TYPE
    ? configOrOptions
    : createAdaptiveBenchmarkLaunchConfig(configOrOptions);
  return {
    ...cloneJson(config),
    exportVersion: 'benchmark-adaptive-export-p7',
    createdAt: options.createdAt ?? new Date().toISOString(),
    boundaryFlags: adaptiveBoundaryFlags(),
    usesExistingSetupPlanningFlow: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
}
export function benchmarkModeConfigFilename(config = {}) {
  const mode = createBenchmarkModeConfig(config).benchmarkMode;
  return `anchor-benchmark-mode-config-${mode}.json`;
}

export function benchmarkEpisodeConfigFilename(config = {}) {
  const mode = createBenchmarkEpisodeConfig(config).benchmarkMode;
  return `anchor-benchmark-episode-${mode}.json`;
}

export function adaptiveBenchmarkExportFilename(kind = 'preview', options = {}) {
  const fixture = options.fixtureId ? `-${sanitizeFilename(options.fixtureId)}` : '';
  return `anchor-adaptive-benchmark-${sanitizeFilename(kind)}${fixture}.json`;
}

function adaptiveBoundaryFlags() {
  return {
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    usesAdaptiveMissionManager: true,
    usesRoutePlanning: false,
    usesMissionScoring: false,
    usesMARL: false,
    usesProductionDataAssimilation: false,
    adaptiveExecutionPreviewAvailable: true,
    adaptiveExecutionImplemented: false
  };
}

function sanitizeFilename(value) {
  return String(value ?? 'export').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'export';
}

function normalizeNotes(notes) {
  return Array.isArray(notes) ? notes.map((note) => String(note ?? '')).filter(Boolean) : [];
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
