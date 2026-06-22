import { SURFACING_DECISION_ACTION } from '../../core/simulation/SurfacingDecisionState.js';

export const HTML_SURFACING_DECISION_MODAL_VERSION = 'surface-decision-modal-r1';

export function createHtmlSurfacingDecisionModal({ root = null, onAction = null } = {}) {
  return new HtmlSurfacingDecisionModal({ root, onAction });
}

export class HtmlSurfacingDecisionModal {
  constructor({ root = null, onAction = null } = {}) {
    this.root = root ?? globalThis.document?.body ?? null;
    this.onAction = onAction;
    this.overlay = null;
    this.dialog = null;
    this.currentDecisionId = null;
    this.mounted = false;
    this.showCount = 0;
    this.hideCount = 0;
    this.actionDispatchCount = 0;
    this.keydownHandler = (event) => this.handleKeydown(event);
  }

  show({ decision = null, transaction = null, queue = null, onAction = null } = {}) {
    if (!this.root || !globalThis.document) return false;
    this.onAction = onAction ?? this.onAction;
    this.ensureStyle();
    this.ensureElements();
    this.currentDecisionId = decision?.id ?? null;
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    this.dialog.setAttribute('data-decision-id', this.currentDecisionId ?? 'unknown');
    this.dialog.innerHTML = modalHtml({ decision, transaction, queue });
    this.bindActions();
    this.dialog.removeEventListener('keydown', this.keydownHandler);
    this.dialog.addEventListener('keydown', this.keydownHandler);
    this.mounted = true;
    this.showCount += 1;
    globalThis.requestAnimationFrame?.(() => {
      const focusTarget = this.dialog.querySelector('[data-surface-action]') ?? this.dialog;
      focusTarget?.focus?.({ preventScroll: true });
    });
    return true;
  }

  hide() {
    if (!this.overlay) return;
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.mounted = false;
    this.hideCount += 1;
  }

  destroy() {
    this.dialog?.removeEventListener('keydown', this.keydownHandler);
    this.overlay?.remove?.();
    this.overlay = null;
    this.dialog = null;
    this.mounted = false;
  }

  isVisible() {
    return Boolean(this.overlay && !this.overlay.hidden && this.overlay.getAttribute('aria-hidden') !== 'true');
  }

  summary() {
    return {
      type: 'anchor.ui.surfacing-decision-modal-summary',
      version: HTML_SURFACING_DECISION_MODAL_VERSION,
      mounted: this.mounted,
      visible: this.isVisible(),
      currentDecisionId: this.currentDecisionId,
      showCount: this.showCount,
      hideCount: this.hideCount,
      actionDispatchCount: this.actionDispatchCount,
      hasDialog: Boolean(this.dialog)
    };
  }

  ensureElements() {
    if (this.overlay && this.dialog) return;
    this.overlay = globalThis.document.createElement('div');
    this.overlay.className = 'surface-decision-modal-backdrop';
    this.overlay.dataset.surfaceDecisionOverlay = 'true';
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.dialog = globalThis.document.createElement('section');
    this.dialog.className = 'surface-decision-modal';
    this.dialog.dataset.surfaceDecisionModal = 'true';
    this.dialog.dataset.surfaceDecisionVisible = 'true';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-labelledby', 'surface-decision-modal-title');
    this.dialog.setAttribute('tabindex', '-1');
    this.overlay.appendChild(this.dialog);
    this.root.appendChild(this.overlay);
  }

  ensureStyle() {
    if (globalThis.document?.querySelector?.('[data-surface-decision-modal-style="true"]')) return;
    const style = globalThis.document.createElement('style');
    style.dataset.surfaceDecisionModalStyle = 'true';
    style.textContent = `
      .surface-decision-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9000;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(8, 14, 22, 0.48);
      }
      .surface-decision-modal-backdrop[hidden] { display: none; }
      .surface-decision-modal {
        width: min(560px, calc(100vw - 32px));
        max-height: calc(100vh - 48px);
        overflow: auto;
        border: 1px solid rgba(179, 206, 235, 0.28);
        border-radius: 8px;
        background: #101820;
        color: #edf6ff;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.42);
        padding: 20px;
      }
      .surface-decision-modal h1 { margin: 0 0 8px; font-size: 1.12rem; letter-spacing: 0; }
      .surface-decision-modal h2 { margin: 14px 0 6px; font-size: 0.92rem; letter-spacing: 0; }
      .surface-decision-modal p { margin: 6px 0; line-height: 1.35; }
      .surface-decision-modal .surface-decision-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin: 12px 0;
      }
      .surface-decision-modal .surface-decision-stat {
        border: 1px solid rgba(179, 206, 235, 0.18);
        border-radius: 6px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.04);
      }
      .surface-decision-modal .surface-decision-stat span { display: block; color: #9fb3c8; font-size: 0.75rem; }
      .surface-decision-modal .surface-decision-stat strong { display: block; margin-top: 2px; }
      .surface-decision-modal .surface-decision-actions {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
        margin-top: 16px;
      }
      .surface-decision-modal button {
        min-height: 38px;
        border: 1px solid rgba(179, 206, 235, 0.24);
        border-radius: 6px;
        background: #1b2a38;
        color: #f4fbff;
        cursor: pointer;
        font: inherit;
      }
      .surface-decision-modal button.primary { background: #1f6f8b; border-color: #49abc8; }
      .surface-decision-modal button.secondary { background: #243241; }
      .surface-decision-modal button.danger { background: #58303a; border-color: #a45a68; }
      .surface-decision-modal button:focus-visible { outline: 2px solid #88d8ff; outline-offset: 2px; }
      .surface-decision-modal .surface-decision-note { color: #b9c8d8; font-size: 0.86rem; }
      @media (min-width: 680px) {
        .surface-decision-modal .surface-decision-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    `;
    globalThis.document.head?.appendChild(style);
  }

  bindActions() {
    this.dialog.querySelectorAll('[data-surface-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-surface-action');
        this.actionDispatchCount += 1;
        this.onAction?.(action, { source: 'htmlSurfacingDecisionModal', decisionId: this.currentDecisionId });
      });
    });
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...this.dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.disabled && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && globalThis.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && globalThis.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

function modalHtml({ decision = {}, transaction = {}, queue = {} } = {}) {
  const queueText = Number(queue?.count ?? decision?.pendingDecisionCount ?? 1) > 1
    ? `<p class="surface-decision-note">Decision ${escapeHtml(Number(queue.index ?? decision?.activeDecisionIndex ?? 0) + 1)} of ${escapeHtml(queue.count ?? decision.pendingDecisionCount)}. Resolve this glider before continuing.</p>`
    : '';
  return `
    <h1 id="surface-decision-modal-title">Glider Surfaced - Mission Decision Required</h1>
    <p>${escapeHtml(decision?.agentLabel ?? decision?.agentId ?? 'Glider')} surfaced at ${escapeHtml(formatTime(decision?.time))}. The simulation is paused until you choose how to proceed.</p>
    ${queueText}
    <div class="surface-decision-grid">
      <div class="surface-decision-stat"><span>Expected position</span><strong>${escapeHtml(formatPoint(decision?.expectedPosition ?? decision?.expected))}</strong></div>
      <div class="surface-decision-stat"><span>Actual position</span><strong>${escapeHtml(formatPoint(decision?.actualPosition ?? decision?.actual))}</strong></div>
      <div class="surface-decision-stat"><span>Battery</span><strong>${escapeHtml(formatMetric(decision?.battery))}</strong></div>
      <div class="surface-decision-stat"><span>Waypoints</span><strong>${escapeHtml(decision?.completedWaypointCount ?? 0)} done / ${escapeHtml(decision?.pendingWaypointCount ?? 0)} remaining</strong></div>
    </div>
    <h2>What this means</h2>
    <p class="surface-decision-note">Continue keeps the original remaining route. Update Waypoints returns to Planning from the actual surfaced position so you can edit future waypoints. Finish ends the mission and opens Debrief.</p>
    <p class="surface-decision-note">No route is generated automatically. The player remains responsible for waypoint edits.</p>
    <div class="surface-decision-actions">
      <button type="button" class="primary" data-action="surfacing-continue-original-plan" data-surface-action="${SURFACING_DECISION_ACTION.CONTINUE_ORIGINAL_PLAN}">Continue Original Plan</button>
      <button type="button" data-action="surfacing-update-waypoints" data-surface-action="${SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS}">Update Waypoints / Replan</button>
      <button type="button" data-action="surfacing-export-observations" data-surface-action="${SURFACING_DECISION_ACTION.EXPORT_OBSERVATIONS}">Export Observation Data</button>
      <button type="button" data-action="surfacing-import-waypoints" data-surface-action="${SURFACING_DECISION_ACTION.IMPORT_WAYPOINTS}">Import Waypoint Data</button>
      <button type="button" class="danger" data-action="surfacing-finish-mission" data-surface-action="${SURFACING_DECISION_ACTION.FINISH_MISSION}">Finish Mission / Debrief</button>
    </div>
    <p class="surface-decision-note">Transaction: ${escapeHtml(transaction?.transactionId ?? 'pending')}</p>
  `;
}

function formatPoint(point) {
  if (!point) return 'N/A';
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 'N/A';
  return `(${x.toFixed(1)}, ${y.toFixed(1)})`;
}

function formatTime(time) {
  const numeric = Number(time);
  if (!Number.isFinite(numeric)) return 'the surface window';
  if (numeric >= 3600) return `${(numeric / 3600).toFixed(2)} hr`;
  if (numeric >= 60) return `${(numeric / 60).toFixed(1)} min`;
  return `${numeric.toFixed(1)} s`;
}

function formatMetric(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : 'N/A';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}