import {
  advanceDemoParticles,
  createDemoParticles,
  createDemoTerrain,
  FLOW_DEMO_DEFAULT_PRESETS,
  FLOW_DEMO_GRID,
  getFlowDemoPresetConfig,
  isDemoLand,
  normalizeTerrainMode,
  normalizeFieldMode,
  sampleDemoFlow
} from '../../../core/demo/FlowFieldDemo.js';
import { PhaserButton } from '../ui/Button.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class FlowFieldDemoScene extends PhaserScene {
  constructor() {
    super('FlowFieldDemoScene');
    this.objects = [];
    this.buttons = [];
    this.fieldMode = 'dynamic';
    this.preset = FLOW_DEMO_DEFAULT_PRESETS.static;
    this.secondaryPreset = FLOW_DEMO_DEFAULT_PRESETS.secondary;
    this.blendWeight = 0.6;
    this.partitionType = 'vertical';
    this.terrainMode = 'none';
    this.terrainSeed = 'anchor-demo-1';
    this.terrain = createDemoTerrain({ mode: 'none', seed: this.terrainSeed });
    this.timeSpeedScale = 1;
    this.demoTime = 0;
    this.paused = false;
    this.lastDebugDemoTime = -Infinity;
  }

  init(data = {}) {
    this.fieldMode = normalizeFieldMode(data.fieldMode ?? data.mode ?? 'dynamic');
    this.preset = data.preset ?? FLOW_DEMO_DEFAULT_PRESETS[this.fieldMode] ?? FLOW_DEMO_DEFAULT_PRESETS.dynamic;
    this.secondaryPreset = data.secondaryPreset ?? FLOW_DEMO_DEFAULT_PRESETS.secondary;
    this.blendWeight = finiteNumber(data.blendWeight, 0.6);
    this.partitionType = data.partitionType ?? 'vertical';
    this.terrainMode = normalizeTerrainMode(data.terrainMode ?? 'none');
    this.terrainSeed = data.terrainSeed ?? 'anchor-demo-1';
    this.terrain = createDemoTerrain({ mode: this.terrainMode, seed: this.terrainSeed });
    this.timeSpeedScale = finiteNumber(data.timeSpeedScale, 1);
    this.demoTime = 0;
    this.paused = false;
    this.lastDebugDemoTime = -Infinity;
    this.particles = createDemoParticles({
      count: this.fieldMode === 'static' ? 18 : 22,
      seed: `flow-demo-${this.fieldMode}:${this.preset}:${this.secondaryPreset}`
    });
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'flowDemo';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel(this.title());
    this.app.waypointPanel?.renderIdle?.();
    this.app.summaryHud?.renderIdle?.();
    this.app.agentPerformanceHud?.setHandlers?.({});
    this.app.agentPerformanceHud?.renderIdle?.();
    this.renderConsole();
    this.buildSceneObjects();
    this.draw();
  }

  shutdown() {
    this.destroyObjects();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.buildSceneObjects();
    this.draw();
  }

  update(_time, delta) {
    if (this.paused) {
      this.draw();
      return;
    }
    const dt = Math.min(0.05, Math.max(0, Number(delta ?? 16.67) / 1000));
    this.demoTime += dt * this.timeSpeedScale;
    advanceDemoParticles(this.particles, {
      time: this.demoTime,
      dt,
      field: sampleDemoFlow,
      fieldConfig: this.fieldConfig()
    });
    this.debugFlowSample();
    this.draw();
  }

  title() {
    return 'Flow Fields Demo';
  }

  subtitle() {
    if (this.fieldMode === 'static') return 'Static fields hold direction and magnitude while particles reveal flow structure.';
    if (this.fieldMode === 'blended') return 'Blended fields stack two presets over the same domain.';
    if (this.fieldMode === 'partitioned') return 'Partitioned fields use different presets in different regions.';
    return 'Dynamic fields evolve over simulated time; the speed control scales field time.';
  }

  renderConsole() {
    const primaryConfig = getFlowDemoPresetConfig(this.fieldMode, this.preset);
    this.app.console?.renderFlowDemoControls?.({
      title: this.title(),
      fieldMode: this.fieldMode,
      preset: this.preset,
      secondaryPreset: this.secondaryPreset,
      blendWeight: this.blendWeight,
      partitionType: this.partitionType,
      terrainMode: this.terrainMode,
      terrainSeed: this.terrainSeed,
      timeSpeedScale: this.timeSpeedScale,
      presetConfig: primaryConfig,
      status: `${fieldModeLabel(this.fieldMode)} field`,
      time: this.demoTime,
      paused: this.paused
    }, {
      fieldMode: (fieldMode) => this.scene.restart({ ...this.sceneConfig(), fieldMode }),
      preset: (preset) => this.scene.restart({ ...this.sceneConfig(), preset }),
      secondaryPreset: (secondaryPreset) => this.scene.restart({ ...this.sceneConfig(), secondaryPreset }),
      blendWeight: (blendWeight) => this.scene.restart({ ...this.sceneConfig(), blendWeight: Number(blendWeight) }),
      partitionType: (partitionType) => this.scene.restart({ ...this.sceneConfig(), partitionType }),
      terrainMode: (terrainMode) => this.scene.restart({ ...this.sceneConfig(), terrainMode }),
      resetTerrain: () => this.scene.restart({ ...this.sceneConfig(), terrainSeed: nextTerrainSeed(this.terrainSeed) }),
      timeSpeedScale: (timeSpeedScale) => {
        this.timeSpeedScale = Number(timeSpeedScale) || 1;
        this.renderConsole();
      },
      pause: () => {
        this.paused = !this.paused;
        this.renderConsole();
      },
      reset: () => this.scene.restart(this.sceneConfig()),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  fieldConfig() {
    return {
      fieldMode: this.fieldMode,
      primaryPreset: this.preset,
      secondaryPreset: this.secondaryPreset,
      blendWeight: this.blendWeight,
      partitionType: this.partitionType,
      terrain: this.terrain
    };
  }

  sceneConfig() {
    return {
      fieldMode: this.fieldMode,
      preset: this.preset,
      secondaryPreset: this.secondaryPreset,
      blendWeight: this.blendWeight,
      partitionType: this.partitionType,
      terrainMode: this.terrainMode,
      terrainSeed: this.terrainSeed,
      timeSpeedScale: this.timeSpeedScale
    };
  }

  buildSceneObjects() {
    this.destroyObjects();
    this.graphics = this.add.graphics();
    this.objects.push(this.graphics);
    this.titleText = this.add.text(0, 0, this.title(), {
      fontFamily: 'system-ui',
      fontSize: '28px',
      fontStyle: '700',
      color: '#eef6ff'
    }).setOrigin(0, 0);
    this.subtitleText = this.add.text(0, 0, this.subtitle(), {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#9cb4d8',
      wordWrap: { width: 720 }
    }).setOrigin(0, 0);
    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#c9f7e5'
    }).setOrigin(0, 0);
    this.objects.push(this.titleText, this.subtitleText, this.statusText);
    this.createButtons();
  }

  createButtons() {
    this.buttons = [
      new PhaserButton(this, {
        x: 0,
        y: 0,
        width: 112,
        label: 'Back',
        onClick: () => this.scene.start('MainMenuScene')
      }),
      new PhaserButton(this, {
        x: 0,
        y: 0,
        width: 112,
        label: this.paused ? 'Play' : 'Pause',
        onClick: () => {
          this.paused = !this.paused;
          this.buttons?.[1]?.setLabel(this.paused ? 'Play' : 'Pause');
          this.renderConsole();
        }
      }),
      new PhaserButton(this, {
        x: 0,
        y: 0,
        width: 112,
        label: 'Reset',
        onClick: () => this.scene.restart(this.sceneConfig())
      })
    ];
  }

  layout() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(24, Math.min(52, width * 0.045));
    const top = Math.max(24, Math.min(44, height * 0.06));
    const mapTop = top + 112;
    const mapHeight = Math.max(260, height - mapTop - 54);
    const mapWidth = Math.max(320, width - margin * 2);
    return {
      width,
      height,
      margin,
      top,
      map: {
        x: margin,
        y: mapTop,
        width: mapWidth,
        height: mapHeight
      }
    };
  }

  draw() {
    if (!this.graphics) return;
    const layout = this.layout();
    this.graphics.clear();
    this.drawBackground(layout);
    this.drawTerrain(layout.map);
    this.drawField(layout.map);
    this.drawTrails(layout.map);
    this.drawParticles(layout.map);
    this.layoutText(layout);
    this.layoutButtons(layout);
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x06101d, 0x0b2137, 0x092943, 0x06101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x071a2b, 0.94);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x456d93, 0.55);
    this.graphics.strokeRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x2b4c6d, 0.24);
    for (let x = map.x + map.width / 12; x < map.x + map.width; x += map.width / 12) {
      this.graphics.lineBetween(x, map.y, x, map.y + map.height);
    }
    for (let y = map.y + map.height / 8; y < map.y + map.height; y += map.height / 8) {
      this.graphics.lineBetween(map.x, y, map.x + map.width, y);
    }
  }

  drawField(map) {
    const cols = FLOW_DEMO_GRID.width;
    const rows = FLOW_DEMO_GRID.height;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const nx = (col + 0.5) / cols;
        const ny = (row + 0.5) / rows;
        if (isDemoLand(this.terrain, nx, ny)) continue;
        const flow = sampleDemoFlow({ ...this.fieldConfig(), x: nx, y: ny, time: this.demoTime });
        const magnitude = Math.min(1.2, Math.hypot(flow.u, flow.v));
        const point = this.toScreen(map, nx, ny);
        const angle = Math.atan2(flow.v, flow.u);
        const length = 12 + magnitude * 22;
        const color = modeColor(this.fieldMode, flow.composition?.activeRegion);
        this.drawArrow(point.x, point.y, angle, length, color, 0.36 + magnitude * 0.42);
      }
    }
  }

  drawTerrain(map) {
    if (this.terrainMode === 'none') return;
    const cols = FLOW_DEMO_GRID.width;
    const rows = FLOW_DEMO_GRID.height;
    const cellW = map.width / cols;
    const cellH = map.height / rows;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (!this.terrain?.[y]?.[x]) continue;
        this.graphics.fillStyle(0x394238, 0.94);
        this.graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
        this.graphics.lineStyle(1, 0x8aa178, 0.38);
        this.graphics.strokeRect(map.x + x * cellW, map.y + y * cellH, cellW, cellH);
      }
    }
  }

  drawArrow(x, y, angle, length, color, alpha) {
    const head = Math.max(5, length * 0.22);
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    this.graphics.lineStyle(2, color, alpha);
    this.graphics.lineBetween(x, y, endX, endY);
    this.graphics.fillStyle(color, Math.min(0.92, alpha + 0.12));
    this.graphics.fillTriangle(
      endX,
      endY,
      endX - Math.cos(angle - 0.46) * head,
      endY - Math.sin(angle - 0.46) * head,
      endX - Math.cos(angle + 0.46) * head,
      endY - Math.sin(angle + 0.46) * head
    );
  }

  drawTrails(map) {
    for (const particle of this.particles ?? []) {
      const trail = particle.trail ?? [];
      if (trail.length < 2) continue;
      for (let index = 1; index < trail.length; index += 1) {
        const prev = this.toScreen(map, trail[index - 1].x, trail[index - 1].y);
        const next = this.toScreen(map, trail[index].x, trail[index].y);
        const alpha = 0.04 + (index / trail.length) * 0.34;
        this.graphics.lineStyle(2, 0xffd166, alpha);
        this.graphics.lineBetween(prev.x, prev.y, next.x, next.y);
      }
    }
  }

  drawParticles(map) {
    for (const particle of this.particles ?? []) {
      const point = this.toScreen(map, particle.x, particle.y);
      if (point.x < map.x - 16 || point.x > map.x + map.width + 16 || point.y < map.y - 16 || point.y > map.y + map.height + 16) continue;
      const angle = particle.heading;
      const nose = 13;
      const tail = 8;
      const side = 6;
      this.graphics.fillStyle(0xffd166, 0.96);
      this.graphics.fillTriangle(
        point.x + Math.cos(angle) * nose,
        point.y + Math.sin(angle) * nose,
        point.x - Math.cos(angle) * tail + Math.cos(angle + Math.PI / 2) * side,
        point.y - Math.sin(angle) * tail + Math.sin(angle + Math.PI / 2) * side,
        point.x - Math.cos(angle) * tail + Math.cos(angle - Math.PI / 2) * side,
        point.y - Math.sin(angle) * tail + Math.sin(angle - Math.PI / 2) * side
      );
      this.graphics.lineStyle(1, 0x06101d, 0.75);
      this.graphics.strokeTriangle(
        point.x + Math.cos(angle) * nose,
        point.y + Math.sin(angle) * nose,
        point.x - Math.cos(angle) * tail + Math.cos(angle + Math.PI / 2) * side,
        point.y - Math.sin(angle) * tail + Math.sin(angle + Math.PI / 2) * side,
        point.x - Math.cos(angle) * tail + Math.cos(angle - Math.PI / 2) * side,
        point.y - Math.sin(angle) * tail + Math.sin(angle - Math.PI / 2) * side
      );
    }
  }

  layoutText({ margin, top, map }) {
    this.titleText?.setPosition(margin, top);
    this.subtitleText?.setPosition(margin, top + 42);
    this.subtitleText?.setWordWrapWidth(Math.min(760, map.width));
    const preset = getFlowDemoPresetConfig(this.fieldMode, this.preset);
    const secondary = getFlowDemoPresetConfig(this.fieldMode, this.secondaryPreset);
    const secondaryText = ['blended', 'partitioned'].includes(this.fieldMode) ? ` + ${secondary.label}` : '';
    const centerSample = sampleDemoFlow({ ...this.fieldConfig(), x: 0.5, y: 0.5, time: this.demoTime });
    this.statusText?.setText(`Mode: ${fieldModeLabel(this.fieldMode)} | Preset: ${preset?.label ?? 'Current Field'}${secondaryText} | Demo time: ${this.demoTime.toFixed(1)} hr | Time Speed: ${this.timeSpeedScale}x | Sample: (${centerSample.u.toFixed(2)}, ${centerSample.v.toFixed(2)}) | Terrain: ${terrainModeLabel(this.terrainMode)}`);
    this.statusText?.setWordWrapWidth(Math.min(980, map.width));
    this.statusText?.setPosition(margin, map.y + map.height + 18);
  }

  layoutButtons({ width, top }) {
    const y = top + 18;
    const right = width - 58;
    for (const [index, button] of this.buttons.entries()) {
      button.container.setPosition(right - index * 124, y);
    }
  }

  toScreen(map, x, y) {
    return {
      x: map.x + Number(x) * map.width,
      y: map.y + Number(y) * map.height
    };
  }

  destroyObjects() {
    this.buttons?.forEach((button) => button.destroy?.());
    this.buttons = [];
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
  }

  debugFlowSample() {
    if (!globalThis.ANCHOR_DEBUG_FLOW_DEMO) return;
    if (this.demoTime - this.lastDebugDemoTime < 1) return;
    this.lastDebugDemoTime = this.demoTime;
    const sample = sampleDemoFlow({ ...this.fieldConfig(), x: 0.5, y: 0.5, time: this.demoTime });
    globalThis.console?.debug?.('[FlowFieldsDemo][Sample]', {
      mode: fieldModeLabel(this.fieldMode),
      preset: this.preset,
      secondaryPreset: this.secondaryPreset,
      demoTime: Number(this.demoTime.toFixed(2)),
      timeSpeedScale: this.timeSpeedScale,
      center: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4)),
        magnitude: Number(Math.hypot(sample.u, sample.v).toFixed(4))
      }
    });
  }
}

function fieldModeLabel(mode) {
  return {
    static: 'Static',
    dynamic: 'Dynamic',
    blended: 'Blended',
    partitioned: 'Partitioned'
  }[mode] ?? 'Static';
}

function modeColor(mode, activeRegion = null) {
  if (mode === 'static') return 0x63e6be;
  if (mode === 'blended') return 0xf4d35e;
  if (mode === 'partitioned') return activeRegion === 'secondary' ? 0xff8c42 : 0x70d6ff;
  return 0x70d6ff;
}

function terrainModeLabel(mode) {
  return {
    none: 'No Land',
    islands: 'Random Islands',
    coastline: 'Coastline',
    channel: 'Channel'
  }[mode] ?? 'No Land';
}

function nextTerrainSeed(seed) {
  const match = String(seed ?? '').match(/^(.*?)(\d+)$/);
  if (!match) return `${seed}-2`;
  return `${match[1]}${Number(match[2]) + 1}`;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
