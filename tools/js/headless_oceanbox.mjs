#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { validateHeadlessPlanAgainstMission } from '../../src/core/headless/HeadlessPlanAdapter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildReplayArtifactsFromBundle } from '../../src/core/replay/ReplayContractBuilder.js';
import { verifyReplayBundle } from '../../src/core/replay/ReplayVerifier.js';
import { verifyReplayIntegrity, replayIntegritySummary } from '../../src/core/replay/ReplayIntegrityVerifier.js';
import { normalizeReplayArtifacts } from '../../src/core/replay/ReplaySchema.js';
import { createReplayPlaybackState, jumpReplayPlaybackToCheckpoint, replayPlaybackSummary, stepReplayPlayback } from '../../src/core/replay/ReplayPlayback.js';
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
  else if (args.command === 'replay') runReplay(args);
  else if (args.command === 'verify-replay') runVerifyReplay(args);
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
    bundleSummary = writeHeadlessBundle(episode, outputDir, { includeHiddenTruth: !args.noHiddenExport, combinedJson: args.combinedJson, checkpointEvery: args.checkpointEvery, publicPlayback: args.publicPlayback, refereeReplay: args.refereeReplay, useDemoObjectiveSequence: args.demoObjectives });
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
    roundtripReport: roundtrip.report,
    checkpointEvery: args.checkpointEvery,
    publicPlayback: args.publicPlayback,
    refereeReplay: args.refereeReplay,
    useDemoObjectiveSequence: args.demoObjectives
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
      roundtripReport: report,
      checkpointEvery: args.checkpointEvery,
      publicPlayback: args.publicPlayback,
      refereeReplay: args.refereeReplay,
      useDemoObjectiveSequence: args.demoObjectives
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

function runReplay(args) {
  const bundlePath = args.bundle ?? args.positionals[0];
  const outputDir = args.out ?? args.positionals[1] ?? 'tmp/headless-replay';
  if (!bundlePath) throw new Error('replay requires --bundle <path> --out <dir>.');
  const bundle = readHeadlessBundlePath(bundlePath);
  const existing = normalizeReplayArtifacts(bundle);
  const replayArtifacts = existing.present
    ? { manifest: existing.manifest, events: existing.events, checkpoints: existing.checkpoints, alignmentReport: existing.alignmentReport, contract: { type: 'anchor.headless.replay-contract', version: existing.manifest?.version ?? existing.manifest?.schemaVersion ?? 'replay-r1.0', manifest: existing.manifest, events: existing.events, checkpoints: existing.checkpoints, alignmentReport: existing.alignmentReport } }
    : buildReplayArtifactsFromBundle(bundle, {
      checkpointEvery: args.checkpointEvery,
      publicPlayback: args.publicPlayback !== false,
      refereeReplay: args.refereeReplay,
      authoritativeReplay: args.refereeReplay,
      useDemoObjectiveSequence: args.demoObjectives
    });
  let playback = createReplayPlaybackState({ replayManifest: replayArtifacts.manifest, replayEvents: replayArtifacts.events, replayCheckpoints: replayArtifacts.checkpoints, replayAlignmentReport: replayArtifacts.alignmentReport });
  if (args.checkpoint) playback = jumpReplayPlaybackToCheckpoint(playback, { replayManifest: replayArtifacts.manifest, replayEvents: replayArtifacts.events, replayCheckpoints: replayArtifacts.checkpoints }, args.checkpoint);
  if (args.untilEvent) {
    const events = replayArtifacts.events?.events ?? [];
    const targetIndex = events.findIndex((event) => event.eventId === args.untilEvent || String(event.sequence) === String(args.untilEvent));
    if (targetIndex >= 0) while ((playback.eventIndex ?? -1) < targetIndex) playback = stepReplayPlayback(playback, { replayManifest: replayArtifacts.manifest, replayEvents: replayArtifacts.events, replayCheckpoints: replayArtifacts.checkpoints }, 1);
  }
  const verification = args.verify ? verifyReplayIntegrity({ manifest: replayArtifacts.manifest, events: replayArtifacts.events, checkpoints: replayArtifacts.checkpoints, alignmentReport: replayArtifacts.alignmentReport, options: { strict: args.strict } }) : null;
  fs.mkdirSync(outputDir, { recursive: true });
  writeJson(path.join(outputDir, 'replay_manifest.json'), replayArtifacts.manifest);
  writeJson(path.join(outputDir, 'replay_events.json'), replayArtifacts.events);
  writeJson(path.join(outputDir, 'replay_checkpoints.json'), replayArtifacts.checkpoints);
  writeJson(path.join(outputDir, 'replay_alignment_report.json'), verification ?? replayArtifacts.alignmentReport);
  writeJson(path.join(outputDir, 'replay_contract.json'), replayArtifacts.contract);
  const playbackSummary = replayPlaybackSummary(playback, { replayManifest: replayArtifacts.manifest, replayEvents: replayArtifacts.events, replayCheckpoints: replayArtifacts.checkpoints });
  console.log(JSON.stringify({
    ok: !verification || verification.status !== 'FAIL',
    command: 'replay',
    bundlePath,
    outputDir,
    replayMode: replayArtifacts.manifest.replayMode,
    replayFidelity: replayArtifacts.manifest.replayFidelity,
    eventCount: replayArtifacts.events.events.length,
    checkpointCount: replayArtifacts.checkpoints.checkpoints.length,
    agentIds: playbackSummary.agentIds ?? [],
    agentCount: playbackSummary.agentCount ?? 0,
    currentEventId: playbackSummary.currentEventId ?? null,
    currentCheckpointId: playbackSummary.currentCheckpointId ?? null,
    verification: verification ? replayIntegritySummary(verification) : null,
    terminalDigest: replayArtifacts.checkpoints.summary?.terminalDigest ?? replayArtifacts.checkpoints.checkpoints?.at(-1)?.digest?.value ?? null,
    hiddenTruthIncluded: replayArtifacts.manifest.hiddenTruthIncluded === true,
    changesOfficialBrowserScoring: false,
    files: ['replay_manifest.json', 'replay_events.json', 'replay_checkpoints.json', 'replay_alignment_report.json', 'replay_contract.json'],
    boundary: 'Replay emits playback summaries over recorded public event/checkpoint artifacts. It does not rerun motion physics, resimulate hidden truth, or change browser scoring.'
  }, null, 2));
  if (verification?.status === 'FAIL' || (args.strict && verification?.status === 'WARN')) process.exitCode = 1;
}

function runVerifyReplay(args) {
  const bundlePath = args.bundle ?? args.positionals[0];
  const reportPath = args.report ?? args.positionals[1] ?? 'tmp/replay_alignment_report.json';
  if (!bundlePath) throw new Error('verify-replay requires --bundle <path> --report <path>.');
  if (args.noPublicSafetyCheck) console.warn('WARNING: --no-public-safety-check is for debug/testing only and must not be used for normal public release artifacts.');
  const bundle = readHeadlessBundlePath(bundlePath);
  const report = verifyReplayIntegrity(bundle, {
    strict: args.strict,
    allowWarnings: args.allowWarnings !== false,
    expectedReplayMode: args.expectedMode,
    verifyDigests: args.noDigestCheck !== true,
    verifyPublicSafety: args.noPublicSafetyCheck !== true,
    verifyAlignmentReport: true,
    checkpointEvery: args.checkpointEvery
  });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  writeJson(reportPath, report);
  const summary = replayIntegritySummary(report);
  console.log(JSON.stringify({
    ok: report.status !== 'FAIL' && !(args.strict && report.status === 'WARN'),
    command: 'verify-replay',
    bundlePath,
    reportPath,
    status: report.status,
    schemaVersion: report.schemaVersion,
    compatibilityStatus: report.compatibilitySummary?.compatibility ?? null,
    replayMode: report.replayMode,
    eventCount: report.eventCount,
    checkpointCount: report.checkpointCount,
    digestChecks: report.digestSummary,
    warningCount: report.warningCount,
    failureCount: report.failureCount,
    failureCodes: report.failureCodes ?? [],
    firstDivergence: report.firstDivergence,
    changesOfficialBrowserScoring: false,
    boundary: report.boundary,
    summary
  }, null, 2));
  if (report.status === 'FAIL' || (args.strict && report.status === 'WARN')) process.exitCode = 1;
}

function readHeadlessBundlePath(bundlePath) {
  const stat = fs.statSync(bundlePath);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(bundlePath)
      .filter((fileName) => /\.(json|csv)$/i.test(fileName))
      .map((fileName) => ({ fileName, text: fs.readFileSync(path.join(bundlePath, fileName), 'utf8') }));
    return buildHeadlessBundleFromFiles(entries);
  }
  const payload = readJson(bundlePath);
  const fileName = path.basename(bundlePath) || 'bundle.json';
  return buildHeadlessBundleFromFiles([{ fileName, payload }]);
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
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
    bundle: null,
    report: null,
    strict: false,
    allowCompatibleVersion: false,
    allowWarnings: true,
    expectedMode: null,
    noDigestCheck: false,
    noPublicSafetyCheck: false,
    verify: false,
    checkpoint: null,
    untilEvent: null,
    publicPlayback: true,
    refereeReplay: false,
    checkpointEvery: null,
    demoObjectives: false,
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
    else if (arg === '--bundle') parsed.bundle = argv[++index];
    else if (arg === '--report') parsed.report = argv[++index];
    else if (arg === '--strict') parsed.strict = true;
    else if (arg === '--allow-compatible-version') parsed.allowCompatibleVersion = true;
    else if (arg === '--allow-warnings') parsed.allowWarnings = true;
    else if (arg === '--no-allow-warnings') parsed.allowWarnings = false;
    else if (arg === '--expected-mode') parsed.expectedMode = argv[++index];
    else if (arg === '--no-digest-check') parsed.noDigestCheck = true;
    else if (arg === '--no-public-safety-check') parsed.noPublicSafetyCheck = true;
    else if (arg === '--verify') parsed.verify = true;
    else if (arg === '--checkpoint') parsed.checkpoint = argv[++index];
    else if (arg === '--until-event') parsed.untilEvent = argv[++index];
    else if (arg === '--checkpoint-every') parsed.checkpointEvery = Number(argv[++index]);
    else if (arg === '--public-playback') parsed.publicPlayback = true;
    else if (arg === '--no-public-playback') parsed.publicPlayback = false;
    else if (arg === '--referee-replay') parsed.refereeReplay = true;
    else if (arg === '--demo-objectives') parsed.demoObjectives = true;
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
  node tools/js/headless_oceanbox.mjs roundtrip --solver-packet docs/examples/headless_solver_packet.example.json --plan docs/examples/headless_solver_plan.example.json --out runs/h3-roundtrip --depth-layers surface,thermocline,deep --dive-profile sawtoothProfile --bathymetry --bathymetry-view obliqueBathymetry --vertical-exaggeration 1.5 --motion-aware --motion-model depthLayerKinematic --cost-graph --cost-graph-node-source samplingPriorityCandidates --cost-matrix-format sparse --mission-score --score-profile balancedMission --regret-reference none --combined-json --no-hidden-export [--checkpoint-every 10] [--demo-objectives]
  node tools/js/headless_oceanbox.mjs replay --bundle runs/h3-roundtrip/bundle.json --out runs/h4-replay [--verify] [--checkpoint <id>] [--until-event <id>] [--checkpoint-every 10] [--public-playback]
  node tools/js/headless_oceanbox.mjs verify-replay --bundle runs/h3-roundtrip/bundle.json --report runs/h4-replay/replay_alignment_report.json [--strict] [--allow-warnings] [--expected-mode publicObservationPlayback] [--no-digest-check] [--no-public-safety-check]`);
}










