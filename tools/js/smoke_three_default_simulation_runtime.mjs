import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const server = await startStaticServer({ port: 9332 });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await page.goto('http://127.0.0.1:9332/');
  await page.waitForSelector('#main-menu-hub');
  await page.evaluate(() => globalThis.anchorRuntime.lifecycleController.loadTutorialMission('tutorial_01_first_deployment'));
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_LIFECYCLE_DEBUG?.summary?.state === 'briefing');
  await page.evaluate(() => globalThis.anchorRuntime.lifecycleController.beginPlanning());
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d');
  await page.evaluate(() => {
    const view = globalThis.anchorRuntime.activeView;
    view.bridge.selectDefaultStart();
    view.bridge.addWaypointAt(view.bridge.sampleWaypointCell(), { action: 'sample' });
    globalThis.anchorRuntime.lifecycleController.launchSimulation();
  });
  await page.waitForSelector('.three-mission-world-canvas', { timeout: 15_000 });
  await page.waitForFunction(() => globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.activeBackend === 'threeMission3d' && globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true, null, { timeout: 15_000 });
  const before = await page.evaluate(() => globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.simulationTimeSeconds ?? 0);
  await page.evaluate(() => globalThis.anchorRuntime.activeView.controller.stepOnce());
  await page.waitForFunction((t) => (globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.simulationTimeSeconds ?? 0) > t, before, { timeout: 15_000 });
  const debug = await page.evaluate(() => globalThis.ANCHOR_SIMULATION_RENDER_DEBUG);
  assert.equal(debug.activeBackend, 'threeMission3d');
  assert.equal(debug.phaserWorldRendererActive, false);
  assert.equal(debug.ownsSimulationState, false);
  assert.equal(debug.advancesSimulationClock, false);
  assert.equal(debug.computesVehicleMotion, false);
  assert.equal(debug.generatesObservations, false);
  assert.equal(debug.ownsScoring, false);
  assert.ok(debug.realizedTrajectoryPointCount >= 1);
  console.log('smoke_three_default_simulation_runtime: ok', { time: debug.simulationTimeSeconds, points: debug.realizedTrajectoryPointCount });
  await page.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
