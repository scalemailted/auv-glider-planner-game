import assert from 'node:assert/strict';

import { hiddenEventHypothesisSummary, updateHiddenEventHypothesisState } from '../../src/core/science/HiddenEventHypothesisState.js';

const state = updateHiddenEventHypothesisState({}, {
  diagnosisId: 'likelyHiddenEvent',
  confidence: 0.72,
  evidenceConfidence: 0.72,
  highSurpriseCount: 4,
  eventFamily: 'hiddenPlume'
});
assert.equal(state.type, 'anchor.science.hidden-event-hypothesis', 'hidden event record type');
assert.equal(state.status, 'hypothesisLikely', 'strong evidence yields likely hypothesis');
assert.equal(state.usesProductionDataAssimilation, false, 'no production assimilation claim');
const summary = hiddenEventHypothesisSummary(state);
assert.equal(summary.recommendedObjectiveId, 'confirmHiddenEvent', 'likely hidden event objective');
assert.equal(summary.eventFamily, 'hiddenPlume', 'event family preserved');

console.log('smoke_hidden_event_hypothesis_state: ok');
