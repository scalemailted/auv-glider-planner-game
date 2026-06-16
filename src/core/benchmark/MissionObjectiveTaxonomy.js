export const MISSION_OBJECTIVE_TAXONOMY_VERSION = 'mission-objective-taxonomy-p0';

export const MISSION_OBJECTIVE_OPTIONS = [
  objective('reconnaissanceSurvey', 'Reconnaissance Survey', 'Broadly inspect the operating area before committing to a narrower objective.', ['forecast', 'beliefRoi', 'flowField'], 'weightedAcquisition', 'balancedActionValue', ['coverage', 'unique cells observed', 'safe survey progress'], 'full coverage route planner'),
  objective('exploitKnownValue', 'Exploit Known Value', 'Visit already-known high-value sampling regions.', ['trueRoi', 'beliefRoi', 'samplingPriority'], 'topValue', 'balancedActionValue', ['sample value collected', 'travel cost', 'duplicate penalty'], 'uncertainty reduction policy'),
  objective('reduceUncertainty', 'Reduce Uncertainty', 'Prioritize measurements that reduce expected uncertainty.', ['expectedUncertainty', 'beliefRoi', 'samplingPriority'], 'uncertaintyReduction', 'balancedActionValue', ['uncertainty decrease', 'information gain proxy', 'energy cost'], 'hidden-truth oracle objective'),
  objective('mapBoundary', 'Map Boundary', 'Sample gradients and fronts where field structure changes rapidly.', ['boundaryStrength', 'expectedUncertainty', 'forecastValidation'], 'boundaryMapping', 'balancedActionValue', ['boundary samples', 'gradient coverage', 'forecast validation'], 'shoreline or obstacle detection'),
  objective('validateForecast', 'Validate Forecast', 'Collect measurements that test forecast quality against observations.', ['forecastValidation', 'expectedUncertainty', 'surprise'], 'forecastValidation', 'balancedActionValue', ['innovation', 'forecast error reduction', 'validation coverage'], 'truth-assisted replanning'),
  objective('confirmHiddenEvent', 'Confirm Hidden Event', 'Follow up on suspicious hidden-event or false-alarm evidence.', ['hiddenEventProbability', 'surprise', 'unknownEventProbability'], 'hiddenEventFollowup', 'riskAvoidant', ['event confirmation', 'false alarm rejection', 'risk exposure'], 'general anomaly detector'),
  objective('trackFeature', 'Track Feature', 'Follow a moving or evolving feature over time.', ['futurePriority', 'flowField', 'samplingPriority'], 'weightedAcquisition', 'interceptFuturePriority', ['feature intercepts', 'arrival timing', 'lost-track penalty'], 'multi-step route optimizer'),
  objective('localizeSource', 'Localize Source', 'Move toward likely source regions for a plume or recurring signal.', ['sourceLikelihood', 'hiddenEventProbability', 'boundaryStrength'], 'hiddenEventFollowup', 'balancedActionValue', ['source proximity', 'up-gradient evidence', 'risk exposure'], 'chemical source inversion solver'),
  objective('revisitStaleRegion', 'Revisit Stale Region', 'Return to important areas whose information has become stale.', ['staleness', 'recentSamplePenalty'], 'stalenessRevisit', 'energyAware', ['age-of-information reduction', 'duplicate avoidance', 'energy cost'], 'static coverage checklist'),
  objective('avoidHazard', 'Avoid Hazard', 'Preserve safety while still collecting useful observations.', ['hazard', 'restrictedZones', 'crossCurrentRisk'], 'weightedAcquisition', 'riskAvoidant', ['hazard exposure', 'near misses', 'safe value collected'], 'hazard-blind science objective'),
  objective('conserveEnergy', 'Conserve Energy', 'Prefer useful objectives that remain feasible under energy constraints.', ['energyCost', 'travelDistance', 'currentAssist'], 'weightedAcquisition', 'energyAware', ['energy used', 'value per energy', 'return feasibility'], 'battery physics simulator'),
  objective('cooperativeCoverage', 'Cooperative Coverage', 'Coordinate multiple agents to reduce overlap and improve coverage.', ['samplingPriority', 'recentSamplePenalty', 'coverageMap'], 'diverseTopK', 'balancedActionValue', ['team coverage', 'overlap penalty', 'communication-neutral value'], 'multi-agent route allocation solver')
];

export const MISSION_OBJECTIVE_IDS = MISSION_OBJECTIVE_OPTIONS.map((objective) => objective.id);

export function normalizeMissionObjectiveId(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    survey: 'reconnaissanceSurvey',
    reconnaissance: 'reconnaissanceSurvey',
    exploit: 'exploitKnownValue',
    uncertainty: 'reduceUncertainty',
    boundary: 'mapBoundary',
    forecast: 'validateForecast',
    hiddenEvent: 'confirmHiddenEvent',
    eventFollowup: 'confirmHiddenEvent',
    tracking: 'trackFeature',
    source: 'localizeSource',
    stale: 'revisitStaleRegion',
    hazard: 'avoidHazard',
    energy: 'conserveEnergy',
    cooperative: 'cooperativeCoverage'
  };
  return aliases[value] ?? (MISSION_OBJECTIVE_IDS.includes(value) ? value : 'reconnaissanceSurvey');
}

export function missionObjectiveById(id) {
  const normalized = normalizeMissionObjectiveId(id);
  return MISSION_OBJECTIVE_OPTIONS.find((objective) => objective.id === normalized) ?? MISSION_OBJECTIVE_OPTIONS[0];
}

export function missionObjectiveOptions() {
  return MISSION_OBJECTIVE_OPTIONS.map((objective) => ({ ...objective, usesFields: [...objective.usesFields], scoringHints: [...objective.scoringHints] }));
}

export function objectiveRecommendedFields(id) {
  return [...missionObjectiveById(id).usesFields];
}

export function objectiveSuggestedMetrics(id) {
  return [...missionObjectiveById(id).scoringHints];
}

function objective(id, label, description, usesFields, recommendedSamplingMethod, recommendedActionMethod, scoringHints, notA) {
  return {
    id,
    label,
    description,
    usesFields,
    recommendedSamplingMethod,
    recommendedActionMethod,
    scoringHints,
    notA
  };
}
