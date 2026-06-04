import { formatMetric } from '../core/evaluation/PlanComparison.js';
import { shortInstanceId } from '../core/identity/GameInstanceId.js';
import { getBestAttempt, loadLeaderboard } from '../core/storage/LeaderboardStore.js';

export class CenterLeaderboardView {
  constructor(app, { handlers = {} } = {}) {
    this.app = app;
    this.handlers = handlers;
    this.root = app?.elements?.overlay?.topHud ?? null;
    this.detailsRoot = app?.elements?.waypointTimelineRoot ?? null;
    this.state = {
      filter: 'all',
      sort: 'bestScore',
      search: '',
      selectedInstanceId: null
    };
    this.board = loadLeaderboard();
    this.records = [];
  }

  mount() {
    this.root?.classList.add('leaderboard-center-host');
    this.refresh();
  }

  destroy() {
    this.root?.classList.remove('leaderboard-center-host');
    if (this.root) this.root.innerHTML = '';
    if (this.detailsRoot) this.detailsRoot.innerHTML = '';
  }

  getState() {
    return {
      ...this.state,
      count: this.records.length,
      total: Object.keys(this.board?.records ?? {}).length
    };
  }

  setFilter(filter) {
    this.state.filter = filter || 'all';
    this.refresh();
  }

  setSort(sort) {
    this.state.sort = sort || 'bestScore';
    this.refresh();
  }

  setSearch(search) {
    this.state.search = search ?? '';
    this.refresh();
  }

  reload() {
    this.board = loadLeaderboard();
    this.refresh();
  }

  select(instanceId) {
    this.state.selectedInstanceId = instanceId;
    this.renderCenter();
    this.renderDetails();
  }

  refresh() {
    this.board = loadLeaderboard();
    this.records = filteredRecords(this.board, this.state);
    if (this.state.selectedInstanceId && !this.board.records?.[this.state.selectedInstanceId]) {
      this.state.selectedInstanceId = null;
    }
    if (!this.state.selectedInstanceId && this.records.length) {
      this.state.selectedInstanceId = this.records[0].instanceId;
    }
    this.renderCenter();
    this.renderDetails();
  }

  renderCenter() {
    if (!this.root) return;
    this.root.innerHTML = `
      <main class="leaderboard-browser" aria-label="Leaderboard saved challenge browser">
        <header class="leaderboard-browser-header">
          <div>
            <p class="center-kicker">Local Leaderboard</p>
            <h1>Saved Challenge Records</h1>
            <p>Browse locally saved challenge attempts, load a challenge, replay the best plan, or export saved data.</p>
          </div>
          <div class="leaderboard-count">
            <span>${escapeHtml(this.records.length)}</span>
            <strong>${this.records.length === 1 ? 'record' : 'records'}</strong>
          </div>
        </header>
        <section class="leaderboard-card-list">
          ${this.records.length ? this.records.map((record) => recordCardHtml(record, getBestAttempt(this.board, record.instanceId), this.state.selectedInstanceId)).join('') : emptyBrowserHtml()}
        </section>
      </main>
    `;
    this.root.querySelectorAll('[data-select-record]').forEach((button) => {
      button.addEventListener('click', () => this.select(button.dataset.selectRecord));
    });
    this.root.querySelectorAll('[data-load-challenge]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.loadChallenge?.(this.board.records?.[button.dataset.loadChallenge]));
    });
    this.root.querySelectorAll('[data-load-best-plan]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.loadBestPlan?.(this.board.records?.[button.dataset.loadBestPlan]));
    });
    this.root.querySelectorAll('[data-export-plan]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.exportPlan?.(this.board.records?.[button.dataset.exportPlan]));
    });
    this.root.querySelectorAll('[data-export-level]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.exportLevel?.(this.board.records?.[button.dataset.exportLevel]));
    });
  }

  renderDetails() {
    if (!this.detailsRoot) return;
    const record = this.board.records?.[this.state.selectedInstanceId];
    if (!record) {
      this.detailsRoot.innerHTML = `
        <section class="waypoint-shell leaderboard-detail-panel">
          <div class="console-kicker">Leaderboard Details</div>
          <h2>No record selected</h2>
          <p class="hud-muted">Select a saved challenge to view details.</p>
        </section>
      `;
      return;
    }
    const best = getBestAttempt(this.board, record.instanceId);
    this.detailsRoot.innerHTML = `
      <section class="waypoint-shell leaderboard-detail-panel">
        <div class="console-kicker">Leaderboard Details</div>
        <h2>${escapeHtml(recordTitle(record))}</h2>
        <p class="hud-muted">Instance ${escapeHtml(shortInstanceId(record.instanceId))} | ${escapeHtml(labelMode(record.challengeMode ?? record.mode))}</p>
        <div class="leaderboard-detail-metrics">
          <div><span>Best Score</span><strong>${escapeHtml(formatMetric(best?.score ?? 'N/A'))}</strong></div>
          <div><span>Attempts</span><strong>${escapeHtml(record.attempts?.length ?? 0)}</strong></div>
          <div><span>Map</span><strong>${escapeHtml(formatMapSize(record))}</strong></div>
          <div><span>Agents</span><strong>${escapeHtml(record.agentCount ?? 'N/A')}</strong></div>
        </div>
        <div class="leaderboard-detail-block">
          <strong>Seed</strong>
          <span>${escapeHtml(record.seed ?? record.level?.meta?.seed ?? 'N/A')}</span>
        </div>
        <div class="leaderboard-detail-block">
          <strong>Settings</strong>
          <span>${escapeHtml(settingsSummary(record))}</span>
        </div>
        <div class="leaderboard-detail-actions">
          <button data-load-challenge="${escapeAttr(record.instanceId)}" ${record.level && record.mission ? '' : 'disabled'}>Load Challenge</button>
          <button data-load-best-plan="${escapeAttr(record.instanceId)}" ${best?.plan && record.level && record.mission ? '' : 'disabled'}>Load Best Plan</button>
          <button data-export-plan="${escapeAttr(record.instanceId)}" ${best?.plan ? '' : 'disabled'}>Export Plan</button>
          <button data-export-level="${escapeAttr(record.instanceId)}" ${record.level ? '' : 'disabled'}>Export Challenge</button>
          <button data-export-result="${escapeAttr(record.instanceId)}" ${best?.result ? '' : 'disabled'}>Export Result</button>
          <button data-export-record="${escapeAttr(record.instanceId)}">Export Record</button>
          <button data-clear-record="${escapeAttr(record.instanceId)}">Clear Map Records</button>
        </div>
        <h3 class="waypoint-section-title">Attempts</h3>
        <ol class="leaderboard-attempt-list">
          ${(record.attempts ?? []).map((attempt) => attemptRowHtml(record, attempt, best)).join('') || '<li class="hud-muted">No attempts saved for this record.</li>'}
        </ol>
      </section>
    `;
    this.detailsRoot.querySelectorAll('[data-load-challenge]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.loadChallenge?.(record));
    });
    this.detailsRoot.querySelectorAll('[data-load-best-plan]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.loadBestPlan?.(record));
    });
    this.detailsRoot.querySelectorAll('[data-export-plan]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.exportPlan?.(record));
    });
    this.detailsRoot.querySelectorAll('[data-export-level]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.exportLevel?.(record));
    });
    this.detailsRoot.querySelectorAll('[data-export-result]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.exportResult?.(record));
    });
    this.detailsRoot.querySelectorAll('[data-export-record]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.exportRecord?.(record));
    });
    this.detailsRoot.querySelectorAll('[data-clear-record]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.clearRecord?.(button.dataset.clearRecord));
    });
    this.detailsRoot.querySelectorAll('[data-delete-attempt]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.deleteAttempt?.(record.instanceId, button.dataset.deleteAttempt));
    });
  }
}

function filteredRecords(board, state) {
  const search = String(state.search ?? '').trim().toLowerCase();
  const records = Object.values(board.records ?? {})
    .filter((record) => modeMatches(record, state.filter))
    .filter((record) => {
      if (!search) return true;
      return [
        recordTitle(record),
        record.instanceId,
        record.levelId,
        record.missionId,
        record.challengeMode,
        record.mode,
        record.seed
      ].some((value) => String(value ?? '').toLowerCase().includes(search));
    });
  return records.sort((a, b) => compareRecords(a, b, board, state.sort));
}

function compareRecords(a, b, board, sort) {
  if (sort === 'lastPlayed') return String(b.lastPlayedAt ?? '').localeCompare(String(a.lastPlayedAt ?? ''));
  if (sort === 'attempts') return Number(b.attempts?.length ?? 0) - Number(a.attempts?.length ?? 0);
  if (sort === 'mapSize') return mapArea(b) - mapArea(a);
  const scoreA = Number(getBestAttempt(board, a.instanceId)?.score ?? -Infinity);
  const scoreB = Number(getBestAttempt(board, b.instanceId)?.score ?? -Infinity);
  return scoreB - scoreA;
}

function modeMatches(record, filter) {
  if (!filter || filter === 'all') return true;
  const mode = String(record.challengeMode ?? record.mode ?? '').toLowerCase();
  if (filter === 'deterministic') return mode.includes('perfect') || mode.includes('deterministic');
  if (filter === 'stochastic') return mode.includes('forecast') || mode.includes('stochastic');
  if (filter === 'tutorial') return mode.includes('tutorial') || record.level?.tutorial;
  if (filter === 'custom') return mode.includes('custom') || record.level?.source === 'custom' || !record.levelId;
  return true;
}

function recordCardHtml(record, best, selectedId) {
  const selected = record.instanceId === selectedId;
  return `
    <article class="leaderboard-record-card ${selected ? 'selected' : ''}">
      <div class="leaderboard-record-main">
        <div>
          <div class="leaderboard-record-title">
            <strong>${escapeHtml(recordTitle(record))}</strong>
            <span>${escapeHtml(shortInstanceId(record.instanceId))}</span>
          </div>
          <div class="leaderboard-score-line">Best Score: ${escapeHtml(formatMetric(best?.score ?? 'N/A'))} | Attempts: ${escapeHtml(record.attempts?.length ?? 0)}</div>
          <div class="leaderboard-meta-line">Map: ${escapeHtml(formatMapSize(record))} | Duration: ${escapeHtml(formatDuration(record))} | Agents: ${escapeHtml(record.agentCount ?? 'N/A')}</div>
          <div class="leaderboard-meta-line">Best Route: ${escapeHtml(best?.label ?? 'N/A')} | Last Played: ${escapeHtml(formatDate(record.lastPlayedAt))}</div>
          <div class="leaderboard-badge-row">
            ${badges(record, best).map((badge) => `<span>${escapeHtml(badge)}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="leaderboard-card-actions">
        <button data-select-record="${escapeAttr(record.instanceId)}">${selected ? 'Selected' : 'Select'}</button>
        <button data-load-challenge="${escapeAttr(record.instanceId)}" ${record.level && record.mission ? '' : 'disabled'}>Load Challenge</button>
        <button data-load-best-plan="${escapeAttr(record.instanceId)}" ${best?.plan && record.level && record.mission ? '' : 'disabled'}>Load Best Plan</button>
        <button data-export-plan="${escapeAttr(record.instanceId)}" ${best?.plan ? '' : 'disabled'}>Export Plan</button>
        <button data-export-level="${escapeAttr(record.instanceId)}" ${record.level ? '' : 'disabled'}>Export Level</button>
      </div>
    </article>
  `;
}

function attemptRowHtml(record, attempt, best) {
  return `
    <li class="leaderboard-attempt-row ${attempt.attemptId === best?.attemptId ? 'best' : ''}">
      <div>
        <strong>${escapeHtml(attempt.label ?? 'Attempt')}</strong>
        <span>${escapeHtml(formatMetric(attempt.score ?? 0))} | ${escapeHtml(formatDate(attempt.createdAt))}</span>
      </div>
      <button data-delete-attempt="${escapeAttr(attempt.attemptId)}" data-instance="${escapeAttr(record.instanceId)}">Delete</button>
    </li>
  `;
}

function emptyBrowserHtml() {
  return `
    <article class="leaderboard-empty-card">
      <h2>No saved challenge records</h2>
      <p>Complete a deterministic or stochastic challenge to save attempts locally in this browser.</p>
    </article>
  `;
}

function badges(record, best) {
  return [
    labelMode(record.challengeMode ?? record.mode),
    best?.plan ? 'has best route' : null,
    best?.plan ? 'has exported plan' : null,
    String(record.challengeMode ?? record.mode ?? '').toLowerCase().includes('forecast') ? 'stochastic' : null,
    record.levelId ? null : 'custom map',
    record.generationConfig ? 'generated map' : null
  ].filter(Boolean);
}

function recordTitle(record) {
  return record.level?.meta?.name
    ?? record.level?.name
    ?? record.result?.levelName
    ?? record.levelId
    ?? 'Saved Challenge';
}

function settingsSummary(record) {
  const config = record.generationConfig ?? record.level?.meta?.generationConfig ?? {};
  return [
    config.difficulty ? `difficulty ${config.difficulty}` : null,
    config.currentPattern ? `currents ${config.currentPattern}` : null,
    config.roiPattern ? `ROI ${config.roiPattern}` : null,
    record.missionId ? `mission ${record.missionId}` : null
  ].filter(Boolean).join(' | ') || 'No generation settings saved.';
}

function formatMapSize(record) {
  const width = record.mapSize?.width;
  const height = record.mapSize?.height;
  return width && height ? `${width}x${height}` : 'N/A';
}

function formatDuration(record) {
  return record.durationHours ? `${record.durationHours} hr` : 'N/A';
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function mapArea(record) {
  return Number(record.mapSize?.width ?? 0) * Number(record.mapSize?.height ?? 0);
}

function labelMode(mode) {
  const value = String(mode ?? 'custom');
  if (value === 'perfectKnowledge') return 'deterministic';
  if (value === 'forecast') return 'stochastic';
  return value;
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
