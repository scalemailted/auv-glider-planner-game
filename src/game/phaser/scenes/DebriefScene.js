import { buildMarkdownAAR } from '../../../core/io/ReportExporter.js';
import {
  buildBenchmarkAttemptSessionExport as buildBenchmarkAttemptSessionExportData,
  buildBenchmarkAttemptSetExportFromResult,
  buildBenchmarkComparisonExportFromResult,
  buildBenchmarkRouteOverlayExportFromResult,
  buildBenchmarkRouteExecutionExportFromResult,
  buildBenchmarkRunRecordExportFromResult,
  buildResultExport
} from '../../../core/io/ResultExporter.js';
import {
  buildAdaptiveEpisodeSessionExport,
  buildAdaptiveEpisodeTraceExport,
  buildAdaptiveLegRecordExport,
  buildAdaptiveManagerStateExport,
  buildAdaptiveNextLegConfigExport,
  buildAdaptiveObjectiveHistoryExport,
  buildAdaptiveObjectiveTransitionExport,
  buildAdaptiveSessionSummaryExport,
  buildAdaptiveSurfacingDecisionExport
} from '../../../core/benchmark/BenchmarkModeExporter.js';
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
import { downloadJson, downloadText, readJsonFile } from '../ui/FileBridge.js';
import {
  addResultToBenchmarkAttemptSession,
  benchmarkAttemptSessionSummary,
  createBenchmarkAttemptSession
} from '../../../core/benchmark/BenchmarkAttemptSession.js';
import {
  derivePlannerBenchmarkAttemptContext,
  extractPlannerBenchmarkContextFromState
} from '../../../core/benchmark/BenchmarkEpisodeRuntime.js';
import { deriveAdaptiveBenchmarkContextFromState } from '../../../core/benchmark/AdaptiveBenchmarkRuntime.js';
import { createAdaptiveLegRecord } from '../../../core/benchmark/AdaptiveLegRecord.js';
import {
  addAdaptiveLegToSession,
  addAdaptiveNextLegHandoffToSession,
  addAdaptiveSurfacingDecisionToSession,
  adaptiveEpisodeSessionSummary,
  createAdaptiveEpisodeSession
} from '../../../core/benchmark/AdaptiveEpisodeSession.js';
import {
  deleteAdaptiveEpisodeSession,
  listAdaptiveEpisodeSessions,
  loadAdaptiveEpisodeSession,
  saveAdaptiveEpisodeSession
} from '../../../core/benchmark/AdaptiveEpisodePersistence.js';
import { buildAdaptiveObjectiveHistoryViewModel } from '../../../core/benchmark/AdaptiveObjectiveHistoryViewModel.js';
import { createAdaptiveContinueLegPayload, openAdaptiveBenchmarkSetup } from '../../../core/benchmark/BenchmarkLaunchBridge.js';
import { buildAdaptiveEvidenceFromResult } from '../../../core/benchmark/AdaptiveEvidenceAdapter.js';
import { createAdaptiveSurfacingEvent } from '../../../core/benchmark/AdaptiveSurfacingEvent.js';
import { runAdaptiveSurfacingDecision } from '../../../core/benchmark/AdaptiveSurfacingLoop.js';
import { createAdaptiveNextLegConfig } from '../../../core/benchmark/AdaptiveNextLegHandoff.js';
import { appendAdaptiveLegResult, appendAdaptiveSurfacingDecision, createAdaptiveEpisodeTrace } from '../../../core/benchmark/AdaptiveEpisodeTrace.js';
import { attemptSourceFromRouteSourceLabel } from '../../../core/benchmark/BenchmarkAttemptSourceMapping.js';
import { buildBenchmarkComparisonViewModel, benchmarkMetricDefinitions } from '../../../core/benchmark/BenchmarkComparisonViewModel.js';
import { buildBenchmarkRouteReviewViewModel } from '../../../core/benchmark/BenchmarkRouteReviewViewModel.js';
import { extractRouteGeometryFromRouteExecutionRecord, routeGeometryStats } from '../../../core/benchmark/BenchmarkRouteGeometryAdapter.js';
import {
  benchmarkRouteOverlayLayerOptions,
  buildBenchmarkRouteOverlayViewModel
} from '../../../core/benchmark/BenchmarkRouteOverlayViewModel.js';
import { benchmarkDebriefPanelHtml } from '../../../ui/benchmark/BenchmarkDebriefPanel.js';
import { adaptiveSurfacingPanelHtml as adaptiveSurfacingPanelMarkup } from '../../../ui/benchmark/AdaptiveSurfacingPanel.js';
import { adaptiveEpisodeSessionPanelHtml as adaptiveEpisodeSessionPanelMarkup } from '../../../ui/benchmark/AdaptiveEpisodeSessionPanel.js';
import {
  BENCHMARK_IMPORT_SUPPORTED_TYPES,
  mergeBenchmarkArtifactsIntoAttemptSession,
  parseBenchmarkArtifact
} from '../../../core/benchmark/BenchmarkArtifactImport.js';
import { buildBenchmarkImportViewModel, benchmarkImportSummary } from '../../../core/benchmark/BenchmarkImportViewModel.js';
import {
  deleteBenchmarkAttemptSession,
  listBenchmarkAttemptSessions,
  loadBenchmarkAttemptSession,
  saveBenchmarkAttemptSession
} from '../../../core/benchmark/BenchmarkAttemptPersistence.js';

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
          ${this.adaptiveSurfacingPanelHtml(result)}
          ${this.adaptiveSessionPanelHtml(result)}
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
        ${segments.length ? `<p>Key segments: ${escapeHtml(segments.map((segment) => `${segment.grade} ${segment.roleLabels?.[0] ?? 'transit'}`).join(' ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· '))}</p>` : ''}
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
    const adaptiveContext = this.adaptiveBenchmarkContext(result);
    if (adaptiveContext) {
      this.prepareAdaptiveBenchmarkDebrief(result, adaptiveContext);
      return null;
    }
    const context = this.benchmarkAttemptContext(result);
    if (!context) {
      this.app.state.adaptiveSurfacingDecision = null;
      this.app.state.adaptiveNextLegHandoff = null;
      this.app.state.adaptiveEpisodeTrace = null;
      this.app.state.adaptiveCurrentLegRecord = null;
      this.app.state.adaptiveEpisodeSession = null;
      this.app.state.adaptiveObjectiveHistoryViewModel = null;
      this.app.state.adaptiveContinueLegPayload = null;
      this.app.state.benchmarkComparisonViewModel = null;
      this.app.state.benchmarkRouteReviewViewModel = null;
      this.app.state.benchmarkRouteGeometry = null;
      this.app.state.benchmarkRouteOverlayViewModel = null;
      this.app.state.benchmarkImportViewModel = null;
      this.refreshBenchmarkExecutionDebug({ result, context: null });
      return null;
    }
    const routeExecutionExport = this.buildBenchmarkRouteExecutionExport(result, context);
    const runRecordExport = this.buildBenchmarkRunRecordExport(result, context);
    const routeGeometry = extractRouteGeometryFromRouteExecutionRecord(routeExecutionExport);
    const baseSession = this.resolveBenchmarkAttemptSession(context);
    const session = addResultToBenchmarkAttemptSession(baseSession, {
      episodeId: context.episodeId,
      benchmarkMode: 'plannerBenchmark',
      attemptSource: context.activeAttemptSource,
      routeSourceLabel: result?.planName ?? result?.source ?? context.routeSourceLabel,
      fairnessLabel: context.fairnessLabel,
      result,
      runRecord: runRecordExport.runRecord,
      routeExecutionRecord: routeExecutionExport,
      routeGeometry,
      metrics: routeExecutionExport.metrics
    });
    this.app.state.benchmarkAttemptSession = session;
    const attemptSetExport = this.buildBenchmarkAttemptSetExport(result, context);
    const activeAttempt = (attemptSetExport.attempts ?? []).find((attempt) => attempt.resultId && routeExecutionExport.resultId && attempt.resultId === routeExecutionExport.resultId)
      ?? (attemptSetExport.attempts ?? []).find((attempt) => attempt.attemptSource === context.activeAttemptSource && attempt.routeSourceLabel === (result?.planName ?? result?.source ?? context.routeSourceLabel))
      ?? (attemptSetExport.attempts ?? []).at(-1)
      ?? null;
    const comparisonViewModel = buildBenchmarkComparisonViewModel({
      attemptSet: attemptSetExport,
      activeAttempt,
      benchmarkModeConfig: context.benchmarkModeConfig,
      episodeConfig: context.episodeConfig,
      routeExecutionRecords: [routeExecutionExport],
      runRecords: [runRecordExport.runRecord]
    });
    const routeReviewViewModel = buildBenchmarkRouteReviewViewModel({
      routeExecutionRecord: routeExecutionExport,
      plan: this.app.state.plan,
      result
    });
    const routeOverlayViewModel = buildBenchmarkRouteOverlayViewModel({
      attemptSet: attemptSetExport,
      activeAttempt,
      routeExecutionRecord: routeExecutionExport,
      routeGeometry,
      routeReviewViewModel,
      comparisonViewModel,
      selectedOverlayLayer: this.app.state.benchmarkRouteOverlayLayer ?? 'routeStatus',
      selectedSegmentIndex: this.app.state.benchmarkSelectedRouteSegmentIndex,
      selectedWaypointIndex: this.app.state.benchmarkSelectedRouteWaypointIndex,
      selectedOverlayAttemptId: this.app.state.benchmarkSelectedOverlayAttemptId
    });
    const importViewModel = buildBenchmarkImportViewModel({
      currentEpisode: this.currentBenchmarkEpisodeDescriptor(context),
      currentSession: session,
      importedArtifacts: this.app.state.benchmarkImportedArtifacts ?? [],
      persistedSessions: this.listPersistedBenchmarkSessions()
    });
    this.app.state.benchmarkComparisonViewModel = comparisonViewModel;
    this.app.state.benchmarkRouteReviewViewModel = routeReviewViewModel;
    this.app.state.benchmarkRouteGeometry = routeGeometry;
    this.app.state.benchmarkRouteOverlayViewModel = routeOverlayViewModel;
    this.app.state.benchmarkRouteOverlayLayer = routeOverlayViewModel.selectedOverlayLayer;
    this.app.state.benchmarkSelectedOverlayAttemptId = routeOverlayViewModel.selectedOverlayAttemptId;
    this.app.state.benchmarkAttemptSetExport = attemptSetExport;
    this.app.state.benchmarkImportViewModel = importViewModel;
    this.refreshBenchmarkExecutionDebug({
      result,
      context,
      runRecordExport,
      routeExecutionExport,
      attemptSession: session,
      attemptSetExport,
      comparisonViewModel,
      routeReviewViewModel,
      routeOverlayViewModel
    });
    return session;
  }

  adaptiveBenchmarkContext(result = null) {
    return deriveAdaptiveBenchmarkContextFromState({
      ...this.app.state,
      result: result ?? this.app.state.result
    });
  }

  prepareAdaptiveBenchmarkDebrief(result, context = this.adaptiveBenchmarkContext(result)) {
    if (!context || !result) return null;
    const evidence = buildAdaptiveEvidenceFromResult({
      result,
      plan: this.app.state.plan,
      mission: this.app.state.mission,
      level: this.app.state.level,
      previousManagerState: context.adaptiveManagerState,
      options: {
        episodeId: context.episodeId,
        activeObjectiveId: context.activeObjective?.id
      }
    });
    const surfacingEvent = createAdaptiveSurfacingEvent({
      episodeId: context.episodeId,
      time: evidence.time,
      samplesUploaded: evidence.observationCount,
      observationsReceived: evidence.recentObservationCount,
      notes: ['P7 debrief surfacing event built from current result evidence.']
    });
    const decision = runAdaptiveSurfacingDecision({
      runtimeContext: context,
      evidence,
      surfacingEvent,
      managerConfig: context.adaptiveManagerConfig,
      managerState: context.adaptiveManagerState
    });
    const nextLegHandoff = createAdaptiveNextLegConfig({ runtimeContext: context, surfacingDecision: decision, previousResult: result });
    const traceBase = createAdaptiveEpisodeTrace({ runtimeContext: context, notes: ['P7 one-leg adaptive execution preview trace.'] });
    const traceWithLeg = appendAdaptiveLegResult(traceBase, {
      legIndex: context.activeLegIndex,
      objectiveId: context.activeObjective?.id,
      planId: this.app.state.plan?.planId ?? this.app.state.plan?.id,
      resultId: result.resultId ?? result.id,
      status: 'completed'
    });
    const trace = appendAdaptiveSurfacingDecision(traceWithLeg, decision);
    const legRecord = createAdaptiveLegRecord({
      runtimeContext: context,
      legIndex: context.activeLegIndex,
      objectiveId: context.activeObjective?.id,
      plan: this.app.state.plan,
      result,
      evidence,
      surfacingEvent,
      diagnosis: decision.diagnosis,
      objectiveTransition: decision.objectiveTransition,
      nextLegHandoff,
      status: 'nextObjectiveRecommended',
      metrics: result.summary ?? {},
      notes: ['P8 adaptive leg record built from the current debrief result.']
    });
    const sessionBase = this.resolveAdaptiveEpisodeSession(context);
    const sessionWithLeg = addAdaptiveLegToSession(sessionBase, legRecord);
    const sessionWithDecision = addAdaptiveSurfacingDecisionToSession(sessionWithLeg, decision);
    const adaptiveSession = addAdaptiveNextLegHandoffToSession(sessionWithDecision, nextLegHandoff);
    const objectiveHistoryViewModel = buildAdaptiveObjectiveHistoryViewModel({ session: adaptiveSession });
    const continueLegPayload = createAdaptiveContinueLegPayload(adaptiveSession, nextLegHandoff);
    this.app.state.adaptiveSurfacingDecision = decision;
    this.app.state.adaptiveNextLegHandoff = nextLegHandoff;
    this.app.state.adaptiveEpisodeTrace = trace;
    this.app.state.adaptiveCurrentLegRecord = legRecord;
    this.app.state.adaptiveEpisodeSession = adaptiveSession;
    this.app.state.adaptiveObjectiveHistoryViewModel = objectiveHistoryViewModel;
    this.app.state.adaptiveContinueLegPayload = continueLegPayload;
    this.app.state.adaptiveManagerState = decision.managerStateAfter;
    this.app.state.adaptiveBenchmarkRuntimeContext = {
      ...context,
      adaptiveManagerState: decision.managerStateAfter,
      activeObjective: decision.recommendedObjective,
      activeLegIndex: context.activeLegIndex
    };
    this.listPersistedAdaptiveSessions();
    this.refreshAdaptiveExecutionDebug({ context, decision, nextLegHandoff, trace, session: adaptiveSession, legRecord, objectiveHistoryViewModel, continueLegPayload });
    return decision;
  }

  adaptiveSurfacingPanelHtml() {
    const decision = this.app.state.adaptiveSurfacingDecision;
    if (!decision) return '';
    return adaptiveSurfacingPanelMarkup({ decision, nextLegHandoff: this.app.state.adaptiveNextLegHandoff });
  }

  adaptiveSessionPanelHtml() {
    const viewModel = this.app.state.adaptiveObjectiveHistoryViewModel;
    if (!viewModel) return '';
    return adaptiveEpisodeSessionPanelMarkup({
      ...viewModel,
      nextLegAvailable: Boolean(this.app.state.adaptiveNextLegHandoff),
      sessionSummary: adaptiveEpisodeSessionSummary(this.app.state.adaptiveEpisodeSession)
    });
  }

  buildAdaptiveEpisodeSessionExport() {
    return buildAdaptiveEpisodeSessionExport(this.app.state.adaptiveEpisodeSession);
  }

  buildAdaptiveObjectiveHistoryExport() {
    return buildAdaptiveObjectiveHistoryExport(this.app.state.adaptiveObjectiveHistoryViewModel ?? buildAdaptiveObjectiveHistoryViewModel({ session: this.app.state.adaptiveEpisodeSession }));
  }

  buildAdaptiveLegRecordExport() {
    return buildAdaptiveLegRecordExport(this.app.state.adaptiveCurrentLegRecord);
  }

  buildAdaptiveSessionSummaryExport() {
    return buildAdaptiveSessionSummaryExport(this.app.state.adaptiveEpisodeSession);
  }

  resolveAdaptiveEpisodeSession(context) {
    const current = this.app.state.adaptiveEpisodeSession;
    if (current?.episodeId === context.episodeId && current?.benchmarkMode === 'adaptiveBenchmark') return current;
    const loaded = loadAdaptiveEpisodeSession(context.episodeId);
    this.app.state.adaptiveSessionLoaded = Boolean(loaded.ok);
    this.app.state.adaptiveSessionLoadedForEpisode = loaded.ok ? context.episodeId : null;
    if (loaded.ok) return loaded.session;
    return createAdaptiveEpisodeSession({
      runtimeContext: context,
      status: 'planningLeg',
      notes: ['P8 adaptive episode session created in debrief.']
    });
  }

  listPersistedAdaptiveSessions() {
    const listed = listAdaptiveEpisodeSessions();
    this.app.state.adaptivePersistedSessions = listed.sessions ?? [];
    return listed.sessions ?? [];
  }

  saveAdaptiveSessionForCurrentResult() {
    const session = this.app.state.adaptiveEpisodeSession;
    if (!session?.episodeId) {
      this.app.toast?.('No adaptive episode session is available to save.', 'warning');
      return;
    }
    const saved = saveAdaptiveEpisodeSession(session);
    this.app.state.adaptiveSessionSaved = Boolean(saved.ok);
    if (!saved.ok) this.app.state.adaptiveLastSessionWarnings = [saved.reason ?? saved.error ?? 'Unable to save adaptive episode session.'];
    this.listPersistedAdaptiveSessions();
    this.refreshAdaptiveExecutionDebug({
      context: this.adaptiveBenchmarkContext(this.app.state.result),
      decision: this.app.state.adaptiveSurfacingDecision,
      nextLegHandoff: this.app.state.adaptiveNextLegHandoff,
      trace: this.app.state.adaptiveEpisodeTrace,
      session: this.app.state.adaptiveEpisodeSession,
      legRecord: this.app.state.adaptiveCurrentLegRecord,
      objectiveHistoryViewModel: this.app.state.adaptiveObjectiveHistoryViewModel,
      continueLegPayload: this.app.state.adaptiveContinueLegPayload
    });
    this.app.toast?.(saved.ok ? 'Adaptive episode session saved in this browser.' : (saved.reason ?? 'Unable to save adaptive episode session.'), saved.ok ? 'success' : 'warning');
    this.renderDebrief();
  }

  loadCurrentAdaptiveSession() {
    const episodeId = this.app.state.adaptiveEpisodeSession?.episodeId ?? this.adaptiveBenchmarkContext(this.app.state.result)?.episodeId;
    if (!episodeId) return;
    const loaded = loadAdaptiveEpisodeSession(episodeId);
    if (loaded.ok) {
      this.app.state.adaptiveEpisodeSession = loaded.session;
      this.app.state.adaptiveObjectiveHistoryViewModel = buildAdaptiveObjectiveHistoryViewModel({ session: loaded.session });
      this.app.state.adaptiveContinueLegPayload = createAdaptiveContinueLegPayload(loaded.session, loaded.session.nextLegHandoffs?.at(-1));
      this.app.state.adaptiveSessionLoaded = true;
      this.app.toast?.('Saved adaptive episode session loaded.', 'success');
    } else {
      this.app.state.adaptiveLastSessionWarnings = [loaded.reason ?? loaded.error ?? 'Unable to load saved adaptive episode session.'];
      this.app.toast?.(loaded.reason ?? 'Unable to load saved adaptive episode session.', 'warning');
    }
    this.listPersistedAdaptiveSessions();
    this.renderDebrief();
  }

  deleteCurrentAdaptiveSession() {
    const episodeId = this.app.state.adaptiveEpisodeSession?.episodeId ?? this.adaptiveBenchmarkContext(this.app.state.result)?.episodeId;
    if (!episodeId) return;
    const deleted = deleteAdaptiveEpisodeSession(episodeId);
    this.app.state.adaptiveSessionSaved = false;
    this.app.state.adaptiveSessionLoaded = false;
    if (!deleted.ok) this.app.state.adaptiveLastSessionWarnings = [deleted.reason ?? deleted.error ?? 'Unable to delete saved adaptive episode session.'];
    this.listPersistedAdaptiveSessions();
    this.app.toast?.(deleted.ok ? 'Saved adaptive episode session deleted.' : (deleted.reason ?? 'Unable to delete saved adaptive episode session.'), deleted.ok ? 'info' : 'warning');
    this.renderDebrief();
  }

  continueAdaptiveNextLeg() {
    const session = this.app.state.adaptiveEpisodeSession;
    const handoff = this.app.state.adaptiveNextLegHandoff ?? session?.nextLegHandoffs?.at(-1);
    if (!session || !handoff) {
      this.app.toast?.('No adaptive next-leg handoff is available.', 'warning');
      return;
    }
    const payload = createAdaptiveContinueLegPayload(session, handoff);
    this.app.state.adaptiveContinueLegPayload = payload;
    const result = openAdaptiveBenchmarkSetup({
      app: this.app,
      scene: this,
      runtimeContext: payload.runtimeContext,
      adaptiveManagerConfig: payload.runtimeContext.adaptiveManagerConfig,
      adaptiveManagerState: payload.runtimeContext.adaptiveManagerState,
      benchmarkModeConfig: payload.runtimeContext.benchmarkModeConfig,
      activeObjective: payload.runtimeContext.activeObjective,
      legIndex: payload.legIndex
    });
    if (!result.launched) {
      this.app.toast?.('Adaptive setup bridge is unavailable; export the next-leg config instead.', 'warning');
      this.renderDebrief();
      return;
    }
    this.app.state.adaptiveEpisodeSession = session;
    this.leaveDebrief(() => {});
  }

  reviewPreviousAdaptiveLeg() {
    const session = this.app.state.adaptiveEpisodeSession;
    if (!session?.legs?.length) {
      this.app.toast?.('No previous adaptive leg is available to review.', 'info');
      return;
    }
    const current = Number(this.app.state.adaptiveSelectedLegIndex ?? session.currentLegIndex);
    this.app.state.adaptiveSelectedLegIndex = Math.max(0, current - 1);
    this.app.toast?.(`Reviewing adaptive leg ${this.app.state.adaptiveSelectedLegIndex}.`, 'info');
    this.renderDebrief();
  }
  buildAdaptiveSurfacingDecisionExport() {
    return buildAdaptiveSurfacingDecisionExport(this.app.state.adaptiveSurfacingDecision);
  }

  buildAdaptiveManagerStateExport() {
    return buildAdaptiveManagerStateExport(this.app.state.adaptiveSurfacingDecision?.managerStateAfter ?? this.app.state.adaptiveManagerState);
  }

  buildAdaptiveObjectiveTransitionExport() {
    return buildAdaptiveObjectiveTransitionExport(this.app.state.adaptiveSurfacingDecision?.objectiveTransition);
  }

  buildAdaptiveNextLegConfigExport() {
    return buildAdaptiveNextLegConfigExport(this.app.state.adaptiveNextLegHandoff);
  }

  buildAdaptiveEpisodeTraceExport() {
    return buildAdaptiveEpisodeTraceExport(this.app.state.adaptiveEpisodeTrace);
  }

  refreshAdaptiveExecutionDebug({ context = null, decision = null, nextLegHandoff = null, trace = null, session = this.app?.state?.adaptiveEpisodeSession, legRecord = this.app?.state?.adaptiveCurrentLegRecord, objectiveHistoryViewModel = this.app?.state?.adaptiveObjectiveHistoryViewModel, continueLegPayload = this.app?.state?.adaptiveContinueLegPayload } = {}) {
    const savedSessions = this.app?.state?.adaptivePersistedSessions ?? this.listPersistedAdaptiveSessions?.() ?? [];
    const exportTypes = [
      'anchor.benchmark.adaptive-surfacing-decision',
      'anchor.benchmark.adaptive-manager-state',
      'anchor.benchmark.adaptive-objective-transition',
      'anchor.benchmark.adaptive-next-leg-config',
      'anchor.benchmark.adaptive-episode-trace',
      'anchor.benchmark.adaptive-episode-session',
      'anchor.benchmark.adaptive-objective-history',
      'anchor.benchmark.adaptive-leg-record',
      'anchor.benchmark.adaptive-session-summary'
    ];
    const sessionSummary = session ? adaptiveEpisodeSessionSummary(session) : null;
    globalThis.ANCHOR_ADAPTIVE_EXECUTION_DEBUG = decision ? {
      version: decision.version,
      episodeId: decision.episodeId,
      benchmarkMode: 'adaptiveBenchmark',
      legIndex: decision.legIndex,
      policyId: context?.adaptiveManagerConfig?.policyId ?? decision.managerStateBefore?.policyId,
      currentObjectiveId: decision.previousObjective?.id ?? decision.objectiveTransition?.fromObjectiveId,
      recommendedObjectiveId: decision.recommendedObjective?.id ?? decision.objectiveTransition?.toObjectiveId,
      primaryDiagnosis: decision.diagnosis?.primaryDiagnosis,
      confidence: decision.diagnosis?.confidence,
      evidence: decision.evidence,
      surfacingEvent: decision.surfacingEvent,
      objectiveTransition: decision.objectiveTransition,
      managerStateBefore: decision.managerStateBefore,
      managerStateAfter: decision.managerStateAfter,
      nextLegHandoff,
      traceSummary: trace ? { legCount: trace.legs?.length ?? 0, surfacingDecisionCount: trace.surfacingDecisions?.length ?? 0 } : null,
      exportTypes,
      hasAdaptiveEpisodeSession: Boolean(session),
      adaptiveSessionLoaded: Boolean(this.app?.state?.adaptiveSessionLoaded),
      adaptiveSessionSaved: Boolean(this.app?.state?.adaptiveSessionSaved),
      adaptiveSessionLegCount: sessionSummary?.legCount ?? 0,
      adaptiveSessionSurfacingDecisionCount: sessionSummary?.surfacingDecisionCount ?? 0,
      adaptiveObjectiveHistory: session?.objectiveHistory ?? [],
      adaptiveCurrentLegIndex: session?.currentLegIndex ?? decision.legIndex,
      adaptivePreviousLegIndex: Math.max(0, Number(session?.currentLegIndex ?? decision.legIndex ?? 0) - 1),
      adaptiveNextLegAvailable: Boolean(nextLegHandoff),
      adaptiveContinueLegPayloadAvailable: Boolean(continueLegPayload),
      adaptiveSessionExportAvailable: Boolean(session),
      adaptiveObjectiveHistoryExportAvailable: Boolean(objectiveHistoryViewModel),
      savedAdaptiveSessionCount: savedSessions.length,
      availableSavedAdaptiveEpisodes: savedSessions.map((entry) => ({ episodeId: entry.episodeId, legCount: entry.legCount, currentObjectiveId: entry.currentObjectiveId, updatedAt: entry.updatedAt ?? entry.savedAt })),
      lastAdaptiveSessionWarnings: this.app?.state?.adaptiveLastSessionWarnings ?? session?.warnings ?? [],
      hasPartialEvidenceWarning: Boolean(decision.evidence?.diagnostics?.partialEvidence || decision.warnings?.length),
      usesExistingSimulation: true,
      usesNewPlanner: false,
      usesMissionScoringRedesign: false,
      usesMARL: false
    } : { available: false, benchmarkMode: context?.benchmarkMode ?? null };
    globalThis.ANCHOR_ADAPTIVE_SESSION_DEBUG = session ? {
      version: session.version,
      episodeId: session.episodeId,
      session,
      objectiveHistory: session.objectiveHistory,
      legSummaries: session.legs?.map((leg) => ({ legIndex: leg.legIndex, objectiveId: leg.objectiveId, status: leg.status, resultId: leg.resultId })) ?? [],
      persisted: Boolean(this.app?.state?.adaptiveSessionSaved || this.app?.state?.adaptiveSessionLoaded),
      storageAvailable: !(listAdaptiveEpisodeSessions().unavailable),
      exportTypes,
      currentLegRecord: legRecord,
      continueLegPayload,
      usesNewPlanner: false,
      usesMissionScoringRedesign: false,
      usesMARL: false
    } : { available: false };
  }
  resolveBenchmarkAttemptSession(context) {
    const current = this.app.state.benchmarkAttemptSession;
    if (current?.episodeId === context.episodeId && current?.benchmarkMode === 'plannerBenchmark') return current;
    const loaded = loadBenchmarkAttemptSession(context.episodeId);
    this.app.state.benchmarkAttemptSessionLoaded = Boolean(loaded.ok);
    this.app.state.benchmarkAttemptSessionLoadedForEpisode = loaded.ok ? context.episodeId : null;
    if (loaded.ok) return loaded.session;
    return createBenchmarkAttemptSession({ episodeId: context.episodeId, benchmarkMode: 'plannerBenchmark' });
  }

  listPersistedBenchmarkSessions() {
    const listed = listBenchmarkAttemptSessions();
    this.app.state.benchmarkPersistedAttemptSessions = listed.sessions ?? [];
    return listed.sessions ?? [];
  }

  currentBenchmarkEpisodeDescriptor(context = this.benchmarkAttemptContext(this.app.state.result)) {
    return {
      episodeId: context?.episodeId ?? this.app.state.benchmarkAttemptSession?.episodeId ?? null,
      benchmarkMode: context?.benchmarkMode ?? this.app.state.benchmarkAttemptSession?.benchmarkMode ?? 'plannerBenchmark',
      levelId: this.app.state.level?.levelId ?? this.app.state.result?.levelId ?? null,
      missionId: this.app.state.mission?.missionId ?? this.app.state.mission?.id ?? this.app.state.result?.missionId ?? null,
      level: this.app.state.level,
      mission: this.app.state.mission
    };
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

  buildBenchmarkComparisonExport(result, context = this.benchmarkAttemptContext(result)) {
    return buildBenchmarkComparisonExportFromResult(this.buildBenchmarkExportContext(result, context));
  }

  buildBenchmarkAttemptSessionExport(result, context = this.benchmarkAttemptContext(result)) {
    return buildBenchmarkAttemptSessionExportData({
      ...this.buildBenchmarkExportContext(result, context),
      comparisonViewModel: this.app.state.benchmarkComparisonViewModel,
      routeOverlayViewModel: this.app.state.benchmarkRouteOverlayViewModel
    });
  }

  saveBenchmarkAttemptSessionForCurrentResult() {
    const session = this.app.state.benchmarkAttemptSession;
    if (!session?.attempts?.length) {
      this.app.toast?.('No benchmark attempt session is available to save.', 'warning');
      return;
    }
    const saved = saveBenchmarkAttemptSession(session);
    this.app.state.benchmarkAttemptSessionSaved = Boolean(saved.ok);
    if (!saved.ok) this.app.state.benchmarkLastImportWarnings = [saved.reason ?? saved.error ?? 'Unable to save attempt session.'];
    this.app.toast?.(saved.ok ? 'Benchmark attempt session saved in this browser.' : (saved.reason ?? 'Unable to save benchmark attempt session.'), saved.ok ? 'success' : 'warning');
    this.renderDebrief();
  }

  deleteCurrentBenchmarkAttemptSession() {
    const episodeId = this.app.state.benchmarkAttemptSession?.episodeId ?? this.benchmarkAttemptContext(this.app.state.result)?.episodeId;
    if (!episodeId) return;
    const deleted = deleteBenchmarkAttemptSession(episodeId);
    this.app.state.benchmarkAttemptSessionSaved = false;
    this.app.state.benchmarkAttemptSessionLoaded = false;
    if (!deleted.ok) this.app.state.benchmarkLastImportWarnings = [deleted.reason ?? deleted.error ?? 'Unable to delete saved attempt session.'];
    this.app.toast?.(deleted.ok ? 'Saved benchmark attempt session deleted.' : (deleted.reason ?? 'Unable to delete saved attempt session.'), deleted.ok ? 'info' : 'warning');
    this.renderDebrief();
  }

  loadPersistedBenchmarkAttemptSession(episodeId) {
    const loaded = loadBenchmarkAttemptSession(episodeId);
    if (loaded.ok) {
      this.app.state.benchmarkAttemptSession = loaded.session;
      this.app.state.benchmarkAttemptSessionLoaded = true;
      this.app.state.benchmarkAttemptSessionLoadedForEpisode = loaded.session.episodeId;
      this.app.toast?.('Saved benchmark attempt session loaded.', 'success');
    } else {
      this.app.state.benchmarkLastImportWarnings = [loaded.reason ?? loaded.error ?? 'Unable to load saved benchmark attempt session.'];
      this.app.toast?.(loaded.reason ?? 'Unable to load saved benchmark attempt session.', 'warning');
    }
    this.renderDebrief();
  }

  async importBenchmarkArtifactFiles(files) {
    const fileList = Array.from(files ?? []);
    if (!fileList.length) return;
    const imported = [];
    const warnings = [];
    for (const file of fileList) {
      try {
        const payload = await readJsonFile(file);
        const parsed = parseBenchmarkArtifact(payload);
        imported.push(...parsed.artifacts.map((artifact) => ({ ...artifact, fileName: file.name })));
        warnings.push(...(parsed.errors ?? []), ...(parsed.warnings ?? []));
      } catch (error) {
        warnings.push(`${file.name}: ${String(error?.message ?? error)}`);
      }
    }
    this.app.state.benchmarkImportedArtifacts = [
      ...(this.app.state.benchmarkImportedArtifacts ?? []),
      ...imported
    ].slice(-12);
    this.app.state.benchmarkLastImportWarnings = warnings;
    this.app.toast?.(imported.length ? `Staged ${imported.length} benchmark artifact(s).` : 'No compatible benchmark artifacts were staged.', imported.length ? 'success' : 'warning');
    this.renderDebrief();
  }

  mergeCompatibleBenchmarkImports() {
    const artifacts = this.app.state.benchmarkImportedArtifacts ?? [];
    const session = this.app.state.benchmarkAttemptSession;
    const context = this.benchmarkAttemptContext(this.app.state.result);
    if (!session || !artifacts.length || !context) {
      this.app.toast?.('No compatible benchmark imports are staged.', 'warning');
      return;
    }
    const merged = mergeBenchmarkArtifactsIntoAttemptSession({
      session,
      artifacts,
      currentEpisode: this.currentBenchmarkEpisodeDescriptor(context)
    });
    this.app.state.benchmarkAttemptSession = merged.session;
    this.app.state.benchmarkLastImportWarnings = merged.warnings;
    this.app.state.benchmarkCompatibleImportCount = merged.mergedCount;
    this.app.state.benchmarkIncompatibleImportCount = merged.skippedCount;
    this.app.toast?.(merged.mergedCount ? `Merged ${merged.mergedCount} imported attempt(s).` : 'No compatible imports were merged.', merged.mergedCount ? 'success' : 'warning');
    this.renderDebrief();
  }
  buildBenchmarkRouteOverlayExport(result, context = this.benchmarkAttemptContext(result)) {
    return buildBenchmarkRouteOverlayExportFromResult({
      ...this.buildBenchmarkExportContext(result, context),
      selectedOverlayLayer: this.app.state.benchmarkRouteOverlayLayer ?? 'routeStatus'
    });
  }
  benchmarkPanelHtml(result) {
    const context = this.benchmarkAttemptContext(result);
    if (!context) return '';
    const comparisonViewModel = this.app.state.benchmarkComparisonViewModel;
    if (!comparisonViewModel) return '';
    return benchmarkDebriefPanelHtml({
      ...comparisonViewModel,
      routeReview: this.app.state.benchmarkRouteReviewViewModel,
      routeOverlay: this.app.state.benchmarkRouteOverlayViewModel,
      importViewModel: this.app.state.benchmarkImportViewModel,
      exportState: {
        runRecord: true,
        routeExecution: true,
        attemptSet: true,
        comparison: true,
        routeOverlay: true,
        attemptSession: true
      }
    });
  }
  refreshBenchmarkExecutionDebug({ result = null, context = null, runRecordExport = null, routeExecutionExport = null, attemptSession = null, attemptSetExport = null, comparisonViewModel = null, routeReviewViewModel = null, routeOverlayViewModel = null } = {}) {
    const summary = result?.summary ?? {};
    const comparison = comparisonViewModel ?? this.app?.state?.benchmarkComparisonViewModel ?? null;
    const routeReview = routeReviewViewModel ?? this.app?.state?.benchmarkRouteReviewViewModel ?? null;
    const routeOverlay = routeOverlayViewModel ?? this.app?.state?.benchmarkRouteOverlayViewModel ?? null;
    const routeGeometry = this.app?.state?.benchmarkRouteGeometry ?? null;
    const importViewModel = this.app?.state?.benchmarkImportViewModel ?? null;
    const persistedSessions = this.app?.state?.benchmarkPersistedAttemptSessions ?? [];
    const exportTypes = ['anchor.benchmark.run-record', 'anchor.benchmark.route-execution', 'anchor.benchmark.attempt-set', 'anchor.benchmark.comparison', 'anchor.benchmark.route-overlay', 'anchor.benchmark.attempt-session'];
    globalThis.ANCHOR_BENCHMARK_EXECUTION_DEBUG = {
      version: 'benchmark-execution-p5',
      episodeId: context?.episodeId ?? comparison?.episodeId ?? null,
      benchmarkMode: context?.benchmarkMode ?? comparison?.benchmarkMode ?? null,
      phase: this.app?.state?.mode ?? 'debrief',
      activeAttemptId: comparison?.attempts?.at(-1)?.attemptId ?? routeExecutionExport?.attemptId ?? null,
      activeAttemptSource: context?.activeAttemptSource ?? comparison?.attempts?.at(-1)?.attemptSource ?? null,
      routeSourceLabel: result?.planName ?? result?.source ?? context?.routeSourceLabel ?? null,
      fairnessLabel: context?.fairnessLabel ?? comparison?.fairnessLabel ?? null,
      informationAccessTier: context?.informationAccessTier ?? null,
      objectiveAuthority: context?.objectiveAuthority ?? null,
      routeAuthority: context?.routeAuthority ?? null,
      hasBenchmarkMetadata: Boolean(context),
      hasBenchmarkRunRecord: Boolean(runRecordExport?.runRecord),
      hasRouteExecutionRecord: Boolean(routeExecutionExport?.type === 'anchor.benchmark.route-execution'),
      hasAttemptSet: Boolean(attemptSession?.attempts ?? attemptSetExport?.attempts),
      hasComparisonViewModel: Boolean(comparison),
      hasRouteReviewViewModel: Boolean(routeReview),
      hasRouteOverlayViewModel: Boolean(routeOverlay),
      attemptCount: comparison?.attemptCount ?? attemptSession?.attempts?.length ?? 0,
      bestAttemptByScore: comparison?.bestAttemptByScore ?? null,
      lowestEnergyAttempt: comparison?.lowestEnergyAttempt ?? null,
      safestAttempt: comparison?.safestAttempt ?? null,
      attemptComparison: comparison ? {
        attemptCount: comparison.attemptCount,
        fairnessLabel: comparison.fairnessLabel,
        bestAttemptByScore: comparison.bestAttemptByScore,
        lowestEnergyAttempt: comparison.lowestEnergyAttempt,
        safestAttempt: comparison.safestAttempt,
        mostEfficientAttempt: comparison.mostEfficientAttempt
      } : null,
      routeReview: routeReview ? {
        routeLength: routeReview.routeLength,
        energyUsed: routeReview.energyUsed,
        hazards: routeReview.hazardEvents,
        duplicateSamples: routeReview.duplicateSampleEvents,
        missedWaypoints: routeReview.missedWaypointEvents,
        segmentCount: routeReview.segmentCount,
        warnings: routeReview.warnings
      } : null,
      routeOverlayLayer: routeOverlay?.selectedOverlayLayer ?? this.app?.state?.benchmarkRouteOverlayLayer ?? 'routeStatus',
      routeGeometryStats: routeOverlay?.stats ?? (routeGeometry ? routeGeometryStats(routeGeometry) : null),
      routeOverlayWarnings: routeOverlay?.warnings ?? [],
      selectedRouteSegment: routeOverlay?.selectedSegment ?? null,
      selectedRouteWaypoint: routeOverlay?.selectedWaypoint ?? null,
      availableRouteOverlayLayers: benchmarkRouteOverlayLayerOptions(),
      routeOverlayExportAvailable: Boolean(routeOverlay),
      multiAttemptOverlayAvailable: Boolean(routeOverlay?.attemptComparison?.multiAttemptOverlayAvailable),
      hasAttemptPersistence: true,
      attemptSessionLoaded: Boolean(this.app?.state?.benchmarkAttemptSessionLoaded),
      attemptSessionSaved: Boolean(this.app?.state?.benchmarkAttemptSessionSaved),
      persistedAttemptSessionCount: persistedSessions.length,
      currentAttemptSessionAttemptCount: attemptSession?.attempts?.length ?? this.app?.state?.benchmarkAttemptSession?.attempts?.length ?? 0,
      importedArtifactCount: importViewModel?.importedArtifactCount ?? this.app?.state?.benchmarkImportedArtifacts?.length ?? 0,
      compatibleImportCount: importViewModel?.compatibleImportCount ?? this.app?.state?.benchmarkCompatibleImportCount ?? 0,
      incompatibleImportCount: importViewModel?.incompatibleImportCount ?? this.app?.state?.benchmarkIncompatibleImportCount ?? 0,
      lastImportWarnings: this.app?.state?.benchmarkLastImportWarnings ?? importViewModel?.warnings ?? [],
      multiAttemptRouteGeometryCount: routeOverlay?.attemptComparison?.routeGeometryCount ?? 0,
      selectedOverlayAttemptId: routeOverlay?.selectedOverlayAttemptId ?? this.app?.state?.benchmarkSelectedOverlayAttemptId ?? null,
      availablePersistedEpisodes: persistedSessions.map((session) => session.episodeId).filter(Boolean),
      availableBenchmarkImportTypes: [...BENCHMARK_IMPORT_SUPPORTED_TYPES],
      benchmarkImportSummary: importViewModel ? benchmarkImportSummary(importViewModel) : null,
      benchmarkMetricDefinitions: benchmarkMetricDefinitions(),
      availableBenchmarkExports: exportTypes,
      metrics: {
        finalScore: summary.finalScore ?? null,
        sampleScore: summary.sampleScore ?? summary.realizedSampleScore ?? null,
        energyUsed: summary.energyUsed ?? null,
        hazardsHit: summary.hazardsHit ?? null,
        duplicateSamples: summary.duplicateSamples ?? null
      },
      exportTypes,
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
    root.querySelector('[data-action="export-benchmark-comparison"]')?.addEventListener('click', () => downloadJson('anchor_benchmark_comparison.json', this.buildBenchmarkComparisonExport(result)));
    root.querySelector('[data-action="export-benchmark-route-overlay"]')?.addEventListener('click', () => downloadJson('anchor_benchmark_route_overlay.json', this.buildBenchmarkRouteOverlayExport(result)));
    root.querySelectorAll('[data-action="export-benchmark-attempt-session"]').forEach((button) => button.addEventListener('click', () => downloadJson('anchor_benchmark_attempt_session.json', this.buildBenchmarkAttemptSessionExport(result))));
    root.querySelector('[data-action="export-adaptive-surfacing-decision"]')?.addEventListener('click', () => downloadJson('anchor_adaptive_surfacing_decision.json', this.buildAdaptiveSurfacingDecisionExport()));
    root.querySelector('[data-action="export-adaptive-manager-state"]')?.addEventListener('click', () => downloadJson('anchor_adaptive_manager_state.json', this.buildAdaptiveManagerStateExport()));
    root.querySelector('[data-action="export-adaptive-objective-transition"]')?.addEventListener('click', () => downloadJson('anchor_adaptive_objective_transition.json', this.buildAdaptiveObjectiveTransitionExport()));
    root.querySelector('[data-action="export-adaptive-next-leg-config"]')?.addEventListener('click', () => downloadJson('anchor_adaptive_next_leg_config.json', this.buildAdaptiveNextLegConfigExport()));
    root.querySelector('[data-action="export-adaptive-episode-trace"]')?.addEventListener('click', () => downloadJson('anchor_adaptive_episode_trace.json', this.buildAdaptiveEpisodeTraceExport()));
    root.querySelector('[data-action="export-adaptive-episode-session"]')?.addEventListener('click', () => downloadJson('anchor_adaptive_episode_session.json', this.buildAdaptiveEpisodeSessionExport()));
    root.querySelector('[data-action="export-adaptive-objective-history"]')?.addEventListener('click', () => downloadJson('anchor_adaptive_objective_history.json', this.buildAdaptiveObjectiveHistoryExport()));
    root.querySelector('[data-action="export-adaptive-leg-record"]')?.addEventListener('click', () => downloadJson('anchor_adaptive_leg_record.json', this.buildAdaptiveLegRecordExport()));
    root.querySelector('[data-action="export-adaptive-session-summary"]')?.addEventListener('click', () => downloadJson('anchor_adaptive_session_summary.json', this.buildAdaptiveSessionSummaryExport()));
    root.querySelector('[data-action="save-adaptive-session"]')?.addEventListener('click', () => this.saveAdaptiveSessionForCurrentResult());
    root.querySelector('[data-action="load-adaptive-session"]')?.addEventListener('click', () => this.loadCurrentAdaptiveSession());
    root.querySelector('[data-action="delete-adaptive-session"]')?.addEventListener('click', () => this.deleteCurrentAdaptiveSession());
    root.querySelector('[data-action="continue-adaptive-next-leg"]')?.addEventListener('click', () => this.continueAdaptiveNextLeg());
    root.querySelector('[data-action="review-adaptive-previous-leg"]')?.addEventListener('click', () => this.reviewPreviousAdaptiveLeg());
    root.querySelector('[data-action="save-benchmark-attempt-session"]')?.addEventListener('click', () => this.saveBenchmarkAttemptSessionForCurrentResult());
    root.querySelector('[data-action="delete-benchmark-attempt-session"]')?.addEventListener('click', () => this.deleteCurrentBenchmarkAttemptSession());
    root.querySelector('[data-action="merge-compatible-benchmark-imports"]')?.addEventListener('click', () => this.mergeCompatibleBenchmarkImports());
    root.querySelector('[data-benchmark-import-file]')?.addEventListener('change', (event) => this.importBenchmarkArtifactFiles(event.target.files));
    root.querySelectorAll('[data-benchmark-load-session]').forEach((button) => button.addEventListener('click', () => this.loadPersistedBenchmarkAttemptSession(button.dataset.benchmarkLoadSession)));
    root.querySelectorAll('[data-benchmark-overlay-attempt]').forEach((button) => button.addEventListener('click', () => this.updateBenchmarkRouteOverlay({ result, selectedOverlayAttemptId: button.dataset.benchmarkOverlayAttempt })));
    root.querySelector('[data-benchmark-route-layer]')?.addEventListener('change', (event) => this.updateBenchmarkRouteOverlay({ result, selectedOverlayLayer: event.target.value }));
    root.querySelectorAll('[data-benchmark-route-segment]').forEach((button) => button.addEventListener('click', () => this.updateBenchmarkRouteOverlay({ result, selectedSegmentIndex: Number(button.dataset.benchmarkRouteSegment) })));
    root.querySelectorAll('[data-benchmark-route-waypoint]').forEach((button) => button.addEventListener('click', () => this.updateBenchmarkRouteOverlay({ result, selectedWaypointIndex: Number(button.dataset.benchmarkRouteWaypoint) })));
    root.querySelector('[data-action="next-scenario"]')?.addEventListener('click', () => this.leaveDebrief(() => this.getScenarioNextAction()?.onClick?.()));
  }

  updateBenchmarkRouteOverlay({ result = this.app.state.result, selectedOverlayLayer = null, selectedSegmentIndex = null, selectedWaypointIndex = null, selectedOverlayAttemptId = null } = {}) {
    if (selectedOverlayLayer != null) this.app.state.benchmarkRouteOverlayLayer = selectedOverlayLayer;
    if (selectedSegmentIndex != null && Number.isFinite(Number(selectedSegmentIndex))) this.app.state.benchmarkSelectedRouteSegmentIndex = Number(selectedSegmentIndex);
    if (selectedWaypointIndex != null && Number.isFinite(Number(selectedWaypointIndex))) this.app.state.benchmarkSelectedRouteWaypointIndex = Number(selectedWaypointIndex);
    if (selectedOverlayAttemptId != null) this.app.state.benchmarkSelectedOverlayAttemptId = String(selectedOverlayAttemptId);
    this.renderDebrief();
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
      'export-benchmark-comparison': () => downloadJson('anchor_benchmark_comparison.json', this.buildBenchmarkComparisonExport(result)),
      'export-benchmark-route-overlay': () => downloadJson('anchor_benchmark_route_overlay.json', this.buildBenchmarkRouteOverlayExport(result)),
      'export-benchmark-attempt-session': () => downloadJson('anchor_benchmark_attempt_session.json', this.buildBenchmarkAttemptSessionExport(result)),
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
