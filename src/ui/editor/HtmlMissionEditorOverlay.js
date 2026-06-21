export const HTML_MISSION_EDITOR_OVERLAY_VERSION = 'html-mission-editor-overlay-three-r2b';

export function renderMissionEditorOverlaySummary({ sessionSummary = {}, validationSummary = {}, rendererSummary = {} } = {}) {
  return `
    <section class="three-mission-tool-overlay" data-three-mission-editor-overlay>
      <div class="three-mission-tool-badge">Three Mission Editor</div>
      <div class="small">Tool ${escapeHtml(sessionSummary.lastCommandType ?? sessionSummary.activeTool ?? 'editor')} | Validation ${escapeHtml(validationSummary.status ?? sessionSummary.validationStatus ?? 'UNKNOWN')}</div>
      <div class="small">Canonical document authority; Three.js presentation only.</div>
      <div class="small">Renderer ${escapeHtml(rendererSummary.renderer ?? 'three')} | Hidden truth excluded.</div>
    </section>
  `;
}

export function missionEditorOverlaySummary() {
  return {
    type: 'anchor.ui.mission-editor-overlay-summary',
    version: HTML_MISSION_EDITOR_OVERLAY_VERSION,
    usesDomOverlay: true,
    ownsEditorState: false,
    ownsSimulationState: false,
    ownsScoring: false
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
