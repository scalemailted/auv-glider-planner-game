const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 300;
const GRID_W = 34;
const GRID_H = 20;
const TAU = Math.PI * 2;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-stochastic-coupled-widget]').forEach((root) => {
      const type = root.dataset.stochasticCoupledWidget;
      if (type === 'belief-layer-stack') new BeliefLayerStackWidget(root).mount();
      if (type === 'oracle-vs-belief') new OracleVsBeliefWidget(root).mount();
      if (type === 'two-uncertainty-maps') new TwoUncertaintyMapsWidget(root).mount();
      if (type === 'forecast-error-vs-hidden-event') new ForecastErrorHiddenEventWidget(root).mount();
      if (type === 'flow-consistent-anomaly') new FlowConsistentAnomalyWidget(root).mount();
      if (type === 'acquisition-composer') new AcquisitionComposerWidget(root).mount();
      if (type === 'reachable-acquisition') new ReachableAcquisitionWidget(root).mount();
      if (type === 'surface-update-cycle') new SurfaceUpdateCycleWidget(root).mount();
      if (type === 'oracle-regret-comparison') new OracleRegretComparisonWidget(root).mount();
    });
  });
}

class BeliefLayerStackWidget {
  constructor(root) {
    this.root = root;
    this.layer = 'acquisition';
    this.revealTruth = false;
    this.showFlow = true;
    this.showConstraints = true;
    this.seed = 0x5C0A11;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Belief layer stack controls">
        <label>Layer
          <select data-sc-layer>
            <option value="truth">Hidden truth T</option>
            <option value="forecast">Expected state E</option>
            <option value="posterior">Posterior mean mu_post</option>
            <option value="expectedUncertainty">Expected uncertainty U_expected</option>
            <option value="unknownProbability">Unknown-event probability P_unknown</option>
            <option value="acquisition">Acquisition A</option>
          </select>
        </label>
        <label>Reveal truth <input data-sc-reveal type="checkbox" /></label>
        <label>Show flow <input data-sc-flow type="checkbox" checked /></label>
        <label>Show constraints <input data-sc-constraints type="checkbox" checked /></label>
        <button type="button" data-sc-reset>Reset seed</button>
      </div>
      <canvas class="lab-widget-canvas" data-stochastic-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Belief layer stack canvas"></canvas>
      <div class="ca-status" data-sc-status></div>
    `;
    this.canvas = this.root.querySelector('[data-stochastic-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-sc-status]');
    this.root.querySelector('[data-sc-layer]').addEventListener('change', (event) => { this.layer = event.target.value; this.draw(); });
    this.root.querySelector('[data-sc-reveal]').addEventListener('change', (event) => { this.revealTruth = event.target.checked; this.draw(); });
    this.root.querySelector('[data-sc-flow]').addEventListener('change', (event) => { this.showFlow = event.target.checked; this.draw(); });
    this.root.querySelector('[data-sc-constraints]').addEventListener('change', (event) => { this.showConstraints = event.target.checked; this.draw(); });
    this.root.querySelector('[data-sc-reset]').addEventListener('click', () => { this.seed += 7919; this.draw(); });
    this.draw();
  }

  draw() {
    const sampler = (x, y) => layerValue(this.layer, x, y, this.seed);
    clearCanvas(this.ctx);
    drawField(this.ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, sampler);
    if (this.showFlow) drawArrowField(this.ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, this.seed);
    if (this.showConstraints) drawConstraintOverlay(this.ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!this.revealTruth && this.layer === 'truth') drawHiddenMask(this.ctx);
    this.status.textContent = `Layer ${labelForLayer(this.layer)} | truth ${this.revealTruth ? 'visible' : 'hidden'} | flow ${this.showFlow ? 'on' : 'off'} | constraints ${this.showConstraints ? 'on' : 'off'}`;
  }
}

class OracleVsBeliefWidget {
  constructor(root) {
    this.root = root;
    this.bias = 'shifted';
    this.uncertainty = 0.48;
    this.reveal = false;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Oracle versus belief controls">
        <label>Forecast error
          <select data-ovb-bias>
            <option value="shifted">shifted feature</option>
            <option value="weak">too weak</option>
            <option value="strong">too strong</option>
            <option value="missing">missing hidden event</option>
          </select>
        </label>
        <label>Uncertainty <input data-ovb-uncertainty type="range" min="0" max="1" step="0.02" value="${this.uncertainty}" /></label>
        <label>Reveal oracle <input data-ovb-reveal type="checkbox" /></label>
      </div>
      <canvas class="lab-widget-canvas" data-stochastic-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Oracle versus belief canvas"></canvas>
      <div class="ca-status" data-ovb-status></div>
    `;
    this.canvas = this.root.querySelector('[data-stochastic-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-ovb-status]');
    this.root.querySelector('[data-ovb-bias]').addEventListener('change', (event) => { this.bias = event.target.value; this.draw(); });
    this.root.querySelector('[data-ovb-uncertainty]').addEventListener('input', (event) => { this.uncertainty = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-ovb-reveal]').addEventListener('change', (event) => { this.reveal = event.target.checked; this.draw(); });
    this.draw();
  }

  draw() {
    const seed = 0x0B1E1F;
    const belief = (x, y) => beliefObjective(x, y, seed, this.bias, this.uncertainty);
    const oracle = (x, y) => oracleObjective(x, y, seed);
    const diff = (x, y) => clamp01(Math.abs(oracle(x, y) - belief(x, y)));
    clearCanvas(this.ctx);
    drawPanelGrid(this.ctx, [
      { title: this.reveal ? 'Oracle S*' : 'Oracle hidden', sampler: this.reveal ? oracle : () => 0.16 },
      { title: 'Belief A', sampler: belief },
      { title: 'Regret risk', sampler: diff }
    ]);
    const oracleBest = bestCell(oracle);
    const beliefBest = bestCell(belief);
    const regret = Math.max(0, oracle(oracleBest.x, oracleBest.y) - oracle(beliefBest.x, beliefBest.y));
    this.status.textContent = `Belief best (${beliefBest.col},${beliefBest.row}) | oracle regret ${regret.toFixed(2)} | forecast error ${this.bias}.`;
  }
}

class TwoUncertaintyMapsWidget {
  constructor(root) {
    this.root = root;
    this.view = 'expected';
    this.scenario = 'sparseData';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Two uncertainty maps controls">
        <label>Map
          <select data-tum-view>
            <option value="expected">expected-state uncertainty</option>
            <option value="unknown">unknown-event probability</option>
            <option value="combined">combined acquisition pressure</option>
          </select>
        </label>
        <label>Scenario
          <select data-tum-scenario>
            <option value="sparseData">sparse observations</option>
            <option value="forecastDisagreement">forecast disagreement</option>
            <option value="coherentAnomaly">coherent anomaly</option>
            <option value="randomSpike">noisy spike</option>
          </select>
        </label>
      </div>
      <canvas class="lab-widget-canvas" data-stochastic-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Two uncertainty maps canvas"></canvas>
      <div class="ca-status" data-tum-status></div>
    `;
    this.canvas = this.root.querySelector('[data-stochastic-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-tum-status]');
    this.root.querySelector('[data-tum-view]').addEventListener('change', (event) => { this.view = event.target.value; this.draw(); });
    this.root.querySelector('[data-tum-scenario]').addEventListener('change', (event) => { this.scenario = event.target.value; this.draw(); });
    this.draw();
  }

  draw() {
    const expected = (x, y) => expectedUncertainty(x, y, this.scenario);
    const unknown = (x, y) => unknownProbability(x, y, this.scenario);
    const sampler = this.view === 'expected' ? expected : this.view === 'unknown' ? unknown : (x, y) => clamp01(0.55 * expected(x, y) + 0.45 * unknown(x, y));
    clearCanvas(this.ctx);
    drawField(this.ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, sampler);
    this.status.textContent = `${this.view === 'expected' ? 'U_expected' : this.view === 'unknown' ? 'P_unknown' : 'Combined'} under ${this.scenario}: these are separate maps with different mission meanings.`;
  }
}

class ForecastErrorHiddenEventWidget {
  constructor(root) {
    this.root = root;
    this.scenario = 'shiftedFront';
    this.samples = 7;
    this.noise = 0.14;
    this.flowConsistency = true;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Forecast error hidden event controls">
        <label>Scenario
          <select data-feh-scenario>
            <option value="shiftedFront">shifted front</option>
            <option value="weakForecastHotspot">weak forecast hotspot</option>
            <option value="hiddenPlume">hidden plume</option>
            <option value="hiddenBloomLayer">hidden bloom layer</option>
            <option value="noisyFalseAlarm">noisy false alarm</option>
          </select>
        </label>
        <label>Samples <input data-feh-samples type="range" min="3" max="14" step="1" value="${this.samples}" /></label>
        <label>Sensor noise <input data-feh-noise type="range" min="0.02" max="0.5" step="0.02" value="${this.noise}" /></label>
        <label>Flow consistency <input data-feh-flow type="checkbox" checked /></label>
      </div>
      <canvas class="lab-widget-canvas" data-stochastic-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Forecast error hidden event coupled canvas"></canvas>
      <div class="ca-status" data-feh-status></div>
    `;
    this.canvas = this.root.querySelector('[data-stochastic-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-feh-status]');
    this.root.querySelector('[data-feh-scenario]').addEventListener('change', (event) => { this.scenario = event.target.value; this.draw(); });
    this.root.querySelector('[data-feh-samples]').addEventListener('input', (event) => { this.samples = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-feh-noise]').addEventListener('input', (event) => { this.noise = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-feh-flow]').addEventListener('change', (event) => { this.flowConsistency = event.target.checked; this.draw(); });
    this.draw();
  }

  draw() {
    const samplers = diagnosticScenario(this.scenario);
    const obs = deterministicObservations(this.samples, this.noise, samplers);
    const avgSurprise = obs.reduce((sum, item) => sum + item.surprise, 0) / obs.length;
    const coherence = samplers.hidden ? 0.74 : this.scenario === 'noisyFalseAlarm' ? 0.18 : 0.42;
    const persistence = samplers.hidden ? 0.8 : 0.36;
    const signature = samplers.hidden ? 0.78 : 0.35;
    const flow = this.flowConsistency ? (samplers.hidden ? 0.82 : 0.46) : 0.18;
    const hiddenEvidence = clamp01((avgSurprise / 2.4 + coherence + persistence + signature + flow) / 5);
    const forecastCorrection = clamp01((avgSurprise / 2.1) * (samplers.hidden ? 0.35 : 0.78));
    clearCanvas(this.ctx);
    drawPanelGrid(this.ctx, [
      { title: 'Expected E', sampler: samplers.forecast },
      { title: 'Truth T', sampler: samplers.truth },
      { title: 'Surprise', sampler: (x, y) => clamp01(Math.abs(samplers.truth(x, y) - samplers.forecast(x, y)) * 2.2) },
      { title: 'Hidden evidence', sampler: (x, y) => samplers.hidden ? clamp01(gaussian01(x, y, 0.58, -0.1, 0.22) + 0.15 * flow) : clamp01(Math.abs(samplers.truth(x, y) - samplers.forecast(x, y)) * 0.9) }
    ]);
    drawObservations(this.ctx, obs);
    this.status.textContent = `Forecast correction ${forecastCorrection.toFixed(2)} | hidden-event evidence ${hiddenEvidence.toFixed(2)} | innovation uses z_i minus E at each sample.`;
  }
}

class FlowConsistentAnomalyWidget {
  constructor(root) {
    this.root = root;
    this.alignment = 'withFlow';
    this.persistence = 0.7;
    this.signature = 0.72;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Flow consistent anomaly controls">
        <label>Observation alignment
          <select data-fca-alignment>
            <option value="withFlow">stretched along flow</option>
            <option value="againstFlow">cross-flow cluster</option>
            <option value="random">random spikes</option>
          </select>
        </label>
        <label>Persistence <input data-fca-persistence type="range" min="0" max="1" step="0.02" value="${this.persistence}" /></label>
        <label>Signature match <input data-fca-signature type="range" min="0" max="1" step="0.02" value="${this.signature}" /></label>
      </div>
      <canvas class="lab-widget-canvas" data-stochastic-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Flow consistent anomaly canvas"></canvas>
      <div class="ca-status" data-fca-status></div>
    `;
    this.canvas = this.root.querySelector('[data-stochastic-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-fca-status]');
    this.root.querySelector('[data-fca-alignment]').addEventListener('change', (event) => { this.alignment = event.target.value; this.draw(); });
    this.root.querySelector('[data-fca-persistence]').addEventListener('input', (event) => { this.persistence = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-fca-signature]').addEventListener('input', (event) => { this.signature = Number(event.target.value); this.draw(); });
    this.draw();
  }

  draw() {
    const alignmentScore = this.alignment === 'withFlow' ? 0.86 : this.alignment === 'againstFlow' ? 0.34 : 0.2;
    const confidence = clamp01((alignmentScore + this.persistence + this.signature) / 3);
    clearCanvas(this.ctx);
    drawField(this.ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, (x, y) => clamp01(0.25 + gaussian01(x, y, 0.55, -0.08, 0.28) * confidence));
    drawArrowField(this.ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0xF10A);
    drawAnomalyTrack(this.ctx, this.alignment);
    this.status.textContent = `hidden_event_evidence uses surprise + spatial coherence + persistence + sensor signature + flow consistency. Confidence ${confidence.toFixed(2)}.`;
  }
}

class AcquisitionComposerWidget {
  constructor(root) {
    this.root = root;
    this.weights = { value: 0.45, uncertainty: 0.25, unknown: 0.22, validation: 0.18, cost: 0.16, risk: 0.12 };
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls lab-acquisition-composer" aria-label="Acquisition composer controls">
        ${this.slider('value', 'posterior value')}
        ${this.slider('uncertainty', 'uncertainty')}
        ${this.slider('unknown', 'unknown event')}
        ${this.slider('validation', 'forecast validation')}
        ${this.slider('cost', 'travel cost')}
        ${this.slider('risk', 'risk penalty')}
        <button type="button" data-sc-acq-suggest>Suggest next sample</button>
      </div>
      <canvas class="lab-widget-canvas" data-stochastic-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Acquisition composer canvas"></canvas>
      <div class="ca-status" data-sc-acq-status></div>
    `;
    this.canvas = this.root.querySelector('[data-stochastic-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-sc-acq-status]');
    this.root.querySelectorAll('[data-sc-acq-weight]').forEach((input) => {
      input.addEventListener('input', (event) => { this.weights[event.target.dataset.scAcqWeight] = Number(event.target.value); this.draw(); });
    });
    this.root.querySelector('[data-sc-acq-suggest]').addEventListener('click', () => this.draw(true));
    this.draw();
  }

  slider(key, label) {
    return `<label>${label} <input data-sc-acq-weight="${key}" type="range" min="0" max="1" step="0.02" value="${this.weights[key]}" /></label>`;
  }

  sample(x, y) {
    const value = posteriorValue(x, y, 0xAC01, 0.16);
    const uncertainty = expectedUncertainty(x, y, 'forecastDisagreement');
    const unknown = unknownProbability(x, y, 'coherentAnomaly');
    const validation = clamp01(Math.abs(truthValue(x, y, 0xAC01) - forecastValue(x, y, 0xAC01, 0.2)) * 1.5);
    const cost = routeCost(x, y);
    const risk = riskPenalty(x, y);
    return clamp01(
      this.weights.value * value
      + this.weights.uncertainty * uncertainty
      + this.weights.unknown * unknown
      + this.weights.validation * validation
      - this.weights.cost * cost
      - this.weights.risk * risk
    );
  }

  draw(showSuggest = false) {
    clearCanvas(this.ctx);
    drawField(this.ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, (x, y) => this.sample(x, y));
    drawConstraintOverlay(this.ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const best = bestCell((x, y) => this.sample(x, y));
    drawTarget(this.ctx, best.x, best.y, '#ffffff');
    const label = showSuggest ? 'suggested next sample' : 'current best';
    this.status.textContent = `${label}: (${best.col},${best.row}) | A(x,y,t) combines mu_post, U, P_unknown, flow, constraints, mission, cost, and risk.`;
  }
}

class ReachableAcquisitionWidget {
  constructor(root) {
    this.root = root;
    this.timeBudget = 0.56;
    this.flowAssist = 0.5;
    this.costWeight = 0.22;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Reachable acquisition controls">
        <label>Time budget <input data-ra-time type="range" min="0.25" max="1" step="0.02" value="${this.timeBudget}" /></label>
        <label>Flow assist <input data-ra-flow type="range" min="0" max="1" step="0.02" value="${this.flowAssist}" /></label>
        <label>Cost weight <input data-ra-cost type="range" min="0" max="0.7" step="0.02" value="${this.costWeight}" /></label>
      </div>
      <canvas class="lab-widget-canvas" data-stochastic-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Reachable acquisition canvas"></canvas>
      <div class="ca-status" data-ra-status></div>
    `;
    this.canvas = this.root.querySelector('[data-stochastic-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-ra-status]');
    this.root.querySelector('[data-ra-time]').addEventListener('input', (event) => { this.timeBudget = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-ra-flow]').addEventListener('input', (event) => { this.flowAssist = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-ra-cost]').addEventListener('input', (event) => { this.costWeight = Number(event.target.value); this.draw(); });
    this.draw();
  }

  draw() {
    const reachable = (x, y) => reachableMask(x, y, this.timeBudget, this.flowAssist);
    const value = (x, y) => clamp01(reachable(x, y) * (layerValue('acquisition', x, y, 0x5C0A11) - this.costWeight * routeCost(x, y)));
    clearCanvas(this.ctx);
    drawField(this.ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, value);
    drawReachEllipse(this.ctx, this.timeBudget, this.flowAssist);
    drawConstraintOverlay(this.ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const best = bestCell(value);
    this.status.textContent = `Constraint-aware best (${best.col},${best.row}) | unreachable value is not executable mission value.`;
  }
}

class SurfaceUpdateCycleWidget {
  constructor(root) {
    this.root = root;
    this.scenario = 'forecastCorrection';
    this.samples = 4;
    this.cycle = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Surface update cycle controls">
        <label>Update case
          <select data-suc-scenario>
            <option value="forecastCorrection">forecast correction</option>
            <option value="hiddenDiscovery">hidden discovery</option>
            <option value="mixedCase">mixed case</option>
          </select>
        </label>
        <label>Observation count <input data-suc-samples type="range" min="1" max="10" step="1" value="${this.samples}" /></label>
        <button type="button" data-suc-update>Surface + update</button>
        <button type="button" data-suc-reset>Reset</button>
      </div>
      <canvas class="lab-widget-canvas" data-stochastic-coupled-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Surface update cycle canvas"></canvas>
      <div class="ca-status" data-suc-status></div>
    `;
    this.canvas = this.root.querySelector('[data-stochastic-coupled-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-suc-status]');
    this.root.querySelector('[data-suc-scenario]').addEventListener('change', (event) => { this.scenario = event.target.value; this.draw(); });
    this.root.querySelector('[data-suc-samples]').addEventListener('input', (event) => { this.samples = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-suc-update]').addEventListener('click', () => { this.cycle += 1; this.draw(); });
    this.root.querySelector('[data-suc-reset]').addEventListener('click', () => { this.cycle = 0; this.draw(); });
    this.draw();
  }

  draw() {
    const gain = clamp01(0.12 + this.cycle * 0.18 + this.samples * 0.03);
    const pre = (x, y) => forecastValue(x, y, 0x5150, this.scenario === 'hiddenDiscovery' ? -0.1 : 0.25);
    const post = (x, y) => clamp01((1 - gain) * pre(x, y) + gain * truthValue(x, y, 0x5150) + (this.scenario === 'hiddenDiscovery' ? 0.25 * unknownProbability(x, y, 'coherentAnomaly') : 0));
    clearCanvas(this.ctx);
    drawPanelGrid(this.ctx, [
      { title: 'Before surfacing', sampler: pre },
      { title: 'Observations', sampler: (x, y) => sampleSparseDots(x, y, this.samples) },
      { title: 'After update', sampler: post }
    ]);
    this.status.textContent = `Cycle ${this.cycle} | surface packet assimilates observations, updates mu_post and uncertainty, then replans.`;
  }
}

class OracleRegretComparisonWidget {
  constructor(root) {
    this.root = root;
    this.choice = null;
    this.revealed = false;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Oracle regret comparison controls">
        <button type="button" data-regret-choice="0">Choose belief route</button>
        <button type="button" data-regret-choice="1">Choose uncertainty route</button>
        <button type="button" data-regret-choice="2">Choose hidden-event route</button>
        <button type="button" data-regret-reveal>Reveal oracle</button>
        <button type="button" data-regret-reset>Reset</button>
      </div>
      <div class="lab-regret-comparison" data-regret-output></div>
      <div class="ca-status" data-regret-status></div>
    `;
    this.output = this.root.querySelector('[data-regret-output]');
    this.status = this.root.querySelector('[data-regret-status]');
    this.root.querySelectorAll('[data-regret-choice]').forEach((button) => {
      button.addEventListener('click', () => { this.choice = Number(button.dataset.regretChoice); this.render(); });
    });
    this.root.querySelector('[data-regret-reveal]').addEventListener('click', () => { this.revealed = true; this.render(); });
    this.root.querySelector('[data-regret-reset]').addEventListener('click', () => { this.choice = null; this.revealed = false; this.render(); });
    this.render();
  }

  render() {
    const routes = [
      { name: 'Belief route', belief: 0.86, oracle: 0.63, cost: 0.32 },
      { name: 'Uncertainty route', belief: 0.68, oracle: 0.72, cost: 0.39 },
      { name: 'Hidden-event route', belief: 0.61, oracle: 0.91, cost: 0.46 }
    ];
    const oracleBest = Math.max(...routes.map((route) => route.oracle));
    this.output.innerHTML = routes.map((route, index) => {
      const selected = this.choice === index ? ' selected' : '';
      const oracleText = this.revealed ? route.oracle.toFixed(2) : 'hidden';
      return `<div class="lab-regret-card${selected}"><h3>${route.name}</h3><p>Belief score ${route.belief.toFixed(2)}</p><p>Oracle score ${oracleText}</p><p>Travel cost ${route.cost.toFixed(2)}</p></div>`;
    }).join('');
    if (this.choice === null) {
      this.status.textContent = 'Choose a route using belief, then reveal the oracle to calculate regret.';
      return;
    }
    const chosen = routes[this.choice];
    const regret = this.revealed ? Math.max(0, oracleBest - chosen.oracle) : 0;
    this.status.textContent = this.revealed
      ? `regret = S*(chosen_oracle_best) - S*(chosen_by_belief) = ${regret.toFixed(2)}.`
      : `${chosen.name} chosen using belief; oracle truth remains hidden.`;
  }
}

function clearCanvas(ctx) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#07151d';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawField(ctx, x0, y0, width, height, sampler) {
  const cellW = width / GRID_W;
  const cellH = height / GRID_H;
  for (let row = 0; row < GRID_H; row += 1) {
    for (let col = 0; col < GRID_W; col += 1) {
      const x = (col + 0.5) / GRID_W;
      const y = (row + 0.5) / GRID_H;
      ctx.fillStyle = heatColor(clamp01(sampler(x, y)));
      ctx.fillRect(x0 + col * cellW, y0 + row * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
}

function drawPanelGrid(ctx, panels) {
  const gap = 10;
  const panelW = (CANVAS_WIDTH - gap * (panels.length + 1)) / panels.length;
  const panelH = CANVAS_HEIGHT - 34;
  panels.forEach((panel, index) => {
    const x = gap + index * (panelW + gap);
    drawField(ctx, x, 26, panelW, panelH, panel.sampler);
    ctx.fillStyle = '#e8f4f7';
    ctx.font = '700 12px system-ui';
    ctx.fillText(panel.title, x + 4, 16);
  });
}

function drawArrowField(ctx, x0, y0, width, height, seed) {
  ctx.save();
  ctx.strokeStyle = 'rgba(232,244,247,0.72)';
  ctx.lineWidth = 1.2;
  for (let row = 2; row < GRID_H; row += 4) {
    for (let col = 2; col < GRID_W; col += 4) {
      const x = (col + 0.5) / GRID_W;
      const y = (row + 0.5) / GRID_H;
      const flow = flowVector(x, y, seed);
      const px = x0 + x * width;
      const py = y0 + y * height;
      const len = 12;
      ctx.beginPath();
      ctx.moveTo(px - flow.u * len * 0.5, py - flow.v * len * 0.5);
      ctx.lineTo(px + flow.u * len * 0.5, py + flow.v * len * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawConstraintOverlay(ctx, x0, y0, width, height) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 10, 16, 0.55)';
  ctx.fillRect(x0 + width * 0.06, y0 + height * 0.7, width * 0.24, height * 0.2);
  ctx.fillRect(x0 + width * 0.72, y0 + height * 0.12, width * 0.18, height * 0.18);
  ctx.strokeStyle = 'rgba(255,113,140,0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 + width * 0.06, y0 + height * 0.7, width * 0.24, height * 0.2);
  ctx.strokeRect(x0 + width * 0.72, y0 + height * 0.12, width * 0.18, height * 0.18);
  ctx.restore();
}

function drawHiddenMask(ctx) {
  ctx.fillStyle = 'rgba(3,9,14,0.78)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#e8f4f7';
  ctx.font = '800 20px system-ui';
  ctx.fillText('truth hidden', 196, 150);
}

function drawObservations(ctx, observations) {
  observations.forEach((obs) => drawTarget(ctx, obs.x, obs.y, obs.surprise > 1.5 ? '#ff718c' : '#eeb84b'));
}

function drawTarget(ctx, x, y, color) {
  const px = x * CANVAS_WIDTH;
  const py = y * CANVAS_HEIGHT;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 7, 0, TAU);
  ctx.moveTo(px - 10, py);
  ctx.lineTo(px + 10, py);
  ctx.moveTo(px, py - 10);
  ctx.lineTo(px, py + 10);
  ctx.stroke();
  ctx.restore();
}

function drawAnomalyTrack(ctx, alignment) {
  ctx.save();
  ctx.fillStyle = '#eeb84b';
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8;
    const x = alignment === 'random' ? seededRng(90 + i)() : 0.22 + t * 0.55;
    const y = alignment === 'withFlow' ? 0.64 - t * 0.26 : alignment === 'againstFlow' ? 0.35 + t * 0.3 : seededRng(200 + i)();
    ctx.beginPath();
    ctx.arc(x * CANVAS_WIDTH, y * CANVAS_HEIGHT, 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawReachEllipse(ctx, timeBudget, flowAssist) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(CANVAS_WIDTH * 0.18, CANVAS_HEIGHT * 0.78, CANVAS_WIDTH * (0.18 + timeBudget * 0.28 + flowAssist * 0.08), CANVAS_HEIGHT * (0.12 + timeBudget * 0.2), -0.25, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH * 0.18, CANVAS_HEIGHT * 0.78, 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function layerValue(layer, x, y, seed) {
  if (layer === 'truth') return truthValue(x, y, seed);
  if (layer === 'forecast') return forecastValue(x, y, seed, 0.22);
  if (layer === 'posterior') return posteriorValue(x, y, seed, 0.16);
  if (layer === 'expectedUncertainty') return expectedUncertainty(x, y, 'forecastDisagreement');
  if (layer === 'unknownProbability') return unknownProbability(x, y, 'coherentAnomaly');
  return clamp01(0.42 * posteriorValue(x, y, seed, 0.16) + 0.22 * expectedUncertainty(x, y, 'forecastDisagreement') + 0.25 * unknownProbability(x, y, 'coherentAnomaly') - 0.12 * routeCost(x, y) - 0.08 * riskPenalty(x, y));
}

function truthValue(x, y, seed) {
  return clamp01(
    0.08
    + gaussian01(x, y, 0.28, 0.36, 0.2)
    + 0.85 * gaussian01(x, y, 0.68, 0.58, 0.18)
    + 0.16 * Math.sin((x * 2.4 + y * 1.8 + (seed % 17)) * TAU)
  );
}

function forecastValue(x, y, seed, bias) {
  return clamp01(
    0.1
    + gaussian01(x, y, 0.28 + bias, 0.38 - bias * 0.2, 0.24)
    + 0.58 * gaussian01(x, y, 0.62 - bias * 0.3, 0.54, 0.22)
    + 0.08 * Math.sin((x * 2.0 + y * 2.2 + (seed % 13)) * TAU)
  );
}

function posteriorValue(x, y, seed, bias) {
  return clamp01(0.62 * forecastValue(x, y, seed, bias) + 0.38 * truthValue(x, y, seed));
}

function expectedUncertainty(x, y, scenario) {
  const base = 0.18 + 0.25 * Math.abs(Math.sin((x * 1.3 + y * 0.8) * TAU));
  if (scenario === 'sparseData') return clamp01(base + 0.5 * (1 - gaussian01(x, y, 0.25, 0.78, 0.32)));
  if (scenario === 'forecastDisagreement') return clamp01(base + 0.55 * gaussian01(x, y, 0.42, 0.48, 0.22));
  if (scenario === 'coherentAnomaly') return clamp01(base * 0.7 + 0.28 * gaussian01(x, y, 0.65, 0.42, 0.26));
  return clamp01(base + 0.28 * randomCellNoise(x, y, 21));
}

function unknownProbability(x, y, scenario) {
  if (scenario === 'coherentAnomaly') return clamp01(gaussian01(x, y, 0.64, 0.42, 0.18) + 0.55 * gaussian01(x, y, 0.72, 0.36, 0.14));
  if (scenario === 'randomSpike') return randomCellNoise(x, y, 82) > 0.78 ? 0.92 : 0.12;
  if (scenario === 'forecastDisagreement') return clamp01(0.2 + 0.35 * gaussian01(x, y, 0.44, 0.5, 0.2));
  return clamp01(0.12 + 0.25 * gaussian01(x, y, 0.8, 0.2, 0.22));
}

function oracleObjective(x, y, seed) {
  return clamp01(0.74 * truthValue(x, y, seed) + 0.18 * flowBenefit(x, y, seed) - 0.15 * routeCost(x, y) - 0.12 * riskPenalty(x, y));
}

function beliefObjective(x, y, seed, bias, uncertainty) {
  const biasValue = bias === 'shifted' ? 0.22 : bias === 'weak' ? 0.05 : bias === 'strong' ? 0.34 : -0.12;
  const hidden = bias === 'missing' ? unknownProbability(x, y, 'coherentAnomaly') : 0;
  return clamp01(0.58 * forecastValue(x, y, seed, biasValue) + uncertainty * 0.25 * expectedUncertainty(x, y, 'forecastDisagreement') + 0.28 * hidden - 0.15 * routeCost(x, y));
}

function diagnosticScenario(name) {
  if (name === 'hiddenPlume') {
    return {
      hidden: true,
      forecast: (x, y) => forecastValue(x, y, 40, 0.12) * 0.74,
      truth: (x, y) => clamp01(forecastValue(x, y, 40, 0.12) * 0.74 + 0.72 * gaussian01(x, y, 0.62, 0.42, 0.16))
    };
  }
  if (name === 'hiddenBloomLayer') {
    return {
      hidden: true,
      forecast: (x, y) => forecastValue(x, y, 45, -0.08) * 0.68,
      truth: (x, y) => clamp01(forecastValue(x, y, 45, -0.08) * 0.68 + 0.58 * Math.max(0, Math.sin((x * 1.4 + y * 0.8) * TAU)))
    };
  }
  if (name === 'weakForecastHotspot') {
    return {
      hidden: false,
      forecast: (x, y) => forecastValue(x, y, 44, 0.14) * 0.58,
      truth: (x, y) => forecastValue(x, y, 44, 0.14)
    };
  }
  if (name === 'noisyFalseAlarm') {
    return {
      hidden: false,
      forecast: (x, y) => forecastValue(x, y, 46, 0.02),
      truth: (x, y) => forecastValue(x, y, 46, 0.02)
    };
  }
  return {
    hidden: false,
    forecast: (x, y) => forecastValue(x, y, 43, -0.18),
    truth: (x, y) => forecastValue(x, y, 43, 0.16)
  };
}

function deterministicObservations(count, noise, samplers) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const rng = seededRng(0xC0DE + i * 37);
    const x = 0.2 + 0.66 * rng();
    const y = 0.2 + 0.62 * rng();
    const z = clamp01(samplers.truth(x, y) + (rng() - 0.5) * noise);
    const expected = samplers.forecast(x, y);
    const surprise = Math.abs(z - expected) / Math.sqrt(0.16 * 0.16 + noise * noise);
    points.push({ x, y, z, expected, surprise });
  }
  return points;
}

function sampleSparseDots(x, y, count) {
  let value = 0.08;
  for (let i = 0; i < count; i += 1) {
    const rng = seededRng(300 + i * 13);
    value = Math.max(value, gaussian01(x, y, rng(), rng(), 0.06));
  }
  return clamp01(value);
}

function flowVector(x, y, seed) {
  const angle = Math.sin((x * 1.4 + (seed % 7) * 0.04) * TAU) * 0.8 + y * 1.4 - 0.6;
  return { u: Math.cos(angle), v: Math.sin(angle) * 0.75 };
}

function flowBenefit(x, y, seed) {
  const flow = flowVector(x, y, seed);
  return clamp01(0.5 + 0.35 * flow.u - 0.15 * flow.v);
}

function reachableMask(x, y, timeBudget, flowAssist) {
  const dx = x - 0.18;
  const dy = y - 0.78;
  const assistedX = dx - flowAssist * 0.12;
  const distance = Math.sqrt(assistedX * assistedX + dy * dy * 1.55);
  return distance < 0.18 + timeBudget * 0.46 ? 1 : 0.18;
}

function routeCost(x, y) {
  const dx = x - 0.18;
  const dy = y - 0.78;
  return clamp01(Math.sqrt(dx * dx + dy * dy) / 0.95);
}

function riskPenalty(x, y) {
  return clamp01(0.7 * gaussian01(x, y, 0.82, 0.2, 0.16) + 0.6 * gaussian01(x, y, 0.16, 0.78, 0.15));
}

function bestCell(sampler) {
  let best = { x: 0, y: 0, col: 0, row: 0, value: -Infinity };
  for (let row = 0; row < GRID_H; row += 1) {
    for (let col = 0; col < GRID_W; col += 1) {
      const x = (col + 0.5) / GRID_W;
      const y = (row + 0.5) / GRID_H;
      const value = sampler(x, y);
      if (value > best.value) best = { x, y, col, row, value };
    }
  }
  return best;
}

function gaussian01(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return Math.exp(-(dx * dx + dy * dy) / Math.max(0.0001, radius * radius));
}

function randomCellNoise(x, y, salt) {
  const col = Math.floor(x * GRID_W);
  const row = Math.floor(y * GRID_H);
  return seededRng((col + 1) * 73856093 ^ (row + 1) * 19349663 ^ salt)();
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

function labelForLayer(layer) {
  const labels = {
    truth: 'T(x,y,t)',
    forecast: 'E(x,y,t)',
    posterior: 'mu_post(x,y,t)',
    expectedUncertainty: 'U_expected(x,y,t)',
    unknownProbability: 'P_unknown(x,y,t)',
    acquisition: 'A(x,y,t)'
  };
  return labels[layer] ?? layer;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
