import { MISSION_OBJECTIVE_IDS, missionObjectiveById, normalizeMissionObjectiveId } from './MissionObjectiveTaxonomy.js';
import {
  ADAPTIVE_OBJECTIVE_TRANSITION_IDS,
  normalizeAdaptiveDiagnosisId,
  normalizeAdaptiveObjectiveTransitionId
} from './AdaptiveMissionManagerContract.js';
import { normalizeScienceDiagnosisId, recommendedObjectiveForScienceDiagnosis } from '../science/ScienceDiagnosisTypes.js';

export const ADAPTIVE_OBJECTIVE_POLICY_VERSION = 'adaptive-objective-policy-p6';

const DIAGNOSIS_TO_TRANSITION = {
  agreesWithForecast: 'switchToExploitKnownValue',
  reduceUncertainty: 'switchToReduceUncertainty',
  likelyForecastError: 'switchToValidateForecast',
  possibleHiddenEvent: 'switchToConfirmHiddenEvent',
  likelyHiddenEvent: 'switchToConfirmHiddenEvent',
  boundaryAmbiguous: 'switchToMapBoundary',
  staleRegionNeedsRevisit: 'switchToRevisitStaleRegion',
  sourceLikelyUpstream: 'switchToLocalizeSource',
  hazardOrReachabilityIssue: 'keepCurrentObjective',
  insufficientEvidence: 'pauseForMoreEvidence',
  likelyNoiseOrFalseAlarm: 'pauseForMoreEvidence'
};

const TRANSITION_TO_OBJECTIVE = {
  keepCurrentObjective: null,
  switchToReduceUncertainty: 'reduceUncertainty',
  switchToValidateForecast: 'validateForecast',
  switchToConfirmHiddenEvent: 'confirmHiddenEvent',
  switchToMapBoundary: 'mapBoundary',
  switchToTrackFeature: 'trackFeature',
  switchToLocalizeSource: 'localizeSource',
  switchToRevisitStaleRegion: 'revisitStaleRegion',
  switchToExploitKnownValue: 'exploitKnownValue',
  pauseForMoreEvidence: null
};

export function selectNextAdaptiveObjective({
  diagnosis,
  currentObjective,
  objectiveHistory = [],
  managerConfig = {},
  missionContext = {}
} = {}) {
  const currentObjectiveId = objectiveIdFrom(currentObjective ?? missionContext.currentObjectiveId ?? diagnosis?.activeObjectiveId ?? 'reconnaissanceSurvey');
  const diagnosisId = normalizeAdaptiveDiagnosisId(diagnosis?.primaryDiagnosis ?? diagnosis?.diagnosisId);
  let transitionId = normalizeAdaptiveObjectiveTransitionId(diagnosis?.recommendedTransitionId ?? DIAGNOSIS_TO_TRANSITION[diagnosisId]);
  const sciencePolicy = scienceObjectivePolicy(diagnosis, missionContext, currentObjectiveId);
  if (sciencePolicy?.transitionId) transitionId = normalizeAdaptiveObjectiveTransitionId(sciencePolicy.transitionId);
  if (diagnosisId === 'agreesWithForecast' && currentObjectiveId === 'exploitKnownValue') transitionId = 'keepCurrentObjective';
  const proposedObjectiveId = normalizeMissionObjectiveId(sciencePolicy?.objectiveId ?? diagnosis?.recommendedObjectiveId ?? TRANSITION_TO_OBJECTIVE[transitionId] ?? currentObjectiveId);
  const allowedObjectives = Array.isArray(managerConfig.allowedObjectives) && managerConfig.allowedObjectives.length
    ? managerConfig.allowedObjectives.map((id) => normalizeMissionObjectiveId(id))
    : MISSION_OBJECTIVE_IDS;
  const toObjectiveId = transitionId === 'keepCurrentObjective' || transitionId === 'pauseForMoreEvidence'
    ? currentObjectiveId
    : allowedObjectives.includes(proposedObjectiveId)
      ? proposedObjectiveId
      : currentObjectiveId;
  const transitionRecord = createAdaptiveObjectiveTransitionRecord({
    episodeId: missionContext.episodeId ?? diagnosis?.episodeId ?? managerConfig.episodeId ?? 'adaptive-preview-episode',
    time: diagnosis?.time ?? missionContext.time ?? 0,
    fromObjectiveId: currentObjectiveId,
    toObjectiveId,
    transitionId,
    diagnosisId,
    confidence: diagnosis?.confidence ?? 0,
    rationale: diagnosis?.rationale ?? 'Adaptive objective selected by transparent rule policy.',
    evidenceSummary: buildEvidenceSummary(diagnosis, missionContext),
    notes: [
      'Objective authority belongs to the mission manager.',
      'Route authority remains with the player or solver.',
      ...(sciencePolicy?.note ? [sciencePolicy.note] : []),
      ...(Array.isArray(diagnosis?.warnings) ? diagnosis.warnings : []),
      ...(Array.isArray(missionContext.notes) ? missionContext.notes : [])
    ]
  });
  return {
    type: 'anchor.benchmark.adaptive-objective-selection',
    version: ADAPTIVE_OBJECTIVE_POLICY_VERSION,
    benchmarkMode: 'adaptiveBenchmark',
    policyId: managerConfig.policyId ?? 'transparentRuleManager',
    currentObjective: missionObjectiveById(currentObjectiveId),
    recommendedObjective: missionObjectiveById(toObjectiveId),
    objective: missionObjectiveById(toObjectiveId),
    transitionId,
    transitionRecord,
    objectiveHistory: normalizeObjectiveHistory(objectiveHistory),
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    usesRoutePlanning: false,
    usesMissionScoring: false,
    usesMARL: false
  };
}

export function createAdaptiveObjectiveTransitionRecord(options = {}) {
  const fromObjectiveId = normalizeMissionObjectiveId(options.fromObjectiveId ?? options.currentObjectiveId ?? 'reconnaissanceSurvey');
  const transitionId = normalizeAdaptiveObjectiveTransitionId(options.transitionId);
  const toObjectiveId = normalizeMissionObjectiveId(options.toObjectiveId ?? TRANSITION_TO_OBJECTIVE[transitionId] ?? fromObjectiveId);
  return {
    type: 'anchor.benchmark.adaptive-objective-transition',
    version: ADAPTIVE_OBJECTIVE_POLICY_VERSION,
    episodeId: String(options.episodeId ?? 'adaptive-preview-episode'),
    time: finiteNumber(options.time, 0),
    fromObjectiveId,
    toObjectiveId,
    transitionId,
    authority: 'missionManager',
    diagnosisId: normalizeAdaptiveDiagnosisId(options.diagnosisId ?? options.primaryDiagnosis),
    confidence: clamp01(options.confidence, 0),
    rationale: String(options.rationale ?? 'Transparent mission-manager rule selected the next objective.'),
    evidenceSummary: normalizeEvidenceSummary(options.evidenceSummary),
    routeAuthority: 'playerOrSolver',
    notes: normalizeStringList(options.notes)
  };
}

export function validateAdaptiveObjectiveTransitionRecord(record = {}) {
  const errors = [];
  const warnings = [];
  if (!record || typeof record !== 'object') {
    return { status: 'FAIL', valid: false, errors: ['Adaptive objective transition record must be an object.'], warnings };
  }
  if (record.type !== 'anchor.benchmark.adaptive-objective-transition') errors.push(`Expected type anchor.benchmark.adaptive-objective-transition, got ${record.type ?? 'missing'}.`);
  if (!record.episodeId) errors.push('episodeId is required.');
  if (!MISSION_OBJECTIVE_IDS.includes(record.fromObjectiveId)) errors.push(`Unknown fromObjectiveId: ${record.fromObjectiveId ?? 'missing'}.`);
  if (!MISSION_OBJECTIVE_IDS.includes(record.toObjectiveId)) errors.push(`Unknown toObjectiveId: ${record.toObjectiveId ?? 'missing'}.`);
  if (!ADAPTIVE_OBJECTIVE_TRANSITION_IDS.includes(record.transitionId)) errors.push(`Unknown transitionId: ${record.transitionId ?? 'missing'}.`);
  if (record.authority !== 'missionManager') errors.push('authority must be missionManager.');
  if (record.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (!Number.isFinite(Number(record.time))) errors.push('time must be finite.');
  const confidence = Number(record.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) errors.push('confidence must be in [0, 1].');
  if (record.transitionId === 'pauseForMoreEvidence' && record.fromObjectiveId !== record.toObjectiveId) {
    warnings.push('pauseForMoreEvidence usually keeps the current objective until more evidence arrives.');
  }
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function adaptiveObjectiveTransitionSummary(record = {}) {
  const transition = createAdaptiveObjectiveTransitionRecord(record);
  return {
    type: transition.type,
    episodeId: transition.episodeId,
    transitionId: transition.transitionId,
    fromObjective: missionObjectiveById(transition.fromObjectiveId).label,
    toObjective: missionObjectiveById(transition.toObjectiveId).label,
    diagnosisId: transition.diagnosisId,
    confidence: transition.confidence,
    objectiveAuthority: transition.authority,
    routeAuthority: transition.routeAuthority,
    summary: `${missionObjectiveById(transition.fromObjectiveId).label} -> ${missionObjectiveById(transition.toObjectiveId).label}`
  };
}

function scienceObjectivePolicy(diagnosis = {}, missionContext = {}, currentObjectiveId = 'reconnaissanceSurvey') {
  const source = diagnosis.primaryScienceDiagnosis ?? diagnosis.scienceDiscovery?.primaryDiagnosis ?? missionContext.scienceDiscovery?.primaryDiagnosis;
  if (!source) return null;
  const scienceDiagnosisId = normalizeScienceDiagnosisId(source, null);
  if (!scienceDiagnosisId) return null;
  const objectiveId = diagnosis.recommendedObjectiveId
    ?? missionContext.scienceDiscovery?.recommendedObjectiveId
    ?? recommendedObjectiveForScienceDiagnosis(scienceDiagnosisId, {
      currentObjectiveId,
      eventFamily: diagnosis.hiddenEventHypothesisSummary?.eventFamily ?? missionContext.scienceDiscovery?.hiddenEventHypothesis?.eventFamily
    });
  const transitionId = transitionForScienceObjective(scienceDiagnosisId, objectiveId, currentObjectiveId);
  return {
    scienceDiagnosisId,
    objectiveId,
    transitionId,
    note: `P9 science diagnosis ${scienceDiagnosisId} mapped to ${objectiveId}; objective authority remains with the mission manager.`
  };
}

function transitionForScienceObjective(scienceDiagnosisId, objectiveId, currentObjectiveId) {
  if (scienceDiagnosisId === 'likelySensorNoise' || scienceDiagnosisId === 'insufficientEvidence') return 'pauseForMoreEvidence';
  if (scienceDiagnosisId === 'agreesWithForecast' && currentObjectiveId === 'exploitKnownValue') return 'keepCurrentObjective';
  return {
    reduceUncertainty: 'switchToReduceUncertainty',
    validateForecast: 'switchToValidateForecast',
    confirmHiddenEvent: 'switchToConfirmHiddenEvent',
    mapBoundary: 'switchToMapBoundary',
    trackFeature: 'switchToTrackFeature',
    localizeSource: 'switchToLocalizeSource',
    revisitStaleRegion: 'switchToRevisitStaleRegion',
    exploitKnownValue: 'switchToExploitKnownValue'
  }[objectiveId] ?? 'keepCurrentObjective';
}
function objectiveIdFrom(value) {
  if (value && typeof value === 'object') return normalizeMissionObjectiveId(value.id ?? value.objectiveId);
  return normalizeMissionObjectiveId(value);
}

function buildEvidenceSummary(diagnosis = {}, missionContext = {}) {
  const source = diagnosis?.evidenceSummary ?? missionContext?.evidenceSummary ?? {};
  return normalizeEvidenceSummary({
    observationCount: source.observationCount ?? missionContext.observationCount,
    recentObservationCount: source.recentObservationCount ?? missionContext.recentObservationCount,
    primaryDiagnosis: diagnosis?.primaryDiagnosis,
    primaryScienceDiagnosis: diagnosis?.primaryScienceDiagnosis ?? source.primaryScienceDiagnosis ?? missionContext.scienceDiscovery?.primaryDiagnosis,
    confidence: diagnosis?.confidence,
    fieldsAvailable: source.fieldsAvailable ?? missionContext.fieldsAvailable,
    topScores: source.topScores ?? diagnosis?.scores
  });
}

function normalizeEvidenceSummary(value = {}) {
  return {
    observationCount: Math.max(0, Math.round(finiteNumber(value.observationCount, 0))),
    recentObservationCount: Math.max(0, Math.round(finiteNumber(value.recentObservationCount, 0))),
    primaryDiagnosis: value.primaryDiagnosis ? normalizeAdaptiveDiagnosisId(value.primaryDiagnosis) : null,
    primaryScienceDiagnosis: value.primaryScienceDiagnosis ? String(value.primaryScienceDiagnosis) : null,
    confidence: clamp01(value.confidence, 0),
    fieldsAvailable: normalizeStringList(value.fieldsAvailable),
    topScores: normalizeTopScores(value.topScores)
  };
}

function normalizeTopScores(scores = {}) {
  if (!scores || typeof scores !== 'object') return [];
  return Object.entries(scores)
    .filter(([, value]) => Number.isFinite(Number(value)))
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 4)
    .map(([id, score]) => ({ id, score: Number(Number(score).toFixed(4)) }));
}

function normalizeObjectiveHistory(history) {
  return Array.isArray(history)
    ? history.map((entry) => ({ ...entry })).filter((entry) => entry && typeof entry === 'object')
    : [];
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean)
    : [];
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}


