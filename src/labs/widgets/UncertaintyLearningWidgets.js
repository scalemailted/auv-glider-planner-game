const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 300;
const TAU = Math.PI * 2;
const GRID_W = 34;
const GRID_H = 20;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-uncertainty-widget]').forEach((root) => {
      const type = root.dataset.uncertaintyWidget;
      if (type === 'hidden-truth-forecast') new HiddenTruthForecastWidget(root).mount();
      if (type === 'forecast-error-vs-hidden-event') new ForecastErrorHiddenEventWidget(root).mount();
      if (type === 'bayesian-cell-update') new BayesianCellUpdateWidget(root).mount();
      if (type === 'markov-transition') new MarkovTransitionWidget(root).mount();
      if (type === 'gaussian-field-intuition') new GaussianFieldIntuitionWidget(root).mount();
      if (type === 'regret-information-value') new RegretInformationWidget(root).mount();
      if (type === 'acquisition-map') new AcquisitionMapWidget(root).mount();
      if (type === 'distribution-realization') new DistributionRealizationWidget(root).mount();
    });
  });
}

class HiddenTruthForecastWidget {
  constructor(root) {
    this.root = root;
    this.revealTruth = false;
    this.noise = 0.12;
    this.bias = 0.22;
    this.seed = 0xA11CE;
    this.observations = [];
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Hidden truth forecast controls">
        <label>Reveal truth <input data-htf-reveal type="checkbox" /></label>
        <label>Sensor noise <input data-htf-noise type="range" min="0" max="0.5" step="0.02" value="${this.noise}" /></label>
        <label>Forecast bias <input data-htf-bias type="range" min="-0.5" max="0.5" step="0.02" value="${this.bias}" /></label>
        <button type="button" data-htf-observe>Add observation</button>
        <button type="button" data-htf-reset>Reset seed</button>
      </div>
      <canvas class="lab-widget-canvas" data-uncertainty-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Hidden truth forecast observation canvas"></canvas>
      <div class="ca-status" data-htf-status></div>
    `;
    this.canvas = this.root.querySelector('[data-uncertainty-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-htf-status]');
    this.root.querySelector('[data-htf-reveal]').addEventListener('change', (event) => { this.revealTruth = event.target.checked; this.draw(); });
    this.root.querySelector('[data-htf-noise]').addEventListener('input', (event) => { this.noise = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-htf-bias]').addEventListener('input', (event) => { this.bias = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-htf-observe]').addEventListener('click', () => { this.addObservation(); this.draw(); });
    this.root.querySelector('[data-htf-reset]').addEventListener('click', () => { this.seed += 7919; this.observations = []; this.draw(); });
    this.draw();
  }

  addObservation() {
    const rng = seededRng(this.seed + this.observations.length * 101);
    const x = rng();
    const y = rng();
    const truth = truthValue(x, y, this.seed);
    const noise = (rng() - 0.5) * this.noise;
    this.observations.push({ x, y, z: clamp01(truth + noise) });
  }

  draw() {
    const panels = [
      { title: this.revealTruth ? 'Truth T' : 'Truth hidden', sampler: (x, y) => this.revealTruth ? truthValue(x, y, this.seed) : 0.18 },
      { title: 'Forecast E', sampler: (x, y) => forecastValue(x, y, this.seed, this.bias) },
      { title: 'Posterior mu', sampler: (x, y) => posteriorValue(x, y, this.seed, this.bias, this.observations, this.noise) },
      { title: 'Uncertainty U', sampler: (x, y) => uncertaintyValue(x, y, this.observations, this.noise) }
    ];
    clearCanvas(this.ctx);
    drawPanelGrid(this.ctx, panels);
    drawObservations(this.ctx, this.observations);
    this.status.textContent = `Observations ${this.observations.length} | sensor noise ${this.noise.toFixed(2)} | forecast bias ${this.bias.toFixed(2)} | truth ${this.revealTruth ? 'visible' : 'hidden'}`;
  }
}

class ForecastErrorHiddenEventWidget {
  constructor(root) {
    this.root = root;
    this.scenario = 'shiftedFront';
    this.noise = 0.12;
    this.threshold = 1.4;
    this.samples = 5;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Forecast error versus hidden event controls">
        <label>Scenario
          <select data-feh-scenario>
            <option value="shiftedFront">shifted forecast front</option>
            <option value="weakenedHotspot">weakened hotspot</option>
            <option value="hiddenAnomaly">hidden anomaly</option>
            <option value="noisyFalseAlarm">noisy false alarm</option>
          </select>
        </label>
        <label>Sensor noise <input data-feh-noise type="range" min="0.02" max="0.5" step="0.02" value="${this.noise}" /></label>
        <label>Evidence threshold <input data-feh-threshold type="range" min="0.5" max="3" step="0.1" value="${this.threshold}" /></label>
        <label>Samples <input data-feh-samples type="range" min="1" max="12" step="1" value="${this.samples}" /></label>
      </div>
      <canvas class="lab-widget-canvas" data-uncertainty-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Forecast error hidden event canvas"></canvas>
      <div class="ca-status" data-feh-status></div>
    `;
    this.canvas = this.root.querySelector('[data-uncertainty-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-feh-status]');
    this.root.querySelector('[data-feh-scenario]').addEventListener('change', (event) => { this.scenario = event.target.value; this.draw(); });
    this.root.querySelector('[data-feh-noise]').addEventListener('input', (event) => { this.noise = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-feh-threshold]').addEventListener('input', (event) => { this.threshold = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-feh-samples]').addEventListener('input', (event) => { this.samples = Number(event.target.value); this.draw(); });
    this.draw();
  }

  draw() {
    const scenario = scenarioSamplers(this.scenario);
    const observations = deterministicSamplePath(this.samples).map(({ x, y }, index) => {
      const rng = seededRng(0xFEED + index * 17);
      const z = clamp01(scenario.truth(x, y) + (rng() - 0.5) * this.noise);
      const expected = scenario.forecast(x, y);
      const surprise = Math.abs(z - expected) / Math.sqrt(0.14 * 0.14 + this.noise * this.noise);
      return { x, y, z, expected, surprise };
    });
    const averageSurprise = observations.reduce((sum, obs) => sum + obs.surprise, 0) / observations.length;
    const coherence = scenario.hiddenEvent ? 0.85 : this.scenario === 'noisyFalseAlarm' ? 0.18 : 0.42;
    const hiddenConfidence = clamp01((averageSurprise / this.threshold) * coherence);
    const correctionScore = clamp01((averageSurprise / this.threshold) * (scenario.hiddenEvent ? 0.35 : 0.85));
    const response = hiddenConfidence > 0.62
      ? 'create new hypothesis and gather confirmatory samples'
      : correctionScore > 0.58
        ? 'update forecast and reduce confidence in old estimate'
        : 'ignore as likely noise or gather one more sample';
    clearCanvas(this.ctx);
    drawPanelGrid(this.ctx, [
      { title: 'Expected E', sampler: scenario.forecast },
      { title: 'Hidden truth T', sampler: scenario.truth },
      { title: 'Surprise map', sampler: (x, y) => clamp01(Math.abs(scenario.truth(x, y) - scenario.forecast(x, y)) * 2) },
      { title: 'Diagnosis', sampler: (x, y) => scenario.hiddenEvent ? gaussian01(x, y, 0.55, -0.2, 0.22) : clamp01(Math.abs(scenario.truth(x, y) - scenario.forecast(x, y)) * 1.3) }
    ]);
    drawObservations(this.ctx, observations);
    this.status.textContent = `Forecast correction score ${correctionScore.toFixed(2)} | hidden-event confidence ${hiddenConfidence.toFixed(2)} | response: ${response}.`;
  }
}

class BayesianCellUpdateWidget {
  constructor(root) {
    this.root = root;
    this.prior = 0.35;
    this.truePositive = 0.82;
    this.falsePositive = 0.18;
    this.observation = 'detected';
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Bayesian cell update controls">
        <label>Prior event probability <input data-bayes-prior type="range" min="0.01" max="0.99" step="0.01" value="${this.prior}" /></label>
        <label>True-positive rate <input data-bayes-tpr type="range" min="0.1" max="0.99" step="0.01" value="${this.truePositive}" /></label>
        <label>False-positive rate <input data-bayes-fpr type="range" min="0.01" max="0.8" step="0.01" value="${this.falsePositive}" /></label>
        <label>Observation
          <select data-bayes-observation>
            <option value="detected">detected</option>
            <option value="notDetected">not detected</option>
          </select>
        </label>
      </div>
      <div class="lab-prior-posterior" data-bayes-output aria-label="Bayesian prior posterior output"></div>
    `;
    this.output = this.root.querySelector('[data-bayes-output]');
    this.root.querySelector('[data-bayes-prior]').addEventListener('input', (event) => { this.prior = Number(event.target.value); this.render(); });
    this.root.querySelector('[data-bayes-tpr]').addEventListener('input', (event) => { this.truePositive = Number(event.target.value); this.render(); });
    this.root.querySelector('[data-bayes-fpr]').addEventListener('input', (event) => { this.falsePositive = Number(event.target.value); this.render(); });
    this.root.querySelector('[data-bayes-observation]').addEventListener('change', (event) => { this.observation = event.target.value; this.render(); });
    this.render();
  }

  render() {
    const posterior = bayesPosterior(this.prior, this.truePositive, this.falsePositive, this.observation);
    const confidence = posterior > 0.75 ? 'high event confidence' : posterior < 0.25 ? 'low event confidence' : 'ambiguous evidence';
    this.output.innerHTML = `
      <div><strong>Prior</strong><span>${percent(this.prior)}</span></div>
      <div><strong>Observation</strong><span>${this.observation === 'detected' ? 'detected' : 'not detected'}</span></div>
      <div><strong>Posterior</strong><span data-bayes-posterior>${percent(posterior)}</span></div>
      <div><strong>Interpretation</strong><span>${confidence}. A detection depends on prior and sensor reliability.</span></div>
    `;
  }
}

class MarkovTransitionWidget {
  constructor(root) {
    this.root = root;
    this.preset = 'persistent';
    this.distribution = [0.72, 0.18, 0.1];
    this.stepCount = 0;
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Markov transition controls">
        <label>Preset
          <select data-markov-preset>
            <option value="persistent">persistent anomaly</option>
            <option value="recovery">fast recovery</option>
            <option value="switching">noisy switching</option>
            <option value="absorbing">absorbing event</option>
          </select>
        </label>
        <button type="button" data-markov-step>Step forward</button>
        <button type="button" data-markov-reset>Reset</button>
      </div>
      <div class="lab-probability-table" data-markov-output></div>
      <div class="ca-status" data-markov-status></div>
    `;
    this.output = this.root.querySelector('[data-markov-output]');
    this.status = this.root.querySelector('[data-markov-status]');
    this.root.querySelector('[data-markov-preset]').addEventListener('change', (event) => { this.preset = event.target.value; this.reset(); });
    this.root.querySelector('[data-markov-step]').addEventListener('click', () => { this.distribution = applyTransition(this.distribution, transitionMatrix(this.preset)); this.stepCount += 1; this.render(); });
    this.root.querySelector('[data-markov-reset]').addEventListener('click', () => this.reset());
    this.render();
  }

  reset() {
    this.distribution = [0.72, 0.18, 0.1];
    this.stepCount = 0;
    this.render();
  }

  render() {
    const labels = ['Clear', 'Anomaly', 'Recovering'];
    this.output.innerHTML = this.distribution.map((value, index) => `
      <div class="lab-probability-card">
        <strong>${labels[index]}</strong>
        <div class="lab-confidence-meter"><span style="width:${Math.round(value * 100)}%"></span></div>
        <small>${percent(value)}</small>
      </div>
    `).join('');
    this.status.textContent = `Step ${this.stepCount}. Markovian means the current state distribution controls the next distribution.`;
  }
}

class GaussianFieldIntuitionWidget {
  constructor(root) {
    this.root = root;
    this.lengthScale = 0.35;
    this.noise = 0.12;
    this.seed = 0x9A055;
    this.observations = [];
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Gaussian field intuition controls">
        <label>Length scale <input data-gp-length type="range" min="0.12" max="0.8" step="0.02" value="${this.lengthScale}" /></label>
        <label>Noise <input data-gp-noise type="range" min="0.02" max="0.4" step="0.02" value="${this.noise}" /></label>
        <button type="button" data-gp-observe>Add observation</button>
        <button type="button" data-gp-reset>Reset seed</button>
      </div>
      <canvas class="lab-widget-canvas" data-uncertainty-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Gaussian field intuition canvas"></canvas>
      <div class="ca-status" data-gp-status></div>
    `;
    this.canvas = this.root.querySelector('[data-uncertainty-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-gp-status]');
    this.root.querySelector('[data-gp-length]').addEventListener('input', (event) => { this.lengthScale = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-gp-noise]').addEventListener('input', (event) => { this.noise = Number(event.target.value); this.draw(); });
    this.root.querySelector('[data-gp-observe]').addEventListener('click', () => { this.addObservation(); this.draw(); });
    this.root.querySelector('[data-gp-reset]').addEventListener('click', () => { this.seed += 977; this.observations = []; this.draw(); });
    this.addObservation();
    this.addObservation();
    this.draw();
  }

  addObservation() {
    const rng = seededRng(this.seed + this.observations.length * 131);
    const x = rng();
    const y = rng();
    const truth = truthValue(x, y, this.seed);
    this.observations.push({ x, y, z: clamp01(truth + (rng() - 0.5) * this.noise) });
  }

  draw() {
    clearCanvas(this.ctx);
    drawPanelGrid(this.ctx, [
      { title: 'Hidden truth', sampler: (x, y) => truthValue(x, y, this.seed) },
      { title: 'GP-style mean', sampler: (x, y) => kernelMean(x, y, this.observations, this.lengthScale) },
      { title: 'Uncertainty', sampler: (x, y) => kernelUncertainty(x, y, this.observations, this.lengthScale, this.noise) },
      { title: 'Samples', sampler: (x, y) => kernelMean(x, y, this.observations, this.lengthScale) }
    ]);
    drawObservations(this.ctx, this.observations);
    this.status.textContent = `GP-style educational interpolation, not a full GP solver. Observations ${this.observations.length} | length scale ${this.lengthScale.toFixed(2)} | noise ${this.noise.toFixed(2)}`;
  }
}

class RegretInformationWidget {
  constructor(root) {
    this.root = root;
    this.choice = null;
    this.revealed = false;
    this.sites = [
      { label: 'A', expected: 0.78, uncertainty: 0.18, hidden: 0.08, cost: 0.12, truth: 0.64 },
      { label: 'B', expected: 0.52, uncertainty: 0.46, hidden: 0.62, cost: 0.18, truth: 0.92 },
      { label: 'C', expected: 0.62, uncertainty: 0.28, hidden: 0.2, cost: 0.08, truth: 0.7 }
    ];
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Regret and information value controls">
        ${this.sites.map((site, index) => `<button type="button" data-regret-choice="${index}">Choose site ${site.label}</button>`).join('')}
        <button type="button" data-regret-reveal>Reveal outcome</button>
        <button type="button" data-regret-reset>Reset</button>
      </div>
      <div class="lab-metric-grid" data-regret-output></div>
    `;
    this.output = this.root.querySelector('[data-regret-output]');
    this.root.addEventListener('click', (event) => {
      const choice = Number(event.target?.dataset?.regretChoice);
      if (Number.isInteger(choice)) { this.choice = choice; this.render(); }
      if (event.target?.dataset?.regretReveal !== undefined) { this.revealed = true; this.render(); }
      if (event.target?.dataset?.regretReset !== undefined) { this.choice = null; this.revealed = false; this.render(); }
    });
    this.render();
  }

  render() {
    const oracleBest = Math.max(...this.sites.map((site) => site.truth - site.cost));
    const chosen = this.choice === null ? null : this.sites[this.choice];
    const collected = chosen ? (this.revealed ? chosen.truth : chosen.expected) - chosen.cost : 0;
    const regret = chosen && this.revealed ? Math.max(0, oracleBest - collected) : null;
    this.output.innerHTML = this.sites.map((site, index) => `
      <div class="lab-regret-card ${this.choice === index ? 'selected' : ''}">
        <strong>Site ${site.label}</strong>
        <span>expected ${site.expected.toFixed(2)}</span>
        <span>uncertainty ${site.uncertainty.toFixed(2)}</span>
        <span>hidden-event probability ${site.hidden.toFixed(2)}</span>
        <span>cost ${site.cost.toFixed(2)}</span>
        <span>${this.revealed ? `true value ${site.truth.toFixed(2)}` : 'true value hidden'}</span>
      </div>
    `).join('') + `
      <div class="lab-regret-card">
        <strong>Outcome</strong>
        <span>chosen: ${chosen?.label ?? 'none'}</span>
        <span>collected belief value: ${chosen ? collected.toFixed(2) : 'N/A'}</span>
        <span>oracle best value: ${this.revealed ? oracleBest.toFixed(2) : 'hidden until reveal'}</span>
        <span>regret: ${regret === null ? 'N/A' : regret.toFixed(2)}</span>
      </div>
    `;
  }
}

class AcquisitionMapWidget {
  constructor(root) {
    this.root = root;
    this.weights = { value: 0.7, uncertainty: 0.5, suspicion: 0.45, cost: 0.35 };
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Acquisition map controls">
        <label>Value weight <input data-acq-weight="value" type="range" min="0" max="1.5" step="0.05" value="${this.weights.value}" /></label>
        <label>Uncertainty weight <input data-acq-weight="uncertainty" type="range" min="0" max="1.5" step="0.05" value="${this.weights.uncertainty}" /></label>
        <label>Hidden-event weight <input data-acq-weight="suspicion" type="range" min="0" max="1.5" step="0.05" value="${this.weights.suspicion}" /></label>
        <label>Cost weight <input data-acq-weight="cost" type="range" min="0" max="1.5" step="0.05" value="${this.weights.cost}" /></label>
        <button type="button" data-acq-suggest>Suggest next sample</button>
      </div>
      <canvas class="lab-widget-canvas" data-uncertainty-canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Acquisition map canvas"></canvas>
      <div class="ca-status" data-acq-status></div>
    `;
    this.canvas = this.root.querySelector('[data-uncertainty-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-acq-status]');
    this.suggested = null;
    this.root.querySelectorAll('[data-acq-weight]').forEach((input) => {
      input.addEventListener('input', (event) => {
        this.weights[event.target.dataset.acqWeight] = Number(event.target.value);
        this.draw();
      });
    });
    this.root.querySelector('[data-acq-suggest]').addEventListener('click', () => { this.suggested = bestAcquisitionPoint(this.weights); this.draw(); });
    this.draw();
  }

  draw() {
    clearCanvas(this.ctx);
    drawSingleField(this.ctx, (x, y) => acquisitionValue(x, y, this.weights));
    if (this.suggested) {
      this.ctx.fillStyle = '#eeb84b';
      this.ctx.beginPath();
      this.ctx.arc(this.suggested.x * CANVAS_WIDTH, this.suggested.y * CANVAS_HEIGHT, 8, 0, TAU);
      this.ctx.fill();
    }
    this.status.textContent = this.suggested
      ? `Suggested next sample near (${this.suggested.x.toFixed(2)}, ${this.suggested.y.toFixed(2)}) under current weights.`
      : 'Adjust weights, then suggest a next sample.';
  }
}

class DistributionRealizationWidget {
  constructor(root) {
    this.root = root;
    this.distribution = 'normal';
    this.seed = 0xD157;
    this.samples = [];
  }

  mount() {
    this.root.innerHTML = `
      <div class="lab-widget-controls" aria-label="Distribution realization controls">
        <label>Distribution
          <select data-dist-kind>
            <option value="bernoulli">Bernoulli</option>
            <option value="normal" selected>Normal / Gaussian</option>
            <option value="bimodal">Bimodal</option>
          </select>
        </label>
        <button type="button" data-dist-sample>Sample</button>
        <button type="button" data-dist-reset>Reset seed</button>
      </div>
      <canvas class="lab-widget-canvas" data-uncertainty-canvas width="${CANVAS_WIDTH}" height="180" aria-label="Distribution histogram canvas"></canvas>
      <div class="ca-status" data-dist-status></div>
    `;
    this.canvas = this.root.querySelector('[data-uncertainty-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.root.querySelector('[data-dist-status]');
    this.root.querySelector('[data-dist-kind]').addEventListener('change', (event) => { this.distribution = event.target.value; this.samples = []; this.draw(); });
    this.root.querySelector('[data-dist-sample]').addEventListener('click', () => { this.addSamples(12); this.draw(); });
    this.root.querySelector('[data-dist-reset]').addEventListener('click', () => { this.seed += 1237; this.samples = []; this.draw(); });
    this.addSamples(24);
    this.draw();
  }

  addSamples(count) {
    const rng = seededRng(this.seed + this.samples.length * 19);
    for (let i = 0; i < count; i += 1) this.samples.push(sampleDistribution(this.distribution, rng));
  }

  draw() {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, 180);
    this.ctx.fillStyle = '#07151d';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, 180);
    const bins = Array.from({ length: 16 }, () => 0);
    this.samples.forEach((sample) => {
      bins[Math.max(0, Math.min(15, Math.floor(sample * 16)))] += 1;
    });
    const max = Math.max(1, ...bins);
    bins.forEach((count, index) => {
      const h = (count / max) * 130;
      this.ctx.fillStyle = '#41d6b0';
      this.ctx.fillRect(20 + index * 30, 150 - h, 22, h);
    });
    const mean = this.samples.reduce((sum, value) => sum + value, 0) / Math.max(1, this.samples.length);
    const variance = this.samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, this.samples.length);
    this.status.textContent = `${this.distribution} | samples ${this.samples.length} | mean ${mean.toFixed(2)} | variance ${variance.toFixed(3)}`;
  }
}

function drawPanelGrid(ctx, panels) {
  const panelW = CANVAS_WIDTH / 2;
  const panelH = CANVAS_HEIGHT / 2;
  panels.forEach((panel, index) => {
    const ox = (index % 2) * panelW;
    const oy = Math.floor(index / 2) * panelH;
    drawFieldInRect(ctx, panel.sampler, ox, oy, panelW, panelH);
    ctx.fillStyle = 'rgba(7,21,29,0.82)';
    ctx.fillRect(ox, oy, panelW, 22);
    ctx.fillStyle = '#e8f4f7';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(panel.title, ox + 8, oy + 15);
  });
}

function drawFieldInRect(ctx, sampler, ox, oy, width, height) {
  const cellW = width / GRID_W;
  const cellH = height / GRID_H;
  for (let j = 0; j < GRID_H; j += 1) {
    for (let i = 0; i < GRID_W; i += 1) {
      const x = i / (GRID_W - 1);
      const y = j / (GRID_H - 1);
      ctx.fillStyle = heatColor(clamp01(sampler(x, y)));
      ctx.fillRect(ox + i * cellW, oy + j * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
}

function drawSingleField(ctx, sampler) {
  drawFieldInRect(ctx, sampler, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawObservations(ctx, observations) {
  observations.forEach((obs) => {
    const px = obs.x * CANVAS_WIDTH;
    const py = obs.y * CANVAS_HEIGHT;
    ctx.fillStyle = '#eeb84b';
    ctx.strokeStyle = '#071116';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  });
}

function truthValue(x, y, seed = 1) {
  const offset = ((seed % 997) / 997 - 0.5) * 0.12;
  return clamp01(0.85 * gaussian01(x, y, 0.35 + offset, 0.35, 0.18) + 0.65 * gaussian01(x, y, 0.68, 0.68 + offset, 0.24));
}

function forecastValue(x, y, seed, bias) {
  return clamp01(0.85 * gaussian01(x, y, 0.35 + bias, 0.35, 0.21) + 0.52 * gaussian01(x, y, 0.68, 0.68 - bias * 0.5, 0.27));
}

function posteriorValue(x, y, seed, bias, observations, noise) {
  const prior = forecastValue(x, y, seed, bias);
  if (!observations.length) return prior;
  const mean = kernelMean(x, y, observations, 0.22 + noise);
  const strength = clamp01(1 - kernelUncertainty(x, y, observations, 0.28, noise));
  return clamp01(prior * (1 - strength) + mean * strength);
}

function uncertaintyValue(x, y, observations, noise) {
  return kernelUncertainty(x, y, observations, 0.32, noise);
}

function kernelMean(x, y, observations, lengthScale) {
  if (!observations.length) return 0.5;
  let weighted = 0;
  let total = 0;
  observations.forEach((obs) => {
    const d2 = (x - obs.x) ** 2 + (y - obs.y) ** 2;
    const weight = Math.exp(-d2 / (2 * lengthScale * lengthScale));
    weighted += weight * obs.z;
    total += weight;
  });
  return clamp01(weighted / Math.max(total, 1e-6));
}

function kernelUncertainty(x, y, observations, lengthScale, noise) {
  if (!observations.length) return 0.95;
  const maxInfluence = observations.reduce((best, obs) => {
    const d2 = (x - obs.x) ** 2 + (y - obs.y) ** 2;
    return Math.max(best, Math.exp(-d2 / (2 * lengthScale * lengthScale)));
  }, 0);
  return clamp01(0.12 + noise + (1 - maxInfluence) * 0.82);
}

function scenarioSamplers(scenario) {
  if (scenario === 'hiddenAnomaly') {
    return {
      hiddenEvent: true,
      forecast: (x, y) => gaussian01(x, y, 0.32, 0.45, 0.22),
      truth: (x, y) => clamp01(gaussian01(x, y, 0.32, 0.45, 0.22) + 0.9 * gaussian01(x, y, 0.72, 0.35, 0.14))
    };
  }
  if (scenario === 'weakenedHotspot') {
    return {
      hiddenEvent: false,
      forecast: (x, y) => gaussian01(x, y, 0.45, 0.45, 0.22),
      truth: (x, y) => 0.45 * gaussian01(x, y, 0.45, 0.45, 0.22)
    };
  }
  if (scenario === 'noisyFalseAlarm') {
    return {
      hiddenEvent: false,
      forecast: (x, y) => gaussian01(x, y, 0.55, 0.5, 0.24),
      truth: (x, y) => gaussian01(x, y, 0.55, 0.5, 0.24)
    };
  }
  return {
    hiddenEvent: false,
    forecast: (x, y) => gaussian01(x, y, 0.6, 0.52, 0.16),
    truth: (x, y) => gaussian01(x, y, 0.36, 0.52, 0.16)
  };
}

function deterministicSamplePath(count) {
  return Array.from({ length: count }, (_, index) => ({
    x: 0.18 + (index % 4) * 0.2,
    y: 0.26 + Math.floor(index / 4) * 0.18
  }));
}

function bayesPosterior(prior, truePositive, falsePositive, observation) {
  const likelihoodEvent = observation === 'detected' ? truePositive : 1 - truePositive;
  const likelihoodNoEvent = observation === 'detected' ? falsePositive : 1 - falsePositive;
  const numerator = likelihoodEvent * prior;
  const denominator = numerator + likelihoodNoEvent * (1 - prior);
  return clamp01(numerator / Math.max(denominator, 1e-9));
}

function transitionMatrix(preset) {
  if (preset === 'recovery') return [[0.8, 0.05, 0.15], [0.1, 0.25, 0.65], [0.72, 0.04, 0.24]];
  if (preset === 'switching') return [[0.55, 0.28, 0.17], [0.25, 0.5, 0.25], [0.34, 0.2, 0.46]];
  if (preset === 'absorbing') return [[0.82, 0.16, 0.02], [0.02, 0.94, 0.04], [0.3, 0.58, 0.12]];
  return [[0.86, 0.08, 0.06], [0.08, 0.78, 0.14], [0.62, 0.08, 0.3]];
}

function applyTransition(distribution, matrix) {
  return matrix[0].map((_, nextIndex) => clamp01(distribution.reduce((sum, value, currentIndex) => sum + value * matrix[currentIndex][nextIndex], 0)));
}

function acquisitionValue(x, y, weights) {
  const mean = gaussian01(x, y, 0.35, 0.42, 0.22);
  const uncertainty = clamp01(0.25 + 0.75 * gaussian01(x, y, 0.72, 0.38, 0.25));
  const suspicion = gaussian01(x, y, 0.62, 0.72, 0.18);
  const cost = Math.hypot(x - 0.12, y - 0.84);
  return clamp01(weights.value * mean + weights.uncertainty * uncertainty + weights.suspicion * suspicion - weights.cost * cost);
}

function bestAcquisitionPoint(weights) {
  let best = { x: 0, y: 0, value: -Infinity };
  for (let j = 0; j < GRID_H; j += 1) {
    for (let i = 0; i < GRID_W; i += 1) {
      const x = i / (GRID_W - 1);
      const y = j / (GRID_H - 1);
      const value = acquisitionValue(x, y, weights);
      if (value > best.value) best = { x, y, value };
    }
  }
  return best;
}

function sampleDistribution(kind, rng) {
  if (kind === 'bernoulli') return rng() > 0.62 ? 1 : 0;
  if (kind === 'bimodal') return clamp01((rng() > 0.5 ? 0.28 : 0.74) + normalSample(rng) * 0.07);
  return clamp01(0.5 + normalSample(rng) * 0.16);
}

function normalSample(rng) {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
}

function gaussian01(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
}

function heatColor(value) {
  const v = clamp01(value);
  const r = Math.round(18 + v * 230);
  const g = Math.round(40 + v * 150);
  const b = Math.round(62 + (1 - v) * 50);
  return `rgb(${r},${g},${b})`;
}

function percent(value) {
  return `${Math.round(clamp01(value) * 100)}%`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function clearCanvas(ctx) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#07151d';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
