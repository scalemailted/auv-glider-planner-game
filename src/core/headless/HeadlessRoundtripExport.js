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
  if (report?.runtime?.usesMARL === true) errors.push('Roundtrip report must not claim MARL/RL.');
  if (report?.summary?.hiddenTruthExported === true && report?.visibilityValidation?.oracleMode !== true) warnings.push('Hidden truth exported outside explicit oracle mode.');
  return { ok: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function buildLegacyBundleBrowserSummary(bundle = {}) {
  return buildBrowserHeadlessBundleSummaryArtifact(bundle);
}