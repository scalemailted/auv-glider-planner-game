const TAU = Math.PI * 2;
const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 300;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    mountWidgets();
  });
}

function mountWidgets() {
  document.querySelectorAll('[data-flow-widget]').forEach((root) => {
    const type = root.dataset.flowWidget;
    if (type === 'vector-components') new VectorComponentWidget(root).mount();
    if (type === 'field-presets') new FlowPresetWidget(root).mount();
    if (type === 'particle-tracer') new ParticleTracerWidget(root).mount();
    if (type === 'time-varying-flow') new TimeVaryingFlowWidget(root).mount();
    if (type === 'additive-layers') new AdditiveLayersWidget(root).mount();
  });
}

class VectorComponentWidget {
  constructor(root) {
    this.root = root;
    this.u = 0.65;
    this.v = -0.35;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Vector component controls">
        <label>u horizontal
          <input data-vector-u type="range" min="-1" max="1" step="0.05" value="${this.u}" />
        </label>
        <label>v vertical
          <input data-vector-v type="range" min="-1" max="1" step="0.05" value="${this.v}" />
        </label>
      </div>
      <canvas class="lab-widget-canvas" data-flow-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Vector component canvas"></canvas>
      <div class="ca-status" data-vector-status></div>
    `;
    this.canvas = this.root.querySelector('[data-flow-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-vector-status]');
    this.root.querySelector('[data-vector-u]').addEventListener('input', (event) => {
      this.u = Number(event.target.value);
      this.draw();
    });
    this.root.querySelector('[data-vector-v]').addEventListener('input', (event) => {
      this.v = Number(event.target.value);
      this.draw();
    });
    this.draw();
  }

  draw() {
    clearCanvas(this.ctx);
    drawGrid(this.ctx);
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    const scale = 95;
    drawArrow(this.ctx, cx, cy, cx + this.u * scale, cy + this.v * scale, magnitudeColor(Math.hypot(this.u, this.v)), 4);
    drawAxisLabel(this.ctx, cx + this.u * scale + 10, cy + this.v * scale, 'F = <u, v>');
    const magnitude = Math.hypot(this.u, this.v);
    const angle = Math.atan2(this.v, this.u) * 180 / Math.PI;
    this.status.textContent = `u=${this.u.toFixed(2)} | v=${this.v.toFixed(2)} | magnitude=${magnitude.toFixed(2)} | angle=${angle.toFixed(0)} deg`;
  }
}

class FlowPresetWidget {
  constructor(root) {
    this.root = root;
    this.preset = 'uniform';
    this.scale = 1;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Flow preset controls">
        <label>Preset
          <select data-flow-preset>
            <option value="uniform">Uniform</option>
            <option value="shear">Shear</option>
            <option value="vortex">Vortex</option>
            <option value="converging">Converging</option>
            <option value="diverging">Diverging</option>
          </select>
        </label>
        <label>Magnitude scale
          <input data-flow-scale type="range" min="0.3" max="2" step="0.1" value="1" />
        </label>
        <button type="button" data-flow-reset>Reset</button>
      </div>
      <canvas class="lab-widget-canvas" data-flow-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Flow field preset canvas"></canvas>
      <div class="ca-status" data-flow-status></div>
    `;
    this.canvas = this.root.querySelector('[data-flow-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-flow-status]');
    this.root.querySelector('[data-flow-preset]').addEventListener('change', (event) => {
      this.preset = event.target.value;
      this.draw();
    });
    this.root.querySelector('[data-flow-scale]').addEventListener('input', (event) => {
      this.scale = Number(event.target.value);
      this.draw();
    });
    this.root.querySelector('[data-flow-reset]').addEventListener('click', () => {
      this.preset = 'uniform';
      this.scale = 1;
      this.root.querySelector('[data-flow-preset]').value = this.preset;
      this.root.querySelector('[data-flow-scale]').value = String(this.scale);
      this.draw();
    });
    this.draw();
  }

  draw() {
    clearCanvas(this.ctx);
    drawArrowField(this.ctx, this.preset, 0, { scale: this.scale });
    this.status.textContent = `${labelForPreset(this.preset)} flow | magnitude scale ${this.scale.toFixed(1)}x`;
  }
}

class ParticleTracerWidget {
  constructor(root) {
    this.root = root;
    this.preset = 'vortex';
    this.speed = 1;
    this.paused = false;
    this.time = 0;
    this.particles = createParticles(36, 0xF10A7);
    this.lastTimestamp = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Particle tracer controls">
        <label>Preset
          <select data-particle-preset>
            <option value="vortex">Vortex</option>
            <option value="uniform">Uniform</option>
            <option value="shear">Shear</option>
            <option value="converging">Converging</option>
            <option value="diverging">Diverging</option>
          </select>
        </label>
        <label>Speed
          <input data-particle-speed type="range" min="0.2" max="3" step="0.1" value="1" />
        </label>
        <button type="button" data-particle-toggle>Pause</button>
        <button type="button" data-particle-reset>Reset particles</button>
      </div>
      <canvas class="lab-widget-canvas" data-flow-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Particle tracer canvas"></canvas>
      <div class="ca-status" data-particle-status></div>
    `;
    this.canvas = this.root.querySelector('[data-flow-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-particle-status]');
    this.toggleButton = this.root.querySelector('[data-particle-toggle]');
    this.root.querySelector('[data-particle-preset]').addEventListener('change', (event) => {
      this.preset = event.target.value;
      this.resetParticles();
    });
    this.root.querySelector('[data-particle-speed]').addEventListener('input', (event) => {
      this.speed = Number(event.target.value);
    });
    this.toggleButton.addEventListener('click', () => {
      this.paused = !this.paused;
      this.toggleButton.textContent = this.paused ? 'Play' : 'Pause';
    });
    this.root.querySelector('[data-particle-reset]').addEventListener('click', () => this.resetParticles());
    requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  resetParticles() {
    this.time = 0;
    this.particles = createParticles(36, 0xF10A7);
    this.draw();
  }

  frame(timestamp) {
    const dt = Math.min(0.04, Math.max(0, (timestamp - this.lastTimestamp) / 1000 || 0.016));
    this.lastTimestamp = timestamp;
    if (!this.paused && !document.hidden) {
      this.time += dt;
      stepParticles(this.particles, this.preset, this.time, dt * this.speed);
    }
    this.draw();
    requestAnimationFrame((next) => this.frame(next));
  }

  draw() {
    clearCanvas(this.ctx);
    drawArrowField(this.ctx, this.preset, this.time, { scale: 0.65, alpha: 0.42 });
    drawParticles(this.ctx, this.particles);
    this.status.textContent = `${labelForPreset(this.preset)} tracer | particles ${this.particles.length} | speed ${this.speed.toFixed(1)}x`;
  }
}

class TimeVaryingFlowWidget {
  constructor(root) {
    this.root = root;
    this.preset = 'oscillating';
    this.paused = false;
    this.time = 0;
    this.lastTimestamp = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Time varying flow controls">
        <label>Dynamic preset
          <select data-time-flow-preset>
            <option value="oscillating">Oscillating uniform</option>
            <option value="rotatingVortex">Rotating vortex</option>
            <option value="pulsingShear">Pulsing shear</option>
          </select>
        </label>
        <button type="button" data-time-flow-toggle>Pause</button>
        <button type="button" data-time-flow-reset>Reset time</button>
      </div>
      <canvas class="lab-widget-canvas" data-flow-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Time varying flow canvas"></canvas>
      <div class="ca-status" data-time-flow-status></div>
    `;
    this.canvas = this.root.querySelector('[data-flow-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-time-flow-status]');
    this.toggleButton = this.root.querySelector('[data-time-flow-toggle]');
    this.root.querySelector('[data-time-flow-preset]').addEventListener('change', (event) => {
      this.preset = event.target.value;
    });
    this.toggleButton.addEventListener('click', () => {
      this.paused = !this.paused;
      this.toggleButton.textContent = this.paused ? 'Play' : 'Pause';
    });
    this.root.querySelector('[data-time-flow-reset]').addEventListener('click', () => {
      this.time = 0;
      this.draw();
    });
    requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  frame(timestamp) {
    const dt = Math.min(0.04, Math.max(0, (timestamp - this.lastTimestamp) / 1000 || 0.016));
    this.lastTimestamp = timestamp;
    if (!this.paused && !document.hidden) this.time += dt;
    this.draw();
    requestAnimationFrame((next) => this.frame(next));
  }

  draw() {
    clearCanvas(this.ctx);
    drawArrowField(this.ctx, this.preset, this.time, { scale: 1 });
    this.status.textContent = `${dynamicLabel(this.preset)} | deterministic clock t=${this.time.toFixed(1)}s`;
  }
}

class AdditiveLayersWidget {
  constructor(root) {
    this.root = root;
    this.layers = {
      vortex: true,
      shear: true,
      converging: false
    };
    this.weights = {
      vortex: 0.55,
      shear: 0.55,
      converging: 0.45
    };
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Additive flow layer controls">
        ${layerControlHtml('vortex', 'Vortex layer', this.weights.vortex, this.layers.vortex)}
        ${layerControlHtml('shear', 'Shear layer', this.weights.shear, this.layers.shear)}
        ${layerControlHtml('converging', 'Convergence layer', this.weights.converging, this.layers.converging)}
        <button type="button" data-layer-reset>Reset</button>
      </div>
      <canvas class="lab-widget-canvas" data-flow-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Additive flow layers canvas"></canvas>
      <div class="ca-status" data-layer-status></div>
    `;
    this.canvas = this.root.querySelector('[data-flow-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-layer-status]');
    this.root.querySelectorAll('[data-layer-toggle]').forEach((input) => {
      input.addEventListener('change', (event) => {
        this.layers[event.target.dataset.layerToggle] = event.target.checked;
        this.draw();
      });
    });
    this.root.querySelectorAll('[data-layer-weight]').forEach((input) => {
      input.addEventListener('input', (event) => {
        this.weights[event.target.dataset.layerWeight] = Number(event.target.value);
        this.draw();
      });
    });
    this.root.querySelector('[data-layer-reset]').addEventListener('click', () => {
      this.layers = { vortex: true, shear: true, converging: false };
      this.weights = { vortex: 0.55, shear: 0.55, converging: 0.45 };
      this.mount();
    });
    this.draw();
  }

  draw() {
    clearCanvas(this.ctx);
    drawArrowField(this.ctx, 'additive', 0, { scale: 1, layers: this.layers, weights: this.weights });
    const active = Object.entries(this.layers).filter(([, enabled]) => enabled).map(([key]) => key).join(', ') || 'base only';
    this.status.textContent = `Active layers: ${active}. Vectors are summed, then drawn with shared scaling.`;
  }
}

function layerControlHtml(key, label, weight, checked) {
  return `
    <label>${label}
      <input data-layer-toggle="${key}" type="checkbox" ${checked ? 'checked' : ''} />
    </label>
    <label>${label} weight
      <input data-layer-weight="${key}" type="range" min="0" max="1.5" step="0.05" value="${weight}" />
    </label>
  `;
}

function clearCanvas(ctx) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#07151d';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawGrid(ctx) {
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 40; x < CANVAS_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 30; y < CANVAS_HEIGHT; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}

function drawArrowField(ctx, preset, time, options = {}) {
  drawGrid(ctx);
  const columns = 11;
  const rows = 7;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const nx = -1 + (2 * i) / (columns - 1);
      const ny = -1 + (2 * j) / (rows - 1);
      const flow = sampleFlow(preset, nx, ny, time, options);
      const px = normalizedToPixelX(nx);
      const py = normalizedToPixelY(ny);
      const scale = 32 * (options.scale ?? 1);
      drawArrow(ctx, px, py, px + flow.u * scale, py + flow.v * scale, magnitudeColor(Math.hypot(flow.u, flow.v), options.alpha), 2);
    }
  }
}

function drawArrow(ctx, x1, y1, x2, y2, color, width = 2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 8;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawAxisLabel(ctx, x, y, text) {
  ctx.fillStyle = '#e8f4f7';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText(text, x, y);
}

function drawParticles(ctx, particles) {
  particles.forEach((particle) => {
    const x = normalizedToPixelX(particle.x);
    const y = normalizedToPixelY(particle.y);
    ctx.fillStyle = '#eeb84b';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, TAU);
    ctx.fill();
    if (particle.trail.length > 1) {
      ctx.strokeStyle = 'rgba(238,184,75,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      particle.trail.forEach((point, index) => {
        const tx = normalizedToPixelX(point.x);
        const ty = normalizedToPixelY(point.y);
        if (index === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      });
      ctx.stroke();
    }
  });
}

function sampleFlow(preset, x, y, time = 0, options = {}) {
  const scale = options.scale ?? 1;
  if (preset === 'uniform') return { u: 0.72 * scale, v: 0.08 * scale };
  if (preset === 'shear') return { u: 0.72 * y * scale, v: 0.04 * scale };
  if (preset === 'vortex') return { u: -0.82 * y * scale, v: 0.82 * x * scale };
  if (preset === 'converging') return { u: -0.62 * x * scale, v: -0.62 * y * scale };
  if (preset === 'diverging') return { u: 0.62 * x * scale, v: 0.62 * y * scale };
  if (preset === 'oscillating') return { u: (0.55 + 0.35 * Math.sin(time * 1.4)) * scale, v: 0.22 * Math.cos(time) * scale };
  if (preset === 'rotatingVortex') {
    const c = Math.cos(time * 0.7);
    const s = Math.sin(time * 0.7);
    const rx = x * c - y * s;
    const ry = x * s + y * c;
    return { u: -0.78 * ry * scale, v: 0.78 * rx * scale };
  }
  if (preset === 'pulsingShear') {
    const pulse = 0.45 + 0.45 * (0.5 + 0.5 * Math.sin(time * 2));
    return { u: y * pulse * scale, v: 0.03 * scale };
  }
  if (preset === 'additive') return additiveFlow(x, y, options);
  return { u: 0, v: 0 };
}

function additiveFlow(x, y, options) {
  let u = 0.28;
  let v = 0.02;
  const layers = options.layers ?? {};
  const weights = options.weights ?? {};
  if (layers.vortex) {
    u += -0.75 * y * (weights.vortex ?? 0.5);
    v += 0.75 * x * (weights.vortex ?? 0.5);
  }
  if (layers.shear) {
    u += y * (weights.shear ?? 0.5);
  }
  if (layers.converging) {
    u += -x * (weights.converging ?? 0.5);
    v += -y * (weights.converging ?? 0.5);
  }
  return { u, v };
}

function createParticles(count, seed) {
  const rng = seededRng(seed);
  return Array.from({ length: count }, () => {
    const particle = {
      x: rng() * 1.8 - 0.9,
      y: rng() * 1.8 - 0.9,
      trail: []
    };
    particle.trail.push({ x: particle.x, y: particle.y });
    return particle;
  });
}

function stepParticles(particles, preset, time, dt) {
  particles.forEach((particle, index) => {
    const flow = sampleFlow(preset, particle.x, particle.y, time);
    particle.x += flow.u * dt * 0.55;
    particle.y += flow.v * dt * 0.55;
    if (Math.abs(particle.x) > 1.15 || Math.abs(particle.y) > 1.15) {
      const angle = (index / particles.length) * TAU;
      particle.x = Math.cos(angle) * 0.18;
      particle.y = Math.sin(angle) * 0.18;
      particle.trail = [];
    }
    particle.trail.push({ x: particle.x, y: particle.y });
    if (particle.trail.length > 34) particle.trail.shift();
  });
}

function normalizedToPixelX(x) {
  return 40 + ((x + 1) / 2) * (CANVAS_WIDTH - 80);
}

function normalizedToPixelY(y) {
  return 28 + ((y + 1) / 2) * (CANVAS_HEIGHT - 56);
}

function magnitudeColor(magnitude, alpha = 1) {
  const clamped = Math.max(0, Math.min(1, magnitude));
  const r = Math.round(65 + clamped * 173);
  const g = Math.round(214 - clamped * 30);
  const b = Math.round(176 - clamped * 105);
  return `rgba(${r},${g},${b},${alpha})`;
}

function labelForPreset(preset) {
  return {
    uniform: 'Uniform',
    shear: 'Shear',
    vortex: 'Vortex',
    converging: 'Converging',
    diverging: 'Diverging'
  }[preset] ?? preset;
}

function dynamicLabel(preset) {
  return {
    oscillating: 'Oscillating uniform',
    rotatingVortex: 'Rotating vortex',
    pulsingShear: 'Pulsing shear'
  }[preset] ?? preset;
}

function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
