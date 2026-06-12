import {
  SAMPLING_PROCESS_MODE_UI,
  SAMPLING_PROCESS_SECTION_IDS,
  samplingProcessModeHasSection,
  samplingProcessModeSections,
  samplingProcessRightPanelDefault,
  samplingProcessUiConfig
} from '../../src/core/demo/sampling/SamplingProcessUiConfig.js';
import {
  SAMPLING_PROCESS_MODES,
  SAMPLING_PROCESS_VISIBLE_MODES
} from '../../src/core/demo/sampling/SamplingProcessTerminology.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const knownSections = new Set(SAMPLING_PROCESS_SECTION_IDS);
const fullComposerSections = ['sourceField', 'spatialPattern', 'valueDistribution', 'temporalPattern', 'spatialEvolution', 'interactionScale', 'stateUpdateRule', 'samplingEffect'];

for (const mode of SAMPLING_PROCESS_MODES) {
  const config = samplingProcessUiConfig(mode);
  assert(config, `${mode} missing UI config`);
  assert(Array.isArray(config.leftSections) && config.leftSections.length > 0, `${mode} missing leftSections`);
  assert(config.rightPanelDefault, `${mode} missing rightPanelDefault`);
  const duplicates = config.leftSections.filter((sectionId, index) => config.leftSections.indexOf(sectionId) !== index);
  assert(duplicates.length === 0, `${mode} has duplicate sections: ${duplicates.join(', ')}`);
  for (const sectionId of config.leftSections) {
    assert(knownSections.has(sectionId), `${mode} references unknown section ${sectionId}`);
  }
}

assert(samplingProcessModeHasSection('referenceSignature', 'referenceSignature'), 'referenceSignature should include reference selector');
assert(!samplingProcessModeHasSection('referenceSignature', 'processPaintTools'), 'referenceSignature should exclude Process Paint tools');
assert(!samplingProcessModeHasSection('referenceSignature', 'randomRuleLab'), 'referenceSignature should exclude Random Rule Lab tools');

for (const sectionId of fullComposerSections) {
  assert(samplingProcessModeHasSection('customComposer', sectionId), `customComposer should include ${sectionId}`);
  assert(!samplingProcessModeHasSection('processPaint', sectionId), `processPaint should exclude composer section ${sectionId}`);
  assert(!samplingProcessModeHasSection('randomRuleLab', sectionId), `randomRuleLab should exclude composer section ${sectionId}`);
}

assert(samplingProcessModeHasSection('processPaint', 'processPaintTools'), 'processPaint should include paint tools');
assert(samplingProcessModeHasSection('randomRuleLab', 'randomRuleLab'), 'randomRuleLab should include random controls');
assert(samplingProcessModeHasSection('diagnosticsGraphInspection', 'graphFilters'), 'diagnostics should include graph filters');
assert(samplingProcessModeHasSection('diagnosticsGraphInspection', 'messageFilters'), 'diagnostics should include message filters');
assert(samplingProcessModeHasSection('diagnosticsGraphInspection', 'transitionFilters'), 'diagnostics should include transition filters');
assert(SAMPLING_PROCESS_MODE_UI.diagnosticsGraphInspection.internal === true, 'diagnostics config should be marked internal');
assert(!SAMPLING_PROCESS_VISIBLE_MODES.includes('diagnosticsGraphInspection'), 'diagnostics should not be visible workflow mode');
assert(samplingProcessRightPanelDefault('processPaint') === 'paintTools', 'processPaint right panel default mismatch');
assert(samplingProcessRightPanelDefault('diagnosticsGraphInspection') === 'diagnostics', 'diagnostics right panel default mismatch');
assert(samplingProcessModeSections('customComposer').length > samplingProcessModeSections('referenceSignature').length, 'custom composer should expose more sections than reference mode');
assert(Object.keys(SAMPLING_PROCESS_MODE_UI).length === SAMPLING_PROCESS_MODES.length, 'mode UI config count mismatch');

if (failures.length) {
  console.error('Sampling process UI config smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Sampling process UI config smoke passed (${SAMPLING_PROCESS_MODES.length} modes, ${SAMPLING_PROCESS_SECTION_IDS.length} sections)`);
