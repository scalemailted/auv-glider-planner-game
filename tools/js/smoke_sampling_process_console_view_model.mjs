import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildSamplingProcessConsoleState } from '../../src/core/demo/sampling/SamplingProcessConsoleViewModel.js';

const modulePath = new URL('../../src/core/demo/sampling/SamplingProcessConsoleViewModel.js', import.meta.url);

function grid(width, height, valueForCell) {
  return Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_col, x) => valueForCell(x, y))
  ));
}

function baseField() {
  const width = 3;
  const height = 2;
  const values = grid(width, height, (x, y) => Number((0.2 + x * 0.2 + y * 0.1).toFixed(3)));
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
    evolutionModel: 'neighborPropagation',
    patternEvolution: 'neighborPropagation',
    spatialEvolution: 'neighborPropagation',
    motionScope: 'localNeighborhood',
    interactionScale: 'edge',
    stateModel: 'stateEvolving',
    depletionMode: 'soft',
    displayMode: 'sampleValueLikelihoodOverlay',
    clusterCount: 2,
    clusterSize: 'medium',
    dynamicComplexity: 'medium',
    field: values,
    sampleValueField: values,
    stats: { min: 0.2, max: 0.7, mean: 0.45, totalValue: 2.7 },
    activityDiagnostics: {
      activeFraction: 0.4,
      highValueFraction: 0.2,
      meanValue: 0.45,
      maxValue: 0.7,
      presetValidation: { status: 'PASS' },
      graphDiagnostics: {
        updateRule: 'propagatingFront',
        activeNodeCount: 2,
        activeClusterCount: 1,
        edgeMessageTotal: 3,
        stateCounts: { active: 2, susceptible: 4 }
      }
    },
    graphField: {
      diagnostics: {
        updateRule: 'propagatingFront',
        activeNodeCount: 2,
        activeClusterCount: 1,
        edgeMessageTotal: 3,
        stateCounts: { active: 2, susceptible: 4 }
      }
    }
  };
}

function baseContext(overrides = {}) {
  return {
    title: 'Sample / ROI Field Demo',
    field: baseField(),
    sceneConfig: {
      eventLikelihood: 'multiModalLikelihood',
      spatialPattern: 'clusteredField',
      valueDistribution: 'gaussianNormal',
      temporalPattern: 'bursty',
      spatialEvolution: 'neighborPropagation',
      interactionScale: 'edge',
      stateModel: 'stateEvolving',
      depletionMode: 'soft',
      displayMode: 'sampleValueLikelihoodOverlay'
    },
    distribution: 'burstyBloom',
    seed: 'anchor-roi-demo',
    eventLikelihood: 'multiModalLikelihood',
    eventLikelihoodDynamics: 'dynamic',
    eventLikelihoodTemporalPattern: 'bursty',
    eventLikelihoodSpatialEvolution: 'neighborPropagation',
    hotspotCount: 2,
    clusterSize: 'medium',
    noise: 0.1,
    timeMode: 'dynamic',
    spatialPattern: 'clusteredField',
    valueDistribution: 'gaussianNormal',
    temporalPattern: 'bursty',
    temporalBehavior: 'bursty',
    evolutionModel: 'neighborPropagation',
    patternEvolution: 'neighborPropagation',
    spatialEvolution: 'neighborPropagation',
    motionScope: 'localNeighborhood',
    interactionScale: 'edge',
    stateModel: 'stateEvolving',
    depletionMode: 'soft',
    displayMode: 'sampleValueLikelihoodOverlay',
    viewFilters: {
      showTopologyEdges: true,
      showActiveMessageEdges: true,
      nodeStates: { active: true, susceptible: true }
    },
    dynamicComplexity: 'medium',
    patternSource: 'referenceSignature',
    processMode: 'referenceSignature',
    behaviorPresetId: 'custom',
    behaviorPresetModified: false,
    referenceSignatureId: 'stationaryTemporalBursts',
    referenceSignatureModified: false,
    updateRuleHint: 'propagatingFront',
    modifiedComponent: null,
    forecastView: 'forecast',
    timeSpeedScale: 1,
    playbackDirection: 1,
    demoTime: 10,
    paused: false,
    exportMode: 'currentFrame',
    exportStartTime: 0,
    exportEndTime: 120,
    exportFrameCount: 25,
    scenarioSourceMode: 'currentRecipe',
    scenarioSeed: 'scenario-test-001',
    scenarioDifficulty: 'medium',
    scenarioDuration: 120,
    scenarioFrameCount: 25,
    scenarioValidationMode: 'requirePass',
    generatedScenario: null,
    paintModel: {
      width: 3,
      height: 2,
      cells: { '1,1': { state: 'active', ruleId: 'propagatingFront', groupId: 1, sourceValue: 0.8 } },
      groups: { 1: { id: 1, label: 'Group 1' } }
    },
    paintStartMode: 'blankCanvas',
    processPaintRunStarted: false,
    selectedPaintState: 'active',
    selectedPaintRuleId: 'propagatingFront',
    selectedPaintGroupId: 1,
    selectedPaintSourceValue: 0.8,
    randomRuleSeed: 'sampling-random-001',
    randomRuleMode: 'exploratoryMixedRules',
    randomRuleGroupCount: 4,
    randomRuleActiveFraction: 0.18,
    uiVersion: 'reference-signature-primary-ui-v1',
    referenceSignatureCount: 14,
    legacyPresetCount: 12,
    legacyPresetsVisible: false,
    ...overrides
  };
}

function assertBaseState(state) {
  for (const key of [
    'title',
    'status',
    'eventLikelihood',
    'eventLikelihoodLabel',
    'spatialPattern',
    'spatialPatternLabel',
    'valueDistribution',
    'valueDistributionLabel',
    'temporalPattern',
    'temporalPatternLabel',
    'spatialEvolution',
    'spatialEvolutionLabel',
    'motionScope',
    'motionScopeLabel',
    'interactionScale',
    'interactionScaleLabel',
    'processMode',
    'processModeLabel',
    'processModeDescription',
    'processStatusLabel',
    'displayMode',
    'displayModeLabel',
    'displayModeCaption',
    'viewFilters',
    'stats',
    'activityDiagnostics',
    'exportMode',
    'scenarioSourceMode',
    'uiVersion'
  ]) {
    assert.ok(Object.hasOwn(state, key), `state should include ${key}`);
  }
}

const referenceState = buildSamplingProcessConsoleState(baseContext());
assertBaseState(referenceState);
assert.equal(referenceState.patternSource, 'referenceSignature');
assert.ok(referenceState.referenceSignature, 'reference mode should include reference signature metadata');
assert.equal(referenceState.referenceSignatureId, 'stationaryTemporalBursts');
assert.equal(referenceState.referenceSignatureCount, 14);
assert.equal(referenceState.legacyPresetCount, 12);

const customState = buildSamplingProcessConsoleState(baseContext({
  patternSource: 'custom',
  processMode: 'customComposer',
  referenceSignatureId: 'custom'
}));
assertBaseState(customState);
assert.equal(customState.patternSource, 'custom');
assert.equal(customState.processMode, 'customComposer');

const processPaintState = buildSamplingProcessConsoleState(baseContext({
  patternSource: 'custom',
  processMode: 'processPaint',
  paused: true
}));
assertBaseState(processPaintState);
assert.ok(processPaintState.paintValidation, 'process paint state should include paint validation');
assert.ok(Array.isArray(processPaintState.processRules), 'process paint state should include rule catalog');
assert.ok(Array.isArray(processPaintState.validPaintStates), 'process paint state should include valid paint states');
assert.equal(processPaintState.selectedPaintRuleId, 'propagatingFront');
assert.equal(processPaintState.selectedPaintState, 'active');

const randomRuleState = buildSamplingProcessConsoleState(baseContext({
  patternSource: 'custom',
  processMode: 'randomRuleLab',
  randomRuleSeed: 'random-smoke',
  randomRuleMode: 'scientificRandomization',
  randomRuleGroupCount: 6,
  randomRuleActiveFraction: 0.35
}));
assertBaseState(randomRuleState);
assert.equal(randomRuleState.processMode, 'randomRuleLab');
assert.equal(randomRuleState.randomRuleSeed, 'random-smoke');
assert.equal(randomRuleState.randomRuleMode, 'scientificRandomization');
assert.equal(randomRuleState.randomRuleGroupCount, 6);
assert.equal(randomRuleState.randomRuleActiveFraction, 0.35);

const scenarioState = buildSamplingProcessConsoleState(baseContext({
  generatedScenario: {
    scenarioId: 'scenario-smoke',
    family: 'custom',
    seed: 'scenario-seed',
    difficulty: 'medium',
    sourceMode: 'currentRecipe',
    frames: [{}, {}],
    time: { durationSeconds: 60, frameCount: 2 },
    validation: { status: 'PASS', humanSummary: 'ok', warnings: [], failures: [], recommendedFixes: [] },
    diagnostics: { meanActiveFraction: 0.2, meanHighValueFraction: 0.1, meanFrameDelta: 0.03 },
    labels: { processClass: 'front' },
    behaviorSignature: { observablePattern: 'front' },
    processContract: { roiInterpretation: 'sample front' }
  }
}));
assert.equal(scenarioState.scenarioSummary.scenarioId, 'scenario-smoke');
assert.equal(scenarioState.scenarioSummary.validationStatus, 'PASS');
assert.equal(scenarioState.scenarioSummary.frameCount, 2);

const source = await readFile(modulePath, 'utf8');
assert.equal(source.includes('RoiGeneratorDemoScene'), false, 'console view-model module should not import or reference the scene');
assert.equal(/\bPhaser\b/.test(source), false, 'console view-model module should not depend on Phaser');
assert.equal(/\bdocument\b|\bwindow\b/.test(source), false, 'console view-model module should not depend on DOM globals');

console.log('smoke_sampling_process_console_view_model: ok');
