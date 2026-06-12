import { CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID } from '../SampleFieldBehaviorPresets.js';
import { CUSTOM_REFERENCE_SIGNATURE_ID, normalizeReferenceSignatureId } from '../roi/RoiReferenceSignatures.js';
import {
  SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE,
  isVisibleSamplingProcessMode,
  normalizeSamplingProcessMode,
  normalizeVisibleSamplingProcessMode
} from './SamplingProcessTerminology.js';
import { samplingProcessRightPanelDefault } from './SamplingProcessUiConfig.js';

export const DEFAULT_SAMPLING_PROCESS_REFERENCE_SIGNATURE_ID = 'stationaryTemporalBursts';

export function buildSamplingProcessModePatch(context = {}, nextMode = 'referenceSignature') {
  const mode = normalizeSamplingProcessMode(nextMode);
  if (mode === 'referenceSignature') return buildReferenceSignatureEntryPatch(context);
  if (mode === 'customComposer') return buildCustomComposerPatch(context);
  if (mode === 'processPaint') return buildProcessPaintEntryPatch(context);
  if (mode === 'randomRuleLab') return buildRandomRuleLabEntryPatch(context);
  if (mode === 'diagnosticsGraphInspection') return migrateDiagnosticsProcessMode(context);
  return buildReferenceSignatureEntryPatch(context);
}

export function buildPatternSourcePatch(context = {}, nextPatternSource = 'referenceSignature') {
  return nextPatternSource === 'custom'
    ? buildCustomComposerPatch(context)
    : buildReferenceSignatureEntryPatch(context);
}

export function buildReferenceSignaturePatch(context = {}, referenceSignatureId = null) {
  const signatureId = normalizeReferenceSignatureId(referenceSignatureId ?? context.referenceSignatureId ?? DEFAULT_SAMPLING_PROCESS_REFERENCE_SIGNATURE_ID);
  return {
    ...referenceSignatureInvariantPatch(signatureId),
    selectedHelpTopic: null,
    demoTime: 0
  };
}

export function buildReferenceSignatureEntryPatch(context = {}) {
  const signatureId = normalizeReferenceSignatureId(
    context.referenceSignatureId && context.referenceSignatureId !== CUSTOM_REFERENCE_SIGNATURE_ID
      ? context.referenceSignatureId
      : DEFAULT_SAMPLING_PROCESS_REFERENCE_SIGNATURE_ID
  );
  return {
    ...referenceSignatureInvariantPatch(signatureId),
    selectedCell: null,
    selectedHelpTopic: null,
    demoTime: 0
  };
}

export function buildCustomComposerPatch(_context = {}) {
  return {
    processMode: 'customComposer',
    patternSource: 'custom',
    behaviorPresetId: CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
    behaviorPresetModified: false,
    referenceSignatureId: CUSTOM_REFERENCE_SIGNATURE_ID,
    referenceSignatureModified: false,
    updateRuleHint: null,
    modifiedComponent: null,
    selectedCell: null,
    rightPanelMode: 'recipeSignature',
    displayMode: SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE,
    selectedHelpTopic: null,
    paused: false,
    processPaintRunStarted: false,
    demoTime: 0
  };
}

export function buildProcessPaintEntryPatch(context = {}) {
  return {
    processMode: 'processPaint',
    patternSource: 'custom',
    behaviorPresetId: CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
    behaviorPresetModified: false,
    referenceSignatureId: CUSTOM_REFERENCE_SIGNATURE_ID,
    referenceSignatureModified: false,
    updateRuleHint: null,
    modifiedComponent: null,
    paintModel: context.blankPaintModel,
    paintStartMode: 'blankCanvas',
    processPaintRunStarted: false,
    paused: true,
    demoTime: 0,
    displayMode: 'nodeStates',
    selectedCell: null,
    rightPanelMode: 'paintTools',
    selectedHelpTopic: null
  };
}

export function buildRandomRuleLabEntryPatch(context = {}) {
  return {
    processMode: 'randomRuleLab',
    patternSource: 'custom',
    behaviorPresetId: CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
    behaviorPresetModified: false,
    referenceSignatureId: CUSTOM_REFERENCE_SIGNATURE_ID,
    referenceSignatureModified: false,
    updateRuleHint: null,
    modifiedComponent: null,
    selectedCell: null,
    rightPanelMode: samplingProcessRightPanelDefault('randomRuleLab'),
    displayMode: SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE,
    selectedHelpTopic: null,
    paused: false,
    processPaintRunStarted: false,
    ...(context.paintModel ? { paintModel: context.paintModel } : {}),
    ...(context.paintStartMode ? { paintStartMode: context.paintStartMode } : {})
  };
}

export function buildDiagnosticsEntryPatch(context = {}) {
  return migrateDiagnosticsProcessMode(context);
}

export function migrateDiagnosticsProcessMode(context = {}) {
  const activeMode = [
    context.previousProcessMode,
    context.activeWorkflowMode,
    context.workflowMode,
    context.processMode
  ].find((mode) => mode != null && isVisibleSamplingProcessMode(mode));
  const processMode = normalizeVisibleSamplingProcessMode(activeMode);
  const basePatch = {
    referenceSignature: buildReferenceSignatureEntryPatch,
    customComposer: buildCustomComposerPatch,
    processPaint: buildProcessPaintEntryPatch,
    randomRuleLab: buildRandomRuleLabEntryPatch
  }[processMode]?.(context) ?? buildReferenceSignatureEntryPatch(context);
  return {
    ...basePatch,
    processMode,
    rightPanelMode: 'diagnostics',
    displayMode: 'diagnosticsOverlay',
    selectedCell: context.selectedCell ?? null,
    paused: processMode === 'processPaint' ? context.paused ?? true : false,
    processPaintRunStarted: false
  };
}

export function buildProcessPaintSelectionPatch(context = {}, patch = {}) {
  return {
    selectedPaintState: patch.state ?? context.selectedPaintState,
    selectedPaintRuleId: patch.ruleId ?? context.selectedPaintRuleId,
    selectedPaintGroupId: patch.groupId ?? context.selectedPaintGroupId,
    selectedPaintSourceValue: patch.sourceValue ?? context.selectedPaintSourceValue,
    processMode: 'processPaint',
    patternSource: 'custom',
    referenceSignatureId: CUSTOM_REFERENCE_SIGNATURE_ID,
    referenceSignatureModified: false,
    updateRuleHint: null,
    demoTime: context.demoTime ?? 0
  };
}

export function buildRandomizedAllocationPatch(context = {}, allocation = {}, patch = {}) {
  const keepProcessPaint = Boolean(patch.keepProcessPaint);
  return {
    processMode: keepProcessPaint ? 'processPaint' : 'randomRuleLab',
    patternSource: 'custom',
    behaviorPresetId: CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
    behaviorPresetModified: false,
    referenceSignatureId: CUSTOM_REFERENCE_SIGNATURE_ID,
    referenceSignatureModified: false,
    updateRuleHint: null,
    paintModel: allocation.model,
    paintStartMode: 'seededRandomCanvas',
    processPaintRunStarted: false,
    paused: keepProcessPaint,
    randomRuleSeed: patch.seed ?? context.randomRuleSeed,
    randomRuleMode: patch.mode ?? context.randomRuleMode,
    randomRuleGroupCount: patch.groupCount ?? context.randomRuleGroupCount,
    randomRuleActiveFraction: patch.activeFraction ?? context.randomRuleActiveFraction,
    selectedCell: null,
    rightPanelMode: keepProcessPaint ? 'paintTools' : samplingProcessRightPanelDefault('randomRuleLab'),
    displayMode: keepProcessPaint ? context.displayMode : SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE,
    demoTime: 0
  };
}

export function samplingProcessModeInvariants(mode = 'referenceSignature') {
  return buildSamplingProcessModePatch({}, mode);
}

export function validateSamplingProcessModeState(state = {}) {
  const mode = normalizeSamplingProcessMode(state.processMode);
  const failures = [];
  if (mode === 'referenceSignature' && state.patternSource !== 'referenceSignature') failures.push('referenceSignature mode requires patternSource=referenceSignature');
  if (mode === 'customComposer' && state.patternSource !== 'custom') failures.push('customComposer mode requires patternSource=custom');
  if (mode === 'processPaint') {
    if (state.patternSource !== 'custom') failures.push('processPaint mode requires patternSource=custom');
    if (state.paused !== true) failures.push('processPaint mode should enter paused editing state');
    if (!['paintTools', 'cellInspector', 'diagnostics', 'behaviorHelp'].includes(state.rightPanelMode)) failures.push('processPaint mode requires a Process Paint-compatible rightPanelMode');
    if (state.processPaintRunStarted !== false) failures.push('processPaint mode should clear processPaintRunStarted on entry');
  }
  if ((mode === 'customComposer' || mode === 'randomRuleLab') && state.paused === true) failures.push(`${mode} should not inherit paused=true from Process Paint`);
  if (mode === 'randomRuleLab' && state.rightPanelMode === 'paintTools') failures.push('randomRuleLab must not use paintTools panel');
  if (mode === 'diagnosticsGraphInspection' && state.rightPanelMode !== 'diagnostics') failures.push('diagnosticsGraphInspection requires rightPanelMode=diagnostics');
  return {
    status: failures.length ? 'FAIL' : 'PASS',
    failures,
    mode
  };
}

export function processModeFromPatternSource(patternSource) {
  if (patternSource === 'custom' || patternSource === 'legacyPreset') return 'customComposer';
  return 'referenceSignature';
}

function referenceSignatureInvariantPatch(signatureId) {
  const id = signatureId === CUSTOM_REFERENCE_SIGNATURE_ID ? DEFAULT_SAMPLING_PROCESS_REFERENCE_SIGNATURE_ID : signatureId;
  return {
    processMode: 'referenceSignature',
    patternSource: 'referenceSignature',
    referenceSignatureId: id,
    referenceSignatureModified: false,
    behaviorPresetId: CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
    behaviorPresetModified: false,
    selectedCell: null,
    rightPanelMode: 'recipeSignature',
    paused: false,
    processPaintRunStarted: false,
    displayMode: SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE
  };
}

function isGraphDiagnosticDisplayMode(value) {
  return ['graphTopology', 'graphCommunities', 'nodeStates', 'graphMessages', 'communityMessages', 'stateTransitions', 'roiMeaning', 'diagnosticsOverlay'].includes(value);
}
