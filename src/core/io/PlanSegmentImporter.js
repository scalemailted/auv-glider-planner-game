import { normalizePlan } from '../planning/WaypointPlan.js';
import { validateRoutePlanForExecution } from '../planning/RouteValidityAudit.js';
import { PLAN_ANCHOR_MODES, normalizePlannerMetadata } from '../planning/PlanExecutionModes.js';
import { buildSolverValidationFeedback } from '../planning/RouteDiagnostic.js';

export function importWaypointDataJson(json, context = {}) {
  if (!json || typeof json !== 'object') return failure('Waypoint import JSON must be an object.');
  if (json.type === 'anchor.plan') return importFullPlan(json, context);
  if (json.type === 'anchor.plan-segment') return importPlanSegment(json, context);
  if (Array.isArray(json.waypoints) || json.agentId) {
    return importPlanSegment({
      type: 'anchor.plan-segment',
      schemaVersion: json.schemaVersion ?? '1.0',
      agentId: json.agentId ?? context.agentId,
      startTime: json.startTime ?? context.currentTime,
      endTime: json.endTime ?? null,
      anchorMode: json.anchorMode ?? 'actualSurfacePosition',
      waypoints: json.waypoints ?? [],
      planner: json.planner ?? { name: 'Unknown waypoint list', type: 'unknown', source: 'external' },
      inferredMetadata: true
    }, context);
  }
  return failure('Expected anchor.plan, anchor.plan-segment, or { agentId, waypoints } JSON.');
}

export function applyImportedWaypointData(plan, imported, context = {}, { mode = 'replaceFuture' } = {}) {
  if (!imported?.ok || !plan) return { ok: false, message: imported?.errors?.[0] ?? 'No valid waypoint data to apply.' };
  const changedAgents = [];
  for (const segment of imported.segments ?? []) {
    const agentPlan = getAgentPlan(plan, segment.agentId);
    if (!agentPlan) return { ok: false, message: `Active plan has no agent plan for ${segment.agentId}.` };
    const engineAgent = context.engineAgents?.find((agent) => agent.id === segment.agentId);
    const cutIndex = getFutureCutIndex(agentPlan, engineAgent, context.currentTime);
    const normalizedWaypoints = segment.waypoints.map((waypoint, index) => ({
      ...waypoint,
      id: waypoint.id ?? `${segment.agentId}_import_${Date.now().toString(36)}_${index + 1}`
    }));
    if (mode === 'append') {
      agentPlan.waypoints.push(...normalizedWaypoints);
    } else {
      agentPlan.waypoints = [
        ...agentPlan.waypoints.slice(0, cutIndex),
        ...normalizedWaypoints
      ];
      if (engineAgent) {
        engineAgent.currentWaypointIndex = Math.min(cutIndex, agentPlan.waypoints.length);
        engineAgent.completedPlan = false;
        engineAgent.status = 'enroute';
        engineAgent.activeWaypoint = null;
        engineAgent.waypointSafety = null;
      }
    }
    changedAgents.push({ agentId: segment.agentId, loaded: normalizedWaypoints.length, anchorMode: segment.anchorMode });
  }
  plan.importMetadata ??= {};
  plan.importMetadata.lastWaypointDataImport = {
    importedAt: new Date().toISOString(),
    mode,
    sourceType: imported.sourceType,
    planner: imported.planner,
    fairness: imported.fairness,
    changedAgents
  };
  return { ok: true, changedAgents, message: `${changedAgents.reduce((sum, item) => sum + item.loaded, 0)} future waypoint(s) loaded.` };
}

function importFullPlan(json, context) {
  let normalized;
  try {
    normalized = normalizePlan(json, context.level, context.mission);
  } catch (error) {
    return failure(error?.message ?? 'Plan normalization failed.');
  }
  const planner = normalizePlannerMetadata(json.planner ?? json.meta?.planner);
  const segments = (normalized.agentPlans ?? [])
    .filter((agentPlan) => !context.agentId || agentPlan.agentId === context.agentId)
    .map((agentPlan) => ({
      agentId: agentPlan.agentId,
      anchorMode: 'actualSurfacePosition',
      startTime: context.currentTime,
      waypoints: (agentPlan.waypoints ?? []).filter((waypoint) => Number(waypoint.t ?? context.currentTime) >= Number(context.currentTime ?? 0) - 1e-6)
    }))
    .filter((segment) => segment.waypoints.length);
  return buildImported({ sourceType: 'anchor.plan', segments, planner, json, context, inferredMetadata: false });
}

function importPlanSegment(json, context) {
  const planner = normalizePlannerMetadata(json.planner);
  const segment = {
    agentId: json.agentId ?? context.agentId,
    startTime: finiteOrDefault(json.startTime, context.currentTime),
    endTime: finiteOrDefault(json.endTime, null),
    anchorMode: PLAN_ANCHOR_MODES.includes(json.anchorMode) ? json.anchorMode : 'actualSurfacePosition',
    waypoints: Array.isArray(json.waypoints) ? json.waypoints.map((waypoint) => ({ ...waypoint })) : []
  };
  return buildImported({
    sourceType: json.type === 'anchor.plan-segment' ? 'anchor.plan-segment' : 'plainWaypointList',
    segments: [segment],
    planner,
    json,
    context,
    inferredMetadata: Boolean(json.inferredMetadata)
  });
}

function buildImported({ sourceType, segments, planner, json, context, inferredMetadata }) {
  const errors = [];
  const warnings = [];
  if (json.challengeId && context.instanceId && json.challengeId !== context.instanceId) warnings.push('Imported challengeId differs from active challenge.');
  if (json.instanceId && context.instanceId && json.instanceId !== context.instanceId) warnings.push('Imported instanceId differs from active challenge.');
  if (json.missionId && context.missionId && json.missionId !== context.missionId) warnings.push('Imported missionId differs from active mission.');
  if (inferredMetadata) warnings.push('Waypoint list imported with inferred metadata. Planner source: unknown.');
  const knownAgents = new Set((context.mission?.agents ?? []).map((agent) => agent.id));
  for (const segment of segments) {
    if (!segment.agentId) errors.push('Imported waypoint data needs an agentId.');
    else if (knownAgents.size && !knownAgents.has(segment.agentId)) errors.push(`Unknown agentId "${segment.agentId}".`);
    if (!segment.waypoints.length) errors.push(`No waypoints found for ${segment.agentId ?? 'selected agent'}.`);
    segment.waypoints.forEach((waypoint, index) => validateWaypoint(waypoint, index, segment, context, errors, warnings));
  }
  const routeAudit = buildRouteAudit(segments, context);
  const validationFeedback = routeAudit
    ? buildSolverValidationFeedback({ routeAudit, plan: context.plan, level: context.level, mission: context.mission, planner })
    : null;
  if (routeAudit?.ok === false) errors.push(routeAudit.firstBlockingDiagnostic?.message ?? routeAudit.firstIssue?.message ?? 'Route validity audit found issues.');
  const imported = {
    ok: errors.length === 0,
    errors,
    warnings,
    sourceType,
    segments,
    planner,
    fairness: {
      usesForecast: planner.usesForecast,
      usesTruth: planner.usesTruth,
      usesOracle: planner.usesOracle,
      fairForLeaderboard: !planner.usesTruth && !planner.usesOracle
    },
    routeAudit,
    validationFeedback,
    summary: {
      title: 'Imported Waypoint Data',
      sourceType,
      plannerName: planner.name,
      agents: segments.length,
      waypointCount: segments.reduce((sum, segment) => sum + segment.waypoints.length, 0),
      anchorMode: segments[0]?.anchorMode ?? 'actualSurfacePosition',
      validation: errors.length ? 'failed' : warnings.length ? 'warnings' : 'passed',
      errors,
      warnings
    }
  };
  return imported;
}

function validateWaypoint(waypoint, index, segment, context, errors, warnings) {
  const x = Number(waypoint.x);
  const y = Number(waypoint.y);
  const t = Number(waypoint.t ?? waypoint.estimatedArrivalTime ?? segment.startTime ?? context.currentTime);
  if (!Number.isFinite(x) || !Number.isFinite(y)) errors.push(`Waypoint ${index + 1} for ${segment.agentId} needs finite x/y.`);
  const grid = context.level?.world?.grid ?? {};
  if (Number.isFinite(x) && Number.isFinite(y)) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= Number(grid.width ?? 0) || iy >= Number(grid.height ?? 0)) {
      errors.push(`Waypoint ${index + 1} for ${segment.agentId} is outside the map.`);
    } else if (context.level?.layers?.terrain?.[iy]?.[ix]) {
      errors.push(`Waypoint ${index + 1} for ${segment.agentId} is on terrain.`);
    }
  }
  if (!Number.isFinite(t)) errors.push(`Waypoint ${index + 1} for ${segment.agentId} needs finite time metadata.`);
  if (Number.isFinite(t) && Number.isFinite(Number(context.currentTime)) && t < Number(context.currentTime) - 1e-6) {
    warnings.push(`Waypoint ${index + 1} for ${segment.agentId} is before current simulation time.`);
  }
}

function buildRouteAudit(segments, context) {
  if (!context.level || !context.mission || !context.plan) return null;
  const auditPlan = {
    ...context.plan,
    agentPlans: (context.plan.agentPlans ?? []).map((agentPlan) => {
      const segment = segments.find((candidate) => candidate.agentId === agentPlan.agentId);
      if (!segment) return agentPlan;
      const cutIndex = getFutureCutIndex(agentPlan, context.engineAgents?.find((agent) => agent.id === agentPlan.agentId), context.currentTime);
      return {
        ...agentPlan,
        waypoints: [...(agentPlan.waypoints ?? []).slice(0, cutIndex), ...segment.waypoints]
      };
    })
  };
  return validateRoutePlanForExecution({ level: context.level, mission: context.mission, plan: auditPlan, gameState: { surfacedAgents: context.surfacedAgents } });
}

function getFutureCutIndex(agentPlan, engineAgent, currentTime) {
  if (Number.isInteger(engineAgent?.currentWaypointIndex)) return Math.max(0, engineAgent.currentWaypointIndex);
  const time = Number(currentTime ?? 0);
  return (agentPlan.waypoints ?? []).findIndex((waypoint) => Number(waypoint.t ?? waypoint.estimatedArrivalTime ?? Infinity) >= time - 1e-6);
}

function getAgentPlan(plan, agentId) {
  return (plan.agentPlans ?? []).find((agentPlan) => agentPlan.agentId === agentId) ?? null;
}

function finiteOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function failure(message) {
  return {
    ok: false,
    errors: [message],
    warnings: [],
    segments: [],
    summary: { title: 'Waypoint Import Failed', validation: 'failed', errors: [message], warnings: [] }
  };
}
