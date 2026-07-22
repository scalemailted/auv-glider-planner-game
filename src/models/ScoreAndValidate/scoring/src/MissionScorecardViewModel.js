const MissionOutcomeReport = require('./MissionOutcomeReport.js')
const MissionRegretModel = require('./MissionRegretModel.js')
const MISSION_SCORECARD_VIEW_MODEL_VERSION = 'mission-scorecard-view-model-score-r1';

 function buildMissionScorecardViewModel({ missionOutcomeReport = null, regretReport = null, scoreProfile = null, options = {} } = {}) {
  const summary = MissionOutcomeReport.missionOutcomeReportSummary(missionOutcomeReport ?? {});
  const regret = regretReport ? MissionRegretModel.missionRegretReportSummary(regretReport) : missionOutcomeReport?.regretSummary ?? null;
  const groupScores = missionOutcomeReport?.groupScores ?? [];
  const missingMetrics = missionOutcomeReport?.missingMetrics ?? [];
  return {
    type: 'anchor.benchmark.mission-scorecard-view-model',
    version: MISSION_SCORECARD_VIEW_MODEL_VERSION,
    present: missionOutcomeReport?.type === 'anchor.benchmark.mission-outcome-report',
    title: 'Mission Outcome Scorecard',
    compositeScore: missionOutcomeReport?.compositeScore ?? null,
    scoreStatus: missionOutcomeReport?.scoreStatus ?? null,
    scoreProfileId: missionOutcomeReport?.scoreProfile?.profileId ?? scoreProfile?.id ?? null,
    scoreProfileVersion: missionOutcomeReport?.scoreProfile?.profileVersion ?? scoreProfile?.version ?? null,
    scoreProfileLabel: missionOutcomeReport?.scoreProfile?.label ?? scoreProfile?.label ?? null,
    visibilityTier: missionOutcomeReport?.visibilityTier ?? null,
    scienceScore: missionOutcomeReport?.scienceScore ?? null,
    feasibilityScore: missionOutcomeReport?.feasibilityScore ?? null,
    efficiencyScore: missionOutcomeReport?.efficiencyScore ?? null,
    safetyScore: missionOutcomeReport?.safetyScore ?? null,
    missionManagementScore: missionOutcomeReport?.missionManagementScore ?? null,
    fleetCoordinationScore: missionOutcomeReport?.fleetCoordinationScore ?? null,
    groupScores,
    coverageFraction: missionOutcomeReport?.coverageFraction ?? 0,
    missingMetrics,
    missingMetricCount: missingMetrics.length,
    strongestOutcome: missionOutcomeReport?.explanations?.strongestOutcome ?? summary.strongestOutcome ?? null,
    largestOpportunity: missionOutcomeReport?.explanations?.largestWeakness ?? summary.largestOpportunity ?? null,
    regretSummary: regret,
    regretAvailable: Boolean(regret && regret.totalRegret !== null),
    fairnessSummary: missionOutcomeReport?.fairnessSummary ?? {},
    warnings: missionOutcomeReport?.warnings ?? [],
    boundaryCopy: [
      'This is the SCORE-R1 shadow benchmark score. It does not replace the current official browser score.',
      'Scores are interpreted using the selected mission objective and score profile.',
      'Missing metrics are reported explicitly; they are not silently treated as zero.',
      'Regret compares only compatible attempts or an explicitly labelled reference.'
    ],
    changesOfficialBrowserScoring: false,
    usesMissionOutcomeScoring: missionOutcomeReport?.type === 'anchor.benchmark.mission-outcome-report',
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  };
}

 function missionScorecardViewModelSummary(viewModel = {}) {
  return {
    type: 'anchor.benchmark.mission-scorecard-view-model-summary',
    version: MISSION_SCORECARD_VIEW_MODEL_VERSION,
    present: viewModel.present === true,
    scoreProfileId: viewModel.scoreProfileId ?? null,
    scoreProfileVersion: viewModel.scoreProfileVersion ?? null,
    compositeScore: viewModel.compositeScore ?? null,
    coverageFraction: viewModel.coverageFraction ?? 0,
    missingMetricCount: viewModel.missingMetricCount ?? 0,
    regretAvailable: viewModel.regretAvailable === true,
    changesOfficialBrowserScoring: false
  };
}

module.exports = {buildMissionScorecardViewModel, missionScorecardViewModelSummary}