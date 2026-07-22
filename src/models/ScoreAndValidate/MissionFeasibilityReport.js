 const MISSION_FEASIBILITY_REPORT_VERSION = 'mission-feasibility-report-motion-r1';

const REPORT_NOT_A = Object.freeze([
  'not operational certification',
  'not SeaExplorer-specific validated simulator',
  'not official browser score',
  'not route planner',
  'not MARL/RL',
  'not calibrated ocean forecast',
  'not Python simulator'
]);

 function buildMissionFeasibilityReport({
  motionTrajectory,
  plan,
  motionConfig,
  environmentSummary,
  scienceSummary,
  options = {}
} = {}) {
  const planned = motionTrajectory?.plannedVsRealized ?? {};
  const diagnostics = motionTrajectory?.motionDiagnostics ?? {};
  const summary = diagnostics.summary ?? diagnostics;
  const track = Array.isArray(motionTrajectory?.realizedTrack) ? motionTrajectory.realizedTrack : [];
  const firstTrack = track[0] ?? {};
  const lastTrack = track.at(-1) ?? {};
  const missionDurationSeconds = finiteNumber(
    options.missionDurationSeconds,
    track.length ? finiteNumber(lastTrack.timeSeconds, 0) - finiteNumber(firstTrack.timeSeconds, 0) : 0
  );
  const energyUsed = finiteNumber(planned.energyUsed ?? summary.energyUsed, sum(track.map((point) => point.energyUsedIncrement)));
  const energyRemaining = finiteOrNull(lastTrack.energyRemaining ?? motionTrajectory?.energySummary?.energyRemaining);
  const batteryFraction = finiteOrNull(lastTrack.batteryFraction ?? (energyRemaining !== null && motionConfig?.energyBudget ? energyRemaining / Number(motionConfig.energyBudget) : null));
  const constraintViolations = Number(summary.constraintViolations ?? diagnostics.constraintViolations ?? 0);
  const bottomClearanceWarnings = Number(summary.bottomClearanceWarnings ?? diagnostics.bottomClearanceWarnings ?? 0);
  const arrivalStatus = planned.arrivalStatus ?? summary.arrivalStatus ?? 'unknown';
  const warnings = [
    ...(Array.isArray(motionTrajectory?.warnings) ? motionTrajectory.warnings : []),
    ...(Array.isArray(options.warnings) ? options.warnings : [])
  ];
  const feasibilityStatus = options.feasibilityStatus
    ?? (constraintViolations > 0 ? 'constraint-warning' : bottomClearanceWarnings > 0 ? 'clearance-warning' : arrivalStatus === 'arrived' ? 'feasible' : 'incomplete');
  return {
    type: 'anchor.benchmark.mission-feasibility-report',
    version: MISSION_FEASIBILITY_REPORT_VERSION,
    missionId: options.missionId ?? plan?.missionId ?? plan?.meta?.missionId ?? null,
    planId: motionTrajectory?.planId ?? plan?.planId ?? plan?.id ?? plan?.meta?.planId ?? null,
    gliderId: motionTrajectory?.gliderId ?? plan?.gliderId ?? options.gliderId ?? null,
    motionModelId: motionTrajectory?.motionModelId ?? motionConfig?.motionModelId ?? null,
    feasibilityStatus,
    missionDurationSeconds: round(missionDurationSeconds),
    plannedDistance: round(finiteNumber(planned.plannedDistance, 0)),
    realizedDistance: round(finiteNumber(planned.realizedDistance, 0)),
    energyUsed: round(energyUsed),
    energyRemaining: energyRemaining === null ? null : round(energyRemaining),
    batteryFraction: batteryFraction === null ? null : round(clamp(batteryFraction, 0, 1)),
    meanTrackError: round(finiteNumber(planned.meanTrackError ?? summary.trackErrorMean, 0)),
    maxTrackError: round(finiteNumber(planned.maxTrackError ?? summary.trackErrorMax, 0)),
    driftDistance: round(finiteNumber(planned.driftDistance, 0)),
    currentAssistMean: round(finiteNumber(planned.currentAssistMean ?? summary.currentAssistMean, 0)),
    currentOppositionMean: round(finiteNumber(summary.currentOppositionMean, 0)),
    crossCurrentMean: round(finiteNumber(planned.crossCurrentMean ?? summary.crossCurrentMean, 0)),
    waypointValidation: {
      arrivalStatus,
      missedWaypointCount: Number(planned.missedWaypointCount ?? 0),
      plannedWaypointCount: motionTrajectory?.plannedWaypoints?.length ?? 0,
      sampledPointCount: motionTrajectory?.sampledObservations?.length ?? planned.sampledPointCount ?? 0
    },
    bottomClearanceWarnings,
    constraintViolations,
    sampleCoverageCount: Number(summary.sampleCoverageCount ?? planned.sampledPointCount ?? motionTrajectory?.sampledObservations?.length ?? 0),
    payloadEnergyEstimate: round(Number(summary.sampleCoverageCount ?? 0) * 0.015),
    navigationEnergyEstimate: round(Math.max(0, energyUsed - Number(summary.sampleCoverageCount ?? 0) * 0.015)),
    surfacingEnergyEstimate: plan?.surfaceAtEnd === true || options.surfaceAtEnd === true ? 0.5 : 0,
    environmentSummary: environmentSummary ?? diagnostics.environmentSummary ?? null,
    scienceSummary: scienceSummary ?? null,
    warnings,
    publicSafe: true,
    deterministic: true,
    educationalBenchmarkDiagnostic: true,
    usesMotionDynamics: true,
    usesNewPlanner: false,
    usesWebGPUFluid: false,
    usesSeaExplorerValidatedModel: false,
    usesOperationalCertification: false,
    usesPythonSimulator: false,
    usesMARL: false,
    browserOfficialScoring: false,
    notA: REPORT_NOT_A.slice()
  };
}

 function validateMissionFeasibilityReport(report = {}) {
  const errors = [];
  const warnings = [];
  if (!report || typeof report !== 'object') errors.push('Mission feasibility report must be an object.');
  if (report?.type !== 'anchor.benchmark.mission-feasibility-report') errors.push(`Expected anchor.benchmark.mission-feasibility-report, got ${report?.type ?? 'missing'}.`);
  for (const field of ['missionDurationSeconds', 'plannedDistance', 'realizedDistance', 'energyUsed', 'meanTrackError', 'maxTrackError', 'driftDistance']) {
    if (!Number.isFinite(Number(report?.[field]))) errors.push(`${field} must be finite.`);
  }
  if (report?.usesNewPlanner === true) errors.push('Mission feasibility report must not claim a new planner.');
  if (report?.usesWebGPUFluid === true) errors.push('Mission feasibility report must not claim WebGPU integration.');
  if (report?.usesSeaExplorerValidatedModel === true) errors.push('Mission feasibility report must not claim SeaExplorer-specific validation.');
  if (report?.usesOperationalCertification === true) errors.push('Mission feasibility report must not claim operational certification.');
  if (report?.usesPythonSimulator === true) errors.push('Mission feasibility report must not claim a Python simulator.');
  if (report?.usesMARL === true) errors.push('Mission feasibility report must not claim MARL/RL.');
  if (report?.browserOfficialScoring === true) errors.push('Mission feasibility report must not claim official browser scoring.');
  if (!Array.isArray(report?.notA)) warnings.push('Mission feasibility report should include notA boundaries.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

 function missionFeasibilityReportSummary(report = {}) {
  return {
    type: 'anchor.benchmark.mission-feasibility-report-summary',
    version: MISSION_FEASIBILITY_REPORT_VERSION,
    present: report?.type === 'anchor.benchmark.mission-feasibility-report',
    missionId: report.missionId ?? null,
    planId: report.planId ?? null,
    gliderId: report.gliderId ?? null,
    motionModelId: report.motionModelId ?? null,
    feasibilityStatus: report.feasibilityStatus ?? 'not-present',
    missionDurationSeconds: round(finiteNumber(report.missionDurationSeconds, 0)),
    plannedDistance: round(finiteNumber(report.plannedDistance, 0)),
    realizedDistance: round(finiteNumber(report.realizedDistance, 0)),
    energyUsed: round(finiteNumber(report.energyUsed, 0)),
    energyRemaining: finiteOrNull(report.energyRemaining),
    batteryFraction: finiteOrNull(report.batteryFraction),
    meanTrackError: round(finiteNumber(report.meanTrackError, 0)),
    maxTrackError: round(finiteNumber(report.maxTrackError, 0)),
    driftDistance: round(finiteNumber(report.driftDistance, 0)),
    currentAssistMean: round(finiteNumber(report.currentAssistMean, 0)),
    currentOppositionMean: round(finiteNumber(report.currentOppositionMean, 0)),
    crossCurrentMean: round(finiteNumber(report.crossCurrentMean, 0)),
    waypointArrivalStatus: report.waypointValidation?.arrivalStatus ?? 'unknown',
    missedWaypointCount: Number(report.waypointValidation?.missedWaypointCount ?? 0),
    bottomClearanceWarnings: Number(report.bottomClearanceWarnings ?? 0),
    constraintViolations: Number(report.constraintViolations ?? 0),
    sampleCoverageCount: Number(report.sampleCoverageCount ?? report.waypointValidation?.sampledPointCount ?? 0),
    usesMotionDynamics: report.usesMotionDynamics === true,
    usesNewPlanner: report.usesNewPlanner === true,
    usesWebGPUFluid: report.usesWebGPUFluid === true,
    usesSeaExplorerValidatedModel: report.usesSeaExplorerValidatedModel === true,
    usesMARL: report.usesMARL === true,
    browserOfficialScoring: report.browserOfficialScoring === true
  };
}

function sum(values) {
  return values.map(Number).filter(Number.isFinite).reduce((total, value) => total + value, 0);
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}

module.exports = {MISSION_FEASIBILITY_REPORT_VERSION, buildMissionFeasibilityReport, validateMissionFeasibilityReport, missionFeasibilityReportSummary}