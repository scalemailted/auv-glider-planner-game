import assert from 'node:assert/strict';

import {
  buildAdaptiveEvidenceFromFlowCoupledSampling,
  buildAdaptiveEvidenceFromResult,
  buildAdaptiveEvidenceFromSamplingPriority,
  buildAdaptiveEvidenceFromUncertaintyDiagnostics,
  validateAdaptiveEvidenceFromResult
} from '../../src/core/benchmark/AdaptiveEvidenceAdapter.js';
import { createAdaptiveMissionManagerState } from '../../src/core/benchmark/AdaptiveMissionManagerState.js';

const result = {
  resultId: 'evidence-result',
  benchmarkMetadata: { benchmarkMode: 'adaptiveBenchmark', episodeId: 'adaptive-evidence', informationAccessTier: 'beliefOnly', objectiveAuthority: 'missionManager', routeAuthority: 'playerOrSolver', worldModelTier: 'stochasticBelief', benchmarkModeConfigVersion: 'benchmark-mode-contract-p0' },
  summary: { observationCount: 3, recentObservationCount: 2, forecastErrorScore: 0.7 },
  adaptiveEvidence: { hiddenEventConfidence: 0.66, stalenessScore: 0.4 },
  events: [{ type: 'sample', time: 4, x: 2, y: 3 }]
};
const original = JSON.stringify(result);
const previousManagerState = createAdaptiveMissionManagerState({ episodeId: 'adaptive-evidence', currentObjectiveId: 'validateForecast' });
const evidence = buildAdaptiveEvidenceFromResult({ result, previousManagerState });
assert.equal(evidence.benchmarkMode, 'adaptiveBenchmark');
assert.equal(evidence.episodeId, 'adaptive-evidence');
assert.equal(evidence.observationCount, 3);
assert.equal(evidence.hiddenEventConfidence, 0.66);
assert.equal(evidence.forecastErrorScore, 0.7);
assert.equal(evidence.stalenessScore, 0.4);
assert.equal(validateAdaptiveEvidenceFromResult(evidence).valid, true);
assert.equal(JSON.stringify(result), original, 'result input is not mutated');

const partial = buildAdaptiveEvidenceFromResult({ result: { summary: {} }, previousManagerState });
assert.equal(partial.diagnostics.partialEvidence, true);
assert(partial.diagnostics.warnings.length >= 1);

assert.equal(buildAdaptiveEvidenceFromUncertaintyDiagnostics({ hiddenEvent: { confidence: 0.8 }, forecastError: { score: 0.5 } }).hiddenEventConfidence, 0.8);
assert.equal(buildAdaptiveEvidenceFromSamplingPriority({ diagnostics: { staleness: 0.9 } }).stalenessScore, 0.9);
assert.equal(buildAdaptiveEvidenceFromFlowCoupledSampling({ diagnostics: { reachabilityPressure: 0.75 } }).reachabilityPressure, 0.75);

console.log('smoke_adaptive_evidence_adapter: ok');
