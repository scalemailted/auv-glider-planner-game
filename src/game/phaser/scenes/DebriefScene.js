import { buildMarkdownAAR } from '../../../core/io/ReportExporter.js';
import {
  buildBenchmarkAttemptSetExportFromResult,
  buildBenchmarkRouteExecutionExportFromResult,
  buildBenchmarkRunRecordExportFromResult,
  buildResultExport
} from '../../../core/io/ResultExporter.js';
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
import { EXPERIENCE_MODES, experienceModeLabel } from '../../../core/experience/ExperienceMode.js';
import { getMissionModePreset } from '../../../core/missions/MissionModeRegistry.js';
import { navigationUncertaintyLabel, normalizeNavigationUncertaintyConfig } from '../../../core/navigation/NavigationUncertainty.js';
import { PhaserButton } from '../ui/Button.js';
import { downloadJson, downloadText } from '../ui/FileBridge.js';
import {
  addResultToBenchmarkAttemptSession,
  benchmarkAttemptSessionSummary,
  createBenchmarkAttemptSession
} from '../../../core/benchmark/BenchmarkAttemptSession.js';
import {
  derivePlannerBenchmarkAttemptContext,
  extractPlannerBenchmarkContextFromState
} from '../../../core/benchmark/BenchmarkEpisodeRuntime.js';
import { attemptSourceFromRouteSourceLabel } from '../../../core/benchmark/BenchmarkAttemptSourceMapping.js';

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
    this.prepareBenchmarkDebrief(result);
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
    if (empty) root.querySelector('[data-action="menu"]')?.addEventListener('click', () => this.leaveDebrief(() => this.scene.start('MainMenuScene')));
    else this.bindDebriefActions(root, result);
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
    result ??= {};
    const s = result.summary ?? {};
    const simulationLab = (result.experienceMode ?? this.app.state.experienceMode) === EXPERIENCE_MODES.simulationLab;
    const metrics = (simulationLab ? [
      ['Actual Final', s.finalScore ?? 0],
      ['Actual ROI', s.sampleScore ?? 0],
      ['Planned EV', s.expectedSampleScore ?? 0],
      ['Stochastic Realized', s.realizedSampleScore ?? s.sampleScore ?? 0],
      ['Actual Energy', s.energyUsed ?? 0],
      ['Hazards', s.hazardsHit ?? 0],
      ['Mobile Hazards', s.mobileHazardsHit ?? 0],
      ['Regret', result.regret?.forecastRegret ?? s.expectedValueRegret ?? 'N/A']
    ] : [
      ['Score', s.finalScore ?? 0],
      ['Stars', `${s.priorityTargets?.captured ?? result.priorityTargets?.captured ?? 0}/${s.priorityTargets?.available ?? result.priorityTargets?.available ?? 0}`],
      ['Fuel Used', s.energyUsed ?? 0],
      ['Sample Score', s.sampleScore ?? 0],
      ['Route Grade', result.rating ?? 'N/A'],
      ['Risk Events', Number(s.hazardsHit ?? 0) + Number(s.mobileHazardsHit ?? 0)],
      ['Coverage', s.completedWaypoints ?? 0],
      ['Greedy Delta', result.comparison?.bestManualVsGreedyDelta ?? 'N/A']
    ]);
    return `
      <main class="debrief-shell">
        <header class="debrief-header">
          <div>
            <p class="debrief-kicker">${escapeHtml(experienceModeLabel(result.experienceMode ?? this.app.state.experienceMode))}</p>
            <h1>${escapeHtml(simulationLab ? 'Simulation Lab Debrief' : 'Challenge Debrief')}</h1>
            <p>${escapeHtml(result.planName ?? result.source ?? 'Unknown Plan')} | Instance ${escapeHtml(shortInstanceId(result.instanceId ?? this.app.state.level?.instanceId ?? 'unknown'))} | ${escapeHtml(labelize(result.challengeMode ?? this.app.state.challengeMode, 'Unknown Mode'))}</p>
          </div>
          <div class="debrief-score">
            <span>${escapeHtml(simulationLab ? 'Actual Final' : 'Score')}</span>
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
          ${this.missionModePanelHtml(result)}
          ${this.navigationUncertaintyPanelHtml(result)}
          ${this.missionOptionsPanelHtml(result)}
          ${this.tutorialPanelHtml(result)}
          ${this.importedPlanPanelHtml(result)}
          ${this.benchmarkPanelHtml(result)}
          ${this.stopReasonPanelHtml(result)}
          ${this.priorityTargetPanelHtml(result)}
          ${this.segmentContributionPanelHtml(result)}
          ${this.comparisonPanelHtml(result.comparison)}
          ${simulationLab ? this.seedPanelHtml(result) : ''}
        </section>
      </main>
    `;
  }

  missionModePanelHtml(result) {
    const missionMode = result?.missionMode ?? this.app.state.missionMode ?? this.app.state.level?.meta?.missionMode ?? this.app.state.mission?.meta?.missionMode ?? null;
    if (!missionMode) return '';
    const preset = result?.missionModePreset ?? this.app.state.level?.meta?.missionModePreset ?? this.app.state.mission?.meta?.missionModePreset ?? getMissionModePreset(missionMode);
    const scoring = Object.keys(result?.generationConfig?.scoringWeights ?? this.app.state.level?.meta?.generationConfig?.scoringWeights ?? {}).join(', ') || 'standard';
    const route = Object.keys(result?.generationConfig?.routeGradeWeights ?? this.app.state.level?.meta?.generationConfig?.routeGradeWeights ?? {}).join(', ') || 'standard';
    return `
      <section class="debrief-panel">
        <h2>Mission Mode</h2>
        <p><strong>${escapeHtml(preset.label ?? labelize(missionMode))}</strong>: ${escapeHtml(preset.description ?? 'Challenge objective preset.')}</p>
        <p>Concept: ${escapeHtml(labelize(preset.concept ?? missionMode))} | Difficulty: ${escapeHtml(labelize(preset.difficulty ?? 'standard'))}</p>
        <p>Strategy: ${escapeHtml(preset.strategyHint ?? 'Use route quality, map lenses, and timing to improve the run.')}</p>
        <p>Scoring emphasis: ${escapeHtml(scoring)} | Route grading: ${escapeHtml(route)}</p>
      </section>
    `;
  }

  navigationUncertaintyPanelHtml(result) {
    const config = normalizeNavigationUncertaintyConfig(
      result?.navigationUncertainty
        ?? result?.generationConfig?.navigationUncertainty
        ?? this.app.state.mission?.rules?.navigationUncertainty
        ?? this.app.state.mission?.meta?.navigationUncertainty
        ?? this.app.state.level?.meta?.generationConfig?.navigationUncertainty
        ?? {}
    );
    if (!config.enabled) return '';
    const segments = result?.routeQuality?.segments ?? [];
    const riskSegments = segments.filter((segment) => Number(segment.components?.navigationUncertaintyPenalty ?? 0) > 0);
    const maxCone = Math.max(0, ...segments.map((segment) => Number(segment.diagnostics?.deadReckoningCone?.coneWidthCells ?? 0)));
    const penalty = segments.reduce((sum, segment) => sum + Number(segment.components?.navigationUncertaintyPenalty ?? 0), 0);
    return `
      <article class="debrief-panel">
        <h2>Navigation Uncertainty</h2>
        <p>Level: ${escapeHtml(navigationUncertaintyLabel(config))} | GPS correction on surfacing: ${escapeHtml(config.gpsCorrectionOnSurface ? 'yes' : 'no')}</p>
        <p>Max dead-reckoning cone: ${escapeHtml(formatMetric(maxCone))} cells | Risk segments: ${escapeHtml(riskSegments.length)} | Route penalty ${escapeHtml(formatMetric(penalty))}</p>
        <p>${escapeHtml(riskSegments.length ? 'Cone overlap warnings indicate routes where true underwater position could drift into land or hazards.' : 'No cone overlap warnings were recorded for the executed plan.')}</p>
      </article>
    `;
  }

  priorityTargetPanelHtml(result) {
    const targets = result?.priorityTargets ?? result?.summary?.priorityTargets ?? {};
    const captures = Array.isArray(targets.captures) ? targets.captures : [];
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

  segmentContributionPanelHtml(result) {
    const quality = result?.routeQuality;
    if (!quality?.blocks?.length && !quality?.segments?.length) return '';
    const blocks = quality.blocks ?? [];
    const segments = (quality.segments ?? []).slice(0, 6);
    return `
      <article class="debrief-panel">
        <h2>Segment Contributions</h2>
        <p>Overall route grade ${escapeHtml(quality.overall?.grade ?? 'N/A')} (${escapeHtml(formatMetric(quality.overall?.numericScore ?? 'N/A'))}). Blocks use ${escapeHtml(quality.blockSizeHours ?? 3)} hr dead-reckoning windows.</p>
        ${blocks.length ? `
          <div class="debrief-table-wrap">
            <table class="debrief-table">
              <thead><tr><th>Block</th><th>Grade</th><th>Role</th><th>Sample</th><th>Setup</th><th>Risk</th></tr></thead>
              <tbody>
                ${blocks.map((block) => `
                  <tr>
                    <td>${escapeHtml(formatMetric(block.timeStart))}-${escapeHtml(formatMetric(block.timeEnd))} hr</td>
                    <td>${escapeHtml(block.grade)} (${escapeHtml(formatMetric(block.numericScore))})</td>
                    <td>${escapeHtml((block.roleLabels ?? []).join(' + ') || 'transit')}</td>
                    <td>${escapeHtml(formatMetric(block.components?.immediateSampleReward ?? 0))}</td>
                    <td>${escapeHtml(formatMetric(block.components?.futureSetupValue ?? 0))}</td>
                    <td>${escapeHtml(formatMetric(Number(block.components?.hazardPenalty ?? 0) + Number(block.components?.shorelineRiskPenalty ?? 0)))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
        ${segments.length ? `<p>Key segments: ${escapeHtml(segments.map((segment) => `${segment.grade} ${segment.roleLabels?.[0] ?? 'transit'}`).join(' · '))}</p>` : ''}
      </article>
    `;
  }

  missionOptionsPanelHtml(result) {
    const options = result?.missionOptions ?? {};
    if (!options.ignoreUpdateEvents) return '';
    const ignored = Number(options.ignoredUpdateEvents ?? result?.updateEventsIgnored ?? 0);
    return `
      <article class="debrief-panel">
        <h2>Mission Options</h2>
        <p>Update events: ignored.</p>
        <p>Surfacing/update windows ignored: ${escapeHtml(ignored)}</p>
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
    const planner = this.app.state.plan?.planner ?? result?.planMetadata?.planner ?? null;
    const isImported = Boolean(metadata || result?.planMetadata?.importedPlan || planner);
    if (!isImported) return '';
    const demo = Boolean(metadata?.demoPlan || planner?.type === 'demo' || result?.planMetadata?.source === 'tutorialDemo');
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

  prepareBenchmarkDebrief(result) {
    const context = this.benchmarkAttemptContext(result);
    if (!context) {
      this.refreshBenchmarkExecutionDebug({ result, context: null });
      return null;
    }
    const routeExecutionExport = this.buildBenchmarkRouteExecutionExport(result, context);
    const runRecordExport = this.buildBenchmarkRunRecordExport(result, context);
    const session = addResultToBenchmarkAttemptSession(
      this.app.state.benchmarkAttemptSession ?? createBenchmarkAttemptSession({ episodeId: context.episodeId, benchmarkMode: 'plannerBenchmark' }),
      {
        episodeId: context.episodeId,
        benchmarkMode: 'plannerBenchmark',
        attemptSource: context.activeAttemptSource,
        routeSourceLabel: result?.planName ?? result?.source ?? context.routeSourceLabel,
        fairnessLabel: context.fairnessLabel,
        result,
        runRecord: runRecordExport.runRecord,
        routeExecutionRecord: routeExecutionExport,
        metrics: routeExecutionExport.metrics
      }
    );
    this.app.state.benchmarkAttemptSession = session;
    this.refreshBenchmarkExecutionDebug({ result, context, runRecordExport, routeExecutionExport, attemptSession: session });
    return session;
  }

  benchmarkAttemptContext(result = null) {
    const base = extractPlannerBenchmarkContextFromState({
      ...this.app.state,
      result: result ?? this.app.state.result
    });
    if (!base) return null;
    return derivePlannerBenchmarkAttemptContext({
      ...base,
      attemptSource: attemptSourceFromRouteSourceLabel(result?.source ?? this.app.state.currentPlanSource ?? 'manual'),
      routeSourceLabel: result?.planName ?? result?.source ?? this.app.state.currentPlanSource ?? 'manual'
    });
  }

  buildBenchmarkExportContext(result, context = this.benchmarkAttemptContext(result)) {
    return {
      level: this.app.state.level,
      mission: this.app.state.mission,
      plan: this.app.state.plan,
      result,
      attemptSession: this.app.state.benchmarkAttemptSession,
      benchmarkModeConfig: context?.benchmarkModeConfig ?? this.app.state.benchmarkModeConfig,
      episodeConfig: context?.episodeConfig,
      attemptSource: context?.activeAttemptSource,
      routeSourceLabel: result?.planName ?? result?.source ?? context?.routeSourceLabel,
      fairnessLabel: context?.fairnessLabel,
      debriefMetrics: {
        comparison: result?.comparison ?? null,
        rating: result?.rating ?? null,
        summary: result?.summary ?? null
      }
    };
  }

  buildBenchmarkRunRecordExport(result, context = this.benchmarkAttemptContext(result)) {
    return buildBenchmarkRunRecordExportFromResult(this.buildBenchmarkExportContext(result, context));
  }

  buildBenchmarkRouteExecutionExport(result, context = this.benchmarkAttemptContext(result)) {
    return buildBenchmarkRouteExecutionExportFromResult(this.buildBenchmarkExportContext(result, context));
  }

  buildBenchmarkAttemptSetExport(result, context = this.benchmarkAttemptContext(result)) {
    return buildBenchmarkAttemptSetExportFromResult(this.buildBenchmarkExportContext(result, context));
  }

  benchmarkPanelHtml(result) {
    const context = this.benchmarkAttemptContext(result);
    if (!context) return '';
    const sessionSummary = benchmarkAttemptSessionSummary(this.app.state.benchmarkAttemptSession ?? createBenchmarkAttemptSession({
      episodeId: context.episodeId,
      benchmarkMode: 'plannerBenchmark'
    }));
    const comparison = sessionSummary.comparison ?? {};
    const objectiveLabel = context.activeObjective?.label ?? context.activeObjective?.id ?? 'Fixed mission objective';
    const attemptLabel = labelize(context.activeAttemptSource, 'Benchmark Attempt');
    const comparisonRows = [
      ['Best score', comparison.bestFinalScore],
      ['Lowest energy', comparison.lowestEnergyUsed],
      ['Fewest hazards', comparison.fewestHazardsHit],
      ['Highest sample score', comparison.highestSampleScore]
    ].filter(([, item]) => item);
    return `
      <article class="debrief-panel planner-benchmark-panel">
        <h2>Planner Benchmark</h2>
        <p>Episode: ${escapeHtml(context.episodeId)}</p>
        <p>Attempt: ${escapeHtml(attemptLabel)} | Fairness: ${escapeHtml(context.fairnessLabel)} | Objective: ${escapeHtml(objectiveLabel)}</p>
        <p>Benchmark Records: Run Record available | Route Execution available | Attempt Set available</p>
        <p>Implemented in P2: existing planner, simulator, and debrief produce normalized benchmark records. Not implemented in P2: new route planner, optimal path search, scoring redesign, adaptive switching, full autonomy, or MARL/RL training.</p>
        ${comparisonRows.length ? `
          <div class="debrief-table-wrap">
            <table class="debrief-table">
              <thead><tr><th>Attempt Comparison</th><th>Winner</th><th>Value</th></tr></thead>
              <tbody>
                ${comparisonRows.map(([label, item]) => `
                  <tr>
                    <td>${escapeHtml(label)}</td>
                    <td>${escapeHtml(item.routeSourceLabel ?? item.attemptSource ?? 'N/A')}</td>
                    <td>${escapeHtml(formatMetric(item.value))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p>Attempt Comparison: run manual, Greedy Planner, or imported attempts under this episode to compare results.</p>'}
        <div class="debrief-actions inline-actions">
          <button class="debrief-button" data-action="export-benchmark-run">Export Benchmark Run Record</button>
          <button class="debrief-button" data-action="export-benchmark-route">Export Route Execution Record</button>
          <button class="debrief-button" data-action="export-benchmark-attempt-set">Export Benchmark Attempt Set</button>
        </div>
      </article>
    `;
  }

  refreshBenchmarkExecutionDebug({ result = null, context = null, runRecordExport = null, routeExecutionExport = null, attemptSession = null } = {}) {
    const summary = result?.summary ?? {};
    globalThis.ANCHOR_BENCHMARK_EXECUTION_DEBUG = {
      version: 'benchmark-execution-p2',
      episodeId: context?.episodeId ?? null,
      benchmarkMode: context?.benchmarkMode ?? null,
      phase: this.app?.state?.mode ?? 'debrief',
      activeAttemptSource: context?.activeAttemptSource ?? null,
      routeSourceLabel: result?.planName ?? result?.source ?? context?.routeSourceLabel ?? null,
      fairnessLabel: context?.fairnessLabel ?? null,
      informationAccessTier: context?.informationAccessTier ?? null,
      objectiveAuthority: context?.objectiveAuthority ?? null,
      routeAuthority: context?.routeAuthority ?? null,
      hasBenchmarkMetadata: Boolean(context),
      hasBenchmarkRunRecord: Boolean(runRecordExport?.runRecord),
      hasRouteExecutionRecord: Boolean(routeExecutionExport?.type === 'anchor.benchmark.route-execution'),
      hasAttemptSet: Boolean(attemptSession?.attempts),
      metrics: {
        finalScore: summary.finalScore ?? null,
        sampleScore: summary.sampleScore ?? summary.realizedSampleScore ?? null,
        energyUsed: summary.energyUsed ?? null,
        hazardsHit: summary.hazardsHit ?? null,
        duplicateSamples: summary.duplicateSamples ?? null
      },
      exportTypes: ['anchor.benchmark.run-record', 'anchor.benchmark.route-execution', 'anchor.benchmark.attempt-set'],
      usesExistingSimulation: true,
      usesExistingDebrief: true,
      usesNewPlanner: false,
      usesMissionScoringRedesign: false,
      usesMARL: false
    };
  }
  riskPanelHtml(result) {
    const s = result?.summary ?? {};
    const drift = result?.drift ?? {};
    return `
      <article class="debrief-panel">
        <h2>Stochastic / Risk</h2>
        <p>ROI ${escapeHtml(labelize(result?.stochastic?.roiScoringMode ?? result?.stochasticRun?.roiScoringMode ?? 'expectedValue'))} | Seed ${escapeHtml(result?.stochastic?.seed ?? result?.stochasticRun?.rngSeed ?? 'N/A')}</p>
        <p>Simulation-resolved stochastic outcome: ${escapeHtml(result?.stochastic?.probabilitySuccesses ?? s.probabilitySuccesses ?? 0)} success / ${escapeHtml(result?.stochastic?.probabilityMisses ?? s.probabilityFailures ?? 0)} miss | Avg p ${escapeHtml(s.averageSampleProbability ?? 'N/A')}</p>
        <p>Drift actuals: assist ${escapeHtml(formatMetric(drift.averageCurrentAssist ?? 0))} | cross ${escapeHtml(formatMetric(drift.averageCrossCurrent ?? 0))} | drift seed ${escapeHtml(drift.stochasticDrift ? drift.stochasticDriftSeed : 'deterministic')}</p>
        <p>Sampling ${escapeHtml(labelize(result?.sampling?.mode ?? s.samplingMode ?? 'unique'))} | Duplicates ${escapeHtml(s.duplicateSamples ?? 0)} | Depleted ${escapeHtml(s.depletedSamples ?? 0)}</p>
        <p>Shoreline risk events: ${escapeHtml(s.shorelineRiskEvents ?? 0)} | Extra shoreline energy ${escapeHtml(formatMetric(s.shorelineRiskEnergyPenalty ?? 0))}</p>
        <p>End ${escapeHtml(labelize(result?.endCondition?.mode ?? s.endCondition?.mode ?? 'none'))} | Achieved ${escapeHtml((result?.endCondition?.achieved ?? s.recoveryAchieved ?? true) ? 'yes' : 'no')} | Bonus ${escapeHtml(s.recoveryBonus ?? 0)} | Penalty ${escapeHtml(s.recoveryPenalty ?? 0)}</p>
      </article>
    `;
  }

  stopReasonPanelHtml(result) {
    const stop = normalizeStopReason(result?.stopReason ?? result?.summary?.stopReason ?? result?.routeFailure ?? null);
    if (stop.code === 'complete') return '';
    const last = stop.lastSuccessfulWaypoint
      ? `Last successful waypoint: ${Number(stop.lastSuccessfulWaypoint.waypointIndex ?? 0) + 1}.`
      : 'Last successful waypoint: not available.';
    const failed = stop.firstFailedWaypoint
      ? `First failed waypoint: ${Number(stop.firstFailedWaypoint.waypointIndex ?? 0) + 1}.`
      : 'First failed waypoint: not available.';
    const events = Array.isArray(result?.events) ? result.events : [];
    const decision = events.findLast?.((event) => event.type === 'routeFailureDecision')
      ?? [...events].reverse().find((event) => event.type === 'routeFailureDecision')
      ?? null;
    return `
      <article class="debrief-panel">
        <h2>Simulation Stop Reason</h2>
        <p>Stop reason: ${escapeHtml(stop.label)}</p>
        <p>${escapeHtml(stop.title)}</p>
        <p>${escapeHtml(last)} ${escapeHtml(failed)}</p>
        ${decision ? `<p>Recovery choice: ${escapeHtml(labelize(decision.action, 'Unknown'))}.</p>` : ''}
        <p>Suggested fix: ${escapeHtml(stop.suggestedFix)}</p>
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
    root.querySelector('[data-action="export-benchmark-run"]')?.addEventListener('click', () => downloadJson('anchor_benchmark_run_record.json', this.buildBenchmarkRunRecordExport(result)));
    root.querySelector('[data-action="export-benchmark-route"]')?.addEventListener('click', () => downloadJson('anchor_benchmark_route_execution.json', this.buildBenchmarkRouteExecutionExport(result)));
    root.querySelector('[data-action="export-benchmark-attempt-set"]')?.addEventListener('click', () => downloadJson('anchor_benchmark_attempt_set.json', this.buildBenchmarkAttemptSetExport(result)));
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
      'export-benchmark-run': () => downloadJson('anchor_benchmark_run_record.json', this.buildBenchmarkRunRecordExport(result)),
      'export-benchmark-route': () => downloadJson('anchor_benchmark_route_execution.json', this.buildBenchmarkRouteExecutionExport(result)),
      'export-benchmark-attempt-set': () => downloadJson('anchor_benchmark_attempt_set.json', this.buildBenchmarkAttemptSetExport(result)),
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
    this.button(230, y + 52, 220, 'Greedy Planner', () => this.simulateTemporalGreedy());
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
      experienceMode: EXPERIENCE_MODES.challenge,
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
      experienceMode: EXPERIENCE_MODES.challenge,
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
      experienceMode: this.app.state.experienceMode,
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
  return labelize(reason, 'Unknown');
}

function normalizeStopReason(stop) {
  if (!stop) {
    return {
      code: 'notRecorded',
      label: 'Not Recorded',
      title: 'No stop reason recorded.',
      suggestedFix: 'No route details available.'
    };
  }
  if (typeof stop === 'string') {
    return {
      code: stop,
      label: labelize(stop, 'Not Recorded'),
      title: stop === 'complete' ? 'Mission completed.' : 'Simulation stopped before completing the route.',
      suggestedFix: stop === 'complete' ? 'No fix needed.' : 'Review the route details and revise the plan if needed.'
    };
  }
  const code = stop.code ?? stop.reason ?? stop.stopReason ?? stop.type ?? 'notRecorded';
  return {
    ...stop,
    code,
    label: labelize(stop.label ?? stop.reasonLabel ?? code, 'Not Recorded'),
    title: stop.title ?? stop.message ?? (code === 'complete' ? 'Mission completed.' : 'Simulation stopped before completing the route.'),
    suggestedFix: stop.suggestedFix ?? stop.recommendation ?? (code === 'complete' ? 'No fix needed.' : 'Review unreachable waypoints, fuel, timing, and recovery rules, then run again.')
  };
}

function labelize(value, fallback = 'Unknown') {
  if (value === null || value === undefined || value === '') return fallback;
  const label = String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!label) return fallback;
  return label.replace(/\b\w/g, (char) => char.toUpperCase());
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
