import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { validateHeadlessBundle } from '../../src/core/headless/HeadlessBundleValidation.js';
import { buildBrowserHeadlessBundleDebugObject, buildBrowserHeadlessBundleSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const PUBLIC_FIXTURE = 'docs/examples/headless_oceanbox_js_public_bundle.example.json';
const payload = JSON.parse(fs.readFileSync(PUBLIC_FIXTURE, 'utf8'));
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
const validation = validateHeadlessBundle(bundle);
assert.notEqual(validation.status, 'FAIL', 'public fixture validates without failures');

const artifact = buildBrowserHeadlessBundleSummaryArtifact(bundle);
assert.equal(artifact.type, 'anchor.browser.headless-bundle-summary', 'browser summary artifact type');
assert.ok(artifact.scenarioId, 'summary includes scenarioId');
assert.ok(artifact.missionId || artifact.episodeId, 'summary includes missionId or episodeId');
assert.ok(artifact.seed, 'summary includes seed');
assert.equal((artifact.visibilitySummary?.visibleFieldIds ?? []).length > 0, true, 'summary includes visible field count');
assert.equal(Number(artifact.observationSummary?.count) > 0, true, 'summary includes observation count');
assert.equal(Number(artifact.trackSummary?.count) > 0, true, 'summary includes track point count');
assert.equal(Number.isFinite(Number(artifact.scoreSummary?.finalScore)), true, 'summary includes finite final score');
assert.equal(artifact.scoreSummary?.headlessScoreIsOfficialBrowserScore, false, 'summary keeps headless score separate from browser official score');
assert.ok((artifact.notA ?? []).includes('not Python simulator'), 'summary states this is not a Python simulator');
assert.equal(JSON.stringify(artifact).includes('T_hiddenTruth'), false, 'public browser summary does not expose T_hiddenTruth');

const debug = buildBrowserHeadlessBundleDebugObject(bundle);
assert.equal(debug.usesPythonSimulator, false, 'debug excludes Python simulator');
assert.equal(debug.usesNodeHeadlessRuntime, true, 'debug marks Node headless runtime');
assert.equal(debug.usesBrowserOfficialScoring, false, 'debug marks headless score as non-official-browser score');

console.log('Headless browser fixture roundtrip smoke passed', {
  scenarioId: artifact.scenarioId,
  seed: artifact.seed,
  visibleFieldCount: artifact.visibilitySummary.visibleFieldIds.length,
  observationCount: artifact.observationSummary.count,
  trackPointCount: artifact.trackSummary.count,
  finalScore: artifact.scoreSummary.finalScore
});