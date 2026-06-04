import { buildTopHudState } from './TopMissionHudState.js';

export class MissionSummaryHud {
  constructor(app, root) {
    this.app = app;
    this.root = root;
  }

  renderIdle() {
    if (!this.root) return;
    this.renderViewModel(buildTopHudState(this.app?.state ?? null));
  }

  refresh(state, context = {}) {
    if (!this.root) return;
    this.renderViewModel(buildTopHudState(state, context));
  }

  renderViewModel(viewModel) {
    this.root.innerHTML = `
      <section class="summary-hud top-mission-hud ${escapeHtml(viewModel?.className ?? '')}" aria-label="Mission HUD">
        ${(viewModel?.chips ?? []).map((item) => chip(item)).join('')}
      </section>
    `;
  }
}

function chip(item) {
  const classes = ['metric-chip', 'top-hud-chip'];
  if (item.primary) classes.push('primary');
  if (item.tone) classes.push(item.tone);
  const titleAttr = item.title ? ` title="${escapeHtml(item.title)}"` : '';
  const priority = Number(item.priority ?? 7);
  return `<span class="${classes.map(escapeHtml).join(' ')}" data-priority="${priority}"${titleAttr}>${escapeHtml(item.value)}</span>`;
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
