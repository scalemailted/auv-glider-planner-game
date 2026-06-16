import { validateHeadlessBundle } from './HeadlessBundleValidation.js';
import { HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, isHeadlessRoundtripReportType } from './HeadlessRoundtripTypes.js';

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
    scoreSummary: headlessBundleScoreSummary(bundle),
    roundtripSummary: headlessBundleRoundtripSummary(bundle),
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
    usesGeneratedPlan: report.runtime?.usesGeneratedPlan === true || report.runtime?.adaptedPlan?.generatesRoute === true,
    adaptedPlan: report.runtime?.adaptedPlan ?? null,
    output: report.output ?? null
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
