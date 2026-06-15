import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const expected = {
  labs: [
    'labs/index.html',
    'labs/deterministic-spatiotemporal-processes.html',
    'labs/deterministic-dynamic-flow-fields.html',
    'labs/oracle-deterministic-coupled-sampling-space.html',
    'labs/stochastic-uncertainty.html',
    'labs/stochastic-coupled-sampling-space.html',
    'labs/planner-mission-evaluation.html'
  ],
  widgets: [
    'src/labs/widgets/DeterministicProcessWidgets.js',
    'src/labs/widgets/FlowFieldLearningWidgets.js',
    'src/labs/widgets/CoupledSamplingLearningWidgets.js',
    'src/labs/widgets/UncertaintyLearningWidgets.js',
    'src/labs/widgets/StochasticCoupledLearningWidgets.js',
    'src/labs/widgets/PlannerLearningWidgets.js'
  ],
  smokeScripts: [
    'tools/js/smoke_learning_labs_static.mjs',
    'tools/js/smoke_learning_lab_deterministic_processes.mjs',
    'tools/js/smoke_learning_lab_flow_fields.mjs',
    'tools/js/smoke_learning_lab_coupled_sampling_space.mjs',
    'tools/js/smoke_learning_lab_uncertainty.mjs',
    'tools/js/smoke_learning_lab_stochastic_coupled_sampling_space.mjs',
    'tools/js/smoke_learning_lab_planner_mission_evaluation.mjs'
  ],
  docs: [
    'README.md',
    'HOWPLAY.md',
    'docs/testing.md',
    'docs/development_versions.md',
    'docs/export_formats.md',
    'docs/plan_format.md',
    'docs/solver_workflow.md',
    'docs/leaderboard.md',
    'docs/sample_fields_demo.md',
    'docs/roi_generator_demo.md',
    'docs/flow_fields_demo.md',
    'docs/coupled_fields_demo.md',
    'docs/uncertainty_forecast_demo.md'
  ],
  scenes: [
    'src/game/phaser/scenes/RoiGeneratorDemoScene.js',
    'src/game/phaser/scenes/FlowFieldDemoScene.js',
    'src/game/phaser/scenes/CoupledFieldsDemoScene.js',
    'src/game/phaser/scenes/UncertaintyForecastDemoScene.js',
    'src/game/phaser/scenes/MissionWorkspaceScene.js',
    'src/game/phaser/scenes/SimulationScene.js',
    'src/game/phaser/scenes/DebriefScene.js'
  ],
  samplingModules: [
    'src/core/demo/sampling/SamplingProcessTerminology.js',
    'src/core/demo/sampling/SamplingProcessRules.js',
    'src/core/demo/sampling/SamplingProcessEvolution.js',
    'src/core/demo/sampling/SamplingProcessPaintModel.js',
    'src/core/demo/sampling/SamplingProcessRandomizer.js',
    'src/core/demo/sampling/SamplingProcessModeController.js',
    'src/core/demo/sampling/SamplingProcessConsoleViewModel.js',
    'src/core/demo/sampling/SamplingProcessConsoleHandlers.js',
    'src/core/demo/sampling/SamplingProcessUiConfig.js',
    'src/core/demo/sampling/SamplingProcessViewModel.js',
    'src/core/demo/sampling/SamplingProcessExportBuilder.js',
    'src/core/demo/sampling/SamplingProcessPaintFieldAdapter.js'
  ],
  roiModules: [
    'src/core/demo/roi/RoiReferenceSignatures.js',
    'src/core/demo/roi/RoiReferenceModelCatalog.js',
    'src/core/demo/roi/RoiScenarioGenerator.js',
    'src/core/demo/roi/RoiScenarioValidation.js'
  ]
};

const groups = Object.entries(expected);
const summary = {};
let failed = false;

for (const [group, files] of groups) {
  const results = await Promise.all(files.map(async (file) => ({ file, exists: await exists(file) })));
  summary[group] = results;
  const missing = results.filter((item) => !item.exists);
  if (missing.length > 0) failed = true;
}

const labExternalRefs = [];
for (const file of expected.labs) {
  if (!(await exists(file))) continue;
  const text = await read(file);
  if (/https?:\/\//i.test(text)) labExternalRefs.push(file);
}

const terminology = await read('src/core/demo/sampling/SamplingProcessTerminology.js');
const terminologyChecks = [
  'SAMPLING_PROCESS_LAB_TITLE',
  'SAMPLING_PROCESS_LEGACY_DEMO_NAME',
  'SAMPLING_PROCESS_EXPORT_TYPE',
  'SAMPLING_PROCESS_LEGACY_EXPORT_TYPE',
  'samplingProcessModeLabel',
  'sourceFieldBoundaryNote'
].map((needle) => ({ needle, present: terminology.includes(needle) }));

const report = {
  generatedAt: new Date().toISOString(),
  groups: summary,
  labExternalRefs,
  terminologyChecks
};

for (const [group, results] of Object.entries(summary)) {
  const missing = results.filter((item) => !item.exists).map((item) => item.file);
  console.log(`${group}: ${results.length - missing.length}/${results.length} present`);
  if (missing.length) console.log(`  missing: ${missing.join(', ')}`);
}

if (labExternalRefs.length) {
  failed = true;
  console.log(`external lab references: ${labExternalRefs.join(', ')}`);
}

const missingTerminology = terminologyChecks.filter((item) => !item.present).map((item) => item.needle);
if (missingTerminology.length) {
  failed = true;
  console.log(`missing terminology exports/text: ${missingTerminology.join(', ')}`);
}

console.log(JSON.stringify(report, null, 2));

if (failed) {
  throw new Error('Learning Labs and sandbox readiness audit found missing required files or external lab references.');
}

console.log('PASS labs and sandboxes readiness audit');

async function exists(file) {
  try {
    await fs.access(path.join(ROOT, file));
    return true;
  } catch {
    return false;
  }
}

async function read(file) {
  return fs.readFile(path.join(ROOT, file), 'utf8');
}
