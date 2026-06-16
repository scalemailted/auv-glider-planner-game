#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildBrowserHeadlessBundleSummaryArtifact, buildBrowserHeadlessRoundtripSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';

const packet = readJson('docs/examples/headless_solver_packet.example.json');
const plan = readJson('docs/examples/headless_solver_plan.example.json');
const report = readJson('docs/examples/headless_solver_roundtrip_report.example.json');
const bundlePayload = readJson('docs/examples/headless_solver_roundtrip_bundle.example.json');
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: bundlePayload }]);
const bundleSummary = buildBrowserHeadlessBundleSummaryArtifact(bundle);
const roundtripSummary = buildBrowserHeadlessRoundtripSummaryArtifact(bundle);

assert.equal(packet.visibility?.truthIncluded, false, 'public solver packet does not include truth');
assert.equal(packet.planningData?.hiddenTruthIncluded, false, 'public solver packet planning data does not include hidden truth');
assert.equal(JSON.stringify(packet.planningData?.visibleFields ?? {}).includes('T_hiddenTruth'), false, 'solver-visible fields omit T_hiddenTruth');
assert.equal(JSON.stringify(plan).includes('T_hiddenTruth'), false, 'submitted plan omits T_hiddenTruth');
assert.equal(report.summary?.hiddenTruthExported, false, 'roundtrip report marks hidden truth not exported');
assert.equal(report.hiddenTruthLeakCheck?.solverVisibleHiddenTruthIncluded, false, 'roundtrip report marks no solver-visible hidden truth');
assert.equal(bundle.hiddenFields, null, 'public roundtrip bundle omits hiddenFields');
assert.equal(Object.keys(bundle.visibleFields?.fields ?? {}).includes('T_hiddenTruth'), false, 'public roundtrip visible fields omit T_hiddenTruth');
assert.equal(bundle.manifest?.files?.some((entry) => entry?.path === 'hidden_fields.json'), false, 'public manifest omits hidden_fields.json');
assert.equal(JSON.stringify(bundleSummary).includes('T_hiddenTruth'), false, 'browser bundle summary omits T_hiddenTruth');
assert.equal(JSON.stringify(roundtripSummary).includes('T_hiddenTruth'), false, 'browser roundtrip summary omits T_hiddenTruth');
assert.equal(roundtripSummary.usesPythonSimulator, false, 'roundtrip summary does not claim Python simulator');
assert.equal(roundtripSummary.usesNewPlanner, false, 'roundtrip summary does not claim new planner');
assert.equal(roundtripSummary.usesMARL, false, 'roundtrip summary does not claim MARL/RL');

console.log('Headless roundtrip visibility audit passed', {
  bundleType: bundle.type,
  visibilityRisk: roundtripSummary.visibilityRisk,
  hiddenTruthExported: roundtripSummary.hiddenTruthExported
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}