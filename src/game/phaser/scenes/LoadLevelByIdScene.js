import { loadJSON, readJSONFile, downloadJSON } from '../../../core/io/ImportExport.js';
import { ensureLevelIdentity, shortInstanceId } from '../../../core/identity/GameInstanceId.js';
import {
  deleteSavedLevel,
  findSavedLevel,
  listSavedLevels,
  saveLevelToRegistry,
  SAVED_LEVELS_STORAGE_KEY
} from '../../../core/storage/LevelRegistry.js';
import { beginScenario } from '../../../core/scenario/ScenarioState.js';
import { EXPERIENCE_MODES } from '../../../core/experience/ExperienceMode.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class LoadLevelByIdScene extends PhaserScene {
  constructor() {
    super('LoadLevelByIdScene');
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'savedLevels';
    this.app.clearPanels();
    this.app.setSceneLabel('Legacy Saved Levels');
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.drawTitle();
    this.renderPanel();
  }

  drawTitle() {
    this.add.text(70, 86, 'Legacy Saved Levels', {
      fontFamily: 'system-ui',
      fontSize: '38px',
      fontStyle: '700',
      color: '#eef6ff'
    });
    this.add.text(74, 140, `Saved registry: ${SAVED_LEVELS_STORAGE_KEY}`, {
      fontFamily: 'system-ui',
      fontSize: '16px',
      color: '#9cb4d8'
    });
  }

  renderPanel(status = '') {
    const saved = listSavedLevels();
    this.app.setPanel(`
      <section class="console-header">
        <div class="console-kicker">Saved Levels</div>
        <h1>Legacy Saved Levels</h1>
        <p>Manage locally saved levels by UUID/instance ID. For normal sharing or recall, use Load Level JSON from the Main Menu.</p>
      </section>
      ${saved.available ? '' : `<p class="small warning">${escapeHtml(saved.error ?? 'localStorage is unavailable. JSON import/export still works.')}</p>`}
      ${status ? `<section class="console-status"><span>Status</span><strong>${escapeHtml(status)}</strong></section>` : ''}
      <section class="console-section">
        <h2>Load Saved Level</h2>
        <label>Level ID or Instance ID <input id="saved-level-id-input" placeholder="GID-... or tutorial_01_currents" /></label>
        <div class="workspace-tool-grid">
          <button id="btn-load-saved-level">Load Saved Level</button>
          <button id="btn-load-built-in-level">Load Built-In ID</button>
        </div>
      </section>
      <section class="console-section">
        <h2>Saved Levels</h2>
        ${renderSavedLevels(saved.entries ?? [])}
      </section>
      <section class="console-section">
        <h2>Import / Export</h2>
        <label class="file-control">Import Level JSON <input id="import-level-file" type="file" accept="application/json" /></label>
        <button id="btn-save-current-level" ${this.app.state.level ? '' : 'disabled'}>Save Current Level</button>
      </section>
      <section class="console-footer">
        <button id="btn-back-menu" class="console-button secondary">Main Menu</button>
      </section>
    `);
    this.app.clearAuxiliaryPanels();

    document.getElementById('btn-load-saved-level').onclick = () => this.loadSavedByInput();
    document.getElementById('btn-load-built-in-level').onclick = () => this.loadBuiltInByInput();
    document.getElementById('btn-save-current-level').onclick = () => this.saveCurrentLevel();
    document.getElementById('btn-back-menu').onclick = () => this.scene.start('MainMenuScene');
    document.getElementById('import-level-file').onchange = async (event) => {
      await this.importLevelFile(event.target.files?.[0]);
      event.target.value = '';
    };
    document.querySelectorAll('[data-load-saved-instance]').forEach((button) => {
      button.onclick = () => this.loadSavedLevel(button.dataset.loadSavedInstance);
    });
    document.querySelectorAll('[data-export-saved-instance]').forEach((button) => {
      button.onclick = () => this.exportSavedLevel(button.dataset.exportSavedInstance);
    });
    document.querySelectorAll('[data-delete-saved-instance]').forEach((button) => {
      button.onclick = () => this.deleteSavedLevel(button.dataset.deleteSavedInstance);
    });
  }

  async loadSavedByInput() {
    await this.loadSavedLevel(document.getElementById('saved-level-id-input').value);
  }

  async loadSavedLevel(id) {
    const found = findSavedLevel(id);
    if (!found.ok) {
      this.app.toast(found.error, 'warning');
      this.renderPanel(found.error);
      return;
    }
    await this.openLevel(found.entry.level);
  }

  async loadBuiltInByInput() {
    const id = String(document.getElementById('saved-level-id-input').value || '').trim();
    if (!id) return this.app.toast('Enter a built-in level ID.', 'warning');
    const path = id.endsWith('.json') ? id : `levels/${id}.json`;
    try {
      await this.openLevel(await loadJSON(path));
    } catch (error) {
      this.app.toast(`Built-in level load failed: ${error.message ?? error}`, 'error');
    }
  }

  async importLevelFile(file) {
    if (!file) return;
    try {
      const level = ensureLevelIdentity(await readJSONFile(file));
      const saved = saveLevelToRegistry(level);
      if (!saved.ok) {
        this.app.toast(`Imported level loaded, but could not save: ${saved.error}`, 'warning');
      } else {
        this.app.toast(`Imported and saved ${shortInstanceId(saved.instanceId)}.`, 'success');
      }
      await this.openLevel(saved.level ?? level);
    } catch (error) {
      this.app.toast(`Level import failed: ${error.message ?? error}`, 'error');
    }
  }

  saveCurrentLevel() {
    const saved = saveLevelToRegistry(this.app.state.level);
    if (!saved.ok) {
      this.app.toast(saved.error, 'warning');
      this.renderPanel(saved.error);
      return;
    }
    this.app.state.level = saved.level;
    this.app.toast(`Saved level ${shortInstanceId(saved.instanceId)}.`, 'success');
    this.renderPanel(`Saved ${saved.level.levelId} (${shortInstanceId(saved.instanceId)}).`);
  }

  exportSavedLevel(instanceId) {
    const found = findSavedLevel(instanceId);
    if (!found.ok) return this.app.toast(found.error, 'warning');
    downloadJSON(`${found.entry.level?.levelId ?? 'saved_level'}_${shortInstanceId(instanceId)}.json`, found.entry.level);
  }

  deleteSavedLevel(instanceId) {
    const deleted = deleteSavedLevel(instanceId);
    if (!deleted.ok) {
      this.app.toast(deleted.error, 'warning');
      return;
    }
    this.app.toast(`Deleted saved level ${shortInstanceId(instanceId)}.`, 'success');
    this.renderPanel(`Deleted ${shortInstanceId(instanceId)}.`);
  }

  async openLevel(rawLevel) {
    const level = ensureLevelIdentity(rawLevel);
    const mission = this.app.state.mission ?? await loadJSON('missions/tutorial_sampling.json');
    beginScenario(this.app.state, {
      level,
      mission,
      challengeMode: level.challengeMode ?? 'perfectKnowledge',
      experienceMode: level.meta?.experienceMode ?? mission.meta?.experienceMode ?? EXPERIENCE_MODES.simulationLab,
      source: 'savedLevel'
    });
    this.scene.start('MissionBriefingScene');
  }
}

function renderSavedLevels(entries) {
  if (!entries.length) return '<p class="small">No locally saved levels yet.</p>';
  return `
    <div class="saved-level-list">
      ${entries.map(({ instanceId, savedAt, level }) => `
        <article class="saved-level-row">
          <div>
            <strong>${escapeHtml(level?.meta?.name ?? level?.levelId ?? 'Saved level')}</strong>
            <p class="small">Level ${escapeHtml(level?.levelId ?? 'unknown')} | Instance ${escapeHtml(shortInstanceId(instanceId))} | Seed ${escapeHtml(level?.meta?.seed ?? 'N/A')} | Saved ${escapeHtml(formatSavedAt(savedAt))}</p>
          </div>
          <div class="workspace-tool-grid">
            <button data-load-saved-instance="${escapeHtml(instanceId)}">Load</button>
            <button data-export-saved-instance="${escapeHtml(instanceId)}">Export</button>
            <button data-delete-saved-instance="${escapeHtml(instanceId)}">Delete</button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function formatSavedAt(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
