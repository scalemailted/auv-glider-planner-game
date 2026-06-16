import assert from 'node:assert/strict';

import { computeEvidenceCoherence, evidenceCoherenceSummary } from '../../src/core/science/EvidenceCoherenceModel.js';

const observations = [
  { observationId: 'a', timeSeconds: 0, x: 3, y: 3, observedValue: 1.2, forecastValue: 0.3, sensorNoiseStd: 0.15 },
  { observationId: 'b', timeSeconds: 120, x: 3.4, y: 3.1, observedValue: 1.1, forecastValue: 0.3, sensorNoiseStd: 0.15 },
  { observationId: 'c', timeSeconds: 240, x: 2.9, y: 3.2, observedValue: 1.15, forecastValue: 0.35, sensorNoiseStd: 0.15 }
];
const coherence = computeEvidenceCoherence(observations, { spatialRadius: 2 });
assert.equal(coherence.highSurpriseCount, 3, 'all samples are high surprise');
assert.ok(coherence.evidenceConfidence > 0.5, 'clustered evidence has confidence');
assert.equal(coherence.publicSafe, true, 'coherence is public safe');
const summary = evidenceCoherenceSummary(coherence);
assert.equal(summary.highSurpriseCount, 3, 'summary preserves high surprise count');
assert.ok(Number.isFinite(summary.evidenceConfidence), 'summary confidence is finite');

console.log('smoke_evidence_coherence_model: ok');
