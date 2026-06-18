import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const server = await startStaticServer({ port: 9332 });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await page.goto('http://127.0.0.1:9332/');
  await page.waitForSelector('#main-menu-hub');
  await page.evaluate(() => globalThis.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await page.waitForFunction(() => globalThis.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys?.isActive?.() === true);
  await page.evaluate(() => globalThis.anchorGame.phaser.scene.getScene('MissionBriefingScene').startPlanning());
  await page.waitForFunction(() => globalThis.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d');
  await page.evaluate(() => {
    const scene = globalThis.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.trySelectDeploymentStart?.({ x: 1, y: 1 });
    scene.addWaypointForSelected({ x: 2, y: 2, action: 'sample' });
    scene.addWaypointForSelected({ x: 5, y: 5, action: 'sample' });
    scene.executePlan();
  });
  await page.waitForFunction(() => globalThis.anchorGame.phaser.scene.getScene('SimulationScene')?.sys?.isActive?.() === true, null, { timeout: 15_000 });
  await page.waitForFunction(() => globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.activeBackend === 'threeMission3d' && globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true, null, { timeout: 15_000 });
  const before = await page.evaluate(() => globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.simulationTimeSeconds ?? 0);
  await page.evaluate(() => globalThis.anchorGame.phaser.scene.getScene('SimulationScene').engine.play());
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
