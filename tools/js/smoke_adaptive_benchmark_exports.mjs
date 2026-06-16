import assert from 'node:assert/strict';

import {
  BENCHMARK_ADAPTIVE_MANAGER_CONFIG_EXPORT_TYPE,
  BENCHMARK_ADAPTIVE_MANAGER_PREVIEW_EXPORT_TYPE,
  BENCHMARK_ADAPTIVE_EPISODE_TRACE_EXPORT_TYPE,
  BENCHMARK_ADAPTIVE_LAUNCH_CONFIG_EXPORT_TYPE,
  BENCHMARK_ADAPTIVE_MANAGER_STATE_EXPORT_TYPE,
  BENCHMARK_ADAPTIVE_OBJECTIVE_TRANSITION_EXPORT_TYPE,
  BENCHMARK_ADAPTIVE_NEXT_LEG_CONFIG_EXPORT_TYPE,
  BENCHMARK_ADAPTIVE_SURFACING_DECISION_EXPORT_TYPE,
  BENCHMARK_ADAPTIVE_SURFACING_EVENT_EXPORT_TYPE,
  buildAdaptiveManagerConfigExport,
  buildAdaptiveManagerPreviewExport,
  buildAdaptiveEpisodeTraceExport,
  buildAdaptiveLaunchConfigExport,
  buildAdaptiveManagerStateExport,
  buildAdaptiveObjectiveTransitionExport,
  buildAdaptiveNextLegConfigExport,
  buildAdaptiveSurfacingDecisionExport,
  buildAdaptiveSurfacingEventExport,
  buildBenchmarkAttemptSetExport,
  buildBenchmarkEpisodeConfigExport,
  buildBenchmarkModeConfigExport,
  buildBenchmarkRouteExecutionExport,
  buildBenchmarkRunRecordExport
} from '../../src/core/benchmark/BenchmarkModeExporter.js';
import { runAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';

const fixture = runAdaptiveManagerFixture('shiftedFrontForecastError');
const configExport = buildAdaptiveManagerConfigExport(fixture.managerConfig);
assert.equal(configExport.type, BENCHMARK_ADAPTIVE_MANAGER_CONFIG_EXPORT_TYPE, 'manager config export works');
const stateExport = buildAdaptiveManagerStateExport(fixture.managerState);
assert.equal(stateExport.type, BENCHMARK_ADAPTIVE_MANAGER_STATE_EXPORT_TYPE, 'state export works');
const transitionExport = buildAdaptiveObjectiveTransitionExport(fixture.transition);
assert.equal(transitionExport.type, BENCHMARK_ADAPTIVE_OBJECTIVE_TRANSITION_EXPORT_TYPE, 'objective transition export works');
const surfacingExport = buildAdaptiveSurfacingEventExport({ episodeId: fixture.managerState.episodeId, samplesUploaded: 4 });
assert.equal(surfacingExport.type, BENCHMARK_ADAPTIVE_SURFACING_EVENT_EXPORT_TYPE, 'surfacing event export works');
const previewExport = buildAdaptiveManagerPreviewExport(fixture);
assert.equal(previewExport.type, BENCHMARK_ADAPTIVE_MANAGER_PREVIEW_EXPORT_TYPE, 'preview export works');
assert.equal(previewExport.benchmarkMode, 'adaptiveBenchmark', 'preview export mode');
assert.equal(previewExport.objectiveAuthority, 'missionManager', 'preview objective authority');
assert.equal(previewExport.routeAuthority, 'playerOrSolver', 'preview route authority');
assert.equal(previewExport.usesRoutePlanning, false, 'preview excludes route planning');
assert.equal(previewExport.usesMARL, false, 'preview excludes MARL');

const decisionExport = buildAdaptiveSurfacingDecisionExport({
  runtimeContext: { episodeId: fixture.managerState.episodeId, adaptiveManagerConfig: fixture.managerConfig, adaptiveManagerState: fixture.initialState },
  evidence: fixture.evidence,
  managerConfig: fixture.managerConfig,
  managerState: fixture.initialState
});
assert.equal(decisionExport.type, BENCHMARK_ADAPTIVE_SURFACING_DECISION_EXPORT_TYPE, 'surfacing decision export works');
const nextLegExport = buildAdaptiveNextLegConfigExport({ runtimeContext: { episodeId: fixture.managerState.episodeId }, surfacingDecision: decisionExport });
assert.equal(nextLegExport.type, BENCHMARK_ADAPTIVE_NEXT_LEG_CONFIG_EXPORT_TYPE, 'next-leg config export works');
const traceExport = buildAdaptiveEpisodeTraceExport({ episodeId: fixture.managerState.episodeId });
assert.equal(traceExport.type, BENCHMARK_ADAPTIVE_EPISODE_TRACE_EXPORT_TYPE, 'episode trace export works');
const launchExport = buildAdaptiveLaunchConfigExport({ episodeId: fixture.managerState.episodeId, adaptiveManagerConfig: fixture.managerConfig, adaptiveManagerState: fixture.initialState });
assert.equal(launchExport.type, BENCHMARK_ADAPTIVE_LAUNCH_CONFIG_EXPORT_TYPE, 'launch config export works');

assert.equal(buildBenchmarkModeConfigExport({ benchmarkMode: 'plannerBenchmark' }).type, 'anchor.benchmark.mode-config', 'existing mode-config export still works');
assert.equal(buildBenchmarkEpisodeConfigExport({ benchmarkMode: 'plannerBenchmark' }).type, 'anchor.benchmark.episode-config', 'existing episode export still works');
assert.equal(buildBenchmarkRunRecordExport({ runId: 'r1' }).type, 'anchor.benchmark.run-record', 'existing run-record export still works');
assert.equal(buildBenchmarkRouteExecutionExport({ episodeId: 'e1', attemptId: 'a1' }).type, 'anchor.benchmark.route-execution', 'existing route-execution export still works');
assert.equal(buildBenchmarkAttemptSetExport({ episodeId: 'e1' }).type, 'anchor.benchmark.attempt-set', 'existing attempt-set export still works');

console.log('smoke_adaptive_benchmark_exports: ok');
