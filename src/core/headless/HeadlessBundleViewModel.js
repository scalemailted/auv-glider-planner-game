import { validateHeadlessBundle } from './HeadlessBundleValidation.js';
import { HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, isHeadlessRoundtripReportType } from './HeadlessRoundtripTypes.js';
import { trajectoryMotionSummary } from '../motion/GliderTrajectorySimulator.js';

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
    scoreSummary: headlessBundleScoreSummary(bundle),
    roundtripSummary: headlessBundleRoundtripSummary(bundle),
    waterColumnSummary: headlessBundleWaterColumnSummary(bundle),
    bathymetrySummary: headlessBundleBathymetrySummary(bundle),
    missionGeometrySummary: headlessBundleMissionGeometrySummary(bundle),
    depthLayerPrioritySummary: headlessBundleDepthLayerPrioritySummary(bundle),
    scienceDiagnosisSummary: headlessBundleScienceDiagnosisSummary(bundle),
    replaySummary: headlessBundleReplaySummary(bundle),
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
  const replay = bundle.replay ?? {};
  return {
    present: Boolean(bundle.replay),
    type: replay.type ?? null,
    seed: replay.seed ?? bundle.manifest?.seed ?? null,
    gliderId: replay.gliderId ?? null,
    trackPointCount: replay.trackPointCount ?? replay.route?.length ?? null,
    observationCount: replay.observationCount ?? replay.observationIds?.length ?? null
  };
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
    waterColumnVerticalCoverage: viewModel.waterColumnSummary?.verticalCoverage ?? null,
    hasBathymetrySummary: viewModel.bathymetrySummary?.present === true,
    bathymetryDepthRange: viewModel.bathymetrySummary?.depthRange ?? null,
    surfaceWaypointCount: viewModel.missionGeometrySummary?.surfaceWaypointCount ?? 0,
    samplingPointCount: viewModel.missionGeometrySummary?.samplingPointCount ?? 0,
    diveProfileId: viewModel.waterColumnSummary?.diveProfileId ?? null,
    sciencePrimaryDiagnosis: viewModel.scienceDiagnosisSummary?.primaryDiagnosis ?? null,
    hasMotionTrajectory: viewModel.motionSummary?.present === true,
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
