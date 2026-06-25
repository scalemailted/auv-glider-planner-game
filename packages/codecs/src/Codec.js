import {
  CODEC_PACKAGE_VERSION,
  CODEC_REPORT_VERSION,
  DecodeStatus,
  FailureCodes,
  VisibilityClasses,
  artifactKindById,
  detectArtifactKind,
  versionForArtifact,
  knownFairnessClass,
  knownVisibilityClass
} from './ArtifactKindRegistry.js';
import { canonicalJsonDigest, canonicalJsonParse, canonicalJsonStringify, cloneCanonicalJson, utf8ByteLength } from './CanonicalJson.js';
import { CodecError, codecFailure, codecWarning } from './CodecError.js';
import { createArtifactEnvelope, validateArtifactEnvelope } from './Envelope.js';
import { migrateArtifact } from './Migration.js';
import { safetyReportForValue } from './Safety.js';

export function encodeArtifact(kind, value, options = {}) {
  const registryEntry = artifactKindById(kind) ?? detectArtifactKind(value, { kind });
  if (!registryEntry) throw new CodecError(FailureCodes.UNSUPPORTED_ARTIFACT_TYPE, `Unsupported artifact kind: ${kind}`);
  const payload = normalizePayloadForEntry(registryEntry, value, options);
  const payloadDigest = canonicalJsonDigest(payload);
  const envelope = createArtifactEnvelope({
    kind: registryEntry.kind,
    registryEntry,
    payload,
    payloadDigest,
    producer: options.producer,
    packageVersions: options.packageVersions,
    visibilityClass: options.visibilityClass,
    fairnessClass: options.fairnessClass,
    provenance: options.provenance,
    createdAt: options.createdAt
  });
  const text = canonicalJsonStringify(options.envelope === true ? envelope : payload, { pretty: options.pretty !== false, trailingNewline: options.trailingNewline !== false });
  return {
    kind: registryEntry.kind,
    artifactType: registryEntry.artifactType,
    artifactVersion: versionForArtifact(payload, registryEntry),
    payload,
    payloadDigest,
    envelope,
    envelopeDigest: envelope.envelopeDigest,
    text
  };
}

export function decodeArtifact(input, options = {}) {
  const base = emptyDecodeResult(options);
  const inputBytes = typeof input === 'string' ? utf8ByteLength(input) : null;
  let parsed;
  try {
    parsed = typeof input === 'string' || input instanceof Uint8Array
      ? canonicalJsonParse(input, { limits: options.limits, maxBytes: options.maxBytes })
      : cloneCanonicalJson(input);
  } catch (error) {
    return rejected(base, [failureFromError(error)], inputBytes);
  }
  const envelope = parsed?.payload && parsed?.artifactType ? parsed : null;
  const sourcePayload = envelope ? parsed.payload : parsed;
  const registryEntry = artifactKindById(options.kind) ?? detectArtifactKind(envelope ?? sourcePayload, options);
  if (!registryEntry) return rejected({ ...base, parsed }, [codecFailure(FailureCodes.UNSUPPORTED_ARTIFACT_TYPE, 'Unsupported or missing artifact type.', '$.type')], inputBytes);

  const sourceVersion = String(envelope?.artifactVersion ?? versionForArtifact(sourcePayload, registryEntry) ?? '');
  const targetVersion = String(options.targetVersion ?? registryEntry.currentVersion);
  const next = {
    ...base,
    parsed,
    artifactKind: registryEntry.kind,
    artifactType: registryEntry.artifactType,
    sourceVersion: sourceVersion || null,
    targetVersion,
    registryEntry,
    inputBytes
  };
  if (!sourceVersion) return rejected(next, [codecFailure(FailureCodes.MISSING_VERSION, 'Artifact version is required.', versionPath(registryEntry))], inputBytes);

  const migration = migrateArtifact(registryEntry, sourcePayload, { sourceVersion, targetVersion });
  const payload = migration.payload;
  const validationReport = validateArtifact(registryEntry.kind, payload, { ...options, registryEntry });
  const integrityReport = envelope ? validateArtifactEnvelope(envelope, { registryEntry, limits: options.limits }) : validateIntegrityForPayload(payload, registryEntry);
  const safetyReport = validationReport.safetyReport ?? safetyReportForValue(payload, { registryEntry, limits: options.limits });
  const failures = [
    ...migration.report.failures,
    ...validationReport.failures,
    ...integrityReport.failures,
    ...safetyReport.failures
  ];
  const warnings = [
    ...migration.report.warnings,
    ...validationReport.warnings,
    ...integrityReport.warnings,
    ...safetyReport.warnings
  ];
  const status = failures.length ? DecodeStatus.REJECTED : (warnings.length ? DecodeStatus.ACCEPTED_WITH_WARNINGS : DecodeStatus.ACCEPTED);
  return {
    ...next,
    status,
    payload: failures.length ? null : payload,
    validationReport,
    migrationReport: migration.report,
    integrityReport,
    safetyReport,
    warnings,
    failures,
    payloadDigest: canonicalJsonDigest(payload),
    envelopeDigest: envelope?.envelopeDigest ?? null,
    visibilityClass: envelope?.visibilityClass ?? registryEntry.visibilityClass,
    fairnessClass: envelope?.fairnessClass ?? registryEntry.fairnessClass
  };
}

export function validateArtifact(kind, value, options = {}) {
  const registryEntry = options.registryEntry ?? artifactKindById(kind) ?? detectArtifactKind(value, { kind });
  const failures = [];
  const warnings = [];
  if (!registryEntry) failures.push(codecFailure(FailureCodes.UNSUPPORTED_ARTIFACT_TYPE, 'Unsupported artifact kind.', '$.type'));
  const payload = cloneCanonicalJson(value ?? {});
  const artifactType = payload.type ?? payload.artifactType ?? payload.bundleType ?? null;
  if (registryEntry?.artifactType && artifactType && artifactType !== registryEntry.artifactType) {
    failures.push(codecFailure(FailureCodes.SCHEMA_VALIDATION_FAILED, `Expected artifact type ${registryEntry.artifactType}.`, '$.type', { actual: artifactType }));
  }
  if (registryEntry?.artifactType && !artifactType && registryEntry.kind !== 'scoreResult') {
    failures.push(codecFailure(FailureCodes.SCHEMA_VALIDATION_FAILED, 'Artifact type is required.', '$.type'));
  }
  const version = registryEntry ? String(versionForArtifact(payload, registryEntry) ?? '') : '';
  if (registryEntry && !version) failures.push(codecFailure(FailureCodes.MISSING_VERSION, 'Artifact version is required.', versionPath(registryEntry)));
  if (registryEntry && version && version !== registryEntry.currentVersion) {
    const legacy = registryEntry.supportedLegacyVersions.includes(version);
    const code = legacy ? FailureCodes.UNSUPPORTED_LEGACY_VERSION : (isFutureVersion(version, registryEntry.currentVersion) ? FailureCodes.UNSUPPORTED_FUTURE_VERSION : FailureCodes.UNSUPPORTED_LEGACY_VERSION);
    failures.push(codecFailure(code, `Artifact version ${version} is not current ${registryEntry.currentVersion}; decode/migration is required.`, versionPath(registryEntry)));
  }
  const safetyReport = safetyReportForValue(payload, { registryEntry, limits: options.limits });
  failures.push(...safetyReport.failures);
  warnings.push(...safetyReport.warnings);
  const metadata = extractVisibilityMetadata(payload, registryEntry);
  if (!knownVisibilityClass(metadata.visibilityClass)) failures.push(codecFailure(FailureCodes.VISIBILITY_POLICY_CONFLICT, `Unknown visibility class ${metadata.visibilityClass}.`, '$.visibilityClass'));
  if (!knownFairnessClass(metadata.fairnessClass)) warnings.push(codecWarning('UNKNOWN_FAIRNESS_CLASS', `Unknown fairness class ${metadata.fairnessClass}.`, '$.fairnessClass'));
  if (metadata.visibilityClass !== VisibilityClasses.ORACLE_HIDDEN_TRUTH && containsHiddenTruthMarker(payload)) {
    failures.push(codecFailure(FailureCodes.VISIBILITY_POLICY_CONFLICT, 'Public or forecast-visible artifact contains hidden-truth markers.', '$'));
  }
  return {
    reportVersion: CODEC_REPORT_VERSION,
    status: failures.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    artifactKind: registryEntry?.kind ?? null,
    artifactType: registryEntry?.artifactType ?? artifactType,
    sourceVersion: version || null,
    targetVersion: registryEntry?.currentVersion ?? null,
    payloadDigest: canonicalJsonDigest(payload),
    schemaId: registryEntry?.schemaId ?? null,
    visibilityClass: metadata.visibilityClass,
    fairnessClass: metadata.fairnessClass,
    warnings,
    failures,
    safetyReport
  };
}

export function inspectArtifact(input, options = {}) {
  const decoded = decodeArtifact(input, options);
  const payload = decoded.payload ?? decoded.parsed?.payload ?? decoded.parsed ?? null;
  const scoreMetadata = extractScoreMetadata(payload);
  return {
    packageVersion: CODEC_PACKAGE_VERSION,
    reportVersion: CODEC_REPORT_VERSION,
    status: decoded.status,
    artifactKind: decoded.artifactKind ?? null,
    artifactType: decoded.artifactType ?? payload?.type ?? payload?.artifactType ?? null,
    sourceVersion: decoded.sourceVersion ?? null,
    targetVersion: decoded.targetVersion ?? null,
    payloadDigest: decoded.payloadDigest ?? safeDigest(payload),
    envelopeDigest: decoded.envelopeDigest ?? null,
    decodeStatus: decoded.status,
    validationStatus: decoded.validationReport?.status ?? 'FAIL',
    migrationStatus: decoded.migrationReport?.status ?? 'FAIL',
    integrityStatus: decoded.integrityReport?.status ?? 'FAIL',
    safetyStatus: decoded.safetyReport?.status ?? 'FAIL',
    inputBytes: decoded.inputBytes ?? (typeof input === 'string' ? utf8ByteLength(input) : null),
    migrationSteps: decoded.migrationReport?.steps ?? [],
    warningCount: decoded.warnings?.length ?? 0,
    failureCount: decoded.failures?.length ?? 0,
    visibilityClass: decoded.visibilityClass ?? decoded.validationReport?.visibilityClass ?? null,
    fairnessClass: decoded.fairnessClass ?? decoded.validationReport?.fairnessClass ?? null,
    producer: payload?.producer ?? payload?.codecMetadata?.producer ?? null,
    identities: extractIdentityMetadata(payload),
    scoreMetadata,
    warnings: decoded.warnings ?? [],
    failures: decoded.failures ?? [],
    recommendedAction: decoded.status === DecodeStatus.ACCEPTED ? 'accept' : (decoded.status === DecodeStatus.ACCEPTED_WITH_WARNINGS ? 'review' : 'reject')
  };
}

function normalizePayloadForEntry(entry, value, options) {
  const payload = cloneCanonicalJson(value ?? {});
  if (entry.kind === 'scoreResult') return payload;
  payload.type ??= entry.artifactType;
  if (entry.versionField === 'version') payload.version ??= entry.currentVersion;
  else payload.schemaVersion ??= options.artifactVersion ?? entry.currentVersion;
  return payload;
}

function validateIntegrityForPayload(payload, registryEntry) {
  return {
    status: 'PASS',
    payloadDigest: canonicalJsonDigest(payload),
    artifactKind: registryEntry.kind,
    warnings: [],
    failures: []
  };
}

function extractVisibilityMetadata(payload, registryEntry) {
  const fairness = payload?.fairness ?? {};
  const usesOracle = Boolean(fairness.oracleAssisted ?? fairness.usesOracle ?? payload?.planner?.usesOracle ?? payload?.meta?.planner?.usesOracle);
  const visibilityClass = payload?.visibilityClass ?? payload?.codecMetadata?.visibilityClass ?? (usesOracle ? VisibilityClasses.ORACLE_HIDDEN_TRUTH : registryEntry?.visibilityClass ?? VisibilityClasses.PUBLIC);
  const fairnessClass = payload?.fairnessClass ?? payload?.codecMetadata?.fairnessClass ?? (usesOracle ? 'ORACLE_ASSISTED' : registryEntry?.fairnessClass ?? 'PUBLIC_FAIR');
  return { visibilityClass, fairnessClass };
}

function extractScoreMetadata(payload) {
  const score = payload?.scoreResult ?? payload?.scoreArtifacts?.scoreResult ?? (payload?.scoreDigest ? payload : null);
  return {
    officialScore: score?.officialScore ?? payload?.scoreSummary?.finalScore ?? payload?.summary?.finalScore ?? null,
    scoreProfileId: score?.profileId ?? payload?.scoreProfileSummary?.profileId ?? payload?.summary?.scoreProfileId ?? null,
    scoreProfileVersion: score?.profileVersion ?? null,
    scoreResultDigest: score?.resultDigest ?? payload?.scoreArtifactIdentities?.scoreResultDigest ?? null,
    scoreDigest: score?.scoreDigest ?? payload?.scoreArtifactIdentities?.scoreDigest ?? null,
    scoreInputDigest: payload?.scoreInputDigest ?? payload?.scoreArtifactIdentities?.scoreInputDigest ?? null,
    scoreProfileDigest: payload?.scoreProfileDigest ?? payload?.scoreArtifactIdentities?.scoreProfileDigest ?? null,
    plannerProvenance: score?.plannerProvenance ?? payload?.planner ?? null
  };
}

function extractIdentityMetadata(payload) {
  return {
    environmentDigest: payload?.scoreArtifactIdentities?.environmentDigest ?? payload?.environmentDigest ?? payload?.environmentArtifactDigest ?? payload?.environment?.artifactDigest ?? null,
    planDigest: payload?.scoreArtifactIdentities?.planDigest ?? payload?.planDigest ?? payload?.meta?.planDigest ?? payload?.plan?.planDigest ?? null,
    simulationInputDigest: payload?.scoreArtifactIdentities?.simulationInputDigest ?? payload?.simulationInputDigest ?? null,
    simulationResultDigest: payload?.scoreArtifactIdentities?.simulationResultDigest ?? payload?.simulationResultDigest ?? payload?.resultDigest ?? null,
    solverPacketDigest: payload?.solverPacketDigest ?? payload?.meta?.solverPacketDigest ?? null,
    resultDigest: payload?.resultDigest ?? payload?.scoreArtifactIdentities?.scoreResultDigest ?? null
  };
}

function containsHiddenTruthMarker(payload) {
  const text = canonicalJsonStringify(payload, { pretty: false });
  return /"(T_hiddenTruth|hiddenTruth|hiddenFields|rawOracleTensor|oracleState)"\s*:/.test(text);
}

function emptyDecodeResult(options) {
  return {
    reportVersion: CODEC_REPORT_VERSION,
    status: DecodeStatus.REJECTED,
    artifactKind: options.kind ?? null,
    artifactType: null,
    sourceVersion: null,
    targetVersion: null,
    payload: null,
    validationReport: null,
    migrationReport: null,
    integrityReport: null,
    safetyReport: null,
    warnings: [],
    failures: [],
    inputBytes: null,
    registryEntry: null,
    parsed: null
  };
}

function rejected(base, failures, inputBytes = null) {
  return {
    ...base,
    status: DecodeStatus.REJECTED,
    payload: null,
    failures,
    warnings: base.warnings ?? [],
    inputBytes: inputBytes ?? base.inputBytes ?? null,
    validationReport: base.validationReport ?? { status: 'FAIL', warnings: [], failures },
    migrationReport: base.migrationReport ?? { status: 'FAIL', steps: [], warnings: [], failures },
    integrityReport: base.integrityReport ?? { status: 'FAIL', warnings: [], failures },
    safetyReport: base.safetyReport ?? { status: 'FAIL', warnings: [], failures: [] }
  };
}

function failureFromError(error) {
  if (error instanceof CodecError) return codecFailure(error.code, error.message, error.details?.path ?? '$', error.details);
  return codecFailure(FailureCodes.INVALID_JSON, String(error?.message ?? error), '$');
}

function versionPath(entry) {
  return entry?.versionField === 'version' ? '$.version' : '$.schemaVersion';
}

function safeDigest(value) {
  try { return value == null ? null : canonicalJsonDigest(value); }
  catch { return null; }
}

function isFutureVersion(sourceVersion, targetVersion) {
  const source = numericPrefix(sourceVersion);
  const target = numericPrefix(targetVersion);
  if (!source || !target) return false;
  for (let index = 0; index < Math.max(source.length, target.length); index += 1) {
    const a = source[index] ?? 0;
    const b = target[index] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

function numericPrefix(version) {
  const parts = String(version ?? '').split(/[.-]/).map((part) => Number(part));
  return parts.some((part) => !Number.isFinite(part)) ? null : parts;
}