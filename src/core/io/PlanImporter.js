import { normalizePlan, validatePlan } from '../planning/WaypointPlan.js';
import { validateRoutePlanForExecution } from '../planning/RouteValidityAudit.js';
import {
  isScaffoldOnlyPlanMode,
  normalizeExecutionMode,
  normalizePlannerMetadata,
  PLAN_ANCHOR_MODES
} from '../planning/PlanExecutionModes.js';
import { planMatchesLevel } from '../identity/GameInstanceId.js';
import { buildSolverValidationFeedback } from '../planning/RouteDiagnostic.js';

export function importPlanJson(json, { level, mission, routeValidation = true } = {}) {
  const errors = [];
  const warnings = [];
  if (!json || typeof json !== 'object') {
    return fail('Plan JSON must be an object.');
  }
  if (json.type && json.type !== 'anchor.plan') errors.push('Plan type must be "anchor.plan".');
  const executionMode = normalizeExecutionMode(json.executionMode ?? json.meta?.executionMode);
  const planner = normalizePlannerMetadata(json.planner ?? json.meta?.planner);
  let normalized = null;
  try {
    normalized = normalizePlan({
      ...json,
      type: 'anchor.plan',
      executionMode,
      planner,
      meta: {
        ...(json.meta ?? {}),
        executionMode,
        planner,
        importedPlan: true,
        importedAt: new Date().toISOString()
      }
    }, level, mission);
  } catch (error) {
    return fail(error?.message ?? 'Plan normalization failed.');
  }
  normalized.executionMode = executionMode;
  normalized.planner = planner;
  normalized.challengeId = json.challengeId ?? json.instanceId ?? normalized.instanceId ?? null;
  normalized.surfaceSegments = normalizeSurfaceSegments(json);
  normalized.importMetadata = {
    schemaVersion: json.schemaVersion ?? null,
    originalExecutionMode: json.executionMode ?? null,
    fairness: {
      usesForecast: planner.usesForecast,
      usesTruth: planner.usesTruth,
      usesOracle: planner.usesOracle,
      fairForLeaderboard: !planner.usesOracle && !planner.usesTruth
    }
  };

  const validation = validatePlan(normalized, mission);
  errors.push(...validation.errors);
  warnings.push(...validation.warnings);
  warnings.push(...validateCompatibility(normalized, { level, mission }));
  warnings.push(...validateSurfaceSegments(normalized, { level }));
  if (isScaffoldOnlyPlanMode(executionMode)) {
    warnings.push(`${labelMode(executionMode)} import is recognized but not executable in this version.`);
  }
  if (executionMode === 'surfaceUpdateBundle') {
    warnings.push('Surface-update bundle metadata is preserved. Automatic segment application is scaffolded and not enabled in this version.');
  }
  if (routeValidation && normalized.agentPlans?.some((agentPlan) => agentPlan.waypoints?.length)) {
    const audit = validateRoutePlanForExecution({ level, mission, plan: normalized });
    normalized.importMetadata.routeAudit = audit;
    normalized.importMetadata.validationFeedback = buildSolverValidationFeedback({ routeAudit: audit, plan: normalized, level, mission, planner });
    if (audit.ok === false) errors.push(audit.firstBlockingDiagnostic?.message ?? audit.firstIssue?.message ?? 'Route validity audit found issues.');
  }

  return {
    ok: errors.length === 0 && !isScaffoldOnlyPlanMode(executionMode),
    canImport: errors.length === 0,
    errors,
    warnings,
    plan: normalized,
    summary: buildImportSummary(normalized, { errors, warnings, level, mission })
  };

  function fail(message) {
    return {
      ok: false,
      canImport: false,
      errors: [message],
      warnings: [],
      plan: null,
      summary: null
    };
  }
}

function validateCompatibility(plan, { level, mission }) {
  const warnings = [];
  const identityMatch = planMatchesLevel(plan, level);
  if (identityMatch === false) {
    warnings.push(`Plan challengeId/instanceId differs from active challenge.`);
  }
  if (plan.missionId && mission?.missionId && plan.missionId !== mission.missionId) {
    warnings.push(`Plan missionId "${plan.missionId}" differs from active mission "${mission.missionId}".`);
  }
  const grid = level?.world?.grid ?? {};
  for (const agentPlan of plan.agentPlans ?? []) {
    for (const waypoint of agentPlan.waypoints ?? []) {
      if (waypoint.x < 0 || waypoint.y < 0 || waypoint.x >= grid.width || waypoint.y >= grid.height) {
        warnings.push(`Waypoint ${waypoint.id} is outside the map.`);
      } else if (level?.layers?.terrain?.[waypoint.y]?.[waypoint.x]) {
        warnings.push(`Waypoint ${waypoint.id} is on terrain.`);
      }
      if (!Number.isFinite(Number(waypoint.t))) warnings.push(`Waypoint ${waypoint.id} has non-finite time metadata.`);
    }
  }
  return warnings;
}

function normalizeSurfaceSegments(json = {}) {
  const mode = normalizeExecutionMode(json.executionMode ?? json.meta?.executionMode);
  if (mode !== 'surfaceUpdateBundle') return [];
  return (json.agentPlans ?? []).flatMap((agentPlan) => (agentPlan.surfaceSegments ?? []).map((segment, index) => ({
    agentId: agentPlan.agentId,
    segmentId: segment.segmentId ?? `${agentPlan.agentId}_seg_${index}`,
    window: Number(segment.window ?? index),
    startTime: finiteOrNull(segment.startTime),
    endTime: finiteOrNull(segment.endTime),
    anchorMode: PLAN_ANCHOR_MODES.includes(segment.anchorMode) ? segment.anchorMode : 'actualSurfacePosition',
    anchor: segment.anchor ?? null,
    waypoints: Array.isArray(segment.waypoints) ? segment.waypoints : []
  })));
}

function validateSurfaceSegments(plan, { level }) {
  const warnings = [];
  if (plan.executionMode !== 'surfaceUpdateBundle') return warnings;
  const planningWindow = Number(level?.world?.time?.planningWindow ?? level?.planningWindow ?? 0);
  for (const segment of plan.surfaceSegments ?? []) {
    if (!Number.isFinite(segment.window)) warnings.push(`Surface segment ${segment.segmentId} needs a finite window.`);
    if (!Number.isFinite(segment.startTime) || !Number.isFinite(segment.endTime)) {
      warnings.push(`Surface segment ${segment.segmentId} needs finite start/end times.`);
    }
    if (planningWindow && Number.isFinite(segment.startTime)) {
      const expected = Number(segment.window) * planningWindow;
      if (Math.abs(segment.startTime - expected) > planningWindow) {
        warnings.push(`Surface segment ${segment.segmentId} does not align with the mission surface interval.`);
      }
    }
  }
  return warnings;
}

function buildImportSummary(plan, { errors, warnings }) {
  const agents = plan.agentPlans?.length ?? 0;
  const waypointCount = (plan.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
  return {
    title: 'Imported Plan',
    plannerName: plan.planner?.name ?? 'Imported External Plan',
    plannerType: plan.planner?.type ?? 'importedSolver',
    executionMode: plan.executionMode,
    agents,
    waypointCount,
    surfaceSegments: plan.surfaceSegments?.length ?? 0,
    usesForecast: Boolean(plan.planner?.usesForecast),
    usesTruth: Boolean(plan.planner?.usesTruth),
    usesOracle: Boolean(plan.planner?.usesOracle),
    validation: errors.length ? 'failed' : warnings.length ? 'warnings' : 'passed',
    errors,
    warnings
  };
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function labelMode(mode) {
  return String(mode ?? '').replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}
