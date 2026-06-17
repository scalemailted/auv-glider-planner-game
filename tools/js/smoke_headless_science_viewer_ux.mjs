import assert from 'node:assert/strict';

import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { buildBrowserHeadlessBundleDebugObject } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';
import { headlessBundleViewerPanelHtml } from '../../src/ui/headless/HeadlessBundleViewerPanel.js';

const bundle = {
  manifest: { type: 'anchor.headless.manifest', scenarioId: 'p10', missionId: 'p10', episodeId: 'p10', seed: 'p10', files: [] },
  visibleFields: { fields: {}, fieldVisibility: {} },
  observations: [],
  gliderTracks: [],
  scoreReport: { notBrowserOfficialScoring: true, educationalHeadlessScoring: true },
  scienceDiagnostics: {
    type: 'anchor.headless.science-diagnostics',
    episodeId: 'p10',
    publicSafe: true,
    hiddenTruthIncluded: false,
    primaryDiagnosis: 'forecastDisplacement',
    primaryDiagnosisLabel: 'Forecast Displacement',
    diagnosisClass: 'forecastCorrection',
    confidence: 0.7,
    recommendedObjectiveId: 'validateForecast',
    forecastCorrection: { status: 'needsCorrection' },
    hiddenEventHypothesis: { status: 'notSupported' },
    usesProductionDataAssimilation: false,
    usesMARL: false
  }
};
const viewModel = buildHeadlessBundleViewModel(bundle);
const html = headlessBundleViewerPanelHtml(viewModel);
for (const text of ['Science Diagnosis', 'Forecast Update', 'Discovery Update', 'not production data assimilation', 'not browser official scoring']) {
  assert.ok(html.includes(text), `expected viewer text: ${text}`);
}
const debug = buildBrowserHeadlessBundleDebugObject(bundle);
assert.equal(debug.hasScienceDiagnostics, true);
assert.equal(debug.scienceDiagnosisIsPlannerAuthority, false);
assert.equal(debug.scienceDiagnosticsPublicSafe, true);
assert.equal(debug.usesProductionDataAssimilation, false);
assert.equal(debug.usesMARL, false);

console.log('smoke_headless_science_viewer_ux: ok');