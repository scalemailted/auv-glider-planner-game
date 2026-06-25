import { missionScoreAggregationSummary } from './MissionScoreAggregator.js';
import { missionRegretReportSummary } from './MissionRegretModel.js';

export const MISSION_OUTCOME_REPORT_VERSION = 'mission-outcome-report-score-r1';

export function buildMissionOutcomeReport({ scoreConfig, profile, metrics, normalizedMetrics, missionScore, regretReport = null, sourceArtifacts = null, options = {} } = {}) {
  const scoreSummary = missionScoreAggregationSummary(missionScore);
  const group = (id) => (missionScore?.groupScores ?? []).find((entry) => entry.groupId === id)?.score ?? null;
  const componentScores = missionScore?.componentScores ?? [];
  const strongest = strongestOutcome(componentScores);
  const weakest = largestWeakness(componentScores);
  return {
    type: 'anchor.benchmark.mission-outcome-report',
    version: MISSION_OUTCOME_REPORT_VERSION,
    missionId: metrics?.missionId ?? options.missionId ?? null,
    episodeId: metrics?.episodeId ?? options.episodeId ?? null,
    attemptId: metrics?.attemptId ?? options.attemptId ?? null,
    objectiveId: metrics?.objectiveId ?? scoreConfig?.objectiveId ?? options.objectiveId ?? null,
    visibilityTier: metrics?.visibilityTier ?? scoreConfig?.visibilityTier ?? 'publicScenario',
    scoreProfile: {
      profileId: profile?.id ?? scoreConfig?.profileId ?? null,
      profileVersion: profile?.version ?? scoreConfig?.profileVersion ?? null,
      label: profile?.label ?? scoreConfig?.profileId ?? null
    },
    scoreStatus: missionScore?.status ?? 'invalid',
    compositeScore: missionScore?.compositeScore ?? null,
    scienceScore: group('science'),
    feasibilityScore: group('feasibility'),
    efficiencyScore: group('efficiency'),
    safetyScore: group('safety'),
    missionManagementScore: group('missionManagement'),
    fleetCoordinationScore: group('fleetCoordination'),
    groupScores: missionScore?.groupScores ?? [],
    componentScores,
    coverageFraction: missionScore?.coverageFraction ?? 0,
    missingMetrics: metrics?.missingMetrics ?? normalizedMetrics?.missingMetrics ?? [],
    regretSummary: regretReport ? missionRegretReportSummary(regretReport) : null,
    fairnessSummary: {
      profileId: profile?.id ?? scoreConfig?.profileId ?? null,
      profileVersion: profile?.version ?? scoreConfig?.profileVersion ?? null,
      visibilityTier: metrics?.visibilityTier ?? scoreConfig?.visibilityTier ?? null,
      compatibleComparisonRequired: true,
      bestKnownAttemptIsNotOptimalProof: true,
      changesOfficialBrowserScoring: false
    },
    explanations: {
      strongestOutcome: strongest ? `${strongest.componentId} contributed the strongest available normalized component (${format(strongest.normalizedValue)}).` : 'No strongest outcome is available because component scores are missing.',
      largestWeakness: weakest ? `${weakest.componentId} is the largest available opportunity or missing component.` : 'No largest opportunity is available.',
      insufficientDataCaveat: missionScore?.status === 'insufficientData' ? 'Coverage was below the profile minimum, so the composite score is withheld.' : 'Data coverage met the selected profile threshold.',
      regretReferenceExplanation: regretReport ? regretReferenceText(regretReport) : 'No compatible regret reference was available.',
      missionObjectiveInterpretation: `Scores are interpreted using objective ${metrics?.objectiveId ?? scoreConfig?.objectiveId ?? 'unknown'} and profile ${profile?.id ?? scoreConfig?.profileId ?? 'unknown'}.`
    },
    scoreSummary,
    sourceArtifacts: sourceArtifacts ?? metrics?.sourceArtifacts ?? {},
    warnings: [...(missionScore?.warnings ?? []), ...(metrics?.warnings ?? [])],
    publicSafe: true,
    changesOfficialBrowserScoring: false,
    notA: ['not official browser scoring', 'not route planning', 'not route optimization', 'not operational certification', 'not SeaExplorer-validated', 'not MARL/RL']
  };
}

export function validateMissionOutcomeReport(report = {}) {
  const errors = [];
  const warnings = [];
  if (!report || typeof report !== 'object') errors.push('Mission outcome report must be an object.');
  if (report?.type !== 'anchor.benchmark.mission-outcome-report') errors.push(`Expected anchor.benchmark.mission-outcome-report, got ${report?.type ?? 'missing'}.`);
  if (report?.changesOfficialBrowserScoring !== false) errors.push('Mission outcome report must mark changesOfficialBrowserScoring=false.');
  if (!report?.scoreProfile?.profileId) errors.push('Mission outcome report must include scoreProfile.profileId.');
  if (!Number.isFinite(Number(report?.coverageFraction))) errors.push('Mission outcome report must include finite coverageFraction.');
  if (JSON.stringify(report).includes('T_hiddenTruth')) errors.push('Mission outcome report must not expose hidden truth identifiers.');
  if (!report?.regretSummary) warnings.push('No regret reference was available.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function missionOutcomeReportSummary(report = {}) {
  return {
    type: 'anchor.benchmark.mission-outcome-summary',
    version: MISSION_OUTCOME_REPORT_VERSION,
    present: report?.type === 'anchor.benchmark.mission-outcome-report',
    missionId: report?.missionId ?? null,
    episodeId: report?.episodeId ?? null,
    attemptId: report?.attemptId ?? null,
    objectiveId: report?.objectiveId ?? null,
    scoreProfileId: report?.scoreProfile?.profileId ?? null,
    scoreProfileVersion: report?.scoreProfile?.profileVersion ?? null,
    scoreStatus: report?.scoreStatus ?? null,
    compositeScore: report?.compositeScore ?? null,
    scienceScore: report?.scienceScore ?? null,
    feasibilityScore: report?.feasibilityScore ?? null,
    efficiencyScore: report?.efficiencyScore ?? null,
    safetyScore: report?.safetyScore ?? null,
    coverageFraction: report?.coverageFraction ?? 0,
    missingMetricCount: report?.missingMetrics?.length ?? 0,
    strongestOutcome: report?.explanations?.strongestOutcome ?? null,
    largestOpportunity: report?.explanations?.largestWeakness ?? null,
    regretSummary: report?.regretSummary ?? null,
    usesMissionOutcomeScoring: report?.type === 'anchor.benchmark.mission-outcome-report',
    changesOfficialBrowserScoring: false
  };
}

function strongestOutcome(componentScores) {
  return componentScores.filter((score) => score.available && Number.isFinite(Number(score.normalizedValue))).sort((a, b) => Number(b.normalizedValue) - Number(a.normalizedValue))[0] ?? null;
}

function largestWeakness(componentScores) {
  return componentScores.filter((score) => !score.available || Number.isFinite(Number(score.normalizedValue))).sort((a, b) => Number(a.normalizedValue ?? -1) - Number(b.normalizedValue ?? -1))[0] ?? null;
}

function regretReferenceText(report) {
  if (!report || report.compatibilityStatus === 'missingReference') return 'No compatible regret reference was available.';
  if (report.referenceType === 'bestKnownCompatibleAttempt') return 'Regret compares against the best-known compatible attempt; this is not a proof of optimality.';
  if (report.referenceType === 'oracleAttemptIfAvailable') return 'Regret compares against an explicitly labelled oracle attempt.';
  return `Regret compares against ${report.referenceType}.`;
}

function format(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : 'N/A';
}
