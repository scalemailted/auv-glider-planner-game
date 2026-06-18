import { buildBrowserHeadlessBundleSummaryArtifact } from './HeadlessBundleBrowserAdapter.js';
import { BROWSER_HEADLESS_ROUNDTRIP_SUMMARY_TYPE, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, isHeadlessRoundtripReportType, roundtripReportTypeMetadata } from './HeadlessRoundtripTypes.js';

export const HEADLESS_ROUNDTRIP_EXPORT_VERSION = 'headless-roundtrip-export-h3.1';

export function buildHeadlessRoundtripReportArtifact(report = {}) {
  return {
    ...report,
    ...roundtripReportTypeMetadata(report.type),
    exportVersion: HEADLESS_ROUNDTRIP_EXPORT_VERSION
  };
}

export function buildHeadlessRoundtripBrowserSummary(bundleOrReport = {}) {
  const report = bundleOrReport.roundtripReport ?? bundleOrReport;
  return {
    type: BROWSER_HEADLESS_ROUNDTRIP_SUMMARY_TYPE,
    version: HEADLESS_ROUNDTRIP_EXPORT_VERSION,
    sourceReportType: report.type ?? null,
    canonicalReportType: HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE,
    packetId: report.source?.packetId ?? null,
    planId: report.source?.planId ?? null,
    selectedAgentId: report.source?.selectedAgentId ?? null,
    solverPacketValidationStatus: report.visibilityValidation?.status ?? null,
    planValidationStatus: report.planValidation?.status ?? null,
    executionStatus: report.summary?.status ?? null,
    finalScore: report.summary?.finalScore ?? null,
    hiddenTruthExported: report.summary?.hiddenTruthExported ?? false,
    usesNodeHeadlessRuntime: report.runtime?.usesNodeHeadlessRuntime === true,
    usesBrowserOfficialScoring: report.runtime?.usesBrowserOfficialScoring === true,
    usesPythonSimulator: report.runtime?.usesPythonSimulator === true,
    usesNewPlanner: report.runtime?.usesNewPlanner === true,
    usesMARL: report.runtime?.usesMARL === true,
    usesMotionDynamics: report.runtime?.usesMotionDynamics === true,
    usesMissionOutcomeScoring: report.runtime?.usesMissionOutcomeScoring === true || Boolean(report.missionOutcomeReport ?? report.missionScore),
    changesOfficialBrowserScoring: false,
    usesRouteOptimizer: report.runtime?.usesRouteOptimizer === true,
    usesWebGPUFluid: report.runtime?.usesWebGPUFluid === true,
    usesFull3DPlanning: report.runtime?.usesFull3DPlanning === true,
    usesHydrodynamicSolver: report.runtime?.usesHydrodynamicSolver === true,
    usesTerrainFlowAsOceanCurrent: report.runtime?.usesTerrainFlowAsOceanCurrent === true,
    motionSummary: report.motionSummary ?? report.episode?.motionSummary ?? null,
    missionFeasibilitySummary: report.missionFeasibilitySummary ?? report.episode?.missionFeasibilitySummary ?? null,
    motionCostGraphSummary: report.motionCostGraphSummary ?? report.episode?.motionCostGraphSummary ?? null,
    motionCostMatrixSummary: report.motionCostMatrixSummary ?? report.episode?.motionCostMatrixSummary ?? null,
    hasMotionCostGraph: report.summary?.hasMotionCostGraph === true || Boolean(report.motionCostGraphSummary ?? report.episode?.motionCostGraphSummary),
    hasMissionFeasibilityReport: report.summary?.hasMissionFeasibilityReport === true || Boolean(report.missionFeasibilityReport ?? report.missionFeasibilitySummary),
    missionOutcomeSummary: report.missionOutcomeSummary ?? report.summary?.missionOutcomeSummary ?? null,
    missionScoreSummary: report.missionScoreSummary ?? null,
    regretSummary: report.regretSummary ?? null,
    hasMissionOutcomeReport: Boolean(report.missionOutcomeReport),
    hasMissionScore: Boolean(report.missionScore),
    hasRegretReport: Boolean(report.regretReport),
    scoreProfileId: report.summary?.scoreProfileId ?? report.runtime?.scoreProfileId ?? null,
    scoreProfileVersion: report.summary?.scoreProfileVersion ?? report.runtime?.scoreProfileVersion ?? null,
    compositeScore: report.summary?.compositeScore ?? report.runtime?.compositeScore ?? null,
    scienceScore: report.summary?.scienceScore ?? report.runtime?.scienceScore ?? null,
    feasibilityScore: report.summary?.feasibilityScore ?? report.runtime?.feasibilityScore ?? null,
    efficiencyScore: report.summary?.efficiencyScore ?? report.runtime?.efficiencyScore ?? null,
    safetyScore: report.summary?.safetyScore ?? report.runtime?.safetyScore ?? null,
    coverageFraction: report.summary?.coverageFraction ?? report.runtime?.coverageFraction ?? null,
    waterColumnSummary: report.waterColumnSummary ?? report.episode?.waterColumnSummary ?? null,
    bathymetrySummary: report.bathymetrySummary ?? report.episode?.bathymetrySummary ?? null,
    missionGeometrySummary: report.missionGeometrySummary ?? report.episode?.missionGeometrySummary ?? null,
    notA: ['not browser official score', 'not Python simulator', 'not route planner', 'not MARL/RL']
  };
}

export function validateHeadlessRoundtripExport(report = {}) {
  const errors = [];
  const warnings = [];
  if (!isHeadlessRoundtripReportType(report?.type) && report?.canonicalType !== HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE) errors.push(`Unsupported roundtrip report type ${report?.type ?? 'missing'}.`);
  if (report?.runtime?.usesNodeHeadlessRuntime !== true) errors.push('Roundtrip report must mark usesNodeHeadlessRuntime=true.');
  if (report?.runtime?.usesPythonSimulator === true) errors.push('Roundtrip report must not claim a Python simulator.');
  if (report?.runtime?.usesBrowserOfficialScoring === true) errors.push('Roundtrip report must not claim official browser scoring.');
  if (report?.runtime?.usesNewPlanner === true) errors.push('Roundtrip report must not claim a new planner.');
  if (report?.runtime?.usesRouteOptimizer === true) errors.push('Roundtrip report must not claim route optimizer integration.');
  if (report?.runtime?.changesOfficialBrowserScoring === true || report?.missionOutcomeReport?.changesOfficialBrowserScoring === true || report?.missionScore?.changesOfficialBrowserScoring === true) errors.push('Roundtrip SCORE-R1 artifacts must not change official browser scoring.');
  if (report?.runtime?.usesSeaExplorerValidatedModel === true) errors.push('Roundtrip report must not claim SeaExplorer validation.');
  if (report?.runtime?.usesMARL === true) errors.push('Roundtrip report must not claim MARL/RL.');
  if (report?.runtime?.usesWebGPUFluid === true) errors.push('Roundtrip report must not claim WebGPU fluid integration.');
  if (report?.runtime?.usesFull3DPlanning === true) errors.push('Roundtrip report must not claim full 3D planning.');
  if (report?.runtime?.usesHydrodynamicSolver === true) errors.push('Roundtrip report must not claim a hydrodynamic solver.');
  if (report?.runtime?.usesTerrainFlowAsOceanCurrent === true) errors.push('Roundtrip report must not treat terrain-flow accumulation as ocean current.');
  if (report?.summary?.hiddenTruthExported === true && report?.visibilityValidation?.oracleMode !== true) warnings.push('Hidden truth exported outside explicit oracle mode.');
  return { ok: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function buildLegacyBundleBrowserSummary(bundle = {}) {
  return buildBrowserHeadlessBundleSummaryArtifact(bundle);
}

