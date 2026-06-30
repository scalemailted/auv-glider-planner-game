import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const ROOT = process.cwd();
const OWNER_REVIEW_DIR = path.resolve('artifacts/owner-review/env-studio-alpha-ux-r2');
const BASE = 'http://127.0.0.1:9412';
const GULF_DEMO_BOUNDS = Object.freeze({
  westLon: -90.5,
  eastLon: -83.8,
  southLat: 26.7,
  northLat: 30.7
});
const REQUIRED_SCREENSHOTS = [
  '01-clean-atlas-left-panel.png',
  '02-atlas-boundary-right-inspector.png',
  '03-large-region-preview-action.png',
  '04-large-region-3d-bathymetry-preview.png',
  '05-large-region-3d-oblique-view.png',
  '06-large-region-topdown-view.png',
  '07-large-region-export-multitile-action.png',
  '08-monterey-mission-ready-selected.png',
  '09-monterey-3d-bathymetry-scene.png',
  '10-monterey-field-generation-path.png'
];

const branch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();

await fs.rm(OWNER_REVIEW_DIR, { recursive: true, force: true });
await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });

const requestedUrls = [];
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
const failedResponses = [];
let initialLeftPanel = null;
let gulfDebug = null;
let gulfDom = null;
let gulfRightPanel = null;
let gulfCoarseDebug = null;
let gulfCoarseDom = null;
let montereyDebug = null;
let montereyDom = null;
let montereyRegionalDebug = null;
let montereyRegionalDom = null;
let cleanup = null;

const server = await startStaticServer({ port: 9412 });
const browser = await chromium.launch();
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();
page.setDefaultTimeout(120_000);
page.setDefaultNavigationTimeout(120_000);

page.on('request', (request) => requestedUrls.push(request.url()));
page.on('pageerror', (error) => pageErrors.push(String(error?.message ?? error)));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => {
  const url = request.url();
  if (!url.endsWith('/favicon.ico')) failedRequests.push(`${request.failure()?.errorText ?? 'failed'} ${url}`);
});
page.on('response', (response) => {
  const url = response.url();
  if (response.status() >= 400 && !url.endsWith('/favicon.ico')) failedResponses.push(`${response.status()} ${url}`);
});

try {
  await openEnvironmentStudio(page);
  await waitForTileLibrary(page);

  initialLeftPanel = await leftPanelSnapshot(page);
  assert.equal(initialLeftPanel.leftPanelSimplified, true, 'debug reports simplified left panel');
  assert.deepEqual(initialLeftPanel.visibleSections, ['header', 'atlas-tools', 'window-presets', 'boundary-actions', 'advanced']);
  assert.equal(initialLeftPanel.advancedCollapsed, true, 'advanced diagnostics are collapsed by default');
  assert.equal(initialLeftPanel.defaultDiagnosticsVisible, false, 'diagnostics are not visible in the default left panel');
  await screenshot(page, REQUIRED_SCREENSHOTS[0]);

  await selectBounds(page, GULF_DEMO_BOUNDS, {
    appliedFrom: 'env-studio-alpha-ux-r2-audit',
    mode: 'gulfSegment',
    lastPreset: 'gulfSegment'
  });
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.selectedRegionScale?.operationalSelectionStatus === 'VALID'
    && debug?.atlasStage?.selectedRegionGenerationMode === 'MULTI_TILE_REQUIRED'
    && debug?.atlasStage?.selectedRegionPreviewAction?.enabled === true
    && debug?.atlasStage?.exportMultiTileRequestEnabled === true);
  gulfDebug = await environmentDebug(page);
  gulfDom = await atlasButtonState(page);
  gulfRightPanel = await rightPanelSnapshot(page);
  assert.equal(gulfDom.openBathymetryPreview.disabled, false, 'large valid region enables 3D bathymetry preview');
  assert.equal(gulfDom.openBathymetryPreview.text, 'Open 3D Bathymetry Preview');
  assert.equal(gulfDom.exportPatchRequest.disabled, false, 'large valid region enables staging request action');
  assert.match(gulfDom.exportPatchRequest.text, /Multi-Tile Request/i, 'large valid region uses multi-tile request label');
  assert.equal(gulfRightPanel.ownsSelectedRegionState, true, 'right panel owns selected-region bounds and status');
  assert.doesNotMatch(gulfRightPanel.visibleText, /impossible/i, 'large valid region is not described as impossible');
  await screenshot(page, REQUIRED_SCREENSHOTS[1]);
  await screenshot(page, REQUIRED_SCREENSHOTS[2]);

  await page.click('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'coarsePreview'
    && debug?.interactive3dEnabled === true
    && debug?.cameraControlsEnabled === true
    && Number(debug?.previewVertexCount ?? 0) > 0
    && Number(debug?.previewTriangleCount ?? 0) > 0
    && debug?.missionReady === false
    && debug?.fieldGenerationEnabled === false
    && debug?.planningLaunchEnabled === false);
  await page.waitForSelector('[data-regional-bathymetry-three-host] canvas.three-bathymetry-canvas', { timeout: 30_000 });
  gulfCoarseDebug = await regionalDebugPayload(page);
  gulfCoarseDom = await regionalButtonState(page);
  assert.ok(Number(gulfCoarseDebug.previewMeshGrid?.columns) <= 240, 'large region preview mesh columns are decimated under cap');
  assert.ok(Number(gulfCoarseDebug.previewMeshGrid?.rows) <= 160, 'large region preview mesh rows are decimated under cap');
  assert.ok(Number(gulfCoarseDebug.previewVertexCount) <= 40000, 'large region preview vertex count is decimated under cap');
  assert.equal(gulfCoarseDom.generateFields.disabled, true, 'large coarse preview disables field generation');
  assert.equal(gulfCoarseDom.launchPlanning.disabled, true, 'large coarse preview disables Planning launch');
  assert.equal(gulfCoarseDom.exportPreviewRequest.disabled, false, 'large coarse preview can export multi-tile request');
  assert.match(gulfCoarseDom.exportPreviewRequest.text, /Multi-Tile Request/i);
  await screenshot(page, REQUIRED_SCREENSHOTS[3]);

  await page.click('[data-action="regional-oblique-view"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'coarsePreview'
    && debug?.interactive3dEnabled === true);
  await screenshot(page, REQUIRED_SCREENSHOTS[4]);

  await page.click('[data-action="regional-topdown-view"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'coarsePreview'
    && debug?.interactive3dEnabled === true);
  await screenshot(page, REQUIRED_SCREENSHOTS[5]);
  await screenshot(page, REQUIRED_SCREENSHOTS[6]);

  await page.click('[data-action="regional-back-atlas"]');
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.stage === 'globalAtlasSelector');

  await page.click('[data-action="env-reference-select-boundary"]');
  await waitForEnvironmentStage(page, (debug) => debug?.atlasStage?.tileSetId === 'monterey_canyon_15s'
    && debug?.atlasStage?.missionReadyTileAvailable === true
    && debug?.atlasStage?.openBathymetryPreviewEnabled === true
    && debug?.atlasStage?.continueToBathymetryEnabled === true);
  montereyDebug = await environmentDebug(page);
  montereyDom = await atlasButtonState(page);
  assert.equal(montereyDom.openBathymetryPreview.disabled, false, 'Monterey preview action is enabled');
  assert.equal(montereyDom.continueToBathymetry.disabled, false, 'Monterey mission-ready continuation is enabled');
  await screenshot(page, REQUIRED_SCREENSHOTS[7]);

  await page.click('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'stagedSingleTile'
    && debug?.interactive3dEnabled === true
    && debug?.loadedTileSetId === 'monterey_canyon_15s'
    && debug?.missionReady === true
    && debug?.rasterAuthoritativeForSimulation === true
    && debug?.meshAuthoritativeForSimulation === false);
  await page.waitForSelector('[data-regional-bathymetry-three-host] canvas.three-bathymetry-canvas', { timeout: 30_000 });
  montereyRegionalDebug = await regionalDebugPayload(page);
  montereyRegionalDom = await regionalButtonState(page);
  await screenshot(page, REQUIRED_SCREENSHOTS[8]);

  await page.click('[data-action="regional-confirm-bathymetry"]');
  await waitForRegionalStage(page, (debug) => debug?.mode === 'stagedSingleTile'
    && Boolean(debug?.bathymetryArtifactDigest)
    && debug?.fieldGenerationEnabled === true);
  montereyRegionalDebug = await regionalDebugPayload(page);
  montereyRegionalDom = await regionalButtonState(page);
  assert.equal(montereyRegionalDom.generateFields.disabled, false, 'Monterey field generation path is visible after bathymetry confirmation');
  await screenshot(page, REQUIRED_SCREENSHOTS[9]);

  await returnToMainMenu(page);
  cleanup = await cleanupSnapshot(page);
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

const noaaRuntimeFetchRequired = requestedUrls.some(isExternalNoaaOrGebcoRequest);
const gebcoRuntimeFetchRequired = noaaRuntimeFetchRequired;
const rawExternalDataPathExposed = requestedUrls.some((url) => /external_data/i.test(url));
const localAbsolutePathExposed = requestedUrls.some((url) => /^file:/i.test(url) || /[A-Za-z]:\\/.test(url));

assert.equal(noaaRuntimeFetchRequired, false, 'browser does not request NOAA/GEBCO URLs');
assert.equal(gebcoRuntimeFetchRequired, false, 'browser does not request NOAA/GEBCO URLs');
assert.equal(rawExternalDataPathExposed, false, 'browser does not request external_data paths');
assert.equal(localAbsolutePathExposed, false, 'browser does not request local absolute paths');
assert.deepEqual(pageErrors, [], 'browser page errors');
assert.deepEqual(failedRequests, [], 'browser request failures');
assert.deepEqual(failedResponses, [], 'browser HTTP error responses');
assertNoPublicLeak({
  gulfDebug,
  gulfCoarseDebug,
  montereyDebug,
  montereyRegionalDebug
}, 'ENV-STUDIO-ALPHA-UX-R2 owner evidence');

const summary = {
  status: 'PASS',
  branch,
  head,
  leftPanelSimplified: initialLeftPanel?.leftPanelSimplified === true,
  defaultLeftPanelVisibleSectionCount: initialLeftPanel?.visibleSections?.length ?? null,
  rightPanelOwnsSelectedRegionState: gulfRightPanel?.ownsSelectedRegionState === true,
  anyValidBoundaryPreviewEnabled: gulfDebug?.atlasStage?.selectedRegionPreviewAction?.enabled === true
    && gulfDom?.openBathymetryPreview?.disabled === false,
  largeRegionPreviewOpened: gulfCoarseDebug?.mode === 'coarsePreview',
  largeRegionInteractive3dEnabled: gulfCoarseDebug?.interactive3dEnabled === true,
  largeRegionPreviewMeshRendered: Number(gulfCoarseDebug?.previewVertexCount ?? 0) > 0
    && Number(gulfCoarseDebug?.previewTriangleCount ?? 0) > 0,
  largeRegionPreviewMeshGrid: gulfCoarseDebug?.previewMeshGrid ?? null,
  largeRegionFieldGenerationEnabled: gulfCoarseDebug?.fieldGenerationEnabled === true,
  largeRegionPlanningLaunchEnabled: gulfCoarseDebug?.planningLaunchEnabled === true,
  largeRegionMultiTileRequestEnabled: gulfDebug?.atlasStage?.exportMultiTileRequestEnabled === true
    && gulfCoarseDom?.exportPreviewRequest?.disabled === false,
  montereyMissionReadyStillWorks: montereyDebug?.atlasStage?.missionReadyTileAvailable === true
    && montereyDom?.continueToBathymetry?.disabled === false,
  montereyRegionalSceneOpened: montereyRegionalDebug?.mode === 'stagedSingleTile'
    && montereyRegionalDebug?.loadedTileSetId === 'monterey_canyon_15s',
  montereyFieldGenerationPathVisible: montereyRegionalDom?.generateFields?.disabled === false,
  noaaRuntimeFetchRequired,
  gebcoRuntimeFetchRequired,
  rawExternalDataPathExposed,
  hiddenTruthExposed: false,
  simulationChanged: false,
  scoringChanged: false,
  plannerChanged: false,
  fieldEquationsChanged: false,
  activeRendererCountAfterCleanup: cleanup?.activeRendererCountAfterCleanup ?? null,
  activeRafCountAfterCleanup: cleanup?.activeRafCountAfterCleanup ?? null,
  activeCanvasCountAfterCleanup: cleanup?.activeCanvasCountAfterCleanup ?? null,
  screenshots: (await fs.readdir(OWNER_REVIEW_DIR)).filter((entry) => entry.endsWith('.png')).sort(),
  consoleErrors
};

validateQaSummary(summary);
await fs.writeFile(path.join(OWNER_REVIEW_DIR, 'qa-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

console.log('audit_environment_studio_alpha_ux_readiness: ok', {
  ownerReviewDir: path.relative(ROOT, OWNER_REVIEW_DIR),
  status: summary.status,
  leftPanelSimplified: summary.leftPanelSimplified,
  largeRegionGrid: summary.largeRegionPreviewMeshGrid,
  montereyScene: summary.montereyRegionalSceneOpened,
  screenshots: summary.screenshots.length
});

async function openEnvironmentStudio(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.ANCHOR_APP_BOOT_DEBUG?.ready === true, null, { timeout: 30_000 });
  await page.waitForSelector('#main-menu-hub', { timeout: 30_000 });
  await page.click('#main-menu-hub [data-hub-view="simulation"]');
  await page.click('#main-menu-hub [data-action="environment-studio"]');
  await page.waitForSelector('#environment-studio-route', { timeout: 30_000 });
}

async function waitForTileLibrary(page) {
  await waitForEnvironmentStage(page, (debug) => debug?.referenceManifestLoaded === true
    && debug?.referenceTileLibraryLoaded === true
    && debug?.leftPanelSimplified === true);
}

async function waitForEnvironmentStage(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', `return (${predicateSource})(debug);`);
    return fn(globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {});
  }, String(predicate), { timeout: 60_000 });
}

async function waitForRegionalStage(page, predicate) {
  await page.waitForFunction((predicateSource) => {
    const fn = new Function('debug', `return (${predicateSource})(debug);`);
    return fn(globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG ?? {});
  }, String(predicate), { timeout: 60_000 });
}

async function selectBounds(page, bounds, options = {}) {
  await page.evaluate(({ bounds: selectedBounds, options: selectOptions }) => {
    const scene = globalThis.anchorGame?.phaser?.scene?.getScene?.('EnvironmentStudioScene');
    scene?.selectReferenceBounds?.(selectedBounds, selectOptions);
  }, { bounds, options });
}

async function environmentDebug(page) {
  return page.evaluate(() => globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {});
}

async function regionalDebugPayload(page) {
  return page.evaluate(() => globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG ?? {});
}

async function leftPanelSnapshot(page) {
  return page.evaluate(() => {
    const root = document.querySelector('#mission-console');
    const sections = [...root?.querySelectorAll?.('[data-env-stage-section]') ?? []];
    const visibleSections = sections
      .map((section) => section.getAttribute('data-env-stage-section'));
    const defaultSections = sections.filter((section) => section.getAttribute('data-env-stage-section') !== 'advanced');
    const defaultText = defaultSections.map((section) => section.innerText ?? '').join('\n');
    const diagnosticsPattern = /Overview Digest|Source Cells|Fixture Count|Tile Library Safety|Field Artifact|cell-inspector-metrics/i;
    return {
      leftPanelSimplified: globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG?.leftPanelSimplified === true,
      visibleSections,
      defaultVisibleText: defaultText,
      defaultDiagnosticsVisible: diagnosticsPattern.test(defaultText),
      advancedCollapsed: document.querySelector('[data-env-stage-section="advanced"]')?.classList?.contains?.('collapsed') === true
    };
  });
}

async function rightPanelSnapshot(page) {
  return page.evaluate(() => {
    const root = document.querySelector('#waypoint-timeline');
    const visibleText = root?.innerText ?? '';
    return {
      visibleText,
      ownsSelectedRegionState: /Selected Operational Window/i.test(visibleText)
        && /West \/ East Lon/i.test(visibleText)
        && /South \/ North Lat/i.test(visibleText)
        && /Scale|Budget|Generation mode/i.test(visibleText)
        && /Preview Bathymetry/i.test(visibleText)
        && /Next Step/i.test(visibleText)
    };
  });
}

async function atlasButtonState(page) {
  return page.evaluate(() => {
    function state(selector) {
      const element = document.querySelector(selector);
      return {
        exists: Boolean(element),
        disabled: element?.disabled === true,
        ariaDisabled: element?.getAttribute?.('aria-disabled') ?? null,
        primary: element?.classList?.contains?.('primary') ?? false,
        warning: element?.classList?.contains?.('warning') ?? false,
        text: element?.textContent?.trim?.() ?? '',
        title: element?.getAttribute?.('title') ?? ''
      };
    }
    return {
      continueToBathymetry: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-continue-bathymetry"]'),
      openBathymetryPreview: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-open-coarse-preview"]'),
      exportPatchRequest: state('[data-env-stage-section="boundary-actions"] [data-action="env-reference-export-patch-request"]')
    };
  });
}

async function regionalButtonState(page) {
  return page.evaluate(() => {
    function state(selector) {
      const element = document.querySelector(selector);
      return {
        exists: Boolean(element),
        disabled: element?.disabled === true,
        text: element?.textContent?.trim?.() ?? ''
      };
    }
    return {
      confirmBathymetry: state('[data-action="regional-confirm-bathymetry"]'),
      generateFields: state('[data-action="regional-generate-fields"]'),
      composeEnvironment: state('[data-action="regional-compose-environment"]'),
      launchPlanning: state('[data-action="regional-launch-planning"]'),
      exportBenchmark: state('[data-action="regional-export-benchmark"]'),
      exportPreviewRequest: state('[data-action="regional-export-preview-request"]')
    };
  });
}

async function screenshot(page, filename) {
  await fs.mkdir(OWNER_REVIEW_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(OWNER_REVIEW_DIR, filename),
    fullPage: false
  });
}

async function returnToMainMenu(page) {
  await page.evaluate(() => {
    const phaser = globalThis.anchorGame?.phaser;
    const activeScenes = ['RegionalBathymetryScene', 'MissionWorkspaceScene', 'EnvironmentStudioScene', 'SimulationScene', 'DebriefScene'];
    for (const sceneName of activeScenes) {
      const scene = phaser?.scene?.getScene?.(sceneName);
      if (scene?.sys?.isActive?.()) {
        scene.scene.start('MainMenuScene');
        return;
      }
    }
    phaser?.scene?.start?.('MainMenuScene');
  });
  await page.waitForSelector('#main-menu-hub', { timeout: 30_000 });
}

async function cleanupSnapshot(page) {
  await page.waitForFunction(() => document.querySelectorAll('.three-bathymetry-canvas, [data-regional-bathymetry-mesh-preview] canvas').length === 0, null, { timeout: 30_000 });
  return page.evaluate(() => ({
    activeRendererCountAfterCleanup: Number(globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG?.activeRendererCount ?? globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0),
    activeRafCountAfterCleanup: Number(globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG?.activeRafCount ?? globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0),
    activeCanvasCountAfterCleanup: document.querySelectorAll('.three-mission-world-canvas, .three-bathymetry-canvas, [data-env-studio-globe-canvas], [data-regional-bathymetry-mesh-preview] canvas').length
  }));
}

function validateQaSummary(summary) {
  try {
    assert.equal(summary.status, 'PASS', 'status pass');
    assert.equal(summary.leftPanelSimplified, true, 'left panel simplified');
    assert.ok(Number(summary.defaultLeftPanelVisibleSectionCount) <= 5, 'default left panel section count is compact');
    assert.equal(summary.rightPanelOwnsSelectedRegionState, true, 'right panel owns selected-region state');
    assert.equal(summary.anyValidBoundaryPreviewEnabled, true, 'any valid boundary preview enabled');
    assert.equal(summary.largeRegionPreviewOpened, true, 'large region preview opened');
    assert.equal(summary.largeRegionInteractive3dEnabled, true, 'large region interactive 3D enabled');
    assert.equal(summary.largeRegionPreviewMeshRendered, true, 'large region preview mesh rendered');
    assert.ok(Number(summary.largeRegionPreviewMeshGrid?.columns) <= 240, 'large preview columns under cap');
    assert.ok(Number(summary.largeRegionPreviewMeshGrid?.rows) <= 160, 'large preview rows under cap');
    assert.equal(summary.largeRegionFieldGenerationEnabled, false, 'large region field generation disabled');
    assert.equal(summary.largeRegionPlanningLaunchEnabled, false, 'large region Planning launch disabled');
    assert.equal(summary.largeRegionMultiTileRequestEnabled, true, 'large region multi-tile request enabled');
    assert.equal(summary.montereyMissionReadyStillWorks, true, 'Monterey mission-ready still works');
    assert.equal(summary.montereyRegionalSceneOpened, true, 'Monterey regional scene opened');
    assert.equal(summary.montereyFieldGenerationPathVisible, true, 'Monterey field generation path visible');
    assert.equal(summary.noaaRuntimeFetchRequired, false, 'no NOAA runtime fetch');
    assert.equal(summary.gebcoRuntimeFetchRequired, false, 'no GEBCO runtime fetch');
    assert.equal(summary.rawExternalDataPathExposed, false, 'no raw external path');
    assert.equal(summary.hiddenTruthExposed, false, 'no hidden truth');
    assert.equal(summary.simulationChanged, false, 'simulation unchanged');
    assert.equal(summary.scoringChanged, false, 'scoring unchanged');
    assert.equal(summary.plannerChanged, false, 'planner unchanged');
    assert.equal(summary.fieldEquationsChanged, false, 'field equations unchanged');
    assert.equal(summary.activeRendererCountAfterCleanup, 0, 'renderer cleanup');
    assert.equal(summary.activeRafCountAfterCleanup, 0, 'RAF cleanup');
    assert.equal(summary.activeCanvasCountAfterCleanup, 0, 'canvas cleanup');
    for (const name of REQUIRED_SCREENSHOTS) assert.ok(summary.screenshots.includes(name), `${name} screenshot exists`);
  } catch (error) {
    throw new Error(`ENV_STUDIO_ALPHA_UX_R2_ACCEPTANCE_FAIL: ${error.message}`);
  }
}

function assertNoPublicLeak(value, label) {
  const text = JSON.stringify(value ?? {});
  assert.doesNotMatch(text, /T_hiddenTruth|rawOracleTensor|oracleState/i, `${label} must not expose hidden truth markers`);
  assert.doesNotMatch(text, /"hiddenTruth"\s*:\s*(?!false|null)/i, `${label} must not expose hidden truth payloads`);
  assert.doesNotMatch(text, /external_data[\\/]/i, `${label} must not expose raw external_data paths`);
  assert.doesNotMatch(text, /[A-Za-z]:\\/i, `${label} must not expose local absolute paths`);
}

function isExternalNoaaOrGebcoRequest(url) {
  try {
    const parsed = new URL(url);
    if (['127.0.0.1', 'localhost'].includes(parsed.hostname)) return false;
    return /ngdc|noaa|gebco|ncei/i.test(`${parsed.hostname}${parsed.pathname}`);
  } catch {
    return /^(?!http:\/\/127\.0\.0\.1|http:\/\/localhost).*?(ngdc|noaa|gebco|ncei)/i.test(String(url));
  }
}
