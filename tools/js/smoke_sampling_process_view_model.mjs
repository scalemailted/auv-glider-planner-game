import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildSamplingProcessBehaviorHelpState,
  buildSamplingProcessCellInspection,
  buildSamplingProcessDiagnosticsState,
  buildSamplingProcessPaintPanelState,
  buildSamplingProcessRecipeSignatureState,
  buildSamplingProcessRecipeSummary
} from '../../src/core/demo/sampling/SamplingProcessViewModel.js';

const modulePath = new URL('../../src/core/demo/sampling/SamplingProcessViewModel.js', import.meta.url);

function grid(width, height, valueForCell) {
  return Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_col, x) => valueForCell(x, y))
  ));
}

function mockField() {
  const width = 3;
  const height = 3;
  const sample = grid(width, height, (x, y) => Number((0.2 + x * 0.2 + y * 0.1).toFixed(3)));
  const source = grid(width, height, (x, y) => Number((0.25 + ((x + y) % 3) * 0.25).toFixed(3)));
  const nodeGrid = grid(width, height, (x, y) => ({
    id: y * width + x,
    x,
    y,
    col: x,
    row: y,
    state: x === 1 && y === 1 ? 'active' : 'susceptible',
    ruleId: 'propagatingFront',
    communityId: (x + y) % 2,
    clusterId: `cluster-${(x + y) % 2}`,
    likelihood: source[y][x],
    cellLikelihood: source[y][x],
    activation: sample[y][x],
    clusterLikelihood: source[y][x],
    incomingMessage: x === 1 && y === 1 ? 0.4 : 0.1,
    outgoingMessage: x === 1 && y === 1 ? 0.5 : 0.05,
    neighborCount: 8,
    activeNeighborCount: 2
  }));
  return {
    width,
    height,
    eventLikelihood: 'multiModalLikelihood',
    eventLikelihoodDynamics: 'dynamic',
    eventLikelihoodTemporalPattern: 'bursty',
    eventLikelihoodSpatialEvolution: 'neighborPropagation',
    pureSpatialPattern: 'clusteredField',
    valueDistribution: 'gaussianNormal',
    temporalPattern: 'bursty',
    temporalBehavior: 'bursty',
    spatialEvolution: 'neighborPropagation',
    interactionScale: 'edge',
    stateModel: 'stateEvolving',
    depletionMode: 'soft',
    displayMode: 'diagnosticsOverlay',
    clusterCount: 2,
    clusterSize: 'medium',
    dynamicComplexity: 'medium',
    valueDistributionSeeded: true,
    field: sample,
    sampleValueField: sample,
    eventLikelihoodField: source,
    sourceField: source,
    rawBaseField: sample,
    highValueCells: [{ x: 1, y: 1, value: sample[1][1] }],
    likelihoodField: {
      values: source,
      nodes: [{ id: 'source-1', x: 0.5, y: 0.5, state: 'active', cooldown: 0 }]
    },
    graphField: {
      width,
      height,
      updateRule: 'propagatingFront',
      topology: '8-neighbor',
      graph: { width, height, updateRule: 'propagatingFront', topology: '8-neighbor' },
      nodeGrid,
      clusters: [{ id: 'cluster-0', x: 0.5, y: 0.5, state: 'active', likelihood: 0.8, memberCellCount: 5 }],
      edgeMessages: [{
        source: 1,
        target: 4,
        sourceCell: { x: 1, y: 0 },
        targetCell: { x: 1, y: 1 },
        strength: 0.7,
        sameCommunity: false,
        communityId: 1,
        cause: 'activation'
      }],
      nodeTransitions: [{ col: 1, row: 1, previousState: 'susceptible', nextState: 'active', cause: 'threshold', label: 'threshold crossed' }],
      diagnostics: {
        updateRule: 'propagatingFront',
        activeNodeCount: 1,
        activeClusterCount: 1,
        edgeMessageTotal: 1,
        stateCounts: { active: 1, susceptible: 8 }
      }
    },
    roiRoleLayer: grid(width, height, (x, y) => (x === 1 && y === 1 ? 'currentROI' : 'background')),
    transitionLayer: grid(width, height, (x, y) => (x === 1 && y === 1 ? { previousState: 'susceptible', nextState: 'active' } : null)),
    stats: { min: 0.2, max: 0.8, mean: 0.5, totalValue: 4.5 },
    activityDiagnostics: {
      activeFraction: 0.25,
      highValueFraction: 0.2,
      meanValue: 0.5,
      maxValue: 0.8,
      likelihoodSampleCorrelation: 0.7,
      diagnosticWarnings: [],
      graphDiagnostics: {
        updateRule: 'propagatingFront',
        activeNodeCount: 1,
        activeClusterCount: 1,
        edgeMessageTotal: 1,
        stateCounts: { active: 1, susceptible: 8 }
      }
    }
  };
}

const field = mockField();
const processLayers = {
  sourceField: field.sourceField,
  stateLayer: grid(field.width, field.height, (x, y) => (x === 1 && y === 1 ? 'active' : 'inactive')),
  ruleLayer: grid(field.width, field.height, () => 'propagatingFront'),
  groupLayer: grid(field.width, field.height, (x, y) => (x + y) % 2)
};

const context = {
  title: 'Sample / ROI Field Demo',
  demo: 'Sample / ROI Field Demo',
  field,
  previousField: field,
  processLayers,
  selectedCell: { col: 1, row: 1, x: 1, y: 1 },
  viewFilters: {
    maxMessages: 10,
    messageStrengthThreshold: 0.01,
    showTopMessagesOnly: true,
    sameCommunity: true,
    crossCommunity: true,
    nodeStates: { active: true, susceptible: true, inactive: true },
    messageTypes: { activation: true, generic: true }
  },
  paintModel: {
    width: field.width,
    height: field.height,
    cells: { '1,1': { state: 'active', ruleId: 'propagatingFront', groupId: 1, sourceValue: 0.9 } },
    groups: { 1: { id: 1, label: 'Group 1' } }
  },
  paintStartMode: 'blankCanvas',
  paused: true,
  processMode: 'processPaint',
  patternSource: 'custom',
  referenceSignatureId: 'stationaryTemporalBursts',
  referenceSignatureModified: false,
  behaviorPresetId: 'custom',
  behaviorPresetModified: false,
  modifiedComponent: 'displayLayer',
  displayMode: 'diagnosticsOverlay',
  eventLikelihood: 'multiModalLikelihood',
  eventLikelihoodDynamics: 'dynamic',
  eventLikelihoodTemporalPattern: 'bursty',
  eventLikelihoodSpatialEvolution: 'neighborPropagation',
  spatialPattern: 'clusteredField',
  valueDistribution: 'gaussianNormal',
  temporalPattern: 'bursty',
  temporalBehavior: 'bursty',
  spatialEvolution: 'neighborPropagation',
  interactionScale: 'edge',
  stateModel: 'stateEvolving',
  depletionMode: 'soft',
  motionScope: 'localNeighborhood',
  clusterSize: 'medium',
  hotspotCount: 2,
  noise: 0.1,
  seed: 'smoke-seed',
  demoTime: 12,
  timeMode: 'dynamic',
  selectedPaintState: 'active',
  selectedPaintRuleId: 'propagatingFront',
  selectedPaintGroupId: 1,
  selectedPaintSourceValue: 0.9,
  sceneConfig: {
    eventLikelihood: 'multiModalLikelihood',
    spatialPattern: 'clusteredField',
    valueDistribution: 'gaussianNormal',
    temporalPattern: 'bursty',
    spatialEvolution: 'neighborPropagation',
    interactionScale: 'edge',
    stateModel: 'stateEvolving',
    depletionMode: 'soft',
    displayMode: 'diagnosticsOverlay'
  }
};

const recipeState = buildSamplingProcessRecipeSignatureState(context);
assert.equal(recipeState.patternSource, 'custom');
assert.ok(recipeState.componentRecipe, 'recipe/signature state should include componentRecipe');
assert.equal(recipeState.displayMode, 'diagnosticsOverlay');
assert.ok(Array.isArray(recipeState.compatibilityWarnings), 'compatibilityWarnings should be an array');

const diagnosticsState = buildSamplingProcessDiagnosticsState(context);
assert.equal(diagnosticsState.graphDiagnostics.updateRule, 'propagatingFront');

const behaviorState = buildSamplingProcessBehaviorHelpState(context);
assert.equal(behaviorState.eventLikelihood, 'multiModalLikelihood');
assert.ok(behaviorState.referenceSignature, 'behavior help should include reference signature metadata when available');

const paintState = buildSamplingProcessPaintPanelState(context);
assert.equal(paintState.selectedPaintRuleId, 'propagatingFront');
assert.equal(paintState.selectedPaintState, 'active');
assert.ok(Array.isArray(paintState.basicProcessRules), 'paint panel should include basic rules');
assert.ok(Array.isArray(paintState.advancedProcessRules), 'paint panel should include advanced rules');
assert.ok(paintState.paintValidation, 'paint panel should include validation');

const inspection = buildSamplingProcessCellInspection(context);
assert.deepEqual(inspection.cell, context.selectedCell);
assert.equal(inspection.processState, 'active');
assert.equal(inspection.processRuleId, 'propagatingFront');
assert.equal(inspection.processRuleLabel.length > 0, true);
assert.equal(inspection.processGroupId, 0);
assert.equal(inspection.sourceValue, 0.75);
assert.equal(inspection.roiRole, 'currentROI');
assert.ok(inspection.processTransition, 'inspection should include process transition');
assert.ok(inspection.paintAssignment, 'inspection should include paint assignment');
assert.ok(Array.isArray(inspection.incomingCausalMessages), 'inspection should include incoming messages');
assert.ok(Array.isArray(inspection.outgoingCausalMessages), 'inspection should include outgoing messages');
assert.ok(inspection.graphNeighborhood, 'inspection should include graph neighborhood');
assert.equal(inspection.graphFilterStatus, 'visible');
assert.ok(inspection.roiRoles.current || inspection.roiRoles.nearFuture, 'inspection should include ROI roles');

const summary = buildSamplingProcessRecipeSummary(context);
assert.equal(typeof summary, 'string');
assert.ok(summary.includes(' + '), 'recipe summary should join component labels');

const source = await readFile(modulePath, 'utf8');
assert.equal(source.includes('RoiGeneratorDemoScene'), false, 'view-model module should not import or reference the scene');
assert.equal(/\bPhaser\b/.test(source), false, 'view-model module should not depend on Phaser');
assert.equal(/\bdocument\b|\bwindow\b/.test(source), false, 'view-model module should not depend on DOM globals');

console.log('smoke_sampling_process_view_model: ok');
