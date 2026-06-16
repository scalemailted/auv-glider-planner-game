#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildBrowserHeadlessBundleDebugObject, buildBrowserHeadlessRoundtripSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';

const packet = readJson('docs/examples/headless_solver_packet.example.json');
const plan = readJson('docs/examples/headless_solver_plan.example.json');
const report = readJson('docs/examples/headless_solver_roundtrip_report.example.json');
const bundlePayload = readJson('docs/examples/headless_solver_roundtrip_bundle.example.json');
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: bundlePayload }]);
const viewModel = buildHeadlessBundleViewModel(bundle);
const debug = buildBrowserHeadlessBundleDebugObject(bundle);
const summary = buildBrowserHeadlessRoundtripSummaryArtifact(bundle);

assert.equal(packet.type, 'anchor.solverPacket', 'solver packet fixture type');
assert.equal(plan.type, 'anchor.plan', 'plan fixture type');
assert.equal(report.type, 'anchor.headless.solver-roundtrip-report', 'report fixture type');
assert.equal(bundlePayload.type, 'anchor.headless.solver-roundtrip-bundle', 'bundle fixture type');
assert.deepEqual(bundle.failures, [], 'bundle fixture loads without failures');
assert.equal(viewModel.roundtripSummary.present, true, 'view model sees roundtrip report');
assert.equal(debug.roundtripLoaded, true, 'debug object sees roundtrip report');
assert.equal(debug.roundtripSummaryExportAvailable, true, 'debug object exposes roundtrip summary export');
assert.equal(summary.type, 'anchor.browser.headless-roundtrip-summary', 'browser roundtrip summary type');
assert.equal(summary.hiddenTruthExported, false, 'fixture public summary omits hidden truth');
assert.equal(JSON.stringify(summary).includes('T_hiddenTruth'), false, 'browser roundtrip summary omits T_hiddenTruth');

console.log('Headless roundtrip fixtures smoke passed', {
  reportType: report.type,
  bundleType: bundlePayload.type,
  status: viewModel.roundtripSummary.status
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}