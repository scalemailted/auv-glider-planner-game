const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 300;
const GRID_W = 16;
const GRID_H = 12;
const TAU = Math.PI * 2;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-planner-widget]').forEach((root) => {
      const type = root.dataset.plannerWidget;
      if (type === 'field-to-route-overview') new FieldToRouteOverviewWidget(root).mount();
      if (type === 'waypoint-sequence') new WaypointSequenceWidget(root).mount();
      if (type === 'reward-cost-tradeoff') new RewardCostTradeoffWidget(root).mount();
      if (type === 'reachability-timing') new ReachabilityTimingWidget(root).mount();
      if (type === 'flow-aware-route') new FlowAwareRouteWidget(root).mount();
      if (type === 'greedy-planner') new GreedyPlannerWidget(root).mount();
      if (type === 'strategy-comparison') new StrategyComparisonWidget(root).mount();
      if (type === 'uncertainty-aware-planner') new UncertaintyAwarePlannerWidget(root).mount();
      if (type === 'validation-vs-discovery-route') new ValidationVsDiscoveryWidget(root).mount();
      if (type === 'oracle-vs-belief-planner') new OracleVsBeliefPlannerWidget(root).mount();
      if (type === 'regret-breakdown') new RegretBreakdownWidget(root).mount();
      if (type === 'surface-replanning') new SurfaceReplanningWidget(root).mount();
      if (type === 'multi-agent-split') new MultiAgentSplitWidget(root).mount();
      if (type === 'planned-vs-actual-path') new PlannedVsActualPathWidget(root).mount();
      if (type === 'debrief-scorecard') new DebriefScorecardWidget(root).mount();
    });
  });
}

class FieldToRouteOverviewWidget {
  constructor(root) {
    this.root = root;
    this.showValue = true;
    this.showFlow = true;
    this.showHazards = true;
    this.showRoute = true;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Field to route overview controls">
        <label>Value <input data-ftr-value type="checkbox" checked /></label>
        <label>Flow <input data-ftr-flow type="checkbox" checked /></label>
        <label>Hazards <input data-ftr-hazards type="checkbox" checked /></label>
        <label>Route <input data-ftr-route type="checkbox" checked /></label>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Field to route overview canvas"></canvas>
      <div class="ca-status" data-ftr-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-ftr-status]');
    this.root.querySelector('[data-ftr-value]').addEventListener('change', (event) => { this.showValue = event.target.checked; this.draw(); });
    this.root.querySelector('[data-ftr-flow]').addEventListener('change', (event) => { this.showFlow = event.target.checked; this.draw(); });
    this.root.querySelector('[data-ftr-hazards]').addEventListener('change', (event) => { this.showHazards = event.target.checked; this.draw(); });
    this.root.querySelector('[data-ftr-route]').addEventListener('change', (event) => { this.showRoute = event.target.checked; this.draw(); });
    this.draw();
  }

  draw() {
    clearCanvas(this.ctx);
    if (this.showValue) drawField(this.ctx, (x, y) => valueField(x, y, 11));
    else drawGrid(this.ctx);
    if (this.showHazards) drawHazards(this.ctx);
    if (this.showFlow) drawFlow(this.ctx, 'cross');
    if (this.showRoute) drawRoute(this.ctx, routeForStrategy('value'), '#ffffff', 'planned route');
    drawPoint(this.ctx, START.x, START.y, '#42d6b4', 'start');
    this.status.textContent = `Visible layers: value ${onOff(this.showValue)}, flow ${onOff(this.showFlow)}, hazards ${onOff(this.showHazards)}, route ${onOff(this.showRoute)}.`;
  }
}

class WaypointSequenceWidget {
  constructor(root) {
    this.root = root;
    this.points = [
      { x: 0.18, y: 0.78, action: 'start' },
      { x: 0.35, y: 0.54, action: 'navigation' },
      { x: 0.58, y: 0.35, action: 'sample' },
      { x: 0.78, y: 0.58, action: 'surface' }
    ];
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Waypoint sequence controls">
        <button type="button" data-wp-reorder>Swap W1/W2</button>
        <button type="button" data-wp-delete>Delete last</button>
        <button type="button" data-wp-reset>Reset</button>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Waypoint sequence canvas"></canvas>
      <div class="lab-waypoint-list" data-wp-list></div>
      <div class="ca-status" data-wp-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.list = this.root.querySelector('[data-wp-list]');
    this.status = this.root.querySelector('[data-wp-status]');
    this.root.querySelector('[data-wp-reorder]').addEventListener('click', () => { [this.points[1], this.points[2]] = [this.points[2], this.points[1]]; this.draw(); });
    this.root.querySelector('[data-wp-delete]').addEventListener('click', () => { if (this.points.length > 2) this.points.pop(); this.draw(); });
    this.root.querySelector('[data-wp-reset]').addEventListener('click', () => { this.points = [{ x: 0.18, y: 0.78, action: 'start' }, { x: 0.35, y: 0.54, action: 'navigation' }, { x: 0.58, y: 0.35, action: 'sample' }, { x: 0.78, y: 0.58, action: 'surface' }]; this.draw(); });
    this.draw();
  }

  draw() {
    clearCanvas(this.ctx);
    drawField(this.ctx, (x, y) => valueField(x, y, 15));
    drawRoute(this.ctx, this.points, '#ffffff', 'waypoint plan');
    this.points.forEach((point, index) => drawPoint(this.ctx, point.x, point.y, index === 0 ? '#42d6b4' : '#eeb84b', index === 0 ? 'start' : `W${index}`));
    const cost = routeCost(this.points, 'none');
    this.list.innerHTML = this.points.map((point, index) => `<div><strong>${index === 0 ? 'Start' : `W${index}`}</strong><span>${point.action} | ETA ${(index * 2.5).toFixed(1)} hr</span></div>`).join('');
    this.status.textContent = `Plan has ${this.points.length - 1} waypoints | estimated route cost ${cost.toFixed(2)}. Order changes cost and arrival time.`;
  }
}

class RewardCostTradeoffWidget {
  constructor(root) {
    this.root = root;
    this.rewardWeight = 1;
    this.costWeight = 0.4;
    this.riskWeight = 0.35;
    this.choice = 1;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Reward cost tradeoff controls">
        <label>Reward weight <input data-rct-reward type="range" min="0" max="2" step="0.05" value="${this.rewardWeight}" /></label>
        <label>Cost weight <input data-rct-cost type="range" min="0" max="1.5" step="0.05" value="${this.costWeight}" /></label>
        <label>Risk weight <input data-rct-risk type="range" min="0" max="1.5" step="0.05" value="${this.riskWeight}" /></label>
        <label>Target
          <select data-rct-choice>
            <option value="0">near low risk</option>
            <option value="1" selected>high value</option>
            <option value="2">risky shortcut</option>
          </select>
        </label>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Reward cost tradeoff canvas"></canvas>
      <div class="lab-score-breakdown" data-rct-output></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.output = this.root.querySelector('[data-rct-output]');
    this.root.querySelector('[data-rct-reward]').addEventListener('input', (event) => { this.rewardWeight = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-rct-cost]').addEventListener('input', (event) => { this.costWeight = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-rct-risk]').addEventListener('input', (event) => { this.riskWeight = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-rct-choice]').addEventListener('change', (event) => { this.choice = Number(event.target.value); this.draw(); });
    this.draw();
  }

  draw() {
    const targets = candidateTargets();
    const target = targets[this.choice];
    const route = [START, target];
    const reward = target.value * this.rewardWeight;
    const cost = routeCost(route, 'none') * this.costWeight;
    const risk = routeRisk(route) * this.riskWeight;
    const score = reward - cost - risk;
    clearCanvas(this.ctx);
    drawField(this.ctx, (x, y) => valueField(x, y, 18));
    drawHazards(this.ctx);
    targets.forEach((item, index) => drawPoint(this.ctx, item.x, item.y, index === this.choice ? '#ffffff' : '#eeb84b', `T${index + 1}`));
    drawRoute(this.ctx, route, '#ffffff', 'candidate');
    this.output.innerHTML = scoreCards([
      ['Reward', reward],
      ['Travel cost', -cost],
      ['Risk penalty', -risk],
      ['Net score', score]
    ]);
  }
}

class ReachabilityTimingWidget {
  constructor(root) {
    this.root = root;
    this.budget = 5;
    this.speed = 1;
    this.window = 6;
    this.flowAssist = true;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Reachability timing controls">
        <label>Time budget <input data-rt-budget type="range" min="2" max="10" step="0.5" value="${this.budget}" /></label>
        <label>Vehicle speed <input data-rt-speed type="range" min="0.5" max="1.8" step="0.1" value="${this.speed}" /></label>
        <label>Target window <input data-rt-window type="range" min="2" max="10" step="0.5" value="${this.window}" /></label>
        <label>Flow assist <input data-rt-flow type="checkbox" checked /></label>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Reachability timing canvas"></canvas>
      <div class="ca-status" data-rt-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-rt-status]');
    this.root.querySelector('[data-rt-budget]').addEventListener('input', (event) => { this.budget = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-rt-speed]').addEventListener('input', (event) => { this.speed = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-rt-window]').addEventListener('input', (event) => { this.window = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-rt-flow]').addEventListener('change', (event) => { this.flowAssist = event.target.checked; this.draw(); });
    this.draw();
  }

  draw() {
    const assist = this.flowAssist ? 1.2 : 1;
    const radius = clamp01((this.budget * this.speed * assist) / 12);
    clearCanvas(this.ctx);
    drawField(this.ctx, (x, y) => valueField(x, y, 24));
    drawReachCircle(this.ctx, START, radius);
    drawFlow(this.ctx, this.flowAssist ? 'assist' : 'none');
    candidateTargets().forEach((target, index) => {
      const eta = distance(START, target) * 10 / Math.max(0.1, this.speed * assist);
      drawPoint(this.ctx, target.x, target.y, eta <= this.window ? '#42d6b4' : '#ff718c', `T${index + 1}`);
    });
    this.status.textContent = `Budget ${this.budget.toFixed(1)} hr | target window ${this.window.toFixed(1)} hr | green targets are reachable before the window closes.`;
  }
}

class FlowAwareRouteWidget {
  constructor(root) {
    this.root = root;
    this.preset = 'cross';
    this.driftGain = 0.45;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Flow aware route controls">
        <label>Flow preset
          <select data-far-preset>
            <option value="none">none</option>
            <option value="assist">assisting</option>
            <option value="oppose">opposing</option>
            <option value="cross" selected>cross-current</option>
            <option value="eddy">eddy</option>
          </select>
        </label>
        <label>Drift gain <input data-far-drift type="range" min="0" max="1" step="0.05" value="${this.driftGain}" /></label>
        <button type="button" data-far-reset>Reset</button>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Flow aware route canvas"></canvas>
      <div class="ca-status" data-far-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-far-status]');
    this.root.querySelector('[data-far-preset]').addEventListener('change', (event) => { this.preset = event.target.value; this.draw(); });
    this.root.querySelector('[data-far-drift]').addEventListener('input', (event) => { this.driftGain = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-far-reset]').addEventListener('click', () => { this.preset = 'cross'; this.driftGain = 0.45; this.root.querySelector('[data-far-preset]').value = this.preset; this.root.querySelector('[data-far-drift]').value = this.driftGain; this.draw(); });
    this.draw();
  }

  draw() {
    const direct = [START, { x: 0.82, y: 0.25 }];
    const adjusted = flowAdjustedRoute(direct, this.preset, this.driftGain);
    const directCost = routeCost(direct, this.preset);
    const adjustedCost = routeCost(adjusted, this.preset) * (1 - this.driftGain * 0.12);
    clearCanvas(this.ctx);
    drawGrid(this.ctx);
    drawFlow(this.ctx, this.preset);
    drawRoute(this.ctx, direct, '#ff718c', 'direct');
    drawRoute(this.ctx, adjusted, '#42d6b4', 'flow aware');
    drawPoint(this.ctx, START.x, START.y, '#ffffff', 'start');
    drawPoint(this.ctx, 0.82, 0.25, '#eeb84b', 'target');
    this.status.textContent = `Direct ETA ${directCost.toFixed(2)} | flow-aware ETA ${adjustedCost.toFixed(2)} | cross-current risk ${(this.driftGain * (this.preset === 'cross' ? 0.8 : 0.25)).toFixed(2)}.`;
  }
}

class GreedyPlannerWidget {
  constructor(root) {
    this.root = root;
    this.strategy = 'valuePerDistance';
    this.route = [START];
    this.remaining = candidateTargets();
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Greedy planner controls">
        <label>Strategy
          <select data-greedy-strategy>
            <option value="nearest">nearest value</option>
            <option value="valuePerDistance" selected>value per distance</option>
            <option value="uncertaintyPerDistance">uncertainty per distance</option>
            <option value="hiddenPerDistance">hidden-event suspicion per distance</option>
          </select>
        </label>
        <button type="button" data-greedy-step>Step</button>
        <button type="button" data-greedy-run>Run</button>
        <button type="button" data-greedy-reset>Reset</button>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Greedy planner canvas"></canvas>
      <div class="ca-status" data-greedy-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-greedy-status]');
    this.root.querySelector('[data-greedy-strategy]').addEventListener('change', (event) => { this.strategy = event.target.value; this.reset(); });
    this.root.querySelector('[data-greedy-step]').addEventListener('click', () => { this.step(); this.draw(); });
    this.root.querySelector('[data-greedy-run]').addEventListener('click', () => { while (this.remaining.length > 0 && this.route.length < 5) this.step(); this.draw(); });
    this.root.querySelector('[data-greedy-reset]').addEventListener('click', () => this.reset());
    this.draw();
  }

  reset() {
    this.route = [START];
    this.remaining = candidateTargets();
    this.draw();
  }

  step() {
    if (this.remaining.length === 0) return;
    const current = this.route[this.route.length - 1];
    let bestIndex = 0;
    let bestScore = -Infinity;
    this.remaining.forEach((target, index) => {
      const d = Math.max(0.05, distance(current, target));
      const score = this.strategy === 'nearest'
        ? -d
        : this.strategy === 'uncertaintyPerDistance'
          ? target.uncertainty / d
          : this.strategy === 'hiddenPerDistance'
            ? target.hidden / d
            : target.value / d;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    this.route.push(this.remaining.splice(bestIndex, 1)[0]);
  }

  draw() {
    clearCanvas(this.ctx);
    drawField(this.ctx, (x, y) => valueField(x, y, 17));
    this.remaining.forEach((target, index) => drawPoint(this.ctx, target.x, target.y, '#eeb84b', `T${index + 1}`));
    drawRoute(this.ctx, this.route, '#ffffff', 'greedy route');
    const reward = routeReward(this.route);
    const cost = routeCost(this.route, 'none');
    this.status.textContent = `Greedy Planner strategy ${this.strategy} | route order ${this.route.slice(1).map((point) => point.name).join(' -> ') || 'none'} | collected ${reward.toFixed(2)} | cost ${cost.toFixed(2)}.`;
  }
}

class StrategyComparisonWidget {
  constructor(root) {
    this.root = root;
    this.strategy = 'coverage';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Strategy comparison controls">
        <label>Strategy
          <select data-strategy-choice>
            <option value="value">greedy value</option>
            <option value="coverage" selected>coverage</option>
            <option value="boundary">boundary following</option>
            <option value="revisit">revisit</option>
            <option value="uncertainty">uncertainty reduction</option>
          </select>
        </label>
        <button type="button" data-strategy-run>Run route</button>
        <button type="button" data-strategy-reset>Reset</button>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Strategy comparison canvas"></canvas>
      <div class="ca-status" data-strategy-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-strategy-status]');
    this.root.querySelector('[data-strategy-choice]').addEventListener('change', (event) => { this.strategy = event.target.value; this.draw(); });
    this.root.querySelector('[data-strategy-run]').addEventListener('click', () => this.draw());
    this.root.querySelector('[data-strategy-reset]').addEventListener('click', () => { this.strategy = 'coverage'; this.root.querySelector('[data-strategy-choice]').value = this.strategy; this.draw(); });
    this.draw();
  }

  draw() {
    const route = routeForStrategy(this.strategy);
    clearCanvas(this.ctx);
    drawField(this.ctx, (x, y) => this.strategy === 'uncertainty' ? uncertaintyField(x, y, 19) : valueField(x, y, 19));
    drawRoute(this.ctx, route, '#ffffff', this.strategy);
    this.status.textContent = `${this.strategy} route | reward ${routeReward(route).toFixed(2)} | coverage ${coverageScore(route).toFixed(2)} | cost ${routeCost(route, 'none').toFixed(2)}.`;
  }
}

class UncertaintyAwarePlannerWidget {
  constructor(root) {
    this.root = root;
    this.mode = 'valuePlusUncertainty';
    this.weight = 0.55;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Uncertainty aware planner controls">
        <label>Objective
          <select data-uap-mode>
            <option value="valueOnly">high expected value</option>
            <option value="valuePlusUncertainty" selected>value + uncertainty</option>
            <option value="informationGain">information gain</option>
          </select>
        </label>
        <label>Uncertainty weight <input data-uap-weight type="range" min="0" max="1" step="0.05" value="${this.weight}" /></label>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Uncertainty aware planner canvas"></canvas>
      <div class="ca-status" data-uap-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-uap-status]');
    this.root.querySelector('[data-uap-mode]').addEventListener('change', (event) => { this.mode = event.target.value; this.draw(); });
    this.root.querySelector('[data-uap-weight]').addEventListener('input', (event) => { this.weight = Number(event.target.value); this.draw(); });
    this.draw();
  }

  draw() {
    const route = [START, ...rankedTargets((target) => this.mode === 'valueOnly' ? target.value : this.mode === 'informationGain' ? target.uncertainty : target.value + this.weight * target.uncertainty).slice(0, 3)];
    clearCanvas(this.ctx);
    drawField(this.ctx, (x, y) => clamp01(valueField(x, y, 33) * (1 - this.weight) + uncertaintyField(x, y, 33) * this.weight));
    drawRoute(this.ctx, route, '#ffffff', 'uncertainty aware');
    this.status.textContent = `Objective ${this.mode} | expected value ${routeReward(route).toFixed(2)} | uncertainty reduction ${(routeUncertainty(route) * this.weight).toFixed(2)}.`;
  }
}

class ValidationVsDiscoveryWidget {
  constructor(root) {
    this.root = root;
    this.response = 'validation';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Forecast validation versus discovery controls">
        <label>Response
          <select data-vd-response>
            <option value="validation">forecast validation</option>
            <option value="discovery">hidden-event follow-up</option>
          </select>
        </label>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Validation versus discovery route canvas"></canvas>
      <div class="ca-status" data-vd-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-vd-status]');
    this.root.querySelector('[data-vd-response]').addEventListener('change', (event) => { this.response = event.target.value; this.draw(); });
    this.draw();
  }

  draw() {
    const route = this.response === 'validation'
      ? [START, { x: 0.35, y: 0.42 }, { x: 0.52, y: 0.45 }, { x: 0.68, y: 0.48 }]
      : [START, { x: 0.48, y: 0.55 }, { x: 0.62, y: 0.42 }, { x: 0.75, y: 0.31 }];
    clearCanvas(this.ctx);
    drawField(this.ctx, (x, y) => this.response === 'validation' ? Math.abs(x - 0.52) < 0.08 ? 0.78 : 0.18 : hiddenField(x, y));
    drawFlow(this.ctx, 'assist');
    drawRoute(this.ctx, route, '#ffffff', this.response);
    this.status.textContent = this.response === 'validation'
      ? 'Forecast validation samples across a represented feature to correct an expected map.'
      : 'Hidden-event follow-up gathers confirmatory samples along coherent anomaly evidence.';
  }
}

class OracleVsBeliefPlannerWidget {
  constructor(root) {
    this.root = root;
    this.planner = 'belief';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Oracle versus belief planner controls">
        <label>Planner
          <select data-ovbp-planner>
            <option value="belief">belief planner</option>
            <option value="truth">truth-assisted planner</option>
            <option value="oracle">oracle planner</option>
          </select>
        </label>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Oracle versus belief planner canvas"></canvas>
      <div class="ca-status" data-ovbp-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-ovbp-status]');
    this.root.querySelector('[data-ovbp-planner]').addEventListener('change', (event) => { this.planner = event.target.value; this.draw(); });
    this.draw();
  }

  draw() {
    const route = this.planner === 'oracle' ? routeForStrategy('value') : this.planner === 'truth' ? routeForStrategy('boundary') : routeForStrategy('uncertainty');
    clearCanvas(this.ctx);
    drawField(this.ctx, (x, y) => this.planner === 'oracle' ? oracleValueField(x, y) : valueField(x, y, 25));
    drawRoute(this.ctx, route, this.planner === 'oracle' ? '#eeb84b' : '#ffffff', this.planner);
    const label = this.planner === 'belief' ? 'fair forecast-visible' : this.planner === 'truth' ? 'Truth-assisted debugging label' : 'Oracle upper-bound label';
    this.status.textContent = `${label} | belief score ${routeReward(route).toFixed(2)} | oracle score ${oracleRouteScore(route).toFixed(2)}.`;
  }
}

class RegretBreakdownWidget {
  constructor(root) {
    this.root = root;
    this.choice = 'belief';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Regret breakdown controls">
        <label>Chosen route
          <select data-rb-choice>
            <option value="belief">belief route</option>
            <option value="riskAverse">risk-averse route</option>
            <option value="oracle">oracle route</option>
          </select>
        </label>
      </div>
      <div class="lab-score-breakdown" data-rb-output></div>
      <div class="ca-status" data-rb-status></div>
    `;
    this.output = this.root.querySelector('[data-rb-output]');
    this.status = this.root.querySelector('[data-rb-status]');
    this.root.querySelector('[data-rb-choice]').addEventListener('change', (event) => { this.choice = event.target.value; this.render(); });
    this.render();
  }

  render() {
    const scores = { belief: 0.68, riskAverse: 0.57, oracle: 0.91 };
    const oracleBest = scores.oracle;
    const chosen = scores[this.choice];
    const regret = oracleBest - chosen;
    this.output.innerHTML = scoreCards([
      ['Oracle best', oracleBest],
      ['Chosen oracle score', chosen],
      ['Missed value', regret],
      ['Regret', regret]
    ]);
    this.status.textContent = `regret = score_oracle(P_oracle_best) - score_oracle(P_belief_chosen) = ${regret.toFixed(2)}.`;
  }
}

class SurfaceReplanningWidget {
  constructor(root) {
    this.root = root;
    this.cycle = 0;
    this.caseId = 'forecast';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Surface replanning controls">
        <label>Update case
          <select data-sr-case>
            <option value="forecast">forecast correction</option>
            <option value="hidden">hidden-event discovery</option>
            <option value="failure">route failure recovery</option>
          </select>
        </label>
        <button type="button" data-sr-update>Surface update</button>
        <button type="button" data-sr-reset>Reset</button>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Surface replanning canvas"></canvas>
      <div class="ca-status" data-sr-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-sr-status]');
    this.root.querySelector('[data-sr-case]').addEventListener('change', (event) => { this.caseId = event.target.value; this.draw(); });
    this.root.querySelector('[data-sr-update]').addEventListener('click', () => { this.cycle += 1; this.draw(); });
    this.root.querySelector('[data-sr-reset]').addEventListener('click', () => { this.cycle = 0; this.draw(); });
    this.draw();
  }

  draw() {
    const before = [START, { x: 0.35, y: 0.5 }, { x: 0.68, y: 0.42 }];
    const after = this.caseId === 'hidden'
      ? [START, { x: 0.45, y: 0.58 }, { x: 0.68, y: 0.28 }]
      : this.caseId === 'failure'
        ? [START, { x: 0.28, y: 0.52 }, { x: 0.46, y: 0.38 }, { x: 0.72, y: 0.3 }]
        : [START, { x: 0.38, y: 0.47 }, { x: 0.6, y: 0.38 }];
    clearCanvas(this.ctx);
    drawField(this.ctx, (x, y) => valueField(x, y, this.cycle > 0 ? 32 : 22));
    drawRoute(this.ctx, before, '#ff718c', 'old plan');
    if (this.cycle > 0) drawRoute(this.ctx, after, '#42d6b4', 'replan');
    this.status.textContent = `Surface cycle ${this.cycle} | ${this.cycle > 0 ? 'new observations update belief and future route' : 'old open-loop plan is still active'}.`;
  }
}

class MultiAgentSplitWidget {
  constructor(root) {
    this.root = root;
    this.agents = 2;
    this.strategy = 'cluster';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Multi agent split controls">
        <label>Agents
          <select data-ma-agents>
            <option value="1">1</option>
            <option value="2" selected>2</option>
            <option value="3">3</option>
          </select>
        </label>
        <label>Strategy
          <select data-ma-strategy>
            <option value="nearest">nearest split</option>
            <option value="cluster" selected>cluster assignment</option>
            <option value="uncertainty">uncertainty split</option>
            <option value="scoutSampler">one scout / one sampler</option>
          </select>
        </label>
        <button type="button" data-ma-run>Run</button>
        <button type="button" data-ma-reset>Reset</button>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Multi agent split canvas"></canvas>
      <div class="ca-status" data-ma-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-ma-status]');
    this.root.querySelector('[data-ma-agents]').addEventListener('change', (event) => { this.agents = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-ma-strategy]').addEventListener('change', (event) => { this.strategy = event.target.value; this.draw(); });
    this.root.querySelector('[data-ma-run]').addEventListener('click', () => this.draw());
    this.root.querySelector('[data-ma-reset]').addEventListener('click', () => { this.agents = 2; this.strategy = 'cluster'; this.root.querySelector('[data-ma-agents]').value = '2'; this.root.querySelector('[data-ma-strategy]').value = this.strategy; this.draw(); });
    this.draw();
  }

  draw() {
    const starts = [{ x: 0.14, y: 0.82 }, { x: 0.18, y: 0.64 }, { x: 0.14, y: 0.46 }];
    const colors = ['#42d6b4', '#eeb84b', '#69b7ff'];
    clearCanvas(this.ctx);
    drawField(this.ctx, (x, y) => valueField(x, y, 43));
    for (let i = 0; i < this.agents; i += 1) {
      const route = [starts[i], ...candidateTargets().filter((_, index) => index % this.agents === i).slice(0, 2)];
      drawRoute(this.ctx, route, colors[i], `agent ${i + 1}`);
      drawPoint(this.ctx, starts[i].x, starts[i].y, colors[i], `A${i + 1}`);
    }
    const duplicatePenalty = this.strategy === 'nearest' && this.agents > 1 ? 0.18 : 0.04;
    this.status.textContent = `${this.agents} agents | ${this.strategy} | duplicate penalty ${duplicatePenalty.toFixed(2)} | shared reward needs coordination.`;
  }
}

class PlannedVsActualPathWidget {
  constructor(root) {
    this.root = root;
    this.current = 0.45;
    this.noise = 0.1;
    this.strategy = 'direct';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Planned versus actual controls">
        <label>Current strength <input data-pva-current type="range" min="0" max="1" step="0.05" value="${this.current}" /></label>
        <label>Drift noise <input data-pva-noise type="range" min="0" max="0.5" step="0.05" value="${this.noise}" /></label>
        <label>Route
          <select data-pva-strategy>
            <option value="direct">direct</option>
            <option value="flowAware">flow aware</option>
          </select>
        </label>
        <button type="button" data-pva-simulate>Simulate</button>
      </div>
      <canvas class="lab-route-canvas" data-planner-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Planned versus actual path canvas"></canvas>
      <div class="ca-status" data-pva-status></div>
    `;
    this.canvas = this.root.querySelector('[data-planner-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-pva-status]');
    this.root.querySelector('[data-pva-current]').addEventListener('input', (event) => { this.current = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-pva-noise]').addEventListener('input', (event) => { this.noise = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-pva-strategy]').addEventListener('change', (event) => { this.strategy = event.target.value; this.draw(); });
    this.root.querySelector('[data-pva-simulate]').addEventListener('click', () => this.draw());
    this.draw();
  }

  draw() {
    const planned = this.strategy === 'direct' ? [START, { x: 0.55, y: 0.46 }, { x: 0.82, y: 0.25 }] : flowAdjustedRoute([START, { x: 0.82, y: 0.25 }], 'cross', this.current);
    const actual = planned.map((point, index) => ({ x: clamp01(point.x + index * this.current * 0.05), y: clamp01(point.y - index * this.noise * 0.08) }));
    clearCanvas(this.ctx);
    drawGrid(this.ctx);
    drawFlow(this.ctx, 'cross');
    drawRoute(this.ctx, planned, '#ffffff', 'planned');
    drawRoute(this.ctx, actual, '#ff718c', 'actual');
    this.status.textContent = `Completed waypoints ${actual.length - 1}/${planned.length - 1} | energy ${(routeCost(actual, 'cross') * 12).toFixed(1)} | simulation is the referee.`;
  }
}

class DebriefScorecardWidget {
  constructor(root) {
    this.root = root;
    this.scenario = 'efficient';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Debrief scorecard controls">
        <label>Route result
          <select data-debrief-scenario>
            <option value="efficient">efficient success</option>
            <option value="costly">high value but costly</option>
            <option value="hazard">hazard hit</option>
            <option value="forecast">forecast regret</option>
            <option value="hidden">hidden event discovered</option>
            <option value="duplicate">duplicate sampling</option>
          </select>
        </label>
      </div>
      <div class="lab-debrief-card" data-debrief-output></div>
      <div class="ca-status" data-debrief-status></div>
    `;
    this.output = this.root.querySelector('[data-debrief-output]');
    this.status = this.root.querySelector('[data-debrief-status]');
    this.root.querySelector('[data-debrief-scenario]').addEventListener('change', (event) => { this.scenario = event.target.value; this.render(); });
    this.render();
  }

  render() {
    const data = {
      efficient: [0.82, 0.14, 0.02, 0.08, 'Efficient success: good value, low cost, low risk.'],
      costly: [0.95, 0.38, 0.08, 0.16, 'High value but costly: strong science return, weak efficiency.'],
      hazard: [0.78, 0.28, 0.34, 0.24, 'Hazard hit: risk penalty explains the lower score.'],
      forecast: [0.58, 0.22, 0.05, 0.32, 'Forecast regret: belief missed the true opportunity.'],
      hidden: [0.72, 0.3, 0.04, 0.1, 'Hidden event discovered: science value includes new evidence.'],
      duplicate: [0.67, 0.21, 0.03, 0.18, 'Duplicate sampling: repeated coverage reduced route value.']
    }[this.scenario];
    const finalScore = data[0] - data[1] - data[2] - data[3] * 0.4;
    this.output.innerHTML = scoreCards([
      ['Collected value', data[0]],
      ['Energy cost', -data[1]],
      ['Hazard penalty', -data[2]],
      ['Regret note', -data[3]],
      ['Final score', finalScore]
    ]);
    this.status.textContent = data[4];
  }
}

const START = { x: 0.16, y: 0.78, name: 'start', value: 0 };

function candidateTargets() {
  return [
    { x: 0.38, y: 0.42, value: 0.52, uncertainty: 0.36, hidden: 0.22, name: 'near-low-risk' },
    { x: 0.68, y: 0.25, value: 0.92, uncertainty: 0.42, hidden: 0.38, name: 'high-value' },
    { x: 0.82, y: 0.62, value: 0.84, uncertainty: 0.28, hidden: 0.18, name: 'risky-shortcut' },
    { x: 0.52, y: 0.72, value: 0.48, uncertainty: 0.91, hidden: 0.74, name: 'unknown-signal' },
    { x: 0.28, y: 0.26, value: 0.56, uncertainty: 0.72, hidden: 0.48, name: 'front-check' }
  ];
}

function rankedTargets(scoreFn) {
  return candidateTargets().slice().sort((a, b) => scoreFn(b) - scoreFn(a));
}

function routeForStrategy(strategy) {
  if (strategy === 'coverage') return [START, { x: 0.24, y: 0.28 }, { x: 0.48, y: 0.7 }, { x: 0.76, y: 0.32 }, { x: 0.84, y: 0.74 }];
  if (strategy === 'boundary') return [START, { x: 0.28, y: 0.52 }, { x: 0.42, y: 0.46 }, { x: 0.58, y: 0.42 }, { x: 0.74, y: 0.38 }];
  if (strategy === 'revisit') return [START, { x: 0.34, y: 0.5 }, { x: 0.52, y: 0.32 }, { x: 0.34, y: 0.5 }, { x: 0.72, y: 0.58 }];
  if (strategy === 'uncertainty') return [START, ...rankedTargets((target) => target.uncertainty).slice(0, 3)];
  return [START, ...rankedTargets((target) => target.value).slice(0, 3)];
}

function clearCanvas(ctx) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#07151d';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawGrid(ctx) {
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let col = 0; col <= GRID_W; col += 1) {
    const x = col * CANVAS_WIDTH / GRID_W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let row = 0; row <= GRID_H; row += 1) {
    const y = row * CANVAS_HEIGHT / GRID_H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}

function drawField(ctx, sampler) {
  const cellW = CANVAS_WIDTH / GRID_W;
  const cellH = CANVAS_HEIGHT / GRID_H;
  for (let row = 0; row < GRID_H; row += 1) {
    for (let col = 0; col < GRID_W; col += 1) {
      const x = (col + 0.5) / GRID_W;
      const y = (row + 0.5) / GRID_H;
      ctx.fillStyle = heatColor(clamp01(sampler(x, y)));
      ctx.fillRect(col * cellW, row * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
}

function drawHazards(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,10,16,0.72)';
  [[0.74, 0.52, 0.16, 0.18], [0.08, 0.18, 0.18, 0.14], [0.44, 0.08, 0.14, 0.12]].forEach(([x, y, w, h]) => {
    ctx.fillRect(x * CANVAS_WIDTH, y * CANVAS_HEIGHT, w * CANVAS_WIDTH, h * CANVAS_HEIGHT);
    ctx.strokeStyle = 'rgba(255,113,140,0.72)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * CANVAS_WIDTH, y * CANVAS_HEIGHT, w * CANVAS_WIDTH, h * CANVAS_HEIGHT);
  });
  ctx.restore();
}

function drawFlow(ctx, preset) {
  if (preset === 'none') return;
  ctx.save();
  ctx.strokeStyle = 'rgba(232,244,247,0.72)';
  ctx.lineWidth = 1.2;
  for (let row = 2; row < GRID_H; row += 3) {
    for (let col = 2; col < GRID_W; col += 3) {
      const x = (col + 0.5) / GRID_W;
      const y = (row + 0.5) / GRID_H;
      const flow = flowVector(x, y, preset);
      const px = x * CANVAS_WIDTH;
      const py = y * CANVAS_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(px - flow.u * 7, py - flow.v * 7);
      ctx.lineTo(px + flow.u * 7, py + flow.v * 7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawRoute(ctx, route, color, label) {
  if (!route || route.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash(label === 'actual' ? [7, 5] : []);
  ctx.beginPath();
  ctx.moveTo(route[0].x * CANVAS_WIDTH, route[0].y * CANVAS_HEIGHT);
  for (let i = 1; i < route.length; i += 1) ctx.lineTo(route[i].x * CANVAS_WIDTH, route[i].y * CANVAS_HEIGHT);
  ctx.stroke();
  route.forEach((point, index) => drawPoint(ctx, point.x, point.y, color, index === 0 ? 'S' : `${index}`));
  ctx.restore();
}

function drawPoint(ctx, x, y, color, label) {
  const px = x * CANVAS_WIDTH;
  const py = y * CANVAS_HEIGHT;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#061018';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 8, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#07151d';
  ctx.font = '800 10px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(label).slice(0, 3), px, py);
  ctx.restore();
}

function drawReachCircle(ctx, center, radius) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.fillStyle = 'rgba(66,214,180,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x * CANVAS_WIDTH, center.y * CANVAS_HEIGHT, radius * CANVAS_WIDTH, 0, TAU);
  ctx.fill();
  ctx.stroke();
  drawPoint(ctx, center.x, center.y, '#ffffff', 'S');
  ctx.restore();
}

function flowAdjustedRoute(route, preset, driftGain) {
  const target = route[route.length - 1];
  const mid = { x: 0.45, y: preset === 'cross' ? 0.72 - driftGain * 0.25 : preset === 'eddy' ? 0.5 : 0.5 };
  const mid2 = { x: 0.62, y: preset === 'oppose' ? 0.45 + driftGain * 0.15 : 0.34 };
  return [route[0], mid, mid2, target];
}

function routeCost(route, flowPreset) {
  let total = 0;
  for (let i = 1; i < route.length; i += 1) {
    const base = distance(route[i - 1], route[i]);
    const flow = flowVector((route[i - 1].x + route[i].x) / 2, (route[i - 1].y + route[i].y) / 2, flowPreset);
    const dx = route[i].x - route[i - 1].x;
    const dy = route[i].y - route[i - 1].y;
    const assist = (dx * flow.u + dy * flow.v) / Math.max(0.01, base);
    total += base * (1 - 0.22 * assist);
  }
  return Math.max(0, total);
}

function routeRisk(route) {
  return route.reduce((sum, point) => sum + hazardField(point.x, point.y), 0) / Math.max(1, route.length);
}

function routeReward(route) {
  return route.slice(1).reduce((sum, point) => sum + valueField(point.x, point.y, 17), 0);
}

function routeUncertainty(route) {
  return route.slice(1).reduce((sum, point) => sum + uncertaintyField(point.x, point.y, 17), 0);
}

function oracleRouteScore(route) {
  return route.slice(1).reduce((sum, point) => sum + oracleValueField(point.x, point.y), 0) - routeCost(route, 'none') * 0.25;
}

function coverageScore(route) {
  return Math.min(1, route.length / 5) * (1 - duplicateScore(route));
}

function duplicateScore(route) {
  let duplicate = 0;
  for (let i = 0; i < route.length; i += 1) {
    for (let j = i + 1; j < route.length; j += 1) {
      if (distance(route[i], route[j]) < 0.08) duplicate += 0.2;
    }
  }
  return clamp01(duplicate);
}

function valueField(x, y, seed) {
  return clamp01(0.12 + gaussian(x, y, 0.66, 0.26, 0.18) + 0.62 * gaussian(x, y, 0.36, 0.48, 0.24) + 0.12 * Math.sin((x * 2.1 + y * 1.4 + seed * 0.03) * TAU));
}

function oracleValueField(x, y) {
  return clamp01(valueField(x, y, 17) + 0.48 * gaussian(x, y, 0.76, 0.62, 0.15));
}

function uncertaintyField(x, y, seed) {
  return clamp01(0.18 + 0.62 * gaussian(x, y, 0.52, 0.7, 0.2) + 0.25 * Math.abs(Math.sin((x + y + seed * 0.01) * TAU)));
}

function hiddenField(x, y) {
  return clamp01(0.12 + 0.82 * gaussian(x, y, 0.68, 0.32, 0.15));
}

function hazardField(x, y) {
  return clamp01(0.8 * gaussian(x, y, 0.82, 0.62, 0.13) + 0.6 * gaussian(x, y, 0.14, 0.22, 0.12));
}

function flowVector(x, y, preset) {
  if (preset === 'assist') return { u: 0.9, v: -0.2 };
  if (preset === 'oppose') return { u: -0.8, v: 0.12 };
  if (preset === 'cross') return { u: 0.15, v: -0.85 };
  if (preset === 'eddy') {
    const dx = x - 0.55;
    const dy = y - 0.48;
    return { u: -dy * 2, v: dx * 2 };
  }
  return { u: 0, v: 0 };
}

function scoreCards(items) {
  return items.map(([label, value]) => `<div class="lab-score-card"><strong>${label}</strong><span>${Number(value).toFixed(2)}</span></div>`).join('');
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function gaussian(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return Math.exp(-(dx * dx + dy * dy) / Math.max(0.0001, radius * radius));
}

function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function heatColor(value) {
  const v = clamp01(value);
  const r = Math.round(18 + v * 230);
  const g = Math.round(35 + Math.sin(v * Math.PI) * 145 + v * 44);
  const b = Math.round(48 + (1 - v) * 145);
  return `rgb(${r},${g},${b})`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function onOff(value) {
  return value ? 'on' : 'off';
}
