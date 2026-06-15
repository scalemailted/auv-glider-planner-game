export const SAMPLING_PROCESS_LAB_TITLE = 'Deterministic Spatiotemporal Process Lab';
export const SAMPLING_PROCESS_LAB_MENU_LABEL = 'Process Lab';
export const SAMPLING_PROCESS_LEGACY_DEMO_NAME = 'Sample / ROI Field Demo';
export const SAMPLING_PROCESS_EXPORT_TYPE = 'anchor.demo.sampling-process-field';
export const SAMPLING_PROCESS_LEGACY_EXPORT_TYPE = 'anchor.demo.sample-roi-field';
export const SAMPLING_PROCESS_SCENARIO_TYPE = 'anchor.syntheticSamplingProcessScenario';
export const SAMPLING_PROCESS_LEGACY_SCENARIO_TYPE = 'anchor.syntheticRoiScenario';
export const SAMPLING_PROCESS_RECIPE_TYPE = 'anchor.samplingProcessRecipe';

export const SAMPLING_PROCESS_MODES = [
  'foundationalCaModels',
  'oceanProcessAnalogs',
  'customComposer',
  'processPaint',
  'randomRuleLab',
  'diagnosticsGraphInspection'
];

export const SAMPLING_PROCESS_VISIBLE_MODES = [
  'foundationalCaModels',
  'oceanProcessAnalogs',
  'customComposer',
  'processPaint',
  'randomRuleLab'
];

export const SAMPLING_PROCESS_WORKFLOW_MODES = SAMPLING_PROCESS_VISIBLE_MODES;
export const SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE = 'sampleValue';

export const SAMPLING_PROCESS_STATUS_LABELS = [
  'Example-Validated',
  'Example-Modified',
  'Custom Exploratory',
  'Weak Pattern',
  'Invalid / Diagnostic Only'
];

export function normalizeSamplingProcessMode(value = 'foundationalCaModels') {
  const aliases = {
    reference: 'foundationalCaModels',
    referenceSignature: 'foundationalCaModels',
    exampleProcesses: 'foundationalCaModels',
    examples: 'foundationalCaModels',
    foundational: 'foundationalCaModels',
    foundationalCaModel: 'foundationalCaModels',
    foundationalCaModels: 'foundationalCaModels',
    ocean: 'oceanProcessAnalogs',
    oceanAnalog: 'oceanProcessAnalogs',
    oceanAnalogs: 'oceanProcessAnalogs',
    oceanProcessAnalog: 'oceanProcessAnalogs',
    oceanProcessAnalogs: 'oceanProcessAnalogs',
    oceanRelevantProcessAnalogs: 'oceanProcessAnalogs',
    custom: 'customComposer',
    customComposer: 'customComposer',
    processPaint: 'processPaint',
    paint: 'processPaint',
    random: 'randomRuleLab',
    randomRuleLab: 'randomRuleLab',
    diagnostics: 'diagnosticsGraphInspection',
    diagnosticsGraphInspection: 'diagnosticsGraphInspection'
  };
  const normalized = aliases[value] ?? value;
  return SAMPLING_PROCESS_MODES.includes(normalized) ? normalized : 'foundationalCaModels';
}

export function normalizeVisibleSamplingProcessMode(value = 'foundationalCaModels') {
  const normalized = normalizeSamplingProcessMode(value);
  return SAMPLING_PROCESS_VISIBLE_MODES.includes(normalized) ? normalized : 'foundationalCaModels';
}

export function isVisibleSamplingProcessMode(value) {
  return SAMPLING_PROCESS_VISIBLE_MODES.includes(normalizeSamplingProcessMode(value));
}

export function samplingProcessWorkflowModes() {
  return [...SAMPLING_PROCESS_VISIBLE_MODES];
}

export function samplingProcessModeLabel(value) {
  return {
    foundationalCaModels: 'Foundational CA Models',
    oceanProcessAnalogs: 'Ocean-Relevant Process Analogs',
    customComposer: 'Custom Composer',
    processPaint: 'Process Paint',
    randomRuleLab: 'Rule Allocation Sandbox',
    diagnosticsGraphInspection: 'Diagnostics / Graph Inspection'
  }[normalizeSamplingProcessMode(value)] ?? 'Foundational CA Models';
}

export function samplingProcessModeDescription(value) {
  return {
    foundationalCaModels: 'Choose a well-known cellular automaton or grid-process teaching model.',
    oceanProcessAnalogs: 'Choose a simplified environmental process analog for later flow, uncertainty, and mission coupling.',
    customComposer: 'Custom Exploratory global component editing without reference validation.',
    processPaint: 'Non-uniform CA-style cell, group, state, and rule allocation editor.',
    randomRuleLab: 'Seeded non-uniform rule allocation sandbox.',
    diagnosticsGraphInspection: 'Internal compatibility route for opening diagnostics; diagnostics now lives in Display / Diagnostic Layer and the right-panel Diagnostics view.'
  }[normalizeSamplingProcessMode(value)] ?? 'Guided process mode.';
}

export function samplingProcessStatusLabel({
  mode = 'foundationalCaModels',
  patternSource = 'referenceSignature',
  modified = false,
  validationStatus = 'PASS',
  hasMeaningfulStructure = true
} = {}) {
  if (validationStatus === 'FAIL' || !hasMeaningfulStructure) return 'Invalid / Diagnostic Only';
  if (validationStatus === 'WARN') return 'Weak Pattern';
  if (!['foundationalCaModels', 'oceanProcessAnalogs'].includes(normalizeSamplingProcessMode(mode)) || patternSource !== 'referenceSignature') return 'Custom Exploratory';
  if (modified) return 'Example-Modified';
  return 'Example-Validated';
}

export function samplingProcessStatusDisplayLabel(status) {
  return {
    'Pattern-Validated': 'Example-Validated',
    'Pattern-Modified': 'Example-Modified',
    'Weak Signature': 'Weak Pattern'
  }[status] ?? status;
}

export function sourceFieldBoundaryNote() {
  return 'Source / Initial Field is a deterministic or seeded process substrate. Same recipe + same seed + same initial state -> same evolution. It is not uncertainty, belief, forecast probability, or Bayesian likelihood. Formal likelihood, posterior uncertainty, and information gain belong in the Uncertainty / Forecast Demo.';
}