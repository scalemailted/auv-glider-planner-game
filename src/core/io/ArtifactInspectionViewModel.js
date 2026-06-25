import {
  CODEC_PACKAGE_VERSION,
  decodeArtifact,
  inspectArtifact
} from '../../../packages/codecs/src/index.js';

const counters = {
  encodeCount: 0,
  decodeCount: 0,
  migrationCount: 0,
  rejectionCount: 0
};

export function buildArtifactInspectionViewModel(input, options = {}) {
  const inspection = inspectArtifact(input, options);
  const decoded = decodeArtifact(input, options);
  counters.decodeCount += 1;
  if ((inspection.migrationSteps ?? []).length) counters.migrationCount += 1;
  if (inspection.status === 'REJECTED') counters.rejectionCount += 1;
  const viewModel = {
    title: inspection.artifactType ? `Artifact: ${inspection.artifactType}` : 'Unsupported Artifact',
    sourceFilename: options.sourceFilename ?? null,
    byteSize: options.byteSize ?? inspection.inputBytes ?? null,
    packageVersion: CODEC_PACKAGE_VERSION,
    artifactKind: inspection.artifactKind,
    artifactType: inspection.artifactType,
    sourceVersion: inspection.sourceVersion,
    targetVersion: inspection.targetVersion,
    payloadDigest: inspection.payloadDigest,
    envelopeDigest: inspection.envelopeDigest,
    producer: safeProducer(inspection.producer),
    visibilityClass: inspection.visibilityClass,
    fairnessClass: inspection.fairnessClass,
    identities: inspection.identities,
    scoreMetadata: inspection.scoreMetadata,
    migrationSteps: inspection.migrationSteps.map((step) => ({ id: step.id, sourceVersion: step.sourceVersion, targetVersion: step.targetVersion, lossless: step.lossless })),
    warnings: summarizeIssues(inspection.warnings),
    failures: summarizeIssues(inspection.failures),
    recommendedAction: inspection.recommendedAction,
    decodeStatus: inspection.decodeStatus,
    validationStatus: inspection.validationStatus,
    migrationStatus: inspection.migrationStatus,
    integrityStatus: inspection.integrityStatus,
    safetyStatus: inspection.safetyStatus,
    payload: decoded.payload
  };
  publishCodecDebug({ ...inspection, payload: undefined });
  return viewModel;
}

export function recordArtifactEncodeForDebug(summary = {}) {
  counters.encodeCount += 1;
  publishCodecDebug({ status: 'ACCEPTED', ...summary });
}

export function publishCodecDebug(inspection = {}) {
  globalThis.ANCHOR_CODEC_DEBUG = {
    packageVersion: CODEC_PACKAGE_VERSION,
    lastArtifactType: inspection.artifactType ?? null,
    sourceVersion: inspection.sourceVersion ?? null,
    targetVersion: inspection.targetVersion ?? null,
    payloadDigest: inspection.payloadDigest ?? null,
    envelopeDigest: inspection.envelopeDigest ?? null,
    decodeStatus: inspection.decodeStatus ?? inspection.status ?? null,
    validationStatus: inspection.validationStatus ?? null,
    migrationStatus: inspection.migrationStatus ?? null,
    integrityStatus: inspection.integrityStatus ?? null,
    safetyStatus: inspection.safetyStatus ?? null,
    inputBytes: inspection.inputBytes ?? null,
    migrationSteps: (inspection.migrationSteps ?? []).map((step) => step.id ?? step),
    warningCount: inspection.warningCount ?? inspection.warnings?.length ?? 0,
    failureCount: inspection.failureCount ?? inspection.failures?.length ?? 0,
    visibilityClass: inspection.visibilityClass ?? null,
    fairnessClass: inspection.fairnessClass ?? null,
    encodeCount: counters.encodeCount,
    decodeCount: counters.decodeCount,
    migrationCount: counters.migrationCount,
    rejectionCount: counters.rejectionCount,
    packageUsesDom: false,
    packageUsesPhaser: false,
    packageUsesThree: false,
    packageUsesNetwork: false,
    warnings: summarizeIssues(inspection.warnings ?? []),
    failures: summarizeIssues(inspection.failures ?? [])
  };
  return globalThis.ANCHOR_CODEC_DEBUG;
}

function safeProducer(producer) {
  if (!producer || typeof producer !== 'object') return null;
  return {
    application: producer.application ?? null,
    applicationVersion: producer.applicationVersion ?? null,
    runtimeVersion: producer.runtimeVersion ?? null,
    codecPackageVersion: producer.codecPackageVersion ?? null,
    environmentPackageVersion: producer.environmentPackageVersion ?? null,
    simulatorPackageVersion: producer.simulatorPackageVersion ?? null,
    scoringPackageVersion: producer.scoringPackageVersion ?? null
  };
}

function summarizeIssues(issues = []) {
  return issues.slice(0, 12).map((issue) => ({
    code: issue.code ?? 'ISSUE',
    message: issue.message ?? String(issue),
    path: issue.path ?? '$'
  }));
}