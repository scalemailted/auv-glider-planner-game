import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';

let server;
const baseUrl = 'http://127.0.0.1:9323';

test.setTimeout(180000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9323 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Three Mission Editor Opens Existing Mission Without Schema Drift', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEditor(page);
  const debug = await editorDebug(page);
  expect(debug.normalEditorUsesThree).toBe(true);
  expect(debug.usesLegacyPhaserWorldRenderer).toBe(false);
  expect(debug.canonicalDocumentAuthority).toBe(true);
  expect(debug.validation.status).toBe('VALID');
  expect(debug.editorDocument.gridWidth).toBeGreaterThanOrEqual(8);
  expect(debug.editorDocument.frameCount).toBeGreaterThan(0);
  const drift = await page.evaluate(async () => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    const { missionEditorDocumentDigest, missionEditorDocumentForExport, createMissionEditorDocument } = await import('/src/core/editor/MissionEditorDocument.js');
    const before = missionEditorDocumentDigest(scene.editorDocument);
    const exported = missionEditorDocumentForExport(scene.editorDocument);
    const reimported = createMissionEditorDocument({ level: exported, mission: exported.missionDefaults });
    return { before, after: missionEditorDocumentDigest(scene.editorDocument), exportedType: exported.type, reimportedType: reimported.type };
  });
  expect(drift.before).toBe(drift.after);
  expect(drift.exportedType).toBe('anchor.level');
  expect(drift.reimportedType).toBe('anchor.editor.mission-document');
  errors.assertClean();
});

test('Three Mission Editor Supports Canonical Terrain and Mission Object Editing', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEditor(page);
  const before = await editorDebug(page);
  await applyEditorIntent(page, { brush: 'terrain', x: 2, y: 2 });
  await applyEditorIntent(page, { brush: 'hazard', x: 3, y: 3 });
  await applyEditorIntent(page, { brush: 'deploymentZone', x: 4, y: 4 });
  await applyEditorIntent(page, { brush: 'agentStart', x: 5, y: 5 });
  const state = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    return {
      terrain: scene.level.layers.terrain[2][2],
      hazard: scene.level.layers.hazards[3][3],
      deploymentCells: scene.level.zones?.find((zone) => zone.type === 'deployment')?.cells?.length ?? 0,
      agentStart: scene.mission.agents[0].start,
      commandCount: scene.editorSession.commandCount,
      rendererOwnsEditorState: window.ANCHOR_MISSION_EDITOR_DEBUG?.rendererOwnsEditorState
    };
  });
  expect(state.terrain).toBe(1);
  expect(state.hazard).toBe(1);
  expect(state.deploymentCells).toBeGreaterThan(0);
  expect(state.agentStart).toEqual({ x: 5, y: 5 });
  expect(state.commandCount).toBeGreaterThan(before.session.commandCount);
  expect(state.rendererOwnsEditorState).toBe(false);
  errors.assertClean();
});

test('Three Mission Editor Preserves Continuous and Legacy Cell Coordinates', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEditor(page);
  await page.locator('[data-brush="hazard"]').click();
  const canvas = page.locator('.three-mission-editor-host .three-mission-world-canvas');
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box.x + box.width * 0.52, box.y + box.height * 0.48);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene')?.editorSession?.commandCount ?? 0), { timeout: 10000 }).toBeGreaterThan(0);
  const coords = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    const intent = scene.lastEditorIntent;
    return {
      gridCell: intent?.gridCell,
      continuousPoint: intent?.continuousPoint,
      legacyLayout: scene.app.adapter.layout ? { width: scene.app.adapter.layout.width, height: scene.app.adapter.layout.height, cell: scene.app.adapter.layout.cell } : null,
      resultCell: scene.threeEditorController?.lastCommandResult?.interactionResult?.committedGridCell ?? null
    };
  });
  expect(coords.gridCell?.x).toEqual(expect.any(Number));
  expect(coords.gridCell?.y).toEqual(expect.any(Number));
  expect(coords.continuousPoint?.derivedCell?.x).toBe(coords.gridCell.x);
  expect(coords.continuousPoint?.derivedCell?.y).toBe(coords.gridCell.y);
  expect(coords.legacyLayout.width).toBeGreaterThanOrEqual(8);
  expect(coords.resultCell.x).toBe(coords.gridCell.x);
  errors.assertClean();
});

test('Three Mission Editor Export Reimport Roundtrip Is Lossless', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEditor(page);
  await applyEditorIntent(page, { brush: 'hazard', x: 3, y: 3 });
  const roundtrip = await page.evaluate(async () => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    const { missionEditorDocumentForExport, createMissionEditorDocument } = await import('/src/core/editor/MissionEditorDocument.js');
    const { validateMissionEditorDocument } = await import('/src/core/editor/MissionEditorValidation.js');
    const exported = missionEditorDocumentForExport(scene.editorDocument, { exportedAt: '2026-06-21T00:00:00.000Z' });
    const reimported = createMissionEditorDocument({ level: exported, mission: exported.missionDefaults });
    const report = validateMissionEditorDocument(reimported);
    return {
      valid: report.valid,
      type: exported.type,
      editorMetadata: exported.meta.threeMissionEditor,
      hazard: reimported.level.layers.hazards[3][3],
      agentCount: reimported.mission.agents.length,
      frameCount: reimported.level.layers.truth.frames.length,
      sameGrid: exported.world.grid.width === reimported.level.world.grid.width && exported.world.grid.height === reimported.level.world.grid.height
    };
  });
  expect(roundtrip.valid).toBe(true);
  expect(roundtrip.type).toBe('anchor.level');
  expect(roundtrip.editorMetadata.rendererOwnsState).toBe(false);
  expect(roundtrip.editorMetadata.calibratedOceanForecast).toBe(false);
  expect(roundtrip.hazard).toBe(1);
  expect(roundtrip.agentCount).toBeGreaterThan(0);
  expect(roundtrip.frameCount).toBeGreaterThan(0);
  expect(roundtrip.sameGrid).toBe(true);
  errors.assertClean();
});

test('Three Mission Editor Preview Uses Production Mission Lifecycle', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEditor(page);
  const preview = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    scene.playLevelFromHud();
    return { source: scene.app.state.scenario?.source ?? scene.app.state.source ?? null, mode: scene.app.state.mode };
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.isActive('MissionBriefingScene')), { timeout: 15000 }).toBe(true);
  const briefing = await page.evaluate(() => ({
    active: window.anchorGame.phaser.scene.isActive('MissionBriefingScene'),
    levelType: window.anchorGame.state.level?.type,
    missionType: window.anchorGame.state.mission?.type,
    source: window.anchorGame.state.scenario?.source ?? window.anchorGame.state.source ?? null
  }));
  expect(briefing.active).toBe(true);
  expect(briefing.levelType).toBe('anchor.level');
  expect(briefing.missionType).toBe('anchor.mission');
  expect(['editor', 'briefing', 'planning'].includes(preview.mode)).toBeTruthy();
  errors.assertClean();
});

test('Three Mission Editor Validation Blocks Invalid Export and Preview', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEditor(page);
  const blocked = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    scene.level.meta ??= {};
    scene.level.meta.calibratedOceanForecast = true;
    const previewAllowed = scene.ensureEditorActionAllowed('preview');
    const exportAllowed = scene.ensureEditorActionAllowed('export');
    return { previewAllowed, exportAllowed, debug: window.ANCHOR_MISSION_EDITOR_DEBUG };
  });
  expect(blocked.previewAllowed).toBe(false);
  expect(blocked.exportAllowed).toBe(false);
  expect(blocked.debug.validation.valid).toBe(false);
  expect(blocked.debug.blockedAction).toBe('export');
  expect(await page.evaluate(() => window.anchorGame.phaser.scene.isActive('EnvironmentEditorScene'))).toBe(true);
  errors.assertClean();
});

test('Three Mission Editor Resources Dispose Across Scene Transitions', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEditor(page);
  expect((await editorDebug(page)).activeRendererCount).toBe(1);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').scene.start('MainMenuScene'));
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  const cleanup = await page.evaluate(() => ({
    debug: window.ANCHOR_MISSION_EDITOR_DEBUG,
    retirement: window.ANCHOR_PHASER_RETIREMENT_DEBUG,
    canvases: document.querySelectorAll('.three-mission-world-canvas').length,
    hosts: document.querySelectorAll('.three-mission-world-host').length
  }));
  expect(cleanup.debug.activeRendererCount).toBe(0);
  expect(cleanup.debug.activeControllerCount).toBe(0);
  expect(cleanup.debug.activeDomListenerCount).toBe(0);
  expect(cleanup.debug.activeRafCount).toBe(0);
  expect(cleanup.canvases).toBe(0);
  expect(cleanup.hosts).toBe(0);
  expect(cleanup.retirement.phaserDependencyStillRequired).toBe(true);
  errors.assertClean();
});

test('Production Mission Routes Do Not Instantiate Legacy Phaser World Renderers', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEditor(page);
  const debug = await editorDebug(page);
  expect(debug.normalEditorUsesThree).toBe(true);
  expect(debug.usesLegacyPhaserWorldRenderer).toBe(false);
  expect(debug.renderer?.renderer).toBe('three');
  expect(debug.renderer?.changesMissionState).toBe(false);
  const audit = await page.evaluate(() => window.ANCHOR_PHASER_RETIREMENT_DEBUG);
  expect(audit.phaserDependencyStillRequired).toBe(true);
  expect(audit.readyForFinalPhaserRemoval).toBe(false);
  expect(audit.activeLegacyPhaserEditorWorldRendererCount).toBe(0);
  errors.assertClean();
});

test('Browser and Headless Validate Edited Mission Identically', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openEditor(page);
  await applyEditorIntent(page, { brush: 'hazard', x: 3, y: 3 });
  const parity = await page.evaluate(async () => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    const { missionEditorDocumentForExport } = await import('/src/core/editor/MissionEditorDocument.js');
    const { validateMissionEditorDocument, validateMissionEditorExport } = await import('/src/core/editor/MissionEditorValidation.js');
    const browser = validateMissionEditorDocument(scene.editorDocument);
    const exported = missionEditorDocumentForExport(scene.editorDocument);
    const headless = validateMissionEditorExport(exported, exported.missionDefaults);
    return {
      browser: { valid: browser.valid, status: browser.status, grid: browser.summary.gridWidth + 'x' + browser.summary.gridHeight, agents: browser.summary.agentCount },
      headless: { valid: headless.valid, status: headless.status, grid: headless.summary.gridWidth + 'x' + headless.summary.gridHeight, agents: headless.summary.agentCount },
      hiddenTruthExcluded: exported.meta.threeMissionEditor.rendererOwnsState === false && exported.meta.threeMissionEditor.calibratedOceanForecast === false
    };
  });
  expect(parity.browser).toEqual(parity.headless);
  expect(parity.hiddenTruthExcluded).toBe(true);
  errors.assertClean();
});

async function openEditor(page) {
  await page.goto(baseUrl + '/');
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => window.anchorGame.phaser.scene.start('EnvironmentEditorScene'));
  await expect(page.locator('.three-mission-editor-host .three-mission-world-canvas')).toBeVisible({ timeout: 20000 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_EDITOR_DEBUG?.activeRendererCount ?? 0), { timeout: 20000 }).toBe(1);
}

async function editorDebug(page) {
  return page.evaluate(() => window.ANCHOR_MISSION_EDITOR_DEBUG);
}

async function applyEditorIntent(page, { brush, x, y }) {
  const before = await page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene')?.editorSession?.commandCount ?? 0);
  const result = await page.evaluate(({ brush, x, y }) => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    return scene.handleEditorDebugIntent({
      intentId: brush === 'current' ? 'editCurrentVector' : 'applyBrush',
      brush,
      gridCell: { x, y },
      startCell: { x, y },
      endCell: { x: x + 1, y },
      payload: { brush, gridCell: { x, y }, startCell: { x, y }, endCell: { x: x + 1, y }, config: scene.readBrushConfig() }
    });
  }, { brush, x, y });
  expect(result.accepted).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene')?.editorSession?.commandCount ?? 0), { timeout: 10000 }).toBeGreaterThan(before);
}

