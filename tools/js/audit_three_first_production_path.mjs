import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const server = await startStaticServer({ port: 9333 });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await page.goto('http://127.0.0.1:9333/');
  await page.waitForSelector('#main-menu-hub');
  const initial = await page.evaluate(() => ({ phaserLoaded: Boolean(globalThis.Phaser), runtime: globalThis.ANCHOR_APP_RUNTIME_DEBUG }));
  assert.equal(initial.runtime?.normalRoutesInstantiatePhaser, false);
  await page.evaluate(() => globalThis.anchorRuntime.lifecycleController.loadTutorialMission('tutorial_01_first_deployment'));
  await page.evaluate(() => globalThis.anchorRuntime.lifecycleController.beginPlanning());
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d');
  await page.evaluate(() => {
    const view = globalThis.anchorRuntime.activeView;
    view.bridge.selectDefaultStart();
    view.bridge.addWaypointAt(view.bridge.sampleWaypointCell(), { action: 'sample' });
    globalThis.anchorRuntime.lifecycleController.launchSimulation();
  });
  await page.waitForFunction(() => globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.activeBackend === 'threeMission3d' && globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true);
  const state = await page.evaluate(() => ({ planning: globalThis.ANCHOR_MISSION_RENDER_DEBUG, simulation: globalThis.ANCHOR_SIMULATION_RENDER_DEBUG, runtime: globalThis.ANCHOR_APP_RUNTIME_DEBUG }));
  assert.equal(state.planning.phaserWorldRendererActive, false);
  assert.equal(state.simulation.phaserWorldRendererActive, false);
  assert.equal(state.simulation.advancesSimulationClock, false);
  assert.equal(state.runtime.normalRoutesUsePhaserUpdate, false);
  console.log('audit_three_first_production_path: ok');
  await page.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
