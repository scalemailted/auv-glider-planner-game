export function missionScorecardPanelHtml(viewModel = {}) {
  if (!viewModel?.present) return '';
  const regret = viewModel.regretSummary ?? {};
  return `
    <section class="console-section mission-scorecard-panel" data-mission-outcome-scorecard>
      <h2>Mission Outcome Scorecard</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Composite Outcome Score', formatNumber(viewModel.compositeScore))}
        ${metricHtml('Science', formatNumber(viewModel.scienceScore))}
        ${metricHtml('Feasibility', formatNumber(viewModel.feasibilityScore))}
        ${metricHtml('Efficiency', formatNumber(viewModel.efficiencyScore))}
        ${metricHtml('Safety', formatNumber(viewModel.safetyScore))}
        ${viewModel.missionManagementScore !== null ? metricHtml('Mission Management', formatNumber(viewModel.missionManagementScore)) : ''}
        ${viewModel.fleetCoordinationScore !== null ? metricHtml('Fleet Coordination', formatNumber(viewModel.fleetCoordinationScore)) : ''}
        ${metricHtml('Data Coverage', percent(viewModel.coverageFraction))}
        ${metricHtml('Missing Metrics', viewModel.missingMetricCount ?? 0)}
        ${metricHtml('Score Profile', `${viewModel.scoreProfileId ?? 'unknown'} ${viewModel.scoreProfileVersion ?? ''}`)}
        ${metricHtml('Visibility Tier', viewModel.visibilityTier ?? 'unknown')}
      </div>
      <h3>Interpretation</h3>
      <div class="hud-muted"><strong>Strongest Outcome:</strong> ${escapeHtml(viewModel.strongestOutcome ?? 'N/A')}</div>
      <div class="hud-muted"><strong>Largest Opportunity:</strong> ${escapeHtml(viewModel.largestOpportunity ?? 'N/A')}</div>
      <h3>Regret</h3>
      ${viewModel.regretAvailable ? `
        <div class="cell-inspector-metrics">
          ${metricHtml('Reference', regret.referenceType ?? 'unknown')}
          ${metricHtml('Total Regret', formatNumber(regret.totalRegret))}
          ${metricHtml('Compatibility', regret.compatibilityStatus ?? 'unknown')}
        </div>
      ` : '<div class="hud-muted">No compatible regret reference was available.</div>'}
      <div class="hud-muted">This is the SCORE-R1 shadow benchmark score. It does not replace the current official browser score.</div>
      <div class="hud-muted">This is a shadow benchmark evaluation, not the current official browser score.</div>
      <div class="hud-muted">Scores are objective-aware and versioned.</div>
      <div class="hud-muted">Scores are interpreted using the selected mission objective and score profile.</div>
      <div class="hud-muted">Missing metrics are reported explicitly; they are not silently treated as zero.</div>
      <div class="hud-muted">Regret compares only compatible attempts or an explicitly labelled reference.</div>
      <div class="hud-muted">Regret does not imply mathematical optimality unless an explicit proven bound exists.</div>
    </section>
  `;
}

function metricHtml(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 'N/A')}</strong></div>`;
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(Math.abs(number) >= 10 ? 2 : 3) : 'N/A';
}

function percent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : 'N/A';
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
