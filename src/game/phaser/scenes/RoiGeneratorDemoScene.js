import {
  createDemoRoiField,
  roiDistributionLabel,
  sampleSpatialPatternLabel,
  sampleTemporalBehaviorLabel,
  roiDemoDistributionDefaults,
  normalizeRoiDemoDistribution,
  normalizeRoiDemoSpatialPattern,
  normalizeRoiDemoTemporalBehavior,
  normalizeRoiDemoTimeMode
} from '../../../core/demo/DemoRoiFields.js';
import { PhaserButton } from '../ui/Button.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class RoiGeneratorDemoScene extends PhaserScene {
  constructor() {
    super('RoiGeneratorDemoScene');
    this.objects = [];
    this.buttons = [];
    this.distribution = 'gaussianHotspots';
    this.seed = 'anchor-roi-demo';
    this.hotspotCount = 4;
    this.noise = 0.15;
    this.timeMode = 'static';
    this.spatialPattern = 'multiHotspot';
    this.temporalBehavior = 'periodic';
    this.forecastView = 'forecast';
    this.demoTime = 0;
    this.timeSpeedScale = 1;
    this.paused = false;
    this.field = null;
  }

  init(data = {}) {
    this.distribution = normalizeRoiDemoDistribution(data.distribution ?? 'gaussianHotspots');
    const distributionDefaults = roiDemoDistributionDefaults(this.distribution);
    this.seed = data.seed ?? 'anchor-roi-demo';
    this.hotspotCount = finiteNumber(data.hotspotCount, 4);
    this.noise = finiteNumber(data.noise, 0.15);
    this.timeMode = normalizeRoiDemoTimeMode(data.timeMode ?? 'static');
    this.spatialPattern = normalizeRoiDemoSpatialPattern(data.spatialPattern ?? distributionDefaults.spatialPattern);
    this.temporalBehavior = normalizeRoiDemoTemporalBehavior(data.temporalBehavior ?? distributionDefaults.temporalBehavior);
    this.forecastView = normalizeForecastView(data.forecastView ?? 'forecast');
    this.timeSpeedScale = finiteNumber(data.timeSpeedScale, 1);
    this.demoTime = finiteNumber(data.demoTime, 0);
    this.paused = false;
    this.rebuildField();
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'roiDemo';
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
    if (this.paused || this.timeMode !== 'dynamic') return;
    const dt = Math.min(0.05, Math.max(0, Number(delta ?? 16.67) / 1000));
    this.demoTime += dt * this.timeSpeedScale;
    this.rebuildField();
    this.draw();
  }

  title() {
    return 'ROI Generator Demo';
  }

  subtitle() {
    return 'Seeded value-field sandbox for inspecting sampling regions before they appear in missions.';
  }

  sceneConfig(overrides = {}) {
    return {
      distribution: this.distribution,
      seed: this.seed,
      hotspotCount: this.hotspotCount,
      noise: this.noise,
      timeMode: this.timeMode,
      spatialPattern: this.spatialPattern,
      temporalBehavior: this.temporalBehavior,
      forecastView: this.forecastView,
      timeSpeedScale: this.timeSpeedScale,
      demoTime: this.demoTime,
      ...overrides
    };
  }

  rebuildField() {
    this.field = createDemoRoiField(this.sceneConfig());
  }

  renderConsole() {
    this.app.console?.renderRoiDemoControls?.({
      title: this.title(),
      status: `${roiDistributionLabel(this.distribution)} field`,
      distribution: this.distribution,
      seed: this.seed,
      hotspotCount: this.hotspotCount,
      noise: this.noise,
      timeMode: this.timeMode,
      spatialPattern: this.field?.spatialPattern ?? this.spatialPattern,
      spatialPatternLabel: sampleSpatialPatternLabel(this.field?.spatialPattern ?? this.spatialPattern),
      temporalBehavior: this.field?.temporalBehavior ?? this.temporalBehavior,
      temporalBehaviorLabel: sampleTemporalBehaviorLabel(this.field?.temporalBehavior ?? this.temporalBehavior),
      forecastView: this.forecastView,
      timeSpeedScale: this.timeSpeedScale,
      time: this.demoTime,
      paused: this.paused,
      stats: this.field?.stats
    }, {
      distribution: (distribution) => {
        const defaults = roiDemoDistributionDefaults(distribution);
        this.scene.restart(this.sceneConfig({
          distribution,
          spatialPattern: defaults.spatialPattern,
          temporalBehavior: defaults.temporalBehavior,
          timeMode: defaults.temporalBehavior === 'static' ? 'static' : this.timeMode,
          demoTime: 0
        }));
      },
      seed: (seed) => {
        this.seed = String(seed ?? 'anchor-roi-demo').trim() || 'anchor-roi-demo';
        this.scene.restart(this.sceneConfig({ seed: this.seed, demoTime: 0 }));
      },
      hotspotCount: (hotspotCount) => this.scene.restart(this.sceneConfig({ hotspotCount: Number(hotspotCount), demoTime: 0 })),
      noise: (noise) => this.scene.restart(this.sceneConfig({ noise: Number(noise), demoTime: 0 })),
      timeMode: (timeMode) => this.scene.restart(this.sceneConfig({ timeMode, demoTime: 0 })),
      spatialPattern: (spatialPattern) => this.scene.restart(this.sceneConfig({ spatialPattern, demoTime: 0 })),
      temporalBehavior: (temporalBehavior) => this.scene.restart(this.sceneConfig({ temporalBehavior, timeMode: temporalBehavior === 'static' ? 'static' : 'dynamic', demoTime: 0 })),
      forecastView: (forecastView) => this.scene.restart(this.sceneConfig({ forecastView, demoTime: 0 })),
      timeSpeedScale: (timeSpeedScale) => {
        this.timeSpeedScale = Number(timeSpeedScale) || 1;
        this.renderConsole();
      },
      regenerate: () => this.scene.restart(this.sceneConfig({ seed: nextSeed(this.seed), demoTime: 0 })),
      pause: () => {
        this.paused = !this.paused;
        this.renderConsole();
      },
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
      wordWrap: { width: 760 }
    }).setOrigin(0, 0);
    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#d7f7cc'
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
        width: 126,
        label: 'Regenerate',
        onClick: () => this.scene.restart(this.sceneConfig({ seed: nextSeed(this.seed), demoTime: 0 }))
      }),
      new PhaserButton(this, {
        x: 0,
        y: 0,
        width: 112,
        label: this.paused ? 'Play' : 'Pause',
        onClick: () => {
          this.paused = !this.paused;
          this.buttons?.[2]?.setLabel(this.paused ? 'Play' : 'Pause');
          this.renderConsole();
        }
      })
    ];
  }

  layout() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(24, Math.min(52, width * 0.045));
    const top = Math.max(24, Math.min(44, height * 0.06));
    const mapTop = top + 112;
    const mapHeight = Math.max(260, height - mapTop - 62);
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
    if (!this.graphics || !this.field) return;
    const layout = this.layout();
    this.graphics.clear();
    this.drawBackground(layout);
    this.drawHeatmap(layout.map);
    this.drawHighValueMarkers(layout.map);
    this.layoutText(layout);
    this.layoutButtons(layout);
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x08101d, 0x12351f, 0x152a3c, 0x06101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x081827, 0.96);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x7ebf78, 0.52);
    this.graphics.strokeRoundedRect(map.x, map.y, map.width, map.height, 8);
  }

  drawHeatmap(map) {
    const field = this.field.field;
    const width = this.field.width;
    const height = this.field.height;
    const cellW = map.width / width;
    const cellH = map.height / height;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = Number(field[y]?.[x] ?? 0);
        const color = heatColor(value);
        this.graphics.fillStyle(color, 0.24 + value * 0.72);
        this.graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
      }
    }
    this.graphics.lineStyle(1, 0x163747, 0.28);
    for (let x = 0; x <= width; x += 1) {
      this.graphics.lineBetween(map.x + x * cellW, map.y, map.x + x * cellW, map.y + map.height);
    }
    for (let y = 0; y <= height; y += 1) {
      this.graphics.lineBetween(map.x, map.y + y * cellH, map.x + map.width, map.y + y * cellH);
    }
  }

  drawHighValueMarkers(map) {
    const width = this.field.width;
    const height = this.field.height;
    const cellW = map.width / width;
    const cellH = map.height / height;
    for (const cell of this.field.highValueCells ?? []) {
      const cx = map.x + (cell.x + 0.5) * cellW;
      const cy = map.y + (cell.y + 0.5) * cellH;
      const radius = Math.max(3, Math.min(cellW, cellH) * 0.24);
      this.graphics.lineStyle(1, 0xf7f7c6, 0.72);
      this.graphics.strokeCircle(cx, cy, radius + cell.value * 3);
      if (cell.value >= 0.88) {
        this.graphics.fillStyle(0xffffff, 0.82);
        this.graphics.fillCircle(cx, cy, Math.max(1.5, radius * 0.36));
      }
    }
  }

  layoutText({ margin, top, map }) {
    this.titleText?.setPosition(margin, top);
    this.subtitleText?.setPosition(margin, top + 42);
    this.subtitleText?.setWordWrapWidth(Math.min(780, map.width));
    const stats = this.field?.stats ?? {};
    const dynamicText = this.timeMode === 'dynamic' ? ` | Demo time: ${this.demoTime.toFixed(1)} hr | Time Speed: ${this.timeSpeedScale}x` : '';
    this.statusText?.setText(`Distribution: ${roiDistributionLabel(this.distribution)} | Pattern: ${sampleSpatialPatternLabel(this.field?.spatialPattern ?? this.spatialPattern)} | Temporal: ${sampleTemporalBehaviorLabel(this.field?.temporalBehavior ?? this.temporalBehavior)} | View: ${forecastViewLabel(this.forecastView)} | Seed: ${this.seed}${dynamicText} | Max: ${formatStat(stats.max)} | Mean: ${formatStat(stats.mean)} | Total: ${formatStat(stats.totalValue)}`);
    this.statusText?.setWordWrapWidth(Math.min(1040, map.width));
    this.statusText?.setPosition(margin, map.y + map.height + 18);
  }

  layoutButtons({ width, top }) {
    const y = top + 18;
    const right = width - 58;
    const spacing = 138;
    for (const [index, button] of this.buttons.entries()) {
      button.container.setPosition(right - index * spacing, y);
    }
  }

  destroyObjects() {
    this.buttons?.forEach((button) => button.destroy?.());
    this.buttons = [];
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
  }
}

function heatColor(value) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  if (v < 0.22) return 0x10243b;
  if (v < 0.45) return 0x1f7a8c;
  if (v < 0.68) return 0x63c56f;
  if (v < 0.84) return 0xf4d35e;
  return 0xff7b54;
}

function nextSeed(seed) {
  const match = String(seed ?? '').match(/^(.*?)(\d+)$/);
  if (!match) return `${seed}-2`;
  return `${match[1]}${Number(match[2]) + 1}`;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatStat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : 'N/A';
}

function normalizeForecastView(value) {
  return ['forecast', 'truth', 'uncertainty', 'depleted'].includes(value) ? value : 'forecast';
}

function forecastViewLabel(value) {
  return {
    forecast: 'Forecast',
    truth: 'Truth',
    uncertainty: 'Uncertainty',
    depleted: 'Depleted'
  }[value] ?? 'Forecast';
}
