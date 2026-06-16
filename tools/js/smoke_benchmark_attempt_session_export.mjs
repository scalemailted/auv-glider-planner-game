import assert from 'node:assert/strict';

import { createBenchmarkAttemptSession } from '../../src/core/benchmark/BenchmarkAttemptSession.js';
import { parseBenchmarkArtifact } from '../../src/core/benchmark/BenchmarkArtifactImport.js';
import { buildBenchmarkAttemptSessionExport } from '../../src/core/io/ResultExporter.js';

const session = createBenchmarkAttemptSession({
  episodeId: 'export-episode',
  benchmarkMode: 'plannerBenchmark',
  attempts: [{
    attemptId: 'export-attempt',
    attemptSource: 'manualPlayer',
    routeSourceLabel: 'Manual',
    fairnessLabel: 'Forecast-Only',
    metrics: { finalScore: 33, energyUsed: 9, hazardsHit: 0 },
    routeGeometry: { waypoints: [{ x: 0, y: 0 }, { x: 2, y: 1 }], segments: [{ from: { x: 0, y: 0 }, to: { x: 2, y: 1 } }] }
  }]
});
const exported = buildBenchmarkAttemptSessionExport({ attemptSession: session });
assert.equal(exported.type, 'anchor.benchmark.attempt-session', 'export type is attempt session');
assert.equal(exported.episodeId, 'export-episode', 'episode exported');
assert.equal(exported.attempts.length, 1, 'attempts exported');
assert.equal(exported.routeGeometryAvailability[0].hasRouteGeometry, true, 'route geometry availability exported');
assert.equal(exported.usesNewPlanner, false, 'export boundary excludes new planner');
assert.ok(exported.notes.some((note) => note.includes('does not recompute scores')), 'boundary note exported');
const parsed = parseBenchmarkArtifact(exported);
assert.equal(parsed.valid, true, 'attempt-session export parses as import artifact');
assert.equal(parsed.artifacts[0].attemptCount, 1, 'parsed attempt count is retained');

console.log('smoke_benchmark_attempt_session_export: ok');