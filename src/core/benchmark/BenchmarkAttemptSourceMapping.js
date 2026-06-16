import { normalizeBenchmarkAttemptSource } from './BenchmarkEpisodeContract.js';
import { informationAccessTierById } from './BenchmarkModeContract.js';

export const BENCHMARK_ATTEMPT_SOURCE_MAPPING_VERSION = 'benchmark-attempt-source-mapping-p2';

const ROUTE_LABEL_BY_SOURCE = {
  manualPlayer: 'Manual Player Plan',
  greedyPlanner: 'Greedy Planner',
  importedSolver: 'Imported Solver',
  externalSolver: 'External Solver',
  oraclePlanner: 'Oracle Planner Reference',
  benchmarkPlaceholder: 'Benchmark Placeholder'
};

export function attemptSourceFromRouteSourceLabel(label) {
  const value = String(label ?? '').trim();
  const normalized = value.toLowerCase();
  const aliases = {
    manual: 'manualPlayer',
    player: 'manualPlayer',
    manualplayer: 'manualPlayer',
    'manual player': 'manualPlayer',
    'manual player plan': 'manualPlayer',
    temporalgreedy: 'greedyPlanner',
    'temporal greedy': 'greedyPlanner',
    greedy: 'greedyPlanner',
    greedyplanner: 'greedyPlanner',
    'greedy planner': 'greedyPlanner',
    greedybaseline: 'greedyPlanner',
    'legacy greedy result': 'greedyPlanner',
    imported: 'importedSolver',
    importedsolver: 'importedSolver',
    'imported solver': 'importedSolver',
    'imported solver plan': 'importedSolver',
    solver: 'importedSolver',
    oracle: 'oraclePlanner',
    oraclesolver: 'oraclePlanner',
    'oracle solver': 'oraclePlanner',
    oracleplanner: 'oraclePlanner',
    'oracle planner': 'oraclePlanner',
    external: 'externalSolver',
    externalsolver: 'externalSolver',
    'external solver': 'externalSolver',
    loadedfrombestpriorrun: 'benchmarkPlaceholder',
    'loaded best prior path': 'benchmarkPlaceholder',
    bestpriorrerun: 'benchmarkPlaceholder',
    'best prior path rerun': 'benchmarkPlaceholder'
  };
  if (aliases[normalized]) return aliases[normalized];
  if (/oracle|truth/.test(normalized)) return 'oraclePlanner';
  if (/greedy/.test(normalized)) return 'greedyPlanner';
  if (/import|solver|external|policy/.test(normalized)) return 'importedSolver';
  if (/manual|player/.test(normalized)) return 'manualPlayer';
  return normalizeBenchmarkAttemptSource(value || 'benchmarkPlaceholder');
}

export function routeSourceLabelFromAttemptSource(source) {
  return ROUTE_LABEL_BY_SOURCE[normalizeBenchmarkAttemptSource(source)] ?? ROUTE_LABEL_BY_SOURCE.benchmarkPlaceholder;
}

export function fairnessLabelFromAttemptSourceAndAccess(source, accessTier = 'forecastOnly') {
  const attemptSource = normalizeBenchmarkAttemptSource(source);
  if (attemptSource === 'oraclePlanner') return informationAccessTierById('oracleTruth').fairnessLabel;
  return informationAccessTierById(accessTier).fairnessLabel;
}

