import assert from 'node:assert/strict';

import { samplingProcessConsoleHtml } from '../../src/ui/sampling/SamplingProcessConsoleSections.js';
import { roiRecipeSignatureHtml } from '../../src/ui/sampling/SamplingProcessRightPanel.js';
import { buildReferenceSignaturePatch } from '../../src/core/demo/sampling/SamplingProcessModeController.js';
import { samplingProcessModeLabel } from '../../src/core/demo/sampling/SamplingProcessTerminology.js';
import { referenceSignatureMetadata } from '../../src/core/demo/roi/RoiReferenceSignatures.js';
import { processExampleMetadata } from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';

const referenceSignature = referenceSignatureMetadata('birthDeathEmergence');
const baseState = {
  title: 'Deterministic Spatiotemporal Process Lab',
  processMode: 'foundationalCaModels',
  patternSource: 'referenceSignature',
  processModeLabel: samplingProcessModeLabel('foundationalCaModels'),
  processStatusLabel: 'Example-Validated',
  exampleTrack: 'foundationalCaModels',
  exampleTrackLabel: 'Foundational CA Models',
  exampleProcessId: 'conwayGameOfLife',
  foundationalCaModelId: 'conwayGameOfLife',
  oceanProcessAnalogId: null,
  exampleProcessLabel: "Conway's Game of Life",
  exampleType: 'foundationalCaModel',
  spatiotemporalProcessExample: processExampleMetadata('conwayGameOfLife', false, 'foundationalCaModels'),
  referenceSignatureId: 'birthDeathEmergence',
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
assert.equal(samplingProcessModeLabel('referenceSignature'), 'Foundational CA Models', 'legacy referenceSignature alias should label as Foundational CA Models');
assert.equal(html.includes('id="sampling-process-mode"'), true, 'Mode selector should render');
assert.equal(html.includes('<option value="foundationalCaModels" selected>Foundational CA Models</option>'), true, 'Mode selector should show Foundational CA Models');
assert.equal(html.includes('<option value="oceanProcessAnalogs"'), true, 'Mode selector should show Ocean-Relevant Process Analogs');
assert.equal(html.includes('value="referenceSignature"'), false, 'Mode selector should not show legacy referenceSignature');
assert.equal(html.includes('id="sampling-process-example-id"'), true, 'track-specific process example selector should render');
assert.equal(html.includes('id="roi-demo-reference-signature"'), true, 'hidden legacy reference selector should render for export compatibility');
assert.equal(html.includes('Foundational CA Model'), true, 'Foundational CA Model label should render');
assert.equal(html.includes('Foundational CA Models'), true, 'Foundational CA Models context should render');
assert.equal(html.includes('Example Track'), false, 'old Example Track selector should not render');
assert.equal(html.includes('id="roi-demo-pattern-source"'), false, 'Pattern Source dropdown should not render visibly');
assert.equal(html.includes('Explain Local Birth-Death Emergence'), false, 'selected-pattern Explain button should not render');
assert.equal(html.includes('data-roi-help="behaviorPreset"'), false, 'example card should not render behaviorPreset help button');
assert.equal(html.includes('stable likelihood basins |'), false, 'left card should not render long pipe-delimited pattern summary');
assert.equal(html.includes('Heavy-Tailed changes sample-value magnitude'), false, 'left card should not show stale component explanation');

const customHtml = samplingProcessConsoleHtml({
  ...baseState,
  processMode: 'customComposer',
  patternSource: 'custom',
  processModeLabel: 'Custom Composer',
  referenceSignatureId: 'none',
  referenceSignature: null,
  exampleTrack: null,
  exampleProcessId: null,
  foundationalCaModelId: null,
  oceanProcessAnalogId: null
});
assert.equal(customHtml.includes('id="sampling-process-example-id"'), false, 'Custom Composer should not show process example selector');
assert.equal(customHtml.includes('id="roi-demo-reference-signature"'), false, 'Custom Composer should not show hidden legacy selector');
assert.equal(customHtml.includes('id="roi-demo-pattern-source"'), false, 'Custom Composer should not show Pattern Source dropdown');
assert.equal(customHtml.includes('Edit global process components.'), true, 'Custom Composer should keep compact primary context');

const rightPanelHtml = roiRecipeSignatureHtml({
  ...baseState,
  componentRecipe: baseState,
  recipeSummary: 'Multi-Modal Likelihood + Clustered Field + Bursty',
  selectedCell: null
});
assert.equal(rightPanelHtml.includes('Process Example View'), true, 'right panel should expose Process Example View');
assert.equal(rightPanelHtml.includes('Current Lab State'), true, 'right panel should include Current Lab State');
assert.equal(rightPanelHtml.includes("Conway's Game of Life") || rightPanelHtml.includes('Conway&#039;s Game of Life'), true, 'right panel should include selected model');
assert.equal(rightPanelHtml.includes('Rule -&gt; Update Function') || rightPanelHtml.includes('Rule -> Update Function'), true, 'right panel should explain the update function automatically');

const foundationalPatch = buildReferenceSignaturePatch({ ...baseState, rightPanelMode: 'diagnostics' }, 'forestFire');
assert.equal(foundationalPatch.processMode, 'foundationalCaModels', 'Foundational CA selection should keep foundational mode');
assert.equal(foundationalPatch.patternSource, 'referenceSignature', 'Foundational CA selection should preserve patternSource');
assert.equal(foundationalPatch.rightPanelMode, 'recipeSignature', 'Foundational CA selection should target the right-panel Recipe view');
assert.equal(foundationalPatch.exampleProcessId, 'forestFire', 'Foundational CA selection should store the example id');
assert.equal(foundationalPatch.referenceSignatureId, 'frontPropagation', 'Foundational CA selection should set mapped legacy referenceSignature id');
assert.equal(foundationalPatch.selectedHelpTopic, null, 'Foundational CA selection should not force the Help tab');

const oceanPatch = buildReferenceSignaturePatch({
  ...baseState,
  processMode: 'oceanProcessAnalogs',
  exampleTrack: 'oceanRelevantProcessAnalogs',
  exampleProcessId: 'riverPlumeFront',
  oceanProcessAnalogId: 'riverPlumeFront',
  foundationalCaModelId: null
}, 'oilChemicalPlume');
assert.equal(oceanPatch.processMode, 'oceanProcessAnalogs', 'Ocean analog selection should keep ocean mode');
assert.equal(oceanPatch.exampleTrack, 'oceanRelevantProcessAnalogs', 'Ocean analog selection should keep ocean track');
assert.equal(oceanPatch.exampleProcessId, 'oilChemicalPlume', 'Ocean analog selection should store the analog id');
assert.equal(oceanPatch.referenceSignatureId, 'diffusionSpread', 'Ocean analog selection should set mapped legacy referenceSignature id');

console.log('smoke_sampling_process_process_pattern_controls: ok');
