import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildSamplingProcessConsoleHandlers } from '../../src/core/demo/sampling/SamplingProcessConsoleHandlers.js';

const modulePath = new URL('../../src/core/demo/sampling/SamplingProcessConsoleHandlers.js', import.meta.url);

const REQUIRED_HANDLERS = [
  'distribution',
  'seed',
  'behaviorPreset',
  'patternSource',
  'processMode',
  'paintSelection',
  'paintSelectedCell',
  'clearPaintCell',
  'clearPaintCanvas',
  'runProcessPaint',
  'exportProcessRecipe',
  'randomizeProcessAllocation',
  'referenceSignature',
  'compareComponent',
  'eventLikelihood',
  'eventLikelihoodDynamics',
  'eventLikelihoodTemporalPattern',
  'eventLikelihoodSpatialEvolution',
  'hotspotCount',
  'clusterSize',
  'noise',
  'timeMode',
  'spatialPattern',
  'valueDistribution',
  'temporalPattern',
  'temporalBehavior',
  'evolutionModel',
  'patternEvolution',
  'spatialEvolution',
  'motionScope',
  'interactionScale',
  'stateModel',
  'dynamicComplexity',
  'depletionMode',
  'displayMode',
  'viewFilters',
  'timeSpeedScale',
  'behaviorHelp',
  'regenerate',
  'pause',
  'direction',
  'reset',
  'exportSettings',
  'scenarioSettings',
  'generateScenario',
  'exportDemoJson',
  'exportScenarioJson',
  'menu'
];

const calls = [];
const scene = new Proxy({}, {
  get(_target, prop) {
    return (...args) => {
      calls.push({ method: String(prop), args });
      return `${String(prop)}:ok`;
    };
  }
});

const handlers = buildSamplingProcessConsoleHandlers(scene);

for (const key of REQUIRED_HANDLERS) {
  assert.equal(typeof handlers[key], 'function', `handler ${key} should exist`);
}

handlers.distribution('burstyBloom');
handlers.seed('new-seed');
handlers.behaviorPreset('custom');
handlers.patternSource('custom');
handlers.processMode('processPaint');
handlers.paintSelection({ state: 'active' });
handlers.paintSelectedCell({ sourceValue: 0.8 });
handlers.clearPaintCell();
handlers.clearPaintCanvas();
handlers.runProcessPaint();
handlers.exportProcessRecipe();
handlers.randomizeProcessAllocation({ keepProcessPaint: true });
handlers.referenceSignature('stationaryTemporalBursts');
handlers.compareComponent('spatialEvolution');
handlers.eventLikelihood('multiModalLikelihood');
handlers.eventLikelihoodDynamics('dynamic');
handlers.eventLikelihoodTemporalPattern('bursty');
handlers.eventLikelihoodSpatialEvolution('neighborPropagation');
handlers.hotspotCount(4);
handlers.clusterSize('large');
handlers.noise(0.2);
handlers.timeMode('dynamic');
handlers.spatialPattern('clusteredField');
handlers.valueDistribution('gaussianNormal');
handlers.temporalPattern('bursty');
handlers.temporalBehavior('bursty');
handlers.evolutionModel('neighborPropagation');
handlers.patternEvolution('neighborPropagation');
handlers.spatialEvolution('neighborPropagation');
handlers.motionScope('localNeighborhood');
handlers.interactionScale('edge');
handlers.stateModel('stateEvolving');
handlers.dynamicComplexity('medium');
handlers.depletionMode('soft');
handlers.displayMode('diagnosticsOverlay');
handlers.viewFilters({ showTopologyEdges: true });
handlers.timeSpeedScale(2);
handlers.behaviorHelp('displayLayer');
handlers.regenerate();
handlers.pause();
handlers.direction();
handlers.reset();
handlers.exportSettings({ exportMode: 'timeWindow' });
handlers.scenarioSettings({ scenarioSeed: 'seed' }, { render: false });
handlers.generateScenario();
handlers.exportDemoJson();
handlers.exportScenarioJson();
handlers.menu();

const expectedMethodByHandler = {
  distribution: 'handleSamplingDistributionChange',
  seed: 'handleSamplingSeedChange',
  behaviorPreset: 'applyBehaviorPreset',
  patternSource: 'applyPatternSource',
  processMode: 'applyProcessMode',
  paintSelection: 'applyPaintSelection',
  paintSelectedCell: 'paintSelectedCell',
  clearPaintCell: 'clearSelectedPaintCell',
  clearPaintCanvas: 'clearProcessPaintCanvas',
  runProcessPaint: 'runProcessPaintCanvas',
  exportProcessRecipe: 'exportDemoJson',
  randomizeProcessAllocation: 'randomizeProcessAllocation',
  referenceSignature: 'applyReferenceSignature',
  compareComponent: 'applyComponentComparison',
  eventLikelihood: 'handleSamplingEventLikelihoodChange',
  eventLikelihoodDynamics: 'handleSamplingEventLikelihoodDynamicsChange',
  eventLikelihoodTemporalPattern: 'handleSamplingEventLikelihoodTemporalPatternChange',
  eventLikelihoodSpatialEvolution: 'handleSamplingEventLikelihoodSpatialEvolutionChange',
  hotspotCount: 'handleSamplingHotspotCountChange',
  clusterSize: 'handleSamplingClusterSizeChange',
  noise: 'handleSamplingNoiseChange',
  timeMode: 'handleSamplingTimeModeChange',
  spatialPattern: 'handleSamplingSpatialPatternChange',
  valueDistribution: 'handleSamplingValueDistributionChange',
  temporalPattern: 'handleSamplingTemporalPatternChange',
  temporalBehavior: 'handleSamplingTemporalBehaviorChange',
  evolutionModel: 'handleSamplingEvolutionModelChange',
  patternEvolution: 'handleSamplingPatternEvolutionChange',
  spatialEvolution: 'handleSamplingSpatialEvolutionChange',
  motionScope: 'handleSamplingMotionScopeChange',
  interactionScale: 'handleSamplingInteractionScaleChange',
  stateModel: 'handleSamplingStateModelChange',
  dynamicComplexity: 'handleSamplingDynamicComplexityChange',
  depletionMode: 'handleSamplingDepletionModeChange',
  displayMode: 'handleSamplingDisplayModeChange',
  viewFilters: 'applyViewFilters',
  timeSpeedScale: 'handleSamplingTimeSpeedScaleChange',
  behaviorHelp: 'showBehaviorHelp',
  regenerate: 'handleSamplingRegenerate',
  pause: 'handleSamplingPause',
  direction: 'togglePlaybackDirection',
  reset: 'resetDemoState',
  exportSettings: 'updateExportSettings',
  scenarioSettings: 'updateScenarioSettings',
  generateScenario: 'generateScenario',
  exportDemoJson: 'exportDemoJson',
  exportScenarioJson: 'exportScenarioJson',
  menu: 'handleSamplingMainMenu'
};

for (const method of Object.values(expectedMethodByHandler)) {
  assert.ok(calls.some((call) => call.method === method), `expected ${method} to be invoked`);
}

const source = await readFile(modulePath, 'utf8');
assert.equal(source.includes('RoiGeneratorDemoScene'), false, 'handler module should not import or reference the scene');
assert.equal(/\bPhaser\b/.test(source), false, 'handler module should not depend on Phaser');
assert.equal(/\bdocument\b|\bwindow\b/.test(source), false, 'handler module should not depend on DOM globals');

console.log('smoke_sampling_process_console_handlers: ok');
