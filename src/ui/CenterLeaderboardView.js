import { formatMetric } from '../core/evaluation/PlanComparison.js';
import { shortInstanceId } from '../core/identity/GameInstanceId.js';
import { fairnessLabel, getBestAttempt, loadLeaderboard, routeSourceLabel } from '../core/storage/LeaderboardStore.js';
import { evaluateExactReplayAvailability } from '../core/random/ReplaySeedContract.js';
import { replayDiagnosticsCardHtml } from './ReplayDiagnosticsCard.js';
import { EXPERIENCE_MODES } from '../core/experience/ExperienceMode.js';

export class CenterLeaderboardView {
  constructor(app, { handlers = {} } = {}) {
    this.app = app;
    this.handlers = handlers;
    this.root = app?.elements?.overlay?.topHud ?? null;
    this.detailsRoot = app?.elements?.waypointTimelineRoot ?? null;
    this.state = {
      filter: 'challenge',
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
            <h1>${escapeHtml(this.state.filter === 'simulationLab' ? 'Experiment Leaderboard' : 'Challenge Leaderboard')}</h1>
            <p>${escapeHtml(this.state.filter === 'simulationLab' ? 'Benchmark reproducible lab runs, solver attempts, and saved route comparisons.' : 'Browse high-score challenge attempts, route sources, saved paths, and replayable records.')}</p>
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
    this.root.querySelectorAll('[data-replay-challenge]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.replayChallenge?.(this.board.records?.[button.dataset.replayChallenge]));
    });
    this.root.querySelectorAll('[data-load-path-as-plan]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.loadPathAsPlan?.(this.board.records?.[button.dataset.loadPathAsPlan]));
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
    const capabilities = recordCapabilities(record, best, this.app?.state);
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
        ${replayDiagnosticsCardHtml(record, { best })}
        <div class="leaderboard-detail-block">
          <strong>Settings</strong>
          <span>${escapeHtml(settingsSummary(record))}</span>
        </div>
        <div class="leaderboard-detail-block">
          <strong>Leaderboard Scope</strong>
          <span>${escapeHtml(scopeLabel(record.leaderboardScope))} | Fingerprint ${escapeHtml(record.scenarioFingerprint ?? 'N/A')}</span>
        </div>
        <div class="leaderboard-detail-block">
          <strong>Saved Data</strong>
          <span>${escapeHtml(capabilitySummary(capabilities))}</span>
        </div>
        <div class="leaderboard-detail-actions">
          ${leaderboardActionButton('replay-challenge', record.instanceId, 'Replay Challenge', capabilities.replayable, capabilities.replayReason)}
          ${leaderboardActionButton(capabilities.pathShowing ? 'hide-path' : 'show-path', record.instanceId, capabilities.pathShowing ? 'Hide Saved Path' : 'Show Saved Path', capabilities.hasChallengeAndPlan, 'Saved path unavailable: this record does not include both a saved challenge and a saved plan.')}
          ${leaderboardActionButton('rerun-path', record.instanceId, 'Rerun Saved Path', capabilities.hasChallengeAndPlan, 'Rerun unavailable: this record does not include both a saved challenge and a saved plan.')}
          ${leaderboardActionButton('load-path-as-plan', record.instanceId, 'Load Path as Plan', capabilities.hasChallengeAndPlan, 'Load unavailable: this record does not include both a saved challenge and a saved plan.')}
          ${leaderboardActionButton('export-plan', record.instanceId, 'Export Path', capabilities.hasPlan, 'Export path unavailable: this record does not include a saved plan.')}
          ${leaderboardActionButton('export-level', record.instanceId, 'Export Challenge', Boolean(record.level), 'Export challenge unavailable: this record does not include a saved level.')}
          ${leaderboardActionButton('export-result', record.instanceId, 'Export Result', capabilities.hasResult, 'Export result unavailable: this record does not include a saved result.')}
          <button data-export-record="${escapeAttr(record.instanceId)}" title="Export the full leaderboard record, including saved challenge and attempts.">Export Record</button>
          <button data-clear-record="${escapeAttr(record.instanceId)}" title="Remove all local attempts for this saved challenge.">Clear Map Records</button>
        </div>
        <h3 class="waypoint-section-title">Attempts</h3>
        <ol class="leaderboard-attempt-list">
          ${(record.attempts ?? []).map((attempt) => attemptRowHtml(record, attempt, best)).join('') || '<li class="hud-muted">No attempts saved for this record.</li>'}
        </ol>
      </section>
    `;
    this.detailsRoot.querySelectorAll('[data-replay-challenge]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.replayChallenge?.(record));
    });
    this.detailsRoot.querySelectorAll('[data-show-path]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.showPath?.(record));
    });
    this.detailsRoot.querySelectorAll('[data-hide-path]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.hidePath?.(record));
    });
    this.detailsRoot.querySelectorAll('[data-rerun-path]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.rerunPath?.(record));
    });
    this.detailsRoot.querySelectorAll('[data-load-path-as-plan]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.loadPathAsPlan?.(record));
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
  if (filter === 'challenge') return (record.leaderboardScope ?? record.experienceMode ?? EXPERIENCE_MODES.challenge) === EXPERIENCE_MODES.challenge;
  if (filter === 'simulationLab') return (record.leaderboardScope ?? record.experienceMode) === EXPERIENCE_MODES.simulationLab;
  const attempts = record.attempts ?? [];
  if (filter === 'manual') return attempts.some((attempt) => attempt.routeSource === 'manual');
  if (filter === 'greedyPlanner') return attempts.some((attempt) => attempt.routeSource === 'greedyPlanner');
  if (filter === 'externalSolver') return attempts.some((attempt) => attempt.routeSource === 'externalSolver');
  const mode = String(record.challengeMode ?? record.mode ?? '').toLowerCase();
  if (filter === 'deterministic') return mode.includes('perfect') || mode.includes('deterministic');
  if (filter === 'stochastic') return mode.includes('forecast') || mode.includes('stochastic');
  if (filter === 'tutorial') return mode.includes('tutorial') || record.level?.tutorial;
  if (filter === 'custom') return mode.includes('custom') || record.level?.source === 'custom' || !record.levelId;
  return true;
}

function recordCardHtml(record, best, selectedId) {
  const selected = record.instanceId === selectedId;
  const capabilities = recordCapabilities(record, best);
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
          <div class="leaderboard-meta-line">Best Route: ${escapeHtml(routeSourceLabel(best?.routeSource, best))} | ${escapeHtml(fairnessLabel(best?.fairness))} | Last Played: ${escapeHtml(formatDate(record.lastPlayedAt))}</div>
          <div class="leaderboard-badge-row">
            ${badges(record, best).map((badge) => `<span>${escapeHtml(badge)}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="leaderboard-card-actions">
        <button data-select-record="${escapeAttr(record.instanceId)}">${selected ? 'Selected' : 'Select'}</button>
        ${leaderboardActionButton('replay-challenge', record.instanceId, 'Replay Challenge', capabilities.replayable, capabilities.replayReason)}
        ${leaderboardActionButton('load-path-as-plan', record.instanceId, 'Load Path as Plan', capabilities.hasChallengeAndPlan, 'Load unavailable: this record does not include both a saved challenge and a saved plan.')}
        ${leaderboardActionButton('export-plan', record.instanceId, 'Export Path', capabilities.hasPlan, 'Export path unavailable: this record does not include a saved plan.')}
        ${leaderboardActionButton('export-level', record.instanceId, 'Export Challenge', Boolean(record.level), 'Export challenge unavailable: this record does not include a saved level.')}
      </div>
    </article>
  `;
}

function leaderboardActionButton(action, instanceId, label, enabled, disabledTitle) {
  const title = enabled ? actionTitle(action) : disabledTitle;
  return `<button data-${escapeAttr(action)}="${escapeAttr(instanceId)}" title="${escapeAttr(title)}" ${enabled ? '' : 'disabled'}>${escapeHtml(label)}</button>`;
}

function actionTitle(action) {
  return {
    'replay-challenge': 'Open this saved challenge in the planning workspace without loading a saved path.',
    'show-path': 'Open this saved challenge and show the saved path as a non-editing overlay.',
    'hide-path': 'Hide the saved path overlay for this challenge.',
    'rerun-path': 'Execute the saved path again against the saved challenge snapshot.',
    'load-path-as-plan': 'Load the saved path as the editable plan for this saved challenge.',
    'export-plan': 'Export the saved path JSON.',
    'export-level': 'Export the saved challenge JSON.',
    'export-result': 'Export the saved result JSON.'
  }[action] ?? labelAction(action);
}

function labelAction(action) {
  return String(action ?? '').replace(/-/g, ' ');
}

function attemptRowHtml(record, attempt, best) {
  return `
    <li class="leaderboard-attempt-row ${attempt.attemptId === best?.attemptId ? 'best' : ''}">
      <div>
        <strong>${escapeHtml(attempt.label ?? 'Attempt')}</strong>
        <span>${escapeHtml(formatMetric(attempt.score ?? 0))} | ${escapeHtml(routeSourceLabel(attempt.routeSource, attempt))} | ${escapeHtml(fairnessLabel(attempt.fairness))} | ${escapeHtml(formatDate(attempt.createdAt))}</span>
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
    scopeLabel(record.leaderboardScope ?? record.experienceMode),
    best?.routeSource ? routeSourceLabel(best.routeSource, best) : null,
    best?.fairness ? fairnessLabel(best.fairness) : null,
    best?.plan ? 'saved path' : null,
    best?.pathSummary?.actualPathAvailable ? 'saved execution' : null,
    String(record.challengeMode ?? record.mode ?? '').toLowerCase().includes('forecast') ? 'stochastic' : null,
    record.levelId ? null : 'custom map',
    record.generationConfig ? 'generated map' : null
  ].filter(Boolean);
}

function scopeLabel(scope) {
  return scope === EXPERIENCE_MODES.simulationLab ? 'simulation lab' : 'challenge';
}

function recordCapabilities(record, best, state = null) {
  const currentInstanceId = state?.level?.instanceId ?? state?.currentScenario?.instanceId ?? null;
  const pathShowing = Boolean(currentInstanceId && currentInstanceId === record?.instanceId && state?.ui?.showBestPathOverlay);
  const hasPlan = Boolean(best?.plan);
  const replay = evaluateExactReplayAvailability(record);
  const replayable = Boolean(record?.level && record?.mission) || replay.available;
  return {
    replayable,
    replayReason: replay.reason,
    replayMethod: replay.method,
    hasPlan,
    hasChallengeAndPlan: replayable && hasPlan,
    hasResult: Boolean(best?.result),
    hasExecutionPath: Boolean(best?.pathSummary?.actualPathAvailable),
    hasSeed: Boolean(record?.replaySeedAnchor ?? record?.seed ?? record?.level?.meta?.seed),
    pathShowing
  };
}

function capabilitySummary(capabilities) {
  const items = [
    capabilities.replayable ? 'saved challenge snapshot' : 'missing challenge snapshot',
    capabilities.hasPlan ? 'saved planned path' : 'missing saved path',
    capabilities.hasExecutionPath ? 'saved executed trajectory' : 'no executed trajectory frames',
    capabilities.hasResult ? 'saved result' : 'missing saved result',
    capabilities.hasSeed ? 'replay seed preserved' : 'seed unavailable',
    capabilities.replayable ? `exact replay ${capabilities.replayMethod}` : capabilities.replayReason
  ];
  return items.join(' | ');
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
