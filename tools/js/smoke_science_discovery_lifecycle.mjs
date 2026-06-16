import assert from 'node:assert/strict';

import { analyzeScienceEvidence, buildScienceDiagnosticsArtifact, scienceDiscoverySummary } from '../../src/core/science/ScienceDiscoveryLifecycle.js';

const observations = [
  { observationId: 'a', timeSeconds: 0, x: 6, y: 4, observedValue: 1.3, forecastValue: 0.4, sensorNoiseStd: 0.12 },
  { observationId: 'b', timeSeconds: 120, x: 6.2, y: 4.1, observedValue: 1.25, forecastValue: 0.38, sensorNoiseStd: 0.12 },
  { observationId: 'c', timeSeconds: 240, x: 5.8, y: 3.9, observedValue: 1.28, forecastValue: 0.39, sensorNoiseStd: 0.12 }
];
const update = analyzeScienceEvidence({ observations, context: { episodeId: 'science-smoke', forecastCanExplain: true } });
assert.equal(update.type, 'anchor.science.discovery-update', 'discovery update type');
assert.equal(update.primaryDiagnosis, 'forecastIntensityError', 'forecast-explainable coherent surprise becomes correction');
assert.equal(update.forecastCorrection.status, 'correctionCandidate', 'forecast correction state is present');
assert.equal(update.hiddenTruthIncluded, false, 'no hidden truth included');
const artifact = buildScienceDiagnosticsArtifact(update, { episodeId: 'science-smoke' });
assert.equal(artifact.type, 'anchor.headless.science-diagnostics', 'headless science diagnostics type');
assert.equal(JSON.stringify(artifact).includes('T_hiddenTruth'), false, 'diagnostics omit hidden truth field id');
const summary = scienceDiscoverySummary(artifact);
assert.equal(summary.primaryDiagnosis, 'forecastIntensityError', 'summary preserves diagnosis');
assert.equal(summary.usesProductionDataAssimilation, false, 'summary has no production assimilation');

console.log('smoke_science_discovery_lifecycle: ok');
