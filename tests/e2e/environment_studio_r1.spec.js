import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';
import { launchFromMainMenuHub } from './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9391';

export const EXACT_TITLES = [
  'Synthetic Atlas Window Selection',
  'Atlas Window Generates Regional Detail'
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
  await expect(page.locator('#mission-console')).toContainText('Synthetic Ocean Atlas');
  await expect(page.locator('#mission-console')).toContainText('Mission Region');
  await expect(page.locator('[data-env-studio-atlas-map]')).toBeVisible();
  await expect(page.locator('#env-studio-status-panel')).toContainText('Selected Operational Window');

  await page.locator('#env-studio-window-preset').selectOption('semiEnclosedGulfSurvey');
  await expect(page.locator('#env-studio-status-panel')).toContainText('gulf / basin');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Recommended Gliders');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Current Regime Hints');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Scalar Regime Hints');
  await expect(page.locator('#mission-console [data-action="env-studio-generate-atlas-region"]')).toBeVisible();

  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  expect(debug.atlasMode).toBe(true);
  expect(debug.studioStage).toBe('atlasWindow');
  expect(debug.atlasPreset).toBeTruthy();
  expect(debug.selectedWindow.primaryContext).toBe('gulfBasin');
  expect(debug.currentRegime.length).toBeGreaterThan(0);
  expect(debug.scalarRegime.length).toBeGreaterThan(0);
  expect(debug.hiddenTruthExposed).toBe(false);
  expect(debug.simulationChanged).toBe(false);
  expect(debug.scoringChanged).toBe(false);
  browserErrors.assertClean();
});

test(EXACT_TITLES[1], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);

  await page.locator('#env-studio-window-preset').selectOption('semiEnclosedGulfSurvey');
  await page.locator('#mission-console [data-action="env-studio-generate-atlas-region"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 15000 }).toBe('regionalDetail');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.tileCount ?? 0), { timeout: 15000 }).toBe(4);

  await expect(page.locator('.environment-studio-terrain-preview')).toBeVisible();
  await expect(page.locator('.environment-studio-terrain-preview')).toContainText('Regional 3D Bathymetry Preview');
  await expect(page.locator('#mission-console')).toContainText('Basic Authoring');
  await expect(page.locator('[data-env-studio-section="advanced"]').first()).toHaveAttribute('data-collapsed', 'true');
  await expect(page.locator('[data-env-studio-source-diagnostics]').first()).toHaveAttribute('data-collapsed', 'true');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Generated Field Status');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Current Artifact');

  const exported = await downloadStudioProject(page);
  expect(exported.data.studioStage).toBe('regionalDetail');
  expect(exported.data.atlas.atlasType).toBe('anchor.synthetic-ocean-atlas');
  expect(exported.data.selectedOperationalWindow.windowId).toBe('semiEnclosedGulfSurvey');
  expect(exported.data.regionalMissionRecipe.recipeDigest).toMatch(/^fnv1a32:/);
  expect(exported.data.provenance.hiddenTruthExposed).toBe(false);
  const originalDigest = exported.data.projectDigest;

  await page.locator('#env-studio-import-file').setInputFiles(exported.path);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.projectDigest ?? null), { timeout: 15000 }).toBe(originalDigest);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage ?? null), { timeout: 15000 }).toBe('regionalDetail');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedWindow?.windowId ?? null), { timeout: 15000 }).toBe('semiEnclosedGulfSurvey');

  await page.locator('#mission-console [data-action="menu"]').click();
  await waitForAnchorRoute(page, 'main-menu');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.routeActive === false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('[data-environment-studio-preview-host]')).toHaveCount(0);
  const cleanup = await page.evaluate(() => ({
    activeRafCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.activeRafCount,
    previewRendererCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.previewRendererCount,
    terrainPreviewRafCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.terrainPreviewRafCount,
    terrainPreviewRendererCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.terrainPreviewRendererCount,
    stalePreviewObjects: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.stalePreviewObjects,
    hiddenTruthExposed: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.hiddenTruthExposed
  }));
  expect(cleanup).toEqual({
    activeRafCount: 0,
    previewRendererCount: 0,
    terrainPreviewRafCount: 0,
    terrainPreviewRendererCount: 0,
    stalePreviewObjects: 0,
    hiddenTruthExposed: false
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
