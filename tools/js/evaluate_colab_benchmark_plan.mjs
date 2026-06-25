#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { decodeArtifact, DecodeStatus, inspectArtifact } from '../../packages/codecs/src/index.js';
import { stableDigest } from '../../packages/contracts/src/index.js';
import { buildHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessRoundtrip.js';
import { writeHeadlessBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const args = parseArgs(process.argv.slice(2));

try {
  if (args.help || !args.solverPacket || !args.plan) {
    printUsage();
    process.exit(args.help ? 0 : 2);
  }
  const started = performance.now();
  const packet = readJson(args.solverPacket);
  const plan = readJson(args.plan);
  const packetDecode = decodeArtifact(packet, { kind: 'solverPacket' });
  const planDecode = decodeArtifact(plan, { kind: 'externalSolverPlan' });
  if (packetDecode.status === DecodeStatus.REJECTED) throw new Error(`Solver packet codec validation failed: ${firstFailure(packetDecode)}`);
  if (planDecode.status === DecodeStatus.REJECTED) throw new Error(`Plan codec validation failed: ${firstFailure(planDecode)}`);

  const outputDir = args.out ?? fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-colab-benchmark-'));
  const roundtripStart = performance.now();
  const roundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, {
    seed: args.seed ?? packet.stochasticConfig?.seed ?? packet.packetId ?? 'colab-bench-r1',
    agentId: args.agentId,
    oracle: args.oracle,
    outputDir,
    includeHiddenTruth: args.includeHiddenTruth === true,
    allowInvalidPlan: false,
    allowVisibilityFailures: false,
    motionAware: args.motionAware,
    motionModelId: args.motionModelId,
    missionScoreEnabled: true,
    scoreProfile: args.scoreProfile ?? packet.scoreProfileId ?? 'balancedMission',
    regretReference: args.regretReference ?? 'none',
    scoreAllowRefereeMetrics: true
  });
  const roundtripSeconds = (performance.now() - roundtripStart) / 1000;
  fs.mkdirSync(outputDir, { recursive: true });
  const includeHiddenTruth = args.includeHiddenTruth === true;
  const bundleSummary = writeHeadlessBundle(roundtrip.episode, outputDir, {
    includeHiddenTruth,
    combinedJson: true,
    roundtripReport: roundtrip.report,
    publicPlayback: true,
    checkpointEvery: args.checkpointEvery
  });
  const reportPath = path.join(outputDir, 'roundtrip_report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(roundtrip.report, null, 2)}\n`, 'utf8');
  const benchmarkRecord = buildBenchmarkRecord({
    packet,
    plan,
    packetDecode,
    planDecode,
    roundtrip,
    outputDir,
    roundtripSeconds,
    totalSeconds: (performance.now() - started) / 1000
  });
  const recordPath = path.join(outputDir, 'benchmark_record.json');
  fs.writeFileSync(recordPath, `${JSON.stringify(benchmarkRecord, null, 2)}\n`, 'utf8');
  const summary = {
    ok: true,
    command: 'evaluate-colab-benchmark-plan',
    packetPath: args.solverPacket,
    planPath: args.plan,
    outputDir,
    validationStatus: roundtrip.report.planValidation?.status ?? null,
    visibilityStatus: roundtrip.report.visibilityValidation?.status ?? null,
    finalScore: roundtrip.report.summary?.finalScore ?? null,
    scoreProfileId: roundtrip.report.summary?.scoreProfileId ?? roundtrip.report.runtime?.scoreProfileId ?? args.scoreProfile ?? packet.scoreProfileId ?? null,
    plannerId: benchmarkRecord.planner.plannerId,
    plannerOptimalityStatus: benchmarkRecord.planner.optimalityStatus,
    fairnessClass: benchmarkRecord.planner.fairnessClass,
    hiddenTruthExported: includeHiddenTruth,
    files: {
      bundle: path.join(outputDir, 'bundle.json'),
      roundtripReport: reportPath,
      benchmarkRecord: recordPath,
      bundleFiles: bundleSummary.files
    },
    benchmarkRecordDigest: stableDigest(benchmarkRecord),
    boundary: 'Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.'
  };
  fs.writeFileSync(path.join(outputDir, 'benchmark_summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    command: 'evaluate-colab-benchmark-plan',
    error: error?.message ?? String(error),
    boundary: 'This tool evaluates a submitted plan through existing ANCHOR codec/headless runtime paths; it does not implement a planner, simulator, or scorer.'
  }, null, 2));
  process.exit(1);
}

function buildBenchmarkRecord({ packet, plan, packetDecode, planDecode, roundtrip, outputDir, roundtripSeconds, totalSeconds }) {
  const planner = plan.planner ?? plan.meta?.planner ?? {};
  const summary = roundtrip.report.summary ?? {};
  const missionOutcome = roundtrip.report.missionOutcomeSummary ?? {};
  const scoreSummary = roundtrip.report.episode?.scoreSummary ?? {};
  const scoreProfileId = summary.scoreProfileId ?? missionOutcome.scoreProfileId ?? packet.scoreProfileId ?? 'balancedMission';
  const scoreProfileVersion = summary.scoreProfileVersion ?? missionOutcome.scoreProfileVersion ?? packet.scoreProfileVersion ?? 'score-pkg-r1';
  return {
    schemaVersion: 'benchmark-run-record-p2',
    type: 'anchor.benchmark.run-record',
    benchmarkVersion: 'colab-bench-r1',
    benchmarkId: 'colab-classical-planner-benchmark',
    runId: `colab-bench-r1-${planner.name ?? planner.plannerId ?? plan.planId ?? 'submitted-plan'}`,
    source: {
      solverPacketPath: args.solverPacket,
      planPath: args.plan,
      outputDir,
      packetId: packet.packetId ?? null,
      planId: plan.planId ?? plan.id ?? null
    },
    planner: {
      plannerId: String(planner.name ?? planner.plannerId ?? plan.planId ?? 'unknown'),
      plannerLabel: planner.label ?? planner.name ?? 'Unknown planner',
      plannerClass: planner.plannerClass ?? 'classical',
      optimalityStatus: planner.optimalityStatus ?? 'UNKNOWN',
      fairnessClass: plan.fairnessClass ?? packet.fairnessClass ?? packet.visibility?.fairnessClass ?? 'FORECAST_ONLY',
      usesForecast: planner.usesForecast !== false,
      usesTruth: planner.usesTruth === true,
      usesOracle: planner.usesOracle === true
    },
    problem: {
      solverPacketDigest: packetDecode.payloadDigest ?? stableDigest(packet),
      environmentDigest: packet.environmentDigest ?? packet.meta?.environmentDigest ?? inspectArtifact(packet).identities?.environmentDigest ?? null,
      missionDigest: packet.missionDigest ?? packet.meta?.missionDigest ?? null,
      validationBaselineDigest: packet.validationBaselineDigest ?? 'fnv1a32:dd016175',
      scoreProfileId,
      scoreProfileVersion
    },
    timing: {
      plannerSolveTimeSeconds: plan.meta?.plannerSolveTimeSeconds ?? null,
      validationTimeSeconds: null,
      simulationTimeSeconds: roundtripSeconds,
      scoringTimeSeconds: null,
      totalEvaluationTimeSeconds: totalSeconds
    },
    search: {
      nodesExpanded: plan.meta?.nodesExpanded ?? null,
      edgesEvaluated: plan.meta?.edgesEvaluated ?? null,
      maximumFrontierSize: plan.meta?.maximumFrontierSize ?? null,
      prunedStateCount: plan.meta?.prunedStateCount ?? null,
      timeout: Boolean(plan.meta?.timeout)
    },
    artifacts: {
      planDigest: planDecode.payloadDigest ?? stableDigest(plan),
      simulationInputDigest: roundtrip.report.runtime?.config?.configDigest ?? null,
      simulationResultDigest: stableDigest(roundtrip.episode),
      scoreProfileId,
      scoreProfileVersion,
      scoreResultDigest: scoreSummary.resultDigest ?? roundtrip.episode?.scoreReport?.resultDigest ?? null
    },
    outcome: {
      officialScore: summary.finalScore ?? scoreSummary.finalScore ?? null,
      scienceScore: summary.scienceScore ?? missionOutcome.scienceScore ?? null,
      missionDurationSeconds: roundtrip.episode?.durationSeconds ?? roundtrip.episode?.config?.durationSeconds ?? null,
      energyUsed: missionOutcome.energyUsed ?? null,
      waypointCompletion: missionOutcome.waypointCompletion ?? null,
      hazardCount: missionOutcome.hazardCount ?? null,
      minimumTerrainClearanceMeters: missionOutcome.minimumTerrainClearanceMeters ?? null,
      depthCoverage: summary.waterColumnVerticalCoverage ?? roundtrip.report.waterColumnSummary?.verticalCoverage ?? null,
      sampleCount: summary.observationCount ?? null,
      terminalReason: roundtrip.episode?.terminalReason ?? null
    },
    boundary: 'Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.',
    notes: [
      'This benchmark record wraps an ANCHOR authoritative headless evaluation of a submitted plan.',
      'Python planning costs, if present, are not official scores.'
    ]
  };
}

function parseArgs(argv) {
  const parsed = {
    solverPacket: null,
    plan: null,
    out: null,
    seed: null,
    agentId: null,
    oracle: false,
    includeHiddenTruth: false,
    scoreProfile: null,
    regretReference: 'none',
    checkpointEvery: null,
    motionAware: false,
    motionModelId: null,
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--solver-packet') parsed.solverPacket = argv[++index];
    else if (arg === '--plan') parsed.plan = argv[++index];
    else if (arg === '--out') parsed.out = argv[++index];
    else if (arg === '--seed') parsed.seed = argv[++index];
    else if (arg === '--agent-id') parsed.agentId = argv[++index];
    else if (arg === '--oracle') parsed.oracle = true;
    else if (arg === '--include-hidden-truth') parsed.includeHiddenTruth = true;
    else if (arg === '--score-profile') parsed.scoreProfile = argv[++index];
    else if (arg === '--regret-reference') parsed.regretReference = argv[++index];
    else if (arg === '--checkpoint-every') parsed.checkpointEvery = Number(argv[++index]);
    else if (arg === '--motion-aware') parsed.motionAware = true;
    else if (arg === '--motion-model') parsed.motionModelId = argv[++index];
    else if (arg === '--help' || arg === '-h') parsed.help = true;
    else throw new Error(`Unknown argument ${arg}`);
  }
  return parsed;
}

function firstFailure(result) {
  return result.failures?.[0]?.message ?? result.validationReport?.failures?.[0]?.message ?? 'unknown failure';
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function printUsage() {
  console.log(`Usage:
  node tools/js/evaluate_colab_benchmark_plan.mjs --solver-packet tests/fixtures/colab_benchmark/static_additive_routing_solver_packet.json --plan tests/fixtures/colab_benchmark/plans/static_additive_astar.anchor.plan.json --out tmp/colab-benchmark-eval

This tool validates a solver packet and submitted anchor.plan through CODEC-R1
and the existing ANCHOR headless roundtrip runtime, then writes bundle.json,
roundtrip_report.json, benchmark_record.json, and benchmark_summary.json.`);
}

