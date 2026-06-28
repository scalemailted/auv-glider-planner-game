import { canonicalJsonDigest, canonicalizeJsonValue } from '../../../packages/codecs/src/index.js';

export const REFERENCE_ENVIRONMENT_LAUNCH_WARNING_TAXONOMY_VERSION = 'reference-environment-launch-warning-taxonomy-r1-1';

export const REFERENCE_ENVIRONMENT_WARNING_SEVERITIES = Object.freeze([
  'INFO',
  'ADVISORY',
  'NON_BLOCKING_WARN',
  'BLOCKING_WARN',
  'FAIL'
]);

const DEFAULT_CLAIM_BOUNDARY = Object.freeze({
  deterministicSyntheticBenchmarkFields: true,
  calibratedOceanProduct: false,
  operationalForecast: false,
  certifiedForNavigation: false,
  hiddenTruthExposed: false,
  simulationChanged: false,
  scoringChanged: false
});

export const REFERENCE_ENVIRONMENT_WARNING_DEFINITIONS = Object.freeze({
  'mission-ready-patch-reference-derived': {
    severity: 'INFO',
    title: 'Reference-derived Monterey Canyon patch',
    explanation: 'The environment is derived from the public Monterey Canyon reference bathymetry patch.',
    userImpact: 'Planning can use this as a reproducible benchmark region, not as a live ocean product.',
    launchBlocking: false,
    recommendedAction: 'Confirm the selected fixture and provenance before sharing exported artifacts.'
  },
  'environment-artifact-composed': {
    severity: 'INFO',
    title: 'EnvironmentArtifact composed',
    explanation: 'The package-backed EnvironmentArtifact is current and validated for launch metadata use.',
    userImpact: 'Planning receives a stable environment identity and component digests.',
    launchBlocking: false,
    recommendedAction: 'Use the digest trail when comparing exported projects and benchmark bundles.'
  },
  'current-field-synthetic': {
    severity: 'ADVISORY',
    title: 'Synthetic CurrentField4D',
    explanation: 'Currents are deterministic synthetic benchmark fields conditioned by reference bathymetry.',
    userImpact: 'They are suitable for reproducible planner comparison, not operational ocean forecasting.',
    launchBlocking: false,
    recommendedAction: 'Keep the not-operational-forecast claim boundary visible in exported materials.'
  },
  'scalar-field-synthetic': {
    severity: 'ADVISORY',
    title: 'Synthetic ScalarField4D',
    explanation: 'Science scalar values and hotspots are deterministic synthetic benchmark fields.',
    userImpact: 'They support education and repeatable benchmark exercises, not calibrated ecological prediction.',
    launchBlocking: false,
    recommendedAction: 'Describe scalar results as synthetic benchmark science values.'
  },
  'benchmark-bundle-public-safe': {
    severity: 'INFO',
    title: 'Public benchmark bundle safe',
    explanation: 'The export path is configured for PUBLIC / FORECAST_ONLY benchmark artifacts.',
    userImpact: 'Students and external solvers can inspect public fields without receiving hidden truth.',
    launchBlocking: false,
    recommendedAction: 'Run the public-safety audit after bundle export.'
  },
  'no-operational-forecast': {
    severity: 'ADVISORY',
    title: 'Not an operational forecast',
    explanation: 'This workflow does not use HYCOM, Copernicus, calibrated ecology, or navigation-certified products.',
    userImpact: 'The environment is a constrained benchmark, not a decision aid for real vehicle operations.',
    launchBlocking: false,
    recommendedAction: 'Keep this limitation visible in Planning, docs, and benchmark exports.'
  },
  'start-zone-separation-low': {
    severity: 'NON_BLOCKING_WARN',
    title: 'Limited start/drop-zone separation',
    explanation: 'Validated starts exist, but the candidate count is smaller than the intended fleet size.',
    userImpact: 'Launch is allowed for a single active glider or short QA route; fleet studies should review starts.',
    launchBlocking: false,
    recommendedAction: 'Use the first validated active-glider start, or regenerate/review starts before fleet benchmarks.'
  },
  'shallow-margin-near-start': {
    severity: 'NON_BLOCKING_WARN',
    title: 'Start/drop zone near shallow margin',
    explanation: 'At least one valid start candidate is near shallow water or a land boundary.',
    userImpact: 'Manual route planning should avoid immediate shallow/land-adjacent turns.',
    launchBlocking: false,
    recommendedAction: 'Inspect the start zone before placing waypoints.'
  },
  'hazard-field-empty': {
    severity: 'NON_BLOCKING_WARN',
    title: 'No generated hazards',
    explanation: 'No hazard candidates were generated, so benchmark export falls back to an all-zero public hazard field.',
    userImpact: 'Planner comparison remains valid, but hazard-avoidance behavior is not exercised.',
    launchBlocking: false,
    recommendedAction: 'Use a region with generated hazards when testing hazard-aware planners.'
  },
  'hazard-candidates-public-safe': {
    severity: 'INFO',
    title: 'Hazard candidates public-safe',
    explanation: 'Generated hazard metadata is marked public-safe and can be exported with benchmark artifacts.',
    userImpact: 'Hazard fields do not expose hidden truth or raw external-data paths.',
    launchBlocking: false,
    recommendedAction: 'Preserve the visibility metadata during export/import round trips.'
  },
  'environment-artifact-validation-warning': {
    severity: 'NON_BLOCKING_WARN',
    title: 'EnvironmentArtifact validation warning',
    explanation: 'The package validator returned a warning that does not invalidate the EnvironmentArtifact.',
    userImpact: 'Planning may proceed, but the warning should remain visible for owner review.',
    launchBlocking: false,
    recommendedAction: 'Review the package validation detail before alpha retesting.'
  },
  'start-zone-missing': {
    severity: 'FAIL',
    title: 'No valid start/drop zone',
    explanation: 'Planning launch requires at least one finite wet start/drop-zone candidate.',
    userImpact: 'The environment cannot be launched to Planning safely.',
    launchBlocking: true,
    recommendedAction: 'Regenerate or manually validate start/drop-zone candidates.'
  },
  'environment-artifact-invalid': {
    severity: 'FAIL',
    title: 'EnvironmentArtifact invalid',
    explanation: 'The package-backed EnvironmentArtifact is missing, stale, or failed validation.',
    userImpact: 'Planning would not receive a reliable environment identity.',
    launchBlocking: true,
    recommendedAction: 'Compose the EnvironmentArtifact again and inspect validation errors.'
  },
  'field-artifact-missing': {
    severity: 'FAIL',
    title: 'Required field artifact missing',
    explanation: 'CurrentField4D or ScalarField4D digest metadata is missing.',
    userImpact: 'Planning and benchmark export cannot prove which fields are active.',
    launchBlocking: true,
    recommendedAction: 'Regenerate currents and science fields from the reference bathymetry.'
  },
  'field-artifact-invalid': {
    severity: 'FAIL',
    title: 'Required field artifact invalid',
    explanation: 'Current or scalar diagnostics failed launch validation.',
    userImpact: 'Planning launch is blocked to avoid using invalid environment fields.',
    launchBlocking: true,
    recommendedAction: 'Regenerate fields or inspect package diagnostics.'
  },
  'public-safety-failure': {
    severity: 'FAIL',
    title: 'Public-safety validation failed',
    explanation: 'Launch metadata contains a hidden-truth marker or unsafe public-artifact signal.',
    userImpact: 'Public export and Planning launch are blocked.',
    launchBlocking: true,
    recommendedAction: 'Remove hidden-truth/raw-path markers and rerun the public-safety audit.'
  }
});

export function classifyReferenceEnvironmentWarning(input = {}) {
  const normalized = typeof input === 'string' ? { warningId: inferWarningId(input), detail: input } : { ...input };
  const warningId = normalized.warningId ?? normalized.id ?? inferWarningId(normalized.detail ?? normalized.title);
  const definition = REFERENCE_ENVIRONMENT_WARNING_DEFINITIONS[warningId]
    ?? REFERENCE_ENVIRONMENT_WARNING_DEFINITIONS['environment-artifact-validation-warning'];
  const severity = normalizeSeverity(normalized.severity ?? definition.severity);
  const warning = {
    warningId,
    severity,
    title: String(normalized.title ?? definition.title),
    explanation: String(normalized.explanation ?? normalized.detail ?? definition.explanation),
    userImpact: String(normalized.userImpact ?? definition.userImpact),
    launchBlocking: Boolean(normalized.launchBlocking ?? definition.launchBlocking ?? severity === 'BLOCKING_WARN' ?? severity === 'FAIL'),
    recommendedAction: String(normalized.recommendedAction ?? definition.recommendedAction),
    relatedArtifactDigest: normalized.relatedArtifactDigest ?? null,
    scientificClaimBoundary: {
      ...DEFAULT_CLAIM_BOUNDARY,
      ...(definition.scientificClaimBoundary ?? {}),
      ...(normalized.scientificClaimBoundary ?? {})
    }
  };
  warning.launchBlocking = warning.launchBlocking || severity === 'BLOCKING_WARN' || severity === 'FAIL';
  return {
    ...warning,
    warningDigest: canonicalJsonDigest(canonicalizeJsonValue(warning))
  };
}

export function failureToReferenceEnvironmentWarning(input = {}) {
  return classifyReferenceEnvironmentWarning({
    warningId: input.warningId ?? input.failureId ?? 'field-artifact-invalid',
    severity: 'FAIL',
    title: input.title,
    explanation: input.explanation ?? input.error ?? input.message,
    userImpact: input.userImpact ?? 'Planning launch is blocked until this validation failure is resolved.',
    launchBlocking: true,
    recommendedAction: input.recommendedAction ?? 'Fix the failing component and rerun launch validation.',
    relatedArtifactDigest: input.relatedArtifactDigest,
    scientificClaimBoundary: input.scientificClaimBoundary
  });
}

export function summarizeReferenceEnvironmentWarnings(warnings = [], failures = []) {
  const warningList = warnings.map(classifyReferenceEnvironmentWarning);
  const failureList = failures.map((failure) => failure.severity === 'FAIL'
    ? classifyReferenceEnvironmentWarning(failure)
    : failureToReferenceEnvironmentWarning(failure));
  const all = [...warningList, ...failureList];
  const bySeverity = Object.fromEntries(REFERENCE_ENVIRONMENT_WARNING_SEVERITIES.map((severity) => [severity, 0]));
  for (const warning of all) bySeverity[warning.severity] = Number(bySeverity[warning.severity] ?? 0) + 1;
  const blockingWarningCount = warningList.filter((warning) => warning.launchBlocking || warning.severity === 'BLOCKING_WARN').length;
  const failureCount = failureList.length + warningList.filter((warning) => warning.severity === 'FAIL').length;
  const nonBlockingWarningCount = warningList.filter((warning) => !warning.launchBlocking && ['ADVISORY', 'NON_BLOCKING_WARN'].includes(warning.severity)).length;
  const summary = {
    totalWarningCount: warningList.length,
    advisoryCount: bySeverity.ADVISORY,
    nonBlockingWarningCount,
    blockingWarningCount,
    failureCount,
    infoCount: bySeverity.INFO,
    bySeverity,
    launchAllowed: blockingWarningCount === 0 && failureCount === 0,
    highestSeverity: highestSeverity(all)
  };
  return {
    ...summary,
    warningSummaryDigest: canonicalJsonDigest(canonicalizeJsonValue(summary))
  };
}

export function referenceEnvironmentWarningsAllowPlanning(warnings = [], failures = []) {
  return summarizeReferenceEnvironmentWarnings(warnings, failures).launchAllowed === true;
}

function inferWarningId(message = '') {
  const text = String(message ?? '').toLowerCase();
  if (/start|drop/.test(text) && /missing|no .*candidate/.test(text)) return 'start-zone-missing';
  if (/start|drop/.test(text)) return 'start-zone-separation-low';
  if (/hazard/.test(text) && /no|empty|zero/.test(text)) return 'hazard-field-empty';
  if (/current/.test(text) && /synthetic/.test(text)) return 'current-field-synthetic';
  if (/scalar|science/.test(text) && /synthetic/.test(text)) return 'scalar-field-synthetic';
  if (/operational|forecast|hycom|copernicus|navigation/.test(text)) return 'no-operational-forecast';
  if (/environmentartifact|environment artifact/.test(text) && /invalid|missing|fail/.test(text)) return 'environment-artifact-invalid';
  if (/hidden|oracle|raw/.test(text)) return 'public-safety-failure';
  return 'environment-artifact-validation-warning';
}

function normalizeSeverity(value = 'ADVISORY') {
  const severity = String(value ?? 'ADVISORY').toUpperCase();
  return REFERENCE_ENVIRONMENT_WARNING_SEVERITIES.includes(severity) ? severity : 'ADVISORY';
}

function highestSeverity(warnings = []) {
  let best = 'INFO';
  for (const warning of warnings) {
    if (severityRank(warning.severity) > severityRank(best)) best = warning.severity;
  }
  return best;
}

function severityRank(severity) {
  return REFERENCE_ENVIRONMENT_WARNING_SEVERITIES.indexOf(severity);
}
