import { CAMPAIGN_LEVELS } from '../core/campaign/CampaignLevels.js';
import { loadCampaignProgress } from '../core/campaign/CampaignProgress.js';
import { formatMetric } from '../core/evaluation/PlanComparison.js';

export class CenterTutorialBrowser {
  constructor(app, { handlers = {} } = {}) {
    this.app = app;
    this.handlers = handlers;
    this.root = app?.elements?.overlay?.topHud ?? null;
    this.detailsRoot = app?.elements?.waypointTimelineRoot ?? null;
    this.state = {
      search: '',
      difficulty: 'all',
      status: 'all',
      focus: 'all',
      selectedId: null
    };
    this.progress = loadCampaignProgress();
    this.records = [];
  }

  mount() {
    this.root?.classList.add('leaderboard-center-host', 'tutorial-center-host');
    this.refresh();
  }

  destroy() {
    this.root?.classList.remove('leaderboard-center-host', 'tutorial-center-host');
    if (this.root) this.root.innerHTML = '';
    if (this.detailsRoot) this.detailsRoot.innerHTML = '';
  }

  getState() {
    return {
      ...this.state,
      count: this.records.length,
      total: CAMPAIGN_LEVELS.length,
      completed: completedCount(this.progress),
      recommendedId: recommendedTutorialId(this.progress),
      focusOptions: focusOptions()
    };
  }

  setSearch(search) {
    this.state.search = search ?? '';
    this.refresh();
  }

  setDifficulty(difficulty) {
    this.state.difficulty = difficulty || 'all';
    this.refresh();
  }

  setStatus(status) {
    this.state.status = status || 'all';
    this.refresh();
  }

  setFocus(focus) {
    this.state.focus = focus || 'all';
    this.refresh();
  }

  select(id) {
    this.state.selectedId = id;
    this.renderCenter();
    this.renderDetails();
  }

  refresh() {
    this.progress = loadCampaignProgress();
    this.records = filteredTutorials(this.state, this.progress);
    if (this.state.selectedId && !this.records.some((entry) => entry.id === this.state.selectedId)) {
      this.state.selectedId = null;
    }
    if (!this.state.selectedId && this.records.length) {
      this.state.selectedId = this.records[0].id;
    }
    this.renderCenter();
    this.renderDetails();
  }

  renderCenter() {
    if (!this.root) return;
    this.root.innerHTML = `
      <main class="leaderboard-browser tutorial-browser" aria-label="Tutorial campaign browser">
        <header class="leaderboard-browser-header">
          <div>
            <p class="center-kicker">Tutorial Mode</p>
            <h1>Training Campaign</h1>
            <p>Browse staged lessons, inspect objectives, and start the tutorial that matches your next planning skill.</p>
          </div>
          <div class="leaderboard-count">
            <span>${escapeHtml(this.records.length)}</span>
            <strong>${this.records.length === 1 ? 'lesson' : 'lessons'}</strong>
          </div>
        </header>
        <section class="leaderboard-card-list tutorial-card-list">
          ${this.records.length ? this.records.map((entry) => tutorialCardHtml(entry, this.progress, this.state.selectedId)).join('') : emptyTutorialHtml()}
        </section>
      </main>
    `;
    this.root.querySelectorAll('[data-select-tutorial]').forEach((button) => {
      button.addEventListener('click', () => this.select(button.dataset.selectTutorial));
    });
    this.root.querySelectorAll('[data-start-tutorial]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.start?.(button.dataset.startTutorial));
    });
  }

  renderDetails() {
    if (!this.detailsRoot) return;
    const entry = CAMPAIGN_LEVELS.find((candidate) => candidate.id === this.state.selectedId);
    if (!entry) {
      this.detailsRoot.innerHTML = `
        <section class="waypoint-shell leaderboard-detail-panel tutorial-detail-panel">
          <div class="console-kicker">Tutorial Details</div>
          <h2>Select a tutorial</h2>
          <p class="hud-muted">Select a tutorial to view details.</p>
        </section>
      `;
      return;
    }
    this.detailsRoot.innerHTML = tutorialDetailsHtml(entry, this.progress);
    this.detailsRoot.querySelector('[data-start-selected]')?.addEventListener('click', () => this.handlers.start?.(entry.id));
  }
}

function filteredTutorials(state, progress) {
  const search = String(state.search ?? '').trim().toLowerCase();
  return CAMPAIGN_LEVELS
    .filter((entry) => difficultyMatches(entry, state.difficulty))
    .filter((entry) => statusMatches(entry, state.status, progress))
    .filter((entry) => focusMatches(entry, state.focus))
    .filter((entry) => {
      if (!search) return true;
      const text = [
        entry.title,
        entry.label,
        entry.campaign?.concept,
        entry.tutorial?.description,
        ...(entry.tutorial?.focus ?? []),
        ...(entry.campaign?.learningObjectives ?? [])
      ].join(' ').toLowerCase();
      return text.includes(search);
    })
    .sort((a, b) => Number(a.campaign?.order ?? 0) - Number(b.campaign?.order ?? 0));
}

function tutorialCardHtml(entry, progress, selectedId) {
  const selected = entry.id === selectedId;
  const criteria = entry.campaign?.successCriteria ?? {};
  const objectives = entry.campaign?.learningObjectives ?? [];
  const focus = entry.tutorial?.focus ?? entry.campaign?.focus ?? [];
  const completed = Boolean(progress.completedLevels?.[entry.id]);
  return `
    <article class="leaderboard-record-card tutorial-record-card ${selected ? 'selected' : ''}">
      <div class="leaderboard-record-main">
        <div class="leaderboard-record-title">
          <strong>${escapeHtml(entry.title ?? entry.label)}</strong>
          <span>${escapeHtml(entry.tutorial?.difficulty ?? entry.campaign?.difficulty ?? 'Tutorial')}</span>
        </div>
        <div class="leaderboard-score-line">${escapeHtml(entry.tutorial?.description ?? entry.campaign?.concept ?? 'Mission planning lesson')}</div>
        <div class="leaderboard-meta-line">Focus: ${escapeHtml(focus.join(', ') || 'Planning')}</div>
        <div class="leaderboard-meta-line">Objectives: ${escapeHtml(objectives.slice(0, 2).join(' '))}</div>
        <div class="leaderboard-meta-line">Success: ${escapeHtml(successSummary(criteria) || 'Complete the tutorial objectives.')}</div>
        <div class="leaderboard-badge-row">
          <span>${completed ? 'Completed' : progress.bestScores?.[entry.id] !== undefined ? 'Attempted' : 'Not Started'}</span>
          ${focus.slice(0, 4).map((tag) => `<span>${escapeHtml(labelFocus(tag))}</span>`).join('')}
        </div>
      </div>
      <div class="leaderboard-card-actions">
        <button data-select-tutorial="${escapeAttr(entry.id)}">${selected ? 'Details' : 'Select'}</button>
        <button data-start-tutorial="${escapeAttr(entry.id)}">Start Tutorial</button>
      </div>
    </article>
  `;
}

function tutorialDetailsHtml(entry, progress) {
  const focus = entry.tutorial?.focus ?? entry.campaign?.focus ?? [];
  const objectives = entry.campaign?.learningObjectives ?? [];
  const criteria = entry.campaign?.successCriteria ?? {};
  const completed = Boolean(progress.completedLevels?.[entry.id]);
  const bestScore = progress.bestScores?.[entry.id];
  return `
    <section class="waypoint-shell leaderboard-detail-panel tutorial-detail-panel">
      <div class="console-kicker">Tutorial Details</div>
      <h2>${escapeHtml(entry.title ?? entry.label)}</h2>
      <p class="hud-muted">${escapeHtml(entry.tutorial?.difficulty ?? entry.campaign?.difficulty ?? 'Tutorial')} | Order ${escapeHtml(entry.campaign?.order ?? '')}</p>
      <div class="leaderboard-badge-row">${focus.map((tag) => `<span>${escapeHtml(labelFocus(tag))}</span>`).join('')}</div>
      <div class="leaderboard-detail-block">
        <strong>Overview</strong>
        <span>${escapeHtml(entry.tutorial?.description ?? entry.campaign?.concept ?? 'Learn a planning concept.')}</span>
      </div>
      <div class="leaderboard-detail-block">
        <strong>Learning Objectives</strong>
        <ol class="tutorial-detail-list">${objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>Complete the mission planning task.</li>'}</ol>
      </div>
      <div class="leaderboard-detail-block">
        <strong>Mechanics Introduced</strong>
        <span>${escapeHtml(mechanicsSummary(entry))}</span>
      </div>
      <div class="leaderboard-detail-block">
        <strong>Success Criteria</strong>
        <span>${escapeHtml(successSummary(criteria) || 'Complete the mission and review debrief feedback.')}</span>
      </div>
      <div class="leaderboard-detail-metrics">
        <div><span>Status</span><strong>${escapeHtml(completed ? 'Completed' : 'Open')}</strong></div>
        <div><span>Best Score</span><strong>${escapeHtml(bestScore === undefined ? 'N/A' : formatMetric(bestScore))}</strong></div>
      </div>
      <div class="leaderboard-detail-actions">
        <button data-start-selected>Start Tutorial</button>
      </div>
    </section>
  `;
}

function emptyTutorialHtml() {
  return `
    <article class="leaderboard-empty-card">
      <h2>No tutorials match the filters</h2>
      <p>Clear search or broaden filters to see the staged campaign.</p>
    </article>
  `;
}

function successSummary(criteria = {}) {
  return [
    criteria.minFinalScore ?? criteria.minScore ? `Score >= ${criteria.minFinalScore ?? criteria.minScore}` : null,
    criteria.minSampleScore ? `ROI >= ${criteria.minSampleScore}` : null,
    criteria.maxEnergyUsed ?? criteria.maxEnergy ? `Energy <= ${criteria.maxEnergyUsed ?? criteria.maxEnergy}` : null,
    criteria.maxHazardsHit !== undefined ? `Hazards <= ${criteria.maxHazardsHit}` : null
  ].filter(Boolean).join(' | ');
}

function mechanicsSummary(entry) {
  const features = entry.tutorial?.enabledFeatures ?? {};
  return Object.entries(features)
    .filter(([, enabled]) => enabled)
    .map(([key]) => labelFocus(key))
    .join(', ') || 'Waypoint planning, execution, and debrief review';
}

function difficultyMatches(entry, difficulty) {
  if (!difficulty || difficulty === 'all') return true;
  return String(entry.tutorial?.difficulty ?? entry.campaign?.difficulty ?? '').toLowerCase() === String(difficulty).toLowerCase();
}

function statusMatches(entry, status, progress) {
  if (!status || status === 'all') return true;
  const completed = Boolean(progress.completedLevels?.[entry.id]);
  if (status === 'completed') return completed;
  if (status === 'notStarted') return !completed && progress.bestScores?.[entry.id] === undefined;
  if (status === 'incomplete') return !completed;
  return true;
}

function focusMatches(entry, focus) {
  if (!focus || focus === 'all') return true;
  return (entry.tutorial?.focus ?? entry.campaign?.focus ?? []).some((tag) => normalizeTag(tag) === normalizeTag(focus));
}

function focusOptions() {
  const tags = new Map();
  for (const entry of CAMPAIGN_LEVELS) {
    for (const tag of entry.tutorial?.focus ?? entry.campaign?.focus ?? []) {
      tags.set(normalizeTag(tag), labelFocus(tag));
    }
  }
  return [...tags.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}

function recommendedTutorialId(progress) {
  return CAMPAIGN_LEVELS.find((entry) => !progress.completedLevels?.[entry.id])?.id ?? CAMPAIGN_LEVELS[0]?.id ?? null;
}

function completedCount(progress) {
  return CAMPAIGN_LEVELS.filter((entry) => progress.completedLevels?.[entry.id]).length;
}

function normalizeTag(value) {
  return String(value ?? '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
}

function labelFocus(value) {
  return String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[/_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
