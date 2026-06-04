import { bestAttemptCompatible } from './BestAttemptSelector.js';
import { evaluateExactReplayAvailability, getReplaySeedContract, GENERATION_VERSION, REPLAY_SEED_NAMESPACES } from '../random/ReplaySeedContract.js';

export function buildBestPriorRunViewModel(state = {}, bestPriorRun = state.bestPriorPath) {
  const best = bestPriorRun ?? null;
  const attempt = best?.attempt ?? null;
  const record = best?.record ?? null;
  const result = attempt?.result ?? null;
  const plannedPath = attempt?.plan ?? result?.plan ?? best?.bestPlan ?? null;
  const actualPathFrames = result?.frames ?? result?.routeExecution?.frames ?? [];
  const actualPathEvents = result?.events ?? result?.routeExecution?.events ?? [];
  const replaySource = {
    ...(record ?? {}),
    level: record?.level ?? state.level ?? null,
    mission: record?.mission ?? state.mission ?? null,
    replaySeedContract: record?.replaySeedContract ?? attempt?.replaySeedContract ?? result?.replaySeedContract ?? null
  };
  const replay = evaluateExactReplayAvailability(replaySource);
  const replaySeedContract = replay.contract ?? getReplaySeedContract(replaySource);
  const compatibility = bestAttemptCompatible(best, {
    level: state.level,
    mission: state.mission
  });
  const plannedPathAvailable = Boolean(plannedPath);
  const actualPathAvailable = Array.isArray(actualPathFrames) && actualPathFrames.length > 0;
  const missingFields = missingFieldsForVm({
    best,
    attempt,
    plannedPathAvailable,
    actualPathAvailable,
    replay,
    replaySeedContract,
    state,
    compatibility
  });
  const exactReplayAvailable = Boolean(replay.available);
  const vm = {
    kind: 'bestPriorRunVm',
    attemptId: attempt?.attemptId ?? best?.bestAttemptId ?? null,
    challengeId: record?.challengeId ?? record?.instanceId ?? state.level?.instanceId ?? state.currentScenario?.instanceId ?? null,
    replayStatus: replayLabel(replay, replaySource),
    replaySeedAnchor: replaySeedContract?.replaySeedAnchor ?? record?.replaySeedAnchor ?? state.level?.meta?.replaySeedAnchor ?? state.level?.instanceId ?? 'N/A',
    generationVersion: replaySeedContract?.generationVersion ?? record?.generationVersion ?? state.level?.meta?.generationVersion ?? 'N/A',
    bestPriorRun: best,
    record,
    attempt,
    result,
    plannedPathAvailable,
    actualPathAvailable,
    exactReplayAvailable,
    missingFields,
    plannedWaypoints: plannedPath,
    actualPathFrames,
    actualPathEvents,
    challengeSnapshot: record?.level && record?.mission ? { level: record.level, mission: record.mission } : null,
    replaySeedContract,
    compatibility,
    canShowBestPath: Boolean(plannedPathAvailable || actualPathAvailable),
    canLoadBestPathAsPlan: plannedPathAvailable && compatibility.ok,
    canRerunBestPath: plannedPathAvailable && exactReplayAvailable && compatibility.ok,
    canExportBestPath: plannedPathAvailable || actualPathAvailable,
    diagnostics: null
  };
  vm.diagnostics = {
    replayLabel: vm.replayStatus,
    seedAnchor: vm.replaySeedAnchor,
    generator: vm.generationVersion,
    plannedPath: vm.plannedPathAvailable ? 'available' : 'unavailable',
    actualPath: vm.actualPathAvailable ? 'available' : 'unavailable',
    missingFields: vm.missingFields.join(', ') || 'none',
    available: vm.exactReplayAvailable,
    method: replay.method,
    reason: replay.reason
  };
  return vm;
}

export function debugBestPath(label, details = {}) {
  if (!globalThis.ANCHOR_DEBUG_BEST_PATH) return;
  globalThis.console?.debug?.(`[BestPath][${label}]`, details);
}

export function bestPriorRunLogPayload(vm, extra = {}) {
  return {
    ...extra,
    attemptId: vm?.attemptId ?? null,
    challengeId: vm?.challengeId ?? null,
    plannedPathAvailable: Boolean(vm?.plannedPathAvailable),
    actualPathAvailable: Boolean(vm?.actualPathAvailable),
    exactReplayAvailable: Boolean(vm?.exactReplayAvailable),
    missingFields: vm?.missingFields ?? []
  };
}

function missingFieldsForVm({ best, attempt, plannedPathAvailable, actualPathAvailable, replay, replaySeedContract, state, compatibility }) {
  const missing = [];
  if (!best?.attempt) missing.push('best prior attempt');
  if (!attempt?.attemptId) missing.push('attemptId');
  if (!plannedPathAvailable) missing.push('plannedWaypoints');
  if (!actualPathAvailable) missing.push('actualPathFrames');
  if (!replaySeedContract?.replaySeedAnchor) missing.push('replaySeedAnchor');
  if (!replaySeedContract?.generationVersion) missing.push('generationVersion');
  if (replaySeedContract?.generationVersion && replaySeedContract.generationVersion !== GENERATION_VERSION) missing.push('compatibleGenerator');
  if (!replaySeedContract?.generationConfig) missing.push('generationConfig');
  if (!replaySeedContract?.derivedSeeds) {
    missing.push('derivedSeeds');
  } else {
    for (const namespace of REPLAY_SEED_NAMESPACES) {
      if (!replaySeedContract.derivedSeeds?.[namespace]) missing.push(`${namespace}Seed`);
    }
  }
  if (!replay.available && !state?.level && !state?.mission) missing.push('challengeSnapshot');
  if (compatibility?.ok === false) missing.push('currentChallengeCompatibility');
  return [...new Set(missing)];
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
