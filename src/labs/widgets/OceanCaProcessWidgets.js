if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    mountOceanWidget('event-intensity-vs-priority', EventIntensityPriorityWidget);
    mountOceanWidget('plume-front', PlumeFrontWidget);
    mountOceanWidget('bloom-growth-decay', BloomGrowthDecayWidget);
    mountOceanWidget('freshness-revisit', FreshnessRevisitWidget);
  });
}

function mountOceanWidget(name, WidgetClass) {
  document.querySelectorAll(`[data-ocean-ca-widget="${name}"]`).forEach((root) => {
    const widget = new WidgetClass(root);
    widget.mount();
  });
}

class EventIntensityPriorityWidget {
  constructor(root) {
    this.root = root;
    this.uncertaintyWeight = 0.5;
    this.costWeight = 0.4;
    this.stalenessWeight = 0.4;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Event intensity versus sampling priority controls">
        <label>Uncertainty <input type="range" min="0" max="1" step="0.05" value="0.5" data-priority-uncertainty /></label>
        <label>Travel cost <input type="range" min="0" max="1" step="0.05" value="0.4" data-priority-cost /></label>
        <label>Staleness <input type="range" min="0" max="1" step="0.05" value="0.4" data-priority-staleness /></label>
      </div>
      <div class="lab-card-grid two">
        <div class="lab-card"><h3>Event intensity</h3><div class="lab-widget-map" data-intensity-map></div></div>
        <div class="lab-card"><h3>Sampling priority</h3><div class="lab-widget-map priority" data-priority-map></div></div>
      </div>
      <div class="ca-status" data-priority-status></div>
    `;
    this.intensityEl = this.root.querySelector('[data-intensity-map]');
    this.priorityEl = this.root.querySelector('[data-priority-map]');
    this.status = this.root.querySelector('[data-priority-status]');
    this.root.querySelector('[data-priority-uncertainty]')?.addEventListener('input', (event) => {
      this.uncertaintyWeight = Number(event.target.value);
      this.render();
    });
    this.root.querySelector('[data-priority-cost]')?.addEventListener('input', (event) => {
      this.costWeight = Number(event.target.value);
      this.render();
    });
    this.root.querySelector('[data-priority-staleness]')?.addEventListener('input', (event) => {
      this.stalenessWeight = Number(event.target.value);
      this.render();
    });
    this.render();
  }

  render() {
    const intensity = gridValues(8, 6, (x, y) => gaussian(x, y, 2.8, 2.4, 1.6));
    const uncertainty = gridValues(8, 6, (x, y) => Math.abs(x - 4) < 2 && y > 1 && y < 5 ? 0.8 : 0.2);
    const boundary = gridValues(8, 6, (x, y) => clamp(Math.abs(intensity[y][x] - 0.5) < 0.18 ? 0.85 : 0.15, 0, 1));
    const staleness = gridValues(8, 6, (x, y) => x > 4 ? 0.8 : 0.15);
    const cost = gridValues(8, 6, (x, y) => (x + y) / 13);
    const priority = gridValues(8, 6, (x, y) => clamp(
      0.45 * intensity[y][x]
      + this.uncertaintyWeight * 0.35 * uncertainty[y][x]
      + 0.35 * boundary[y][x]
      + this.stalenessWeight * 0.3 * staleness[y][x]
      - this.costWeight * 0.45 * cost[y][x],
      0,
      1
    ));
    renderMap(this.intensityEl, intensity);
    renderMap(this.priorityEl, priority);
    const best = bestCell(priority);
    this.status.textContent = `Best priority cell is (${best.x}, ${best.y}) with score ${best.value.toFixed(2)}. It may sit on an uncertain boundary, not at the brightest center.`;
  }
}

class PlumeFrontWidget {
  constructor(root) {
    this.root = root;
    this.step = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Plume front controls">
        <button type="button" data-plume-action="step">Step front</button>
        <button type="button" data-plume-action="reset">Reset</button>
      </div>
      <div class="lab-widget-map plume" data-plume-map></div>
      <div class="ca-status" data-plume-status></div>
    `;
    this.map = this.root.querySelector('[data-plume-map]');
    this.status = this.root.querySelector('[data-plume-status]');
    this.root.addEventListener('click', (event) => {
      const action = event.target?.dataset?.plumeAction;
      if (action === 'step') {
        this.step += 1;
        this.render();
      }
      if (action === 'reset') {
        this.step = 0;
        this.render();
      }
    });
    this.render();
  }

  render() {
    const plume = gridValues(10, 6, (x, y) => {
      const centerline = 2.4 + Math.sin((x + this.step) * 0.7) * 0.7;
      const front = this.step + 2;
      const source = x <= 1 && Math.abs(y - 2) <= 1 ? 1 : 0;
      const body = x <= front ? clamp(1 - Math.abs(y - centerline) / 2.4, 0, 1) : 0;
      const edge = Math.abs(x - front) <= 1 ? 0.65 : 0;
      return clamp(Math.max(source, body * 0.75, edge * clamp(1 - Math.abs(y - centerline) / 2.2, 0, 1)), 0, 1);
    });
    renderMap(this.map, plume);
    this.status.textContent = `Generation ${this.step}: source cells feed a spreading plume body; the useful sample is often the uncertain edge.`;
  }
}

class BloomGrowthDecayWidget {
  constructor(root) {
    this.root = root;
    this.step = 0;
    this.growth = 0.55;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Bloom controls">
        <label>Growth <input type="range" min="0.2" max="0.9" step="0.05" value="0.55" data-bloom-growth /></label>
        <button type="button" data-bloom-action="step">Step</button>
        <button type="button" data-bloom-action="reset">Reset</button>
      </div>
      <div class="lab-widget-map bloom" data-bloom-map></div>
      <div class="ca-status" data-bloom-status></div>
    `;
    this.map = this.root.querySelector('[data-bloom-map]');
    this.status = this.root.querySelector('[data-bloom-status]');
    this.root.querySelector('[data-bloom-growth]')?.addEventListener('input', (event) => {
      this.growth = Number(event.target.value);
      this.render();
    });
    this.root.addEventListener('click', (event) => {
      const action = event.target?.dataset?.bloomAction;
      if (action === 'step') {
        this.step += 1;
        this.render();
      }
      if (action === 'reset') {
        this.step = 0;
        this.render();
      }
    });
    this.render();
  }

  render() {
    const radius = 1.3 + this.step * this.growth * 0.42;
    const decay = Math.max(0, this.step - 5) * 0.08;
    const bloom = gridValues(9, 6, (x, y) => clamp(1 - distance(x, y, 4, 2.8) / radius - decay + 0.12 * Math.sin((x + y + this.step) * 0.7), 0, 1));
    renderMap(this.map, bloom);
    this.status.textContent = `Generation ${this.step}: growth expands the patch; decay lowers older interior intensity and creates revisit questions.`;
  }
}

class FreshnessRevisitWidget {
  constructor(root) {
    this.root = root;
    this.age = gridValues(8, 5, (x, y) => (x + y) % 5 / 5);
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Freshness revisit controls">
        <button type="button" data-freshness-action="age">Advance time</button>
        <button type="button" data-freshness-action="sample">Sample center</button>
        <button type="button" data-freshness-action="reset">Reset</button>
      </div>
      <div class="lab-widget-map freshness" data-freshness-map></div>
      <div class="ca-status" data-freshness-status></div>
    `;
    this.map = this.root.querySelector('[data-freshness-map]');
    this.status = this.root.querySelector('[data-freshness-status]');
    this.root.addEventListener('click', (event) => {
      const action = event.target?.dataset?.freshnessAction;
      if (action === 'age') this.age = this.age.map((row) => row.map((value) => clamp(value + 0.18, 0, 1)));
      if (action === 'sample') this.sampleCenter();
      if (action === 'reset') this.age = gridValues(8, 5, (x, y) => (x + y) % 5 / 5);
      if (action) this.render();
    });
    this.render();
  }

  sampleCenter() {
    this.age = this.age.map((row, y) => row.map((value, x) => distance(x, y, 3.5, 2) <= 1.6 ? 0 : value));
  }

  render() {
    renderMap(this.map, this.age);
    const mean = this.age.flat().reduce((sum, value) => sum + value, 0) / this.age.flat().length;
    this.status.textContent = `Mean staleness ${mean.toFixed(2)}. Freshly sampled cells have low revisit value; stale cells become useful again.`;
  }
}

function renderMap(root, values) {
  const width = values[0]?.length ?? 1;
  root.style.setProperty('--lab-map-cols', width);
  root.innerHTML = values.flatMap((row) => row.map((value) => {
    const v = clamp(Number(value) || 0, 0, 1);
    return `<span class="lab-map-cell" style="--v:${v.toFixed(3)}" title="${v.toFixed(2)}"></span>`;
  })).join('');
}

function gridValues(width, height, fn) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => fn(x, y)));
}

function gaussian(x, y, cx, cy, sigma) {
  return Math.exp(-(distance(x, y, cx, cy) ** 2) / (2 * sigma ** 2));
}

function distance(x, y, cx, cy) {
  return Math.hypot(x - cx, y - cy);
}

function bestCell(values) {
  let best = { x: 0, y: 0, value: -Infinity };
  values.forEach((row, y) => row.forEach((value, x) => {
    if (value > best.value) best = { x, y, value };
  }));
  return best;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}