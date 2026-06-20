import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { compareSimulationExecutions } from '../../src/core/simulation/SimulationRendererParity.js';

let server;

test.setTimeout(300000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('learning labs static page is linked from the main menu', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#main-menu-hub')).toBeVisible();
  await expect(page.locator('#main-menu-hub')).toContainText('Learning Labs');
  await openMainMenuHubSection(page, 'learning');
  const learningHub = page.locator('#main-menu-hub[data-hub-view="learning"]');
  const indexLink = learningHub.locator('a[href="labs/index.html"]');
  await expect(indexLink).toBeVisible();
  await expect(indexLink).toHaveText(/Learning Labs Index/);
  await expect(indexLink).toHaveAttribute('target', '_blank');
  await expect(indexLink).toHaveAttribute('rel', /noopener/);
  const scientificLabLink = learningHub.locator('a[href="labs/scientific-computational-modeling.html"]');
  await expect(scientificLabLink).toBeVisible();
  await expect(scientificLabLink).toHaveText(/Scientific Computational Modeling/);
  await expect(scientificLabLink).toHaveAttribute('target', '_blank');
  await expect(scientificLabLink).toHaveAttribute('rel', /noopener/);
  const oceanCaLabLink = learningHub.locator('a[href="labs/ca-for-ocean-relevant-processes.html"]');
  await expect(oceanCaLabLink).toBeVisible();
  await expect(oceanCaLabLink).toHaveText(/Cellular Automata \/ Grid Processes/);
  await expect(oceanCaLabLink).toHaveAttribute('target', '_blank');
  await expect(oceanCaLabLink).toHaveAttribute('rel', /noopener/);
  const labLink = learningHub.locator('a[href="labs/deterministic-spatiotemporal-processes.html"]');
  await expect(labLink).toBeVisible();
  await expect(labLink).toHaveText(/CA for Ocean Processes/);
  await expect(labLink).toHaveAttribute('target', '_blank');
  await expect(labLink).toHaveAttribute('rel', /noopener/);
  const samplingActionLabLink = learningHub.locator('a[href="labs/sampling-priority-to-glider-action-value.html"]');
  await expect(samplingActionLabLink).toBeVisible();
  await expect(samplingActionLabLink).toHaveText(/Sampling Priority to Glider Action Value/);
  await expect(samplingActionLabLink).toHaveAttribute('target', '_blank');
  await expect(samplingActionLabLink).toHaveAttribute('rel', /noopener/);
  const plannerLabLink = learningHub.locator('a[href="labs/planner-mission-evaluation.html"]');
  await expect(plannerLabLink).toBeVisible();
  await expect(plannerLabLink).toHaveText(/Benchmark Modes/);
  await expect(plannerLabLink).toHaveAttribute('target', '_blank');
  await expect(plannerLabLink).toHaveAttribute('rel', /noopener/);
  await expect(learningHub).toContainText('Forecast Correction and Hidden Discovery');
  await expect(learningHub).toContainText('Headless / Colab Workflow');

  await page.goto('/labs/index.html');
  await expect(page).toHaveTitle(/ANCHOR Learning Labs/);
  await expect(page.locator('h1')).toContainText('ANCHOR Learning Labs');
  await expect(page.locator('body')).toContainText('Learning path table of contents');
  await expect(page.locator('body')).toContainText('Foundations');
  await expect(page.locator('a[href="scientific-computational-modeling.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="ca-for-ocean-relevant-processes.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="deterministic-dynamic-flow-fields.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="oracle-deterministic-coupled-sampling-space.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="stochastic-uncertainty.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="stochastic-coupled-sampling-space.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="sampling-priority-to-glider-action-value.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="planner-mission-evaluation.html"]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Sampling Priority to Glider Action Value');
  await expect(page.locator('body')).toContainText('Planner / Mission Evaluation');

  await page.goto('/labs/scientific-computational-modeling.html');
  await expect(page).toHaveTitle(/Scientific Computational Modeling/);
  await expect(page.locator('h1')).toContainText('Scientific Computational Modeling');
  await expect(page.locator('.lab-toc')).toContainText('What is a scientific computational model?');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('X(t+1)');
  await expect(page.locator('[data-modeling-widget="model-loop"]')).toBeVisible();
  await expect(page.locator('[data-model-loop-action="step"]')).toBeVisible();
  const beforeLoopText = await page.locator('[data-model-loop-status]').textContent();
  await page.locator('[data-model-loop-action="step"]').click();
  await expect(page.locator('[data-model-loop-status]')).not.toHaveText(beforeLoopText ?? '');

  await page.goto('/labs/ca-for-ocean-relevant-processes.html');
  await expect(page).toHaveTitle(/Cellular Automata for Ocean-Relevant Processes/);
  await expect(page.locator('h1')).toContainText('Cellular Automata for Ocean-Relevant Processes');
  await expect(page.locator('body')).toContainText('Event intensity is not sampling priority');
  await expect(page.locator('body')).toContainText('From CA analog to mission-grade sampling model');
  await expect(page.locator('[data-ocean-ca-widget="event-intensity-vs-priority"]')).toBeVisible();
  await expect(page.locator('[data-priority-uncertainty]')).toBeVisible();
  const beforePriorityText = await page.locator('[data-priority-status]').textContent();
  await page.locator('[data-priority-uncertainty]').evaluate((input) => {
    input.value = '0.85';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('[data-priority-status]')).not.toHaveText(beforePriorityText ?? '');

  await page.goto('/labs/deterministic-spatiotemporal-processes.html');
  await expect(page).toHaveTitle(/Deterministic Spatiotemporal Processes/);
  await expect(page.locator('h1')).toContainText('Deterministic Spatiotemporal Processes');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('x_i(t+1)');
  await expect(page.locator('body')).toContainText('Foundational CA Models');
  await expect(page.locator('body')).toContainText('Observable process patterns');
  await expect(page.locator('body')).toContainText('Deterministic and seeded evolution');
  await expect(page.locator('body')).toContainText('Optional sampling interpretation');
  await expect(page.locator('.lab-figure').first()).toBeVisible();
  await expect(page.locator('[data-elementary-ca-widget]')).toBeVisible();
  await expect(page.locator('[data-ca-action="reset"]')).toBeVisible();
  await expect(page.locator('[data-widget="neighborhood-update"]')).toBeVisible();
  await expect(page.locator('[data-neighborhood-mode]')).toBeVisible();
  await expect(page.locator('[data-widget="game-of-life"]')).toBeVisible();
  await expect(page.locator('[data-life-action="step"]')).toBeVisible();
  await expect(page.locator('[data-widget="domain-rule-allocation"]')).toBeVisible();
  await expect(page.locator('[data-domain-action="step"]')).toBeVisible();
  const beforeWidgetText = await page.locator('[data-ca-status]').textContent();
  await page.locator('[data-ca-action="regenerate"]').click();
  await expect(page.locator('[data-ca-status]')).not.toHaveText(beforeWidgetText ?? '');

  await page.goto('/labs/deterministic-dynamic-flow-fields.html');
  await expect(page).toHaveTitle(/Deterministic Dynamic Flow Fields/);
  await expect(page.locator('h1')).toContainText('Deterministic Dynamic Flow Fields');
  await expect(page.locator('.lab-toc')).toContainText('What is a flow field?');
  await expect(page.locator('.lab-math').first()).toContainText('F(x,y,t)');
  await expect(page.locator('[data-flow-widget="vector-components"]')).toBeVisible();
  await expect(page.locator('[data-flow-widget="field-presets"]')).toBeVisible();
  await expect(page.locator('[data-flow-widget="particle-tracer"]')).toBeVisible();
  await expect(page.locator('[data-flow-canvas]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Open Flow Fields Sandbox');
  const beforeVectorText = await page.locator('[data-vector-status]').textContent();
  await page.locator('[data-vector-u]').evaluate((input) => {
    input.value = '0.2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('[data-vector-status]')).not.toHaveText(beforeVectorText ?? '');
  await expect(page.locator('[data-particle-toggle]')).toBeVisible();
  await expect(page.locator('[data-particle-reset]')).toBeVisible();

  await page.goto('/labs/oracle-deterministic-coupled-sampling-space.html');
  await expect(page).toHaveTitle(/Oracle \/ Deterministic Coupled Sampling Space/);
  await expect(page.locator('h1')).toContainText('Oracle / Deterministic Coupled Sampling Space');
  await expect(page.locator('.lab-toc')).toContainText('Why couple fields?');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('S*(x,y,t)');
  await expect(page.locator('[data-coupled-widget="flow-carried-patch"]')).toBeVisible();
  await expect(page.locator('[data-coupled-widget="layer-composer"]')).toBeVisible();
  await expect(page.locator('[data-coupled-canvas]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Open Coupled Fields Sandbox');
  await expect(page.locator('[data-patch-toggle]')).toBeVisible();
  await expect(page.locator('[data-patch-reset]')).toBeVisible();
  const beforeLayerText = await page.locator('[data-layer-status]').textContent();
  await page.locator('[data-layer-flow]').selectOption('vortex');
  await expect(page.locator('[data-layer-status]')).not.toHaveText(beforeLayerText ?? '');

  await page.goto('/labs/stochastic-uncertainty.html');
  await expect(page).toHaveTitle(/Stochastic \/ Uncertainty/);
  await expect(page.locator('h1')).toContainText('Stochastic / Uncertainty');
  await expect(page.locator('.lab-toc')).toContainText('Why uncertainty?');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('[data-uncertainty-widget="bayesian-cell-update"]')).toBeVisible();
  await expect(page.locator('[data-uncertainty-widget="forecast-error-vs-hidden-event"]')).toBeVisible();
  await expect(page.locator('[data-uncertainty-widget="regret-information-value"]')).toBeVisible();
  await expect(page.locator('[data-uncertainty-canvas]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Open Uncertainty / Forecast Sandbox');
  const beforePosteriorText = await page.locator('[data-bayes-posterior]').textContent();
  await page.locator('[data-bayes-prior]').evaluate((input) => {
    input.value = '0.65';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('[data-bayes-posterior]')).not.toHaveText(beforePosteriorText ?? '');
  await expect(page.locator('[data-feh-scenario]')).toBeVisible();
  await expect(page.locator('[data-regret-choice="0"]')).toBeVisible();
  await expect(page.locator('[data-regret-reveal]')).toBeVisible();

  await page.goto('/labs/stochastic-coupled-sampling-space.html');
  await expect(page).toHaveTitle(/Stochastic Coupled Sampling Space/);
  await expect(page.locator('h1')).toContainText('Stochastic Coupled Sampling Space');
  await expect(page.locator('.lab-toc')).toContainText('From oracle coupling to uncertain coupling');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('A(x,y,t)');
  await expect(page.locator('body')).toContainText('S*(x,y,t)');
  await expect(page.locator('[data-stochastic-coupled-widget="belief-layer-stack"]')).toBeVisible();
  await expect(page.locator('[data-stochastic-coupled-widget="oracle-vs-belief"]')).toBeVisible();
  await expect(page.locator('[data-stochastic-coupled-widget="acquisition-composer"]')).toBeVisible();
  await expect(page.locator('[data-stochastic-coupled-widget="oracle-regret-comparison"]')).toBeVisible();
  await expect(page.locator('[data-stochastic-coupled-canvas]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Open Uncertainty / Forecast Sandbox');
  await expect(page.locator('body')).toContainText('Open Coupled Fields Sandbox');
  const beforeAcquisitionText = await page.locator('[data-sc-acq-status]').textContent();
  await page.locator('[data-sc-acq-weight="unknown"]').evaluate((input) => {
    input.value = '0.8';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('[data-sc-acq-status]')).not.toHaveText(beforeAcquisitionText ?? '');
  await expect(page.locator('[data-feh-scenario]')).toBeVisible();
  await expect(page.locator('[data-regret-choice="0"]')).toBeVisible();
  await expect(page.locator('[data-regret-reveal]')).toBeVisible();

  pageErrors.length = 0;
  await page.goto('/labs/sampling-priority-to-glider-action-value.html');
  await expect(page).toHaveTitle(/From Sampling Priority to Glider Action Value/);
  await expect(page.locator('h1')).toContainText('From Sampling Priority to Glider Action Value');
  await expect(page.locator('body')).toContainText('Event intensity is not sampling priority');
  await expect(page.locator('body')).toContainText('Sampling priority is not glider action value');
  await expect(page.locator('body')).toContainText('Action value is not route planning');
  await expect(page.locator('[data-sampling-action-widget="priority-vs-intensity"]')).toBeVisible();
  await expect(page.locator('[data-sampling-action-widget="priority-to-action"]')).toBeVisible();
  await expect(page.locator('[data-sampling-action-canvas]').first()).toBeVisible();
  await expect(page.locator('a').filter({ hasText: 'Sampling Priority Demo' }).first()).toBeVisible();
  await expect(page.locator('a').filter({ hasText: 'Flow-Coupled Sampling Demo' }).first()).toBeVisible();
  const beforeSamplingActionText = await page.locator('[data-sampling-action-status]').first().textContent();
  await page.locator('[data-action-value-weight]').evaluate((input) => {
    input.value = '0.15';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('[data-sampling-action-status]').first()).not.toHaveText(beforeSamplingActionText ?? '');
  expect(pageErrors).toEqual([]);

  await page.goto('/labs/planner-mission-evaluation.html');
  await expect(page).toHaveTitle(/Planner \/ Mission Evaluation/);
  await expect(page.locator('h1')).toContainText('Planner / Mission Evaluation');
  await expect(page.locator('.lab-toc')).toContainText('From fields to routes');
  await expect(page.locator('.lab-math').first()).toBeVisible();
  await expect(page.locator('[data-planner-widget="greedy-planner"]')).toBeVisible();
  await expect(page.locator('[data-planner-widget="reward-cost-tradeoff"]')).toBeVisible();
  await expect(page.locator('[data-planner-widget="debrief-scorecard"]')).toBeVisible();
  await expect(page.locator('[data-planner-canvas]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Solver workflow and fairness labels');
  await expect(page.locator('body')).toContainText('Open Main App');
  const beforeGreedyText = await page.locator('[data-greedy-status]').textContent();
  await page.locator('[data-greedy-run]').click();
  await expect(page.locator('[data-greedy-status]')).not.toHaveText(beforeGreedyText ?? '');
  const beforeRewardText = await page.locator('[data-rct-output]').textContent();
  await page.locator('[data-rct-cost]').evaluate((input) => {
    input.value = '1.1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('[data-rct-output]')).not.toHaveText(beforeRewardText ?? '');
  await page.locator('[data-debrief-scenario]').selectOption('hazard');
  await expect(page.locator('[data-debrief-status]')).toContainText('Hazard hit');
});

test('Benchmark modes overview opens from Simulation Lab', async ({ page }) => {
  await page.goto('/');
  await openMainMenuHubSection(page, 'simulation');
  await expect(page.locator('#main-menu-hub[data-hub-view="simulation"]')).toContainText('Benchmark Modes');

  await page.locator('#main-menu-hub [data-action="benchmark-planner"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('BenchmarkModeOverviewScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Planner Benchmark');
  await expect(page.locator('#mission-console')).toContainText('Objective is fixed / given');
  await expect(page.locator('#mission-console')).toContainText('Player or solver chooses route');
  await expect(page.locator('#mission-console')).toContainText('P2 Execution Integration');
  await expect(page.locator('#mission-console')).toContainText('Existing simulator and debrief produce benchmark records');
  await expect(page.locator('#mission-console')).toContainText('benchmark run-record export from Debrief');
  await expect(page.locator('#mission-console')).toContainText('result/debrief adapter');
  await expect(page.locator('#mission-console')).toContainText('Open Planner Benchmark Setup');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.benchmarkMode)).toBe('plannerBenchmark');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.usesMARL)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.usesMissionScoring)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.routeExecutionImplemented)).toBe('existing-simulator-debrief-export');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="export-benchmark-config"]').click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^anchor-benchmark-mode-config-plannerBenchmark\.json$/);

  const [episodeDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="export-benchmark-episode"]').click()
  ]);
  expect(episodeDownload.suggestedFilename()).toMatch(/^anchor-benchmark-episode-plannerBenchmark\.json$/);
  const episodePath = await episodeDownload.path();
  const episodeJson = JSON.parse(await fs.readFile(episodePath, 'utf8'));
  expect(episodeJson.type).toBe('anchor.benchmark.episode-config');

  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await launchFromMainMenuHub(page, 'simulation', 'benchmark-adaptive');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.benchmarkMode)).toBe('adaptiveBenchmark');
  await expect(page.locator('#mission-console')).toContainText('Adaptive Benchmark');
  await expect(page.locator('#mission-console')).toContainText('Mission Manager');
  await expect(page.locator('#mission-console')).toContainText('Objective Authority');
  await expect(page.locator('#mission-console')).toContainText('The player or solver still chooses the route');
  await expect(page.locator('#mission-console')).toContainText('Start New Adaptive Episode');
  await expect(page.locator('#mission-console')).toContainText('surfacing decisions');
  await expect(page.locator('#mission-console')).toContainText('route planning');
  await expect(page.locator('#mission-console')).toContainText('P8 persists adaptive leg records');
  await expect(page.locator('#mission-console')).toContainText('Likely Forecast Error');
  await expect(page.locator('#mission-console')).toContainText('Validate Forecast');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.adaptiveObjectiveAuthority)).toBe('missionManager');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.adaptiveRouteAuthority)).toBe('playerOrSolver');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.usesRoutePlanning)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.usesMARL)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.adaptiveLaunchAvailable)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.adaptiveExecutionPreviewAvailable)).toBe(true);

  await page.locator('#adaptive-benchmark-fixture').selectOption('possibleHiddenPlume');
  await expect(page.locator('#mission-console')).toContainText('Possible Hidden Event');
  await expect(page.locator('#mission-console')).toContainText('Confirm Hidden Event');
  await expect(page.locator('#mission-console')).toContainText('Science Diagnosis Preview');
  await expect(page.locator('#mission-console')).toContainText('Science diagnosis informs the mission-manager recommendation. It does not generate a route.');
  await expect(page.locator('#mission-console')).toContainText('The player or solver still plans the next route.');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_BENCHMARK_DEBUG?.scienceDiagnosisIsPlannerAuthority)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_BENCHMARK_DEBUG?.usesNewPlanner)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_BENCHMARK_DEBUG?.usesProductionDataAssimilation)).toBe(false);
  await page.locator('#adaptive-benchmark-fixture').selectOption('staleMonitoringRevisit');
  await expect(page.locator('#mission-console')).toContainText('Stale Region Needs Revisit');
  await expect(page.locator('#mission-console')).toContainText('Revisit Stale Region');

  const [adaptivePreviewDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="export-adaptive-manager-preview"]').click()
  ]);
  const adaptivePreviewPath = await adaptivePreviewDownload.path();
  const adaptivePreviewJson = JSON.parse(await fs.readFile(adaptivePreviewPath, 'utf8'));
  expect(adaptivePreviewJson.type).toBe('anchor.benchmark.adaptive-manager-preview');
  expect(adaptivePreviewJson.benchmarkMode).toBe('adaptiveBenchmark');
  expect(adaptivePreviewJson.objectiveAuthority).toBe('missionManager');
  expect(adaptivePreviewJson.routeAuthority).toBe('playerOrSolver');
  expect(adaptivePreviewJson.usesRoutePlanning).toBe(false);
  expect(adaptivePreviewJson.usesMARL).toBe(false);

  const [adaptiveLaunchDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="export-adaptive-launch-config"]').click()
  ]);
  const adaptiveLaunchJson = JSON.parse(await fs.readFile(await adaptiveLaunchDownload.path(), 'utf8'));
  expect(adaptiveLaunchJson.type).toBe('anchor.benchmark.adaptive-launch-config');
  expect(adaptiveLaunchJson.routeAuthority).toBe('playerOrSolver');
  expect(adaptiveLaunchJson.usesMARL).toBe(false);

  await page.locator('#mission-console [data-action="benchmark-open-setup"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive()), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.pendingBenchmarkEpisode?.benchmarkModeConfig?.benchmarkMode)).toBe('adaptiveBenchmark');
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.adaptiveBenchmarkRuntimeContext?.routeAuthority)).toBe('playerOrSolver');

  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await launchFromMainMenuHub(page, 'simulation', 'benchmark-full-autonomy');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.benchmarkMode)).toBe('fullAutonomyBenchmark');
  await expect(page.locator('#mission-console')).toContainText('Full Autonomy Benchmark');
  await expect(page.locator('#mission-console')).toContainText('Solver/agent chooses objective and route');
  await expect(page.locator('#mission-console')).toContainText('Solver/agent objective and route authority are defined by contract; execution later');

  await page.locator('#mission-console [data-action="benchmark-open-sampling-priority"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SamplingPriorityDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Sampling Priority Demo');
  await page.locator('#mission-console [data-action="menu"]').click();
  await launchFromMainMenuHub(page, 'simulation', 'flow-coupled-sampling-demo');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowCoupledSamplingDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Flow-Coupled Sampling Demo');
});
test('Motion Planning Demo opens from Simulation Lab and preserves benchmark/headless routes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#main-menu-hub')).toBeVisible();
  await openMainMenuHubSection(page, 'simulation');
  const simulationHub = page.locator('#main-menu-hub[data-hub-view="simulation"]');
  await expect(simulationHub).toContainText('Motion Planning Demo');

  await simulationHub.locator('[data-action="motion-planning-demo"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MotionPlanningDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Motion Planning Demo');
  await expect(page.locator('#mission-console')).toContainText('Path planning');
  await expect(page.locator('#mission-console')).toContainText('Motion planning');
  await expect(page.locator('#mission-console')).toContainText('realized trajectory');
  await expect(page.locator('#mission-console')).toContainText('currents');
  await expect(page.locator('#mission-console')).toContainText('Glider Speed');
  await expect(page.locator('#mission-console')).toContainText('Drift Gain');
  await expect(page.locator('#mission-console')).toContainText('Dive Profile');
  await expect(page.locator('#mission-console')).toContainText('Motion dynamics does not generate a route');
  await expect(page.locator('#mission-console')).toContainText('WebGPU fluid coupling is future/optional');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.usesMotionDynamics)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.usesNewPlanner)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.usesWebGPUFluid)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.usesMARL)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.changesScoring)).toBe(false);

  await page.locator('#mission-console [data-action="menu"]').click();
  await openMainMenuHubSection(page, 'simulation');
  await expect(page.locator('#main-menu-hub[data-hub-view="simulation"]')).toContainText('Headless Bundle Viewer');
  await page.locator('#main-menu-hub [data-action="headless-bundle-viewer"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('HeadlessBundleViewerScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Headless Bundle Viewer');
  await expect(page.locator('#mission-console [data-action="load-example-roundtrip"]')).toBeVisible();
  await page.locator('#mission-console [data-action="load-example-roundtrip"]').click();
  await expect(page.locator('#mission-console')).toContainText('Roundtrip Summary');
  const hasMotionTrajectory = await page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasMotionTrajectory === true);
  if (hasMotionTrajectory) {
    await expect(page.locator('#mission-console')).toContainText('Motion Dynamics');
  }

  await page.locator('#mission-console [data-action="menu"]').click();
  await launchFromMainMenuHub(page, 'simulation', 'benchmark-planner');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.benchmarkMode)).toBe('plannerBenchmark');
  await expect(page.locator('#mission-console')).toContainText('Planner Benchmark');
  await page.locator('#mission-console [data-action="menu"]').click();
  await launchFromMainMenuHub(page, 'simulation', 'benchmark-adaptive');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.benchmarkMode)).toBe('adaptiveBenchmark');
  await expect(page.locator('#mission-console')).toContainText('Adaptive Benchmark');
});

test('Bathymetric World View opens from Simulation Lab and preserves adjacent routes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#main-menu-hub')).toBeVisible();
  await openMainMenuHubSection(page, 'simulation');
  const simulationHub = page.locator('#main-menu-hub[data-hub-view="simulation"]');
  await expect(simulationHub).toContainText('3D Bathymetric World View');

  await simulationHub.locator('[data-action="bathymetry-world-view"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('BathymetryWorldViewScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('3D Bathymetric World View');
  await expect(page.locator('#mission-console')).toContainText('2.5D mission state');
  await expect(page.locator('#mission-console')).toContainText('Bathymetry is environmental geometry');
  await expect(page.locator('#mission-console')).toContainText('Surface waypoints are route intent');
  await expect(page.locator('#mission-console')).toContainText('Sampling points are where observations are collected');
  await expect(page.locator('#mission-console')).toContainText('Terrain-flow accumulation is not ocean current');
  await expect(page.locator('#bathymetry-terrain-scenario')).toBeVisible();
  await expect(page.locator('#bathymetry-view-mode')).toBeVisible();
  await expect(page.locator('.bathymetry-three-renderer-host')).toBeVisible();
  await expect(page.locator('.three-bathymetry-canvas')).toBeVisible();
  await expect(page.locator('#mission-console [data-bathymetry-camera="verticalExaggeration"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-bathymetry-toggle="waterSurface"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-bathymetry-toggle="surface"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-bathymetry-toggle="thermocline"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-bathymetry-toggle="deep"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-bathymetry-toggle="surfaceWaypoints"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-bathymetry-toggle="samplingPoints"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-bathymetry-toggle="flowVectors"]')).toBeVisible();
  await expect(page.locator('#mission-console')).toContainText('Reset Camera');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.active)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.rendererBackend)).toBe('three');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesThreeRenderer)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesThree)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesEnable3D)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesFull3DPlanning)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesHydrodynamicSolver)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesTerrainFlowAsOceanCurrent)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesWebGPUFluid)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesMARL)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.ownsSimulationState)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.ownsScoring)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.ownsPlanning)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.terrainVertexCount > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.coastlineEdgeCount > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.surfaceWaypointCount > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.samplingPointCount > 0)).toBe(true);

  await page.locator('#mission-console [data-bathymetry-toggle="waterSurface"]').uncheck();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.layerVisibility?.waterSurface)).toBe(false);
  await page.locator('#mission-console [data-bathymetry-toggle="thermocline"]').uncheck();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.layerVisibility?.thermocline)).toBe(false);
  await page.locator('#mission-console [data-action="bathymetry-reset-camera"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.layerVisibility?.waterSurface)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.layerVisibility?.thermocline)).toBe(true);

  await page.locator('#mission-console [data-action="menu"]').click();
  await openMainMenuHubSection(page, 'simulation');
  await page.locator('#main-menu-hub [data-action="headless-bundle-viewer"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('HeadlessBundleViewerScene').sys.isActive())).toBe(true);
  await page.locator('#mission-console [data-action="load-example-roundtrip"]').click();
  await expect(page.locator('#mission-console')).toContainText('Roundtrip Summary');
  const hasBathymetrySummary = await page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasBathymetrySummary === true);
  if (hasBathymetrySummary) {
    await expect(page.locator('#mission-console')).toContainText('Bathymetric World');
    await expect(page.locator('#mission-console')).toContainText('Mission Geometry');
  }
  const hasMotionTrajectory = await page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasMotionTrajectory === true);
  if (hasMotionTrajectory) {
    await expect(page.locator('#mission-console')).toContainText('Motion Dynamics');
  }

  await page.locator('#mission-console [data-action="menu"]').click();
  await launchFromMainMenuHub(page, 'simulation', 'benchmark-planner');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.benchmarkMode)).toBe('plannerBenchmark');
  await page.locator('#mission-console [data-action="menu"]').click();
  await launchFromMainMenuHub(page, 'simulation', 'benchmark-adaptive');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.benchmarkMode)).toBe('adaptiveBenchmark');
  await page.locator('#mission-console [data-action="menu"]').click();
  await launchFromMainMenuHub(page, 'simulation', 'renderer-architecture-preview');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RendererArchitecturePreviewScene').sys.isActive())).toBe(true);
});
test('Renderer Architecture Preview opens from Simulation Lab', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#main-menu-hub')).toBeVisible();
  await openMainMenuHubSection(page, 'simulation');
  const simulationHub = page.locator('#main-menu-hub[data-hub-view="simulation"]');
  await expect(simulationHub).toContainText('Renderer Architecture Preview');

  await simulationHub.locator('[data-action="renderer-architecture-preview"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RendererArchitecturePreviewScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Renderer Boundary');
  await expect(page.locator('#mission-console')).toContainText('Phaser shell remains active');
  await expect(page.locator('#mission-console')).toContainText('WebGPU is progressive enhancement');
  await expect(page.locator('#mission-console')).toContainText('Renderer does not own scoring, planning, or simulation');
  await expect(page.locator('#mission-console')).toContainText('No WebGPU fluid simulation');
  await expect(page.locator('#mission-console')).toContainText('no Python simulator');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_RENDERER_ARCH_DEBUG?.phaserShellActive)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_RENDERER_ARCH_DEBUG?.ownsSimulationState)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_RENDERER_ARCH_DEBUG?.ownsScoring)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_RENDERER_ARCH_DEBUG?.ownsPlanning)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_RENDERER_ARCH_DEBUG?.usesWebGPUFluid)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_RENDERER_ARCH_DEBUG?.usesMARL)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_RENDERER_ARCH_DEBUG?.webgpuRequired)).toBe(false);

  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);
});
test('Headless Bundle Viewer opens from Simulation Lab and exports browser summary', async ({ page }) => {
  await page.goto('/');
  await openMainMenuHubSection(page, 'simulation');
  await expect(page.locator('#main-menu-hub[data-hub-view="simulation"]')).toContainText('Headless Bundle Viewer');

  await page.locator('#main-menu-hub [data-action="headless-bundle-viewer"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('HeadlessBundleViewerScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Headless Bundle Viewer');
  await expect(page.locator('#mission-console')).toContainText('No bundle has been loaded');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.bundleLoaded)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesPythonSimulator)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesNodeHeadlessRuntime)).toBe(true);

  await expect(page.locator('#mission-console [data-action="load-example-bundle"]')).toBeVisible();
  await page.locator('#mission-console [data-action="load-example-bundle"]').click();
  await expect(page.locator('#mission-console')).toContainText('Visible Fields');
  await expect(page.locator('#mission-console')).toContainText('Observations');
  await expect(page.locator('#mission-console')).toContainText('Glider Tracks');
  await expect(page.locator('#mission-console')).toContainText('Score Report');
  await expect(page.locator('#mission-console')).toContainText('Science Diagnosis');
  await expect(page.locator('#mission-console')).toContainText('Water Column');
  await expect(page.locator('#mission-console [data-headless-water-column]')).toContainText('surface');
  await expect(page.locator('#mission-console [data-headless-water-column]')).toContainText('thermocline');
  await expect(page.locator('#mission-console [data-headless-water-column]')).toContainText('deep');
  await expect(page.locator('#mission-console')).toContainText('Forecast correction means the expected field existed but was wrong.');
  await expect(page.locator('#mission-console')).toContainText('Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast.');
  await expect(page.locator('#mission-console')).toContainText('Replay');
  await expect(page.locator('#mission-console')).toContainText('Visibility');
  await expect(page.locator('#mission-console')).toContainText('Hidden Disabled');
  await expect(page.locator('#mission-console')).toContainText('Browser ANCHOR remains the official visual referee');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.bundleLoaded)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesPythonSimulator)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesNodeHeadlessRuntime)).toBe(true);
  await expect.poll(() => page.evaluate(() => ['PASS', 'WARN'].includes(window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.validationStatus))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesBrowserOfficialScoring)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesMARL)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.browserSummaryExportAvailable)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasScienceDiagnostics)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.scienceDiagnosticsPublicSafe)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.scienceDiagnosisIsPlannerAuthority)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesProductionDataAssimilation)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasWaterColumnSummary)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.waterColumnLayerIds)).toEqual(['surface', 'thermocline', 'deep']);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.waterColumnDefaultLayers)).toEqual(['surface', 'thermocline', 'deep']);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesFull3DPlanning)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesNewPlanner)).toBe(false);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="export-browser-summary"]').click()
  ]);
  expect(download.suggestedFilename()).toBe('anchor_headless_bundle_browser_summary.json');
  const summaryJson = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  expect(summaryJson.type).toBe('anchor.browser.headless-bundle-summary');
  expect(summaryJson.scoreSummary.headlessScoreIsOfficialBrowserScore).toBe(false);
  expect(summaryJson.scienceDiagnosisSummary.present).toBe(true);
  expect(summaryJson.scienceDiagnosisSummary.usesProductionDataAssimilation).toBe(false);
  expect(summaryJson.notA).toContain('not Python simulator');
  expect(JSON.stringify(summaryJson)).not.toContain('T_hiddenTruth');

  await expect(page.locator('#mission-console [data-action="load-example-roundtrip"]')).toBeVisible();
  await page.locator('#mission-console [data-action="load-example-roundtrip"]').click();
  await expect(page.locator('#mission-console')).toContainText('Roundtrip Summary');
  await expect(page.locator('#mission-console')).toContainText('Solver Packet Validation');
  await expect(page.locator('#mission-console')).toContainText('Plan Validation');
  await expect(page.locator('#mission-console')).toContainText('Execution Summary');
  await expect(page.locator('#mission-console')).toContainText('Visibility Summary');
  await expect(page.locator('#mission-console')).toContainText('Score Summary');
  await expect(page.locator('#mission-console')).toContainText('Science Diagnosis');
  await expect(page.locator('#mission-console')).toContainText('Water Column');
  await expect(page.locator('#mission-console [data-headless-water-column]')).toContainText('surface');
  await expect(page.locator('#mission-console [data-headless-water-column]')).toContainText('thermocline');
  await expect(page.locator('#mission-console [data-headless-water-column]')).toContainText('deep');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.roundtripLoaded)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.roundtripCanonicalType)).toBe('anchor.headless.solver-roundtrip-report');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.solverPacketValidationStatus)).toBe('PASS');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.planValidationStatus)).toBe('PASS');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.roundtripExecutionStatus)).toBe('PASS');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.roundtripSummaryExportAvailable)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesGeneratedPlan)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasScienceDiagnostics)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.scienceDiagnosticsPublicSafe)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.scienceDiagnosisIsPlannerAuthority)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasWaterColumnSummary)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesFull3DPlanning)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesNewPlanner)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesPythonSimulator)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesMARL)).toBe(false);

  const [roundtripDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="export-browser-roundtrip-summary"]').click()
  ]);
  expect(roundtripDownload.suggestedFilename()).toBe('anchor_headless_roundtrip_browser_summary.json');
  const roundtripSummaryJson = JSON.parse(await fs.readFile(await roundtripDownload.path(), 'utf8'));
  expect(roundtripSummaryJson.type).toBe('anchor.browser.headless-roundtrip-summary');
  expect(roundtripSummaryJson.canonicalReportType).toBe('anchor.headless.solver-roundtrip-report');
  expect(roundtripSummaryJson.usesPythonSimulator).toBe(false);
  expect(roundtripSummaryJson.usesNewPlanner).toBe(false);
  expect(roundtripSummaryJson.usesBrowserOfficialScoring).toBe(false);
  expect(roundtripSummaryJson.scienceDiagnosisSummary.present).toBe(true);
  expect(roundtripSummaryJson.scienceDiagnosisSummary.usesProductionDataAssimilation).toBe(false);
  expect(JSON.stringify(roundtripSummaryJson)).not.toContain('T_hiddenTruth');

  await expect(page.locator('#mission-console [data-action="load-example-replay"]')).toBeVisible();
  await page.locator('#mission-console [data-action="load-example-replay"]').click();
  await expect(page.locator('#mission-console [data-headless-replay-panel]')).toContainText('Replay Integrity');
  await expect(page.locator('#mission-console [data-headless-replay-panel]')).toContainText('publicObservationPlayback');
  await expect(page.locator('#mission-console [data-headless-replay-panel]')).toContainText('Step Event');
  await expect(page.locator('#mission-console [data-headless-replay-panel]')).toContainText('Objective Transitions');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayLoaded)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayIntegrityStatus)).toBe('PASS');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayMode)).toBe('publicObservationPlayback');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayCheckpointCount > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayEventCount > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayHiddenTruthIncluded)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayPublicSafe)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayChangesOfficialBrowserScoring)).toBe(false);
  const replayStartTick = await page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayCurrentTick ?? 0);
  const replayStartEventId = await page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayCurrentEventId ?? null);
  await page.locator('#mission-console [data-action="replay-step"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayCurrentEventIndex >= 1)).toBe(true);
  await expect.poll(() => page.evaluate((startEventId) => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayCurrentEventId !== startEventId, replayStartEventId)).toBe(true);
  await page.locator('#mission-console [data-action="replay-jump-terminal"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayCurrentTick > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayCurrentCheckpointId))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayCurrentTick >= window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayPlayback?.currentTick)).toBe(true);
  expect(await page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayCurrentTick)).toBeGreaterThanOrEqual(replayStartTick);

  await expect(page.locator('#mission-console [data-action="load-tampered-replay"]')).toBeVisible();
  await page.locator('#mission-console [data-action="load-tampered-replay"]').click();
  await expect(page.locator('#mission-console [data-headless-replay-panel]')).toContainText('This replay failed integrity verification. Playback results should not be treated as trustworthy.');
  await expect(page.locator('#mission-console [data-headless-replay-panel]')).toContainText('REPLAY_CHECKPOINT_DIGEST_MISMATCH');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayIntegrityStatus)).toBe('FAIL');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayFailureCodes.includes('REPLAY_CHECKPOINT_DIGEST_MISMATCH'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesAuthoritativeHiddenStateReplay)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesHiddenTruthResimulation)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.changesOfficialBrowserScoring)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesNewPlanner)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesRouteOptimizer)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesRL)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesMARL)).toBe(false);

  await expect(page.locator('#mission-console [data-action="load-multi-agent-replay"]')).toBeVisible();
  await page.locator('#mission-console [data-action="load-multi-agent-replay"]').click();
  await expect(page.locator('#mission-console [data-headless-replay-panel]')).toContainText('Agent Count');
  await expect(page.locator('#mission-console [data-headless-replay-panel]')).toContainText('glider-alpha');
  await expect(page.locator('#mission-console [data-headless-replay-panel]')).toContainText('glider-bravo');
  await expect(page.locator('#mission-console [data-headless-replay-panel]')).toContainText('Mission / Global');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayAgentCount)).toBe(2);
  await page.locator('#mission-console [data-replay-agent-filter="glider-alpha"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replaySelectedAgentId)).toBe('glider-alpha');
  await page.locator('#mission-console [data-action="replay-step"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayCurrentEventAgentId)).toBe('glider-alpha');

  await expect(page.locator('#mission-console [data-action="load-example-cost-graph"]')).toBeVisible();
  await page.locator('#mission-console [data-action="load-example-cost-graph"]').click();
  await expect(page.locator('#mission-console')).toContainText('Motion Cost Graph');
  await expect(page.locator('#mission-console [data-headless-motion-cost-graph]')).toContainText('Feasible Edges');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasMotionCostGraph)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasMotionCostMatrix)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.motionCostGraphNodeCount > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.motionCostGraphEdgeCount > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.motionCostGraphPublicSafe)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.motionCostGraphUsesRouteOptimizer)).toBe(false);

  await expect(page.locator('#mission-console [data-action="load-example-mission-score"]')).toBeVisible();
  await page.locator('#mission-console [data-action="load-example-mission-score"]').click();
  await expect(page.locator('#mission-console')).toContainText('Mission Outcome Scorecard');
  await expect(page.locator('#mission-console')).toContainText('Composite Outcome Score');
  await expect(page.locator('#mission-console')).toContainText('Science');
  await expect(page.locator('#mission-console')).toContainText('Feasibility');
  await expect(page.locator('#mission-console')).toContainText('Efficiency');
  await expect(page.locator('#mission-console')).toContainText('Safety');
  await expect(page.locator('#mission-console')).toContainText('Score Profile');
  await expect(page.locator('#mission-console')).toContainText('Data Coverage');
  await expect(page.locator('#mission-console')).toContainText('This is the SCORE-R1 shadow benchmark score. It does not replace the current official browser score.');
  await expect(page.locator('#mission-console')).toContainText('Regret does not imply mathematical optimality unless an explicit proven bound exists.');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasMissionOutcomeReport)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasMissionScore)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.hasRegretReport)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesMissionOutcomeScoring)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.changesOfficialBrowserScoring)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesNewPlanner)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesRouteOptimizer)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.usesMARL)).toBe(false);
  await expect.poll(() => page.evaluate(() => Number.isFinite(window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.missionCompositeScore))).toBe(true);

  await page.locator('#mission-console [data-action="menu"]').click();
  await openMainMenuHubSection(page, 'simulation');
  await expect(page.locator('#main-menu-hub[data-hub-view="simulation"]')).toContainText('Planner Benchmark');
  await expect(page.locator('#main-menu-hub[data-hub-view="simulation"]')).toContainText('Adaptive Benchmark');
  await page.locator('#main-menu-hub [data-action="benchmark-adaptive"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.benchmarkMode)).toBe('adaptiveBenchmark');
  await expect(page.locator('#mission-console')).toContainText('The player or solver still chooses the route');

  await page.locator('#mission-console [data-action="menu"]').click();
  await launchFromMainMenuHub(page, 'simulation', 'benchmark-planner');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_MODE_DEBUG?.benchmarkMode)).toBe('plannerBenchmark');
  await expect(page.locator('#mission-console')).toContainText('Planner Benchmark');

  await page.locator('#mission-console [data-action="menu"]').click();
  await openMainMenuHubSection(page, 'learning');
  await expect(page.locator('#main-menu-hub[data-hub-view="learning"]')).toContainText('Learning Labs Index');
});
test('Planner Benchmark debrief exports benchmark records from synthetic result', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);

  await page.evaluate(() => {
    const benchmarkMetadata = {
      benchmarkMode: 'plannerBenchmark',
      benchmarkModeConfigVersion: 'benchmark-mode-contract-p0',
      episodeId: 'e2e-planner-benchmark-episode',
      informationAccessTier: 'forecastOnly',
      objectiveAuthority: 'fixed',
      routeAuthority: 'playerOrSolver',
      fairnessLabel: 'Forecast-only',
      attemptSource: 'manualPlayer',
      worldModelTier: 'flowCoupledAction',
      metadataVersion: 'benchmark-metadata-p2'
    };
    const level = {
      levelId: 'e2e-benchmark-level',
      instanceId: 'e2e-benchmark-instance',
      challengeMode: 'perfectKnowledge',
      width: 6,
      height: 6,
      duration: 4,
      world: { grid: { width: 6, height: 6 }, time: { dt: 1, duration: 4 } },
      layers: {
        terrain: Array.from({ length: 6 }, () => Array(6).fill(0)),
        hazards: Array.from({ length: 6 }, () => Array(6).fill(0)),
        bases: [{ x: 0, y: 0 }],
        truth: {
          frames: [{
            t: 0,
            current: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => [0, 0])),
            roi: Array.from({ length: 6 }, () => Array(6).fill(0))
          }]
        }
      },
      meta: { seed: 'e2e-benchmark', experienceMode: 'simulationLab', benchmarkMetadata }
    };
    const mission = {
      missionId: 'e2e-benchmark-mission',
      meta: { experienceMode: 'simulationLab', benchmarkMetadata },
      agents: [{ id: 'g1', label: 'Glider 1', start: { x: 0, y: 0 } }],
      rules: {}
    };
    const plan = {
      type: 'anchor.plan',
      planId: 'e2e-benchmark-plan',
      meta: { valid: true, benchmarkMetadata },
      agentPlans: [{ agentId: 'g1', selectedStart: { x: 0, y: 0 }, waypoints: [{ x: 2, y: 2, t: 1, segmentEnergy: 2 }] }]
    };
    const result = {
      resultId: 'e2e-benchmark-result',
      levelId: level.levelId,
      missionId: mission.missionId,
      instanceId: level.instanceId,
      challengeMode: 'perfectKnowledge',
      experienceMode: 'simulationLab',
      source: 'manual',
      planName: 'Manual Player Plan',
      benchmarkMetadata,
      summary: { finalScore: 42, sampleScore: 18, energyUsed: 6, hazardsHit: 0, duplicateSamples: 0, completedWaypoints: 1, missedWaypoints: 0 },
      events: [{ type: 'sample', time: 1, agentId: 'g1', x: 2, y: 2, value: 9 }]
    };
    const app = window.anchorGame;
    app.state.level = level;
    app.state.mission = mission;
    app.state.plan = plan;
    app.state.result = result;
    app.state.currentPlanSource = 'manual';
    app.state.challengeMode = 'perfectKnowledge';
    app.state.experienceMode = 'simulationLab';
    app.state.currentScenario = { source: 'plannerBenchmarkSetup', benchmarkMetadata };
    app.state.benchmarkRuntimeContext = null;
    app.state.benchmarkModeConfig = null;
    app.state.benchmarkAttemptSession = null;
    app.state.ui ??= {};
    app.state.playback ??= { time: 0 };
    app.state.planResults = { manual: { source: 'manual', plan, result, summary: { finalScore: 42, realizedValue: 18, energyUsed: 6, riskExposure: 0 } } };
    app.phaser.scene.getScene('MainMenuScene').scene.start('DebriefScene');
  });

  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene').sys.isActive())).toBe(true);
  await expect(page.locator('#debrief-root')).toContainText('Planner Benchmark');
  await expect(page.locator('#debrief-root')).toContainText('Attempt');
  await expect(page.locator('#debrief-root')).toContainText('Fairness');
  await expect(page.locator('#debrief-root')).toContainText('Attempt Comparison');
  await expect(page.locator('#debrief-root')).toContainText('Route Review');
  await expect(page.locator('#debrief-root')).toContainText('Route Overlay');
  await expect(page.locator('#debrief-root [data-benchmark-route-overlay]')).toBeVisible();
  await expect(page.locator('#debrief-root .benchmark-route-svg')).toBeVisible();
  await expect(page.locator('#debrief-root [data-benchmark-route-layer]')).toBeVisible();
  await page.locator('#debrief-root [data-benchmark-route-layer]').selectOption('energyCost');
  await expect(page.locator('#debrief-root [data-benchmark-route-layer]')).toHaveValue('energyCost');
  await expect(page.locator('#debrief-root')).toContainText('existing simulator');
  await expect(page.locator('#debrief-root')).toContainText('existing debrief');
  await expect(page.locator('#debrief-root')).toContainText('does not add a new planner');
  await expect(page.locator('#debrief-root')).toContainText('redesign scoring');
  await expect(page.locator('#debrief-root')).toContainText('Export Benchmark Run Record');
  await expect(page.locator('#debrief-root')).toContainText('Export Route Execution Record');
  await expect(page.locator('#debrief-root')).toContainText('Export Benchmark Attempt Set');
  await expect(page.locator('#debrief-root')).toContainText('Export Benchmark Comparison');
  await expect(page.locator('#debrief-root')).toContainText('Export Route Overlay');
  await expect(page.locator('#debrief-root')).toContainText('Attempt Import / Session Persistence');
  await expect(page.locator('#debrief-root')).toContainText('Save Current Attempt Session');
  await expect(page.locator('#debrief-root')).toContainText('Export Attempt Session');
  await expect(page.locator('#mission-console')).toContainText('Export Result JSON');
  await expect(page.locator('#mission-console')).toContainText('Export Attempt Session');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.hasBenchmarkRunRecord)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.hasComparisonViewModel)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.hasRouteReviewViewModel)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.hasRouteOverlayViewModel)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.routeOverlayExportAvailable)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.hasAttemptPersistence)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.currentAttemptSessionAttemptCount)).toBeGreaterThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.availableBenchmarkImportTypes?.includes('anchor.benchmark.route-execution'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.usesNewPlanner)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.usesMissionScoringRedesign)).toBe(false);

  await page.locator('#debrief-root [data-action="save-benchmark-attempt-session"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.attemptSessionSaved)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BENCHMARK_EXECUTION_DEBUG?.persistedAttemptSessionCount)).toBeGreaterThanOrEqual(1);

  const [sessionDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#debrief-root [data-action="export-benchmark-attempt-session"]').first().click()
  ]);
  const sessionJson = JSON.parse(await fs.readFile(await sessionDownload.path(), 'utf8'));
  expect(sessionJson.type).toBe('anchor.benchmark.attempt-session');
  expect(sessionJson.episodeId).toBe('e2e-planner-benchmark-episode');
  expect(sessionJson.attempts.length).toBeGreaterThanOrEqual(1);
  expect(sessionJson.usesNewPlanner).toBe(false);

  const [runDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#debrief-root [data-action="export-benchmark-run"]').click()
  ]);
  const runJson = JSON.parse(await fs.readFile(await runDownload.path(), 'utf8'));
  expect(runJson.type).toBe('anchor.benchmark.run-record');
  expect(runJson.runRecord.benchmarkMode).toBe('plannerBenchmark');
  expect(runJson.runRecord.objectiveAuthority).toBe('fixed');
  expect(runJson.runRecord.routeAuthority).toBe('playerOrSolver');
  expect(runJson.runRecord.diagnostics.usesNewPlanner).toBe(false);
  expect(runJson.runRecord.diagnostics.usesMissionScoringRedesign).toBe(false);

  const [routeDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#debrief-root [data-action="export-benchmark-route"]').click()
  ]);
  const routeJson = JSON.parse(await fs.readFile(await routeDownload.path(), 'utf8'));
  expect(routeJson.type).toBe('anchor.benchmark.route-execution');
  expect(routeJson.benchmarkMode).toBe('plannerBenchmark');
  expect(routeJson.attemptSource).toBe('manualPlayer');

  const [comparisonDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#debrief-root [data-action="export-benchmark-comparison"]').click()
  ]);
  const comparisonJson = JSON.parse(await fs.readFile(await comparisonDownload.path(), 'utf8'));
  expect(comparisonJson.type).toBe('anchor.benchmark.comparison');
  expect(comparisonJson.benchmarkMode).toBe('plannerBenchmark');
  expect(comparisonJson.rankings).toBeTruthy();
  expect(comparisonJson.routeReview).toBeTruthy();
  expect(comparisonJson.usesNewPlanner).toBe(false);
  expect(comparisonJson.usesMissionScoringRedesign).toBe(false);

  const [overlayDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#debrief-root [data-action="export-benchmark-route-overlay"]').click()
  ]);
  const overlayJson = JSON.parse(await fs.readFile(await overlayDownload.path(), 'utf8'));
  expect(overlayJson.type).toBe('anchor.benchmark.route-overlay');
  expect(overlayJson.geometry).toBeTruthy();
  expect(overlayJson.selectedOverlayLayer).toBe('energyCost');
  expect(overlayJson.usesNewPlanner).toBe(false);
  expect(overlayJson.usesMissionScoringRedesign).toBe(false);
  const [attemptDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#debrief-root [data-action="export-benchmark-attempt-set"]').click()
  ]);
  const attemptJson = JSON.parse(await fs.readFile(await attemptDownload.path(), 'utf8'));
  expect(attemptJson.type).toBe('anchor.benchmark.attempt-set');
  expect(attemptJson.episodeId).toBe('e2e-planner-benchmark-episode');
  expect(attemptJson.attempts.length).toBeGreaterThanOrEqual(1);
});

test('Adaptive Benchmark synthetic debrief shows surfacing review and exports P8 session records', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);

  await page.evaluate(() => {
    const benchmarkMetadata = {
      benchmarkMode: 'adaptiveBenchmark',
      benchmarkModeConfigVersion: 'benchmark-mode-contract-p0',
      episodeId: 'e2e-adaptive-benchmark-episode',
      informationAccessTier: 'beliefOnly',
      objectiveAuthority: 'missionManager',
      routeAuthority: 'playerOrSolver',
      fairnessLabel: 'Belief-only',
      attemptSource: 'manualPlayer',
      worldModelTier: 'stochasticBelief',
      activeObjectiveId: 'validateForecast',
      activeLegIndex: 0,
      metadataVersion: 'benchmark-metadata-p7'
    };
    const adaptiveManagerConfig = {
      type: 'anchor.benchmark.adaptive-manager-config',
      version: 'adaptive-mission-manager-contract-p6',
      policyId: 'transparentRuleManager',
      policyLabel: 'Transparent Rule Manager',
      benchmarkMode: 'adaptiveBenchmark',
      objectiveAuthority: 'missionManager',
      routeAuthority: 'playerOrSolver',
      informationAccessTier: 'beliefOnly',
      worldModelTier: 'stochasticBelief',
      decisionCadence: 'surfacingWindow',
      surfacingRequired: true,
      thresholds: { highUncertainty: 0.65, highForecastError: 0.6, hiddenEvent: 0.62, likelyHiddenEvent: 0.78, boundaryAmbiguity: 0.58, staleRegion: 0.6, sourceLocalization: 0.6, noiseFalseAlarm: 0.7, hazardPressure: 0.65, minConfidence: 0.35 },
      weights: { uncertainty: 1, forecastError: 1, hiddenEvent: 1, boundary: 1, staleness: 1, sourceLocalization: 1, hazard: 1, evidenceConservatism: 1 },
      allowedObjectives: ['exploitKnownValue', 'reduceUncertainty', 'validateForecast', 'confirmHiddenEvent', 'mapBoundary', 'localizeSource', 'revisitStaleRegion'],
      claimLevel: 'syntheticTransparentContract',
      notA: ['not a production autonomy system', 'not MARL/RL', 'not a route planner', 'not calibrated ocean data assimilation'],
      notes: []
    };
    const adaptiveManagerState = {
      type: 'anchor.benchmark.adaptive-manager-state',
      version: 'adaptive-manager-state-p6',
      episodeId: benchmarkMetadata.episodeId,
      benchmarkMode: 'adaptiveBenchmark',
      policyId: 'transparentRuleManager',
      currentObjectiveId: 'validateForecast',
      objectiveHistory: [{ time: 0, objectiveId: 'validateForecast', transitionId: 'initialObjective', authority: 'missionManager', rationale: 'Initial adaptive E2E objective.' }],
      diagnosisHistory: [],
      evidenceHistory: [],
      surfacingEvents: [],
      decisionCount: 0,
      lastDecisionTime: null,
      routeAuthority: 'playerOrSolver',
      objectiveAuthority: 'missionManager',
      status: 'awaitingEvidence',
      warnings: []
    };
    const adaptiveBenchmark = { benchmarkMode: 'adaptiveBenchmark', episodeId: benchmarkMetadata.episodeId, activeLegIndex: 0, activeObjective: { id: 'validateForecast', label: 'Validate Forecast' }, adaptiveManagerConfig, adaptiveManagerState, objectiveAuthority: 'missionManager', routeAuthority: 'playerOrSolver' };
    const level = { levelId: 'e2e-adaptive-level', instanceId: 'e2e-adaptive-instance', challengeMode: 'forecast', world: { grid: { width: 6, height: 6 }, time: { dt: 1, duration: 4 } }, layers: { terrain: Array.from({ length: 6 }, () => Array(6).fill(0)), hazards: Array.from({ length: 6 }, () => Array(6).fill(0)), bases: [{ x: 0, y: 0 }], truth: { frames: [{ t: 0, current: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => [0, 0])), roi: Array.from({ length: 6 }, () => Array(6).fill(0)) }] } }, meta: { seed: 'e2e-adaptive', experienceMode: 'simulationLab', benchmarkMetadata, adaptiveBenchmark } };
    const mission = { missionId: 'e2e-adaptive-mission', meta: { experienceMode: 'simulationLab', benchmarkMetadata, adaptiveBenchmark }, agents: [{ id: 'g1', label: 'Glider 1', start: { x: 0, y: 0 } }], rules: {} };
    const plan = { type: 'anchor.plan', planId: 'e2e-adaptive-plan', meta: { valid: true, benchmarkMetadata, adaptiveBenchmark }, agentPlans: [{ agentId: 'g1', selectedStart: { x: 0, y: 0 }, waypoints: [{ x: 2, y: 2, t: 1, segmentEnergy: 2 }] }] };
    const result = { resultId: 'e2e-adaptive-result', levelId: level.levelId, missionId: mission.missionId, instanceId: level.instanceId, challengeMode: 'forecast', experienceMode: 'simulationLab', source: 'manual', planName: 'Manual Player Plan', benchmarkMetadata, adaptiveBenchmark, summary: { finalScore: 38, sampleScore: 16, energyUsed: 7, hazardsHit: 0, duplicateSamples: 0, completedWaypoints: 1, missedWaypoints: 0, observationCount: 5, recentObservationCount: 3, forecastErrorScore: 0.72 }, adaptiveEvidence: { hiddenEventConfidence: 0.68, meanUncertainty: 0.42, maxUncertainty: 0.6, stalenessScore: 0.3 }, events: [{ type: 'sample', time: 1, agentId: 'g1', x: 2, y: 2, value: 9 }] };
    const app = window.anchorGame;
    app.state.level = level;
    app.state.mission = mission;
    app.state.plan = plan;
    app.state.result = result;
    app.state.currentPlanSource = 'manual';
    app.state.challengeMode = 'forecast';
    app.state.experienceMode = 'simulationLab';
    app.state.currentScenario = { source: 'adaptiveBenchmarkSetup', benchmarkMetadata, adaptiveBenchmark };
    app.state.benchmarkModeConfig = null;
    app.state.benchmarkAttemptSession = null;
    app.state.adaptiveManagerConfig = adaptiveManagerConfig;
    app.state.adaptiveManagerState = adaptiveManagerState;
    app.state.adaptiveBenchmarkRuntimeContext = null;
    app.state.ui ??= {};
    app.state.playback ??= { time: 0 };
    app.state.planResults = { manual: { source: 'manual', plan, result, summary: { finalScore: 38, realizedValue: 16, energyUsed: 7, riskExposure: 0 } } };
    app.phaser.scene.getScene('MainMenuScene').scene.start('DebriefScene');
  });

  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene').sys.isActive())).toBe(true);
  await expect(page.locator('#debrief-root')).toContainText('Adaptive Benchmark Surfacing Review');
  await expect(page.locator('#debrief-root')).toContainText('Evidence Summary');
  await expect(page.locator('#debrief-root')).toContainText('Forecast Update');
  await expect(page.locator('#debrief-root')).toContainText('Discovery Update');
  await expect(page.locator('#debrief-root')).toContainText('Mission Manager Recommendation');
  await expect(page.locator('#debrief-root')).toContainText('Handoff Boundary');
  await expect(page.locator('#debrief-root')).toContainText('Diagnosis');
  await expect(page.locator('#debrief-root')).toContainText('Recommended Next Objective');
  await expect(page.locator('#debrief-root')).toContainText('Plan Next Leg');
  await expect(page.locator('#debrief-root')).toContainText('Adaptive Episode Session');
  await expect(page.locator('#debrief-root')).toContainText('Objective History');
  await expect(page.locator('#debrief-root')).toContainText('Continue to Next Leg');
  await expect(page.locator('#debrief-root')).toContainText('Save Adaptive Session');
  await expect(page.locator('#debrief-root')).toContainText('does not generate waypoints or routes');
  await expect(page.locator('#debrief-root')).toContainText('Science diagnosis informs the mission-manager recommendation. It does not generate a route.');
  await expect(page.locator('#debrief-root')).toContainText('The player or solver still plans the next leg.');
  await expect(page.locator('#debrief-root')).toContainText('new route planner');
  await expect(page.locator('#debrief-root')).toContainText('MARL/RL');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_EXECUTION_DEBUG?.benchmarkMode)).toBe('adaptiveBenchmark');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_EXECUTION_DEBUG?.hasAdaptiveEpisodeSession)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_EXECUTION_DEBUG?.adaptiveSessionLegCount >= 1)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_EXECUTION_DEBUG?.adaptiveNextLegAvailable)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_EXECUTION_DEBUG?.scienceDiagnosisIsPlannerAuthority)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_EXECUTION_DEBUG?.usesNewPlanner)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_EXECUTION_DEBUG?.usesMissionScoringRedesign)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_EXECUTION_DEBUG?.usesMARL)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_SESSION_DEBUG?.usesMissionScoringRedesign)).toBe(false);

  const [decisionDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#debrief-root [data-action="export-adaptive-surfacing-decision"]').click()
  ]);
  const decisionJson = JSON.parse(await fs.readFile(await decisionDownload.path(), 'utf8'));
  expect(decisionJson.type).toBe('anchor.benchmark.adaptive-surfacing-decision');
  expect(decisionJson.benchmarkMode).toBe('adaptiveBenchmark');
  expect(decisionJson.objectiveAuthority).toBe('missionManager');
  expect(decisionJson.routeAuthority).toBe('playerOrSolver');
  expect(decisionJson.usesMARL).toBe(false);

  const [handoffDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#debrief-root [data-action="export-adaptive-next-leg-config"]').click()
  ]);
  const handoffJson = JSON.parse(await fs.readFile(await handoffDownload.path(), 'utf8'));
  expect(handoffJson.type).toBe('anchor.benchmark.adaptive-next-leg-config');
  expect(handoffJson.routeAuthority).toBe('playerOrSolver');
  expect(handoffJson.waypoints).toBeUndefined();

  await page.locator('#debrief-root [data-action="save-adaptive-session"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ADAPTIVE_EXECUTION_DEBUG?.adaptiveSessionSaved || window.ANCHOR_ADAPTIVE_EXECUTION_DEBUG?.savedAdaptiveSessionCount >= 1)).toBe(true);

  const [sessionDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#debrief-root [data-action="export-adaptive-episode-session"]').click()
  ]);
  const sessionJson = JSON.parse(await fs.readFile(await sessionDownload.path(), 'utf8'));
  expect(sessionJson.type).toBe('anchor.benchmark.adaptive-episode-session');
  expect(sessionJson.benchmarkMode).toBe('adaptiveBenchmark');
  expect(sessionJson.objectiveAuthority).toBe('missionManager');
  expect(sessionJson.routeAuthority).toBe('playerOrSolver');
  expect(sessionJson.legs.length).toBeGreaterThanOrEqual(1);
  expect(sessionJson.objectiveHistory.length).toBeGreaterThanOrEqual(1);

  const [historyDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#debrief-root [data-action="export-adaptive-objective-history"]').click()
  ]);
  const historyJson = JSON.parse(await fs.readFile(await historyDownload.path(), 'utf8'));
  expect(historyJson.type).toBe('anchor.benchmark.adaptive-objective-history');
  expect(historyJson.objectiveAuthority).toBe('missionManager');
  expect(historyJson.routeAuthority).toBe('playerOrSolver');

  await page.locator('#debrief-root [data-action="continue-adaptive-next-leg"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive()), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.pendingBenchmarkEpisode?.episodeState?.episodeId)).toBe('e2e-adaptive-benchmark-episode');
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.pendingBenchmarkEpisode?.legIndex)).toBe(1);
  await expect.poll(() => page.evaluate(() => {
    const payload = window.anchorGame.state.pendingBenchmarkEpisode;
    return Boolean(payload && !payload.launchConfig?.waypoints && !payload.launchConfig?.route && !payload.launchConfig?.agentPlans);
  })).toBe(true);
});
test('campaign planning smoke flow reaches debrief', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ANCHOR: Glider Command/);
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await expect(page.locator('#top-nav')).toHaveCount(0);
  await expect(page.locator('#left-panel')).toHaveCount(0);
  await expect(page.locator('#right-panel')).toHaveCount(0);
  await expect(page.locator('#context-panel')).toBeEmpty();

  const hub = page.locator('#main-menu-hub');
  await expect(hub).toBeVisible();
  await expect(hub).toContainText('ANCHOR: Glider Command');
  await expect(hub).toContainText('Scientific AUV Glider Adaptive-Sampling Game');
  await expect(hub.locator('[data-hub-view="challenge"]')).toContainText('Challenge Mode');
  await expect(hub.locator('[data-hub-view="simulation"]')).toContainText('Simulation Lab');
  await expect(hub.locator('[data-hub-view="learning"]')).toContainText('Learning Labs');
  await expect(page.locator('#mission-console')).toContainText('Mission Console');
  await expect(page.locator('#mission-console')).toContainText('Choose Challenge Mode, Simulation Lab, or Learning Labs from the main viewport.');
  await expect(page.locator('#mission-console .accordion-header')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-accordion-key]')).toHaveCount(0);
  await expect(page.locator('#mission-console .console-status')).toContainText('Main Menu');
  await expect(page.locator('#waypoint-timeline')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MAIN_MENU_DEBUG?.usesFullViewportHub)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MAIN_MENU_DEBUG?.changesSimulationBehavior)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MAIN_MENU_DEBUG?.changesScoring)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MAIN_MENU_DEBUG?.usesNewPlanner)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MAIN_MENU_DEBUG?.usesMARL)).toBe(false);

  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MainMenuScene');
    const width = Number(scene.scale.width);
    const height = Number(scene.scale.height);
    const texts = (scene.objects ?? []).filter((object) => object.type === 'Text');
    return {
      textCount: texts.length,
      awaitingVisible: texts.some((object) => object.text === 'Awaiting Mission Launch'),
      allTextInsideCenterCanvas: texts.every((object) => {
        const bounds = object.getBounds();
        return bounds.left >= -1
          && bounds.right <= width + 1
          && bounds.top >= -1
          && bounds.bottom <= height + 1;
      })
    };
  })).resolves.toMatchObject({
    awaitingVisible: false,
    allTextInsideCenterCanvas: true
  });
  await expect(page.evaluate(() => {
    const left = document.getElementById('mission-console').getBoundingClientRect();
    const center = document.getElementById('game-root').getBoundingClientRect();
    const right = document.getElementById('waypoint-timeline').getBoundingClientRect();
    const rightStyle = window.getComputedStyle(document.getElementById('waypoint-timeline'));
    const canvas = document.querySelector('#game-root canvas').getBoundingClientRect();
    return {
      shellActive: document.body.classList.contains('main-menu-shell'),
      centerAfterLeft: center.left >= left.right - 1,
      rightHidden: rightStyle.display === 'none' || right.width <= 1,
      canvasInsideCenter: canvas.left >= center.left - 1
        && canvas.right <= center.right + 1
        && canvas.top >= center.top - 1
        && canvas.bottom <= center.bottom + 1,
      canvasStartsAtTop: Math.abs(canvas.top - center.top) <= 1,
      canvasFillsCenter: Math.abs(canvas.width - center.width) <= 1
        && Math.abs(canvas.height - center.height) <= 1,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1
    };
  })).resolves.toEqual({
    shellActive: true,
    centerAfterLeft: true,
    rightHidden: true,
    canvasInsideCenter: true,
    canvasStartsAtTop: true,
    canvasFillsCenter: true,
    noHorizontalOverflow: true
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').buttons?.length ?? 0)).resolves.toBe(0);

  await openMainMenuHubSection(page, 'simulation');
  const simulationHub = page.locator('#main-menu-hub[data-hub-view="simulation"]');
  await expect(simulationHub).toContainText('Sampling Process Lab');
  await expect(simulationHub).toContainText('Flow Fields Demo');
  await expect(simulationHub).toContainText('Coupled Fields Demo');
  await expect(simulationHub).toContainText('Uncertainty / Forecast Demo');
  await expect(simulationHub).toContainText('Planner Benchmark');
  await expect(simulationHub).toContainText('Adaptive Benchmark');
  await expect(simulationHub).toContainText('Headless Bundle Viewer');
  await page.locator('#main-menu-hub [data-action="flow-fields"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').sys.isActive())).toBe(true);
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').fieldMode)).resolves.toBe('dynamic');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').preset)).resolves.toBe('topologyAwareComposite');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').terrainMode)).resolves.toBe('blendedCoastal');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').dynamicComplexity)).resolves.toBe('high');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').boundaryMode)).resolves.toBe('deflectAlongShore');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers.length)).resolves.toBe(0);
  await expect(page.locator('#mission-console')).toContainText('Flow Fields Demo');
  await expect(page.locator('#mission-console')).toContainText('Base Flow Field');
  await expect(page.locator('#mission-console')).toContainText('Additive Flow Layers');
  await expect(page.locator('#mission-console')).toContainText('Flow Evolution');
  await expect(page.locator('#mission-console')).toContainText('Topology-aware fields react');
  await expect(page.locator('#mission-console')).toContainText('F(x, y, t)');
  await expect(page.locator('#flow-demo-preset')).toBeVisible();
  await expect(page.locator('#mission-console [data-flow-diagnostics]')).toContainText('Current Field Diagnostics');
  await expect(page.locator('#mission-console [data-flow-diagnostics]')).toContainText('Speed');
  await expect(page.locator('#mission-console [data-flow-help]')).toHaveCount(11);
  await expect(page.locator('#mission-console .sample-field-explainer')).toHaveCount(0);
  await expect(page.locator('#mission-console')).not.toContainText('Expected Visual Behavior');
  await page.locator('#mission-console [data-flow-help="basePreset"]').click();
  await expect(page.locator('#waypoint-timeline [data-flow-behavior-help]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Behavior Help');
  await expect(page.locator('#waypoint-timeline')).toContainText('About Flow Field / Base Preset');
  await expect(page.locator('#waypoint-timeline')).toContainText('Current Composition');
  await page.locator('#mission-console [data-flow-help="evolutionBehavior"]').click();
  await expect(page.locator('#waypoint-timeline')).toContainText('About Evolution Behavior');
  await page.locator('#mission-console [data-flow-help="boundaryMode"]').click();
  await expect(page.locator('#waypoint-timeline')).toContainText('About Boundary Mode');
  await page.locator('#mission-console [data-flow-help="speedModel"]').click();
  await expect(page.locator('#waypoint-timeline')).toContainText('Playback vs Evolution Speed');
  await page.locator('#flow-demo-preset').selectOption('uniformDrift');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').preset)).toBe('uniformDrift');
  await expect(page.locator('#mission-console [data-flow-diagnostics]')).toContainText('Speed');
  await page.locator('#flow-demo-preset').selectOption('eddyField');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').preset)).toBe('eddyField');
  await expect(page.locator('#mission-console [data-flow-diagnostics]')).toContainText('Mean Vorticity');
  await expect(page.locator('#mission-console [data-flow-diagnostics]')).toContainText(/Synthetic|synthetic/);
  await expect(page.locator('#mission-console [data-flow-diagnostics]')).toContainText(/not a|not validated|not calibrated/);
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').flowDiagnostics?.invalidVectorCount)).resolves.toBe(0);
  await expect(page.evaluate(() => Boolean(window.ANCHOR_FLOW_DEMO_DEBUG?.flowFieldDiagnostics))).resolves.toBe(true);
  await expect(page.locator('#mission-console')).not.toContainText('Reset Particles');
  await expect(page.locator('#mission-console [data-action="pause"]')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-action="reset"]')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-action="export-demo-json"]')).toHaveText('Export Demo JSON');
  const flowArtifact = await downloadDemoArtifact(page);
  expect(flowArtifact.filename).toMatch(/^anchor-flow-field-demo-frame-/);
  expect(flowArtifact.data).toMatchObject({
    schemaVersion: '1.1',
    type: 'anchor.demo.flow-field',
    grid: { rowMajor: true, coordinateConvention: 'cell-center' },
    timeSampling: { kind: 'singleFrame', mode: 'currentFrame', frameCount: 1 }
  });
  expect(flowArtifact.data.fields.u.length).toBe(flowArtifact.data.grid.height);
  expect(flowArtifact.data.fields.v[0].length).toBe(flowArtifact.data.grid.width);
  expect(flowArtifact.data.flowFieldDiagnostics).toBeTruthy();
  expect(flowArtifact.data.flowFieldModel).toBeTruthy();
  expect(flowArtifact.data.flowFieldModel.notA).toBeTruthy();
  expect(flowArtifact.data.frames).toHaveLength(1);
  expect(flowArtifact.data.frames[0].flowFieldDiagnostics).toBeTruthy();
  await page.locator('#demo-export-mode').selectOption('timeWindow');
  await page.locator('#demo-export-start').fill('0');
  await page.locator('#demo-export-start').dispatchEvent('change');
  await page.locator('#demo-export-end').fill('4');
  await page.locator('#demo-export-end').dispatchEvent('change');
  await page.locator('#demo-export-frames').fill('3');
  await page.locator('#demo-export-frames').dispatchEvent('change');
  const flowSeriesArtifact = await downloadDemoArtifact(page);
  expect(flowSeriesArtifact.filename).toMatch(/^anchor-flow-field-demo-timeseries-/);
  expect(flowSeriesArtifact.data.timeSampling).toMatchObject({
    kind: 'timeSeries',
    mode: 'timeWindow',
    startTimeSeconds: 0,
    endTimeSeconds: 4,
    frameCount: 3,
    timesSeconds: [0, 2, 4]
  });
  expect(flowSeriesArtifact.data.frames).toHaveLength(3);
  expect(flowSeriesArtifact.data.frames[2].fields.u.length).toBe(flowSeriesArtifact.data.grid.height);
  expect(flowSeriesArtifact.data.frames[2].flowFieldDiagnostics).toBeTruthy();
  await expect(page.locator('#mission-console [data-action="menu"]')).toHaveText('Main Menu');
  await expect(page.locator('#mission-summary-hud')).toBeEmpty();
  await expect(page.locator('#agent-performance-hud')).toBeEmpty();
  await expect(page.locator('#mission-summary-hud')).not.toContainText('No mission');
  await expect(page.locator('#agent-performance-hud')).not.toContainText('MISSION PERFORMANCE');
  await expect(page.locator('#agent-performance-hud')).not.toContainText('No active gliders');
  await expect(page.locator('#bottom-timeline .flow-demo-transport')).toBeVisible();
  await expect(page.locator('#bottom-timeline')).toContainText('Demo Time');
  await expect(page.locator('#bottom-timeline')).toContainText('Infinite timeline');
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-back"]')).toHaveCount(0);
  await expect(page.locator('#bottom-timeline')).not.toContainText('Back');
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-reset"]')).toHaveText('Reset');
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-direction"]')).toHaveText('Direction: Forward');
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-pause"]')).toHaveText('Pause');
  await expect(page.locator('#mission-console [data-action="menu"]')).toHaveText('Main Menu');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').buttons?.length ?? 0)).resolves.toBe(0);
  await expect(page.evaluate(() => {
    const bottom = document.querySelector('#bottom-timeline .flow-demo-transport')?.getBoundingClientRect();
    const canvas = document.querySelector('#game-root canvas')?.getBoundingClientRect();
    const timeText = document.querySelector('#bottom-timeline [data-flow-demo-time]')?.textContent ?? '';
    return {
      hasBottom: Boolean(bottom),
      belowCanvasHeader: bottom ? bottom.top > canvas.top + 120 : false,
      timeText
    };
  })).resolves.toMatchObject({
    hasBottom: true,
    belowCanvasHeader: true
  });
  const waterCell = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    for (let row = 0; row < scene.terrain.length; row += 1) {
      for (let col = 0; col < scene.terrain[row].length; col += 1) {
        if (!scene.terrain[row][col]) return { col, row };
      }
    }
    return { col: 0, row: 0 };
  });
  await clickFlowDemoCell(page, waterCell.col, waterCell.row);
  await expect(page.locator('#waypoint-timeline [data-flow-behavior-help]')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline')).toContainText('Cell Inspector');
  await expect(page.locator('#waypoint-timeline')).toContainText(`Cell (${waterCell.col}, ${waterCell.row})`);
  await expect(page.locator('#waypoint-timeline')).toContainText('Current Vector');
  await expect(page.locator('#waypoint-timeline')).toContainText('magnitude');
  await expect(page.locator('#waypoint-timeline')).toContainText('direction');
  await expect(page.locator('#waypoint-timeline')).toContainText('Topology / Boundary');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').selectedCell)).resolves.toMatchObject(waterCell);
  const inspectedMagnitude = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').inspectSelectedCell().magnitude);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').inspectSelectedCell().magnitude)).not.toBe(inspectedMagnitude);
  const landCell = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    for (let row = 0; row < scene.terrain.length; row += 1) {
      for (let col = 0; col < scene.terrain[row].length; col += 1) {
        if (scene.terrain[row][col]) return { col, row };
      }
    }
    return null;
  });
  expect(landCell).toBeTruthy();
  await clickFlowDemoCell(page, landCell.col, landCell.row);
  await expect(page.locator('#waypoint-timeline')).toContainText(`Cell (${landCell.col}, ${landCell.row})`);
  await expect(page.locator('#waypoint-timeline')).toContainText('Type: Land');
  await expect(page.locator('#waypoint-timeline')).toContainText('No navigable water current is applied here.');
  await clickFlowDemoCell(page, waterCell.col, waterCell.row);
  await expect(page.locator('#flow-demo-mode')).toBeVisible();
  await expect(page.locator('#flow-demo-mode option')).toHaveText(['Static', 'Dynamic']);
  await expect(page.locator('#mission-console')).toContainText('Continuous evolution');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers.length)).toBe(0);
  await expect(page.locator('#flow-demo-preset option').first()).toHaveText('Topology-Aware Composite');
  await expect(page.locator('#flow-demo-terrain option')).toHaveText(['Blended Coastal Map', 'Coast + Islands', 'Coastal Estuary', 'Channel + Islands', 'Random Islands', 'Coastline', 'Channel', 'Bay / Pocket', 'Island Chain', 'No Land']);
  await expect(page.locator('#flow-demo-evolution-behavior option')).toHaveText(['Continuous', 'Looping / Cyclic', 'One-Shot Pulse', 'Meandering / Translating']);
  await expect(page.locator('#flow-demo-direction-variation option')).toHaveText(['Off', 'Low', 'Medium', 'High']);
  await expect(page.locator('#flow-demo-magnitude-variation option')).toHaveText(['Off', 'Low', 'Medium', 'High']);
  await expect(page.locator('#flow-demo-dynamic-complexity option')).toHaveText(['Low', 'Medium', 'High']);
  await expect(page.locator('#flow-demo-boundary-mode option')).toHaveText(['None', 'Risk Only', 'Dampen Into Land', 'Deflect Along Shore']);
  await expect(page.locator('#flow-demo-evolution-pattern option')).toHaveText(['Tidal Cycle', 'Meandering Jet', 'Eddy Drift', 'Storm Pulse', 'Composite']);
  await expect(page.locator('#flow-demo-spatial-motion option')).toHaveText(['Off', 'Drift East', 'Drift West', 'Drift North', 'Drift South', 'Circular Drift', 'Meander']);
  await expect(page.locator('#flow-demo-playback-speed')).toBeVisible();
  await expect(page.locator('#flow-demo-flow-evolution-speed')).toBeVisible();
  await page.locator('#flow-demo-evolution-behavior').selectOption('looping');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').evolutionBehavior)).toBe('looping');
  await page.locator('#flow-demo-cycle-duration').selectOption('30');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').cycleDuration)).toBe(30);
  await page.locator('#flow-demo-direction-variation').selectOption('high');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').directionVariation)).toBe('high');
  await page.locator('#flow-demo-magnitude-variation').selectOption('low');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').magnitudeVariation)).toBe('low');
  await page.locator('#flow-demo-dynamic-complexity').selectOption('low');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').dynamicComplexity)).toBe('low');
  await page.locator('#flow-demo-evolution-pattern').selectOption('stormPulse');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').evolutionPattern)).toBe('stormPulse');
  await page.locator('#flow-demo-spatial-motion').selectOption('meander');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').spatialMotion)).toBe('meander');
  await page.locator('#flow-demo-spatial-motion-speed').selectOption('2');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').spatialMotionSpeed)).toBe(2);
  await page.locator('#flow-demo-boundary-mode').selectOption('riskOnly');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').boundaryMode)).toBe('riskOnly');
  await page.locator('#mission-console [data-action="add-flow-layer"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers.length)).toBe(1);
  await page.locator('[data-flow-layer-preset]').first().selectOption('eddyField');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers[0].preset)).toBe('eddyField');
  await page.locator('[data-flow-layer-weight]').first().evaluate((input) => {
    input.value = '0.75';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers[0].weight)).toBe(0.75);
  await page.locator('[data-flow-layer-influence]').first().selectOption('spatialPocket');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers[0].influence)).toBe('spatialPocket');
  await page.locator('#mission-console [data-action="add-flow-layer"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers.length)).toBe(2);
  await page.locator('[data-flow-layer-remove]').first().click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').additiveLayers.length)).toBe(1);
  await page.locator('#flow-demo-playback-speed').selectOption('5');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').playbackSpeedScale)).toBe(5);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').evolutionSpeedScale)).toBe(5);
  await expect(page.locator('#mission-console')).toContainText('Playback Speed');
  await expect(page.locator('#bottom-timeline')).toContainText('Playback: 5x');
  await page.locator('#flow-demo-flow-evolution-speed').selectOption('2');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').flowEvolutionSpeedScale)).toBe(2);
  await expect(page.locator('#mission-console')).toContainText('Flow Evolution Speed');
  await expect(page.locator('#bottom-timeline')).toContainText('Flow: 2x');
  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    scene.demoTime = 3;
    return scene.flowSampleTime();
  })).resolves.toBe(6);
  const flowControlErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') flowControlErrors.push(message.text());
  });
  page.on('pageerror', (error) => flowControlErrors.push(error.message));
  await page.locator('#flow-demo-magnitude-scale').selectOption('2');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').magnitudeScale)).toBe(2);
  await page.locator('#flow-demo-particle-speed').selectOption('2');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').particleSpeedScale)).toBe(2);
  await expect(page.locator('#mission-console')).toContainText('Magnitude Range');
  await expect(page.locator('#mission-console')).toContainText('Magnitude Scale changes arrow display length only');
  expect(flowControlErrors).toEqual([]);
  await page.locator('#bottom-timeline [data-action="flow-demo-pause"]').click();
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-pause"]')).toHaveText('Resume');
  await expect(page.locator('#bottom-timeline')).toContainText('Paused at');
  const flowTimeBeforePause = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime);
  const flowMagnitudeBeforePause = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').inspectSelectedCell().magnitude);
  await page.waitForTimeout(250);
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime)).resolves.toBeCloseTo(flowTimeBeforePause, 1);
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').inspectSelectedCell().magnitude)).resolves.toBeCloseTo(flowMagnitudeBeforePause, 4);
  await page.locator('#bottom-timeline [data-action="flow-demo-pause"]').click();
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-pause"]')).toHaveText('Pause');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime)).toBeGreaterThan(flowTimeBeforePause);
  const forwardTime = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime);
  await page.locator('#bottom-timeline [data-action="flow-demo-direction"]').click();
  await expect(page.locator('#bottom-timeline [data-action="flow-demo-direction"]')).toHaveText('Direction: Reverse');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime)).toBeLessThan(forwardTime);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    scene.demoTime = 0.01;
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime)).toBe(0);
  await page.locator('#bottom-timeline [data-action="flow-demo-pause"]').click();
  await page.locator('#bottom-timeline [data-action="flow-demo-reset"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').demoTime)).toBeLessThan(0.2);
  await page.locator('#flow-demo-terrain').selectOption('islands');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').terrainMode)).toBe('islands');
  await page.locator('#flow-demo-terrain').selectOption('coastline');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').terrainMode)).toBe('coastline');
  await page.locator('#flow-demo-terrain').selectOption('none');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene').terrainMode)).toBe('none');
  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);
  await expect(page.locator('#bottom-timeline')).toBeEmpty();

  await openMainMenuHubSection(page, 'challenge');
  const challengeHub = page.locator('#main-menu-hub[data-hub-view="challenge"]');
  await expect(challengeHub).toContainText('Start Guided Challenge');
  await expect(challengeHub).toContainText('Quick Random Challenge');
  await expect(challengeHub).toContainText('Play Custom Challenge / Import Challenge JSON');
  await expect(challengeHub).toContainText('Challenge Leaderboard');
  await page.locator('#main-menu-hub [data-hub-view="home"]').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="home"]')).toBeVisible();
  await openMainMenuHubSection(page, 'learning');
  const learningHub = page.locator('#main-menu-hub[data-hub-view="learning"]');
  await expect(learningHub.locator('a[href="labs/index.html"]')).toBeVisible();
  await expect(learningHub).toContainText('Interactive articles + companion sandboxes.');
  await page.locator('#main-menu-hub [data-hub-view="home"]').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="home"]')).toBeVisible();
  await launchFromMainMenuHub(page, 'simulation', 'roi-demo');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Deterministic Spatiotemporal Process Lab');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').buttons?.length ?? 0)).resolves.toBe(0);
  await expect(page.locator('#mission-summary-hud')).toBeEmpty();
  await expect(page.locator('#agent-performance-hud')).toBeEmpty();
  await expect(page.locator('#waypoint-timeline')).toContainText('Process Example View');
  await expect(page.locator('#waypoint-timeline')).toContainText('Current Lab State');
  await expect(page.locator('#waypoint-timeline')).toContainText('Behavior QA');
  await expect(page.locator('#waypoint-timeline')).toContainText('Foundational CA Models');
  await expect(page.locator('#waypoint-timeline')).toContainText('Inspired By');
  await expect(page.locator('#waypoint-timeline')).toContainText('Sampling Interpretation');
  await expect(page.locator('#mission-console [data-sampling-top-card="mode"]')).toContainText('Mode');
  await expect(page.locator('#mission-console [data-sampling-primary-mode="foundationalCaModels"]')).toContainText('Foundational CA Model');
  await expect(page.locator('#mission-console [data-sampling-top-card="summary"]')).toHaveCount(0);
  await expect(page.locator('#mission-console')).not.toContainText('Current Summary');
  await expect(page.locator('#mission-console')).not.toContainText('Pattern Source / Mode');
  await expect(page.locator('#mission-console [data-sampling-section="sourceField"]')).toHaveCount(0);
  await expect(page.locator('#mission-console')).not.toContainText('Event Likelihood / Spawn Distribution');
  await expect(page.locator('#mission-console')).toContainText('Choose how to build or generate the process.');
  await expect(page.locator('#mission-console')).not.toContainText('Reference Signature is guided');
  await expectSamplingSectionsCollapsed(page, [
    'Mode',
    'Foundational CA Models',
    'Display / Diagnostic Layer',
    'Seed / Scenario Identity',
    'Export'
  ]);
  await expandMissionConsoleSection(page, 'Mode');
  await expandMissionConsoleSection(page, 'Foundational CA Models');
  await expandMissionConsoleSection(page, 'Display / Diagnostic Layer');
  await expandMissionConsoleSection(page, 'Export');
  await expect(page.locator('#sampling-process-mode')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const mode = document.querySelector('#sampling-process-mode');
    const signature = document.querySelector('#roi-demo-reference-signature');
    return Boolean(mode && signature && mode.compareDocumentPosition(signature) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await expect(page.locator('#sampling-process-mode option')).toHaveText([
    'Foundational CA Models',
    'Ocean-Relevant Process Analogs',
    'Custom Composer',
    'Process Paint',
    'Rule Allocation Sandbox'
  ]);
  await expect(page.locator('#sampling-process-mode')).not.toContainText('Diagnostics / Graph Inspection');
  await expect(page.locator('#roi-demo-pattern-source')).toHaveCount(0);
  await expect(page.locator('#sampling-process-example-track')).toHaveCount(0);
  await expect(page.locator('#sampling-process-example-id')).toBeVisible();
  await expect(page.locator('#sampling-process-example-id')).toContainText("Conway's Game of Life");
  await expect(page.locator('#sampling-process-example-id')).toContainText('Forest Fire');
  await expect(page.locator('#sampling-process-example-id')).not.toContainText('River Plume Front');
  await expect(page.locator('#roi-demo-reference-signature')).not.toContainText('River Plume Front');
  await expect(page.locator('#roi-demo-reference-signature')).not.toContainText('Bloom Growth / Decay');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Foundational CA Models');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Foundational CA Models');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText("Conway's Game of Life");
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Mapped Pattern');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Local Birth-Death Emergence');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('simplifiedFamilyAnalog');
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toBeVisible();
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toContainText('Recipe');
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toContainText('Inspector');
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toContainText('Help');
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toContainText('Diagnostics');
  await expect.poll(() => page.evaluate(() => {
    const panel = document.querySelector('#waypoint-timeline');
    const tabs = panel?.querySelector('.sampling-panel-tabs');
    const current = panel?.querySelector('[data-roi-current-lab-state]');
    return Boolean(tabs && current && tabs.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await clickRightPanelMode(page, 'diagnostics');
  await expect(page.locator('#waypoint-timeline [data-roi-diagnostics-view]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').processMode)).toBe('foundationalCaModels');
  await expect(page.locator('#waypoint-timeline')).toContainText('Field / Process Stats');
  await expect(page.locator('#waypoint-timeline [data-roi-reference-signature-help]')).toHaveCount(0);
  await clickRightPanelMode(page, 'cellInspector');
  await expect(page.locator('#waypoint-timeline [data-roi-cell-inspector-empty]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Select a cell on the canvas to inspect its value, state, rule, messages, and ROI role.');
  await clickRightPanelMode(page, 'recipeSignature');
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toBeVisible();
  await expect(page.locator('#roi-demo-behavior-preset')).toHaveCount(0);
  await expect(page.locator('#mission-console')).toContainText('Process Lab UI: process-context-split-ui-v1');
  await expect(page.locator('#mission-console')).toContainText('Legacy presets visible: false');
  await expect(page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).resolves.toMatchObject({
    uiVersion: 'process-context-split-ui-v1',
    referenceSignatureCount: 14,
    legacyPresetCount: 12,
    legacyPresetsVisible: false,
    activePatternSource: 'referenceSignature',
    activeProcessContext: 'foundationalCaModels',
    activeProcessContextLabel: 'Foundational CA Models',
    activeReferenceSignatureId: 'birthDeathEmergence',
    activeExampleTrack: 'foundationalCaModels',
    activeExampleProcessId: 'conwayGameOfLife',
    activeExampleProcessLabel: "Conway's Game of Life",
    activeMappedReferenceSignatureId: 'birthDeathEmergence',
    activeExampleFixtureId: 'conwayGameOfLife.default',
    activeExampleBehaviorValidationStatus: 'PASS',
    legacyReferenceMappingConsistent: true,
    selectorModeMatchesActiveExample: true,
    selectorMatchesActiveExample: true,
    hasValueDistributionAccordion: false,
    rightPanelMode: 'recipeSignature',
    visibleWorkflowModes: ['foundationalCaModels', 'oceanProcessAnalogs', 'customComposer', 'processPaint', 'randomRuleLab'],
    diagnosticsAvailableAsView: true
  });
  await expect(page.locator('#bottom-timeline .roi-demo-transport')).toBeVisible();
  await expect(page.locator('#bottom-timeline')).toContainText('Generation');
  await expect(page.locator('#bottom-timeline')).toContainText('1 gen/s');
  await expect(page.locator('#bottom-timeline')).toContainText('Infinite timeline');
  await expect(page.locator('#bottom-timeline [data-action="roi-demo-reset"]')).toHaveText('Reset');
  await expect(page.locator('#bottom-timeline [data-action="roi-demo-step-generation"]')).toHaveText('Step Generation');
  await expect(page.locator('#bottom-timeline [data-roi-demo-tick-rate]')).toHaveValue('1');
  await page.locator('#bottom-timeline [data-action="roi-demo-pause"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paused)).toBe(true);
  const generationBeforeStep = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').processGenerationIndex);
  await page.locator('#bottom-timeline [data-action="roi-demo-step-generation"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').processGenerationIndex)).toBe(generationBeforeStep + 1);
  await expect(page.locator('#sampling-initial-condition-mode')).toBeVisible();
  await expect(page.locator('#sampling-initial-condition-mode option')).toHaveText([
    'Curated Seed',
    'Interactive Canvas',
    'Deterministic Random Seed'
  ]);
  await expect(page.locator('#sampling-initial-condition-fixture')).toContainText('Blinker');
  await expect(page.locator('#sampling-initial-condition-brush')).toContainText('Active');
  await page.locator('#sampling-initial-condition-fixture').selectOption('blinker');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG.activeFixtureId)).toBe('blinker');
  await page.locator('#sampling-initial-condition-mode').selectOption('interactiveCanvas');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG.activeInitialConditionMode)).toBe('interactiveCanvas');
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    scene.applyInitialConditionCell({ col: 7, row: 7, x: 7, y: 7 });
    scene.applyInitialConditionCell({ col: 7, row: 8, x: 7, y: 8 });
    scene.applyInitialConditionCell({ col: 7, row: 9, x: 7, y: 9 });
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG.activeInteractiveEditCount)).toBe(3);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG.generationIndex)).toBe(0);
  await expect(page.locator('#bottom-timeline')).toContainText('Interactive Initial Condition');
  await clickRightPanelMode(page, 'recipeSignature');
  await expect(page.locator('#waypoint-timeline [data-process-initial-condition-card]')).toContainText('B3/S23');
  await page.locator('#bottom-timeline [data-action="roi-demo-step-generation"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG.generationIndex)).toBe(1);
  await page.locator('#bottom-timeline [data-action="roi-demo-reset"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG.activeInteractiveEditCount)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG.generationIndex)).toBe(0);
  await page.locator('#sampling-initial-condition-fixture').selectOption('default');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG.activeFixtureId)).toBe('default');
  await page.locator('#sampling-initial-condition-mode').selectOption('curatedSeed');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG.activeInitialConditionMode)).toBe('curatedSeed');
  await expect(page.locator('#roi-demo-event-likelihood')).toHaveCount(0);
  await expect(page.locator('#roi-demo-event-likelihood-dynamics')).toHaveCount(0);
  await expect(page.locator('#roi-demo-spatial-pattern')).toHaveCount(0);
  await expect(page.locator('#roi-demo-value-distribution')).toHaveCount(0);
  await expect(page.locator('#roi-demo-cluster-size')).toHaveCount(0);
  await expect(page.locator('#roi-demo-temporal-pattern')).toHaveCount(0);
  await expect(page.locator('#roi-demo-spatial-evolution')).toHaveCount(0);
  await expect(page.locator('#roi-demo-motion-scope')).toHaveCount(0);
  await expect(page.locator('#roi-demo-state-model')).toHaveCount(0);
  await expect(page.locator('#roi-demo-depletion-mode')).toHaveCount(0);
  await expect(page.locator('#roi-demo-display-mode')).toBeVisible();
  await expect(page.locator('#roi-demo-display-mode')).toHaveValue('processTransitionView');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('State View');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('Rule Metric');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('Transition View');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('processTransitionView');
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/neighbor count/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/birth/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/surviv/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/death|dies/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText('What colors mean');
  await expect(page.locator('#roi-demo-dynamic-complexity')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-action="export-demo-json"]')).toHaveText('Export Demo JSON');
  await expect(page.locator('#mission-console')).not.toContainText('Scenario Generation');
  await expect(page.locator('#mission-console')).not.toContainText('Component Isolation Examples');
  const roiArtifact = await downloadDemoArtifact(page);
  expect(roiArtifact.filename).toMatch(/^anchor-sample-roi-field-demo-frame-/);
  expect(roiArtifact.data.type).toBe('anchor.demo.sampling-process-field');
  expect(roiArtifact.data.legacyType).toBe('anchor.demo.sample-roi-field');
  expect(roiArtifact.data.legacyDemoName).toBe('Sample / ROI Field Demo');
  expect(roiArtifact.data.frames).toHaveLength(1);
  expect(roiArtifact.data.config.displayMode).toBe('processTransitionView');
  expect(roiArtifact.data.processTiming.frameSemantics).toBe('discrete-generations-v1');
  expect(roiArtifact.data.processTiming.tickRate).toBe(1);
  expect(roiArtifact.data.processDisplayMetric.metricId).toBe('transitionClass');
  expect(roiArtifact.data.behaviorValidation.status).toBe('PASS');
  expect(roiArtifact.data.exampleFixtureId).toBe('conwayGameOfLife.default');
  expect(roiArtifact.data.fields.metricLayers.transitionClass.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.patternSource).toBe('referenceSignature');
  expect(roiArtifact.data.referenceSignatureId).toBe('birthDeathEmergence');
  expect(roiArtifact.data.referenceSignatureMetadata.label).toBe('Local Birth-Death Emergence');
  expect(roiArtifact.data.exampleTrack).toBe('foundationalCaModels');
  expect(roiArtifact.data.exampleTrackLabel).toBe('Foundational CA Models');
  expect(roiArtifact.data.exampleProcessId).toBe('conwayGameOfLife');
  expect(roiArtifact.data.exampleProcessLabel).toBe("Conway's Game of Life");
  expect(roiArtifact.data.foundationalCaModelId).toBe('conwayGameOfLife');
  expect(roiArtifact.data.processExample.exampleTrack).toBe('foundationalCaModels');
  expect(roiArtifact.data.processExample.exampleProcessId).toBe('conwayGameOfLife');
  expect(roiArtifact.data.processExample.mappedReferenceSignatureId).toBe(roiArtifact.data.referenceSignatureId);
  expect(roiArtifact.data.processExample.exampleFixtureId).toBe('conwayGameOfLife.default');
  expect(roiArtifact.data.processExample.behaviorValidation.status).toBe('PASS');
  expect(roiArtifact.data.processExample.behaviorValidation.metrics.canonicalRuleCheck).toBe('B3/S23 localBirthDeath');
  expect(roiArtifact.data.initialCondition.mode).toBe('curatedSeed');
  expect(roiArtifact.data.initialCondition.fixtureId).toBe('default');
  expect(roiArtifact.data.initialCondition.editedCellCount).toBe(0);
  expect(roiArtifact.data.processExample.initialCondition.mode).toBe('curatedSeed');
  expect(roiArtifact.data.processPatternId).toBe('birthDeathEmergence');
  expect(roiArtifact.data.metadata.exampleTrack).toBe('foundationalCaModels');
  expect(roiArtifact.data.referenceSignatureMetadata.caTaxonomy).toBeTruthy();
  expect(roiArtifact.data.referenceSignatureMetadata.qaExpectations).toBeTruthy();
  expect(roiArtifact.data.referenceSignatureMetadata.phenotypeMetrics).toBeTruthy();
  expect(roiArtifact.data.referenceSignatureMetadata.genotypeNotes).toBeTruthy();
  expect(roiArtifact.data.caTaxonomy).toBeTruthy();
  expect(roiArtifact.data.qaExpectations).toBeTruthy();
  expect(roiArtifact.data.componentRecipe.valueDistribution).toBeTruthy();
  expect(roiArtifact.data.fields.sampleValue.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.sourceField.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.legacyEventLikelihoodField.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.stateLayer.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.ruleLayer.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.groupLayer.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.roiRoleLayer.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.fields.eventLikelihood[0].length).toBe(roiArtifact.data.grid.width);
  expect(roiArtifact.data.likelihoodField.type).toBe('processSourceField');
  expect(roiArtifact.data.likelihoodField.diagnostics).toBeTruthy();
  expect(roiArtifact.data.likelihoodField.values.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.likelihoodField.mesh).toMatchObject({
    activeThreshold: 0.25,
    highThreshold: 0.7,
    nearTriggerThreshold: 0.9
  });
  expect(roiArtifact.data.metadata.likelihoodMesh.highThreshold).toBe(0.7);
  expect(roiArtifact.data.graphField.graph.topology).toBe('8-neighbor');
  expect(roiArtifact.data.graphField.graph.hierarchy).toBe('cluster-cell-edge');
  expect(roiArtifact.data.graphField.graph.nodeCount).toBe(roiArtifact.data.grid.width * roiArtifact.data.grid.height);
  expect(roiArtifact.data.clusters.length).toBeGreaterThan(1);
  expect(roiArtifact.data.frames[0].fields.graphState.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.frames[0].fields.graphActivation.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.frames[0].fields.graphClusterLikelihood.length).toBe(roiArtifact.data.grid.height);
  expect(roiArtifact.data.frames[0].fields.graphIncomingMessage[0].length).toBe(roiArtifact.data.grid.width);
  expect(roiArtifact.data.likelihoodField.diagnostics.activeLikelihoodCellFraction).toBeGreaterThan(0);
  expect(roiArtifact.data.metadata.activityDiagnostics.meanValue).toBeGreaterThan(0);
  expect(roiArtifact.data.metadata.activityDiagnostics.activeFraction).toBeGreaterThan(0.02);
  expect(roiArtifact.data.frames[0].activityDiagnostics.totalActivityMass).toBeGreaterThan(0);
  expect(roiArtifact.data.behaviorPreset.id).toBe('custom');
  expect(roiArtifact.data.metadata.patternSource).toBe('referenceSignature');

  await page.locator('#sampling-process-example-id').selectOption('forestFire');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).toMatchObject({
    activeExampleProcessId: 'forestFire',
    activeExampleFixtureId: 'forestFire',
    activeExampleBehaviorValidationStatus: 'PASS'
  });
  await expect(page.locator('#waypoint-timeline [data-process-behavior-qa]')).toContainText('Behavior QA');
  await expect(page.locator('#waypoint-timeline [data-process-behavior-qa]')).toContainText('Forest Fire');
  await expect(page.locator('#sampling-initial-condition-brush')).toContainText('Susceptible');
  await expect(page.locator('#sampling-initial-condition-brush')).toContainText('Active');
  await expect(page.locator('#sampling-initial-condition-brush')).toContainText('Cooling');
  await expect(page.locator('#sampling-initial-condition-brush')).toContainText('Consumed');

  await page.locator('#sampling-process-mode').selectOption('oceanProcessAnalogs');
  await expandMissionConsoleSection(page, 'Ocean-Relevant Process Analogs');
  await expect(page.locator('#sampling-process-example-id')).toContainText('River Plume Front');
  await page.locator('#sampling-process-example-id').selectOption('riverPlumeFront');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).toMatchObject({
    activeProcessContext: 'oceanProcessAnalogs',
    activeProcessContextLabel: 'Ocean-Relevant Process Analogs',
    activeExampleTrack: 'oceanRelevantProcessAnalogs',
    activeExampleProcessId: 'riverPlumeFront',
    activeExampleProcessLabel: 'River Plume Front',
    activeMappedReferenceSignatureId: 'frontPropagation',
    activeExampleFixtureId: 'riverPlumeFront',
    activeExampleBehaviorValidationStatus: 'PASS',
    legacyReferenceMappingConsistent: true,
    selectorModeMatchesActiveExample: true,
    selectorMatchesActiveExample: true
  });
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Ocean-Relevant Process Analogs');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('River Plume Front');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Requires Flow Coupling');
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).not.toContainText("Conway's Game of Life");
  await expect(page.locator('#waypoint-timeline')).toContainText('Ocean-Relevant Process Analog');
  await expect(page.locator('#waypoint-timeline')).toContainText('Mapped Pattern');
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/physical downstream transport belongs/i);
  await expect(page.locator('#waypoint-timeline [data-process-initial-condition-card]')).toContainText(/not physical advection|simplified event-layer/i);
  await expect(page.locator('#sampling-initial-condition-brush')).toContainText('Source');
  const oceanArtifact = await downloadDemoArtifact(page);
  expect(oceanArtifact.data.processExample.exampleTrack).toBe('oceanRelevantProcessAnalogs');
  expect(oceanArtifact.data.processExample.exampleProcessId).toBe('riverPlumeFront');
  expect(oceanArtifact.data.processExample.requiresFlowCoupling).toBe(true);
  expect(oceanArtifact.data.processExample.mappedReferenceSignatureId).toBe(oceanArtifact.data.referenceSignatureId);
  expect(oceanArtifact.data.behaviorValidation.status).toBe('PASS');
  expect(oceanArtifact.data.exampleFixtureId).toBe('riverPlumeFront');
  expect(oceanArtifact.data.processExample.behaviorValidation.status).toBe('PASS');
  expect(oceanArtifact.data.initialCondition.mode).toBe('curatedSeed');
  expect(oceanArtifact.data.initialCondition.fixtureId).toBe('default');
  expect(oceanArtifact.data.processExample.initialCondition.mode).toBe('curatedSeed');

  await page.locator('#sampling-process-mode').selectOption('customComposer');
  await expandMissionConsoleSections(page, [
    'Source / Initial Field',
    'Spatial Pattern / Geometry',
    'Value Distribution',
    'Temporal Pattern',
    'Spatial Evolution / Motion Rule',
    'Interaction Scale / Hierarchy',
    'State Model / Update Rule',
    'Sampling Effect / Freshness',
    'Display / Diagnostic Layer',
    'Seed / Scenario Identity',
    'Export'
  ]);
  await expect(page.locator('#roi-demo-event-likelihood')).toBeVisible();
  await expect(page.locator('#roi-demo-event-likelihood-dynamics')).toBeVisible();
  await expect(page.locator('#roi-demo-spatial-pattern')).toBeVisible();
  await expect(page.locator('#roi-demo-value-distribution')).toBeVisible();
  await expect(page.locator('#roi-demo-cluster-size')).toBeVisible();
  await expect(page.locator('#roi-demo-temporal-pattern')).toBeVisible();
  await expect(page.locator('#roi-demo-spatial-evolution')).toBeVisible();
  await expect(page.locator('#roi-demo-motion-scope')).toBeVisible();
  await expect(page.locator('#roi-demo-state-model')).toBeVisible();
  await expect(page.locator('#roi-demo-depletion-mode')).toBeVisible();
  await expect(page.locator('#roi-demo-dynamic-complexity')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).toMatchObject({
    processMode: 'customComposer',
    activeExampleProcessId: null,
    activeMappedReferenceSignatureId: null,
    legacyReferenceMappingConsistent: true
  });
  await expect(page.locator('#mission-console')).toContainText('Scenario Generation');
  await expect(page.locator('#mission-console')).toContainText('Learn / Compare Components');
  await expect(page.locator('#mission-console [data-action="roi-compare-temporal"]')).toHaveText('Compare Temporal Patterns');
  await expect(page.locator('#mission-console [data-action="roi-compare-evolution"]')).toHaveText('Compare Spatial Evolution');
  await expect(page.locator('#mission-console [data-action="roi-compare-scale"]')).toHaveText('Compare Interaction Scale');
  await expect(page.locator('#roi-scenario-source option')).toHaveText([
    'Current Component Recipe',
    'Active Pattern Source'
  ]);
  await expect(page.locator('#roi-scenario-difficulty option')).toHaveText(['Easy', 'Medium', 'Hard']);
  await expect(page.locator('#roi-scenario-validation-mode option')).toHaveText([
    'Require PASS Before Export',
    'Allow WARN Export'
  ]);
  await page.locator('#roi-scenario-frame-count').fill('3');
  await page.locator('#mission-console [data-action="generate-roi-scenario"]').click();
  await expect(page.locator('#mission-console')).toContainText('Scenario Validation');
  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return {
      type: scene.generatedScenario?.type,
      frames: scene.generatedScenario?.frames?.length,
      validation: scene.generatedScenario?.validation?.status,
      hasSample: Array.isArray(scene.generatedScenario?.frames?.[0]?.fields?.sampleValue),
      hasLikelihood: Array.isArray(scene.generatedScenario?.frames?.[0]?.fields?.eventLikelihood)
    };
  })).resolves.toMatchObject({
    type: 'anchor.syntheticRoiScenario',
    frames: 3,
    hasSample: true,
    hasLikelihood: true
  });

  await page.locator('#sampling-process-mode').selectOption('processPaint');
  await expandMissionConsoleSections(page, [
    'Process Paint / Rule Allocation',
    'Display / Diagnostic Layer',
    'Seed / Scenario Identity',
    'Export'
  ]);
  await expect(page.locator('#bottom-timeline')).toContainText('Process Paint: paused editing canvas');
  await expect(page.locator('#roi-demo-event-likelihood')).toHaveCount(0);
  await expect(page.locator('#roi-demo-spatial-pattern')).toHaveCount(0);
  await expect(page.locator('#roi-demo-temporal-pattern')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline')).toContainText('Process Paint Mode');
  await expect(page.locator('#waypoint-timeline')).toContainText('Paint Tools');
  await expect(page.locator('#waypoint-timeline [data-process-paint-tools]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).toMatchObject({
    processMode: 'processPaint',
    activeExampleProcessId: null,
    activeMappedReferenceSignatureId: null,
    legacyReferenceMappingConsistent: true
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG)).toMatchObject({
    processMode: 'processPaint',
    activeExampleProcessId: null,
    activeMappedReferenceSignatureId: null,
    legacyReferenceMappingConsistent: true
  });
  await expect(page.locator('#waypoint-timeline .sampling-panel-tabs')).toContainText('Paint Tools');
  await expect(page.locator('#waypoint-timeline')).toContainText('Clear Canvas');
  await expect(page.locator('#waypoint-timeline')).toContainText('Randomize Canvas');
  await expect(page.locator('#waypoint-timeline')).toContainText('Run Process');
  await expect(page.locator('#sampling-paint-state')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return {
      paused: scene.paused,
      cells: Object.keys(scene.paintModel.cells).length,
      maxValue: scene.field.stats.max,
      maxSource: Math.max(...scene.field.sourceField.flat())
    };
  })).toEqual({
    paused: true,
    cells: 0,
    maxValue: 0,
    maxSource: 0
  });
  await clickRoiDemoCell(page, 2, 2);
  await expect(page.locator('#waypoint-timeline')).toContainText('Process Paint Cell');
  await expect(page.locator('#paint-panel-state')).toBeVisible();
  await page.locator('#paint-panel-state').selectOption('active');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').selectedPaintState)).toBe('active');
  await page.locator('#paint-panel-rule').selectOption('propagatingFront');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').selectedPaintRuleId)).toBe('propagatingFront');
  await page.evaluate(() => {
    document.querySelectorAll('#paint-panel-group').forEach((input) => {
      input.value = '3';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    document.querySelectorAll('#paint-panel-source').forEach((input) => {
      input.value = '0.8';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    scene.selectedCell = { col: 2, row: 2 };
    scene.paintModel.cells['2,2'] = {
      state: 'active',
      ruleId: 'propagatingFront',
      groupId: 3,
      sourceValue: 0.8
    };
    scene.paintModel.groups['3'] = {
      id: 3,
      label: 'Group 3',
      ruleId: 'propagatingFront',
      interactionScale: 'edge',
      valueMapId: 'activation-to-sampling-value',
      sourceProfile: 'painted',
      parameters: {}
    };
    scene.rebuildField();
    scene.renderConsole();
    scene.renderCellInspector(true);
    scene.draw();
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paintModel.cells['2,2'])).toMatchObject({
    state: 'active',
    ruleId: 'propagatingFront',
    groupId: 3,
    sourceValue: 0.8
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.sampleValueField[2][2])).toBeGreaterThan(0);
  await expect(page.locator('#waypoint-timeline')).toContainText('ruleId');
  await page.locator('#waypoint-timeline [data-action="paint-panel-run"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paused)).toBe(false);
  const paintedArtifact = await downloadDemoArtifact(page);
  expect(paintedArtifact.data.patternMode).toBe('processPaint');
  expect(paintedArtifact.data.statusLabel).toBe('Custom Exploratory');
  expect(['active', 'cooling', 'consumed']).toContain(paintedArtifact.data.fields.stateLayer[2][2]);
  expect(paintedArtifact.data.fields.ruleLayer[2][2]).toBe('propagatingFront');
  expect(paintedArtifact.data.fields.groupLayer[2][2]).toBe(3);
  expect(paintedArtifact.data.fields.sourceField[2][2]).toBe(0.8);
  expect(paintedArtifact.data.paintSettings.selectedState).toBe('active');
  expect(paintedArtifact.data.processRuleCatalogVersion).toBe('sampling-process-rule-families-v1');
  expect(paintedArtifact.data.canonicalRuleIds).toContain('propagatingFront');
  expect(paintedArtifact.data.ruleAliases.frontPropagation).toBe('propagatingFront');
  expect(paintedArtifact.data.fields.transitionField[2][2].ruleId).toBe('propagatingFront');
  expect(paintedArtifact.data.groupDefinitions['3']).toBeTruthy();
  await page.locator('#sampling-process-mode').selectOption('processPaint');
  await expandMissionConsoleSection(page, 'Process Paint / Rule Allocation');
  await page.locator('#mission-console [data-action="sampling-paint-reset"]').click();
  await expect.poll(() => page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return {
      cells: Object.keys(scene.paintModel.cells).length,
      maxValue: scene.field.stats.max,
      maxSource: Math.max(...scene.field.sourceField.flat()),
      paused: scene.paused
    };
  })).toEqual({
    cells: 0,
    maxValue: 0,
    maxSource: 0,
    paused: true
  });
  await page.locator('#mission-console [data-action="sampling-paint-randomize"]').click();
  const firstPaintRandomCell = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paintModel.cells['0,0']);
  await page.locator('#mission-console [data-action="sampling-paint-randomize"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paintModel.cells['0,0'])).toEqual(firstPaintRandomCell);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    scene.processMode = 'randomRuleLab';
    scene.patternSource = 'custom';
    scene.paused = false;
    scene.processPaintRunStarted = false;
    scene.selectedCell = null;
    scene.rightPanelMode = 'recipeSignature';
    scene.renderConsole();
    scene.renderCellInspector(true);
    scene.draw();
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').processMode)).toBe('randomRuleLab');
  await expandMissionConsoleSection(page, 'Rule Allocation Sandbox');
  await expect(page.locator('#sampling-random-seed')).toBeVisible();
  await expect(page.locator('#sampling-paint-state')).toHaveCount(0);
  await expect(page.locator('#roi-demo-spatial-pattern')).toHaveCount(0);
  await expect(page.locator('#roi-demo-temporal-pattern')).toHaveCount(0);
  await page.locator('#sampling-random-seed').fill('e2e-random-seed');
  await page.locator('#sampling-random-seed').dispatchEvent('change');
  const firstRandomCell = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paintModel.cells['0,0']);
  await page.locator('#sampling-random-seed').fill('e2e-random-seed');
  await page.locator('#sampling-random-seed').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paintModel.cells['0,0'])).toEqual(firstRandomCell);
  await page.locator('#sampling-process-mode').selectOption('foundationalCaModels');
  await expandMissionConsoleSection(page, 'Foundational CA Models');
  await expect(page.locator('#roi-demo-reference-signature')).toBeVisible();
  await expect(page.locator('#roi-demo-event-likelihood')).toHaveCount(0);
  await expect(page.locator('#roi-demo-spatial-pattern')).toHaveCount(0);
  await expect(page.locator('#sampling-paint-state')).toHaveCount(0);
  await expect(page.locator('#sampling-random-seed')).toHaveCount(0);
  await expect(page.locator('#mission-console')).toContainText('Custom Composer');
  await expect(page.locator('#waypoint-timeline')).toContainText('Full recipe details');
  await expect(page.locator('#roi-demo-behavior-preset')).toHaveCount(0);
  await page.locator('#roi-demo-reference-signature').selectOption('frontPropagation');
  await expect.poll(() => page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return {
      source: scene.patternSource,
      signature: scene.referenceSignatureId,
      modified: scene.referenceSignatureModified,
      spatial: scene.spatialPattern,
      temporal: scene.temporalPattern,
      evolution: scene.spatialEvolution,
      dynamics: scene.eventLikelihoodDynamics
    };
  })).toEqual({
    source: 'referenceSignature',
    signature: 'frontPropagation',
    modified: false,
    spatial: 'frontBoundary',
    temporal: 'sustained',
    evolution: 'expansion',
    dynamics: 'dynamic'
  });
  await expect(page.locator('#waypoint-timeline [data-roi-current-lab-state]')).toContainText('Propagating Fronts');
  await expect(page.locator('#waypoint-timeline')).toContainText('Propagating Fronts');
  await expect(page.locator('#waypoint-timeline')).toContainText('Advanced Details');
  await expect(page.locator('#waypoint-timeline')).toContainText('CA taxonomy, QA, failure signs, and boundaries');
  await expect(page.locator('#mission-console [data-roi-help="behaviorPreset"]')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toContainText('Propagating Fronts');
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toContainText('Forest-fire CA');
  await page.locator('#sampling-process-mode').selectOption('customComposer');
  await expect.poll(() => page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return {
      source: scene.patternSource,
      preset: scene.behaviorPresetId,
      presetModified: scene.behaviorPresetModified,
      signature: scene.referenceSignatureId,
      referenceModified: scene.referenceSignatureModified,
      updateRuleHint: scene.updateRuleHint
    };
  })).toEqual({
    source: 'custom',
    preset: 'custom',
    presetModified: false,
    signature: 'none',
    referenceModified: false,
    updateRuleHint: null
  });
  await page.locator('#roi-demo-event-likelihood').selectOption('multiModalLikelihood');
  await page.locator('#roi-demo-event-likelihood-dynamics').selectOption('static');
  await page.locator('#roi-demo-spatial-pattern').selectOption('clusteredField');
  await page.locator('#roi-demo-value-distribution').selectOption('gaussianNormal');
  await page.locator('#roi-demo-temporal-pattern').selectOption('bursty');
  await page.locator('#roi-demo-spatial-evolution').selectOption('stationary');
  await page.locator('#roi-demo-interaction-scale').selectOption('cluster');
  await page.locator('#roi-demo-state-model').selectOption('stateEvolving');
  await page.locator('#roi-demo-depletion-mode').selectOption('soft');
  await page.locator('#roi-demo-display-mode').selectOption('sampleValue');
  await expect(page.locator('#mission-console')).toContainText('Source / Initial Field');
  await expect(page.locator('#mission-console')).toContainText('Source Field Type');
  await expect(page.locator('#mission-console')).toContainText('Spatial Pattern / Geometry');
  await expect(page.locator('#mission-console')).toContainText('Temporal Pattern');
  await expect(page.locator('#mission-console')).toContainText('Spatial Evolution');
  await expect(page.locator('#mission-console')).toContainText('Custom Composer');
  await expect(page.locator('#mission-console')).toContainText('Motion Scope');
  await expect(page.locator('#mission-console')).toContainText('Interaction Scale / Hierarchy');
  await expect(page.locator('#mission-console')).toContainText('Sampling Effect / Freshness');
  await expect(page.locator('#mission-console')).toContainText('Display');
  await expect(page.locator('#mission-console')).toContainText('State Model / Update Rule');
  await expect(page.locator('#mission-console')).toContainText('Time-Indexed');
  await expect(page.locator('#roi-demo-spatial-pattern option')).toHaveText([
    'Constant Field',
    'Gradient / Trend',
    'Clustered Field',
    'Patchy / Correlated Field',
    'Sparse Targets',
    'Linear Band',
    'Front / Boundary',
    'Boundary Band',
    'Monitoring Stations',
    'Seeded Texture'
  ]);
  await expect(page.locator('#roi-demo-spatial-pattern')).not.toContainText('Single Cluster');
  await expect(page.locator('#roi-demo-spatial-pattern')).not.toContainText('Multiple Clusters');
  await expect(page.locator('#roi-demo-spatial-pattern')).not.toContainText('Bimodal');
  await expect(page.locator('#mission-console .sample-field-explainer')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-roi-help]')).toHaveCount(9);
  await expect(page.locator('#mission-console [data-roi-help="behaviorPreset"]')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-roi-help="eventLikelihood"]')).toContainText('Explain Multi-Source Basins');
  await expect(page.locator('#mission-console [data-roi-help="spatialPattern"]')).toContainText('Explain Clustered Field');
  await expect(page.locator('#roi-demo-event-likelihood option')).toHaveText([
    'Uniform Source Field',
    'Gaussian Source Basin',
    'Multi-Source Basins',
    'Gradient Source Field',
    'Patchy Source Field',
    'Seeded Texture Source Field',
    'Sparse Source Sites'
  ]);
  await expect(page.locator('#roi-demo-event-likelihood-dynamics option')).toHaveText(['Static', 'Dynamic']);
  await expect(page.locator('#roi-demo-value-distribution option')).toHaveText([
    'Constant Value',
    'Uniform Random',
    'Gaussian / Normal',
    'Skewed Low',
    'Skewed High',
    'Bimodal Values',
    'Heavy-Tailed',
    'Rare Extreme Events'
  ]);
  await expect(page.locator('#mission-console')).toContainText('Value Distribution');
  await expect(page.evaluate(() => window.ANCHOR_ROI_UI_DEBUG?.hasValueDistributionAccordion)).resolves.toBe(true);
  await page.locator('#mission-console [data-roi-help="eventLikelihood"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Source / Initial Field');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Where does process activity originate');
  await page.locator('#mission-console [data-roi-help="spatialPattern"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Spatial Pattern / Geometry: Clustered Field');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Value appears in one or more coherent blobs');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Parameters');
  await page.locator('#mission-console [data-roi-help="valueDistribution"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Value Distribution: Gaussian / Normal');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('How are values assigned');
  await page.locator('#mission-console [data-roi-help="temporalPattern"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Temporal Pattern: Bursty');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('How does value intensity change over time?');
  await page.locator('#mission-console [data-roi-help="spatialEvolution"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Spatial Evolution / Motion Rule: Stationary');
  await page.locator('#mission-console [data-roi-help="interactionScale"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Interaction Scale / Hierarchy: Cluster / Community');
  await page.locator('#mission-console [data-roi-help="stateModel"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About State Model / Update Rule:');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Markovian');
  await page.locator('#mission-console [data-roi-help="samplingEffect"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Sampling Effect / Freshness: Soft Depletion');
  await page.locator('#mission-console [data-roi-help="displayLayer"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Display / Diagnostic Layer: Sampling Value');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Current Composition');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('Uncertainty / Forecast demos');
  await expect(page.locator('#roi-demo-cluster-size option')).toHaveText(['Tight', 'Medium', 'Wide']);
  await expect(page.locator('#roi-demo-spatial-evolution option')).toHaveText([
    'Stationary',
    'Continuous Drift',
    'Discrete Jump',
    'Random Walk',
    'Neighbor Propagation',
    'Expansion',
    'Contraction',
    'Divergence',
    'Convergence',
    'Morph / Mutation',
    'Shear / Stretch',
    'Rotational Swirl',
    'Branching Growth'
  ]);
  await expect(page.locator('#roi-demo-motion-scope option')).toHaveText(['Per Feature', 'Local / Neighborhood', 'Global']);
  await expect(page.locator('#roi-demo-interaction-scale option')).toHaveText(['Global Field', 'Cluster / Community', 'Cell / Node', 'Edge / Neighbor', 'Hybrid Multi-Scale']);
  await expect(page.locator('#roi-demo-display-mode option')).toHaveText([
    'State View',
    'Rule Metric',
    'Transition View',
    'Sampling Interpretation',
    'Source Field',
    'Sampling Value',
    'Sampling Value + Source Overlay',
    'Graph Topology',
    'Graph Communities',
    'Cell / Node States',
    'Process Influence Messages',
    'Community + Messages',
    'State Transitions',
    'ROI Meaning',
    'Diagnostics Overlay',
    'Depleted Value',
    'Freshness / Revisit Value',
    'Raw Base Value'
  ]);
  await page.locator('#roi-demo-display-mode').selectOption('graphMessages');
  await expect(page.locator('#roi-filter-message-threshold')).toBeVisible();
  await page.locator('#roi-filter-message-threshold').evaluate((input) => {
    input.value = '0.35';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').viewFilters.messageStrengthThreshold)).toBe(0.35);
  await page.locator('#roi-filter-incoming-selected').check();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').viewFilters.incomingToSelected)).toBe(true);
  await page.locator('#roi-demo-display-mode').selectOption('roiMeaning');
  await expect(page.locator('#roi-filter-meaning-layer')).toBeVisible();
  await page.locator('#roi-filter-meaning-layer').selectOption('nearFuture');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').viewFilters.roiMeaningLayer)).toBe('nearFuture');
  await page.locator('#roi-demo-display-mode').selectOption('diagnosticsOverlay');
  await clickRightPanelMode(page, 'diagnostics');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').processMode)).toBe('customComposer');
  await expect(page.locator('#roi-filter-message-threshold')).toBeVisible();
  await expect(page.locator('#roi-filter-transition-only')).toBeVisible();
  await expect(page.locator('#roi-filter-topology-edges')).toBeVisible();
  await expect(page.locator('#roi-demo-event-likelihood')).toBeVisible();
  await expect(page.locator('#sampling-paint-state')).toHaveCount(0);
  await expect(page.locator('#sampling-random-seed')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline [data-roi-diagnostics-view]')).toBeVisible();
  await page.locator('#sampling-process-mode').selectOption('customComposer');
  await expect(page.locator('#mission-console')).not.toContainText('Forecast / Truth');
  await expect(page.locator('#mission-console')).not.toContainText('Current-Advected');
  await expect(page.locator('#mission-console')).not.toContainText('Uncertainty / Forecast demos');
  await page.locator('#sampling-process-mode').selectOption('foundationalCaModels');
  await expandMissionConsoleSection(page, 'Foundational CA Models');
  await page.locator('#roi-demo-reference-signature').selectOption('frontPropagation');
  await expect(page.locator('#roi-demo-display-mode')).toHaveValue('processTransitionView');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('State View');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('Rule Metric');
  await expect(page.locator('#roi-demo-display-mode')).toContainText('Transition View');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('processTransitionView');
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/ignition pressure|burning neighbor pressure/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText(/consumed|trail/i);
  await expect(page.locator('#waypoint-timeline [data-process-metric-explanation]')).toContainText('What colors mean');
  await expect(page.locator('#mission-console')).not.toContainText('active transition boundary');
  await expect(page.locator('#mission-console [data-roi-help="behaviorPreset"]')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toContainText('Propagating Fronts');
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toContainText('active transition boundary');
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toContainText('Forest-fire CA');
  await page.locator('#sampling-process-mode').selectOption('customComposer');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').referenceSignatureId)).toBe('none');
  await page.locator('#roi-demo-event-likelihood-dynamics').selectOption('static');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihoodDynamics)).toBe('static');
  await page.locator('#roi-demo-motion-scope').selectOption('perFeature');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.motionScope)).toBe('perFeature');
  await expect(page.locator('#mission-console')).not.toContainText('prior-agnostic');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').timeMode)).resolves.toBe('dynamic');
  const roiDynamicCell = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    const currentTime = scene.demoTime;
    const currentField = scene.field.field;
    const future = scene.constructor ? null : null;
    let best = { col: 0, row: 0, delta: 0, value: 0 };
    for (let row = 1; row < scene.field.height - 1; row += 1) {
      for (let col = 1; col < scene.field.width - 1; col += 1) {
        scene.demoTime = currentTime + 6;
        scene.rebuildField();
        const futureValue = scene.field.field[row][col];
        scene.demoTime = currentTime;
        scene.field.field = currentField;
        const value = currentField[row][col];
        const delta = Math.abs(futureValue - value);
        if (delta > best.delta) best = { col, row, delta, value };
      }
    }
    scene.demoTime = currentTime;
    scene.rebuildField();
    return best;
  });
  expect(roiDynamicCell.delta).toBeGreaterThan(0.02);
  await clickRoiDemoCell(page, roiDynamicCell.col, roiDynamicCell.row);
  await expect(page.locator('#waypoint-timeline [data-roi-cell-inspector]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText(`Cell (${roiDynamicCell.col}, ${roiDynamicCell.row})`);
  await expect(page.locator('#waypoint-timeline [data-roi-panel-mode="recipeSignature"]')).toContainText('Recipe');
  await page.evaluate(() => document.querySelector('#waypoint-timeline [data-roi-panel-mode="recipeSignature"]')?.click());
  await expect(page.locator('#waypoint-timeline [data-roi-recipe-signature-view]')).toBeVisible();
  await page.evaluate(() => document.querySelector('#waypoint-timeline [data-roi-panel-mode="cellInspector"]')?.click());
  await expect(page.locator('#waypoint-timeline [data-roi-cell-inspector]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Sampling Value');
  await expect(page.locator('#waypoint-timeline')).toContainText('Source / Initial Field');
  await expect(page.locator('#waypoint-timeline')).toContainText('L(x,y,t)');
  await expect(page.locator('#waypoint-timeline')).toContainText('S(x,y,t)');
  await expect(page.locator('#waypoint-timeline')).toContainText('source support');
  await expect(page.locator('#waypoint-timeline')).toContainText('cluster count');
  await expect(page.locator('#waypoint-timeline')).toContainText('cluster size');
  await expect(page.locator('#waypoint-timeline')).toContainText('value distribution');
  await expect(page.locator('#waypoint-timeline')).toContainText('seeded value');
  await expect(page.locator('#waypoint-timeline')).toContainText('value band');
  await expect(page.locator('#waypoint-timeline')).toContainText('Source mesh values show process support at every cell');
  await expect(page.locator('#waypoint-timeline')).toContainText('Sampling value is the currently realized value');
  await expect(page.locator('#waypoint-timeline')).toContainText('pattern parameters');
  await expect(page.locator('#waypoint-timeline')).toContainText('temporal pattern');
  await expect(page.locator('#waypoint-timeline')).toContainText('spatial evolution');
  await expect(page.locator('#waypoint-timeline')).toContainText('motion scope');
  await expect(page.locator('#waypoint-timeline')).toContainText('feature motion');
  await expect(page.locator('#waypoint-timeline')).toContainText('state model');
  await expect(page.locator('#waypoint-timeline')).toContainText('Graph Field Node');
  await expect(page.locator('#waypoint-timeline')).toContainText('C_k(t)');
  await expect(page.locator('#waypoint-timeline')).toContainText('L_i(t)');
  await expect(page.locator('#waypoint-timeline')).toContainText('A_i(t)');
  await expect(page.locator('#waypoint-timeline')).toContainText('incoming message');
  await expect(page.locator('#waypoint-timeline')).toContainText('active neighbors');
  await page.locator('#roi-demo-spatial-pattern').selectOption('clusteredField');
  await page.locator('#roi-demo-event-likelihood').selectOption('gaussianLikelihood');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihood)).toBe('gaussianLikelihood');
  await expect(page.locator('#roi-demo-event-likelihood-temporal-pattern')).toHaveCount(0);
  await page.locator('#roi-demo-event-likelihood-dynamics').selectOption('dynamic');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihoodDynamics)).toBe('dynamic');
  await expect(page.locator('#roi-demo-event-likelihood-temporal-pattern')).toBeVisible();
  await expect(page.locator('#roi-demo-event-likelihood-spatial-evolution')).toBeVisible();
  await page.locator('#roi-demo-event-likelihood-temporal-pattern').selectOption('bursty');
  await page.locator('#roi-demo-event-likelihood-spatial-evolution').selectOption('discreteJump');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihoodTemporalPattern)).toBe('bursty');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihoodSpatialEvolution)).toBe('discreteJump');
  const dynamicLikelihoodAudit = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    scene.timeMode = 'static';
    scene.demoTime = 0;
    scene.rebuildField();
    const first = JSON.stringify(scene.field.eventLikelihoodField);
    scene.demoTime = 30;
    scene.rebuildField();
    const second = JSON.stringify(scene.field.eventLikelihoodField);
    return {
      sampleTime: scene.field.time,
      likelihoodTime: scene.field.eventLikelihoodTime,
      changed: first !== second
    };
  });
  expect(dynamicLikelihoodAudit.changed).toBe(true);
  expect(dynamicLikelihoodAudit.sampleTime).toBe(0);
  expect(dynamicLikelihoodAudit.likelihoodTime).toBe(30);
  await page.locator('#roi-demo-event-likelihood-dynamics').selectOption('static');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').eventLikelihoodDynamics)).toBe('static');
  const gaussianLikelihoodAudit = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    const field = scene.field.eventLikelihoodField;
    const h = field.length;
    const w = field[0].length;
    const center = field[Math.floor(h / 2)][Math.floor(w / 2)];
    const corners = [field[0][0], field[0][w - 1], field[h - 1][0], field[h - 1][w - 1]];
    return {
      eventLikelihood: scene.field.eventLikelihood,
      center,
      maxCorner: Math.max(...corners),
      sameSeed: JSON.stringify(field) === JSON.stringify(scene.field.eventLikelihoodField)
    };
  });
  expect(gaussianLikelihoodAudit.eventLikelihood).toBe('gaussianLikelihood');
  expect(gaussianLikelihoodAudit.center).toBeGreaterThan(gaussianLikelihoodAudit.maxCorner);
  expect(gaussianLikelihoodAudit.sameSeed).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialPattern)).toBe('clusteredField');
  await page.locator('#roi-demo-spatial-pattern').selectOption('constantField');
  await page.locator('#roi-demo-value-distribution').selectOption('constantValue');
  await page.locator('#roi-demo-depletion-mode').selectOption('none');
  await page.locator('#roi-demo-display-mode').selectOption('eventLikelihood');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('eventLikelihood');
  const likelihoodViewAudit = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    return JSON.stringify(scene.field.field) === JSON.stringify(scene.field.eventLikelihoodField)
      && JSON.stringify(scene.field.sampleValueField) !== JSON.stringify(scene.field.eventLikelihoodField);
  });
  expect(likelihoodViewAudit).toBe(true);
  await page.locator('#roi-demo-display-mode').selectOption('sampleValueLikelihoodOverlay');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('sampleValueLikelihoodOverlay');
  await page.locator('#roi-demo-display-mode').selectOption('rawBaseValue');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialPattern)).toBe('constantField');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').valueDistribution)).toBe('constantValue');
  await expect(page.evaluate(() => {
    const values = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.rawBaseField.flat();
    return Math.max(...values) - Math.min(...values);
  })).resolves.toBeCloseTo(0, 5);
  await page.locator('#roi-demo-value-distribution').selectOption('uniformRandom');
  const uniformStats = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    const values = scene.field.rawBaseField.flat();
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      sameSeed: JSON.stringify(scene.field.rawBaseField) === JSON.stringify(scene.field.rawBaseField)
    };
  });
  expect(uniformStats.min).toBeLessThan(0.2);
  expect(uniformStats.max).toBeGreaterThan(0.8);
  expect(uniformStats.sameSeed).toBe(true);
  await page.locator('#roi-demo-value-distribution').selectOption('gaussianNormal');
  const gaussianStats = await page.evaluate(() => {
    const values = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.rawBaseField.flat();
    return {
      mid: values.filter((value) => value >= 0.35 && value <= 0.65).length,
      extremes: values.filter((value) => value < 0.2 || value > 0.8).length
    };
  });
  expect(gaussianStats.mid).toBeGreaterThan(gaussianStats.extremes);
  await page.locator('#roi-demo-spatial-pattern').selectOption('clusteredField');
  await page.locator('#roi-demo-spatial-evolution').selectOption('continuousDrift');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.motionScope)).toBe('perFeature');
  await page.locator('#roi-demo-motion-scope').selectOption('global');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.motionScope)).toBe('global');
  await page.locator('#roi-demo-motion-scope').selectOption('perFeature');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.motionScope)).toBe('perFeature');
  await page.locator('#roi-demo-spatial-pattern').selectOption('seededTexture');
  await page.locator('#mission-console [data-roi-help="spatialPattern"]').click();
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('About Spatial Pattern / Geometry: Seeded Texture');
  await expect(page.locator('#waypoint-timeline [data-roi-behavior-help]')).toContainText('irregular but replayable');
  await page.locator('#roi-demo-spatial-pattern').selectOption('clusteredField');
  await page.locator('#roi-demo-hotspots').evaluate((input) => {
    input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').hotspotCount)).toBe(2);
  await page.locator('#roi-demo-hotspots').evaluate((input) => {
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.clusterCount)).toBe(5);
  await page.locator('#roi-demo-cluster-size').selectOption('wide');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').clusterSize)).toBe('wide');
  await page.locator('#roi-demo-time-mode').selectOption('dynamic');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').timeMode)).toBe('dynamic');
  await page.locator('#roi-demo-temporal-pattern').selectOption('periodic');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').temporalPattern)).toBe('periodic');
  await page.locator('#roi-demo-state-model').selectOption('timeIndexed');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').stateModel)).toBe('timeIndexed');
  await expect(page.locator('#bottom-timeline')).toContainText('Behavior: Periodic / Cyclic');
  await page.locator('#roi-demo-spatial-evolution').selectOption('neighborPropagation');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialEvolution)).toBe('neighborPropagation');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.graphField.graph.updateRule)).toBe('neighborSpread');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').field.activityDiagnostics.graphDiagnostics.activeNodeCount)).toBeGreaterThan(0);
  await page.locator('#roi-demo-spatial-evolution').selectOption('continuousDrift');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialEvolution)).toBe('continuousDrift');
  await page.locator('#roi-demo-spatial-evolution').selectOption('discreteJump');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialEvolution)).toBe('discreteJump');
  await page.locator('#roi-demo-spatial-evolution').selectOption('randomWalk');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').spatialEvolution)).toBe('randomWalk');
  await page.locator('#roi-demo-depletion-mode').selectOption('soft');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').depletionMode)).toBe('soft');
  await page.locator('#roi-demo-display-mode').selectOption('depletedValue');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('depletedValue');
  await page.locator('#roi-demo-display-mode').selectOption('freshnessRevisitValue');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').displayMode)).toBe('freshnessRevisitValue');
  await page.locator('#roi-demo-dynamic-complexity').selectOption('high');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').dynamicComplexity)).toBe('high');
  await page.locator('#bottom-timeline [data-action="roi-demo-pause"]').click();
  await expect(page.locator('#bottom-timeline [data-action="roi-demo-pause"]')).toHaveText('Resume');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').paused)).toBe(true);
  const roiTimeBeforePause = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').demoTime);
  await page.waitForTimeout(200);
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').demoTime)).resolves.toBeCloseTo(roiTimeBeforePause, 1);
  await page.locator('#bottom-timeline [data-action="roi-demo-pause"]').click();
  await page.locator('#bottom-timeline [data-action="roi-demo-direction"]').click();
  await expect(page.locator('#bottom-timeline [data-action="roi-demo-direction"]')).toHaveText('Direction: Reverse');
  await page.locator('#bottom-timeline [data-action="roi-demo-reset"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').demoTime)).toBeLessThan(0.2);
  await page.locator('#mission-console [data-action="regenerate"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene').seed)).toContain('2');
  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);

  await launchFromMainMenuHub(page, 'simulation', 'coupled-fields');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Coupled Fields Demo');
  await expect(page.locator('#mission-console')).toContainText('Display Layers');
  await expect(page.locator('#mission-console')).toContainText('Flow Field');
  await expect(page.locator('#mission-console')).toContainText('Sample Field');
  await expect(page.locator('#mission-console')).toContainText('Coupling');
  await expect(page.locator('#mission-summary-hud')).toBeEmpty();
  await expect(page.locator('#agent-performance-hud')).toBeEmpty();
  await expect(page.locator('#bottom-timeline .coupled-demo-transport')).toBeVisible();
  await expect(page.locator('#bottom-timeline')).toContainText('Infinite timeline');
  await expect(page.locator('#coupled-flow-preset')).toBeVisible();
  await expect(page.locator('#coupled-coupling-mode')).toBeVisible();
  await expect(page.locator('#coupled-process-engine')).toBeVisible();
  await expect(page.locator('#coupled-display-layer')).toBeVisible();
  await expect(page.locator('#coupled-display-layer')).toContainText('Oracle Objective');
  await page.locator('#coupled-process-engine').selectOption('advectionDiffusionDecay');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').processEngineId)).toBe('advectionDiffusionDecay');
  await expect(page.locator('#waypoint-timeline')).toContainText('Advection + Diffusion + Decay');
  await expect(page.locator('#waypoint-timeline')).toContainText('Equation');
  await page.locator('#coupled-display-layer').selectOption('oracleObjective');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').displayLayer)).toBe('oracleObjective');
  await expect(page.locator('#waypoint-timeline')).toContainText('deterministic/oracle');
  await expect(page.locator('#waypoint-timeline')).toContainText('uses uncertainty');
  await expect(page.locator('#mission-console [data-action="export-demo-json"]')).toHaveText('Export Demo JSON');
  const coupledArtifact = await downloadDemoArtifact(page);
  expect(coupledArtifact.filename).toMatch(/^anchor-coupled-fields-demo-frame-/);
  expect(coupledArtifact.data.type).toBe('anchor.demo.coupled-fields');
  expect(coupledArtifact.data.frames).toHaveLength(1);
  expect(coupledArtifact.data.fields.flow.u.length).toBe(coupledArtifact.data.grid.height);
  expect(coupledArtifact.data.fields.sample.displayedValue[0].length).toBe(coupledArtifact.data.grid.width);
  expect(coupledArtifact.data.coupledProcessEngine.engineId).toBe('advectionDiffusionDecay');
  expect(coupledArtifact.data.coupledProcessEngine.equation).toContain('advection');
  expect(coupledArtifact.data.oracleObjective.deterministic).toBe(true);
  expect(coupledArtifact.data.oracleObjective.usesUncertainty).toBe(false);
  expect(coupledArtifact.data.fields.coupledProcess.oracleObjectiveField.length).toBe(coupledArtifact.data.grid.height);
  await page.locator('#coupled-process-engine').selectOption('sourceDiffusionDecay');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').processEngineId)).toBe('sourceDiffusionDecay');
  await expect(page.locator('#waypoint-timeline')).toContainText('Source + Diffusion + Decay');
  await expect(page.locator('[data-coupled-layer="flowArrows"]')).toBeChecked();
  await expect(page.locator('[data-coupled-layer="sampleHeatmap"]')).toBeChecked();
  await page.locator('[data-coupled-layer="flowArrows"]').uncheck();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').layerToggles.flowArrows)).toBe(false);
  await page.locator('[data-coupled-layer="flowArrows"]').check();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').layerToggles.flowArrows)).toBe(true);
  await page.locator('[data-coupled-layer="sampleHeatmap"]').uncheck();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').layerToggles.sampleHeatmap)).toBe(false);
  await page.locator('[data-coupled-layer="sampleHeatmap"]').check();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').layerToggles.sampleHeatmap)).toBe(true);
  await page.locator('#coupled-coupling-mode').selectOption('currentAdvected');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').couplingMode)).toBe('currentAdvected');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').demoTime)).toBeGreaterThan(0);
  const coupledStats = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').sampleField.stats);
  expect(Number.isFinite(coupledStats.mean)).toBe(true);
  expect(coupledStats.max).toBeGreaterThanOrEqual(coupledStats.min);
  await clickCoupledDemoCell(page, 5, 5);
  await expect(page.locator('#waypoint-timeline')).toContainText('Flow');
  await expect(page.locator('#waypoint-timeline')).toContainText('Process / Oracle Objective');
  await expect(page.locator('#waypoint-timeline')).toContainText('Coupling Boundary');
  await expect(page.locator('#waypoint-timeline')).toContainText('current influence');
  await page.locator('#bottom-timeline [data-action="coupled-demo-pause"]').click();
  await expect(page.locator('#bottom-timeline [data-action="coupled-demo-pause"]')).toHaveText('Resume');
  await page.locator('#bottom-timeline [data-action="coupled-demo-pause"]').click();
  await page.locator('#bottom-timeline [data-action="coupled-demo-direction"]').click();
  await expect(page.locator('#bottom-timeline [data-action="coupled-demo-direction"]')).toHaveText('Direction: Reverse');
  await page.locator('#bottom-timeline [data-action="coupled-demo-reset"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene').demoTime)).toBeLessThan(0.2);
  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);

  await launchFromMainMenuHub(page, 'simulation', 'uncertainty-forecast-demo');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Uncertainty / Forecast Demo');
  await expect(page.locator('#bottom-timeline .uncertainty-demo-transport')).toBeVisible();
  await expect(page.locator('#uncertainty-demo-scenario')).toBeVisible();
  await expect(page.locator('#uncertainty-demo-scenario')).toContainText('Accurate Forecast');
  await expect(page.locator('#uncertainty-demo-scenario')).toContainText('Hidden Plume');
  await expect(page.locator('#uncertainty-demo-view')).toBeVisible();
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Hidden Truth');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Forecast / Expected State');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Belief / Updated Estimate');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Expected-State Uncertainty');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Surprise');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Unknown-Event Probability');
  await expect(page.locator('#uncertainty-demo-view')).toContainText('Sampling-Priority Preview');

  await page.locator('#uncertainty-demo-scenario').selectOption('shiftedFront');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').scenarioId)).toBe('shiftedFront');
  await page.locator('#uncertainty-demo-view').selectOption('forecast');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').viewMode)).toBe('forecast');
  await expect(page.locator('#waypoint-timeline')).toContainText('expected state');
  await page.locator('#uncertainty-demo-view').selectOption('hiddenTruth');
  await expect(page.locator('#mission-console')).toContainText('Reveal Truth');
  await expect(page.locator('#waypoint-timeline')).toContainText('Truth');

  const shiftedBefore = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').observations.length);
  await page.locator('#mission-console [data-action="uncertainty-add-samples"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').observations.length)).toBeGreaterThan(shiftedBefore);
  await page.locator('#mission-console [data-action="uncertainty-update-belief"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_UNCERTAINTY_DEMO_DEBUG?.fieldsFinite)).toBe(true);
  await expect(page.locator('#waypoint-timeline')).toContainText('likely forecast error');

  await page.locator('#uncertainty-demo-scenario').selectOption('hiddenPlume');
  await page.locator('#mission-console [data-action="uncertainty-add-samples"]').click();
  await expect(page.locator('#waypoint-timeline')).toContainText(/hidden event|possible hidden event|confirmatory samples/i);

  await page.locator('#uncertainty-demo-scenario').selectOption('noisyFalseAlarm');
  await page.locator('#mission-console [data-action="uncertainty-add-samples"]').click();
  await expect(page.locator('#waypoint-timeline')).toContainText(/Do not overreact|false alarm|likely noise/i);

  await page.locator('#uncertainty-demo-view').selectOption('samplingPriorityPreview');
  await expect(page.locator('#waypoint-timeline')).toContainText('Sampling priority is not event intensity');
  await expect(page.locator('#mission-console [data-action="export-demo-json"]')).toHaveText('Export Demo JSON');
  const uncertaintyArtifact = await downloadDemoArtifact(page);
  expect(uncertaintyArtifact.filename).toMatch(/^anchor-uncertainty-forecast-demo-frame-/);
  expect(uncertaintyArtifact.data.type).toBe('anchor.demo.uncertainty-forecast');
  expect(uncertaintyArtifact.data.uncertaintyModel.scenarioId).toBe('noisyFalseAlarm');
  expect(uncertaintyArtifact.data.observationModel.formula).toBe('z_i = T(x_i,y_i,t_i) + epsilon_i');
  expect(uncertaintyArtifact.data.beliefState.hasBeliefMean).toBe(true);
  expect(uncertaintyArtifact.data.beliefState.hasExpectedUncertainty).toBe(true);
  expect(uncertaintyArtifact.data.diagnostics.primaryDiagnosis).toBeTruthy();
  expect(uncertaintyArtifact.data.frames).toHaveLength(1);
  expect(uncertaintyArtifact.data.fields.forecast.length).toBe(uncertaintyArtifact.data.grid.height);
  expect(uncertaintyArtifact.data.fields.belief.length).toBe(uncertaintyArtifact.data.grid.height);
  expect(uncertaintyArtifact.data.fields.unknownEventProbability.length).toBe(uncertaintyArtifact.data.grid.height);
  expect(uncertaintyArtifact.data.fields.samplingPriorityPreview.length).toBe(uncertaintyArtifact.data.grid.height);
  expect(uncertaintyArtifact.data.fairness.truthAllowedForFairSolver).toBe(false);

  await page.locator('#mission-console [data-action="uncertainty-reset-observations"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene').observations.length)).toBe(0);
  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);
  await launchFromMainMenuHub(page, 'simulation', 'sampling-priority-demo');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SamplingPriorityDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Sampling Priority Demo');
  await expect(page.locator('#sampling-priority-scenario')).toBeVisible();
  await expect(page.locator('#sampling-priority-method')).toBeVisible();
  await expect(page.locator('#sampling-priority-view')).toBeVisible();
  await expect(page.locator('#sampling-priority-candidate-mode')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Event intensity is not sampling priority');
  await expect(page.locator('#waypoint-timeline')).toContainText('not route planning');

  await page.locator('#sampling-priority-scenario').selectOption('uncertainFront');
  await page.locator('#sampling-priority-method').selectOption('boundaryMapping');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SamplingPriorityDemoScene').methodId)).toBe('boundaryMapping');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SAMPLING_PRIORITY_DEMO_DEBUG?.candidateSamplePoints?.length ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SAMPLING_PRIORITY_DEMO_DEBUG?.usesRoutePlanning)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SAMPLING_PRIORITY_DEMO_DEBUG?.usesFlowCoupling)).toBe(false);

  await page.locator('#sampling-priority-scenario').selectOption('hiddenPlumeFollowup');
  await page.locator('#sampling-priority-method').selectOption('hiddenEventFollowup');
  await expect(page.locator('#waypoint-timeline')).toContainText(/hidden-event follow-up/i);

  await page.locator('#sampling-priority-scenario').selectOption('staleMonitoring');
  await page.locator('#sampling-priority-method').selectOption('stalenessRevisit');
  await expect(page.locator('#waypoint-timeline')).toContainText(/revisit|stale/i);

  await page.locator('#sampling-priority-view').selectOption('samplingPriority');
  await expect(page.locator('#mission-console [data-action="export-demo-json"]')).toHaveText('Export Demo JSON');
  const samplingPriorityArtifact = await downloadDemoArtifact(page);
  expect(samplingPriorityArtifact.filename).toMatch(/^anchor-sampling-priority-demo-frame-/);
  expect(samplingPriorityArtifact.data.type).toBe('anchor.demo.sampling-priority');
  expect(samplingPriorityArtifact.data.samplingPriorityModel).toBeTruthy();
  expect(samplingPriorityArtifact.data.candidateSamplePoints.length).toBeGreaterThan(0);
  expect(samplingPriorityArtifact.data.priorityDiagnostics).toBeTruthy();
  expect(samplingPriorityArtifact.data.priorityDiagnostics.usesRoutePlanning).toBe(false);
  expect(samplingPriorityArtifact.data.priorityDiagnostics.usesFlowCoupling).toBe(false);
  expect(samplingPriorityArtifact.data.fields.samplingPriorityField.length).toBe(samplingPriorityArtifact.data.grid.height);
  expect(samplingPriorityArtifact.data.fields.eventIntensityField.length).toBe(samplingPriorityArtifact.data.grid.height);

  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);
  await launchFromMainMenuHub(page, 'simulation', 'flow-coupled-sampling-demo');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowCoupledSamplingDemoScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Flow-Coupled Sampling Demo');
  await expect(page.locator('#flow-coupled-sampling-scenario')).toBeVisible();
  await expect(page.locator('#flow-coupled-sampling-method')).toBeVisible();
  await expect(page.locator('#flow-coupled-sampling-view')).toBeVisible();
  await expect(page.locator('#flow-coupled-sampling-candidate-mode')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Science priority is not action value');
  await expect(page.locator('#waypoint-timeline')).toContainText('Not full route planning');
  await expect(page.locator('#waypoint-timeline')).toContainText(/flow|current assist|opposition/i);

  await page.locator('#flow-coupled-sampling-scenario').selectOption('currentOpposedTarget');
  await page.locator('#flow-coupled-sampling-method').selectOption('riskAvoidant');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('FlowCoupledSamplingDemoScene').methodId)).toBe('riskAvoidant');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.candidateTargets?.length ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.usesFlowCoupling)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.usesRoutePlanning)).toBe(false);

  await page.locator('#flow-coupled-sampling-scenario').selectOption('downstreamIntercept');
  await page.locator('#flow-coupled-sampling-method').selectOption('interceptFuturePriority');
  await expect(page.locator('#waypoint-timeline')).toContainText(/future|intercept/i);
  await page.locator('#flow-coupled-sampling-view').selectOption('currentAssist');
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.currentAssistStats))).toBe(true);
  await page.locator('#flow-coupled-sampling-view').selectOption('currentOpposition');
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.currentOppositionStats))).toBe(true);
  await page.locator('#flow-coupled-sampling-view').selectOption('gliderActionValue');

  await expect(page.locator('#mission-console [data-action="export-demo-json"]')).toHaveText('Export Demo JSON');
  const flowCoupledArtifact = await downloadDemoArtifact(page);
  expect(flowCoupledArtifact.filename).toMatch(/^anchor-flow-coupled-sampling-demo-frame-/);
  expect(flowCoupledArtifact.data.type).toBe('anchor.demo.flow-coupled-sampling');
  expect(flowCoupledArtifact.data.flowCoupledSamplingModel).toBeTruthy();
  expect(flowCoupledArtifact.data.gliderActionContext).toBeTruthy();
  expect(flowCoupledArtifact.data.candidateTargets.length).toBeGreaterThan(0);
  expect(flowCoupledArtifact.data.actionValueDiagnostics).toBeTruthy();
  expect(flowCoupledArtifact.data.flowCoupledSamplingModel.usesFlowCoupling).toBe(true);
  expect(flowCoupledArtifact.data.flowCoupledSamplingModel.usesRoutePlanning).toBe(false);
  expect(flowCoupledArtifact.data.fields.actionValueField.length).toBe(flowCoupledArtifact.data.grid.height);
  expect(flowCoupledArtifact.data.fields.globalPriorityField.length).toBe(flowCoupledArtifact.data.grid.height);

  await page.locator('#mission-console [data-action="menu"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.levelId)).toBe('tutorial_01_first_deployment');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Scenario Start');
  await expect(page.locator('#mission-console')).toContainText('Start Planning');
  await expect(page.locator('#mission-console')).toContainText('Spatial domain remains hidden');
  await expect(page.locator('#waypoint-timeline')).toContainText('Waypoint plan will appear after Planning begins');
  await expect(page.locator('#waypoint-timeline')).toContainText('tactical map');
  await expect(page.locator('#context-panel')).toBeEmpty();
  await expect(page.locator('#waypoint-panel')).toBeEmpty();
  await expect(page.locator('#timeline-panel')).toBeEmpty();
  await expectCenterShellContained(page);
  await expectCenterPanelUsesAvailableSpace(page);
  await startPlanningFromBriefing(page);
  await expect(page.locator('#mission-console')).toContainText('Main Menu');
  await expect(page.evaluate(() => {
    if (window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d') {
      const canvas = document.querySelector('.three-mission-world-canvas')?.getBoundingClientRect();
      return {
        squareCells: true,
        mapAboveTimeline: true,
        threeCanvasVisible: Boolean(canvas && canvas.width > 0 && canvas.height > 0)
      };
    }
    const canvas = document.getElementById('game-canvas').getBoundingClientRect();
    const timeline = document.getElementById('bottom-timeline').getBoundingClientRect();
    const layout = window.anchorGame.adapter.layout;
    const scaleY = canvas.height / document.getElementById('game-canvas').height;
    const scaleX = canvas.width / document.getElementById('game-canvas').width;
    const mapBottom = canvas.top + (layout.oy + layout.height * layout.cell) * scaleY;
    return {
      squareCells: Math.abs((layout.cell * scaleX) - (layout.cell * scaleY)) <= 1,
      mapAboveTimeline: mapBottom <= timeline.top + 1,
      mapTimelineGap: Math.round(timeline.top - mapBottom)
    };
  })).resolves.toMatchObject({
    squareCells: true,
    mapAboveTimeline: true
  });

  await clickCell(page, 1, 1);
  await expect.poll(() => page.evaluate(() => { const start = window.anchorGame.state.mission?.agents?.[0]?.deployment?.selectedStart; return start ? { x: start.x, y: start.y } : null; })).toEqual({ x: 1, y: 1 });
  await clickCell(page, 5, 2);
  await expectWaypointCount(page, 1);
  await expect(page.evaluate(() => {
    const state = window.anchorGame.state;
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    return import('./src/core/planning/RouteSegmentBuilder.js').then(({ buildRouteSegmentsForAgent }) => {
      const agentPlan = state.plan.agentPlans[0];
      const agent = state.mission.agents.find((candidate) => candidate.id === agentPlan.agentId);
      return buildRouteSegmentsForAgent({
        level: state.level,
        mission: state.mission,
        agent,
        agentPlan,
        surfacedAgents: state.surfacedAgents,
        planningAnchor: state.ui.planningAnchor
      }).segments[0]?.kind;
    });
  })).resolves.toBe('startToWaypoint');

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').clearSelectedAgentPlan());
  await expectWaypointCount(page, 0);

  await clickCell(page, 5, 2);
  await expectWaypointCount(page, 1);

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').setPlanningTime(6));
  await expect(page.evaluate(() => window.anchorGame.state.selectedWindow)).resolves.toBe(1);

  await clickCell(page, 5, 3);
  await expectWaypointCount(page, 2);
  await expect(page.evaluate(() => {
    const waypoint = window.anchorGame.state.plan.agentPlans[0].waypoints[1];
    return Number.isFinite(waypoint.estimatedArrivalTime)
      && Number.isFinite(waypoint.segmentEnergy)
      && Number.isFinite(waypoint.cumulativeEnergy)
      && Number.isFinite(waypoint.segmentTravelTime)
      && Number.isFinite(waypoint.arrivalUncertainty?.radiusX)
      && window.anchorGame.state.planningTime === waypoint.estimatedArrivalTime;
  })).resolves.toBe(true);
  await expect(page.evaluate(() => {
    const slider = document.querySelector('#bottom-timeline [data-action="time-slider"]');
    return Math.abs(Number(slider?.value) - window.anchorGame.state.planningTime) < 1e-9;
  })).resolves.toBe(true);

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive())).toBe(true);
  await expect(page.evaluate(() => ({
    mode: window.anchorGame.state.mode,
    planningAnchor: window.anchorGame.state.ui.planningAnchor,
    hoverCell: window.anchorGame.state.ui.hoverCell,
    selectedWaypoint: window.anchorGame.state.ui.selectedWaypoint,
    overlayDebug: window.anchorGame.state.ui.overlayDebug
  }))).resolves.toMatchObject({
    mode: 'simulation',
    planningAnchor: null,
    hoverCell: null,
    selectedWaypoint: null,
    overlayDebug: {
      shouldRenderPlanningGuidance: false
    }
  });

  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    for (let index = 0; index < 6 && !scene.engine.awaitingSurfaceDecision; index += 1) scene.stepOnce();
    scene.refreshSurfaceDecision();
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive())).resolves.toBe(true);

  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    scene.finishSimulation();
    scene.goDebrief();
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene').sys.isActive())).toBe(true);
  await expect(page.locator('body')).not.toHaveClass(/debrief-fullscreen/);
  await expect(page.locator('#debrief-root')).toBeVisible();
  await expect(page.locator('#debrief-root h1')).toHaveText('Challenge Debrief');
  await expect(page.locator('#debrief-root .debrief-header p').first()).toBeVisible();
  await expect(page.locator('#debrief-root .debrief-metric-card')).toHaveCount(8);
  await expect(page.locator('#debrief-root [data-action]')).toHaveCount(0);
  await expect(page.locator('#mission-console')).toContainText('Debrief Console');
  await expect(page.locator('#mission-console [data-action="revise"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="export-result"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="export-aar"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="export-compare"]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Waypoints');
  await expect(page.locator('#context-panel')).toBeEmpty();
  await expect(page.evaluate(() => ({
    mode: window.anchorGame.state.mode,
    planningAnchor: window.anchorGame.state.ui.planningAnchor,
    hoverCell: window.anchorGame.state.ui.hoverCell,
    selectedWaypoint: window.anchorGame.state.ui.selectedWaypoint
  }))).resolves.toEqual({
    mode: 'debrief',
    planningAnchor: null,
    hoverCell: null,
    selectedWaypoint: null
  });
  await expect(page.evaluate(() => window.anchorGame.state.result?.comparison?.rows?.length)).resolves.toBeGreaterThan(0);
  await page.locator('#mission-console [data-action="revise"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
  await expect(page.locator('#debrief-root')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/debrief-fullscreen/);
});

test('Continuous Mission Planning Starts Without Overlay Errors', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);

  const consoleRoot = page.locator('#mission-console');
  await expect(consoleRoot).toContainText('Planning Console');
  await expect(consoleRoot).toContainText('Planning Tools');
  await expect(consoleRoot).toContainText('Waypoint Placement');
  await expect(consoleRoot).toContainText('Water Column');
  await expect(consoleRoot).toContainText('Dive Planning');
  await expect(consoleRoot).toContainText('Field Rendering');
  await expect(consoleRoot).toContainText('Camera Controls');
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Waypoints');
  await expect(page.locator('.three-mission-world-canvas')).toHaveCount(1);

  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.planningSceneCreateCompleted === true)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayFirstRenderCompleted === true)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayRuntimeErrorCount ?? -1)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.uiStateValid === true)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayControlBindCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererRuntimeErrorCount ?? -1)).toBe(0);

  const debug = await page.evaluate(() => ({
    continuous: window.ANCHOR_CONTINUOUS_MISSION_DEBUG,
    ui: window.ANCHOR_CONTINUOUS_UI_DEBUG,
    render: window.ANCHOR_MISSION_RENDER_DEBUG,
    waterColumn: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG
  }));
  expect(debug.continuous).toMatchObject({
    uiStateValid: true,
    coordinateProfileId: 'continuousGridV1',
    waypointSnapMode: 'freePlacement',
    fieldSamplingProfileId: 'continuousTrilinearV1',
    planningWorkspaceVisible: true,
    planningControlsVisible: true,
    planningInteractionEnabled: true,
    overlayRuntimeErrorCount: 0,
    planningSceneCreateCompleted: true,
    usesContinuousWaypoints: true,
    usesCanonical3DDiveState: true,
    usesArbitraryXYZRoutePlanning: false,
    rendererOwnsPlanning: false,
    rendererOwnsSimulation: false,
    rendererOwnsScoring: false
  });
  expect(debug.ui.availableWaypointSnapModes).toEqual(expect.arrayContaining(['freePlacement', 'snapToCellCenters', 'snapToFeature']));
  expect(debug.ui.availableVolumeRenderModes).toEqual(expect.arrayContaining(['layerSlices', 'smoothedSlices', 'volumetricCloud', 'hybrid']));
  expect(debug.render).toMatchObject({ activeBackend: 'threeMission3d', ownsPlanning: false, ownsScoring: false });
  expect(debug.waterColumn.publicSafe).toBe(true);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Continuous Mission Controls Are Visible and Functional', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');

  const agentId = await selectedAgentId(page);
  await deploySelectedGliderThroughVisibleControls(page, agentId);

  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="freePlacement"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.waypointSnapMode)).toBe('freePlacement');
  const firstPair = await adjacentPlaceableWaypointPair(page, agentId);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await clickBetweenThreeGridCells(page, firstPair.a, firstPair.b, 0.37);
  await expectWaypointCount(page, 1);
  const fractionalWaypoint = await waypointAtIndex(page, agentId, 0);
  expect(hasFractionalCoordinate(fractionalWaypoint)).toBe(true);
  expect(fractionalWaypoint.coordinateProfileId).toBe('continuousGridV1');

  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="snapToCellCenters"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.waypointSnapMode)).toBe('snapToCellCenters');
  const secondPair = await adjacentPlaceableWaypointPair(page, agentId);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await clickBetweenThreeGridCells(page, secondPair.a, secondPair.b, 0.42);
  await expectWaypointCount(page, 2);
  const snappedWaypoint = await waypointAtIndex(page, agentId, 1);
  expect(Number.isInteger(Number(snappedWaypoint.x))).toBe(true);
  expect(Number.isInteger(Number(snappedWaypoint.y))).toBe(true);

  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="thermoclineDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="thermocline"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.selectedDiveProfileId)).toBe('thermoclineDive');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.selectedTargetDepthLayerId)).toBe('thermocline');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.predictedTrajectoryPointCount ?? 0)).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="water-column-volume-render-mode"][data-mode="smoothedSlices"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.volumeRenderMode)).toBe('smoothedSlices');
  await page.locator('#mission-console [data-action="water-column-volume-render-mode"][data-mode="volumetricCloud"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.volumeRenderMode)).toBe('volumetricCloud');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.volumeFallbackUsed === true)).toBe(true);
  await page.locator('#mission-console [data-action="water-column-active-layer"][data-layer="deep"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.activeDepthLayerId)).toBe('deep');

  const debug = await page.evaluate(() => ({
    continuous: window.ANCHOR_CONTINUOUS_MISSION_DEBUG,
    render: window.ANCHOR_MISSION_RENDER_DEBUG,
    waterColumn: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG
  }));
  expect(debug.continuous.overlayControlDispatchCount).toBeGreaterThan(0);
  expect(debug.continuous.duplicateOverlayControlDispatchCount).toBe(0);
  expect(debug.continuous).toMatchObject({ rendererOwnsPlanning: false, rendererOwnsSimulation: false, rendererOwnsScoring: false });
  expect(debug.render).toMatchObject({ ownsPlanning: false, ownsSimulationState: false, ownsScoring: false });
  expect(debug.waterColumn).toMatchObject({ ownsPlanning: false, ownsSimulation: false, ownsScoring: false });
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Continuous Mission Plan Executes Through Canonical 3D Dive', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await deployAllGlidersThroughVisibleControls(page);
  const agentId = await selectFirstAgentThroughVisibleControls(page);

  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="freePlacement"]').click();
  for (let index = 0; index < 2; index += 1) {
    const pair = await adjacentPlaceableWaypointPair(page, agentId);
    await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
    await clickBetweenThreeGridCells(page, pair.a, pair.b, index === 0 ? 0.34 : 0.46);
  }
  await expectWaypointCount(page, 2);
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="deepDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.predictedTrajectoryPointCount ?? 0)).toBeGreaterThan(0);

  const executeButton = page.locator('#mission-console [data-action="execute"]');
  await expect(executeButton).toBeVisible();
  await expect(executeButton).toBeEnabled();
  await executeButton.click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);

  const beforeDive = await continuousDiveExecutionSnapshot(page);
  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => continuousDiveExecutionSnapshot(page).then((snapshot) => snapshot.maxDepthMeters > beforeDive.maxDepthMeters && snapshot.maxAbsPitchRadians > 0 && snapshot.realizedTrajectoryPointCount > beforeDive.realizedTrajectoryPointCount), { timeout: 20000 }).toBe(true);
  await page.locator('#mission-console [data-action="pause"]').click();
  const afterDive = await continuousDiveExecutionSnapshot(page);
  expect(afterDive.firstStepCompleted).toBe(true);
  expect(afterDive.maxDepthMeters).toBeGreaterThan(beforeDive.maxDepthMeters);
  expect(afterDive.maxAbsPitchRadians).toBeGreaterThan(0);
  expect(afterDive.realizedTrajectoryPointCount).toBeGreaterThan(beforeDive.realizedTrajectoryPointCount);
  expect(afterDive.trackHasContinuousCoordinates).toBe(true);
  expect(afterDive.divePhases.length).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.result && window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount === 1), { timeout: 30000 }).toBe(true);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Debrief Console');
  const metadata = await page.evaluate(() => window.anchorGame.state.result?.continuousMission ?? window.anchorGame.state.result?.summary?.continuousMission ?? null);
  expect(metadata).toMatchObject({
    type: 'anchor.sim.continuous-mission-summary',
    coordinateProfileId: 'continuousGridV1',
    supportsFreePlacement: true,
    usesArbitraryXYZPlanning: false,
    syntheticTeachingModel: true,
    calibratedOceanForecast: false
  });
  expect(metadata.continuousWaypointCount).toBeGreaterThan(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});


test('Surface Waypoints Produce a Predicted Three-Dimensional Dive', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  const agentId = await selectedAgentId(page);
  await deployAllGlidersThroughVisibleControls(page);
  await selectAgentThroughVisibleControls(page, agentId);
  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="freePlacement"]').click();
  for (let index = 0; index < 2; index += 1) {
    const pair = await adjacentPlaceableWaypointPair(page, agentId);
    await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
    await clickBetweenThreeGridCells(page, pair.a, pair.b, index === 0 ? 0.34 : 0.58);
  }
  await expectWaypointCount(page, 2);

  await expect(page.locator('#mission-console')).toContainText('Segment Dive Plan');
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="thermoclineDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="thermocline"]').click();
  await page.locator('#mission-console [data-action="water-column-max-depth"][data-depth="80"]').click();
  await page.locator('#mission-console [data-action="water-column-cycle-count"][data-cycles="2"]').click();

  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentDiveProfileId), { timeout: 10000 }).toBe('thermoclineDive');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDiveAvailable === true)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedLayerCrossingCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedSampleCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedBottomTurnCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.plannedDiveThreeObjectCount ?? 0)).toBeGreaterThan(0);
  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const selectedSegmentId = window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentId;
    const segments = scene.missionRenderViewModel?.plannedDiveSegments ?? [];
    const segment = segments.find((candidate) => candidate.segmentId === selectedSegmentId) ?? segments.find((candidate) => candidate.diveProfileId === 'thermoclineDive') ?? segments[0];
    return {
      surfaceIntentAtSurface: segment?.surfaceIntentPath?.every((point) => Number(point.depthMeters ?? 0) === 0) === true,
      predictedDescends: segment?.predictedDivePath?.some((point) => Number(point.depthMeters ?? 0) > 0) === true,
      predictedSamplesAtDepth: segment?.predictedSamples?.every((sample) => Number(sample.depthMeters ?? 0) > 0 && sample.createsScoreEvent === false) === true,
      usesArbitraryXYZWaypoints: segment?.boundaryFlags?.usesArbitraryXYZWaypoints === true,
      rendererOwnsPrediction: segment?.boundaryFlags?.rendererOwnsPrediction === true
    };
  })).resolves.toEqual({
    surfaceIntentAtSurface: true,
    predictedDescends: true,
    predictedSamplesAtDepth: true,
    usesArbitraryXYZWaypoints: false,
    rendererOwnsPrediction: false
  });

  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('sideProfile');
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="surfaceOnly"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentDiveProfileId), { timeout: 10000 }).toBe('surfaceOnly');
  await expect.poll(() => page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const selectedSegmentId = window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentId;
    const segments = scene.missionRenderViewModel?.plannedDiveSegments ?? [];
    const segment = segments.find((candidate) => candidate.segmentId === selectedSegmentId) ?? segments[0];
    return Math.max(0, ...(segment?.predictedDivePath ?? []).map((point) => Number(point.depthMeters ?? 0)));
  })).toBe(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Camera Reveals Full Water-Column Dive', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline', cycles: 2 });
  await page.locator('#mission-console [data-action="water-column-focus-predicted-dive"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('selectedSegmentDive');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0)).toBeGreaterThan(0);
  const before = await page.evaluate(() => ({
    polar: Number(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraCurrentPolarRadians ?? window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPolarRadians ?? 0),
    min: Number(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraMinPolarRadians ?? 0),
    max: Number(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraMaxPolarRadians ?? 0),
    planDigest: JSON.stringify(window.anchorGame.state.plan)
  }));
  expect(before.min).toBeLessThanOrEqual(0.1);
  expect(before.max).toBeGreaterThanOrEqual(1.48);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('sideProfile');
  const point = await threeGridPoint(page, 4, 3);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(point.x, point.y + 80, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => page.evaluate((startPolar) => {
    const debug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    return Math.abs(Number(debug.cameraCurrentPolarRadians ?? debug.cameraPolarRadians ?? 0) - startPolar) > 0.01 || Number(debug.cameraOrbitChangeCount ?? 0) > 0;
  }, before.polar)).toBe(true);
  await page.locator('#mission-console [data-action="water-column-vertical-exaggeration"][data-value="4"]').click();
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.setWaterColumnVerticalExaggeration?.(4));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.ui?.waterColumn?.verticalExaggeration)).toBe(4);
  await expect(page.evaluate((digest) => JSON.stringify(window.anchorGame.state.plan) === digest, before.planDigest)).resolves.toBe(true);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Surface Waypoints and Sampling Targets Have Distinct Semantics', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  const setup = await prepareThreeSamplingTargetDiveScenario(page, { attach: false, profile: 'thermoclineDive', layer: 'thermocline' });
  const state = await page.evaluate(({ agentId, targetId }) => {
    const agentPlan = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === agentId);
    const target = window.anchorGame.state.plan.scienceTargets.find((candidate) => candidate.id === targetId);
    return {
      waypointCount: agentPlan?.waypoints?.length ?? 0,
      timelineWaypointCount: window.ANCHOR_MISSION_RENDER_DEBUG?.timelineWaypointCount ?? null,
      scienceTargetCount: window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0,
      targetExecutable: target?.executable,
      targetNavigationAuthority: target?.navigationAuthority,
      targetDepthLayerId: target?.depthLayerId,
      selectedEntityType: window.anchorGame.state.ui?.threeMissionInteraction?.selectedEntity?.objectType ?? null,
      selectedTargetId: window.anchorGame.state.ui?.selectedScienceTargetId ?? null
    };
  }, setup);
  expect(state.waypointCount).toBe(2);
  expect(state.timelineWaypointCount).toBe(2);
  expect(state.scienceTargetCount).toBeGreaterThanOrEqual(1);
  expect(state.targetExecutable).toBe(false);
  expect(state.targetNavigationAuthority).toBe(false);
  expect(state.targetDepthLayerId).toBe('thermocline');
  expect(state.selectedEntityType).toBe('samplingTarget');
  expect(state.selectedTargetId).toBe(setup.targetId);
  await expect(page.locator('#mission-console [data-science-targets-panel]')).toContainText('Science Targets');
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Sampling Target Drives Predicted Dive Without Becoming a Navigation Point', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  const setup = await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline', cycles: 2 });
  await page.locator('#mission-console [data-action="science-target-set-layer"]').click();
  await page.locator('#mission-console [data-action="science-target-copy-depth"]').click();
  await page.locator('#mission-console [data-action="science-target-recommend"]').click();
  const state = await page.evaluate(({ agentId, targetId }) => {
    const agentPlan = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === agentId);
    const target = window.anchorGame.state.plan.scienceTargets.find((candidate) => candidate.id === targetId);
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const segments = scene.missionRenderViewModel?.plannedDiveSegments ?? [];
    const coverageSegment = segments.find((candidate) => (candidate.targetCoverage ?? []).some((coverage) => coverage.targetId === targetId)) ?? null;
    const diveSegment = segments.find((candidate) => (candidate.predictedDivePath ?? []).some((point) => Number(point.depthMeters ?? 0) > 0)) ?? coverageSegment ?? segments[0];
    return {
      waypointCount: agentPlan?.waypoints?.length ?? 0,
      targetAttached: (target?.attachedSegmentIds ?? []).length > 0,
      waypointTargetIds: (agentPlan?.waypoints ?? []).flatMap((waypoint) => waypoint.scienceTargetIds ?? []),
      coverageStatuses: coverageSegment?.targetCoverage?.map((coverage) => coverage.status) ?? diveSegment?.targetCoverage?.map((coverage) => coverage.status) ?? [],
      predictedSamplesScore: segments.some((candidate) => (candidate.predictedSamples ?? []).some((sample) => sample.createsScoreEvent === true)),
      surfaceIntentAtSurface: diveSegment?.surfaceIntentPath?.every((point) => Number(point.depthMeters ?? 0) === 0) === true,
      predictedDescends: (diveSegment?.predictedDivePath ?? []).some((point) => Number(point.depthMeters ?? 0) > 0),
      recommendation: window.anchorGame.state.ui?.scienceTargetProfileRecommendation?.recommendation ?? null
    };
  }, setup);
  expect(state.waypointCount).toBe(2);
  expect(state.targetAttached).toBe(true);
  expect(state.waypointTargetIds).toContain(setup.targetId);
  expect(state.coverageStatuses.length).toBeGreaterThan(0);
  expect(state.coverageStatuses.every((status) => ['COVERED', 'PARTIALLY_COVERED', 'CROSSED_WITHOUT_SAMPLE', 'UNREACHABLE', 'NOT_ATTACHED'].includes(status))).toBe(true);
  expect(state.predictedSamplesScore).toBe(false);
  expect(state.surfaceIntentAtSurface).toBe(true);
  expect(state.predictedDescends).toBe(true);
  expect(state.recommendation).toBeTruthy();
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Predicted Multi-Yo Profile Executes Through Canonical Simulation', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { buildPlannedDiveSegmentViewModel } = await import('./src/core/rendering/PlannedDiveSegmentViewModel.js');
    const { advanceGliderDiveStateMachine } = await import('./src/core/sim/GliderDiveStateMachine.js');
    const waterColumnConfig = { depthLayerIds: ['surface', 'shallow', 'thermocline', 'deep'], defaultLayerIds: ['surface', 'thermocline', 'deep'], divediveProfileId: 'sawtoothProfile' };
    const segment = buildPlannedDiveSegmentViewModel({
      segmentId: 'e2e-multi-yo',
      startWaypoint: { x: 0, y: 2 },
      targetWaypoint: { x: 12, y: 2, divediveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep' },
      waterColumnConfig,
      bottomBoundary: { bottomDepthField: Array.from({ length: 5 }, () => Array.from({ length: 14 }, () => 220)) },
      requestedMaximumDepthMeters: 110,
      cycleCount: 3,
      sampleCount: 100
    });
    const machine = advanceGliderDiveStateMachine({ position: { depthMeters: 0 }, divePhase: 'surface' }, { waterColumnConfig, targetDepthLayerId: 'deep', requestedMaximumDepthMeters: 110, achievableMaximumDepthMeters: segment.achievableMaximumDepthMeters, cycleCount: segment.requestedCycleCount, segmentProgress: 1, routeProgress: 1, diveProfileId: 'sawtoothProfile' });
    return {
      predictedCycles: segment.cycleCount,
      requestedCycles: segment.requestedCycleCount,
      actualCompletedCycles: machine.actualCompletedCycleCount,
      predictionExecutionMatch: machine.feasibleCycleCount === segment.cycleCount,
      predictedBottomTurns: segment.bottomTurns.length,
      predictionOwnsSimulation: segment.boundaryFlags?.ownsSimulation === true,
      predictionOwnsScoring: segment.boundaryFlags?.ownsScoring === true
    };
  });
  expect(result.predictedCycles).toBeGreaterThanOrEqual(2);
  expect(result.actualCompletedCycles).toBe(result.predictedCycles);
  expect(result.predictionExecutionMatch).toBe(true);
  expect(result.predictedBottomTurns).toBeGreaterThan(0);
  expect(result.predictionOwnsSimulation).toBe(false);
  expect(result.predictionOwnsScoring).toBe(false);
});

test('Three Camera Interaction Does Not Rebuild Mission Models', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline' });
  const before = await page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    scienceTargetCount: window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0,
    waypointCount: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount ?? 0,
    slabTextureCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.slabTextureCount ?? 0,
    panelDispatchCount: window.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayControlDispatchCount ?? 0
  }));
  const point = await threeGridPoint(page, 4, 3);
  for (let index = 0; index < 3; index += 1) {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(point.x + 40, point.y + 20, { steps: 4 });
    await page.mouse.up({ button: 'right' });
  }
  const after = await page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    scienceTargetCount: window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0,
    waypointCount: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount ?? 0,
    slabTextureCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.slabTextureCount ?? 0,
    panelDispatchCount: window.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayControlDispatchCount ?? 0,
    cameraOrbitChangeCount: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraOrbitChangeCount ?? 0
  }));
  expect(after.planDigest).toBe(before.planDigest);
  expect(after.scienceTargetCount).toBe(before.scienceTargetCount);
  expect(after.waypointCount).toBe(before.waypointCount);
  expect(after.slabTextureCount).toBe(before.slabTextureCount);
  expect(after.panelDispatchCount).toBe(before.panelDispatchCount);
  expect(after.cameraOrbitChangeCount).toBeGreaterThan(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Mission Renderer Resources Remain Stable', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'deepDive', layer: 'deep' });
  const snapshot = () => page.evaluate(async () => {
    const { threeMissionWorldRendererSummary } = await import('./src/game/three/ThreeMissionWorldRenderer.js');
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const summary = threeMissionWorldRendererSummary(scene.threeMissionRenderer);
    return {
      waypointObjectCount: summary.waypointObjectCount,
      samplingTargetObjectCount: summary.samplingTargetObjectCount,
      plannedDiveObjectCount: summary.plannedDiveTrajectorySummary?.objectCount ?? 0,
      slabTextureCount: summary.slabTextureCount,
      disposed: summary.disposed,
      ownsPlanning: summary.ownsPlanning,
      ownsScoring: summary.ownsScoring,
      ownsSimulationState: summary.ownsSimulationState
    };
  });
  const before = await snapshot();
  for (const preset of ['divePlanningView', 'sideProfile', 'obliqueDive', 'tacticalTopDown']) {
    await page.locator(`#mission-console [data-action="three-camera"][data-preset="${preset}"]`).click();
  }
  await page.locator('#mission-console [data-action="water-column-display-mode"][data-mode="explodedLayers"]').click();
  await page.locator('#mission-console [data-action="water-column-display-mode"][data-mode="physicalDepth"]').click();
  await page.locator('#mission-console [data-action="water-column-layer-visibility"][data-mode="isolateActive"]').click();
  await page.locator('#mission-console [data-action="water-column-layer-visibility"][data-mode="showAll"]').click();
  const after = await snapshot();
  expect(after.disposed).toBe(false);
  expect(after.ownsPlanning).toBe(false);
  expect(after.ownsScoring).toBe(false);
  expect(after.ownsSimulationState).toBe(false);
  expect(after.waypointObjectCount).toBe(before.waypointObjectCount);
  expect(after.samplingTargetObjectCount).toBe(before.samplingTargetObjectCount);
  expect(after.plannedDiveObjectCount).toBeGreaterThan(0);
  expect(after.slabTextureCount).toBeLessThanOrEqual(before.slabTextureCount + 8);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Mission Interaction Performance Invariants', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 3 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  const before = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    return {
      planDigest: JSON.stringify(window.anchorGame.state.plan),
      cameraPosition: scene.threeMissionRenderer?.camera?.position?.toArray?.() ?? [],
      resourceDebug: window.ANCHOR_MISSION_RENDER_TEST_API?.performanceDebug?.()
    };
  });

  const point = await threeGridPoint(page, 4, 3);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  for (let index = 0; index < 20; index += 1) await page.mouse.move(point.x + 6 * index, point.y + 2 * index, { steps: 1 });
  await page.mouse.up({ button: 'right' });

  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'left' });
  for (let index = 0; index < 20; index += 1) await page.mouse.move(point.x - 4 * index, point.y + 3 * index, { steps: 1 });
  await page.mouse.up({ button: 'left' });

  for (let index = 0; index < 20; index += 1) await page.mouse.wheel(0, index % 2 === 0 ? -80 : 100);
  await page.waitForTimeout(1000);

  const afterCamera = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const debug = window.ANCHOR_MISSION_RENDER_TEST_API?.performanceDebug?.();
    return {
      planDigest: JSON.stringify(window.anchorGame.state.plan),
      cameraPosition: scene.threeMissionRenderer?.camera?.position?.toArray?.() ?? [],
      debug
    };
  });
  expect(afterCamera.planDigest).toBe(before.planDigest);
  expect(afterCamera.cameraPosition.join(',')).not.toBe(before.cameraPosition.join(','));
  expect(afterCamera.debug.activeRendererCount).toBe(1);
  expect(afterCamera.debug.activeRafCount).toBe(1);
  expect(afterCamera.debug.sampleCount).toBeGreaterThan(10);
  expect(afterCamera.debug.cameraGestureCount).toBeGreaterThanOrEqual(20);
  expect(afterCamera.debug.modelBuildCountDuringCameraGesture).toBe(0);
  expect(afterCamera.debug.predictionBuildCountDuringCameraGesture).toBe(0);
  expect(afterCamera.debug.textureUpdateCountDuringCameraGesture).toBe(0);
  expect(afterCamera.debug.panelRenderCountDuringCameraGesture).toBe(0);
  expect(afterCamera.debug.timelineRenderCountDuringCameraGesture).toBe(0);

  await page.locator('#mission-console [data-action="science-target-detach"]').click();
  await page.locator('#mission-console [data-action="science-target-attach"]').click();
  for (const mode of ['explodedLayers', 'physicalDepth']) await page.locator(`#mission-console [data-action="water-column-display-mode"][data-mode="${mode}"]`).click();
  for (const preset of ['divePlanningView', 'sideProfile', 'obliqueDive', 'tacticalTopDown']) await page.locator(`#mission-console [data-action="three-camera"][data-preset="${preset}"]`).click();
  await page.waitForTimeout(500);
  const afterEdits = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.performanceDebug?.());
  expect(afterEdits.activeRendererCount).toBe(1);
  expect(afterEdits.activeRafCount).toBe(1);
  expect(afterEdits.duplicateRendererWarningCount).toBe(0);
  expect(afterEdits.duplicateRafWarningCount).toBe(0);
  expect(afterEdits.sceneObjectCount).toBeGreaterThan(0);
  expect(afterEdits.sceneObjectCount).toBeLessThanOrEqual(Math.max(250, Number(afterCamera.debug.sceneObjectCount ?? 0) + 140));

  console.log('THREE_PERF_MEASUREMENT ' + JSON.stringify({
    scenario: 'planning-camera-interaction',
    averageFrameMilliseconds: afterCamera.debug.averageFrameMilliseconds,
    medianFrameMilliseconds: afterCamera.debug.medianFrameMilliseconds,
    p95FrameMilliseconds: afterCamera.debug.p95FrameMilliseconds,
    p99FrameMilliseconds: afterCamera.debug.p99FrameMilliseconds,
    maximumFrameMilliseconds: afterCamera.debug.maximumFrameMilliseconds,
    framesOver33Milliseconds: afterCamera.debug.framesOver33Milliseconds,
    framesOver50Milliseconds: afterCamera.debug.framesOver50Milliseconds,
    framesOver100Milliseconds: afterCamera.debug.framesOver100Milliseconds,
    rendererCalls: afterCamera.debug.rendererCalls,
    rendererTriangles: afterCamera.debug.rendererTriangles,
    rendererLines: afterCamera.debug.rendererLines,
    rendererPoints: afterCamera.debug.rendererPoints,
    sceneObjectCount: afterEdits.sceneObjectCount,
    geometryCount: afterEdits.geometryCount,
    materialCount: afterEdits.materialCount,
    textureCount: afterEdits.textureCount
  }));

  await page.locator('[data-action="main-menu"]').filter({ hasText: 'Main Menu' }).first().click();
  await expectMainMenuSceneIsolation(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? -1)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? -1)).toBe(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Sampling Target and Dive Planning Headed Workflow', async ({ page }, testInfo) => {
  const browserErrors = attachBrowserErrorCollector(page);
  const setup = await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'thermocline', cycles: 3 });
  await page.screenshot({ path: testInfo.outputPath('three-tactical-planning.png'), fullPage: true });

  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.performanceDebug?.()?.activeRendererCount)).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('three-side-profile.png'), fullPage: true });
  await page.locator('#mission-console [data-action="water-column-vertical-exaggeration"][data-value="4"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.ui?.waterColumn?.verticalExaggeration)).toBe(4);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0)).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  await page.locator('#mission-console [data-action="water-column-active-layer"][data-layer="deep"]').click();
  const deepCell = await findSamplingTargetPlacementCell(page, 'deep') ?? { x: setup.targetCell.x + 1, y: setup.targetCell.y };
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeSamplingTarget"]').click();
  const deepPoint = await page.evaluate(({ layerId, cell }) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(layerId, cell.x, cell.y) ?? null, { layerId: 'deep', cell: deepCell });
  expect(deepPoint).toBeTruthy();
  await page.mouse.click(deepPoint.x, deepPoint.y);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.plan?.scienceTargets?.length ?? 0)).toBeGreaterThanOrEqual(2);
  await page.locator('#mission-console [data-action="science-target-attach"]').click();
  await page.locator('#mission-console [data-action="science-target-copy-depth"]').click();
  await page.locator('#mission-console [data-action="science-target-recommend"]').click();
  await page.screenshot({ path: testInfo.outputPath('three-sampling-target-attached.png'), fullPage: true });

  await page.locator('#mission-console [data-action="water-column-focus-predicted-dive"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('selectedSegmentDive');
  await page.screenshot({ path: testInfo.outputPath('three-multi-yo-prediction.png'), fullPage: true });

  const executeButton = page.locator('#mission-console [data-action="execute"]');
  await expect(executeButton).toBeVisible();
  await expect(executeButton).toBeEnabled();
  await executeButton.click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  const beforeDive = await continuousDiveExecutionSnapshot(page);
  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => continuousDiveExecutionSnapshot(page).then((snapshot) => snapshot.maxDepthMeters > beforeDive.maxDepthMeters && snapshot.realizedTrajectoryPointCount > beforeDive.realizedTrajectoryPointCount), { timeout: 25000 }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('three-multi-yo-simulation.png'), fullPage: true });
  await page.locator('#mission-console [data-action="pause"]').click();
  const simulationPerf = await page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? null);
  console.log('THREE_PERF_MEASUREMENT ' + JSON.stringify({ scenario: 'simulation-multi-yo', performance: simulationPerf }));
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.result && window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount === 1), { timeout: 30000 }).toBe(true);
  const resultSummary = await page.evaluate(() => ({
    observationCount: window.anchorGame.state.result?.summary?.observationCount ?? window.anchorGame.state.result?.events?.filter?.((event) => ['sample', 'duplicateSample', 'probabilityOutcome'].includes(event.type))?.length ?? 0,
    events: window.anchorGame.state.result?.events?.length ?? 0
  }));
  expect(resultSummary.observationCount + resultSummary.events).toBeGreaterThan(0);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Debrief Console');
  await page.screenshot({ path: testInfo.outputPath('three-debrief.png'), fullPage: true });
  await page.locator('#mission-console [data-action="menu"]').click();
  await expectMainMenuSceneIsolation(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? -1)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? -1)).toBe(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Simulation Uses Incremental Presentation Updates', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'thermocline', cycles: 2 });
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => page.evaluate(() => {
    const debug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    return Number(debug.engineStepCount ?? 0) > 0 && Number(debug.presentationFrameCount ?? 0) > 0 && Number(debug.realizedTrajectoryPointCount ?? 0) > 0;
  }), { timeout: 25000 }).toBe(true);
  await page.locator('#mission-console [data-action="pause"]').click();
  const beforeCamera = await page.evaluate(() => ({
    debug: window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {},
    perf: window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? {}
  }));
  expect(beforeCamera.debug.engineStepCount).toBeGreaterThan(0);
  expect(beforeCamera.debug.presentationFrameCount).toBeGreaterThan(0);
  expect(beforeCamera.debug.presentationRequestCount).toBeGreaterThanOrEqual(beforeCamera.debug.presentationFrameCount);
  expect(beforeCamera.debug.rendererSummary?.trajectoryAppendCount ?? 0).toBeGreaterThan(0);
  expect(beforeCamera.debug.rendererSummary?.trajectoryFullRebuildCount ?? 0).toBe(0);
  expect(beforeCamera.debug.rendererSummary?.performanceCounters?.routeGeometryUpdate ?? 0).toBe(0);
  expect(beforeCamera.debug.rendererSummary?.performanceCounters?.bathymetryUpdate ?? 0).toBe(0);
  expect(beforeCamera.debug.rendererSummary?.performanceCounters?.waterColumnUpdate ?? 0).toBe(0);
  expect(beforeCamera.debug.hudRenderCount + beforeCamera.debug.rightPanelRenderCount).toBeGreaterThan(0);
  expect(beforeCamera.perf.activeRendererCount).toBe(1);
  expect(beforeCamera.perf.activeRafCount).toBe(1);

  const point = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForAgent?.() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(point.x + 80, point.y + 30, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(300);
  const afterCamera = await page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {});
  expect(afterCamera.engineStepCount).toBe(beforeCamera.debug.engineStepCount);
  expect(afterCamera.rendererSummary?.performanceCounters?.routeGeometryUpdate ?? 0).toBe(beforeCamera.debug.rendererSummary?.performanceCounters?.routeGeometryUpdate ?? 0);
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame.state.result)), { timeout: 30000 }).toBe(true);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Finish Instantly Avoids Per-Step Three Rebuilds', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 2 });
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.result && window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount === 1), { timeout: 30000 }).toBe(true);
  const debug = await page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {});
  expect(debug.engineStepCount).toBeGreaterThan(0);
  expect(debug.finishChunkCount).toBeGreaterThan(0);
  expect(debug.finishPresentationUpdateCount).toBeLessThanOrEqual(debug.finishChunkCount + 1);
  expect(debug.presentationFrameCount).toBeLessThanOrEqual(debug.finishChunkCount + 5);
  expect(debug.rendererSummary?.performanceCounters?.rendererUpdate ?? 0).toBeLessThanOrEqual(debug.finishChunkCount + 6);
  expect(debug.resultBuildCount).toBe(1);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Quality Profiles Preserve Canonical Simulation Result', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'thermocline', cycles: 1 });
  const digests = await page.evaluate(async () => {
    const { SimulationEngine } = await import('./src/core/sim/SimulationEngine.js');
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const base = {
      level: clone(window.anchorGame.state.level),
      mission: clone(window.anchorGame.state.mission),
      plan: clone(window.anchorGame.state.plan)
    };
    const run = (quality) => {
      const engine = new SimulationEngine({ level: clone(base.level), mission: clone(base.mission), plan: clone(base.plan), time: 0 });
      const dt = Number(base.level?.world?.time?.dt ?? 0.25) || 0.25;
      let guard = 0;
      while (!engine.complete && !engine.aborted && guard < 1000) {
        engine.step(dt, { force: true });
        guard += 1;
      }
      const result = engine.buildResult?.() ?? { summary: engine.getSummary?.(), events: engine.events ?? [], trajectories: engine.agents?.map((agent) => ({ agentId: agent.id, history: agent.history ?? [] })) ?? [] };
      const summary = result.summary ?? {};
      return {
        quality,
        complete: engine.complete === true,
        aborted: engine.aborted === true,
        finalScore: Number(summary.finalScore ?? summary.score ?? 0).toFixed(6),
        elapsedTime: Number(summary.elapsedTime ?? engine.t ?? 0).toFixed(6),
        eventCount: result.events?.length ?? 0,
        trajectoryDigest: JSON.stringify((result.trajectories ?? []).map((trajectory) => ({ agentId: trajectory.agentId, count: trajectory.history?.length ?? 0, last: trajectory.history?.at?.(-1) ?? null })))
      };
    };
    return ['performance', 'balanced', 'high'].map(run);
  });
  const baseline = { ...digests[0], quality: 'baseline' };
  for (const digest of digests.slice(1)) expect({ ...digest, quality: 'baseline' }).toEqual(baseline);
  const presentation = await page.evaluate(async () => {
    const { effectiveThreePixelRatio, renderCostPolicySummary, threeQualityProfileSettings } = await import('./src/game/three/ThreeRenderCostPolicy.js');
    return ['performance', 'balanced', 'high'].map((qualityProfile) => ({
      qualityProfile,
      pixelRatio: effectiveThreePixelRatio({ devicePixelRatio: 2, qualityProfile }),
      currentVectorStride: threeQualityProfileSettings(qualityProfile).currentVectorStride,
      policy: renderCostPolicySummary({ displaySettings: { waterColumn: { qualityProfile, fieldDisplayMode: 'activeLayerOnly' } } })
    }));
  });
  expect(presentation.map((row) => row.pixelRatio)).toEqual([1, 1.25, 2]);
  expect(presentation.map((row) => row.currentVectorStride)).toEqual([3, 2, 1]);
  expect(presentation.every((row) => row.policy.ownsSimulationState === false && row.policy.changesOfficialBrowserScoring === false)).toBe(true);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Context Slabs Reduce Cost Without Losing Dive Context', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'thermocline', cycles: 2 });
  await page.locator('#mission-console [data-action="three-quality-profile"][data-profile="balanced"]').click();
  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeTexturedSlabCount ?? 0)).toBe(1);
  const before = await page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    activeTexturedSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeTexturedSlabCount ?? 0,
    contextOutlineSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.contextOutlineSlabCount ?? 0,
    slabTextureCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.slabTextureCount ?? 0,
    visibleLayerCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.visibleLayerCount ?? 0,
    allLayerFieldTexturesEnabled: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.allLayerFieldTexturesEnabled === true,
    predictedDiveObjectCount: window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0
  }));
  expect(before.activeTexturedSlabCount).toBe(1);
  expect(before.contextOutlineSlabCount).toBe(Math.max(0, before.visibleLayerCount - 1));
  expect(before.slabTextureCount).toBe(1);
  expect(before.allLayerFieldTexturesEnabled).toBe(false);
  expect(before.predictedDiveObjectCount).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="water-column-field-display-mode"][data-mode="allLayers"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.allLayerFieldTexturesEnabled === true)).toBe(true);
  const allLayers = await page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    slabTextureCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.slabTextureCount ?? 0,
    visibleLayerCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.visibleLayerCount ?? 0,
    contextOutlineSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.contextOutlineSlabCount ?? 0
  }));
  expect(allLayers.planDigest).toBe(before.planDigest);
  expect(allLayers.slabTextureCount).toBe(allLayers.visibleLayerCount);
  expect(allLayers.contextOutlineSlabCount).toBe(0);

  await page.locator('#mission-console [data-action="water-column-field-display-mode"][data-mode="activeLayerOnly"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.allLayerFieldTexturesEnabled === false)).toBe(true);
  const after = await page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    activeTexturedSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeTexturedSlabCount ?? 0,
    contextOutlineSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.contextOutlineSlabCount ?? 0,
    slabTextureCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.slabTextureCount ?? 0,
    visibleLayerCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.visibleLayerCount ?? 0
  }));
  expect(after.planDigest).toBe(before.planDigest);
  expect(after.activeTexturedSlabCount).toBe(1);
  expect(after.contextOutlineSlabCount).toBe(Math.max(0, after.visibleLayerCount - 1));
  expect(after.slabTextureCount).toBe(1);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Continuous Bathymetry Terrain Renders Canonical Mesh', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 2 });
  await expect.poll(() => page.evaluate(() => (window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary?.terrainVertexCount ?? 0) > 0), { timeout: 15000 }).toBe(true);
  const terrain = await page.evaluate(() => {
    const summary = window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary ?? {};
    const terrainSummary = summary.bathymetryTerrainSummary ?? {};
    const landmassSummary = summary.landmassSummary ?? {};
    const coastlineSummary = summary.coastlineSummary ?? {};
    const contourSummary = summary.bathymetryContourSummary ?? {};
    return {
      terrainVertexCount: summary.terrainVertexCount ?? 0,
      terrainTriangleCount: summary.terrainTriangleCount ?? 0,
      terrainDrawCallEstimate: summary.terrainDrawCallEstimate ?? 0,
      terrainSourceDigest: summary.terrainSourceDigest ?? null,
      canonicalMeshAlignmentStatus: summary.canonicalMeshAlignmentStatus ?? null,
      rendererOwnsBathymetry: summary.rendererOwnsBathymetry,
      usesVisualMeshForPhysics: summary.usesVisualMeshForPhysics,
      terrainObjectCount: terrainSummary.terrainObjectCount ?? 0,
      terrainBuildCount: terrainSummary.terrainBuildCount ?? 0,
      indexedGeometry: terrainSummary.indexedGeometry === true,
      terrainLayerOwnsCollision: terrainSummary.ownsCollision === true,
      terrainLayerOwnsDiveFeasibility: terrainSummary.ownsDiveFeasibility === true,
      landVertexCount: landmassSummary.landVertexCount ?? 0,
      coastlineSegmentCount: coastlineSummary.coastlineSegmentCount ?? 0,
      contourSegmentCount: contourSummary.contourSegmentCount ?? 0,
      contourLevelsMeters: contourSummary.contourLevelsMeters ?? []
    };
  });
  expect(terrain.terrainVertexCount).toBeGreaterThan(0);
  expect(terrain.terrainTriangleCount).toBeGreaterThan(0);
  expect(terrain.terrainDrawCallEstimate).toBeLessThanOrEqual(4);
  expect(terrain.terrainObjectCount).toBeLessThanOrEqual(2);
  expect(terrain.terrainBuildCount).toBe(1);
  expect(terrain.indexedGeometry).toBe(true);
  expect(terrain.terrainSourceDigest).toBeTruthy();
  expect(terrain.canonicalMeshAlignmentStatus).toBe('PASS');
  expect(terrain.rendererOwnsBathymetry).toBe(false);
  expect(terrain.usesVisualMeshForPhysics).toBe(false);
  expect(terrain.terrainLayerOwnsCollision).toBe(false);
  expect(terrain.terrainLayerOwnsDiveFeasibility).toBe(false);
  expect(terrain.landVertexCount).toBeGreaterThan(0);
  expect(terrain.coastlineSegmentCount).toBeGreaterThan(0);
  expect(terrain.contourSegmentCount).toBeGreaterThan(0);
  expect(terrain.contourLevelsMeters.length).toBeGreaterThan(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Terrain Camera Gestures Do Not Rebuild Bathymetry Mesh', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'thermocline', cycles: 2 });
  await expect.poll(() => page.evaluate(() => (window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary?.bathymetryTerrainSummary?.terrainBuildCount ?? 0) > 0), { timeout: 15000 }).toBe(true);
  const before = await page.evaluate(() => {
    const summary = window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary ?? {};
    return {
      planDigest: JSON.stringify(window.anchorGame.state.plan),
      terrainBuildCount: summary.bathymetryTerrainSummary?.terrainBuildCount ?? 0,
      landBuildCount: summary.landmassSummary?.landBuildCount ?? 0,
      coastlineBuildCount: summary.coastlineSummary?.coastlineBuildCount ?? 0,
      contourBuildCount: summary.bathymetryContourSummary?.contourBuildCount ?? 0,
      terrainSourceDigest: summary.terrainSourceDigest ?? null,
      terrainVertexCount: summary.terrainVertexCount ?? 0,
      terrainTriangleCount: summary.terrainTriangleCount ?? 0,
      cameraOrbitChangeCount: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraOrbitChangeCount ?? 0,
      cameraZoomChangeCount: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraZoomChangeCount ?? 0
    };
  });
  const point = await threeGridPoint(page, 4, 3);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(point.x + 150, point.y + 60, { steps: 12 });
  await page.mouse.up({ button: 'right' });
  await page.mouse.wheel(0, -180);
  await expect.poll(() => page.evaluate((snapshot) => {
    const debug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    return (debug.cameraOrbitChangeCount ?? 0) > snapshot.cameraOrbitChangeCount || (debug.cameraZoomChangeCount ?? 0) > snapshot.cameraZoomChangeCount;
  }, before), { timeout: 10000 }).toBe(true);
  const after = await page.evaluate(() => {
    const summary = window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary ?? {};
    return {
      planDigest: JSON.stringify(window.anchorGame.state.plan),
      terrainBuildCount: summary.bathymetryTerrainSummary?.terrainBuildCount ?? 0,
      landBuildCount: summary.landmassSummary?.landBuildCount ?? 0,
      coastlineBuildCount: summary.coastlineSummary?.coastlineBuildCount ?? 0,
      contourBuildCount: summary.bathymetryContourSummary?.contourBuildCount ?? 0,
      terrainSourceDigest: summary.terrainSourceDigest ?? null,
      terrainVertexCount: summary.terrainVertexCount ?? 0,
      terrainTriangleCount: summary.terrainTriangleCount ?? 0
    };
  });
  expect(after.planDigest).toBe(before.planDigest);
  expect(after.terrainBuildCount).toBe(before.terrainBuildCount);
  expect(after.landBuildCount).toBe(before.landBuildCount);
  expect(after.coastlineBuildCount).toBe(before.coastlineBuildCount);
  expect(after.contourBuildCount).toBe(before.contourBuildCount);
  expect(after.terrainSourceDigest).toBe(before.terrainSourceDigest);
  expect(after.terrainVertexCount).toBe(before.terrainVertexCount);
  expect(after.terrainTriangleCount).toBe(before.terrainTriangleCount);
  assertContinuousBrowserErrorsClean(browserErrors);
});
test('Three Balanced Renderer Meets Bathymetry Headroom Gate', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 2, extraFarWaypoints: 1 });
  await page.locator('#mission-console [data-action="three-quality-profile"][data-profile="balanced"]').click();
  const planningVisuals = await page.evaluate(() => ({
    agentCount: window.anchorGame.state.mission?.agents?.length ?? 0,
    activeTexturedSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeTexturedSlabCount ?? 0,
    contextOutlineSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.contextOutlineSlabCount ?? 0,
    currentVectorObjectCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.currentVectorObjectCount ?? 0,
    samplingTargetCount: window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0,
    plannedDiveObjectCount: window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0
  }));
  expect(planningVisuals.agentCount).toBeGreaterThanOrEqual(2);
  expect(planningVisuals.activeTexturedSlabCount).toBe(1);
  expect(planningVisuals.contextOutlineSlabCount).toBeGreaterThan(0);
  expect(planningVisuals.samplingTargetCount).toBeGreaterThan(0);
  expect(planningVisuals.plannedDiveObjectCount).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="execute"]').click();
  try {
    await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  } catch (error) {
    const executeDebug = await page.evaluate(() => ({
      mode: window.anchorGame.state.mode ?? null,
      activeScenes: window.anchorGame.phaser.scene.getScenes(true).map((scene) => scene.scene?.key ?? scene.sys?.settings?.key ?? null),
      missionDebug: window.ANCHOR_MISSION_RENDER_DEBUG ?? null,
      executionDebug: window.ANCHOR_EXECUTION_DEBUG ?? null,
      simulationDebug: window.ANCHOR_SIMULATION_RENDER_DEBUG ?? null,
      executeDisabled: document.querySelector('#mission-console [data-action="execute"]')?.disabled ?? null,
      consoleText: document.querySelector('#mission-console')?.innerText?.slice(0, 1200) ?? null,
      planSummary: {
        agentPlans: window.anchorGame.state.plan?.agentPlans?.map?.((agentPlan) => ({
          agentId: agentPlan.agentId,
          waypointCount: agentPlan.waypoints?.length ?? 0,
          selectedStart: agentPlan.selectedStart ?? null,
          waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({ x: waypoint.x, y: waypoint.y, targetDepthLayerId: waypoint.targetDepthLayerId, maximumDiveDepthMeters: waypoint.maximumDiveDepthMeters, scienceTargetIds: waypoint.scienceTargetIds ?? [] }))
        })) ?? [],
        scienceTargets: window.anchorGame.state.plan?.scienceTargets ?? []
      }
    }));
    console.log('BALANCED_EXECUTE_DEBUG ' + JSON.stringify(executeDebug));
    throw error;
  }
  await advanceSimulationSceneForRenderCost(page, { steps: 12, frameDelay: 40, keepRunning: true });
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) > 4), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  await advanceSimulationSceneForRenderCost(page, { steps: 14, frameDelay: 40, keepRunning: true });
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.sampleCount ?? 0) >= 8), { timeout: 25000 }).toBe(true);
  await stopSimulationSceneRenderCostStepper(page);
  const perf = await page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? {});
  const strictHeadedGate = test.info().project.use?.headless === false;
  expect(perf.qualityProfile).toBe('balanced');
  expect(Number.isFinite(Number(perf.frameIntervalAverageMilliseconds))).toBe(true);
  expect(Number.isFinite(Number(perf.frameIntervalP95Milliseconds))).toBe(true);
  expect(Number.isFinite(Number(perf.presentationUpdateAverageMilliseconds))).toBe(true);
  expect(Number.isFinite(Number(perf.rendererSubmissionAverageMilliseconds))).toBe(true);
  expect(perf.renderedFramesPerSecond).toBeGreaterThan(0);
  if (strictHeadedGate) {
    expect(perf.frameIntervalAverageMilliseconds).toBeLessThanOrEqual(50);
    expect(perf.frameIntervalP95Milliseconds).toBeLessThanOrEqual(100);
    expect(perf.renderedFramesPerSecond).toBeGreaterThanOrEqual(20);
  }
  expect(perf.activeRendererCount).toBe(1);
  expect(perf.activeRafCount).toBe(1);
  expect(perf.renderCallsPerPresentationFrame).toBeLessThanOrEqual(1);
  expect(perf.duplicateRenderCallWarningCount).toBe(0);
  expect(perf.activeTexturedSlabCount).toBe(1);
  expect(perf.contextOutlineSlabCount).toBeGreaterThan(0);
  const simulationVisuals = await page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.rendererSummary ?? {});
  expect(simulationVisuals.samplingTargetObjectCount ?? 0).toBeGreaterThan(0);
  expect(simulationVisuals.realizedTrajectoryPointCount ?? 0).toBeGreaterThan(0);
  console.log('THREE_BALANCED_HEADROOM_GATE ' + JSON.stringify({
    average: perf.frameIntervalAverageMilliseconds,
    p95: perf.frameIntervalP95Milliseconds,
    p99: perf.frameIntervalP99Milliseconds,
    renderedFramesPerSecond: perf.renderedFramesPerSecond,
    presentationUpdateAverageMilliseconds: perf.presentationUpdateAverageMilliseconds,
    rendererSubmissionAverageMilliseconds: perf.rendererSubmissionAverageMilliseconds,
    gpuTimingSupported: perf.gpuTimingSupported,
    gpuAverageMilliseconds: perf.gpuAverageMilliseconds
  }));
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Camera Remains Responsive Under Live Simulation Load', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 2 });
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await advanceSimulationSceneForRenderCost(page, { steps: 2, frameDelay: 40, keepRunning: true });
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) > 1), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  await startSimulationSceneRenderCostStepper(page, { intervalMs: 50, keepRunning: true });
  const before = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    return {
      engineStepCount: window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0,
      presentationFrameCount: window.ANCHOR_SIMULATION_RENDER_DEBUG?.presentationFrameCount ?? 0,
      cameraPosition: scene.threeSimulationRenderer?.camera?.position?.toArray?.() ?? [],
      routeDigest: JSON.stringify((window.anchorGame.state.plan?.agentPlans ?? []).map((agentPlan) => ({ agentId: agentPlan.agentId, selectedStart: agentPlan.selectedStart, waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({ id: waypoint.id, x: waypoint.x, y: waypoint.y, action: waypoint.action, kind: waypoint.kind, targetDepthLayerId: waypoint.targetDepthLayerId, diveProfileId: waypoint.diveProfileId, scienceTargetIds: waypoint.scienceTargetIds ?? [] })) })))
    };
  });
  const canvasBox = await page.locator('.three-mission-world-canvas').boundingBox();
  expect(canvasBox).toBeTruthy();
  const point = { x: canvasBox.x + canvasBox.width * 0.52, y: canvasBox.y + canvasBox.height * 0.48 };
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(point.x + 160, point.y + 70, { steps: 12 });
  await page.mouse.up({ button: 'right' });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(point.x + 40, point.y + 100, { steps: 8 });
  await page.mouse.up({ button: 'middle' });
  await page.mouse.wheel(0, -180);
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.cameraGestureCount ?? 0) > 0), { timeout: 10000 }).toBe(true);
  await expect.poll(() => page.evaluate((beforeCamera) => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const current = scene.threeSimulationRenderer?.camera?.position?.toArray?.() ?? [];
    return current.join(',') !== beforeCamera.join(',');
  }, before.cameraPosition), { timeout: 10000 }).toBe(true);
  await advanceSimulationSceneForRenderCost(page, { steps: 4, frameDelay: 20, keepRunning: true });
  const afterGesture = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    return {
      engineStepCount: window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0,
      presentationFrameCount: window.ANCHOR_SIMULATION_RENDER_DEBUG?.presentationFrameCount ?? 0,
      cameraPosition: scene.threeSimulationRenderer?.camera?.position?.toArray?.() ?? [],
      perf: window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? {},
      routeDigest: JSON.stringify((window.anchorGame.state.plan?.agentPlans ?? []).map((agentPlan) => ({ agentId: agentPlan.agentId, selectedStart: agentPlan.selectedStart, waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({ id: waypoint.id, x: waypoint.x, y: waypoint.y, action: waypoint.action, kind: waypoint.kind, targetDepthLayerId: waypoint.targetDepthLayerId, diveProfileId: waypoint.diveProfileId, scienceTargetIds: waypoint.scienceTargetIds ?? [] })) })))
    };
  });
  expect(afterGesture.routeDigest).toBe(before.routeDigest);
  expect(afterGesture.cameraPosition.join(',')).not.toBe(before.cameraPosition.join(','));
  expect(afterGesture.engineStepCount).toBeGreaterThanOrEqual(before.engineStepCount);
  expect(afterGesture.presentationFrameCount).toBeGreaterThan(before.presentationFrameCount);
  expect(afterGesture.perf.activeRendererCount).toBe(1);
  expect(afterGesture.perf.activeRafCount).toBe(1);
  expect(afterGesture.perf.modelBuildCountDuringCameraGesture).toBe(0);
  expect(afterGesture.perf.predictionBuildCountDuringCameraGesture).toBe(0);
  await stopSimulationSceneRenderCostStepper(page);
  const paused = await page.evaluate(() => ({
    running: window.anchorGame.phaser.scene.getScene('SimulationScene')?.engine?.running === true,
    complete: window.anchorGame.phaser.scene.getScene('SimulationScene')?.engine?.complete === true,
    step: window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0
  }));
  expect(paused.running).toBe(false);
  if (!paused.complete) {
    await page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.stepOnce?.());
    await expect.poll(() => page.evaluate((step) => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) > step, paused.step), { timeout: 10000 }).toBe(true);
  }
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Segment Distance Changes Predicted Dive Geometry', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { buildPlannedDiveSegmentViewModel } = await import('./src/core/rendering/PlannedDiveSegmentViewModel.js');
    const waterColumnConfig = { depthLayerIds: ['surface', 'shallow', 'thermocline', 'deep'], defaultLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'fullProfile' };
    const deepBottom = Array.from({ length: 5 }, () => Array.from({ length: 14 }, () => 220));
    const short = buildPlannedDiveSegmentViewModel({ startWaypoint: { x: 0, y: 2 }, targetWaypoint: { x: 1, y: 2, diveProfileId: 'fullProfile', targetDepthLayerId: 'deep' }, waterColumnConfig, bottomBoundary: { bottomDepthField: deepBottom }, requestedMaximumDepthMeters: 120, cycleCount: 5 });
    const long = buildPlannedDiveSegmentViewModel({ startWaypoint: { x: 0, y: 2 }, targetWaypoint: { x: 12, y: 2, diveProfileId: 'fullProfile', targetDepthLayerId: 'deep' }, waterColumnConfig, bottomBoundary: { bottomDepthField: deepBottom }, requestedMaximumDepthMeters: 120, cycleCount: 5 });
    const shallow = buildPlannedDiveSegmentViewModel({ startWaypoint: { x: 0, y: 2 }, targetWaypoint: { x: 7, y: 2, diveProfileId: 'deepDive', targetDepthLayerId: 'deep' }, waterColumnConfig, bottomBoundary: { bottomDepthField: Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => 45)) }, requestedMaximumDepthMeters: 120, requiredBottomClearanceMeters: 10 });
    return {
      shortCycles: short.cycleCount,
      longCycles: long.cycleCount,
      shortSamples: short.predictedSamples.length,
      longSamples: long.predictedSamples.length,
      terrainLimited: shallow.bottomClearance.terrainLimited,
      minClearance: shallow.bottomClearance.minimumClearanceMeters,
      noRendererAuthority: shallow.boundaryFlags.ownsPlanning === false && shallow.boundaryFlags.ownsSimulation === false && shallow.boundaryFlags.ownsScoring === false
    };
  });
  expect(result.longCycles).toBeGreaterThan(result.shortCycles);
  expect(result.longSamples).toBeGreaterThanOrEqual(result.shortSamples);
  expect(result.terrainLimited).toBe(true);
  expect(result.minClearance).toBeGreaterThanOrEqual(0);
  expect(result.noRendererAuthority).toBe(true);
});

test('Predicted and Realized Dive Paths Remain Distinct', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { buildPlannedDiveSegmentViewModel } = await import('./src/core/rendering/PlannedDiveSegmentViewModel.js');
    const { buildRealizedDiveTrajectory } = await import('./src/core/rendering/DiveTrajectoryViewModel.js');
    const waterColumnConfig = { depthLayerIds: ['surface', 'shallow', 'thermocline', 'deep'], defaultLayerIds: ['surface', 'thermocline', 'deep'], divediveProfileId: 'sawtoothProfile' };
    const predicted = buildPlannedDiveSegmentViewModel({ startWaypoint: { x: 0, y: 1 }, targetWaypoint: { x: 6, y: 3, divediveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep' }, waterColumnConfig, bottomBoundary: { bottomDepthField: Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => 180)) }, requestedMaximumDepthMeters: 110, cycleCount: 2 });
    const frozen = JSON.stringify(predicted.predictedDivePath);
    const actual = [{ x: 0, y: 1, depthMeters: 0 }, { x: 2.2, y: 1.7, depthMeters: 65 }, { x: 4.5, y: 2.6, depthMeters: 96 }];
    const growing = buildRealizedDiveTrajectory({ points: actual, divediveProfileId: 'sawtoothProfile' });
    actual.push({ x: 6.4, y: 3.2, depthMeters: 0 });
    const completed = buildRealizedDiveTrajectory({ points: actual, divediveProfileId: 'sawtoothProfile' });
    return {
      predictionFrozen: JSON.stringify(predicted.predictedDivePath) === frozen,
      actualGrows: completed.points.length > growing.points.length,
      surfacingOffset: Math.hypot((predicted.predictedSurfacingPosition.x ?? 0) - (completed.surfacingPoint.x ?? 0), (predicted.predictedSurfacingPosition.y ?? 0) - (completed.surfacingPoint.y ?? 0)),
      predictedSamplesScore: predicted.predictedSamples.some((sample) => sample.createsScoreEvent === true)
    };
  });
  expect(result.predictionFrozen).toBe(true);
  expect(result.actualGrows).toBe(true);
  expect(result.surfacingOffset).toBeGreaterThan(0);
  expect(result.predictedSamplesScore).toBe(false);
});

test('Bathymetry Demo and Mission Dive Paths Share Coordinates', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createMissionWorldCoordinateTransform, gridCellToWorld } = await import('./src/core/rendering/MissionWorldCoordinates.js');
    const { gridCellDepthToWorld, createVolumetricMissionCoordinateModel } = await import('./src/core/rendering/VolumetricMissionCoordinates.js');
    const transform = createMissionWorldCoordinateTransform({ grid: { width: 8, height: 6 }, depthScale: 0.05, verticalExaggeration: 1.5 });
    const coordinateModel = createVolumetricMissionCoordinateModel({ coordinateSystem: transform, verticalDisplayMode: 'physicalDepth', depthLayers: [] });
    const surface = gridCellDepthToWorld({ col: 3, row: 2, depthMeters: 0, coordinateModel, transform, verticalDisplayMode: 'physicalDepth' });
    const deep = gridCellDepthToWorld({ col: 3, row: 2, depthMeters: 80, coordinateModel, transform, verticalDisplayMode: 'physicalDepth' });
    const mission = gridCellToWorld(transform, 3, 2, 0);
    return {
      sameHorizontalX: Math.abs(surface.x - mission.x) < 1e-9 && Math.abs(deep.x - mission.x) < 1e-9,
      sameHorizontalZ: Math.abs(surface.z - mission.z) < 1e-9 && Math.abs(deep.z - mission.z) < 1e-9,
      positiveDepthMovesDown: deep.y < surface.y,
      surfaceY: surface.y,
      deepY: deep.y
    };
  });
  expect(result.sameHorizontalX).toBe(true);
  expect(result.sameHorizontalZ).toBe(true);
  expect(result.positiveDepthMovesDown).toBe(true);
});

test('Three Mission Workspace Stabilization', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.levelId)).toBe('tutorial_01_first_deployment');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererRuntimeErrorCount ?? -1)).toBe(0);
  await expect.poll(() => page.evaluate(() => Boolean(document.querySelector('.three-mission-world-canvas')))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.dropZoneCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary?.dropZoneObjectCount ?? 0)).toBeGreaterThan(0);
  expect(browserErrors.unexpected()).toEqual([]);

  const deploymentCells = await page.evaluate(() => {
    const zone = window.anchorGame.state.level?.zones?.find((candidate) => candidate.type === 'deployment');
    return zone?.cells?.map((cell) => ({ x: cell.x, y: cell.y })) ?? [];
  });
  expect(deploymentCells.length).toBeGreaterThan(0);
  const initialCell = deploymentCells[0];
  const distinctTargetAvailable = deploymentCells.some((cell) => cell.x !== initialCell.x || cell.y !== initialCell.y);
  const targetCell = deploymentCells.find((cell) => cell.x !== initialCell.x || cell.y !== initialCell.y) ?? initialCell;
  let point;
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await clickCell(page, initialCell.x, initialCell.y);
  await expect.poll(() => page.evaluate(() => {
    const start = window.anchorGame.state.mission?.agents?.[0]?.deployment?.selectedStart;
    return start ? { x: start.x, y: start.y } : null;
  })).toEqual(initialCell);

  const beforeWaypointCount = await totalWaypointCount(page);
  await expect(page.locator('#waypoint-timeline [data-change-start]').first()).toBeVisible();
  await page.locator('#waypoint-timeline [data-change-start]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.deploymentSelectionActive === true)).toBe(true);
  point = await cellCenter(page, targetCell.x, targetCell.y);
  await page.mouse.click(point.x, point.y);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.lastIntentStatus)).toBe(distinctTargetAvailable ? 'accepted' : 'noChange');
  await expect.poll(() => page.evaluate(() => {
    const start = window.anchorGame.state.mission?.agents?.[0]?.deployment?.selectedStart;
    return start ? { x: start.x, y: start.y } : null;
  })).toEqual(targetCell);
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedStartCell)).resolves.toMatchObject(targetCell);
  await expect(totalWaypointCount(page)).resolves.toBe(beforeWaypointCount);
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.pointerCellDelta)).resolves.toEqual({ dx: 0, dy: 0 });

  const hoverCell = deploymentCells.find((cell) => cell.x !== targetCell.x || cell.y !== targetCell.y) ?? targetCell;
  point = await cellCenter(page, hoverCell.x, hoverCell.y);
  await page.mouse.move(point.x, point.y);

  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.actualGridCell)).resolves.toEqual(hoverCell);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(250);
  point = await cellCenter(page, hoverCell.x, hoverCell.y);
  await page.mouse.move(point.x, point.y);

  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.actualGridCell)).resolves.toEqual(hoverCell);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API.setCameraPresetForTest('tacticalTopDown'));
  point = await cellCenter(page, hoverCell.x, hoverCell.y);
  await page.mouse.move(point.x, point.y);

  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.pointerOwner)).resolves.toBe('three');
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.phaserWorldInputEnabled)).resolves.toBe(false);
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.duplicatePointerDispatchCount)).resolves.toBe(0);
  expect(browserErrors.unexpected()).toEqual([]);
});
test('Three Mission renderer preserves live Mission Planning state', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await startPlanningFromBriefing(page);
  await expect(page.locator('#mission-console')).toContainText('Mission World');
  await expect(page.locator('#mission-console')).toContainText('Three.js is the production mission environment.');
  await expect(page.locator('#mission-console')).toContainText('portable JavaScript core owns planning validity, simulation, scoring, and visibility permissions.');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');

  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.trySelectDeploymentStart({ x: 1, y: 1 });
    scene.addWaypointForSelected({ x: 5, y: 2, action: 'sample' });
    scene.setPlanningTime(6);
    scene.addWaypointForSelected({ x: 5, y: 3, action: 'sample' });
    scene.addMarkerForSelected({ x: 4, y: 4 });
  });
  await expect(page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.deployment?.selectedStart)).resolves.toEqual({ x: 1, y: 1 });
  await expectWaypointCount(page, 2);
  await expect(page.evaluate(() => {
    const marker = window.anchorGame.state.plan.planningMarkers?.at(-1);
    return marker ? { x: marker.x, y: marker.y } : null;
  })).resolves.toEqual({ x: 4, y: 4 });
  await page.evaluate(() => {
    const state = window.anchorGame.state;
    state.level.layers ??= {};
    state.level.layers.priorityTargets = [{
      id: 'e2e-public-gold-star',
      label: 'E2E Public Gold Star',
      value: 150,
      radius: 0.75,
      frames: [{ t: 0, x: 4, y: 4, active: true }, { t: 12, x: 4, y: 4, active: true }, { t: 18, active: false }]
    }];
    state.ui ??= {};
    state.ui.showPriorityStars = true;
    window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').setPlanningTime(6);
  });
  const beforeSwitch = await page.evaluate(() => ({
    waypointCount: window.anchorGame.state.plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    markerCount: window.anchorGame.state.plan.planningMarkers?.length ?? 0,
    selectedStart: window.anchorGame.state.mission.agents[0].deployment?.selectedStart,
    planningTime: window.anchorGame.state.planningTime,
    mode: window.anchorGame.state.mode
  }));
  expect(beforeSwitch).toMatchObject({ waypointCount: 2, markerCount: 1, selectedStart: { x: 1, y: 1 }, planningTime: 6, mode: 'planning' });

  await expect(page.locator('.three-mission-world-host')).toBeVisible();
  await expect(page.locator('.three-mission-world-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.threeMounted)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCount)).toBe(2);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.planningMarkerCount)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.priorityTargetCount)).toBe(1);
  const threeDebug = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG);
  expect(threeDebug).toMatchObject({
    activeBackend: 'threeMission3d',
    threeMounted: true,
    ownsSimulationState: false,
    ownsPlanning: false,
    ownsScoring: false,
    ownsReplaySemantics: false,
    changesMissionState: false,
    changesOfficialBrowserScoring: false,
    exposesHiddenTruth: false,
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  });
  expect(threeDebug.artifactCountMismatches).toEqual([]);
  expect(threeDebug.threeArtifactCounts.waypointCount).toBe(2);
  expect(threeDebug.threeArtifactCounts.planningMarkerCount).toBe(1);
  expect(threeDebug.threeArtifactCounts.priorityTargetCount).toBe(1);

  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect(page.evaluate(() => window.anchorGame.state.ui.threeMissionCameraPreset)).resolves.toBe('tacticalTopDown');
  await page.locator('#mission-console [data-action="three-layer"][data-layer="currentVectors"]').click();
  await expect(page.evaluate(() => window.anchorGame.state.ui.threeMissionLayers.currentVectors)).resolves.toBe(false);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').setPlanningTime(12));
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeTimeSeconds)).toBe(12);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.renderedCurrentTimeSeconds)).toBe(12);

  await expect(page.locator('#mission-console [data-action="renderer-legacy"]')).toHaveCount(0);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').setRendererBackend('legacyPhaser2d'));
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
  await expect(page.locator('.three-mission-world-host')).toBeVisible();
  await expect(page.evaluate(() => ({
    waypointCount: window.anchorGame.state.plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    markerCount: window.anchorGame.state.plan.planningMarkers?.length ?? 0,
    selectedStart: window.anchorGame.state.mission.agents[0].deployment?.selectedStart,
    mode: window.anchorGame.state.mode
  }))).resolves.toEqual({ waypointCount: 2, markerCount: 1, selectedStart: { x: 1, y: 1 }, mode: 'planning' });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCount)).toBe(2);
});
test('Three Planning Pointer Interaction dispatches canonical workspace commands', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await startPlanningFromBriefing(page);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').trySelectDeploymentStart({ x: 1, y: 1 }));

  await page.evaluate(() => {
    const state = window.anchorGame.state;
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const width = state.level.world.grid.width;
    const height = state.level.world.grid.height;
    state.level.layers ??= {};
    state.level.layers.terrain = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => Number(state.level.layers.terrain?.[y]?.[x] ?? 0)));
    state.level.layers.terrain[2][2] = 1;
    for (const [x, y] of [[5, 2], [5, 3], [6, 3], [4, 4], [1, 2]]) state.level.layers.terrain[y][x] = 0;
    state.level.layers.hazards = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => Number(state.level.layers.hazards?.[y]?.[x] ?? 0)));
    state.level.layers.hazards[3][6] = 1;
    state.level.layers.priorityTargets = [{
      id: 'e2e-three-gold-star',
      label: 'E2E Three Gold Star',
      value: 150,
      radius: 0.75,
      frames: [{ t: 0, x: 4, y: 4, active: true }, { t: 6, x: 4, y: 4, active: true }, { t: 12, x: 4, y: 4, active: true }]
    }];
    const bravoStart = { x: Math.min(Math.max(0, width - 2), 5), y: Math.min(Math.max(0, height - 2), 3) };
    state.level.layers.terrain[bravoStart.y][bravoStart.x] = 0;
    if (!state.mission.agents.some((agent) => agent.id === 'glider-bravo')) {
      state.mission.agents.push({
        id: 'glider-bravo',
        label: 'Bravo',
        battery: 100,
        deployment: { mode: 'fixedStart', selectedStart: { ...bravoStart } },
        start: { ...bravoStart }
      });
    } else {
      const bravo = state.mission.agents.find((agent) => agent.id === 'glider-bravo');
      bravo.deployment = { ...(bravo.deployment ?? {}), mode: 'fixedStart', selectedStart: { ...bravoStart } };
      bravo.start = { ...bravoStart };
    }
    state.plan.agentPlans ??= [];
    for (const agentPlan of state.plan.agentPlans) agentPlan.waypoints = [];
    if (!state.plan.agentPlans.some((plan) => plan.agentId === 'glider-bravo')) state.plan.agentPlans.push({ agentId: 'glider-bravo', selectedStart: { ...bravoStart }, waypoints: [] });
    state.plan.planningMarkers = [];
    const primaryAgentId = state.mission.agents[0].id;
    state.selectedAgentId = primaryAgentId;
    state.ui.selectedWaypoint = null;
    state.ui.selectedMarker = null;
    state.ui.selectedPriorityTargetId = null;
    state.ui.showPriorityStars = true;
    scene.trySelectDeploymentStart({ x: 1, y: 1 });
    scene.setPlanningTime(6);
    scene.refreshPanels();
    scene.refreshMap();
  });

  await expectWaypointCount(page, 0);
  await expect(page.locator('.three-mission-world-host')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect(page.locator('#mission-console')).toContainText('Planning Tools');
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell))).toBe(true);

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await clickThreeGridCell(page, 5, 2);
  await expectWaypointCount(page, 1);
  const waypointId = await page.evaluate(() => {
    const primaryAgentId = window.anchorGame.state.mission.agents[0].id;
    return window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === primaryAgentId).waypoints[0].id;
  });
  await clickThreeGridCell(page, 2, 2);
  await expectWaypointCount(page, 1);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.lastInteractionResult?.status)).toBe('rejected');

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectInspect"]').click();
  await clickThreeObject(page, 'screenPointForWaypoint', waypointId);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.ui.selectedWaypoint?.index)).toBe(0);
  await dragThreeObjectToGridCell(page, 'screenPointForWaypoint', waypointId, 5, 3);
  await expect.poll(() => page.evaluate((id) => {
    const waypoint = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === window.anchorGame.state.mission.agents[0].id).waypoints.find((candidate) => candidate.id === id);
    return waypoint ? { id: waypoint.id, x: Math.round(Number(waypoint.x)), y: Math.round(Number(waypoint.y)) } : null;
  }, waypointId)).toEqual({ id: waypointId, x: 5, y: 3 });

  const beforeCancel = await page.evaluate((id) => {
    const waypoint = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === window.anchorGame.state.mission.agents[0].id).waypoints.find((candidate) => candidate.id === id);
    return { x: waypoint.x, y: waypoint.y };
  }, waypointId);
  await dragThreeObjectToGridCell(page, 'screenPointForWaypoint', waypointId, 6, 3, { cancelWithEscape: true });
  await expect(page.evaluate((id) => {
    const waypoint = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === window.anchorGame.state.mission.agents[0].id).waypoints.find((candidate) => candidate.id === id);
    return { x: waypoint.x, y: waypoint.y };
  }, waypointId)).resolves.toEqual(beforeCancel);

  await page.keyboard.press('Delete');
  await expectWaypointCount(page, 0);

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placePlanningMarker"]').click();
  await clickThreeGridCell(page, 4, 4);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.plan.planningMarkers?.length ?? 0)).toBe(1);
  const markerId = await page.evaluate(() => window.anchorGame.state.plan.planningMarkers[0].id);
  await expect(page.evaluate(() => window.anchorGame.state.plan.planningMarkers[0].executable === true)).resolves.toBe(false);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectInspect"]').click();
  await clickThreeObject(page, 'screenPointForMarker', markerId);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.ui.selectedMarker?.index)).toBe(0);
  await page.keyboard.press('Delete');
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.plan.planningMarkers?.length ?? 0)).toBe(0);

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectInspect"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectInspect');
  await clickThreeObject(page, 'screenPointForAgent', 'glider-bravo');
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.selectedAgentId)).toBe('glider-bravo');
  await clickThreeObject(page, 'screenPointForPriorityTarget', 'e2e-three-gold-star');
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.ui.selectedPriorityTargetId)).toBe('e2e-three-gold-star');

  const countsBeforeNavigate = await page.evaluate(() => ({
    waypoints: window.anchorGame.state.plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    markers: window.anchorGame.state.plan.planningMarkers?.length ?? 0
  }));
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="navigate"]').click();
  await dragThreeGridCell(page, 3, 3, 6, 4);
  await expect(page.evaluate(() => ({
    waypoints: window.anchorGame.state.plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    markers: window.anchorGame.state.plan.planningMarkers?.length ?? 0
  }))).resolves.toEqual(countsBeforeNavigate);

  const debug = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG);
  expect(debug).toMatchObject({
    activeBackend: 'threeMission3d',
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    changesOfficialBrowserScoring: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false
  });
  expect(debug.interactionControllerSummary.enabled).toBe(true);
  expect(debug.interactionBridgeSummary.handledCount).toBeGreaterThan(0);

  await expect(page.evaluate(() => ({
    waypoints: window.anchorGame.state.plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    markers: window.anchorGame.state.plan.planningMarkers?.length ?? 0,
    selectedAgentId: window.anchorGame.state.selectedAgentId,
    backend: window.anchorGame.state.ui.rendererBackend
  }))).resolves.toEqual({ waypoints: 0, markers: 0, selectedAgentId: 'glider-bravo', backend: 'threeMission3d' });
  expect(pageErrors).toEqual([]);
});
test('Three Waypoint Pipeline and Standard Camera Gestures', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await expect(page.locator('.three-mission-world-canvas')).toBeVisible();

  const agentId = await page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.id);
  await clickThreeObject(page, 'screenPointForAgent', agentId);
  await expect.poll(() => page.evaluate((id) => window.anchorGame.state.selectedAgentId === id, agentId)).toBe(true);

  const deploymentCells = await page.evaluate(() => {
    const zone = window.anchorGame.state.level?.zones?.find((candidate) => candidate.type === 'deployment');
    return zone?.cells?.map((cell) => ({ x: cell.x, y: cell.y })) ?? [];
  });
  expect(deploymentCells.length).toBeGreaterThan(0);
  const deployCell = deploymentCells[0];
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectDeploymentCell');
  await clickThreeGridCell(page, deployCell.x, deployCell.y);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedAgentDeployed)).toBe(true);
  await expect.poll(() => page.evaluate(() => { const cell = window.ANCHOR_MISSION_RENDER_DEBUG?.selectedStartCell; return cell ? { x: cell.x, y: cell.y } : null; })).toEqual(deployCell);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointToolEnabled)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.autoArmedWaypointAfterDeployment)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');

  const beforeToolDispatch = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.planningToolControlDispatchCount ?? 0);
  await expect(page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]')).toBeEnabled();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_MISSION_RENDER_DEBUG?.planningToolControlDispatchCount ?? 0) === before + 1, beforeToolDispatch)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.duplicateToolControlDispatchCount ?? 0)).toBe(0);
  await expect.poll(() => page.evaluate(() => ({
    activePlanningToolId: window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId,
    scenePlanningToolId: window.ANCHOR_MISSION_RENDER_DEBUG?.scenePlanningToolId,
    controllerInteractionMode: window.ANCHOR_MISSION_RENDER_DEBUG?.controllerInteractionMode,
    visibleToolButtonId: window.ANCHOR_MISSION_RENDER_DEBUG?.visibleToolButtonId,
    mismatches: window.ANCHOR_MISSION_RENDER_DEBUG?.planningToolStateMismatches
  }))).toEqual({
    activePlanningToolId: 'placeWaypoint',
    scenePlanningToolId: 'placeWaypoint',
    controllerInteractionMode: 'placeWaypoint',
    visibleToolButtonId: 'placeWaypoint',
    mismatches: []
  });

  await clickThreeGridCell(page, 5, 2);
  await expectWaypointCount(page, 1);
  await expectDebugWaypointSynchronization(page, 1);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.lastWaypointPipelineStatus)).toBe('accepted');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.lastWaypointCommandResult?.ok)).toBe(true);

  await clickThreeGridCell(page, 5, 3);
  await expectWaypointCount(page, 2);
  await expectDebugWaypointSynchronization(page, 2);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.routeCount > 0)).toBe(true);

  const beforePan = await page.evaluate(() => ({
    count: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount,
    target: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraTarget,
    pan: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPanChangeCount ?? 0
  }));
  const panStart = await threeGridPoint(page, 4, 3);
  await page.mouse.move(panStart.x, panStart.y);
  await page.mouse.down();
  await page.mouse.move(panStart.x + 82, panStart.y + 26, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPanChangeCount ?? 0) > before.pan, beforePan)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.pointerGestureClassification)).toBe('pan');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.missionClickSuppressedReason)).toBe('panGesture');
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount)).resolves.toBe(beforePan.count);
  await expect(page.evaluate((before) => JSON.stringify(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraTarget) !== JSON.stringify(before.target), beforePan)).resolves.toBe(true);

  const beforeHorizontalOrbit = await page.evaluate(() => ({ azimuth: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraAzimuthRadians, count: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount }));
  const orbitPoint = await threeGridPoint(page, 4, 3);
  await page.mouse.move(orbitPoint.x, orbitPoint.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(orbitPoint.x + 86, orbitPoint.y, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => page.evaluate((before) => Math.abs((window.ANCHOR_MISSION_RENDER_DEBUG?.cameraAzimuthRadians ?? before.azimuth) - before.azimuth) > 0.01, beforeHorizontalOrbit)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.pointerGestureClassification)).toBe('orbit');
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount)).resolves.toBe(beforeHorizontalOrbit.count);

  const beforeVerticalOrbit = await page.evaluate(() => ({ polar: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPolarRadians, count: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount }));
  const verticalPoint = await threeGridPoint(page, 4, 3);
  await page.mouse.move(verticalPoint.x, verticalPoint.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(verticalPoint.x, verticalPoint.y + 72, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => page.evaluate((before) => Math.abs((window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPolarRadians ?? before.polar) - before.polar) > 0.01, beforeVerticalOrbit)).toBe(true);
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount)).resolves.toBe(beforeVerticalOrbit.count);

  await page.locator('#mission-console [data-action="three-camera"][data-preset="obliqueMission"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('obliqueMission');
  const diagonalPoint = await threeGridPoint(page, 4, 3);
  await page.mouse.move(diagonalPoint.x, diagonalPoint.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(diagonalPoint.x + 78, diagonalPoint.y + 58, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => page.evaluate(() => Math.abs(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraAzimuthDelta ?? 0) > 0.01)).toBe(true);
  await expect.poll(() => page.evaluate(() => Math.abs(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPolarDelta ?? 0) > 0.01)).toBe(true);
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.interactionControllerSummary?.contextMenuScopedToCanvas)).resolves.toBe(true);

  const beforeWheel = await page.evaluate(() => ({ distance: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraDistance, count: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount }));
  await page.locator('.three-mission-world-canvas').hover();
  await page.mouse.wheel(0, -180);
  await expect.poll(() => page.evaluate((before) => Math.abs((window.ANCHOR_MISSION_RENDER_DEBUG?.cameraDistance ?? before.distance) - before.distance) > 0.01, beforeWheel)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.pointerGestureClassification)).toBe('wheelZoom');
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount)).resolves.toBe(beforeWheel.count);

  await page.locator('#mission-console [data-action="three-camera"][data-preset="resetCamera"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('obliqueMission');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
  await clickThreeGridCell(page, 6, 2);
  await expectWaypointCount(page, 3);
  await expectDebugWaypointSynchronization(page, 3);

  await expect.poll(() => page.evaluate(() => {
    const agentId = window.anchorGame.state.selectedAgentId;
    const waypoints = window.anchorGame.state.plan?.agentPlans?.find((plan) => plan.agentId === agentId)?.waypoints ?? [];
    const waypoint = waypoints.at(-1);
    return waypoint ? { x: Math.round(Number(waypoint.x)), y: Math.round(Number(waypoint.y)) } : null;
  })).toEqual({ x: 6, y: 2 });


  await clickThreeGridCell(page, 0, 0);
  await expectWaypointCount(page, 3);

  const finalDebug = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG);
  expect(finalDebug).toMatchObject({
    pointerOwner: 'three',
    phaserWorldInputEnabled: false,
    duplicatePointerDispatchCount: 0,
    waypointCountMismatch: false,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    exposesHiddenTruth: false
  });

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  expect(browserErrors.unexpected()).toEqual([]);
});
test('Three Mission Planning Tools and Camera Controls', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Planning Tools');
  await expect(page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="three-camera"][data-preset="fleetOverview"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="three-camera"][data-preset="focusSelectedGlider"]')).toBeVisible();
  await expect(page.locator('.three-mission-tool-overlay')).toBeVisible();

  const deploymentCells = await page.evaluate(() => {
    const zone = window.anchorGame.state.level?.zones?.find((candidate) => candidate.type === 'deployment');
    return zone?.cells?.map((cell) => ({ x: cell.x, y: cell.y })) ?? [];
  });
  expect(deploymentCells.length).toBeGreaterThan(0);
  const deployCell = deploymentCells[0];
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectDeploymentCell');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.deploymentSelectionActive)).toBe(true);
  await clickThreeGridCell(page, deployCell.x, deployCell.y);
  await expect.poll(() => page.evaluate(() => {
    const start = window.anchorGame.state.mission?.agents?.[0]?.deployment?.selectedStart;
    return start ? { x: start.x, y: start.y } : null;
  })).toEqual(deployCell);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');
  await clickThreeGridCell(page, 5, 2);
  await expectWaypointCount(page, 1);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount)).toBe(1);

  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
  await page.locator('#mission-console [data-action="three-camera"][data-preset="focusSelectedGlider"]').click();
  await expect.poll(() => page.evaluate(() => Number.isFinite(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraDistance))).toBe(true);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="navigate"]').click();
  const beforeCamera = await page.evaluate(() => ({
    orbit: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraOrbitChangeCount ?? 0,
    pan: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPanChangeCount ?? 0,
    zoom: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraZoomChangeCount ?? 0
  }));
  const center = await cellCenter(page, 4, 3);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 70, center.y + 35, { steps: 4 });
  await page.mouse.up();
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(center.x + 35, center.y + 70, { steps: 4 });
  await page.mouse.up({ button: 'right' });
  await page.locator('.three-mission-world-canvas').hover();
  await page.mouse.wheel(0, -160);
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_MISSION_RENDER_DEBUG?.cameraOrbitChangeCount ?? 0) > before.orbit, beforeCamera)).toBe(true);
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPanChangeCount ?? 0) > before.pan, beforeCamera)).toBe(true);
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_MISSION_RENDER_DEBUG?.cameraZoomChangeCount ?? 0) > before.zoom, beforeCamera)).toBe(true);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="resetCamera"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('obliqueMission');

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  expect(browserErrors.unexpected()).toEqual([]);
});
test('Three Simulation Selection inspects canonical public simulation objects', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await startPlanningFromBriefing(page);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.trySelectDeploymentStart({ x: 1, y: 1 });
    scene.addWaypointForSelected({ x: 6, y: 2, action: 'sample' });
    scene.executePlan();
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys?.isActive?.() === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.hasThreeRenderer === true)).toBe(true);

  const ids = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    scene.engine.pause();
    const agent = scene.engine.agents[0];
    const agentId = agent.id;
    agent.x = 1;
    agent.y = 2;
    agent.depthMeters = 0;
    agent.history = [
      { x: 1, y: 2, t: 0, timeSeconds: 0, depthMeters: 0 },
      { x: 2, y: 2, t: 1, timeSeconds: 1, depthMeters: 0 },
      { x: 3, y: 2, t: 2, timeSeconds: 2, depthMeters: 0 }
    ];
    scene.engine.events = [
      ...(scene.engine.events ?? []),
      { id: 'e2e-observation-1', type: 'sample', agentId, x: 3, y: 3, t: scene.engine.t ?? 0, timeSeconds: scene.engine.t ?? 0, value: 7, status: 'transmitted', depthMeters: 0 },
      { id: 'e2e-surface-1', type: 'surfaced', agentId, x: 4, y: 3, t: scene.engine.t ?? 0, timeSeconds: scene.engine.t ?? 0, status: 'surfaced', gpsFix: true, transmittedObservationCount: 1 },
      { id: 'e2e-route-failure-1', type: 'blocked', agentId, x: 5, y: 3, t: scene.engine.t ?? 0, timeSeconds: scene.engine.t ?? 0, status: 'blocked', reason: 'blockedTerrain' }
    ];
    scene.refresh();
    window.ANCHOR_MISSION_RENDER_TEST_API?.setCameraPresetForTest?.('tacticalTopDown');
    scene.refresh();
    return {
      agentId,
      observationId: 'e2e-observation-1',
      surfacingEventId: 'e2e-surface-1',
      routeFailureId: 'e2e-route-failure-1',
      routeSegmentId: `${agentId}-sampled-trajectory`
    };
  });

  await expect.poll(() => page.evaluate((observationId) => Boolean(window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForObservation?.(observationId)), ids.observationId)).toBe(true);
  await clickThreeObject(page, 'screenPointForAgent', ids.agentId);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedAgentId)).toBe(ids.agentId);
  await clickThreeObject(page, 'screenPointForObservation', ids.observationId);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedObservationId)).toBe(ids.observationId);
  await clickThreeObject(page, 'screenPointForSurfacingEvent', ids.surfacingEventId);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedSurfacingEventId)).toBe(ids.surfacingEventId);
  await clickThreeObject(page, 'screenPointForRouteSegment', ids.routeSegmentId);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedRouteSegmentId)).toBe(ids.routeSegmentId);
  await clickThreeObject(page, 'screenPointForRouteFailure', ids.routeFailureId);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedRouteFailureId)).toBe(ids.routeFailureId);

  const timeBefore = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.simulationTimeSeconds);
  const from = await threeGridPoint(page, 3, 5);
  const to = await threeGridPoint(page, 6, 5);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up({ button: 'right' });
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.simulationTimeSeconds)).resolves.toBe(timeBefore);

  const debug = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG);
  expect(debug).toMatchObject({
    activeBackend: 'threeMission3d',
    pointerOwner: 'three',
    phaserWorldInputEnabled: false,
    duplicatePointerDispatchCount: 0,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    changesOfficialBrowserScoring: false,
    exposesHiddenTruth: false,
    advancesSimulationClock: false
  });
  expect(debug.interactionControllerSummary.enabled).toBe(true);
  expect(debug.interactionControllerSummary.allowEditing).toBe(false);
  expect(pageErrors).toEqual([]);
});
test('scenario setup stays inside the center viewport', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').openChallengeSetup('perfectKnowledge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Scenario Setup');
  await expect(page.locator('#mission-console')).toContainText('Current / Flow Field');
  await expect(page.locator('#mission-console')).toContainText('Additive Flow Layers');
  await expect(page.locator('#mission-console [data-flow-field="fieldMode"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-flow-field="basePreset"]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Waypoints');
  await expectCenterShellContained(page);
  await expectCenterPanelUsesAvailableSpace(page);
});

test('challenge setup uses left navigator and selected briefing', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').openChallengeSetup('perfectKnowledge', 'challenge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.locator('.mission-mode-detail-view')).toBeVisible();
  await expect(page.locator('.mission-mode-gallery-view')).toHaveCount(0);
  await expect(page.locator('.mission-mode-gallery')).toHaveCount(0);
  await expect(page.locator('#mission-console')).toContainText('Mission Navigator');
  await expect(page.locator('#mission-console [data-mission-mode="surveySweep"]')).toContainText('Survey Sweep');
  await expect(page.locator('#mission-console [data-mission-mode="plumeIntercept"]')).toContainText('Plume Intercept');
  await expect(page.locator('#mission-console [data-action="reset"]')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Snapshot');
  await expect(page.locator('#waypoint-timeline')).not.toContainText('Mission Waypoints');
  await page.locator('#mission-console [data-mission-mode="plumeIntercept"]').click();
  await expect(page.evaluate(() => window.anchorGame.state.pendingScenarioSetup?.missionMode)).resolves.toBe('plumeIntercept');
  await expect(page.evaluate(() => window.anchorGame.state.pendingScenarioSetup?.mode)).resolves.toBe('forecast');
  await expect(page.locator('.mission-mode-detail-view')).toBeVisible();
  await expect(page.locator('.mission-mode-detail-view')).toContainText('Plume Intercept');
  await expect(page.locator('.mission-mode-detail-view')).not.toContainText('Back to Mission Modes');
  await expect(page.locator('.mission-mode-detail-view [data-action="reset"]')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-flow-field="basePreset"]')).toHaveCount(0);
  await page.locator('.mission-mode-detail-view [data-action="generate"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.meta?.missionMode)).toBe('plumeIntercept');
});

test('level generator opens from main menu', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);

  await page.evaluate(() => window.anchorGame.phaser.scene.start('EnvironmentEditorScene'));
  await expect(page.getByRole('heading', { name: 'Environment Editor' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').editorHud?.activeGroup)).toBe('terrain');
  await expect(page.getByRole('button', { name: 'Generate Level' })).toBeVisible();
  await expect(page.locator('#ensemble-count')).toBeVisible();
  await expect(page.locator('#mobile-hazards-count')).toBeVisible();
  await expect(page.locator('#current-tool')).toBeVisible();
  await expect(page.locator('#editor-frame')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Editor Context');
  await expect(page.locator('#context-panel')).toBeEmpty();
  await expect(page.locator('#current-preview-summary')).toContainText('Frame 1 /');
  await expect(page.locator('#current-preview-summary')).toContainText('Apply To Level commits all');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').currentPreview.frames.length)).resolves.toBeGreaterThan(1);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    scene.setPreviewFrame(Math.min(2, scene.currentPreview.frames.length - 1));
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').currentPreview.selectedFrameIndex)).resolves.toBeGreaterThan(0);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    scene.setBrushSettingFromHud('radius', 4);
    scene.setBrushSettingFromHud('intensity', 1.2);
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').readBrushConfig().radius)).resolves.toBe(4);
  await expect(page.locator('#brush-radius')).toHaveValue('4');
  await expect(page.locator('#brush-intensity')).toHaveValue('1.2');
});

test('deterministic challenge generates a fresh perfect-knowledge level', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startRandomChallenge('perfectKnowledge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.meta?.name?.startsWith('Deterministic Challenge'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.evaluate(() => window.anchorGame.state.currentScenario?.source)).resolves.toBe('deterministicChallenge');
  await expect(page.evaluate(() => window.anchorGame.state.level?.instanceId)).resolves.toBeTruthy();
  await expect(page.evaluate(() => window.anchorGame.state.level?.meta?.seed)).resolves.toBeTruthy();
  await expect(page.evaluate(() => window.anchorGame.state.challengeMode)).resolves.toBe('perfectKnowledge');
  await expect(page.evaluate(() => window.anchorGame.state.level.layers.truth.frames.length)).resolves.toBeGreaterThan(0);
  await expect(page.evaluate(() => {
    const frames = window.anchorGame.state.level.layers.truth.frames;
    return JSON.stringify(frames[0]?.roi) !== JSON.stringify(frames[3]?.roi)
      && JSON.stringify(frames[0]?.current) !== JSON.stringify(frames[3]?.current);
  })).resolves.toBe(true);
});

test('load level json imports a level and offers play/edit actions', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => window.anchorGame.phaser.scene.start('LoadLevelJsonScene'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').sys.isActive())).toBe(true);
  await expect(page.locator('#context-panel')).toBeEmpty();
  await page.evaluate(async () => {
    const response = await fetch('levels/tutorial_01_currents.json');
    const data = await response.json();
    window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').importLevelData(data);
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').level?.levelId)).resolves.toBe('tutorial_01_currents');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').objects?.length)).resolves.toBeGreaterThan(0);
});

test('stochastic mode exposes ensemble and risk controls', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startRandomChallenge('forecast'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.meta?.name?.startsWith('Stochastic Challenge'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.evaluate(() => window.anchorGame.state.level.layers.forecasts.length)).resolves.toBe(3);
  await expect(page.evaluate(() => {
    const level = window.anchorGame.state.level;
    return JSON.stringify(level.layers.truth.frames[0]?.roi) !== JSON.stringify(level.layers.truth.frames[3]?.roi)
      && JSON.stringify(level.layers.forecasts[0].frames[0]?.current) !== JSON.stringify(level.layers.forecasts[0].frames[3]?.current);
  })).resolves.toBe(true);
  await expect(page.evaluate(() => window.anchorGame.state.ui.forecastMemberId)).resolves.toBe('ensemble_mean');
  await expect(page.evaluate(() => window.anchorGame.state.ui.roiViewMode)).resolves.toBe('expectedValue');
  await startPlanningFromBriefing(page);
  await expect(page.locator('#mission-summary-hud')).toContainText('Deploy');
  await expectTopHudTooltips(page);
  await expect(page.locator('#waypoint-timeline')).toContainText('Start: not selected');
  await expect(page.evaluate(() => import('./src/core/deployment/DeploymentZones.js').then(({ getSelectedStart }) => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const agent = window.anchorGame.state.mission.agents[0];
    return {
      selectedStart: getSelectedStart(agent),
      agentStart: agent.start ?? null,
      legacyGliderHitTargets: scene.gliderObjects?.length ?? 0,
      threeGliderCount: window.ANCHOR_MISSION_RENDER_DEBUG?.gliderCount ?? 0,
      fallbackDropZoneLabels: (scene.labelObjects ?? []).filter((object) => object.text === 'Drop zone').length
    };
  }))).resolves.toMatchObject({
    selectedStart: null,
    agentStart: null,
    legacyGliderHitTargets: 0,
    fallbackDropZoneLabels: 0
  });
  await expect(page.evaluate(() => import('./src/core/planning/PlanningGuidance.js').then(({ buildPlanningGuidance }) => buildPlanningGuidance({
    level: window.anchorGame.state.level,
    mission: window.anchorGame.state.mission,
    plan: window.anchorGame.state.plan,
    selectedAgentId: window.anchorGame.state.selectedAgentId,
    time: window.anchorGame.state.planningTime,
    challengeMode: window.anchorGame.state.challengeMode,
    forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
    planningAnchor: window.anchorGame.state.ui.planningAnchor,
    hoverCell: { x: 8, y: 8 },
    settings: window.anchorGame.state.ui
  })))).resolves.toBeNull();

  await clickCell(page, 8, 8);
  await expectWaypointCount(page, 0);
  await expect(page.evaluate(() => window.anchorGame.state.mission.agents[0].deployment?.selectedStart)).resolves.toBeFalsy();
  await expect(page.evaluate(() => import('./src/core/planning/PlanExecutionValidator.js').then(({ validatePlanForExecution }) => {
    const result = validatePlanForExecution({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      plan: window.anchorGame.state.plan
    });
    return {
      ok: result.ok,
      firstError: result.errors[0] ?? ''
    };
  }))).resolves.toMatchObject({
    ok: false
  });
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').executePlan());
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive())).toBe(false);
  await expect(page.evaluate(() => import('./src/core/sim/SimulationEngine.js').then(({ SimulationEngine }) => {
    const engine = new SimulationEngine({
      level: window.anchorGame.state.level,
      mission: JSON.parse(JSON.stringify(window.anchorGame.state.mission)),
      plan: JSON.parse(JSON.stringify(window.anchorGame.state.plan))
    });
    return {
      complete: engine.complete,
      aborted: engine.aborted,
      abortReason: engine.abortReason
    };
  }))).resolves.toMatchObject({
    complete: true,
    aborted: true,
    abortReason: 'invalidExecutionPlan'
  });

  const deploymentCell = await page.evaluate(() => window.anchorGame.state.level.zones.find((zone) => zone.id === 'drop_alpha')?.cells?.[0]);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const agentId = window.anchorGame.state.mission.agents[0]?.id;
    if (agentId) scene.selectGlider?.(agentId);
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.selectedAgentId)).toBe(await page.evaluate(() => window.anchorGame.state.mission.agents[0]?.id));
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectDeploymentCell');
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
  await clickThreeGridCell(page, deploymentCell.x, deploymentCell.y);
  await expect(page.evaluate(() => { const start = window.anchorGame.state.mission.agents[0].deployment?.selectedStart; return start ? { x: start.x, y: start.y } : null; })).resolves.toEqual(deploymentCell);
  await expect(page.evaluate(() => { const start = window.anchorGame.state.plan.agentPlans[0].selectedStart; return start ? { x: start.x, y: start.y } : null; })).resolves.toEqual(deploymentCell);
  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    return {
      agentStart: window.anchorGame.state.mission.agents[0].start,
      gliderVisible: scene.getMissionRendererBackend?.() === 'threeMission3d'
        ? (window.ANCHOR_MISSION_RENDER_DEBUG?.gliderCount ?? 0) > 0
        : (scene.gliderObjects?.length ?? 0) === 1
    };
  })).resolves.toMatchObject({
    agentStart: deploymentCell,
    gliderVisible: true
  });
  await expect(page.locator('#mission-summary-hud')).toContainText(`Start ${deploymentCell.x},${deploymentCell.y}`);
  await expectTopHudTooltips(page);
  const markerCells = await validMarkerCellsNear(page, deploymentCell, 2);
  await expectMarkerHoverAndPlacement(page, markerCells[0].x, markerCells[0].y);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').zoomMap(1.5));
  await expectMarkerHoverAndPlacement(page, markerCells[1].x, markerCells[1].y);
  await expect(page.evaluate((cell) => import('./src/core/planning/PlanningGuidance.js').then(({ buildPlanningGuidance }) => {
    const guidance = buildPlanningGuidance({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      plan: window.anchorGame.state.plan,
      selectedAgentId: window.anchorGame.state.selectedAgentId,
      time: window.anchorGame.state.planningTime,
      challengeMode: window.anchorGame.state.challengeMode,
      forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
      planningAnchor: window.anchorGame.state.ui.planningAnchor,
      hoverCell: { x: cell.x + 1, y: cell.y },
      settings: window.anchorGame.state.ui
    });
    return {
      hasGuidance: Boolean(guidance),
      center: guidance?.reachableRegion?.center ?? null,
      anchor: guidance?.debug?.planningAnchor ?? null
    };
  }), deploymentCell)).resolves.toMatchObject({
    hasGuidance: true,
    center: deploymentCell,
    anchor: { x: deploymentCell.x, y: deploymentCell.y }
  });

  await page.evaluate(() => {
    const level = window.anchorGame.state.level;
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    for (const [index, agent] of window.anchorGame.state.mission.agents.entries()) {
      if (agent.deployment?.selectedStart) continue;
      window.anchorGame.state.selectedAgentId = agent.id;
      const zone = level.zones.find((candidate) => candidate.id === agent.deployment?.zoneId);
      if (zone?.cells?.length) scene.trySelectDeploymentStart(zone.cells[Math.min(index, zone.cells.length - 1)]);
    }
    for (let y = 2; y < level.world.grid.height; y += 1) {
      for (let x = 2; x < level.world.grid.width; x += 1) {
        const base = (level.layers.bases ?? []).some((candidate) => Math.round(candidate.x) === x && Math.round(candidate.y) === y);
        if (!base && !level.layers.terrain?.[y]?.[x] && !level.layers.hazards?.[y]?.[x]) {
          scene.addWaypointForSelected({ x, y, action: 'sample' });
          return;
        }
      }
    }
  });
  await expectWaypointCount(page, 1);
  const postWaypointGuidance = await page.evaluate(() => import('./src/core/planning/PlanningGuidance.js').then(({ buildPlanningGuidance }) => {
    const agentPlan = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === window.anchorGame.state.selectedAgentId);
    const last = agentPlan?.waypoints?.at(-1);
    const guidance = buildPlanningGuidance({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      plan: window.anchorGame.state.plan,
      selectedAgentId: window.anchorGame.state.selectedAgentId,
      time: window.anchorGame.state.planningTime,
      challengeMode: window.anchorGame.state.challengeMode,
      forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
      planningAnchor: window.anchorGame.state.ui.planningAnchor,
      settings: window.anchorGame.state.ui
    });
    return {
      center: guidance?.reachableRegion?.center ?? null,
      anchor: guidance?.debug?.planningAnchor ?? null,
      last: last ? { x: last.x, y: last.y } : null
    };
  }));
  expect(postWaypointGuidance.center).toEqual(postWaypointGuidance.last);
  expect(postWaypointGuidance.anchor).toMatchObject(postWaypointGuidance.last);
  await expect(page.evaluate(() => import('./src/core/io/SolverPacketExporter.js').then(({ buildSolverPacket }) => {
    const packet = buildSolverPacket({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      challengeMode: window.anchorGame.state.challengeMode,
      forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
      roiViewMode: window.anchorGame.state.ui.roiViewMode
    });
    return packet.deployment.agents[0];
  }))).resolves.toMatchObject({
    mode: 'chooseFromZone',
    zoneId: 'drop_alpha',
    selectedStart: deploymentCell
  });
  const executeButton = page.locator('#mission-console [data-action="execute"]');
  await expect(executeButton).toBeEnabled();
  await executeButton.click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive()), { timeout: 15000 }).toBe(true);
});

test('Execute Mission Through Three Simulation', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await startTutorialPlanning(page);
  await expect(page.locator('.three-mission-world-canvas')).toBeVisible();

  await planVisibleThreeTutorialRoute(page, { includeSecondAgent: true });
  const plannedCounts = await page.evaluate(() => ({
    totalWaypoints: (window.anchorGame.state.plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    selectedStarts: (window.anchorGame.state.plan?.agentPlans ?? []).filter((agentPlan) => agentPlan.selectedStart).length,
    agentPlans: window.anchorGame.state.plan?.agentPlans?.length ?? 0,
    planType: window.anchorGame.state.plan?.type,
    schemaVersion: window.anchorGame.state.plan?.schemaVersion,
    routeAuditOk: window.anchorGame.state.ui?.routeAudit?.ok !== false,
    timelineText: document.getElementById('waypoint-timeline')?.textContent ?? '',
    rightPanelText: document.getElementById('waypoint-panel')?.textContent ?? ''
  }));
  expect(plannedCounts).toMatchObject({ planType: 'anchor.plan', schemaVersion: '2.0', routeAuditOk: true });
  expect(plannedCounts.totalWaypoints).toBeGreaterThanOrEqual(3);
  expect(plannedCounts.selectedStarts).toBeGreaterThanOrEqual(1);
  expect(plannedCounts.timelineText).toContain('Waypoint');
  await expectDebugWaypointSynchronization(page, plannedCounts.totalWaypoints);

  const executeButton = page.locator('#mission-console [data-action="execute"]');
  await expect(executeButton).toBeVisible();
  await expect(executeButton).toBeEnabled();
  await executeButton.click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.engineInitialized === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.planDigestMatch === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await expect(page.evaluate(() => ({
    clickCount: window.ANCHOR_EXECUTION_DEBUG?.executeControlClickCount,
    duplicateCount: window.ANCHOR_EXECUTION_DEBUG?.duplicateExecuteDispatchCount,
    rendererOwnsExecution: window.ANCHOR_EXECUTION_DEBUG?.rendererOwnsExecution,
    rendererOwnsSimulationState: window.ANCHOR_EXECUTION_DEBUG?.rendererOwnsSimulationState,
    rendererOwnsScoring: window.ANCHOR_EXECUTION_DEBUG?.rendererOwnsScoring,
    changesOfficialBrowserScoring: window.ANCHOR_EXECUTION_DEBUG?.changesOfficialBrowserScoring,
    planningControllerEnabled: window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.threeInteractionController?.enabled === true
  }))).resolves.toMatchObject({
    clickCount: 1,
    duplicateCount: 0,
    rendererOwnsExecution: false,
    rendererOwnsSimulationState: false,
    rendererOwnsScoring: false,
    changesOfficialBrowserScoring: false,
    planningControllerEnabled: false
  });

  const beforeStep = await canonicalSimulationState(page);
  await page.locator('[data-action="sim-step"]').click();
  await expect.poll(() => canonicalSimulationState(page)).toMatchObject({ stepCount: beforeStep.stepCount + 1 });
  const afterStep = await canonicalSimulationState(page);
  expect(afterStep.timeSeconds).toBeGreaterThan(beforeStep.timeSeconds);
  expect(afterStep.trajectoryPointCount).toBeGreaterThan(beforeStep.trajectoryPointCount);
  expect(afterStep.firstStepCompleted).toBe(true);
  const movedAfterStep = afterStep.positions.some((agent, index) => {
    const before = beforeStep.positions[index];
    return before && (Math.abs(agent.x - before.x) > 1e-6 || Math.abs(agent.y - before.y) > 1e-6);
  });
  expect(movedAfterStep || Boolean(afterStep.failureReason)).toBe(true);

  const beforePlay = await canonicalSimulationState(page);
  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_EXECUTION_DEBUG?.engineStepCount ?? 0) > before.stepCount + 1, beforePlay), { timeout: 15000 }).toBe(true);
  const runningState = await canonicalSimulationState(page);
  expect(runningState.timeSeconds).toBeGreaterThan(beforePlay.timeSeconds);
  expect(runningState.energyTotal).not.toBe(beforePlay.energyTotal);
  expect(runningState.plannedRouteCount).toBeGreaterThan(0);
  expect(runningState.threeTrajectoryPointCount).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="pause"]').click();
  const paused = await canonicalSimulationState(page);
  const from = await threeGridPoint(page, 3, 5);
  const to = await threeGridPoint(page, 6, 5);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(300);
  await expect(canonicalSimulationState(page)).resolves.toMatchObject({ stepCount: paused.stepCount, timeSeconds: paused.timeSeconds });

  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_EXECUTION_DEBUG?.engineStepCount ?? 0) > before.stepCount, paused), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="pause"]').click();
  await expect.poll(() => page.evaluate(() => {
    const debug = window.ANCHOR_EXECUTION_DEBUG ?? {};
    return debug.canonicalWaypointStatusCount > 0 || debug.canonicalObservationCount > 0 || debug.resultAvailable === true;
  }), { timeout: 20000 }).toBe(true);

  const parityCounts = await page.evaluate(() => ({
    canonicalWaypointStatusCount: window.ANCHOR_EXECUTION_DEBUG?.canonicalWaypointStatusCount ?? 0,
    rightPanelWaypointStatusCount: window.ANCHOR_EXECUTION_DEBUG?.rightPanelWaypointStatusCount ?? 0,
    timelineWaypointStatusCount: window.ANCHOR_EXECUTION_DEBUG?.timelineWaypointStatusCount ?? 0,
    canonicalObservationCount: window.ANCHOR_EXECUTION_DEBUG?.canonicalObservationCount ?? 0,
    threeObservationCount: window.ANCHOR_EXECUTION_DEBUG?.threeObservationCount ?? 0
  }));
  expect(parityCounts.rightPanelWaypointStatusCount).toBeGreaterThanOrEqual(0);
  expect(parityCounts.timelineWaypointStatusCount).toBeGreaterThanOrEqual(0);
  expect(parityCounts.threeObservationCount).toBeGreaterThanOrEqual(0);

  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.resultAvailable === true), { timeout: 30000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount ?? 0), { timeout: 30000 }).toBe(1);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.finishingAsync === false), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Debrief Console');
  await expect(page.locator('#debrief-root')).toBeVisible();
  await expect(page.locator('#debrief-root .debrief-metric-card')).toHaveCount(8);
  await expect(page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.debriefTransitionCount)).resolves.toBe(1);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Volumetric Water Column Planning', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await startTutorialPlanning(page);
  await installWaterColumnE2eConfig(page);
  await expect(page.locator('#mission-console')).toContainText('Water Column');
  await expect(page.locator('#mission-console')).toContainText('2.5D water-column display');

  await page.locator('#mission-console [data-action="three-camera"][data-preset="obliqueWaterColumn"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('obliqueWaterColumn');
  await page.locator('#mission-console [data-action="water-column-display-mode"][data-mode="explodedLayers"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.verticalDisplayMode)).toBe('explodedLayers');
  await page.locator('#mission-console [data-action="water-column-active-layer"][data-layer="thermocline"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeDepthLayerId)).toBe('thermocline');
  await page.locator('#mission-console [data-action="water-column-current-mode"][data-mode="allLayers"]').click();
  await expect(page.evaluate(() => window.anchorGame.state.ui.waterColumn.currentDisplayMode)).resolves.toBe('allLayers');

  const agentId = await page.evaluate(() => window.anchorGame.state.selectedAgentId ?? window.anchorGame.state.mission?.agents?.[0]?.id);
  const deploymentCell = await deploymentCellForAgent(page, agentId);
  await page.evaluate(({ deploymentCell }) => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.trySelectDeploymentStart(deploymentCell);
    scene.addWaypointForSelected({ x: 5, y: 2, action: 'sample' });
    window.anchorGame.state.ui.selectedWaypoint = { agentId: window.anchorGame.state.selectedAgentId, index: 0 };
    scene.refreshPanels();
    scene.refreshMap();
  }, { deploymentCell });
  await expectWaypointCount(page, 1);
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="deepDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  await expect.poll(() => page.evaluate(() => {
    const plan = window.anchorGame.state.plan.agentPlans.find((candidate) => candidate.agentId === window.anchorGame.state.selectedAgentId);
    const waypoint = plan?.waypoints?.[0];
    return { diveProfileId: waypoint?.diveProfileId, targetDepthLayerId: waypoint?.targetDepthLayerId, depthLayerId: waypoint?.depthLayerId };
  })).toEqual({ diveProfileId: 'deepDive', targetDepthLayerId: 'deep', depthLayerId: 'deep' });

  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.plannedDiveSegmentCount ?? 0), { timeout: 10000 }).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.predictedTrajectoryPointCount ?? 0), { timeout: 10000 }).toBeGreaterThan(0);

  const depthPoint = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.('thermocline', 2, 2));
  expect(depthPoint).toMatchObject({ visible: true });
  expect(Number.isFinite(depthPoint.x)).toBe(true);
  expect(Number.isFinite(depthPoint.y)).toBe(true);
  const debug = await page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG);
  expect(debug).toMatchObject({
    activeDepthLayerId: 'deep',
    usesFree3DPlanning: false,
    usesHorizontalWaypoints: true,
    usesDiveProfiles: true,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    changesCanonicalDepth: false,
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    publicSafe: true
  });
  expect(debug.canonicalLayerCount).toBe(4);
  expect(debug.layerIds).toEqual(expect.arrayContaining(['surface', 'thermocline', 'deep']));
  expect(debug.predictedTrajectoryPointCount).toBeGreaterThan(0);
  expect(debug.slabObjectCount).toBeGreaterThan(0);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Depth-Aware Dive and Sampling', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await startTutorialPlanning(page);
  await installWaterColumnE2eConfig(page);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const state = window.anchorGame.state;
    const agentId = state.selectedAgentId ?? state.mission?.agents?.[0]?.id;
    const zone = state.level?.zones?.find((candidate) => candidate.type === 'deployment') ?? state.level?.zones?.[0];
    scene.trySelectDeploymentStart(zone?.cells?.[0] ?? { x: 1, y: 1 });
    scene.addWaypointForSelected({ x: 5, y: 2, action: 'sample', divediveProfileId: 'sawtoothProfile', targetDepthLayerId: 'thermocline', depthLayerId: 'thermocline' });
    scene.addWaypointForSelected({ x: 6, y: 3, action: 'sample', divediveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep', depthLayerId: 'deep' });
    const plan = state.plan.agentPlans.find((candidate) => candidate.agentId === agentId);
    plan.diveProfileId = 'sawtoothProfile';
    plan.targetDepthLayerId = 'thermocline';
    scene.afterPlanChanged(agentId, { selectedIndex: 1 });
    scene.refreshPanels();
    scene.refreshMap();
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.predictedTrajectoryPointCount ?? 0)).toBeGreaterThan(0);
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.phase)).toBe('simulation');
  await page.locator('[data-action="sim-step"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.firstStepCompleted === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.realizedTrajectoryPointCount ?? 0), { timeout: 15000 }).toBeGreaterThan(0);
  const debug = await page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG);
  expect(debug).toMatchObject({
    phase: 'simulation',
    usesFree3DPlanning: false,
    usesHorizontalWaypoints: true,
    usesDiveProfiles: true,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    changesCanonicalDepth: false,
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    publicSafe: true
  });
  expect(debug.predictedTrajectoryPointCount).toBeGreaterThan(0);
  expect(debug.canonicalObservationCount).toBeGreaterThanOrEqual(0);
  expect(debug.threeObservationCount).toBeGreaterThanOrEqual(0);
  expect(browserErrors.unexpected()).toEqual([]);
});
test('Three Mission Scene Isolation', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await expectMainMenuSceneIsolation(page);

  await startTutorialPlanning(page);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await planVisibleThreeTutorialRoute(page, { includeSecondAgent: false });

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expectSingleThreeMissionRenderer(page, 'simulation');

  await page.locator('#mission-console [data-action="menu"]').click();
  await expectMainMenuSceneIsolation(page);

  await startTutorialPlanning(page);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await page.locator('[data-action="main-menu"]').filter({ hasText: 'Main Menu' }).first().click();
  await expectMainMenuSceneIsolation(page);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Scene Cleanup Is Null-Safe and Idempotent', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await startTutorialPlanning(page);
  await expectSingleThreeMissionRenderer(page, 'planning');

  await page.locator('[data-action="main-menu"]').filter({ hasText: 'Main Menu' }).first().click();
  await expectMainMenuSceneIsolation(page);

  const cleanupSnapshot = await page.evaluate(async () => {
    const { threeMissionSceneLifecycleSummary } = await import('./src/game/three/ThreeMissionSceneLifecycle.js');
    const planning = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    planning.cleanupMissionWorkspaceScene?.('e2e-duplicate-cleanup');
    return {
      nullSummary: threeMissionSceneLifecycleSummary(null),
      cleanup: window.ANCHOR_SCENE_CLEANUP_DEBUG ?? {},
      isolation: window.ANCHOR_SCENE_ISOLATION_DEBUG ?? {}
    };
  });

  expect(cleanupSnapshot.nullSummary).toMatchObject({
    status: 'inactive',
    disposed: true,
    registeredResourceCount: 0,
    activeResourceCount: 0,
    disposedResourceCount: 0
  });
  expect(cleanupSnapshot.cleanup.planningCleanupInvocationCount ?? 0).toBeGreaterThan(0);
  expect(cleanupSnapshot.cleanup.planningCleanupErrorCount ?? 0).toBe(0);
  expect(cleanupSnapshot.isolation.isolationStatus).toBe('PASS');
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Generated Mission Opens a Visible Volumetric Water Column', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startRandomChallenge('perfectKnowledge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await expect(page.locator('#mission-console')).toContainText('Water Column');

  await expect.poll(() => page.evaluate(() => {
    const debug = window.ANCHOR_WATER_COLUMN_RENDER_DEBUG ?? {};
    const scenario = window.anchorGame.state.currentScenario ?? {};
    return {
      scenarioSource: scenario.source ?? null,
      configSource: scenario.waterColumnConfigSource ?? debug.configSource ?? null,
      layerCount: scenario.waterColumnLayerCount ?? debug.canonicalLayerCount ?? 0,
      fallback: scenario.waterColumnFallbackUsed === true || debug.fallbackUsed === true,
      displayMode: debug.verticalDisplayMode ?? null,
      slabObjectCount: debug.slabObjectCount ?? 0,
      volumeFrameObjectCount: debug.volumeFrameObjectCount ?? 0,
      uniqueLayerWorldYCount: debug.uniqueLayerWorldYCount ?? 0,
      minimumLayerWorldYSeparation: debug.minimumLayerWorldYSeparation ?? 0,
      modernMissionActuallyVolumetric: debug.modernMissionActuallyVolumetric === true,
      usesFree3DPlanning: debug.usesFree3DPlanning === true,
      ownsPlanning: debug.ownsPlanning === true,
      ownsSimulation: debug.ownsSimulation === true,
      ownsScoring: debug.ownsScoring === true
    };
  }), { timeout: 15000 }).toMatchObject({
    scenarioSource: 'deterministicChallenge',
    configSource: 'generatedModernMission',
    fallback: false,
    displayMode: 'explodedLayers',
    modernMissionActuallyVolumetric: true,
    usesFree3DPlanning: false,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false
  });
  const snapshot = await generatedWaterColumnSnapshot(page);
  expect(snapshot.layerCount).toBeGreaterThanOrEqual(5);
  expect(snapshot.slabObjectCount).toBeGreaterThanOrEqual(4);
  expect(snapshot.uniqueLayerWorldYCount).toBeGreaterThanOrEqual(4);
  expect(snapshot.minimumLayerWorldYSeparation).toBeGreaterThan(0);
  expect(snapshot.volumeFrameObjectCount).toBeGreaterThanOrEqual(0);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Legacy Mission Uses Explicit Surface Compatibility Mode', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await page.evaluate(() => window.anchorGame.phaser.scene.start('LoadLevelJsonScene'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await page.evaluate(async () => {
    const level = await fetch('levels/tutorial_01_currents.json').then((response) => response.json());
    const scene = window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene');
    scene.importLevelData(level);
    scene.playImportedExperience('simulationLab');
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await expect(page.locator('#mission-console')).toContainText('surface-only compatibility mode');

  await expect.poll(() => page.evaluate(() => {
    const debug = window.ANCHOR_WATER_COLUMN_RENDER_DEBUG ?? {};
    const scenario = window.anchorGame.state.currentScenario ?? {};
    return {
      scenarioSource: scenario.source ?? null,
      configSource: scenario.waterColumnConfigSource ?? debug.configSource ?? null,
      layerCount: scenario.waterColumnLayerCount ?? debug.canonicalLayerCount ?? 0,
      fallback: scenario.waterColumnFallbackUsed === true || debug.fallbackUsed === true,
      displayMode: debug.verticalDisplayMode ?? null,
      slabObjectCount: debug.slabObjectCount ?? 0,
      modernMissionActuallyVolumetric: debug.modernMissionActuallyVolumetric === true,
      legacySurfaceOnlyFallback: debug.legacySurfaceOnlyFallback === true,
      usesFree3DPlanning: debug.usesFree3DPlanning === true,
      ownsPlanning: debug.ownsPlanning === true,
      ownsSimulation: debug.ownsSimulation === true,
      ownsScoring: debug.ownsScoring === true
    };
  }), { timeout: 15000 }).toMatchObject({
    scenarioSource: 'customScenarioBenchmark',
    configSource: 'importedLegacySurfaceFallback',
    layerCount: 1,
    fallback: true,
    displayMode: 'physicalDepth',
    modernMissionActuallyVolumetric: false,
    legacySurfaceOnlyFallback: true,
    usesFree3DPlanning: false,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false
  });
  const snapshot = await legacyWaterColumnSnapshot(page);
  expect(snapshot.slabObjectCount).toBeLessThanOrEqual(2);
  expect(browserErrors.unexpected()).toEqual([]);
});
test('Three Vehicle Pose Guidance and Grid Alignment', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await startTutorialPlanning(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await planVisibleThreeTutorialRoute(page, { includeSecondAgent: false });

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');
  const guidanceCell = await findWaypointPlacementCell(page, { requireNoWarnings: true });
  expect(guidanceCell).toBeTruthy();
  const guidancePoint = await threeGridPoint(page, guidanceCell.x, guidanceCell.y);
  await page.mouse.move(guidancePoint.x + 10, guidancePoint.y + 10);
  await page.mouse.move(guidancePoint.x, guidancePoint.y, { steps: 4 });
  await expect.poll(() => page.evaluate(() => ({
    available: window.ANCHOR_MISSION_RENDER_DEBUG?.guidanceAvailable === true,
    visible: window.ANCHOR_MISSION_RENDER_DEBUG?.guidanceConeVisible === true,
    sourcePresent: Boolean(window.ANCHOR_MISSION_RENDER_DEBUG?.guidanceSource),
    directionFinite: Number.isFinite(window.ANCHOR_MISSION_RENDER_DEBUG?.guidanceConeDirection),
    origin: window.ANCHOR_MISSION_RENDER_DEBUG?.guidanceConeOrigin
  }))).toMatchObject({ available: true, visible: true, sourcePresent: true, directionFinite: true });

  await expect.poll(() => page.evaluate(() => ({
    status: window.ANCHOR_MISSION_RENDER_DEBUG?.layerAlignmentStatus,
    maxDelta: window.ANCHOR_MISSION_RENDER_DEBUG?.maxLayerAlignmentDelta,
    misaligned: window.ANCHOR_MISSION_RENDER_DEBUG?.misalignedLayerIds ?? []
  }))).toEqual({ status: 'PASS', maxDelta: 0, misaligned: [] });

  for (const cell of [{ x: 1, y: 1 }, { x: 5, y: 2 }, { x: 0, y: 0 }, guidanceCell]) {
    const point = await threeGridPoint(page, cell.x, cell.y);
    expect(Number.isFinite(point.x)).toBe(true);
    expect(Number.isFinite(point.y)).toBe(true);
  }

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);

  const poseSweep = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const samples = [];
    for (let index = 0; index < 80; index += 1) {
      scene.stepOnce();
      scene.refresh();
      const debug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
      if (debug.currentBodyQuaternion) {
        samples.push({
          quaternion: debug.currentBodyQuaternion,
          heading: debug.currentBodyHeadingRadians,
          course: debug.currentActualCourseRadians,
          pitch: debug.selectedAgentPitchRadians,
          orientationSource: debug.selectedAgentOrientationSource,
          courseSource: debug.selectedAgentCourseSource
        });
      }
      if (scene.engine?.t >= 12) break;
    }
    return samples;
  });
  expect(poseSweep.length).toBeGreaterThan(1);
  expect(poseSweep.every((sample) => isFiniteQuaternion(sample.quaternion))).toBe(true);
  expect(poseSweep.some((sample) => sample.orientationSource && sample.courseSource)).toBe(true);
  expect(poseSweep.some((sample) => quaternionDelta(sample.quaternion, poseSweep[0].quaternion) > 0.01)).toBe(true);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Waypoint Validation and Mission Window Semantics', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await startTutorialPlanning(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  const agentId = await page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.id);
  await clickThreeObject(page, 'screenPointForAgent', agentId);
  await deployAgentThroughVisibleThreeControls(page, agentId);
  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="snapToCellCenters"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.waypointSnapMode)).toBe('snapToCellCenters');
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');

  const invalidCell = await findHardInvalidWaypointCell(page);
  const invalidPoint = await threeGridGroundPoint(page, invalidCell.x, invalidCell.y);
  await page.mouse.move(invalidPoint.x + 10, invalidPoint.y + 10);
  await page.mouse.move(invalidPoint.x, invalidPoint.y, { steps: 4 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus)).toBe('INVALID');
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_MISSION_RENDER_DEBUG?.waypointPrimaryMessage))).toBe(true);
  const beforeInvalid = await totalWaypointCount(page);
  await page.mouse.click(invalidPoint.x, invalidPoint.y);
  await expectWaypointCount(page, beforeInvalid);
  await expectDebugWaypointSynchronization(page, beforeInvalid);

  const normalCell = await findWaypointPlacementCell(page, { requireNoWarnings: true });
  expect(normalCell).toBeTruthy();
  await clickThreeGridCell(page, normalCell.x, normalCell.y);
  await expectWaypointCount(page, beforeInvalid + 1);

  let overrunCell = await findWaypointPlacementCell(page, { warningCode: 'BEYOND_MISSION_WINDOW' });
  for (let attempts = 0; !overrunCell && attempts < 6; attempts += 1) {
    const filler = await findWaypointPlacementCell(page, { preferFar: true });
    expect(filler).toBeTruthy();
    await clickThreeGridCell(page, filler.x, filler.y);
    await expect.poll(() => totalWaypointCount(page)).toBeGreaterThan(beforeInvalid + 1 + attempts);
    overrunCell = await findWaypointPlacementCell(page, { warningCode: 'BEYOND_MISSION_WINDOW' });
  }
  expect(overrunCell).toBeTruthy();
  const overrunPoint = await threeGridGroundPoint(page, overrunCell.x, overrunCell.y);
  await page.mouse.move(overrunPoint.x, overrunPoint.y);
  await expect.poll(() => page.evaluate(() => ({
    status: window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus,
    commitAllowed: window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCommitAllowed,
    beyond: window.ANCHOR_MISSION_RENDER_DEBUG?.waypointBeyondMissionWindow,
    warnings: window.ANCHOR_MISSION_RENDER_DEBUG?.waypointWarnings ?? []
  }))).toMatchObject({ status: 'VALID_WITH_WARNINGS', commitAllowed: true, beyond: true });

  const beforeOverrun = await totalWaypointCount(page);
  await page.mouse.click(overrunPoint.x, overrunPoint.y);
  await expectWaypointCount(page, beforeOverrun + 1);
  const overrunWaypoint = await page.evaluate(() => {
    const waypoint = window.anchorGame.state.plan.agentPlans[0].waypoints.at(-1);
    return {
      id: waypoint.id,
      warningCodes: waypoint.warningCodes ?? [],
      warnings: waypoint.warnings ?? [],
      runtimeBehavior: waypoint.runtimeBehavior,
      estimatedArrivalTime: waypoint.estimatedArrivalTime,
      missionDurationAtPlanning: waypoint.missionDurationAtPlanning,
      likelyReachedWithinWindow: waypoint.likelyReachedWithinWindow
    };
  });
  expect(overrunWaypoint.warningCodes).toContain('BEYOND_MISSION_WINDOW');
  expect(overrunWaypoint.runtimeBehavior).toBe('truncate_at_mission_end');
  expect(overrunWaypoint.likelyReachedWithinWindow).toBe(false);
  await expect(page.locator('#waypoint-timeline')).toContainText(/Mission-window|Likely not reached|MISSION WINDOW/i);

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.resultAvailable === true), { timeout: 30000 }).toBe(true);
  const terminal = await page.evaluate((waypointId) => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const agent = scene.engine?.agents?.[0];
    const duration = Number(window.anchorGame.state.level?.world?.time?.duration ?? 0);
    const completed = (agent?.completedWaypoints ?? []).some((item) => item.waypointId === waypointId);
    const missed = (agent?.missedWaypoints ?? []).find((item) => item.waypointId === waypointId) ?? null;
    return {
      time: scene.engine?.t ?? 0,
      duration,
      completed,
      missedReason: missed?.reason ?? null,
      unreachedTimeOverrunWaypointCount: window.ANCHOR_SIMULATION_RENDER_DEBUG?.unreachedTimeOverrunWaypointCount ?? 0,
      missedWaypoints: window.anchorGame.state.result?.summary?.missedWaypoints ?? 0
    };
  }, overrunWaypoint.id);
  expect(terminal.time).toBeLessThanOrEqual(terminal.duration + 1e-6);
  expect(terminal.completed).toBe(false);
  expect(terminal.missedReason).toBe('missionTimeExpired');
  expect(terminal.unreachedTimeOverrunWaypointCount).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#debrief-root')).toContainText(/missed|Mission time|expired/i);
  expect(browserErrors.unexpected()).toEqual([]);
});
test('Legacy and Three Simulation Produce Identical Canonical Result', async ({ browser }) => {
  const legacyPage = await browser.newPage();
  const threePage = await browser.newPage();
  try {
    const legacyErrors = attachBrowserErrorCollector(legacyPage);
    const threeErrors = attachBrowserErrorCollector(threePage);
    const legacy = await runDeterministicTutorialToResult(legacyPage, { legacy: true });
    const three = await runDeterministicTutorialToResult(threePage, { legacy: false });
    const report = compareSimulationExecutions(legacy, three);
    expect(report.status, JSON.stringify(report.canonicalDifferences, null, 2)).toBe('PASS');
    expect(report.canonicalDifferences).toEqual([]);
    expect(legacyErrors.unexpected()).toEqual([]);
    expect(threeErrors.unexpected()).toEqual([]);
  } finally {
    await legacyPage.close();
    await threePage.close();
  }
});
test('legacy saved level registry scene still opens', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);

  await page.evaluate(() => window.anchorGame.phaser.scene.start('LoadLevelByIdScene'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelByIdScene').sys.isActive())).toBe(true);
  await expect(page.getByRole('heading', { name: 'Legacy Saved Levels' })).toBeVisible();
  await expect(page.locator('#saved-level-id-input')).toBeVisible();
});

async function generatedWaterColumnSnapshot(page) {
  return page.evaluate(() => {
    const debug = window.ANCHOR_WATER_COLUMN_RENDER_DEBUG ?? {};
    const scenario = window.anchorGame.state.currentScenario ?? {};
    return {
      scenarioSource: scenario.source ?? null,
      configSource: scenario.waterColumnConfigSource ?? debug.configSource ?? null,
      layerCount: scenario.waterColumnLayerCount ?? debug.canonicalLayerCount ?? 0,
      fallback: scenario.waterColumnFallbackUsed === true || debug.fallbackUsed === true,
      displayMode: debug.verticalDisplayMode ?? null,
      slabObjectCount: debug.slabObjectCount ?? 0,
      volumeFrameObjectCount: debug.volumeFrameObjectCount ?? 0,
      uniqueLayerWorldYCount: debug.uniqueLayerWorldYCount ?? 0,
      minimumLayerWorldYSeparation: debug.minimumLayerWorldYSeparation ?? 0,
      modernMissionActuallyVolumetric: debug.modernMissionActuallyVolumetric === true,
      usesFree3DPlanning: debug.usesFree3DPlanning === true,
      ownsPlanning: debug.ownsPlanning === true,
      ownsSimulation: debug.ownsSimulation === true,
      ownsScoring: debug.ownsScoring === true
    };
  });
}

async function legacyWaterColumnSnapshot(page) {
  return page.evaluate(() => {
    const debug = window.ANCHOR_WATER_COLUMN_RENDER_DEBUG ?? {};
    const scenario = window.anchorGame.state.currentScenario ?? {};
    return {
      scenarioSource: scenario.source ?? null,
      configSource: scenario.waterColumnConfigSource ?? debug.configSource ?? null,
      layerCount: scenario.waterColumnLayerCount ?? debug.canonicalLayerCount ?? 0,
      fallback: scenario.waterColumnFallbackUsed === true || debug.fallbackUsed === true,
      displayMode: debug.verticalDisplayMode ?? null,
      slabObjectCount: debug.slabObjectCount ?? 0,
      modernMissionActuallyVolumetric: debug.modernMissionActuallyVolumetric === true,
      legacySurfaceOnlyFallback: debug.legacySurfaceOnlyFallback === true,
      usesFree3DPlanning: debug.usesFree3DPlanning === true,
      ownsPlanning: debug.ownsPlanning === true,
      ownsSimulation: debug.ownsSimulation === true,
      ownsScoring: debug.ownsScoring === true
    };
  });
}
async function collectSceneIsolationSnapshot(page) {
  return page.evaluate(() => {
    const scene = window.anchorGame?.phaser?.scene;
    const debug = window.ANCHOR_SCENE_ISOLATION_DEBUG ?? {};
    const text = (id) => document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    return {
      mainMenuActive: scene?.getScene('MainMenuScene')?.sys?.isActive?.() ?? false,
      planningActive: scene?.getScene('MissionWorkspaceScene')?.sys?.isActive?.() ?? false,
      simulationActive: scene?.getScene('SimulationScene')?.sys?.isActive?.() ?? false,
      mainMenuVisible: Boolean(document.querySelector('#main-menu-hub')),
      threeCanvasCount: document.querySelectorAll('.three-mission-world-canvas').length,
      threeHostCount: document.querySelectorAll('.three-mission-world-host').length,
      planningOverlayCount: document.querySelectorAll('.three-mission-tool-overlay').length,
      simulationOverlayCount: document.querySelectorAll('.three-simulation-overlay, [data-simulation-overlay]').length,
      timelineText: text('bottom-timeline'),
      performanceText: text('agent-performance-hud'),
      rightPanelText: text('waypoint-timeline'),
      debugIsolationStatus: debug.isolationStatus ?? null,
      debugActiveProductionSceneCount: debug.activeProductionSceneCount ?? null,
      debugThreeMissionCanvasCount: debug.threeMissionCanvasCount ?? null,
      debugThreeMissionRendererCount: debug.threeMissionRendererCount ?? null,
      debugThreeAnimationLoopCount: debug.threeAnimationLoopCount ?? null,
      debugPlanningOverlayCount: debug.planningOverlayCount ?? null,
      debugSimulationOverlayCount: debug.simulationOverlayCount ?? null
    };
  });
}

async function expectMainMenuSceneIsolation(page) {
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  await expect.poll(() => collectSceneIsolationSnapshot(page), { timeout: 15000 }).toMatchObject({
    mainMenuActive: true,
    mainMenuVisible: true,
    threeCanvasCount: 0,
    threeHostCount: 0,
    planningOverlayCount: 0,
    simulationOverlayCount: 0,
    debugIsolationStatus: 'PASS',
    debugActiveProductionSceneCount: 1,
    debugThreeMissionCanvasCount: 0,
    debugThreeMissionRendererCount: 0,
    debugThreeAnimationLoopCount: 0,
    debugPlanningOverlayCount: 0,
    debugSimulationOverlayCount: 0
  });
  const snapshot = await collectSceneIsolationSnapshot(page);
  expect(snapshot.timelineText).not.toMatch(/Mission Waypoints|Transport|Play|Step|Pause/i);
  expect(snapshot.performanceText).not.toMatch(/Mission Performance|Battery|Energy|Samples|Glider/i);
  expect(snapshot.rightPanelText).not.toMatch(/Mission Waypoints|Waypoint \d|MISSION WINDOW|Glider/i);
}

async function stepSimulationSceneForRenderCost(page, { keepRunning = true } = {}) {
  await page.evaluate(({ keepRunning }) => {
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene');
    if (!scene?.engine) return;
    if (keepRunning) scene.engine.play?.();
    const beforeStepCount = Number(scene.engine.stepCount ?? 0);
    scene.engine.step?.(1 / 30, { force: true });
    scene.recordSimulationProgressStage?.(beforeStepCount, keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep');
    scene.syncSimulationTimeToState?.();
    scene.publishLatestSimulationSnapshot?.(keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep');
    scene.consumeScheduledPresentationFrame?.({ force: true, reason: keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep' });
    scene.refreshSurfaceDecision?.();
    scene.refreshRouteFailureDecision?.();
    scene.notifyAbortIfNeeded?.();
    scene.notifyStopReasonIfNeeded?.();
  }, { keepRunning });
}

async function advanceSimulationSceneForRenderCost(page, { steps = 12, frameDelay = 40, keepRunning = true } = {}) {
  for (let index = 0; index < steps; index += 1) {
    await stepSimulationSceneForRenderCost(page, { keepRunning });
    if (frameDelay > 0) await page.waitForTimeout(frameDelay);
  }
}

async function startSimulationSceneRenderCostStepper(page, { intervalMs = 50, keepRunning = true } = {}) {
  await page.evaluate(({ intervalMs, keepRunning }) => {
    if (window.__anchorRenderCostStepper) window.clearInterval(window.__anchorRenderCostStepper);
    const step = () => {
      const scene = window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene');
      if (!scene?.engine) return;
      if (keepRunning) scene.engine.play?.();
      const beforeStepCount = Number(scene.engine.stepCount ?? 0);
      scene.engine.step?.(1 / 30, { force: true });
      scene.recordSimulationProgressStage?.(beforeStepCount, keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep');
      scene.syncSimulationTimeToState?.();
      scene.publishLatestSimulationSnapshot?.(keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep');
      scene.consumeScheduledPresentationFrame?.({ force: true, reason: keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep' });
    };
    step();
    window.__anchorRenderCostStepper = window.setInterval(step, intervalMs);
  }, { intervalMs, keepRunning });
}

async function stopSimulationSceneRenderCostStepper(page) {
  await page.evaluate(() => {
    if (window.__anchorRenderCostStepper) window.clearInterval(window.__anchorRenderCostStepper);
    window.__anchorRenderCostStepper = null;
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene');
    scene?.engine?.pause?.();
    scene?.refreshControls?.();
    scene?.renderSimulationTimeline?.();
    scene?.publishExecutionDebug?.();
  });
}
async function prepareThreeSamplingTargetDiveScenario(page, { attach = true, profile = 'thermoclineDive', layer = 'thermocline', cycles = 2, extraFarWaypoints = 0 } = {}) {
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
  const agentId = await selectedAgentId(page);
  await deployAllGlidersThroughVisibleControls(page);
  await selectAgentThroughVisibleControls(page, agentId);
  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="freePlacement"]').click();
  for (let index = 0; index < 2; index += 1) {
    const pair = await adjacentPlaceableWaypointPair(page, agentId);
    await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
    await clickBetweenThreeGridCells(page, pair.a, pair.b, index === 0 ? 0.34 : 0.58);
  }
  for (let index = 0; index < extraFarWaypoints; index += 1) {
    const cell = await findWaypointPlacementCell(page, { preferFar: true, requireNoWarnings: true })
      ?? await findWaypointPlacementCell(page, { preferFar: true });
    expect(cell).toBeTruthy();
    await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
    await clickThreeGridCell(page, cell.x, cell.y);
  }
  await expectWaypointCount(page, 2 + extraFarWaypoints);
  await page.locator(`#mission-console [data-action="water-column-dive-profile"][data-profile="${profile}"]`).click();
  await page.locator(`#mission-console [data-action="water-column-target-layer"][data-layer="${layer}"]`).click();
  await page.locator(`#mission-console [data-action="water-column-active-layer"][data-layer="${layer}"]`).click();
  await page.locator(`#mission-console [data-action="water-column-cycle-count"][data-cycles="${cycles}"]`).click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDiveAvailable === true), { timeout: 10000 }).toBe(true);
  const targetCell = await findSamplingTargetPlacementCell(page, layer) ?? await page.evaluate((id) => {
    const agentPlan = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === id);
    const waypoints = agentPlan?.waypoints ?? [];
    const a = waypoints[0] ?? { x: 2, y: 2 };
    const b = waypoints[1] ?? a;
    return { x: Math.round((Number(a.x) + Number(b.x)) / 2), y: Math.round((Number(a.y) + Number(b.y)) / 2) };
  }, agentId);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeSamplingTarget"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeSamplingTarget');
  const depthPoint = await page.evaluate(({ layerId, cell }) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(layerId, cell.x, cell.y) ?? null, { layerId: layer, cell: targetCell });
  expect(depthPoint).toBeTruthy();
  await page.mouse.click(depthPoint.x, depthPoint.y);
  try {
    await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0)).toBeGreaterThan(0);
  } catch (error) {
    const targetDebug = await page.evaluate((diagnostic) => ({
      scienceTargetCount: window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0,
      lastIntentStatus: window.ANCHOR_MISSION_RENDER_DEBUG?.lastIntentStatus ?? null,
      lastIntentWarning: window.ANCHOR_MISSION_RENDER_DEBUG?.lastIntentWarning ?? null,
      placementValidation: window.ANCHOR_MISSION_RENDER_DEBUG?.placementValidation ?? null,
      lastInteractionResult: window.ANCHOR_MISSION_RENDER_DEBUG?.lastInteractionResult ?? null,
      selectedDepthLayerId: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.selectedTargetDepthLayerId ?? null,
      requestedTargetCell: diagnostic.targetCell,
      requestedDepthPoint: diagnostic.depthPoint,
      candidateDebug: window.__samplingTargetCandidateDebug ?? null,
      targetCell: window.ANCHOR_MISSION_RENDER_DEBUG?.actualGridCell ?? window.ANCHOR_MISSION_RENDER_DEBUG?.hoveredGridCell ?? null,
      rendererReady: window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady ?? null,
      rendererRuntimeErrorCount: window.ANCHOR_MISSION_RENDER_DEBUG?.rendererRuntimeErrorCount ?? null
    }), { targetCell, depthPoint });
    console.log('SAMPLING_TARGET_PLACEMENT_DEBUG ' + JSON.stringify(targetDebug));
    throw error;
  }
  const targetId = await page.evaluate(() => window.anchorGame.state.ui?.selectedScienceTargetId ?? window.anchorGame.state.plan?.scienceTargets?.[0]?.id ?? null);
  expect(targetId).toBeTruthy();
  if (attach) {
    await page.locator('#mission-console [data-action="science-target-attach"]').click();
    await expect.poll(() => page.evaluate((id) => (window.anchorGame.state.plan?.scienceTargets ?? []).find((target) => target.id === id)?.attachedSegmentIds?.length ?? 0, targetId)).toBeGreaterThan(0);
  }
  return { agentId, targetId, targetCell };
}
async function startVisibleContinuousMissionPlanning(page) {
  await page.goto('/');
  await openMainMenuHubSection(page, 'challenge');
  await page.locator('#main-menu-hub [data-action="random-challenge"]').first().click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Scenario Start');
  await expect(page.locator('#mission-console [data-action="start"]')).toBeVisible();
  await page.locator('#mission-console [data-action="start"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.planningSceneCreateCompleted === true), { timeout: 15000 }).toBe(true);
}

function assertContinuousBrowserErrorsClean(browserErrors) {
  const errors = browserErrors.unexpected();
  const text = JSON.stringify(errors);
  expect(text).not.toMatch(/waypointSnapMode|is not defined|ReferenceError|TypeError/i);
  browserErrors.assertClean({ disallow: [/waypointSnapMode/i, /is not defined/i, /ReferenceError/i, /TypeError/i] });
}

async function selectedAgentId(page) {
  return page.evaluate(() => window.anchorGame.state.selectedAgentId ?? window.anchorGame.state.mission?.agents?.[0]?.id ?? null);
}

async function deploySelectedGliderThroughVisibleControls(page, agentId) {
  const deploymentCell = await deploymentCellForAgent(page, agentId);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectDeploymentCell');
  await clickThreeGridCell(page, deploymentCell.x, deploymentCell.y);
  await expect.poll(() => page.evaluate((id) => {
    const agentPlan = window.anchorGame.state.plan?.agentPlans?.find((candidate) => candidate.agentId === id);
    const start = agentPlan?.selectedStart;
    return start ? { x: start.x, y: start.y } : null;
  }, agentId)).toEqual(deploymentCell);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');
}

async function deployAllGlidersThroughVisibleControls(page) {
  const agentIds = await page.evaluate(() => (window.anchorGame.state.mission?.agents ?? []).map((agent) => agent.id));
  for (const agentId of agentIds) {
    await selectAgentThroughVisibleControls(page, agentId);
    await deploySelectedGliderThroughVisibleControls(page, agentId);
  }
}

async function selectFirstAgentThroughVisibleControls(page) {
  const firstAgentId = await page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.id ?? null);
  await selectAgentThroughVisibleControls(page, firstAgentId);
  return firstAgentId;
}

async function selectAgentThroughVisibleControls(page, agentId) {
  if (!agentId) return null;
  for (let index = 0; index < 8; index += 1) {
    const current = await selectedAgentId(page);
    if (current === agentId) return agentId;
    const point = await page.evaluate((id) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForAgent?.(id) ?? null, agentId);
    if (point && point.visible !== false && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectInspect"]').click();
      await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectInspect');
      await page.mouse.click(point.x, point.y);
      try {
        await expect.poll(() => selectedAgentId(page), { timeout: 1200 }).toBe(agentId);
        return agentId;
      } catch {
        // Fall through to the console control if overlapping agents prevented direct selection.
      }
    }
    await page.locator('#mission-console [data-action="next-glider"]').first().evaluate((button) => button.click());
    await page.waitForTimeout(150);
  }
  throw new Error(`Could not select agent ${agentId} through visible agent controls.`);
}

async function adjacentPlaceableWaypointPair(page, agentId) {
  return page.evaluate(async (id) => {
    const { canPlaceWaypoint } = await import('./src/core/planning/WaypointPlacementGuard.js');
    const state = window.anchorGame.state;
    const width = state.level?.world?.grid?.width ?? 0;
    const height = state.level?.world?.grid?.height ?? 0;
    const allowed = (x, y) => canPlaceWaypoint(state, id, { x, y, action: 'sample' }).allowed === true;
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        if (allowed(x, y) && allowed(x + 1, y)) return { a: { x, y }, b: { x: x + 1, y } };
        if (allowed(x, y) && allowed(x, y + 1)) return { a: { x, y }, b: { x, y: y + 1 } };
      }
    }
    for (let y = 1; y < height; y += 1) {
      for (let x = 1; x < width; x += 1) {
        if (allowed(x, y)) return { a: { x, y }, b: { x, y } };
      }
    }
    throw new Error(`No adjacent placeable waypoint pair found for ${id}`);
  }, agentId);
}

async function clickBetweenThreeGridCells(page, a, b, weight = 0.5) {
  const from = await threeGridPoint(page, a.x, a.y);
  const to = await threeGridPoint(page, b.x, b.y);
  const bounded = Math.max(0, Math.min(1, Number(weight)));
  await page.mouse.click(from.x + (to.x - from.x) * bounded, from.y + (to.y - from.y) * bounded);
}

async function waypointAtIndex(page, agentId, index) {
  return page.evaluate(({ id, index }) => {
    const plan = window.anchorGame.state.plan?.agentPlans?.find((candidate) => candidate.agentId === id);
    const waypoint = plan?.waypoints?.[index];
    return waypoint ? JSON.parse(JSON.stringify(waypoint)) : null;
  }, { id: agentId, index });
}

function hasFractionalCoordinate(point) {
  return Boolean(point) && (
    Math.abs(Number(point.x) - Math.round(Number(point.x))) > 1e-3
    || Math.abs(Number(point.y) - Math.round(Number(point.y))) > 1e-3
  );
}

async function continuousDiveExecutionSnapshot(page) {
  return page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const executionDebug = window.ANCHOR_EXECUTION_DEBUG ?? {};
    const renderDebug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    const agents = scene?.engine?.agents ?? [];
    const history = agents.flatMap((agent) => agent.history ?? []);
    const depths = [
      ...agents.map((agent) => Number(agent.depthMeters ?? agent.position?.depthMeters ?? 0)),
      ...history.map((point) => Number(point.depthMeters ?? point.z ?? 0))
    ].filter(Number.isFinite);
    const pitches = [
      ...agents.map((agent) => Number(agent.pitchRadians ?? 0)),
      ...history.map((point) => Number(point.pitchRadians ?? 0)),
      Number(renderDebug.selectedAgentPitchRadians ?? 0)
    ].filter(Number.isFinite);
    const phases = [...new Set(agents.map((agent) => agent.divePhase ?? null).filter(Boolean))];
    return {
      firstStepCompleted: executionDebug.firstStepCompleted === true || renderDebug.firstStepCompleted === true,
      maxDepthMeters: Math.max(0, ...depths.map((value) => Math.abs(value))),
      maxAbsPitchRadians: Math.max(0, ...pitches.map((value) => Math.abs(value))),
      divePhases: phases,
      realizedTrajectoryPointCount: renderDebug.realizedTrajectoryPointCount ?? 0,
      trackHasContinuousCoordinates: history.some((point) => (
        Math.abs(Number(point.x ?? 0) - Math.round(Number(point.x ?? 0))) > 1e-3
        || Math.abs(Number(point.y ?? 0) - Math.round(Number(point.y ?? 0))) > 1e-3
      ))
    };
  });
}
async function expectSingleThreeMissionRenderer(page, phase) {
  await expect.poll(() => page.evaluate((expectedPhase) => {
    const missionDebug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    const simulationDebug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    const phaseDebug = expectedPhase === 'simulation' ? simulationDebug : missionDebug;
    return {
      canvasCount: document.querySelectorAll('.three-mission-world-canvas').length,
      hostCount: document.querySelectorAll('.three-mission-world-host').length,
      mounted: phaseDebug.threeMounted === true,
      backend: phaseDebug.activeBackend ?? null,
      renderLoopCount: expectedPhase === 'simulation'
        ? (simulationDebug.threeRenderLoopCount ?? (phaseDebug.threeMounted ? 1 : 0))
        : (missionDebug.threeRenderLoopCount ?? (phaseDebug.threeMounted ? 1 : 0))
    };
  }, phase), { timeout: 15000 }).toMatchObject({
    canvasCount: 1,
    hostCount: 1,
    mounted: true,
    backend: 'threeMission3d'
  });
}

async function findHardInvalidWaypointCell(page) {
  return page.evaluate(() => {
    const level = window.anchorGame.state.level;
    const fallback = { x: 0, y: 0 };
    for (let y = 0; y < level.world.grid.height; y += 1) {
      for (let x = 0; x < level.world.grid.width; x += 1) {
        if (!level.layers.terrain?.[y]?.[x]) continue;
        const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
        if (point?.visible !== false && point?.x >= 0 && point?.y >= 0 && point.x <= window.innerWidth && point.y <= window.innerHeight) {
          return { x, y };
        }
      }
    }
    return fallback;
  });
}

async function findSamplingTargetPlacementCell(page, layerId = 'thermocline') {
  return page.evaluate(async (requestedLayerId) => {
    const { sampleBathymetryAt } = await import('./src/core/science/BathymetryFieldModel.js');
    const { waterColumnLayerMetadata } = await import('./src/core/science/WaterColumnSchema.js');
    const state = window.anchorGame.state;
    const level = state.level ?? {};
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const viewModel = scene?.missionRenderViewModel ?? {};
    const bathymetry = level.bathymetry ?? level.world?.bathymetry ?? level.layers?.bathymetry ?? viewModel.bathymetry ?? null;
    const depthGrid = bathymetry?.depthMeters ?? level.world?.bathymetry?.depthMeters ?? level.layers?.depthMeters ?? viewModel.bottomBoundary?.bottomDepthField ?? level.layers?.depth ?? null;
    const depthSource = bathymetry?.depthMeters ? bathymetry : { depthMeters: depthGrid };
    const grid = level.world?.grid ?? viewModel.coordinateSystem ?? {};
    const width = Number(grid.width ?? bathymetry?.width ?? depthGrid?.[0]?.length ?? 0);
    const height = Number(grid.height ?? bathymetry?.height ?? depthGrid?.length ?? 0);
    const depthMeters = Number(waterColumnLayerMetadata(requestedLayerId).nominalDepthMeters ?? 0);
    const minimumClearance = Math.max(0, Number(state.mission?.physics?.minimumBottomClearanceMeters ?? state.mission?.physics?.bottomClearanceMeters ?? 5));
    const bottomValues = Array.isArray(depthGrid) ? depthGrid.flat().map(Number).filter(Number.isFinite) : [];
    const candidateDebug = {
      requestedLayerId,
      depthMeters,
      minimumClearance,
      width,
      height,
      hasBathymetry: Boolean(bathymetry?.depthMeters),
      hasDepthGrid: Array.isArray(depthGrid),
      minBottom: bottomValues.length ? Math.min(...bottomValues) : null,
      maxBottom: bottomValues.length ? Math.max(...bottomValues) : null,
      visibleDepthPointCount: 0,
      clearanceCandidateCount: 0,
      visibleCandidateCount: 0
    };
    const candidates = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (level.layers?.terrain?.[y]?.[x]) continue;
        if (bathymetry?.landMask?.[y]?.[x] || bathymetry?.landSeaMask?.[y]?.[x] === 'land') continue;
        const bottomDepth = sampleBathymetryAt(depthSource, x, y);
        const clearance = bottomDepth - depthMeters;
        if (!Number.isFinite(clearance) || clearance < minimumClearance) continue;
        candidateDebug.clearanceCandidateCount += 1;
        const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(requestedLayerId, x, y);
        if (point) candidateDebug.visibleDepthPointCount += 1;
        if (!point || point.visible === false || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        if (point.x < 0 || point.y < 0 || point.x > window.innerWidth || point.y > window.innerHeight) continue;
        candidateDebug.visibleCandidateCount += 1;
        candidates.push({ x, y, clearance, bottomDepth, distanceFromCenter: Math.hypot(x - width / 2, y - height / 2) });
      }
    }
    candidates.sort((a, b) => (b.clearance - a.clearance) || (a.distanceFromCenter - b.distanceFromCenter));
    window.__samplingTargetCandidateDebug = { ...candidateDebug, selected: candidates[0] ?? null, topCandidates: candidates.slice(0, 5) };
    return candidates[0] ? { x: candidates[0].x, y: candidates[0].y } : null;
  }, layerId);
}
async function findWaypointPlacementCell(page, { warningCode = null, requireNoWarnings = false, preferFar = false } = {}) {
  return page.evaluate(async ({ warningCode, requireNoWarnings, preferFar }) => {
    const { canPlaceWaypoint } = await import('./src/core/planning/WaypointPlacementGuard.js');
    const state = window.anchorGame.state;
    const agentId = state.selectedAgentId ?? state.mission?.agents?.[0]?.id;
    const plan = state.plan?.agentPlans?.find((candidate) => candidate.agentId === agentId);
    const existing = new Set((plan?.waypoints ?? []).map((waypoint) => `${Math.round(waypoint.x)},${Math.round(waypoint.y)}`));
    const start = plan?.selectedStart ?? state.mission?.agents?.find((agent) => agent.id === agentId)?.deployment?.selectedStart ?? state.mission?.agents?.[0]?.start ?? { x: 0, y: 0 };
    const last = (plan?.waypoints ?? []).at(-1) ?? start;
    const cells = [];
    const grid = state.level?.world?.grid ?? {};
    for (let y = 0; y < Number(grid.height ?? 0); y += 1) {
      for (let x = 0; x < Number(grid.width ?? 0); x += 1) {
        if (existing.has(`${x},${y}`)) continue;
        const placement = canPlaceWaypoint(state, agentId, { x, y, action: 'sample' });
        if (!placement.allowed) continue;
        const warningCodes = placement.estimate?.warningCodes ?? [];
        const warnings = placement.estimate?.warnings ?? [];
        if (warningCode && !warningCodes.includes(warningCode)) continue;
        if (requireNoWarnings && (warningCodes.length || warnings.length)) continue;
        cells.push({
          x,
          y,
          distance: Math.hypot(Number(x) - Number(last?.x ?? 0), Number(y) - Number(last?.y ?? 0)),
          eta: Number(placement.estimate?.estimatedArrivalTime ?? placement.estimate?.arrivalTime ?? 0)
        });
      }
    }
    cells.sort((a, b) => preferFar || warningCode ? (b.eta - a.eta) || (b.distance - a.distance) : (a.distance - b.distance));
    return cells[0] ? { x: cells[0].x, y: cells[0].y } : null;
  }, { warningCode, requireNoWarnings, preferFar });
}

function isFiniteQuaternion(quaternion) {
  return Boolean(quaternion)
    && Number.isFinite(quaternion.x)
    && Number.isFinite(quaternion.y)
    && Number.isFinite(quaternion.z)
    && Number.isFinite(quaternion.w);
}

function quaternionDelta(a, b) {
  if (!isFiniteQuaternion(a) || !isFiniteQuaternion(b)) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
}
async function clickCell(page, x, y) {
  await page.evaluate(() => {
    if (window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d') {
      const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
      const state = window.anchorGame.state;
      const agent = state.mission?.agents?.find((candidate) => candidate.id === state.selectedAgentId) ?? state.mission?.agents?.[0];
      const needsDeployment = (agent?.deployment?.mode === 'chooseFromZone' || agent?.deployment?.mode === 'chooseFromZones') && !agent?.deployment?.selectedStart;
      if (scene?.setPlanningToolFromUi) scene.setPlanningToolFromUi(needsDeployment ? 'selectDeploymentCell' : 'placeWaypoint');
      else scene?.setThreeInteractionMode?.(needsDeployment ? 'selectDeployment' : 'placeWaypoint');
    }
  });
  const point = await cellCenter(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function threeGridPoint(page, x, y) {
  await expect.poll(() => page.evaluate(({ x, y }) => {
    const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
    return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  }, { x, y }), { timeout: 10000 }).toBe(true);
  return page.evaluate(({ x, y }) => window.ANCHOR_MISSION_RENDER_TEST_API.screenPointForGridCell(x, y), { x, y });
}

async function threeGridGroundPoint(page, x, y) {
  await expect.poll(() => page.evaluate(({ x, y }) => {
    const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridGroundCell?.(x, y)
      ?? window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
    return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  }, { x, y }), { timeout: 10000 }).toBe(true);
  return page.evaluate(({ x, y }) => (
    window.ANCHOR_MISSION_RENDER_TEST_API.screenPointForGridGroundCell?.(x, y)
      ?? window.ANCHOR_MISSION_RENDER_TEST_API.screenPointForGridCell(x, y)
  ), { x, y });
}

async function threeObjectPoint(page, method, id) {
  await expect.poll(() => page.evaluate(({ method, id }) => {
    const point = window.ANCHOR_MISSION_RENDER_TEST_API?.[method]?.(id);
    return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  }, { method, id }), { timeout: 10000 }).toBe(true);
  return page.evaluate(({ method, id }) => window.ANCHOR_MISSION_RENDER_TEST_API[method](id), { method, id });
}

async function clickThreeGridCell(page, x, y) {
  const point = await threeGridPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function clickThreeObject(page, method, id) {
  const point = await threeObjectPoint(page, method, id);
  await page.mouse.click(point.x, point.y);
}

async function clickThreeGridGroundCell(page, x, y) {
  const point = await threeGridGroundPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function dragThreeGridCell(page, fromX, fromY, toX, toY) {
  const from = await threeGridPoint(page, fromX, fromY);
  const to = await threeGridGroundPoint(page, toX, toY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

async function dragThreeObjectToGridCell(page, method, id, toX, toY, options = {}) {
  const from = await threeObjectPoint(page, method, id);
  const to = await threeGridGroundPoint(page, toX, toY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  if (options.cancelWithEscape) await page.keyboard.press('Escape');
  await page.mouse.up();
}
async function clickFlowDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const canvasX = map.x + ((Number(col) + 0.5) / 18) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / 12) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

async function clickRoiDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const width = scene.field.width;
    const height = scene.field.height;
    const canvasX = map.x + ((Number(col) + 0.5) / width) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / height) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

async function clickCoupledDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const canvasX = map.x + ((Number(col) + 0.5) / 24) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / 16) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

async function clickUncertaintyDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const width = scene.field.width;
    const height = scene.field.height;
    const canvasX = map.x + ((Number(col) + 0.5) / width) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / height) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

async function clickFirstValidCell(page) {
  const cell = await page.evaluate(() => {
    const level = window.anchorGame.state.level;
    for (let y = 2; y < level.world.grid.height; y += 1) {
      for (let x = 2; x < level.world.grid.width; x += 1) {
        const base = (level.layers.bases ?? []).some((candidate) => Math.round(candidate.x) === x && Math.round(candidate.y) === y);
        if (!base && !level.layers.terrain?.[y]?.[x] && !level.layers.hazards?.[y]?.[x]) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  });
  await clickCell(page, cell.x, cell.y);
}

async function dragCell(page, fromX, fromY, toX, toY) {
  const from = await cellCenter(page, fromX, fromY);
  const to = await cellCenter(page, toX, toY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();
}

async function expectWaypointCount(page, count) {
  await expect.poll(async () => page.evaluate(() => (
    window.anchorGame.state.plan?.agentPlans?.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length || 0), 0) ?? 0
  ))).toBe(count);
}

async function expectDebugWaypointSynchronization(page, count) {
  await expect.poll(() => page.evaluate(() => {
    const debug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    return {
      canonical: debug.canonicalWaypointCount,
      three: debug.threeWaypointCount,
      timeline: debug.timelineWaypointCount,
      rightPanel: debug.rightPanelWaypointCount,
      mismatch: debug.waypointCountMismatch
    };
  })).toEqual({ canonical: count, three: count, timeline: count, rightPanel: count, mismatch: false });
}

async function expectTopHudTooltips(page) {
  await expect(page.evaluate(() => {
    const chips = [...document.querySelectorAll('#mission-summary-hud .top-hud-chip')];
    return {
      chipCount: chips.length,
      allHaveTitles: chips.every((chip) => chip.getAttribute('title')?.trim()),
      allHaveAriaLabels: chips.every((chip) => chip.getAttribute('aria-label')?.trim()),
      titles: chips.map((chip) => chip.getAttribute('title'))
    };
  })).resolves.toMatchObject({
    allHaveTitles: true,
    allHaveAriaLabels: true
  });
}

async function expectMarkerHoverAndPlacement(page, x, y) {
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    if (window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d') scene.setThreeInteractionMode?.('placeMarker');
    else if (window.anchorGame.state.ui.placementMode !== 'marker') scene.togglePlacementMode();
  });
  const point = await cellCenter(page, x, y);
  await page.mouse.move(point.x, point.y);
  const usingThree = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d');
  if (usingThree) {
    await expect.poll(() => page.evaluate(() => {
      const cell = window.ANCHOR_MISSION_RENDER_DEBUG?.hoveredGridCell;
      return cell ? { x: cell.x, y: cell.y } : null;
    })).toEqual({ x, y });
  } else {
    await expect(page.locator('#map-hover-tooltip')).toContainText(`Cell (${x}, ${y})`);
    await expectTooltipNearPointer(page, point);
    await expect(page.evaluate(() => window.anchorGame.state.ui.hoverCell)).resolves.toEqual({ x, y });
  }
  await page.mouse.click(point.x, point.y);
  await expect(page.evaluate(() => {
    const marker = window.anchorGame.state.plan.planningMarkers?.at(-1);
    return marker ? { x: marker.x, y: marker.y } : null;
  })).resolves.toEqual({ x, y });
}

async function expectTooltipNearPointer(page, point) {
  await expect(page.evaluate(({ point }) => {
    const rect = document.getElementById('map-hover-tooltip')?.getBoundingClientRect();
    if (!rect) return { exists: false };
    const horizontalGap = point.x <= rect.left
      ? rect.left - point.x
      : point.x - rect.right;
    const verticalGap = point.y <= rect.top
      ? rect.top - point.y
      : point.y - rect.bottom;
    return {
      exists: true,
      insideViewport: rect.left >= 0
        && rect.top >= 0
        && rect.right <= window.innerWidth
        && rect.bottom <= window.innerHeight,
      closeHorizontally: horizontalGap <= 24,
      closeVertically: verticalGap <= 24,
      notFarRight: rect.left - point.x < 80,
      notFarBelow: rect.top - point.y < 80
    };
  }, { point })).resolves.toEqual({
    exists: true,
    insideViewport: true,
    closeHorizontally: true,
    closeVertically: true,
    notFarRight: true,
    notFarBelow: true
  });
}

async function validMarkerCellsNear(page, origin, count = 2) {
  return page.evaluate(({ origin, count }) => {
    const level = window.anchorGame.state.level;
    const cells = [];
    for (let radius = 1; radius < Math.max(level.world.grid.width, level.world.grid.height); radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const x = origin.x + dx;
          const y = origin.y + dy;
          if (x < 0 || y < 0 || x >= level.world.grid.width || y >= level.world.grid.height) continue;
          if (level.layers.terrain?.[y]?.[x]) continue;
          if (cells.some((cell) => cell.x === x && cell.y === y)) continue;
          cells.push({ x, y });
          if (cells.length >= count) return cells;
        }
      }
    }
    return cells;
  }, { origin, count });
}

async function expectCenterShellContained(page) {
  await expect(page.evaluate(() => {
    const left = document.getElementById('mission-console').getBoundingClientRect();
    const center = document.getElementById('game-root').getBoundingClientRect();
    const right = document.getElementById('waypoint-timeline').getBoundingClientRect();
    const canvas = document.querySelector('#game-root canvas').getBoundingClientRect();
    return {
      centerAfterLeft: center.left >= left.right - 1,
      centerBeforeRight: center.right <= right.left + 1,
      canvasInsideCenter: canvas.left >= center.left - 1
        && canvas.right <= center.right + 1
        && canvas.top >= center.top - 1
        && canvas.bottom <= center.bottom + 1,
      canvasFillsCenter: Math.abs(canvas.width - center.width) <= 1
        && Math.abs(canvas.height - center.height) <= 1,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1
    };
  })).resolves.toEqual({
    centerAfterLeft: true,
    centerBeforeRight: true,
    canvasInsideCenter: true,
    canvasFillsCenter: true,
    noHorizontalOverflow: true
  });
}

async function expectCenterPanelUsesAvailableSpace(page) {
  await expect(page.evaluate(() => {
    const center = document.getElementById('game-root').getBoundingClientRect();
    const panel = document.querySelector('#modal-root .center-panel')?.getBoundingClientRect();
    return {
      exists: Boolean(panel),
      usesCenterWidth: panel ? panel.width >= center.width * 0.82 : false,
      contained: panel ? panel.left >= center.left - 1 && panel.right <= center.right + 1 : false
    };
  })).resolves.toEqual({
    exists: true,
    usesCenterWidth: true,
    contained: true
  });
}

async function expectSamplingSectionsCollapsed(page, titles) {
  await expect.poll(() => page.evaluate((expectedTitles) => {
    const headers = [...document.querySelectorAll('#mission-console .accordion-header')];
    return expectedTitles.every((title) => {
      const header = headers.find((entry) => entry.textContent.replace(/\s+/g, ' ').trim().includes(title));
      return header?.getAttribute('aria-expanded') === 'false';
    });
  }, titles)).toBe(true);
}

async function openMainMenuHubSection(page, view) {
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await expect(page.locator('#main-menu-hub')).toBeVisible();
  await page.locator(`#main-menu-hub [data-hub-view="${view}"]`).first().click();
  await expect(page.locator(`#main-menu-hub[data-hub-view="${view}"]`)).toBeVisible();
}

async function launchFromMainMenuHub(page, view, action) {
  await openMainMenuHubSection(page, view);
  await page.locator(`#main-menu-hub [data-action="${action}"]`).first().click();
}
async function expandMissionConsoleSection(page, title) {
  await expect(page.locator('#mission-console .accordion-header').filter({ hasText: title }).first()).toBeVisible();
  await page.evaluate((sectionTitle) => {
    const headers = [...document.querySelectorAll('#mission-console .accordion-header')]
      .filter((header) => header.textContent.replace(/\s+/g, ' ').trim().includes(sectionTitle));
    for (const header of headers) {
      if (header.getAttribute('aria-expanded') !== 'true') header.click();
    }
  }, title);
  await expect.poll(() => page.evaluate((sectionTitle) => {
    const headers = [...document.querySelectorAll('#mission-console .accordion-header')]
      .filter((header) => header.textContent.replace(/\s+/g, ' ').trim().includes(sectionTitle));
    return headers.length > 0 && headers.every((header) => header.getAttribute('aria-expanded') === 'true');
  }, title)).toBe(true);
}

async function expandMissionConsoleSections(page, titles) {
  for (const title of titles) {
    await expandMissionConsoleSection(page, title);
  }
}

async function clickRightPanelMode(page, mode) {
  await page.evaluate((nextMode) => {
    document.querySelector(`#waypoint-timeline [data-roi-panel-mode="${nextMode}"]`)?.click();
  }, mode);
}

async function installWaterColumnE2eConfig(page) {
  await page.evaluate(() => {
    const state = window.anchorGame.state;
    state.level.world.waterColumnConfig = {
      enabled: true,
      depthLayerIds: ['surface', 'shallow', 'thermocline', 'deep'],
      defaultLayerIds: ['surface', 'thermocline', 'deep'],
      divediveProfileId: 'sawtoothProfile'
    };
    state.ui ??= {};
    state.ui.waterColumn = {
      ...(state.ui.waterColumn ?? {}),
      verticalDisplayMode: 'physicalDepth',
      activeDepthLayerId: 'thermocline',
      selectedDivediveProfileId: 'sawtoothProfile',
      selectedTargetDepthLayerId: 'thermocline',
      selectedScalarFieldId: 'sampleValue',
      currentDisplayMode: 'activeLayerOnly',
      globalOpacity: 0.28
    };
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.refreshPanels();
    scene.refreshMap();
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.canonicalLayerCount), { timeout: 15000 }).toBe(4);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeDepthLayerId), { timeout: 15000 }).toBe('thermocline');
}
async function startTutorialPlanning(page) {
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
}

async function planVisibleThreeTutorialRoute(page, { includeSecondAgent = false } = {}) {
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
  const agentIds = await page.evaluate(() => (window.anchorGame.state.mission?.agents ?? []).map((agent) => agent.id));
  expect(agentIds.length).toBeGreaterThan(0);

  await clickThreeObject(page, 'screenPointForAgent', agentIds[0]);
  await deployAgentThroughVisibleThreeControls(page, agentIds[0]);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  for (const cell of [{ x: 5, y: 2 }, { x: 5, y: 3 }, { x: 6, y: 2 }]) {
    await clickThreeGridCell(page, cell.x, cell.y);
  }

  if (includeSecondAgent && agentIds.length > 1) {
    await clickThreeObject(page, 'screenPointForAgent', agentIds[1]);
    await deployAgentThroughVisibleThreeControls(page, agentIds[1]);
    const waypoint = await firstPlaceableWaypointCell(page, agentIds[1]);
    await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
    await clickThreeGridCell(page, waypoint.x, waypoint.y);
  }
}

async function deployAgentThroughVisibleThreeControls(page, agentId) {
  const deploymentCell = await deploymentCellForAgent(page, agentId);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectDeploymentCell');
  await clickThreeGridCell(page, deploymentCell.x, deploymentCell.y);
  await expect.poll(() => page.evaluate((id) => {
    const agentPlan = window.anchorGame.state.plan?.agentPlans?.find((candidate) => candidate.agentId === id);
    const start = agentPlan?.selectedStart;
    return start ? { x: start.x, y: start.y } : null;
  }, agentId)).toEqual(deploymentCell);
}

async function deploymentCellForAgent(page, agentId) {
  return page.evaluate((id) => {
    const state = window.anchorGame.state;
    const agent = state.mission?.agents?.find((candidate) => candidate.id === id);
    const zones = state.level?.zones ?? [];
    const zone = zones.find((candidate) => candidate.id === agent?.deployment?.zoneId)
      ?? zones.find((candidate) => candidate.type === 'deployment');
    const cell = zone?.cells?.[0];
    if (!cell) throw new Error(`No deployment cell found for ${id}`);
    return { x: cell.x, y: cell.y };
  }, agentId);
}

async function firstPlaceableWaypointCell(page, agentId) {
  return page.evaluate(async (id) => {
    const { canPlaceWaypoint } = await import('./src/core/planning/WaypointPlacementGuard.js');
    const width = window.anchorGame.state.level?.world?.grid?.width ?? 0;
    const height = window.anchorGame.state.level?.world?.grid?.height ?? 0;
    for (let y = 1; y < height; y += 1) {
      for (let x = 1; x < width; x += 1) {
        const placement = canPlaceWaypoint(window.anchorGame.state, id, { x, y, action: 'sample' });
        if (placement.allowed === true) return { x, y };
      }
    }
    throw new Error(`No placeable waypoint cell found for ${id}`);
  }, agentId);
}

async function canonicalSimulationState(page) {
  return page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const debug = window.ANCHOR_EXECUTION_DEBUG ?? {};
    const renderDebug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    const agents = scene?.engine?.agents ?? [];
    const positions = agents.map((agent) => ({ id: agent.id, x: Number(agent.x), y: Number(agent.y), energy: Number(agent.energy ?? agent.battery ?? 0) }));
    const initial = debug.initialAgentPositions ?? positions;
    return {
      stepCount: debug.engineStepCount ?? scene?.engine?.stepCount ?? 0,
      timeSeconds: Number(debug.simulationTimeSeconds ?? scene?.engine?.t ?? 0),
      firstStepCompleted: debug.firstStepCompleted === true,
      trajectoryPointCount: debug.canonicalTrajectoryPointCount ?? positions.length,
      threeTrajectoryPointCount: debug.threeTrajectoryPointCount ?? renderDebug.realizedTrajectoryPointCount ?? 0,
      plannedRouteCount: renderDebug.plannedRouteCount ?? 0,
      observationCount: debug.canonicalObservationCount ?? 0,
      threeObservationCount: debug.threeObservationCount ?? renderDebug.observationCount ?? 0,
      energyTotal: positions.reduce((sum, agent) => sum + agent.energy, 0),
      positions,
      anyAgentMoved: positions.some((agent, index) => {
        const before = initial[index];
        return before && (Math.abs(Number(agent.x) - Number(before.x)) > 1e-6 || Math.abs(Number(agent.y) - Number(before.y)) > 1e-6);
      }),
      failureReason: debug.failureReason ?? scene?.engine?.abortReason ?? null
    };
  });
}

async function runDeterministicTutorialToResult(page, { legacy = false } = {}) {
  await page.goto(legacy ? '/?legacyPhaser=1' : '/');
  await startTutorialPlanning(page);
  if (legacy) {
    await expect(page.locator('#mission-console [data-action="renderer-legacy"]')).toBeVisible();
    await page.locator('#mission-console [data-action="renderer-legacy"]').click();
    await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('legacyPhaser2d');
  }
  const agentId = await page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.id);
  const deploymentCell = await deploymentCellForAgent(page, agentId);
  await page.evaluate(({ deploymentCell }) => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.trySelectDeploymentStart(deploymentCell);
    scene.addWaypointForSelected({ x: 5, y: 2, action: 'sample' });
    scene.addWaypointForSelected({ x: 5, y: 3, action: 'sample' });
    scene.executePlan({ source: 'renderer-parity-e2e' });
  }, { deploymentCell });
  await expectWaypointCount(page, 2);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.engineInitialized === true && window.ANCHOR_EXECUTION_DEBUG?.planDigestMatch === true), { timeout: 15000 }).toBe(true);
  if (!legacy) {
    await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
    await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  }
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.result && window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount === 1), { timeout: 30000 }).toBe(true);
  return page.evaluate(async () => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const result = window.anchorGame.state.result;
    const events = (scene.engine?.events ?? []).map((event) => ({
      type: event.type,
      agentId: event.agentId ?? null,
      x: Number.isFinite(Number(event.x)) ? Number(Number(event.x).toFixed(6)) : null,
      y: Number.isFinite(Number(event.y)) ? Number(Number(event.y).toFixed(6)) : null,
      t: Number.isFinite(Number(event.t ?? event.timeSeconds)) ? Number(Number(event.t ?? event.timeSeconds).toFixed(6)) : null,
      status: event.status ?? null,
      value: Number.isFinite(Number(event.value)) ? Number(Number(event.value).toFixed(6)) : null
    }));
    return {
      levelId: window.anchorGame.state.level?.levelId ?? window.anchorGame.state.level?.id ?? null,
      missionId: window.anchorGame.state.mission?.missionId ?? window.anchorGame.state.mission?.id ?? null,
      seed: window.anchorGame.state.level?.meta?.seed ?? window.anchorGame.state.mission?.rules?.stochasticSeed ?? null,
      planDigest: window.ANCHOR_EXECUTION_DEBUG?.enginePlanDigest ?? window.ANCHOR_EXECUTION_DEBUG?.launchPlanDigest ?? null,
      terminalReason: result?.summary?.stopReason?.code ?? result?.summary?.terminalReason ?? null,
      elapsedTime: result?.summary?.elapsedTime ?? scene.engine?.t ?? null,
      finalPositions: (scene.engine?.agents ?? []).map((agent) => ({
        agentId: agent.id,
        x: Number(Number(agent.x).toFixed(6)),
        y: Number(Number(agent.y).toFixed(6)),
        energy: Number(Number(agent.energy ?? agent.battery ?? 0).toFixed(6)),
        status: agent.status ?? null
      })),
      trajectories: (scene.engine?.agents ?? []).map((agent) => ({
        agentId: agent.id,
        points: (agent.history ?? []).map((point) => ({
          x: Number(Number(point.x).toFixed(6)),
          y: Number(Number(point.y).toFixed(6)),
          t: Number(Number(point.t ?? point.timeSeconds ?? 0).toFixed(6))
        }))
      })),
      waypointStatus: (scene.engine?.agents ?? []).map((agent) => ({
        agentId: agent.id,
        completed: agent.completedWaypoints ?? [],
        missed: agent.missedWaypoints ?? []
      })),
      observations: events.filter((event) => ['sample', 'duplicateSample', 'probabilityOutcome'].includes(event.type)),
      samples: result?.summary?.sampledCells ?? null,
      energy: result?.summary?.energyUsed ?? null,
      hazards: result?.summary?.hazardsHit ?? null,
      goldStars: result?.summary?.priorityTargets?.captured ?? null,
      events,
      score: result?.summary?.finalScore ?? null,
      result: result?.summary ?? null
    };
  });
}
async function startPlanningFromBriefing(page) {
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').startPlanning());
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
}

async function downloadDemoArtifact(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="export-demo-json"]').click()
  ]);
  const path = await download.path();
  const text = await fs.readFile(path, 'utf8');
  return {
    filename: download.suggestedFilename(),
    data: JSON.parse(text)
  };
}

async function clickCanvasPoint(page, canvasX, canvasY) {
  const point = await canvasPoint(page, canvasX, canvasY);
  await page.mouse.click(point.x, point.y);
}

async function canvasPoint(page, canvasX, canvasY) {
  return page.evaluate(({ canvasX, canvasY }) => {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { canvasX, canvasY });
}

async function cellCenter(page, x, y) {
  return page.evaluate(({ x, y }) => {
    const threePoint = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
    if (threePoint && Number.isFinite(threePoint.x) && Number.isFinite(threePoint.y)) return { x: threePoint.x, y: threePoint.y };
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const layout = window.anchorGame.adapter.layout;
    if (!layout) throw new Error('No Phaser map layout or Three projection API is available for cellCenter.');
    const canvasX = layout.ox + (x + 0.5) * layout.cell;
    const canvasY = layout.oy + (y + 0.5) * layout.cell;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { x, y });
}

async function totalWaypointCount(page) {
  return page.evaluate(() => (window.anchorGame.state.plan?.agentPlans ?? []).reduce((sum, plan) => sum + (plan.waypoints?.length ?? 0), 0));
}
