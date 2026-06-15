import assert from 'node:assert/strict';

import {
  SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE,
  SAMPLING_PROCESS_MODES,
  SAMPLING_PROCESS_VISIBLE_MODES,
  normalizeSamplingProcessMode,
  normalizeVisibleSamplingProcessMode,
  samplingProcessWorkflowModes
} from '../../src/core/demo/sampling/SamplingProcessTerminology.js';
import {
  buildDiagnosticsEntryPatch,
  buildReferenceSignaturePatch,
  buildSamplingProcessModePatch
} from '../../src/core/demo/sampling/SamplingProcessModeController.js';
import { samplingProcessConsoleHtml } from '../../src/ui/sampling/SamplingProcessConsoleSections.js';
import { roiDiagnosticsHtml, roiRecipeSignatureHtml } from '../../src/ui/sampling/SamplingProcessRightPanel.js';
import { referenceSignatureMetadata, referenceSignatureRecipe } from '../../src/core/demo/roi/RoiReferenceSignatures.js';

const visibleModes = [
  'referenceSignature',
  'customComposer',
  'processPaint',
  'randomRuleLab'
];

const baseState = {
  title: 'Deterministic Spatiotemporal Process Lab',
  processMode: 'referenceSignature',
  patternSource: 'referenceSignature',
  processStatusLabel: 'Example-Validated',
  referenceSignatureId: 'stationaryTemporalBursts',
  referenceSignatureLabel: 'Recurrent Stationary Hotspots',
  referenceSignature: referenceSignatureMetadata('stationaryTemporalBursts'),
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
  displayMode: SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE,
  dynamicComplexity: 'medium',
  clusterSize: 'medium',
  timeMode: 'dynamic',
  paused: false,
  seed: 'mode-visibility-smoke',
  activityDiagnostics: {
    graphDiagnostics: {
      updateRule: 'neighborPropagation',
      edgeMessageTotal: 3,
      stateCounts: { active: 2, inactive: 4 }
    }
  },
  stats: { min: 0, max: 1, mean: 0.3, totalValue: 6 },
  viewFilters: {},
  exportMode: 'currentFrame',
  exportFrameCount: 1,
  randomRuleSeed: 'random-smoke',
  randomRuleMode: 'exploratoryMixedRules',
  randomRuleGroupCount: 4,
  randomRuleActiveFraction: 0.18
};

assert.deepEqual(SAMPLING_PROCESS_VISIBLE_MODES, visibleModes, 'visible workflow modes should be the four authoring/generation modes');
assert.deepEqual(samplingProcessWorkflowModes(), visibleModes, 'workflow mode helper should return the visible mode list');
assert.equal(SAMPLING_PROCESS_MODES.includes('diagnosticsGraphInspection'), true, 'diagnostics should remain internally accepted');
assert.equal(SAMPLING_PROCESS_VISIBLE_MODES.includes('diagnosticsGraphInspection'), false, 'diagnostics should not be a visible workflow mode');
assert.equal(normalizeSamplingProcessMode('diagnostics'), 'diagnosticsGraphInspection', 'legacy diagnostics alias should normalize internally');
assert.equal(normalizeVisibleSamplingProcessMode('diagnostics'), 'referenceSignature', 'visible mode normalizer should migrate diagnostics to a workflow fallback');

const html = samplingProcessConsoleHtml(baseState);
const optionValues = [...html.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);
const modeOptionValues = optionValues.slice(optionValues.indexOf('referenceSignature'), optionValues.indexOf('referenceSignature') + visibleModes.length);
assert.deepEqual(modeOptionValues, visibleModes, 'mode dropdown should render only visible workflow modes');
assert.equal(html.includes('<option value="referenceSignature" selected>Example Processes</option>'), true, 'mode dropdown should label referenceSignature as Example Processes');
assert.equal(html.includes('value="diagnosticsGraphInspection"'), false, 'mode dropdown should not render diagnosticsGraphInspection');
assert.equal(html.includes('Diagnostics Overlay'), true, 'Display / Diagnostic Layer should still expose Diagnostics Overlay');

const rightPanelHtml = roiRecipeSignatureHtml({
  ...baseState,
  componentRecipe: baseState,
  recipeSummary: 'smoke recipe',
  selectedCell: null
});
assert.equal(rightPanelHtml.includes('data-roi-panel-mode="diagnostics"'), true, 'right panel should keep Diagnostics tab');

const diagnosticsViewHtml = roiDiagnosticsHtml({
  ...baseState,
  processMode: 'referenceSignature',
  displayMode: 'diagnosticsOverlay',
  graphDiagnostics: baseState.activityDiagnostics.graphDiagnostics
});
assert.equal(diagnosticsViewHtml.includes('data-roi-diagnostics-view'), true, 'diagnostics should render as a right-panel view');

const diagnosticsPatch = buildDiagnosticsEntryPatch({ processMode: 'customComposer' });
assert.deepEqual(
  {
    processMode: diagnosticsPatch.processMode,
    rightPanelMode: diagnosticsPatch.rightPanelMode,
    displayMode: diagnosticsPatch.displayMode
  },
  {
    processMode: 'customComposer',
    rightPanelMode: 'diagnostics',
    displayMode: 'diagnosticsOverlay'
  },
  'legacy diagnostics route should become a diagnostics view over the active workflow'
);
assert.equal(buildSamplingProcessModePatch({ processMode: 'randomRuleLab' }, 'diagnostics').processMode, 'randomRuleLab', 'visible workflow should survive diagnostics alias request');

const recipe = referenceSignatureRecipe('frontPropagation');
const referencePatch = buildReferenceSignaturePatch({}, 'frontPropagation');
assert.notEqual(recipe.displayMode, undefined, 'reference recipe should keep display recommendation metadata');
assert.equal({ ...recipe, ...referencePatch }.displayMode, SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE, 'Example Process selection should reset to shared default display');
assert.equal(buildSamplingProcessModePatch({}, 'randomRuleLab').displayMode, SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE, 'Rule Allocation Sandbox should use shared default display');
assert.equal(buildSamplingProcessModePatch({}, 'processPaint').displayMode, 'nodeStates', 'Process Paint should keep nodeStates default');

console.log('smoke_sampling_process_mode_visibility: ok');
