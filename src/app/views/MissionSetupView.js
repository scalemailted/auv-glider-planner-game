import { createAnchorViewContract, button, createDomElement, panel } from './AnchorViewContract.js';

export const MISSION_SETUP_VIEW_VERSION = 'mission-setup-view-mig-r2-2';

export function createMissionSetupView(context = {}) {
  return new MissionSetupView(context);
}

export class MissionSetupView {
  constructor({ lifecycleController, router, modeHint = 'challenge' } = {}) {
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.modeHint = modeHint;
    this.contract = createAnchorViewContract('missionSetup');
    this.element = null;
    this.controls = {};
  }

  mount({ documentRef, shell }) {
    shell.clearRouteRegions?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-mission-setup');
    root.dataset.testid = 'mission-setup-view';
    root.dataset.sectionId = 'missionSetupForm';
    const intro = panel(documentRef, 'Mission Setup', 'Choose mission mode, visibility, objective, fleet, timing, forecast, and seed before continuing to briefing.');
    intro.dataset.sectionId = 'missionConfiguration';

    const form = createDomElement(documentRef, 'div', 'anchor-dom-form');
    this.controls.missionMode = selectControl(documentRef, 'Mission Mode', 'mission-mode-select', [
      ['challenge', 'Challenge'],
      ['plannerBenchmark', 'Planner Benchmark'],
      ['adaptiveBenchmark', 'Adaptive Benchmark']
    ], this.modeHint);
    this.controls.visibilityMode = selectControl(documentRef, 'Visibility', 'visibility-mode-select', [
      ['public', 'Public / Solver Visible'],
      ['stochastic', 'Forecast + Uncertainty'],
      ['oracle', 'Oracle Debug']
    ], this.modeHint === 'adaptiveBenchmark' ? 'stochastic' : 'public');
    this.controls.seed = inputControl(documentRef, 'Seed', 'seed-input', this.modeHint === 'adaptiveBenchmark' ? '401' : this.modeHint === 'plannerBenchmark' ? '301' : '101');
    this.controls.objective = selectControl(documentRef, 'Mission Objective', 'mission-objective-select', [['scienceSampling', 'Science Sampling'], ['safeReturn', 'Safe Return'], ['benchmarkScore', 'Benchmark Score']], 'scienceSampling');
    this.controls.grid = selectControl(documentRef, 'Map / Grid', 'map-grid-select', [['tutorial', 'Tutorial Coastal Grid'], ['forecast', 'Forecast Grid']], this.modeHint === 'adaptiveBenchmark' ? 'forecast' : 'tutorial');
    this.controls.fleet = selectControl(documentRef, 'Fleet / Gliders', 'fleet-count-select', [['1', '1 Glider'], ['2', '2 Gliders'], ['3', '3 Gliders']], '1');
    this.controls.duration = inputControl(documentRef, 'Duration', 'duration-input', '60');
    this.controls.planningWindow = inputControl(documentRef, 'Planning Window', 'planning-window-input', '1');
    this.controls.forecast = selectControl(documentRef, 'Forecast Mode', 'forecast-mode-select', [['perfect', 'Perfect Knowledge'], ['forecast', 'Forecast'], ['ensemble', 'Ensemble']], this.modeHint === 'adaptiveBenchmark' ? 'ensemble' : 'perfect');
    this.controls.adaptive = selectControl(documentRef, 'Adaptive Manager', 'adaptive-manager-select', [['off', 'Off'], ['surfaceReview', 'Surfacing Review']], this.modeHint === 'adaptiveBenchmark' ? 'surfaceReview' : 'off');
    form.append(this.controls.missionMode.wrapper, this.controls.visibilityMode.wrapper, this.controls.seed.wrapper, this.controls.objective.wrapper, this.controls.grid.wrapper, this.controls.fleet.wrapper, this.controls.duration.wrapper, this.controls.planningWindow.wrapper, this.controls.forecast.wrapper, this.controls.adaptive.wrapper);

    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions');
    actions.append(
      buttonWithTestId(documentRef, 'Generate Mission', () => this.generateMission(), 'generate-mission', 'anchor-dom-button anchor-dom-button-primary'),
      buttonWithTestId(documentRef, 'Reset Setup', () => this.resetControls(), 'reset-setup', 'anchor-dom-button'),
      buttonWithTestId(documentRef, 'Continue to Briefing', () => this.generateMission(), 'continue-to-briefing', 'anchor-dom-button'),
      button(documentRef, 'Back to Menu', () => this.router?.navigate?.('mainMenu'), 'anchor-dom-button'),
      button(documentRef, 'Import JSON', () => this.router?.navigate?.('importExport'), 'anchor-dom-button')
    );
    intro.append(form, actions);
    root.appendChild(intro);
    this.element = root;
    shell.setConsole?.('<section class="anchor-dom-panel" data-section-id="setupGuidance"><h2>Mission Setup</h2><p>Configure the mission. Planning, simulation, and debrief controls are intentionally hidden until later phases.</p></section>');
    shell.setRightPanel?.('<section class="waypoint-shell"><div class="console-kicker">Mission Waypoints</div><h2>No mission generated</h2><p class="hud-muted">Waypoint plan appears after Planning begins.</p></section>');
    shell.setStatus?.('<section class="mission-status-strip" data-section-id="setupStatus">Mission Setup</section>');
    shell.setTimeline?.('');
    shell.setPerformance?.('');
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.missionSetupView = this.getDebugState();
    return root;
  }

  resetControls() {
    for (const control of Object.values(this.controls)) {
      if (control?.input?.tagName === 'SELECT' && control.input.children?.[0]) control.input.value = control.input.children[0].value;
    }
  }

  generateMission() {
    const missionMode = this.controls.missionMode?.input?.value ?? this.modeHint ?? 'challenge';
    const visibilityMode = this.controls.visibilityMode?.input?.value ?? 'public';
    const seed = this.controls.seed?.input?.value ?? '101';
    const stochastic = visibilityMode === 'stochastic' || missionMode === 'adaptiveBenchmark';
    return this.lifecycleController?.loadTutorialMission?.(stochastic ? 'tutorial_11_stochastic_forecast' : 'tutorial_01_first_deployment', {
      source: missionMode,
      missionMode,
      benchmarkMode: missionMode.includes('Benchmark') ? missionMode : null,
      experienceMode: missionMode.includes('Benchmark') ? 'benchmark' : 'challenge',
      challengeMode: stochastic ? 'forecastUncertainty' : 'perfectKnowledge',
      visibilityMode,
      seed
    });
  }

  getDebugState() {
    return {
      type: 'anchor.view.mission-setup.debug',
      version: MISSION_SETUP_VIEW_VERSION,
      modeHint: this.modeHint,
      usesPhaserScene: false
    };
  }

  unmount() {
    this.element?.remove?.();
    this.element = null;
  }
}

function selectControl(documentRef, label, testId, options, selected) {
  const wrapper = createDomElement(documentRef, 'label', 'anchor-dom-field');
  const text = createDomElement(documentRef, 'span', 'anchor-dom-label', label);
  const input = createDomElement(documentRef, 'select', 'anchor-dom-select');
  input.dataset.testid = testId;
  for (const [value, title] of options) {
    const option = createDomElement(documentRef, 'option', '', title);
    option.value = value;
    option.selected = value === selected;
    input.appendChild(option);
  }
  input.value = selected;
  wrapper.append(text, input);
  return { wrapper, input };
}

function inputControl(documentRef, label, testId, value) {
  const wrapper = createDomElement(documentRef, 'label', 'anchor-dom-field');
  const text = createDomElement(documentRef, 'span', 'anchor-dom-label', label);
  const input = createDomElement(documentRef, 'input', 'anchor-dom-input');
  input.dataset.testid = testId;
  input.value = value;
  input.inputMode = 'numeric';
  wrapper.append(text, input);
  return { wrapper, input };
}

function buttonWithTestId(documentRef, label, onClick, testId, className = 'anchor-dom-button') {
  const el = button(documentRef, label, onClick, className);
  el.dataset.testid = testId;
  return el;
}
