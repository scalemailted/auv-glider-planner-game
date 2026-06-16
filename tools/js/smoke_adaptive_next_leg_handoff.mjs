import assert from 'node:assert/strict';

import { initializeAdaptiveBenchmarkEpisode } from '../../src/core/benchmark/AdaptiveBenchmarkRuntime.js';
import { createAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';
import { runAdaptiveSurfacingDecision } from '../../src/core/benchmark/AdaptiveSurfacingLoop.js';
import { attachAdaptiveNextLegMetadata, createAdaptiveNextLegConfig, validateAdaptiveNextLegConfig } from '../../src/core/benchmark/AdaptiveNextLegHandoff.js';

const fixture = createAdaptiveManagerFixture('possibleHiddenPlume', { episodeId: 'adaptive-handoff' });
const runtimeContext = initializeAdaptiveBenchmarkEpisode({ episodeId: 'adaptive-handoff', adaptiveManagerConfig: fixture.managerConfig, adaptiveManagerState: fixture.initialState });
const decision = runAdaptiveSurfacingDecision({ runtimeContext, evidence: fixture.evidence, managerConfig: fixture.managerConfig, managerState: fixture.initialState });
const handoff = createAdaptiveNextLegConfig({ runtimeContext, surfacingDecision: decision });
assert.equal(handoff.type, 'anchor.benchmark.adaptive-next-leg-config');
assert.equal(handoff.recommendedObjectiveId, decision.objectiveTransition.toObjectiveId);
assert.equal(handoff.routeAuthority, 'playerOrSolver');
assert.equal(handoff.waypoints, undefined);
assert.equal(validateAdaptiveNextLegConfig(handoff).valid, true);
const invalid = validateAdaptiveNextLegConfig({ ...handoff, transition: null });
assert.equal(invalid.valid, false);
const target = { meta: { keep: true } };
const attached = attachAdaptiveNextLegMetadata(target, handoff);
assert.notEqual(attached, target);
assert.equal(target.meta.adaptiveNextLeg, undefined);
assert.equal(attached.meta.adaptiveNextLeg.recommendedObjectiveId, handoff.recommendedObjectiveId);

console.log('smoke_adaptive_next_leg_handoff: ok');
