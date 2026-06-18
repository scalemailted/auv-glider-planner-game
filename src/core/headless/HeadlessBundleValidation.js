import { validateHeadlessBundleManifest as validateH0Manifest } from './HeadlessBundleManifest.js';
import { manifestDisablesHiddenExport } from './HeadlessBundleLoader.js';
import { HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, isHeadlessRoundtripReportType } from './HeadlessRoundtripTypes.js';
import { validateMotionCostGraph } from '../motion/MotionCostGraphBuilder.js';
import { validateMotionCostMatrix } from '../motion/MotionCostMatrixExporter.js';
import { validateMissionOutcomeReport } from '../scoring/MissionOutcomeReport.js';
import { validateMissionRegretReport } from '../scoring/MissionRegretModel.js';
import { auditMissionScorePublicSafety } from '../scoring/MissionScorePublicSafety.js';

export const HEADLESS_BUNDLE_VALIDATION_VERSION = 'headless-bundle-validation-h2';

export function validateHeadlessBundleManifest(manifest = {}) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!manifest || typeof manifest !== 'object') failures.push('Manifest must be an object.');
  if (manifest?.type !== 'anchor.headless.manifest') failures.push(`Manifest type should be anchor.headless.manifest, got ${manifest?.type ?? 'missing'}.`);
  const h0 = validateH0Manifest(manifest ?? {});
  warnings.push(...(h0.warnings ?? []).map((warning) => `manifest: ${warning}`));
  failures.push(...(h0.errors ?? []).map((failure) => `manifest: ${failure}`));
  checks.push({ id: 'manifest-type', ok: manifest?.type === 'anchor.headless.manifest' });
  return result(checks, warnings, failures);
}

export function validateHeadlessVisibleFields(visibleFields = {}) {
  const checks = [];
  const warnings = [];
  const failures = [];
  const fieldIds = visibleFieldIds(visibleFields);
  checks.push({ id: 'visible-fields-present', ok: fieldIds.length > 0, detail: `${fieldIds.length} field(s)` });
  if (!fieldIds.length) warnings.push('Visible fields are missing or empty.');
  if (fieldIds.includes('T_hiddenTruth')) failures.push('Visible fields include T_hiddenTruth, which would leak hidden truth.');
  if (fieldIds.includes('trueRoi') && !oracleVisible(visibleFields, 'trueRoi')) failures.push('Visible fields include trueRoi without oracle/debug visibility.');
  if (fieldIds.includes('eventIntensity') && !oracleVisible(visibleFields, 'eventIntensity')) failures.push('Visible fields include eventIntensity without oracle/debug visibility.');
  return result(checks, warnings, failures, failures.length ? 'high' : 'low');
}

export function validateHeadlessHiddenFields(hiddenFields = null, manifest = {}) {
  const checks = [];
  const warnings = [];
  const failures = [];
  const hiddenFile = (manifest?.files ?? []).find((entry) => entry?.path === 'hidden_fields.json' || entry?.role === 'hiddenFields');
  const disabled = manifestDisablesHiddenExport(manifest);
  if (!hiddenFields) {
    checks.push({ id: 'hidden-fields-omitted', ok: disabled || !hiddenFile });
    if (disabled) return result(checks, warnings, failures, 'low');
    if (hiddenFile) failures.push('Manifest lists hidden fields but hidden_fields.json is missing.');
    else warnings.push('Hidden fields are absent; this is acceptable for public bundles if hidden export is disabled.');
    return result(checks, warnings, failures, failures.length ? 'medium' : 'low');
  }
  const tier = hiddenFile?.visibilityTier ?? hiddenFields.visibilityTier ?? null;
  checks.push({ id: 'hidden-fields-tier', ok: ['hiddenTruth', 'oracle', 'debugAll'].includes(tier), detail: tier });
  if (!['hiddenTruth', 'oracle', 'debugAll'].includes(tier)) failures.push('hidden_fields.json must be marked hiddenTruth, oracle, or debugAll in the manifest.');
  return result(checks, warnings, failures, failures.length ? 'high' : 'low');
}

export function validateHeadlessObservations(observations = []) {
  const list = Array.isArray(observations) ? observations : [];
  const checks = [{ id: 'observations-array', ok: Array.isArray(observations), detail: `${list.length} row(s)` }];
  const warnings = [];
  const failures = [];
  list.slice(0, 20).forEach((row, index) => {
    if (!row.observationId && row.index === undefined) warnings.push(`Observation ${index + 1} lacks observationId/index.`);
    for (const key of ['timeSeconds', 'gliderId', 'x', 'y']) {
      if (row[key] === undefined || row[key] === null || row[key] === '') warnings.push(`Observation ${index + 1} lacks ${key}.`);
    }
    if (row.observedValue === undefined && row.value === undefined) warnings.push(`Observation ${index + 1} lacks observedValue/value.`);
  });
  return result(checks, warnings, failures);
}

export function validateHeadlessTracks(tracks = []) {
  const list = Array.isArray(tracks) ? tracks : [];
  const checks = [{ id: 'tracks-array', ok: Array.isArray(tracks), detail: `${list.length} row(s)` }];
  const warnings = [];
  const failures = [];
  list.slice(0, 20).forEach((row, index) => {
    for (const key of ['timeSeconds', 'gliderId', 'x', 'y']) {
      if (row[key] === undefined || row[key] === null || row[key] === '') warnings.push(`Track point ${index + 1} lacks ${key}.`);
    }
  });
  return result(checks, warnings, failures);
}

export function validateHeadlessScoreReport(scoreReport = {}) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!scoreReport || typeof scoreReport !== 'object') failures.push('Score report is missing.');
  const finalScore = scoreReport?.finalScore ?? scoreReport?.final_score;
  checks.push({ id: 'score-final-score', ok: Number.isFinite(Number(finalScore)), detail: finalScore });
  if (!Number.isFinite(Number(finalScore))) warnings.push('Score report should include finalScore or final_score.');
  if (scoreReport?.notBrowserOfficialScoring !== true) warnings.push('Score report should mark notBrowserOfficialScoring=true.');
  return result(checks, warnings, failures);
}


export function validateHeadlessScienceDiagnostics(scienceDiagnostics = null) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!scienceDiagnostics) {
    checks.push({ id: 'science-diagnostics-optional', ok: true, detail: 'not present' });
    return result(checks, warnings, failures, 'low');
  }
  checks.push({ id: 'science-diagnostics-present', ok: typeof scienceDiagnostics === 'object' });
  if (scienceDiagnostics?.type !== 'anchor.headless.science-diagnostics') failures.push(`Science diagnostics type should be anchor.headless.science-diagnostics, got ${scienceDiagnostics?.type ?? 'missing'}.`);
  if (scienceDiagnostics?.publicSafe !== true) warnings.push('Science diagnostics should mark publicSafe=true.');
  if (scienceDiagnostics?.hiddenTruthIncluded === true) failures.push('Science diagnostics must not mark hiddenTruthIncluded=true in a public bundle.');
  if (scienceDiagnostics?.usesProductionDataAssimilation === true) failures.push('Science diagnostics must not claim production data assimilation.');
  if (scienceDiagnostics?.usesCalibratedOceanForecast === true) failures.push('Science diagnostics must not claim a calibrated ocean forecast.');
  if (scienceDiagnostics?.usesMARL === true) failures.push('Science diagnostics must not claim MARL/RL.');
  const text = JSON.stringify(scienceDiagnostics);
  if (/T_hiddenTruth|trueRoi|eventIntensity/.test(text)) failures.push('Science diagnostics include hidden/oracle field identifiers and are not public-safe.');
  checks.push({ id: 'science-diagnostics-primary-diagnosis', ok: Boolean(scienceDiagnostics?.primaryDiagnosis), detail: scienceDiagnostics?.primaryDiagnosis ?? 'missing' });
  if (!scienceDiagnostics?.primaryDiagnosis) warnings.push('Science diagnostics should include primaryDiagnosis.');
  return result(checks, warnings, failures, failures.length ? 'high' : warnings.length ? 'medium' : 'low');
}
export function validateHeadlessRoundtripReport(report = null) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!report) {
    checks.push({ id: 'roundtrip-report-optional', ok: true, detail: 'not present' });
    return result(checks, warnings, failures, 'low');
  }
  checks.push({ id: 'roundtrip-report-present', ok: typeof report === 'object' });
  const recognized = isHeadlessRoundtripReportType(report?.type) || report?.canonicalType === HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE;
  checks.push({ id: 'roundtrip-report-type', ok: recognized, detail: report?.type ?? 'missing' });
  if (!recognized) failures.push(`Roundtrip report type should be ${HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE} or a known alias.`);
  if (report?.runtime?.usesNodeHeadlessRuntime !== true) failures.push('Roundtrip report must mark usesNodeHeadlessRuntime=true.');
  if (report?.runtime?.usesPythonSimulator === true) failures.push('Roundtrip report must not claim a Python simulator.');
  if (report?.runtime?.usesBrowserOfficialScoring === true || report?.summary?.browserOfficialScoring === true) failures.push('Roundtrip report must not claim official browser scoring.');
  if (report?.runtime?.usesNewPlanner === true) failures.push('Roundtrip report must not claim a new planner.');
  if (report?.runtime?.usesMARL === true) failures.push('Roundtrip report must not claim MARL/RL.');
  if (report?.summary?.hiddenTruthExported === true && report?.visibilityValidation?.oracleMode !== true) warnings.push('Roundtrip exported hidden truth outside explicit oracle/debug validation.');
  return result(checks, warnings, failures, failures.length ? 'high' : warnings.length ? 'medium' : 'low');
}

export function validateHeadlessWaterColumnSummary(summary = null) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!summary) {
    checks.push({ id: 'water-column-summary-optional', ok: true, detail: 'not present' });
    return result(checks, warnings, failures, 'low');
  }
  checks.push({ id: 'water-column-summary-present', ok: typeof summary === 'object' });
  if (summary?.type !== 'anchor.headless.water-column-summary') failures.push(`Water-column summary type should be anchor.headless.water-column-summary, got ${summary?.type ?? 'missing'}.`);
  if (summary?.publicSafe === false || summary?.hiddenTruthIncluded === true) failures.push('Water-column summary must be public-safe and must not include hidden truth.');
  if (summary?.usesFull3DPlanning === true) failures.push('Water-column summary must not claim full 3D planning.');
  if (summary?.usesNewPlanner === true) failures.push('Water-column summary must not claim a new planner.');
  if (summary?.usesPythonSimulator === true) failures.push('Water-column summary must not claim a Python simulator.');
  if (summary?.usesMARL === true) failures.push('Water-column summary must not claim MARL/RL.');
  return result(checks, warnings, failures, failures.length ? 'high' : 'low');
}

export function validateHeadlessDepthLayerPriority(priority = null, summary = null) {
  const checks = [];
  const warnings = [];
  const failures = [];
  const payload = priority ?? summary;
  if (!payload) {
    checks.push({ id: 'depth-layer-priority-optional', ok: true, detail: 'not present' });
    return result(checks, warnings, failures, 'low');
  }
  checks.push({ id: 'depth-layer-priority-present', ok: typeof payload === 'object' });
  if (payload?.type && !['anchor.headless.depth-layer-priority', 'anchor.headless.depth-layer-priority-summary'].includes(payload.type)) failures.push(`Depth-layer priority type is not recognized: ${payload.type}.`);
  if (payload?.hiddenTruthIncluded === true) failures.push('Depth-layer priority must not include hidden truth.');
  if (payload?.excludesRouteTravelCost === false) failures.push('Depth-layer priority must exclude route travel cost.');
  if (payload?.usesFull3DPlanning === true) failures.push('Depth-layer priority must not claim full 3D planning.');
  return result(checks, warnings, failures, failures.length ? 'high' : warnings.length ? 'medium' : 'low');
}
export function validateHeadlessMissionFeasibilityReport(report = null) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!report) {
    checks.push({ id: 'mission-feasibility-report-optional', ok: true, detail: 'not present' });
    return result(checks, warnings, failures, 'low');
  }
  checks.push({ id: 'mission-feasibility-report-present', ok: typeof report === 'object' });
  if (report?.type !== 'anchor.benchmark.mission-feasibility-report') failures.push(`Mission feasibility report type should be anchor.benchmark.mission-feasibility-report, got ${report?.type ?? 'missing'}.`);
  for (const field of ['missionDurationSeconds', 'plannedDistance', 'realizedDistance', 'energyUsed', 'meanTrackError', 'maxTrackError']) {
    if (!Number.isFinite(Number(report?.[field]))) failures.push(`Mission feasibility report ${field} must be finite.`);
  }
  if (report?.usesNewPlanner === true) failures.push('Mission feasibility report must not claim a new planner.');
  if (report?.usesWebGPUFluid === true) failures.push('Mission feasibility report must not claim WebGPU fluid integration.');
  if (report?.usesSeaExplorerValidatedModel === true) failures.push('Mission feasibility report must not claim SeaExplorer-specific validation.');
  if (report?.usesOperationalCertification === true) failures.push('Mission feasibility report must not claim operational certification.');
  if (report?.usesPythonSimulator === true) failures.push('Mission feasibility report must not claim a Python simulator.');
  if (report?.usesMARL === true) failures.push('Mission feasibility report must not claim MARL/RL.');
  if (report?.browserOfficialScoring === true) failures.push('Mission feasibility report must not claim official browser scoring.');
  if (JSON.stringify(report).includes('T_hiddenTruth')) failures.push('Public mission feasibility report must not include hidden truth field identifiers.');
  return result(checks, warnings, failures, failures.length ? 'high' : warnings.length ? 'medium' : 'low');
}

export function validateHeadlessMotionCostArtifacts(graph = null, matrix = null) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!graph && !matrix) {
    checks.push({ id: 'motion-cost-artifacts-optional', ok: true, detail: 'not present' });
    return result(checks, warnings, failures, 'low');
  }
  if (graph) {
    checks.push({ id: 'motion-cost-graph-present', ok: typeof graph === 'object' });
    const validation = validateMotionCostGraph(graph);
    failures.push(...validation.errors.map((entry) => `motionCostGraph: ${entry}`));
    warnings.push(...validation.warnings.map((entry) => `motionCostGraph: ${entry}`));
  }
  if (matrix) {
    checks.push({ id: 'motion-cost-matrix-present', ok: typeof matrix === 'object' });
    const validation = validateMotionCostMatrix(matrix);
    failures.push(...validation.errors.map((entry) => `motionCostMatrix: ${entry}`));
    warnings.push(...validation.warnings.map((entry) => `motionCostMatrix: ${entry}`));
  }
  return result(checks, warnings, failures, failures.length ? 'high' : warnings.length ? 'medium' : 'low');
}
export function validateHeadlessMotionArtifacts(trajectory = null, diagnostics = null) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!trajectory && !diagnostics) {
    checks.push({ id: 'motion-artifacts-optional', ok: true, detail: 'not present' });
    return result(checks, warnings, failures, 'low');
  }
  if (trajectory) {
    checks.push({ id: 'motion-trajectory-present', ok: typeof trajectory === 'object' });
    if (trajectory?.type !== 'anchor.motion.trajectory') failures.push(`Motion trajectory type should be anchor.motion.trajectory, got ${trajectory?.type ?? 'missing'}.`);
    if (!Array.isArray(trajectory?.realizedTrack)) failures.push('Motion trajectory must include realizedTrack[].');
    if (!Array.isArray(trajectory?.controlCommands)) warnings.push('Motion trajectory should include controlCommands[].');
    if (trajectory?.generatedRoute === true) failures.push('Motion trajectory must not claim it generated a route.');
    if (trajectory?.usesNewPlanner === true) failures.push('Motion trajectory must not claim a new planner.');
    if (trajectory?.usesWebGPUFluid === true) failures.push('Motion trajectory must not claim WebGPU fluid integration.');
    if (trajectory?.usesMARL === true) failures.push('Motion trajectory must not claim MARL/RL.');
    if (JSON.stringify(trajectory).includes('T_hiddenTruth')) failures.push('Public motion trajectory must not include hidden truth field identifiers.');
  }
  if (diagnostics) {
    checks.push({ id: 'motion-diagnostics-present', ok: typeof diagnostics === 'object' });
    if (diagnostics?.type && diagnostics.type !== 'anchor.motion.diagnostics') failures.push(`Motion diagnostics type should be anchor.motion.diagnostics, got ${diagnostics.type}.`);
    if (diagnostics?.usesNewPlanner === true) failures.push('Motion diagnostics must not claim a new planner.');
    if (diagnostics?.usesWebGPUFluid === true) failures.push('Motion diagnostics must not claim WebGPU fluid integration.');
    if (diagnostics?.usesMARL === true) failures.push('Motion diagnostics must not claim MARL/RL.');
  }
  return result(checks, warnings, failures, failures.length ? 'high' : warnings.length ? 'medium' : 'low');
}
export function validateHeadlessBathymetrySummary(summary = null, missionGeometry = null) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!summary && !missionGeometry) {
    checks.push({ id: 'bathymetry-summary-optional', ok: true, detail: 'not present' });
    return result(checks, warnings, failures, 'low');
  }
  if (summary) {
    checks.push({ id: 'bathymetry-summary-present', ok: typeof summary === 'object' });
    if (summary?.type !== 'anchor.headless.bathymetry-summary') failures.push(`Bathymetry summary type should be anchor.headless.bathymetry-summary, got ${summary?.type ?? 'missing'}.`);
    if (summary?.publicSafe === false || summary?.hiddenTruthIncluded === true) failures.push('Bathymetry summary must be public-safe and must not include hidden truth.');
    if (summary?.usesFull3DPlanning === true) failures.push('Bathymetry summary must not claim full 3D route planning.');
    if (summary?.usesHydrodynamicSolver === true) failures.push('Bathymetry summary must not claim a hydrodynamic solver.');
    if (summary?.usesTerrainFlowAsOceanCurrent === true) failures.push('Bathymetry summary must not claim terrain-flow accumulation is ocean current.');
    if (summary?.usesPythonSimulator === true) failures.push('Bathymetry summary must not claim a Python simulator.');
    if (summary?.usesMARL === true) failures.push('Bathymetry summary must not claim MARL/RL.');
  }
  if (missionGeometry) {
    checks.push({ id: 'mission-geometry-summary-present', ok: typeof missionGeometry === 'object' });
    if (missionGeometry?.usesFull3DPlanning === true) failures.push('Mission geometry summary must not claim full 3D route planning.');
    if (missionGeometry?.ownsPlanning === true || missionGeometry?.generatedRoute === true) failures.push('Mission geometry summary must not generate or own routes.');
    if (missionGeometry?.usesHydrodynamicSolver === true || missionGeometry?.usesTerrainFlowAsOceanCurrent === true) failures.push('Mission geometry summary must preserve bathymetry/current boundaries.');
  }
  return result(checks, warnings, failures, failures.length ? 'high' : warnings.length ? 'medium' : 'low');
}
export function validateHeadlessReplay(replay = null) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!replay) {
    warnings.push('Replay metadata is missing.');
    return result(checks, warnings, failures);
  }
  checks.push({ id: 'replay-present', ok: typeof replay === 'object' });
  return result(checks, warnings, failures);
}

export function validateHeadlessMissionOutcomeArtifacts(report = null, missionScore = null, regretReport = null) {
  const checks = [];
  const warnings = [];
  const failures = [];
  if (!report && !missionScore && !regretReport) {
    checks.push({ id: 'mission-outcome-optional', ok: true, detail: 'not present' });
    return result(checks, warnings, failures, 'low');
  }
  checks.push({ id: 'mission-outcome-present', ok: Boolean(report), detail: report?.type ?? 'missing' });
  if (report) {
    const validation = validateMissionOutcomeReport(report);
    failures.push(...validation.errors.map((entry) => `missionOutcomeReport: ${entry}`));
    warnings.push(...validation.warnings.map((entry) => `missionOutcomeReport: ${entry}`));
    const safety = auditMissionScorePublicSafety(report);
    failures.push(...safety.failures.map((entry) => `missionOutcomeReport: ${entry}`));
    warnings.push(...safety.warnings.map((entry) => `missionOutcomeReport: ${entry}`));
  }
  if (missionScore?.changesOfficialBrowserScoring !== false) failures.push('Mission score must mark changesOfficialBrowserScoring=false.');
  if (regretReport) {
    const regretValidation = validateMissionRegretReport(regretReport);
    failures.push(...regretValidation.errors.map((entry) => `regretReport: ${entry}`));
    warnings.push(...regretValidation.warnings.map((entry) => `regretReport: ${entry}`));
    const safety = auditMissionScorePublicSafety(regretReport);
    failures.push(...safety.failures.map((entry) => `regretReport: ${entry}`));
    warnings.push(...safety.warnings.map((entry) => `regretReport: ${entry}`));
  }
  return result(checks, warnings, failures, failures.length ? 'high' : warnings.length ? 'medium' : 'low');
}
export function validateHeadlessBundle(bundle = {}) {
  const validations = {
    manifest: validateHeadlessBundleManifest(bundle.manifest),
    visibleFields: validateHeadlessVisibleFields(bundle.visibleFields),
    hiddenFields: validateHeadlessHiddenFields(bundle.hiddenFields, bundle.manifest),
    observations: validateHeadlessObservations(bundle.observations),
    tracks: validateHeadlessTracks(bundle.gliderTracks),
    scoreReport: validateHeadlessScoreReport(bundle.scoreReport),
    roundtripReport: validateHeadlessRoundtripReport(bundle.roundtripReport),
    waterColumnSummary: validateHeadlessWaterColumnSummary(bundle.waterColumnSummary ?? bundle.episode?.waterColumnSummary),
    depthLayerPriority: validateHeadlessDepthLayerPriority(bundle.depthLayerPriority, bundle.depthLayerPrioritySummary ?? bundle.episode?.depthLayerPrioritySummary),
    motionArtifacts: validateHeadlessMotionArtifacts(bundle.motionTrajectory ?? bundle.episode?.motionTrajectory, bundle.motionDiagnostics ?? bundle.episode?.motionDiagnostics ?? bundle.episode?.motionTrajectory?.motionDiagnostics),
    missionFeasibilityReport: validateHeadlessMissionFeasibilityReport(bundle.missionFeasibilityReport ?? bundle.episode?.missionFeasibilityReport),
    motionCostArtifacts: validateHeadlessMotionCostArtifacts(bundle.motionCostGraph ?? bundle.episode?.motionCostGraph, bundle.motionCostMatrix ?? bundle.episode?.motionCostMatrix),
    missionOutcomeArtifacts: validateHeadlessMissionOutcomeArtifacts(bundle.missionOutcomeReport ?? bundle.episode?.missionOutcomeReport, bundle.missionScore ?? bundle.episode?.missionScore, bundle.regretReport ?? bundle.episode?.regretReport),
    bathymetrySummary: validateHeadlessBathymetrySummary(bundle.bathymetrySummary ?? bundle.episode?.bathymetrySummary, bundle.missionGeometrySummary ?? bundle.episode?.missionGeometrySummary),
    replay: validateHeadlessReplay(bundle.replay)
  };
  const checks = Object.entries(validations).flatMap(([scope, validation]) => validation.checks.map((check) => ({ ...check, scope })));
  const warnings = [...(bundle.warnings ?? []), ...Object.values(validations).flatMap((validation) => validation.warnings)];
  const failures = [...(bundle.failures ?? []), ...Object.values(validations).flatMap((validation) => validation.failures)];
  const visibilityRisk = failures.some((failure) => /hidden truth|T_hiddenTruth|trueRoi|eventIntensity/i.test(failure)) ? 'high' : warnings.some((warning) => /hidden/i.test(warning)) ? 'medium' : 'low';
  return {
    status: failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    checks,
    warnings,
    failures,
    visibilityRisk,
    summary: {
      checkCount: checks.length,
      warningCount: warnings.length,
      failureCount: failures.length,
      visibleFieldCount: visibleFieldIds(bundle.visibleFields).length,
      hiddenFieldExported: Boolean(bundle.hiddenFields),
      observationCount: bundle.observations?.length ?? 0,
      trackPointCount: bundle.gliderTracks?.length ?? 0,
      finalScore: bundle.scoreReport?.finalScore ?? bundle.scoreReport?.final_score ?? null,
      hasScienceDiagnostics: Boolean(bundle.scienceDiagnostics ?? bundle.episode?.scienceDiagnostics),
      hasWaterColumnSummary: Boolean(bundle.waterColumnSummary ?? bundle.episode?.waterColumnSummary),
      hasDepthLayerPriority: Boolean(bundle.depthLayerPriority ?? bundle.depthLayerPrioritySummary ?? bundle.episode?.depthLayerPrioritySummary),
      hasBathymetrySummary: Boolean(bundle.bathymetrySummary ?? bundle.episode?.bathymetrySummary),
      hasMissionGeometrySummary: Boolean(bundle.missionGeometrySummary ?? bundle.episode?.missionGeometrySummary),
      hasMotionTrajectory: Boolean(bundle.motionTrajectory ?? bundle.episode?.motionTrajectory),
      hasMotionDiagnostics: Boolean(bundle.motionDiagnostics ?? bundle.episode?.motionDiagnostics ?? bundle.episode?.motionTrajectory?.motionDiagnostics),
      hasMissionFeasibilityReport: Boolean(bundle.missionFeasibilityReport ?? bundle.episode?.missionFeasibilityReport),
      hasMotionCostGraph: Boolean(bundle.motionCostGraph ?? bundle.motionCostGraphSummary ?? bundle.episode?.motionCostGraph),
      hasMotionCostMatrix: Boolean(bundle.motionCostMatrix ?? bundle.motionCostMatrixSummary ?? bundle.episode?.motionCostMatrix),
      hasMissionOutcomeReport: Boolean(bundle.missionOutcomeReport ?? bundle.episode?.missionOutcomeReport),
      hasMissionScore: Boolean(bundle.missionScore ?? bundle.episode?.missionScore),
      hasRegretReport: Boolean(bundle.regretReport ?? bundle.episode?.regretReport)
    }
  };
}

export function headlessBundleValidationSummary(validation = {}) {
  return {
    status: validation.status ?? 'FAIL',
    visibilityRisk: validation.visibilityRisk ?? 'unknown',
    warningCount: validation.warnings?.length ?? 0,
    failureCount: validation.failures?.length ?? 0,
    checkCount: validation.checks?.length ?? 0,
    summary: validation.summary ?? {}
  };
}

function result(checks, warnings, failures, visibilityRisk = failures.length ? 'high' : warnings.length ? 'medium' : 'low') {
  return { status: failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', checks, warnings, failures, visibilityRisk };
}

function visibleFieldIds(payload = {}) {
  const ids = new Set();
  if (Array.isArray(payload?.fieldIds)) payload.fieldIds.forEach((id) => ids.add(id));
  Object.keys(payload?.fields ?? {}).forEach((id) => ids.add(id));
  return [...ids];
}

function oracleVisible(payload = {}, fieldId) {
  const tier = payload?.fieldVisibility?.[fieldId] ?? payload?.visibilityTier;
  return ['oracle', 'debugAll', 'hiddenTruth'].includes(tier);
}


