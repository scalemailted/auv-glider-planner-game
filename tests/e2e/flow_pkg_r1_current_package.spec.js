import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE = 'http://127.0.0.1:9381';

test.setTimeout(240000);
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9381 });
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
  const allLayerButton = page.locator('#waypoint-timeline [data-action="water-column-current-mode"][data-mode="allLayers"]').first();
  if (await allLayerButton.count()) await allLayerButton.click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentPresentationEnabled === true), { timeout: 30000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentPackageVersion === 'anchor-currents-flow-pkg-r1'), { timeout: 30000 }).toBe(true);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const debug = window.ANCHOR_CURRENT_PRESENTATION_DEBUG ?? {};
    const timeline = window.ANCHOR_PLANNING_TIMELINE_DEBUG ?? {};
    const launch = window.ANCHOR_SIMULATION_LAUNCH_DEBUG ?? null;
    return {
      debug,
      timeline,
      launch,
      time: debug.currentPresentationTimeSeconds ?? null,
      missionTime: debug.missionTimelineTimeSeconds ?? null,
      samplerTime: debug.samplerInputTimeSeconds ?? null,
      renderDigest: debug.renderSampleDigest ?? null,
      canonicalDigest: debug.canonicalCurrentDigest ?? null,
      artifactDigest: debug.currentArtifactDigest ?? null,
      packageVersion: debug.currentPackageVersion ?? null,
      packageTimeUnit: debug.packageTimeUnit ?? null,
      packageAcceptsDisplayHours: debug.packageAcceptsDisplayHours === true,
      packageUsesThree: debug.packageUsesThree === true,
      packageUsesPhaser: debug.packageUsesPhaser === true,
      packageUsesDom: debug.packageUsesDom === true,
      visibleInstances: debug.visibleVectorInstanceCount ?? 0,
      directionUploads: debug.directionBufferUploadCount ?? 0,
      matrixUploads: debug.matrixBufferUploadCount ?? 0,
      lastAction: timeline.dispatch?.lastTimelineActionKey ?? null,
      directDebugTimeMutationUsed: debug.directDebugTimeMutationUsed === true || timeline.directDebugTimeMutationUsed === true
    };
  });
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

async function waitForChangedCurrent(page, before, action = null) {
  await expect.poll(async () => {
    const after = await snapshot(page);
    return Boolean(
      after.packageVersion === 'anchor-currents-flow-pkg-r1'
      && after.time !== before.time
      && after.renderDigest !== before.renderDigest
      && (action == null || after.lastAction === action)
    );
  }, { timeout: 30000 }).toBe(true);
  return snapshot(page);
}

test('Current Package Powers Production Planning Currents', async ({ page }) => {
  await bootVisiblePlanning(page);
  const snap = await snapshot(page);
  expect(snap.packageVersion).toBe('anchor-currents-flow-pkg-r1');
  expect(snap.artifactDigest).toMatch(/^fnv1a32:/);
  expect(snap.visibleInstances).toBeGreaterThan(0);
  expect(snap.packageTimeUnit).toBe('seconds');
  expect(snap.packageUsesThree).toBe(false);
  expect(snap.packageUsesPhaser).toBe(false);
  expect(snap.packageUsesDom).toBe(false);
});

test('Current Package Preserves Visible Planning Timeline Evolution', async ({ page }) => {
  await bootVisiblePlanning(page);
  const start = await snapshot(page);
  await clickTimeline(page, 'window-next');
  const next = await waitForChangedCurrent(page, start, 'window-next');
  await clickTimeline(page, 'time-end');
  const end = await waitForChangedCurrent(page, next, 'time-end');
  await clickTimeline(page, 'time-start');
  const reset = await waitForChangedCurrent(page, end, 'time-start');
  await clickSliderFraction(page, 0.47);
  const slider = await waitForChangedCurrent(page, reset, 'time-slider');
  for (const snap of [next, end, reset, slider]) {
    expect(snap.time).toBe(snap.missionTime);
    expect(Math.abs(snap.samplerTime - snap.time)).toBeLessThanOrEqual(1e-3);
    expect(snap.packageAcceptsDisplayHours).toBe(false);
    expect(snap.directDebugTimeMutationUsed).toBe(false);
    expect(snap.directionUploads).toBeGreaterThan(0);
    expect(snap.matrixUploads).toBeGreaterThan(0);
  }
});

test('Current Package Powers Production Simulation Drift', async ({ page }) => {
  await bootVisiblePlanning(page);
  const planning = await snapshot(page);
  const execute = page.locator('#mission-console [data-action="execute"], #waypoint-timeline [data-action="execute"]').first();
  await expect(execute).toBeVisible({ timeout: 30000 });
  await execute.click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_LAUNCH_DEBUG?.currentFieldDigest ?? null), { timeout: 45000 }).toBe(planning.artifactDigest);
  const sim = await snapshot(page);
  expect(sim.launch.currentDepthCount).toBeGreaterThan(1);
  expect(sim.launch.currentSamplerCreateCount).toBeLessThanOrEqual(1);
  expect(sim.launch.currentFieldDigest).toBe(planning.artifactDigest);
});

test('Current Package Preserves Headless and Browser Current Parity', async ({ page }) => {
  await page.goto(BASE + '/');
  const result = await page.evaluate(async () => {
    const pkg = await import('/packages/currents/src/index.js');
    const legacySampler = await import('/src/core/science/OceanCurrentFieldSampler.js');
    const field = pkg.createCurrentField4D({
      id: 'browser-headless-current-parity',
      eastAxisMeters: [0, 10],
      northAxisMeters: [0, 10],
      depthAxisMeters: [0, 100],
      timeAxisSeconds: [0, 100],
      uEastMetersPerSecond: [[[[0, 1], [2, 3]], [[4, 5], [6, 7]]], [[[10, 11], [12, 13]], [[14, 15], [16, 17]]]],
      vNorthMetersPerSecond: [[[[0, -1], [-2, -3]], [[1, 0], [-1, -2]]], [[[2, 1], [0, -1]], [[3, 2], [1, 0]]]],
      wetMask: [[true, true], [true, true]],
      bottomDepthMeters: [[150, 150], [150, 150]],
      sourceMetadata: { sourceTier: 'manufacturedAnalytical', sourceType: 'manufactured', sourceId: 'browser-headless-current-parity', equationFamily: 'manufactured:parity' }
    });
    const packageSample = pkg.sampleOceanCurrent(field, 5, 5, 50, 50);
    const legacySample = legacySampler.sampleOceanCurrent(field, 5, 5, 50, 50);
    return { digest: field.digest, packageSample, legacySample, sourceTier: field.sourceMetadata.sourceTier };
  });
  expect(result.digest).toMatch(/^fnv1a32:/);
  expect(result.sourceTier).toBe('manufacturedAnalytical');
  expect(result.legacySample).toEqual(result.packageSample);
  expect(result.packageSample.timeInterpolationFraction).toBe(0.5);
});

test('Current Package Runs From GitHub Pages Subpath', async ({ page }) => {
  await bootVisiblePlanning(page, '/auv-glider-planner-game/');
  const before = await snapshot(page);
  expect(before.packageVersion).toBe('anchor-currents-flow-pkg-r1');
  await clickTimeline(page, 'window-next');
  const after = await waitForChangedCurrent(page, before, 'window-next');
  expect(after.artifactDigest).toBe(before.artifactDigest);
  expect(after.visibleInstances).toBeGreaterThan(0);
});