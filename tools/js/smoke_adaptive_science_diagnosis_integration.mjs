import assert from 'node:assert/strict';

import { buildAdaptiveEvidenceFromResult } from '../../src/core/benchmark/AdaptiveEvidenceAdapter.js';
import { computeAdaptiveDiagnosis } from '../../src/core/benchmark/AdaptiveDiagnosisModel.js';
import { selectNextAdaptiveObjective } from '../../src/core/benchmark/AdaptiveObjectivePolicy.js';
import { analyzeScienceEvidence } from '../../src/core/science/ScienceDiscoveryLifecycle.js';

const scienceDiscovery = analyzeScienceEvidence({
  observations: [
    { observationId: 'a', timeSeconds: 0, x: 4, y: 4, observedValue: 1.2, forecastValue: 0.2, sensorNoiseStd: 0.1 },
    { observationId: 'b', timeSeconds: 120, x: 4.2, y: 4.1, observedValue: 1.25, forecastValue: 0.2, sensorNoiseStd: 0.1 },
    { observationId: 'c', timeSeconds: 240, x: 3.8, y: 4.1, observedValue: 1.18, forecastValue: 0.2, sensorNoiseStd: 0.1 }
  ],
  context: { episodeId: 'adaptive-science-smoke', forecastCanExplain: false, eventFamily: 'hiddenPlume' }
});
const evidence = buildAdaptiveEvidenceFromResult({ result: { observations: [], scienceDiscovery }, options: { activeObjectiveId: 'reconnaissanceSurvey' } });
assert.equal(evidence.primaryScienceDiagnosis, 'likelyHiddenEvent', 'evidence carries science diagnosis');
const diagnosis = computeAdaptiveDiagnosis(evidence);
assert.equal(diagnosis.primaryScienceDiagnosis, 'likelyHiddenEvent', 'adaptive diagnosis preserves science diagnosis');
assert.equal(diagnosis.primaryDiagnosis, 'likelyHiddenEvent', 'science diagnosis maps to existing adaptive diagnosis');
const selection = selectNextAdaptiveObjective({ diagnosis, currentObjective: 'reconnaissanceSurvey' });
assert.equal(selection.recommendedObjective.id, 'confirmHiddenEvent', 'science hidden event maps to confirmHiddenEvent');
assert.equal(selection.usesMARL, false, 'objective policy does not use MARL');

console.log('smoke_adaptive_science_diagnosis_integration: ok');
