import { missionObjectiveById } from './MissionObjectiveTaxonomy.js';
import {
  adaptiveScienceDiagnosisHandoffSummary,
  createAdaptiveScienceDiagnosisContext,
  scienceDiagnosisContextFromSurfacingDecision
} from './AdaptiveScienceDiagnosisHandoff.js';
import {
  createAdaptiveMissionManagerRationale,
  adaptiveMissionManagerRationaleSummary
} from './AdaptiveMissionManagerRationale.js';

export const ADAPTIVE_SCIENCE_DIAGNOSIS_VIEW_MODEL_VERSION = 'adaptive-science-diagnosis-view-model-p10';

export function buildAdaptiveScienceDiagnosisViewModel({
  surfacingDecision = null,
  scienceDiagnosisContext = null,
  missionManagerRationale = null,
  evidence = null,
  diagnosis = null,
  transition = null,
  managerState = null
} = {}) {
  const decision = surfacingDecision ?? {};
  const resolvedEvidence = evidence ?? decision.evidence ?? {};
  const resolvedDiagnosis = diagnosis ?? decision.diagnosis ?? {};
  const resolvedTransition = transition ?? decision.objectiveTransition ?? {};
  const context = scienceDiagnosisContext
    ?? decision.scienceDiagnosisContext
    ?? scienceDiagnosisContextFromSurfacingDecision(decision)
    ?? (resolvedDiagnosis?.primaryScienceDiagnosis ? createAdaptiveScienceDiagnosisContext({
      episodeId: decision.episodeId,
      legIndex: decision.legIndex,
      time: decision.time,
      evidence: resolvedEvidence,
      diagnosis: resolvedDiagnosis,
      transition: resolvedTransition
    }) : null);
  const rationale = missionManagerRationale
    ?? decision.missionManagerRationale
    ?? createAdaptiveMissionManagerRationale({
      episodeId: decision.episodeId,
      legIndex: decision.legIndex,
      evidence: resolvedEvidence,
      diagnosis: resolvedDiagnosis,
      scienceDiagnosisContext: context,
      currentObjective: decision.previousObjective,
      recommendedObjective: decision.recommendedObjective,
      transition: resolvedTransition,
      managerConfig: decision.managerConfig
    });
  const warnings = uniqueStrings([
    ...(context ? [] : ['Science discovery diagnostics were not available for this leg. The mission manager used the available adaptive evidence summary.']),
    ...stringList(decision.warnings),
    ...stringList(context?.warnings),
    ...stringList(rationale?.warnings)
  ]);
  return {
    version: ADAPTIVE_SCIENCE_DIAGNOSIS_VIEW_MODEL_VERSION,
    episodeId: decision.episodeId ?? context?.episodeId ?? rationale?.episodeId ?? 'adaptive-preview-episode',
    legIndex: nonnegativeInt(decision.legIndex ?? context?.legIndex ?? rationale?.legIndex ?? 0),
    primaryScienceDiagnosis: context?.primaryScienceDiagnosis ?? null,
    forecastUpdateCard: forecastUpdateCard(context, resolvedDiagnosis),
    discoveryUpdateCard: discoveryUpdateCard(context, resolvedDiagnosis),
    evidenceQualityCard: evidenceQualityCard(resolvedEvidence, context),
    waterColumnEvidenceCard: waterColumnEvidenceCard(resolvedEvidence, context, rationale),
    recommendationCard: recommendationCard(decision, resolvedTransition, context, rationale),
    missionManagerRationaleCard: missionManagerRationaleCard(rationale),
    nextLegCarryForwardCard: nextLegCarryForwardCard(decision, context, rationale, managerState),
    warnings,
    explanation: 'Science diagnosis informs the mission-manager recommendation. It does not generate a route. The player or solver still plans the next route.',
    notImplemented: [
      'new route planner',
      'waypoint generation',
      'full 3D planning',
      'scoring redesign',
      'production data assimilation',
      'GP/GMRF production inference',
      'MARL/RL'
    ],
    boundaryFlags: {
      diagnosisIsPlannerAuthority: false,
      usesNewPlanner: false,
      usesFull3DPlanning: false,
      generatesWaypoints: false,
      changesScoring: false,
      usesProductionDataAssimilation: false,
      usesMARL: false
    },
    summaries: {
      scienceDiagnosisContext: context ? adaptiveScienceDiagnosisHandoffSummary(context) : null,
      missionManagerRationale: rationale ? adaptiveMissionManagerRationaleSummary(rationale) : null
    }
  };
}

export function adaptiveScienceDiagnosisViewModelSummary(viewModel = {}) {
  return {
    version: viewModel.version ?? ADAPTIVE_SCIENCE_DIAGNOSIS_VIEW_MODEL_VERSION,
    episodeId: viewModel.episodeId ?? null,
    legIndex: viewModel.legIndex ?? 0,
    primaryScienceDiagnosis: viewModel.primaryScienceDiagnosis ?? null,
    forecastCorrectionStatus: viewModel.forecastUpdateCard?.status ?? null,
    hiddenEventStatus: viewModel.discoveryUpdateCard?.status ?? null,
    recommendedObjectiveId: viewModel.recommendationCard?.recommendedObjective?.id ?? null,
    recommendedDiveProfileId: viewModel.recommendationCard?.recommendedDiveProfileId ?? viewModel.nextLegCarryForwardCard?.recommendedDiveProfileId ?? null,
    waterColumnVerticalCoverage: viewModel.waterColumnEvidenceCard?.verticalCoverage ?? null,
    confidence: viewModel.recommendationCard?.confidence ?? viewModel.evidenceQualityCard?.confidence ?? null,
    warningCount: Array.isArray(viewModel.warnings) ? viewModel.warnings.length : 0,
    diagnosisIsPlannerAuthority: viewModel.boundaryFlags?.diagnosisIsPlannerAuthority === true,
    usesNewPlanner: viewModel.boundaryFlags?.usesNewPlanner === true,
    usesFull3DPlanning: viewModel.boundaryFlags?.usesFull3DPlanning === true,
    generatesWaypoints: viewModel.boundaryFlags?.generatesWaypoints === true,
    changesScoring: viewModel.boundaryFlags?.changesScoring === true,
    usesProductionDataAssimilation: viewModel.boundaryFlags?.usesProductionDataAssimilation === true,
    usesMARL: viewModel.boundaryFlags?.usesMARL === true
  };
}

function forecastUpdateCard(context = null, diagnosis = {}) {
  return {
    status: context?.forecastCorrectionStatus ?? diagnosis.forecastCorrectionSummary?.status ?? 'not available',
    correctionKind: context?.forecastCorrectionKind ?? diagnosis.forecastCorrectionSummary?.correctionKind ?? diagnosis.forecastCorrectionSummary?.correction?.kind ?? 'n/a',
    confidence: finiteOrNull(context?.confidence ?? diagnosis.confidence),
    rationale: 'Forecast correction means the expected field existed but was wrong.',
    recommendedAction: context?.recommendedObjectiveId === 'validateForecast' ? 'Validate the forecast with follow-up samples.' : 'Use forecast context as evidence for the mission manager.',
    caveats: uniqueStrings(context?.evidenceCaveats ?? [])
  };
}

function discoveryUpdateCard(context = null, diagnosis = {}) {
  return {
    status: context?.hiddenEventStatus ?? diagnosis.hiddenEventHypothesisSummary?.status ?? 'not available',
    eventFamily: context?.hiddenEventFamily ?? diagnosis.hiddenEventHypothesisSummary?.eventFamily ?? 'unknown',
    confidence: finiteOrNull(context?.confidence ?? diagnosis.confidence),
    recommendedFollowup: context?.recommendedObjectiveId === 'confirmHiddenEvent' ? 'Confirm or reject the hidden-event hypothesis.' : 'Collect more evidence before treating this as a new event.',
    rationale: 'Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast.',
    caveats: uniqueStrings(context?.evidenceCaveats ?? [])
  };
}

function evidenceQualityCard(evidence = {}, context = null) {
  const surprise = evidence.surpriseSummary ?? context?.surpriseSummary ?? {};
  const coherence = evidence.coherenceSummary ?? {};
  return {
    observationCount: nonnegativeInt(evidence.observationCount ?? evidence.recentObservationCount ?? 0),
    surpriseLevel: surprise.surpriseLevel ?? levelFromScore(evidence.meanSurprise ?? evidence.maxSurprise),
    coherenceLevel: coherence.coherenceLevel ?? evidence.coherenceLevel ?? 'not available',
    confidence: finiteOrNull(context?.confidence ?? evidence.confidence),
    partialEvidence: Boolean(evidence.diagnostics?.partialEvidence),
    warnings: uniqueStrings([
      ...stringList(evidence.diagnostics?.warnings),
      ...(evidence.diagnostics?.partialEvidence ? ['Partial evidence warning: not all adaptive fields were available.'] : [])
    ])
  };
}

function waterColumnEvidenceCard(evidence = {}, context = null, rationale = {}) {
  const summary = evidence.waterColumnSummary ?? context?.waterColumnEvidence ?? {};
  return {
    present: Boolean(summary?.verticalCoverage || summary?.observationCountsByDepth || context?.recommendedDiveProfileId || rationale?.recommendedDiveProfileId),
    verticalCoverage: summary?.verticalCoverage ?? null,
    observationCountsByDepth: summary?.observationCountsByDepth ?? {},
    recommendedDiveProfileId: context?.recommendedDiveProfileId ?? rationale?.recommendedDiveProfileId ?? evidence.recommendedDiveProfileId ?? null,
    routeAuthority: 'playerOrSolver',
    generatesWaypoints: false,
    controlsRoutePlanning: false,
    usesFull3DPlanning: false,
    copy: [
      '2.5D means the tactical map remains top-down, while each cell can contain simplified depth layers.',
      'Dive profile controls which layer the glider samples along the route.',
      'Recommended dive profile is context for the next leg; it does not generate a route.',
      'P11 does not add full 3D planning, new route planning, production data assimilation, or MARL/RL.'
    ]
  };
}

function recommendationCard(decision = {}, transition = {}, context = null, rationale = {}) {
  const current = missionObjectiveById(transition.fromObjectiveId ?? decision.previousObjective?.id ?? rationale.currentObjectiveId ?? 'reconnaissanceSurvey');
  const recommended = missionObjectiveById(transition.toObjectiveId ?? decision.recommendedObjective?.id ?? context?.recommendedObjectiveId ?? rationale.recommendedObjectiveId ?? current.id);
  return {
    currentObjective: { id: current.id, label: current.label },
    recommendedObjective: { id: recommended.id, label: recommended.label },
    transitionId: transition.transitionId ?? rationale.transitionId ?? 'keepCurrentObjective',
    reason: rationale.objectiveReason ?? context?.recommendationRationale ?? transition.rationale ?? decision.rationale ?? 'Mission manager selected the objective using adaptive evidence.',
    confidence: finiteOrNull(rationale.confidence ?? context?.confidence ?? transition.confidence),
    recommendedDiveProfileId: context?.recommendedDiveProfileId ?? rationale.recommendedDiveProfileId ?? decision.recommendedDiveProfileId ?? null,
    routeStillPlannedBy: 'playerOrSolver'
  };
}

function missionManagerRationaleCard(rationale = {}) {
  return {
    policyId: rationale.policyId ?? 'transparentRuleManager',
    objectiveAuthority: rationale.objectiveAuthority ?? 'missionManager',
    routeAuthority: rationale.routeAuthority ?? 'playerOrSolver',
    explanation: rationale.explanation ?? 'Mission-manager rationale unavailable.',
    alternativeObjectives: Array.isArray(rationale.alternativeObjectives) ? rationale.alternativeObjectives : [],
    caveats: uniqueStrings(rationale.caveats ?? []),
    diagnosisIsPlannerAuthority: rationale.diagnosisIsPlannerAuthority === true
  };
}

function nextLegCarryForwardCard(decision = {}, context = null, rationale = {}, managerState = null) {
  return {
    recommendedObjectiveId: context?.recommendedObjectiveId ?? rationale.recommendedObjectiveId ?? decision.objectiveTransition?.toObjectiveId ?? managerState?.currentObjectiveId ?? null,
    recommendedObjectiveLabel: context?.recommendedObjectiveLabel ?? missionObjectiveById(context?.recommendedObjectiveId ?? rationale.recommendedObjectiveId ?? decision.objectiveTransition?.toObjectiveId).label,
    recommendedDiveProfileId: context?.recommendedDiveProfileId ?? rationale.recommendedDiveProfileId ?? decision.recommendedDiveProfileId ?? null,
    carriesScienceContext: Boolean(context),
    carriesRationale: Boolean(rationale),
    routeAuthority: 'playerOrSolver',
    generatesWaypoints: false,
    message: 'Recommended objective and optional dive-profile context are carried forward; no waypoints are generated and route planning remains with the player or solver.'
  };
}

function levelFromScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'not available';
  if (number >= 0.7) return 'high';
  if (number >= 0.35) return 'moderate';
  return 'low';
}

function stringList(values) {
  return Array.isArray(values) ? values.map((value) => String(value ?? '').trim()).filter(Boolean) : [];
}

function uniqueStrings(values) {
  return [...new Set(stringList(values))];
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(4)) : null;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonnegativeInt(value) {
  return Math.max(0, Math.round(finiteNumber(value, 0)));
}
