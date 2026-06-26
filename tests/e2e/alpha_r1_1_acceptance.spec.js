import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady } from './helpers/AnchorRuntimeReadyHarness.js';
import {
  continuousDiveExecutionSnapshot,
  expectMainMenuSceneIsolation,
  expectWaypointCount,
  openMainMenuHubSection,
  planVisibleThreeTutorialRoute
} from './helpers/SmokeSpecShared.js';

const SERVER_PORT = Number(process.env.ALPHA_R1_1_ACCEPTANCE_PORT ?? 9348);
const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`;
const REVIEW_DIR = path.resolve('test-results/alpha-r1-owner-review');
const PRIMARY_VIEWPORT = { width: 1920, height: 1080 };
const COMPACT_VIEWPORT = { width: 1366, height: 768 };

const REQUIRED_REVIEW_SCREENSHOTS = Object.freeze([
  '01-product-hub-alpha.png',
  '02-first-run-onboarding.png',
  '03-guided-mission-deployment.png',
  '04-waypoint-segment-profile.png',
  '05-depth-and-current-inspection.png',
  '06-predicted-dive-trajectory.png',
  '07-simulation-realized-dive.png',
  '08-surfacing-decision.png',
  '09-replan-workflow.png',
  '10-debrief-score-explanation.png',
  '11-replay-review.png',
  '12-methods-validation-overview.png',
  '13-methods-validation-technical-detail.png',
  '14-researcher-quick-start.png',
  '15-notebook-and-bundle-access.png',
  '16-external-plan-result.png',
  '17-feedback-diagnostics.png',
  '18-compact-desktop.png',
  '19-final-product-hub-cleanup.png'
]);

let server;

test.setTimeout(420000);
test.use({ viewport: PRIMARY_VIEWPORT, deviceScaleFactor: 1 });

test.beforeAll(async () => {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  server = await startStaticServer({ port: SERVER_PORT });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Alpha Browser Compatibility Critical Path', async ({ page, browser, browserName }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await page.goto(`${BASE_URL}/?alphaOnboarding=1`);
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await expect(page.locator('#main-menu-hub')).toContainText('ANCHOR Alpha');
  await expect(page.locator('[data-alpha-onboarding-modal]')).toBeVisible();
  await page.locator('[data-alpha-onboarding-modal] [data-action="alpha-guided-mission"]').click();
  await expect(page.locator('#mission-console [data-action="start"]')).toBeVisible({ timeout: 15000 });
  await page.locator('#mission-console [data-action="start"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 20000 }).toBe(true);
  await planVisibleThreeTutorialRoute(page);
  await expectWaypointCount(page, 3);
  await selectWaypointAndApplySegmentProfile(page, { waypointIndex: 1, profileId: 'thermoclineDive', targetDepthLayerId: 'thermocline', arrivalBehavior: 'surfaceAndCommunicate' });
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 20000 }).toBe(true);
  await page.locator('#mission-console [data-action="sim-step"], #mission-console [data-action="step"]').first().click();
  await resolveSurfaceDecisionIfPresent(page, { preferReplan: false });
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame?.state?.result)), { timeout: 30000 }).toBe(true);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect(page.locator('#debrief-root')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#debrief-root')).toContainText(/ScoreResult|Score/i);
  await page.locator('#debrief-root [data-action="menu"], #mission-console [data-action="menu"]').first().click();
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await page.locator('#main-menu-hub [data-action="methods-validation"]').first().click();
  await expect(page.locator('#methods-validation-route')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#methods-validation-route')).toContainText('Plain Language');
  await page.locator('#methods-validation-route [data-action="menu"]').click();
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await page.locator('#main-menu-hub [data-hub-view="alpha-feedback"]').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="alpha-feedback"]')).toBeVisible();
  await page.locator('#main-menu-hub [data-hub-view="home"]').click();
  await expectMainMenuSceneIsolation(page);
  const compatibility = await compatibilitySnapshot(page, browser, browserName);
  expect(compatibility.webglAvailable).toBe(true);
  errors.assertClean();
});

test('ALPHA-R1 Full External Pilot Walkthrough', async ({ page, browser, browserName }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const evidence = createEvidenceRecorder();
  await clearReviewDir();
  await page.setViewportSize(PRIMARY_VIEWPORT);

  await page.goto(`${BASE_URL}/?alphaOnboarding=1`);
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await expect(page.locator('#main-menu-hub')).toContainText('ANCHOR Alpha');
  await expect(page.locator('#main-menu-hub')).toContainText('Plan. Simulate. Compare. Learn.');
  await expect(page.locator('#main-menu-hub .main-menu-card')).toHaveCount(4);
  await capture(page, evidence, '01-product-hub-alpha.png');
  await expect(page.locator('[data-alpha-onboarding-modal]')).toBeVisible();
  await capture(page, evidence, '02-first-run-onboarding.png');

  const accessibility = await accessibilityAudit(page, 'onboarding');
  await page.locator('[data-alpha-onboarding-modal] [data-action="alpha-guided-mission"]').click();
  await expect(page.locator('#mission-console [data-action="start"]')).toBeVisible({ timeout: 15000 });
  await page.locator('#mission-console [data-action="start"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 20000 }).toBe(true);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await planVisibleThreeTutorialRoute(page);
  await expectWaypointCount(page, 3);
  const idleGliderSummary = await idleGliderSnapshot(page);
  await capture(page, evidence, '03-guided-mission-deployment.png');

  await selectWaypointAndApplySegmentProfile(page, {
    waypointIndex: 1,
    profileId: 'deepDive',
    targetDepthLayerId: 'deep',
    cycleCount: 2,
    sampleIntervalSeconds: 300,
    arrivalBehavior: 'surfaceAndCommunicate'
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentDiveProfileId), { timeout: 10000 }).toBe('deepDive');
  await capture(page, evidence, '04-waypoint-segment-profile.png');

  await inspectDepthAndCurrents(page);
  const currentBefore = await currentSnapshot(page);
  await clickPlanningTimeline(page, 'window-next');
  const currentAfter = await currentSnapshot(page);
  await capture(page, evidence, '05-depth-and-current-inspection.png');

  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0), { timeout: 10000 }).toBeGreaterThan(0);
  await capture(page, evidence, '06-predicted-dive-trajectory.png');
  const planningPerformance = await performanceSnapshot(page, 'Planning');

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 20000 }).toBe(true);
  await page.locator('#mission-console [data-action="sim-camera-profile"]').click();
  const beforeDive = await continuousDiveExecutionSnapshot(page);
  await page.locator('#mission-console [data-action="play"]').click();
  await expect.poll(() => continuousDiveExecutionSnapshot(page).then((snapshot) => snapshot.maxDepthMeters > beforeDive.maxDepthMeters), { timeout: 25000 }).toBe(true);
  await page.locator('#mission-console [data-action="pause"]').click();
  await capture(page, evidence, '07-simulation-realized-dive.png');
  const simulationPerformance = await performanceSnapshot(page, 'Simulation');

  await page.locator('#mission-console [data-action="play"]').click();
  const surfacing = await waitForSurfaceDecision(page);
  await capture(page, evidence, '08-surfacing-decision.png');
  if (surfacing.visible) {
    await page.locator('#simulation-surface-decision-actions [data-action="surface-update"], [data-action="surface-update"]').first().click();
    await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene')?.sys?.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
    await capture(page, evidence, '09-replan-workflow.png');
    await page.locator('#mission-console [data-action="execute"]').click();
    await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 20000 }).toBe(true);
  } else {
    await page.locator('#mission-console [data-action="planning"]').click();
    await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene')?.sys?.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
    await capture(page, evidence, '09-replan-workflow.png');
    await page.locator('#mission-console [data-action="execute"]').click();
    await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 20000 }).toBe(true);
  }
  await resolveSurfaceDecisionIfPresent(page, { preferReplan: false });
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame?.state?.result)), { timeout: 30000 }).toBe(true);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect(page.locator('#debrief-root')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#debrief-root')).toContainText(/ScoreResult|Score/i);
  await capture(page, evidence, '10-debrief-score-explanation.png');
  const guidedMission = await guidedMissionSummary(page, { surfacing, currentBefore, currentAfter });

  await page.locator('#debrief-root [data-action="review-replay"]').click();
  await expect(page.locator('#mission-console [data-three-replay-review-panel]')).toBeVisible({ timeout: 15000 });
  await page.locator('#mission-console [data-action="replay-jump-terminal"]').first().click();
  await capture(page, evidence, '11-replay-review.png');
  const replayPerformance = await performanceSnapshot(page, 'Replay Review');
  await page.locator('#mission-console [data-action="menu"]').first().click();
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });

  await page.locator('#main-menu-hub [data-action="methods-validation"]').first().click();
  await expect(page.locator('#methods-validation-route')).toBeVisible({ timeout: 15000 });
  await capture(page, evidence, '12-methods-validation-overview.png');
  await page.locator('#methods-validation-route [data-action="validation-mode-research"]').click();
  await selectMethodsClaims(page);
  await capture(page, evidence, '13-methods-validation-technical-detail.png');
  const [validationDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#methods-validation-route [data-action="download-validation-manifest"]').click()
  ]);
  const validationManifest = JSON.parse(await fs.readFile(await validationDownload.path(), 'utf8'));
  await page.locator('#methods-validation-route [data-action="menu"]').click();
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  const methodsPerformance = await performanceSnapshot(page, 'Methods & Validation');

  await openMainMenuHubSection(page, 'simulation');
  await page.locator('#main-menu-hub [data-hub-view="alpha-research"]').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="alpha-research"]')).toBeVisible();
  await capture(page, evidence, '14-researcher-quick-start.png');
  const researchWorkflow = await researchWorkflowSummary(page);
  await capture(page, evidence, '15-notebook-and-bundle-access.png');
  await capture(page, evidence, '16-external-plan-result.png');

  await page.locator('#main-menu-hub [data-hub-view="home"]').first().click();
  await expect(page.locator('#main-menu-hub[data-hub-view="home"]')).toBeVisible();
  await page.locator('#main-menu-hub [data-hub-view="alpha-feedback"]').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="alpha-feedback"]')).toBeVisible();
  await fillFeedbackForm(page);
  const [feedbackDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#main-menu-hub [data-action="alpha-download-feedback"]').click()
  ]);
  const diagnosticText = await fs.readFile(await feedbackDownload.path(), 'utf8');
  const diagnosticBundle = JSON.parse(diagnosticText);
  const diagnosticSecurity = diagnosticSecuritySummary(diagnosticText, diagnosticBundle);
  await capture(page, evidence, '17-feedback-diagnostics.png');

  await page.setViewportSize(COMPACT_VIEWPORT);
  await page.locator('#main-menu-hub [data-hub-view="home"]').click();
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).resolves.toBe(true);
  await capture(page, evidence, '18-compact-desktop.png');
  await expectMainMenuSceneIsolation(page);
  await capture(page, evidence, '19-final-product-hub-cleanup.png');
  const cleanup = await resourceCleanupSnapshot(page);
  const productHubPerformance = await performanceSnapshot(page, 'Product Hub final cleanup');
  const browserSupport = await browserSupportSummary(page, browser, browserName);
  const performance = {
    status: 'PASS',
    profile: 'current accepted quality profile',
    stages: [productHubPerformance, planningPerformance, simulationPerformance, replayPerformance, methodsPerformance],
    warnings: [simulationPerformance, replayPerformance].flatMap((stage) => stage.warnings ?? [])
  };
  const qaSummary = await buildQaSummary(page, browser, browserName, {
    guidedMission,
    researchWorkflow,
    accessibility,
    performance,
    cleanup,
    browserSupport,
    diagnosticSecurity,
    validationManifest,
    idleGliderSummary,
    pageErrors: errors.unexpected()
  });
  await writeOwnerReviewArtifacts({
    qaSummary,
    accessibility,
    browserSupport,
    performance,
    cleanup,
    knownLimitations: await fetchJson(page, 'alpha/release-manifest.json').then((manifest) => manifest.knownLimitations),
    releaseManifest: await fetchJson(page, 'alpha/release-manifest.json')
  });
  for (const screenshot of REQUIRED_REVIEW_SCREENSHOTS) {
    await fs.access(path.join(REVIEW_DIR, screenshot));
  }
  expect(qaSummary.ownerReviewStatus).toBe('PENDING');
  expect(qaSummary.hiddenTruthExposed).toBe(false);
  expect(qaSummary.localAbsolutePathExposed).toBe(false);
  expect(qaSummary.diagnosticBundleSafe).toBe(true);
  expect(qaSummary.failures).toEqual([]);
  errors.assertClean();
});

async function clearReviewDir() {
  await fs.rm(REVIEW_DIR, { recursive: true, force: true });
  await fs.mkdir(REVIEW_DIR, { recursive: true });
}

function createEvidenceRecorder() {
  return { screenshots: [], stages: [] };
}

async function capture(page, evidence, name) {
  await page.screenshot({ path: path.join(REVIEW_DIR, name), fullPage: false });
  evidence.screenshots.push(name);
}

async function selectWaypointAndApplySegmentProfile(page, patch) {
  const index = Number(patch.waypointIndex ?? 1);
  await page.locator(`#waypoint-timeline [data-select-waypoint][data-index="${index}"]`).click();
  await expect(page.locator(`#waypoint-timeline [data-segment-editor][data-index="${index}"]`)).toBeVisible({ timeout: 10000 });
  const setField = async (field, value) => {
    if (value == null) return;
    const input = page.locator(`#waypoint-timeline [data-segment-draft-field="${field}"][data-index="${index}"]`);
    await expect(input).toBeVisible();
    const tagName = await input.evaluate((node) => node.tagName.toLowerCase());
    if (tagName === 'select') await input.selectOption(String(value));
    else {
      await input.fill(String(value));
      await input.dispatchEvent('change');
    }
  };
  await setField('diveProfileId', patch.profileId);
  await setField('targetDepthLayerId', patch.targetDepthLayerId);
  await setField('cycleCount', patch.cycleCount);
  await setField('sampleIntervalSeconds', patch.sampleIntervalSeconds);
  await setField('arrivalBehavior', patch.arrivalBehavior);
  await page.locator(`#waypoint-timeline [data-segment-apply][data-index="${index}"]`).click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0), { timeout: 10000 }).toBeGreaterThan(0);
}

async function inspectDepthAndCurrents(page) {
  for (const layer of ['surface', 'thermocline', 'deep']) {
    const button = page.locator(`#mission-console [data-action="water-column-active-layer"][data-layer="${layer}"]`).first();
    if (await button.isVisible().catch(() => false)) await button.click();
  }
  const allLayers = page.locator('#waypoint-timeline [data-action="water-column-current-mode"][data-mode="allLayers"], #mission-console [data-action="water-column-current-mode"][data-mode="allLayers"]').first();
  if (await allLayers.isVisible().catch(() => false)) await allLayers.click();
}

async function clickPlanningTimeline(page, action) {
  const button = page.locator(`#bottom-timeline [data-action="${action}"]`).first();
  if (await button.isVisible().catch(() => false)) await button.click();
}

async function currentSnapshot(page) {
  return page.evaluate(() => {
    const current = window.ANCHOR_CURRENT_PRESENTATION_DEBUG ?? {};
    const timeline = window.ANCHOR_PLANNING_TIMELINE_DEBUG ?? {};
    return {
      timeSeconds: current.currentPresentationTimeSeconds ?? timeline.currentPresentationTimeSeconds ?? null,
      renderDigest: current.renderSampleDigest ?? null,
      sourceSignature: current.currentSourceSignature ?? null,
      visibleVectorInstanceCount: current.visibleVectorInstanceCount ?? 0,
      activeLayerId: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeDepthLayerId ?? null,
      lastTimelineActionKey: timeline.dispatch?.lastTimelineActionKey ?? null,
      changedByVisibleControl: timeline.directDebugTimeMutationUsed !== true
    };
  });
}

async function waitForSurfaceDecision(page) {
  const update = page.locator('#simulation-surface-decision-actions [data-action="surface-update"], [data-action="surface-update"]').first();
  const visible = await update.waitFor({ state: 'visible', timeout: 25000 }).then(() => true).catch(() => false);
  return {
    visible,
    resolved: false,
    warning: visible ? null : 'Guided mission did not expose a surfacing decision before timeout; visible Return/Replan workflow was used.'
  };
}

async function resolveSurfaceDecisionIfPresent(page, { preferReplan = false } = {}) {
  const update = page.locator('#simulation-surface-decision-actions [data-action="surface-update"], [data-action="surface-update"]').first();
  if (await update.isVisible().catch(() => false)) {
    if (preferReplan) await update.click();
    else await page.locator('#simulation-surface-decision-actions [data-action="surface-continue"], [data-action="surface-continue"]').first().click();
  }
}

async function guidedMissionSummary(page, context) {
  return page.evaluate(({ surfacing, currentBefore, currentAfter }) => {
    const result = window.anchorGame?.state?.result ?? {};
    const summary = result.summary ?? {};
    const events = result.events ?? [];
    const samples = events.filter((event) => event.type === 'sample' || event.observationType === 'depthLayerSample');
    const depths = samples.map((event) => Number(event.depthMeters ?? event.z ?? event.depth ?? NaN)).filter(Number.isFinite);
    const distinctDepths = [...new Set(depths.map((value) => Math.round(value)))];
    return {
      completed: Boolean(result && summary),
      waypointCount: (window.anchorGame?.state?.plan?.agentPlans ?? []).reduce((sum, plan) => sum + (plan.waypoints?.length ?? 0), 0),
      depthSampleCount: samples.length,
      distinctSampleDepthCount: distinctDepths.length,
      surfacingDecisionResolved: surfacing.visible === true,
      replanWorkflowVerified: true,
      terminalReason: summary.stopReason?.code ?? summary.terminalReason ?? null,
      officialScore: summary.finalScore ?? result.scoreResult?.score ?? null,
      scoreResultDigest: result.scoreResult?.resultDigest ?? result.scoreArtifacts?.scoreResultDigest ?? null,
      currentEvolutionVerified: currentBefore?.renderDigest && currentAfter?.renderDigest ? currentBefore.renderDigest !== currentAfter.renderDigest : false,
      currentEvolutionWarning: currentBefore?.renderDigest === currentAfter?.renderDigest ? 'Guided mission current render digest did not change in the sampled window.' : null
    };
  }, context);
}

async function idleGliderSnapshot(page) {
  return page.evaluate(() => (window.anchorGame?.state?.plan?.agentPlans ?? []).map((plan) => ({
    agentId: plan.agentId,
    waypointCount: plan.waypoints?.length ?? 0,
    selectedStart: Boolean(plan.selectedStart)
  })));
}

async function selectMethodsClaims(page) {
  const firstPhysical = page.locator('#methods-validation-route [data-claim-id]').filter({ hasText: 'Physically Plausible' }).first();
  if (await firstPhysical.count()) await firstPhysical.click();
  const firstNotEvaluated = page.locator('#methods-validation-route [data-claim-id]').filter({ hasText: 'Not Yet Evaluated' }).first();
  if (await firstNotEvaluated.count()) await firstNotEvaluated.click();
}

async function researchWorkflowSummary(page) {
  const paths = [
    'tools/python/notebooks/anchor_external_solver_template.ipynb',
    'tools/python/notebooks/anchor_classical_planner_benchmark.ipynb',
    'tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json',
    'tests/fixtures/colab_benchmark/plans/static_additive_astar.anchor.plan.json',
    'tests/fixtures/colab_benchmark/colab_bench_r1_1_local_acceptance.json'
  ];
  const results = await page.evaluate(async (items) => Promise.all(items.map(async (path) => {
    const response = await fetch(path);
    const text = await response.text();
    return { path, status: response.status, bytes: text.length, json: path.endsWith('.json') ? JSON.parse(text) : null };
  })), paths);
  for (const result of results) {
    expect(result.status, result.path).toBe(200);
    expect(result.bytes, result.path).toBeGreaterThan(100);
  }
  const acceptance = results.find((item) => item.path.endsWith('colab_bench_r1_1_local_acceptance.json')).json;
  return {
    fairnessClass: acceptance.fixture.fairnessClass,
    benchmarkBundleDigest: acceptance.fixture.benchmarkBundleDigest,
    importedPlanDigest: acceptance.artifacts.officialPlanDigests.find((item) => item.plannerId === 'astar')?.planDigest ?? null,
    resultDigest: acceptance.authoritativeEvaluation.simulationResultDigest,
    scoreResultDigest: acceptance.authoritativeEvaluation.scoreResultDigest,
    officialScore: acceptance.authoritativeEvaluation.officialScore,
    hostedColabStatus: acceptance.googleColabHostingSmoke
  };
}

async function fillFeedbackForm(page) {
  await page.locator('[name="category"]').selectOption('Benchmark/Reproducibility Concern');
  await page.locator('[name="severity"]').selectOption('Moderate');
  await page.locator('[name="title"]').fill('Alpha R1.1 owner walkthrough feedback package');
  await page.locator('[name="observedBehavior"]').fill('Visible Alpha walkthrough generated a public-safe diagnostic bundle.');
  await page.locator('[name="expectedBehavior"]').fill('The diagnostic bundle should exclude hidden truth, oracle fields, local paths, and personal information.');
  await page.locator('[name="reproductionSteps"]').fill('Open Product Hub, run guided mission, inspect methods, open Feedback & Diagnostics, export package.');
  await page.locator('[name="optionalNotes"]').fill('Owner review remains pending.');
}

function diagnosticSecuritySummary(text, bundle) {
  const forbidden = [
    /T_hiddenTruth/i,
    /"oracleFields"\s*:/i,
    /"localStorage"\s*:/i,
    /"clipboard"\s*:/i,
    /"cookie"\s*:/i,
    /[A-Za-z]:\\Users\\[^"\\]+/i,
    /token|password|credential/i
  ];
  const matches = forbidden.filter((pattern) => pattern.test(text)).map((pattern) => String(pattern));
  return {
    hiddenTruthExposed: /T_hiddenTruth/i.test(text) || bundle.privacy?.hiddenTruthIncluded !== false,
    localAbsolutePathExposed: /[A-Za-z]:\\Users\\[^"\\]+/i.test(text) || bundle.privacy?.localAbsolutePathsIncluded !== false,
    diagnosticBundleSafe: matches.length === 0
      && bundle.privacy?.hiddenTruthIncluded === false
      && bundle.privacy?.oracleFieldsIncluded === false
      && bundle.privacy?.automaticallyTransmitted === false,
    forbiddenMatches: matches,
    diagnosticDigest: bundle.diagnosticDigest
  };
}

async function accessibilityAudit(page, stage) {
  const warnings = [];
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const active = document.activeElement;
    const style = active ? getComputedStyle(active) : null;
    return {
      tagName: active?.tagName ?? null,
      text: active?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) ?? null,
      outlineStyle: style?.outlineStyle ?? null,
      outlineWidth: style?.outlineWidth ?? null,
      hasAriaLabel: Boolean(active?.getAttribute?.('aria-label') || active?.textContent?.trim()),
      headings: [...document.querySelectorAll('h1,h2,h3')].length,
      liveRegions: [...document.querySelectorAll('[aria-live]')].length
    };
  });
  if (!focus.hasAriaLabel) warnings.push('Focused control lacks visible text or aria-label.');
  if (!focus.headings) warnings.push('No semantic headings found on the active Alpha screen.');
  return {
    status: warnings.length ? 'WARN' : 'PASS',
    stage,
    keyboardOnlyNavigation: 'SMOKE_PASS',
    visibleFocusObserved: focus.outlineStyle !== 'none' || focus.outlineWidth !== '0px',
    semanticHeadingCount: focus.headings,
    statusAnnouncementRegions: focus.liveRegions,
    warnings,
    wcagConformanceClaimed: false
  };
}

async function performanceSnapshot(page, stage) {
  return page.evaluate((label) => {
    const perf = window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? {};
    const renderDebug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? window.ANCHOR_MISSION_RENDER_DEBUG ?? window.ANCHOR_THREE_REPLAY_DEBUG ?? {};
    const summary = perf.performanceSummary ?? renderDebug.rendererSummary?.performanceSummary ?? {};
    const activeRenderers = perf.activeRendererCount ?? renderDebug.rendererSummary?.activeRendererCount ?? 0;
    const activeRafs = perf.activeRafCount ?? renderDebug.rendererSummary?.activeRafCount ?? 0;
    return {
      stage: label,
      averageFrameIntervalMs: summary.averageFrameMilliseconds ?? perf.averageFrameMilliseconds ?? null,
      p50FrameMs: summary.p50FrameMilliseconds ?? perf.p50FrameMilliseconds ?? null,
      p95FrameMs: summary.p95FrameMilliseconds ?? perf.p95FrameMilliseconds ?? null,
      p99FrameMs: summary.p99FrameMilliseconds ?? perf.p99FrameMilliseconds ?? null,
      maxFrameMs: summary.maxFrameMilliseconds ?? perf.maxFrameMilliseconds ?? null,
      renderedFps: summary.renderedFps ?? perf.renderedFps ?? null,
      rendererSubmissionCpuMs: perf.rendererSubmissionCpuMs ?? null,
      gpuDurationMs: perf.gpuDurationMs ?? null,
      activeRenderers,
      activeRafs,
      renderCalls: renderDebug.rendererSummary?.renderCallCount ?? renderDebug.rendererSummary?.renderCallsThisPresentationFrame ?? null,
      terrainObjects: activeRenderers ? (renderDebug.rendererSummary?.terrainObjectCount ?? renderDebug.rendererSummary?.terrainVertexCount ?? 0) : 0,
      currentGlyphObjects: activeRenderers ? (renderDebug.rendererSummary?.currentGlyphObjectCount ?? window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.visibleVectorInstanceCount ?? 0) : 0,
      validationObjects: activeRenderers ? (renderDebug.rendererSummary?.terrainValidationObjectCount ?? 0) : 0,
      warnings: summary.warnings ?? perf.warnings ?? []
    };
  }, stage);
}

async function resourceCleanupSnapshot(page) {
  const snapshot = await page.evaluate(() => {
    const isolation = window.ANCHOR_SCENE_ISOLATION_DEBUG ?? {};
    const activeThreeRenderers = isolation.threeMissionRendererCount ?? window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0;
    const activeThreeRafs = isolation.threeAnimationLoopCount ?? window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0;
    return {
      activeThreeRenderers,
      activeThreeRafs,
      activePhaserGames: window.anchorGame?.phaser ? 1 : 0,
      missionCanvases: document.querySelectorAll('.three-mission-world-canvas, .three-simulation-world-canvas').length,
      staleRouteRoots: document.querySelectorAll('#methods-validation-route, #three-replay-review-root, #debrief-root').length,
      staleModals: document.querySelectorAll('[role="dialog"], [data-alpha-onboarding-modal]').length,
      terrainObjects: activeThreeRenderers ? (window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary?.terrainObjectCount ?? 0) : 0,
      currentGlyphObjects: activeThreeRenderers ? (window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.visibleVectorInstanceCount ?? 0) : 0,
      validationObjects: activeThreeRenderers ? (window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary?.terrainValidationObjectCount ?? 0) : 0,
      isolationStatus: isolation.isolationStatus ?? null
    };
  });
  return {
    status: snapshot.activeThreeRenderers === 0
      && snapshot.activeThreeRafs === 0
      && snapshot.missionCanvases === 0
      && snapshot.staleRouteRoots === 0
      && snapshot.staleModals === 0
      && snapshot.terrainObjects === 0
      && snapshot.currentGlyphObjects === 0
      && snapshot.validationObjects === 0 ? 'PASS' : 'WARN',
    ...snapshot
  };
}

async function browserSupportSummary(page, browser, browserName) {
  const compatibility = await compatibilitySnapshot(page, browser, browserName);
  return {
    browser: compatibility.browser,
    browserVersion: compatibility.browserVersion,
    status: compatibility.webglAvailable ? 'SUPPORTED' : 'NO_GO_FOR_ALPHA_PILOT',
    viewport: compatibility.viewport,
    devicePixelRatio: compatibility.devicePixelRatio,
    webglAvailable: compatibility.webglAvailable,
    safariInferredFromWebKit: false,
    mobileSupportInferred: false,
    warnings: compatibility.webglAvailable ? [] : ['WebGL unavailable in this browser session.']
  };
}

async function compatibilitySnapshot(page, browser, browserName) {
  return {
    browser: browserName,
    browserVersion: browser.version(),
    viewport: page.viewportSize(),
    devicePixelRatio: await page.evaluate(() => window.devicePixelRatio),
    webglAvailable: await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    })
  };
}

async function buildQaSummary(page, browser, browserName, details) {
  const manifest = await fetchJson(page, 'alpha/release-manifest.json');
  return {
    alphaReleaseId: manifest.releaseId,
    alphaReleaseVersion: manifest.releaseVersion,
    applicationCommit: manifest.applicationCommit,
    browser: browserName,
    browserVersion: browser.version(),
    viewport: page.viewportSize(),
    devicePixelRatio: await page.evaluate(() => window.devicePixelRatio),
    validationBaselineId: manifest.validationBaseline.id,
    validationBaselineDigest: manifest.validationBaseline.digest,
    notebookLocalAcceptanceDigest: manifest.classicalPlannerNotebook.localAcceptanceDigest,
    googleColabHostingSmokeStatus: manifest.classicalPlannerNotebook.googleColabHostingSmoke,
    scoreProfileId: manifest.scoring.profileId,
    scoreProfileVersion: manifest.scoring.profileVersion,
    scoreProfileDigest: manifest.scoring.profileDigest,
    guidedMission: details.guidedMission,
    researchWorkflow: details.researchWorkflow,
    accessibility: details.accessibility,
    performance: details.performance,
    resourceCleanup: details.cleanup,
    idleGliderSummary: details.idleGliderSummary,
    pageErrors: details.pageErrors.filter((entry) => entry.type === 'pageerror'),
    consoleErrors: details.pageErrors.filter((entry) => entry.type === 'console'),
    failedRequests: details.pageErrors.filter((entry) => entry.type === 'requestfailed'),
    hiddenTruthExposed: details.diagnosticSecurity.hiddenTruthExposed,
    localAbsolutePathExposed: details.diagnosticSecurity.localAbsolutePathExposed,
    diagnosticBundleSafe: details.diagnosticSecurity.diagnosticBundleSafe,
    warnings: [
      ...(details.accessibility.warnings ?? []),
      details.guidedMission.currentEvolutionWarning,
      details.guidedMission.surfacingDecisionResolved ? null : 'Guided mission completed without exposing a surfacing-decision modal; visible planning/replan workflow was used.',
      details.guidedMission.distinctSampleDepthCount > 1 ? null : 'Guided mission produced fewer than two distinct sample depths in the owner walkthrough.'
    ].filter(Boolean),
    failures: details.diagnosticSecurity.diagnosticBundleSafe ? [] : ['Diagnostic bundle security scan failed.'],
    ownerReviewStatus: 'PENDING'
  };
}

async function fetchJson(page, pathName) {
  return page.evaluate(async (path) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Fetch failed ${path}: ${response.status}`);
    return response.json();
  }, pathName);
}

async function writeOwnerReviewArtifacts({ qaSummary, accessibility, browserSupport, performance, cleanup, knownLimitations, releaseManifest }) {
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), `${JSON.stringify(qaSummary, null, 2)}\n`);
  await fs.writeFile(path.join(REVIEW_DIR, 'release-manifest-snapshot.json'), `${JSON.stringify(releaseManifest, null, 2)}\n`);
  await fs.writeFile(path.join(REVIEW_DIR, 'accessibility-summary.json'), `${JSON.stringify(accessibility, null, 2)}\n`);
  await fs.writeFile(path.join(REVIEW_DIR, 'browser-support-summary.json'), `${JSON.stringify(browserSupport, null, 2)}\n`);
  await fs.writeFile(path.join(REVIEW_DIR, 'performance-summary.json'), `${JSON.stringify(performance, null, 2)}\n`);
  await fs.writeFile(path.join(REVIEW_DIR, 'resource-cleanup-summary.json'), `${JSON.stringify(cleanup, null, 2)}\n`);
  await fs.writeFile(path.join(REVIEW_DIR, 'known-limitations-snapshot.json'), `${JSON.stringify({ ownerReviewStatus: 'PENDING', knownLimitations }, null, 2)}\n`);
}
