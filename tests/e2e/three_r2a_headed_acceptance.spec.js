import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import {
  ACCEPTANCE_FIXTURE,
  boot,
  clickAction,
  debriefState,
  openAcceptanceReplay,
  openReplayBundle,
  replaySnapshot,
  scrubReplayTo,
  seedDebriefWithAcceptanceResult,
  waitForReplayReview
} from './helpers/ReplayReviewTestUtils.js';

const REVIEW_DIR = path.resolve('test-results/three-r2a-owner-review');
const SERVER_PORT = Number(process.env.THREE_R2A_ACCEPTANCE_PORT ?? 9332);
const OWNER_REVIEW_RUN = process.argv.includes('--headed') || process.env.ANCHOR_OWNER_REVIEW === '1';
const baseUrl = `http://127.0.0.1:${SERVER_PORT}`;
const PRIMARY_VIEWPORT = { width: 1920, height: 1080 };
const COMPACT_VIEWPORT = { width: 1366, height: 768 };
let server;

test.setTimeout(180000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: SERVER_PORT });
  await fs.mkdir(REVIEW_DIR, { recursive: true });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('THREE-R2A Full Headed Replay and Debrief Walkthrough', async ({ page, browser }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const screenshots = [];
  await page.setViewportSize(PRIMARY_VIEWPORT);
  await boot(page, baseUrl);
  const seed = await seedDebriefWithAcceptanceResult(page);
  const debriefBefore = await debriefState(page);
  await capture(page, screenshots, '01-debrief-summary.png');

  await page.locator('#debrief-root [data-action="review-replay"]').click();
  await waitForReplayReview(page);
  await clickAction(page, 'return');
  await expect(page.locator('#debrief-root')).toBeVisible({ timeout: 15000 });
  await openReplayBundle(page, ACCEPTANCE_FIXTURE, 'browserResult');
  await capture(page, screenshots, '02-replay-initial-state.png');
  await clickAction(page, 'replay-toggle');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.currentEventIndex ?? -1), { timeout: 8000 }).toBeGreaterThan(0);
  await capture(page, screenshots, '03-replay-playing.png');
  await clickAction(page, 'replay-toggle');
  await clickAction(page, 'replay-step-forward');
  await clickAction(page, 'replay-step-back');
  await clickAction(page, 'replay-next-event');
  await clickAction(page, 'replay-prev-event');
  await clickAction(page, 'replay-jump-next');
  await clickAction(page, 'replay-jump-prev');

  await scrubReplayTo(page, 8);
  const middle = await replaySnapshot(page);
  await clickAction(page, 'replay-jump-terminal');
  await capture(page, screenshots, '04-replay-planned-predicted-realized.png');
  await capture(page, screenshots, '05-replay-depth-observation.png');
  await capture(page, screenshots, '06-replay-terrain-event.png');
  await page.locator('[data-camera-preset="sideProfile"]').click();
  await capture(page, screenshots, '07-replay-side-profile.png');
  await page.locator('[data-replay-agent="glider-alpha"]').click();
  await capture(page, screenshots, '08-replay-multi-agent-glider-01.png');
  await page.locator('[data-replay-agent="glider-bravo"]').click();
  await capture(page, screenshots, '09-replay-multi-agent-glider-02.png');
  await clickAction(page, 'replay-jump-prev');
  await clickAction(page, 'replay-jump-next');
  await capture(page, screenshots, '10-replay-checkpoint-navigation.png');
  await clickAction(page, 'replay-jump-terminal');
  await capture(page, screenshots, '11-replay-terminal-state.png');
  const terminal = await replaySnapshot(page);
  await scrubReplayTo(page, 8);
  const repeatedMiddle = await replaySnapshot(page);
  await clickAction(page, 'replay-jump-terminal');
  await clickAction(page, 'reset-replay-performance');
  await clickAction(page, 'replay-jump-start');
  await page.locator('[data-rate="2"]').click();
  await clickAction(page, 'replay-toggle');
  await page.waitForTimeout(1800);
  const performanceSnapshot = { ...(await replaySnapshot(page)), renderer: await liveReplayRendererSummary(page) };
  await clickAction(page, 'replay-toggle');
  const beforeCamera = await replaySnapshot(page);
  await exerciseCameraGestures(page);
  await page.locator('[data-camera-preset="obliqueMission"]').click();
  await page.waitForTimeout(500);
  const afterCamera = await replaySnapshot(page);

  await clickAction(page, 'return');
  await expect(page.locator('#debrief-root')).toBeVisible({ timeout: 15000 });
  const debriefAfter = await debriefState(page);
  expect(debriefAfter.resultDigest).toBe(debriefBefore.resultDigest);
  expect(debriefAfter.officialScore).toBe(debriefBefore.officialScore);
  await capture(page, screenshots, '12-debrief-after-replay.png');
  await page.locator('#debrief-root [data-action="review-replay"]').click();
  await waitForReplayReview(page);
  await clickAction(page, 'menu');
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  const cleanup = await cleanupSnapshot(page);
  await capture(page, screenshots, '13-main-menu-cleanup.png');

  await page.setViewportSize(COMPACT_VIEWPORT);
  await openAcceptanceReplay(page);
  await clickAction(page, 'replay-jump-terminal');
  await capture(page, screenshots, '14-compact-replay-layout.png');
  const compact = await replaySnapshot(page);
  await clickAction(page, 'menu');
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  const finalCleanup = await cleanupSnapshot(page);

  const errors = browserErrors.unexpected();
  const qa = await buildQaSummary({ page, browser, seed, middle, repeatedMiddle, terminal, beforeCamera, afterCamera, performanceSnapshot, cleanup: finalCleanup, compact, screenshots, errors });
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), JSON.stringify(qa, null, 2));
  expect(qa.integrityStatus).toBe('PASS');
  expect(qa.determinism.deterministic).toBe(true);
  expect(qa.determinism.reverseUsedCheckpointRestore).toBe(true);
  expect(qa.lifecycle.rendererCountDuringReplay).toBe(1);
  expect(qa.lifecycle.rafCountDuringReplay).toBe(1);
  expect(qa.lifecycle.renderCallsPerPresentationFrame).toBeLessThanOrEqual(1);
  expect(qa.lifecycle.finalRendererCount).toBe(0);
  expect(qa.lifecycle.finalRafCount).toBe(0);
  expect(qa.lifecycle.finalStaleCanvasCount).toBe(0);
  if (OWNER_REVIEW_RUN) {
    expect(qa.performance.averageFrameMilliseconds).toBeLessThanOrEqual(50);
    expect(qa.performance.p95FrameMilliseconds).toBeLessThanOrEqual(100);
    expect(qa.performance.renderedFramesPerSecond).toBeGreaterThanOrEqual(20);
  }
  expect(afterCamera.replayReducerRunCount).toBe(beforeCamera.replayReducerRunCount);
  expect(afterCamera.checkpointRestoreCount).toBe(beforeCamera.checkpointRestoreCount);
  expect(afterCamera.replayViewModelBuildCount).toBe(beforeCamera.replayViewModelBuildCount);
  expect(afterCamera.terrainBuildCount).toBe(beforeCamera.terrainBuildCount);
  expect(afterCamera.eventListRenderCount).toBe(beforeCamera.eventListRenderCount);
  expect(cleanup.finalRendererCount).toBe(0);
  expect(compact.threeMounted).toBe(true);
  browserErrors.assertClean();
});
async function capture(page, screenshots, fileName) {
  const full = path.join(REVIEW_DIR, fileName);
  await page.screenshot({ path: full, fullPage: false });
  screenshots.push(path.join('test-results/three-r2a-owner-review', fileName).replace(/\\/g, '/'));
}

async function exerciseCameraGestures(page) {
  const box = await page.locator('.three-mission-world-canvas').boundingBox();
  expect(box).toBeTruthy();
  const x = box.x + box.width * 0.55;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + 260, y + 120, { steps: 80 });
  await page.mouse.up({ button: 'right' });
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(250);
}


async function liveReplayRendererSummary(page) {
  return page.evaluate(async () => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionReplayReviewScene');
    const { threeMissionWorldRendererSummary } = await import('/src/game/three/ThreeMissionWorldRenderer.js');
    return threeMissionWorldRendererSummary(scene?.threeReplayRenderer ?? {});
  });
}
async function cleanupSnapshot(page) {
  return page.evaluate(() => ({
    finalRendererCount: Number(window.ANCHOR_THREE_REPLAY_DEBUG?.activeRendererCount ?? 0),
    finalRafCount: Number(window.ANCHOR_THREE_REPLAY_DEBUG?.activeRafCount ?? 0),
    finalReplayObjectCount: Number(window.ANCHOR_THREE_REPLAY_DEBUG?.replayObjectCount ?? 0),
    finalTerrainObjectCount: Number(window.ANCHOR_THREE_REPLAY_DEBUG?.terrainObjectCount ?? 0),
    finalStaleCanvasCount: document.querySelectorAll('.three-mission-world-canvas').length
  }));
}

async function buildQaSummary({ page, browser, seed, middle, repeatedMiddle, terminal, beforeCamera, afterCamera, performanceSnapshot, cleanup, compact, screenshots, errors }) {
  const dpr = await page.evaluate(() => window.devicePixelRatio || 1);
  const performance = normalizePerformance(performanceSnapshot ?? terminal);
  const pageErrors = errors.filter((entry) => entry.type === 'pageerror');
  const consoleErrors = errors.filter((entry) => entry.type === 'console');
  const failedRequests = errors.filter((entry) => entry.type === 'requestfailed');
  const failures = [];
  if (performance.averageFrameMilliseconds > 50) failures.push('average frame interval exceeds 50 ms');
  if (performance.p95FrameMilliseconds > 100) failures.push('p95 frame interval exceeds 100 ms');
  if (performance.renderedFramesPerSecond < 20) failures.push('rendered FPS below 20');
  if (cleanup.finalRendererCount !== 0 || cleanup.finalRafCount !== 0 || cleanup.finalStaleCanvasCount !== 0) failures.push('replay resources not fully cleaned up');
  if (afterCamera.replayReducerRunCount !== beforeCamera.replayReducerRunCount) failures.push('camera changed replay reducer count');
  if (afterCamera.checkpointRestoreCount !== beforeCamera.checkpointRestoreCount) failures.push('camera changed checkpoint restore count');
  if (afterCamera.replayViewModelBuildCount !== beforeCamera.replayViewModelBuildCount) failures.push('camera rebuilt replay view model');
  if (afterCamera.terrainBuildCount !== beforeCamera.terrainBuildCount) failures.push('camera rebuilt terrain');
  if (afterCamera.eventListRenderCount !== beforeCamera.eventListRenderCount) failures.push('camera rerendered event list');
  if (errors.length) failures.push('browser errors were recorded');
  return {
    phase: 'THREE-R2A.1 Replay Review Acceptance',
    browser: browser.browserType().name(),
    browserVersion: browser.version(),
    primaryViewport: PRIMARY_VIEWPORT,
    compactViewport: COMPACT_VIEWPORT,
    devicePixelRatio: dpr,
    effectivePixelRatio: Number(terminal.renderer?.effectivePixelRatio ?? dpr),
    missionId: terminal.missionId ?? seed.missionId,
    resultDigest: terminal.resultDigest ?? seed.resultDigest,
    replayManifestDigest: terminal.replayManifestDigest ?? null,
    eventDigest: terminal.eventDigest ?? null,
    checkpointDigest: terminal.checkpointDigest ?? null,
    replayMode: terminal.replayMode,
    integrityStatus: terminal.integrityStatus,
    eventCount: terminal.timelineEventCount,
    checkpointCount: terminal.timelineCheckpointCount,
    agentCount: terminal.agentCount,
    controlsExercised: ['play', 'pause', 'stepForward', 'stepBack', 'nextEvent', 'previousEvent', 'nextCheckpoint', 'previousCheckpoint', 'scrubMiddle', 'scrubEnd', 'selectGlider01', 'selectGlider02', 'fleetOverview', 'sideProfile', 'returnDebrief', 'mainMenu'],
    determinism: {
      middleCursorDigest: middle.publicStateDigest,
      repeatedMiddleCursorDigest: repeatedMiddle.publicStateDigest,
      deterministic: middle.publicStateDigest === repeatedMiddle.publicStateDigest,
      reverseUsedCheckpointRestore: Number(terminal.checkpointRestoreCount ?? 0) > 0
    },
    performance,
    lifecycle: {
      rendererCountDuringReplay: Number(terminal.activeRendererCount ?? 0),
      rafCountDuringReplay: Number(terminal.activeRafCount ?? 0),
      renderCallsPerPresentationFrame: Number(terminal.renderCallsPerPresentationFrame ?? 0),
      finalRendererCount: cleanup.finalRendererCount,
      finalRafCount: cleanup.finalRafCount,
      finalReplayObjectCount: cleanup.finalReplayObjectCount,
      finalTerrainObjectCount: cleanup.finalTerrainObjectCount,
      finalStaleCanvasCount: cleanup.finalStaleCanvasCount
    },
    errors: { pageErrors, consoleErrors, failedRequests },
    screenshots,
    compact: { threeMounted: compact.threeMounted, viewport: COMPACT_VIEWPORT },
    status: failures.length ? 'FAIL' : 'PASS',
    failures
  };
}

function normalizePerformance(debug) {
  const average = Number(debug.frameIntervalAverageMilliseconds || debug.renderer?.performanceSummary?.averageFrameMilliseconds || 0);
  const p50 = Number(debug.frameIntervalP50Milliseconds || debug.renderer?.performanceSummary?.p50FrameMilliseconds || debug.renderer?.performanceSummary?.medianFrameMilliseconds || average || 0);
  const p95 = Number(debug.frameIntervalP95Milliseconds || debug.renderer?.performanceSummary?.p95FrameMilliseconds || average || 0);
  const p99 = Number(debug.frameIntervalP99Milliseconds || debug.renderer?.performanceSummary?.p99FrameMilliseconds || p95 || 0);
  const maximum = Number(debug.frameIntervalMaximumMilliseconds || debug.renderer?.performanceSummary?.maximumFrameMilliseconds || p99 || 0);
  const fps = Number(debug.renderedFramesPerSecond || debug.renderer?.performanceSummary?.renderedFramesPerSecond || (average > 0 ? 1000 / average : 0));
  return {
    averageFrameMilliseconds: average,
    p50FrameMilliseconds: p50,
    p95FrameMilliseconds: p95,
    p99FrameMilliseconds: p99,
    maximumFrameMilliseconds: maximum,
    renderedFramesPerSecond: fps,
    presentationCpuAverageMilliseconds: Number(debug.presentationCpuAverageMilliseconds ?? 0),
    rendererSubmissionAverageMilliseconds: Number(debug.rendererSubmissionAverageMilliseconds ?? 0),
    gpuTimingSupported: debug.gpuTimingSupported === true,
    gpuAverageMilliseconds: debug.gpuAverageMilliseconds ?? null
  };
}
