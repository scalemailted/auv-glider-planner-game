export const SAMPLING_PROCESS_LAB_TITLE = 'Spatiotemporal Sampling Process Lab';
export const SAMPLING_PROCESS_LAB_MENU_LABEL = 'Sampling Process Lab';
export const SAMPLING_PROCESS_LEGACY_DEMO_NAME = 'Sample / ROI Field Demo';
export const SAMPLING_PROCESS_EXPORT_TYPE = 'anchor.demo.sampling-process-field';
export const SAMPLING_PROCESS_LEGACY_EXPORT_TYPE = 'anchor.demo.sample-roi-field';
export const SAMPLING_PROCESS_SCENARIO_TYPE = 'anchor.syntheticSamplingProcessScenario';
export const SAMPLING_PROCESS_LEGACY_SCENARIO_TYPE = 'anchor.syntheticRoiScenario';
export const SAMPLING_PROCESS_RECIPE_TYPE = 'anchor.samplingProcessRecipe';

export const SAMPLING_PROCESS_MODES = [
  'referenceSignature',
  'customComposer',
  'processPaint',
  'randomRuleLab',
  'diagnosticsGraphInspection'
];

export const SAMPLING_PROCESS_VISIBLE_MODES = [
  'referenceSignature',
  'customComposer',
  'processPaint',
  'randomRuleLab'
];

export const SAMPLING_PROCESS_WORKFLOW_MODES = SAMPLING_PROCESS_VISIBLE_MODES;
export const SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE = 'sampleValue';

export const SAMPLING_PROCESS_STATUS_LABELS = [
  'Pattern-Validated',
  'Pattern-Modified',
  'Custom Exploratory',
  'Weak Pattern',
  'Invalid / Diagnostic Only'
];

export function normalizeSamplingProcessMode(value = 'referenceSignature') {
  const aliases = {
    reference: 'referenceSignature',
    referenceSignature: 'referenceSignature',
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
  return SAMPLING_PROCESS_MODES.includes(normalized) ? normalized : 'referenceSignature';
}

export function normalizeVisibleSamplingProcessMode(value = 'referenceSignature') {
  const normalized = normalizeSamplingProcessMode(value);
  return SAMPLING_PROCESS_VISIBLE_MODES.includes(normalized) ? normalized : 'referenceSignature';
}

export function isVisibleSamplingProcessMode(value) {
  return SAMPLING_PROCESS_VISIBLE_MODES.includes(normalizeSamplingProcessMode(value));
}

export function samplingProcessWorkflowModes() {
  return [...SAMPLING_PROCESS_VISIBLE_MODES];
}

export function samplingProcessModeLabel(value) {
  return {
    referenceSignature: 'Example Processes',
    customComposer: 'Custom Composer',
    processPaint: 'Process Paint',
    randomRuleLab: 'Random Rule Lab',
    diagnosticsGraphInspection: 'Diagnostics / Graph Inspection'
  }[normalizeSamplingProcessMode(value)] ?? 'Example Processes';
}

export function samplingProcessModeDescription(value) {
  return {
    referenceSignature: 'Choose a simplified CA/grid-process-inspired example and load its editable recipe.',
    customComposer: 'Custom Exploratory global component editing without reference validation.',
    processPaint: 'Non-uniform CA-style cell, group, state, and rule allocation editor.',
    randomRuleLab: 'Seeded random state/rule/group allocation sandbox.',
    diagnosticsGraphInspection: 'Internal compatibility route for opening diagnostics; diagnostics now lives in Display / Diagnostic Layer and the right-panel Diagnostics view.'
  }[normalizeSamplingProcessMode(value)] ?? 'Guided process mode.';
}

export function samplingProcessStatusLabel({
  mode = 'referenceSignature',
  patternSource = 'referenceSignature',
  modified = false,
  validationStatus = 'PASS',
  hasMeaningfulStructure = true
} = {}) {
  if (validationStatus === 'FAIL' || !hasMeaningfulStructure) return 'Invalid / Diagnostic Only';
  if (validationStatus === 'WARN') return 'Weak Pattern';
  if (normalizeSamplingProcessMode(mode) !== 'referenceSignature' || patternSource !== 'referenceSignature') return 'Custom Exploratory';
  if (modified) return 'Pattern-Modified';
  return 'Pattern-Validated';
}

export function sourceFieldBoundaryNote() {
  return 'Source / Initial Field is a deterministic or seeded process substrate, not uncertainty, belief, forecast probability, or Bayesian likelihood. Forecast probability and information gain belong in the Uncertainty / Forecast Demo.';
}
