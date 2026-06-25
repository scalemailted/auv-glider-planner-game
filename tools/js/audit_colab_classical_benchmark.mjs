#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { decodeArtifact, DecodeStatus } from '../../packages/codecs/src/index.js';

const root = process.cwd();
const notebookPath = 'tools/python/notebooks/anchor_classical_planner_benchmark.ipynb';
const starterNotebookPath = 'tools/python/notebooks/anchor_external_solver_template.ipynb';
const fixtureManifestPath = 'tests/fixtures/colab_benchmark/manifest.json';
const evaluatorPath = 'tools/js/evaluate_colab_benchmark_plan.mjs';
const pagesBuilderPath = 'tools/js/build_github_pages.mjs';

const requiredNotebookHeadings = [
  '# 0. ANCHOR Classical Planner Benchmark',
  '## 1. Configuration',
  '## 2. Environment Setup',
  '## 3. Obtain Benchmark Data',
  '## 4. Validate and Inspect Artifacts',
  '## 5. Scientific Validation Context',
  '## 6. Visualize the Environment',
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
  assertExists('tools/python/anchor_benchmark/__init__.py');
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
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log(JSON.stringify({
    ok: true,
    notebookPath,
    fixtureCount: manifest.fixtures.length,
    checkedInPlanCount: manifest.checkedInPlans?.length ?? 0,
    evaluator: evaluatorPath,
    pagesPolicy: 'includes notebook, starter notebook, fixtures, schemas, validation manifest, docs',
    boundary: 'Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.'
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
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
