import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import {
  TAMPERED_FIXTURE,
  boot,
  browserReplaySemantics,
  clickAction,
  debriefState,
  openAcceptanceReplay,
  openReplayBundle,
  reducerSemanticsAt,
  replayEventIds,
  replaySnapshot,
  scrubReplayTo,
  seedDebriefWithAcceptanceResult,
  waitForReplayReview
} from './helpers/ReplayReviewTestUtils.js';

let server;
const baseUrl = 'http://127.0.0.1:9322';

test.setTimeout(180000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9322 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Three Debrief Opens Canonical Replay Review', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page, baseUrl);
  const debrief = await seedDebriefWithAcceptanceResult(page);
  await expect(page.locator('#debrief-root')).toBeVisible();
  await expect(page.locator('#debrief-root')).toContainText('Replay Review');
  const before = await debriefState(page);
  await page.locator('#debrief-root [data-action="review-replay"]').click();
  await waitForReplayReview(page);
  await clickAction(page, 'replay-jump-terminal');
  const replay = await replaySnapshot(page);
  expect(replay.missionId).toBe(debrief.missionId);
  expect(replay.resultDigest).toBe(debrief.resultDigest);
  expect(replay.officialScore).toBe(before.officialScore);
  expect(replay.plannedRouteVisible).toBe(true);
  expect(replay.realizedTrajectoryVisible).toBe(true);
  expect(replay.terrainVisible || replay.terrainObjectCount > 0 || replay.renderer?.terrainVertexCount > 0).toBeTruthy();
  expect(replay.observationsVisible).toBe(true);
  await clickAction(page, 'return');
  await expect(page.locator('#debrief-root')).toBeVisible({ timeout: 15000 });
  const returned = await debriefState(page);
  expect(returned.resultDigest).toBe(before.resultDigest);
  expect(returned.officialScore).toBe(before.officialScore);
  await page.locator('#debrief-root [data-action="review-replay"]').click();
  await waitForReplayReview(page);
  const reopened = await replaySnapshot(page);
  expect(reopened.activeRendererCount).toBe(1);
  expect(reopened.staleCanvasCount).toBe(1);
  errors.assertClean();
});

test('Three Replay Play Pause Step and Checkpoint Navigation', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page, baseUrl);
  await openAcceptanceReplay(page);
  const initial = await replaySnapshot(page);
  expect(initial.currentEventIndex).toBe(0);
  expect(initial.publicStateDigest).toBeTruthy();
  await clickAction(page, 'replay-toggle');
  await expect.poll(async () => (await replaySnapshot(page)).publicAgentPoseDigest, { timeout: 10000 }).not.toBe(initial.publicAgentPoseDigest);
  const playing = await replaySnapshot(page);
  expect(playing.currentEventIndex).toBeGreaterThan(initial.currentEventIndex);
  expect(playing.activeTimeSeconds).toBeGreaterThanOrEqual(initial.activeTimeSeconds);
  await clickAction(page, 'replay-toggle');
  const paused = await replaySnapshot(page);
  await page.waitForTimeout(750);
  expect((await replaySnapshot(page)).currentEventIndex).toBe(paused.currentEventIndex);
  const stepBaseIndex = Math.min(paused.currentEventIndex, Math.max(0, paused.timelineEventCount - 2));
  await scrubReplayTo(page, stepBaseIndex);
  const stepBase = await replaySnapshot(page);
  await clickAction(page, 'replay-step-forward');
  const stepForward = await replaySnapshot(page);
  expect(stepForward.currentEventIndex).toBe(stepBase.currentEventIndex + 1);
  await clickAction(page, 'replay-step-back');
  const stepBack = await replaySnapshot(page);
  expect(stepBack.currentEventIndex).toBe(stepBase.currentEventIndex);
  expect(stepBack.publicStateDigest).toBe(stepBase.publicStateDigest);
  await clickAction(page, 'replay-next-event');
  const nextEvent = await replaySnapshot(page);
  expect(nextEvent.currentEventIndex).toBe(stepBack.currentEventIndex + 1);
  await clickAction(page, 'replay-prev-event');
  expect((await replaySnapshot(page)).currentEventIndex).toBe(stepBack.currentEventIndex);
  await clickAction(page, 'replay-jump-next');
  const nextCheckpoint = await replaySnapshot(page);
  expect(nextCheckpoint.currentCheckpointIndex).toBeGreaterThanOrEqual(1);
  await clickAction(page, 'replay-jump-prev');
  expect((await replaySnapshot(page)).currentCheckpointIndex).toBeLessThanOrEqual(nextCheckpoint.currentCheckpointIndex);
  await clickAction(page, 'replay-jump-terminal');
  const terminal = await replaySnapshot(page);
  expect(terminal.currentCheckpointIndex).toBe(terminal.timelineCheckpointCount - 1);
  await clickAction(page, 'replay-jump-start');
  expect((await replaySnapshot(page)).currentCheckpointIndex).toBe(0);
  for (const rate of ['0.5', '1', '2']) {
    await page.locator(`[data-rate="${rate}"]`).click();
    await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionReplayReviewScene')?.session?.playbackState?.speed ?? null)).toBe(Number(rate));
  }
  const final = await replaySnapshot(page);
  expect(final.integrityStatus).toBe('PASS');
  expect(final.usesHiddenTruthResimulation).toBe(false);
  expect(final.inversePhysicsUsed).toBe(false);
  errors.assertClean();
});

test('Three Replay Scrub Reconstructs Public State Deterministically', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page, baseUrl);
  await openAcceptanceReplay(page);
  const middleIndex = 8;
  await scrubReplayTo(page, middleIndex);
  const middle = await replaySnapshot(page);
  await clickAction(page, 'replay-jump-terminal');
  await scrubReplayTo(page, middleIndex);
  expect((await replaySnapshot(page)).publicStateDigest).toBe(middle.publicStateDigest);
  await openAcceptanceReplay(page);
  await scrubReplayTo(page, middleIndex);
  expect((await replaySnapshot(page)).publicStateDigest).toBe(middle.publicStateDigest);
  const beforeBack = await replaySnapshot(page);
  await clickAction(page, 'replay-step-back');
  const afterBack = await replaySnapshot(page);
  expect(afterBack.checkpointRestoreCount).toBeGreaterThan(beforeBack.checkpointRestoreCount);
  expect(afterBack.forwardReplayEventCount).toBeGreaterThanOrEqual(beforeBack.forwardReplayEventCount);
  expect(afterBack.inversePhysicsUsed).toBe(false);
  const beforeCamera = await replaySnapshot(page);
  await page.locator('[data-camera-preset="sideProfile"]').click();
  const afterCamera = await replaySnapshot(page);
  expect(afterCamera.publicStateDigest).toBe(beforeCamera.publicStateDigest);
  expect(afterCamera.cameraReplayInvariantStatus).toBe('PASS');
  await clickAction(page, 'reset-replay-performance');
  expect((await replaySnapshot(page)).publicStateDigest).toBe(beforeCamera.publicStateDigest);
  errors.assertClean();
});

test('Three Replay Distinguishes Planned Predicted and Realized Paths', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page, baseUrl);
  await openAcceptanceReplay(page);
  const start = await replaySnapshot(page);
  await scrubReplayTo(page, 7);
  const middle = await replaySnapshot(page);
  expect(middle.surfaceIntentVisible).toBe(true);
  expect(middle.predictedDiveVisible).toBe(true);
  expect(typeof middle.expectedCurrentAffectedVisible).toBe('boolean');
  expect(middle.realizedTrajectoryVisible).toBe(true);
  expect(middle.pathStylesDistinct).toBe(true);
  expect(middle.pathDistinctionNotColorOnly).toBe(true);
  expect(middle.launchPredictionFrozen).toBe(true);
  expect(middle.realizedTrajectoryPointCount).toBeGreaterThan(start.realizedTrajectoryPointCount);
  await scrubReplayTo(page, 2);
  const restored = await replaySnapshot(page);
  expect(restored.realizedTrajectoryPointCount).toBeLessThanOrEqual(middle.realizedTrajectoryPointCount);
  expect(restored.officialScore).toBe(start.officialScore);
  expect(restored.changesOfficialBrowserScoring).toBe(false);
  errors.assertClean();
});
test('Three Replay Shows Terrain Events and Depth Observations', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page, baseUrl);
  await openAcceptanceReplay(page);
  const initial = await replaySnapshot(page);
  await scrubReplayTo(page, 8);
  const midDive = await replaySnapshot(page);
  expect(midDive.maxGliderDepthMeters).toBeGreaterThan(initial.maxGliderDepthMeters);
  expect(midDive.depthLayerCrossingVisible).toBe(true);
  expect(midDive.bottomTurnVisible).toBe(true);
  await clickAction(page, 'replay-jump-terminal');
  const terminal = await replaySnapshot(page);
  expect(terminal.depthObservationVisible).toBe(true);
  expect(terminal.terrainClearanceVisible).toBe(true);
  expect(terminal.terrainEventsVisible).toBe(true);
  expect(terminal.targetCoverageEventVisible).toBe(true);
  expect(terminal.gliderAboveTerrain).toBe(true);
  expect(terminal.observationAboveSeabed).toBe(true);
  expect(terminal.visualInterpolationCreatesEvents).toBe(false);
  const beforeIds = await replayEventIds(page);
  await clickAction(page, 'replay-step-back');
  await clickAction(page, 'replay-step-forward');
  const afterIds = await replayEventIds(page);
  expect(afterIds.uniqueObservationIds).toBe(afterIds.observationIds.length);
  expect(afterIds.uniqueTerrainEventIds).toBe(afterIds.terrainEventIds.length);
  expect(afterIds.terrainEventIds.join('|')).toBe(beforeIds.terrainEventIds.join('|'));
  errors.assertClean();
});

test('Three Replay Supports Multi-Agent Selection', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page, baseUrl);
  await openAcceptanceReplay(page);
  await clickAction(page, 'replay-jump-terminal');
  const fleet = await replaySnapshot(page);
  expect(fleet.agentCount).toBe(2);
  expect(fleet.agentIds).toEqual(['glider-alpha', 'glider-bravo']);
  await page.locator('[data-replay-agent="glider-alpha"]').click();
  const alpha = await replaySnapshot(page);
  expect(alpha.selectedAgentId).toBe('glider-alpha');
  expect(alpha.selectedAgentPose?.agentId).toBe('glider-alpha');
  expect(alpha.realizedTrajectoryPointCount).toBeGreaterThan(0);
  await page.locator('[data-replay-agent="glider-bravo"]').click();
  const bravo = await replaySnapshot(page);
  expect(bravo.selectedAgentId).toBe('glider-bravo');
  expect(bravo.selectedAgentPose?.agentId).toBe('glider-bravo');
  expect(bravo.currentEventIndex).toBe(alpha.currentEventIndex);
  expect(bravo.activeTimeSeconds).toBe(alpha.activeTimeSeconds);
  expect(bravo.publicStateDigest).toBe(alpha.publicStateDigest);
  expect(bravo.currentCheckpointIndex).toBe(alpha.currentCheckpointIndex);
  expect(bravo.replayReducerRunCount).toBe(alpha.replayReducerRunCount);
  expect(bravo.checkpointRestoreCount).toBe(alpha.checkpointRestoreCount);
  expect(bravo.terrainBuildCount).toBe(alpha.terrainBuildCount);
  expect(bravo.replayStaticGeometryBuildCount).toBe(alpha.replayStaticGeometryBuildCount);
  await page.locator('[data-replay-agent="all"]').click();
  const all = await replaySnapshot(page);
  expect(all.selectedAgentId).toBeNull();
  expect(all.visibleAgentCount).toBe(2);
  expect(all.realizedTrajectoryObjectCount).toBeGreaterThanOrEqual(2);
  errors.assertClean();
});

test('Three Replay Rejects Tampered Checkpoint Digest', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page, baseUrl);
  await openReplayBundle(page, TAMPERED_FIXTURE);
  const debug = await replaySnapshot(page);
  expect(debug.integrityStatus).toBe('FAIL');
  expect(debug.playEnabled).toBe(false);
  await expect(page.locator('[data-action="replay-toggle"]')).toBeDisabled();
  await expect(page.locator('[data-replay-integrity-details]')).toContainText('checkpoints');
  await expect(page.locator('[data-replay-integrity-details]')).toContainText('expected');
  await expect(page.locator('[data-replay-integrity-details]')).toContainText('actual');
  expect(debug.failureCodes).toContain('REPLAY_CHECKPOINT_DIGEST_MISMATCH');
  expect(debug.usesHiddenTruthResimulation).toBe(false);
  expect(debug.hiddenTruthIncluded).toBe(false);
  expect(debug.changesOfficialBrowserScoring).toBe(false);
  errors.assertClean();
});

test('Three Replay Resources Dispose Across Scene Transitions', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page, baseUrl);
  await seedDebriefWithAcceptanceResult(page);
  await page.locator('#debrief-root [data-action="review-replay"]').click();
  await waitForReplayReview(page);
  await clickAction(page, 'return');
  await expect(page.locator('#debrief-root')).toBeVisible({ timeout: 15000 });
  let inactive = await page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG ?? {});
  expect(inactive.activeRendererCount ?? 0).toBe(0);
  expect(inactive.activeRafCount ?? 0).toBe(0);
  await page.locator('#debrief-root [data-action="review-replay"]').click();
  await waitForReplayReview(page);
  const active = await replaySnapshot(page);
  expect(active.activeRendererCount).toBe(1);
  await clickAction(page, 'menu');
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  inactive = await page.evaluate(() => ({ debug: window.ANCHOR_THREE_REPLAY_DEBUG ?? {}, canvasCount: document.querySelectorAll('.three-mission-world-canvas').length, hostCount: document.querySelectorAll('.three-mission-world-host[data-replay-review="true"]').length }));
  expect(inactive.debug.activeRendererCount ?? 0).toBe(0);
  expect(inactive.debug.activeRafCount ?? 0).toBe(0);
  expect(inactive.debug.replayObjectCount ?? 0).toBe(0);
  expect(inactive.debug.terrainObjectCount ?? 0).toBe(0);
  expect(inactive.debug.staleCanvasCount ?? inactive.canvasCount).toBe(0);
  expect(inactive.canvasCount).toBe(0);
  expect(inactive.hostCount).toBe(0);
  await openAcceptanceReplay(page);
  await clickAction(page, 'menu');
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  const final = await page.evaluate(() => ({ debug: window.ANCHOR_THREE_REPLAY_DEBUG ?? {}, canvasCount: document.querySelectorAll('.three-mission-world-canvas').length }));
  expect(final.debug.activeRendererCount ?? 0).toBe(0);
  expect(final.debug.activeRafCount ?? 0).toBe(0);
  expect(final.canvasCount).toBe(0);
  errors.assertClean();
});

test('Browser and Headless Replay Share Reducer Semantics', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page, baseUrl);
  await openAcceptanceReplay(page);
  const eventCount = await page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.timelineEventCount ?? 0);
  for (const eventIndex of [0, Math.floor(eventCount / 2), eventCount - 1]) {
    await scrubReplayTo(page, eventIndex);
    const browser = await browserReplaySemantics(page);
    const reducer = await reducerSemanticsAt(page, eventIndex);
    expect(reducer.summary.currentTick).toBe(browser.summary.currentTick);
    expect(reducer.summary.currentEventIndex).toBe(browser.summary.currentEventIndex);
    expect(reducer.summary.currentCheckpointIndex).toBe(browser.summary.currentCheckpointIndex);
    expect(reducer.summary.publicStateDigest).toBe(browser.summary.publicStateDigest);
    expect(reducer.vmSummary.realizedTrajectoryPointCount).toBe(browser.vmSummary.realizedTrajectoryPointCount);
    expect(reducer.vmSummary.observationCount).toBe(browser.vmSummary.observationCount);
    expect(reducer.vmSummary.routeFailureCount).toBe(browser.vmSummary.routeFailureCount);
    expect(reducer.vmSummary.surfacingEventCount).toBe(browser.vmSummary.surfacingEventCount);
    expect(reducer.terminal).toBe(browser.terminal);
  }
  const imports = await page.evaluate(async () => {
    const reducerModule = await import('/src/core/replay/ReplayPlaybackReducer.js');
    return { reducerVersion: reducerModule.THREE_REPLAY_PLAYBACK_REDUCER_VERSION, threeGlobalTouched: Boolean(globalThis.THREE?.WebGLRenderer) };
  });
  expect(imports.reducerVersion).toContain('r2a');
  expect(imports.threeGlobalTouched).toBe(false);
  errors.assertClean();
});
