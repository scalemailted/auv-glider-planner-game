import { downloadJSON, downloadText } from '../../core/io/ImportExport.js';
import {
  buildLevelDataset,
  buildSolverPacketDataset,
  buildTrainingExamplesJSONL,
  generateDataset
} from '../../core/io/DatasetExporter.js';

export class DatasetExportScene {
  label = 'Dataset Export';

  constructor(app) {
    this.app = app;
    this.dataset = null;
  }

  enter() {
    this.app.setPanel(`
      <h2>Dataset Export</h2>
      <p class="small">Generate small deterministic browser-safe datasets for solvers and future ML experiments.</p>
      <div class="coordinate-grid">
        <label>Levels <input id="dataset-count" type="number" value="5" min="1" max="50" /></label>
        <label>Seed start <input id="dataset-seed" type="number" value="1" /></label>
        <label>Width <input id="dataset-width" type="number" value="12" min="8" max="32" /></label>
        <label>Height <input id="dataset-height" type="number" value="12" min="8" max="32" /></label>
        <label>Difficulty
          <select id="dataset-difficulty">
            <option value="tutorial">tutorial</option>
            <option value="easy">easy</option>
            <option value="medium" selected>medium</option>
            <option value="hard">hard</option>
            <option value="chaotic">chaotic</option>
          </select>
        </label>
        <label>Current strength <input id="dataset-current" type="number" value="0.9" min="0" max="2" step="0.05" /></label>
        <label>Hazard density <input id="dataset-hazards" type="number" value="0.07" min="0" max="0.4" step="0.01" /></label>
        <label>ROI hotspots <input id="dataset-roi" type="number" value="3" min="1" max="8" /></label>
        <label>Challenge mode
          <select id="dataset-challenge-mode">
            <option value="perfectKnowledge">perfectKnowledge</option>
            <option value="forecast" selected>forecast</option>
          </select>
        </label>
        <label>Forecast noise <input id="dataset-forecast-noise" type="number" value="0.12" min="0" max="0.5" step="0.01" /></label>
      </div>
      <label class="file-control"><input id="dataset-hidden-truth" type="checkbox" /> Include hidden truth for benchmarking</label>
      <div class="panel-stack">
        <button id="btn-preview-dataset">Generate Dataset Preview</button>
        <button id="btn-export-level-dataset">Export Level Dataset JSON</button>
        <button id="btn-export-packet-dataset">Export Solver Packet Dataset JSON</button>
        <button id="btn-export-jsonl">Export Training Examples JSONL</button>
        <button id="btn-back-menu">Back to Menu</button>
      </div>
      <p id="dataset-status" class="small">No dataset generated yet.</p>
    `);

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
    document.getElementById('btn-back-menu').onclick = () => this.app.goTo('mainMenu');
  }

  generatePreview() {
    this.dataset = generateDataset(this.readConfig(), this.app.state.mission);
    const first = this.dataset.levels[0];
    document.getElementById('dataset-status').textContent = `Generated ${this.dataset.levels.length} levels. First: ${first.levelId}.`;
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
      difficulty: document.getElementById('dataset-difficulty').value,
      currentStrength: Number(document.getElementById('dataset-current').value),
      hazardDensity: Number(document.getElementById('dataset-hazards').value),
      roiHotspots: Number(document.getElementById('dataset-roi').value),
      challengeMode: document.getElementById('dataset-challenge-mode').value,
      forecastNoise: Number(document.getElementById('dataset-forecast-noise').value),
      includeHiddenTruth: document.getElementById('dataset-hidden-truth').checked,
      forecastMode: document.getElementById('dataset-challenge-mode').value === 'forecast' ? 'noisy' : 'none'
    };
  }

  render(renderer) {
    const level = this.dataset?.levels?.[0];
    if (level) renderer.drawLevelPreview(level);
    else renderer.drawTitleCard('Dataset Export', 'Generate synthetic levels and solver packets.');
  }
}
