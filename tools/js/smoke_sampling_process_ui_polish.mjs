import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { samplingProcessConsoleHtml } from '../../src/ui/sampling/SamplingProcessConsoleSections.js';
import {
  processPaintCellEditorHtml,
  processPaintToolsHtml,
  roiDiagnosticsHtml,
  roiRecipeSignatureHtml
} from '../../src/ui/sampling/SamplingProcessRightPanel.js';
import { referenceSignatureMetadata } from '../../src/core/demo/roi/RoiReferenceSignatures.js';
import { processRuleById } from '../../src/core/demo/sampling/SamplingProcessRules.js';
import { processExampleMetadata } from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';

const consolePath = new URL('../../src/ui/sampling/SamplingProcessConsoleSections.js', import.meta.url);
const cssPath = new URL('../../css/panels.css', import.meta.url);

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
  spatiotemporalProcessExample: processExampleMetadata('conwayGameOfLife', false, 'foundationalCaModels'),
  referenceSignatureId: 'birthDeathEmergence',
  referenceSignatureLabel: 'Local Birth-Death Emergence',
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
  paused: false,
  seed: 'ui-polish-smoke',
  activityDiagnostics: {
    meanValue: 0.34,
    activeFraction: 0.2,
    highValueFraction: 0.08,
    maxValue: 0.92,
    likelihood: {
      activeLikelihoodCellFraction: 0.2,
      highLikelihoodCellFraction: 0.08,
      modeCount: 3
    },
    graphDiagnostics: {
      updateRule: 'neighborPropagation',
      edgeMessageTotal: 8,
      stateCounts: { active: 3, inactive: 9 }
    }
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

const foundationalHtml = samplingProcessConsoleHtml(stateForMode('foundationalCaModels'));
assert.equal(foundationalHtml.includes('sampling-chip'), false, 'foundational console should not render summary chips after moving summary right');
assert.equal(foundationalHtml.includes('Full recipe details'), false, 'foundational console should not render recipe details after moving summary right');
assert.equal(foundationalHtml.includes('Compose source fields, cell states, spatial structure'), false, 'left header should not show long composer prose');
assert.equal(foundationalHtml.includes('Reference Signature is guided. Custom Composer is global component editing'), false, 'mode section should not show verbose mode paragraph');
assert.equal(foundationalHtml.includes('Foundational CA Models'), true, 'mode selector should show Foundational CA Models');
assert.equal(foundationalHtml.includes('Ocean-Relevant Process Analogs'), true, 'mode selector should show Ocean-Relevant Process Analogs');
assert.equal(foundationalHtml.includes('value="referenceSignature"'), false, 'mode selector should not show legacy referenceSignature');
assert.equal(foundationalHtml.includes('value="diagnosticsGraphInspection"'), false, 'mode selector should not show Diagnostics / Graph Inspection');
assert.equal(foundationalHtml.includes('id="roi-demo-pattern-source"'), false, 'left panel should not show Pattern Source dropdown');
assert.equal(foundationalHtml.includes('data-roi-help="behaviorPreset"'), false, 'left panel should not show selected-pattern Explain button');
assert.equal(foundationalHtml.includes('Diagnostics Overlay'), true, 'display selector should still show Diagnostics Overlay');
assert.equal(foundationalHtml.includes('Foundational CA Model'), true, 'guided selector should say Foundational CA Model');
assert.equal(foundationalHtml.includes('Example Track'), false, 'old Example Track selector should stay hidden');
assert.equal(foundationalHtml.includes('Current Summary'), false, 'left panel should not show Current Summary card');
assert.equal(foundationalHtml.includes('data-sampling-section="sourceField"'), false, 'foundational mode should not include full composer stack');
assert.equal(foundationalHtml.includes('id="roi-demo-reference-signature"'), true, 'hidden legacy reference selector should be preserved');
assert.equal(foundationalHtml.includes('BBox '), false, 'long field stats should not be visible outside diagnostics');
assert.equal(foundationalHtml.includes('Source/S corr'), false, 'dense diagnostic prose should not be visible outside diagnostics');

const customHtml = samplingProcessConsoleHtml(stateForMode('customComposer'));
assert.equal(customHtml.includes('id="roi-demo-event-likelihood"'), true, 'custom composer should keep source selector');
assert.equal(customHtml.includes('id="roi-demo-value-distribution"'), true, 'custom composer should keep value selector');
assert.equal(customHtml.includes('Learn / Compare Components'), true, 'component isolation should be collapsed in custom composer');
assert.equal(customHtml.includes('data-keep-title="true"'), true, 'component isolation should survive accordion cleanup as a compact section');
assert.equal(/<details[^>]*class="sampling-compact-details"[^>]*>\s*<summary>Compare presets/.test(customHtml), true, 'component isolation controls should be under details');

const paintHtml = samplingProcessConsoleHtml(stateForMode('processPaint'));
assert.equal(paintHtml.includes('data-sampling-section="processPaintTools"'), true, 'process paint left HUD should show paint tools');
assert.equal(paintHtml.includes('id="sampling-paint-state"'), true, 'paint state selector should be preserved');
assert.equal(paintHtml.includes('id="sampling-paint-rule"'), true, 'paint rule selector should be preserved');
assert.equal(paintHtml.includes('data-action="sampling-paint-run"'), true, 'paint run action should be preserved');
assert.equal(paintHtml.includes('Paint states, rules, groups, and source values onto the grid.'), true, 'paint copy should be compact');

const diagnosticsHtml = samplingProcessConsoleHtml(stateForMode('diagnosticsGraphInspection'));
assert.equal(diagnosticsHtml.includes('id="roi-filter-message-threshold"'), true, 'diagnostics should keep message threshold filter');
assert.equal(diagnosticsHtml.includes('Field Stats'), false, 'left diagnostics should not expose standalone field stats');
assert.equal(diagnosticsHtml.includes('data-sampling-section="sourceField"'), false, 'diagnostics should not show composer controls');

const recipeHtml = roiRecipeSignatureHtml({
  ...stateForMode('foundationalCaModels'),
  componentRecipe: baseState,
  recipeSummary: 'Multi-Modal Likelihood + Clustered Field + Bursty',
  selectedCell: null
});
assert.equal(recipeHtml.includes('Current Lab State'), true, 'right panel should start with current lab state');
assert.equal(recipeHtml.includes('Process Example View'), true, 'right panel should use process example terminology');
assert.equal(recipeHtml.includes('Foundational CA Model'), true, 'recipe view should include process example summary');
assert.equal(recipeHtml.includes('Rule -> Update Function'), true, 'recipe view should include update-function teaching card');
assert.equal(recipeHtml.includes('Sampling Interpretation'), true, 'recipe view should include sampling interpretation card');
assert.equal(recipeHtml.includes('Advanced Details'), true, 'recipe view should collapse advanced details');
assert.equal(recipeHtml.includes('data-roi-panel-mode="recipeSignature"'), true, 'right-panel mode selector should be preserved');
assert.equal(recipeHtml.includes('Show Recipe / Signature'), false, 'right-panel tabs should use compact labels');
assert.equal(recipeHtml.includes('Reference Signature'), false, 'right-panel visible recipe view should not use old primary label');

const rightDiagnosticsHtml = roiDiagnosticsHtml({
  ...stateForMode('diagnosticsGraphInspection'),
  graphDiagnostics: baseState.activityDiagnostics.graphDiagnostics,
  stats: baseState.stats
});
assert.equal(rightDiagnosticsHtml.includes('Field / Process Stats'), true, 'right diagnostics should expose detailed field/process stats');

const paintToolsHtml = processPaintToolsHtml(stateForMode('processPaint'));
assert.equal(paintToolsHtml.includes('Current Brush'), true, 'paint tools should show compact current brush');
assert.equal(paintToolsHtml.includes('data-action="paint-panel-run"'), true, 'right paint run action should be preserved');
assert.equal(paintToolsHtml.includes('Paint states, rules, groups, and source values directly onto the grid.'), true, 'right paint tools should be compact');

const cellEditorHtml = processPaintCellEditorHtml({
  cell: { row: 1, col: 2 },
  paintAssignment: { state: 'active', ruleId: 'propagatingFront', groupId: 1, sourceValue: 1 },
  processRuleLabel: 'Propagating Front',
  processRuleId: 'propagatingFront',
  processGroupId: 1,
  roiRole: 'currentROI',
  sourceValue: 1,
  value: 0.8
}, stateForMode('processPaint'));
assert.equal(cellEditorHtml.includes('Edit state, rule, group, and source value.'), true, 'cell editor should be compact');
assert.equal(cellEditorHtml.includes('data-action="paint-panel-apply"'), true, 'cell editor apply action should be preserved');

const consoleSource = await readFile(consolePath, 'utf8');
assert.equal(consoleSource.includes('sampling-chip'), true, 'console renderer should include compact chip markers');
const cssSource = await readFile(cssPath, 'utf8');
assert.equal(cssSource.includes('.sampling-chip'), true, 'CSS should include compact chip styles');
assert.equal(cssSource.includes('.sampling-panel-tabs'), true, 'CSS should include right-panel tab styles');

console.log('smoke_sampling_process_ui_polish: ok');
