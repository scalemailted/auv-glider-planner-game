#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { validateHeadlessPlanAgainstMission } from '../../src/core/headless/HeadlessPlanAdapter.js';
import { buildHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessRoundtrip.js';
import { validateSolverPacketForHeadless, solverPacketHeadlessCompatibilitySummary } from '../../src/core/headless/HeadlessSolverPacketAdapter.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig, headlessRuntimeConfigSummary } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { writeHeadlessBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { headlessScoreReportSummary } from '../../src/core/headless/runtime/HeadlessScoring.js';

const args = parseArgs(process.argv.slice(2));

try {
  if (!args.command || args.help) {
    printUsage();
    process.exit(args.command ? 0 : 0);
  }
  if (args.command === 'simulate') runSimulate(args);
  else if (args.command === 'validate-solver-packet') runValidateSolverPacket(args);
  else if (args.command === 'validate-plan') runValidatePlan(args);
  else if (args.command === 'roundtrip') runRoundtrip(args);
  else {
    printUsage();
    process.exit(1);
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, command: args.command ?? null, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
}

function runSimulate(args) {
  const config = createDefaultHeadlessRuntimeConfig({
    seed: args.seed ?? 'demo-001',
    width: args.width,
    height: args.height,
    scenario: args.scenario ?? 'coastalBloomFront',
    depthLayers: args.depthLayers,
    diveProfileId: args.diveProfileId,
    motionAware: args.motionAware,
    motionModelId: args.motionModelId,
    controlStepSeconds: args.controlStepSeconds,
    gliderSpeed: args.gliderSpeed,
    headingRateLimitDegreesPerSecond: args.headingRateLimitDegreesPerSecond,
    driftGain: args.driftGain,
    bathymetry: args.bathymetry,
    bathymetryViewMode: args.bathymetryViewMode,
    verticalExaggeration: args.verticalExaggeration,
    costGraphEnabled: args.costGraph,
    costGraphMetric: args.costGraphMetric,
    costGraphNodeSource: args.costGraphNodeSource,
    costGraphNeighborMode: args.costGraphNeighborMode,
    costGraphGridStep: args.costGraphGridStep,
    costGraphMaxNodes: args.costGraphMaxNodes,
    costGraphRadius: args.costGraphRadius,
    costGraphDepartureTimesSeconds: args.costGraphDepartureTimesSeconds,
    costMatrixFormat: args.costMatrixFormat,
    missionScoreEnabled: args.missionScore,
    scoreProfile: args.scoreProfile,
    regretReference: args.regretReference,
    scoreAllowRefereeMetrics: args.scoreAllowRefereeMetrics
  });
  const episode = runHeadlessMission(config);
  let bundleSummary = null;
  if (!args.summaryOnly) {
    const outputDir = args.out ?? 'tmp/oceanbox-js-demo';
    bundleSummary = writeHeadlessBundle(episode, outputDir, { includeHiddenTruth: !args.noHiddenExport, combinedJson: args.combinedJson });
  }
  console.log(JSON.stringify({
    command: 'simulate',
    ok: true,
    config: headlessRuntimeConfigSummary(config),
    episodeId: episode.episodeId,
    seed: episode.seed,
    finalScore: episode.scoreReport.finalScore,
    observationCount: episode.observations.length,
    trackPointCount: episode.tracks.length,
    score: headlessScoreReportSummary(episode.scoreReport),
    waterColumnSummary: args.waterColumnSummary ? episode.waterColumnSummary : undefined,
    motionSummary: episode.motionTrajectory ? episode.diagnostics?.motionSummary : undefined,
    missionFeasibilitySummary: episode.missionFeasibilitySummary ?? episode.diagnostics?.missionFeasibilitySummary ?? undefined,
    motionCostGraphSummary: episode.motionCostGraphSummary ?? episode.diagnostics?.motionCostGraphSummary ?? undefined,
    motionCostMatrixSummary: episode.motionCostMatrixSummary ?? episode.diagnostics?.motionCostMatrixSummary ?? undefined,
    missionOutcomeSummary: episode.diagnostics?.missionOutcomeSummary ?? undefined,
    missionScoreSummary: episode.diagnostics?.missionScoreSummary ?? undefined,
    bundle: bundleSummary,
    combinedBundle: bundleSummary?.combinedBundle === true,
    boundary: 'Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and browser scoring UI.'
  }, null, 2));
}

function runValidateSolverPacket(args) {
  const packetPath = args.solverPacket ?? args.packetPath ?? args.positionals[0];
  if (!packetPath) throw new Error('validate-solver-packet requires --solver-packet <path>.');
  const packet = readJson(packetPath);
  const validation = validateSolverPacketForHeadless(packet, { oracle: args.oracle });
  const compatibility = solverPacketHeadlessCompatibilitySummary(packet, { oracle: args.oracle });
  console.log(JSON.stringify({
    command: 'validate-solver-packet',
    ok: validation.ok,
    status: validation.status,
    packetPath,
    validation,
    compatibility,
    boundary: 'Validates solver-visible packet fields for Node/OceanBox-JS execution. It does not run a planner or reveal hidden truth.'
  }, null, 2));
  if (!validation.ok) process.exitCode = 1;
}

function runValidatePlan(args) {
  const packetPath = args.solverPacket ?? args.packetPath ?? args.positionals[0];
  const planPath = args.plan ?? args.planPath ?? args.positionals[1];
  if (!packetPath || !planPath) throw new Error('validate-plan requires --solver-packet <path> --plan <path>.');
  const packet = readJson(packetPath);
  const plan = readJson(planPath);
  const validation = validateHeadlessPlanAgainstMission(plan, packet, { oracle: args.oracle, agentId: args.agentId });
  console.log(JSON.stringify({
    command: 'validate-plan',
    ok: validation.ok,
    status: validation.status,
    packetPath,
    planPath,
    validation,
    boundary: 'Validates a submitted anchor.plan against packet mission/glider context. It does not generate a new route.'
  }, null, 2));
  if (!validation.ok) process.exitCode = 1;
}

function runRoundtrip(args) {
  const packetPath = args.solverPacket ?? args.packetPath ?? args.positionals[0];
  const planPath = args.plan ?? args.planPath ?? args.positionals[1];
  const outputDir = args.out ?? args.positionals[2];
  if (!packetPath || !planPath || !outputDir) throw new Error('roundtrip requires --solver-packet <path> --plan <path> --out <dir>.');
  const packet = readJson(packetPath);
  const plan = readJson(planPath);
  applyWaterColumnCliOptions(packet, plan, args);
  const includeHiddenTruth = args.includeHiddenTruth === true && args.noHiddenExport !== true;
  const roundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, {
    oracle: args.oracle,
    agentId: args.agentId,
    seed: args.seed,
    outputDir,
    includeHiddenTruth,
    createdAt: args.createdAt,
    allowInvalidPlan: args.allowInvalidPlan,
    allowVisibilityFailures: args.allowVisibilityFailures,
    motionAware: args.motionAware,
    motionModelId: args.motionModelId,
    controlStepSeconds: args.controlStepSeconds,
    gliderSpeed: args.gliderSpeed,
    headingRateLimitDegreesPerSecond: args.headingRateLimitDegreesPerSecond,
    driftGain: args.driftGain,
    bathymetry: args.bathymetry,
    bathymetryViewMode: args.bathymetryViewMode,
    verticalExaggeration: args.verticalExaggeration,
    costGraphEnabled: args.costGraph,
    costGraphMetric: args.costGraphMetric,
    costGraphNodeSource: args.costGraphNodeSource,
    costGraphNeighborMode: args.costGraphNeighborMode,
    costGraphGridStep: args.costGraphGridStep,
    costGraphMaxNodes: args.costGraphMaxNodes,
    costGraphRadius: args.costGraphRadius,
    costGraphDepartureTimesSeconds: args.costGraphDepartureTimesSeconds,
    costMatrixFormat: args.costMatrixFormat,
    missionScoreEnabled: args.missionScore,
    scoreProfile: args.scoreProfile,
    regretReference: args.regretReference,
    scoreAllowRefereeMetrics: args.scoreAllowRefereeMetrics
  });
  fs.mkdirSync(outputDir, { recursive: true });
  const bundleSummary = writeHeadlessBundle(roundtrip.episode, outputDir, {
    includeHiddenTruth,
    combinedJson: args.combinedJson !== false,
    createdAt: args.createdAt,
    roundtripReport: roundtrip.report
  });
  const report = {
    ...roundtrip.report,
    output: {
      ...roundtrip.report.output,
      outputDir,
      combinedBundlePath: bundleSummary.combinedBundle ? path.join(outputDir, 'bundle.json') : null,
      roundtripReportPath: path.join(outputDir, 'roundtrip_report.json'),
      hiddenTruthExported: bundleSummary.hiddenTruthExported,
      files: bundleSummary.files
    }
  };
  fs.writeFileSync(path.join(outputDir, 'roundtrip_report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (args.combinedJson !== false) {
    roundtrip.episode.roundtripReport = report;
    writeHeadlessBundle(roundtrip.episode, outputDir, {
      includeHiddenTruth,
      combinedJson: true,
      createdAt: args.createdAt,
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
    motionSummary: report.motionSummary ?? null,
    missionFeasibilitySummary: report.missionFeasibilitySummary ?? null,
    motionCostGraphSummary: report.motionCostGraphSummary ?? null,
    motionCostMatrixSummary: report.motionCostMatrixSummary ?? null,
    missionOutcomeSummary: report.missionOutcomeSummary ?? null,
    hiddenTruthExported: report.output.hiddenTruthExported,
    outputDir,
    files: report.output.files,
    boundary: report.boundary
  }, null, 2));
}

function parseArgs(argv) {
  const parsed = {
    command: argv[0] ?? null,
    positionals: [],
    combinedJson: false,
    noHiddenExport: false,
    includeHiddenTruth: false,
    oracle: false,
    allowInvalidPlan: false,
    allowVisibilityFailures: false,
    summaryOnly: false,
    waterColumnSummary: true,
    depthLayers: null,
    diveProfileId: null,
    agentId: null,
    seed: null,
    out: null,
    createdAt: null,
    motionAware: false,
    motionModelId: null,
    bathymetry: true,
    bathymetryViewMode: 'obliqueBathymetry',
    verticalExaggeration: 1.5,
    controlStepSeconds: null,
    gliderSpeed: null,
    headingRateLimitDegreesPerSecond: null,
    driftGain: null,
    costGraph: false,
    costGraphMetric: null,
    costGraphNodeSource: null,
    costGraphNeighborMode: null,
    costGraphGridStep: null,
    costGraphMaxNodes: null,
    costGraphRadius: null,
    costGraphDepartureTimesSeconds: null,
    costMatrixFormat: null,
    missionScore: false,
    scoreProfile: null,
    regretReference: 'none',
    scoreAllowRefereeMetrics: false
  };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--seed') parsed.seed = argv[++index];
    else if (arg === '--out') parsed.out = argv[++index];
    else if (arg === '--width') parsed.width = Number(argv[++index]);
    else if (arg === '--height') parsed.height = Number(argv[++index]);
    else if (arg === '--scenario') parsed.scenario = argv[++index];
    else if (arg === '--depth-layers') parsed.depthLayers = parseList(argv[++index]);
    else if (arg === '--dive-profile') parsed.diveProfileId = argv[++index];
    else if (arg === '--motion-aware') parsed.motionAware = true;
    else if (arg === '--motion-model') parsed.motionModelId = argv[++index];
    else if (arg === '--bathymetry') parsed.bathymetry = true;
    else if (arg === '--no-bathymetry') parsed.bathymetry = false;
    else if (arg === '--bathymetry-view') parsed.bathymetryViewMode = argv[++index];
    else if (arg === '--vertical-exaggeration') parsed.verticalExaggeration = Number(argv[++index]);
    else if (arg === '--control-step') parsed.controlStepSeconds = Number(argv[++index]);
    else if (arg === '--glider-speed') parsed.gliderSpeed = Number(argv[++index]);
    else if (arg === '--heading-rate-limit') parsed.headingRateLimitDegreesPerSecond = Number(argv[++index]);
    else if (arg === '--drift-gain') parsed.driftGain = Number(argv[++index]);
    else if (arg === '--cost-graph') parsed.costGraph = true;
    else if (arg === '--no-cost-graph') parsed.costGraph = false;
    else if (arg === '--cost-graph-metric') parsed.costGraphMetric = argv[++index];
    else if (arg === '--cost-graph-node-source') parsed.costGraphNodeSource = argv[++index];
    else if (arg === '--cost-graph-neighbor-mode') parsed.costGraphNeighborMode = argv[++index];
    else if (arg === '--cost-graph-grid-step') parsed.costGraphGridStep = Number(argv[++index]);
    else if (arg === '--cost-graph-max-nodes') parsed.costGraphMaxNodes = Number(argv[++index]);
    else if (arg === '--cost-graph-radius') parsed.costGraphRadius = Number(argv[++index]);
    else if (arg === '--cost-graph-departure-times') parsed.costGraphDepartureTimesSeconds = parseNumericList(argv[++index]);
    else if (arg === '--cost-matrix-format') parsed.costMatrixFormat = argv[++index];
    else if (arg === '--mission-score') parsed.missionScore = true;
    else if (arg === '--score-profile') parsed.scoreProfile = argv[++index];
    else if (arg === '--regret-reference') parsed.regretReference = argv[++index];
    else if (arg === '--score-allow-referee-metrics') parsed.scoreAllowRefereeMetrics = true;
    else if (arg === '--water-column-summary') parsed.waterColumnSummary = true;
    else if (arg === '--no-water-column-summary') parsed.waterColumnSummary = false;
    else if (arg === '--solver-packet' || arg === '--packet') parsed.solverPacket = argv[++index];
    else if (arg === '--plan') parsed.plan = argv[++index];
    else if (arg === '--agent-id') parsed.agentId = argv[++index];
    else if (arg === '--created-at') parsed.createdAt = argv[++index];
    else if (arg === '--no-hidden-export') parsed.noHiddenExport = true;
    else if (arg === '--include-hidden-truth') parsed.includeHiddenTruth = true;
    else if (arg === '--combined-json') parsed.combinedJson = true;
    else if (arg === '--no-combined-json') parsed.combinedJson = false;
    else if (arg === '--summary-only') parsed.summaryOnly = true;
    else if (arg === '--oracle') parsed.oracle = true;
    else if (arg === '--allow-invalid-plan') parsed.allowInvalidPlan = true;
    else if (arg === '--allow-visibility-failures') parsed.allowVisibilityFailures = true;
    else if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else parsed.positionals.push(arg);
  }
  return parsed;
}

function applyWaterColumnCliOptions(packet, plan, args) {
  if (args.depthLayers?.length || args.diveProfileId) {
    const config = {
      ...(packet.waterColumnConfig ?? packet.planningData?.waterColumnConfig ?? {}),
      ...(args.depthLayers?.length ? { depthLayerIds: args.depthLayers } : {}),
      ...(args.diveProfileId ? { diveProfileId: args.diveProfileId } : {})
    };
    packet.waterColumnConfig = config;
    packet.planningData = { ...(packet.planningData ?? {}), waterColumnConfig: config };
  }
  if (args.diveProfileId) {
    plan.diveProfileId = args.diveProfileId;
    for (const agentPlan of plan.agentPlans ?? []) agentPlan.diveProfileId ??= args.diveProfileId;
  }
}


function parseNumericList(value) {
  return String(value ?? '').split(',').map((entry) => Number(entry.trim())).filter(Number.isFinite);
}
function parseList(value) {
  return String(value ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function printUsage() {
  console.log(`Usage:
  node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out tmp/oceanbox-js-demo [--width 32] [--height 24] [--scenario coastalBloomFront] [--depth-layers surface,thermocline,deep] [--dive-profile sawtoothProfile] [--water-column-summary] [--bathymetry] [--bathymetry-view obliqueBathymetry] [--vertical-exaggeration 1.5] [--motion-aware] [--motion-model depthLayerKinematic] [--control-step 60] [--glider-speed 1] [--heading-rate-limit 8] [--drift-gain 1] [--cost-graph] [--cost-graph-metric energy] [--cost-graph-node-source regularGrid] [--cost-matrix-format sparse] [--mission-score] [--score-profile balancedMission] [--regret-reference none] [--no-hidden-export] [--combined-json] [--summary-only]
  node tools/js/headless_oceanbox.mjs validate-solver-packet --solver-packet docs/examples/headless_solver_packet.example.json [--oracle]
  node tools/js/headless_oceanbox.mjs validate-plan --solver-packet docs/examples/headless_solver_packet.example.json --plan docs/examples/headless_solver_plan.example.json [--agent-id glider_01]
  node tools/js/headless_oceanbox.mjs roundtrip --solver-packet docs/examples/headless_solver_packet.example.json --plan docs/examples/headless_solver_plan.example.json --out runs/h3-roundtrip --depth-layers surface,thermocline,deep --dive-profile sawtoothProfile --bathymetry --bathymetry-view obliqueBathymetry --vertical-exaggeration 1.5 --motion-aware --motion-model depthLayerKinematic --cost-graph --cost-graph-node-source samplingPriorityCandidates --cost-matrix-format sparse --mission-score --score-profile balancedMission --regret-reference none --combined-json --no-hidden-export`);
}

