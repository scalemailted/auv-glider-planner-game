const RULES = {
  90: 0b01011010,
  110: 0b01101110,
  30: 0b00011110
};

const WIDTH = 41;
const ROWS = 24;
const LIFE_SIZE = 12;
const DOMAIN_SIZE = 8;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    mountAll('[data-elementary-ca-widget]', ElementaryCaWidget);
    mountAll('[data-neighborhood-update-widget]', NeighborhoodUpdateWidget);
    mountAll('[data-game-of-life-widget]', GameOfLifeWidget);
    mountAll('[data-domain-rule-allocation-widget]', DomainRuleAllocationWidget);
  });
}

function mountAll(selector, WidgetClass) {
  document.querySelectorAll(selector).forEach((root) => {
    const widget = new WidgetClass(root);
    widget.mount();
  });
}

class ElementaryCaWidget {
  constructor(root) {
    this.root = root;
    this.rule = 90;
    this.seedMode = 'center';
    this.seed = 0xA17C0DE;
    this.regeneration = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Elementary cellular automata controls">
        <label>Rule
          <select data-ca-rule>
            <option value="90">Rule 90</option>
            <option value="110">Rule 110</option>
            <option value="30">Rule 30</option>
          </select>
        </label>
        <label>Seed
          <select data-ca-seed>
            <option value="center">single center cell</option>
            <option value="random">seeded random</option>
          </select>
        </label>
        <button type="button" data-ca-action="reset">Reset</button>
        <button type="button" data-ca-action="regenerate">Regenerate</button>
      </div>
      <div class="lab-spacetime" data-ca-spacetime aria-label="Elementary CA spacetime output"></div>
      <div class="ca-status" data-ca-status></div>
    `;
    this.spacetimeEl = this.root.querySelector('[data-ca-spacetime]');
    this.statusEl = this.root.querySelector('[data-ca-status]');
    this.root.querySelector('[data-ca-rule]')?.addEventListener('change', (event) => {
      this.rule = Number(event.target.value);
      this.render();
    });
    this.root.querySelector('[data-ca-seed]')?.addEventListener('change', (event) => {
      this.seedMode = event.target.value;
      this.render();
    });
    this.root.addEventListener('click', (event) => {
      const action = event.target?.dataset?.caAction;
      if (action === 'reset') {
        this.regeneration = 0;
        this.render();
      }
      if (action === 'regenerate') {
        this.regeneration += 1;
        this.render();
      }
    });
    this.render();
  }

  render() {
    const rows = buildSpacetime({
      rule: this.rule,
      seedMode: this.seedMode,
      seed: this.seed + this.regeneration * 7919
    });
    this.spacetimeEl.innerHTML = rows.map((row) => (
      `<div class="lab-spacetime-row">${row.map((value) => `<span class="${value ? 'lab-state-on' : 'lab-state-off'}" aria-hidden="true"></span>`).join('')}</div>`
    )).join('');
    const activeCells = rows.flat().filter(Boolean).length;
    this.statusEl.textContent = `Rule ${this.rule} | run ${this.regeneration + 1} | ${this.seedMode === 'center' ? 'single center cell' : 'seeded random'} | active spacetime cells ${activeCells}`;
  }
}

class NeighborhoodUpdateWidget {
  constructor(root) {
    this.root = root;
    this.mode = 'moore';
    this.cells = [
      0, 1, 0,
      1, 0, 1,
      0, 1, 0
    ];
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Neighborhood update controls">
        <label>Neighborhood
          <select data-neighborhood-mode>
            <option value="moore">Moore: 8 neighbors</option>
            <option value="vonNeumann">Von Neumann: 4 neighbors</option>
          </select>
        </label>
        <button type="button" data-neighborhood-action="reset">Reset</button>
      </div>
      <div class="lab-interactive-grid lab-neighborhood-widget-grid" data-neighborhood-grid aria-label="Clickable 3 by 3 neighborhood grid"></div>
      <div class="ca-status" data-neighborhood-status></div>
    `;
    this.gridEl = this.root.querySelector('[data-neighborhood-grid]');
    this.statusEl = this.root.querySelector('[data-neighborhood-status]');
    this.root.querySelector('[data-neighborhood-mode]')?.addEventListener('change', (event) => {
      this.mode = event.target.value;
      this.render();
    });
    this.root.addEventListener('click', (event) => {
      const index = Number(event.target?.dataset?.neighborhoodCell);
      if (Number.isInteger(index)) {
        this.cells[index] = this.cells[index] ? 0 : 1;
        this.render();
      }
      if (event.target?.dataset?.neighborhoodAction === 'reset') {
        this.cells = [
          0, 1, 0,
          1, 0, 1,
          0, 1, 0
        ];
        this.render();
      }
    });
    this.render();
  }

  render() {
    const activeIndexes = new Set(neighborIndexes(this.mode));
    this.gridEl.innerHTML = this.cells.map((value, index) => {
      const classes = [
        'lab-interactive-cell',
        index === 4 ? 'is-center' : '',
        activeIndexes.has(index) ? 'is-neighbor' : '',
        value ? 'is-on' : ''
      ].filter(Boolean).join(' ');
      const label = index === 4 ? 'center cell' : activeIndexes.has(index) ? 'active neighborhood cell' : 'excluded cell';
      return `<button type="button" class="${classes}" data-neighborhood-cell="${index}" aria-label="${label}">${value ? '1' : '0'}</button>`;
    }).join('');
    const activeNeighborCount = neighborIndexes(this.mode).reduce((total, index) => total + this.cells[index], 0);
    const center = this.cells[4];
    const nextCenter = lifeNextState(center, activeNeighborCount);
    const ruleText = center ? 'survives with 2 or 3 active neighbors' : 'is born with exactly 3 active neighbors';
    this.statusEl.textContent = `${this.mode === 'moore' ? 'Moore' : 'Von Neumann'} count: ${activeNeighborCount}. Center is ${center ? 'on' : 'off'} and next state preview is ${nextCenter ? 'on' : 'off'} (${ruleText}).`;
  }
}

class GameOfLifeWidget {
  constructor(root) {
    this.root = root;
    this.preset = 'blinker';
    this.generation = 0;
    this.cells = lifePreset(this.preset);
    this.selectedIndex = xyToIndex(5, 5, LIFE_SIZE);
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Game of Life controls">
        <label>Preset
          <select data-life-preset>
            <option value="blinker">blinker</option>
            <option value="block">block</option>
            <option value="glider">glider-like seed</option>
          </select>
        </label>
        <button type="button" data-life-action="step">Step</button>
        <button type="button" data-life-action="reset">Reset</button>
      </div>
      <div class="lab-interactive-grid lab-life-grid" data-life-grid aria-label="Clickable Game of Life grid"></div>
      <div class="ca-status" data-life-status></div>
    `;
    this.gridEl = this.root.querySelector('[data-life-grid]');
    this.statusEl = this.root.querySelector('[data-life-status]');
    this.root.querySelector('[data-life-preset]')?.addEventListener('change', (event) => {
      this.preset = event.target.value;
      this.reset();
    });
    this.root.addEventListener('click', (event) => {
      const action = event.target?.dataset?.lifeAction;
      if (action === 'step') {
        this.cells = nextLifeGrid(this.cells, LIFE_SIZE);
        this.generation += 1;
        this.render();
      }
      if (action === 'reset') this.reset();
      const index = Number(event.target?.dataset?.lifeCell);
      if (Number.isInteger(index)) {
        this.cells[index] = this.cells[index] ? 0 : 1;
        this.selectedIndex = index;
        this.render();
      }
    });
    this.render();
  }

  reset() {
    this.cells = lifePreset(this.preset);
    this.generation = 0;
    this.selectedIndex = xyToIndex(5, 5, LIFE_SIZE);
    this.render();
  }

  render() {
    this.gridEl.innerHTML = this.cells.map((value, index) => {
      const selected = index === this.selectedIndex;
      const classes = ['lab-interactive-cell', value ? 'is-on' : '', selected ? 'is-selected' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-life-cell="${index}" aria-label="Game of Life cell ${index}">${value ? '1' : '0'}</button>`;
    }).join('');
    const neighborCount = lifeNeighborCount(this.cells, LIFE_SIZE, this.selectedIndex);
    const selectedState = this.cells[this.selectedIndex];
    const nextState = lifeNextState(selectedState, neighborCount);
    this.statusEl.textContent = `Generation ${this.generation}. Selected cell has ${neighborCount} active Moore neighbors, is ${selectedState ? 'alive' : 'dead'}, and next state would be ${nextState ? 'alive' : 'dead'}.`;
  }
}

class DomainRuleAllocationWidget {
  constructor(root) {
    this.root = root;
    this.generation = 0;
    this.cells = domainInitialGrid();
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Domain rule allocation controls">
        <button type="button" data-domain-action="step">Step</button>
        <button type="button" data-domain-action="reset">Reset</button>
      </div>
      <div class="lab-domain-legend">
        <span class="domain-a">A: checker</span>
        <span class="domain-b">B: decay</span>
        <span class="domain-c">C: stable off</span>
        <span class="domain-d">D: pulse</span>
      </div>
      <div class="lab-interactive-grid lab-domain-widget-grid" data-domain-grid aria-label="Domain rule allocation grid"></div>
      <div class="ca-status" data-domain-status></div>
    `;
    this.gridEl = this.root.querySelector('[data-domain-grid]');
    this.statusEl = this.root.querySelector('[data-domain-status]');
    this.root.addEventListener('click', (event) => {
      const action = event.target?.dataset?.domainAction;
      if (action === 'step') {
        this.cells = nextDomainGrid(this.cells, this.generation);
        this.generation += 1;
        this.render();
      }
      if (action === 'reset') {
        this.cells = domainInitialGrid();
        this.generation = 0;
        this.render();
      }
    });
    this.render();
  }

  render() {
    this.gridEl.innerHTML = this.cells.map((cell, index) => {
      const classes = ['lab-interactive-cell', `domain-${cell.domain}`, cell.value ? 'is-on' : ''].join(' ');
      return `<span class="${classes}" aria-label="Domain ${cell.domain.toUpperCase()} cell ${index}">${cell.value ? '1' : '0'}</span>`;
    }).join('');
    const activeByDomain = ['a', 'b', 'c', 'd'].map((domain) => `${domain.toUpperCase()}:${this.cells.filter((cell) => cell.domain === domain && cell.value).length}`).join(' ');
    this.statusEl.textContent = `Generation ${this.generation}. Each domain applies its own deterministic update rule. Active cells ${activeByDomain}.`;
  }
}

function buildSpacetime({ rule, seedMode, seed }) {
  const rows = [initialRow(seedMode, seed)];
  for (let row = 1; row < ROWS; row += 1) {
    rows.push(nextRow(rows[row - 1], rule));
  }
  return rows;
}

function initialRow(seedMode, seed) {
  if (seedMode === 'random') {
    const rng = seededRng(seed);
    return Array.from({ length: WIDTH }, () => rng() > 0.68 ? 1 : 0);
  }
  return Array.from({ length: WIDTH }, (_, index) => index === Math.floor(WIDTH / 2) ? 1 : 0);
}

function nextRow(row, rule) {
  return row.map((_, index) => {
    const left = row[index - 1] ?? 0;
    const center = row[index] ?? 0;
    const right = row[index + 1] ?? 0;
    const pattern = (left << 2) | (center << 1) | right;
    return (RULES[rule] >> pattern) & 1;
  });
}

function neighborIndexes(mode) {
  return mode === 'vonNeumann'
    ? [1, 3, 5, 7]
    : [0, 1, 2, 3, 5, 6, 7, 8];
}

function lifePreset(preset) {
  const cells = Array.from({ length: LIFE_SIZE * LIFE_SIZE }, () => 0);
  const points = {
    blinker: [[5, 5], [6, 5], [7, 5]],
    block: [[5, 5], [6, 5], [5, 6], [6, 6]],
    glider: [[5, 4], [6, 5], [4, 6], [5, 6], [6, 6]]
  }[preset] ?? [];
  points.forEach(([x, y]) => {
    cells[xyToIndex(x, y, LIFE_SIZE)] = 1;
  });
  return cells;
}

function nextLifeGrid(cells, size) {
  return cells.map((value, index) => lifeNextState(value, lifeNeighborCount(cells, size, index)));
}

function lifeNeighborCount(cells, size, index) {
  const x = index % size;
  const y = Math.floor(index / size);
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        count += cells[xyToIndex(nx, ny, size)];
      }
    }
  }
  return count;
}

function lifeNextState(currentState, activeNeighborCount) {
  if (currentState) return activeNeighborCount === 2 || activeNeighborCount === 3 ? 1 : 0;
  return activeNeighborCount === 3 ? 1 : 0;
}

function domainInitialGrid() {
  const cells = [];
  for (let y = 0; y < DOMAIN_SIZE; y += 1) {
    for (let x = 0; x < DOMAIN_SIZE; x += 1) {
      const domain = domainFor(x, y);
      cells.push({ domain, value: domainInitialValue(domain, x, y) });
    }
  }
  return cells;
}

function domainFor(x, y) {
  if (x < 4 && y < 4) return 'a';
  if (x >= 4 && y < 4) return 'b';
  if (x < 4 && y >= 4) return 'd';
  return 'c';
}

function domainInitialValue(domain, x, y) {
  if (domain === 'a') return (x + y) % 2;
  if (domain === 'b') return x === 4 || y === 0 ? 1 : 0;
  if (domain === 'd') return x === 1 && y === 6 ? 1 : 0;
  return 0;
}

function nextDomainGrid(cells, generation) {
  return cells.map((cell, index) => {
    const x = index % DOMAIN_SIZE;
    const y = Math.floor(index / DOMAIN_SIZE);
    if (cell.domain === 'a') return { ...cell, value: (x + y + generation + 1) % 2 };
    if (cell.domain === 'b') return { ...cell, value: cell.value && generation < 3 ? 1 : 0 };
    if (cell.domain === 'c') return { ...cell, value: 0 };
    if (cell.domain === 'd') return { ...cell, value: x === ((generation + 2) % 4) && y >= 4 ? 1 : 0 };
    return cell;
  });
}

function xyToIndex(x, y, size) {
  return y * size + x;
}

function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
