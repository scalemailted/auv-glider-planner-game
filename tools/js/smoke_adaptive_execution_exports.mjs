import assert from 'node:assert/strict';

import {
  buildAdaptiveEpisodeSessionExport,
  buildAdaptiveEpisodeTraceExport,
  buildAdaptiveLaunchConfigExport,
  buildAdaptiveLegRecordExport,
  buildAdaptiveManagerConfigExport,
  buildAdaptiveManagerPreviewExport,
  buildAdaptiveManagerStateExport,
  buildAdaptiveNextLegConfigExport,
  buildAdaptiveObjectiveHistoryExport,
  buildAdaptiveObjectiveTransitionExport,
  buildAdaptiveSessionSummaryExport,
  buildAdaptiveSurfacingDecisionExport,
  buildAdaptiveSurfacingEventExport,
  buildBenchmarkAttemptSetExport,
  buildBenchmarkRunRecordExport
} from '../../src/core/benchmark/BenchmarkModeExporter.js';
import { initializeAdaptiveBenchmarkEpisode } from '../../src/core/benchmark/AdaptiveBenchmarkRuntime.js';
import { createAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';
import { runAdaptiveSurfacingDecision } from '../../src/core/benchmark/AdaptiveSurfacingLoop.js';
import { createAdaptiveNextLegConfig } from '../../src/core/benchmark/AdaptiveNextLegHandoff.js';
import { appendAdaptiveSurfacingDecision, createAdaptiveEpisodeTrace } from '../../src/core/benchmark/AdaptiveEpisodeTrace.js';
import { createAdaptiveEpisodeSession } from '../../src/core/benchmark/AdaptiveEpisodeSession.js';
import { createAdaptiveLegRecord } from '../../src/core/benchmark/AdaptiveLegRecord.js';
import { buildAdaptiveObjectiveHistoryViewModel } from '../../src/core/benchmark/AdaptiveObjectiveHistoryViewModel.js';

const fixture = createAdaptiveManagerFixture('possibleHiddenPlume', { episodeId: 'adaptive-export' });
const runtimeContext = initializeAdaptiveBenchmarkEpisode({ episodeId: 'adaptive-export', adaptiveManagerConfig: fixture.managerConfig, adaptiveManagerState: fixture.initialState });
const decision = runAdaptiveSurfacingDecision({ runtimeContext, evidence: fixture.evidence, managerConfig: fixture.managerConfig, managerState: fixture.initialState });
const handoff = createAdaptiveNextLegConfig({ runtimeContext, surfacingDecision: decision });
const trace = appendAdaptiveSurfacingDecision(createAdaptiveEpisodeTrace({ runtimeContext }), decision);
const session = createAdaptiveEpisodeSession({ runtimeContext });
const legRecord = createAdaptiveLegRecord({ runtimeContext, legIndex: 0, objectiveId: runtimeContext.activeObjective.id });
const historyVm = buildAdaptiveObjectiveHistoryViewModel({ session });

assert.equal(buildAdaptiveSurfacingDecisionExport(decision).type, 'anchor.benchmark.adaptive-surfacing-decision');
assert.equal(buildAdaptiveNextLegConfigExport(handoff).type, 'anchor.benchmark.adaptive-next-leg-config');
assert.equal(buildAdaptiveEpisodeTraceExport(trace).type, 'anchor.benchmark.adaptive-episode-trace');
assert.equal(buildAdaptiveLaunchConfigExport({ runtimeContext }).type, 'anchor.benchmark.adaptive-launch-config');
assert.equal(buildAdaptiveEpisodeSessionExport(session).type, 'anchor.benchmark.adaptive-episode-session');
assert.equal(buildAdaptiveObjectiveHistoryExport(historyVm).type, 'anchor.benchmark.adaptive-objective-history');
assert.equal(buildAdaptiveLegRecordExport(legRecord).type, 'anchor.benchmark.adaptive-leg-record');
assert.equal(buildAdaptiveSessionSummaryExport(session).type, 'anchor.benchmark.adaptive-session-summary');
assert.equal(buildAdaptiveManagerConfigExport(fixture.managerConfig).type, 'anchor.benchmark.adaptive-manager-config');
assert.equal(buildAdaptiveManagerStateExport(fixture.managerState).type, 'anchor.benchmark.adaptive-manager-state');
assert.equal(buildAdaptiveObjectiveTransitionExport(fixture.transition).type, 'anchor.benchmark.adaptive-objective-transition');
assert.equal(buildAdaptiveSurfacingEventExport({ episodeId: 'adaptive-export' }).type, 'anchor.benchmark.adaptive-surfacing-event');
assert.equal(buildAdaptiveManagerPreviewExport(fixture).type, 'anchor.benchmark.adaptive-manager-preview');
assert.equal(buildBenchmarkRunRecordExport({ runId: 'r1' }).type, 'anchor.benchmark.run-record');
assert.equal(buildBenchmarkAttemptSetExport({ episodeId: 'e1' }).type, 'anchor.benchmark.attempt-set');
assert.equal(buildAdaptiveSurfacingDecisionExport(decision).usesMARL, false);
assert.equal(buildAdaptiveNextLegConfigExport(handoff).usesNewPlanner, false);

console.log('smoke_adaptive_execution_exports: ok');
