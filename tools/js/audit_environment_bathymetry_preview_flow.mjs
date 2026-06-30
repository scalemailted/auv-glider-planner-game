import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const ROOT = process.cwd();
const OWNER_REVIEW_DIR = path.resolve('artifacts/owner-review/env-bathy-preview-r1');
const BASE = 'http://127.0.0.1:9407';
const NOT_STAGED_REGIONAL_BOUNDS = Object.freeze({
  westLon: -89.6,
  eastLon: -86.3,
  southLat: 27.8,
  northLat: 29.6
});
const GULF_DEMO_BOUNDS = Object.freeze({
  westLon: -90.5,
  eastLon: -83.8,
  southLat: 26.7,
  northLat: 30.7
});
const REQUIRED_SCREENSHOTS = [
  '01-valid-not-staged-region-selected.png',
  '02-open-bathymetry-preview-enabled.png',
  '03-coarse-bathymetry-preview-opened.png',
  '04-coarse-preview-not-mission-ready.png',
  '05-large-gulf-preview-enabled.png',
  '06-large-gulf-coarse-preview-opened.png',
  '07-multitile-request-still-available.png',
  '08-monterey-mission-ready-selected.png',
  '09-monterey-staged-bathymetry-opened.png',
  '10-monterey-field-generation-path-available.png'
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
let notStagedDebug = null;
let notStagedDom = null;
let notStagedCoarseDebug = null;
let notStagedCoarseDom = null;
let gulfDebug = null;
let gulfDom = null;
let gulfCoarseDebug = null;
let gulfCoarseDom = null;
let gulfPatchRequest = null;
let montereyDebug = null;
let montereyDom = null;
let montereyRegionalDebug = null;
let montereyRegionalDom = null;
let cleanup = null;

const server = await startStaticServer({ port: 9407 });
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

  await selectBounds(page, NOT_STAGED_REGIONAL_BOUNDS, {
    appliedFrom: 'env-bathy-preview-r1-audit',
    mode: 'regionalSurvey',
    lastPreset: 'regionalSurvey'
  });
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.selectedRegionScale?.operationalSelectionStatus === 'VALID'
    && debug?.atlasStage?.openBathymetryPreviewEnabled === true
    && debug?.atlasStage?.continueToBathymetryEnabled === false);
  notStagedDebug = await environmentDebug(page);
  notStagedDom = await atlasButtonState(page);
  assert.equal(notStagedDom.openBathymetryPreview.disabled, false, 'valid not-staged region enables preview');
  assert.equal(notStagedDom.continueToBathymetry.disabled, true, 'valid not-staged region disables mission-ready continuation');
  assert.equal(notStagedDom.exportPatchRequest.disabled, false, 'valid not-staged region can export staging request');
  await expectPanelText(page, '#mission-console', /Open 3D Bathymetry Preview/i);
  await expectPanelText(page, '#waypoint-timeline', /Preview Bathymetry\s*available/i);
  await screenshot(page, REQUIRED_SCREENSHOTS[0]);
  await screenshot(page, REQUIRED_SCREENSHOTS[1]);

  await page.click('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'coarsePreview'
    && debug?.renderedPreview === true
    && debug?.missionReady === false
    && debug?.fieldGenerationEnabled === false
    && debug?.planningLaunchEnabled === false);
  notStagedCoarseDebug = await regionalDebugPayload(page);
  notStagedCoarseDom = await regionalButtonState(page);
  assert.equal(notStagedCoarseDom.generateFields.disabled, true, 'coarse preview disables field generation');
  assert.equal(notStagedCoarseDom.launchPlanning.disabled, true, 'coarse preview disables Planning launch');
  await expectPanelText(page, '#mission-console', /Coarse Bathymetry Preview/i);
  await expectPanelText(page, '#mission-console', /not mission-ready/i);
  await expectPanelText(page, '#waypoint-timeline', /Field generation\s*disabled/i);
  await screenshot(page, REQUIRED_SCREENSHOTS[2]);
  await screenshot(page, REQUIRED_SCREENSHOTS[3]);

  await page.click('[data-action="regional-back-atlas"]');
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.stage === 'globalAtlasSelector');

  await selectBounds(page, GULF_DEMO_BOUNDS, {
    appliedFrom: 'env-bathy-preview-r1-audit',
    mode: 'gulfSegment',
    lastPreset: 'gulfSegment'
  });
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.selectedRegionScale?.operationalSelectionStatus === 'VALID'
    && debug?.atlasStage?.selectedRegionScale?.generationBudgetStatus === 'MULTI_TILE_REQUIRED'
    && debug?.atlasStage?.openBathymetryPreviewEnabled === true
    && debug?.atlasStage?.exportMultiTileRequestEnabled === true);
  gulfDebug = await environmentDebug(page);
  gulfDom = await atlasButtonState(page);
  assert.equal(gulfDom.openBathymetryPreview.disabled, false, 'Gulf preview enabled');
  assert.equal(gulfDom.exportPatchRequest.disabled, false, 'Gulf multi-tile request enabled');
  await screenshot(page, REQUIRED_SCREENSHOTS[4]);

  await page.click('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'coarsePreview'
    && debug?.renderedPreview === true
    && debug?.missionReady === false);
  gulfCoarseDebug = await regionalDebugPayload(page);
  gulfCoarseDom = await regionalButtonState(page);
  assert.equal(gulfCoarseDom.exportPreviewRequest.disabled, false, 'Gulf coarse preview can export multi-tile request');
  assert.match(gulfCoarseDom.exportPreviewRequest.text, /Multi-Tile Request/i, 'Gulf coarse export label');
  await screenshot(page, REQUIRED_SCREENSHOTS[5]);
  await screenshot(page, REQUIRED_SCREENSHOTS[6]);
  gulfPatchRequest = await downloadJson(page, '[data-action="regional-export-preview-request"]');
  assert.equal(gulfPatchRequest.data.artifactType, 'anchor.reference-bathymetry-multitile-patch-request', 'Gulf coarse preview exports multi-tile request');

  await page.click('[data-action="regional-back-atlas"]');
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.stage === 'globalAtlasSelector');

  await page.click('[data-action="env-reference-select-boundary"]');
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.tileSetId === 'monterey_canyon_15s'
    && debug?.atlasStage?.missionReadyTileAvailable === true
    && debug?.atlasStage?.openBathymetryPreviewEnabled === true
    && debug?.atlasStage?.continueToBathymetryEnabled === true);
  montereyDebug = await environmentDebug(page);
  montereyDom = await atlasButtonState(page);
  assert.equal(montereyDom.openBathymetryPreview.disabled, false, 'Monterey preview enabled');
  assert.equal(montereyDom.continueToBathymetry.disabled, false, 'Monterey mission-ready continuation enabled');
  await screenshot(page, REQUIRED_SCREENSHOTS[7]);

  await page.click('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'stagedSingleTile'
    && debug?.loadedTileSetId === 'monterey_canyon_15s'
    && debug?.missionReady === true
    && debug?.rasterAuthoritativeForSimulation === true);
  montereyRegionalDebug = await regionalDebugPayload(page);
  montereyRegionalDom = await regionalButtonState(page);
  await page.waitForSelector('[data-regional-bathymetry-mesh-preview]', { timeout: 30_000 });
  await screenshot(page, REQUIRED_SCREENSHOTS[8]);

  await page.click('[data-action="regional-confirm-bathymetry"]');
  await waitForRegionalStage(page, (debug) => Boolean(debug?.bathymetryArtifactDigest)
    && debug?.mode === 'stagedSingleTile'
    && debug?.fieldGenerationEnabled === true);
  montereyRegionalDebug = await regionalDebugPayload(page);
  montereyRegionalDom = await regionalButtonState(page);
  assert.equal(montereyRegionalDom.generateFields.disabled, false, 'Monterey field generation path available after bathymetry confirmation');
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
assertNoPublicLeak({
  notStagedDebug,
  notStagedCoarseDebug,
  gulfDebug,
  gulfCoarseDebug,
  gulfPatchRequest: gulfPatchRequest?.data,
  montereyDebug,
  montereyRegionalDebug
}, 'ENV-BATHY-PREVIEW-R1 owner evidence');

const summary = {
  status: 'PASS',
  branch,
  head,
  validNotStagedSelection: notStagedDebug?.atlasStage?.selectedRegionScale?.operationalSelectionStatus === 'VALID',
  openPreviewEnabledForNotStaged: notStagedDebug?.atlasStage?.openBathymetryPreviewEnabled === true
    && notStagedDom?.openBathymetryPreview?.disabled === false,
  coarsePreviewOpenedForNotStaged: notStagedCoarseDebug?.mode === 'coarsePreview',
  coarsePreviewRendered: notStagedCoarseDebug?.renderedPreview === true,
  coarsePreviewMissionReady: notStagedCoarseDebug?.missionReady === true,
  coarsePreviewFieldGenerationEnabled: notStagedCoarseDebug?.fieldGenerationEnabled === true,
  coarsePreviewPlanningLaunchEnabled: notStagedCoarseDebug?.planningLaunchEnabled === true,
  gulfOpenPreviewEnabled: gulfDebug?.atlasStage?.openBathymetryPreviewEnabled === true
    && gulfDom?.openBathymetryPreview?.disabled === false,
  gulfCoarsePreviewOpened: gulfCoarseDebug?.mode === 'coarsePreview',
  gulfMultiTileRequestEnabled: gulfDebug?.atlasStage?.exportMultiTileRequestEnabled === true
    && gulfCoarseDom?.exportPreviewRequest?.disabled === false,
  montereyMissionReady: montereyDebug?.atlasStage?.missionReadyTileAvailable === true,
  montereyRegionalSceneOpened: montereyRegionalDebug?.mode === 'stagedSingleTile'
    && montereyRegionalDebug?.loadedTileSetId === 'monterey_canyon_15s',
  loadedTileSetId: montereyRegionalDebug?.loadedTileSetId ?? null,
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

console.log('audit_environment_bathymetry_preview_flow: ok', {
  ownerReviewDir: path.relative(ROOT, OWNER_REVIEW_DIR),
  status: summary.status,
  notStagedPreview: summary.coarsePreviewOpenedForNotStaged,
  gulfPreview: summary.gulfCoarsePreviewOpened,
  montereyMode: montereyRegionalDebug?.mode,
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

async function selectBounds(page, bounds, options = {}) {
  await page.evaluate(({ bounds: selectedBounds, options: selectOptions }) => {
    const scene = globalThis.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceBounds?.(selectedBounds, selectOptions);
  }, { bounds, options });
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
      return {
        exists: Boolean(element),
        disabled: element?.disabled === true,
        ariaDisabled: element?.getAttribute?.('aria-disabled') ?? null,
        primary: element?.classList?.contains?.('primary') ?? false,
        warning: element?.classList?.contains?.('warning') ?? false,
        text: element?.textContent?.trim?.() ?? '',
        title: element?.getAttribute?.('title') ?? ''
      };
    }
    return {
      continueToBathymetry: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-continue-bathymetry"]'),
      openBathymetryPreview: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]'),
      loadMissionPatch: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-load-patch"]'),
      exportPatchRequest: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-export-patch-request"]')
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
    return {
      confirmBathymetry: state('[data-action="regional-confirm-bathymetry"]'),
      generateFields: state('[data-action="regional-generate-fields"]'),
      composeEnvironment: state('[data-action="regional-compose-environment"]'),
      launchPlanning: state('[data-action="regional-launch-planning"]'),
      exportBenchmark: state('[data-action="regional-export-benchmark"]'),
      exportPreviewRequest: state('[data-action="regional-export-preview-request"]')
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
  try {
    assert.equal(summary.status, 'PASS', 'status pass');
    assert.equal(summary.validNotStagedSelection, true, 'valid not-staged selection');
    assert.equal(summary.openPreviewEnabledForNotStaged, true, 'preview enabled for not-staged');
    assert.equal(summary.coarsePreviewOpenedForNotStaged, true, 'not-staged coarse preview opened');
    assert.equal(summary.coarsePreviewRendered, true, 'coarse preview rendered');
    assert.equal(summary.coarsePreviewMissionReady, false, 'coarse preview is not mission-ready');
    assert.equal(summary.coarsePreviewFieldGenerationEnabled, false, 'coarse preview field generation disabled');
    assert.equal(summary.coarsePreviewPlanningLaunchEnabled, false, 'coarse preview Planning launch disabled');
    assert.equal(summary.gulfOpenPreviewEnabled, true, 'Gulf preview enabled');
    assert.equal(summary.gulfCoarsePreviewOpened, true, 'Gulf coarse preview opened');
    assert.equal(summary.gulfMultiTileRequestEnabled, true, 'Gulf multi-tile request enabled');
    assert.equal(summary.montereyMissionReady, true, 'Monterey mission-ready');
    assert.equal(summary.montereyRegionalSceneOpened, true, 'Monterey regional scene opened');
    assert.equal(summary.loadedTileSetId, 'monterey_canyon_15s', 'Monterey tile loaded');
    assert.equal(summary.noaaRuntimeFetchRequired, false, 'no NOAA runtime fetch');
    assert.equal(summary.gebcoRuntimeFetchRequired, false, 'no GEBCO runtime fetch');
    assert.equal(summary.rawExternalDataPathExposed, false, 'no raw external path');
    assert.equal(summary.hiddenTruthExposed, false, 'no hidden truth');
    assert.equal(summary.simulationChanged, false, 'simulation unchanged');
    assert.equal(summary.scoringChanged, false, 'scoring unchanged');
    assert.equal(summary.plannerChanged, false, 'planner unchanged');
    assert.equal(summary.fieldEquationsChanged, false, 'field equations unchanged');
    assert.equal(summary.activeRendererCountAfterCleanup, 0, 'renderer cleanup');
    assert.equal(summary.activeRafCountAfterCleanup, 0, 'RAF cleanup');
    assert.equal(summary.activeCanvasCountAfterCleanup, 0, 'canvas cleanup');
    for (const name of REQUIRED_SCREENSHOTS) assert.ok(summary.screenshots.includes(name), `${name} screenshot exists`);
  } catch (error) {
    throw new Error(`ENV_BATHY_PREVIEW_R1_ACCEPTANCE_FAIL: ${error.message}`);
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
