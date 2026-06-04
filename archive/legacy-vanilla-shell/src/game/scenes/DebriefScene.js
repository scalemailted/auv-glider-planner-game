import { downloadJSON, downloadText } from '../../core/io/ImportExport.js';
import { buildMarkdownAAR } from '../../core/io/ReportExporter.js';
import { compareResults } from '../../core/evaluation/RunComparator.js';
import { formatRegretMetric } from '../../core/evaluation/RegretMetrics.js';
import { evaluateObjectives, summarizePerformance } from '../../core/campaign/LevelObjectives.js';
import { computeRating, ratingLabel } from '../../core/campaign/RatingSystem.js';
import { recordLevelResult, saveCampaignProgress } from '../../core/campaign/CampaignProgress.js';
import { shortInstanceId } from '../../core/identity/GameInstanceId.js';

export class DebriefScene {
  label = 'Debrief';

  constructor(app) {
    this.app = app;
  }

  enter() {
    const result = this.app.state.result;
    const s = result?.summary ?? {};
    const comparison = compareResults(this.app.state.manualResult, this.app.state.solverResult);
    const objectiveResults = evaluateObjectives(s, this.app.state.level, this.app.state.mission);
    const performance = summarizePerformance({ ...s, regret: result?.regret }, objectiveResults, this.app.state.level);
    const rating = computeRating(s, this.app.state.level, this.app.state.mission);
    if (result) {
      result.rating = rating;
      result.objectives = objectiveResults;
      result.performance = performance;
    }
    this.app.state.progress = recordLevelResult(this.app.state.progress, this.app.state.level, this.app.state.mission, result);
    saveCampaignProgress(this.app.state.progress);

    this.app.setPanel(`
      <h2>Mission Debrief</h2>
      <p class="small">Run source: ${result?.source ?? 'unknown'} | Challenge mode: ${result?.challengeMode ?? 'unknown'} | Instance ${shortInstanceId(result?.instanceId ?? this.app.state.level?.instanceId)}</p>
      <div class="rating-badge ${rating}">${ratingLabel(rating)}</div>
      <div class="metric-grid">
        <div class="metric"><strong>Final</strong><br>${s.finalScore ?? 0}</div>
        <div class="metric"><strong>Sample</strong><br>${s.sampleScore ?? 0}</div>
        <div class="metric"><strong>Energy</strong><br>${s.energyUsed?.toFixed?.(2) ?? 0}</div>
        <div class="metric"><strong>Hazards</strong><br>${s.hazardsHit ?? 0}</div>
        <div class="metric"><strong>Duplicates</strong><br>${s.duplicateSamples ?? 0}</div>
        <div class="metric"><strong>Completed WPs</strong><br>${s.completedWaypoints ?? 0}</div>
        <div class="metric"><strong>Missed WPs</strong><br>${s.missedWaypoints ?? 0}</div>
        <div class="metric"><strong>Replans</strong><br>${s.replans ?? 0}</div>
        <div class="metric"><strong>Elapsed</strong><br>${s.elapsedTime ?? 0}s</div>
      </div>
      <h3>Objectives</h3>
      <div class="objective-list">
        ${objectiveResults.map((objective) => `
          <div class="objective-row ${objective.complete ? 'complete' : 'failed'}">
            <strong>${objective.complete ? 'Done' : 'Missed'}</strong>
            <span>${objective.label} (${objective.metric}: ${objective.actual ?? 'N/A'} ${objective.operator} ${objective.value})</span>
          </div>
        `).join('')}
      </div>
      <h3>Performance Notes</h3>
      <p class="small">${performance.whatWentWell}</p>
      ${performance.whatFailed.length ? `<p class="small">Needs work: ${performance.whatFailed.join(', ')}</p>` : ''}
      <ul class="small">${performance.suggestions.map((item) => `<li>${item}</li>`).join('')}</ul>
      <h3>Score Components</h3>
      <div class="score-components small">
        <div>Weighted sample score: ${s.weightedSampleScore ?? 0}</div>
        <div>Energy penalty: ${s.energyPenalty ?? 0}</div>
        <div>Hazard penalty: ${s.hazardPenalty ?? 0}</div>
        <div>Elapsed penalty: ${s.elapsedTimePenalty ?? 0}</div>
        <div>Update penalty: ${s.updatePenalty ?? 0}</div>
        <div>Missed waypoint penalty: ${s.missedWaypointPenalty ?? 0}</div>
      </div>
      <h3>Event Summary</h3>
      <div class="small">${formatEventSummary(result?.events ?? [])}</div>
      ${result?.regret ? `
        <h3>Forecast Regret</h3>
        <div class="metric-grid">
          <div class="metric"><strong>Reference</strong><br>${result.regret.reference}</div>
          <div class="metric"><strong>Reference Score</strong><br>${formatRegretMetric(result.regret.referenceScore)}</div>
          <div class="metric"><strong>Regret</strong><br>${formatRegretMetric(result.regret.forecastRegret)}</div>
          <div class="metric"><strong>Ratio</strong><br>${formatRegretMetric(result.regret.regretRatio)}</div>
        </div>
      ` : '<p class="small">Forecast regret is available after completing a forecast-mode simulation.</p>'}
      ${comparison ? `
        <h3>Manual vs Solver</h3>
        <div class="metric-grid">
          <div class="metric"><strong>Manual</strong><br>${comparison.manualFinalScore}</div>
          <div class="metric"><strong>Solver</strong><br>${comparison.solverFinalScore}</div>
          <div class="metric"><strong>Score Delta</strong><br>${comparison.finalDelta}</div>
          <div class="metric"><strong>Winner</strong><br>${comparison.winner}</div>
        </div>
        <div class="score-components small">
          <div>Sample delta: ${comparison.sampleDelta}</div>
          <div>Energy delta: ${comparison.energyDelta}</div>
          <div>Hazard delta: ${comparison.hazardDelta}</div>
        </div>
      ` : '<p class="small">Run both a manual plan and an imported solver plan to compare results.</p>'}
      <div class="panel-stack">
        <button id="btn-export-result">Export Result JSON</button>
        <button id="btn-export-aar">Export AAR Markdown</button>
        <button id="btn-back-planning">Revise Plan</button>
        <button id="btn-main-menu">Return to Main Menu</button>
      </div>
    `);

    document.getElementById('btn-export-result').onclick = () => downloadJSON('anchor_result.json', result);
    document.getElementById('btn-export-aar').onclick = () => downloadText(
      'anchor_after_action_report.md',
      buildMarkdownAAR({
        level: this.app.state.level,
        mission: this.app.state.mission,
        plan: this.app.state.plan,
        result
      }),
      'text/markdown'
    );
    document.getElementById('btn-back-planning').onclick = () => this.app.goTo('planning');
    document.getElementById('btn-main-menu').onclick = () => this.app.goTo('mainMenu');
  }

  render(renderer) {
    renderer.drawDebrief(this.app.state.result);
  }
}

function formatEventSummary(events) {
  const counts = events.reduce((summary, event) => {
    summary[event.type] = (summary[event.type] ?? 0) + 1;
    return summary;
  }, {});
  const entries = Object.entries(counts);
  if (entries.length === 0) return 'No events recorded.';
  return entries.map(([type, count]) => `${type}: ${count}`).join(', ');
}
