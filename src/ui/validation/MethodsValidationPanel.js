export const METHODS_VALIDATION_PANEL_VERSION = 'sci-valid-r2a-methods-panel';

export function methodsValidationPanelHtml(viewModel) {
  if (!viewModel?.manifest) return loadingPanel();
  const mode = viewModel.presentationMode;
  return `
    <main id="methods-validation-route" class="methods-validation-route" data-presentation-mode="${escapeAttr(mode)}">
      <header class="methods-validation-header">
        <div>
          <p class="console-kicker">Methods &amp; Validation</p>
          <h1 id="next-shell-route-heading">Methods &amp; Validation</h1>
          <p>Evidence for how ANCHOR's models are implemented, tested, reproduced, and bounded.</p>
          <p class="hud-muted">This section documents the evidence behind ANCHOR's scientific and computational methods. It explains what has been verified, what is physically plausible, what has been externally compared, and what remains unevaluated.</p>
          <p class="hud-muted">${escapeHtml(viewModel.manifest.alphaPositioning)} Plan. Simulate. Compare. Learn.</p>
        </div>
        <div class="methods-validation-mode" role="tablist" aria-label="Presentation mode">
          <button type="button" data-action="validation-mode-learn" aria-pressed="${mode === 'learn'}">Plain Language</button>
          <button type="button" data-action="validation-mode-research" aria-pressed="${mode === 'research'}">Technical Detail</button>
        </div>
      </header>
      <section class="methods-validation-overview" aria-label="Official Validation Baseline evidence overview">
        ${metricCard('Official Validation Baseline', viewModel.manifest.validationBaselineId)}
        ${metricCard('Manifest digest', viewModel.manifest.manifestDigest)}
        ${metricCard('Components', viewModel.overview.componentCount)}
        ${metricCard('Claims', viewModel.overview.claimCount)}
        ${metricCard('Pass', viewModel.manifest.statusSummary?.PASS ?? 0)}
        ${metricCard('Warning', viewModel.manifest.statusSummary?.WARN ?? 0)}
        ${metricCard('Not Evaluated', viewModel.manifest.statusSummary?.NOT_EVALUATED ?? 0)}
      </section>
      <section class="methods-validation-boundary" aria-label="Claim boundary">
        <strong>No universal scientific-validity score is used.</strong>
        <span>Software verification, numerical verification, physical plausibility, external comparison, and operational validation remain separate.</span>
        <span>Passing visual and software tests does not establish oceanographic validity.</span>
      </section>
      <div class="methods-validation-grid">
        <aside class="methods-validation-components" aria-label="Component reports">
          <h2>Model Components</h2>
          ${viewModel.reports.map((report) => componentButton(report, viewModel.selectedComponentId)).join('')}
          <div class="methods-validation-downloads">
            <button type="button" data-action="download-validation-manifest">Download Manifest JSON</button>
            <button type="button" data-action="download-validation-summary-csv">Download Summary CSV</button>
          </div>
        </aside>
        <section class="methods-validation-claims" aria-label="Component claims">
          <h2>${escapeHtml(viewModel.selectedReport?.componentLabel ?? 'Component')} Claims</h2>
          <p class="hud-muted">${escapeHtml(viewModel.selectedReport?.summary ?? '')}</p>
          <div class="methods-validation-claim-list" role="list">
            ${(viewModel.selectedReport?.claims ?? []).map((claim) => claimButton(claim, viewModel.selectedClaimId, viewModel.selectedReport)).join('')}
          </div>
        </section>
        <section class="methods-validation-detail" aria-label="Selected claim detail">
          ${selectedClaimHtml(viewModel)}
        </section>
      </div>
      <section class="methods-validation-bottom" aria-label="Raw metrics and visualization data">
        <div class="methods-validation-plot">
          <h2>Evidence Overview</h2>
          ${summarySvg(viewModel.selectedReport)}
          <p class="hud-muted">Every chart has a downloadable data alternative.</p>
        </div>
        <div class="methods-validation-table-wrap">
          ${metricTable(viewModel.selectedReport)}
        </div>
        <div class="methods-validation-downloads">
          <span class="methods-download-heading">Download Evidence</span>
          <button type="button" data-action="download-validation-report">Download Report JSON</button>
          <button type="button" data-action="download-validation-metrics-csv">Download Raw Metric Table</button>
          <button type="button" data-action="download-validation-plot-data">Download Plot Data</button>
          <button type="button" data-action="copy-validation-command">Copy Reproduction Command</button>
          <button type="button" data-action="run-validation-exploratory">Run Exploratory Check</button>
          <button type="button" data-action="menu">Return to Product Hub</button>
        </div>
        ${exploratoryHtml(viewModel)}
      </section>
    </main>
  `;
}

function loadingPanel() {
  return `<main id="methods-validation-route" class="methods-validation-route"><section class="console-section"><h1>Methods &amp; Validation</h1><p>Loading Official Validation Baseline...</p></section></main>`;
}

function metricCard(label, value) {
  return `<article class="methods-validation-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function componentButton(report, selectedComponentId) {
  const selected = report.componentId === selectedComponentId;
  return `<button type="button" class="methods-component-button" data-component-id="${escapeAttr(report.componentId)}" aria-pressed="${selected}"><strong>${escapeHtml(report.componentLabel)}</strong><span>${escapeHtml(statusLine(report.statusSummary))}</span><small>${escapeHtml(evidenceLine(report.evidenceLevelSummary))}</small></button>`;
}

function claimButton(claim, selectedClaimId, report) {
  const evidence = report?.evidence?.find((record) => record.claimId === claim.claimId);
  const selected = claim.claimId === selectedClaimId;
  return `<button type="button" class="methods-claim-button" data-claim-id="${escapeAttr(claim.claimId)}" aria-pressed="${selected}" role="listitem"><span>Result Status: ${escapeHtml(formatStatus(evidence?.status ?? 'NOT_EVALUATED'))}</span><strong>${escapeHtml(claim.title)}</strong><small>Evidence Level: ${escapeHtml(formatEvidenceLevel(claim.evidenceLevel))}</small></button>`;
}

function selectedClaimHtml(viewModel) {
  const claim = viewModel.selectedClaim;
  const evidence = viewModel.selectedEvidence;
  if (!claim || !evidence) return '<h2>No claim selected</h2>';
  const research = viewModel.presentationMode === 'research';
  return `
    <h2>Selected Claim: ${escapeHtml(claim.title)}</h2>
    <div class="methods-status-row"><span>Result Status: ${escapeHtml(formatStatus(evidence.status))}</span><span>Evidence Level: ${escapeHtml(formatEvidenceLevel(evidence.evidenceLevel))}</span></div>
    <p>${escapeHtml(research ? claim.technicalClaim : claim.plainLanguageClaim)}</p>
    <section class="methods-claim-establishes"><h3>What this establishes</h3><p>${escapeHtml(evidence.interpretation)}</p></section>
    <section class="methods-claim-limits"><h3>What this does not establish</h3><p>${escapeHtml(evidence.limitations[0] ?? 'This evidence does not establish operational oceanographic validity or certified navigation performance.')}</p></section>
    <dl class="methods-validation-dl">
      <dt>Method</dt><dd>${escapeHtml(evidence.methodId)}</dd>
      <dt>Metric</dt><dd>${escapeHtml(evidence.metricId)}</dd>
      <dt>Measured Result</dt><dd>${escapeHtml(formatValue(evidence.measuredValue))}</dd>
      <dt>Units</dt><dd>${escapeHtml(evidence.units)}</dd>
      <dt>Acceptance Criterion</dt><dd>${escapeHtml(evidence.threshold ?? 'not defined')}</dd>
      <dt>Tolerance</dt><dd>${escapeHtml(evidence.tolerance ?? 'not defined')}</dd>
      <dt>Threshold Rationale</dt><dd>${escapeHtml(claim.thresholdRationale)}</dd>
      <dt>Interpretation</dt><dd>${escapeHtml(evidence.interpretation)}</dd>
      <dt>Known Limitations</dt><dd>${evidence.limitations.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</dd>
      <dt>References &amp; Provenance</dt><dd>${evidence.references.map((reference) => `<span>${escapeHtml(formatReferenceRole(reference.role))}: ${escapeHtml(reference.title)}</span>`).join('')}</dd>
      ${research ? `<dt>Evidence digest</dt><dd>${escapeHtml(evidence.evidenceDigest)}</dd><dt>Report digest</dt><dd>${escapeHtml(viewModel.selectedReport?.reportDigest)}</dd><dt>Package/model</dt><dd>${escapeHtml(evidence.modelVersion)}</dd><dt>Validation Fixture</dt><dd>${escapeHtml((evidence.fixtureIds ?? []).join(', ') || 'none')}</dd><dt>Reproduction</dt><dd>${escapeHtml(evidence.reproductionCommand)}</dd>` : ''}
    </dl>
  `;
}

function summarySvg(report) {
  const rows = report?.visualizations?.find((item) => item.kind === 'bar-summary')?.rows ?? [];
  const max = Math.max(1, ...rows.map((row) => Number(row.value ?? 0)));
  const bars = rows.map((row, index) => {
    const width = Math.round((Number(row.value ?? 0) / max) * 180);
    const y = 24 + index * 32;
    return `<g><text x="0" y="${y + 14}" class="methods-svg-label">${escapeHtml(formatStatus(row.label))}</text><rect x="150" y="${y}" width="${width}" height="18" rx="2"></rect><text x="${155 + width}" y="${y + 14}" class="methods-svg-value">${escapeHtml(row.value)}</text></g>`;
  }).join('');
  return `<svg class="methods-validation-svg" viewBox="0 0 390 ${Math.max(96, rows.length * 34 + 36)}" role="img" aria-label="${escapeAttr(report?.componentLabel ?? 'Component')} status count bar chart">${bars}</svg>`;
}

function metricTable(report) {
  const rows = report?.evidence ?? [];
  return `<table class="methods-validation-table"><caption>Raw metric table for ${escapeHtml(report?.componentLabel ?? 'selected component')}</caption><thead><tr><th>Claim</th><th>Result Status</th><th>Evidence Level</th><th>Metric</th><th>Measured Result</th><th>Units</th><th>Acceptance Criterion</th></tr></thead><tbody>${rows.map((record) => `<tr><td>${escapeHtml(record.claimId)}</td><td>${escapeHtml(formatStatus(record.status))}</td><td>${escapeHtml(formatEvidenceLevel(record.evidenceLevel))}</td><td>${escapeHtml(record.metricId)}</td><td>${escapeHtml(formatValue(record.measuredValue))}</td><td>${escapeHtml(record.units)}</td><td>${escapeHtml(record.threshold ?? 'not defined')}</td></tr>`).join('')}</tbody></table>`;
}

function exploratoryHtml(viewModel) {
  const rerun = viewModel.exploratoryRerun;
  if (!rerun) return `<p class="hud-muted">Exploratory local reruns do not modify the official ANCHOR validation baseline.</p>`;
  return `<section class="methods-validation-exploratory"><h2>Exploratory Local Rerun</h2><p>Exploratory local reruns do not modify the official ANCHOR validation baseline.</p><p>${escapeHtml(rerun.label)}</p><p>Result Status: ${escapeHtml(formatExploratoryStatus(rerun.status))} | Delta: ${escapeHtml(rerun.delta)} | Official report unchanged: ${escapeHtml(!rerun.officialBaselineMutable)}</p></section>`;
}

function statusLine(summary = {}) {
  return `Pass ${summary.PASS ?? 0} | Warning ${summary.WARN ?? 0} | Not Evaluated ${summary.NOT_EVALUATED ?? 0}`;
}

function evidenceLine(summary = {}) {
  return `Software Verified ${summary.SOFTWARE_VERIFIED ?? 0}, Numerically Verified ${summary.NUMERICALLY_VERIFIED ?? 0}, Physically Plausible ${summary.PHYSICALLY_PLAUSIBLE ?? 0}`;
}

function formatEvidenceLevel(value) {
  return ({
    SOFTWARE_VERIFIED: 'Software Verified',
    NUMERICALLY_VERIFIED: 'Numerically Verified',
    PHYSICALLY_PLAUSIBLE: 'Physically Plausible',
    EXTERNALLY_COMPARED: 'Externally Compared',
    OPERATIONALLY_VALIDATED: 'Operationally Validated',
    NOT_YET_EVALUATED: 'Not Yet Evaluated',
    NOT_APPLICABLE: 'Not Applicable'
  })[value] ?? String(value ?? 'Not Yet Evaluated');
}

function formatStatus(value) {
  return ({
    PASS: 'Pass',
    WARN: 'Warning',
    FAIL: 'Fail',
    NOT_EVALUATED: 'Not Evaluated',
    NOT_APPLICABLE: 'Not Applicable'
  })[value] ?? String(value ?? 'Not Evaluated');
}

function formatReferenceRole(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
}

function formatExploratoryStatus(value) {
  return value === 'MATCHED_OFFICIAL_DIGEST' ? 'Matched Official Digest' : formatStatus(value);
}

function formatValue(value) {
  if (value == null) return 'not measured';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function escapeAttr(value) { return escapeHtml(value); }
