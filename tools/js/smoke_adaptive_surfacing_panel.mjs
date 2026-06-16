import assert from 'node:assert/strict';

import { adaptiveSurfacingPanelHtml } from '../../src/ui/benchmark/AdaptiveSurfacingPanel.js';

const html = adaptiveSurfacingPanelHtml({
  decision: {
    warnings: ['partial'],
    evidence: { observationCount: 4, recentObservationCount: 2, meanUncertainty: 0.4, forecastErrorScore: 0.2, hiddenEventConfidence: 0.8, diagnostics: { partialEvidence: true } },
    previousObjective: { label: '<img src=x onerror=alert(1)>' },
    recommendedObjective: { label: 'Confirm Hidden Event' },
    diagnosis: { primaryDiagnosisLabel: 'Possible Hidden Event', confidence: 0.77, rationale: '<script>alert(1)</script>' },
    objectiveTransition: { type: 'anchor.benchmark.adaptive-objective-transition', transitionId: 'switchToConfirmHiddenEvent', fromObjectiveId: 'validateForecast', toObjectiveId: 'confirmHiddenEvent' }
  },
  nextLegHandoff: { recommendedObjectiveLabel: 'Confirm Hidden Event' }
});
assert(html.includes('Adaptive Benchmark Surfacing Review'));
assert(html.includes('Evidence Summary'));
assert(html.includes('Diagnosis'));
assert(html.includes('Recommended Next Objective'));
assert(html.includes('Plan Next Leg'));
assert(html.includes('new route planner'));
assert(html.includes('MARL/RL'));
assert(!html.includes('<script>alert(1)</script>'));
assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert(!html.includes('<img src=x'));

console.log('smoke_adaptive_surfacing_panel: ok');
