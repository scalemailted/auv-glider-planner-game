const index = require('../../environment/src/index.js')
const MissionSimulationContracts = require('./MissionSimulationContracts.js')
const MissionSimulationUtil = require('./MissionSimulationUtil.js')
const MISSION_SIMULATOR_KERNEL_VERSION = 'mission-simulator-kernel-sim-pkg-r2';

 function createMissionSimulator(inputOrOptions = {}, options = {}) {
  const input = MissionSimulationContracts.normalizeMissionSimulationInput(inputOrOptions);
  const validation = MissionSimulationContracts.validateMissionSimulationInput(input);
  const sampler = input.environmentArtifact ? safeCreateSampler(input.environmentArtifact, options.samplerOptions ?? {}) : null;
  const simulator = {
    type: 'anchor.mission-simulator.kernel',
    version: MISSION_SIMULATOR_KERNEL_VERSION,
    input,
    validation,
    state: MissionSimulationContracts.createMissionSimulationState(input),
    commandLog: [],
    events: [],
    observations: [],
    rawMetrics: MissionSimulationContracts.createMissionSimulationRawMetrics(),
    terminal: false,
    terminalReason: null,
    pendingDecision: null,
    sampler,
    runtime: {
      backendId: options.backendId ?? input.manifest.backendId ?? 'javascriptCpuV1',
      engineId: 'packages/mission-simulator',
      engineVersion: MISSION_SIMULATOR_KERNEL_VERSION,
      packageKernelActive: true,
      browserSpecific: false,
      headlessSpecific: false,
      deterministic: true,
      simulatorCreateCount: 1,
      simulatorResetCount: 0,
      simulatorStepCount: 0,
      simulatorFinishCount: 0,
      simulatorRestoreCount: 0,
      packageTransitionCount: 0,
      legacyProductionTransitionCount: 0,
      duplicateEngineCount: 0,
      environmentSamplerCreateCount: sampler ? 1 : 0,
      warnings: [...validation.warnings],
      failures: [...validation.errors]
    }
  };
  simulator.state = MissionSimulationContracts.normalizeMissionSimulationState({
    ...simulator.state,
    rawMetrics: simulator.rawMetrics,
    terminal: simulator.terminal,
    terminalReason: simulator.terminalReason
  });
  return simulator;
}

 function resetMissionSimulator(simulatorOrState) {
  const simulator = ensureSimulator(simulatorOrState);
  simulator.state = MissionSimulationContracts.createMissionSimulationState(simulator.input);
  simulator.commandLog = [];
  simulator.events = [];
  simulator.observations = [];
  simulator.rawMetrics = MissionSimulationContracts.createMissionSimulationRawMetrics();
  simulator.terminal = false;
  simulator.terminalReason = null;
  simulator.pendingDecision = null;
  simulator.runtime.simulatorResetCount += 1;
  return simulator;
}

 function stepMissionSimulator(simulatorOrState, command = {}) {
  const simulator = ensureSimulator(simulatorOrState);
  const normalizedCommand = normalizeMissionSimulationCommand(command);
  const previousState = simulator.state;
  const previousTimeSeconds = previousState.timeSeconds;
  const emittedEvents = [];
  const emittedObservations = [];
  const warnings = [];
  const failures = [];
  let accepted = true;
  let changed = false;

  if (simulator.terminal && normalizedCommand.type !== 'reset') {
    accepted = false;
    warnings.push('Mission simulator is terminal; command ignored.');
  } else if (normalizedCommand.type === 'reset') {
    resetMissionSimulator(simulator);
    changed = true;
  } else if (normalizedCommand.type === 'resolveSurfacingDecision' || normalizedCommand.type === 'resumeWithReplan') {
    applyMissionSimulationDecision(simulator, normalizedCommand.decision ?? normalizedCommand.replanSnapshot ?? normalizedCommand);
    changed = true;
  } else if (normalizedCommand.actualState) {
    syncMissionSimulatorState(simulator, normalizedCommand.actualState);
    changed = true;
  } else if (normalizedCommand.type === 'finish') {
    finishMissionSimulator(simulator, normalizedCommand.options ?? {});
    changed = true;
  } else {
    runPortableStep(simulator, normalizedCommand, emittedEvents, emittedObservations, warnings);
    changed = true;
  }

  simulator.runtime.simulatorStepCount += accepted && normalizedCommand.type !== 'reset' ? 1 : 0;
  simulator.runtime.packageTransitionCount += accepted && normalizedCommand.type !== 'reset' ? 1 : 0;
  const commandRecord = {
    type: normalizedCommand.type,
    dtSeconds: normalizedCommand.dtSeconds,
    targetTimeSeconds: normalizedCommand.targetTimeSeconds,
    accepted,
    previousTimeSeconds,
    nextTimeSeconds: simulator.state.timeSeconds,
    stateDigest: simulator.state.stateDigest
  };
  simulator.commandLog.push(commandRecord);
  return {
    status: failures.length ? 'failed' : accepted ? 'accepted' : 'ignored',
    accepted,
    changed,
    previousTimeSeconds,
    nextTimeSeconds: simulator.state.timeSeconds,
    state: simulator.state,
    emittedEvents,
    emittedObservations,
    terminal: simulator.terminal,
    terminalReason: simulator.terminalReason,
    pendingDecision: simulator.pendingDecision,
    warnings,
    failures
  };
}

 function advanceMissionSimulator(simulatorOrState, durationSeconds, options = {}) {
  const simulator = ensureSimulator(simulatorOrState);
  const dt = Math.max(0.001, MissionSimulationUtil.finiteNumber(options.dtSeconds ?? simulator.input.manifest.timeStepSeconds, 1));
  const target = simulator.state.timeSeconds + Math.max(0, MissionSimulationUtil.finiteNumber(durationSeconds, 0));
  const results = [];
  while (!simulator.terminal && simulator.state.timeSeconds + 1e-9 < target && results.length < Math.max(1, MissionSimulationUtil.finiteNumber(options.maxSteps, 10000))) {
    results.push(stepMissionSimulator(simulator, { type: 'step', dtSeconds: Math.min(dt, target - simulator.state.timeSeconds) }));
  }
  return { simulator, results, state: simulator.state, terminal: simulator.terminal, terminalReason: simulator.terminalReason };
}

 function finishMissionSimulator(simulatorOrState, options = {}) {
  const simulator = ensureSimulator(simulatorOrState);
  const maxSteps = Math.max(1, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(options.maxSteps, 10000)));
  const dt = Math.max(0.001, MissionSimulationUtil.finiteNumber(options.dtSeconds ?? simulator.input.manifest.timeStepSeconds, 1));
  let steps = 0;
  while (!simulator.terminal && steps < maxSteps) {
    runPortableStep(simulator, { type: 'step', dtSeconds: dt }, [], [], []);
    steps += 1;
    if (simulator.state.timeSeconds >= simulator.input.missionDurationSeconds && simulator.input.missionDurationSeconds > 0) break;
  }
  if (!simulator.terminal) markTerminal(simulator, options.terminalReason ?? 'operatorFinish');
  simulator.runtime.simulatorFinishCount += 1;
  simulator.runtime.packageTransitionCount += 1;
  return simulator;
}

 function applyMissionSimulationDecision(simulatorOrState, decision = {}) {
  const simulator = ensureSimulator(simulatorOrState);
  const action = decision.action ?? decision.type ?? 'continue';
  simulator.pendingDecision = null;
  const event = MissionSimulationContracts.normalizeMissionSimulationEvent({ type: 'surfaceDecision', timeSeconds: simulator.state.timeSeconds, action, publicPayload: { action } }, simulator.events.length);
  simulator.events.push(event);
  if (action === 'finishMission' || action === 'finish') markTerminal(simulator, 'surfaceDecisionFinish');
  syncStateMetrics(simulator);
  return { status: 'accepted', action, state: simulator.state, event };
}

 function syncMissionSimulatorState(simulatorOrState, runtimeState = {}) {
  const simulator = ensureSimulator(simulatorOrState);
  const events = MissionSimulationUtil.normalizeArray(runtimeState.events).map((event, index) => MissionSimulationContracts.normalizeMissionSimulationEvent(event, index));
  const observations = MissionSimulationUtil.normalizeArray(runtimeState.observations ?? events.filter((event) => event.type === 'sample' || event.type === 'observation')).map((observation, index) => MissionSimulationContracts.normalizeMissionSimulationObservation(observation, index));
  const agents = MissionSimulationUtil.normalizeArray(runtimeState.agents).map(MissionSimulationContracts.normalizeAgentState);
  simulator.events = events;
  simulator.observations = observations;
  simulator.pendingDecision = MissionSimulationUtil.clonePlain(runtimeState.pendingDecision ?? runtimeState.awaitingSurfaceDecision ?? null);
  simulator.terminal = runtimeState.terminal === true || runtimeState.complete === true;
  simulator.terminalReason = simulator.terminal ? (runtimeState.terminalReason ?? runtimeState.stopReason?.code ?? runtimeState.abortReason ?? simulator.terminalReason) : null;
  simulator.rawMetrics = MissionSimulationContracts.createMissionSimulationRawMetrics({
    ...runtimeState.rawMetrics,
    agents,
    events,
    observations,
    timeSeconds: runtimeState.timeSeconds ?? runtimeState.t,
    stepCount: runtimeState.stepCount,
    terminal: simulator.terminal,
    terminalReason: simulator.terminalReason,
    endCondition: runtimeState.endCondition,
    samplingMetrics: runtimeState.samplingMetrics
  });
  simulator.state = MissionSimulationContracts.normalizeMissionSimulationState({
    inputDigest: simulator.input.inputDigest,
    manifestDigest: simulator.input.manifest.manifestDigest,
    environmentArtifactDigest: simulator.input.environmentArtifactDigest,
    planDigest: simulator.input.planDigest,
    timeSeconds: runtimeState.timeSeconds ?? runtimeState.t ?? simulator.state.timeSeconds,
    stepCount: runtimeState.stepCount ?? simulator.state.stepCount,
    agents,
    pendingDecision: simulator.pendingDecision,
    terminal: simulator.terminal,
    terminalReason: simulator.terminalReason,
    rawMetrics: simulator.rawMetrics
  });
  return simulator.state;
}

 function missionSimulationSnapshot(simulatorOrState) {
  const simulator = ensureSimulator(simulatorOrState);
  return {
    type: 'anchor.mission-simulator.snapshot',
    version: MissionSimulationContracts.MISSION_SIMULATION_SNAPSHOT_VERSION,
    kernelVersion: MISSION_SIMULATOR_KERNEL_VERSION,
    inputDigest: simulator.input.inputDigest,
    manifestDigest: simulator.input.manifest.manifestDigest,
    environmentArtifactDigest: simulator.input.environmentArtifactDigest,
    planDigest: simulator.input.planDigest,
    state: MissionSimulationUtil.clonePlain(simulator.state),
    events: MissionSimulationUtil.clonePlain(simulator.events),
    observations: MissionSimulationUtil.clonePlain(simulator.observations),
    rawMetrics: MissionSimulationUtil.clonePlain(simulator.rawMetrics),
    terminal: simulator.terminal,
    terminalReason: simulator.terminalReason,
    pendingDecision: MissionSimulationUtil.clonePlain(simulator.pendingDecision),
    commandLogDigest: MissionSimulationUtil.stableDigest(simulator.commandLog),
    snapshotDigest: MissionSimulationUtil.stableDigest({ stateDigest: simulator.state.stateDigest, eventDigests: simulator.events.map((event) => event.digest), observationDigests: simulator.observations.map((observation) => observation.digest), rawMetrics: simulator.rawMetrics, terminal: simulator.terminal, terminalReason: simulator.terminalReason })
  };
}

 function restoreMissionSimulationSnapshot(snapshot = {}, dependencies = {}) {
  const input = dependencies.input ?? dependencies.missionSimulationInput ?? MissionSimulationContracts.createMissionSimulationInput({
    environmentArtifact: dependencies.environmentArtifact ?? null,
    environmentArtifactDigest: snapshot.environmentArtifactDigest,
    planDigest: snapshot.planDigest,
    deterministicSeed: dependencies.seed ?? 'restored-sim-seed',
    agentConfigurations: snapshot.state?.agents ?? []
  });
  const simulator = createMissionSimulator(input, dependencies.options ?? {});
  simulator.state = MissionSimulationContracts.normalizeMissionSimulationState(snapshot.state ?? {});
  simulator.events = MissionSimulationUtil.normalizeArray(snapshot.events).map((event, index) => MissionSimulationContracts.normalizeMissionSimulationEvent(event, index));
  simulator.observations = MissionSimulationUtil.normalizeArray(snapshot.observations).map((observation, index) => MissionSimulationContracts.normalizeMissionSimulationObservation(observation, index));
  simulator.rawMetrics = MissionSimulationContracts.createMissionSimulationRawMetrics(snapshot.rawMetrics ?? simulator.state.rawMetrics ?? {});
  simulator.terminal = snapshot.terminal === true;
  simulator.terminalReason = snapshot.terminalReason ?? null;
  simulator.pendingDecision = MissionSimulationUtil.clonePlain(snapshot.pendingDecision ?? null);
  simulator.runtime.simulatorRestoreCount += 1;
  return simulator;
}

 function missionSimulationEvents(simulatorOrState) {
  return ensureSimulator(simulatorOrState).events.map((event) => ({ ...event }));
}

 function missionSimulationObservations(simulatorOrState) {
  return ensureSimulator(simulatorOrState).observations.map((observation) => ({ ...observation }));
}

 function missionSimulationRawMetrics(simulatorOrState) {
  const simulator = ensureSimulator(simulatorOrState);
  return { ...simulator.rawMetrics };
}

 function missionSimulationTerminalSummary(simulatorOrState) {
  const simulator = ensureSimulator(simulatorOrState);
  return { terminal: simulator.terminal, terminalReason: simulator.terminalReason, timeSeconds: simulator.state.timeSeconds, stateDigest: simulator.state.stateDigest, rawMetrics: simulator.rawMetrics };
}

 function missionSimulatorDebugSummary(simulatorOrState) {
  const simulator = ensureSimulator(simulatorOrState);
  const samplerCounters = index.getEnvironmentSamplerRuntimeCounters();
  return {
    packageVersion: MISSION_SIMULATOR_KERNEL_VERSION,
    engineId: simulator.runtime.engineId ?? 'packages/mission-simulator',
    engineVersion: simulator.runtime.engineVersion ?? MISSION_SIMULATOR_KERNEL_VERSION,
    manifestDigest: simulator.input.manifest.manifestDigest,
    inputDigest: simulator.input.inputDigest,
    environmentArtifactDigest: simulator.input.environmentArtifactDigest,
    planDigest: simulator.input.planDigest,
    stateDigest: simulator.state.stateDigest,
    timeSeconds: simulator.state.timeSeconds,
    stepIndex: simulator.state.stepCount,
    agentCount: simulator.state.agents.length,
    activeAgentCount: simulator.state.agents.filter((agent) => agent.status !== 'idle' && agent.status !== 'complete').length,
    eventCount: simulator.events.length,
    observationCount: simulator.observations.length,
    pendingDecision: simulator.pendingDecision ? { type: simulator.pendingDecision.type ?? simulator.pendingDecision.reason ?? 'pendingDecision' } : null,
    terminal: simulator.terminal,
    terminalReason: simulator.terminalReason,
    rawMetricSummary: simulator.rawMetrics,
    simulatorCreateCount: simulator.runtime.simulatorCreateCount,
    simulatorResetCount: simulator.runtime.simulatorResetCount,
    simulatorStepCount: simulator.runtime.simulatorStepCount,
    simulatorFinishCount: simulator.runtime.simulatorFinishCount,
    simulatorRestoreCount: simulator.runtime.simulatorRestoreCount ?? 0,
    packageTransitionCount: simulator.runtime.packageTransitionCount ?? simulator.runtime.simulatorStepCount ?? 0,
    legacyProductionTransitionCount: simulator.runtime.legacyProductionTransitionCount ?? 0,
    duplicateEngineCount: simulator.runtime.duplicateEngineCount ?? 0,
    environmentSamplerCreateCount: simulator.runtime.environmentSamplerCreateCount,
    environmentSamplerCallCount: samplerCounters.sampleCallCount,
    browserHeadlessParityStatus: simulator.runtime.browserHeadlessParityStatus ?? 'not_checked',
    snapshotContinuationParityStatus: simulator.runtime.snapshotContinuationParityStatus ?? 'not_checked',
    packageOwnsPhysics: true,
    packageOwnsRouteProgress: true,
    packageOwnsEnvironmentSampling: true,
    packageOwnsTerminalEvaluation: true,
    packageOwnsRawMetrics: true,
    packageOwnsEnvironmentGeneration: false,
    packageOwnsPlanning: false,
    packageOwnsOfficialScoring: false,
    packageOwnsScoring: false,
    packageOwnsRendering: false,
    packageUsesThree: false,
    packageUsesPhaser: false,
    packageUsesDom: false,
    canonicalTimeUnit: 'seconds',
    canonicalDepthConvention: 'positiveDownMeters',
    warnings: simulator.runtime.warnings.slice(),
    failures: simulator.runtime.failures.slice()
  };
}

function runPortableStep(simulator, command, emittedEvents, emittedObservations, warnings) {
  const dt = Math.max(0, MissionSimulationUtil.finiteNumber(command.dtSeconds, simulator.input.manifest.timeStepSeconds));
  const nextTime = command.type === 'advanceTo' ? Math.max(simulator.state.timeSeconds, MissionSimulationUtil.finiteNumber(command.targetTimeSeconds, simulator.state.timeSeconds)) : simulator.state.timeSeconds + dt;
  const actualDt = Math.max(0, nextTime - simulator.state.timeSeconds);
  const planByAgent = new Map(MissionSimulationUtil.normalizeArray(simulator.input.plan.agentPlans).map((agentPlan) => [agentPlan.agentId, MissionSimulationUtil.normalizeArray(agentPlan.waypoints)]));
  const agents = simulator.state.agents.map((agent) => advanceAgent(agent, planByAgent.get(agent.id) ?? [], actualDt, nextTime, simulator, emittedEvents, emittedObservations, warnings));
  const terminal = simulator.input.missionDurationSeconds > 0 && nextTime >= simulator.input.missionDurationSeconds;
  simulator.state = MissionSimulationContracts.normalizeMissionSimulationState({
    ...simulator.state,
    timeSeconds: nextTime,
    stepCount: simulator.state.stepCount + 1,
    agents,
    terminal,
    terminalReason: terminal ? 'missionTimeExpired' : simulator.terminalReason,
    rawMetrics: MissionSimulationContracts.createMissionSimulationRawMetrics({ agents, events: simulator.events, observations: simulator.observations, timeSeconds: nextTime, stepCount: simulator.state.stepCount + 1, terminal })
  });
  simulator.rawMetrics = simulator.state.rawMetrics;
  if (terminal) markTerminal(simulator, 'missionTimeExpired');
}

function advanceAgent(agent, waypoints, dt, timeSeconds, simulator, emittedEvents, emittedObservations, warnings) {
  if (!waypoints.length) return { ...agent, status: 'idle', depthMeters: 0, diveState: 'surfaced' };
  const activeIndex = Math.min(Math.max(0, Math.floor(MissionSimulationUtil.finiteNumber(agent.metadata?.activeWaypointIndex, 0))), waypoints.length - 1);
  const target = waypoints[activeIndex];
  const dx = MissionSimulationUtil.finiteNumber(target.x, agent.eastMeters) - agent.eastMeters;
  const dy = MissionSimulationUtil.finiteNumber(target.y, agent.northMeters) - agent.northMeters;
  const distance = Math.hypot(dx, dy);
  const speed = Math.max(0.001, MissionSimulationUtil.finiteNumber(agent.metadata?.maxSpeed ?? 1, 1));
  const travel = Math.min(distance, speed * dt);
  const fraction = distance > 1e-9 ? travel / distance : 1;
  const eastMeters = MissionSimulationUtil.round(agent.eastMeters + dx * fraction);
  const northMeters = MissionSimulationUtil.round(agent.northMeters + dy * fraction);
  const depthMeters = Math.max(0, MissionSimulationUtil.finiteNumber(target.depthMeters ?? agent.depthMeters, agent.depthMeters));
  const nextHistory = [...(agent.history ?? []), { x: eastMeters, y: northMeters, depthMeters, timeSeconds: MissionSimulationUtil.round(timeSeconds) }];
  const reached = distance <= Math.max(0.05, travel + 1e-9);
  const sample = simulator.sampler ? index.sampleEnvironment(simulator.sampler, eastMeters, northMeters, depthMeters, timeSeconds) : null;
  const nextIndex = reached ? activeIndex + 1 : activeIndex;
  const waypointEvent = reached ? MissionSimulationContracts.normalizeMissionSimulationEvent({ type: 'waypointReached', timeSeconds, agentId: agent.id, waypointId: target.id ?? target.waypointId ?? `wp-${activeIndex + 1}`, publicPayload: { x: eastMeters, y: northMeters, depthMeters } }, simulator.events.length + emittedEvents.length) : null;
  if (waypointEvent) {
    emittedEvents.push(waypointEvent);
    simulator.events.push(waypointEvent);
  }
  if (sample?.valid === false) warnings.push(`Environment sample invalid for agent ${agent.id}.`);
  const observation = sample?.scalars && Object.keys(sample.scalars).length ? MissionSimulationContracts.normalizeMissionSimulationObservation({ type: 'environmentSample', timeSeconds, agentId: agent.id, x: eastMeters, y: northMeters, depthMeters, value: Object.values(sample.scalars)[0]?.value ?? 0, depthLayerId: target.depthLayerId ?? target.depthLayer ?? null }, simulator.observations.length + emittedObservations.length) : null;
  if (observation) {
    emittedObservations.push(observation);
    simulator.observations.push(observation);
  }
  const status = nextIndex >= waypoints.length ? 'complete' : 'enroute';
  return MissionSimulationContracts.normalizeAgentState({
    ...agent,
    status,
    x: eastMeters,
    y: northMeters,
    eastMeters,
    northMeters,
    depthMeters,
    energyUsed: MissionSimulationUtil.finiteNumber(agent.energyUsed, 0) + travel,
    battery: Math.max(0, MissionSimulationUtil.finiteNumber(agent.energyRemaining, 0) - travel),
    energyRemaining: Math.max(0, MissionSimulationUtil.finiteNumber(agent.energyRemaining, 0) - travel),
    activeWaypointId: status === 'complete' ? null : (waypoints[nextIndex]?.id ?? waypoints[nextIndex]?.waypointId ?? `wp-${nextIndex + 1}`),
    routeProgress: waypoints.length ? nextIndex / waypoints.length : 0,
    history: nextHistory,
    observationCount: MissionSimulationUtil.finiteNumber(agent.observationCount, 0) + (observation ? 1 : 0),
    sampleCount: MissionSimulationUtil.finiteNumber(agent.sampleCount, 0) + (observation ? 1 : 0),
    metadata: { ...(agent.metadata ?? {}), activeWaypointIndex: nextIndex, maxSpeed: speed, distanceTraveled: MissionSimulationUtil.pathDistance(nextHistory) }
  });
}

function syncStateMetrics(simulator) {
  simulator.rawMetrics = MissionSimulationContracts.createMissionSimulationRawMetrics({ agents: simulator.state.agents, events: simulator.events, observations: simulator.observations, timeSeconds: simulator.state.timeSeconds, stepCount: simulator.state.stepCount, terminal: simulator.terminal });
  simulator.state = MissionSimulationContracts.normalizeMissionSimulationState({ ...simulator.state, rawMetrics: simulator.rawMetrics, terminal: simulator.terminal, terminalReason: simulator.terminalReason, pendingDecision: simulator.pendingDecision });
}

function markTerminal(simulator, reason) {
  simulator.terminal = true;
  simulator.terminalReason = reason ?? simulator.terminalReason ?? 'terminal';
  syncStateMetrics(simulator);
}

function normalizeMissionSimulationCommand(command = {}) {
  const type = command.type ?? 'step';
  return {
    type,
    dtSeconds: Math.max(0, MissionSimulationUtil.finiteNumber(command.dtSeconds ?? command.dt ?? command.durationSeconds, 0)),
    targetTimeSeconds: command.targetTimeSeconds == null ? null : MissionSimulationUtil.finiteNumber(command.targetTimeSeconds, 0),
    decision: MissionSimulationUtil.clonePlain(command.decision ?? null),
    replanSnapshot: MissionSimulationUtil.clonePlain(command.replanSnapshot ?? null),
    actualState: command.actualState ?? null,
    options: MissionSimulationUtil.clonePlain(command.options ?? {})
  };
}

function ensureSimulator(value) {
  if (value?.type === 'anchor.mission-simulator.kernel') return value;
  if (value?.type === 'anchor.mission-simulator.state') return createMissionSimulator({ agentConfigurations: value.agents ?? [], planDigest: value.planDigest, environmentArtifactDigest: value.environmentArtifactDigest, deterministicSeed: 'state-wrapper' });
  return createMissionSimulator(value ?? {});
}

function safeCreateSampler(environmentArtifact, options) {
  try {
    return index.createEnvironmentSampler(environmentArtifact, options);
  } catch {
    return null;
  }
}

 function validateMissionSimulator(simulatorOrState) {
  const simulator = ensureSimulator(simulatorOrState);
  const stateValidation = MissionSimulationContracts.validateMissionSimulationState(simulator.state);
  const errors = [...stateValidation.errors, ...(simulator.validation?.errors ?? [])];
  const warnings = [...stateValidation.warnings, ...(simulator.validation?.warnings ?? [])];
  if (simulator.type !== 'anchor.mission-simulator.kernel') errors.push('Mission simulator kernel type is invalid.');
  return { ...MissionSimulationUtil.validationReport(errors, warnings), summary: MissionSimulationContracts.missionSimulationStateSummary(simulator.state) };
}

 function missionSimulationResultDigest(simulatorOrState) {
  const simulator = ensureSimulator(simulatorOrState);
  return MissionSimulationUtil.stableDigest({ inputDigest: MissionSimulationContracts.missionSimulationInputDigest(simulator.input), stateDigest: MissionSimulationContracts.missionSimulationStateDigest(simulator.state), eventDigests: simulator.events.map((event) => event.digest), observationDigests: simulator.observations.map((observation) => observation.digest), rawMetrics: simulator.rawMetrics, terminal: simulator.terminal, terminalReason: simulator.terminalReason });
}
module.exports = {createMissionSimulator, resetMissionSimulator, stepMissionSimulator, advanceMissionSimulator, finishMissionSimulator, applyMissionSimulationDecision, syncMissionSimulatorState, missionSimulationSnapshot, restoreMissionSimulationSnapshot, missionSimulationEvents, missionSimulationObservations, missionSimulationRawMetrics, missionSimulationTerminalSummary, missionSimulatorDebugSummary, validateMissionSimulator, missionSimulationResultDigest}