export function adaptiveBenchmarkPanelHtml(viewModel = {}) {
  return `
    <div class="adaptive-benchmark-panel" data-adaptive-benchmark-panel>
      <div class="hud-muted">Adaptive Benchmark gives objective authority to a transparent mission manager. The player or solver still chooses the route.</div>
      <div class="hud-muted">The mission manager uses observations, uncertainty, forecast error, hidden-event suspicion, staleness, and mission state to recommend the next objective.</div>
      <div class="cell-inspector-metrics">
        <div><span>Current Objective</span><strong>${escapeHtml(viewModel.currentObjective?.label ?? 'Unknown')}</strong></div>
        <div><span>Diagnosis</span><strong>${escapeHtml(viewModel.diagnosis?.label ?? 'Unknown')}</strong></div>
        <div><span>Recommended Objective</span><strong>${escapeHtml(viewModel.recommendedObjective?.label ?? 'Unknown')}</strong></div>
        <div><span>Confidence</span><strong>${escapeHtml(formatPercent(viewModel.diagnosis?.confidence))}</strong></div>
        <div><span>Objective Authority</span><strong>${escapeHtml(viewModel.boundaryFlags?.objectiveAuthority ?? 'missionManager')}</strong></div>
        <div><span>Route Authority</span><strong>${escapeHtml(viewModel.boundaryFlags?.routeAuthority ?? 'playerOrSolver')}</strong></div>
      </div>
      ${adaptiveObjectiveTransitionHtml(viewModel)}
      ${adaptiveDiagnosisCardsHtml(viewModel)}
      ${adaptiveEvidenceSummaryHtml(viewModel)}
      <section class="mini-panel">
        <h3>Rationale</h3>
        <div class="hud-muted">${escapeHtml(viewModel.explanation ?? 'No rationale available.')}</div>
        ${warningsHtml(viewModel.warnings)}
      </section>
      <section class="mini-panel">
        <h3>Objective History</h3>
        ${objectiveHistoryHtml(viewModel.objectiveHistory)}
      </section>
      ${adaptiveBenchmarkBoundaryHtml(viewModel)}
    </div>
  `;
}

export function adaptiveDiagnosisCardsHtml(viewModel = {}) {
  const scores = Array.isArray(viewModel.scoreCards) ? viewModel.scoreCards : [];
  return `
    <section class="mini-panel" data-adaptive-diagnosis>
      <h3>Diagnosis</h3>
      <div class="hud-muted"><strong>${escapeHtml(viewModel.diagnosis?.label ?? 'Diagnosis unavailable')}</strong>: ${escapeHtml(viewModel.diagnosis?.recommendedResponse ?? 'No response available.')}</div>
      <div class="panel-stack">
        ${scores.slice(0, 5).map((card) => `
          <div class="hud-muted"><strong>${escapeHtml(card.label)}</strong>: ${escapeHtml(card.formattedValue)} - ${escapeHtml(card.description)}</div>
        `).join('')}
      </div>
    </section>
  `;
}

export function adaptiveObjectiveTransitionHtml(viewModel = {}) {
  const transition = viewModel.objectiveTransition ?? {};
  return `
    <section class="mini-panel" data-adaptive-transition>
      <h3>Objective Transition</h3>
      <div class="hud-muted">${escapeHtml(transition.transitionId ?? 'keepCurrentObjective')}: ${escapeHtml(transition.fromObjectiveLabel ?? 'Unknown')} -> ${escapeHtml(transition.toObjectiveLabel ?? 'Unknown')}</div>
      <div class="hud-muted">Mission Manager chooses the objective; player or solver chooses the route.</div>
    </section>
  `;
}

export function adaptiveEvidenceSummaryHtml(viewModel = {}) {
  const cards = Array.isArray(viewModel.evidenceCards) ? viewModel.evidenceCards : [];
  return `
    <section class="mini-panel" data-adaptive-evidence>
      <h3>Evidence Summary</h3>
      <div class="panel-stack">
        ${cards.map((card) => `<div class="hud-muted"><strong>${escapeHtml(card.label)}</strong>: ${escapeHtml(card.value)} - ${escapeHtml(card.description)}</div>`).join('')}
      </div>
    </section>
  `;
}

export function adaptiveBenchmarkBoundaryHtml(viewModel = {}) {
  const implemented = Array.isArray(viewModel.implementedNow) ? viewModel.implementedNow : [];
  const notImplemented = Array.isArray(viewModel.notImplemented) ? viewModel.notImplemented : [];
  return `
    <section class="mini-panel" data-adaptive-boundary>
      <h3>What is implemented now</h3>
      <ul>${implemented.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <h3>What is not implemented yet</h3>
      <ul>${notImplemented.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <div class="hud-muted">P6 does not implement full route execution for adaptive missions, new route planning, scoring redesign, or MARL/RL.</div>
    </section>
  `;
}

function objectiveHistoryHtml(history = []) {
  if (!Array.isArray(history) || !history.length) return '<div class="hud-muted">No objective history yet.</div>';
  return `
    <div class="panel-stack">
      ${history.slice(-5).map((entry) => `<div class="hud-muted"><strong>${escapeHtml(entry.objectiveLabel ?? entry.objectiveId)}</strong>: ${escapeHtml(entry.transitionId ?? 'objective')} at t=${escapeHtml(entry.time ?? 0)}</div>`).join('')}
    </div>
  `;
}

function warningsHtml(warnings = []) {
  if (!Array.isArray(warnings) || !warnings.length) return '';
  return `<div class="hud-muted warning">${warnings.map((warning) => escapeHtml(warning)).join(' ')}</div>`;
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : 'n/a';
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
