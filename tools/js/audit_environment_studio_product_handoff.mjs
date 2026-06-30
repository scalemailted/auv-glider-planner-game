import assert from 'node:assert/strict';

import { chromium } from 'playwright';

import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const BASE = 'http://127.0.0.1:9415';
const REQUIRED_REGION_LABELS = [
  'None',
  'Monterey Canyon',
  'Hawaii / Island Slope',
  'Puerto Rico Trench / Island Shelf',
  'Florida Straits',
  'Gulf Shelf / Canyon Segment',
  'Northeast US Shelf Break',
  'California Shelf Break',
  'Alaska Fjord / Shelf Region'
];

const requestedUrls = [];
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
const failedResponses = [];
let initial = null;
let options = null;
let monterey = null;
let montereyRightPanel = null;
let enhancedMode = null;
let gulf = null;
let gulfRightPanel = null;
let gulfButtons = null;

const server = await startStaticServer({ port: 9415 });
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
  await waitForEnvironmentDebug(page, (debug) => debug?.referenceManifestLoaded === true
    && debug?.referenceTileLibraryLoaded === true
    && debug?.curatedRegion?.selectedRegionId == null
    && debug?.bathymetryMode?.selectedMode === 'realReference');

  initial = await environmentDebug(page);
  options = await curatedRegionOptions(page);
  assert.deepEqual(options.labels, REQUIRED_REGION_LABELS, 'curated region dropdown exposes required labels');
  assert.equal(options.value, 'none', 'curated region dropdown defaults to None');
  assert.equal(initial.curatedRegion.selectedRegionSource, 'custom', 'initial selected region source is custom');
  assert.equal(initial.bathymetryMode.modeImplemented, true, 'Real Reference is implemented');

  await page.selectOption('[data-env-curated-region-select]', 'monterey_canyon');
  await waitForEnvironmentDebug(page, (debug) => debug?.curatedRegion?.selectedRegionId === 'monterey_canyon'
    && debug?.curatedRegion?.selectedRegionSource === 'curatedRegion'
    && debug?.curatedRegion?.boundsApplied === true
    && debug?.curatedRegion?.atlasViewportFocused === true
    && debug?.atlasStage?.selectedRegionScale?.operationalSelectionStatus === 'VALID'
    && debug?.atlasStage?.openBathymetryPreviewEnabled === true);
  monterey = await environmentDebug(page);
  montereyRightPanel = await rightPanelText(page);
  assert.equal(boundsClose(monterey.atlasStage.selectedBounds, {
    westLon: -123.0,
    eastLon: -121.5,
    southLat: 36.0,
    northLat: 37.2
  }), true, 'Monterey curated region applies expected bounds');
  assert.equal(monterey.curatedRegion.missionReadyAvailable, monterey.atlasStage.missionReadyTileAvailable === true, 'Monterey mission-ready flag follows staged tile availability');
  if (monterey.atlasStage.missionReadyTileAvailable === true) {
    assert.equal(monterey.curatedRegion.currentStatus, 'stagedMissionReady', 'Monterey reports staged mission ready when tile library supports it');
  }
  assert.match(montereyRightPanel, /Curated preset/i, 'right panel reports curated preset');
  assert.match(montereyRightPanel, /Monterey Canyon/i, 'right panel reports Monterey label');
  assert.match(montereyRightPanel, /Source/i, 'right panel reports source');
  assert.match(montereyRightPanel, /Bathymetry mode/i, 'right panel reports bathymetry mode');

  await page.selectOption('[data-env-bathymetry-mode-select]', 'referenceEnhancedSynthetic');
  await waitForEnvironmentDebug(page, (debug) => debug?.bathymetryMode?.selectedMode === 'referenceEnhancedSynthetic'
    && debug?.bathymetryMode?.modeImplemented === false
    && debug?.bathymetryMode?.missionAuthority === 'enhancedSyntheticRaster'
    && debug?.sourceMode === 'referenceBathymetryAtlas');
  enhancedMode = await environmentDebug(page);
  assert.match(enhancedMode.bathymetryMode.claimBoundary, /Synthetic benchmark bathymetry conditioned by public reference bathymetry/i, 'enhanced mode claim boundary is explicit');

  await page.selectOption('[data-env-curated-region-select]', 'gulf_shelf_canyon_segment');
  await waitForEnvironmentDebug(page, (debug) => debug?.curatedRegion?.selectedRegionId === 'gulf_shelf_canyon_segment'
    && debug?.atlasStage?.selectedRegionScale?.operationalSelectionStatus === 'VALID'
    && debug?.atlasStage?.openBathymetryPreviewEnabled === true
    && debug?.curatedRegion?.missionReadyAvailable === false);
  gulf = await environmentDebug(page);
  gulfRightPanel = await rightPanelText(page);
  gulfButtons = await atlasButtonState(page);
  assert.equal(boundsClose(gulf.atlasStage.selectedBounds, {
    westLon: -91.5,
    eastLon: -86.5,
    southLat: 26.5,
    northLat: 30.5
  }), true, 'Gulf curated region applies expected bounds');
  assert.notEqual(gulf.curatedRegion.currentStatus, 'stagedMissionReady', 'Gulf preset does not claim mission readiness');
  assert.equal(gulf.curatedRegion.requiresStaging, true, 'Gulf preset requires staging');
  assert.equal(gulfButtons.openPreviewDisabled, false, 'Open 3D Bathymetry Preview remains available for valid curated Gulf region');
  assert.equal(gulfButtons.exportRequestDisabled, false, 'Gulf preset exposes staging request action');
  assert.match(gulfButtons.exportRequestText, /Request/i, 'Gulf staging action is labeled as a request');
  assert.match(gulfRightPanel, /Gulf Shelf \/ Canyon Segment/i, 'right panel reports Gulf curated label');
  assert.match(gulfRightPanel, /Requires staging/i, 'right panel reports staging requirement');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

const noaaRuntimeFetchRequired = requestedUrls.some(isExternalNoaaOrGebcoRequest);
const rawExternalDataPathExposed = requestedUrls.some((url) => /external_data/i.test(url));
const localAbsolutePathExposed = requestedUrls.some((url) => /^file:/i.test(url) || /[A-Za-z]:\\/.test(url));

assert.equal(noaaRuntimeFetchRequired, false, 'browser does not request NOAA/GEBCO URLs');
assert.equal(rawExternalDataPathExposed, false, 'browser does not request raw external_data paths');
assert.equal(localAbsolutePathExposed, false, 'browser does not request local absolute paths');
assert.deepEqual(pageErrors, [], 'browser page errors');
assert.deepEqual(failedRequests, [], 'browser request failures');
assert.deepEqual(failedResponses, [], 'browser HTTP error responses');
assertNoPublicLeak({ initial, monterey, enhancedMode, gulf }, 'ENV-STUDIO-HANDOFF-R0 product handoff audit');

console.log('audit_environment_studio_product_handoff: ok', {
  curatedRegionCount: options?.labels?.length ?? 0,
  montereyStatus: monterey?.curatedRegion?.currentStatus,
  gulfStatus: gulf?.curatedRegion?.currentStatus,
  enhancedModeImplemented: enhancedMode?.bathymetryMode?.modeImplemented,
  noaaRuntimeFetchRequired,
  rawExternalDataPathExposed
});

async function openEnvironmentStudio(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.ANCHOR_APP_BOOT_DEBUG?.ready === true, null, { timeout: 30_000 });
  await page.waitForSelector('#main-menu-hub', { timeout: 30_000 });
  await page.click('#main-menu-hub [data-hub-view="simulation"]');
  await page.click('#main-menu-hub [data-action="environment-studio"]');
  await page.waitForSelector('#environment-studio-route', { timeout: 30_000 });
  await page.waitForSelector('[data-env-curated-region-select]', { timeout: 30_000 });
}

async function waitForEnvironmentDebug(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', `return (${predicateSource})(debug);`);
    return fn(globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? null);
  }, predicate.toString(), { timeout: 120_000 });
}

async function environmentDebug(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? null)));
}

async function curatedRegionOptions(page) {
  return page.$eval('[data-env-curated-region-select]', (select) => ({
    value: select.value,
    labels: Array.from(select.options).map((option) => option.textContent.trim())
  }));
}

async function rightPanelText(page) {
  return page.$eval('#env-studio-status-panel', (panel) => panel.textContent);
}

async function atlasButtonState(page) {
  return page.evaluate(() => {
    const boundary = document.querySelector('[data-env-stage-section="boundary-actions"]');
    const openPreview = boundary?.querySelector('[data-action="env-reference-open-coarse-preview"]');
    const exportRequest = boundary?.querySelector('[data-action="env-reference-export-patch-request"]');
    return {
      openPreviewDisabled: Boolean(openPreview?.disabled),
      openPreviewText: openPreview?.textContent?.trim() ?? '',
      exportRequestDisabled: Boolean(exportRequest?.disabled),
      exportRequestText: exportRequest?.textContent?.trim() ?? ''
    };
  });
}

function boundsClose(actual, expected) {
  if (!actual || !expected) return false;
  return Math.abs(Number(actual.westLon) - Number(expected.westLon)) < 0.001
    && Math.abs(Number(actual.eastLon) - Number(expected.eastLon)) < 0.001
    && Math.abs(Number(actual.southLat) - Number(expected.southLat)) < 0.001
    && Math.abs(Number(actual.northLat) - Number(expected.northLat)) < 0.001;
}

function isExternalNoaaOrGebcoRequest(url = '') {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host.includes('noaa') || host.includes('gebco');
  } catch {
    return /noaa|gebco/i.test(String(url));
  }
}

function assertNoPublicLeak(payload = {}, label = 'payload') {
  const text = JSON.stringify(payload);
  assert.doesNotMatch(text, /T_hiddenTruth|hidden truth array|oracleOnly/i, `${label} does not expose hidden truth`);
  assert.doesNotMatch(text, /external_data[\\/]/i, `${label} does not expose raw external_data paths`);
  assert.doesNotMatch(text, /NOAA\/GEBCO runtime fetch/i, `${label} does not claim runtime NOAA/GEBCO fetch`);
}
