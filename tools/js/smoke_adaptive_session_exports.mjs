import assert from 'node:assert/strict';
import { createAdaptiveEpisodeSession } from '../../src/core/benchmark/AdaptiveEpisodeSession.js';
import { createAdaptiveLegRecord } from '../../src/core/benchmark/AdaptiveLegRecord.js';
import {
  buildAdaptiveEpisodeSessionExport,
  buildAdaptiveLegRecordExport,
  buildAdaptiveManagerConfigExport,
  buildAdaptiveManagerPreviewExport,
  buildAdaptiveNextLegConfigExport,
  buildAdaptiveObjectiveHistoryExport,
  buildAdaptiveSessionSummaryExport,
  buildAdaptiveSurfacingDecisionExport,
  buildBenchmarkModeConfigExport
} from '../../src/core/benchmark/BenchmarkModeExporter.js';
import { buildAdaptiveObjectiveHistoryViewModel } from '../../src/core/benchmark/AdaptiveObjectiveHistoryViewModel.js';

const session = createAdaptiveEpisodeSession({ episodeId: 'episode-p8-export', currentObjectiveId: 'reconnaissanceSurvey' });
const leg = createAdaptiveLegRecord({ episodeId: session.episodeId, legIndex: 0, objectiveId: 'reconnaissanceSurvey', metrics: { finalScore: 1 } });
const vm = buildAdaptiveObjectiveHistoryViewModel({ session });
assert.equal(buildAdaptiveEpisodeSessionExport(session).type, 'anchor.benchmark.adaptive-episode-session');
assert.equal(buildAdaptiveObjectiveHistoryExport(vm).type, 'anchor.benchmark.adaptive-objective-history');
assert.equal(buildAdaptiveLegRecordExport(leg).type, 'anchor.benchmark.adaptive-leg-record');
assert.equal(buildAdaptiveSessionSummaryExport(session).type, 'anchor.benchmark.adaptive-session-summary');
assert.equal(buildAdaptiveManagerConfigExport({ episodeId: session.episodeId }).type, 'anchor.benchmark.adaptive-manager-config');
assert.equal(buildAdaptiveManagerPreviewExport({ fixtureId: 'possibleHiddenPlume' }).type, 'anchor.benchmark.adaptive-manager-preview');
assert.equal(buildAdaptiveSurfacingDecisionExport({ runtimeContext: { episodeId: session.episodeId }, evidence: {}, surfacingEvent: {} }).type, 'anchor.benchmark.adaptive-surfacing-decision');
assert.equal(buildAdaptiveNextLegConfigExport({ runtimeContext: { episodeId: session.episodeId }, surfacingDecision: { objectiveTransition: { toObjectiveId: 'confirmHiddenEvent' } } }).type, 'anchor.benchmark.adaptive-next-leg-config');
assert.equal(buildBenchmarkModeConfigExport({ benchmarkMode: 'plannerBenchmark' }).type, 'anchor.benchmark.mode-config');
console.log('smoke_adaptive_session_exports: ok');
