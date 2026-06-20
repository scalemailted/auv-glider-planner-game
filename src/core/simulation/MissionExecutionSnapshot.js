import { getSelectedStart } from '../deployment/DeploymentZones.js';
import { normalizePlan } from '../planning/WaypointPlan.js';
import { validatePlanForExecution } from '../planning/PlanExecutionValidator.js';

export const MISSION_EXECUTION_SNAPSHOT_VERSION = 'three-r1-1d';

export function createMissionExecutionSnapshot({
  level,
  mission,
  plan,
  selectedAgentId = null,
  currentPlanSource = 'manual',
  challengeMode = null,
  experienceMode = null,
  missionOptions = null,
  stochastic = null,
  playback = null,
  simulationResume = null,
  routeAudit = null,
  terrainAwareValidationReport = null
} = {}) {
  const clonedLevel = cloneJson(level);
  const clonedMission = cloneJson(mission);
  const clonedPlan = normalizePlan(cloneJson(plan), clonedLevel, clonedMission);
  const validation = validatePlanForExecution({ level: clonedLevel, mission: clonedMission, plan: clonedPlan });
  const planDigest = digestExecutionPlan(clonedPlan);
  const planSummary = summarizeExecutionPlan({
    level: clonedLevel,
    mission: clonedMission,
    plan: clonedPlan,
    selectedAgentId,
    currentPlanSource,
    planDigest
  });
  return {
    type: 'anchor.simulation.execution-snapshot',
    version: MISSION_EXECUTION_SNAPSHOT_VERSION,
    level: clonedLevel,
    mission: clonedMission,
    plan: clonedPlan,
    selectedAgentId,
    currentPlanSource,
    challengeMode,
    experienceMode,
    missionOptions: cloneJson(missionOptions ?? null),
    stochastic: cloneJson(stochastic ?? null),
    playback: cloneJson(playback ?? null),
    simulationResume: cloneJson(simulationResume ?? null),
    routeAudit: cloneJson(routeAudit ?? null),
    terrainAwareValidationReport: cloneJson(terrainAwareValidationReport ?? null),
    terrainAwareValidationSummary: summarizeTerrainAwareValidation(terrainAwareValidationReport),
    validation,
    planDigest,
    planSummary
  };
}

export function createMissionLaunchPayload({ snapshot, transaction = null } = {}) {
  if (!snapshot?.plan) throw new Error('Mission launch payload requires an execution snapshot.');
  const planDigest = digestExecutionPlan(snapshot.plan);
  const planSummary = summarizeExecutionPlan({
    level: snapshot.level,
    mission: snapshot.mission,
    plan: snapshot.plan,
    selectedAgentId: snapshot.selectedAgentId,
    currentPlanSource: snapshot.currentPlanSource,
    planDigest
  });
  return {
    type: 'anchor.simulation.launch-payload',
    version: MISSION_EXECUTION_SNAPSHOT_VERSION,
    transactionId: transaction?.transactionId ?? null,
    transaction: cloneJson(transaction ?? null),
    level: cloneJson(snapshot.level),
    mission: cloneJson(snapshot.mission),
    plan: cloneJson(snapshot.plan),
    selectedAgentId: snapshot.selectedAgentId ?? null,
    currentPlanSource: snapshot.currentPlanSource ?? 'manual',
    challengeMode: snapshot.challengeMode ?? null,
    experienceMode: snapshot.experienceMode ?? null,
    missionOptions: cloneJson(snapshot.missionOptions ?? null),
    stochastic: cloneJson(snapshot.stochastic ?? null),
    playback: cloneJson(snapshot.playback ?? null),
    simulationResume: cloneJson(snapshot.simulationResume ?? null),
    routeAudit: cloneJson(snapshot.routeAudit ?? null),
    terrainAwareValidationReport: cloneJson(snapshot.terrainAwareValidationReport ?? null),
    terrainAwareValidationSummary: snapshot.terrainAwareValidationSummary ?? summarizeTerrainAwareValidation(snapshot.terrainAwareValidationReport),
    validationSummary: summarizeValidation(snapshot.validation),
    planDigest: snapshot.planDigest,
    planSummary: cloneJson(snapshot.planSummary)
  };
}

export function normalizeMissionLaunchPayload(payload = {}, fallbackState = {}) {
  if (payload?.type === 'anchor.simulation.launch-payload') {
    const level = cloneJson(payload.level);
    const mission = cloneJson(payload.mission);
    const plan = normalizePlan(cloneJson(payload.plan), level, mission);
    const planDigest = digestExecutionPlan(plan);
    return {
      ...cloneJson(payload),
      level,
      mission,
      plan,
      planDigest,
      planSummary: summarizeExecutionPlan({
        level,
        mission,
        plan,
        selectedAgentId: payload.selectedAgentId,
        currentPlanSource: payload.currentPlanSource,
        planDigest
      })
    };
  }
  const snapshot = createMissionExecutionSnapshot({
    level: fallbackState.level,
    mission: fallbackState.mission,
    plan: fallbackState.plan,
    selectedAgentId: fallbackState.selectedAgentId,
    currentPlanSource: fallbackState.currentPlanSource,
    challengeMode: fallbackState.challengeMode,
    experienceMode: fallbackState.experienceMode,
    missionOptions: fallbackState.missionOptions,
    stochastic: fallbackState.stochastic,
    playback: fallbackState.playback,
    simulationResume: fallbackState.simulationResume,
    routeAudit: fallbackState.ui?.routeAudit,
    terrainAwareValidationReport: fallbackState.ui?.terrainAwareValidationReport
  });
  return createMissionLaunchPayload({ snapshot, transaction: fallbackState.executionTransaction ?? null });
}

export function summarizeMissionLaunchPayload(payload = {}) {
  return {
    type: payload.type ?? null,
    version: payload.version ?? null,
    transactionId: payload.transactionId ?? null,
    levelId: payload.level?.levelId ?? null,
    missionId: payload.mission?.missionId ?? null,
    selectedAgentId: payload.selectedAgentId ?? null,
    planDigest: payload.planDigest ?? digestExecutionPlan(payload.plan),
    planSummary: payload.planSummary ?? summarizeExecutionPlan({
      level: payload.level,
      mission: payload.mission,
      plan: payload.plan,
      selectedAgentId: payload.selectedAgentId,
      currentPlanSource: payload.currentPlanSource,
      planDigest: payload.planDigest
    }),
    validationSummary: payload.validationSummary ?? null,
    terrainAwareValidationSummary: payload.terrainAwareValidationSummary ?? summarizeTerrainAwareValidation(payload.terrainAwareValidationReport),
    hasLevel: Boolean(payload.level),
    hasMission: Boolean(payload.mission),
    hasPlan: Boolean(payload.plan)
  };
}

export function summarizeTerrainAwareValidation(report = null) {
  if (!report) return null;
  const summary = report.summary ?? {};
  return {
    type: 'anchor.validation.terrain-aware-mission-summary',
    version: report.version ?? null,
    status: report.status ?? summary.status ?? null,
    executable: report.executable === true,
    hardErrorCount: report.hardErrors?.length ?? summary.hardErrorCount ?? 0,
    warningCount: report.warnings?.length ?? summary.warningCount ?? 0,
    advisoryCount: report.advisories?.length ?? summary.advisoryCount ?? 0,
    issueCodes: [...new Set([...(report.hardErrors ?? []), ...(report.warnings ?? []), ...(report.advisories ?? [])].map((issue) => issue.code).filter(Boolean))],
    firstIssue: report.hardErrors?.[0] ?? report.warnings?.[0] ?? report.advisories?.[0] ?? null,
    boundaryFlags: cloneJson(report.boundaryFlags ?? null)
  };
}

export function summarizeValidation(validation = {}) {
  return {
    ok: validation.ok === true,
    errorCount: validation.errors?.length ?? 0,
    warningCount: validation.warnings?.length ?? 0,
    errors: (validation.errors ?? []).slice(0, 5),
    warnings: (validation.warnings ?? []).slice(0, 5),
    routeAuditOk: validation.routeAudit?.ok ?? null
  };
}

export function summarizeExecutionPlan({ level = null, mission = null, plan = null, selectedAgentId = null, currentPlanSource = null, planDigest = null } = {}) {
  const agentPlans = plan?.agentPlans ?? [];
  const selectedStarts = agentPlans.filter((agentPlan) => agentPlan.selectedStart).map((agentPlan) => ({
    agentId: agentPlan.agentId,
    x: Number(agentPlan.selectedStart.x),
    y: Number(agentPlan.selectedStart.y)
  }));
  const missionStarts = (mission?.agents ?? []).filter((agent) => getSelectedStart(agent) ?? agent.start).map((agent) => {
    const start = getSelectedStart(agent) ?? agent.start;
    return { agentId: agent.id, x: Number(start.x), y: Number(start.y) };
  });
  const executableAgentPlans = agentPlans.filter((agentPlan) => (agentPlan.waypoints ?? []).length > 0);
  const waypointCount = agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
  return {
    type: plan?.type ?? null,
    schemaVersion: plan?.schemaVersion ?? null,
    levelId: plan?.levelId ?? level?.levelId ?? null,
    missionId: plan?.missionId ?? mission?.missionId ?? null,
    selectedAgentId,
    currentPlanSource,
    planDigest: planDigest ?? digestExecutionPlan(plan),
    agentPlanCount: agentPlans.length,
    executableAgentPlanCount: executableAgentPlans.length,
    executableWaypointCount: waypointCount,
    selectedStartCount: selectedStarts.length || missionStarts.length,
    planningMarkerCount: plan?.planningMarkers?.length ?? 0,
    selectedStarts,
    missionStarts,
    waypointIds: agentPlans.flatMap((agentPlan) => (agentPlan.waypoints ?? []).map((waypoint, index) => ({
      agentId: agentPlan.agentId,
      index,
      waypointId: waypoint.id ?? waypoint.waypointId ?? null
    })))
  };
}

export function digestExecutionPlan(plan = {}) {
  return hashString(stableStringify(publicExecutionPlan(plan)));
}

export function publicExecutionPlan(plan = {}) {
  return {
    schemaVersion: plan.schemaVersion ?? null,
    type: plan.type ?? null,
    levelId: plan.levelId ?? null,
    missionId: plan.missionId ?? null,
    instanceId: plan.instanceId ?? null,
    challengeId: plan.challengeId ?? null,
    executionMode: plan.executionMode ?? null,
    meta: {
      benchmarkMetadata: plan.meta?.benchmarkMetadata ?? null,
      adaptiveBenchmark: plan.meta?.adaptiveBenchmark ?? null,
      replayMetadata: plan.meta?.replayMetadata ?? null,
      fairnessLabel: plan.meta?.fairnessLabel ?? null,
      planner: plan.meta?.planner ?? plan.planner ?? null
    },
    surfaceSegments: plan.surfaceSegments ?? [],
    agentPlans: (plan.agentPlans ?? []).map((agentPlan) => ({
      agentId: agentPlan.agentId,
      selectedStart: agentPlan.selectedStart ? {
        x: Number(agentPlan.selectedStart.x),
        y: Number(agentPlan.selectedStart.y)
      } : null,
      waypoints: (agentPlan.waypoints ?? []).map((waypoint, index) => ({
        id: waypoint.id ?? waypoint.waypointId ?? `${agentPlan.agentId}:${index}`,
        waypointId: waypoint.waypointId ?? waypoint.id ?? null,
        index,
        x: Number(waypoint.x),
        y: Number(waypoint.y),
        t: finiteOrNull(waypoint.t),
        estimatedArrivalTime: finiteOrNull(waypoint.estimatedArrivalTime),
        segmentTravelTime: finiteOrNull(waypoint.segmentTravelTime),
        depthLayer: waypoint.depthLayer ?? waypoint.layer ?? null,
        diveProfile: waypoint.diveProfile ?? null,
        action: waypoint.action ?? 'sample',
        kind: waypoint.kind ?? null,
        terminalCarryThrough: waypoint.terminalCarryThrough === true,
        runtimeBehavior: waypoint.runtimeBehavior ?? null
      }))
    }))
  };
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
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(6)) : null;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  return JSON.parse(JSON.stringify(value));
}
