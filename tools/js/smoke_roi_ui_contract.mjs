import {
  ROI_DEMO_DISPLAY_MODES,
  ROI_DEMO_SPATIAL_EVOLUTIONS,
  ROI_DEMO_VALUE_DISTRIBUTIONS,
  roiDisplayModeLabel
} from '../../src/core/demo/DemoRoiFields.js';
import {
  SAMPLE_FIELD_COMPONENTS,
  sampleFieldComponentLabel
} from '../../src/core/demo/SampleFieldComponentContracts.js';
import {
  SAMPLE_FIELD_BEHAVIOR_PRESETS
} from '../../src/core/demo/SampleFieldBehaviorPresets.js';
import {
  ROI_REFERENCE_SIGNATURES
} from '../../src/core/demo/roi/RoiReferenceSignatures.js';
import {
  SAMPLING_PROCESS_LAB_TITLE,
  SAMPLING_PROCESS_MODES,
  SAMPLING_PROCESS_VISIBLE_MODES
} from '../../src/core/demo/sampling/SamplingProcessTerminology.js';
import {
  samplingProcessModeHasSection,
  samplingProcessRightPanelDefault
} from '../../src/core/demo/sampling/SamplingProcessUiConfig.js';

const requiredReferenceLabels = [
  'Propagating Fronts',
  'Excitable Waves',
  'Local Birth-Death Emergence',
  'Recurrent Stationary Hotspots',
  'Diffusive / Epidemic Spread',
  'Directed Feature Transport',
  'Cyclic Dominance',
  'Domain / Cluster Formation',
  'Threshold Cascades / Avalanches',
  'Interacting Population Migration',
  'Freshness / Recovery',
  'Pattern Formation / Morphogenesis',
  'Congestion / Density Waves',
  'Structured Signal Propagation'
];

const requiredValueDistributions = [
  'constantValue',
  'uniformRandom',
  'gaussianNormal',
  'skewedLow',
  'skewedHigh',
  'bimodalValues',
  'heavyTailed',
  'rareExtremeEvents'
];

const requiredSpatialEvolutions = [
  'stationary',
  'continuousDrift',
  'discreteJump',
  'randomWalk',
  'neighborPropagation',
  'expansion',
  'contraction',
  'divergence',
  'convergence',
  'morphMutation',
  'shearStretch',
  'rotationalSwirl',
  'branchingGrowth'
];

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(ROI_REFERENCE_SIGNATURES.length === 14, `expected 14 reference signatures, got ${ROI_REFERENCE_SIGNATURES.length}`);
for (const label of requiredReferenceLabels) {
  assert(ROI_REFERENCE_SIGNATURES.some((signature) => signature.label === label), `missing reference signature label: ${label}`);
}

assert(SAMPLE_FIELD_BEHAVIOR_PRESETS.length >= 12, `expected legacy presets to remain for compatibility, got ${SAMPLE_FIELD_BEHAVIOR_PRESETS.length}`);

for (const valueDistribution of requiredValueDistributions) {
  assert(ROI_DEMO_VALUE_DISTRIBUTIONS.includes(valueDistribution), `missing value distribution: ${valueDistribution}`);
}

for (const spatialEvolution of requiredSpatialEvolutions) {
  assert(ROI_DEMO_SPATIAL_EVOLUTIONS.includes(spatialEvolution), `missing spatial evolution: ${spatialEvolution}`);
}

for (const [mode, label] of [
  ['graphTopology', 'Graph Topology'],
  ['graphMessages', 'Process Influence Messages'],
  ['stateTransitions', 'State Transitions'],
  ['roiMeaning', 'ROI Meaning']
]) {
  assert(ROI_DEMO_DISPLAY_MODES.includes(mode), `missing display mode: ${mode}`);
  assert(roiDisplayModeLabel(mode) === label, `display mode label mismatch for ${mode}`);
}

assert(SAMPLE_FIELD_COMPONENTS.includes('valueDistribution'), 'component groups must include valueDistribution');
assert(sampleFieldComponentLabel('behaviorPreset') === 'Example Process', 'first component label should be Example Process');
assert(sampleFieldComponentLabel('valueDistribution') === 'Value Distribution', 'valueDistribution component label mismatch');
assert(SAMPLING_PROCESS_LAB_TITLE === 'Deterministic Spatiotemporal Process Lab', 'sampling process lab title mismatch');
assert(SAMPLING_PROCESS_MODES.includes('processPaint'), 'Process Paint mode missing');
assert(SAMPLING_PROCESS_MODES.includes('randomRuleLab'), 'Random Rule Lab mode missing');
assert(SAMPLING_PROCESS_MODES.includes('diagnosticsGraphInspection'), 'Diagnostics / Graph Inspection mode missing');
assert(!SAMPLING_PROCESS_VISIBLE_MODES.includes('diagnosticsGraphInspection'), 'Diagnostics should not be a visible workflow mode');
assert(SAMPLING_PROCESS_VISIBLE_MODES.length === 4, `expected 4 visible workflow modes, got ${SAMPLING_PROCESS_VISIBLE_MODES.length}`);
assert(samplingProcessModeHasSection('referenceSignature', 'referenceSignature'), 'reference mode should show reference selector');
assert(!samplingProcessModeHasSection('referenceSignature', 'sourceField'), 'reference mode should hide source field controls by default');
assert(samplingProcessModeHasSection('customComposer', 'sourceField'), 'custom composer should show source field controls');
assert(samplingProcessModeHasSection('processPaint', 'processPaintTools'), 'process paint should show paint tools');
assert(!samplingProcessModeHasSection('processPaint', 'temporalPattern'), 'process paint should hide full composer controls');
assert(samplingProcessModeHasSection('randomRuleLab', 'randomRuleLab'), 'random rule lab should show random controls');
assert(samplingProcessModeHasSection('diagnosticsGraphInspection', 'messageFilters'), 'diagnostics should show message filters');
assert(samplingProcessRightPanelDefault('diagnosticsGraphInspection') === 'diagnostics', 'diagnostics right panel default mismatch');

const duplicateComponents = SAMPLE_FIELD_COMPONENTS.filter((component, index) => SAMPLE_FIELD_COMPONENTS.indexOf(component) !== index);
assert(duplicateComponents.length === 0, `duplicate component metadata: ${duplicateComponents.join(', ')}`);

for (const signature of ROI_REFERENCE_SIGNATURES) {
  assert(signature.componentDefaults && Object.keys(signature.componentDefaults).length > 0, `${signature.label} missing componentDefaults`);
  assert(signature.roiInterpretation?.current, `${signature.label} missing current ROI interpretation`);
  assert(signature.roiInterpretation?.nearFuture, `${signature.label} missing near-future ROI interpretation`);
  assert(Array.isArray(signature.referenceModels) && signature.referenceModels.length > 0, `${signature.label} missing reference models`);
  assert(signature.caTaxonomy, `${signature.label} missing caTaxonomy`);
  assert(signature.qaExpectations, `${signature.label} missing qaExpectations`);
  assert(signature.phenotypeMetrics, `${signature.label} missing phenotypeMetrics`);
  assert(signature.genotypeNotes, `${signature.label} missing genotypeNotes`);
}

if (failures.length) {
  console.error('ROI UI contract smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`ROI UI contract smoke passed (${ROI_REFERENCE_SIGNATURES.length} reference signatures, ${SAMPLE_FIELD_BEHAVIOR_PRESETS.length} legacy presets)`);
