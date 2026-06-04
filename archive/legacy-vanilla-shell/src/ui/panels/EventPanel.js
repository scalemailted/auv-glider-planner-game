export class EventPanel {
  constructor(root) {
    this.root = root;
  }

  render(events = []) {
    this.root.innerHTML = `
      <h3>Events</h3>
      <div class="event-list">
        ${events.slice(-10).reverse().map((event) => `
          <div class="event-row small">
            <strong>${formatTime(event.t)}</strong>
            <span>${formatEvent(event)}</span>
          </div>
        `).join('') || '<p class="small">No events yet.</p>'}
      </div>
    `;
  }
}

function formatTime(t = 0) {
  return `${Number(t).toFixed(1)}s`;
}

function formatEvent(event) {
  if (event.type === 'sample') return `${event.agentId} sampled (${event.x}, ${event.y}) value ${event.value?.toFixed?.(2) ?? event.value}`;
  if (event.type === 'duplicateSample') return `${event.agentId} duplicate sample at (${event.x}, ${event.y})`;
  if (event.type === 'hazard') return `${event.agentId} hit hazard at (${event.x}, ${event.y})`;
  if (event.type === 'blocked') return `${event.agentId} blocked by terrain`;
  if (event.type === 'waypointReached') return `${event.agentId} reached ${event.waypointId}`;
  if (event.type === 'missedWaypoint') return `${event.agentId} missed ${event.waypointId} (${event.reason})`;
  return `${event.type} ${event.agentId ?? ''}`;
}
