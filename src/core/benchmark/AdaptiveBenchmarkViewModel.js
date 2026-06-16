import { adaptiveDiagnosisById } from './AdaptiveMissionManagerContract.js';
import { missionObjectiveById } from './MissionObjectiveTaxonomy.js';

export const ADAPTIVE_BENCHMARK_VIEW_MODEL_VERSION = 'adaptive-benchmark-view-model-p6';

export function buildAdaptiveBenchmarkViewModel({
  managerConfig = {},
  managerState = {},
  evidence = {},
  diagnosis = {},
  transition = {},
  fixture = {}
} = {}) {
  const currentObjectiveId = transition.fromObjectiveId ?? managerState.currentObjectiveId ?? evidence.activeObjectiveId ?? 'reconnaissanceSurvey';
  const recommendedObjectiveId = transition.toObjectiveId ?? diagnosis.recommendedObjectiveId ?? currentObjectiveId;
  const diagnosisId = diagnosis.primaryDiagnosis ?? 'insufficientEvidence';
  const diagnosisDefinition = adaptiveDiagnosisById(diagnosisId);
  const currentObjective = objectiveCard(currentObjectiveId);
  const recommendedObjective = objectiveCard(recommendedObjectiveId);
  const scores = diagnosis.scores ?? {};
  return {
    version: ADAPTIVE_BENCHMARK_VIEW_MODEL_VERSION,
    benchmarkMode: 'adaptiveBenchmark',
    title: 'Adaptive Benchmark',
    subtitle: 'Mission Manager Preview',
    fixtureId: fixture.fixtureId ?? null,
    fixtureLabel: fixture.label ?? null,
    policyId: managerConfig.policyId ?? managerState.policyId ?? 'transparentRuleManager',
    policyLabel: managerConfig.policyLabel ?? 'Transparent Rule Manager',
    currentObjective,
    recommendedObjective,
    diagnosis: {
      id: diagnosisId,
      label: diagnosis.primaryDiagnosisLabel ?? diagnosisDefinition.label,
      confidence: Number.isFinite(Number(diagnosis.confidence)) ? Number(diagnosis.confidence) : 0,
      recommendedTransitionId: diagnosis.recommendedTransitionId ?? transition.transitionId ?? 'keepCurrentObjective',
      recommendedResponse: diagnosis.recommendedResponse ?? '',
      secondaryDiagnoses: Array.isArray(diagnosis.secondaryDiagnoses) ? diagnosis.secondaryDiagnoses.map((entry) => ({ ...entry })) : []
    },
    objectiveTransition: {
      type: transition.type ?? 'anchor.benchmark.adaptive-objective-transition',
      transitionId: transition.transitionId ?? diagnosis.recommendedTransitionId ?? 'keepCurrentObjective',
      fromObjectiveId: currentObjective.id,
      fromObjectiveLabel: currentObjective.label,
      toObjectiveId: recommendedObjective.id,
      toObjectiveLabel: recommendedObjective.label,
      authority: transition.authority ?? 'missionManager',
      routeAuthority: transition.routeAuthority ?? 'playerOrSolver',
      confidence: Number.isFinite(Number(transition.confidence ?? diagnosis.confidence)) ? Number(transition.confidence ?? diagnosis.confidence) : 0
    },
    evidenceCards: evidenceCards(evidence),
    scoreCards: scoreCards(scores),
    objectiveHistory: normalizeObjectiveHistory(managerState.objectiveHistory),
    explanation: diagnosis.rationale ?? fixture.teachingNote ?? 'Adaptive mission-manager rationale unavailable.',
    warnings: normalizeStringList([...(Array.isArray(diagnosis.warnings) ? diagnosis.warnings : []), ...(Array.isArray(managerState.warnings) ? managerState.warnings : [])]),
    implementedNow: [
      'mission-manager contract',
      'diagnosis model',
      'objective-transition policy',
      'surfacing/communication records',
      'adaptive manager preview',
      'adaptive exports'
    ],
    notImplemented: [
      'adaptive route execution',
      'route planning',
      'mission scoring',
      'scoring redesign',
      'full autonomy',
      'MARL/RL',
      'production data assimilation'
    ],
    boundaryFlags: {
      objectiveAuthority: 'missionManager',
      routeAuthority: 'playerOrSolver',
      usesRoutePlanning: false,
      usesMissionScoring: false,
      usesMARL: false,
      usesProductionDataAssimilation: false
    }
  };
}

export function adaptiveBenchmarkViewModelSummary(viewModel = {}) {
  return {
    benchmarkMode: viewModel.benchmarkMode ?? 'adaptiveBenchmark',
    policyId: viewModel.policyId,
    fixtureId: viewModel.fixtureId,
    currentObjectiveId: viewModel.currentObjective?.id,
    recommendedObjectiveId: viewModel.recommendedObjective?.id,
    diagnosisId: viewModel.diagnosis?.id,
    confidence: viewModel.diagnosis?.confidence,
    transitionId: viewModel.objectiveTransition?.transitionId,
    objectiveAuthority: viewModel.boundaryFlags?.objectiveAuthority ?? 'missionManager',
    routeAuthority: viewModel.boundaryFlags?.routeAuthority ?? 'playerOrSolver',
    usesRoutePlanning: Boolean(viewModel.boundaryFlags?.usesRoutePlanning),
    usesMissionScoring: Boolean(viewModel.boundaryFlags?.usesMissionScoring),
    usesMARL: Boolean(viewModel.boundaryFlags?.usesMARL)
  };
}

function objectiveCard(id) {
  const objective = missionObjectiveById(id);
  return {
    id: objective.id,
    label: objective.label,
    description: objective.description,
    usesFields: [...objective.usesFields],
    recommendedSamplingMethod: objective.recommendedSamplingMethod,
    recommendedActionMethod: objective.recommendedActionMethod
  };
}

function evidenceCards(evidence = {}) {
  return [
    card('Observations', `${numberText(evidence.recentObservationCount)} recent / ${numberText(evidence.observationCount)} total`, 'Recent observations drive the objective update.'),
    card('Uncertainty', rangeText(evidence.meanUncertainty, evidence.maxUncertainty), 'Expected-state uncertainty signal.'),
    card('Forecast Error', scoreText(evidence.forecastErrorScore), 'How strongly observations disagree with forecast or belief.'),
    card('Hidden Event', scoreText(evidence.hiddenEventConfidence), 'Suspicion that value is missing from the forecast.'),
    card('Boundary', scoreText(evidence.boundaryAmbiguityScore), 'Ambiguity around fronts, edges, or gradients.'),
    card('Staleness', scoreText(evidence.stalenessScore), 'Age-of-information pressure.'),
    card('Source', scoreText(evidence.sourceLocalizationScore), 'Evidence for an upstream or recurring source.'),
    card('Hazard / Reachability', rangeText(evidence.hazardPressure, evidence.reachabilityPressure), 'Route-risk context that P6 does not solve.')
  ];
}

function scoreCards(scores = {}) {
  return Object.entries(scores)
    .filter(([, score]) => Number.isFinite(Number(score)))
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([id, score]) => {
      const diagnosis = adaptiveDiagnosisById(id);
      return {
        id,
        label: diagnosis.label,
        value: Number(score),
        formattedValue: scoreText(score),
        description: diagnosis.description
      };
    });
}

function normalizeObjectiveHistory(history) {
  return Array.isArray(history)
    ? history.map((entry) => ({
        time: entry.time,
        objectiveId: entry.objectiveId,
        objectiveLabel: missionObjectiveById(entry.objectiveId).label,
        transitionId: entry.transitionId,
        rationale: entry.rationale
      }))
    : [];
}

function card(label, value, description) {
  return { label, value, description };
}

function scoreText(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : 'n/a';
}

function rangeText(a, b) {
  return `${scoreText(a)} / ${scoreText(b)}`;
}

function numberText(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number)) : '0';
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((entry) => String(entry ?? '').trim()).filter(Boolean))]
    : [];
}
