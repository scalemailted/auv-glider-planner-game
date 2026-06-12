import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { samplingProcessConsoleHtml } from '../../src/ui/sampling/SamplingProcessConsoleSections.js';
import {
  processPaintInspectorEmptyHtml,
  processPaintToolsHtml,
  roiBehaviorHelpEmptyHtml,
  roiDiagnosticsHtml,
  roiInspectorEmptyHtml,
  roiRecipeSignatureHtml
} from '../../src/ui/sampling/SamplingProcessRightPanel.js';
import { referenceSignatureMetadata } from '../../src/core/demo/roi/RoiReferenceSignatures.js';
import { processRuleById } from '../../src/core/demo/sampling/SamplingProcessRules.js';

const baseState = {
  title: 'Spatiotemporal Sampling Process Lab',
  processMode: 'referenceSignature',
  processModeLabel: 'Example Processes',
  processStatusLabel: 'Pattern-Validated',
  patternSource: 'referenceSignature',
  referenceSignatureId: 'stationaryTemporalBursts',
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
  displayMode: 'sampleValueLikelihoodOverlay',
  dynamicComplexity: 'medium',
  clusterCount: 3,
  clusterSize: 'medium',
  timeMode: 'dynamic',
  paused: false,
  seed: 'panel-disclosure-smoke',
  activityDiagnostics: {
    meanValue: 0.34,
    activeFraction: 0.2,
    highValueFraction: 0.08,
    maxValue: 0.92,
    totalActivityMass: 8,
    likelihoodSampleCorrelation: 0.71,
    likelihood: {
      activeLikelihoodCellFraction: 0.2,
      highLikelihoodCellFraction: 0.08,
      modeCount: 3
    },
    graphDiagnostics: {
      updateRule: 'neighborPropagation',
      edgeMessageTotal: 8,
      transitionCount: 5,
      activeNodeCount: 7,
      activeClusterCount: 2,
      stateCounts: { active: 3, inactive: 9 }
    }
  },
  graphDiagnostics: {
    updateRule: 'neighborPropagation',
    edgeMessageTotal: 8,
    transitionCount: 5,
    activeNodeCount: 7,
    activeClusterCount: 2,
    stateCounts: { active: 3, inactive: 9 }
  },
  stats: { min: 0, max: 0.92, mean: 0.34, totalValue: 8 },
  viewFilters: {},
  exportMode: 'currentFrame',
  exportFrameCount: 1,
  paintValidation: { paintedCellCount: 2, groupCount: 1, status: 'PASS' },
  selectedPaintState: 'active',
  selectedPaintRuleId: 'propagatingFront',
  selectedPaintGroupId: 1,
  selectedPaintSourceValue: 1,
  validPaintStates: processRuleById('propagatingFront').allowedStates,
  processStates: processRuleById('propagatingFront').allowedStates,
  basicProcessRules: [processRuleById('inert'), processRuleById('propagatingFront')],
  advancedProcessRules: [],
  randomRuleSeed: 'random-smoke',
  randomRuleGroupCount: 4,
  randomRuleActiveFraction: 0.18,
  componentRecipe: {
    eventLikelihood: 'multiModalLikelihood',
    spatialPattern: 'clusteredField',
    valueDistribution: 'gaussianNormal',
    temporalPattern: 'bursty',
    spatialEvolution: 'stationary',
    interactionScale: 'cluster',
    stateModel: 'stateEvolving',
    depletionMode: 'soft',
    displayMode: 'sampleValueLikelihoodOverlay'
  },
  recipeSummary: 'Multi-Modal Likelihood + Clustered Field + Bursty'
};

function indexOfRequired(html, needle, label = needle) {
  const index = html.indexOf(needle);
  assert.notEqual(index, -1, `${label} missing`);
  return index;
}

function assertBefore(html, before, after, message) {
  assert.ok(indexOfRequired(html, before) < indexOfRequired(html, after), message);
}

function assertNoOpenDetails(html, label) {
  assert.equal(/<details\b[^>]*\bopen\b/i.test(html), false, `${label} should not render open details by default`);
}

const missionConsoleSource = await readFile(new URL('../../src/ui/MissionConsole.js', import.meta.url), 'utf8');
const accordionSource = await readFile(new URL('../../src/ui/AccordionState.js', import.meta.url), 'utf8');
assert.equal(missionConsoleSource.includes("applyConsoleAccordions?.('roiDemo', null, { defaultCollapsed: true })"), true, 'Sampling Process Lab should request collapsed accordions by default');
assert.equal(accordionSource.includes('!options.defaultCollapsed'), true, 'accordion helper should support defaultCollapsed');

const consoleHtml = samplingProcessConsoleHtml(baseState);
assert.equal(consoleHtml.includes('id="sampling-process-mode"'), true, 'mode selector should be preserved');
assert.equal(consoleHtml.includes('id="roi-demo-reference-signature"'), true, 'process pattern selector should be preserved');
assert.equal(consoleHtml.includes('id="roi-demo-display-mode"'), true, 'display selector should be preserved');
assert.equal(consoleHtml.includes('id="roi-demo-seed"'), true, 'seed input should be preserved');
assert.equal(consoleHtml.includes('data-action="export-demo-json"'), true, 'export action should be preserved');
assertNoOpenDetails(consoleHtml, 'left console');

const recipeHtml = roiRecipeSignatureHtml(baseState);
assertBefore(recipeHtml, 'sampling-panel-tabs', 'Process Pattern View', 'recipe tabs should be topmost');
assertBefore(recipeHtml, 'sampling-panel-tabs', 'Current Lab State', 'recipe tabs should appear before current state');
assert.equal(recipeHtml.includes('data-roi-reference-signature-help'), true, 'recipe view should contain recipe content');
assert.equal(recipeHtml.includes('data-roi-diagnostics-view'), false, 'recipe view should not contain diagnostics body');
assert.equal(recipeHtml.includes('data-process-paint-cell-editor'), false, 'recipe view should not contain paint cell editor');
assertNoOpenDetails(recipeHtml, 'recipe view');

const diagnosticsHtml = roiDiagnosticsHtml({ ...baseState, processMode: 'diagnosticsGraphInspection', processModeLabel: 'Diagnostics / Graph Inspection' });
assertBefore(diagnosticsHtml, 'sampling-panel-tabs', 'Validation / Diagnostics', 'diagnostics tabs should be topmost');
assert.equal(diagnosticsHtml.includes('Field / Process Stats'), true, 'diagnostics view should contain field/process stats');
assert.equal(diagnosticsHtml.includes('data-roi-reference-signature-help'), false, 'diagnostics view should not contain recipe help body');
assert.equal(diagnosticsHtml.includes('data-roi-cell-inspector'), false, 'diagnostics view should not contain inspector body');
assertNoOpenDetails(diagnosticsHtml, 'diagnostics view');

const helpHtml = roiBehaviorHelpEmptyHtml(baseState);
assertBefore(helpHtml, 'sampling-panel-tabs', 'Behavior Help', 'help tabs should be topmost');
assert.equal(helpHtml.includes('Available help'), true, 'help view should contain help content');
assert.equal(helpHtml.includes('data-roi-reference-signature-help'), false, 'help view should not contain recipe body');
assert.equal(helpHtml.includes('Field / Process Stats'), false, 'help view should not contain diagnostics body');

const emptyInspectorHtml = roiInspectorEmptyHtml(baseState);
assertBefore(emptyInspectorHtml, 'sampling-panel-tabs', 'Cell Inspector', 'empty inspector tabs should be topmost');
assert.equal(emptyInspectorHtml.includes('Select a cell on the canvas to inspect its value, state, rule, messages, and ROI role.'), true, 'empty inspector guidance should render');
assert.equal(emptyInspectorHtml.includes('data-roi-recipe-signature-view'), false, 'empty inspector should not contain recipe body');
assert.equal(emptyInspectorHtml.includes('Field / Process Stats'), false, 'empty inspector should not contain diagnostics body');

const paintToolsHtml = processPaintToolsHtml({ ...baseState, processMode: 'processPaint', processModeLabel: 'Process Paint' });
assertBefore(paintToolsHtml, 'sampling-panel-tabs', 'Paint Tools', 'paint tabs should be topmost');
assert.equal(paintToolsHtml.includes('data-process-paint-tools'), true, 'paint tools body should render');
assert.equal(paintToolsHtml.includes('data-process-paint-cell-editor'), false, 'paint tools should not contain cell editor body');

const paintEmptyHtml = processPaintInspectorEmptyHtml({ ...baseState, processMode: 'processPaint', processModeLabel: 'Process Paint' });
assertBefore(paintEmptyHtml, 'sampling-panel-tabs', 'Process Paint Cell', 'paint empty inspector tabs should be topmost');
assert.equal(paintEmptyHtml.includes('Select or paint a cell to edit its state, rule, group, and source value.'), true, 'paint empty inspector guidance should render');

console.log('smoke_sampling_process_panel_disclosure: ok');
