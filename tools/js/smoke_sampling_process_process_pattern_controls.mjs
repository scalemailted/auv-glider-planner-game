import assert from 'node:assert/strict';

import { samplingProcessConsoleHtml } from '../../src/ui/sampling/SamplingProcessConsoleSections.js';
import { roiRecipeSignatureHtml } from '../../src/ui/sampling/SamplingProcessRightPanel.js';
import { buildReferenceSignaturePatch } from '../../src/core/demo/sampling/SamplingProcessModeController.js';
import { samplingProcessModeLabel } from '../../src/core/demo/sampling/SamplingProcessTerminology.js';
import { referenceSignatureMetadata } from '../../src/core/demo/roi/RoiReferenceSignatures.js';

const referenceSignature = referenceSignatureMetadata('stationaryTemporalBursts');
const baseState = {
  title: 'Spatiotemporal Sampling Process Lab',
  processMode: 'referenceSignature',
  patternSource: 'referenceSignature',
  processModeLabel: samplingProcessModeLabel('referenceSignature'),
  processStatusLabel: 'Pattern-Validated',
  referenceSignatureId: 'stationaryTemporalBursts',
  referenceSignatureLabel: referenceSignature.label,
  referenceSignature,
  referenceSignatureModified: false,
  behaviorPresetId: 'custom',
  behaviorPresetModified: false,
  eventLikelihood: 'multiModalLikelihood',
  eventLikelihoodDynamics: 'static',
  eventLikelihoodTemporalPattern: 'static',
  eventLikelihoodSpatialEvolution: 'stationary',
  spatialPattern: 'clusteredField',
  valueDistribution: 'gaussianNormal',
  temporalPattern: 'bursty',
  spatialEvolution: 'stationary',
  patternEvolution: 'stationary',
  motionScope: 'perFeature',
  interactionScale: 'cluster',
  stateModel: 'stateEvolving',
  depletionMode: 'soft',
  displayMode: 'sampleValue',
  dynamicComplexity: 'medium',
  clusterSize: 'medium',
  timeMode: 'dynamic',
  paused: false,
  seed: 'process-pattern-controls-smoke',
  stats: { min: 0, max: 1, mean: 0.4, totalValue: 8 },
  activityDiagnostics: {
    graphDiagnostics: {
      updateRule: 'neighborPropagation',
      edgeMessageTotal: 4,
      transitionCount: 2,
      activeNodeCount: 5,
      stateCounts: { active: 3, inactive: 9 }
    }
  },
  viewFilters: {},
  exportMode: 'currentFrame',
  exportFrameCount: 1
};

const html = samplingProcessConsoleHtml(baseState);
assert.equal(samplingProcessModeLabel('referenceSignature'), 'Example Processes', 'referenceSignature should be labeled Example Processes');
assert.equal(html.includes('id="sampling-process-mode"'), true, 'Mode selector should render');
assert.equal(html.includes('<option value="referenceSignature" selected>Example Processes</option>'), true, 'Mode selector should show Example Processes');
assert.equal(html.includes('id="roi-demo-reference-signature"'), true, 'Process Pattern selector should render in Example Processes mode');
assert.equal(html.includes('id="roi-demo-pattern-source"'), false, 'Pattern Source dropdown should not render visibly');
assert.equal(html.includes('Explain Recurrent Stationary Hotspots'), false, 'selected-pattern Explain button should not render');
assert.equal(html.includes('data-roi-help="behaviorPreset"'), false, 'Process Pattern card should not render behaviorPreset help button');
assert.equal(html.includes('stable likelihood basins |'), false, 'left card should not render long pipe-delimited pattern summary');
assert.equal(html.includes('Heavy-Tailed changes sample-value magnitude'), false, 'left card should not show stale component explanation');

const customHtml = samplingProcessConsoleHtml({
  ...baseState,
  processMode: 'customComposer',
  patternSource: 'custom',
  processModeLabel: 'Custom Composer',
  referenceSignatureId: 'none',
  referenceSignature: null
});
assert.equal(customHtml.includes('id="roi-demo-reference-signature"'), false, 'Custom Composer should not show Process Pattern selector');
assert.equal(customHtml.includes('id="roi-demo-pattern-source"'), false, 'Custom Composer should not show Pattern Source dropdown');
assert.equal(customHtml.includes('Edit global process components.'), true, 'Custom Composer should keep compact primary context');

const rightPanelHtml = roiRecipeSignatureHtml({
  ...baseState,
  componentRecipe: baseState,
  recipeSummary: 'Multi-Modal Likelihood + Clustered Field + Bursty',
  selectedCell: null
});
assert.equal(rightPanelHtml.includes('Process Pattern View'), true, 'right panel should expose Process Pattern View');
assert.equal(rightPanelHtml.includes('Current Lab State'), true, 'right panel should include Current Lab State');
assert.equal(rightPanelHtml.includes('Recurrent Stationary Hotspots'), true, 'right panel should include selected pattern');
assert.equal(rightPanelHtml.includes('What am I seeing?'), true, 'right panel should explain the selected pattern automatically');

const patch = buildReferenceSignaturePatch({ rightPanelMode: 'diagnostics' }, 'frontPropagation');
assert.equal(patch.processMode, 'referenceSignature', 'Process Pattern selection should keep referenceSignature internals');
assert.equal(patch.patternSource, 'referenceSignature', 'Process Pattern selection should preserve patternSource');
assert.equal(patch.rightPanelMode, 'recipeSignature', 'Process Pattern selection should target the right-panel Recipe view');
assert.equal(patch.referenceSignatureId, 'frontPropagation', 'Process Pattern selection should set selected pattern id');
assert.equal(patch.selectedHelpTopic, null, 'Process Pattern selection should not force the Help tab');

console.log('smoke_sampling_process_process_pattern_controls: ok');
