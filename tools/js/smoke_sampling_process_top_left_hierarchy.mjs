import assert from 'node:assert/strict';

import { samplingProcessConsoleHtml } from '../../src/ui/sampling/SamplingProcessConsoleSections.js';
import { referenceSignatureMetadata } from '../../src/core/demo/roi/RoiReferenceSignatures.js';
import { processRuleById } from '../../src/core/demo/sampling/SamplingProcessRules.js';

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
  seed: 'hierarchy-smoke',
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
      activeNodeCount: 5,
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
  randomRuleSeed: 'sampling-random-001',
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

function indexOfRequired(html, needle, label = needle) {
  const index = html.indexOf(needle);
  assert.notEqual(index, -1, `${label} missing`);
  return index;
}

function assertOrder(html, earlier, later, message) {
  assert.ok(indexOfRequired(html, earlier) < indexOfRequired(html, later), message);
}

function assertCriticalSelectors(html) {
  for (const selector of [
    'id="sampling-process-mode"',
    'id="roi-demo-display-mode"',
    'data-action="export-demo-json"'
  ]) {
    assert.ok(html.includes(selector), `critical selector preserved: ${selector}`);
  }
}

const foundationalHtml = samplingProcessConsoleHtml(stateForMode('foundationalCaModels'));
assertCriticalSelectors(foundationalHtml);
assert.ok(foundationalHtml.includes('data-sampling-top-card="mode"'), 'foundational mode should render Mode control card');
assert.equal(foundationalHtml.includes('value="referenceSignature"'), false, 'mode selector should not expose legacy referenceSignature');
assert.equal(foundationalHtml.includes('value="diagnosticsGraphInspection"'), false, 'mode selector should not expose Diagnostics / Graph Inspection');
assert.equal(foundationalHtml.includes('id="roi-demo-pattern-source"'), false, 'Foundational CA card should not render Pattern Source dropdown');
assert.equal(foundationalHtml.includes('data-roi-help="behaviorPreset"'), false, 'Foundational CA card should not render selected-pattern Explain button');
assert.equal(foundationalHtml.includes('Diagnostics Overlay'), true, 'Display / Diagnostic Layer should still expose Diagnostics Overlay');
assert.ok(foundationalHtml.includes('data-sampling-primary-mode="foundationalCaModels"'), 'foundational mode should render the Foundational CA primary card');
assert.ok(foundationalHtml.includes('Foundational CA Model'), 'foundational mode should label the primary selector Foundational CA Model');
assert.ok(foundationalHtml.includes('id="sampling-process-example-id"'), 'foundational mode should render track-specific selector');
assert.ok(foundationalHtml.includes('id="roi-demo-reference-signature"'), 'foundational mode should preserve hidden legacy selector');
assert.ok(!foundationalHtml.includes('Example Track'), 'old Example Track selector should not render');
assert.ok(!foundationalHtml.includes('data-sampling-top-card="summary"'), 'left panel should not render standalone Current Summary');
assertOrder(foundationalHtml, 'id="sampling-process-mode"', 'id="sampling-process-example-id"', 'mode selector should appear before example selector');
assertOrder(foundationalHtml, 'data-sampling-top-card="mode"', 'data-sampling-top-card="primary"', 'mode card should appear before primary card');
assertOrder(foundationalHtml, 'data-sampling-top-card="primary"', 'data-sampling-section="display"', 'primary card should appear before later sections');
assert.ok(!foundationalHtml.slice(0, indexOfRequired(foundationalHtml, 'id="sampling-process-mode"')).includes('Active Source'), 'duplicate Active Source metadata should not appear before mode selector');
assert.ok(!foundationalHtml.includes('Current Summary'), 'Current Summary should move out of the left control panel');

const customHtml = samplingProcessConsoleHtml(stateForMode('customComposer'));
assertCriticalSelectors(customHtml);
assert.ok(customHtml.includes('data-sampling-primary-mode="customComposer"'), 'custom mode should render Custom Composer primary card');
assertOrder(customHtml, 'id="sampling-process-mode"', 'data-sampling-primary-mode="customComposer"', 'custom mode selector should appear before composer primary');
assertOrder(customHtml, 'data-sampling-primary-mode="customComposer"', 'id="roi-demo-event-likelihood"', 'custom primary should appear before full component stack');
assert.ok(customHtml.includes('id="roi-demo-event-likelihood"'), 'custom full component stack should still render later');
assert.ok(customHtml.includes('id="roi-demo-value-distribution"'), 'custom value distribution selector should still render later');

const paintHtml = samplingProcessConsoleHtml(stateForMode('processPaint'));
assertCriticalSelectors(paintHtml);
assert.ok(paintHtml.includes('data-sampling-primary-mode="processPaint"'), 'process paint should render primary card');
assertOrder(paintHtml, 'id="sampling-process-mode"', 'data-sampling-primary-mode="processPaint"', 'paint mode selector should appear before paint primary');
assertOrder(paintHtml, 'data-sampling-primary-mode="processPaint"', 'id="sampling-paint-state"', 'paint primary should appear before paint tools');
assert.ok(paintHtml.includes('id="sampling-paint-state"'), 'paint tools should still render');
assert.ok(!paintHtml.includes('id="roi-demo-reference-signature"'), 'paint mode should not show reference selector as primary control');

const randomHtml = samplingProcessConsoleHtml(stateForMode('randomRuleLab'));
assertCriticalSelectors(randomHtml);
assert.ok(randomHtml.includes('data-sampling-primary-mode="randomRuleLab"'), 'random mode should render primary card');
assertOrder(randomHtml, 'data-sampling-primary-mode="randomRuleLab"', 'id="sampling-random-seed"', 'random primary should appear before random controls');
assert.ok(!randomHtml.includes('id="sampling-paint-state"'), 'random mode should not show paint controls');

const diagnosticsHtml = samplingProcessConsoleHtml(stateForMode('diagnosticsGraphInspection'));
assertCriticalSelectors(diagnosticsHtml);
assert.equal(diagnosticsHtml.includes('data-sampling-primary-mode="diagnosticsGraphInspection"'), false, 'diagnostics should not render as a primary workflow card');
assert.ok(diagnosticsHtml.includes('id="roi-filter-message-threshold"'), 'diagnostics internal view should still expose filters');
assert.ok(!diagnosticsHtml.includes('id="sampling-paint-state"'), 'diagnostics should not show paint controls');
assert.ok(!diagnosticsHtml.includes('id="roi-demo-event-likelihood"'), 'diagnostics should not show authoring controls');

console.log('smoke_sampling_process_top_left_hierarchy: ok');
