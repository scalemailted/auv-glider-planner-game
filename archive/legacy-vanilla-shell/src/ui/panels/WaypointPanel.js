import { VALID_WAYPOINT_ACTIONS } from '../../core/planning/WaypointPlan.js';
import { formatMissionTime } from '../../core/time/MissionTime.js';

export class WaypointPanel {
  constructor(root, state) {
    this.root = root;
    this.state = state;
  }

  render({ onUpdate, onRemove, onMoveUp, onMoveDown } = {}) {
    const plan = this.state.plan;
    if (!plan) {
      this.root.innerHTML = '<h3>Waypoints</h3><p class="small">No plan loaded.</p>';
      return;
    }

    this.root.innerHTML = `
      <h3>Waypoints</h3>
      ${plan.agentPlans.map((agentPlan) => this.renderAgentPlan(agentPlan)).join('')}
    `;

    this.root.querySelectorAll('[data-waypoint-field]').forEach((input) => {
      input.onchange = () => {
        const patch = getPatchFromInput(input);
        onUpdate?.(input.dataset.agent, Number(input.dataset.index), patch);
      };
    });

    this.root.querySelectorAll('button[data-remove-waypoint]').forEach((button) => {
      button.onclick = () => onRemove?.(button.dataset.agent, Number(button.dataset.index));
    });

    this.root.querySelectorAll('button[data-move-waypoint]').forEach((button) => {
      const index = Number(button.dataset.index);
      if (button.dataset.moveWaypoint === 'up') onMoveUp?.(button.dataset.agent, index);
      if (button.dataset.moveWaypoint === 'down') onMoveDown?.(button.dataset.agent, index);
    });
  }

  renderAgentPlan(agentPlan) {
    const selected = agentPlan.agentId === this.state.selectedAgentId ? ' selected' : '';
    const waypoints = agentPlan.waypoints ?? [];
    const rows = waypoints.map((waypoint, index) => this.renderWaypointRow(agentPlan.agentId, waypoint, index, waypoints.length)).join('');

    return `
      <section class="waypoint-agent${selected}">
        <strong>${escapeHtml(agentPlan.agentId)}</strong>
        ${rows || '<p class="small">No waypoints.</p>'}
      </section>
    `;
  }

  renderWaypointRow(agentId, waypoint, index, totalCount) {
    const activeWindow = waypoint.window === this.state.selectedWindow ? ' active-window' : '';
    const selectedWaypoint = this.state.ui.selectedWaypoint?.agentId === agentId && this.state.ui.selectedWaypoint?.index === index ? ' selected-waypoint' : '';

    return `
      <div class="waypoint-row editable${activeWindow}${selectedWaypoint}">
        <span class="waypoint-order">#${index + 1}</span>
        <div class="waypoint-reorder">
          <button data-move-waypoint="up" data-agent="${escapeAttr(agentId)}" data-index="${index}" title="Move waypoint up" ${index === 0 ? 'disabled' : ''}>Up</button>
          <button data-move-waypoint="down" data-agent="${escapeAttr(agentId)}" data-index="${index}" title="Move waypoint down" ${index >= totalCount - 1 ? 'disabled' : ''}>Down</button>
        </div>
        <label class="compact-field">Win
          <input data-waypoint-field="window" data-agent="${escapeAttr(agentId)}" data-index="${index}" type="number" min="0" step="1" value="${waypoint.window ?? 0}" />
        </label>
        <span class="waypoint-time">${formatMissionTime(this.state.level, waypoint.t ?? 0)}</span>
        <label class="compact-field">X
          <input data-waypoint-field="x" data-agent="${escapeAttr(agentId)}" data-index="${index}" type="number" step="1" value="${waypoint.x ?? 0}" />
        </label>
        <label class="compact-field">Y
          <input data-waypoint-field="y" data-agent="${escapeAttr(agentId)}" data-index="${index}" type="number" step="1" value="${waypoint.y ?? 0}" />
        </label>
        <label class="compact-field action-field">Action
          <select data-waypoint-field="action" data-agent="${escapeAttr(agentId)}" data-index="${index}">
            ${VALID_WAYPOINT_ACTIONS.map((action) => `
              <option value="${action}" ${action === waypoint.action ? 'selected' : ''}>${action}</option>
            `).join('')}
          </select>
        </label>
        <button data-remove-waypoint="true" data-agent="${escapeAttr(agentId)}" data-index="${index}" title="Remove waypoint">Remove</button>
      </div>
    `;
  }
}

function getPatchFromInput(input) {
  const field = input.dataset.waypointField;
  if (field === 'x' || field === 'y' || field === 'window') {
    return { [field]: Number(input.value) };
  }
  return { [field]: input.value };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}
