const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 300;
const TAU = Math.PI * 2;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-coupled-widget]').forEach((root) => {
      const type = root.dataset.coupledWidget;
      if (type === 'flow-carried-patch') new FlowCarriedPatchWidget(root).mount();
      if (type === 'constraint-mask') new ConstraintMaskWidget(root).mount();
      if (type === 'layer-composer') new LayerComposerWidget(root).mount();
      if (type === 'reachability-timing') new ReachabilityTimingWidget(root).mount();
    });
  });
}

class FlowCarriedPatchWidget {
  constructor(root) {
    this.root = root;
    this.flow = 'uniform';
    this.paused = false;
    this.speed = 1;
    this.time = 0;
    this.lastTimestamp = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Flow-carried patch controls">
        <label>Flow preset
          <select data-patch-flow>
            <option value="none">none</option>
            <option value="uniform">uniform</option>
            <option value="shear">shear</option>
            <option value="vortex">vortex</option>
          </select>
        </label>
        <label>Speed
          <input data-patch-speed type="range" min="0.2" max="3" step="0.1" value="1" />
        </label>
        <button type="button" data-patch-toggle>Pause</button>
        <button type="button" data-patch-reset>Reset</button>
      </div>
      <canvas class="lab-widget-canvas" data-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Flow-carried process patch canvas"></canvas>
      <div class="ca-status" data-patch-status></div>
    `;
    this.canvas = this.root.querySelector('[data-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-patch-status]');
    this.toggleButton = this.root.querySelector('[data-patch-toggle]');
    this.root.querySelector('[data-patch-flow]').addEventListener('change', (event) => {
      this.flow = event.target.value;
      this.draw();
    });
    this.root.querySelector('[data-patch-speed]').addEventListener('input', (event) => {
      this.speed = Number(event.target.value);
    });
    this.toggleButton.addEventListener('click', () => {
      this.paused = !this.paused;
      this.toggleButton.textContent = this.paused ? 'Play' : 'Pause';
    });
    this.root.querySelector('[data-patch-reset]').addEventListener('click', () => {
      this.time = 0;
      this.draw();
    });
    requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  frame(timestamp) {
    const dt = Math.min(0.04, Math.max(0, (timestamp - this.lastTimestamp) / 1000 || 0.016));
    this.lastTimestamp = timestamp;
    if (!this.paused && !document.hidden) this.time += dt * this.speed;
    this.draw();
    requestAnimationFrame((next) => this.frame(next));
  }

  draw() {
    clearCanvas(this.ctx);
    drawScalarField(this.ctx, (x, y) => sampleProcess('patch', x, y, this.time, { flow: this.flow }));
    drawArrowField(this.ctx, this.flow, this.time, 0.45);
    this.status.textContent = `Flow-carried patch | flow ${this.flow} | deterministic time ${this.time.toFixed(1)}s`;
  }
}

class ConstraintMaskWidget {
  constructor(root) {
    this.root = root;
    this.mask = 'island';
    this.enabled = true;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Constraint mask controls">
        <label>Constraint
          <select data-mask-kind>
            <option value="island">island</option>
            <option value="shoreline">shoreline</option>
            <option value="channel">channel</option>
          </select>
        </label>
        <label>Apply constraints
          <input data-mask-enabled type="checkbox" checked />
        </label>
      </div>
      <canvas class="lab-widget-canvas" data-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Constraint mask objective canvas"></canvas>
      <div class="ca-status" data-mask-status></div>
    `;
    this.canvas = this.root.querySelector('[data-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-mask-status]');
    this.root.querySelector('[data-mask-kind]').addEventListener('change', (event) => {
      this.mask = event.target.value;
      this.draw();
    });
    this.root.querySelector('[data-mask-enabled]').addEventListener('change', (event) => {
      this.enabled = event.target.checked;
      this.draw();
    });
    this.draw();
  }

  draw() {
    clearCanvas(this.ctx);
    drawScalarField(this.ctx, (x, y) => {
      const processValue = sampleProcess('hotspot', x, y, 0);
      const feasible = this.enabled ? sampleConstraint(this.mask, x, y) : 1;
      return processValue * feasible;
    });
    drawMask(this.ctx, this.mask);
    this.status.textContent = `${this.enabled ? 'Constrained' : 'Unconstrained'} objective | mask ${this.mask}. Blocked cells contribute zero reachable value.`;
  }
}

class LayerComposerWidget {
  constructor(root) {
    this.root = root;
    this.process = 'hotspot';
    this.flow = 'uniform';
    this.constraint = 'island';
    this.mission = 'reachableHighValue';
    this.view = 'objective';
    this.time = 0;
    this.lastTimestamp = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Layer composer controls">
        <label>Process
          <select data-layer-process>
            <option value="hotspot">hotspot</option>
            <option value="front">moving front</option>
            <option value="patch">patch</option>
            <option value="pulse">pulse</option>
          </select>
        </label>
        <label>Flow
          <select data-layer-flow>
            <option value="none">none</option>
            <option value="uniform">uniform</option>
            <option value="shear">shear</option>
            <option value="vortex">vortex</option>
          </select>
        </label>
        <label>Constraints
          <select data-layer-constraint>
            <option value="none">none</option>
            <option value="island">island</option>
            <option value="shoreline">shoreline</option>
            <option value="channel">channel</option>
          </select>
        </label>
        <label>Mission
          <select data-layer-mission>
            <option value="highValue">high value</option>
            <option value="frontBoundary">boundary/front</option>
            <option value="reachableHighValue">reachable high value</option>
            <option value="revisitRecovery">revisit/recovery</option>
          </select>
        </label>
        <label>Layer view
          <select data-layer-view>
            <option value="process">Process</option>
            <option value="flow">Flow</option>
            <option value="constraints">Constraints</option>
            <option value="objective" selected>Objective</option>
          </select>
        </label>
      </div>
      <canvas class="lab-widget-canvas" data-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Layer composer canvas"></canvas>
      <div class="ca-status" data-layer-status></div>
    `;
    this.canvas = this.root.querySelector('[data-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-layer-status]');
    this.root.querySelector('[data-layer-process]').addEventListener('change', (event) => { this.process = event.target.value; this.draw(); });
    this.root.querySelector('[data-layer-flow]').addEventListener('change', (event) => { this.flow = event.target.value; this.draw(); });
    this.root.querySelector('[data-layer-constraint]').addEventListener('change', (event) => { this.constraint = event.target.value; this.draw(); });
    this.root.querySelector('[data-layer-mission]').addEventListener('change', (event) => { this.mission = event.target.value; this.draw(); });
    this.root.querySelector('[data-layer-view]').addEventListener('change', (event) => { this.view = event.target.value; this.draw(); });
    requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  frame(timestamp) {
    const dt = Math.min(0.04, Math.max(0, (timestamp - this.lastTimestamp) / 1000 || 0.016));
    this.lastTimestamp = timestamp;
    if (!document.hidden) this.time += dt;
    this.draw();
    requestAnimationFrame((next) => this.frame(next));
  }

  draw() {
    clearCanvas(this.ctx);
    if (this.view === 'flow') {
      drawArrowField(this.ctx, this.flow, this.time, 1);
    } else if (this.view === 'constraints') {
      drawScalarField(this.ctx, (x, y) => sampleConstraint(this.constraint, x, y));
      drawMask(this.ctx, this.constraint);
    } else {
      drawScalarField(this.ctx, (x, y) => {
        const processValue = sampleProcess(this.process, x, y, this.time, { flow: this.flow });
        if (this.view === 'process') return processValue;
        const flow = sampleFlow(this.flow, x, y, this.time);
        const constraint = sampleConstraint(this.constraint, x, y);
        return composeOracleObjective({ processValue, flowVector: flow, constraintValue: constraint, missionMode: this.mission, x, y });
      });
      if (this.view === 'objective') {
        drawArrowField(this.ctx, this.flow, this.time, 0.28);
        drawMask(this.ctx, this.constraint);
      }
    }
    this.status.textContent = `View ${this.view} | process ${this.process} | flow ${this.flow} | constraints ${this.constraint} | mission ${this.mission}`;
  }
}

class ReachabilityTimingWidget {
  constructor(root) {
    this.root = root;
    this.budget = 0.55;
    this.flowAssist = true;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Reachability timing controls">
        <label>Time budget
          <input data-reach-budget type="range" min="0.25" max="1.2" step="0.05" value="${this.budget}" />
        </label>
        <label>Flow assist
          <input data-reach-flow type="checkbox" checked />
        </label>
        <button type="button" data-reach-reset>Reset</button>
      </div>
      <canvas class="lab-widget-canvas" data-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Reachability timing canvas"></canvas>
      <div class="ca-status" data-reach-status></div>
    `;
    this.canvas = this.root.querySelector('[data-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-reach-status]');
    this.root.querySelector('[data-reach-budget]').addEventListener('input', (event) => {
      this.budget = Number(event.target.value);
      this.draw();
    });
    this.root.querySelector('[data-reach-flow]').addEventListener('change', (event) => {
      this.flowAssist = event.target.checked;
      this.draw();
    });
    this.root.querySelector('[data-reach-reset]').addEventListener('click', () => {
      this.budget = 0.55;
      this.flowAssist = true;
      this.mount();
    });
    this.draw();
  }

  draw() {
    clearCanvas(this.ctx);
    drawScalarField(this.ctx, (x, y) => sampleProcess('front', x, y, 0.7));
    const start = { x: -0.72, y: 0.55 };
    const center = { x: normalizedToPixelX(start.x), y: normalizedToPixelY(start.y) };
    const reachX = this.budget * 170 * (this.flowAssist ? 1.35 : 1);
    const reachY = this.budget * 125;
    this.ctx.strokeStyle = 'rgba(238,184,75,0.85)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.ellipse(center.x, center.y, reachX, reachY, 0, 0, TAU);
    this.ctx.stroke();
    this.ctx.fillStyle = '#eeb84b';
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, 6, 0, TAU);
    this.ctx.fill();
    drawArrowField(this.ctx, this.flowAssist ? 'uniform' : 'none', 0, 0.3);
    this.status.textContent = `Time budget ${this.budget.toFixed(2)} | flow assist ${this.flowAssist ? 'on' : 'off'} | ellipse is reachability intuition, not a planner.`;
  }
}

function clearCanvas(ctx) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#07151d';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function sampleProcess(pattern, x, y, time = 0, options = {}) {
  const flow = sampleFlow(options.flow ?? 'none', 0, 0, time);
  const shiftedX = x - flow.u * time * 0.16;
  const shiftedY = y - flow.v * time * 0.16;
  if (pattern === 'hotspot') return gaussian(x, y, 0.2, -0.1, 0.32);
  if (pattern === 'front') return clamp01(1 - Math.abs(x - (-0.25 + 0.35 * Math.sin(time * 0.7))) * 2.6);
  if (pattern === 'pulse') return gaussian(x, y, -0.15, 0.2, 0.42) * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.8)));
  return gaussian(shiftedX, shiftedY, -0.35, 0.1, 0.35) + 0.65 * gaussian(shiftedX, shiftedY, 0.35, -0.3, 0.28);
}

function sampleFlow(preset, x, y, time = 0) {
  if (preset === 'none') return { u: 0, v: 0 };
  if (preset === 'uniform') return { u: 0.7, v: 0.04 };
  if (preset === 'shear') return { u: 0.65 * y, v: 0.02 };
  if (preset === 'vortex') return { u: -0.75 * y, v: 0.75 * x };
  if (preset === 'converging') return { u: -0.6 * x, v: -0.6 * y };
  return { u: 0.25 * Math.cos(time), v: 0.18 * Math.sin(time) };
}

function sampleConstraint(mask, x, y) {
  if (mask === 'none') return 1;
  if (mask === 'island') return Math.hypot(x + 0.05, y + 0.05) < 0.32 ? 0 : 1;
  if (mask === 'shoreline') return x < -0.72 ? 0 : 1;
  if (mask === 'channel') return Math.abs(y) < 0.38 ? 1 : 0;
  return 1;
}

function composeOracleObjective({ processValue, flowVector, constraintValue, missionMode, x, y }) {
  const speed = Math.hypot(flowVector.u, flowVector.v);
  if (!constraintValue) return 0;
  if (missionMode === 'frontBoundary') return processValue * (0.65 + 0.35 * clamp01(Math.abs(x) + Math.abs(y)));
  if (missionMode === 'revisitRecovery') return processValue * (0.55 + 0.45 * Math.sin((x + y + 2) * Math.PI) ** 2);
  if (missionMode === 'reachableHighValue') return processValue * (0.8 + 0.2 * speed);
  return processValue;
}

function drawScalarField(ctx, sampler) {
  const cols = 42;
  const rows = 24;
  const cellW = CANVAS_WIDTH / cols;
  const cellH = CANVAS_HEIGHT / rows;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const x = -1 + (2 * i) / (cols - 1);
      const y = -1 + (2 * j) / (rows - 1);
      const value = clamp01(sampler(x, y));
      ctx.fillStyle = heatColor(value);
      ctx.fillRect(i * cellW, j * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
}

function drawArrowField(ctx, preset, time, alpha = 1) {
  const cols = 10;
  const rows = 6;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const x = -0.9 + (1.8 * i) / (cols - 1);
      const y = -0.82 + (1.64 * j) / (rows - 1);
      const flow = sampleFlow(preset, x, y, time);
      const px = normalizedToPixelX(x);
      const py = normalizedToPixelY(y);
      drawArrow(ctx, px, py, px + flow.u * 24, py + flow.v * 24, `rgba(232,244,247,${alpha})`);
    }
  }
}

function drawMask(ctx, mask) {
  if (mask === 'none') return;
  ctx.fillStyle = 'rgba(5,8,10,0.72)';
  ctx.strokeStyle = 'rgba(238,184,75,0.7)';
  ctx.lineWidth = 2;
  if (mask === 'island') {
    ctx.beginPath();
    ctx.arc(normalizedToPixelX(-0.05), normalizedToPixelY(-0.05), 44, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  if (mask === 'shoreline') {
    ctx.fillRect(0, 0, normalizedToPixelX(-0.72), CANVAS_HEIGHT);
    ctx.strokeRect(0, 0, normalizedToPixelX(-0.72), CANVAS_HEIGHT);
  }
  if (mask === 'channel') {
    ctx.fillRect(0, 0, CANVAS_WIDTH, normalizedToPixelY(-0.38));
    ctx.fillRect(0, normalizedToPixelY(0.38), CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeRect(0, normalizedToPixelY(-0.38), CANVAS_WIDTH, normalizedToPixelY(0.38) - normalizedToPixelY(-0.38));
  }
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 7 * Math.cos(angle - Math.PI / 6), y2 - 7 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - 7 * Math.cos(angle + Math.PI / 6), y2 - 7 * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function normalizedToPixelX(x) {
  return 34 + ((x + 1) / 2) * (CANVAS_WIDTH - 68);
}

function normalizedToPixelY(y) {
  return 26 + ((y + 1) / 2) * (CANVAS_HEIGHT - 52);
}

function gaussian(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
}

function heatColor(value) {
  const v = clamp01(value);
  const r = Math.round(22 + 225 * v);
  const g = Math.round(42 + 150 * v);
  const b = Math.round(55 + 35 * (1 - v));
  return `rgb(${r},${g},${b})`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
