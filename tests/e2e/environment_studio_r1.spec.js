import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';
import { launchFromMainMenuHub } from './helpers/SmokeSpecShared.js';
import { validateClassicalPlannerBenchmarkBundle } from '../../src/core/io/ClassicalPlannerBenchmarkBundleExporter.js';
import { canonicalJsonDigest, canonicalizeJsonValue } from '../../packages/codecs/src/index.js';

let server;
const BASE = 'http://127.0.0.1:9391';
let OWNER_REVIEW_DIR = path.resolve(process.env.ANCHOR_E2E_OWNER_REVIEW_DIR ?? 'artifacts/owner-review/ref-atlas-ux-r1');
const REQUIRED_SCREENSHOTS = [
  '01-global-atlas-default.png',
  '02-patch-coverage-overlay.png',
  '03-monterey-patch-selected.png',
  '04-regional-patch-workspace.png',
  '05-reference-bathymetry-generated.png',
  '06-synthetic-fields-generated.png',
  '07-environment-artifact-composed.png',
  '08-launch-validation-report.png',
  '09-planning-launch-warning-review.png',
  '10-planning-launch-ready.png',
  '11-mission-workspace-reference-environment.png',
  '12-execute-mission-from-reference-environment.png',
  '13-debrief-reference-environment-result.png',
  '14-public-benchmark-bundle-export.png',
  '15-project-export-import-roundtrip.png',
  '16-main-menu-cleanup.png'
];
const FNV_DIGEST_PATTERN = /(?:^|-)fnv1a32:/;
let GIT_BRANCH = 'unknown';
let GIT_HEAD = 'unknown';
let REFERENCE_FIXTURE_DIGEST = 'unknown';

export const EXACT_TITLES = [
  'Global Reference Atlas Opens',
  'Select Monterey Patch from Atlas and Generate Environment',
  'Reference Patch Generates Environment Fields',
  'Export / Import Generated Reference Environment',
  'Reference Environment Owner Walkthrough',
  'Reference Environment Export/Benchmark Roundtrip'
];

test.setTimeout(900000);
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  GIT_BRANCH = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
  GIT_HEAD = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const manifest = JSON.parse(await fs.readFile(path.resolve('assets/reference_bathymetry/manifest.json'), 'utf8'));
  REFERENCE_FIXTURE_DIGEST = manifest.fixtures?.find((entry) => entry.fixtureId === 'monterey_canyon_15s')?.digest ?? manifest.overview?.digest ?? 'unknown';
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
  await expect(page.locator('#mission-console')).toContainText('Dataset');
  await expect(page.locator('#mission-console')).toContainText('Global Atlas Selector');
  await expect(page.locator('#mission-console')).toContainText('Region Selection');
  await expect(page.locator('#mission-console')).toContainText('Load Mission Patch');
  await expect(page.locator('#mission-console')).toContainText('Actions');
  await expect(page.locator('#env-reference-source-mode')).toHaveValue('referenceBathymetryAtlas');
  await expect(page.locator('[data-env-studio-globe-host]')).toHaveCount(0);
  await expect(page.locator('[data-env-studio-world-map]')).toHaveCount(0);
  await expect(page.locator('#env-studio-status-panel')).toContainText('Reference Atlas Summary');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[0]);

  const debug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  expect(debug.sourceMode).toBe('referenceBathymetryAtlas');
  expect(debug.studioStage).toBe('globalAtlasSelector');
  expect(debug.defaultStage).toBe('globalAtlasSelector');
  expect(debug.overviewIsGlobal).toBe(true);
  expect(debug.defaultViewIsRegionalPatch).toBe(false);
  expect(debug.missionReadyPatchCount).toBeGreaterThanOrEqual(1);
  expect(debug.patchCoverageOverlays.length).toBeGreaterThanOrEqual(1);
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
    await expect(page.locator('[data-action="env-reference-generate-bathymetry"]')).toHaveCount(0);
    await expect(page.locator('#env-studio-status-panel')).toContainText('NO_REFERENCE_DATA_FIXTURE');
    await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[1]);
    await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[4]);
  } else {
    await expect(page.locator('[data-env-reference-bathymetry-map]')).toBeVisible();
    await expect(page.locator('#env-studio-status-panel')).toContainText('Reference Atlas Summary');
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
    await expect(page.locator('[data-action="env-reference-generate-bathymetry"]')).toHaveCount(0);
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
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedRegionAvailability ?? null), { timeout: 15000 }).toBe('missionReadyPatchAvailable');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.matchedFixtureId ?? null), { timeout: 15000 }).toBe('monterey_canyon_15s');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[2]);

  await page.locator('[data-action="env-reference-load-patch"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 15000 }).toBe('regionalPatchWorkspace');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.loadedFixtureId ?? null), { timeout: 15000 }).toBe('monterey_canyon_15s');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[3]);

  await page.locator('#mission-console [data-action="env-reference-generate-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 20000 }).toBe('regionalPatchWorkspace');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 20000 }).not.toBeNull();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[4]);

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
  expect(debug.environmentArtifactStatus).toBe('CURRENT');
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
  expect(debug.dependencyGraph.nodes.environmentArtifact.state).toBe('CURRENT');
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

test(EXACT_TITLES[4], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEnvironmentStudio(page);
  await waitForReferenceManifest(page);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[0]);

  const debug = await composeAndValidateReferenceEnvironment(page, {
    captureScreenshots: true,
    skipOpen: true
  });
  if (!hasReferenceFixture(debug)) {
    browserErrors.assertClean();
    return;
  }

  await expect(page.locator('#mission-console')).toContainText('Environment Artifact');
  await expect(page.locator('#mission-console')).toContainText('Launch Validation');
  await expect(page.locator('#mission-console')).toContainText('Planning ready');
  await expect(page.locator('#mission-console')).toContainText('Launch ready with non-blocking warnings');
  await expect(page.locator('[data-reference-launch-warnings]')).toBeVisible();
  await expect(page.locator('[data-action="env-studio-launch-planning"]').first()).toBeEnabled();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[8]);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[9]);

  await page.locator('[data-action="env-studio-launch-planning"]').first().click();
  await expect.poll(
    () => page.evaluate(() => window.ANCHOR_REFERENCE_ENVIRONMENT_LAUNCH_DEBUG?.activeScene ?? null),
    { timeout: 20000 }
  ).toBe('MissionWorkspaceScene');
  await expect(page.locator('#mission-console')).toContainText('Reference-Derived Environment');
  await expect(page.locator('#mission-console')).toContainText('Reference-derived Monterey Canyon');
  await expect(page.locator('#mission-console')).toContainText('ETOPO 2022 15 arc-second Monterey Canyon');
  await expect(page.locator('#mission-console')).toContainText('Launch: WARN');
  await expect(page.locator('#mission-console')).toContainText('not an operational forecast');
  await expect(page.locator('#mission-console')).toContainText('Planning Tools');
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[10]);

  const route = await addReferenceEnvironmentWaypoints(page);
  expect(route.waypointCount).toBeGreaterThanOrEqual(2);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[11]);

  const launchDebug = await page.evaluate(() => window.ANCHOR_REFERENCE_ENVIRONMENT_LAUNCH_DEBUG);
  expect(launchDebug.launchedFromEnvironmentStudio).toBe(true);
  expect(launchDebug.referenceFixtureId).toBe('monterey_canyon_15s');
  expect(launchDebug.environmentArtifactDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(launchDebug.currentArtifactDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(launchDebug.scalarArtifactDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(launchDebug.launchValidationStatus).toBe('WARN');
  expect(launchDebug.warningSummary.blockingWarningCount).toBe(0);
  expect(launchDebug.warningSummary.failureCount).toBe(0);
  expect(launchDebug.hiddenTruthExposed).toBe(false);
  expect(launchDebug.simulationChanged).toBe(false);
  expect(launchDebug.scoringChanged).toBe(false);

  const executeButton = page.locator('#mission-console [data-action="execute"]');
  await expect(executeButton).toBeVisible();
  await expect(executeButton).toBeEnabled();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[11]);
  await executeButton.click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 20000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.engineInitialized === true), { timeout: 20000 }).toBe(true);
  const finishDebug = await page.evaluate(async () => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    if (scene.engine?.runUntilComplete) {
      const previousIgnoreSurfacePauses = scene.engine.ignoreSurfacePauses;
      scene.engine.ignoreSurfacePauses = true;
      scene.engine.runUntilComplete(2000);
      scene.engine.ignoreSurfacePauses = previousIgnoreSurfacePauses;
    } else {
      scene.finishSimulation?.();
      const started = performance.now();
      while (scene.finishingAsync && performance.now() - started < 15000) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    if (scene.engine?.routeFailureDecision?.active) scene.finishFromRouteFailure?.();
    if (scene.engine?.awaitingSurfaceDecision) scene.finishFromSurface?.();
    scene.syncResult?.();
    scene.publishExecutionDebug?.({ ownerReviewFinishInvoked: true });
    return window.ANCHOR_EXECUTION_DEBUG;
  });
  expect(finishDebug.resultAvailable).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.goDebrief?.());
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 20000 }).toBe(true);
  await expect(page.locator('#debrief-root')).toBeVisible();
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[12]);

  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('DebriefScene');
    scene.leaveDebrief?.(() => scene.scene.start('MainMenuScene'));
  });
  await waitForAnchorRoute(page, 'main-menu');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0), { timeout: 20000 }).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0), { timeout: 20000 }).toBe(0);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[15]);

  const cleanup = await page.evaluate(() => ({
    activeRendererCountAfterCleanup: Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0),
    activeRafCountAfterCleanup: Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0),
    activeCanvasCountAfterCleanup: document.querySelectorAll('.three-mission-world-canvas, .three-bathymetry-canvas').length
  }));
  await writeQaSummary(ownerReviewSummaryFromDebug({
    ...debug,
    ...launchDebug,
    launchValidationStatus: launchDebug.launchValidationStatus,
    launchValidationDigest: launchDebug.launchValidationDigest,
    launchWarningSummary: launchDebug.warningSummary,
    warningSummary: launchDebug.warningSummary,
    missionExecuted: true,
    debriefReached: true,
    launchedPlanningEnvironmentDigest: launchDebug.environmentArtifactDigest,
    ...cleanup
  }));

  browserErrors.assertClean();
});

test(EXACT_TITLES[5], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const debug = await composeAndValidateReferenceEnvironment(page);
  if (!hasReferenceFixture(debug)) {
    browserErrors.assertClean();
    return;
  }

  const benchmark = await downloadBenchmarkBundle(page);
  expect(benchmark.filename).toBe('anchor_reference_environment_benchmark_bundle.json');
  expect(benchmark.data.type).toBe('anchor.classical-planner-benchmark-bundle');
  expect(benchmark.data.visibilityClass).toBe('PUBLIC');
  expect(benchmark.data.fairnessClass).toBe('FORECAST_ONLY');
  expect(benchmark.data.containsHiddenTruth).toBe(false);
  expect(benchmark.data.environmentDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(benchmark.data.benchmarkBundleDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(benchmark.data.currents.depthStructure).toBe('packageBackedDepthSpecificCurrentField4D');
  expect(benchmark.data.scalarFields[0].depthClassification).toBe('packageBackedDepthSpecificScalarField4D');
  expect(benchmark.data.referenceEnvironmentDigests.hotspotArtifactDigest).toMatch(FNV_DIGEST_PATTERN);
  expect(benchmark.data.visibilitySafety.containsHiddenTruth).toBe(false);
  expect(benchmark.data.fairnessMetadata.hiddenTruthAvailableToPlanner).toBe(false);
  expect(benchmark.data.parityProbes.length).toBeGreaterThanOrEqual(8);
  expect(JSON.stringify(benchmark.data)).not.toMatch(/T_hiddenTruth|"hiddenTruth"\s*:|rawOracleTensor|oracleState|external_data[\\/]|[A-Z]:\\/);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[13]);

  const validation = validateClassicalPlannerBenchmarkBundle(benchmark.data);
  expect(validation.status).toBe('PASS');

  await expect.poll(
    () => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.benchmarkBundleStatus ?? null),
    { timeout: 15000 }
  ).toBe('CURRENT');
  const exported = await downloadStudioProject(page);
  expect(exported.data.benchmarkBundleResult.status).toBe('CURRENT');
  expect(exported.data.benchmarkBundleResult.benchmarkBundleDigest).toBe(benchmark.data.benchmarkBundleDigest);
  expect(exported.data.launchValidationResult.planningLaunchReady).toBe(true);
  expect(exported.data.launchValidationResult.warningSummary.blockingWarningCount).toBe(0);
  expect(exported.data.launchValidationResult.validationReport.artifactType).toBe('anchor.reference-environment-launch-validation-report');

  await page.locator('input[data-env-studio-import]').setInputFiles(exported.path);
  await expect.poll(
    () => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.benchmarkBundleDigest ?? null),
    { timeout: 15000 }
  ).toBe(benchmark.data.benchmarkBundleDigest);
  const importedDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  expect(importedDebug.environmentArtifactDigest).toBe(debug.environmentArtifactDigest);
  expect(importedDebug.launchValidationStatus).toBe(debug.launchValidationStatus);
  expect(importedDebug.benchmarkBundleStatus).toBe('CURRENT');
  expect(importedDebug.hiddenTruthExposed).toBe(false);
  await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[14]);

  await writeQaSummary(ownerReviewSummaryFromDebug({
    ...importedDebug,
    benchmarkBundleStatus: 'CURRENT',
    benchmarkBundleDigest: benchmark.data.benchmarkBundleDigest,
    exportedProjectDigest: exported.data.projectDigest ?? canonicalJsonDigest(canonicalizeJsonValue(exported.data)),
    warningSummary: exported.data.launchValidationResult.warningSummary,
    launchWarningSummary: exported.data.launchValidationResult.warningSummary,
    blockingWarningCount: exported.data.launchValidationResult.warningSummary.blockingWarningCount,
    failureCount: exported.data.launchValidationResult.warningSummary.failureCount
  }));
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

async function generateReferenceEnvironmentFields(page, options = {}) {
  if (!options.skipOpen) {
    await openEnvironmentStudio(page);
    await waitForReferenceManifest(page);
  }
  const initialDebug = await page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
  if (!hasReferenceFixture(initialDebug)) {
    await expect(page.locator('[data-action="env-reference-generate-bathymetry"]')).toHaveCount(0);
    return initialDebug;
  }
  await page.locator('[data-action="env-reference-select-boundary"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.selectedPatchDigest ?? null), { timeout: 15000 }).toMatch(FNV_DIGEST_PATTERN);
  await page.locator('[data-action="env-reference-load-patch"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 15000 }).toBe('regionalPatchWorkspace');
  await page.locator('#mission-console [data-action="env-reference-generate-bathymetry"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.studioStage), { timeout: 20000 }).toBe('regionalPatchWorkspace');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 20000 }).toMatch(FNV_DIGEST_PATTERN);
  if (options.captureScreenshots) await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[4]);
  await page.locator('[data-action="env-studio-generate-fields"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.fieldGenerationStatus ?? null), { timeout: 30000 }).toBe('CURRENT');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.currentArtifactDigest ?? null), { timeout: 30000 }).toMatch(FNV_DIGEST_PATTERN);
  if (options.captureScreenshots) await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[5]);
  return page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
}

async function composeAndValidateReferenceEnvironment(page, options = {}) {
  const generated = await generateReferenceEnvironmentFields(page, options);
  if (!hasReferenceFixture(generated)) return generated;
  await page.locator('[data-action="env-studio-compose-environment"]').first().click();
  await expect.poll(
    () => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.environmentCompositionStatus ?? null),
    { timeout: 30000 }
  ).toBe('CURRENT');
  await expect.poll(
    () => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.environmentArtifactStatus ?? null),
    { timeout: 30000 }
  ).toBe('CURRENT');
  if (options.captureScreenshots) await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[6]);
  await page.locator('[data-action="env-studio-validate-launch"]').first().click();
  await expect.poll(
    () => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.planningLaunchReady ?? null),
    { timeout: 30000 }
  ).toBe(true);
  await expect.poll(
    () => page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.startDropZoneValidation?.status ?? null),
    { timeout: 30000 }
  ).toBe('CURRENT');
  if (options.captureScreenshots) await captureOwnerScreenshot(page, REQUIRED_SCREENSHOTS[7]);
  return page.evaluate(() => window.ANCHOR_ENVIRONMENT_STUDIO_DEBUG);
}

async function addReferenceEnvironmentWaypoints(page) {
  const result = await page.evaluate(async () => {
    const { addWaypoint } = await import('./src/core/planning/WaypointPlan.js');
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const state = window.anchorGame.state;
    const agentId = state.selectedAgentId ?? state.mission?.agents?.[0]?.id;
    const agent = state.mission?.agents?.find((candidate) => candidate.id === agentId) ?? state.mission?.agents?.[0];
    const agentPlan = state.plan?.agentPlans?.find((candidate) => candidate.agentId === agentId);
    const start = agentPlan?.selectedStart ?? agent?.deployment?.selectedStart ?? agent?.start ?? { x: 0, y: 0 };
    scene.trySelectDeploymentStart?.(start);
    const selected = [];
    const existing = new Set([`${Math.round(Number(start?.x ?? 0))}:${Math.round(Number(start?.y ?? 0))}`]);
    const grid = state.level?.world?.grid ?? {};
    const width = Number(grid.width ?? 0);
    const sx = Math.round(Number(start?.x ?? 0));
    const sy = Math.round(Number(start?.y ?? 0));
    const deterministicTargets = [
      { x: Math.min(width - 1, sx + 2), y: sy, action: 'sample' },
      { x: Math.min(width - 1, sx + 4), y: sy, action: 'sample' }
    ];
    for (const target of deterministicTargets) {
      const key = `${target.x}:${target.y}`;
      if (existing.has(key)) continue;
      const index = selected.length;
      addWaypoint(state.plan, agentId, {
        ...target,
        window: 0,
        t: (index + 1) * 2,
        estimatedArrivalTime: (index + 1) * 2,
        segmentTravelTime: 2,
        estimatedTravelTime: 2,
        segmentEnergy: 2,
        remainingFuelEstimate: Math.max(0, Number(agent?.battery ?? 140) - (index + 1) * 2),
        validity: { valid: true, reasons: [] },
        warnings: [],
        warningCodes: [],
        kind: 'navigation',
        coordinateProfileId: state.plan?.coordinateProfileId,
        fieldSamplingProfileId: state.plan?.fieldSamplingProfileId
      });
      existing.add(key);
      selected.push(target);
    }
    scene.refreshPanels?.();
    scene.refreshMap?.();
    const finalPlan = state.plan?.agentPlans?.find((candidate) => candidate.agentId === agentId);
    return {
      agentId,
      selected,
      waypointCount: finalPlan?.waypoints?.length ?? 0,
      executionReady: (finalPlan?.waypoints?.length ?? 0) >= 2,
      errors: []
    };
  });
  expect(result.executionReady, result.errors?.[0] ?? 'Route must be executable').toBe(true);
  return result;
}

async function resetOwnerReviewPackage() {
  try {
    await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'EPERM') throw error;
    OWNER_REVIEW_DIR = path.join(os.tmpdir(), 'anchor-ref-atlas-ux-r1-owner-review');
    await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
  }
  try {
    await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  } catch (error) {
    if (error?.code !== 'EPERM') throw error;
    OWNER_REVIEW_DIR = path.join(os.tmpdir(), 'anchor-ref-atlas-ux-r1-owner-review');
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
    const text = await fs.readFile(path.join(OWNER_REVIEW_DIR, 'qa-summary.json'), 'utf8');
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function writeQaSummary(patch) {
  await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  const current = await readQaSummary();
  const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  const screenshots = (await fs.readdir(OWNER_REVIEW_DIR))
    .filter((entry) => entry.endsWith('.png'))
    .sort();
  await fs.writeFile(
    path.join(OWNER_REVIEW_DIR, 'qa-summary.json'),
    JSON.stringify({ ...current, ...cleanPatch, screenshots }, null, 2) + '\n'
  );
}

function ownerReviewSummaryFromDebug(debug = {}) {
  const warningSummary = debug.warningSummary ?? debug.launchWarningSummary ?? {};
  const hasBlockingLaunchIssue = Number(warningSummary.blockingWarningCount ?? debug.blockingWarningCount ?? 0) > 0
    || Number(warningSummary.failureCount ?? debug.failureCount ?? 0) > 0;
  const atlasDefaultValid = debug.defaultStage === 'globalAtlasSelector'
    && debug.overviewIsGlobal === true
    && debug.defaultViewIsRegionalPatch === false
    && debug.rawExternalDataPathExposed !== true
    && debug.hiddenTruthExposed !== true;
  const status = debug.planningLaunchReady === true && !hasBlockingLaunchIssue
    ? (Number(warningSummary.totalWarningCount ?? 0) > 0 || debug.launchValidationStatus === 'WARN' ? 'PASS_WITH_NON_BLOCKING_WARNINGS' : 'PASS')
    : atlasDefaultValid
      ? 'PASS'
      : 'REF_ATLAS_UX_R1_ACCEPTANCE_FAIL';
  return {
    status,
    phase: 'REF-ATLAS-UX-R1',
    branch: GIT_BRANCH,
    head: GIT_HEAD,
    defaultStage: debug.defaultStage ?? null,
    studioStage: debug.studioStage ?? null,
    defaultViewIsRegionalPatch: debug.defaultViewIsRegionalPatch === true ? true : false,
    overviewStatus: debug.overviewStatus ?? null,
    overviewIsGlobal: debug.overviewIsGlobal === true,
    globalOverviewBounds: debug.globalOverviewBounds ?? null,
    atlasViewport: debug.atlasViewport ?? null,
    selectedAtlasBounds: debug.selectedAtlasBounds ?? debug.selectedPatchBounds ?? null,
    selectedRegionAvailability: debug.selectedRegionAvailability ?? null,
    matchedFixtureId: debug.matchedFixtureId ?? null,
    matchedFixtureRole: debug.matchedFixtureRole ?? null,
    loadedFixtureId: debug.loadedFixtureId ?? debug.loadedReferenceFixtureId ?? null,
    loadedFixtureRole: debug.loadedFixtureRole ?? debug.loadedReferenceFixtureRole ?? null,
    missionReadyPatchCount: Number(debug.missionReadyPatchCount ?? 0),
    lowResolutionPatchCount: Number(debug.lowResolutionPatchCount ?? 0),
    patchCoverageOverlayCount: Array.isArray(debug.patchCoverageOverlays) ? debug.patchCoverageOverlays.length : 0,
    fixtureStatus: debug.referenceFixtureStatus ?? 'NO_REFERENCE_DATA_FIXTURE',
    overviewDigest: debug.overviewDigest ?? null,
    fixtureCount: debug.referenceFixtureCount ?? 0,
    referenceFixtureId: debug.referenceFixtureId ?? debug.selectedFixtureId ?? null,
    referenceFixtureDigest: debug.referenceFixtureDigest ?? REFERENCE_FIXTURE_DIGEST,
    selectedFixtureId: debug.referenceFixtureId ?? debug.selectedFixtureId ?? null,
    selectedPatchDigest: debug.selectedPatchDigest ?? null,
    bathymetryArtifactDigest: debug.bathymetryArtifactDigest ?? null,
    currentArtifactDigest: debug.currentArtifactDigest ?? null,
    scalarArtifactDigest: debug.scalarArtifactDigest ?? null,
    hotspotArtifactDigest: debug.hotspotArtifactDigest ?? null,
    hazardCandidateDigest: debug.hazardCandidateDigest ?? null,
    environmentArtifactDigest: debug.environmentArtifactDigest ?? null,
    environmentArtifactStatus: debug.environmentArtifactStatus ?? null,
    launchValidationStatus: debug.launchValidationStatus ?? null,
    launchValidationDigest: debug.launchValidationDigest ?? null,
    planningLaunchReady: debug.planningLaunchReady === true,
    warningSummary,
    blockingWarningCount: Number(warningSummary.blockingWarningCount ?? debug.blockingWarningCount ?? 0),
    failureCount: Number(warningSummary.failureCount ?? debug.failureCount ?? 0),
    benchmarkBundleStatus: debug.benchmarkBundleStatus ?? null,
    benchmarkBundleDigest: debug.benchmarkBundleDigest ?? null,
    exportedProjectDigest: debug.exportedProjectDigest ?? null,
    launchedPlanningEnvironmentDigest: debug.launchedPlanningEnvironmentDigest ?? debug.activePlanningEnvironmentDigest ?? debug.environmentArtifactDigest ?? null,
    missionExecuted: debug.missionExecuted === true ? true : undefined,
    debriefReached: debug.debriefReached === true ? true : undefined,
    defaultSourceMode: debug.defaultSourceMode ?? 'referenceBathymetryAtlas',
    proceduralSandboxDefault: debug.proceduralSandboxDefault === true ? true : false,
    rawExternalDataPathExposed: false,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false,
    activeRendererCountAfterCleanup: Number(debug.activeRendererCountAfterCleanup ?? 0),
    activeRafCountAfterCleanup: Number(debug.activeRafCountAfterCleanup ?? 0),
    activeCanvasCountAfterCleanup: Number(debug.activeCanvasCountAfterCleanup ?? 0)
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

async function downloadBenchmarkBundle(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-action="env-studio-export-benchmark"]').first().click()
  ]);
  const filePath = await download.path();
  const text = await fs.readFile(filePath, 'utf8');
  return {
    filename: download.suggestedFilename(),
    path: filePath,
    data: JSON.parse(text)
  };
}
