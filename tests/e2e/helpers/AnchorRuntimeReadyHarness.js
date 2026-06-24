import { expect } from '@playwright/test';

export const ANCHOR_RUNTIME_READY_HARNESS_VERSION = 'flow-pkg-r1-1-runtime-ready-harness';
export const SERVER_READY_TIMEOUT_MS = 15_000;
export const APP_READY_TIMEOUT_MS = 20_000;
export const ROUTE_READY_TIMEOUT_MS = 10_000;

const ERROR_KEY = Symbol.for('anchor.runtimeReady.errors');

export async function waitForAnchorAppReady(page, options = {}) {
  installAnchorRuntimeErrorCollectors(page);
  if (options.url) await page.goto(options.url, { waitUntil: 'domcontentloaded' });
  await expect.poll(async () => page.evaluate(() => globalThis.ANCHOR_APP_BOOT_DEBUG?.ready === true), {
    timeout: options.timeout ?? APP_READY_TIMEOUT_MS,
    message: await readinessFailureMessage(page, 'application ready')
  }).toBe(true);
  await assertNoAnchorBootErrors(page);
  const routeId = options.routeId ?? options.route ?? null;
  if (routeId) await waitForAnchorRoute(page, routeId, options);
  return page.evaluate(() => globalThis.ANCHOR_APP_BOOT_DEBUG ?? null);
}

export async function waitForAnchorRoute(page, routeId, options = {}) {
  installAnchorRuntimeErrorCollectors(page);
  const expectedRoute = normalizeRouteId(routeId);
  await expect.poll(async () => page.evaluate((route) => {
    const debug = globalThis.ANCHOR_APP_BOOT_DEBUG ?? null;
    return debug?.ready === true && (debug.currentRoute === route || document.body?.dataset?.anchorRoute === route);
  }, expectedRoute), {
    timeout: options.routeTimeout ?? ROUTE_READY_TIMEOUT_MS,
    message: await readinessFailureMessage(page, `route ${expectedRoute}`)
  }).toBe(true);
  await expect(page.locator(`[data-anchor-app-ready="true"][data-anchor-route="${expectedRoute}"]`).first()).toHaveCount(1, { timeout: options.routeTimeout ?? ROUTE_READY_TIMEOUT_MS });
  return page.evaluate(() => globalThis.ANCHOR_APP_BOOT_DEBUG ?? null);
}

export async function assertNoAnchorBootErrors(page) {
  const errors = page[ERROR_KEY] ?? installAnchorRuntimeErrorCollectors(page);
  const debug = await page.evaluate(() => globalThis.ANCHOR_APP_BOOT_DEBUG ?? null).catch(() => null);
  const runtime = await page.evaluate(() => globalThis.ANCHOR_RUNTIME_SELECTION_DEBUG ?? null).catch(() => null);
  const failures = [
    ...(errors.pageErrors ?? []),
    ...(errors.failedRequests ?? []),
    ...(errors.failedResponses ?? []),
    ...(debug?.lastFailure ? [`${debug.lastFailureStage}: ${debug.lastFailure}`] : []),
    ...((runtime?.failures ?? []).map((failure) => `runtime: ${failure}`))
  ];
  expect(failures, await readinessFailureMessage(page, 'boot errors')).toEqual([]);
}

export function installAnchorRuntimeErrorCollectors(page) {
  if (page[ERROR_KEY]) return page[ERROR_KEY];
  const errors = { pageErrors: [], consoleErrors: [], failedRequests: [], failedResponses: [] };
  page[ERROR_KEY] = errors;
  page.on('pageerror', (error) => errors.pageErrors.push(String(error?.message ?? error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.endsWith('/favicon.ico')) errors.failedRequests.push(`${request.failure()?.errorText ?? 'failed'} ${url}`);
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.endsWith('/favicon.ico')) errors.failedResponses.push(`${response.status()} ${url}`);
  });
  return errors;
}

export async function anchorBootSnapshot(page) {
  return page.evaluate(() => ({
    url: location.href,
    ready: globalThis.ANCHOR_APP_BOOT_DEBUG?.ready ?? false,
    route: globalThis.ANCHOR_APP_BOOT_DEBUG?.currentRoute ?? null,
    stage: globalThis.ANCHOR_APP_BOOT_DEBUG?.milestones?.at?.(-1)?.stage ?? null,
    debug: globalThis.ANCHOR_APP_BOOT_DEBUG ?? null,
    runtime: globalThis.ANCHOR_RUNTIME_SELECTION_DEBUG ?? null,
    bodyRoute: document.body?.dataset?.anchorRoute ?? null,
    bodyReady: document.body?.dataset?.anchorAppReady ?? null,
    mainMenuCount: document.querySelectorAll('#main-menu-hub').length,
    visibleText: document.body?.innerText?.slice?.(0, 1000) ?? ''
  })).catch((error) => ({ evaluateError: String(error?.message ?? error) }));
}

async function readinessFailureMessage(page, label) {
  const snapshot = await anchorBootSnapshot(page).catch((error) => ({ error: String(error?.message ?? error) }));
  const errors = page[ERROR_KEY] ?? {};
  return `Timed out waiting for ${label}. Snapshot: ${JSON.stringify({
    url: snapshot.url,
    ready: snapshot.ready,
    route: snapshot.route,
    stage: snapshot.stage,
    bodyReady: snapshot.bodyReady,
    bodyRoute: snapshot.bodyRoute,
    pageErrors: errors.pageErrors ?? [],
    failedRequests: errors.failedRequests ?? [],
    failedResponses: errors.failedResponses ?? [],
    consoleErrors: errors.consoleErrors ?? [],
    lastFailure: snapshot.debug?.lastFailure ?? null,
    lastFailureStage: snapshot.debug?.lastFailureStage ?? null
  })}`;
}

function normalizeRouteId(routeId) {
  return String(routeId ?? '').replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^-/, '').replace(/^product-hub$/, 'main-menu');
}
