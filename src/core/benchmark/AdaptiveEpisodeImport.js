import {
  addAdaptiveLegToSession,
  addAdaptiveNextLegHandoffToSession,
  addAdaptiveSurfacingDecisionToSession,
  createAdaptiveEpisodeSession,
  deserializeAdaptiveEpisodeSession
} from './AdaptiveEpisodeSession.js';
import { createAdaptiveLegRecord } from './AdaptiveLegRecord.js';

export const ADAPTIVE_EPISODE_IMPORT_VERSION = 'adaptive-episode-import-p8';

export const ADAPTIVE_EPISODE_IMPORT_SUPPORTED_TYPES = [
  'anchor.benchmark.adaptive-episode-session',
  'anchor.benchmark.adaptive-episode-trace',
  'anchor.benchmark.adaptive-surfacing-decision',
  'anchor.benchmark.adaptive-next-leg-config',
  'anchor.benchmark.adaptive-objective-transition',
  'anchor.benchmark.adaptive-manager-state'
];

export function classifyAdaptiveEpisodeArtifact(payload) {
  const parsed = parseJson(payload);
  const raw = unwrapArtifact(parsed.ok ? parsed.value : payload);
  const artifactType = String(raw?.type ?? raw?.artifactType ?? '').trim() || 'unknown';
  const supported = ADAPTIVE_EPISODE_IMPORT_SUPPORTED_TYPES.includes(artifactType);
  const benchmarkMode = raw?.benchmarkMode ?? raw?.session?.benchmarkMode ?? raw?.runtimeContext?.benchmarkMode ?? raw?.managerState?.benchmarkMode ?? 'adaptiveBenchmark';
  const episodeId = raw?.episodeId ?? raw?.session?.episodeId ?? raw?.runtimeContext?.episodeId ?? raw?.managerState?.episodeId ?? null;
  const warnings = [];
  const errors = [];
  if (!parsed.ok) errors.push(parsed.error);
  if (artifactType === 'unknown') warnings.push('Adaptive artifact type is missing.');
  if (!supported) warnings.push(`Unsupported adaptive artifact type: ${artifactType}.`);
  if (benchmarkMode !== 'adaptiveBenchmark') errors.push(`Benchmark mode must be adaptiveBenchmark, got ${benchmarkMode ?? 'missing'}.`);
  return {
    type: 'anchor.benchmark.adaptive-import-classification',
    version: ADAPTIVE_EPISODE_IMPORT_VERSION,
    artifactType,
    supported,
    benchmarkMode,
    episodeId: stringOrNull(episodeId),
    policyId: stringOrNull(raw?.policyId ?? raw?.session?.policyId ?? raw?.adaptiveManagerConfig?.policyId ?? raw?.managerState?.policyId),
    informationAccessTier: stringOrNull(raw?.informationAccessTier ?? raw?.session?.informationAccessTier),
    status: errors.length ? 'FAIL' : supported ? 'PASS' : 'WARN',
    warnings,
    errors
  };
}

export function parseAdaptiveEpisodeArtifact(payload) {
  const parsed = parseJson(payload);
  if (!parsed.ok) return { status: 'FAIL', valid: false, artifact: null, errors: [parsed.error], warnings: [] };
  const raw = unwrapArtifact(parsed.value);
  const classification = classifyAdaptiveEpisodeArtifact(raw);
  return {
    status: classification.errors.length ? 'FAIL' : classification.supported ? 'PASS' : 'WARN',
    valid: classification.supported && classification.errors.length === 0,
    artifact: {
      type: 'anchor.benchmark.adaptive-imported-artifact',
      version: ADAPTIVE_EPISODE_IMPORT_VERSION,
      artifactType: classification.artifactType,
      supported: classification.supported,
      episodeId: classification.episodeId,
      benchmarkMode: classification.benchmarkMode,
      policyId: classification.policyId,
      informationAccessTier: classification.informationAccessTier,
      payload: cloneJson(raw),
      warnings: classification.warnings,
      errors: classification.errors
    },
    errors: classification.errors,
    warnings: classification.warnings
  };
}

export function validateAdaptiveEpisodeCompatibility({ artifact, currentSession } = {}) {
  const parsed = artifact?.type === 'anchor.benchmark.adaptive-imported-artifact'
    ? { valid: artifact.supported, artifact, errors: artifact.errors ?? [], warnings: artifact.warnings ?? [] }
    : parseAdaptiveEpisodeArtifact(artifact);
  const imported = parsed.artifact;
  const current = currentSession ? createAdaptiveEpisodeSession(currentSession) : null;
  const errors = [...(parsed.errors ?? [])];
  const warnings = [...(parsed.warnings ?? [])];
  if (!imported?.supported) errors.push(`Unsupported adaptive artifact type: ${imported?.artifactType ?? 'unknown'}.`);
  if (current?.episodeId && imported?.episodeId && current.episodeId !== imported.episodeId) warnings.push(`Episode mismatch: current ${current.episodeId}, imported ${imported.episodeId}. Treating as reference-only.`);
  if (current?.policyId && imported?.policyId && current.policyId !== imported.policyId) warnings.push(`Policy mismatch: current ${current.policyId}, imported ${imported.policyId}.`);
  const compatible = errors.length === 0 && (!current?.episodeId || !imported?.episodeId || current.episodeId === imported.episodeId);
  return {
    status: errors.length ? 'FAIL' : compatible ? 'PASS' : 'REFERENCE_ONLY',
    compatible,
    referenceOnly: !compatible && errors.length === 0,
    artifactType: imported?.artifactType ?? 'unknown',
    warnings: uniqueStrings(warnings),
    errors: uniqueStrings(errors)
  };
}

export function mergeAdaptiveEpisodeArtifacts({ session, artifacts } = {}) {
  let mergedSession = createAdaptiveEpisodeSession(session ?? {});
  const warnings = [];
  const merged = [];
  const skipped = [];
  for (const rawArtifact of Array.isArray(artifacts) ? artifacts : []) {
    const parsed = rawArtifact?.type === 'anchor.benchmark.adaptive-imported-artifact'
      ? { valid: rawArtifact.supported, artifact: rawArtifact, errors: rawArtifact.errors ?? [], warnings: rawArtifact.warnings ?? [] }
      : parseAdaptiveEpisodeArtifact(rawArtifact);
    const compatibility = validateAdaptiveEpisodeCompatibility({ artifact: parsed.artifact, currentSession: mergedSession });
    if (!compatibility.compatible) {
      skipped.push({ artifactType: parsed.artifact?.artifactType ?? 'unknown', episodeId: parsed.artifact?.episodeId ?? null, reason: compatibility.errors[0] ?? compatibility.warnings[0] ?? 'Reference-only artifact.' });
      warnings.push(...compatibility.errors, ...compatibility.warnings);
      continue;
    }
    const before = JSON.stringify(mergedSession);
    mergedSession = mergeArtifactIntoSession(mergedSession, parsed.artifact);
    if (JSON.stringify(mergedSession) !== before) merged.push(parsed.artifact);
  }
  return {
    status: warnings.length ? 'WARN' : 'PASS',
    session: mergedSession,
    mergedCount: merged.length,
    skippedCount: skipped.length,
    imported: merged,
    skipped,
    warnings: uniqueStrings(warnings)
  };
}

function mergeArtifactIntoSession(session, artifact = {}) {
  const payload = cloneJson(artifact.payload ?? artifact);
  switch (artifact.artifactType) {
    case 'anchor.benchmark.adaptive-episode-session': {
      const importedSession = deserializeAdaptiveEpisodeSession(payload.session ?? payload);
      let next = session;
      for (const leg of importedSession.legs) next = addAdaptiveLegToSession(next, leg);
      for (const decision of importedSession.surfacingDecisions) next = addAdaptiveSurfacingDecisionToSession(next, decision);
      for (const handoff of importedSession.nextLegHandoffs) next = addAdaptiveNextLegHandoffToSession(next, handoff);
      return createAdaptiveEpisodeSession({ ...next, objectiveHistory: [...next.objectiveHistory, ...importedSession.objectiveHistory] });
    }
    case 'anchor.benchmark.adaptive-episode-trace': {
      let next = session;
      for (const leg of payload.legs ?? []) next = addAdaptiveLegToSession(next, createAdaptiveLegRecord({ ...leg, episodeId: payload.episodeId }));
      for (const decision of payload.surfacingDecisions ?? []) next = addAdaptiveSurfacingDecisionToSession(next, decision);
      return next;
    }
    case 'anchor.benchmark.adaptive-surfacing-decision':
      return addAdaptiveSurfacingDecisionToSession(session, payload);
    case 'anchor.benchmark.adaptive-next-leg-config':
      return addAdaptiveNextLegHandoffToSession(session, payload);
    case 'anchor.benchmark.adaptive-objective-transition':
      return addAdaptiveSurfacingDecisionToSession(session, { episodeId: payload.episodeId ?? session.episodeId, legIndex: payload.legIndex ?? session.currentLegIndex, objectiveTransition: payload });
    case 'anchor.benchmark.adaptive-manager-state':
      return createAdaptiveEpisodeSession({ ...session, currentObjectiveId: payload.currentObjectiveId ?? session.currentObjectiveId, objectiveHistory: payload.objectiveHistory ?? session.objectiveHistory });
    default:
      return session;
  }
}

function parseJson(payload) {
  if (typeof payload !== 'string') return { ok: true, value: payload };
  try {
    return { ok: true, value: JSON.parse(payload) };
  } catch (error) {
    return { ok: false, error: `Invalid JSON: ${String(error?.message ?? error)}` };
  }
}

function unwrapArtifact(value) {
  let current = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
    if (current.artifact && typeof current.artifact === 'object') current = current.artifact;
    else if (current.payload && typeof current.payload === 'object' && !current.type) current = current.payload;
    else if (current.data && typeof current.data === 'object' && !current.type) current = current.data;
    else return current;
  }
  return current;
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
