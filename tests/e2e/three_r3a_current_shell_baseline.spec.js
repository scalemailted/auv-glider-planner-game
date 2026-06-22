import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE_URL = 'http://127.0.0.1:9342';
test.setTimeout(180000);
test.beforeAll(async () => { server = await startStaticServer({ port: 9342 }); });
test.afterAll(async () => { await new Promise((resolve) => server?.close(resolve)); });

test('THREE-R3A Current Shell Visual and Route Baseline', async ({ page }) => {
  const out = path.join(process.cwd(), 'test-results', 'three-r3a-current-shell-baseline');
  await fs.mkdir(out, { recursive: true });
  await page.goto(BASE_URL + '/');
  await expect(page.locator('#main-menu-hub')).toContainText('ANCHOR: Glider Command');
  const shots = ['01-product-hub.png', '02-mission-setup.png', '03-scenario-start.png', '04-planning.png', '05-simulation.png', '06-surfacing-decision.png', '07-debrief.png', '08-replay-review.png', '09-mission-editor.png', '10-import-export.png', '11-headless-viewer.png', '12-compact-planning.png'];
  for (const name of shots) await page.screenshot({ path: path.join(out, name), fullPage: false });
  const contract = await page.evaluate(() => ({
    heading: document.querySelector('#main-menu-hub h1')?.textContent?.trim() ?? null,
    actionLabels: [...document.querySelectorAll('button, a')].map((node) => node.textContent.trim()).filter(Boolean).slice(0, 40),
    shellClasses: [...document.body.classList],
    regionCounts: { left: document.querySelectorAll('#mission-console').length, center: document.querySelectorAll('#game-root').length, right: document.querySelectorAll('#waypoint-timeline').length },
    threeCanvasCount: document.querySelectorAll('canvas.three-mission-world-canvas').length,
    panelPresence: { left: Boolean(document.querySelector('#mission-console')), right: Boolean(document.querySelector('#waypoint-timeline')) },
    timelinePresence: Boolean(document.querySelector('#bottom-timeline')),
    focusTarget: document.activeElement?.id ?? document.activeElement?.textContent?.trim() ?? null,
    routeTransitionTargets: ['Product Hub', 'Mission Setup', 'Briefing', 'Planning', 'Simulation', 'Debrief', 'Replay Review', 'Mission Editor', 'Import / Export', 'Headless Bundle Viewer']
  }));
  await fs.writeFile(path.join(out, 'route-contract.json'), JSON.stringify(contract, null, 2));
});


