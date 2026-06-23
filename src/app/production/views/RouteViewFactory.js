import { markAnchorRuntimeThreeLoaded } from '../AnchorRuntimeSelector.js';
import { missionWorldRenderInputFromWorkspace, missionWorldRenderInputFromSimulation } from '../../../core/rendering/MissionWorldStateAdapter.js';
import { buildMissionWorldRenderViewModel } from '../../../core/rendering/MissionWorldRenderViewModel.js';
import { augmentMissionWorldWithVolumetricModel, volumetricCurrentDebugPayload } from '../../../core/rendering/VolumetricMissionWorldViewModel.js';
import { buildCurrentPresentationDebug } from '../../../core/rendering/CurrentPresentationState.js';
import { createThreeMissionWorldRenderer, disposeThreeMissionWorldRenderer, threeMissionWorldRendererSummary, updateThreeMissionWorldRenderer } from '../../../game/three/ThreeMissionWorldRenderer.js';
import { headlessBundleViewerPanelHtml } from '../../../ui/headless/HeadlessBundleViewerPanel.js';
import { buildHeadlessBundleFromFiles } from '../../../core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../../core/headless/HeadlessBundleViewModel.js';
import { mountLegacyLearningLabIsland } from '../LegacyLearningLabHost.js';

export const ANCHOR_PRODUCTION_ROUTE_VIEW_VERSION = 'three-r3a-route-views';

const PANEL_ROUTES = {
  missionSetup: { kicker: 'Mission Setup', title: 'Mission Setup', body: 'Configure a small deterministic R3A parity mission before the map is created.', left: 'Mission Navigator', right: 'Setup Details', controls: [['Generate Mission', 'generate'], ['Back', 'return-main']] },
  missionBriefing: { kicker: 'Mission Briefing', title: 'Scenario Start', body: 'Review the generated synthetic mission and start tactical planning.', left: 'Mission Briefing', right: 'Briefing Dossier', controls: [['Start Planning', 'start-planning'], ['Back', 'open-mission-setup']] },
  importExport: { kicker: 'Tools', title: 'Import / Export', body: 'Browser JSON tools remain accessible in the gated shell.', left: 'Import / Export', right: 'Tool Status', controls: [['Import Invalid JSON', 'import-invalid'], ['Export Plan', 'export-plan'], ['Export Result', 'export-result'], ['Main Menu', 'return-main']] },
  leaderboard: { kicker: 'Leaderboard', title: 'Challenge Leaderboard', body: 'Saved challenge records remain a separate production tool route.', left: 'Leaderboard', right: 'Leaderboard Detail', controls: [['Main Menu', 'return-main']] },
  tutorialBrowser: { kicker: 'Tutorial Browser', title: 'Tutorial Browser', body: 'Tutorial content remains route-scoped and separate from mission lifecycle.', left: 'Tutorial Browser', right: 'Tutorial Detail', controls: [['Main Menu', 'return-main']] },
  plannerBenchmark: { kicker: 'Benchmark', title: 'Planner Benchmark', body: 'Benchmark routes are preserved. R3A does not add a planner.', left: 'Planner Benchmark', right: 'Benchmark Detail', controls: [['Main Menu', 'return-main']] },
  adaptiveBenchmark: { kicker: 'Benchmark', title: 'Adaptive Benchmark', body: 'Adaptive benchmark routes are preserved. R3A does not alter scoring.', left: 'Adaptive Benchmark', right: 'Adaptive Detail', controls: [['Main Menu', 'return-main']] }
};

const WORLD_ROUTES = {
  missionPlanning: { title: 'Planning', left: 'Mission Console', right: 'Waypoint Timeline', phase: 'planning', controls: [['Add Waypoint', 'place-waypoint'], ['Add Target', 'place-sampling-target'], ['Execute', 'execute-mission'], ['Main Menu', 'return-main']] },
  missionSimulation: { title: 'Simulation', left: 'Mission Console', right: 'Mission Timeline', phase: 'simulation', controls: [['Play/Pause', 'pause-simulation'], ['Surface', 'surface-mission'], ['Finish', 'finish-mission']] },
  surfacingDecision: { title: 'Surfacing Decision', left: 'Surfacing Decision', right: 'Decision Timeline', phase: 'simulation', controls: [['Continue', 'continue-mission'], ['Replan', 'replan-mission'], ['Finish', 'finish-mission']] },
  missionReplayReview: { title: 'Replay Review', left: 'Replay Console', right: 'Replay Timeline', phase: 'replay', controls: [['Play/Pause', 'replay-toggle'], ['Return to Debrief', 'return-replay']] },
  missionEditor: { title: 'Mission Editor', left: 'Editor Console', right: 'Validation', phase: 'editor', controls: [['Edit', 'editor-edit'], ['Preview', 'preview-editor'], ['Export/Reimport', 'editor-roundtrip'], ['Main Menu', 'return-main']] }
};

export function createAnchorProductionRouteView(context) {
  if (context.route === 'productHub') return mountProductHub(context);
  if (context.route === 'missionDebrief') return mountDebrief(context);
  if (context.route === 'headlessBundleViewer') return mountHeadlessViewer(context);
  if (context.route === 'legacyLearningLab') return mountLegacyLearningLab(context);
  if (WORLD_ROUTES[context.route]) return mountWorldRoute(context, WORLD_ROUTES[context.route]);
  return mountPanelRoute(context, PANEL_ROUTES[context.route] ?? PANEL_ROUTES.missionSetup);
}

function mountProductHub(context) {
  renderShellPanels(context, 'Production Shell', 'Mission Context', [['Runtime', 'next'], ['Phaser games', productionPhaserCount()], ['Route', 'Product Hub']], [['Import / Export', 'open-import-export'], ['Headless Bundle Viewer', 'open-headless-viewer']]);
  const root = routeRoot('product-hub-route main-menu-hub-host');
  root.innerHTML = `<section id="main-menu-hub" class="main-menu-hub"><header class="main-menu-hero"><div><p class="main-menu-kicker">ANCHOR mission systems</p><h1 id="next-shell-route-heading">ANCHOR: Glider Command</h1><p class="main-menu-subtitle">Scientific AUV Glider Adaptive-Sampling Game</p></div><p class="main-menu-runtime-note">Browser ANCHOR is the visual game/referee. Node/OceanBox-JS remains the canonical headless runtime.</p></header><div class="main-menu-primary-grid" aria-label="Primary ANCHOR paths">${hubCard('open-mission-setup', 'Challenge Mode', 'Play missions', 'Learn objectives, chase scores, compare routes, and race the greedy baseline.')}${hubCard('open-planner-benchmark', 'Simulation Lab', 'Inspect systems', 'Open scientific sandboxes, benchmark modes, headless bundles, and solver workflows.')}${hubCard('open-legacy-lab', 'Learning Labs', 'Read + experiment', 'Use interactive articles and companion sandboxes to learn the science step by step.')}</div><div class="main-menu-secondary-row" aria-label="Secondary tools"><button type="button" data-action="open-import-export">Import JSON</button><button type="button" data-action="open-headless-viewer">Headless Bundle Viewer</button><button type="button" data-action="open-import-export">External Solver Evaluation</button><button type="button" data-action="open-tutorial-browser">Tutorial Browser</button></div></section>`;
  context.regions.gameRoot.appendChild(root);
  bindActions(root, context);
  return viewHandle(root);
}

function mountPanelRoute(context, spec) {
  if (context.route === 'missionBriefing') context.sessionStore.ensureMission();
  renderShellPanels(context, spec.left, spec.right, routeMetrics(context), spec.controls);
  const root = routeRoot('center-screen-overlay tool-view');
  root.innerHTML = `<section class="center-panel"><header class="center-panel-header"><div><p class="center-kicker">${escapeHtml(spec.kicker)}</p><h1 id="next-shell-route-heading">${escapeHtml(spec.title)}</h1><p>${escapeHtml(spec.body)}</p></div><span class="center-mode-pill">R3A</span></header><section class="setup-metric-grid">${routeMetrics(context).map(([k, v]) => setupMetric(k, v)).join('')}</section><section class="setup-section-grid">${setupSection('Authority Boundary', 'The shell routes visible user actions into canonical session/lifecycle state. It does not add planning, simulation, replay, editor, or scoring semantics.')}<article class="setup-detail-card"><h2>Route Controls</h2><div class="center-actions">${buttons(spec.controls)}</div><div id="next-shell-import-status" class="hud-muted">No import attempted.</div></article></section></section>`;
  context.regions.gameRoot.appendChild(root);
  bindActions(root, context);
  return viewHandle(root);
}

function mountWorldRoute(context, spec) {
  context.sessionStore.ensureMission();
  if (context.route === 'missionSimulation' && !context.sessionStore.state.liveSimulationSession) context.sessionStore.launchMission();
  if (context.route === 'missionReplayReview') context.sessionStore.openReplay();
  if (context.route === 'missionEditor') context.sessionStore.openEditor();
  const controls = [...spec.controls];
  if (context.route === 'missionPlanning' && context.sessionStore.state.routeReturnContext?.from === 'missionEditor') controls.splice(controls.length - 1, 0, ['Return to Editor', 'return-editor']);
  renderShellPanels(context, spec.left, spec.right, routeMetrics(context), controls);
  const root = routeRoot(`next-shell-world-route next-shell-${context.route}`);
  root.innerHTML = `<section class="next-shell-world-panel"><header class="next-shell-world-header"><div><p class="center-kicker">${escapeHtml(spec.title)}</p><h1 id="next-shell-route-heading">${escapeHtml(spec.title)}</h1><p>Existing Three production surface mounted through the gated production shell.</p></div><span class="center-mode-pill">Three.js</span></header><div class="next-shell-three-host" aria-label="${escapeHtml(spec.title)} Three.js world"></div><p id="next-shell-selected-object" class="sr-only" aria-live="polite">No mission object selected.</p><div class="next-route-control-strip">${buttons(controls)}</div></section>`;
  context.regions.gameRoot.appendChild(root);
  const renderer = mountThreeRenderer(root.querySelector('.next-shell-three-host'), context, spec.phase);
  bindActions(root, context);
  return viewHandle(root, renderer);
}

function mountDebrief(context) {
  if (!context.sessionStore.state.result) context.sessionStore.completeMission('completed');
  const result = context.sessionStore.state.result;
  const summary = context.sessionStore.summary();
  renderShellPanels(context, 'Debrief Console', 'Result Timeline', [['Score', result.summary.finalScore], ['Result Digest', summary.resultDigest], ['Replay Digest', summary.replayDigest]], [['Replay Review', 'open-replay'], ['Export Result', 'export-result'], ['Main Menu', 'return-main']]);
  const root = routeRoot('debrief-overlay');
  root.innerHTML = `<main class="debrief-shell"><header class="debrief-header"><div><p class="debrief-kicker">Challenge</p><h1 id="next-shell-route-heading">Mission Debrief</h1><p>R3A next-shell deterministic route | ${escapeHtml(result.missionId)}</p></div><div class="debrief-score"><span>Score</span><strong>${escapeHtml(result.summary.finalScore)}</strong></div></header><section class="debrief-metric-grid">${debriefMetric('Score', result.summary.finalScore)}${debriefMetric('Sample Score', result.summary.sampleScore)}${debriefMetric('Energy Used', result.summary.energyUsed)}${debriefMetric('Hazards', result.summary.hazardsHit)}</section><section class="debrief-content-grid"><article class="debrief-panel"><h2>Replay Review</h2><p>Public replay digest: ${escapeHtml(summary.replayDigest)}</p><button class="debrief-button primary" data-action="open-replay">Replay Review</button></article><article class="debrief-panel"><h2>Boundary</h2><p>The next shell did not recompute score or run hidden truth. It displays the canonical result summary.</p></article><article class="debrief-panel"><h2>Exports</h2><button class="debrief-button" data-action="export-result">Export Result</button><button class="debrief-button" data-action="return-main">Main Menu</button></article></section></main>`;
  context.regions.gameRoot.appendChild(root);
  bindActions(root, context);
  return viewHandle(root);
}

function mountHeadlessViewer(context) {
  const bundle = context.sessionStore.state.headlessBundle ?? null;
  const vm = bundle ? buildHeadlessBundleViewModel(bundle) : null;
  renderShellPanels(context, 'Headless Bundle Viewer', 'Bundle Detail', [['Status', bundle ? 'loaded' : 'empty'], ['Phaser games', productionPhaserCount()]], [['Load Example Bundle', 'load-example-bundle'], ['Main Menu', 'return-main']]);
  const root = routeRoot('center-screen-overlay tool-view');
  root.innerHTML = `<section class="center-panel"><header class="center-panel-header"><div><p class="center-kicker">Headless / Colab Workflow</p><h1 id="next-shell-route-heading">Headless Bundle Viewer</h1><p>Load checked-in headless bundle examples and inspect browser-safe summaries.</p></div></header><div class="center-actions"><button class="center-button primary" data-action="load-example-bundle">Load Example Bundle</button><button class="center-button secondary" data-action="return-main">Main Menu</button></div><div class="next-shell-headless-panel">${vm ? headlessBundleViewerPanelHtml(vm) : '<section class="console-section"><h2>Empty</h2><div class="hud-muted">No bundle loaded yet.</div></section>'}</div></section>`;
  context.regions.gameRoot.appendChild(root);
  bindActions(root, context);
  return viewHandle(root);
}

function mountLegacyLearningLab(context) {
  renderShellPanels(context, 'Learning Labs', 'Legacy Lab Status', [['Island', 'loading'], ['Production authority', 'none']], [['Return to Product Hub', 'return-main']]);
  const root = routeRoot('center-screen-overlay legacy-learning-shell');
  root.innerHTML = `<section class="center-panel"><header class="center-panel-header"><div><p class="center-kicker">Learning Labs</p><h1 id="next-shell-route-heading">Learning Lab</h1><p>Legacy lab content is isolated from production mission state during R3A.</p></div></header><div id="next-shell-legacy-lab-host" class="next-shell-legacy-lab-host" aria-label="Learning Lab canvas host"></div><footer class="center-panel-footer"><button class="center-button secondary" data-action="return-main">Return to Product Hub</button></footer></section>`;
  context.regions.gameRoot.appendChild(root);
  bindActions(root, context);
  let legacyHandle = null;
  mountLegacyLearningLabIsland(root.querySelector('#next-shell-legacy-lab-host')).then((handle) => {
    legacyHandle = handle;
    renderShellPanels(context, 'Learning Labs', 'Legacy Lab Status', [['Island', 'active'], ['Phaser instances', globalThis.ANCHOR_LEGACY_ISLAND_DEBUG?.instanceCount ?? 0]], [['Return to Product Hub', 'return-main']]);
    context.publishDebug?.();
  }).catch((error) => {
    root.querySelector('#next-shell-legacy-lab-host').textContent = String(error?.message ?? error);
    globalThis.ANCHOR_LEGACY_ISLAND_DEBUG ??= { loaded: false, active: false, activeScene: null, instanceCount: 0, destroyCount: 0, staleCanvasCount: 0, failures: [] };
    globalThis.ANCHOR_LEGACY_ISLAND_DEBUG.failures.push(String(error?.message ?? error));
  });
  return viewHandle(root, null, () => legacyHandle?.dispose?.());
}

function mountThreeRenderer(host, context, phase) {
  let renderer = null;
  try {
    renderer = createThreeMissionWorldRenderer(host, { qualityProfile: 'balanced' });
    markAnchorRuntimeThreeLoaded(true);
    const input = phase === 'simulation'
      ? missionWorldRenderInputFromSimulation({ app: { state: context.sessionStore.state.gameState } }, { phase, displaySettings: { qualityProfile: 'balanced' } })
      : missionWorldRenderInputFromWorkspace({ app: { state: context.sessionStore.state.gameState } }, { phase, displaySettings: { qualityProfile: 'balanced' } });
    const flatViewModel = buildMissionWorldRenderViewModel(input);
    const viewModel = augmentMissionWorldWithVolumetricModel(flatViewModel, {
      ...input,
      displaySettings: { ...(input.displaySettings ?? {}), waterColumn: context.sessionStore.state.gameState.ui?.waterColumn ?? {} },
      waterColumn: context.sessionStore.state.gameState.ui?.waterColumn ?? {},
      level: context.sessionStore.state.gameState.level,
      mission: context.sessionStore.state.gameState.mission,
      plan: context.sessionStore.state.gameState.plan
    });
    updateThreeMissionWorldRenderer(renderer, viewModel);
    publishNextShellCurrentPresentationDebug({ phase, renderer, viewModel, context });
  } catch (error) {
    host.innerHTML = `<div class="center-callout">Three renderer failed: ${escapeHtml(error?.message ?? error)}</div>`;
  }
  return renderer;
}

function renderShellPanels(context, leftTitle, rightTitle, metrics = [], controls = []) {
  context.regions.consoleRoot.innerHTML = `<section class="console-header"><div class="console-kicker">${escapeHtml(leftTitle)}</div><h2>${escapeHtml(leftTitle)}</h2><p>Route-scoped production shell panel.</p></section><section class="console-section"><h2>Controls</h2><div class="panel-stack">${buttons(controls)}</div></section><section class="console-section"><h2>Boundary</h2><div class="hud-muted">Uses framework-neutral lifecycle and canonical mission state.</div></section>`;
  context.regions.rightRoot.innerHTML = `<section class="console-header"><div class="console-kicker">Status</div><h2>${escapeHtml(rightTitle)}</h2><p>Contextual route details.</p></section><section class="console-section"><h2>Metrics</h2><div class="cell-inspector-metrics">${metrics.map(([k, v]) => metric(k, v)).join('')}</div></section>`;
  bindActions(context.regions.consoleRoot, context);
}

function publishNextShellCurrentPresentationDebug({ phase, renderer, viewModel, context } = {}) {
  const rendererSummary = renderer ? threeMissionWorldRendererSummary(renderer) : null;
  const currentDebug = volumetricCurrentDebugPayload(viewModel ?? {}, rendererSummary, { terrainDigest: rendererSummary?.terrainSourceDigest ?? null });
  globalThis.ANCHOR_VOLUMETRIC_CURRENT_DEBUG = currentDebug;
  globalThis.ANCHOR_CURRENT_PRESENTATION_DEBUG = buildCurrentPresentationDebug({
    phase,
    runtimeShell: 'next',
    viewModel,
    rendererSummary,
    currentDebug,
    ui: context?.sessionStore?.state?.gameState?.ui ?? {},
    layerVisibility: rendererSummary?.layerVisibility ?? {}
  });
}

function bindActions(root, context) {
  context.addListener(root, 'click', async (event) => {
    const button = event.target?.closest?.('[data-action]');
    if (!button || !root.contains(button)) return;
    event.preventDefault();
    await handleAction(button.dataset.action, context, button);
  });
  context.addListener(root, 'keydown', (event) => {
    if (event.key === 'Escape') {
      context.sessionStore.state.gameState.ui.placementMode = 'select';
      context.publishDebug?.();
    }
  });
}

async function handleAction(action, context, button) {
  switch (action) {
    case 'open-mission-setup': context.dispatch('openMissionSetup'); break;
    case 'open-mission-setup-from-any': context.dispatch('openMissionSetup'); break;
    case 'generate': context.dispatch('loadMission'); break;
    case 'start-planning': context.dispatch('startPlanning'); break;
    case 'execute-mission': context.dispatch('executeMission'); break;
    case 'pause-simulation': context.dispatch('pauseSimulation'); context.rerender(); break;
    case 'surface-mission': context.dispatch('surfaceMission'); break;
    case 'continue-mission': context.dispatch('continueMission'); break;
    case 'replan-mission': context.dispatch('replanMission'); break;
    case 'finish-mission': context.dispatch('finishMission'); break;
    case 'open-replay': context.dispatch('openReplayReview'); break;
    case 'return-replay': context.dispatch('returnFromReplay'); break;
    case 'open-import-export': context.dispatch('openImportExport'); break;
    case 'open-headless-viewer': context.dispatch('openHeadlessViewer'); break;
    case 'open-tutorial-browser': context.dispatch('openTutorialBrowser'); break;
    case 'open-planner-benchmark': context.dispatch('openPlannerBenchmark'); break;
    case 'open-adaptive-benchmark': context.dispatch('openAdaptiveBenchmark'); break;
    case 'open-legacy-lab': context.dispatch('openLegacyLearningLab'); break;
    case 'return-main': context.dispatch('returnToMainMenu'); break;
    case 'place-waypoint': context.sessionStore.addWaypoint(); context.rerender(); break;
    case 'place-sampling-target': context.sessionStore.addSamplingTarget(); context.rerender(); break;
    case 'return-editor': context.dispatch('returnToEditor'); break;
    case 'editor-edit': context.sessionStore.editMissionDocument(); context.rerender(); break;
    case 'preview-editor': context.dispatch('previewEditorMission'); break;
    case 'editor-roundtrip': context.sessionStore.editMissionDocument({ type: 'roundtrip-check' }); context.rerender(); break;
    case 'import-invalid': showImportStatus(context, 'Invalid JSON: expected an anchor JSON object.', 'warning'); break;
    case 'export-plan': downloadJson('anchor.r3a-plan.json', context.sessionStore.state.gameState.plan); break;
    case 'export-result': downloadJson('anchor.r3a-result.json', context.sessionStore.state.result ?? context.sessionStore.completeMission('completed')); break;
    case 'load-example-bundle': await loadExampleBundle(context, button); break;
    case 'replay-toggle': button.textContent = button.textContent === 'Play' ? 'Pause' : 'Play'; break;
    default: break;
  }
  context.publishDebug?.();
}

async function loadExampleBundle(context, button) {
  const fileName = 'docs/examples/headless_oceanbox_js_public_bundle.example.json';
  button.disabled = true;
  try {
    const response = await fetch(fileName, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    context.sessionStore.state.headlessBundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
    context.rerender();
  } catch (error) {
    showImportStatus(context, `Example bundle failed: ${error?.message ?? error}`, 'warning');
  } finally {
    button.disabled = false;
  }
}

function showImportStatus(context, message, kind = 'info') {
  const status = context.shell.document.getElementById('next-shell-import-status');
  if (status) {
    status.textContent = message;
    status.dataset.statusKind = kind;
  }
}

function viewHandle(root, renderer = null, extraDispose = null) {
  return {
    root,
    renderer,
    debugSummary() {
      const rendererSummary = renderer ? threeMissionWorldRendererSummary(renderer) : null;
      return { type: 'anchor.production.route-view-summary', version: ANCHOR_PRODUCTION_ROUTE_VIEW_VERSION, routeRootId: root.id ?? null, activeThreeRendererCount: rendererSummary?.activeRendererCount ?? 0, activeThreeRafCount: rendererSummary?.activeRafCount ?? 0, rendererSummary };
    },
    dispose(reason = 'dispose') {
      extraDispose?.(reason);
      if (renderer) disposeThreeMissionWorldRenderer(renderer);
      root.remove?.();
    }
  };
}

function routeRoot(className = '') {
  const root = document.createElement('div');
  root.className = `next-shell-route ${className}`.trim();
  root.dataset.nextShellRouteRoot = 'true';
  return root;
}

function routeMetrics(context) {
  const summary = context.sessionStore.summary();
  return [['Route', context.route], ['Mission', summary.missionId ?? 'none'], ['Scenario', summary.scenarioId ?? 'none'], ['Plan Digest', summary.planDigest ?? 'none']];
}

function hubCard(action, title, eyebrow, body) {
  return `<button type="button" class="main-menu-card" data-action="${escapeAttr(action)}"><span>${escapeHtml(eyebrow)}</span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(body)}</small></button>`;
}
function buttons(items = []) { return items.map(([label, action]) => `<button type="button" class="console-button" data-action="${escapeAttr(action)}">${escapeHtml(label)}</button>`).join(''); }
function metric(label, value) { return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 'N/A')}</strong></div>`; }
function setupMetric(label, value) { return `<article class="setup-detail-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 'N/A')}</strong></article>`; }
function setupSection(title, body) { return `<article class="setup-detail-card"><h2>${escapeHtml(title)}</h2><p>${body}</p></article>`; }
function debriefMetric(label, value) { return `<article class="debrief-metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 'N/A')}</strong></article>`; }

function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload ?? {}, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
function productionPhaserCount() { return globalThis.__anchorPhaserApp?.phaser ? 1 : 0; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }
