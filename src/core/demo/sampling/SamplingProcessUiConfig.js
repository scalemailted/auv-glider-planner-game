import { normalizeSamplingProcessMode } from './SamplingProcessTerminology.js';

export const SAMPLING_PROCESS_SECTION_IDS = [
  'mode',
  'referenceSignature',
  'sourceField',
  'spatialPattern',
  'valueDistribution',
  'temporalPattern',
  'spatialEvolution',
  'interactionScale',
  'stateUpdateRule',
  'samplingEffect',
  'processPaintTools',
  'randomRuleLab',
  'display',
  'graphFilters',
  'nodeFilters',
  'messageFilters',
  'transitionFilters',
  'seed',
  'componentExamples',
  'export',
  'scenarioGeneration'
];

const FULL_COMPOSER_SECTIONS = [
  'sourceField',
  'spatialPattern',
  'valueDistribution',
  'temporalPattern',
  'spatialEvolution',
  'interactionScale',
  'stateUpdateRule',
  'samplingEffect'
];

export const SAMPLING_PROCESS_MODE_UI = {
  referenceSignature: {
    description: 'Guided process-pattern workflow with a compact left HUD.',
    leftSections: ['mode', 'referenceSignature', 'display', 'seed', 'export'],
    advancedSections: ['editLoadedRecipe'],
    rightPanelDefault: 'recipeSignature',
    selectedCellPanel: 'cellInspector'
  },
  customComposer: {
    description: 'Full component composer for source, geometry, value, timing, evolution, state, and sampling controls.',
    leftSections: ['mode', ...FULL_COMPOSER_SECTIONS, 'display', 'seed', 'componentExamples', 'export', 'scenarioGeneration'],
    advancedSections: [],
    rightPanelDefault: 'recipeSignature',
    selectedCellPanel: 'cellInspector'
  },
  processPaint: {
    description: 'Non-uniform Process Paint workflow with brush controls and compact diagnostics.',
    leftSections: ['mode', 'processPaintTools', 'display', 'seed', 'export'],
    advancedSections: [],
    rightPanelDefault: 'paintTools',
    selectedCellPanel: 'paintCellEditor'
  },
  randomRuleLab: {
    description: 'Seeded random process-rule allocation workflow.',
    leftSections: ['mode', 'randomRuleLab', 'display', 'seed', 'export'],
    advancedSections: [],
    rightPanelDefault: 'recipeSignature',
    selectedCellPanel: 'cellInspector'
  },
  diagnosticsGraphInspection: {
    description: 'Internal compatibility view route; visible diagnostics live in Display / Diagnostic Layer and the right-panel Diagnostics tab.',
    internal: true,
    leftSections: ['mode', 'display', 'graphFilters', 'nodeFilters', 'messageFilters', 'transitionFilters', 'export'],
    advancedSections: [],
    rightPanelDefault: 'diagnostics',
    selectedCellPanel: 'cellInspector'
  }
};

export function samplingProcessUiConfig(mode = 'referenceSignature') {
  return SAMPLING_PROCESS_MODE_UI[normalizeSamplingProcessMode(mode)] ?? SAMPLING_PROCESS_MODE_UI.referenceSignature;
}

export function samplingProcessModeSections(mode = 'referenceSignature') {
  return [...samplingProcessUiConfig(mode).leftSections];
}

export function samplingProcessModeHasSection(mode, sectionId) {
  return samplingProcessModeSections(mode).includes(sectionId);
}

export function samplingProcessRightPanelDefault(mode = 'referenceSignature') {
  return samplingProcessUiConfig(mode).rightPanelDefault;
}
