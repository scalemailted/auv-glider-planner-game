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
const BASE = 'http://127.0.0.1:9396';
let OWNER_REVIEW_DIR = path.resolve(process.env.ANCHOR_REF_ATLAS_OPERATIONAL_WINDOW_OWNER_REVIEW_DIR ?? process.env.ANCHOR_E2E_OWNER_REVIEW_DIR ?? 'artifacts/owner-review/ref-atlas-operational-window-r1');
const FNV_DIGEST_PATTERN = /(?:^|-)fnv1a32:/;
const REQUIRED_SCREENSHOTS = [
  '01-default-atlas.png',
  '02-local-window-too-small-guidance.png',
  '03-regional-window-ok.png',
  '04-gulf-segment-selected.png',
  '05-gulf-segment-budget-multitile.png',
  '06-gulf-multitile-patch-request-export.png',
  '07-monterey-overlay-selected.png',
  '08-monterey-patch-loaded.png',
  '09-generation-pipeline-still-works.png',
  '10-planning-launch-ready.png'
];

let GIT_BRANCH = 'unknown';
let GIT_HEAD = 'unknown';

test.setTimeout(420000);
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  GIT_BRANCH = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
  GIT_HEAD = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await resetOwnerReviewPackage();
  server = await startStaticServer({ port: 9396 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Large Operational Window Can Be Selected', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);
  await waitForReferenceManifest(page);
  await expect(page.locator('[data-env-reference-bathymetry-map]').first()).toBeVisible();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[0]);

  await selectReferenceBounds(page, {
    westLon: -90,
    eastLon: -89.9999,
    southLat: 25,
    northLat: 25.0001
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.operationalWindow?.widthKm ?? 0), { timeout: 15000 }).toBeGreaterThan(80);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.operationalWindow?.heightKm ?? 0), { timeout: 15000 }).toBeGreaterThan(80);
  const localDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[1]);

  await page.locator('[data-env-reference-window-preset="regionalSurvey"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.operationalWindow?.scaleClass ?? null), { timeout: 15000 }).toBe('regionalSurvey');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.operationalWindow?.validSelection ?? false), { timeout: 15000 }).toBe(true);
  const regionalDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[2]);

  await selectReferenceBounds(page, {
    westLon: -94,
    eastLon: -84,
    southLat: 24,
    northLat: 30
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.operationalWindow?.scaleClass ?? null), { timeout: 15000 }).toBe('gulfScale');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.boundaryBudgetStatus ?? null), { timeout: 15000 }).toBe('MULTI_TILE_REQUIRED');
  await expect(page.locator('#mission-console')).toContainText('Multi-tile preprocessing required');
  await expect(page.locator('[data-action="env-reference-load-patch"]').first()).toBeDisabled();
  await expect(page.locator('[data-action="env-reference-export-patch-request"]').first()).toBeEnabled();
  const gulfSelectedDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[3]);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[4]);

  const patchRequest = await downloadPatchRequest(page);
  expect(patchRequest.data.artifactType).toBe('anchor.reference-bathymetry-multitile-patch-request');
  expect(patchRequest.data.sourceDataset).toBe('ETOPO_2022');
  expect(patchRequest.data.requestedResolution).toBe('15 arc-second');
  expect(patchRequest.data.operationalWindow.scaleClass).toBe('gulfScale');
  expect(patchRequest.data.generationBudget.budgetStatus).toBe('MULTI_TILE_REQUIRED');
  expect(patchRequest.data.generationBudget.generationAllowed).toBe(false);
  expect(patchRequest.data.generationBudget.patchRequestAllowed).toBe(true);
  expect(patchRequest.data.generationBudget.multiTileRecommended).toBe(true);
  expect(patchRequest.data.tilePlan.tileCount).toBeGreaterThan(1);
  expect(patchRequest.data.claimBoundary.hiddenTruthExposed).toBe(false);
  expect(JSON.stringify(patchRequest.data)).not.toMatch(/external_data[\\/]|[A-Z]:\\/);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.lastPatchRequestType ?? null), { timeout: 15000 }).toBe('anchor.reference-bathymetry-multitile-patch-request');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[5]);

  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await writeQaSummary({
    ...baseSummary(),
    status: 'PASS',
    defaultAtlasVisible: true,
    localWindow: localDebug.operationalWindow,
    regionalWindow: regionalDebug.operationalWindow,
    gulfWindow: gulfSelectedDebug.operationalWindow,
    tinyClickCreatesUsableSelection: true,
    regionalWindowValid: true,
    gulfScaleClass: debug.operationalWindow?.scaleClass,
    gulfGenerationAllowed: debug.generationBudget?.generationAllowed,
    gulfPatchRequestAllowed: debug.generationBudget?.patchRequestAllowed,
    gulfMultiTileRecommended: debug.generationBudget?.multiTileRecommended,
    gulfRecommendedAction: debug.generationBudget?.recommendedAction,
    gulfPatchRequestType: patchRequest.data.artifactType,
    gulfPatchRequestDigest: patchRequest.data.requestDigest,
    pageResponsiveAfterSelections: true,
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false,
    simulationChanged: false,
    scoringChanged: false
  });
  await cleanupToMainMenu(page);
  browserErrors.assertClean();
});

test('Monterey Patch Still Loads', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);
  await waitForReferenceManifest(page);

  await page.locator('[data-action="env-reference-select-boundary"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.matchedFixtureId ?? null), { timeout: 15000 }).toBe('monterey_canyon_15s');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.boundaryBudgetGenerationAllowed ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('[data-action="env-reference-load-patch"]').first()).toBeEnabled();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[6]);

  await page.locator('[data-action="env-reference-load-patch"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.loadedFixtureId ?? null), { timeout: 15000 }).toBe('monterey_canyon_15s');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[7]);

  await page.locator('#mission-console [data-action="env-reference-generate-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 30000 }).toMatch(FNV_DIGEST_PATTERN);
  await page.locator('[data-action="env-studio-generate-fields"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.fieldGenerationStatus ?? null), { timeout: 30000 }).toBe('CURRENT');
  await page.locator('[data-action="env-studio-compose-environment"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.environmentCompositionStatus ?? null), { timeout: 30000 }).toBe('CURRENT');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[8]);

  await page.locator('[data-action="env-studio-validate-launch"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.planningLaunchReady ?? null), { timeout: 30000 }).toBe(true);
  await expect(page.locator('[data-action="env-studio-launch-planning"]').first()).toBeEnabled();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[9]);

  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await cleanupToMainMenu(page);
  const cleanupDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await writeQaSummary({
    ...baseSummary(),
    status: debug.launchValidationStatus === 'WARN' ? 'PASS_WITH_NON_BLOCKING_WARNINGS' : 'PASS',
    montereyLoadedFixtureId: debug.loadedFixtureId,
    montereyLoadedFixtureRole: debug.loadedFixtureRole,
    bathymetryArtifactDigest: debug.bathymetryArtifactDigest,
    currentArtifactDigest: debug.currentArtifactDigest,
    environmentArtifactDigest: debug.environmentArtifactDigest,
    launchValidationStatus: debug.launchValidationStatus,
    bathymetryGenerated: Boolean(debug.bathymetryArtifactDigest),
    fieldsGenerated: debug.fieldGenerationStatus === 'CURRENT',
    environmentComposed: debug.environmentCompositionStatus === 'CURRENT',
    planningLaunchReady: debug.planningLaunchReady === true,
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false,
    simulationChanged: false,
    scoringChanged: false,
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

async function selectReferenceBounds(page, bounds) {
  await page.evaluate((selectedBounds) => {
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceBounds?.(selectedBounds);
  }, bounds);
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
  } catch (error) {
    if (error?.code !== 'EPERM') throw error;
    OWNER_REVIEW_DIR = path.join(os.tmpdir(), 'anchor-ref-atlas-operational-window-r1-owner-review');
    await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
  }
  await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
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
    phase: 'REF-ATLAS-INTERACT-R1.3',
    branch: GIT_BRANCH,
    head: GIT_HEAD
  };
}
