import { createScalarField3d } from '../../../core/headless/runtime/HeadlessGrid.js';
import { normalizeWaterColumnConfig } from '../../../core/science/WaterColumnSchema.js';
import { createGliderMotionConfig, GLIDER_MOTION_MODEL_IDS } from '../../../core/motion/GliderMotionSchema.js';
import { simulateGliderMotionTrajectory, trajectoryMotionSummary } from '../../../core/motion/GliderTrajectorySimulator.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const MOTION_PLANNING_DEMO_VERSION = 'motion-planning-demo-motion-r1';
export const MOTION_PLANNING_GRID = Object.freeze({ width: 30, height: 20, depthLayers: ['surface', 'thermocline', 'deep'] });

export class MotionPlanningDemoScene extends PhaserScene {
  constructor() {
    super('MotionPlanningDemoScene');
    this.objects = [];
    this.sampleObjects = [];
    this.motionModelId = 'depthLayerKinematic';
    this.currentStrength = 1;
    this.crossCurrentStrength = 1;
    this.gliderSpeed = 1;
    this.headingRateLimit = 8;
    this.driftGain = 1;
    this.diveProfileId = 'sawtoothProfile';
    this.paused = false;
  }

  init(data = {}) {
    this.motionModelId = normalizeMotionModel(data.motionModelId ?? data.motionModel ?? this.motionModelId);
    this.currentStrength = clamp(Number(data.currentStrength ?? this.currentStrength), 0, 3);
    this.crossCurrentStrength = clamp(Number(data.crossCurrentStrength ?? this.crossCurrentStrength), 0, 3);
    this.gliderSpeed = clamp(Number(data.gliderSpeed ?? this.gliderSpeed), 0.25, 3);
    this.headingRateLimit = clamp(Number(data.headingRateLimit ?? this.headingRateLimit), 1, 45);
    this.driftGain = clamp(Number(data.driftGain ?? this.driftGain), 0, 3);
    this.diveProfileId = String(data.diveProfileId ?? this.diveProfileId);
    this.paused = Boolean(data.paused ?? false);
    this.rebuildMotionTrace();
  }

  create() {
    this.app = this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    if (!this.app) return;
    this.app.state.mode = 'motionPlanningDemo';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Motion Planning Demo');
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

  rebuildMotionTrace() {
    this.waterColumnConfig = normalizeWaterColumnConfig({
      depthLayerIds: MOTION_PLANNING_GRID.depthLayers,
      diveProfileId: this.diveProfileId
    });
    this.plan = defaultMotionPlan(this.diveProfileId);
    this.glider = {
      id: 'glider-motion-demo',
      start: { x: 3, y: 16, zIndex: 0, depthLayerId: 'surface' },
      speed: this.gliderSpeed,
      energyBudget: 120,
      diveProfileId: this.diveProfileId
    };
    this.fieldPack = createDemoFieldPack({
      grid: MOTION_PLANNING_GRID,
      currentStrength: this.currentStrength,
      crossCurrentStrength: this.crossCurrentStrength
    });
    this.motionConfig = createGliderMotionConfig({
      enabled: true,
      motionAware: true,
      motionModelId: this.motionModelId,
      controlStepSeconds: 45,
      gliderSpeed: this.gliderSpeed,
      headingRateLimitDegreesPerSecond: this.headingRateLimit,
      driftGain: this.driftGain,
      sampleIntervalSeconds: 90,
      energyBudget: this.glider.energyBudget
    });
    this.trace = simulateGliderMotionTrajectory({
      plan: this.plan,
      fieldPack: this.fieldPack,
      waterColumnConfig: this.waterColumnConfig,
      glider: this.glider,
      motionConfig: this.motionConfig,
      options: { seed: 'motion-planning-demo', maxSteps: 160, maxSimTime: 3600 }
    });
    this.summary = trajectoryMotionSummary(this.trace);
    this.refreshDebugObject(true);
  }

  renderConsole() {
    this.app.console?.renderMotionPlanningDemoControls?.({
      title: 'Motion Planning Demo',
      status: this.paused ? 'Paused' : 'Motion trace ready',
      motionModelId: this.motionModelId,
      currentStrength: this.currentStrength,
      crossCurrentStrength: this.crossCurrentStrength,
      gliderSpeed: this.gliderSpeed,
      headingRateLimit: this.headingRateLimit,
      driftGain: this.driftGain,
      diveProfileId: this.diveProfileId,
      summary: this.summary
    }, {
      motionModelId: (value) => this.patch({ motionModelId: normalizeMotionModel(value) }),
      currentStrength: (value) => this.patch({ currentStrength: clamp(Number(value), 0, 3) }),
      crossCurrentStrength: (value) => this.patch({ crossCurrentStrength: clamp(Number(value), 0, 3) }),
      gliderSpeed: (value) => this.patch({ gliderSpeed: clamp(Number(value), 0.25, 3) }),
      headingRateLimit: (value) => this.patch({ headingRateLimit: clamp(Number(value), 1, 45) }),
      driftGain: (value) => this.patch({ driftGain: clamp(Number(value), 0, 3) }),
      diveProfileId: (value) => this.patch({ diveProfileId: String(value ?? 'sawtoothProfile') }),
      run: () => this.patch({ paused: false }),
      pause: () => this.patch({ paused: true }),
      reset: () => this.resetDemo(),
      exportMotionJson: () => this.exportMotionJson(),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  patch(patch = {}) {
    Object.assign(this, patch);
    this.rebuildMotionTrace();
    this.renderConsole();
    this.draw();
  }

  resetDemo() {
    this.motionModelId = 'depthLayerKinematic';
    this.currentStrength = 1;
    this.crossCurrentStrength = 1;
    this.gliderSpeed = 1;
    this.headingRateLimit = 8;
    this.driftGain = 1;
    this.diveProfileId = 'sawtoothProfile';
    this.paused = false;
    this.patch({});
  }

  exportMotionJson() {
    downloadJSON('anchor.motion-planning-demo.json', {
      type: 'anchor.demo.motion-planning',
      version: MOTION_PLANNING_DEMO_VERSION,
      config: this.sceneConfig(),
      motionConfig: this.motionConfig,
      plan: this.plan,
      trajectory: this.trace,
      summary: this.summary,
      boundary: [
        'Path planning chooses waypoints. Motion planning evaluates realized glider motion under currents and control limits.',
        'Motion dynamics does not generate a route.',
        'WebGPU fluid coupling is future/optional and not used in this demo.',
        'This is not official browser scoring, a Python simulator, or MARL/RL.'
      ]
    });
    this.app?.toast?.('Motion Planning Demo JSON exported.', 'success');
  }

  sceneConfig() {
    return {
      motionModelId: this.motionModelId,
      currentStrength: this.currentStrength,
      crossCurrentStrength: this.crossCurrentStrength,
      gliderSpeed: this.gliderSpeed,
      headingRateLimit: this.headingRateLimit,
      driftGain: this.driftGain,
      diveProfileId: this.diveProfileId
    };
  }

  buildSceneObjects() {
    this.destroyObjects();
    this.graphics = this.add.graphics();
    this.titleText = this.add.text(0, 0, 'Motion Planning Demo', {
      fontFamily: 'system-ui',
      fontSize: '28px',
      fontStyle: '700',
      color: '#eef6ff'
    }).setOrigin(0, 0);
    this.subtitleText = this.add.text(0, 0, 'Same planned path, different realized trajectory under different currents.', {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#b5cbe5',
      wordWrap: { width: 900 }
    }).setOrigin(0, 0);
    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#d7f7cc',
      wordWrap: { width: 1080 }
    }).setOrigin(0, 0);
    this.objects.push(this.graphics, this.titleText, this.subtitleText, this.statusText);
  }

  layout() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(24, Math.min(52, width * 0.045));
    const top = Math.max(24, Math.min(44, height * 0.06));
    const mapTop = top + 122;
    return {
      width,
      height,
      margin,
      top,
      map: {
        x: margin,
        y: mapTop,
        width: Math.max(320, width - margin * 2),
        height: Math.max(260, height - mapTop - 96)
      }
    };
  }

  draw() {
    if (!this.graphics || !this.trace) return;
    const layout = this.layout();
    this.clearSampleObjects();
    this.graphics.clear();
    this.drawBackground(layout);
    this.drawGrid(layout.map);
    this.drawFlowArrows(layout.map);
    this.drawPlannedRoute(layout.map);
    this.drawRealizedTrajectory(layout.map);
    this.drawSamples(layout.map);
    this.layoutText(layout);
    this.refreshDebugObject(true);
  }

  drawBackground({ width, height, map }) {
    this.graphics.fillGradientStyle(0x07101d, 0x123044, 0x153328, 0x07101d, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x081827, 0.96);
    this.graphics.fillRoundedRect(map.x, map.y, map.width, map.height, 8);
    this.graphics.lineStyle(1, 0x79d8ff, 0.45);
    this.graphics.strokeRoundedRect(map.x, map.y, map.width, map.height, 8);
  }

  drawGrid(map) {
    const cellW = map.width / MOTION_PLANNING_GRID.width;
    const cellH = map.height / MOTION_PLANNING_GRID.height;
    this.graphics.lineStyle(1, 0x26344f, 0.22);
    for (let col = 0; col <= MOTION_PLANNING_GRID.width; col += 1) this.graphics.lineBetween(map.x + col * cellW, map.y, map.x + col * cellW, map.y + map.height);
    for (let row = 0; row <= MOTION_PLANNING_GRID.height; row += 1) this.graphics.lineBetween(map.x, map.y + row * cellH, map.x + map.width, map.y + row * cellH);
  }

  drawFlowArrows(map) {
    const cellW = map.width / MOTION_PLANNING_GRID.width;
    const cellH = map.height / MOTION_PLANNING_GRID.height;
    const step = 3;
    for (let row = 1; row < MOTION_PLANNING_GRID.height; row += step) {
      for (let col = 1; col < MOTION_PLANNING_GRID.width; col += step) {
        const u = Number(this.fieldPack.fields.F_u?.[0]?.[row]?.[col] ?? 0);
        const v = Number(this.fieldPack.fields.F_v?.[0]?.[row]?.[col] ?? 0);
        const magnitude = Math.hypot(u, v);
        if (magnitude <= 0.001) continue;
        const cx = map.x + (col + 0.5) * cellW;
        const cy = map.y + (row + 0.5) * cellH;
        const len = Math.min(cellW, cellH) * (0.75 + Math.min(1, magnitude * 4));
        const dx = u / magnitude * len;
        const dy = v / magnitude * len;
        this.graphics.lineStyle(1.5, 0xd8f7ff, 0.68);
        this.graphics.lineBetween(cx - dx * 0.4, cy - dy * 0.4, cx + dx * 0.4, cy + dy * 0.4);
        this.graphics.fillStyle(0xd8f7ff, 0.82);
        this.graphics.fillCircle(cx + dx * 0.4, cy + dy * 0.4, 2.5);
      }
    }
  }

  drawPlannedRoute(map) {
    const points = this.trace.plannedWaypoints ?? [];
    this.graphics.lineStyle(3, 0xffffff, 0.5);
    for (let index = 1; index < points.length; index += 1) {
      drawDashedLine(this.graphics, toCanvas(points[index - 1], map), toCanvas(points[index], map), 12, 8);
    }
    for (const point of points) {
      const canvas = toCanvas(point, map);
      this.graphics.fillStyle(0x08111f, 0.9);
      this.graphics.fillCircle(canvas.x, canvas.y, 7);
      this.graphics.lineStyle(2, 0xffffff, 0.9);
      this.graphics.strokeCircle(canvas.x, canvas.y, 7);
    }
  }

  drawRealizedTrajectory(map) {
    const points = this.trace.realizedTrack ?? [];
    if (points.length < 2) return;
    this.graphics.lineStyle(4, 0x7ce6bd, 0.95);
    for (let index = 1; index < points.length; index += 1) {
      const a = toCanvas(points[index - 1], map);
      const b = toCanvas(points[index], map);
      this.graphics.lineBetween(a.x, a.y, b.x, b.y);
    }
    const last = toCanvas(points.at(-1), map);
    this.graphics.fillStyle(0x7ce6bd, 1);
    this.graphics.fillCircle(last.x, last.y, 8);
  }

  drawSamples(map) {
    for (const observation of this.trace.sampledObservations ?? []) {
      const canvas = toCanvas(observation, map);
      this.graphics.fillStyle(0xffd166, 0.9);
      this.graphics.fillCircle(canvas.x, canvas.y, 4);
    }
  }

  layoutText({ margin, top, map }) {
    this.titleText.setPosition(margin, top);
    this.subtitleText.setPosition(margin, top + 40);
    this.subtitleText.setWordWrapWidth(Math.min(900, map.width));
    this.statusText.setPosition(margin, top + 72);
    this.statusText.setText(`Path planning chooses waypoints. Motion planning evaluates realized trajectory through currents. Mean track error ${formatStat(this.summary.meanTrackError)} | drift ${formatStat(this.summary.driftDistance)} | energy ${formatStat(this.summary.energyUsed)} | samples ${this.summary.sampledPointCount}`);
    this.statusText.setWordWrapWidth(Math.min(1080, map.width));
  }

  refreshDebugObject(active = true) {
    globalThis.ANCHOR_MOTION_PLANNING_DEMO_DEBUG = {
      version: MOTION_PLANNING_DEMO_VERSION,
      active: Boolean(active),
      motionModelId: this.motionModelId,
      plannedWaypointCount: this.trace?.plannedWaypoints?.length ?? 0,
      realizedTrackPointCount: this.trace?.realizedTrack?.length ?? 0,
      sampledPointCount: this.trace?.sampledObservations?.length ?? 0,
      meanTrackError: this.summary?.meanTrackError ?? 0,
      maxTrackError: this.summary?.maxTrackError ?? 0,
      driftDistance: this.summary?.driftDistance ?? 0,
      energyUsed: this.summary?.energyUsed ?? 0,
      usesMotionDynamics: true,
      usesNewPlanner: false,
      usesWebGPUFluid: false,
      usesMARL: false,
      changesScoring: false,
      notTopLevelMode: true
    };
  }

  destroyObjects() {
    this.clearSampleObjects();
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
  }

  clearSampleObjects() {
    this.sampleObjects?.forEach((object) => object.destroy?.());
    this.sampleObjects = [];
  }
}

function defaultMotionPlan(diveProfileId) {
  const waypoints = [
    { waypointId: 'motion-start', x: 3, y: 16, zIndex: 0, depthLayerId: 'surface', diveProfileId },
    { waypointId: 'front-entry', x: 8, y: 13, zIndex: 1, depthLayerId: 'thermocline', diveProfileId },
    { waypointId: 'cross-current-sample', x: 15, y: 10, zIndex: 2, depthLayerId: 'deep', diveProfileId },
    { waypointId: 'bloom-edge', x: 23, y: 6, zIndex: 1, depthLayerId: 'thermocline', diveProfileId },
    { waypointId: 'surface-report', x: 27, y: 4, zIndex: 0, depthLayerId: 'surface', diveProfileId, surfaceRequested: true }
  ];
  return {
    type: 'anchor.headless.waypoint-plan',
    planId: 'motion-demo-provided-route',
    gliderId: 'glider-motion-demo',
    routeAuthority: 'fixedTeachingWaypoints',
    generatesRoute: false,
    diveProfileId,
    sampleIntervalSeconds: 90,
    waypoints,
    notes: ['Provided waypoint intent for Motion Planning Demo; no route generation or optimization.']
  };
}

function createDemoFieldPack({ grid, currentStrength, crossCurrentStrength }) {
  const fieldGrid = {
    width: grid.width,
    height: grid.height,
    depthLayers: grid.depthLayers,
    depthCount: grid.depthLayers.length,
    shape: [grid.depthLayers.length, grid.height, grid.width]
  };
  const F_u = createScalarField3d(fieldGrid, 0);
  const F_v = createScalarField3d(fieldGrid, 0);
  const T_hiddenTruth = createScalarField3d(fieldGrid, 0);
  const E_forecast = createScalarField3d(fieldGrid, 0);
  const mu_belief = createScalarField3d(fieldGrid, 0);
  const U_uncertainty = createScalarField3d(fieldGrid, 0.35);
  const hazard = createScalarField3d(fieldGrid, 0);
  const constraintMask = createScalarField3d(fieldGrid, 0);
  for (let z = 0; z < fieldGrid.depthCount; z += 1) {
    const depthScale = 1 + z * 0.25;
    for (let y = 0; y < fieldGrid.height; y += 1) {
      for (let x = 0; x < fieldGrid.width; x += 1) {
        const front = Math.exp(-(((x - 17) ** 2) / 60 + ((y - 9) ** 2) / 24));
        T_hiddenTruth[z][y][x] = round(Math.min(1, 0.2 + front * (0.55 + z * 0.08)));
        E_forecast[z][y][x] = round(Math.min(1, 0.18 + front * 0.45));
        mu_belief[z][y][x] = round(Math.min(1, 0.15 + front * 0.4));
        U_uncertainty[z][y][x] = round(0.25 + 0.25 * Math.sin((x + y + z) * 0.21) ** 2);
        F_u[z][y][x] = round((0.05 + 0.015 * Math.sin(y * 0.7)) * currentStrength * depthScale);
        F_v[z][y][x] = round((0.02 * Math.sin(x * 0.35) + 0.06) * crossCurrentStrength * depthScale);
        if (x > 12 && x < 18 && y > 12) hazard[z][y][x] = 0.2;
      }
    }
  }
  return {
    type: 'anchor.headless.field-pack',
    version: MOTION_PLANNING_DEMO_VERSION,
    scenario: 'motionPlanningDemo',
    seed: 'motion-planning-demo',
    grid: fieldGrid,
    fields: { F_u, F_v, T_hiddenTruth, E_forecast, mu_belief, U_uncertainty, hazard, constraintMask },
    fieldVisibility: {
      F_u: 'publicScenario',
      F_v: 'publicScenario',
      E_forecast: 'publicScenario',
      mu_belief: 'publicScenario',
      U_uncertainty: 'publicScenario',
      hazard: 'publicScenario',
      constraintMask: 'publicScenario',
      T_hiddenTruth: 'hiddenTruth'
    },
    waterColumnConfig: normalizeWaterColumnConfig({ depthLayerIds: grid.depthLayers })
  };
}

function toCanvas(point, map) {
  return {
    x: map.x + (Number(point.x ?? 0) / Math.max(1, MOTION_PLANNING_GRID.width - 1)) * map.width,
    y: map.y + (Number(point.y ?? 0) / Math.max(1, MOTION_PLANNING_GRID.height - 1)) * map.height
  };
}

function drawDashedLine(graphics, a, b, dash = 10, gap = 6) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (!length) return;
  const ux = dx / length;
  const uy = dy / length;
  for (let distance = 0; distance < length; distance += dash + gap) {
    const start = distance;
    const end = Math.min(length, distance + dash);
    graphics.lineBetween(a.x + ux * start, a.y + uy * start, a.x + ux * end, a.y + uy * end);
  }
}

function normalizeMotionModel(value) {
  return GLIDER_MOTION_MODEL_IDS.includes(value) && value !== 'webgpuFluidFuture' ? value : 'depthLayerKinematic';
}

function formatStat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(Math.abs(number) >= 10 ? 2 : 3) : 'N/A';
}

function clamp(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}
