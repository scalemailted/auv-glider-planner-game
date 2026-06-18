import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { cp, mkdir, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, normalize, resolve, dirname } from 'node:path';

import { chromium } from 'playwright';

const repoName = 'auv-glider-planner-game';
const basePath = `/${repoName}/`;
const root = process.cwd();
const tmpRoot = resolve(root, '.tmp', 'pages-clean-checkout');
const siteRoot = resolve(tmpRoot, '_site');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
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

rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpRoot, { recursive: true });
const files = gitVisibleFiles();
for (const file of files) await copyFileIntoCleanSource(file);
run('git', ['init', '-q'], { cwd: tmpRoot });
run('git', ['-c', 'core.autocrlf=false', 'add', '.'], { cwd: tmpRoot });
run(npmCommand, ['ci'], { cwd: tmpRoot });
run(npmCommand, ['run', 'check:three-vendor'], { cwd: tmpRoot });
run(npmCommand, ['run', 'check:three-vendor-git'], { cwd: tmpRoot });
run(npmCommand, ['run', 'build:pages'], { cwd: tmpRoot });

const server = createPagesLikeServer(siteRoot);
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}${basePath}`;
const assetChecks = [];
const browser = await chromium.launch();
let page = null;
try {
  for (const assetPath of ['vendor/three/build/three.module.js', 'vendor/three/build/three.core.js']) {
    assetChecks.push(await assertStaticJavaScriptAsset(`${baseUrl}${assetPath}`));
  }
  page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const consoleErrors = [];
  const pageErrors = [];
  const nodeModuleRequests = [];
  const externalThreeRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/node_modules/')) nodeModuleRequests.push(url);
    if (/^https?:\/\//i.test(url) && !url.startsWith(`http://127.0.0.1:${address.port}/`) && /three|cdn|unpkg|jsdelivr|esm\.sh|skypack/i.test(url)) externalThreeRequests.push(url);
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#main-menu-hub', { timeout: 15_000 });
  await page.evaluate(() => globalThis.anchorRuntime.openLegacyRoute('bathymetryWorldView'));
  await page.waitForFunction(() => globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesThreeRenderer === true, null, { timeout: 20_000 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#main-menu-hub', { timeout: 15_000 });
  await page.evaluate(() => globalThis.anchorRuntime.lifecycleController.loadTutorialMission('tutorial_01_first_deployment'));
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_LIFECYCLE_DEBUG?.summary?.state === 'briefing', null, { timeout: 15_000 });
  await page.evaluate(() => globalThis.anchorRuntime.lifecycleController.beginPlanning());
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d', null, { timeout: 20_000 });
  assert.deepEqual(consoleErrors, [], 'browser console errors');
  assert.deepEqual(pageErrors, [], 'browser page errors');
  assert.deepEqual(nodeModuleRequests, [], 'no node_modules requests');
  assert.deepEqual(externalThreeRequests, [], 'no external Three CDN requests');
  console.log('smoke_pages_clean_checkout: ok', { files: files.length, baseUrl, assetChecks });
} finally {
  await page?.close?.();
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

function gitVisibleFiles() {
  const tracked = run('git', ['ls-files', '-z'], { cwd: root, capture: true }).stdout.split('\0').filter(Boolean);
  const porcelain = run('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, capture: true }).stdout.split('\0').filter(Boolean);
  const untracked = porcelain
    .filter((entry) => entry.startsWith('?? '))
    .map((entry) => entry.slice(3))
    .filter((file) => !isExcludedRepairFile(file));
  return [...new Set([...tracked, ...untracked])].filter((file) => existsSync(resolve(root, file)) && !isExcludedRepairFile(file));
}

function isExcludedRepairFile(file) {
  return /^(node_modules|_site|test-results|playwright-report|coverage|\.tmp|tmp|temp|\.git)(\/|\\|$)/.test(file)
    || /(^|\/|\\)debug\.log$/.test(file)
    || /\.log$/.test(file);
}

async function copyFileIntoCleanSource(file) {
  const source = resolve(root, file);
  const destination = resolve(tmpRoot, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { force: true });
}

function run(command, args, { cwd, capture = false } = {}) {
  const windowsCmd = process.platform === 'win32' && command.endsWith('.cmd');
  const actualCommand = windowsCmd ? 'cmd.exe' : command;
  const actualArgs = windowsCmd ? ['/d', '/s', '/c', command, ...args] : args;
  const result = spawnSync(actualCommand, actualArgs, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit'
  });
  if (result.status !== 0) {
    const detail = result.error ? ` (${result.error.message})` : '';
    throw new Error(`${command} ${args.join(' ')} failed with ${result.status}${detail}`);
  }
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

async function assertStaticJavaScriptAsset(url) {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type') ?? '';
  const body = await response.text();
  assert.equal(response.status, 200, `${url} should return HTTP 200`);
  assert.match(contentType, /javascript|ecmascript|text\/plain|application\/octet-stream/i, `${url} should return JavaScript-like content type`);
  assert.ok(body.length > 1000, `${url} should be nonempty`);
  assert.equal(/^\s*</.test(body), false, `${url} should not return an HTML 404 document`);
  return { url, status: response.status, contentType, bytes: body.length };
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
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream', Connection: 'close' });
    createReadStream(filePath).pipe(response);
  });
  const close = server.close.bind(server);
  server.close = (callback) => {
    server.closeAllConnections?.();
    return close(callback);
  };
  return server;
}
