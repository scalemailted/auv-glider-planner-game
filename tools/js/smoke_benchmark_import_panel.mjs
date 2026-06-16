import assert from 'node:assert/strict';

import { buildBenchmarkImportViewModel } from '../../src/core/benchmark/BenchmarkImportViewModel.js';
import {
  benchmarkImportedArtifactListHtml,
  benchmarkImportControlsHtml,
  benchmarkImportPanelHtml,
  benchmarkImportWarningsHtml,
  benchmarkPersistedSessionListHtml
} from '../../src/ui/benchmark/BenchmarkImportPanel.js';

const viewModel = buildBenchmarkImportViewModel({
  currentEpisode: { episodeId: 'panel-episode', benchmarkMode: 'plannerBenchmark' },
  currentSession: { episodeId: 'panel-episode', benchmarkMode: 'plannerBenchmark', attempts: [] },
  importedArtifacts: [{ type: 'anchor.benchmark.route-execution', episodeId: 'panel-episode', benchmarkMode: 'plannerBenchmark', routeSourceLabel: '<script>alert(1)</script>', segments: [] }],
  persistedSessions: [{ episodeId: 'panel-episode', benchmarkMode: 'plannerBenchmark', attemptCount: 1, routeGeometryCount: 1, savedAt: '2026-06-16T00:00:00.000Z' }]
});
const html = benchmarkImportPanelHtml(viewModel);
assert.ok(html.includes('Attempt Import / Session Persistence'), 'panel renders title');
assert.ok(html.includes('Attempt sessions let you compare multiple plans'), 'panel includes session purpose copy');
assert.ok(html.includes('Importing an attempt does not rerun the simulation'), 'panel includes import no-rerun copy');
assert.ok(html.includes('P5 does not add a new planner'), 'panel includes P5 boundary');
assert.ok(html.includes('P5 does not recompute scores'), 'panel includes score boundary');
assert.ok(html.includes('Local persistence stores compact attempt summaries'), 'panel includes persistence boundary');
assert.ok(html.includes('data-benchmark-import-file'), 'panel includes file input');
assert.ok(html.includes('Save Current Attempt Session'), 'panel includes save action');
assert.ok(html.includes('Export Attempt Session'), 'panel includes export action');
assert.ok(!html.includes('<script>alert'), 'unsafe imported label is escaped or not emitted');
assert.ok(benchmarkImportControlsHtml(viewModel).includes('Merge Compatible Imports'), 'controls helper renders');
assert.ok(benchmarkImportedArtifactListHtml(viewModel).includes('Staged Imports'), 'artifact list helper renders');
assert.ok(benchmarkPersistedSessionListHtml(viewModel).includes('Saved Attempt Sessions'), 'saved session list helper renders');
assert.equal(benchmarkImportWarningsHtml({ warnings: [] }), '', 'empty warnings helper is empty');

console.log('smoke_benchmark_import_panel: ok');