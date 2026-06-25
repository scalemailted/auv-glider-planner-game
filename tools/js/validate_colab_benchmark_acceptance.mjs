#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { stableDigest } from '../../packages/contracts/src/index.js';

const reportPath = process.argv[2];

try {
  if (!reportPath || reportPath === '--help' || reportPath === '-h') {
    printUsage();
    process.exit(reportPath ? 0 : 2);
  }
  const report = readJson(reportPath);
  const failures = validateAcceptanceReport(report, { baseDir: path.dirname(path.resolve(reportPath)) });
  if (failures.length) {
    console.error(JSON.stringify({ ok: false, reportPath, failures }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    reportPath,
    status: report.status,
    reportDigest: report.reportDigest,
    probeCount: report.dataParity?.probeCount ?? null,
    officialScore: report.officialEvaluation?.officialScore ?? null,
    boundary: report.boundary
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, reportPath, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
}

export function validateAcceptanceReport(report, options = {}) {
  const failures = [];
  const require = (condition, message) => {
    if (!condition) failures.push(message);
  };
  require(report && typeof report === 'object', 'report must be a JSON object');
  require(report.reportType === 'anchor.colab-benchmark-acceptance', 'reportType must be anchor.colab-benchmark-acceptance');
  require(report.reportVersion === '1.0.0', 'reportVersion must be 1.0.0');
  require(report.status === 'PASS', 'status must be PASS after real Colab/Python execution');
  require(typeof report.notebookDigest === 'string' && report.notebookDigest.length > 0 && report.notebookDigest !== 'UNKNOWN', 'notebookDigest must be recorded');
  require(report.validationBaselineDigest === 'fnv1a32:dd016175', 'validation baseline digest must match SCI-VALID-R2A');
  require(report.fairnessClass === 'FORECAST_ONLY', 'default acceptance report must be FORECAST_ONLY');
  require(!/ORACLE_HIDDEN_TRUTH/i.test(JSON.stringify(report.fairnessClass ?? '')), 'oracle hidden truth must not be the default acceptance fairness');

  const dataParity = report.dataParity ?? {};
  for (const key of ['schema', 'axes', 'masks', 'currents', 'scalars', 'missionGeometry']) {
    require(dataParity[key] === 'PASS', `dataParity.${key} must be PASS`);
  }
  require(['PASS', 'WARN'].includes(dataParity.bathymetry), 'dataParity.bathymetry must be PASS or WARN for compact fixtures');
  require(Number.isInteger(dataParity.probeCount) && dataParity.probeCount > 0, 'dataParity.probeCount must be positive');
  require(dataParity.failedProbeCount === 0, 'dataParity.failedProbeCount must be zero');

  const algorithms = report.algorithms ?? {};
  for (const plannerId of ['dijkstra', 'astar', 'weightedAstar', 'greedyValuePerCost', 'beamSearch', 'timeExpandedAstar']) {
    require(Boolean(algorithms[plannerId]), `algorithm ${plannerId} must be present`);
    if (algorithms[plannerId]) {
      require(algorithms[plannerId].completed === true, `algorithm ${plannerId} must complete`);
      require(typeof algorithms[plannerId].optimalityStatus === 'string' && algorithms[plannerId].optimalityStatus.length > 0, `algorithm ${plannerId} must record optimalityStatus`);
    }
  }
  const exact = algorithms.exactSmallInstanceOracle ?? algorithms.exactSmallInstance ?? algorithms.exact_small_instance ?? algorithms.exactBoundedSmallInstance;
  require(Boolean(exact), 'exact small-instance oracle result must be present');
  if (exact) {
    require(exact.completed === true, 'exact small-instance oracle must complete');
    require(/EXACT/i.test(String(exact.optimalityStatus ?? '')), 'exact small-instance oracle must be labeled exact for the bounded problem');
  }
  if (algorithms.dijkstraAstarCostDelta) {
    require(Number.isFinite(Number(algorithms.dijkstraAstarCostDelta.value)), 'Dijkstra/A* cost delta must be finite');
    require(Number(algorithms.dijkstraAstarCostDelta.value) <= 1e-6, 'Dijkstra/A* cost delta must be within tolerance');
  }
  for (const [plannerId, algorithm] of Object.entries(algorithms)) {
    if (plannerId === 'dijkstraAstarCostDelta') continue;
    if (algorithm.solveTimeSeconds !== null && algorithm.solveTimeSeconds !== undefined) {
      require(Number.isFinite(Number(algorithm.solveTimeSeconds)), `algorithm ${plannerId} solveTimeSeconds must be finite`);
    }
  }

  const official = report.officialEvaluation ?? {};
  require(typeof official.scoreProfileId === 'string' && official.scoreProfileId.length > 0, 'official scoreProfileId must be present');
  require(typeof official.scoreProfileVersion === 'string' && official.scoreProfileVersion.length > 0, 'official scoreProfileVersion must be present');
  require(typeof official.scoreResultDigest === 'string' && official.scoreResultDigest.length > 0, 'official scoreResultDigest must be present');
  require(Number.isFinite(Number(official.officialScore)), 'official score must be finite');
  if (report.environmentDigest) require(/^fnv1a32:/.test(report.environmentDigest), 'environmentDigest must be a stable digest');
  if (report.missionDigest) require(/^fnv1a32:/.test(report.missionDigest), 'missionDigest must be a stable digest');

  const artifacts = report.outputArtifacts ?? [];
  require(Array.isArray(artifacts) && artifacts.length > 0, 'outputArtifacts must list generated notebook artifacts');
  require(!JSON.stringify(report).includes('T_hiddenTruth'), 'acceptance report must not include T_hiddenTruth');
  require(!/C:\\\\|C:\\\//.test(JSON.stringify(report)), 'canonical acceptance report must not include local Windows absolute paths');
  if (options.baseDir) {
    for (const artifact of artifacts) {
      if (typeof artifact !== 'string' || path.isAbsolute(artifact)) continue;
      const resolved = path.resolve(options.baseDir, artifact);
      if (!resolved.startsWith(path.resolve(options.baseDir))) failures.push(`output artifact escapes report directory: ${artifact}`);
    }
  }

  const withoutDigest = { ...report };
  delete withoutDigest.reportDigest;
  require(report.reportDigest === stableDigest(withoutDigest), 'reportDigest must match stable digest of report without reportDigest');
  return failures;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function printUsage() {
  console.log(`Usage:
  node tools/js/validate_colab_benchmark_acceptance.mjs anchor_benchmark_output/colab_acceptance_report.json

Validates the real Python/Colab acceptance report produced by
tools/python/notebooks/anchor_classical_planner_benchmark.ipynb.`);
}
