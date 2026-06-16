const CANVAS_WIDTH = 560;
const CANVAS_HEIGHT = 320;
const GRID_WIDTH = 12;
const GRID_HEIGHT = 8;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    mountSamplingActionWidget('priority-vs-intensity', PriorityVsIntensityWidget);
    mountSamplingActionWidget('priority-to-action', PriorityToActionWidget);
    mountSamplingActionWidget('current-assist', CurrentAssistWidget);
    mountSamplingActionWidget('redundancy', RedundancyWidget);
  });
}

function mountSamplingActionWidget(name, WidgetClass) {
  document.querySelectorAll(`[data-sampling-action-widget="${name}"]`).forEach((root) => {
    const widget = new WidgetClass(root);
    widget.mount();
  });
}

class PriorityVsIntensityWidget {
  constructor(root) {
    this.root = root;
    this.weights = {
      value: 0.55,
      uncertainty: 0.75,
      boundary: 0.6,
      staleness: 0.45,
      hazard: 0.85
    };
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Event intensity versus sampling priority controls">
        ${rangeHtml('value', 'Value weight', this.weights.value, 'data-action-value-weight')}
        ${rangeHtml('uncertainty', 'Uncertainty weight', this.weights.uncertainty, 'data-action-uncertainty-weight')}
        ${rangeHtml('boundary', 'Boundary weight', this.weights.boundary, 'data-action-boundary-weight')}
        ${rangeHtml('staleness', 'Staleness weight', this.weights.staleness, 'data-action-staleness-weight')}
        ${rangeHtml('hazard', 'Hazard penalty', this.weights.hazard, 'data-action-hazard-weight')}
      </div>
      <canvas class="lab-widget-canvas" data-sampling-action-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Event intensity and sampling priority maps"></canvas>
      <div class="ca-status" data-sampling-action-status></div>
    `;
    this.canvas = this.root.querySelector('[data-sampling-action-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-sampling-action-status]');
    this.root.querySelectorAll('[data-action-weight]').forEach((input) => {
      input.addEventListener('input', (event) => {
        this.weights[event.target.dataset.actionWeight] = Number(event.target.value);
        this.draw();
      });
    });
    this.draw();
  }

  draw() {
    const fields = buildPriorityFields(this.weights);
    clearCanvas(this.ctx);
    drawFieldPanel(this.ctx, fields.intensity, { x: 24, y: 42, width: 230, height: 190, title: 'eventIntensity', palette: 'blue' });
    drawHazardOverlay(this.ctx, fields.hazard, { x: 24, y: 42, width: 230, height: 190 });
    drawFieldPanel(this.ctx, fields.priority, { x: 306, y: 42, width: 230, height: 190, title: 'A_global', palette: 'gold' });
    drawCandidateMarkers(this.ctx, topCells(fields.priority, 4), { x: 306, y: 42, width: 230, height: 190 });
    drawPanelLegend(this.ctx, 24, 256, ['blue: event intensity', 'red: hazard']);
    drawPanelLegend(this.ctx, 306, 256, ['gold: sampling priority', 'numbers: candidates']);
    const bestIntensity = maxCell(fields.intensity);
    const bestPriority = maxCell(fields.priority);
    this.status.textContent = `Weights value=${this.weights.value.toFixed(2)}, uncertainty=${this.weights.uncertainty.toFixed(2)}, boundary=${this.weights.boundary.toFixed(2)}, staleness=${this.weights.staleness.toFixed(2)}, hazard=${this.weights.hazard.toFixed(2)}. Brightest event cell (${bestIntensity.x}, ${bestIntensity.y}) score ${bestIntensity.value.toFixed(2)}; top A_global candidate (${bestPriority.x}, ${bestPriority.y}) score ${bestPriority.value.toFixed(2)}. The top sample can shift toward uncertainty, boundaries, or stale cells.`;
  }
}

class PriorityToActionWidget {
  constructor(root) {
    this.root = root;
    this.weights = {
      assist: 0.7,
      travel: 0.62,
      energy: 0.55,
      cross: 0.48
    };
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Sampling priority to glider action value controls">
        ${rangeHtml('assist', 'Current assist', this.weights.assist, 'data-action-assist-weight')}
        ${rangeHtml('travel', 'Travel cost', this.weights.travel, 'data-action-travel-weight')}
        ${rangeHtml('energy', 'Energy cost', this.weights.energy, 'data-action-energy-weight')}
        ${rangeHtml('cross', 'Cross-current risk', this.weights.cross, 'data-action-cross-weight')}
      </div>
      <canvas class="lab-widget-canvas" data-sampling-action-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="A_global and Q_glider maps"></canvas>
      <div class="ca-status" data-sampling-action-status></div>
    `;
    this.canvas = this.root.querySelector('[data-sampling-action-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-sampling-action-status]');
    this.root.querySelectorAll('[data-action-weight]').forEach((input) => {
      input.addEventListener('input', (event) => {
        this.weights[event.target.dataset.actionWeight] = Number(event.target.value);
        this.draw();
      });
    });
    this.draw();
  }

  draw() {
    const action = buildActionFields(this.weights);
    clearCanvas(this.ctx);
    const left = { x: 24, y: 42, width: 230, height: 190 };
    const right = { x: 306, y: 42, width: 230, height: 190 };
    drawFieldPanel(this.ctx, action.priority, { ...left, title: 'A_global', palette: 'gold' });
    drawCandidateMarkers(this.ctx, topCells(action.priority, 3), left);
    drawFieldPanel(this.ctx, action.q, { ...right, title: 'Q_glider', palette: 'green' });
    drawFlowArrows(this.ctx, action.flow, right);
    drawGlider(this.ctx, action.glider, right);
    drawCandidateMarkers(this.ctx, topCells(action.q, 4), right);
    drawPanelLegend(this.ctx, 24, 256, ['A_global: science usefulness']);
    drawPanelLegend(this.ctx, 306, 256, ['Q_glider: value for this glider', 'arrows: simplified flow']);
    const bestPriority = maxCell(action.priority);
    const bestQ = maxCell(action.q);
    this.status.textContent = `Top A_global is (${bestPriority.x}, ${bestPriority.y}); top Q_glider is (${bestQ.x}, ${bestQ.y}). Flow, travel, energyCost, and crossCurrentRisk can change the target.`;
  }
}

class CurrentAssistWidget {
  constructor(root) {
    this.root = root;
    this.flowStrength = 0.7;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Current assist and opposition controls">
        <label>Flow strength
          <input data-current-strength type="range" min="0" max="1.4" step="0.05" value="${this.flowStrength}" />
        </label>
      </div>
      <canvas class="lab-widget-canvas" data-sampling-action-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Current assist versus opposition diagram"></canvas>
      <div class="ca-status" data-sampling-action-status></div>
    `;
    this.canvas = this.root.querySelector('[data-sampling-action-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-sampling-action-status]');
    this.root.querySelector('[data-current-strength]').addEventListener('input', (event) => {
      this.flowStrength = Number(event.target.value);
      this.draw();
    });
    this.draw();
  }

  draw() {
    const glider = { x: 5.5, y: 4 };
    const flow = { u: this.flowStrength, v: 0 };
    const targets = [
      { label: 'A', x: 2, y: 3, priority: 0.92 },
      { label: 'B', x: 9, y: 4, priority: 0.68 }
    ].map((target) => {
      const values = actionValueForTarget(glider, target, flow, { assist: 0.9, travel: 0.32, energy: 0.22, cross: 0.2 });
      return { ...target, ...values };
    });
    clearCanvas(this.ctx);
    const panel = { x: 62, y: 36, width: 410, height: 205 };
    drawGridFrame(this.ctx, panel, 'current assist / opposition');
    drawFlowArrows(this.ctx, { u: this.flowStrength, v: 0 }, panel);
    drawGlider(this.ctx, glider, panel);
    targets.forEach((target) => {
      drawTarget(this.ctx, target, panel, target.label);
      drawLeg(this.ctx, glider, target, panel, target.assist >= 0 ? '#41d6b0' : '#ff718c');
    });
    drawPanelLegend(this.ctx, 52, 264, [
      `A: priority ${targets[0].priority.toFixed(2)}, Q ${targets[0].q.toFixed(2)}, currentOpposition ${Math.max(0, -targets[0].assist).toFixed(2)}`,
      `B: priority ${targets[1].priority.toFixed(2)}, Q ${targets[1].q.toFixed(2)}, currentAssist ${Math.max(0, targets[1].assist).toFixed(2)}`
    ]);
    const best = targets[0].q >= targets[1].q ? targets[0] : targets[1];
    this.status.textContent = `Best target: ${best.label}. A lower-priority target can win when currentAssist offsets travel and energyCost.`;
  }
}

class RedundancyWidget {
  constructor(root) {
    this.root = root;
    this.redundancyEnabled = true;
    this.redundancyWeight = 0.65;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Two glider redundancy controls">
        <label>Use redundancy penalty
          <input data-redundancy-toggle type="checkbox" checked />
        </label>
        <label>redundancyPenalty
          <input data-redundancy-weight type="range" min="0" max="1.2" step="0.05" value="${this.redundancyWeight}" />
        </label>
      </div>
      <canvas class="lab-widget-canvas" data-sampling-action-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Two glider redundancy preview"></canvas>
      <div class="ca-status" data-sampling-action-status></div>
    `;
    this.canvas = this.root.querySelector('[data-sampling-action-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-sampling-action-status]');
    this.root.querySelector('[data-redundancy-toggle]').addEventListener('change', (event) => {
      this.redundancyEnabled = event.target.checked;
      this.draw();
    });
    this.root.querySelector('[data-redundancy-weight]').addEventListener('input', (event) => {
      this.redundancyWeight = Number(event.target.value);
      this.draw();
    });
    this.draw();
  }

  draw() {
    const selected = { id: 'glider-a', x: 2.2, y: 5.5 };
    const teammate = { id: 'glider-b', x: 8.4, y: 2.1 };
    const targets = [
      { label: 'A', x: 8, y: 2, priority: 0.94 },
      { label: 'B', x: 5, y: 3, priority: 0.78 },
      { label: 'C', x: 3, y: 6, priority: 0.64 },
      { label: 'D', x: 9, y: 6, priority: 0.7 }
    ].map((target) => {
      const travel = clamp01(distance(selected, target) / 10);
      const teammateCoverage = clamp01(1 - distance(teammate, target) / 4);
      const redundancyPenalty = this.redundancyEnabled ? teammateCoverage * this.redundancyWeight : 0;
      const q = clamp01(0.96 * target.priority - 0.35 * travel - redundancyPenalty);
      return { ...target, travel, redundancyPenalty, q };
    }).sort((a, b) => b.q - a.q);
    clearCanvas(this.ctx);
    const panel = { x: 62, y: 36, width: 410, height: 205 };
    drawGridFrame(this.ctx, panel, 'redundancy preview');
    drawGlider(this.ctx, selected, panel, 'A');
    drawGlider(this.ctx, teammate, panel, 'B', '#69b7ff');
    targets.forEach((target, index) => {
      drawTarget(this.ctx, target, panel, String(index + 1));
    });
    drawPanelLegend(this.ctx, 52, 264, targets.slice(0, 3).map((target, index) => (
      `${index + 1}: target ${target.label}, Q ${target.q.toFixed(2)}, redundancyPenalty ${target.redundancyPenalty.toFixed(2)}`
    )));
    const best = targets[0];
    this.status.textContent = `Top target ${best.label}. With redundancy on, selected glider A avoids cells glider B can cover unless confirmation is the mission.`;
  }
}

function buildPriorityFields(weights) {
  const intensity = gridValues(GRID_WIDTH, GRID_HEIGHT, (x, y) => gaussian(x, y, 4.1, 3.5, 1.7));
  const uncertainty = gridValues(GRID_WIDTH, GRID_HEIGHT, (x, y) => clamp01(1 - Math.abs(distance({ x, y }, { x: 4.1, y: 3.5 }) - 2.25) / 1.6));
  const boundary = gridValues(GRID_WIDTH, GRID_HEIGHT, (x, y) => clamp01(Math.abs(intensity[y][x] - 0.45) < 0.18 ? 0.88 : 0.14));
  const staleness = gridValues(GRID_WIDTH, GRID_HEIGHT, (x, y) => x > 7 && y > 1 && y < 7 ? 0.82 : 0.12);
  const hazard = gridValues(GRID_WIDTH, GRID_HEIGHT, (x, y) => x >= 1 && x <= 3 && y >= 5 ? 0.85 : 0);
  const priority = normalizeField(gridValues(GRID_WIDTH, GRID_HEIGHT, (x, y) => (
    weights.value * intensity[y][x]
    + weights.uncertainty * 0.72 * uncertainty[y][x]
    + weights.boundary * 0.64 * boundary[y][x]
    + weights.staleness * 0.6 * staleness[y][x]
    - weights.hazard * hazard[y][x]
  )));
  return { intensity, uncertainty, boundary, staleness, hazard, priority };
}

function buildActionFields(weights) {
  const glider = { x: 2.2, y: 4.4 };
  const priority = normalizeField(gridValues(GRID_WIDTH, GRID_HEIGHT, (x, y) => (
    0.95 * gaussian(x, y, 8.7, 2.1, 1.5)
    + 0.72 * gaussian(x, y, 6.3, 5.8, 1.35)
    + 0.32 * gaussian(x, y, 3.8, 2.2, 1.2)
  )));
  const flow = { u: 0.7, v: 0.18 };
  const q = normalizeField(gridValues(GRID_WIDTH, GRID_HEIGHT, (x, y) => {
    const target = { x, y };
    const values = actionValueForTarget(glider, target, flow, weights);
    return 1.15 * priority[y][x] + weights.assist * Math.max(0, values.assist)
      - weights.travel * values.travel
      - weights.energy * values.energyCost
      - weights.cross * values.crossCurrentRisk;
  }));
  return { priority, q, flow, glider };
}

function actionValueForTarget(glider, target, flow, weights) {
  const leg = {
    x: target.x - glider.x,
    y: target.y - glider.y
  };
  const len = Math.max(0.001, Math.hypot(leg.x, leg.y));
  const direction = { x: leg.x / len, y: leg.y / len };
  const assist = flow.u * direction.x + flow.v * direction.y;
  const crossCurrentRisk = Math.abs(flow.u * direction.y - flow.v * direction.x);
  const travel = clamp01(len / 10);
  const energyCost = clamp01(0.54 * travel + 0.34 * Math.max(0, -assist) + 0.28 * crossCurrentRisk);
  const q = clamp01(target.priority + weights.assist * Math.max(0, assist) - weights.travel * travel - weights.energy * energyCost - weights.cross * crossCurrentRisk);
  return { assist, crossCurrentRisk, travel, energyCost, q };
}

function rangeHtml(key, label, value, extraAttribute) {
  return `
    <label>${label}
      <input ${extraAttribute} data-action-weight="${key}" type="range" min="0" max="1.2" step="0.05" value="${value}" />
    </label>
  `;
}

function clearCanvas(ctx) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#07151d';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawFieldPanel(ctx, field, panel) {
  drawGridFrame(ctx, panel, panel.title);
  const rows = field.length;
  const cols = field[0]?.length ?? 1;
  const cellW = panel.width / cols;
  const cellH = panel.height / rows;
  field.forEach((row, y) => row.forEach((value, x) => {
    ctx.fillStyle = colorForValue(value, panel.palette);
    ctx.fillRect(panel.x + x * cellW + 1, panel.y + y * cellH + 1, Math.max(0, cellW - 2), Math.max(0, cellH - 2));
  }));
}

function drawGridFrame(ctx, panel, title) {
  ctx.strokeStyle = 'rgba(42,74,88,0.95)';
  ctx.fillStyle = 'rgba(18,40,50,0.62)';
  ctx.lineWidth = 1;
  ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
  ctx.fillStyle = '#e8f4f7';
  ctx.font = '800 15px system-ui, sans-serif';
  ctx.fillText(title, panel.x, panel.y - 12);
}

function drawHazardOverlay(ctx, field, panel) {
  const rows = field.length;
  const cols = field[0]?.length ?? 1;
  const cellW = panel.width / cols;
  const cellH = panel.height / rows;
  field.forEach((row, y) => row.forEach((value, x) => {
    if (value <= 0.1) return;
    ctx.fillStyle = `rgba(255,113,140,${0.18 + value * 0.38})`;
    ctx.fillRect(panel.x + x * cellW + 1, panel.y + y * cellH + 1, Math.max(0, cellW - 2), Math.max(0, cellH - 2));
  }));
}

function drawCandidateMarkers(ctx, candidates, panel) {
  candidates.forEach((candidate, index) => {
    const point = cellToCanvas(candidate, panel);
    ctx.fillStyle = '#071116';
    ctx.strokeStyle = '#eeb84b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#eeb84b';
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), point.x, point.y);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  });
}

function drawFlowArrows(ctx, flow, panel) {
  for (let y = 1; y < GRID_HEIGHT; y += 2) {
    for (let x = 1; x < GRID_WIDTH; x += 2) {
      const start = cellToCanvas({ x, y }, panel);
      const scale = 18;
      drawArrow(ctx, start.x - flow.u * 4, start.y - flow.v * 4, start.x + flow.u * scale, start.y + flow.v * scale, 'rgba(105,183,255,0.76)');
    }
  }
}

function drawGlider(ctx, glider, panel, label = 'G', color = '#41d6b0') {
  const point = cellToCanvas(glider, panel);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#071116';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(point.x, point.y - 11);
  ctx.lineTo(point.x + 10, point.y + 10);
  ctx.lineTo(point.x - 10, point.y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#071116';
  ctx.font = '900 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, point.x, point.y + 6);
  ctx.textAlign = 'left';
}

function drawTarget(ctx, target, panel, label) {
  const point = cellToCanvas(target, panel);
  ctx.fillStyle = '#eeb84b';
  ctx.strokeStyle = '#071116';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#071116';
  ctx.font = '900 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, point.x, point.y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawLeg(ctx, glider, target, panel, color) {
  const a = cellToCanvas(glider, panel);
  const b = cellToCanvas(target, panel);
  drawArrow(ctx, a.x, a.y, b.x, b.y, color);
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 7;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
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

function drawPanelLegend(ctx, x, y, rows) {
  ctx.fillStyle = '#abc0c8';
  ctx.font = '700 12px system-ui, sans-serif';
  rows.forEach((row, index) => {
    ctx.fillText(row, x, y + index * 18);
  });
}

function cellToCanvas(point, panel) {
  return {
    x: panel.x + ((point.x + 0.5) / GRID_WIDTH) * panel.width,
    y: panel.y + ((point.y + 0.5) / GRID_HEIGHT) * panel.height
  };
}

function colorForValue(value, palette) {
  const v = clamp01(value);
  if (palette === 'blue') return `rgba(${Math.round(30 + 75 * v)}, ${Math.round(76 + 107 * v)}, ${Math.round(112 + 143 * v)}, ${0.25 + 0.72 * v})`;
  if (palette === 'green') return `rgba(${Math.round(37 + 65 * v)}, ${Math.round(98 + 156 * v)}, ${Math.round(93 + 83 * v)}, ${0.25 + 0.72 * v})`;
  return `rgba(${Math.round(70 + 168 * v)}, ${Math.round(56 + 128 * v)}, ${Math.round(34 + 41 * v)}, ${0.25 + 0.72 * v})`;
}

function gridValues(width, height, fn) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => fn(x, y)));
}

function gaussian(x, y, cx, cy, sigma) {
  return Math.exp(-(Math.hypot(x - cx, y - cy) ** 2) / (2 * sigma ** 2));
}

function normalizeField(field) {
  const values = field.flat().filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.0001, max - min);
  return field.map((row) => row.map((value) => clamp01((value - min) / range)));
}

function topCells(field, count) {
  return field.flatMap((row, y) => row.map((value, x) => ({ x, y, value })))
    .sort((a, b) => b.value - a.value)
    .filter((candidate, index, all) => all.slice(0, index).every((other) => Math.hypot(other.x - candidate.x, other.y - candidate.y) >= 2))
    .slice(0, count);
}

function maxCell(field) {
  return topCells(field, 1)[0] ?? { x: 0, y: 0, value: 0 };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
