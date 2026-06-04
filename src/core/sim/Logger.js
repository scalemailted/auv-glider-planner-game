export class Logger {
  constructor() {
    this.frames = [];
    this.events = [];
  }

  frame(t, agents, summary) {
    this.frames.push({
      t,
      agents: agents.map((agent) => ({
        id: agent.id,
        x: agent.x,
        y: agent.y,
        heading: agent.heading,
        battery: agent.battery,
        energyUsed: agent.energyUsed,
        depthEnergyMultiplier: agent.lastDepthMultiplier ?? 1,
        currentWaypointIndex: agent.currentWaypointIndex,
        activeWaypoint: agent.activeWaypoint,
        status: agent.status,
        commsState: agent.commsState
      })),
      summary
    });
  }

  event(event) {
    this.events.push(event);
  }
}
