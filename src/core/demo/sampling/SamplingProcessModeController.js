import { CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID } from '../SampleFieldBehaviorPresets.js';
import { CUSTOM_REFERENCE_SIGNATURE_ID, normalizeReferenceSignatureId } from '../roi/RoiReferenceSignatures.js';
import {
  processModeForSpatiotemporalProcessExampleTrack,
  resolveActiveSpatiotemporalProcessExample,
  spatiotemporalProcessExampleTrackForMode
} from './SpatiotemporalProcessExamples.js';
import {
  SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE,
  isVisibleSamplingProcessMode,
  normalizeSamplingProcessMode,
  normalizeVisibleSamplingProcessMode
} from './SamplingProcessTerminology.js';
import { samplingProcessRightPanelDefault } from './SamplingProcessUiConfig.js';

export const DEFAULT_SAMPLING_PROCESS_REFERENCE_SIGNATURE_ID = 'birthDeathEmergence';
export const DEFAULT_SAMPLING_PROCESS_EXAMPLE_TRACK = 'foundationalCaModels';
export const DEFAULT_SAMPLING_PROCESS_EXAMPLE_ID = 'conwayGameOfLife';

export function buildSamplingProcessModePatch(context = {}, nextMode = 'foundationalCaModels') {
  const mode = normalizeSamplingProcessMode(nextMode);
  if (isProcessExampleMode(mode)) return buildProcessExampleEntryPatch(context, mode);
  if (mode === 'customComposer') return buildCustomComposerPatch(context);
  if (mode === 'processPaint') return buildProcessPaintEntryPatch(context);
  if (mode === 'randomRuleLab') return buildRandomRuleLabEntryPatch(context);
  if (mode === 'diagnosticsGraphInspection') return migrateDiagnosticsProcessMode(context);
  return buildProcessExampleEntryPatch(context, 'foundationalCaModels');
}

export function buildPatternSourcePatch(context = {}, nextPatternSource = 'referenceSignature') {
  return nextPatternSource === 'custom'
    ? buildCustomComposerPatch(context)
    : buildProcessExampleEntryPatch(context, processExampleModeForContext(context));
}

export function buildReferenceSignaturePatch(context = {}, referenceSignatureId = null) {
  const mode = processExampleModeForContext(context);
  const track = spatiotemporalProcessExampleTrackForMode(mode) ?? DEFAULT_SAMPLING_PROCESS_EXAMPLE_TRACK;
  const active = resolveActiveSpatiotemporalProcessExample({
    exampleTrack: track,
    exampleProcessId: referenceSignatureId ?? context.exampleProcessId ?? DEFAULT_SAMPLING_PROCESS_EXAMPLE_ID,
    foundationalCaModelId: context.foundationalCaModelId,
    oceanProcessAnalogId: context.oceanProcessAnalogId,
    referenceSignatureId: context.referenceSignatureId,
    patternSource: 'referenceSignature',
    processMode: mode,
    exampleProcessModified: false,
    referenceSignatureModified: false
  });
  const signatureId = normalizeReferenceSignatureId(active.referenceSignatureId ?? DEFAULT_SAMPLING_PROCESS_REFERENCE_SIGNATURE_ID);
  const processMode = processModeForSpatiotemporalProcessExampleTrack(active.exampleTrack ?? track);
  return {
    ...referenceSignatureInvariantPatch(signatureId, processMode),
    exampleTrack: active.exampleTrack,
    exampleProcessId: active.exampleProcessId,
    foundationalCaModelId: active.foundationalCaModelId,
    oceanProcessAnalogId: active.oceanProcessAnalogId,
    exampleProcessModified: false,
    selectedHelpTopic: null,
    demoTime: 0
  };
}

export function buildReferenceSignatureEntryPatch(context = {}) {
  return buildProcessExampleEntryPatch(context, processExampleModeForContext(context));
}

export function buildProcessExampleEntryPatch(context = {}, mode = 'foundationalCaModels') {
  const processMode = normalizeSamplingProcessMode(mode);
  const track = spatiotemporalProcessExampleTrackForMode(processMode) ?? DEFAULT_SAMPLING_PROCESS_EXAMPLE_TRACK;
  const trackSpecificId = track === 'oceanRelevantProcessAnalogs'
    ? context.oceanProcessAnalogId
    : context.foundationalCaModelId;
  const active = resolveActiveSpatiotemporalProcessExample({
    exampleTrack: track,
    exampleProcessId: context.exampleProcessId && context.exampleProcessId !== CUSTOM_REFERENCE_SIGNATURE_ID
      ? context.exampleProcessId
      : trackSpecificId ?? DEFAULT_SAMPLING_PROCESS_EXAMPLE_ID,
    foundationalCaModelId: context.foundationalCaModelId,
    oceanProcessAnalogId: context.oceanProcessAnalogId,
    referenceSignatureId: context.referenceSignatureId,
    patternSource: 'referenceSignature',
    processMode,
    exampleProcessModified: false,
    referenceSignatureModified: false
  });
  const signatureId = normalizeReferenceSignatureId(active.referenceSignatureId ?? DEFAULT_SAMPLING_PROCESS_REFERENCE_SIGNATURE_ID);
  return {
    ...referenceSignatureInvariantPatch(signatureId, processMode),
    exampleTrack: active.exampleTrack,
    exampleProcessId: active.exampleProcessId,
    foundationalCaModelId: active.foundationalCaModelId,
    oceanProcessAnalogId: active.oceanProcessAnalogId,
    exampleProcessModified: false,
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
    exampleTrack: null,
    exampleProcessId: null,
    foundationalCaModelId: null,
    oceanProcessAnalogId: null,
    exampleProcessModified: false,
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
    exampleTrack: null,
    exampleProcessId: null,
    foundationalCaModelId: null,
    oceanProcessAnalogId: null,
    exampleProcessModified: false,
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
    exampleTrack: null,
    exampleProcessId: null,
    foundationalCaModelId: null,
    oceanProcessAnalogId: null,
    exampleProcessModified: false,
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
    foundationalCaModels: (ctx) => buildProcessExampleEntryPatch(ctx, 'foundationalCaModels'),
    oceanProcessAnalogs: (ctx) => buildProcessExampleEntryPatch(ctx, 'oceanProcessAnalogs'),
    customComposer: buildCustomComposerPatch,
    processPaint: buildProcessPaintEntryPatch,
    randomRuleLab: buildRandomRuleLabEntryPatch
  }[processMode]?.(context) ?? buildProcessExampleEntryPatch(context, 'foundationalCaModels');
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
    exampleTrack: null,
    exampleProcessId: null,
    foundationalCaModelId: null,
    oceanProcessAnalogId: null,
    exampleProcessModified: false,
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
    exampleTrack: null,
    exampleProcessId: null,
    foundationalCaModelId: null,
    oceanProcessAnalogId: null,
    exampleProcessModified: false,
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

export function samplingProcessModeInvariants(mode = 'foundationalCaModels') {
  return buildSamplingProcessModePatch({}, mode);
}

export function validateSamplingProcessModeState(state = {}) {
  const mode = normalizeSamplingProcessMode(state.processMode);
  const failures = [];
  if (isProcessExampleMode(mode) && state.patternSource !== 'referenceSignature') failures.push(`${mode} requires patternSource=referenceSignature`);
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
  return 'foundationalCaModels';
}

function referenceSignatureInvariantPatch(signatureId, processMode = 'foundationalCaModels') {
  const id = signatureId === CUSTOM_REFERENCE_SIGNATURE_ID ? DEFAULT_SAMPLING_PROCESS_REFERENCE_SIGNATURE_ID : signatureId;
  return {
    processMode,
    patternSource: 'referenceSignature',
    referenceSignatureId: id,
    referenceSignatureModified: false,
    behaviorPresetId: CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
    behaviorPresetModified: false,
    selectedCell: null,
    rightPanelMode: 'recipeSignature',
    paused: false,
    processPaintRunStarted: false,
    displayMode: defaultProcessDisplayMode(processMode)
  };
}

function defaultProcessDisplayMode(processMode) {
  if (processMode === 'processPaint' || processMode === 'randomRuleLab') return 'processStateView';
  if (processMode === 'oceanProcessAnalogs') return 'processRuleMetric';
  if (processMode === 'foundationalCaModels') return 'processTransitionView';
  return SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE;
}

function processExampleModeForContext(context = {}, fallback = 'foundationalCaModels') {
  const mode = normalizeSamplingProcessMode(context.processMode ?? fallback);
  if (isProcessExampleMode(mode)) return mode;
  const trackMode = processModeForSpatiotemporalProcessExampleTrack(context.exampleTrack ?? DEFAULT_SAMPLING_PROCESS_EXAMPLE_TRACK);
  return isProcessExampleMode(trackMode) ? trackMode : fallback;
}

function isProcessExampleMode(mode) {
  return mode === 'foundationalCaModels' || mode === 'oceanProcessAnalogs';
}

function isGraphDiagnosticDisplayMode(value) {
  return ['graphTopology', 'graphCommunities', 'nodeStates', 'graphMessages', 'communityMessages', 'stateTransitions', 'roiMeaning', 'diagnosticsOverlay'].includes(value);
}