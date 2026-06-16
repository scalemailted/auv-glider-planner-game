import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const groups = [
  {
    name: 'Process Lab / Sampling Process',
    doc: 'docs/sampling_process_lab.md',
    smoke: 'tools/js/smoke_sampling_process_initial_condition_editor.mjs',
    files: [
      'src/core/demo/sampling/SamplingProcessInitialConditionEditor.js',
      'src/core/demo/sampling/SamplingProcessExampleFixtures.js',
      'src/core/demo/sampling/SamplingProcessExampleBehaviorAssertions.js',
      'src/core/demo/sampling/SamplingProcessEvolution.js',
      'src/core/demo/sampling/SamplingProcessRules.js',
      'src/game/phaser/scenes/RoiGeneratorDemoScene.js'
    ],
    markers: ['processExample', 'initialCondition', 'behaviorValidation', 'ANCHOR_ROI_UI_DEBUG']
  },
  {
    name: 'Flow Fields Demo',
    doc: 'docs/flow_fields_demo.md',
    smoke: 'tools/js/smoke_flow_field_demo.mjs',
    files: [
      'src/core/demo/flow/FlowFieldMath.js',
      'src/core/demo/flow/FlowFieldDiagnostics.js',
      'src/core/demo/FlowFieldDemo.js',
      'src/game/phaser/scenes/FlowFieldDemoScene.js'
    ],
    markers: ['flowFieldModel', 'flowFieldDiagnostics', 'ANCHOR_FLOW_DEMO_DEBUG']
  },
  {
    name: 'Coupled Fields Demo',
    doc: 'docs/coupled_fields_demo.md',
    smoke: 'tools/js/smoke_oracle_coupled_objective.mjs',
    files: [
      'src/core/demo/coupled/CoupledFieldMath.js',
      'src/core/demo/coupled/AnalyticScalarProcessEngines.js',
      'src/core/demo/coupled/CoupledProcessEngineContract.js',
      'src/core/demo/coupled/OracleCoupledObjective.js',
      'src/core/demo/coupled/CoupledProcessValidation.js',
      'src/game/phaser/scenes/CoupledFieldsDemoScene.js'
    ],
    markers: ['coupledProcessEngine', 'oracleObjective', 'ANCHOR_COUPLED_DEMO_DEBUG']
  },
  {
    name: 'Uncertainty / Forecast Demo',
    doc: 'docs/uncertainty_forecast_demo.md',
    smoke: 'tools/js/smoke_uncertainty_forecast_demo.mjs',
    files: [
      'src/core/demo/uncertainty/',
      'src/core/demo/UncertaintyForecastDemo.js',
      'src/game/phaser/scenes/UncertaintyForecastDemoScene.js'
    ],
    markers: ['uncertaintyModel', 'observationModel', 'beliefState', 'diagnostics', 'ANCHOR_UNCERTAINTY_DEMO_DEBUG']
  },
  {
    name: 'Sampling Priority Demo S1',
    doc: 'docs/sampling_priority_demo.md',
    smoke: 'tools/js/smoke_sampling_priority_demo.mjs',
    required: true,
    files: [
      'src/core/demo/samplingPriority/SamplingPriorityFieldMath.js',
      'src/core/demo/samplingPriority/SamplingPriorityScenarios.js',
      'src/core/demo/samplingPriority/SamplingPriorityModel.js',
      'src/core/demo/samplingPriority/SamplingPriorityCandidates.js',
      'src/core/demo/samplingPriority/SamplingPriorityValidation.js',
      'src/game/phaser/scenes/SamplingPriorityDemoScene.js'
    ],
    markers: ['samplingPriorityModel', 'candidateSamplePoints', 'priorityDiagnostics', 'ANCHOR_SAMPLING_PRIORITY_DEMO_DEBUG']
  },
  {
    name: 'Flow-Coupled Sampling Demo S2',
    doc: 'docs/flow_coupled_sampling_demo.md',
    smoke: 'tools/js/smoke_flow_coupled_sampling_demo.mjs',
    required: true,
    files: [
      'src/core/demo/flowCoupledSampling/FlowCoupledSamplingFieldMath.js',
      'src/core/demo/flowCoupledSampling/FlowCoupledSamplingScenarios.js',
      'src/core/demo/flowCoupledSampling/GliderActionValueModel.js',
      'src/core/demo/flowCoupledSampling/GliderActionCandidates.js',
      'src/core/demo/flowCoupledSampling/FlowCoupledSamplingValidation.js',
      'src/game/phaser/scenes/FlowCoupledSamplingDemoScene.js'
    ],
    markers: ['flowCoupledSamplingModel', 'gliderActionContext', 'candidateTargets', 'actionValueDiagnostics', 'ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG']
  },
  {
    name: 'Benchmark Modes P0',
    doc: 'docs/benchmark_modes.md',
    smoke: 'tools/js/smoke_benchmark_mode_contract.mjs',
    required: true,
    files: [
      'src/core/benchmark/BenchmarkModeContract.js',
      'src/core/benchmark/BenchmarkRunRecord.js',
      'src/core/benchmark/MissionObjectiveTaxonomy.js',
      'src/core/benchmark/BenchmarkModeState.js',
      'src/core/benchmark/BenchmarkModeExporter.js',
      'src/game/phaser/scenes/BenchmarkModeOverviewScene.js'
    ],
    markers: ['plannerBenchmark', 'adaptiveBenchmark', 'fullAutonomyBenchmark', 'ANCHOR_BENCHMARK_MODE_DEBUG']
  },
  {
    name: 'Benchmark Modes P1',
    doc: 'docs/benchmark_route_execution_contract.md',
    smoke: 'tools/js/smoke_benchmark_episode_contract.mjs',
    required: true,
    files: [
      'src/core/benchmark/BenchmarkEpisodeContract.js',
      'src/core/benchmark/BenchmarkRouteExecutionRecord.js',
      'src/core/benchmark/BenchmarkResultAdapter.js',
      'src/core/benchmark/BenchmarkAttemptRegistry.js',
      'src/core/benchmark/BenchmarkMetadata.js',
      'src/core/benchmark/BenchmarkLaunchBridge.js',
      'src/core/benchmark/BenchmarkModeExporter.js',
      'src/game/phaser/scenes/BenchmarkModeOverviewScene.js'
    ],
    markers: ['anchor.benchmark.episode-config', 'anchor.benchmark.route-execution', 'anchor.benchmark.attempt-set', 'ANCHOR_BENCHMARK_EPISODE_DEBUG']
  },  {
    name: 'Learning Labs',
    doc: 'labs/index.html',
    smoke: 'tools/js/smoke_learning_lab_sampling_action_value.mjs',
    required: true,
    files: [
      'labs/index.html',
      'labs/sampling-priority-to-glider-action-value.html',
      'src/labs/widgets/SamplingActionValueWidgets.js'
    ],
    markers: ['A_global', 'Q_glider', 'Event intensity is not sampling priority', 'Action value is not route planning']
  }
];

const failures = [];
const rows = [];

for (const group of groups) {
  const docPresent = await exists(group.doc);
  const smokePresent = await exists(group.smoke);
  const groupSources = [];
  const fileRows = [];

  for (const file of group.files) {
    const present = await exists(file);
    const directory = present ? await isDirectory(file) : file.endsWith('/');
    let importable = 'n/a';
    let error = null;
    if (present && !directory && file.endsWith('.js')) {
      try {
        await import(pathToFileUrl(path.join(ROOT, file)));
        importable = 'yes';
      } catch (importError) {
        importable = 'no';
        error = importError.message;
        failures.push(`${group.name}: ${file} failed import: ${importError.message}`);
      }
    }
    if (present && !directory) groupSources.push(await read(file));
    if (!present && group.required) failures.push(`${group.name}: required file missing: ${file}`);
    fileRows.push({ file, present, importable, error });
  }

  const markerStatus = Object.fromEntries(group.markers.map((marker) => [
    marker,
    groupSources.some((source) => source.includes(marker))
  ]));
  rows.push({
    group: group.name,
    doc: { file: group.doc, present: docPresent },
    smoke: { file: group.smoke, present: smokePresent },
    files: fileRows,
    markers: markerStatus
  });
}

await verifyDocsListedSmokeScripts();
await verifySceneReferences();

console.log('MODEL STACK INVENTORY');
for (const row of rows) {
  console.log(`\n[${row.group}]`);
  console.log(`  doc: ${presentText(row.doc.present)} ${row.doc.file}`);
  console.log(`  smoke: ${presentText(row.smoke.present)} ${row.smoke.file}`);
  for (const file of row.files) {
    const suffix = file.error ? ` (${file.error})` : '';
    console.log(`  file: ${presentText(file.present)} import=${file.importable} ${file.file}${suffix}`);
  }
  for (const [marker, present] of Object.entries(row.markers)) {
    console.log(`  marker: ${presentText(present)} ${marker}`);
  }
}

if (failures.length) {
  console.error('\nSTRUCTURAL FAILURES');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('\nPASS model stack inventory');
}

async function verifyDocsListedSmokeScripts() {
  if (!(await exists('docs/testing.md'))) return;
  const testing = await read('docs/testing.md');
  const matches = [...testing.matchAll(/node\s+tools[\\/]+js[\\/]+[A-Za-z0-9_.-]+\.mjs/g)]
    .map((match) => match[0].replace(/^node\s+/, '').replaceAll('\\', '/'));
  for (const script of new Set(matches)) {
    if (!(await exists(script))) failures.push(`docs/testing.md lists missing smoke/audit script: ${script}`);
  }
}

async function verifySceneReferences() {
  const missionConsole = await readIfExists('src/ui/MissionConsole.js');
  const phaserGame = await readIfExists('src/game/phaser/PhaserGame.js');
  const expected = [
    {
      label: 'Flow Fields Demo',
      labels: ['Flow Fields Demo'],
      sceneName: 'FlowFieldDemoScene',
      file: 'src/game/phaser/scenes/FlowFieldDemoScene.js'
    },
    {
      label: 'Coupled Fields Demo',
      labels: ['Coupled Fields Demo'],
      sceneName: 'CoupledFieldsDemoScene',
      file: 'src/game/phaser/scenes/CoupledFieldsDemoScene.js'
    },
    {
      label: 'Uncertainty / Forecast Demo',
      labels: ['Uncertainty / Forecast Demo'],
      sceneName: 'UncertaintyForecastDemoScene',
      file: 'src/game/phaser/scenes/UncertaintyForecastDemoScene.js'
    },
    {
      label: 'Sampling Priority Demo',
      labels: ['Sampling Priority Demo'],
      sceneName: 'SamplingPriorityDemoScene',
      file: 'src/game/phaser/scenes/SamplingPriorityDemoScene.js'
    },
    {
      label: 'Flow-Coupled Sampling Demo',
      labels: ['Flow-Coupled Sampling Demo'],
      sceneName: 'FlowCoupledSamplingDemoScene',
      file: 'src/game/phaser/scenes/FlowCoupledSamplingDemoScene.js'
    },
    {
      label: 'Planner Benchmark',
      labels: ['Planner Benchmark'],
      sceneName: 'BenchmarkModeOverviewScene',
      file: 'src/game/phaser/scenes/BenchmarkModeOverviewScene.js'
    },
    {
      label: 'Adaptive Benchmark',
      labels: ['Adaptive Benchmark'],
      sceneName: 'BenchmarkModeOverviewScene',
      file: 'src/game/phaser/scenes/BenchmarkModeOverviewScene.js'
    },
    {
      label: 'Full Autonomy Benchmark',
      labels: ['Full Autonomy Benchmark'],
      sceneName: 'BenchmarkModeOverviewScene',
      file: 'src/game/phaser/scenes/BenchmarkModeOverviewScene.js'
    },
    {
      label: 'Process Lab / Sampling Process Lab',
      labels: ['Process Lab', 'Sampling Process Lab', 'Spatiotemporal Sampling Process Lab', 'SAMPLING_PROCESS_LAB_MENU_LABEL'],
      sceneName: 'RoiGeneratorDemoScene',
      file: 'src/game/phaser/scenes/RoiGeneratorDemoScene.js'
    }
  ];
  for (const entry of expected) {
    const hasLabel = entry.labels.some((label) => missionConsole.includes(label));
    if (!hasLabel) failures.push(`MissionConsole missing menu label: ${entry.label}`);
    if (!phaserGame.includes(entry.sceneName) && !missionConsole.includes(entry.sceneName)) failures.push(`Scene not registered or referenced: ${entry.sceneName}`);
    if (!(await exists(entry.file))) failures.push(`Referenced scene file missing: ${entry.file}`);
  }
}

function presentText(value) {
  return value ? 'present' : 'missing';
}

async function exists(file) {
  try {
    await fs.access(path.join(ROOT, file));
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(file) {
  try {
    return (await fs.stat(path.join(ROOT, file))).isDirectory();
  } catch {
    return false;
  }
}

async function read(file) {
  return fs.readFile(path.join(ROOT, file), 'utf8');
}

async function readIfExists(file) {
  return (await exists(file)) ? read(file) : '';
}

function pathToFileUrl(file) {
  return new URL(`file://${file.replace(/\\/g, '/')}`).href;
}
