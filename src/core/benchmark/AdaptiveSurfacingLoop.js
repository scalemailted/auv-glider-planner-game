import { computeAdaptiveDiagnosis } from './AdaptiveDiagnosisModel.js';
import { selectNextAdaptiveObjective } from './AdaptiveObjectivePolicy.js';
import { applyAdaptiveEvidenceSnapshot, applyAdaptiveObjectiveTransition, createAdaptiveMissionManagerState } from './AdaptiveMissionManagerState.js';
import { createAdaptiveMissionManagerConfig } from './AdaptiveMissionManagerContract.js';
import { createAdaptiveSurfacingEvent } from './AdaptiveSurfacingEvent.js';
import { initializeAdaptiveBenchmarkEpisode } from './AdaptiveBenchmarkRuntime.js';
import { missionObjectiveById } from './MissionObjectiveTaxonomy.js';
import { createAdaptiveScienceDiagnosisContext } from './AdaptiveScienceDiagnosisHandoff.js';
import { createAdaptiveMissionManagerRationale } from './AdaptiveMissionManagerRationale.js';
import { buildAdaptiveScienceDiagnosisViewModel } from './AdaptiveScienceDiagnosisViewModel.js';

export const ADAPTIVE_SURFACING_LOOP_VERSION = 'adaptive-surfacing-loop-p7';

export function createAdaptiveSurfacingLoopInput(options = {}) {
  const runtimeContext = initializeAdaptiveBenchmarkEpisode(options.runtimeContext ?? options);
  const evidence = cloneJson(options.evidence ?? {});
  const managerState = createAdaptiveMissionManagerState(options.managerState ?? runtimeContext.adaptiveManagerState);
  const surfacingEvent = options.surfacingEvent?.type === 'anchor.benchmark.adaptive-surfacing-event'
    ? cloneJson(options.surfacingEvent)
    : createAdaptiveSurfacingEvent({
        episodeId: runtimeContext.episodeId,
        time: evidence.time ?? options.time ?? 0,
        samplesUploaded: evidence.observationCount ?? 0,
        observationsReceived: evidence.recentObservationCount ?? evidence.observationCount ?? 0,
        ...(options.surfacingEvent ?? {})
      });
  return { runtimeContext, evidence, surfacingEvent, managerConfig: options.managerConfig ?? runtimeContext.adaptiveManagerConfig, managerState };
}

export function runAdaptiveSurfacingDecision({ runtimeContext, evidence, surfacingEvent, managerConfig, managerState } = {}) {
  const input = createAdaptiveSurfacingLoopInput({ runtimeContext, evidence, surfacingEvent, managerConfig, managerState });
  const config = input.managerConfig?.type === 'anchor.benchmark.adaptive-manager-config'
    ? cloneJson(input.managerConfig)
    : createAdaptiveMissionManagerConfig(input.managerConfig);
  const before = createAdaptiveMissionManagerState(input.managerState);
  const enrichedEvidence = {
    ...cloneJson(input.evidence),
    episodeId: input.runtimeContext.episodeId,
    activeObjectiveId: input.evidence?.activeObjectiveId ?? before.currentObjectiveId,
    previousObjectiveId: input.evidence?.previousObjectiveId ?? before.objectiveHistory?.at?.(-1)?.objectiveId ?? before.currentObjectiveId
  };
  const diagnosis = computeAdaptiveDiagnosis(enrichedEvidence, config);
  const withEvidence = applyAdaptiveEvidenceSnapshot(before, { ...enrichedEvidence, diagnosis });
  const objectiveSelection = selectNextAdaptiveObjective({
    diagnosis,
    currentObjective: before.currentObjectiveId,
    objectiveHistory: before.objectiveHistory,
    managerConfig: config,
    missionContext: {
      episodeId: input.runtimeContext.episodeId,
      time: enrichedEvidence.time,
      observationCount: enrichedEvidence.observationCount,
      recentObservationCount: enrichedEvidence.recentObservationCount,
      fieldsAvailable: enrichedEvidence.fieldsAvailable,
      scienceDiscovery: enrichedEvidence.scienceDiscovery ?? diagnosis.scienceDiscovery ?? null,
      notes: ['P7 surfacing loop recommends an objective only; it does not plan a route.', 'P9 science diagnostics are educational heuristics when present.']
    }
  });
  const transition = objectiveSelection.transitionRecord;
  const after = applyAdaptiveObjectiveTransition(withEvidence, transition);
  const scienceDiscovery = enrichedEvidence.scienceDiscovery ?? diagnosis.scienceDiscovery ?? null;
  const previousObjective = missionObjectiveById(transition.fromObjectiveId);
  const recommendedObjective = missionObjectiveById(transition.toObjectiveId);
  const scienceDiagnosisContext = scienceDiscovery || diagnosis.primaryScienceDiagnosis
    ? createAdaptiveScienceDiagnosisContext({
        episodeId: input.runtimeContext.episodeId,
        legIndex: input.runtimeContext.activeLegIndex,
        time: enrichedEvidence.time,
        evidence: enrichedEvidence,
        diagnosis,
        transition,
        scienceDiscovery,
        recommendedObjectiveId: recommendedObjective.id,
        recommendedObjectiveLabel: recommendedObjective.label,
        recommendationRationale: transition.rationale ?? diagnosis.rationale
      })
    : null;
  const missionManagerRationale = createAdaptiveMissionManagerRationale({
    episodeId: input.runtimeContext.episodeId,
    legIndex: input.runtimeContext.activeLegIndex,
    policyId: config.policyId,
    evidence: enrichedEvidence,
    diagnosis,
    scienceDiagnosisContext,
    currentObjective: previousObjective,
    recommendedObjective,
    transition,
    managerConfig: config
  });
  const scienceDiagnosisViewModel = buildAdaptiveScienceDiagnosisViewModel({
    surfacingDecision: {
      episodeId: input.runtimeContext.episodeId,
      legIndex: input.runtimeContext.activeLegIndex,
      time: enrichedEvidence.time,
      evidence: enrichedEvidence,
      diagnosis,
      objectiveTransition: transition,
      previousObjective,
      recommendedObjective,
      scienceDiscovery,
      scienceDiagnosisContext,
      missionManagerRationale
    },
    scienceDiagnosisContext,
    missionManagerRationale,
    managerState: after
  });
  const warnings = mergeUnique([
    ...(Array.isArray(enrichedEvidence.diagnostics?.warnings) ? enrichedEvidence.diagnostics.warnings : []),
    ...(Array.isArray(diagnosis.warnings) ? diagnosis.warnings : []),
    ...(Array.isArray(enrichedEvidence.scienceDiscovery?.warnings) ? enrichedEvidence.scienceDiscovery.warnings : []),
    ...(scienceDiagnosisContext ? [] : ['Science diagnosis was unavailable; mission manager used adaptive evidence summary only.'])
  ]);
  return {
    type: 'anchor.benchmark.adaptive-surfacing-decision',
    version: ADAPTIVE_SURFACING_LOOP_VERSION,
    episodeId: input.runtimeContext.episodeId,
    benchmarkMode: 'adaptiveBenchmark',
    time: finiteNumber(enrichedEvidence.time ?? input.surfacingEvent.time, 0),
    legIndex: input.runtimeContext.activeLegIndex,
    surfacingEvent: cloneJson(input.surfacingEvent),
    evidence: enrichedEvidence,
    scienceDiscovery,
    scienceDiagnosisContext,
    missionManagerRationale,
    scienceDiagnosisViewModel,
    diagnosis,
    objectiveTransition: transition,
    previousObjective,
    recommendedObjective,
    managerStateBefore: before,
    managerStateAfter: after,
    routeAuthority: 'playerOrSolver',
    objectiveAuthority: 'missionManager',
    diagnosisIsPlannerAuthority: false,
    generatedRoute: false,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesProductionDataAssimilation: false,
    usesMARL: false,
    rationale: diagnosis.rationale ?? transition.rationale ?? 'Adaptive surfacing decision selected by transparent rule policy.',
    warnings,
    notA: ['not full autonomy', 'not route planning', 'not waypoint generation', 'not production data assimilation', 'not MARL/RL']
  };
}

export function applyAdaptiveSurfacingDecision({ managerState, evidence, diagnosis, transition, surfacingEvent } = {}) {
  const before = createAdaptiveMissionManagerState(managerState);
  const withEvidence = applyAdaptiveEvidenceSnapshot(before, { ...cloneJson(evidence ?? {}), diagnosis });
  const after = applyAdaptiveObjectiveTransition(withEvidence, transition);
  return { ...after, surfacingEvents: [...after.surfacingEvents, cloneJson(surfacingEvent)].filter(Boolean) };
}

export function adaptiveSurfacingDecisionSummary(decision = {}) {
  return {
    type: decision.type,
    episodeId: decision.episodeId,
    benchmarkMode: decision.benchmarkMode,
    legIndex: decision.legIndex,
    primaryDiagnosis: decision.diagnosis?.primaryDiagnosis ?? null,
    primaryScienceDiagnosis: decision.diagnosis?.primaryScienceDiagnosis ?? decision.scienceDiscovery?.primaryDiagnosis ?? null,
    forecastCorrectionStatus: decision.scienceDiagnosisContext?.forecastCorrectionStatus ?? null,
    hiddenEventStatus: decision.scienceDiagnosisContext?.hiddenEventStatus ?? null,
    confidence: decision.diagnosis?.confidence ?? 0,
    fromObjectiveId: decision.objectiveTransition?.fromObjectiveId ?? decision.previousObjective?.id ?? null,
    recommendedObjectiveId: decision.objectiveTransition?.toObjectiveId ?? decision.recommendedObjective?.id ?? null,
    routeAuthority: decision.routeAuthority,
    objectiveAuthority: decision.objectiveAuthority,
    diagnosisIsPlannerAuthority: decision.diagnosisIsPlannerAuthority === true,
    generatedRoute: decision.generatedRoute === true,
    warningCount: Array.isArray(decision.warnings) ? decision.warnings.length : 0
  };
}

export function validateAdaptiveSurfacingDecision(decision = {}) {
  const errors = [];
  const warnings = [];
  if (!decision || typeof decision !== 'object') errors.push('Adaptive surfacing decision must be an object.');
  if (decision?.type !== 'anchor.benchmark.adaptive-surfacing-decision') errors.push(`Expected type anchor.benchmark.adaptive-surfacing-decision, got ${decision?.type ?? 'missing'}.`);
  if (decision?.benchmarkMode !== 'adaptiveBenchmark') errors.push('benchmarkMode must be adaptiveBenchmark.');
  if (!decision?.episodeId) errors.push('episodeId is required.');
  if (decision?.objectiveAuthority !== 'missionManager') errors.push('objectiveAuthority must be missionManager.');
  if (decision?.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (decision?.diagnosisIsPlannerAuthority !== false) errors.push('diagnosisIsPlannerAuthority must be false.');
  if (decision?.generatedRoute !== false) errors.push('generatedRoute must be false.');
  if (decision?.usesNewPlanner !== false) errors.push('usesNewPlanner must be false.');
  if (decision?.usesMissionScoringRedesign !== false) errors.push('usesMissionScoringRedesign must be false.');
  if (decision?.usesMARL !== false) errors.push('usesMARL must be false.');
  if (!decision?.evidence) errors.push('evidence is required.');
  if (!decision?.diagnosis) errors.push('diagnosis is required.');
  if (!decision?.objectiveTransition) errors.push('objectiveTransition is required.');
  const notA = Array.isArray(decision?.notA) ? decision.notA.join(' ').toLowerCase() : '';
  for (const required of ['not full autonomy', 'not route planning', 'not production data assimilation', 'not marl/rl']) {
    if (!notA.includes(required)) errors.push(`notA must include ${required}.`);
  }
  return { status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', valid: errors.length === 0, errors, warnings };
}

function mergeUnique(values) {
  const output = [];
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized && !output.includes(normalized)) output.push(normalized);
  }
  return output;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}


