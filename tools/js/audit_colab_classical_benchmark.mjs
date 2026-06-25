#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { decodeArtifact, DecodeStatus } from '../../packages/codecs/src/index.js';
import { stableDigest } from '../../packages/contracts/src/index.js';

const root = process.cwd();
const notebookPath = 'tools/python/notebooks/anchor_classical_planner_benchmark.ipynb';
const starterNotebookPath = 'tools/python/notebooks/anchor_external_solver_template.ipynb';
const fixtureManifestPath = 'tests/fixtures/colab_benchmark/manifest.json';
const evaluatorPath = 'tools/js/evaluate_colab_benchmark_plan.mjs';
const acceptanceValidatorPath = 'tools/js/validate_colab_benchmark_acceptance.mjs';
const pagesBuilderPath = 'tools/js/build_github_pages.mjs';

const requiredNotebookHeadings = [
  '# 0. ANCHOR Classical Planner Benchmark',
  '## 1. Configuration',
  '## 2. Environment Setup',
  '## 3. Obtain Benchmark Data',
  '## 4. Validate and Inspect Artifacts',
  '## 5. Scientific Validation Context',
  '## 6. Visualize the Environment',
  '## Exported Data Integrity and Web-App Parity',
  '## 7. Construct the Planning Problem',
  '## 8. Run Classical Planners',
  '## 9. Export Candidate ANCHOR Plans',
  '## 10. Validate Plans with ANCHOR',
  '## 11. Simulate and Score with the Authoritative Referee',
  '## 12. Compare Algorithms',
  '## 13. Visualize Planned and Realized Outcomes',
  '## 14. Export Benchmark Artifacts',
  '## 15. Reproducibility Summary'
];

const requiredNotebookText = [
  'ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.',
  'Plan. Simulate. Compare. Learn.',
  'Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.',
  'Visual agreement is an inspection aid. Canonical digest and numerical sample agreement are the authoritative parity evidence.',
  'An exact result is exact only for the stated candidate set, state representation, objective, and discretization.',
  'Dijkstra',
  'A*',
  'Weighted A*',
  'Greedy',
  'Beam Search',
  'Time-Expanded A*',
  'Exact Bounded Small-Instance Oracle',
  'FORECAST_ONLY',
  'BELIEF_AWARE',
  'PUBLIC_OBSERVATION_ONLY',
  'ORACLE_HIDDEN_TRUTH'
];

const requiredConfigNames = [
  'DATA_ACQUISITION_MODE',
  'SOLVER_PACKET_PATH',
  'STATIC_DOWNLOAD_BASE_URL',
  'BENCHMARK_FIXTURE_ID',
  'OUTPUT_DIR',
  'PLANNER_SEED',
  'ACTIVE_GLIDER',
  'FAIRNESS_CLASS',
  'CANDIDATE_NODE_LIMIT',
  'EXACT_ORACLE_SIZE_LIMIT',
  'REPEAT_COUNT',
  'TIMEOUT_PER_PLANNER_SECONDS',
  'PROFILE_POLICY'
];

const assert = {
  ok(value, message) {
    if (!value) throw new Error(message);
  },
  equal(actual, expected, message) {
    if (actual !== expected) throw new Error(`${message}: expected ${expected}, got ${actual}`);
  },
  notEqual(actual, expected, message) {
    if (actual === expected) throw new Error(`${message}: got forbidden ${actual}`);
  }
};

try {
  assertExists(notebookPath);
  assertExists(starterNotebookPath);
  assertExists(fixtureManifestPath);
  assertExists(evaluatorPath);
  assertExists(acceptanceValidatorPath);
  assertExists('tools/python/anchor_benchmark/__init__.py');
  assertExists('tools/python/anchor_benchmark/parity.py');
  assertExists('tools/python/anchor_benchmark/planners.py');
  assertExists('tools/python/anchor_benchmark/oracles.py');
  assertExists('tools/python/tests/test_anchor_benchmark.py');

  const notebook = readJson(notebookPath);
  const notebookText = notebook.cells.map((cell) => (cell.source ?? []).join('')).join('\n');
  assert.equal(notebook.nbformat, 4, 'notebook must be nbformat 4');
  assert.ok(Array.isArray(notebook.cells) && notebook.cells.length >= 20, 'notebook should contain a full workflow');
  for (const heading of requiredNotebookHeadings) assert.ok(notebookText.includes(heading), `missing notebook heading: ${heading}`);
  assertOrdered(notebookText, requiredNotebookHeadings);
  for (const text of requiredNotebookText) assert.ok(notebookText.includes(text), `missing notebook text: ${text}`);
  for (const name of requiredConfigNames) assert.ok(notebookText.includes(name), `missing configuration name: ${name}`);
  assert.ok(!new RegExp('C:\\\\\\\\|C:\\\\/').test(notebookText), 'notebook must not include local absolute Windows paths');
  assert.ok(!/ALLOW_ORACLE_HIDDEN_TRUTH\s*=\s*True/.test(notebookText), 'hidden truth must not be enabled by default');
  assert.ok(!/"outputs"\s*:\s*\[[^\]]+\]/.test(JSON.stringify(notebook)), 'notebook should not include embedded outputs');
  assertNoPythonSimulatorPort();

  const manifest = readJson(fixtureManifestPath);
  assert.equal(manifest.defaultFairnessClass, 'FORECAST_ONLY', 'fixture manifest default fairness');
  assert.equal(manifest.defaultVisibilityClass, 'FORECAST_ONLY', 'fixture manifest default visibility');
  assert.ok(Array.isArray(manifest.fixtures) && manifest.fixtures.length >= 4, 'fixture manifest must list four fixtures');
  for (const fixture of manifest.fixtures) {
    assertExists(fixture.path);
    const packet = readJson(fixture.path);
    assert.equal(packet.type, 'anchor.solverPacket', `${fixture.fixtureId} packet type`);
    assert.equal(packet.visibility?.truthIncluded, false, `${fixture.fixtureId} truth excluded`);
    assert.equal(packet.visibility?.oracleMode, false, `${fixture.fixtureId} oracle disabled`);
    assert.ok(!JSON.stringify(packet.planningData?.visibleFields ?? {}).includes('T_hiddenTruth'), `${fixture.fixtureId} visible fields leak T_hiddenTruth`);
    assert.ok(Array.isArray(packet.parityProbes) && packet.parityProbes.length >= 3, `${fixture.fixtureId} must include at least three parity probes`);
    for (const probe of packet.parityProbes) {
      assert.ok(typeof probe.probeId === 'string' && probe.probeId.length > 0, `${fixture.fixtureId} parity probe id`);
      assert.ok(Number.isFinite(Number(probe.eastMeters)), `${fixture.fixtureId} parity probe eastMeters`);
      assert.ok(Number.isFinite(Number(probe.northMeters)), `${fixture.fixtureId} parity probe northMeters`);
      assert.ok(Number.isFinite(Number(probe.depthMeters)), `${fixture.fixtureId} parity probe depthMeters`);
      assert.ok(Number.isFinite(Number(probe.timeSeconds)), `${fixture.fixtureId} parity probe timeSeconds`);
      assert.ok(probe.expected?.current, `${fixture.fixtureId} parity probe current expected value`);
      assert.ok(probe.expected?.scalars, `${fixture.fixtureId} parity probe scalar expected value`);
    }
    const decoded = decodeArtifact(packet, { kind: 'solverPacket' });
    assert.notEqual(decoded.status, DecodeStatus.REJECTED, `${fixture.fixtureId} codec decode`);
  }
  for (const planEntry of manifest.checkedInPlans ?? []) {
    assertExists(planEntry.path);
    assertExists(planEntry.solverPacketPath);
    const plan = readJson(planEntry.path);
    assert.equal(plan.type, 'anchor.plan', `${planEntry.path} type`);
    assert.equal(plan.planner?.usesOracle, false, `${planEntry.path} is non-oracle`);
    const decoded = decodeArtifact(plan, { kind: 'externalSolverPlan' });
    assert.notEqual(decoded.status, DecodeStatus.REJECTED, `${planEntry.path} codec decode`);
  }

  const pagesBuilder = fs.readFileSync(path.join(root, pagesBuilderPath), 'utf8');
  for (const requiredPath of [
    notebookPath,
    starterNotebookPath,
    fixtureManifestPath,
    'tests/fixtures/colab_benchmark/static_additive_routing_solver_packet.json',
    'docs/classical_planner_benchmark_notebook.md'
  ]) {
    assert.ok(pagesBuilder.includes(requiredPath), `Pages builder must include ${requiredPath}`);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-colab-benchmark-audit-'));
  const evalResult = spawnSync(process.execPath, [
    evaluatorPath,
    '--solver-packet',
    'tests/fixtures/colab_benchmark/static_additive_routing_solver_packet.json',
    '--plan',
    'tests/fixtures/colab_benchmark/plans/static_additive_astar.anchor.plan.json',
    '--out',
    tempDir,
    '--agent-id',
    'glider_01'
  ], { cwd: root, encoding: 'utf8' });
  if (evalResult.status !== 0) {
    throw new Error(`Node evaluator failed: ${evalResult.stderr || evalResult.stdout}`);
  }
  for (const outputName of ['bundle.json', 'roundtrip_report.json', 'benchmark_record.json', 'benchmark_summary.json']) {
    assert.ok(fs.existsSync(path.join(tempDir, outputName)), `evaluator output missing ${outputName}`);
  }
  const benchmarkRecord = readJson(path.join(tempDir, 'benchmark_record.json'));
  assert.equal(benchmarkRecord.type, 'anchor.benchmark.run-record', 'benchmark record type');
  assert.equal(benchmarkRecord.boundary, 'Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.', 'benchmark boundary');
  const bundleText = fs.readFileSync(path.join(tempDir, 'bundle.json'), 'utf8');
  const bundle = JSON.parse(bundleText);
  assert.ok(!bundleText.includes('T_hiddenTruth'), 'public bundle must not leak T_hiddenTruth');
  assert.ok(bundle.hiddenFields === null || bundle.hiddenFields === undefined, 'public bundle must not include hiddenFields payloads');
  assert.ok(!(bundle.manifest?.files ?? []).some((entry) => entry?.role === 'hiddenFields' || entry?.path === 'hidden_fields.json'), 'public manifest must not list hidden_fields.json');
  assert.ok(!fs.existsSync(path.join(tempDir, 'hidden_fields.json')), 'public evaluator output must not write hidden_fields.json');
  assert.ok((bundle.missionConfig?.hiddenFields ?? []).length === 0, 'public mission config must not list hidden fields');
  assert.ok(!bundleText.includes('rawOracleTensor'), 'public bundle must not leak raw oracle tensors');
  const syntheticAcceptanceReport = buildSyntheticAcceptanceReport({ notebook, benchmarkRecord });
  const acceptancePath = path.join(tempDir, 'synthetic_acceptance_report.json');
  fs.writeFileSync(acceptancePath, `${JSON.stringify(syntheticAcceptanceReport, null, 2)}\n`, 'utf8');
  const acceptanceResult = spawnSync(process.execPath, [acceptanceValidatorPath, acceptancePath], { cwd: root, encoding: 'utf8' });
  if (acceptanceResult.status !== 0) {
    throw new Error(`Acceptance validator failed synthetic report: ${acceptanceResult.stderr || acceptanceResult.stdout}`);
  }
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log(JSON.stringify({
    ok: true,
    notebookPath,
    fixtureCount: manifest.fixtures.length,
    checkedInPlanCount: manifest.checkedInPlans?.length ?? 0,
    evaluator: evaluatorPath,
    acceptanceValidator: acceptanceValidatorPath,
    pagesPolicy: 'includes notebook, starter notebook, fixtures, schemas, validation manifest, docs',
    boundary: 'Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.'
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
}

function buildSyntheticAcceptanceReport({ notebook, benchmarkRecord }) {
  const officialScore = benchmarkRecord.outcome?.officialScore ?? 23.593559;
  const report = {
    reportType: 'anchor.colab-benchmark-acceptance',
    reportVersion: '1.0.0',
    status: 'PASS',
    notebookDigest: stableDigest(notebook),
    repositoryCommit: 'synthetic-validator-smoke',
    pythonVersion: '3.11.0',
    libraryVersions: { pandas: 'synthetic', matplotlib: 'synthetic' },
    nodeVersion: process.version,
    validationBaselineId: 'scientific-validation-baseline-sci-valid-r2a',
    validationBaselineDigest: 'fnv1a32:dd016175',
    fixtureDigests: { static_additive_routing: 'fnv1a32:c01ab001' },
    environmentDigest: benchmarkRecord.problem?.environmentDigest ?? 'fnv1a32:c01ab001',
    missionDigest: benchmarkRecord.problem?.missionDigest ?? 'fnv1a32:c01ab101',
    fairnessClass: 'FORECAST_ONLY',
    dataParity: {
      schema: 'PASS',
      axes: 'PASS',
      bathymetry: 'WARN',
      masks: 'PASS',
      currents: 'PASS',
      scalars: 'PASS',
      missionGeometry: 'PASS',
      probeCount: 3,
      failedProbeCount: 0
    },
    algorithms: {
      dijkstra: { completed: true, optimalityStatus: 'EXACT_FOR_DECLARED_GRAPH', solveTimeSeconds: 0.001, cost: 1 },
      astar: { completed: true, optimalityStatus: 'EXACT_IF_HEURISTIC_ADMISSIBLE', solveTimeSeconds: 0.001, cost: 1 },
      dijkstraAstarCostDelta: { value: 0, status: 'PASS' },
      weightedAstar: { completed: true, optimalityStatus: 'HEURISTIC', solveTimeSeconds: 0.001, cost: 1 },
      greedyValuePerCost: { completed: true, optimalityStatus: 'HEURISTIC', solveTimeSeconds: 0.001, cost: 1 },
      beamSearch: { completed: true, optimalityStatus: 'HEURISTIC', solveTimeSeconds: 0.001, cost: 1 },
      timeExpandedAstar: { completed: true, optimalityStatus: 'EXACT_FOR_DECLARED_TIME_EXPANDED_GRAPH_IF_HEURISTIC_ADMISSIBLE', solveTimeSeconds: 0.001, cost: 1 },
      exactSmallInstanceOracle: { completed: true, optimalityStatus: 'EXACT_FOR_DECLARED_BOUNDED_CANDIDATE_SET', solveTimeSeconds: 0.001, cost: 1 }
    },
    officialEvaluation: {
      planDigest: benchmarkRecord.artifacts?.planDigest ?? 'fnv1a32:plan0001',
      simulationResultDigest: benchmarkRecord.artifacts?.simulationResultDigest ?? 'fnv1a32:sim00001',
      scoreProfileId: benchmarkRecord.artifacts?.scoreProfileId ?? 'balancedMission',
      scoreProfileVersion: benchmarkRecord.artifacts?.scoreProfileVersion ?? 'score-pkg-r1',
      scoreResultDigest: benchmarkRecord.artifacts?.scoreResultDigest ?? 'fnv1a32:score001',
      officialScore,
      terminalReason: benchmarkRecord.outcome?.terminalReason ?? 'headlessMissionComplete'
    },
    outputArtifacts: ['plans/astar.anchor.plan.json', 'results/astar/benchmark_summary.json'],
    warnings: ['Synthetic validator smoke; not a real Colab acceptance report.'],
    failures: [],
    boundary: 'Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.',
    notebookVersion: 'colab-bench-r1'
  };
  report.reportDigest = stableDigest(reportWithoutDigest(report));
  return report;
}

function reportWithoutDigest(report) {
  const copy = { ...report };
  delete copy.reportDigest;
  return copy;
}

function assertNoPythonSimulatorPort() {
  const forbidden = [
    'class SimulationEngine',
    'def score_mission',
    'def official_score',
    'ScoreResult(',
    'tensorflow',
    'torch',
    'gymnasium',
    'pettingzoo'
  ];
  const files = fs.readdirSync(path.join(root, 'tools/python/anchor_benchmark')).filter((file) => file.endsWith('.py'));
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, 'tools/python/anchor_benchmark', file), 'utf8');
    for (const marker of forbidden) assert.ok(!text.includes(marker), `forbidden Python marker ${marker} in ${file}`);
  }
}

function assertExists(relativePath) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `missing ${relativePath}`);
}

function readJson(relativeOrAbsolutePath) {
  const filePath = path.isAbsolute(relativeOrAbsolutePath) ? relativeOrAbsolutePath : path.join(root, relativeOrAbsolutePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertOrdered(text, ordered) {
  let previous = -1;
  for (const item of ordered) {
    const index = text.indexOf(item);
    assert.ok(index > previous, `notebook heading order failed for ${item}`);
    previous = index;
  }
}
