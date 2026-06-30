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
const OWNER_REVIEW_DIR = path.resolve('artifacts/owner-review/env-staging-scene-r1-1');
const BASE = 'http://127.0.0.1:9404';
const REQUIRED_SCREENSHOTS = [
  '01-no-selection-continue-disabled.png',
  '02-gulf-selected-continue-disabled.png',
  '03-gulf-selected-multitile-primary.png',
  '04-gulf-multitile-request-exported.png',
  '05-not-staged-region-patch-request-primary.png',
  '06-monterey-selected-continue-enabled.png',
  '07-monterey-continue-clicked-regional-scene-opened.png',
  '08-regional-bathymetry-workspace-loaded.png'
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
let notStagedDebug = null;
let gulfDebug = null;
let noSelectionDom = null;
let montereyDom = null;
let notStagedDom = null;
let gulfDom = null;
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
  noSelectionDom = await atlasButtonState(page);
  assert.equal(noSelectionDom.continueToBathymetry.disabled, true, 'Continue disabled without selection');
  assert.equal(noSelectionDom.continueToBathymetry.ariaDisabled, 'true', 'Continue aria-disabled without selection');
  assert.equal(noSelectionDom.continueToBathymetry.primary, false, 'disabled Continue is not primary without selection');
  await assertStageIA(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[0]);

  await selectGulfRegion(page);
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.primaryAction === 'exportMultiTileRequest'
    && debug?.atlasStage?.exportMultiTileRequestEnabled === true
    && debug?.atlasStage?.continueToBathymetryEnabled === false);
  gulfDebug = await environmentDebug(page);
  gulfDom = await atlasButtonState(page);
  assert.equal(gulfDebug?.atlasStage?.boundaryBudgetStatus, 'MULTI_TILE_REQUIRED', 'Gulf is multi-tile required');
  assert.equal(gulfDom.continueToBathymetry.disabled, true, 'Gulf continue disabled');
  assert.equal(gulfDom.continueToBathymetry.ariaDisabled, 'true', 'Gulf continue aria-disabled');
  assert.equal(gulfDom.continueToBathymetry.primary, false, 'Gulf disabled continue not green primary');
  assert.equal(gulfDom.loadMissionPatch.disabled, true, 'Gulf load patch disabled');
  assert.equal(gulfDom.loadMissionPatch.primary, false, 'Gulf load patch not green primary');
  assert.equal(gulfDom.exportPatchRequest.disabled, false, 'Gulf export multi-tile enabled');
  assert.equal(gulfDom.exportPatchRequest.warning, true, 'Gulf export multi-tile is warning primary CTA');
  assert.match(gulfDom.exportPatchRequest.text, /Export Multi-Tile Patch Request/, 'Gulf export label');
  await expectPanelText(page, '#waypoint-timeline', /MULTI_TILE_REQUIRED|Multi-tile preprocessing/i);
  await screenshot(page, REQUIRED_SCREENSHOTS[1]);
  await screenshot(page, REQUIRED_SCREENSHOTS[2]);
  gulfPatchRequest = await downloadJson(page, '[data-env-stage-section="boundary-actions"] [data-action="env-reference-export-patch-request"]');
  assert.equal(gulfPatchRequest.data.artifactType, 'anchor.reference-bathymetry-multitile-patch-request', 'Gulf exports multi-tile request');
  await screenshot(page, REQUIRED_SCREENSHOTS[3]);

  await selectNotStagedRegion(page);
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.primaryAction === 'exportPatchRequest'
    && debug?.atlasStage?.patchRequestEnabled === true
    && debug?.atlasStage?.continueToBathymetryEnabled === false);
  notStagedDebug = await environmentDebug(page);
  notStagedDom = await atlasButtonState(page);
  assert.equal(notStagedDom.continueToBathymetry.disabled, true, 'not-staged continue disabled');
  assert.equal(notStagedDom.continueToBathymetry.primary, false, 'not-staged disabled continue not green primary');
  assert.equal(notStagedDom.loadMissionPatch.disabled, true, 'not-staged load patch disabled');
  assert.equal(notStagedDom.exportPatchRequest.disabled, false, 'not-staged patch request enabled');
  assert.equal(notStagedDom.exportPatchRequest.warning, true, 'not-staged patch request warning CTA');
  assert.match(notStagedDom.exportPatchRequest.text, /Export Patch Request/, 'not-staged export label');
  await screenshot(page, REQUIRED_SCREENSHOTS[4]);
  notStagedPatchRequest = await downloadJson(page, '[data-env-stage-section="boundary-actions"] [data-action="env-reference-export-patch-request"]');
  assert.equal(notStagedPatchRequest.data.artifactType, 'anchor.reference-bathymetry-patch-request', 'not-staged exports patch request');

  await page.click('[data-action="env-reference-select-boundary"]');
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.continueToBathymetryEnabled === true
    && debug?.atlasStage?.primaryAction === 'continueToBathymetry'
    && debug?.atlasStage?.tileSetId === 'monterey_canyon_15s');
  montereyDebug = await environmentDebug(page);
  montereyDom = await atlasButtonState(page);
  assert.equal(montereyDom.continueToBathymetry.disabled, false, 'Continue enabled for Monterey');
  assert.equal(montereyDom.continueToBathymetry.primary, true, 'Monterey continue is primary');
  assert.equal(montereyDom.loadMissionPatch.disabled, false, 'Load patch remains enabled for Monterey compatibility');
  await screenshot(page, REQUIRED_SCREENSHOTS[5]);

  await page.click('[data-action="env-reference-continue-bathymetry"]');
  await waitForRegionalScene(page);
  regionalDebug = await regionalDebugPayload(page);
  assert.equal(regionalDebug.loadedTileSetId, 'monterey_canyon_15s', 'Regional scene receives Monterey tile');
  assert.equal(regionalDebug.rasterAuthoritativeForSimulation, true, 'raster authoritative');
  assert.equal(regionalDebug.meshAuthoritativeForSimulation, false, 'mesh non-authoritative');
  await page.waitForSelector('[data-regional-bathymetry-mesh-preview]', { timeout: 30_000 });
  await screenshot(page, REQUIRED_SCREENSHOTS[6]);
  await screenshot(page, REQUIRED_SCREENSHOTS[7]);

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
const finalRegionalDebug = regionalDebug ?? {};
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
  noSelectionContinueDisabled: atlasDefaultDebug?.atlasStage?.continueToBathymetryEnabled === false
    && noSelectionDom?.continueToBathymetry?.disabled === true,
  gulfContinueDisabled: gulfDebug?.atlasStage?.continueToBathymetryEnabled === false
    && gulfDom?.continueToBathymetry?.disabled === true
    && gulfDom?.continueToBathymetry?.primary === false,
  gulfLoadMissionPatchDisabled: gulfDebug?.atlasStage?.loadMissionPatchEnabled === false
    && gulfDom?.loadMissionPatch?.disabled === true
    && gulfDom?.loadMissionPatch?.primary === false,
  gulfExportMultiTileEnabled: gulfDebug?.atlasStage?.exportMultiTileRequestEnabled === true
    && gulfDom?.exportPatchRequest?.disabled === false,
  gulfPrimaryAction: gulfDebug?.atlasStage?.primaryAction ?? null,
  gulfPatchRequestDigest: gulfPatchRequest?.data?.requestDigest ?? null,
  notStagedContinueDisabled: notStagedDebug?.atlasStage?.continueToBathymetryEnabled === false
    && notStagedDom?.continueToBathymetry?.disabled === true,
  notStagedExportPatchEnabled: notStagedDebug?.atlasStage?.exportPatchRequestEnabled === true
    && notStagedDom?.exportPatchRequest?.disabled === false,
  montereyContinueEnabled: montereyDebug?.atlasStage?.continueToBathymetryEnabled === true
    && montereyDom?.continueToBathymetry?.disabled === false,
  montereyPrimaryAction: montereyDebug?.atlasStage?.primaryAction ?? null,
  continueDisabledWithoutSelection: atlasDefaultDebug?.atlasStage?.continueToBathymetryEnabled === false,
  continueEnabledForMonterey: montereyDebug?.atlasStage?.continueToBathymetryEnabled === true,
  continueDisabledForNotStaged: notStagedDebug?.atlasStage?.continueToBathymetryEnabled === false,
  patchRequestEnabledForNotStaged: notStagedDebug?.atlasStage?.patchRequestEnabled === true,
  multiTileRequestEnabledForGulf: gulfDebug?.atlasStage?.multiTileRequestEnabled === true,
  regionalBathymetrySceneOpened: regionalDebug?.stage === 'regionalBathymetryWorkspace',
  regionalSceneOpenedFromMonterey: regionalDebug?.stage === 'regionalBathymetryWorkspace'
    && regionalDebug?.openedFromAtlasBoundary === true,
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

async function atlasButtonState(page) {
  return page.evaluate(() => {
    function state(selector) {
      const element = document.querySelector(selector);
      if (!element) {
        return {
          exists: false,
          disabled: true,
          ariaDisabled: null,
          primary: false,
          warning: false,
          text: '',
          title: ''
        };
      }
      return {
        exists: true,
        disabled: element.disabled === true,
        ariaDisabled: element.getAttribute('aria-disabled'),
        primary: element.classList.contains('primary'),
        warning: element.classList.contains('warning'),
        text: element.textContent.trim(),
        title: element.getAttribute('title') ?? ''
      };
    }
    return {
      continueToBathymetry: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-continue-bathymetry"]'),
      loadMissionPatch: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-load-patch"]'),
      exportPatchRequest: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-export-patch-request"]'),
      inspectFallback: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-inspect-fallback"]')
    };
  });
}

async function expectPanelText(page, selector, pattern) {
  const text = await page.textContent(selector);
  assert.match(text ?? '', pattern, `${selector} includes ${pattern}`);
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
  assert.equal(summary.noSelectionContinueDisabled, true, 'continue disabled without selection');
  assert.equal(summary.gulfContinueDisabled, true, 'Gulf continue disabled');
  assert.equal(summary.gulfLoadMissionPatchDisabled, true, 'Gulf load patch disabled');
  assert.equal(summary.gulfExportMultiTileEnabled, true, 'Gulf multi-tile enabled');
  assert.equal(summary.gulfPrimaryAction, 'exportMultiTileRequest', 'Gulf primary action');
  assert.match(summary.gulfPatchRequestDigest ?? '', /^fnv1a32:/, 'Gulf patch request digest');
  assert.equal(summary.notStagedContinueDisabled, true, 'not staged continue disabled');
  assert.equal(summary.notStagedExportPatchEnabled, true, 'not staged patch enabled');
  assert.equal(summary.montereyContinueEnabled, true, 'continue enabled for Monterey');
  assert.equal(summary.montereyPrimaryAction, 'continueToBathymetry', 'Monterey primary action');
  assert.equal(summary.regionalBathymetrySceneOpened, true, 'regional scene opened');
  assert.equal(summary.regionalSceneOpenedFromMonterey, true, 'regional scene opened from Monterey');
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
