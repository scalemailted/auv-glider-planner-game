import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { headlessBundleViewerPanelHtml } from '../../src/ui/headless/HeadlessBundleViewerPanel.js';

const payload = JSON.parse(fs.readFileSync('docs/examples/headless_mission_score_bundle.example.json', 'utf8'));
const viewModel = buildHeadlessBundleViewModel(buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]));
const html = headlessBundleViewerPanelHtml(viewModel);
for (const text of ['Mission Outcome Scorecard', 'Composite Outcome Score', 'Score Profile', 'Data Coverage', 'Regret does not imply mathematical optimality', 'This is a shadow benchmark evaluation, not the current official browser score.']) assert.ok(html.includes(text), text);
const unsafe = headlessBundleViewerPanelHtml({ ...viewModel, missionScorecard: { ...viewModel.missionScorecard, strongestOutcome: '<unsafe>' } });
assert.ok(unsafe.includes('&lt;unsafe&gt;'), 'unsafe strings escaped');
console.log('Headless mission score viewer panel smoke passed');