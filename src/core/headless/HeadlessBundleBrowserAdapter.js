import { validateHeadlessBundle } from './HeadlessBundleValidation.js';
import { buildHeadlessBundleViewModel, headlessBundleBathymetrySummary, headlessBundleDepthLayerPrioritySummary, headlessBundleMissionGeometrySummary, headlessBundleMotionSummary, headlessBundleMotionCostGraphSummary, headlessBundleMissionFeasibilitySummary, headlessBundleMissionOutcomeSummary, headlessBundleObservationSummary, headlessBundleReplaySummary, headlessBundleRoundtripSummary, headlessBundleScienceDiagnosisSummary, headlessBundleScoreSummary, headlessBundleWaterColumnSummary, headlessBundleTrackSummary, headlessBundleVisibilitySummary } from './HeadlessBundleViewModel.js';
import { BROWSER_HEADLESS_ROUNDTRIP_SUMMARY_TYPE, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE } from './HeadlessRoundtripTypes.js';

export const HEADLESS_BUNDLE_BROWSER_ADAPTER_VERSION = 'headless-bundle-browser-adapter-h2';

export function buildBrowserHeadlessBundleSummaryArtifact(bundle = {}) {
  const validation = validateHeadlessBundle(bundle);
  const viewModel = buildHeadlessBundleViewModel(bundle);
  return {
    type: 'anchor.browser.headless-bundle-summary',
    version: HEADLESS_BUNDLE_BROWSER_ADAPTER_VERSION,
    sourceBundleType: bundle.manifest?.bundleType ?? bundle.type ?? null,
    scenarioId: viewModel.manifestSummary.scenarioId,
    missionId: viewModel.manifestSummary.missionId,
    episodeId: viewModel.manifestSummary.episodeId,
    seed: viewModel.manifestSummary.seed,
    visibilitySummary: headlessBundleVisibilitySummary(bundle, validation),
    fieldSummary: viewModel.fieldCards.map(({ id, visibilityTier, hidden, shape, finiteSummary }) => ({ id, visibilityTier, hidden, shape, finiteSummary })),
    observationSummary: headlessBundleObservationSummary(bundle),
    trackSummary: headlessBundleTrackSummary(bundle),
    motionSummary: headlessBundleMotionSummary(bundle),
    missionFeasibilitySummary: headlessBundleMissionFeasibilitySummary(bundle),
    motionCostGraphSummary: headlessBundleMotionCostGraphSummary(bundle),
    missionOutcomeSummary: headlessBundleMissionOutcomeSummary(bundle),
    scoreSummary: buildBrowserHeadlessScoreComparisonDescriptor(bundle),
    roundtripSummary: headlessBundleRoundtripSummary(bundle),
    waterColumnSummary: headlessBundleWaterColumnSummary(bundle),
    bathymetrySummary: headlessBundleBathymetrySummary(bundle),
    missionGeometrySummary: headlessBundleMissionGeometrySummary(bundle),
    depthLayerPrioritySummary: headlessBundleDepthLayerPrioritySummary(bundle),
    scienceDiagnosisSummary: headlessBundleScienceDiagnosisSummary(bundle),
    replaySummary: headlessBundleReplaySummary(bundle),
    replayPlayback: viewModel.replayPlayback ?? null,
    validation,
    notes: ['Browser-side summary artifact for inspecting a Node/OceanBox-JS headless bundle.'],
    notA: ['not browser official score', 'not calibrated ocean model', 'not production data assimilation', 'not Python simulator', 'not MARL/RL']
  };
}

export function buildBrowserHeadlessRoundtripSummaryArtifact(bundle = {}) {
  const validation = validateHeadlessBundle(bundle);
  const roundtripSummary = headlessBundleRoundtripSummary(bundle);
  return {
    type: BROWSER_HEADLESS_ROUNDTRIP_SUMMARY_TYPE,
    version: HEADLESS_BUNDLE_BROWSER_ADAPTER_VERSION,
    sourceBundleType: bundle.manifest?.bundleType ?? bundle.type ?? null,
    sourceReportType: roundtripSummary.type,
    canonicalReportType: roundtripSummary.canonicalType ?? HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE,
    packetId: roundtripSummary.packetId,
    planId: roundtripSummary.planId,
    selectedAgentId: roundtripSummary.selectedAgentId,
    solverPacketValidationStatus: roundtripSummary.solverPacketValidationStatus,
    planValidationStatus: roundtripSummary.planValidationStatus,
    executionStatus: roundtripSummary.executionStatus,
    visibilityRisk: roundtripSummary.visibilityRisk,
    hiddenTruthExported: roundtripSummary.hiddenTruthExported,
    hiddenTruthLeakStatus: roundtripSummary.hiddenTruthLeakStatus,
    finalScore: roundtripSummary.finalScore,
    observationCount: roundtripSummary.observationCount,
    trackPointCount: roundtripSummary.trackPointCount,
    usesGeneratedPlan: roundtripSummary.usesGeneratedPlan,
    usesNewPlanner: roundtripSummary.usesNewPlanner,
    usesPythonSimulator: roundtripSummary.usesPythonSimulator,
    usesNodeHeadlessRuntime: roundtripSummary.usesNodeHeadlessRuntime,
    usesBrowserOfficialScoring: roundtripSummary.usesBrowserOfficialScoring,
    usesMARL: roundtripSummary.usesMARL,
    usesMotionDynamics: roundtripSummary.usesMotionDynamics === true,
    usesWebGPUFluid: roundtripSummary.usesWebGPUFluid === true,
    motionSummary: headlessBundleMotionSummary(bundle),
    missionFeasibilitySummary: headlessBundleMissionFeasibilitySummary(bundle),
    motionCostGraphSummary: headlessBundleMotionCostGraphSummary(bundle),
    missionOutcomeSummary: headlessBundleMissionOutcomeSummary(bundle),
    waterColumnSummary: headlessBundleWaterColumnSummary(bundle),
    bathymetrySummary: headlessBundleBathymetrySummary(bundle),
    missionGeometrySummary: headlessBundleMissionGeometrySummary(bundle),
    depthLayerPrioritySummary: headlessBundleDepthLayerPrioritySummary(bundle),
    scienceDiagnosisSummary: headlessBundleScienceDiagnosisSummary(bundle),
    validationStatus: validation.status,
    bundleVisibilityRisk: validation.visibilityRisk,
    notes: ['Browser-side summary artifact for a solver-packet / plan / Node-headless roundtrip.'],
    notA: ['not browser official score', 'not calibrated ocean model', 'not Python simulator', 'not route planner', 'not MARL/RL']
  };
}
export function buildBrowserHeadlessReplayDescriptor(bundle = {}) {
  return { type: 'anchor.browser.headless-replay-descriptor', ...headlessBundleReplaySummary(bundle), officialBrowserReplay: false };
}

export function buildBrowserHeadlessObservationTable(bundle = {}) {
  return (bundle.observations ?? []).map((row, index) => ({ index, observationId: row.observationId ?? `obs-${index + 1}`, timeSeconds: row.timeSeconds ?? null, gliderId: row.gliderId ?? null, x: row.x ?? null, y: row.y ?? null, observedValue: row.observedValue ?? row.value ?? null, surprise: row.surprise ?? null }));
}

export function buildBrowserHeadlessTrackTable(bundle = {}) {
  return (bundle.gliderTracks ?? []).map((row, index) => ({ index, timeSeconds: row.timeSeconds ?? null, gliderId: row.gliderId ?? null, x: row.x ?? null, y: row.y ?? null, zIndex: row.zIndex ?? null, energyUsedIncrement: row.energyUsedIncrement ?? null, hazard: row.hazard ?? null }));
}

export function buildBrowserHeadlessScoreComparisonDescriptor(bundle = {}) {
  const summary = headlessBundleScoreSummary(bundle);
  return {
    ...summary,
    headlessScoreIsOfficialBrowserScore: false,
    comparisonNote: 'Headless score is an educational Node runtime score. Browser ANCHOR remains the official visual referee and browser scoring UI.'
  };
}

export function buildBrowserHeadlessBundleDebugObject(bundle = {}) {
  const validation = validateHeadlessBundle(bundle);
  const viewModel = buildHeadlessBundleViewModel(bundle);
  const roundtrip = viewModel.roundtripSummary ?? {};
  const science = viewModel.scienceDiagnosisSummary ?? headlessBundleScienceDiagnosisSummary(bundle);
  const waterColumn = viewModel.waterColumnSummary ?? headlessBundleWaterColumnSummary(bundle);
  const depthPriority = viewModel.depthLayerPrioritySummary ?? headlessBundleDepthLayerPrioritySummary(bundle);
  const motion = viewModel.motionSummary ?? headlessBundleMotionSummary(bundle);
  const feasibility = viewModel.missionFeasibilitySummary ?? headlessBundleMissionFeasibilitySummary(bundle);
  const motionCostGraph = viewModel.motionCostGraphSummary ?? headlessBundleMotionCostGraphSummary(bundle);
  const missionOutcome = viewModel.missionOutcomeSummary ?? headlessBundleMissionOutcomeSummary(bundle);
  const bathymetry = viewModel.bathymetrySummary ?? headlessBundleBathymetrySummary(bundle);
  const missionGeometry = viewModel.missionGeometrySummary ?? headlessBundleMissionGeometrySummary(bundle);
  const replay = viewModel.replaySummary ?? headlessBundleReplaySummary(bundle);
  const replayPlayback = viewModel.replayPlayback ?? null;
  return {
    version: HEADLESS_BUNDLE_BROWSER_ADAPTER_VERSION,
    bundleLoaded: Boolean(bundle?.manifest || bundle?.visibleFields),
    bundleStatus: validation.status,
    scenarioId: viewModel.manifestSummary.scenarioId,
    missionId: viewModel.manifestSummary.missionId,
    episodeId: viewModel.manifestSummary.episodeId,
    seed: viewModel.manifestSummary.seed,
    validationStatus: validation.status,
    visibilityRisk: validation.visibilityRisk,
    visibleFieldIds: viewModel.visibilitySummary.visibleFieldIds,
    hiddenFieldExported: viewModel.visibilitySummary.hiddenFieldExported,
    observationCount: viewModel.observationSummary.count,
    trackPointCount: viewModel.trackSummary.count,
    finalScore: viewModel.scoreSummary.finalScore,
    roundtripLoaded: Boolean(bundle.roundtripReport),
    roundtripReportLoaded: Boolean(bundle.roundtripReport),
    roundtripStatus: roundtrip.status ?? null,
    roundtripReportType: roundtrip.type ?? null,
    roundtripCanonicalType: roundtrip.canonicalType ?? null,
    solverPacketValidationStatus: roundtrip.solverPacketValidationStatus ?? null,
    planValidationStatus: roundtrip.planValidationStatus ?? null,
    roundtripExecutionStatus: roundtrip.executionStatus ?? null,
    roundtripVisibilityRisk: roundtrip.visibilityRisk ?? null,
    roundtripSummaryExportAvailable: Boolean(bundle.roundtripReport),
    replayLoaded: replay.present === true,
    replayMode: replay.replayMode ?? null,
    replayFidelity: replay.replayFidelity ?? null,
    replayCompatibilityStatus: replay.compatibilityStatus ?? null,
    replayAlignmentStatus: replay.alignmentStatus ?? null,
    replayEventCount: replay.eventCount ?? 0,
    replayCheckpointCount: replay.checkpointCount ?? 0,
    replayCurrentTick: replayPlayback?.currentTick ?? null,
    replayTerminalDigest: replay.terminalDigest ?? null,
    replayObjectiveTransitionCount: replay.objectiveTransitionCount ?? 0,
    replaySurfacingCount: replay.surfacingCount ?? 0,
    replayHiddenTruthIncluded: replay.hiddenTruthIncluded === true,
    replayPublicSafe: replay.publicSafe !== false,
    replayChangesOfficialBrowserScoring: false,
    hasMotionTrajectory: motion.present === true,
    hasMotionDiagnostics: Boolean(bundle.motionDiagnostics ?? bundle.episode?.motionDiagnostics ?? bundle.episode?.motionTrajectory?.motionDiagnostics),
    motionModelId: motion.motionModelId ?? null,
    plannedDistance: motion.plannedDistance ?? 0,
    realizedDistance: motion.realizedDistance ?? 0,
    meanTrackError: motion.meanTrackError ?? 0,
    maxTrackError: motion.maxTrackError ?? 0,
    driftDistance: motion.driftDistance ?? 0,
    energyUsed: motion.energyUsed ?? 0,
    usesMotionDynamics: motion.present === true,
    hasMissionFeasibilityReport: feasibility.present === true,
    hasMotionCostGraph: motionCostGraph.present === true,
    hasMotionCostMatrix: motionCostGraph.hasMotionCostMatrix === true,
    motionCostGraphNodeCount: motionCostGraph.nodeCount ?? 0,
    motionCostGraphEdgeCount: motionCostGraph.edgeCount ?? 0,
    motionCostGraphMetricId: motionCostGraph.metricId ?? null,
    motionCostMatrixFormat: motionCostGraph.matrixFormat ?? null,
    motionCostGraphPublicSafe: motionCostGraph.publicSafe !== false && motionCostGraph.hiddenTruthIncluded !== true,
    motionCostGraphUsesRouteOptimizer: motionCostGraph.usesRouteOptimizer === true,
    hasMissionOutcomeReport: missionOutcome.present === true,
    hasMissionScore: missionOutcome.hasMissionScore === true,
    hasRegretReport: missionOutcome.hasRegretReport === true,
    missionScoreProfileId: missionOutcome.scoreProfileId ?? null,
    missionScoreProfileVersion: missionOutcome.scoreProfileVersion ?? null,
    missionCompositeScore: missionOutcome.compositeScore ?? null,
    missionScienceScore: missionOutcome.scienceScore ?? null,
    missionFeasibilityScore: missionOutcome.feasibilityScore ?? null,
    missionEfficiencyScore: missionOutcome.efficiencyScore ?? null,
    missionSafetyScore: missionOutcome.safetyScore ?? null,
    missionScoreCoverageFraction: missionOutcome.coverageFraction ?? 0,
    missionRegretReferenceType: missionOutcome.regretReferenceType ?? null,
    missionTotalRegret: missionOutcome.totalRegret ?? null,
    usesMissionOutcomeScoring: missionOutcome.usesMissionOutcomeScoring === true,
    changesOfficialBrowserScoring: false,
    usesRouteOptimizer: false,
    feasibilityStatus: feasibility.feasibilityStatus ?? null,
    missionDurationSeconds: feasibility.missionDurationSeconds ?? 0,
    energyRemaining: feasibility.energyRemaining ?? null,
    batteryFraction: feasibility.batteryFraction ?? motion.batteryFraction ?? null,
    waypointValidationStatus: feasibility.waypointArrivalStatus ?? null,
    bottomClearanceWarnings: feasibility.bottomClearanceWarnings ?? 0,
    constraintViolations: feasibility.constraintViolations ?? 0,
    usesWebGPUFluid: false,
    usesSeaExplorerValidatedModel: false,
    hasScienceDiagnostics: science.present === true,
    sciencePrimaryDiagnosis: science.primaryDiagnosis ?? null,
    scienceForecastCorrectionStatus: science.forecastCorrectionStatus ?? null,
    scienceHiddenEventStatus: science.hiddenEventStatus ?? null,
    scienceRecommendedObjective: science.recommendedObjectiveId ?? null,
    scienceDiagnosticsPublicSafe: science.publicSafe !== false && science.hiddenTruthIncluded !== true,
    scienceDiagnosisIsPlannerAuthority: false,
    hasWaterColumnSummary: waterColumn.present === true,
    waterColumnLayerIds: waterColumn.waterColumnLayerIds ?? [],
    waterColumnDefaultLayers: waterColumn.waterColumnDefaultLayers ?? [],
    diveProfileId: waterColumn.diveProfileId ?? null,
    observationCountsByDepth: waterColumn.observationCountsByDepth ?? {},
    verticalCoverage: waterColumn.verticalCoverage ?? null,
    bestDepthLayerCounts: depthPriority.bestDepthLayerCounts ?? waterColumn.bestDepthLayerCounts ?? {},
    waterColumnPublicSafe: waterColumn.publicSafe !== false,
    hasBathymetrySummary: bathymetry.present === true,
    bathymetryDepthRange: bathymetry.depthRange ?? null,
    bathymetryFeatureIds: bathymetry.featureIds ?? [],
    surfaceWaypointCount: missionGeometry.surfaceWaypointCount ?? 0,
    samplingPointCount: missionGeometry.samplingPointCount ?? 0,
    plannedPathPointCount: missionGeometry.plannedPathPointCount ?? 0,
    realizedTrajectoryPointCount: missionGeometry.realizedTrajectoryPointCount ?? 0,
    hasDiveProfilePath: missionGeometry.hasDiveProfilePath === true,
    bathymetryViewMode: bathymetry.bathymetryViewMode ?? null,
    usesFull3DPlanning: waterColumn.usesFull3DPlanning === true || depthPriority.usesFull3DPlanning === true || bathymetry.usesFull3DPlanning === true || missionGeometry.usesFull3DPlanning === true,
    usesHydrodynamicSolver: bathymetry.usesHydrodynamicSolver === true || missionGeometry.usesHydrodynamicSolver === true,
    usesTerrainFlowAsOceanCurrent: bathymetry.usesTerrainFlowAsOceanCurrent === true || missionGeometry.usesTerrainFlowAsOceanCurrent === true,
    usesProductionDataAssimilation: science.usesProductionDataAssimilation === true,
    browserSummaryExportAvailable: true,
    usesGeneratedPlan: roundtrip.usesGeneratedPlan === true,
    usesBrowserOfficialScoring: false,
    usesPythonSimulator: false,
    usesNodeHeadlessRuntime: true,
    usesNewPlanner: false,
    usesMARL: false
  };
}






