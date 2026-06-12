import {
  samplingProcessConsoleHtml,
  samplingProcessSectionHtml
} from '../../src/ui/sampling/SamplingProcessConsoleSections.js';
import {
  SAMPLING_PROCESS_MODES,
  SAMPLING_PROCESS_VISIBLE_MODES
} from '../../src/core/demo/sampling/SamplingProcessTerminology.js';
import {
  SAMPLING_PROCESS_SECTION_IDS,
  samplingProcessModeSections
} from '../../src/core/demo/sampling/SamplingProcessUiConfig.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const baseState = {
  title: 'Spatiotemporal Sampling Process Lab',
  status: 'Demo running',
  paused: false,
  patternSource: 'referenceSignature',
  referenceSignatureId: 'propagatingFronts',
  behaviorPresetId: 'movingHotspot',
  eventLikelihood: 'multiModal',
  spatialPattern: 'clustered',
  valueDistribution: 'gaussianNormal',
  temporalPattern: 'periodic',
  spatialEvolution: 'continuousDrift',
  likelihoodDynamics: 'moving',
  motionScope: 'perFeature',
  interactionScale: 'localNeighborhood',
  stateModel: 'timeIndexed',
  depletionMode: 'recovering',
  displayMode: 'sampleWithLikelihoodOverlay',
  roiMeaningLayer: 'sampleValue',
  dynamicComplexity: 'medium',
  clusterCount: 3,
  clusterSize: 'medium',
  timeMode: 'loop',
  timeSpeed: 1,
  temporalBehavior: 'periodic',
  seed: 'section-smoke',
  demoTime: 12,
  stats: { min: 0, max: 1, mean: 0.42, highFraction: 0.18 },
  fieldStats: { min: 0, max: 1, mean: 0.42, highFraction: 0.18 },
  exportMode: 'timeWindow',
  exportStartTime: 0,
  exportEndTime: 24,
  exportFrameCount: 5,
  graphFilters: {
    nodeStates: ['active', 'candidate'],
    messageTypes: ['activation', 'suppression'],
    messageThreshold: 0.15,
    transitionOnly: true
  },
  paintValidation: { paintedCellCount: 4, groupCount: 2, status: 'PASS' },
  randomRuleSummary: {
    ruleCount: 3,
    activeRuleCount: 2,
    seed: 'random-rule-smoke'
  },
  scenarioSummary: {
    validationStatus: 'PASS',
    family: 'propagatingFronts',
    frameCount: 5,
    duration: 24,
    validationSummary: 'Representative scenario passes smoke validation.',
    observablePattern: 'front-like propagation',
    meanActiveFraction: 0.25,
    meanHighValueFraction: 0.12,
    meanFrameDelta: 0.08,
    processClass: 'reference',
    roiInterpretation: 'synthetic sampling process'
  }
};

function stateForMode(processMode) {
  return {
    ...baseState,
    processMode,
    patternSource: processMode === 'customComposer' ? 'custom' : 'referenceSignature'
  };
}

function assertIncludes(html, needle, message) {
  assert(html.includes(needle), message);
}

function assertExcludes(html, needle, message) {
  assert(!html.includes(needle), message);
}

function numberedHeadings(html) {
  return [...html.matchAll(/<h2[^>]*>\s*(\d+)\.\s*([^<]+)/g)]
    .map((match) => ({ number: match[1], label: match[2].trim() }));
}

for (const mode of SAMPLING_PROCESS_MODES) {
  const html = samplingProcessConsoleHtml(stateForMode(mode));
  assert(html.includes('Spatiotemporal Sampling Process Lab'), `${mode} missing lab title`);
  assert(html.includes('data-sampling-section="mode"'), `${mode} missing mode section`);
  const headings = numberedHeadings(html);
  assert(headings.length === 0, `${mode} should not render numeric heading prefixes`);
  const duplicates = headings.filter((heading, index) => headings.findIndex((candidate) => candidate.number === heading.number) !== index);
  assert(duplicates.length === 0, `${mode} has duplicate numbered headings: ${duplicates.map((heading) => `${heading.number}. ${heading.label}`).join(', ')}`);
}

for (const sectionId of SAMPLING_PROCESS_SECTION_IDS) {
  const ownerMode = SAMPLING_PROCESS_MODES.find((mode) => samplingProcessModeSections(mode).includes(sectionId));
  assert(ownerMode, `no mode owns section ${sectionId}`);
  if (!ownerMode) continue;
  const html = samplingProcessSectionHtml(sectionId, stateForMode(ownerMode));
  assert(typeof html === 'string' && html.trim().length > 0, `${sectionId} did not render for ${ownerMode}`);
}

const referenceHtml = samplingProcessConsoleHtml(stateForMode('referenceSignature'));
assert(SAMPLING_PROCESS_VISIBLE_MODES.length === 4, 'visible workflow mode list should contain four modes');
assertExcludes(referenceHtml, 'value="diagnosticsGraphInspection"', 'visible mode selector should not expose diagnostics mode');
assertExcludes(referenceHtml, 'id="roi-demo-pattern-source"', 'reference mode should not show Pattern Source dropdown');
assertExcludes(referenceHtml, 'data-roi-help="behaviorPreset"', 'reference mode should not show selected-pattern Explain button');
assertIncludes(referenceHtml, 'id="roi-demo-reference-signature"', 'reference mode missing reference selector');
assertExcludes(referenceHtml, 'data-sampling-section="sourceField"', 'reference mode should not show source field composer controls');
assertExcludes(referenceHtml, 'data-sampling-section="valueDistribution"', 'reference mode should not show value distribution composer controls');

const customHtml = samplingProcessConsoleHtml(stateForMode('customComposer'));
assertIncludes(customHtml, 'Source / Initial Field', 'custom composer missing source field controls');
assertIncludes(customHtml, 'Value Distribution', 'custom composer missing value distribution controls');
assertIncludes(customHtml, 'Scenario Generation', 'custom composer missing scenario generation controls');
assertIncludes(customHtml, 'id="roi-demo-event-likelihood"', 'custom composer missing event likelihood selector');

const paintHtml = samplingProcessConsoleHtml(stateForMode('processPaint'));
assertIncludes(paintHtml, 'Process Paint / Rule Allocation', 'process paint missing paint tools');
assertIncludes(paintHtml, 'data-action="sampling-paint-clear"', 'process paint missing clear action');
assertIncludes(paintHtml, 'data-action="sampling-paint-run"', 'process paint missing run action');
assertExcludes(paintHtml, 'id="roi-demo-event-likelihood"', 'process paint should not show event likelihood composer selector');
assertExcludes(paintHtml, 'data-sampling-section="valueDistribution"', 'process paint should not show value distribution composer controls');

const randomHtml = samplingProcessConsoleHtml(stateForMode('randomRuleLab'));
assertIncludes(randomHtml, 'Random Rule Lab', 'random rule lab missing section');
assertIncludes(randomHtml, 'id="sampling-random-seed"', 'random rule lab missing seed control');
assertExcludes(randomHtml, 'id="sampling-paint-state"', 'random rule lab should not show paint state selector');

const diagnosticsHtml = samplingProcessConsoleHtml(stateForMode('diagnosticsGraphInspection'));
assertIncludes(diagnosticsHtml, 'id="roi-filter-message-threshold"', 'diagnostics missing message threshold filter');
assertIncludes(diagnosticsHtml, 'id="roi-filter-transition-only"', 'diagnostics missing transition-only filter');
assertExcludes(diagnosticsHtml, 'data-sampling-section="sourceField"', 'diagnostics should not show source field composer controls');

if (failures.length) {
  console.error('Sampling process console sections smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Sampling process console sections smoke passed (${SAMPLING_PROCESS_MODES.length} modes, ${SAMPLING_PROCESS_SECTION_IDS.length} sections)`);
