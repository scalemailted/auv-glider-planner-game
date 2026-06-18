import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'src/core/motion/MotionCostGraphSchema.js',
  'src/core/motion/MotionCostGraphNodes.js',
  'src/core/motion/MotionCostGraphNeighbors.js',
  'src/core/motion/MotionEdgeCostEstimator.js',
  'src/core/motion/MotionCostGraphBuilder.js',
  'src/core/motion/MotionCostMatrixExporter.js',
  'src/core/motion/MotionCostGraphPublicSafety.js',
  'src/core/headless/runtime/HeadlessMissionRunner.js',
  'src/core/headless/runtime/HeadlessBundleWriter.js',
  'src/core/headless/HeadlessBundleLoader.js',
  'src/core/headless/HeadlessBundleValidation.js',
  'src/core/headless/HeadlessBundleViewModel.js',
  'src/core/headless/HeadlessBundleBrowserAdapter.js',
  'src/ui/headless/HeadlessBundleViewerPanel.js',
  'tools/js/headless_oceanbox.mjs'
];

const violations = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const checks = [
    [/usesNewPlanner:\s*true/, 'claims new planner'],
    [/usesRouteOptimizer:\s*true/, 'claims route optimizer'],
    [/generatedRoute:\s*true/, 'claims route generation'],
    [/usesMARL:\s*true/, 'claims MARL/RL'],
    [/browserOfficialScoring:\s*true/, 'claims official browser scoring'],
    [/calibratedOceanForecast:\s*true/, 'claims calibrated ocean forecast'],
    [/usesWebGPUFluid:\s*true/, 'claims WebGPU fluid integration']
  ];
  for (const [pattern, label] of checks) {
    if (pattern.test(text)) violations.push(`${file}: ${label}`);
  }
}

assert.deepEqual(violations, [], `SIM-R1 boundary violations:\n${violations.join('\n')}`);
console.log('Motion cost graph boundary audit passed');
