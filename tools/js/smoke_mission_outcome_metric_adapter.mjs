import assert from 'node:assert/strict';
import { extractMissionOutcomeMetrics, missionOutcomeMetricSummary, validateMissionOutcomeMetrics } from '../../src/core/scoring/MissionOutcomeMetricAdapter.js';

const modern = extractMissionOutcomeMetrics({
  result: { missionId: 'mission-a', episodeId: 'episode-a', summary: { roiCollected: 12, hazardsHit: 0, duplicateSamples: 1, completedWaypoints: 3, missedWaypoints: 0, simTime: 3600 }, observations: [{ x: 1, y: 2 }, { x: 2, y: 2 }] },
  missionFeasibilityReport: { missionId: 'mission-a', missionDurationSeconds: 3600, batteryFraction: 0.75, realizedDistance: 10, meanTrackError: 0.2, constraintViolations: 0, bottomClearanceWarnings: 0, feasibilityStatus: 'feasible', waypointArrivalStatus: 'complete' },
  waterColumnSummary: { observationSummary: { coverageFraction: 0.66 } },
  scienceDiagnostics: { uncertaintyReduction: 0.1, forecastValidationScore: 0.5 },
  options: { objectiveId: 'reconnaissanceSurvey', scoreReport: { components: { scienceValueCollected: 10 } } }
});
assert.equal(validateMissionOutcomeMetrics(modern).valid, true, 'modern metrics validate');
assert.ok(missionOutcomeMetricSummary(modern).availableMetricCount > 0, 'modern metrics available');
const partial = extractMissionOutcomeMetrics({ result: { missionId: 'legacy' } });
assert.equal(validateMissionOutcomeMetrics(partial).valid, true, 'partial metrics validate');
assert.ok(partial.missingMetrics.length > 0, 'partial keeps missing metrics explicit');
assert.ok(partial.metrics.some((metric) => metric.available === false && metric.rawValue === null), 'missing remains null');
assert.equal(partial.publicSafe, true, 'public safe');
assert.equal(JSON.stringify(modern).includes('T_hiddenTruth'), false, 'no hidden array id');
console.log('Mission outcome metric adapter smoke passed');