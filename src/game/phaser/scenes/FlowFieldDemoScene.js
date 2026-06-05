import { advanceDemoParticles, createDemoParticles, FLOW_DEMO_DEFAULT_PRESETS, FLOW_DEMO_GRID, getFlowDemoPresetConfig, sampleDemoFlow } from '../../../core/demo/FlowFieldDemo.js';
import { PhaserButton } from '../ui/Button.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class FlowFieldDemoScene extends PhaserScene {
  constructor() {
    super('FlowFieldDemoScene');
    this.objects = [];
    this.buttons = [];
    this.mode = 'static';
    this.preset = FLOW_DEMO_DEFAULT_PRESETS.static;
    this.demoTime = 0;
    this.paused = false;
  }

  init(data = {}) {
    this.mode = data.mode === 'temporal' ? 'temporal' : 'static';
    this.preset = data.preset ?? FLOW_DEMO_DEFAULT_PRESETS[this.mode];
    this.demoTime = 0;
    this.paused = false;
    this.particles = createDemoParticles({
      count: this.mode === 'temporal' ? 22 : 18,
      seed: `flow-demo-${this.mode}`
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
    this.demoTime += dt;
    advanceDemoParticles(this.particles, {
      mode: this.mode,
      time: this.demoTime,
      dt,
      field: sampleDemoFlow,
      preset: this.preset
    });
    this.draw();
  }

  title() {
    return this.mode === 'temporal' ? 'Temporal Flow Field Demo' : 'Static Flow Field Demo';
  }

  subtitle() {
    return this.mode === 'temporal'
      ? 'Time-varying currents move particles through an evolving vector field.'
      : 'A fixed vector field moves particles through steady currents.';
  }

  renderConsole() {
    this.app.console?.renderFlowDemoControls?.({
      title: this.title(),
      mode: this.mode,
      preset: this.preset,
      presetConfig: getFlowDemoPresetConfig(this.mode, this.preset),
      status: this.mode === 'temporal' ? 'Time-varying field' : 'Fixed field',
      time: this.demoTime,
      paused: this.paused
    }, {
      static: () => this.scene.restart({ mode: 'static', preset: FLOW_DEMO_DEFAULT_PRESETS.static }),
      temporal: () => this.scene.restart({ mode: 'temporal', preset: FLOW_DEMO_DEFAULT_PRESETS.temporal }),
      preset: (preset) => this.scene.restart({ mode: this.mode, preset }),
      pause: () => {
        this.paused = !this.paused;
        this.renderConsole();
      },
      reset: () => this.scene.restart({ mode: this.mode }),
      menu: () => this.scene.start('MainMenuScene')
    });
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
        onClick: () => this.scene.restart({ mode: this.mode })
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
        const flow = sampleDemoFlow(this.mode, nx, ny, this.demoTime, this.preset);
        const magnitude = Math.min(1.2, Math.hypot(flow.u, flow.v));
        const point = this.toScreen(map, nx, ny);
        const angle = Math.atan2(flow.v, flow.u);
        const length = 12 + magnitude * 22;
        const color = this.mode === 'temporal' ? 0x70d6ff : 0x63e6be;
        this.drawArrow(point.x, point.y, angle, length, color, 0.36 + magnitude * 0.42);
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
    const preset = getFlowDemoPresetConfig(this.mode, this.preset);
    this.statusText?.setText(`Mode: ${this.mode} | Preset: ${preset?.label ?? 'Current Field'} | Time: ${this.demoTime.toFixed(1)} s | Particles: ${this.particles?.length ?? 0}`);
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
}
