const GRID_SIZE = 12;
const LIVE = 1;
const DEAD = 0;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-ca-mini-widget]').forEach((root) => {
    const widget = new CellularAutomataMiniWidget(root);
    widget.mount();
  });
});

class CellularAutomataMiniWidget {
  constructor(root) {
    this.root = root;
    this.generation = 0;
    this.seed = 0xA17C0DE;
    this.cells = blankGrid();
  }

  mount() {
    this.root.innerHTML = `
      <div class="ca-controls" aria-label="Cellular automata controls">
        <button type="button" data-ca-action="step">Step</button>
        <button type="button" data-ca-action="reset">Reset</button>
        <button type="button" data-ca-action="blinker">Blinker</button>
        <button type="button" data-ca-action="glider">Glider</button>
        <button type="button" data-ca-action="random">Seeded Random</button>
      </div>
      <div class="ca-grid" data-ca-grid aria-label="Deterministic cellular automata grid"></div>
      <div class="ca-status" data-ca-status></div>
    `;
    this.gridEl = this.root.querySelector('[data-ca-grid]');
    this.statusEl = this.root.querySelector('[data-ca-status]');
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.loadPattern('glider');
  }

  handleClick(event) {
    const action = event.target?.dataset?.caAction;
    if (!action) return;
    if (action === 'step') this.step();
    if (action === 'reset') this.loadPattern('glider');
    if (action === 'blinker') this.loadPattern('blinker');
    if (action === 'glider') this.loadPattern('glider');
    if (action === 'random') this.loadPattern('random');
  }

  loadPattern(pattern) {
    this.generation = 0;
    this.cells = blankGrid();
    if (pattern === 'blinker') {
      this.set(5, 4, LIVE);
      this.set(5, 5, LIVE);
      this.set(5, 6, LIVE);
    } else if (pattern === 'random') {
      const rng = seededRng(this.seed);
      for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let col = 0; col < GRID_SIZE; col += 1) {
          this.set(row, col, rng() > 0.72 ? LIVE : DEAD);
        }
      }
    } else {
      this.set(2, 3, LIVE);
      this.set(3, 4, LIVE);
      this.set(4, 2, LIVE);
      this.set(4, 3, LIVE);
      this.set(4, 4, LIVE);
    }
    this.render();
  }

  set(row, col, value) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    this.cells[row][col] = value;
  }

  step() {
    const next = blankGrid();
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const liveNeighbors = this.countLiveNeighbors(row, col);
        const alive = this.cells[row][col] === LIVE;
        next[row][col] = alive
          ? liveNeighbors === 2 || liveNeighbors === 3 ? LIVE : DEAD
          : liveNeighbors === 3 ? LIVE : DEAD;
      }
    }
    this.cells = next;
    this.generation += 1;
    this.render();
  }

  countLiveNeighbors(row, col) {
    let total = 0;
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const rr = row + dr;
        const cc = col + dc;
        if (rr < 0 || rr >= GRID_SIZE || cc < 0 || cc >= GRID_SIZE) continue;
        total += this.cells[rr][cc] === LIVE ? 1 : 0;
      }
    }
    return total;
  }

  render() {
    const liveCount = this.cells.flat().filter((value) => value === LIVE).length;
    this.gridEl.innerHTML = this.cells
      .flatMap((row) => row.map((value) => `<span class="ca-cell${value === LIVE ? ' live' : ''}" aria-hidden="true"></span>`))
      .join('');
    this.statusEl.textContent = `Generation ${this.generation} | live cells ${liveCount} | deterministic local rule`;
  }
}

function blankGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => DEAD));
}

function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
