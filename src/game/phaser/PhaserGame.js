import { createGameState } from '../state/GameState.js';
import { showToast } from '../../ui/Toast.js';
import { applyMissionConsoleAccordions, getAccordionDefaults } from '../../ui/AccordionState.js';
import { BootScene } from './scenes/BootScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { MissionBriefingScene } from './scenes/MissionBriefingScene.js';
import { MissionWorkspaceScene } from './scenes/MissionWorkspaceScene.js';
import { SimulationScene } from './scenes/SimulationScene.js';
import { DebriefScene } from './scenes/DebriefScene.js';
import { EnvironmentEditorScene } from './scenes/EnvironmentEditorScene.js';
import { DatasetExportScene } from './scenes/DatasetExportScene.js';
import { FlowFieldDemoScene } from './scenes/FlowFieldDemoScene.js';
import { RoiGeneratorDemoScene } from './scenes/RoiGeneratorDemoScene.js';
import { LoadLevelByIdScene } from './scenes/LoadLevelByIdScene.js';
import { LoadLevelJsonScene } from './scenes/LoadLevelJsonScene.js';
import { PHASER_HEIGHT, PHASER_WIDTH } from './PhaserCoreAdapter.js';

export const DEBUG_VIEWPORT_LAYOUT = false;

export function createPhaserGame(elements) {
  return new PhaserGameApp(elements);
}

export class PhaserGameApp {
  constructor(elements) {
    this.elements = elements ?? {};
    this.state = createGameState();
    this.phaser = null;
    this.adapter = { layout: null };
  }

  start() {
    if (!globalThis.Phaser) {
      this.toast('Phaser failed to load. Check vendor/phaser.min.js.', 'error');
      return;
    }

    globalThis.__anchorPhaserApp = this;
    const viewport = getViewportSize(this.elements?.viewportShell ?? this.elements?.gameContainer);
    this.phaser = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.elements.gameContainer ?? this.elements.shell ?? 'game-root',
      width: viewport.width,
      height: viewport.height,
      backgroundColor: '#08111f',
      scene: [
        BootScene,
        MainMenuScene,
        MissionBriefingScene,
        MissionWorkspaceScene,
        SimulationScene,
        DebriefScene,
        EnvironmentEditorScene,
        DatasetExportScene,
        FlowFieldDemoScene,
        RoiGeneratorDemoScene,
        LoadLevelJsonScene,
        LoadLevelByIdScene
      ],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER
      },
      callbacks: {
        postBoot: (game) => {
          game.canvas.id = 'game-canvas';
          game.canvas.setAttribute('aria-label', 'Game map');
          this.resizeToViewport('postBoot');
        }
      }
    });
    this.phaser.anchorApp = this;
    this.resizeToViewport('start');
    this.attachResizeObserver();
  }

  attachResizeObserver() {
    const target = this.elements?.viewportShell ?? this.elements?.gameContainer;
    if (!target || !globalThis.ResizeObserver) return;
    this.resizeObserver?.disconnect?.();
    this.resizeObserver = new globalThis.ResizeObserver(() => {
      globalThis.requestAnimationFrame?.(() => {
        this.resizeToViewport('observer');
      });
    });
    this.resizeObserver.observe(target);
  }

  resizeToViewport(reason = 'manual') {
    if (!this.phaser?.scale) return;
    const target = this.elements?.viewportShell ?? this.elements?.gameContainer;
    const size = getViewportSize(target);
    const currentWidth = Number(this.phaser.scale.width ?? this.phaser.canvas?.width ?? 0);
    const currentHeight = Number(this.phaser.scale.height ?? this.phaser.canvas?.height ?? 0);
    if (Math.abs(currentWidth - size.width) > 1 || Math.abs(currentHeight - size.height) > 1) {
      this.phaser.scale.resize(size.width, size.height);
    } else {
      this.phaser.scale.refresh?.();
    }
    this.debugViewportLayout(reason);
    for (const scene of this.phaser.scene?.getScenes?.(true) ?? []) {
      if (typeof scene.handleViewportResize === 'function') scene.handleViewportResize(size);
      else if (typeof scene.refreshMap === 'function') scene.refreshMap();
      else if (typeof scene.refresh === 'function') scene.refresh();
    }
  }

  debugViewportLayout(reason = 'manual') {
    if (!DEBUG_VIEWPORT_LAYOUT && !globalThis.DEBUG_VIEWPORT_LAYOUT) return;
    const shell = this.elements?.viewportShell;
    const root = this.elements?.gameContainer;
    const canvas = this.phaser?.canvas;
    const camera = this.phaser?.scene?.getScenes?.(true)?.[0]?.cameras?.main;
    const canvasRect = canvas?.getBoundingClientRect?.();
    console.debug('[viewport-layout]', {
      reason,
      shell: sizeSnapshot(shell),
      leftPanel: sizeSnapshot(this.elements?.consoleRoot),
      gameRoot: sizeSnapshot(root),
      rightPanel: sizeSnapshot(this.elements?.waypointTimelineRoot),
      canvasAttributes: canvas ? { width: canvas.width, height: canvas.height } : null,
      canvasCss: canvasRect ? { width: canvasRect.width, height: canvasRect.height } : null,
      phaserScale: this.phaser?.scale ? { width: this.phaser.scale.width, height: this.phaser.scale.height } : null,
      cameraViewport: camera ? { width: camera.width, height: camera.height } : null,
      mapBounds: this.adapter?.layout?.bounds ?? null,
      activeScenes: this.phaser?.scene?.getScenes?.(true)?.map((scene) => scene.scene?.key) ?? []
    });
  }

  goTo(sceneName) {
    const key = sceneKey(sceneName);
    if (!key || !this.phaser) return;
    this.elements.shell?.classList.toggle('planning-workspace', key === 'MissionWorkspaceScene');
    this.phaser.scene.start(key);
  }

  setSceneLabel(label) {
    if (this.elements?.sceneLabel) this.elements.sceneLabel.textContent = label;
  }

  setPanel(html) {
    if (this.elements?.consoleRoot) {
      this.elements.consoleRoot.innerHTML = html;
      this.applyConsoleAccordions(this.state?.mode ?? 'default');
      this.elements?.legacyPanelRoot?.classList.remove('legacy-dom-active');
      if (this.elements?.legacyPanelRoot) this.elements.legacyPanelRoot.hidden = true;
      return;
    }
    if (this.elements?.contextPanel) this.elements.contextPanel.innerHTML = html;
    const active = Boolean(String(html ?? '').trim());
    this.elements?.legacyPanelRoot?.classList.toggle('legacy-dom-active', active);
    if (this.elements?.legacyPanelRoot) this.elements.legacyPanelRoot.hidden = !active;
  }

  clearPanels() {
    this.setDebriefFullscreen(false);
    // Legacy DOM dashboard panels are optional in the full-screen Phaser shell.
    // Keep this guarded so older scene calls cannot break boot when panels are absent.
    for (const panel of [
      this.elements?.contextPanel,
      this.elements?.waypointPanel,
      this.elements?.scorePanel,
      this.elements?.eventPanel,
      this.elements?.timelinePanel
    ]) {
      if (panel) panel.innerHTML = '';
    }
    this.elements?.legacyPanelRoot?.classList.remove('legacy-dom-active');
    if (this.elements?.legacyPanelRoot) this.elements.legacyPanelRoot.hidden = true;
    this.clearOverlays();
  }

  clearAuxiliaryPanels() {
    for (const panel of [
      this.elements?.waypointPanel,
      this.elements?.scorePanel,
      this.elements?.eventPanel,
      this.elements?.timelinePanel
    ]) {
      if (panel) panel.innerHTML = '';
    }
  }

  clearOverlays() {
    this.mapHoverTooltip?.hide?.();
    for (const panel of Object.values(this.elements?.overlay ?? {})) {
      if (panel) panel.innerHTML = '';
    }
  }

  toast(message, kind = 'info') {
    showToast(this.elements?.toastRoot, message, kind);
  }

  applyConsoleAccordions(mode = 'default', defaults = null) {
    applyMissionConsoleAccordions(
      this.elements?.consoleRoot,
      mode,
      defaults ?? getAccordionDefaults(mode)
    );
  }

  setDebriefFullscreen(active) {
    globalThis.document?.body?.classList.toggle('debrief-fullscreen', Boolean(active));
  }
}

function getViewportSize(element) {
  const rect = element?.getBoundingClientRect?.();
  const width = Math.max(1, Math.round(Number(element?.clientWidth ?? rect?.width ?? PHASER_WIDTH)));
  const height = Math.max(1, Math.round(Number(element?.clientHeight ?? rect?.height ?? PHASER_HEIGHT)));
  return { width, height };
}

function sizeSnapshot(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect?.();
  return {
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
    rectWidth: rect?.width ?? null,
    rectHeight: rect?.height ?? null
  };
}

function sceneKey(name) {
  const aliases = {
    boot: 'BootScene',
    mainMenu: 'MainMenuScene',
    levelSelect: 'MainMenuScene',
    loadLevelById: 'LoadLevelByIdScene',
    loadLevelJson: 'LoadLevelJsonScene',
    planning: 'MissionWorkspaceScene',
    briefing: 'MissionBriefingScene',
    simulation: 'SimulationScene',
    debrief: 'DebriefScene',
    levelEditor: 'EnvironmentEditorScene',
    datasetExport: 'DatasetExportScene',
    flowDemo: 'FlowFieldDemoScene',
    roiDemo: 'RoiGeneratorDemoScene'
  };
  return aliases[name] ?? name;
}
