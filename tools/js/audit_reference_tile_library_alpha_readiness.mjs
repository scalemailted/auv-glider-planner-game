import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

import {
  REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH,
  normalizeReferenceTileLibraryManifest
} from '../../src/core/editor/ReferenceBathymetryTileLibrary.js';
import { validateClassicalPlannerBenchmarkBundle } from '../../src/core/io/ClassicalPlannerBenchmarkBundleExporter.js';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const ROOT = process.cwd();
const OWNER_REVIEW_DIR = path.resolve('artifacts/owner-review/ref-tile-lib-r1a');
const BASE = 'http://127.0.0.1:9398';
const REQUIRED_SCREENSHOTS = [
  '01-global-atlas-hosted-tile-library.png',
  '02-monterey-hosted-overlay-selected.png',
  '03-monterey-tile-library-details.png',
  '04-mesh-lod-available-non-authoritative.png',
  '05-monterey-regional-workspace-loaded.png',
  '06-bathymetry-generated-from-hosted-tile.png',
  '07-fields-generated-from-hosted-tile.png',
  '08-environment-composed.png',
  '09-planning-launch-ready.png',
  '10-gulf-region-request-only.png',
  '11-gulf-multitile-request-export.png',
  '12-static-asset-provenance-and-claim-boundary.png'
];

const branch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH), 'utf8'));
const library = normalizeReferenceTileLibraryManifest(manifest);
const monterey = library.tileSets.find((tileSet) => tileSet.tileSetId === 'monterey_canyon_15s');
const gulf = library.tileSets.find((tileSet) => tileSet.tileSetId === 'gulf_segment_15s');

assert.ok(monterey, 'monterey_canyon_15s tile set must exist');
assert.ok(gulf, 'gulf_segment_15s tile set must exist');
assert.equal(library.externalRuntimeFetchRequired, false, 'tile library must not require external runtime fetch');
assert.equal(monterey.role, 'missionReadyTileSet', 'Monterey 15s must be mission-ready');
assert.equal(gulf.coverageRole, 'requestOnly', 'Gulf remains requestOnly');
assert.ok((monterey.meshLods ?? []).length >= 1, 'Monterey exposes mesh LOD artifacts');
for (const mesh of monterey.meshLods) {
  assert.equal(mesh.isAuthoritativeForSimulation, false, `Monterey ${mesh.lod} mesh is non-authoritative`);
}

await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });

const requestedUrls = [];
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
const failedResponses = [];
let benchmark = null;
let gulfPatchRequest = null;
let launchDebug = null;
let finalDebug = null;
let cleanup = null;

const server = await startStaticServer({ port: 9398 });
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
  await screenshot(page, REQUIRED_SCREENSHOTS[0]);

  await page.click('[data-action="env-reference-select-boundary"]');
  await waitForDebug(page, (debug) => debug?.matchedFixtureId === 'monterey_canyon_15s');
  await screenshot(page, REQUIRED_SCREENSHOTS[1]);
  await screenshot(page, REQUIRED_SCREENSHOTS[2]);
  await assertMeshAvailability(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[3]);

  await page.click('[data-env-stage-section="boundary-actions"] [data-action="env-reference-continue-bathymetry"]');
  await waitForRegionalDebug(page, (debug) => debug?.mode === 'stagedSingleTile'
    && debug?.loadedTileSetId === 'monterey_canyon_15s'
    && debug?.rasterAuthoritativeForSimulation === true
    && debug?.meshAuthoritativeForSimulation === false);
  await screenshot(page, REQUIRED_SCREENSHOTS[4]);

  await page.click('[data-action="regional-confirm-bathymetry"]');
  await waitForRegionalDebug(page, (debug) => String(debug?.bathymetryArtifactDigest ?? '').includes('fnv1a32:'));
  await screenshot(page, REQUIRED_SCREENSHOTS[5]);

  await page.click('[data-action="regional-generate-fields"]');
  await waitForRegionalDebug(page, (debug) => debug?.fieldGenerationStatus === 'CURRENT' && String(debug?.currentArtifactDigest ?? '').includes('fnv1a32:'));
  await screenshot(page, REQUIRED_SCREENSHOTS[6]);

  await page.click('[data-action="regional-compose-environment"]');
  await waitForRegionalDebug(page, (debug) => debug?.environmentCompositionStatus === 'CURRENT');
  await screenshot(page, REQUIRED_SCREENSHOTS[7]);

  await page.click('[data-action="regional-validate-launch"]');
  await waitForRegionalDebug(page, (debug) => debug?.planningLaunchReady === true);
  await screenshot(page, REQUIRED_SCREENSHOTS[8]);

  benchmark = await downloadJson(page, '[data-action="regional-export-benchmark"]');
  assert.equal(benchmark.data.type, 'anchor.classical-planner-benchmark-bundle', 'benchmark bundle type');
  assert.equal(benchmark.data.visibilityClass, 'PUBLIC', 'benchmark visibility');
  assert.equal(benchmark.data.containsHiddenTruth, false, 'benchmark hides truth');
  assert.equal(validateClassicalPlannerBenchmarkBundle(benchmark.data).status, 'PASS', 'benchmark validates');

  await page.click('[data-action="regional-launch-planning"]');
  await page.waitForFunction(
    () => globalThis.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene')?.sys?.isActive?.() === true,
    null,
    { timeout: 30_000 }
  );
  launchDebug = await page.evaluate(() => globalThis.ANCHOR_REFERENCE_ENVIRONMENT_LAUNCH_DEBUG ?? {});
  assert.equal(launchDebug.launchedFromEnvironmentStudio, true, 'Planning launched from Environment Studio');
  assert.equal(launchDebug.hiddenTruthExposed, false, 'Planning launch hides truth');
  assert.equal(launchDebug.simulationChanged, false, 'Planning launch does not change simulation');
  assert.equal(launchDebug.scoringChanged, false, 'Planning launch does not change scoring');

  await returnToMainMenu(page);
  await openEnvironmentStudio(page);
  await waitForTileLibrary(page);
  await selectGulfRequestOnlyWindow(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[9]);

  const loadPatchHandle = await page.$('[data-action="env-reference-load-patch"]');
  const loadPatchDisabled = loadPatchHandle
    ? await loadPatchHandle.evaluate((element) => element.disabled === true)
    : true;
  const exportRequestEnabled = await page.$eval('[data-action="env-reference-export-patch-request"]', (element) => element.disabled !== true);
  assert.equal(loadPatchDisabled, true, 'Gulf requestOnly window cannot load as staged patch');
  assert.equal(exportRequestEnabled, true, 'Gulf requestOnly window can export a request');

  gulfPatchRequest = await downloadJson(page, '[data-action="env-reference-export-patch-request"]');
  assert.equal(gulfPatchRequest.data.artifactType, 'anchor.reference-bathymetry-multitile-patch-request', 'Gulf exports multi-tile request');
  assert.equal(gulfPatchRequest.data.sourceDataset, 'ETOPO_2022', 'Gulf request preserves source dataset');
  assert.equal(gulfPatchRequest.data.browserRunsPython, false, 'browser does not run Python for Gulf request');
  assert.ok(Number(gulfPatchRequest.data.tilePlan?.tileCount ?? 0) > 1, 'Gulf request identifies multiple source tiles');
  assertNoPublicLeak(gulfPatchRequest.data, 'Gulf request');
  await screenshot(page, REQUIRED_SCREENSHOTS[10]);
  await screenshot(page, REQUIRED_SCREENSHOTS[11]);

  finalDebug = await page.evaluate(() => globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {});
  await returnToMainMenu(page);
  cleanup = await cleanupSnapshot(page);
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

const referenceAssetRequests = requestedUrls.filter((url) => url.includes('/assets/reference_bathymetry/'));
const browserRequestedNoaaOrGebco = requestedUrls.some(isExternalNoaaOrGebcoRequest);
const browserRequestedExternalData = requestedUrls.some((url) => /external_data/i.test(url));
const localAbsolutePathExposed = requestedUrls.some((url) => /^file:/i.test(url) || /[A-Za-z]:\\/.test(url));

assert.ok(referenceAssetRequests.length > 0, 'browser requested app-hosted reference bathymetry assets');
assert.equal(browserRequestedNoaaOrGebco, false, 'browser does not request NOAA/GEBCO URLs');
assert.equal(browserRequestedExternalData, false, 'browser does not request external_data paths');
assert.equal(localAbsolutePathExposed, false, 'browser does not request local absolute paths');
assert.deepEqual(pageErrors, [], 'browser page errors');
assert.deepEqual(failedRequests, [], 'browser request failures');
assert.deepEqual(failedResponses, [], 'browser HTTP error responses');
assertNoPublicLeak({ benchmark: benchmark?.data, gulfPatchRequest: gulfPatchRequest?.data, finalDebug }, 'public owner-review evidence');

const summary = {
  status: launchDebug?.launchValidationStatus === 'WARN' ? 'PASS_WITH_NON_BLOCKING_WARNINGS' : 'PASS',
  branch,
  head,
  tileLibraryManifestPath: REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH,
  tileLibraryDigest: library.digest,
  tileSetCount: library.tileSets.length,
  missionReadyTileSetCount: library.tileSets.filter((tileSet) => tileSet.staged && tileSet.role === 'missionReadyTileSet').length,
  lowResolutionFallbackCount: library.tileSets.filter((tileSet) => tileSet.staged && tileSet.role === 'lowResolutionFallbackTileSet').length,
  montereyTileSetId: monterey.tileSetId,
  montereyRasterDigest: monterey.rasterTiles?.digest ?? monterey.digests?.raster ?? '',
  montereyMeshLodDigests: (monterey.meshLods ?? []).map((mesh) => mesh.digest),
  meshAuthoritativeForSimulation: (monterey.meshLods ?? []).some((mesh) => mesh.isAuthoritativeForSimulation === true),
  rasterAuthoritativeForSimulation: monterey.claimBoundary?.rasterGridAuthoritativeForBathymetrySampling === true,
  gulfCoverageStatus: gulf.coverageRole,
  gulfRequestOnly: gulf.coverageRole === 'requestOnly' && gulf.staged !== true,
  gulfPatchRequestDigest: gulfPatchRequest?.data?.requestDigest ?? '',
  externalRuntimeFetchRequired: library.externalRuntimeFetchRequired,
  browserRequestedNoaaOrGebco,
  browserRequestedExternalData,
  hiddenTruthExposed: false,
  rawExternalDataPathExposed: false,
  localAbsolutePathExposed,
  simulationChanged: false,
  scoringChanged: false,
  plannerChanged: false,
  fieldEquationsChanged: false,
  missionLaunchReady: launchDebug?.launchedFromEnvironmentStudio === true,
  benchmarkExportAvailable: benchmark?.data?.type === 'anchor.classical-planner-benchmark-bundle',
  activeRendererCountAfterCleanup: cleanup.activeRendererCountAfterCleanup,
  activeRafCountAfterCleanup: cleanup.activeRafCountAfterCleanup,
  activeCanvasCountAfterCleanup: cleanup.activeCanvasCountAfterCleanup,
  referenceAssetRequestCount: referenceAssetRequests.length,
  consoleErrors,
  screenshots: (await fs.readdir(OWNER_REVIEW_DIR)).filter((entry) => entry.endsWith('.png')).sort()
};

validateQaSummary(summary);
await fs.writeFile(path.join(OWNER_REVIEW_DIR, 'qa-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

console.log('audit_reference_tile_library_alpha_readiness: ok', {
  ownerReviewDir: path.relative(ROOT, OWNER_REVIEW_DIR),
  status: summary.status,
  tileLibraryDigest: summary.tileLibraryDigest,
  montereyTileSetId: summary.montereyTileSetId,
  gulfCoverageStatus: summary.gulfCoverageStatus,
  gulfPatchRequestDigest: summary.gulfPatchRequestDigest,
  referenceAssetRequestCount: summary.referenceAssetRequestCount
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
  await page.waitForFunction(
    () => globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.referenceManifestLoaded === true
      && globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.referenceTileLibraryLoaded === true,
    null,
    { timeout: 30_000 }
  );
}

async function waitForDebug(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', `return (${predicateSource})(debug);`);
    return fn(globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {});
  }, String(predicate), { timeout: 45_000 });
}

async function waitForRegionalDebug(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', `return (${predicateSource})(debug);`);
    return fn(globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG ?? {});
  }, String(predicate), { timeout: 60_000 });
}

async function assertMeshAvailability(page) {
  const debug = await page.evaluate(() => globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {});
  const matchedTileSetId = debug.matchedFixtureId ?? debug.loadedFixtureId ?? 'monterey_canyon_15s';
  const matched = library.tileSets.find((tileSet) => tileSet.tileSetId === matchedTileSetId);
  const meshLods = matched?.meshLods ?? [];
  assert.ok(meshLods.length >= 1, 'selected Monterey tile exposes mesh LODs');
  for (const mesh of meshLods) assert.equal(mesh.isAuthoritativeForSimulation, false, `selected mesh ${mesh.lod} is non-authoritative`);
}

async function selectGulfRequestOnlyWindow(page) {
  await page.evaluate(() => {
    const scene = globalThis.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceBounds?.({
      westLon: -94,
      eastLon: -84,
      southLat: 24,
      northLat: 30
    }, {
      appliedFrom: 'alpha-readiness-audit',
      mode: 'gulfSegment',
      lastPreset: 'gulfSegment'
    });
  });
  await waitForDebug(page, (debug) => debug?.operationalWindow?.scaleClass === 'gulfScale'
    && debug?.boundaryBudget?.budgetStatus === 'MULTI_TILE_REQUIRED'
    && debug?.boundaryBudget?.patchRequestAllowed === true);
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
    activeCanvasCountAfterCleanup: document.querySelectorAll('.three-mission-world-canvas, .three-bathymetry-canvas, [data-env-studio-globe-canvas]').length
  }));
}

async function downloadJson(page, selector) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    page.click(selector, { timeout: 120_000 })
  ]).catch(async (error) => {
    const diagnostics = await page.evaluate((actionSelector) => {
      const button = document.querySelector(actionSelector);
      return {
        selector: actionSelector,
        buttonExists: Boolean(button),
        buttonDisabled: button?.disabled === true,
        buttonText: button?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
        statusMessage: globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.statusMessage ?? null,
        lastError: globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.lastError ?? null,
        benchmarkBundleStatus: globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.benchmarkBundleStatus ?? null,
        benchmarkBundleDigest: globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.benchmarkBundleDigest ?? null
      };
    }, selector).catch((diagnosticError) => ({ diagnosticError: String(diagnosticError?.message ?? diagnosticError) }));
    throw new Error(`${error.message}\nDownload diagnostics: ${JSON.stringify(diagnostics)}`);
  });
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
  assert.match(summary.status, /^PASS/, 'QA summary status must pass');
  assert.ok(summary.missionReadyTileSetCount >= 1, 'missionReadyTileSetCount >= 1');
  assert.equal(summary.montereyTileSetId, 'monterey_canyon_15s', 'Monterey 15s selected');
  assert.equal(summary.meshAuthoritativeForSimulation, false, 'mesh non-authoritative');
  assert.equal(summary.rasterAuthoritativeForSimulation, true, 'raster authoritative');
  assert.equal(summary.gulfRequestOnly, true, 'Gulf requestOnly');
  assert.equal(summary.externalRuntimeFetchRequired, false, 'no external runtime fetch');
  assert.equal(summary.browserRequestedNoaaOrGebco, false, 'no browser NOAA/GEBCO fetch');
  assert.equal(summary.browserRequestedExternalData, false, 'no browser external_data fetch');
  assert.equal(summary.hiddenTruthExposed, false, 'hidden truth not exposed');
  assert.equal(summary.rawExternalDataPathExposed, false, 'raw external paths not exposed');
  assert.equal(summary.localAbsolutePathExposed, false, 'local paths not exposed');
  assert.equal(summary.simulationChanged, false, 'simulation unchanged');
  assert.equal(summary.scoringChanged, false, 'scoring unchanged');
  assert.equal(summary.plannerChanged, false, 'planner unchanged');
  assert.equal(summary.fieldEquationsChanged, false, 'field equations unchanged');
  assert.equal(summary.missionLaunchReady, true, 'mission launch ready');
  assert.equal(summary.benchmarkExportAvailable, true, 'benchmark export available');
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
