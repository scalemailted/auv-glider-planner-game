import assert from 'node:assert/strict';

import {
  FORECAST_CORRECTION_DIAGNOSIS_IDS,
  HIDDEN_EVENT_HYPOTHESIS_IDS,
  SCIENCE_RECORD_TYPES,
  classifyScienceDiagnosis,
  normalizeScienceDiagnosisId,
  recommendedObjectiveForScienceDiagnosis
} from '../../src/core/science/ScienceDiagnosisTypes.js';

assert.ok(FORECAST_CORRECTION_DIAGNOSIS_IDS.includes('forecastIntensityError'), 'forecast correction diagnosis exists');
assert.ok(HIDDEN_EVENT_HYPOTHESIS_IDS.includes('likelyHiddenEvent'), 'hidden event diagnosis exists');
assert.ok(SCIENCE_RECORD_TYPES.includes('anchor.headless.science-diagnostics'), 'headless science diagnostics record type exists');
assert.equal(normalizeScienceDiagnosisId('likelyForecastError'), 'forecastIntensityError', 'forecast error alias normalizes');
assert.equal(normalizeScienceDiagnosisId('likelyNoiseOrFalseAlarm'), 'likelySensorNoise', 'noise alias normalizes');
assert.equal(classifyScienceDiagnosis('hiddenEventConfirmed'), 'hiddenEventHypothesis', 'hidden event classifies');
assert.equal(recommendedObjectiveForScienceDiagnosis('forecastTimingError'), 'validateForecast', 'forecast correction maps to validateForecast');
assert.equal(recommendedObjectiveForScienceDiagnosis('hiddenEventConfirmed', { eventFamily: 'sourceRelease' }), 'localizeSource', 'source event maps to localizeSource');

console.log('smoke_science_diagnosis_types: ok');
