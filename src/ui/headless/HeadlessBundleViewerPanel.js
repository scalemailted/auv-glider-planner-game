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
      <h2>Roundtrip Report</h2>
      <div class="cell-inspector-metrics">
        ${metricHtml('Status', summary.status ?? 'unknown')}
        ${metricHtml('Packet', summary.packetId)}
        ${metricHtml('Plan', summary.planId)}
        ${metricHtml('Agent', summary.selectedAgentId)}
        ${metricHtml('Hidden Exported', summary.hiddenTruthExported ? 'yes' : 'no')}
        ${metricHtml('Official Browser Score', summary.browserOfficialScoring ? 'yes' : 'no')}
      </div>
      <div class="hud-muted">Solver packet to submitted plan to Node/OceanBox-JS headless bundle roundtrip. Browser scoring remains authoritative.</div>
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
  return `
    <section class="console-section">
      <h2>Export</h2>
      <button class="console-button primary" data-action="export-browser-summary" ${disabled}>Export Browser Summary JSON</button>
      <div class="hud-muted">Exports anchor.browser.headless-bundle-summary for browser-side inspection and comparison only.</div>
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
