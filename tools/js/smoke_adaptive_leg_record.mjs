import assert from 'node:assert/strict';
import { adaptiveLegRecordSummary, createAdaptiveLegRecord, createAdaptiveLegResultRecord, validateAdaptiveLegRecord } from '../../src/core/benchmark/AdaptiveLegRecord.js';

const record = createAdaptiveLegRecord({
  episodeId: 'episode-p8-leg',
  legIndex: 2,
  objectiveId: 'confirmHiddenEvent',
  resultId: 'result-2',
  status: 'executed',
  metrics: { finalScore: 30, sampleScore: 8, energyUsed: 4, distanceTraveled: 10, collisions: 0 }
});
assert.equal(record.type, 'anchor.benchmark.adaptive-leg');
assert.equal(record.runRecord, null);
assert.equal(record.routeExecutionRecord, null);
assert.equal(record.metrics.roiCollected, 8);
assert.equal(validateAdaptiveLegRecord(record).valid, true);

const resultRecord = createAdaptiveLegResultRecord({
  runtimeContext: { episodeId: 'episode-p8-leg', activeLegIndex: 3, activeObjective: { id: 'mapUncertainty' } },
  result: { id: 'result-3', summary: { finalScore: 5, hazardsHit: 1 } }
});
assert.equal(resultRecord.legIndex, 3);
assert.equal(resultRecord.metrics.hazards, 1);

const partial = createAdaptiveLegRecord({ episodeId: 'episode-p8-leg' });
assert.equal(validateAdaptiveLegRecord(partial).valid, true, 'missing optional records do not crash validation');
const summary = adaptiveLegRecordSummary(record);
assert.equal(summary.objectiveId, 'confirmHiddenEvent');
assert.equal(summary.legIndex, 2);
console.log('smoke_adaptive_leg_record: ok');
