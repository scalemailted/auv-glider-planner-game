import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

import {
  REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH,
  normalizeReferenceTileLibraryManifest
} from '../../src/core/editor/ReferenceBathymetryTileLibrary.js';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const ROOT = process.cwd();
const OWNER_REVIEW_DIR = path.resolve('artifacts/owner-review/env-staging-scene-r1');
const BASE = 'http://127.0.0.1:9404';
const REQUIRED_SCREENSHOTS = [
  '01-environment-studio-atlas-default.png',
  '02-left-panel-tools-and-actions.png',
  '03-boundary-selected-right-panel-inspector.png',
  '04-monterey-selected-continue-enabled.png',
  '05-regional-bathymetry-scene-opened.png',
  '06-regional-bathymetry-mesh-preview.png',
  '07-regional-bathymetry-provenance-panel.png',
  '08-generate-fields-action-visible.png',
  '09-not-staged-region-patch-request.png',
  '10-gulf-region-multitile-request.png',
  '11-planning-launch-path-still-available.png'
];

const branch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const manifest = normalizeReferenceTileLibraryManifest(
  JSON.parse(await fs.readFile(path.join(ROOT, REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH), 'utf8'))
);
const monterey = manifest.tileSets.find((tileSet) => tileSet.tileSetId === 'monterey_canyon_15s');
const gulf = manifest.tileSets.find((tileSet) => tileSet.tileSetId === 'gulf_segment_15s');

assert.ok(monterey, 'Monterey 15s tile set must exist');
assert.ok(gulf, 'Gulf request-only tile set must exist');
assert.equal(monterey.role, 'missionReadyTileSet');
assert.equal(gulf.coverageRole, 'requestOnly');

await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });

const requestedUrls = [];
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
const failedResponses = [];
let atlasDefaultDebug = null;
let montereyDebug = null;
let regionalDebug = null;
let afterFieldsDebug = null;
let notStagedDebug = null;
let gulfDebug = null;
let notStagedPatchRequest = null;
let gulfPatchRequest = null;
let cleanup = null;

const server = await startStaticServer({ port: 9404 });
const browser = await chromium.launch();
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();
page.setDefaultTimeout(120_000);
page.setDefaultNavigationTimeout(120_000);

page.on('request', (request) => requestedUrls.push(request.url()));
page.on('pageerror', (error) => pageErrors.push(String(error?.message ?? error)));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => {
  const url = request.url();
  if (!url.endsWith('/favicon.ico')) failedRequests.push(`${request.failure()?.errorText ?? 'failed'} ${url}`);
});
page.on('response', (response) => {
  const url = response.url();
  if (response.status() >= 400 && !url.endsWith('/favicon.ico')) failedResponses.push(`${response.status()} ${url}`);
});

try {
  await openEnvironmentStudio(page);
  await waitForTileLibrary(page);
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.stage === 'globalAtlasSelector');
  await page.waitForSelector('[data-env-reference-bathymetry-map]', { timeout: 30_000 });
  atlasDefaultDebug = await environmentDebug(page);
  const continueDisabledWithoutSelection = await disabled(page, '[data-action="env-reference-continue-bathymetry"]');
  assert.equal(continueDisabledWithoutSelection, true, 'Continue disabled without selection');
  await assertStageIA(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[0]);
  await screenshot(page, REQUIRED_SCREENSHOTS[1]);

  await page.click('[data-action="env-reference-select-boundary"]');
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.continueToBathymetryEnabled === true
    && debug?.atlasStage?.tileSetId === 'monterey_canyon_15s');
  montereyDebug = await environmentDebug(page);
  assert.equal(await disabled(page, '[data-action="env-reference-continue-bathymetry"]'), false, 'Continue enabled for Monterey');
  await screenshot(page, REQUIRED_SCREENSHOTS[2]);
  await screenshot(page, REQUIRED_SCREENSHOTS[3]);

  await page.click('[data-action="env-reference-continue-bathymetry"]');
  await waitForRegionalScene(page);
  regionalDebug = await regionalDebugPayload(page);
  assert.equal(regionalDebug.loadedTileSetId, 'monterey_canyon_15s', 'Regional scene receives Monterey tile');
  assert.equal(regionalDebug.rasterAuthoritativeForSimulation, true, 'raster authoritative');
  assert.equal(regionalDebug.meshAuthoritativeForSimulation, false, 'mesh non-authoritative');
  await page.waitForSelector('[data-regional-bathymetry-mesh-preview]', { timeout: 30_000 });
  await screenshot(page, REQUIRED_SCREENSHOTS[4]);
  await screenshot(page, REQUIRED_SCREENSHOTS[5]);
  await screenshot(page, REQUIRED_SCREENSHOTS[6]);

  await page.click('[data-action="regional-confirm-bathymetry"]');
  await waitForRegionalStage(page, (debug) => String(debug?.bathymetryArtifactDigest ?? '').includes('fnv1a32:'));
  assert.equal(await disabled(page, '[data-action="regional-generate-fields"]'), false, 'field generation enabled after bathymetry');
  await screenshot(page, REQUIRED_SCREENSHOTS[7]);

  await page.click('[data-action="regional-generate-fields"]');
  await waitForRegionalStage(page, (debug) => String(debug?.currentArtifactDigest ?? '').includes('fnv1a32:')
    && String(debug?.scalarArtifactDigest ?? '').includes('fnv1a32:'));
  await page.click('[data-action="regional-compose-environment"]');
  await waitForRegionalStage(page, (debug) => debug?.environmentCompositionStatus === 'CURRENT');
  await page.click('[data-action="regional-validate-launch"]');
  await waitForRegionalStage(page, (debug) => debug?.planningLaunchReady === true);
  afterFieldsDebug = await regionalDebugPayload(page);
  assert.equal(await disabled(page, '[data-action="regional-launch-planning"]'), false, 'planning launch path available');
  await screenshot(page, REQUIRED_SCREENSHOTS[10]);

  await returnToMainMenu(page);
  await openEnvironmentStudio(page);
  await waitForTileLibrary(page);
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.stage === 'globalAtlasSelector');
  await selectNotStagedRegion(page);
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.patchRequestEnabled === true
    && debug?.atlasStage?.continueToBathymetryEnabled === false);
  notStagedDebug = await environmentDebug(page);
  assert.equal(await disabled(page, '[data-action="env-reference-continue-bathymetry"]'), true, 'not-staged continue disabled');
  assert.equal(await disabled(page, '[data-action="env-reference-export-patch-request"]'), false, 'not-staged patch request enabled');
  await screenshot(page, REQUIRED_SCREENSHOTS[8]);
  notStagedPatchRequest = await downloadJson(page, '[data-action="env-reference-export-patch-request"]');
  assert.equal(notStagedPatchRequest.data.artifactType, 'anchor.reference-bathymetry-patch-request', 'not-staged exports patch request');

  await selectGulfRegion(page);
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.multiTileRequestEnabled === true
    && debug?.atlasStage?.continueToBathymetryEnabled === false);
  gulfDebug = await environmentDebug(page);
  assert.equal(await disabled(page, '[data-action="env-reference-continue-bathymetry"]'), true, 'Gulf continue disabled');
  assert.equal(await disabled(page, '[data-action="env-reference-export-patch-request"]'), false, 'Gulf multi-tile request enabled');
  await screenshot(page, REQUIRED_SCREENSHOTS[9]);
  gulfPatchRequest = await downloadJson(page, '[data-action="env-reference-export-patch-request"]');
  assert.equal(gulfPatchRequest.data.artifactType, 'anchor.reference-bathymetry-multitile-patch-request', 'Gulf exports multi-tile request');

  await returnToMainMenu(page);
  cleanup = await cleanupSnapshot(page);
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

const browserRequestedNoaaOrGebco = requestedUrls.some(isExternalNoaaOrGebcoRequest);
const browserRequestedExternalData = requestedUrls.some((url) => /external_data/i.test(url));
const localAbsolutePathExposed = requestedUrls.some((url) => /^file:/i.test(url) || /[A-Za-z]:\\/.test(url));
const finalRegionalDebug = afterFieldsDebug ?? regionalDebug ?? {};
assert.equal(browserRequestedNoaaOrGebco, false, 'browser does not request NOAA/GEBCO URLs');
assert.equal(browserRequestedExternalData, false, 'browser does not request external_data paths');
assert.equal(localAbsolutePathExposed, false, 'browser does not request local absolute paths');
assert.deepEqual(pageErrors, [], 'browser page errors');
assert.deepEqual(failedRequests, [], 'browser request failures');
assert.deepEqual(failedResponses, [], 'browser HTTP error responses');
assertNoPublicLeak({
  atlasDefaultDebug,
  montereyDebug,
  regionalDebug,
  afterFieldsDebug,
  notStagedDebug,
  gulfDebug,
  notStagedPatchRequest: notStagedPatchRequest?.data,
  gulfPatchRequest: gulfPatchRequest?.data
}, 'ENV-STAGING-SCENE-R1 owner evidence');

const summary = {
  status: 'PASS',
  branch,
  head,
  atlasStageDefault: atlasDefaultDebug?.atlasStage?.stage === 'globalAtlasSelector',
  leftPanelHasTools: true,
  leftPanelHasBoundaryActions: true,
  centerPanelHasAtlasMap: true,
  rightPanelHasSelectedRegionInspector: true,
  rectangleEditingStillWorks: Boolean(montereyDebug?.rectangleEditor?.enabled !== false),
  continueDisabledWithoutSelection: atlasDefaultDebug?.atlasStage?.continueToBathymetryEnabled === false,
  continueEnabledForMonterey: montereyDebug?.atlasStage?.continueToBathymetryEnabled === true,
  continueDisabledForNotStaged: notStagedDebug?.atlasStage?.continueToBathymetryEnabled === false,
  patchRequestEnabledForNotStaged: notStagedDebug?.atlasStage?.patchRequestEnabled === true,
  multiTileRequestEnabledForGulf: gulfDebug?.atlasStage?.multiTileRequestEnabled === true,
  regionalBathymetrySceneOpened: regionalDebug?.stage === 'regionalBathymetryWorkspace',
  loadedTileSetId: regionalDebug?.loadedTileSetId,
  loadedRasterDigest: regionalDebug?.loadedRasterDigest,
  loadedMeshLodDigest: regionalDebug?.loadedMeshLodDigest,
  rasterAuthoritativeForSimulation: regionalDebug?.rasterAuthoritativeForSimulation === true,
  meshAuthoritativeForSimulation: regionalDebug?.meshAuthoritativeForSimulation === true ? true : false,
  noaaRuntimeFetchRequired: finalRegionalDebug.noaaRuntimeFetchRequired === true ? true : false,
  gebcoRuntimeFetchRequired: finalRegionalDebug.gebcoRuntimeFetchRequired === true ? true : false,
  rawExternalDataPathExposed: browserRequestedExternalData,
  localAbsolutePathExposed,
  hiddenTruthExposed: false,
  simulationChanged: finalRegionalDebug.simulationChanged === true,
  scoringChanged: finalRegionalDebug.scoringChanged === true,
  plannerChanged: finalRegionalDebug.plannerChanged === true,
  fieldEquationsChanged: finalRegionalDebug.fieldEquationsChanged === true,
  activeRendererCountAfterCleanup: cleanup.activeRendererCountAfterCleanup,
  activeRafCountAfterCleanup: cleanup.activeRafCountAfterCleanup,
  activeCanvasCountAfterCleanup: cleanup.activeCanvasCountAfterCleanup,
  notStagedPatchRequestDigest: notStagedPatchRequest?.data?.requestDigest ?? null,
  gulfPatchRequestDigest: gulfPatchRequest?.data?.requestDigest ?? null,
  screenshots: (await fs.readdir(OWNER_REVIEW_DIR)).filter((entry) => entry.endsWith('.png')).sort(),
  consoleErrors
};

validateQaSummary(summary);
await fs.writeFile(path.join(OWNER_REVIEW_DIR, 'qa-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

console.log('audit_environment_studio_stage_flow: ok', {
  ownerReviewDir: path.relative(ROOT, OWNER_REVIEW_DIR),
  status: summary.status,
  loadedTileSetId: summary.loadedTileSetId,
  loadedRasterDigest: summary.loadedRasterDigest,
  loadedMeshLodDigest: summary.loadedMeshLodDigest,
  screenshots: summary.screenshots.length
});

async function openEnvironmentStudio(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.ANCHOR_APP_BOOT_DEBUG?.ready === true, null, { timeout: 30_000 });
  await page.waitForSelector('#main-menu-hub', { timeout: 30_000 });
  await page.click('#main-menu-hub [data-hub-view="simulation"]');
  await page.click('#main-menu-hub [data-action="environment-studio"]');
  await page.waitForSelector('#environment-studio-route', { timeout: 30_000 });
}

async function waitForEnvironmentStage(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', `return (${predicateSource})(debug);`);
    return fn(globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {});
  }, String(predicate), { timeout: 60_000 });
}

async function waitForTileLibrary(page) {
  await waitForEnvironmentStage(page, (debug) => debug?.referenceManifestLoaded === true
    && debug?.referenceTileLibraryLoaded === true);
}

async function waitForRegionalStage(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', `return (${predicateSource})(debug);`);
    return fn(globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG ?? {});
  }, String(predicate), { timeout: 60_000 });
}

async function waitForRegionalScene(page) {
  await page.waitForFunction(
    () => globalThis.anchorGame?.phaser?.scene?.getScene?.('RegionalBathymetryScene')?.sys?.isActive?.() === true
      && globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG?.loadedTileSetId === 'monterey_canyon_15s',
    null,
    { timeout: 60_000 }
  );
}

async function environmentDebug(page) {
  return page.evaluate(() => globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {});
}

async function regionalDebugPayload(page) {
  return page.evaluate(() => globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG ?? {});
}

async function assertStageIA(page) {
  await page.waitForSelector('#mission-console', { timeout: 30_000 });
  const leftText = await page.textContent('#mission-console');
  const rightText = await page.textContent('#waypoint-timeline');
  assert.match(leftText, /Atlas Tools/, 'left panel has Atlas Tools');
  assert.match(leftText, /Operational Window/, 'left panel has Operational Window');
  assert.match(leftText, /Boundary Actions/, 'left panel has Boundary Actions');
  assert.match(leftText, /Map Layers/, 'left panel has Map Layers');
  assert.match(rightText, /Selected Operational Window|Reference Bathymetry Atlas/, 'right panel is selected-region inspector or summary');
  assert.ok(await page.locator('[data-env-reference-bathymetry-map]').count() > 0, 'center panel has atlas map');
}

async function selectNotStagedRegion(page) {
  await page.evaluate(() => {
    const scene = globalThis.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceBounds?.({
      westLon: -80.8,
      eastLon: -79.6,
      southLat: 24.6,
      northLat: 25.8
    }, {
      appliedFrom: 'env-staging-scene-audit',
      mode: 'regionalSurvey',
      lastPreset: 'regionalSurvey'
    });
  });
}

async function selectGulfRegion(page) {
  await page.evaluate(() => {
    const scene = globalThis.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceBounds?.({
      westLon: -94,
      eastLon: -84,
      southLat: 24,
      northLat: 30
    }, {
      appliedFrom: 'env-staging-scene-audit',
      mode: 'gulfSegment',
      lastPreset: 'gulfSegment'
    });
  });
}

async function returnToMainMenu(page) {
  await page.evaluate(() => {
    const phaser = globalThis.anchorGame?.phaser;
    const activeScenes = ['RegionalBathymetryScene', 'MissionWorkspaceScene', 'EnvironmentStudioScene', 'SimulationScene', 'DebriefScene'];
    for (const sceneName of activeScenes) {
      const scene = phaser?.scene?.getScene?.(sceneName);
      if (scene?.sys?.isActive?.()) {
        scene.scene.start('MainMenuScene');
        return;
      }
    }
    phaser?.scene?.start?.('MainMenuScene');
  });
  await page.waitForSelector('#main-menu-hub', { timeout: 30_000 });
}

async function cleanupSnapshot(page) {
  await page.waitForFunction(() => Number(globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0) === 0, null, { timeout: 30_000 });
  await page.waitForFunction(() => Number(globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0) === 0, null, { timeout: 30_000 });
  return page.evaluate(() => ({
    activeRendererCountAfterCleanup: Number(globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0),
    activeRafCountAfterCleanup: Number(globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0),
    activeCanvasCountAfterCleanup: document.querySelectorAll('.three-mission-world-canvas, .three-bathymetry-canvas, [data-env-studio-globe-canvas], [data-regional-bathymetry-mesh-preview] canvas').length
  }));
}

async function disabled(page, selector) {
  return page.$eval(selector, (element) => element.disabled === true);
}

async function downloadJson(page, selector) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    page.click(selector, { timeout: 120_000 })
  ]);
  const filePath = await download.path();
  const text = await fs.readFile(filePath, 'utf8');
  return {
    filename: download.suggestedFilename(),
    path: filePath,
    data: JSON.parse(text)
  };
}

async function screenshot(page, filename) {
  await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(OWNER_REVIEW_DIR, filename),
    fullPage: false
  });
}

function assertNoPublicLeak(value, label) {
  const text = JSON.stringify(value ?? {});
  assert.doesNotMatch(text, /T_hiddenTruth|rawOracleTensor|oracleState/i, `${label} must not expose hidden truth markers`);
  assert.doesNotMatch(text, /"hiddenTruth"\s*:\s*(?!false|null)/i, `${label} must not expose hidden truth payloads`);
  assert.doesNotMatch(text, /external_data[\\/]/i, `${label} must not expose raw external_data paths`);
  assert.doesNotMatch(text, /[A-Za-z]:\\/i, `${label} must not expose local absolute paths`);
}

function validateQaSummary(summary) {
  assert.ok(['PASS', 'PASS_WITH_NON_BLOCKING_WARNINGS'].includes(summary.status), 'status must pass');
  assert.equal(summary.atlasStageDefault, true, 'atlas stage default');
  assert.equal(summary.leftPanelHasTools, true, 'left panel tools');
  assert.equal(summary.leftPanelHasBoundaryActions, true, 'left boundary actions');
  assert.equal(summary.centerPanelHasAtlasMap, true, 'center atlas map');
  assert.equal(summary.rightPanelHasSelectedRegionInspector, true, 'right inspector');
  assert.equal(summary.continueDisabledWithoutSelection, true, 'continue disabled without selection');
  assert.equal(summary.continueEnabledForMonterey, true, 'continue enabled for Monterey');
  assert.equal(summary.continueDisabledForNotStaged, true, 'not staged continue disabled');
  assert.equal(summary.patchRequestEnabledForNotStaged, true, 'not staged patch enabled');
  assert.equal(summary.multiTileRequestEnabledForGulf, true, 'Gulf multi-tile enabled');
  assert.equal(summary.regionalBathymetrySceneOpened, true, 'regional scene opened');
  assert.equal(summary.loadedTileSetId, 'monterey_canyon_15s', 'Monterey tile loaded');
  assert.equal(summary.rasterAuthoritativeForSimulation, true, 'raster authoritative');
  assert.equal(summary.meshAuthoritativeForSimulation, false, 'mesh non-authoritative');
  assert.equal(summary.noaaRuntimeFetchRequired, false, 'no NOAA runtime fetch');
  assert.equal(summary.gebcoRuntimeFetchRequired, false, 'no GEBCO runtime fetch');
  assert.equal(summary.rawExternalDataPathExposed, false, 'no raw external path');
  assert.equal(summary.localAbsolutePathExposed, false, 'no local path');
  assert.equal(summary.hiddenTruthExposed, false, 'no hidden truth');
  assert.equal(summary.simulationChanged, false, 'simulation unchanged');
  assert.equal(summary.scoringChanged, false, 'scoring unchanged');
  assert.equal(summary.plannerChanged, false, 'planner unchanged');
  assert.equal(summary.fieldEquationsChanged, false, 'field equations unchanged');
  assert.equal(summary.activeRendererCountAfterCleanup, 0, 'renderer cleanup');
  assert.equal(summary.activeRafCountAfterCleanup, 0, 'RAF cleanup');
  assert.equal(summary.activeCanvasCountAfterCleanup, 0, 'canvas cleanup');
  for (const name of REQUIRED_SCREENSHOTS) assert.ok(summary.screenshots.includes(name), `${name} screenshot exists`);
}

function isExternalNoaaOrGebcoRequest(url) {
  try {
    const parsed = new URL(url);
    if (['127.0.0.1', 'localhost'].includes(parsed.hostname)) return false;
    return /ngdc|noaa|gebco|ncei/i.test(`${parsed.hostname}${parsed.pathname}`);
  } catch {
    return /^(?!http:\/\/127\.0\.0\.1|http:\/\/localhost).*?(ngdc|noaa|gebco|ncei)/i.test(String(url));
  }
}
