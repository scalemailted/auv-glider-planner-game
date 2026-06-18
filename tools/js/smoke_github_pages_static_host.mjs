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
let lazyPhaserRequestSeen = false;
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
    if (url.includes('/vendor/phaser.min.js')) lazyPhaserRequestSeen = true;
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

  const initialRuntime = await page.evaluate(() => ({
    route: globalThis.ANCHOR_APP_RUNTIME_DEBUG?.route?.currentRoute?.id,
    normalRoutesInstantiatePhaser: globalThis.ANCHOR_APP_RUNTIME_DEBUG?.normalRoutesInstantiatePhaser,
    phaserLoaded: Boolean(globalThis.Phaser)
  }));
  assert.equal(initialRuntime.route, 'mainMenu', 'DOM runtime starts on main menu route');
  assert.equal(initialRuntime.normalRoutesInstantiatePhaser, false, 'normal routes do not instantiate Phaser');
  assert.equal(initialRuntime.phaserLoaded, false, 'Phaser is not loaded before a legacy route opens');

  await page.evaluate(() => globalThis.anchorRuntime.openLegacyRoute('bathymetryWorldView'));
  await page.waitForFunction(() => globalThis.ANCHOR_LEGACY_PHASER_DEBUG?.mounted === true, null, { timeout: 20_000 });
  await page.waitForFunction(() => globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesThreeRenderer === true, null, { timeout: 20_000 });
  await page.waitForSelector('.three-bathymetry-canvas', { timeout: 20_000 });
  const bathymetry = await page.evaluate(() => ({
    usesThreeRenderer: globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesThreeRenderer === true,
    rendererBackend: globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.rendererBackend,
    terrainVertexCount: globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.terrainVertexCount ?? 0,
    legacyMounted: globalThis.ANCHOR_LEGACY_PHASER_DEBUG?.mounted === true
  }));
  assert.equal(bathymetry.usesThreeRenderer, true, 'bathymetry view uses Three renderer');
  assert.equal(bathymetry.rendererBackend, 'three', 'bathymetry debug renderer backend');
  assert.ok(bathymetry.terrainVertexCount > 0, 'bathymetry exposes terrain vertices');
  assert.equal(bathymetry.legacyMounted, true, 'legacy island mounted for legacy route');

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#main-menu-hub', { timeout: 15_000 });
  await page.evaluate(() => globalThis.anchorRuntime.lifecycleController.loadTutorialMission('tutorial_01_first_deployment'));
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_LIFECYCLE_DEBUG?.summary?.state === 'briefing', null, { timeout: 15_000 });
  await page.evaluate(() => globalThis.anchorRuntime.lifecycleController.beginPlanning());
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
  await page.close();
  assert.equal(vendorThreeRequestSeen, true, 'browser requested vendored Three module');
  assert.equal(lazyPhaserRequestSeen, true, 'browser requested Phaser only after legacy route opened');
  assert.deepEqual(nodeModuleRequests, [], 'browser made no node_modules requests');
  assert.deepEqual(externalThreeRequests, [], 'browser made no external Three/CDN requests');
  assert.deepEqual(failedRequests, [], 'browser request failures');
  assert.deepEqual(failedResponses, [], 'browser HTTP error responses');
  assert.deepEqual(pageErrors, [], 'browser page errors');
  assert.deepEqual(consoleErrors, [], 'browser console errors');
  console.log('smoke_github_pages_static_host: ok', { baseUrl, deployment, bathymetry, missionBackend: mission.activeBackend });
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
    lazyPhaserRequestSeen,
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

