import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE_URL = 'http://127.0.0.1:9341';
test.setTimeout(180000);

test.beforeAll(async () => { server = await startStaticServer({ port: 9341 }); });
test.afterAll(async () => { await new Promise((resolve) => server?.close(resolve)); });

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.__r3aErrors = errors;
});

test('Next Shell Product Hub Preserves Production Content and Styling', async ({ page }) => {
  const phaserRequests = [];
  page.on('request', (request) => { if (/phaser\.min\.js/i.test(request.url())) phaserRequests.push(request.url()); });
  await gotoNext(page);
  await expect(page.locator('#main-menu-hub')).toContainText('ANCHOR: Glider Command');
  await expect(page.locator('#main-menu-hub')).toContainText('Challenge Mode');
  await expect(page.locator('#main-menu-hub')).toContainText('Simulation Lab');
  await expect(page.locator('#main-menu-hub')).toContainText('Learning Labs');
  await expect(page.locator('#main-menu-hub [data-action="open-import-export"]').first()).toBeVisible();
  await expect(page.locator('#main-menu-hub [data-action="open-headless-viewer"]').first()).toBeVisible();
  await expect(page.locator('#mission-console')).toContainText('Production Shell');
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Context');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  const debug = await productionDebug(page);
  expect(debug.activeRoute).toBe('productHub');
  expect(debug.activePhaserGameCount).toBe(0);
  expect(phaserRequests).toEqual([]);
  expect(await routeRootCount(page)).toBe(1);
  expect(page.__r3aErrors).toEqual([]);
});

test('Next Shell Preserves Setup Briefing Planning Simulation and Debrief', async ({ page }) => {
  await gotoNext(page);
  await page.locator('[data-action="open-mission-setup"]').first().click();
  await expectRoute(page, 'missionSetup');
  await page.locator('[data-action="generate"]').first().click();
  await expectRoute(page, 'missionBriefing');
  await page.locator('[data-action="start-planning"]').first().click();
  await expectRoute(page, 'missionPlanning');
  await expect(page.locator('canvas.three-mission-world-canvas')).toHaveCount(1);
  await page.locator('[data-action="execute-mission"]').first().click();
  await expectRoute(page, 'missionSimulation');
  await page.locator('[data-action="finish-mission"]').first().click();
  await expectRoute(page, 'missionDebrief');
  const debug = await productionDebug(page);
  expect(debug.missionId).toBe('three_r3a_parity_mission');
  expect(debug.planDigest).toBeTruthy();
  expect(debug.resultDigest).toBeTruthy();
  expect(debug.activePhaserGameCount).toBe(0);
  expect(await routeRootCount(page)).toBe(1);
  expect(page.__r3aErrors).toEqual([]);
});

test('Next Shell Reuses Canonical Three Replay and Mission Editor', async ({ page }) => {
  await runToDebrief(page);
  const debriefDigest = await productionDebug(page);
  await page.locator('[data-action="open-replay"]').first().click();
  await expectRoute(page, 'missionReplayReview');
  await expect(page.locator('canvas.three-mission-world-canvas')).toHaveCount(1);
  await page.locator('[data-action="return-replay"]').first().click();
  await expectRoute(page, 'missionDebrief');
  await page.locator('[data-action="return-main"]').first().click();
  await expectRoute(page, 'productHub');
  await page.evaluate(() => globalThis.anchorGame.dispatch('openEditor'));
  await expectRoute(page, 'missionEditor');
  await page.locator('[data-action="editor-edit"]').first().click();
  const editorDigest = (await productionDebug(page)).editorDocumentDigest;
  await page.locator('[data-action="preview-editor"]').first().click();
  await expectRoute(page, 'missionPlanning');
  await page.locator('[data-action="return-editor"]').first().click();
  await expectRoute(page, 'missionEditor');
  expect((await productionDebug(page)).editorDocumentDigest).toBe(editorDigest);
  expect((await productionDebug(page)).replayDigest).toBe(debriefDigest.replayDigest);
  expect(page.__r3aErrors).toEqual([]);
});

test('Next Shell Route Transitions Dispose Previous View', async ({ page }) => {
  await gotoNext(page);
  for (const command of ['openMissionSetup', 'loadMission', 'startPlanning', 'executeMission', 'finishMission', 'openReplayReview', 'returnFromReplay', 'returnToMainMenu', 'openEditor', 'returnToMainMenu']) {
    await page.evaluate((cmd) => globalThis.anchorGame.dispatch(cmd), command);
    await expect.poll(() => routeRootCount(page)).toBe(1);
    const debug = await productionDebug(page);
    expect(debug.staleRouteRootCount).toBe(0);
  }
  expect(page.__r3aErrors).toEqual([]);
});

test('Next Shell Import Export and Headless Viewer Preserve Tool Behavior', async ({ page }) => {
  await gotoNext(page);
  await page.locator('[data-action="open-import-export"]').first().click();
  await expectRoute(page, 'importExport');
  await page.locator('[data-action="import-invalid"]').first().click();
  await expect(page.locator('#next-shell-import-status')).toContainText('Invalid JSON');
  await page.locator('[data-action="return-main"]').first().click();
  await page.locator('[data-action="open-headless-viewer"]').first().click();
  await expectRoute(page, 'headlessBundleViewer');
  await expect(page.locator('body')).toContainText('Headless Bundle Viewer');
  await page.locator('[data-action="load-example-bundle"]').first().click();
  await expect.poll(async () => (await productionDebug(page))?.activeRoute).toBe('headlessBundleViewer');
  expect(page.__r3aErrors).toEqual([]);
});

test('Next Shell Supports Keyboard Route and Mission Control', async ({ page }) => {
  await gotoNext(page);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await productionDebug(page))?.activeRoute).not.toBe('productHub');
  await page.evaluate(() => globalThis.anchorGame.dispatch('loadMission'));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.evaluate(() => globalThis.anchorGame.dispatch('startPlanning'));
  await expectRoute(page, 'missionPlanning');
  await page.keyboard.press('Escape');
  const mode = await page.evaluate(() => globalThis.anchorGame.sessionStore.state.gameState.ui.placementMode);
  expect(mode).toBe('select');
  expect(page.__r3aErrors).toEqual([]);
});

test('Next Shell Honors Reduced Motion Without Changing Mission Outcomes', async ({ page }) => {
  await gotoNext(page);
  await runToDebrief(page);
  const normal = await productionDebug(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoNext(page);
  await runToDebrief(page);
  const reduced = await productionDebug(page);
  expect(reduced.planDigest).toBe(normal.planDigest);
  expect(reduced.resultDigest).toBe(normal.resultDigest);
  expect(reduced.replayDigest).toBe(normal.replayDigest);
  expect((await page.evaluate(() => globalThis.ANCHOR_ACCESSIBILITY_DEBUG?.reducedMotionPreferred))).toBe(true);
});

test('Next Shell Runs From GitHub Pages Subpath Without Phaser', async ({ page }) => {
  const phaserRequests = [];
  page.on('request', (request) => { if (/phaser\.min\.js/i.test(request.url())) phaserRequests.push(request.url()); });
  await page.goto(BASE_URL + '/auv-glider-planner-game/?runtimeShell=next');
  await expectRoute(page, 'productHub');
  await page.locator('[data-action="open-mission-setup"]').first().click();
  await page.locator('[data-action="generate"]').first().click();
  await page.locator('[data-action="start-planning"]').first().click();
  await expectRoute(page, 'missionPlanning');
  expect(phaserRequests).toEqual([]);
});

test('Next Shell Loads Legacy Learning Lab Only On Demand', async ({ page }) => {
  const phaserRequests = [];
  page.on('request', (request) => { if (/phaser\.min\.js/i.test(request.url())) phaserRequests.push(request.url()); });
  await gotoNext(page);
  expect((await productionDebug(page)).activePhaserGameCount).toBe(0);
  await page.locator('[data-action="open-legacy-lab"]').first().click();
  await expectRoute(page, 'legacyLearningLab');
  await expect.poll(async () => (await page.evaluate(() => globalThis.ANCHOR_LEGACY_ISLAND_DEBUG?.active === true))).toBe(true);
  expect(phaserRequests.length).toBe(1);
  await page.locator('[data-action="return-main"]').first().click();
  await expectRoute(page, 'productHub');
  await expect.poll(async () => (await productionDebug(page)).activePhaserGameCount).toBe(0);
});

async function gotoNext(page) {
  await page.goto(BASE_URL + '/?runtimeShell=next');
  await expectRoute(page, 'productHub');
}
async function runToDebrief(page) {
  await gotoNext(page);
  await page.locator('[data-action="open-mission-setup"]').first().click();
  await page.locator('[data-action="generate"]').first().click();
  await page.locator('[data-action="start-planning"]').first().click();
  await page.locator('[data-action="execute-mission"]').first().click();
  await page.locator('[data-action="finish-mission"]').first().click();
  await expectRoute(page, 'missionDebrief');
}
async function expectRoute(page, route) {
  await expect.poll(async () => (await productionDebug(page))?.activeRoute).toBe(route);
  await expect(page.locator('#next-shell-route-heading')).toBeVisible();
}
async function productionDebug(page) {
  return page.evaluate(() => globalThis.ANCHOR_PRODUCTION_SHELL_DEBUG ?? null);
}
async function routeRootCount(page) {
  return page.evaluate(() => document.querySelectorAll('[data-next-shell-route-root]').length);
}




