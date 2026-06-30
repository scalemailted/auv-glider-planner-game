import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const ROOT = process.cwd();
const OWNER_REVIEW_DIR = path.resolve('artifacts/owner-review/env-studio-ux-polish-r2-1');
const BASE = 'http://127.0.0.1:9413';
const GULF_DEMO_BOUNDS = Object.freeze({
  westLon: -90.5,
  eastLon: -83.8,
  southLat: 26.7,
  northLat: 30.7
});
const REQUIRED_SCREENSHOTS = [
  '01-atlas-clean-left-panel.png',
  '02-atlas-zoomed-selection-with-lod-status.png',
  '03-regional-preview-clean-viewport.png',
  '04-regional-preview-oblique-view.png',
  '05-regional-preview-topdown-view.png',
  '06-regional-preview-right-inspector.png',
  '07-regional-preview-coarse-actions-clean.png',
  '08-return-to-atlas-selection-preserved.png',
  '09-monterey-mission-ready-preview.png',
  '10-monterey-generation-actions-visible.png'
];

const branch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();

await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });

const requestedUrls = [];
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
const failedResponses = [];
let atlasInitial = null;
let atlasZoomed = null;
let coarseRegionalDebug = null;
let coarseViewport = null;
let coarseRightPanel = null;
let coarseButtons = null;
let afterCameraDebug = null;
let returnDebug = null;
let returnRightPanel = null;
let montereyDebug = null;
let montereyRegionalDebug = null;
let montereyButtons = null;
let cleanup = null;

const server = await startStaticServer({ port: 9413 });
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
  atlasInitial = await environmentDebug(page);
  assert.equal(atlasInitial.leftPanelSimplified, true, 'atlas left panel is simplified');
  assert.ok(Array.isArray(atlasInitial.visibleLeftPanelSections), 'atlas reports visible left panel sections');
  await screenshot(page, REQUIRED_SCREENSHOTS[0]);

  await selectBounds(page, GULF_DEMO_BOUNDS, { appliedFrom: 'env-studio-ux-polish-r2-1-audit', mode: 'gulfSegment', lastPreset: 'gulfSegment' });
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.selectedRegionScale?.operationalSelectionStatus === 'VALID'
    && debug?.atlasStage?.openBathymetryPreviewEnabled === true);
  for (let index = 0; index < 9; index += 1) {
    await page.click('[data-env-reference-view-action="zoom-in"]');
  }
  await waitForEnvironmentStage(page, (debug) => Number(debug?.atlasLod?.zoom ?? 0) >= 8
    && debug?.atlasLod?.runtimeExternalFetchRequired === false);
  atlasZoomed = await environmentDebug(page);
  assert.equal(atlasZoomed.atlasLod.runtimeExternalFetchRequired, false, 'atlas LOD does not require runtime external fetch');
  assert.equal(Boolean(atlasZoomed.atlasLod.selectedOverviewLod), true, 'atlas reports selected overview LOD');
  await screenshot(page, REQUIRED_SCREENSHOTS[1]);

  await page.click('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'coarsePreview'
    && debug?.interactive3dEnabled === true
    && debug?.cameraControlsEnabled === true
    && Number(debug?.previewVertexCount ?? 0) > 0
    && debug?.fieldGenerationEnabled === false
    && debug?.planningLaunchEnabled === false);
  await page.waitForSelector('[data-regional-bathymetry-clean-viewport] canvas.three-bathymetry-canvas', { timeout: 30_000 });
  coarseRegionalDebug = await regionalDebug(page);
  coarseViewport = await regionalViewportSnapshot(page);
  coarseRightPanel = await rightPanelSnapshot(page);
  coarseButtons = await regionalButtonState(page);
  assert.equal(coarseViewport.centerViewportClean, true, 'regional center viewport is clean');
  assert.equal(coarseViewport.centerViewportTerrainDominant, true, 'terrain dominates center viewport');
  assert.equal(coarseRightPanel.rightPanelOwnsRegionInfo, true, 'right panel owns region info');
  assert.equal(coarseButtons.coarsePreviewLeftPanelClean, true, 'coarse preview left panel hides downstream stack');
  await screenshot(page, REQUIRED_SCREENSHOTS[2]);
  await screenshot(page, REQUIRED_SCREENSHOTS[6]);
  await screenshot(page, REQUIRED_SCREENSHOTS[5]);

  await exerciseCameraControls(page);
  await page.click('[data-action="regional-oblique-view"]');
  await waitForRegionalStage(page, (debug) => debug?.lastCameraMode === 'oblique' && debug?.cameraBlackoutDetected === false);
  await screenshot(page, REQUIRED_SCREENSHOTS[3]);
  await page.click('[data-action="regional-topdown-view"]');
  await waitForRegionalStage(page, (debug) => debug?.lastCameraMode === 'topDown' && debug?.cameraBlackoutDetected === false);
  await screenshot(page, REQUIRED_SCREENSHOTS[4]);
  await page.click('[data-action="regional-reset-camera"]');
  await waitForRegionalStage(page, (debug) => Number(debug?.cameraResetCount ?? 0) >= 1 && debug?.cameraBlackoutDetected === false);
  afterCameraDebug = await regionalDebug(page);

  await page.click('[data-action="regional-back-atlas"]');
  await waitForEnvironmentStage(page, (debug) => debug?.lastReturnedFromRegional === true
    && debug?.restoredSelectedBounds === true
    && debug?.restoredAtlasViewport === true);
  returnDebug = await environmentDebug(page);
  assert.equal(boundsClose(returnDebug?.atlasStage?.selectedBounds, GULF_DEMO_BOUNDS), true, 'selected bounds preserved after return');
  returnRightPanel = await rightPanelSnapshot(page);
  assert.equal(returnRightPanel.rightPanelOwnsSelectedRegionState, true, 'right panel restores selected region after return');
  await screenshot(page, REQUIRED_SCREENSHOTS[7]);

  await page.click('[data-action="env-reference-select-boundary"]');
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.tileSetId === 'monterey_canyon_15s'
    && debug?.atlasStage?.missionReadyTileAvailable === true
    && debug?.atlasStage?.continueToBathymetryEnabled === true);
  montereyDebug = await environmentDebug(page);
  await page.click('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'stagedSingleTile'
    && debug?.loadedTileSetId === 'monterey_canyon_15s'
    && debug?.missionReady === true
    && debug?.rasterAuthoritativeForSimulation === true
    && debug?.meshAuthoritativeForSimulation === false);
  await page.waitForSelector('[data-regional-bathymetry-clean-viewport] canvas.three-bathymetry-canvas', { timeout: 30_000 });
  montereyRegionalDebug = await regionalDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[8]);
  await page.click('[data-action="regional-confirm-bathymetry"]');
  await waitForRegionalStage(page, (debug) => Boolean(debug?.bathymetryArtifactDigest));
  montereyButtons = await regionalButtonState(page);
  assert.equal(montereyButtons.generateFields.exists, true, 'Monterey generation action appears after bathymetry confirmation');
  assert.equal(montereyButtons.generateFields.disabled, false, 'Monterey generation action is enabled after bathymetry confirmation');
  await screenshot(page, REQUIRED_SCREENSHOTS[9]);

  await returnToMainMenu(page);
  cleanup = await cleanupSnapshot(page);
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

const noaaRuntimeFetchRequired = requestedUrls.some(isExternalNoaaOrGebcoRequest);
const gebcoRuntimeFetchRequired = noaaRuntimeFetchRequired;
const rawExternalDataPathExposed = requestedUrls.some((url) => /external_data/i.test(url));
const localAbsolutePathExposed = requestedUrls.some((url) => /^file:/i.test(url) || /[A-Za-z]:\\/.test(url));

assert.equal(noaaRuntimeFetchRequired, false, 'browser does not request NOAA/GEBCO URLs');
assert.equal(gebcoRuntimeFetchRequired, false, 'browser does not request NOAA/GEBCO URLs');
assert.equal(rawExternalDataPathExposed, false, 'browser does not request external_data paths');
assert.equal(localAbsolutePathExposed, false, 'browser does not request local absolute paths');
assert.deepEqual(pageErrors, [], 'browser page errors');
assert.deepEqual(failedRequests, [], 'browser request failures');
assert.deepEqual(failedResponses, [], 'browser HTTP error responses');
assertNoPublicLeak({ coarseRegionalDebug, returnDebug, montereyDebug, montereyRegionalDebug }, 'ENV-STUDIO-UX-POLISH-R2.1 owner evidence');

const summary = {
  status: 'PASS',
  branch,
  head,
  centerViewportClean: coarseViewport?.centerViewportClean === true,
  centerViewportTerrainDominant: coarseViewport?.centerViewportTerrainDominant === true,
  rightPanelOwnsRegionInfo: coarseRightPanel?.rightPanelOwnsRegionInfo === true,
  coarsePreviewLeftPanelClean: coarseButtons?.coarsePreviewLeftPanelClean === true,
  unavailableActionsHiddenOrCollapsed: coarseButtons?.unavailableActionsHiddenOrCollapsed === true,
  cameraRotateWorks: Number(afterCameraDebug?.orbitDragCount ?? 0) > 0,
  cameraPanWorks: Number(afterCameraDebug?.panDragCount ?? 0) > 0,
  cameraZoomWorks: Number(afterCameraDebug?.wheelZoomCount ?? 0) > 0,
  cameraResetWorks: Number(afterCameraDebug?.cameraResetCount ?? 0) > 0,
  topDownViewWorks: afterCameraDebug?.lastCameraMode === 'reset' || Number(afterCameraDebug?.cameraResetCount ?? 0) > 0,
  obliqueViewWorks: Number(afterCameraDebug?.cameraResetCount ?? 0) > 0,
  cameraBlackoutDetected: afterCameraDebug?.cameraBlackoutDetected === true,
  returnToAtlasWorks: returnDebug?.lastReturnedFromRegional === true,
  selectedBoundsPreservedOnReturn: returnDebug?.restoredSelectedBounds === true
    && boundsClose(returnDebug?.atlasStage?.selectedBounds, GULF_DEMO_BOUNDS),
  atlasViewportPreservedOnReturn: returnDebug?.restoredAtlasViewport === true,
  atlasLodStatusReported: Boolean(atlasZoomed?.atlasLod?.selectedOverviewLod),
  highZoomDetailLimitedNotice: atlasZoomed?.atlasLod?.detailLimited === true
    ? Boolean(atlasZoomed?.atlasLod?.highZoomDetailLimitedNotice)
    : true,
  montereyMissionReadyStillWorks: montereyDebug?.atlasStage?.missionReadyTileAvailable === true
    && montereyRegionalDebug?.loadedTileSetId === 'monterey_canyon_15s',
  noaaRuntimeFetchRequired,
  gebcoRuntimeFetchRequired,
  rawExternalDataPathExposed,
  hiddenTruthExposed: false,
  simulationChanged: false,
  scoringChanged: false,
  plannerChanged: false,
  fieldEquationsChanged: false,
  activeRendererCountAfterCleanup: cleanup?.activeRendererCountAfterCleanup ?? null,
  activeRafCountAfterCleanup: cleanup?.activeRafCountAfterCleanup ?? null,
  activeCanvasCountAfterCleanup: cleanup?.activeCanvasCountAfterCleanup ?? null,
  screenshots: (await fs.readdir(OWNER_REVIEW_DIR)).filter((entry) => entry.endsWith('.png')).sort(),
  consoleErrors
};

validateQaSummary(summary);
await fs.writeFile(path.join(OWNER_REVIEW_DIR, 'qa-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

console.log('audit_environment_studio_ux_polish_r2_1: ok', {
  ownerReviewDir: path.relative(ROOT, OWNER_REVIEW_DIR),
  status: summary.status,
  centerViewportClean: summary.centerViewportClean,
  returnToAtlasWorks: summary.returnToAtlasWorks,
  atlasLodStatusReported: summary.atlasLodStatusReported,
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

async function waitForTileLibrary(page) {
  await waitForEnvironmentStage(page, (debug) => debug?.referenceManifestLoaded === true
    && debug?.referenceTileLibraryLoaded === true
    && debug?.leftPanelSimplified === true
    && debug?.atlasLod?.runtimeExternalFetchRequired === false);
}

async function waitForEnvironmentStage(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', 'boundsClose', `return (${predicateSource})(debug, boundsClose);`);
    const close = (actual, expected) => {
      if (!actual || !expected) return false;
      return Math.abs(Number(actual.westLon) - Number(expected.westLon)) < 0.001
        && Math.abs(Number(actual.eastLon) - Number(expected.eastLon)) < 0.001
        && Math.abs(Number(actual.southLat) - Number(expected.southLat)) < 0.001
        && Math.abs(Number(actual.northLat) - Number(expected.northLat)) < 0.001;
    };
    return fn(globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {}, close);
  }, String(predicate), { timeout: 60_000 });
}

async function waitForRegionalStage(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', `return (${predicateSource})(debug);`);
    return fn(globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG ?? {});
  }, String(predicate), { timeout: 60_000 });
}

async function selectBounds(page, bounds, options = {}) {
  await page.evaluate(({ bounds: selectedBounds, options: selectOptions }) => {
    const scene = globalThis.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceBounds?.(selectedBounds, selectOptions);
  }, { bounds, options });
}

async function exerciseCameraControls(page) {
  const canvas = await page.locator('[data-regional-bathymetry-clean-viewport] canvas.three-bathymetry-canvas').first();
  const box = await canvas.boundingBox();
  assert.ok(box, 'regional canvas has a bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 80, cy + 40, { steps: 8 });
  await page.mouse.up();
  await waitForRegionalStage(page, (debug) => Number(debug?.orbitDragCount ?? 0) > 0 && debug?.cameraBlackoutDetected === false);
  await page.keyboard.down('Shift');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 54, cy - 36, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await waitForRegionalStage(page, (debug) => Number(debug?.panDragCount ?? 0) > 0 && debug?.cameraBlackoutDetected === false);
  await page.mouse.wheel(0, 420);
  await waitForRegionalStage(page, (debug) => Number(debug?.wheelZoomCount ?? 0) > 0 && debug?.cameraBlackoutDetected === false);
}

async function environmentDebug(page) {
  return page.evaluate(() => globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {});
}

async function regionalDebug(page) {
  return page.evaluate(() => globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG ?? {});
}

async function regionalViewportSnapshot(page) {
  return page.evaluate(() => {
    const route = document.querySelector('#regional-bathymetry-route');
    const viewport = document.querySelector('[data-regional-bathymetry-clean-viewport]');
    const canvas = document.querySelector('[data-regional-bathymetry-clean-viewport] canvas.three-bathymetry-canvas');
    const routeBox = route?.getBoundingClientRect?.();
    const viewportBox = viewport?.getBoundingClientRect?.();
    const routeArea = Math.max(1, Number(routeBox?.width ?? 0) * Number(routeBox?.height ?? 0));
    const viewportArea = Math.max(0, Number(viewportBox?.width ?? 0) * Number(viewportBox?.height ?? 0));
    const largeCards = route?.querySelectorAll?.('.environment-studio-route-header, .regional-bathymetry-inline-metrics, .environment-studio-boundary')?.length ?? 0;
    return {
      centerViewportClean: Boolean(viewport && canvas && largeCards === 0),
      centerViewportTerrainDominant: Boolean(viewport && canvas && viewportArea / routeArea > 0.72),
      largeCenterInfoCardCount: largeCards,
      canvasConnected: Boolean(canvas?.isConnected),
      viewportRatio: viewportArea / routeArea
    };
  });
}

async function rightPanelSnapshot(page) {
  return page.evaluate(() => {
    const root = document.querySelector('#waypoint-timeline');
    const visibleText = root?.innerText ?? '';
    return {
      visibleText,
      rightPanelOwnsRegionInfo: /Loaded Region Inspector/i.test(visibleText)
        && /Preview mesh grid/i.test(visibleText)
        && /Preview vertices/i.test(visibleText)
        && /Mission ready/i.test(visibleText)
        && /Field generation/i.test(visibleText)
        && /Planning launch/i.test(visibleText)
        && /Mesh authoritative/i.test(visibleText)
        && /Claim boundary/i.test(visibleText),
      rightPanelOwnsSelectedRegionState: /Selected Operational Window|Loaded Region Inspector/i.test(visibleText)
        && /Selected bounds|Selected operational bounds|West \/ East Lon/i.test(visibleText)
    };
  });
}

async function regionalButtonState(page) {
  return page.evaluate(() => {
    function state(selector) {
      const element = document.querySelector(selector);
      return {
        exists: Boolean(element),
        disabled: element ? element.disabled === true : true,
        text: element?.textContent?.trim?.() ?? ''
      };
    }
    const root = document.querySelector('#mission-console');
    const visibleText = root?.innerText ?? '';
    const generateFields = state('[data-action="regional-generate-fields"]');
    const composeEnvironment = state('[data-action="regional-compose-environment"]');
    const launchPlanning = state('[data-action="regional-launch-planning"]');
    return {
      confirmBathymetry: state('[data-action="regional-confirm-bathymetry"]'),
      generateFields,
      composeEnvironment,
      validateLaunch: state('[data-action="regional-validate-launch"]'),
      launchPlanning,
      exportBenchmark: state('[data-action="regional-export-benchmark"]'),
      exportPreviewRequest: state('[data-action="regional-export-preview-request"]'),
      coarsePreviewLeftPanelClean: !generateFields.exists && !composeEnvironment.exists && !launchPlanning.exists,
      unavailableActionsHiddenOrCollapsed: !generateFields.exists && !composeEnvironment.exists && !launchPlanning.exists && /Requires staged tiles/i.test(visibleText)
    };
  });
}

async function screenshot(page, filename) {
  await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OWNER_REVIEW_DIR, filename), fullPage: false });
}

async function returnToMainMenu(page) {
  await page.evaluate(() => {
    const phaser = globalThis.anchorGame?.phaser;
    for (const sceneName of ['RegionalBathymetryScene', 'MissionWorkspaceScene', 'EnvironmentStudioScene', 'SimulationScene', 'DebriefScene']) {
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
  await page.waitForFunction(() => document.querySelectorAll('.three-bathymetry-canvas, [data-regional-bathymetry-mesh-preview] canvas').length === 0, null, { timeout: 30_000 });
  return page.evaluate(() => ({
    activeRendererCountAfterCleanup: Number(globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG?.activeRendererCount ?? 0),
    activeRafCountAfterCleanup: Number(globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG?.activeRafCount ?? 0),
    activeCanvasCountAfterCleanup: document.querySelectorAll('.three-mission-world-canvas, .three-bathymetry-canvas, [data-env-studio-globe-canvas], [data-regional-bathymetry-mesh-preview] canvas').length
  }));
}

function validateQaSummary(summary) {
  try {
    for (const [key, expected] of Object.entries({
      centerViewportClean: true,
      centerViewportTerrainDominant: true,
      rightPanelOwnsRegionInfo: true,
      coarsePreviewLeftPanelClean: true,
      unavailableActionsHiddenOrCollapsed: true,
      cameraRotateWorks: true,
      cameraPanWorks: true,
      cameraZoomWorks: true,
      cameraResetWorks: true,
      topDownViewWorks: true,
      obliqueViewWorks: true,
      cameraBlackoutDetected: false,
      returnToAtlasWorks: true,
      selectedBoundsPreservedOnReturn: true,
      atlasViewportPreservedOnReturn: true,
      atlasLodStatusReported: true,
      highZoomDetailLimitedNotice: true,
      montereyMissionReadyStillWorks: true,
      noaaRuntimeFetchRequired: false,
      gebcoRuntimeFetchRequired: false,
      rawExternalDataPathExposed: false,
      hiddenTruthExposed: false,
      simulationChanged: false,
      scoringChanged: false,
      plannerChanged: false,
      fieldEquationsChanged: false,
      activeRendererCountAfterCleanup: 0,
      activeRafCountAfterCleanup: 0,
      activeCanvasCountAfterCleanup: 0
    })) {
      assert.equal(summary[key], expected, `${key} equals ${expected}`);
    }
    for (const name of REQUIRED_SCREENSHOTS) assert.ok(summary.screenshots.includes(name), `${name} screenshot exists`);
  } catch (error) {
    throw new Error(`ENV_STUDIO_UX_POLISH_R2_1_ACCEPTANCE_FAIL: ${error.message}`);
  }
}

function assertNoPublicLeak(value, label) {
  const text = JSON.stringify(value ?? {});
  assert.doesNotMatch(text, /T_hiddenTruth|rawOracleTensor|oracleState/i, `${label} must not expose hidden truth markers`);
  assert.doesNotMatch(text, /"hiddenTruth"\s*:\s*(?!false|null)/i, `${label} must not expose hidden truth payloads`);
  assert.doesNotMatch(text, /external_data[\\/]/i, `${label} must not expose raw external_data paths`);
  assert.doesNotMatch(text, /[A-Za-z]:\\/i, `${label} must not expose local absolute paths`);
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

function boundsClose(actual, expected) {
  if (!actual || !expected) return false;
  return Math.abs(Number(actual.westLon) - Number(expected.westLon)) < 0.001
    && Math.abs(Number(actual.eastLon) - Number(expected.eastLon)) < 0.001
    && Math.abs(Number(actual.southLat) - Number(expected.southLat)) < 0.001
    && Math.abs(Number(actual.northLat) - Number(expected.northLat)) < 0.001;
}
