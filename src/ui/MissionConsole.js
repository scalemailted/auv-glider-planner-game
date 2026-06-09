import { CAMPAIGN_LEVELS } from '../core/campaign/CampaignLevels.js';
import { shortInstanceId } from '../core/identity/GameInstanceId.js';
import { formatMetric } from '../core/evaluation/PlanComparison.js';
import { FLOW_DEMO_BOUNDARY_MODES, FLOW_DEMO_CYCLE_DURATIONS, FLOW_DEMO_DYNAMIC_COMPLEXITY_LEVELS, FLOW_DEMO_EVOLUTION_BEHAVIORS, FLOW_DEMO_EVOLUTION_PATTERNS, FLOW_DEMO_EVOLUTION_SPEEDS, FLOW_DEMO_FIELD_MODES, FLOW_DEMO_LAYER_INFLUENCES, FLOW_DEMO_MAGNITUDE_SCALES, FLOW_DEMO_PARTICLE_SPEEDS, FLOW_DEMO_PRESET_CHOICES, FLOW_DEMO_SPATIAL_MOTIONS, FLOW_DEMO_SPATIAL_MOTION_SPEEDS, FLOW_DEMO_TERRAIN_MODES, FLOW_DEMO_VARIATION_LEVELS, normalizeAdditiveLayers } from '../core/demo/FlowFieldDemo.js';
import { ROI_DEMO_DISTRIBUTIONS, ROI_DEMO_SPATIAL_PATTERNS, ROI_DEMO_TEMPORAL_BEHAVIORS, ROI_DEMO_TIME_MODES, ROI_DEMO_TEMPORAL_PATTERNS, ROI_DEMO_SPATIAL_EVOLUTIONS, ROI_DEMO_LIKELIHOOD_DYNAMICS, ROI_DEMO_MOTION_SCOPES, ROI_DEMO_STATE_MODELS, ROI_DEMO_DEPLETION_MODES, ROI_DEMO_DISPLAY_MODES, ROI_DEMO_DYNAMIC_COMPLEXITY, ROI_DEMO_PURE_SPATIAL_PATTERNS, ROI_DEMO_EVENT_LIKELIHOODS, ROI_DEMO_VALUE_DISTRIBUTIONS, ROI_DEMO_CLUSTER_SIZES, roiDistributionLabel, roiTemporalPatternLabel, roiStateModelDescription, roiStateModelForEvolutionModel, roiStateModelLabel, roiPureSpatialPatternLabel, roiEventLikelihoodLabel, roiLikelihoodDynamicsLabel, roiLikelihoodSpatialEvolutionLabel, roiValueDistributionLabel, roiSpatialEvolutionLabel, roiMotionScopeLabel, roiDepletionModeLabel, roiDisplayModeLabel, roiClusterSizeLabel, sampleSpatialPatternLabel, sampleTemporalBehaviorLabel } from '../core/demo/DemoRoiFields.js';
import { sampleFieldBehaviorExplainer } from '../core/demo/SampleFieldBehaviorExplainers.js';
import { SAMPLE_FIELD_BEHAVIOR_PRESET_OPTIONS, CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID, sampleFieldBehaviorPresetById, sampleFieldBehaviorPresetSummary } from '../core/demo/SampleFieldBehaviorPresets.js';
import { EXPERIENCE_MODES, getExperienceModeDefaults } from '../core/experience/ExperienceMode.js';
import { getVectorPresetConfig } from '../core/generation/VectorFieldPresets.js';
import { UNCERTAINTY_DEMO_BEHAVIORS, UNCERTAINTY_DEMO_FORECAST_MODELS, UNCERTAINTY_DEMO_PATTERNS, UNCERTAINTY_DEMO_UPDATE_MODELS, UNCERTAINTY_DEMO_VIEW_MODES, forecastModelLabel, uncertaintyBehaviorLabel, uncertaintyPatternLabel, uncertaintyViewLabel, updateModelLabel } from '../core/demo/UncertaintyForecastDemo.js';

export class MissionConsole {
  constructor(app, root) {
    this.app = app;
    this.root = root;
  }

  renderIdle({ status = 'No mission loaded', mode = 'Idle' } = {}) {
    if (!this.root) return;
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Mission Console</div>
        <h1>ANCHOR: Glider Command</h1>
        <p>AUV Glider Planner Game</p>
      </section>
      <section class="console-section" data-accordion-key="challenge-mode">
        <h2>Challenge Mode</h2>
        <div class="hud-muted">Play mission objectives, learn strategies, compare routes, and chase high scores.</div>
        ${menuGroupHtml('Play', [
          menuActionHtml('play-challenge', 'Mission Modes', 'Pick a tactical objective and generate a playable challenge.', 'primary'),
          menuActionHtml('play-custom-challenge', 'Play Custom Challenge', 'Import a shared or editor-authored challenge package.'),
          menuActionHtml('random-challenge', 'Quick Random Challenge', 'Generate a fresh perfect-knowledge challenge immediately.')
        ])}
        ${menuGroupHtml('Learn', [
          menuActionHtml('tutorial', 'Tutorials', 'Learn deployment, currents, planning, stochastic forecasts, and import/export.')
        ])}
        ${menuGroupHtml('Compete', [
          menuActionHtml('greedy-race', 'Greedy Planner Race', 'Race a generated forecast challenge against the baseline planner.'),
          menuActionHtml('leaderboard', 'Challenge Leaderboard', 'Review local high-score attempts and saved best paths.')
        ])}
      </section>
      <section class="console-section" data-accordion-key="simulation-lab">
        <h2>Simulation Lab</h2>
        <div class="hud-muted">Build, inspect, import, export, and benchmark reproducible glider-planning scenarios.</div>
        ${menuGroupHtml('Experiments', [
          menuActionHtml('deterministic', 'Deterministic Experiment', 'Configure a perfect-knowledge reproducible scenario.'),
          menuActionHtml('stochastic', 'Stochastic Experiment', 'Configure forecast, ensemble, hidden-truth, and uncertainty settings.')
        ])}
        ${menuGroupHtml('Demos', [
          menuActionHtml('flow-fields', 'Flow Fields Demo', 'Explore current vectors F(x,y,t).'),
          menuActionHtml('roi-demo', 'Sample / ROI Field Demo', 'Explore sampling value S(x,y,t).'),
          menuActionHtml('coupled-fields', 'Coupled Fields Demo', 'Explore how currents move, shape, or complicate sample value.'),
          menuActionHtml('uncertainty-forecast-demo', 'Uncertainty / Forecast Demo', 'Explore forecast, truth, uncertainty, information gain, and sampling updates.')
        ])}
        ${menuGroupHtml('Editor & Import Tools', [
          menuActionHtml('editor', 'Mission Editor', 'Build and export custom scenario/challenge packages.'),
          menuActionHtml('load-json', 'Import / Export Tools', 'Load challenge, level, result, oracle, and custom JSON packages.')
        ])}
        ${menuGroupHtml('Benchmarks', [
          menuActionHtml('dataset', 'External Solver Evaluation', 'Export datasets and packets for solver or ML workflows.', 'secondary'),
          menuActionHtml('leaderboard', 'Benchmark Leaderboard', 'Compare Simulation Lab benchmark attempts and solver runs.', 'secondary')
        ])}
      </section>
      <section class="console-status">
        <span>${escapeHtml(mode)}</span>
        <strong>${escapeHtml(status)}</strong>
        <small>Choose a mode to load the simulator viewport.</small>
      </section>
    `;
    this.app.applyConsoleAccordions?.('idle');
    this.bind({
      'flow-fields': () => this.app.phaser.scene.start('FlowFieldDemoScene'),
      'roi-demo': () => this.app.phaser.scene.start('RoiGeneratorDemoScene'),
      'coupled-fields': () => this.app.phaser.scene.start('CoupledFieldsDemoScene'),
      'uncertainty-forecast-demo': () => this.app.phaser.scene.start('UncertaintyForecastDemoScene'),
      tutorial: () => this.mainMenuScene()?.openTutorialBrowser?.(),
      'play-challenge': () => this.mainMenuScene()?.openChallengeSetup?.('perfectKnowledge', EXPERIENCE_MODES.challenge),
      'play-custom-challenge': () => this.app.phaser.scene.start('LoadLevelJsonScene', { preferredExperienceMode: EXPERIENCE_MODES.challenge }),
      'random-challenge': () => this.mainMenuScene()?.startRandomChallenge?.('perfectKnowledge', EXPERIENCE_MODES.challenge),
      'greedy-race': () => this.mainMenuScene()?.startRandomChallenge?.('forecast', EXPERIENCE_MODES.challenge, { greedyRace: true }),
      deterministic: () => this.mainMenuScene()?.openChallengeSetup?.('perfectKnowledge', EXPERIENCE_MODES.simulationLab),
      stochastic: () => this.mainMenuScene()?.openChallengeSetup?.('forecast', EXPERIENCE_MODES.simulationLab),
      editor: () => this.app.phaser.scene.start('EnvironmentEditorScene'),
      'load-json': () => this.app.phaser.scene.start('LoadLevelJsonScene'),
      dataset: () => this.app.phaser.scene.start('DatasetExportScene'),
      leaderboard: () => this.mainMenuScene()?.openLeaderboard?.()
    });
  }

  renderFlowDemoControls(state = {}, handlers = {}) {
    if (!this.root) return;
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Flow Fields Demo</div>
        <h1>${escapeHtml(state.title ?? 'Flow Fields Demo')}</h1>
        <p>Isolated current-field visualization.</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(state.status ?? 'Demo running')}</span>
        <strong>${escapeHtml(state.paused ? 'Paused' : 'Animating')}</strong>
        <small>${escapeHtml(state.fieldMode === 'dynamic'
          ? `${evolutionBehaviorLabel(state.evolutionBehavior)} evolution. Spatial ${spatialMotionLabel(state.spatialMotion)} | Playback Speed ${state.playbackSpeedScale ?? state.evolutionSpeedScale ?? 1}x | Flow Evolution ${state.flowEvolutionSpeedScale ?? 1}x | Particle Speed ${state.particleSpeedScale ?? 1}x | Magnitude Scale ${state.magnitudeScale ?? 1.5}x.`
          : 'Particles move through a non-evolving vector field.')}</small>
      </section>
      <section class="console-section">
        <h2>What This Shows</h2>
        <div class="hud-muted">A current field maps position and time to F(x, y, t) = &lt;u, v&gt;. Direction shows where water pushes; magnitude shows how strongly it pushes.</div>
        <div class="hud-muted">Topology-aware fields react to shoreline, islands, channels, bays, and open water using the same shared current sampler used by missions.</div>
      </section>
      <section class="console-section">
        <h2>Field Mode</h2>
        <label class="compact-field">
          Mode
          <select id="flow-demo-mode">
            ${FLOW_DEMO_FIELD_MODES.map((mode) => `<option value="${escapeAttr(mode)}" ${state.fieldMode === mode ? 'selected' : ''}>${escapeHtml(flowModeLabel(mode))}</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-section">
        <h2>Fields</h2>
        ${flowHelpButtonHtml('basePreset', 'Explain Flow Field')}
        <label class="compact-field">
          Base Flow Field
          <select id="flow-demo-preset">
            ${FLOW_DEMO_PRESET_CHOICES.map((preset) => {
              const config = getVectorPresetConfig(preset);
              return `<option value="${escapeAttr(preset)}" ${state.preset === preset ? 'selected' : ''}>${escapeHtml(config.label)}</option>`;
            }).join('')}
          </select>
        </label>
        <div class="hud-muted">${escapeHtml(state.presetConfig?.warning ?? 'Synthetic ocean-inspired current field; not validated HYCOM forecast data.')}</div>
      </section>
      <section class="console-section">
        <h2>Additive Flow Layers</h2>
        ${flowHelpButtonHtml('displayLayer', 'Explain Layers')}
        ${flowLayerStackHtml(state.additiveLayers)}
        <button data-action="add-flow-layer" class="console-button">+ Add Flow Layer</button>
      </section>
      <section class="console-section">
        <h2>Terrain</h2>
        ${flowHelpButtonHtml('topologyMode', 'Explain Topology')}
        <label class="compact-field">
          Land Mode
          <select id="flow-demo-terrain">
            ${FLOW_DEMO_TERRAIN_MODES.map((mode) => `<option value="${escapeAttr(mode)}" ${state.terrainMode === mode ? 'selected' : ''}>${escapeHtml(terrainModeLabel(mode))}</option>`).join('')}
          </select>
        </label>
        <div class="hud-muted">Seed: ${escapeHtml(state.terrainSeed ?? 'anchor-demo-1')}</div>
        <button data-action="reset-terrain" class="console-button">Reset Terrain</button>
      </section>
      <section class="console-section">
        <h2>Flow Evolution</h2>
        <div class="console-button-row">
          ${flowHelpButtonHtml('evolutionBehavior', 'Explain Evolution')}
          ${flowHelpButtonHtml('dynamicComplexity', 'Explain Complexity')}
          ${flowHelpButtonHtml('directionVariation', 'Explain Direction')}
          ${flowHelpButtonHtml('magnitudeVariation', 'Explain Magnitude')}
          ${flowHelpButtonHtml('spatialMotion', 'Explain Motion')}
          ${flowHelpButtonHtml('boundaryMode', 'Explain Boundary')}
          ${flowHelpButtonHtml('speedModel', 'Explain Speeds')}
        </div>
        <label class="compact-field">
          Evolution Behavior
          <select id="flow-demo-evolution-behavior">
            ${FLOW_DEMO_EVOLUTION_BEHAVIORS.map((behavior) => `<option value="${escapeAttr(behavior)}" ${state.evolutionBehavior === behavior ? 'selected' : ''}>${escapeHtml(evolutionBehaviorLabel(behavior))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Direction Variation
          <select id="flow-demo-direction-variation">
            ${FLOW_DEMO_VARIATION_LEVELS.map((level) => `<option value="${escapeAttr(level)}" ${state.directionVariation === level ? 'selected' : ''}>${escapeHtml(variationLabel(level))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Magnitude Variation
          <select id="flow-demo-magnitude-variation">
            ${FLOW_DEMO_VARIATION_LEVELS.map((level) => `<option value="${escapeAttr(level)}" ${state.magnitudeVariation === level ? 'selected' : ''}>${escapeHtml(variationLabel(level))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Dynamic Complexity
          <select id="flow-demo-dynamic-complexity">
            ${FLOW_DEMO_DYNAMIC_COMPLEXITY_LEVELS.map((level) => `<option value="${escapeAttr(level)}" ${state.dynamicComplexity === level ? 'selected' : ''}>${escapeHtml(dynamicComplexityLabel(level))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Evolution Pattern
          <select id="flow-demo-evolution-pattern">
            ${FLOW_DEMO_EVOLUTION_PATTERNS.map((pattern) => `<option value="${escapeAttr(pattern)}" ${state.evolutionPattern === pattern ? 'selected' : ''}>${escapeHtml(evolutionPatternLabel(pattern))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Cycle Duration
          <select id="flow-demo-cycle-duration">
            ${FLOW_DEMO_CYCLE_DURATIONS.map((duration) => `<option value="${escapeAttr(duration)}" ${Number(state.cycleDuration ?? 60) === duration ? 'selected' : ''}>${escapeHtml(duration)}s</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Spatial Motion
          <select id="flow-demo-spatial-motion">
            ${FLOW_DEMO_SPATIAL_MOTIONS.map((motion) => `<option value="${escapeAttr(motion)}" ${state.spatialMotion === motion ? 'selected' : ''}>${escapeHtml(spatialMotionLabel(motion))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Spatial Motion Speed
          <select id="flow-demo-spatial-motion-speed">
            ${FLOW_DEMO_SPATIAL_MOTION_SPEEDS.map((speed) => `<option value="${escapeAttr(speed)}" ${Number(state.spatialMotionSpeed ?? 1) === speed ? 'selected' : ''}>${escapeHtml(speed)}x</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Playback Speed
          <select id="flow-demo-playback-speed">
            ${FLOW_DEMO_EVOLUTION_SPEEDS.map((speed) => `<option value="${escapeAttr(speed)}" ${Number(state.playbackSpeedScale ?? state.evolutionSpeedScale ?? 1) === speed ? 'selected' : ''}>${escapeHtml(speed)}x</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Flow Evolution Speed
          <select id="flow-demo-flow-evolution-speed">
            ${FLOW_DEMO_EVOLUTION_SPEEDS.map((speed) => `<option value="${escapeAttr(speed)}" ${Number(state.flowEvolutionSpeedScale ?? 1) === speed ? 'selected' : ''}>${escapeHtml(speed)}x</option>`).join('')}
          </select>
        </label>
        <div class="hud-muted">Playback Speed controls how fast demo time moves. Flow Evolution Speed controls how fast the current field changes per unit demo time.</div>
        <label class="compact-field">
          Boundary Mode
          <select id="flow-demo-boundary-mode">
            ${FLOW_DEMO_BOUNDARY_MODES.map((mode) => `<option value="${escapeAttr(mode)}" ${state.boundaryMode === mode ? 'selected' : ''}>${escapeHtml(boundaryModeLabel(mode))}</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-section">
        <h2>Display</h2>
        ${flowHelpButtonHtml('displayLayer', 'Explain Display')}
        <label class="compact-field">
          Magnitude Scale
          <select id="flow-demo-magnitude-scale">
            ${FLOW_DEMO_MAGNITUDE_SCALES.map((scale) => `<option value="${escapeAttr(scale)}" ${Number(state.magnitudeScale ?? 1.5) === scale ? 'selected' : ''}>${escapeHtml(scale)}x</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Particle Speed
          <select id="flow-demo-particle-speed">
            ${FLOW_DEMO_PARTICLE_SPEEDS.map((speed) => `<option value="${escapeAttr(speed)}" ${Number(state.particleSpeedScale ?? 1) === speed ? 'selected' : ''}>${escapeHtml(speed)}x</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-status">
        <span>Magnitude Range</span>
        <strong>${escapeHtml(formatDemoStat(state.magnitudeStats?.min))} / ${escapeHtml(formatDemoStat(state.magnitudeStats?.mean))} / ${escapeHtml(formatDemoStat(state.magnitudeStats?.max))}</strong>
        <small>Min / mean / max for the current arrow grid.</small>
      </section>
      <section class="console-section">
        <h2>Data Export</h2>
        ${demoExportControlsHtml(state)}
        <button data-action="export-demo-json" class="console-button">Export Demo JSON</button>
        <div class="hud-muted">Exports F(x,y,t) grids across the selected time range, plus config, current time, and selected-cell inspector state.</div>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('flowDemo');
    this.root.querySelector('#flow-demo-mode')?.addEventListener('change', (event) => handlers.fieldMode?.(event.target.value));
    this.root.querySelector('#flow-demo-preset')?.addEventListener('change', (event) => handlers.preset?.(event.target.value));
    this.root.querySelectorAll('[data-flow-layer-preset]').forEach((select) => {
      select.addEventListener('change', (event) => {
        const id = event.currentTarget.dataset.flowLayerPreset;
        handlers.updateLayer?.(id, { preset: event.target.value });
      });
    });
    this.root.querySelectorAll('[data-flow-layer-weight]').forEach((input) => {
      input.addEventListener('input', (event) => {
        handlers.updateLayer?.(event.currentTarget.dataset.flowLayerWeight, { weight: Number(event.target.value) });
      });
    });
    this.root.querySelectorAll('[data-flow-layer-influence]').forEach((select) => {
      select.addEventListener('change', (event) => {
        handlers.updateLayer?.(event.currentTarget.dataset.flowLayerInfluence, { influence: event.target.value });
      });
    });
    this.root.querySelectorAll('[data-flow-layer-enabled]').forEach((input) => {
      input.addEventListener('change', (event) => {
        handlers.updateLayer?.(event.currentTarget.dataset.flowLayerEnabled, { enabled: event.target.checked });
      });
    });
    this.root.querySelectorAll('[data-flow-layer-remove]').forEach((button) => {
      button.addEventListener('click', (event) => {
        handlers.removeLayer?.(event.currentTarget.dataset.flowLayerRemove);
      });
    });
    this.root.querySelector('#flow-demo-terrain')?.addEventListener('change', (event) => handlers.terrainMode?.(event.target.value));
    this.root.querySelector('#flow-demo-evolution-behavior')?.addEventListener('change', (event) => handlers.evolutionBehavior?.(event.target.value));
    this.root.querySelector('#flow-demo-cycle-duration')?.addEventListener('change', (event) => handlers.cycleDuration?.(event.target.value));
    this.root.querySelector('#flow-demo-direction-variation')?.addEventListener('change', (event) => handlers.directionVariation?.(event.target.value));
    this.root.querySelector('#flow-demo-magnitude-variation')?.addEventListener('change', (event) => handlers.magnitudeVariation?.(event.target.value));
    this.root.querySelector('#flow-demo-dynamic-complexity')?.addEventListener('change', (event) => handlers.dynamicComplexity?.(event.target.value));
    this.root.querySelector('#flow-demo-evolution-pattern')?.addEventListener('change', (event) => handlers.evolutionPattern?.(event.target.value));
    this.root.querySelector('#flow-demo-spatial-motion')?.addEventListener('change', (event) => handlers.spatialMotion?.(event.target.value));
    this.root.querySelector('#flow-demo-spatial-motion-speed')?.addEventListener('change', (event) => handlers.spatialMotionSpeed?.(event.target.value));
    this.root.querySelector('#flow-demo-playback-speed')?.addEventListener('change', (event) => handlers.playbackSpeedScale?.(event.target.value));
    this.root.querySelector('#flow-demo-evolution-speed')?.addEventListener('change', (event) => handlers.evolutionSpeedScale?.(event.target.value));
    this.root.querySelector('#flow-demo-flow-evolution-speed')?.addEventListener('change', (event) => handlers.flowEvolutionSpeedScale?.(event.target.value));
    this.root.querySelector('#flow-demo-boundary-mode')?.addEventListener('change', (event) => handlers.boundaryMode?.(event.target.value));
    this.root.querySelector('#flow-demo-magnitude-scale')?.addEventListener('change', (event) => handlers.magnitudeScale?.(event.target.value));
    this.root.querySelector('#flow-demo-particle-speed')?.addEventListener('change', (event) => handlers.particleSpeedScale?.(event.target.value));
    this.root.querySelectorAll('[data-flow-help]').forEach((button) => {
      button.addEventListener('click', () => handlers.behaviorHelp?.(button.dataset.flowHelp));
    });
    this.bindDemoExportControls(handlers);
    this.bind({
      preset: handlers.preset,
      'add-flow-layer': handlers.addLayer,
      'reset-terrain': handlers.resetTerrain,
      'export-demo-json': handlers.exportDemoJson,
      menu: handlers.menu
    });
  }

  renderRoiDemoControls(state = {}, handlers = {}) {
    if (!this.root) return;
    const stateModel = state.stateModel ?? roiStateModelForEvolutionModel(state.evolutionModel);
    const stateModelLabel = state.stateModelLabel ?? roiStateModelLabel(stateModel);
    const stateModelDescription = state.stateModelDescription ?? roiStateModelDescription(stateModel);
    const presetHelp = sampleFieldBehaviorExplainer('behaviorPreset', state.behaviorPresetId);
    const selectedPreset = sampleFieldBehaviorPresetById(state.behaviorPresetId);
    const presetStatus = state.behaviorPresetId && state.behaviorPresetId !== CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID
      ? state.behaviorPresetModified ? `Modified from ${state.behaviorPresetLabel}` : `Preset: ${state.behaviorPresetLabel}`
      : 'Preset: Custom';
    const eventLikelihoodHelp = sampleFieldBehaviorExplainer('eventLikelihood', state.eventLikelihood);
    const spatialHelp = sampleFieldBehaviorExplainer('spatialPattern', state.spatialPattern);
    const temporalHelp = sampleFieldBehaviorExplainer('temporalPattern', state.temporalPattern);
    const evolutionHelp = sampleFieldBehaviorExplainer('spatialEvolution', state.spatialEvolution ?? state.patternEvolution);
    const stateHelp = sampleFieldBehaviorExplainer('stateModel', stateModel);
    const valueDistributionHelp = sampleFieldBehaviorExplainer('valueDistribution', state.valueDistribution);
    const samplingHelp = sampleFieldBehaviorExplainer('samplingEffect', state.depletionMode);
    const displayHelp = sampleFieldBehaviorExplainer('displayLayer', state.displayMode);
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Sample / ROI Field Demo</div>
        <h1>${escapeHtml(state.title ?? 'Sample / ROI Field Demo')}</h1>
        <p>Visualizes S(x,y,t): where and when the environment is valuable to sample.</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(state.status ?? 'ROI field')}</span>
        <strong>${escapeHtml((state.timeMode === 'dynamic' || state.eventLikelihoodDynamics === 'dynamic') && !state.paused ? 'Animating' : state.paused ? 'Paused' : 'Static')}</strong>
        <small>${escapeHtml(`${state.eventLikelihoodLabel ?? roiEventLikelihoodLabel(state.eventLikelihood)} ${state.eventLikelihoodDynamics === 'dynamic' ? `(${roiTemporalPatternLabel(state.eventLikelihoodTemporalPattern)} / ${roiLikelihoodSpatialEvolutionLabel(state.eventLikelihoodSpatialEvolution)})` : '(Static)'} | ${state.spatialPatternLabel ?? roiPureSpatialPatternLabel(state.spatialPattern)} | ${state.valueDistributionLabel ?? roiValueDistributionLabel(state.valueDistribution)} | ${state.temporalPatternLabel ?? roiTemporalPatternLabel(state.temporalPattern)} | ${state.spatialEvolutionLabel ?? roiSpatialEvolutionLabel(state.spatialEvolution ?? state.patternEvolution)}`)}</small>
      </section>
      <section class="console-section">
        <h2 title="${escapeAttr(presetHelp.groupSummary)}">Behavior Preset <span aria-label="Behavior Preset help" title="${escapeAttr(presetHelp.short)}">i</span></h2>
        <label class="compact-field" title="${escapeAttr(presetHelp.short)}">
          <span>Behavior Preset</span>
          <select id="roi-demo-behavior-preset" title="${escapeAttr(presetHelp.short)}">
            ${SAMPLE_FIELD_BEHAVIOR_PRESET_OPTIONS.map((preset) => `<option value="${escapeAttr(preset.id)}" ${state.behaviorPresetId === preset.id || (!state.behaviorPresetId && preset.id === CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID) ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('behaviorPreset', `Explain ${state.behaviorPresetLabel ?? 'Custom'}`)}
        <div class="hud-muted">${escapeHtml(presetStatus)}</div>
        ${selectedPreset ? `<div class="hud-muted">Expected: ${escapeHtml(selectedPreset.explanation?.expectedBehavior ?? selectedPreset.description)}</div><div class="hud-muted">Actual current state: active ${escapeHtml(formatPercent(state.activityDiagnostics?.activeFraction))}, max ${escapeHtml(formatDemoStat(state.activityDiagnostics?.maxValue))}, injected +${escapeHtml(formatDemoStat(state.activityDiagnostics?.injectedActivity))}</div><div class="hud-muted">${escapeHtml(sampleFieldBehaviorPresetSummary(selectedPreset.id))}</div>` : '<div class="hud-muted">Custom primitive composition. Select a preset to load a curated starting point, then adjust the primitive controls below.</div>'}
      </section>
      <section class="console-section">
        <h2 title="${escapeAttr(eventLikelihoodHelp.groupSummary)}">Sample Field Substrate <span aria-label="Event Likelihood help" title="${escapeAttr(eventLikelihoodHelp.short)}">i</span></h2>
        <label class="compact-field" title="${escapeAttr(eventLikelihoodHelp.short)}">
          <span>Event Likelihood Field <span aria-label="Event Likelihood Field help" title="${escapeAttr(eventLikelihoodHelp.short)}">i</span></span>
          <select id="roi-demo-event-likelihood" title="${escapeAttr(eventLikelihoodHelp.short)}">
            ${ROI_DEMO_EVENT_LIKELIHOODS.map((likelihood) => {
              const help = sampleFieldBehaviorExplainer('eventLikelihood', likelihood);
              return `<option value="${escapeAttr(likelihood)}" ${state.eventLikelihood === likelihood ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiEventLikelihoodLabel(likelihood))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('eventLikelihood', `Explain ${roiEventLikelihoodLabel(state.eventLikelihood)}`)}
        <label class="compact-field">
          Dynamics
          <select id="roi-demo-event-likelihood-dynamics">
            ${ROI_DEMO_LIKELIHOOD_DYNAMICS.map((mode) => `<option value="${escapeAttr(mode)}" ${state.eventLikelihoodDynamics === mode ? 'selected' : ''}>${escapeHtml(roiLikelihoodDynamicsLabel(mode))}</option>`).join('')}
          </select>
        </label>
        ${state.eventLikelihoodDynamics === 'dynamic' ? `
          <label class="compact-field">
            Likelihood Temporal Pattern
            <select id="roi-demo-event-likelihood-temporal-pattern">
              ${ROI_DEMO_TEMPORAL_PATTERNS.map((pattern) => `<option value="${escapeAttr(pattern)}" ${state.eventLikelihoodTemporalPattern === pattern ? 'selected' : ''}>${escapeHtml(roiTemporalPatternLabel(pattern))}</option>`).join('')}
            </select>
          </label>
          <label class="compact-field">
            Likelihood Spatial Evolution
            <select id="roi-demo-event-likelihood-spatial-evolution">
              ${ROI_DEMO_SPATIAL_EVOLUTIONS.map((evolution) => `<option value="${escapeAttr(evolution)}" ${state.eventLikelihoodSpatialEvolution === evolution ? 'selected' : ''}>${escapeHtml(roiLikelihoodSpatialEvolutionLabel(evolution))}</option>`).join('')}
            </select>
          </label>
          <div class="hud-muted">Dynamic likelihood updates L(x,y,t). It controls where future events are likely to originate; the sample-value controls below still define the realized S(x,y,t).</div>
        ` : ''}
        <label class="compact-field" title="${escapeAttr(spatialHelp.short)}">
          <span>Spatial Pattern <span aria-label="Pattern help" title="${escapeAttr(spatialHelp.short)}">i</span></span>
          <select id="roi-demo-spatial-pattern" title="${escapeAttr(spatialHelp.short)}">
            ${ROI_DEMO_PURE_SPATIAL_PATTERNS.map((pattern) => {
              const help = sampleFieldBehaviorExplainer('spatialPattern', pattern);
              return `<option value="${escapeAttr(pattern)}" ${state.spatialPattern === pattern ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiPureSpatialPatternLabel(pattern))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('spatialPattern', `Explain ${roiPureSpatialPatternLabel(state.spatialPattern)}`)}
        <label class="compact-field" title="${escapeAttr(valueDistributionHelp.short)}">
          <span>Value Distribution <span aria-label="Value Distribution help" title="${escapeAttr(valueDistributionHelp.short)}">i</span></span>
          <select id="roi-demo-value-distribution" title="${escapeAttr(valueDistributionHelp.short)}">
            ${ROI_DEMO_VALUE_DISTRIBUTIONS.map((distribution) => {
              const help = sampleFieldBehaviorExplainer('valueDistribution', distribution);
              return `<option value="${escapeAttr(distribution)}" ${state.valueDistribution === distribution ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiValueDistributionLabel(distribution))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('valueDistribution', `Explain ${roiValueDistributionLabel(state.valueDistribution)}`)}
        <label class="compact-field">
          Cluster Count
          <input id="roi-demo-hotspots" type="range" min="1" max="6" step="1" value="${escapeAttr(state.clusterCount ?? state.hotspotCount ?? 3)}" />
        </label>
        <div class="hud-muted">${escapeHtml(state.clusterCount ?? state.hotspotCount ?? 3)} cluster(s)</div>
        <label class="compact-field">
          Cluster Size
          <select id="roi-demo-cluster-size">
            ${ROI_DEMO_CLUSTER_SIZES.map((size) => `<option value="${escapeAttr(size)}" ${state.clusterSize === size ? 'selected' : ''}>${escapeHtml(roiClusterSizeLabel(size))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Seed
          <input id="roi-demo-seed" type="text" value="${escapeAttr(state.seed ?? 'anchor-roi-demo')}" />
        </label>
        <button data-action="regenerate" class="console-button">Regenerate</button>
        <div class="hud-muted">Event Likelihood Field controls L(x,y,t): where events are likely to originate. Spatial Pattern and Value Distribution control observed S(x,y,t). This pure demo does not use current vectors, land, or flow transport.</div>
      </section>
      <section class="console-section">
        <h2>Spatial Parameters</h2>
        <label class="compact-field">
          Noise / Texture
          <input id="roi-demo-noise" type="range" min="0" max="1" step="0.05" value="${escapeAttr(state.noise ?? 0.15)}" />
        </label>
        <div class="hud-muted">Noise ${escapeHtml(Number(state.noise ?? 0.15).toFixed(2))}. Cluster size controls spread; cluster count controls how many centers are generated.</div>
      </section>
      <section class="console-section">
        <h2 title="${escapeAttr(temporalHelp.groupSummary)}">Temporal Pattern <span aria-label="Temporal Pattern help" title="${escapeAttr(temporalHelp.short)}">i</span></h2>
        <label class="compact-field">
          Time Mode
          <select id="roi-demo-time-mode">
            ${ROI_DEMO_TIME_MODES.map((mode) => `<option value="${escapeAttr(mode)}" ${state.timeMode === mode ? 'selected' : ''}>${escapeHtml(mode === 'dynamic' ? 'Dynamic' : 'Static')}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field" title="${escapeAttr(temporalHelp.short)}">
          Temporal Pattern
          <select id="roi-demo-temporal-pattern" title="${escapeAttr(temporalHelp.short)}">
            ${ROI_DEMO_TEMPORAL_PATTERNS.map((pattern) => {
              const help = sampleFieldBehaviorExplainer('temporalPattern', pattern);
              return `<option value="${escapeAttr(pattern)}" ${state.temporalPattern === pattern ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiTemporalPatternLabel(pattern))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('temporalPattern', `Explain ${roiTemporalPatternLabel(state.temporalPattern)}`)}
      </section>
      <section class="console-section">
        <h2 title="${escapeAttr(evolutionHelp.groupSummary)}">Spatial Evolution <span aria-label="Spatial Evolution help" title="${escapeAttr(evolutionHelp.short)}">i</span></h2>
        <label class="compact-field" title="${escapeAttr(evolutionHelp.short)}">
          Spatial Evolution
          <select id="roi-demo-spatial-evolution" title="${escapeAttr(evolutionHelp.short)}">
            ${ROI_DEMO_SPATIAL_EVOLUTIONS.map((model) => {
              const help = sampleFieldBehaviorExplainer('spatialEvolution', model);
              return `<option value="${escapeAttr(model)}" ${(state.spatialEvolution ?? state.patternEvolution) === model ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiSpatialEvolutionLabel(model))}</option>`;
            }).join('')}
          </select>
        </label>
        <label class="compact-field">
          Motion Scope
          <select id="roi-demo-motion-scope" title="Controls whether motion shifts the whole field, moves features independently, or evolves local neighborhoods.">
            ${ROI_DEMO_MOTION_SCOPES.map((scope) => `<option value="${escapeAttr(scope)}" ${state.motionScope === scope ? 'selected' : ''}>${escapeHtml(roiMotionScopeLabel(scope))}</option>`).join('')}
          </select>
        </label>
        <div class="hud-muted">Default motion is ${escapeHtml(roiMotionScopeLabel(state.motionScope ?? 'perFeature'))}; Global preserves whole-field shifting only when explicitly selected.</div>
        <label class="compact-field">
          Dynamic Complexity
          <select id="roi-demo-dynamic-complexity">
            ${ROI_DEMO_DYNAMIC_COMPLEXITY.map((level) => `<option value="${escapeAttr(level)}" ${state.dynamicComplexity === level ? 'selected' : ''}>${escapeHtml(dynamicComplexityLabel(level))}</option>`).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('spatialEvolution', `Explain ${roiSpatialEvolutionLabel(state.spatialEvolution ?? state.patternEvolution)}`)}
      </section>
      <section class="console-section">
        <h2 title="${escapeAttr(stateHelp.groupSummary)}">State Model <span aria-label="State Model help" title="${escapeAttr(stateHelp.short)}">i</span></h2>
        <div class="hud-muted">State Model: ${escapeHtml(stateModelLabel)}. ${escapeHtml(stateModelDescription)}</div>
        <label class="compact-field" title="${escapeAttr(stateHelp.short)}">
          State Model
          <select id="roi-demo-state-model" title="${escapeAttr(stateHelp.short)}">
            ${ROI_DEMO_STATE_MODELS.map((model) => {
              const help = sampleFieldBehaviorExplainer('stateModel', model);
              return `<option value="${escapeAttr(model)}" ${stateModel === model ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiStateModelLabel(model))}</option>`;
            }).join('')}
          </select>
        </label>
        <div class="hud-muted">Time-Indexed fields are computed directly from position and time; State-Evolving fields use current field state; History-Aware fields depend on longer sampling or observation history.</div>
        ${roiHelpButtonHtml('stateModel', `Explain ${stateModelLabel}`)}
      </section>
      <section class="console-section">
        <h2 title="${escapeAttr(samplingHelp.groupSummary)}">Sampling Effects <span aria-label="Sampling Effect help" title="${escapeAttr(samplingHelp.short)}">i</span></h2>
        <label class="compact-field" title="${escapeAttr(samplingHelp.short)}">
          Depletion
          <select id="roi-demo-depletion-mode" title="${escapeAttr(samplingHelp.short)}">
            ${ROI_DEMO_DEPLETION_MODES.map((mode) => {
              const help = sampleFieldBehaviorExplainer('samplingEffect', mode);
              return `<option value="${escapeAttr(mode)}" ${state.depletionMode === mode ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiDepletionModeLabel(mode))}</option>`;
            }).join('')}
          </select>
        </label>
        <div class="hud-muted">Demo-only synthetic sample visits: recently visited regions cool down, nearby cells can partially cool, and stale regions recover value over time. Mission scoring uses actual glider visit history.</div>
        ${roiHelpButtonHtml('samplingEffect', `Explain ${roiDepletionModeLabel(state.depletionMode)}`)}
      </section>
      <section class="console-section">
        <h2 title="${escapeAttr(displayHelp.groupSummary)}">Display <span aria-label="Display Layer help" title="${escapeAttr(displayHelp.short)}">i</span></h2>
        <label class="compact-field" title="${escapeAttr(displayHelp.short)}">
          Display Layer
          <select id="roi-demo-display-mode" title="${escapeAttr(displayHelp.short)}">
            ${ROI_DEMO_DISPLAY_MODES.map((mode) => {
              const help = sampleFieldBehaviorExplainer('displayLayer', mode);
              return `<option value="${escapeAttr(mode)}" ${state.displayMode === mode ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiDisplayModeLabel(mode))}</option>`;
            }).join('')}
          </select>
        </label>
        <label class="compact-field">
          Time Speed
          <select id="roi-demo-time-speed">
            ${[0.5, 1, 2, 5].map((speed) => `<option value="${escapeAttr(speed)}" ${Number(state.timeSpeedScale ?? 1) === speed ? 'selected' : ''}>${escapeHtml(speed)}x</option>`).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('displayLayer', `Explain ${roiDisplayModeLabel(state.displayMode)}`)}
      </section>
      <section class="console-status">
        <span>Field Stats</span>
        <strong>Activity ${escapeHtml(formatDemoStat(state.activityDiagnostics?.meanValue ?? state.stats?.mean))} mean | ${escapeHtml(formatPercent(state.activityDiagnostics?.activeFraction))} active | Max ${escapeHtml(formatDemoStat(state.activityDiagnostics?.maxValue ?? state.stats?.max))} | Range ${escapeHtml(formatDemoStat(state.activityDiagnostics?.dynamicRangeAfterContrast ?? ((state.stats?.max ?? 0) - (state.stats?.min ?? 0))))}</strong>
        <small>${escapeHtml(state.eventLikelihoodLabel ?? roiEventLikelihoodLabel(state.eventLikelihood))} ${escapeHtml(state.eventLikelihoodDynamics === 'dynamic' ? `${roiTemporalPatternLabel(state.eventLikelihoodTemporalPattern)} / ${roiLikelihoodSpatialEvolutionLabel(state.eventLikelihoodSpatialEvolution)}` : 'Static')} / ${escapeHtml(state.spatialPatternLabel ?? roiPureSpatialPatternLabel(state.spatialPattern))} / ${escapeHtml(state.valueDistributionLabel ?? roiValueDistributionLabel(state.valueDistribution))} / ${escapeHtml(state.temporalPatternLabel ?? roiTemporalPatternLabel(state.temporalPattern))} / ${escapeHtml(state.spatialEvolutionLabel ?? roiSpatialEvolutionLabel(state.spatialEvolution ?? state.patternEvolution))} / ${escapeHtml(stateModelLabel)} | Total ${escapeHtml(formatDemoStat(state.activityDiagnostics?.totalActivityMass ?? state.stats?.totalValue))} | Injected +${escapeHtml(formatDemoStat(state.activityDiagnostics?.injectedActivity))} | Contrast ${escapeHtml(state.activityDiagnostics?.contrastEnhanced ? `on ${formatDemoStat(state.activityDiagnostics?.contrastStrength)}` : 'off')} | Decay -${escapeHtml(formatDemoStat(state.activityDiagnostics?.activityLostToDecay))} | Depletion -${escapeHtml(formatDemoStat(state.activityDiagnostics?.activityLostToDepletion))}</small>
      </section>
      <section class="console-section">
        <h2>Data Export</h2>
        ${demoExportControlsHtml(state)}
        <button data-action="export-demo-json" class="console-button">Export Demo JSON</button>
        <div class="hud-muted">Exports S(x,y,t) and L(x,y,t) grids across the selected time range, plus config and selected-cell inspector state.</div>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('roiDemo');
    this.root.querySelector('#roi-demo-behavior-preset')?.addEventListener('change', (event) => handlers.behaviorPreset?.(event.target.value));
    this.root.querySelector('#roi-demo-event-likelihood')?.addEventListener('change', (event) => handlers.eventLikelihood?.(event.target.value));
    this.root.querySelector('#roi-demo-event-likelihood-dynamics')?.addEventListener('change', (event) => handlers.eventLikelihoodDynamics?.(event.target.value));
    this.root.querySelector('#roi-demo-event-likelihood-temporal-pattern')?.addEventListener('change', (event) => handlers.eventLikelihoodTemporalPattern?.(event.target.value));
    this.root.querySelector('#roi-demo-event-likelihood-spatial-evolution')?.addEventListener('change', (event) => handlers.eventLikelihoodSpatialEvolution?.(event.target.value));
    this.root.querySelector('#roi-demo-spatial-pattern')?.addEventListener('change', (event) => handlers.spatialPattern?.(event.target.value));
    this.root.querySelector('#roi-demo-value-distribution')?.addEventListener('change', (event) => handlers.valueDistribution?.(event.target.value));
    this.root.querySelector('#roi-demo-seed')?.addEventListener('change', (event) => handlers.seed?.(event.target.value));
    this.root.querySelector('#roi-demo-hotspots')?.addEventListener('input', (event) => handlers.hotspotCount?.(event.target.value));
    this.root.querySelector('#roi-demo-cluster-size')?.addEventListener('change', (event) => handlers.clusterSize?.(event.target.value));
    this.root.querySelector('#roi-demo-noise')?.addEventListener('input', (event) => handlers.noise?.(event.target.value));
    this.root.querySelector('#roi-demo-time-mode')?.addEventListener('change', (event) => handlers.timeMode?.(event.target.value));
    this.root.querySelector('#roi-demo-temporal-pattern')?.addEventListener('change', (event) => handlers.temporalPattern?.(event.target.value));
    this.root.querySelector('#roi-demo-temporal-behavior')?.addEventListener('change', (event) => handlers.temporalBehavior?.(event.target.value));
    this.root.querySelector('#roi-demo-spatial-evolution')?.addEventListener('change', (event) => handlers.spatialEvolution?.(event.target.value));
    this.root.querySelector('#roi-demo-motion-scope')?.addEventListener('change', (event) => handlers.motionScope?.(event.target.value));
    this.root.querySelector('#roi-demo-state-model')?.addEventListener('change', (event) => handlers.stateModel?.(event.target.value));
    this.root.querySelector('#roi-demo-dynamic-complexity')?.addEventListener('change', (event) => handlers.dynamicComplexity?.(event.target.value));
    this.root.querySelector('#roi-demo-depletion-mode')?.addEventListener('change', (event) => handlers.depletionMode?.(event.target.value));
    this.root.querySelector('#roi-demo-display-mode')?.addEventListener('change', (event) => handlers.displayMode?.(event.target.value));
    this.root.querySelector('#roi-demo-time-speed')?.addEventListener('change', (event) => handlers.timeSpeedScale?.(event.target.value));
    this.root.querySelectorAll('[data-roi-help]').forEach((button) => {
      button.addEventListener('click', () => handlers.behaviorHelp?.(button.dataset.roiHelp));
    });
    this.bindDemoExportControls(handlers);
    this.bind({
      regenerate: handlers.regenerate,
      'export-demo-json': handlers.exportDemoJson,
      menu: handlers.menu
    });
  }

  renderCoupledFieldsDemoControls(state = {}, handlers = {}) {
    if (!this.root) return;
    const couplingModes = ['off', 'currentAdvected', 'currentStretched', 'shorelineRunoff', 'eddyCarried'];
    const forecastViews = ['forecast', 'truth', 'uncertainty', 'depleted'];
    const layerToggles = state.layerToggles ?? {};
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Coupled Fields Demo</div>
        <h1>${escapeHtml(state.title ?? 'Coupled Fields Demo')}</h1>
        <p>Overlays F(x,y,t) currents and S(x,y,t) sample value to show field interaction.</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(state.status ?? 'Coupled fields')}</span>
        <strong>${escapeHtml(state.paused ? 'Paused' : 'Animating')}</strong>
        <small>Flow arrows and sample heatmap share one demo clock. Current-coupled modes sample the displayed flow field.</small>
      </section>
      <section class="console-section">
        <h2>Display Layers</h2>
        ${toggleHtml('flowArrows', 'Flow arrows', layerToggles.flowArrows !== false)}
        ${toggleHtml('flowParticles', 'Flow particles', Boolean(layerToggles.flowParticles))}
        ${toggleHtml('sampleHeatmap', 'Sample heatmap', layerToggles.sampleHeatmap !== false)}
        ${toggleHtml('landTopology', 'Land / topology', layerToggles.landTopology !== false)}
      </section>
      <section class="console-section">
        <h2>Flow Field</h2>
        <label class="compact-field">
          Base Flow Field
          <select id="coupled-flow-preset">
            ${FLOW_DEMO_PRESET_CHOICES.map((preset) => {
              const config = getVectorPresetConfig(preset);
              return `<option value="${escapeAttr(preset)}" ${state.flowPreset === preset ? 'selected' : ''}>${escapeHtml(config.label)}</option>`;
            }).join('')}
          </select>
        </label>
        <label class="compact-field">
          Dynamic Complexity
          <select id="coupled-dynamic-complexity">
            ${FLOW_DEMO_DYNAMIC_COMPLEXITY_LEVELS.map((level) => `<option value="${escapeAttr(level)}" ${state.dynamicComplexity === level ? 'selected' : ''}>${escapeHtml(dynamicComplexityLabel(level))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Evolution Behavior
          <select id="coupled-evolution-behavior">
            ${FLOW_DEMO_EVOLUTION_BEHAVIORS.map((behavior) => `<option value="${escapeAttr(behavior)}" ${state.evolutionBehavior === behavior ? 'selected' : ''}>${escapeHtml(evolutionBehaviorLabel(behavior))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Boundary Mode
          <select id="coupled-boundary-mode">
            ${FLOW_DEMO_BOUNDARY_MODES.map((mode) => `<option value="${escapeAttr(mode)}" ${state.boundaryMode === mode ? 'selected' : ''}>${escapeHtml(boundaryModeLabel(mode))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Land Mode
          <select id="coupled-terrain-mode">
            ${FLOW_DEMO_TERRAIN_MODES.map((mode) => `<option value="${escapeAttr(mode)}" ${state.terrainMode === mode ? 'selected' : ''}>${escapeHtml(terrainModeLabel(mode))}</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-section">
        <h2>Sample Field</h2>
        <label class="compact-field">
          Distribution
          <select id="coupled-sample-distribution">
            ${ROI_DEMO_DISTRIBUTIONS.map((distribution) => `<option value="${escapeAttr(distribution)}" ${state.sampleDistribution === distribution ? 'selected' : ''}>${escapeHtml(roiDistributionLabel(distribution))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Spatial Pattern
          <select id="coupled-spatial-pattern">
            ${ROI_DEMO_SPATIAL_PATTERNS.map((pattern) => `<option value="${escapeAttr(pattern)}" ${state.spatialPattern === pattern ? 'selected' : ''}>${escapeHtml(sampleSpatialPatternLabel(pattern))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Temporal Behavior
          <select id="coupled-temporal-behavior">
            ${ROI_DEMO_TEMPORAL_BEHAVIORS.map((behavior) => `<option value="${escapeAttr(behavior)}" ${state.temporalBehavior === behavior ? 'selected' : ''}>${escapeHtml(sampleTemporalBehaviorLabel(behavior))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Forecast / Truth
          <select id="coupled-forecast-view">
            ${forecastViews.map((view) => `<option value="${escapeAttr(view)}" ${state.forecastView === view ? 'selected' : ''}>${escapeHtml(roiForecastViewLabel(view))}</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-section">
        <h2>Coupling</h2>
        <label class="compact-field">
          Coupling Mode
          <select id="coupled-coupling-mode">
            ${couplingModes.map((mode) => `<option value="${escapeAttr(mode)}" ${state.couplingMode === mode ? 'selected' : ''}>${escapeHtml(couplingModeLabel(mode))}</option>`).join('')}
          </select>
        </label>
        <div class="hud-muted">Current-coupled modes backtrace or shape sample value using the same flow vectors rendered on the canvas.</div>
        <label class="compact-field">
          Playback Speed
          <select id="coupled-playback-speed">
            ${[0.5, 1, 2, 5].map((speed) => `<option value="${escapeAttr(speed)}" ${Number(state.playbackSpeedScale ?? 1) === speed ? 'selected' : ''}>${escapeHtml(speed)}x</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-status">
        <span>Sample Value Range</span>
        <strong>${escapeHtml(formatDemoStat(state.stats?.min))} / ${escapeHtml(formatDemoStat(state.stats?.mean))} / ${escapeHtml(formatDemoStat(state.stats?.max))}</strong>
        <small>Min / mean / max for the visible sample heatmap.</small>
      </section>
      <section class="console-section">
        <h2>Data Export</h2>
        ${demoExportControlsHtml(state)}
        <button data-action="export-demo-json" class="console-button">Export Demo JSON</button>
        <div class="hud-muted">Exports composed flow and sample-value grids across the selected time range with coupling metadata.</div>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('coupledFieldsDemo');
    this.root.querySelectorAll('[data-coupled-layer]').forEach((input) => {
      input.addEventListener('change', (event) => handlers.layerToggle?.(event.currentTarget.dataset.coupledLayer, event.target.checked));
    });
    this.root.querySelector('#coupled-flow-preset')?.addEventListener('change', (event) => handlers.flowPreset?.(event.target.value));
    this.root.querySelector('#coupled-dynamic-complexity')?.addEventListener('change', (event) => handlers.dynamicComplexity?.(event.target.value));
    this.root.querySelector('#coupled-evolution-behavior')?.addEventListener('change', (event) => handlers.evolutionBehavior?.(event.target.value));
    this.root.querySelector('#coupled-boundary-mode')?.addEventListener('change', (event) => handlers.boundaryMode?.(event.target.value));
    this.root.querySelector('#coupled-terrain-mode')?.addEventListener('change', (event) => handlers.terrainMode?.(event.target.value));
    this.root.querySelector('#coupled-sample-distribution')?.addEventListener('change', (event) => handlers.sampleDistribution?.(event.target.value));
    this.root.querySelector('#coupled-spatial-pattern')?.addEventListener('change', (event) => handlers.spatialPattern?.(event.target.value));
    this.root.querySelector('#coupled-temporal-behavior')?.addEventListener('change', (event) => handlers.temporalBehavior?.(event.target.value));
    this.root.querySelector('#coupled-forecast-view')?.addEventListener('change', (event) => handlers.forecastView?.(event.target.value));
    this.root.querySelector('#coupled-coupling-mode')?.addEventListener('change', (event) => handlers.couplingMode?.(event.target.value));
    this.root.querySelector('#coupled-playback-speed')?.addEventListener('change', (event) => handlers.playbackSpeedScale?.(event.target.value));
    this.bindDemoExportControls(handlers);
    this.bind({
      'export-demo-json': handlers.exportDemoJson,
      menu: handlers.menu
    });
  }

  renderUncertaintyForecastDemoControls(state = {}, handlers = {}) {
    if (!this.root) return;
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Uncertainty / Forecast Demo</div>
        <h1>${escapeHtml(state.title ?? 'Uncertainty / Forecast Demo')}</h1>
        <p>Explore what is known, unknown, wrong, or learned in forecast planning fields.</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(state.status ?? 'Uncertainty layer')}</span>
        <strong>${escapeHtml(state.paused ? 'Paused' : 'Animating')}</strong>
        <small>${escapeHtml(`${state.forecastModelLabel ?? forecastModelLabel(state.forecastModel)} | ${state.updateModelLabel ?? updateModelLabel(state.updateModel)} | Observations ${state.observationCount ?? 0}`)}</small>
      </section>
      <section class="console-section">
        <h2>Displayed Layer</h2>
        <label class="compact-field">
          View
          <select id="uncertainty-demo-view">
            ${UNCERTAINTY_DEMO_VIEW_MODES.map((view) => `<option value="${escapeAttr(view)}" ${state.viewMode === view ? 'selected' : ''}>${escapeHtml(uncertaintyViewLabel(view))}</option>`).join('')}
          </select>
        </label>
        <div class="hud-muted">Truth is shown here for education only. Fair solver packets hide truth unless oracle mode is explicit.</div>
      </section>
      <section class="console-section">
        <h2>Uncertainty Pattern</h2>
        <label class="compact-field">
          Spatial Pattern
          <select id="uncertainty-demo-pattern">
            ${UNCERTAINTY_DEMO_PATTERNS.map((pattern) => `<option value="${escapeAttr(pattern)}" ${state.uncertaintyPattern === pattern ? 'selected' : ''}>${escapeHtml(uncertaintyPatternLabel(pattern))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Seed
          <input id="uncertainty-demo-seed" type="text" value="${escapeAttr(state.seed ?? 'anchor-uncertainty-demo')}" />
        </label>
      </section>
      <section class="console-section">
        <h2>Forecast Model</h2>
        <label class="compact-field">
          Forecast Model
          <select id="uncertainty-demo-forecast-model">
            ${UNCERTAINTY_DEMO_FORECAST_MODELS.map((model) => `<option value="${escapeAttr(model)}" ${state.forecastModel === model ? 'selected' : ''}>${escapeHtml(forecastModelLabel(model))}</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-section">
        <h2>Uncertainty Behavior</h2>
        <label class="compact-field">
          Behavior
          <select id="uncertainty-demo-behavior">
            ${UNCERTAINTY_DEMO_BEHAVIORS.map((behavior) => `<option value="${escapeAttr(behavior)}" ${state.uncertaintyBehavior === behavior ? 'selected' : ''}>${escapeHtml(uncertaintyBehaviorLabel(behavior))}</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-section">
        <h2>Update Model</h2>
        <label class="compact-field">
          Update Model
          <select id="uncertainty-demo-update-model">
            ${UNCERTAINTY_DEMO_UPDATE_MODELS.map((model) => `<option value="${escapeAttr(model)}" ${state.updateModel === model ? 'selected' : ''}>${escapeHtml(updateModelLabel(model))}</option>`).join('')}
          </select>
        </label>
        <button data-action="uncertainty-apply-sample" class="console-button">Apply Sample Update</button>
        <button data-action="uncertainty-surface-update" class="console-button secondary">Surface Update</button>
        <button data-action="uncertainty-reset-observations" class="console-button secondary">Reset Observations</button>
        <div class="hud-muted">Clicking the map also simulates a sample observation at that cell.</div>
      </section>
      <section class="console-section">
        <h2>Playback</h2>
        <label class="compact-field">
          Time Speed
          <select id="uncertainty-demo-playback-speed">
            ${[0.5, 1, 2, 5].map((speed) => `<option value="${escapeAttr(speed)}" ${Number(state.playbackSpeedScale ?? 1) === speed ? 'selected' : ''}>${escapeHtml(speed)}x</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-status">
        <span>Layer Stats</span>
        <strong>Max ${escapeHtml(formatDemoStat(state.stats?.max))} | Mean ${escapeHtml(formatDemoStat(state.stats?.mean))}</strong>
        <small>${escapeHtml(state.viewModeLabel ?? uncertaintyViewLabel(state.viewMode))} | Total ${escapeHtml(formatDemoStat(state.stats?.totalValue))}</small>
      </section>
      <section class="console-section">
        <h2>Data Export</h2>
        ${demoExportControlsHtml(state)}
        <button data-action="export-demo-json" class="console-button">Export Demo JSON</button>
        <div class="hud-muted">Exports forecast, truth, uncertainty, information-gain, error, update, and displayed grids across the selected time range.</div>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('uncertaintyForecastDemo');
    this.root.querySelector('#uncertainty-demo-view')?.addEventListener('change', (event) => handlers.viewMode?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-pattern')?.addEventListener('change', (event) => handlers.uncertaintyPattern?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-seed')?.addEventListener('change', (event) => handlers.seed?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-forecast-model')?.addEventListener('change', (event) => handlers.forecastModel?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-behavior')?.addEventListener('change', (event) => handlers.uncertaintyBehavior?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-update-model')?.addEventListener('change', (event) => handlers.updateModel?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-playback-speed')?.addEventListener('change', (event) => handlers.playbackSpeedScale?.(event.target.value));
    this.bindDemoExportControls(handlers);
    this.bind({
      'uncertainty-apply-sample': handlers.applySampleUpdate,
      'uncertainty-surface-update': handlers.surfaceUpdate,
      'uncertainty-reset-observations': handlers.resetObservations,
      'export-demo-json': handlers.exportDemoJson,
      menu: handlers.menu
    });
  }

  renderLeaderboardControls(state = {}, handlers = {}) {
    if (!this.root) return;
    const filters = [
      ['challenge', 'Challenge'],
      ['simulationLab', 'Simulation Lab'],
      ['all', 'All'],
      ['manual', 'Manual'],
      ['greedyPlanner', 'Greedy Planner'],
      ['externalSolver', 'External Solver'],
      ['deterministic', 'Deterministic'],
      ['stochastic', 'Stochastic'],
      ['tutorial', 'Tutorial'],
      ['custom', 'Custom']
    ];
    const sorts = [
      ['bestScore', 'Best Score'],
      ['lastPlayed', 'Last Played'],
      ['attempts', 'Attempts'],
      ['mapSize', 'Map Size']
    ];
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Local Leaderboard</div>
        <h1>${escapeHtml(state.filter === 'simulationLab' ? 'Benchmark Results' : 'Challenge Records')}</h1>
        <p>Browse saved attempts by experience mode, route source, and scenario.</p>
      </section>
      <section class="console-section">
        <h2>Filters</h2>
        <div class="leaderboard-filter-tabs">
          ${filters.map(([value, label]) => `<button data-filter="${escapeAttr(value)}" class="${state.filter === value ? 'active' : ''}">${escapeHtml(label)}</button>`).join('')}
        </div>
        <label class="compact-field">
          Search
          <input id="leaderboard-search" type="search" value="${escapeAttr(state.search ?? '')}" placeholder="Map, seed, instance..." />
        </label>
        <label class="compact-field">
          Sort
          <select id="leaderboard-sort">
            ${sorts.map(([value, label]) => `<option value="${escapeAttr(value)}" ${state.sort === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-section">
        <h2>Actions</h2>
        <button data-action="import" class="console-button">Import Leaderboard JSON</button>
        <button data-action="export" class="console-button">Export Leaderboard JSON</button>
        <button data-action="clear-all" class="console-button secondary">Clear All Leaderboard Data</button>
      </section>
      <section class="console-status">
        <span>Visible Records</span>
        <strong>${escapeHtml(state.count ?? 0)} / ${escapeHtml(state.total ?? 0)}</strong>
        <small>Records are stored locally in this browser.</small>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('leaderboard');
    this.root.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => handlers.filter?.(button.dataset.filter));
    });
    this.root.querySelector('#leaderboard-search')?.addEventListener('input', (event) => handlers.search?.(event.target.value));
    this.root.querySelector('#leaderboard-sort')?.addEventListener('change', (event) => handlers.sort?.(event.target.value));
    this.bind({
      import: handlers.import,
      export: handlers.export,
      'clear-all': handlers.clearAll,
      menu: handlers.menu
    });
  }

  renderTutorialControls(state = {}, handlers = {}) {
    if (!this.root) return;
    const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Challenge'];
    const statuses = [
      ['all', 'All'],
      ['notStarted', 'Not Started'],
      ['incomplete', 'Incomplete'],
      ['completed', 'Completed']
    ];
    const recommended = state.recommendedId
      ? CAMPAIGN_LEVELS.find((entry) => entry.id === state.recommendedId)
      : null;
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Tutorial Browser</div>
        <h1>Training Campaign</h1>
        <p>Filter staged lessons while cards stay readable in the center viewport.</p>
      </section>
      <section class="console-status">
        <span>Progress</span>
        <strong>${escapeHtml(state.completed ?? 0)} / ${escapeHtml(state.total ?? CAMPAIGN_LEVELS.length)} completed</strong>
        <small>Recommended: ${escapeHtml(recommended?.title ?? 'Start any tutorial')}</small>
      </section>
      <section class="console-section">
        <h2>Search / Filter</h2>
        <label class="compact-field">
          Search
          <input id="tutorial-search" type="search" value="${escapeAttr(state.search ?? '')}" placeholder="Title, focus, objective..." />
        </label>
        <label class="compact-field">
          Difficulty
          <select id="tutorial-difficulty">
            ${difficulties.map((label) => {
              const value = label === 'All' ? 'all' : label;
              return `<option value="${escapeAttr(value)}" ${state.difficulty === value || (!state.difficulty && value === 'all') ? 'selected' : ''}>${escapeHtml(label)}</option>`;
            }).join('')}
          </select>
        </label>
        <label class="compact-field">
          Status
          <select id="tutorial-status">
            ${statuses.map(([value, label]) => `<option value="${escapeAttr(value)}" ${state.status === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Focus
          <select id="tutorial-focus">
            <option value="all" ${state.focus === 'all' || !state.focus ? 'selected' : ''}>All</option>
            ${(state.focusOptions ?? []).map((option) => `<option value="${escapeAttr(option.value)}" ${state.focus === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
          </select>
        </label>
      </section>
      <section class="console-section">
        <h2>Tutorial Campaign</h2>
        <div class="hud-muted">${escapeHtml(state.count ?? 0)} visible lesson(s).</div>
        <button data-action="continue" class="console-button primary" ${recommended ? '' : 'disabled'}>Continue Recommended Tutorial</button>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('tutorial');
    this.root.querySelector('#tutorial-search')?.addEventListener('input', (event) => handlers.search?.(event.target.value));
    this.root.querySelector('#tutorial-difficulty')?.addEventListener('change', (event) => handlers.difficulty?.(event.target.value));
    this.root.querySelector('#tutorial-status')?.addEventListener('change', (event) => handlers.status?.(event.target.value));
    this.root.querySelector('#tutorial-focus')?.addEventListener('change', (event) => handlers.focus?.(event.target.value));
    this.bind({
      continue: () => recommended && handlers.start?.(recommended.id),
      menu: handlers.menu
    });
  }

  renderDebriefActions(result, state, handlers = {}) {
    if (!this.root) return;
    const summary = result?.summary ?? {};
    const endCondition = result?.endCondition ?? summary.endCondition ?? {};
    const sampling = result?.sampling ?? {};
    const priorityTargets = result?.priorityTargets ?? summary.priorityTargets ?? {};
    const stopReason = result?.stopReason ?? summary.stopReason;
    const stochasticEnabled = Boolean(state?.stochastic?.enabled);
    const experience = getExperienceModeDefaults(result?.experienceMode ?? state?.experienceMode);
    const simulationLab = (result?.experienceMode ?? state?.experienceMode) === EXPERIENCE_MODES.simulationLab;
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Debrief Console</div>
        <h1>${escapeHtml(simulationLab ? 'Simulation Lab Debrief' : 'Challenge Debrief')}</h1>
        <p>${escapeHtml(experience.label)} | ${escapeHtml(result?.source ?? 'No result')} | ${escapeHtml(result?.challengeMode ?? state?.challengeMode ?? '')}</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(simulationLab ? 'Metric Score' : 'Challenge Score')}</span>
        <strong>${escapeHtml(formatMetric(summary.finalScore ?? 'N/A'))}</strong>
        <small>Instance ${escapeHtml(shortInstanceId(result?.instanceId ?? state?.level?.instanceId))}</small>
      </section>
      <section class="console-section">
        <h2>Actions</h2>
        <button class="console-button primary" data-action="revise">Revise Plan</button>
      </section>
      <section class="console-section">
        <h2>Mission Actions</h2>
        <button class="console-button" data-action="rerun-same" ${stochasticEnabled ? '' : 'disabled'}>Rerun Same</button>
        <button class="console-button" data-action="rerun-new-seed" ${stochasticEnabled ? '' : 'disabled'}>Rerun New Seed</button>
        <button class="console-button" data-action="retry">Retry From Briefing</button>
        ${nextActionButtonHtml(state)}
        ${state?.currentScenario?.source === 'tutorial' ? '<button class="console-button" data-action="tutorial-browser">Tutorial Browser</button>' : ''}
      </section>
      <section class="console-section">
        <h2>${escapeHtml(simulationLab ? 'Exports / Audit' : 'Challenge Records')}</h2>
        <button class="console-button" data-action="export-result">Export Result JSON</button>
        <button class="console-button" data-action="export-aar">Export AAR</button>
        <button class="console-button" data-action="export-compare">Export Compare</button>
      </section>
      <section class="console-section">
        <h2>Solver / Comparison</h2>
        <button class="console-button" data-action="temporal-greedy">Simulate Greedy Planner</button>
      </section>
      <section class="console-section">
        <h2>${escapeHtml(simulationLab ? 'Experiment Metrics' : 'Mission Results')}</h2>
        <div class="hud-muted">Planned expected value: ${escapeHtml(summary.expectedSampleScore ?? 'N/A')}</div>
        <div class="hud-muted">Actual / stochastic realized outcome: ${escapeHtml(summary.realizedSampleScore ?? summary.sampleScore ?? 'N/A')}</div>
        ${simulationLab ? `<div class="hud-muted">Regret: ${escapeHtml(result?.regret?.forecastRegret ?? summary.expectedValueRegret ?? 'N/A')}</div>` : ''}
        ${stopReason && stopReason.code !== 'complete' ? `<div class="hud-muted warning">Stop reason: ${escapeHtml(stopReason.title ?? stopReason.code)}</div>` : ''}
        <div class="hud-muted">End condition: ${escapeHtml(endCondition.mode ?? 'none')} | Achieved ${escapeHtml(endCondition.achieved ?? true ? 'yes' : 'no')}</div>
        <div class="hud-muted">Sampling mode: ${escapeHtml(sampling.mode ?? summary.samplingMode ?? 'unique')} | Duplicates ${escapeHtml(summary.duplicateSamples ?? 0)}</div>
        <div class="hud-muted">Gold stars: ${escapeHtml(priorityTargets.captured ?? 0)} / ${escapeHtml(priorityTargets.available ?? 0)} | Star score ${escapeHtml(summary.priorityTargetScore ?? priorityTargets.score ?? 0)}</div>
      </section>
      <section class="console-footer">
        <button class="console-button secondary" data-action="menu">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('debrief');
    this.bind(handlers);
  }

  mainMenuScene() {
    return this.app.phaser?.scene?.getScene('MainMenuScene');
  }

  bindDemoExportControls(handlers = {}) {
    this.root.querySelector('#demo-export-mode')?.addEventListener('change', (event) => {
      handlers.exportSettings?.({ exportMode: event.target.value });
    });
    this.root.querySelector('#demo-export-start')?.addEventListener('change', (event) => {
      handlers.exportSettings?.({ startTimeSeconds: Number(event.target.value) });
    });
    this.root.querySelector('#demo-export-end')?.addEventListener('change', (event) => {
      handlers.exportSettings?.({ endTimeSeconds: Number(event.target.value) });
    });
    this.root.querySelector('#demo-export-frames')?.addEventListener('change', (event) => {
      handlers.exportSettings?.({ frameCount: Number(event.target.value) });
    });
  }

  bind(actions) {
    this.root.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => actions[button.dataset.action]?.());
    });
  }
}

function flowModeLabel(mode) {
  return {
    static: 'Static',
    dynamic: 'Dynamic'
  }[mode] ?? mode;
}

function flowLayerStackHtml(layers) {
  const normalized = normalizeAdditiveLayers(layers);
  if (!normalized.length) {
    return '<div class="hud-muted">No additive layers. Add one to combine another flow behavior with the base field.</div>';
  }
  return normalized.map((layer, index) => flowLayerControlHtml(layer, index)).join('');
}

function flowLayerControlHtml(layer, index) {
  return `
    <div class="flow-layer-card">
      <div class="hud-muted">Layer ${escapeHtml(index + 1)}</div>
      <label class="compact-field">
        Field
        <select data-flow-layer-preset="${escapeAttr(layer.id)}">
        ${FLOW_DEMO_PRESET_CHOICES.map((preset) => {
          const config = getVectorPresetConfig(preset);
          return `<option value="${escapeAttr(preset)}" ${layer.preset === preset ? 'selected' : ''}>${escapeHtml(config.label)}</option>`;
        }).join('')}
        </select>
      </label>
      <label class="compact-field">
        Weight
        <input data-flow-layer-weight="${escapeAttr(layer.id)}" type="range" min="0" max="2" step="0.05" value="${escapeAttr(layer.weight)}" />
      </label>
      <label class="compact-field">
        Influence
        <select data-flow-layer-influence="${escapeAttr(layer.id)}">
          ${FLOW_DEMO_LAYER_INFLUENCES.map((influence) => `<option value="${escapeAttr(influence)}" ${layer.influence === influence ? 'selected' : ''}>${escapeHtml(flowInfluenceLabel(influence))}</option>`).join('')}
        </select>
      </label>
      <label class="compact-field">
        Enabled
        <input data-flow-layer-enabled="${escapeAttr(layer.id)}" type="checkbox" ${layer.enabled ? 'checked' : ''} />
      </label>
      <button type="button" class="console-button secondary" data-flow-layer-remove="${escapeAttr(layer.id)}">Remove Layer</button>
      <div class="hud-muted">${escapeHtml(`${getVectorPresetConfig(layer.preset).label} at ${layer.weight.toFixed(2)}x, ${flowInfluenceLabel(layer.influence)}${layer.enabled ? '' : ' (disabled)'}`)}</div>
    </div>
  `;
}

function flowInfluenceLabel(type) {
  return {
    global: 'Global Blend',
    spatialPocket: 'Spatial Pocket',
    partitionedRegion: 'Partitioned Region'
  }[type] ?? type;
}

function toggleHtml(key, label, checked) {
  return `
    <label class="compact-field">
      ${escapeHtml(label)}
      <input data-coupled-layer="${escapeAttr(key)}" type="checkbox" ${checked ? 'checked' : ''} />
    </label>
  `;
}

function couplingModeLabel(mode) {
  return {
    off: 'Off',
    currentAdvected: 'Current-Advected',
    currentStretched: 'Current-Stretched',
    shorelineRunoff: 'Shoreline Source / Runoff',
    eddyCarried: 'Eddy-Carried'
  }[mode] ?? 'Current-Advected';
}

function variationLabel(level) {
  return {
    off: 'Off',
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[level] ?? 'Medium';
}

function dynamicComplexityLabel(level) {
  return {
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[level] ?? 'High';
}

function evolutionPatternLabel(pattern) {
  return {
    tidalCycle: 'Tidal Cycle',
    meanderingJet: 'Meandering Jet',
    eddyDrift: 'Eddy Drift',
    stormPulse: 'Storm Pulse',
    composite: 'Composite'
  }[pattern] ?? 'Composite';
}

function evolutionBehaviorLabel(behavior) {
  return {
    continuous: 'Continuous',
    looping: 'Looping / Cyclic',
    pulse: 'One-Shot Pulse',
    translating: 'Meandering / Translating'
  }[behavior] ?? 'Continuous';
}

function spatialMotionLabel(motion) {
  return {
    none: 'Off',
    driftEast: 'Drift East',
    driftWest: 'Drift West',
    driftNorth: 'Drift North',
    driftSouth: 'Drift South',
    circularDrift: 'Circular Drift',
    meander: 'Meander'
  }[motion] ?? 'Off';
}

function terrainModeLabel(mode) {
  return {
    blendedCoastal: 'Blended Coastal Map',
    coastIslands: 'Coast + Islands',
    coastalEstuary: 'Coastal Estuary',
    channelIslands: 'Channel + Islands',
    none: 'No Land',
    islands: 'Random Islands',
    coastline: 'Coastline',
    channel: 'Channel',
    bayPocket: 'Bay / Pocket',
    islandChain: 'Island Chain'
  }[mode] ?? mode;
}

function boundaryModeLabel(mode) {
  return {
    none: 'None',
    riskOnly: 'Risk Only',
    dampenIntoLand: 'Dampen Into Land',
    deflectAlongShore: 'Deflect Along Shore'
  }[mode] ?? 'Deflect Along Shore';
}

function roiForecastViewLabel(view) {
  return {
    forecast: 'Forecast',
    truth: 'Truth',
    uncertainty: 'Uncertainty',
    depleted: 'Depleted'
  }[view] ?? 'Forecast';
}

function formatDemoStat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : 'N/A';
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : 'N/A';
}

function roiHelpButtonHtml(groupId, label) {
  return `<button type="button" class="console-button secondary roi-help-button" data-roi-help="${escapeAttr(groupId)}">${escapeHtml(label)}</button>`;
}

function flowHelpButtonHtml(groupId, label) {
  return `<button type="button" class="console-button secondary flow-help-button" data-flow-help="${escapeAttr(groupId)}">${escapeHtml(label)}</button>`;
}

function demoExportControlsHtml(state = {}) {
  const mode = state.exportMode === 'timeWindow' || state.exportMode === 'timeSeries' ? 'timeWindow' : 'currentFrame';
  const start = Number.isFinite(Number(state.exportStartTime)) ? Number(state.exportStartTime) : Number(state.time ?? 0) || 0;
  const end = Number.isFinite(Number(state.exportEndTime)) ? Number(state.exportEndTime) : start;
  const frames = Math.max(1, Math.min(240, Math.round(Number(state.exportFrameCount) || 1)));
  return `
    <label class="compact-field">
      Export Mode
      <select id="demo-export-mode">
        <option value="currentFrame" ${mode === 'currentFrame' ? 'selected' : ''}>Current Frame</option>
        <option value="timeWindow" ${mode === 'timeWindow' ? 'selected' : ''}>Time Window</option>
      </select>
    </label>
    ${mode === 'timeWindow' ? `
    <label class="compact-field">
      Start Time (s)
      <input id="demo-export-start" type="number" min="0" step="1" value="${escapeAttr(formatExportTime(start))}" />
    </label>
    <label class="compact-field">
      End Time (s)
      <input id="demo-export-end" type="number" min="0" step="1" value="${escapeAttr(formatExportTime(end))}" />
    </label>
    <label class="compact-field">
      Timeframes
      <input id="demo-export-frames" type="number" min="1" max="240" step="1" value="${escapeAttr(frames)}" />
    </label>
    <div class="hud-muted">Timeframes are evenly sampled from start to end using the current demo settings. Max 240 frames.</div>
    ` : '<div class="hud-muted">Current Frame exports the field state at the current demo time.</div>'}
  `;
}

function formatExportTime(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function nextActionButtonHtml(state) {
  const source = state?.currentScenario?.source;
  if (source === 'tutorial') return '<button class="console-button" data-action="next-tutorial">Next Tutorial</button>';
  if (source === 'deterministicChallenge' || source === 'stochasticChallenge') return '<button class="console-button" data-action="new-challenge">New Challenge</button>';
  if (source === 'editor') return '<button class="console-button" data-action="editor">Return To Editor</button>';
  return '';
}

function menuActionHtml(action, title, description, tone = '') {
  const classes = ['console-button', 'menu-action-button', tone].filter(Boolean).join(' ');
  return `
    <button data-action="${escapeAttr(action)}" class="${classes}">
      <span>${escapeHtml(title)}</span>
      <small>${escapeHtml(description)}</small>
    </button>
  `;
}

function menuGroupHtml(label, items = []) {
  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return '';
  return `
    <div class="menu-subsection" data-menu-group="${escapeAttr(label)}">
      <h3>${escapeHtml(label)}</h3>
      <div class="menu-subsection-items">
        ${visibleItems.join('')}
      </div>
    </div>
  `;
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

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
