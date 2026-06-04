import { PhaserButton } from './Button.js';
import { NumericStepper } from './NumericStepper.js';

const GROUPS = [
  { id: 'terrain', label: 'Terrain', tools: [{ label: 'Land', brush: 'terrain' }, { label: 'Clear', brush: 'clear' }] },
  { id: 'water', label: 'Water / Depth', tools: [{ label: 'Deep', brush: 'depth' }, { label: 'Shallow', brush: 'shallow' }] },
  { id: 'currents', label: 'Currents', tools: [
    { label: 'Directional', brush: 'current', currentTool: 'directional' },
    { label: 'Vortex', brush: 'current', currentTool: 'vortex' },
    { label: 'Corridor', brush: 'current', currentTool: 'corridor' },
    { label: 'Calm', brush: 'current', currentTool: 'calm' }
  ] },
  { id: 'hazards', label: 'Hazards', tools: [{ label: 'Static Hazard', brush: 'hazard' }] },
  { id: 'roi', label: 'ROI / Sampling', tools: [{ label: 'Boost ROI', brush: 'roi' }] },
  { id: 'deploy', label: 'Deploy Zones', tools: [{ label: 'Drop Zone', brush: 'deploymentZone' }, { label: 'Base', brush: 'base' }, { label: 'Agent Start', brush: 'agentStart' }] },
  { id: 'agents', label: 'Agents / Mission', tools: [{ label: 'Apply Mission', action: 'applyMission' }] },
  { id: 'time', label: 'Time Frames', tools: [{ label: 'Prev Frame', action: 'prevFrame' }, { label: 'Next Frame', action: 'nextFrame' }, { label: 'Current Scope', scope: 'current' }, { label: 'All Frames', scope: 'all' }] },
  { id: 'export', label: 'Import / Export', tools: [{ label: 'Import JSON', action: 'import' }, { label: 'Export JSON', action: 'export' }, { label: 'Play Level', action: 'play' }] }
];

export class EditorHud {
  constructor(scene) {
    this.scene = scene;
    this.activeGroup = 'terrain';
    this.objects = [];
    this.refresh();
  }

  refresh() {
    this.destroyObjects();
    const scene = this.scene;
    this.panel(18, 18, 346, 128);
    this.text(34, 30, 'Environment Editor', 18, '#eef6ff', '700');
    this.text(34, 56, `${scene.level?.levelId ?? 'level'} | ${scene.shortInstanceLabel?.() ?? ''}`, 12, '#9cb4d8');
    this.text(34, 78, `Tool: ${toolLabel(scene)} | Frame ${scene.frameIndex}`, 13, '#eef6ff');
    this.text(34, 100, `Scope: ${scene.readBrushConfig?.().frameScope ?? 'current'} | Intensity ${scene.readBrushConfig?.().intensity ?? 0.4} | Radius ${scene.readBrushConfig?.().radius ?? 1} | Falloff radial`, 12, '#b9c7dc');

    this.panel(18, 158, 186, 500);
    this.text(34, 170, 'Tool Groups', 14, '#eef6ff', '700');
    GROUPS.forEach((group, index) => {
      this.button(108, 204 + index * 43, 150, group.label, () => {
        this.activeGroup = group.id;
        this.refresh();
      }, group.id === this.activeGroup);
    });

    this.panel(214, 158, 260, 286);
    const group = GROUPS.find((candidate) => candidate.id === this.activeGroup) ?? GROUPS[0];
    this.text(230, 170, group.label, 15, '#eef6ff', '700');
    group.tools.forEach((tool, index) => {
      this.button(306, 208 + index * 42, 170, tool.label, () => this.selectTool(tool), isActiveTool(scene, tool));
    });

    if (this.activeGroup === 'currents') {
      this.text(230, 382, 'Drag on map to preview vector; release to apply.', 12, '#b9c7dc');
      this.text(230, 402, 'Synthetic ocean-inspired currents for gameplay.', 11, '#9cb4d8');
      this.button(306, 418, 170, 'Preview Preset', () => scene.previewPresetFromHud?.(), false);
    } else if (this.activeGroup === 'time') {
      this.text(230, 382, `t=${scene.level?.layers?.truth?.frames?.[scene.frameIndex]?.t ?? 0}`, 12, '#b9c7dc');
    }

    this.drawBrushSettings();
  }

  drawBrushSettings() {
    const scene = this.scene;
    const config = scene.readBrushConfig?.() ?? { radius: 1, intensity: 0.45 };
    this.panel(214, 456, 260, 122);
    this.text(230, 468, 'Brush Settings', 14, '#eef6ff', '700');
    const intensityLabel = scene.brush === 'current' ? 'Vector strength' : (scene.brush === 'roi' ? 'ROI boost' : 'Intensity');
    this.stepper(230, 506, {
      label: 'Radius',
      value: config.radius,
      min: 1,
      max: 8,
      step: 1,
      precision: 0,
      onChange: (value) => scene.setBrushSettingFromHud?.('radius', value)
    });
    this.stepper(230, 542, {
      label: intensityLabel,
      value: config.intensity,
      min: 0.1,
      max: 5,
      step: scene.brush === 'current' ? 0.05 : 0.1,
      precision: scene.brush === 'current' ? 2 : 1,
      onChange: (value) => scene.setBrushSettingFromHud?.('intensity', value)
    });
  }

  selectTool(tool) {
    if (tool.brush) this.scene.setBrushFromHud(tool.brush, tool.currentTool);
    if (tool.scope) this.scene.setFrameScopeFromHud(tool.scope);
    if (tool.action === 'prevFrame') this.scene.nudgeFrameFromHud(-1);
    if (tool.action === 'nextFrame') this.scene.nudgeFrameFromHud(1);
    if (tool.action === 'import') this.scene.openImportFromHud();
    if (tool.action === 'export') this.scene.exportLevelFromHud();
    if (tool.action === 'play') this.scene.playLevelFromHud();
    if (tool.action === 'applyMission') this.scene.applyMissionFromHud();
    this.refresh();
  }

  panel(x, y, width, height) {
    const rect = this.scene.add.rectangle(x, y, width, height, 0x07101d, 0.86)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x6d86aa, 0.32);
    this.objects.push(rect);
    return rect;
  }

  button(x, y, width, label, onClick, active = false) {
    const button = new PhaserButton(this.scene, {
      x,
      y,
      width,
      height: 32,
      label,
      onClick,
      style: active ? { fill: 0x1f4f63, stroke: 0x63e6be } : {}
    });
    this.objects.push(button);
    return button;
  }

  stepper(x, y, config) {
    const stepper = new NumericStepper(this.scene, { x, y, ...config });
    this.objects.push(stepper);
    return stepper;
  }

  text(x, y, value, size = 12, color = '#dcecff', weight = '500') {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: 'system-ui',
      fontSize: `${size}px`,
      fontStyle: weight,
      color,
      wordWrap: { width: 320 }
    });
    this.objects.push(text);
    return text;
  }

  destroyObjects() {
    this.objects.forEach((object) => object.destroy());
    this.objects = [];
  }

  destroy() {
    this.destroyObjects();
  }
}

function toolLabel(scene) {
  if (scene.brush === 'current') return `Current / ${scene.readBrushConfig?.().currentTool ?? 'directional'}`;
  return scene.brush;
}

function isActiveTool(scene, tool) {
  if (tool.brush !== scene.brush) return false;
  if (tool.currentTool) return scene.readBrushConfig?.().currentTool === tool.currentTool;
  return Boolean(tool.brush);
}
