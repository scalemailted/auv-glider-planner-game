import {
  createDemoRoiField,
  roiDepletionModeLabel,
  roiDisplayModeLabel,
  roiSpatialEvolutionLabel,
  roiTemporalPatternLabel,
  roiStateModelForEvolutionModel,
  roiStateModelLabel,
  roiDemoDistributionDefaults,
  normalizeRoiDemoDistribution,
  normalizeRoiDemoEventLikelihood,
  normalizeRoiDemoLikelihoodDynamics,
  normalizeRoiDemoPureSpatialPattern,
  normalizeRoiDemoValueDistribution,
  normalizeRoiDemoTemporalBehavior,
  normalizeRoiDemoTimeMode,
  normalizeRoiDemoTemporalPattern,
  normalizeRoiDemoEvolutionModel,
  normalizeRoiDemoPatternEvolution,
  normalizeRoiDemoMotionScope,
  normalizeRoiDemoInteractionScale,
  normalizeRoiDemoStateModel,
  normalizeRoiDemoDepletionMode,
  normalizeRoiDemoDisplayMode,
  normalizeRoiDemoViewFilters,
  normalizeRoiDemoDynamicComplexity,
  normalizeRoiDemoClusterSize
} from '../../../core/demo/DemoRoiFields.js';
import {
  drawHighValueMarkers,
  drawSelectedSamplingCell,
  drawSamplingProcessHeatmap,
  isGraphDisplayMode
} from '../renderers/SamplingProcessRenderLayers.js';
import { generateRoiScenario, ROI_SCENARIO_DIFFICULTIES, ROI_SCENARIO_SOURCE_MODES, ROI_SCENARIO_VALIDATION_MODES } from '../../../core/demo/roi/RoiScenarioGenerator.js';
import {
  CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
  SAMPLE_FIELD_BEHAVIOR_PRESETS,
  normalizeSampleFieldBehaviorPresetId,
  sampleFieldBehaviorPresetById,
  sampleFieldBehaviorPresetMetadata,
  sampleFieldBehaviorPresetLabel
} from '../../../core/demo/SampleFieldBehaviorPresets.js';
import {
  CUSTOM_REFERENCE_SIGNATURE_ID,
  ROI_REFERENCE_SIGNATURES,
  formatObservableSignature,
  normalizeReferenceSignatureId,
  referenceSignatureById,
  referenceSignatureMetadata,
  referenceSignatureRecipe
} from '../../../core/demo/roi/RoiReferenceSignatures.js';
import { demoArtifactFilename, validateDemoExportSettings } from '../../../core/io/DemoArtifactExporter.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';
import {
  SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE,
  SAMPLING_PROCESS_LAB_TITLE,
  SAMPLING_PROCESS_VISIBLE_MODES,
  normalizeSamplingProcessMode,
  samplingProcessModeLabel
} from '../../../core/demo/sampling/SamplingProcessTerminology.js';
import {
  normalizeSpatiotemporalProcessExampleId,
  normalizeSpatiotemporalProcessExampleTrack,
  processModeForSpatiotemporalProcessExampleTrack,
  referenceSignatureIdForProcessExample,
  resolveActiveSpatiotemporalProcessExample,
  spatiotemporalProcessExampleById,
  spatiotemporalProcessExampleLabel,
  spatiotemporalProcessExampleTrackForMode,
  spatiotemporalProcessExampleTrackLabel,
  spatiotemporalProcessExamplesByTrack
} from '../../../core/demo/sampling/SpatiotemporalProcessExamples.js';
import {
  normalizeProcessRuleId,
  processRuleById
} from '../../../core/demo/sampling/SamplingProcessRules.js';
import {
  assignSamplingProcessCell,
  clearSamplingProcessPaintModel,
  clearSamplingProcessCell,
  createBlankSamplingProcessPaintModel,
  createSamplingProcessPaintModel,
  validateSamplingProcessPaintModel
} from '../../../core/demo/sampling/SamplingProcessPaintModel.js';
import { randomizeSamplingProcessAllocation } from '../../../core/demo/sampling/SamplingProcessRandomizer.js';
import {
  buildSamplingProcessLayersForField,
  buildSamplingProcessPaintField,
  buildSamplingProcessGraphField,
  fieldStats,
  highValueCellsFromField,
  sourceFieldDiagnostics
} from '../../../core/demo/sampling/SamplingProcessPaintFieldAdapter.js';
import {
  frameFromLayers,
  stepSamplingProcess
} from '../../../core/demo/sampling/SamplingProcessEvolution.js';
import { buildExampleInitialLayers } from '../../../core/demo/sampling/SamplingProcessExampleFixtures.js';
import { evaluateSamplingProcessExampleBehavior } from '../../../core/demo/sampling/SamplingProcessExampleBehaviorAssertions.js';
import {
  buildSamplingProcessMetricLayers,
  metricDisplayBlock
} from '../../../core/demo/sampling/SamplingProcessExplainability.js';
import {
  SAMPLING_PROCESS_TICK_RATES,
  DEFAULT_SAMPLING_PROCESS_TICK_RATE,
  advanceProcessClock,
  isDiscreteSamplingProcessMode,
  normalizeProcessTickRate,
  processTickIntervalSeconds,
  processTimingExportBlock
} from '../../../core/demo/sampling/SamplingProcessTiming.js';
import {
  buildCustomComposerPatch,
  buildPatternSourcePatch,
  buildProcessPaintEntryPatch,
  buildProcessPaintSelectionPatch,
  buildRandomizedAllocationPatch,
  buildSamplingProcessModePatch,
  buildReferenceSignaturePatch,
  migrateDiagnosticsProcessMode,
  processModeFromPatternSource
} from '../../../core/demo/sampling/SamplingProcessModeController.js';
import {
  buildSamplingProcessDemoArtifactExport,
  buildSamplingProcessDemoArtifactFrame,
  buildSamplingProcessExportSampling,
  buildSamplingProcessScenarioMetadata
} from '../../../core/demo/sampling/SamplingProcessExportBuilder.js';
import { buildSamplingProcessConsoleHandlers } from '../../../core/demo/sampling/SamplingProcessConsoleHandlers.js';
import { buildSamplingProcessConsoleState } from '../../../core/demo/sampling/SamplingProcessConsoleViewModel.js';
import {
  buildSamplingProcessBehaviorHelpState,
  buildSamplingProcessCellInspection,
  buildSamplingProcessComponentRecipe,
  buildSamplingProcessDiagnosticsState,
  buildSamplingProcessPaintPanelState,
  buildSamplingProcessRecipeSignatureState,
  buildSamplingProcessRecipeSummary
} from '../../../core/demo/sampling/SamplingProcessViewModel.js';
import {
  processPaintCellEditorHtml,
  processPaintInspectorEmptyHtml,
  processPaintToolsHtml,
  roiBehaviorHelpEmptyHtml,
  roiBehaviorHelpHtml,
  roiDiagnosticsHtml,
  roiInspectorEmptyHtml,
  roiInspectorHtml,
  roiRecipeSignatureHtml
} from '../../../ui/sampling/SamplingProcessRightPanel.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};
const ROI_UI_VERSION = 'process-context-split-ui-v1';
const DEFAULT_REFERENCE_SIGNATURE_ID = 'birthDeathEmergence';
const PATTERN_SOURCES = ['referenceSignature', 'custom', 'legacyPreset'];

export class RoiGeneratorDemoScene extends PhaserScene {
  constructor() {
    super('RoiGeneratorDemoScene');
    this.objects = [];
    this.transportRefs = {};
    this.distribution = 'burstyBloom';
    this.seed = 'anchor-roi-demo';
    this.eventLikelihood = 'multiModalLikelihood';
    this.eventLikelihoodDynamics = 'static';
    this.eventLikelihoodTemporalPattern = 'static';
    this.eventLikelihoodSpatialEvolution = 'stationary';
    this.hotspotCount = 3;
    this.clusterSize = 'medium';
    this.noise = 0.15;
    this.timeMode = 'dynamic';
    this.spatialPattern = 'clusteredField';
    this.valueDistribution = 'gaussianNormal';
    this.temporalPattern = 'bursty';
    this.temporalBehavior = 'bursty';
    this.evolutionModel = 'stationary';
    this.patternEvolution = 'stationary';
    this.spatialEvolution = 'stationary';
    this.motionScope = 'perFeature';
    this.interactionScale = 'hybrid';
    this.stateModel = 'stateEvolving';
    this.depletionMode = 'soft';
    this.displayMode = SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE;
    this.viewFilters = normalizeRoiDemoViewFilters();
    this.dynamicComplexity = 'medium';
    this.patternSource = 'referenceSignature';
    this.processMode = 'foundationalCaModels';
    this.exampleTrack = 'foundationalCaModels';
    this.exampleProcessId = 'conwayGameOfLife';
    this.foundationalCaModelId = 'conwayGameOfLife';
    this.oceanProcessAnalogId = null;
    this.exampleProcessModified = false;
    this.behaviorPresetId = CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID;
    this.behaviorPresetModified = false;
    this.referenceSignatureId = DEFAULT_REFERENCE_SIGNATURE_ID;
    this.referenceSignatureModified = false;
    this.updateRuleHint = null;
    this.forecastView = 'forecast';
    this.demoTime = 0;
    this.processGenerationIndex = 0;
    this.processTickRate = DEFAULT_SAMPLING_PROCESS_TICK_RATE;
    this.processTickAccumulator = 0;
    this.processTickIntervalSeconds = processTickIntervalSeconds(this.processTickRate);
    this.lastProcessStepTime = null;
    this.previousProcessStateLayer = null;
    this.timeSpeedScale = 1;
    this.playbackDirection = 1;
    this.paused = false;
    this.field = null;
    this.processLayers = null;
    this.activeExampleFixture = null;
    this.activeExampleFixtureValidation = null;
    this.activeExampleBehaviorValidation = null;
    this.selectedCell = null;
    this.rightPanelMode = 'recipeSignature';
    this.selectedHelpTopic = null;
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
    this.lastDynamicsDebugKey = '';
    this.exportMode = 'currentFrame';
    this.exportStartTime = 0;
    this.exportEndTime = 120;
    this.exportFrameCount = 1;
    this.scenarioSourceMode = 'currentRecipe';
    this.scenarioSeed = 'scenario-test-001';
    this.scenarioDifficulty = 'medium';
    this.scenarioDuration = 120;
    this.scenarioFrameCount = 25;
    this.scenarioValidationMode = 'requirePass';
    this.generatedScenario = null;
    this.paintModel = createSamplingProcessPaintModel();
    this.selectedPaintState = 'active';
    this.selectedPaintRuleId = 'propagatingFront';
    this.selectedPaintGroupId = 1;
    this.selectedPaintSourceValue = 1;
    this.paintStartMode = 'blankCanvas';
    this.processPaintRunStarted = false;
    this.randomRuleSeed = 'sampling-random-001';
    this.randomRuleMode = 'exploratoryMixedRules';
    this.randomRuleGroupCount = 4;
    this.randomRuleActiveFraction = 0.18;
  }

  init(data = {}) {
    const patternSource = normalizePatternSource(data.patternSource, data);
    const requestedProcessMode = normalizeSamplingProcessMode(data.processMode ?? processModeFromPatternSource(patternSource));
    const diagnosticsMigration = requestedProcessMode === 'diagnosticsGraphInspection'
      ? migrateDiagnosticsProcessMode({
          ...data,
          activeWorkflowMode: processModeFromPatternSource(patternSource),
          processMode: processModeFromPatternSource(patternSource)
        })
      : null;
    const processMode = diagnosticsMigration?.processMode ?? requestedProcessMode;
    const requestedActiveExample = resolveActiveSpatiotemporalProcessExample({
      exampleTrack: data.exampleTrack ?? data.spatiotemporalProcessExample?.track ?? spatiotemporalProcessExampleTrackForMode(processMode) ?? 'foundationalCaModels',
      exampleProcessId: data.exampleProcessId ?? data.spatiotemporalProcessExample?.id ?? (patternSource === 'referenceSignature' ? 'conwayGameOfLife' : CUSTOM_REFERENCE_SIGNATURE_ID),
      foundationalCaModelId: data.foundationalCaModelId,
      oceanProcessAnalogId: data.oceanProcessAnalogId,
      referenceSignatureId: data.referenceSignatureId ?? data.referenceSignature?.id,
      patternSource,
      processMode,
      exampleProcessModified: data.exampleProcessModified,
      referenceSignatureModified: data.referenceSignatureModified ?? data.referenceSignature?.modified
    });
    const requestedExampleTrack = requestedActiveExample.exampleTrack;
    const requestedExampleProcessId = requestedActiveExample.exampleProcessId ?? CUSTOM_REFERENCE_SIGNATURE_ID;
    const requestedReferenceSignatureId = normalizeReferenceSignatureId(requestedActiveExample.referenceSignatureId ?? CUSTOM_REFERENCE_SIGNATURE_ID);
    const requestedExample = requestedActiveExample.sourceExample;
    const explicitDisplayMode = data.displayMode ?? data.config?.displayMode ?? null;
    const referenceRecipe = patternSource === 'referenceSignature' && requestedReferenceSignatureId !== CUSTOM_REFERENCE_SIGNATURE_ID ? referenceSignatureRecipe(requestedReferenceSignatureId) : {};
    const input = { ...referenceRecipe, ...data };
    this.distribution = normalizeRoiDemoDistribution(data.distribution ?? 'burstyBloom');
    const distributionDefaults = roiDemoDistributionDefaults(this.distribution);
    this.seed = input.seed ?? 'anchor-roi-demo';
    this.eventLikelihood = normalizeRoiDemoEventLikelihood(input.eventLikelihood ?? distributionDefaults.eventLikelihood ?? 'multiModalLikelihood');
    this.eventLikelihoodDynamics = normalizeRoiDemoLikelihoodDynamics(input.eventLikelihoodDynamics ?? 'static');
    this.eventLikelihoodTemporalPattern = normalizeRoiDemoTemporalPattern(input.eventLikelihoodTemporalPattern ?? 'static');
    this.eventLikelihoodSpatialEvolution = normalizeRoiDemoPatternEvolution(input.eventLikelihoodSpatialEvolution ?? 'stationary');
    this.hotspotCount = finiteNumber(input.hotspotCount, 3);
    this.clusterSize = normalizeRoiDemoClusterSize(input.clusterSize ?? 'medium');
    this.noise = finiteNumber(input.noise, 0.15);
    this.timeMode = normalizeRoiDemoTimeMode(input.timeMode ?? 'dynamic');
    this.spatialPattern = normalizeRoiDemoPureSpatialPattern(input.spatialPattern ?? input.pureSpatialPattern ?? distributionDefaults.spatialPattern);
    this.valueDistribution = normalizeRoiDemoValueDistribution(input.valueDistribution ?? distributionDefaults.valueDistribution);
    this.temporalPattern = normalizeRoiDemoTemporalPattern(input.temporalPattern ?? distributionDefaults.temporalPattern);
    this.spatialEvolution = normalizeRoiDemoPatternEvolution(input.spatialEvolution ?? input.patternEvolution ?? input.evolutionModel ?? distributionDefaults.spatialEvolution ?? distributionDefaults.evolutionModel);
    this.evolutionModel = this.spatialEvolution;
    this.patternEvolution = this.spatialEvolution;
    this.motionScope = normalizeRoiDemoMotionScope(input.motionScope ?? 'perFeature');
    this.stateModel = normalizeRoiDemoStateModel(input.stateModel);
    this.depletionMode = normalizeRoiDemoDepletionMode(input.depletionMode ?? 'soft');
    this.displayMode = normalizeRoiDemoDisplayMode(
      diagnosticsMigration?.displayMode
        ?? explicitDisplayMode
        ?? defaultProcessDisplayMode(processMode)
    );
    this.viewFilters = normalizeRoiDemoViewFilters(input.viewFilters ?? input.config?.viewFilters ?? this.viewFilters);
    this.dynamicComplexity = normalizeRoiDemoDynamicComplexity(input.dynamicComplexity ?? 'medium');
    this.patternSource = patternSource;
    this.processMode = processMode;
    this.exampleTrack = requestedActiveExample.exampleTrack;
    this.exampleProcessId = requestedActiveExample.exampleProcessId;
    this.foundationalCaModelId = requestedActiveExample.foundationalCaModelId;
    this.oceanProcessAnalogId = requestedActiveExample.oceanProcessAnalogId;
    this.exampleProcessModified = Boolean(requestedActiveExample.isModified); 
    this.behaviorPresetId = patternSource === 'legacyPreset'
      ? normalizeSampleFieldBehaviorPresetId(input.behaviorPresetId ?? input.behaviorPreset?.id ?? CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID)
      : CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID;
    this.behaviorPresetModified = Boolean(data.behaviorPresetModified ?? data.behaviorPreset?.modified);
    this.referenceSignatureId = requestedActiveExample.referenceSignatureId ?? CUSTOM_REFERENCE_SIGNATURE_ID;
    this.referenceSignatureModified = Boolean(input.referenceSignatureModified ?? input.referenceSignature?.modified);
    this.updateRuleHint = patternSource === 'referenceSignature' ? requestedExample?.ruleFamilyId ?? input.updateRuleHint ?? null : null;
    this.interactionScale = normalizeRoiDemoInteractionScale(input.interactionScale ?? sampleFieldBehaviorPresetMetadata(this.behaviorPresetId).interactionScale ?? 'hybrid');
    this.modifiedComponent = data.modifiedComponent ?? null;
    this.temporalBehavior = normalizeRoiDemoTemporalBehavior(input.temporalBehavior ?? distributionDefaults.temporalBehavior);
    this.forecastView = normalizeForecastView(data.forecastView ?? 'forecast');
    this.timeSpeedScale = finiteNumber(data.timeSpeedScale, 1);
    this.playbackDirection = normalizePlaybackDirection(data.playbackDirection);
    const inputProcessTiming = data.processTiming ?? {};
    const initialDemoTime = finiteNumber(data.demoTime, 0);
    this.processTickRate = normalizeProcessTickRate(data.processTickRate ?? inputProcessTiming.tickRate ?? inputProcessTiming.processTickRate);
    this.processTickIntervalSeconds = processTickIntervalSeconds(this.processTickRate);
    this.processTickAccumulator = Math.max(0, finiteNumber(data.processTickAccumulator ?? inputProcessTiming.tickAccumulator, 0));
    this.processGenerationIndex = Math.max(0, Math.round(finiteNumber(data.processGenerationIndex ?? data.generationIndex ?? inputProcessTiming.generationIndex ?? initialDemoTime, initialDemoTime)));
    this.lastProcessStepTime = Number.isFinite(Number(data.lastProcessStepTime ?? inputProcessTiming.lastProcessStepTime)) ? Number(data.lastProcessStepTime ?? inputProcessTiming.lastProcessStepTime) : null;
    this.demoTime = isDiscreteSamplingProcessMode(processMode) ? this.processGenerationIndex : initialDemoTime;
    this.previousProcessStateLayer = null;
    this.paused = this.processMode === 'processPaint' ? data.paused !== false : Boolean(data.paused);
    this.selectedCell = normalizeSelectedCell(data.selectedCell);
    this.rightPanelMode = normalizeRightPanelMode(diagnosticsMigration?.rightPanelMode ?? data.rightPanelMode);
    this.selectedHelpTopic = normalizeHelpTopic(data.selectedHelpTopic);
    this.lastInspectorKey = '';
    this.lastInspectorRenderTime = -Infinity;
    this.lastDynamicsDebugKey = '';
    this.exportMode = normalizeExportMode(data.exportMode);
    this.exportStartTime = finiteNumber(data.exportStartTime ?? this.demoTime, this.demoTime);
    this.exportEndTime = finiteNumber(data.exportEndTime ?? Math.max(120, this.demoTime), Math.max(120, this.demoTime));
    this.exportFrameCount = Math.max(1, Math.round(finiteNumber(data.exportFrameCount, 1)));
    this.scenarioSourceMode = normalizeScenarioSourceMode(data.scenarioSourceMode);
    this.scenarioSeed = data.scenarioSeed ?? 'scenario-test-001';
    this.scenarioDifficulty = normalizeScenarioDifficulty(data.scenarioDifficulty);
    this.scenarioDuration = Math.max(1, finiteNumber(data.scenarioDuration, 120));
    this.scenarioFrameCount = Math.max(1, Math.min(240, Math.round(finiteNumber(data.scenarioFrameCount, 25))));
    this.scenarioValidationMode = normalizeScenarioValidationMode(data.scenarioValidationMode);
    this.generatedScenario = null;
    this.paintModel = createSamplingProcessPaintModel({
      width: 24,
      height: 16,
      assignments: data.paintModel ?? data.ruleAllocation ?? {}
    });
    this.selectedPaintState = data.selectedPaintState ?? 'active';
    this.selectedPaintRuleId = normalizeProcessRuleId(data.selectedPaintRuleId ?? 'propagatingFront');
    this.selectedPaintGroupId = Math.max(0, Math.round(Number(data.selectedPaintGroupId ?? 1)));
    this.selectedPaintSourceValue = Math.max(0, Math.min(1, Number(data.selectedPaintSourceValue ?? 1)));
    this.paintStartMode = normalizePaintStartMode(data.paintStartMode);
    this.processPaintRunStarted = Boolean(data.processPaintRunStarted);
    this.randomRuleSeed = data.randomRuleSeed ?? 'sampling-random-001';
    this.randomRuleMode = data.randomRuleMode ?? 'exploratoryMixedRules';
    this.randomRuleGroupCount = Math.max(1, Math.round(Number(data.randomRuleGroupCount ?? 4)));
    this.randomRuleActiveFraction = Math.max(0, Math.min(1, Number(data.randomRuleActiveFraction ?? 0.18)));
    this.rebuildField();
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'roiDemo';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel(this.title());
    this.renderConsole();
    this.renderTransportBar();
    this.renderCellInspector(true);
    this.buildSceneObjects();
    this.bindInputHandlers();
    this.bindDocumentTransportControls();
    this.draw();
  }

  shutdown() {
    this.unbindInputHandlers();
    this.destroyObjects();
    this.clearTransportBar();
    this.clearCellInspector();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.buildSceneObjects();
    this.draw();
  }

  update(_time, delta) {
    if (this.usesDiscreteProcessClock()) {
      const processPaintWaiting = this.processMode === 'processPaint' && !this.processPaintRunStarted;
      const clock = advanceProcessClock(this.processTimingState(), Math.max(0, Number(delta ?? 16.67) / 1000), {
        paused: this.paused || processPaintWaiting,
        maxCatchUpTicks: 4
      });
      this.processTickAccumulator = clock.tickAccumulator;
      this.lastProcessStepTime = clock.lastProcessStepTime;
      for (let tick = 0; tick < clock.ticksToAdvance; tick += 1) this.stepProcessGeneration({ render: false, updateUi: false, resetAccumulator: false });
      this.draw();
      return;
    }
    const processPaintRunning = this.processMode === 'processPaint' && this.processPaintRunStarted;
    if (this.paused || (!processPaintRunning && this.timeMode !== 'dynamic' && this.eventLikelihoodDynamics !== 'dynamic')) {
      this.draw();
      return;
    }
    const dt = Math.min(0.05, Math.max(0, Number(delta ?? 16.67) / 1000));
    this.demoTime = Math.max(0, this.demoTime + dt * this.playbackDirection * this.timeSpeedScale);
    this.rebuildField();
    this.draw();
  }

  title() {
    return SAMPLING_PROCESS_LAB_TITLE;
  }
  activeProcessExampleState(overrides = {}) {
    return resolveActiveSpatiotemporalProcessExample({
      exampleTrack: this.exampleTrack,
      exampleProcessId: this.exampleProcessId,
      foundationalCaModelId: this.foundationalCaModelId,
      oceanProcessAnalogId: this.oceanProcessAnalogId,
      referenceSignatureId: this.referenceSignatureId,
      patternSource: this.patternSource,
      processMode: this.processMode,
      exampleProcessModified: this.exampleProcessModified,
      referenceSignatureModified: this.referenceSignatureModified,
      ...overrides
    });
  }

  subtitle() {
    if (this.processMode === 'processPaint') {
      return 'Process Paint | manual non-uniform rule allocation canvas';
    }
    if (this.processMode === 'randomRuleLab') {
      return 'Rule Allocation Sandbox | seeded heterogeneous rule allocation';
    }
    if (this.patternSource === 'custom') {
      return `Custom Composer | ${this.recipeSummary?.() ?? 'editable process recipe'}`;
    }
    const active = this.activeProcessExampleState();
    if (!active.isCustom && active.referenceSignatureLabel) {
      const prefix = active.exampleType === 'oceanProcessAnalog'
        ? 'Ocean-Relevant Process Analog'
        : active.exampleType === 'foundationalCaModel'
          ? 'Foundational CA Model'
          : 'Observable Process Pattern';
      const note = active.requiresFlowCoupling ? 'Flow coupling required later' : 'Deterministic / seeded';
      return `${prefix}: ${active.exampleProcessLabel} | Pattern: ${active.referenceSignatureLabel} | ${note}`;
    }
    return `Legacy Preset: ${sampleFieldBehaviorPresetLabel(this.behaviorPresetId)} | compatibility recipe`;
  }

  usesDiscreteProcessClock() {
    return isDiscreteSamplingProcessMode(this.processMode);
  }

  processTimingState(overrides = {}) {
    return {
      generationIndex: this.processGenerationIndex,
      processGenerationIndex: this.processGenerationIndex,
      tickRate: this.processTickRate,
      processTickRate: this.processTickRate,
      tickAccumulator: this.processTickAccumulator,
      processTickAccumulator: this.processTickAccumulator,
      tickIntervalSeconds: this.processTickIntervalSeconds,
      lastProcessStepTime: this.lastProcessStepTime,
      ...overrides
    };
  }

  activeProcessRuleId() {
    const active = this.activeProcessExampleState();
    return normalizeProcessRuleId(this.updateRuleHint ?? this.activeExampleFixture?.ruleId ?? active.ruleFamilyId ?? active.sourceExample?.ruleFamilyId ?? this.field?.graphField?.updateRule ?? 'inert');
  }

  initializeDiscreteProcessField() {
    const desiredGeneration = Math.max(0, Math.round(Number(this.processGenerationIndex) || 0));
    const width = this.field?.width ?? this.processLayers?.stateLayer?.[0]?.length ?? 24;
    const height = this.field?.height ?? this.processLayers?.stateLayer?.length ?? 16;
    const frame = frameFromLayers({
      ...this.processLayers,
      width,
      height,
      groupDefinitions: this.paintModel?.groups ?? {},
      globalRuleId: this.processMode === 'processPaint' ? 'inert' : this.activeProcessRuleId(),
      time: 0,
      index: 0,
      seed: this.seed
    });
    this.processGenerationIndex = 0;
    this.demoTime = 0;
    this.previousProcessStateLayer = null;
    this.applyProcessEvolutionFrame(frame, { previousStateLayer: null });
    if (desiredGeneration > 0 && (this.processMode !== 'processPaint' || this.processPaintRunStarted)) {
      for (let generation = 0; generation < desiredGeneration; generation += 1) {
        this.stepProcessGeneration({ render: false, updateUi: false, resetAccumulator: false });
      }
    }
    this.processGenerationIndex = Math.max(this.processGenerationIndex, this.processMode === 'processPaint' && !this.processPaintRunStarted ? 0 : desiredGeneration);
    this.demoTime = this.processGenerationIndex;
  }

  stepProcessGeneration({ render = true, updateUi = true, resetAccumulator = true } = {}) {
    if (!this.usesDiscreteProcessClock()) {
      this.demoTime = Math.max(0, this.demoTime + this.playbackDirection * this.timeSpeedScale);
      this.rebuildField();
      if (render) this.draw();
      return;
    }
    if (this.processMode === 'processPaint') this.processPaintRunStarted = true;
    if (!this.field) this.field = createDemoRoiField({ ...this.sceneConfig(), time: 0 });
    if (!this.processLayers) this.processLayers = this.buildProcessLayers();
    const width = this.field?.width ?? this.processLayers?.stateLayer?.[0]?.length ?? 24;
    const height = this.field?.height ?? this.processLayers?.stateLayer?.length ?? 16;
    const previousStateLayer = cloneLayer(this.processLayers.stateLayer);
    const result = stepSamplingProcess({
      ...this.processLayers,
      width,
      height,
      groupDefinitions: this.paintModel?.groups ?? {},
      globalRuleId: this.processMode === 'processPaint' ? 'inert' : this.activeProcessRuleId(),
      time: this.processGenerationIndex + 1,
      dt: 1,
      seed: this.seed
    });
    this.processGenerationIndex = Math.max(0, this.processGenerationIndex + 1);
    this.demoTime = this.processGenerationIndex;
    if (resetAccumulator) this.processTickAccumulator = 0;
    this.previousProcessStateLayer = previousStateLayer;
    this.applyProcessEvolutionFrame(result, { previousStateLayer });
    if (updateUi) {
      this.renderConsole();
      this.updateTransportBar();
      this.renderCellInspector(true);
    } else {
      this.updateTransportBar();
    }
    if (render) this.draw();
  }

  applyProcessEvolutionFrame(evolved = {}, { previousStateLayer = null } = {}) {
    const width = this.field?.width ?? evolved.stateLayer?.[0]?.length ?? 24;
    const height = this.field?.height ?? evolved.stateLayer?.length ?? 16;
    const displayLayers = {
      stateLayer: evolved.stateLayer,
      ruleLayer: evolved.ruleLayer,
      resolvedRuleLayer: evolved.resolvedRuleLayer,
      groupLayer: evolved.groupLayer,
      sourceField: evolved.sourceField,
      parameterLayer: evolved.parameterLayer
    };
    const samplingValueField = evolved.samplingValueField ?? this.field?.samplingValueField ?? this.field?.field;
    const graphField = buildSamplingProcessGraphField({
      baseGraphField: this.field?.graphField,
      displayLayers,
      evolved,
      samplingValueField,
      paintModel: this.processMode === 'processPaint' ? this.paintModel : null,
      updateRuleLabel: this.processMode === 'processPaint' ? 'processPaintRuleFamilies' : this.activeProcessRuleId(),
      width,
      height
    });
    const stats = fieldStats(samplingValueField);
    this.processLayers = displayLayers;
    const metricBundle = buildSamplingProcessMetricLayers({
      example: this.activeProcessExampleState().sourceExample,
      ruleId: this.activeProcessRuleId(),
      stateLayer: displayLayers.stateLayer,
      previousStateLayer: previousStateLayer ?? displayLayers.stateLayer,
      sourceField: displayLayers.sourceField,
      transitionLayer: evolved.transitionLayer,
      samplingValueField,
      width,
      height
    });
    const processStateActiveCount = Number(metricBundle.diagnostics?.activeCellCount);
    const processStateActiveFraction = Number.isFinite(processStateActiveCount) ? processStateActiveCount / Math.max(1, width * height) : 0;
    const numericActiveFraction = highValueFractionForScene(samplingValueField, 0.01);
    const sourceActiveFraction = highValueFractionForScene(displayLayers.sourceField, 0.01);
    const activeFraction = processStateActiveFraction > 0 ? processStateActiveFraction : numericActiveFraction;
    const metricId = displayMetricIdForMode(this.displayMode, metricBundle.defaultMetricId);
    const processDisplayMetric = metricDisplayBlock({
      metricId,
      example: this.activeProcessExampleState().sourceExample,
      layers: metricBundle
    });
    const displayedField = processDisplayedFieldForMode(this.displayMode, samplingValueField, displayLayers.sourceField, metricBundle.metricLayers, metricId);
    this.field = {
      ...this.field,
      width,
      height,
      time: this.processGenerationIndex,
      field: displayedField,
      sampleValueField: samplingValueField,
      samplingValueField,
      valueLayer: samplingValueField,
      evolvedField: samplingValueField,
      eventLikelihoodField: displayLayers.sourceField,
      sourceField: displayLayers.sourceField,
      sourceFieldValues: displayLayers.sourceField,
      processSubstrateField: displayLayers.sourceField,
      transitionLayer: evolved.transitionLayer,
      roiRoleLayer: evolved.roiRoleLayer,
      processMessages: evolved.processMessages,
      metricLayers: metricBundle.metricLayers,
      metricLayerDiagnostics: metricBundle.diagnostics,
      defaultMetricId: metricBundle.defaultMetricId,
      metricLegend: processDisplayMetric.legend,
      processDisplayMetric,
      exampleFixtureId: this.activeExampleFixture?.id ?? null,
      exampleFixtureLabel: this.activeExampleFixture?.label ?? null,
      behaviorValidation: this.activeExampleBehaviorValidation,
      processTiming: processTimingExportBlock(this.processTimingState()),
      likelihoodField: {
        ...(this.field?.likelihoodField ?? {}),
        type: 'processSourceField',
        label: 'Source / Initial Field',
        values: displayLayers.sourceField,
        diagnostics: sourceFieldDiagnostics(displayLayers.sourceField),
        mesh: {
          activeThreshold: 0.25,
          highThreshold: 0.7,
          nearTriggerThreshold: 0.9
        }
      },
      graphField,
      highValueCells: highValueCellsFromField(samplingValueField),
      stats,
      activityDiagnostics: {
        ...(this.field?.activityDiagnostics ?? {}),
        meanValue: stats.mean,
        minValue: stats.min,
        maxValue: stats.max,
        totalActivityMass: stats.totalValue,
        activeFraction,
        processStateActiveFraction,
        numericActiveFraction,
        sourceActiveFraction,
        highValueFraction: highValueFractionForScene(samplingValueField, 0.65),
        ruleEngineDiagnostics: evolved.diagnostics,
        metricLayerDiagnostics: metricBundle.diagnostics,
        processTiming: processTimingExportBlock(this.processTimingState()),
        exampleFixtureId: this.activeExampleFixture?.id ?? null,
        exampleFixtureLabel: this.activeExampleFixture?.label ?? null,
        exampleFixtureValidation: this.activeExampleFixtureValidation,
        behaviorValidation: this.activeExampleBehaviorValidation
      }
    };
  }

  sceneConfig(overrides = {}) {
    const resetsDemoTime = Object.prototype.hasOwnProperty.call(overrides, 'demoTime') && Number(overrides.demoTime) === 0;
    const processTimingPatch = resetsDemoTime && !Object.prototype.hasOwnProperty.call(overrides, 'processGenerationIndex')
      ? { processGenerationIndex: 0, processTickAccumulator: 0, lastProcessStepTime: null }
      : {};
    return {
      distribution: this.distribution,
      seed: this.seed,
      eventLikelihood: this.eventLikelihood,
      eventLikelihoodDynamics: this.eventLikelihoodDynamics,
      eventLikelihoodTemporalPattern: this.eventLikelihoodTemporalPattern,
      eventLikelihoodSpatialEvolution: this.eventLikelihoodSpatialEvolution,
      hotspotCount: this.hotspotCount,
      clusterSize: this.clusterSize,
      noise: this.noise,
      timeMode: this.timeMode,
      spatialPattern: this.spatialPattern,
      valueDistribution: this.valueDistribution,
      temporalPattern: this.temporalPattern,
      temporalBehavior: this.temporalBehavior,
      evolutionModel: this.evolutionModel,
      patternEvolution: this.patternEvolution,
      spatialEvolution: this.spatialEvolution,
      motionScope: this.motionScope,
      interactionScale: this.interactionScale,
      stateModel: this.stateModel,
      depletionMode: this.depletionMode,
      displayMode: this.displayMode,
      viewFilters: this.viewFilters,
      dynamicComplexity: this.dynamicComplexity,
      patternSource: this.patternSource,
      processMode: this.processMode,
      exampleTrack: this.exampleTrack,
      exampleProcessId: this.exampleProcessId,
      foundationalCaModelId: this.foundationalCaModelId,
      oceanProcessAnalogId: this.oceanProcessAnalogId,
      exampleProcessModified: this.exampleProcessModified,
      behaviorPresetId: this.behaviorPresetId,
      behaviorPresetModified: this.behaviorPresetModified,
      referenceSignatureId: this.referenceSignatureId,
      referenceSignatureModified: this.referenceSignatureModified,
      updateRuleHint: this.updateRuleHint,
      modifiedComponent: this.modifiedComponent,
      forecastView: this.forecastView,
      timeSpeedScale: this.timeSpeedScale,
      playbackDirection: this.playbackDirection,
      paused: this.paused,
      demoTime: this.demoTime,
      processGenerationIndex: this.processGenerationIndex,
      processTickRate: this.processTickRate,
      processTickAccumulator: this.processTickAccumulator,
      processTickIntervalSeconds: this.processTickIntervalSeconds,
      lastProcessStepTime: this.lastProcessStepTime,
      processTiming: processTimingExportBlock(this.processTimingState()),
      selectedCell: this.selectedCell,
      rightPanelMode: this.rightPanelMode,
      selectedHelpTopic: this.selectedHelpTopic,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount,
      scenarioSourceMode: this.scenarioSourceMode,
      scenarioSeed: this.scenarioSeed,
      scenarioDifficulty: this.scenarioDifficulty,
      scenarioDuration: this.scenarioDuration,
      scenarioFrameCount: this.scenarioFrameCount,
      scenarioValidationMode: this.scenarioValidationMode,
      paintModel: this.paintModel,
      selectedPaintState: this.selectedPaintState,
      selectedPaintRuleId: this.selectedPaintRuleId,
      selectedPaintGroupId: this.selectedPaintGroupId,
      selectedPaintSourceValue: this.selectedPaintSourceValue,
      paintStartMode: this.paintStartMode,
      processPaintRunStarted: this.processPaintRunStarted,
      randomRuleSeed: this.randomRuleSeed,
      randomRuleMode: this.randomRuleMode,
      randomRuleGroupCount: this.randomRuleGroupCount,
      randomRuleActiveFraction: this.randomRuleActiveFraction,
      ...processTimingPatch,
      ...overrides
    };
  }

  modeControllerContext(overrides = {}) {
    return {
      processMode: this.processMode,
      patternSource: this.patternSource,
      behaviorPresetId: this.behaviorPresetId,
      behaviorPresetModified: this.behaviorPresetModified,
      referenceSignatureId: this.referenceSignatureId,
      exampleTrack: this.exampleTrack,
      exampleProcessId: this.exampleProcessId,
      foundationalCaModelId: this.foundationalCaModelId,
      oceanProcessAnalogId: this.oceanProcessAnalogId,
      exampleProcessModified: this.exampleProcessModified,
      referenceSignatureModified: this.referenceSignatureModified,
      updateRuleHint: this.updateRuleHint,
      selectedCell: this.selectedCell,
      rightPanelMode: this.rightPanelMode,
      paused: this.paused,
      processPaintRunStarted: this.processPaintRunStarted,
      paintStartMode: this.paintStartMode,
      paintModel: this.paintModel,
      displayMode: this.displayMode,
      demoTime: this.demoTime,
      processGenerationIndex: this.processGenerationIndex,
      processTickRate: this.processTickRate,
      processTickAccumulator: this.processTickAccumulator,
      processTickIntervalSeconds: this.processTickIntervalSeconds,
      lastProcessStepTime: this.lastProcessStepTime,
      selectedPaintState: this.selectedPaintState,
      selectedPaintRuleId: this.selectedPaintRuleId,
      selectedPaintGroupId: this.selectedPaintGroupId,
      selectedPaintSourceValue: this.selectedPaintSourceValue,
      randomRuleSeed: this.randomRuleSeed,
      randomRuleMode: this.randomRuleMode,
      randomRuleGroupCount: this.randomRuleGroupCount,
      randomRuleActiveFraction: this.randomRuleActiveFraction,
      ...overrides
    };
  }

  primitiveSceneConfig(overrides = {}) {
    const hasPreset = this.behaviorPresetId !== CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID;
    const hasReferenceSignature = this.referenceSignatureId !== CUSTOM_REFERENCE_SIGNATURE_ID;
    return this.sceneConfig({
      behaviorPresetModified: hasPreset ? true : false,
      referenceSignatureModified: hasReferenceSignature ? true : false,
      exampleProcessModified: hasReferenceSignature ? true : false,
      modifiedComponent: inferModifiedComponent(overrides),
      ...overrides
    });
  }

  applyPatternSource(patternSource) {
    if (patternSource === 'custom') {
      this.scene.restart(this.sceneConfig(buildPatternSourcePatch(this.modeControllerContext(), 'custom')));
      return;
    }
    const signatureId = this.referenceSignatureId !== CUSTOM_REFERENCE_SIGNATURE_ID ? this.referenceSignatureId : DEFAULT_REFERENCE_SIGNATURE_ID;
    this.applyReferenceSignature(signatureId);
  }

  applyProcessMode(processMode) {
    const mode = normalizeSamplingProcessMode(processMode);
    const patch = buildSamplingProcessModePatch(this.modeControllerContext({
      blankPaintModel: mode === 'processPaint'
        ? createBlankSamplingProcessPaintModel({ width: this.field?.width ?? 24, height: this.field?.height ?? 16 })
        : undefined
    }), mode);
    if (mode === 'processPaint') {
      Object.assign(this, patch);
      this.lastInspectorKey = '';
      this.rebuildField();
      this.renderConsole();
      this.updateTransportBar();
      this.renderCellInspector(true);
      this.draw();
      return;
    }
    this.scene.restart(this.sceneConfig(patch));
  }

  applyPaintSelection(patch = {}) {
    const ruleId = normalizeProcessRuleId(patch.ruleId ?? this.selectedPaintRuleId);
    const rule = processRuleById(ruleId);
    const state = rule.allowedStates.includes(patch.state ?? this.selectedPaintState)
      ? (patch.state ?? this.selectedPaintState)
      : rule.defaultInitialState;
    this.scene.restart(this.sceneConfig(buildProcessPaintSelectionPatch(this.modeControllerContext(), {
      ...patch,
      state,
      ruleId
    })));
  }

  paintSelectedCell(patch = {}) {
    if (!this.selectedCell) return;
    const model = createSamplingProcessPaintModel({ width: this.field?.width ?? 24, height: this.field?.height ?? 16, assignments: this.paintModel });
    const ruleId = normalizeProcessRuleId(patch.ruleId ?? this.selectedPaintRuleId);
    const rule = processRuleById(ruleId);
    const state = rule.allowedStates.includes(patch.state ?? this.selectedPaintState)
      ? (patch.state ?? this.selectedPaintState)
      : rule.defaultInitialState;
    assignSamplingProcessCell(model, this.selectedCell, {
      state,
      ruleId,
      groupId: patch.groupId ?? this.selectedPaintGroupId,
      sourceValue: patch.sourceValue ?? this.selectedPaintSourceValue
    });
    this.scene.restart(this.sceneConfig({
      processMode: 'processPaint',
      patternSource: 'custom',
      referenceSignatureId: CUSTOM_REFERENCE_SIGNATURE_ID,
      exampleTrack: null,
      exampleProcessId: null,
      foundationalCaModelId: null,
      oceanProcessAnalogId: null,
      exampleProcessModified: false,
      paintModel: model,
      selectedCell: this.selectedCell,
      rightPanelMode: 'cellInspector',
      demoTime: this.demoTime
    }));
  }

  clearSelectedPaintCell() {
    if (!this.selectedCell) return;
    const model = createSamplingProcessPaintModel({ width: this.field?.width ?? 24, height: this.field?.height ?? 16, assignments: this.paintModel });
    clearSamplingProcessCell(model, this.selectedCell);
    this.scene.restart(this.sceneConfig({ paintModel: model, selectedCell: this.selectedCell, processMode: 'processPaint', demoTime: this.demoTime }));
  }

  clearProcessPaintCanvas() {
    const model = clearSamplingProcessPaintModel(this.paintModel, { width: this.field?.width ?? 24, height: this.field?.height ?? 16 });
    this.app?.toast?.('Process Paint canvas cleared.', 'info');
    this.scene.restart(this.sceneConfig({
      paintModel: model,
      selectedCell: null,
      processMode: 'processPaint',
      patternSource: 'custom',
      referenceSignatureId: CUSTOM_REFERENCE_SIGNATURE_ID,
      exampleTrack: null,
      exampleProcessId: null,
      foundationalCaModelId: null,
      oceanProcessAnalogId: null,
      exampleProcessModified: false,
      paintStartMode: 'blankCanvas',
      processPaintRunStarted: false,
      paused: true,
      demoTime: 0,
      rightPanelMode: 'paintTools'
    }));
  }

  runProcessPaintCanvas() {
    this.paused = false;
    this.processPaintRunStarted = true;
    this.renderConsole();
    this.updateTransportBar();
    this.renderCellInspector(true);
    this.draw();
  }

  randomizeProcessAllocation(patch = {}) {
    const result = randomizeSamplingProcessAllocation({
      seed: patch.seed ?? this.randomRuleSeed,
      width: this.field?.width ?? 24,
      height: this.field?.height ?? 16,
      groupCount: patch.groupCount ?? this.randomRuleGroupCount,
      activeFraction: patch.activeFraction ?? this.randomRuleActiveFraction,
      mode: patch.mode ?? this.randomRuleMode
    });
    this.scene.restart(this.sceneConfig(buildRandomizedAllocationPatch(this.modeControllerContext(), result, patch)));
  }

  applyBehaviorPreset(behaviorPresetId) {
    const presetId = normalizeSampleFieldBehaviorPresetId(behaviorPresetId);
    const preset = sampleFieldBehaviorPresetById(presetId);
    if (!preset) {
      this.scene.restart(this.sceneConfig({
        ...buildCustomComposerPatch(this.modeControllerContext()),
        selectedHelpTopic: { groupId: 'behaviorPreset' },
        demoTime: 0
      }));
      return;
    }
    this.scene.restart(this.sceneConfig({
      ...preset.config,
      interactionScale: sampleFieldBehaviorPresetMetadata(preset.id).interactionScale,
      patternSource: 'legacyPreset',
      behaviorPresetId: preset.id,
      behaviorPresetModified: false,
      referenceSignatureId: sampleFieldBehaviorPresetMetadata(preset.id).referenceSignature?.id ?? CUSTOM_REFERENCE_SIGNATURE_ID,
      referenceSignatureModified: false,
      modifiedComponent: null,
      selectedHelpTopic: { groupId: 'behaviorPreset' },
      demoTime: 0
    }));
  }

  applyExampleTrack(track) {
    const nextTrack = normalizeSpatiotemporalProcessExampleTrack(track);
    const current = spatiotemporalProcessExampleById(this.exampleProcessId, this.exampleTrack);
    const nextExampleId = current?.track === nextTrack ? current.id : spatiotemporalProcessExamplesByTrack(nextTrack)[0]?.id;
    this.applyReferenceSignature(nextExampleId, nextTrack);
  }

  applyReferenceSignature(referenceSignatureId, track = this.exampleTrack) {
    const requestedMode = processModeForSpatiotemporalProcessExampleTrack(track ?? spatiotemporalProcessExampleTrackForMode(this.processMode) ?? this.exampleTrack);
    const active = resolveActiveSpatiotemporalProcessExample({
      exampleTrack: track,
      exampleProcessId: referenceSignatureId,
      referenceSignatureId,
      patternSource: 'referenceSignature',
      processMode: requestedMode,
      exampleProcessModified: false,
      referenceSignatureModified: false
    });
    const signatureId = normalizeReferenceSignatureId(active.referenceSignatureId ?? referenceSignatureId);
    const signature = referenceSignatureById(signatureId);
    if (!signature || active.isCustom) {
      this.scene.restart(this.sceneConfig({
        ...buildCustomComposerPatch(this.modeControllerContext()),
        selectedHelpTopic: null,
        rightPanelMode: 'recipeSignature',
        demoTime: 0
      }));
      return;
    }
    const processMode = processModeForSpatiotemporalProcessExampleTrack(active.exampleTrack);
    this.scene.restart(this.sceneConfig({
      ...referenceSignatureRecipe(signature.id),
      ...buildReferenceSignaturePatch(this.modeControllerContext({
        processMode,
        exampleTrack: active.exampleTrack,
        exampleProcessId: active.exampleProcessId,
        foundationalCaModelId: active.foundationalCaModelId,
        oceanProcessAnalogId: active.oceanProcessAnalogId
      }), active.exampleProcessId),
      patternSource: 'referenceSignature',
      processMode,
      exampleTrack: active.exampleTrack,
      exampleProcessId: active.exampleProcessId,
      foundationalCaModelId: active.foundationalCaModelId,
      oceanProcessAnalogId: active.oceanProcessAnalogId,
      referenceSignatureId: signature.id,
      referenceSignatureModified: false,
      exampleProcessModified: false,
      modifiedComponent: null,
      selectedCell: null,
      selectedHelpTopic: null,
      rightPanelMode: 'recipeSignature',
      demoTime: 0
    }));
  }

  applyComponentComparison(comparisonId) {
    const comparison = componentComparisonRecipe(comparisonId, this);
    this.scene.restart(this.sceneConfig({
      ...comparison.config,
      seed: comparison.seed,
      behaviorPresetId: CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
      behaviorPresetModified: false,
      patternSource: 'custom',
      referenceSignatureId: CUSTOM_REFERENCE_SIGNATURE_ID,
      exampleTrack: null,
      exampleProcessId: null,
      foundationalCaModelId: null,
      oceanProcessAnalogId: null,
      exampleProcessModified: false,
      referenceSignatureModified: false,
      updateRuleHint: null,
      modifiedComponent: comparison.modifiedComponent,
      selectedHelpTopic: { groupId: comparison.helpGroup },
      demoTime: 0,
      timeMode: 'dynamic'
    }));
  }

  applyViewFilters(patch = {}) {
    const nextFilters = normalizeRoiDemoViewFilters(mergeViewFilterPatch(this.viewFilters, patch));
    this.scene.restart(this.sceneConfig({
      viewFilters: nextFilters,
      demoTime: this.demoTime,
      selectedCell: this.selectedCell,
      rightPanelMode: this.rightPanelMode
    }));
  }

  rebuildField() {
    this.field = createDemoRoiField({ ...this.sceneConfig(), time: this.usesDiscreteProcessClock() ? 0 : this.demoTime });
    this.processLayers = this.buildProcessLayers();
    if (this.usesDiscreteProcessClock()) {
      this.initializeDiscreteProcessField();
    } else if (this.processMode === 'processPaint') {
      this.applyProcessPaintCanvasField();
    }
    this.maybeLogFieldDynamics();
  }

  buildProcessLayers() {
    const guidedLayers = this.buildGuidedExampleProcessLayers(this.field, { updateSceneState: true });
    if (guidedLayers) return guidedLayers;
    this.clearGuidedExampleBehaviorState();
    return buildSamplingProcessLayersForField({
      field: this.field,
      paintModel: this.paintModel,
      processMode: this.processMode,
      updateRuleHint: this.updateRuleHint
    });
  }

  buildGuidedExampleProcessLayers(field = this.field, { updateSceneState = false } = {}) {
    if (!['foundationalCaModels', 'oceanProcessAnalogs'].includes(this.processMode)) return null;
    if (this.patternSource !== 'referenceSignature') return null;
    const activeExample = this.activeProcessExampleState();
    if (activeExample.isCustom || !activeExample.sourceExample) return null;
    const fixtureBuild = buildExampleInitialLayers(activeExample.sourceExample, {
      width: field?.width ?? 24,
      height: field?.height ?? 16,
      seed: this.seed
    });
    const behaviorValidation = evaluateSamplingProcessExampleBehavior(activeExample.sourceExample, {
      fixtureBuild,
      seed: this.seed
    });
    if (updateSceneState) {
      this.activeExampleFixture = fixtureBuild.fixture;
      this.activeExampleFixtureValidation = fixtureBuild.validation;
      this.activeExampleBehaviorValidation = behaviorValidation;
    }
    return fixtureBuild.layers;
  }

  clearGuidedExampleBehaviorState() {
    this.activeExampleFixture = null;
    this.activeExampleFixtureValidation = null;
    this.activeExampleBehaviorValidation = null;
  }

  applyProcessPaintCanvasField() {
    const result = buildSamplingProcessPaintField({
      baseField: this.field,
      processLayers: this.processLayers,
      paintModel: this.paintModel,
      seed: this.seed,
      demoTime: this.demoTime,
      generationIndex: this.processGenerationIndex,
      processPaintRunStarted: this.processPaintRunStarted,
      paused: this.paused,
      paintStartMode: this.paintStartMode,
      displayMode: 'nodeStates'
    });
    this.field = result.field;
    this.processLayers = result.processLayers;
  }

  maybeLogFieldDynamics() {
    if (!this.field?.activityDiagnostics) return;
    const diagnostics = this.field.activityDiagnostics;
    const key = `${Math.floor((diagnostics.time ?? 0) * 10)}:${diagnostics.temporalPattern}:${diagnostics.spatialEvolution}:${diagnostics.samplingEffect}:${diagnostics.totalActivityMass}`;
    if (!this.field?.activityDiagnostics || key === this.lastDynamicsDebugKey) return;
    this.lastDynamicsDebugKey = key;
    if (globalThis.ANCHOR_DEBUG_ROI_DYNAMICS) {
      console.debug('[ROIDemo][FieldDynamics]', diagnostics);
    }
    if (globalThis.ANCHOR_DEBUG_ROI_COMPOSER && this.behaviorPresetId === 'recurringHotspots') {
      console.debug('[ROI][RecurringHotspots]', diagnostics.recurringHotspots ?? diagnostics);
    }
    if (globalThis.ANCHOR_DEBUG_ROI_PRESETS && this.behaviorPresetId !== CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID) {
      const previousTime = Math.max(0, this.demoTime - 1);
      const previousField = createDemoRoiField({ ...this.sceneConfig(), time: previousTime, demoTime: previousTime });
      const delta = meanFieldDelta(previousField.sampleValueField ?? previousField.field, this.field.sampleValueField ?? this.field.field);
      console.debug('[ROIDemo][PresetAudit]', {
        presetId: this.behaviorPresetId,
        time: diagnostics.time,
        meanValue: diagnostics.meanValue,
        maxValue: diagnostics.maxValue,
        activeCellFraction: diagnostics.activeFraction,
        highValueCellFraction: this.field?.stats ? highValueFraction(this.field.sampleValueField ?? this.field.field, 0.68) : 0,
        totalActivityMass: diagnostics.totalActivityMass,
        frameDelta: delta,
        extinctionWarning: diagnostics.activeFraction < 0.02,
        saturationWarning: diagnostics.activeFraction > 0.98 && diagnostics.maxValue - diagnostics.meanValue < 0.08,
        staticWarning: this.timeMode === 'dynamic' && delta < 0.012
      });
    }
  }

  renderConsole() {
    const state = buildSamplingProcessConsoleState(this.consoleViewModelContext());
    const handlers = buildSamplingProcessConsoleHandlers(this);
    this.app.console?.renderRoiDemoControls?.(state, handlers);
    this.updateRoiUiDebug();
  }

  handleSamplingDistributionChange(distribution) {
    const defaults = roiDemoDistributionDefaults(distribution);
    this.scene.restart(this.primitiveSceneConfig({
      distribution,
      eventLikelihood: defaults.eventLikelihood ?? this.eventLikelihood,
      eventLikelihoodDynamics: this.eventLikelihoodDynamics,
      eventLikelihoodTemporalPattern: this.eventLikelihoodTemporalPattern,
      eventLikelihoodSpatialEvolution: this.eventLikelihoodSpatialEvolution,
      spatialPattern: defaults.spatialPattern,
      valueDistribution: defaults.valueDistribution,
      temporalPattern: defaults.temporalPattern,
      temporalBehavior: defaults.temporalBehavior,
      evolutionModel: defaults.spatialEvolution ?? defaults.evolutionModel,
      patternEvolution: defaults.spatialEvolution ?? defaults.evolutionModel,
      spatialEvolution: defaults.spatialEvolution ?? defaults.evolutionModel,
      timeMode: defaults.temporalBehavior === 'static' ? 'static' : this.timeMode,
      demoTime: 0
    }));
  }

  handleSamplingSeedChange(seed) {
    this.seed = String(seed ?? 'anchor-roi-demo').trim() || 'anchor-roi-demo';
    this.scene.restart(this.primitiveSceneConfig({ seed: this.seed, demoTime: 0 }));
  }

  handleSamplingEventLikelihoodChange(eventLikelihood) {
    this.scene.restart(this.primitiveSceneConfig({ eventLikelihood, demoTime: 0 }));
  }

  handleSamplingEventLikelihoodDynamicsChange(eventLikelihoodDynamics) {
    this.scene.restart(this.primitiveSceneConfig({
      eventLikelihoodDynamics,
      eventLikelihoodTemporalPattern: eventLikelihoodDynamics === 'dynamic' ? this.eventLikelihoodTemporalPattern : 'static',
      eventLikelihoodSpatialEvolution: eventLikelihoodDynamics === 'dynamic' ? this.eventLikelihoodSpatialEvolution : 'stationary',
      demoTime: 0
    }));
  }

  handleSamplingEventLikelihoodTemporalPatternChange(eventLikelihoodTemporalPattern) {
    this.scene.restart(this.primitiveSceneConfig({ eventLikelihoodTemporalPattern, eventLikelihoodDynamics: 'dynamic', demoTime: 0 }));
  }

  handleSamplingEventLikelihoodSpatialEvolutionChange(eventLikelihoodSpatialEvolution) {
    this.scene.restart(this.primitiveSceneConfig({ eventLikelihoodSpatialEvolution, eventLikelihoodDynamics: 'dynamic', demoTime: 0 }));
  }

  handleSamplingHotspotCountChange(hotspotCount) {
    this.scene.restart(this.primitiveSceneConfig({ hotspotCount: Number(hotspotCount), demoTime: 0 }));
  }

  handleSamplingClusterSizeChange(clusterSize) {
    this.scene.restart(this.primitiveSceneConfig({ clusterSize, demoTime: 0 }));
  }

  handleSamplingNoiseChange(noise) {
    this.scene.restart(this.primitiveSceneConfig({ noise: Number(noise), demoTime: 0 }));
  }

  handleSamplingTimeModeChange(timeMode) {
    this.scene.restart(this.primitiveSceneConfig({ timeMode, demoTime: 0 }));
  }

  handleSamplingSpatialPatternChange(spatialPattern) {
    this.scene.restart(this.primitiveSceneConfig({ spatialPattern, demoTime: 0 }));
  }

  handleSamplingValueDistributionChange(valueDistribution) {
    this.scene.restart(this.primitiveSceneConfig({ valueDistribution, demoTime: 0 }));
  }

  handleSamplingTemporalPatternChange(temporalPattern) {
    this.scene.restart(this.primitiveSceneConfig({ temporalPattern, timeMode: temporalPattern === 'static' ? 'static' : 'dynamic', demoTime: 0 }));
  }

  handleSamplingTemporalBehaviorChange(temporalBehavior) {
    this.scene.restart(this.primitiveSceneConfig({ temporalBehavior, timeMode: temporalBehavior === 'static' ? 'static' : 'dynamic', demoTime: 0 }));
  }

  handleSamplingEvolutionModelChange(evolutionModel) {
    this.scene.restart(this.primitiveSceneConfig({ evolutionModel, demoTime: 0 }));
  }

  handleSamplingPatternEvolutionChange(patternEvolution) {
    this.scene.restart(this.primitiveSceneConfig({ patternEvolution, spatialEvolution: patternEvolution, evolutionModel: patternEvolution, demoTime: 0 }));
  }

  handleSamplingSpatialEvolutionChange(spatialEvolution) {
    this.scene.restart(this.primitiveSceneConfig({ spatialEvolution, patternEvolution: spatialEvolution, evolutionModel: spatialEvolution, demoTime: 0 }));
  }

  handleSamplingMotionScopeChange(motionScope) {
    this.scene.restart(this.primitiveSceneConfig({ motionScope, demoTime: 0 }));
  }

  handleSamplingInteractionScaleChange(interactionScale) {
    this.scene.restart(this.primitiveSceneConfig({ interactionScale, demoTime: 0 }));
  }

  handleSamplingStateModelChange(stateModel) {
    this.scene.restart(this.primitiveSceneConfig({ stateModel, demoTime: 0 }));
  }

  handleSamplingDynamicComplexityChange(dynamicComplexity) {
    this.scene.restart(this.primitiveSceneConfig({ dynamicComplexity, demoTime: 0 }));
  }

  handleSamplingDepletionModeChange(depletionMode) {
    this.scene.restart(this.primitiveSceneConfig({ depletionMode, demoTime: 0 }));
  }

  handleSamplingDisplayModeChange(displayMode) {
    this.scene.restart(this.primitiveSceneConfig({
      displayMode,
      demoTime: this.demoTime,
      processGenerationIndex: this.processGenerationIndex,
      processTickAccumulator: this.processTickAccumulator
    }));
  }

  handleSamplingTimeSpeedScaleChange(timeSpeedScale) {
    this.timeSpeedScale = Number(timeSpeedScale) || 1;
    this.renderConsole();
    this.updateTransportBar();
  }

  handleProcessTickRateChange(tickRate) {
    this.processTickRate = normalizeProcessTickRate(tickRate);
    this.processTickIntervalSeconds = processTickIntervalSeconds(this.processTickRate);
    this.processTickAccumulator = 0;
    this.renderConsole();
    this.updateTransportBar();
    this.renderCellInspector(true);
  }

  handleSamplingRegenerate() {
    this.scene.restart(this.primitiveSceneConfig({ seed: nextSeed(this.seed), demoTime: 0 }));
  }

  handleSamplingPause() {
    this.paused = !this.paused;
    if (this.usesDiscreteProcessClock()) this.processTickAccumulator = 0;
    if (this.processMode === 'processPaint' && !this.paused) this.processPaintRunStarted = true;
    this.renderConsole();
    this.updateTransportBar();
    this.renderCellInspector(true);
  }

  handleSamplingMainMenu() {
    this.scene.start('MainMenuScene');
  }

  consoleViewModelContext() {
    return {
      title: this.title(),
      field: this.field,
      sceneConfig: this.sceneConfig(),
      distribution: this.distribution,
      seed: this.seed,
      eventLikelihood: this.eventLikelihood,
      eventLikelihoodDynamics: this.eventLikelihoodDynamics,
      eventLikelihoodTemporalPattern: this.eventLikelihoodTemporalPattern,
      eventLikelihoodSpatialEvolution: this.eventLikelihoodSpatialEvolution,
      hotspotCount: this.hotspotCount,
      clusterSize: this.clusterSize,
      noise: this.noise,
      timeMode: this.timeMode,
      spatialPattern: this.spatialPattern,
      valueDistribution: this.valueDistribution,
      temporalPattern: this.temporalPattern,
      temporalBehavior: this.temporalBehavior,
      evolutionModel: this.evolutionModel,
      patternEvolution: this.patternEvolution,
      spatialEvolution: this.spatialEvolution,
      motionScope: this.motionScope,
      interactionScale: this.interactionScale,
      stateModel: this.stateModel,
      depletionMode: this.depletionMode,
      displayMode: this.displayMode,
      viewFilters: this.viewFilters,
      dynamicComplexity: this.dynamicComplexity,
      patternSource: this.patternSource,
      processMode: this.processMode,
      exampleTrack: this.exampleTrack,
      exampleProcessId: this.exampleProcessId,
      foundationalCaModelId: this.foundationalCaModelId,
      oceanProcessAnalogId: this.oceanProcessAnalogId,
      exampleProcessModified: this.exampleProcessModified,
      behaviorPresetId: this.behaviorPresetId,
      behaviorPresetModified: this.behaviorPresetModified,
      referenceSignatureId: this.referenceSignatureId,
      referenceSignatureModified: this.referenceSignatureModified,
      updateRuleHint: this.updateRuleHint,
      modifiedComponent: this.modifiedComponent,
      forecastView: this.forecastView,
      timeSpeedScale: this.timeSpeedScale,
      playbackDirection: this.playbackDirection,
      demoTime: this.demoTime,
      paused: this.paused,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount,
      scenarioSourceMode: this.scenarioSourceMode,
      scenarioSeed: this.scenarioSeed,
      scenarioDifficulty: this.scenarioDifficulty,
      scenarioDuration: this.scenarioDuration,
      scenarioFrameCount: this.scenarioFrameCount,
      scenarioValidationMode: this.scenarioValidationMode,
      generatedScenario: this.generatedScenario,
      paintModel: this.paintModel,
      paintStartMode: this.paintStartMode,
      processPaintRunStarted: this.processPaintRunStarted,
      selectedPaintState: this.selectedPaintState,
      selectedPaintRuleId: this.selectedPaintRuleId,
      selectedPaintGroupId: this.selectedPaintGroupId,
      selectedPaintSourceValue: this.selectedPaintSourceValue,
      randomRuleSeed: this.randomRuleSeed,
      randomRuleMode: this.randomRuleMode,
      randomRuleGroupCount: this.randomRuleGroupCount,
      randomRuleActiveFraction: this.randomRuleActiveFraction,
      processGenerationIndex: this.processGenerationIndex,
      processTickRate: this.processTickRate,
      processTickAccumulator: this.processTickAccumulator,
      processTickIntervalSeconds: this.processTickIntervalSeconds,
      lastProcessStepTime: this.lastProcessStepTime,
      usesDiscreteProcessClock: this.usesDiscreteProcessClock(),
      processDisplayMetric: this.field?.processDisplayMetric ?? null,
      metricLegend: this.field?.metricLegend ?? this.field?.processDisplayMetric?.legend ?? [],
      uiVersion: ROI_UI_VERSION,
      referenceSignatureCount: ROI_REFERENCE_SIGNATURES.length,
      legacyPresetCount: SAMPLE_FIELD_BEHAVIOR_PRESETS.length,
      legacyPresetsVisible: Boolean(globalThis.ANCHOR_DEBUG_ROI_LEGACY_PRESETS)
    };
  }

  updateRoiUiDebug() {
    const consoleRoot = this.app?.elements?.missionConsoleRoot ?? this.app?.elements?.missionConsole ?? globalThis.document?.getElementById?.('mission-console');
    const accordionLabels = Array.from(consoleRoot?.querySelectorAll?.('.console-section h2, .accordion-toggle, [data-accordion-key] > button') ?? [])
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const activeExample = this.activeProcessExampleState();
    const activeSignature = referenceSignatureById(activeExample.referenceSignatureId ?? this.referenceSignatureId);
    const activePreset = sampleFieldBehaviorPresetById(this.behaviorPresetId);
    const selectorProcessMode = consoleRoot?.querySelector?.('#sampling-process-mode')?.value ?? null;
    const selectorExampleTrack = consoleRoot?.querySelector?.('#sampling-process-example-track')?.value ?? null;
    const selectorExampleProcessId = consoleRoot?.querySelector?.('#sampling-process-example-id')?.value ?? null;
    const rightPanelText = this.app?.elements?.waypointTimelineRoot?.textContent ?? '';
    const activeProcessContext = activeExample.isCustom
      ? this.processMode
      : processModeForSpatiotemporalProcessExampleTrack(activeExample.exampleTrack);
    const activeProcessContextLabel = samplingProcessModeLabel(activeProcessContext);
    const selectorModeMatchesActiveExample = activeExample.isCustom
      ? selectorProcessMode === this.processMode
      : selectorProcessMode === activeProcessContext;
    const selectorMatchesActiveExample = activeExample.isCustom
      ? selectorExampleProcessId == null
      : selectorExampleProcessId === activeExample.exampleProcessId;
    const rightPanelMatchesActiveExample = activeExample.isCustom
      || (rightPanelText.includes(activeExample.exampleProcessLabel ?? '') && rightPanelText.includes(activeExample.referenceSignatureLabel ?? ''));
    const legacyReferenceMappingConsistent = activeExample.isCustom || activeExample.referenceSignatureId === this.referenceSignatureId;
    globalThis.ANCHOR_ROI_UI_DEBUG = {
      uiVersion: ROI_UI_VERSION,
      referenceSignatureCount: ROI_REFERENCE_SIGNATURES.length,
      referenceSignatureLabels: ROI_REFERENCE_SIGNATURES.map((signature) => signature.label),
      legacyPresetCount: SAMPLE_FIELD_BEHAVIOR_PRESETS.length,
      legacyPresetLabels: SAMPLE_FIELD_BEHAVIOR_PRESETS.map((preset) => preset.label),
      legacyPresetsVisible: Boolean(globalThis.ANCHOR_DEBUG_ROI_LEGACY_PRESETS),
      processMode: this.processMode,
      visibleWorkflowModes: [...SAMPLING_PROCESS_VISIBLE_MODES],
      diagnosticsAvailableAsView: true,
      activePatternSource: this.patternSource,
      activeProcessContext,
      activeProcessContextLabel,
      activeExampleTrack: activeExample.exampleTrack,
      activeExampleTrackLabel: activeExample.exampleTrackLabel,
      activeExampleProcessId: activeExample.exampleProcessId,
      activeExampleProcessLabel: activeExample.exampleProcessLabel,
      activeExampleType: activeExample.exampleType,
      activeFoundationalCaModelId: activeExample.foundationalCaModelId,
      activeOceanProcessAnalogId: activeExample.oceanProcessAnalogId,
      activeMappedReferenceSignatureId: activeExample.referenceSignatureId,
      activeMappedReferenceSignatureLabel: activeExample.referenceSignatureLabel,
      activeObservableProcessPatternTags: activeExample.observableProcessPatternTags,
      activeImplementationFidelity: activeExample.implementationFidelity,
      activeRequiresFlowCoupling: activeExample.requiresFlowCoupling,
      activeExampleFixtureId: this.activeExampleFixture?.id ?? null,
      activeExampleFixtureLabel: this.activeExampleFixture?.label ?? null,
      activeExampleInitialMeaningfulCellCount: this.activeExampleBehaviorValidation?.metrics?.initialMeaningfulCellCount ?? null,
      activeExampleBehaviorValidationStatus: this.activeExampleBehaviorValidation?.status ?? null,
      activeExampleBehaviorValidationLabel: this.activeExampleBehaviorValidation?.label ?? null,
      activeExampleBehaviorValidationDetails: this.activeExampleBehaviorValidation?.details ?? [],
      activeExampleDistinctStatesSeen: this.activeExampleBehaviorValidation?.metrics?.distinctStatesSeen ?? [],
      activeExampleGenerationCount: this.activeExampleBehaviorValidation?.metrics?.generationCount ?? null,
      activeExampleTransitionCount: this.activeExampleBehaviorValidation?.metrics?.transitionCount ?? null,
      exampleProcessModified: activeExample.isModified,
      selectorProcessMode,
      selectorExampleTrack,
      selectorExampleProcessId,
      selectorModeMatchesActiveExample,
      selectorMatchesActiveExample,
      rightPanelMatchesActiveExample,
      exportFieldsExpected: {
        processExample: !activeExample.isCustom,
        referenceSignatureId: activeExample.referenceSignatureId,
        exampleTrack: activeExample.exampleTrack,
        exampleProcessId: activeExample.exampleProcessId
      },
      legacyReferenceMappingConsistent,
      hasExampleTrackSelector: Boolean(consoleRoot?.querySelector?.('#sampling-process-example-track')),
      hasTrackSpecificExampleSelector: Boolean(consoleRoot?.querySelector?.('#sampling-process-example-id')), 
      activeReferenceSignatureId: activeSignature ? activeSignature.id : null,
      activeReferenceSignatureLabel: activeSignature ? activeSignature.label : null,
      referenceSignatureModified: this.referenceSignatureModified,
      activeLegacyPresetId: this.patternSource === 'legacyPreset' ? this.behaviorPresetId : null,
      activeLegacyPresetLabel: this.patternSource === 'legacyPreset' ? activePreset?.label ?? null : null,
      hasValueDistributionAccordion: accordionLabels.some((label) => /^(?:\d+\.\s*)?Value Distribution\b/.test(label)),
      accordionLabels,
      rightPanelMode: this.rightPanelMode,
      activeUpdateRuleHint: this.updateRuleHint
    };
  }

  buildSceneObjects() {
    this.destroyObjects();
    this.graphics = this.add.graphics();
    this.objects.push(this.graphics);
    this.titleText = this.add.text(0, 0, this.title(), {
      fontFamily: 'system-ui',
      fontSize: '28px',
      fontStyle: '700',
      color: '#eef6ff'
    }).setOrigin(0, 0);
    this.subtitleText = this.add.text(0, 0, this.subtitle(), {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#9cb4d8',
      wordWrap: { width: 760 }
    }).setOrigin(0, 0);
    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#d7f7cc'
    }).setOrigin(0, 0);
    this.objects.push(this.titleText, this.subtitleText, this.statusText);
  }

  layout() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(24, Math.min(52, width * 0.045));
    const top = Math.max(24, Math.min(44, height * 0.06));
    const mapTop = top + 112;
    const mapHeight = Math.max(260, height - mapTop - 118);
    const mapWidth = Math.max(320, width - margin * 2);
    return {
      width,
      height,
      margin,
      top,
      map: {
        x: margin,
        y: mapTop,
        width: mapWidth,
        height: mapHeight
      }
    };
  }

  draw() {
    if (!this.graphics || !this.field) return;
    if (this.processMode === 'processPaint' && !this.selectedCell && this.rightPanelMode === 'recipeSignature') {
      this.rightPanelMode = 'paintTools';
      this.lastInspectorKey = '';
      this.renderCellInspector(true);
    }
    const layout = this.layout();
    this.graphics.clear();
    this.drawBackground(layout);
    const renderContext = this.samplingProcessRenderContext(layout.map);
    drawSamplingProcessHeatmap(renderContext);
    if (!isGraphDisplayMode(this.field.displayMode)) drawHighValueMarkers(renderContext);
    drawSelectedSamplingCell(renderContext);
    this.layoutText(layout);
    this.updateTransportBar();
    this.renderCellInspector();
  }

  samplingProcessRenderContext(map) {
    return {
      graphics: this.graphics,
      field: this.field,
      map,
      viewFilters: this.viewFilters,
      selectedCell: this.selectedCell,
      demoTime: this.demoTime
    };
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x08101d, 0x12351f, 0x152a3c, 0x06101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x081827, 0.96);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x7ebf78, 0.52);
    this.graphics.strokeRoundedRect(map.x, map.y, map.width, map.height, 8);
  }

  layoutText({ margin, top, map }) {
    this.titleText?.setPosition(margin, top);
    this.subtitleText?.setPosition(margin, top + 42);
    this.subtitleText?.setWordWrapWidth(Math.min(780, map.width));
    const stats = this.field?.stats ?? {};
    const diagnostics = this.field?.activityDiagnostics ?? {};
    const stateModel = this.field?.stateModel ?? roiStateModelForEvolutionModel(this.field?.evolutionModel ?? this.evolutionModel);
    const warningText = diagnostics.diagnosticWarnings?.length ? ` | warnings ${diagnostics.diagnosticWarnings.join(', ')}` : '';
    const graph = diagnostics.graphDiagnostics ?? this.field?.graphField?.diagnostics;
    if (this.processMode === 'processPaint') {
      const paintValidation = validateSamplingProcessPaintModel(this.paintModel);
      this.statusText?.setText(`Process Paint Â· ${this.paused ? 'Paused editing canvas' : 'Running painted process'} Â· Painted cells: ${paintValidation.paintedCellCount} Â· Rule: ${this.selectedPaintRuleId} Â· Group: ${this.selectedPaintGroupId}`);
      this.statusText?.setWordWrapWidth(Math.min(1040, map.width));
      this.statusText?.setPosition(margin, map.y + map.height + 18);
      return;
    }
    const modeLabel = ['foundationalCaModels', 'oceanProcessAnalogs', 'referenceSignature'].includes(this.processMode)
      ? `${samplingProcessModeLabel(this.processMode)}: ${spatiotemporalProcessExampleLabel(this.exampleProcessId)}`
      : samplingProcessModeLabel(this.processMode);
    const baseStatus = `${modeLabel} Â· ${roiTemporalPatternLabel(this.field?.temporalPattern ?? this.temporalPattern)} Â· ${roiSpatialEvolutionLabel(this.field?.spatialEvolution ?? this.spatialEvolution)} Â· ${roiDisplayModeLabel(this.field?.displayMode ?? this.displayMode)} Â· t=${this.demoTime.toFixed(1)}s`;
    const compactMetrics = `Mean ${formatStat(diagnostics.meanValue ?? stats.mean)} Â· Active ${formatPercent(diagnostics.activeFraction)} Â· High ${formatPercent(diagnostics.highValueFraction)} Â· Max ${formatStat(diagnostics.maxValue ?? stats.max)}`;
    const diagnosticsStatus = this.processMode === 'diagnosticsGraphInspection' && graph
      ? ` Â· Graph ${graph.updateRule} Â· States ${formatGraphStateSummary(graph.stateCounts)} Â· Messages ${formatStat(graph.edgeMessageTotal)}${warningText}`
      : '';
    this.statusText?.setText(`${baseStatus} Â· ${compactMetrics} Â· State ${roiStateModelLabel(stateModel)} Â· Sampling ${roiDepletionModeLabel(this.field?.depletionMode ?? this.depletionMode)}${diagnosticsStatus}`);
    this.statusText?.setWordWrapWidth(Math.min(1040, map.width));
    this.statusText?.setPosition(margin, map.y + map.height + 18);
  }

  destroyObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
  }

  bindInputHandlers() {
    this.input?.off?.('pointerdown', this.handlePointerDown, this);
    this.input?.on?.('pointerdown', this.handlePointerDown, this);
  }

  unbindInputHandlers() {
    this.input?.off?.('pointerdown', this.handlePointerDown, this);
  }

  handlePointerDown(pointer) {
    const cell = this.cellFromPointer(pointer);
    if (!cell) return;
    if (this.processMode === 'processPaint') {
      this.selectedCell = cell;
      this.rightPanelMode = 'cellInspector';
      const model = createSamplingProcessPaintModel({ width: this.field?.width ?? 24, height: this.field?.height ?? 16, assignments: this.paintModel });
      assignSamplingProcessCell(model, cell, {
        state: this.selectedPaintState,
        ruleId: this.selectedPaintRuleId,
        groupId: this.selectedPaintGroupId,
        sourceValue: this.selectedPaintSourceValue
      });
      this.paintModel = model;
      this.rebuildField();
      this.lastInspectorRenderTime = -Infinity;
      this.renderConsole();
      this.renderCellInspector(true);
      this.draw();
      return;
    }
    if (this.selectedCell && this.selectedCell.col === cell.col && this.selectedCell.row === cell.row) {
      this.selectedCell = null;
      this.rightPanelMode = 'recipeSignature';
    } else {
      this.selectedCell = cell;
      this.rightPanelMode = 'cellInspector';
    }
    this.lastInspectorRenderTime = -Infinity;
    this.renderCellInspector(true);
    this.draw();
  }

  showBehaviorHelp(groupId) {
    this.rightPanelMode = 'behaviorHelp';
    this.selectedHelpTopic = {
      groupId,
      optionId: this.helpOptionForGroup(groupId)
    };
    this.lastInspectorRenderTime = -Infinity;
    this.renderCellInspector(true);
  }

  helpOptionForGroup(groupId) {
    return {
      behaviorPreset: this.behaviorPresetId,
      eventLikelihood: this.field?.eventLikelihood ?? this.eventLikelihood,
      spatialPattern: this.field?.pureSpatialPattern ?? this.spatialPattern,
      valueDistribution: this.field?.valueDistribution ?? this.valueDistribution,
      temporalPattern: this.field?.temporalPattern ?? this.temporalPattern,
      spatialEvolution: this.field?.spatialEvolution ?? this.spatialEvolution,
      interactionScale: this.field?.interactionScale ?? this.interactionScale,
      stateModel: this.field?.stateModel ?? this.stateModel,
      samplingEffect: this.field?.depletionMode ?? this.depletionMode,
      displayLayer: this.field?.displayMode ?? this.displayMode
    }[groupId] ?? null;
  }

  cellFromPointer(pointer) {
    const map = this.layout().map;
    const x = Number(pointer?.x);
    const y = Number(pointer?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !this.field) return null;
    if (x < map.x || y < map.y || x > map.x + map.width || y > map.y + map.height) return null;
    const col = Math.max(0, Math.min(this.field.width - 1, Math.floor(((x - map.x) / map.width) * this.field.width)));
    const row = Math.max(0, Math.min(this.field.height - 1, Math.floor(((y - map.y) / map.height) * this.field.height)));
    return { col, row, x: col, y: row };
  }

  renderTransportBar() {
    const root = this.app?.elements?.overlay?.bottomTimeline;
    if (!root) return;
    root.innerHTML = `
      <section class="hud-panel flow-demo-transport roi-demo-transport" aria-label="Deterministic Spatiotemporal Process Lab transport controls">
        <div class="timeline-buttons flow-demo-transport-actions">
          <button type="button" data-action="roi-demo-reset">Reset</button>
          <button type="button" data-action="roi-demo-step-generation">Step Generation</button>
          <button type="button" data-action="roi-demo-direction">Direction: Forward</button>
          <button type="button" data-action="roi-demo-pause">Pause</button>
        </div>
        <div class="timeline-readout flow-demo-time-readout">
          <strong data-roi-demo-time>Demo Time: 0.0 s</strong>
          <span class="hud-muted" data-roi-demo-state>Deterministic process field</span>
        </div>
        <div class="flow-demo-transport-summary">
          <span data-roi-demo-speed>Playback: 1x</span>
          <label class="compact-field roi-demo-tick-rate-field">
            <span>Tick Rate</span>
            <select data-roi-demo-tick-rate>
              ${SAMPLING_PROCESS_TICK_RATES.map((rate) => `<option value="${rate}">${rate} gen/s</option>`).join('')}
            </select>
          </label>
          <span data-roi-demo-behavior>Behavior: Bursty Bloom</span>
          <span>Infinite timeline</span>
        </div>
      </section>
    `;
    this.transportRefs = {
      root,
      stepButton: root.querySelector('[data-action="roi-demo-step-generation"]'),
      directionButton: root.querySelector('[data-action="roi-demo-direction"]'),
      pauseButton: root.querySelector('[data-action="roi-demo-pause"]'),
      time: root.querySelector('[data-roi-demo-time]'),
      state: root.querySelector('[data-roi-demo-state]'),
      speed: root.querySelector('[data-roi-demo-speed]'),
      tickRate: root.querySelector('[data-roi-demo-tick-rate]'),
      behavior: root.querySelector('[data-roi-demo-behavior]')
    };
    this.bindTransportControls(root);
    this.updateTransportBar();
  }

  bindTransportControls(root = this.transportRefs?.root) {
    if (!root) return;
    root.onclick = (event) => {
      const button = event.target?.closest?.('[data-action]');
      if (!button || !root.contains(button)) return;
      this.handleTransportAction(button.dataset.action, event);
    };
    root.onchange = (event) => {
      const tickRate = event.target?.closest?.('[data-roi-demo-tick-rate]');
      if (!tickRate || !root.contains(tickRate)) return;
      this.handleProcessTickRateChange(tickRate.value);
    };
  }

  bindDocumentTransportControls() {
    if (this.boundDocumentTransportClick) {
      document.removeEventListener('click', this.boundDocumentTransportClick, true);
    }
    this.boundDocumentTransportClick = (event) => {
      if (!this.scene?.isActive?.()) return;
      const button = event.target?.closest?.('[data-action]');
      const root = this.app?.elements?.overlay?.bottomTimeline;
      if (!button || !root?.contains(button)) return;
      if (!['roi-demo-reset', 'roi-demo-step-generation', 'roi-demo-direction', 'roi-demo-pause'].includes(button.dataset.action)) return;
      this.handleTransportAction(button.dataset.action, event);
    };
    document.addEventListener('click', this.boundDocumentTransportClick, true);
    this.events?.once?.('shutdown', () => {
      if (this.boundDocumentTransportClick) {
        document.removeEventListener('click', this.boundDocumentTransportClick, true);
        this.boundDocumentTransportClick = null;
      }
    });
  }

  handleTransportAction(action, event = null) {
    if (!['roi-demo-reset', 'roi-demo-step-generation', 'roi-demo-direction', 'roi-demo-pause'].includes(action)) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    if (action === 'roi-demo-reset') {
      this.resetDemoState();
      return;
    }
    if (action === 'roi-demo-step-generation') {
      this.stepProcessGeneration({ render: true, updateUi: true });
      return;
    }
    if (action === 'roi-demo-direction') {
      this.togglePlaybackDirection();
      return;
    }
    this.paused = !this.paused;
    if (this.usesDiscreteProcessClock()) this.processTickAccumulator = 0;
    if (this.processMode === 'processPaint' && !this.paused) this.processPaintRunStarted = true;
    this.renderConsole();
    this.updateTransportBar();
    this.renderCellInspector(true);
    this.draw();
  }

  updateTransportBar() {
    const refs = this.transportRefs ?? {};
    if (!refs.root?.isConnected) return;
    refs.stepButton = refs.root.querySelector('[data-action="roi-demo-step-generation"]');
    refs.directionButton = refs.root.querySelector('[data-action="roi-demo-direction"]');
    refs.pauseButton = refs.root.querySelector('[data-action="roi-demo-pause"]');
    refs.time = refs.root.querySelector('[data-roi-demo-time]');
    refs.state = refs.root.querySelector('[data-roi-demo-state]');
    refs.speed = refs.root.querySelector('[data-roi-demo-speed]');
    refs.tickRate = refs.root.querySelector('[data-roi-demo-tick-rate]');
    refs.behavior = refs.root.querySelector('[data-roi-demo-behavior]');
    this.bindTransportControls(refs.root);
    const directionLabel = this.playbackDirection === -1 ? 'Reverse' : 'Forward';
    const discreteProcess = this.usesDiscreteProcessClock();
    if (refs.stepButton) refs.stepButton.hidden = !discreteProcess;
    if (refs.tickRate) {
      refs.tickRate.value = String(this.processTickRate);
      refs.tickRate.disabled = !discreteProcess;
      if (refs.tickRate.closest?.('label')) refs.tickRate.closest('label').hidden = !discreteProcess;
    }
    if (refs.directionButton) refs.directionButton.hidden = discreteProcess;
    if (discreteProcess) {
      const status = this.processMode === 'processPaint'
        ? this.processPaintRunStarted && !this.paused ? 'Process Paint: running from painted state' : 'Process Paint: paused editing canvas'
        : 'Deterministic process';
      if (refs.time) refs.time.textContent = `Generation ${this.processGenerationIndex}`;
      if (refs.state) refs.state.textContent = `Generation ${this.processGenerationIndex} | ${this.processTickRate} gen/s | ${status}`;
      if (refs.pauseButton) refs.pauseButton.textContent = this.paused ? 'Run' : 'Pause';
      if (refs.speed) refs.speed.textContent = `Tick Rate: ${this.processTickRate} gen/s`;
      if (refs.behavior) refs.behavior.textContent = this.field?.processDisplayMetric?.metricLabel ? `Metric: ${this.field.processDisplayMetric.metricLabel}` : 'Metric: Rule support';
      return;
    }
    if (this.processMode === 'processPaint') {
      if (refs.time) refs.time.textContent = `${this.paused ? 'Paused editing canvas at' : 'Running painted process at'}: ${this.demoTime.toFixed(1)} s`;
      if (refs.state) refs.state.textContent = this.paused ? 'Process Paint: paused editing canvas' : 'Process Paint: running from painted state';
      if (refs.directionButton) refs.directionButton.textContent = `Direction: ${directionLabel}`;
      if (refs.pauseButton) refs.pauseButton.textContent = this.paused ? 'Run' : 'Pause';
      if (refs.speed) refs.speed.textContent = `Playback: ${this.timeSpeedScale}x`;
      if (refs.behavior) refs.behavior.textContent = 'Status: Custom Exploratory';
      return;
    }
    if (refs.time) refs.time.textContent = `${this.paused ? 'Paused at' : 'Demo Time'}: ${this.demoTime.toFixed(1)} s`;
    if (refs.state) refs.state.textContent = this.timeMode === 'dynamic' || this.eventLikelihoodDynamics === 'dynamic'
      ? `Dynamic sample field - ${directionLabel.toLowerCase()}`
      : 'Static sample field';
    if (refs.directionButton) refs.directionButton.textContent = `Direction: ${directionLabel}`;
    if (refs.pauseButton) refs.pauseButton.textContent = this.paused ? 'Resume' : 'Pause';
    if (refs.speed) refs.speed.textContent = `Playback: ${this.timeSpeedScale}x`;
    if (refs.behavior) refs.behavior.textContent = `Behavior: ${roiTemporalPatternLabel(this.temporalPattern)}`;
  }

  clearTransportBar() {
    const root = this.app?.elements?.overlay?.bottomTimeline;
    if (root) root.innerHTML = '';
    this.transportRefs = {};
  }

  togglePlaybackDirection() {
    this.playbackDirection = this.playbackDirection === 1 ? -1 : 1;
    this.updateTransportBar();
    this.renderConsole();
    this.renderCellInspector(true);
  }

  resetDemoState() {
    this.demoTime = 0;
    this.processGenerationIndex = 0;
    this.processTickAccumulator = 0;
    this.lastProcessStepTime = null;
    this.previousProcessStateLayer = null;
    if (this.processMode === 'processPaint') this.processPaintRunStarted = false;
    this.rebuildField();
    this.renderConsole();
    this.updateTransportBar();
    this.renderCellInspector(true);
    this.draw();
  }

  showRecipeSignatureView() {
    this.rightPanelMode = 'recipeSignature';
    this.lastInspectorRenderTime = -Infinity;
    this.renderCellInspector(true);
  }

  showDiagnosticsView() {
    this.rightPanelMode = 'diagnostics';
    this.lastInspectorRenderTime = -Infinity;
    this.renderCellInspector(true);
  }

  renderCellInspector(force = false) {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (!root) return;
    if (this.processMode === 'processPaint' && !this.selectedCell && this.rightPanelMode === 'recipeSignature') {
      this.rightPanelMode = 'paintTools';
    }
    if (this.processMode === 'processPaint' && this.rightPanelMode === 'paintTools') {
      const key = `paintTools:${this.selectedPaintState}:${this.selectedPaintRuleId}:${this.selectedPaintGroupId}:${this.selectedPaintSourceValue}:${Object.keys(this.paintModel?.cells ?? {}).length}:${this.paused}`;
      if (!force && key === this.lastInspectorKey) return;
      this.lastInspectorKey = key;
      this.lastInspectorRenderTime = this.demoTime;
      root.innerHTML = processPaintToolsHtml(this.processPaintPanelState());
      this.bindRightPanelModeButtons(root);
      this.bindProcessPaintPanelControls(root);
      this.updateRoiUiDebug();
      return;
    }
    if (this.rightPanelMode === 'recipeSignature') {
      const key = `recipeSignature:${this.patternSource}:${this.referenceSignatureId}:${this.referenceSignatureModified}:${this.behaviorPresetId}:${this.behaviorPresetModified}:${this.modifiedComponent}:${this.eventLikelihood}:${this.spatialPattern}:${this.valueDistribution}:${this.temporalPattern}:${this.spatialEvolution}:${this.interactionScale}:${this.stateModel}:${this.depletionMode}:${this.displayMode}`;
      if (!force && key === this.lastInspectorKey) return;
      this.lastInspectorKey = key;
      this.lastInspectorRenderTime = this.demoTime;
      root.innerHTML = roiRecipeSignatureHtml(this.recipeSignatureState());
      this.bindRightPanelModeButtons(root);
      this.updateRoiUiDebug();
      return;
    }
    if (this.rightPanelMode === 'diagnostics') {
      const key = `diagnostics:${this.patternSource}:${this.referenceSignatureId}:${this.referenceSignatureModified}:${this.demoTime.toFixed(1)}:${JSON.stringify(this.field?.activityDiagnostics?.diagnosticWarnings ?? [])}`;
      if (!force && key === this.lastInspectorKey) return;
      this.lastInspectorKey = key;
      this.lastInspectorRenderTime = this.demoTime;
      root.innerHTML = roiDiagnosticsHtml(this.diagnosticsState());
      this.bindRightPanelModeButtons(root);
      this.updateRoiUiDebug();
      return;
    }
    if (this.rightPanelMode === 'behaviorHelp') {
      const topic = this.selectedHelpTopic ?? null;
      const key = `behaviorHelp:${topic?.groupId ?? 'empty'}:${topic?.optionId ?? 'empty'}:${this.behaviorPresetId}:${this.behaviorPresetModified}:${this.referenceSignatureId}:${this.referenceSignatureModified}:${this.timeMode}:${this.eventLikelihood}:${this.eventLikelihoodDynamics}:${this.eventLikelihoodTemporalPattern}:${this.eventLikelihoodSpatialEvolution}:${this.spatialPattern}:${this.valueDistribution}:${this.temporalPattern}:${this.spatialEvolution}:${this.motionScope}:${this.interactionScale}:${this.depletionMode}:${this.displayMode}`;
      if (!force && key === this.lastInspectorKey) return;
      this.lastInspectorKey = key;
      this.lastInspectorRenderTime = this.demoTime;
      root.innerHTML = topic ? roiBehaviorHelpHtml(topic, this.behaviorHelpState()) : roiBehaviorHelpEmptyHtml(this.recipeSignatureState());
      this.bindRightPanelModeButtons(root);
      root.querySelector('[data-action="roi-show-cell-inspector"]')?.addEventListener('click', () => {
        this.rightPanelMode = 'cellInspector';
        this.renderCellInspector(true);
      });
      this.updateRoiUiDebug();
      return;
    }
    if (!this.selectedCell) {
      const key = `emptyInspector:${this.processMode}:${this.patternSource}:${this.referenceSignatureId}:${this.displayMode}:${this.selectedPaintState}:${this.selectedPaintRuleId}:${this.selectedPaintGroupId}`;
      if (!force && key === this.lastInspectorKey) return;
      this.lastInspectorKey = key;
      this.lastInspectorRenderTime = this.demoTime;
      root.innerHTML = this.processMode === 'processPaint'
        ? processPaintInspectorEmptyHtml(this.processPaintPanelState())
        : roiInspectorEmptyHtml(this.recipeSignatureState());
      this.bindRightPanelModeButtons(root);
      this.updateRoiUiDebug();
      return;
    }
    const key = `${this.selectedCell.col},${this.selectedCell.row}:${this.timeMode}:${this.eventLikelihood}:${this.eventLikelihoodDynamics}:${this.eventLikelihoodTemporalPattern}:${this.eventLikelihoodSpatialEvolution}:${this.spatialPattern}:${this.valueDistribution}:${this.temporalPattern}:${this.spatialEvolution}:${this.motionScope}:${this.depletionMode}:${this.displayMode}:${this.clusterSize}:${this.paused}:${this.processMode}:${JSON.stringify(this.paintModel?.cells?.[`${this.selectedCell.col},${this.selectedCell.row}`] ?? null)}`;
    if (!force && key === this.lastInspectorKey && Math.abs(this.demoTime - this.lastInspectorRenderTime) < 0.25) return;
    this.lastInspectorKey = key;
    this.lastInspectorRenderTime = this.demoTime;
    const inspection = this.inspectSelectedCell();
    root.innerHTML = this.processMode === 'processPaint'
      ? processPaintCellEditorHtml(inspection, this.processPaintPanelState())
      : roiInspectorHtml(inspection);
    this.bindRightPanelModeButtons(root);
    if (this.processMode === 'processPaint') this.bindProcessPaintPanelControls(root);
    this.updateRoiUiDebug();
  }

  bindRightPanelModeButtons(root) {
    root.querySelectorAll('[data-roi-panel-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        const mode = normalizeRightPanelMode(button.dataset.roiPanelMode);
        this.rightPanelMode = mode;
        if (mode === 'behaviorHelp' && !this.selectedHelpTopic) {
          this.selectedHelpTopic = { groupId: 'behaviorPreset', optionId: this.helpOptionForGroup('behaviorPreset') };
        }
        this.renderCellInspector(true);
      });
    });
  }

  bindProcessPaintPanelControls(root) {
    root.querySelector('#paint-panel-state')?.addEventListener('change', (event) => this.applyPaintSelection({ state: event.target.value }));
    root.querySelector('#paint-panel-rule')?.addEventListener('change', (event) => this.applyPaintSelection({ ruleId: event.target.value }));
    root.querySelector('#paint-panel-group')?.addEventListener('input', (event) => this.applyPaintSelection({ groupId: Number(event.target.value) }));
    root.querySelector('#paint-panel-group')?.addEventListener('change', (event) => this.applyPaintSelection({ groupId: Number(event.target.value) }));
    root.querySelector('#paint-panel-source')?.addEventListener('input', (event) => this.applyPaintSelection({ sourceValue: Number(event.target.value) }));
    root.querySelector('#paint-panel-source')?.addEventListener('change', (event) => this.applyPaintSelection({ sourceValue: Number(event.target.value) }));
    root.querySelector('[data-action="paint-panel-apply"]')?.addEventListener('click', () => this.paintSelectedCell(this.paintSelectionFromPanel(root)));
    root.querySelector('[data-action="paint-panel-brush"]')?.addEventListener('click', () => this.paintSelectedCell(this.paintSelectionFromPanel(root)));
    root.querySelector('[data-action="paint-panel-clear-cell"]')?.addEventListener('click', () => this.clearSelectedPaintCell());
    root.querySelector('[data-action="paint-panel-clear-canvas"]')?.addEventListener('click', () => this.clearProcessPaintCanvas());
    root.querySelector('[data-action="paint-panel-randomize"]')?.addEventListener('click', () => this.randomizeProcessAllocation({ keepProcessPaint: true }));
    root.querySelector('[data-action="paint-panel-run"]')?.addEventListener('click', () => this.runProcessPaintCanvas());
    root.querySelector('[data-action="paint-panel-export"]')?.addEventListener('click', () => this.exportDemoJson());
    root.querySelector('[data-action="paint-panel-tools"]')?.addEventListener('click', () => {
      this.selectedCell = null;
      this.rightPanelMode = 'paintTools';
      this.renderCellInspector(true);
      this.draw();
    });
  }

  paintSelectionFromPanel(root) {
    return {
      state: root?.querySelector('#paint-panel-state')?.value,
      ruleId: root?.querySelector('#paint-panel-rule')?.value,
      groupId: Number(root?.querySelector('#paint-panel-group')?.value),
      sourceValue: Number(root?.querySelector('#paint-panel-source')?.value)
    };
  }

  samplingProcessViewModelContext({ includePreviousField = false } = {}) {
    const sceneConfig = this.sceneConfig();
    const previousTime = Math.max(0, this.demoTime - 1);
    return {
      ...this.exportBuilderContext({ sceneConfig }),
      distribution: this.distribution,
      hotspotCount: this.hotspotCount,
      noise: this.noise,
      timeMode: this.timeMode,
      eventLikelihoodDynamics: this.eventLikelihoodDynamics,
      eventLikelihoodTemporalPattern: this.eventLikelihoodTemporalPattern,
      eventLikelihoodSpatialEvolution: this.eventLikelihoodSpatialEvolution,
      temporalBehavior: this.temporalBehavior,
      evolutionModel: this.evolutionModel,
      patternEvolution: this.patternEvolution,
      motionScope: this.motionScope,
      clusterSize: this.clusterSize,
      dynamicComplexity: this.dynamicComplexity,
      selectedPaintState: this.selectedPaintState,
      selectedPaintRuleId: this.selectedPaintRuleId,
      selectedPaintGroupId: this.selectedPaintGroupId,
      selectedPaintSourceValue: this.selectedPaintSourceValue,
      previousField: includePreviousField ? createDemoRoiField({ ...sceneConfig, time: previousTime, demoTime: previousTime }) : null
    };
  }

  processPaintPanelState() {
    return buildSamplingProcessPaintPanelState(this.samplingProcessViewModelContext());
  }

  processPaintSettings() {
    return {
      brushSize: 1,
      selectedState: this.selectedPaintState,
      selectedRuleId: this.selectedPaintRuleId,
      selectedGroupId: this.selectedPaintGroupId,
      selectedSourceValue: this.selectedPaintSourceValue,
      startMode: this.paintStartMode,
      randomizedSeed: this.paintStartMode === 'seededRandomCanvas' ? this.randomRuleSeed : null,
      runStarted: this.processPaintRunStarted,
      paused: this.paused
    };
  }

  recipeSignatureState() {
    return buildSamplingProcessRecipeSignatureState(this.samplingProcessViewModelContext());
  }

  diagnosticsState() {
    return buildSamplingProcessDiagnosticsState(this.samplingProcessViewModelContext());
  }

  recipeSummary() {
    return buildSamplingProcessRecipeSummary(this.samplingProcessViewModelContext());
  }

  behaviorHelpState() {
    return buildSamplingProcessBehaviorHelpState(this.samplingProcessViewModelContext());
  }

  clearCellInspector() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
    this.lastInspectorKey = '';
  }

  inspectSelectedCell() {
    return buildSamplingProcessCellInspection(this.samplingProcessViewModelContext({ includePreviousField: true }));
  }

  exportDemoJson() {
    const errors = validateDemoExportSettings(this.exportSettings(), this.demoTime);
    if (errors.length) {
      this.app?.toast?.(errors[0], 'warning');
      return;
    }
    const artifact = this.buildDemoArtifactExport();
    downloadJSON(demoArtifactFilename('sample-roi-field', { kind: artifact.timeSampling?.kind }), artifact);
    this.app?.toast?.('Process Lab JSON exported.', 'success');
  }

  generateScenario() {
    this.generatedScenario = this.buildSyntheticRoiScenario();
    this.renderConsole();
    const status = this.generatedScenario.validation?.status ?? 'WARN';
    this.app?.toast?.(`Scenario validation: ${status}`, status === 'FAIL' ? 'warning' : 'success');
    return this.generatedScenario;
  }

  exportScenarioJson() {
    const scenario = this.generatedScenario ?? this.generateScenario();
    const status = scenario.validation?.status ?? 'FAIL';
    if (status === 'FAIL') {
      this.app?.toast?.('Scenario validation failed. Change seed, duration, frame count, or settings before export.', 'warning');
      return;
    }
    if (status === 'WARN' && this.scenarioValidationMode === 'requirePass') {
      this.app?.toast?.('Scenario validation is WARN. Change validation mode to allow WARN export or adjust settings.', 'warning');
      return;
    }
    downloadJSON(`${scenario.scenarioId}.json`, scenario);
    this.app?.toast?.('Synthetic ROI scenario JSON exported.', 'success');
  }

  buildSyntheticRoiScenario() {
    const behaviorPreset = sampleFieldBehaviorPresetMetadata(this.behaviorPresetId, this.behaviorPresetModified);
    const sourceMode = normalizeScenarioSourceMode(this.scenarioSourceMode);
    const scenario = generateRoiScenario({
      family: this.behaviorPresetId === CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID ? 'custom' : this.behaviorPresetId,
      seed: this.scenarioSeed,
      difficulty: this.scenarioDifficulty,
      grid: {
        width: this.field?.width ?? 24,
        height: this.field?.height ?? 16
      },
      duration: this.scenarioDuration,
      frameCount: this.scenarioFrameCount,
      componentRecipe: this.activeComponentRecipe(),
      processContract: sourceMode === 'currentRecipe' && this.behaviorPresetId !== CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID ? behaviorPreset.processContract : null,
      patternSource: this.patternSource,
      referenceSignatureId: this.referenceSignatureId,
      exampleTrack: this.exampleTrack,
      exampleProcessId: this.exampleProcessId,
      foundationalCaModelId: this.foundationalCaModelId,
      oceanProcessAnalogId: this.oceanProcessAnalogId,
      exampleProcessModified: this.exampleProcessModified,
      referenceSignatureModified: this.referenceSignatureModified,
      sourceMode,
      requireValidation: this.scenarioValidationMode === 'requirePass'
    });
    return {
      ...scenario,
      ...buildSamplingProcessScenarioMetadata(this.exportBuilderContext(), scenario)
    };
  }

  buildDemoArtifactExport() {
    return buildSamplingProcessDemoArtifactExport(this.exportBuilderContext());
  }

  exportBuilderContext(overrides = {}) {
    const sceneConfig = this.sceneConfig();
    return {
      title: this.title(),
      demo: this.title(),
      demoTime: this.demoTime,
      field: this.field,
      processMode: this.processMode,
      patternSource: this.patternSource,
      exampleTrack: this.exampleTrack,
      exampleProcessId: this.exampleProcessId,
      foundationalCaModelId: this.foundationalCaModelId,
      oceanProcessAnalogId: this.oceanProcessAnalogId,
      exampleProcessModified: this.exampleProcessModified,
      referenceSignatureId: this.referenceSignatureId,
      referenceSignatureModified: this.referenceSignatureModified,
      behaviorPresetId: this.behaviorPresetId,
      behaviorPresetModified: this.behaviorPresetModified,
      paintModel: this.paintModel,
      paintStartMode: this.paintStartMode,
      paintSettings: this.processPaintSettings(),
      processLayers: this.processLayers,
      exampleFixture: this.activeExampleFixture,
      exampleFixtureId: this.activeExampleFixture?.id ?? null,
      exampleFixtureLabel: this.activeExampleFixture?.label ?? null,
      exampleFixtureValidation: this.activeExampleFixtureValidation,
      behaviorValidation: this.activeExampleBehaviorValidation,
      viewFilters: this.viewFilters,
      selectedCell: this.selectedCell,
      modifiedComponent: this.modifiedComponent,
      exportMode: this.exportMode,
      exportStartTime: this.exportStartTime,
      exportEndTime: this.exportEndTime,
      exportFrameCount: this.exportFrameCount,
      playbackDirection: this.playbackDirection,
      timeSpeedScale: this.timeSpeedScale,
      processGenerationIndex: this.processGenerationIndex,
      processTickRate: this.processTickRate,
      processTickAccumulator: this.processTickAccumulator,
      processTickIntervalSeconds: this.processTickIntervalSeconds,
      processTiming: processTimingExportBlock(this.processTimingState()),
      processDisplayMetric: this.field?.processDisplayMetric ?? null,
      metricLayers: this.field?.metricLayers ?? null,
      seed: this.seed,
      sceneConfig,
      eventLikelihood: this.eventLikelihood,
      spatialPattern: this.spatialPattern,
      valueDistribution: this.valueDistribution,
      temporalPattern: this.temporalPattern,
      spatialEvolution: this.spatialEvolution,
      interactionScale: this.interactionScale,
      stateModel: this.stateModel,
      depletionMode: this.depletionMode,
      displayMode: this.displayMode,
      buildFrameAtTime: (time, index, fieldOverride = null) => this.buildDemoArtifactFrame(time, index, fieldOverride),
      inspectSelectedCell: () => this.inspectSelectedCell(),
      ...overrides
    };
  }

  buildDemoArtifactFrame(demoTime, index, existingField = null) {
    let field = existingField ?? createDemoRoiField({ ...this.sceneConfig(), time: demoTime, demoTime });
    const processLayers = existingField ? this.processLayers : this.buildGuidedExampleProcessLayers(field) ?? buildSamplingProcessLayersForField({
      field,
      paintModel: this.paintModel,
      processMode: this.processMode,
      updateRuleHint: field.graphField?.updateRule ?? this.updateRuleHint
    });
    if (this.processMode === 'processPaint' && !existingField) {
      const result = buildSamplingProcessPaintField({
        baseField: field,
        processLayers,
        paintModel: this.paintModel,
        seed: this.seed,
        demoTime,
        generationIndex: Math.max(0, Math.round(Number(demoTime) || 0)),
        processPaintRunStarted: this.processPaintRunStarted,
        paused: this.paused,
        paintStartMode: this.paintStartMode
      });
      field = result.field;
    }
    return buildSamplingProcessDemoArtifactFrame(this.exportBuilderContext({ field, processLayers }), demoTime, index, field);
  }

  demoExportSampling() {
    return buildSamplingProcessExportSampling(this.exportBuilderContext());
  }

  updateExportSettings(patch = {}) {
    if (patch.exportMode !== undefined) {
      this.exportMode = normalizeExportMode(patch.exportMode);
      if (this.exportMode === 'timeWindow' && this.exportFrameCount <= 1) {
        this.exportStartTime = 0;
        this.exportEndTime = Math.max(120, this.demoTime);
        this.exportFrameCount = 25;
      }
    }
    if (patch.startTimeSeconds !== undefined) this.exportStartTime = finiteNumber(patch.startTimeSeconds, this.exportStartTime);
    if (patch.endTimeSeconds !== undefined) this.exportEndTime = finiteNumber(patch.endTimeSeconds, this.exportEndTime);
    if (patch.frameCount !== undefined) this.exportFrameCount = Math.max(1, Math.min(240, Math.round(finiteNumber(patch.frameCount, this.exportFrameCount))));
    this.renderConsole();
  }

  updateScenarioSettings(patch = {}, options = {}) {
    if (patch.sourceMode !== undefined) this.scenarioSourceMode = normalizeScenarioSourceMode(patch.sourceMode);
    if (patch.seed !== undefined) this.scenarioSeed = String(patch.seed ?? 'scenario-test-001') || 'scenario-test-001';
    if (patch.difficulty !== undefined) this.scenarioDifficulty = normalizeScenarioDifficulty(patch.difficulty);
    if (patch.duration !== undefined) this.scenarioDuration = Math.max(1, finiteNumber(patch.duration, this.scenarioDuration));
    if (patch.frameCount !== undefined) this.scenarioFrameCount = Math.max(1, Math.min(240, Math.round(finiteNumber(patch.frameCount, this.scenarioFrameCount))));
    if (patch.validationMode !== undefined) this.scenarioValidationMode = normalizeScenarioValidationMode(patch.validationMode);
    this.generatedScenario = null;
    if (options.render !== false) this.renderConsole();
  }

  activeComponentRecipe() {
    return buildSamplingProcessComponentRecipe(this.exportBuilderContext());
  }

  exportSettings() {
    return {
      exportMode: this.exportMode,
      startTimeSeconds: this.exportStartTime,
      endTimeSeconds: this.exportEndTime,
      frameCount: this.exportFrameCount
    };
  }
}

function nextSeed(seed) {
  const match = String(seed ?? '').match(/^(.*?)(\d+)$/);
  if (!match) return `${seed}-2`;
  return `${match[1]}${Number(match[2]) + 1}`;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function defaultProcessDisplayMode(processMode) {
  if (processMode === 'processPaint' || processMode === 'randomRuleLab') return 'processStateView';
  if (processMode === 'foundationalCaModels') return 'processTransitionView';
  if (processMode === 'oceanProcessAnalogs') return 'processRuleMetric';
  return SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE;
}

function displayMetricIdForMode(displayMode, defaultMetricId = 'ruleSupport') {
  return {
    processStateView: 'state',
    processRuleMetric: defaultMetricId,
    processTransitionView: 'transitionClass',
    samplingInterpretation: 'samplingValue',
    eventLikelihood: 'sourceSupport'
  }[displayMode] ?? defaultMetricId;
}

function processDisplayedFieldForMode(displayMode, samplingValueField, sourceField, metricLayers = {}, metricId = 'ruleSupport') {
  if (displayMode === 'eventLikelihood') return sourceField;
  const candidate = metricLayers[metricId];
  if (displayMode === 'processRuleMetric' && Array.isArray(candidate) && typeof candidate?.[0]?.[0] === 'number') return candidate;
  if (displayMode === 'samplingInterpretation') return metricLayers.samplingValue ?? samplingValueField;
  return samplingValueField;
}

function cloneLayer(layer) {
  return Array.isArray(layer) ? layer.map((row) => Array.isArray(row) ? [...row] : []) : null;
}

function highValueFractionForScene(field, threshold = 0.65) {
  let total = 0;
  let high = 0;
  for (const row of field ?? []) {
    for (const value of row ?? []) {
      total += 1;
      if (Number(value ?? 0) >= threshold) high += 1;
    }
  }
  return total ? high / total : 0;
}

function normalizeExportMode(mode) {
  return mode === 'timeWindow' || mode === 'timeSeries' ? 'timeWindow' : 'currentFrame';
}

function normalizeScenarioSourceMode(value) {
  return ROI_SCENARIO_SOURCE_MODES.includes(value) ? value : 'currentRecipe';
}

function normalizeScenarioDifficulty(value) {
  return ROI_SCENARIO_DIFFICULTIES.includes(value) ? value : 'medium';
}

function normalizeScenarioValidationMode(value) {
  return ROI_SCENARIO_VALIDATION_MODES.includes(value) ? value : 'requirePass';
}

function normalizePatternSource(value, data = {}) {
  if (PATTERN_SOURCES.includes(value)) return value;
  const referenceId = normalizeReferenceSignatureId(data.referenceSignatureId ?? data.referenceSignature?.id);
  if (referenceId !== CUSTOM_REFERENCE_SIGNATURE_ID) return 'referenceSignature';
  const presetId = normalizeSampleFieldBehaviorPresetId(data.behaviorPresetId ?? data.behaviorPreset?.id ?? CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID);
  if (presetId !== CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID) return 'legacyPreset';
  return value === 'custom' ? 'custom' : 'referenceSignature';
}

function inferModifiedComponent(patch = {}) {
  const keys = Object.keys(patch ?? {});
  if (keys.some((key) => ['eventLikelihood', 'eventLikelihoodDynamics', 'eventLikelihoodTemporalPattern', 'eventLikelihoodSpatialEvolution'].includes(key))) return 'eventLikelihood';
  if (keys.some((key) => ['spatialPattern', 'hotspotCount', 'clusterSize', 'noise'].includes(key))) return 'spatialPattern';
  if (keys.includes('valueDistribution')) return 'valueDistribution';
  if (keys.some((key) => ['temporalPattern', 'temporalBehavior', 'timeMode'].includes(key))) return 'temporalPattern';
  if (keys.some((key) => ['spatialEvolution', 'patternEvolution', 'evolutionModel', 'motionScope', 'dynamicComplexity'].includes(key))) return 'spatialEvolution';
  if (keys.includes('interactionScale')) return 'interactionScale';
  if (keys.includes('stateModel')) return 'stateModel';
  if (keys.includes('depletionMode')) return 'samplingEffect';
  if (keys.includes('displayMode')) return 'displayLayer';
  if (keys.includes('seed')) return 'seed';
  return null;
}

function componentComparisonRecipe(comparisonId, scene) {
  if (comparisonId === 'spatialEvolution') {
    const spatialEvolution = nextOption(['stationary', 'continuousDrift', 'discreteJump', 'randomWalk', 'neighborPropagation'], scene?.spatialEvolution);
    return {
      seed: 'roi-isolate-evolution',
      modifiedComponent: 'spatialEvolution',
      helpGroup: 'spatialEvolution',
      config: {
        eventLikelihood: 'multiModalLikelihood',
        eventLikelihoodDynamics: 'dynamic',
        eventLikelihoodTemporalPattern: 'sustained',
        eventLikelihoodSpatialEvolution: spatialEvolution,
        spatialPattern: 'clusteredField',
        hotspotCount: 3,
        clusterSize: 'medium',
        valueDistribution: 'gaussianNormal',
        temporalPattern: 'sustained',
        temporalBehavior: 'periodic',
        spatialEvolution,
        patternEvolution: spatialEvolution,
        evolutionModel: spatialEvolution,
        motionScope: spatialEvolution === 'neighborPropagation' ? 'localNeighborhood' : 'perFeature',
        interactionScale: spatialEvolution === 'neighborPropagation' ? 'edge' : 'cluster',
        stateModel: spatialEvolution === 'stationary' || spatialEvolution === 'continuousDrift' ? 'timeIndexed' : 'stateEvolving',
        depletionMode: 'none',
        dynamicComplexity: 'medium',
        displayMode: 'sampleValueLikelihoodOverlay'
      }
    };
  }
  if (comparisonId === 'interactionScale') {
    const interactionScale = nextOption(['global', 'cluster', 'cell', 'edge', 'hybrid'], scene?.interactionScale);
    return {
      seed: 'roi-isolate-scale',
      modifiedComponent: 'interactionScale',
      helpGroup: 'interactionScale',
      config: {
        eventLikelihood: 'patchyLikelihood',
        eventLikelihoodDynamics: 'dynamic',
        eventLikelihoodTemporalPattern: 'bursty',
        eventLikelihoodSpatialEvolution: 'neighborPropagation',
        spatialPattern: 'patchyField',
        hotspotCount: 4,
        clusterSize: 'medium',
        valueDistribution: 'gaussianNormal',
        temporalPattern: 'bursty',
        temporalBehavior: 'bursty',
        spatialEvolution: 'neighborPropagation',
        patternEvolution: 'neighborPropagation',
        evolutionModel: 'neighborPropagation',
        motionScope: 'localNeighborhood',
        interactionScale,
        stateModel: 'stateEvolving',
        depletionMode: 'soft',
        dynamicComplexity: 'medium',
        displayMode: 'diagnosticsOverlay'
      }
    };
  }
  const temporalPattern = nextOption(['sustained', 'periodic', 'bursty', 'intermittent', 'pulseThenSilence'], scene?.temporalPattern);
  return {
    seed: 'roi-isolate-temporal',
    modifiedComponent: 'temporalPattern',
    helpGroup: 'temporalPattern',
    config: {
      eventLikelihood: 'multiModalLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: temporalPattern,
      eventLikelihoodSpatialEvolution: 'stationary',
      spatialPattern: 'clusteredField',
      hotspotCount: 4,
      clusterSize: 'medium',
      valueDistribution: 'gaussianNormal',
      temporalPattern,
      temporalBehavior: temporalPattern === 'sustained' ? 'periodic' : temporalPattern,
      spatialEvolution: 'stationary',
      patternEvolution: 'stationary',
      evolutionModel: 'stationary',
      motionScope: 'perFeature',
      interactionScale: 'cluster',
      stateModel: 'stateEvolving',
      depletionMode: 'soft',
      dynamicComplexity: 'medium',
      displayMode: 'sampleValueLikelihoodOverlay'
    }
  };
}

function nextOption(options, current) {
  const index = options.indexOf(current);
  return options[(index + 1) % options.length] ?? options[0];
}

function formatStat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : 'N/A';
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : 'N/A';
}

function meanFieldDelta(a, b) {
  const valuesA = a?.flat?.().map(Number) ?? [];
  const valuesB = b?.flat?.().map(Number) ?? [];
  const count = Math.min(valuesA.length, valuesB.length);
  if (!count) return 0;
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += Math.abs((valuesA[index] || 0) - (valuesB[index] || 0));
  }
  return Number((total / count).toFixed(3));
}

function highValueFraction(field, threshold = 0.68) {
  const values = field?.flat?.().map(Number) ?? [];
  if (!values.length) return 0;
  return Number((values.filter((value) => value >= threshold).length / values.length).toFixed(3));
}

function normalizeForecastView(value) {
  return ['forecast', 'truth', 'uncertainty', 'depleted'].includes(value) ? value : 'forecast';
}

function normalizePlaybackDirection(value) {
  return Number(value) === -1 || value === 'reverse' ? -1 : 1;
}

function normalizeSelectedCell(value) {
  if (!value || typeof value !== 'object') return null;
  const col = Number(value.col ?? value.x);
  const row = Number(value.row ?? value.y);
  if (!Number.isFinite(col) || !Number.isFinite(row)) return null;
  return { col: Math.max(0, Math.round(col)), row: Math.max(0, Math.round(row)), x: Math.max(0, Math.round(col)), y: Math.max(0, Math.round(row)) };
}

function normalizeRightPanelMode(value) {
  return ['recipeSignature', 'cellInspector', 'behaviorHelp', 'diagnostics', 'paintTools'].includes(value) ? value : 'recipeSignature';
}

function normalizePaintStartMode(value) {
  return ['blankCanvas', 'currentSnapshot', 'referenceInitialState', 'seededRandomCanvas'].includes(value) ? value : 'blankCanvas';
}

function normalizeHelpTopic(value) {
  if (!value || typeof value !== 'object') return null;
  const groupId = String(value.groupId ?? '');
  if (!groupId) return null;
  return {
    groupId,
    optionId: value.optionId == null ? null : String(value.optionId)
  };
}

function mergeViewFilterPatch(current, patch = {}) {
  const next = {
    ...current,
    ...patch,
    nodeStates: {
      ...(current?.nodeStates ?? {}),
      ...(patch.nodeStates ?? {})
    },
    messageTypes: {
      ...(current?.messageTypes ?? {}),
      ...(patch.messageTypes ?? {})
    }
  };
  return next;
}

function formatGraphStateSummary(stateCounts = {}) {
  const states = ['active', 'cooling', 'recovering', 'susceptible', 'consumed', 'inhibited'];
  return states
    .filter((state) => Number(stateCounts[state] ?? 0) > 0)
    .map((state) => `${state}:${stateCounts[state]}`)
    .join(', ') || 'n/a';
}

function seededHash(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}






