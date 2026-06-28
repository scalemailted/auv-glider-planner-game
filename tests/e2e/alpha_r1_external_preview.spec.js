import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { startStaticServer } from './static-server.mjs';
import { waitForAnchorAppReady } from './helpers/AnchorRuntimeReadyHarness.js';
import {
  assertContinuousBrowserErrorsClean,
  continuousDiveExecutionSnapshot,
  expectMainMenuSceneIsolation,
  expectWaypointCount,
  openMainMenuHubSection,
  planVisibleThreeTutorialRoute,
  startPlanningFromBriefing
} from './helpers/SmokeSpecShared.js';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';

let server;

test.setTimeout(300000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Alpha First-Run Guided Mission', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/?alphaOnboarding=1');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });

  await expect(page.locator('#main-menu-hub')).toContainText('ANCHOR Alpha');
  await expect(page.locator('#main-menu-hub')).toContainText('Plan. Simulate. Compare. Learn.');
  await expect(page.locator('#main-menu-hub .main-menu-card')).toHaveCount(4);
  await expect(page.locator('[data-alpha-onboarding-modal]')).toBeVisible();
  await expect(page.locator('[data-alpha-onboarding-modal]')).toContainText('Play a Guided Mission');

  await page.locator('[data-alpha-onboarding-modal] [data-action="alpha-guided-mission"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('MissionBriefingScene')?.sys?.isActive?.() ?? false), { timeout: 15000 }).toBe(true);

  await startPlanningFromBriefing(page);
  await planVisibleThreeTutorialRoute(page);
  await expectWaypointCount(page, 3);
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="thermoclineDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="thermocline"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentDiveProfileId), { timeout: 10000 }).toBe('thermoclineDive');

  const executeButton = page.locator('#mission-console [data-action="execute"]');
  await expect(executeButton).toBeVisible();
  await expect(executeButton).toBeEnabled();
  await executeButton.click();
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene')?.sys?.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);

  const beforeDive = await continuousDiveExecutionSnapshot(page);
  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => continuousDiveExecutionSnapshot(page).then((snapshot) => snapshot.maxDepthMeters > beforeDive.maxDepthMeters), { timeout: 20000 }).toBe(true);
  await page.locator('#mission-console [data-action="pause"]').click();
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame?.state?.result && window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount === 1), { timeout: 30000 }).toBe(true);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect(page.locator('#debrief-root')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#debrief-root')).toContainText(/Mission Results|Score/i);

  await page.locator('#mission-console [data-action="menu"]').filter({ hasText: 'Main Menu' }).first().click();
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await expectMainMenuSceneIsolation(page);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Alpha Researcher Quick Start', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await openMainMenuHubSection(page, 'simulation');
  await page.locator('#main-menu-hub [data-hub-view="alpha-research"]').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="alpha-research"]')).toBeVisible();
  await expect(page.locator('#main-menu-hub')).toContainText('Researcher Quick Start');
  await expect(page.locator('#main-menu-hub')).toContainText('FORECAST_ONLY');
  await expect(page.locator('#main-menu-hub')).toContainText('Local Python Execution');
  await expect(page.locator('#main-menu-hub')).toContainText('Google Colab Hosting Smoke: PENDING');
  await expect(page.locator('#main-menu-hub')).toContainText('Official A* score 23.593559');
  await expect(page.locator('#main-menu-hub')).toContainText('The notebook proposes plans. ANCHOR validates, simulates, and scores them.');
  await expect(page.locator('#main-menu-hub')).toContainText('Users do not need to download the full ANCHOR source repository for normal Alpha use.');

  const launchpad = page.locator('[data-alpha-notebook-launchpad]');
  await expect(launchpad).toBeVisible();
  await expect(launchpad).toContainText('External Solver Notebook');
  await expect(launchpad).toContainText('Open Full Notebook in Google Colab');
  await expect(launchpad).toContainText('A public GitHub notebook URL is required for one-click Colab launch.');
  await expect(launchpad).toContainText('Download Full Benchmark Notebook');
  await expect(launchpad).toContainText('Download Starter Notebook');
  await expect(launchpad).toContainText('Download Public Benchmark Bundle');
  await expect(launchpad).toContainText('Copy Notebook Data URL');
  await expect(launchpad).toContainText('Copy Local Finalizer Command');
  await expect(launchpad).toContainText('anchor.classical-planner-benchmark-bundle');
  await expect(launchpad).toContainText('containsHiddenTruth');
  await expect(launchpad).toContainText('false');
  await expect(launchpad).toContainText('FORECAST_ONLY');
  await expect(launchpad.locator('a[download]').filter({ hasText: 'Download Full Benchmark Notebook' })).toHaveAttribute('href', /anchor_classical_planner_benchmark\.ipynb/);
  await expect(launchpad.locator('a[download]').filter({ hasText: 'Download Starter Notebook' })).toHaveAttribute('href', /anchor_external_solver_template\.ipynb/);
  await expect(launchpad.locator('a[download]').filter({ hasText: 'Download Public Benchmark Bundle' })).toHaveAttribute('href', /static_additive_routing\.classical-planner-benchmark-bundle\.json/);

  const paths = [
    'tools/python/notebooks/anchor_external_solver_template.ipynb',
    'tools/python/notebooks/anchor_classical_planner_benchmark.ipynb',
    'tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json',
    'tests/fixtures/colab_benchmark/plans/static_additive_astar.anchor.plan.json',
    'alpha/release-manifest.json',
    'alpha/feedback-ledger.json'
  ];
  const fetchResults = await page.evaluate(async (items) => Promise.all(items.map(async (path) => {
    const response = await fetch(path);
    const text = await response.text();
    return { path, status: response.status, bytes: text.length, text };
  })), paths);
  for (const result of fetchResults) {
    expect(result.status, result.path).toBe(200);
    expect(result.bytes, result.path).toBeGreaterThan(100);
  }
  expect(fetchResults.find((item) => item.path.endsWith('release-manifest.json')).text).toContain('"googleColabHostingSmoke": "PENDING"');
  expect(fetchResults.find((item) => item.path.endsWith('feedback-ledger.json')).text).toContain('"ALPHA-FB-002"');
  expect(fetchResults.find((item) => item.path.endsWith('classical-planner-benchmark-bundle.json')).text).toContain('"containsHiddenTruth": false');
  expect(fetchResults.find((item) => item.path.endsWith('classical-planner-benchmark-bundle.json')).text).not.toContain('T_hiddenTruth');
});

test('Alpha Feedback Diagnostics and Error Recovery', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await page.locator('#main-menu-hub [data-hub-view="alpha-feedback"]').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="alpha-feedback"]')).toBeVisible();

  await page.locator('[name="category"]').selectOption('Scientific Concern');
  await page.locator('[name="severity"]').selectOption('Moderate');
  await page.locator('[name="title"]').fill('Alpha diagnostic smoke');
  await page.locator('[name="observedBehavior"]').fill('Observed behavior is recorded for the smoke package.');
  await page.locator('[name="expectedBehavior"]').fill('Expected behavior is recorded for the smoke package.');
  await page.locator('[name="reproductionSteps"]').fill('Open Product Hub, open Feedback & Diagnostics, export package.');
  await page.locator('[name="optionalNotes"]').fill('No automatic telemetry should be sent.');

  const [feedbackDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#main-menu-hub [data-action="alpha-download-feedback"]').click()
  ]);
  const feedbackText = await fs.readFile(await feedbackDownload.path(), 'utf8');
  const feedback = JSON.parse(feedbackText);
  expect(feedback.artifactType).toBe('anchor.alpha-diagnostic-bundle');
  expect(feedback.release.releaseId).toBe('alpha-r1-external-research-education-preview');
  expect(feedback.safeContext.identities.validationBaselineDigest).toBe('fnv1a32:dd016175');
  expect(feedback.privacy.hiddenTruthIncluded).toBe(false);
  expect(feedback.privacy.oracleFieldsIncluded).toBe(false);
  expect(feedback.privacy.automaticallyTransmitted).toBe(false);
  expect(feedbackText).not.toMatch(/T_hiddenTruth|"oracleFields"\s*:|"localStorage"\s*:|"clipboard"\s*:|"cookie"\s*:/i);

  await page.locator('#main-menu-hub [data-action="alpha-trigger-error"]').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="alpha-error"]')).toBeVisible();
  await expect(page.locator('#main-menu-hub')).toContainText('Alpha Error Recovery');
  await expect(page.locator('#main-menu-hub')).toContainText('No blank screen');
  const [diagnosticDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#main-menu-hub [data-action="alpha-download-diagnostics"]').click()
  ]);
  const diagnostic = JSON.parse(await fs.readFile(await diagnosticDownload.path(), 'utf8'));
  expect(diagnostic.error.code).toBe('ALPHA_PREVIEW_ERROR');
  expect(diagnostic.privacy.hiddenTruthIncluded).toBe(false);
  await page.locator('#main-menu-hub [data-action="alpha-recover-main"]').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="home"]')).toBeVisible();
});

test('Alpha Pages and Compact Layout', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/auv-glider-planner-game/?alphaOnboarding=1');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await expect(page.locator('#main-menu-hub')).toContainText('ANCHOR Alpha');
  await expect(page.locator('[data-alpha-onboarding-modal]')).toBeVisible();
  await page.locator('[data-alpha-onboarding-modal] [data-action="alpha-explore-free"]').click();
  await expect(page.locator('[data-alpha-onboarding-modal]')).toHaveCount(0);
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).resolves.toBe(true);

  const subpathFetch = await page.evaluate(async () => {
    const paths = [
      '/auv-glider-planner-game/alpha/release-manifest.json',
      '/auv-glider-planner-game/alpha/scenario-catalog.json',
      '/auv-glider-planner-game/alpha/feedback-ledger.json',
      '/auv-glider-planner-game/docs/alpha_release.md',
      '/auv-glider-planner-game/tools/python/notebooks/anchor_classical_planner_benchmark.ipynb',
      '/auv-glider-planner-game/tools/python/notebooks/anchor_external_solver_template.ipynb',
      '/auv-glider-planner-game/tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json'
    ];
    return Promise.all(paths.map(async (path) => {
      const response = await fetch(path);
      const text = await response.text();
      return { path, status: response.status, bytes: text.length, text };
    }));
  });
  for (const result of subpathFetch) {
    expect(result.status, result.path).toBe(200);
    expect(result.bytes, result.path).toBeGreaterThan(100);
  }
  expect(subpathFetch.find((item) => item.path.endsWith('release-manifest.json')).text).toContain('fnv1a32:98528bc1');

  await page.locator('#main-menu-hub [data-action="methods-validation"]').first().click();
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('MethodsValidationScene')?.sys?.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
});
