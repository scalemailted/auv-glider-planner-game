import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel, headlessBundleMotionSummary } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { buildBrowserHeadlessBundleDebugObject } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';
import { headlessBundleViewerPanelHtml } from '../../src/ui/headless/HeadlessBundleViewerPanel.js';

const episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig({
  seed: 'motion-viewer-smoke',
  width: 10,
  height: 8,
  motionAware: true,
  motionModelId: 'depthLayerKinematic'
}));
const payload = createHeadlessCombinedBundle(episode, { includeHiddenTruth: false, combinedJson: true });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
const viewModel = buildHeadlessBundleViewModel(bundle);
const motion = headlessBundleMotionSummary(bundle);
const html = headlessBundleViewerPanelHtml(viewModel);
const debug = buildBrowserHeadlessBundleDebugObject(bundle);

assert.equal(motion.present, true, 'view model motion summary present');
assert.equal(viewModel.motionSummary.usesMotionDynamics, true, 'view model marks motion dynamics');
assert.equal(viewModel.motionSummary.usesWebGPUFluid, false, 'view model does not claim WebGPU');
assert.ok(html.includes('Motion Dynamics'), 'viewer renders Motion Dynamics section');
assert.ok(html.includes('Mission Feasibility'), 'viewer renders Mission Feasibility section');
assert.ok(html.includes('commanded route'), 'viewer explains commanded route comparison');
assert.ok(html.includes('Planned Distance'), 'viewer includes planned-vs-realized metrics');
assert.ok(html.includes('Track Error'), 'viewer includes track error metrics');
assert.ok(html.includes('Current Assist'), 'viewer includes current assist metrics');
assert.ok(html.includes('Cross-Current'), 'viewer includes cross-current metrics');
assert.ok(html.includes('not a new route planner'), 'viewer states planner boundary');
assert.ok(html.includes('not replace browser official scoring'), 'viewer states scoring boundary');
assert.ok(html.includes('not SeaExplorer-specific validation'), 'viewer states SeaExplorer boundary');
assert.equal(debug.hasMotionTrajectory, true, 'browser debug object sees motion trajectory');
assert.equal(debug.hasMotionDiagnostics, true, 'browser debug object sees motion diagnostics');
assert.equal(debug.hasMissionFeasibilityReport, true, 'browser debug object sees mission feasibility report');
assert.equal(debug.usesMotionDynamics, true, 'browser debug marks motion dynamics');
assert.equal(debug.usesWebGPUFluid, false, 'browser debug does not claim WebGPU');
assert.equal(debug.usesSeaExplorerValidatedModel, false, 'browser debug does not claim SeaExplorer validation');
const escapedHtml = headlessBundleViewerPanelHtml({ ...viewModel, motionSummary: { ...viewModel.motionSummary, motionModelId: '<img src=x onerror=alert(1)>' } });
assert.equal(escapedHtml.includes('<img src=x'), false, 'viewer escapes unsafe motion text');
assert.equal(JSON.stringify(debug).includes('T_hiddenTruth'), false, 'debug object omits hidden truth');

console.log('Headless motion viewer panel smoke passed', { meanTrackError: motion.meanTrackError });
