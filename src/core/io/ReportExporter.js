export function buildMarkdownAAR({ level, mission, plan, result }) {
  const s = result?.summary ?? {};
  return `# ANCHOR Mission After-Action Report

## Mission Context
- Level: ${level?.meta?.name ?? level?.levelId ?? 'Unknown'}
- Instance: ${level?.instanceId ?? result?.instanceId ?? 'N/A'}
- Mission: ${mission?.meta?.name ?? mission?.missionId ?? 'Unknown'}
- Plan agents: ${plan?.agentPlans?.length ?? 0}
- Result source: ${result?.source ?? 'unknown'}
- Challenge mode: ${result?.challengeMode ?? 'unknown'}

## Result Summary
- Final score: ${s.finalScore ?? 0}
- Sample score: ${s.sampleScore ?? 0}
- Expected sample value: ${s.expectedSampleScore ?? 0}
- Realized sample value: ${s.realizedSampleScore ?? s.sampleScore ?? 0}
- Gold star targets: ${result?.priorityTargets?.captured ?? s.priorityTargets?.captured ?? 0} / ${result?.priorityTargets?.available ?? s.priorityTargets?.available ?? 0}
- Gold star score: ${result?.priorityTargets?.score ?? s.priorityTargetScore ?? 0}
- Probability outcomes: ${s.probabilitySuccesses ?? 0} success / ${s.probabilityFailures ?? 0} failure
- Energy used: ${s.energyUsed ?? 0}
- Hazards hit: ${s.hazardsHit ?? 0}
- Mobile hazard contacts: ${s.mobileHazardsHit ?? 0}
- Mobile hazard near misses: ${s.mobileHazardNearMisses ?? 0}
- Shallow energy penalty: ${s.shallowEnergyPenalty ?? 0}
- Duplicate samples: ${s.duplicateSamples ?? 0}
- Depleted samples: ${s.depletedSamples ?? 0}
- Cooldown-suppressed samples: ${s.cooldownSuppressedSamples ?? 0}
- Completed waypoints: ${s.completedWaypoints ?? 0}
- Missed waypoints: ${s.missedWaypoints ?? 0}
- Sampled cells: ${s.sampledCells ?? 0}
- Elapsed time: ${s.elapsedTime ?? 0}
- Completed: ${s.completed ? 'yes' : 'no'}
- Rating: ${result?.rating ?? 'N/A'}
- Forecast regret: ${result?.regret?.forecastRegret ?? 'N/A'}
- Regret ratio: ${result?.regret?.regretRatio ?? 'N/A'}
- ROI scoring mode: ${result?.stochasticRun?.roiScoringMode ?? 'expectedValue'}
- Sampling mode: ${result?.sampling?.mode ?? s.samplingMode ?? 'unique'}
- RNG seed: ${result?.stochasticRun?.rngSeed ?? 'N/A'}
- Ensemble mean estimate: ${result?.ensembleMetrics?.ensembleMeanScoreEstimate ?? 'N/A'}
- Ensemble disagreement: ${result?.ensembleMetrics?.ensembleDisagreement ?? 'N/A'}
- Ensemble regret estimate: ${result?.ensembleMetrics?.ensembleRegretEstimate ?? 'N/A'}
- Ensemble regret ratio: ${result?.ensembleMetrics?.regretRatio ?? 'N/A'}

## Stochastic Outcomes
- ROI scoring mode: ${result?.stochastic?.roiScoringMode ?? result?.stochasticRun?.roiScoringMode ?? 'expectedValue'}
- Stochastic seed: ${result?.stochastic?.seed ?? result?.stochasticRun?.rngSeed ?? 'N/A'}
- Expected value: ${result?.stochastic?.expectedValue ?? 'N/A'}
- Realized value: ${result?.stochastic?.realizedValue ?? 'N/A'}
- Probability successes: ${result?.stochastic?.probabilitySuccesses ?? 'N/A'}
- Probability misses: ${result?.stochastic?.probabilityMisses ?? 'N/A'}

## Stochastic Seed Comparison
${formatStochasticRunHistory(result?.stochasticRunHistory ?? [])}

## Risk Metrics
- Static hazards hit: ${result?.risk?.staticHazardsHit ?? s.hazardsHit ?? 'N/A'}
- Mobile hazard contacts: ${result?.risk?.mobileHazardContacts ?? s.mobileHazardsHit ?? 'N/A'}
- Mobile hazard near misses: ${result?.risk?.mobileHazardNearMisses ?? s.mobileHazardNearMisses ?? 'N/A'}
- Mobile hazard exposure: ${result?.risk?.mobileHazardExposure ?? s.mobileHazardExposureCount ?? 'N/A'}
- Shallow exposure: ${result?.risk?.shallowExposure ?? 'N/A'}
- Deep exposure: ${result?.risk?.deepExposure ?? 'N/A'}
- Depth energy penalty: ${result?.risk?.depthEnergyPenalty ?? s.shallowEnergyPenalty ?? 'N/A'}

## Mission End Condition
- Mode: ${result?.endCondition?.mode ?? s.endCondition?.mode ?? 'none'}
- Required by mission end: ${(result?.endCondition?.requiredByMissionEnd ?? s.recoveryRequired) ? 'yes' : 'no'}
- Achieved: ${(result?.endCondition?.achieved ?? s.recoveryAchieved) ? 'yes' : 'no'}
- Success: ${(result?.endCondition?.success ?? s.recoverySuccess) ? 'yes' : 'no'}
- Recovery bonus: ${s.recoveryBonus ?? 0}
- Recovery penalty: ${s.recoveryPenalty ?? 0}

## Sampling Rules
- Mode: ${result?.sampling?.mode ?? s.samplingMode ?? 'unique'}
- Duplicate value multiplier: ${result?.sampling?.config?.duplicateValueMultiplier ?? 'N/A'}
- Depletion factor: ${result?.sampling?.config?.depletionFactor ?? 'N/A'}
- Cooldown windows: ${result?.sampling?.config?.cooldownWindows ?? 'N/A'}
- Persistent window multiplier: ${result?.sampling?.config?.persistentWindowMultiplier ?? 'N/A'}

## Gold Star Targets
- Available: ${result?.priorityTargets?.available ?? s.priorityTargets?.available ?? 0}
- Captured: ${result?.priorityTargets?.captured ?? s.priorityTargets?.captured ?? 0}
- Missed: ${result?.priorityTargets?.missed ?? s.priorityTargets?.missed ?? 0}
- Score: ${result?.priorityTargets?.score ?? s.priorityTargetScore ?? 0}
- Captures: ${formatPriorityTargetCaptures(result?.priorityTargets?.captures ?? s.priorityTargets?.captures ?? [])}

## Plan Comparison
${formatPlanComparison(result?.comparison)}

## Objectives
${formatObjectives(result?.objectives ?? [])}

## Score Components
- Weighted sample score: ${s.weightedSampleScore ?? 0}
- Energy penalty: ${s.energyPenalty ?? 0}
- Hazard penalty: ${s.hazardPenalty ?? 0}
- Elapsed time penalty: ${s.elapsedTimePenalty ?? 0}
- Update penalty: ${s.updatePenalty ?? 0}
- Missed waypoint penalty: ${s.missedWaypointPenalty ?? 0}

## Event Counts
${formatEventCounts(result?.events ?? [])}

## Reflection Notes
- What strategy was used?
- What worked?
- What failed?
- What should be improved next?
`;
}

function formatPriorityTargetCaptures(captures) {
  if (!captures.length) return 'none';
  return captures.map((capture) => `${capture.targetId} by ${capture.agentId} at t=${formatMetric(capture.t)} (+${formatMetric(capture.value)})`).join('; ');
}

function formatEventCounts(events) {
  const counts = events.reduce((summary, event) => {
    summary[event.type] = (summary[event.type] ?? 0) + 1;
    return summary;
  }, {});
  const entries = Object.entries(counts);
  if (entries.length === 0) return '- No events recorded.';
  return entries.map(([type, count]) => `- ${type}: ${count}`).join('\n');
}

function formatObjectives(objectives) {
  if (objectives.length === 0) return '- No objectives recorded.';
  return objectives.map((objective) => `- ${objective.complete ? 'Done' : 'Missed'}: ${objective.label}`).join('\n');
}

function formatPlanComparison(comparison) {
  const rows = comparison?.rows ?? [];
  if (!rows.length) return 'No comparison data available.';
  const header = '| Plan | Final score | Realized value | Energy | Hazards | Mobile | Risk | Forecast regret |\n| ---- | ----------: | -------------: | -----: | ------: | -----: | ---: | --------------: |';
  const body = rows.map((row) => `| ${row.planName ?? row.source ?? 'Unknown'} | ${formatMetric(row.finalScore)} | ${formatMetric(row.realizedValue)} | ${formatMetric(row.energyUsed)} | ${formatMetric(row.staticHazardsHit)} | ${formatMetric(row.mobileHazardsHit)} | ${formatMetric(row.riskExposure)} | ${formatMetric(row.forecastRegret)} |`).join('\n');
  const winner = comparison.winner ? `\n\nWinner: ${comparison.winner.planName ?? comparison.winner.source} by final score.` : '';
  const notes = (comparison.notes ?? []).length ? `\n\n${comparison.notes.map((note) => `- ${note}`).join('\n')}` : '';
  return `${header}\n${body}${winner}${notes}`;
}

function formatStochasticRunHistory(history) {
  if (!history.length) return 'No seed comparison data available.';
  const header = '| Seed | Final | Expected | Realized | Successes | Misses | Risk | Regret |\n| ---- | ----: | -------: | -------: | --------: | -----: | ---: | -----: |';
  const body = history.map((run) => `| ${run.seed ?? 'N/A'} | ${formatMetric(run.finalScore)} | ${formatMetric(run.expectedValue)} | ${formatMetric(run.realizedValue)} | ${formatMetric(run.probabilitySuccesses)} | ${formatMetric(run.probabilityMisses)} | ${formatMetric(run.hazardRiskExposure)} | ${formatMetric(run.forecastRegret)} |`).join('\n');
  return `${header}\n${body}`;
}

function formatMetric(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}
