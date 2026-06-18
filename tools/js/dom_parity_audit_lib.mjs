import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LEGACY_PRODUCTION_CONTENT_MANIFEST, productionContentManifestForRoute } from '../../src/app/parity/LegacyProductionContentManifest.js';

export const ROUTE_VIEW_SOURCES = Object.freeze({
  mainMenu: 'src/app/views/MainMenuView.js',
  missionSetup: 'src/app/views/MissionSetupView.js',
  missionBriefing: 'src/app/views/MissionBriefingView.js',
  missionPlanning: 'src/app/views/MissionPlanningView.js',
  missionSimulation: 'src/app/views/MissionSimulationView.js',
  missionDebrief: 'src/app/views/MissionDebriefView.js',
  importExport: 'src/app/views/ImportExportView.js',
  leaderboard: 'src/app/views/LeaderboardView.js',
  tutorialBrowser: 'src/app/views/TutorialBrowserView.js'
});

export function readText(file) {
  return readFileSync(file, 'utf8');
}

export function assertRouteSourceContains(routeId, tokens = []) {
  const file = ROUTE_VIEW_SOURCES[routeId];
  assert.ok(file, `No source mapped for ${routeId}`);
  const source = readText(file);
  for (const token of tokens) assert.ok(source.includes(token), `${file} missing ${token}`);
  return { routeId, file, tokenCount: tokens.length };
}

export function assertManifestRoute(routeId) {
  const entry = productionContentManifestForRoute(routeId);
  assert.ok(entry, `Manifest missing route ${routeId}`);
  assert.ok(entry.legacySceneId, `${routeId} missing legacy scene`);
  assert.ok(entry.layoutId, `${routeId} missing layout`);
  return entry;
}

export function routeContentTokens(routeId) {
  const entry = assertManifestRoute(routeId);
  return [...(entry.requiredControls ?? []), ...(entry.requiredHeadings ?? [])];
}

export function assertRouteContentParity(routeId, extraTokens = []) {
  const tokens = routeContentTokens(routeId).filter((token) => token !== 'Mission Waypoints');
  return assertRouteSourceContains(routeId, [...tokens, ...extraTokens]);
}

export function allManifestRoutes() {
  return LEGACY_PRODUCTION_CONTENT_MANIFEST.map((entry) => entry.routeId);
}
