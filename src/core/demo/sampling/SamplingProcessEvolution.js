import { createSamplingProcessPaintModel, samplingProcessLayersFromPaint } from './SamplingProcessPaintModel.js';
import {
  SAMPLING_PROCESS_RULE_CATALOG_VERSION,
  normalizeProcessRuleId,
  processRuleById
} from './SamplingProcessRules.js';

export const SAMPLING_PROCESS_MESSAGE_TYPES = ['activation', 'inhibition', 'spread', 'transport', 'cascade', 'recovery', 'alignment', 'signal', 'dominance', 'diagnostic'];
export const SAMPLING_PROCESS_FRAME_SEMANTICS = 'initial-frame-then-steps-v1';

const NO_RULE_OVERRIDE = new Set([null, undefined, '', 'inherit']);
const WRITE_PRIORITY = {
  structuredSignal: 90,
  thresholdCascade: 85,
  congestionWave: 80,
  directedTransport: 80,
  propagatingFront: 70,
  diffusiveSpread: 65,
  excitableWave: 65
};

export function mooreNeighbors(col, row, width, height, radius = 1) {
  const neighbors = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const x = col + dx;
      const y = row + dy;
      if (x >= 0 && y >= 0 && x < width && y < height) neighbors.push({ x, y, col: x, row: y });
    }
  }
  return neighbors;
}

export function vonNeumannNeighbors(col, row, width, height) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => ({ x: col + dx, y: row + dy, col: col + dx, row: row + dy }))
    .filter((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < width && cell.y < height);
}

export function countNeighborStates(stateLayer, col, row, width, height, states, neighborhood = 'moore') {
  const wanted = new Set(Array.isArray(states) ? states : [states]);
  const cells = neighborhood === 'vonNeumann'
    ? vonNeumannNeighbors(col, row, width, height)
    : mooreNeighbors(col, row, width, height);
  return cells.filter((cell) => wanted.has(stateLayer[cell.y]?.[cell.x])).length;
}

export function collectNeighborRules(ruleLayer, col, row, width, height) {
  return mooreNeighbors(col, row, width, height).map((cell) => normalizeRuleOverride(ruleLayer[cell.y]?.[cell.x]));
}

export function collectNeighborGroups(groupLayer, col, row, width, height) {
  return mooreNeighbors(col, row, width, height).map((cell) => Number(groupLayer[cell.y]?.[cell.x] ?? 0));
}

export function frameFromLayers({
  stateLayer,
  ruleLayer,
  groupLayer,
  sourceField,
  parameterLayer,
  groupDefinitions = {},
  globalRuleId = 'inert',
  width,
  height,
  time = 0,
  index = 0,
  seed = 'sampling-process',
  parameters = {}
} = {}) {
  const w = Math.max(1, Math.round(Number(width ?? stateLayer?.[0]?.length ?? 1)));
  const h = Math.max(1, Math.round(Number(height ?? stateLayer?.length ?? 1)));
  const previous = normalizeStateLayer(stateLayer, w, h);
  const rules = normalizeRuleLayer(ruleLayer, w, h);
  const groups = normalizeGroupLayer(groupLayer, w, h);
  const source = normalizeNumberLayer(sourceField, w, h);
  const cellParameters = normalizeParameterLayer(parameterLayer, w, h);
  const transitionLayer = emptyLayer(w, h, null);
  const resolvedRuleLayer = emptyLayer(w, h, 'inert');
  const inheritance = createInheritanceCounts();
  const warnings = [];

  for (let row = 0; row < h; row += 1) {
    for (let col = 0; col < w; col += 1) {
      const resolved = resolveRule({ col, row, ruleLayer: rules, groupLayer: groups, groupDefinitions, globalRuleId, warnings });
      resolvedRuleLayer[row][col] = resolved.ruleId;
      incrementInheritance(inheritance, resolved.source);
      transitionLayer[row][col] = {
        previousState: previous[row][col],
        nextState: previous[row][col],
        ruleId: resolved.ruleId,
        transitionLabel: 'initialState',
        cause: 'initial-painted-state',
        strength: 0
      };
    }
  }

  const derived = deriveValueAndRoles({
    previous,
    next: previous,
    ruleLayer: rules,
    resolvedRuleLayer,
    groupLayer: groups,
    groupDefinitions,
    sourceField: source,
    transitionLayer,
    parameterLayer: cellParameters,
    width: w,
    height: h,
    globalRuleId,
    parameters,
    warnings
  });

  return {
    index,
    timeSeconds: time,
    stateLayer: previous,
    ruleLayer: rules,
    resolvedRuleLayer,
    groupLayer: groups,
    sourceField: source,
    parameterLayer: cellParameters,
    samplingValueField: derived.samplingValueField,
    roiRoleLayer: derived.roiRoleLayer,
    transitionLayer,
    processMessages: [],
    edgeMessages: [],
    diagnostics: {
      ruleEngine: 'deterministic-ca-style-v1',
      processRuleCatalogVersion: SAMPLING_PROCESS_RULE_CATALOG_VERSION,
      frameSemantics: SAMPLING_PROCESS_FRAME_SEMANTICS,
      initialFrame: true,
      seed,
      warnings,
      ruleInheritanceCounts: inheritance,
      proposedWriteCount: 0,
      resolvedWriteCount: 0,
      conflictCount: 0,
      messageCount: 0,
      transitionCount: 0
    },
    stateCounts: countValues(previous),
    ruleCounts: countValues(resolvedRuleLayer),
    groupCounts: countValues(groups)
  };
}

export function stepSamplingProcess({
  stateLayer,
  ruleLayer,
  groupLayer,
  sourceField,
  parameterLayer,
  groupDefinitions = {},
  globalRuleId = 'inert',
  width,
  height,
  time = 0,
  dt = 1,
  seed = 'sampling-process',
  parameters = {}
} = {}) {
  const w = Math.max(1, Math.round(Number(width ?? stateLayer?.[0]?.length ?? 1)));
  const h = Math.max(1, Math.round(Number(height ?? stateLayer?.length ?? 1)));
  const previous = normalizeStateLayer(stateLayer, w, h);
  const rules = normalizeRuleLayer(ruleLayer, w, h);
  const groups = normalizeGroupLayer(groupLayer, w, h);
  const source = normalizeNumberLayer(sourceField, w, h);
  const cellParameters = normalizeParameterLayer(parameterLayer, w, h);
  const next = previous.map((row) => [...row]);
  const nextSource = source.map((row) => [...row]);
  const transitionLayer = emptyLayer(w, h, null);
  const resolvedRuleLayer = emptyLayer(w, h, 'inert');
  const processMessages = [];
  const proposedWrites = [];
  const warnings = [];
  const inheritance = createInheritanceCounts();

  for (let row = 0; row < h; row += 1) {
    for (let col = 0; col < w; col += 1) {
      const resolved = resolveRule({ col, row, ruleLayer: rules, groupLayer: groups, groupDefinitions, globalRuleId, warnings });
      incrementInheritance(inheritance, resolved.source);
      resolvedRuleLayer[row][col] = resolved.ruleId;
      const rule = processRuleById(resolved.ruleId);
      const previousState = coerceState(previous[row][col], rule);
      const context = {
        previous,
        next,
        source,
        nextSource,
        groupLayer: groups,
        parameterLayer: cellParameters,
        col,
        row,
        width: w,
        height: h,
        rule,
        ruleId: resolved.ruleId,
        groupId: groups[row][col],
        groupDefinitions,
        parameters,
        ruleParameters: ruleParameters({ rule, groupDefinitions, groupId: groups[row][col], cellParameters: cellParameters[row][col], globalParameters: parameters }),
        time,
        dt,
        seed,
        processMessages,
        proposedWrites
      };
      const result = applyRule(context, previousState);
      next[row][col] = coerceState(result.state ?? previousState, rule);
      nextSource[row][col] = clamp01(result.sourceValue ?? nextSource[row][col]);
      for (const write of result.proposedWrites ?? []) proposeWrite(context, write);
      const changed = previousState !== next[row][col];
      transitionLayer[row][col] = {
        previousState,
        nextState: next[row][col],
        ruleId: resolved.ruleId,
        transitionLabel: result.transitionLabel ?? (changed ? 'stateChanged' : 'noChange'),
        cause: result.cause ?? (changed ? 'ruleUpdate' : 'stable'),
        strength: round(clamp01(result.strength ?? (changed ? 1 : 0)))
      };
    }
  }

  const writeResolution = resolveProposedWrites({ proposedWrites, previous, next, transitionLayer, resolvedRuleLayer, width: w, height: h });
  const derived = deriveValueAndRoles({
    previous,
    next,
    ruleLayer: rules,
    resolvedRuleLayer,
    groupLayer: groups,
    groupDefinitions,
    sourceField: nextSource,
    transitionLayer,
    parameterLayer: cellParameters,
    width: w,
    height: h,
    globalRuleId,
    parameters,
    warnings
  });

  const stateCounts = countValues(next);
  const ruleCounts = countValues(resolvedRuleLayer);
  const groupCounts = countValues(groups);
  return {
    stateLayer: next,
    ruleLayer: rules,
    resolvedRuleLayer,
    groupLayer: groups,
    sourceField: nextSource,
    parameterLayer: cellParameters,
    samplingValueField: derived.samplingValueField,
    roiRoleLayer: derived.roiRoleLayer,
    transitionLayer,
    processMessages,
    edgeMessages: processMessages,
    diagnostics: {
      ruleEngine: 'deterministic-ca-style-v1',
      processRuleCatalogVersion: SAMPLING_PROCESS_RULE_CATALOG_VERSION,
      frameSemantics: SAMPLING_PROCESS_FRAME_SEMANTICS,
      warnings,
      ruleInheritanceCounts: inheritance,
      proposedWriteCount: proposedWrites.length,
      resolvedWriteCount: writeResolution.resolvedWriteCount,
      conflictCount: writeResolution.conflictCount,
      messageCount: processMessages.length,
      transitionCount: transitionLayer.flat().filter((entry) => entry?.previousState !== entry?.nextState).length
    },
    stateCounts,
    ruleCounts,
    groupCounts
  };
}

export function runSamplingProcessFrames({
  initialPaintModel,
  frameCount = 1,
  duration = 1,
  seed = 'sampling-process',
  parameters = {}
} = {}) {
  const model = createSamplingProcessPaintModel({
    width: initialPaintModel?.width ?? 24,
    height: initialPaintModel?.height ?? 16,
    assignments: initialPaintModel ?? {}
  });
  let layers = samplingProcessLayersFromPaint(model);
  const frames = [];
  const count = Math.max(1, Math.round(Number(frameCount) || 1));
  const dt = count <= 1 ? Number(duration || 0) : Number(duration || 0) / Math.max(1, count - 1);
  for (let index = 0; index < count; index += 1) {
    const time = dt * index;
    if (index === 0) {
      frames.push(frameFromLayers({ ...layers, groupDefinitions: model.groups, width: model.width, height: model.height, time, index, seed, parameters }));
      continue;
    }
    layers = stepSamplingProcess({ ...layers, groupDefinitions: model.groups, width: model.width, height: model.height, time, dt, seed, parameters });
    frames.push({ index, timeSeconds: time, ...layers });
  }
  return frames;
}

function applyRule(context, state) {
  switch (context.ruleId) {
    case 'propagatingFront': return propagatingFront(context, state);
    case 'excitableWave': return excitableWave(context, state);
    case 'localBirthDeath': return localBirthDeath(context, state);
    case 'diffusiveSpread': return diffusiveSpread(context, state);
    case 'directedTransport': return directedTransport(context, state);
    case 'freshnessRecovery': return freshnessRecovery(context, state);
    case 'cyclicDominance': return cyclicDominance(context, state);
    case 'domainFormation': return domainFormation(context, state);
    case 'thresholdCascade': return thresholdCascade(context, state);
    case 'interactingPopulation': return interactingPopulation(context, state);
    case 'morphogenesis': return morphogenesis(context, state);
    case 'congestionWave': return congestionWave(context, state);
    case 'structuredSignal': return structuredSignal(context, state);
    case 'inert':
    default: return { state, transitionLabel: 'noChange', strength: 0 };
  }
}

function propagatingFront(ctx, state) {
  const activePressure = activeNeighborPressure(ctx);
  const threshold = numericParameter(ctx, 'threshold', 0.5);
  if ((state === 'susceptible' || state === 'inactive') && activePressure + ctx.source[ctx.row][ctx.col] >= threshold) {
    emitNeighborMessages(ctx, ['active'], 'activation', 'susceptibleToActive', activePressure);
    return { state: 'active', transitionLabel: 'susceptibleToActive', cause: 'active-neighbor-front', strength: activePressure };
  }
  if (state === 'active') return { state: 'cooling', transitionLabel: 'activeToCooling', cause: 'front-burnout', strength: 0.7 };
  if (state === 'cooling') return { state: 'consumed', transitionLabel: 'coolingToConsumed', cause: 'cooldown-complete', strength: 0.4 };
  return { state, transitionLabel: 'noChange', strength: activePressure };
}

function excitableWave(ctx, state) {
  const pressure = countNeighborStates(ctx.previous, ctx.col, ctx.row, ctx.width, ctx.height, ['active'], 'moore');
  const threshold = numericParameter(ctx, 'threshold', 1);
  if ((state === 'susceptible' || state === 'resting' || state === 'inactive') && pressure >= threshold) {
    emitNeighborMessages(ctx, ['active'], 'activation', 'susceptibleToActive', pressure / 8);
    return { state: 'active', transitionLabel: 'susceptibleToActive', cause: 'wave-neighbor', strength: pressure / 8 };
  }
  if (state === 'active') return { state: 'refractory', transitionLabel: 'activeToRefractory', cause: 'wave-crest-passed', strength: 0.8 };
  if (state === 'refractory') return { state: 'recovering', transitionLabel: 'refractoryToRecovering', cause: 'refractory-decay', strength: 0.5 };
  if (state === 'recovering') return { state: 'susceptible', transitionLabel: 'recoveringToSusceptible', cause: 'recovered', strength: 0.35 };
  return { state, transitionLabel: 'noChange', strength: pressure / 8 };
}

function localBirthDeath(ctx, state) {
  const active = countNeighborStates(ctx.previous, ctx.col, ctx.row, ctx.width, ctx.height, ['active'], 'moore');
  const birthNeighbors = Math.round(numericParameter(ctx, 'birthNeighbors', 3));
  const surviveMin = Math.round(numericParameter(ctx, 'surviveMin', 2));
  const surviveMax = Math.round(numericParameter(ctx, 'surviveMax', 3));
  if (state === 'active' && active >= surviveMin && active <= surviveMax) return { state: 'active', transitionLabel: 'survival', cause: 'neighbor-count', strength: active / 8 };
  if (state !== 'active' && active === birthNeighbors) return { state: 'active', transitionLabel: 'birth', cause: 'neighbor-count', strength: 0.75 };
  if (state === 'active') return { state: 'inactive', transitionLabel: 'death', cause: 'under-over-support', strength: 0.65 };
  return { state: 'inactive', transitionLabel: 'noChange', strength: active / 8 };
}

function diffusiveSpread(ctx, state) {
  const pressure = activeNeighborPressure(ctx);
  const threshold = numericParameter(ctx, 'threshold', 0.45);
  ctx.nextSource[ctx.row][ctx.col] = clamp01(ctx.source[ctx.row][ctx.col] + pressure * 0.2);
  if ((state === 'susceptible' || state === 'inactive') && ctx.nextSource[ctx.row][ctx.col] >= threshold) {
    emitNeighborMessages(ctx, ['active'], 'spread', 'susceptibleToActive', pressure);
    return { state: 'active', transitionLabel: 'susceptibleToActive', cause: 'diffusive-pressure', strength: pressure };
  }
  if (state === 'active') return { state: 'recovering', transitionLabel: 'activeToRecovering', cause: 'activity-decay', strength: 0.45 };
  if (state === 'recovering') return { state: 'susceptible', transitionLabel: 'recoveringToSusceptible', cause: 'recovered', strength: 0.3 };
  return { state, transitionLabel: 'noChange', strength: pressure };
}

function directedTransport(ctx, state) {
  if (state === 'active') {
    const target = directedTarget(ctx);
    if (target && ctx.previous[target.y][target.x] !== 'active') {
      proposeWrite(ctx, { source: { x: ctx.col, y: ctx.row }, target, nextState: 'active', messageType: 'transport', cause: 'directedTransport', strength: 1 });
      pushMessage(ctx, { source: { x: ctx.col, y: ctx.row }, target, messageType: 'transport', cause: 'directedTransport', strength: 1 });
      return { state: 'trailing', transitionLabel: 'activeToTrailing', cause: 'transported', strength: 0.9 };
    }
  }
  if (state === 'trailing') return { state: 'inactive', transitionLabel: 'trailingToInactive', cause: 'trail-decay', strength: 0.3 };
  return { state, transitionLabel: 'noChange', strength: 0 };
}

function freshnessRecovery(ctx, state) {
  const recoverySteps = Math.max(1, Math.round(numericParameter(ctx, 'recoverySteps', 2)));
  if (state === 'sampled') return { state: 'cooling', transitionLabel: 'sampledToCooling', cause: 'post-sample-depletion', strength: 0.8 };
  if (state === 'cooling') return { state: recoverySteps <= 1 ? 'stale' : 'recovering', transitionLabel: 'coolingToRecovering', cause: 'ageing', strength: 0.5 };
  if (state === 'recovering') return { state: 'stale', transitionLabel: 'recoveringToStale', cause: 'freshness-returned', strength: 0.6 };
  return { state, transitionLabel: 'noChange', strength: state === 'stale' ? 1 : 0 };
}

function cyclicDominance(ctx, state) {
  const predator = { phaseA: 'phaseB', phaseB: 'phaseC', phaseC: 'phaseA' }[state];
  const threshold = Math.max(1, Math.round(numericParameter(ctx, 'threshold', 1)));
  if (predator && countNeighborStates(ctx.previous, ctx.col, ctx.row, ctx.width, ctx.height, predator, 'moore') >= threshold) {
    emitNeighborMessages(ctx, [predator], 'dominance', `${state}Overtaken`, 0.8);
    return { state: predator, transitionLabel: `${state}Overtaken`, cause: 'cyclic-dominance', strength: 0.8 };
  }
  if (state === 'inactive' && ctx.source[ctx.row][ctx.col] > 0.7) return { state: 'phaseA', transitionLabel: 'sourceToPhaseA', cause: 'source-support', strength: 0.5 };
  return { state, transitionLabel: 'noChange', strength: 0 };
}

function domainFormation(ctx, state) {
  const counts = neighborStateCounts(ctx, ['domainA', 'domainB', 'domainC']);
  const [domain, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [state, 0];
  const threshold = Math.max(1, Math.round(numericParameter(ctx, 'threshold', 2)));
  if (state !== 'inactive' && count >= threshold && domain !== state) {
    pushMessage(ctx, { messageType: 'alignment', cause: 'domain-majority', strength: count / 8 });
    return { state: domain, transitionLabel: 'domainAligned', cause: 'local-majority', strength: count / 8 };
  }
  return { state, transitionLabel: 'domainStable', strength: count / 8 };
}

function thresholdCascade(ctx, state) {
  const pressure = activeNeighborPressure(ctx) + ctx.source[ctx.row][ctx.col] * 0.5;
  const threshold = numericParameter(ctx, 'threshold', 0.6);
  if ((state === 'loaded' || state === 'inactive') && pressure >= threshold) {
    emitNeighborMessages(ctx, ['active'], 'cascade', 'loadedToActive', pressure);
    return { state: 'active', transitionLabel: 'loadedToActive', cause: 'threshold-crossed', strength: pressure };
  }
  if (state === 'active') return { state: 'spent', transitionLabel: 'activeToSpent', cause: 'cascade-discharge', strength: 0.8 };
  if (state === 'spent') return { state: 'recovering', transitionLabel: 'spentToRecovering', cause: 'spent-decay', strength: 0.4 };
  if (state === 'recovering') return { state: 'loaded', transitionLabel: 'recoveringToLoaded', cause: 'reload', strength: 0.3 };
  return { state, transitionLabel: 'noChange', strength: pressure };
}

function interactingPopulation(ctx, state) {
  const prey = countNeighborStates(ctx.previous, ctx.col, ctx.row, ctx.width, ctx.height, 'prey');
  const predator = countNeighborStates(ctx.previous, ctx.col, ctx.row, ctx.width, ctx.height, 'predator');
  if (state === 'empty' && prey > 0) return { state: 'prey', transitionLabel: 'preySpread', cause: 'prey-neighbor', strength: prey / 8 };
  if (state === 'prey' && predator > 0) return { state: 'predator', transitionLabel: 'predatorPursuit', cause: 'predator-neighbor', strength: predator / 8 };
  if (state === 'predator' && prey === 0) return { state: 'recovering', transitionLabel: 'predatorDecay', cause: 'no-prey', strength: 0.5 };
  if (state === 'recovering') return { state: 'empty', transitionLabel: 'recoveringToEmpty', cause: 'population-reset', strength: 0.25 };
  return { state, transitionLabel: 'noChange', strength: Math.max(prey, predator) / 8 };
}

function morphogenesis(ctx, state) {
  const active = countNeighborStates(ctx.previous, ctx.col, ctx.row, ctx.width, ctx.height, ['active', 'patternA', 'patternB']);
  const threshold = Math.round(numericParameter(ctx, 'threshold', 2));
  if (state === 'inactive' && (active >= threshold || ctx.source[ctx.row][ctx.col] > 0.7)) return { state: 'active', transitionLabel: 'patternActivated', cause: 'local-support', strength: Math.max(active / 8, ctx.source[ctx.row][ctx.col]) };
  if (state === 'active') return { state: active % 2 === 0 ? 'patternA' : 'patternB', transitionLabel: 'patternMorph', cause: 'seeded-local-pattern', strength: 0.7 };
  if ((state === 'patternA' || state === 'patternB') && active <= 1) return { state: 'recovering', transitionLabel: 'patternRecover', cause: 'weak-support', strength: 0.4 };
  if (state === 'recovering') return { state: 'inactive', transitionLabel: 'recoveredToInactive', cause: 'recovery-complete', strength: 0.2 };
  return { state, transitionLabel: 'noChange', strength: active / 8 };
}

function congestionWave(ctx, state) {
  if (state === 'moving') {
    const target = directedTarget(ctx);
    if (target && ctx.previous[target.y][target.x] === 'empty') {
      proposeWrite(ctx, { source: { x: ctx.col, y: ctx.row }, target, nextState: 'moving', messageType: 'transport', cause: 'moved', strength: 0.8 });
      pushMessage(ctx, { source: { x: ctx.col, y: ctx.row }, target, messageType: 'transport', cause: 'moved', strength: 0.8 });
      return { state: 'empty', transitionLabel: 'moved', cause: 'downstream-open', strength: 0.8 };
    }
    return { state: 'congested', transitionLabel: 'blockedToCongested', cause: 'downstream-blocked', strength: 0.85 };
  }
  if (state === 'congested') return { state: 'released', transitionLabel: 'congestedToReleased', cause: 'release-wave', strength: 0.55 };
  if (state === 'released') return { state: 'empty', transitionLabel: 'releasedToEmpty', cause: 'release-complete', strength: 0.25 };
  return { state, transitionLabel: 'noChange', strength: 0 };
}

function structuredSignal(ctx, state) {
  const signal = countNeighborStates(ctx.previous, ctx.col, ctx.row, ctx.width, ctx.height, 'signal', 'vonNeumann');
  const threshold = Math.max(1, Math.round(numericParameter(ctx, 'threshold', 1)));
  if (state === 'conductor' && signal >= threshold) {
    emitNeighborMessages(ctx, ['signal'], 'signal', 'conductorToSignal', signal / 4);
    return { state: 'signal', transitionLabel: 'conductorToSignal', cause: 'signal-neighbor', strength: signal / 4 };
  }
  if (state === 'signal') return { state: 'refractory', transitionLabel: 'signalToRefractory', cause: 'signal-passed', strength: 0.8 };
  if (state === 'refractory') return { state: 'conductor', transitionLabel: 'refractoryToConductor', cause: 'recovered-conductor', strength: 0.4 };
  return { state, transitionLabel: 'noChange', strength: signal / 4 };
}

function deriveValueAndRoles({ previous, next, resolvedRuleLayer, sourceField, transitionLayer, width, height }) {
  const samplingValueField = emptyLayer(width, height, 0);
  const roiRoleLayer = emptyLayer(width, height, 'background');
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const rule = processRuleById(resolvedRuleLayer[row][col]);
      const transition = transitionLayer[row][col];
      const value = samplingValueForRule({
        state: next[row][col],
        rule,
        sourceValue: sourceField[row][col],
        previous,
        next,
        transition,
        col,
        row,
        width,
        height
      });
      samplingValueField[row][col] = value;
      roiRoleLayer[row][col] = roiRoleForRule({
        state: next[row][col],
        rule,
        value,
        previous,
        next,
        transition,
        col,
        row,
        width,
        height
      });
    }
  }
  return { samplingValueField, roiRoleLayer };
}

function samplingValueForRule({ state, rule, sourceValue, previous, next, transition, col, row, width, height }) {
  const base = clamp01(sourceValue);
  const activeNear = countNeighborStates(previous, col, row, width, height, ['active', 'signal', 'moving', 'predator', 'prey'], 'moore') > 0;
  const nearFuture = activeNear ? 0.35 : 0;
  const changed = transition?.previousState !== transition?.nextState;
  const mapped = Number(rule.valueMapping?.[state] ?? 0);
  const values = {
    propagatingFront: frontValue(state, base, activeNear),
    excitableWave: ['active'].includes(state) ? 0.95 : ['susceptible', 'resting'].includes(state) && activeNear ? 0.45 : ['refractory', 'recovering'].includes(state) ? 0.2 : mapped,
    localBirthDeath: state === 'active' ? 0.9 : changed ? 0.45 : 0.05,
    diffusiveSpread: state === 'active' ? 0.9 : activeNear ? Math.max(0.45, base) : ['recovering'].includes(state) ? 0.2 : mapped,
    directedTransport: state === 'active' ? 0.95 : state === 'trailing' ? 0.12 : directedNeighborHas(next, col, row, width, height) ? 0.35 : mapped,
    thresholdCascade: state === 'active' ? 0.95 : state === 'loaded' && (activeNear || base >= 0.5) ? 0.5 : state === 'spent' ? 0.1 : mapped,
    freshnessRecovery: state === 'stale' ? 0.95 : state === 'recovering' ? 0.45 : ['sampled', 'cooling'].includes(state) ? 0.1 : mapped,
    structuredSignal: state === 'signal' ? 0.95 : state === 'conductor' && countNeighborStates(previous, col, row, width, height, 'signal', 'vonNeumann') > 0 ? 0.45 : state === 'refractory' ? 0.1 : mapped
  };
  return round(clamp01(Math.max(values[rule.id] ?? mapped, nearFuture, base * 0.55)));
}

function roiRoleForRule({ state, rule, value, previous, next, transition, col, row, width, height }) {
  const changed = transition?.previousState !== transition?.nextState;
  const activeNear = countNeighborStates(previous, col, row, width, height, ['active', 'signal', 'moving', 'predator', 'prey'], 'moore') > 0;
  const signalNear = countNeighborStates(previous, col, row, width, height, 'signal', 'vonNeumann') > 0;
  if (rule.id === 'propagatingFront') {
    if (state === 'active') return 'currentROI';
    if (['cooling', 'consumed'].includes(state)) return 'depleted';
    if (state === 'susceptible' && activeNear) return 'nearFutureROI';
  }
  if (rule.id === 'excitableWave') {
    if (state === 'active') return 'currentROI';
    if (['refractory', 'recovering'].includes(state)) return 'recovery';
    if (['susceptible', 'resting'].includes(state) && activeNear) return 'nearFutureROI';
  }
  if (rule.id === 'localBirthDeath') {
    if (state === 'active') return 'currentROI';
    if (changed) return 'nearFutureROI';
  }
  if (rule.id === 'diffusiveSpread') {
    if (state === 'active') return 'currentROI';
    if (state === 'recovering') return 'recovery';
    if (activeNear || value >= 0.35) return 'nearFutureROI';
  }
  if (rule.id === 'directedTransport') {
    if (state === 'active') return 'currentROI';
    if (state === 'trailing') return 'depleted';
    if (directedNeighborHas(next, col, row, width, height)) return 'nearFutureROI';
  }
  if (rule.id === 'thresholdCascade') {
    if (state === 'active') return 'currentROI';
    if (state === 'spent') return 'depleted';
    if (state === 'loaded' && (activeNear || value >= 0.35)) return 'nearFutureROI';
  }
  if (rule.id === 'freshnessRecovery') {
    if (state === 'stale') return 'currentROI';
    if (state === 'recovering') return 'nearFutureROI';
    if (['sampled', 'cooling'].includes(state)) return 'depleted';
  }
  if (rule.id === 'structuredSignal') {
    if (state === 'signal') return 'currentROI';
    if (state === 'refractory') return 'depleted';
    if (state === 'conductor' && signalNear) return 'nearFutureROI';
  }
  if (['consumed', 'spent', 'cooling', 'refractory', 'sampled', 'trailing'].includes(state)) return 'depleted';
  if (value >= 0.65) return 'currentROI';
  if (changed || value >= 0.35) return 'nearFutureROI';
  return 'background';
}

function frontValue(state, sourceValue, activeNear) {
  if (state === 'active') return 0.95;
  if (state === 'susceptible' && activeNear) return 0.45;
  if (['cooling', 'consumed'].includes(state)) return 0.1;
  return sourceValue * 0.35;
}

function directedNeighborHas(layer, col, row, width, height) {
  return mooreNeighbors(col, row, width, height).some((cell) => ['active', 'moving'].includes(layer[cell.y]?.[cell.x]));
}

function activeNeighborPressure(ctx) {
  return countNeighborStates(ctx.previous, ctx.col, ctx.row, ctx.width, ctx.height, ['active', 'signal', 'moving'], 'moore') / 8;
}

function emitNeighborMessages(ctx, sourceStates, messageType, cause, strength) {
  for (const cell of mooreNeighbors(ctx.col, ctx.row, ctx.width, ctx.height)) {
    if (sourceStates.includes(ctx.previous[cell.y]?.[cell.x])) {
      pushMessage(ctx, { source: { x: cell.x, y: cell.y }, target: { x: ctx.col, y: ctx.row }, messageType, cause, strength });
    }
  }
}

function proposeWrite(ctx, write) {
  const source = write.source ?? { x: ctx.col, y: ctx.row };
  const target = write.target;
  if (!target || target.x < 0 || target.y < 0 || target.x >= ctx.width || target.y >= ctx.height) return;
  ctx.proposedWrites.push({
    source,
    target,
    nextState: write.nextState,
    ruleId: write.ruleId ?? ctx.ruleId,
    priority: write.priority ?? WRITE_PRIORITY[ctx.ruleId] ?? 50,
    cause: write.cause ?? 'proposed-write',
    strength: clamp01(write.strength ?? 0),
    messageType: write.messageType ?? 'diagnostic'
  });
}

function resolveProposedWrites({ proposedWrites, previous, next, transitionLayer, resolvedRuleLayer, width, height }) {
  const byTarget = new Map();
  for (const write of proposedWrites) {
    const key = `${write.target.x},${write.target.y}`;
    if (!byTarget.has(key)) byTarget.set(key, []);
    byTarget.get(key).push(write);
  }
  let resolvedWriteCount = 0;
  let conflictCount = 0;
  for (const writes of byTarget.values()) {
    writes.sort(compareProposedWrites);
    const winner = writes[0];
    conflictCount += Math.max(0, writes.length - 1);
    const x = winner.target.x;
    const y = winner.target.y;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    next[y][x] = winner.nextState;
    transitionLayer[y][x] = {
      previousState: previous[y][x],
      nextState: winner.nextState,
      ruleId: winner.ruleId,
      transitionLabel: winner.cause,
      cause: winner.cause,
      strength: round(winner.strength)
    };
    resolvedRuleLayer[y][x] = winner.ruleId;
    resolvedWriteCount += 1;
  }
  return { resolvedWriteCount, conflictCount };
}

function compareProposedWrites(a, b) {
  if (b.priority !== a.priority) return b.priority - a.priority;
  const sourceRow = (a.source.y ?? 0) - (b.source.y ?? 0);
  if (sourceRow !== 0) return sourceRow;
  const sourceCol = (a.source.x ?? 0) - (b.source.x ?? 0);
  if (sourceCol !== 0) return sourceCol;
  return String(a.ruleId).localeCompare(String(b.ruleId));
}

function pushMessage(ctx, message) {
  if (ctx.processMessages.length > ctx.width * ctx.height * 8) return;
  const source = message.source ?? { x: ctx.col, y: ctx.row };
  const target = message.target ?? { x: ctx.col, y: ctx.row };
  const sameGroup = Number(ctx.groupLayer?.[source.y]?.[source.x] ?? ctx.groupId) === Number(ctx.groupId);
  ctx.processMessages.push({
    source,
    target,
    ruleId: ctx.ruleId,
    messageType: SAMPLING_PROCESS_MESSAGE_TYPES.includes(message.messageType) ? message.messageType : 'diagnostic',
    strength: round(clamp01(message.strength ?? 0)),
    cause: message.cause ?? 'rule-message',
    sameGroup,
    groupId: ctx.groupId
  });
}

function directedTarget(ctx) {
  const direction = ctx.ruleParameters?.direction ?? 'east';
  const vector = {
    east: [1, 0],
    west: [-1, 0],
    north: [0, -1],
    south: [0, 1]
  }[direction] ?? [1, 0];
  const x = ctx.col + vector[0];
  const y = ctx.row + vector[1];
  return x >= 0 && y >= 0 && x < ctx.width && y < ctx.height ? { x, y, col: x, row: y } : null;
}

function resolveRule({ col, row, ruleLayer, groupLayer, groupDefinitions, globalRuleId, warnings }) {
  const cellRule = ruleLayer?.[row]?.[col];
  if (!NO_RULE_OVERRIDE.has(cellRule)) {
    const normalized = normalizeProcessRuleId(cellRule);
    warnUnknownRule(cellRule, normalized, col, row, warnings);
    return { ruleId: normalized, source: normalized === 'inert' ? 'explicitInert' : 'explicitCellRule' };
  }
  const groupId = String(groupLayer?.[row]?.[col] ?? 0);
  const groupRule = groupDefinitions?.[groupId]?.ruleId;
  if (!NO_RULE_OVERRIDE.has(groupRule)) {
    const normalized = normalizeProcessRuleId(groupRule);
    warnUnknownRule(groupRule, normalized, col, row, warnings);
    return { ruleId: normalized, source: normalized === 'inert' ? 'explicitInert' : 'inheritedGroupRule' };
  }
  if (!NO_RULE_OVERRIDE.has(globalRuleId)) {
    const normalized = normalizeProcessRuleId(globalRuleId);
    warnUnknownRule(globalRuleId, normalized, col, row, warnings);
    return { ruleId: normalized, source: normalized === 'inert' ? 'explicitInert' : 'inheritedGlobalRule' };
  }
  return { ruleId: 'inert', source: 'explicitInert' };
}

function warnUnknownRule(raw, normalized, col, row, warnings) {
  if (raw && normalized === 'inert' && !['inert', 'none', 'noRule'].includes(raw)) warnings?.push?.(`Unknown rule ${raw} at ${col},${row}; using inert.`);
}

function ruleParameters({ rule, groupDefinitions, groupId, cellParameters, globalParameters }) {
  return {
    ...(rule.defaultParameters ?? {}),
    ...(groupDefinitions?.[String(groupId)]?.parameters ?? {}),
    ...(cellParameters ?? {}),
    ...(globalParameters ?? {})
  };
}

function numericParameter(ctx, key, fallback) {
  const number = Number(ctx.ruleParameters?.[key]);
  return Number.isFinite(number) ? number : fallback;
}

function coerceState(state, rule) {
  if (rule.allowedStates.includes(state)) return state;
  if (state === 'active' && rule.allowedStates.includes('signal')) return 'signal';
  if (state === 'inactive' && rule.allowedStates.includes('empty')) return 'empty';
  return rule.defaultInitialState ?? rule.allowedStates[0] ?? 'inactive';
}

function neighborStateCounts(ctx, states) {
  return Object.fromEntries(states.map((state) => [state, countNeighborStates(ctx.previous, ctx.col, ctx.row, ctx.width, ctx.height, state)]));
}

function normalizeStateLayer(layer, width, height) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => layer?.[row]?.[col] ?? 'inactive'));
}

function normalizeRuleLayer(layer, width, height) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => normalizeRuleOverride(layer?.[row]?.[col])));
}

function normalizeRuleOverride(value) {
  if (NO_RULE_OVERRIDE.has(value)) return null;
  const normalized = normalizeProcessRuleId(value);
  if (normalized === 'inert' && !['inert', 'none', 'noRule'].includes(value)) return String(value);
  return normalized;
}

function normalizeGroupLayer(layer, width, height) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => Math.max(0, Math.round(Number(layer?.[row]?.[col] ?? 0)))));
}

function normalizeNumberLayer(layer, width, height) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => clamp01(layer?.[row]?.[col] ?? 0)));
}

function normalizeParameterLayer(layer, width, height) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => ({ ...(layer?.[row]?.[col] ?? {}) })));
}

function emptyLayer(width, height, value) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => value));
}

function countValues(layer) {
  const counts = {};
  for (const value of layer.flat()) counts[String(value)] = (counts[String(value)] ?? 0) + 1;
  return counts;
}

function createInheritanceCounts() {
  return {
    explicitCellRule: 0,
    inheritedGroupRule: 0,
    inheritedGlobalRule: 0,
    explicitInert: 0
  };
}

function incrementInheritance(counts, source) {
  counts[source] = (counts[source] ?? 0) + 1;
}

function clamp01(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function round(value) {
  return Math.round(Number(value ?? 0) * 10000) / 10000;
}
