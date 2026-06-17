import { missionObjectiveById } from './MissionObjectiveTaxonomy.js';
import { scienceDiscoverySummary } from '../science/ScienceDiscoveryLifecycle.js';
import {
  classifyScienceDiagnosis,
  normalizeScienceDiagnosisId,
  scienceDiagnosisLabel
} from '../science/ScienceDiagnosisTypes.js';

export const ADAPTIVE_SCIENCE_DIAGNOSIS_HANDOFF_VERSION = 'adaptive-science-diagnosis-handoff-p10';

const CONTEXT_TYPE = 'anchor.benchmark.adaptive-science-diagnosis-context';
const HANDOFF_TYPE = 'anchor.benchmark.adaptive-science-diagnosis-handoff';
const REQUIRED_NOT_A = [
  'not route planning',
  'not waypoint generation',
  'not production data assimilation',
  'not official scoring',
  'not full 3D planning',
  'not MARL/RL'
];
const HIDDEN_KEYS = new Set(['T_hiddenTruth', 'hiddenTruth', 'truth', 'truthField', 'truthFields', 'eventIntensity', 'trueRoi']);

export function createAdaptiveScienceDiagnosisContext(options = {}) {
  const discovery = normalizeDiscovery(options.scienceDiscovery ?? options.discoveryUpdate ?? options.update ?? options.scienceDiagnostics);
  const diagnosis = options.diagnosis ?? {};
  const primaryScienceDiagnosis = normalizePrimaryScienceDiagnosis(
    options.primaryScienceDiagnosis
      ?? discovery?.primaryDiagnosis
      ?? diagnosis.primaryScienceDiagnosis
      ?? diagnosis.scienceDiscovery?.primaryDiagnosis
  );
  const objectiveId = options.recommendedObjectiveId
    ?? discovery?.recommendedObjectiveId
    ?? diagnosis.recommendedObjectiveId
    ?? options.transition?.toObjectiveId
    ?? null;
  const objective = objectiveId ? missionObjectiveById(objectiveId) : null;
  const forecast = options.forecastCorrection
    ?? discovery?.forecastCorrection
    ?? diagnosis.forecastCorrectionSummary
    ?? options.evidence?.forecastCorrectionSummary
    ?? null;
  const hidden = options.hiddenEventHypothesis
    ?? discovery?.hiddenEventHypothesis
    ?? diagnosis.hiddenEventHypothesisSummary
    ?? options.evidence?.hiddenEventHypothesisSummary
    ?? null;
  const confidence = finiteNumber(options.confidence ?? discovery?.confidence ?? diagnosis.confidence, primaryScienceDiagnosis ? 0.5 : 0);
  const warnings = uniqueStrings([
    ...(primaryScienceDiagnosis ? [] : ['Science diagnosis was unavailable; mission manager used the adaptive evidence summary.']),
    ...stringList(options.warnings),
    ...stringList(discovery?.warnings),
    ...stringList(diagnosis.warnings)
  ]);
  return compactObject({
    type: CONTEXT_TYPE,
    version: ADAPTIVE_SCIENCE_DIAGNOSIS_HANDOFF_VERSION,
    episodeId: stringOrNull(options.episodeId ?? discovery?.episodeId ?? diagnosis.episodeId) ?? 'adaptive-preview-episode',
    legIndex: nonnegativeInt(options.legIndex ?? options.evidence?.legIndex ?? 0),
    time: finiteNumber(options.time ?? options.evidence?.time ?? diagnosis.time, 0),
    primaryScienceDiagnosis,
    primaryScienceDiagnosisLabel: primaryScienceDiagnosis ? scienceDiagnosisLabel(primaryScienceDiagnosis) : null,
    scienceDiagnosisClass: primaryScienceDiagnosis ? classifyScienceDiagnosis(primaryScienceDiagnosis) : null,
    forecastCorrectionStatus: forecast?.status ?? discovery?.forecastCorrectionStatus ?? null,
    forecastCorrectionKind: forecast?.correctionKind ?? forecast?.correction?.kind ?? null,
    hiddenEventStatus: hidden?.status ?? discovery?.hiddenEventStatus ?? null,
    hiddenEventFamily: hidden?.eventFamily ?? options.eventFamily ?? null,
    confidence: clamp01(confidence, 0),
    evidenceQuality: cleanText(options.evidenceQuality ?? evidenceQualityLabel(options.evidence, discovery)),
    evidenceCaveats: uniqueStrings([
      ...stringList(options.evidenceCaveats),
      ...stringList(options.evidence?.diagnostics?.warnings),
      ...(options.evidence?.diagnostics?.partialEvidence ? ['Partial evidence: not all adaptive fields were available.'] : [])
    ]),
    recommendedObjectiveId: objective?.id ?? objectiveId,
    recommendedObjectiveLabel: options.recommendedObjectiveLabel ?? objective?.label ?? null,
    recommendationRationale: cleanText(options.recommendationRationale ?? diagnosis.rationale ?? options.transition?.rationale ?? 'Science diagnosis informs the mission-manager objective recommendation.'),
    waterColumnEvidence: clonePublic(options.waterColumnEvidence ?? options.evidence?.waterColumnSummary ?? discovery?.waterColumnSummary ?? null),
    recommendedDiveProfileId: cleanText(options.recommendedDiveProfileId ?? diagnosis.recommendedDiveProfileId ?? options.evidence?.recommendedDiveProfileId ?? discovery?.recommendedDiveProfileId ?? null),
    informsMissionManager: true,
    controlsRoutePlanning: false,
    generatesWaypoints: false,
    changesScoring: false,
    publicSafe: true,
    warnings,
    notA: [...REQUIRED_NOT_A]
  });
}

export function createAdaptiveScienceDiagnosisHandoffRecord(options = {}) {
  const context = options.scienceDiagnosisContext?.type === CONTEXT_TYPE
    ? clonePublic(options.scienceDiagnosisContext)
    : createAdaptiveScienceDiagnosisContext(options);
  return compactObject({
    type: HANDOFF_TYPE,
    version: ADAPTIVE_SCIENCE_DIAGNOSIS_HANDOFF_VERSION,
    episodeId: context.episodeId,
    legIndex: context.legIndex,
    time: context.time,
    scienceDiagnosisContext: context,
    recommendedObjectiveId: context.recommendedObjectiveId,
    recommendedObjectiveLabel: context.recommendedObjectiveLabel,
    recommendedDiveProfileId: context.recommendedDiveProfileId ?? null,
    routeAuthority: 'playerOrSolver',
    objectiveAuthority: 'missionManager',
    diagnosisIsPlannerAuthority: false,
    generatedRoute: false,
    generatesWaypoints: false,
    controlsRoutePlanning: false,
    publicSafe: true,
    warnings: uniqueStrings([...stringList(context.warnings), ...stringList(options.warnings)]),
    notA: [...REQUIRED_NOT_A]
  });
}

export function validateAdaptiveScienceDiagnosisContext(context = {}) {
  const errors = [];
  const warnings = [];
  if (!context || typeof context !== 'object') errors.push('Adaptive science diagnosis context must be an object.');
  if (context?.type !== CONTEXT_TYPE) errors.push(`Expected type ${CONTEXT_TYPE}, got ${context?.type ?? 'missing'}.`);
  if (!context?.episodeId) errors.push('episodeId is required.');
  if (context?.informsMissionManager !== true) errors.push('informsMissionManager must be true.');
  if (context?.controlsRoutePlanning !== false) errors.push('controlsRoutePlanning must be false.');
  if (context?.generatesWaypoints !== false) errors.push('generatesWaypoints must be false.');
  if (context?.changesScoring !== false) errors.push('changesScoring must be false.');
  if (context?.publicSafe !== true) errors.push('publicSafe must be true.');
  if (!context?.primaryScienceDiagnosis) warnings.push('Science diagnosis context is missing a primary science diagnosis.');
  if (containsHiddenPayload(context)) errors.push('Science diagnosis context must not contain hidden-truth payloads.');
  checkNotA(context?.notA, errors);
  return result(errors, warnings);
}

export function validateAdaptiveScienceDiagnosisHandoffRecord(record = {}) {
  const errors = [];
  const warnings = [];
  if (!record || typeof record !== 'object') errors.push('Adaptive science diagnosis handoff record must be an object.');
  if (record?.type !== HANDOFF_TYPE) errors.push(`Expected type ${HANDOFF_TYPE}, got ${record?.type ?? 'missing'}.`);
  if (record?.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (record?.objectiveAuthority !== 'missionManager') errors.push('objectiveAuthority must be missionManager.');
  if (record?.diagnosisIsPlannerAuthority !== false) errors.push('diagnosisIsPlannerAuthority must be false.');
  if (record?.generatedRoute !== false) errors.push('generatedRoute must be false.');
  if (record?.generatesWaypoints !== false) errors.push('generatesWaypoints must be false.');
  if (record?.controlsRoutePlanning !== false) errors.push('controlsRoutePlanning must be false.');
  if (record?.publicSafe !== true) errors.push('publicSafe must be true.');
  if (containsHiddenPayload(record)) errors.push('Science diagnosis handoff must not contain hidden-truth payloads.');
  const contextValidation = record?.scienceDiagnosisContext ? validateAdaptiveScienceDiagnosisContext(record.scienceDiagnosisContext) : null;
  if (!contextValidation) warnings.push('scienceDiagnosisContext is missing; older handoff records may omit it.');
  else {
    errors.push(...contextValidation.errors.map((error) => `scienceDiagnosisContext: ${error}`));
    warnings.push(...contextValidation.warnings.map((warning) => `scienceDiagnosisContext: ${warning}`));
  }
  checkNotA(record?.notA, errors);
  return result(errors, warnings);
}

export function adaptiveScienceDiagnosisHandoffSummary(contextOrRecord = {}) {
  const context = contextOrRecord?.scienceDiagnosisContext ?? contextOrRecord ?? {};
  return {
    type: contextOrRecord?.type ?? context?.type ?? null,
    episodeId: context.episodeId ?? null,
    legIndex: context.legIndex ?? null,
    primaryScienceDiagnosis: context.primaryScienceDiagnosis ?? null,
    primaryScienceDiagnosisLabel: context.primaryScienceDiagnosisLabel ?? null,
    forecastCorrectionStatus: context.forecastCorrectionStatus ?? null,
    hiddenEventStatus: context.hiddenEventStatus ?? null,
    recommendedObjectiveId: context.recommendedObjectiveId ?? contextOrRecord?.recommendedObjectiveId ?? null,
    recommendedDiveProfileId: context.recommendedDiveProfileId ?? contextOrRecord?.recommendedDiveProfileId ?? null,
    confidence: finiteOrNull(context.confidence),
    informsMissionManager: context.informsMissionManager === true,
    controlsRoutePlanning: context.controlsRoutePlanning === true,
    generatesWaypoints: context.generatesWaypoints === true,
    publicSafe: context.publicSafe !== false
  };
}

export function scienceDiagnosisContextFromSurfacingDecision(decision = {}) {
  if (decision.scienceDiagnosisContext?.type === CONTEXT_TYPE) return clonePublic(decision.scienceDiagnosisContext);
  const scienceDiscovery = decision.scienceDiscovery ?? decision.diagnosis?.scienceDiscovery ?? decision.evidence?.scienceDiscovery ?? null;
  if (!scienceDiscovery && !decision.diagnosis?.primaryScienceDiagnosis) return null;
  return createAdaptiveScienceDiagnosisContext({
    episodeId: decision.episodeId,
    legIndex: decision.legIndex,
    time: decision.time,
    evidence: decision.evidence,
    diagnosis: decision.diagnosis,
    transition: decision.objectiveTransition,
    scienceDiscovery,
    recommendedObjectiveId: decision.recommendedObjective?.id ?? decision.objectiveTransition?.toObjectiveId,
    recommendedObjectiveLabel: decision.recommendedObjective?.label,
    recommendedDiveProfileId: decision.recommendedDiveProfileId ?? decision.evidence?.recommendedDiveProfileId ?? decision.diagnosis?.recommendedDiveProfileId
  });
}

export function scienceDiagnosisContextFromDiscoveryUpdate(update = {}) {
  if (!update || typeof update !== 'object') return null;
  return createAdaptiveScienceDiagnosisContext({
    episodeId: update.episodeId,
    time: update.time ?? update.createdAt ?? 0,
    scienceDiscovery: update,
    primaryScienceDiagnosis: update.primaryDiagnosis,
    recommendedObjectiveId: update.recommendedObjectiveId,
    confidence: update.confidence,
    recommendedDiveProfileId: update.recommendedDiveProfileId
  });
}

function normalizeDiscovery(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.discoverySummary || value.primaryDiagnosis || value.type === 'anchor.headless.science-diagnostics') return scienceDiscoverySummary(value);
  return clonePublic(value);
}

function normalizePrimaryScienceDiagnosis(value) {
  if (!value) return null;
  return normalizeScienceDiagnosisId(value, null);
}

function evidenceQualityLabel(evidence = {}, discovery = {}) {
  if (evidence?.diagnostics?.partialEvidence) return 'partial';
  if (Number(discovery?.confidence ?? evidence?.confidence ?? 0) >= 0.7) return 'strong';
  if (Number(evidence?.observationCount ?? 0) <= 1) return 'sparse';
  return 'moderate';
}

function checkNotA(values, errors) {
  const text = stringList(values).join(' ').toLowerCase();
  for (const required of REQUIRED_NOT_A) {
    if (!text.includes(required.toLowerCase())) errors.push(`notA must include ${required}.`);
  }
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

function stringOrNull(value) {
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

function result(errors, warnings) {
  return { status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', valid: errors.length === 0, errors, warnings };
}
