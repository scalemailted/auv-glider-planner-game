import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';
import { compareSimulationExecutions } from '../../src/core/simulation/SimulationRendererParity.js';
import {
  waitForDefaultPhaserApp,
  prepareTerrainValidationPlanningBase,
  terrainReadinessSnapshot,
  findLandCrossingRouteCandidate,
  findDeepDiveWarningRouteCandidate,
  findTerrainWarningWaypointCell,
  findBelowSeabedSamplingTargetCell,
  focusFirstTerrainIssue,
  generatedWaterColumnSnapshot,
  legacyWaterColumnSnapshot,
  collectSceneIsolationSnapshot,
  expectMainMenuSceneIsolation,
  stepSimulationSceneForRenderCost,
  advanceSimulationSceneForRenderCost,
  startSimulationSceneRenderCostStepper,
  stopSimulationSceneRenderCostStepper,
  prepareThreeSamplingTargetDiveScenario,
  expectNoTerrainResourcesOnMainMenu,
  startVisibleContinuousMissionPlanning,
  assertContinuousBrowserErrorsClean,
  selectedAgentId,
  deploySelectedGliderThroughVisibleControls,
  deployAllGlidersThroughVisibleControls,
  deployAllGlidersAndRouteFirstThroughVisibleControls,
  selectFirstAgentThroughVisibleControls,
  selectAgentThroughVisibleControls,
  adjacentPlaceableWaypointPair,
  clickBetweenThreeGridCells,
  waypointAtIndex,
  hasFractionalCoordinate,
  continuousDiveExecutionSnapshot,
  expectSingleThreeMissionRenderer,
  findHardInvalidWaypointCell,
  findSamplingTargetPlacementCell,
  findWaypointPlacementCell,
  isFiniteQuaternion,
  quaternionDelta,
  clickCell,
  threeGridPoint,
  threeGridGroundPoint,
  threeObjectPoint,
  clickThreeGridCell,
  clickThreeObject,
  clickThreeGridGroundCell,
  dragThreeGridCell,
  dragThreeObjectToGridCell,
  clickFlowDemoCell,
  clickRoiDemoCell,
  clickCoupledDemoCell,
  clickUncertaintyDemoCell,
  clickFirstValidCell,
  dragCell,
  expectWaypointCount,
  expectDebugWaypointSynchronization,
  expectTopHudTooltips,
  expectMarkerHoverAndPlacement,
  expectTooltipNearPointer,
  validMarkerCellsNear,
  expectCenterShellContained,
  expectCenterPanelUsesAvailableSpace,
  expectSamplingSectionsCollapsed,
  openMainMenuHubSection,
  launchFromMainMenuHub,
  expandMissionConsoleSection,
  expandMissionConsoleSections,
  clickRightPanelMode,
  installWaterColumnE2eConfig,
  startTutorialPlanning,
  planVisibleThreeTutorialRoute,
  deployAgentThroughVisibleThreeControls,
  deploymentCellForAgent,
  firstPlaceableWaypointCell,
  canonicalSimulationState,
  runDeterministicTutorialToResult,
  startPlanningFromBriefing,
  downloadDemoArtifact,
  clickCanvasPoint,
  canvasPoint,
  cellCenter,
  totalWaypointCount
} from './helpers/SmokeSpecShared.js';

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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });

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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });

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
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
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
  await expect(page.locator('#game-canvas')).toBeVisible();
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
  await expect(page.locator('#debrief-root [data-action="review-replay"]')).toBeVisible();
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
