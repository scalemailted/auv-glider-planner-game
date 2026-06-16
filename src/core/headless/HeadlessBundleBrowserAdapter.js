import { validateHeadlessBundle } from './HeadlessBundleValidation.js';
import { buildHeadlessBundleViewModel, headlessBundleObservationSummary, headlessBundleReplaySummary, headlessBundleRoundtripSummary, headlessBundleScoreSummary, headlessBundleTrackSummary, headlessBundleVisibilitySummary } from './HeadlessBundleViewModel.js';
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
    scoreSummary: buildBrowserHeadlessScoreComparisonDescriptor(bundle),
    roundtripSummary: headlessBundleRoundtripSummary(bundle),
    replaySummary: headlessBundleReplaySummary(bundle),
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
    browserSummaryExportAvailable: true,
    usesGeneratedPlan: roundtrip.usesGeneratedPlan === true,
    usesBrowserOfficialScoring: false,
    usesPythonSimulator: false,
    usesNodeHeadlessRuntime: true,
    usesNewPlanner: false,
    usesMARL: false
  };
}
