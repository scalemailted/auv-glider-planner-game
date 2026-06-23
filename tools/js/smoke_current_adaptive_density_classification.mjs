import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics, renderSummaryFor } from './flow_r2a5_current_dynamics_helpers.mjs';

const metrics = buildFlowR2A5CurrentDynamicsMetrics({ seed: 'flow-r2a5-2-density' });

function withDensity(density, mode = 'stackedDepthField') {
  const vm = {
    ...metrics.viewModel,
    waterColumn: { ...(metrics.viewModel.waterColumn ?? {}), currentDisplayMode: mode, showContextCurrents: true, currentVectorDensity: density },
    displaySettings: {
      ...(metrics.viewModel.displaySettings ?? {}),
      waterColumn: { ...(metrics.viewModel.displaySettings?.waterColumn ?? {}), currentDisplayMode: mode, showContextCurrents: true, currentVectorDensity: density }
    }
  };
  return renderSummaryFor(vm, mode);
}

const sparse = withDensity('sparse');
const balanced = withDensity('balanced');
const source = withDensity('sourceDensity');

for (const [label, summary] of [['sparse', sparse], ['balanced', balanced], ['source', source]]) {
  assert.equal(summary.currentSampleConservationCheck, true, `${label} density conserves classified current samples`);
  assert.ok(summary.sourceVectorSampleCount > 0, `${label} density has source vectors`);
  assert.ok(summary.visibleVectorInstanceCount > 0, `${label} density renders visible glyphs`);
  assert.equal(summary.glyphDrawCallCount, 1, `${label} density remains one instanced draw call`);
  assert.equal(summary.noPerVectorThreeObjects, true, `${label} density avoids per-vector Three objects`);
  assert.equal(summary.rendererOwnsCurrent, false, `${label} density does not create currents`);
  assert.equal(summary.changesOfficialScoring, false, `${label} density does not change scoring`);
}

assert.ok(balanced.visibleVectorInstanceCount >= sparse.visibleVectorInstanceCount, 'balanced density renders at least as many glyphs as sparse');
assert.ok(source.visibleVectorInstanceCount >= balanced.visibleVectorInstanceCount, 'source density renders at least as many glyphs as balanced');
assert.ok(source.sourceVectorSampleCount >= source.visibleVectorInstanceCount, 'source count includes all classified source vectors');
assert.ok(sparse.hiddenByDensityCount >= 0, 'sparse density reports density-filtered vectors');
assert.ok(balanced.directionalRenderedCount > 0, 'balanced density renders directional glyphs');
assert.ok(balanced.calmRenderedCount > 0, 'balanced density renders calm markers');
assert.ok(balanced.visibleDepthCount >= 3, 'stacked balanced density shows multiple physical depth layers');

console.log('[smoke_current_adaptive_density_classification] PASS', {
  sparse: { visible: sparse.visibleVectorInstanceCount, hiddenByDensity: sparse.hiddenByDensityCount },
  balanced: { visible: balanced.visibleVectorInstanceCount, source: balanced.sourceVectorSampleCount, layers: balanced.visibleDepthCount },
  source: { visible: source.visibleVectorInstanceCount, source: source.sourceVectorSampleCount }
});