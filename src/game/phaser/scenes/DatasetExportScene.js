import { downloadJSON, downloadText } from '../../../core/io/ImportExport.js';
import {
  buildLevelDataset,
  buildSolverPacketDataset,
  buildTrainingExamplesJSONL,
  generateDataset
} from '../../../core/io/DatasetExporter.js';
import { drawMissionMap } from '../PhaserCoreAdapter.js';
import { CURRENT_PRESET_CHOICES, VECTOR_FIELD_PRESETS } from '../../../core/generation/VectorFieldPresets.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class DatasetExportScene extends PhaserScene {
  constructor() {
    super('DatasetExportScene');
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'dataset';
    this.app.setSceneLabel('Dataset Export');
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.graphics = this.add.graphics();
    this.dataset = null;
    this.renderPanel();
    this.drawEmpty();
  }

  renderPanel() {
    this.app.setPanel(`
      <section class="console-header">
        <div class="console-kicker">Dataset Export</div>
        <h1>Dataset Export</h1>
        <p>Generate deterministic browser-safe datasets for solvers and training workflows.</p>
      </section>
      <section class="console-section">
      <h2>Generation</h2>
      <div class="coordinate-grid">
        <label>Levels <input id="dataset-count" type="number" value="5" min="1" max="50" /></label>
        <label>Seed start <input id="dataset-seed" type="number" value="1" /></label>
        <label>Width <input id="dataset-width" type="number" value="12" min="8" max="32" /></label>
        <label>Height <input id="dataset-height" type="number" value="12" min="8" max="32" /></label>
        <label>Current preset <select id="dataset-current-preset">${CURRENT_PRESET_CHOICES.map((key) => `<option value="${key}" ${key === 'eddyField' ? 'selected' : ''}>${VECTOR_FIELD_PRESETS[key]?.label ?? labelize(key)}</option>`).join('')}</select></label>
        <label>Current strength <select id="dataset-current-strength"><option value="0.45">Low</option><option value="0.85" selected>Medium</option><option value="1.25">High</option></select></label>
        <label>Temporal variability <select id="dataset-current-variability"><option value="0.2">Low</option><option value="0.55" selected>Medium</option><option value="0.9">High</option></select></label>
      </div>
      </section>
      <section class="console-section">
      <h2>Exports</h2>
      <div class="panel-stack">
        <button id="btn-preview-dataset">Generate Dataset Preview</button>
        <button id="btn-export-level-dataset">Export Level Dataset JSON</button>
        <button id="btn-export-packet-dataset">Export Solver Packet Dataset JSON</button>
        <button id="btn-export-jsonl">Export Training Examples JSONL</button>
      </div>
      </section>
      <section class="console-status">
      <span>Status</span>
      <p id="dataset-status" class="small">No dataset generated yet.</p>
      </section>
      <section class="console-footer">
        <button id="btn-back-menu" class="console-button secondary">Main Menu</button>
      </section>
    `);
    this.app.clearAuxiliaryPanels();
    document.getElementById('btn-preview-dataset').onclick = () => this.generatePreview();
    document.getElementById('btn-export-level-dataset').onclick = () => {
      this.ensureDataset();
      downloadJSON('anchor_level_dataset.json', buildLevelDataset(this.dataset.levels));
    };
    document.getElementById('btn-export-packet-dataset').onclick = () => {
      this.ensureDataset();
      downloadJSON('anchor_solver_packet_dataset.json', buildSolverPacketDataset(this.dataset.packets));
    };
    document.getElementById('btn-export-jsonl').onclick = () => {
      this.ensureDataset();
      downloadText('anchor_training_examples.jsonl', buildTrainingExamplesJSONL(this.dataset.examples), 'application/jsonl');
    };
    document.getElementById('btn-back-menu').onclick = () => this.scene.start('MainMenuScene');
  }

  async generatePreview() {
    const mission = this.app.state.mission ?? await (await fetch('missions/tutorial_sampling.json')).json();
    this.app.state.mission = mission;
    this.dataset = generateDataset(this.readConfig(), mission);
    document.getElementById('dataset-status').textContent = `Generated ${this.dataset.levels.length} levels. First: ${this.dataset.levels[0].levelId}.`;
    this.graphics.clear();
    this.app.adapter.layout = drawMissionMap(this.graphics, { level: this.dataset.levels[0], mission });
  }

  ensureDataset() {
    if (!this.dataset) this.generatePreview();
  }

  readConfig() {
    return {
      count: Number(document.getElementById('dataset-count').value),
      seedStart: Number(document.getElementById('dataset-seed').value),
      width: Number(document.getElementById('dataset-width').value),
      height: Number(document.getElementById('dataset-height').value),
      difficulty: 'medium',
      currentPreset: document.getElementById('dataset-current-preset').value,
      currentStrength: Number(document.getElementById('dataset-current-strength').value),
      currentVariability: Number(document.getElementById('dataset-current-variability').value),
      challengeMode: 'forecast',
      forecastMode: 'noisy'
    };
  }

  drawEmpty() {
    this.add.text(70, 90, 'Dataset Export', { fontFamily: 'system-ui', fontSize: '34px', color: '#eef6ff' });
  }
}

function labelize(value) {
  return String(value).replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}
