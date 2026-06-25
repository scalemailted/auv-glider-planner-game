import { MIGRATION_REGISTRY_VERSION, FailureCodes, artifactKindById, detectArtifactKind, versionForArtifact } from './ArtifactKindRegistry.js';
import { canonicalJsonDigest, cloneCanonicalJson } from './CanonicalJson.js';
import { codecFailure, codecWarning } from './CodecError.js';

const migrations = [
  Object.freeze({
    id: 'anchor.plan:1.0->2.0',
    artifactType: 'anchor.plan',
    sourceVersion: '1.0',
    targetVersion: '2.0',
    lossless: true,
    description: 'Normalize legacy plan shape by adding schemaVersion, type, meta, agentPlans, and planningMarkers defaults.',
    migrate(value) {
      const migrated = cloneCanonicalJson(value ?? {});
      migrated.schemaVersion = '2.0';
      migrated.type = 'anchor.plan';
      migrated.meta = { ...(migrated.meta ?? {}), migratedFromSchemaVersion: value?.schemaVersion ?? value?.version ?? '1.0' };
      migrated.agentPlans = Array.isArray(migrated.agentPlans) ? migrated.agentPlans : [];
      migrated.planningMarkers = Array.isArray(migrated.planningMarkers) ? migrated.planningMarkers : [];
      migrated.assumptions = migrated.assumptions ?? {};
      return migrated;
    }
  })
];

export function migrationRegistry() {
  return {
    version: MIGRATION_REGISTRY_VERSION,
    migrations: migrations.map(({ migrate, ...entry }) => ({ ...entry }))
  };
}

export function migrationFor(artifactType, sourceVersion, targetVersion) {
  return migrations.find((entry) => entry.artifactType === artifactType && entry.sourceVersion === String(sourceVersion) && entry.targetVersion === String(targetVersion)) ?? null;
}

export function migrateArtifact(kindOrEntry, value, options = {}) {
  const entry = typeof kindOrEntry === 'string' ? artifactKindById(kindOrEntry) : (kindOrEntry ?? detectArtifactKind(value, options));
  const payload = cloneCanonicalJson(value ?? {});
  const artifactType = entry?.artifactType ?? payload.type ?? payload.artifactType ?? null;
  const sourceVersion = String(options.sourceVersion ?? versionForArtifact(payload, entry) ?? '');
  const targetVersion = String(options.targetVersion ?? entry?.currentVersion ?? sourceVersion);
  const reportBase = {
    registryVersion: MIGRATION_REGISTRY_VERSION,
    artifactType,
    sourceVersion: sourceVersion || null,
    targetVersion,
    steps: [],
    lossless: true,
    changedPaths: [],
    warnings: [],
    failures: [],
    originalPayloadDigest: canonicalJsonDigest(payload),
    migratedPayloadDigest: null
  };
  if (!artifactType || !entry) {
    reportBase.failures.push(codecFailure(FailureCodes.UNSUPPORTED_ARTIFACT_TYPE, 'No supported migration target for artifact.', '$.type'));
    return rejected(payload, reportBase);
  }
  if (!sourceVersion) {
    reportBase.failures.push(codecFailure(FailureCodes.MISSING_VERSION, 'Artifact version is required for migration.', '$.schemaVersion'));
    return rejected(payload, reportBase);
  }
  if (sourceVersion === targetVersion) {
    reportBase.migratedPayloadDigest = reportBase.originalPayloadDigest;
    return { payload, report: { ...reportBase, status: 'PASS', idempotent: true } };
  }
  const step = migrationFor(artifactType, sourceVersion, targetVersion);
  if (!step) {
    const code = isFutureVersion(sourceVersion, targetVersion) ? FailureCodes.UNSUPPORTED_FUTURE_VERSION : FailureCodes.UNSUPPORTED_LEGACY_VERSION;
    reportBase.failures.push(codecFailure(code, `No migration is registered from ${sourceVersion} to ${targetVersion}.`, '$.schemaVersion', { artifactType, sourceVersion, targetVersion }));
    return rejected(payload, reportBase);
  }
  try {
    const migrated = cloneCanonicalJson(step.migrate(payload));
    reportBase.steps.push({ id: step.id, sourceVersion: step.sourceVersion, targetVersion: step.targetVersion, lossless: step.lossless, description: step.description });
    reportBase.lossless = reportBase.lossless && step.lossless;
    reportBase.changedPaths = changedTopLevelPaths(payload, migrated);
    reportBase.migratedPayloadDigest = canonicalJsonDigest(migrated);
    if (!step.lossless) reportBase.warnings.push(codecWarning('LOSSY_MIGRATION', `Migration ${step.id} is not lossless.`, '$'));
    return { payload: migrated, report: { ...reportBase, status: reportBase.warnings.length ? 'WARN' : 'PASS' } };
  } catch (error) {
    reportBase.failures.push(codecFailure(FailureCodes.MIGRATION_FAILED, `Migration failed: ${error.message}`, '$'));
    return rejected(payload, reportBase);
  }
}

function rejected(payload, report) {
  return { payload, report: { ...report, status: 'FAIL', migratedPayloadDigest: report.migratedPayloadDigest ?? report.originalPayloadDigest } };
}

function changedTopLevelPaths(before, after) {
  const paths = [];
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of [...keys].sort()) {
    if (canonicalJsonDigest(before?.[key] ?? null) !== canonicalJsonDigest(after?.[key] ?? null)) paths.push(`$.${key}`);
  }
  return paths;
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