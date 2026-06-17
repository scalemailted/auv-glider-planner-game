export function headlessBundleViewerPanelHtml(viewModel = {}) {
  return `
    <section class="console-header headless-bundle-viewer-panel">
      <div class="console-kicker">Headless Bundle Viewer</div>
      <h1>Headless Bundle Viewer</h1>
      <p>Import and inspect Node/OceanBox-JS headless mission bundles, observations, tracks, and score reports.</p>
    </section>
    <section class="console-status">
      <span>Bundle Status</span>
      <strong>${escapeHtml(viewModel.bundleStatus ?? 'No bundle loaded')}</strong>
      <small>Loaded headless bundles are for inspection and comparison. Browser ANCHOR remains the official visual referee and browser scoring UI.</small>
    </section>
    ${headlessBundleManifestHtml(viewModel)}
    ${headlessBundleVisibilityHtml(viewModel)}
    ${headlessBundleFieldsHtml(viewModel)}
    ${headlessBundleObservationsHtml(viewModel)}
    ${headlessBundleTracksHtml(viewModel)}
    ${headlessBundleScoreHtml(viewModel)}
    ${headlessBundleRoundtripHtml(viewModel)}
    ${headlessBundleScienceDiagnosisHtml(viewModel)}
    ${headlessBundleReplayHtml(viewModel)}
    ${warningsHtml(viewModel)}
    ${headlessBundleExportPanelHtml(viewModel)}
    <section class="console-section">
      <h2>Boundary</h2>
      <div class="hud-muted">Loaded headless bundles are for inspection and comparison. Browser ANCHOR remains the official visual referee and browser scoring UI.</div>
      <div class="hud-muted">Hidden truth is only available when the bundle explicitly includes oracle/debug hidden fields.</div>
      <div class="hud-muted">Colab/Python workflows should analyze these JSON/CSV artifacts, not reimplement the simulator.</div>
    </section>
  `;
}

export function headlessBundleManifestHtml(viewModel = {}) {
  const manifest = viewModel.manifestSummary ?? {};
  const mission = viewModel.missionSummary ?? {};
  return `
    <section class="console-section">
      <h2>Manifest / Mission</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Scenario', manifest.scenarioId)}
        ${metricHtml('Mission', manifest.missionId)}
        ${metricHtml('Episode', manifest.episodeId)}
        ${metricHtml('Seed', manifest.seed)}
        ${metricHtml('Runtime', manifest.runtimeTarget)}
        ${metricHtml('Files', manifest.fileCount)}
        ${metricHtml('Grid', mission.width && mission.height ? `${mission.width} x ${mission.height}` : 'N/A')}
        ${metricHtml('Gliders', mission.gliderCount)}
      </div>
    </section>
  `;
}

export function headlessBundleVisibilityHtml(viewModel = {}) {
  const visibility = viewModel.visibilitySummary ?? {};
  return `
    <section class="console-section">
      <h2>Visibility</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Risk', visibility.visibilityRisk ?? 'unknown')}
        ${metricHtml('Visible Fields', visibility.visibleFieldIds?.length ?? 0)}
        ${metricHtml('Hidden Exported', visibility.hiddenFieldExported ? 'yes' : 'no')}
        ${metricHtml('Hidden Disabled', visibility.hiddenExportDisabled ? 'yes' : 'no')}
      </div>
      <div class="hud-muted">Hidden truth is only available when the bundle explicitly includes oracle/debug hidden fields.</div>
    </section>
  `;
}

export function headlessBundleFieldsHtml(viewModel = {}) {
  const cards = viewModel.fieldCards ?? [];
  return `
    <section class="console-section">
      <h2>Visible Fields</h2>
      ${cards.length ? cards.map((card) => `
        <div class="hud-muted"><strong>${escapeHtml(card.id)}</strong> | ${escapeHtml(card.visibilityTier)} | ${escapeHtml(card.hidden ? 'hidden/oracle' : 'visible')} | shape ${escapeHtml((card.shape ?? []).join(' x ') || 'n/a')}</div>
      `).join('') : '<div class="hud-muted">No fields loaded yet.</div>'}
    </section>
  `;
}

export function headlessBundleObservationsHtml(viewModel = {}) {
  const summary = viewModel.observationSummary ?? {};
  return `
    <section class="console-section">
      <h2>Observations</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Rows', summary.count ?? 0)}
        ${metricHtml('Gliders', summary.gliderCount ?? 0)}
        ${metricHtml('Mean Observed', formatNumber(summary.meanObservedValue))}
        ${metricHtml('Mean Surprise', formatNumber(summary.meanSurprise))}
      </div>
    </section>
  `;
}

export function headlessBundleTracksHtml(viewModel = {}) {
  const summary = viewModel.trackSummary ?? {};
  return `
    <section class="console-section">
      <h2>Glider Tracks</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Points', summary.count ?? 0)}
        ${metricHtml('Gliders', summary.gliderCount ?? 0)}
        ${metricHtml('Energy', formatNumber(summary.totalEnergyIncrement))}
        ${metricHtml('Hazard Samples', summary.hazardSamples ?? 0)}
      </div>
    </section>
  `;
}

export function headlessBundleScoreHtml(viewModel = {}) {
  const summary = viewModel.scoreSummary ?? {};
  return `
    <section class="console-section">
      <h2>Score Report</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Final Score', formatNumber(summary.finalScore))}
        ${metricHtml('Educational', summary.educationalHeadlessScoring ? 'yes' : 'unknown')}
        ${metricHtml('Official Browser Score', summary.notBrowserOfficialScoring ? 'no' : 'not marked')}
      </div>
      <div class="hud-muted">Headless score is an educational headless score, not official browser scoring.</div>
    </section>
  `;
}

export function headlessBundleRoundtripHtml(viewModel = {}) {
  const summary = viewModel.roundtripSummary ?? {};
  if (!summary.present) return '';
  return `
    <section class="console-section">
      <h2>Roundtrip Summary</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Report Type', summary.canonicalType ?? summary.type)}
        ${metricHtml('Status', summary.status ?? 'unknown')}
        ${metricHtml('Packet', summary.packetId)}
        ${metricHtml('Plan', summary.planId)}
        ${metricHtml('Agent', summary.selectedAgentId)}
      </div>
      <h3>Solver Packet Validation</h3>
      <div class="cell-inspector-metrics">
        ${metricHtml('Visibility Status', summary.solverPacketValidationStatus ?? 'unknown')}
        ${metricHtml('Visibility Risk', summary.visibilityRisk ?? 'unknown')}
        ${metricHtml('Hidden Exported', summary.hiddenTruthExported ? 'yes' : 'no')}
      </div>
      <h3>Plan Validation</h3>
      <div class="cell-inspector-metrics">
        ${metricHtml('Plan Status', summary.planValidationStatus ?? 'unknown')}
        ${metricHtml('Generated Plan', summary.usesGeneratedPlan ? 'yes' : 'no')}
        ${metricHtml('New Planner', summary.usesNewPlanner ? 'yes' : 'no')}
      </div>
      <h3>Execution Summary</h3>
      <div class="cell-inspector-metrics">
        ${metricHtml('Execution', summary.executionStatus ?? 'unknown')}
        ${metricHtml('Observations', summary.observationCount)}
        ${metricHtml('Track Points', summary.trackPointCount)}
        ${metricHtml('Node Runtime', summary.usesNodeHeadlessRuntime ? 'yes' : 'no')}
      </div>
      <h3>Visibility Summary</h3>
      <div class="cell-inspector-metrics">
        ${metricHtml('Hidden Leak Check', summary.hiddenTruthLeakStatus ?? 'unknown')}
        ${metricHtml('Python Simulator', summary.usesPythonSimulator ? 'yes' : 'no')}
        ${metricHtml('MARL / RL', summary.usesMARL ? 'yes' : 'no')}
      </div>
      <h3>Score Summary</h3>
      <div class="cell-inspector-metrics">
        ${metricHtml('Final Score', formatNumber(summary.finalScore))}
        ${metricHtml('Official Browser Score', summary.usesBrowserOfficialScoring ? 'yes' : 'no')}
      </div>
      <div class="hud-muted">Solver packet to submitted plan to Node/OceanBox-JS headless bundle roundtrip. Browser scoring remains authoritative.</div>
    </section>
  `;
}

export function headlessBundleScienceDiagnosisHtml(viewModel = {}) {
  const summary = viewModel.scienceDiagnosisSummary ?? {};
  return `
    <section class="console-section" data-headless-science-diagnosis>
      <h2>Science Diagnosis</h2>
      ${summary.present ? `
        <div class="cell-inspector-metrics">
          ${metricHtml('Primary', summary.primaryDiagnosisLabel ?? summary.primaryDiagnosis)}
          ${metricHtml('Class', summary.diagnosisClass)}
          ${metricHtml('Confidence', formatNumber(summary.confidence))}
          ${metricHtml('Objective', summary.recommendedObjectiveId)}
        </div>
        <h3>Forecast Update</h3>
        <div class="cell-inspector-metrics">
          ${metricHtml('Status', summary.forecastCorrectionStatus ?? 'unknown')}
          ${metricHtml('Production Assimilation', summary.usesProductionDataAssimilation ? 'yes' : 'no')}
          ${metricHtml('Calibrated Forecast', summary.usesCalibratedOceanForecast ? 'yes' : 'no')}
        </div>
        <h3>Discovery Update</h3>
        <div class="cell-inspector-metrics">
          ${metricHtml('Hidden Event Status', summary.hiddenEventStatus ?? 'unknown')}
          ${metricHtml('Public Safe', summary.publicSafe ? 'yes' : 'no')}
          ${metricHtml('MARL / RL', summary.usesMARL ? 'yes' : 'no')}
        </div>
      ` : '<div class="hud-muted">Science discovery diagnostics were not available for this bundle.</div>'}
      <div class="hud-muted">Forecast correction means the expected field existed but was wrong.</div>
      <div class="hud-muted">Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast.</div>
      <div class="hud-muted">Science diagnosis informs mission or artifact review only; it is not planner authority and does not generate a route.</div>
      <div class="hud-muted">Headless science diagnostics are not browser official scoring.</div>
      <div class="hud-muted">P10 uses transparent educational heuristics, not production data assimilation.</div>
    </section>
  `;
}

export function headlessBundleReplayHtml(viewModel = {}) {
  const summary = viewModel.replaySummary ?? {};
  return `
    <section class="console-section">
      <h2>Replay</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Present', summary.present ? 'yes' : 'no')}
        ${metricHtml('Glider', summary.gliderId)}
        ${metricHtml('Track Points', summary.trackPointCount)}
        ${metricHtml('Observations', summary.observationCount)}
      </div>
    </section>
  `;
}

export function headlessBundleExportPanelHtml(viewModel = {}) {
  const disabled = viewModel?.bundleStatus ? '' : 'disabled';
  const roundtripDisabled = viewModel?.roundtripSummary?.present ? '' : 'disabled';
  return `
    <section class="console-section">
      <h2>Export</h2>
      <button class="console-button primary" data-action="export-browser-summary" ${disabled}>Export Browser Summary JSON</button>
      <button class="console-button secondary" data-action="export-browser-roundtrip-summary" ${roundtripDisabled}>Export Roundtrip Summary JSON</button>
      <div class="hud-muted">Exports anchor.browser.headless-bundle-summary for browser-side inspection and comparison only.</div>
      <div class="hud-muted">Roundtrip export writes anchor.browser.headless-roundtrip-summary when a solver-packet roundtrip report is loaded.</div>
    </section>
  `;
}

function warningsHtml(viewModel = {}) {
  const warnings = viewModel.warnings ?? [];
  const failures = viewModel.failures ?? [];
  if (!warnings.length && !failures.length) return '';
  return `
    <section class="console-section">
      <h2>Warnings / Failures</h2>
      ${failures.map((failure) => `<div class="hud-muted"><strong>Failure:</strong> ${escapeHtml(failure)}</div>`).join('')}
      ${warnings.map((warning) => `<div class="hud-muted"><strong>Warning:</strong> ${escapeHtml(warning)}</div>`).join('')}
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}
