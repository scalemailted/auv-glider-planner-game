import assert from 'node:assert/strict';
import {
  addAdaptiveLegToSession,
  addAdaptiveNextLegHandoffToSession,
  addAdaptiveSurfacingDecisionToSession,
  createAdaptiveEpisodeSession,
  deserializeAdaptiveEpisodeSession,
  serializeAdaptiveEpisodeSession,
  updateAdaptiveSessionCurrentObjective,
  validateAdaptiveEpisodeSession
} from '../../src/core/benchmark/AdaptiveEpisodeSession.js';
import { createAdaptiveContinueLegPayload } from '../../src/core/benchmark/BenchmarkLaunchBridge.js';

const baseInput = { episodeId: 'episode-p8-session', policyId: 'transparentRuleManager', currentObjectiveId: 'reconnaissanceSurvey' };
const session = createAdaptiveEpisodeSession(baseInput);
assert.equal(session.type, 'anchor.benchmark.adaptive-episode-session');
assert.equal(session.benchmarkMode, 'adaptiveBenchmark');
assert.equal(session.currentObjectiveId, 'reconnaissanceSurvey');
assert.equal(baseInput.currentLegIndex, undefined, 'input object was not mutated');

const withLeg = addAdaptiveLegToSession(session, {
  episodeId: session.episodeId,
  legIndex: 0,
  objectiveId: 'reconnaissanceSurvey',
  resultId: 'result-0',
  status: 'executed',
  metrics: { finalScore: 12, sampleScore: 5, energyUsed: 2 }
});
assert.equal(withLeg.legs.length, 1);
assert.equal(session.legs.length, 0, 'addAdaptiveLegToSession returns a cloned session');

const decision = {
  type: 'anchor.benchmark.adaptive-surfacing-decision',
  episodeId: session.episodeId,
  legIndex: 0,
  evidence: { observationCount: 3, diagnostics: { partialEvidence: false } },
  diagnosis: { primaryDiagnosis: 'possibleHiddenPlume', confidence: 0.72 },
  objectiveTransition: { fromObjectiveId: 'reconnaissanceSurvey', toObjectiveId: 'confirmHiddenEvent', transitionId: 'confirm-hidden-event' },
  recommendedObjective: { id: 'confirmHiddenEvent', label: 'Confirm Hidden Event' }
};
const withDecision = addAdaptiveSurfacingDecisionToSession(withLeg, decision);
assert.equal(withDecision.surfacingDecisions.length, 1);
assert.equal(withDecision.objectiveHistory.at(-1).toObjectiveId, 'confirmHiddenEvent');

const withHandoff = addAdaptiveNextLegHandoffToSession(withDecision, {
  type: 'anchor.benchmark.adaptive-next-leg-config',
  episodeId: session.episodeId,
  legIndex: 1,
  recommendedObjectiveId: 'confirmHiddenEvent',
  recommendedObjectiveLabel: 'Confirm Hidden Event',
  objectiveAuthority: 'missionManager',
  routeAuthority: 'playerOrSolver'
});
assert.equal(withHandoff.currentLegIndex, 1);
assert.equal(withHandoff.currentObjectiveId, 'confirmHiddenEvent');
const continuePayload = createAdaptiveContinueLegPayload(withHandoff, withHandoff.nextLegHandoffs.at(-1));
assert.equal(continuePayload.legIndex, 1, 'continue payload uses explicit next-leg handoff index');
assert.equal(continuePayload.generatedWaypoints, false);
assert.equal(continuePayload.generatedRoute, false);

const updated = updateAdaptiveSessionCurrentObjective(withHandoff, 'reduceUncertainty');
assert.equal(updated.currentObjectiveId, 'reduceUncertainty');

const validation = validateAdaptiveEpisodeSession(updated);
assert.equal(validation.valid, true);
const missing = validateAdaptiveEpisodeSession({ type: 'anchor.benchmark.adaptive-episode-session', benchmarkMode: 'adaptiveBenchmark', objectiveAuthority: 'missionManager', routeAuthority: 'playerOrSolver', legs: [], surfacingDecisions: [], objectiveHistory: [] });
assert.equal(missing.valid, false);
assert.ok(missing.errors.some((error) => error.includes('episodeId')));

const roundtrip = deserializeAdaptiveEpisodeSession(serializeAdaptiveEpisodeSession(updated));
assert.deepEqual(roundtrip.currentObjectiveId, updated.currentObjectiveId);
assert.equal(roundtrip.legs.length, 1);
console.log('smoke_adaptive_episode_session: ok');
