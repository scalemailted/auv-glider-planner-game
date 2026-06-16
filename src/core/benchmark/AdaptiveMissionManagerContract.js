export const ADAPTIVE_MISSION_MANAGER_CONTRACT_VERSION = 'adaptive-mission-manager-contract-p6';

export const ADAPTIVE_MANAGER_POLICY_IDS = [
  'transparentRuleManager',
  'uncertaintyFirstManager',
  'forecastValidationManager',
  'hiddenEventFollowupManager',
  'boundaryMappingManager',
  'persistentMonitoringManager',
  'sourceLocalizationManager',
  'balancedAdaptiveManager'
];

export const ADAPTIVE_DIAGNOSIS_IDS = [
  'agreesWithForecast',
  'reduceUncertainty',
  'likelyForecastError',
  'possibleHiddenEvent',
  'likelyHiddenEvent',
  'boundaryAmbiguous',
  'staleRegionNeedsRevisit',
  'sourceLikelyUpstream',
  'hazardOrReachabilityIssue',
  'insufficientEvidence',
  'likelyNoiseOrFalseAlarm'
];

export const ADAPTIVE_OBJECTIVE_TRANSITION_IDS = [
  'keepCurrentObjective',
  'switchToReduceUncertainty',
  'switchToValidateForecast',
  'switchToConfirmHiddenEvent',
  'switchToMapBoundary',
  'switchToTrackFeature',
  'switchToLocalizeSource',
  'switchToRevisitStaleRegion',
  'switchToExploitKnownValue',
  'pauseForMoreEvidence'
];

export const ADAPTIVE_SURFACING_EVENT_TYPES = [
  'scheduledSurfacing',
  'communicationWindow',
  'observationUpload',
  'objectiveUpdateWindow',
  'emergencySurface',
  'manualReview'
];

export const ADAPTIVE_DEFAULT_POLICY_ID = 'transparentRuleManager';

const POLICY_DEFINITIONS = [
  policy('transparentRuleManager', 'Transparent Rule Manager', 'Balanced, readable rules for classroom inspection.', {
    uncertainty: 1,
    forecastError: 1,
    hiddenEvent: 1,
    boundary: 1,
    staleness: 1,
    sourceLocalization: 1,
    hazard: 1,
    evidenceConservatism: 1
  }),
  policy('uncertaintyFirstManager', 'Uncertainty First', 'Prioritizes expected uncertainty reduction before other science goals.', {
    uncertainty: 1.45,
    forecastError: 0.9,
    hiddenEvent: 0.9,
    boundary: 1,
    staleness: 1,
    sourceLocalization: 0.85,
    hazard: 1,
    evidenceConservatism: 1
  }),
  policy('forecastValidationManager', 'Forecast Validation', 'Weights coherent forecast error and observation surprise more heavily.', {
    uncertainty: 0.85,
    forecastError: 1.55,
    hiddenEvent: 0.9,
    boundary: 1,
    staleness: 0.85,
    sourceLocalization: 0.85,
    hazard: 1,
    evidenceConservatism: 1
  }),
  policy('hiddenEventFollowupManager', 'Hidden Event Follow-Up', 'Favors follow-up when observations suggest a hidden plume, bloom, or event.', {
    uncertainty: 0.85,
    forecastError: 0.9,
    hiddenEvent: 1.55,
    boundary: 0.9,
    staleness: 0.85,
    sourceLocalization: 1,
    hazard: 1,
    evidenceConservatism: 0.9
  }),
  policy('boundaryMappingManager', 'Boundary Mapping', 'Favors fronts, gradients, and ambiguous boundary locations.', {
    uncertainty: 0.95,
    forecastError: 1,
    hiddenEvent: 0.85,
    boundary: 1.55,
    staleness: 0.85,
    sourceLocalization: 0.95,
    hazard: 1,
    evidenceConservatism: 1
  }),
  policy('persistentMonitoringManager', 'Persistent Monitoring', 'Weights stale-region revisits and age-of-information more strongly.', {
    uncertainty: 0.95,
    forecastError: 0.9,
    hiddenEvent: 0.9,
    boundary: 0.9,
    staleness: 1.6,
    sourceLocalization: 0.8,
    hazard: 1,
    evidenceConservatism: 1
  }),
  policy('sourceLocalizationManager', 'Source Localization', 'Favors upstream or recurring source hypotheses after plume-like evidence.', {
    uncertainty: 0.85,
    forecastError: 0.9,
    hiddenEvent: 1.05,
    boundary: 0.9,
    staleness: 0.8,
    sourceLocalization: 1.65,
    hazard: 1,
    evidenceConservatism: 1
  }),
  policy('balancedAdaptiveManager', 'Balanced Adaptive', 'Balances uncertainty, forecast validation, hidden events, staleness, and safety.', {
    uncertainty: 1.1,
    forecastError: 1.1,
    hiddenEvent: 1.1,
    boundary: 1.05,
    staleness: 1.05,
    sourceLocalization: 1.05,
    hazard: 1.15,
    evidenceConservatism: 1
  })
];

const DIAGNOSIS_DEFINITIONS = [
  diagnosis('agreesWithForecast', 'Agrees With Forecast', 'Observations support the forecast or belief field.', 'switchToExploitKnownValue', 'exploitKnownValue'),
  diagnosis('reduceUncertainty', 'Reduce Uncertainty', 'Uncertainty is high and hidden-event evidence is weak.', 'switchToReduceUncertainty', 'reduceUncertainty'),
  diagnosis('likelyForecastError', 'Likely Forecast Error', 'Coherent observations disagree with the forecast.', 'switchToValidateForecast', 'validateForecast'),
  diagnosis('possibleHiddenEvent', 'Possible Hidden Event', 'Observations weakly suggest a hidden event that needs follow-up.', 'switchToConfirmHiddenEvent', 'confirmHiddenEvent'),
  diagnosis('likelyHiddenEvent', 'Likely Hidden Event', 'Hidden-event evidence is strong enough to confirm directly.', 'switchToConfirmHiddenEvent', 'confirmHiddenEvent'),
  diagnosis('boundaryAmbiguous', 'Boundary Ambiguous', 'A front, gradient, or event boundary is poorly localized.', 'switchToMapBoundary', 'mapBoundary'),
  diagnosis('staleRegionNeedsRevisit', 'Stale Region Needs Revisit', 'Important information is too old for the current mission state.', 'switchToRevisitStaleRegion', 'revisitStaleRegion'),
  diagnosis('sourceLikelyUpstream', 'Source Likely Upstream', 'Evidence points toward a likely source region.', 'switchToLocalizeSource', 'localizeSource'),
  diagnosis('hazardOrReachabilityIssue', 'Hazard Or Reachability Issue', 'The current route context may be unsafe or difficult to reach.', 'keepCurrentObjective', null),
  diagnosis('insufficientEvidence', 'Insufficient Evidence', 'The manager does not have enough recent evidence to switch objectives.', 'pauseForMoreEvidence', null),
  diagnosis('likelyNoiseOrFalseAlarm', 'Likely Noise Or False Alarm', 'The observations are more consistent with noise than a real event.', 'pauseForMoreEvidence', null)
];

const DEFAULT_THRESHOLDS = {
  highUncertainty: 0.65,
  highForecastError: 0.6,
  hiddenEvent: 0.62,
  likelyHiddenEvent: 0.78,
  boundaryAmbiguity: 0.58,
  staleRegion: 0.6,
  sourceLocalization: 0.6,
  noiseFalseAlarm: 0.7,
  hazardPressure: 0.65,
  minConfidence: 0.35
};

const DEFAULT_ALLOWED_OBJECTIVES = [
  'exploitKnownValue',
  'reduceUncertainty',
  'validateForecast',
  'confirmHiddenEvent',
  'mapBoundary',
  'trackFeature',
  'localizeSource',
  'revisitStaleRegion',
  'avoidHazard',
  'conserveEnergy',
  'reconnaissanceSurvey'
];

const REQUIRED_NOT_A = [
  'not a production autonomy system',
  'not MARL/RL',
  'not a route planner',
  'not calibrated ocean data assimilation'
];

export function normalizeAdaptiveManagerPolicyId(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    transparent: 'transparentRuleManager',
    rule: 'transparentRuleManager',
    uncertainty: 'uncertaintyFirstManager',
    forecast: 'forecastValidationManager',
    hiddenEvent: 'hiddenEventFollowupManager',
    hidden: 'hiddenEventFollowupManager',
    boundary: 'boundaryMappingManager',
    persistent: 'persistentMonitoringManager',
    stale: 'persistentMonitoringManager',
    source: 'sourceLocalizationManager',
    balanced: 'balancedAdaptiveManager'
  };
  return aliases[value] ?? (ADAPTIVE_MANAGER_POLICY_IDS.includes(value) ? value : ADAPTIVE_DEFAULT_POLICY_ID);
}

export function normalizeAdaptiveDiagnosisId(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    agrees: 'agreesWithForecast',
    uncertainty: 'reduceUncertainty',
    forecastError: 'likelyForecastError',
    hiddenEvent: 'likelyHiddenEvent',
    possibleHidden: 'possibleHiddenEvent',
    boundary: 'boundaryAmbiguous',
    stale: 'staleRegionNeedsRevisit',
    source: 'sourceLikelyUpstream',
    hazard: 'hazardOrReachabilityIssue',
    insufficient: 'insufficientEvidence',
    noise: 'likelyNoiseOrFalseAlarm'
  };
  return aliases[value] ?? (ADAPTIVE_DIAGNOSIS_IDS.includes(value) ? value : 'insufficientEvidence');
}

export function normalizeAdaptiveObjectiveTransitionId(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    keep: 'keepCurrentObjective',
    uncertainty: 'switchToReduceUncertainty',
    forecast: 'switchToValidateForecast',
    hiddenEvent: 'switchToConfirmHiddenEvent',
    boundary: 'switchToMapBoundary',
    track: 'switchToTrackFeature',
    source: 'switchToLocalizeSource',
    stale: 'switchToRevisitStaleRegion',
    exploit: 'switchToExploitKnownValue',
    pause: 'pauseForMoreEvidence'
  };
  return aliases[value] ?? (ADAPTIVE_OBJECTIVE_TRANSITION_IDS.includes(value) ? value : 'keepCurrentObjective');
}

export function adaptiveManagerPolicyOptions() {
  return POLICY_DEFINITIONS.map((policyDefinition) => ({
    id: policyDefinition.id,
    label: policyDefinition.label,
    description: policyDefinition.description,
    weights: { ...policyDefinition.weights }
  }));
}

export function adaptiveDiagnosisOptions() {
  return DIAGNOSIS_DEFINITIONS.map((diagnosisDefinition) => ({ ...diagnosisDefinition }));
}

export function adaptiveManagerPolicyById(id) {
  const policyId = normalizeAdaptiveManagerPolicyId(id);
  const definition = POLICY_DEFINITIONS.find((entry) => entry.id === policyId) ?? POLICY_DEFINITIONS[0];
  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    weights: { ...definition.weights }
  };
}

export function adaptiveDiagnosisById(id) {
  const diagnosisId = normalizeAdaptiveDiagnosisId(id);
  return { ...(DIAGNOSIS_DEFINITIONS.find((entry) => entry.id === diagnosisId) ?? DIAGNOSIS_DEFINITIONS[0]) };
}

export function createAdaptiveMissionManagerConfig(options = {}) {
  const policyDefinition = adaptiveManagerPolicyById(options.policyId ?? options.managerPolicyId);
  const thresholds = normalizeNumberMap({ ...DEFAULT_THRESHOLDS, ...(options.thresholds ?? {}) }, 0, 1);
  const policyWeights = normalizeWeightMap({ ...policyDefinition.weights, ...(options.weights ?? {}) });
  const allowedObjectives = normalizeStringList(options.allowedObjectives).length
    ? normalizeStringList(options.allowedObjectives)
    : [...DEFAULT_ALLOWED_OBJECTIVES];
  const notA = mergeUnique([...REQUIRED_NOT_A, ...normalizeStringList(options.notA)]);
  return {
    type: 'anchor.benchmark.adaptive-manager-config',
    version: ADAPTIVE_MISSION_MANAGER_CONTRACT_VERSION,
    policyId: policyDefinition.id,
    policyLabel: policyDefinition.label,
    benchmarkMode: 'adaptiveBenchmark',
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    informationAccessTier: String(options.informationAccessTier ?? 'beliefOnly'),
    worldModelTier: String(options.worldModelTier ?? 'stochasticBelief'),
    decisionCadence: String(options.decisionCadence ?? 'surfacingWindow'),
    surfacingRequired: options.surfacingRequired !== false,
    thresholds,
    weights: policyWeights,
    allowedObjectives,
    claimLevel: String(options.claimLevel ?? 'syntheticTransparentContract'),
    notA,
    notes: normalizeStringList(options.notes)
  };
}

export function validateAdaptiveMissionManagerConfig(config = {}) {
  const errors = [];
  const warnings = [];
  if (!config || typeof config !== 'object') {
    return { status: 'FAIL', valid: false, errors: ['Adaptive manager config must be an object.'], warnings };
  }
  if (config.type !== 'anchor.benchmark.adaptive-manager-config') errors.push(`Expected type anchor.benchmark.adaptive-manager-config, got ${config.type ?? 'missing'}.`);
  if (config.version !== ADAPTIVE_MISSION_MANAGER_CONTRACT_VERSION) warnings.push(`Unexpected adaptive manager config version: ${config.version ?? 'missing'}.`);
  if (!ADAPTIVE_MANAGER_POLICY_IDS.includes(config.policyId)) errors.push(`Unknown policyId: ${config.policyId ?? 'missing'}.`);
  if (config.benchmarkMode !== 'adaptiveBenchmark') errors.push('benchmarkMode must be adaptiveBenchmark.');
  if (config.objectiveAuthority !== 'missionManager') errors.push('objectiveAuthority must be missionManager.');
  if (config.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (!config.informationAccessTier) warnings.push('informationAccessTier is missing; beliefOnly is the default contract tier.');
  if (!config.worldModelTier) warnings.push('worldModelTier is missing; stochasticBelief is the default contract tier.');
  if (!config.thresholds || typeof config.thresholds !== 'object') errors.push('thresholds must be an object.');
  if (!config.weights || typeof config.weights !== 'object') errors.push('weights must be an object.');
  if (!Array.isArray(config.allowedObjectives) || config.allowedObjectives.length === 0) errors.push('allowedObjectives must be a non-empty array.');
  const notA = normalizeStringList(config.notA);
  for (const boundary of REQUIRED_NOT_A) {
    if (!notA.some((entry) => entry.toLowerCase() === boundary.toLowerCase())) {
      errors.push(`notA must include "${boundary}".`);
    }
  }
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function adaptiveMissionManagerSummary(config = {}) {
  const normalized = config?.type === 'anchor.benchmark.adaptive-manager-config'
    ? config
    : createAdaptiveMissionManagerConfig(config);
  const policyDefinition = adaptiveManagerPolicyById(normalized.policyId);
  const validation = validateAdaptiveMissionManagerConfig(normalized);
  return {
    type: normalized.type,
    version: normalized.version,
    policyId: normalized.policyId,
    policyLabel: normalized.policyLabel ?? policyDefinition.label,
    benchmarkMode: normalized.benchmarkMode,
    objectiveAuthority: normalized.objectiveAuthority,
    routeAuthority: normalized.routeAuthority,
    decisionCadence: normalized.decisionCadence,
    surfacingRequired: normalized.surfacingRequired,
    allowedObjectiveCount: Array.isArray(normalized.allowedObjectives) ? normalized.allowedObjectives.length : 0,
    claimLevel: normalized.claimLevel,
    valid: validation.valid,
    status: validation.status,
    boundarySummary: 'Mission manager may choose objectives; the player or solver still chooses the route.'
  };
}

function policy(id, label, description, weights) {
  return { id, label, description, weights };
}

function diagnosis(id, label, description, recommendedTransitionId, recommendedObjectiveId) {
  return { id, label, description, recommendedTransitionId, recommendedObjectiveId };
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];
}

function normalizeNumberMap(value, min, max) {
  const output = {};
  for (const [key, entry] of Object.entries(value ?? {})) {
    const number = Number(entry);
    output[key] = Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : DEFAULT_THRESHOLDS[key] ?? min;
  }
  return output;
}

function normalizeWeightMap(value) {
  const output = {};
  for (const [key, entry] of Object.entries(value ?? {})) {
    const number = Number(entry);
    output[key] = Number.isFinite(number) ? Math.max(0, number) : 1;
  }
  return output;
}

function mergeUnique(values) {
  const output = [];
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized && !output.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) output.push(normalized);
  }
  return output;
}
