import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE_URL = 'http://127.0.0.1:9343';
test.setTimeout(240000);
test.beforeAll(async () => { server = await startStaticServer({ port: 9343 }); });
test.afterAll(async () => { await new Promise((resolve) => server?.close(resolve)); });

test('THREE-R3A Full Headed Phaser-Free Production Shell Walkthrough', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'R3A owner walkthrough is Chromium-only.');
  const out = path.join(process.cwd(), 'test-results', 'three-r3a-owner-review');
  await fs.mkdir(out, { recursive: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  const frameIntervals = [];
  await page.goto(BASE_URL + '/?runtimeShell=next');
  await expectRoute(page, 'productHub');
  await capture(page, out, '01-next-shell-product-hub.png');
  await page.locator('[data-action="open-mission-setup"]').first().click();
  await expectRoute(page, 'missionSetup');
  await capture(page, out, '02-next-shell-setup.png');
  await page.locator('[data-action="generate"]').first().click();
  await expectRoute(page, 'missionBriefing');
  await capture(page, out, '03-next-shell-briefing.png');
  await page.locator('[data-action="start-planning"]').first().click();
  await expectRoute(page, 'missionPlanning');
  await page.locator('[data-action="place-waypoint"]').first().click();
  await page.locator('[data-action="place-sampling-target"]').first().click();
  await capture(page, out, '04-next-shell-planning.png');
  await page.locator('[data-action="execute-mission"]').first().click();
  await expectRoute(page, 'missionSimulation');
  await page.evaluate(() => new Promise((resolve) => { let last = performance.now(); let count = 0; function tick(now) { window.__r3aIntervals ??= []; window.__r3aIntervals.push(now - last); last = now; count += 1; if (count < 24) requestAnimationFrame(tick); else resolve(); } requestAnimationFrame(tick); }));
  frameIntervals.push(...await page.evaluate(() => window.__r3aIntervals ?? []));
  await capture(page, out, '05-next-shell-simulation.png');
  await page.locator('[data-action="finish-mission"]').first().click();
  await expectRoute(page, 'missionDebrief');
  await capture(page, out, '06-next-shell-debrief.png');
  await page.locator('[data-action="open-replay"]').first().click();
  await expectRoute(page, 'missionReplayReview');
  await capture(page, out, '07-next-shell-replay.png');
  await page.locator('[data-action="return-replay"]').first().click();
  await page.locator('[data-action="return-main"]').first().click();
  await expectRoute(page, 'productHub');
  await page.evaluate(() => globalThis.anchorGame.dispatch('openEditor'));
  await expectRoute(page, 'missionEditor');
  await capture(page, out, '08-next-shell-editor.png');
  await page.locator('[data-action="preview-editor"]').first().click();
  await expectRoute(page, 'missionPlanning');
  await capture(page, out, '09-next-shell-editor-preview.png');
  await page.locator('[data-action="return-editor"]').first().click();
  await page.evaluate(() => globalThis.anchorGame.dispatch('returnToMainMenu'));
  await page.locator('[data-action="open-headless-viewer"]').first().click();
  await expectRoute(page, 'headlessBundleViewer');
  await capture(page, out, '10-next-shell-headless-viewer.png');
  await page.locator('[data-action="return-main"]').first().click();
  await page.locator('[data-action="open-legacy-lab"]').first().click();
  await expectRoute(page, 'legacyLearningLab');
  await expect.poll(() => page.evaluate(() => globalThis.ANCHOR_LEGACY_ISLAND_DEBUG?.active === true)).toBe(true);
  await capture(page, out, '11-next-shell-legacy-lab.png');
  await page.locator('[data-action="return-main"]').first().click();
  await expectRoute(page, 'productHub');
  await capture(page, out, '12-next-shell-main-menu-cleanup.png');
  await page.setViewportSize({ width: 1366, height: 768 });
  await capture(page, out, '13-next-shell-compact-layout.png');
  await page.keyboard.press('Tab');
  await capture(page, out, '14-next-shell-keyboard-focus.png');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await capture(page, out, '15-next-shell-reduced-motion.png');
  const debug = await page.evaluate(() => globalThis.ANCHOR_PRODUCTION_SHELL_DEBUG);
  const metrics = summarizeIntervals(frameIntervals);
  const summary = { browser: browserName, viewports: ['1920x1080', '1366x768'], dpr: await page.evaluate(() => devicePixelRatio), runtimeSelection: await page.evaluate(() => globalThis.ANCHOR_RUNTIME_SELECTION_DEBUG), phaserRequestOrInstanceCounts: { activePhaserGameCount: debug.activePhaserGameCount, legacyIslandCount: debug.activeLegacyIslandCount }, routeSequence: debug.lifecycle?.routeHistory ?? [], canonicalDigests: { planDigest: debug.planDigest, resultDigest: debug.resultDigest, replayDigest: debug.replayDigest, editorDocumentDigest: debug.editorDocumentDigest }, accessibilitySummary: await page.evaluate(() => globalThis.ANCHOR_ACCESSIBILITY_DEBUG), performanceSummary: metrics, lifecycleResourceSummary: debug, errors, screenshotList: ['01-next-shell-product-hub.png', '02-next-shell-setup.png', '03-next-shell-briefing.png', '04-next-shell-planning.png', '05-next-shell-simulation.png', '06-next-shell-debrief.png', '07-next-shell-replay.png', '08-next-shell-editor.png', '09-next-shell-editor-preview.png', '10-next-shell-headless-viewer.png', '11-next-shell-legacy-lab.png', '12-next-shell-main-menu-cleanup.png', '13-next-shell-compact-layout.png', '14-next-shell-keyboard-focus.png', '15-next-shell-reduced-motion.png'], status: errors.length ? 'FAIL' : 'PASS', failures: errors };
  await fs.writeFile(path.join(out, 'qa-summary.json'), JSON.stringify(summary, null, 2));
  expect(errors).toEqual([]);
  expect(debug.activeThreeRendererCount).toBe(0);
  expect(debug.activeThreeRafCount).toBe(0);
  expect(debug.activePhaserGameCount).toBe(0);
  expect(metrics.average).toBeLessThanOrEqual(50);
  expect(metrics.p95).toBeLessThanOrEqual(100);
  expect(metrics.fps).toBeGreaterThanOrEqual(20);
});

async function capture(page, out, name) { await page.screenshot({ path: path.join(out, name), fullPage: false }); }
async function expectRoute(page, route) { await expect.poll(async () => (await page.evaluate(() => globalThis.ANCHOR_PRODUCTION_SHELL_DEBUG?.activeRoute))).toBe(route); }
function summarizeIntervals(values) { const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b); const avg = list.reduce((s, v) => s + v, 0) / Math.max(1, list.length); const at = (p) => list[Math.min(list.length - 1, Math.max(0, Math.floor((list.length - 1) * p)))] ?? 0; return { average: round(avg), p50: round(at(.5)), p95: round(at(.95)), p99: round(at(.99)), max: round(list.at(-1) ?? 0), fps: round(1000 / Math.max(1, avg)) }; }
function round(value) { return Math.round(Number(value) * 1000) / 1000; }



