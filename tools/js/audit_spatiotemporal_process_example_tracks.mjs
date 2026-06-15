import { SPATIOTEMPORAL_PROCESS_EXAMPLE_TRACKS, SPATIOTEMPORAL_PROCESS_EXAMPLES, spatiotemporalProcessExampleOptionsByTrack } from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { referenceSignatureById } from '../../src/core/demo/roi/RoiReferenceSignatures.js';
const errors = [];
const fidelity = new Map();
const ruleFamilies = new Map();
for (const example of SPATIOTEMPORAL_PROCESS_EXAMPLES) {
  fidelity.set(example.implementationFidelity, (fidelity.get(example.implementationFidelity) ?? 0) + 1);
  ruleFamilies.set(example.ruleFamilyId, (ruleFamilies.get(example.ruleFamilyId) ?? 0) + 1);
  if (!referenceSignatureById(example.referenceSignatureId)) errors.push(example.id + ': invalid mapping ' + example.referenceSignatureId);
  if (!Object.keys(example.componentDefaults ?? {}).length) errors.push(example.id + ': missing component defaults');
  if (!example.shortDescription || !example.notA) errors.push(example.id + ': missing explanatory fields');
}
console.log('Tracks');
for (const track of SPATIOTEMPORAL_PROCESS_EXAMPLE_TRACKS) console.log('- ' + track.label + ': ' + spatiotemporalProcessExampleOptionsByTrack(track.id).map((option) => option.label).join(', '));
console.log('Mapped reference signatures');
for (const example of SPATIOTEMPORAL_PROCESS_EXAMPLES) console.log('- ' + example.id + ' -> ' + example.referenceSignatureId);
console.log('Rule families used', Object.fromEntries(ruleFamilies));
console.log('Implementation fidelity counts', Object.fromEntries(fidelity));
console.log('Ocean analogs requiring flow coupling', SPATIOTEMPORAL_PROCESS_EXAMPLES.filter((example) => example.exampleType === 'oceanProcessAnalog' && example.requiresFlowCoupling).map((example) => example.label));
console.log('Ocean analogs requiring uncertainty for mission realism', SPATIOTEMPORAL_PROCESS_EXAMPLES.filter((example) => example.exampleType === 'oceanProcessAnalog' && example.requiresUncertaintyForMissionRealism).map((example) => example.label));
if (errors.length) { console.error(errors.join('\\n')); process.exit(1); }
console.log('audit_spatiotemporal_process_example_tracks: ok');

