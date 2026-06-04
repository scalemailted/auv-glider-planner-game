export function getLevelObjectiveSummary(level = {}, mission = {}) {
  const campaign = level.campaign ?? {};
  return {
    concept: campaign.concept ?? 'Mission planning',
    learningObjectives: campaign.learningObjectives ?? [
      'Plan waypoint routes across currents, hazards, and sampling value.'
    ],
    successCriteria: campaign.successCriteria ?? {},
    missionObjectives: mission.objectives ?? makeDefaultObjectives(level, mission)
  };
}

export function getPlanningPrompts(level = {}) {
  const prompts = level.tutorial?.planningPrompts ?? level.campaign?.planningPrompts ?? [];
  if (!Array.isArray(prompts)) return [];
  return prompts
    .filter((prompt) => prompt && (prompt.title || prompt.body))
    .map((prompt) => ({
      title: String(prompt.title ?? 'Planning step'),
      body: String(prompt.body ?? '')
    }));
}

export function evaluateObjectives(summary = {}, level = {}, mission = {}) {
  const { missionObjectives } = getLevelObjectiveSummary(level, mission);
  return missionObjectives.map((objective) => {
    const actual = summary[objective.metric];
    return {
      ...objective,
      actual,
      complete: compareMetric(actual, objective.operator, objective.value)
    };
  });
}

export function summarizePerformance(summary = {}, objectives = [], level = {}) {
  const suggestions = [];
  const completedCount = objectives.filter((objective) => objective.complete).length;

  if ((summary.energyUsed ?? 0) > (level.campaign?.successCriteria?.maxEnergyUsed ?? 80)) {
    suggestions.push('Energy was high. Try using currents instead of fighting them.');
  }
  if ((summary.hazardsHit ?? 0) > 0) suggestions.push('Hazards were hit. Route around hazard cells with wider margins.');
  if ((summary.sampleScore ?? 0) < (level.campaign?.successCriteria?.minSampleScore ?? 0.5)) {
    suggestions.push('Sample score was low. Target brighter ROI cells or add another sampling waypoint.');
  }
  if ((summary.missedWaypoints ?? 0) > 0) suggestions.push('Some waypoints were missed. Place closer intermediate waypoints and compensate for currents.');
  if (summary.regret?.forecastRegret > 0) suggestions.push('Forecast mode lost score. Choose robust targets that remain useful if the forecast is wrong.');
  if (suggestions.length === 0) suggestions.push('The plan met the main constraints. Try improving score or energy efficiency.');

  return {
    completedCount,
    totalCount: objectives.length,
    whatWentWell: completedCount === objectives.length
      ? 'All listed objectives were completed.'
      : `${completedCount} of ${objectives.length} objectives were completed.`,
    whatFailed: objectives.filter((objective) => !objective.complete).map((objective) => objective.label),
    suggestions
  };
}

function makeDefaultObjectives(level, mission) {
  const criteria = level.campaign?.successCriteria ?? {};
  return [
    {
      id: 'collect_samples',
      label: 'Collect valuable samples',
      metric: 'sampleScore',
      operator: '>=',
      value: criteria.minSampleScore ?? mission.rules?.roiThreshold ?? 0.15
    },
    {
      id: 'avoid_hazards',
      label: 'Avoid hazards',
      metric: 'hazardsHit',
      operator: '<=',
      value: criteria.maxHazardsHit ?? 0
    },
    {
      id: 'finish_with_score',
      label: 'Reach the target score',
      metric: 'finalScore',
      operator: '>=',
      value: criteria.minFinalScore ?? level.campaign?.ratings?.bronze ?? 40
    }
  ];
}

function compareMetric(actual, operator, expected) {
  if (!Number.isFinite(actual)) return false;
  if (operator === '>=') return actual >= expected;
  if (operator === '>') return actual > expected;
  if (operator === '<=') return actual <= expected;
  if (operator === '<') return actual < expected;
  if (operator === '==') return actual === expected;
  return false;
}
