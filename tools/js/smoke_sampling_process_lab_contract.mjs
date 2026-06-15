import {
  ROI_DEMO_EVENT_LIKELIHOODS,
  createDemoRoiField,
  roiEventLikelihoodLabel
} from '../../src/core/demo/DemoRoiFields.js';
import {
  SAMPLING_PROCESS_LAB_TITLE,
  SAMPLING_PROCESS_LEGACY_DEMO_NAME,
  SAMPLING_PROCESS_MODES,
  SAMPLING_PROCESS_STATUS_LABELS,
  samplingProcessStatusLabel,
  sourceFieldBoundaryNote
} from '../../src/core/demo/sampling/SamplingProcessTerminology.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(SAMPLING_PROCESS_LAB_TITLE === 'Deterministic Spatiotemporal Process Lab', 'new lab title mismatch');
assert(SAMPLING_PROCESS_LEGACY_DEMO_NAME === 'Sample / ROI Field Demo', 'legacy demo name mismatch');
for (const mode of ['referenceSignature', 'customComposer', 'processPaint', 'randomRuleLab']) {
  assert(SAMPLING_PROCESS_MODES.includes(mode), `missing process mode ${mode}`);
}
for (const status of ['Example-Validated', 'Example-Modified', 'Custom Exploratory', 'Weak Pattern', 'Invalid / Diagnostic Only']) {
  assert(SAMPLING_PROCESS_STATUS_LABELS.includes(status), `missing status label ${status}`);
}
assert(sourceFieldBoundaryNote().includes('not uncertainty'), 'source field boundary note should demote likelihood/uncertainty');
assert(samplingProcessStatusLabel({ mode: 'referenceSignature', patternSource: 'referenceSignature', validationStatus: 'PASS' }) === 'Example-Validated', 'example validated status mismatch');
assert(samplingProcessStatusLabel({ mode: 'customComposer', patternSource: 'custom', validationStatus: 'PASS' }) === 'Custom Exploratory', 'custom exploratory status mismatch');
assert(samplingProcessStatusLabel({ validationStatus: 'WARN' }) === 'Weak Pattern', 'weak pattern status mismatch');

for (const id of ROI_DEMO_EVENT_LIKELIHOODS) {
  assert(!/Likelihood$/.test(roiEventLikelihoodLabel(id)), `source label still ends as Likelihood: ${id}`);
}

const field = createDemoRoiField({ seed: 'sampling-contract', demoTime: 3 });
assert(field.sourceField, 'field missing preferred sourceField alias');
assert(field.sourceFieldModel, 'field missing preferred sourceFieldModel alias');
assert(field.sourceNodes, 'field missing preferred sourceNodes alias');
assert(field.samplingValueField, 'field missing preferred samplingValueField alias');
assert(field.eventLikelihoodField, 'field missing legacy eventLikelihoodField alias');
assert(field.likelihoodField, 'field missing legacy likelihoodField alias');

if (failures.length) {
  console.error('Sampling process lab contract smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Sampling process lab contract smoke passed (${SAMPLING_PROCESS_MODES.length} modes)`);
