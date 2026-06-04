import { formatHudMetric, getAgentPerformanceRows, getMissionSummaryMetrics } from './HudMetrics.js';

export class AgentPerformanceHud {
  constructor(app, root) {
    this.app = app;
    this.root = root;
    this.handlers = {};
  }

  setHandlers(handlers = {}) {
    this.handlers = handlers;
  }

  renderIdle() {
    if (!this.root) return;
    this.root.innerHTML = `
      <section class="agent-performance-strip">
        <span class="agent-performance-title">Mission Performance</span>
        <span class="agent-card idle">No active gliders</span>
      </section>
    `;
  }

  refresh(state, context = {}) {
    if (!this.root) return;
    if (state?.mode === 'planning' || state?.mode === 'simulation') {
      this.root.innerHTML = '';
      return;
    }
    if (!state?.level || !state?.mission) return this.renderIdle();
    const rows = getAgentPerformanceRows(state, context.engine, context.result);
    const metrics = getMissionSummaryMetrics(state, context.engine, context.result);
    this.root.innerHTML = `
      <section class="agent-performance-strip">
        <span class="agent-performance-title">Mission Performance</span>
        <span class="mission-total-card">
          ${totalChip('Score', formatHudMetric(metrics.totalScore))}
          ${totalChip('ROI', formatHudMetric(metrics.totalRoiCollected, 2))}
          ${totalChip('Planned EV', formatHudMetric(metrics.totalExpectedValue, 2))}
          ${totalChip('Actual ROI', formatHudMetric(metrics.totalRealizedValue, 2))}
          ${totalChip('Actual Energy', formatHudMetric(metrics.totalEnergyUsed))}
          ${totalChip('Hazards', `${metrics.hazardsHit}/${metrics.mobileHazardsHit}`)}
          ${totalChip('Time', metrics.missionTimeLabel)}
          ${totalChip('Mode', labelize(metrics.challengeMode))}
          ${metrics.stochasticSeed !== null ? totalChip('Seed', metrics.stochasticSeed) : ''}
        </span>
        ${rows.length ? rows.map((row) => card(row)).join('') : '<span class="agent-card idle">No agents</span>'}
      </section>
    `;
    this.bindCards();
  }

  bindCards() {
    this.root.querySelectorAll('[data-agent-card]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.selectAgent?.(button.dataset.agentCard));
    });
  }
}

function totalChip(label, value) {
  return `<span><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></span>`;
}

function card(row) {
  const battery = row.batteryRemaining === null || row.batteryRemaining === undefined
    ? 'N/A'
    : formatHudMetric(row.batteryRemaining);
  return `
    <button class="agent-card ${row.isSelected ? 'selected' : ''}" data-agent-card="${escapeAttr(row.agentId)}">
      <span class="agent-rank">#${row.rank}</span>
      <span class="agent-card-main">
        <strong>${escapeHtml(row.label)}</strong>
        <small>${escapeHtml(row.status)} | W${escapeHtml(row.activeWaypoint)}</small>
      </span>
      <span class="agent-card-metrics">
        <span><b>${formatHudMetric(row.score)}</b><small>score</small></span>
        <span><b>${formatHudMetric(row.roiCollected, 2)}</b><small>ROI</small></span>
        <span><b>${formatHudMetric(row.energyUsed)}</b><small>energy</small></span>
        <span><b>${row.hazardsHit}</b><small>haz</small></span>
        <span><b>${row.completedWaypoints}/${row.missedWaypoints}</b><small>done/miss</small></span>
        <span><b>${battery}</b><small>batt</small></span>
      </span>
    </button>
  `;
}

function labelize(value) {
  return String(value ?? '').replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
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
