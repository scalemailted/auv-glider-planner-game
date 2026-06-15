import assert from 'node:assert/strict';
import { SPATIOTEMPORAL_PROCESS_EXAMPLE_TRACKS, FOUNDATIONAL_CA_MODELS, OCEAN_RELEVANT_PROCESS_ANALOGS, SPATIOTEMPORAL_PROCESS_EXAMPLES, normalizeSpatiotemporalProcessExampleTrack, spatiotemporalProcessExampleOptionsByTrack, spatiotemporalProcessExampleById } from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { referenceSignatureById } from '../../src/core/demo/roi/RoiReferenceSignatures.js';

const trackIds = SPATIOTEMPORAL_PROCESS_EXAMPLE_TRACKS.map((track) => track.id);
assert.ok(trackIds.includes('foundationalCaModels'));
assert.ok(trackIds.includes('oceanRelevantProcessAnalogs'));
for (const label of ["Conway's Game of Life", 'Forest Fire', 'SIR / Epidemic CA', 'Greenberg-Hastings / Excitable Media', 'Sandpile / Avalanche', 'Wa-Tor / Predator-Prey', 'Traffic CA', 'Wireworld']) assert.ok(FOUNDATIONAL_CA_MODELS.some((example) => example.label === label), label);
for (const label of ['Bloom Growth / Decay', 'River Plume Front', 'Oil / Chemical Plume', 'Thermocline / Water-Mass Boundary', 'Eddy-Trapped Patch', 'Shoreline Runoff Pulse', 'Hydrothermal / Deep Source Plume', 'Turbidity Event', 'Hypoxia / Recovery Zone', 'Persistent Monitoring / Freshness Field']) assert.ok(OCEAN_RELEVANT_PROCESS_ANALOGS.some((example) => example.label === label), label);
const ids = new Set();
for (const example of SPATIOTEMPORAL_PROCESS_EXAMPLES) {
  assert.ok(!ids.has(example.id), 'duplicate id ' + example.id);
  ids.add(example.id);
  for (const key of ['id', 'label', 'track', 'exampleType', 'ruleFamilyId', 'referenceSignatureId', 'implementationFidelity', 'componentDefaults', 'observableProcessPatternTags', 'notA']) assert.ok(Object.hasOwn(example, key), example.id + ' missing ' + key);
  assert.ok(referenceSignatureById(example.referenceSignatureId), example.id + ' invalid mapping ' + example.referenceSignatureId);
  if (example.exampleType === 'oceanProcessAnalog') for (const key of ['requiresFlowCoupling', 'environmentalProcess', 'recommendedSamplingStrategy', 'missingScienceLayers', 'coupledDemoBridgeNote']) assert.ok(Object.hasOwn(example, key), example.id + ' missing ' + key);
  if (example.exampleType === 'foundationalCaModel') for (const key of ['canonicalRuleIdea', 'localUpdateFunction', 'stateVocabulary', 'neighborhood', 'teaches']) assert.ok(Object.hasOwn(example, key), example.id + ' missing ' + key);
}
const foundational = spatiotemporalProcessExampleOptionsByTrack('foundationalCaModels');
const ocean = spatiotemporalProcessExampleOptionsByTrack('oceanRelevantProcessAnalogs');
assert.ok(foundational.some((option) => option.label === "Conway's Game of Life"));
assert.ok(!foundational.some((option) => option.label === 'River Plume Front'));
assert.ok(ocean.some((option) => option.label === 'River Plume Front'));
assert.ok(!ocean.some((option) => option.label === "Conway's Game of Life"));
assert.equal(normalizeSpatiotemporalProcessExampleTrack('bad'), 'foundationalCaModels');
assert.equal(spatiotemporalProcessExampleById('frontPropagation').exampleType, 'observableProcessPattern');
console.log('smoke_spatiotemporal_process_example_tracks: ok');
