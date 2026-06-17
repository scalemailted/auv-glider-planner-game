import assert from 'node:assert/strict';

import { createAdaptiveScienceDiagnosisContext } from '../../src/core/benchmark/AdaptiveScienceDiagnosisHandoff.js';
import {
  createAdaptiveMissionManagerRationale,
  validateAdaptiveMissionManagerRationale,
  adaptiveMissionManagerRationaleSummary
} from '../../src/core/benchmark/AdaptiveMissionManagerRationale.js';

const context = createAdaptiveScienceDiagnosisContext({
  episodeId: 'p10-rationale',
  primaryScienceDiagnosis: 'forecastDisplacement',
  recommendedObjectiveId: 'validateForecast',
  confidence: 0.68,
  evidence: { observationCount: 6, T_hiddenTruth: [[1]] }
});
const rationale = createAdaptiveMissionManagerRationale({
  episodeId: 'p10-rationale',
  evidence: { observationCount: 6, T_hiddenTruth: [[1]] },
  diagnosis: { primaryDiagnosis: 'likelyForecastError', confidence: 0.68, rationale: 'Forecast shifted.' },
  scienceDiagnosisContext: context,
  transition: { fromObjectiveId: 'reconnaissanceSurvey', toObjectiveId: 'validateForecast', transitionId: 'switchToValidateForecast' },
  alternativeObjectives: [{ objectiveId: 'confirmHiddenEvent', reasonFor: 'Could test hidden event.', reasonAgainst: 'Forecast correction is stronger.', confidence: 0.34 }]
});
assert.equal(rationale.objectiveAuthority, 'missionManager');
assert.equal(rationale.routeAuthority, 'playerOrSolver');
assert.equal(rationale.diagnosisIsPlannerAuthority, false);
assert.equal(rationale.generatedRoute, false);
assert.ok(rationale.alternativeObjectives.length >= 1);
assert.equal(JSON.stringify(rationale).includes('T_hiddenTruth'), false);
assert.equal(validateAdaptiveMissionManagerRationale(rationale).valid, true);
assert.equal(adaptiveMissionManagerRationaleSummary(rationale).recommendedObjectiveId, 'validateForecast');

console.log('smoke_adaptive_mission_manager_rationale: ok');