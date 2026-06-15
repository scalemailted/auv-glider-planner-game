import {
  roiClusterSizeLabel,
  roiDepletionModeLabel,
  roiDisplayModeLabel,
  roiEventLikelihoodLabel,
  roiInteractionScaleLabel,
  roiLikelihoodDynamicsLabel,
  roiLikelihoodSpatialEvolutionLabel,
  roiMotionScopeLabel,
  roiPureSpatialPatternLabel,
  roiSpatialEvolutionLabel,
  roiSpatialPatternHelp,
  roiStateModelDescription,
  roiStateModelLabel,
  roiTemporalPatternLabel,
  roiValueDistributionLabel,
  normalizeRoiDemoViewFilters
} from '../DemoRoiFields.js';
import { componentCompatibilityWarnings, componentIsolationHint } from '../SampleFieldComponentHints.js';
import { sampleFieldBehaviorPresetMetadata } from '../SampleFieldBehaviorPresets.js';
import { referenceSignatureMetadata } from '../roi/RoiReferenceSignatures.js';
import {
  SAMPLING_PROCESS_RULES,
  SAMPLING_PROCESS_STATES,
  advancedProcessRuleOptions,
  basicProcessRuleOptions,
  normalizeProcessRuleId,
  processRuleById,
  processRuleLabel
} from './SamplingProcessRules.js';
import { validateSamplingProcessPaintModel } from './SamplingProcessPaintModel.js';
import {
  samplingProcessModeLabel,
  samplingProcessStatusLabel
} from './SamplingProcessTerminology.js';
import { buildSamplingProcessComponentRecipeExport } from './SamplingProcessExportBuilder.js';
import { resolveActiveSpatiotemporalProcessExample } from './SpatiotemporalProcessExamples.js';
import { isDiscreteSamplingProcessMode } from './SamplingProcessTiming.js';
import {
  initialConditionEditCount,
  initialConditionGuidanceForExample,
  initialConditionMatchesFixture,
  normalizeInitialConditionBrush
} from './SamplingProcessInitialConditionEditor.js';

export function buildSamplingProcessComponentRecipe(context = {}) {
  return buildSamplingProcessComponentRecipeExport(context);
}

export function buildSamplingProcessRecipeSummary(context = {}) {
  const { field } = context;
  return [
    roiEventLikelihoodLabel(field?.eventLikelihood ?? context.eventLikelihood),
    roiPureSpatialPatternLabel(field?.pureSpatialPattern ?? context.spatialPattern),
    roiValueDistributionLabel(field?.valueDistribution ?? context.valueDistribution),
    roiTemporalPatternLabel(field?.temporalPattern ?? context.temporalPattern),
    roiSpatialEvolutionLabel(field?.spatialEvolution ?? context.spatialEvolution),
    roiInteractionScaleLabel(field?.interactionScale ?? context.interactionScale),
    roiStateModelLabel(field?.stateModel ?? context.stateModel),
    roiDepletionModeLabel(field?.depletionMode ?? context.depletionMode)
  ].join(' + ');
}

export function buildSamplingProcessRecipeSignatureState(context = {}) {
  const behaviorPreset = sampleFieldBehaviorPresetMetadata(context.behaviorPresetId, context.behaviorPresetModified);
  const activeExample = resolveActiveSpatiotemporalProcessExample(context);
  const referenceSignature = activeExample.referenceSignature
    ?? referenceSignatureMetadata(activeExample.referenceSignatureId ?? context.referenceSignatureId, context.referenceSignatureModified)
    ?? (context.patternSource === 'legacyPreset' ? behaviorPreset.referenceSignature : null);
  const displayMode = context.field?.displayMode ?? context.displayMode;
  const initialCondition = context.initialCondition ?? context.field?.initialCondition ?? context.field?.activityDiagnostics?.initialCondition ?? null;
  const selectedInitialConditionBrush = normalizeInitialConditionBrush(activeExample.sourceExample, context.selectedInitialConditionBrushState ?? initialCondition?.brushState);
  const initialConditionModel = context.initialConditionModel ?? {};
  return {
    patternSource: context.patternSource,
    processMode: context.processMode,
    processModeLabel: samplingProcessModeLabel(context.processMode),
    processStatusLabel: samplingProcessStatusLabel({
      mode: context.processMode,
      patternSource: context.patternSource,
      modified: Boolean(activeExample.isModified || context.behaviorPresetModified || Object.keys(context.paintModel?.cells ?? {}).length > 0),
      validationStatus: context.field?.activityDiagnostics?.presetValidation?.status ?? 'PASS'
    }),
    processExample: activeExample,
    activeProcessExample: activeExample,
    exampleTrack: activeExample.exampleTrack,
    exampleTrackLabel: activeExample.exampleTrackLabel,
    exampleProcessId: activeExample.exampleProcessId,
    exampleProcessLabel: activeExample.exampleProcessLabel,
    exampleType: activeExample.exampleType,
    foundationalCaModelId: activeExample.foundationalCaModelId,
    foundationalModelId: activeExample.foundationalCaModelId,
    oceanProcessAnalogId: activeExample.oceanProcessAnalogId,
    observableProcessPatternTags: activeExample.observableProcessPatternTags,
    implementationFidelity: activeExample.implementationFidelity,
    requiresFlowCoupling: activeExample.requiresFlowCoupling,
    requiresUncertaintyForMissionRealism: activeExample.requiresUncertaintyForMissionRealism,
    mappedReferenceSignatureId: activeExample.mappedReferenceSignatureId,
    mappedReferenceSignatureLabel: activeExample.mappedReferenceSignatureLabel,
    spatiotemporalProcessExample: activeExample.sourceExample,
    selectedProcessExample: activeExample.sourceExample,
    referenceSignatureId: activeExample.referenceSignatureId ?? referenceSignature?.id ?? null,
    referenceSignatureLabel: activeExample.referenceSignatureLabel ?? referenceSignature?.label ?? null,
    referenceSignatureModified: context.referenceSignatureModified,
    exampleProcessModified: activeExample.isModified,
    behaviorPreset,
    referenceSignature,
    componentRecipe: context.componentRecipe ?? buildSamplingProcessComponentRecipe(context),
    recipeSummary: context.recipeSummary ?? buildSamplingProcessRecipeSummary(context),
    modifiedComponent: context.modifiedComponent,
    componentHint: componentIsolationHint(context.modifiedComponent),
    compatibilityWarnings: componentCompatibilityWarnings(context.sceneConfig ?? {}),
    displayMode,
    displayModeLabel: roiDisplayModeLabel(displayMode),
    processGenerationIndex: context.processGenerationIndex ?? context.field?.processTiming?.generationIndex ?? 0,
    processTickRate: context.processTickRate ?? context.field?.processTiming?.tickRate ?? 1,
    processTickIntervalSeconds: context.processTickIntervalSeconds ?? context.field?.processTiming?.tickIntervalSeconds ?? 1,
    usesDiscreteProcessClock: Boolean(context.usesDiscreteProcessClock ?? isDiscreteSamplingProcessMode(context.processMode)),
    processDisplayMetric: context.processDisplayMetric ?? context.field?.processDisplayMetric ?? null,
    metricLegend: context.metricLegend ?? context.field?.metricLegend ?? context.field?.processDisplayMetric?.legend ?? [],
    exampleFixture: context.exampleFixture ?? context.field?.exampleFixture ?? null,
    exampleFixtureId: context.exampleFixtureId ?? context.field?.exampleFixtureId ?? context.field?.activityDiagnostics?.exampleFixtureId ?? null,
    exampleFixtureLabel: context.exampleFixtureLabel ?? context.field?.exampleFixtureLabel ?? context.field?.activityDiagnostics?.exampleFixtureLabel ?? null,
    exampleFixtureValidation: context.exampleFixtureValidation ?? context.field?.activityDiagnostics?.exampleFixtureValidation ?? null,
    behaviorValidation: context.behaviorValidation ?? context.field?.behaviorValidation ?? context.field?.activityDiagnostics?.behaviorValidation ?? null,
    initialCondition,
    initialConditionMode: context.initialConditionMode ?? initialCondition?.mode ?? 'curatedSeed',
    selectedInitialConditionFixtureId: context.selectedInitialConditionFixtureId ?? initialCondition?.fixtureId ?? 'default',
    selectedInitialConditionFixtureLabel: initialCondition?.fixtureLabel ?? null,
    selectedInitialConditionBrushState: context.selectedInitialConditionBrushState ?? selectedInitialConditionBrush?.id ?? null,
    selectedInitialConditionBrush,
    initialConditionEditCount: initialConditionEditCount(initialConditionModel),
    initialConditionMatchesFixture: initialConditionMatchesFixture(initialConditionModel),
    interactiveInitialConditionEnabled: (context.initialConditionMode ?? initialCondition?.mode) === 'interactiveCanvas',
    selectedEditedCell: context.selectedEditedCell ?? null,
    initialConditionGuidance: initialConditionGuidanceForExample(activeExample.sourceExample),
    activeUpdateRuleHint: context.updateRuleHint ?? context.field?.graphField?.updateRule ?? null,
    stats: context.field?.stats,
    activityDiagnostics: context.field?.activityDiagnostics,
    graphDiagnostics: context.field?.activityDiagnostics?.graphDiagnostics ?? context.field?.graphField?.diagnostics,
    selectedCell: context.selectedCell,
    selectedPaintState: context.selectedPaintState,
    selectedPaintRuleId: context.selectedPaintRuleId,
    selectedPaintRuleLabel: processRuleLabel(context.selectedPaintRuleId ?? 'propagatingFront'),
    selectedPaintGroupId: context.selectedPaintGroupId,
    paintValidation: validateSamplingProcessPaintModel(context.paintModel),
    randomRuleSeed: context.randomRuleSeed,
    randomRuleGroupCount: context.randomRuleGroupCount,
    randomRuleActiveFraction: context.randomRuleActiveFraction
  };
}

export function buildSamplingProcessDiagnosticsState(context = {}) {
  return buildSamplingProcessRecipeSignatureState(context);
}

export function buildSamplingProcessBehaviorHelpState(context = {}) {
  const behaviorPreset = sampleFieldBehaviorPresetMetadata(context.behaviorPresetId, context.behaviorPresetModified);
  return {
    processMode: context.processMode,
    selectedCell: context.selectedCell,
    eventLikelihood: context.field?.eventLikelihood ?? context.eventLikelihood,
    eventLikelihoodLabel: context.field?.eventLikelihoodLabel ?? roiEventLikelihoodLabel(context.eventLikelihood),
    eventLikelihoodDynamics: context.field?.eventLikelihoodDynamics ?? context.eventLikelihoodDynamics,
    eventLikelihoodTemporalPattern: context.field?.eventLikelihoodTemporalPattern ?? context.eventLikelihoodTemporalPattern,
    eventLikelihoodSpatialEvolution: context.field?.eventLikelihoodSpatialEvolution ?? context.eventLikelihoodSpatialEvolution,
    spatialPattern: context.field?.pureSpatialPattern ?? context.spatialPattern,
    valueDistribution: context.field?.valueDistribution ?? context.valueDistribution,
    temporalPattern: context.field?.temporalPattern ?? context.temporalPattern,
    spatialEvolution: context.field?.spatialEvolution ?? context.spatialEvolution,
    interactionScale: context.field?.interactionScale ?? context.interactionScale,
    stateModel: context.field?.stateModel ?? context.stateModel,
    depletionMode: context.field?.depletionMode ?? context.depletionMode,
    displayMode: context.field?.displayMode ?? context.displayMode,
    referenceSignature: resolveActiveSpatiotemporalProcessExample(context).referenceSignature ?? referenceSignatureMetadata(context.referenceSignatureId, context.referenceSignatureModified) ?? behaviorPreset.referenceSignature
  };
}

export function buildSamplingProcessPaintPanelState(context = {}) {
  const selectedPaintRuleId = normalizeProcessRuleId(context.selectedPaintRuleId);
  const selectedPaintRule = processRuleById(selectedPaintRuleId);
  const selectedPaintState = selectedPaintRule.allowedStates.includes(context.selectedPaintState)
    ? context.selectedPaintState
    : selectedPaintRule.defaultInitialState;
  const paintValidation = validateSamplingProcessPaintModel(context.paintModel);
  return {
    selectedCell: context.selectedCell,
    selectedPaintState,
    selectedPaintRuleId,
    selectedPaintRuleLabel: selectedPaintRule.label,
    processMode: 'processPaint',
    processModeLabel: samplingProcessModeLabel('processPaint'),
    selectedPaintGroupId: context.selectedPaintGroupId,
    selectedPaintSourceValue: context.selectedPaintSourceValue,
    processRules: SAMPLING_PROCESS_RULES,
    basicProcessRules: basicProcessRuleOptions(),
    advancedProcessRules: advancedProcessRuleOptions(),
    processStates: SAMPLING_PROCESS_STATES,
    validPaintStates: selectedPaintRule.allowedStates,
    paintModel: context.paintModel,
    paintValidation,
    processStatusLabel: samplingProcessStatusLabel({
      mode: 'processPaint',
      patternSource: 'custom',
      modified: Object.keys(context.paintModel?.cells ?? {}).length > 0,
      validationStatus: paintValidation.status
    }),
    stats: context.field?.stats,
    activityDiagnostics: context.field?.activityDiagnostics,
    graphDiagnostics: context.field?.activityDiagnostics?.graphDiagnostics ?? context.field?.graphField?.diagnostics,
    paintStartMode: context.paintStartMode,
    paused: context.paused
  };
}

export function buildSamplingProcessCellInspection(context = {}) {
  const cell = context.selectedCell;
  const field = context.field;
  if (!cell || !field) return null;
  const row = Number(cell.row);
  const col = Number(cell.col);
  const value = Number(field?.sampleValueField?.[row]?.[col] ?? field?.field?.[row]?.[col] ?? 0);
  const displayedValue = Number(field?.field?.[row]?.[col] ?? value);
  const eventLikelihoodValue = Number(field?.eventLikelihoodField?.[row]?.[col] ?? 1);
  const previousField = context.previousField;
  const previous = Number(previousField?.sampleValueField?.[row]?.[col] ?? previousField?.field?.[row]?.[col] ?? value);
  const stats = field?.stats ?? {};
  const hotspot = (field?.highValueCells ?? []).find((entry) => entry.x === col && entry.y === row);
  const rawBase = Number(field?.rawBaseField?.[row]?.[col] ?? value);
  const depleted = Number(field?.sampleValueField?.[row]?.[col] ?? value);
  const spatialPattern = field?.pureSpatialPattern ?? context.spatialPattern;
  const spatialHelp = roiSpatialPatternHelp(spatialPattern);
  const nearestLikelihoodNode = nearestLikelihoodNodeForCell(field?.likelihoodField, cell);
  const localLikelihood = localLikelihoodMeshStats(field?.likelihoodField?.values ?? field?.eventLikelihoodField, cell);
  const previousLikelihoodField = previousField?.likelihoodField?.values ?? previousField?.eventLikelihoodField;
  const previousLikelihood = Number(previousLikelihoodField?.[row]?.[col] ?? eventLikelihoodValue);
  const graphNode = field?.graphField?.nodeGrid?.[row]?.[col] ?? null;
  const graphDiagnostics = field?.graphField?.diagnostics ?? field?.activityDiagnostics?.graphDiagnostics ?? null;
  const nearestCluster = nearestClusterForCell(field?.graphField?.clusters, cell, field?.width, field?.height);
  const graphNeighborhood = graphMessageNeighborhood(field?.graphField, cell);
  const graphTransition = graphTransitionForCell(field?.graphField, cell);
  const viewFilters = context.viewFilters;
  const filteredMessages = topGraphMessages(field?.graphField, {
    maxEdges: viewFilters?.maxMessages,
    threshold: viewFilters?.messageStrengthThreshold,
    filters: viewFilters,
    selectedCell: cell
  });
  const incomingMessages = filteredMessages.filter((message) => message.target.x === col && message.target.y === row);
  const outgoingMessages = filteredMessages.filter((message) => message.source.x === col && message.source.y === row);
  const roiRoles = roiMeaningRoles({
    value,
    likelihood: eventLikelihoodValue,
    node: graphNode,
    isTransition: Boolean(graphTransition)
  });
  const paintAssignment = context.paintModel?.cells?.[`${col},${row}`] ?? null;
  const transitionCells = new Set((field?.graphField?.nodeTransitions ?? []).map((transition) => `${transition.col},${transition.row}`));
  const processLayers = context.processLayers ?? {};
  return {
    cell,
    value,
    displayedValue,
    previous,
    delta: value - previous,
    normalizedValue: stats.max > stats.min ? (value - stats.min) / Math.max(0.0001, stats.max - stats.min) : value,
    mode: context.timeMode,
    distribution: context.distribution,
    eventLikelihood: field?.eventLikelihood ?? context.eventLikelihood,
    eventLikelihoodLabel: field?.eventLikelihoodLabel ?? roiEventLikelihoodLabel(context.eventLikelihood),
    eventLikelihoodDynamics: field?.eventLikelihoodDynamics ?? context.eventLikelihoodDynamics,
    eventLikelihoodDynamicsLabel: field?.eventLikelihoodDynamicsLabel ?? roiLikelihoodDynamicsLabel(context.eventLikelihoodDynamics),
    eventLikelihoodTemporalPattern: field?.eventLikelihoodTemporalPattern ?? context.eventLikelihoodTemporalPattern,
    eventLikelihoodTemporalPatternLabel: field?.eventLikelihoodTemporalPatternLabel ?? roiTemporalPatternLabel(context.eventLikelihoodTemporalPattern),
    eventLikelihoodSpatialEvolution: field?.eventLikelihoodSpatialEvolution ?? context.eventLikelihoodSpatialEvolution,
    eventLikelihoodSpatialEvolutionLabel: field?.eventLikelihoodSpatialEvolutionLabel ?? roiLikelihoodSpatialEvolutionLabel(context.eventLikelihoodSpatialEvolution),
    eventLikelihoodValue,
    sourceValue: Number(processLayers?.sourceField?.[row]?.[col] ?? eventLikelihoodValue),
    processState: processLayers?.stateLayer?.[row]?.[col] ?? graphNode?.state ?? 'inactive',
    processRuleId: normalizeProcessRuleId(processLayers?.ruleLayer?.[row]?.[col] ?? field?.graphField?.updateRule ?? 'inert'),
    processRuleLabel: processRuleLabel(processLayers?.ruleLayer?.[row]?.[col] ?? field?.graphField?.updateRule ?? 'inert'),
    processGroupId: processLayers?.groupLayer?.[row]?.[col] ?? graphNode?.communityId ?? 0,
    roiRole: field?.roiRoleLayer?.[row]?.[col] ?? null,
    processTransition: field?.transitionLayer?.[row]?.[col] ?? null,
    paintAssignment,
    eventLikelihoodDelta: eventLikelihoodValue - previousLikelihood,
    eventLikelihoodBand: likelihoodBandLabel(eventLikelihoodValue),
    likelihoodMeshPercentile: likelihoodMeshPercentile(eventLikelihoodValue),
    localLikelihoodAverage: localLikelihood.average,
    localLikelihoodTrend: likelihoodTrendLabel(eventLikelihoodValue - previousLikelihood, localLikelihood.average),
    likelihoodField: field?.likelihoodField,
    nearestLikelihoodNode,
    graphNode,
    graphDiagnostics,
    graphNeighborhood,
    graphTransition,
    viewFilters,
    graphFilterStatus: graphNode ? (nodeVisibleByFilters(graphNode, viewFilters, transitionCells, col, row) ? 'visible' : 'filtered') : 'no node',
    incomingCausalMessages: incomingMessages.slice(0, 6),
    outgoingCausalMessages: outgoingMessages.slice(0, 6),
    strongestIncomingFiltered: incomingMessages.sort((a, b) => b.strength - a.strength)[0] ?? null,
    strongestOutgoingFiltered: outgoingMessages.sort((a, b) => b.strength - a.strength)[0] ?? null,
    roiRoles,
    depletedStatus: roiRoles.depleted ? 'depleted/dead derived' : 'not depleted',
    selectedNeighborhoodAction: graphNode ? 'Show selected node neighborhood via Incoming/Outgoing selected filters' : 'n/a',
    nearestCluster,
    graphUpdateRule: field?.graphField?.updateRule ?? field?.graphField?.graph?.updateRule ?? 'memoryless',
    graphTopology: field?.graphField?.topology ?? field?.graphField?.graph?.topology ?? '8-neighbor',
    graphEdgeCount: field?.graphField?.edgeCount ?? field?.graphField?.graph?.edgeCount ?? 0,
    spatialPattern,
    valueDistribution: field?.valueDistribution ?? context.valueDistribution,
    valueDistributionLabel: field?.valueDistributionLabel ?? roiValueDistributionLabel(context.valueDistribution),
    seededValue: field?.valueDistributionSeeded ? 'yes' : 'no',
    valueBand: valueBandLabel(value),
    spatialPatternHelp: spatialHelp,
    spatialParameterSummary: spatialParameterSummary(spatialPattern, {
      clusterCount: field?.clusterCount ?? context.hotspotCount,
      clusterSize: field?.clusterSize ?? context.clusterSize,
      seed: context.seed,
      noise: context.noise
    }),
    clusterCount: field?.clusterCount ?? context.hotspotCount,
    clusterSize: field?.clusterSize ?? context.clusterSize,
    temporalPattern: field?.temporalPattern ?? context.temporalPattern,
    temporalBehavior: field?.temporalBehavior ?? context.temporalBehavior,
    evolutionModel: field?.evolutionModel ?? context.evolutionModel,
    dynamicComplexity: field?.dynamicComplexity ?? context.dynamicComplexity,
    patternEvolution: field?.patternEvolution ?? context.patternEvolution,
    spatialEvolution: field?.spatialEvolution ?? context.spatialEvolution,
    spatialEvolutionLabel: field?.spatialEvolutionLabel ?? roiSpatialEvolutionLabel(context.spatialEvolution),
    motionScope: field?.motionScope ?? context.motionScope,
    motionScopeLabel: field?.motionScopeLabel ?? roiMotionScopeLabel(context.motionScope),
    interactionScale: field?.interactionScale ?? context.interactionScale,
    interactionScaleLabel: field?.interactionScaleLabel ?? roiInteractionScaleLabel(context.interactionScale),
    depletionMode: field?.depletionMode ?? context.depletionMode,
    displayMode: field?.displayMode ?? context.displayMode,
    stateModel: field?.stateModel ?? context.stateModel,
    stateModelLabel: field?.stateModelLabel ?? roiStateModelLabel(context.stateModel),
    stateModelDescription: field?.stateModelDescription ?? roiStateModelDescription(context.stateModel),
    behavior: field?.behavior,
    rawBase,
    depleted,
    hotspotMembership: hotspot ? `cluster/high-value rank ${1 + (field.highValueCells ?? []).indexOf(hotspot)}` : 'none',
    lastSampled: context.depletionMode === 'none' ? 'n/a' : 'synthetic demo marker',
    recovery: context.depletionMode === 'revisitRecovery' || context.displayMode === 'freshnessRevisitValue' ? recoveryLabel(context.demoTime) : 'n/a',
    sampleFieldConfig: field?.sampleFieldConfig,
    demoTime: context.demoTime,
    paused: context.paused
  };
}

function nearestLikelihoodNodeForCell(model, cell) {
  const nodes = model?.nodes ?? [];
  const width = model?.values?.[0]?.length ?? 0;
  const height = model?.values?.length ?? 0;
  if (!nodes.length || !width || !height) return null;
  const nx = width > 1 ? Number(cell.col ?? cell.x ?? 0) / (width - 1) : 0;
  const ny = height > 1 ? Number(cell.row ?? cell.y ?? 0) / (height - 1) : 0;
  return nodes
    .map((node) => ({
      ...node,
      distance: Math.hypot(nx - Number(node.x ?? 0), ny - Number(node.y ?? 0))
    }))
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function nearestClusterForCell(clusters, cell, width, height) {
  if (!Array.isArray(clusters) || !clusters.length || !width || !height) return null;
  const nx = width > 1 ? Number(cell.col ?? cell.x ?? 0) / (width - 1) : 0;
  const ny = height > 1 ? Number(cell.row ?? cell.y ?? 0) / (height - 1) : 0;
  return clusters
    .map((cluster) => ({
      ...cluster,
      distance: Math.hypot(nx - Number(cluster.x ?? 0), ny - Number(cluster.y ?? 0))
    }))
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function localLikelihoodMeshStats(values, cell) {
  const row = Number(cell.row ?? cell.y ?? 0);
  const col = Number(cell.col ?? cell.x ?? 0);
  const samples = [];
  for (let y = row - 1; y <= row + 1; y += 1) {
    for (let x = col - 1; x <= col + 1; x += 1) {
      if (x === col && y === row) continue;
      const value = Number(values?.[y]?.[x]);
      if (Number.isFinite(value)) samples.push(value);
    }
  }
  const average = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
  return { average };
}

function likelihoodMeshPercentile(value) {
  const number = Number(value) || 0;
  if (number >= 0.9) return 'near-triggering';
  if (number >= 0.7) return 'high';
  if (number >= 0.25) return 'active';
  if (number >= 0.15) return 'low';
  return 'background';
}

function likelihoodTrendLabel(delta, localAverage) {
  const change = Number(delta) || 0;
  if (change > 0.015) return 'increasing';
  if (change < -0.015) return 'cooling';
  if (Number(localAverage) >= 0.7) return 'locally high';
  return 'stable';
}

function valueBandLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  if (number < 0.33) return 'low';
  if (number < 0.67) return 'medium';
  return 'high';
}

function likelihoodBandLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  if (number < 0.25) return 'unlikely';
  if (number < 0.6) return 'possible';
  return 'event-prone';
}

function formatStat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : 'N/A';
}

function spatialParameterSummary(pattern, { clusterCount, clusterSize, seed, noise }) {
  return {
    constantField: 'base value; distribution controls value variation',
    uniformField: 'base value; distribution controls value variation',
    gradientField: `directional trend, smoothness, noise ${formatStat(noise)}`,
    clusteredField: `${clusterCount} cluster(s), ${roiClusterSizeLabel(clusterSize).toLowerCase()} spread`,
    patchyField: `correlation length, smoothness, contrast, noise ${formatStat(noise)}`,
    sparseTargets: `target count ${clusterCount}, small radius`,
    linearBand: 'orientation, width, position, softness',
    frontBoundary: 'orientation, sharpness, contrast',
    boundaryBand: 'boundary side, width, softness, intensity',
    monitoringStations: `station count ${clusterCount}, revisit recovery`,
    seededTexture: `texture scale, smoothness, seed ${seed}`
  }[pattern] ?? `seed ${seed}`;
}

function recoveryLabel(time) {
  const phase = (Math.sin(Number(time) * 0.11) + 1) / 2;
  if (phase > 0.72) return 'recovering';
  if (phase < 0.28) return 'recently depleted';
  return 'partial';
}

function topGraphMessages(graphField, { maxEdges = 100, threshold = 0.04, filters = null, selectedCell = null } = {}) {
  const emitted = graphField?.edgeMessages ?? [];
  const normalizedFilters = normalizeRoiDemoViewFilters(filters);
  const selected = selectedCell ? { x: Number(selectedCell.col ?? selectedCell.x), y: Number(selectedCell.row ?? selectedCell.y) } : null;
  if (emitted.length) {
    return emitted
      .map((message) => ({
        source: {
          x: Number(message.sourceCell?.x ?? message.source?.x ?? graphNodeCol(message.source, graphField)),
          y: Number(message.sourceCell?.y ?? message.source?.y ?? graphNodeRow(message.source, graphField)),
          id: message.source
        },
        target: {
          x: Number(message.targetCell?.x ?? message.target?.x ?? graphNodeCol(message.target, graphField)),
          y: Number(message.targetCell?.y ?? message.target?.y ?? graphNodeRow(message.target, graphField)),
          id: message.target
        },
        strength: Number(message.messageStrength ?? message.strength ?? 0),
        sameCommunity: Boolean(message.sameCommunity),
        communityId: message.communityId ?? null,
        sourceType: 'emitted',
        cause: message.cause,
        label: message.label,
        messageType: messageTypeForGraphMessage(message)
      }))
      .filter((message) => Number.isFinite(message.strength) && message.strength >= threshold)
      .filter((message) => graphMessageVisibleByFilters(message, normalizedFilters, selected))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, Math.max(0, normalizedFilters.showTopMessagesOnly ? maxEdges : Math.max(maxEdges, emitted.length)));
  }
  const nodeGrid = graphField?.nodeGrid ?? [];
  const messages = [];
  for (let y = 0; y < nodeGrid.length; y += 1) {
    for (let x = 0; x < (nodeGrid[y]?.length ?? 0); x += 1) {
      const source = nodeGrid[y]?.[x];
      if (!source) continue;
      for (const [dx, dy] of GRAPH_MESSAGE_NEIGHBORS) {
        const target = nodeGrid[y + dy]?.[x + dx];
        if (!target) continue;
        const strength = graphMessageStrength(source, target);
        if (strength < threshold) continue;
        messages.push({
          source: { x, y, id: source.id },
          target: { x: x + dx, y: y + dy, id: target.id },
          strength: Number(strength.toFixed(4)),
          sameCommunity: source.communityId === target.communityId,
          communityId: source.communityId ?? null,
          sourceType: 'inferred',
          cause: 'diagnostic_inferred_from_node_totals',
          label: 'inferred diagnostic message',
          messageType: 'generic'
        });
      }
    }
  }
  return messages
    .filter((message) => graphMessageVisibleByFilters(message, normalizedFilters, selected))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, Math.max(0, normalizedFilters.showTopMessagesOnly ? maxEdges : Math.max(maxEdges, messages.length)));
}

function graphMessageVisibleByFilters(message, filters, selected) {
  if (message.sameCommunity && filters.sameCommunity === false) return false;
  if (!message.sameCommunity && filters.crossCommunity === false) return false;
  const type = message.messageType ?? messageTypeForGraphMessage(message);
  if (filters.messageTypes?.[type] === false) return false;
  if (filters.incomingToSelected && selected && !(message.target.x === selected.x && message.target.y === selected.y)) return false;
  if (filters.outgoingFromSelected && selected && !(message.source.x === selected.x && message.source.y === selected.y)) return false;
  return true;
}

function messageTypeForGraphMessage(message = {}) {
  const text = `${message.rule ?? ''} ${message.cause ?? ''} ${message.label ?? ''}`.toLowerCase();
  if (/inhibit|suppress|block/.test(text)) return 'inhibition';
  if (/recover|fresh|revisit|restore/.test(text)) return 'recovery';
  if (/cool|deplet|consum|decay/.test(text)) return 'cooldown';
  if (/drift|walk|transport|advect|move/.test(text)) return 'drift';
  if (/activate|birth|spread|front|trigger|edge/.test(text)) return 'activation';
  return 'generic';
}

function nodeVisibleByFilters(node, filters, transitionCells, x, y) {
  const state = node?.state ?? 'inactive';
  if (filters?.transitionNodesOnly && !transitionCells.has(`${x},${y}`)) return false;
  return filters?.nodeStates?.[state] !== false;
}

function roiMeaningRoles({ value, likelihood, node, isTransition }) {
  return {
    current: value >= 0.62,
    nearFuture: likelihood >= 0.62 || Number(node?.incomingMessage ?? 0) >= 0.18,
    depleted: value <= 0.18 || ['consumed', 'inhibited'].includes(node?.state),
    transitionBoundary: Boolean(isTransition) || Math.abs(Number(node?.incomingMessage ?? 0) - Number(node?.outgoingMessage ?? 0)) >= 0.24
  };
}

function graphNodeCol(id, graphField) {
  const width = graphField?.graph?.width ?? graphField?.width ?? graphField?.nodeGrid?.[0]?.length ?? 1;
  return Number.isFinite(Number(id)) ? Number(id) % width : 0;
}

function graphNodeRow(id, graphField) {
  const width = graphField?.graph?.width ?? graphField?.width ?? graphField?.nodeGrid?.[0]?.length ?? 1;
  return Number.isFinite(Number(id)) ? Math.floor(Number(id) / width) : 0;
}

const GRAPH_MESSAGE_NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1]
];

function graphMessageStrength(source, target) {
  const outgoing = Number(source.outgoingMessage ?? source.activation ?? source.cellLikelihood ?? source.likelihood ?? 0);
  const incoming = Number(target.incomingMessage ?? 0);
  const targetReadiness = Number(target.cellLikelihood ?? target.likelihood ?? target.activation ?? 0);
  const stateBoost = target.state === 'susceptible' || target.state === 'recovering' ? 1 : target.state === 'inhibited' || target.state === 'consumed' ? 0.35 : 0.75;
  const communityFactor = source.communityId === target.communityId ? 1 : 0.52;
  return Math.max(0, (outgoing * 0.62 + incoming * 0.18 + targetReadiness * 0.2) * stateBoost * communityFactor);
}

function graphMessageNeighborhood(graphField, cell) {
  const emitted = topGraphMessages(graphField, { maxEdges: 500, threshold: 0 });
  const nodeGrid = graphField?.nodeGrid ?? [];
  const x = Number(cell?.col ?? cell?.x ?? 0);
  const y = Number(cell?.row ?? cell?.y ?? 0);
  const node = nodeGrid[y]?.[x];
  if (!node) return null;
  if (emitted.some((message) => message.sourceType === 'emitted')) {
    const incoming = emitted.filter((message) => message.target.x === x && message.target.y === y);
    const outgoing = emitted.filter((message) => message.source.x === x && message.source.y === y);
    let inhibitedNeighborCount = 0;
    for (const [dx, dy] of GRAPH_MESSAGE_NEIGHBORS) {
      if (nodeGrid[y + dy]?.[x + dx]?.state === 'inhibited') inhibitedNeighborCount += 1;
    }
    return {
      strongestIncoming: incoming.sort((a, b) => b.strength - a.strength)[0] ?? null,
      strongestOutgoing: outgoing.sort((a, b) => b.strength - a.strength)[0] ?? null,
      inhibitedNeighborCount,
      sourceType: 'emitted'
    };
  }
  const incoming = [];
  const outgoing = [];
  let inhibitedNeighborCount = 0;
  for (const [dx, dy] of GRAPH_MESSAGE_NEIGHBORS) {
    const neighbor = nodeGrid[y + dy]?.[x + dx];
    if (!neighbor) continue;
    if (neighbor.state === 'inhibited') inhibitedNeighborCount += 1;
    incoming.push({
      source: { x: x + dx, y: y + dy, id: neighbor.id },
      target: { x, y, id: node.id },
      strength: graphMessageStrength(neighbor, node)
    });
    outgoing.push({
      source: { x, y, id: node.id },
      target: { x: x + dx, y: y + dy, id: neighbor.id },
      strength: graphMessageStrength(node, neighbor)
    });
  }
  return {
    strongestIncoming: incoming.sort((a, b) => b.strength - a.strength)[0] ?? null,
    strongestOutgoing: outgoing.sort((a, b) => b.strength - a.strength)[0] ?? null,
    inhibitedNeighborCount,
    sourceType: 'inferred'
  };
}

function graphTransitionForCell(graphField, cell) {
  const x = Number(cell?.col ?? cell?.x ?? 0);
  const y = Number(cell?.row ?? cell?.y ?? 0);
  return (graphField?.nodeTransitions ?? []).find((transition) => Number(transition.col) === x && Number(transition.row) === y) ?? null;
}


