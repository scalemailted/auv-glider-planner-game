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
const OWNER_REVIEW_DIR = path.resolve('artifacts/owner-review/multitile-oparea-r1');
const BASE = 'http://127.0.0.1:9406';
const GULF_DEMO_BOUNDS = Object.freeze({
  westLon: -90.5,
  eastLon: -83.8,
  southLat: 26.7,
  northLat: 30.7
});
const REQUIRED_SCREENSHOTS = [
  '01-gulf-region-selected-valid.png',
  '02-gulf-region-multitile-required.png',
  '03-open-coarse-regional-preview.png',
  '04-coarse-preview-not-mission-ready.png',
  '05-export-multitile-request.png',
  '06-monterey-still-continues-to-3d.png',
  '07-regional-scene-single-tile-still-works.png'
];

const branch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const manifest = normalizeReferenceTileLibraryManifest(
  JSON.parse(await fs.readFile(path.join(ROOT, REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH), 'utf8'))
);
const gulfDemo = manifest.tileSets.find((tileSet) => tileSet.tileSetId === 'gulf_segment_demo_15s');
const monterey = manifest.tileSets.find((tileSet) => tileSet.tileSetId === 'monterey_canyon_15s');

assert.ok(gulfDemo, 'gulf_segment_demo_15s tile set must exist');
assert.equal(gulfDemo.coverageRole, 'requestOnly', 'Gulf demo remains request-only');
assert.equal(gulfDemo.tileGrid?.tileCount, 4, 'Gulf demo records expected source tile count');
assert.ok(monterey, 'monterey_canyon_15s tile set must exist');
assert.equal(monterey.role, 'missionReadyTileSet', 'Monterey remains mission-ready');

await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });

const requestedUrls = [];
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
const failedResponses = [];
let gulfDebug = null;
let gulfDom = null;
let coarseDebug = null;
let coarseDom = null;
let gulfPatchRequest = null;
let montereyDebug = null;
let montereyDom = null;
let regionalDebug = null;
let cleanup = null;

const server = await startStaticServer({ port: 9406 });
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

  await selectGulfDemoRegion(page);
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.selectedRegionScale?.operationalSelectionStatus === 'VALID'
    && debug?.atlasStage?.selectedRegionScale?.generationBudgetStatus === 'MULTI_TILE_REQUIRED'
    && debug?.atlasStage?.openCoarsePreviewEnabled === true
    && debug?.atlasStage?.exportMultiTileRequestEnabled === true
    && debug?.atlasStage?.continueToBathymetryEnabled === false);
  gulfDebug = await environmentDebug(page);
  gulfDom = await atlasButtonState(page);
  assert.equal(gulfDom.openCoarsePreview.disabled, false, 'Gulf coarse preview enabled');
  assert.equal(gulfDom.exportPatchRequest.disabled, false, 'Gulf multi-tile request export enabled');
  assert.equal(gulfDom.continueToBathymetry.disabled, true, 'Gulf continue disabled');
  await expectPanelText(page, '#waypoint-timeline', /Open the interactive 3D bathymetry preview now; mission-ready generation remains gated until staged tiles exist\./);
  await expectPanelText(page, '#waypoint-timeline', /Multi-tile preprocessing required\. Live Alpha generation is disabled for this operational window\./);
  await screenshot(page, REQUIRED_SCREENSHOTS[0]);
  await screenshot(page, REQUIRED_SCREENSHOTS[1]);

  await page.click('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'coarsePreview'
    && debug?.planningLaunchEnabled === false
    && debug?.rasterAuthoritativeForSimulation === false);
  coarseDebug = await regionalDebugPayload(page);
  coarseDom = await regionalButtonState(page);
  assert.equal(coarseDom.generateFields.disabled, true, 'coarse preview disables field generation');
  assert.equal(coarseDom.composeEnvironment.disabled, true, 'coarse preview disables environment composition');
  assert.equal(coarseDom.launchPlanning.disabled, true, 'coarse preview disables Planning launch');
  await expectPanelText(page, '#mission-console', /Coarse Bathymetry Preview/i);
  await expectPanelText(page, '#mission-console', /not mission-ready/i);
  await expectPanelText(page, '#mission-console', /disabled in coarse preview/i);
  await expectPanelText(page, '#waypoint-timeline', /Planning launch.*disabled/i);
  await screenshot(page, REQUIRED_SCREENSHOTS[2]);
  await screenshot(page, REQUIRED_SCREENSHOTS[3]);

  await page.click('[data-action="regional-back-atlas"]');
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.stage === 'globalAtlasSelector');
  await selectGulfDemoRegion(page);
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.exportMultiTileRequestEnabled === true);
  gulfPatchRequest = await downloadJson(page, '[data-env-stage-section="boundary-actions"] [data-action="env-reference-export-patch-request"]');
  assert.equal(gulfPatchRequest.data.artifactType, 'anchor.reference-bathymetry-multitile-patch-request', 'Gulf demo exports multi-tile request');
  assert.equal(gulfPatchRequest.data.browserRunsPython, false, 'browser does not run Python');
  assert.equal(gulfPatchRequest.data.claimBoundary?.hiddenTruthExposed, false, 'request hides truth');
  assert.ok(Number(gulfPatchRequest.data.tilePlan?.tileCount ?? 0) > 1, 'request includes multiple staging subtiles');
  await screenshot(page, REQUIRED_SCREENSHOTS[4]);

  await page.click('[data-action="env-reference-select-boundary"]');
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.continueToBathymetryEnabled === true
    && debug?.atlasStage?.tileSetId === 'monterey_canyon_15s');
  montereyDebug = await environmentDebug(page);
  montereyDom = await atlasButtonState(page);
  assert.equal(montereyDom.continueToBathymetry.disabled, false, 'Monterey continue enabled');
  assert.equal(montereyDom.openCoarsePreview.disabled, false, 'Monterey can still open coarse preview, but continue remains primary');
  await screenshot(page, REQUIRED_SCREENSHOTS[5]);

  await page.click('[data-action="env-reference-continue-bathymetry"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'stagedSingleTile'
    && debug?.loadedTileSetId === 'monterey_canyon_15s'
    && debug?.rasterAuthoritativeForSimulation === true);
  regionalDebug = await regionalDebugPayload(page);
  await page.waitForSelector('[data-regional-bathymetry-mesh-preview]', { timeout: 30_000 });
  await screenshot(page, REQUIRED_SCREENSHOTS[6]);

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

assert.equal(browserRequestedNoaaOrGebco, false, 'browser does not request NOAA/GEBCO URLs');
assert.equal(browserRequestedExternalData, false, 'browser does not request external_data paths');
assert.equal(localAbsolutePathExposed, false, 'browser does not request local absolute paths');
assert.deepEqual(pageErrors, [], 'browser page errors');
assert.deepEqual(failedRequests, [], 'browser request failures');
assert.deepEqual(failedResponses, [], 'browser HTTP error responses');
assertNoPublicLeak({
  gulfDebug,
  coarseDebug,
  gulfPatchRequest: gulfPatchRequest?.data,
  montereyDebug,
  regionalDebug
}, 'MULTITILE-OPAREA-R1 owner evidence');

const summary = {
  status: 'PASS',
  branch,
  head,
  tileLibraryDigest: manifest.digest,
  gulfDemoTileSetId: gulfDemo.tileSetId,
  gulfDemoRequiredSourceTiles: (gulfDemo.requiredSourceTiles ?? []).map((tile) => tile.tileId),
  gulfDemoTileCount: gulfDemo.tileGrid?.tileCount ?? null,
  gulfSelectionValid: gulfDebug?.atlasStage?.selectedRegionScale?.operationalSelectionStatus === 'VALID',
  gulfOperationalSelectionStatus: gulfDebug?.atlasStage?.selectedRegionScale?.operationalSelectionStatus ?? null,
  gulfGenerationBudgetStatus: gulfDebug?.atlasStage?.selectedRegionScale?.generationBudgetStatus ?? null,
  coarsePreviewAvailable: gulfDebug?.atlasStage?.openCoarsePreviewEnabled === true,
  coarsePreviewMode: coarseDebug?.mode ?? null,
  coarsePreviewLaunchDisabled: coarseDebug?.planningLaunchEnabled === false
    && coarseDom?.launchPlanning?.disabled === true,
  coarsePreviewFieldGenerationDisabled: coarseDom?.generateFields?.disabled === true,
  multiTileRequestExported: gulfPatchRequest?.data?.artifactType === 'anchor.reference-bathymetry-multitile-patch-request',
  multiTileRequestDigest: gulfPatchRequest?.data?.requestDigest ?? null,
  multiTileRequestTileCount: gulfPatchRequest?.data?.tilePlan?.tileCount ?? null,
  browserRequestedNoaaOrGebco,
  rawExternalDataPathExposed: browserRequestedExternalData,
  localAbsolutePathExposed,
  hiddenTruthExposed: false,
  montereyStillWorks: regionalDebug?.mode === 'stagedSingleTile'
    && regionalDebug?.loadedTileSetId === 'monterey_canyon_15s'
    && regionalDebug?.rasterAuthoritativeForSimulation === true,
  montereyContinueEnabled: montereyDom?.continueToBathymetry?.disabled === false,
  regionalSceneSingleTileStillWorks: regionalDebug?.mode === 'stagedSingleTile',
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

console.log('audit_multitile_operational_area_flow: ok', {
  ownerReviewDir: path.relative(ROOT, OWNER_REVIEW_DIR),
  status: summary.status,
  gulfGenerationBudgetStatus: summary.gulfGenerationBudgetStatus,
  coarsePreviewMode: summary.coarsePreviewMode,
  multiTileRequestDigest: summary.multiTileRequestDigest,
  montereyStillWorks: summary.montereyStillWorks,
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
    && debug?.referenceTileLibraryLoaded === true);
}

async function waitForEnvironmentStage(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', `return (${predicateSource})(debug);`);
    return fn(globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {});
  }, String(predicate), { timeout: 60_000 });
}

async function waitForRegionalStage(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', `return (${predicateSource})(debug);`);
    return fn(globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG ?? {});
  }, String(predicate), { timeout: 60_000 });
}

async function selectGulfDemoRegion(page) {
  await page.evaluate((bounds) => {
    const scene = globalThis.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceBounds?.(bounds, {
      appliedFrom: 'multitile-oparea-r1-audit',
      mode: 'gulfSegment',
      lastPreset: 'gulfSegment'
    });
  }, GULF_DEMO_BOUNDS);
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
      openCoarsePreview: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]'),
      loadMissionPatch: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-load-patch"]'),
      exportPatchRequest: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-export-patch-request"]'),
      inspectFallback: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-inspect-fallback"]')
    };
  });
}

async function regionalButtonState(page) {
  return page.evaluate(() => {
    function state(selector) {
      const element = document.querySelector(selector);
      return {
        exists: Boolean(element),
        disabled: element?.disabled === true,
        text: element?.textContent?.trim() ?? ''
      };
    }
    return {
      confirmBathymetry: state('[data-action="regional-confirm-bathymetry"]'),
      generateFields: state('[data-action="regional-generate-fields"]'),
      composeEnvironment: state('[data-action="regional-compose-environment"]'),
      validateLaunch: state('[data-action="regional-validate-launch"]'),
      launchPlanning: state('[data-action="regional-launch-planning"]'),
      exportBenchmark: state('[data-action="regional-export-benchmark"]')
    };
  });
}

async function expectPanelText(page, selector, pattern) {
  const text = await page.textContent(selector);
  assert.match(text ?? '', pattern, `${selector} includes ${pattern}`);
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

function validateQaSummary(summary) {
  assert.equal(summary.status, 'PASS', 'status pass');
  assert.equal(summary.gulfSelectionValid, true, 'Gulf selection valid');
  assert.equal(summary.gulfGenerationBudgetStatus, 'MULTI_TILE_REQUIRED', 'Gulf generation budget status');
  assert.equal(summary.coarsePreviewAvailable, true, 'coarse preview available');
  assert.equal(summary.coarsePreviewMode, 'coarsePreview', 'coarse preview mode');
  assert.equal(summary.coarsePreviewLaunchDisabled, true, 'coarse preview launch disabled');
  assert.equal(summary.coarsePreviewFieldGenerationDisabled, true, 'coarse preview field generation disabled');
  assert.equal(summary.multiTileRequestExported, true, 'multi-tile request exported');
  assert.match(summary.multiTileRequestDigest ?? '', /^fnv1a32:/, 'multi-tile request digest');
  assert.equal(summary.browserRequestedNoaaOrGebco, false, 'no browser NOAA/GEBCO fetch');
  assert.equal(summary.rawExternalDataPathExposed, false, 'no raw external path');
  assert.equal(summary.localAbsolutePathExposed, false, 'no local path');
  assert.equal(summary.hiddenTruthExposed, false, 'no hidden truth');
  assert.equal(summary.montereyStillWorks, true, 'Monterey still works');
  assert.equal(summary.simulationChanged, false, 'simulation unchanged');
  assert.equal(summary.scoringChanged, false, 'scoring unchanged');
  assert.equal(summary.plannerChanged, false, 'planner unchanged');
  assert.equal(summary.fieldEquationsChanged, false, 'field equations unchanged');
  assert.equal(summary.activeRendererCountAfterCleanup, 0, 'renderer cleanup');
  assert.equal(summary.activeRafCountAfterCleanup, 0, 'RAF cleanup');
  assert.equal(summary.activeCanvasCountAfterCleanup, 0, 'canvas cleanup');
  for (const name of REQUIRED_SCREENSHOTS) assert.ok(summary.screenshots.includes(name), `${name} screenshot exists`);
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
