import { readHeadlessSolverPacket } from './SolverPacketReader.js';
import { buildHeadlessPlanningWorld } from './HeadlessPlanningWorld.js';
import { adaptAnchorPlanToHeadlessRuntimePlan, makeRoundtripValidationLevel, selectRoundtripAgentPlan, validateRoundtripPlanStructure } from './HeadlessRoundtrip.js';
import { validatePlanForExecution } from '../planning/PlanExecutionValidator.js';

export const HEADLESS_PLAN_ADAPTER_VERSION = 'headless-plan-adapter-h3.1';

export function classifyPlanArtifact(plan = {}) {
  return {
    type: plan?.type ?? null,
    recognized: plan?.type === 'anchor.plan',
    planId: plan?.planId ?? plan?.id ?? plan?.meta?.planId ?? null,
    executionMode: plan?.executionMode ?? null,
    agentPlanCount: Array.isArray(plan?.agentPlans) ? plan.agentPlans.length : 0,
    waypointCount: (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    diveProfileIds: [...new Set((plan?.agentPlans ?? []).flatMap((agentPlan) => [agentPlan.diveProfileId, ...(agentPlan.waypoints ?? []).map((waypoint) => waypoint.diveProfileId)].filter(Boolean)))]
  };
}

export function normalizeAnchorPlanForHeadless(plan, packetOrWorld, options = {}) {
  const world = resolveWorld(packetOrWorld, options);
  const selectedAgentPlan = selectRoundtripAgentPlan(plan, world, { agentId: options.agentId });
  return adaptAnchorPlanToHeadlessRuntimePlan(plan, selectedAgentPlan, world, { agentId: options.agentId });
}

export function validateHeadlessPlanAgainstMission(plan, packetOrWorld, options = {}) {
  const world = resolveWorld(packetOrWorld, options);
  const selectedAgentPlan = selectRoundtripAgentPlan(plan, world, { agentId: options.agentId });
  const structure = validateRoundtripPlanStructure(plan, selectedAgentPlan, world);
  const browserValidation = validatePlanForExecution({ level: makeRoundtripValidationLevel(world.level, world), mission: world.mission, plan });
  const errors = [...(structure.errors ?? []), ...(browserValidation.errors ?? [])];
  const warnings = [...(structure.warnings ?? []), ...(browserValidation.warnings ?? [])];
  return {
    ok: structure.ok && browserValidation.ok !== false && errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings,
    routeIssueCount: browserValidation.routeAudit?.issueCount ?? 0,
    selectedAgentId: selectedAgentPlan?.agentId ?? null
  };
}

export function extractHeadlessWaypointsFromPlan(plan, packetOrWorld, options = {}) {
  return normalizeAnchorPlanForHeadless(plan, packetOrWorld, options).waypoints;
}

export function planHeadlessCompatibilitySummary(plan, packetOrWorld, options = {}) {
  const classification = classifyPlanArtifact(plan);
  const validation = validateHeadlessPlanAgainstMission(plan, packetOrWorld, options);
  return {
    adapterVersion: HEADLESS_PLAN_ADAPTER_VERSION,
    ...classification,
    validationStatus: validation.status,
    selectedAgentId: validation.selectedAgentId,
    diveProfileIds: classification.diveProfileIds ?? [],
    singleGliderRuntimeLimitation: true,
    usesGeneratedPlan: false,
    usesNewPlanner: false
  };
}

function resolveWorld(packetOrWorld, options = {}) {
  if (packetOrWorld?.context && Number.isFinite(Number(packetOrWorld.width))) return packetOrWorld;
  const context = readHeadlessSolverPacket(packetOrWorld, { oracle: options.oracle === true });
  return buildHeadlessPlanningWorld(context);
}