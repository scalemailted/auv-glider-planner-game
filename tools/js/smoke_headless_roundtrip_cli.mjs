import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildBrowserHeadlessBundleSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-h3-roundtrip-smoke-'));
const stdout = execFileSync(process.execPath, [
  'tools/js/headless_roundtrip.mjs',
  'tools/js/examples/sample_solver_packet.json',
  'tools/js/examples/sample_headless_roundtrip_plan.json',
  '--out',
  outputDir
], { encoding: 'utf8' });
const cliSummary = JSON.parse(stdout);
assert.equal(cliSummary.ok, true, 'CLI exits with ok summary');
assert.equal(cliSummary.validationStatus, 'PASS', 'CLI plan validation passes');
assert.equal(cliSummary.visibilityStatus, 'PASS', 'CLI visibility validation passes');
assert.equal(cliSummary.hiddenTruthExported, false, 'CLI default is public hidden-truth-safe export');

const expectedFiles = ['bundle.json', 'manifest.json', 'visible_fields.json', 'roundtrip_report.json', 'score_report.json'];
for (const fileName of expectedFiles) assert.equal(fs.existsSync(path.join(outputDir, fileName)), true, `${fileName} written`);
assert.equal(fs.existsSync(path.join(outputDir, 'hidden_fields.json')), false, 'public CLI roundtrip omits hidden_fields.json');

const report = JSON.parse(fs.readFileSync(path.join(outputDir, 'roundtrip_report.json'), 'utf8'));
assert.equal(report.type, 'anchor.headless.solver-roundtrip-report', 'roundtrip report type');
assert.equal(report.summary.status, 'PASS', 'roundtrip report status');
assert.equal(report.runtime.usesNodeHeadlessRuntime, true, 'report marks Node runtime');
assert.equal(report.runtime.usesNewPlanner, false, 'report does not claim new planner');
assert.equal(report.runtime.usesPythonSimulator, false, 'report does not claim Python simulator');
assert.equal(report.summary.hiddenTruthExported, false, 'report marks public hidden export');

const bundle = JSON.parse(fs.readFileSync(path.join(outputDir, 'bundle.json'), 'utf8'));
assert.equal(bundle.type, 'anchor.headless.solver-roundtrip-bundle', 'roundtrip bundle type');
assert.equal(bundle.hiddenFields, null, 'combined bundle omits hiddenFields');
assert.equal(bundle.roundtripReport?.type, 'anchor.headless.solver-roundtrip-report', 'combined bundle embeds report');
const loaded = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: bundle }]);
assert.deepEqual(loaded.failures, [], 'browser loader accepts CLI roundtrip bundle');
const artifact = buildBrowserHeadlessBundleSummaryArtifact(loaded);
assert.equal(artifact.roundtripSummary.status, 'PASS', 'browser summary sees roundtrip report');
assert.equal(artifact.scoreSummary.headlessScoreIsOfficialBrowserScore, false, 'browser summary keeps score boundary');
assert.equal(JSON.stringify(artifact).includes('T_hiddenTruth'), false, 'public browser summary does not expose T_hiddenTruth');

console.log('Headless solver-packet roundtrip CLI smoke passed', {
  outputDir,
  finalScore: report.summary.finalScore,
  files: cliSummary.files.length
});