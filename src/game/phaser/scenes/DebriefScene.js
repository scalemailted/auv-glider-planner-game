import { buildMarkdownAAR } from '../../../core/io/ReportExporter.js';
import { buildResultExport } from '../../../core/io/ResultExporter.js';
import { attachIdentityToPlan, shortInstanceId } from '../../../core/identity/GameInstanceId.js';
import { comparePlanResults, formatMetric } from '../../../core/evaluation/PlanComparison.js';
import { temporalGreedySolver } from '../../../core/planning/BaselineSolvers.js';
import { prepareStochasticRerun } from '../../../core/evaluation/StochasticRunStore.js';
import { resetPlanResultStore } from '../../../core/evaluation/PlanResultStore.js';
import { loadJSON } from '../../../core/io/ImportExport.js';
import { applyTutorialMissionConfig, CAMPAIGN_LEVELS, loadCampaignLevel } from '../../../core/campaign/CampaignLevels.js';
import { ensureLevelIdentity } from '../../../core/identity/GameInstanceId.js';
import { generateLevel } from '../../../core/generation/LevelGenerator.js';
import { buildDefaultMissionForLevel } from '../../../core/editor/LevelEditOperations.js';
import { beginScenario, resetScenarioForRetry } from '../../../core/scenario/ScenarioState.js';
import { clearPlanningOverlayState } from '../../../core/planning/PlanningOverlayState.js';
import { loadLeaderboard, recordLeaderboardAttempt } from '../../../core/storage/LeaderboardStore.js';
import { saveAttemptToLocalStore } from '../../../core/storage/SavedAttemptStore.js';
import { evaluateObjectives, summarizePerformance } from '../../../core/campaign/LevelObjectives.js';
import { recordLevelResult, saveCampaignProgress } from '../../../core/campaign/CampaignProgress.js';
import { PhaserButton } from '../ui/Button.js';
import { downloadJson, downloadText } from '../ui/FileBridge.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class DebriefScene extends PhaserScene {
  constructor() {
    super('DebriefScene');
    this.objects = [];
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'debrief';
    clearPlanningOverlayState(this.app.state);
    this.app.clearPanels();
    this.app.setDebriefFullscreen(false);
    this.app.setSceneLabel('Debrief');
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.graphics = this.add.graphics();
    this.renderDebrief();
    this.renderConsole();
    this.app.agentPerformanceHud?.setHandlers({});
    this.app.waypointPanel?.setHandlers({
      selectAgent: (agentId) => {
        this.app.state.selectedAgentId = agentId;
        this.app.waypointPanel?.refresh(this.app.state, { result: this.app.state.result });
      }
    });
    this.app.waypointPanel?.refresh?.(this.app.state, { result: this.app.state.result });
    this.app.summaryHud?.renderIdle?.();
    this.app.agentPerformanceHud?.renderIdle?.();
    this.recordTutorialProgress();
  }

  shutdown() {
    this.clearObjects();
    this.destroyDebriefRoot();
  }

  renderDebrief() {
    this.clearObjects();
    const result = this.app.state.result;
    if (!result) {
      this.graphics?.clear();
      this.renderDebriefOverlay({ empty: true });
      return;
    }
    this.saveLeaderboardAttempt(result);
    result.comparison = comparePlanResults(this.app.state.planResults ?? {});
    this.graphics?.clear();
    this.renderDebriefOverlay({ result });
  }

  renderDebriefOverlay({ result = null, empty = false } = {}) {
    this.destroyDebriefRoot();
    const root = document.createElement('div');
    root.id = 'debrief-root';
    root.className = 'debrief-overlay';
    root.innerHTML = empty ? this.emptyDebriefHtml() : this.debriefHtml(result);
    (this.app.elements.gameContainer ?? document.body).appendChild(root);
    this.debriefRoot = root;
  }

  emptyDebriefHtml() {
    return `
      <main class="debrief-shell">
        <header class="debrief-header">
          <div>
            <p class="debrief-kicker">Mission Results</p>
            <h1>Mission Debrief</h1>
            <p>No result is available yet.</p>
          </div>
        </header>
        <section class="debrief-panel">
          <button class="debrief-button primary" data-action="menu">Main Menu</button>
        </section>
      </main>
    `;
  }

  debriefHtml(result) {
    const s = result.summary ?? {};
    const metrics = [
      ['Actual Final', s.finalScore ?? 0],
      ['Actual ROI', s.sampleScore ?? 0],
      ['Planned EV', s.expectedSampleScore ?? 0],
      ['Stochastic Realized', s.realizedSampleScore ?? s.sampleScore ?? 0],
      ['Actual Energy', s.energyUsed ?? 0],
      ['Hazards', s.hazardsHit ?? 0],
      ['Mobile Hazards', s.mobileHazardsHit ?? 0],
      ['Regret', result.regret?.forecastRegret ?? s.expectedValueRegret ?? 'N/A']
    ];
    return `
      <main class="debrief-shell">
        <header class="debrief-header">
          <div>
            <p class="debrief-kicker">Mission Results</p>
            <h1>Mission Debrief</h1>
            <p>${escapeHtml(result.planName ?? result.source ?? 'unknown')} | Instance ${escapeHtml(shortInstanceId(result.instanceId ?? this.app.state.level?.instanceId))} | ${escapeHtml(result.challengeMode ?? 'unknown')}</p>
          </div>
          <div class="debrief-score">
            <span>Actual Final</span>
            <strong>${escapeHtml(formatMetric(s.finalScore ?? 0))}</strong>
          </div>
        </header>

        <section class="debrief-metric-grid">
          ${metrics.map(([label, value]) => `
            <article class="debrief-metric-card">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(formatMetric(value))}</strong>
            </article>
          `).join('')}
        </section>

        <section class="debrief-content-grid">
          ${this.riskPanelHtml(result)}
          ${this.tutorialPanelHtml(result)}
          ${this.importedPlanPanelHtml(result)}
          ${this.stopReasonPanelHtml(result)}
          ${this.priorityTargetPanelHtml(result)}
          ${this.comparisonPanelHtml(result.comparison)}
          ${this.seedPanelHtml(result)}
        </section>
      </main>
    `;
  }

  priorityTargetPanelHtml(result) {
    const targets = result.priorityTargets ?? result.summary?.priorityTargets ?? {};
    const captures = targets.captures ?? [];
    return `
      <article class="debrief-panel">
        <h2>Gold Star Targets</h2>
        <p>Captured ${escapeHtml(targets.captured ?? 0)} / ${escapeHtml(targets.available ?? 0)} | Star score ${escapeHtml(formatMetric(targets.score ?? result.summary?.priorityTargetScore ?? 0))}</p>
        <p>Missed high-value opportunities: ${escapeHtml(targets.missed ?? 0)} | Duplicate attempts ${escapeHtml(targets.duplicates ?? 0)}</p>
        ${captures.length ? `
          <div class="debrief-table-wrap">
            <table class="debrief-table">
              <thead><tr><th>Target</th><th>Agent</th><th>Time</th><th>Value</th></tr></thead>
              <tbody>
                ${captures.slice(0, 5).map((capture) => `
                  <tr>
                    <td>${escapeHtml(capture.targetId)}</td>
                    <td>${escapeHtml(capture.agentId)}</td>
                    <td>${escapeHtml(formatMetric(capture.t))}</td>
                    <td>${escapeHtml(formatMetric(capture.value))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p>No priority targets were captured.</p>'}
      </article>
    `;
  }

  tutorialPanelHtml(result) {
    if (this.app.state.currentScenario?.source !== 'tutorial') return '';
    const objectives = evaluateObjectives(result.summary ?? {}, this.app.state.level, this.app.state.mission);
    const performance = summarizePerformance(result.summary ?? {}, objectives, this.app.state.level);
    const learning = this.app.state.level?.campaign?.learningObjectives ?? [];
    return `
      <article class="debrief-panel">
        <h2>Tutorial Result</h2>
        <p>${escapeHtml(performance.whatWentWell)}</p>
        ${learning.length ? `<p>Learning focus: ${escapeHtml(learning.slice(0, 2).join(' '))}</p>` : ''}
        ${performance.whatFailed.length ? `<p>Try again: ${escapeHtml(performance.whatFailed.join(', '))}</p>` : '<p>Good job: the tutorial objectives were met.</p>'}
        <p>${escapeHtml(performance.suggestions[0] ?? 'Revise and try for a cleaner route.')}</p>
      </article>
    `;
  }

  recordTutorialProgress() {
    if (this.app.state.currentScenario?.source !== 'tutorial' || !this.app.state.result) return;
    this.app.state.progress = recordLevelResult(this.app.state.progress, this.app.state.level, this.app.state.mission, this.app.state.result);
    saveCampaignProgress(this.app.state.progress);
  }

  importedPlanPanelHtml(result) {
    const metadata = this.app.state.plan?.importMetadata ?? this.app.state.importedPlanMetadata ?? null;
    const planner = this.app.state.plan?.planner ?? result.planMetadata?.planner ?? null;
    const isImported = Boolean(metadata || result.planMetadata?.importedPlan || planner);
    if (!isImported) return '';
    const demo = Boolean(metadata?.demoPlan || planner?.type === 'demo' || result.planMetadata?.source === 'tutorialDemo');
    return `
      <article class="debrief-panel">
        <h2>Imported Plan</h2>
        <p>${escapeHtml(result.planName ?? planner?.name ?? 'Imported Plan')} came from ${escapeHtml(demo ? 'the tutorial demo JSON file' : 'an imported JSON plan')}.</p>
        <p>Planner type: ${escapeHtml(planner?.type ?? 'imported')} | Forecast: ${escapeHtml(planner?.usesForecast ? 'yes' : 'no')} | Oracle/truth: ${escapeHtml(planner?.usesOracle || planner?.usesTruth ? 'yes' : 'no')}</p>
      </article>
    `;
  }

  saveLeaderboardAttempt(result) {
    if (this.app.state.currentScenario?.source === 'tutorial') return;
    if (this.leaderboardSavedFor === result) return;
    this.leaderboardSavedFor = result;
    const saved = recordLeaderboardAttempt({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      result,
      label: this.app.state.currentPlanSource ?? 'Manual Player Plan'
    });
    if (saved.ok) result.leaderboardAttempt = {
      attemptId: saved.attempt.attemptId,
      savedAt: saved.attempt.createdAt,
      rank: (saved.record.attempts ?? []).findIndex((attempt) => attempt.attemptId === saved.attempt.attemptId) + 1
    };
    if (saved.ok) saveAttemptToLocalStore({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      result,
      label: this.app.state.currentPlanSource ?? 'Manual Player Plan'
    });
  }

  riskPanelHtml(result) {
    const s = result.summary ?? {};
    const drift = result.drift ?? {};
    return `
      <article class="debrief-panel">
        <h2>Stochastic / Risk</h2>
        <p>ROI ${escapeHtml(result.stochastic?.roiScoringMode ?? result.stochasticRun?.roiScoringMode ?? 'expectedValue')} | Seed ${escapeHtml(result.stochastic?.seed ?? result.stochasticRun?.rngSeed ?? 'N/A')}</p>
        <p>Simulation-resolved stochastic outcome: ${escapeHtml(result.stochastic?.probabilitySuccesses ?? s.probabilitySuccesses ?? 0)} success / ${escapeHtml(result.stochastic?.probabilityMisses ?? s.probabilityFailures ?? 0)} miss | Avg p ${escapeHtml(s.averageSampleProbability ?? 'N/A')}</p>
        <p>Drift actuals: assist ${escapeHtml(formatMetric(drift.averageCurrentAssist ?? 0))} | cross ${escapeHtml(formatMetric(drift.averageCrossCurrent ?? 0))} | drift seed ${escapeHtml(drift.stochasticDrift ? drift.stochasticDriftSeed : 'deterministic')}</p>
        <p>Sampling ${escapeHtml(result.sampling?.mode ?? s.samplingMode ?? 'unique')} | Duplicates ${escapeHtml(s.duplicateSamples ?? 0)} | Depleted ${escapeHtml(s.depletedSamples ?? 0)}</p>
        <p>End ${escapeHtml(result.endCondition?.mode ?? s.endCondition?.mode ?? 'none')} | Achieved ${escapeHtml((result.endCondition?.achieved ?? s.recoveryAchieved ?? true) ? 'yes' : 'no')} | Bonus ${escapeHtml(s.recoveryBonus ?? 0)} | Penalty ${escapeHtml(s.recoveryPenalty ?? 0)}</p>
      </article>
    `;
  }

  stopReasonPanelHtml(result) {
    const stop = result.stopReason ?? result.summary?.stopReason;
    if (!stop || stop.code === 'complete') return '';
    const last = stop.lastSuccessfulWaypoint
      ? `Last successful waypoint: ${Number(stop.lastSuccessfulWaypoint.waypointIndex ?? 0) + 1}.`
      : 'Last successful waypoint: none.';
    const failed = stop.firstFailedWaypoint
      ? `First failed waypoint: ${Number(stop.firstFailedWaypoint.waypointIndex ?? 0) + 1}.`
      : '';
    const decision = (result.events ?? []).findLast?.((event) => event.type === 'routeFailureDecision')
      ?? [...(result.events ?? [])].reverse().find((event) => event.type === 'routeFailureDecision')
      ?? null;
    return `
      <article class="debrief-panel">
        <h2>Simulation Stop Reason</h2>
        <p>${escapeHtml(stop.title ?? 'Simulation stopped before completing the route.')}</p>
        <p>${escapeHtml(last)} ${escapeHtml(failed)}</p>
        ${decision ? `<p>Recovery choice: ${escapeHtml(labelize(decision.action ?? 'unknown'))}.</p>` : ''}
        <p>Suggested fix: ${escapeHtml(stop.suggestedFix ?? 'Revise unreachable waypoints, then run again.')}</p>
      </article>
    `;
  }

  comparisonPanelHtml(comparison) {
    const rows = comparison?.rows ?? [];
    return `
      <article class="debrief-panel">
        <h2>Plan Comparison</h2>
        ${rows.length ? `
          <div class="debrief-table-wrap">
            <table class="debrief-table">
              <thead><tr><th>Plan</th><th>Planned EV</th><th>Actual</th><th>Final</th><th>Risk</th></tr></thead>
              <tbody>
                ${rows.slice(0, 6).map((row) => `
                  <tr class="${comparison.winner?.source === row.source ? 'winner' : ''}">
                    <td>${escapeHtml(row.planName ?? row.source)}</td>
                    <td>${escapeHtml(formatMetric(row.expectedValue))}</td>
                    <td>${escapeHtml(formatMetric(row.realizedValue))}</td>
                    <td>${escapeHtml(formatMetric(row.finalScore))}</td>
                    <td>${escapeHtml(formatMetric(row.riskExposure))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p>No comparison rows available yet.</p>'}
      </article>
    `;
  }

  seedPanelHtml(result) {
    const rows = normalizeHistory(result.stochasticRunHistory ?? this.app.state.stochasticRuns?.runs ?? []);
    const board = loadLeaderboard();
    const attempts = board.records?.[result.instanceId ?? this.app.state.level?.instanceId]?.attempts ?? [];
    return `
      <article class="debrief-panel">
        <h2>Seed Comparison</h2>
        <p>${escapeHtml(interpretSeedStability(rows))}</p>
        ${attempts.length ? `<p>Local leaderboard best: ${escapeHtml(formatMetric(attempts[0].score))} across ${escapeHtml(attempts.length)} attempt(s). Current save rank ${escapeHtml(result.leaderboardAttempt?.rank ?? 'N/A')}.</p>` : ''}
        ${rows.length ? `
          <div class="debrief-table-wrap">
            <table class="debrief-table">
              <thead><tr><th>Seed</th><th>Final</th><th>Realized</th><th>Success/Miss</th></tr></thead>
              <tbody>
                ${rows.slice(0, 6).map((row) => `
                  <tr>
                    <td>${escapeHtml(row.seed ?? 'N/A')}</td>
                    <td>${escapeHtml(formatMetric(row.finalScore))}</td>
                    <td>${escapeHtml(formatMetric(row.realizedValue))}</td>
                    <td>${escapeHtml(formatMetric(row.probabilitySuccesses))}/${escapeHtml(formatMetric(row.probabilityMisses))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </article>
    `;
  }

  actionButtonHtml(action, label, primary = false, disabled = false) {
    return `<button class="debrief-button ${primary ? 'primary' : ''}" data-action="${escapeAttr(action)}" ${disabled ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
  }

  nextDebriefActionHtml() {
    const next = this.getScenarioNextAction();
    if (!next) return '';
    return this.actionButtonHtml('next-scenario', next.label);
  }

  bindDebriefActions(root, result) {
    root.querySelector('[data-action="menu"]')?.addEventListener('click', () => this.leaveDebrief(() => this.scene.start('MainMenuScene')));
    root.querySelector('[data-action="revise"]')?.addEventListener('click', () => this.leaveDebrief(() => this.scene.start('MissionWorkspaceScene')));
    root.querySelector('[data-action="retry"]')?.addEventListener('click', () => this.leaveDebrief(() => this.retryFromBriefing()));
    root.querySelector('[data-action="temporal-greedy"]')?.addEventListener('click', () => this.leaveDebrief(() => this.simulateTemporalGreedy()));
    root.querySelector('[data-action="rerun-same"]')?.addEventListener('click', () => this.leaveDebrief(() => this.rerunSamePlan(false)));
    root.querySelector('[data-action="rerun-new-seed"]')?.addEventListener('click', () => this.leaveDebrief(() => this.rerunSamePlan(true)));
    root.querySelector('[data-action="export-result"]')?.addEventListener('click', () => downloadJson('anchor.result.json', this.buildCurrentResultExport(result)));
    root.querySelector('[data-action="export-aar"]')?.addEventListener('click', () => downloadText('anchor_after_action_report.md', buildMarkdownAAR({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      result
    }), 'text/markdown'));
    root.querySelector('[data-action="export-compare"]')?.addEventListener('click', () => downloadJson('anchor_plan_comparison.json', result?.comparison ?? comparePlanResults(this.app.state.planResults ?? {})));
    root.querySelector('[data-action="next-scenario"]')?.addEventListener('click', () => this.leaveDebrief(() => this.getScenarioNextAction()?.onClick?.()));
  }

  leaveDebrief(callback) {
    this.destroyDebriefRoot();
    this.app.setDebriefFullscreen(false);
    callback?.();
  }

  destroyDebriefRoot() {
    this.debriefRoot?.remove?.();
    this.debriefRoot = null;
  }

  renderConsole() {
    const result = this.app.state.result;
    this.app.console?.renderDebriefActions(result, this.app.state, {
      revise: () => this.leaveDebrief(() => this.scene.start('MissionWorkspaceScene')),
      menu: () => this.leaveDebrief(() => this.scene.start('MainMenuScene')),
      'rerun-same': () => this.leaveDebrief(() => this.rerunSamePlan(false)),
      'rerun-new-seed': () => this.leaveDebrief(() => this.rerunSamePlan(true)),
      retry: () => this.leaveDebrief(() => this.retryFromBriefing()),
      'next-tutorial': () => this.leaveDebrief(() => this.startNextTutorial()),
      'tutorial-browser': () => this.leaveDebrief(() => this.openTutorialBrowser()),
      'new-challenge': () => this.leaveDebrief(() => this.startNewChallenge()),
      editor: () => this.leaveDebrief(() => this.scene.start('EnvironmentEditorScene')),
      'export-result': () => downloadJson('anchor.result.json', this.buildCurrentResultExport(result)),
      'export-aar': () => downloadText('anchor_after_action_report.md', buildMarkdownAAR({
        result,
        plan: this.app.state.plan,
        comparison: result?.comparison
      })),
      'export-compare': () => downloadJson('anchor_plan_comparison.json', result?.comparison ?? comparePlanResults(this.app.state.planResults ?? {})),
      'temporal-greedy': () => this.leaveDebrief(() => this.simulateTemporalGreedy())
    });
  }

  drawBackground() {
    this.graphics.clear();
    this.graphics.fillGradientStyle(0x06111f, 0x0b2137, 0x08243a, 0x06111f, 1);
    this.graphics.fillRect(0, 0, 1280, 820);
  }

  drawMetricCards(result) {
    const s = result.summary ?? {};
    const metrics = [
      ['Actual Final', s.finalScore ?? 0],
      ['Actual ROI', s.sampleScore ?? 0],
      ['Planned EV', s.expectedSampleScore ?? 0],
      ['Stochastic Realized', s.realizedSampleScore ?? s.sampleScore ?? 0],
      ['Actual Energy', s.energyUsed ?? 0],
      ['Hazards', s.hazardsHit ?? 0],
      ['Mobile', s.mobileHazardsHit ?? 0],
      ['Regret', result.regret?.forecastRegret ?? s.expectedValueRegret ?? 'N/A']
    ];
    metrics.forEach(([label, value], index) => {
      const x = 74 + (index % 4) * 148;
      const y = 164 + Math.floor(index / 4) * 82;
      this.metricCard(x, y, label, formatMetric(value));
    });
  }

  drawRiskSummary(result) {
    const s = result.summary ?? {};
    const risk = result.risk ?? {};
    this.panel(684, 156, 500, 150, 0.72);
    this.text(706, 174, 'Stochastic / Risk', 17, '#eef6ff', '700');
    this.text(706, 208, `ROI ${result.stochastic?.roiScoringMode ?? result.stochasticRun?.roiScoringMode ?? 'expectedValue'} | Seed ${result.stochastic?.seed ?? result.stochasticRun?.rngSeed ?? 'N/A'}`, 12, '#b9c7dc', '500', 450);
    this.text(706, 232, `Simulation-resolved stochastic outcome: ${result.stochastic?.probabilitySuccesses ?? s.probabilitySuccesses ?? 0} success / ${result.stochastic?.probabilityMisses ?? s.probabilityFailures ?? 0} miss | Avg p ${s.averageSampleProbability ?? 'N/A'}`, 12, '#b9c7dc', '500', 450);
    this.text(706, 256, `Sampling ${result.sampling?.mode ?? s.samplingMode ?? 'unique'} | Duplicates ${s.duplicateSamples ?? 0} | Depleted ${s.depletedSamples ?? 0}`, 12, '#b9c7dc', '500', 450);
    this.text(706, 278, `End ${result.endCondition?.mode ?? s.endCondition?.mode ?? 'none'} | Achieved ${(result.endCondition?.achieved ?? s.recoveryAchieved ?? true) ? 'yes' : 'no'} | Bonus ${s.recoveryBonus ?? 0} | Penalty ${s.recoveryPenalty ?? 0}`, 12, '#b9c7dc', '500', 450);
  }

  drawComparison(comparison) {
    const rows = comparison?.rows ?? [];
    this.panel(74, 344, 612, 214, 0.72);
    this.text(96, 362, 'Plan Comparison', 17, '#eef6ff', '700');
    if (!rows.length) {
      this.text(96, 404, 'No comparison rows available yet.', 13, '#9cb4d8');
      return;
    }
    this.text(96, 394, 'Plan', 11, '#7898bd', '700');
    this.text(308, 394, 'Planned EV', 11, '#7898bd', '700');
    this.text(400, 394, 'Actual', 11, '#7898bd', '700');
    this.text(492, 394, 'Final', 11, '#7898bd', '700');
    this.text(576, 394, 'Risk', 11, '#7898bd', '700');
    rows.slice(0, 4).forEach((row, index) => {
      const y = 426 + index * 36;
      const winner = comparison.winner?.source === row.source;
      this.rowBand(94, y - 6, 560, 28, winner ? 0x163d35 : 0x101b2e, winner ? 0.9 : 0.55);
      this.text(100, y, row.planName ?? row.source, 11, winner ? '#63e6be' : '#eef6ff', '700', 190);
      this.text(308, y, formatMetric(row.expectedValue), 11);
      this.text(400, y, formatMetric(row.realizedValue), 11);
      this.text(492, y, formatMetric(row.finalScore), 11);
      this.text(576, y, formatMetric(row.riskExposure), 11);
      if (row.source === 'temporalGreedy' && row.greedyStop?.stopReason) {
        this.text(100, y + 14, greedyStopSummary(row.greedyStop), 9, '#9cb4d8', '500', 520);
      }
    });
  }

  drawSeedHistory(result) {
    const rows = normalizeHistory(result.stochasticRunHistory ?? this.app.state.stochasticRuns?.runs ?? []);
    this.panel(714, 344, 470, 214, 0.72);
    this.text(736, 362, 'Seed Comparison', 17, '#eef6ff', '700');
    if (!rows.length) {
      this.text(736, 404, 'Run stochastic reruns to compare seed sensitivity.', 13, '#9cb4d8', '500', 400);
      return;
    }
    this.text(736, 394, interpretSeedStability(rows), 12, '#9cb4d8', '500', 410);
    rows.slice(0, 4).forEach((row, index) => {
      const y = 430 + index * 34;
      this.rowBand(734, y - 6, 410, 26, 0x101b2e, 0.55);
      this.text(742, y, String(row.seed ?? 'N/A'), 11, '#eef6ff', '700', 100);
      this.text(866, y, `Final ${formatMetric(row.finalScore)}`, 11);
      this.text(990, y, `R ${formatMetric(row.realizedValue)}`, 11);
      this.text(1086, y, `${formatMetric(row.probabilitySuccesses)}/${formatMetric(row.probabilityMisses)}`, 11);
    });
  }

  drawActions(result) {
    const y = 648;
    this.button(146, y, 144, 'Revise Plan', () => this.scene.start('MissionWorkspaceScene'));
    this.button(306, y, 150, 'Rerun Same', () => this.rerunSamePlan(false)).setDisabled(!this.app.state.stochastic?.enabled);
    this.button(466, y, 150, 'Rerun New Seed', () => this.rerunSamePlan(true)).setDisabled(!this.app.state.stochastic?.enabled);
    this.button(638, y, 150, 'Export Result', () => downloadJson('anchor.result.json', this.buildCurrentResultExport(result)));
    this.button(800, y, 140, 'Export AAR', () => downloadText('anchor_after_action_report.md', buildMarkdownAAR({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      result
    }), 'text/markdown'));
    this.button(956, y, 158, 'Export Compare', () => downloadJson('anchor_plan_comparison.json', result.comparison ?? comparePlanResults(this.app.state.planResults ?? {})));
    this.button(1118, y, 116, 'Menu', () => this.scene.start('MainMenuScene'));
    this.button(230, y + 52, 220, 'Temporal Greedy', () => this.simulateTemporalGreedy());
    this.button(474, y + 52, 172, 'Retry Briefing', () => this.retryFromBriefing());
    const next = this.getScenarioNextAction();
    if (next) this.button(668, y + 52, 188, next.label, next.onClick);
  }

  nextActionButtonHtml() {
    const source = this.app.state.currentScenario?.source;
    if (source === 'tutorial') return '<button class="console-button" data-action="next-tutorial">Next Tutorial</button>';
    if (source === 'deterministicChallenge' || source === 'stochasticChallenge') return '<button class="console-button" data-action="new-challenge">New Challenge</button>';
    if (source === 'editor') return '<button class="console-button" data-action="editor">Return To Editor</button>';
    return '';
  }

  getScenarioNextAction() {
    const source = this.app.state.currentScenario?.source;
    if (source === 'tutorial') return { label: 'Next Tutorial', onClick: () => this.startNextTutorial() };
    if (source === 'deterministicChallenge' || source === 'stochasticChallenge') return { label: 'New Challenge', onClick: () => this.startNewChallenge() };
    if (source === 'editor') return { label: 'Return Editor', onClick: () => this.scene.start('EnvironmentEditorScene') };
    return null;
  }

  retryFromBriefing() {
    resetScenarioForRetry(this.app.state);
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  async startNextTutorial() {
    const currentId = this.app.state.currentScenario?.levelId ?? this.app.state.level?.levelId;
    const currentIndex = CAMPAIGN_LEVELS.findIndex((entry) => entry.id === currentId);
    const entry = CAMPAIGN_LEVELS[currentIndex + 1] ?? CAMPAIGN_LEVELS[0];
    const level = ensureLevelIdentity(await loadCampaignLevel(entry));
    const mission = applyTutorialMissionConfig(await loadJSON('missions/tutorial_sampling.json'), entry.id);
    beginScenario(this.app.state, {
      level,
      mission,
      challengeMode: level.challengeMode ?? entry.mode ?? 'perfectKnowledge',
      source: 'tutorial'
    });
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  openTutorialBrowser() {
    this.scene.start('MainMenuScene');
    globalThis.setTimeout(() => this.scene.get('MainMenuScene')?.openTutorialBrowser?.(), 0);
  }

  startNewChallenge() {
    const source = this.app.state.currentScenario?.source;
    const mode = source === 'stochasticChallenge' || this.app.state.challengeMode === 'forecast' ? 'forecast' : 'perfectKnowledge';
    const stochastic = mode === 'forecast';
    const seed = `${stochastic ? 'stochastic' : 'deterministic'}-${Date.now().toString(36)}`;
    const level = ensureLevelIdentity(generateLevel({
      seed,
      name: stochastic ? `Stochastic Challenge ${seed}` : `Deterministic Challenge ${seed}`,
      width: stochastic ? 14 : 12,
      height: stochastic ? 14 : 12,
      dt: 1,
      duration: 24,
      planningWindow: 3,
      difficulty: stochastic ? 'hard' : 'medium',
      currentPattern: stochastic ? 'fluid' : 'corridor',
      fluidPreset: stochastic ? 'eddyField' : undefined,
      currentStrength: stochastic ? 1.05 : 0.85,
      roiPattern: 'moving',
      temporalHotspots: true,
      temporalCurrents: true,
      challengeMode: mode,
      forecastMode: stochastic ? 'noisy' : 'none',
      ensembleCount: stochastic ? 3 : 0,
      roiProbabilityMode: stochastic ? 'variable' : 'certain',
      mobileHazardsCount: stochastic ? 2 : 0,
      depthVariation: stochastic ? 0.55 : 0.35
    }));
    const mission = buildDefaultMissionForLevel(level, {
      missionId: stochastic ? 'stochastic_challenge_mission' : 'deterministic_challenge_mission',
      name: stochastic ? 'Stochastic Challenge Mission' : 'Deterministic Challenge Mission',
      agentCount: stochastic ? 2 : 1,
      battery: stochastic ? 115 : 100,
      maxSpeed: stochastic ? 1.2 : 1.25,
      deploymentMode: 'chooseFromZone',
      deploymentZoneId: 'drop_alpha',
      stochasticDrift: stochastic,
      driftNoiseScale: stochastic ? 0.08 : 0,
      driftSeed: level.meta?.seed ?? level.instanceId
    });
    beginScenario(this.app.state, {
      level,
      mission,
      challengeMode: mode,
      source: stochastic ? 'stochasticChallenge' : 'deterministicChallenge'
    });
    this.app.state.ui.revealTruth = false;
    this.app.state.ui.forecastMemberId = stochastic ? 'ensemble_mean' : null;
    this.app.state.ui.roiViewMode = 'expectedValue';
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  simulateTemporalGreedy() {
    const plan = temporalGreedySolver(this.app.state.level, this.app.state.mission, {
      challengeMode: this.app.state.challengeMode,
      revealTruth: this.app.state.ui?.revealTruth,
      forecastMemberId: this.app.state.ui?.forecastMemberId,
      maxWaypoints: 6
    });
    attachIdentityToPlan(plan, this.app.state.level, this.app.state.mission);
    this.app.state.plan = plan;
    this.app.state.temporalGreedyPlan = plan;
    this.app.state.currentPlanSource = 'temporalGreedy';
    this.app.state.result = null;
    this.scene.start('SimulationScene');
  }

  rerunSamePlan(newSeed) {
    prepareStochasticRerun(this.app.state, { newSeed });
    this.app.state.result = null;
    this.scene.start('SimulationScene');
  }

  buildCurrentResultExport(result) {
    return buildResultExport({
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      result,
      label: this.app.state.currentPlanSource ?? 'Manual Player Plan'
    });
  }

  metricCard(x, y, label, value) {
    this.panel(x, y, 126, 62, 0.78);
    this.text(x + 14, y + 10, label, 11, '#7898bd', '700');
    this.text(x + 14, y + 30, value, 18, '#eef6ff', '700', 100);
  }

  panel(x, y, width, height, alpha = 0.88) {
    const rect = this.add.rectangle(x, y, width, height, 0x0f1b2e, alpha)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x6d86aa, 0.34);
    this.objects.push(rect);
    return rect;
  }

  rowBand(x, y, width, height, color, alpha) {
    const rect = this.add.rectangle(x, y, width, height, color, alpha).setOrigin(0, 0);
    this.objects.push(rect);
    return rect;
  }

  button(x, y, width, label, onClick) {
    const button = new PhaserButton(this, { x, y, width, height: 34, label, onClick });
    this.objects.push(button);
    return button;
  }

  text(x, y, value, size = 12, color = '#dcecff', weight = '500', width = 180) {
    const text = this.add.text(x, y, String(value), {
      fontFamily: 'system-ui',
      fontSize: `${size}px`,
      fontStyle: weight,
      color,
      wordWrap: { width }
    });
    this.objects.push(text);
    return text;
  }

  clearObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
  }
}

function normalizeHistory(history) {
  return history.map((entry) => entry.summary ? {
    seed: entry.seed,
    ...entry.summary
  } : entry);
}

function interpretSeedStability(rows) {
  if (rows.length < 2) return 'Run more seeds to compare robustness.';
  const scores = rows.map((row) => Number(row.finalScore ?? 0));
  const spread = Math.max(...scores) - Math.min(...scores);
  if (spread <= 5) return 'Stable across seeds.';
  if (spread <= 20) return 'Moderate seed sensitivity.';
  return 'High variance: risky probability strategy.';
}

function greedyStopSummary(stop = {}) {
  return `Stopped ${formatMetric(stop.stopTime)} hr: ${labelizeStopReason(stop.stopReason)} | left ${formatMetric(stop.remainingMissionTime)} hr, fuel ${formatMetric(stop.remainingFuel)}`;
}

function labelizeStopReason(reason) {
  return String(reason ?? 'unknown')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase());
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
