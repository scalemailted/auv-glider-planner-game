import {
  ARTIFACT_ENVELOPE_VERSION,
  BUNDLE_MANIFEST_VERSION,
  CODEC_PACKAGE_VERSION,
  CANONICAL_DIGEST_VERSION,
  FailureCodes,
  knownFairnessClass,
  knownVisibilityClass,
  detectArtifactKind,
  versionForArtifact
} from './ArtifactKindRegistry.js';
import { canonicalJsonDigest, canonicalJsonDigestRecord, cloneCanonicalJson } from './CanonicalJson.js';
import { safetyReportForValue } from './Safety.js';
import { codecFailure, codecWarning } from './CodecError.js';

const DEFAULT_CREATED_AT = '1970-01-01T00:00:00.000Z';

export function createArtifactEnvelope(options = {}) {
  const payload = cloneCanonicalJson(options.payload ?? {});
  const entry = options.registryEntry ?? detectArtifactKind(payload, { kind: options.kind });
  const artifactType = options.artifactType ?? entry?.artifactType ?? payload.type ?? payload.artifactType ?? 'anchor.unknown';
  const artifactVersion = String(options.artifactVersion ?? versionForArtifact(payload, entry) ?? entry?.currentVersion ?? 'unknown');
  const visibilityClass = options.visibilityClass ?? entry?.visibilityClass ?? payload.visibilityClass ?? payload.visibility?.class ?? 'PUBLIC';
  const fairnessClass = options.fairnessClass ?? entry?.fairnessClass ?? payload.fairnessClass ?? payload.fairness?.class ?? 'PUBLIC_FAIR';
  const payloadDigest = options.payloadDigest ?? canonicalJsonDigest(payload);
  const withoutDigest = {
    envelopeVersion: ARTIFACT_ENVELOPE_VERSION,
    artifactType,
    artifactVersion,
    createdAt: options.createdAt ?? DEFAULT_CREATED_AT,
    producer: normalizeProducer(options.producer),
    packageVersions: normalizePackageVersions(options.packageVersions),
    schemaId: options.schemaId ?? entry?.schemaId ?? null,
    visibilityClass,
    fairnessClass,
    payload,
    payloadDigest,
    provenance: cloneCanonicalJson(options.provenance ?? {}),
    integrity: cloneCanonicalJson(options.integrity ?? { digestAlgorithm: CANONICAL_DIGEST_VERSION }),
    compatibility: cloneCanonicalJson(options.compatibility ?? { currentVersion: entry?.currentVersion ?? artifactVersion, supportedLegacyVersions: entry?.supportedLegacyVersions ?? [] })
  };
  const envelopeDigest = options.envelopeDigest ?? canonicalJsonDigest(withoutDigest);
  return { ...withoutDigest, envelopeDigest };
}

export function normalizeArtifactEnvelope(value) {
  if (!value || typeof value !== 'object') return createArtifactEnvelope({ payload: {} });
  if (value.payload && value.artifactType) {
    return createArtifactEnvelope({
      ...value,
      payload: value.payload,
      artifactType: value.artifactType,
      artifactVersion: value.artifactVersion,
      payloadDigest: value.payloadDigest,
      envelopeDigest: value.envelopeDigest
    });
  }
  return createArtifactEnvelope({ payload: value });
}

export function validateArtifactEnvelope(value, options = {}) {
  const envelope = normalizeArtifactEnvelope(value);
  const failures = [];
  const warnings = [];
  if (!envelope.artifactType || envelope.artifactType === 'anchor.unknown') failures.push(codecFailure(FailureCodes.UNSUPPORTED_ARTIFACT_TYPE, 'Envelope is missing a supported artifact type.', '$.artifactType'));
  if (!envelope.artifactVersion || envelope.artifactVersion === 'unknown') failures.push(codecFailure(FailureCodes.MISSING_VERSION, 'Envelope is missing an artifact version.', '$.artifactVersion'));
  if (!knownVisibilityClass(envelope.visibilityClass)) failures.push(codecFailure(FailureCodes.VISIBILITY_POLICY_CONFLICT, `Unknown visibility class ${envelope.visibilityClass}.`, '$.visibilityClass'));
  if (!knownFairnessClass(envelope.fairnessClass)) warnings.push(codecWarning('UNKNOWN_FAIRNESS_CLASS', `Unknown fairness class ${envelope.fairnessClass}.`, '$.fairnessClass'));
  const expectedPayloadDigest = canonicalJsonDigest(envelope.payload);
  if (envelope.payloadDigest !== expectedPayloadDigest) failures.push(codecFailure(FailureCodes.DIGEST_MISMATCH, 'Envelope payload digest does not match payload.', '$.payloadDigest', { expected: expectedPayloadDigest, actual: envelope.payloadDigest }));
  const safetyReport = safetyReportForValue(envelope.payload, options);
  failures.push(...safetyReport.failures);
  warnings.push(...safetyReport.warnings);
  return {
    status: failures.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    envelope,
    payloadDigest: expectedPayloadDigest,
    envelopeDigest: artifactEnvelopeDigest(envelope),
    warnings,
    failures,
    safetyReport
  };
}

export function artifactEnvelopeDigest(value) {
  const envelope = { ...normalizeArtifactEnvelope(value) };
  delete envelope.envelopeDigest;
  return canonicalJsonDigest(envelope);
}

export function createBundleManifest(options = {}) {
  const entries = (options.entries ?? []).map((entry, index) => ({
    role: String(entry.role ?? `entry-${index}`),
    artifactType: String(entry.artifactType ?? entry.type ?? 'anchor.unknown'),
    artifactVersion: String(entry.artifactVersion ?? entry.schemaVersion ?? entry.version ?? 'unknown'),
    filename: String(entry.filename ?? entry.name ?? `${entry.role ?? `entry-${index}`}.json`),
    payloadDigest: String(entry.payloadDigest ?? entry.digest ?? ''),
    required: entry.required !== false
  }));
  const manifest = {
    manifestVersion: BUNDLE_MANIFEST_VERSION,
    bundleType: String(options.bundleType ?? 'anchor.bundle'),
    bundleVersion: String(options.bundleVersion ?? '1.0'),
    entries,
    producer: normalizeProducer(options.producer),
    packageVersions: normalizePackageVersions(options.packageVersions),
    provenance: cloneCanonicalJson(options.provenance ?? {})
  };
  return { ...manifest, bundleDigest: canonicalJsonDigest(manifest) };
}

export function normalizeBundleManifest(value) {
  if (!value || typeof value !== 'object') return createBundleManifest();
  return createBundleManifest({
    bundleType: value.bundleType ?? value.type,
    bundleVersion: value.bundleVersion ?? value.schemaVersion ?? value.version,
    entries: value.entries ?? value.manifest?.entries ?? [],
    producer: value.producer,
    packageVersions: value.packageVersions,
    provenance: value.provenance
  });
}

export function validateBundleManifest(value) {
  const manifest = normalizeBundleManifest(value);
  const failures = [];
  const warnings = [];
  if (!manifest.entries.length) warnings.push(codecWarning('EMPTY_BUNDLE_MANIFEST', 'Bundle manifest has no entries.', '$.entries'));
  manifest.entries.forEach((entry, index) => {
    if (!entry.artifactType || entry.artifactType === 'anchor.unknown') failures.push(codecFailure(FailureCodes.UNSUPPORTED_ARTIFACT_TYPE, 'Bundle entry is missing an artifact type.', `$.entries[${index}].artifactType`));
    if (!entry.artifactVersion || entry.artifactVersion === 'unknown') failures.push(codecFailure(FailureCodes.MISSING_VERSION, 'Bundle entry is missing an artifact version.', `$.entries[${index}].artifactVersion`));
    if (entry.required && !entry.payloadDigest) warnings.push(codecWarning('MISSING_ENTRY_DIGEST', 'Required bundle entry has no payload digest.', `$.entries[${index}].payloadDigest`));
  });
  const expected = bundleManifestDigest(manifest);
  if (manifest.bundleDigest !== expected) failures.push(codecFailure(FailureCodes.DIGEST_MISMATCH, 'Bundle digest does not match manifest entries.', '$.bundleDigest', { expected, actual: manifest.bundleDigest }));
  return { status: failures.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'), manifest, bundleDigest: expected, warnings, failures };
}

export function bundleManifestDigest(value) {
  const manifest = { ...normalizeBundleManifest(value) };
  delete manifest.bundleDigest;
  return canonicalJsonDigest(manifest);
}

export function artifactTransportMetadata(value, options = {}) {
  const envelope = createArtifactEnvelope({ payload: value, ...options });
  return {
    artifactType: envelope.artifactType,
    artifactVersion: envelope.artifactVersion,
    payloadDigest: envelope.payloadDigest,
    envelopeDigest: envelope.envelopeDigest,
    digest: canonicalJsonDigestRecord(envelope.payload, envelope.artifactType),
    visibilityClass: envelope.visibilityClass,
    fairnessClass: envelope.fairnessClass,
    schemaId: envelope.schemaId
  };
}

function normalizeProducer(producer = {}) {
  return cloneCanonicalJson({
    application: producer.application ?? 'ANCHOR',
    applicationVersion: producer.applicationVersion ?? null,
    runtimeVersion: producer.runtimeVersion ?? null,
    codecPackageVersion: producer.codecPackageVersion ?? CODEC_PACKAGE_VERSION,
    environmentPackageVersion: producer.environmentPackageVersion ?? null,
    simulatorPackageVersion: producer.simulatorPackageVersion ?? null,
    scoringPackageVersion: producer.scoringPackageVersion ?? null
  });
}

function normalizePackageVersions(packageVersions = {}) {
  return cloneCanonicalJson({ codec: CODEC_PACKAGE_VERSION, ...packageVersions });
}