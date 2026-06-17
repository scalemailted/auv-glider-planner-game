import assert from 'node:assert/strict';

import {
  buildAdaptiveScienceDiagnosisViewModel,
  adaptiveScienceDiagnosisViewModelSummary
} from '../../src/core/benchmark/AdaptiveScienceDiagnosisViewModel.js';
import {
  createAdaptiveScienceDiagnosisContext,
  createAdaptiveScienceDiagnosisHandoffRecord,
  validateAdaptiveScienceDiagnosisHandoffRecord
} from '../../src/core/benchmark/AdaptiveScienceDiagnosisHandoff.js';

const waterColumnSummary = {
  verticalCoverage: 'surface-limited',
  observationCountsByDepth: { surface: 5, thermocline: 0, deep: 0 }
};
const context = createAdaptiveScienceDiagnosisContext({
  primaryScienceDiagnosis: 'surfaceOnlyMissedSubsurfaceFeature',
  recommendedObjectiveId: 'confirmHiddenEvent',
  recommendedDiveProfileId: 'thermoclineDive',
  waterColumnEvidence: waterColumnSummary,
  evidence: { observationCount: 5, waterColumnSummary }
});
const handoff = createAdaptiveScienceDiagnosisHandoffRecord({ scienceDiagnosisContext: context });
const viewModel = buildAdaptiveScienceDiagnosisViewModel({ scienceDiagnosisContext: context, evidence: { observationCount: 5, waterColumnSummary } });
const summary = adaptiveScienceDiagnosisViewModelSummary(viewModel);

assert.equal(validateAdaptiveScienceDiagnosisHandoffRecord(handoff).status, 'PASS');
assert.equal(context.controlsRoutePlanning, false);
assert.equal(handoff.routeAuthority, 'playerOrSolver');
assert.equal(handoff.generatesWaypoints, false);
assert.equal(summary.recommendedDiveProfileId, 'thermoclineDive');
assert.equal(viewModel.waterColumnEvidenceCard.usesFull3DPlanning, false);
assert.ok(viewModel.waterColumnEvidenceCard.copy.some((line) => line.includes('2.5D means')));

console.log('smoke_adaptive_water_column_integration: ok', {
  diagnosis: summary.primaryScienceDiagnosis,
  profile: summary.recommendedDiveProfileId
});
