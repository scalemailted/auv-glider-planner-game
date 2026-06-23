import { assertCondition, bathymetryResolutionConvergence, round } from './scientific_baseline_helpers.mjs';

const caseIds = ['smoothShelfBreak', 'gaussianSeamount', 'submarineCanyon', 'sinusoidalRidge'];
const results = caseIds.map((caseId) => {
  const result = bathymetryResolutionConvergence(caseId, [17, 33, 65]);
  assertCondition(result.runs.every((run) => Number.isFinite(Number(run.l2)) && Number.isFinite(Number(run.linf))), `${caseId} convergence run produced non-finite error.`, result);
  const first = Number(result.runs[0].l2);
  const last = Number(result.runs.at(-1).l2);
  assertCondition(last <= first * 0.8 + 1e-9 || last <= 1.5, `${caseId} did not improve enough with resolution.`, result);
  return {
    caseId,
    l2ReductionRatio: round(last / Math.max(1e-12, first)),
    monotoneEnough: result.monotoneEnough,
    runs: result.runs
  };
});

console.log('smoke_bathymetry_resolution_convergence: ok', JSON.stringify({ cases: results }, null, 2));
