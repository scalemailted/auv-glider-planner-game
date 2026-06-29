import { existsSync, statSync } from 'node:fs';
import { cp, mkdir, readdir, rm, stat, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const out = path.join(root, '_site');
const copyRoots = [
  'index.html',
  'assets',
  'css',
  'src',
  'vendor',
  'packages',
  'labs',
  'schemas',
  'alpha',
  'validation',
  'levels',
  'missions',
  'plans',
  'experiments',
  'tutorials/import-demo'
];
const excludeNames = new Set(['node_modules', '.git', '.github', 'tests', 'test-results', 'tmp', 'coverage', '.codex', '.agents', '_site']);
const publicDocs = [
  'docs/architecture.md',
  'docs/history.md',
  'docs/testing.md',
  'docs/export_formats.md',
  'docs/artifact_codec_and_schema_contract.md',
  'docs/scientific_validation_and_methods.md',
  'docs/alpha_release.md',
  'docs/classical_planner_benchmark_notebook.md',
  'docs/mission_format.md',
  'docs/plan_format.md',
  'docs/solver_workflow.md',
  'docs/game_design_scientific_auv_planning.md',
  'docs/benchmark_modes.md',
  'docs/scoring_and_benchmark_contract.md',
  'docs/water_column_2p5d_sampling_model.md',
  'docs/current_runtime_baseline.md',
  'docs/current_package_architecture.md',
  'docs/bathymetry_package_architecture.md',
  'docs/threejs_first_architecture.md',
  'docs/threejs_static_runtime.md',
  'docs/threejs_planning_tools_and_camera.md',
  'docs/threejs_replay_and_debrief_review.md',
  'docs/threejs_mission_editor.md',
  'docs/headless_bundle_loader.md',
  'docs/headless_solver_packet_roundtrip.md',
  'docs/replay_artifact_schemas.md',
  'docs/flow_fields_demo.md',
  'docs/sample_fields_demo.md',
  'docs/coupled_fields_demo.md',
  'docs/uncertainty_forecast_demo.md',
  'docs/sampling_priority_demo.md',
  'docs/flow_coupled_sampling_demo.md',
  'docs/repository_cleanup.md',
  'docs/repository_cleanup_r2.md',
  'docs/repository_cleanup_r3.md',
  'docs/smoke_spec_decomposition_audit.md',
  'docs/test_portfolio_r2.md',
  'docs/examples/headless_oceanbox_js_public_bundle.example.json',
  'docs/examples/headless_oceanbox_js_bundle.example.json',
  'docs/examples/headless_solver_roundtrip_bundle.example.json',
  'docs/examples/headless_motion_cost_graph_bundle.example.json',
  'docs/examples/headless_mission_score_bundle.example.json',
  'docs/examples/headless_replay_public.example.json',
  'docs/examples/headless_replay_tampered_digest.example.json',
  'docs/examples/headless_replay_multi_agent.example.json',
  'tools/python/notebooks/anchor_classical_planner_benchmark.ipynb',
  'tools/python/notebooks/anchor_external_solver_template.ipynb',
  'tools/python/anchor_benchmark/__init__.py',
  'tools/python/anchor_benchmark/benchmark.py',
  'tools/python/anchor_benchmark/bundle.py',
  'tools/python/anchor_benchmark/exports.py',
  'tools/python/anchor_benchmark/graph.py',
  'tools/python/anchor_benchmark/io.py',
  'tools/python/anchor_benchmark/model.py',
  'tools/python/anchor_benchmark/oracles.py',
  'tools/python/anchor_benchmark/parity.py',
  'tools/python/anchor_benchmark/planners.py',
  'tools/python/anchor_benchmark/visualization.py',
  'tests/fixtures/colab_benchmark/manifest.json',
  'tests/fixtures/colab_benchmark/static_additive_routing_solver_packet.json',
  'tests/fixtures/colab_benchmark/small_science_orienteering_solver_packet.json',
  'tests/fixtures/colab_benchmark/time_varying_current_solver_packet.json',
  'tests/fixtures/colab_benchmark/regional_challenge_solver_packet.json',
  'tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json',
  'tests/fixtures/colab_benchmark/bundles/small_science_orienteering.classical-planner-benchmark-bundle.json',
  'tests/fixtures/colab_benchmark/bundles/time_varying_current.classical-planner-benchmark-bundle.json',
  'tests/fixtures/colab_benchmark/bundles/regional_challenge.classical-planner-benchmark-bundle.json',
  'tests/fixtures/colab_benchmark/colab_bench_r1_1_local_acceptance.json',
  'tests/fixtures/colab_benchmark/plans/static_additive_astar.anchor.plan.json'
];

runNode('tools/js/check_three_vendor.mjs');
runNode('tools/js/audit_three_vendor_git_tracking.mjs');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of copyRoots) {
  const source = path.join(root, entry);
  if (!existsSync(source)) continue;
  await copyEntry(source, path.join(out, entry));
}
await copyPublicDocs();
await writeFile(path.join(out, '.nojekyll'), '', 'utf8');
for (const required of ['index.html', 'assets/reference_bathymetry/tile-library-manifest.json', 'assets/reference_bathymetry/etopo2022_global_overview_60s.reference-bathymetry-overview.json', 'assets/reference_bathymetry/etopo2022_global_overview_60s.reference-bathymetry-raster.json', 'vendor/three/build/three.module.js', 'vendor/three/build/three.core.js', 'vendor/three/LICENSE', 'vendor/phaser.min.js', 'packages/bathymetry/src/index.js', 'packages/contracts/src/index.js', 'packages/currents/src/index.js', 'packages/codecs/src/index.js', 'packages/validation/src/index.js', 'alpha/release-manifest.json', 'alpha/scenario-catalog.json', 'alpha/feedback-ledger.json', 'validation/manifest.json', 'schemas/scientific-validation-report.schema.json', 'schemas/scientific-validation-manifest.schema.json', 'schemas/classical-planner-benchmark-bundle.schema.json', 'schemas/alpha-release-manifest.schema.json', 'schemas/alpha-diagnostic-bundle.schema.json', 'tools/python/notebooks/anchor_classical_planner_benchmark.ipynb', 'tools/python/notebooks/anchor_external_solver_template.ipynb', 'tools/python/anchor_benchmark/bundle.py', 'tests/fixtures/colab_benchmark/manifest.json', 'tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json']) {
  if (!existsSync(path.join(out, required))) throw new Error(`_site missing required file: ${required}`);
}
const siteIndex = await readFile(path.join(out, 'index.html'), 'utf8');
if (!siteIndex.includes('"three": "./vendor/three/build/three.module.js"')) throw new Error('_site/index.html import map does not resolve three to vendor/three/build/three.module.js.');
if (!siteIndex.includes('"three/addons/": "./vendor/three/examples/jsm/"')) throw new Error('_site/index.html import map does not preserve three/addons mapping.');
runNode('tools/js/audit_github_pages_paths.mjs');
runNode('tools/js/audit_bathymetry_package_static_paths.mjs');
const unresolved = await findUnresolvedRuntimeImports(out);
if (unresolved.length) {
  console.error('Unresolved runtime imports in _site:');
  for (const item of unresolved) console.error(`- ${item}`);
  process.exit(1);
}
const stats = await countFiles(out);
console.log(`Built _site with ${stats.count} files (${stats.bytes} bytes).`);

async function copyPublicDocs() {
  for (const entry of publicDocs) {
    const source = path.join(root, entry);
    if (!existsSync(source)) continue;
    await copyEntry(source, path.join(out, entry));
  }
}
async function copyEntry(source, destination) {
  const name = path.basename(source);
  if (excludeNames.has(name)) return;
  const sourceStat = await stat(source);
  if (sourceStat.isDirectory()) {
    await mkdir(destination, { recursive: true });
    for (const child of await readdir(source)) await copyEntry(path.join(source, child), path.join(destination, child));
  } else {
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { force: true });
  }
}

async function countFiles(dir) {
  let count = 0;
  let bytes = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const child = await countFiles(full);
      count += child.count;
      bytes += child.bytes;
    } else {
      count += 1;
      bytes += statSync(full).size;
    }
  }
  return { count, bytes };
}

async function findUnresolvedRuntimeImports(siteRoot) {
  const failures = [];
  const files = [
    ...await walk(path.join(siteRoot, 'src')),
    ...await walk(path.join(siteRoot, 'packages'))
  ];
  for (const file of files.filter((candidate) => candidate.endsWith('.js'))) {
    const text = await import('node:fs/promises').then((fs) => fs.readFile(file, 'utf8'));
    for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      if (specifier === 'three' || specifier.startsWith('three/addons/')) continue;
      if (specifier.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), specifier);
        if (!existsSync(resolved)) failures.push(`${path.relative(siteRoot, file)} -> ${specifier}`);
      }
    }
  }
  return failures;
}
async function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function runNode(script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
