const index = require('../../environment/src/index.js')
const MissionSimulationUtil = require('./MissionSimulationUtil.js')
const MISSION_SIMULATION_MANIFEST_VERSION = 'mission-simulation-manifest-sim-pkg-r1';
 const MISSION_SIMULATION_INPUT_VERSION = 'mission-simulation-input-sim-pkg-r1';
 const MISSION_SIMULATION_STATE_VERSION = 'mission-simulation-state-sim-pkg-r1';
 const MISSION_SIMULATION_EVENT_VERSION = 'mission-simulation-event-sim-pkg-r1';
 const MISSION_SIMULATION_OBSERVATION_VERSION = 'mission-simulation-observation-sim-pkg-r1';
 const MISSION_SIMULATION_SNAPSHOT_VERSION = 'mission-simulation-snapshot-sim-pkg-r1';

 const MISSION_SIMULATION_CLAIM_BOUNDARY = Object.freeze({
  syntheticMissionSimulation: true,
  operationalVehicleCertification: false,
  certifiedNavigationSystem: false,
  calibratedVehicleTwin: false
});

 function createMissionSimulationManifest(options = {}) {
  return normalizeMissionSimulationManifest(options);
}

 function normalizeMissionSimulationManifest(value = {}) {
  const seed = String(value.seed ?? value.deterministicSeed ?? 'mission-sim-seed');
  const environmentArtifact = value.environmentArtifact ?? null;
  const environmentArtifactDigestValue = value.environmentArtifactDigest ?? safeEnvironmentArtifactDigest(environmentArtifact) ?? value.environmentDigest ?? null;
  const environmentSummary = value.environmentSummary ?? safeEnvironmentArtifactSummary(environmentArtifact);
  const planDigest = value.planDigest ?? MissionSimulationUtil.stableDigest(planDigestPayload(value.plan ?? {}));
  const agentConfigurations = MissionSimulationUtil.normalizeArray(value.agentConfigurations ?? value.agents).map(normalizeAgentConfiguration);
  const manifest = {
    type: 'anchor.mission-simulator.manifest',
    version: MISSION_SIMULATION_MANIFEST_VERSION,
    id: MissionSimulationUtil.stringOrNull(value.id ?? value.manifestId) ?? 'mission-simulation-manifest',
    seed,
    engineId: value.engineId ?? 'anchorMissionSimulator',
    engineVersion: value.engineVersion ?? 'sim-pkg-r1',
    backendId: value.backendId ?? 'javascriptCpuV1',
    timeStepSeconds: Math.max(0.001, MissionSimulationUtil.finiteNumber(value.timeStepSeconds ?? value.dtSeconds, 1)),
    missionDurationSeconds: Math.max(0, MissionSimulationUtil.finiteNumber(value.missionDurationSeconds ?? value.durationSeconds, 0)),
    environmentManifestDigest: value.environmentManifestDigest ?? environmentSummary?.manifestDigest ?? null,
    environmentArtifactDigest: environmentArtifactDigestValue,
    planDigest,
    vehicleConfigurationDigest: value.vehicleConfigurationDigest ?? MissionSimulationUtil.stableDigest(agentConfigurations),
    agentConfigurations,
    missionRules: MissionSimulationUtil.clonePlain(value.missionRules ?? value.rules ?? {}),
    terminalRules: MissionSimulationUtil.clonePlain(value.terminalRules ?? value.endCondition ?? {}),
    observationModel: MissionSimulationUtil.clonePlain(value.observationModel ?? {}),
    noiseModel: MissionSimulationUtil.clonePlain(value.noiseModel ?? {}),
    sourceMetadata: MissionSimulationUtil.clonePlain(value.sourceMetadata ?? {}),
    provenance: MissionSimulationUtil.clonePlain(value.provenance ?? {}),
    claimBoundary: { ...MISSION_SIMULATION_CLAIM_BOUNDARY, ...(value.claimBoundary ?? {}) }
  };
  return { ...manifest, manifestDigest: value.manifestDigest ?? missionSimulationManifestDigest(manifest) };
}

 function validateMissionSimulationManifest(value = {}) {
  const manifest = normalizeMissionSimulationManifest(value);
  const errors = [];
  const warnings = [];
  if (manifest.type !== 'anchor.mission-simulator.manifest') errors.push('MissionSimulationManifest type is invalid.');
  if (!manifest.seed) errors.push('MissionSimulationManifest requires seed.');
  if (!manifest.environmentArtifactDigest) warnings.push('MissionSimulationManifest has no environmentArtifactDigest.');
  if (!manifest.planDigest) errors.push('MissionSimulationManifest requires planDigest.');
  if (!manifest.agentConfigurations.length) warnings.push('MissionSimulationManifest has no agent configurations.');
  if (manifest.claimBoundary.operationalVehicleCertification !== false) errors.push('Mission simulator must not claim operational vehicle certification.');
  if (manifest.claimBoundary.certifiedNavigationSystem !== false) errors.push('Mission simulator must not claim certified navigation.');
  if (manifest.claimBoundary.calibratedVehicleTwin !== false) errors.push('Mission simulator must not claim calibrated vehicle twin behavior.');
  return { ...MissionSimulationUtil.validationReport(errors, warnings), manifest };
}

 function missionSimulationManifestDigest(value = {}) {
  const manifest = { ...value };
  delete manifest.manifestDigest;
  return MissionSimulationUtil.stableDigest(manifest);
}

 function createMissionSimulationInput(options = {}) {
  return normalizeMissionSimulationInput(options);
}

 function normalizeMissionSimulationInput(value = {}) {
  const environmentArtifact = value.environmentArtifact ?? value.level?.environmentArtifact ?? null;
  const environmentArtifactDigestValue = value.environmentArtifactDigest ?? value.level?.environmentArtifactDigest ?? safeEnvironmentArtifactDigest(environmentArtifact) ?? null;
  const plan = MissionSimulationUtil.clonePlain(value.plan ?? {});
  const agentConfigurations = MissionSimulationUtil.normalizeArray(value.agentConfigurations ?? value.agents ?? value.mission?.agents).map(normalizeAgentConfiguration);
  const manifest = normalizeMissionSimulationManifest({
    ...value,
    environmentArtifact,
    environmentArtifactDigest: environmentArtifactDigestValue,
    plan,
    agentConfigurations,
    missionRules: value.missionRules ?? value.mission?.rules ?? {},
    terminalRules: value.terminalRules ?? value.mission?.rules?.endCondition ?? {},
    seed: value.deterministicSeed ?? value.seed ?? value.mission?.rules?.stochasticSeed ?? value.level?.meta?.seed
  });
  const input = {
    type: 'anchor.mission-simulator.input',
    version: MISSION_SIMULATION_INPUT_VERSION,
    manifest,
    environmentArtifact,
    environmentArtifactDigest: environmentArtifactDigestValue,
    plan,
    planDigest: value.planDigest ?? manifest.planDigest,
    agentConfigurations,
    selectedStarts: MissionSimulationUtil.clonePlain(value.selectedStarts ?? {}),
    segmentFlightPlans: MissionSimulationUtil.clonePlain(value.segmentFlightPlans ?? value.plan?.segmentFlightPlans ?? []),
    missionDurationSeconds: manifest.missionDurationSeconds,
    deterministicSeed: manifest.seed,
    launchMetadata: MissionSimulationUtil.clonePlain(value.launchMetadata ?? {})
  };
  return { ...input, inputDigest: value.inputDigest ?? missionSimulationInputDigest(input) };
}

 function validateMissionSimulationInput(value = {}) {
  const input = normalizeMissionSimulationInput(value);
  const errors = [];
  const warnings = [];
  const manifestValidation = validateMissionSimulationManifest(input.manifest);
  errors.push(...manifestValidation.errors);
  warnings.push(...manifestValidation.warnings);
  if (input.environmentArtifact && input.environmentArtifactDigest && safeEnvironmentArtifactDigest(input.environmentArtifact) !== input.environmentArtifactDigest) errors.push('MissionSimulationInput environmentArtifactDigest does not match the artifact.');
  if (!input.planDigest) errors.push('MissionSimulationInput requires planDigest.');
  if (!input.inputDigest) errors.push('MissionSimulationInput requires inputDigest.');
  return { ...MissionSimulationUtil.validationReport(errors, warnings), input };
}

 function missionSimulationInputDigest(value = {}) {
  return MissionSimulationUtil.stableDigest(inputDigestPayload(value));
}

 function createMissionSimulationState(inputOrOptions = {}) {
  const input = inputOrOptions?.type === 'anchor.mission-simulator.input' ? inputOrOptions : normalizeMissionSimulationInput(inputOrOptions);
  const agents = input.agentConfigurations.map((agent, index) => createInitialAgentState(agent, input.selectedStarts?.[agent.id] ?? null, index));
  const state = {
    type: 'anchor.mission-simulator.state',
    version: MISSION_SIMULATION_STATE_VERSION,
    inputDigest: input.inputDigest,
    manifestDigest: input.manifest.manifestDigest,
    environmentArtifactDigest: input.environmentArtifactDigest,
    planDigest: input.planDigest,
    timeSeconds: 0,
    stepCount: 0,
    agents,
    pendingDecision: null,
    terminal: false,
    terminalReason: null,
    rawMetrics: createMissionSimulationRawMetrics({ agents, events: [], observations: [] })
  };
  return { ...state, stateDigest: missionSimulationStateDigest(state) };
}

 function normalizeMissionSimulationState(value = {}) {
  const state = {
    type: 'anchor.mission-simulator.state',
    version: MISSION_SIMULATION_STATE_VERSION,
    inputDigest: value.inputDigest ?? null,
    manifestDigest: value.manifestDigest ?? null,
    environmentArtifactDigest: value.environmentArtifactDigest ?? null,
    planDigest: value.planDigest ?? null,
    timeSeconds: MissionSimulationUtil.round(value.timeSeconds ?? value.t ?? 0),
    stepCount: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(value.stepCount, 0))),
    agents: MissionSimulationUtil.normalizeArray(value.agents).map(normalizeAgentState),
    pendingDecision: MissionSimulationUtil.clonePlain(value.pendingDecision ?? null),
    terminal: value.terminal === true || value.complete === true,
    terminalReason: value.terminalReason ?? value.stopReason?.code ?? value.abortReason ?? null,
    rawMetrics: createMissionSimulationRawMetrics(value.rawMetrics ?? value)
  };
  return { ...state, stateDigest: missionSimulationStateDigest(state) };
}

 function validateMissionSimulationState(value = {}) {
  const state = normalizeMissionSimulationState(value);
  const errors = [];
  if (state.type !== 'anchor.mission-simulator.state') errors.push('MissionSimulationState type is invalid.');
  if (!Number.isFinite(Number(state.timeSeconds))) errors.push('MissionSimulationState timeSeconds must be finite.');
  for (const agent of state.agents) {
    if (!agent.id) errors.push('Agent state requires id.');
    if (!Number.isFinite(Number(agent.eastMeters)) || !Number.isFinite(Number(agent.northMeters))) errors.push(`Agent ${agent.id} position must be finite.`);
    if (Number(agent.depthMeters) < -1e-6) errors.push(`Agent ${agent.id} depth must be positive downward.`);
  }
  return { ...MissionSimulationUtil.validationReport(errors, []), state };
}

 function missionSimulationStateSummary(value = {}) {
  const state = normalizeMissionSimulationState(value);
  return {
    type: 'anchor.mission-simulator.state-summary',
    version: MISSION_SIMULATION_STATE_VERSION,
    stateDigest: state.stateDigest,
    timeSeconds: state.timeSeconds,
    stepCount: state.stepCount,
    agentCount: state.agents.length,
    activeAgentCount: state.agents.filter((agent) => agent.status !== 'idle' && agent.status !== 'complete').length,
    maximumDepthMeters: MissionSimulationUtil.round(Math.max(0, ...state.agents.map((agent) => Number(agent.depthMeters ?? 0)).filter(Number.isFinite))),
    terminal: state.terminal,
    terminalReason: state.terminalReason,
    pendingDecision: state.pendingDecision ? { type: state.pendingDecision.type ?? state.pendingDecision.reason ?? 'pendingDecision' } : null,
    rawMetricSummary: state.rawMetrics
  };
}

 function missionSimulationStateDigest(value = {}) {
  const state = { ...value };
  delete state.stateDigest;
  return MissionSimulationUtil.stableDigest({
    inputDigest: state.inputDigest ?? null,
    manifestDigest: state.manifestDigest ?? null,
    environmentArtifactDigest: state.environmentArtifactDigest ?? null,
    planDigest: state.planDigest ?? null,
    timeSeconds: MissionSimulationUtil.round(state.timeSeconds ?? 0),
    stepCount: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(state.stepCount, 0))),
    agents: MissionSimulationUtil.normalizeArray(state.agents).map(agentDigestPayload),
    pendingDecision: state.pendingDecision ? MissionSimulationUtil.stableDigest(state.pendingDecision) : null,
    terminal: state.terminal === true,
    terminalReason: state.terminalReason ?? null,
    rawMetrics: state.rawMetrics ?? null
  });
}

 function normalizeMissionSimulationEvent(event = {}, sequence = 0) {
  const normalized = {
    version: MISSION_SIMULATION_EVENT_VERSION,
    id: event.id ?? event.eventId ?? `sim-event-${sequence}`,
    type: event.type ?? 'event',
    timeSeconds: MissionSimulationUtil.round(event.timeSeconds ?? event.t ?? 0),
    sequence: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(event.sequence, sequence))),
    agentId: event.agentId ?? null,
    waypointId: event.waypointId ?? event.activeWaypointId ?? null,
    segmentId: event.segmentId ?? event.activeSegmentId ?? null,
    publicPayload: MissionSimulationUtil.clonePlain(event.publicPayload ?? publicEventPayload(event)),
    internalPayload: MissionSimulationUtil.clonePlain(event.internalPayload ?? null),
    visibility: event.visibility ?? 'publicScenario'
  };
  return { ...normalized, digest: event.digest ?? missionSimulationEventDigest(normalized) };
}

 function missionSimulationEventDigest(event = {}) {
  const payload = { ...event };
  delete payload.digest;
  return MissionSimulationUtil.stableDigest(payload);
}

 function normalizeMissionSimulationObservation(observation = {}, sequence = 0) {
  const normalized = {
    version: MISSION_SIMULATION_OBSERVATION_VERSION,
    id: observation.id ?? observation.observationId ?? observation.sampleId ?? `sim-observation-${sequence}`,
    type: observation.type ?? observation.observationType ?? 'sample',
    timeSeconds: MissionSimulationUtil.round(observation.timeSeconds ?? observation.t ?? 0),
    sequence: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(observation.sequence, sequence))),
    agentId: observation.agentId ?? observation.gliderId ?? null,
    eastMeters: MissionSimulationUtil.round(observation.eastMeters ?? observation.x ?? 0),
    northMeters: MissionSimulationUtil.round(observation.northMeters ?? observation.y ?? 0),
    depthMeters: MissionSimulationUtil.round(observation.depthMeters ?? 0),
    depthLayerId: observation.depthLayerId ?? observation.depthLayer ?? null,
    value: MissionSimulationUtil.finiteNumber(observation.value ?? observation.observedValue ?? observation.realizedValue, 0),
    publicPayload: MissionSimulationUtil.clonePlain(observation.publicPayload ?? publicEventPayload(observation)),
    visibility: observation.visibility ?? observation.visibilityTier ?? 'publicScenario'
  };
  return { ...normalized, digest: observation.digest ?? MissionSimulationUtil.stableDigest(normalized) };
}

 function createMissionSimulationRawMetrics(source = {}) {
  const agents = MissionSimulationUtil.normalizeArray(source.agents);
  const events = MissionSimulationUtil.normalizeArray(source.events);
  const observations = MissionSimulationUtil.normalizeArray(source.observations);
  const distance = agents.reduce((sum, agent) => sum + MissionSimulationUtil.finiteNumber(agent.distanceTraveled ?? MissionSimulationUtil.pathDistance(agent.history ?? []), 0), 0);
  return {
    type: 'anchor.mission-simulator.raw-metrics',
    version: MISSION_SIMULATION_STATE_VERSION,
    roiCollected: MissionSimulationUtil.round(source.roiCollected ?? source.sampleScore ?? agents.reduce((sum, agent) => sum + MissionSimulationUtil.finiteNumber(agent.sampleScore, 0), 0)),
    energyUsed: MissionSimulationUtil.round(source.energyUsed ?? agents.reduce((sum, agent) => sum + MissionSimulationUtil.finiteNumber(agent.energyUsed, 0), 0)),
    distanceTraveled: MissionSimulationUtil.round(source.distanceTraveled ?? distance),
    collisions: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(source.collisions ?? source.collisionCount, 0))),
    nearMisses: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(source.nearMisses ?? source.nearMissCount, 0))),
    hazards: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(source.hazards ?? source.hazardsHit ?? events.filter((event) => String(event.type).toLowerCase().includes('hazard')).length, 0))),
    duplicateSamples: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(source.duplicateSamples ?? source.samplingMetrics?.duplicateSamples, 0))),
    sampleCount: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(source.sampleCount ?? events.filter((event) => event.type === 'sample').length, observations.length))),
    observationCount: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(source.observationCount, observations.length))),
    eventCount: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(source.eventCount, events.length))),
    returnSuccess: Boolean(source.returnSuccess ?? source.endCondition?.success ?? false),
    completed: Boolean(source.completed ?? source.complete ?? source.terminal ?? false),
    steps: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(source.steps ?? source.stepCount, 0))),
    simTime: MissionSimulationUtil.round(source.simTime ?? source.timeSeconds ?? source.t ?? 0)
  };
}

 function normalizeAgentConfiguration(agent = {}, index = 0) {
  const start = agent.start ?? agent.deployment?.selectedStart ?? agent.deployment?.start ?? {};
  return MissionSimulationUtil.compactObject({
    id: String(agent.id ?? agent.agentId ?? `glider_${index + 1}`),
    label: agent.label ?? agent.name ?? null,
    start: { x: MissionSimulationUtil.finiteNumber(start.x ?? agent.x, 0), y: MissionSimulationUtil.finiteNumber(start.y ?? agent.y, 0), depthMeters: Math.max(0, MissionSimulationUtil.finiteNumber(start.depthMeters ?? start.depth ?? agent.depthMeters, 0)) },
    maxSpeed: MissionSimulationUtil.finiteNumber(agent.maxSpeed ?? agent.speed, 1),
    battery: MissionSimulationUtil.finiteNumber(agent.battery ?? agent.energyRemaining, 100),
    maxDepthMeters: agent.maxDepthMeters ?? agent.maximumDepthMeters ?? null,
    diveProfileId: agent.diveProfileId ?? agent.defaultDiveProfileId ?? null,
    targetDepthLayerId: agent.targetDepthLayerId ?? null,
    metadata: MissionSimulationUtil.clonePlain(agent.metadata ?? agent.meta ?? {})
  });
}

 function normalizeAgentState(agent = {}, index = 0) {
  const id = String(agent.id ?? agent.agentId ?? `glider_${index + 1}`);
  const history = MissionSimulationUtil.normalizeArray(agent.history).map((point) => ({ x: MissionSimulationUtil.round(point.x ?? point.eastMeters ?? 0), y: MissionSimulationUtil.round(point.y ?? point.northMeters ?? 0), depthMeters: MissionSimulationUtil.round(point.depthMeters ?? 0), timeSeconds: MissionSimulationUtil.round(point.timeSeconds ?? point.t ?? 0) }));
  return {
    id,
    status: agent.status ?? (agent.completedPlan ? 'complete' : 'idle'),
    eastMeters: MissionSimulationUtil.round(agent.eastMeters ?? agent.x ?? agent.position?.x ?? 0),
    northMeters: MissionSimulationUtil.round(agent.northMeters ?? agent.y ?? agent.position?.y ?? 0),
    depthMeters: MissionSimulationUtil.round(agent.depthMeters ?? agent.position?.depthMeters ?? 0),
    headingRadians: MissionSimulationUtil.round(agent.headingRadians ?? agent.heading ?? 0),
    groundCourseRadians: MissionSimulationUtil.round(agent.groundCourseRadians ?? agent.courseOverGroundRadians ?? agent.headingRadians ?? agent.heading ?? 0),
    pitchRadians: MissionSimulationUtil.round(agent.pitchRadians ?? 0),
    verticalVelocityMetersPerSecond: MissionSimulationUtil.round(agent.verticalVelocityMetersPerSecond ?? agent.velocity?.vertical ?? agent.groundRelativeVelocity?.vertical ?? 0),
    horizontalSpeedMetersPerSecond: MissionSimulationUtil.round(agent.horizontalSpeedMetersPerSecond ?? Math.hypot(Number(agent.velocity?.x ?? agent.groundRelativeVelocity?.x ?? 0), Number(agent.velocity?.y ?? agent.groundRelativeVelocity?.y ?? 0))),
    energyRemaining: MissionSimulationUtil.round(agent.energyRemaining ?? agent.battery ?? 0),
    energyUsed: MissionSimulationUtil.round(agent.energyUsed ?? 0),
    activeWaypointId: agent.activeWaypointId ?? agent.activeWaypoint?.id ?? null,
    activeSegmentId: agent.activeSegmentId ?? null,
    routeProgress: MissionSimulationUtil.round(agent.routeProgress ?? agent.segmentProgress ?? 0),
    diveState: agent.diveState ?? agent.divePhase ?? 'surfaced',
    cycleIndex: agent.cycleIndex ?? null,
    observationCount: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(agent.observationCount, 0))),
    sampleCount: Math.max(0, Math.MissionSimulationUtil.round(MissionSimulationUtil.finiteNumber(agent.sampleCount ?? agent.samplesCollected, 0))),
    surfaceState: agent.surfaceState ?? agent.commsState ?? null,
    communicationState: agent.communicationState ?? agent.commsState ?? null,
    failureState: agent.failureState ?? null,
    history,
    metadata: MissionSimulationUtil.clonePlain(agent.metadata ?? {})
  };
}

function createInitialAgentState(agent, selectedStart = null, index = 0) {
  const config = normalizeAgentConfiguration(agent, index);
  const start = selectedStart ?? config.start;
  return normalizeAgentState({ ...config, id: config.id, x: start.x, y: start.y, depthMeters: start.depthMeters, status: 'idle', battery: config.battery, history: [{ x: start.x, y: start.y, depthMeters: start.depthMeters, timeSeconds: 0 }] }, index);
}

function safeEnvironmentArtifactDigest(artifact) {
  if (!artifact) return null;
  try { return index.environmentArtifactDigest(artifact); } catch { return artifact.artifactDigest ?? artifact.digest ?? null; }
}

function safeEnvironmentArtifactSummary(artifact) {
  if (!artifact) return null;
  try { return index.environmentArtifactSummary(artifact); } catch { return null; }
}

function planDigestPayload(plan = {}) {
  return { agentPlans: plan.agentPlans ?? [], waypoints: plan.waypoints ?? [], coordinateProfileId: plan.coordinateProfileId ?? plan.meta?.coordinateProfileId ?? null, fieldSamplingProfileId: plan.fieldSamplingProfileId ?? plan.meta?.fieldSamplingProfileId ?? null };
}

function inputDigestPayload(input = {}) {
  return { version: MISSION_SIMULATION_INPUT_VERSION, manifestDigest: input.manifest?.manifestDigest ?? input.manifestDigest ?? null, environmentArtifactDigest: input.environmentArtifactDigest ?? null, planDigest: input.planDigest ?? null, agentConfigurations: input.agentConfigurations ?? [], selectedStarts: input.selectedStarts ?? {}, segmentFlightPlans: input.segmentFlightPlans ?? [], missionDurationSeconds: input.missionDurationSeconds ?? 0, deterministicSeed: input.deterministicSeed ?? null, launchMetadata: input.launchMetadata ?? {} };
}

function agentDigestPayload(agent = {}) {
  const normalized = normalizeAgentState(agent);
  return { id: normalized.id, status: normalized.status, eastMeters: normalized.eastMeters, northMeters: normalized.northMeters, depthMeters: normalized.depthMeters, energyRemaining: normalized.energyRemaining, energyUsed: normalized.energyUsed, activeWaypointId: normalized.activeWaypointId, activeSegmentId: normalized.activeSegmentId, routeProgress: normalized.routeProgress, diveState: normalized.diveState, sampleCount: normalized.sampleCount, observationCount: normalized.observationCount, failureState: normalized.failureState };
}

function publicEventPayload(event = {}) {
  const payload = MissionSimulationUtil.clonePlain(event);
  delete payload.internalPayload;
  delete payload.hiddenTruth;
  delete payload.truthField;
  delete payload.T_hiddenTruth;
  return payload;
}
module.exports = {MISSION_SIMULATION_INPUT_VERSION, MISSION_SIMULATION_STATE_VERSION, MISSION_SIMULATION_EVENT_VERSION, MISSION_SIMULATION_OBSERVATION_VERSION, MISSION_SIMULATION_SNAPSHOT_VERSION, MISSION_SIMULATION_CLAIM_BOUNDARY, createMissionSimulationManifest, normalizeMissionSimulationManifest, validateMissionSimulationManifest, missionSimulationManifestDigest, createMissionSimulationInput, normalizeMissionSimulationInput, validateMissionSimulationInput, missionSimulationInputDigest, createMissionSimulationState, normalizeMissionSimulationState, validateMissionSimulationState, missionSimulationStateSummary, missionSimulationStateDigest, normalizeMissionSimulationEvent, missionSimulationEventDigest, normalizeMissionSimulationObservation, createMissionSimulationRawMetrics, normalizeAgentConfiguration, normalizeAgentState}