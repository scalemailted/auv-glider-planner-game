import {
  advanceDemoParticles,
  createDemoParticles,
  createDefaultFlowLayer,
  createDemoTerrain,
  FLOW_DEMO_DEFAULT_LAYERS,
  FLOW_DEMO_DEFAULT_PRESETS,
  FLOW_DEMO_GRID,
  normalizeBoundaryMode,
  normalizeDynamicComplexity,
  getFlowDemoPresetConfig,
  isDemoLand,
  normalizeAdditiveLayers,
  normalizeEvolutionControls,
  normalizeTerrainMode,
  normalizeFieldMode,
  normalizeEvolutionBehavior,
  normalizeEvolutionPattern,
  normalizeSpatialMotion,
  normalizeVariationLevel,
  sampleDemoFlow,
  summarizeDemoFlowMagnitudes
} from '../../../core/demo/FlowFieldDemo.js';
import { PhaserButton } from '../ui/Button.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class FlowFieldDemoScene extends PhaserScene {
  constructor() {
    super('FlowFieldDemoScene');
    this.objects = [];
    this.buttons = [];
    this.fieldMode = 'dynamic';
    this.preset = FLOW_DEMO_DEFAULT_PRESETS.dynamic;
    this.additiveLayers = normalizeAdditiveLayers(FLOW_DEMO_DEFAULT_LAYERS);
    this.terrainMode = 'blendedCoastal';
    this.terrainSeed = 'anchor-demo-1';
    this.terrain = createDemoTerrain({ mode: this.terrainMode, seed: this.terrainSeed });
    this.evolutionSpeedScale = 1;
    this.evolutionBehavior = 'continuous';
    this.cycleDuration = 60;
    this.directionVariation = 'high';
    this.magnitudeVariation = 'high';
    this.dynamicComplexity = 'high';
    this.evolutionPattern = 'composite';
    this.spatialMotion = 'meander';
    this.spatialMotionSpeed = 1;
    this.boundaryMode = 'deflectAlongShore';
    this.magnitudeScale = 1.5;
    this.particleSpeedScale = 1;
    this.demoTime = 0;
    this.paused = false;
    this.lastDeltaSeconds = 0;
    this.lastDebugDemoTime = -Infinity;
  }

  init(data = {}) {
    this.fieldMode = normalizeFieldMode(data.fieldMode ?? data.mode ?? 'dynamic');
    this.preset = data.preset ?? FLOW_DEMO_DEFAULT_PRESETS[this.fieldMode] ?? FLOW_DEMO_DEFAULT_PRESETS.dynamic;
    this.additiveLayers = normalizeAdditiveLayers(data.additiveLayers ?? legacyAdditiveLayers(data));
    this.terrainMode = normalizeTerrainMode(data.terrainMode ?? 'blendedCoastal');
    this.terrainSeed = data.terrainSeed ?? 'anchor-demo-1';
    this.terrain = createDemoTerrain({ mode: this.terrainMode, seed: this.terrainSeed });
    this.evolutionSpeedScale = finiteNumber(data.evolutionSpeedScale ?? data.timeSpeedScale, 1);
    this.evolutionBehavior = normalizeEvolutionBehavior(data.evolutionBehavior ?? 'continuous');
    this.cycleDuration = finiteNumber(data.cycleDuration, 60);
    this.directionVariation = normalizeVariationLevel(data.directionVariation ?? 'high');
    this.magnitudeVariation = normalizeVariationLevel(data.magnitudeVariation ?? 'high');
    this.dynamicComplexity = normalizeDynamicComplexity(data.dynamicComplexity ?? 'high');
    this.evolutionPattern = normalizeEvolutionPattern(data.evolutionPattern ?? 'composite');
    this.spatialMotion = normalizeSpatialMotion(data.spatialMotion ?? 'meander');
    this.spatialMotionSpeed = finiteNumber(data.spatialMotionSpeed, 1);
    this.boundaryMode = normalizeBoundaryMode(data.boundaryMode ?? 'deflectAlongShore');
    this.magnitudeScale = finiteNumber(data.magnitudeScale, 1.5);
    this.particleSpeedScale = finiteNumber(data.particleSpeedScale, 1);
    this.demoTime = 0;
    this.paused = false;
    this.lastDeltaSeconds = 0;
    this.lastDebugDemoTime = -Infinity;
    this.particles = createDemoParticles({
      count: this.fieldMode === 'static' ? 18 : 22,
      seed: `flow-demo-${this.fieldMode}:${this.preset}:${JSON.stringify(this.additiveLayers)}`
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
    this.lastDeltaSeconds = dt;
    this.demoTime += dt * this.evolutionSpeedScale;
    advanceDemoParticles(this.particles, {
      time: this.demoTime,
      dt,
      field: sampleDemoFlow,
      fieldConfig: this.fieldConfig(),
      particleSpeedScale: this.particleSpeedScale
    });
    this.debugFlowSample();
    this.draw();
  }

  title() {
    return 'Flow Fields Demo';
  }

  subtitle() {
    if (this.fieldMode === 'static') return 'Static fields hold direction and magnitude while particles reveal flow structure.';
    return 'Dynamic fields continuously morph F(x,y,t), changing direction and magnitude over simulated time.';
  }

  renderConsole() {
    const primaryConfig = getFlowDemoPresetConfig(this.fieldMode, this.preset);
    this.app.console?.renderFlowDemoControls?.({
      title: this.title(),
      fieldMode: this.fieldMode,
      preset: this.preset,
      additiveLayers: this.additiveLayers,
      terrainMode: this.terrainMode,
      terrainSeed: this.terrainSeed,
      evolutionSpeedScale: this.evolutionSpeedScale,
      evolutionBehavior: this.evolutionBehavior,
      cycleDuration: this.cycleDuration,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      dynamicComplexity: this.dynamicComplexity,
      evolutionPattern: this.evolutionPattern,
      spatialMotion: this.spatialMotion,
      spatialMotionSpeed: this.spatialMotionSpeed,
      boundaryMode: this.boundaryMode,
      magnitudeScale: this.magnitudeScale,
      particleSpeedScale: this.particleSpeedScale,
      magnitudeStats: summarizeDemoFlowMagnitudes(this.fieldConfig(), this.demoTime),
      presetConfig: primaryConfig,
      status: `${fieldModeLabel(this.fieldMode)} field`,
      time: this.demoTime,
      paused: this.paused
    }, {
      fieldMode: (fieldMode) => this.scene.restart({ ...this.sceneConfig(), fieldMode }),
      preset: (preset) => this.scene.restart({ ...this.sceneConfig(), preset }),
      addLayer: () => this.scene.restart({
        ...this.sceneConfig(),
        additiveLayers: addLayer(this.additiveLayers, this.preset)
      }),
      updateLayer: (id, patch) => this.scene.restart({
        ...this.sceneConfig(),
        additiveLayers: updateLayer(this.additiveLayers, id, patch)
      }),
      removeLayer: (id) => this.scene.restart({
        ...this.sceneConfig(),
        additiveLayers: removeLayer(this.additiveLayers, id)
      }),
      terrainMode: (terrainMode) => this.scene.restart({ ...this.sceneConfig(), terrainMode }),
      resetTerrain: () => this.scene.restart({ ...this.sceneConfig(), terrainSeed: nextTerrainSeed(this.terrainSeed) }),
      evolutionSpeedScale: (evolutionSpeedScale) => {
        this.evolutionSpeedScale = Number(evolutionSpeedScale) || 1;
        this.renderConsole();
      },
      evolutionBehavior: (evolutionBehavior) => {
        this.evolutionBehavior = normalizeEvolutionBehavior(evolutionBehavior);
        this.renderConsole();
      },
      cycleDuration: (cycleDuration) => {
        this.cycleDuration = finiteNumber(cycleDuration, 60);
        this.renderConsole();
      },
      directionVariation: (directionVariation) => {
        this.directionVariation = normalizeVariationLevel(directionVariation);
        this.renderConsole();
      },
      magnitudeVariation: (magnitudeVariation) => {
        this.magnitudeVariation = normalizeVariationLevel(magnitudeVariation);
        this.renderConsole();
      },
      dynamicComplexity: (dynamicComplexity) => {
        this.dynamicComplexity = normalizeDynamicComplexity(dynamicComplexity);
        this.renderConsole();
      },
      evolutionPattern: (evolutionPattern) => {
        this.evolutionPattern = normalizeEvolutionPattern(evolutionPattern);
        this.renderConsole();
      },
      spatialMotion: (spatialMotion) => {
        this.spatialMotion = normalizeSpatialMotion(spatialMotion);
        this.renderConsole();
      },
      spatialMotionSpeed: (spatialMotionSpeed) => {
        this.spatialMotionSpeed = finiteNumber(spatialMotionSpeed, 1);
        this.renderConsole();
      },
      boundaryMode: (boundaryMode) => {
        this.boundaryMode = normalizeBoundaryMode(boundaryMode);
        this.renderConsole();
      },
      magnitudeScale: (magnitudeScale) => {
        this.magnitudeScale = Number(magnitudeScale) || 1;
        this.renderConsole();
      },
      particleSpeedScale: (particleSpeedScale) => {
        this.particleSpeedScale = Number(particleSpeedScale) || 1;
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
      additiveLayers: this.additiveLayers,
      terrain: this.terrain,
      ...normalizeEvolutionControls({
        directionVariation: this.directionVariation,
        magnitudeVariation: this.magnitudeVariation,
        dynamicComplexity: this.dynamicComplexity,
        evolutionPattern: this.evolutionPattern,
        evolutionBehavior: this.evolutionBehavior,
        cycleDuration: this.cycleDuration,
        spatialMotion: this.spatialMotion,
        spatialMotionSpeed: this.spatialMotionSpeed
      }),
      boundaryMode: this.boundaryMode
    };
  }

  sceneConfig() {
    return {
      fieldMode: this.fieldMode,
      preset: this.preset,
      additiveLayers: this.additiveLayers,
      terrainMode: this.terrainMode,
      terrainSeed: this.terrainSeed,
      evolutionSpeedScale: this.evolutionSpeedScale,
      evolutionBehavior: this.evolutionBehavior,
      cycleDuration: this.cycleDuration,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      dynamicComplexity: this.dynamicComplexity,
      evolutionPattern: this.evolutionPattern,
      spatialMotion: this.spatialMotion,
      spatialMotionSpeed: this.spatialMotionSpeed,
      boundaryMode: this.boundaryMode,
      magnitudeScale: this.magnitudeScale,
      particleSpeedScale: this.particleSpeedScale
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
        const rawMagnitude = Math.hypot(flow.u, flow.v);
        const magnitude = Math.min(1.35, rawMagnitude);
        const point = this.toScreen(map, nx, ny);
        const angle = Math.atan2(flow.v, flow.u);
        const length = 5 + Math.max(0, magnitude) * 24 * this.magnitudeScale;
        const color = modeColor(this.fieldMode, flow.composition?.activeRegion);
        this.drawArrow(point.x, point.y, angle, length, color, 0.26 + Math.min(0.62, magnitude * 0.5), 1.2 + magnitude * 2.1);
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

  drawArrow(x, y, angle, length, color, alpha, thickness = 2) {
    const head = Math.max(5, length * 0.22);
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    this.graphics.lineStyle(thickness, color, alpha);
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
    const layerText = ` | Layers: ${formatLayerSummary(this.additiveLayers)}`;
    const centerSample = sampleDemoFlow({ ...this.fieldConfig(), x: 0.5, y: 0.5, time: this.demoTime });
    const stats = summarizeDemoFlowMagnitudes(this.fieldConfig(), this.demoTime);
    const evolutionText = this.fieldMode === 'dynamic'
      ? ` | Evolution: ${evolutionBehaviorLabel(this.evolutionBehavior)}${this.evolutionBehavior === 'looping' ? ` ${this.cycleDuration}s` : ''} | Spatial: ${spatialMotionLabel(this.spatialMotion)} | Complexity: ${dynamicComplexityLabel(this.dynamicComplexity)} | Direction: ${variationLabel(this.directionVariation)} | Magnitude: ${variationLabel(this.magnitudeVariation)} | Pattern: ${evolutionPatternLabel(this.evolutionPattern)}`
      : '';
    const modePrefix = this.fieldMode === 'dynamic' ? 'Continuous F(x,y,t)' : 'Fixed F(x,y,0)';
    this.statusText?.setText(`${modePrefix} | Mode: ${fieldModeLabel(this.fieldMode)} | Base Flow Field: ${preset?.label ?? 'Current Field'}${layerText}${evolutionText} | Boundary: ${boundaryModeLabel(this.boundaryMode)} | Demo Time: ${this.demoTime.toFixed(1)} | Evolution Speed: ${this.evolutionSpeedScale}x | Particle Speed: ${this.particleSpeedScale}x | Magnitude Scale: ${this.magnitudeScale}x | Mag min/mean/max: ${stats.min.toFixed(2)} / ${stats.mean.toFixed(2)} / ${stats.max.toFixed(2)} | Sample: (${centerSample.u.toFixed(2)}, ${centerSample.v.toFixed(2)}) mag ${Math.hypot(centerSample.u, centerSample.v).toFixed(2)} | Terrain: ${terrainModeLabel(this.terrainMode)}`);
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
    const futureSample = sampleDemoFlow({ ...this.fieldConfig(), x: 0.5, y: 0.5, time: this.demoTime + 1 });
    const composition = sample.composition ?? {};
    globalThis.console?.debug?.('[FlowDemo][DynamicFieldSample]', {
      mode: fieldModeLabel(this.fieldMode),
      basePreset: this.preset,
      preset: this.preset,
      layers: this.additiveLayers,
      demoTime: Number(this.demoTime.toFixed(2)),
      evolutionSpeed: this.evolutionSpeedScale,
      evolutionBehavior: this.evolutionBehavior,
      cycleDuration: this.cycleDuration,
      spatialMotion: this.spatialMotion,
      spatialMotionSpeed: this.spatialMotionSpeed,
      particleSpeed: this.particleSpeedScale,
      magnitudeScale: this.magnitudeScale,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      dynamicComplexity: this.dynamicComplexity,
      evolutionPattern: this.evolutionPattern,
      boundaryMode: this.boundaryMode,
      magnitudeStats: summarizeDemoFlowMagnitudes(this.fieldConfig(), this.demoTime),
      center: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4)),
        magnitude: Number(Math.hypot(sample.u, sample.v).toFixed(4))
      }
    });
    globalThis.console?.debug?.('[FlowDemo][FixedPointEvolution]', {
      mode: this.fieldMode,
      baseField: this.preset,
      point: { x: 0.5, y: 0.5 },
      t0: Number(this.demoTime.toFixed(2)),
      t1: Number((this.demoTime + 1).toFixed(2)),
      evolutionSpeed: this.evolutionSpeedScale,
      evolutionBehavior: this.evolutionBehavior,
      cycleDuration: this.cycleDuration,
      spatialMotion: this.spatialMotion,
      particleSpeed: this.particleSpeedScale,
      magnitudeScale: this.magnitudeScale,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      dynamicComplexity: this.dynamicComplexity,
      boundaryMode: this.boundaryMode,
      t0Vector: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4)),
        magnitude: Number(Math.hypot(sample.u, sample.v).toFixed(4))
      },
      t1Vector: {
        u: Number(futureSample.u.toFixed(4)),
        v: Number(futureSample.v.toFixed(4)),
        magnitude: Number(Math.hypot(futureSample.u, futureSample.v).toFixed(4))
      },
      deltaU: Number((futureSample.u - sample.u).toFixed(4)),
      deltaV: Number((futureSample.v - sample.v).toFixed(4)),
      deltaMagnitude: Number((Math.hypot(futureSample.u, futureSample.v) - Math.hypot(sample.u, sample.v)).toFixed(4))
    });
    globalThis.console?.debug?.('[FlowDemo][ContinuousEvolution]', {
      mode: this.fieldMode,
      demoTime: Number(this.demoTime.toFixed(3)),
      evolutionSpeed: this.evolutionSpeedScale,
      evolutionBehavior: this.evolutionBehavior,
      cycleDuration: this.cycleDuration,
      spatialMotion: this.spatialMotion,
      particleSpeed: this.particleSpeedScale,
      magnitudeScale: this.magnitudeScale,
      point: { x: 0.5, y: 0.5 },
      vector: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4))
      },
      magnitude: Number(Math.hypot(sample.u, sample.v).toFixed(4)),
      angle: Number(Math.atan2(sample.v, sample.u).toFixed(4)),
      evolution: sample.composition?.evolution ?? null
    });
    globalThis.console?.debug?.('[FlowDemo][TimeState]', {
      demoTime: Number(this.demoTime.toFixed(3)),
      evolutionSpeed: this.evolutionSpeedScale,
      particleSpeed: this.particleSpeedScale,
      magnitudeScale: this.magnitudeScale,
      deltaSeconds: Number((this.lastDeltaSeconds ?? 0).toFixed(4)),
      arrowRedrawOnly: false
    });
    globalThis.console?.debug?.('[FlowDemo][EvolutionState]', {
      mode: this.fieldMode,
      evolutionBehavior: this.evolutionBehavior,
      demoTime: Number(this.demoTime.toFixed(3)),
      evolutionSpeed: this.evolutionSpeedScale,
      cycleDuration: this.cycleDuration,
      spatialMotion: this.spatialMotion,
      spatialMotionSpeed: this.spatialMotionSpeed,
      directionVariation: this.directionVariation,
      magnitudeVariation: this.magnitudeVariation,
      dynamicComplexity: this.dynamicComplexity,
      boundaryMode: this.boundaryMode,
      sampleVectorAtCenter: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4))
      },
      magnitudeAtCenter: Number(Math.hypot(sample.u, sample.v).toFixed(4))
    });
    globalThis.console?.debug?.('[FlowDemo][MagnitudeStats]', {
      ...summarizeDemoFlowMagnitudes(this.fieldConfig(), this.demoTime),
      time: Number(this.demoTime.toFixed(2))
    });
    globalThis.console?.debug?.('[FlowDemo][LayerComposition]', {
      baseFieldId: this.preset,
      layers: this.additiveLayers,
      samplePoint: { x: 0.5, y: 0.5 },
      baseVector: composition.base ? {
        u: Number(composition.base.u.toFixed(4)),
        v: Number(composition.base.v.toFixed(4)),
        magnitude: Number(Math.hypot(composition.base.u, composition.base.v).toFixed(4))
      } : null,
      layerVectors: (composition.layers ?? []).map((layer) => ({
        id: layer.id,
        preset: layer.preset,
        weight: layer.weight,
        influence: layer.influence,
        influenceAtPoint: Number((layer.influenceScale ?? 1).toFixed(4)),
        vector: {
          u: Number(layer.vector.u.toFixed(4)),
          v: Number(layer.vector.v.toFixed(4)),
          magnitude: Number(layer.vector.magnitude.toFixed(4))
        }
      })),
      finalVector: {
        u: Number(sample.u.toFixed(4)),
        v: Number(sample.v.toFixed(4))
      },
      finalMagnitude: Number(Math.hypot(sample.u, sample.v).toFixed(4))
    });
    for (const layer of composition.layers ?? []) {
      globalThis.console?.debug?.('[FlowDemo][LayerEvolution]', {
        layerId: layer.id,
        presetId: layer.preset,
        evolutionBehavior: layer.evolution?.evolutionBehavior ?? layer.evolutionBehavior,
        layerTime: Number(this.demoTime.toFixed(3)),
        spatialMotion: layer.evolution?.spatialMotion ?? layer.spatialMotion,
        spatialOffset: layer.vector?.spatialOffset ?? null,
        vector: {
          u: Number(layer.vector.u.toFixed(4)),
          v: Number(layer.vector.v.toFixed(4))
        },
        magnitude: Number(layer.vector.magnitude.toFixed(4))
      });
    }
  }
}

function fieldModeLabel(mode) {
  return {
    static: 'Static',
    dynamic: 'Dynamic'
  }[mode] ?? 'Static';
}

function modeColor(mode, activeRegion = null) {
  if (mode === 'static') return 0x63e6be;
  return 0x70d6ff;
}

function terrainModeLabel(mode) {
  return {
    blendedCoastal: 'Blended Coastal Map',
    coastIslands: 'Coast + Islands',
    coastalEstuary: 'Coastal Estuary',
    channelIslands: 'Channel + Islands',
    none: 'No Land',
    islands: 'Random Islands',
    coastline: 'Coastline',
    channel: 'Channel',
    bayPocket: 'Bay / Pocket',
    islandChain: 'Island Chain'
  }[mode] ?? 'No Land';
}

function variationLabel(level) {
  return {
    off: 'Off',
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[level] ?? 'Medium';
}

function dynamicComplexityLabel(level) {
  return {
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[level] ?? 'High';
}

function boundaryModeLabel(mode) {
  return {
    none: 'None',
    riskOnly: 'Risk Only',
    dampenIntoLand: 'Dampen Into Land',
    deflectAlongShore: 'Deflect Along Shore'
  }[mode] ?? 'Deflect Along Shore';
}

function evolutionPatternLabel(pattern) {
  return {
    tidalCycle: 'Tidal Cycle',
    meanderingJet: 'Meandering Jet',
    eddyDrift: 'Eddy Drift',
    stormPulse: 'Storm Pulse',
    composite: 'Composite'
  }[pattern] ?? 'Composite';
}

function evolutionBehaviorLabel(behavior) {
  return {
    continuous: 'Continuous',
    looping: 'Looping',
    pulse: 'One-Shot Pulse',
    translating: 'Meandering / Translating'
  }[behavior] ?? 'Continuous';
}

function spatialMotionLabel(motion) {
  return {
    none: 'Off',
    driftEast: 'Drift East',
    driftWest: 'Drift West',
    driftNorth: 'Drift North',
    driftSouth: 'Drift South',
    circularDrift: 'Circular Drift',
    meander: 'Meander'
  }[motion] ?? 'Off';
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

function updateLayer(layers, id, patch = {}) {
  const next = normalizeAdditiveLayers(layers);
  const layerIndex = next.findIndex((layer) => layer.id === id);
  if (layerIndex < 0) return next;
  next[layerIndex] = normalizeAdditiveLayers([{ ...next[layerIndex], ...patch }])[0];
  return next;
}

function addLayer(layers, basePreset) {
  const next = normalizeAdditiveLayers(layers);
  if (next.length >= 4) return next;
  return [...next, createDefaultFlowLayer(next, basePreset)];
}

function removeLayer(layers, id) {
  return normalizeAdditiveLayers(layers).filter((layer) => layer.id !== id);
}

function legacyAdditiveLayers(data = {}) {
  if (!data || data.fieldMode !== 'blended') return FLOW_DEMO_DEFAULT_LAYERS;
  return [
    { id: 'layer1', preset: data.secondaryPreset ?? 'eddyField', weight: Math.max(0, Math.min(1, 1 - finiteNumber(data.blendWeight, 0.6))), enabled: true, influence: 'global' },
  ];
}

function formatLayerSummary(layers = []) {
  const enabled = normalizeAdditiveLayers(layers).filter((layer) => layer.enabled);
  if (!enabled.length) return 'none';
  return enabled.map((layer) => `${getFlowDemoPresetConfig('dynamic', layer.preset).label} ${layer.weight.toFixed(2)}x`).join(', ');
}
