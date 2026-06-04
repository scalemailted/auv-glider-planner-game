import { getForecastMembers, getPlanningFrame } from '../sim/ChallengeMode.js';
import { roiScalar } from '../sim/ROIValue.js';

import { computeForecastRegret, computeRegretRatio } from './RegretMetrics.js';

export function summarizeEnsembleForPlan(level, plan, time = 0, options = {}) {
  const members = getForecastMembers(level).filter((member) => member.id !== 'ensemble_mean');
  if (!members.length || !plan) return null;
  const estimates = members.map((member) => ({
    memberId: member.id,
    label: member.label ?? member.id,
    expectedValue: estimatePlanROI(level, plan, time, member.id)
  }));
  const values = estimates.map((estimate) => estimate.expectedValue);
  const ensembleMean = round(average(values), 3);
  const actual = Number(options.actualRealizedValue ?? options.actualScore);
  const regret = Number.isFinite(actual) ? computeForecastRegret(ensembleMean, actual) : null;
  return {
    selectedForecastMemberId: options.selectedForecastMemberId ?? null,
    memberCount: members.length,
    estimates,
    ensembleMeanExpectedValue: ensembleMean,
    ensembleMeanScoreEstimate: ensembleMean,
    ensembleDisagreement: round(stddev(values), 3),
    truthReferenceRealizedValue: Number.isFinite(actual) ? round(actual, 3) : null,
    ensembleRegretEstimate: regret,
    regretRatio: Number.isFinite(actual) ? computeRegretRatio(ensembleMean, actual) : null
  };
}

function estimatePlanROI(level, plan, time, forecastMemberId) {
  const frame = getPlanningFrame(level, time, { challengeMode: 'forecast', forecastMemberId });
  return (plan.agentPlans ?? []).reduce((sum, agentPlan) => (
    sum + (agentPlan.waypoints ?? []).reduce((agentSum, waypoint) => (
      agentSum + roiScalar(frame?.roi?.[waypoint.y]?.[waypoint.x] ?? 0, 'expectedValue')
    ), 0)
  ), 0);
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function stddev(values) {
  const avg = average(values);
  return Math.sqrt(average(values.map((value) => (value - avg) ** 2)));
}

function round(value, digits) {
  return Number(Number(value).toFixed(digits));
}
