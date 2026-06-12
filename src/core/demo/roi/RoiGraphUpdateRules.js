import { processClassForUpdateRule } from './RoiProcessContracts.js';

export function selectRoiGraphUpdateRule({
  behaviorPresetId = null,
  referenceSignatureId = null,
  updateRuleHint = null,
  spatialEvolution = 'stationary',
  stateModel = 'timeIndexed',
  depletionMode = 'none',
  temporalPattern = 'static'
} = {}) {
  if (updateRuleHint) return updateRuleHint;
  if (referenceSignatureId === 'birthDeathEmergence') return 'lifeLikeLocalRules';
  if (referenceSignatureId === 'frontPropagation') return 'frontPropagation';
  if (referenceSignatureId === 'waveExcitableMedia') return 'rippleWave';
  if (referenceSignatureId === 'freshnessRecovery') return 'freshnessRecovery';
  if (referenceSignatureId === 'diffusionSpread' || referenceSignatureId === 'avalancheBurstCascades') return 'neighborSpread';
  if (referenceSignatureId === 'driftTransport' || referenceSignatureId === 'predatorPreyMigration') return 'directedDrift';
  if (behaviorPresetId === 'recurringHotspots') return 'clusterCooldownRecovery';
  if (behaviorPresetId === 'forestFireFrontInspired' || behaviorPresetId === 'expandingFront') return 'frontPropagation';
  if (behaviorPresetId === 'rippleActivation') return 'rippleWave';
  if (behaviorPresetId === 'lifeLikeCellularEmergenceInspired') return 'lifeLikeLocalRules';
  if (behaviorPresetId === 'freshnessRevisitValue' || depletionMode === 'freshnessAge' || depletionMode === 'revisitRecovery' || stateModel === 'historyAware') return 'freshnessRecovery';
  if (behaviorPresetId === 'neighborSpread' || spatialEvolution === 'neighborPropagation') return temporalPattern === 'wavyMultiFrequency' ? 'rippleWave' : 'neighborSpread';
  if (behaviorPresetId === 'patchyRainfall' || behaviorPresetId === 'driftingStormCells' || spatialEvolution === 'continuousDrift' || spatialEvolution === 'randomWalk') return 'directedDrift';
  return 'memoryless';
}

export function applyRoiGraphUpdateRule({
  graph,
  baseSampleField,
  likelihoodField,
  sourceNodes = [],
  clusters = [],
  updateRule = 'memoryless',
  seed = 'anchor-roi-graph',
  time = 0,
  temporalPattern = 'static',
  dynamicComplexity = 'medium',
  samplingEffect = 'none'
} = {}) {
  const width = graph?.width ?? baseSampleField?.[0]?.length ?? 1;
  const height = graph?.height ?? baseSampleField?.length ?? 1;
  const baseSample = cloneField(baseSampleField, width, height);
  const baseLikelihood = cloneField(likelihoodField, width, height);
  const complexity = complexityValue(dynamicComplexity, 0.75, 1, 1.3);
  const envelope = temporalEnvelope(temporalPattern, time, seed);
  const rule = updateRule ?? 'memoryless';
  if (rule === 'memoryless') {
    return materializeGraphResult({ graph, baseSample, likelihood: baseLikelihood, sample: baseSample, sourceNodes, clusters, updateRule: rule, seed, time });
  }
  if (rule === 'cooldownRecovery' || rule === 'clusterCooldownRecovery') {
    return cooldownRecovery({ graph, baseSample, baseLikelihood, sourceNodes, clusters, seed, time, envelope, complexity, updateRule: rule });
  }
  if (rule === 'frontPropagation') {
    return frontPropagation({ graph, baseSample, baseLikelihood, clusters, seed, time, envelope, complexity, updateRule: rule });
  }
  if (rule === 'rippleWave') {
    return rippleWave({ graph, baseSample, baseLikelihood, sourceNodes, clusters, seed, time, envelope, complexity, updateRule: rule });
  }
  if (rule === 'directedDrift') {
    return directedDrift({ graph, baseSample, baseLikelihood, clusters, seed, time, envelope, complexity, updateRule: rule });
  }
  if (rule === 'lifeLikeLocalRules') {
    return lifeLikeLocalRules({ graph, baseSample, baseLikelihood, clusters, seed, time, envelope, complexity, updateRule: rule });
  }
  if (rule === 'freshnessRecovery') {
    return freshnessRecovery({ graph, baseSample, baseLikelihood, clusters, seed, time, envelope, complexity, samplingEffect, updateRule: rule });
  }
  return neighborSpread({ graph, baseSample, baseLikelihood, clusters, seed, time, envelope, complexity, updateRule: rule });
}

function neighborSpread({ graph, baseSample, baseLikelihood, clusters, seed, time, envelope, complexity, updateRule }) {
  const width = graph.width;
  const height = graph.height;
  let likelihood = baseLikelihood;
  let sample = baseSample;
  const steps = Math.max(1, Math.min(16, Math.floor(time / 3) + 1));
  for (let step = 0; step < steps; step += 1) {
    const nextLikelihood = blankField(width, height);
    const nextSample = blankField(width, height);
    for (const node of graph.nodes) {
      const incomingL = incomingWeighted(graph, likelihood, node.id);
      const incomingS = incomingWeighted(graph, sample, node.id);
      const pulse = seededUnit(`${seed}:spread:${node.x}:${node.y}:${Math.floor((time + step) / 5)}`) > 0.86 ? 0.08 : 0;
      nextLikelihood[node.y][node.x] = clamp01(baseLikelihood[node.y][node.x] * 0.38 + likelihood[node.y][node.x] * 0.48 + incomingL * 0.18 * complexity + pulse);
      nextSample[node.y][node.x] = clamp01(baseSample[node.y][node.x] * 0.42 + sample[node.y][node.x] * 0.42 + incomingS * 0.24 * complexity + nextLikelihood[node.y][node.x] * 0.08 * envelope);
    }
    likelihood = roundField(nextLikelihood);
    sample = roundField(nextSample);
  }
  return materializeGraphResult({ graph, baseSample, likelihood, sample, sourceNodes: [], clusters, updateRule, seed, time });
}

function cooldownRecovery({ graph, baseSample, baseLikelihood, sourceNodes, clusters, seed, time, envelope, complexity, updateRule }) {
  const width = graph.width;
  const height = graph.height;
  const likelihood = blankField(width, height);
  const sample = blankField(width, height);
  for (const node of graph.nodes) {
    const nx = width > 1 ? node.x / (width - 1) : 0;
    const ny = height > 1 ? node.y / (height - 1) : 0;
    const nearest = nearestSource(clusters?.length ? clusters : sourceNodes, nx, ny);
    const phase = nearest?.phase ?? seededUnit(`${seed}:cooldown-phase:${node.id}`) * Math.PI * 2;
    const cycle = 22 + seededUnit(`${seed}:cooldown-cycle:${nearest?.id ?? node.id}`) * 12;
    const activity = 0.5 + 0.5 * Math.sin(time / cycle * Math.PI * 2 + phase);
    const recovery = clamp01(1 - activity);
    const basinBoost = nearest ? Math.exp(-(nearest.distance ** 2) / (2 * Math.max(0.035, nearest.radius || 0.14) ** 2)) : baseLikelihood[node.y][node.x];
    const localL = clamp01(baseLikelihood[node.y][node.x] * 0.46 + basinBoost * (0.28 + activity * 0.42) * complexity);
    likelihood[node.y][node.x] = localL;
    sample[node.y][node.x] = clamp01(baseSample[node.y][node.x] * (0.42 + activity * 0.58) + localL * activity * 0.34 * envelope);
    node.graphState = {
      state: activity >= 0.68 ? 'active' : recovery >= 0.66 ? 'cooling' : 'recovering',
      activation: activity >= 0.68 ? activity : 0,
      clusterId: nearest?.node?.id ?? null,
      clusterLikelihood: nearest?.node?.likelihood ?? nearest?.node?.probability ?? localL,
      cooldown: recovery,
      recovery,
      phase,
      threshold: 0.52,
      sourceStrength: nearest?.node?.probability ?? localL
    };
  }
  return materializeGraphResult({ graph, baseSample, likelihood: roundField(likelihood), sample: roundField(sample), sourceNodes, clusters, updateRule, seed, time });
}

function frontPropagation({ graph, baseSample, baseLikelihood, clusters, seed, time, envelope, complexity, updateRule }) {
  const width = graph.width;
  const height = graph.height;
  const angle = seededUnit(`${seed}:front-angle`) * Math.PI * 2;
  const speed = 0.012 * complexity;
  const offset = -0.45 + time * speed;
  const likelihood = blankField(width, height);
  const sample = blankField(width, height);
  for (const node of graph.nodes) {
    const nx = width > 1 ? node.x / (width - 1) : 0;
    const ny = height > 1 ? node.y / (height - 1) : 0;
    const projected = (nx - 0.5) * Math.cos(angle) + (ny - 0.5) * Math.sin(angle);
    const distanceToFront = Math.abs(projected - offset);
    const active = Math.exp(-(distanceToFront ** 2) / (2 * 0.055 ** 2));
    const consumed = projected < offset - 0.06;
    const state = active > 0.48 ? 'active' : consumed ? 'consumed' : 'susceptible';
    const localL = clamp01(baseLikelihood[node.y][node.x] * (state === 'consumed' ? 0.24 : 0.52) + active * 0.76);
    likelihood[node.y][node.x] = localL;
    sample[node.y][node.x] = clamp01(baseSample[node.y][node.x] * (state === 'consumed' ? 0.22 : 0.42) + active * 0.72 * envelope);
    node.graphState = {
      state,
      threshold: 0.48,
      susceptibility: clamp01(baseLikelihood[node.y][node.x] * 0.6 + 0.3),
      cooldown: consumed ? 1 : 0,
      recovery: consumed ? 0.12 : 1,
      death: consumed,
      birth: state === 'active'
    };
  }
  return materializeGraphResult({ graph, baseSample, likelihood: roundField(likelihood), sample: roundField(sample), sourceNodes: [], clusters, updateRule, seed, time });
}

function rippleWave({ graph, baseSample, baseLikelihood, sourceNodes, clusters, seed, time, envelope, complexity, updateRule }) {
  const width = graph.width;
  const height = graph.height;
  const sources = clusters?.length ? clusters : sourceNodes.length ? sourceNodes : [{ id: 'center', x: 0.5, y: 0.5, radius: 0.18, phase: 0, probability: 1 }];
  const likelihood = blankField(width, height);
  const sample = blankField(width, height);
  for (const node of graph.nodes) {
    const nx = width > 1 ? node.x / (width - 1) : 0;
    const ny = height > 1 ? node.y / (height - 1) : 0;
    let crest = 0;
    let nearest = null;
    for (const source of sources) {
      const distance = Math.hypot(nx - source.x, ny - source.y);
      const wave = 0.5 + 0.5 * Math.sin(distance * 32 - time * 0.34 * complexity + (source.phase ?? 0));
      const decay = Math.exp(-distance * 2.6);
      const value = wave * decay * (source.probability ?? 1);
      if (value > crest) {
        crest = value;
        nearest = source;
      }
    }
    const localL = clamp01(baseLikelihood[node.y][node.x] * 0.42 + crest * 0.82);
    likelihood[node.y][node.x] = localL;
    sample[node.y][node.x] = clamp01(baseSample[node.y][node.x] * 0.48 + localL * (0.34 + crest * 0.34) * envelope);
    node.graphState = {
      state: crest >= 0.62 ? 'crest' : crest >= 0.36 ? 'recovering' : 'inactive',
      phase: nearest?.phase ?? 0,
      threshold: 0.62,
      sourceStrength: nearest?.probability ?? 0,
      recovery: clamp01(1 - crest)
    };
  }
  return materializeGraphResult({ graph, baseSample, likelihood: roundField(likelihood), sample: roundField(sample), sourceNodes, clusters: sources, updateRule, seed, time });
}

function directedDrift({ graph, baseSample, baseLikelihood, clusters, seed, time, envelope, complexity, updateRule }) {
  const width = graph.width;
  const height = graph.height;
  const angle = seededUnit(`${seed}:graph-drift-angle`) * Math.PI * 2;
  const dx = Math.cos(angle) * time * 0.018 * complexity;
  const dy = Math.sin(angle) * time * 0.014 * complexity;
  const likelihood = sampleShift(baseLikelihood, dx, dy);
  const sample = roundField(baseSample.map((row, y) => row.map((value, x) => {
    const incoming = incomingWeighted(graph, likelihood, y * width + x);
    return clamp01(sampleAt(baseSample, x - dx * width, y - dy * height) * 0.68 + incoming * 0.24 + value * 0.16 * envelope);
  })));
  return materializeGraphResult({ graph, baseSample, likelihood, sample, sourceNodes: [], clusters, updateRule, seed, time });
}

function lifeLikeLocalRules({ graph, baseSample, baseLikelihood, clusters, seed, time, envelope, complexity, updateRule }) {
  const width = graph.width;
  const height = graph.height;
  let alive = baseLikelihood.map((row, y) => row.map((value, x) => (value + seededUnit(`${seed}:life:${x}:${y}`) * 0.35) > 0.55 ? 1 : 0));
  const steps = Math.max(1, Math.min(18, Math.floor(time / 2) + 1));
  for (let step = 0; step < steps; step += 1) {
    alive = alive.map((row, y) => row.map((value, x) => {
      const neighbors = graph.incoming[y * width + x].filter((edge) => alive[Math.floor(edge.source / width)]?.[edge.source % width]).length;
      if (value) return neighbors === 2 || neighbors === 3 ? 1 : 0;
      const birthJitter = seededUnit(`${seed}:life-birth:${x}:${y}:${step}`) > 0.92 ? 1 : 0;
      return neighbors === 3 || (birthJitter && neighbors === 2) ? 1 : 0;
    }));
  }
  const likelihood = roundField(alive.map((row, y) => row.map((value, x) => clamp01(baseLikelihood[y][x] * 0.32 + value * 0.68))));
  const sample = roundField(alive.map((row, y) => row.map((value, x) => clamp01(baseSample[y][x] * 0.44 + value * 0.56 * envelope))));
  for (const node of graph.nodes) {
    const isAlive = alive[node.y][node.x] > 0;
    node.graphState = {
      state: isAlive ? 'alive' : 'inactive',
      threshold: 3,
      susceptibility: clamp01(baseLikelihood[node.y][node.x] * complexity),
      recovery: isAlive ? 1 : 0.35
    };
  }
  return materializeGraphResult({ graph, baseSample, likelihood, sample, sourceNodes: [], clusters, updateRule, seed, time });
}

function freshnessRecovery({ graph, baseSample, baseLikelihood, clusters, seed, time, envelope, complexity, samplingEffect, updateRule }) {
  const width = graph.width;
  const height = graph.height;
  const likelihood = blankField(width, height);
  const sample = blankField(width, height);
  const visitWindow = Math.floor(Math.max(0, time) / 8);
  for (const node of graph.nodes) {
    const visit = seededUnit(`${seed}:graph-visit:${Math.floor(node.x / 3)}:${Math.floor(node.y / 3)}:${visitWindow}`) > 0.86;
    const age = visit ? 0 : clamp01(0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 0.08 + seededUnit(`${seed}:age:${node.id}`) * Math.PI * 2)));
    const recovery = clamp01(age * complexity);
    const localL = clamp01(baseLikelihood[node.y][node.x] * (visit ? 0.35 : 0.62) + recovery * 0.4);
    likelihood[node.y][node.x] = localL;
    sample[node.y][node.x] = clamp01(baseSample[node.y][node.x] * (visit ? 0.28 : 0.58) + recovery * 0.52 * envelope);
    node.graphState = {
      state: visit ? 'cooling' : recovery > 0.72 ? 'recovering' : 'inactive',
      age,
      freshness: age,
      cooldown: visit ? 1 : clamp01(1 - recovery),
      recovery,
      lastSampledTime: visit ? time : null,
      samplingEffect
    };
  }
  return materializeGraphResult({ graph, baseSample, likelihood: roundField(likelihood), sample: roundField(sample), sourceNodes: [], clusters, updateRule, seed, time });
}

function materializeGraphResult({ graph, baseSample, likelihood, sample, sourceNodes, clusters = [], updateRule, seed, time }) {
  const width = graph.width;
  const height = graph.height;
  const nodes = graph.nodes.map((node) => {
    const incoming = incomingWeighted(graph, likelihood, node.id);
    const outgoing = outgoingWeighted(graph, likelihood, node.id);
    const local = node.graphState ?? {};
    const cluster = clusterForCommunity(clusters, node.communityId);
    const activation = activationValue(local.state ?? stateForLikelihood(likelihood[node.y]?.[node.x] ?? 0), local.activation, likelihood[node.y]?.[node.x] ?? 0);
    return {
      id: node.id,
      row: node.y,
      col: node.x,
      x: node.x,
      y: node.y,
      clusterId: local.clusterId ?? cluster?.id ?? null,
      clusterLikelihood: round3(local.clusterLikelihood ?? cluster?.likelihood ?? 0),
      likelihood: round3(likelihood[node.y]?.[node.x] ?? 0),
      cellLikelihood: round3(likelihood[node.y]?.[node.x] ?? 0),
      activation: round3(activation),
      sampleValue: round3(sample[node.y]?.[node.x] ?? 0),
      state: local.state ?? stateForLikelihood(likelihood[node.y]?.[node.x] ?? 0),
      cooldown: round3(local.cooldown ?? clamp01(1 - (likelihood[node.y]?.[node.x] ?? 0))),
      recovery: round3(local.recovery ?? likelihood[node.y]?.[node.x] ?? 0),
      age: round3(local.age ?? 0),
      freshness: round3(local.freshness ?? local.age ?? 0),
      phase: round3(local.phase ?? seededUnit(`${seed}:phase:${node.id}`) * Math.PI * 2),
      threshold: round3(local.threshold ?? 0.55),
      susceptibility: round3(local.susceptibility ?? likelihood[node.y]?.[node.x] ?? 0),
      communityId: node.communityId ?? 0,
      sourceStrength: round3(local.sourceStrength ?? 0),
      lastSampledTime: local.lastSampledTime ?? null,
      incomingMessage: round3(incoming),
      outgoingMessage: round3(outgoing),
      neighborCount: graph.outgoing[node.id]?.length ?? 0,
      activeNeighborCount: activeNeighborCount(graph, likelihood, node.id),
      dominantIncomingDirection: dominantIncomingDirection(graph, likelihood, node.id),
      birth: Boolean(local.birth),
      death: Boolean(local.death)
    };
  });
  const edgeMessages = emittedEdgeMessages(graph, nodes, updateRule);
  const nodeTransitions = emittedNodeTransitions(nodes, baseLikelihoodFromSample(baseSample), updateRule);
  return {
    updateRule,
    processMetadata: {
      processClass: processClassForUpdateRule(updateRule),
      messageSource: edgeMessages.length ? 'emitted' : 'none',
      transitionSource: nodeTransitions.length ? 'emitted' : 'none',
      explanatoryBoundary: 'Edge messages are abstract ROI influence, not physical current vectors.'
    },
    topology: graph.topology,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    nodes,
    nodeGrid: gridFromNodes(nodes, width, height),
    edgeMessages,
    nodeTransitions,
    transitionField: gridFromNodes(nodes, width, height, (node) => nodeTransitions.find((transition) => transition.nodeId === node.id)?.cause ?? 'stable'),
    stateField: gridFromNodes(nodes, width, height, (node) => node.state),
    activationField: gridFromNodes(nodes, width, height, (node) => node.activation),
    clusterLikelihoodField: gridFromNodes(nodes, width, height, (node) => node.clusterLikelihood),
    incomingMessageField: gridFromNodes(nodes, width, height, (node) => node.incomingMessage),
    sampleValueField: roundField(sample),
    likelihoodField: roundField(likelihood),
    nodeStateFields: ['clusterLikelihood', 'cellLikelihood', 'activation', 'sampleValue', 'state', 'cooldown', 'recovery', 'freshness', 'incomingMessage'],
    sourceNodes,
    clusters,
    time: round3(time),
    metadata: {
      deterministic: true,
      engine: 'roi-graph-message-v1',
      updateExpression: 'incoming_messages_i(t) + node_self_dynamics_i(t) + temporal_forcing_i(t) + sampling_effect_i(t) -> L_i(t+1), S_i(t+1), state_i(t+1)'
    }
  };
}

function emittedEdgeMessages(graph, nodes, updateRule) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return (graph.edges ?? [])
    .map((edge) => {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) return null;
      const sourceSignal = Number(source.outgoingMessage ?? source.activation ?? source.cellLikelihood ?? 0);
      const targetReadiness = Number(target.cellLikelihood ?? target.likelihood ?? 0);
      const strength = round3(sourceSignal * Number(edge.weight ?? 1) * (0.65 + targetReadiness * 0.35));
      if (strength < 0.035) return null;
      return {
        source: edge.source,
        target: edge.target,
        sourceCell: { x: source.col, y: source.row },
        targetCell: { x: target.col, y: target.row },
        weight: edge.weight,
        messageStrength: strength,
        strength,
        sameCommunity: source.communityId === target.communityId,
        communityId: source.communityId ?? null,
        rule: updateRule,
        cause: messageCause(updateRule, source, target),
        label: messageLabel(updateRule)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.messageStrength - a.messageStrength);
}

function emittedNodeTransitions(nodes, previousLikelihood, updateRule) {
  return nodes
    .map((node) => {
      const previousValue = Number(previousLikelihood?.[node.row]?.[node.col] ?? 0);
      const previousState = stateForLikelihood(previousValue);
      const nextState = node.state;
      const driverValue = round3(Math.max(Number(node.cellLikelihood ?? 0), Number(node.activation ?? 0), Number(node.incomingMessage ?? 0)));
      const cause = transitionCause(updateRule, previousState, nextState, node);
      return {
        nodeId: node.id,
        row: node.row,
        col: node.col,
        communityId: node.communityId,
        previousState,
        nextState,
        cause,
        driverValue,
        label: transitionLabel(cause, nextState)
      };
    })
    .filter((transition) => transition.previousState !== transition.nextState || transition.driverValue >= 0.35);
}

function baseLikelihoodFromSample(field) {
  return field;
}

function messageCause(updateRule, source, target) {
  if (updateRule === 'frontPropagation') return target.state === 'susceptible' ? 'front_neighbor_pressure' : 'front_residual_influence';
  if (updateRule === 'rippleWave') return 'wave_crest_neighbor_influence';
  if (updateRule === 'directedDrift') return 'directional_drift_bias';
  if (updateRule === 'lifeLikeLocalRules') return 'local_rule_neighbor_count';
  if (updateRule === 'freshnessRecovery') return 'freshness_recovery_context';
  if (updateRule === 'clusterCooldownRecovery') return 'cluster_basin_activity';
  return source.communityId === target.communityId ? 'within_community_neighbor_spread' : 'cross_community_neighbor_spread';
}

function messageLabel(updateRule) {
  return {
    clusterCooldownRecovery: 'cluster basin influence',
    frontPropagation: 'front propagation message',
    rippleWave: 'ripple crest message',
    directedDrift: 'directed drift message',
    lifeLikeLocalRules: 'local rule neighbor message',
    freshnessRecovery: 'freshness recovery context',
    neighborSpread: 'neighbor spread message'
  }[updateRule] ?? 'ROI graph message';
}

function transitionCause(updateRule, previousState, nextState, node) {
  if (previousState === nextState && Number(node.incomingMessage ?? 0) >= 0.35) return 'strong_incoming_message';
  if (nextState === 'active' || nextState === 'crest' || nextState === 'alive') return updateRule === 'frontPropagation' ? 'front_ignition' : updateRule === 'lifeLikeLocalRules' ? 'local_rule_birth' : 'activation_threshold_crossed';
  if (nextState === 'cooling') return 'cooldown_after_activity';
  if (nextState === 'recovering') return 'recovery_or_near_future_interest';
  if (nextState === 'consumed') return 'burnout_or_depletion';
  if (nextState === 'susceptible') return 'susceptible_ahead_of_activity';
  if (nextState === 'inactive' && previousState !== 'inactive') return 'activity_faded';
  return 'stable';
}

function transitionLabel(cause, nextState) {
  return {
    activation_threshold_crossed: `became ${nextState} after readiness crossed threshold`,
    front_ignition: 'front reached this cell',
    local_rule_birth: 'local neighbor rule activated this cell',
    cooldown_after_activity: 'cooling after recent activity',
    recovery_or_near_future_interest: 'recovering toward future interest',
    burnout_or_depletion: 'consumed or depleted behind the active region',
    susceptible_ahead_of_activity: 'susceptible ahead of active region',
    activity_faded: 'activity faded below threshold',
    strong_incoming_message: 'held by strong incoming graph message',
    stable: 'state remained stable'
  }[cause] ?? cause;
}

function nearestSource(sourceNodes, x, y) {
  let best = null;
  for (const node of sourceNodes ?? []) {
    const distance = Math.hypot(x - node.x, y - node.y);
    if (!best || distance < best.distance) best = { node, distance, radius: node.radius, phase: node.phase, id: node.id };
  }
  return best;
}

function clusterForCommunity(clusters, communityId) {
  return (clusters ?? []).find((cluster) => cluster.communityId === communityId) ?? null;
}

function activationValue(state, explicitActivation, likelihood) {
  if (Number.isFinite(Number(explicitActivation))) return clamp01(explicitActivation);
  if (['active', 'crest', 'alive'].includes(state)) return clamp01(likelihood);
  if (state === 'recovering') return clamp01(Number(likelihood) * 0.45);
  return 0;
}

function incomingWeighted(graph, field, id) {
  return (graph.incoming[id] ?? []).reduce((sum, edge) => {
    const y = Math.floor(edge.source / graph.width);
    const x = edge.source % graph.width;
    return sum + Number(field[y]?.[x] ?? 0) * edge.weight;
  }, 0) / Math.max(1, graph.incoming[id]?.length ?? 1);
}

function outgoingWeighted(graph, field, id) {
  const y = Math.floor(id / graph.width);
  const x = id % graph.width;
  const value = Number(field[y]?.[x] ?? 0);
  return (graph.outgoing[id] ?? []).reduce((sum, edge) => sum + value * edge.weight, 0) / Math.max(1, graph.outgoing[id]?.length ?? 1);
}

function activeNeighborCount(graph, field, id) {
  return (graph.incoming[id] ?? []).filter((edge) => {
    const y = Math.floor(edge.source / graph.width);
    const x = edge.source % graph.width;
    return Number(field[y]?.[x] ?? 0) >= 0.55;
  }).length;
}

function dominantIncomingDirection(graph, field, id) {
  let best = null;
  for (const edge of graph.incoming[id] ?? []) {
    const y = Math.floor(edge.source / graph.width);
    const x = edge.source % graph.width;
    const value = Number(field[y]?.[x] ?? 0) * edge.weight;
    if (!best || value > best.value) best = { value, x: -edge.direction.x, y: -edge.direction.y };
  }
  return best ? { x: best.x, y: best.y } : { x: 0, y: 0 };
}

function gridFromNodes(nodes, width, height, mapper = (node) => node) {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => null));
  for (const node of nodes) grid[node.row][node.col] = mapper(node);
  return grid;
}

function sampleShift(field, dxNorm, dyNorm) {
  const height = field.length;
  const width = field[0]?.length ?? 0;
  return roundField(field.map((row, y) => row.map((_value, x) => sampleAt(field, x - dxNorm * width, y - dyNorm * height))));
}

function sampleAt(field, x, y) {
  const height = field.length;
  const width = field[0]?.length ?? 0;
  if (!height || !width) return 0;
  const xx = Math.max(0, Math.min(width - 1, Math.round(Number(x) || 0)));
  const yy = Math.max(0, Math.min(height - 1, Math.round(Number(y) || 0)));
  return Number(field[yy]?.[xx] ?? 0);
}

function stateForLikelihood(value) {
  const number = Number(value) || 0;
  if (number >= 0.7) return 'active';
  if (number >= 0.4) return 'recovering';
  return 'inactive';
}

function cloneField(field, width, height) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => clamp01(field?.[y]?.[x] ?? 0)));
}

function blankField(width, height) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
}

function roundField(field) {
  return field.map((row) => row.map((value) => round3(clamp01(value))));
}

function temporalEnvelope(pattern, time, seed) {
  if (pattern === 'static' || pattern === 'sustained') return 1;
  if (pattern === 'pulseThenSilence') return time < 24 ? Math.max(0, 1 - time / 24) : 0;
  if (pattern === 'bursty') return 0.35 + 0.65 * Math.max(0, Math.sin(time * 0.22));
  if (pattern === 'intermittent') return seededUnit(`${seed}:intermittent:${Math.floor(time / 8)}`) > 0.42 ? 0.95 : 0.28;
  if (pattern === 'randomPulses') return 0.25 + (seededUnit(`${seed}:pulse:${Math.floor(time / 4)}`) > 0.72 ? 0.72 : 0.12);
  if (pattern === 'wavyMultiFrequency') return 0.45 + 0.28 * Math.sin(time * 0.2) + 0.22 * Math.sin(time * 0.43 + 1.7);
  return 0.5 + 0.5 * Math.sin(time * 0.16);
}

function complexityValue(value, low, medium, high) {
  if (value === 'low') return low;
  if (value === 'high') return high;
  return medium;
}

function seededUnit(seed) {
  let hash = 2166136261;
  const text = String(seed);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return ((hash >>> 0) / 4294967295);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function round3(value) {
  return Number((Number(value) || 0).toFixed(3));
}
