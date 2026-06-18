import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const server = await startStaticServer({ port: 9331 });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await page.goto('http://127.0.0.1:9331/');
  await page.waitForSelector('#main-menu-hub');
  await page.evaluate(() => globalThis.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await page.waitForFunction(() => globalThis.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys?.isActive?.() === true);
  await page.evaluate(() => globalThis.anchorGame.phaser.scene.getScene('MissionBriefingScene').startPlanning());
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d' && globalThis.ANCHOR_MISSION_RENDER_DEBUG?.threeMounted === true);
  const debug = await page.evaluate(() => ({ render: globalThis.ANCHOR_MISSION_RENDER_DEBUG, migration: globalThis.ANCHOR_MIGRATION_DEBUG, legacyButtons: document.querySelectorAll('#mission-console [data-action="renderer-legacy"]').length }));
  assert.equal(debug.render.activeBackend, 'threeMission3d');
  assert.equal(debug.render.phaserWorldRendererActive, false);
  assert.equal(debug.render.interactionEnabled, true);
  assert.equal(debug.legacyButtons, 0, 'normal UI hides legacy renderer control');
  assert.equal(debug.migration.architectureTarget, 'threejs-first');
  assert.equal(debug.migration.threePlanningDefault, true);
  assert.equal(debug.migration.legacyPhaserFallbackEnabled, false);
  console.log('smoke_three_default_planning_runtime: ok', { backend: debug.render.activeBackend });
  await page.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
