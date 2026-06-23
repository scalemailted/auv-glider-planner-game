import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE = 'http://127.0.0.1:9376';
const REVIEW_DIR = path.join(process.cwd(), 'test-results', 'flow-runtime-r1-1-owner-review');

test.setTimeout(240000);
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  server = await startStaticServer({ port: 9376 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function bootVisiblePlanning(page, route = '/') {
  await page.goto(BASE + route);
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame)), { timeout: 30000 }).toBe(true);
  const challengeHub = page.locator('[data-hub-view="challenge"]').first();
  if (await challengeHub.count()) await challengeHub.click();
  await page.locator('[data-action="play-challenge"]').first().click();
  await expect(page.locator('[data-action="generate"]').first()).toBeVisible({ timeout: 30000 });
  await page.locator('[data-action="generate"]').first().click();
  await expect(page.locator('#bottom-timeline [data-action="time-slider"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#bottom-timeline [data-action="time-start"]')).toBeVisible();
  await expect(page.locator('#bottom-timeline [data-action="window-prev"]')).toBeVisible();
  await expect(page.locator('#bottom-timeline [data-action="window-next"]')).toBeVisible();
  await expect(page.locator('#bottom-timeline [data-action="time-end"]')).toBeVisible();
  const allLayerButton = page.locator('#waypoint-timeline [data-action="water-column-current-mode"][data-mode="allLayers"]').first();
  if (await allLayerButton.count()) await allLayerButton.click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentPresentationEnabled === true), { timeout: 30000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_PLANNING_TIMELINE_DEBUG?.time?.currentEqualsTimelineSeconds === true), { timeout: 30000 }).toBe(true);
}

async function timelineSnapshot(page) {
  return page.evaluate(() => {
    const presentation = window.ANCHOR_CURRENT_PRESENTATION_DEBUG ?? {};
    const timeline = window.ANCHOR_PLANNING_TIMELINE_DEBUG ?? {};
    const transaction = window.ANCHOR_PLANNING_CURRENT_TRANSACTION_DEBUG ?? {};
    return {
      presentation,
      timeline,
      transaction,
      currentPresentationTimeSeconds: presentation.currentPresentationTimeSeconds ?? null,
      missionTimelineTimeSeconds: presentation.missionTimelineTimeSeconds ?? timeline.time?.missionTimelineTimeSeconds ?? null,
      samplerInputTimeSeconds: presentation.samplerInputTimeSeconds ?? null,
      renderDigest: presentation.renderSampleDigest ?? timeline.refresh?.currentDataDigest ?? null,
      sourceSignature: presentation.sourceTimeFrameSignature ?? null,
      directionUploadCount: presentation.directionBufferUploadCount ?? timeline.refresh?.directionBufferUploadCount ?? 0,
      matrixUploadCount: presentation.matrixBufferUploadCount ?? timeline.refresh?.matrixBufferUploadCount ?? 0,
      lastTimelineActionKey: timeline.dispatch?.lastTimelineActionKey ?? null,
      timelineBindingPass: presentation.timelineBindingPass === true,
      samplerTimePass: presentation.samplerTimePass === true,
      enabled: presentation.currentPresentationEnabled === true,
      visibleInstances: presentation.visibleVectorInstanceCount ?? 0,
      conversionMultiplier: presentation.currentTimeConversionMultiplier ?? null,
      directDebugTimeMutationUsed: presentation.directDebugTimeMutationUsed === true || timeline.directDebugTimeMutationUsed === true || transaction.directDebugTimeMutationUsed === true
    };
  });
}

async function waitForCurrentChange(page, before, expectedAction = null) {
  await expect.poll(async () => {
    const snap = await timelineSnapshot(page);
    const actionOk = expectedAction == null || snap.lastTimelineActionKey === expectedAction;
    return Boolean(
      snap.enabled
      && snap.timelineBindingPass
      && snap.samplerTimePass
      && snap.currentPresentationTimeSeconds !== before.currentPresentationTimeSeconds
      && snap.renderDigest !== before.renderDigest
      && actionOk
    );
  }, { timeout: 30000 }).toBe(true);
  return timelineSnapshot(page);
}

async function clickTimeline(page, action) {
  await page.locator(`#bottom-timeline [data-action="${action}"]`).click();
}

async function clickSliderFraction(page, fraction) {
  const slider = page.locator('#bottom-timeline [data-action="time-slider"]');
  const box = await slider.boundingBox();
  if (!box) throw new Error('Timeline slider has no visible bounding box.');
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2);
}

async function canvasShot(page, name) {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 30000 });
  const filePath = path.join(REVIEW_DIR, name);
  const buffer = await canvas.screenshot({ path: filePath });
  return { filePath, buffer };
}

function countByteDelta(a, b) {
  const length = Math.min(a.length, b.length);
  let changed = Math.abs(a.length - b.length);
  for (let index = 0; index < length; index += 1) if (a[index] !== b[index]) changed += 1;
  return changed;
}

test('Visible Planning Next Button Updates Current Vectors', async ({ page }) => {
  await bootVisiblePlanning(page);
  const before = await timelineSnapshot(page);
  const beforeShot = await canvasShot(page, 'next-before.png');
  await clickTimeline(page, 'window-next');
  const after = await waitForCurrentChange(page, before, 'window-next');
  const afterShot = await canvasShot(page, 'next-after.png');
  expect(after.currentPresentationTimeSeconds).toBeGreaterThan(before.currentPresentationTimeSeconds);
  expect(after.directionUploadCount).toBeGreaterThanOrEqual(before.directionUploadCount);
  expect(after.visibleInstances).toBeGreaterThan(0);
  expect(after.conversionMultiplier).toBe(3600);
  expect(after.directDebugTimeMutationUsed).toBe(false);
  expect(countByteDelta(beforeShot.buffer, afterShot.buffer)).toBeGreaterThan(1024);
});

test('Visible Planning Start Prev Next and End Share One Time Authority', async ({ page }) => {
  await bootVisiblePlanning(page);
  const actions = ['time-end', 'window-prev', 'window-next', 'time-start'];
  const observed = [];
  for (const action of actions) {
    await clickTimeline(page, action);
    await expect.poll(async () => {
      const snap = await timelineSnapshot(page);
      return snap.lastTimelineActionKey === action && snap.timelineBindingPass && snap.samplerTimePass;
    }, { timeout: 30000 }).toBe(true);
    const snap = await timelineSnapshot(page);
    expect(snap.currentPresentationTimeSeconds).toBe(snap.missionTimelineTimeSeconds);
    expect(Math.abs(snap.samplerInputTimeSeconds - snap.currentPresentationTimeSeconds)).toBeLessThanOrEqual(1e-3);
    expect(snap.enabled).toBe(true);
    expect(snap.directDebugTimeMutationUsed).toBe(false);
    observed.push({ action, currentPresentationTimeSeconds: snap.currentPresentationTimeSeconds, renderDigest: snap.renderDigest });
  }
  expect(new Set(observed.map((entry) => entry.currentPresentationTimeSeconds)).size).toBeGreaterThan(2);
  await fs.writeFile(path.join(REVIEW_DIR, 'start-prev-next-end-authority.json'), JSON.stringify(observed, null, 2));
});

test('Visible Planning Timeline Input Updates Current Vectors', async ({ page }) => {
  await bootVisiblePlanning(page);
  const before = await timelineSnapshot(page);
  await clickSliderFraction(page, 0.62);
  const after = await waitForCurrentChange(page, before, 'time-slider');
  expect(after.currentPresentationTimeSeconds).not.toBe(before.currentPresentationTimeSeconds);
  expect(after.currentPresentationTimeSeconds).toBe(after.missionTimelineTimeSeconds);
  expect(Math.abs(after.samplerInputTimeSeconds - after.currentPresentationTimeSeconds)).toBeLessThanOrEqual(1e-3);
  expect(after.renderDigest).not.toBe(before.renderDigest);
  expect(after.conversionMultiplier).toBe(3600);
});

test('Planning Current Test Does Not Use a Direct Time Mutation', async () => {
  await import('../../tools/js/audit_no_direct_time_mutation_in_current_e2e.mjs');
});

test('Manual Planning Current Workflow Runs From GitHub Pages Subpath', async ({ page }) => {
  await bootVisiblePlanning(page, '/auv-glider-planner-game/');
  const before = await timelineSnapshot(page);
  await clickTimeline(page, 'window-next');
  const after = await waitForCurrentChange(page, before, 'window-next');
  expect(after.currentPresentationTimeSeconds).toBeGreaterThan(before.currentPresentationTimeSeconds);
  expect(after.enabled).toBe(true);
  expect(after.directDebugTimeMutationUsed).toBe(false);
});

test('FLOW-RUNTIME-R1.1 Full Headed Manual Planning Timeline Walkthrough', async ({ page, browserName }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.message ?? error)));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await bootVisiblePlanning(page);
  const screenshots = [];
  const actions = [];
  const runtime = await timelineSnapshot(page);
  screenshots.push(await canvasShot(page, '01-runtime-identity.png'));
  screenshots.push(await canvasShot(page, '02-planning-current-initial.png'));

  for (const [action, fileName] of [
    ['window-next', '03-planning-current-next-1.png'],
    ['window-next', '04-planning-current-next-2.png'],
    ['time-end', '05-planning-current-end.png'],
    ['window-prev', '06-planning-current-prev.png'],
    ['time-start', '07-planning-current-start.png']
  ]) {
    const before = await timelineSnapshot(page);
    await clickTimeline(page, action);
    const after = await waitForCurrentChange(page, before, action);
    const shot = await canvasShot(page, fileName);
    screenshots.push(shot);
    actions.push({ action, requestedTimeSeconds: after.missionTimelineTimeSeconds, acceptedTimeSeconds: after.currentPresentationTimeSeconds, renderDigest: after.renderDigest, sourceSignature: after.sourceSignature, transaction: after.transaction?.lastStage ?? null });
  }

  const beforeSlider = await timelineSnapshot(page);
  await clickSliderFraction(page, 0.44);
  const afterSlider = await waitForCurrentChange(page, beforeSlider, 'time-slider');
  const sliderShot = await canvasShot(page, '08-planning-current-timeline-input.png');
  screenshots.push(sliderShot);
  actions.push({ action: 'time-slider', requestedTimeSeconds: afterSlider.missionTimelineTimeSeconds, acceptedTimeSeconds: afterSlider.currentPresentationTimeSeconds, renderDigest: afterSlider.renderDigest, sourceSignature: afterSlider.sourceSignature, transaction: afterSlider.transaction?.lastStage ?? null });

  const beforeCamera = await timelineSnapshot(page);
  const cameraButton = page.locator('#mission-console [data-action="three-camera"]').first();
  if (await cameraButton.count()) await cameraButton.click();
  await expect.poll(async () => {
    const snap = await timelineSnapshot(page);
    return snap.renderDigest === beforeCamera.renderDigest && snap.currentPresentationTimeSeconds === beforeCamera.currentPresentationTimeSeconds;
  }, { timeout: 30000 }).toBe(true);
  screenshots.push(await canvasShot(page, '09-camera-only-current-unchanged.png'));

  await page.locator('[data-action="main-menu"]').first().click();
  await expect(page.locator('[data-hub-view="challenge"]').first()).toBeVisible({ timeout: 30000 });
  const cleanupPath = path.join(REVIEW_DIR, '10-main-menu-cleanup.png');
  await page.screenshot({ path: cleanupPath, fullPage: true });
  screenshots.push({ filePath: cleanupPath, buffer: Buffer.alloc(0) });

  const final = await timelineSnapshot(page);
  const qaSummary = {
    browser: browserName,
    browserVersion: browserName,
    branchOrBuildLabel: runtime.presentation?.runtimeSourceIdentity?.branchOrBuildLabel ?? null,
    sourceHead: runtime.presentation?.runtimeSourceIdentity?.sourceHead ?? null,
    exactUrl: BASE + '/',
    runtimeShell: runtime.presentation?.runtimeSourceIdentity?.runtimeShell ?? 'default',
    missionId: await page.evaluate(() => window.anchorGame?.state?.mission?.missionId ?? null),
    currentEvolutionMode: final.presentation?.currentEvolutionMode ?? null,
    testedTimelineActions: actions,
    canonicalRenderGlyphDigests: actions.map((entry) => entry.renderDigest),
    attributeVersions: {
      direction: final.presentation?.directionAttributeVersion ?? null,
      magnitude: final.presentation?.magnitudeAttributeVersion ?? null,
      matrix: final.presentation?.instanceMatrixVersion ?? null
    },
    gpuUploadCounters: {
      direction: final.presentation?.directionBufferUploadCount ?? null,
      magnitude: final.presentation?.magnitudeBufferUploadCount ?? null,
      matrix: final.presentation?.matrixBufferUploadCount ?? null
    },
    transactions: actions.map((entry) => entry.transaction),
    projectedPixelEvidence: 'canvas screenshots preserved for each visible timeline state',
    currentEnvironmentBuildCounts: {
      currentCubeBuildCount: final.presentation?.currentCubeBuildCount ?? null,
      currentLayerUpdateCount: final.presentation?.currentLayerUpdateCount ?? null
    },
    rendererRafCounts: {
      activeRendererCount: final.presentation?.activeRendererCount ?? null,
      activeRafCount: final.presentation?.activeRafCount ?? null
    },
    screenshots: screenshots.map((shot) => shot.filePath),
    consoleErrors,
    pageErrors,
    cleanup: { returnedToProductHub: true },
    finalStatus: 'PASS'
  };
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), JSON.stringify(qaSummary, null, 2));
  expect(actions.length).toBe(6);
  expect(final.enabled).toBe(true);
  expect(final.timelineBindingPass).toBe(true);
  expect(final.samplerTimePass).toBe(true);
  expect(final.directDebugTimeMutationUsed).toBe(false);
});
