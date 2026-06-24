import { chromium } from '@playwright/test';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const PORT = 9476;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT_RUNS = Number(process.argv.find((arg) => arg.startsWith('--root='))?.split('=')[1] ?? 10);
const PAGES_RUNS = Number(process.argv.find((arg) => arg.startsWith('--pages='))?.split('=')[1] ?? 5);
const WARM_RUNS = Number(process.argv.find((arg) => arg.startsWith('--warm='))?.split('=')[1] ?? 3);

const server = await startStaticServer({ port: PORT, root: process.cwd() });
const browser = await chromium.launch();
try {
  const root = [];
  const pages = [];
  const warm = [];
  for (let index = 0; index < ROOT_RUNS; index += 1) root.push(await measureBoot(browser, `${BASE}/`, { cold: true }));
  for (let index = 0; index < PAGES_RUNS; index += 1) pages.push(await measureBoot(browser, `${BASE}/auv-glider-planner-game/`, { cold: true }));
  const warmContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  for (let index = 0; index < WARM_RUNS; index += 1) warm.push(await measureBootInContext(warmContext, `${BASE}/`));
  await warmContext.close();
  const result = {
    ok: root.every((row) => row.ready) && pages.every((row) => row.ready) && warm.every((row) => row.ready),
    environment: {
      browserName: 'chromium',
      headless: true,
      port: PORT,
      node: process.version,
      platform: process.platform
    },
    root: summarize(root),
    pages: summarize(pages),
    warm: summarize(warm),
    samples: { root, pages, warm }
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
} finally {
  await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}

async function measureBoot(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { 'Cache-Control': 'no-store' } });
  try {
    return await measureBootInContext(context, url);
  } finally {
    await context.close();
  }
}

async function measureBootInContext(context, url) {
  const page = await context.newPage();
  const startedAt = Date.now();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error?.message ?? error)));
  page.on('requestfailed', (request) => {
    if (!request.url().endsWith('/favicon.ico')) errors.push(`${request.failure()?.errorText ?? 'failed'} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.ANCHOR_APP_BOOT_DEBUG?.ready === true, null, { timeout: 20000 });
  const row = await page.evaluate((startedAtWall) => {
    const resources = performance.getEntriesByType('resource').map((entry) => ({ name: entry.name, duration: entry.duration, transferSize: entry.transferSize ?? 0 }));
    const packageResources = resources.filter((entry) => entry.name.includes('/packages/'));
    return {
      ready: globalThis.ANCHOR_APP_BOOT_DEBUG?.ready === true,
      url: location.href,
      route: globalThis.ANCHOR_APP_BOOT_DEBUG?.currentRoute ?? null,
      totalBootMs: globalThis.ANCHOR_APP_BOOT_DEBUG?.durations?.totalBootMs ?? null,
      wallClockMs: Date.now() - startedAtWall,
      moduleRequestCount: resources.filter((entry) => /\.(?:js|mjs)(?:\?|$)/.test(entry.name)).length,
      packageRequestCount: packageResources.length,
      duplicateRequestCount: resources.length - new Set(resources.map((entry) => entry.name)).size,
      failedRequestCount: 0,
      packageImportDurationMs: (() => {
        const milestones = globalThis.ANCHOR_APP_BOOT_DEBUG?.milestones ?? [];
        const contracts = milestones.find((m) => m.stage === 'package-contracts-ready')?.elapsedMs;
        const currents = milestones.find((m) => m.stage === 'package-currents-ready')?.elapsedMs;
        return Number.isFinite(contracts) && Number.isFinite(currents) ? Math.round((currents - contracts) * 1000) / 1000 : null;
      })(),
      durations: globalThis.ANCHOR_APP_BOOT_DEBUG?.durations ?? {},
      bootDebug: globalThis.ANCHOR_APP_BOOT_DEBUG ?? null
    };
  }, startedAt);
  row.errors = errors;
  row.ready = row.ready && errors.length === 0;
  await page.close();
  return row;
}

function summarize(rows) {
  const values = rows.map((row) => Number(row.totalBootMs ?? row.wallClockMs)).filter(Number.isFinite).sort((a, b) => a - b);
  return {
    count: rows.length,
    successCount: rows.filter((row) => row.ready).length,
    medianMs: percentile(values, 50),
    p90Ms: percentile(values, 90),
    p95Ms: percentile(values, 95),
    maxMs: values.at(-1) ?? null,
    moduleRequestCount: rows[0]?.moduleRequestCount ?? null,
    packageRequestCount: rows[0]?.packageRequestCount ?? null,
    duplicateRequestCountMax: Math.max(...rows.map((row) => row.duplicateRequestCount ?? 0)),
    failedRequestCount: rows.reduce((sum, row) => sum + (row.errors?.length ?? 0), 0),
    packageImportDurationMs: rows.map((row) => row.packageImportDurationMs).filter(Number.isFinite)[0] ?? null,
    firstFailureStage: rows.find((row) => !row.ready)?.bootDebug?.lastFailureStage ?? null
  };
}

function percentile(values, pct) {
  if (!values.length) return null;
  const index = Math.min(values.length - 1, Math.ceil((pct / 100) * values.length) - 1);
  return Math.round(values[index] * 1000) / 1000;
}