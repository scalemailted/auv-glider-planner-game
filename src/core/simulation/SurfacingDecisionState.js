import { getWindowForTime } from '../time/MissionTime.js';

export const SURFACING_DECISION_STATE_VERSION = 'surface-decision-state-r1';

export const SURFACING_DECISION_STATUS = Object.freeze({
  PENDING: 'pending',
  CONTINUE_SELECTED: 'continueSelected',
  REPLAN_SELECTED: 'replanSelected',
  FINISH_SELECTED: 'finishSelected',
  RESOLVED: 'resolved',
  FAILED: 'failed'
});

export const SURFACING_DECISION_ACTION = Object.freeze({
  CONTINUE_ORIGINAL_PLAN: 'continueOriginalPlan',
  UPDATE_WAYPOINTS: 'updateWaypoints',
  EXPORT_OBSERVATIONS: 'exportObservations',
  IMPORT_WAYPOINTS: 'importWaypoints',
  FINISH_MISSION: 'finishMission'
});

const ACTION_ALIASES = new Map([
  ['continue', SURFACING_DECISION_ACTION.CONTINUE_ORIGINAL_PLAN],
  ['continueMission', SURFACING_DECISION_ACTION.CONTINUE_ORIGINAL_PLAN],
  ['continueOriginalPlan', SURFACING_DECISION_ACTION.CONTINUE_ORIGINAL_PLAN],
  ['update', SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS],
  ['replan', SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS],
  ['updateWaypoints', SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS],
  ['export', SURFACING_DECISION_ACTION.EXPORT_OBSERVATIONS],
  ['exportObservationData', SURFACING_DECISION_ACTION.EXPORT_OBSERVATIONS],
  ['exportObservations', SURFACING_DECISION_ACTION.EXPORT_OBSERVATIONS],
  ['import', SURFACING_DECISION_ACTION.IMPORT_WAYPOINTS],
  ['importWaypointData', SURFACING_DECISION_ACTION.IMPORT_WAYPOINTS],
  ['importWaypoints', SURFACING_DECISION_ACTION.IMPORT_WAYPOINTS],
  ['finish', SURFACING_DECISION_ACTION.FINISH_MISSION],
  ['finishMission', SURFACING_DECISION_ACTION.FINISH_MISSION]
]);

export function normalizeSurfacingDecisionAction(action) {
  const key = String(action ?? '').trim();
  return ACTION_ALIASES.get(key) ?? (Object.values(SURFACING_DECISION_ACTION).includes(key) ? key : null);
}

export function createSurfacingDecisionState({
  level = null,
  mission = null,
  plan = null,
  engine = null,
  decision = null,
  agentId = null,
  status = SURFACING_DECISION_STATUS.PENDING,
  activeDecisionIndex = 0,
  pendingDecisionCount = null,
  ui = {}
} = {}) {
  const agents = Array.isArray(decision?.agents) ? decision.agents : [];
  const first = agents.find((entry) => String(entry.agentId ?? '') === String(agentId ?? '')) ?? agents[0] ?? {};
  const resolvedAgentId = agentId ?? decision?.agentId ?? first.agentId ?? engine?.agents?.[0]?.id ?? mission?.agents?.[0]?.id ?? null;
  const engineAgent = (engine?.agents ?? []).find((candidate) => String(candidate.id ?? candidate.agentId) === String(resolvedAgentId)) ?? null;
  const missionAgent = (mission?.agents ?? []).find((candidate) => String(candidate.id ?? candidate.agentId) === String(resolvedAgentId)) ?? null;
  const agentPlan = (plan?.agentPlans ?? []).find((candidate) => String(candidate.agentId) === String(resolvedAgentId)) ?? null;
  const time = finiteNumber(decision?.t ?? decision?.time ?? engine?.t, 0);
  const actual = finitePoint(decision?.actual ?? first.actual ?? engineAgent);
  const expected = finitePoint(decision?.expected ?? first.expected);
  const waypointStatus = buildWaypointStatus({ agentPlan, engineAgent, events: engine?.events ?? [], agentId: resolvedAgentId });
  const base = {
    schemaVersion: 1,
    type: 'anchor.simulation.surfacing-decision-state',
    version: SURFACING_DECISION_STATE_VERSION,
    id: null,
    active: true,
    status,
    reason: decision?.reason ?? 'scheduledSurface',
    missionId: mission?.missionId ?? mission?.id ?? null,
    levelId: level?.levelId ?? level?.id ?? null,
    agentId: resolvedAgentId,
    agentLabel: missionAgent?.label ?? resolvedAgentId,
    activeDecisionIndex: Math.max(0, Math.trunc(finiteNumber(activeDecisionIndex, 0))),
    pendingDecisionCount: Math.max(1, Math.trunc(finiteNumber(pendingDecisionCount ?? agents.length ?? 1, 1))),
    time,
    window: safeWindow(level, time),
    expected,
    actual,
    expectedPosition: expected,
    actualPosition: actual,
    battery: finiteNumber(engineAgent?.battery ?? engineAgent?.batteryFraction, null),
    energyUsed: finiteNumber(engineAgent?.energyUsed, null),
    sampleScore: finiteNumber(engineAgent?.sampleScore, null),
    completedWaypoints: waypointStatus.completed,
    pendingWaypoints: waypointStatus.pending,
    missedWaypoints: waypointStatus.missed,
    completedWaypointCount: waypointStatus.completed.length,
    pendingWaypointCount: waypointStatus.pending.length,
    missedWaypointCount: waypointStatus.missed.length,
    currentWaypointIndex: waypointStatus.currentWaypointIndex,
    allSurfacedAgents: agents.map((entry) => ({
      agentId: entry.agentId ?? null,
      expected: finitePoint(entry.expected),
      actual: finitePoint(entry.actual),
      driftCells: driftCells(entry.expected, entry.actual)
    })),
    actions: {
      continueMission: decision?.actions?.continueMission !== false,
      updateWaypoints: decision?.actions?.updateWaypoints !== false,
      exportObservationData: decision?.actions?.exportObservationData !== false,
      importWaypointData: decision?.actions?.importWaypointData !== false,
      finishMission: decision?.actions?.finishMission !== false
    },
    ui: {
      modalVisible: Boolean(ui.modalVisible),
      fallbackVisible: Boolean(ui.fallbackVisible),
      uiMounted: Boolean(ui.modalVisible || ui.fallbackVisible),
      modalKind: ui.modalKind ?? null
    },
    planDigest: digestSurfacingPublicState(compactPlan(plan)),
    remainingPlanDigest: digestSurfacingPublicState({ agentId: resolvedAgentId, waypoints: waypointStatus.pending }),
    boundaryFlags: {
      playerMustChooseRoute: true,
      createsNewPlanner: false,
      changesOfficialScoring: false,
      resetsSimulationClock: false,
      preservesSimulationResume: true,
      rendererOwnsSimulationState: false,
      canonicalEngineOwnsSurfacing: true
    }
  };
  base.id = decision?.id ?? `surfacing-${digestSurfacingPublicState({
    missionId: base.missionId,
    levelId: base.levelId,
    agentId: base.agentId,
    time: base.time,
    actual: base.actual,
    expected: base.expected,
    reason: base.reason
  })}`;
  return base;
}

export function normalizeSurfacingDecisionState(value = {}) {
  if (!value || typeof value !== 'object') return null;
  if (value.type === 'anchor.simulation.surfacing-decision-state') {
    return {
      ...cloneJson(value),
      version: value.version ?? SURFACING_DECISION_STATE_VERSION,
      schemaVersion: value.schemaVersion ?? 1,
      active: value.active !== false,
      status: Object.values(SURFACING_DECISION_STATUS).includes(value.status) ? value.status : SURFACING_DECISION_STATUS.PENDING,
      ui: {
        modalVisible: Boolean(value.ui?.modalVisible ?? value.modalVisible),
        fallbackVisible: Boolean(value.ui?.fallbackVisible ?? value.fallbackVisible),
        uiMounted: Boolean(value.ui?.uiMounted ?? value.uiMounted ?? value.modalVisible ?? value.fallbackVisible),
        modalKind: value.ui?.modalKind ?? value.modalKind ?? null
      }
    };
  }
  return createSurfacingDecisionState({ decision: value });
}

export function validateSurfacingDecisionState(state = {}) {
  const errors = [];
  const warnings = [];
  if (state?.type !== 'anchor.simulation.surfacing-decision-state') errors.push('Surfacing decision state type must be anchor.simulation.surfacing-decision-state.');
  if ((state?.version ?? SURFACING_DECISION_STATE_VERSION) !== SURFACING_DECISION_STATE_VERSION) errors.push(`Surfacing decision state version must be ${SURFACING_DECISION_STATE_VERSION}.`);
  if (!state?.id) errors.push('Surfacing decision state requires an id.');
  if (!state?.agentId) errors.push('Surfacing decision state requires an agentId.');
  if (!Number.isFinite(Number(state?.time))) errors.push('Surfacing decision state requires a finite time.');
  if (!isFinitePoint(state?.actualPosition ?? state?.actual)) errors.push('Surfacing decision state requires a finite actual surface position.');
  if (state?.boundaryFlags?.createsNewPlanner !== false) errors.push('Surfacing decision state must not create a planner.');
  if (state?.boundaryFlags?.changesOfficialScoring !== false) errors.push('Surfacing decision state must not change official scoring.');
  if ((state?.pendingWaypointCount ?? 0) < 0) warnings.push('Pending waypoint count should not be negative.');
  return { ok: errors.length === 0, valid: errors.length === 0, errors, warnings, summary: surfacingDecisionStateSummary(state) };
}

export function surfacingDecisionStateSummary(state = {}) {
  return {
    type: state?.type ?? 'anchor.simulation.surfacing-decision-state',
    version: state?.version ?? SURFACING_DECISION_STATE_VERSION,
    id: state?.id ?? null,
    status: state?.status ?? null,
    agentId: state?.agentId ?? null,
    time: finiteNumber(state?.time, null),
    window: state?.window ?? null,
    actualPosition: finitePoint(state?.actualPosition ?? state?.actual),
    expectedPosition: finitePoint(state?.expectedPosition ?? state?.expected),
    completedWaypointCount: Number(state?.completedWaypointCount ?? state?.completedWaypoints?.length ?? 0),
    pendingWaypointCount: Number(state?.pendingWaypointCount ?? state?.pendingWaypoints?.length ?? 0),
    missedWaypointCount: Number(state?.missedWaypointCount ?? state?.missedWaypoints?.length ?? 0),
    modalVisible: Boolean(state?.ui?.modalVisible ?? state?.modalVisible),
    fallbackVisible: Boolean(state?.ui?.fallbackVisible ?? state?.fallbackVisible),
    uiMounted: Boolean(state?.ui?.uiMounted ?? state?.uiMounted),
    actionCount: Object.values(state?.actions ?? {}).filter(Boolean).length,
    boundaryFlags: cloneJson(state?.boundaryFlags ?? null)
  };
}

export function summarizeSurfaceDecisionEvents(events = []) {
  const list = Array.isArray(events) ? events : [];
  const decisions = list.filter((event) => event?.type === 'surfaceDecision');
  const required = list.filter((event) => event?.type === 'surfaceDecisionRequired');
  const replanCommits = list.filter((event) => event?.type === 'anchor.simulation.surfacing-replan-committed');
  return {
    type: 'anchor.simulation.surfacing-decision-summary',
    version: SURFACING_DECISION_STATE_VERSION,
    requiredCount: required.length,
    decisionCount: decisions.length,
    replanCommitCount: replanCommits.length,
    continueCount: decisions.filter((event) => event.action === 'continue').length,
    updateWaypointCount: decisions.filter((event) => event.action === 'updateWaypoints').length,
    finishMissionCount: decisions.filter((event) => event.action === 'finishMission').length,
    lastDecision: cloneJson(decisions.at?.(-1) ?? decisions[decisions.length - 1] ?? null),
    boundaryFlags: {
      createsNewPlanner: false,
      changesOfficialScoring: false,
      rendererOwnsSimulationState: false
    }
  };
}

export function digestSurfacingPublicState(value) {
  return `fnv1a32-${hashString(stableStringify(value)).toString(16).padStart(8, '0')}`;
}

function buildWaypointStatus({ agentPlan = null, engineAgent = null, events = [], agentId = null } = {}) {
  const waypoints = Array.isArray(agentPlan?.waypoints) ? agentPlan.waypoints : [];
  const currentWaypointIndex = Math.max(0, Math.trunc(finiteNumber(engineAgent?.currentWaypointIndex, 0)));
  const completedIndexes = new Set((engineAgent?.completedWaypoints ?? []).map((entry) => Math.trunc(finiteNumber(entry?.waypointIndex ?? entry?.index, -1))).filter((index) => index >= 0));
  const missedIndexes = new Set([
    ...(engineAgent?.missedWaypoints ?? []).map((entry) => Math.trunc(finiteNumber(entry?.waypointIndex ?? entry?.index, -1))),
    ...events
      .filter((event) => event?.type === 'missedWaypoint' && (!agentId || String(event.agentId) === String(agentId)))
      .map((event) => Math.trunc(finiteNumber(event.waypointIndex ?? event.index, -1)))
  ].filter((index) => index >= 0));
  return {
    currentWaypointIndex,
    completed: describeWaypoints(waypoints, (_waypoint, index) => completedIndexes.has(index) || index < currentWaypointIndex),
    pending: describeWaypoints(waypoints, (_waypoint, index) => index >= currentWaypointIndex && !missedIndexes.has(index)),
    missed: describeWaypoints(waypoints, (_waypoint, index) => missedIndexes.has(index))
  };
}

function describeWaypoints(waypoints = [], predicate = () => false) {
  return waypoints
    .map((waypoint, index) => ({
      index,
      waypointId: waypoint.id ?? waypoint.waypointId ?? `wp-${index + 1}`,
      x: finiteNumber(waypoint.x, null),
      y: finiteNumber(waypoint.y, null),
      t: finiteNumber(waypoint.t ?? waypoint.plannedTime ?? waypoint.estimatedArrivalTime, null),
      kind: waypoint.kind ?? waypoint.type ?? null,
      label: waypoint.label ?? waypoint.id ?? `WP ${index + 1}`
    }))
    .filter((waypoint, index) => predicate(waypoints[index], index));
}

function compactPlan(plan = {}) {
  return {
    type: plan?.type ?? null,
    coordinateProfileId: plan?.coordinateProfileId ?? null,
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

function safeWindow(level, time) {
  try {
    return getWindowForTime(level, time);
  } catch (_error) {
    return null;
  }
}

function driftCells(expected, actual) {
  const a = finitePoint(actual);
  const e = finitePoint(expected);
  if (!a || !e) return null;
  return Number(Math.hypot(a.x - e.x, a.y - e.y).toFixed(6));
}

function finitePoint(point) {
  if (!point) return null;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const result = { x: Number(x.toFixed(6)), y: Number(y.toFixed(6)) };
  const t = Number(point.t ?? point.time ?? point.timeSeconds);
  if (Number.isFinite(t)) result.t = Number(t.toFixed(6));
  return result;
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  return JSON.parse(JSON.stringify(value));
}