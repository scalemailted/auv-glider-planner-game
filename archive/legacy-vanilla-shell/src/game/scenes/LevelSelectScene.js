import { downloadJSON, readJSONFile } from '../../core/io/ImportExport.js';
import { ensureLevelIdentity } from '../../core/identity/GameInstanceId.js';
import { CAMPAIGN_LEVELS, loadCampaignLevel } from '../../core/campaign/CampaignLevels.js';
import { ratingLabel } from '../../core/campaign/RatingSystem.js';

export class LevelSelectScene {
  label = 'Campaign';

  constructor(app) {
    this.app = app;
  }

  enter() {
    const level = this.app.state.level;
    this.app.setPanel(`
      <h2>Campaign</h2>
      <div class="level-card">
        <strong>Current: ${level?.meta?.name ?? 'No level loaded'}</strong>
        <p class="small">${level?.meta?.description ?? ''}</p>
        <label class="small">Challenge mode
          <select id="level-challenge-mode">
            <option value="perfectKnowledge" ${(this.app.state.challengeMode ?? 'perfectKnowledge') === 'perfectKnowledge' ? 'selected' : ''}>Perfect Knowledge</option>
            <option value="forecast" ${(this.app.state.challengeMode ?? 'perfectKnowledge') === 'forecast' ? 'selected' : ''}>Forecast</option>
          </select>
        </label>
        <button id="btn-use-current">Use Current Level</button>
      </div>
      <h3>Tutorial Sequence</h3>
      <div class="campaign-list">
        ${getOrderedCampaignLevels().map((entry) => this.renderCampaignCard(entry)).join('')}
      </div>
      <h3>Sandbox</h3>
      ${this.app.state.customLevel ? `
        <div class="level-card">
          <strong>${this.app.state.customLevel.meta?.name ?? this.app.state.customLevel.levelId}</strong>
          <p class="small">${this.app.state.customLevel.meta?.description ?? ''}</p>
          <button id="btn-use-custom">Use Custom Level</button>
        </div>
      ` : '<p class="small">Generate or import a custom level in the Level Editor.</p>'}
      <div class="panel-stack">
        <button id="btn-export-level">Export Current Level JSON</button>
        <label class="file-control">Import Level JSON <input id="level-file" type="file" accept="application/json" /></label>
        <button id="btn-open-editor">Open Sandbox / Level Generator</button>
      </div>
    `);

    document.getElementById('btn-use-current').onclick = () => this.app.goTo('planning');
    document.getElementById('level-challenge-mode').onchange = (event) => {
      this.app.state.challengeMode = event.target.value;
      this.app.state.ui.revealTruth = false;
      this.app.toast(`Challenge mode set to ${event.target.value}.`, 'info');
    };
    document.querySelectorAll('button[data-campaign-level]').forEach((button) => {
      button.onclick = () => this.loadCampaign(button.dataset.campaignLevel);
    });
    document.getElementById('btn-use-custom')?.addEventListener('click', () => {
      this.app.state.level = ensureLevelIdentity(this.app.state.customLevel);
      this.app.state.challengeMode = this.app.state.customLevel.challengeMode ?? this.app.state.challengeMode ?? 'perfectKnowledge';
      this.app.state.ui.revealTruth = false;
      this.app.state.plan = null;
      this.app.state.simulationResume = null;
      this.app.state.surfacedAgents = [];
      this.app.toast('Custom level selected.', 'success');
      this.app.goTo('planning');
    });
    document.getElementById('btn-export-level').onclick = () => downloadJSON('anchor_level.json', ensureLevelIdentity(this.app.state.level));
    document.getElementById('level-file').onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        this.app.state.level = ensureLevelIdentity(await readJSONFile(file));
        this.app.state.customLevel = this.app.state.level;
        this.app.state.challengeMode = this.app.state.level.challengeMode ?? 'perfectKnowledge';
        this.app.state.ui.revealTruth = false;
        this.app.state.plan = null;
        this.app.state.simulationResume = null;
        this.app.state.surfacedAgents = [];
        this.app.toast('Level imported.', 'success');
        this.enter();
      } catch (error) {
        this.app.toast(`Level import failed: ${error.message ?? error}`, 'error');
      }
    };
    document.getElementById('btn-open-editor').onclick = () => this.app.goTo('levelEditor');
  }

  renderCampaignCard(entry) {
    const progress = this.app.state.progress;
    const locked = entry.campaign?.unlockAfter && !progress.completedLevels?.[entry.campaign.unlockAfter];
    const bestScore = progress.bestScores?.[entry.id];
    const bestRating = progress.bestRatings?.[entry.id] ?? 'none';
    const complete = progress.completedLevels?.[entry.id];
    return `
      <section class="level-card ${locked ? 'locked' : ''}">
        <strong>${entry.label}</strong>
        <p class="small">${entry.campaign?.concept ?? 'Mission planning'}</p>
        <p class="small">Status: ${complete ? 'completed' : locked ? 'locked' : 'available'} | Best: ${bestScore ?? 'N/A'} | Rating: ${ratingLabel(bestRating)}</p>
        <button data-campaign-level="${entry.id}" ${locked ? 'disabled' : ''}>Play</button>
      </section>
    `;
  }

  async loadCampaign(id) {
    const entry = CAMPAIGN_LEVELS.find((candidate) => candidate.id === id);
    if (!entry) return;
    this.app.state.level = ensureLevelIdentity(await loadCampaignLevel(entry));
    this.app.state.challengeMode = this.app.state.level.challengeMode ?? entry.mode;
    this.app.state.ui.revealTruth = false;
    this.app.state.plan = null;
    this.app.state.simulationResume = null;
    this.app.state.surfacedAgents = [];
    this.app.toast(`${entry.label} loaded.`, 'success');
    this.app.goTo('planning');
  }

  render(renderer) {
    renderer.drawLevelPreview(this.app.state.level);
  }
}

function getOrderedCampaignLevels() {
  return [...CAMPAIGN_LEVELS].sort((a, b) => (a.campaign?.order ?? 0) - (b.campaign?.order ?? 0));
}
