import {
  SURFACING_DECISION_ACTION,
  SURFACING_DECISION_STATUS,
  createSurfacingDecisionState,
  normalizeSurfacingDecisionState,
  surfacingDecisionStateSummary,
  digestSurfacingPublicState
} from '../simulation/SurfacingDecisionState.js';

export const SURFACING_REPLAN_HANDOFF_VERSION = 'surface-replan-handoff-r1';

export function createSurfacingReplanHandoff({
  level = null,
  mission = null,
  plan = null,
  engine = null,
  decisionState = null,
  decision = null,
  transaction = null,
  resumeState = null,
  surfacedAgentId = null
} = {}) {
  const normalizedDecision = normalizeSurfacingDecisionState(decisionState)
    ?? createSurfacingDecisionState({ level, mission, plan, engine, decision, agentId: surfacedAgentId });
  const resolvedAgentId = surfacedAgentId ?? normalizedDecision?.agentId ?? null;
  const surfacedAgent = (engine?.agents ?? resumeState?.agents ?? []).find((agent) => String(agent.id ?? agent.agentId) === String(resolvedAgentId)) ?? null;
  const surfacedPosition = normalizedDecision?.actualPosition ?? normalizedDecision?.actual ?? pointFromAgent(surfacedAgent);
  const sourcePlan = cloneJson(plan ?? {});
  const sourceMission = cloneJson(mission ?? {});
  const sourceLevel = cloneJson(level ?? {});
  const time = Number(normalizedDecision?.time ?? resumeState?.t ?? engine?.t ?? 0);
  return {
    schemaVersion: 1,
    type: 'anchor.planning.surfacing-replan-handoff',
    version: SURFACING_REPLAN_HANDOFF_VERSION,
    handoffId: `surface-replan-${digestSurfacingPublicState({ decisionId: normalizedDecision?.id, agentId: resolvedAgentId, time, surfacedPosition })}`,
    decisionId: normalizedDecision?.id ?? null,
    transactionId: transaction?.transactionId ?? null,
    missionId: normalizedDecision?.missionId ?? mission?.missionId ?? mission?.id ?? null,
    levelId: normalizedDecision?.levelId ?? level?.levelId ?? level?.id ?? null,
    surfacedAgentId: resolvedAgentId,
    simulationTime: Number.isFinite(time) ? time : 0,
    surfacedPosition,
    agentState: compactAgent(surfacedAgent),
    decisionSummary: surfacingDecisionStateSummary(normalizedDecision),
    sourcePlan,
    sourcePlanDigest: digestSurfacingPublicState(compactPlan(sourcePlan)),
    sourceMissionDigest: digestSurfacingPublicState(compactMission(sourceMission)),
    sourceLevelDigest: digestSurfacingPublicState(compactLevel(sourceLevel)),
    resumeState: cloneJson(resumeState ?? engine?.createResumeState?.() ?? null),
    completedWaypoints: cloneJson(normalizedDecision?.completedWaypoints ?? []),
    retainedWaypoints: cloneJson(normalizedDecision?.pendingWaypoints ?? []),
    missedWaypoints: cloneJson(normalizedDecision?.missedWaypoints ?? []),
    status: 'editingFutureWaypoints',
    selectedAction: SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS,
    surfaceDecisionStatus: SURFACING_DECISION_STATUS.REPLAN_SELECTED,
    returnContext: {
      fromScene: 'SimulationScene',
      planningScene: 'MissionWorkspaceScene',
      commitReturnsTo: 'SimulationScene',
      cancelReturnsTo: 'SimulationScene',
      cancelReopensSurfaceDecision: true
    },
    boundaryFlags: {
      startsNewMission: false,
      resetsSimulationClock: false,
      redeploysAgent: false,
      usesNewPlanner: false,
      changesOfficialBrowserScoring: false,
      rendererOwnsSimulationState: false,
      playerOwnsWaypointEdits: true
    }
  };
}

export function normalizeSurfacingReplanHandoff(value = {}) {
  if (!value || typeof value !== 'object') return null;
  return {
    ...cloneJson(value),
    schemaVersion: value.schemaVersion ?? 1,
    version: value.version ?? SURFACING_REPLAN_HANDOFF_VERSION,
    status: value.status ?? 'editingFutureWaypoints',
    boundaryFlags: {
      startsNewMission: false,
      resetsSimulationClock: false,
      redeploysAgent: false,
      usesNewPlanner: false,
      changesOfficialBrowserScoring: false,
      rendererOwnsSimulationState: false,
      playerOwnsWaypointEdits: true,
      ...(value.boundaryFlags ?? {})
    }
  };
}

export function commitSurfacingReplanResumeState(resumeState = {}, {
  decisionState = null,
  transaction = null,
  updatePenalty = null,
  action = SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS
} = {}) {
  const next = cloneJson(resumeState ?? {});
  next.events = Array.isArray(next.events) ? [...next.events] : [];
  const decision = normalizeSurfacingDecisionState(decisionState) ?? next.awaitingSurfaceDecision ?? next.surfaceDecision ?? null;
  const time = Number(next.t ?? decision?.time ?? decision?.t ?? 0);
  const agents = Array.isArray(next.agents) ? next.agents : [];
  const decisionAgents = (next.awaitingSurfaceDecision?.agents ?? decision?.agents ?? [])
    .map((agent) => agent.agentId ?? agent.id ?? agent.agentId)
    .filter(Boolean);
  const affectedAgentIds = agents.map((agent) => agent.id ?? agent.agentId).filter(Boolean);
  next.events.push({
    type: 'surfaceDecision',
    t: time,
    action: normalizeSurfaceDecisionEngineAction(action),
    agents: decisionAgents.length ? decisionAgents : affectedAgentIds,
    surfacingDecisionId: decision?.id ?? transaction?.decisionId ?? null,
    transactionId: transaction?.transactionId ?? null
  });
  for (const agentId of affectedAgentIds) {
    next.events.push({
      type: 'replanned',
      t: time,
      agentId,
      penalty: Number.isFinite(Number(updatePenalty)) ? Number(updatePenalty) : decision?.updatePenalty ?? null,
      surfacingDecisionId: decision?.id ?? transaction?.decisionId ?? null,
      transactionId: transaction?.transactionId ?? null
    });
  }
  next.events.push({
    type: 'anchor.simulation.surfacing-replan-committed',
    t: time,
    action: SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS,
    surfacingDecisionId: decision?.id ?? transaction?.decisionId ?? null,
    transactionId: transaction?.transactionId ?? null,
    affectedAgentIds,
    changesOfficialScoring: false
  });
  next.surfaceDecision = null;
  next.awaitingSurfaceDecision = null;
  next.routeFailureDecision = next.routeFailureDecision ?? null;
  next.surfacingDecisionResolution = {
    type: 'anchor.simulation.surfacing-decision-resolution',
    version: SURFACING_REPLAN_HANDOFF_VERSION,
    decisionId: decision?.id ?? transaction?.decisionId ?? null,
    transactionId: transaction?.transactionId ?? null,
    action: SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS,
    time,
    committed: true,
    boundaryFlags: {
      resetsSimulationClock: false,
      changesOfficialBrowserScoring: false,
      usesNewPlanner: false
    }
  };
  return next;
}

export function validateSurfacingReplanHandoff(handoff = {}) {
  const errors = [];
  const warnings = [];
  if (handoff?.type !== 'anchor.planning.surfacing-replan-handoff') errors.push('Surfacing replan handoff type must be anchor.planning.surfacing-replan-handoff.');
  if ((handoff?.version ?? SURFACING_REPLAN_HANDOFF_VERSION) !== SURFACING_REPLAN_HANDOFF_VERSION) errors.push(`Surfacing replan handoff version must be ${SURFACING_REPLAN_HANDOFF_VERSION}.`);
  if (!handoff?.handoffId) errors.push('Surfacing replan handoff requires a handoffId.');
  if (!handoff?.decisionId) errors.push('Surfacing replan handoff requires a decisionId.');
  if (!handoff?.surfacedAgentId) errors.push('Surfacing replan handoff requires a surfacedAgentId.');
  if (!isFinitePoint(handoff?.surfacedPosition)) errors.push('Surfacing replan handoff requires a finite surfacedPosition.');
  if (!handoff?.resumeState?.awaitingSurfaceDecision) warnings.push('Handoff should keep the original awaitingSurfaceDecision until commit.');
  const flags = handoff?.boundaryFlags ?? {};
  if (flags.usesNewPlanner !== false) errors.push('Surfacing replan handoff must not create/use a new planner.');
  if (flags.changesOfficialBrowserScoring !== false) errors.push('Surfacing replan handoff must not change official browser scoring.');
  if (flags.resetsSimulationClock !== false) errors.push('Surfacing replan handoff must not reset simulation time.');
  return { ok: errors.length === 0, valid: errors.length === 0, errors, warnings, summary: surfacingReplanHandoffSummary(handoff) };
}

export function surfacingReplanHandoffSummary(handoff = {}) {
  return {
    type: handoff?.type ?? 'anchor.planning.surfacing-replan-handoff',
    version: handoff?.version ?? SURFACING_REPLAN_HANDOFF_VERSION,
    handoffId: handoff?.handoffId ?? null,
    decisionId: handoff?.decisionId ?? null,
    transactionId: handoff?.transactionId ?? null,
    surfacedAgentId: handoff?.surfacedAgentId ?? null,
    simulationTime: Number.isFinite(Number(handoff?.simulationTime)) ? Number(handoff.simulationTime) : null,
    surfacedPosition: clonePoint(handoff?.surfacedPosition),
    completedWaypointCount: handoff?.completedWaypoints?.length ?? 0,
    retainedWaypointCount: handoff?.retainedWaypoints?.length ?? 0,
    missedWaypointCount: handoff?.missedWaypoints?.length ?? 0,
    sourcePlanDigest: handoff?.sourcePlanDigest ?? null,
    hasResumeState: Boolean(handoff?.resumeState),
    keepsPendingDecision: Boolean(handoff?.resumeState?.awaitingSurfaceDecision),
    boundaryFlags: cloneJson(handoff?.boundaryFlags ?? null)
  };
}

function normalizeSurfaceDecisionEngineAction(action) {
  return action === SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS ? 'updateWaypoints' : action;
}

function compactAgent(agent = {}) {
  if (!agent) return null;
  return {
    id: agent.id ?? agent.agentId ?? null,
    x: finiteNumber(agent.x, null),
    y: finiteNumber(agent.y, null),
    heading: finiteNumber(agent.heading ?? agent.headingRadians, null),
    battery: finiteNumber(agent.battery, null),
    status: agent.status ?? null,
    commsState: agent.commsState ?? null,
    currentWaypointIndex: Number.isFinite(Number(agent.currentWaypointIndex)) ? Number(agent.currentWaypointIndex) : null
  };
}

function pointFromAgent(agent = {}) {
  if (!agent) return null;
  return clonePoint({ x: agent.x, y: agent.y, t: agent.t ?? agent.time });
}

function clonePoint(point = {}) {
  if (!isFinitePoint(point)) return null;
  const result = { x: Number(point.x), y: Number(point.y) };
  if (Number.isFinite(Number(point.t))) result.t = Number(point.t);
  return result;
}

function compactPlan(plan = {}) {
  return {
    type: plan?.type ?? null,
    agentPlans: (plan?.agentPlans ?? []).map((agentPlan) => ({
      agentId: agentPlan.agentId ?? null,
      waypointCount: agentPlan.waypoints?.length ?? 0,
      waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({
        id: waypoint.id ?? waypoint.waypointId ?? null,
        x: finiteNumber(waypoint.x, null),
        y: finiteNumber(waypoint.y, null),
        t: finiteNumber(waypoint.t ?? waypoint.plannedTime ?? waypoint.estimatedArrivalTime, null),
        kind: waypoint.kind ?? waypoint.type ?? null
      }))
    }))
  };
}

function compactMission(mission = {}) {
  return {
    missionId: mission?.missionId ?? mission?.id ?? null,
    agentCount: mission?.agents?.length ?? 0,
    rules: {
      communication: mission?.rules?.communication ?? null,
      updatePenalty: mission?.rules?.updatePenalty ?? null
    }
  };
}

function compactLevel(level = {}) {
  return {
    levelId: level?.levelId ?? level?.id ?? null,
    grid: level?.world?.grid ?? null,
    time: level?.world?.time ?? null
  };
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  return JSON.parse(JSON.stringify(value));
}