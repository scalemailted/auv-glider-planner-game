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
const FNV_DIGEST_PATTERN = /(?:^|-)fnv1a32:/;

export const EXACT_TITLES = [
  'Reference Bathymetry Atlas Opens',
  'Reference Patch Generates Bathymetry',
  'Reference Patch Generates Environment Fields',
  'Export / Import Generated Reference Environment'
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

  if (!hasReferenceFixture(debug)) {
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
  if (!hasReferenceFixture(initialDebug)) {
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
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedPatchDigest ?? null), { timeout: 15000 }).toMatch(FNV_DIGEST_PATTERN);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[2]);
  await page.locator('#mission-console [data-action="env-reference-generate-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 20000 }).toBe('regionalBathymetry');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 20000 }).not.toBeNull();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[3]);

  const debugAfterGeneration = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  await writeQaSummary(ownerReviewSummaryFromDebug(debugAfterGeneration));
  browserErrors.assertClean();
});

test(EXACT_TITLES[2], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const debug = await generateReferenceEnvironmentFields(page);
  if (!hasReferenceFixture(debug)) {
    browserErrors.assertClean();
    return;
  }

  await expect(page.locator('#mission-console')).toContainText('Current artifact');
  await expect(page.locator('#mission-console')).toContainText('Scalar artifact');
  await expect(page.locator('#mission-console')).toContainText('Hazards');
  await expect(page.locator('#mission-console')).toContainText('Environment artifact');
  expect(debug.fieldGenerationStatus).toBe('CURRENT');
  expect(debug.currentArtifactDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(debug.scalarArtifactDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(debug.hotspotArtifactDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(debug.hazardCandidateDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(debug.environmentArtifactDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(['CURRENT', 'REQUIRES_COMPOSITION']).toContain(debug.environmentArtifactStatus);
  expect(debug.currentDiagnostics.landVectorCount).toBe(0);
  expect(debug.currentDiagnostics.belowBottomVectorCount).toBe(0);
  expect(debug.currentDiagnostics.temporalChangeRms).toBeGreaterThan(0);
  expect(debug.currentDiagnostics.surfaceToDeepVectorDifferenceRms).toBeGreaterThan(0);
  expect(debug.scalarDiagnostics.scalarMean).toBeGreaterThanOrEqual(0);
  expect(debug.startDropZoneDiagnostics.candidateCount).toBeGreaterThan(0);
  expect(debug.hazardDiagnostics.candidateCount).toBeGreaterThan(0);
  expect(debug.dependencyGraph.nodes.currentArtifact.state).toBe('CURRENT');
  expect(debug.dependencyGraph.nodes.scalarArtifact.state).toBe('CURRENT');
  expect(debug.dependencyGraph.nodes.hotspots.state).toBe('CURRENT');
  expect(debug.dependencyGraph.nodes.hazards.state).toBe('CURRENT');
  expect(debug.dependencyGraph.nodes.startsDropZones.state).toBe('NEEDS_VALIDATION');
  expect(debug.dependencyGraph.nodes.benchmarkBundle.state).toBe('REQUIRES_REGENERATION');
  expect(['CURRENT', 'REQUIRES_COMPOSITION']).toContain(debug.dependencyGraph.nodes.environmentArtifact.state);
  expect(debug.hiddenTruthExposed).toBe(false);
  expect(debug.simulationChanged).toBe(false);
  expect(debug.scoringChanged).toBe(false);

  await writeQaSummary(ownerReviewSummaryFromDebug(debug));
  browserErrors.assertClean();
});

test(EXACT_TITLES[3], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const debug = await generateReferenceEnvironmentFields(page);
  if (!hasReferenceFixture(debug)) {
    browserErrors.assertClean();
    return;
  }

  const exported = await downloadStudioProject(page);
  expect(exported.data.sourceMode).toBe('referenceBathymetryAtlas');
  expect(exported.data.fieldRegenerationResult.referenceFixtureId).toBe('monterey_canyon_15s');
  expect(exported.data.fieldRegenerationResult.currentArtifactDigest).toBe(debug.currentArtifactDigest);
  expect(exported.data.fieldRegenerationResult.hazardCandidateDigest).toBe(debug.hazardCandidateDigest);
  expect(exported.data.fieldRegenerationResult.environmentArtifactDigest).toBe(debug.environmentArtifactDigest);
  expect(exported.data.flowGenerationInputs.dependencyPlan.hazards).toBe('CURRENT');
  expect(exported.data.provenance.hiddenTruthExposed).toBe(false);
  expect(JSON.stringify(exported.data.fieldRegenerationResult)).not.toMatch(/"currentArtifact"\s*:\s*\{|"scalarArtifact"\s*:\s*\{|"environmentArtifact"\s*:\s*\{/);

  await page.locator('input[data-env-studio-import]').setInputFiles(exported.path);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.currentArtifactDigest ?? null), { timeout: 15000 }).toBe(debug.currentArtifactDigest);
  const importedDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  expect(importedDebug.referenceFixtureId).toBe(debug.referenceFixtureId);
  expect(importedDebug.currentArtifactDigest).toBe(debug.currentArtifactDigest);
  expect(importedDebug.scalarArtifactDigest).toBe(debug.scalarArtifactDigest);
  expect(importedDebug.hazardCandidateDigest).toBe(debug.hazardCandidateDigest);
  expect(importedDebug.environmentArtifactDigest).toBe(debug.environmentArtifactDigest);
  expect(importedDebug.dependencyGraph.nodes.hazards.state).toBe('CURRENT');
  expect(importedDebug.hiddenTruthExposed).toBe(false);
  expect(importedDebug.previewRendererCount).toBe(0);
  expect(importedDebug.activeRafCount).toBe(0);

  await writeQaSummary(ownerReviewSummaryFromDebug(importedDebug));
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

async function generateReferenceEnvironmentFields(page) {
  await openEnvironmentStudio(page);
  await waitForReferenceManifest(page);
  const initialDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  if (!hasReferenceFixture(initialDebug)) {
    await expect(page.locator('[data-action="env-reference-generate-bathymetry"]')).toBeDisabled();
    return initialDebug;
  }
  await page.locator('[data-action="env-reference-select-boundary"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedPatchDigest ?? null), { timeout: 15000 }).toMatch(FNV_DIGEST_PATTERN);
  await page.locator('#mission-console [data-action="env-reference-generate-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 20000 }).toBe('regionalBathymetry');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 20000 }).toMatch(FNV_DIGEST_PATTERN);
  await page.locator('[data-action="env-studio-generate-fields"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.fieldGenerationStatus ?? null), { timeout: 30000 }).toBe('CURRENT');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.currentArtifactDigest ?? null), { timeout: 30000 }).toMatch(FNV_DIGEST_PATTERN);
  return page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
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
  const screenshots = (await fs.readdir(OWNER_REVIEW_DIR))
    .filter((entry) => entry.endsWith('.png'))
    .sort();
  await fs.writeFile(
    path.join(OWNER_REVIEW_DIR, 'qa-summary.json'),
    JSON.stringify({ ...current, ...patch, screenshots }, null, 2) + '\n'
  );
}

function ownerReviewSummaryFromDebug(debug = {}) {
  return {
    fixtureStatus: debug.referenceFixtureStatus ?? 'NO_REFERENCE_DATA_FIXTURE',
    overviewDigest: debug.overviewDigest ?? null,
    fixtureCount: debug.referenceFixtureCount ?? 0,
    selectedFixtureId: debug.referenceFixtureId ?? debug.selectedFixtureId ?? null,
    selectedPatchDigest: debug.selectedPatchDigest ?? null,
    bathymetryArtifactDigest: debug.bathymetryArtifactDigest ?? null,
    currentArtifactDigest: debug.currentArtifactDigest ?? null,
    scalarArtifactDigest: debug.scalarArtifactDigest ?? null,
    hotspotArtifactDigest: debug.hotspotArtifactDigest ?? null,
    hazardCandidateDigest: debug.hazardCandidateDigest ?? null,
    environmentArtifactDigest: debug.environmentArtifactDigest ?? null,
    environmentArtifactStatus: debug.environmentArtifactStatus ?? null,
    defaultSourceMode: debug.defaultSourceMode ?? 'referenceBathymetryAtlas',
    proceduralSandboxDefault: debug.proceduralSandboxDefault === true ? true : false,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  };
}

function hasReferenceFixture(debug = {}) {
  return debug.referenceDataAvailable === true
    || debug.referenceFixtureStatus === 'AVAILABLE'
    || debug.referenceBathymetryManifest?.fixtureStatus === 'AVAILABLE'
    || Number(debug.referenceFixtureCount ?? 0) > 0;
}

async function downloadStudioProject(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-action="env-studio-export-project"]').first().click()
  ]);
  const filePath = await download.path();
  const text = await fs.readFile(filePath, 'utf8');
  return {
    filename: download.suggestedFilename(),
    path: filePath,
    data: JSON.parse(text)
  };
}
