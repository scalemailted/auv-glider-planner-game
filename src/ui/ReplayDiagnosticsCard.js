import { evaluateExactReplayAvailability, GENERATION_VERSION, REPLAY_SEED_NAMESPACES } from '../core/random/ReplaySeedContract.js';

export function replayDiagnosticsCardHtml(source = {}, {
  best = null,
  title = 'Replay Contract',
  className = ''
} = {}) {
  const diagnostics = buildReplayDiagnostics(source, { best });
  return `
    <div class="replay-diagnostics-card ${escapeAttr(className)}">
      <div class="replay-diagnostics-title">${escapeHtml(title)}</div>
      ${diagnosticRow('Replay', diagnostics.replayLabel)}
      ${diagnosticRow('Seed Anchor', diagnostics.seedAnchor)}
      ${diagnosticRow('Generator', diagnostics.generator)}
      ${diagnosticRow('Planned Path', diagnostics.plannedPath)}
      ${diagnosticRow('Actual Path', diagnostics.actualPath)}
      ${diagnosticRow('Missing Fields', diagnostics.missingFields)}
    </div>
  `;
}

export function buildReplayDiagnostics(source = {}, { best = null } = {}) {
  if (source?.diagnostics) return source.diagnostics;
  const replay = evaluateExactReplayAvailability(source);
  const contract = replay.contract ?? source?.replaySeedContract ?? source?.replay ?? {};
  const level = source?.level ?? {};
  const attempt = best?.attempt ?? source?.attempt ?? source;
  const pathSummary = best?.bestPathSummary ?? attempt?.pathSummary ?? source?.pathSummary ?? {};
  const plannedPathAvailable = Boolean(
    best?.bestPlan
    ?? best?.attempt?.plan
    ?? best?.attempt?.result?.plan
    ?? attempt?.plan
    ?? attempt?.result?.plan
    ?? source?.bestPlan
  );
  const actualPathAvailable = Boolean(
    pathSummary.actualPathAvailable
    || nonEmptyArray(best?.attempt?.result?.frames)
    || nonEmptyArray(best?.attempt?.result?.routeExecution?.frames)
    || nonEmptyArray(attempt?.result?.frames)
    || nonEmptyArray(attempt?.result?.routeExecution?.frames)
  );
  return {
    replayLabel: replayLabel(replay, source),
    seedAnchor: contract?.replaySeedAnchor
      ?? source?.replaySeedAnchor
      ?? source?.challengeId
      ?? source?.instanceId
      ?? level?.meta?.replaySeedAnchor
      ?? level?.instanceId
      ?? 'N/A',
    generator: contract?.generationVersion
      ?? source?.generationVersion
      ?? level?.meta?.generationVersion
      ?? level?.meta?.generationConfig?.generationVersion
      ?? 'N/A',
    plannedPath: plannedPathAvailable ? 'available' : 'unavailable',
    actualPath: actualPathAvailable ? 'available' : 'unavailable',
    missingFields: missingReplayFields(source, replay).join(', ') || 'none',
    available: replay.available,
    method: replay.method,
    reason: replay.reason
  };
}

function replayLabel(replay, source) {
  if (replay.available && replay.method === 'snapshot') return 'Exact via Snapshot';
  if (replay.available && replay.method === 'regeneration') return 'Exact via UUID';
  const hasSomeReplayMetadata = Boolean(
    source?.replaySeedAnchor
    ?? source?.challengeId
    ?? source?.instanceId
    ?? source?.generationConfig
    ?? source?.generationVersion
    ?? source?.derivedSeeds
    ?? source?.replaySeedContract
  );
  return hasSomeReplayMetadata ? 'Approximate' : 'Unavailable';
}

function missingReplayFields(source = {}, replay = {}) {
  const contract = replay.contract ?? source?.replaySeedContract ?? source?.replay ?? {};
  const level = source?.level ?? {};
  const generationConfig = contract?.generationConfig
    ?? source?.generationConfig
    ?? level?.meta?.generationConfig
    ?? null;
  const generationVersion = contract?.generationVersion
    ?? source?.generationVersion
    ?? level?.meta?.generationVersion
    ?? level?.meta?.generationConfig?.generationVersion
    ?? null;
  const anchor = contract?.replaySeedAnchor
    ?? source?.replaySeedAnchor
    ?? source?.challengeId
    ?? source?.instanceId
    ?? level?.meta?.replaySeedAnchor
    ?? level?.instanceId
    ?? null;
  const derivedSeeds = contract?.derivedSeeds
    ?? source?.derivedSeeds
    ?? level?.meta?.derivedSeeds
    ?? level?.meta?.generationConfig?.derivedSeeds
    ?? null;
  const missing = [];
  if (!anchor) missing.push('seed anchor');
  if (!generationVersion) missing.push('generator version');
  if (generationVersion && generationVersion !== GENERATION_VERSION) missing.push('compatible generator');
  if (!generationConfig) missing.push('generation config');
  if (!derivedSeeds) {
    missing.push('derived seeds');
  } else {
    for (const namespace of REPLAY_SEED_NAMESPACES) {
      if (!derivedSeeds?.[namespace]) missing.push(`${namespace} seed`);
    }
  }
  if (!source?.level || !source?.mission) {
    const canRegenerate = anchor && generationVersion === GENERATION_VERSION && generationConfig && derivedSeeds;
    if (!canRegenerate) missing.push('challenge snapshot');
  }
  return [...new Set(missing)];
}

function diagnosticRow(label, value) {
  return `
    <div class="replay-diagnostics-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
