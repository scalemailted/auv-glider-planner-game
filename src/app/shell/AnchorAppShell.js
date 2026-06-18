export const ANCHOR_APP_SHELL_VERSION = 'anchor-app-shell-mig-r2';

export function createAnchorAppShell(elements = {}) {
  return new AnchorAppShell(elements);
}

export class AnchorAppShell {
  constructor(elements = {}) {
    this.elements = normalizeShellElements(elements);
    this.activeView = null;
    this.activeViewId = null;
    this.ensureLayout();
  }

  ensureLayout() {
    this.elements.root?.classList?.add?.('anchor-dom-runtime');
    this.elements.gameRoot?.classList?.add?.('anchor-dom-viewport');
    this.elements.uiRoot?.classList?.add?.('anchor-dom-ui');
    this.clearViewport();
  }

  mountView(viewId, view) {
    this.activeView?.unmount?.();
    this.activeView = view;
    this.activeViewId = viewId;
    this.clearViewport();
    const node = view?.mount?.(this.getMountContext()) ?? view?.element ?? null;
    if (node) this.elements.gameRoot?.appendChild?.(node);
    this.setModeLabel(labelForView(viewId));
    return node;
  }

  mountRendererHost(className = 'anchor-three-host') {
    const host = this.createElement('div');
    host.className = className;
    host.setAttribute?.('data-anchor-renderer-host', 'three-mission-world');
    this.elements.gameRoot?.appendChild?.(host);
    return host;
  }

  clearViewport() {
    if (this.elements.gameRoot) this.elements.gameRoot.innerHTML = '';
  }

  clearSidePanels() {
    for (const key of ['consoleRoot', 'waypointTimelineRoot', 'missionSummaryHud', 'agentPerformanceHud']) {
      if (this.elements[key]) this.elements[key].innerHTML = '';
    }
  }

  setConsole(htmlOrNode) {
    setHostContent(this.elements.consoleRoot, htmlOrNode);
  }

  setTimeline(htmlOrNode) {
    setHostContent(this.elements.waypointTimelineRoot, htmlOrNode);
  }

  setMissionHud(htmlOrNode) {
    setHostContent(this.elements.missionSummaryHud, htmlOrNode);
  }

  toast(message, kind = 'info') {
    if (!this.elements.toastRoot) return;
    const node = this.createElement('div');
    node.className = `toast toast-${kind}`;
    node.textContent = message;
    this.elements.toastRoot.appendChild(node);
    globalThis.setTimeout?.(() => node.remove?.(), 3600);
  }

  setModeLabel(label) {
    this.elements.root?.setAttribute?.('data-anchor-view', this.activeViewId ?? 'none');
    if (this.elements.modeLabel) this.elements.modeLabel.textContent = label;
  }

  createElement(tagName) {
    const documentRef = this.elements.documentRef ?? globalThis.document;
    return documentRef.createElement(tagName);
  }

  getMountContext() {
    return {
      shell: this,
      elements: this.elements,
      documentRef: this.elements.documentRef ?? globalThis.document
    };
  }

  getDebugState() {
    return {
      type: 'anchor.app-shell.debug',
      version: ANCHOR_APP_SHELL_VERSION,
      activeViewId: this.activeViewId,
      hasViewport: Boolean(this.elements.gameRoot),
      usesPhaserCanvas: false
    };
  }
}

export function normalizeShellElements(elements = {}) {
  const documentRef = elements.documentRef ?? globalThis.document;
  const root = elements.root ?? documentRef?.body ?? null;
  return {
    documentRef,
    root,
    gameRoot: elements.gameRoot ?? documentRef?.getElementById?.('game-root') ?? root,
    uiRoot: elements.uiRoot ?? documentRef?.getElementById?.('ui-root') ?? root,
    viewportShell: elements.viewportShell ?? documentRef?.getElementById?.('viewport-shell') ?? null,
    consoleRoot: elements.consoleRoot ?? documentRef?.getElementById?.('mission-console') ?? null,
    waypointTimelineRoot: elements.waypointTimelineRoot ?? documentRef?.getElementById?.('waypoint-timeline') ?? null,
    missionSummaryHud: elements.missionSummaryHud ?? documentRef?.getElementById?.('mission-summary-hud') ?? null,
    agentPerformanceHud: elements.agentPerformanceHud ?? documentRef?.getElementById?.('agent-performance-hud') ?? null,
    toastRoot: elements.toastRoot ?? documentRef?.getElementById?.('toast-root') ?? null,
    modeLabel: elements.modeLabel ?? documentRef?.getElementById?.('scene-label') ?? null
  };
}

function setHostContent(host, htmlOrNode) {
  if (!host) return;
  host.innerHTML = '';
  if (typeof htmlOrNode === 'string') host.innerHTML = htmlOrNode;
  else if (htmlOrNode) host.appendChild?.(htmlOrNode);
}

function labelForView(viewId) {
  return ({
    mainMenu: 'Main Menu',
    missionSetup: 'Mission Setup',
    missionBriefing: 'Mission Briefing',
    missionPlanning: 'Mission Planning',
    missionSimulation: 'Mission Simulation',
    missionDebrief: 'Mission Debrief',
    legacyPhaser: 'Legacy Phaser Lab'
  })[viewId] ?? 'ANCHOR';
}
