const MODEL_LOOP_STEPS = [
  ['State', 'What is true right now in the modeled world.'],
  ['Rule / equation', 'The assumption that changes the state.'],
  ['Next state', 'The updated world after one model step.'],
  ['Observation', 'A measurement that may be incomplete or noisy.'],
  ['Validation', 'A check against the intended behavior or evidence.']
];

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    mountModelingWidget('model-loop', ModelLoopWidget);
    mountModelingWidget('local-rule-neighborhood', LocalRuleNeighborhoodWidget);
    mountModelingWidget('deterministic-vs-stochastic', DeterministicVsStochasticWidget);
    mountModelingWidget('fuzzy-ca', FuzzyCaWidget);
  });
}

function mountModelingWidget(name, WidgetClass) {
  document.querySelectorAll(`[data-modeling-widget="${name}"]`).forEach((root) => {
    const widget = new WidgetClass(root);
    widget.mount();
  });
}

class ModelLoopWidget {
  constructor(root) {
    this.root = root;
    this.step = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Model loop controls">
        <button type="button" data-model-loop-action="step">Step loop</button>
        <button type="button" data-model-loop-action="reset">Reset</button>
      </div>
      <div class="lab-model-loop" data-model-loop-view></div>
      <div class="ca-status" data-model-loop-status></div>
    `;
    this.view = this.root.querySelector('[data-model-loop-view]');
    this.status = this.root.querySelector('[data-model-loop-status]');
    this.root.addEventListener('click', (event) => {
      const action = event.target?.dataset?.modelLoopAction;
      if (action === 'step') {
        this.step = (this.step + 1) % MODEL_LOOP_STEPS.length;
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
    this.view.innerHTML = MODEL_LOOP_STEPS.map(([label, note], index) => `
      <div class="lab-loop-node ${index === this.step ? 'active' : ''}">
        <strong>${label}</strong>
        <span>${note}</span>
      </div>
    `).join('');
    const [label, note] = MODEL_LOOP_STEPS[this.step];
    this.status.textContent = `${label}: ${note}`;
  }
}

class LocalRuleNeighborhoodWidget {
  constructor(root) {
    this.root = root;
    this.cells = [0, 1, 0, 1, 0, 1, 0, 0, 1];
    this.rule = 'life';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Local rule controls">
        <label>Rule
          <select data-local-rule>
            <option value="life">Life birth/survival</option>
            <option value="front">front activation</option>
            <option value="threshold">threshold trigger</option>
          </select>
        </label>
        <button type="button" data-local-rule-action="reset">Reset</button>
      </div>
      <div class="lab-interactive-grid lab-neighborhood-widget-grid" data-local-rule-grid aria-label="Clickable local neighborhood"></div>
      <div class="ca-status" data-local-rule-status></div>
    `;
    this.grid = this.root.querySelector('[data-local-rule-grid]');
    this.status = this.root.querySelector('[data-local-rule-status]');
    this.root.querySelector('[data-local-rule]')?.addEventListener('change', (event) => {
      this.rule = event.target.value;
      this.render();
    });
    this.root.addEventListener('click', (event) => {
      const index = Number(event.target?.dataset?.localRuleCell);
      if (Number.isInteger(index)) {
        this.cells[index] = this.cells[index] ? 0 : 1;
        this.render();
      }
      if (event.target?.dataset?.localRuleAction === 'reset') {
        this.cells = [0, 1, 0, 1, 0, 1, 0, 0, 1];
        this.render();
      }
    });
    this.render();
  }

  render() {
    this.grid.innerHTML = this.cells.map((value, index) => {
      const classes = ['lab-interactive-cell', index === 4 ? 'is-center' : 'is-neighbor', value ? 'is-on' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-local-rule-cell="${index}" aria-label="local rule cell ${index}">${value ? '1' : '0'}</button>`;
    }).join('');
    const count = this.cells.reduce((sum, value, index) => index === 4 ? sum : sum + value, 0);
    const center = this.cells[4];
    const next = this.nextState(center, count);
    this.status.textContent = `Neighbor count ${count}. Center ${center ? 'active' : 'inactive'} becomes ${next ? 'active' : 'inactive'} under ${this.rule}.`;
  }

  nextState(center, count) {
    if (this.rule === 'life') return center ? (count === 2 || count === 3 ? 1 : 0) : (count === 3 ? 1 : 0);
    if (this.rule === 'front') return center || count >= 2 ? 1 : 0;
    return count >= 4 ? 1 : 0;
  }
}

class DeterministicVsStochasticWidget {
  constructor(root) {
    this.root = root;
    this.seed = 17;
    this.step = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Deterministic versus stochastic controls">
        <label>Seed
          <select data-dvs-seed>
            <option value="17">seed 17</option>
            <option value="29">seed 29</option>
            <option value="43">seed 43</option>
          </select>
        </label>
        <button type="button" data-dvs-action="step">Step</button>
        <button type="button" data-dvs-action="reset">Reset</button>
      </div>
      <div class="lab-card-grid two">
        <div class="lab-card"><h3>Deterministic path</h3><div class="lab-widget-map" data-dvs-deterministic></div></div>
        <div class="lab-card"><h3>Stochastic possible outcome</h3><div class="lab-widget-map" data-dvs-stochastic></div></div>
      </div>
      <div class="ca-status" data-dvs-status></div>
    `;
    this.det = this.root.querySelector('[data-dvs-deterministic]');
    this.stoch = this.root.querySelector('[data-dvs-stochastic]');
    this.status = this.root.querySelector('[data-dvs-status]');
    this.root.querySelector('[data-dvs-seed]')?.addEventListener('change', (event) => {
      this.seed = Number(event.target.value);
      this.step = 0;
      this.render();
    });
    this.root.addEventListener('click', (event) => {
      const action = event.target?.dataset?.dvsAction;
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
    const deterministic = gridValues(7, 5, (x, y) => ((x + this.step) % 7 === y + 1 ? 0.9 : 0.12));
    const rng = seededRandom(this.seed + this.step * 97);
    const stochastic = gridValues(7, 5, (x, y) => {
      const base = deterministic[y][x];
      const noise = rng() > 0.72 ? 0.35 : -0.08;
      return clamp(base + noise, 0, 1);
    });
    renderMap(this.det, deterministic);
    renderMap(this.stoch, stochastic);
    this.status.textContent = `Step ${this.step}: the deterministic update repeats exactly; the stochastic update samples a seeded possible future.`;
  }
}

class FuzzyCaWidget {
  constructor(root) {
    this.root = root;
    this.threshold = 0.5;
    this.seed = 101;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Fuzzy CA controls">
        <label>Binary threshold
          <input type="range" min="0.2" max="0.8" step="0.05" value="0.5" data-fuzzy-threshold />
        </label>
        <button type="button" data-fuzzy-action="regenerate">Regenerate</button>
      </div>
      <div class="lab-card-grid two">
        <div class="lab-card"><h3>Binary CA view</h3><div class="lab-widget-map" data-fuzzy-binary></div></div>
        <div class="lab-card"><h3>Continuous membership view</h3><div class="lab-widget-map" data-fuzzy-continuous></div></div>
      </div>
      <div class="ca-status" data-fuzzy-status></div>
    `;
    this.binary = this.root.querySelector('[data-fuzzy-binary]');
    this.continuous = this.root.querySelector('[data-fuzzy-continuous]');
    this.status = this.root.querySelector('[data-fuzzy-status]');
    this.root.querySelector('[data-fuzzy-threshold]')?.addEventListener('input', (event) => {
      this.threshold = Number(event.target.value);
      this.render();
    });
    this.root.addEventListener('click', (event) => {
      if (event.target?.dataset?.fuzzyAction === 'regenerate') {
        this.seed += 37;
        this.render();
      }
    });
    this.render();
  }

  render() {
    const rng = seededRandom(this.seed);
    const continuous = gridValues(8, 5, (x, y) => clamp(0.25 + 0.5 * Math.sin((x + y + this.seed % 5) * 0.65) + rng() * 0.22, 0, 1));
    const binary = continuous.map((row) => row.map((value) => value >= this.threshold ? 1 : 0));
    renderMap(this.binary, binary);
    renderMap(this.continuous, continuous);
    const active = binary.flat().filter(Boolean).length;
    this.status.textContent = `Threshold ${this.threshold.toFixed(2)} turns continuous membership into ${active} active binary cells.`;
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

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}