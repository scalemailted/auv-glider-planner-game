export function summarizeScore({ agents, events, t, scoring = {}, missionState = null, complete = false }) {
  const sampleScore = agents.reduce((sum, agent) => sum + agent.sampleScore, 0);
  const expectedSampleScore = agents.reduce((sum, agent) => sum + (agent.expectedSampleScore ?? 0), 0);
  const energyUsed = agents.reduce((sum, agent) => sum + agent.energyUsed, 0);
  const sampleEvents = events.filter((event) => event.type === 'sample');
  const hazardsHit = events.filter((event) => event.type === 'hazard').length;
  const mobileHazardsHit = events.filter((event) => event.type === 'mobileHazard').length;
  const mobileHazardNearMisses = events.filter((event) => event.type === 'mobileHazardNearMiss').length;
  const mobileHazardExposureCount = events.filter((event) => event.type === 'mobileHazardNearMiss' || event.type === 'mobileHazardExposure' || event.type === 'mobileHazard').length;
  const duplicateSamples = missionState?.samplingMetrics?.duplicateSamples ?? events.filter((event) => event.type === 'duplicateSample').length;
  const updateEvents = events.filter((event) => event.type === 'replanned' || event.type === 'update').length;
  const completedWaypoints = agents.reduce((sum, agent) => sum + agent.completedWaypoints.length, 0);
  const missedWaypoints = agents.reduce((sum, agent) => sum + agent.missedWaypoints.length, 0);
  const energyPenalty = energyUsed * (scoring.energyPenalty ?? 0.05);
  const hazardPenalty = hazardsHit * (scoring.hazardPenalty ?? 10);
  const mobileHazardPenalty = events
    .filter((event) => event.type === 'mobileHazard')
    .reduce((sum, event) => sum + Number(event.penalty ?? scoring.mobileHazardPenalty ?? scoring.hazardPenalty ?? 10), 0);
  const elapsedTimePenalty = t * (scoring.elapsedTimePenalty ?? 0.01);
  const updatePenalty = updateEvents * (scoring.updatePenalty ?? 0);
  const missedWaypointPenalty = missedWaypoints * (scoring.missedWaypointPenalty ?? 5);
  const endCondition = missionState?.endConditionResult ?? null;
  const recoveryBonus = Number(endCondition?.bonusApplied ?? 0);
  const recoveryPenalty = Number(endCondition?.penaltyApplied ?? 0);
  const priorityTargets = missionState?.priorityTargets
    ?? summarizePriorityTargetsFromState(missionState);
  const priorityTargetScore = Number(priorityTargets.score ?? 0);
  const priorityTargetMissPenalty = Math.max(0, Number(missionState?.priorityTargetMissPenalty ?? scoring.priorityTargetMissPenalty ?? 0)) * Number(priorityTargets.missed ?? 0);
  const weightedSampleScore = sampleScore * (scoring.sampleWeight ?? 100);
  const finalScore = weightedSampleScore + priorityTargetScore + recoveryBonus - energyPenalty - hazardPenalty - mobileHazardPenalty - elapsedTimePenalty - updatePenalty - missedWaypointPenalty - recoveryPenalty - priorityTargetMissPenalty;
  const probabilitySuccesses = sampleEvents.filter((event) => event.manifested !== false).length;
  const probabilityFailures = sampleEvents.filter((event) => event.manifested === false).length;
  const shallowEnergyPenalty = events
    .filter((event) => event.type === 'depthEnergy')
    .reduce((sum, event) => sum + Number(event.extraEnergy ?? 0), 0);
  const depthEnergyBenefit = events
    .filter((event) => event.type === 'depthEnergy')
    .reduce((sum, event) => sum + Number(event.energyBenefit ?? 0), 0);

  return {
    finalScore: round(finalScore, 2),
    sampleScore: round(sampleScore, 3),
    expectedSampleScore: round(expectedSampleScore, 3),
    realizedTruthValue: round(sampleScore, 3),
    realizedSampleScore: round(sampleScore, 3),
    expectedValueRegret: round(Math.max(0, expectedSampleScore - sampleScore), 3),
    probabilitySuccesses,
    probabilityFailures,
    averageSampleProbability: round(average(sampleEvents.map((event) => Number(event.probability ?? 1))), 3),
    weightedSampleScore: round(weightedSampleScore, 2),
    priorityTargetScore: round(priorityTargetScore, 2),
    priorityTargetMissPenalty: round(priorityTargetMissPenalty, 2),
    priorityTargets,
    energyUsed: round(energyUsed, 3),
    energyPenalty: round(energyPenalty, 2),
    hazardsHit,
    mobileHazardsHit,
    mobileHazardNearMisses,
    mobileHazardExposureCount,
    hazardPenalty: round(hazardPenalty, 2),
    mobileHazardPenalty: round(mobileHazardPenalty, 2),
    shallowEnergyPenalty: round(shallowEnergyPenalty, 3),
    depthEnergyBenefit: round(depthEnergyBenefit, 3),
    duplicateSamples,
    depletedSamples: missionState?.samplingMetrics?.depletedSamples ?? sampleEvents.filter((event) => event.depleted).length,
    cooldownSuppressedSamples: missionState?.samplingMetrics?.cooldownSuppressedSamples ?? 0,
    persistentSamples: missionState?.samplingMetrics?.persistentSamples ?? 0,
    samplingMode: missionState?.samplingMode ?? missionState?.samplingRules?.mode ?? 'unique',
    elapsedTime: round(t, 2),
    elapsedTimePenalty: round(elapsedTimePenalty, 2),
    updatePenalty: round(updatePenalty, 2),
    replans: updateEvents,
    completedWaypoints,
    missedWaypoints,
    missedWaypointPenalty: round(missedWaypointPenalty, 2),
    endCondition,
    recoveryRequired: Boolean(endCondition?.requiredByMissionEnd),
    recoverySuccess: endCondition?.success ?? true,
    recoveryAchieved: endCondition?.achieved ?? true,
    recoveryBonus: round(recoveryBonus, 2),
    recoveryPenalty: round(recoveryPenalty, 2),
    sampledCells: missionState?.sampled?.size ?? events.filter((event) => event.type === 'sample').length,
    returnSuccess: endCondition?.success ?? agents.every((agent) => agent.completedPlan),
    completed: complete && !missionState?.aborted,
    aborted: Boolean(missionState?.aborted),
    abortReason: missionState?.abortReason ?? null
  };
}

function summarizePriorityTargetsFromState(missionState) {
  return {
    available: Number(missionState?.priorityTargetAvailable ?? 0),
    captured: missionState?.capturedPriorityTargets?.size ?? 0,
    missed: Math.max(0, Number(missionState?.priorityTargetAvailable ?? 0) - (missionState?.capturedPriorityTargets?.size ?? 0)),
    score: Number(missionState?.priorityTargetScore ?? 0),
    capturedIds: [...(missionState?.capturedPriorityTargets ?? [])],
    captures: [...(missionState?.priorityTargetCaptures ?? [])],
    duplicates: Number(missionState?.priorityTargetMetrics?.duplicates ?? 0)
  };
}

function round(value, digits) {
  return Number(value.toFixed(digits));
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}
