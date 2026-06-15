import {
  roiClusterSizeLabel,
  roiDepletionModeLabel,
  roiDisplayModeCaption,
  roiDisplayModeLabel,
  roiEventLikelihoodLabel,
  roiEvolutionModelLabel,
  roiInteractionScaleLabel,
  roiLikelihoodDynamicsLabel,
  roiLikelihoodSpatialEvolutionLabel,
  roiMotionScopeLabel,
  roiPatternEvolutionLabel,
  roiPureSpatialPatternLabel,
  roiSpatialEvolutionLabel,
  roiStateModelDescription,
  roiStateModelLabel,
  roiTemporalPatternLabel,
  roiValueDistributionLabel,
  sampleTemporalBehaviorLabel
} from '../DemoRoiFields.js';
import { componentCompatibilityWarnings, componentIsolationHint } from '../SampleFieldComponentHints.js';
import {
  SAMPLE_FIELD_BEHAVIOR_PRESETS,
  sampleFieldBehaviorPresetLabel,
  sampleFieldBehaviorPresetMetadata
} from '../SampleFieldBehaviorPresets.js';
import {
  ROI_REFERENCE_SIGNATURES,
  referenceSignatureLabel,
  referenceSignatureMetadata
} from '../roi/RoiReferenceSignatures.js';
import {
  SAMPLING_PROCESS_RULES,
  SAMPLING_PROCESS_STATES,
  advancedProcessRuleOptions,
  basicProcessRuleOptions,
  normalizeProcessRuleId,
  processRuleById
} from './SamplingProcessRules.js';
import { validateSamplingProcessPaintModel } from './SamplingProcessPaintModel.js';
import {
  samplingProcessModeDescription,
  samplingProcessModeLabel,
  samplingProcessStatusLabel,
  sourceFieldBoundaryNote
} from './SamplingProcessTerminology.js';
import {
  resolveActiveSpatiotemporalProcessExample
} from './SpatiotemporalProcessExamples.js';
import {
  SAMPLING_PROCESS_TICK_RATES
} from './SamplingProcessTiming.js';
import {
  exampleInitialConditionBrushPalette,
  exampleInitialConditionFixtureOptions,
  initialConditionEditCount,
  initialConditionGuidanceForExample,
  initialConditionModeOptions,
  isExampleInitialConditionEditorSupported,
  normalizeInitialConditionBrush,
  normalizeInitialConditionFixtureId,
  normalizeInitialConditionMode,
  selectedFixtureOption
} from './SamplingProcessInitialConditionEditor.js';

export function buildSamplingProcessConsoleState(context = {}) {
  return {
    ...buildSamplingProcessConsoleSummary(context),
    ...buildSamplingProcessPaintConsoleState(context),
    ...buildSamplingProcessRandomRuleConsoleState(context),
    ...buildSamplingProcessInitialConditionConsoleState(context),
    ...buildSamplingProcessExportConsoleState(context),
    ...buildSamplingProcessScenarioConsoleState(context),
    ...buildSamplingProcessActiveSourceState(context)
  };
}

export function buildSamplingProcessConsoleSummary(context = {}) {
  const { field } = context;
  const eventLikelihood = field?.eventLikelihood ?? context.eventLikelihood;
  const eventLikelihoodDynamics = field?.eventLikelihoodDynamics ?? context.eventLikelihoodDynamics;
  const eventLikelihoodTemporalPattern = field?.eventLikelihoodTemporalPattern ?? context.eventLikelihoodTemporalPattern;
  const eventLikelihoodSpatialEvolution = field?.eventLikelihoodSpatialEvolution ?? context.eventLikelihoodSpatialEvolution;
  const spatialPattern = field?.pureSpatialPattern ?? context.spatialPattern;
  const valueDistribution = field?.valueDistribution ?? context.valueDistribution;
  const clusterSize = field?.clusterSize ?? context.clusterSize;
  const temporalPattern = field?.temporalPattern ?? context.temporalPattern;
  const temporalBehavior = field?.temporalBehavior ?? context.temporalBehavior;
  const evolutionModel = field?.evolutionModel ?? context.evolutionModel;
  const patternEvolution = field?.patternEvolution ?? context.patternEvolution;
  const spatialEvolution = field?.spatialEvolution ?? context.spatialEvolution;
  const motionScope = field?.motionScope ?? context.motionScope;
  const interactionScale = field?.interactionScale ?? context.interactionScale;
  const stateModel = field?.stateModel ?? context.stateModel;
  const depletionMode = field?.depletionMode ?? context.depletionMode;
  const displayMode = field?.displayMode ?? context.displayMode;
  return {
    title: context.title,
    status: `${roiEventLikelihoodLabel(eventLikelihood)} source field`,
    distribution: context.distribution,
    seed: context.seed,
    eventLikelihood,
    eventLikelihoodLabel: field?.eventLikelihoodLabel ?? roiEventLikelihoodLabel(context.eventLikelihood),
    eventLikelihoodDynamics,
    eventLikelihoodDynamicsLabel: field?.eventLikelihoodDynamicsLabel ?? roiLikelihoodDynamicsLabel(context.eventLikelihoodDynamics),
    eventLikelihoodTemporalPattern,
    eventLikelihoodTemporalPatternLabel: field?.eventLikelihoodTemporalPatternLabel ?? roiTemporalPatternLabel(context.eventLikelihoodTemporalPattern),
    eventLikelihoodSpatialEvolution,
    eventLikelihoodSpatialEvolutionLabel: field?.eventLikelihoodSpatialEvolutionLabel ?? roiLikelihoodSpatialEvolutionLabel(context.eventLikelihoodSpatialEvolution),
    hotspotCount: context.hotspotCount,
    noise: context.noise,
    timeMode: context.timeMode,
    spatialPattern,
    spatialPatternLabel: roiPureSpatialPatternLabel(spatialPattern),
    valueDistribution,
    valueDistributionLabel: field?.valueDistributionLabel ?? roiValueDistributionLabel(context.valueDistribution),
    clusterCount: field?.clusterCount ?? context.hotspotCount,
    clusterSize,
    clusterSizeLabel: roiClusterSizeLabel(clusterSize),
    temporalPattern,
    temporalPatternLabel: roiTemporalPatternLabel(temporalPattern),
    temporalBehavior,
    temporalBehaviorLabel: sampleTemporalBehaviorLabel(temporalBehavior),
    evolutionModel,
    evolutionModelLabel: roiEvolutionModelLabel(evolutionModel),
    patternEvolution,
    patternEvolutionLabel: roiPatternEvolutionLabel(patternEvolution),
    spatialEvolution,
    spatialEvolutionLabel: roiSpatialEvolutionLabel(spatialEvolution),
    motionScope,
    motionScopeLabel: roiMotionScopeLabel(motionScope),
    interactionScale,
    interactionScaleLabel: field?.interactionScaleLabel ?? roiInteractionScaleLabel(context.interactionScale),
    modifiedComponent: context.modifiedComponent,
    componentHint: componentIsolationHint(context.modifiedComponent),
    compatibilityWarnings: componentCompatibilityWarnings(context.sceneConfig ?? {}),
    dynamicComplexity: field?.dynamicComplexity ?? context.dynamicComplexity,
    patternSource: context.patternSource,
    processMode: context.processMode,
    processModeLabel: samplingProcessModeLabel(context.processMode),
    processModeDescription: samplingProcessModeDescription(context.processMode),
    processStatusLabel: samplingProcessStatusLabel({
      mode: context.processMode,
      patternSource: context.patternSource,
      modified: Boolean(context.referenceSignatureModified || context.behaviorPresetModified || Object.keys(context.paintModel?.cells ?? {}).length > 0),
      validationStatus: field?.activityDiagnostics?.presetValidation?.status ?? 'PASS'
    }),
    sourceFieldBoundaryNote: sourceFieldBoundaryNote(),
    stateModel,
    stateModelLabel: field?.stateModelLabel ?? roiStateModelLabel(context.stateModel),
    stateModelDescription: field?.stateModelDescription ?? roiStateModelDescription(context.stateModel),
    depletionMode,
    depletionModeLabel: roiDepletionModeLabel(depletionMode),
    displayMode,
    displayModeLabel: roiDisplayModeLabel(displayMode),
    displayModeCaption: roiDisplayModeCaption(displayMode),
    viewFilters: context.viewFilters,
    priorMode: field?.priorMode,
    forecastView: context.forecastView,
    timeSpeedScale: context.timeSpeedScale,
    playbackDirection: context.playbackDirection,
    time: context.demoTime,
    processGenerationIndex: context.processGenerationIndex ?? field?.processTiming?.generationIndex ?? 0,
    processTickRate: context.processTickRate ?? field?.processTiming?.tickRate ?? 1,
    processTickIntervalSeconds: context.processTickIntervalSeconds ?? field?.processTiming?.tickIntervalSeconds ?? 1,
    processTickRates: SAMPLING_PROCESS_TICK_RATES,
    usesDiscreteProcessClock: Boolean(context.usesDiscreteProcessClock),
    processDisplayMetric: context.processDisplayMetric ?? field?.processDisplayMetric ?? null,
    metricLegend: context.metricLegend ?? field?.metricLegend ?? field?.processDisplayMetric?.legend ?? [],
    paused: context.paused,
    stats: field?.stats,
    activityDiagnostics: field?.activityDiagnostics,
    uiVersion: context.uiVersion,
    referenceSignatureCount: context.referenceSignatureCount ?? ROI_REFERENCE_SIGNATURES.length,
    legacyPresetCount: context.legacyPresetCount ?? SAMPLE_FIELD_BEHAVIOR_PRESETS.length,
    legacyPresetsVisible: Boolean(context.legacyPresetsVisible),
    activeUpdateRuleHint: context.updateRuleHint
  };
}

export function buildSamplingProcessActiveSourceState(context = {}) {
  const behaviorPreset = sampleFieldBehaviorPresetMetadata(context.behaviorPresetId, context.behaviorPresetModified);
  const activeExample = resolveActiveSpatiotemporalProcessExample(context);
  const referenceSignature = activeExample.referenceSignature
    ?? (context.patternSource === 'legacyPreset' ? behaviorPreset.referenceSignature : null);
  const referenceSignatureId = activeExample.referenceSignatureId ?? referenceSignature?.id ?? null;
  return {
    behaviorPresetId: context.behaviorPresetId,
    behaviorPresetLabel: sampleFieldBehaviorPresetLabel(context.behaviorPresetId),
    behaviorPresetModified: context.behaviorPresetModified,
    behaviorPreset,
    processExample: activeExample,
    exampleTrack: activeExample.exampleTrack,
    exampleTrackLabel: activeExample.exampleTrackLabel,
    exampleProcessId: activeExample.exampleProcessId,
    exampleProcessLabel: activeExample.exampleProcessLabel,
    exampleType: activeExample.exampleType,
    exampleProcessModified: activeExample.isModified,
    foundationalCaModelId: activeExample.foundationalCaModelId,
    foundationalModelId: activeExample.foundationalCaModelId,
    oceanProcessAnalogId: activeExample.oceanProcessAnalogId,
    observableProcessPatternTags: activeExample.observableProcessPatternTags,
    implementationFidelity: activeExample.implementationFidelity,
    requiresFlowCoupling: activeExample.requiresFlowCoupling,
    requiresUncertaintyForMissionRealism: activeExample.requiresUncertaintyForMissionRealism,
    observableProcessPatternId: activeExample.exampleType === 'observableProcessPattern'
      ? activeExample.exampleProcessId
      : activeExample.referenceSignatureId,
    spatiotemporalProcessExample: activeExample.sourceExample,
    selectedProcessExample: activeExample.sourceExample,
    referenceSignatureId,
    referenceSignatureLabel: activeExample.referenceSignatureLabel ?? referenceSignatureLabel(referenceSignatureId),
    mappedReferenceSignatureId: activeExample.mappedReferenceSignatureId,
    mappedReferenceSignatureLabel: activeExample.mappedReferenceSignatureLabel,
    referenceSignatureModified: context.referenceSignatureModified,
    referenceSignature,
    activeProcessExample: activeExample
  };
}
export function buildSamplingProcessPaintConsoleState(context = {}) {
  const selectedPaintRuleId = normalizeProcessRuleId(context.selectedPaintRuleId);
  const selectedPaintRule = processRuleById(selectedPaintRuleId);
  return {
    paintModel: context.paintModel,
    paintStartMode: context.paintStartMode,
    processPaintRunStarted: context.processPaintRunStarted,
    paintValidation: validateSamplingProcessPaintModel(context.paintModel),
    selectedPaintState: selectedPaintRule.allowedStates.includes(context.selectedPaintState)
      ? context.selectedPaintState
      : selectedPaintRule.defaultInitialState,
    selectedPaintRuleId,
    selectedPaintGroupId: context.selectedPaintGroupId,
    selectedPaintSourceValue: context.selectedPaintSourceValue,
    processRules: SAMPLING_PROCESS_RULES,
    basicProcessRules: basicProcessRuleOptions(),
    advancedProcessRules: advancedProcessRuleOptions(),
    processStates: SAMPLING_PROCESS_STATES,
    validPaintStates: selectedPaintRule.allowedStates
  };
}

export function buildSamplingProcessRandomRuleConsoleState(context = {}) {
  return {
    randomRuleSeed: context.randomRuleSeed,
    randomRuleMode: context.randomRuleMode,
    randomRuleGroupCount: context.randomRuleGroupCount,
    randomRuleActiveFraction: context.randomRuleActiveFraction
  };
}

export function buildSamplingProcessInitialConditionConsoleState(context = {}) {
  const activeExample = resolveActiveSpatiotemporalProcessExample(context);
  const example = activeExample.sourceExample;
  const editorEnabled = Boolean(
    context.patternSource === 'referenceSignature'
      && ['foundationalCaModels', 'oceanProcessAnalogs'].includes(context.processMode)
      && isExampleInitialConditionEditorSupported(example)
  );
  const mode = normalizeInitialConditionMode(context.initialConditionMode ?? context.initialCondition?.mode);
  const fixtureId = normalizeInitialConditionFixtureId(context.selectedInitialConditionFixtureId ?? context.initialCondition?.fixtureId, example);
  const fixtureOption = selectedFixtureOption(example, fixtureId);
  const brush = normalizeInitialConditionBrush(example, context.selectedInitialConditionBrushState ?? context.initialCondition?.brushState);
  const editCount = initialConditionEditCount(context.initialConditionModel ?? context.initialCondition?.model);
  const guidance = initialConditionGuidanceForExample(example);
  return {
    initialConditionEditorEnabled: editorEnabled,
    interactiveInitialConditionEnabled: editorEnabled && mode === 'interactiveCanvas',
    initialConditionMode: mode,
    initialConditionModeOptions: initialConditionModeOptions(),
    selectedInitialConditionFixtureId: fixtureId,
    selectedInitialConditionFixtureLabel: fixtureOption?.label ?? context.initialCondition?.fixtureLabel ?? null,
    initialConditionFixtureOptions: exampleInitialConditionFixtureOptions(example),
    selectedInitialConditionBrushState: brush?.id ?? null,
    selectedInitialConditionBrush: brush,
    initialConditionBrushPalette: exampleInitialConditionBrushPalette(example),
    initialConditionEditCount: editCount,
    initialConditionMatchesFixture: editCount === 0,
    initialConditionSummary: context.initialCondition ?? null,
    initialConditionGuidance: guidance,
    selectedEditedCell: context.selectedEditedCell ?? null
  };
}

export function buildSamplingProcessExportConsoleState(context = {}) {
  return {
    exportMode: context.exportMode,
    exportStartTime: context.exportStartTime,
    exportEndTime: context.exportEndTime,
    exportFrameCount: context.exportFrameCount
  };
}

export function buildSamplingProcessScenarioConsoleState(context = {}) {
  return {
    scenarioSourceMode: context.scenarioSourceMode,
    scenarioSeed: context.scenarioSeed,
    scenarioDifficulty: context.scenarioDifficulty,
    scenarioDuration: context.scenarioDuration,
    scenarioFrameCount: context.scenarioFrameCount,
    scenarioValidationMode: context.scenarioValidationMode,
    scenarioSummary: scenarioSummaryForConsole(context.generatedScenario)
  };
}

function scenarioSummaryForConsole(scenario) {
  if (!scenario) return null;
  return {
    scenarioId: scenario.scenarioId,
    family: scenario.family,
    seed: scenario.seed,
    difficulty: scenario.difficulty,
    sourceMode: scenario.sourceMode,
    frameCount: scenario.frames?.length ?? scenario.time?.frameCount ?? 0,
    duration: scenario.time?.durationSeconds ?? 0,
    validationStatus: scenario.validation?.status ?? 'WARN',
    validationSummary: scenario.validation?.humanSummary ?? 'Scenario has not been validated.',
    warnings: scenario.validation?.warnings ?? [],
    failures: scenario.validation?.failures ?? [],
    recommendedFixes: scenario.validation?.recommendedFixes ?? [],
    meanActiveFraction: scenario.diagnostics?.meanActiveFraction,
    meanHighValueFraction: scenario.diagnostics?.meanHighValueFraction,
    meanFrameDelta: scenario.diagnostics?.meanFrameDelta,
    processClass: scenario.labels?.processClass,
    observablePattern: scenario.validation?.observablePattern ?? scenario.behaviorSignature?.observablePattern,
    roiInterpretation: scenario.processContract?.roiInterpretation
  };
}

