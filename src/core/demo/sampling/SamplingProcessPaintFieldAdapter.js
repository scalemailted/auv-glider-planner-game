import { samplingProcessLayersFromPaint } from './SamplingProcessPaintModel.js';
import { frameFromLayers, stepSamplingProcess } from './SamplingProcessEvolution.js';
import { normalizeProcessRuleId } from './SamplingProcessRules.js';
import { samplingProcessStatusLabel } from './SamplingProcessTerminology.js';

export function buildSamplingProcessLayersForField({
  field = null,
  paintModel = null,
  processMode = 'foundationalCaModels',
  updateRuleHint = null
} = {}) {
  const graphField = field?.graphField ?? {};
  const width = field?.width ?? 24;
  const height = field?.height ?? 16;
  if (processMode === 'processPaint') {
    return samplingProcessLayersFromPaint(paintModel, blankProcessLayerFallback(width, height));
  }
  const fallback = {
    width,
    height,
    stateLayer: graphField.stateField,
    ruleLayer: Array.from({ length: height }, () => Array.from({ length: width }, () => normalizeProcessRuleId(graphField.updateRule ?? updateRuleHint ?? 'inert'))),
    groupLayer: graphCommunityField(graphField),
    sourceField: field?.sourceField ?? field?.eventLikelihoodField
  };
  return samplingProcessLayersFromPaint(paintModel, fallback);
}

export function buildSamplingProcessPaintField({
  baseField = null,
  processLayers = null,
  paintModel = null,
  seed = 'anchor-roi-demo',
  demoTime = 0,
  generationIndex = null,
  processPaintRunStarted = false,
  paused = false,
  paintStartMode = 'blankCanvas',
  displayMode = undefined
} = {}) {
  const width = baseField?.width ?? processLayers?.sourceField?.[0]?.length ?? paintModel?.width ?? 24;
  const height = baseField?.height ?? processLayers?.sourceField?.length ?? paintModel?.height ?? 16;
  const layers = processLayers ?? samplingProcessLayersFromPaint(paintModel, blankProcessLayerFallback(width, height));
  const evolved = runProcessPaintEvolutionFromLayers({
    layers,
    width,
    height,
    groupDefinitions: paintModel?.groups ?? {},
    seed,
    time: demoTime,
    generationIndex,
    runStarted: processPaintRunStarted
  });
  const displayLayers = evolved.layers;
  const samplingValueField = evolved.samplingValueField;
  const graphField = buildSamplingProcessGraphField({
    baseGraphField: baseField?.graphField,
    displayLayers,
    evolved,
    samplingValueField,
    paintModel,
    updateRuleLabel: 'processPaintRuleFamilies',
    width,
    height
  });
  const stats = fieldStats(samplingValueField);
  const field = {
    ...baseField,
    width,
    height,
    time: demoTime,
    ...(displayMode == null ? {} : { displayMode }),
    field: samplingValueField,
    sampleValueField: samplingValueField,
    samplingValueField,
    valueLayer: samplingValueField,
    rawBaseField: samplingValueField,
    evolvedField: samplingValueField,
    eventLikelihoodField: displayLayers.sourceField,
    sourceField: displayLayers.sourceField,
    transitionLayer: evolved.transitionLayer,
    roiRoleLayer: evolved.roiRoleLayer,
    processMessages: evolved.processMessages,
    likelihoodField: {
      ...(baseField?.likelihoodField ?? {}),
      type: 'processPaintSourceField',
      label: 'Source / Initial Field',
      values: displayLayers.sourceField,
      diagnostics: sourceFieldDiagnostics(displayLayers.sourceField),
      mesh: {
        activeThreshold: 0.25,
        highThreshold: 0.7,
        nearTriggerThreshold: 0.9
      }
    },
    highValueCells: highValueCellsFromField(samplingValueField),
    stats,
    activityDiagnostics: processPaintActivityDiagnostics({
      baseDiagnostics: baseField?.activityDiagnostics,
      samplingValueField,
      stats,
      evolved,
      paintModel,
      paused,
      paintStartMode
    }),
    graphField
  };
  return { field, processLayers: layers, evolved };
}

export function buildSamplingProcessGraphField({
  baseGraphField = null,
  displayLayers,
  evolved,
  samplingValueField,
  paintModel = null,
  updateRuleLabel = 'processPaintRuleFamilies',
  width,
  height
} = {}) {
  const nodeTransitions = transitionLayerToNodeTransitions(evolved.transitionLayer, displayLayers.groupLayer);
  const nodeGrid = processPaintNodeGrid(displayLayers, width, height, samplingValueField);
  return {
    ...(baseGraphField ?? {}),
    updateRule: updateRuleLabel,
    stateField: displayLayers.stateLayer,
    ruleField: displayLayers.ruleLayer,
    resolvedRuleField: displayLayers.resolvedRuleLayer,
    activationField: samplingValueField,
    incomingMessageField: incomingMessageFieldFromMessages(evolved.processMessages, width, height),
    clusterLikelihoodField: displayLayers.sourceField,
    transitionField: evolved.transitionLayer,
    nodeTransitions,
    edgeMessages: evolved.processMessages,
    nodeGrid,
    diagnostics: {
      ...(baseGraphField?.diagnostics ?? {}),
      updateRule: updateRuleLabel,
      topology: '8-neighbor',
      nodeCount: width * height,
      activeNodeCount: countLayerValues(displayLayers.stateLayer, 'active'),
      stateCounts: evolved.stateCounts ?? countStates(displayLayers.stateLayer),
      ruleCounts: evolved.ruleCounts,
      groupCounts: evolved.groupCounts,
      ruleEngineDiagnostics: evolved.diagnostics,
      edgeMessageTotal: evolved.processMessages.length,
      clusterCount: Math.max(0, Object.keys(paintModel?.groups ?? {}).length)
    }
  };
}

export function runProcessPaintEvolutionFromLayers({ layers, width, height, groupDefinitions = {}, seed = 'anchor-roi-demo', time = 0, generationIndex = null, runStarted = false }) {
  if (!runStarted) {
    const frame = frameFromLayers({
      ...layers,
      width,
      height,
      groupDefinitions,
      globalRuleId: 'inert',
      time: 0,
      seed
    });
    return {
      layers: {
        stateLayer: frame.stateLayer,
        ruleLayer: frame.ruleLayer,
        resolvedRuleLayer: frame.resolvedRuleLayer,
        groupLayer: frame.groupLayer,
        sourceField: frame.sourceField,
        parameterLayer: frame.parameterLayer
      },
      samplingValueField: frame.samplingValueField,
      roiRoleLayer: frame.roiRoleLayer,
      transitionLayer: frame.transitionLayer,
      processMessages: frame.processMessages,
      diagnostics: {
        ...(frame.diagnostics ?? {}),
        pausedEditingCanvas: true,
        stepCount: 0
      },
      stateCounts: frame.stateCounts,
      ruleCounts: frame.ruleCounts,
      groupCounts: frame.groupCounts
    };
  }
  let current = {
    stateLayer: layers.stateLayer,
    ruleLayer: layers.ruleLayer,
    groupLayer: layers.groupLayer,
    sourceField: layers.sourceField,
    parameterLayer: layers.parameterLayer
  };
  const requestedGeneration = generationIndex == null ? Math.floor(Number(time || 0) * 1.5) + 1 : Math.round(Number(generationIndex) || 0);
  const stepCount = Math.max(0, Math.min(240, requestedGeneration));
  let result = null;
  if (stepCount <= 0) {
    result = frameFromLayers({
      ...current,
      width,
      height,
      groupDefinitions,
      globalRuleId: 'inert',
      time: 0,
      seed
    });
  }
  for (let step = 0; step < stepCount; step += 1) {
    result = stepSamplingProcess({
      ...current,
      width,
      height,
      groupDefinitions,
      globalRuleId: 'inert',
      time: step,
      dt: 1,
      seed
    });
    current = result;
  }
  return {
    layers: {
      stateLayer: result.stateLayer,
      ruleLayer: layers.ruleLayer,
      resolvedRuleLayer: result.resolvedRuleLayer,
      groupLayer: layers.groupLayer,
      sourceField: result.sourceField,
      parameterLayer: result.parameterLayer
    },
    samplingValueField: result.samplingValueField,
    roiRoleLayer: result.roiRoleLayer,
    transitionLayer: result.transitionLayer,
    processMessages: result.processMessages,
    diagnostics: {
      ...(result.diagnostics ?? {}),
      stepCount,
      pausedEditingCanvas: false
    },
    stateCounts: result.stateCounts,
    ruleCounts: result.ruleCounts,
    groupCounts: result.groupCounts
  };
}

export function transitionLayerToNodeTransitions(transitionLayer, groupLayer) {
  return (transitionLayer ?? []).flatMap((row, y) => (row ?? []).map((entry, x) => ({
    nodeId: `${x},${y}`,
    row: y,
    col: x,
    communityId: groupLayer?.[y]?.[x] ?? 0,
    previousState: entry?.previousState,
    nextState: entry?.nextState,
    cause: entry?.cause,
    driverValue: entry?.strength,
    label: entry?.transitionLabel,
    ruleId: entry?.ruleId
  })));
}

export function incomingMessageFieldFromMessages(messages = [], width, height) {
  const field = zeroField(width, height);
  for (const message of messages) {
    const x = Math.round(Number(message?.target?.x));
    const y = Math.round(Number(message?.target?.y));
    if (x >= 0 && y >= 0 && x < width && y < height) {
      field[y][x] = Math.max(field[y][x], Number(message.strength ?? 0));
    }
  }
  return field;
}

export function processPaintNodeGrid(layers, width, height, samplingValueField = null) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => {
    const state = layers.stateLayer?.[row]?.[col] ?? 'inactive';
    const source = Number(layers.sourceField?.[row]?.[col] ?? 0);
    const groupId = Number(layers.groupLayer?.[row]?.[col] ?? 0);
    const sampleValue = Number(samplingValueField?.[row]?.[col] ?? (state === 'active' ? source : 0));
    return {
      id: `${col},${row}`,
      x: col,
      y: row,
      col,
      row,
      state,
      ruleId: normalizeProcessRuleId(layers.resolvedRuleLayer?.[row]?.[col] ?? layers.ruleLayer?.[row]?.[col] ?? 'inert'),
      ruleOverride: layers.ruleLayer?.[row]?.[col] ?? null,
      groupId,
      communityId: groupId,
      clusterId: groupId ? `group-${groupId}` : null,
      sourceValue: source,
      likelihood: source,
      cellLikelihood: source,
      clusterLikelihood: source,
      activation: sampleValue,
      sampleValue,
      cooldown: state === 'cooling' ? 1 - source : 0,
      recovery: state === 'recovering' ? source : 0,
      freshness: state === 'consumed' ? 0 : source,
      age: state === 'consumed' ? 1 : 0,
      incomingMessage: 0,
      outgoingMessage: 0,
      neighborCount: 0,
      activeNeighborCount: 0
    };
  }));
}

export function processPaintActivityDiagnostics({
  baseDiagnostics = {},
  samplingValueField,
  stats = fieldStats(samplingValueField),
  evolved = {},
  paintModel = null,
  paused = false,
  paintStartMode = 'blankCanvas'
} = {}) {
  return {
    ...(baseDiagnostics ?? {}),
    meanValue: stats.mean,
    minValue: stats.min,
    maxValue: stats.max,
    totalActivityMass: stats.totalValue,
    activeFraction: highValueFraction(samplingValueField, 0.01),
    highValueFraction: highValueFraction(samplingValueField, 0.65),
    connectedComponentCount: Object.keys(paintModel?.cells ?? {}).length ? 1 : 0,
    diagnosticWarnings: evolved.diagnostics?.warnings ?? [],
    ruleEngineDiagnostics: evolved.diagnostics,
    processPaint: {
      status: samplingProcessStatusLabel({ mode: 'processPaint', patternSource: 'custom', modified: Object.keys(paintModel?.cells ?? {}).length > 0 }),
      pausedEditingCanvas: paused,
      paintedCellCount: Object.keys(paintModel?.cells ?? {}).length,
      startMode: paintStartMode
    }
  };
}

export function sourceFieldDiagnostics(field) {
  const stats = fieldStats(field);
  return {
    min: stats.min,
    max: stats.max,
    mean: stats.mean,
    activeLikelihoodCellFraction: highValueFraction(field, 0.25),
    highLikelihoodCellFraction: highValueFraction(field, 0.7),
    nearTriggerLikelihoodCellFraction: highValueFraction(field, 0.9),
    modeCount: stats.max > 0 ? 1 : 0
  };
}

export function highValueCellsFromField(field) {
  const cells = [];
  for (let row = 0; row < (field?.length ?? 0); row += 1) {
    for (let col = 0; col < (field[row]?.length ?? 0); col += 1) {
      const value = Number(field[row][col] ?? 0);
      if (value >= 0.65) cells.push({ x: col, y: row, col, row, value });
    }
  }
  return cells;
}

export function fieldStats(field) {
  let min = Infinity;
  let max = -Infinity;
  let total = 0;
  let count = 0;
  for (const row of field ?? []) {
    for (const value of row ?? []) {
      const number = Number(value) || 0;
      min = Math.min(min, number);
      max = Math.max(max, number);
      total += number;
      count += 1;
    }
  }
  return { min: count ? min : 0, max: count ? max : 0, mean: count ? total / count : 0, totalValue: total };
}

export function countLayerValues(layer, target) {
  let count = 0;
  for (const row of layer ?? []) {
    for (const value of row ?? []) if (value === target) count += 1;
  }
  return count;
}

export function countStates(layer) {
  const counts = {};
  for (const row of layer ?? []) {
    for (const state of row ?? []) counts[state] = (counts[state] ?? 0) + 1;
  }
  return counts;
}

export function graphCommunityField(graphField) {
  const nodeGrid = graphField?.nodeGrid ?? [];
  return nodeGrid.map((row) => row.map((node) => node?.communityId ?? null));
}

export function blankProcessLayerFallback(width = 24, height = 16) {
  return {
    width,
    height,
    stateLayer: Array.from({ length: height }, () => Array.from({ length: width }, () => 'inactive')),
    ruleLayer: Array.from({ length: height }, () => Array.from({ length: width }, () => null)),
    groupLayer: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
    sourceField: zeroField(width, height),
    parameterLayer: Array.from({ length: height }, () => Array.from({ length: width }, () => ({})))
  };
}

function highValueFraction(field, threshold = 0.68) {
  const values = field?.flat?.().map(Number) ?? [];
  if (!values.length) return 0;
  return Number((values.filter((value) => value >= threshold).length / values.length).toFixed(3));
}

function zeroField(width, height) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
}
