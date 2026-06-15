import assert from 'node:assert/strict';

import {
  FOUNDATIONAL_CA_MODELS,
  OCEAN_RELEVANT_PROCESS_ANALOGS,
  resolveActiveSpatiotemporalProcessExample,
  spatiotemporalProcessExampleById
} from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';

assert.equal(typeof resolveActiveSpatiotemporalProcessExample, 'function', 'resolver should be exported');

const foundational = resolveActiveSpatiotemporalProcessExample({
  exampleTrack: 'foundationalCaModels',
  exampleProcessId: 'conwayGameOfLife',
  patternSource: 'referenceSignature',
  processMode: 'foundationalCaModels'
});
assert.equal(foundational.exampleTrack, 'foundationalCaModels');
assert.equal(foundational.exampleTrackLabel, 'Foundational CA Models');
assert.equal(foundational.exampleProcessId, 'conwayGameOfLife');
assert.equal(foundational.exampleType, 'foundationalCaModel');
assert.equal(foundational.foundationalCaModelId, 'conwayGameOfLife');
assert.equal(foundational.oceanProcessAnalogId, null);
assert.equal(foundational.referenceSignatureId, spatiotemporalProcessExampleById('conwayGameOfLife', 'foundationalCaModels').referenceSignatureId);
assert.ok(foundational.referenceSignatureLabel, 'foundational example should include mapped reference signature label');

const ocean = resolveActiveSpatiotemporalProcessExample({
  exampleTrack: 'oceanRelevantProcessAnalogs',
  exampleProcessId: 'riverPlumeFront',
  patternSource: 'referenceSignature',
  processMode: 'oceanProcessAnalogs'
});
assert.equal(ocean.exampleTrack, 'oceanRelevantProcessAnalogs');
assert.equal(ocean.exampleTrackLabel, 'Ocean-Relevant Process Analogs');
assert.equal(ocean.exampleProcessId, 'riverPlumeFront');
assert.equal(ocean.exampleType, 'oceanProcessAnalog');
assert.equal(ocean.foundationalCaModelId, null);
assert.equal(ocean.oceanProcessAnalogId, 'riverPlumeFront');
assert.equal(ocean.requiresFlowCoupling, true);
assert.equal(ocean.referenceSignatureId, spatiotemporalProcessExampleById('riverPlumeFront', 'oceanRelevantProcessAnalogs').referenceSignatureId);
assert.ok(ocean.referenceSignatureLabel, 'ocean analog should include mapped reference signature label');

const foundationalById = resolveActiveSpatiotemporalProcessExample({
  foundationalCaModelId: 'forestFire',
  patternSource: 'referenceSignature',
  processMode: 'foundationalCaModels'
});
assert.equal(foundationalById.exampleTrack, 'foundationalCaModels');
assert.equal(foundationalById.exampleProcessId, 'forestFire');

const oceanById = resolveActiveSpatiotemporalProcessExample({
  oceanProcessAnalogId: 'oilChemicalPlume',
  patternSource: 'referenceSignature',
  processMode: 'oceanProcessAnalogs'
});
assert.equal(oceanById.exampleTrack, 'oceanRelevantProcessAnalogs');
assert.equal(oceanById.exampleProcessId, 'oilChemicalPlume');

const legacy = resolveActiveSpatiotemporalProcessExample({
  referenceSignatureId: 'frontPropagation',
  patternSource: 'referenceSignature',
  processMode: 'foundationalCaModels'
});
assert.equal(legacy.referenceSignatureId, 'frontPropagation');
assert.equal(legacy.isLegacyFallback, true);
assert.ok(legacy.exampleProcessId, 'legacy reference signature should map to a bridge example');

const invalid = resolveActiveSpatiotemporalProcessExample({
  exampleTrack: 'unknown-track',
  exampleProcessId: 'missing-example',
  referenceSignatureId: 'missing-reference',
  patternSource: 'referenceSignature',
  processMode: 'foundationalCaModels'
});
assert.equal(invalid.exampleTrack, 'foundationalCaModels');
assert.equal(invalid.exampleProcessId, 'conwayGameOfLife');
assert.equal(invalid.isLegacyFallback, false);

for (const mode of ['customComposer', 'processPaint', 'randomRuleLab']) {
  const custom = resolveActiveSpatiotemporalProcessExample({
    exampleTrack: 'foundationalCaModels',
    exampleProcessId: 'conwayGameOfLife',
    referenceSignatureId: 'birthDeathEmergence',
    patternSource: 'custom',
    processMode: mode
  });
  assert.equal(custom.isCustom, true, `${mode} should resolve as custom/exploratory`);
  assert.equal(custom.exampleProcessId, null, `${mode} should not pretend to have a selected example`);
  assert.equal(custom.referenceSignatureId, null, `${mode} should not carry mapped reference signature`);
}

for (const model of FOUNDATIONAL_CA_MODELS) {
  const active = resolveActiveSpatiotemporalProcessExample({
    exampleTrack: 'foundationalCaModels',
    exampleProcessId: model.id,
    patternSource: 'referenceSignature',
    processMode: 'foundationalCaModels'
  });
  assert.equal(active.exampleType, 'foundationalCaModel', `${model.id} should stay foundational`);
  assert.equal(active.oceanProcessAnalogId, null, `${model.id} should not resolve as ocean analog`);
  assert.equal(active.referenceSignatureId, model.referenceSignatureId, `${model.id} mapped reference should match metadata`);
}

for (const analog of OCEAN_RELEVANT_PROCESS_ANALOGS) {
  const active = resolveActiveSpatiotemporalProcessExample({
    exampleTrack: 'oceanRelevantProcessAnalogs',
    exampleProcessId: analog.id,
    patternSource: 'referenceSignature',
    processMode: 'oceanProcessAnalogs'
  });
  assert.equal(active.exampleType, 'oceanProcessAnalog', `${analog.id} should stay ocean analog`);
  assert.equal(active.foundationalCaModelId, null, `${analog.id} should not resolve as foundational`);
  assert.equal(active.referenceSignatureId, analog.referenceSignatureId, `${analog.id} mapped reference should match metadata`);
}

console.log('smoke_spatiotemporal_process_active_example_state: ok');