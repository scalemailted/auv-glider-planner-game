export const CODEC_PACKAGE_VERSION = 'anchor-codecs-codec-r1';
export const PACKAGE_VERSION = CODEC_PACKAGE_VERSION;
export const CANONICAL_JSON_VERSION = 'anchor-canonical-json-codec-r1';
export const CANONICAL_DIGEST_VERSION = 'fnv1a32-canonical-json-codec-r1';
export const ARTIFACT_ENVELOPE_VERSION = 'anchor-artifact-envelope-codec-r1';
export const BUNDLE_MANIFEST_VERSION = 'anchor-bundle-manifest-codec-r1';
export const CODEC_REPORT_VERSION = 'anchor-codec-report-codec-r1';
export const ARTIFACT_SAFETY_LIMITS_VERSION = 'anchor-artifact-safety-limits-codec-r1';
export const ARTIFACT_KIND_REGISTRY_VERSION = 'anchor-artifact-kind-registry-codec-r1';
export const JSON_LINES_CODEC_VERSION = 'anchor-json-lines-codec-r1';
export const MIGRATION_REGISTRY_VERSION = 'anchor-migration-registry-codec-r1';

export const DecodeStatus = Object.freeze({
  ACCEPTED: 'ACCEPTED',
  ACCEPTED_WITH_WARNINGS: 'ACCEPTED_WITH_WARNINGS',
  REJECTED: 'REJECTED'
});

export const FailureCodes = Object.freeze({
  INVALID_JSON: 'INVALID_JSON',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  UNSUPPORTED_ARTIFACT_TYPE: 'UNSUPPORTED_ARTIFACT_TYPE',
  MISSING_VERSION: 'MISSING_VERSION',
  UNSUPPORTED_LEGACY_VERSION: 'UNSUPPORTED_LEGACY_VERSION',
  UNSUPPORTED_FUTURE_VERSION: 'UNSUPPORTED_FUTURE_VERSION',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  RUNTIME_VALIDATION_FAILED: 'RUNTIME_VALIDATION_FAILED',
  MIGRATION_FAILED: 'MIGRATION_FAILED',
  DIGEST_MISMATCH: 'DIGEST_MISMATCH',
  VISIBILITY_POLICY_CONFLICT: 'VISIBILITY_POLICY_CONFLICT',
  NONFINITE_NUMBER: 'NONFINITE_NUMBER',
  DIMENSION_LIMIT_EXCEEDED: 'DIMENSION_LIMIT_EXCEEDED',
  UNSAFE_OBJECT_KEY: 'UNSAFE_OBJECT_KEY'
});

export const VisibilityClasses = Object.freeze({
  PUBLIC: 'PUBLIC',
  PUBLIC_OBSERVATION_ONLY: 'PUBLIC_OBSERVATION_ONLY',
  FORECAST_ONLY: 'FORECAST_ONLY',
  BELIEF_AWARE: 'BELIEF_AWARE',
  ORACLE_HIDDEN_TRUTH: 'ORACLE_HIDDEN_TRUTH',
  INTERNAL: 'INTERNAL',
  TEACHING_FIXTURE: 'TEACHING_FIXTURE'
});

export const FairnessClasses = Object.freeze({
  PUBLIC_FAIR: 'PUBLIC_FAIR',
  FORECAST_ONLY: 'FORECAST_ONLY',
  BELIEF_AWARE: 'BELIEF_AWARE',
  ORACLE_ASSISTED: 'ORACLE_ASSISTED',
  INTERNAL_REPLAY: 'INTERNAL_REPLAY',
  TEACHING_FIXTURE: 'TEACHING_FIXTURE'
});

export const ArtifactFamilies = Object.freeze({
  ALPHA_CRITICAL: 'ALPHA_CRITICAL',
  SUPPORTED_COMPATIBILITY: 'SUPPORTED_COMPATIBILITY',
  INTERNAL_ONLY: 'INTERNAL_ONLY',
  TEACHING_DEMO: 'TEACHING_DEMO',
  DEPRECATED: 'DEPRECATED',
  UNKNOWN_REVIEW_REQUIRED: 'UNKNOWN_REVIEW_REQUIRED'
});

const K = ArtifactFamilies;
const V = VisibilityClasses;
const F = FairnessClasses;

const entries = [
  entry('challenge', 'anchor.challenge', '3.0', 'schemas/challenge.schema.json', K.ALPHA_CRITICAL, V.PUBLIC, F.PUBLIC_FAIR, 'anchor.challenge.json'),
  entry('level', 'anchor.level', '2.0', 'schemas/level.schema.json', K.ALPHA_CRITICAL, V.PUBLIC, F.PUBLIC_FAIR, 'anchor.level.json'),
  entry('mission', 'anchor.mission', '2.0', 'schemas/mission.schema.json', K.ALPHA_CRITICAL, V.PUBLIC, F.PUBLIC_FAIR, 'anchor.mission.json'),
  entry('plan', 'anchor.plan', '2.0', 'schemas/plan.schema.json', K.ALPHA_CRITICAL, V.PUBLIC, F.PUBLIC_FAIR, 'anchor.plan.json', ['1.0']),
  entry('planSegment', 'anchor.plan-segment', '1.0', 'schemas/plan-segment.schema.json', K.ALPHA_CRITICAL, V.PUBLIC, F.PUBLIC_FAIR, 'anchor.plan-segment.json'),
  entry('environmentManifest', 'anchor.environment.manifest', 'environment-manifest-env-pkg-r1', null, K.ALPHA_CRITICAL, V.PUBLIC, F.PUBLIC_FAIR, 'anchor.environment-manifest.json'),
  entry('environmentArtifactMetadata', 'anchor.environment-artifact-metadata', 'environment-artifact-env-pkg-r1', null, K.ALPHA_CRITICAL, V.PUBLIC, F.PUBLIC_FAIR, 'anchor.environment-artifact-metadata.json'),
  entry('solverPacket', 'anchor.solverPacket', '2.0', 'schemas/solver-packet.schema.json', K.ALPHA_CRITICAL, V.FORECAST_ONLY, F.FORECAST_ONLY, 'anchor.solver-packet.json'),
  entry('classicalPlannerBenchmarkBundle', 'anchor.classical-planner-benchmark-bundle', '1.0.0', 'schemas/classical-planner-benchmark-bundle.schema.json', K.ALPHA_CRITICAL, V.PUBLIC, F.FORECAST_ONLY, 'anchor.classical-planner-benchmark-bundle.json'),
  entry('externalSolverPlan', 'anchor.plan', '2.0', 'schemas/plan.schema.json', K.ALPHA_CRITICAL, V.PUBLIC, F.FORECAST_ONLY, 'anchor.external-plan.json', ['1.0']),
  entry('simulationSnapshot', 'anchor.simulation.snapshot', 'mission-simulator-snapshot-r2', null, K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.PUBLIC_FAIR, 'anchor.simulation-snapshot.json'),
  entry('result', 'anchor.result', '3.0', 'schemas/result.schema.json', K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.PUBLIC_FAIR, 'anchor.result.json'),
  entry('scoreResult', 'anchor.score.result', 'score-result-score-pkg-r1', null, K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.PUBLIC_FAIR, 'anchor.score-result.json', [], 'version'),
  entry('replayManifest', 'anchor.headless.replay-manifest', '1.0', 'schemas/replay-manifest.schema.json', K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.INTERNAL_REPLAY, 'anchor.replay-manifest.json'),
  entry('replayEvents', 'anchor.headless.replay-events', '1.0', 'schemas/replay-events.schema.json', K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.INTERNAL_REPLAY, 'anchor.replay-events.json'),
  entry('replayCheckpoints', 'anchor.headless.replay-checkpoints', '1.0', 'schemas/replay-checkpoints.schema.json', K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.INTERNAL_REPLAY, 'anchor.replay-checkpoints.json'),
  entry('replayBundle', 'anchor.headless.bundle', '1.0', 'schemas/replay-bundle.schema.json', K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.INTERNAL_REPLAY, 'anchor.replay-bundle.json'),
  entry('headlessBundle', 'anchor.headless.bundle', '1.0', 'schemas/replay-bundle.schema.json', K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.INTERNAL_REPLAY, 'anchor.headless-bundle.json'),
  entry('solverRoundtripBundle', 'anchor.headless.solver-roundtrip-bundle', '1.0', 'schemas/replay-bundle.schema.json', K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.FORECAST_ONLY, 'anchor.solver-roundtrip-bundle.json'),
  entry('benchmarkRecord', 'anchor.benchmark.run-record', 'benchmark-run-record-p2', null, K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.PUBLIC_FAIR, 'anchor.benchmark-run-record.json'),
  entry('benchmarkComparison', 'anchor.benchmark.comparison', 'benchmark-comparison-export-p3', null, K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.PUBLIC_FAIR, 'anchor.benchmark-comparison.json'),
  entry('surfaceObservation', 'anchor.surfaceObservation', '3.0', 'schemas/surface-observation.schema.json', K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.PUBLIC_FAIR, 'anchor.surface-observation.json'),
  entry('datasetManifest', 'anchor.dataset-manifest', '2.0', 'schemas/dataset.schema.json', K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.PUBLIC_FAIR, 'anchor.dataset-manifest.json'),
  entry('mlJsonlRecord', 'anchor.ml-jsonl-record', '0.1-codec-r1-placeholder', null, K.ALPHA_CRITICAL, V.PUBLIC_OBSERVATION_ONLY, F.PUBLIC_FAIR, 'anchor.training.jsonl'),
  entry('headlessRoundtripReport', 'anchor.headless.solver-roundtrip-report', '1.0', 'schemas/headless-roundtrip-report.schema.json', K.SUPPORTED_COMPATIBILITY, V.PUBLIC_OBSERVATION_ONLY, F.FORECAST_ONLY, 'anchor.solver-roundtrip-report.json'),
  entry('scientificValidationReport', 'anchor.scientific-validation-report', '1.0', 'schemas/scientific-validation-report.schema.json', K.ALPHA_CRITICAL, V.PUBLIC, F.PUBLIC_FAIR, 'anchor.scientific-validation-report.json'),
  entry('scientificValidationManifest', 'anchor.scientific-validation-manifest', '1.0', 'schemas/scientific-validation-manifest.schema.json', K.ALPHA_CRITICAL, V.PUBLIC, F.PUBLIC_FAIR, 'anchor.scientific-validation-manifest.json'),
  entry('leaderboard', 'anchor.leaderboard', '3.0', 'schemas/leaderboard.schema.json', K.SUPPORTED_COMPATIBILITY, V.PUBLIC_OBSERVATION_ONLY, F.PUBLIC_FAIR, 'anchor.leaderboard.json'),
  entry('oracleDataset', 'anchor.oracleDataset', '3.0', 'schemas/oracle-dataset.schema.json', K.SUPPORTED_COMPATIBILITY, V.ORACLE_HIDDEN_TRUTH, F.ORACLE_ASSISTED, 'anchor.oracle-dataset.json'),
  entry('demoArtifact', 'anchor.demo-artifact', '1.1', 'schemas/demo-artifact.schema.json', K.TEACHING_DEMO, V.TEACHING_FIXTURE, F.TEACHING_FIXTURE, 'anchor.demo-artifact.json')
];

function entry(kind, artifactType, currentVersion, schemaId, family, visibilityClass, fairnessClass, defaultFilename, supportedLegacyVersions = [], versionField = 'schemaVersion') {
  return Object.freeze({
    kind,
    mediaType: kind === 'mlJsonlRecord' ? 'application/jsonl' : 'application/json',
    artifactType,
    currentVersion,
    schemaId,
    public: visibilityClass !== VisibilityClasses.ORACLE_HIDDEN_TRUTH && visibilityClass !== VisibilityClasses.INTERNAL,
    visibilityClass,
    fairnessClass,
    family,
    supportedLegacyVersions: Object.freeze([...supportedLegacyVersions]),
    encoderId: `${kind}:canonical-json:${currentVersion}`,
    decoderId: `${kind}:canonical-json:${currentVersion}`,
    validatorId: `${kind}:runtime-validator:${currentVersion}`,
    migrationIds: Object.freeze(supportedLegacyVersions.map((sourceVersion) => `${artifactType}:${sourceVersion}->${currentVersion}`)),
    defaultFilename,
    versionField
  });
}

const byKind = new Map(entries.map((item) => [item.kind, item]));
const byType = new Map();
for (const item of entries) {
  if (!byType.has(item.artifactType)) byType.set(item.artifactType, []);
  byType.get(item.artifactType).push(item);
}

export function artifactKindRegistry() {
  return entries.map((item) => ({ ...item, supportedLegacyVersions: [...item.supportedLegacyVersions], migrationIds: [...item.migrationIds] }));
}

export function artifactKindById(kind) {
  const item = byKind.get(String(kind ?? ''));
  return item ? { ...item, supportedLegacyVersions: [...item.supportedLegacyVersions], migrationIds: [...item.migrationIds] } : null;
}

export function artifactKindByType(artifactType) {
  return (byType.get(String(artifactType ?? '')) ?? []).map((item) => ({ ...item, supportedLegacyVersions: [...item.supportedLegacyVersions], migrationIds: [...item.migrationIds] }));
}

export function versionForArtifact(value, registryEntry = null) {
  if (!value || typeof value !== 'object') return null;
  const versionField = registryEntry?.versionField ?? 'schemaVersion';
  return value[versionField] ?? value.schemaVersion ?? value.artifactVersion ?? value.version ?? value.formatVersion ?? null;
}

export function detectArtifactKind(value, options = {}) {
  const payload = value?.payload && value?.artifactType ? value.payload : value;
  if (!payload || typeof payload !== 'object') return null;
  const explicitKind = options.kind ?? payload.kind ?? payload.artifactKind ?? null;
  if (explicitKind && byKind.has(String(explicitKind))) return artifactKindById(String(explicitKind));
  const artifactType = value?.artifactType ?? payload.type ?? payload.artifactType ?? payload.bundleType ?? null;
  if (!artifactType) {
    if (Array.isArray(payload.records)) return artifactKindById('datasetManifest');
    return null;
  }
  const candidates = byType.get(String(artifactType)) ?? [];
  if (!candidates.length) return null;
  if (options.kind) return candidates.find((item) => item.kind === options.kind) ?? null;
  if (String(artifactType) === 'anchor.plan' && payload?.meta?.solverPacketDigest) return artifactKindById('externalSolverPlan');
  return candidates[0] ? artifactKindById(candidates[0].kind) : null;
}

export function knownVisibilityClass(value) {
  return Object.values(VisibilityClasses).includes(value);
}

export function knownFairnessClass(value) {
  return Object.values(FairnessClasses).includes(value);
}
