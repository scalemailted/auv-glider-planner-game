import assert from 'node:assert/strict';
import { addAdaptiveNextLegHandoffToSession, addAdaptiveSurfacingDecisionToSession, createAdaptiveEpisodeSession } from '../../src/core/benchmark/AdaptiveEpisodeSession.js';
import { adaptiveObjectiveHistorySummary, buildAdaptiveObjectiveHistoryViewModel } from '../../src/core/benchmark/AdaptiveObjectiveHistoryViewModel.js';

let session = createAdaptiveEpisodeSession({ episodeId: 'episode-p8-history', currentObjectiveId: 'reconnaissanceSurvey' });
session = addAdaptiveSurfacingDecisionToSession(session, {
  episodeId: session.episodeId,
  legIndex: 0,
  diagnosis: { primaryDiagnosis: 'possibleHiddenPlume', confidence: 0.8 },
  objectiveTransition: { fromObjectiveId: 'reconnaissanceSurvey', toObjectiveId: 'confirmHiddenEvent', transitionId: 'confirm-hidden-event', rationale: 'Hidden event confidence is high.' },
  recommendedObjective: { id: 'confirmHiddenEvent', label: 'Confirm Hidden Event' }
});
session = addAdaptiveNextLegHandoffToSession(session, { episodeId: session.episodeId, legIndex: 1, recommendedObjectiveId: 'confirmHiddenEvent' });
const vm = buildAdaptiveObjectiveHistoryViewModel({ session });
assert.equal(vm.benchmarkMode, 'adaptiveBenchmark');
assert.ok(vm.objectiveTimeline.length >= 2);
assert.ok(vm.transitionCards.length >= 1);
assert.equal(vm.currentObjective.id, 'confirmHiddenEvent');
assert.ok(vm.notImplemented.includes('automatic route generation'));
assert.ok(vm.notImplemented.includes('scoring redesign'));
assert.ok(vm.notImplemented.includes('MARL/RL'));
assert.equal(adaptiveObjectiveHistorySummary(vm).usesNewPlanner, false);
const emptyVm = buildAdaptiveObjectiveHistoryViewModel({ session: createAdaptiveEpisodeSession({ episodeId: 'empty-history' }) });
assert.ok(emptyVm.warnings.length >= 1, 'missing histories warn instead of crashing');
console.log('smoke_adaptive_objective_history_view_model: ok');
