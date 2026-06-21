import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';

let server;
const baseUrl = 'http://127.0.0.1:9322';

test.setTimeout(120000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9322 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('THREE-R2A Headless Replay Opens Three Review Scene', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await page.goto(baseUrl + '/');
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame?.phaser)), { timeout: 20000 }).toBe(true);
  await page.evaluate(() => window.anchorGame.goTo('headlessBundleViewer'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('HeadlessBundleViewerScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);

  await page.locator('[data-action="load-example-replay"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayEventCount ?? 0), { timeout: 15000 }).toBeGreaterThan(0);
  await page.locator('[data-action="open-three-replay-review"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionReplayReviewScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('.three-mission-world-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.replayMode)).toBe('publicObservationPlayback');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.usesHiddenTruthResimulation)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.changesOfficialBrowserScoring)).toBe(false);

  const before = await page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.currentEventIndex ?? -1);
  await page.locator('[data-action="replay-step-forward"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.currentEventIndex ?? -1)).toBeGreaterThan(before);
  await page.locator('[data-action="replay-jump-terminal"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.currentCheckpointIndex ?? -1)).toBeGreaterThan(0);
  errors.assertClean();
});

test('THREE-R2A Tampered Replay Review Shows Integrity Warning', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await page.goto(baseUrl + '/');
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame?.phaser)), { timeout: 20000 }).toBe(true);
  await page.evaluate(() => window.anchorGame.goTo('headlessBundleViewer'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('HeadlessBundleViewerScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);

  await page.locator('[data-action="load-tampered-replay"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replayAlignmentStatus ?? window.ANCHOR_HEADLESS_BUNDLE_DEBUG?.replaySummary?.integrityStatus ?? null), { timeout: 15000 }).not.toBeNull();
  await page.locator('[data-action="open-three-replay-review"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionReplayReviewScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('.three-mission-world-canvas')).toBeVisible();
  await expect(page.locator('[data-three-replay-review-panel]')).toBeVisible();
  await expect(page.locator('body')).toContainText('Integrity failed');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.integrityStatus)).toBe('FAIL');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.playEnabled)).toBe(false);
  await expect(page.locator('[data-action="replay-toggle"]')).toBeDisabled();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.usesHiddenTruthResimulation)).toBe(false);
  errors.assertClean();
});
