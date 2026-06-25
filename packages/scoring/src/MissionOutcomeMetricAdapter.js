import { MISSION_SCORE_COMPONENTS, missionScoreComponentById } from './MissionScoreComponents.js';

export const MISSION_OUTCOME_METRIC_ADAPTER_VERSION = 'mission-outcome-metric-adapter-score-r1';

export function extractMissionOutcomeMetrics({
  result = null,
  benchmarkRunRecord = null,
  routeExecution = null,
  motionTrajectory = null,
  motionDiagnostics = null,
  missionFeasibilityReport = null,
  waterColumnSummary = null,
  scienceDiagnostics = null,
  adaptiveSession = null,
  observations = null,
  objective = null,
  options = {}
} = {}) {
  const scoreReport = options.scoreReport ?? result?.scoreReport ?? result?.rawResult?.scoreReport ?? null;
  const scoreComponents = scoreReport?.components ?? result?.scoreSummary?.components ?? result?.summary?.components ?? {};
  const scoreCounts = scoreReport?.counts ?? result?.scoreReport?.counts ?? result?.summary ?? {};
  const obs = Array.isArray(observations) ? observations
    : Array.isArray(result?.observations) ? result.observations
    : Array.isArray(result?.routeExecution?.observations) ? result.routeExecution.observations
    : [];
  const tracks = Array.isArray(result?.gliderTracks) ? result.gliderTracks
    : Array.isArray(result?.tracks) ? result.tracks
    : Array.isArray(result?.frames) ? result.frames
    : [];
  const feasibility = missionFeasibilityReport ?? result?.missionFeasibilityReport ?? null;
  const motion = motionTrajectory ?? result?.motionTrajectory ?? null;
  const planned = motion?.plannedVsRealized ?? {};
  const motionSummary = motionDiagnostics?.summary ?? motionDiagnostics ?? result?.motionDiagnostics ?? {};
  const water = waterColumnSummary ?? result?.waterColumnSummary ?? null;
  const science = scienceDiagnostics ?? result?.scienceDiagnostics ?? null;
  const objectiveId = objectiveIdFrom(objective, result, benchmarkRunRecord, options);
  const missionId = options.missionId ?? feasibility?.missionId ?? result?.missionId ?? benchmarkRunRecord?.missionId ?? null;
  const episodeId = options.episodeId ?? result?.episodeId ?? result?.benchmarkMetadata?.episodeId ?? benchmarkRunRecord?.episodeId ?? null;
  const attemptId = options.attemptId ?? result?.attemptId ?? routeExecution?.attemptId ?? benchmarkRunRecord?.attemptId ?? result?.resultId ?? null;
  const metricValues = {
    scienceValueCollected: finiteOrNull(scoreComponents.scienceValueCollected ?? result?.summary?.roiCollected ?? result?.scoreSummary?.roiCollected),
    uncertaintyReduction: finiteOrNull(scoreComponents.uncertaintyReduction ?? science?.uncertaintyReduction),
    forecastValidation: finiteOrNull(scoreComponents.forecastErrorDetection ?? science?.forecastValidationScore ?? science?.discoverySummary?.confidence),
    hiddenEventConfirmation: hiddenEventScore(science),
    sourceLocalization: finiteOrNull(science?.sourceLocalizationScore ?? science?.hiddenEventHypothesis?.regionConfidence),
    boundaryMapping: finiteOrNull(scoreComponents.boundarySamplingBonus ?? science?.boundaryMappingScore),
    featureTracking: finiteOrNull(science?.featureTrackingScore),
    stalenessRevisit: finiteOrNull(scoreComponents.stalenessRevisit ?? science?.stalenessRevisitScore),
    verticalCoverage: verticalCoverageScore(water),
    observationDiversity: diversityScore(obs, scoreCounts),
    samplingRedundancy: redundancyScore(obs, scoreCounts),
    missionCompletion: binaryCompletion(result, feasibility, planned),
    waypointCompletion: waypointCompletionScore(feasibility, planned, routeExecution),
    arrivalStatus: arrivalStatusScore(feasibility, planned),
    motionFeasibility: motionFeasibilityScore(feasibility, motion),
    trackError: finiteOrNull(feasibility?.meanTrackError ?? planned.meanTrackError ?? motionSummary.trackErrorMean),
    bottomClearance: clearanceQuality(feasibility),
    constraintCompliance: constraintCompliance(feasibility, scoreCounts),
    communicationCompletion: communicationCompletionScore(feasibility, result, adaptiveSession),
    energyEfficiency: energyEfficiency(scoreComponents, feasibility, scoreReport),
    energyRemaining: finiteOrNull(feasibility?.batteryFraction ?? motion?.energySummary?.batteryFraction ?? result?.summary?.batteryFraction),
    missionDuration: finiteOrNull(feasibility?.missionDurationSeconds ?? result?.summary?.simTime ?? result?.summary?.durationSeconds),
    realizedDistance: finiteOrNull(feasibility?.realizedDistance ?? planned.realizedDistance ?? routeExecution?.metrics?.distanceTraveled ?? result?.summary?.distanceTraveled),
    currentUtilization: currentUtilization(feasibility, planned, motionSummary),
    controlEffort: finiteOrNull(motionSummary.controlEffort ?? motion?.controlEffort),
    payloadEfficiency: payloadEfficiency(feasibility, scoreComponents),
    hazardExposure: finiteOrNull(scoreCounts.hazardExposures ?? result?.summary?.hazardsHit ?? result?.risk?.hazardsHit ?? routeExecution?.metrics?.hazards),
    constraintViolations: finiteOrNull(feasibility?.constraintViolations ?? scoreCounts.maskViolations),
    bottomClearanceWarnings: finiteOrNull(feasibility?.bottomClearanceWarnings),
    collisionRisk: finiteOrNull(result?.summary?.collisions ?? routeExecution?.metrics?.collisions ?? 0),
    communicationLoss: finiteOrNull(result?.summary?.communicationLoss ?? 0),
    objectiveTransitionQuality: finiteOrNull(adaptiveSession?.summary?.objectiveTransitionQuality ?? result?.adaptiveScienceContext?.objectiveTransitionQuality),
    evidenceFollowupQuality: evidenceFollowupQuality(science, obs),
    surfacingDecisionQuality: finiteOrNull(adaptiveSession?.summary?.surfacingDecisionQuality ?? result?.adaptiveScienceContext?.surfacingDecisionQuality),
    cooperativeCoverage: finiteOrNull(result?.fleetMetrics?.cooperativeCoverage),
    fleetRedundancy: finiteOrNull(result?.fleetMetrics?.fleetRedundancy),
    contributionBalance: finiteOrNull(result?.fleetMetrics?.contributionBalance),
    communicationCoordination: finiteOrNull(result?.fleetMetrics?.communicationCoordination)
  };
  const metrics = MISSION_SCORE_COMPONENTS.map((component) => createMetricEntry(component, metricValues[component.id], {
    dataSource: defaultDataSource(component, metricValues[component.id]),
    confidence: confidenceFor(component, metricValues[component.id]),
    caveats: caveatsFor(component, metricValues[component.id]),
    metadata: sourceMetadata(component, { scoreReport, feasibility, water, science, motion })
  }));
  const missingMetrics = metrics.filter((metric) => !metric.available).map((metric) => metric.componentId);
  const sourceArtifacts = compactSources({ result, benchmarkRunRecord, routeExecution, motionTrajectory: motion, motionDiagnostics, missionFeasibilityReport: feasibility, waterColumnSummary: water, scienceDiagnostics: science, adaptiveSession, observations: obs });
  const record = {
    type: 'anchor.benchmark.mission-outcome-metrics',
    version: MISSION_OUTCOME_METRIC_ADAPTER_VERSION,
    missionId,
    episodeId,
    attemptId,
    objectiveId,
    visibilityTier: options.visibilityTier ?? result?.visibilityTier ?? result?.benchmarkMetadata?.informationAccessTier ?? 'publicScenario',
    metrics,
    missingMetrics,
    warnings: missingMetrics.length ? [`${missingMetrics.length} SCORE-R1 metrics are unavailable and earn no credit.`] : [],
    sourceArtifacts,
    publicSafe: true,
    changesOfficialBrowserScoring: false
  };
  return record;
}

export function missionOutcomeMetricSummary(record = {}) {
  const metrics = Array.isArray(record?.metrics) ? record.metrics : [];
  return {
    type: 'anchor.benchmark.mission-outcome-metrics-summary',
    version: MISSION_OUTCOME_METRIC_ADAPTER_VERSION,
    missionId: record?.missionId ?? null,
    episodeId: record?.episodeId ?? null,
    attemptId: record?.attemptId ?? null,
    objectiveId: record?.objectiveId ?? null,
    visibilityTier: record?.visibilityTier ?? null,
    metricCount: metrics.length,
    availableMetricCount: metrics.filter((metric) => metric.available).length,
    missingMetricCount: (record?.missingMetrics ?? []).length,
    publicSafe: record?.publicSafe !== false
  };
}

export function validateMissionOutcomeMetrics(record = {}) {
  const errors = [];
  const warnings = [];
  if (!record || typeof record !== 'object') errors.push('Mission outcome metric record must be an object.');
  if (record?.type !== 'anchor.benchmark.mission-outcome-metrics') errors.push(`Expected anchor.benchmark.mission-outcome-metrics, got ${record?.type ?? 'missing'}.`);
  if (!Array.isArray(record?.metrics)) errors.push('Metric record must include metrics[].');
  for (const metric of record?.metrics ?? []) {
    if (!missionScoreComponentById(metric.componentId)) errors.push(`Unknown metric component ${metric.componentId}.`);
    if (metric.available === true && metric.rawValue !== null && !Number.isFinite(Number(metric.rawValue)) && typeof metric.rawValue !== 'boolean') errors.push(`${metric.componentId} rawValue must be finite, boolean, or null.`);
    if (metric.refereeOnlyDerived === true && !['refereeOnlyDerived', 'oracleDerived', 'debugOnly'].includes(metric.dataSource)) warnings.push(`${metric.componentId} is referee-only but not labelled with referee/oracle/debug data source.`);
  }
  if (JSON.stringify(record).includes('T_hiddenTruth')) errors.push('Mission outcome metrics must not expose T_hiddenTruth.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

function createMetricEntry(component, rawValue, options = {}) {
  const available = rawValue !== null && rawValue !== undefined && (typeof rawValue === 'boolean' || Number.isFinite(Number(rawValue)));
  return {
    componentId: component.id,
    rawValue: available ? (typeof rawValue === 'boolean' ? rawValue : round(Number(rawValue))) : null,
    unit: component.unit,
    dataSource: options.dataSource ?? 'publicMissionRecord',
    available,
    confidence: available ? clamp01(options.confidence, 0.75) : 0,
    caveats: options.caveats ?? (available ? [] : [component.missingDataMeaning]),
    refereeOnlyDerived: component.refereeOnly === true,
    metadata: options.metadata ?? {}
  };
}

function defaultDataSource(component, rawValue) {
  if (component.refereeOnly) return 'refereeOnlyDerived';
  if (rawValue === null || rawValue === undefined) return component.dataSources[0] ?? 'publicMissionRecord';
  return component.dataSources.find((source) => !['refereeOnlyDerived', 'oracleDerived', 'debugOnly'].includes(source)) ?? component.dataSources[0] ?? 'publicMissionRecord';
}

function confidenceFor(component, value) {
  if (value === null || value === undefined) return 0;
  if (component.refereeOnly) return 0.65;
  return 0.8;
}

function caveatsFor(component, value) {
  if (value === null || value === undefined) return [component.missingDataMeaning];
  return component.refereeOnly ? ['Post-mission scalar summary; raw hidden truth is not exported.'] : [];
}

function sourceMetadata(component, sources) {
  return {
    componentGroup: component.groupId,
    hasScoreReport: Boolean(sources.scoreReport),
    hasFeasibilityReport: Boolean(sources.feasibility),
    hasWaterColumnSummary: Boolean(sources.water),
    hasScienceDiagnostics: Boolean(sources.science),
    hasMotionTrajectory: Boolean(sources.motion)
  };
}

function compactSources(sources) {
  const result = {};
  for (const [key, value] of Object.entries(sources)) {
    if (key === 'observations') result.observations = { present: Array.isArray(value), count: value?.length ?? 0 };
    else result[key] = { present: Boolean(value), type: value?.type ?? null, version: value?.version ?? null };
  }
  return result;
}

function objectiveIdFrom(objective, result, benchmarkRunRecord, options) {
  if (typeof objective === 'string') return objective;
  return objective?.id ?? objective?.objectiveId ?? options.objectiveId ?? result?.objectiveId ?? result?.missionObjectiveId ?? result?.benchmarkMetadata?.objectiveId ?? benchmarkRunRecord?.objectiveId ?? 'reconnaissanceSurvey';
}

function hiddenEventScore(science) {
  const status = String(science?.hiddenEventHypothesis?.status ?? science?.discoverySummary?.hiddenEventStatus ?? science?.primaryDiagnosis ?? '');
  if (/confirmed/i.test(status)) return 1;
  if (/likely|possible|mixed/i.test(status)) return finiteOrNull(science?.confidence) ?? 0.55;
  return null;
}

function verticalCoverageScore(summary) {
  if (!summary) return null;
  const direct = finiteOrNull(summary.coverageFraction ?? summary.observationSummary?.coverageFraction);
  if (direct !== null) return direct;
  const text = String(summary.verticalCoverage ?? summary.observationSummary?.verticalCoverage ?? '').toLowerCase();
  if (text === 'broad') return 1;
  if (text === 'partial') return 0.55;
  if (text === 'narrow') return 0.25;
  return null;
}

function diversityScore(observations, counts) {
  const count = Number(counts?.observationCount ?? observations.length ?? 0);
  if (!count) return null;
  const unique = Number(counts?.uniqueSampleCells ?? uniqueObservationCells(observations));
  return clamp01(unique / count);
}

function redundancyScore(observations, counts) {
  const count = Number(counts?.observationCount ?? observations.length ?? 0);
  if (!count) return null;
  const duplicates = Number(counts?.duplicateSamples ?? Math.max(0, count - uniqueObservationCells(observations)));
  return clamp01(duplicates / count);
}

function binaryCompletion(result, feasibility, planned) {
  const status = String(result?.summary?.status ?? result?.status ?? feasibility?.feasibilityStatus ?? planned.arrivalStatus ?? '').toLowerCase();
  if (/complete|success|feasible|arrived|pass/.test(status)) return true;
  if (/fail|incomplete|missed|invalid/.test(status)) return false;
  return null;
}

function waypointCompletionScore(feasibility, planned, routeExecution) {
  const plannedCount = Number(feasibility?.waypointValidation?.plannedWaypointCount ?? routeExecution?.waypointCount ?? 0);
  const missed = Number(feasibility?.waypointValidation?.missedWaypointCount ?? planned.missedWaypointCount ?? routeExecution?.metrics?.missedWaypointEvents ?? 0);
  if (!plannedCount) return null;
  return clamp01((plannedCount - missed) / plannedCount);
}

function arrivalStatusScore(feasibility, planned) {
  const status = String(feasibility?.waypointValidation?.arrivalStatus ?? planned.arrivalStatus ?? '').toLowerCase();
  if (/arrived|complete|feasible/.test(status)) return true;
  if (/incomplete|missed|failed/.test(status)) return false;
  return null;
}

function motionFeasibilityScore(feasibility, motion) {
  if (!feasibility && !motion) return null;
  const status = String(feasibility?.feasibilityStatus ?? motion?.plannedVsRealized?.arrivalStatus ?? '').toLowerCase();
  return /feasible|arrived/.test(status) && Number(feasibility?.constraintViolations ?? 0) === 0;
}

function clearanceQuality(feasibility) {
  if (!feasibility) return null;
  return Number(feasibility.bottomClearanceWarnings ?? 0) <= 0 ? 1 : 0;
}

function constraintCompliance(feasibility, counts) {
  const violations = Number(feasibility?.constraintViolations ?? counts?.maskViolations ?? NaN);
  if (!Number.isFinite(violations)) return null;
  return violations <= 0 ? 1 : Math.max(0, 1 - violations / 5);
}

function communicationCompletionScore(feasibility, result, adaptiveSession) {
  const loss = Number(result?.summary?.communicationLoss ?? adaptiveSession?.summary?.communicationLoss ?? 0);
  if (Number.isFinite(loss)) return loss <= 0;
  return feasibility ? true : null;
}

function energyEfficiency(scoreComponents, feasibility, scoreReport) {
  const value = Number(scoreComponents.scienceValueCollected ?? scoreReport?.finalScore ?? NaN);
  const energy = Number(feasibility?.energyUsed ?? scoreComponents.energyUsed ?? NaN);
  if (!Number.isFinite(value) || !Number.isFinite(energy) || energy <= 0) return null;
  return Math.max(0, value / energy);
}

function currentUtilization(feasibility, planned, motionSummary) {
  const assist = Number(feasibility?.currentAssistMean ?? planned.currentAssistMean ?? motionSummary.currentAssistMean ?? 0);
  const opposition = Number(feasibility?.currentOppositionMean ?? motionSummary.currentOppositionMean ?? 0);
  if (!Number.isFinite(assist) || !Number.isFinite(opposition)) return null;
  return clamp01(0.5 + assist - opposition);
}

function payloadEfficiency(feasibility, scoreComponents) {
  const value = Number(scoreComponents.scienceValueCollected ?? NaN);
  const payload = Number(feasibility?.payloadEnergyEstimate ?? NaN);
  if (!Number.isFinite(value) || !Number.isFinite(payload) || payload <= 0) return null;
  return value / payload;
}

function evidenceFollowupQuality(science, observations) {
  const confidence = finiteOrNull(science?.confidence ?? science?.discoverySummary?.confidence);
  if (confidence !== null) return confidence;
  return observations.length >= 3 ? 0.5 : null;
}

function uniqueObservationCells(observations) {
  const cells = new Set();
  for (const observation of observations ?? []) cells.add(`${Math.round(Number(observation.x ?? 0))}:${Math.round(Number(observation.y ?? 0))}:${Math.round(Number(observation.zIndex ?? 0))}`);
  return cells.size;
}

function finiteOrNull(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp01(value, fallback = 0) {
  const number = Number.isFinite(Number(value)) ? Number(value) : fallback;
  return Math.max(0, Math.min(1, number));
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}
