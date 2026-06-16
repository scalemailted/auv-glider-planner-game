import assert from 'node:assert/strict';

import { buildBenchmarkImportViewModel, benchmarkImportSummary } from '../../src/core/benchmark/BenchmarkImportViewModel.js';

const importedArtifacts = [{
  type: 'anchor.benchmark.imported-artifact',
  artifactType: 'anchor.benchmark.route-execution',
  supported: true,
  episodeId: 'episode-view',
  benchmarkMode: 'plannerBenchmark',
  attemptCount: 1,
  hasRouteGeometry: true,
  payload: { type: 'anchor.benchmark.route-execution', episodeId: 'episode-view', benchmarkMode: 'plannerBenchmark' },
  attempts: []
}, {
  type: 'anchor.benchmark.imported-artifact',
  artifactType: 'anchor.benchmark.route-execution',
  supported: true,
  episodeId: 'other-episode',
  benchmarkMode: 'plannerBenchmark',
  attemptCount: 1,
  hasRouteGeometry: false,
  payload: { type: 'anchor.benchmark.route-execution', episodeId: 'other-episode', benchmarkMode: 'plannerBenchmark' },
  attempts: []
}];

const viewModel = buildBenchmarkImportViewModel({
  currentEpisode: { episodeId: 'episode-view', benchmarkMode: 'plannerBenchmark' },
  currentSession: { episodeId: 'episode-view', benchmarkMode: 'plannerBenchmark', attempts: [{ routeGeometry: { segments: [1] } }] },
  importedArtifacts,
  persistedSessions: [{ episodeId: 'episode-view', benchmarkMode: 'plannerBenchmark', attemptCount: 2, routeGeometryCount: 2, savedAt: '2026-06-16T00:00:00.000Z' }]
});
assert.equal(viewModel.version, 'benchmark-import-view-model-p5', 'version is P5');
assert.equal(viewModel.importedArtifactCount, 2, 'counts imports');
assert.equal(viewModel.compatibleImportCount, 1, 'counts compatible imports');
assert.equal(viewModel.incompatibleImportCount, 1, 'counts reference-only imports');
assert.equal(viewModel.persistedSessionCount, 1, 'counts saved sessions');
assert.ok(viewModel.copy.scoreBoundary.includes('does not recompute scores'), 'boundary copy present');
const summary = benchmarkImportSummary(viewModel);
assert.equal(summary.compatibleImportCount, 1, 'summary includes compatible count');

console.log('smoke_benchmark_import_view_model: ok');