import { buildChallengeExport, parseChallengeImport } from './ChallengeExporter.js';
import { buildSolverPacket } from './SolverPacketExporter.js';
import { importPlanJson } from './PlanImporter.js';
import { buildResultExport } from './ResultExporter.js';
import { buildOracleDatasetExport } from './OracleDatasetExporter.js';
import { importOracleDatasetJson } from './OracleDatasetImporter.js';
import { buildLeaderboardExport } from './LeaderboardExporter.js';
import { importResultJson } from './ResultImporter.js';
import { loadLeaderboard } from '../storage/LeaderboardStore.js';
import { saveChallengeToLocalStore, loadChallengeFromLocalStore } from '../storage/LocalChallengeStore.js';

export function exportChallenge(gameState, options = {}) {
  return buildChallengeExport({
    level: gameState?.level,
    mission: gameState?.mission,
    challengeMode: gameState?.challengeMode,
    experienceMode: gameState?.experienceMode,
    includeHiddenTruth: Boolean(options.includeHiddenTruth)
  });
}

export function importChallengeJson(json) {
  return parseChallengeImport(json);
}

export function exportSolverPacket(gameState, options = {}) {
  return buildSolverPacket({
    level: gameState?.level,
    mission: gameState?.mission,
    plan: gameState?.plan,
    challengeMode: gameState?.challengeMode,
    experienceMode: gameState?.experienceMode,
    includeHiddenTruth: Boolean(options.oracleMode),
    forecastMemberId: gameState?.ui?.forecastMemberId,
    roiViewMode: gameState?.ui?.roiViewMode,
    stochasticConfig: gameState?.stochastic
  });
}

export function importPlanJsonToState(json, gameState, options = {}) {
  return importPlanJson(json, {
    level: gameState?.level,
    mission: gameState?.mission,
    routeValidation: options.routeValidation !== false
  });
}

export function exportPlan(gameState) {
  return gameState?.plan ?? null;
}

export function exportResult(gameState) {
  return buildResultExport({
    level: gameState?.level,
    mission: gameState?.mission,
    plan: gameState?.plan,
    result: gameState?.result,
    experienceMode: gameState?.experienceMode,
    label: gameState?.currentPlanSource ?? 'Manual Player Plan'
  });
}

export function importResultJsonToState(json, gameState) {
  return importResultJson(json, gameState);
}

export function exportOracleDataset(gameState, options = {}) {
  return buildOracleDatasetExport({
    level: gameState?.level,
    mission: gameState?.mission,
    plan: gameState?.plan,
    result: gameState?.result,
    challengeMode: gameState?.challengeMode,
    forecastMemberId: gameState?.ui?.forecastMemberId,
    roiViewMode: gameState?.ui?.roiViewMode,
    stochasticConfig: gameState?.stochastic,
    attempts: options.attempts ?? []
  });
}

export function importOracleDataset(json, options = {}) {
  return importOracleDatasetJson(json, options);
}

export function exportLeaderboard(store = loadLeaderboard()) {
  return buildLeaderboardExport(store);
}

export { saveChallengeToLocalStore, loadChallengeFromLocalStore };
