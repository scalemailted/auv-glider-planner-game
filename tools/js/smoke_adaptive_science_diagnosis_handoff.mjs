import assert from 'node:assert/strict';

import {
  createAdaptiveScienceDiagnosisContext,
  createAdaptiveScienceDiagnosisHandoffRecord,
  scienceDiagnosisContextFromDiscoveryUpdate,
  validateAdaptiveScienceDiagnosisContext,
  validateAdaptiveScienceDiagnosisHandoffRecord,
  adaptiveScienceDiagnosisHandoffSummary
} from '../../src/core/benchmark/AdaptiveScienceDiagnosisHandoff.js';

const update = {
  type: 'anchor.science.discovery-update',
  episodeId: 'p10-handoff',
  primaryDiagnosis: 'likelyHiddenEvent',
  confidence: 0.72,
  recommendedObjectiveId: 'confirmHiddenEvent',
  forecastCorrection: { status: 'notExplainedByForecast', correctionKind: 'n/a' },
  hiddenEventHypothesis: { status: 'likely', eventFamily: 'coherentHiddenPlume' },
  publicSafe: true,
  hiddenTruthIncluded: false
};

const context = scienceDiagnosisContextFromDiscoveryUpdate(update);
assert.equal(context.type, 'anchor.benchmark.adaptive-science-diagnosis-context');
assert.equal(context.controlsRoutePlanning, false);
assert.equal(context.generatesWaypoints, false);
assert.equal(context.publicSafe, true);
assert.equal(validateAdaptiveScienceDiagnosisContext(context).valid, true);

const handoff = createAdaptiveScienceDiagnosisHandoffRecord({ scienceDiagnosisContext: context });
assert.equal(handoff.diagnosisIsPlannerAuthority, false);
assert.equal(validateAdaptiveScienceDiagnosisHandoffRecord(handoff).valid, true);

const invalid = createAdaptiveScienceDiagnosisContext({ ...context, controlsRoutePlanning: true });
invalid.controlsRoutePlanning = true;
assert.equal(validateAdaptiveScienceDiagnosisContext(invalid).valid, false);

const summary = adaptiveScienceDiagnosisHandoffSummary(context);
assert.equal(summary.primaryScienceDiagnosis, 'likelyHiddenEvent');

console.log('smoke_adaptive_science_diagnosis_handoff: ok');