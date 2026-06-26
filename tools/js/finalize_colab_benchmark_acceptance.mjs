#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { stableDigest } from '../../packages/contracts/src/index.js';

const root = process.cwd();
const EXPECTED_STATIC_ASTAR_SCORE = 23.593559;

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.packagePath) {
    printUsage();
    process.exit(args.help ? 0 : 2);
  }
  const executionPackage = readJson(path.resolve(root, args.packagePath));
  const finalReport = finalizeAcceptance(executionPackage, args);
  const outPath = path.resolve(root, args.out ?? 'anchor_benchmark_output/colab_acceptance_report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(finalReport, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: finalReport.status === 'PASS',
    status: finalReport.status,
    outPath: path.relative(root, outPath).replaceAll('\\', '/'),
    reportDigest: finalReport.reportDigest,
    officialScore: finalReport.officialEvaluation?.officialScore ?? null,
    failures: finalReport.failures
  }, null, 2));
  process.exit(finalReport.status === 'PASS' ? 0 : 1);
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
}

export function finalizeAcceptance(executionPackage, options = {}) {
  const packageFailures = validateExecutionPackage(executionPackage);
  const report = executionPackage.executionReport ?? {};
  const identity = executionPackage.benchmarkBundleIdentity ?? {};
  const solverPacketPath = resolveSolverPacketPath(identity.solverPacketDigest, options);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-colab-finalize-'));
  const officialEvaluations = [];
  const failures = [...packageFailures];
  try {
    for (const planEntry of executionPackage.plans ?? []) {
      const plan = planEntry.plan;
      if (!plan || plan.type !== 'anchor.plan') {
        failures.push(`Plan entry ${planEntry.plannerId ?? 'unknown'} is missing anchor.plan payload.`);
        continue;
      }
      const plannerId = planEntry.plannerId ?? plan.planner?.name ?? plan.planId ?? `plan-${officialEvaluations.length}`;
      const planPath = path.join(tempDir, `${sanitize(plannerId)}.anchor.plan.json`);
      const outDir = path.join(tempDir, `eval-${sanitize(plannerId)}`);
      fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
      const result = runEvaluator({ solverPacketPath, planPath, outDir, agentId: options.agentId });
      if (!result.ok) failures.push(`Authoritative evaluation failed for ${plannerId}: ${result.error ?? 'unknown error'}`);
      officialEvaluations.push({ plannerId, planDigest: stableDigest(plan), ...result });
    }
  } finally {
    if (!options.keepTemp) fs.rmSync(tempDir, { recursive: true, force: true });
  }
  const selected = selectPrimaryEvaluation(officialEvaluations);
  if (!selected?.ok) failures.push('No successful authoritative evaluation was produced.');
  if (selected?.ok && Math.abs(Number(selected.finalScore) - EXPECTED_STATIC_ASTAR_SCORE) > 1e-6) {
    failures.push(`Expected checked-in static A* score ${EXPECTED_STATIC_ASTAR_SCORE}, got ${selected.finalScore}.`);
  }
  const final = {
    reportType: 'anchor.colab-benchmark-acceptance',
    reportVersion: '1.0.0',
    status: failures.length ? 'FAIL' : 'PASS',
    notebookDigest: report.notebookDigest,
    repositoryCommit: report.repositoryCommit ?? 'UNKNOWN',
    pythonVersion: report.pythonVersion,
    libraryVersions: report.libraryVersions ?? {},
    nodeVersion: process.version,
    validationBaselineId: report.validationBaselineId,
    validationBaselineDigest: report.validationBaselineDigest,
    colabExecutionReportDigest: stableDigest(stripDigest(report, 'reportDigest')),
    executionPackageDigest: executionPackage.packageDigest ?? stableDigest(stripDigest(executionPackage, 'packageDigest')),
    benchmarkBundleDigest: identity.benchmarkBundleDigest ?? report.benchmarkBundleDigest,
    publicProjectionDigest: identity.publicProjectionDigest ?? report.publicProjectionDigest,
    environmentDigest: identity.environmentDigest ?? report.environmentDigest,
    missionDigest: identity.missionDigest ?? report.missionDigest,
    solverPacketDigest: identity.solverPacketDigest,
    fairnessClass: 'FORECAST_ONLY',
    dataParity: normalizeDataParity(report.dataParity),
    algorithms: report.algorithms ?? {},
    exportedPlanDigests: report.exportedPlanDigests ?? [],
    planDigests: officialEvaluations.map((item) => ({ plannerId: item.plannerId, planDigest: item.planDigest })),
    officialEvaluation: normalizeOfficialEvaluation(selected),
    officialEvaluations: officialEvaluations.map(normalizeOfficialEvaluation),
    outputArtifacts: [
      'colab_execution_report.json',
      'colab_execution_package.json',
      'reproducibility_manifest.json',
      'colab_acceptance_report.json'
    ],
    warnings: [...(report.warnings ?? [])],
    failures,
    boundary: 'Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.',
    notebookVersion: report.notebookVersion ?? 'colab-bench-r1.1'
  };
  final.reportDigest = stableDigest(stripDigest(final, 'reportDigest'));
  return final;
}

function validateExecutionPackage(value) {
  const failures = [];
  if (value?.packageType !== 'anchor.colab-execution-package') failures.push('packageType must be anchor.colab-execution-package.');
  if (value?.packageVersion !== '1.0.0') failures.push('packageVersion must be 1.0.0.');
  if (value?.executionReport?.reportType !== 'anchor.colab-execution-report') failures.push('executionReport.reportType must be anchor.colab-execution-report.');
  if (value?.executionReport?.officialEvaluationStatus !== 'PENDING_LOCAL_ANCHOR_REFEREE') failures.push('officialEvaluationStatus must be PENDING_LOCAL_ANCHOR_REFEREE before local finalization.');
  if (!Array.isArray(value?.plans) || value.plans.length === 0) failures.push('execution package must contain at least one plan.');
  if (JSON.stringify(value).includes('T_hiddenTruth')) failures.push('execution package contains T_hiddenTruth marker.');
  const expected = stableDigest(stripDigest(value, 'packageDigest'));
  if (value?.packageDigest !== expected) failures.push('packageDigest mismatch.');
  return failures;
}

function resolveSolverPacketPath(solverPacketDigest, options) {
  if (options.solverPacket) return path.resolve(root, options.solverPacket);
  const manifest = readJson(path.resolve(root, options.manifest ?? 'tests/fixtures/colab_benchmark/manifest.json'));
  for (const fixture of manifest.fixtures ?? []) {
    const filePath = path.resolve(root, fixture.path);
    if (!fs.existsSync(filePath)) continue;
    const packet = readJson(filePath);
    if (stableDigest(packet) === solverPacketDigest) return filePath;
  }
  throw new Error(`Could not resolve solver packet for digest ${solverPacketDigest}. Pass --solver-packet.`);
}

function runEvaluator({ solverPacketPath, planPath, outDir, agentId }) {
  const argv = [
    'tools/js/evaluate_colab_benchmark_plan.mjs',
    '--solver-packet',
    solverPacketPath,
    '--plan',
    planPath,
    '--out',
    outDir
  ];
  if (agentId) argv.push('--agent-id', agentId);
  const result = spawnSync(process.execPath, argv, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) return { ok: false, error: result.stderr || result.stdout };
  const parsed = parseLastJson(result.stdout);
  const missionScorePath = path.join(outDir, 'mission_score.json');
  if (!parsed.scoreResultDigest && fs.existsSync(missionScorePath)) {
    parsed.scoreResultDigest = stableDigest(readJson(missionScorePath));
    parsed.scoreResultDigestSource = 'mission_score.json';
  }
  return parsed;
}

function normalizeDataParity(dataParity = {}) {
  return {
    schema: dataParity.schema ?? 'NOT_EVALUATED',
    coordinates: dataParity.coordinates ?? 'NOT_EVALUATED',
    axes: dataParity.axes ?? 'NOT_EVALUATED',
    bathymetry: dataParity.bathymetry ?? 'NOT_EVALUATED',
    masks: dataParity.masks ?? 'NOT_EVALUATED',
    currents: dataParity.currents ?? 'NOT_EVALUATED',
    currentDepths: dataParity.currentDepths ?? dataParity.currents ?? 'NOT_EVALUATED',
    currentTimes: dataParity.currentTimes ?? dataParity.currents ?? 'NOT_EVALUATED',
    scalars: dataParity.scalars ?? 'NOT_EVALUATED',
    scalarDepths: dataParity.scalarDepths ?? dataParity.scalars ?? 'NOT_EVALUATED',
    scalarTimes: dataParity.scalarTimes ?? dataParity.scalars ?? 'NOT_EVALUATED',
    missionGeometry: dataParity.missionGeometry ?? 'NOT_EVALUATED',
    fieldDigests: dataParity.fieldDigests ?? 'NOT_EVALUATED',
    publicProjectionDigest: dataParity.publicProjectionDigest ?? null,
    probeCount: dataParity.probeCount ?? 0,
    failedProbeCount: dataParity.failedProbeCount ?? 0
  };
}

function normalizeOfficialEvaluation(item = {}) {
  return {
    plannerId: item.plannerId ?? null,
    ok: item.ok === true,
    planDigest: item.planDigest ?? null,
    simulationInputDigest: item.simulationInputDigest ?? null,
    simulationResultDigest: item.simulationResultDigest ?? null,
    scoreProfileId: item.scoreProfileId ?? null,
    scoreProfileVersion: item.scoreProfileVersion ?? null,
    scoreResultDigest: item.scoreResultDigest ?? null,
    scoreResultDigestSource: item.scoreResultDigestSource ?? null,
    officialScore: item.finalScore ?? item.officialScore ?? null,
    terminalReason: item.terminalReason ?? null,
    totalEvaluationTimeSeconds: item.totalEvaluationTimeSeconds ?? null
  };
}

function selectPrimaryEvaluation(items) {
  return items.find((item) => item.plannerId === 'astar' && item.ok) ?? items.find((item) => item.ok) ?? null;
}

function parseLastJson(stdout) {
  const text = String(stdout ?? '').trim();
  const start = text.lastIndexOf('\n{');
  const json = start >= 0 ? text.slice(start + 1) : text;
  return JSON.parse(json);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--out') args.out = argv[++index];
    else if (arg === '--solver-packet') args.solverPacket = argv[++index];
    else if (arg === '--manifest') args.manifest = argv[++index];
    else if (arg === '--agent-id') args.agentId = argv[++index];
    else if (arg === '--keep-temp') args.keepTemp = true;
    else if (!args.packagePath) args.packagePath = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stripDigest(value, key) {
  const clone = JSON.parse(JSON.stringify(value ?? {}));
  delete clone[key];
  return clone;
}

function sanitize(value) {
  return String(value).replace(/[^a-z0-9_.-]+/gi, '_');
}

function printUsage() {
  console.log(`Usage:
  node tools/js/finalize_colab_benchmark_acceptance.mjs anchor_benchmark_output/colab_execution_package.json
  node tools/js/finalize_colab_benchmark_acceptance.mjs anchor_benchmark_output/colab_execution_package.json --out anchor_benchmark_output/colab_acceptance_report.json

Runs local authoritative ANCHOR evaluation for plans returned by Colab and writes
anchor.colab-benchmark-acceptance. The notebook itself does not own simulation
or official scoring.`);
}
