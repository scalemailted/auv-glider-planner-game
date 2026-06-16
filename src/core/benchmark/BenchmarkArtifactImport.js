import { createBenchmarkAttempt, createBenchmarkAttemptSet } from './BenchmarkAttemptRegistry.js';
import { createBenchmarkAttemptSession } from './BenchmarkAttemptSession.js';
import { createRouteExecutionMetrics } from './BenchmarkRouteExecutionRecord.js';
import {
  extractRouteGeometryFromRouteExecutionRecord,
  normalizeBenchmarkRouteGeometry
} from './BenchmarkRouteGeometryAdapter.js';
import {
  buildBenchmarkRunRecordFromResult,
  buildRouteExecutionRecordFromResult
} from './BenchmarkResultAdapter.js';

export const BENCHMARK_ARTIFACT_IMPORT_VERSION = 'benchmark-artifact-import-p5';

export const BENCHMARK_IMPORT_SUPPORTED_TYPES = [
  'anchor.benchmark.run-record',
  'anchor.benchmark.route-execution',
  'anchor.benchmark.attempt-set',
  'anchor.benchmark.attempt-session',
  'anchor.benchmark.comparison',
  'anchor.benchmark.route-overlay',
  'anchor.result'
];

export function parseBenchmarkArtifact(payload) {
  const parsed = parseJson(payload);
  if (!parsed.ok) {
    return { status: 'FAIL', valid: false, artifacts: [], errors: [parsed.error], warnings: [] };
  }
  const candidates = expandPayloads(parsed.value);
  const artifacts = candidates.map((candidate) => normalizeImportedBenchmarkArtifact(candidate));
  const errors = artifacts.filter((artifact) => !artifact.supported).map((artifact) => `Unsupported benchmark artifact type: ${artifact.artifactType ?? 'unknown'}.`);
  const warnings = uniqueStrings(artifacts.flatMap((artifact) => artifact.warnings ?? []));
  return {
    status: errors.length ? 'WARN' : 'PASS',
    valid: artifacts.some((artifact) => artifact.supported),
    artifacts,
    errors,
    warnings
  };
}

export function normalizeImportedBenchmarkArtifact(payload) {
  const parsed = parseJson(payload);
  const raw = parsed.ok ? unwrapArtifact(parsed.value) : payload;
  const classification = classifyBenchmarkArtifact(raw);
  const artifact = extractArtifactBody(raw, classification.artifactType);
  const attempts = attemptsFromArtifact(artifact, classification.artifactType);
  const firstAttempt = attempts[0] ?? null;
  const routeGeometry = routeGeometryFromArtifact(artifact, classification.artifactType, firstAttempt);
  return {
    type: 'anchor.benchmark.imported-artifact',
    version: BENCHMARK_ARTIFACT_IMPORT_VERSION,
    artifactType: classification.artifactType,
    supported: classification.supported,
    payload: cloneJson(artifact),
    episodeId: stringOrNull(artifact?.episodeId ?? artifact?.session?.episodeId ?? firstAttempt?.episodeId ?? classification.episodeId),
    benchmarkMode: stringOrNull(artifact?.benchmarkMode ?? artifact?.session?.benchmarkMode ?? firstAttempt?.benchmarkMode ?? classification.benchmarkMode) ?? 'plannerBenchmark',
    levelId: stringOrNull(artifact?.levelId ?? firstAttempt?.routeExecutionRecord?.levelId),
    missionId: stringOrNull(artifact?.missionId ?? firstAttempt?.routeExecutionRecord?.missionId),
    resultId: stringOrNull(artifact?.resultId ?? firstAttempt?.resultId),
    planId: stringOrNull(artifact?.planId ?? firstAttempt?.planId),
    attemptCount: attempts.length,
    attempts,
    hasRouteGeometry: Boolean(routeGeometry?.segments?.length || routeGeometry?.waypoints?.length || attempts.some((attempt) => attempt.routeGeometry?.segments?.length || attempt.routeExecutionRecord?.segments?.length)),
    routeGeometry,
    warnings: uniqueStrings([
      ...classification.warnings,
      ...(classification.supported ? [] : ['This JSON is not a supported benchmark import artifact.'])
    ]),
    errors: classification.errors
  };
}

export function classifyBenchmarkArtifact(payload) {
  const parsed = parseJson(payload);
  const raw = unwrapArtifact(parsed.ok ? parsed.value : payload);
  const explicitType = String(raw?.type ?? raw?.artifactType ?? '').trim();
  const artifactType = explicitType || (raw?.schemaVersion || raw?.benchmarkMetadata ? 'anchor.result' : '');
  const supported = BENCHMARK_IMPORT_SUPPORTED_TYPES.includes(artifactType);
  const warnings = [];
  const errors = [];
  if (!artifactType) warnings.push('Benchmark artifact type is missing.');
  if (artifactType && !supported) warnings.push(`Unsupported benchmark artifact type: ${artifactType}.`);
  if (artifactType === 'anchor.result' && !raw?.benchmarkMetadata) warnings.push('Result JSON does not include benchmark metadata; it can only be used as a weak reference.');
  return {
    artifactType: artifactType || 'unknown',
    supported,
    status: supported ? 'PASS' : 'WARN',
    episodeId: stringOrNull(raw?.episodeId ?? raw?.benchmarkMetadata?.episodeId ?? raw?.session?.episodeId),
    benchmarkMode: stringOrNull(raw?.benchmarkMode ?? raw?.benchmarkMetadata?.benchmarkMode ?? raw?.session?.benchmarkMode) ?? 'plannerBenchmark',
    warnings,
    errors
  };
}

export function validateBenchmarkArtifactCompatibility({ artifact, currentEpisode, currentBenchmarkMode } = {}) {
  const normalized = artifact?.type === 'anchor.benchmark.imported-artifact'
    ? artifact
    : normalizeImportedBenchmarkArtifact(artifact);
  const current = normalizeCurrentEpisode(currentEpisode, currentBenchmarkMode);
  const warnings = [...(normalized.warnings ?? [])];
  const errors = [];
  if (!normalized.supported) errors.push(`Unsupported benchmark artifact type: ${normalized.artifactType ?? 'unknown'}.`);
  const artifactMode = normalized.benchmarkMode ?? 'plannerBenchmark';
  if (current.benchmarkMode && artifactMode && artifactMode !== current.benchmarkMode) {
    errors.push(`Benchmark mode mismatch: current ${current.benchmarkMode}, imported ${artifactMode}.`);
  }
  if (current.episodeId && normalized.episodeId && current.episodeId !== normalized.episodeId) {
    warnings.push(`Episode mismatch: current ${current.episodeId}, imported ${normalized.episodeId}. Treating as reference-only.`);
  }
  if (current.levelId && normalized.levelId && current.levelId !== normalized.levelId) {
    warnings.push(`Level mismatch: current ${current.levelId}, imported ${normalized.levelId}.`);
  }
  if (current.missionId && normalized.missionId && current.missionId !== normalized.missionId) {
    warnings.push(`Mission mismatch: current ${current.missionId}, imported ${normalized.missionId}.`);
  }
  const compatible = errors.length === 0
    && (!current.episodeId || !normalized.episodeId || current.episodeId === normalized.episodeId)
    && (!current.levelId || !normalized.levelId || current.levelId === normalized.levelId)
    && (!current.missionId || !normalized.missionId || current.missionId === normalized.missionId);
  return {
    status: errors.length ? 'FAIL' : compatible ? 'PASS' : 'REFERENCE_ONLY',
    compatible,
    referenceOnly: !compatible && errors.length === 0,
    artifactType: normalized.artifactType,
    warnings: uniqueStrings(warnings),
    errors
  };
}

export function extractAttemptFromBenchmarkArtifact({ artifact, fallbackEpisodeId, fallbackBenchmarkMode } = {}) {
  const normalized = artifact?.type === 'anchor.benchmark.imported-artifact'
    ? artifact
    : normalizeImportedBenchmarkArtifact(artifact);
  const attempts = attemptsFromArtifact(normalized.payload, normalized.artifactType)
    .map((attempt, index) => createBenchmarkAttempt({
      episodeId: normalized.episodeId ?? fallbackEpisodeId ?? attempt.episodeId,
      benchmarkMode: normalized.benchmarkMode ?? fallbackBenchmarkMode ?? attempt.benchmarkMode,
      ...attempt,
      importMetadata: {
        artifactType: normalized.artifactType,
        importedAt: new Date().toISOString(),
        sourceEpisodeId: normalized.episodeId ?? null,
        sourceBenchmarkMode: normalized.benchmarkMode ?? null,
        sourceIndex: index
      }
    }));
  return {
    status: attempts.length ? 'PASS' : 'WARN',
    attempts,
    warnings: attempts.length ? [] : ['No benchmark attempts could be extracted from the imported artifact.']
  };
}

export function mergeBenchmarkArtifactsIntoAttemptSession({ session, artifacts, currentEpisode } = {}) {
  const baseCurrent = normalizeCurrentEpisode(currentEpisode, session?.benchmarkMode ?? 'plannerBenchmark');
  let mergedSession = createBenchmarkAttemptSession(session ?? {
    episodeId: baseCurrent.episodeId,
    benchmarkMode: baseCurrent.benchmarkMode
  });
  const warnings = [];
  const imported = [];
  const skipped = [];
  for (const rawArtifact of Array.isArray(artifacts) ? artifacts : []) {
    const artifact = rawArtifact?.type === 'anchor.benchmark.imported-artifact'
      ? rawArtifact
      : normalizeImportedBenchmarkArtifact(rawArtifact);
    const compatibility = validateBenchmarkArtifactCompatibility({ artifact, currentEpisode: baseCurrent });
    if (!compatibility.compatible) {
      skipped.push({ artifactType: artifact.artifactType, episodeId: artifact.episodeId, reason: compatibility.errors[0] ?? compatibility.warnings[0] ?? 'Reference-only artifact.' });
      warnings.push(...compatibility.errors, ...compatibility.warnings);
      continue;
    }
    const extracted = extractAttemptFromBenchmarkArtifact({
      artifact,
      fallbackEpisodeId: mergedSession.episodeId ?? baseCurrent.episodeId,
      fallbackBenchmarkMode: mergedSession.benchmarkMode ?? baseCurrent.benchmarkMode
    });
    warnings.push(...extracted.warnings);
    for (const attempt of extracted.attempts) {
      const nextAttempt = createBenchmarkAttempt({
        episodeId: mergedSession.episodeId ?? baseCurrent.episodeId,
        benchmarkMode: mergedSession.benchmarkMode ?? baseCurrent.benchmarkMode,
        ...attempt
      });
      mergedSession = createBenchmarkAttemptSession({
        ...mergedSession,
        attempts: upsertAttempt(mergedSession.attempts, nextAttempt),
        updatedAt: new Date().toISOString()
      });
      imported.push(nextAttempt);
    }
  }
  return {
    status: warnings.length ? 'WARN' : 'PASS',
    session: mergedSession,
    mergedCount: imported.length,
    skippedCount: skipped.length,
    imported,
    skipped,
    warnings: uniqueStrings(warnings)
  };
}

function attemptsFromArtifact(artifact, artifactType) {
  if (!artifact || typeof artifact !== 'object') return [];
  if (artifactType === 'anchor.benchmark.attempt-session') {
    return normalizeAttemptArray(artifact.session?.attempts ?? artifact.attempts, artifact);
  }
  if (artifactType === 'anchor.benchmark.attempt-set' || artifactType === 'anchor.benchmark.comparison') {
    return normalizeAttemptArray(artifact.attempts, artifact);
  }
  if (artifactType === 'anchor.benchmark.route-execution') {
    return [attemptFromRouteExecution(artifact)];
  }
  if (artifactType === 'anchor.benchmark.run-record') {
    return [attemptFromRunRecord(artifact.runRecord ?? artifact)];
  }
  if (artifactType === 'anchor.benchmark.route-overlay') {
    return [attemptFromRouteOverlay(artifact)];
  }
  if (artifactType === 'anchor.result') {
    return [attemptFromResult(artifact)];
  }
  return [];
}

function normalizeAttemptArray(attempts, parent = {}) {
  return (Array.isArray(attempts) ? attempts : []).map((attempt) => createBenchmarkAttempt({
    episodeId: attempt.episodeId ?? parent.episodeId ?? parent.session?.episodeId,
    benchmarkMode: attempt.benchmarkMode ?? parent.benchmarkMode ?? parent.session?.benchmarkMode ?? 'plannerBenchmark',
    ...attempt,
    routeGeometry: attempt.routeGeometry ?? routeGeometryFromAttempt(attempt)
  }));
}

function attemptFromRouteExecution(record = {}) {
  return createBenchmarkAttempt({
    attemptId: record.attemptId ?? record.resultId ?? record.planId,
    episodeId: record.episodeId,
    benchmarkMode: record.benchmarkMode,
    attemptSource: record.attemptSource,
    routeSourceLabel: record.routeSourceLabel,
    fairnessLabel: record.fairnessLabel,
    planId: record.planId,
    resultId: record.resultId,
    status: record.validation?.status ?? 'completed',
    routeExecutionRecord: record,
    routeGeometry: extractRouteGeometryFromRouteExecutionRecord(record),
    metrics: record.metrics
  });
}

function attemptFromRunRecord(runRecord = {}) {
  const diagnostics = runRecord.diagnostics ?? {};
  return createBenchmarkAttempt({
    attemptId: diagnostics.attemptId ?? diagnostics.resultId ?? diagnostics.planId,
    episodeId: diagnostics.episodeId,
    benchmarkMode: runRecord.benchmarkMode,
    attemptSource: diagnostics.attemptSource,
    routeSourceLabel: diagnostics.routeSourceLabel ?? 'Imported Run Record',
    fairnessLabel: runRecord.fairnessLabel,
    planId: diagnostics.planId,
    resultId: diagnostics.resultId,
    status: diagnostics.routeExecutionValidation?.status ?? 'completed',
    runRecord,
    metrics: createRouteExecutionMetrics(diagnostics.routeExecutionSummary ?? runRecord.rewards?.[0]?.components ?? {})
  });
}

function attemptFromRouteOverlay(artifact = {}) {
  const geometry = normalizeBenchmarkRouteGeometry(artifact.geometry ?? {});
  return createBenchmarkAttempt({
    attemptId: artifact.attemptId ?? geometry.attemptId ?? artifact.resultId ?? artifact.planId,
    episodeId: artifact.episodeId,
    benchmarkMode: artifact.benchmarkMode,
    attemptSource: artifact.attemptSource ?? geometry.attemptSource,
    routeSourceLabel: artifact.routeSourceLabel ?? geometry.routeSourceLabel ?? 'Imported Route Overlay',
    fairnessLabel: artifact.fairnessLabel ?? geometry.fairnessLabel,
    planId: geometry.planId ?? artifact.planId,
    resultId: geometry.resultId ?? artifact.resultId,
    status: 'completed',
    routeGeometry: geometry,
    metrics: artifact.overlayViewModelSummary ?? {}
  });
}

function attemptFromResult(result = {}) {
  const metadata = result.benchmarkMetadata ?? {};
  const attemptSource = result.attemptSource ?? metadata.attemptSource ?? 'importedSolver';
  const routeSourceLabel = result.planName ?? result.source ?? result.label ?? 'Imported Result';
  const fairnessLabel = result.fairnessLabel ?? metadata.fairnessLabel ?? result.fairness?.label;
  const routeExecutionRecord = buildRouteExecutionRecordFromResult({
    benchmarkModeConfig: metadata,
    episodeConfig: metadata,
    plan: result.plan,
    result,
    attemptSource,
    routeSourceLabel,
    fairnessLabel
  });
  const runRecord = buildBenchmarkRunRecordFromResult({
    benchmarkModeConfig: metadata,
    episodeConfig: metadata,
    plan: result.plan,
    result,
    attemptSource,
    routeSourceLabel
  });
  return createBenchmarkAttempt({
    attemptId: result.attemptId ?? result.resultId ?? result.id,
    episodeId: metadata.episodeId ?? routeExecutionRecord.episodeId,
    benchmarkMode: metadata.benchmarkMode ?? routeExecutionRecord.benchmarkMode,
    attemptSource,
    routeSourceLabel,
    fairnessLabel,
    planId: routeExecutionRecord.planId,
    resultId: routeExecutionRecord.resultId,
    status: routeExecutionRecord.validation?.status ?? 'completed',
    routeExecutionRecord,
    runRecord,
    routeGeometry: extractRouteGeometryFromRouteExecutionRecord(routeExecutionRecord),
    metrics: routeExecutionRecord.metrics
  });
}

function routeGeometryFromArtifact(artifact, artifactType, attempt) {
  if (artifactType === 'anchor.benchmark.route-overlay') return normalizeBenchmarkRouteGeometry(artifact?.geometry ?? {});
  return routeGeometryFromAttempt(attempt);
}

function routeGeometryFromAttempt(attempt) {
  if (!attempt) return null;
  if (attempt.routeGeometry) return normalizeBenchmarkRouteGeometry(attempt.routeGeometry);
  if (attempt.routeExecutionRecord) return extractRouteGeometryFromRouteExecutionRecord(attempt.routeExecutionRecord);
  return null;
}

function extractArtifactBody(raw, artifactType) {
  if (artifactType === 'anchor.benchmark.run-record' && raw?.runRecord) return raw;
  if (artifactType === 'anchor.benchmark.attempt-session' && raw?.session) return raw;
  return raw;
}

function expandPayloads(payload) {
  const raw = unwrapArtifact(payload);
  if (Array.isArray(raw)) return raw.flatMap(expandPayloads);
  if (Array.isArray(raw?.artifacts)) return raw.artifacts.flatMap(expandPayloads);
  if (Array.isArray(raw?.items)) return raw.items.flatMap(expandPayloads);
  if (Array.isArray(raw?.attempts) && !raw.type) return [createBenchmarkAttemptSet({ attempts: raw.attempts })];
  return [raw];
}

function unwrapArtifact(value) {
  let current = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
    if (current.artifact && typeof current.artifact === 'object') current = current.artifact;
    else if (current.payload && typeof current.payload === 'object' && !current.type) current = current.payload;
    else if (current.data && typeof current.data === 'object' && !current.type) current = current.data;
    else if (current.result && current.result.type === 'anchor.result') current = current.result;
    else return current;
  }
  return current;
}

function upsertAttempt(attempts, nextAttempt) {
  const byKey = new Map();
  for (const attempt of Array.isArray(attempts) ? attempts : []) {
    const normalized = createBenchmarkAttempt(attempt);
    byKey.set(attemptKey(normalized), normalized);
  }
  const key = attemptKey(nextAttempt);
  byKey.set(key, chooseBetterAttempt(byKey.get(key), nextAttempt));
  return [...byKey.values()];
}

function chooseBetterAttempt(existing, incoming) {
  if (!existing) return incoming;
  const existingScore = completenessScore(existing);
  const incomingScore = completenessScore(incoming);
  return incomingScore >= existingScore ? { ...existing, ...incoming, metrics: { ...(existing.metrics ?? {}), ...(incoming.metrics ?? {}) } } : existing;
}

function completenessScore(attempt = {}) {
  return [
    attempt.routeExecutionRecord ? 4 : 0,
    attempt.runRecord ? 3 : 0,
    attempt.routeGeometry?.segments?.length ? 2 : 0,
    attempt.routeGeometry?.waypoints?.length ? 1 : 0,
    Object.values(attempt.metrics ?? {}).some((value) => value != null) ? 1 : 0
  ].reduce((sum, value) => sum + value, 0);
}

function attemptKey(attempt = {}) {
  return [
    attempt.episodeId ?? 'episode',
    attempt.attemptSource ?? 'source',
    attempt.resultId ?? attempt.planId ?? attempt.attemptId ?? attempt.routeSourceLabel ?? 'attempt',
    attempt.fairnessLabel ?? 'fairness'
  ].join('::');
}

function normalizeCurrentEpisode(currentEpisode, currentBenchmarkMode) {
  if (typeof currentEpisode === 'string') return { episodeId: currentEpisode, benchmarkMode: currentBenchmarkMode ?? 'plannerBenchmark' };
  const current = currentEpisode ?? {};
  return {
    episodeId: stringOrNull(current.episodeId ?? current.id),
    benchmarkMode: stringOrNull(current.benchmarkMode ?? currentBenchmarkMode) ?? 'plannerBenchmark',
    levelId: stringOrNull(current.levelId ?? current.level?.levelId),
    missionId: stringOrNull(current.missionId ?? current.mission?.missionId ?? current.mission?.id)
  };
}

function parseJson(payload) {
  if (typeof payload !== 'string') return { ok: true, value: payload };
  try {
    return { ok: true, value: JSON.parse(payload) };
  } catch (error) {
    return { ok: false, error: `Invalid JSON: ${String(error?.message ?? error)}` };
  }
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}