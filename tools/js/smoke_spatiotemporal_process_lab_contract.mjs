import assert from 'node:assert/strict';
import {
  SAMPLING_PROCESS_LAB_MENU_LABEL,
  SAMPLING_PROCESS_LAB_TITLE,
  SAMPLING_PROCESS_LEGACY_DEMO_NAME,
  SAMPLING_PROCESS_VISIBLE_MODES,
  samplingProcessModeLabel
} from '../../src/core/demo/sampling/SamplingProcessTerminology.js';
import {
  FOUNDATIONAL_CA_MODELS,
  OBSERVABLE_PROCESS_PATTERNS,
  OCEAN_RELEVANT_PROCESS_ANALOGS,
  spatiotemporalProcessExampleOptions
} from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { buildSamplingProcessDemoArtifactExport } from '../../src/core/demo/sampling/SamplingProcessExportBuilder.js';
import { samplingProcessConsoleHtml } from '../../src/ui/sampling/SamplingProcessConsoleSections.js';
import { roiRecipeSignatureHtml } from '../../src/ui/sampling/SamplingProcessRightPanel.js';
import { referenceSignatureMetadata } from '../../src/core/demo/roi/RoiReferenceSignatures.js';

assert.equal(SAMPLING_PROCESS_LAB_TITLE, 'Deterministic Spatiotemporal Process Lab');
assert.equal(SAMPLING_PROCESS_LAB_MENU_LABEL, 'Process Lab');
assert.equal(SAMPLING_PROCESS_LEGACY_DEMO_NAME, 'Sample / ROI Field Demo');
assert.deepEqual(SAMPLING_PROCESS_VISIBLE_MODES, [
  'foundationalCaModels',
  'oceanProcessAnalogs',
  'customComposer',
  'processPaint',
  'randomRuleLab'
]);
assert(!SAMPLING_PROCESS_VISIBLE_MODES.includes('referenceSignature'), 'legacy referenceSignature mode must not be visible');
assert(!SAMPLING_PROCESS_VISIBLE_MODES.includes('diagnosticsGraphInspection'), 'Diagnostics must not be a visible primary mode');
assert.equal(samplingProcessModeLabel('referenceSignature'), 'Foundational CA Models');
assert.equal(samplingProcessModeLabel('oceanProcessAnalogs'), 'Ocean-Relevant Process Analogs');
assert.equal(samplingProcessModeLabel('randomRuleLab'), 'Rule Allocation Sandbox');
assert(FOUNDATIONAL_CA_MODELS.length >= 8, 'Foundational CA Models missing required entries');
assert(OCEAN_RELEVANT_PROCESS_ANALOGS.length >= 8, 'Ocean-Relevant Process Analogs missing required entries');
assert(OBSERVABLE_PROCESS_PATTERNS.length >= 14, 'Observable Process Patterns bridge metadata missing required entries');

const optionGroups = spatiotemporalProcessExampleOptions();
assert.deepEqual(optionGroups.map((group) => group.label), ['Foundational CA Models', 'Ocean-Relevant Process Analogs']);
assert(optionGroups[0].options.some((option) => option.label === "Conway's Game of Life"), 'Conway option missing');
assert(optionGroups[0].options.some((option) => option.label === 'Forest Fire'), 'Forest Fire option missing');
assert(optionGroups[1].options.some((option) => option.label === 'River Plume Front'), 'River Plume Front option missing');
assert(optionGroups[1].options.some((option) => option.label === 'Oil / Chemical Plume'), 'Oil / Chemical Plume option missing');

const foundationalHtml = samplingProcessConsoleHtml(baseState());
assert(foundationalHtml.includes('Deterministic Spatiotemporal Process Lab'), 'console title missing');
assert(foundationalHtml.includes('Foundational CA Models'), 'Foundational CA Models context missing');
assert(foundationalHtml.includes('Foundational CA Model'), 'Foundational CA Model selector label missing');
assert(foundationalHtml.includes('id="sampling-process-example-id"'), 'track-specific example selector missing');
assert(foundationalHtml.includes('id="roi-demo-reference-signature"'), 'hidden legacy reference selector missing');
assert(foundationalHtml.includes("Conway's Game of Life") || foundationalHtml.includes('Conway&#039;s Game of Life'), 'Conway visible option missing');
assert(foundationalHtml.includes('Rule Allocation Sandbox'), 'mode selector missing Rule Allocation Sandbox option');
assert(!foundationalHtml.includes('value="referenceSignature"'), 'legacy referenceSignature option leaked into visible mode selector');
assert(!foundationalHtml.includes('Diagnostics / Graph Inspection</option>'), 'Diagnostics visible mode leaked into selector');
assert(!foundationalHtml.includes('Example Track'), 'old Example Track selector leaked into normal UI');

const oceanHtml = samplingProcessConsoleHtml(baseState({
  processMode: 'oceanProcessAnalogs',
  processModeLabel: 'Ocean-Relevant Process Analogs',
  exampleTrack: 'oceanRelevantProcessAnalogs',
  exampleTrackLabel: 'Ocean-Relevant Process Analogs',
  exampleProcessId: 'riverPlumeFront',
  oceanProcessAnalogId: 'riverPlumeFront',
  foundationalCaModelId: null,
  exampleProcessLabel: 'River Plume Front',
  exampleType: 'oceanProcessAnalog',
  referenceSignatureId: 'frontPropagation',
  referenceSignature: referenceSignatureMetadata('frontPropagation')
}));
assert(oceanHtml.includes('Ocean Process Analog'), 'Ocean Process Analog selector label missing');
assert(oceanHtml.includes('River Plume Front'), 'ocean analog option missing');
assert(!oceanHtml.includes('Example Track'), 'old Example Track selector leaked into ocean UI');

const rightPanel = roiRecipeSignatureHtml(baseState({
  exampleProcessId: 'conwayGameOfLife',
  exampleProcessLabel: "Conway's Game of Life",
  exampleType: 'foundationalCaModel',
  spatiotemporalProcessExample: FOUNDATIONAL_CA_MODELS.find((entry) => entry.id === 'conwayGameOfLife'),
  referenceSignatureId: 'birthDeathEmergence',
  referenceSignature: referenceSignatureMetadata('birthDeathEmergence')
}));
assert(rightPanel.includes('Foundational CA Model'), 'right panel missing Foundational CA Model card');
assert(rightPanel.includes('Rule -&gt; Update Function') || rightPanel.includes('Rule -> Update Function'), 'right panel missing update-function card');
assert(rightPanel.includes('x_i(t+1)'), 'right panel missing local update notation');

const artifact = buildSamplingProcessDemoArtifactExport({
  ...baseState({ exampleProcessId: 'conwayGameOfLife', referenceSignatureId: 'birthDeathEmergence' }),
  referenceSignature: null,
  field: minimalField(),
  demoTime: 0,
  buildFrameAtTime: () => ({ fields: { displayedValue: [[0]], sampleValue: [[0]], eventLikelihood: [[0]], sourceField: [[0]] } })
});
assert.equal(artifact.demoName, 'Deterministic Spatiotemporal Process Lab');
assert.equal(artifact.legacyDemoName, 'Sample / ROI Field Demo');
assert.equal(artifact.referenceSignatureId, 'birthDeathEmergence');
assert.equal(artifact.exampleTrack, 'foundationalCaModels');
assert.equal(artifact.exampleProcessId, 'conwayGameOfLife');
assert.equal(artifact.exampleType, 'foundationalCaModel');
assert.equal(artifact.metadata.exampleProcessId, 'conwayGameOfLife');
assert.equal(artifact.metadata.referenceSignatureId, 'birthDeathEmergence');
assert(artifact.metadata.localUpdateFunction, 'export missing localUpdateFunction');

console.log('PASS deterministic spatiotemporal process lab contract smoke');

function baseState(overrides = {}) {
  return {
    title: SAMPLING_PROCESS_LAB_TITLE,
    processMode: 'foundationalCaModels',
    processModeLabel: 'Foundational CA Models',
    processStatusLabel: 'Example-Validated',
    patternSource: 'referenceSignature',
    exampleTrack: 'foundationalCaModels',
    exampleTrackLabel: 'Foundational CA Models',
    exampleProcessId: 'conwayGameOfLife',
    foundationalCaModelId: 'conwayGameOfLife',
    oceanProcessAnalogId: null,
    exampleProcessLabel: "Conway's Game of Life",
    exampleType: 'foundationalCaModel',
    referenceSignatureId: 'birthDeathEmergence',
    referenceSignature: referenceSignatureMetadata('birthDeathEmergence'),
    referenceSignatureModified: false,
    hasSection: (section) => ['mode', 'referenceSignature', 'display', 'seed', 'export'].includes(section),
    timeMode: 'dynamic',
    eventLikelihoodDynamics: 'dynamic',
    paused: false,
    eventLikelihood: 'gradientLikelihood',
    eventLikelihoodTemporalPattern: 'sustained',
    eventLikelihoodSpatialEvolution: 'expansion',
    spatialPattern: 'frontBoundary',
    valueDistribution: 'bimodalValues',
    temporalPattern: 'sustained',
    spatialEvolution: 'expansion',
    interactionScale: 'edge',
    stateModel: 'stateEvolving',
    depletionMode: 'hard',
    displayMode: 'nodeStates',
    legacyPresetsVisible: false,
    summaryRows: [],
    sourceSummaryRows: [],
    recipeChipRows: [],
    componentRecipe: {},
    recipeSummary: 'front recipe',
    compatibilityWarnings: [],
    ...overrides
  };
}

function minimalField() {
  return {
    width: 1,
    height: 1,
    field: [[0]],
    sampleValueField: [[0]],
    samplingValueField: [[0]],
    eventLikelihoodField: [[0]],
    sourceField: [[0]],
    stats: {},
    activityDiagnostics: {}
  };
}
