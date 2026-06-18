import { benchmarkImportPanelHtml } from './BenchmarkImportPanel.js';
import { benchmarkRouteOverlayPanelHtml } from './BenchmarkRouteOverlayPanel.js';

export function benchmarkDebriefPanelHtml(viewModel = {}) {
  if (!viewModel || viewModel.attemptCount == null) return '';
  const routeReview = viewModel.routeReview ?? null;
  const routeOverlay = viewModel.routeOverlay ?? null;
  const exportState = viewModel.exportState ?? {};
  return `
    <article class="debrief-panel planner-benchmark-panel" data-benchmark-debrief-panel>
      <h2>Planner Benchmark</h2>
      <p>Planner Benchmark compares attempts under a fixed objective. The route was executed by the existing simulator and scored by the existing debrief system.</p>
      <p>Comparison metrics are normalized from existing results. P5 does not add a new planner or redesign scoring.</p>
      <p>Fairness labels describe what information the attempt was allowed to use.</p>
      <div class="cell-inspector-metrics">
        ${benchmarkMetricCardHtml({ label: 'Benchmark Mode', value: viewModel.benchmarkMode ?? 'plannerBenchmark' })}
        ${benchmarkMetricCardHtml({ label: 'Episode', value: viewModel.episodeId ?? 'No episode id' })}
        ${benchmarkMetricCardHtml({ label: 'Attempts', value: viewModel.attemptCount ?? 0 })}
        ${benchmarkMetricCardHtml({ label: 'Fairness', value: benchmarkFairnessBadgeHtml(viewModel.fairnessLabel ?? 'No fairness label'), htmlValue: true })}
      </div>
      <div class="hud-muted">uses existing simulator/debrief | no new planner | SCORE-R1 shadow score does not replace official scoring | no MARL/RL</div>
      ${benchmarkMissionOutcomeComparisonHtml(viewModel)}
      ${benchmarkAttemptComparisonHtml(viewModel)}
      ${routeReview ? benchmarkRouteReviewHtml(routeReview) : ''}
      ${routeOverlay ? benchmarkRouteOverlayPanelHtml(routeOverlay) : ''}
      ${viewModel.importViewModel ? benchmarkImportPanelHtml(viewModel.importViewModel) : ''}
      ${benchmarkExportPanelHtml(exportState)}
    </article>
  `;
}

export function benchmarkAttemptComparisonHtml(viewModel = {}) {
  const attempts = Array.isArray(viewModel.attempts) ? viewModel.attempts : [];
  const highlights = [
    ['Best score', viewModel.bestAttemptByScore],
    ['Lowest energy', viewModel.lowestEnergyAttempt],
    ['Safest route', viewModel.safestAttempt],
    ['Most efficient', viewModel.mostEfficientAttempt]
  ];
  return `
    <section class="benchmark-debrief-subsection" data-benchmark-attempt-comparison>
      <h3>Attempt Comparison</h3>
      <div class="cell-inspector-metrics">
        ${highlights.map(([label, winner]) => benchmarkMetricCardHtml({
          label,
          value: winner ? `${winner.routeSourceLabel ?? winner.attemptSourceLabel ?? 'Attempt'} (${winner.displayValue ?? winner.value})` : 'Not available'
        })).join('')}
      </div>
      ${attempts.length ? `
        <div class="debrief-table-wrap">
          <table class="debrief-table">
            <thead><tr><th>Attempt</th><th>Fairness</th><th>Score</th><th>Energy</th><th>Hazards</th><th>Missed</th><th>Duplicates</th></tr></thead>
            <tbody>
              ${attempts.map((attempt) => `
                <tr>
                  <td>${escapeHtml(attempt.routeSourceLabel ?? attempt.attemptSourceLabel ?? 'Benchmark Attempt')}</td>
                  <td>${benchmarkFairnessBadgeHtml(attempt.fairnessLabel)}</td>
                  <td>${escapeHtml(formatValue(attempt.metrics?.finalScore))}</td>
                  <td>${escapeHtml(formatValue(attempt.metrics?.energyUsed))}</td>
                  <td>${escapeHtml(formatValue(attempt.metrics?.hazardsHit))}</td>
                  <td>${escapeHtml(formatValue(attempt.metrics?.missedWaypoints))}</td>
                  <td>${escapeHtml(formatValue(attempt.metrics?.duplicateSamples))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="hud-muted">No benchmark attempts are available yet.</p>'}
      ${warningsHtml(viewModel.warnings)}
    </section>
  `;
}

export function benchmarkMissionOutcomeComparisonHtml(viewModel = {}) {
  const attempts = (Array.isArray(viewModel.attempts) ? viewModel.attempts : []).filter((attempt) => attempt.missionOutcome);
  if (!attempts.length) return '';
  const comparison = viewModel.missionOutcomeComparison ?? {};
  return `
    <section class="benchmark-debrief-subsection" data-benchmark-mission-outcome-comparison>
      <h3>SCORE-R1 Shadow Outcome</h3>
      <p>This is an additional objective-aware benchmark dimension. It does not replace existing benchmark ranking or official browser scoring.</p>
      ${comparison.compatible === false ? '<div class="hud-muted warning">Profiles or versions differ; these shadow scores are not fair peers.</div>' : ''}
      <div class="debrief-table-wrap">
        <table class="debrief-table">
          <thead><tr><th>Attempt</th><th>Profile</th><th>Composite</th><th>Science</th><th>Feasibility</th><th>Efficiency</th><th>Safety</th><th>Coverage</th></tr></thead>
          <tbody>
            ${attempts.map((attempt) => `
              <tr>
                <td>${escapeHtml(attempt.routeSourceLabel ?? attempt.attemptSourceLabel ?? 'Benchmark Attempt')}</td>
                <td>${escapeHtml(attempt.missionOutcome?.profileKey ?? 'unknown')}</td>
                <td>${escapeHtml(formatValue(attempt.missionOutcome?.compositeScore))}</td>
                <td>${escapeHtml(formatValue(attempt.missionOutcome?.scienceScore))}</td>
                <td>${escapeHtml(formatValue(attempt.missionOutcome?.feasibilityScore))}</td>
                <td>${escapeHtml(formatValue(attempt.missionOutcome?.efficiencyScore))}</td>
                <td>${escapeHtml(formatValue(attempt.missionOutcome?.safetyScore))}</td>
                <td>${escapeHtml(formatPercent(attempt.missionOutcome?.coverageFraction))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export function benchmarkRouteReviewHtml(routeReviewViewModel = {}) {
  const segments = Array.isArray(routeReviewViewModel.segmentCards) ? routeReviewViewModel.segmentCards : [];
  return `
    <section class="benchmark-debrief-subsection" data-benchmark-route-review>
      <h3>Route Review</h3>
      <p>Route review explains what happened during execution; it is not an optimization algorithm.</p>
      <div class="cell-inspector-metrics">
        ${benchmarkMetricCardHtml({ label: 'Route Length', value: formatValue(routeReviewViewModel.routeLength) })}
        ${benchmarkMetricCardHtml({ label: 'Energy', value: formatValue(routeReviewViewModel.energyUsed) })}
        ${benchmarkMetricCardHtml({ label: 'Hazards', value: routeReviewViewModel.hazardEvents ?? 0 })}
        ${benchmarkMetricCardHtml({ label: 'Duplicate Samples', value: routeReviewViewModel.duplicateSampleEvents ?? 0 })}
        ${benchmarkMetricCardHtml({ label: 'Missed Waypoints', value: routeReviewViewModel.missedWaypointEvents ?? 0 })}
      </div>
      ${segments.length ? `
        <div class="debrief-table-wrap">
          <table class="debrief-table">
            <thead><tr><th>Segment</th><th>From</th><th>To</th><th>Distance</th><th>Energy</th><th>Assist</th><th>Cross</th><th>Status</th></tr></thead>
            <tbody>
              ${segments.slice(0, 8).map((segment) => `
                <tr>
                  <td>${escapeHtml(segment.segmentIndex ?? '')}</td>
                  <td>${escapeHtml(pointLabel(segment.from))}</td>
                  <td>${escapeHtml(pointLabel(segment.to))}</td>
                  <td>${escapeHtml(formatValue(segment.distance))}</td>
                  <td>${escapeHtml(formatValue(segment.energyCost))}</td>
                  <td>${escapeHtml(formatValue(segment.currentAssist))}</td>
                  <td>${escapeHtml(formatValue(segment.crossCurrent))}</td>
                  <td>${escapeHtml(segment.status ?? 'partial')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="hud-muted">Segment-level review is partial because detailed segment data is not available.</p>'}
      ${segments.length > 8 ? `<p class="hud-muted">Showing first 8 of ${escapeHtml(segments.length)} segments.</p>` : ''}
      ${warningsHtml(routeReviewViewModel.warnings)}
    </section>
  `;
}

export function benchmarkExportPanelHtml(exportState = {}) {
  const comparison = exportState.comparison !== false;
  const routeOverlay = exportState.routeOverlay !== false;
  const attemptSession = exportState.attemptSession !== false;
  return `
    <section class="benchmark-debrief-subsection" data-benchmark-export-panel>
      <h3>Benchmark Exports</h3>
      <div class="debrief-actions inline-actions">
        <button class="debrief-button" data-action="export-benchmark-run">Export Benchmark Run Record</button>
        <button class="debrief-button" data-action="export-benchmark-route">Export Route Execution Record</button>
        <button class="debrief-button" data-action="export-benchmark-attempt-set">Export Benchmark Attempt Set</button>
        ${comparison ? '<button class="debrief-button" data-action="export-benchmark-comparison">Export Benchmark Comparison</button>' : ''}
        ${routeOverlay ? '<button class="debrief-button" data-action="export-benchmark-route-overlay">Export Route Overlay</button>' : ''}
        ${attemptSession ? '<button class="debrief-button" data-action="export-benchmark-attempt-session">Export Attempt Session</button>' : ''}
      </div>
      <p class="hud-muted">Available benchmark exports: run record, route execution, attempt set${comparison ? ', comparison' : ''}${routeOverlay ? ', route overlay' : ''}${attemptSession ? ', attempt session' : ''}.</p>
    </section>
  `;
}

export function benchmarkFairnessBadgeHtml(label = '') {
  return `<span class="benchmark-fairness-badge">${escapeHtml(studentFairnessLabel(label))}</span>`;
}

export function benchmarkMetricCardHtml(metric = {}) {
  const value = metric.htmlValue ? String(metric.value ?? '') : escapeHtml(metric.value ?? 'N/A');
  return `<div><span>${escapeHtml(metric.label ?? 'Metric')}</span><strong>${value}</strong></div>`;
}

function warningsHtml(warnings = []) {
  const items = Array.isArray(warnings) ? warnings.filter(Boolean) : [];
  if (!items.length) return '';
  return `<div class="hud-muted warning">${escapeHtml(items.join(' '))}</div>`;
}

function pointLabel(point) {
  if (!point || point.x == null || point.y == null) return 'N/A';
  return `${point.x},${point.y}`;
}

function formatValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return Math.abs(number) >= 100 ? String(Math.round(number)) : String(Math.round(number * 1000) / 1000);
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : 'N/A';
}

function studentFairnessLabel(label) {
  const text = String(label ?? '').trim();
  return ({
    oracleTruth: 'Oracle / Truth-Assisted',
    'Oracle truth': 'Oracle / Truth-Assisted',
    'Oracle Truth': 'Oracle / Truth-Assisted',
    'Truth-assisted': 'Oracle / Truth-Assisted',
    'Truth-Assisted': 'Oracle / Truth-Assisted',
    forecastOnly: 'Forecast-Only',
    'Forecast-only': 'Forecast-Only',
    'Forecast-Only': 'Forecast-Only',
    beliefOnly: 'Belief-Only',
    'Belief-only': 'Belief-Only',
    'Belief-Only': 'Belief-Only',
    debugAll: 'Debug / All Layers',
    'Debug / All Layers': 'Debug / All Layers'
  }[text] ?? text) || 'No fairness label';
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