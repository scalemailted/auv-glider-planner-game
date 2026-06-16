import assert from 'node:assert/strict';

import { createAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';
import { runAdaptiveSurfacingDecision } from '../../src/core/benchmark/AdaptiveSurfacingLoop.js';
import { appendAdaptiveLegResult, appendAdaptiveSurfacingDecision, createAdaptiveEpisodeTrace, validateAdaptiveEpisodeTrace } from '../../src/core/benchmark/AdaptiveEpisodeTrace.js';

const fixture = createAdaptiveManagerFixture('highUncertainty', { episodeId: 'adaptive-trace' });
const decision = runAdaptiveSurfacingDecision({ evidence: fixture.evidence, managerConfig: fixture.managerConfig, managerState: fixture.initialState });
const trace = createAdaptiveEpisodeTrace({ episodeId: 'adaptive-trace', managerConfig: fixture.managerConfig });
assert.equal(trace.type, 'anchor.benchmark.adaptive-episode-trace');
const withDecision = appendAdaptiveSurfacingDecision(trace, decision);
assert.equal(withDecision.surfacingDecisions.length, 1);
assert(withDecision.objectiveHistory.some((entry) => entry.objectiveId === decision.objectiveTransition.toObjectiveId));
const withLeg = appendAdaptiveLegResult(withDecision, { legIndex: 0, objectiveId: fixture.initialState.currentObjectiveId, resultId: 'result-1' });
assert.equal(withLeg.legs.length, 1);
assert.equal(withLeg.legs[0].runRecord, null);
assert.equal(validateAdaptiveEpisodeTrace(withLeg).valid, true);

console.log('smoke_adaptive_episode_trace: ok');
