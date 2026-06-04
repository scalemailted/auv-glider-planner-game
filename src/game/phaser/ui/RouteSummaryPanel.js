import { createPanel } from './Panel.js';
import { formatMissionTime } from '../../../core/time/MissionTime.js';

export class RouteSummaryPanel {
  constructor(scene, { x = 18, y = 538, width = 210 } = {}) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(29);
    this.panel = createPanel(scene, { x, y, width, height: 154, title: 'Route Estimate', alpha: 0.86 });
    this.container.add(this.panel.container);
    this.text = scene.add.text(x + 16, y + 36, '', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#d6e4f7',
      lineSpacing: 4,
      wordWrap: { width: width - 28 }
    }).setDepth(30);
  }

  refresh(state) {
    const agentPlan = (state.plan?.agentPlans ?? []).find((plan) => plan.agentId === state.selectedAgentId);
    const waypoints = agentPlan?.waypoints ?? [];
    const agent = (state.mission?.agents ?? []).find((candidate) => candidate.id === state.selectedAgentId);
    const origin = {
      x: agent?.start?.x ?? 0,
      y: agent?.start?.y ?? 0
    };
    let distance = 0;
    let previous = origin;
    for (const waypoint of waypoints) {
      distance += Math.hypot(Number(waypoint.x) - previous.x, Number(waypoint.y) - previous.y);
      previous = waypoint;
    }
    const energyRate = Number(state.mission?.scoring?.energyCostPerDistance ?? state.mission?.rules?.energyCostPerDistance ?? 1);
    const budget = Number(agent?.battery ?? state.mission?.rules?.energyBudget ?? 0);
    const estimatedEnergy = distance * energyRate;
    const budgetLine = budget ? `${Math.round(estimatedEnergy)} / ${Math.round(budget)}` : `${Math.round(estimatedEnergy)}`;
    this.text.setText([
      `Glider: ${state.selectedAgentId ?? 'none'}`,
      `Waypoints: ${waypoints.length}`,
      `Path length: ${distance.toFixed(1)} cells`,
      `Energy est.: ${budgetLine}`,
      `Active: W${state.selectedWindow} ${formatMissionTime(state.level, state.planningTime)}`
    ].join('\n'));
  }

  destroy() {
    this.text.destroy();
    this.container.destroy();
  }
}
