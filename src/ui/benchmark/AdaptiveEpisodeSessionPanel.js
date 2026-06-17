export function adaptiveEpisodeSessionPanelHtml(viewModel = {}) {
  return `
    <article class="debrief-panel adaptive-episode-session-panel" data-adaptive-session-panel>
      <h2>Adaptive Episode Session</h2>
      <p>Adaptive Episode Session stores the sequence of legs, surfacing decisions, and objective changes.</p>
      <p>Adaptive Benchmark stores objective changes across surfacing events. The mission manager recommends objectives; the player or solver still plans each route.</p>
      <p>P8 does not generate routes automatically and does not redesign scoring.</p>
      <p>Objective history records mission-manager decisions. These decisions choose objectives, not routes.</p>
      <p>Route planning remains with the player or solver.</p>
      <div class="cell-inspector-metrics">
        <div><span>Episode ID</span><strong>${escapeHtml(viewModel.episodeId ?? 'unknown')}</strong></div>
        <div><span>Policy</span><strong>${escapeHtml(viewModel.policyId ?? 'unknown')}</strong></div>
        <div><span>Current Leg</span><strong>${escapeHtml(viewModel.currentLegIndex ?? 0)}</strong></div>
        <div><span>Current Objective</span><strong>${escapeHtml(viewModel.currentObjective?.label ?? viewModel.currentObjective?.id ?? 'unknown')}</strong></div>
      </div>
      ${adaptiveObjectiveTimelineHtml(viewModel)}
      ${adaptiveLegCardsHtml(viewModel)}
      ${adaptiveEvidenceDiagnosisHtml(viewModel)}
      ${adaptiveSessionControlsHtml(viewModel)}
      ${adaptiveSessionExportPanelHtml(viewModel)}
      ${adaptiveSessionBoundaryHtml(viewModel)}
      ${warningsHtml(viewModel.warnings)}
    </article>
  `;
}

export function adaptiveObjectiveTimelineHtml(viewModel = {}) {
  const timeline = Array.isArray(viewModel.objectiveTimeline) ? viewModel.objectiveTimeline : [];
  return `
    <section data-adaptive-objective-history>
      <h3>Objective History</h3>
      ${timeline.length ? `
        <div class="panel-stack">
          ${timeline.slice(-8).map((entry) => `
            <div class="hud-muted">
              <strong>Leg ${escapeHtml(entry.legIndex)}:</strong>
              ${escapeHtml(entry.fromObjectiveLabel ?? entry.fromObjectiveId ?? 'Start')} -&gt; ${escapeHtml(entry.toObjectiveLabel ?? entry.toObjectiveId ?? 'Objective')}
              ${entry.confidence == null ? '' : ` | confidence ${escapeHtml(formatPercent(entry.confidence))}`}
              <br />${escapeHtml(entry.primaryScienceDiagnosis ? `science ${entry.primaryScienceDiagnosis}` : 'No science-diagnosis context was stored for this leg.')}
              ${entry.forecastCorrectionStatus ? ` | forecast ${escapeHtml(entry.forecastCorrectionStatus)}` : ''}
              ${entry.hiddenEventStatus ? ` | hidden ${escapeHtml(entry.hiddenEventStatus)}` : ''}
              <br />${escapeHtml(entry.rationale ?? entry.status ?? '')}
            </div>
          `).join('')}
        </div>
      ` : '<div class="hud-muted">No objective history is stored yet.</div>'}
      ${whyObjectiveChangedHtml(viewModel.whyObjectiveChangedCard)}
    </section>
  `;
}

export function adaptiveLegCardsHtml(viewModel = {}) {
  const legCards = Array.isArray(viewModel.legCards) ? viewModel.legCards : [];
  const decisions = Array.isArray(viewModel.surfacingDecisionCards) ? viewModel.surfacingDecisionCards : [];
  return `
    <section data-adaptive-leg-cards>
      <h3>Leg Cards</h3>
      ${legCards.length ? `
        <div class="panel-stack">
          ${legCards.slice(-6).map((card) => `
            <div class="hud-muted"><strong>${escapeHtml(card.title)}</strong>: ${escapeHtml(card.value)}<br />${escapeHtml(card.detail)}</div>
          `).join('')}
        </div>
      ` : '<div class="hud-muted">No adaptive leg records are stored yet.</div>'}
      <h3>Surfacing Decisions</h3>
      ${decisions.length ? `
        <div class="panel-stack">
          ${decisions.slice(-6).map((card) => `
            <div class="hud-muted"><strong>${escapeHtml(card.title)}</strong>: ${escapeHtml(card.value)}<br />${escapeHtml(card.detail)}${card.confidence == null ? '' : ` | ${escapeHtml(formatPercent(card.confidence))}`}</div>
          `).join('')}
        </div>
      ` : '<div class="hud-muted">No surfacing decisions are stored yet.</div>'}
    </section>
  `;
}

export function adaptiveSessionControlsHtml(viewModel = {}) {
  const hasNext = Boolean(viewModel.sessionSummary?.nextLegHandoffCount || viewModel.nextLegAvailable);
  return `
    <section data-adaptive-session-controls>
      <h3>Session Controls</h3>
      <p>Continue to Next Leg carries the recommended objective forward. It does not generate waypoints or routes.</p>
      <p>The player or solver still plans the route for each leg.</p>
      <div class="debrief-button-row">
        <button class="debrief-button" data-action="save-adaptive-session">Save Adaptive Session</button>
        <button class="debrief-button secondary" data-action="load-adaptive-session">Load Saved Adaptive Session</button>
        <button class="debrief-button secondary" data-action="delete-adaptive-session">Delete Saved Adaptive Session</button>
        <button class="debrief-button primary" data-action="continue-adaptive-next-leg" ${hasNext ? '' : 'disabled'}>Continue to Next Leg</button>
        <button class="debrief-button secondary" data-action="review-adaptive-previous-leg">Review Previous Leg</button>
      </div>
    </section>
  `;
}

export function adaptiveSessionExportPanelHtml() {
  return `
    <section data-adaptive-session-exports>
      <h3>Exports</h3>
      <div class="debrief-button-row">
        <button class="debrief-button" data-action="export-adaptive-episode-session">Export Adaptive Episode Session</button>
        <button class="debrief-button" data-action="export-adaptive-objective-history">Export Objective History</button>
        <button class="debrief-button secondary" data-action="export-adaptive-leg-record">Export Current Leg Record</button>
        <button class="debrief-button secondary" data-action="export-adaptive-session-summary">Export Adaptive Session Summary</button>
      </div>
    </section>
  `;
}

export function adaptiveSessionBoundaryHtml(viewModel = {}) {
  const notImplemented = Array.isArray(viewModel.notImplemented) ? viewModel.notImplemented : [];
  return `
    <section data-adaptive-session-boundary>
      <h3>Boundary</h3>
      <p>P8/P10 do not add a new planner, scoring redesign, full autonomy, production data assimilation, or MARL/RL.</p>
      <p>Science diagnosis informs the mission-manager recommendation. It does not generate a route.</p>
      <ul>${notImplemented.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </section>
  `;
}

function adaptiveEvidenceDiagnosisHtml(viewModel = {}) {
  const evidenceCards = Array.isArray(viewModel.evidenceCards) ? viewModel.evidenceCards : [];
  const diagnosisCards = Array.isArray(viewModel.diagnosisCards) ? viewModel.diagnosisCards : [];
  const scienceCards = Array.isArray(viewModel.scienceDiagnosisCards) ? viewModel.scienceDiagnosisCards : [];
  return `
    <section data-adaptive-evidence-diagnosis-history>
      <h3>Evidence / Diagnosis History</h3>
      ${evidenceCards.length || diagnosisCards.length || scienceCards.length ? `
        <div class="panel-stack">
          ${evidenceCards.slice(-4).map((card) => `<div class="hud-muted"><strong>${escapeHtml(card.title)}</strong>: ${escapeHtml(card.value)}<br />${escapeHtml(card.detail)}</div>`).join('')}
          ${diagnosisCards.slice(-4).map((card) => `<div class="hud-muted"><strong>${escapeHtml(card.title)}</strong>: ${escapeHtml(card.value)}<br />${escapeHtml(card.detail)}</div>`).join('')}
          ${scienceCards.slice(-4).map((card) => `<div class="hud-muted"><strong>${escapeHtml(card.title)}</strong>: ${escapeHtml(card.value)}<br />${escapeHtml(card.detail)}${card.confidence == null ? '' : ` | ${escapeHtml(formatPercent(card.confidence))}`}</div>`).join('')}
        </div>
      ` : '<div class="hud-muted">Some leg records are partial because the current result does not include all future adaptive fields.</div>'}
    </section>
  `;
}

function whyObjectiveChangedHtml(card = {}) {
  return `
    <div class="hud-muted" data-adaptive-why-objective-changed>
      <strong>${escapeHtml(card.title ?? 'Why did the objective change?')}</strong><br />
      ${escapeHtml(card.detail ?? 'No objective change has been recorded yet.')}<br />
      ${escapeHtml(card.boundary ?? 'Objective history records mission-manager decisions. These decisions choose objectives, not routes. Route planning remains with the player or solver.')}
    </div>
  `;
}
function warningsHtml(warnings = []) {
  if (!Array.isArray(warnings) || !warnings.length) return '';
  return `<p class="warning">${escapeHtml(warnings.join(' '))}</p>`;
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
