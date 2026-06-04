import { buildScenarioSummary } from '../../../core/scenario/ScenarioSummary.js';
import { beginScenario, markBriefingSeen } from '../../../core/scenario/ScenarioState.js';
import { resetPlanResultStore } from '../../../core/evaluation/PlanResultStore.js';
import {
  createDefaultScenarioConfig,
  describeScenarioComplexity,
  generateScenarioFromConfig,
  normalizeScenarioConfig,
  SCENARIO_SIZE_PRESETS
} from '../../../core/generation/ScenarioConfig.js';
import { CURRENT_PRESET_CHOICES, VECTOR_FIELD_PRESETS } from '../../../core/generation/VectorFieldPresets.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class MissionBriefingScene extends PhaserScene {
  constructor() {
    super('MissionBriefingScene');
    this.objects = [];
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'preview';
    this.app.clearPanels();
    this.app.setSceneLabel('Mission Briefing');
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.graphics = null;
    this.content = null;
    if (this.app.state.pendingScenarioSetup) {
      this.app.waypointPanel?.renderIdle?.();
      this.renderScenarioSetup();
      this.renderScenarioSetupConsole();
    } else {
      this.app.waypointPanel?.renderBriefingPlaceholder?.(this.app.state);
      this.renderBriefing();
      this.renderConsole();
    }
  }

  shutdown() {
    this.clearObjects();
    this.clearCenterOverlay();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    if (this.app?.state?.pendingScenarioSetup) {
      this.renderScenarioSetup();
    } else {
      this.renderBriefing();
    }
  }

  renderBriefing() {
    this.clearObjects();
    const state = this.app.state;
    const summary = buildScenarioSummary({
      level: state.level,
      mission: state.mission,
      challengeMode: state.challengeMode,
      source: state.currentScenario?.source
    });

    this.drawResponsiveBackground();
    this.renderBriefingCenterOverlay(summary, state);
  }

  renderScenarioSetup() {
    this.clearObjects();
    const config = normalizeScenarioConfig(this.app.state.pendingScenarioSetup);
    const complexity = describeScenarioComplexity(config);
    this.drawResponsiveBackground();
    this.renderScenarioSetupCenterOverlay(config, complexity);
  }

  drawResponsiveBackground() {
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x06111f, 0x09233a, 0x0a2d45, 0x06111f, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(1, 0x54c7ec, 0.08);
    for (let y = Math.max(70, height * 0.14); y < height; y += 52) {
      graphics.beginPath();
      graphics.moveTo(0, y);
      graphics.lineTo(width, y + Math.sin(y * 0.025) * 16);
      graphics.strokePath();
    }
    graphics.fillStyle(0x54c7ec, 0.08);
    graphics.fillCircle(width * 0.78, height * 0.22, Math.min(width, height) * 0.18);
    graphics.fillStyle(0x63e6be, 0.055);
    graphics.fillCircle(width * 0.68, height * 0.74, Math.min(width, height) * 0.28);
    this.objects.push(graphics);
  }

  renderScenarioSetupCenterOverlay(config, complexity) {
    const root = this.app.elements?.overlay?.modalRoot;
    if (!root) return;
    root.innerHTML = `
      <main class="center-screen-overlay setup-view" aria-label="Scenario setup summary">
        <section class="center-panel setup-panel">
          <header class="center-panel-header">
            <div>
              <p class="center-kicker">Scenario Setup</p>
              <h1>${escapeHtml(config.mode === 'forecast' ? 'Configure Stochastic Challenge' : 'Configure Deterministic Challenge')}</h1>
              <p>Choose mission scale, duration, surfacing cadence, glider count, fuel, and generation difficulty before the map is created.</p>
            </div>
            <span class="center-mode-pill">${escapeHtml(config.mode === 'forecast' ? 'Stochastic / Forecast' : 'Deterministic / Perfect Knowledge')}</span>
          </header>
          <section class="setup-metric-grid">
            ${setupMetricHtml('Agents', config.agentCount)}
            ${setupMetricHtml('Map Size', `${config.width} x ${config.height}`)}
            ${setupMetricHtml('Duration', `${config.duration} hr`)}
            ${setupMetricHtml('Surface Interval', `${config.surfaceInterval} hr`)}
            ${setupMetricHtml('Fuel / Glider', config.fuel)}
            ${setupMetricHtml('Speed', `${Number(config.gliderSpeed).toFixed(2)} cells/hr`)}
            ${setupMetricHtml('Difficulty', labelize(config.difficulty))}
            ${setupMetricHtml('Priority Stars', `${Math.round(config.priorityTargetFrequency * 100)}% window chance`)}
          </section>
          <section class="setup-section-grid">
            ${setupSectionHtml('Generated Mission Preview', `${complexity.cells} cells, about ${complexity.frames} temporal frames, vector stride ${complexity.vectorStride}.`)}
            ${setupSectionHtml('Performance Note', complexity.warning)}
            ${setupSectionHtml('Knowledge Mode', config.mode === 'forecast' ? 'Planning uses forecast and ensemble fields. Simulation resolves against hidden truth.' : 'Planning and simulation use the same perfect-knowledge truth fields.')}
            ${setupSectionHtml('Generation', 'Map, currents, ROI, hazards, drop zone, depth, and temporal Gold Star targets are generated after you click Generate Mission.')}
          </section>
          <footer class="center-panel-footer">
            <span><strong>Setup only:</strong> no tactical map details exist yet.</span>
            <div class="center-actions">
              <button class="center-button primary" data-action="generate">Generate Mission</button>
              <button class="center-button" data-action="reset">Reset Defaults</button>
              <button class="center-button secondary" data-action="back">Back</button>
            </div>
          </footer>
        </section>
      </main>
    `;
    root.querySelector('[data-action="generate"]')?.addEventListener('click', () => this.generateConfiguredScenario());
    root.querySelector('[data-action="reset"]')?.addEventListener('click', () => this.resetScenarioSetup());
    root.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.app.state.pendingScenarioSetup = null;
      this.scene.start('MainMenuScene');
    });
  }

  renderBriefingCenterOverlay(summary, state) {
    const root = this.app.elements?.overlay?.modalRoot;
    if (!root) return;
    const metrics = buildMetricCards(summary, state);
    const sections = buildDossierSections(summary, state);
    root.innerHTML = `
      <main class="center-screen-overlay briefing-view" aria-label="Mission briefing dossier">
        <section class="center-panel briefing-panel">
          <header class="center-panel-header">
            <div>
              <p class="center-kicker">Mission Briefing</p>
              <h1>${escapeHtml(buildBriefingTitle(summary))}</h1>
              <p>${escapeHtml(buildBriefingSubtitle(summary))}</p>
            </div>
            <div class="center-pill-row">
              <span class="center-mode-pill">${escapeHtml(labelize(summary.challengeMode))}</span>
              <span class="center-mode-pill">${escapeHtml(labelize(summary.source))}</span>
            </div>
          </header>
          <p class="center-callout">Tactical map details unlock only after Planning begins.</p>
          <section class="setup-metric-grid">
            ${metrics.map((metric) => setupMetricHtml(metric.label, metric.value)).join('')}
          </section>
          <section class="setup-section-grid">
            ${sections.map((section) => setupSectionHtml(section.title, section.body)).join('')}
          </section>
          <footer class="center-panel-footer">
            <span><strong>Tactical domain hidden:</strong> no ROI hotspots, current vectors, hazard positions, drop-zone geometry, or mission grid are shown in briefing.</span>
            <div class="center-actions">
              <button class="center-button primary" data-action="start">Start Planning</button>
              <button class="center-button" data-action="details">More Details</button>
              <button class="center-button secondary" data-action="back">Back</button>
            </div>
          </footer>
        </section>
      </main>
    `;
    root.querySelector('[data-action="start"]')?.addEventListener('click', () => this.startPlanning());
    root.querySelector('[data-action="details"]')?.addEventListener('click', () => this.toggleDetails());
    root.querySelector('[data-action="back"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
  }

  clearCenterOverlay() {
    const root = this.app?.elements?.overlay?.modalRoot;
    if (root) root.innerHTML = '';
  }

  renderScenarioSetupConsole() {
    const root = this.app.elements.consoleRoot;
    if (!root) return;
    const config = normalizeScenarioConfig(this.app.state.pendingScenarioSetup);
    const complexity = describeScenarioComplexity(config);
    root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Scenario Setup</div>
        <h1>${config.mode === 'forecast' ? 'Stochastic Challenge' : 'Deterministic Challenge'}</h1>
        <p>Configure the generated mission before the map is created.</p>
      </section>
      <section class="console-section">
        <h2>Core Settings</h2>
        ${selectField('preset', 'Map Size', Object.entries(SCENARIO_SIZE_PRESETS).map(([value, preset]) => [value, preset.label]), config.preset)}
        ${selectField('agentCount', 'Agents', range(1, 8), String(config.agentCount))}
        ${selectField('duration', 'Duration', ['12', '24', '48', '72'].map((value) => [value, `${value} hr`]), String(config.duration))}
        ${selectField('surfaceInterval', 'Surfacing', ['3', '6', '12'].map((value) => [value, `${value} hr`]), String(config.surfaceInterval))}
        ${selectField('fuel', 'Fuel', ['50', '100', '120', '150', '200'].map((value) => [value, value]), String(config.fuel))}
        ${selectField('gliderSpeed', 'Speed', [['0.9', 'Slow'], ['1.25', 'Normal'], ['1.6', 'Fast']], String(config.gliderSpeed))}
        ${selectField('agentSpecMode', 'Agent Specs', [['uniform', 'Uniform'], ['varied', 'Varied Fleet']], config.agentSpecMode)}
        ${selectField('multipleDropZones', 'Drop Zones', [['false', 'Single'], ['true', 'Multiple']], String(config.multipleDropZones))}
      </section>
      <section class="console-section">
        <h2>Generation</h2>
        ${selectField('difficulty', 'Difficulty', ['easy', 'medium', 'hard', 'chaotic'].map((value) => [value, labelize(value)]), config.difficulty)}
        ${selectField('currentPreset', 'Current Field', CURRENT_PRESET_CHOICES.map((key) => [key, VECTOR_FIELD_PRESETS[key]?.label ?? labelize(key)]), config.currentPreset)}
        ${selectField('currentStrength', 'Current Strength', [['0.45', 'Low'], ['0.85', 'Medium'], ['1.25', 'High']], String(config.currentStrength))}
        ${selectField('currentVariability', 'Temporal Variability', [['0.2', 'Low'], ['0.55', 'Medium'], ['0.9', 'High']], String(config.currentVariability))}
        ${selectField('hazardDensity', 'Hazards', [['0.03', 'Low'], ['0.06', 'Medium'], ['0.1', 'High'], ['0.14', 'Extreme']], String(config.hazardDensity))}
        ${selectField('terrainDensity', 'Terrain', [['0.04', 'Sparse'], ['0.08', 'Medium'], ['0.14', 'Dense'], ['0.2', 'Maze-like']], String(config.terrainDensity))}
        ${selectField('roiHotspots', 'ROI Hotspots', range(2, 8), String(config.roiHotspots))}
        ${selectField('priorityTargetFrequency', 'Gold Stars', [['0.15', 'Rare'], ['0.35', 'Normal'], ['0.55', 'Frequent']], String(config.priorityTargetFrequency))}
        ${config.mode === 'forecast' ? selectField('ensembleCount', 'Ensemble', range(1, 6), String(config.ensembleCount)) : ''}
        ${config.mode === 'forecast' ? selectField('forecastDecay', 'Forecast Decay', [['true', 'On'], ['false', 'Off']], String(config.forecastDecay)) : ''}
        ${config.mode === 'forecast' ? selectField('forecastDecayModel', 'Decay Model', [['exponential', 'Exponential'], ['linear', 'Linear']], config.forecastDecayModel) : ''}
      </section>
      <section class="console-status">
        <span>Preview</span>
        <strong>${complexity.cells} cells | ${complexity.frames} frames</strong>
        <small>${escapeHtml(complexity.warning)}</small>
      </section>
      <section class="console-footer">
        <button class="console-button primary" data-action="generate">Generate Mission</button>
        <button class="console-button" data-action="reset">Reset Defaults</button>
        <button class="console-button secondary" data-action="back">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('scenarioSetup');
    root.querySelectorAll('[data-field]').forEach((field) => {
      field.addEventListener('change', () => this.updateScenarioSetupFromForm());
    });
    root.querySelector('[data-action="generate"]')?.addEventListener('click', () => this.generateConfiguredScenario());
    root.querySelector('[data-action="reset"]')?.addEventListener('click', () => this.resetScenarioSetup());
    root.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.app.state.pendingScenarioSetup = null;
      this.scene.start('MainMenuScene');
    });
  }

  renderConsole(detailsOpen = false) {
    const root = this.app.elements.consoleRoot;
    if (!root) return;
    const state = this.app.state;
    const summary = buildScenarioSummary({
      level: state.level,
      mission: state.mission,
      challengeMode: state.challengeMode,
      source: state.currentScenario?.source
    });
    root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Scenario Start</div>
        <h1>${escapeHtml(summary.title)}</h1>
        <p>${escapeHtml(summary.objective)}</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(labelize(summary.challengeMode))}</span>
        <strong>${escapeHtml(summary.deployment)}</strong>
        <small>Level ${escapeHtml(summary.levelId)} | Mission ${escapeHtml(summary.missionId)}</small>
      </section>
      <section class="console-section">
        <h2>Start</h2>
        <button class="console-button primary" data-action="start">Start Planning</button>
        <button class="console-button" data-action="details">${detailsOpen ? 'Hide Details' : 'More Details'}</button>
        <button class="console-button" data-action="back">Back</button>
      </section>
      <section class="console-section">
        <h2>Mission Conditions</h2>
        <div class="hud-muted">Sampling: ${escapeHtml(summary.sampling)}</div>
        <div class="hud-muted">End condition: ${escapeHtml(summary.endCondition)}</div>
        <div class="hud-muted">Forecast: ${escapeHtml(summary.stochastic)}</div>
        <div class="hud-muted">Spatial domain remains hidden until Planning.</div>
      </section>
      ${detailsOpen ? `
      <section class="console-section">
        <h2>Scoring</h2>
        ${summary.scoring.map((item) => `<div class="hud-muted">${escapeHtml(item)}</div>`).join('')}
      </section>
      ${summary.tutorialPrompts.length ? `
      <section class="console-section">
        <h2>Tutorial Guidance</h2>
        ${summary.tutorialPrompts.slice(0, 3).map((prompt) => `<div class="hud-muted"><strong>${escapeHtml(prompt.title)}</strong>: ${escapeHtml(prompt.body)}</div>`).join('')}
      </section>` : ''}` : ''}
      <section class="console-footer">
        <button class="console-button secondary" data-action="menu">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('briefing');
    root.querySelector('[data-action="start"]')?.addEventListener('click', () => this.startPlanning());
    root.querySelector('[data-action="details"]')?.addEventListener('click', () => this.toggleDetails());
    root.querySelector('[data-action="back"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
    root.querySelector('[data-action="menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
  }

  updateScenarioSetupFromForm() {
    const root = this.app.elements.consoleRoot;
    const current = normalizeScenarioConfig(this.app.state.pendingScenarioSetup);
    const values = { ...current };
    root?.querySelectorAll('[data-field]')?.forEach((field) => {
      values[field.dataset.field] = field.value;
    });
    values.multipleDropZones = values.multipleDropZones === 'true';
    values.forecastDecay = values.forecastDecay === 'true';
    const preset = SCENARIO_SIZE_PRESETS[values.preset];
    if (preset && values.preset !== current.preset) {
      values.width = preset.width;
      values.height = preset.height;
      values.duration = preset.duration;
      values.surfaceInterval = preset.surfaceInterval;
      values.agentCount = preset.agentCount;
      values.fuel = preset.fuel;
    }
    this.app.state.pendingScenarioSetup = normalizeScenarioConfig(values);
    this.renderScenarioSetup();
    this.renderScenarioSetupConsole();
  }

  resetScenarioSetup() {
    const mode = this.app.state.pendingScenarioSetup?.mode ?? this.app.state.challengeMode ?? 'perfectKnowledge';
    this.app.state.pendingScenarioSetup = createDefaultScenarioConfig(mode);
    this.renderScenarioSetup();
    this.renderScenarioSetupConsole();
  }

  generateConfiguredScenario() {
    const { level, mission, config } = generateScenarioFromConfig(this.app.state.pendingScenarioSetup);
    this.app.state.pendingScenarioSetup = null;
    this.app.state.ui.mapCamera = { zoom: 1, panX: 0, panY: 0 };
    this.app.state.ui.revealTruth = false;
    this.app.state.ui.forecastMemberId = config.mode === 'forecast' ? 'ensemble_mean' : null;
    this.app.state.ui.roiViewMode = 'expectedValue';
    beginScenario(this.app.state, {
      level,
      mission,
      challengeMode: config.mode,
      source: config.mode === 'forecast' ? 'stochasticChallenge' : 'deterministicChallenge'
    });
    resetPlanResultStore(this.app.state);
    markBriefingSeen(this.app.state);
    this.scene.start('MissionWorkspaceScene');
  }

  startPlanning() {
    this.clearCenterOverlay();
    markBriefingSeen(this.app.state);
    this.scene.start('MissionWorkspaceScene');
  }

  toggleDetails() {
    this.detailsOpen = !this.detailsOpen;
    this.renderConsole(this.detailsOpen);
  }

  clearObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
    this.graphics = null;
    this.content = null;
  }
}

function buildDossierSections(summary, state) {
  const successCriteria = state.level?.campaign?.successCriteria ?? {};
  const success = Object.keys(successCriteria).length
    ? Object.entries(successCriteria).map(([key, value]) => `${labelize(key)} ${value}`).join('; ')
    : 'Score well by collecting valuable samples, conserving energy, and avoiding mission penalties.';
  const tutorial = state.level?.tutorial ?? {};
  const sections = [
    ...(tutorial.definitionId ? [{
      title: 'Tutorial Focus',
      body: `${(tutorial.focus ?? state.level?.campaign?.focus ?? []).join(', ') || summary.concept}. Difficulty: ${tutorial.difficulty ?? state.level?.campaign?.difficulty ?? 'Tutorial'}.`
    }] : []),
    {
      title: 'Objective',
      body: summary.objective
    },
    {
      title: 'Success Criteria',
      body: success
    },
    {
      title: 'Mission Constraints',
      body: `${summary.duration}; planning updates every ${summary.planningWindow}; ${summary.agents.length} glider${summary.agents.length === 1 ? '' : 's'}; fuel ${summary.agents.map((agent) => agent.fuel).join(', ') || 'N/A'}.`
    },
    {
      title: 'Deployment',
      body: summary.deployment
    },
    {
      title: 'Sampling',
      body: summary.sampling
    },
    {
      title: 'Knowledge Mode',
      body: summary.stochastic
    },
    {
      title: 'End Condition',
      body: summary.endCondition
    },
    {
      title: 'Operational Notes',
      body: `${summary.hazards}; ${summary.currents}. Exact tactical positions are withheld until Planning.`
    }
  ];
  if (tutorial.definitionId) {
    sections.push({
      title: 'Available Controls',
      body: tutorialControlsSummary(tutorial.enabledFeatures)
    });
  }
  return sections.slice(0, 8);
}

function tutorialControlsSummary(features = {}) {
  const controls = ['waypoint placement', 'Execute'];
  if (features.deploymentZones) controls.unshift('deployment selection');
  if (features.travelCost) controls.push('Travel Cost mode');
  if (features.remainingMode) controls.push('Remaining mode');
  if (features.markers) controls.push('Marker Mode');
  if (features.priorityTargets) controls.push('Gold Stars');
  if (features.stochastic) controls.push('Probability/Expected forecast views');
  if (features.multiAgent) controls.push('agent tabs');
  if (features.surfacing) controls.push('surfacing/replanning');
  return controls.join(', ');
}

function recommendedHint(summary) {
  if (summary.challengeMode === 'forecast') {
    return 'Build a robust plan; visible forecasts may differ from hidden truth during execution.';
  }
  if (/drop-zone/i.test(summary.deployment)) {
    return 'Choose a deployment start first, then plan waypoints from the revealed tactical map.';
  }
  return 'Use the planning scene to compare currents, ROI value, hazards, and energy tradeoffs.';
}

function buildMetricCards(summary, state) {
  return [
    {
      label: 'Duration',
      value: summary.duration
    },
    {
      label: 'Planning Window',
      value: summary.planningWindow
    },
    {
      label: 'Gliders',
      value: `${summary.agents.length} total`
    },
    {
      label: 'Fuel / Energy',
      value: shorten(summary.agents.map((agent) => agent.fuel).join(', ') || 'N/A', 22)
    },
    {
      label: 'Deployment',
      value: shorten(summary.deployment, 42)
    },
    {
      label: 'Sampling',
      value: summarizeMode(summary.sampling, 44)
    },
    {
      label: 'End Condition',
      value: summarizeMode(summary.endCondition, 44)
    },
    {
      label: 'Seed',
      value: String(state.level?.meta?.seed ?? state.level?.meta?.generationConfig?.seed ?? 'N/A')
    }
  ];
}

function buildBriefingTitle(summary) {
  const title = String(summary.title ?? 'Mission');
  const challengeTitle = title.match(/^(Deterministic Challenge|Stochastic Challenge)/i);
  if (challengeTitle) return challengeTitle[1];
  return shorten(title, 54);
}

function buildBriefingSubtitle(summary) {
  const parts = [
    summary.levelId,
    `Instance ${shorten(summary.instanceId, 18)}`,
    `Mission ${summary.missionId}`
  ].filter(Boolean);
  return parts.join(' | ');
}

function summarizeMode(value, maxLength = 34) {
  const [firstClause] = String(value ?? 'N/A').split(/[.;]/);
  return shorten(firstClause || value, maxLength);
}

function setupMetricHtml(label, value) {
  return `
    <article class="setup-metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function setupSectionHtml(title, body) {
  return `
    <article class="setup-detail-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function shorten(value, maxLength = 34) {
  const text = String(value ?? 'N/A');
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3))}...` : text;
}

function labelize(value) {
  return String(value ?? '').replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function selectField(name, label, options, selected) {
  return `
    <label class="scenario-field">
      <span>${escapeHtml(label)}</span>
      <select data-field="${escapeHtml(name)}">
        ${options.map(([value, optionLabel]) => `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${escapeHtml(optionLabel)}</option>`).join('')}
      </select>
    </label>
  `;
}

function range(min, max) {
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const value = String(min + index);
    return [value, value];
  });
}
