import { validateHeadlessBundle } from './HeadlessBundleValidation.js';
import { HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, isHeadlessRoundtripReportType } from './HeadlessRoundtripTypes.js';
import { trajectoryMotionSummary } from '../motion/GliderTrajectorySimulator.js';
import { missionFeasibilityReportSummary } from '../motion/MissionFeasibilityReport.js';
import { motionCostGraphSummary as summarizeMotionCostGraph } from '../motion/MotionCostGraphBuilder.js';
import { motionCostMatrixSummary as summarizeMotionCostMatrix } from '../motion/MotionCostMatrixExporter.js';
import { missionOutcomeReportSummary } from '../scoring/MissionOutcomeReport.js';
import { missionRegretReportSummary } from '../scoring/MissionRegretModel.js';
import { buildMissionScorecardViewModel } from '../scoring/MissionScorecardViewModel.js';
import { createReplayPlaybackState, replayPlaybackSummary } from '../replay/ReplayPlayback.js';
import { replayArtifactsSummary } from '../replay/ReplaySchema.js';
import { verifyReplayIntegrity } from '../replay/ReplayIntegrityVerifier.js';

export const HEADLESS_BUNDLE_VIEW_MODEL_VERSION = 'headless-bundle-view-model-h2';

export function buildHeadlessBundleViewModel(bundle = {}) {
  const validation = validateHeadlessBundle(bundle);
  return {
    version: HEADLESS_BUNDLE_VIEW_MODEL_VERSION,
    type: 'anchor.headless.bundle-view-model',
    bundleStatus: validation.status,
    manifestSummary: manifestSummary(bundle),
    missionSummary: missionSummary(bundle),
    fieldCards: headlessBundleFieldCards(bundle),
    observationSummary: headlessBundleObservationSummary(bundle),
    trackSummary: headlessBundleTrackSummary(bundle),
    motionSummary: headlessBundleMotionSummary(bundle),
    missionFeasibilitySummary: headlessBundleMissionFeasibilitySummary(bundle),
    motionCostGraphSummary: headlessBundleMotionCostGraphSummary(bundle),
    missionOutcomeSummary: headlessBundleMissionOutcomeSummary(bundle),
    missionScorecard: headlessBundleMissionScorecardViewModel(bundle),
    scoreSummary: headlessBundleScoreSummary(bundle),
    roundtripSummary: headlessBundleRoundtripSummary(bundle),
    waterColumnSummary: headlessBundleWaterColumnSummary(bundle),
    bathymetrySummary: headlessBundleBathymetrySummary(bundle),
    missionGeometrySummary: headlessBundleMissionGeometrySummary(bundle),
    depthLayerPrioritySummary: headlessBundleDepthLayerPrioritySummary(bundle),
    scienceDiagnosisSummary: headlessBundleScienceDiagnosisSummary(bundle),
    replaySummary: headlessBundleReplaySummary(bundle),
    replayPlayback: headlessBundleReplayPlayback(bundle),
    visibilitySummary: headlessBundleVisibilitySummary(bundle, validation),
    validation,
    warnings: validation.warnings,
    failures: validation.failures,
    explanation: 'Loaded headless bundles are for inspection and comparison. Browser ANCHOR remains the official visual referee and browser scoring UI.',
    notA: ['not browser official score', 'not calibrated ocean model', 'not production data assimilation', 'not Python simulator', 'not MARL/RL']
  };
}

export function headlessBundleFieldCards(bundle = {}) {
  const visibleFields = bundle.visibleFields?.fields ?? {};
  const hiddenFields = bundle.hiddenFields?.fields ?? {};
  return [
    ...Object.keys(visibleFields).map((id) => fieldCard(id, visibleFields[id], bundle.visibleFields?.fieldVisibility?.[id] ?? 'publicScenario', false)),
    ...Object.keys(hiddenFields).map((id) => fieldCard(id, hiddenFields[id], bundle.hiddenFields?.fieldVisibility?.[id] ?? 'hiddenTruth', true))
  ];
}

export function headlessBundleObservationSummary(bundle = {}) {
  const observations = Array.isArray(bundle.observations) ? bundle.observations : [];
  return {
    count: observations.length,
    gliderCount: new Set(observations.map((row) => row.gliderId).filter(Boolean)).size,
    meanObservedValue: mean(observations.map((row) => row.observedValue ?? row.value)),
    meanSurprise: mean(observations.map((row) => row.surprise)),
    firstTimeSeconds: min(observations.map((row) => row.timeSeconds)),
    lastTimeSeconds: max(observations.map((row) => row.timeSeconds))
  };
}

export function headlessBundleTrackSummary(bundle = {}) {
  const tracks = Array.isArray(bundle.gliderTracks) ? bundle.gliderTracks : [];
  return {
    count: tracks.length,
    gliderCount: new Set(tracks.map((row) => row.gliderId).filter(Boolean)).size,
    totalEnergyIncrement: sum(tracks.map((row) => row.energyUsedIncrement)),
    hazardSamples: tracks.filter((row) => Number(row.hazard ?? 0) >= 0.35).length,
    firstTimeSeconds: min(tracks.map((row) => row.timeSeconds)),
    lastTimeSeconds: max(tracks.map((row) => row.timeSeconds))
  };
}

export function headlessBundleMotionSummary(bundle = {}) {
  const trajectory = bundle.motionTrajectory ?? bundle.episode?.motionTrajectory ?? bundle.roundtripReport?.episode?.motionTrajectory ?? null;
  const diagnostics = bundle.motionDiagnostics ?? bundle.episode?.motionDiagnostics ?? trajectory?.motionDiagnostics ?? bundle.roundtripReport?.motionDiagnostics ?? null;
  const reportSummary = bundle.roundtripReport?.motionSummary ?? null;
  if (!trajectory && !diagnostics && !reportSummary) {
    return {
      present: false,
      hasMotionTrajectory: false,
      motionModelId: null,
      plannedDistance: 0,
      realizedDistance: 0,
      meanTrackError: 0,
      maxTrackError: 0,
      driftDistance: 0,
      currentAssistMean: 0,
      currentOppositionMean: 0,
      crossCurrentMean: 0,
      energyUsed: 0,
      sampledPointCount: 0,
      arrivalStatus: 'not-present',
      usesMotionDynamics: false,
      usesNewPlanner: false,
      usesWebGPUFluid: false,
      usesMARL: false
    };
  }
  const summary = trajectory ? trajectoryMotionSummary(trajectory) : reportSummary ?? diagnostics?.summary ?? diagnostics;
  return {
    present: true,
    hasMotionTrajectory: Boolean(trajectory),
    motionModelId: summary.motionModelId ?? trajectory?.motionModelId ?? reportSummary?.motionModelId ?? null,
    plannedDistance: summary.plannedDistance ?? 0,
    realizedDistance: summary.realizedDistance ?? 0,
    meanTrackError: summary.meanTrackError ?? summary.trackErrorMean ?? 0,
    maxTrackError: summary.maxTrackError ?? summary.trackErrorMax ?? 0,
    driftDistance: summary.driftDistance ?? 0,
    currentAssistMean: summary.currentAssistMean ?? diagnostics?.currentAssistMean ?? 0,
    currentOppositionMean: summary.currentOppositionMean ?? diagnostics?.currentOppositionMean ?? 0,
    crossCurrentMean: summary.crossCurrentMean ?? diagnostics?.crossCurrentMean ?? 0,
    energyUsed: summary.energyUsed ?? diagnostics?.energyUsed ?? 0,
    sampledPointCount: summary.sampledPointCount ?? diagnostics?.sampleCoverageCount ?? trajectory?.sampledObservations?.length ?? 0,
    arrivalStatus: summary.arrivalStatus ?? diagnostics?.arrivalStatus ?? 'unknown',
    warningCount: summary.warningCount ?? trajectory?.warnings?.length ?? 0,
    usesMotionDynamics: true,
    usesNewPlanner: false,
    usesWebGPUFluid: false,
    usesMARL: false
  };
}
export function headlessBundleMissionFeasibilitySummary(bundle = {}) {
  const report = bundle.missionFeasibilityReport
    ?? bundle.episode?.missionFeasibilityReport
    ?? bundle.roundtripReport?.missionFeasibilityReport
    ?? null;
  const summary = bundle.missionFeasibilitySummary
    ?? bundle.episode?.missionFeasibilitySummary
    ?? bundle.episode?.diagnostics?.missionFeasibilitySummary
    ?? bundle.roundtripReport?.missionFeasibilitySummary
    ?? bundle.roundtripReport?.episode?.missionFeasibilitySummary
    ?? null;
  if (!report && !summary) {
    return {
      present: false,
      hasMissionFeasibilityReport: false,
      feasibilityStatus: 'not-present',
      missionDurationSeconds: 0,
      energyRemaining: null,
      batteryFraction: null,
      waypointArrivalStatus: 'not-present',
      bottomClearanceWarnings: 0,
      constraintViolations: 0,
      usesMotionDynamics: false,
      usesNewPlanner: false,
      usesWebGPUFluid: false,
      usesSeaExplorerValidatedModel: false,
      usesMARL: false,
      browserOfficialScoring: false
    };
  }
  const normalized = report ? missionFeasibilityReportSummary(report) : summary;
  return {
    present: true,
    hasMissionFeasibilityReport: Boolean(report),
    feasibilityStatus: normalized.feasibilityStatus ?? 'unknown',
    missionDurationSeconds: normalized.missionDurationSeconds ?? 0,
    plannedDistance: normalized.plannedDistance ?? 0,
    realizedDistance: normalized.realizedDistance ?? 0,
    energyUsed: normalized.energyUsed ?? 0,
    energyRemaining: normalized.energyRemaining ?? null,
    batteryFraction: normalized.batteryFraction ?? null,
    meanTrackError: normalized.meanTrackError ?? 0,
    maxTrackError: normalized.maxTrackError ?? 0,
    driftDistance: normalized.driftDistance ?? 0,
    waypointArrivalStatus: normalized.waypointArrivalStatus ?? 'unknown',
    missedWaypointCount: normalized.missedWaypointCount ?? 0,
    bottomClearanceWarnings: normalized.bottomClearanceWarnings ?? 0,
    constraintViolations: normalized.constraintViolations ?? 0,
    sampleCoverageCount: normalized.sampleCoverageCount ?? 0,
    usesMotionDynamics: normalized.usesMotionDynamics === true,
    usesNewPlanner: normalized.usesNewPlanner === true,
    usesWebGPUFluid: normalized.usesWebGPUFluid === true,
    usesSeaExplorerValidatedModel: normalized.usesSeaExplorerValidatedModel === true,
    usesMARL: normalized.usesMARL === true,
    browserOfficialScoring: normalized.browserOfficialScoring === true
  };
}

export function headlessBundleMotionCostGraphSummary(bundle = {}) {
  const graph = bundle.motionCostGraph ?? bundle.episode?.motionCostGraph ?? bundle.roundtripReport?.motionCostGraph ?? null;
  const matrix = bundle.motionCostMatrix ?? bundle.episode?.motionCostMatrix ?? bundle.roundtripReport?.motionCostMatrix ?? null;
  const graphSummary = bundle.motionCostGraphSummary
    ?? bundle.episode?.motionCostGraphSummary
    ?? bundle.episode?.diagnostics?.motionCostGraphSummary
    ?? bundle.roundtripReport?.motionCostGraphSummary
    ?? graph?.summary
    ?? null;
  const matrixSummary = bundle.motionCostMatrixSummary
    ?? bundle.episode?.motionCostMatrixSummary
    ?? bundle.episode?.diagnostics?.motionCostMatrixSummary
    ?? bundle.roundtripReport?.motionCostMatrixSummary
    ?? matrix?.summary
    ?? null;
  if (!graph && !matrix && !graphSummary && !matrixSummary) {
    return {
      present: false,
      hasMotionCostGraph: false,
      hasMotionCostMatrix: false,
      nodeCount: 0,
      edgeCount: 0,
      feasibleEdgeCount: 0,
      matrixFormat: null,
      meanWeightedCost: 0,
      usesNewPlanner: false,
      usesRouteOptimizer: false,
      usesMARL: false,
      browserOfficialScoring: false
    };
  }
  const normalizedGraph = graph ? summarizeMotionCostGraph(graph) : graphSummary ?? {};
  const normalizedMatrix = matrix ? summarizeMotionCostMatrix(matrix) : matrixSummary ?? {};
  return {
    present: true,
    hasMotionCostGraph: Boolean(graph ?? graphSummary),
    hasMotionCostMatrix: Boolean(matrix ?? matrixSummary),
    graphId: normalizedGraph.graphId ?? normalizedMatrix.graphId ?? null,
    metricId: normalizedGraph.metricId ?? normalizedMatrix.metricId ?? null,
    nodeSourceId: normalizedGraph.nodeSourceId ?? null,
    neighborMode: normalizedGraph.neighborMode ?? null,
    directed: normalizedGraph.directed !== false,
    nodeCount: normalizedGraph.nodeCount ?? normalizedMatrix.nodeCount ?? 0,
    edgeCount: normalizedGraph.edgeCount ?? normalizedMatrix.edgeCount ?? 0,
    feasibleEdgeCount: normalizedGraph.feasibleEdgeCount ?? normalizedMatrix.edgeCount ?? 0,
    blockedEdgeCount: normalizedGraph.blockedEdgeCount ?? 0,
    matrixFormat: normalizedMatrix.matrixFormat ?? normalizedGraph.matrixFormat ?? null,
    finiteCostCount: normalizedMatrix.finiteCostCount ?? 0,
    meanWeightedCost: normalizedGraph.meanWeightedCost ?? normalizedMatrix.meanCost ?? 0,
    meanEnergyCost: normalizedGraph.meanEnergyCost ?? 0,
    meanDurationSeconds: normalizedGraph.meanDurationSeconds ?? 0,
    meanCurrentAssist: normalizedGraph.meanCurrentAssist ?? 0,
    meanCurrentOpposition: normalizedGraph.meanCurrentOpposition ?? 0,
    meanCrossCurrent: normalizedGraph.meanCrossCurrent ?? 0,
    publicSafe: normalizedGraph.publicSafe !== false && normalizedMatrix.publicSafe !== false,
    hiddenTruthIncluded: normalizedGraph.hiddenTruthIncluded === true || normalizedMatrix.hiddenTruthIncluded === true,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false,
    browserOfficialScoring: false
  };
}
export function headlessBundleMissionOutcomeSummary(bundle = {}) {
  const report = bundle.missionOutcomeReport ?? bundle.episode?.missionOutcomeReport ?? bundle.roundtripReport?.missionOutcomeReport ?? null;
  const missionScore = bundle.missionScore ?? bundle.episode?.missionScore ?? null;
  const scoreProfile = bundle.scoreProfileSummary ?? bundle.episode?.scoreProfileSummary ?? report?.scoreProfile ?? null;
  const regretReport = bundle.regretReport ?? bundle.episode?.regretReport ?? bundle.roundtripReport?.regretReport ?? null;
  if (!report && !missionScore) {
    return {
      present: false,
      hasMissionOutcomeReport: false,
      hasMissionScore: false,
      hasRegretReport: false,
      scoreProfileId: null,
      scoreProfileVersion: null,
      compositeScore: null,
      scienceScore: null,
      feasibilityScore: null,
      efficiencyScore: null,
      safetyScore: null,
      coverageFraction: 0,
      missingMetricCount: 0,
      usesMissionOutcomeScoring: false,
      changesOfficialBrowserScoring: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false,
      usesMARL: false
    };
  }
  const summary = report ? missionOutcomeReportSummary(report) : {};
  const regretSummary = regretReport ? missionRegretReportSummary(regretReport) : report?.regretSummary ?? null;
  return {
    present: true,
    hasMissionOutcomeReport: Boolean(report),
    hasMissionScore: Boolean(missionScore),
    hasRegretReport: Boolean(regretReport ?? report?.regretSummary),
    scoreProfileId: summary.scoreProfileId ?? scoreProfile?.profileId ?? scoreProfile?.id ?? null,
    scoreProfileVersion: summary.scoreProfileVersion ?? scoreProfile?.profileVersion ?? scoreProfile?.version ?? null,
    scoreStatus: summary.scoreStatus ?? missionScore?.status ?? null,
    compositeScore: summary.compositeScore ?? missionScore?.compositeScore ?? null,
    scienceScore: summary.scienceScore ?? groupScore(missionScore, 'science'),
    feasibilityScore: summary.feasibilityScore ?? groupScore(missionScore, 'feasibility'),
    efficiencyScore: summary.efficiencyScore ?? groupScore(missionScore, 'efficiency'),
    safetyScore: summary.safetyScore ?? groupScore(missionScore, 'safety'),
    coverageFraction: summary.coverageFraction ?? missionScore?.coverageFraction ?? 0,
    missingMetricCount: summary.missingMetricCount ?? report?.missingMetrics?.length ?? 0,
    strongestOutcome: summary.strongestOutcome ?? report?.explanations?.strongestOutcome ?? null,
    largestOpportunity: summary.largestOpportunity ?? report?.explanations?.largestWeakness ?? null,
    regretSummary,
    regretReferenceType: regretSummary?.referenceType ?? null,
    totalRegret: regretSummary?.totalRegret ?? null,
    compatibilityStatus: regretSummary?.compatibilityStatus ?? 'noReference',
    usesMissionOutcomeScoring: true,
    changesOfficialBrowserScoring: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  };
}

export function headlessBundleMissionScorecardViewModel(bundle = {}) {
  const report = bundle.missionOutcomeReport ?? bundle.episode?.missionOutcomeReport ?? bundle.roundtripReport?.missionOutcomeReport ?? null;
  return buildMissionScorecardViewModel({
    missionOutcomeReport: report,
    regretReport: bundle.regretReport ?? bundle.episode?.regretReport ?? bundle.roundtripReport?.regretReport ?? null,
    scoreProfile: bundle.scoreProfileSummary ?? bundle.episode?.scoreProfileSummary ?? null
  });
}

function groupScore(missionScore = {}, groupId) {
  return (missionScore?.groupScores ?? []).find((group) => group.groupId === groupId)?.score ?? null;
}
export function headlessBundleScoreSummary(bundle = {}) {
  const report = bundle.scoreReport ?? {};
  return {
    finalScore: report.finalScore ?? report.final_score ?? null,
    notBrowserOfficialScoring: report.notBrowserOfficialScoring === true,
    educationalHeadlessScoring: report.educationalHeadlessScoring === true,
    components: report.components ?? {},
    counts: report.counts ?? {}
  };
}

export function headlessBundleRoundtripSummary(bundle = {}) {
  const report = bundle.roundtripReport ?? {};
  const type = report.type ?? null;
  const canonicalType = report.canonicalType ?? (isHeadlessRoundtripReportType(type) ? HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE : null);
  const hiddenTruthExported = report.summary?.hiddenTruthExported ?? report.output?.hiddenTruthExported ?? false;
  const hiddenLeakStatus = report.hiddenTruthLeakCheck?.status ?? null;
  return {
    present: Boolean(bundle.roundtripReport),
    type,
    reportType: type,
    canonicalType,
    legacyType: report.legacyType ?? null,
    status: report.summary?.status ?? null,
    solverPacketValidationStatus: report.visibilityValidation?.status ?? null,
    visibilityValidationStatus: report.visibilityValidation?.status ?? null,
    planValidationStatus: report.planValidation?.status ?? null,
    executionStatus: report.summary?.status ?? null,
    packetId: report.source?.packetId ?? null,
    planId: report.source?.planId ?? null,
    selectedAgentId: report.source?.selectedAgentId ?? null,
    finalScore: report.summary?.finalScore ?? report.episode?.scoreSummary?.finalScore ?? null,
    observationCount: report.summary?.observationCount ?? report.episode?.observationCount ?? null,
    trackPointCount: report.summary?.trackPointCount ?? report.episode?.trackPointCount ?? null,
    hiddenTruthExported,
    hiddenTruthLeakStatus: hiddenLeakStatus,
    visibilityRisk: hiddenLeakStatus === 'FAIL' ? 'high' : hiddenTruthExported ? 'medium' : 'low',
    browserOfficialScoring: report.summary?.browserOfficialScoring ?? false,
    usesNodeHeadlessRuntime: report.runtime?.usesNodeHeadlessRuntime === true,
    usesBrowserOfficialScoring: report.runtime?.usesBrowserOfficialScoring === true || report.summary?.browserOfficialScoring === true,
    usesPythonSimulator: report.runtime?.usesPythonSimulator === true,
    usesNewPlanner: report.runtime?.usesNewPlanner === true,
    usesMARL: report.runtime?.usesMARL === true,
    usesMotionDynamics: report.runtime?.usesMotionDynamics === true || Boolean(report.motionSummary),
    usesWebGPUFluid: report.runtime?.usesWebGPUFluid === true,
    motionSummary: report.motionSummary ?? report.episode?.motionSummary ?? null,
    missionFeasibilitySummary: report.missionFeasibilitySummary ?? report.episode?.missionFeasibilitySummary ?? null,
    hasMissionFeasibilityReport: report.summary?.hasMissionFeasibilityReport === true || Boolean(report.missionFeasibilityReport ?? report.missionFeasibilitySummary),
    hasMotionCostGraph: report.summary?.hasMotionCostGraph === true || Boolean(report.motionCostGraphSummary ?? report.episode?.motionCostGraphSummary),
    motionCostGraphSummary: report.motionCostGraphSummary ?? report.episode?.motionCostGraphSummary ?? null,
    motionModelId: report.motionSummary?.motionModelId ?? report.runtime?.config?.motion?.motionModelId ?? null,
    usesGeneratedPlan: report.runtime?.usesGeneratedPlan === true || report.runtime?.adaptedPlan?.generatesRoute === true,
    adaptedPlan: report.runtime?.adaptedPlan ?? null,
    output: report.output ?? null
  };
}


export function headlessBundleWaterColumnSummary(bundle = {}) {
  const summary = bundle.waterColumnSummary ?? bundle.episode?.waterColumnSummary ?? bundle.roundtripReport?.waterColumnSummary ?? bundle.roundtripReport?.episode?.waterColumnSummary ?? null;
  if (!summary) {
    return {
      present: false,
      hasWaterColumnSummary: false,
      waterColumnLayerIds: bundle.missionConfig?.world?.depthLayers ?? [],
      waterColumnDefaultLayers: [],
      diveProfileId: bundle.missionConfig?.gliders?.[0]?.diveProfileId ?? bundle.replay?.diveProfileId ?? null,
      observationCountsByDepth: {},
      verticalCoverage: null,
      publicSafe: true,
      usesFull3DPlanning: false,
      usesNewPlanner: false,
      usesPythonSimulator: false,
      usesMARL: false
    };
  }
  const config = summary.waterColumnConfig ?? {};
  return {
    present: true,
    hasWaterColumnSummary: true,
    type: summary.type ?? null,
    waterColumnLayerIds: config.depthLayerIds ?? summary.depthLayerIds ?? bundle.missionConfig?.world?.depthLayers ?? [],
    waterColumnDefaultLayers: config.defaultLayerIds ?? [],
    diveProfileId: summary.diveProfile?.profileId ?? config.diveProfileId ?? bundle.replay?.diveProfileId ?? null,
    observationCountsByDepth: summary.observationCountsByDepth ?? summary.observationSummary?.observationCountsByDepth ?? {},
    trackCountsByDepth: summary.trackCountsByDepth ?? {},
    verticalCoverage: summary.verticalCoverage ?? summary.observationSummary?.verticalCoverage ?? null,
    bestDepthLayerCounts: summary.bestDepthLayerCounts ?? summary.depthLayerPrioritySummary?.bestDepthLayerCounts ?? {},
    publicSafe: summary.publicSafe !== false && summary.hiddenTruthIncluded !== true,
    waterColumnPublicSafe: summary.publicSafe !== false && summary.hiddenTruthIncluded !== true,
    usesFull3DPlanning: summary.usesFull3DPlanning === true,
    usesNewPlanner: summary.usesNewPlanner === true,
    usesPythonSimulator: summary.usesPythonSimulator === true,
    usesMARL: summary.usesMARL === true,
    boundary: summary.boundary ?? []
  };
}

export function headlessBundleDepthLayerPrioritySummary(bundle = {}) {
  const summary = bundle.depthLayerPrioritySummary ?? bundle.depthLayerPriority?.summary ?? bundle.waterColumnSummary?.depthLayerPrioritySummary ?? bundle.episode?.depthLayerPrioritySummary ?? null;
  if (!summary) {
    return { present: false, bestDepthLayerCounts: {}, excludesRouteTravelCost: true, usesFull3DPlanning: false, usesNewPlanner: false };
  }
  return {
    present: true,
    type: summary.type ?? null,
    depthLayerIds: summary.depthLayerIds ?? [],
    bestDepthLayerCounts: summary.bestDepthLayerCounts ?? {},
    topDownStats: summary.topDownStats ?? {},
    excludesRouteTravelCost: summary.excludesRouteTravelCost !== false,
    publicSafe: summary.publicSafe !== false,
    usesFull3DPlanning: summary.usesFull3DPlanning === true,
    usesNewPlanner: summary.usesNewPlanner === true,
    usesPythonSimulator: summary.usesPythonSimulator === true,
    usesMARL: summary.usesMARL === true
  };
}

export function headlessBundleScienceDiagnosisSummary(bundle = {}) {
  const diagnostics = bundle.scienceDiagnostics ?? bundle.episode?.scienceDiagnostics ?? bundle.roundtripReport?.scienceDiagnosticsSummary ?? null;
  if (!diagnostics) {
    return {
      present: false,
      primaryDiagnosis: null,
      forecastCorrectionStatus: null,
      hiddenEventStatus: null,
      recommendedObjectiveId: null,
      publicSafe: true,
      scienceDiagnosisIsPlannerAuthority: false,
      notBrowserOfficialScoring: true,
      usesProductionDataAssimilation: false,
      usesCalibratedOceanForecast: false,
      usesMARL: false
    };
  }
  const summary = diagnostics.discoverySummary ?? diagnostics;
  return {
    present: true,
    type: diagnostics.type ?? null,
    episodeId: diagnostics.episodeId ?? summary.episodeId ?? null,
    primaryDiagnosis: diagnostics.primaryDiagnosis ?? summary.primaryDiagnosis ?? null,
    primaryDiagnosisLabel: diagnostics.primaryDiagnosisLabel ?? summary.primaryDiagnosisLabel ?? null,
    diagnosisClass: diagnostics.diagnosisClass ?? summary.diagnosisClass ?? null,
    confidence: diagnostics.confidence ?? summary.confidence ?? null,
    recommendedObjectiveId: diagnostics.recommendedObjectiveId ?? summary.recommendedObjectiveId ?? null,
    forecastCorrectionStatus: diagnostics.forecastCorrection?.status ?? summary.forecastCorrectionStatus ?? null,
    hiddenEventStatus: diagnostics.hiddenEventHypothesis?.status ?? summary.hiddenEventStatus ?? null,
    surpriseSummary: diagnostics.surpriseSummary ?? summary.surprise ?? null,
    coherenceSummary: diagnostics.coherenceSummary ?? summary.coherence ?? null,
    publicSafe: diagnostics.publicSafe !== false,
    hiddenTruthIncluded: diagnostics.hiddenTruthIncluded === true,
    scienceDiagnosisIsPlannerAuthority: false,
    notBrowserOfficialScoring: true,
    usesProductionDataAssimilation: diagnostics.usesProductionDataAssimilation === true,
    usesCalibratedOceanForecast: diagnostics.usesCalibratedOceanForecast === true,
    usesMARL: diagnostics.usesMARL === true,
    notA: diagnostics.notA ?? []
  };
}
export function headlessBundleBathymetrySummary(bundle = {}) {
  const summary = bundle.bathymetrySummary ?? bundle.episode?.bathymetrySummary ?? bundle.visibleFields?.bathymetrySummary ?? null;
  if (!summary) {
    return {
      present: false,
      hasBathymetrySummary: false,
      depthRange: null,
      featureIds: [],
      landWaterMaskSummary: null,
      verticalExaggeration: null,
      publicSafe: true,
      usesFull3DPlanning: false,
      usesHydrodynamicSolver: false,
      usesTerrainFlowAsOceanCurrent: false,
      usesPythonSimulator: false,
      usesMARL: false
    };
  }
  return {
    present: true,
    hasBathymetrySummary: true,
    type: summary.type ?? null,
    depthRange: summary.depthRange ?? { minDepthMeters: summary.minDepthMeters ?? null, maxDepthMeters: summary.maxDepthMeters ?? null },
    minDepthMeters: summary.minDepthMeters ?? summary.depthRange?.minDepthMeters ?? null,
    maxDepthMeters: summary.maxDepthMeters ?? summary.depthRange?.maxDepthMeters ?? null,
    meanDepthMeters: summary.meanDepthMeters ?? null,
    featureIds: summary.featureIds ?? [],
    landWaterMaskSummary: summary.landWaterMaskSummary ?? null,
    shelfSummary: summary.shelfSummary ?? null,
    canyonSummary: summary.canyonSummary ?? null,
    deepBasinSummary: summary.deepBasinSummary ?? null,
    bathymetryViewMode: summary.bathymetryViewMode ?? 'obliqueBathymetry',
    verticalExaggeration: summary.verticalExaggeration ?? null,
    publicSafe: summary.publicSafe !== false && summary.hiddenTruthIncluded !== true,
    usesFull3DPlanning: summary.usesFull3DPlanning === true,
    usesHydrodynamicSolver: summary.usesHydrodynamicSolver === true,
    usesTerrainFlowAsOceanCurrent: summary.usesTerrainFlowAsOceanCurrent === true,
    usesPythonSimulator: summary.usesPythonSimulator === true,
    usesMARL: summary.usesMARL === true
  };
}

export function headlessBundleMissionGeometrySummary(bundle = {}) {
  const summary = bundle.missionGeometrySummary ?? bundle.episode?.missionGeometrySummary ?? null;
  if (!summary) {
    return {
      present: false,
      surfaceWaypointCount: 0,
      plannedPathPointCount: 0,
      realizedTrajectoryPointCount: 0,
      samplingPointCount: 0,
      diveProfilePathCount: 0,
      hasDiveProfilePath: false,
      sampledDepthLayers: [],
      usesFull3DPlanning: false,
      ownsPlanning: false,
      generatedRoute: false
    };
  }
  return {
    present: true,
    type: summary.type ?? null,
    bathymetryDepthRange: summary.bathymetryDepthRange ?? null,
    bathymetryFeatureIds: summary.bathymetryFeatureIds ?? [],
    waterSurface: summary.waterSurface === true,
    bottomSurface: summary.bottomSurface === true,
    depthLayerPlaneCount: summary.depthLayerPlaneCount ?? 0,
    surfaceWaypointCount: summary.surfaceWaypointCount ?? 0,
    plannedPathPointCount: summary.plannedPathPointCount ?? 0,
    realizedTrajectoryPointCount: summary.realizedTrajectoryPointCount ?? 0,
    samplingPointCount: summary.samplingPointCount ?? 0,
    diveProfilePathCount: summary.diveProfilePathCount ?? 0,
    hasDiveProfilePath: summary.hasDiveProfilePath === true,
    sampledDepthLayers: summary.sampledDepthLayers ?? [],
    publicSafe: summary.publicSafe !== false,
    usesFull3DPlanning: summary.usesFull3DPlanning === true,
    usesHydrodynamicSolver: summary.usesHydrodynamicSolver === true,
    usesTerrainFlowAsOceanCurrent: summary.usesTerrainFlowAsOceanCurrent === true,
    ownsPlanning: summary.ownsPlanning === true,
    generatedRoute: summary.generatedRoute === true,
    usesMARL: summary.usesMARL === true
  };
}
export function headlessBundleReplaySummary(bundle = {}) {
  const summary = replayArtifactsSummary(bundle);
  const replay = bundle.replay ?? {};
  const alignment = bundle.replayAlignmentReport ?? {};
  const integrity = summary.present ? verifyReplayIntegrity(bundle, { allowWarnings: true }) : null;
  const events = bundle.replayEvents?.events ?? [];
  const checkpoints = bundle.replayCheckpoints?.checkpoints ?? [];
  const agentIds = integrity?.agentIds ?? [...new Set([
    ...(bundle.replayManifest?.agentIds ?? []),
    ...events.map((event) => event.agentId).filter(Boolean),
    ...Object.keys(bundle.replayManifest?.initialPublicState?.agentStates ?? bundle.replayManifest?.initialState?.vehicles ?? {})
  ])].sort();
  return {
    present: summary.present,
    legacyLimited: summary.legacyLimited,
    type: bundle.replayManifest?.type ?? replay.type ?? null,
    contract: summary.contract,
    version: summary.version,
    schemaVersion: bundle.replayManifest?.schemaVersion ?? summary.version,
    replayVersion: bundle.replayManifest?.replayVersion ?? summary.version,
    seed: summary.seed ?? replay.seed ?? bundle.manifest?.seed ?? null,
    replayMode: summary.replayMode,
    replayFidelity: summary.replayFidelity,
    compatibilityStatus: integrity?.compatibilitySummary?.compatibility ?? alignment.compatibilityStatus ?? summary.compatibilityStatus,
    alignmentStatus: alignment.status ?? null,
    integrityStatus: integrity?.status ?? alignment.status ?? null,
    replayIntegrityStatus: integrity?.status ?? alignment.status ?? null,
    warningCount: integrity?.warningCount ?? alignment.warningCount ?? alignment.summary?.warningCount ?? 0,
    failureCount: integrity?.failureCount ?? alignment.failureCount ?? alignment.summary?.failureCount ?? 0,
    failureCodes: integrity?.failureCodes ?? [],
    warningCodes: integrity?.warningCodes ?? [],
    issues: integrity?.issues ?? [],
    digestChecksPassed: integrity?.summary?.digestChecksPassed === true,
    orderingChecksPassed: integrity?.summary?.orderingChecksPassed === true,
    publicSafetyPassed: integrity?.summary?.publicSafetyPassed !== false,
    firstDivergence: integrity?.firstDivergence ?? alignment.firstDivergence ?? null,
    gliderId: replay.gliderId ?? bundle.replayManifest?.agentIds?.[0] ?? null,
    agentCount: agentIds.length,
    agentIds,
    multiAgentReplayContractOnly: bundle.fixtureMetadata?.multiAgentReplayContractOnly === true || agentIds.length > 1,
    intentionallyInvalid: bundle.fixtureMetadata?.intentionallyInvalid === true,
    expectedFailureCodes: bundle.fixtureMetadata?.expectedFailureCodes ?? [],
    eventCount: summary.eventCount,
    checkpointCount: summary.checkpointCount,
    trackPointCount: replay.trackPointCount ?? replay.route?.length ?? bundle.gliderTracks?.length ?? null,
    observationCount: replay.observationCount ?? replay.observationIds?.length ?? bundle.observations?.length ?? null,
    surfacingCount: summary.surfacingCount,
    objectiveTransitionCount: summary.objectiveTransitionCount,
    terminalTick: summary.terminalTick,
    terminalReason: bundle.replayManifest?.terminalReason ?? bundle.replayManifest?.terminationReason ?? null,
    terminalDigest: summary.terminalDigest,
    publicSafe: summary.publicSafe && integrity?.publicSafetySummary?.passed !== false,
    hiddenTruthIncluded: summary.hiddenTruthIncluded,
    changesOfficialBrowserScoring: summary.changesOfficialBrowserScoring,
    objectiveTransitions: events.filter((event) => event.phase === 'objective').map((event) => ({
      sequence: event.sequence,
      tick: event.tick,
      objectiveId: event.payload?.objectiveId ?? null,
      label: event.payload?.label ?? null,
      agentId: event.agentId ?? null
    })),
    warning: summary.warning,
    boundary: integrity?.boundary ?? 'Public replay playback inspects recorded public state only.'
  };
}

export function headlessBundleReplayPlayback(bundle = {}) {
  const state = createReplayPlaybackState(bundle);
  return replayPlaybackSummary(state, bundle);
}

export function headlessBundleVisibilitySummary(bundle = {}, validation = validateHeadlessBundle(bundle)) {
  return {
    status: validation.status,
    visibilityRisk: validation.visibilityRisk,
    visibleFieldIds: Object.keys(bundle.visibleFields?.fields ?? {}),
    hiddenFieldExported: Boolean(bundle.hiddenFields),
    hiddenFieldIds: Object.keys(bundle.hiddenFields?.fields ?? {}),
    visibleLeaksHiddenTruth: Object.keys(bundle.visibleFields?.fields ?? {}).includes('T_hiddenTruth'),
    hiddenExportDisabled: !bundle.hiddenFields && /hidden.*disabled|omitted/i.test((bundle.manifest?.notes ?? []).join(' '))
  };
}

export function headlessBundleViewModelSummary(viewModel = {}) {
  return {
    type: viewModel.type,
    status: viewModel.bundleStatus,
    scenarioId: viewModel.manifestSummary?.scenarioId,
    missionId: viewModel.manifestSummary?.missionId,
    fieldCount: viewModel.fieldCards?.length ?? 0,
    observationCount: viewModel.observationSummary?.count ?? 0,
    trackPointCount: viewModel.trackSummary?.count ?? 0,
    finalScore: viewModel.scoreSummary?.finalScore ?? null,
    roundtripStatus: viewModel.roundtripSummary?.status ?? null,
    replayMode: viewModel.replaySummary?.replayMode ?? null,
    replayCompatibilityStatus: viewModel.replaySummary?.compatibilityStatus ?? null,
    replayCheckpointCount: viewModel.replaySummary?.checkpointCount ?? 0,
    replayEventCount: viewModel.replaySummary?.eventCount ?? 0,
    replayTerminalDigest: viewModel.replaySummary?.terminalDigest ?? null,
    replayIntegrityStatus: viewModel.replaySummary?.integrityStatus ?? null,
    replayFailureCodes: viewModel.replaySummary?.failureCodes ?? [],
    replayAgentCount: viewModel.replaySummary?.agentCount ?? 0,
    replayAgentIds: viewModel.replaySummary?.agentIds ?? [],
    waterColumnVerticalCoverage: viewModel.waterColumnSummary?.verticalCoverage ?? null,
    hasBathymetrySummary: viewModel.bathymetrySummary?.present === true,
    bathymetryDepthRange: viewModel.bathymetrySummary?.depthRange ?? null,
    surfaceWaypointCount: viewModel.missionGeometrySummary?.surfaceWaypointCount ?? 0,
    samplingPointCount: viewModel.missionGeometrySummary?.samplingPointCount ?? 0,
    diveProfileId: viewModel.waterColumnSummary?.diveProfileId ?? null,
    sciencePrimaryDiagnosis: viewModel.scienceDiagnosisSummary?.primaryDiagnosis ?? null,
    hasMotionTrajectory: viewModel.motionSummary?.present === true,
    hasMissionFeasibilityReport: viewModel.missionFeasibilitySummary?.present === true,
    hasMotionCostGraph: viewModel.motionCostGraphSummary?.present === true,
    hasMissionOutcomeReport: viewModel.missionOutcomeSummary?.present === true,
    motionCostGraphNodeCount: viewModel.motionCostGraphSummary?.nodeCount ?? 0,
    motionCostGraphEdgeCount: viewModel.motionCostGraphSummary?.edgeCount ?? 0,
    motionModelId: viewModel.motionSummary?.motionModelId ?? null,
    meanTrackError: viewModel.motionSummary?.meanTrackError ?? null,
    visibilityRisk: viewModel.visibilitySummary?.visibilityRisk ?? 'unknown'
  };
}

function manifestSummary(bundle) {
  const manifest = bundle.manifest ?? {};
  return {
    type: manifest.type ?? null,
    bundleType: manifest.bundleType ?? null,
    scenarioId: manifest.scenarioId ?? bundle.missionConfig?.scenarioId ?? null,
    missionId: manifest.missionId ?? bundle.missionConfig?.missionId ?? null,
    episodeId: manifest.episodeId ?? bundle.episode?.episodeId ?? null,
    seed: manifest.seed ?? bundle.episode?.seed ?? null,
    runtimeTarget: manifest.runtimeTarget ?? null,
    visibilityTier: manifest.visibilityTier ?? null,
    fileCount: manifest.files?.length ?? bundle.files?.length ?? 0
  };
}

function missionSummary(bundle) {
  const mission = bundle.missionConfig ?? {};
  return {
    missionId: mission.missionId ?? null,
    scenarioId: mission.scenarioId ?? null,
    width: mission.world?.width ?? null,
    height: mission.world?.height ?? null,
    depthLayers: mission.world?.depthLayers ?? [],
    gliderCount: mission.gliders?.length ?? 0,
    objectiveCount: mission.objectives?.length ?? 0,
    informationAccessTier: mission.informationAccessTier ?? null
  };
}

function fieldCard(id, field, visibilityTier, hidden) {
  const shape = fieldShape(field);
  return { id, visibilityTier, hidden, shape, cellCount: shape.reduce((product, value) => product * value, 1), finiteSummary: finiteSummary(field) };
}

function fieldShape(field) {
  if (!Array.isArray(field)) return [];
  return [field.length, field[0]?.length ?? 0, field[0]?.[0]?.length ?? 0];
}

function finiteSummary(field) {
  const values = [];
  flatten(field, values);
  const finite = values.map(Number).filter(Number.isFinite);
  return { finiteCount: finite.length, min: finite.length ? Math.min(...finite) : null, max: finite.length ? Math.max(...finite) : null, mean: mean(finite) };
}

function flatten(value, out) {
  if (Array.isArray(value)) value.forEach((entry) => flatten(entry, out));
  else out.push(value);
}

function sum(values) { return values.map(Number).filter(Number.isFinite).reduce((total, value) => total + value, 0); }
function mean(values) { const finite = values.map(Number).filter(Number.isFinite); return finite.length ? sum(finite) / finite.length : null; }
function min(values) { const finite = values.map(Number).filter(Number.isFinite); return finite.length ? Math.min(...finite) : null; }
function max(values) { const finite = values.map(Number).filter(Number.isFinite); return finite.length ? Math.max(...finite) : null; }







