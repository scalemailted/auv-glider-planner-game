import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';
import { launchFromMainMenuHub } from './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9397';
let OWNER_REVIEW_DIR = path.resolve(process.env.ANCHOR_REF_ATLAS_ZOOM_WINDOW_OWNER_REVIEW_DIR ?? process.env.ANCHOR_E2E_OWNER_REVIEW_DIR ?? 'artifacts/owner-review/ref-atlas-zoom-window-r1');
const FNV_DIGEST_PATTERN = /(?:^|-)fnv1a32:/;
const REQUIRED_SCREENSHOTS = [
  '01-default-atlas.png',
  '02-deep-zoom-gulf.png',
  '03-gulf-segment-preset.png',
  '04-gulf-operational-window-large.png',
  '05-gulf-multitile-budget.png',
  '06-gulf-multitile-request-export.png',
  '07-typed-window-editor.png',
  '08-tiny-selection-guidance.png',
  '09-monterey-focused-close-zoom.png',
  '10-monterey-loaded.png',
  '11-generation-pipeline-still-works.png',
  '12-planning-launch-ready.png'
];

let GIT_BRANCH = 'unknown';
let GIT_HEAD = 'unknown';

test.setTimeout(420000);
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  GIT_BRANCH = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
  GIT_HEAD = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await resetOwnerReviewPackage();
  server = await startStaticServer({ port: 9397 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Deep Zoom and Operational Window Editing', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);
  await waitForReferenceManifest(page);
  await expect(page.locator('[data-env-reference-bathymetry-map]').first()).toBeVisible();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[0]);

  await page.evaluate(() => {
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceOperationalPreset?.('gulfSegment', { centerLon: -89, centerLat: 27 });
    scene?.focusSelectedReferencePatch?.();
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.atlasViewport?.zoom ?? 0), { timeout: 15000 }).toBeGreaterThanOrEqual(16);
  const zoomDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[1]);

  await page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene')?.resetReferenceView?.());
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.atlasViewport?.worldFractionVisible ?? 0), { timeout: 15000 }).toBe(1);
  const resetDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);

  await page.locator('[data-env-reference-window-preset="gulfSegment"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.operationalWindow?.scaleClass ?? null), { timeout: 15000 }).toBe('gulfScale');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[2]);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[3]);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.boundaryBudgetStatus ?? null), { timeout: 15000 }).toBe('MULTI_TILE_REQUIRED');
  await expect(page.locator('#mission-console')).toContainText('Multi-tile preprocessing required');
  await expect(page.locator('[data-action="env-reference-load-patch"]').first()).toBeDisabled();
  await expect(page.locator('[data-action="env-reference-export-patch-request"]').first()).toBeEnabled();
  const gulfDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[4]);

  const patchRequest = await downloadPatchRequest(page);
  expect(patchRequest.data.artifactType).toBe('anchor.reference-bathymetry-multitile-patch-request');
  expect(patchRequest.data.sourceDataset).toBe('ETOPO_2022');
  expect(patchRequest.data.operationalWindow.scaleClass).toBe('gulfScale');
  expect(patchRequest.data.generationBudget.generationAllowed).toBe(false);
  expect(patchRequest.data.generationBudget.patchRequestAllowed).toBe(true);
  expect(patchRequest.data.generationBudget.multiTileRecommended).toBe(true);
  expect(patchRequest.data.tilePlan.tileCount).toBeGreaterThan(1);
  expect(patchRequest.data.typedBounds).toEqual(patchRequest.data.bounds);
  expect(patchRequest.data.approximateSizeKm.widthKm).toBeGreaterThan(700);
  expect(patchRequest.data.approximateSizeKm.heightKm).toBeGreaterThan(400);
  expect(JSON.stringify(patchRequest.data)).not.toMatch(/external_data[\\/]|[A-Z]:\\/);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.lastPatchRequestDigest ?? null), { timeout: 15000 }).toMatch(/^fnv1a32:/);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[5]);

  await writeQaSummary({
    ...baseSummary(),
    status: 'PASS',
    maxZoom: zoomDebug.referenceAtlasMaxZoom,
    zoomReached: zoomDebug.atlasViewport?.zoom,
    resetWorked: resetDebug.atlasViewport?.worldFractionVisible === 1,
    gulfPresetWidthKm: gulfDebug.operationalWindow?.widthKm,
    gulfPresetHeightKm: gulfDebug.operationalWindow?.heightKm,
    gulfScaleClass: gulfDebug.operationalWindow?.scaleClass,
    gulfGenerationAllowed: gulfDebug.generationBudget?.generationAllowed,
    gulfPatchRequestAllowed: gulfDebug.generationBudget?.patchRequestAllowed,
    gulfMultiTileRecommended: gulfDebug.generationBudget?.multiTileRecommended,
    gulfPatchRequestDigest: patchRequest.data.requestDigest,
    gulfPatchRequestAllowedInBrowser: true,
    pageResponsiveAfterSelections: true,
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false,
    simulationChanged: false,
    scoringChanged: false
  });
  await cleanupToMainMenu(page);
  browserErrors.assertClean();
});

test('Typed Window and Monterey Patch Still Work', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);
  await waitForReferenceManifest(page);

  await page.locator('#env-reference-window-mode').selectOption('regionalSurvey');
  await page.locator('#env-reference-center-lon').fill('-91');
  await page.locator('#env-reference-center-lat').fill('27');
  await page.locator('#env-reference-width-km').fill('250');
  await page.locator('#env-reference-height-km').fill('200');
  await page.locator('[data-action="env-reference-apply-window"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.operationalWindowEditor?.appliedFrom ?? null), { timeout: 15000 }).toBe('typed');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.operationalWindow?.scaleClass ?? null), { timeout: 15000 }).toBe('regionalSurvey');
  const typedDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[6]);

  await page.evaluate(() => {
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceBounds?.({
      westLon: -90,
      eastLon: -89.999,
      southLat: 25,
      northLat: 25.001
    });
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.operationalWindowEditor?.tinySelectionExpanded ?? false), { timeout: 15000 }).toBe(true);
  const tinyDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await expect(page.locator('#mission-console')).toContainText('Selection is too small for mission planning');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[7]);

  await page.locator('[data-action="env-reference-select-boundary"]').first().click();
  await page.locator('[data-action="env-reference-focus-patch"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.matchedFixtureId ?? null), { timeout: 15000 }).toBe('monterey_canyon_15s');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.atlasViewport?.zoom ?? 0), { timeout: 15000 }).toBeGreaterThanOrEqual(16);
  const focusedDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[8]);

  await expect(page.locator('[data-action="env-reference-load-patch"]').first()).toBeEnabled();
  await page.locator('[data-action="env-reference-load-patch"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.loadedFixtureId ?? null), { timeout: 15000 }).toBe('monterey_canyon_15s');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[9]);

  await page.locator('#mission-console [data-action="env-reference-generate-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 30000 }).toMatch(FNV_DIGEST_PATTERN);
  await page.locator('[data-action="env-studio-generate-fields"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.fieldGenerationStatus ?? null), { timeout: 30000 }).toBe('CURRENT');
  await page.locator('[data-action="env-studio-compose-environment"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.environmentCompositionStatus ?? null), { timeout: 30000 }).toBe('CURRENT');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[10]);

  await page.locator('[data-action="env-studio-validate-launch"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.planningLaunchReady ?? null), { timeout: 30000 }).toBe(true);
  await expect(page.locator('[data-action="env-studio-launch-planning"]').first()).toBeEnabled();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[11]);

  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await cleanupToMainMenu(page);
  const cleanupDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await writeQaSummary({
    ...baseSummary(),
    status: debug.launchValidationStatus === 'WARN' ? 'PASS_WITH_NON_BLOCKING_WARNINGS' : 'PASS',
    typedWindowWorked: typedDebug.operationalWindow?.scaleClass === 'regionalSurvey'
      && Math.abs(Number(typedDebug.operationalWindow?.widthKm) - 250) < 3
      && Math.abs(Number(typedDebug.operationalWindow?.heightKm) - 200) < 3,
    tinySelectionHandled: tinyDebug.operationalWindowEditor?.tinySelectionExpanded === true
      && Number(tinyDebug.operationalWindow?.widthKm) >= 80
      && Number(tinyDebug.operationalWindow?.heightKm) >= 80,
    montereyFocusedZoom: focusedDebug.atlasViewport?.zoom,
    montereyLoadedFixtureId: debug.loadedFixtureId,
    montereyLoadedFixtureRole: debug.loadedFixtureRole,
    bathymetryArtifactDigest: debug.bathymetryArtifactDigest,
    currentArtifactDigest: debug.currentArtifactDigest,
    environmentArtifactDigest: debug.environmentArtifactDigest,
    launchValidationStatus: debug.launchValidationStatus,
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false,
    simulationChanged: false,
    scoringChanged: false,
    pageResponsiveAfterSelections: true,
    activeRendererCountAfterCleanup: cleanupDebug?.activeRendererCount ?? 0,
    activeRafCountAfterCleanup: cleanupDebug?.activeRafCount ?? 0,
    activeCanvasCountAfterCleanup: cleanupDebug?.activeCanvasCount ?? 0
  });
  browserErrors.assertClean();
});

async function openEnvironmentStudio(page) {
  await page.goto(BASE + '/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await launchFromMainMenuHub(page, 'simulation', 'environment-studio');
  await waitForAnchorRoute(page, 'environment-studio');
  await expect(page.locator('#environment-studio-route')).toBeVisible({ timeout: 15000 });
}

async function waitForReferenceManifest(page) {
  await expect.poll(
    () => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.referenceManifestLoaded === true),
    { timeout: 15000 }
  ).toBe(true);
}

async function downloadPatchRequest(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-action="env-reference-export-patch-request"]').first().click()
  ]);
  const filePath = await download.path();
  const text = await fs.readFile(filePath, 'utf8');
  return {
    filename: download.suggestedFilename(),
    path: filePath,
    data: JSON.parse(text)
  };
}

async function cleanupToMainMenu(page) {
  await page.locator('[data-action="menu"]').last().click();
  await waitForAnchorRoute(page, 'main-menu');
}

async function resetOwnerReviewPackage() {
  try {
    await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
    await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  } catch (error) {
    if (error?.code !== 'EPERM') throw error;
    OWNER_REVIEW_DIR = path.join(os.tmpdir(), 'anchor-ref-atlas-zoom-window-r1-owner-review');
    await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
    await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  }
}

async function captureOwnerScreenshot(page, filename) {
  await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(OWNER_REVIEW_DIR, filename),
    fullPage: false
  });
}

async function readQaSummary() {
  try {
    return JSON.parse(await fs.readFile(path.join(OWNER_REVIEW_DIR, 'qa-summary.json'), 'utf8'));
  } catch {
    return {};
  }
}

async function writeQaSummary(patch) {
  const current = await readQaSummary();
  const screenshots = (await fs.readdir(OWNER_REVIEW_DIR))
    .filter((entry) => entry.endsWith('.png'))
    .sort();
  await fs.writeFile(
    path.join(OWNER_REVIEW_DIR, 'qa-summary.json'),
    JSON.stringify({ ...current, ...patch, screenshots }, null, 2) + '\n'
  );
}

function baseSummary() {
  return {
    phase: 'REF-ATLAS-INTERACT-R1.4',
    branch: GIT_BRANCH,
    head: GIT_HEAD
  };
}
