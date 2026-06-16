import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { buildBrowserHeadlessBundleSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const episode = runHeadlessMission({ scenario: 'coastalBloomFront', seed: 'p9-science-headless-smoke', width: 10, height: 8 });
assert.equal(episode.scienceDiagnostics?.type, 'anchor.headless.science-diagnostics', 'episode has science diagnostics');
assert.equal(JSON.stringify(episode.scienceDiagnostics).includes('T_hiddenTruth'), false, 'science diagnostics omit hidden truth id');
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
assert.ok(files['science_diagnostics.json'], 'bundle includes science_diagnostics.json');
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: files['bundle.json'] }]);
assert.equal(bundle.scienceDiagnostics?.type, 'anchor.headless.science-diagnostics', 'loader preserves science diagnostics');
const viewModel = buildHeadlessBundleViewModel(bundle);
assert.equal(viewModel.scienceDiagnosisSummary.present, true, 'view model exposes science summary');
const artifact = buildBrowserHeadlessBundleSummaryArtifact(bundle);
assert.equal(artifact.scienceDiagnosisSummary.present, true, 'browser summary exposes science summary');
assert.equal(artifact.scienceDiagnosisSummary.usesProductionDataAssimilation, false, 'browser summary has no production assimilation');
assert.equal(JSON.stringify(artifact).includes('T_hiddenTruth'), false, 'browser science summary omits hidden truth id');

console.log('smoke_headless_science_diagnostics: ok', { primary: artifact.scienceDiagnosisSummary.primaryDiagnosis });
