import assert from 'node:assert/strict';

import {
  addResultToBenchmarkAttemptSession,
  benchmarkAttemptSessionSummary,
  createBenchmarkAttemptSession,
  deserializeBenchmarkAttemptSession,
  serializeBenchmarkAttemptSession
} from '../../src/core/benchmark/BenchmarkAttemptSession.js';

let session = createBenchmarkAttemptSession({ episodeId: 'session-episode', benchmarkMode: 'plannerBenchmark' });
assert.equal(session.type, 'anchor.benchmark.attempt-session', 'empty session type');
assert.equal(session.attempts.length, 0, 'empty session valid');

session = addResultToBenchmarkAttemptSession(session, {
  episodeId: 'session-episode',
  attemptSource: 'manualPlayer',
  routeSourceLabel: 'Manual Player Plan',
  fairnessLabel: 'Forecast-only',
  result: { resultId: 'manual-result' },
  metrics: { finalScore: 50, sampleScore: 30, energyUsed: 10, hazardsHit: 1, duplicateSamples: 0 }
});
session = addResultToBenchmarkAttemptSession(session, {
  episodeId: 'session-episode',
  attemptSource: 'greedyPlanner',
  routeSourceLabel: 'Greedy Planner',
  fairnessLabel: 'Forecast-only',
  result: { resultId: 'greedy-result' },
  metrics: { finalScore: 65, sampleScore: 25, energyUsed: 8, hazardsHit: 0, duplicateSamples: 1 }
});

const summary = benchmarkAttemptSessionSummary(session);
assert.equal(summary.attemptCount, 2, 'manual and greedy attempts recorded');
assert.equal(summary.comparison.bestFinalScore.routeSourceLabel, 'Greedy Planner', 'best score comparison');
assert.equal(summary.comparison.lowestEnergyUsed.routeSourceLabel, 'Greedy Planner', 'lowest energy comparison');
assert.equal(summary.comparison.highestSampleScore.routeSourceLabel, 'Manual Player Plan', 'highest sample score comparison');

const roundTrip = deserializeBenchmarkAttemptSession(serializeBenchmarkAttemptSession(session));
assert.deepEqual(
  roundTrip.attempts.map((attempt) => attempt.routeSourceLabel),
  ['Manual Player Plan', 'Greedy Planner'],
  'serialize/deserialize roundtrip preserves attempts'
);

console.log('smoke_benchmark_attempt_session: ok');

