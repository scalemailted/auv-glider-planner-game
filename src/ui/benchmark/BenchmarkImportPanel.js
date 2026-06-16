export function benchmarkImportPanelHtml(viewModel = {}) {
  if (!viewModel) return '';
  return `
    <section class="benchmark-debrief-subsection benchmark-import-panel" data-benchmark-import-panel>
      <h3>Attempt Import / Session Persistence</h3>
      <p>${escapeHtml(viewModel.copy?.sessionPurpose ?? 'Attempt sessions let you compare multiple plans for the same fixed benchmark objective.')}</p>
      <p>${escapeHtml(viewModel.copy?.importNoRerun ?? 'Importing an attempt does not rerun the simulation. It loads exported benchmark metrics and route geometry.')}</p>
      <p>${escapeHtml(viewModel.copy?.compatibilityBoundary ?? 'Only compatible attempts are merged automatically. Different episodes or missions are shown as reference-only unless explicitly loaded separately.')}</p>
      <p>${escapeHtml(viewModel.copy?.p5Boundary ?? 'P5 does not add a new planner, change scoring, or train an autonomy policy.')}</p>
      <div class="cell-inspector-metrics">
        <div><span>Current Attempts</span><strong>${escapeHtml(viewModel.currentSession?.attemptCount ?? 0)}</strong></div>
        <div><span>Imported Files</span><strong>${escapeHtml(viewModel.importedArtifactCount ?? 0)}</strong></div>
        <div><span>Compatible</span><strong>${escapeHtml(viewModel.compatibleImportCount ?? 0)}</strong></div>
        <div><span>Saved Sessions</span><strong>${escapeHtml(viewModel.persistedSessionCount ?? 0)}</strong></div>
      </div>
      ${benchmarkImportControlsHtml(viewModel)}
      ${benchmarkImportWarningsHtml(viewModel)}
      ${benchmarkImportedArtifactListHtml(viewModel)}
      ${benchmarkPersistedSessionListHtml(viewModel)}
      <div class="hud-muted">${escapeHtml(viewModel.copy?.episodeBoundary ?? 'Imported benchmark artifacts are merged only when they match the current benchmark episode or are explicitly treated as reference-only.')}</div>
      <div class="hud-muted">${escapeHtml(viewModel.copy?.scoreBoundary ?? 'P5 does not recompute scores. It compares metrics stored in the imported benchmark records.')}</div>
      <div class="hud-muted">${escapeHtml(viewModel.copy?.persistenceBoundary ?? 'Local persistence stores compact attempt summaries and route geometry, not full hidden ocean fields.')}</div>
    </section>
  `;
}

export function benchmarkImportControlsHtml(viewModel = {}) {
  const canMerge = Boolean(viewModel.canMergeCompatible);
  return `
    <div class="debrief-actions inline-actions benchmark-import-controls">
      <button class="debrief-button" data-action="save-benchmark-attempt-session">Save Current Attempt Session</button>
      <button class="debrief-button" data-action="export-benchmark-attempt-session">Export Attempt Session</button>
      <label class="debrief-button benchmark-import-file-label" tabindex="0">
        Import Benchmark JSON
        <input type="file" accept="application/json,.json" multiple hidden data-benchmark-import-file />
      </label>
      <button class="debrief-button" data-action="merge-compatible-benchmark-imports" ${canMerge ? '' : 'disabled'}>Merge Compatible Imports</button>
      <button class="debrief-button" data-action="delete-benchmark-attempt-session">Delete Saved Current Session</button>
    </div>
  `;
}

export function benchmarkImportedArtifactListHtml(viewModel = {}) {
  const artifacts = Array.isArray(viewModel.importedArtifacts) ? viewModel.importedArtifacts : [];
  if (!artifacts.length) {
    return '<div class="benchmark-import-empty hud-muted">No imported benchmark artifacts are staged.</div>';
  }
  return `
    <article class="benchmark-route-detail benchmark-import-list" data-benchmark-imported-artifacts>
      <h4>Staged Imports</h4>
      <div class="debrief-table-wrap">
        <table class="debrief-table">
          <thead><tr><th>Artifact</th><th>Episode</th><th>Attempts</th><th>Geometry</th><th>Status</th></tr></thead>
          <tbody>
            ${artifacts.map((artifact) => `
              <tr class="${artifact.compatible ? 'winner' : artifact.referenceOnly ? 'warning' : ''}">
                <td>${escapeHtml(artifact.artifactType ?? 'unknown')}</td>
                <td>${escapeHtml(artifact.episodeId ?? 'not recorded')}</td>
                <td>${escapeHtml(artifact.attemptCount ?? 0)}</td>
                <td>${escapeHtml(artifact.hasRouteGeometry ? 'available' : 'not embedded')}</td>
                <td>${escapeHtml(artifact.compatible ? 'compatible' : artifact.referenceOnly ? 'reference-only' : 'incompatible')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

export function benchmarkPersistedSessionListHtml(viewModel = {}) {
  const sessions = Array.isArray(viewModel.persistedSessions) ? viewModel.persistedSessions : [];
  if (!sessions.length) {
    return '<div class="benchmark-import-empty hud-muted">No saved benchmark attempt sessions are available in this browser.</div>';
  }
  return `
    <article class="benchmark-route-detail benchmark-persisted-list" data-benchmark-persisted-sessions>
      <h4>Saved Attempt Sessions</h4>
      <div class="debrief-table-wrap">
        <table class="debrief-table">
          <thead><tr><th>Episode</th><th>Attempts</th><th>Routes</th><th>Saved</th><th></th></tr></thead>
          <tbody>
            ${sessions.slice(0, 8).map((session) => `
              <tr class="${session.currentEpisode ? 'winner' : session.compatible ? '' : 'warning'}">
                <td>${escapeHtml(session.episodeId)}</td>
                <td>${escapeHtml(session.attemptCount ?? 0)}</td>
                <td>${escapeHtml(session.routeGeometryCount ?? 0)}</td>
                <td>${escapeHtml(formatDate(session.savedAt))}</td>
                <td><button class="debrief-button compact" data-benchmark-load-session="${escapeAttr(session.episodeId)}" ${session.compatible ? '' : 'disabled'}>Load</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

export function benchmarkImportWarningsHtml(viewModel = {}) {
  const warnings = Array.isArray(viewModel.warnings) ? viewModel.warnings.filter(Boolean) : [];
  if (!warnings.length) return '';
  return `<div class="benchmark-route-warning" data-benchmark-import-warnings>${escapeHtml(warnings.join(' '))}</div>`;
}

function formatDate(value) {
  if (!value) return 'not saved';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleString?.() ?? date.toISOString();
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