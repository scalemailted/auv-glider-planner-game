import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';
import { launchFromMainMenuHub } from './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9391';
const OWNER_REVIEW_DIR = path.resolve('test-results', 'env-world-r1a-owner-review');
const REQUIRED_SCREENSHOTS = [
  '01-world-default.png',
  '02-world-pan.png',
  '03-world-zoomed-out.png',
  '04-world-layer-bathymetry.png',
  '05-world-layer-flow.png',
  '06-boundary-selected.png',
  '07-regional-bathymetry-generated.png'
];
const FORBIDDEN_STAGE_ONE_PATTERNS = [
  /glider count/i,
  /mission duration/i,
  /mission scale/i,
  /route\/waypoint/i,
  /\bwaypoint\b/i,
  /\bdive\b/i,
  /current-regime hints/i,
  /scalar-regime hints/i,
  /tile role/i,
  /source tile/i,
  /dependency state/i,
  /atlas preset/i,
  /window examples/i
];

export const EXACT_TITLES = [
  'Synthetic World Map Viewport',
  'Boundary Window Generates Bathymetry'
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

  await expect(page.locator('#environment-studio-route')).toBeVisible();
  await expect(page.locator('#mission-console')).toContainText('Synthetic World Map');
  await expect(page.locator('#env-studio-world-style')).toBeVisible();
  await expect(page.locator('#env-studio-world-seed')).toBeVisible();
  await expect(page.locator('[data-env-studio-advanced-world-controls]')).toBeVisible();
  await expect(page.locator('[data-env-studio-advanced-world-controls]')).not.toHaveAttribute('open', '');
  await expect(page.locator('#env-world-island-density')).toHaveCount(1);
  await expect(page.locator('[data-env-studio-world-map]')).toBeVisible();
  await expect(page.locator('#mission-console')).toContainText('Land / Ocean');
  await expect(page.locator('#mission-console')).toContainText('Bathymetry Context');
  await expect(page.locator('#mission-console')).toContainText('Flow Regime');
  await expect(page.locator('#mission-console')).toContainText('Scalar Regime');
  await expect(page.locator('#mission-console')).toContainText('Suitability');
  await expect(page.locator('#env-studio-status-panel')).toContainText('World Summary');
  await expect(page.locator('#mission-console')).not.toContainText('Intended Gliders');
  await expect(page.locator('#mission-console')).not.toContainText('Mission Duration');
  await expect(page.locator('#mission-console')).not.toContainText('Mission Scale');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[0]);

  const initialDigest = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.worldDigest);
  await configureOwnerReviewWorld(page);
  const styleDigest = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.worldDigest);
  expect(styleDigest).toBeTruthy();
  expect(styleDigest).not.toBe(initialDigest);

  const beforePan = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.viewport);
  await page.locator('[data-env-studio-world-map]').dragTo(page.locator('[data-env-studio-world-map]'), {
    sourcePosition: { x: 420, y: 260 },
    targetPosition: { x: 520, y: 310 }
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.viewport?.panX), { timeout: 15000 }).not.toBe(beforePan.panX);
  const afterPan = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.viewport);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[1]);
  const zoomStart = afterPan.zoom;
  await page.locator('[data-env-world-view-action="zoom-out"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.viewport?.zoom), { timeout: 15000 }).toBeLessThan(zoomStart);
  const zoomEnd = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.viewport?.zoom);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[2]);
  await page.locator('[data-env-studio-world-layer="bathymetryContext"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.worldLayer), { timeout: 15000 }).toBe('bathymetryContext');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[3]);
  await page.locator('[data-env-studio-world-layer="coarseFlowRegime"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.worldLayer), { timeout: 15000 }).toBe('coarseFlowRegime');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[4]);

  await page.locator('[data-action="env-studio-draw-boundary"]').click();
  await page.locator('[data-env-studio-world-map]').dragTo(page.locator('[data-env-studio-world-map]'), {
    sourcePosition: { x: 470, y: 235 },
    targetPosition: { x: 650, y: 375 }
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedWindowDigest ?? null), { timeout: 15000 }).toMatch(/^fnv1a32:/);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[5]);
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
  await writeQaSummary({
    ...ownerReviewSummaryFromDebug(debug),
    panDelta: roundMetric(Math.hypot((afterPan.panX ?? 0) - (beforePan.panX ?? 0), (afterPan.panY ?? 0) - (beforePan.panY ?? 0))),
    zoomStart,
    zoomEnd,
    primaryLeftPanelForbiddenControlCount: await countForbiddenStageOneControls(page),
    symbolicAtlasShapeCount: await countSymbolicAtlasShapes(page),
    visibleCellGridDefault: await hasVisibleCellGrid(page),
    screenshots: REQUIRED_SCREENSHOTS
  });
  browserErrors.assertClean();
});

test(EXACT_TITLES[1], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);
  await configureOwnerReviewWorld(page);

  await page.locator('[data-action="env-studio-select-boundary"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedWindowDigest ?? null), { timeout: 15000 }).toMatch(/^fnv1a32:/);
  await page.locator('#mission-console [data-action="env-studio-generate-world-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 20000 }).toBe('regionalBathymetry');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.tileCount ?? 0), { timeout: 20000 }).toBe(4);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 20000 }).not.toBeNull();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[6]);

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
  const debugAfterGeneration = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await writeQaSummary({
    ...ownerReviewSummaryFromDebug(debugAfterGeneration),
    sourceGridShape: debugAfterGeneration.visualAcceptance?.sourceGridShape ?? debugAfterGeneration.sourceGridShape,
    bathymetryArtifactDigest: debugAfterGeneration.bathymetryArtifactDigest,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  });
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

async function configureOwnerReviewWorld(page) {
  await page.locator('#env-studio-world-style').selectOption('archipelagoWorld');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.worldStyle), { timeout: 15000 }).toBe('archipelagoWorld');
  await page.locator('#env-world-island-density').evaluate((input) => {
    input.value = '0.77';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.worldGeneratorParameters?.islandDensity), { timeout: 15000 }).toBe(0.77);
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
    JSON.stringify({ ...current, ...patch }, null, 2) + '\n'
  );
}

function ownerReviewSummaryFromDebug(debug = {}) {
  const visual = debug.visualAcceptance ?? {};
  return {
    worldDigest: debug.worldDigest ?? visual.worldDigest ?? null,
    worldStyle: debug.worldStyle ?? visual.worldStyle ?? null,
    worldSeed: debug.worldSeed ?? visual.worldSeed ?? null,
    worldGeneratorParameters: debug.worldGeneratorParameters ?? null,
    viewportWorldFraction: visual.viewportWorldFraction ?? null,
    visibleLandmassCount: visual.visibleLandmassCount ?? 0,
    visibleIslandCount: visual.visibleIslandCount ?? 0,
    visibleCoastlineComplexity: visual.visibleCoastlineComplexity ?? 0,
    visibleOpenOceanFraction: visual.visibleOpenOceanFraction ?? 0,
    selectedWindowAreaFractionOfWorld: visual.selectedWindowAreaFractionOfWorld ?? 0,
    selectedWindowDigest: debug.selectedWindowDigest ?? visual.selectedWindowDigest ?? null,
    sourceGridShape: visual.sourceGridShape ?? debug.sourceGridShape ?? null,
    bathymetryArtifactDigest: visual.bathymetryArtifactDigest ?? debug.bathymetryArtifactDigest ?? null,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  };
}

async function countForbiddenStageOneControls(page) {
  const text = await page.locator('#mission-console').innerText();
  return FORBIDDEN_STAGE_ONE_PATTERNS.filter((pattern) => pattern.test(text)).length;
}

async function countSymbolicAtlasShapes(page) {
  return page.locator('[data-env-studio-atlas-map], [data-env-atlas-region], [data-env-atlas-shape], .synthetic-ocean-atlas-shape').count();
}

async function hasVisibleCellGrid(page) {
  const count = await page.locator('[data-env-world-cell], [data-env-studio-atlas-cell], .environment-studio-world-cell').count();
  return count > 0;
}

function roundMetric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000000) / 1000000 : 0;
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
