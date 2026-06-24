import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import net from 'node:net';
import { startStaticServer } from './static-server.mjs';
import {
  assertNoAnchorBootErrors,
  installAnchorRuntimeErrorCollectors,
  waitForAnchorAppReady,
  waitForAnchorRoute
} from './helpers/AnchorRuntimeReadyHarness.js';

let server;
const PORT = 9392;
const BASE = `http://127.0.0.1:${PORT}`;

test.setTimeout(240000);
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  server = await startStaticServer({ port: PORT });
});

test.afterAll(async () => {
  await closeServer(server);
});

test('Cold Repo Root Boot Reaches Main Menu Through Package Modules', async ({ page }) => {
  installAnchorRuntimeErrorCollectors(page);
  await disableCache(page);
  const debug = await waitForAnchorAppReady(page, { url: `${BASE}/`, routeId: 'main-menu' });
  await assertBootContract(page, debug, { basePath: '/' });
  expect(debug.packageModuleRequests).toEqual(expect.arrayContaining(['contracts', 'bathymetry', 'currents']));
  expect(debug.contractsPackageReady).toBe(true);
  expect(debug.bathymetryPackageReady).toBe(true);
  expect(debug.currentsPackageReady).toBe(true);
  await expect(page.locator('#main-menu-hub')).toContainText('ANCHOR: Glider Command');
  await assertNoAnchorBootErrors(page);
});

test('Cold Pages Subpath Boot Reaches Main Menu Through Package Modules', async ({ page }) => {
  installAnchorRuntimeErrorCollectors(page);
  await disableCache(page);
  const debug = await waitForAnchorAppReady(page, { url: `${BASE}/auv-glider-planner-game/`, routeId: 'main-menu' });
  await assertBootContract(page, debug, { basePath: '/auv-glider-planner-game/' });
  expect(debug.packageModuleRequests).toEqual(expect.arrayContaining(['contracts', 'bathymetry', 'currents']));
  const probes = await page.evaluate(async () => {
    const paths = ['/vendor/phaser.min.js', '/vendor/three/build/three.module.js', '/packages/contracts/src/index.js', '/packages/bathymetry/src/index.js', '/packages/currents/src/index.js'];
    const rows = [];
    for (const path of paths) {
      const response = await fetch(path, { cache: 'no-store' });
      rows.push({ path, status: response.status, type: response.headers.get('content-type') ?? '' });
    }
    return rows;
  });
  for (const probe of probes) {
    expect(probe.status, `${probe.path} should load`).toBe(200);
    expect(probe.type, `${probe.path} should be JavaScript`).toContain('text/javascript');
  }
  await assertNoAnchorBootErrors(page);
});

test('Core Mission Tests Use the Production Readiness Contract', async () => {
  const text = await fs.readFile('tests/e2e/smoke.spec.js', 'utf8');
  const lines = text.split(/\r?\n/);
  const violations = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/await page\.goto\('\/'\);/.test(lines[index])) continue;
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim() === '') cursor += 1;
    if (!/await waitForAnchorAppReady\(page, \{ routeId: 'main-menu' \}\);/.test(lines[cursor] ?? '')) {
      violations.push(`tests/e2e/smoke.spec.js:${index + 1}`);
    }
  }
  expect(violations, 'every direct repo-root navigation in smoke.spec.js should wait for app readiness').toEqual([]);
  expect(text).toContain("import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';");
  expect(text).toContain("await waitForAnchorRoute(page, 'main-menu');");
});

test('Main Menu Boot Does Not Generate Mission Science', async ({ page }) => {
  installAnchorRuntimeErrorCollectors(page);
  await disableCache(page);
  await waitForAnchorAppReady(page, { url: `${BASE}/`, routeId: 'main-menu' });
  const lazy = await page.evaluate(() => ({
    bathymetryGenerationCount: window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.artifactBuildCount ?? window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.generationCount ?? 0,
    currentCubeBuildCount: window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentCubeBuildCount ?? window.ANCHOR_SIMULATION_LAUNCH_DEBUG?.currentCubeBuildCount ?? 0,
    currentSamplerCreateCount: window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentSamplerCreateCount ?? window.ANCHOR_SIMULATION_LAUNCH_DEBUG?.currentSamplerCreateCount ?? 0,
    threeRendererCount: window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? window.ANCHOR_PRODUCTION_SHELL_DEBUG?.activeThreeRendererCount ?? 0,
    simulationEngineCount: (window.ANCHOR_SIMULATION_RENDER_DEBUG || window.ANCHOR_SIMULATION_LAUNCH_DEBUG) ? 1 : 0,
    missionRenderDebugPresent: Boolean(window.ANCHOR_MISSION_RENDER_DEBUG),
    currentPresentationDebugPresent: Boolean(window.ANCHOR_CURRENT_PRESENTATION_DEBUG),
    simulationDebugPresent: Boolean(window.ANCHOR_SIMULATION_RENDER_DEBUG || window.ANCHOR_SIMULATION_LAUNCH_DEBUG)
  }));
  expect(lazy).toMatchObject({
    bathymetryGenerationCount: 0,
    currentCubeBuildCount: 0,
    currentSamplerCreateCount: 0,
    threeRendererCount: 0,
    simulationEngineCount: 0,
    missionRenderDebugPresent: false,
    currentPresentationDebugPresent: false,
    simulationDebugPresent: false
  });
  await assertNoAnchorBootErrors(page);
});

test('Repeated App Boot and Teardown Leave No Runtime Processes', async ({ browser }) => {
  for (let index = 0; index < 3; index += 1) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    installAnchorRuntimeErrorCollectors(page);
    const debug = await waitForAnchorAppReady(page, { url: `${BASE}/`, routeId: 'main-menu' });
    await assertBootContract(page, debug, { basePath: '/' });
    const counts = await page.evaluate(() => ({
      appRootCount: document.querySelectorAll('#game-root').length,
      hubCount: document.querySelectorAll('#main-menu-hub').length,
      canvasCount: document.querySelectorAll('#game-root canvas').length,
      phaserGameCount: window.anchorGame?.phaser ? 1 : 0,
      duplicateBootCount: window.ANCHOR_APP_BOOT_DEBUG?.duplicateBootCount ?? 0
    }));
    expect(counts).toEqual({ appRootCount: 1, hubCount: 1, canvasCount: 1, phaserGameCount: 1, duplicateBootCount: 0 });
    await assertNoAnchorBootErrors(page);
    await context.close();
  }
  expect(await portOpen(PORT)).toBe(true);
});

test('Current Package Loads After Stable Main Menu Boot', async ({ page }) => {
  installAnchorRuntimeErrorCollectors(page);
  await waitForAnchorAppReady(page, { url: `${BASE}/`, routeId: 'main-menu' });
  await waitForAnchorRoute(page, 'main-menu');
  await page.locator('[data-hub-view="challenge"]').first().click();
  await page.locator('[data-action="play-challenge"]').first().click();
  await expect(page.locator('[data-action="generate"]').first()).toBeVisible({ timeout: 30000 });
  await page.locator('[data-action="generate"]').first().click();
  await expect(page.locator('#bottom-timeline [data-action="time-slider"]')).toBeVisible({ timeout: 30000 });
  const allLayerButton = page.locator('#waypoint-timeline [data-action="water-column-current-mode"][data-mode="allLayers"]').first();
  if (await allLayerButton.count()) await allLayerButton.click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentPackageVersion), { timeout: 30000 }).toBe('anchor-currents-flow-pkg-r1');
  const before = await currentSnapshot(page);
  await page.locator('#bottom-timeline [data-action="window-next"]').click();
  await expect.poll(async () => {
    const after = await currentSnapshot(page);
    return after.time !== before.time && after.renderDigest !== before.renderDigest && after.artifactDigest === before.artifactDigest;
  }, { timeout: 30000 }).toBe(true);
  const boot = await page.evaluate(() => window.ANCHOR_APP_BOOT_DEBUG ?? null);
  expect(boot.duplicateBootCount).toBe(0);
  await assertNoAnchorBootErrors(page);
});

async function disableCache(page) {
  await page.context().setExtraHTTPHeaders({ 'Cache-Control': 'no-store' });
}

async function assertBootContract(page, debug, { basePath }) {
  expect(debug.version).toBe('flow-pkg-r1-1-app-boot-readiness');
  expect(debug.ready).toBe(true);
  expect(debug.currentRoute).toBe('main-menu');
  expect(debug.basePath).toBe(basePath);
  expect(debug.bootAttemptCount).toBe(1);
  expect(debug.duplicateBootCount).toBe(0);
  expect(debug.mainModuleReady).toBe(true);
  expect(debug.appConstructed).toBe(true);
  expect(debug.phaserAvailable).toBe(true);
  expect(debug.phaserGameCreated).toBe(true);
  expect(debug.mainMenuSceneStarted).toBe(true);
  expect(debug.mainMenuDomCommitted).toBe(true);
  expect(debug.inputHandlersBound).toBe(true);
  expect(debug.lastFailure).toBeNull();
  await expect(page.locator('[data-anchor-app-ready="true"][data-anchor-route="main-menu"]').first()).toHaveCount(1);
  const counts = await page.evaluate(() => ({
    rootCount: document.querySelectorAll('#game-root').length,
    menuCount: document.querySelectorAll('#main-menu-hub').length,
    canvasCount: document.querySelectorAll('#game-root canvas').length
  }));
  expect(counts).toEqual({ rootCount: 1, menuCount: 1, canvasCount: 1 });
}

async function currentSnapshot(page) {
  return page.evaluate(() => {
    const debug = window.ANCHOR_CURRENT_PRESENTATION_DEBUG ?? {};
    return {
      time: debug.currentPresentationTimeSeconds ?? null,
      renderDigest: debug.renderSampleDigest ?? null,
      artifactDigest: debug.currentArtifactDigest ?? null,
      visibleInstances: debug.visibleVectorInstanceCount ?? 0,
      packageVersion: debug.currentPackageVersion ?? null
    };
  });
}

function closeServer(activeServer) {
  if (!activeServer) return Promise.resolve();
  return new Promise((resolve, reject) => activeServer.close((error) => error ? reject(error) : resolve()));
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(250);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
  });
}