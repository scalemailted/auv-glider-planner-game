import { stableDigest } from '../../contracts/src/index.js';

export const PACKAGE_VERSION = 'anchor-validation-sci-valid-r2a';
export const SCIENTIFIC_VALIDATION_MANIFEST_VERSION = '1.0';
export const SCIENTIFIC_VALIDATION_REPORT_VERSION = '1.0';
export const SCIENTIFIC_VALIDATION_CLAIM_VERSION = '1.0';
export const SCIENTIFIC_VALIDATION_REFERENCE_VERSION = '1.0';

const LEVELS = [
  'SOFTWARE_VERIFIED',
  'NUMERICALLY_VERIFIED',
  'PHYSICALLY_PLAUSIBLE',
  'EXTERNALLY_COMPARED',
  'OPERATIONALLY_VALIDATED',
  'NOT_YET_EVALUATED',
  'NOT_APPLICABLE'
];

const STATUSES = [
  'PASS',
  'WARN',
  'FAIL',
  'NOT_EVALUATED',
  'NOT_APPLICABLE'
];

export const VALIDATION_EVIDENCE_LEVELS = Object.freeze(Object.fromEntries(LEVELS.map((level) => [level, level])));
export const VALIDATION_STATUSES = Object.freeze(Object.fromEntries(STATUSES.map((status) => [status, status])));

export const VALIDATION_REFERENCE_ROLES = Object.freeze({
  modelMotivation: 'modelMotivation',
  methodReference: 'methodReference',
  thresholdRationale: 'thresholdRationale',
  externalComparison: 'externalComparison',
  operationalReference: 'operationalReference'
});

export const VALIDATION_DECISIONS = Object.freeze({
  GO: 'GO',
  CONDITIONAL: 'CONDITIONAL',
  NO_GO: 'NO_GO'
});

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/validation',
  version: PACKAGE_VERSION,
  owns: ['evidence contracts', 'claim definitions', 'validation reports', 'validation manifests', 'deterministic report digests'],
  dependsOn: ['@anchor/contracts'],
  doesNotOwn: ['scientific equations', 'component diagnostics', 'game UI', 'browser downloads', 'route decisions']
});

export function packageBoundarySummary() {
  return clonePlain(PACKAGE_BOUNDARY);
}

export function createValidationClaimDefinition(options = {}) {
  return normalizeValidationClaimDefinition(options);
}

export function normalizeValidationClaimDefinition(value = {}) {
  const normalized = {
    version: SCIENTIFIC_VALIDATION_CLAIM_VERSION,
    claimId: requiredString(value.claimId),
    componentId: requiredString(value.componentId),
    title: requiredString(value.title),
    plainLanguageClaim: requiredString(value.plainLanguageClaim),
    technicalClaim: requiredString(value.technicalClaim),
    evidenceLevel: normalizeEvidenceLevel(value.evidenceLevel),
    methodId: requiredString(value.methodId),
    metricId: requiredString(value.metricId),
    units: requiredString(value.units ?? 'unitless'),
    expectedDirection: String(value.expectedDirection ?? 'within-threshold'),
    threshold: normalizeMaybeNumber(value.threshold),
    tolerance: normalizeMaybeNumber(value.tolerance),
    thresholdRationale: requiredString(value.thresholdRationale),
    fixtureIds: normalizeStringArray(value.fixtureIds),
    referenceIds: normalizeStringArray(value.referenceIds),
    applicability: requiredString(value.applicability ?? 'benchmark-and-education'),
    public: value.public !== false
  };
  normalized.claimDigest = validationClaimDefinitionDigest(normalized);
  return normalized;
}

export function validateValidationClaimDefinition(value = {}) {
  const failures = [];
  if (value.version !== SCIENTIFIC_VALIDATION_CLAIM_VERSION) failures.push(failure('CLAIM_VERSION', 'Claim version is not current.', '$.version'));
  for (const field of ['claimId', 'componentId', 'title', 'plainLanguageClaim', 'technicalClaim', 'methodId', 'metricId', 'units', 'thresholdRationale']) {
    if (!nonempty(value[field])) failures.push(failure('MISSING_FIELD', `${field} is required.`, `$.${field}`));
  }
  if (!LEVELS.includes(value.evidenceLevel)) failures.push(failure('UNKNOWN_EVIDENCE_LEVEL', `Unknown evidence level ${value.evidenceLevel}.`, '$.evidenceLevel'));
  if ('status' in value) failures.push(failure('CLAIM_HAS_STATUS', 'Claim definitions must not embed PASS/WARN/FAIL status.', '$.status'));
  if ((value.threshold != null || value.tolerance != null) && !nonempty(value.thresholdRationale)) failures.push(failure('MISSING_THRESHOLD_RATIONALE', 'Threshold rationale is required when a threshold or tolerance is declared.', '$.thresholdRationale'));
  if (!Array.isArray(value.fixtureIds)) failures.push(failure('FIXTURE_IDS', 'fixtureIds must be an array.', '$.fixtureIds'));
  return validationResult(failures);
}

export function validationClaimDefinitionDigest(value = {}) {
  return stableDigest(withoutDigestFields(value));
}

export function createValidationEvidenceRecord(options = {}) {
  return normalizeValidationEvidenceRecord(options);
}

export function normalizeValidationEvidenceRecord(value = {}) {
  const normalized = {
    version: SCIENTIFIC_VALIDATION_REPORT_VERSION,
    claimId: requiredString(value.claimId),
    componentId: requiredString(value.componentId),
    modelId: requiredString(value.modelId),
    modelVersion: requiredString(value.modelVersion),
    evidenceLevel: normalizeEvidenceLevel(value.evidenceLevel),
    status: normalizeStatus(value.status),
    methodId: requiredString(value.methodId),
    metricId: requiredString(value.metricId),
    measuredValue: normalizeMeasuredValue(value.measuredValue),
    units: requiredString(value.units ?? 'unitless'),
    threshold: normalizeMaybeNumber(value.threshold),
    tolerance: normalizeMaybeNumber(value.tolerance),
    errorValue: normalizeMaybeNumber(value.errorValue),
    relativeError: normalizeMaybeNumber(value.relativeError),
    fixtureIds: normalizeStringArray(value.fixtureIds),
    sourceArtifactDigests: normalizeDigestMap(value.sourceArtifactDigests),
    packageVersions: normalizePackageVersions(value.packageVersions),
    runtimeMetadata: clonePlain(value.runtimeMetadata ?? {}),
    interpretation: requiredString(value.interpretation),
    limitations: normalizeStringArray(value.limitations),
    references: normalizeReferences(value.references),
    reproductionCommand: requiredString(value.reproductionCommand)
  };
  normalized.evidenceDigest = validationEvidenceRecordDigest(normalized);
  return normalized;
}

export function validateValidationEvidenceRecord(value = {}) {
  const failures = [];
  if (value.version !== SCIENTIFIC_VALIDATION_REPORT_VERSION) failures.push(failure('EVIDENCE_VERSION', 'Evidence version is not current.', '$.version'));
  for (const field of ['claimId', 'componentId', 'modelId', 'modelVersion', 'methodId', 'metricId', 'units', 'interpretation', 'reproductionCommand']) {
    if (!nonempty(value[field])) failures.push(failure('MISSING_FIELD', `${field} is required.`, `$.${field}`));
  }
  if (!LEVELS.includes(value.evidenceLevel)) failures.push(failure('UNKNOWN_EVIDENCE_LEVEL', `Unknown evidence level ${value.evidenceLevel}.`, '$.evidenceLevel'));
  if (!STATUSES.includes(value.status)) failures.push(failure('UNKNOWN_STATUS', `Unknown status ${value.status}.`, '$.status'));
  if (typeof value.measuredValue === 'number' && !Number.isFinite(value.measuredValue)) failures.push(failure('NONFINITE_MEASURED_VALUE', 'Measured value must be finite.', '$.measuredValue'));
  if (typeof value.threshold === 'number' && !Number.isFinite(value.threshold)) failures.push(failure('NONFINITE_THRESHOLD', 'Threshold must be finite.', '$.threshold'));
  if (typeof value.tolerance === 'number' && !Number.isFinite(value.tolerance)) failures.push(failure('NONFINITE_TOLERANCE', 'Tolerance must be finite.', '$.tolerance'));
  if (!repoRelativeCommand(value.reproductionCommand)) failures.push(failure('LOCAL_PATH_COMMAND', 'Reproduction command must be repo-relative and portable.', '$.reproductionCommand'));
  if (!Array.isArray(value.limitations) || !value.limitations.length) failures.push(failure('MISSING_LIMITATIONS', 'Evidence record requires limitations.', '$.limitations'));
  return validationResult(failures);
}

export function validationEvidenceRecordDigest(value = {}) {
  return stableDigest(withoutDigestFields(value));
}

export function createScientificValidationReport(options = {}) {
  return normalizeScientificValidationReport(options);
}

export function normalizeScientificValidationReport(value = {}) {
  const claims = (value.claims ?? []).map(normalizeValidationClaimDefinition);
  const evidence = (value.evidence ?? []).map(normalizeValidationEvidenceRecord);
  const normalized = {
    schemaVersion: SCIENTIFIC_VALIDATION_REPORT_VERSION,
    type: 'anchor.scientific-validation-report',
    reportId: requiredString(value.reportId),
    componentId: requiredString(value.componentId),
    componentLabel: requiredString(value.componentLabel),
    modelId: requiredString(value.modelId),
    modelVersion: requiredString(value.modelVersion),
    summary: requiredString(value.summary),
    claims,
    evidence,
    evidenceLevelSummary: summarizeCounts(claims, 'evidenceLevel'),
    statusSummary: summarizeCounts(evidence, 'status'),
    assumptions: normalizeStringArray(value.assumptions),
    limitations: normalizeStringArray(value.limitations),
    references: normalizeReferences(value.references),
    packageVersions: normalizePackageVersions(value.packageVersions),
    sourceArtifactDigests: normalizeDigestMap(value.sourceArtifactDigests),
    suitabilityDecision: normalizeSuitabilityDecision(value.suitabilityDecision),
    visualizations: clonePlain(value.visualizations ?? []),
    claimBoundary: normalizeClaimBoundary(value.claimBoundary),
    visibilityClass: value.visibilityClass ?? 'PUBLIC',
    fairnessClass: value.fairnessClass ?? 'PUBLIC_FAIR'
  };
  normalized.reportDigest = scientificValidationReportDigest(normalized);
  return normalized;
}

export function validateScientificValidationReport(value = {}) {
  const failures = [];
  if (value.schemaVersion !== SCIENTIFIC_VALIDATION_REPORT_VERSION) failures.push(failure('REPORT_VERSION', 'Report schemaVersion is not current.', '$.schemaVersion'));
  if (value.type !== 'anchor.scientific-validation-report') failures.push(failure('REPORT_TYPE', 'Report type is invalid.', '$.type'));
  for (const field of ['reportId', 'componentId', 'componentLabel', 'modelId', 'modelVersion', 'summary']) {
    if (!nonempty(value[field])) failures.push(failure('MISSING_FIELD', `${field} is required.`, `$.${field}`));
  }
  for (const [index, claim] of (value.claims ?? []).entries()) prefixFailures(failures, validateValidationClaimDefinition(claim).failures, `$.claims[${index}]`);
  for (const [index, record] of (value.evidence ?? []).entries()) prefixFailures(failures, validateValidationEvidenceRecord(record).failures, `$.evidence[${index}]`);
  const claimIds = new Set((value.claims ?? []).map((claim) => claim.claimId));
  const passEvidence = new Set((value.evidence ?? []).filter((record) => record.status === 'PASS').map((record) => record.claimId));
  for (const record of value.evidence ?? []) if (!claimIds.has(record.claimId)) failures.push(failure('UNKNOWN_EVIDENCE_CLAIM', `Evidence references unknown claim ${record.claimId}.`, '$.evidence'));
  for (const claim of value.claims ?? []) if (claim.evidenceLevel !== 'NOT_YET_EVALUATED' && !passEvidence.has(claim.claimId) && !hasNonPassEvidence(value.evidence, claim.claimId)) failures.push(failure('CLAIM_WITHOUT_EVIDENCE', `Claim ${claim.claimId} has no evidence record.`, '$.claims'));
  if (!value.claimBoundary?.benchmarkOrEducationUse || value.claimBoundary?.operationalForecast !== false || value.claimBoundary?.certifiedNavigation !== false || value.claimBoundary?.calibratedDigitalTwin !== false) failures.push(failure('CLAIM_BOUNDARY', 'Report claim boundary must reject operational forecast, certified navigation, and calibrated digital twin claims.', '$.claimBoundary'));
  if ('validityScore' in value || 'scientificValidityScore' in value) failures.push(failure('UNIVERSAL_SCORE', 'Reports must not expose a universal scientific-validity score.', '$'));
  validateSuitability(value.suitabilityDecision, failures, '$.suitabilityDecision');
  return validationResult(failures);
}

export function scientificValidationReportSummary(value = {}) {
  return {
    reportId: value.reportId ?? null,
    componentId: value.componentId ?? null,
    componentLabel: value.componentLabel ?? null,
    reportDigest: value.reportDigest ?? scientificValidationReportDigest(value),
    claimCount: value.claims?.length ?? 0,
    evidenceCount: value.evidence?.length ?? 0,
    evidenceLevelSummary: clonePlain(value.evidenceLevelSummary ?? summarizeCounts(value.claims ?? [], 'evidenceLevel')),
    statusSummary: clonePlain(value.statusSummary ?? summarizeCounts(value.evidence ?? [], 'status')),
    suitabilityDecision: clonePlain(value.suitabilityDecision ?? {})
  };
}

export function scientificValidationReportDigest(value = {}) {
  return stableDigest(withoutDigestFields(value));
}

export function createScientificValidationManifest(options = {}) {
  return normalizeScientificValidationManifest(options);
}

export function normalizeScientificValidationManifest(value = {}) {
  const reports = (value.reports ?? []).map((report) => ({
    componentId: requiredString(report.componentId),
    reportId: requiredString(report.reportId),
    reportVersion: requiredString(report.reportVersion ?? SCIENTIFIC_VALIDATION_REPORT_VERSION),
    reportDigest: requiredString(report.reportDigest),
    path: requiredString(report.path)
  }));
  const normalized = {
    schemaVersion: SCIENTIFIC_VALIDATION_MANIFEST_VERSION,
    type: 'anchor.scientific-validation-manifest',
    manifestId: requiredString(value.manifestId),
    applicationVersion: requiredString(value.applicationVersion ?? 'pre-alpha'),
    validationBaselineId: requiredString(value.validationBaselineId),
    reports,
    evidenceLevelSummary: clonePlain(value.evidenceLevelSummary ?? {}),
    statusSummary: clonePlain(value.statusSummary ?? {}),
    packageVersions: normalizePackageVersions(value.packageVersions),
    alphaPositioning: requiredString(value.alphaPositioning),
    tagline: requiredString(value.tagline ?? 'Plan. Simulate. Compare. Learn.'),
    overallClaimBoundary: normalizeClaimBoundary(value.overallClaimBoundary),
    benchmarkSuitabilitySummary: clonePlain(value.benchmarkSuitabilitySummary ?? {}),
    visibilityClass: value.visibilityClass ?? 'PUBLIC',
    fairnessClass: value.fairnessClass ?? 'PUBLIC_FAIR'
  };
  normalized.manifestDigest = scientificValidationManifestDigest(normalized);
  return normalized;
}

export function validateScientificValidationManifest(value = {}) {
  const failures = [];
  if (value.schemaVersion !== SCIENTIFIC_VALIDATION_MANIFEST_VERSION) failures.push(failure('MANIFEST_VERSION', 'Manifest schemaVersion is not current.', '$.schemaVersion'));
  if (value.type !== 'anchor.scientific-validation-manifest') failures.push(failure('MANIFEST_TYPE', 'Manifest type is invalid.', '$.type'));
  for (const field of ['manifestId', 'applicationVersion', 'validationBaselineId', 'alphaPositioning']) {
    if (!nonempty(value[field])) failures.push(failure('MISSING_FIELD', `${field} is required.`, `$.${field}`));
  }
  if (!Array.isArray(value.reports) || !value.reports.length) failures.push(failure('REPORTS_REQUIRED', 'Manifest requires report entries.', '$.reports'));
  for (const [index, report] of (value.reports ?? []).entries()) {
    for (const field of ['componentId', 'reportId', 'reportVersion', 'reportDigest', 'path']) if (!nonempty(report[field])) failures.push(failure('MISSING_REPORT_FIELD', `${field} is required.`, `$.reports[${index}].${field}`));
    if (String(report.path ?? '').includes('\\') || /^[A-Za-z]:/.test(String(report.path ?? ''))) failures.push(failure('LOCAL_REPORT_PATH', 'Report paths must be repo-relative POSIX paths.', `$.reports[${index}].path`));
  }
  if (!value.overallClaimBoundary?.benchmarkOrEducationUse || value.overallClaimBoundary?.operationalForecast !== false || value.overallClaimBoundary?.certifiedNavigation !== false) failures.push(failure('CLAIM_BOUNDARY', 'Manifest claim boundary must reject operational forecast and certified navigation claims.', '$.overallClaimBoundary'));
  if ('validityScore' in value || 'scientificValidityScore' in value) failures.push(failure('UNIVERSAL_SCORE', 'Manifest must not expose a universal scientific-validity score.', '$'));
  return validationResult(failures);
}

export function scientificValidationManifestSummary(value = {}) {
  return {
    manifestId: value.manifestId ?? null,
    validationBaselineId: value.validationBaselineId ?? null,
    manifestDigest: value.manifestDigest ?? scientificValidationManifestDigest(value),
    componentCount: value.reports?.length ?? 0,
    evidenceLevelSummary: clonePlain(value.evidenceLevelSummary ?? {}),
    statusSummary: clonePlain(value.statusSummary ?? {}),
    benchmarkSuitabilitySummary: clonePlain(value.benchmarkSuitabilitySummary ?? {})
  };
}

export function scientificValidationManifestDigest(value = {}) {
  return stableDigest(withoutDigestFields(value));
}

export function createValidationReference(options = {}) {
  return normalizeValidationReference(options);
}

export function normalizeValidationReference(value = {}) {
  return {
    version: SCIENTIFIC_VALIDATION_REFERENCE_VERSION,
    referenceId: requiredString(value.referenceId),
    title: requiredString(value.title),
    authors: requiredString(value.authors ?? 'ANCHOR project'),
    year: Number.isFinite(Number(value.year)) ? Number(value.year) : null,
    source: requiredString(value.source ?? 'local documentation'),
    persistentIdentifier: value.persistentIdentifier ?? null,
    localPath: value.localPath ?? null,
    role: normalizeReferenceRole(value.role)
  };
}

export function aggregateValidationReports(reports = {}, options = {}) {
  const reportList = Array.isArray(reports) ? reports : Object.values(reports);
  const evidenceLevelSummary = mergeSummaries(reportList.map((report) => report.evidenceLevelSummary ?? summarizeCounts(report.claims ?? [], 'evidenceLevel')));
  const statusSummary = mergeSummaries(reportList.map((report) => report.statusSummary ?? summarizeCounts(report.evidence ?? [], 'status')));
  const benchmarkSuitabilitySummary = summarizeSuitability(reportList);
  return createScientificValidationManifest({
    manifestId: options.manifestId ?? 'anchor-pre-alpha-scientific-validation-manifest',
    applicationVersion: options.applicationVersion ?? 'pre-alpha',
    validationBaselineId: options.validationBaselineId ?? 'sci-valid-r2a-official-baseline',
    reports: reportList.map((report) => ({
      componentId: report.componentId,
      reportId: report.reportId,
      reportVersion: report.schemaVersion,
      reportDigest: report.reportDigest,
      path: options.pathForReport?.(report) ?? `validation/reports/${report.componentId}.json`
    })),
    evidenceLevelSummary,
    statusSummary,
    packageVersions: options.packageVersions ?? {},
    alphaPositioning: options.alphaPositioning ?? '',
    tagline: options.tagline ?? 'Plan. Simulate. Compare. Learn.',
    overallClaimBoundary: options.overallClaimBoundary,
    benchmarkSuitabilitySummary
  });
}

export function publicValidationSummary(reportOrManifest = {}) {
  if (reportOrManifest.type === 'anchor.scientific-validation-manifest') return scientificValidationManifestSummary(reportOrManifest);
  return scientificValidationReportSummary(reportOrManifest);
}

function normalizeEvidenceLevel(value) {
  const normalized = String(value ?? '').trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
  return LEVELS.includes(normalized) ? normalized : 'NOT_YET_EVALUATED';
}

function normalizeStatus(value) {
  const normalized = String(value ?? '').trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
  return STATUSES.includes(normalized) ? normalized : 'NOT_EVALUATED';
}

function normalizeReferenceRole(value) {
  const role = String(value ?? 'methodReference');
  return Object.values(VALIDATION_REFERENCE_ROLES).includes(role) ? role : 'methodReference';
}

function normalizeClaimBoundary(value = {}) {
  return {
    benchmarkOrEducationUse: value.benchmarkOrEducationUse !== false,
    operationalForecast: false,
    certifiedNavigation: false,
    calibratedDigitalTwin: false,
    ...(value ?? {}),
    operationalForecast: false,
    certifiedNavigation: false,
    calibratedDigitalTwin: false
  };
}

function normalizeSuitabilityDecision(value = {}) {
  return {
    deterministicRegression: normalizeDecision(value.deterministicRegression, 'GO'),
    educationalUse: normalizeDecision(value.educationalUse, 'GO'),
    classicalPlannerBenchmark: normalizeDecision(value.classicalPlannerBenchmark, 'CONDITIONAL'),
    mlDatasetGeneration: normalizeDecision(value.mlDatasetGeneration, 'CONDITIONAL'),
    operationalForecastUse: 'NO_GO',
    certifiedNavigationUse: 'NO_GO',
    rationale: requiredString(value.rationale ?? 'Deterministic evidence supports benchmark and education use within documented limitations.'),
    conditions: normalizeStringArray(value.conditions)
  };
}

function normalizeDecision(value, fallback) {
  const normalized = String(value ?? fallback).trim().toUpperCase();
  return Object.values(VALIDATION_DECISIONS).includes(normalized) ? normalized : fallback;
}

function validateSuitability(value, failures, path) {
  if (!value) {
    failures.push(failure('SUITABILITY_REQUIRED', 'Suitability decision is required.', path));
    return;
  }
  if (value.operationalForecastUse !== 'NO_GO') failures.push(failure('OPERATIONAL_NO_GO_REQUIRED', 'Operational forecast use must be NO_GO.', `${path}.operationalForecastUse`));
  if (value.certifiedNavigationUse !== 'NO_GO') failures.push(failure('NAVIGATION_NO_GO_REQUIRED', 'Certified navigation use must be NO_GO.', `${path}.certifiedNavigationUse`));
  if (!nonempty(value.rationale)) failures.push(failure('SUITABILITY_RATIONALE_REQUIRED', 'Suitability rationale is required.', `${path}.rationale`));
}

function hasNonPassEvidence(evidence = [], claimId) {
  return evidence.some((record) => record.claimId === claimId);
}

function summarizeCounts(rows = [], field) {
  const counts = {};
  for (const row of rows) {
    const key = row?.[field] ?? 'UNKNOWN';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function mergeSummaries(summaries = []) {
  const merged = {};
  for (const summary of summaries) for (const [key, value] of Object.entries(summary ?? {})) merged[key] = (merged[key] ?? 0) + Number(value ?? 0);
  return merged;
}

function summarizeSuitability(reports = []) {
  const summary = { deterministicRegression: {}, educationalUse: {}, classicalPlannerBenchmark: {}, mlDatasetGeneration: {}, operationalForecastUse: { NO_GO: 0 }, certifiedNavigationUse: { NO_GO: 0 } };
  for (const report of reports) {
    const decision = normalizeSuitabilityDecision(report.suitabilityDecision ?? {});
    for (const key of Object.keys(summary)) {
      summary[key][decision[key]] = (summary[key][decision[key]] ?? 0) + 1;
    }
  }
  return summary;
}

function prefixFailures(target, failures, prefix) {
  for (const item of failures) target.push({ ...item, path: `${prefix}${String(item.path ?? '$').replace(/^[.$]+/, '') ? `.${String(item.path ?? '$').replace(/^[.$]+/, '')}` : ''}` });
}

function validationResult(failures) {
  return { valid: failures.length === 0, status: failures.length ? 'FAIL' : 'PASS', warnings: [], failures };
}

function failure(code, message, path) {
  return { code, message, path };
}

function requiredString(value) {
  return String(value ?? '').trim();
}

function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  if (value == null) return [];
  return [String(value).trim()].filter(Boolean);
}

function normalizeMaybeNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeMeasuredValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  return clonePlain(value);
}

function normalizeDigestMap(value = {}) {
  const out = {};
  for (const [key, digest] of Object.entries(value ?? {})) out[String(key)] = String(digest ?? '');
  return out;
}

function normalizePackageVersions(value = {}) {
  const out = {};
  for (const [key, version] of Object.entries(value ?? {})) out[String(key)] = String(version ?? 'unknown');
  return out;
}

function normalizeReferences(value = []) {
  return (Array.isArray(value) ? value : []).map(normalizeValidationReference);
}

function repoRelativeCommand(value) {
  const text = String(value ?? '');
  return Boolean(text) && !/^[A-Za-z]:[\\/]/.test(text) && !text.includes('\\') && !text.includes('://');
}

function withoutDigestFields(value) {
  const copy = clonePlain(value ?? {});
  delete copy.claimDigest;
  delete copy.evidenceDigest;
  delete copy.reportDigest;
  delete copy.manifestDigest;
  return copy;
}

function clonePlain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}