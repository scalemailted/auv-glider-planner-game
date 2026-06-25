export const PACKAGE_VERSION = 'anchor-scoring-score-pkg-r1';
export const SCORING_PACKAGE_VERSION = PACKAGE_VERSION;

export const PACKAGE_BOUNDARY = Object.freeze({
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

export function packageBoundarySummary() {
  return {
    package: PACKAGE_BOUNDARY.package,
    version: PACKAGE_VERSION,
    owns: PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: PACKAGE_BOUNDARY.doesNotOwn.slice()
  };
}

export * from './ScoreContracts.js';
export * from './OfficialScore.js';
export * from './HeadlessScoreReport.js';
export * from './MissionScoringSchema.js';
export * from './MissionScoreComponents.js';
export * from './MissionScoreProfiles.js';
export * from './MissionScoreNormalizer.js';
export * from './MissionScoreAggregator.js';
export * from './MissionOutcomeMetricAdapter.js';
export * from './MissionOutcomeReport.js';
export * from './MissionRegretModel.js';
export * from './MissionScorePublicSafety.js';
export * from './MissionScorecardViewModel.js';
