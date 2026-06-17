import { buildAdaptiveScienceDiagnosisViewModel } from '../../core/benchmark/AdaptiveScienceDiagnosisViewModel.js';

export function adaptiveSurfacingPanelHtml(viewModelOrDecision = {}) {
  const decision = viewModelOrDecision.decision ?? viewModelOrDecision;
  const handoff = viewModelOrDecision.nextLegHandoff ?? viewModelOrDecision.handoff ?? null;
  const scienceViewModel = viewModelOrDecision.scienceDiagnosisViewModel
    ?? decision.scienceDiagnosisViewModel
    ?? buildAdaptiveScienceDiagnosisViewModel({ surfacingDecision: decision, scienceDiagnosisContext: decision.scienceDiagnosisContext, missionManagerRationale: decision.missionManagerRationale });
  const partial = Boolean(scienceViewModel.evidenceQualityCard?.partialEvidence || decision?.evidence?.diagnostics?.partialEvidence || decision?.warnings?.length);
  return `
    <article class="debrief-panel adaptive-surfacing-panel" data-adaptive-surfacing-panel>
      <h2>Adaptive Benchmark Surfacing Review</h2>
      <p>Adaptive Benchmark updates the objective at surfacing/debrief time. The player or solver still plans the route for the next leg.</p>
      <p>Science diagnosis informs the mission-manager recommendation. It does not generate a route.</p>
      <p>P10 does not add a new planner, scoring redesign, production data assimilation, or MARL/RL.</p>
      <p>P11 does not add full 3D planning, new route planning, production data assimilation, or MARL/RL.</p>
      ${partial ? '<p>Evidence is partial because the current result does not contain all uncertainty or observation fields.</p>' : ''}
      ${adaptiveEvidenceSnapshotHtml(decision, scienceViewModel)}
      ${adaptiveWaterColumnEvidenceHtml(scienceViewModel)}
      ${adaptiveScienceDiscoveryHtml(decision, scienceViewModel)}
      ${adaptiveDiagnosisHtml(decision)}
      ${adaptiveObjectiveTransitionHtml(decision, scienceViewModel)}
      ${handoff ? adaptiveNextLegHandoffHtml(handoff) : '<p><strong>Plan Next Leg</strong>: Next-leg config will be available after the surfacing decision is built.</p>'}
      ${adaptiveHandoffBoundaryHtml(scienceViewModel)}
      ${adaptiveSurfacingExportPanelHtml(decision)}
    </article>
  `;
}

export function adaptiveEvidenceSnapshotHtml(decision = {}, scienceViewModel = null) {
  const evidence = decision.evidence ?? {};
  const card = scienceViewModel?.evidenceQualityCard ?? {};
  const warnings = [...(Array.isArray(decision.warnings) ? decision.warnings : []), ...(Array.isArray(card.warnings) ? card.warnings : [])];
  return `
    <section data-adaptive-evidence-summary>
      <h3>Evidence Summary</h3>
      <div class="cell-inspector-metrics">
        <div><span>Current Objective</span><strong>${escapeHtml(decision.previousObjective?.label ?? evidence.activeObjectiveId ?? 'Unknown')}</strong></div>
        <div><span>Uploaded Samples</span><strong>${escapeHtml(evidence.observationCount ?? card.observationCount ?? 0)}</strong></div>
        <div><span>Recent Observations</span><strong>${escapeHtml(evidence.recentObservationCount ?? 0)}</strong></div>
        <div><span>Surprise</span><strong>${escapeHtml(card.surpriseLevel ?? formatScore(evidence.meanSurprise))}</strong></div>
        <div><span>Coherence</span><strong>${escapeHtml(card.coherenceLevel ?? 'n/a')}</strong></div>
        <div><span>Confidence</span><strong>${escapeHtml(formatPercent(card.confidence ?? decision.diagnosis?.confidence))}</strong></div>
      </div>
      <p>Observed evidence is summarized for mission-manager objective recommendation, not route generation.</p>
      ${warnings.length ? `<p class="warning">${escapeHtml(uniqueStrings(warnings).join(' '))}</p>` : ''}
    </section>
  `;
}

export function adaptiveWaterColumnEvidenceHtml(scienceViewModel = {}) {
  const card = scienceViewModel?.waterColumnEvidenceCard ?? {};
  if (!card.present) return '';
  const counts = card.observationCountsByDepth ?? {};
  return `
    <section data-adaptive-water-column-evidence>
      <h3>Water Column Evidence</h3>
      <div class="cell-inspector-metrics">
        <div><span>Vertical Coverage</span><strong>${escapeHtml(card.verticalCoverage ?? 'n/a')}</strong></div>
        <div><span>Recommended Dive Profile</span><strong>${escapeHtml(card.recommendedDiveProfileId ?? 'n/a')}</strong></div>
        <div><span>Route Authority</span><strong>${escapeHtml(card.routeAuthority ?? 'playerOrSolver')}</strong></div>
        <div><span>Generates Waypoints</span><strong>${escapeHtml(card.generatesWaypoints ? 'yes' : 'no')}</strong></div>
      </div>
      ${Object.keys(counts).length ? `<p>Observation counts by depth: ${escapeHtml(Object.entries(counts).map(([id, count]) => `${id}=${count}`).join(', '))}</p>` : ''}
      <p>2.5D means the tactical map remains top-down, while each cell can contain simplified depth layers.</p>
      <p>Dive profile controls which layer the glider samples along the route.</p>
      <p>Recommended dive profile is context for the next leg; it does not generate a route.</p>
      <p>P11 does not add full 3D planning, new route planning, production data assimilation, or MARL/RL.</p>
    </section>
  `;
}
export function adaptiveScienceDiscoveryHtml(decision = {}, scienceViewModel = null) {
  const science = decision.scienceDiscovery ?? decision.diagnosis?.scienceDiscovery ?? decision.evidence?.scienceDiscovery ?? null;
  const forecastCard = scienceViewModel?.forecastUpdateCard ?? {};
  const discoveryCard = scienceViewModel?.discoveryUpdateCard ?? {};
  if (!science && !decision.scienceDiagnosisContext && !decision.diagnosis?.primaryScienceDiagnosis) {
    return `
      <section data-adaptive-science-discovery>
        <h3>Science Diagnosis</h3>
        <p>Science discovery diagnostics were not available for this leg. The mission manager used the available adaptive evidence summary.</p>
        <h4>Forecast Update</h4>
        <p>Forecast correction means the expected field existed but was wrong.</p>
        <h4>Discovery Update</h4>
        <p>Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast.</p>
        <p>P10 uses transparent educational heuristics, not production data assimilation.</p>
      </section>
    `;
  }
  return `
    <section data-adaptive-science-discovery>
      <h3>Science Diagnosis</h3>
      <div class="cell-inspector-metrics">
        <div><span>Science Diagnosis</span><strong>${escapeHtml(decision.scienceDiagnosisContext?.primaryScienceDiagnosisLabel ?? decision.diagnosis?.primaryScienceDiagnosisLabel ?? science?.primaryDiagnosisLabel ?? decision.scienceDiagnosisContext?.primaryScienceDiagnosis ?? science?.primaryDiagnosis ?? 'Unknown')}</strong></div>
        <div><span>Confidence</span><strong>${escapeHtml(formatPercent(decision.scienceDiagnosisContext?.confidence ?? science?.confidence ?? decision.diagnosis?.confidence))}</strong></div>
        <div><span>Recommended Objective</span><strong>${escapeHtml(decision.scienceDiagnosisContext?.recommendedObjectiveLabel ?? science?.recommendedObjectiveId ?? decision.diagnosis?.recommendedObjectiveId ?? 'Unknown')}</strong></div>
      </div>
      <h4>Forecast Update</h4>
      <div class="cell-inspector-metrics">
        <div><span>Status</span><strong>${escapeHtml(forecastCard.status ?? 'not available')}</strong></div>
        <div><span>Correction Kind</span><strong>${escapeHtml(forecastCard.correctionKind ?? 'n/a')}</strong></div>
        <div><span>Confidence</span><strong>${escapeHtml(formatPercent(forecastCard.confidence))}</strong></div>
      </div>
      <p>${escapeHtml(forecastCard.rationale ?? 'Forecast correction means the expected field existed but was wrong.')}</p>
      <h4>Discovery Update</h4>
      <div class="cell-inspector-metrics">
        <div><span>Status</span><strong>${escapeHtml(discoveryCard.status ?? 'not available')}</strong></div>
        <div><span>Event Family</span><strong>${escapeHtml(discoveryCard.eventFamily ?? 'unknown')}</strong></div>
        <div><span>Follow-up</span><strong>${escapeHtml(discoveryCard.recommendedFollowup ?? 'collect more evidence')}</strong></div>
      </div>
      <p>${escapeHtml(discoveryCard.rationale ?? 'Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast.')}</p>
    </section>
  `;
}

export function adaptiveDiagnosisHtml(decision = {}) {
  const diagnosis = decision.diagnosis ?? {};
  const secondaries = Array.isArray(diagnosis.secondaryDiagnoses) ? diagnosis.secondaryDiagnoses : [];
  return `
    <section data-adaptive-diagnosis>
      <h3>Diagnosis</h3>
      <p><strong>${escapeHtml(diagnosis.primaryDiagnosisLabel ?? diagnosis.primaryDiagnosis ?? 'Unknown')}</strong> | Confidence ${escapeHtml(formatPercent(diagnosis.confidence))}</p>
      <p>${escapeHtml(diagnosis.rationale ?? decision.rationale ?? 'Transparent rule diagnosis unavailable.')}</p>
      ${secondaries.length ? `<p>Secondary signals: ${escapeHtml(secondaries.map((entry) => `${entry.label ?? entry.id} ${formatScore(entry.score)}`).join(', '))}</p>` : ''}
    </section>
  `;
}

export function adaptiveObjectiveTransitionHtml(decision = {}, scienceViewModel = null) {
  const transition = decision.objectiveTransition ?? {};
  const recommendation = scienceViewModel?.recommendationCard ?? {};
  const rationale = scienceViewModel?.missionManagerRationaleCard ?? {};
  const alternatives = Array.isArray(rationale.alternativeObjectives) ? rationale.alternativeObjectives : [];
  return `
    <section data-adaptive-objective-transition>
      <h3>Mission Manager Recommendation</h3>
      <p>Recommended Next Objective: ${escapeHtml(decision.recommendedObjective?.label ?? recommendation.recommendedObjective?.label ?? transition.toObjectiveId ?? 'Unknown')}</p>
      <p>${escapeHtml(transition.transitionId ?? recommendation.transitionId ?? 'keepCurrentObjective')}: ${escapeHtml(decision.previousObjective?.label ?? recommendation.currentObjective?.label ?? transition.fromObjectiveId ?? 'Unknown')} -&gt; ${escapeHtml(decision.recommendedObjective?.label ?? recommendation.recommendedObjective?.label ?? transition.toObjectiveId ?? 'Unknown')}</p>
      <p>${escapeHtml(recommendation.reason ?? rationale.explanation ?? transition.rationale ?? 'The mission manager selected the next objective using transparent evidence rules.')}</p>
      <p>Route planning authority: ${escapeHtml(recommendation.routeStillPlannedBy ?? 'playerOrSolver')}.</p>
      <p>Recommended dive profile: ${escapeHtml(recommendation.recommendedDiveProfileId ?? 'n/a')}.</p>
      ${alternatives.length ? `<p>Alternative objectives: ${escapeHtml(alternatives.map((entry) => `${entry.label}: ${entry.reasonAgainst}`).join(' | '))}</p>` : ''}
    </section>
  `;
}

export function adaptiveNextLegHandoffHtml(handoff = {}) {
  return `
    <section data-adaptive-next-leg-handoff>
      <h3>Plan Next Leg</h3>
      <p>Recommended objective: <strong>${escapeHtml(handoff.recommendedObjectiveLabel ?? handoff.recommendedObjectiveId ?? 'Unknown')}</strong>.</p>
      <p>The mission manager recommends the next objective. The player or solver must still plan the route.</p>
      <p>Recommended dive profile: <strong>${escapeHtml(handoff.recommendedDiveProfileId ?? 'n/a')}</strong>.</p>
      <p>No automatic waypoints are generated by this handoff.</p>
    </section>
  `;
}

export function adaptiveHandoffBoundaryHtml(scienceViewModel = {}) {
  return `
    <section data-adaptive-handoff-boundary>
      <h3>Handoff Boundary</h3>
      <p>Science diagnosis informs the mission-manager recommendation. It does not generate a route.</p>
      <p>The player or solver still plans the next leg.</p>
      <p>P10 does not add a new planner, scoring redesign, production data assimilation, or MARL/RL.</p>
      <p>P11 does not add full 3D planning, new route planning, production data assimilation, or MARL/RL.</p>
      <p>Forecast correction means the expected field existed but was wrong.</p>
      <p>Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast.</p>
      ${Array.isArray(scienceViewModel.notImplemented) && scienceViewModel.notImplemented.length ? `<p>Not implemented: ${escapeHtml(scienceViewModel.notImplemented.join(', '))}</p>` : ''}
    </section>
  `;
}

export function adaptiveSurfacingExportPanelHtml() {
  return `
    <section data-adaptive-surfacing-exports>
      <h3>Exports</h3>
      <div class="debrief-button-row">
        <button class="debrief-button" data-action="export-adaptive-surfacing-decision">Export Surfacing Decision</button>
        <button class="debrief-button" data-action="export-adaptive-manager-state">Export Adaptive Manager State</button>
        <button class="debrief-button" data-action="export-adaptive-objective-transition">Export Objective Transition</button>
        <button class="debrief-button" data-action="export-adaptive-next-leg-config">Export Next-Leg Config</button>
        <button class="debrief-button" data-action="export-adaptive-episode-trace">Export Adaptive Episode Trace</button>
      </div>
    </section>
  `;
}

function formatScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : 'n/a';
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : 'n/a';
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean))];
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