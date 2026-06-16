import { adaptiveEpisodeSessionSummary, createAdaptiveEpisodeSession } from './AdaptiveEpisodeSession.js';
import { missionObjectiveById, normalizeMissionObjectiveId } from './MissionObjectiveTaxonomy.js';

export const ADAPTIVE_OBJECTIVE_HISTORY_VIEW_MODEL_VERSION = 'adaptive-objective-history-view-model-p8';

export function buildAdaptiveObjectiveHistoryViewModel({ session, activeLegIndex = null, selectedObjectiveId = null } = {}) {
  const normalized = createAdaptiveEpisodeSession(session ?? {});
  const timeline = objectiveTransitionTimeline(normalized);
  const currentObjectiveId = normalizeMissionObjectiveId(selectedObjectiveId ?? normalized.currentObjectiveId);
  const currentObjective = missionObjectiveById(currentObjectiveId);
  const warnings = [...normalized.warnings];
  if (!normalized.legs.length) warnings.push('No adaptive leg records are stored yet.');
  if (!normalized.surfacingDecisions.length) warnings.push('No surfacing decisions are stored yet.');
  return {
    version: ADAPTIVE_OBJECTIVE_HISTORY_VIEW_MODEL_VERSION,
    episodeId: normalized.episodeId,
    benchmarkMode: 'adaptiveBenchmark',
    policyId: normalized.policyId,
    legCount: normalized.legs.length,
    currentLegIndex: activeLegIndex == null ? normalized.currentLegIndex : Math.max(0, Math.round(Number(activeLegIndex) || 0)),
    currentObjective: {
      id: currentObjective.id,
      label: currentObjective.label,
      description: currentObjective.description ?? ''
    },
    objectiveTimeline: timeline,
    transitionCards: timeline.map(transitionCard),
    evidenceCards: normalized.evidenceHistory.map(evidenceCard),
    diagnosisCards: normalized.diagnosisHistory.map(diagnosisCard),
    metricCards: objectiveHistoryMetricCards(normalized),
    legCards: normalized.legs.map(legCard),
    surfacingDecisionCards: normalized.surfacingDecisions.map(decisionCard),
    sessionSummary: adaptiveEpisodeSessionSummary(normalized),
    warnings,
    explanation: 'Adaptive Benchmark stores objective changes across surfacing events. The mission manager recommends objectives; the player or solver still plans each route.',
    notImplemented: [
      'automatic route generation',
      'new route planner',
      'scoring redesign',
      'full autonomy',
      'MARL/RL'
    ]
  };
}

export function adaptiveObjectiveHistorySummary(viewModel = {}) {
  return {
    version: viewModel.version ?? ADAPTIVE_OBJECTIVE_HISTORY_VIEW_MODEL_VERSION,
    episodeId: viewModel.episodeId ?? null,
    benchmarkMode: viewModel.benchmarkMode ?? 'adaptiveBenchmark',
    policyId: viewModel.policyId ?? null,
    legCount: viewModel.legCount ?? 0,
    currentLegIndex: viewModel.currentLegIndex ?? 0,
    currentObjectiveId: viewModel.currentObjective?.id ?? null,
    objectiveTransitionCount: viewModel.objectiveTimeline?.length ?? 0,
    evidenceCardCount: viewModel.evidenceCards?.length ?? 0,
    diagnosisCardCount: viewModel.diagnosisCards?.length ?? 0,
    warningCount: viewModel.warnings?.length ?? 0,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
}

export function objectiveTransitionTimeline(sessionInput = {}) {
  const session = createAdaptiveEpisodeSession(sessionInput);
  return session.objectiveHistory.map((entry) => {
    const toObjective = missionObjectiveById(entry.toObjectiveId ?? session.currentObjectiveId);
    const fromObjective = entry.fromObjectiveId ? missionObjectiveById(entry.fromObjectiveId) : null;
    return {
      legIndex: entry.legIndex,
      time: entry.time,
      fromObjectiveId: entry.fromObjectiveId ?? null,
      fromObjectiveLabel: fromObjective?.label ?? null,
      toObjectiveId: toObjective.id,
      toObjectiveLabel: toObjective.label,
      diagnosisId: entry.diagnosisId ?? null,
      confidence: entry.confidence ?? null,
      rationale: entry.rationale ?? 'Adaptive objective transition.',
      status: entry.status ?? 'objective'
    };
  });
}

export function objectiveHistoryMetricCards(sessionInput = {}) {
  const session = createAdaptiveEpisodeSession(sessionInput);
  return [
    { label: 'Legs', value: session.legs.length, description: 'Executed or partial adaptive leg records stored in this episode.' },
    { label: 'Surfacing Decisions', value: session.surfacingDecisions.length, description: 'Surfacing/debrief decisions preserved across legs.' },
    { label: 'Objective Changes', value: Math.max(0, session.objectiveHistory.length - 1), description: 'Mission-manager objective transitions after initialization.' },
    { label: 'Next-Leg Handoffs', value: session.nextLegHandoffs.length, description: 'Recommended objectives ready for manual or solver route planning.' }
  ];
}

function transitionCard(entry) {
  return {
    title: `Leg ${entry.legIndex}: ${entry.toObjectiveLabel}`,
    value: entry.fromObjectiveLabel ? `${entry.fromObjectiveLabel} -> ${entry.toObjectiveLabel}` : entry.toObjectiveLabel,
    detail: entry.rationale,
    status: entry.status,
    confidence: entry.confidence
  };
}

function evidenceCard(entry = {}) {
  const evidence = entry.evidence ?? entry;
  return {
    title: `Leg ${entry.legIndex ?? evidence.legIndex ?? 0} Evidence`,
    value: `${Number(evidence.observationCount ?? evidence.recentObservationCount ?? 0)} observations`,
    detail: evidence.diagnostics?.partialEvidence ? 'Some leg records are partial because the current result does not include all future adaptive fields.' : 'Evidence summary stored for objective review.'
  };
}

function diagnosisCard(entry = {}) {
  const diagnosis = entry.diagnosis ?? entry;
  return {
    title: `Leg ${entry.legIndex ?? 0} Diagnosis`,
    value: diagnosis.primaryDiagnosisLabel ?? diagnosis.primaryDiagnosis ?? entry.diagnosisId ?? 'Unknown',
    detail: diagnosis.rationale ?? 'Diagnosis summary stored for objective review.',
    confidence: diagnosis.confidence ?? entry.confidence ?? null
  };
}

function legCard(leg = {}) {
  return {
    title: `Leg ${leg.legIndex}: ${leg.objectiveLabel ?? leg.objectiveId ?? 'Objective'}`,
    value: leg.status ?? 'partial',
    detail: `Plan ${leg.planId ?? 'n/a'} | Result ${leg.resultId ?? 'n/a'}`,
    metrics: leg.metrics ?? {}
  };
}

function decisionCard(decision = {}) {
  return {
    title: `Leg ${decision.legIndex ?? 0} Surfacing Decision`,
    value: decision.recommendedObjective?.label ?? decision.objectiveTransition?.toObjectiveId ?? 'Objective unchanged',
    detail: decision.diagnosis?.primaryDiagnosisLabel ?? decision.diagnosis?.primaryDiagnosis ?? 'Diagnosis unavailable',
    confidence: decision.diagnosis?.confidence ?? null
  };
}
