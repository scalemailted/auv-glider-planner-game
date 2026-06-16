#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessRoundtrip.js';
import { HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, isHeadlessRoundtripReportType, normalizeHeadlessRoundtripReportType } from '../../src/core/headless/HeadlessRoundtripTypes.js';
import { headlessRoundtripSummary, runHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessSolverRoundtrip.js';

const packet = readJson('docs/examples/headless_solver_packet.example.json');
const plan = readJson('docs/examples/headless_solver_plan.example.json');
const roundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, { seed: 'h3.1-contract-smoke', includeHiddenTruth: false });
const aliasRoundtrip = runHeadlessSolverPacketRoundtrip(packet, plan, { seed: 'h3.1-contract-smoke', includeHiddenTruth: false });
assert.equal(roundtrip.report.type, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, 'report uses canonical type');
assert.equal(roundtrip.report.legacyType, HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE, 'report keeps legacy type metadata');
assert.equal(isHeadlessRoundtripReportType(roundtrip.report.type), true, 'canonical report type is recognized');
assert.equal(isHeadlessRoundtripReportType(HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE), true, 'legacy report type is recognized');
assert.equal(normalizeHeadlessRoundtripReportType(HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE), HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, 'legacy normalizes to canonical');
assert.equal(roundtrip.visibilityValidation.status, 'PASS', 'visibility validation passes');
assert.equal(roundtrip.planValidation.status, 'PASS', 'plan validation passes');
assert.equal(roundtrip.runtimePlan.generatesRoute, false, 'roundtrip executes submitted plan, not generated route');
assert.equal(roundtrip.report.runtime.usesNewPlanner, false, 'roundtrip does not add planner');
assert.equal(roundtrip.report.runtime.usesPythonSimulator, false, 'roundtrip does not use Python simulator');
assert.equal(roundtrip.report.runtime.usesBrowserOfficialScoring, false, 'roundtrip score is not official browser score');
assert.equal(roundtrip.report.summary.hiddenTruthExported, false, 'public roundtrip does not export hidden truth');
assert.equal(aliasRoundtrip.report.type, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, 'H3.1 wrapper exports canonical report type');
const summary = headlessRoundtripSummary(roundtrip);
assert.equal(summary.status, 'PASS', 'roundtrip summary status');
assert.equal(summary.usesPythonSimulator, false, 'roundtrip summary boundary');

console.log('Headless solver roundtrip contract smoke passed', {
  packetId: roundtrip.report.source.packetId,
  planId: roundtrip.report.source.planId,
  finalScore: roundtrip.report.summary.finalScore
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}