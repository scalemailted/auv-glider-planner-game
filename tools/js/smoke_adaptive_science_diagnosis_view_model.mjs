import assert from 'node:assert/strict';

import { createAdaptiveScienceDiagnosisContext } from '../../src/core/benchmark/AdaptiveScienceDiagnosisHandoff.js';
import { createAdaptiveMissionManagerRationale } from '../../src/core/benchmark/AdaptiveMissionManagerRationale.js';
import { buildAdaptiveScienceDiagnosisViewModel, adaptiveScienceDiagnosisViewModelSummary } from '../../src/core/benchmark/AdaptiveScienceDiagnosisViewModel.js';

const context = createAdaptiveScienceDiagnosisContext({
  episodeId: 'p10-view-model',
  primaryScienceDiagnosis: 'possibleHiddenEvent',
  hiddenEventHypothesis: { status: 'possible', eventFamily: 'plume' },
  recommendedObjectiveId: 'confirmHiddenEvent',
  confidence: 0.61,
  evidence: { observationCount: 5 }
});
const rationale = createAdaptiveMissionManagerRationale({
  episodeId: 'p10-view-model',
  scienceDiagnosisContext: context,
  transition: { fromObjectiveId: 'validateForecast', toObjectiveId: 'confirmHiddenEvent', transitionId: 'switchToConfirmHiddenEvent' }
});
const viewModel = buildAdaptiveScienceDiagnosisViewModel({ scienceDiagnosisContext: context, missionManagerRationale: rationale, surfacingDecision: { evidence: { observationCount: 5 }, objectiveTransition: rationale } });
assert.ok(viewModel.forecastUpdateCard);
assert.ok(viewModel.discoveryUpdateCard);
assert.ok(viewModel.recommendationCard);
assert.equal(viewModel.boundaryFlags.usesNewPlanner, false);
assert.equal(viewModel.boundaryFlags.generatesWaypoints, false);
assert.equal(viewModel.boundaryFlags.changesScoring, false);
assert.equal(viewModel.boundaryFlags.usesMARL, false);
assert.equal(adaptiveScienceDiagnosisViewModelSummary(viewModel).diagnosisIsPlannerAuthority, false);

const missing = buildAdaptiveScienceDiagnosisViewModel({ surfacingDecision: { evidence: { observationCount: 1 }, diagnosis: { primaryDiagnosis: 'insufficientEvidence' } } });
assert.ok(missing.warnings.some((warning) => /not available/i.test(warning)));

console.log('smoke_adaptive_science_diagnosis_view_model: ok');