import { CAMPAIGN_LEVELS } from '../core/campaign/CampaignLevels.js';
import { shortInstanceId } from '../core/identity/GameInstanceId.js';
import { formatMetric } from '../core/evaluation/PlanComparison.js';
import { FLOW_DEMO_BOUNDARY_MODES, FLOW_DEMO_CYCLE_DURATIONS, FLOW_DEMO_DYNAMIC_COMPLEXITY_LEVELS, FLOW_DEMO_EVOLUTION_BEHAVIORS, FLOW_DEMO_EVOLUTION_PATTERNS, FLOW_DEMO_EVOLUTION_SPEEDS, FLOW_DEMO_FIELD_MODES, FLOW_DEMO_LAYER_INFLUENCES, FLOW_DEMO_MAGNITUDE_SCALES, FLOW_DEMO_PARTICLE_SPEEDS, FLOW_DEMO_PRESET_CHOICES, FLOW_DEMO_SPATIAL_MOTIONS, FLOW_DEMO_SPATIAL_MOTION_SPEEDS, FLOW_DEMO_TERRAIN_MODES, FLOW_DEMO_VARIATION_LEVELS, normalizeAdditiveLayers } from '../core/demo/FlowFieldDemo.js';
import { ROI_DEMO_DISTRIBUTIONS, ROI_DEMO_SPATIAL_PATTERNS, ROI_DEMO_TEMPORAL_BEHAVIORS, roiDistributionLabel, sampleSpatialPatternLabel, sampleTemporalBehaviorLabel } from '../core/demo/DemoRoiFields.js';
import { SAMPLING_PROCESS_LAB_MENU_LABEL } from '../core/demo/sampling/SamplingProcessTerminology.js';
import { samplingProcessConsoleHtml } from './sampling/SamplingProcessConsoleSections.js';
import { EXPERIENCE_MODES, getExperienceModeDefaults } from '../core/experience/ExperienceMode.js';
import { getVectorPresetConfig } from '../core/generation/VectorFieldPresets.js';
import { UNCERTAINTY_DEMO_OBSERVATION_PATHS, UNCERTAINTY_DEMO_UPDATE_MODELS, UNCERTAINTY_DEMO_VIEW_MODES, UNCERTAINTY_SCENARIO_IDS, forecastModelLabel, observationPathLabel, uncertaintyViewLabel, updateModelLabel } from '../core/demo/UncertaintyForecastDemo.js';
import { SAMPLING_PRIORITY_SCENARIO_IDS, samplingPriorityScenarioLabel } from '../core/demo/samplingPriority/SamplingPriorityScenarios.js';
import { SAMPLING_PRIORITY_METHOD_IDS, samplingPriorityMethodLabel } from '../core/demo/samplingPriority/SamplingPriorityModel.js';
import { SAMPLING_PRIORITY_CANDIDATE_MODES, samplingPriorityCandidateModeLabel } from '../core/demo/samplingPriority/SamplingPriorityCandidates.js';
import { FLOW_COUPLED_SAMPLING_SCENARIO_IDS, flowCoupledSamplingScenarioLabel } from '../core/demo/flowCoupledSampling/FlowCoupledSamplingScenarios.js';
import { GLIDER_ACTION_METHOD_IDS, gliderActionMethodLabel } from '../core/demo/flowCoupledSampling/GliderActionValueModel.js';
import { GLIDER_ACTION_CANDIDATE_MODES, gliderActionCandidateModeLabel } from '../core/demo/flowCoupledSampling/GliderActionCandidates.js';
import { adaptiveBenchmarkPanelHtml } from './benchmark/AdaptiveBenchmarkPanel.js';

export class MissionConsole {
  constructor(app, root) {
    this.app = app;
    this.root = root;
  }

  renderIdle({ status = 'Main Menu', mode = 'Main Menu' } = {}) {
    if (!this.root) return;
    this.root.innerHTML = `
      <section class="console-header main-menu-console-header">
        <div class="console-kicker">Mission Console</div>
        <h1>ANCHOR: Glider Command</h1>
        <p>Scientific AUV/glider adaptive-sampling game and benchmark tool.</p>
      </section>
      <section class="console-status" data-main-menu-console-status>
        <span>${escapeHtml(mode)}</span>
        <strong>${escapeHtml(status)}</strong>
        <small>Choose Challenge Mode, Simulation Lab, or Learning Labs from the main viewport.</small>
      </section>
      <section class="console-section compact-main-menu-console">
        <h2>Context</h2>
        <div class="hud-muted">The full product hub now lives in the simulator viewport. This panel becomes contextual controls after a mode is selected.</div>
        <div class="panel-stack">
          <button data-action="main-menu" class="console-button secondary">Return to Main Menu</button>
          <button data-action="load-json" class="console-button secondary">Import JSON</button>
        </div>
      </section>
    `;
    this.bind({
      'main-menu': () => this.app.phaser?.scene?.start('MainMenuScene'),
      'load-json': () => this.app.phaser?.scene?.start('LoadLevelJsonScene')
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
        <div class="hud-muted">Magnitude Scale changes arrow display length only. Particle Speed is a visual tracer multiplier after sampling F(x,y,t).</div>
      </section>
      <section class="console-status">
        <span>Magnitude Range</span>
        <strong>${escapeHtml(formatDemoStat(state.magnitudeStats?.min))} / ${escapeHtml(formatDemoStat(state.magnitudeStats?.mean))} / ${escapeHtml(formatDemoStat(state.magnitudeStats?.max))}</strong>
        <small>Min / mean / max for the current arrow grid.</small>
      </section>
      ${flowDiagnosticsHtml(state.flowFieldDiagnostics, state.flowFieldModel ?? state.presetMetadata)}
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
    this.root.innerHTML = samplingProcessConsoleHtml(state);
    this.app.applyConsoleAccordions?.('roiDemo', null, { defaultCollapsed: true });

    this.root.querySelector('#sampling-process-mode')?.addEventListener('change', (event) => handlers.processMode?.(event.target.value));
    this.root.querySelector('#roi-demo-pattern-source')?.addEventListener('change', (event) => handlers.patternSource?.(event.target.value));
    this.root.querySelector('#sampling-paint-state')?.addEventListener('change', (event) => handlers.paintSelection?.({ state: event.target.value }));
    this.root.querySelector('#sampling-paint-rule')?.addEventListener('change', (event) => handlers.paintSelection?.({ ruleId: event.target.value }));
    this.root.querySelector('#sampling-paint-group')?.addEventListener('input', (event) => handlers.paintSelection?.({ groupId: Number(event.target.value) }));
    this.root.querySelector('#sampling-paint-group')?.addEventListener('change', (event) => handlers.paintSelection?.({ groupId: Number(event.target.value) }));
    this.root.querySelector('#sampling-paint-source')?.addEventListener('input', (event) => handlers.paintSelection?.({ sourceValue: Number(event.target.value) }));
    this.root.querySelector('#sampling-paint-source')?.addEventListener('change', (event) => handlers.paintSelection?.({ sourceValue: Number(event.target.value) }));
    this.root.querySelector('[data-action="sampling-paint-assign"]')?.addEventListener('click', () => handlers.paintSelectedCell?.(this.paintSelectionFromControls()));
    this.root.querySelector('[data-action="sampling-paint-clear"]')?.addEventListener('click', () => handlers.clearPaintCell?.());
    this.root.querySelector('[data-action="sampling-paint-reset"]')?.addEventListener('click', () => handlers.clearPaintCanvas?.());
    this.root.querySelector('[data-action="sampling-paint-randomize"]')?.addEventListener('click', () => handlers.randomizeProcessAllocation?.({ keepProcessPaint: true }));
    this.root.querySelector('[data-action="sampling-paint-run"]')?.addEventListener('click', () => handlers.runProcessPaint?.());
    this.root.querySelector('[data-action="sampling-paint-export"]')?.addEventListener('click', () => handlers.exportProcessRecipe?.());
    this.root.querySelector('#sampling-random-seed')?.addEventListener('change', (event) => handlers.randomizeProcessAllocation?.({ seed: event.target.value }));
    this.root.querySelector('#sampling-random-mode')?.addEventListener('change', (event) => handlers.randomizeProcessAllocation?.({ mode: event.target.value }));
    this.root.querySelector('#sampling-random-groups')?.addEventListener('change', (event) => handlers.randomizeProcessAllocation?.({ groupCount: Number(event.target.value) }));
    this.root.querySelector('#sampling-random-density')?.addEventListener('change', (event) => handlers.randomizeProcessAllocation?.({ activeFraction: Number(event.target.value) }));
    this.root.querySelector('[data-action="sampling-random-generate"]')?.addEventListener('click', () => handlers.randomizeProcessAllocation?.({}));
    this.root.querySelector('#roi-demo-behavior-preset')?.addEventListener('change', (event) => handlers.behaviorPreset?.(event.target.value));
    this.root.querySelector('#sampling-process-example-id')?.addEventListener('input', (event) => handlers.processExample?.(event.target.value));
    this.root.querySelector('#sampling-process-example-id')?.addEventListener('change', (event) => handlers.processExample?.(event.target.value));
    this.root.querySelector('#sampling-initial-condition-mode')?.addEventListener('change', (event) => handlers.initialConditionMode?.(event.target.value));
    this.root.querySelector('#sampling-initial-condition-fixture')?.addEventListener('change', (event) => handlers.initialConditionFixture?.(event.target.value));
    this.root.querySelector('#sampling-initial-condition-brush')?.addEventListener('change', (event) => handlers.initialConditionBrush?.(event.target.value));
    this.root.querySelector('[data-action="sampling-clear-initial-condition-edits"]')?.addEventListener('click', () => handlers.clearInitialConditionEdits?.());
    this.root.querySelector('#roi-demo-reference-signature')?.addEventListener('change', (event) => handlers.referenceSignature?.(event.target.value));
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
    this.root.querySelector('#roi-demo-interaction-scale')?.addEventListener('change', (event) => handlers.interactionScale?.(event.target.value));
    this.root.querySelector('#roi-demo-state-model')?.addEventListener('change', (event) => handlers.stateModel?.(event.target.value));
    this.root.querySelector('#roi-demo-dynamic-complexity')?.addEventListener('change', (event) => handlers.dynamicComplexity?.(event.target.value));
    this.root.querySelector('#roi-demo-depletion-mode')?.addEventListener('change', (event) => handlers.depletionMode?.(event.target.value));
    this.root.querySelector('#roi-demo-display-mode')?.addEventListener('change', (event) => handlers.displayMode?.(event.target.value));
    this.root.querySelectorAll('[data-roi-node-state-filter]').forEach((input) => {
      input.addEventListener('change', (event) => handlers.viewFilters?.({ nodeStates: { [event.currentTarget.dataset.roiNodeStateFilter]: event.currentTarget.checked } }));
    });
    this.root.querySelector('#roi-filter-transition-only')?.addEventListener('change', (event) => handlers.viewFilters?.({ transitionNodesOnly: event.target.checked }));
    this.root.querySelector('#roi-filter-fade-inactive')?.addEventListener('change', (event) => handlers.viewFilters?.({ fadeInactiveNodes: event.target.checked }));
    this.root.querySelector('#roi-filter-topology-edges')?.addEventListener('change', (event) => handlers.viewFilters?.({ showTopologyEdges: event.target.checked }));
    this.root.querySelector('#roi-filter-message-edges')?.addEventListener('change', (event) => handlers.viewFilters?.({ showActiveMessageEdges: event.target.checked }));
    this.root.querySelector('#roi-filter-message-threshold')?.addEventListener('change', (event) => handlers.viewFilters?.({ messageStrengthThreshold: Number(event.target.value) }));
    this.root.querySelector('#roi-filter-max-messages')?.addEventListener('change', (event) => handlers.viewFilters?.({ maxMessages: Number(event.target.value) }));
    this.root.querySelector('#roi-filter-top-messages')?.addEventListener('change', (event) => handlers.viewFilters?.({ showTopMessagesOnly: event.target.checked }));
    this.root.querySelectorAll('[data-roi-message-type-filter]').forEach((input) => {
      input.addEventListener('change', (event) => handlers.viewFilters?.({ messageTypes: { [event.currentTarget.dataset.roiMessageTypeFilter]: event.currentTarget.checked } }));
    });
    this.root.querySelector('#roi-filter-same-community')?.addEventListener('change', (event) => handlers.viewFilters?.({ sameCommunity: event.target.checked }));
    this.root.querySelector('#roi-filter-cross-community')?.addEventListener('change', (event) => handlers.viewFilters?.({ crossCommunity: event.target.checked }));
    this.root.querySelector('#roi-filter-incoming-selected')?.addEventListener('change', (event) => handlers.viewFilters?.({ incomingToSelected: event.target.checked }));
    this.root.querySelector('#roi-filter-outgoing-selected')?.addEventListener('change', (event) => handlers.viewFilters?.({ outgoingFromSelected: event.target.checked }));
    this.root.querySelector('#roi-filter-neighborhood')?.addEventListener('change', (event) => handlers.viewFilters?.({ selectedNeighborhood: event.target.checked }));
    this.root.querySelector('#roi-filter-meaning-layer')?.addEventListener('change', (event) => handlers.viewFilters?.({ roiMeaningLayer: event.target.value }));
    this.root.querySelector('#roi-demo-time-speed')?.addEventListener('change', (event) => handlers.timeSpeedScale?.(event.target.value));
    this.root.querySelector('#sampling-process-tick-rate')?.addEventListener('change', (event) => handlers.tickRate?.(event.target.value));
    this.root.querySelector('#roi-scenario-source')?.addEventListener('change', (event) => handlers.scenarioSettings?.({ sourceMode: event.target.value }, { render: false }));
    this.root.querySelector('#roi-scenario-seed')?.addEventListener('change', (event) => handlers.scenarioSettings?.({ seed: event.target.value }, { render: false }));
    this.root.querySelector('#roi-scenario-difficulty')?.addEventListener('change', (event) => handlers.scenarioSettings?.({ difficulty: event.target.value }, { render: false }));
    this.root.querySelector('#roi-scenario-duration')?.addEventListener('change', (event) => handlers.scenarioSettings?.({ duration: Number(event.target.value) }, { render: false }));
    this.root.querySelector('#roi-scenario-frame-count')?.addEventListener('change', (event) => handlers.scenarioSettings?.({ frameCount: Number(event.target.value) }, { render: false }));
    this.root.querySelector('#roi-scenario-validation-mode')?.addEventListener('change', (event) => handlers.scenarioSettings?.({ validationMode: event.target.value }, { render: false }));
    this.root.querySelectorAll('[data-roi-help]').forEach((button) => {
      button.addEventListener('click', () => handlers.behaviorHelp?.(button.dataset.roiHelp));
    });
    this.bindDemoExportControls(handlers);
    this.bind({
      regenerate: handlers.regenerate,
      'roi-compare-temporal': () => handlers.compareComponent?.('temporalPatterns'),
      'roi-compare-evolution': () => handlers.compareComponent?.('spatialEvolution'),
      'roi-compare-scale': () => handlers.compareComponent?.('interactionScale'),
      'generate-roi-scenario': handlers.generateScenario,
      'sampling-step-generation': handlers.stepGeneration,
      'export-demo-json': handlers.exportDemoJson,
      'export-roi-scenario': handlers.exportScenarioJson,
      menu: handlers.menu
    });
  }

  paintSelectionFromControls() {
    return {
      state: this.root?.querySelector('#sampling-paint-state')?.value,
      ruleId: this.root?.querySelector('#sampling-paint-rule')?.value,
      groupId: Number(this.root?.querySelector('#sampling-paint-group')?.value),
      sourceValue: Number(this.root?.querySelector('#sampling-paint-source')?.value)
    };
  }

  renderCoupledFieldsDemoControls(state = {}, handlers = {}) {
    if (!this.root) return;
    const couplingModes = ['off', 'currentAdvected', 'currentStretched', 'shorelineRunoff', 'eddyCarried'];
    const forecastViews = ['forecast', 'truth', 'uncertainty', 'depleted'];
    const layerToggles = state.layerToggles ?? {};
    const processEngineOptions = state.processEngineOptions ?? [];
    const displayLayerOptions = state.displayLayerOptions ?? [];
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
        <label class="compact-field">
          Display Layer
          <select id="coupled-display-layer">
            ${displayLayerOptions.map((layer) => `<option value="${escapeAttr(layer.id)}" ${state.displayLayer === layer.id ? 'selected' : ''}>${escapeHtml(layer.label)}</option>`).join('')}
          </select>
        </label>
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
        <h2>Process Engine</h2>
        <label class="compact-field">
          Process Engine
          <select id="coupled-process-engine">
            ${processEngineOptions.map((engine) => `<option value="${escapeAttr(engine.id)}" ${state.processEngineId === engine.id ? 'selected' : ''}>${escapeHtml(engine.label)}</option>`).join('')}
          </select>
        </label>
        <div class="hud-muted">${escapeHtml(state.processEngine?.inWords ?? 'Known process fields are updated deterministically before the oracle objective is computed.')}</div>
        <div class="hud-muted">Equation: ${escapeHtml(state.processEngine?.equation ?? 'n/a')}</div>
        <div class="hud-muted">What this is not: ${escapeHtml(state.processEngine?.notA ?? 'Not a calibrated ocean forecast or uncertainty model.')}</div>
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
    this.root.querySelector('#coupled-display-layer')?.addEventListener('change', (event) => handlers.displayLayer?.(event.target.value));
    this.root.querySelector('#coupled-process-engine')?.addEventListener('change', (event) => handlers.processEngineId?.(event.target.value));
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
        <p>Explore hidden truth, forecast, noisy observations, belief, surprise, forecast error, hidden-event suspicion, and sampling-priority preview.</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(state.status ?? 'Expected-State Uncertainty layer')}</span>
        <strong>${escapeHtml(state.paused ? 'Paused' : 'Animating')}</strong>
        <small>${escapeHtml(`${state.scenarioLabel ?? forecastModelLabel(state.scenarioId)} | ${state.updateModelLabel ?? updateModelLabel(state.updateModel)} | Observations ${state.observationCount ?? 0}`)}</small>
      </section>
      <section class="console-section">
        <h2>Scenario</h2>
        <label class="compact-field">
          Scenario
          <select id="uncertainty-demo-scenario">
            ${UNCERTAINTY_SCENARIO_IDS.map((scenario) => `<option value="${escapeAttr(scenario)}" ${state.scenarioId === scenario ? 'selected' : ''}>${escapeHtml(forecastModelLabel(scenario))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Seed
          <input id="uncertainty-demo-seed" type="text" value="${escapeAttr(state.seed ?? 'anchor-uncertainty-demo')}" />
        </label>
        <div class="hud-muted">${escapeHtml(state.scenarioNote ?? 'Synthetic educational scenario, not a calibrated ocean forecast.')}</div>
      </section>
      <section class="console-section">
        <h2>View Layer</h2>
        <label class="compact-field">
          View
          <select id="uncertainty-demo-view">
            ${UNCERTAINTY_DEMO_VIEW_MODES.map((view) => `<option value="${escapeAttr(view)}" ${state.viewMode === view ? 'selected' : ''}>${escapeHtml(uncertaintyViewLabel(view))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field checkbox-field">
          <input id="uncertainty-demo-reveal-truth" type="checkbox" ${state.revealTruth ? 'checked' : ''} />
          Reveal Truth
        </label>
        <div class="hud-muted">${escapeHtml(state.layerCaption ?? 'Layer caption unavailable.')}</div>
      </section>
      <section class="console-section">
        <h2>Observations</h2>
        <label class="compact-field">
          Sensor Noise
          <input id="uncertainty-demo-sensor-noise" type="number" min="0" max="0.6" step="0.01" value="${escapeAttr(state.sensorNoise ?? 0.08)}" />
        </label>
        <label class="compact-field">
          Sample Count
          <input id="uncertainty-demo-sample-count" type="number" min="1" max="32" step="1" value="${escapeAttr(state.sampleCount ?? 8)}" />
        </label>
        <label class="compact-field">
          Observation Path
          <select id="uncertainty-demo-observation-path">
            ${UNCERTAINTY_DEMO_OBSERVATION_PATHS.map((path) => `<option value="${escapeAttr(path)}" ${state.observationPath === path ? 'selected' : ''}>${escapeHtml(observationPathLabel(path))}</option>`).join('')}
          </select>
        </label>
        <button data-action="uncertainty-add-samples" class="console-button">Add Samples</button>
        <button data-action="uncertainty-reset-observations" class="console-button secondary">Reset Observations</button>
        <div class="hud-muted">Samples are noisy observations z_i = T(x_i,y_i,t_i) + epsilon_i. Clicking the map also adds one sample.</div>
      </section>
      <section class="console-section">
        <h2>Belief Update</h2>
        <label class="compact-field">
          Update Model
          <select id="uncertainty-demo-update-model">
            ${UNCERTAINTY_DEMO_UPDATE_MODELS.map((model) => `<option value="${escapeAttr(model)}" ${state.updateModel === model ? 'selected' : ''}>${escapeHtml(updateModelLabel(model))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Length Scale
          <input id="uncertainty-demo-length-scale" type="number" min="0.5" max="8" step="0.1" value="${escapeAttr(state.lengthScale ?? 2.6)}" />
        </label>
        <label class="compact-field">
          Staleness Rate
          <input id="uncertainty-demo-staleness-rate" type="number" min="0" max="0.08" step="0.002" value="${escapeAttr(state.stalenessRate ?? 0.012)}" />
        </label>
        <button data-action="uncertainty-update-belief" class="console-button">Update Belief</button>
        <div class="hud-muted">Kernel smoother / Bayesian-lite educational update, not a production GP, GMRF, Kalman, EnKF, or calibrated data-assimilation system.</div>
      </section>
      <section class="console-status">
        <span>Diagnosis</span>
        <strong>${escapeHtml(state.diagnostics?.primaryDiagnosis ?? 'insufficientEvidence')}</strong>
        <small>${escapeHtml(`forecast error ${formatDemoStat(state.diagnostics?.forecastErrorScore)} | hidden-event ${formatDemoStat(state.diagnostics?.hiddenEventConfidence)} | false-alarm ${formatDemoStat(state.diagnostics?.noiseFalseAlarmRisk)}`)}</small>
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
        <small>${escapeHtml(state.viewModeLabel ?? uncertaintyViewLabel(state.viewMode))} | Sampling priority is not event intensity.</small>
      </section>
      <section class="console-section">
        <h2>Data Export</h2>
        ${demoExportControlsHtml(state)}
        <button data-action="export-demo-json" class="console-button">Export Demo JSON</button>
        <div class="hud-muted">Exports uncertaintyModel, observationModel, beliefState, diagnostics, fields, observations, and legacy aliases.</div>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('uncertaintyForecastDemo');
    this.root.querySelector('#uncertainty-demo-scenario')?.addEventListener('change', (event) => handlers.scenarioId?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-view')?.addEventListener('change', (event) => handlers.viewMode?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-seed')?.addEventListener('change', (event) => handlers.seed?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-update-model')?.addEventListener('change', (event) => handlers.updateModel?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-sensor-noise')?.addEventListener('change', (event) => handlers.sensorNoise?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-sample-count')?.addEventListener('change', (event) => handlers.sampleCount?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-observation-path')?.addEventListener('change', (event) => handlers.observationPath?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-length-scale')?.addEventListener('change', (event) => handlers.lengthScale?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-staleness-rate')?.addEventListener('change', (event) => handlers.stalenessRate?.(event.target.value));
    this.root.querySelector('#uncertainty-demo-reveal-truth')?.addEventListener('change', (event) => handlers.revealTruth?.(event.target.checked));
    this.root.querySelector('#uncertainty-demo-playback-speed')?.addEventListener('change', (event) => handlers.playbackSpeedScale?.(event.target.value));
    this.bindDemoExportControls(handlers);
    this.bind({
      'uncertainty-add-samples': handlers.addSamples,
      'uncertainty-update-belief': handlers.updateBelief,
      'uncertainty-reset-observations': handlers.resetObservations,
      'export-demo-json': handlers.exportDemoJson,
      menu: handlers.menu
    });
  }
  renderSamplingPriorityDemoControls(state = {}, handlers = {}) {
    if (!this.root) return;
    const weights = state.weights ?? {};
    const topCandidates = (state.candidateSamplePoints ?? []).slice(0, 3);
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Sampling Priority / Acquisition Demo</div>
        <h1>${escapeHtml(state.title ?? 'Sampling Priority Demo')}</h1>
        <p>Explore global sampling usefulness A_global(x,y,t) before route planning.</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(state.status ?? 'Sampling Priority layer')}</span>
        <strong>${escapeHtml(state.methodLabel ?? samplingPriorityMethodLabel(state.methodId))}</strong>
        <small>Event intensity is not sampling priority. This is not route planning or flow-coupled action value.</small>
      </section>
      <section class="console-section">
        <h2>Scenario</h2>
        <label class="compact-field">
          Scenario
          <select id="sampling-priority-scenario">
            ${SAMPLING_PRIORITY_SCENARIO_IDS.map((scenario) => `<option value="${escapeAttr(scenario)}" ${state.scenarioId === scenario ? 'selected' : ''}>${escapeHtml(samplingPriorityScenarioLabel(scenario))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Seed
          <input id="sampling-priority-seed" type="text" value="${escapeAttr(state.seed ?? 'anchor-sampling-priority-demo')}" />
        </label>
        <label class="compact-field">
          Mission Objective Preset
          <select id="sampling-priority-objective-preset">
            ${['balancedScience', 'mappingFronts', 'validateForecast', 'hiddenEventFollowup', 'revisitMonitoring'].map((preset) => `<option value="${escapeAttr(preset)}" ${state.missionObjectivePreset === preset ? 'selected' : ''}>${escapeHtml(samplingPriorityObjectivePresetLabel(preset))}</option>`).join('')}
          </select>
        </label>
        <div class="hud-muted">${escapeHtml(state.scenarioNote ?? 'Synthetic educational scenario, not a calibrated ocean forecast.')}</div>
      </section>
      <section class="console-section">
        <h2>Sampling Selection</h2>
        <label class="compact-field">
          Sampling Method
          <select id="sampling-priority-method">
            ${SAMPLING_PRIORITY_METHOD_IDS.map((method) => `<option value="${escapeAttr(method)}" ${state.methodId === method ? 'selected' : ''}>${escapeHtml(samplingPriorityMethodLabel(method))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Candidate Mode
          <select id="sampling-priority-candidate-mode">
            ${SAMPLING_PRIORITY_CANDIDATE_MODES.map((mode) => `<option value="${escapeAttr(mode)}" ${state.candidateMode === mode ? 'selected' : ''}>${escapeHtml(samplingPriorityCandidateModeLabel(mode))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Candidate Count
          <input id="sampling-priority-candidate-count" type="number" min="1" max="16" step="1" value="${escapeAttr(state.candidateCount ?? 6)}" />
        </label>
        <label class="compact-field">
          Minimum Distance
          <input id="sampling-priority-min-distance" type="number" min="1" max="8" step="0.5" value="${escapeAttr(state.minDistance ?? 3)}" />
        </label>
        <div class="hud-muted">Candidate sample points are derived from the priority field. They are not assigned to vehicles and do not include travel cost or current risk.</div>
      </section>
      <section class="console-section">
        <h2>View Layer</h2>
        <label class="compact-field">
          View Layer
          <select id="sampling-priority-view">
            ${samplingPriorityViewLayerOptions().map((layer) => `<option value="${escapeAttr(layer.id)}" ${state.viewLayer === layer.id ? 'selected' : ''}>${escapeHtml(layer.label)}</option>`).join('')}
          </select>
        </label>
        <div class="hud-muted">${escapeHtml(state.viewLayerCaption ?? 'High value means more of the selected sampling-priority layer.')}</div>
      </section>
      <section class="console-section">
        <h2>Advanced Weights</h2>
        <details>
          <summary>Component weights and method parameters</summary>
          ${samplingPriorityWeightInputHtml('value', 'Value', weights.value)}
          ${samplingPriorityWeightInputHtml('uncertainty', 'Uncertainty', weights.uncertainty)}
          ${samplingPriorityWeightInputHtml('boundary', 'Boundary', weights.boundary)}
          ${samplingPriorityWeightInputHtml('forecast', 'Forecast validation', weights.forecast)}
          ${samplingPriorityWeightInputHtml('unknown', 'Hidden event', weights.unknown)}
          ${samplingPriorityWeightInputHtml('staleness', 'Staleness', weights.staleness)}
          ${samplingPriorityWeightInputHtml('hazard', 'Hazard penalty', weights.hazard)}
          ${samplingPriorityWeightInputHtml('redundancy', 'Redundancy penalty', weights.redundancy)}
          <label class="compact-field">
            Threshold
            <input id="sampling-priority-threshold" type="number" min="0.05" max="0.95" step="0.05" value="${escapeAttr(state.threshold ?? 0.5)}" />
          </label>
          <label class="compact-field">
            UCB Beta
            <input id="sampling-priority-beta" type="number" min="0" max="3" step="0.05" value="${escapeAttr(state.beta ?? 0.65)}" />
          </label>
          <div class="hud-muted">Travel cost, current risk, route feasibility, and vehicle energy are disabled here. Later: Flow-Coupled Action Value.</div>
        </details>
      </section>
      <section class="console-status">
        <span>Candidate Rationale</span>
        <strong>${escapeHtml(topCandidates.map((candidate) => `#${candidate.id?.replace('candidate-', '') ?? '?'} ${candidate.reason}`).join(' | ') || 'No candidates')}</strong>
        <small>Top candidates are scientifically useful sample locations, not glider commands.</small>
      </section>
      <section class="console-status">
        <span>Layer Stats</span>
        <strong>Max ${escapeHtml(formatDemoStat(state.stats?.max))} | Mean ${escapeHtml(formatDemoStat(state.stats?.mean))}</strong>
        <small>Validation: ${escapeHtml(state.validation?.status ?? 'n/a')} | Educational acquisition model, not a production GP/GMRF planner.</small>
      </section>
      <section class="console-section">
        <h2>Data Export</h2>
        ${demoExportControlsHtml(state)}
        <button data-action="export-demo-json" class="console-button">Export Demo JSON</button>
        <button data-action="sampling-priority-reset" class="console-button secondary">Reset</button>
        <div class="hud-muted">Exports samplingPriorityModel, fields, candidateSamplePoints, and priorityDiagnostics.</div>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('samplingPriorityDemo');
    this.root.querySelector('#sampling-priority-scenario')?.addEventListener('change', (event) => handlers.scenarioId?.(event.target.value));
    this.root.querySelector('#sampling-priority-method')?.addEventListener('change', (event) => handlers.methodId?.(event.target.value));
    this.root.querySelector('#sampling-priority-view')?.addEventListener('change', (event) => handlers.viewLayer?.(event.target.value));
    this.root.querySelector('#sampling-priority-candidate-mode')?.addEventListener('change', (event) => handlers.candidateMode?.(event.target.value));
    this.root.querySelector('#sampling-priority-candidate-count')?.addEventListener('change', (event) => handlers.candidateCount?.(event.target.value));
    this.root.querySelector('#sampling-priority-min-distance')?.addEventListener('change', (event) => handlers.minDistance?.(event.target.value));
    this.root.querySelector('#sampling-priority-threshold')?.addEventListener('change', (event) => handlers.threshold?.(event.target.value));
    this.root.querySelector('#sampling-priority-beta')?.addEventListener('change', (event) => handlers.beta?.(event.target.value));
    this.root.querySelector('#sampling-priority-seed')?.addEventListener('change', (event) => handlers.seed?.(event.target.value));
    this.root.querySelector('#sampling-priority-objective-preset')?.addEventListener('change', (event) => handlers.objectivePreset?.(event.target.value));
    this.root.querySelectorAll('[data-sampling-priority-weight]').forEach((input) => {
      input.addEventListener('change', (event) => handlers.weight?.(event.currentTarget.dataset.samplingPriorityWeight, event.target.value));
    });
    this.bindDemoExportControls(handlers);
    this.bind({
      'sampling-priority-reset': handlers.reset,
      'export-demo-json': handlers.exportDemoJson,
      menu: handlers.menu
    });
  }
  renderFlowCoupledSamplingDemoControls(state = {}, handlers = {}) {
    if (!this.root) return;
    const weights = state.weights ?? {};
    const topCandidates = (state.candidateTargets ?? []).slice(0, 3);
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Flow-Coupled Sampling / Glider Action Value</div>
        <h1>${escapeHtml(state.title ?? 'Flow-Coupled Sampling Demo')}</h1>
        <p>Evaluate glider-specific action value Q_glider(g,x,y,t) after currents, reachability, energy, timing, hazards, and redundancy.</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(state.status ?? 'Glider Action Value layer')}</span>
        <strong>${escapeHtml(state.methodLabel ?? gliderActionMethodLabel(state.methodId))}</strong>
        <small>Science priority is not action value. Educational flow-coupled action-value model, not full route planning.</small>
      </section>
      <section class="console-section">
        <h2>Scenario</h2>
        <label class="compact-field">
          Scenario
          <select id="flow-coupled-sampling-scenario">
            ${FLOW_COUPLED_SAMPLING_SCENARIO_IDS.map((scenario) => `<option value="${escapeAttr(scenario)}" ${state.scenarioId === scenario ? 'selected' : ''}>${escapeHtml(flowCoupledSamplingScenarioLabel(scenario))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Seed
          <input id="flow-coupled-sampling-seed" type="text" value="${escapeAttr(state.seed ?? 'anchor-flow-coupled-sampling-demo')}" />
        </label>
        <div class="hud-muted">${escapeHtml(state.scenarioNote ?? 'Synthetic educational scenario, not a calibrated glider mission or ocean forecast.')}</div>
      </section>
      <section class="console-section">
        <h2>Glider State</h2>
        <label class="compact-field">
          Selected Glider
          <select id="flow-coupled-sampling-glider">
            ${(state.gliders ?? []).map((glider) => `<option value="${escapeAttr(glider.id)}" ${state.selectedGliderId === glider.id ? 'selected' : ''}>${escapeHtml(glider.label ?? glider.id)}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Glider Speed
          <input id="flow-coupled-sampling-speed" type="number" min="0.2" max="5" step="0.05" value="${escapeAttr(formatDemoStat(state.gliderSpeed ?? 2))}" />
        </label>
        <label class="compact-field">
          Time Budget
          <input id="flow-coupled-sampling-time-budget" type="number" min="1" max="30" step="0.5" value="${escapeAttr(formatDemoStat(state.timeBudget ?? 12))}" />
        </label>
        <label class="compact-field">
          Energy Budget
          <input id="flow-coupled-sampling-energy-budget" type="number" min="0.05" max="1" step="0.01" value="${escapeAttr(formatDemoStat(state.energyBudget ?? 0.82))}" />
        </label>
      </section>
      <section class="console-section">
        <h2>Action Selection</h2>
        <label class="compact-field">
          Action Method
          <select id="flow-coupled-sampling-method">
            ${GLIDER_ACTION_METHOD_IDS.map((method) => `<option value="${escapeAttr(method)}" ${state.methodId === method ? 'selected' : ''}>${escapeHtml(gliderActionMethodLabel(method))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Candidate Mode
          <select id="flow-coupled-sampling-candidate-mode">
            ${GLIDER_ACTION_CANDIDATE_MODES.map((mode) => `<option value="${escapeAttr(mode)}" ${state.candidateMode === mode ? 'selected' : ''}>${escapeHtml(gliderActionCandidateModeLabel(mode))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Candidate Count
          <input id="flow-coupled-sampling-candidate-count" type="number" min="1" max="16" step="1" value="${escapeAttr(state.candidateCount ?? 6)}" />
        </label>
        <label class="compact-field">
          Diversity Radius
          <input id="flow-coupled-sampling-min-distance" type="number" min="1" max="8" step="0.5" value="${escapeAttr(state.minDistance ?? 3)}" />
        </label>
        <div class="hud-muted">Candidate targets are one-leg direct actions. They are not route plans or waypoint optimizations.</div>
      </section>
      <section class="console-section">
        <h2>View Layer</h2>
        <label class="compact-field">
          View Layer
          <select id="flow-coupled-sampling-view">
            ${flowCoupledSamplingViewLayerOptions().map((layer) => `<option value="${escapeAttr(layer.id)}" ${state.viewLayer === layer.id ? 'selected' : ''}>${escapeHtml(layer.label)}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field checkbox-field">
          <input id="flow-coupled-sampling-flow-arrows" type="checkbox" ${state.showFlowArrows === false ? '' : 'checked'} />
          Show flow arrows
        </label>
        <div class="hud-muted">${escapeHtml(state.viewLayerCaption ?? 'High value means more of the selected action-value layer.')}</div>
      </section>
      <section class="console-section">
        <h2>Advanced Weights</h2>
        <details>
          <summary>Formula weights</summary>
          ${flowCoupledSamplingWeightInputHtml('priority', 'A_global priority', weights.priority)}
          ${flowCoupledSamplingWeightInputHtml('future', 'Future priority', weights.future)}
          ${flowCoupledSamplingWeightInputHtml('assist', 'Current assist', weights.assist)}
          ${flowCoupledSamplingWeightInputHtml('distance', 'Travel distance', weights.distance)}
          ${flowCoupledSamplingWeightInputHtml('time', 'Arrival time', weights.time)}
          ${flowCoupledSamplingWeightInputHtml('energy', 'Energy cost', weights.energy)}
          ${flowCoupledSamplingWeightInputHtml('current', 'Current opposition', weights.current)}
          ${flowCoupledSamplingWeightInputHtml('cross', 'Cross-current risk', weights.cross)}
          ${flowCoupledSamplingWeightInputHtml('hazard', 'Hazard penalty', weights.hazard)}
          ${flowCoupledSamplingWeightInputHtml('window', 'Missed window', weights.window)}
          ${flowCoupledSamplingWeightInputHtml('redundancy', 'Redundancy penalty', weights.redundancy)}
        </details>
      </section>
      <section class="console-status">
        <span>Candidate Rationale</span>
        <strong>${escapeHtml(topCandidates.map((candidate) => `#${candidate.id?.replace('candidate-', '') ?? '?'} ${candidate.reason}`).join(' | ') || 'No candidates')}</strong>
        <small>Top targets are ranked for ${escapeHtml(state.selectedGliderId ?? 'the selected glider')}.</small>
      </section>
      <section class="console-status">
        <span>Layer Stats</span>
        <strong>Max ${escapeHtml(formatDemoStat(state.stats?.max))} | Mean ${escapeHtml(formatDemoStat(state.stats?.mean))}</strong>
        <small>Validation: ${escapeHtml(state.validation?.status ?? 'n/a')} | Not mission scoring or a production vehicle controller.</small>
      </section>
      <section class="console-section">
        <h2>Data Export</h2>
        ${demoExportControlsHtml(state)}
        <button data-action="export-demo-json" class="console-button">Export Demo JSON</button>
        <button data-action="flow-coupled-sampling-reset" class="console-button secondary">Reset</button>
        <div class="hud-muted">Exports flowCoupledSamplingModel, gliderActionContext, fields, candidateTargets, and actionValueDiagnostics.</div>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('flowCoupledSamplingDemo');
    this.root.querySelector('#flow-coupled-sampling-scenario')?.addEventListener('change', (event) => handlers.scenarioId?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-method')?.addEventListener('change', (event) => handlers.methodId?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-view')?.addEventListener('change', (event) => handlers.viewLayer?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-candidate-mode')?.addEventListener('change', (event) => handlers.candidateMode?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-candidate-count')?.addEventListener('change', (event) => handlers.candidateCount?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-min-distance')?.addEventListener('change', (event) => handlers.minDistance?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-glider')?.addEventListener('change', (event) => handlers.selectedGliderId?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-speed')?.addEventListener('change', (event) => handlers.gliderSpeed?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-time-budget')?.addEventListener('change', (event) => handlers.timeBudget?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-energy-budget')?.addEventListener('change', (event) => handlers.energyBudget?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-seed')?.addEventListener('change', (event) => handlers.seed?.(event.target.value));
    this.root.querySelector('#flow-coupled-sampling-flow-arrows')?.addEventListener('change', (event) => handlers.showFlowArrows?.(event.target.checked));
    this.root.querySelectorAll('[data-flow-coupled-sampling-weight]').forEach((input) => {
      input.addEventListener('change', (event) => handlers.weight?.(event.currentTarget.dataset.flowCoupledSamplingWeight, event.target.value));
    });
    this.bindDemoExportControls(handlers);
    this.bind({
      'flow-coupled-sampling-reset': handlers.reset,
      'export-demo-json': handlers.exportDemoJson,
      menu: handlers.menu
    });
  }
  renderMotionPlanningDemoControls(state = {}, handlers = {}) {
    if (!this.root) return;
    const motionModels = ['kinematicVectorField', 'depthLayerKinematic', 'currentShearKinematic', 'bathymetryAwareKinematic', 'fluidCoupledPreview'];
    const diveProfiles = ['surfaceOnly', 'sawtoothProfile', 'thermoclineDive', 'deepDive', 'fullProfile'];
    const summary = state.summary ?? {};
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Motion Planning Demo</div>
        <h1>${escapeHtml(state.title ?? 'Motion Planning Demo')}</h1>
        <p>Path planning chooses waypoints. Motion planning evaluates how the glider actually moves through currents and control limits.</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(state.status ?? 'Motion trace ready')}</span>
        <strong>${escapeHtml(state.motionModelId ?? 'depthLayerKinematic')}</strong>
        <small>Motion dynamics does not generate a route.</small>
      </section>
      <section class="console-section">
        <h2>Motion Model</h2>
        <label class="compact-field">
          Motion Model
          <select id="motion-demo-model">
            ${motionModels.map((id) => `<option value="${escapeAttr(id)}" ${state.motionModelId === id ? 'selected' : ''}>${escapeHtml(motionModelLabel(id))}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Dive Profile
          <select id="motion-demo-dive-profile">
            ${diveProfiles.map((id) => `<option value="${escapeAttr(id)}" ${state.diveProfileId === id ? 'selected' : ''}>${escapeHtml(motionModelLabel(id))}</option>`).join('')}
          </select>
        </label>
        <div class="hud-muted">WebGPU fluid coupling is future/optional and not used in this demo.</div>
      </section>
      <section class="console-section">
        <h2>Environment / Control</h2>
        ${motionNumberInputHtml('current-strength', 'Current Strength', state.currentStrength, 0, 3, 0.1)}
        ${motionNumberInputHtml('cross-current-strength', 'Cross-Current Strength', state.crossCurrentStrength, 0, 3, 0.1)}
        ${motionNumberInputHtml('glider-speed', 'Glider Speed', state.gliderSpeed, 0.25, 3, 0.05)}
        ${motionNumberInputHtml('heading-rate-limit', 'Heading Rate Limit', state.headingRateLimit, 1, 45, 1)}
        ${motionNumberInputHtml('drift-gain', 'Drift Gain', state.driftGain, 0, 3, 0.1)}
      </section>
      <section class="console-section">
        <h2>Planned vs Realized</h2>
        <div class="cell-inspector-metrics">
          <div><span>Planned Distance</span><strong>${escapeHtml(formatDemoStat(summary.plannedDistance))}</strong></div>
          <div><span>Realized Distance</span><strong>${escapeHtml(formatDemoStat(summary.realizedDistance))}</strong></div>
          <div><span>Mean Track Error</span><strong>${escapeHtml(formatDemoStat(summary.meanTrackError))}</strong></div>
          <div><span>Max Track Error</span><strong>${escapeHtml(formatDemoStat(summary.maxTrackError))}</strong></div>
          <div><span>Drift Distance</span><strong>${escapeHtml(formatDemoStat(summary.driftDistance))}</strong></div>
          <div><span>Energy Used</span><strong>${escapeHtml(formatDemoStat(summary.energyUsed))}</strong></div>
          <div><span>Sampled Points</span><strong>${escapeHtml(summary.sampledPointCount ?? 0)}</strong></div>
        </div>
        <div class="hud-muted">Sampling happens along the realized trajectory, not the dashed planned line.</div>
      </section>
      <section class="console-section">
        <h2>Controls</h2>
        <div class="console-button-row">
          <button data-action="motion-run" class="console-button">Run</button>
          <button data-action="motion-pause" class="console-button secondary">Pause</button>
          <button data-action="motion-reset" class="console-button secondary">Reset</button>
        </div>
        <button data-action="motion-export-json" class="console-button secondary">Export Motion JSON</button>
      </section>
      <section class="console-section">
        <h2>Boundary</h2>
        <div class="hud-muted">Motion dynamics does not generate a route.</div>
        <div class="hud-muted">This is not WebGPU, not a production hydrodynamic solver, not browser official scoring, and not MARL/RL.</div>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.root.querySelector('#motion-demo-model')?.addEventListener('change', (event) => handlers.motionModelId?.(event.target.value));
    this.root.querySelector('#motion-demo-dive-profile')?.addEventListener('change', (event) => handlers.diveProfileId?.(event.target.value));
    this.root.querySelector('[data-motion-input="current-strength"]')?.addEventListener('input', (event) => handlers.currentStrength?.(event.target.value));
    this.root.querySelector('[data-motion-input="cross-current-strength"]')?.addEventListener('input', (event) => handlers.crossCurrentStrength?.(event.target.value));
    this.root.querySelector('[data-motion-input="glider-speed"]')?.addEventListener('input', (event) => handlers.gliderSpeed?.(event.target.value));
    this.root.querySelector('[data-motion-input="heading-rate-limit"]')?.addEventListener('input', (event) => handlers.headingRateLimit?.(event.target.value));
    this.root.querySelector('[data-motion-input="drift-gain"]')?.addEventListener('input', (event) => handlers.driftGain?.(event.target.value));
    this.bind({
      'motion-run': handlers.run,
      'motion-pause': handlers.pause,
      'motion-reset': handlers.reset,
      'motion-export-json': handlers.exportMotionJson,
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
    const benchmarkExportAvailable = Boolean(result?.benchmarkMetadata ?? state?.benchmarkRuntimeContext ?? state?.currentScenario?.benchmarkMetadata);
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
        ${benchmarkExportAvailable ? `
          <button class="console-button" data-action="export-benchmark-run">Export Benchmark Run Record</button>
          <button class="console-button" data-action="export-benchmark-route">Export Route Execution Record</button>
          <button class="console-button" data-action="export-benchmark-attempt-set">Export Benchmark Attempt Set</button>
          <button class="console-button" data-action="export-benchmark-comparison">Export Benchmark Comparison</button>
          <button class="console-button" data-action="export-benchmark-route-overlay">Export Route Overlay</button>
          <button class="console-button" data-action="export-benchmark-attempt-session">Export Attempt Session</button>
        ` : ''}
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

  renderBenchmarkModeOverviewControls(payload = {}, handlers = {}) {
    if (!this.root) return;
    const config = payload.config ?? {};
    const state = payload.state ?? {};
    const summary = payload.summary ?? {};
    const episodeConfig = payload.episodeConfig ?? {};
    const objectiveOptions = Array.isArray(payload.objectiveOptions) ? payload.objectiveOptions : [];
    const visibleLayers = state.visibleLayers ?? [];
    const implementedSystems = state.implementedSystems ?? [];
    const missingSystems = state.missingSystems ?? [];
    const p1Implemented = Array.isArray(payload.p1Implemented) ? payload.p1Implemented : [];
    const p1NotImplemented = Array.isArray(payload.p1NotImplemented) ? payload.p1NotImplemented : [];
    const savedAttemptSessions = Array.isArray(payload.savedAttemptSessions) ? payload.savedAttemptSessions : [];
    const savedAdaptiveSessions = Array.isArray(payload.savedAdaptiveSessions) ? payload.savedAdaptiveSessions : [];
    const adaptivePreview = payload.adaptivePreview ?? null;
    const adaptiveFixtureOptions = Array.isArray(payload.adaptiveFixtureOptions) ? payload.adaptiveFixtureOptions : [];
    const adaptivePolicyOptions = Array.isArray(payload.adaptivePolicyOptions) ? payload.adaptivePolicyOptions : [];
    const plannerSetupHtml = config.benchmarkMode === 'plannerBenchmark'
      ? '<button data-action="benchmark-open-setup" class="console-button">Open Planner Benchmark Setup</button>'
      : config.benchmarkMode === 'adaptiveBenchmark'
        ? '<button data-action="benchmark-open-setup" class="console-button">Start New Adaptive Episode</button><button data-action="continue-adaptive-session" class="console-button secondary">Continue Saved Adaptive Episode</button><div class="hud-muted">P8 launches the existing setup/planning flow with adaptive mission-manager metadata. The player or solver chooses route; no waypoints are generated automatically.</div>'
        : '<div class="hud-muted">Contract defined; execution later. This mode does not launch route execution in P2.</div>';
    const statusLabel = config.benchmarkMode === 'adaptiveBenchmark' ? 'P8 Adaptive Multi-Leg Session' : 'P2 Execution Integration';
    const statusDetail = config.benchmarkMode === 'adaptiveBenchmark'
      ? 'Adaptive setup metadata, surfacing decisions, objective history, saved episode sessions, next-leg handoff, and exports are available. No new planner, scoring redesign, or MARL/RL is added.'
      : 'Existing simulator and debrief produce benchmark records. No new planner or scoring redesign is added.';
    const adaptivePanelHtml = adaptivePreview ? `
      <section class="console-section" data-adaptive-benchmark-overview>
        <h2>Adaptive Mission Manager</h2>
        <label class="compact-field">
          Policy
          <select id="adaptive-benchmark-policy">
            ${adaptivePolicyOptions.map((policy) => `<option value="${escapeAttr(policy.id)}" ${policy.id === payload.adaptivePolicyId ? 'selected' : ''}>${escapeHtml(policy.label)}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Fixture
          <select id="adaptive-benchmark-fixture">
            ${adaptiveFixtureOptions.map((fixture) => `<option value="${escapeAttr(fixture.id)}" ${fixture.id === payload.adaptiveFixtureId ? 'selected' : ''}>${escapeHtml(fixture.label)}</option>`).join('')}
          </select>
        </label>
        ${adaptiveBenchmarkPanelHtml(adaptivePreview.viewModel)}
        <section class="mini-panel" data-adaptive-saved-sessions>
          <h3>Saved Adaptive Benchmark Sessions</h3>
          ${savedAdaptiveSessions.length ? `
            <div class="panel-stack">
              ${savedAdaptiveSessions.slice(0, 5).map((session) => `<div class="hud-muted"><strong>${escapeHtml(session.episodeId ?? 'unknown episode')}</strong>: ${escapeHtml(session.legCount ?? 0)} leg(s), current objective ${escapeHtml(session.currentObjectiveLabel ?? session.currentObjectiveId ?? 'unknown')}, updated ${escapeHtml(session.updatedAt ?? 'unknown')}.</div>`).join('')}
            </div>
          ` : '<div class="hud-muted">Saved adaptive sessions: 0</div>'}
        </section>
        <div class="panel-stack">
          <button data-action="export-adaptive-manager-preview" class="console-button">Export Adaptive Manager Preview</button>
          <button data-action="export-adaptive-manager-config" class="console-button secondary">Export Adaptive Manager Config</button>
          <button data-action="export-adaptive-manager-state" class="console-button secondary">Export Adaptive Manager State</button>
          <button data-action="export-adaptive-objective-transition" class="console-button secondary">Export Adaptive Objective Transition</button>
          <button data-action="export-adaptive-surfacing-event" class="console-button secondary">Export Adaptive Surfacing Event</button>
          <button data-action="export-adaptive-launch-config" class="console-button secondary">Export Adaptive Launch Config</button>
        </div>
      </section>
    ` : '';
    this.root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Benchmark Mode</div>
        <h1>${escapeHtml(config.label ?? 'Benchmark Mode')}</h1>
        <p>${escapeHtml(benchmarkModeP1Text(config.benchmarkMode))}</p>
      </section>
      <section class="console-status">
        <span>${escapeHtml(statusLabel)}</span>
        <strong>${escapeHtml(benchmarkImplementedLabel(config.implemented))}</strong>
        <small>${escapeHtml(statusDetail)}</small>
      </section>
      <section class="console-section">
        <h2>Authority Split</h2>
        <div class="cell-inspector-metrics">
          <div><span>Objective Authority</span><strong>${escapeHtml(benchmarkAuthorityText(config.objectiveAuthority, 'objective'))}</strong></div>
          <div><span>Route Authority</span><strong>${escapeHtml(benchmarkAuthorityText(config.routeAuthority, 'route'))}</strong></div>
          <div><span>Information Access</span><strong>${escapeHtml(summary.informationAccessTier ?? config.informationAccessTier ?? 'forecastOnly')}</strong></div>
          <div><span>Fairness Label</span><strong>${escapeHtml(config.fairnessLabel ?? 'Forecast-only')}</strong></div>
          <div><span>World Model</span><strong>${escapeHtml(summary.worldModelTier ?? config.worldModelTier ?? 'flowCoupledAction')}</strong></div>
        </div>
        <div class="hud-muted">${escapeHtml(benchmarkModeBoundaryText(config.benchmarkMode))}</div>
      </section>
      <section class="console-section">
        <h2>Route Execution Contract</h2>
        <div class="hud-muted">Planner Benchmark can describe one benchmark episode, compare manual / Greedy Planner / imported solver attempts, and normalize existing debrief metrics into benchmark records.</div>
        <div class="hud-muted">Episode: ${escapeHtml(episodeConfig.type ?? 'anchor.benchmark.episode-config')} | Attempts: ${escapeHtml((episodeConfig.allowedAttemptSources ?? []).join(', ') || 'defined by mode')}</div>
        ${plannerSetupHtml}
      </section>
      ${adaptivePanelHtml}
      <section class="console-section">
        <h2>Saved Attempt Sessions</h2>
        ${savedAttemptSessions.length ? `
          <div class="panel-stack">
            ${savedAttemptSessions.slice(0, 5).map((session) => `<div class="hud-muted"><strong>${escapeHtml(session.episodeId ?? 'unknown episode')}</strong>: ${escapeHtml(session.attemptCount ?? 0)} attempt(s), ${escapeHtml(session.routeGeometryCount ?? 0)} route(s) saved.</div>`).join('')}
          </div>
        ` : '<div class="hud-muted">No saved Planner Benchmark attempt sessions are stored in this browser yet.</div>'}
      </section>
      <section class="console-section">
        <h2>P2/P5/P6/P7/P8 Status</h2>
        <div class="panel-stack">
          <div><strong>Implemented now</strong><ul>${p1Implemented.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
          <div><strong>Not implemented yet</strong><ul>${p1NotImplemented.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
        </div>
      </section>
      <section class="console-section">
        <h2>Visible Model Layers</h2>
        <div class="hud-muted">${escapeHtml(visibleLayers.join(', ') || 'Defined by benchmark mode contract.')}</div>
      </section>
      <section class="console-section">
        <h2>Objective Taxonomy Preview</h2>
        <div class="panel-stack">
          ${objectiveOptions.map((objective) => `<div class="hud-muted"><strong>${escapeHtml(objective.label)}</strong>: ${escapeHtml(objective.description)}</div>`).join('')}
        </div>
      </section>
      <section class="console-section">
        <h2>Related Sandboxes</h2>
        <div class="panel-stack">
          <button data-action="benchmark-open-sampling-priority" class="console-button secondary">Sampling Priority Demo</button>
          <button data-action="benchmark-open-flow-coupled" class="console-button secondary">Flow-Coupled Sampling Demo</button>
          <button data-action="benchmark-open-uncertainty" class="console-button secondary">Uncertainty / Forecast Demo</button>
          <button data-action="benchmark-open-planner-evaluation" class="console-button secondary">Planner / Mission Evaluation</button>
        </div>
      </section>
      <section class="console-section">
        <h2>Contract Inventory</h2>
        <div class="hud-muted">Implemented systems: ${escapeHtml(implementedSystems.join(', ') || 'contract skeleton')}</div>
        <div class="hud-muted">Future systems: ${escapeHtml(missingSystems.join(', ') || 'route execution and scoring')}</div>
      </section>
      <section class="console-section">
        <h2>Export</h2>
        <button data-action="export-benchmark-config" class="console-button">Export Benchmark Config JSON</button>
        <button data-action="export-benchmark-episode" class="console-button secondary">Export Benchmark Episode JSON</button>
        <div class="hud-muted">Exports anchor.benchmark.mode-config and anchor.benchmark.episode-config. P2 debrief can export run-record, route-execution, and attempt-set JSON. Adaptive Benchmark also exports P6 mission-manager records, P7 launch/surfacing/next-leg records, and P8 adaptive session/objective-history records.</div>
      </section>
      <section class="console-footer">
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('benchmarkModeOverview', null, { defaultCollapsed: false });
    this.bind({
      'benchmark-open-setup': handlers.openBenchmarkSetup,
      'benchmark-open-sampling-priority': handlers.openSamplingPriority,
      'benchmark-open-flow-coupled': handlers.openFlowCoupledSampling,
      'benchmark-open-uncertainty': handlers.openUncertainty,
      'benchmark-open-planner-evaluation': handlers.openPlannerEvaluation,
      'export-benchmark-config': handlers.exportConfig,
      'export-benchmark-episode': handlers.exportEpisode,
      'export-adaptive-manager-config': handlers.exportAdaptiveManagerConfig,
      'export-adaptive-manager-state': handlers.exportAdaptiveManagerState,
      'export-adaptive-objective-transition': handlers.exportAdaptiveObjectiveTransition,
      'export-adaptive-surfacing-event': handlers.exportAdaptiveSurfacingEvent,
      'export-adaptive-manager-preview': handlers.exportAdaptiveManagerPreview,
      'export-adaptive-launch-config': handlers.exportAdaptiveLaunchConfig,
      'continue-adaptive-session': handlers.continueAdaptiveSession,
      menu: handlers.menu
    });
    this.root.querySelector('#adaptive-benchmark-fixture')?.addEventListener('change', (event) => {
      handlers.selectAdaptiveFixture?.(event.target.value);
    });
    this.root.querySelector('#adaptive-benchmark-policy')?.addEventListener('change', (event) => {
      handlers.selectAdaptivePolicy?.(event.target.value);
    });
  }

  bind(actions) {
    this.root.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => actions[button.dataset.action]?.());
    });
  }
}

function benchmarkImplementedLabel(value) {
  if (value === true) return 'Implemented';
  if (value === false) return 'Placeholder';
  return 'Partial';
}

function benchmarkAuthorityText(value, kind) {
  const objectiveLabels = {
    fixed: 'Objective is fixed / given',
    missionManager: 'Transparent mission manager chooses objectives after observations or belief',
    solverOrAgent: 'Solver/agent chooses objective and route'
  };
  const routeLabels = {
    playerOrSolver: 'Player or solver chooses route',
    solverOrAgent: 'Solver/agent chooses objective and route'
  };
  return (kind === 'route' ? routeLabels : objectiveLabels)[value] ?? String(value ?? 'unknown');
}

function benchmarkModeBoundaryText(mode) {
  return {
    plannerBenchmark: 'Objective is fixed. Plan manually, use Greedy Planner, or import a solver plan. Execute through the existing simulator and compare results in Debrief.',
    adaptiveBenchmark: 'Mission manager objective updates run at surfacing/debrief time for one executed preview leg. The player or solver still chooses the route; P8 persists objective history for manual continuation. It does not add a route planner, scoring redesign, or MARL/RL.',
    fullAutonomyBenchmark: 'Solver/agent objective and route authority are defined by contract; execution later.'
  }[mode] ?? 'P2 integrates benchmark records with the existing simulator/debrief; it does not add a planner, scoring redesign, or MARL/RL.';
}

function benchmarkModeP1Text(mode) {
  return {
    plannerBenchmark: 'Objective is fixed. Player or solver chooses route through existing planning, simulator, and debrief systems.',
    adaptiveBenchmark: 'Mission manager recommends objectives from observations, uncertainty, forecast error, hidden-event suspicion, staleness, and mission state; player or solver chooses the route.',
    fullAutonomyBenchmark: 'Solver/agent objective and route authority are contract-defined placeholders; execution later.'
  }[mode] ?? 'Benchmark route-execution contract overview.';
}

function motionNumberInputHtml(key, label, value, min, max, step) {
  const number = Number.isFinite(Number(value)) ? Number(value) : Number(min);
  return `
    <label class="compact-field">
      ${escapeHtml(label)}
      <input data-motion-input="${escapeAttr(key)}" type="range" min="${escapeAttr(min)}" max="${escapeAttr(max)}" step="${escapeAttr(step)}" value="${escapeAttr(number)}" />
    </label>
  `;
}

function motionModelLabel(id) {
  return String(id ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
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

function flowDiagnosticsHtml(diagnostics = {}, model = {}) {
  const speed = diagnostics?.speedStats ?? {};
  const divergence = diagnostics?.divergenceStats ?? {};
  const vorticity = diagnostics?.vorticityStats ?? {};
  const strain = diagnostics?.strainStats ?? {};
  const claimLevel = model?.claimLevel ?? 'syntheticOceanInspired';
  const notA = model?.notA ?? 'validated ocean forecast, CFD solver, or calibrated circulation model.';
  return `
    <section class="console-section" data-flow-diagnostics>
      <h2>Current Field Diagnostics</h2>
      <div class="cell-inspector-metrics">
        <div><span>Speed</span><strong>${escapeHtml(formatDiagnosticRange(speed))}</strong></div>
        <div><span>Mean Divergence</span><strong>${escapeHtml(formatDiagnosticNumber(divergence.mean))}</strong></div>
        <div><span>Mean Vorticity</span><strong>${escapeHtml(formatDiagnosticNumber(vorticity.mean))}</strong></div>
        <div><span>Mean Strain</span><strong>${escapeHtml(formatDiagnosticNumber(strain.mean))}</strong></div>
        <div><span>Invalid Vectors</span><strong>${escapeHtml(diagnostics?.invalidVectorCount ?? 0)}</strong></div>
        <div><span>Claim Level</span><strong>${escapeHtml(flowClaimLevelLabel(claimLevel))}</strong></div>
      </div>
      <div class="hud-muted">Synthetic, deterministic current-vector playground; not a ${escapeHtml(notA)}</div>
    </section>
  `;
}

function formatDiagnosticRange(stats = {}) {
  return `${formatDiagnosticNumber(stats.min)} / ${formatDiagnosticNumber(stats.mean)} / ${formatDiagnosticNumber(stats.max)}`;
}

function flowClaimLevelLabel(value) {
  return String(value ?? 'syntheticOceanInspired')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatDiagnosticNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return Math.abs(number) >= 10 ? number.toFixed(1) : number.toFixed(4);
}

function samplingPriorityViewLayerOptions() {
  return [
    ['eventIntensity', 'Event Intensity'],
    ['trueRoi', 'True ROI / Oracle Value'],
    ['beliefRoi', 'Forecast / Belief ROI'],
    ['expectedUncertainty', 'Expected-State Uncertainty'],
    ['boundaryStrength', 'Boundary / Gradient Value'],
    ['forecastValidation', 'Forecast-Validation Value'],
    ['hiddenEventProbability', 'Hidden-Event Probability'],
    ['staleness', 'Staleness / Revisit Value'],
    ['hazard', 'Hazard / Constraint Penalty'],
    ['recentSamplePenalty', 'Redundancy / Recent-Sample Penalty'],
    ['samplingPriority', 'Sampling Priority'],
    ['candidateSamplePoints', 'Candidate Sample Points'],
    ['priorityEventDifference', 'Priority vs Event Difference']
  ].map(([id, label]) => ({ id, label }));
}

function samplingPriorityObjectivePresetLabel(value) {
  return {
    balancedScience: 'Balanced Science',
    mappingFronts: 'Map Fronts / Boundaries',
    validateForecast: 'Validate Forecast',
    hiddenEventFollowup: 'Hidden-Event Follow-up',
    revisitMonitoring: 'Revisit Monitoring'
  }[value] ?? 'Balanced Science';
}

function samplingPriorityWeightInputHtml(key, label, value) {
  const number = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `
    <label class="compact-field">
      ${escapeHtml(label)}
      <input data-sampling-priority-weight="${escapeAttr(key)}" type="number" min="0" max="2" step="0.05" value="${escapeAttr(number.toFixed(2))}" />
    </label>
  `;
}
function flowCoupledSamplingViewLayerOptions() {
  return [
    ['globalSciencePriority', 'Global Science Priority A_global'],
    ['futurePriority', 'Future Priority'],
    ['flowField', 'Flow Field F(x,y,t)'],
    ['currentAssist', 'Current Assist'],
    ['currentOpposition', 'Current Opposition'],
    ['crossCurrentRisk', 'Cross-Current Risk'],
    ['travelDistance', 'Travel Distance'],
    ['arrivalTime', 'Arrival Time'],
    ['energyCost', 'Energy Cost'],
    ['reachableMask', 'Reachable Mask'],
    ['hazardPenalty', 'Hazard / Constraint Penalty'],
    ['redundancyPenalty', 'Redundancy Penalty'],
    ['gliderActionValue', 'Glider Action Value Q_glider'],
    ['candidateTargets', 'Candidate Targets'],
    ['priorityActionDifference', 'Priority vs Action Difference']
  ].map(([id, label]) => ({ id, label }));
}

function flowCoupledSamplingWeightInputHtml(key, label, value) {
  const number = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `
    <label class="compact-field">
      ${escapeHtml(label)}
      <input data-flow-coupled-sampling-weight="${escapeAttr(key)}" type="number" min="0" max="2" step="0.05" value="${escapeAttr(number.toFixed(2))}" />
    </label>
  `;
}function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : 'N/A';
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

function menuLinkHtml(href, title, description, tone = '') {
  const classes = ['console-button', 'menu-action-button', tone].filter(Boolean).join(' ');
  return `
    <a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" class="${classes}">
      <span>${escapeHtml(title)}</span>
      <small>${escapeHtml(description)}</small>
    </a>
  `;
}

function menuStaticHtml(title, description) {
  return `
    <div class="console-button menu-action-button disabled" aria-disabled="true">
      <span>${escapeHtml(title)}</span>
      <small>${escapeHtml(description)}</small>
    </div>
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
