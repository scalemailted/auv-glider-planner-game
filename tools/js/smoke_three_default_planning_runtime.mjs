import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const server = await startStaticServer({ port: 9331 });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await page.goto('http://127.0.0.1:9331/');
  await page.waitForSelector('#main-menu-hub');
  await page.evaluate(() => globalThis.anchorRuntime.lifecycleController.loadTutorialMission('tutorial_01_first_deployment'));
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_LIFECYCLE_DEBUG?.summary?.state === 'briefing');
  await page.evaluate(() => globalThis.anchorRuntime.lifecycleController.beginPlanning());
  await page.waitForSelector('.three-mission-world-canvas', { timeout: 15_000 });
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d' && globalThis.ANCHOR_MISSION_RENDER_DEBUG?.threeMounted === true);
  const debug = await page.evaluate(() => ({
    render: globalThis.ANCHOR_MISSION_RENDER_DEBUG,
    runtime: globalThis.ANCHOR_APP_RUNTIME_DEBUG,
    legacyButtons: document.querySelectorAll('#mission-console [data-action="renderer-legacy"]').length,
    phaserLoaded: Boolean(globalThis.Phaser)
  }));
  assert.equal(debug.render.activeBackend, 'threeMission3d');
  assert.equal(debug.render.phaserWorldRendererActive, false);
  assert.equal(debug.render.interactionEnabled, true);
  assert.equal(debug.runtime?.normalRoutesInstantiatePhaser, false);
  assert.equal(debug.legacyButtons, 0, 'normal UI hides legacy renderer control');
  console.log('smoke_three_default_planning_runtime: ok', { backend: debug.render.activeBackend, phaserLoaded: debug.phaserLoaded });
  await page.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
