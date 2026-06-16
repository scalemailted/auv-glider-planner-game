import assert from 'node:assert/strict';

import {
  attachBenchmarkMetadataToLevel,
  attachBenchmarkMetadataToMission,
  attachBenchmarkMetadataToPlan,
  attachBenchmarkMetadataToResult,
  extractBenchmarkMetadata
} from '../../src/core/benchmark/BenchmarkMetadata.js';
import { initializePlannerBenchmarkEpisode } from '../../src/core/benchmark/BenchmarkEpisodeRuntime.js';

const level = { levelId: 'metadata-level', meta: { seed: 'metadata-smoke' } };
const mission = { missionId: 'metadata-mission', agents: [{ id: 'g1' }] };
const plan = {
  type: 'anchor.plan',
  planId: 'metadata-plan',
  agentPlans: [{ agentId: 'g1', waypoints: [{ x: 2, y: 2, t: 1 }] }]
};
const result = { resultId: 'metadata-result', summary: { finalScore: 12 } };
const before = JSON.stringify({ level, mission, plan, result });

const context = initializePlannerBenchmarkEpisode({
  episodeId: 'metadata-episode',
  levelId: level.levelId,
  missionId: mission.missionId,
  activeAttemptSource: 'manualPlayer',
  createdAt: '2026-06-16T00:00:00.000Z'
});

const levelWithMetadata = attachBenchmarkMetadataToLevel(level, context);
const missionWithMetadata = attachBenchmarkMetadataToMission(mission, context);
const planWithMetadata = attachBenchmarkMetadataToPlan(plan, { ...context, attemptSource: 'manualPlayer' });
const resultWithMetadata = attachBenchmarkMetadataToResult(result, {
  benchmarkMode: 'plannerBenchmark',
  episodeId: context.episodeId,
  informationAccessTier: context.informationAccessTier,
  objectiveAuthority: context.objectiveAuthority,
  routeAuthority: context.routeAuthority,
  fairnessLabel: context.fairnessLabel,
  worldModelTier: context.worldModelTier
});

assert.equal(levelWithMetadata.meta.benchmarkMetadata.episodeId, 'metadata-episode', 'level metadata attached');
assert.equal(missionWithMetadata.meta.benchmarkMetadata.episodeId, 'metadata-episode', 'mission metadata attached');
assert.equal(planWithMetadata.meta.benchmarkMetadata.attemptSource, 'manualPlayer', 'plan attempt source attached');
assert.equal(resultWithMetadata.benchmarkMetadata.episodeId, 'metadata-episode', 'result metadata attached');
assert.ok(resultWithMetadata.benchmarkRunRecord, 'result carries run-record reference payload');

assert.equal(extractBenchmarkMetadata(levelWithMetadata).benchmarkMode, 'plannerBenchmark', 'extract from level');
assert.equal(extractBenchmarkMetadata(missionWithMetadata).benchmarkMode, 'plannerBenchmark', 'extract from mission');
assert.equal(extractBenchmarkMetadata(planWithMetadata).benchmarkMode, 'plannerBenchmark', 'extract from plan');
assert.equal(extractBenchmarkMetadata(resultWithMetadata).benchmarkMode, 'plannerBenchmark', 'extract from result');
assert.equal(JSON.stringify({ level, mission, plan, result }), before, 'metadata helpers do not mutate originals');

console.log('smoke_benchmark_metadata_pipeline: ok');

