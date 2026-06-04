import { PhaserButton } from './Button.js';
import { createPanel } from './Panel.js';
import { formatMissionTime } from '../../../core/time/MissionTime.js';

export class WaypointDrawer {
  constructor(scene, handlers) {
    this.scene = scene;
    this.handlers = handlers;
    this.collapsed = false;
    this.buttons = [];
    this.container = scene.add.container(0, 0).setDepth(32);
    this.panel = createPanel(scene, { x: 946, y: 142, width: 326, height: 480, title: 'Waypoints' });
    this.container.add(this.panel.container);
    this.header = scene.add.text(960, 170, '', { fontFamily: 'system-ui', fontSize: '13px', color: '#b9c7dc' });
    this.empty = scene.add.text(960, 220, '', { fontFamily: 'system-ui', fontSize: '13px', color: '#8ea2bd', wordWrap: { width: 285 } });
    this.container.add([this.header, this.empty]);
    this.toggle = new PhaserButton(scene, {
      x: 1212,
      y: 160,
      width: 80,
      label: 'Collapse',
      onClick: () => this.setCollapsed(!this.collapsed)
    });
    this.buttons.push(this.toggle);
  }

  refresh(state) {
    this.clearRows();
    this.header.setText(`Selected: ${state.selectedAgentId ?? 'none'}`);
    if (this.collapsed) return;
    const agentPlan = (state.plan?.agentPlans ?? []).find((plan) => plan.agentId === state.selectedAgentId);
    const waypoints = agentPlan?.waypoints ?? [];
    this.empty.setText(waypoints.length ? '' : 'No waypoints. Click water cells on the map to add the route.');
    waypoints.slice(0, 8).forEach((waypoint, index) => this.addRow(state, waypoint, index, waypoints.length));
    if (waypoints.length > 8) {
      this.rows.push(this.scene.add.text(960, 554, `+ ${waypoints.length - 8} more`, {
        fontFamily: 'system-ui',
        fontSize: '12px',
        color: '#9cb4d8'
      }).setDepth(33));
    }
  }

  addRow(state, waypoint, index, total) {
    const y = 214 + index * 44;
    const selected = state.ui.selectedWaypoint?.agentId === state.selectedAgentId && state.ui.selectedWaypoint?.index === index;
    const activeWindow = waypoint.window === state.selectedWindow;
    const bg = this.scene.add.rectangle(960, y - 7, 292, 38, selected ? 0x3d3218 : activeWindow ? 0x16362f : 0x121f34, 0.86)
      .setOrigin(0, 0)
      .setStrokeStyle(1, selected ? 0xffd166 : activeWindow ? 0x63e6be : 0x6d86aa, selected || activeWindow ? 0.7 : 0.22)
      .setDepth(33);
    const text = this.scene.add.text(970, y, `#${index + 1} W${waypoint.window ?? 0} ${formatMissionTime(state.level, waypoint.t ?? 0)}  (${waypoint.x},${waypoint.y}) ${waypoint.action}`, {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#eef6ff'
    }).setDepth(34);
    this.rows.push(bg, text);
    const buttonSpecs = [
      ['Up', 1108, () => this.handlers.moveUp(index), index === 0],
      ['Down', 1156, () => this.handlers.moveDown(index), index >= total - 1],
      ['Del', 1210, () => this.handlers.remove(index), false]
    ];
    for (const [label, x, onClick, disabled] of buttonSpecs) {
      const button = new PhaserButton(this.scene, { x, y: y + 7, width: 44, height: 24, label, onClick });
      button.setDisabled(disabled);
      button.container.setDepth(35);
      this.rowButtons.push(button);
    }
  }

  setCollapsed(collapsed) {
    this.collapsed = collapsed;
    this.toggle.setLabel(collapsed ? 'Expand' : 'Collapse');
    this.scene.tweens.add({
      targets: this.panel.container,
      x: collapsed ? 282 : 0,
      duration: 140,
      ease: 'Sine.easeOut'
    });
    this.header.setVisible(!collapsed);
    this.empty.setVisible(!collapsed);
    this.refresh(this.scene.app.state);
  }

  clearRows() {
    for (const row of this.rows ?? []) row.destroy();
    for (const button of this.rowButtons ?? []) button.destroy();
    this.rows = [];
    this.rowButtons = [];
  }

  destroy() {
    this.clearRows();
    this.buttons.forEach((button) => button.destroy());
    this.container.destroy();
  }
}
