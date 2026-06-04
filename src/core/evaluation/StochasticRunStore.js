import { createGameInstanceId } from '../identity/GameInstanceId.js';

export function createEmptyStochasticRunStore() {
  return {
    rerunGroupId: null,
    planFingerprint: null,
    runs: []
  };
}

export function createDefaultStochasticState({ enabled = false, seed = null, roiScoringMode = 'expectedValue', selectedForecastMember = null } = {}) {
  const normalizedSeed = normalizeSeed(seed ?? makeStochasticSeed());
  return {
    enabled: Boolean(enabled),
    seed: normalizedSeed,
    roiScoringMode,
    selectedForecastMember,
    rerunGroupId: null
  };
}

export function normalizeStochasticState(state) {
  state.stochastic ??= createDefaultStochasticState();
  state.stochastic.enabled = state.challengeMode === 'forecast';
  state.stochastic.seed = normalizeSeed(state.stochastic.seed ?? state.mission?.rules?.stochasticSeed ?? state.level?.meta?.seed ?? makeStochasticSeed());
  state.stochastic.roiScoringMode = state.stochastic.roiScoringMode
    ?? state.mission?.rules?.roiScoringMode
    ?? 'expectedValue';
  state.stochastic.selectedForecastMember = state.ui?.forecastMemberId ?? state.stochastic.selectedForecastMember ?? null;
  state.stochasticRuns ??= createEmptyStochasticRunStore();
  applyStochasticToMission(state);
  return state.stochastic;
}

export function applyStochasticToMission(state) {
  state.mission ??= {};
  state.mission.rules ??= {};
  if (!state.stochastic?.enabled) return;
  state.mission.rules.stochasticSeed = normalizeSeed(state.stochastic.seed);
  state.mission.rules.rngSeed = normalizeSeed(state.stochastic.seed);
  state.mission.rules.roiScoringMode = state.stochastic.roiScoringMode ?? 'expectedValue';
  if (state.ui) {
    state.ui.roiViewMode = state.stochastic.roiScoringMode === 'realizedStochastic'
      ? 'expectedValue'
      : (state.ui.roiViewMode ?? 'expectedValue');
    state.ui.forecastMemberId = state.stochastic.selectedForecastMember ?? state.ui.forecastMemberId ?? 'ensemble_mean';
  }
}

export function setStochasticSeed(state, seed) {
  normalizeStochasticState(state);
  state.stochastic.seed = normalizeSeed(seed);
  applyStochasticToMission(state);
  return state.stochastic.seed;
}

export function randomizeStochasticSeed(state) {
  return setStochasticSeed(state, makeStochasticSeed());
}

export function setStochasticRoiMode(state, mode) {
  normalizeStochasticState(state);
  state.stochastic.roiScoringMode = mode === 'realizedStochastic' ? 'realizedStochastic' : 'expectedValue';
  applyStochasticToMission(state);
  return state.stochastic.roiScoringMode;
}

export function setStochasticForecastMember(state, forecastMemberId) {
  normalizeStochasticState(state);
  state.stochastic.selectedForecastMember = forecastMemberId ?? null;
  if (state.ui) state.ui.forecastMemberId = state.stochastic.selectedForecastMember;
  return state.stochastic.selectedForecastMember;
}

export function prepareStochasticRerun(state, { newSeed = false } = {}) {
  const stochastic = normalizeStochasticState(state);
  if (!stochastic.enabled) return stochastic;
  if (newSeed) randomizeStochasticSeed(state);
  const fingerprint = planFingerprint(state.plan);
  if (!state.stochasticRuns?.rerunGroupId || state.stochasticRuns.planFingerprint !== fingerprint) {
    state.stochasticRuns = {
      rerunGroupId: createGameInstanceId('RUN'),
      planFingerprint: fingerprint,
      runs: []
    };
  }
  state.stochastic.rerunGroupId = state.stochasticRuns.rerunGroupId;
  state.simulationResume = null;
  return state.stochastic;
}

export function annotateStochasticResult(state, result) {
  const stochastic = normalizeStochasticState(state);
  const fingerprint = planFingerprint(state.plan);
  const runStore = state.stochasticRuns ?? createEmptyStochasticRunStore();
  const runIndex = findRunIndex(runStore, stochastic.seed, fingerprint) ?? runStore.runs.length + 1;
  const summary = summarizeStochasticResult(result);
  result.stochastic = {
    ...(result.stochastic ?? {}),
    enabled: stochastic.enabled,
    seed: stochastic.seed,
    roiScoringMode: stochastic.roiScoringMode,
    selectedForecastMember: stochastic.selectedForecastMember,
    rerunGroupId: runStore.rerunGroupId ?? stochastic.rerunGroupId,
    planFingerprint: fingerprint,
    runIndex,
    ...summary
  };
  result.stochasticRunHistory = buildRunHistoryExport(runStore);
  return result;
}

export function recordStochasticRun(state, result) {
  const stochastic = normalizeStochasticState(state);
  if (!stochastic.enabled || !result) return null;
  prepareStochasticRerun(state);
  const fingerprint = planFingerprint(state.plan);
  const summary = summarizeStochasticResult(result);
  const existingIndex = state.stochasticRuns.runs.findIndex((run) => run.seed === stochastic.seed && run.planFingerprint === fingerprint);
  const entry = {
    seed: stochastic.seed,
    roiScoringMode: stochastic.roiScoringMode,
    selectedForecastMember: stochastic.selectedForecastMember,
    rerunGroupId: state.stochasticRuns.rerunGroupId,
    planFingerprint: fingerprint,
    runIndex: existingIndex >= 0 ? state.stochasticRuns.runs[existingIndex].runIndex : state.stochasticRuns.runs.length + 1,
    result,
    summary
  };
  if (existingIndex >= 0) state.stochasticRuns.runs[existingIndex] = entry;
  else state.stochasticRuns.runs.push(entry);
  state.stochastic.rerunGroupId = state.stochasticRuns.rerunGroupId;
  annotateStochasticResult(state, result);
  result.stochasticRunHistory = buildRunHistoryExport(state.stochasticRuns);
  return entry;
}

export function buildRunHistoryExport(runStore) {
  return (runStore?.runs ?? []).map((run) => ({
    seed: run.seed,
    roiScoringMode: run.roiScoringMode,
    selectedForecastMember: run.selectedForecastMember,
    runIndex: run.runIndex,
    rerunGroupId: run.rerunGroupId,
    planFingerprint: run.planFingerprint,
    finalScore: run.summary.finalScore,
    expectedValue: run.summary.expectedValue,
    realizedValue: run.summary.realizedValue,
    probabilitySuccesses: run.summary.probabilitySuccesses,
    probabilityMisses: run.summary.probabilityMisses,
    hazardRiskExposure: run.summary.hazardRiskExposure,
    forecastRegret: run.summary.forecastRegret
  }));
}

export function summarizeStochasticResult(result) {
  const summary = result?.summary ?? {};
  const stochastic = result?.stochastic ?? {};
  const risk = result?.risk ?? {};
  return {
    finalScore: summary.finalScore ?? 0,
    expectedValue: stochastic.expectedValue ?? summary.expectedSampleScore ?? 0,
    realizedValue: stochastic.realizedValue ?? summary.realizedSampleScore ?? summary.sampleScore ?? 0,
    probabilitySuccesses: stochastic.probabilitySuccesses ?? summary.probabilitySuccesses ?? 0,
    probabilityMisses: stochastic.probabilityMisses ?? summary.probabilityFailures ?? 0,
    hazardRiskExposure: risk.mobileHazardExposure ?? summary.mobileHazardExposureCount ?? 0,
    forecastRegret: result?.regret?.forecastRegret ?? risk.forecastRegret ?? summary.expectedValueRegret ?? 0
  };
}

export function planFingerprint(plan) {
  const stable = {
    levelId: plan?.levelId ?? null,
    instanceId: plan?.instanceId ?? null,
    missionId: plan?.missionId ?? null,
    agentPlans: (plan?.agentPlans ?? []).map((agentPlan) => ({
      agentId: agentPlan.agentId,
      waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({
        x: waypoint.x,
        y: waypoint.y,
        t: waypoint.t ?? null,
        window: waypoint.window ?? null,
        action: waypoint.action ?? 'sample'
      }))
    }))
  };
  return shortHash(JSON.stringify(stable));
}

export function makeStochasticSeed() {
  const cryptoValue = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Date.now() + Math.random() * 100000);
  return (cryptoValue >>> 0) % 1000000000;
}

export function normalizeSeed(seed) {
  const number = Number(seed);
  if (Number.isFinite(number)) return Math.max(0, Math.min(999999999, Math.round(number)));
  return shortHash(String(seed));
}

function findRunIndex(runStore, seed, fingerprint) {
  const run = (runStore?.runs ?? []).find((candidate) => candidate.seed === seed && candidate.planFingerprint === fingerprint);
  return run?.runIndex ?? null;
}

function shortHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
