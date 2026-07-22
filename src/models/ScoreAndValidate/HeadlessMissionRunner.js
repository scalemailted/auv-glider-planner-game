const HeadlessEpisodeSchema = require('./HeadlessEpisodeSchema.js')
const HeadlessBeliefUpdate = require('./HeadlessBeliefUpdate.js')
const HeadlessFields = require('./HeadlessFields.js')
const HeadlessGlider = require('./HeadlessGlider.js')
const HeadlessPriority = require('./HeadlessPriority.js')
const HeadlessRuntimeConfig = require('./HeadlessRuntimeConfig.js')
const HeadlessScoring = require('./HeadlessScoring.js')
const ScienceDiscoveryLifecycle = require('./ScienceDiscoveryLifecycle.js')
const WaterColumnPriorityModel = require('./WaterColumnPriorityModel.js')
const DepthAwareScienceValue = require('./DepthAwareScienceValue.js')
const DepthScoringProfiles = require('./DepthScoringProfiles.js')
const WaterColumnObservationModel = require('./WaterColumnObservationModel.js')
const BathymetryFieldModel = require('./BathymetryFieldModel.js')
const TerrainSimulationDiagnostics = require('./TerrainSimulationDiagnostics.js')
const OceanWorldGeometryAdapter = require('./OceanWorldGeometryAdapter.js')
const GliderTrajectorySimulator = require('./GliderTrajectorySimulator.js')
const MissionFeasibilityReport = require('./MissionFeasibilityReport.js')
const MotionCostGraphBuilder = require('./MotionCostGraphBuilder.js')
const MotionCostMatrixExporter = require('./MotionCostMatrixExporter.js')
const MissionScoreProfiles = require('./MissionScoreProfiles.js')
const MissionOutcomeMetricAdapter = require('./MissionOutcomeMetricAdapter.js')
const MissionScoreNormalizer = require('./MissionScoreNormalizer.js')
const MissionScoreAggregator = require('./MissionScoreAggregator.js')
const MissionRegretModel = require('./MissionRegretModel.js')
const MissionOutcomeReport = require('./MissionOutcomeReport.js')
const MissionScorePublicSafety = require('./MissionScorePublicSafety.js')
const index = require('./mission-simulator/src/index.js')
const HEADLESS_MISSION_RUNNER_VERSION = 'headless-mission-runner-h1';

 function runHeadlessMission(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : HeadlessRuntimeConfig.createDefaultHeadlessRuntimeConfig(configInput);
  return runHeadlessMissionWithPlan(config, config.plan);
}

 function runHeadlessMissionWithPlan(configInput = {}, planInput = null) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : HeadlessRuntimeConfig.createDefaultHeadlessRuntimeConfig(configInput);
  const plan = planInput ?? config.plan;
  return simulateHeadlessEpisode(config, plan);
}

 function simulateHeadlessEpisode(configInput = {}, planInput = null) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : HeadlessRuntimeConfig.createDefaultHeadlessRuntimeConfig(configInput);
  const validation = HeadlessRuntimeConfig.validateHeadlessRuntimeConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid headless runtime config: ${validation.errors.join('; ')}`);
  }
  const plan = planInput ?? config.plan;
  const fieldPackBefore = HeadlessFields.createHeadlessFieldPack(config);
  const bathymetry = config.bathymetryConfig ? BathymetryFieldModel.createSyntheticBathymetryField({
    ...config.bathymetryConfig,
    seed: String(config.seed ?? 'demo-001') + ':bathymetry'
  }) : null;
  fieldPackBefore.fields.A_global = HeadlessPriority.computeHeadlessSamplingPriority(fieldPackBefore, config);
  const depthLayerPriorityBefore = WaterColumnPriorityModel.computeWaterColumnPriority(fieldPackBefore, config.waterColumnConfig ?? config);
  fieldPackBefore.diagnostics.depthLayerPriority = depthLayerPriorityBefore.summary;
  const missionConfig = {
    ...config.missionConfig,
    sensorNoise: config.sensorNoise,
    planningRules: { ...(config.missionConfig.planningRules ?? {}), stepDistance: config.stepDistance }
  };
  const glider = missionConfig.gliders?.find((entry) => entry.id === plan.gliderId) ?? missionConfig.gliders?.[0];
  const routeResult = HeadlessGlider.simulateHeadlessGliderRoute({
    fieldPack: fieldPackBefore,
    glider,
    waypoints: plan.waypoints,
    missionConfig,
    seed: config.seed
  });
  const motionTrajectory = config.motionAware === true || config.motionConfig?.enabled === true || config.motionConfig?.motionAware === true
    ? GliderTrajectorySimulator.simulateGliderMotionTrajectory({
        plan,
        fieldPack: fieldPackBefore,
        waterColumnConfig: config.waterColumnConfig,
        bathymetry,
        glider,
        motionConfig: config.motionConfig,
        options: {
          seed: config.seed,
          sensorNoise: config.sensorNoise,
          maxSimTime: missionConfig.world?.durationSeconds ?? 3600,
          maxSteps: 240
        }
      })
    : null;
  const executionObservations = motionTrajectory?.sampledObservations?.length ? motionTrajectory.sampledObservations : routeResult.observations;
  const executionTracks = motionTrajectory?.realizedTrack?.length ? motionTrajectory.realizedTrack : routeResult.tracks;
  const fieldPackAfter = HeadlessBeliefUpdate.updateHeadlessBeliefFromObservations({
    fieldPack: fieldPackBefore,
    observations: executionObservations,
    radius: 2.5,
    confidence: 0.55,
    stalenessRate: 0.012
  });
  fieldPackAfter.fields.A_global = HeadlessPriority.computeHeadlessSamplingPriority(fieldPackAfter, config);
  fieldPackAfter.diagnostics.priority = HeadlessPriority.headlessPrioritySummary(
    fieldPackAfter.fields.A_global,
    HeadlessPriority.computeHeadlessPriorityComponents(fieldPackAfter, config)
  );
  const depthLayerPriority = WaterColumnPriorityModel.computeWaterColumnPriority(fieldPackAfter, config.waterColumnConfig ?? config);
  fieldPackAfter.diagnostics.depthLayerPriority = depthLayerPriority.summary;
  const waterColumnSummary = WaterColumnObservationModel.buildWaterColumnSummary({
    config: config.waterColumnConfig ?? config,
    observations: executionObservations,
    tracks: executionTracks,
    diveProfile: glider?.diveProfile ?? plan.diveProfileId,
    depthLayerPriority
  });
  const depthScienceScoreProfile = DepthScoringProfiles.depthScienceScoreProfileMetadata(config.missionConfig?.scoring?.depthScience ?? config.missionConfig?.scoring?.scoreProfileId ?? (waterColumnSummary.waterColumnConfig?.layerCount > 1 ? 'depthAwareScienceV1' : 'legacySurfaceScienceV1'), {
    defaultProfileId: waterColumnSummary.waterColumnConfig?.layerCount > 1 ? 'depthAwareScienceV1' : 'legacySurfaceScienceV1',
    layerSchemaVersion: config.waterColumnConfig?.version,
    objectiveWeightProfileId: missionConfig.objectives?.[0]?.objectiveWeightProfileId
  });
  const depthScienceProfileValue = DepthAwareScienceValue.evaluateDepthAwareProfileValue({
    observations: executionObservations,
    waterColumnConfig: config.waterColumnConfig ?? config,
    priorityField: fieldPackAfter.fields.A_global,
    missionObjective: missionConfig.objectives?.[0] ?? null,
    scoreProfile: depthScienceScoreProfile,
    agentId: plan.gliderId ?? glider?.id ?? 'glider-1'
  });
  const depthScienceSummary = depthScienceProfileValue.summary;
  const missionGeometry = OceanWorldGeometryAdapter.buildOceanWorldGeometry({
    missionConfig,
    fieldPack: fieldPackAfter,
    bathymetry,
    waterColumnConfig: config.waterColumnConfig,
    observations: executionObservations,
    tracks: executionTracks,
    motionTrajectory,
    plan,
    options: { waterColumnSummary }
  });
  const scoreReport = HeadlessScoring.computeHeadlessScoreReport({
    fieldPackBefore,
    fieldPackAfter,
    observations: executionObservations,
    tracks: executionTracks,
    missionConfig,
    waterColumnSummary
  });
  const missionFeasibilityReport = motionTrajectory ? MissionFeasibilityReport.buildMissionFeasibilityReport({
    motionTrajectory,
    plan,
    motionConfig: config.motionConfig,
    environmentSummary: motionTrajectory.motionDiagnostics?.environmentSummary ?? null,
    scienceSummary: {
      finalScore: scoreReport.finalScore,
      observationCount: scoreReport.counts?.observationCount ?? executionObservations.length,
      waterColumnVerticalCoverage: waterColumnSummary?.verticalCoverage ?? null
    },
    options: {
      missionId: missionConfig.missionId,
      gliderId: plan.gliderId,
      surfaceAtEnd: plan.surfaceAtEnd === true
    }
  }) : null;
  const motionCostArtifacts = buildOptionalMotionCostArtifacts({
    config,
    fieldPack: fieldPackAfter,
    waterColumnConfig: config.waterColumnConfig,
    bathymetry,
    plan,
    motionConfig: config.motionConfig
  });
  const motionCostGraph = motionCostArtifacts.graph;
  const motionCostMatrix = motionCostArtifacts.matrix;
  const motionCostGraphSummary = motionCostArtifacts.graphSummary;
  const motionCostMatrixSummary = motionCostArtifacts.matrixSummary;
  const episodeId = `h1-node-headless-${config.scenario}-${config.seed}`;
  const scienceDiscovery = ScienceDiscoveryLifecycle.analyzeScienceEvidence({
    observations: executionObservations,
    context: {
      episodeId,
      forecastCanExplain: config.scienceDiagnostics?.forecastCanExplain ?? true,
      eventFamily: config.scienceDiagnostics?.eventFamily ?? 'unknownAnomaly',
      currentObjectiveId: missionConfig.objectives?.[0]?.objectiveId ?? missionConfig.objectives?.[0]?.id ?? 'reconnaissanceSurvey'
    },
    options: { createdAt: config.createdAt ?? null }
  });
  const scienceDiagnostics = ScienceDiscoveryLifecycle.buildScienceDiagnosticsArtifact(scienceDiscovery, {
    episodeId,
    createdAt: config.createdAt ?? null,
    source: 'nodeHeadlessRuntime'
  });
  const missionScoreArtifacts = buildOptionalMissionScoreArtifacts({
    config,
    missionConfig,
    plan,
    scoreReport,
    observations: executionObservations,
    tracks: executionTracks,
    motionTrajectory,
    motionDiagnostics: motionTrajectory?.motionDiagnostics ?? null,
    missionFeasibilityReport,
    waterColumnSummary,
    scienceDiagnostics,
    motionCostGraphSummary,
    motionCostMatrixSummary,
    episodeId
  });
  const missionSimulationInput = index.createMissionSimulationInput({
    id: `headless:${config.scenario}:${config.seed}`,
    deterministicSeed: config.seed,
    plan: { type: 'anchor.plan', agentPlans: [{ agentId: plan.gliderId ?? glider?.id ?? 'glider-1', waypoints: plan.waypoints ?? [] }] },
    agentConfigurations: missionConfig.gliders ?? [glider].filter(Boolean),
    missionDurationSeconds: missionConfig.world?.durationSeconds ?? 0,
    timeStepSeconds: missionConfig.world?.dtSeconds ?? 1,
    environmentArtifactDigest: fieldPackBefore?.diagnostics?.environmentArtifactDigest ?? null,
    missionRules: missionConfig.rules ?? {},
    terminalRules: missionConfig.rules?.endCondition ?? {},
    observationModel: { source: 'headless-runtime-observations' },
    noiseModel: { sensorNoise: config.sensorNoise ?? null },
    sourceMetadata: {
      adapter: 'src/core/headless/runtime/HeadlessMissionRunner.js',
      packageConsumesEnvironmentArtifact: false,
      packageOwnsPhysics: true,
      packageOwnsRouteProgress: true,
      packageOwnsEnvironmentSampling: true,
      packageOwnsTerminalEvaluation: true,
      packageOwnsRawMetrics: true,
      packageOwnsEnvironmentGeneration: false,
      packageOwnsPlanning: false,
      packageOwnsScoring: false,
      packageOwnsRendering: false
    }
  });
  const missionSimulationKernel = index.createMissionSimulator(missionSimulationInput, { backendId: 'javascriptCpuV1' });
  index.syncMissionSimulatorState(missionSimulationKernel, headlessMissionSimulationRuntimeState({
    routeResult,
    executionTracks,
    executionObservations,
    plan,
    glider,
    missionConfig
  }));
  const missionSimulationDebug = index.missionSimulatorDebugSummary(missionSimulationKernel);
  const missionSimulationSnapshotArtifact = index.missionSimulationSnapshot(missionSimulationKernel);
  const missionSimulationDigest = index.missionSimulationResultDigest(missionSimulationKernel);
  const actions = plan.waypoints.map((waypoint, index) => ({
    id: `action-wp-${index + 1}`,
    type: 'waypointTarget',
    gliderId: plan.gliderId,
    target: { x: waypoint.x, y: waypoint.y, z: waypoint.zIndex ?? waypoint.z ?? 0, depthLayerId: waypoint.depthLayerId ?? waypoint.depthLayer ?? null },
    diveProfileId: waypoint.diveProfileId ?? plan.diveProfileId ?? waterColumnSummary.diveProfile?.profileId ?? null,
    policyId: 'fixedDefaultWaypoints',
    note: 'H1 executes provided waypoints and does not optimize routes.'
  }));
  const rewards = [{
    id: 'reward-final-educational-score',
    value: scoreReport.finalScore,
    components: scoreReport.components,
    educationalBenchmarkSpecific: true,
    note: 'Educational headless scoring only; browser scoring remains official.'
  }];
  const replay = {
    type: 'anchor.headless.replay',
    version: HEADLESS_MISSION_RUNNER_VERSION,
    seed: config.seed,
    gliderId: plan.gliderId,
    diveProfileId: waterColumnSummary.diveProfile?.profileId ?? plan.diveProfileId ?? null,
    trackPointCount: executionTracks.length,
    observationCount: executionObservations.length,
    route: routeResult.route,
    observationIds: executionObservations.map((entry) => entry.observationId),
    motionTrajectoryId: motionTrajectory?.planId ?? null
  };
  const terrainDiagnostics = buildHeadlessTerrainDiagnostics({
    bathymetry,
    missionConfig,
    scenarioId: config.scenario,
    episodeId,
    tracks: executionTracks,
    observations: executionObservations
  });
  const episode = {
    type: 'anchor.headless.episode',
    version: HEADLESS_MISSION_RUNNER_VERSION,
    episodeId,
    runtimeTarget: 'nodeHeadless',
    seed: config.seed,
    missionConfig,
    fieldPackBefore,
    fieldPackAfter,
    observations: executionObservations,
    tracks: executionTracks,
    waterColumnSummary,
    depthScienceScoreProfile,
    depthScienceScoreEvents: depthScienceProfileValue.scoreEvents,
    depthScienceSummary,
    bathymetrySummary: fieldPackBefore.bathymetrySummary ?? fieldPackAfter.bathymetrySummary ?? null,
    missionGeometrySummary: missionGeometry.summary,
    terrainValidationSummary: null,
    actualTerrainDiagnosticsSummary: terrainDiagnostics.summary,
    terrainEventSummary: terrainDiagnostics.summary?.terrainEventSummary ?? null,
    terrainEvents: terrainDiagnostics.events ?? [],
    terrainEventsSupported: terrainDiagnostics.supported === true,
    depthLayerPriority,
    depthLayerPrioritySummary: depthLayerPriority.summary,
    motionTrajectory,
    controlTrace: motionTrajectory?.controlCommands ?? [],
    plannedVsRealized: motionTrajectory?.plannedVsRealized ?? null,
    motionDiagnostics: motionTrajectory?.motionDiagnostics ?? null,
    missionFeasibilityReport,
    missionFeasibilitySummary: missionFeasibilityReport ? MissionFeasibilityReport.missionFeasibilityReportSummary(missionFeasibilityReport) : null,
    motionCostGraph,
    motionCostMatrix,
    motionCostGraphSummary,
    motionCostMatrixSummary,
    scoreProfileSummary: missionScoreArtifacts.scoreProfileSummary,
    missionOutcomeMetrics: missionScoreArtifacts.metrics,
    missionScore: missionScoreArtifacts.missionScore,
    missionOutcomeReport: missionScoreArtifacts.report,
    regretReport: missionScoreArtifacts.regretReport,
    actions,
    rewards,
    surfacingEvents: [{
      id: 'surface-final',
      timeSeconds: executionTracks.at(-1)?.timeSeconds ?? routeResult.state.timeSeconds,
      gliderId: plan.gliderId,
      reason: 'mission-complete-summary-'
    }],
    scoreReport,
    scienceDiscovery,
    scienceDiagnostics,
    replay,
    missionSimulation: {
      input: missionSimulationInput,
      inputDigest: missionSimulationInput.inputDigest,
      manifestDigest: missionSimulationInput.manifest.manifestDigest,
      environmentArtifactDigest: missionSimulationInput.environmentArtifactDigest,
      planDigest: missionSimulationInput.planDigest,
      resultDigest: missionSimulationDigest,
      debug: missionSimulationDebug,
      snapshot: missionSimulationSnapshotArtifact
    },
    diagnostics: {
      runtimeVersion: HEADLESS_MISSION_RUNNER_VERSION,
      configValidation: validation,
      deterministic: true,
      routeGenerated: false,
      usesProvidedWaypoints: true,
      usesMotionDynamics: Boolean(motionTrajectory),
      usesMotionCostGraph: Boolean(motionCostGraph),
      usesMissionOutcomeScoring: Boolean(missionScoreArtifacts.report),
      usesWebGPUFluid: false,
      usesHydrodynamicSolver: false,
      usesTerrainFlowAsOceanCurrent: false,
      bathymetrySummary: fieldPackBefore.bathymetrySummary ?? fieldPackAfter.bathymetrySummary ?? null,
      missionGeometrySummary: missionGeometry.summary,
      actualTerrainDiagnosticsSummary: terrainDiagnostics.summary,
      terrainEventSummary: terrainDiagnostics.summary?.terrainEventSummary ?? null,
      terrainEventsSupported: terrainDiagnostics.supported === true,
      terrainDiagnosticsUnsupportedReason: terrainDiagnostics.unsupportedReason ?? null,
      motionSummary: motionTrajectory ? GliderTrajectorySimulator.trajectoryMotionSummary(motionTrajectory) : null,
      missionFeasibilitySummary: missionFeasibilityReport ? MissionFeasibilityReport.missionFeasibilityReportSummary(missionFeasibilityReport) : null,
      motionCostGraphSummary,
      motionCostMatrixSummary,
      motionCostGraphWarnings: motionCostArtifacts.warnings,
      missionOutcomeSummary: missionScoreArtifacts.summary,
      missionScoreSummary: missionScoreArtifacts.missionScoreSummary,
      regretSummary: missionScoreArtifacts.regretSummary,
      waterColumnSummary,
      depthScienceSummary,
      depthLayerPrioritySummary: depthLayerPriority.summary,
      scienceDiscoverySummary: ScienceDiscoveryLifecycle.scienceDiscoverySummary(scienceDiagnostics),
      missionSimulatorPackage: missionSimulationDebug,
      missionSimulationResultDigest: missionSimulationDigest,
      calibratedOceanForecast: false,
      calibratedVerticalOceanModel: false,
      implementsFull3DPlanning: false,
      implementsNewPlanner: false,
      implementsMARL: false,
      canonicalRuntime: 'Node headless runtime uses the mission-simulator package as the canonical mission-state transition contract while retaining headless artifact orchestration outside the package.'
    }
  };
  episode.schemaEpisode = HeadlessEpisodeSchema.createHeadlessEpisode({
    episodeId: episode.episodeId,
    runtimeTarget: 'nodeHeadless',
    seed: episode.seed,
    observations: episode.observations.map((observation) => ({
      observationId: observation.observationId,
      timeSeconds: observation.timeSeconds,
      gliderId: observation.gliderId,
      position: { x: observation.x, y: observation.y, z: observation.zIndex, depthLayerId: observation.depthLayerId ?? observation.depthLayer },
      fieldId: 'T_hiddenTruth',
      value: observation.observedValue,
      payload: observation
    })),
    actions: episode.actions,
    rewards: episode.rewards,
    surfacingEvents: episode.surfacingEvents,
    diagnostics: episode.diagnostics,
    notes: [episode.diagnostics.canonicalRuntime]
  });
  return episode;
}
function headlessMissionSimulationRuntimeState({ routeResult = {}, executionTracks = [], executionObservations = [], plan = {}, glider = {}, missionConfig = {} } = {}) {
  const trackEnd = executionTracks.at(-1) ?? routeResult.state ?? {};
  const agentId = plan.gliderId ?? glider?.id ?? routeResult.state?.gliderId ?? 'glider-1';
  const tracks = executionTracks.map((track) => ({ x: track.x, y: track.y, depthMeters: track.depthMeters ?? 0, timeSeconds: track.timeSeconds ?? track.t ?? 0 }));
  const distance = tracks.reduce((sum, point, index) => {
    if (index === 0) return sum;
    const previous = tracks[index - 1];
    return sum + Math.hypot(Number(point.x ?? 0) - Number(previous.x ?? 0), Number(point.y ?? 0) - Number(previous.y ?? 0));
  }, 0);
  return {
    timeSeconds: routeResult.state?.timeSeconds ?? trackEnd.timeSeconds ?? 0,
    stepCount: executionTracks.length,
    agents: [{
      id: agentId,
      status: routeResult.state?.completed ? 'complete' : 'enroute',
      x: trackEnd.x ?? routeResult.state?.x ?? 0,
      y: trackEnd.y ?? routeResult.state?.y ?? 0,
      depthMeters: trackEnd.depthMeters ?? 0,
      battery: Math.max(0, 100 - Number(routeResult.state?.energyUsed ?? 0)),
      energyUsed: routeResult.state?.energyUsed ?? 0,
      observationCount: executionObservations.length,
      sampleCount: executionObservations.length,
      history: tracks,
      metadata: { headlessRuntime: true, gliderConfigId: glider?.id ?? null }
    }],
    events: [],
    observations: executionObservations,
    terminal: true,
    terminalReason: 'headlessMissionComplete',
    rawMetrics: {
      energyUsed: routeResult.state?.energyUsed ?? 0,
      distanceTraveled: routeResult.state?.distanceTraveled ?? distance,
      hazards: routeResult.state?.hazardExposureCount ?? 0,
      observationCount: executionObservations.length,
      sampleCount: executionObservations.length,
      completed: routeResult.state?.completed === true,
      steps: executionTracks.length,
      simTime: routeResult.state?.timeSeconds ?? trackEnd.timeSeconds ?? 0,
      returnSuccess: routeResult.state?.completed === true || missionConfig?.returnSuccess === true
    }
  };
}
function buildHeadlessTerrainDiagnostics({ bathymetry = null, missionConfig = {}, scenarioId = null, episodeId = null, tracks = [], observations = [] } = {}) {
  if (!bathymetry?.depthMeters || !tracks.some((track) => Number.isFinite(Number(track.depthMeters)))) {
    return {
      supported: false,
      unsupportedReason: 'headless tracks do not include bathymetry-backed depth samples',
      summary: {
        type: 'anchor.simulation.terrain-diagnostics-summary',
        terrainEventsSupported: false,
        unsupportedReason: 'headless tracks do not include bathymetry-backed depth samples'
      },
      events: []
    };
  }
  const level = { levelId: scenarioId, bathymetry, world: { grid: { width: bathymetry.width, height: bathymetry.height } } };
  const diagnostics = TerrainSimulationDiagnostics.createTerrainSimulationDiagnostics({
    level,
    mission: { missionId: missionConfig.missionId, physics: missionConfig.physics ?? missionConfig.vehicle ?? {} }
  });
  tracks.forEach((track, index) => {
    TerrainSimulationDiagnostics.updateTerrainSimulationDiagnostics(diagnostics, {
      agentId: track.gliderId ?? track.agentId ?? missionConfig.gliders?.[0]?.id ?? 'glider-1',
      x: track.x,
      y: track.y,
      depthMeters: track.depthMeters ?? 0,
      depthLayerId: track.depthLayerId ?? track.depthLayer ?? null,
      segmentIndex: track.segmentIndex ?? track.waypointIndex ?? 0,
      tick: index,
      timeSeconds: track.timeSeconds ?? track.t ?? index
    }, { level, tick: index, timeSeconds: track.timeSeconds ?? track.t ?? index });
  });
  observations.forEach((observation, index) => {
    TerrainSimulationDiagnostics.recordTerrainSimulationObservation(diagnostics, observation, { tick: tracks.length + index, timeSeconds: observation.timeSeconds ?? observation.t ?? 0 });
  });
  TerrainSimulationDiagnostics.finalizeTerrainSimulationDiagnostics(diagnostics, { terminalReason: 'headless-episode-complete' });
  return { supported: true, summary: TerrainSimulationDiagnostics.terrainSimulationDiagnosticsSummary(diagnostics), events: diagnostics.events ?? [] };
}

function buildOptionalMotionCostArtifacts({ config, fieldPack, waterColumnConfig, bathymetry, plan, motionConfig } = {}) {
  if (config?.costGraphEnabled !== true) return { graph: null, matrix: null, graphSummary: null, matrixSummary: null, warnings: [] };
  try {
    const graph = MotionCostGraphBuilder.buildMotionCostGraph({
      config: config.costGraphConfig,
      fieldPack,
      waterColumnConfig,
      bathymetry,
      plan,
      motionConfig
    });
    const matrix = MotionCostMatrixExporter.buildMotionCostMatrix(graph, { matrixFormat: config.costGraphConfig?.matrixFormat });
    return {
      graph,
      matrix,
      graphSummary: graph.summary ?? null,
      matrixSummary: matrix.summary ?? null,
      warnings: [...(graph.warnings ?? [])]
    };
  } catch (error) {
    return {
      graph: null,
      matrix: null,
      graphSummary: null,
      matrixSummary: null,
      warnings: [`SIM-R1 cost graph generation failed: ${error?.message ?? String(error)}`]
    };
  }
}




function buildOptionalMissionScoreArtifacts({
  config,
  missionConfig,
  plan,
  scoreReport,
  observations,
  tracks,
  motionTrajectory,
  motionDiagnostics,
  missionFeasibilityReport,
  waterColumnSummary,
  scienceDiagnostics,
  motionCostGraphSummary,
  motionCostMatrixSummary,
  episodeId
} = {}) {
  if (config?.missionScoreEnabled !== true) {
    return { metrics: null, normalizedMetrics: null, missionScore: null, report: null, regretReport: null, scoreProfileSummary: null, summary: null, missionScoreSummary: null, regretSummary: null, warnings: [] };
  }
  try {
    const objectiveId = config.missionScoreConfig?.objectiveId ?? missionConfig?.objectives?.[0]?.objectiveId ?? missionConfig?.objectives?.[0]?.id ?? 'reconnaissanceSurvey';
    const profile = config.missionScoreConfig?.profileId
      ? MissionScoreProfiles.missionScoreProfileById(config.missionScoreConfig.profileId)
      : MissionScoreProfiles.missionScoreProfileForObjective(objectiveId);
    const scoreConfig = {
      ...config.missionScoreConfig,
      profileId: profile.id,
      profileVersion: profile.version,
      objectiveId,
      minimumCoverageFraction: config.missionScoreConfig?.minimumCoverageFraction ?? profile.minimumCoverageFraction,
      changesOfficialBrowserScoring: false
    };
    const metrics = MissionOutcomeMetricAdapter.extractMissionOutcomeMetrics({
      result: { scoreReport, summary: { status: 'complete' } },
      motionTrajectory,
      motionDiagnostics,
      missionFeasibilityReport,
      waterColumnSummary,
      scienceDiagnostics,
      observations,
      objective: { id: objectiveId },
      options: {
        missionId: missionConfig?.missionId ?? null,
        episodeId,
        attemptId: plan?.planId ?? plan?.id ?? null,
        objectiveId,
        visibilityTier: scoreConfig.visibilityTier,
        scoreReport
      }
    });
    metrics.sourceArtifacts.motionCostGraphSummary = { present: Boolean(motionCostGraphSummary), type: motionCostGraphSummary?.type ?? null };
    metrics.sourceArtifacts.motionCostMatrixSummary = { present: Boolean(motionCostMatrixSummary), type: motionCostMatrixSummary?.type ?? null };
    const normalizedMetrics = MissionScoreNormalizer.normalizeMissionOutcomeMetrics(metrics, profile);
    const missionScore = MissionScoreAggregator.aggregateMissionOutcomeScore({ normalizedMetrics, profile, scoreConfig });
    let regretReport = null;
    if (scoreConfig.regretReference && scoreConfig.regretReference !== 'none') {
      const candidate = MissionRegretModel.buildMissionRegretReport({
        achievedScore: missionScore,
        compatibleAttempts: config.missionScoreConfig?.compatibleAttempts ?? [],
        configuredBaseline: config.missionScoreConfig?.configuredBaseline ?? null,
        oracleAttempt: config.missionScoreConfig?.oracleAttempt ?? null,
        profile,
        scoreConfig,
        options: {
          referenceType: scoreConfig.regretReference,
          missionId: metrics.missionId,
          episodeId,
          attemptId: metrics.attemptId,
          targetAttempt: { missionScore, scoreConfig, profile, episodeId, objectiveId, visibilityTier: scoreConfig.visibilityTier }
        }
      });
      regretReport = candidate.totalRegret === null ? null : MissionScorePublicSafety.sanitizeMissionRegretReportForPublicExport(candidate);
    }
    const report = MissionScorePublicSafety.sanitizeMissionOutcomeReportForPublicExport(MissionOutcomeReport.buildMissionOutcomeReport({
      scoreConfig,
      profile,
      metrics,
      normalizedMetrics,
      missionScore,
      regretReport,
      sourceArtifacts: metrics.sourceArtifacts,
      options: { missionId: metrics.missionId, episodeId, attemptId: metrics.attemptId, objectiveId }
    }));
    return {
      metrics,
      normalizedMetrics,
      missionScore,
      report,
      regretReport,
      scoreProfileSummary: MissionScoreProfiles.missionScoreProfileSummary(profile),
      summary: MissionOutcomeReport.missionOutcomeReportSummary(report),
      missionScoreSummary: MissionScoreAggregator.missionScoreAggregationSummary(missionScore),
      regretSummary: regretReport ? regretReportSummarySafe(regretReport) : null,
      warnings: [...(metrics.warnings ?? []), ...(missionScore.warnings ?? [])]
    };
  } catch (error) {
    return { metrics: null, normalizedMetrics: null, missionScore: null, report: null, regretReport: null, scoreProfileSummary: null, summary: null, missionScoreSummary: null, regretSummary: null, warnings: [`SCORE-R1 mission outcome scoring failed: ${error?.message ?? String(error)}`] };
  }
}

function regretReportSummarySafe(report) {
  return {
    referenceType: report?.referenceType ?? 'none',
    totalRegret: report?.totalRegret ?? null,
    compatibilityStatus: report?.compatibilityStatus ?? 'unknown',
    publicSafe: report?.publicSafe !== false
  };
}

module.exports = {runHeadlessMission, runHeadlessMissionWithPlan, simulateHeadlessEpisode}