#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildBrowserHeadlessRoundtripSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { buildHeadlessRoundtripBrowserSummary, buildHeadlessRoundtripReportArtifact, validateHeadlessRoundtripExport } from '../../src/core/headless/HeadlessRoundtripExport.js';
import { BROWSER_HEADLESS_ROUNDTRIP_SUMMARY_TYPE, HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE } from '../../src/core/headless/HeadlessRoundtripTypes.js';

const report = readJson('docs/examples/headless_solver_roundtrip_report.example.json');
const bundlePayload = readJson('docs/examples/headless_solver_roundtrip_bundle.example.json');
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: bundlePayload }]);
const viewModel = buildHeadlessBundleViewModel(bundle);
const browserSummary = buildBrowserHeadlessRoundtripSummaryArtifact(bundle);
const directSummary = buildHeadlessRoundtripBrowserSummary(report);

assert.equal(report.type, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, 'fixture report is canonical');
assert.deepEqual(bundle.failures, [], 'browser loader accepts roundtrip bundle');
assert.equal(viewModel.roundtripSummary.canonicalType, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, 'view-model canonicalizes report');
assert.equal(browserSummary.type, BROWSER_HEADLESS_ROUNDTRIP_SUMMARY_TYPE, 'browser roundtrip summary type');
assert.equal(browserSummary.usesPythonSimulator, false, 'browser summary marks no Python simulator');
assert.equal(browserSummary.usesBrowserOfficialScoring, false, 'browser summary marks no official browser scoring');
assert.equal(browserSummary.usesNewPlanner, false, 'browser summary marks no new planner');
assert.equal(JSON.stringify(browserSummary).includes('T_hiddenTruth'), false, 'browser summary omits T_hiddenTruth');
assert.equal(directSummary.type, BROWSER_HEADLESS_ROUNDTRIP_SUMMARY_TYPE, 'roundtrip export helper summary type');
assert.equal(validateHeadlessRoundtripExport(report).ok, true, 'canonical report validates');
const legacy = buildHeadlessRoundtripReportArtifact({ ...report, type: HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE });
assert.equal(legacy.type, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, 'legacy report artifact normalizes to canonical');
assert.equal(validateHeadlessRoundtripExport(legacy).ok, true, 'legacy alias report validates after normalization');

console.log('Headless roundtrip export contract smoke passed', {
  sourceReportType: browserSummary.sourceReportType,
  canonicalReportType: browserSummary.canonicalReportType,
  executionStatus: browserSummary.executionStatus
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}