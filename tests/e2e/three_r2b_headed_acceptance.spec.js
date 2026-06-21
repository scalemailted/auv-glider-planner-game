import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';

const REVIEW_DIR = path.resolve('test-results/three-r2b-owner-review');
const SERVER_PORT = Number(process.env.THREE_R2B_ACCEPTANCE_PORT ?? 9333);
const OWNER_REVIEW_RUN = process.argv.includes('--headed') || process.env.ANCHOR_OWNER_REVIEW === '1';
const baseUrl = `http://127.0.0.1:${SERVER_PORT}`;
const PRIMARY_VIEWPORT = { width: 1920, height: 1080 };
const COMPACT_VIEWPORT = { width: 1366, height: 768 };
let server;

test.setTimeout(180000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: SERVER_PORT });
  await fs.mkdir(REVIEW_DIR, { recursive: true });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('THREE-R2B Full Headed Mission Editor Walkthrough', async ({ page, browser }, testInfo) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const ownerReviewRun = OWNER_REVIEW_RUN || testInfo.project.use?.headless === false;
  const screenshots = [];
  await page.setViewportSize(PRIMARY_VIEWPORT);
  await openEditor(page);
  await capture(page, screenshots, '01-editor-open.png');

  await page.locator('[data-brush="terrain"]').click();
  await clickCanvasCell(page, 0.42, 0.46);
  await capture(page, screenshots, '02-editor-terrain.png');

  await applyEditorIntent(page, { brush: 'deploymentZone', x: 4, y: 4 });
  await capture(page, screenshots, '03-editor-drop-zone.png');

  await page.locator('[data-brush="hazard"]').click();
  await clickCanvasCell(page, 0.55, 0.52);
  await capture(page, screenshots, '04-editor-hazard.png');

  await applyEditorIntent(page, { brush: 'roi', x: 6, y: 6, payload: { id: 'owner_review_objective', label: 'Owner review objective' } });
  await capture(page, screenshots, '05-editor-objective.png');

  await applyEditorCommand(page, 'addSamplingTarget', {
    gridCell: { x: 7, y: 6 },
    brush: 'roi',
    id: 'owner_review_sampling_target',
    label: 'Owner review sampling target',
    depthLayerId: 'surface'
  });
  await capture(page, screenshots, '06-editor-sampling-target.png');

  await applyEditorIntent(page, { brush: 'agentStart', x: 5, y: 5 });
  await page.locator('#depth-variation').fill('0.55');
  await page.locator('#current-pattern').selectOption('vortex');
  await capture(page, screenshots, '07-editor-water-column.png');

  const blocked = await makeInvalidForPreview(page);
  await capture(page, screenshots, '08-editor-invalid-validation.png');
  const repaired = await repairInvalidForPreview(page);
  await capture(page, screenshots, '09-editor-repaired-validation.png');

  const performance = await sampleEditorRafPerformance(page, 1200);
  const liveDebug = await editorDebug(page);

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').playLevelFromHud());
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.isActive('MissionBriefingScene')), { timeout: 15000 }).toBe(true);
  await page.locator('[data-action="start"]').first().click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.isActive('MissionWorkspaceScene')), { timeout: 15000 }).toBe(true);
  await expect(page.locator('.three-mission-world-canvas')).toBeVisible({ timeout: 20000 });
  await capture(page, screenshots, '10-editor-preview-planning.png');

  await page.evaluate(() => window.anchorGame.phaser.scene.start('EnvironmentEditorScene'));
  await expect(page.locator('.three-mission-editor-host .three-mission-world-canvas')).toBeVisible({ timeout: 20000 });
  const roundtrip = await exportRoundtrip(page);
  await capture(page, screenshots, '11-editor-export-reimport.png');

  await returnToMainMenu(page);

  await capture(page, screenshots, '12-main-menu-cleanup.png');

  await page.setViewportSize(COMPACT_VIEWPORT);
  await openEditor(page);
  await page.waitForTimeout(500);
  await capture(page, screenshots, '13-compact-editor-layout.png');
  await returnToMainMenu(page);


  const cleanup = await page.evaluate(() => ({
    editorDebug: window.ANCHOR_MISSION_EDITOR_DEBUG,
    retirement: window.ANCHOR_PHASER_RETIREMENT_DEBUG,
    canvasCount: document.querySelectorAll('.three-mission-world-canvas').length,
    hostCount: document.querySelectorAll('.three-mission-world-host').length
  }));
  const errors = browserErrors.unexpected();
  const performanceGatePassed = performance.averageFrameMilliseconds <= 50
    && performance.p95FrameMilliseconds <= 100
    && performance.renderedFramesPerSecond >= 20;
  const qa = {
    phase: 'THREE-R2B Mission Editor Acceptance',
    browser: browser.browserType().name(),
    browserVersion: browser.version(),
    primaryViewport: PRIMARY_VIEWPORT,
    compactViewport: COMPACT_VIEWPORT,
    dpr: await page.evaluate(() => window.devicePixelRatio),
    screenshots,
    sourceDigest: liveDebug.editorDocument?.sourceDigest ?? null,
    exportDigest: roundtrip.exportDigest ?? null,
    reimportDigest: roundtrip.reimportDigest ?? null,
    documentSchema: roundtrip.documentSchema,
    editorCommandsExercised: ['paintLand', 'addDropZone', 'addHazard', 'addObjective', 'addSamplingTarget', 'setGliderStart'],
    validationStatuses: { invalid: blocked.status, repaired: repaired.status, roundtrip: roundtrip.status },
    objectCounts: liveDebug.viewModel?.missionWorld ?? null,
    roundtrip,
    blocked,
    repaired,
    debug: liveDebug,
    cleanup,
    performance,
    performanceGateRequired: ownerReviewRun,
    performanceGatePassed,
    browserErrors: errors,
    pass: roundtrip.valid === true
      && blocked.allowed === false
      && repaired.valid === true
      && liveDebug.normalEditorUsesThree === true
      && liveDebug.usesLegacyPhaserWorldRenderer === false
      && cleanup.canvasCount === 0
      && cleanup.hostCount === 0
      && (!ownerReviewRun || performanceGatePassed)
      && errors.length === 0
  };
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), JSON.stringify(qa, null, 2));
  expect(qa.pass).toBe(true);
  expect(cleanup.canvasCount).toBe(0);
  expect(cleanup.hostCount).toBe(0);
  expect(liveDebug.normalEditorUsesThree).toBe(true);
  expect(liveDebug.usesLegacyPhaserWorldRenderer).toBe(false);
  if (ownerReviewRun) {
    expect(qa.performance.averageFrameMilliseconds).toBeLessThanOrEqual(50);
    expect(qa.performance.p95FrameMilliseconds).toBeLessThanOrEqual(100);
    expect(qa.performance.renderedFramesPerSecond).toBeGreaterThanOrEqual(20);
  }
  browserErrors.assertClean();
});


async function returnToMainMenu(page) {
  await page.evaluate(() => {
    const manager = window.anchorGame.phaser.scene;
    for (const key of ['EnvironmentEditorScene', 'MissionWorkspaceScene', 'MissionBriefingScene', 'SimulationScene', 'DebriefScene', 'MissionReplayReviewScene']) {
      try { manager.stop(key); } catch {}
    }
    manager.start('MainMenuScene');
  });
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
}
async function openEditor(page) {
  await page.goto(baseUrl + '/');
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => window.anchorGame.phaser.scene.start('EnvironmentEditorScene'));
  await expect(page.locator('.three-mission-editor-host .three-mission-world-canvas')).toBeVisible({ timeout: 20000 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_EDITOR_DEBUG?.activeRendererCount ?? 0), { timeout: 20000 }).toBe(1);
}

async function capture(page, screenshots, fileName) {
  const full = path.join(REVIEW_DIR, fileName);
  await page.screenshot({ path: full, fullPage: false });
  screenshots.push(path.join('test-results/three-r2b-owner-review', fileName).replace(/\\/g, '/'));
}

async function clickCanvasCell(page, xFraction, yFraction) {
  const box = await page.locator('.three-mission-editor-host .three-mission-world-canvas').boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box.x + box.width * xFraction, box.y + box.height * yFraction);
}

async function applyEditorIntent(page, { brush, x, y, payload = {} }) {
  const result = await page.evaluate(({ brush, x, y, payload }) => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    return scene.handleEditorDebugIntent({ intentId: 'applyBrush', brush, gridCell: { x, y }, payload: { ...payload, brush, gridCell: { x, y }, config: scene.readBrushConfig() } });
  }, { brush, x, y, payload });
  expect(result.accepted).toBe(true);
}

async function applyEditorCommand(page, commandType, payload) {
  const result = await page.evaluate(async ({ commandType, payload }) => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    const { createMissionEditorCommand } = await import('/src/core/editor/MissionEditorCommand.js');
    const { applyMissionEditorSessionCommand } = await import('/src/core/editor/MissionEditorSession.js');
    const command = createMissionEditorCommand(commandType, { ...payload, config: scene.readBrushConfig() }, { source: 'headedAcceptance' });
    const result = applyMissionEditorSessionCommand(scene.editorSession, command);
    scene.syncSceneFromEditorDocument(result.document, result);
    scene.publishEditorDebug({ lifecycle: 'headedAcceptanceCommand' });
    return result;
  }, { commandType, payload });
  expect(result.accepted).toBe(true);
}

async function makeInvalidForPreview(page) {
  return page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    scene.level.meta ??= {};
    scene.level.meta.calibratedOceanForecast = true;
    const allowed = scene.ensureEditorActionAllowed('preview');
    return {
      allowed,
      status: window.ANCHOR_MISSION_EDITOR_DEBUG.validation.status,
      firstIssue: window.ANCHOR_MISSION_EDITOR_DEBUG.validation.firstIssue
    };
  });
}

async function repairInvalidForPreview(page) {
  return page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    scene.level.meta ??= {};
    scene.level.meta.calibratedOceanForecast = false;
    scene.syncEditorDocumentFromScene();
    scene.publishEditorDebug({ lifecycle: 'ownerReviewRecovered' });
    return {
      valid: window.ANCHOR_MISSION_EDITOR_DEBUG.validation.valid,
      status: window.ANCHOR_MISSION_EDITOR_DEBUG.validation.status,
      exportAllowed: window.ANCHOR_MISSION_EDITOR_DEBUG.validation.exportAllowed,
      previewAllowed: window.ANCHOR_MISSION_EDITOR_DEBUG.validation.previewAllowed
    };
  });
}

async function exportRoundtrip(page) {
  return page.evaluate(async () => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    const { missionEditorDocumentForExport, createMissionEditorDocument, missionEditorDocumentDigest } = await import('/src/core/editor/MissionEditorDocument.js');
    const { validateMissionEditorDocument } = await import('/src/core/editor/MissionEditorValidation.js');
    const exported = missionEditorDocumentForExport(scene.editorDocument, { exportedAt: '2026-06-21T00:00:00.000Z' });
    const reimported = createMissionEditorDocument({ level: exported, mission: exported.missionDefaults });
    const report = validateMissionEditorDocument(reimported);
    function collectHiddenLeakPaths(value, path = 'level') {
      const blockedKey = /^(solverHidden|hiddenTruth|t_hiddenTruth|oracleDebug|debugHiddenTruth)$/i;
      const blockedValue = /\b(t_hiddentruth|oracledebug)\b/i;
      const paths = [];
      const forbiddenHiddenValue = (node) => {
        if (node == null || node === false) return false;
        if (typeof node === 'number') return node !== 0;
        if (typeof node === 'string') return node.trim().length > 0;
        if (Array.isArray(node)) return node.length > 0;
        if (typeof node === 'object') return Object.keys(node).length > 0;
        return Boolean(node);
      };
      const visit = (node, nodePath) => {
        if (node == null) return;
        if (typeof node === 'string') {
          if (blockedValue.test(node)) paths.push(`${nodePath}=string:${node}`);
          return;
        }
        if (typeof node !== 'object') return;
        if (Array.isArray(node)) {
          node.forEach((child, index) => visit(child, `${nodePath}[${index}]`));
          return;
        }
        for (const [key, child] of Object.entries(node)) {
          const childPath = `${nodePath}.${key}`;
          if (blockedKey.test(key) && forbiddenHiddenValue(child)) paths.push(childPath);
          visit(child, childPath);
        }
      };
      visit(value, path);
      return paths;
    }
    return {
      valid: report.valid,
      status: report.status,
      issues: report.issues?.map((issue) => ({ code: issue.code, message: issue.message, path: issue.path })) ?? [],
      levelId: exported.levelId,
      missionId: exported.missionDefaults?.missionId ?? null,
      calibratedOceanForecast: exported.meta.threeMissionEditor.calibratedOceanForecast,
      rendererOwnsState: exported.meta.threeMissionEditor.rendererOwnsState,
      exportDigest: missionEditorDocumentDigest(scene.editorDocument),
      reimportDigest: missionEditorDocumentDigest(reimported),
      hiddenLeakPaths: collectHiddenLeakPaths(exported),
      documentSchema: {
        sourceType: scene.editorDocument?.sourceType ?? null,
        sourceSchemaType: scene.editorDocument?.sourceSchemaType ?? null,
        sourceSchemaVersion: scene.editorDocument?.sourceSchemaVersion ?? null
      }
    };
  });
}

async function editorDebug(page) {
  return page.evaluate(() => window.ANCHOR_MISSION_EDITOR_DEBUG);
}

async function sampleEditorRafPerformance(page, durationMilliseconds = 1200) {
  return page.evaluate((durationMilliseconds) => new Promise((resolve) => {
    const samples = [];
    const start = performance.now();
    let previous = start;
    function tick(now) {
      samples.push(Math.max(0, now - previous));
      previous = now;
      if (now - start >= durationMilliseconds) {
        const sorted = [...samples].sort((a, b) => a - b);
        const total = samples.reduce((sum, value) => sum + value, 0);
        const average = total / Math.max(1, samples.length);
        const p = (q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((q / 100) * sorted.length) - 1))] ?? 0;
        resolve({
          source: 'headed-editor-requestAnimationFrame-sample',
          sampleCount: samples.length,
          averageFrameMilliseconds: Number(average.toFixed(3)),
          p50FrameMilliseconds: Number(p(50).toFixed(3)),
          p95FrameMilliseconds: Number(p(95).toFixed(3)),
          p99FrameMilliseconds: Number(p(99).toFixed(3)),
          maximumFrameMilliseconds: Number((sorted[sorted.length - 1] ?? 0).toFixed(3)),
          renderedFramesPerSecond: Number((1000 / Math.max(average, 0.001)).toFixed(3))
        });
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }), durationMilliseconds);
}










