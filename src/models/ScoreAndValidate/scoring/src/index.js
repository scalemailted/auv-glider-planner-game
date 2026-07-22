 const PACKAGE_VERSION = 'anchor-scoring-score-pkg-r1';
 const SCORING_PACKAGE_VERSION = PACKAGE_VERSION;

 const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/scoring',
  owns: [
    'score profile definitions',
    'score component definitions',
    'score normalization',
    'official mission score aggregation',
    'deterministic ScoreInput and ScoreResult digests',
    'public-safe score summaries',
    'score methodology metadata',
    'educational headless score report compatibility'
  ],
  dependsOn: ['@anchor/contracts', '@anchor/mission-simulator'],
  doesNotOwn: [
    'environment generation',
    'planning',
    'simulation transitions',
    'renderer state',
    'UI state',
    'planner algorithms',
    'benchmark solver execution',
    'leaderboard persistence',
    'hidden-truth visibility policy',
    'ML training',
    'RL reward scheduling'
  ]
});

 function packageBoundarySummary() {
  return {
    package: PACKAGE_BOUNDARY.package,
    version: PACKAGE_VERSION,
    owns: PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: PACKAGE_BOUNDARY.doesNotOwn.slice()
  };
}

const ScoreContracts = require('./ScoreContracts.js');
const OfficialScore = require('./OfficialScore.js');
const HeadlessScoreReport = require('./HeadlessScoreReport.js');
const MissionScoringSchema = require('./MissionScoringSchema.js');
const MissionScoreComponents = require('./MissionScoreComponents.js');
const MissionScoreProfiles = require('./MissionScoreProfiles.js');
const MissionScoreNormalizer = require('./MissionScoreNormalizer.js');
const MissionScoreAggregator = require('./MissionScoreAggregator.js');
const MissionOutcomeMetricAdapter = require('./MissionOutcomeMetricAdapter.js');
const MissionOutcomeReport = require('./MissionOutcomeReport.js');
const MissionRegretModel = require('./MissionRegretModel.js');
const MissionScorePublicSafety = require('./MissionScorePublicSafety.js');
const MissionScorecardViewModel = require('./MissionScorecardViewModel.js');

module.exports = {PACKAGE_VERSION, SCORING_PACKAGE_VERSION, PACKAGE_BOUNDARY, packageBoundarySummary}