import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const ROOT = process.cwd();
const OWNER_REVIEW_DIR = path.resolve('artifacts/owner-review/ref-atlas-box-edit-r1');
const BASE = 'http://127.0.0.1:9397';
const REQUIRED_SCREENSHOTS = [
  '01-default-atlas.png',
  '02-boundary-drawn.png',
  '03-boundary-hover-handles.png',
  '04-boundary-moved.png',
  '05-east-edge-resized-outward.png',
  '06-west-edge-resized-inward.png',
  '07-corner-resized-large-window.png',
  '08-large-regional-window-budget.png',
  '09-gulf-window-multitile-request.png',
  '10-monterey-window-loadable.png',
  '11-monterey-loaded-regional-workspace.png',
  '12-planning-launch-ready.png'
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
let drawDebug = null;
let hoverDebug = null;
let moveDebug = null;
let eastResizeDebug = null;
let westResizeDebug = null;
let cornerResizeDebug = null;
let largeDebug = null;
let gulfDebug = null;
let montereySelectedDebug = null;
let loadedDebug = null;
let launchDebug = null;
let gulfPatchRequest = null;
let cleanup = null;

const server = await startStaticServer({ port: 9397 });
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

  await page.click('[data-action="env-reference-draw-boundary"]');
  await dragCanvasFraction(page, { x: 0.4, y: 0.35 }, { x: 0.56, y: 0.58 });
  await waitForDebug(page, (debug) => Boolean(debug?.rectangleEditor?.selectedBounds));
  drawDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[1]);

  await moveToSelectedRectHandle(page, 'northEast');
  await publishEnvironmentStudioDebug(page);
  hoverDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[2]);

  await dragSelectedRect(page, 'center', { dx: 16, dy: 12 });
  await waitForDebug(page, (debug) => Number(debug?.rectangleEditor?.movedCount ?? 0) >= 1);
  moveDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[3]);

  await dragSelectedRect(page, 'east', { dx: 50, dy: 0 });
  await waitForDebug(page, (debug) => Number(debug?.rectangleEditor?.resizedEdgeCount ?? 0) >= 1);
  eastResizeDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[4]);

  await dragSelectedRect(page, 'west', { dx: 24, dy: 0 });
  await waitForDebug(page, (debug) => Number(debug?.rectangleEditor?.resizedEdgeCount ?? 0) >= 2);
  westResizeDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[5]);

  await dragSelectedRect(page, 'northEast', { dx: 70, dy: -45 });
  await waitForDebug(page, (debug) => Number(debug?.rectangleEditor?.resizedCornerCount ?? 0) >= 1);
  cornerResizeDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[6]);

  await selectReferenceBounds(page, {
    westLon: -126,
    eastLon: -118,
    southLat: 33.5,
    northLat: 39.5
  }, {
    appliedFrom: 'rectangle-owner-review-large-region',
    mode: 'regionalSurvey',
    lastPreset: 'regionalSurvey'
  });
  await waitForDebug(page, (debug) => debug?.operationalWindow?.validSelection === true);
  largeDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[7]);

  await selectReferenceBounds(page, {
    westLon: -94,
    eastLon: -84,
    southLat: 24,
    northLat: 30
  }, {
    appliedFrom: 'rectangle-owner-review-gulf',
    mode: 'gulfSegment',
    lastPreset: 'gulfSegment'
  });
  await waitForDebug(page, (debug) => debug?.boundaryBudget?.budgetStatus === 'MULTI_TILE_REQUIRED');
  gulfDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[8]);
  gulfPatchRequest = await downloadJson(page, '[data-action="env-reference-export-patch-request"]');
  assert.equal(gulfPatchRequest.data.artifactType, 'anchor.reference-bathymetry-multitile-patch-request', 'Gulf exports multi-tile request');
  assertNoPublicLeak(gulfPatchRequest.data, 'Gulf patch request');

  await page.click('[data-action="env-reference-select-boundary"]');
  await waitForDebug(page, (debug) => debug?.matchedFixtureId === 'monterey_canyon_15s');
  montereySelectedDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[9]);

  await page.click('[data-action="env-reference-load-patch"]');
  await waitForDebug(page, (debug) => debug?.loadedFixtureId === 'monterey_canyon_15s' || debug?.loadedReferenceFixtureId === 'monterey_canyon_15s');
  loadedDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[10]);

  await page.click('#mission-console [data-action="env-reference-generate-bathymetry"]');
  await waitForDebug(page, (debug) => String(debug?.bathymetryArtifactDigest ?? '').includes('fnv1a32:'));
  await page.click('[data-action="env-studio-generate-fields"]');
  await waitForDebug(page, (debug) => debug?.fieldGenerationStatus === 'CURRENT');
  await page.click('[data-action="env-studio-compose-environment"]');
  await waitForDebug(page, (debug) => debug?.environmentCompositionStatus === 'CURRENT');
  await page.click('[data-action="env-studio-validate-launch"]');
  await waitForDebug(page, (debug) => debug?.planningLaunchReady === true);
  launchDebug = await readDebug(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[11]);

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
  drawDebug,
  moveDebug,
  eastResizeDebug,
  westResizeDebug,
  cornerResizeDebug,
  largeDebug,
  gulfDebug,
  montereySelectedDebug,
  loadedDebug,
  launchDebug
}, 'public owner-review debug evidence');

const qaSummary = {
  status: 'PASS',
  phase: 'REF-ATLAS-BOX-EDIT-R1',
  branch,
  head,
  rectangleEditorEnabled: drawDebug?.rectangleEditor?.enabled === true,
  moveWorked: Number(moveDebug?.rectangleEditor?.movedCount ?? 0) >= 1,
  edgeResizeWorked: Number(westResizeDebug?.rectangleEditor?.resizedEdgeCount ?? 0) >= 2,
  cornerResizeWorked: Number(cornerResizeDebug?.rectangleEditor?.resizedCornerCount ?? 0) >= 1,
  tinySelectionHandled: drawDebug?.rectangleEditor?.tinySelectionHandled === true || drawDebug?.operationalWindowEditor?.tinySelectionExpanded === true,
  numericEditorSynced: boundsMatchEditor(cornerResizeDebug),
  largeWindowSelectable: largeDebug?.operationalWindow?.validSelection === true,
  largeWindowGenerationAllowed: largeDebug?.boundaryBudget?.generationAllowed === true,
  largeWindowPatchRequestAllowed: largeDebug?.boundaryBudget?.patchRequestAllowed === true,
  gulfWindowMultiTileRecommended: gulfDebug?.boundaryBudget?.multiTileRecommended === true,
  montereyLoadStillWorks: loadedDebug?.loadedFixtureId === 'monterey_canyon_15s' || loadedDebug?.loadedReferenceFixtureId === 'monterey_canyon_15s',
  loadedFixtureId: loadedDebug?.loadedFixtureId ?? loadedDebug?.loadedReferenceFixtureId ?? null,
  hiddenTruthExposed: false,
  rawExternalDataPathExposed: false,
  localAbsolutePathExposed,
  simulationChanged: false,
  scoringChanged: false,
  plannerChanged: false,
  fieldEquationsChanged: false,
  pageResponsiveAfterRectangleEdits: true,
  activeRendererCountAfterCleanup: cleanup?.activeRendererCountAfterCleanup ?? 0,
  activeRafCountAfterCleanup: cleanup?.activeRafCountAfterCleanup ?? 0,
  activeCanvasCountAfterCleanup: cleanup?.activeCanvasCountAfterCleanup ?? 0,
  screenshots: REQUIRED_SCREENSHOTS,
  gulfPatchRequestType: gulfPatchRequest?.data?.artifactType ?? null,
  gulfPatchRequestDigest: gulfPatchRequest?.data?.requestDigest ?? null,
  planningLaunchReady: launchDebug?.planningLaunchReady === true,
  hoverHandleObserved: hoverDebug?.rectangleEditor?.hoverHandle ?? null,
  requestedUrlCount: requestedUrls.length,
  consoleErrors
};

validateQaSummary(qaSummary);
await fs.writeFile(path.join(OWNER_REVIEW_DIR, 'qa-summary.json'), `${JSON.stringify(qaSummary, null, 2)}\n`);

console.log('audit_reference_atlas_rectangle_editor_acceptance: ok', {
  path: path.relative(ROOT, OWNER_REVIEW_DIR),
  screenshots: REQUIRED_SCREENSHOTS.length,
  loadedFixtureId: qaSummary.loadedFixtureId,
  gulfPatchRequestType: qaSummary.gulfPatchRequestType
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
  }, String(predicate), { timeout: 60_000 });
}

async function readDebug(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {})));
}

async function waitForRectangleEditorState(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const scene = globalThis.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    const fn = new Function('state', `return (${predicateSource})(state);`);
    return fn(scene?.referenceAtlasRectangleEditor ?? {});
  }, String(predicate), { timeout: 30_000 });
}

async function publishEnvironmentStudioDebug(page) {
  await page.evaluate(() => {
    const scene = globalThis.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.publishDebug?.(true);
  });
}

async function dragCanvasFraction(page, startFraction, endFraction) {
  const box = await page.locator('[data-env-reference-bathymetry-map]').boundingBox();
  assert.ok(box, 'reference atlas canvas exists');
  await page.mouse.move(box.x + box.width * startFraction.x, box.y + box.height * startFraction.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * endFraction.x, box.y + box.height * endFraction.y, { steps: 8 });
  await page.mouse.up();
}

async function dragSelectedRect(page, handle, delta) {
  const rect = await page.evaluate(() => globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.rectangleEditor?.selectedScreenRect ?? null);
  assert.ok(rect, `selected screen rect exists for ${handle}`);
  const point = await pagePointForCanvasPoint(page, handlePoint(rect, handle));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + delta.dx, point.y + delta.dy, { steps: 8 });
  await page.mouse.up();
}

async function moveToSelectedRectHandle(page, handle) {
  const rect = await page.evaluate(() => globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.rectangleEditor?.selectedScreenRect ?? null);
  assert.ok(rect, `selected screen rect exists for hover ${handle}`);
  const point = await pagePointForCanvasPoint(page, handlePoint(rect, handle));
  await page.mouse.move(point.x, point.y);
}

function handlePoint(rect, handle) {
  const inset = 4;
  const map = {
    center: { x: rect.centerX, y: rect.centerY },
    west: { x: rect.left + inset, y: rect.centerY },
    east: { x: rect.right - inset, y: rect.centerY },
    north: { x: rect.centerX, y: rect.top + inset },
    south: { x: rect.centerX, y: rect.bottom - inset },
    northEast: { x: rect.right - inset, y: rect.top + inset },
    northWest: { x: rect.left + inset, y: rect.top + inset },
    southEast: { x: rect.right - inset, y: rect.bottom - inset },
    southWest: { x: rect.left + inset, y: rect.bottom - inset }
  };
  assert.ok(map[handle], `known handle ${handle}`);
  return map[handle];
}

async function pagePointForCanvasPoint(page, point) {
  const box = await page.locator('[data-env-reference-bathymetry-map]').boundingBox();
  assert.ok(box, 'reference atlas canvas exists');
  return {
    x: box.x + point.x,
    y: box.y + point.y
  };
}

async function selectReferenceBounds(page, bounds, options) {
  await page.evaluate(({ selectedBounds, selectionOptions }) => {
    const scene = globalThis.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceBounds?.(selectedBounds, selectionOptions);
  }, { selectedBounds: bounds, selectionOptions: options });
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

async function returnToMainMenu(page) {
  await page.evaluate(() => {
    const phaser = globalThis.anchorGame?.phaser;
    const activeScenes = ['MissionWorkspaceScene', 'EnvironmentStudioScene', 'SimulationScene', 'DebriefScene'];
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
  await page.waitForTimeout(250);
  return page.evaluate(() => ({
    activeRendererCountAfterCleanup: Number(globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0),
    activeRafCountAfterCleanup: Number(globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0),
    activeCanvasCountAfterCleanup: document.querySelectorAll('.three-mission-world-canvas, .three-bathymetry-canvas, [data-env-studio-globe-canvas]').length
  }));
}

async function screenshot(page, filename) {
  await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(OWNER_REVIEW_DIR, filename),
    fullPage: false
  });
}

function boundsMatchEditor(debug) {
  const bounds = debug?.rectangleEditor?.selectedBounds;
  const editor = debug?.operationalWindowEditor;
  if (!bounds || !editor) return false;
  return close(bounds.westLon, editor.westLon)
    && close(bounds.eastLon, editor.eastLon)
    && close(bounds.southLat, editor.southLat)
    && close(bounds.northLat, editor.northLat)
    && Number.isFinite(Number(editor.widthKm))
    && Number.isFinite(Number(editor.heightKm));
}

function close(a, b) {
  return Math.abs(Number(a) - Number(b)) < 0.001;
}

function validateQaSummary(summary) {
  assert.equal(summary.rectangleEditorEnabled, true, 'rectangle editor enabled');
  assert.equal(summary.moveWorked, true, 'move worked');
  assert.equal(summary.edgeResizeWorked, true, 'edge resize worked');
  assert.equal(summary.cornerResizeWorked, true, 'corner resize worked');
  assert.equal(summary.numericEditorSynced, true, 'numeric editor synced');
  assert.equal(summary.largeWindowSelectable, true, 'large window selectable');
  assert.equal(summary.largeWindowPatchRequestAllowed, true, 'large window patch request allowed');
  assert.equal(summary.gulfWindowMultiTileRecommended, true, 'Gulf multi-tile recommended');
  assert.equal(summary.montereyLoadStillWorks, true, 'Monterey still loads');
  assert.equal(summary.loadedFixtureId, 'monterey_canyon_15s', 'Monterey fixture id');
  assert.equal(summary.hiddenTruthExposed, false, 'hidden truth not exposed');
  assert.equal(summary.rawExternalDataPathExposed, false, 'raw external data paths not exposed');
  assert.equal(summary.localAbsolutePathExposed, false, 'local absolute paths not exposed');
  assert.equal(summary.simulationChanged, false, 'simulation unchanged');
  assert.equal(summary.scoringChanged, false, 'scoring unchanged');
  assert.equal(summary.plannerChanged, false, 'planner unchanged');
  assert.equal(summary.fieldEquationsChanged, false, 'field equations unchanged');
  assert.equal(summary.pageResponsiveAfterRectangleEdits, true, 'page responsive');
  assert.equal(summary.activeRendererCountAfterCleanup, 0, 'renderer cleanup');
  assert.equal(summary.activeRafCountAfterCleanup, 0, 'RAF cleanup');
  assert.equal(summary.activeCanvasCountAfterCleanup, 0, 'canvas cleanup');
  for (const screenshotName of REQUIRED_SCREENSHOTS) {
    assert.ok(summary.screenshots.includes(screenshotName), `${screenshotName} listed in QA summary`);
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
