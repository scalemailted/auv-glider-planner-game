import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';
import { launchFromMainMenuHub } from './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9391';
const OWNER_REVIEW_DIR = path.resolve('test-results', 'real-bathy-r1-owner-review');
const REQUIRED_SCREENSHOTS = [
  '01-reference-atlas-default.png',
  '02-reference-atlas-zoomed.png',
  '03-bounding-box-selected.png',
  '04-selected-patch-summary.png',
  '05-regional-bathymetry-generated.png'
];
const FORBIDDEN_PRIMARY_PATTERNS = [
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
  /window examples/i,
  /synthetic globe/i
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

  await expect(page.locator('#environment-studio-route')).toBeVisible();
  await expect(page.locator('#mission-console')).toContainText('Reference Bathymetry Atlas');
  await expect(page.locator('#mission-console')).toContainText('Bathymetry Source');
  await expect(page.locator('#mission-console')).toContainText('Reference Dataset');
  await expect(page.locator('#mission-console')).toContainText('Map Controls');
  await expect(page.locator('#mission-console')).toContainText('Boundary Selection');
  await expect(page.locator('#mission-console')).toContainText('Actions');
  await expect(page.locator('#env-reference-source-mode')).toHaveValue('referenceBathymetryAtlas');
  await expect(page.locator('[data-env-reference-bathymetry-map]')).toBeVisible();
  await expect(page.locator('[data-env-studio-globe-host]')).toHaveCount(0);
  await expect(page.locator('[data-env-studio-world-map]')).toHaveCount(0);
  await expect(page.locator('#env-studio-status-panel')).toContainText('Reference Atlas Summary');
  await expect(page.locator('#env-studio-status-panel')).toContainText('NO_REFERENCE_DATA_FIXTURE');
  await expect(page.locator('#mission-console')).not.toContainText('Intended Gliders');
  await expect(page.locator('#mission-console')).not.toContainText('Mission Duration');
  await expect(page.locator('#mission-console')).not.toContainText('Mission Scale');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[0]);

  const initialZoom = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.viewport?.zoom ?? 1);
  await page.locator('[data-env-reference-view-action="zoom-in"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.viewport?.zoom ?? 1), { timeout: 15000 }).toBeGreaterThan(initialZoom);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[1]);

  await page.locator('[data-env-reference-layer="slope"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.referenceLayer), { timeout: 15000 }).toBe('slope');
  await page.locator('[data-action="env-reference-draw-boundary"]').click();
  await clickReferenceAtFraction(page, 0.34, 0.30);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedPatchDigest ?? null), { timeout: 15000 }).toMatch(/^fnv1a32:/);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[2]);
  await expect(page.locator('#env-studio-status-panel')).toContainText('Selected Bathymetry Patch');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Current Artifact');
  await expect(page.locator('#env-studio-status-panel')).toContainText('REQUIRES_REGENERATION');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[3]);

  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  expect(debug.sourceMode).toBe('referenceBathymetryAtlas');
  expect(debug.studioStage).toBe('referenceAtlas');
  expect(debug.defaultSourceMode).toBe('referenceBathymetryAtlas');
  expect(debug.proceduralSandboxDefault).toBe(false);
  expect(debug.referenceDatasetName).toBe('NO_REFERENCE_DATA_FIXTURE');
  expect(debug.referenceAtlasDigest).toMatch(/^fnv1a32:/);
  expect(debug.selectedPatchDigest).toMatch(/^fnv1a32:/);
  expect(debug.hiddenTruthExposed).toBe(false);
  expect(debug.simulationChanged).toBe(false);
  expect(debug.scoringChanged).toBe(false);

  await writeQaSummary({
    ...ownerReviewSummaryFromDebug(debug),
    forbiddenPrimaryControlCount: await countForbiddenPrimaryControls(page),
    screenshots: REQUIRED_SCREENSHOTS
  });
  browserErrors.assertClean();
});

test(EXACT_TITLES[1], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);

  await page.locator('[data-action="env-reference-select-boundary"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedPatchDigest ?? null), { timeout: 15000 }).toMatch(/^fnv1a32:/);
  await page.locator('#mission-console [data-action="env-reference-generate-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 20000 }).toBe('regionalBathymetry');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.tileCount ?? 0), { timeout: 20000 }).toBe(4);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 20000 }).not.toBeNull();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[4]);

  await expect(page.locator('.environment-studio-terrain-preview')).toBeVisible();
  await expect(page.locator('.environment-studio-terrain-preview')).toContainText('Regional 3D Bathymetry Preview');
  await expect(page.locator('#mission-console')).toContainText('Regional Bathymetry');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Generated Field Status');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Current Artifact');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Scalar Artifact');
  await expect(page.locator('#env-studio-status-panel')).toContainText('Hotspots');
  await expect(page.locator('#env-studio-status-panel')).toContainText('REQUIRES_REGENERATION');

  const exported = await downloadStudioProject(page);
  expect(exported.data.sourceMode).toBe('referenceBathymetryAtlas');
  expect(exported.data.referenceAtlas.sourceDataset.name).toBe('NO_REFERENCE_DATA_FIXTURE');
  expect(exported.data.referenceAtlas.provenance.fixtureStatus).toBe('NO_REFERENCE_DATA_FIXTURE');
  expect(exported.data.selectedReferenceWindow.artifactType).toBe('anchor.reference-bathymetry-window');
  expect(exported.data.selectedReferenceWindow.patchDigest).toMatch(/^fnv1a32:/);
  expect(exported.data.selectedPatchDigest).toBe(exported.data.selectedReferenceWindow.patchDigest);
  expect(exported.data.bathymetryBuilderResult.type).toBe('anchor.reference-patch-bathymetry-builder-summary');
  expect(exported.data.bathymetryBuilderResult.patchDigest).toBe(exported.data.selectedPatchDigest);
  expect(exported.data.bathymetryArtifactDigest).toBe(exported.data.bathymetryBuilderResult.bathymetryArtifactDigest);
  expect(exported.data.flowGenerationInputs.generatedArtifacts.currentField4D).toBe(false);
  expect(exported.data.flowGenerationInputs.generatedArtifacts.scalarField4D).toBe(false);
  expect(exported.data.flowGenerationInputs.generatedArtifacts.hotspots).toBe(false);
  expect(exported.data.dependencyGraph.nodes.currentArtifact.state).toBe('REQUIRES_REGENERATION');
  expect(exported.data.dependencyGraph.nodes.scalarArtifact.state).toBe('REQUIRES_REGENERATION');
  expect(exported.data.dependencyGraph.nodes.hotspots.state).toBe('REQUIRES_REGENERATION');
  expect(exported.data.dependencyGraph.nodes.startsDropZones.state).toBe('NEEDS_VALIDATION');
  expect(exported.data.dependencyGraph.nodes.benchmarkBundle.state).toBe('REQUIRES_REGENERATION');
  expect(exported.data.provenance.hiddenTruthExposed).toBe(false);
  expect(exported.data.provenance.operationalForecast).toBe(false);
  expect(exported.data.provenance.certifiedForNavigation).toBe(false);

  const debugAfterGeneration = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await writeQaSummary({
    ...ownerReviewSummaryFromDebug(debugAfterGeneration),
    sourceGridShape: debugAfterGeneration.sourceGridShape,
    bathymetryArtifactDigest: debugAfterGeneration.bathymetryArtifactDigest,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  });

  const originalDigest = exported.data.projectDigest;
  const originalPatchDigest = exported.data.selectedReferenceWindow.patchDigest;
  const originalBathymetryDigest = exported.data.bathymetryArtifactDigest;

  await page.locator('#env-studio-import-file').setInputFiles(exported.path);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.projectDigest ?? null), { timeout: 15000 }).toBe(originalDigest);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage ?? null), { timeout: 15000 }).toBe('regionalBathymetry');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedPatchDigest ?? null), { timeout: 15000 }).toBe(originalPatchDigest);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 15000 }).toBe(originalBathymetryDigest);

  await page.locator('#mission-console [data-action="menu"]').click();
  await waitForAnchorRoute(page, 'main-menu');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.routeActive === false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('[data-environment-studio-preview-host]')).toHaveCount(0);
  const cleanup = await page.evaluate(() => ({
    activeRendererCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.activeRendererCount,
    activeRafCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.activeRafCount,
    activeCanvasCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.activeCanvasCount,
    previewRendererCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.previewRendererCount,
    terrainPreviewRafCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.terrainPreviewRafCount,
    terrainPreviewRendererCount: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.terrainPreviewRendererCount,
    stalePreviewObjects: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.stalePreviewObjects,
    hiddenTruthExposed: window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.hiddenTruthExposed
  }));
  expect(cleanup).toEqual({
    activeRendererCount: 0,
    activeRafCount: 0,
    activeCanvasCount: 0,
    previewRendererCount: 0,
    terrainPreviewRafCount: 0,
    terrainPreviewRendererCount: 0,
    stalePreviewObjects: 0,
    hiddenTruthExposed: false
  });
  await writeQaSummary({
    rendererCleanup: {
      activeRendererCount: cleanup.activeRendererCount,
      activeRafCount: cleanup.activeRafCount,
      activeCanvasCount: cleanup.activeCanvasCount
    }
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

async function clickReferenceAtFraction(page, xFraction, yFraction) {
  const canvas = page.locator('[data-env-reference-bathymetry-map]');
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  await canvas.click({
    position: {
      x: Math.max(1, Math.min(box.width - 1, box.width * xFraction)),
      y: Math.max(1, Math.min(box.height - 1, box.height * yFraction))
    }
  });
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
  return {
    defaultSourceMode: debug.defaultSourceMode ?? 'referenceBathymetryAtlas',
    proceduralSandboxDefault: debug.proceduralSandboxDefault === true ? true : false,
    referenceDatasetName: debug.referenceDatasetName ?? 'NO_REFERENCE_DATA_FIXTURE',
    referenceAtlasDigest: debug.referenceAtlasDigest ?? null,
    selectedPatchDigest: debug.selectedPatchDigest ?? null,
    bathymetryArtifactDigest: debug.bathymetryArtifactDigest ?? null,
    referenceFixtureStatus: debug.referenceFixtureStatus ?? 'NO_REFERENCE_DATA_FIXTURE',
    validationStatus: debug.validationStatus ?? null,
    sourceGridShape: debug.sourceGridShape ?? null,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  };
}

async function countForbiddenPrimaryControls(page) {
  const text = await page.locator('#mission-console').innerText();
  return FORBIDDEN_PRIMARY_PATTERNS.filter((pattern) => pattern.test(text)).length;
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
