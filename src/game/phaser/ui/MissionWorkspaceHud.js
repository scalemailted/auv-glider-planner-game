import { createPanel } from './Panel.js';
import { NumericStepper } from './NumericStepper.js';
import { formatMissionTime } from '../../../core/time/MissionTime.js';
import { shortInstanceId } from '../../../core/identity/GameInstanceId.js';
import { MenuGroupPanel } from './MenuGroupPanel.js';
import { LegendPanel } from './LegendPanel.js';
import { RouteSummaryPanel } from './RouteSummaryPanel.js';
import { PhaserButton } from './Button.js';

export class MissionWorkspaceHud {
  constructor(scene, handlers) {
    this.scene = scene;
    this.handlers = handlers;
    this.menus = [];
    this.buttons = [];
    this.dynamicObjects = [];
    this.container = scene.add.container(0, 0).setDepth(28);
    this.buildTopBar();
    this.buildMissionPanel();
    this.legend = new LegendPanel(scene, { x: 18, y: 256, width: 210 });
    this.routeSummary = new RouteSummaryPanel(scene, { x: 18, y: 536, width: 210 });
  }

  buildTopBar() {
    const bar = createPanel(this.scene, { x: 238, y: 14, width: 724, height: 52, alpha: 0.72 });
    this.container.add(bar.container);
    this.menus.push(new MenuGroupPanel(this.scene, {
      x: 306,
      y: 40,
      label: 'Plan',
      width: 110,
      items: [
        { label: 'Save Level', onClick: () => this.handlers.saveLevel() },
        { label: 'Clear Route', onClick: () => this.handlers.clear() },
        { label: 'Import Plan', onClick: () => this.handlers.importPlan() },
        { label: 'Export Plan', onClick: () => this.handlers.exportPlan() }
      ]
    }));
    this.menus.push(new MenuGroupPanel(this.scene, {
      x: 436,
      y: 40,
      label: 'Analysis',
      width: 126,
      items: [
        { label: 'Temporal Greedy', onClick: () => this.handlers.temporalGreedy?.() },
        { label: 'Solver Packet', onClick: () => this.handlers.exportSolver() },
        { label: 'ROI Mode', onClick: () => this.handlers.toggleRoiMode() },
        { label: 'Guidance', onClick: () => this.handlers.toggleGuidance() }
      ]
    }));
    this.menus.push(new MenuGroupPanel(this.scene, {
      x: 574,
      y: 40,
      label: 'View',
      width: 112,
      items: [
        { label: 'Next Glider', onClick: () => this.handlers.nextGlider() },
        { label: 'Mode', onClick: () => this.handlers.toggleMode() },
        { label: 'Help', onClick: () => this.handlers.help() }
      ]
    }));
    this.menus.push(new MenuGroupPanel(this.scene, {
      x: 846,
      y: 40,
      label: 'Execute',
      width: 132,
      items: [
        { label: 'Run Mission', onClick: () => this.handlers.execute() },
        { label: 'Rerun Same', onClick: () => this.handlers.rerunSamePlan?.(), disabled: () => !this.lastState?.stochastic?.enabled },
        { label: 'Rerun New Seed', onClick: () => this.handlers.rerunWithNewSeed?.(), disabled: () => !this.lastState?.stochastic?.enabled }
      ]
    }));
    const execute = new PhaserButton(this.scene, {
      x: 1110,
      y: 40,
      width: 150,
      height: 36,
      label: 'Execute',
      onClick: () => this.handlers.execute(),
      style: { fill: 0x63e6be, hoverFill: 0x8af2d4, text: 0x06121f, stroke: 0xbef6ff }
    });
    execute.container.setDepth(42);
    this.buttons.push(execute);
  }

  buildMissionPanel() {
    const panel = createPanel(this.scene, { x: 18, y: 16, width: 210, height: 226, title: 'Mission', alpha: 0.88 });
    this.container.add(panel.container);
    this.title = this.scene.add.text(34, 52, '', {
      fontFamily: 'system-ui',
      fontSize: '15px',
      fontStyle: '700',
      color: '#eef6ff',
      wordWrap: { width: 180 }
    }).setDepth(29);
    this.meta = this.scene.add.text(34, 94, '', {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#9cb4d8',
      wordWrap: { width: 178 }
    }).setDepth(29);
    this.status = this.scene.add.text(34, 142, '', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#d6e4f7',
      lineSpacing: 3,
      wordWrap: { width: 178 }
    }).setDepth(29);
    this.container.add([this.title, this.meta, this.status]);
  }

  refresh(state) {
    this.lastState = state;
    this.dynamicObjects.forEach((object) => object.destroy?.());
    this.dynamicObjects = [];
    const level = state.level;
    const waypointCount = (state.plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
    this.title.setText(level?.meta?.name ?? 'Mission Workspace');
    this.meta.setText(`Level ${level?.levelId ?? 'unknown'}\nInstance ${shortInstanceId(level)}\nSeed ${level?.meta?.seed ?? 'N/A'}`);
    this.status.setText([
      `Mode: ${labelize(state.challengeMode)}`,
      `Glider: ${state.selectedAgentId ?? 'none'}`,
      `Window: ${state.selectedWindow}`,
      `Time: ${formatMissionTime(level, state.planningTime)}`,
      `Route: ${waypointCount} waypoint(s)`
    ].join('\n'));
    this.routeSummary.refresh(state);
    this.renderStochasticPanel(state);
  }

  renderStochasticPanel(state) {
    const enabled = state.stochastic?.enabled && state.challengeMode === 'forecast';
    if (!enabled) return;
    const panel = createPanel(this.scene, { x: 976, y: 16, width: 258, height: 110, title: 'Stochastic Run', alpha: 0.82 });
    panel.container.setDepth(28);
    this.dynamicObjects.push(panel.container);
    const stochastic = state.stochastic;
    this.dynamicText(992, 52, `ROI ${stochastic.roiScoringMode}`, 11, '#9cb4d8');
    this.dynamicText(992, 72, `Forecast ${stochastic.selectedForecastMember ?? state.ui?.forecastMemberId ?? 'ensemble_mean'}`, 11, '#9cb4d8');
    const seedStepper = new NumericStepper(this.scene, {
      x: 992,
      y: 98,
      label: 'Seed',
      value: stochastic.seed,
      min: 0,
      max: 999999999,
      step: 1,
      precision: 0,
      onChange: (value) => this.handlers.setStochasticSeed?.(value)
    });
    seedStepper.container.setDepth(31);
    this.dynamicObjects.push(seedStepper);
  }

  dynamicText(x, y, value, size = 12, color = '#dcecff', weight = '500') {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: 'system-ui',
      fontSize: `${size}px`,
      fontStyle: weight,
      color,
      wordWrap: { width: 220 }
    }).setDepth(31);
    this.dynamicObjects.push(text);
    return text;
  }

  destroy() {
    this.dynamicObjects.forEach((object) => object.destroy?.());
    this.menus.forEach((menu) => menu.destroy());
    this.buttons.forEach((button) => button.destroy());
    this.legend.destroy();
    this.routeSummary.destroy();
    this.container.destroy();
  }
}

function labelize(value) {
  return String(value ?? '').replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}
