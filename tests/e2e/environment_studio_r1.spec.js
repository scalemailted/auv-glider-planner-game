import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';
import { launchFromMainMenuHub } from './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9391';

export const EXACT_TITLES = [
  'Environment Studio Opens and Generates Valid Bathymetry',
  'Environment Studio Mosaic Import Export and Cleanup'
];

test.setTimeout(180000);
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9391 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test(EXACT_TITLES[0], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);

  await expect(page.locator('#environment-studio-route')).toBeVisible();
  await expect(page.locator('#mission-console')).toContainText('Environment Studio');
  await expect(page.locator('#mission-console')).toContainText('Domain / Resolution');
  await expect(page.locator('#mission-console')).toContainText('Bathymetry Generator');
  await page.locator('#env-studio-archetype').selectOption('submarineCanyon');
  await page.locator('#env-studio-seed').fill('env-studio-r1-e2e-tile');
  await page.locator('#mission-console [data-action="env-studio-generate-tile"]').click();

  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.tileCount ?? 0), { timeout: 15000 }).toBe(1);
  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  expect(debug.projectType).toBe('anchor.environment-studio-project');
  expect(debug.projectVersion).toBe('1.0.0');
  expect(debug.routeActive).toBe(true);
  expect(debug.validationStatus).not.toBe('FAIL');
  expect(debug.tileDigests).toHaveLength(1);
  expect(debug.hiddenTruthExposed).toBe(false);
  expect(debug.simulationChanged).toBe(false);
  expect(debug.scoringChanged).toBe(false);
  expect(debug.previewRendererCount).toBe(0);
  expect(debug.activeRafCount).toBe(0);
  await expect(page.locator('.environment-studio-tile-preview')).toHaveCount(1);
  await expect(page.locator('#env-studio-status-panel')).toContainText('Generated Field Status');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Bathymetry Tiles');

  const exported = await downloadStudioProject(page);
  expect(exported.filename).toBe('anchor_environment_studio_project.json');
  expect(exported.data.projectType).toBe('anchor.environment-studio-project');
  expect(exported.data.projectVersion).toBe('1.0.0');
  expect(exported.data.tiles).toHaveLength(1);
  expect(exported.data.tiles[0].diagnostics.finiteDepths).toBe(true);
  expect(exported.data.tiles[0].diagnostics.wetCellCount).toBeGreaterThan(0);
  expect(exported.data.provenance.hiddenTruthExposed).toBe(false);
  expect(exported.data.provenance.calibratedOceanProduct).toBe(false);
  expect(exported.data.provenance.operationalForecast).toBe(false);
  expect(exported.data.provenance.certifiedForNavigation).toBe(false);
  browserErrors.assertClean();
});

test(EXACT_TITLES[1], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);

  await page.locator('#env-studio-archetype').selectOption('mixedRegionalComposite');
  await page.locator('#env-studio-seed').fill('env-studio-r1-e2e-mosaic');
  await page.locator('#mission-console [data-action="env-studio-create-mosaic"]').click();

  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.tileCount ?? 0), { timeout: 15000 }).toBe(4);
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.mosaicDigest))).toBe(true);
  await expect(page.locator('.environment-studio-tile-preview')).toHaveCount(4);
  await expect(page.locator('#env-studio-status-panel')).toContainText('Tile Mosaic');

  const exported = await downloadStudioProject(page);
  expect(exported.data.tiles).toHaveLength(4);
  expect(exported.data.mosaic.seamReport.valid).toBe(true);
  const originalDigest = exported.data.projectDigest;
  await page.locator('#env-studio-import-file').setInputFiles(exported.path);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.projectDigest ?? null), { timeout: 15000 }).toBe(originalDigest);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.failureCount ?? 0)).toBe(0);

  await page.locator('#mission-console [data-action="menu"]').click();
  await waitForAnchorRoute(page, 'main-menu');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.routeActive === false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('[data-environment-studio-preview-host]')).toHaveCount(0);
  const cleanup = await page.evaluate(() => ({
    activeRafCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.activeRafCount,
    previewRendererCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.previewRendererCount,
    simulationChanged: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.simulationChanged,
    scoringChanged: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.scoringChanged
  }));
  expect(cleanup).toEqual({
    activeRafCount: 0,
    previewRendererCount: 0,
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

async function downloadStudioProject(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="env-studio-export-project"]').click()
  ]);
  const path = await download.path();
  const text = await fs.readFile(path, 'utf8');
  return {
    filename: download.suggestedFilename(),
    path,
    data: JSON.parse(text)
  };
}
