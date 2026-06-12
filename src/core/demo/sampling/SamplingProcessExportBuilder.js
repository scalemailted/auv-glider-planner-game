import { normalizeRoiDemoViewFilters } from '../DemoRoiFields.js';
import { sampleFieldBehaviorSignature } from '../SampleFieldBehaviorExplainers.js';
import { componentCompatibilityWarnings, componentIsolationHint } from '../SampleFieldComponentHints.js';
import {
  sampleFieldBehaviorPresetMetadata
} from '../SampleFieldBehaviorPresets.js';
import {
  referenceSignatureMetadata
} from '../roi/RoiReferenceSignatures.js';
import {
  buildDemoArtifactEnvelope,
  cloneField,
  normalizeDemoExportSettings
} from '../../io/DemoArtifactExporter.js';
import {
  SAMPLING_PROCESS_EXPORT_TYPE,
  SAMPLING_PROCESS_LAB_TITLE,
  SAMPLING_PROCESS_LEGACY_DEMO_NAME,
  SAMPLING_PROCESS_SCENARIO_TYPE,
  samplingProcessStatusLabel,
  sourceFieldBoundaryNote
} from './SamplingProcessTerminology.js';
import {
  SAMPLING_PROCESS_RULE_CATALOG_VERSION,
  SAMPLING_PROCESS_RULES,
  processRuleAliases
} from './SamplingProcessRules.js';
import { validateSamplingProcessPaintModel } from './SamplingProcessPaintModel.js';

export function buildSamplingProcessDemoArtifactExport(context = {}) {
  const field = context.field ?? {};
  const sampling = context.sampling ?? buildSamplingProcessExportSampling(context);
  const currentFrame = context.currentFrame ?? context.buildFrameAtTime?.(context.demoTime, null, field);
  const frames = context.frames ?? sampling.timesSeconds.map((time, index) => context.buildFrameAtTime?.(time, index)).filter(Boolean);
  const behaviorPreset = context.behaviorPreset ?? sampleFieldBehaviorPresetMetadata(context.behaviorPresetId, context.behaviorPresetModified);
  const paintMetadata = buildSamplingProcessPaintExportMetadata(context);
  const referenceMetadata = buildSamplingProcessReferenceExportMetadata(context, behaviorPreset);
  const componentRecipe = context.componentRecipe ?? buildSamplingProcessComponentRecipeExport(context);
  const statusLabel = context.statusLabel ?? samplingProcessStatusLabel({
    mode: context.processMode,
    patternSource: context.patternSource,
    modified: Boolean(context.referenceSignatureModified || context.behaviorPresetModified || paintMetadata.paintValidation?.paintedCellCount > 0),
    validationStatus: paintMetadata.paintValidation?.status === 'FAIL'
      ? 'FAIL'
      : field.activityDiagnostics?.presetValidation?.status ?? 'PASS'
  });
  const ruleMetadata = buildSamplingProcessRuleCatalogMetadata(context);
  return buildDemoArtifactEnvelope({
    type: SAMPLING_PROCESS_EXPORT_TYPE,
    legacyType: 'anchor.demo.sample-roi-field',
    demo: context.demo ?? context.title ?? SAMPLING_PROCESS_LAB_TITLE,
    demoName: SAMPLING_PROCESS_LAB_TITLE,
    legacyDemoName: SAMPLING_PROCESS_LEGACY_DEMO_NAME,
    grid: {
      width: field.width,
      height: field.height
    },
    time: {
      demoTimeSeconds: context.demoTime,
      fieldTimeSeconds: field.time ?? context.demoTime,
      playbackDirection: context.playbackDirection,
      playbackSpeed: context.timeSpeedScale
    },
    timeSampling: sampling,
    config: context.sceneConfig ?? {},
    patternMode: context.processMode,
    validationStatus: statusLabel,
    ...ruleMetadata,
    viewFilters: context.viewFilters,
    fields: currentFrame?.fields,
    likelihoodField: currentFrame?.likelihoodField,
    graphField: currentFrame?.graphField,
    clusters: currentFrame?.clusters,
    frames,
    selectedCell: context.selectedCell ? context.inspectSelectedCell?.() ?? context.selectedCellInspection ?? null : null,
    behaviorPreset,
    patternSource: context.patternSource,
    processMode: context.processMode,
    statusLabel,
    ...paintMetadata.publicFields,
    ...referenceMetadata.publicFields,
    componentRecipe,
    legacyPresetId: context.patternSource === 'legacyPreset' ? context.behaviorPresetId : null,
    legacyPresetMappedReferenceSignature: referenceMetadata.legacyPresetMappedReferenceSignature,
    metadata: {
      patternSource: context.patternSource,
      processMode: context.processMode,
      statusLabel,
      ...paintMetadata.metadataFields,
      sourceFieldTerminology: sourceFieldBoundaryNote(),
      ...ruleMetadata,
      ruleEngineDiagnostics: field.graphField?.diagnostics?.ruleEngineDiagnostics ?? field.graphField?.diagnostics ?? null,
      viewFilters: context.viewFilters,
      behaviorPreset,
      ...referenceMetadata.metadataFields,
      componentRecipe,
      legacyPresetId: context.patternSource === 'legacyPreset' ? context.behaviorPresetId : null,
      legacyPresetMappedReferenceSignature: referenceMetadata.legacyPresetMappedReferenceSignature,
      processContract: behaviorPreset.processContract,
      behaviorSignature: sampleFieldBehaviorSignature(behaviorPreset.id, behaviorPreset.processContract),
      recipe: behaviorPreset.processContract?.components,
      activeComponentRecipe: buildSamplingProcessActiveComponentRecipeMetadata(context),
      modifiedComponent: context.modifiedComponent,
      componentHint: componentIsolationHint(context.modifiedComponent),
      compatibilityWarnings: componentCompatibilityWarnings(context.sceneConfig ?? {}),
      roiInterpretation: behaviorPreset.processContract?.roiInterpretation,
      coordinateConvention: 'Row-major arrays indexed fields[layer][row][col]; values represent cell centers on the demo grid.',
      units: {
        displayedValue: 'normalized demo scalar, 0..1',
        sampleValue: 'normalized realized sample scalar S(x,y,t), 0..1',
        eventLikelihood: 'normalized event likelihood L(x,y,t), 0..1',
        rawBaseValue: 'seeded base sample value before temporal/evolution/display effects, 0..1',
        evolvedValue: 'sample value after temporal/spatial evolution when available, 0..1'
      },
      stats: field.stats,
      activityDiagnostics: field.activityDiagnostics,
      likelihoodField: field.likelihoodField,
      likelihoodMesh: field.likelihoodField?.mesh,
      graphField: field.graphField?.graph,
      processMetadata: field.graphField?.processMetadata,
      validation: field.activityDiagnostics?.presetValidation ?? null,
      clusters: field.graphField?.clusters,
      highValueCells: field.highValueCells,
      freshnessNote: 'Freshness / Age of Information layers are demo-only unless connected to real mission visit history.',
      historyAwareExport: {
        supported: true,
        method: 'deterministic-resample-from-current-config-at-each-requested-time',
        notes: 'Sampling visits and freshness are synthetic demo effects, not mission glider visit history.'
      },
      exportFrameLimit: 240
    }
  });
}

export function buildSamplingProcessDemoArtifactFrame(context = {}, time, index, fieldOverride = null) {
  const field = fieldOverride ?? context.field ?? {};
  const processLayers = context.processLayers ?? {};
  const viewFilters = context.viewFilters ?? {};
  const processMessages = topGraphMessages(field.graphField, {
    maxEdges: Math.max(120, viewFilters.maxMessages ?? 80),
    threshold: viewFilters.messageStrengthThreshold,
    filters: viewFilters,
    selectedCell: context.selectedCell
  });
  const demoTime = time ?? context.demoTime ?? field.time ?? 0;
  return {
    index,
    timeSeconds: demoTime,
    demoTimeSeconds: demoTime,
    fieldTimeSeconds: field.time ?? demoTime,
    fields: {
      displayedValue: cloneField(field.field),
      sampleValue: cloneField(field.sampleValueField ?? field.field),
      samplingValue: cloneField(field.samplingValueField ?? field.sampleValueField ?? field.field),
      valueLayer: cloneField(field.valueLayer ?? field.sampleValueField ?? field.field),
      eventLikelihood: cloneField(field.eventLikelihoodField),
      sourceField: cloneField(field.sourceField ?? field.eventLikelihoodField),
      legacyEventLikelihoodField: cloneField(field.eventLikelihoodField),
      rawBaseValue: cloneField(field.rawBaseField),
      evolvedValue: cloneField(field.evolvedField),
      graphState: cloneField(field.graphField?.stateField),
      stateLayer: cloneField(field.graphField?.stateField ?? processLayers.stateLayer),
      ruleLayer: cloneField(processLayers.ruleLayer),
      resolvedRuleLayer: cloneField(field.graphField?.resolvedRuleField ?? processLayers.resolvedRuleLayer),
      parameterLayer: cloneField(processLayers.parameterLayer),
      groupLayer: cloneField(processLayers.groupLayer),
      transitionLayer: cloneNodeTransitions(field.graphField?.nodeTransitions),
      transitionField: cloneField(field.transitionLayer ?? field.graphField?.transitionField),
      roiRoleLayer: cloneField(field.roiRoleLayer) ?? roiRoleField(field, processLayers),
      graphActivation: cloneField(field.graphField?.activationField),
      graphCommunityId: graphCommunityField(field.graphField),
      graphClusterLikelihood: cloneField(field.graphField?.clusterLikelihoodField),
      graphIncomingMessage: cloneField(field.graphField?.incomingMessageField),
      graphTopMessages: processMessages,
      processMessages,
      edgeMessages: cloneEdgeMessages(field.graphField?.edgeMessages),
      graphNodeTransitions: cloneNodeTransitions(field.graphField?.nodeTransitions)
    },
    likelihoodField: cloneLikelihoodFieldModel(field.likelihoodField),
    graphField: cloneGraphFieldModel(field.graphField),
    clusters: cloneClusters(field.graphField?.clusters),
    activityDiagnostics: field.activityDiagnostics,
    behaviorPreset: context.behaviorPreset ?? sampleFieldBehaviorPresetMetadata(context.behaviorPresetId, context.behaviorPresetModified)
  };
}

export function buildSamplingProcessExportSampling(context = {}) {
  return normalizeDemoExportSettings({
    exportMode: context.exportMode ?? context.exportSettings?.exportMode,
    startTimeSeconds: context.exportStartTime ?? context.exportSettings?.startTimeSeconds,
    endTimeSeconds: context.exportEndTime ?? context.exportSettings?.endTimeSeconds,
    frameCount: context.exportFrameCount ?? context.exportSettings?.frameCount
  }, context.demoTime);
}

export function buildSamplingProcessPaintExportMetadata(context = {}) {
  const paintValidation = context.paintValidation ?? validateSamplingProcessPaintModel(context.paintModel);
  const paintSettings = context.paintSettings ?? {};
  const groupDefinitions = context.groupDefinitions ?? context.paintModel?.groups ?? {};
  return {
    paintValidation,
    publicFields: {
      paintStartMode: context.paintStartMode,
      paintSettings,
      groupDefinitions,
      ruleAllocation: context.paintModel
    },
    metadataFields: {
      paintStartMode: context.paintStartMode,
      paintSettings,
      groupDefinitions,
      ruleAllocation: context.paintModel,
      paintValidation
    }
  };
}

export function buildSamplingProcessReferenceExportMetadata(context = {}, behaviorPreset = null) {
  const referenceSignature = context.referenceSignature ?? referenceSignatureMetadata(context.referenceSignatureId, context.referenceSignatureModified);
  const legacyPresetMappedReferenceSignature = context.patternSource === 'legacyPreset'
    ? (behaviorPreset ?? sampleFieldBehaviorPresetMetadata(context.behaviorPresetId, context.behaviorPresetModified)).referenceSignature
    : null;
  const fields = {
    referenceSignature,
    referenceSignatureId: referenceSignature?.id ?? null,
    referenceSignatureLabel: referenceSignature?.label ?? null,
    referenceSignatureAliases: referenceSignature?.aliases ?? [],
    referenceSignatureCategory: referenceSignature?.category ?? null,
    referenceSignatureModified: referenceSignature?.modified ?? false,
    referenceSignatureMetadata: referenceSignature,
    referenceModels: referenceSignature?.referenceModels ?? [],
    referenceCoverageTags: referenceSignature?.referenceCoverageTags ?? [],
    referenceCatalogVersion: referenceSignature?.referenceCatalogVersion ?? null,
    caTaxonomy: referenceSignature?.caTaxonomy ?? null,
    expectedObservableSignature: referenceSignature?.expectedObservableSignature ?? null,
    qaExpectations: referenceSignature?.qaExpectations ?? null,
    phenotypeMetrics: referenceSignature?.phenotypeMetrics ?? null,
    genotypeNotes: referenceSignature?.genotypeNotes ?? null,
    taxonomyJustification: referenceSignature?.taxonomyJustification ?? null
  };
  return {
    referenceSignature,
    legacyPresetMappedReferenceSignature,
    publicFields: fields,
    metadataFields: fields
  };
}

export function buildSamplingProcessComponentRecipeExport(context = {}) {
  return {
    ...(context.sceneConfig ?? {}),
    eventLikelihood: context.field?.eventLikelihood ?? context.eventLikelihood,
    spatialPattern: context.field?.pureSpatialPattern ?? context.spatialPattern,
    valueDistribution: context.field?.valueDistribution ?? context.valueDistribution,
    temporalPattern: context.field?.temporalPattern ?? context.temporalPattern,
    spatialEvolution: context.field?.spatialEvolution ?? context.spatialEvolution,
    interactionScale: context.field?.interactionScale ?? context.interactionScale,
    stateModel: context.field?.stateModel ?? context.stateModel,
    depletionMode: context.field?.depletionMode ?? context.depletionMode,
    displayMode: context.field?.displayMode ?? context.displayMode
  };
}

export function buildSamplingProcessScenarioMetadata(context = {}, scenario = {}) {
  return {
    preferredType: SAMPLING_PROCESS_SCENARIO_TYPE,
    legacyType: scenario.type,
    processMode: context.processMode,
    statusLabel: samplingProcessStatusLabel({
      mode: context.processMode,
      patternSource: context.patternSource,
      modified: Boolean(context.referenceSignatureModified || context.behaviorPresetModified || Object.keys(context.paintModel?.cells ?? {}).length > 0),
      validationStatus: scenario.validation?.status ?? 'PASS'
    }),
    ruleAllocation: context.paintModel
  };
}

function buildSamplingProcessRuleCatalogMetadata() {
  return {
    processRuleCatalogVersion: SAMPLING_PROCESS_RULE_CATALOG_VERSION,
    canonicalRuleIds: SAMPLING_PROCESS_RULES.map((rule) => rule.id),
    ruleAliases: processRuleAliases()
  };
}

function buildSamplingProcessActiveComponentRecipeMetadata(context = {}) {
  return {
    eventLikelihood: context.field?.eventLikelihood ?? context.eventLikelihood,
    spatialPattern: context.field?.pureSpatialPattern ?? context.spatialPattern,
    valueDistribution: context.field?.valueDistribution ?? context.valueDistribution,
    temporalPattern: context.field?.temporalPattern ?? context.temporalPattern,
    spatialEvolution: context.field?.spatialEvolution ?? context.spatialEvolution,
    interactionScale: context.field?.interactionScale ?? context.interactionScale,
    stateModel: context.field?.stateModel ?? context.stateModel,
    samplingEffect: context.field?.depletionMode ?? context.depletionMode,
    displayLayer: context.field?.displayMode ?? context.displayMode,
    seed: context.seed
  };
}

function cloneLikelihoodFieldModel(model) {
  if (!model) return null;
  return {
    type: model.type,
    label: model.label,
    values: cloneField(model.values),
    nodes: (model.nodes ?? []).map((node) => ({
      ...node,
      driftVelocity: node.driftVelocity ? { ...node.driftVelocity } : undefined
    })),
    metadata: { ...(model.metadata ?? {}) },
    mesh: { ...(model.mesh ?? {}) },
    diagnostics: { ...(model.diagnostics ?? {}) }
  };
}

function cloneGraphFieldModel(model) {
  if (!model) return null;
  const topMessages = topGraphMessages(model, { maxEdges: 120 });
  return {
    topology: model.topology,
    nodeCount: model.nodeCount,
    edgeCount: model.edgeCount,
    updateRule: model.updateRule,
    communityCount: model.diagnostics?.clusterCount ?? model.graph?.clusterDiagnostics?.clusterCount ?? model.clusters?.length ?? 0,
    edgeMessageFields: ['source', 'target', 'weight', 'messageStrength', 'strength', 'sameCommunity', 'communityId', 'sameGroup', 'groupId', 'ruleId', 'messageType', 'cause', 'label'],
    processMetadata: model.processMetadata ? { ...model.processMetadata } : null,
    nodeStateFields: [...(model.nodeStateFields ?? model.graph?.nodeStateFields ?? [])],
    graph: model.graph ? {
      hierarchy: model.graph.hierarchy,
      topology: model.graph.topology,
      nodeCount: model.graph.nodeCount,
      edgeCount: model.graph.edgeCount,
      updateRule: model.graph.updateRule,
      nodeStateFields: [...(model.graph.nodeStateFields ?? [])],
      diagnostics: { ...(model.graph.diagnostics ?? {}) },
      clusterDiagnostics: { ...(model.graph.clusterDiagnostics ?? {}) },
      clusters: cloneClusters(model.graph.clusters),
      directionalBias: model.graph.directionalBias ? { ...model.graph.directionalBias } : null,
      communityBoundaryPenalty: model.graph.communityBoundaryPenalty
    } : null,
    diagnostics: { ...(model.diagnostics ?? {}) },
    stateField: cloneField(model.stateField),
    ruleField: cloneField(model.ruleField),
    resolvedRuleField: cloneField(model.resolvedRuleField),
    activationField: cloneField(model.activationField),
    communityIdField: graphCommunityField(model),
    clusterLikelihoodField: cloneField(model.clusterLikelihoodField),
    incomingMessageField: cloneField(model.incomingMessageField),
    edgeMessages: cloneEdgeMessages(model.edgeMessages),
    nodeTransitions: cloneNodeTransitions(model.nodeTransitions),
    transitionField: cloneField(model.transitionField),
    topMessages,
    clusters: cloneClusters(model.clusters),
    nodes: (model.nodes ?? []).map((node) => ({
      id: node.id,
      row: node.row,
      col: node.col,
      clusterId: node.clusterId,
      clusterLikelihood: node.clusterLikelihood,
      likelihood: node.likelihood,
      cellLikelihood: node.cellLikelihood,
      activation: node.activation,
      sampleValue: node.sampleValue,
      state: node.state,
      cooldown: node.cooldown,
      recovery: node.recovery,
      freshness: node.freshness,
      communityId: node.communityId,
      incomingMessage: node.incomingMessage,
      outgoingMessage: node.outgoingMessage,
      neighborCount: node.neighborCount,
      activeNeighborCount: node.activeNeighborCount
    }))
  };
}

function cloneClusters(clusters) {
  if (!Array.isArray(clusters)) return null;
  return clusters.map((cluster) => ({
    id: cluster.id,
    communityId: cluster.communityId,
    center: cluster.center ? { ...cluster.center } : null,
    x: cluster.x,
    y: cluster.y,
    radius: cluster.radius,
    likelihood: cluster.likelihood,
    state: cluster.state,
    phase: cluster.phase,
    amplitude: cluster.amplitude,
    cooldown: cluster.cooldown,
    recovery: cluster.recovery,
    growthRate: cluster.growthRate,
    mobility: cluster.mobility,
    eventType: cluster.eventType,
    memberCellCount: cluster.memberCellCount
  }));
}

function cloneEdgeMessages(messages) {
  if (!Array.isArray(messages)) return null;
  return messages.slice(0, 240).map((message) => ({
    source: message.source,
    target: message.target,
    sourceCell: message.sourceCell ? { ...message.sourceCell } : null,
    targetCell: message.targetCell ? { ...message.targetCell } : null,
    weight: message.weight,
    messageStrength: message.messageStrength ?? message.strength,
    strength: message.strength ?? message.messageStrength,
    sameCommunity: message.sameCommunity,
    communityId: message.communityId,
    sameGroup: message.sameGroup,
    groupId: message.groupId,
    ruleId: message.ruleId,
    messageType: message.messageType,
    rule: message.rule,
    cause: message.cause,
    label: message.label
  }));
}

function cloneNodeTransitions(transitions) {
  if (!Array.isArray(transitions)) return null;
  return transitions.slice(0, 240).map((transition) => ({
    nodeId: transition.nodeId,
    row: transition.row,
    col: transition.col,
    communityId: transition.communityId,
    previousState: transition.previousState,
    nextState: transition.nextState,
    state: transition.state,
    cause: transition.cause,
    ruleId: transition.ruleId,
    groupId: transition.groupId,
    time: transition.time
  }));
}

function graphCommunityField(graphField) {
  const nodeGrid = graphField?.nodeGrid ?? [];
  return nodeGrid.map((row) => row.map((node) => node?.communityId ?? null));
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

function roiRoleField(field, processLayers = {}) {
  const sample = field?.sampleValueField ?? field?.field ?? [];
  const source = field?.sourceField ?? field?.eventLikelihoodField ?? [];
  const transitions = new Set((field?.graphField?.nodeTransitions ?? []).map((transition) => `${transition.col},${transition.row}`));
  const height = field?.height ?? sample.length;
  const width = field?.width ?? sample[0]?.length ?? 0;
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => {
    const roles = roiMeaningRoles({
      value: Number(sample[row]?.[col] ?? 0),
      likelihood: Number(source[row]?.[col] ?? 0),
      node: field?.graphField?.nodeGrid?.[row]?.[col] ?? { state: processLayers.stateLayer?.[row]?.[col] },
      isTransition: transitions.has(`${col},${row}`)
    });
    if (roles.current) return 'currentROI';
    if (roles.nearFuture) return 'nearFutureROI';
    if (roles.depleted) return 'depleted';
    if (roles.transitionBoundary) return 'transitionBoundary';
    return 'background';
  }));
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
