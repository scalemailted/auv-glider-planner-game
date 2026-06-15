import assert from 'node:assert/strict';

import {
  SAMPLING_PROCESS_VISIBLE_MODES,
  normalizeSamplingProcessMode,
  samplingProcessModeLabel
} from '../../src/core/demo/sampling/SamplingProcessTerminology.js';
import {
  activeProcessExampleExportBlock,
  resolveActiveSpatiotemporalProcessExample,
  spatiotemporalProcessExampleOptionsByTrack
} from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { buildSamplingProcessConsoleState } from '../../src/core/demo/sampling/SamplingProcessConsoleViewModel.js';
import { samplingProcessConsoleHtml } from '../../src/ui/sampling/SamplingProcessConsoleSections.js';

const baseState = {
  title: 'Deterministic Spatiotemporal Process Lab',
  patternSource: 'referenceSignature',
  processStatusLabel: 'Example-Validated',
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
  interactionScale: 'hybrid',
  stateModel: 'stateEvolving',
  depletionMode: 'soft',
  displayMode: 'sampleValue',
  dynamicComplexity: 'medium',
  clusterSize: 'medium',
  timeMode: 'dynamic',
  seed: 'context-mode-smoke',
  exportMode: 'currentFrame',
  exportFrameCount: 1,
  viewFilters: {}
};

function stateFor(mode, patch = {}) {
  return buildSamplingProcessConsoleState({
    ...baseState,
    processMode: mode,
    processModeLabel: samplingProcessModeLabel(mode),
    ...patch
  });
}

assert(SAMPLING_PROCESS_VISIBLE_MODES.includes('foundationalCaModels'), 'Foundational CA Models should be visible');
assert(SAMPLING_PROCESS_VISIBLE_MODES.includes('oceanProcessAnalogs'), 'Ocean-Relevant Process Analogs should be visible');
assert(!SAMPLING_PROCESS_VISIBLE_MODES.includes('referenceSignature'), 'legacy referenceSignature should not be a visible workflow mode');
assert.equal(normalizeSamplingProcessMode('referenceSignature'), 'foundationalCaModels', 'referenceSignature should alias to foundational context');
assert.equal(samplingProcessModeLabel('foundationalCaModels'), 'Foundational CA Models');
assert.equal(samplingProcessModeLabel('oceanProcessAnalogs'), 'Ocean-Relevant Process Analogs');

const foundationalOptions = spatiotemporalProcessExampleOptionsByTrack('foundationalCaModels');
const oceanOptions = spatiotemporalProcessExampleOptionsByTrack('oceanRelevantProcessAnalogs');
assert(foundationalOptions.some((option) => option.id === 'conwayGameOfLife'), 'foundational selector should include Conway');
assert(foundationalOptions.some((option) => option.id === 'forestFire'), 'foundational selector should include Forest Fire');
assert(!foundationalOptions.some((option) => option.id === 'riverPlumeFront'), 'foundational selector should not include River Plume Front');
assert(oceanOptions.some((option) => option.id === 'riverPlumeFront'), 'ocean selector should include River Plume Front');
assert(oceanOptions.some((option) => option.id === 'bloomGrowthDecay'), 'ocean selector should include Bloom Growth / Decay');
assert(!oceanOptions.some((option) => option.id === 'conwayGameOfLife'), 'ocean selector should not include Conway');

const foundationalHtml = samplingProcessConsoleHtml(stateFor('foundationalCaModels', {
  exampleTrack: 'foundationalCaModels',
  exampleProcessId: 'conwayGameOfLife',
  foundationalCaModelId: 'conwayGameOfLife',
  referenceSignatureId: 'birthDeathEmergence'
}));
assert(foundationalHtml.includes('Foundational CA Models'), 'foundational UI should show context title');
assert(foundationalHtml.includes('Foundational CA Model'), 'foundational UI should show model selector label');
assert(foundationalHtml.includes('Conway'), 'foundational UI should show Conway');
assert(foundationalHtml.includes('Forest Fire'), 'foundational UI should show Forest Fire');
assert(!foundationalHtml.includes('Example Track'), 'normal UI should not emit Example Track');
assert(!foundationalHtml.includes('River Plume Front'), 'foundational UI should not show ocean analog options');

const oceanHtml = samplingProcessConsoleHtml(stateFor('oceanProcessAnalogs', {
  exampleTrack: 'oceanRelevantProcessAnalogs',
  exampleProcessId: 'riverPlumeFront',
  oceanProcessAnalogId: 'riverPlumeFront',
  referenceSignatureId: 'frontPropagation'
}));
assert(oceanHtml.includes('Ocean-Relevant Process Analogs'), 'ocean UI should show context title');
assert(oceanHtml.includes('Ocean Process Analog'), 'ocean UI should show analog selector label');
assert(oceanHtml.includes('River Plume Front'), 'ocean UI should show River Plume Front');
assert(oceanHtml.includes('Bloom Growth / Decay'), 'ocean UI should show Bloom Growth / Decay');
assert(!oceanHtml.includes('Example Track'), 'ocean UI should not emit Example Track');
assert(!oceanHtml.includes('Conway'), 'ocean UI should not show foundational model options');

for (const mode of ['customComposer', 'processPaint', 'randomRuleLab']) {
  const active = resolveActiveSpatiotemporalProcessExample({
    patternSource: 'custom',
    processMode: mode,
    exampleTrack: 'foundationalCaModels',
    exampleProcessId: 'conwayGameOfLife',
    referenceSignatureId: 'birthDeathEmergence'
  });
  assert.equal(active.isCustom, true, `${mode} should clear active example identity`);
  assert.equal(active.exampleTrack, null, `${mode} should not retain a stale track`);
  assert.equal(active.exampleProcessId, null, `${mode} should not retain a stale example id`);
}

const foundationalExport = activeProcessExampleExportBlock(resolveActiveSpatiotemporalProcessExample({
  patternSource: 'referenceSignature',
  processMode: 'foundationalCaModels',
  exampleProcessId: 'conwayGameOfLife'
}));
assert.equal(foundationalExport.exampleTrack, 'foundationalCaModels');
assert.equal(foundationalExport.exampleType, 'foundationalCaModel');
assert.equal(foundationalExport.foundationalCaModelId, 'conwayGameOfLife');
assert.equal(foundationalExport.oceanProcessAnalogId, null);

const oceanExport = activeProcessExampleExportBlock(resolveActiveSpatiotemporalProcessExample({
  patternSource: 'referenceSignature',
  processMode: 'oceanProcessAnalogs',
  exampleProcessId: 'riverPlumeFront'
}));
assert.equal(oceanExport.exampleTrack, 'oceanRelevantProcessAnalogs');
assert.equal(oceanExport.exampleType, 'oceanProcessAnalog');
assert.equal(oceanExport.foundationalCaModelId, null);
assert.equal(oceanExport.oceanProcessAnalogId, 'riverPlumeFront');
assert.equal(oceanExport.requiresFlowCoupling, true);

console.log('smoke_spatiotemporal_process_context_modes: ok');