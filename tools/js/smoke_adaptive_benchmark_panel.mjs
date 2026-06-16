import assert from 'node:assert/strict';

import { runAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';
import { buildAdaptiveBenchmarkViewModel } from '../../src/core/benchmark/AdaptiveBenchmarkViewModel.js';
import { adaptiveBenchmarkPanelHtml } from '../../src/ui/benchmark/AdaptiveBenchmarkPanel.js';

const fixture = runAdaptiveManagerFixture('possibleHiddenPlume');
const viewModel = buildAdaptiveBenchmarkViewModel({
  managerConfig: fixture.managerConfig,
  managerState: fixture.managerState,
  evidence: fixture.evidence,
  diagnosis: fixture.diagnosis,
  transition: fixture.transition,
  fixture
});
const html = adaptiveBenchmarkPanelHtml(viewModel);
for (const text of ['Adaptive Benchmark', 'Mission Manager', 'Diagnosis', 'Recommended Objective', 'Objective Authority', 'Route Authority']) {
  assert.ok(html.includes(text), `HTML includes ${text}`);
}
assert.ok(html.includes('route planning'), 'HTML includes no route planning boundary');
assert.ok(html.includes('MARL/RL'), 'HTML includes no MARL/RL boundary');
assert.ok(html.includes('Adaptive Benchmark gives objective authority to a transparent mission manager. The player or solver still chooses the route.'), 'required authority copy exists');
assert.ok(html.includes('P6 does not implement full route execution for adaptive missions, new route planning, scoring redesign, or MARL/RL.'), 'required P6 boundary copy exists');

const unsafe = adaptiveBenchmarkPanelHtml({
  currentObjective: { label: '<script>alert(1)</script>' },
  diagnosis: { label: '<img src=x>', confidence: 0 },
  recommendedObjective: { label: '<b>bad</b>' },
  objectiveTransition: { transitionId: 'x', fromObjectiveLabel: '<x>', toObjectiveLabel: '<y>' },
  boundaryFlags: { objectiveAuthority: 'missionManager', routeAuthority: 'playerOrSolver' },
  explanation: '<script>bad()</script>',
  scoreCards: [],
  evidenceCards: [],
  objectiveHistory: [],
  implementedNow: [],
  notImplemented: ['route planning', 'MARL/RL']
});
assert.equal(unsafe.includes('<script>'), false, 'unsafe text is escaped');
assert.ok(unsafe.includes('&lt;script&gt;'), 'escaped script text is present');

console.log('smoke_adaptive_benchmark_panel: ok');
