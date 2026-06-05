import { CAMPAIGN_LEVELS } from '../core/campaign/CampaignLevels.js';
import { shortInstanceId } from '../core/identity/GameInstanceId.js';
import { formatMetric } from '../core/evaluation/PlanComparison.js';

export class MissionConsole {
  constructor(app, root) {
    this.app = app;
    this.root = root;
  }

  renderIdle({ status = 'No mission loaded', mode = 'Idle' } = {}) {
    if (!this.root) return;
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Mission Console</div>
        <h1>ANCHOR: Glider Command</h1>
        <p>AUV Glider Planner Game</p>
      </section>
      <section class="console-section">
        <h2>Demos</h2>
        <button data-action="flow-static" class="console-button">Static Flow Field Demo</button>
        <button data-action="flow-temporal" class="console-button">Temporal Flow Field Demo</button>
      </section>
      <section class="console-section">
        <h2>Launch</h2>
        <button data-action="tutorial" class="console-button primary">Tutorial Mode</button>
        <button data-action="deterministic" class="console-button">Deterministic Challenge</button>
        <button data-action="stochastic" class="console-button">Stochastic Challenge</button>
        <button data-action="editor" class="console-button">Environment Editor</button>
        <button data-action="load-json" class="console-button">Load Level JSON</button>
        <button data-action="leaderboard" class="console-button">Leaderboard</button>
      </section>
      <section class="console-section">
        <h2>Tools</h2>
        <button data-action="dataset" class="console-button secondary">Dataset Export</button>
      </section>
      <section class="console-status">
        <span>${escapeHtml(mode)}</span>
        <strong>${escapeHtml(status)}</strong>
        <small>Choose a mode to load the simulator viewport.</small>
      </section>
    `;
    this.app.applyConsoleAccordions?.('idle');
    this.bind({
      'flow-static': () => this.app.phaser.scene.start('FlowFieldDemoScene', { mode: 'static' }),
      'flow-temporal': () => this.app.phaser.scene.start('FlowFieldDemoScene', { mode: 'temporal' }),
      tutorial: () => this.mainMenuScene()?.openTutorialBrowser?.(),
      deterministic: () => this.mainMenuScene()?.openChallengeSetup?.('perfectKnowledge'),
      stochastic: () => this.mainMenuScene()?.openChallengeSetup?.('forecast'),
      editor: () => this.app.phaser.scene.start('EnvironmentEditorScene'),
      'load-json': () => this.app.phaser.scene.start('LoadLevelJsonScene'),
      dataset: () => this.app.phaser.scene.start('DatasetExportScene'),
      leaderboard: () => this.mainMenuScene()?.openLeaderboard?.()
    });
  }

  renderFlowDemoControls(state = {}, handlers = {}) {
    if (!this.root) return;
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Flow Field Demo</div>
        <h1>${escapeHtml(state.title ?? 'Flow Field Demo')}</h1>
        <p>Isolated current-field visualization.</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(state.status ?? 'Demo running')}</span>
        <strong>${escapeHtml(state.paused ? 'Paused' : 'Animating')}</strong>
        <small>Arrows show local flow; glider particles align with movement.</small>
      </section>
      <section class="console-section">
        <h2>Demos</h2>
        <button data-action="static" class="console-button ${state.mode === 'static' ? 'primary' : ''}">Static Flow Field Demo</button>
        <button data-action="temporal" class="console-button ${state.mode === 'temporal' ? 'primary' : ''}">Temporal Flow Field Demo</button>
      </section>
      <section class="console-section">
        <h2>Controls</h2>
        <button data-action="pause" class="console-button">${state.paused ? 'Play' : 'Pause'}</button>
        <button data-action="reset" class="console-button">Reset Particles</button>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('flowDemo');
    this.bind({
      static: handlers.static,
      temporal: handlers.temporal,
      pause: handlers.pause,
      reset: handlers.reset,
      menu: handlers.menu
    });
  }

  renderLeaderboardControls(state = {}, handlers = {}) {
    if (!this.root) return;
    const filters = [
      ['all', 'All'],
      ['deterministic', 'Deterministic'],
      ['stochastic', 'Stochastic'],
      ['tutorial', 'Tutorial'],
      ['custom', 'Custom']
    ];
    const sorts = [
      ['bestScore', 'Best Score'],
      ['lastPlayed', 'Last Played'],
      ['attempts', 'Attempts'],
      ['mapSize', 'Map Size']
    ];
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Local Leaderboard</div>
        <h1>Challenge Records</h1>
        <p>Browse saved maps and attempts in the center viewport.</p>
      </section>
      <section class="console-section">
        <h2>Filters</h2>
        <div class="leaderboard-filter-tabs">
          ${filters.map(([value, label]) => `<button data-filter="${escapeAttr(value)}" class="${state.filter === value ? 'active' : ''}">${escapeHtml(label)}</button>`).join('')}
        </div>
        <label class="compact-field">
          Search
          <input id="leaderboard-search" type="search" value="${escapeAttr(state.search ?? '')}" placeholder="Map, seed, instance..." />
        </label>
        <label class="compact-field">
          Sort
          <select id="leaderboard-sort">
            ${sorts.map(([value, label]) => `<option value="${escapeAttr(value)}" ${state.sort === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-section">
        <h2>Actions</h2>
        <button data-action="import" class="console-button">Import Leaderboard JSON</button>
        <button data-action="export" class="console-button">Export Leaderboard JSON</button>
        <button data-action="clear-all" class="console-button secondary">Clear All Leaderboard Data</button>
      </section>
      <section class="console-status">
        <span>Visible Records</span>
        <strong>${escapeHtml(state.count ?? 0)} / ${escapeHtml(state.total ?? 0)}</strong>
        <small>Records are stored locally in this browser.</small>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('leaderboard');
    this.root.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => handlers.filter?.(button.dataset.filter));
    });
    this.root.querySelector('#leaderboard-search')?.addEventListener('input', (event) => handlers.search?.(event.target.value));
    this.root.querySelector('#leaderboard-sort')?.addEventListener('change', (event) => handlers.sort?.(event.target.value));
    this.bind({
      import: handlers.import,
      export: handlers.export,
      'clear-all': handlers.clearAll,
      menu: handlers.menu
    });
  }

  renderTutorialControls(state = {}, handlers = {}) {
    if (!this.root) return;
    const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Challenge'];
    const statuses = [
      ['all', 'All'],
      ['notStarted', 'Not Started'],
      ['incomplete', 'Incomplete'],
      ['completed', 'Completed']
    ];
    const recommended = state.recommendedId
      ? CAMPAIGN_LEVELS.find((entry) => entry.id === state.recommendedId)
      : null;
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Tutorial Browser</div>
        <h1>Training Campaign</h1>
        <p>Filter staged lessons while cards stay readable in the center viewport.</p>
      </section>
      <section class="console-status">
        <span>Progress</span>
        <strong>${escapeHtml(state.completed ?? 0)} / ${escapeHtml(state.total ?? CAMPAIGN_LEVELS.length)} completed</strong>
        <small>Recommended: ${escapeHtml(recommended?.title ?? 'Start any tutorial')}</small>
      </section>
      <section class="console-section">
        <h2>Search / Filter</h2>
        <label class="compact-field">
          Search
          <input id="tutorial-search" type="search" value="${escapeAttr(state.search ?? '')}" placeholder="Title, focus, objective..." />
        </label>
        <label class="compact-field">
          Difficulty
          <select id="tutorial-difficulty">
            ${difficulties.map((label) => {
              const value = label === 'All' ? 'all' : label;
              return `<option value="${escapeAttr(value)}" ${state.difficulty === value || (!state.difficulty && value === 'all') ? 'selected' : ''}>${escapeHtml(label)}</option>`;
            }).join('')}
          </select>
        </label>
        <label class="compact-field">
          Status
          <select id="tutorial-status">
            ${statuses.map(([value, label]) => `<option value="${escapeAttr(value)}" ${state.status === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Focus
          <select id="tutorial-focus">
            <option value="all" ${state.focus === 'all' || !state.focus ? 'selected' : ''}>All</option>
            ${(state.focusOptions ?? []).map((option) => `<option value="${escapeAttr(option.value)}" ${state.focus === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-section">
        <h2>Tutorial Campaign</h2>
        <div class="hud-muted">${escapeHtml(state.count ?? 0)} visible lesson(s).</div>
        <button data-action="continue" class="console-button primary" ${recommended ? '' : 'disabled'}>Continue Recommended Tutorial</button>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('tutorial');
    this.root.querySelector('#tutorial-search')?.addEventListener('input', (event) => handlers.search?.(event.target.value));
    this.root.querySelector('#tutorial-difficulty')?.addEventListener('change', (event) => handlers.difficulty?.(event.target.value));
    this.root.querySelector('#tutorial-status')?.addEventListener('change', (event) => handlers.status?.(event.target.value));
    this.root.querySelector('#tutorial-focus')?.addEventListener('change', (event) => handlers.focus?.(event.target.value));
    this.bind({
      continue: () => recommended && handlers.start?.(recommended.id),
      menu: handlers.menu
    });
  }

  renderDebriefActions(result, state, handlers = {}) {
    if (!this.root) return;
    const summary = result?.summary ?? {};
    const endCondition = result?.endCondition ?? summary.endCondition ?? {};
    const sampling = result?.sampling ?? {};
    const priorityTargets = result?.priorityTargets ?? summary.priorityTargets ?? {};
    const stopReason = result?.stopReason ?? summary.stopReason;
    const stochasticEnabled = Boolean(state?.stochastic?.enabled);
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Debrief Console</div>
        <h1>Mission Debrief</h1>
        <p>${escapeHtml(result?.source ?? 'No result')} | ${escapeHtml(result?.challengeMode ?? state?.challengeMode ?? '')}</p>
      </section>
      <section class="console-status">
        <span>Actual Simulation Score</span>
        <strong>${escapeHtml(formatMetric(summary.finalScore ?? 'N/A'))}</strong>
        <small>Instance ${escapeHtml(shortInstanceId(result?.instanceId ?? state?.level?.instanceId))}</small>
      </section>
      <section class="console-section">
        <h2>Actions</h2>
        <button class="console-button primary" data-action="revise">Revise Plan</button>
      </section>
      <section class="console-section">
        <h2>Mission Actions</h2>
        <button class="console-button" data-action="rerun-same" ${stochasticEnabled ? '' : 'disabled'}>Rerun Same</button>
        <button class="console-button" data-action="rerun-new-seed" ${stochasticEnabled ? '' : 'disabled'}>Rerun New Seed</button>
        <button class="console-button" data-action="retry">Retry From Briefing</button>
        ${nextActionButtonHtml(state)}
        ${state?.currentScenario?.source === 'tutorial' ? '<button class="console-button" data-action="tutorial-browser">Tutorial Browser</button>' : ''}
      </section>
      <section class="console-section">
        <h2>Exports</h2>
        <button class="console-button" data-action="export-result">Export Result JSON</button>
        <button class="console-button" data-action="export-aar">Export AAR</button>
        <button class="console-button" data-action="export-compare">Export Compare</button>
      </section>
      <section class="console-section">
        <h2>Solver / Comparison</h2>
        <button class="console-button" data-action="temporal-greedy">Simulate Temporal Greedy</button>
      </section>
      <section class="console-section">
        <h2>Mission Results</h2>
        <div class="hud-muted">Planned expected value: ${escapeHtml(summary.expectedSampleScore ?? 'N/A')}</div>
        <div class="hud-muted">Actual / stochastic realized outcome: ${escapeHtml(summary.realizedSampleScore ?? summary.sampleScore ?? 'N/A')}</div>
        <div class="hud-muted">Regret: ${escapeHtml(result?.regret?.forecastRegret ?? summary.expectedValueRegret ?? 'N/A')}</div>
        ${stopReason && stopReason.code !== 'complete' ? `<div class="hud-muted warning">Stop reason: ${escapeHtml(stopReason.title ?? stopReason.code)}</div>` : ''}
        <div class="hud-muted">End condition: ${escapeHtml(endCondition.mode ?? 'none')} | Achieved ${escapeHtml(endCondition.achieved ?? true ? 'yes' : 'no')}</div>
        <div class="hud-muted">Sampling mode: ${escapeHtml(sampling.mode ?? summary.samplingMode ?? 'unique')} | Duplicates ${escapeHtml(summary.duplicateSamples ?? 0)}</div>
        <div class="hud-muted">Gold stars: ${escapeHtml(priorityTargets.captured ?? 0)} / ${escapeHtml(priorityTargets.available ?? 0)} | Star score ${escapeHtml(summary.priorityTargetScore ?? priorityTargets.score ?? 0)}</div>
      </section>
      <section class="console-footer">
        <button class="console-button secondary" data-action="menu">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('debrief');
    this.bind(handlers);
  }

  mainMenuScene() {
    return this.app.phaser?.scene?.getScene('MainMenuScene');
  }

  bind(actions) {
    this.root.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => actions[button.dataset.action]?.());
    });
  }
}

function nextActionButtonHtml(state) {
  const source = state?.currentScenario?.source;
  if (source === 'tutorial') return '<button class="console-button" data-action="next-tutorial">Next Tutorial</button>';
  if (source === 'deterministicChallenge' || source === 'stochasticChallenge') return '<button class="console-button" data-action="new-challenge">New Challenge</button>';
  if (source === 'editor') return '<button class="console-button" data-action="editor">Return To Editor</button>';
  return '';
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
