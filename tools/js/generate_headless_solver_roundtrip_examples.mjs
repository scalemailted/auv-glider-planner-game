#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { buildHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessRoundtrip.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const CREATED_AT = '2026-06-16T00:00:00.000Z';
const SEED = 'h3.1-roundtrip-example-001';
const OUTPUT_DIR = 'docs/examples';
const PACKET_PATH = path.join(OUTPUT_DIR, 'headless_solver_packet.example.json');
const PLAN_PATH = path.join(OUTPUT_DIR, 'headless_solver_plan.example.json');
const REPORT_PATH = path.join(OUTPUT_DIR, 'headless_solver_roundtrip_report.example.json');
const BUNDLE_PATH = path.join(OUTPUT_DIR, 'headless_solver_roundtrip_bundle.example.json');

const packet = readJson('tools/js/examples/sample_solver_packet.json');
const plan = readJson('tools/js/examples/sample_headless_roundtrip_plan.json');

packet.packetId = 'H3-1-SOLVER-PACKET-EXAMPLE';
packet.createdAt = CREATED_AT;
packet.instanceId = 'H3-1-ROUNDTRIP-EXAMPLE';
packet.challengeId = 'H3-1-ROUNDTRIP-EXAMPLE';
packet.stochasticConfig = { ...(packet.stochasticConfig ?? {}), seed: SEED };
packet.visibility = {
  ...(packet.visibility ?? {}),
  truthIncluded: false,
  forecastIncluded: true,
  oracleMode: false,
  publicChallenge: true
};
packet.truthVisibility = 'hidden';
packet.planningData = {
  ...(packet.planningData ?? {}),
  hiddenTruthIncluded: false,
  forecastAvailable: true
};

plan.planId = 'h3-1-solver-roundtrip-plan-example';
plan.instanceId = packet.instanceId;
plan.challengeId = packet.challengeId;
plan.meta = {
  ...(plan.meta ?? {}),
  name: 'H3.1 Solver Roundtrip Plan Example',
  createdAt: CREATED_AT,
  replaySeedAnchor: packet.instanceId,
  generationVersion: 'h3.1-roundtrip-example',
  fairness: {
    usesForecast: true,
    usesTruth: false,
    usesOracle: false,
    note: 'Deterministic checked-in example for solver packet -> plan -> Node headless bundle roundtrip compatibility.'
  }
};

const roundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, {
  seed: SEED,
  outputDir: OUTPUT_DIR,
  includeHiddenTruth: false,
  createdAt: CREATED_AT
});
const report = {
  ...roundtrip.report,
  createdAt: CREATED_AT,
  output: {
    ...roundtrip.report.output,
    outputDir: OUTPUT_DIR,
    combinedBundlePath: BUNDLE_PATH,
    roundtripReportPath: REPORT_PATH,
    hiddenTruthExported: false,
    files: [
      'bundle.json',
      'manifest.json',
      'mission_config.json',
      'visible_fields.json',
      'observations.json',
      'observations.csv',
      'glider_tracks.json',
      'glider_tracks.csv',
      'score_report.json',
      'science_diagnostics.json',
      'replay.json',
      'episode.json',
      'roundtrip_report.json'
    ]
  }
};
roundtrip.episode.roundtripReport = report;
const bundle = createHeadlessCombinedBundle(roundtrip.episode, {
  includeHiddenTruth: false,
  combinedJson: true,
  createdAt: CREATED_AT,
  roundtripReport: report
});

assertPublicFixture(packet, plan, report, bundle);
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
writeJson(PACKET_PATH, packet);
writeJson(PLAN_PATH, plan);
writeJson(REPORT_PATH, report);
writeJson(BUNDLE_PATH, bundle);

console.log(JSON.stringify({
  ok: true,
  packet: PACKET_PATH,
  plan: PLAN_PATH,
  report: REPORT_PATH,
  bundle: BUNDLE_PATH,
  reportType: report.type,
  bundleType: bundle.type,
  finalScore: report.summary.finalScore,
  hiddenTruthExported: report.summary.hiddenTruthExported
}, null, 2));

function assertPublicFixture(packet, plan, report, bundle) {
  const visibleFieldIds = Object.keys(bundle.visibleFields?.fields ?? {});
  if (packet.planningData?.hiddenTruthIncluded) throw new Error('Example solver packet marks hiddenTruthIncluded=true.');
  if (packet.visibility?.truthIncluded) throw new Error('Example solver packet marks truthIncluded=true.');
  if (JSON.stringify(packet.planningData?.visibleFields ?? {}).includes('T_hiddenTruth')) throw new Error('Example solver packet planning data leaks T_hiddenTruth.');
  if (JSON.stringify(plan).includes('T_hiddenTruth')) throw new Error('Example plan leaks T_hiddenTruth.');
  if (bundle.hiddenFields !== null) throw new Error('Public roundtrip bundle must omit hiddenFields.');
  if (visibleFieldIds.includes('T_hiddenTruth')) throw new Error('Public roundtrip visible fields include T_hiddenTruth.');
  if (bundle.manifest?.files?.some((entry) => entry?.path === 'hidden_fields.json')) throw new Error('Public roundtrip manifest lists hidden_fields.json.');
  if (report.summary?.hiddenTruthExported !== false) throw new Error('Public roundtrip report must mark hiddenTruthExported=false.');
  if (report.hiddenTruthLeakCheck?.solverVisibleHiddenTruthIncluded !== false) throw new Error('Public roundtrip report detected solver-visible hidden truth.');
  if (bundle.scienceDiagnostics?.type !== 'anchor.headless.science-diagnostics') throw new Error('Public roundtrip bundle must include P9 science diagnostics.');
  if (report.scienceDiagnosticsSummary?.present !== true) throw new Error('Public roundtrip report must include P9 science diagnostics summary.');
  if (JSON.stringify(bundle.scienceDiagnostics).includes('T_hiddenTruth')) throw new Error('Public roundtrip science diagnostics leak T_hiddenTruth.');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

