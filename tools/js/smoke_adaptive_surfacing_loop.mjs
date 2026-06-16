import assert from 'node:assert/strict';

import { initializeAdaptiveBenchmarkEpisode } from '../../src/core/benchmark/AdaptiveBenchmarkRuntime.js';
import { createAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';
import { createAdaptiveSurfacingEvent } from '../../src/core/benchmark/AdaptiveSurfacingEvent.js';
import { runAdaptiveSurfacingDecision, validateAdaptiveSurfacingDecision } from '../../src/core/benchmark/AdaptiveSurfacingLoop.js';

const fixture = createAdaptiveManagerFixture('possibleHiddenPlume', { episodeId: 'adaptive-loop' });
const runtimeContext = initializeAdaptiveBenchmarkEpisode({ episodeId: 'adaptive-loop', adaptiveManagerConfig: fixture.managerConfig, adaptiveManagerState: fixture.initialState });
const decision = runAdaptiveSurfacingDecision({
  runtimeContext,
  evidence: fixture.evidence,
  surfacingEvent: createAdaptiveSurfacingEvent({ episodeId: 'adaptive-loop', samplesUploaded: 5 }),
  managerConfig: fixture.managerConfig,
  managerState: fixture.initialState
});
assert.equal(decision.benchmarkMode, 'adaptiveBenchmark');
assert.equal(decision.routeAuthority, 'playerOrSolver');
assert.equal(decision.objectiveAuthority, 'missionManager');
assert(decision.diagnosis.primaryDiagnosis);
assert(decision.objectiveTransition.toObjectiveId);
assert.equal(decision.managerStateAfter.currentObjectiveId, decision.objectiveTransition.toObjectiveId);
assert(decision.notA.includes('not route planning'));
assert(decision.notA.includes('not MARL/RL'));
assert.equal(validateAdaptiveSurfacingDecision(decision).valid, true);

const noisy = createAdaptiveManagerFixture('noisyFalseAlarm', { episodeId: 'adaptive-loop-noisy' });
const noisyRuntime = initializeAdaptiveBenchmarkEpisode({ episodeId: 'adaptive-loop-noisy', adaptiveManagerConfig: noisy.managerConfig, adaptiveManagerState: noisy.initialState });
const noisyDecision = runAdaptiveSurfacingDecision({ runtimeContext: noisyRuntime, evidence: noisy.evidence, managerConfig: noisy.managerConfig, managerState: noisy.initialState });
assert.equal(noisyDecision.objectiveTransition.transitionId, 'pauseForMoreEvidence');
assert.equal(noisyDecision.objectiveTransition.fromObjectiveId, noisyDecision.objectiveTransition.toObjectiveId);

console.log('smoke_adaptive_surfacing_loop: ok');
