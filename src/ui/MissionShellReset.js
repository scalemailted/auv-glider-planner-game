export const MISSION_SHELL_RESET_VERSION = 'mission-shell-reset-three-r1-1e';

const PRODUCTION_SCENES = new Set([
  'MainMenuScene',
  'MissionBriefingScene',
  'MissionWorkspaceScene',
  'SimulationScene',
  'DebriefScene'
]);

export function resetMissionShellForMainMenu(app, options = {}) {
  const documentRef = globalThis.document;
  const removed = removeStaleMissionNodes(documentRef);
  app?.elements?.shell?.classList?.remove?.('planning-workspace', 'simulation-workspace');
  app?.elements?.viewportShell?.classList?.remove?.('planning-workspace', 'simulation-workspace');
  app?.elements?.overlay?.bottomTimeline?.replaceChildren?.();
  if (app?.elements?.overlay?.bottomTimeline && !app.elements.overlay.bottomTimeline.replaceChildren) app.elements.overlay.bottomTimeline.innerHTML = '';
  app?.summaryHud?.destroy?.();
  app?.agentPerformanceHud?.setHandlers?.({});
  app?.elements?.overlay?.agentPerformanceHud?.replaceChildren?.();
  if (app?.elements?.overlay?.agentPerformanceHud && !app.elements.overlay.agentPerformanceHud.replaceChildren) app.elements.overlay.agentPerformanceHud.innerHTML = '';
  app?.mapHoverTooltip?.hide?.();
  app?.console?.renderIdle?.({ mode: 'Main Menu', status: 'Main Menu' });
  app?.waypointPanel?.renderIdle?.({ mainMenu: true });
  app?.resizeToViewport?.(options.reason ?? 'main-menu-shell-reset');
  publishSceneIsolationDebug(app, {
    reason: options.reason ?? 'main-menu-shell-reset',
    removedStaleNodeCount: removed.removedCount
  });
  return removed;
}

export function publishSceneIsolationDebug(app, patch = {}) {
  const documentRef = globalThis.document;
  const activePhaserSceneKeys = activeSceneKeys(app);
  const activeProductionSceneCount = activePhaserSceneKeys.filter((key) => PRODUCTION_SCENES.has(key)).length;
  const threeMissionCanvasCount = count(documentRef, '.three-mission-world-canvas');
  const threeMissionRendererCount = count(documentRef, '.three-mission-world-host');
  const planningOverlayCount = count(documentRef, '.three-planning-overlay, .mission-planning-overlay, [data-planning-overlay]');
  const simulationOverlayCount = count(documentRef, '.three-simulation-overlay, .simulation-world-overlay, [data-simulation-overlay]');
  const statusStripVisible = visible(documentRef?.querySelector?.('#top-mission-hud, [data-top-mission-hud], .top-mission-hud'));
  const timeline = app?.elements?.overlay?.bottomTimeline ?? documentRef?.getElementById?.('bottom-timeline') ?? documentRef?.querySelector?.('[data-bottom-timeline]');
  const timelineText = String(timeline?.textContent ?? '');
  const timelineVisible = visible(timeline) && /Waypoint\s+\d|Playback|Mission End|Simulation|Transport|ETA:/i.test(timelineText);
  const performance = documentRef?.querySelector?.('#agent-performance-hud, [data-agent-performance-hud], .agent-performance-hud');
  const performanceStripVisible = visible(performance) && /Mission Performance|Battery|Energy|Samples|Glider/i.test(String(performance?.textContent ?? ''));
  const rightPanel = app?.elements?.rightPanel ?? documentRef?.getElementById?.('waypoint-timeline');
  const rightText = String(rightPanel?.textContent ?? '');
  const rightPanelMissionContentVisible = visible(rightPanel) && /Route Waypoints|Duration\s+\d|W\d+|MISSED|CARRY-THROUGH|MISSION WINDOW/i.test(rightText);
  const mainMenuOnly = activeProductionSceneCount === 1 && activePhaserSceneKeys.includes('MainMenuScene');
  const noMissionDom = threeMissionCanvasCount === 0
    && threeMissionRendererCount === 0
    && planningOverlayCount === 0
    && simulationOverlayCount === 0
    && !timelineVisible
    && !performanceStripVisible
    && !rightPanelMissionContentVisible;
  const isolationStatus = mainMenuOnly ? (noMissionDom ? 'PASS' : 'FAIL') : (threeMissionCanvasCount <= 1 && threeMissionRendererCount <= 1 ? 'PASS' : 'FAIL');
  const debug = {
    version: MISSION_SHELL_RESET_VERSION,
    activePhaserSceneKeys,
    activeProductionSceneCount,
    threeMissionCanvasCount,
    threeMissionRendererCount,
    threeAnimationLoopCount: Number(patch.threeAnimationLoopCount ?? threeMissionCanvasCount),
    threeCameraControllerCount: Number(patch.threeCameraControllerCount ?? threeMissionRendererCount),
    threeInteractionControllerCount: Number(patch.threeInteractionControllerCount ?? threeMissionRendererCount),
    planningOverlayCount,
    simulationOverlayCount,
    statusStripVisible,
    timelineVisible,
    performanceStripVisible,
    rightPanelMissionContentVisible,
    disposedRendererCount: Number(patch.disposedRendererCount ?? 0),
    duplicateRendererWarningCount: Math.max(0, threeMissionRendererCount - 1),
    staleSceneNodeCount: Number(patch.removedStaleNodeCount ?? 0),
    staleListenerCount: Number(patch.staleListenerCount ?? 0),
    staleTimerCount: Number(patch.staleTimerCount ?? 0),
    isolationStatus,
    ...patch
  };
  globalThis.ANCHOR_SCENE_ISOLATION_DEBUG = debug;
  return debug;
}

function removeStaleMissionNodes(documentRef) {
  if (!documentRef?.querySelectorAll) return { removedCount: 0 };
  const selectors = [
    '.three-mission-world-host',
    '.three-mission-world-canvas',
    '.three-planning-overlay',
    '.mission-planning-overlay',
    '.three-simulation-overlay',
    '.simulation-world-overlay',
    '[data-planning-overlay]',
    '[data-simulation-overlay]'
  ];
  const nodes = new Set(selectors.flatMap((selector) => Array.from(documentRef.querySelectorAll(selector))));
  let removedCount = 0;
  for (const node of nodes) {
    node.remove?.();
    removedCount += 1;
  }
  return { removedCount };
}

function activeSceneKeys(app) {
  const manager = app?.phaser?.scene ?? app?.sys?.game?.scene;
  const scenes = manager?.scenes?.length ? manager.scenes : Object.values(manager?.keys ?? {});
  return scenes
    .filter((scene) => isSceneActive(manager, scene))
    .map((scene) => scene?.sys?.settings?.key ?? scene?.scene?.key)
    .filter(Boolean);
}

function isSceneActive(manager, scene) {
  const key = scene?.sys?.settings?.key ?? scene?.scene?.key;
  if (typeof scene?.sys?.isActive === 'function' && scene.sys.isActive()) return true;
  if (typeof scene?.scene?.isActive === 'function' && scene.scene.isActive()) return true;
  if (key && typeof manager?.isActive === 'function') return manager.isActive(key) === true;
  return false;
}

function count(documentRef, selector) {
  return documentRef?.querySelectorAll?.(selector)?.length ?? 0;
}

function visible(element) {
  if (!element) return false;
  if (element.hidden) return false;
  const style = globalThis.getComputedStyle?.(element);
  if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) return false;
  return Boolean(element.offsetParent || element.getClientRects?.().length || element.textContent?.trim());
}
