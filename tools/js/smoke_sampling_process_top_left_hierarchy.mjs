import assert from 'node:assert/strict';

import { samplingProcessConsoleHtml } from '../../src/ui/sampling/SamplingProcessConsoleSections.js';
import { referenceSignatureMetadata } from '../../src/core/demo/roi/RoiReferenceSignatures.js';
import { processRuleById } from '../../src/core/demo/sampling/SamplingProcessRules.js';

const baseState = {
  title: 'Spatiotemporal Sampling Process Lab',
  processMode: 'referenceSignature',
  patternSource: 'referenceSignature',
  processModeLabel: 'Example Processes',
  processStatusLabel: 'Pattern-Validated',
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
  return {
    ...baseState,
    processMode,
    patternSource: processMode === 'referenceSignature' ? 'referenceSignature' : 'custom',
    processModeLabel: {
      referenceSignature: 'Example Processes',
      customComposer: 'Custom Composer',
      processPaint: 'Process Paint',
      randomRuleLab: 'Random Rule Lab',
      diagnosticsGraphInspection: 'Diagnostics / Graph Inspection'
    }[processMode] ?? 'Example Processes'
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

const referenceHtml = samplingProcessConsoleHtml(stateForMode('referenceSignature'));
assertCriticalSelectors(referenceHtml);
assert.ok(referenceHtml.includes('data-sampling-top-card="mode"'), 'reference mode should render Mode control card');
assert.equal(referenceHtml.includes('value="diagnosticsGraphInspection"'), false, 'mode selector should not expose Diagnostics / Graph Inspection');
assert.equal(referenceHtml.includes('id="roi-demo-pattern-source"'), false, 'Process Pattern card should not render Pattern Source dropdown');
assert.equal(referenceHtml.includes('data-roi-help="behaviorPreset"'), false, 'Process Pattern card should not render selected-pattern Explain button');
assert.equal(referenceHtml.includes('Diagnostics Overlay'), true, 'Display / Diagnostic Layer should still expose Diagnostics Overlay');
assert.ok(referenceHtml.includes('data-sampling-primary-mode="referenceSignature"'), 'guided mode should render Process Pattern primary card');
assert.ok(referenceHtml.includes('Process Pattern'), 'guided mode should label the primary selector Process Pattern');
assert.ok(!referenceHtml.includes('data-sampling-top-card="summary"'), 'left panel should not render standalone Current Summary');
assertOrder(referenceHtml, 'id="sampling-process-mode"', 'id="roi-demo-reference-signature"', 'mode selector should appear before reference selector');
assertOrder(referenceHtml, 'data-sampling-top-card="mode"', 'data-sampling-top-card="primary"', 'mode card should appear before primary card');
assertOrder(referenceHtml, 'data-sampling-top-card="primary"', 'data-sampling-section="display"', 'primary card should appear before later sections');
assert.ok(!referenceHtml.slice(0, indexOfRequired(referenceHtml, 'id="sampling-process-mode"')).includes('Active Source'), 'duplicate Active Source metadata should not appear before mode selector');
assert.ok(!referenceHtml.includes('Current Summary'), 'Current Summary should move out of the left control panel');

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
