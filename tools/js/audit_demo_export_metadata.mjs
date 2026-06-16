import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const audits = [
  {
    name: 'Process Lab',
    files: [
      'src/core/demo/sampling/SamplingProcessExportBuilder.js',
      'src/game/phaser/scenes/RoiGeneratorDemoScene.js'
    ],
    requiredWhenPresent: [
      'processExample',
      'initialCondition',
      'behaviorValidation',
      'referenceSignatureId',
      'referenceSignature'
    ]
  },
  {
    name: 'Flow Fields Demo',
    files: ['src/game/phaser/scenes/FlowFieldDemoScene.js', 'src/core/io/DemoArtifactExporter.js'],
    requiredWhenPresent: ['flowFieldModel', 'flowFieldDiagnostics']
  },
  {
    name: 'Coupled Fields Demo',
    files: ['src/game/phaser/scenes/CoupledFieldsDemoScene.js', 'src/core/io/DemoArtifactExporter.js'],
    requiredWhenPresent: ['coupledProcessEngine', 'oracleObjective']
  },
  {
    name: 'Uncertainty / Forecast Demo',
    files: ['src/game/phaser/scenes/UncertaintyForecastDemoScene.js', 'src/core/io/DemoArtifactExporter.js'],
    requiredWhenPresent: ['uncertaintyModel', 'observationModel', 'beliefState', 'diagnostics']
  },
  {
    name: 'Sampling Priority Demo',
    files: ['src/game/phaser/scenes/SamplingPriorityDemoScene.js', 'src/core/io/DemoArtifactExporter.js'],
    requiredWhenPresent: ['samplingPriorityModel', 'candidateSamplePoints', 'priorityDiagnostics']
  },
  {
    name: 'Flow-Coupled Sampling Demo',
    files: ['src/game/phaser/scenes/FlowCoupledSamplingDemoScene.js', 'src/core/io/DemoArtifactExporter.js'],
    requiredWhenPresent: ['flowCoupledSamplingModel', 'gliderActionContext', 'candidateTargets', 'actionValueDiagnostics']
  },
  {
    name: 'Benchmark Mode Config',
    files: ['src/core/benchmark/BenchmarkModeExporter.js', 'src/game/phaser/scenes/BenchmarkModeOverviewScene.js'],
    requiredWhenPresent: ['anchor.benchmark.mode-config', 'anchor.benchmark.episode-config', 'anchor.benchmark.run-record', 'anchor.benchmark.route-execution', 'anchor.benchmark.attempt-set', 'benchmarkModeConfig', 'objectiveTaxonomyVersion', 'runRecordVersion', 'usesMARL']
  }
];

const failures = [];
const warnings = [];

console.log('DEMO EXPORT METADATA AUDIT');
for (const audit of audits) {
  const presentFiles = [];
  const sources = [];
  for (const file of audit.files) {
    if (await exists(file)) {
      presentFiles.push(file);
      sources.push(await read(file));
    }
  }
  if (!presentFiles.length) {
    warnings.push(`${audit.name}: no implementation files found; skipping optional audit`);
    continue;
  }
  const source = sources.join('\n');
  const markerResults = audit.requiredWhenPresent.map((marker) => ({
    marker,
    present: source.includes(marker)
  }));
  console.log(`\n[${audit.name}]`);
  presentFiles.forEach((file) => console.log(`  source: ${file}`));
  markerResults.forEach((result) => console.log(`  ${result.present ? 'ok' : 'missing'}: ${result.marker}`));
  const missing = markerResults.filter((result) => !result.present).map((result) => result.marker);
  if (missing.length) failures.push(`${audit.name}: missing export metadata marker(s): ${missing.join(', ')}`);
}

if (warnings.length) {
  console.log('\nWARNINGS');
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (failures.length) {
  console.error('\nFAILURES');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('\nPASS demo export metadata audit');
}

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
