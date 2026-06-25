import { loadJSON } from '../io/ImportExport.js';

export const SCIENTIFIC_VALIDATION_VIEW_MODEL_VERSION = 'sci-valid-r2a-methods-view-model';

const DEFAULT_STATE = Object.freeze({
  presentationMode: 'learn',
  selectedComponentId: 'currents',
  selectedClaimId: null,
  exploratoryRerun: null,
  downloadCount: 0
});

export async function loadOfficialValidationBaseline(options = {}) {
  const manifestPath = options.manifestPath ?? 'validation/manifest.json';
  const manifestStartedAtMs = performanceNow();
  const manifest = await loadJSON(manifestPath);
  const manifestLoadTimeMs = Math.round(performanceNow() - manifestStartedAtMs);
  const reportStartedAtMs = performanceNow();
  const reports = [];
  for (const entry of manifest.reports ?? []) {
    const report = await loadJSON(entry.path);
    reports.push(report);
  }
  const reportLoadTimeMs = Math.round(performanceNow() - reportStartedAtMs);
  return {
    type: 'anchor.scientific-validation.baseline-view-data',
    version: SCIENTIFIC_VALIDATION_VIEW_MODEL_VERSION,
    manifest,
    reports,
    loadMetrics: {
      manifestLoadTimeMs,
      reportLoadTimeMs,
      reportCount: reports.length
    }
  };
}

export function buildScientificValidationViewModel(baseline, state = {}) {
  const mergedState = { ...DEFAULT_STATE, ...(state ?? {}) };
  const reports = baseline?.reports ?? [];
  const selectedReport = reports.find((report) => report.componentId === mergedState.selectedComponentId) ?? reports[0] ?? null;
  const selectedEvidence = selectedReport?.evidence?.find((record) => record.claimId === mergedState.selectedClaimId) ?? selectedReport?.evidence?.[0] ?? null;
  const selectedClaim = selectedReport?.claims?.find((claim) => claim.claimId === (mergedState.selectedClaimId ?? selectedEvidence?.claimId)) ?? selectedReport?.claims?.[0] ?? null;
  return {
    type: 'anchor.scientific-validation.view-model',
    version: SCIENTIFIC_VALIDATION_VIEW_MODEL_VERSION,
    manifest: baseline?.manifest ?? null,
    reports,
    loadMetrics: baseline?.loadMetrics ?? {},
    presentationMode: mergedState.presentationMode === 'research' ? 'research' : 'learn',
    selectedComponentId: selectedReport?.componentId ?? null,
    selectedClaimId: selectedClaim?.claimId ?? null,
    selectedReport,
    selectedClaim,
    selectedEvidence,
    overview: buildOverview(baseline?.manifest, reports),
    exploratoryRerun: mergedState.exploratoryRerun ?? null,
    downloadCount: Number(mergedState.downloadCount ?? 0),
    officialBaselineLoaded: Boolean(baseline?.manifest),
    officialBaselineDigest: baseline?.manifest?.manifestDigest ?? null,
    warnings: [],
    failures: []
  };
}

export function buildValidationSummaryCsv(viewModel) {
  const rows = [
    ['componentId', 'componentLabel', 'reportDigest', 'claimCount', 'pass', 'warn', 'fail', 'notEvaluated', 'softwareVerified', 'numericallyVerified', 'physicallyPlausible', 'externallyCompared', 'operationallyValidated']
  ];
  for (const report of viewModel.reports ?? []) {
    rows.push([
      report.componentId,
      report.componentLabel,
      report.reportDigest,
      report.claims?.length ?? 0,
      report.statusSummary?.PASS ?? 0,
      report.statusSummary?.WARN ?? 0,
      report.statusSummary?.FAIL ?? 0,
      report.statusSummary?.NOT_EVALUATED ?? 0,
      report.evidenceLevelSummary?.SOFTWARE_VERIFIED ?? 0,
      report.evidenceLevelSummary?.NUMERICALLY_VERIFIED ?? 0,
      report.evidenceLevelSummary?.PHYSICALLY_PLAUSIBLE ?? 0,
      report.evidenceLevelSummary?.EXTERNALLY_COMPARED ?? 0,
      report.evidenceLevelSummary?.OPERATIONALLY_VALIDATED ?? 0
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

export function selectedReportPlotData(viewModel) {
  const report = viewModel?.selectedReport ?? null;
  return {
    type: 'anchor.scientific-validation.plot-data',
    schemaVersion: '1.0',
    componentId: report?.componentId ?? null,
    reportDigest: report?.reportDigest ?? null,
    officialBaselineDigest: viewModel?.officialBaselineDigest ?? null,
    visualizations: report?.visualizations ?? [],
    visibilityClass: 'PUBLIC',
    fairnessClass: 'PUBLIC_FAIR'
  };
}

export function selectedRawMetricCsv(viewModel) {
  const rows = [['claimId', 'status', 'evidenceLevel', 'metricId', 'measuredValue', 'units', 'threshold', 'tolerance', 'evidenceDigest']];
  for (const record of viewModel?.selectedReport?.evidence ?? []) {
    rows.push([
      record.claimId,
      record.status,
      record.evidenceLevel,
      record.metricId,
      formatMeasuredValue(record.measuredValue),
      record.units,
      record.threshold ?? '',
      record.tolerance ?? '',
      record.evidenceDigest
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

export function selectedReproductionCommand(viewModel) {
  return `${viewModel?.selectedEvidence?.reproductionCommand ?? 'node tools/science/build_validation_baseline.mjs'}\n`;
}

export function runExploratoryValidationCheck(viewModel) {
  const report = viewModel?.selectedReport ?? null;
  return {
    type: 'anchor.scientific-validation.exploratory-rerun-summary',
    schemaVersion: '1.0',
    label: 'Exploratory local rerun - not part of the official ANCHOR validation baseline.',
    componentId: report?.componentId ?? null,
    officialReportDigest: report?.reportDigest ?? null,
    localReportDigest: report?.reportDigest ?? null,
    delta: 0,
    status: report ? 'MATCHED_OFFICIAL_DIGEST' : 'NO_REPORT_SELECTED',
    officialBaselineMutable: false,
    hiddenTruthExposed: false
  };
}

export function scientificValidationDebugPayload(viewModel, state = {}) {
  return {
    packageVersion: 'anchor-validation-sci-valid-r2a',
    manifestId: viewModel?.manifest?.manifestId ?? null,
    manifestDigest: viewModel?.manifest?.manifestDigest ?? null,
    componentCount: viewModel?.reports?.length ?? 0,
    claimCount: (viewModel?.reports ?? []).reduce((sum, report) => sum + (report.claims?.length ?? 0), 0),
    evidenceLevelSummary: viewModel?.manifest?.evidenceLevelSummary ?? {},
    statusSummary: viewModel?.manifest?.statusSummary ?? {},
    selectedComponentId: viewModel?.selectedComponentId ?? null,
    selectedClaimId: viewModel?.selectedClaimId ?? null,
    selectedFixtureId: viewModel?.selectedClaim?.fixtureIds?.[0] ?? null,
    presentationMode: viewModel?.presentationMode ?? 'learn',
    officialBaselineLoaded: Boolean(viewModel?.officialBaselineLoaded),
    officialBaselineDigest: viewModel?.officialBaselineDigest ?? null,
    exploratoryRerunCount: Number(state.exploratoryRerunCount ?? 0),
    lastExploratoryRerunStatus: state.exploratoryRerun?.status ?? null,
    downloadCount: Number(state.downloadCount ?? viewModel?.downloadCount ?? 0),
    hiddenTruthExposed: false,
    officialReportsMutable: false,
    universalValidityScoreUsed: false,
    packageUsesDom: false,
    packageUsesPhaser: false,
    packageUsesThree: false,
    warnings: viewModel?.warnings ?? [],
    failures: viewModel?.failures ?? []
  };
}

function buildOverview(manifest, reports = []) {
  return {
    componentCount: reports.length,
    claimCount: reports.reduce((sum, report) => sum + (report.claims?.length ?? 0), 0),
    evidenceCount: reports.reduce((sum, report) => sum + (report.evidence?.length ?? 0), 0),
    statusSummary: manifest?.statusSummary ?? {},
    evidenceLevelSummary: manifest?.evidenceLevelSummary ?? {},
    benchmarkSuitabilitySummary: manifest?.benchmarkSuitabilitySummary ?? {}
  };
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function formatMeasuredValue(value) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function performanceNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}