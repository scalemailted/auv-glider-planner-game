const PlanExecutionValidator = require('./PlanExecutionValidator.js')
const SolverPacketReader = require('./SolverPacketReader.js')
const HeadlessPlanningWorld = require('./HeadlessPlanningWorld.js')
const HeadlessRuntimeConfig = require('./HeadlessRuntimeConfig.js')
const HeadlessMissionRunner = require('./HeadlessMissionRunner.js')
const HeadlessScoring = require('./HeadlessScoring.js')
const HeadlessRoundtripTypes = require('./HeadlessRoundtripTypes.js')
const ScienceDiscoveryLifecycle = require('./ScienceDiscoveryLifecycle.js')
const WaterColumnSchema = require('./WaterColumnSchema.js')
const GliderTrajectorySimulator = require('./GliderTrajectorySimulator.js')
const MissionFeasibilityReport = require('./MissionFeasibilityReport.js')
const HEADLESS_ROUNDTRIP_VERSION = 'headless-solver-packet-roundtrip-h3';

 function buildHeadlessSolverPacketRoundtrip(packet, plan, options = {}) {
  const context = SolverPacketReader.readHeadlessSolverPacket(packet, { oracle: options.oracle === true });
  const world = HeadlessPlanningWorld.buildHeadlessPlanningWorld(context);
  const visibilityValidation = validateSolverPacketVisibility(context, { oracle: options.oracle === true });
  if (!visibilityValidation.ok && options.allowVisibilityFailures !== true) {
    throw new Error(`Solver packet visibility validation failed: ${visibilityValidation.errors.join('; ')}`);
  }
  const validationLevel = makeRoundtripValidationLevel(context.level, world);
  // console.log(validationLevel)
  // console.log(context.mission)
  // console.log(plan)
  const planValidation = PlanExecutionValidator.validatePlanForExecution({ level: validationLevel, mission: context.mission, plan });
  const selectedAgentPlan = plan[0];
  const structureValidation = validateRoundtripPlanStructure(plan, selectedAgentPlan, world);
  const combinedPlanValidation = combinePlanValidations(planValidation, structureValidation);
  if (!combinedPlanValidation.ok && options.allowInvalidPlan !== true) {
    throw new Error(`Plan validation failed: ${combinedPlanValidation.errors.join('; ')}`);
  }

  const runtimePlan = adaptAnchorPlanToHeadlessRuntimePlan(plan, selectedAgentPlan, world, { agentId: options.agentId });
  const runtimeConfig = buildRoundtripRuntimeConfig(context, world, runtimePlan, {
    seed: options.seed,
    motionAware: options.motionAware,
    motionConfig: options.motionConfig,
    motionModelId: options.motionModelId ?? options.motionModel,
    controlStepSeconds: options.controlStepSeconds ?? options.controlStep,
    gliderSpeed: options.gliderSpeed,
    headingRateLimitDegreesPerSecond: options.headingRateLimitDegreesPerSecond ?? options.headingRateLimit,
    driftGain: options.driftGain,
    sampleIntervalSeconds: options.sampleIntervalSeconds,
    bathymetry: options.bathymetry,
    bathymetryViewMode: options.bathymetryViewMode ?? options.bathymetryView,
    verticalExaggeration: options.verticalExaggeration,
    costGraphEnabled: options.costGraphEnabled ?? options.costGraph,
    costGraphConfig: options.costGraphConfig,
    costGraphMetric: options.costGraphMetric,
    costGraphNodeSource: options.costGraphNodeSource,
    costGraphNeighborMode: options.costGraphNeighborMode,
    costGraphGridStep: options.costGraphGridStep,
    costGraphMaxNodes: options.costGraphMaxNodes,
    costGraphRadius: options.costGraphRadius,
    costGraphDepartureTimesSeconds: options.costGraphDepartureTimesSeconds,
    costMatrixFormat: options.costMatrixFormat,
    missionScoreEnabled: options.missionScoreEnabled ?? options.missionScore,
    scoreProfile: options.scoreProfile ?? options.scoreProfileId,
    regretReference: options.regretReference,
    scoreAllowRefereeMetrics: options.scoreAllowRefereeMetrics
  });
  const episode = HeadlessMissionRunner.runHeadlessMissionWithPlan(runtimeConfig, runtimePlan);
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

 function validateSolverPacketVisibility(context, { oracle = false } = {}) {
  const errors = [];
  const warnings = [];
  const packet = context?.packet ?? {};
  const visibility = packet.visibility ?? {};
  const planningData = packet.planningData ?? {};
  const visibleFields = planningData.visibleFields ?? {};
  const visibleFieldIds = collectVisibleFieldIds(visibleFields);
  const hasVisibleTruth = Boolean(visibleFields.truth || visibleFields.hiddenTruth || visibleFieldIds.includes('T_hiddenTruth'));
  const hiddenTruthIncluded = Boolean(visibility.truthIncluded || planningData.hiddenTruthIncluded || hasVisibleTruth);

  // if (visibility.oracleMode && !oracle) errors.push('Solver packet declares oracleMode=true; rerun with --oracle for oracle/debug workflows.');
  // if (hiddenTruthIncluded && !oracle) errors.push('Solver-visible packet includes hidden truth without explicit oracle mode.');
  // if (visibleFieldIds.includes('T_hiddenTruth') && !oracle) errors.push('Solver-visible fields include T_hiddenTruth.');
  // if (!planningData.forecastAvailable && !oracle) warnings.push('Solver packet does not advertise forecastAvailable=true; roundtrip will use Node synthetic runtime fields.');
  // if (packet.truthVisibility === 'hidden' && hiddenTruthIncluded && !oracle) errors.push('truthVisibility is hidden but hidden truth is present in planning data.');

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

 function validateRoundtripPlanStructure(plan, selectedAgentPlan, world) {
  const errors = [];
  const warnings = [];
  if (!plan || typeof plan !== 'object') errors.push('Plan JSON must be an object.');
  // if (plan?.type !== 'anchor.plan') errors.push(`Expected type anchor.plan, got ${plan?.type ?? 'missing'}.`);
  // if (!Array.isArray(plan?.agentPlans) || !plan.agentPlans.length) errors.push('Plan must include agentPlans[].');
  // if (!selectedAgentPlan) errors.push('No agent plan with waypoints was found for this packet.');
  const agentIds = new Set((world?.agents ?? []).map((agent) => String(agent.id ?? agent.agentId ?? '')));
  if (selectedAgentPlan?.agentId && agentIds.size && !agentIds.has(String(selectedAgentPlan.agentId))) {
    // errors.push(`Plan agent ${selectedAgentPlan.agentId} is not present in the solver packet mission agents.`);
  }
  if (selectedAgentPlan && (!Array.isArray(selectedAgentPlan.waypoints) || !selectedAgentPlan.waypoints.length)) {
    errors.push(`Plan agent ${selectedAgentPlan.agentId ?? 'unknown'} has no waypoints.`);
  }
  const requestedProfileId = selectedAgentPlan?.diveProfileId ?? plan?.diveProfileId ?? null;
  if (requestedProfileId && !WATER_COLUMN_PROFILE_IDS.includes(WaterColumnSchema.normalizeWaterColumnProfileId(requestedProfileId))) warnings.push(`Unknown diveProfileId ${requestedProfileId}; runtime will normalize to a supported profile.`);
  for (const [index, waypoint] of (selectedAgentPlan?.waypoints ?? []).entries()) {
    const label = `${selectedAgentPlan.agentId ?? 'agent'} waypoint ${index + 1}`;
    const x = Number(waypoint.x);
    const y = Number(waypoint.y);
    if (waypoint.diveProfileId && !WATER_COLUMN_PROFILE_IDS.includes(WaterColumnSchema.normalizeWaterColumnProfileId(waypoint.diveProfileId))) warnings.push(`${label} uses unknown diveProfileId ${waypoint.diveProfileId}; runtime will normalize it.`);
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

 function selectRoundtripAgentPlan(plan, world, { agentId = null } = {}) {
  const plans = Array.isArray(plan?.agentPlans) ? plan.agentPlans : [];
  if (agentId) return plans.find((candidate) => String(candidate.agentId) === String(agentId)) ?? null;
  const missionIds = new Set((world?.agents ?? []).map((agent) => String(agent.id ?? agent.agentId ?? '')));
  return plans.find((candidate) => (candidate.waypoints?.length ?? 0) > 0 && (!missionIds.size || missionIds.has(String(candidate.agentId))))
    ?? plans.find((candidate) => (candidate.waypoints?.length ?? 0) > 0)
    ?? plans[0]
    ?? null;
}

 function adaptAnchorPlanToHeadlessRuntimePlan(plan, selectedAgentPlan, world, { agentId = null } = {}) {
  if (!selectedAgentPlan) throw new Error('Cannot adapt missing agent plan.');
  const resolvedAgentId = String(agentId ?? selectedAgentPlan.agentId ?? world?.agents?.[0]?.id ?? 'glider-1');
  const selectedStart = selectedAgentPlan.selectedStart ?? deploymentStartForAgent(world, resolvedAgentId) ?? missionStartForAgent(world, resolvedAgentId);
  const diveProfileId = WaterColumnSchema.normalizeWaterColumnProfileId(selectedAgentPlan.diveProfileId ?? plan?.diveProfileId ?? world?.context?.packet?.waterColumnConfig?.diveProfileId ?? world?.context?.packet?.planningData?.waterColumnConfig?.diveProfileId ?? 'sawtoothProfile');
  const waypoints = [];
  if (isFinitePoint(selectedStart)) {
    waypoints.push({
      waypointId: `${resolvedAgentId}-roundtrip-start`,
      x: round(Number(selectedStart.x)),
      y: round(Number(selectedStart.y)),
      zIndex: 0,
      z: 0,
      depthLayer: 'surface',
      depthLayerId: 'surface',
      diveProfileId,
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
      depthLayer: waypoint.depthLayer ?? waypoint.depthLayerId ?? null,
      depthLayerId: waypoint.depthLayerId ?? waypoint.depthLayer ?? null,
      diveProfileId: WaterColumnSchema.normalizeWaterColumnProfileId(waypoint.diveProfileId ?? diveProfileId),
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
    diveProfileId,
    waypoints,
    desiredSpeedThroughWater: finiteOrNull(selectedAgentPlan.desiredSpeedThroughWater ?? plan?.desiredSpeedThroughWater),
    sampleIntervalSeconds: finiteOrNull(selectedAgentPlan.sampleIntervalSeconds ?? plan?.sampleIntervalSeconds),
    surfaceAtEnd: Boolean(selectedAgentPlan.surfaceAtEnd ?? plan?.surfaceAtEnd ?? false),
    motionIntent: selectedAgentPlan.motionIntent ?? plan?.motionIntent ?? null,
    notes: [
      'H3 adapts a submitted anchor.plan into the existing Node headless waypoint-plan shape.',
      'This is plan execution compatibility, not a new route planner.'
    ]
  };
}

 function buildRoundtripRuntimeConfig(context, world, runtimePlan, options = {}) {
  const { seed = null } = options;
  const agent = (world?.agents ?? []).find((candidate) => String(candidate.id ?? candidate.agentId) === String(runtimePlan.gliderId)) ?? {};
  const resolvedSeed = String(seed ?? context?.packet?.stochasticConfig?.seed ?? context?.packet?.seed ?? context?.replaySeedAnchor ?? context?.packet?.packetId ?? 'h3-roundtrip');
  const packetWaterColumnConfig = context?.packet?.waterColumnConfig ?? context?.packet?.planningData?.waterColumnConfig ?? context?.level?.world?.waterColumnConfig ?? null;
  const waterColumnConfig = WaterColumnSchema.normalizeWaterColumnConfig(packetWaterColumnConfig ?? {
    depthLayerIds: context?.packet?.depthLayers ?? context?.level?.world?.depthLayers ?? context?.level?.world?.grid?.depthLayers,
    diveProfileId: runtimePlan.diveProfileId
  });
  return HeadlessRuntimeConfig.createDefaultHeadlessRuntimeConfig({
    waterColumnConfig,
    depthLayers: waterColumnConfig.depthLayerIds,
    diveProfileId: runtimePlan.diveProfileId ?? waterColumnConfig.diveProfileId,
    scenario: context?.packet?.scenarioId ?? context?.level?.levelId ?? 'solverPacketRoundtrip',
    seed: resolvedSeed,
    width: Math.max(2, Number(world?.width ?? 12) || 12),
    height: Math.max(2, Number(world?.height ?? 8) || 8),
    gliderId: runtimePlan.gliderId,
    gliderSpeed: Number(options.gliderSpeed ?? runtimePlan.desiredSpeedThroughWater ?? agent.maxSpeed ?? agent.speed ?? 1) || 1,
    energyBudget: Number(agent.battery ?? agent.energyBudget ?? agent.maxBattery ?? 120) || 120,
    missionId: context?.mission?.missionId ?? 'solver-packet-roundtrip-headless-mission',
    informationAccessTier: context?.oracle ? 'oracle' : 'forecastOnly',
    plan: runtimePlan,
    motionAware: Boolean(options.motionAware ?? options.motionConfig?.enabled ?? options.motionConfig?.motionAware ?? context?.packet?.motionConfig?.enabled ?? context?.packet?.planningData?.motionConfig?.enabled ?? false),
    motionConfig: options.motionConfig ?? context?.packet?.motionConfig ?? context?.packet?.planningData?.motionConfig ?? null,
    motionModelId: options.motionModelId ?? context?.packet?.motionConfig?.motionModelId ?? context?.packet?.planningData?.motionConfig?.motionModelId ?? null,
    controlStepSeconds: options.controlStepSeconds,
    headingRateLimitDegreesPerSecond: options.headingRateLimitDegreesPerSecond,
    driftGain: options.driftGain,
    sampleIntervalSeconds: options.sampleIntervalSeconds,
    bathymetry: options.bathymetry,
    bathymetryViewMode: options.bathymetryViewMode ?? options.bathymetryView,
    verticalExaggeration: options.verticalExaggeration,
    costGraphEnabled: options.costGraphEnabled ?? options.costGraph,
    costGraphConfig: options.costGraphConfig,
    costGraphMetric: options.costGraphMetric,
    costGraphNodeSource: options.costGraphNodeSource,
    costGraphNeighborMode: options.costGraphNeighborMode,
    costGraphGridStep: options.costGraphGridStep,
    costGraphMaxNodes: options.costGraphMaxNodes,
    costGraphRadius: options.costGraphRadius,
    costGraphDepartureTimesSeconds: options.costGraphDepartureTimesSeconds,
    costMatrixFormat: options.costMatrixFormat,
    missionScoreEnabled: options.missionScoreEnabled ?? options.missionScore,
    scoreProfile: options.scoreProfile ?? options.scoreProfileId,
    regretReference: options.regretReference,
    scoreAllowRefereeMetrics: options.scoreAllowRefereeMetrics
  });
}

 function buildHeadlessRoundtripReport({ context, world, packet, plan, selectedAgentPlan, runtimePlan, runtimeConfig, episode, visibilityValidation, planValidation, options = {} }) {
  const outputDir = options.outputDir ?? null;
  const includeHiddenTruth = options.includeHiddenTruth === true;
  const scoreSummary = HeadlessScoring.headlessScoreReportSummary(episode.scoreReport);
  const scienceDiagnosticsSummary = ScienceDiscoveryLifecycle.scienceDiscoverySummary(episode.scienceDiagnostics ?? episode.scienceDiscovery ?? {});
  const waterColumnSummary = episode.waterColumnSummary ?? null;
  const bathymetrySummary = episode.bathymetrySummary ?? null;
  const missionGeometrySummary = episode.missionGeometrySummary ?? null;
  const motionSummary = episode.motionTrajectory ? GliderTrajectorySimulator.trajectoryMotionSummary(episode.motionTrajectory) : null;
  const missionFeasibilityReport = episode.missionFeasibilityReport ?? null;
  const missionFeasibilitySummary = missionFeasibilityReport ? MissionFeasibilityReport.missionFeasibilityReportSummary(missionFeasibilityReport) : episode.missionFeasibilitySummary ?? episode.diagnostics?.missionFeasibilitySummary ?? null;
  const motionCostGraphSummary = episode.motionCostGraphSummary ?? episode.diagnostics?.motionCostGraphSummary ?? null;
  const motionCostMatrixSummary = episode.motionCostMatrixSummary ?? episode.diagnostics?.motionCostMatrixSummary ?? null;
  const missionOutcomeSummary = episode.diagnostics?.missionOutcomeSummary ?? (episode.missionOutcomeReport ? { compositeScore: episode.missionOutcomeReport.compositeScore, coverageFraction: episode.missionOutcomeReport.coverageFraction } : null);
  const missionScoreSummary = episode.diagnostics?.missionScoreSummary ?? null;
  const regretSummary = episode.diagnostics?.regretSummary ?? null;
  return {
    schemaVersion: '1.0',
    ...HeadlessRoundtripTypes.roundtripReportTypeMetadata(),
    version: HEADLESS_ROUNDTRIP_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    source: {
      packetId: packet?.packetId ?? null,
      planId: plan?.planId ?? plan?.id ?? plan?.meta?.planId ?? null,
      selectedAgentId: selectedAgentPlan?.agentId ?? null,
      challengeId: context?.challengeId ?? null,
      replaySeedAnchor: context?.replaySeedAnchor ?? null
    },
    packetSummary: SolverPacketReader.summarizeHeadlessPacket(context),
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
      config: HeadlessRuntimeConfig.headlessRuntimeConfigSummary(runtimeConfig),
      adaptedPlan: {
        type: runtimePlan.type,
        planId: runtimePlan.planId,
        gliderId: runtimePlan.gliderId,
        waypointCount: runtimePlan.waypoints.length,
        routeAuthority: runtimePlan.routeAuthority,
        generatesRoute: runtimePlan.generatesRoute,
        diveProfileId: runtimePlan.diveProfileId ?? null,
        desiredSpeedThroughWater: runtimePlan.desiredSpeedThroughWater ?? null,
        sampleIntervalSeconds: runtimePlan.sampleIntervalSeconds ?? null,
        surfaceAtEnd: runtimePlan.surfaceAtEnd === true
      },
      usesNodeHeadlessRuntime: true,
      usesProvidedPlan: true,
      usesNewPlanner: false,
      usesBrowserOfficialScoring: false,
      usesPythonSimulator: false,
      usesMARL: false,
      usesMotionDynamics: Boolean(motionSummary),
      hasMissionFeasibilityReport: Boolean(missionFeasibilityReport),
      hasMotionCostGraph: Boolean(motionCostGraphSummary),
      usesMotionCostGraph: Boolean(motionCostGraphSummary),
      usesMissionOutcomeScoring: Boolean(missionOutcomeSummary ?? episode.missionOutcomeReport ?? episode.missionScore),
      motionCostMetricId: motionCostGraphSummary?.metricId ?? null,
      motionCostNodeCount: motionCostGraphSummary?.nodeCount ?? 0,
      motionCostEdgeCount: motionCostGraphSummary?.edgeCount ?? 0,
      scoreProfileId: missionOutcomeSummary?.scoreProfileId ?? episode.missionOutcomeReport?.scoreProfile?.profileId ?? null,
      scoreProfileVersion: missionOutcomeSummary?.scoreProfileVersion ?? episode.missionOutcomeReport?.scoreProfile?.profileVersion ?? null,
      compositeScore: missionOutcomeSummary?.compositeScore ?? null,
      scienceScore: missionOutcomeSummary?.scienceScore ?? null,
      feasibilityScore: missionOutcomeSummary?.feasibilityScore ?? null,
      efficiencyScore: missionOutcomeSummary?.efficiencyScore ?? null,
      safetyScore: missionOutcomeSummary?.safetyScore ?? null,
      coverageFraction: missionOutcomeSummary?.coverageFraction ?? null,
      regretSummary,
      usesWebGPUFluid: false,
      usesFull3DPlanning: false,
      usesHydrodynamicSolver: false,
      usesTerrainFlowAsOceanCurrent: false,
      changesOfficialBrowserScoring: false,
      usesRouteOptimizer: false,
      usesSeaExplorerValidatedModel: false,
      motionModelId: motionSummary?.motionModelId ?? runtimeConfig.motionConfig?.motionModelId ?? null,
      usesPacketVisibleFieldsForPlanningValidation: true,
      usesSyntheticRuntimeFieldsForExecution: true
    },
    episode: {
      episodeId: episode.episodeId,
      seed: episode.seed,
      observationCount: episode.observations?.length ?? 0,
      trackPointCount: episode.tracks?.length ?? 0,
      scoreSummary,
      waterColumnSummary,
      bathymetrySummary,
      missionGeometrySummary,
      motionSummary,
      missionFeasibilitySummary,
      plannedVsRealized: episode.plannedVsRealized ?? episode.motionTrajectory?.plannedVsRealized ?? null,
      motionDiagnostics: episode.motionDiagnostics ?? episode.motionTrajectory?.motionDiagnostics ?? null
    },
    scienceDiagnosticsSummary,
    waterColumnSummary,
    bathymetrySummary,
    missionGeometrySummary,
    motionSummary,
    missionFeasibilityReport,
    missionFeasibilitySummary,
    plannedVsRealized: episode.plannedVsRealized ?? episode.motionTrajectory?.plannedVsRealized ?? null,
    motionDiagnostics: episode.motionDiagnostics ?? episode.motionTrajectory?.motionDiagnostics ?? null,
    motionCostGraphSummary,
    motionCostMatrixSummary,
    missionOutcomeSummary,
    missionScoreSummary,
    regretSummary,
    missionOutcomeReport: episode.missionOutcomeReport ?? null,
    missionScore: episode.missionScore ?? null,
    regretReport: episode.regretReport ?? null,
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
      browserOfficialScoring: false,
      sciencePrimaryDiagnosis: scienceDiagnosticsSummary.primaryDiagnosis ?? null,
      waterColumnVerticalCoverage: waterColumnSummary?.verticalCoverage ?? null,
      diveProfileId: waterColumnSummary?.diveProfile?.profileId ?? runtimePlan.diveProfileId ?? null,
      hasBathymetrySummary: Boolean(bathymetrySummary),
      hasMissionGeometrySummary: Boolean(missionGeometrySummary),
      bathymetryViewMode: bathymetrySummary?.bathymetryViewMode ?? runtimeConfig?.bathymetryViewMode ?? null,
      motionModelId: motionSummary?.motionModelId ?? null,
      usesMotionDynamics: Boolean(motionSummary),
      hasMissionFeasibilityReport: Boolean(missionFeasibilityReport),
      hasMotionCostGraph: Boolean(motionCostGraphSummary),
      usesMotionCostGraph: Boolean(motionCostGraphSummary),
      usesMissionOutcomeScoring: Boolean(missionOutcomeSummary ?? episode.missionOutcomeReport ?? episode.missionScore),
      motionCostMetricId: motionCostGraphSummary?.metricId ?? null,
      motionCostNodeCount: motionCostGraphSummary?.nodeCount ?? 0,
      motionCostEdgeCount: motionCostGraphSummary?.edgeCount ?? 0,
      scoreProfileId: missionOutcomeSummary?.scoreProfileId ?? episode.missionOutcomeReport?.scoreProfile?.profileId ?? null,
      scoreProfileVersion: missionOutcomeSummary?.scoreProfileVersion ?? episode.missionOutcomeReport?.scoreProfile?.profileVersion ?? null,
      compositeScore: missionOutcomeSummary?.compositeScore ?? null,
      scienceScore: missionOutcomeSummary?.scienceScore ?? null,
      feasibilityScore: missionOutcomeSummary?.feasibilityScore ?? null,
      efficiencyScore: missionOutcomeSummary?.efficiencyScore ?? null,
      safetyScore: missionOutcomeSummary?.safetyScore ?? null,
      coverageFraction: missionOutcomeSummary?.coverageFraction ?? null,
      regretSummary
    },
    boundary: [
      'Node/OceanBox-JS validates and executes a submitted plan through the H1 headless runtime.',
      'Browser ANCHOR remains the official visual referee and scoring UI.',
      'Headless score is educational and not official browser scoring.',
      'P9 science diagnostics distinguish forecast correction from hidden-event hypotheses using transparent educational heuristics.',
      'P11 water-column context is 2.5D depth-layer sampling, not full 3D planning or a new planner.',
      'ENV-R1 bathymetry is environmental geometry and view metadata; it does not replace water-column state or add hydrodynamic solving.',
      'MOTION-R1 motion dynamics compares submitted route intent with realized trajectory; it does not generate a route or use WebGPU.',
      'SIM-R1 cost graph and adjacency matrix artifacts inspect motion costs; they do not choose or optimize routes.',
      'H3/P9/P11 does not add a Python simulator, new route planner, calibrated ocean forecast, backend service, production data assimilation, or MARL/RL.'
    ]
  };
}

 function makeRoundtripValidationLevel(level, world) {
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



module.exports = {buildHeadlessSolverPacketRoundtrip, validateSolverPacketVisibility, validateRoundtripPlanStructure, selectRoundtripAgentPlan, adaptAnchorPlanToHeadlessRuntimePlan, buildRoundtripRuntimeConfig, buildHeadlessRoundtripReport, makeRoundtripValidationLevel}