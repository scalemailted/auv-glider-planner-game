const MissionScoringSchema = require('./MissionScoringSchema.js')
const MISSION_SCORE_COMPONENTS_VERSION = 'mission-score-components-score-r1';

const ALL_OBJECTIVES = Object.freeze([
  'reconnaissanceSurvey',
  'surveyReconnaissance',
  'reduceUncertainty',
  'validateForecast',
  'mapBoundary',
  'confirmHiddenEvent',
  'localizeSource',
  'trackMovingFeature',
  'revisitStaleRegion',
  'persistentMonitoring',
  'energyConservation',
  'hazardAvoidance'
]);

const RAW_COMPONENTS = [
  c('scienceValueCollected', 'science', 'Science Value Collected', 'Total public-safe value sampled by the mission.', 'higherIsBetter', 'score-points', [0, 25], null, ['publicObservation', 'publicMissionRecord']),
  c('uncertaintyReduction', 'science', 'Uncertainty Reduction', 'Reduction in expected uncertainty after observations.', 'higherIsBetter', 'fraction', [0, 0.35], null, ['publicBelief']),
  c('forecastValidation', 'science', 'Forecast Validation', 'Evidence that the mission checked forecast/belief expectations.', 'higherIsBetter', 'score-points', [0, 8], null, ['publicForecast', 'publicObservation']),
  c('hiddenEventConfirmation', 'science', 'Hidden-Event Confirmation', 'Post-mission referee-derived evidence summary for hidden-event follow-up.', 'higherIsBetter', 'confidence', [0, 1], null, ['refereeOnlyDerived'], { refereeOnly: true, objectives: ['confirmHiddenEvent'] }),
  c('sourceLocalization', 'science', 'Source Localization', 'Evidence quality for narrowing an inferred source region.', 'higherIsBetter', 'confidence', [0, 1], null, ['publicObservation', 'refereeOnlyDerived'], { objectives: ['localizeSource'] }),
  c('boundaryMapping', 'science', 'Boundary Mapping', 'Sampling value along a front, boundary, or transition zone.', 'higherIsBetter', 'score-points', [0, 10], null, ['publicObservation', 'publicForecast'], { objectives: ['mapBoundary', 'surveyReconnaissance'] }),
  c('featureTracking', 'science', 'Feature Tracking', 'Evidence that a moving feature was observed across time.', 'higherIsBetter', 'confidence', [0, 1], null, ['publicObservation'], { objectives: ['trackMovingFeature'] }),
  c('stalenessRevisit', 'science', 'Staleness Revisit', 'Value of revisiting stale or under-observed regions.', 'higherIsBetter', 'score-points', [0, 1], null, ['publicBelief'], { objectives: ['revisitStaleRegion', 'persistentMonitoring'] }),
  c('verticalCoverage', 'science', 'Vertical Coverage', 'Fraction of configured depth layers sampled or represented.', 'higherIsBetter', 'fraction', [0, 1], null, ['publicObservation', 'publicMissionRecord']),
  c('observationDiversity', 'science', 'Observation Diversity', 'Fraction of observations in non-duplicate cells/layers.', 'higherIsBetter', 'fraction', [0, 1], null, ['publicObservation']),
  c('samplingRedundancy', 'science', 'Sampling Redundancy', 'Fraction of repeated samples when repetition was not the objective.', 'lowerIsBetter', 'fraction', [0, 1], null, ['publicObservation']),

  c('missionCompletion', 'feasibility', 'Mission Completion', 'Whether the mission reached a terminal completed state.', 'binaryPass', 'boolean', [0, 1], null, ['publicMissionRecord']),
  c('waypointCompletion', 'feasibility', 'Waypoint Completion', 'Fraction of planned waypoints reached or accepted.', 'higherIsBetter', 'fraction', [0, 1], null, ['publicMissionRecord']),
  c('arrivalStatus', 'feasibility', 'Arrival Status', 'Binary completion of the terminal arrival condition.', 'binaryPass', 'boolean', [0, 1], null, ['publicMissionRecord']),
  c('motionFeasibility', 'feasibility', 'Motion Feasibility', 'Whether the submitted route intent was plausibly executable under motion-aware simulation.', 'binaryPass', 'boolean', [0, 1], null, ['publicMissionRecord']),
  c('trackError', 'feasibility', 'Track Error', 'Mean realized-vs-planned track error.', 'lowerIsBetter', 'grid-cells', [0, 5], null, ['publicMissionRecord']),
  c('bottomClearance', 'feasibility', 'Bottom Clearance', 'Clearance quality; one means no warning.', 'higherIsBetter', 'fraction', [0, 1], null, ['publicMissionRecord']),
  c('constraintCompliance', 'feasibility', 'Constraint Compliance', 'Compliance with constraints and restricted cells.', 'higherIsBetter', 'fraction', [0, 1], null, ['publicMissionRecord']),
  c('communicationCompletion', 'feasibility', 'Communication Completion', 'Whether required surfacing/communication goals were completed.', 'binaryPass', 'boolean', [0, 1], null, ['publicMissionRecord']),

  c('energyEfficiency', 'efficiency', 'Energy Efficiency', 'Science value per unit energy used.', 'higherIsBetter', 'score-per-energy', [0, 5], null, ['publicMissionRecord']),
  c('energyRemaining', 'efficiency', 'Energy Remaining', 'Fraction of battery/energy remaining at mission end.', 'higherIsBetter', 'fraction', [0, 1], null, ['publicMissionRecord']),
  c('missionDuration', 'efficiency', 'Mission Duration', 'Elapsed mission duration for the submitted attempt.', 'lowerIsBetter', 'seconds', [0, 7200], null, ['publicMissionRecord']),
  c('realizedDistance', 'efficiency', 'Realized Distance', 'Distance traveled by the realized path.', 'lowerIsBetter', 'grid-cells', [0, 100], null, ['publicMissionRecord']),
  c('currentUtilization', 'efficiency', 'Current Utilization', 'Balance of current assist versus opposition.', 'higherIsBetter', 'score', [0, 1], null, ['publicMissionRecord']),
  c('controlEffort', 'efficiency', 'Control Effort', 'Relative control/steering effort used to follow the path.', 'lowerIsBetter', 'score', [0, 1], null, ['publicMissionRecord']),
  c('payloadEfficiency', 'efficiency', 'Payload Efficiency', 'Science/sample return relative to payload energy estimate.', 'higherIsBetter', 'score-per-energy', [0, 10], null, ['publicMissionRecord']),

  c('hazardExposure', 'safety', 'Hazard Exposure', 'Count or severity proxy for hazardous samples/track points.', 'lowerIsBetter', 'count', [0, 10], null, ['publicMissionRecord']),
  c('constraintViolations', 'safety', 'Constraint Violations', 'Number of restricted-zone or mask violations.', 'lowerIsBetter', 'count', [0, 5], null, ['publicMissionRecord']),
  c('bottomClearanceWarnings', 'safety', 'Bottom-Clearance Warnings', 'Number of bathymetry/depth clearance warnings.', 'lowerIsBetter', 'count', [0, 5], null, ['publicMissionRecord']),
  c('collisionRisk', 'safety', 'Collision Risk', 'Collision or near-miss risk count when available.', 'lowerIsBetter', 'count', [0, 3], null, ['publicMissionRecord']),
  c('communicationLoss', 'safety', 'Communication Loss', 'Communication failures or missed required surfacing events.', 'lowerIsBetter', 'count', [0, 3], null, ['publicMissionRecord']),

  c('objectiveTransitionQuality', 'missionManagement', 'Objective Transition Quality', 'Quality of adaptive objective transitions when present.', 'higherIsBetter', 'confidence', [0, 1], null, ['publicMissionRecord'], { objectives: ['persistentMonitoring', 'validateForecast', 'confirmHiddenEvent'] }),
  c('evidenceFollowupQuality', 'missionManagement', 'Evidence Follow-Up Quality', 'Whether the mission followed up uncertain or surprising evidence.', 'higherIsBetter', 'confidence', [0, 1], null, ['publicObservation', 'publicMissionRecord']),
  c('surfacingDecisionQuality', 'missionManagement', 'Surfacing Decision Quality', 'Quality of surfacing/communication decisions when present.', 'higherIsBetter', 'confidence', [0, 1], null, ['publicMissionRecord']),

  c('cooperativeCoverage', 'fleetCoordination', 'Cooperative Coverage', 'Fleet coverage quality for multi-glider missions.', 'higherIsBetter', 'fraction', [0, 1], null, ['publicMissionRecord'], { objectives: ['cooperativeCoverage'], future: true }),
  c('fleetRedundancy', 'fleetCoordination', 'Fleet Redundancy', 'Redundant fleet sampling when not required.', 'lowerIsBetter', 'fraction', [0, 1], null, ['publicMissionRecord'], { objectives: ['cooperativeCoverage'], future: true }),
  c('contributionBalance', 'fleetCoordination', 'Contribution Balance', 'Balance of contribution across gliders.', 'targetRange', 'fraction', [0, 1], { min: 0.35, max: 0.75 }, ['publicMissionRecord'], { objectives: ['cooperativeCoverage'], future: true }),
  c('communicationCoordination', 'fleetCoordination', 'Communication Coordination', 'Coordination and communication quality across gliders.', 'higherIsBetter', 'confidence', [0, 1], null, ['publicMissionRecord'], { objectives: ['cooperativeCoverage'], future: true })
];

 const MISSION_SCORE_COMPONENTS = Object.freeze(RAW_COMPONENTS.map((component) => Object.freeze(component)));

 function missionScoreComponentById(id) {
  return MISSION_SCORE_COMPONENTS.find((component) => component.id === id) ?? null;
}

 function missionScoreComponentOptions() {
  return MISSION_SCORE_COMPONENTS.map(({ id, label, groupId, refereeOnly }) => ({ id, label, groupId, refereeOnly }));
}

 function validateMissionScoreComponentCatalog() {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  for (const component of MISSION_SCORE_COMPONENTS) {
    if (ids.has(component.id)) errors.push(`Duplicate component id ${component.id}.`);
    ids.add(component.id);
    const validation = MissionScoringSchema.validateMissionScoreComponentDefinition(component);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

 function missionScoreComponentCatalogSummary() {
  const validation = validateMissionScoreComponentCatalog();
  const groups = {};
  for (const component of MISSION_SCORE_COMPONENTS) groups[component.groupId] = (groups[component.groupId] ?? 0) + 1;
  return {
    type: 'anchor.benchmark.score-component-catalog-summary',
    version: MISSION_SCORE_COMPONENTS_VERSION,
    schemaVersion: MISSION_SCORING_SCHEMA_VERSION,
    componentCount: MISSION_SCORE_COMPONENTS.length,
    groups,
    valid: validation.valid,
    warnings: validation.warnings
  };
}

function c(id, groupId, label, description, direction, unit, defaultBounds, defaultTarget, dataSources, options = {}) {
  return MissionScoringSchema.createMissionScoreComponentDefinition({
    id,
    groupId,
    label,
    description,
    direction,
    unit,
    defaultBounds,
    defaultTarget,
    dataSources,
    refereeOnly: options.refereeOnly === true,
    applicableObjectives: options.objectives ?? ALL_OBJECTIVES,
    explanation: options.explanation ?? description,
    missingDataMeaning: options.future ? 'Fleet metrics are optional/future for single-glider missions and remain unavailable unless explicit fleet data exists.' : undefined,
    notA: ['not official browser scoring', 'not route planning', 'not route optimization']
  });
}

module.exports = {MISSION_SCORE_COMPONENTS, missionScoreComponentById, missionScoreComponentOptions, validateMissionScoreComponentCatalog, missionScoreComponentCatalogSummary}