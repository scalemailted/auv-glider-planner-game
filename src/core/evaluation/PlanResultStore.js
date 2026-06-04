import { summarizePlanResult } from './PlanComparison.js';
import { createEmptyStochasticRunStore } from './StochasticRunStore.js';

export function createEmptyPlanResultStore() {
  return {
    manual: null,
    temporalGreedy: null,
    greedyBaseline: null,
    importedSolver: null,
    loadedFromBestPriorRun: null,
    bestPriorRerun: null
  };
}

export function storePlanResult(state, { source, plan, result }) {
  const normalizedSource = normalizePlanSource(source ?? result?.source ?? plan?.meta?.source);
  state.planResults ??= createEmptyPlanResultStore();
  const entry = {
    source: normalizedSource,
    plan: clone(plan),
    result: clone(result),
    summary: summarizePlanResult({ source: normalizedSource, plan, result }, normalizedSource)
  };
  state.planResults[normalizedSource] = entry;
  if (normalizedSource === 'manual') {
    state.manualPlan = entry.plan;
    state.manualResult = entry.result;
  } else if (normalizedSource === 'temporalGreedy') {
    state.temporalGreedyPlan = entry.plan;
    state.temporalGreedyResult = entry.result;
  } else if (normalizedSource === 'greedyBaseline') {
    state.greedyPlan = entry.plan;
    state.greedyResult = entry.result;
  } else if (normalizedSource === 'importedSolver') {
    state.solverPlan = entry.plan;
    state.solverResult = entry.result;
  }
  return entry;
}

export function resetPlanResultStore(state) {
  state.planResults = createEmptyPlanResultStore();
  state.manualResult = null;
  state.temporalGreedyResult = null;
  state.greedyResult = null;
  state.solverResult = null;
  state.stochasticRuns = createEmptyStochasticRunStore();
  if (state.stochastic) state.stochastic.rerunGroupId = null;
}

export function normalizePlanSource(source) {
  if (source === 'temporalGreedy' || source === 'browser-temporal-greedy') return 'temporalGreedy';
  if (source === 'greedy' || source === 'greedyBaseline') return 'greedyBaseline';
  if (source === 'solver' || source === 'imported' || source === 'importedSolver') return 'importedSolver';
  if (source === 'loadedFromBestPriorRun') return 'loadedFromBestPriorRun';
  if (source === 'bestPriorRerun') return 'bestPriorRerun';
  if (source === 'manual' || source === 'player' || !source) return 'manual';
  return 'unknown';
}

function clone(value) {
  if (value === undefined || value === null) return value;
  if (globalThis.structuredClone) return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
