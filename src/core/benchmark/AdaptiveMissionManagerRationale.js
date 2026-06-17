import { adaptiveDiagnosisById } from './AdaptiveMissionManagerContract.js';
import { missionObjectiveById, MISSION_OBJECTIVE_IDS, normalizeMissionObjectiveId } from './MissionObjectiveTaxonomy.js';
import {
  adaptiveScienceDiagnosisHandoffSummary,
  createAdaptiveScienceDiagnosisContext
} from './AdaptiveScienceDiagnosisHandoff.js';

export const ADAPTIVE_MISSION_MANAGER_RATIONALE_VERSION = 'adaptive-mission-manager-rationale-p10';

const RATIONALE_TYPE = 'anchor.benchmark.adaptive-mission-manager-rationale';
const HIDDEN_KEYS = new Set(['T_hiddenTruth', 'hiddenTruth', 'truth', 'truthField', 'truthFields', 'eventIntensity', 'trueRoi']);
const NOT_A = [
  'not route planning',
  'not waypoint generation',
  'not production data assimilation',
  'not official scoring',
  'not full 3D planning',
  'not MARL/RL'
];

export function createAdaptiveMissionManagerRationale(options = {}) {
  const currentObjectiveId = normalizeMissionObjectiveId(options.currentObjectiveId ?? options.currentObjective?.id ?? options.transition?.fromObjectiveId ?? 'reconnaissanceSurvey');
  const recommendedObjectiveId = normalizeMissionObjectiveId(options.recommendedObjectiveId ?? options.recommendedObjective?.id ?? options.transition?.toObjectiveId ?? currentObjectiveId);
  const scienceDiagnosisContext = options.scienceDiagnosisContext
    ? clonePublic(options.scienceDiagnosisContext)
    : options.scienceDiscovery || options.diagnosis?.primaryScienceDiagnosis
      ? createAdaptiveScienceDiagnosisContext(options)
      : null;
  const evidenceSummary = summarizeEvidence(options.evidence, options.diagnosis, scienceDiagnosisContext);
  const explanation = cleanText(options.explanation)
    ?? explainAdaptiveObjectiveRecommendation({
      evidence: options.evidence,
      diagnosis: options.diagnosis,
      scienceDiagnosisContext,
      currentObjective: missionObjectiveById(currentObjectiveId),
      recommendedObjective: missionObjectiveById(recommendedObjectiveId),
      transition: options.transition,
      managerConfig: options.managerConfig
    });
  return compactObject({
    type: RATIONALE_TYPE,
    version: ADAPTIVE_MISSION_MANAGER_RATIONALE_VERSION,
    episodeId: String(options.episodeId ?? scienceDiagnosisContext?.episodeId ?? options.diagnosis?.episodeId ?? 'adaptive-preview-episode'),
    legIndex: Math.max(0, Math.round(finiteNumber(options.legIndex ?? scienceDiagnosisContext?.legIndex ?? 0, 0))),
    policyId: String(options.policyId ?? options.managerConfig?.policyId ?? 'transparentRuleManager'),
    currentObjectiveId,
    recommendedObjectiveId,
    recommendedDiveProfileId: cleanText(options.recommendedDiveProfileId ?? options.diagnosis?.recommendedDiveProfileId ?? scienceDiagnosisContext?.recommendedDiveProfileId ?? null),
    transitionId: String(options.transitionId ?? options.transition?.transitionId ?? options.diagnosis?.recommendedTransitionId ?? 'keepCurrentObjective'),
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    evidenceSummary,
    scienceDiagnosisContext,
    objectiveReason: objectiveReason(options.diagnosis, scienceDiagnosisContext, options.transition),
    alternativeObjectives: normalizeAlternativeObjectives(options.alternativeObjectives, recommendedObjectiveId, currentObjectiveId),
    confidence: clamp01(options.confidence ?? options.transition?.confidence ?? options.diagnosis?.confidence ?? scienceDiagnosisContext?.confidence, 0),
    caveats: uniqueStrings([
      ...stringList(options.caveats),
      ...stringList(options.diagnosis?.warnings),
      ...stringList(scienceDiagnosisContext?.warnings)
    ]),
    routePlanningAuthority: 'playerOrSolver',
    diagnosisIsPlannerAuthority: false,
    generatedRoute: false,
    explanation,
    warnings: uniqueStrings([
      ...(scienceDiagnosisContext ? [] : ['Science diagnosis context was unavailable; rationale uses the adaptive evidence summary.']),
      ...stringList(options.warnings)
    ]),
    notA: [...NOT_A]
  });
}

export function explainAdaptiveObjectiveRecommendation({
  evidence = {},
  diagnosis = {},
  scienceDiagnosisContext = null,
  currentObjective = null,
  recommendedObjective = null,
  transition = {},
  managerConfig = {}
} = {}) {
  const current = currentObjective?.label ?? missionObjectiveById(transition?.fromObjectiveId ?? evidence.activeObjectiveId ?? 'reconnaissanceSurvey').label;
  const recommended = recommendedObjective?.label ?? missionObjectiveById(transition?.toObjectiveId ?? diagnosis.recommendedObjectiveId ?? evidence.activeObjectiveId ?? 'reconnaissanceSurvey').label;
  const diagnosisText = scienceDiagnosisContext?.primaryScienceDiagnosisLabel
    ?? diagnosis.primaryScienceDiagnosisLabel
    ?? diagnosis.primaryDiagnosisLabel
    ?? adaptiveDiagnosisById(diagnosis.primaryDiagnosis).label;
  const scienceSentence = scienceDiagnosisContext
    ? ' Science diagnosis informs the mission-manager recommendation. It does not generate a route.'
    : ' Science diagnosis was unavailable, so the mission manager used the available adaptive evidence summary.';
  const confidence = formatPercent(scienceDiagnosisContext?.confidence ?? diagnosis.confidence ?? transition?.confidence);
  const policy = managerConfig?.policyLabel ?? managerConfig?.policyId ?? 'transparent mission-manager policy';
  return `${policy} recommends ${recommended} from ${current} because ${diagnosisText} is the strongest objective-level signal (confidence ${confidence}).${scienceSentence} The player or solver still plans the next route.`;
}

export function validateAdaptiveMissionManagerRationale(record = {}) {
  const errors = [];
  const warnings = [];
  if (!record || typeof record !== 'object') errors.push('Adaptive mission-manager rationale must be an object.');
  if (record?.type !== RATIONALE_TYPE) errors.push(`Expected type ${RATIONALE_TYPE}, got ${record?.type ?? 'missing'}.`);
  if (!record?.episodeId) errors.push('episodeId is required.');
  if (record?.objectiveAuthority !== 'missionManager') errors.push('objectiveAuthority must be missionManager.');
  if (record?.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (record?.routePlanningAuthority !== 'playerOrSolver') errors.push('routePlanningAuthority must be playerOrSolver.');
  if (record?.diagnosisIsPlannerAuthority !== false) errors.push('diagnosisIsPlannerAuthority must be false.');
  if (record?.generatedRoute !== false) errors.push('generatedRoute must be false.');
  if (containsHiddenPayload(record)) errors.push('Mission-manager rationale must not contain hidden-truth payloads.');
  if (!record?.scienceDiagnosisContext) warnings.push('scienceDiagnosisContext is missing; older records may omit P10 science context.');
  const notA = stringList(record?.notA).join(' ').toLowerCase();
  for (const required of NOT_A) {
    if (!notA.includes(required.toLowerCase())) errors.push(`notA must include ${required}.`);
  }
  return { status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', valid: errors.length === 0, errors, warnings };
}

export function adaptiveMissionManagerRationaleSummary(record = {}) {
  return {
    type: record.type ?? null,
    episodeId: record.episodeId ?? null,
    legIndex: record.legIndex ?? null,
    policyId: record.policyId ?? null,
    currentObjectiveId: record.currentObjectiveId ?? null,
    recommendedObjectiveId: record.recommendedObjectiveId ?? null,
    recommendedDiveProfileId: record.recommendedDiveProfileId ?? null,
    transitionId: record.transitionId ?? null,
    confidence: finiteOrNull(record.confidence),
    science: record.scienceDiagnosisContext ? adaptiveScienceDiagnosisHandoffSummary(record.scienceDiagnosisContext) : null,
    objectiveAuthority: record.objectiveAuthority ?? null,
    routeAuthority: record.routeAuthority ?? null,
    diagnosisIsPlannerAuthority: record.diagnosisIsPlannerAuthority === true,
    generatedRoute: record.generatedRoute === true
  };
}

function summarizeEvidence(evidence = {}, diagnosis = {}, scienceDiagnosisContext = null) {
  return compactObject({
    observationCount: nonnegativeInt(evidence?.observationCount ?? 0),
    recentObservationCount: nonnegativeInt(evidence?.recentObservationCount ?? evidence?.observationCount ?? 0),
    surpriseLevel: evidence?.surpriseSummary?.surpriseLevel ?? scienceDiagnosisContext?.surpriseLevel ?? null,
    coherenceLevel: evidence?.coherenceSummary?.coherenceLevel ?? null,
    primaryDiagnosis: diagnosis?.primaryDiagnosis ?? evidence?.diagnostics?.primaryDiagnosis ?? null,
    primaryScienceDiagnosis: scienceDiagnosisContext?.primaryScienceDiagnosis ?? diagnosis?.primaryScienceDiagnosis ?? null,
    confidence: finiteOrNull(diagnosis?.confidence ?? scienceDiagnosisContext?.confidence),
    partialEvidence: evidence?.diagnostics?.partialEvidence === true,
    fieldsAvailable: Array.isArray(evidence?.fieldsAvailable) ? [...evidence.fieldsAvailable] : [],
    waterColumnVerticalCoverage: evidence?.waterColumnSummary?.verticalCoverage ?? scienceDiagnosisContext?.waterColumnEvidence?.verticalCoverage ?? null,
    recommendedDiveProfileId: evidence?.recommendedDiveProfileId ?? scienceDiagnosisContext?.recommendedDiveProfileId ?? null
  });
}

function objectiveReason(diagnosis = {}, scienceDiagnosisContext = null, transition = {}) {
  if (scienceDiagnosisContext?.recommendationRationale) return scienceDiagnosisContext.recommendationRationale;
  if (diagnosis?.rationale) return diagnosis.rationale;
  if (transition?.rationale) return transition.rationale;
  return 'The mission manager selected an objective using transparent adaptive evidence rules.';
}

function normalizeAlternativeObjectives(values, recommendedObjectiveId, currentObjectiveId) {
  const source = Array.isArray(values) && values.length
    ? values
    : MISSION_OBJECTIVE_IDS.filter((id) => id !== recommendedObjectiveId).slice(0, 3).map((id) => ({
      objectiveId: id,
      label: missionObjectiveById(id).label,
      reasonFor: id === currentObjectiveId ? 'Continue current objective while collecting more evidence.' : 'Valid alternative objective for the mission manager.',
      reasonAgainst: id === recommendedObjectiveId ? '' : 'Lower priority than the current recommendation.',
      confidence: id === currentObjectiveId ? 0.35 : 0.25
    }));
  return source.slice(0, 5).map((entry) => {
    const objective = missionObjectiveById(entry.objectiveId ?? entry.id);
    return {
      objectiveId: objective.id,
      label: cleanText(entry.label) ?? objective.label,
      reasonFor: cleanText(entry.reasonFor) ?? 'Could be selected if mission context changes.',
      reasonAgainst: cleanText(entry.reasonAgainst) ?? 'Not the strongest current recommendation.',
      confidence: clamp01(entry.confidence, 0)
    };
  });
}

function containsHiddenPayload(value, depth = 0) {
  if (value == null || depth > 8) return false;
  if (Array.isArray(value)) return value.some((entry) => containsHiddenPayload(entry, depth + 1));
  if (typeof value !== 'object') return false;
  return Object.entries(value).some(([key, entry]) => HIDDEN_KEYS.has(key) || containsHiddenPayload(entry, depth + 1));
}

function clonePublic(value, depth = 0) {
  if (value == null) return value ?? null;
  if (depth > 8) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 80).map((entry) => clonePublic(entry, depth + 1));
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (HIDDEN_KEYS.has(key)) continue;
    out[key] = clonePublic(entry, depth + 1);
  }
  return out;
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([_key, entry]) => entry !== undefined));
}

function cleanText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function stringList(values) {
  return Array.isArray(values) ? values.map((value) => String(value ?? '').trim()).filter(Boolean) : [];
}

function uniqueStrings(values) {
  return [...new Set(stringList(values))];
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(4)) : null;
}

function nonnegativeInt(value) {
  return Math.max(0, Math.round(finiteNumber(value, 0)));
}

function clamp01(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : 'n/a';
}
