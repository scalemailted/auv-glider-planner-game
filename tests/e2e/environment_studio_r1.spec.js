import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';
import { launchFromMainMenuHub } from './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9391';
const OWNER_REVIEW_DIR = path.resolve('test-results', 'bathy-data-r1-owner-review');
const REQUIRED_SCREENSHOTS = [
  '01-reference-bathy-overview-or-blocked.png',
  '02-reference-bathy-fixture-selector.png',
  '03-reference-patch-selected.png',
  '04-reference-patch-generated-3d-bathymetry.png',
  '05-blocked-instructions-if-no-data.png'
];

export const EXACT_TITLES = [
  'Reference Bathymetry Atlas Opens',
  'Reference Patch Generates Bathymetry'
];

test.setTimeout(180000);
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  await resetOwnerReviewPackage();
  server = await startStaticServer({ port: 9391 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test(EXACT_TITLES[0], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);
  await waitForReferenceManifest(page);

  await expect(page.locator('#environment-studio-route')).toBeVisible();
  await expect(page.locator('#mission-console')).toContainText('Reference Bathymetry Atlas');
  await expect(page.locator('#mission-console')).toContainText('Bathymetry Source');
  await expect(page.locator('#mission-console')).toContainText('Reference Dataset');
  await expect(page.locator('#mission-console')).toContainText('Fixture Selector');
  await expect(page.locator('#mission-console')).toContainText('Boundary Selection');
  await expect(page.locator('#mission-console')).toContainText('Actions');
  await expect(page.locator('#env-reference-source-mode')).toHaveValue('referenceBathymetryAtlas');
  await expect(page.locator('[data-env-studio-globe-host]')).toHaveCount(0);
  await expect(page.locator('[data-env-studio-world-map]')).toHaveCount(0);
  await expect(page.locator('#env-studio-status-panel')).toContainText('Reference Atlas Summary');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[0]);

  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  expect(debug.sourceMode).toBe('referenceBathymetryAtlas');
  expect(debug.studioStage).toBe('referenceAtlas');
  expect(debug.defaultSourceMode).toBe('referenceBathymetryAtlas');
  expect(debug.proceduralSandboxDefault).toBe(false);
  expect(debug.hiddenTruthExposed).toBe(false);
  expect(debug.simulationChanged).toBe(false);
  expect(debug.scoringChanged).toBe(false);

  if (debug.referenceFixtureStatus === 'NO_REFERENCE_DATA_FIXTURE') {
    await expect(page.locator('[data-env-reference-blocked-panel]')).toBeVisible();
    await expect(page.locator('[data-env-reference-blocked-instructions]').first()).toContainText('BLOCKED_WAITING_FOR_REFERENCE_BATHYMETRY_DOWNLOAD');
    await expect(page.locator('[data-env-reference-bathymetry-map]')).toHaveCount(0);
    await expect(page.locator('[data-action="env-reference-draw-boundary"]')).toBeDisabled();
    await expect(page.locator('[data-action="env-reference-select-boundary"]')).toBeDisabled();
    await expect(page.locator('[data-action="env-reference-generate-bathymetry"]')).toBeDisabled();
    await expect(page.locator('#env-studio-status-panel')).toContainText('NO_REFERENCE_DATA_FIXTURE');
    await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[1]);
    await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[4]);
  } else {
    await expect(page.locator('[data-env-reference-bathymetry-map]')).toBeVisible();
    await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[1]);
  }

  await writeQaSummary(ownerReviewSummaryFromDebug(debug));
  browserErrors.assertClean();
});

test(EXACT_TITLES[1], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);
  await waitForReferenceManifest(page);

  const initialDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  if (initialDebug.referenceFixtureStatus === 'NO_REFERENCE_DATA_FIXTURE') {
    await expect(page.locator('[data-env-reference-blocked-instructions]').first()).toContainText('npm.cmd run download:reference-bathy');
    await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[2]);
    await expect(page.locator('[data-action="env-reference-generate-bathymetry"]')).toBeDisabled();
    await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[3]);

    const exported = await downloadStudioProject(page);
    expect(exported.data.sourceMode).toBe('referenceBathymetryAtlas');
    expect(exported.data.referenceAtlas.sourceDataset.name).toBe('NO_REFERENCE_DATA_FIXTURE');
    expect(exported.data.referenceAtlas.provenance.fixtureStatus).toBe('NO_REFERENCE_DATA_FIXTURE');
    expect(exported.data.selectedReferenceWindow ?? null).toBeNull();
    expect(exported.data.bathymetryBuilderResult ?? null).toBeNull();
    expect(exported.data.bathymetryArtifactDigest ?? null).toBeNull();
    expect(exported.data.provenance.hiddenTruthExposed).toBe(false);
    expect(exported.data.provenance.operationalForecast).toBe(false);
    expect(exported.data.provenance.certifiedForNavigation).toBe(false);

    const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
    await writeQaSummary(ownerReviewSummaryFromDebug(debug));
    browserErrors.assertClean();
    return;
  }

  await page.locator('[data-action="env-reference-select-boundary"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedPatchDigest ?? null), { timeout: 15000 }).toMatch(/^fnv1a32:/);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[2]);
  await page.locator('#mission-console [data-action="env-reference-generate-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 20000 }).toBe('regionalBathymetry');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 20000 }).not.toBeNull();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[3]);

  const debugAfterGeneration = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await writeQaSummary(ownerReviewSummaryFromDebug(debugAfterGeneration));
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
    () => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.referenceFixtureStatus ?? null),
    { timeout: 15000 }
  ).toBeTruthy();
}

async function resetOwnerReviewPackage() {
  await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
  await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
}

async function captureOwnerScreenshot(page, filename) {
  await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(OWNER_REVIEW_DIR, filename),
    fullPage: true
  });
}

async function readQaSummary() {
  try {
    const text = await fs.readFile(path.join(OWNER_REVIEW_DIR, 'qa-summary.json'), 'utf8');
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function writeQaSummary(patch) {
  await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  const current = await readQaSummary();
  await fs.writeFile(
    path.join(OWNER_REVIEW_DIR, 'qa-summary.json'),
    JSON.stringify({ ...current, ...patch, screenshots: REQUIRED_SCREENSHOTS }, null, 2) + '\n'
  );
}

function ownerReviewSummaryFromDebug(debug = {}) {
  return {
    fixtureStatus: debug.referenceFixtureStatus ?? 'NO_REFERENCE_DATA_FIXTURE',
    overviewDigest: debug.overviewDigest ?? null,
    fixtureCount: debug.referenceFixtureCount ?? 0,
    selectedFixtureId: debug.selectedFixtureId ?? null,
    selectedPatchDigest: debug.selectedPatchDigest ?? null,
    bathymetryArtifactDigest: debug.bathymetryArtifactDigest ?? null,
    defaultSourceMode: debug.defaultSourceMode ?? 'referenceBathymetryAtlas',
    proceduralSandboxDefault: debug.proceduralSandboxDefault === true ? true : false,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  };
}

async function downloadStudioProject(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="env-studio-export-project"]').click()
  ]);
  const filePath = await download.path();
  const text = await fs.readFile(filePath, 'utf8');
  return {
    filename: download.suggestedFilename(),
    path: filePath,
    data: JSON.parse(text)
  };
}
