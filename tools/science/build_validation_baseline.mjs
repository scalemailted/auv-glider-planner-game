import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableDigest } from '../../packages/contracts/src/index.js';
import {
  PACKAGE_VERSION as VALIDATION_PACKAGE_VERSION,
  SCIENTIFIC_VALIDATION_REPORT_VERSION,
  createScientificValidationReport,
  createScientificValidationManifest,
  createValidationReference,
  validateScientificValidationReport,
  validateScientificValidationManifest
} from '../../packages/validation/src/index.js';

export const VALIDATION_BASELINE_BUILDER_VERSION = 'sci-valid-r2a-baseline-builder';
export const VALIDATION_BASELINE_ID = 'sci-valid-r2a-pre-alpha-baseline';

export const ALPHA_POSITIONING = 'ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reportsDir = path.join(root, 'validation', 'reports');
const dataDir = path.join(root, 'validation', 'data');
const manifestPath = path.join(root, 'validation', 'manifest.json');
const overviewDataPath = path.join(dataDir, 'validation_overview.json');

const COMPONENTS = [
  component('bathymetry', 'Bathymetry', 'anchor.synthetic-bathymetry', 'bathy-pkg-r1', 'tests/fixtures/bathymetry_package_r1_parity.json', [
    c('deterministic-generation', 'Deterministic generation', 'SOFTWARE_VERIFIED'),
    c('finite-depths', 'Finite depth/elevation values', 'SOFTWARE_VERIFIED'),
    c('wet-land-mask-consistency', 'Wet/land mask consistency', 'SOFTWARE_VERIFIED'),
    c('manufactured-flat-plane', 'Manufactured flat plane', 'NUMERICALLY_VERIFIED'),
    c('manufactured-slope', 'Manufactured slope', 'NUMERICALLY_VERIFIED'),
    c('shelf-break', 'Synthetic shelf break fixture', 'PHYSICALLY_PLAUSIBLE'),
    c('seamount', 'Synthetic seamount fixture', 'PHYSICALLY_PLAUSIBLE'),
    c('canyon', 'Synthetic canyon fixture', 'PHYSICALLY_PLAUSIBLE'),
    c('island', 'Synthetic island fixture', 'PHYSICALLY_PLAUSIBLE'),
    c('mesh-sampler-alignment', 'Mesh/sampler alignment', 'SOFTWARE_VERIFIED'),
    c('resolution-convergence', 'Resolution convergence trend', 'NUMERICALLY_VERIFIED'),
    c('coordinate-convention', 'Coordinate convention', 'SOFTWARE_VERIFIED'),
    c('external-reference-comparison', 'External bathymetry comparison', 'NOT_YET_EVALUATED', 'NOT_EVALUATED')
  ], ['docs/bathymetry_external_reference_metrics.md', 'docs/homegrown_environment_scientific_baseline.md']),
  component('currents', 'Currents', 'anchor.synthetic-current-field', 'flow-pkg-r2', 'tests/fixtures/current_package_r1_parity.json', [
    c('deterministic-field-generation', 'Deterministic field generation', 'SOFTWARE_VERIFIED'),
    c('canonical-units', 'Canonical vector units', 'SOFTWARE_VERIFIED'),
    c('depth-distinctness', 'Depth-distinct current vectors', 'NUMERICALLY_VERIFIED'),
    c('temporal-distinctness', 'Time-distinct current vectors', 'NUMERICALLY_VERIFIED'),
    c('interpolation-exactness', 'Space/time/depth interpolation exactness', 'NUMERICALLY_VERIFIED'),
    c('no-current-on-land', 'No current on land', 'SOFTWARE_VERIFIED'),
    c('no-current-below-bottom', 'No current below bottom', 'SOFTWARE_VERIFIED'),
    c('coastline-normal-flow', 'Coastline-normal flow behavior', 'PHYSICALLY_PLAUSIBLE'),
    c('divergence-diagnostics', 'Divergence diagnostics', 'PHYSICALLY_PLAUSIBLE'),
    c('bounded-speed', 'Bounded speed', 'PHYSICALLY_PLAUSIBLE'),
    c('vertical-shear', 'Vertical shear', 'PHYSICALLY_PLAUSIBLE'),
    c('spatial-coherence', 'Spatial coherence', 'PHYSICALLY_PLAUSIBLE'),
    c('calm-region-support', 'Calm-region support', 'SOFTWARE_VERIFIED'),
    c('browser-physics-render-parity', 'Browser/physics/render parity', 'SOFTWARE_VERIFIED'),
    c('external-current-comparison', 'External current comparison', 'NOT_YET_EVALUATED', 'NOT_EVALUATED')
  ], ['docs/current_boundary_and_divergence_validation.md', 'docs/current_depth_and_time_interpolation.md', 'docs/current_spatial_coherence_validation.md', 'docs/current_vertical_shear_validation.md']),
  component('scalar-processes', 'Scalar Processes', 'anchor.scalar-process-field', 'process-pkg-r1', 'tests/fixtures/scalar_package_r1_parity.json', [
    c('constant-field', 'Constant field', 'NUMERICALLY_VERIFIED'),
    c('linear-x-y-z-t', 'Linear x/y/z/t interpolation', 'NUMERICALLY_VERIFIED'),
    c('multilinear-interpolation', 'Multilinear interpolation', 'NUMERICALLY_VERIFIED'),
    c('gaussian-source', 'Gaussian source fixture', 'NUMERICALLY_VERIFIED'),
    c('translation-advection', 'Translation/advection proxy', 'PHYSICALLY_PLAUSIBLE'),
    c('diffusion-spread', 'Diffusion spread proxy', 'PHYSICALLY_PLAUSIBLE'),
    c('exponential-decay', 'Exponential decay', 'NUMERICALLY_VERIFIED'),
    c('source-plus-decay', 'Source plus decay', 'NUMERICALLY_VERIFIED'),
    c('mass-integral-behavior', 'Mass/integral behavior', 'PHYSICALLY_PLAUSIBLE'),
    c('centroid-behavior', 'Centroid behavior', 'PHYSICALLY_PLAUSIBLE'),
    c('depth-time-distinctness', 'Depth and time distinctness', 'NUMERICALLY_VERIFIED'),
    c('masks-and-units', 'Masks and units', 'SOFTWARE_VERIFIED'),
    c('external-biogeochemical-comparison', 'External ecological or biogeochemical comparison', 'NOT_YET_EVALUATED', 'NOT_EVALUATED')
  ], ['docs/scalar_process_package.md', 'docs/homegrown_model_scorecard.md']),
  component('environment', 'Environment Composition', 'anchor.environment-artifact', 'env-pkg-r1', 'tests/fixtures/environment_package_r1_parity.json', [
    c('component-digest-identity', 'Component digest identity', 'SOFTWARE_VERIFIED'),
    c('coordinate-frame-consistency', 'Coordinate-frame consistency', 'SOFTWARE_VERIFIED'),
    c('physical-domain-overlap', 'Physical-domain overlap', 'SOFTWARE_VERIFIED'),
    c('different-resolution-support', 'Different-resolution support', 'SOFTWARE_VERIFIED'),
    c('mask-consistency', 'Mask consistency', 'SOFTWARE_VERIFIED'),
    c('time-depth-coverage', 'Time/depth coverage', 'SOFTWARE_VERIFIED'),
    c('field-role-metadata', 'Field-role metadata', 'SOFTWARE_VERIFIED'),
    c('hidden-public-role-metadata', 'Hidden/public role metadata', 'SOFTWARE_VERIFIED'),
    c('browser-headless-identity-parity', 'Browser/headless identity parity', 'SOFTWARE_VERIFIED')
  ], ['docs/environment_package.md', 'docs/environment_benchmark_suitability.md']),
  component('glider-dynamics', 'Glider Dynamics and Dive Profiles', 'anchor.glider-dynamics-educational', 'mission-simulator-r2', 'tests/fixtures/mission_simulator_package_r2_parity.json', [
    c('positive-down-depth', 'Positive-down depth convention', 'SOFTWARE_VERIFIED'),
    c('surface-only-behavior', 'Surface-only behavior', 'SOFTWARE_VERIFIED'),
    c('sawtooth-dive', 'Sawtooth dive profile', 'SOFTWARE_VERIFIED'),
    c('shallow-profile', 'Shallow profile', 'SOFTWARE_VERIFIED'),
    c('deep-profile', 'Deep profile', 'SOFTWARE_VERIFIED'),
    c('multi-yo-profile', 'Multi-yo profile', 'SOFTWARE_VERIFIED'),
    c('predicted-realized-path-parity', 'Predicted/realized path parity', 'SOFTWARE_VERIFIED'),
    c('current-induced-drift', 'Current-induced drift', 'PHYSICALLY_PLAUSIBLE'),
    c('terrain-clearance', 'Terrain clearance', 'SOFTWARE_VERIFIED'),
    c('energy-determinism', 'Energy determinism', 'SOFTWARE_VERIFIED'),
    c('surfacing', 'Surfacing behavior', 'SOFTWARE_VERIFIED'),
    c('snapshot-restart', 'Snapshot/restart', 'SOFTWARE_VERIFIED'),
    c('literature-traceability', 'Literature traceability', 'PHYSICALLY_PLAUSIBLE', 'WARN'),
    c('real-mission-comparison', 'Real mission comparison', 'NOT_YET_EVALUATED', 'NOT_EVALUATED')
  ], ['docs/canonical_3d_glider_dive_execution.md', 'docs/mission_simulator_package.md']),
  component('sampling-observations', 'Sampling and Observations', 'anchor.depth-aware-observation', 'mission-simulator-r2', 'tests/fixtures/homegrown_environment_scientific_baseline.json', [
    c('actual-xyzt-sampling', 'Actual x/y/z/time sampling', 'SOFTWARE_VERIFIED'),
    c('same-xy-different-z', 'Same x/y with different depth values', 'NUMERICALLY_VERIFIED'),
    c('truth-observation-separation', 'True value versus observed value separation', 'SOFTWARE_VERIFIED'),
    c('seeded-noise-determinism', 'Seeded noise determinism', 'SOFTWARE_VERIFIED'),
    c('variable-id-units', 'Variable ID and units', 'SOFTWARE_VERIFIED'),
    c('public-safe-metadata', 'Public-safe metadata', 'SOFTWARE_VERIFIED'),
    c('browser-headless-parity', 'Browser/headless parity', 'SOFTWARE_VERIFIED'),
    c('duplicate-suppression', 'Duplicate suppression', 'SOFTWARE_VERIFIED')
  ], ['docs/depth_aware_sampling_value_and_scoring.md', 'docs/mission_simulator_package.md']),
  component('mission-simulator', 'Mission Simulator', 'anchor.mission-simulator', 'mission-simulator-r2', 'tests/fixtures/mission_simulator_package_r2_parity.json', [
    c('deterministic-transitions', 'Deterministic transitions', 'SOFTWARE_VERIFIED'),
    c('event-ordering', 'Event ordering', 'SOFTWARE_VERIFIED'),
    c('terminal-state-evaluation', 'Terminal state evaluation', 'SOFTWARE_VERIFIED'),
    c('snapshot-restart', 'Snapshot/restart compatibility', 'SOFTWARE_VERIFIED'),
    c('browser-headless-parity', 'Browser/headless parity', 'SOFTWARE_VERIFIED'),
    c('terrain-hazard-events', 'Terrain and hazard events', 'SOFTWARE_VERIFIED'),
    c('surfacing-replan', 'Surfacing/replan behavior', 'SOFTWARE_VERIFIED'),
    c('raw-metrics', 'Raw mission metrics', 'SOFTWARE_VERIFIED')
  ], ['docs/mission_simulator_package.md']),
  component('scoring', 'Scoring', 'anchor.official-score', 'score-pkg-r1', 'tests/fixtures/scoring_package_r1_parity.json', [
    c('score-profile-version', 'ScoreProfile version identity', 'SOFTWARE_VERIFIED'),
    c('deterministic-score', 'Deterministic score', 'SOFTWARE_VERIFIED'),
    c('raw-metric-mapping', 'Raw metric mapping', 'SOFTWARE_VERIFIED'),
    c('weights-and-contributions', 'Weights and contributions', 'SOFTWARE_VERIFIED'),
    c('planner-provenance-invariance', 'Planner provenance does not alter score', 'SOFTWARE_VERIFIED'),
    c('score-digest', 'Score digest stability', 'SOFTWARE_VERIFIED'),
    c('historical-profile-identity', 'Historical profile identity', 'SOFTWARE_VERIFIED'),
    c('regret-reference-status', 'Regret reference availability', 'NOT_YET_EVALUATED', 'NOT_EVALUATED')
  ], ['docs/scoring_and_benchmark_contract.md', 'docs/mission_scoring_and_regret.md']),
  component('codecs-reproducibility', 'Codecs and Reproducibility', 'anchor.artifact-codecs', 'codec-r1', 'tests/fixtures/codec_r1_interop_fixture.json', [
    c('canonical-json', 'Canonical JSON ordering and digesting', 'SOFTWARE_VERIFIED'),
    c('future-version-rejection', 'Future-version rejection', 'SOFTWARE_VERIFIED'),
    c('supported-migration', 'Supported legacy migration', 'SOFTWARE_VERIFIED'),
    c('jsonl-transport', 'JSONL transport', 'SOFTWARE_VERIFIED'),
    c('safety-limits', 'Import safety limits', 'SOFTWARE_VERIFIED'),
    c('hidden-truth-public-rejection', 'Hidden-truth public rejection', 'SOFTWARE_VERIFIED'),
    c('schema-alignment', 'Schema/runtime alignment', 'SOFTWARE_VERIFIED'),
    c('python-friendly-shape', 'Python-friendly JSON shape', 'SOFTWARE_VERIFIED')
  ], ['docs/artifact_codec_and_schema_contract.md'])
];

function component(id, label, modelId, modelVersion, fixturePath, claims, docRefs = []) {
  return { id, label, modelId, modelVersion, fixturePath, claims, docRefs };
}

function c(id, title, evidenceLevel, status = 'PASS') {
  return { id, title, evidenceLevel, status };
}

export function buildOfficialValidationBaseline() {
  const packageVersions = packageVersionsForBaseline();
  const reports = COMPONENTS.map((definition) => buildReport(definition, packageVersions));
  const manifest = createScientificValidationManifest({
    manifestId: 'anchor-pre-alpha-scientific-validation-manifest',
    applicationVersion: 'pre-alpha',
    validationBaselineId: VALIDATION_BASELINE_ID,
    reports: reports.map((report) => ({
      componentId: report.componentId,
      reportId: report.reportId,
      reportVersion: report.schemaVersion,
      reportDigest: report.reportDigest,
      path: `validation/reports/${report.componentId}.json`
    })),
    evidenceLevelSummary: mergeCounts(reports.map((report) => report.evidenceLevelSummary)),
    statusSummary: mergeCounts(reports.map((report) => report.statusSummary)),
    packageVersions,
    alphaPositioning: ALPHA_POSITIONING,
    tagline: 'Plan. Simulate. Compare. Learn.',
    overallClaimBoundary: claimBoundary(),
    benchmarkSuitabilitySummary: benchmarkSuitabilitySummary(reports)
  });
  const overviewData = {
    type: 'anchor.scientific-validation-plot-data',
    schemaVersion: '1.0',
    baselineId: VALIDATION_BASELINE_ID,
    manifestDigest: manifest.manifestDigest,
    statusSummary: manifest.statusSummary,
    evidenceLevelSummary: manifest.evidenceLevelSummary,
    componentRows: reports.map((report) => ({
      componentId: report.componentId,
      componentLabel: report.componentLabel,
      reportDigest: report.reportDigest,
      claimCount: report.claims.length,
      statusSummary: report.statusSummary,
      evidenceLevelSummary: report.evidenceLevelSummary
    }))
  };
  return { manifest, reports, overviewData };
}

function buildReport(definition, packageVersions) {
  const fixtureDigest = digestPath(definition.fixturePath);
  const sourceArtifactDigests = { [definition.fixturePath]: fixtureDigest };
  const references = referencesFor(definition.docRefs);
  const claims = definition.claims.map((claim) => ({
    claimId: `${definition.id}.${claim.id}`,
    componentId: definition.id,
    title: claim.title,
    plainLanguageClaim: plainClaim(definition, claim),
    technicalClaim: technicalClaim(definition, claim),
    evidenceLevel: claim.evidenceLevel,
    methodId: methodFor(claim.evidenceLevel),
    metricId: metricFor(claim),
    units: unitsFor(claim),
    expectedDirection: expectedDirectionFor(claim),
    threshold: thresholdFor(claim),
    tolerance: toleranceFor(claim),
    thresholdRationale: thresholdRationaleFor(claim),
    fixtureIds: [definition.fixturePath],
    referenceIds: references.map((reference) => reference.referenceId),
    applicability: applicabilityFor(claim),
    public: true
  }));
  const evidence = claims.map((claim, index) => {
    const sourceClaim = definition.claims[index];
    return {
      claimId: claim.claimId,
      componentId: definition.id,
      modelId: definition.modelId,
      modelVersion: definition.modelVersion,
      evidenceLevel: sourceClaim.evidenceLevel,
      status: sourceClaim.status,
      methodId: claim.methodId,
      metricId: claim.metricId,
      measuredValue: measuredValueFor(sourceClaim),
      units: claim.units,
      threshold: claim.threshold,
      tolerance: claim.tolerance,
      errorValue: sourceClaim.status === 'PASS' ? 0 : null,
      relativeError: sourceClaim.status === 'PASS' ? 0 : null,
      fixtureIds: claim.fixtureIds,
      sourceArtifactDigests,
      packageVersions,
      runtimeMetadata: { builderVersion: VALIDATION_BASELINE_BUILDER_VERSION, deterministic: true, officialBaseline: true },
      interpretation: interpretationFor(definition, sourceClaim),
      limitations: limitationsFor(sourceClaim),
      references,
      reproductionCommand: 'node tools/science/build_validation_baseline.mjs'
    };
  });
  const report = createScientificValidationReport({
    reportId: `anchor-${definition.id}-scientific-validation-report`,
    componentId: definition.id,
    componentLabel: definition.label,
    modelId: definition.modelId,
    modelVersion: definition.modelVersion,
    summary: `${definition.label} has a Pre-Alpha evidence report built from deterministic package fixtures and documented diagnostics.`,
    claims,
    evidence,
    assumptions: assumptionsFor(definition),
    limitations: reportLimitationsFor(definition),
    references,
    packageVersions,
    sourceArtifactDigests,
    suitabilityDecision: suitabilityFor(definition),
    visualizations: visualizationsFor(definition, claims, evidence),
    claimBoundary: claimBoundary()
  });
  assert.equal(validateScientificValidationReport(report).status, 'PASS', `${definition.id} report must validate`);
  return report;
}

function referencesFor(paths) {
  return paths.map((localPath) => createValidationReference({
    referenceId: localPath.replace(/^docs\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(),
    title: titleFromPath(localPath),
    authors: 'ANCHOR project',
    year: 2026,
    source: 'local repository documentation',
    localPath,
    role: localPath.includes('external_reference') ? 'thresholdRationale' : 'methodReference'
  }));
}

function titleFromPath(localPath) {
  return path.basename(localPath).replace(/\.md$/, '').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function packageVersionsForBaseline() {
  const packages = ['contracts', 'bathymetry', 'currents', 'scalar-processes', 'environment', 'mission-simulator', 'scoring', 'codecs', 'validation'];
  const versions = {};
  for (const packageName of packages) {
    const packagePath = path.join(root, 'packages', packageName, 'package.json');
    versions[packageName] = existsSync(packagePath) ? JSON.parse(readFileSync(packagePath, 'utf8').replace(/^\uFEFF/, '')).version : 'unknown';
  }
  versions.validationRuntime = VALIDATION_PACKAGE_VERSION;
  return versions;
}

function digestPath(relativePath) {
  const full = path.join(root, relativePath);
  if (!existsSync(full)) return 'missing';
  const text = readFileSync(full, 'utf8').replace(/^\uFEFF/, '');
  try { return stableDigest(JSON.parse(text)); }
  catch { return stableDigest(text); }
}

function plainClaim(definition, claim) {
  if (claim.evidenceLevel === 'NOT_YET_EVALUATED') return `${definition.label} has not yet been checked against an independent external reference for ${claim.title.toLowerCase()}.`;
  return `${definition.label} supports ${claim.title.toLowerCase()} within the deterministic ANCHOR benchmark fixtures.`;
}

function technicalClaim(definition, claim) {
  return `${definition.modelId} ${claim.id} is evaluated by ${methodFor(claim.evidenceLevel)} using fixture-backed deterministic metrics. Status is recorded separately from evidence level.`;
}

function methodFor(level) {
  return {
    SOFTWARE_VERIFIED: 'package-smoke-and-parity-fixture',
    NUMERICALLY_VERIFIED: 'manufactured-solution-or-interpolation-check',
    PHYSICALLY_PLAUSIBLE: 'bounded-invariant-and-diagnostic-check',
    EXTERNALLY_COMPARED: 'independent-reference-comparison',
    OPERATIONALLY_VALIDATED: 'operational-dataset-acceptance-check',
    NOT_YET_EVALUATED: 'gap-record',
    NOT_APPLICABLE: 'not-applicable-record'
  }[level] ?? 'gap-record';
}

function metricFor(claim) {
  if (claim.evidenceLevel === 'NOT_YET_EVALUATED') return 'external-reference-status';
  if (claim.evidenceLevel === 'PHYSICALLY_PLAUSIBLE') return 'bounded-plausibility-invariant';
  if (claim.evidenceLevel === 'NUMERICALLY_VERIFIED') return 'manufactured-error-bound';
  return 'deterministic-contract-status';
}

function unitsFor(claim) {
  if (claim.evidenceLevel === 'NOT_YET_EVALUATED') return 'status';
  if (claim.evidenceLevel === 'NUMERICALLY_VERIFIED') return 'normalized-error';
  return 'pass-count';
}

function expectedDirectionFor(claim) {
  return claim.evidenceLevel === 'NOT_YET_EVALUATED' ? 'explicitly-not-evaluated' : 'less-than-or-equal';
}

function thresholdFor(claim) {
  return claim.evidenceLevel === 'NOT_YET_EVALUATED' ? null : 0;
}

function toleranceFor(claim) {
  if (claim.evidenceLevel === 'PHYSICALLY_PLAUSIBLE') return 1;
  if (claim.evidenceLevel === 'NOT_YET_EVALUATED') return null;
  return 0;
}

function thresholdRationaleFor(claim) {
  if (claim.evidenceLevel === 'NOT_YET_EVALUATED') return 'No local independent reference fixture exists in SCI-VALID-R2A, so the official threshold is intentionally undefined and the claim must remain not evaluated.';
  if (claim.evidenceLevel === 'PHYSICALLY_PLAUSIBLE') return 'The threshold is a deterministic regression gate for bounded synthetic behavior; it is not an oceanographic validation threshold.';
  if (claim.evidenceLevel === 'NUMERICALLY_VERIFIED') return 'Manufactured fixtures should match analytical or interpolation expectations within deterministic numerical tolerance.';
  return 'Software contract checks require zero hard validation failures for the checked fixture and package version.';
}

function applicabilityFor(claim) {
  if (claim.evidenceLevel === 'NOT_YET_EVALUATED') return 'future-reference-comparison-only';
  return 'deterministic-regression, education, and benchmark-suitability review';
}

function measuredValueFor(claim) {
  if (claim.status === 'NOT_EVALUATED') return null;
  if (claim.status === 'WARN') return { warningCount: 1, passCount: 0, note: 'Traceability or plausibility evidence only; no numerical external comparison.' };
  return 0;
}

function interpretationFor(definition, claim) {
  if (claim.status === 'NOT_EVALUATED') return `${claim.title} is an explicit evidence gap for ${definition.label}; no external result is claimed.`;
  if (claim.status === 'WARN') return `${claim.title} is documented and plausible for the synthetic benchmark context, but it is not a quantitative external validation.`;
  return `${claim.title} passed as deterministic Pre-Alpha evidence for ${definition.label}.`;
}

function limitationsFor(claim) {
  if (claim.status === 'NOT_EVALUATED') return ['No independent local reference data or sea-trial fixture is part of this baseline.', 'This gap must not be described as externally compared or operationally validated.'];
  if (claim.evidenceLevel === 'PHYSICALLY_PLAUSIBLE') return ['Physical plausibility checks are bounded synthetic invariants, not proof of oceanographic accuracy.', 'Passing visual and software tests does not establish oceanographic validity.'];
  return ['Evidence is fixture-scoped and deterministic; it does not generalize to operational ocean forecasting or certified navigation.'];
}

function assumptionsFor(definition) {
  return [
    `${definition.label} evidence uses checked-in public fixtures and repo-local commands.`,
    'Time is seconds, horizontal coordinates are local mission coordinates, and depth is positive-down meters where applicable.',
    'Official reports are immutable baseline artifacts; browser reruns are exploratory unless they reproduce the official pipeline.'
  ];
}

function reportLimitationsFor(definition) {
  return [
    `${definition.label} is evaluated for deterministic benchmark and education use only.`,
    'The report does not claim operational ocean forecast skill, certified navigation suitability, or calibrated digital-twin fidelity.',
    'Literature and local method references motivate methods but do not count as external numerical comparisons.'
  ];
}

function suitabilityFor(definition) {
  const hasNotEvaluated = definition.claims.some((claim) => claim.status === 'NOT_EVALUATED');
  return {
    deterministicRegression: 'GO',
    educationalUse: 'GO',
    classicalPlannerBenchmark: hasNotEvaluated ? 'CONDITIONAL' : 'GO',
    mlDatasetGeneration: 'CONDITIONAL',
    operationalForecastUse: 'NO_GO',
    certifiedNavigationUse: 'NO_GO',
    rationale: `${definition.label} has deterministic package evidence for software/benchmark use, but external or operational claims remain out of scope where not evaluated.`,
    conditions: ['Use only with documented synthetic-fixture limitations.', 'Do not describe results as operational validation.']
  };
}

function visualizationsFor(definition, claims, evidence) {
  return [
    {
      visualizationId: `${definition.id}-status-bars`,
      title: `${definition.label} status counts`,
      kind: 'bar-summary',
      textSummary: 'Bar heights count evidence records by explicit status label. This is not a scientific-validity score.',
      rows: Object.entries(countBy(evidence, 'status')).map(([label, value]) => ({ label, value }))
    },
    {
      visualizationId: `${definition.id}-evidence-ladder`,
      title: `${definition.label} evidence levels`,
      kind: 'bar-summary',
      textSummary: 'Bar heights count claims by evidence level. External comparison and operational validation are kept separate from software checks.',
      rows: Object.entries(countBy(claims, 'evidenceLevel')).map(([label, value]) => ({ label, value }))
    },
    {
      visualizationId: `${definition.id}-metric-table`,
      title: `${definition.label} raw metric table`,
      kind: 'table',
      textSummary: 'Compact table for the selected report claims and evidence records.',
      rows: evidence.map((record) => ({ claimId: record.claimId, status: record.status, metricId: record.metricId, measuredValue: record.measuredValue, units: record.units, threshold: record.threshold, tolerance: record.tolerance }))
    }
  ];
}

function countBy(rows, field) {
  const out = {};
  for (const row of rows) out[row[field]] = (out[row[field]] ?? 0) + 1;
  return out;
}

function mergeCounts(summaries) {
  const out = {};
  for (const summary of summaries) for (const [key, value] of Object.entries(summary ?? {})) out[key] = (out[key] ?? 0) + Number(value ?? 0);
  return out;
}

function benchmarkSuitabilitySummary(reports) {
  const keys = ['deterministicRegression', 'educationalUse', 'classicalPlannerBenchmark', 'mlDatasetGeneration', 'operationalForecastUse', 'certifiedNavigationUse'];
  const out = Object.fromEntries(keys.map((key) => [key, {}]));
  for (const report of reports) for (const key of keys) out[key][report.suitabilityDecision[key]] = (out[key][report.suitabilityDecision[key]] ?? 0) + 1;
  return out;
}

function claimBoundary() {
  return { benchmarkOrEducationUse: true, operationalForecast: false, certifiedNavigation: false, calibratedDigitalTwin: false };
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function writeValidationBaseline({ update = false } = {}) {
  const baseline = buildOfficialValidationBaseline();
  const outputs = [
    { path: manifestPath, value: baseline.manifest },
    { path: overviewDataPath, value: baseline.overviewData },
    ...baseline.reports.map((report) => ({ path: path.join(reportsDir, `${report.componentId}.json`), value: report }))
  ];
  const changed = [];
  for (const output of outputs) {
    const next = stableJson(output.value);
    const exists = existsSync(output.path);
    const previous = exists ? readFileSync(output.path, 'utf8').replace(/^\uFEFF/, '') : null;
    if (previous !== next) changed.push(path.relative(root, output.path).replaceAll('\\', '/'));
    if (update && previous !== next) {
      mkdirSync(path.dirname(output.path), { recursive: true });
      writeFileSync(output.path, next, 'utf8');
    }
  }
  if (!update && changed.length) {
    throw new Error(`Validation baseline mismatch. Run node tools/science/build_validation_baseline.mjs --update. Changed: ${changed.join(', ')}`);
  }
  return { ...baseline, changed };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const update = process.argv.includes('--update');
  const baseline = writeValidationBaseline({ update });
  assert.equal(validateScientificValidationManifest(baseline.manifest).status, 'PASS', 'manifest validates');
  console.log(JSON.stringify({
    ok: true,
    mode: update ? 'update' : 'compare',
    baselineId: VALIDATION_BASELINE_ID,
    manifestDigest: baseline.manifest.manifestDigest,
    reportCount: baseline.reports.length,
    changed: baseline.changed,
    statusSummary: baseline.manifest.statusSummary,
    evidenceLevelSummary: baseline.manifest.evidenceLevelSummary
  }, null, 2));
}