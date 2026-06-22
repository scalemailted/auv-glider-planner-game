import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, normalize, resolve } from 'node:path';

import { chromium } from 'playwright';

const repoName = 'auv-glider-planner-game';
const basePath = `/${repoName}/`;
const root = process.cwd();
const siteRoot = resolve(root, '_site');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.wasm': 'application/wasm'
};

const build = spawnSync(process.execPath, ['tools/js/build_github_pages.mjs'], { cwd: root, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
if (!existsSync(resolve(siteRoot, 'index.html'))) throw new Error('_site/index.html missing after build.');

const server = createPagesLikeServer(siteRoot);
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}${basePath}`;
const browser = await chromium.launch();
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
const failedResponses = [];
const nodeModuleRequests = [];
const externalThreeRequests = [];
let vendorThreeRequestSeen = false;
let page = null;

try {
  page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/vendor/three/build/three.module.js')) vendorThreeRequestSeen = true;
    if (url.includes('/node_modules/')) nodeModuleRequests.push(url);
    if (/^https?:\/\//i.test(url) && !url.startsWith(`http://127.0.0.1:${address.port}/`) && /three|cdn|unpkg|jsdelivr|esm\.sh|skypack/i.test(url)) {
      externalThreeRequests.push(url);
    }
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.endsWith('/favicon.ico')) failedRequests.push(`${request.failure()?.errorText ?? 'failed'} ${url}`);
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.endsWith('/favicon.ico')) failedResponses.push(`${response.status()} ${url}`);
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#main-menu-hub', { timeout: 15_000 });
  const deployment = await page.evaluate(() => globalThis.ANCHOR_DEPLOYMENT_DEBUG ?? null);
  assert.equal(deployment?.deploymentMode, 'static-import-map', 'deployment debug mode');
  assert.equal(deployment?.threeRuntimeSource, './vendor/three/build/three.module.js', 'deployment debug Three source');
  assert.equal(deployment?.threeVendored, true, 'deployment debug marks vendored Three');
  assert.equal(deployment?.nodeModulesRuntimeDependency, false, 'deployment debug excludes node_modules runtime dependency');
  assert.equal(deployment?.externalThreeCdn, false, 'deployment debug excludes Three CDN dependency');
  assert.equal(deployment?.githubPagesCompatible, true, 'deployment debug marks Pages compatibility');

  await page.locator('#main-menu-hub [data-hub-view="simulation"]').first().click();
  await page.locator('#main-menu-hub [data-action="bathymetry-world-view"]').first().click();
  await page.waitForFunction(() => globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesThreeRenderer === true, null, { timeout: 15_000 });
  await page.waitForSelector('.three-bathymetry-canvas', { timeout: 15_000 });
  const bathymetry = await page.evaluate(() => ({
    usesThreeRenderer: globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesThreeRenderer === true,
    rendererBackend: globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.rendererBackend,
    terrainVertexCount: globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.terrainVertexCount ?? 0
  }));
  assert.equal(bathymetry.usesThreeRenderer, true, 'bathymetry view uses Three renderer');
  assert.equal(bathymetry.rendererBackend, 'three', 'bathymetry debug renderer backend');
  assert.ok(bathymetry.terrainVertexCount > 0, 'bathymetry exposes terrain vertices');

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#main-menu-hub', { timeout: 15_000 });
  await page.evaluate(() => globalThis.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await page.waitForFunction(() => globalThis.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys?.isActive?.() === true, null, { timeout: 15_000 });
  await page.evaluate(() => globalThis.anchorGame.phaser.scene.getScene('MissionBriefingScene').startPlanning());
  await page.waitForSelector('.three-mission-world-canvas', { timeout: 15_000 });
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d' && globalThis.ANCHOR_MISSION_RENDER_DEBUG?.threeMounted === true, null, { timeout: 15_000 });
  assert.equal(await page.locator('#mission-console [data-action="renderer-legacy"]').count(), 0, 'normal planning UI hides legacy renderer control');
  const mission = await page.evaluate(() => ({
    activeBackend: globalThis.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend,
    threeMounted: globalThis.ANCHOR_MISSION_RENDER_DEBUG?.threeMounted === true,
    rendererSummary: globalThis.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary ?? null
  }));
  assert.equal(mission.activeBackend, 'threeMission3d', 'mission renderer backend');
  assert.equal(mission.threeMounted, true, 'mission Three renderer mounted');
  assert.equal(mission.rendererSummary?.threeAvailable, true, 'mission renderer summary marks Three available');

  const nextRuntime = await smokeNextRuntime(browser, baseUrl, address.port);
  await page.close();
  assert.equal(vendorThreeRequestSeen, true, 'browser requested vendored Three module');
  assert.deepEqual(nodeModuleRequests, [], 'browser made no node_modules requests');
  assert.deepEqual(externalThreeRequests, [], 'browser made no external Three/CDN requests');
  assert.deepEqual(failedRequests, [], 'browser request failures');
  assert.deepEqual(failedResponses, [], 'browser HTTP error responses');
  assert.deepEqual(pageErrors, [], 'browser page errors');
  assert.deepEqual(consoleErrors, [], 'browser console errors');
  console.log('smoke_github_pages_static_host: ok', { baseUrl, deployment, bathymetry, missionBackend: mission.activeBackend, nextRuntime });
} catch (error) {
  let bodyText = '';
  try {
    bodyText = page ? (await page.locator('body').innerText({ timeout: 1000 })).slice(0, 2000) : '';
  } catch {
    bodyText = '<unavailable>';
  }
  console.error('smoke_github_pages_static_host diagnostics:', {
    pageUrl: page?.url?.() ?? null,
    vendorThreeRequestSeen,
    nodeModuleRequests,
    externalThreeRequests,
    failedRequests,
    failedResponses,
    pageErrors,
    consoleErrors,
    bodyText
  });
  throw error;
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

async function smokeNextRuntime(browser, baseUrl, port) {
  const nextPage = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const failedResponses = [];
  const nodeModuleRequests = [];
  const externalThreeRequests = [];
  const phaserRequests = [];

  nextPage.on('pageerror', (error) => pageErrors.push(error.message));
  nextPage.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  nextPage.on('request', (request) => {
    const url = request.url();
    if (/phaser\.min\.js/i.test(url)) phaserRequests.push(url);
    if (url.includes('/node_modules/')) nodeModuleRequests.push(url);
    if (/^https?:\/\//i.test(url) && !url.startsWith(`http://127.0.0.1:${port}/`) && /three|cdn|unpkg|jsdelivr|esm\.sh|skypack/i.test(url)) {
      externalThreeRequests.push(url);
    }
  });
  nextPage.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.endsWith('/favicon.ico')) failedRequests.push(`${request.failure()?.errorText ?? 'failed'} ${url}`);
  });
  nextPage.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.endsWith('/favicon.ico')) failedResponses.push(`${response.status()} ${url}`);
  });

  try {
    await nextPage.goto(`${baseUrl}?runtimeShell=next`, { waitUntil: 'domcontentloaded' });
    await nextPage.waitForFunction(() => globalThis.ANCHOR_PRODUCTION_SHELL_DEBUG?.activeRoute === 'productHub', null, { timeout: 15_000 });
    await nextPage.waitForSelector('#main-menu-hub', { timeout: 15_000 });
    await nextPage.locator('[data-action="open-mission-setup"]').first().click();
    await nextPage.waitForFunction(() => globalThis.ANCHOR_PRODUCTION_SHELL_DEBUG?.activeRoute === 'missionSetup', null, { timeout: 15_000 });
    await nextPage.locator('[data-action="generate"]').first().click();
    await nextPage.waitForFunction(() => globalThis.ANCHOR_PRODUCTION_SHELL_DEBUG?.activeRoute === 'missionBriefing', null, { timeout: 15_000 });
    await nextPage.locator('[data-action="start-planning"]').first().click();
    await nextPage.waitForFunction(() => globalThis.ANCHOR_PRODUCTION_SHELL_DEBUG?.activeRoute === 'missionPlanning', null, { timeout: 15_000 });
    await nextPage.waitForSelector('canvas.three-mission-world-canvas', { timeout: 15_000 });
    await nextPage.locator('[data-action="execute-mission"]').first().click();
    await nextPage.waitForFunction(() => globalThis.ANCHOR_PRODUCTION_SHELL_DEBUG?.activeRoute === 'missionSimulation', null, { timeout: 15_000 });

    const summary = await nextPage.evaluate(() => ({
      runtime: globalThis.ANCHOR_RUNTIME_SELECTION_DEBUG ?? null,
      shell: globalThis.ANCHOR_PRODUCTION_SHELL_DEBUG ?? null,
      accessibility: globalThis.ANCHOR_ACCESSIBILITY_DEBUG ?? null,
      routeRootCount: document.querySelectorAll('[data-next-shell-route-root]').length,
      threeCanvasCount: document.querySelectorAll('canvas.three-mission-world-canvas').length
    }));
    assert.equal(summary.runtime?.resolvedRuntime, 'next', 'Pages next runtime resolves next shell');
    assert.equal(summary.runtime?.loadedPhaser, false, 'Pages next runtime does not load Phaser');
    assert.equal(summary.runtime?.instantiatedPhaser, false, 'Pages next runtime does not instantiate Phaser');
    assert.equal(summary.runtime?.loadedThree, true, 'Pages next runtime loads Three');
    assert.equal(summary.shell?.activeRoute, 'missionSimulation', 'Pages next runtime reaches simulation');
    assert.equal(summary.shell?.activePhaserGameCount, 0, 'Pages next runtime has no Phaser game instances');
    assert.equal(summary.routeRootCount, 1, 'Pages next runtime keeps one route root');
    assert.equal(summary.threeCanvasCount, 1, 'Pages next runtime mounts one Three mission canvas');
    assert.deepEqual(phaserRequests, [], 'Pages next runtime made no Phaser requests');
    assert.deepEqual(nodeModuleRequests, [], 'Pages next runtime made no node_modules requests');
    assert.deepEqual(externalThreeRequests, [], 'Pages next runtime made no external Three/CDN requests');
    assert.deepEqual(failedRequests, [], 'Pages next runtime request failures');
    assert.deepEqual(failedResponses, [], 'Pages next runtime HTTP error responses');
    assert.deepEqual(pageErrors, [], 'Pages next runtime page errors');
    assert.deepEqual(consoleErrors, [], 'Pages next runtime console errors');
    return {
      route: summary.shell?.activeRoute ?? null,
      loadedPhaser: summary.runtime?.loadedPhaser ?? null,
      instantiatedPhaser: summary.runtime?.instantiatedPhaser ?? null,
      loadedThree: summary.runtime?.loadedThree ?? null,
      routeRootCount: summary.routeRootCount,
      threeCanvasCount: summary.threeCanvasCount
    };
  } finally {
    await nextPage.close();
  }
}
function createPagesLikeServer(staticRoot) {
  const rootResolved = resolve(staticRoot);
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === `/${repoName}`) {
      response.writeHead(302, { Location: basePath });
      response.end();
      return;
    }
    if (!url.pathname.startsWith(basePath)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const relativeRequest = decodeURIComponent(url.pathname.slice(basePath.length)) || 'index.html';
    const normalized = normalize(relativeRequest.endsWith('/') ? `${relativeRequest}index.html` : relativeRequest);
    const filePath = resolve(rootResolved, normalized);
    if (!filePath.startsWith(`${rootResolved}\\`) && !filePath.startsWith(`${rootResolved}/`) && filePath !== rootResolved) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
      Connection: 'close'
    });
    createReadStream(filePath).pipe(response);
  });
  const close = server.close.bind(server);
  server.close = (callback) => {
    server.closeAllConnections?.();
    return close(callback);
  };
  return server;
}
