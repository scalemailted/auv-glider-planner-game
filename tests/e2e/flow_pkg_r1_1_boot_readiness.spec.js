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
const CORE_MISSION_SPEC_FILES = [
  "tests/e2e/product_hub_and_labs.spec.js",
  "tests/e2e/mission_planning.spec.js",
  "tests/e2e/environment_rendering.spec.js",
  "tests/e2e/workspace_and_challenge_setup.spec.js",
  "tests/e2e/simulation_and_terrain.spec.js"
];

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
  const helperText = await fs.readFile('tests/e2e/helpers/SmokeSpecShared.js', 'utf8');
  const violations = [];
  for (const file of CORE_MISSION_SPEC_FILES) {
    const text = await fs.readFile(file, 'utf8');
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].includes("await page.goto('/');")) continue;
      let sawReadiness = false;
      for (let cursor = index + 1; cursor < Math.min(lines.length, index + 8); cursor += 1) {
        if ((lines[cursor] ?? '').includes("await waitForAnchorAppReady(page, { routeId: 'main-menu' });")) {
          sawReadiness = true;
          break;
        }
      }
      if (!sawReadiness) violations.push(`${file}:${index + 1}`);
    }
  }
  expect(violations, 'every direct repo-root navigation in split E2E specs should wait for app readiness').toEqual([]);
  expect(helperText).toContain("waitForAnchorRoute(page, 'main-menu')");
  for (const file of CORE_MISSION_SPEC_FILES) {
    const text = await fs.readFile(file, 'utf8');
    expect(text).toContain("from './helpers/AnchorRuntimeReadyHarness.js'");
  }
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
  const packageDebug = await page.evaluate(() => window.ANCHOR_APP_BOOT_DEBUG?.packageModuleRequests ?? []);
  expect(packageDebug).toEqual(expect.arrayContaining(['contracts', 'bathymetry', 'currents']));
  await assertNoAnchorBootErrors(page);
});

async function assertBootContract(page, debug, { basePath }) {
  expect(debug.ready).toBe(true);
  expect(debug.currentRoute).toBe('main-menu');
  expect(debug.resolvedRuntimeShell).toBe('default');
  expect(debug.basePath).toBe(basePath);
  expect(debug.mainModuleReady).toBe(true);
  expect(debug.contractsPackageReady).toBe(true);
  expect(debug.bathymetryPackageReady).toBe(true);
  expect(debug.currentsPackageReady).toBe(true);
  expect(debug.appConstructed).toBe(true);
  expect(debug.phaserAvailable).toBe(true);
  expect(debug.phaserGameCreated).toBe(true);
  expect(debug.mainMenuSceneStarted).toBe(true);
  expect(debug.mainMenuDomCommitted).toBe(true);
  expect(debug.inputHandlersBound).toBe(true);
  expect(debug.__readyEventDispatched).toBe(true);
  expect(debug.lastFailure).toBeNull();
  expect(debug.lastFailureStage).toBeNull();
  expect(debug.durations.totalBootMs).toBeGreaterThan(0);
  await expect(page.locator('body')).toHaveAttribute('data-anchor-app-ready', 'true');
  await expect(page.locator('body')).toHaveAttribute('data-anchor-route', 'main-menu');
}

async function disableCache(page) {
  await page.route('**/*', async (route) => {
    const headers = { ...route.request().headers(), 'cache-control': 'no-cache' };
    await route.continue({ headers });
  });
}

function closeServer(serverRef) {
  return new Promise((resolve) => serverRef?.close(resolve));
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}
