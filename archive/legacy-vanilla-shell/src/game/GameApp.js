import { createGameState } from './state/GameState.js';
import { createRenderer } from './render/CanvasRenderer.js';
import { showToast } from '../ui/Toast.js';
import { BootScene } from './scenes/BootScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { MissionBriefingScene } from './scenes/MissionBriefingScene.js';
import { PlanningScene } from './scenes/PlanningScene.js';
import { SimulationScene } from './scenes/SimulationScene.js';
import { DebriefScene } from './scenes/DebriefScene.js';
import { LevelEditorScene } from './scenes/LevelEditorScene.js';
import { DatasetExportScene } from './scenes/DatasetExportScene.js';

export class GameApp {
  constructor(elements) {
    this.elements = elements;
    this.state = createGameState();
    this.renderer = createRenderer(elements.canvas, this.state);
    this.scenes = {
      boot: new BootScene(this), mainMenu: new MainMenuScene(this), levelSelect: new LevelSelectScene(this),
      briefing: new MissionBriefingScene(this), planning: new PlanningScene(this), simulation: new SimulationScene(this),
      debrief: new DebriefScene(this), levelEditor: new LevelEditorScene(this), datasetExport: new DatasetExportScene(this)
    };
    this.activeScene = null;
  }
  async start() { await this.goTo('boot'); this.loop(); }
  async goTo(sceneName) {
    if (!this.canEnter(sceneName)) return;
    const next = this.scenes[sceneName];
    if (!next) return this.toast(`Unknown scene: ${sceneName}`, 'warning');
    if (this.activeScene?.exit) this.activeScene.exit();
    this.activeScene = next;
    this.elements.sceneLabel.textContent = next.label ?? sceneName;
    this.elements.shell?.classList.toggle('planning-workspace', sceneName === 'planning');
    if (next.enter) await next.enter();
  }
  canEnter(sceneName) {
    if (sceneName === 'planning' && (!this.state.level || !this.state.mission)) {
      this.toast('Load a level and mission first.', 'warning');
      return false;
    }
    if (sceneName === 'simulation' && (!this.state.level || !this.state.mission || !this.state.plan)) {
      this.toast('Create a waypoint plan before simulating.', 'warning');
      return false;
    }
    if (sceneName === 'debrief' && !this.state.result) {
      this.toast('Run a simulation before opening the debrief.', 'warning');
      return false;
    }
    return true;
  }
  loop = () => { if (this.activeScene?.update) this.activeScene.update(1/60); if (this.activeScene?.render) this.activeScene.render(this.renderer); requestAnimationFrame(this.loop); };
  setPanel(html) { this.elements.contextPanel.innerHTML = html; }
  toast(message, kind = 'info') { showToast(this.elements.toastRoot, message, kind); }
}
