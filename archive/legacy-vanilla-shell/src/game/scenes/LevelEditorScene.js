import { generateLevel } from '../../core/generation/LevelGenerator.js';
import { DIFFICULTY_PRESETS } from '../../core/generation/DifficultyPresets.js';
import { downloadJSON, readJSONFile } from '../../core/io/ImportExport.js';
import { ensureLevelIdentity, shortInstanceId } from '../../core/identity/GameInstanceId.js';

const BRUSHES = ['terrain', 'hazard', 'clear', 'roi'];

export class LevelEditorScene {
  label = 'Level Editor';

  constructor(app) {
    this.app = app;
    this.level = null;
    this.brush = 'terrain';
    this.onCanvasClick = this.onCanvasClick.bind(this);
  }

  enter() {
    this.level = this.app.state.customLevel ?? this.app.state.level ?? generateLevel({ difficulty: 'medium', seed: 1001 });
    this.app.setPanel(this.renderControls());
    this.bindControls();
    this.app.elements.canvas.addEventListener('click', this.onCanvasClick);
  }

  exit() {
    this.app.elements.canvas.removeEventListener('click', this.onCanvasClick);
  }

  renderControls() {
    ensureLevelIdentity(this.level);
    return `
      <h2>Level Generator</h2>
      <p class="small id-line">Level ${this.level?.levelId ?? 'unknown'} | Instance ${shortInstanceId(this.level)} | Seed ${this.level?.meta?.seed ?? 'N/A'}</p>
      <label class="small">Level name <input id="level-name" value="${this.level?.meta?.name ?? 'Generated Level'}" /></label>
      <div class="coordinate-grid">
        <label>Width <input id="level-width" type="number" min="8" max="32" value="${this.level?.world?.grid?.width ?? 14}" /></label>
        <label>Height <input id="level-height" type="number" min="8" max="32" value="${this.level?.world?.grid?.height ?? 14}" /></label>
        <label>Seed <input id="level-seed" type="text" value="${this.level?.meta?.seed ?? 1001}" /></label>
        <label>Difficulty
          <select id="difficulty">${Object.keys(DIFFICULTY_PRESETS).map((key) => `<option value="${key}" ${key === (this.level?.meta?.difficulty ?? 'medium') ? 'selected' : ''}>${key}</option>`).join('')}</select>
        </label>
        <label>Current pattern
          <select id="current-pattern">${optionList(['none', 'uniform', 'wave', 'vortex', 'corridor', 'eddies'], 'wave')}</select>
        </label>
        <label>Current strength <input id="current-strength" type="number" min="0" max="2" step="0.05" value="0.9" /></label>
        <label>ROI pattern
          <select id="roi-pattern">${optionList(['single', 'multiple', 'moving', 'clustered'], 'multiple')}</select>
        </label>
        <label>ROI hotspots <input id="roi-hotspots" type="number" min="1" max="8" value="3" /></label>
        <label>Hazard density <input id="hazard-density" type="number" min="0" max="0.4" step="0.01" value="0.07" /></label>
        <label>Land density <input id="terrain-density" type="number" min="0" max="0.4" step="0.01" value="0.08" /></label>
        <label>Duration <input id="duration" type="number" min="10" max="200" value="${this.level?.world?.time?.duration ?? 60}" /></label>
        <label>Planning window <input id="planning-window" type="number" min="2" max="60" value="${this.level?.world?.time?.planningWindow ?? 10}" /></label>
        <label>Forecast mode
          <select id="forecast-mode">${optionList(['none', 'noisy', 'confidence'], this.level?.layers?.forecast?.frames?.length ? 'noisy' : 'none')}</select>
        </label>
        <label>Challenge mode
          <select id="challenge-mode">${optionList(['perfectKnowledge', 'forecast'], this.app.state.challengeMode ?? 'perfectKnowledge')}</select>
        </label>
      </div>
      <h3>Brush</h3>
      <div class="timeline-strip">
        ${BRUSHES.map((brush) => `<button data-brush="${brush}" class="${brush === this.brush ? 'active' : ''}">${brush}</button>`).join('')}
      </div>
      <div class="panel-stack">
        <button id="btn-generate-level">Generate Level</button>
        <button id="btn-use-level">Use This Level</button>
        <button id="btn-export-level">Export Level JSON</button>
        <label class="file-control">Import Level JSON <input id="level-file" type="file" accept="application/json" /></label>
        <button id="btn-clear-edits">Clear Edits</button>
        <button id="btn-back-menu">Back to Menu</button>
      </div>
      <p id="level-editor-status" class="small">Click cells to apply the selected brush.</p>
    `;
  }

  bindControls() {
    document.getElementById('difficulty').onchange = (event) => this.applyPreset(event.target.value);
    document.getElementById('btn-generate-level').onclick = () => {
      this.level = generateLevel(this.readConfig());
      this.app.state.customLevel = this.level;
      this.app.state.challengeMode = this.level.challengeMode ?? this.app.state.challengeMode;
      this.status('Generated level preview updated.');
    };
    document.getElementById('btn-use-level').onclick = () => {
      ensureLevelIdentity(this.level);
      this.app.state.level = this.level;
      this.app.state.customLevel = this.level;
      this.app.state.challengeMode = document.getElementById('challenge-mode').value;
      this.app.state.plan = null;
      this.app.toast('Generated level selected for play.', 'success');
      this.app.goTo('briefing');
    };
    document.getElementById('btn-export-level').onclick = () => {
      ensureLevelIdentity(this.level);
      downloadJSON(`${this.level.levelId}.json`, this.level);
    };
    document.getElementById('level-file').onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        this.level = ensureLevelIdentity(await readJSONFile(file));
        this.app.state.customLevel = this.level;
        this.app.state.challengeMode = this.level.challengeMode ?? 'perfectKnowledge';
        this.app.toast('Level imported.', 'success');
        this.exit();
        this.enter();
      } catch (error) {
        this.app.toast(`Level import failed: ${error.message ?? error}`, 'error');
      }
    };
    document.getElementById('btn-clear-edits').onclick = () => {
      this.level = generateLevel(this.readConfig());
      this.app.state.customLevel = this.level;
      this.status('Edits cleared by regenerating from current controls.');
    };
    document.getElementById('btn-back-menu').onclick = () => this.app.goTo('mainMenu');
    document.querySelectorAll('button[data-brush]').forEach((button) => {
      button.onclick = () => {
        this.brush = button.dataset.brush;
        document.querySelectorAll('button[data-brush]').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
      };
    });
  }

  applyPreset(difficulty) {
    const preset = DIFFICULTY_PRESETS[difficulty];
    if (!preset) return;
    setValue('level-width', preset.width);
    setValue('level-height', preset.height);
    setValue('current-strength', preset.currentStrength);
    setValue('current-pattern', preset.currentPattern);
    setValue('roi-pattern', preset.roiPattern);
    setValue('roi-hotspots', preset.roiHotspots);
    setValue('hazard-density', preset.hazardDensity);
    setValue('terrain-density', preset.terrainDensity);
    setValue('duration', preset.duration);
    setValue('planning-window', preset.planningWindow);
    setValue('forecast-mode', preset.forecastMode);
  }

  readConfig() {
    const forecastMode = value('forecast-mode');
    return {
      name: value('level-name'),
      width: numberValue('level-width'),
      height: numberValue('level-height'),
      seed: value('level-seed'),
      difficulty: value('difficulty'),
      currentPattern: value('current-pattern'),
      currentStrength: numberValue('current-strength'),
      roiPattern: value('roi-pattern'),
      roiHotspots: numberValue('roi-hotspots'),
      hazardDensity: numberValue('hazard-density'),
      terrainDensity: numberValue('terrain-density'),
      duration: numberValue('duration'),
      planningWindow: numberValue('planning-window'),
      forecastMode,
      challengeMode: value('challenge-mode')
    };
  }

  onCanvasClick(event) {
    const cell = this.app.renderer.canvasEventToCell(event, this.level);
    if (!cell) {
      this.status('Click inside the level grid to edit a cell.');
      return;
    }

    applyBrush(this.level, cell.x, cell.y, this.brush);
    this.app.state.customLevel = this.level;
    this.status(`${this.brush} applied at (${cell.x}, ${cell.y}).`);
  }

  status(message) {
    const status = document.getElementById('level-editor-status');
    if (status) status.textContent = message;
  }

  render(renderer) {
    renderer.drawLevelPreview(this.level);
  }
}

function applyBrush(level, x, y, brush) {
  const base = level.layers.bases?.[0];
  const protectedCell = base && base.x === x && base.y === y;
  if (protectedCell) return;

  if (brush === 'terrain') {
    level.layers.terrain[y][x] = 1;
    level.layers.hazards[y][x] = 0;
  } else if (brush === 'hazard') {
    if (!level.layers.terrain[y][x]) level.layers.hazards[y][x] = 1;
  } else if (brush === 'clear') {
    level.layers.terrain[y][x] = 0;
    level.layers.hazards[y][x] = 0;
  } else if (brush === 'roi') {
    for (const frame of level.layers.truth.frames ?? []) {
      frame.roi[y][x] = Math.min(1, Number(((frame.roi[y][x] ?? 0) + 0.2).toFixed(3)));
    }
    for (const frame of level.layers.forecast?.frames ?? []) {
      frame.roi[y][x] = Math.min(1, Number(((frame.roi[y][x] ?? 0) + 0.15).toFixed(3)));
    }
  }
}

function optionList(values, selected) {
  return values.map((item) => `<option value="${item}" ${item === selected ? 'selected' : ''}>${item}</option>`).join('');
}

function value(id) {
  return document.getElementById(id).value;
}

function numberValue(id) {
  return Number(document.getElementById(id).value);
}

function setValue(id, newValue) {
  document.getElementById(id).value = String(newValue);
}
