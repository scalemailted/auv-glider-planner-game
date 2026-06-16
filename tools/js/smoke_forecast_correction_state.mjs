import assert from 'node:assert/strict';

import { forecastCorrectionSummary, updateForecastCorrectionState } from '../../src/core/science/ForecastCorrectionState.js';

const state = updateForecastCorrectionState({}, {
  diagnosisId: 'forecastIntensityError',
  confidence: 0.82,
  evidenceConfidence: 0.82,
  highSurpriseCount: 4,
  meanInnovation: 0.7,
  meanAbsInnovation: 0.7
});
assert.equal(state.type, 'anchor.science.forecast-correction', 'forecast correction record type');
assert.equal(state.status, 'correctionActive', 'strong evidence activates correction state');
assert.equal(state.usesProductionDataAssimilation, false, 'no production assimilation claim');
const summary = forecastCorrectionSummary(state);
assert.equal(summary.correctionKind, 'intensityBias', 'intensity correction kind');
assert.equal(summary.recommendedObjectiveId, 'validateForecast', 'forecast correction objective');

console.log('smoke_forecast_correction_state: ok');
