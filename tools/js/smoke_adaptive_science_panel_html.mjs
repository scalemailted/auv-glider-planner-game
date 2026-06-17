import assert from 'node:assert/strict';

import { adaptiveSurfacingPanelHtml } from '../../src/ui/benchmark/AdaptiveSurfacingPanel.js';

const html = adaptiveSurfacingPanelHtml({
  decision: {
    episodeId: 'p10-panel',
    legIndex: 0,
    evidence: { observationCount: 4, recentObservationCount: 3, diagnostics: { partialEvidence: true, warnings: ['<unsafe>'] } },
    previousObjective: { label: 'Validate Forecast' },
    recommendedObjective: { label: 'Confirm Hidden Event' },
    scienceDiagnosisContext: { primaryScienceDiagnosis: 'possibleHiddenEvent', primaryScienceDiagnosisLabel: 'Possible Hidden Event', hiddenEventStatus: 'possible', forecastCorrectionStatus: 'notExplained', recommendedObjectiveLabel: 'Confirm Hidden Event', confidence: 0.62 },
    missionManagerRationale: { objectiveReason: '<script>alert(1)</script>', alternativeObjectives: [{ label: 'Validate Forecast', reasonAgainst: 'Hidden evidence is stronger.' }] },
    diagnosis: { primaryDiagnosisLabel: 'Possible Hidden Event', confidence: 0.62, rationale: 'hidden event follow-up' },
    objectiveTransition: { transitionId: 'switchToConfirmHiddenEvent', fromObjectiveId: 'validateForecast', toObjectiveId: 'confirmHiddenEvent' }
  },
  nextLegHandoff: { recommendedObjectiveLabel: 'Confirm Hidden Event' }
});
for (const text of ['Evidence Summary', 'Forecast Update', 'Discovery Update', 'Mission Manager Recommendation', 'does not generate a route', 'player or solver still plans']) {
  assert.ok(html.includes(text), `expected panel text: ${text}`);
}
assert.equal(html.includes('<script>alert(1)</script>'), false);
assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert.equal(html.includes('<unsafe>'), false);

console.log('smoke_adaptive_science_panel_html: ok');