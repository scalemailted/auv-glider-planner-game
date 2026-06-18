import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const server = await startStaticServer({ port: 9333 });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await page.goto('http://127.0.0.1:9333/');
  await page.waitForSelector('#main-menu-hub');
  await page.evaluate(() => globalThis.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await page.waitForFunction(() => globalThis.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys?.isActive?.() === true);
  await page.evaluate(() => globalThis.anchorGame.phaser.scene.getScene('MissionBriefingScene').startPlanning());
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d');
  await page.evaluate(() => {
    const scene = globalThis.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.trySelectDeploymentStart?.({ x: 1, y: 1 });
    scene.addWaypointForSelected({ x: 2, y: 2, action: 'sample' });
    scene.executePlan();
  });
  await page.waitForFunction(() => globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.activeBackend === 'threeMission3d' && globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true);
  const state = await page.evaluate(() => ({ planning: globalThis.ANCHOR_MISSION_RENDER_DEBUG, simulation: globalThis.ANCHOR_SIMULATION_RENDER_DEBUG, migration: globalThis.ANCHOR_MIGRATION_DEBUG }));
  assert.equal(state.planning.phaserWorldRendererActive, false);
  assert.equal(state.simulation.phaserWorldRendererActive, false);
  assert.equal(state.simulation.advancesSimulationClock, false);
  assert.equal(state.migration.architectureTarget, 'threejs-first');
  console.log('audit_three_first_production_path: ok');
  await page.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
