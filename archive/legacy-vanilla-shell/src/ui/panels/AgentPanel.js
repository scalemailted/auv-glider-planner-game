export class AgentPanel {
  constructor(root) {
    this.root = root;
  }

  render(agents = []) {
    this.root.innerHTML = `
      <h3>Agents</h3>
      ${agents.map((agent) => `
        <section class="agent-status">
          <strong>${agent.label ?? agent.id}</strong>
          <div class="small">Status: ${agent.status}</div>
          <div class="small">Comms: ${agent.commsState ?? 'submerged'}</div>
          <div class="small">Waypoint: ${agent.currentWaypointIndex + 1}${agent.activeWaypoint ? ` (${agent.activeWaypoint.x}, ${agent.activeWaypoint.y})` : ''}</div>
          <div class="battery-bar" aria-label="Battery">
            <span style="width:${batteryPercent(agent)}%"></span>
          </div>
          <div class="small">Battery ${agent.battery.toFixed(1)} / ${agent.maxBattery}</div>
        </section>
      `).join('') || '<p class="small">No agents.</p>'}
    `;
  }
}

function batteryPercent(agent) {
  if (!agent.maxBattery) return 0;
  return Math.max(0, Math.min(100, (agent.battery / agent.maxBattery) * 100));
}
