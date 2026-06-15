import assert from 'node:assert/strict';

import { samplingProcessConsoleHtml } from '../../src/ui/sampling/SamplingProcessConsoleSections.js';
import {
  roiDiagnosticsHtml,
  roiRecipeSignatureHtml
} from '../../src/ui/sampling/SamplingProcessRightPanel.js';
import { referenceSignatureMetadata } from '../../src/core/demo/roi/RoiReferenceSignatures.js';

const baseState = {
  title: 'Deterministic Spatiotemporal Process Lab',
  processMode: 'foundationalCaModels',
  patternSource: 'referenceSignature',
  processModeLabel: 'Foundational CA Models',
  processStatusLabel: 'Example-Validated',
  exampleTrack: 'foundationalCaModels',
  exampleTrackLabel: 'Foundational CA Models',
  exampleProcessId: 'conwayGameOfLife',
  foundationalCaModelId: 'conwayGameOfLife',
  oceanProcessAnalogId: null,
  exampleProcessLabel: "Conway's Game of Life",
  exampleType: 'foundationalCaModel',
  referenceSignatureId: 'birthDeathEmergence',
  referenceSignature: referenceSignatureMetadata('birthDeathEmergence'),
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
  timeSpeedScale: 1,
  paused: false,
  seed: 'left-control-plane-smoke',
  noise: 0.15,
  activityDiagnostics: {
    meanValue: 0.34,
    activeFraction: 0.2,
    highValueFraction: 0.08,
    maxValue: 0.92,
    totalActivityMass: 8,
    connectedComponentCount: 3,
    activeHotspotCount: 2,
    likelihoodSampleCorrelation: 0.71,
    likelihood: {
      activeLikelihoodCellFraction: 0.2,
      highLikelihoodCellFraction: 0.08,
      modeCount: 3
    },
    ruleEngineDiagnostics: {
      transitionCount: 5
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
  randomRuleSeed: 'random-smoke',
  randomRuleMode: 'exploratoryMixedRules',
  randomRuleGroupCount: 4,
  randomRuleActiveFraction: 0.18
};

function stateForMode(processMode) {
  const exampleMode = ['foundationalCaModels', 'oceanProcessAnalogs'].includes(processMode);
  return {
    ...baseState,
    processMode,
    patternSource: exampleMode ? 'referenceSignature' : 'custom',
    processModeLabel: {
      foundationalCaModels: 'Foundational CA Models',
      oceanProcessAnalogs: 'Ocean-Relevant Process Analogs',
      customComposer: 'Custom Composer',
      processPaint: 'Process Paint',
      randomRuleLab: 'Rule Allocation Sandbox',
      diagnosticsGraphInspection: 'Diagnostics / Graph Inspection'
    }[processMode] ?? 'Foundational CA Models'
  };
}

function assertNoNumericHeadings(html, label) {
  assert.equal(/<h2[^>]*>\s*\d+\./.test(html), false, `${label} should not render numeric heading prefixes`);
}

const modes = ['foundationalCaModels', 'oceanProcessAnalogs', 'customComposer', 'processPaint', 'randomRuleLab', 'diagnosticsGraphInspection'];
for (const mode of modes) {
  assertNoNumericHeadings(samplingProcessConsoleHtml(stateForMode(mode)), mode);
}

const foundationalHtml = samplingProcessConsoleHtml(stateForMode('foundationalCaModels'));
assert.equal(foundationalHtml.includes('Display / Diagnostic Layer'), true, 'display section should render without a numeric prefix');
assert.equal(foundationalHtml.includes('value="referenceSignature"'), false, 'visible mode selector should not expose legacy referenceSignature');
assert.equal(foundationalHtml.includes('value="diagnosticsGraphInspection"'), false, 'visible mode selector should not expose Diagnostics / Graph Inspection');
assert.equal(foundationalHtml.includes('id="roi-demo-pattern-source"'), false, 'left panel should not show Pattern Source dropdown');
assert.equal(foundationalHtml.includes('data-roi-help="behaviorPreset"'), false, 'left panel should not show selected-pattern Explain button');
assert.equal(foundationalHtml.includes('Diagnostics Overlay'), true, 'display selector should keep Diagnostics Overlay');
assert.equal(foundationalHtml.includes('Foundational CA Model'), true, 'foundational selector should render');
assert.equal(foundationalHtml.includes('Example Track'), false, 'old Example Track selector should not render');
assert.equal(foundationalHtml.includes('10. Display / Diagnostic Layer'), false, 'display section should not render old numeric prefix');
assert.equal(foundationalHtml.includes('Seed / Scenario Identity'), true, 'seed section should render without a numeric prefix');
assert.equal(foundationalHtml.includes('11. Seed / Scenario Identity'), false, 'seed section should not render old numeric prefix');
assert.equal(foundationalHtml.includes('<h2>Export</h2>'), true, 'export section should render without a numeric prefix');
assert.equal(foundationalHtml.includes('12. Export'), false, 'export section should not render old numeric prefix');
assert.equal(foundationalHtml.includes('Field Stats'), false, 'foundational left panel should not render standalone Field Stats');
assert.equal(foundationalHtml.includes('id="sampling-process-mode"'), true, 'sampling process mode selector should be preserved');
assert.equal(foundationalHtml.includes('id="sampling-process-example-id"'), true, 'track-specific example selector should be preserved');
assert.equal(foundationalHtml.includes('id="roi-demo-reference-signature"'), true, 'hidden legacy selector should be preserved');
assert.equal(foundationalHtml.includes('id="roi-demo-display-mode"'), true, 'display mode selector should be preserved');
assert.equal(foundationalHtml.includes('id="roi-demo-seed"'), true, 'seed input should be preserved');
assert.equal(foundationalHtml.includes('data-action="export-demo-json"'), true, 'export action should be preserved');

const paintHtml = samplingProcessConsoleHtml(stateForMode('processPaint'));
assert.equal(paintHtml.includes('data-action="sampling-paint-run"'), true, 'paint run action should be preserved');
assert.equal(paintHtml.includes('data-action="sampling-paint-export"'), true, 'paint export action should be preserved');
assert.equal(paintHtml.includes('Field Stats'), false, 'process paint left panel should not render standalone Field Stats');

const recipeHtml = roiRecipeSignatureHtml({
  ...stateForMode('foundationalCaModels'),
  componentRecipe: baseState,
  recipeSummary: 'Multi-Modal Likelihood + Clustered Field + Bursty',
  selectedCell: null
});
assert.equal(recipeHtml.includes('Current Lab State'), true, 'right panel should render Current Lab State');
for (const label of ['Mean', 'Active %', 'High %', 'Max', 'Messages', 'Transitions']) {
  assert.equal(recipeHtml.includes(label), true, `Current Lab State should include ${label}`);
}
assert.equal(recipeHtml.includes('Process Example View'), true, 'right panel should render Process Example View');
assert.equal(recipeHtml.includes('Foundational CA Model'), true, 'right panel should identify the selected context type');
assert.equal(recipeHtml.includes('data-roi-panel-mode="recipeSignature"'), true, 'right panel mode selectors should be preserved');

const diagnosticsHtml = roiDiagnosticsHtml(stateForMode('diagnosticsGraphInspection'));
assert.equal(diagnosticsHtml.includes('Field / Process Stats'), true, 'right diagnostics should include Field / Process Stats');
assert.equal(diagnosticsHtml.includes('Current Lab State'), true, 'right diagnostics should retain Current Lab State');

console.log('smoke_sampling_process_left_control_plane: ok');
