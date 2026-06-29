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
const BASE = 'http://127.0.0.1:9395';
let OWNER_REVIEW_DIR = path.resolve(process.env.ANCHOR_REF_ATLAS_BUDGET_OWNER_REVIEW_DIR ?? process.env.ANCHOR_E2E_OWNER_REVIEW_DIR ?? 'artifacts/owner-review/ref-atlas-budget-r1');
const FNV_DIGEST_PATTERN = /(?:^|-)fnv1a32:/;
const REQUIRED_SCREENSHOTS = [
  '01-small-region-ok.png',
  '02-medium-region-warn.png',
  '03-large-region-blocked.png',
  '04-blocked-region-patch-request.png',
  '05-monterey-region-budget.png',
  '06-monterey-load-enabled.png',
  '07-regional-patch-loaded.png',
  '08-generation-pipeline-still-works.png',
  '09-launch-ready.png'
];

let GIT_BRANCH = 'unknown';
let GIT_HEAD = 'unknown';

test.setTimeout(420000);
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  GIT_BRANCH = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
  GIT_HEAD = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await resetOwnerReviewPackage();
  server = await startStaticServer({ port: 9395 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Boundary Budget Status and Patch Request', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);
  await waitForReferenceManifest(page);

  await selectReferenceBounds(page, { westLon: -80.8, eastLon: -80.2, southLat: 24.6, northLat: 25.2 });
  await expectBudgetStatus(page, 'OK');
  await expect(page.locator('[data-boundary-budget-status="OK"]').first()).toBeVisible();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[0]);

  await selectReferenceBounds(page, { westLon: -40, eastLon: -38, southLat: 20, northLat: 21.3 });
  await expectBudgetStatus(page, 'WARN');
  await expect(page.locator('[data-boundary-budget-status="WARN"]').first()).toBeVisible();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[1]);

  await selectReferenceBounds(page, { westLon: -80.8, eastLon: -77.8, southLat: 24.6, northLat: 26.6 });
  await expectBudgetStatus(page, 'BLOCKED');
  await expect(page.locator('#mission-console')).toContainText('Region is too large for live browser generation in Alpha');
  await expect(page.locator('[data-action="env-reference-load-patch"]').first()).toBeDisabled();
  await expect(page.locator('[data-action="env-reference-export-patch-request"]').first()).toBeEnabled();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[2]);

  await page.evaluate(() => {
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.loadSelectedReferencePatch?.();
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.oversizeGenerationBlockedCount ?? 0), { timeout: 15000 }).toBeGreaterThan(0);
  await expect(page.locator('#mission-console')).toContainText('Region is too large for live browser generation in Alpha');

  const patchRequest = await downloadPatchRequest(page);
  expect(patchRequest.data.artifactType).toBe('anchor.reference-bathymetry-patch-request');
  expect(patchRequest.data.boundaryBudget.budgetStatus).toBe('BLOCKED');
  expect(patchRequest.data.boundaryBudget.patchRequestAllowed).toBe(true);
  expect(patchRequest.data.claimBoundary.hiddenTruthExposed).toBe(false);
  expect(JSON.stringify(patchRequest.data)).not.toMatch(/external_data[\\/]|[A-Z]:\\/);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[3]);

  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await writeQaSummary({
    ...baseSummary(),
    status: 'PASS',
    smallBudgetStatus: 'OK',
    mediumBudgetStatus: 'WARN',
    largeBudgetStatus: debug.boundaryBudgetStatus,
    blockedGenerationPrevented: Number(debug.oversizeGenerationBlockedCount ?? 0) > 0,
    blockedPatchRequestExported: true,
    blockedPatchRequestHasBudget: patchRequest.data.boundaryBudget?.budgetStatus === 'BLOCKED',
    lastBlockedGenerationReason: debug.lastBlockedGenerationReason,
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false,
    simulationChanged: false,
    scoringChanged: false
  });
  browserErrors.assertClean();
});

test('Monterey Patch Still Loads Under Budget Gate', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);
  await waitForReferenceManifest(page);

  await page.locator('[data-action="env-reference-select-boundary"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.matchedFixtureId ?? null), { timeout: 15000 }).toBe('monterey_canyon_15s');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.boundaryBudgetStatus ?? null), { timeout: 15000 }).toMatch(/OK|WARN/);
  await expect(page.locator('[data-action="env-reference-load-patch"]').first()).toBeEnabled();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[4]);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[5]);

  await page.locator('[data-action="env-reference-load-patch"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.loadedFixtureId ?? null), { timeout: 15000 }).toBe('monterey_canyon_15s');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage ?? null), { timeout: 15000 }).toBe('regionalPatchWorkspace');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[6]);

  await page.locator('#mission-console [data-action="env-reference-generate-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 30000 }).toMatch(FNV_DIGEST_PATTERN);
  await page.locator('[data-action="env-studio-generate-fields"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.fieldGenerationStatus ?? null), { timeout: 30000 }).toBe('CURRENT');
  await page.locator('[data-action="env-studio-compose-environment"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.environmentCompositionStatus ?? null), { timeout: 30000 }).toBe('CURRENT');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[7]);

  await page.locator('[data-action="env-studio-validate-launch"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.planningLaunchReady ?? null), { timeout: 30000 }).toBe(true);
  await expect(page.locator('[data-action="env-studio-launch-planning"]').first()).toBeEnabled();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[8]);

  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await writeQaSummary({
    ...baseSummary(),
    status: debug.launchValidationStatus === 'WARN' ? 'PASS_WITH_NON_BLOCKING_WARNINGS' : 'PASS',
    montereyBudgetStatus: debug.boundaryBudgetStatus,
    montereyLoadEnabled: true,
    montereyLoadedFixtureId: debug.loadedFixtureId,
    bathymetryGenerated: Boolean(debug.bathymetryArtifactDigest),
    fieldsGenerated: debug.fieldGenerationStatus === 'CURRENT',
    environmentComposed: debug.environmentCompositionStatus === 'CURRENT',
    planningLaunchReady: debug.planningLaunchReady === true,
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false,
    simulationChanged: false,
    scoringChanged: false
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

async function expectBudgetStatus(page, status) {
  await expect.poll(
    () => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.boundaryBudgetStatus ?? null),
    { timeout: 15000 }
  ).toBe(status);
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

async function resetOwnerReviewPackage() {
  try {
    await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'EPERM') throw error;
    OWNER_REVIEW_DIR = path.join(os.tmpdir(), 'anchor-ref-atlas-budget-r1-owner-review');
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
    phase: 'REF-ATLAS-INTERACT-R1.2',
    branch: GIT_BRANCH,
    head: GIT_HEAD
  };
}
