import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const runtimeDir = 'src/core/headless/runtime';
const replayDir = 'src/core/replay';
const files = [
  ...fs.readdirSync(runtimeDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(runtimeDir, name)),
  ...fs.readdirSync(replayDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(replayDir, name))
];
files.push(
  'src/core/headless/HeadlessCsv.js',
  'src/core/headless/HeadlessBundleLoader.js',
  'src/core/headless/HeadlessBundleValidation.js',
  'src/core/headless/HeadlessBundleViewModel.js',
  'src/core/headless/HeadlessBundleBrowserAdapter.js',
  'src/core/headless/HeadlessRoundtrip.js',
  'src/core/headless/HeadlessRoundtripTypes.js',
  'src/core/headless/HeadlessSolverPacketAdapter.js',
  'src/core/headless/HeadlessPlanAdapter.js',
  'src/core/headless/HeadlessSolverRoundtrip.js',
  'src/core/headless/HeadlessRoundtripExport.js',
  'src/core/rendering/MissionWorldCoordinates.js',
  'src/core/rendering/MissionWorldRenderViewModel.js',
  'src/core/rendering/MissionWorldStateAdapter.js',
  'src/core/science/WaterColumnSchema.js',
  'src/core/science/BathymetrySchema.js',
  'src/core/science/BathymetryFieldModel.js',
  'src/core/science/BathymetryMeshModel.js',
  'src/core/science/OceanWorldGeometryAdapter.js',
  'src/core/science/WaterColumnFieldModel.js',
  'src/core/science/DiveProfileModel.js',
  'src/core/science/WaterColumnObservationModel.js',
  'src/core/science/WaterColumnPriorityModel.js',
  'src/core/motion/GliderMotionSchema.js',
  'src/core/motion/MotionEnvironmentSampler.js',
  'src/core/motion/GliderDynamicsModel.js',
  'src/core/motion/PlanControlAdapter.js',
  'src/core/motion/MotionDiagnostics.js',
  'src/core/motion/GliderTrajectorySimulator.js',
  'src/core/motion/MissionFeasibilityReport.js',
  'src/core/motion/MotionCostGraphSchema.js',
  'src/core/motion/MotionCostGraphNodes.js',
  'src/core/motion/MotionCostGraphNeighbors.js',
  'src/core/motion/MotionEdgeCostEstimator.js',
  'src/core/motion/MotionCostGraphBuilder.js',
  'src/core/motion/MotionCostMatrixExporter.js',
  'src/core/motion/MotionCostGraphPublicSafety.js',
  'src/core/scoring/MissionScoringSchema.js',
  'src/core/scoring/MissionScoreComponents.js',
  'src/core/scoring/MissionScoreProfiles.js',
  'src/core/scoring/MissionOutcomeMetricAdapter.js',
  'src/core/scoring/MissionScoreNormalizer.js',
  'src/core/scoring/MissionScoreAggregator.js',
  'src/core/scoring/MissionRegretModel.js',
  'src/core/scoring/MissionOutcomeReport.js',
  'src/core/scoring/MissionScorePublicSafety.js',
  'src/core/scoring/MissionScorecardViewModel.js',
  'tools/js/headless_oceanbox.mjs'
);

const bannedPatterns = [
  /\bPhaser\b/i,
  /\bdocument\b/,
  /\bwindow\b/,
  /localStorage/,
  /src\/game\/phaser/i,
  /src\\game\\phaser/i,
  /src\/ui\//i,
  /src\\ui\\/i,
  /Panel\.js/i,
  /Scene\.js/i
];
const fsAllowed = new Set(['HeadlessBundleWriter.js', 'headless_oceanbox.mjs']);
const violations = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of bannedPatterns) {
    if (pattern.test(text)) violations.push(`${file}: banned browser/UI reference ${pattern}`);
  }
  const basename = path.basename(file);
  const importsFsOrPath = /from ['"]node:(fs|path)['"]/.test(text) || /require\(['"](fs|path|node:fs|node:path)['"]\)/.test(text);
  if (importsFsOrPath && !fsAllowed.has(basename)) violations.push(`${file}: fs/path allowed only in bundle writer or CLI`);
}

assert.deepEqual(violations, [], `Headless runtime import boundary violations:\n${violations.join('\n')}`);
console.log('Headless runtime import boundary audit passed');

