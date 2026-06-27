import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';
import { launchFromMainMenuHub } from './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9391';

export const EXACT_TITLES = [
  'Synthetic World Map Selection',
  'World Window Generates Bathymetry'
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
  await expect(page.locator('#mission-console')).toContainText('Synthetic World Map');
  await expect(page.locator('#env-studio-world-style')).toBeVisible();
  await expect(page.locator('#env-studio-world-seed')).toBeVisible();
  await expect(page.locator('[data-env-studio-world-map]')).toBeVisible();
  await expect(page.locator('#mission-console')).toContainText('Land / Ocean');
  await expect(page.locator('#mission-console')).toContainText('Bathymetry Context');
  await expect(page.locator('#mission-console')).toContainText('Flow Regime');
  await expect(page.locator('#mission-console')).toContainText('Scalar Regime');
  await expect(page.locator('#mission-console')).toContainText('Suitability');
  await expect(page.locator('#env-studio-status-panel')).toContainText('World Summary');
  await expect(page.locator('#mission-console')).not.toContainText('Intended Gliders');
  await expect(page.locator('#mission-console')).not.toContainText('Mission Duration');

  const initialDigest = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.worldDigest);
  await page.locator('#env-studio-world-style').selectOption('archipelagoWorld');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.worldStyle), { timeout: 15000 }).toBe('archipelagoWorld');
  const styleDigest = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.worldDigest);
  expect(styleDigest).toBeTruthy();
  expect(styleDigest).not.toBe(initialDigest);

  await page.locator('[data-action="env-studio-draw-boundary"]').click();
  await page.locator('[data-env-studio-world-map]').click({ position: { x: 570, y: 255 } });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedWindowDigest ?? null), { timeout: 15000 }).toMatch(/^fnv1a32:/);
  await expect(page.locator('#env-studio-status-panel')).toContainText('Selected Environment Window');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Flow-regime hints');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Scalar-regime hints');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Suggested use tags');

  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  expect(debug.studioStage).toBe('worldMap');
  expect(debug.worldArtifactType).toBe('anchor.synthetic-world-map');
  expect(debug.worldDigest).toMatch(/^fnv1a32:/);
  expect(debug.worldResolution.columns).toBeGreaterThan(0);
  expect(debug.selectedWindowDigest).toMatch(/^fnv1a32:/);
  expect(debug.selectedWindowBounds.width).toBeGreaterThan(0);
  expect(debug.detectedContext.primary).toBeTruthy();
  expect(debug.sampledFieldStats.fieldStatsDigest).toMatch(/^fnv1a32:/);
  expect(debug.flowGenerationInputs.generatedArtifacts.currentField4D).toBe(false);
  expect(debug.flowGenerationInputs.generatedArtifacts.scalarField4D).toBe(false);
  expect(debug.hiddenTruthExposed).toBe(false);
  expect(debug.simulationChanged).toBe(false);
  expect(debug.scoringChanged).toBe(false);
  browserErrors.assertClean();
});

test(EXACT_TITLES[1], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);

  await page.locator('[data-action="env-studio-select-boundary"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedWindowDigest ?? null), { timeout: 15000 }).toMatch(/^fnv1a32:/);
  await page.locator('#mission-console [data-action="env-studio-generate-world-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 20000 }).toBe('regionalBathymetry');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.tileCount ?? 0), { timeout: 20000 }).toBe(4);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 20000 }).not.toBeNull();

  await expect(page.locator('.environment-studio-terrain-preview')).toBeVisible();
  await expect(page.locator('.environment-studio-terrain-preview')).toContainText('Regional 3D Bathymetry Preview');
  await expect(page.locator('#mission-console')).toContainText('Regional Bathymetry');
  await expect(page.locator('#mission-console')).toContainText('Generate Fields - planned');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Feature Summary');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Generated Field Status');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Current Artifact');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Scalar Artifact');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Hotspots');
  await expect(page.locator('#env-studio-status-panel')).toContainText('REQUIRES_REGENERATION');

  const exported = await downloadStudioProject(page);
  expect(exported.data.studioStage).toBe('regionalBathymetry');
  expect(exported.data.worldMap.artifactType).toBe('anchor.synthetic-world-map');
  expect(exported.data.worldDigest).toMatch(/^fnv1a32:/);
  expect(exported.data.selectedOperationalWindow.artifactType).toBe('anchor.operational-window');
  expect(exported.data.selectedOperationalWindow.windowDigest).toMatch(/^fnv1a32:/);
  expect(exported.data.regionalMissionRecipe.recipeDigest).toMatch(/^fnv1a32:/);
  expect(exported.data.bathymetryBuilderResult.builderDigest).toMatch(/^fnv1a32:/);
  expect(exported.data.bathymetryArtifactDigest).toBe(exported.data.bathymetryBuilderResult.bathymetryArtifactDigest);
  expect(exported.data.flowGenerationInputs.generatedArtifacts.currentField4D).toBe(false);
  expect(exported.data.flowGenerationInputs.generatedArtifacts.scalarField4D).toBe(false);
  expect(exported.data.dependencyGraph.nodes.currentArtifact.state).toBe('REQUIRES_REGENERATION');
  expect(exported.data.dependencyGraph.nodes.scalarArtifact.state).toBe('REQUIRES_REGENERATION');
  expect(exported.data.dependencyGraph.nodes.hotspots.state).toBe('REQUIRES_REGENERATION');
  expect(exported.data.dependencyGraph.nodes.startsDropZones.state).toBe('NEEDS_VALIDATION');
  expect(exported.data.dependencyGraph.nodes.benchmarkBundle.state).toBe('REQUIRES_REGENERATION');
  expect(exported.data.provenance.hiddenTruthExposed).toBe(false);
  const originalDigest = exported.data.projectDigest;
  const originalWindowDigest = exported.data.selectedOperationalWindow.windowDigest;
  const originalBathymetryDigest = exported.data.bathymetryArtifactDigest;

  await page.locator('#env-studio-import-file').setInputFiles(exported.path);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.projectDigest ?? null), { timeout: 15000 }).toBe(originalDigest);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage ?? null), { timeout: 15000 }).toBe('regionalBathymetry');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedWindowDigest ?? null), { timeout: 15000 }).toBe(originalWindowDigest);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 15000 }).toBe(originalBathymetryDigest);

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
