#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { buildHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessRoundtrip.js';
import { writeHeadlessBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const args = parseArgs(process.argv.slice(2));
if (!args.packetPath || !args.planPath || !args.out) {
  usage();
  process.exit(2);
}

try {
  const packet = JSON.parse(fs.readFileSync(args.packetPath, 'utf8'));
  const plan = JSON.parse(fs.readFileSync(args.planPath, 'utf8'));
  const roundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, {
    oracle: args.oracle,
    agentId: args.agentId,
    seed: args.seed,
    outputDir: args.out,
    includeHiddenTruth: args.includeHiddenTruth,
    allowInvalidPlan: args.allowInvalidPlan,
    allowVisibilityFailures: args.allowVisibilityFailures
  });
  fs.mkdirSync(args.out, { recursive: true });
  const bundleSummary = writeHeadlessBundle(roundtrip.episode, args.out, {
    includeHiddenTruth: args.includeHiddenTruth,
    combinedJson: args.combinedJson !== false,
    roundtripReport: roundtrip.report
  });
  const report = {
    ...roundtrip.report,
    output: {
      ...roundtrip.report.output,
      outputDir: args.out,
      combinedBundlePath: bundleSummary.combinedBundle ? path.join(args.out, 'bundle.json') : null,
      roundtripReportPath: path.join(args.out, 'roundtrip_report.json'),
      hiddenTruthExported: bundleSummary.hiddenTruthExported,
      files: bundleSummary.files
    }
  };
  fs.writeFileSync(path.join(args.out, 'roundtrip_report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (args.combinedJson !== false) {
    roundtrip.episode.roundtripReport = report;
    writeHeadlessBundle(roundtrip.episode, args.out, {
      includeHiddenTruth: args.includeHiddenTruth,
      combinedJson: true,
      roundtripReport: report
    });
  }
  console.log(JSON.stringify({
    ok: true,
    command: 'roundtrip',
    packet: report.source.packetId,
    plan: report.source.planId,
    selectedAgentId: report.source.selectedAgentId,
    validationStatus: report.planValidation.status,
    visibilityStatus: report.visibilityValidation.status,
    finalScore: report.summary.finalScore,
    observationCount: report.summary.observationCount,
    trackPointCount: report.summary.trackPointCount,
    hiddenTruthExported: report.summary.hiddenTruthExported,
    outputDir: args.out,
    files: report.output.files,
    boundary: report.boundary
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {
    packetPath: null,
    planPath: null,
    out: null,
    combinedJson: true,
    includeHiddenTruth: false,
    oracle: false,
    allowInvalidPlan: false,
    allowVisibilityFailures: false,
    agentId: null,
    seed: null
  };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out') parsed.out = argv[++index];
    else if (arg === '--agent-id') parsed.agentId = argv[++index];
    else if (arg === '--seed') parsed.seed = argv[++index];
    else if (arg === '--oracle') parsed.oracle = true;
    else if (arg === '--include-hidden-truth') parsed.includeHiddenTruth = true;
    else if (arg === '--no-combined-json') parsed.combinedJson = false;
    else if (arg === '--allow-invalid-plan') parsed.allowInvalidPlan = true;
    else if (arg === '--allow-visibility-failures') parsed.allowVisibilityFailures = true;
    else if (arg === '--help' || arg === '-h') parsed.help = true;
    else positional.push(arg);
  }
  [parsed.packetPath, parsed.planPath] = positional;
  if (parsed.help) parsed.packetPath = null;
  return parsed;
}

function usage() {
  console.error('Usage: node tools/js/headless_roundtrip.mjs anchor.solver-packet.json anchor.plan.json --out runs/h3-roundtrip [--agent-id glider_01] [--seed seed] [--oracle] [--include-hidden-truth] [--no-combined-json]');
}