import assert from 'node:assert/strict';

import { runAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';
import { adaptiveBenchmarkViewModelSummary, buildAdaptiveBenchmarkViewModel } from '../../src/core/benchmark/AdaptiveBenchmarkViewModel.js';

const fixture = runAdaptiveManagerFixture('shiftedFrontForecastError');
const viewModel = buildAdaptiveBenchmarkViewModel({
  managerConfig: fixture.managerConfig,
  managerState: fixture.managerState,
  evidence: fixture.evidence,
  diagnosis: fixture.diagnosis,
  transition: fixture.transition,
  fixture
});
assert.equal(viewModel.currentObjective.id, 'mapBoundary', 'view model renders current objective');
assert.equal(viewModel.recommendedObjective.id, 'validateForecast', 'view model renders recommended objective');
assert.equal(viewModel.diagnosis.id, 'likelyForecastError', 'diagnosis card exists');
assert.ok(viewModel.evidenceCards.length >= 6, 'evidence cards exist');
for (const item of ['route planning', 'mission scoring', 'MARL/RL']) {
  assert.ok(viewModel.notImplemented.includes(item), `notImplemented includes ${item}`);
}
const summary = adaptiveBenchmarkViewModelSummary(viewModel);
assert.equal(summary.usesRoutePlanning, false, 'summary excludes route planning');
assert.equal(summary.usesMissionScoring, false, 'summary excludes mission scoring');
assert.equal(summary.usesMARL, false, 'summary excludes MARL');

console.log('smoke_adaptive_benchmark_view_model: ok');
