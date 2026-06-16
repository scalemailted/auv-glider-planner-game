import { validatePlanForExecution } from '../planning/PlanExecutionValidator.js';
import { readHeadlessSolverPacket, summarizeHeadlessPacket } from './SolverPacketReader.js';
import { buildHeadlessPlanningWorld } from './HeadlessPlanningWorld.js';
import { createDefaultHeadlessRuntimeConfig, headlessRuntimeConfigSummary } from './runtime/HeadlessRuntimeConfig.js';
import { runHeadlessMissionWithPlan } from './runtime/HeadlessMissionRunner.js';
import { headlessScoreReportSummary } from './runtime/HeadlessScoring.js';

export const HEADLESS_ROUNDTRIP_VERSION = 'headless-solver-packet-roundtrip-h3';

export function buildHeadlessSolverPacketRoundtrip(packet, plan, options = {}) {
  const context = readHeadlessSolverPacket(packet, { oracle: options.oracle === true });
  const world = buildHeadlessPlanningWorld(context);
  const visibilityValidation = validateSolverPacketVisibility(context, { oracle: options.oracle === true });
  if (!visibilityValidation.ok && options.allowVisibilityFailures !== true) {
    throw new Error(`Solver packet visibility validation failed: ${visibilityValidation.errors.join('; ')}`);
  }

  const validationLevel = makeRoundtripValidationLevel(context.level, world);
  const planValidation = validatePlanForExecution({ level: validationLevel, mission: context.mission, plan });
  const selectedAgentPlan = selectRoundtripAgentPlan(plan, world, { agentId: options.agentId });
  const structureValidation = validateRoundtripPlanStructure(plan, selectedAgentPlan, world);
  const combinedPlanValidation = combinePlanValidations(planValidation, structureValidation);
  if (!combinedPlanValidation.ok && options.allowInvalidPlan !== true) {
    throw new Error(`Plan validation failed: ${combinedPlanValidation.errors.join('; ')}`);
  }

  const runtimePlan = adaptAnchorPlanToHeadlessRuntimePlan(plan, selectedAgentPlan, world, { agentId: options.agentId });
  const runtimeConfig = buildRoundtripRuntimeConfig(context, world, runtimePlan, { seed: options.seed });
  const episode = runHeadlessMissionWithPlan(runtimeConfig, runtimePlan);
  const report = buildHeadlessRoundtripReport({
    context,
    world,
    packet,
    plan,
    selectedAgentPlan,
    runtimePlan,
    runtimeConfig,
    episode,
    visibilityValidation,
    planValidation: combinedPlanValidation,
    options
  });
  episode.roundtripReport = report;
  episode.diagnostics = {
    ...(episode.diagnostics ?? {}),
    solverPacketRoundtrip: report.summary,
    h3RoundtripVersion: HEADLESS_ROUNDTRIP_VERSION
  };
  return { context, world, runtimePlan, runtimeConfig, episode, report, visibilityValidation, planValidation: combinedPlanValidation };
}

export function validateSolverPacketVisibility(context, { oracle = false } = {}) {
  const errors = [];
  const warnings = [];
  const packet = context?.packet ?? {};
  const visibility = packet.visibility ?? {};
  const planningData = packet.planningData ?? {};
  const visibleFields = planningData.visibleFields ?? {};
  const visibleFieldIds = collectVisibleFieldIds(visibleFields);
  const hasVisibleTruth = Boolean(visibleFields.truth || visibleFields.hiddenTruth || visibleFieldIds.includes('T_hiddenTruth'));
  const hiddenTruthIncluded = Boolean(visibility.truthIncluded || planningData.hiddenTruthIncluded || hasVisibleTruth);

  if (visibility.oracleMode && !oracle) errors.push('Solver packet declares oracleMode=true; rerun with --oracle for oracle/debug workflows.');
  if (hiddenTruthIncluded && !oracle) errors.push('Solver-visible packet includes hidden truth without explicit oracle mode.');
  if (visibleFieldIds.includes('T_hiddenTruth') && !oracle) errors.push('Solver-visible fields include T_hiddenTruth.');
  if (!planningData.forecastAvailable && !oracle) warnings.push('Solver packet does not advertise forecastAvailable=true; roundtrip will use Node synthetic runtime fields.');
  if (packet.truthVisibility === 'hidden' && hiddenTruthIncluded && !oracle) errors.push('truthVisibility is hidden but hidden truth is present in planning data.');

  return {
    ok: errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings,
    hiddenTruthIncluded,
    visibleFieldIds,
    oracleMode: Boolean(oracle || visibility.oracleMode),
    publicChallenge: visibility.publicChallenge !== false,
    forecastIncluded: Boolean(visibility.forecastIncluded ?? planningData.forecastAvailable)
  };
}

export function validateRoundtripPlanStructure(plan, selectedAgentPlan, world) {
  const errors = [];
  const warnings = [];
  if (!plan || typeof plan !== 'object') errors.push('Plan JSON must be an object.');
  if (plan?.type !== 'anchor.plan') errors.push(`Expected type anchor.plan, got ${plan?.type ?? 'missing'}.`);
  if (!Array.isArray(plan?.agentPlans) || !plan.agentPlans.length) errors.push('Plan must include agentPlans[].');
  if (!selectedAgentPlan) errors.push('No agent plan with waypoints was found for this packet.');
  const agentIds = new Set((world?.agents ?? []).map((agent) => String(agent.id ?? agent.agentId ?? '')));
  if (selectedAgentPlan?.agentId && agentIds.size && !agentIds.has(String(selectedAgentPlan.agentId))) {
    errors.push(`Plan agent ${selectedAgentPlan.agentId} is not present in the solver packet mission agents.`);
  }
  if (selectedAgentPlan && (!Array.isArray(selectedAgentPlan.waypoints) || !selectedAgentPlan.waypoints.length)) {
    errors.push(`Plan agent ${selectedAgentPlan.agentId ?? 'unknown'} has no waypoints.`);
  }
  for (const [index, waypoint] of (selectedAgentPlan?.waypoints ?? []).entries()) {
    const label = `${selectedAgentPlan.agentId ?? 'agent'} waypoint ${index + 1}`;
    const x = Number(waypoint.x);
    const y = Number(waypoint.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) errors.push(`${label} needs finite x/y.`);
    if (Number.isFinite(x) && Number.isFinite(y) && (x < 0 || y < 0 || x >= world.width || y >= world.height)) errors.push(`${label} is outside the solver packet grid.`);
    const t = Number(waypoint.estimatedArrivalTime ?? waypoint.t ?? waypoint.timeSeconds);
    if (waypoint.estimatedArrivalTime !== undefined || waypoint.t !== undefined || waypoint.timeSeconds !== undefined) {
      if (!Number.isFinite(t)) errors.push(`${label} has non-finite timing.`);
      else if (Number.isFinite(world.duration) && t > world.duration) warnings.push(`${label} exceeds the packet mission duration; browser validation remains authoritative.`);
    }
  }
  return { ok: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function selectRoundtripAgentPlan(plan, world, { agentId = null } = {}) {
  const plans = Array.isArray(plan?.agentPlans) ? plan.agentPlans : [];
  if (agentId) return plans.find((candidate) => String(candidate.agentId) === String(agentId)) ?? null;
  const missionIds = new Set((world?.agents ?? []).map((agent) => String(agent.id ?? agent.agentId ?? '')));
  return plans.find((candidate) => (candidate.waypoints?.length ?? 0) > 0 && (!missionIds.size || missionIds.has(String(candidate.agentId))))
    ?? plans.find((candidate) => (candidate.waypoints?.length ?? 0) > 0)
    ?? plans[0]
    ?? null;
}

export function adaptAnchorPlanToHeadlessRuntimePlan(plan, selectedAgentPlan, world, { agentId = null } = {}) {
  if (!selectedAgentPlan) throw new Error('Cannot adapt missing agent plan.');
  const resolvedAgentId = String(agentId ?? selectedAgentPlan.agentId ?? world?.agents?.[0]?.id ?? 'glider-1');
  const selectedStart = selectedAgentPlan.selectedStart ?? deploymentStartForAgent(world, resolvedAgentId) ?? missionStartForAgent(world, resolvedAgentId);
  const waypoints = [];
  if (isFinitePoint(selectedStart)) {
    waypoints.push({
      waypointId: `${resolvedAgentId}-roundtrip-start`,
      x: round(Number(selectedStart.x)),
      y: round(Number(selectedStart.y)),
      zIndex: 0,
      z: 0,
      depthLayer: 'surface',
      source: 'selectedStart'
    });
  }
  for (const [index, waypoint] of (selectedAgentPlan.waypoints ?? []).entries()) {
    const zIndex = Math.max(0, Math.round(Number(waypoint.zIndex ?? waypoint.z ?? 0) || 0));
    waypoints.push({
      waypointId: String(waypoint.waypointId ?? waypoint.id ?? `${resolvedAgentId}-roundtrip-wp-${index + 1}`),
      x: round(Number(waypoint.x)),
      y: round(Number(waypoint.y)),
      zIndex,
      z: zIndex,
      depthLayer: waypoint.depthLayer ?? null,
      estimatedArrivalTime: finiteOrNull(waypoint.estimatedArrivalTime ?? waypoint.t ?? waypoint.timeSeconds),
      kind: waypoint.kind ?? waypoint.action ?? 'navigation',
      source: 'anchor.plan'
    });
  }
  return {
    type: 'anchor.headless.waypoint-plan',
    version: HEADLESS_ROUNDTRIP_VERSION,
    planId: plan?.planId ?? plan?.id ?? plan?.meta?.planId ?? 'submitted-anchor-plan',
    sourcePlanType: plan?.type ?? null,
    sourceExecutionMode: plan?.executionMode ?? null,
    gliderId: resolvedAgentId,
    routeAuthority: 'submittedAnchorPlan',
    generatesRoute: false,
    waypoints,
    notes: [
      'H3 adapts a submitted anchor.plan into the existing Node headless waypoint-plan shape.',
      'This is plan execution compatibility, not a new route planner.'
    ]
  };
}

export function buildRoundtripRuntimeConfig(context, world, runtimePlan, { seed = null } = {}) {
  const agent = (world?.agents ?? []).find((candidate) => String(candidate.id ?? candidate.agentId) === String(runtimePlan.gliderId)) ?? {};
  const resolvedSeed = String(seed ?? context?.packet?.stochasticConfig?.seed ?? context?.packet?.seed ?? context?.replaySeedAnchor ?? context?.packet?.packetId ?? 'h3-roundtrip');
  return createDefaultHeadlessRuntimeConfig({
    scenario: context?.packet?.scenarioId ?? context?.level?.levelId ?? 'solverPacketRoundtrip',
    seed: resolvedSeed,
    width: Math.max(2, Number(world?.width ?? 12) || 12),
    height: Math.max(2, Number(world?.height ?? 8) || 8),
    gliderId: runtimePlan.gliderId,
    gliderSpeed: Number(agent.maxSpeed ?? agent.speed ?? 1) || 1,
    energyBudget: Number(agent.battery ?? agent.energyBudget ?? agent.maxBattery ?? 120) || 120,
    missionId: context?.mission?.missionId ?? 'solver-packet-roundtrip-headless-mission',
    informationAccessTier: context?.oracle ? 'oracle' : 'forecastOnly',
    plan: runtimePlan
  });
}

export function buildHeadlessRoundtripReport({ context, world, packet, plan, selectedAgentPlan, runtimePlan, runtimeConfig, episode, visibilityValidation, planValidation, options = {} }) {
  const outputDir = options.outputDir ?? null;
  const includeHiddenTruth = options.includeHiddenTruth === true;
  const scoreSummary = headlessScoreReportSummary(episode.scoreReport);
  return {
    schemaVersion: '1.0',
    type: 'anchor.headless.roundtrip-report',
    version: HEADLESS_ROUNDTRIP_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    source: {
      packetId: packet?.packetId ?? null,
      planId: plan?.planId ?? plan?.id ?? plan?.meta?.planId ?? null,
      selectedAgentId: selectedAgentPlan?.agentId ?? null,
      challengeId: context?.challengeId ?? null,
      replaySeedAnchor: context?.replaySeedAnchor ?? null
    },
    packetSummary: summarizeHeadlessPacket(context),
    visibilityValidation,
    planValidation: {
      ok: planValidation.ok,
      status: planValidation.status,
      errors: planValidation.errors ?? [],
      warnings: planValidation.warnings ?? [],
      routeIssueCount: planValidation.routeIssueCount ?? 0,
      diagnosticCount: planValidation.diagnosticCount ?? 0
    },
    runtime: {
      config: headlessRuntimeConfigSummary(runtimeConfig),
      adaptedPlan: {
        type: runtimePlan.type,
        planId: runtimePlan.planId,
        gliderId: runtimePlan.gliderId,
        waypointCount: runtimePlan.waypoints.length,
        routeAuthority: runtimePlan.routeAuthority,
        generatesRoute: runtimePlan.generatesRoute
      },
      usesNodeHeadlessRuntime: true,
      usesProvidedPlan: true,
      usesNewPlanner: false,
      usesBrowserOfficialScoring: false,
      usesPythonSimulator: false,
      usesMARL: false,
      usesPacketVisibleFieldsForPlanningValidation: true,
      usesSyntheticRuntimeFieldsForExecution: true
    },
    episode: {
      episodeId: episode.episodeId,
      seed: episode.seed,
      observationCount: episode.observations?.length ?? 0,
      trackPointCount: episode.tracks?.length ?? 0,
      scoreSummary
    },
    output: {
      outputDir,
      combinedBundlePath: outputDir ? `${outputDir.replace(/\\/g, '/')}/bundle.json` : null,
      roundtripReportPath: outputDir ? `${outputDir.replace(/\\/g, '/')}/roundtrip_report.json` : null,
      hiddenTruthExported: includeHiddenTruth
    },
    hiddenTruthLeakCheck: {
      solverVisibleHiddenTruthIncluded: visibilityValidation.hiddenTruthIncluded,
      publicBundleRequested: !includeHiddenTruth,
      publicBundleShouldOmitHiddenFields: !includeHiddenTruth,
      status: !visibilityValidation.hiddenTruthIncluded || options.oracle === true ? 'PASS' : 'FAIL'
    },
    summary: {
      ok: visibilityValidation.ok && planValidation.ok,
      status: visibilityValidation.ok && planValidation.ok ? 'PASS' : 'FAIL',
      finalScore: scoreSummary.finalScore,
      observationCount: episode.observations?.length ?? 0,
      trackPointCount: episode.tracks?.length ?? 0,
      hiddenTruthExported: includeHiddenTruth,
      browserOfficialScoring: false
    },
    boundary: [
      'Node/OceanBox-JS validates and executes a submitted plan through the H1 headless runtime.',
      'Browser ANCHOR remains the official visual referee and scoring UI.',
      'Headless score is educational and not official browser scoring.',
      'H3 does not add a Python simulator, new route planner, calibrated ocean forecast, backend service, or MARL/RL.'
    ]
  };
}

export function makeRoundtripValidationLevel(level, world) {
  if (level?.layers?.truth?.frames?.length) return level;
  return {
    ...level,
    layers: {
      ...(level?.layers ?? {}),
      truth: {
        frames: world.frame ? [{
          t: Number(world.frame.t ?? 0),
          current: world.frame.current ?? world.current ?? [],
          roi: world.frame.roi ?? world.roi ?? []
        }] : []
      }
    }
  };
}

function combinePlanValidations(browserValidation = {}, structureValidation = {}) {
  const errors = [...(browserValidation.errors ?? []), ...(structureValidation.errors ?? [])];
  const warnings = [...(browserValidation.warnings ?? []), ...(structureValidation.warnings ?? [])];
  const blockingDiagnostics = (browserValidation.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === 'blocking');
  for (const diagnostic of blockingDiagnostics) {
    const category = diagnostic.category ? ` ${diagnostic.category}` : '';
    errors.push(`Blocking route diagnostic:${category}`);
  }
  return {
    ok: errors.length === 0 && browserValidation.ok !== false && structureValidation.ok !== false,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings,
    routeIssueCount: browserValidation.routeAudit?.issueCount ?? 0,
    diagnosticCount: browserValidation.diagnostics?.length ?? 0,
    diagnostics: browserValidation.diagnostics ?? [],
    solverFeedback: browserValidation.solverFeedback ?? null
  };
}

function collectVisibleFieldIds(visibleFields = {}) {
  const ids = new Set();
  for (const key of Object.keys(visibleFields ?? {})) ids.add(key);
  for (const scope of ['forecast', 'truth', 'visibleFields']) {
    if (Array.isArray(visibleFields?.[scope]?.fieldIds)) visibleFields[scope].fieldIds.forEach((id) => ids.add(id));
    Object.keys(visibleFields?.[scope]?.fields ?? {}).forEach((id) => ids.add(id));
  }
  return [...ids];
}

function deploymentStartForAgent(world, agentId) {
  const deployment = (world?.deploymentAgents ?? []).find((candidate) => String(candidate.agentId) === String(agentId));
  return deployment?.selectedStart ?? deployment?.allowedCells?.[0] ?? null;
}

function missionStartForAgent(world, agentId) {
  const agent = (world?.agents ?? []).find((candidate) => String(candidate.id ?? candidate.agentId) === String(agentId));
  return agent?.start ?? null;
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? round(number) : null;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}