import {
  ROI_DEMO_TIME_MODES,
  ROI_DEMO_TEMPORAL_PATTERNS,
  ROI_DEMO_SPATIAL_EVOLUTIONS,
  ROI_DEMO_LIKELIHOOD_DYNAMICS,
  ROI_DEMO_MOTION_SCOPES,
  ROI_DEMO_INTERACTION_SCALES,
  ROI_DEMO_STATE_MODELS,
  ROI_DEMO_DEPLETION_MODES,
  ROI_DEMO_DISPLAY_MODES,
  ROI_DEMO_DYNAMIC_COMPLEXITY,
  ROI_DEMO_PURE_SPATIAL_PATTERNS,
  ROI_DEMO_EVENT_LIKELIHOODS,
  ROI_DEMO_VALUE_DISTRIBUTIONS,
  ROI_DEMO_CLUSTER_SIZES,
  ROI_DEMO_MESSAGE_TYPES,
  ROI_DEMO_NODE_STATES,
  ROI_DEMO_ROI_MEANING_LAYERS,
  roiTemporalPatternLabel,
  roiStateModelDescription,
  roiStateModelForEvolutionModel,
  roiStateModelLabel,
  roiPureSpatialPatternLabel,
  roiEventLikelihoodLabel,
  roiLikelihoodDynamicsLabel,
  roiLikelihoodSpatialEvolutionLabel,
  roiValueDistributionLabel,
  roiSpatialEvolutionLabel,
  roiMotionScopeLabel,
  roiInteractionScaleLabel,
  roiDepletionModeLabel,
  roiDisplayModeLabel,
  roiDisplayModeCaption,
  roiDemoDisplayModeNeedsViewFilters,
  roiClusterSizeLabel
} from '../../core/demo/DemoRoiFields.js';
import { sampleFieldBehaviorExplainer } from '../../core/demo/SampleFieldBehaviorExplainers.js';
import {
  CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
  SAMPLE_FIELD_BEHAVIOR_PRESET_OPTIONS,
  SAMPLE_FIELD_BEHAVIOR_PRESETS,
  sampleFieldBehaviorPresetById
} from '../../core/demo/SampleFieldBehaviorPresets.js';
import {
  CUSTOM_REFERENCE_SIGNATURE_ID,
  ROI_REFERENCE_SIGNATURES,
  referenceSignatureById,
  referenceSignatureLabel
} from '../../core/demo/roi/RoiReferenceSignatures.js';
import {
  SAMPLING_PROCESS_LAB_MENU_LABEL,
  SAMPLING_PROCESS_LAB_TITLE,
  SAMPLING_PROCESS_VISIBLE_MODES,
  normalizeVisibleSamplingProcessMode,
  samplingProcessModeLabel
} from '../../core/demo/sampling/SamplingProcessTerminology.js';
import {
  SAMPLING_PROCESS_SECTION_IDS,
  samplingProcessModeHasSection,
  samplingProcessUiConfig
} from '../../core/demo/sampling/SamplingProcessUiConfig.js';

export function samplingProcessConsoleHtml(state = {}) {
  const context = samplingProcessConsoleContext(state);
  const sections = [
    samplingProcessHeaderHtml(context),
    samplingProcessSectionHtml('mode', context),
    samplingPrimaryModeControlsHtml(context),
    samplingProcessModeControlsHtml(context),
    samplingProcessSectionHtml('sourceField', context),
    samplingProcessSectionHtml('spatialPattern', context),
    samplingProcessSectionHtml('valueDistribution', context),
    samplingProcessSectionHtml('temporalPattern', context),
    samplingProcessSectionHtml('spatialEvolution', context),
    samplingProcessSectionHtml('interactionScale', context),
    samplingProcessSectionHtml('stateUpdateRule', context),
    samplingProcessSectionHtml('samplingEffect', context),
    samplingProcessSectionHtml('display', context),
    samplingProcessSectionHtml('seed', context),
    samplingProcessSectionHtml('componentExamples', context),
    samplingProcessSectionHtml('export', context),
    samplingFooterHtml(context)
  ];
  return sections.filter(Boolean).join('\n');
}

export function samplingProcessSectionsHtml(state = {}, sectionIds = SAMPLING_PROCESS_SECTION_IDS) {
  const context = samplingProcessConsoleContext(state);
  return sectionIds.map((sectionId) => samplingProcessSectionHtml(sectionId, context)).filter(Boolean).join('\n');
}

export function samplingProcessSectionHtml(sectionId, state = {}) {
  const context = state.__samplingProcessConsoleContext ? state : samplingProcessConsoleContext(state);
  if (!context.hasSection(sectionId)) return '';
  return {
    mode: () => samplingProcessModeSectionHtml(context),
    referenceSignature: () => samplingProcessModeSectionHtml(context),
    sourceField: () => samplingSourceFieldSectionHtml(context),
    spatialPattern: () => samplingSpatialPatternSectionHtml(context),
    valueDistribution: () => samplingValueDistributionSectionHtml(context),
    temporalPattern: () => samplingTemporalPatternSectionHtml(context),
    spatialEvolution: () => samplingSpatialEvolutionSectionHtml(context),
    interactionScale: () => samplingInteractionScaleSectionHtml(context),
    stateUpdateRule: () => samplingStateUpdateSectionHtml(context),
    samplingEffect: () => samplingEffectSectionHtml(context),
    processPaintTools: () => samplingProcessPaintSectionHtml(context),
    randomRuleLab: () => samplingRandomRuleLabSectionHtml(context),
    display: () => samplingDisplaySectionHtml(context),
    graphFilters: () => samplingDiagnosticsFilterSectionHtml(context),
    nodeFilters: () => samplingDiagnosticsFilterSectionHtml(context),
    messageFilters: () => samplingDiagnosticsFilterSectionHtml(context),
    transitionFilters: () => samplingDiagnosticsFilterSectionHtml(context),
    seed: () => samplingSeedSectionHtml(context),
    stats: () => samplingFieldStatsHtml(context),
    componentExamples: () => samplingComponentIsolationHtml(context),
    export: () => samplingExportSectionHtml(context),
    scenarioGeneration: () => samplingScenarioGenerationSectionHtml(context)
  }[sectionId]?.() ?? '';
}

export function samplingProcessHeaderHtml(state) {
  return `
      <section class="console-header sampling-compact-header">
        <div class="console-kicker">${escapeHtml(SAMPLING_PROCESS_LAB_MENU_LABEL)}</div>
        <h1>${escapeHtml(state.title ?? SAMPLING_PROCESS_LAB_TITLE)}</h1>
        <p>${escapeHtml(state.processModeLabel ?? samplingProcessModeLabel(state.processMode))} · ${escapeHtml(state.processStatusLabel ?? 'Custom Exploratory')}</p>
      </section>
  `;
}

export function samplingProcessComponentBreakdownHtml(state) {
  return `
      <section class="console-status sampling-compact-summary">
        <span>Mode</span>
        <strong>${escapeHtml((state.timeMode === 'dynamic' || state.eventLikelihoodDynamics === 'dynamic') && !state.paused ? 'Animating' : state.paused ? 'Paused' : 'Static')}</strong>
        ${compactChipRowHtml(state.summaryRows.slice(0, 5))}
        <details class="sampling-compact-details">
          <summary>Full recipe details</summary>
          ${compactKeyValueRowsHtml(state.summaryRows)}
        </details>
      </section>
  `;
}

export function samplingProcessActiveSourceSummaryHtml(state) {
  return `
      <section class="console-status sampling-compact-summary" data-roi-active-source-summary>
        <span>Active Source</span>
        <strong>${escapeHtml(state.processModeLabel ?? samplingProcessModeLabel(state.processMode))} · ${escapeHtml(state.processStatusLabel ?? 'Custom Exploratory')}</strong>
        ${compactKeyValueRowsHtml(state.sourceSummaryRows.filter(([label]) => label !== 'Recipe'))}
        ${compactChipRowHtml(state.recipeChipRows)}
        <details class="sampling-compact-details">
          <summary>Full recipe details</summary>
          ${compactKeyValueRowsHtml(state.summaryRows)}
        </details>
      </section>
  `;
}

export function samplingProcessModeSectionHtml(state) {
  return `
      <section class="console-section sampling-control-card" data-sampling-section="mode" data-sampling-top-card="mode">
        <h2 title="Choose a lab workflow mode.">Mode</h2>
        <div class="hud-muted">Choose how to build or generate the process.</div>
        <label class="compact-field sampling-primary-control">
          <span>Mode</span>
          <select id="sampling-process-mode">
            ${SAMPLING_PROCESS_VISIBLE_MODES.map((mode) => `<option value="${escapeAttr(mode)}" ${normalizeVisibleSamplingProcessMode(state.processMode) === mode ? 'selected' : ''}>${escapeHtml(samplingProcessModeLabel(mode))}</option>`).join('')}
          </select>
        </label>
      </section>
  `;
}

export function samplingPrimaryModeControlsHtml(state = {}) {
  return {
    referenceSignature: () => samplingReferenceSignaturePrimaryHtml(state),
    customComposer: () => samplingCustomComposerPrimaryHtml(state),
    processPaint: () => samplingProcessPaintPrimaryHtml(state),
    randomRuleLab: () => samplingRandomRuleLabPrimaryHtml(state),
    diagnosticsGraphInspection: () => ''
  }[state.processMode]?.() ?? samplingReferenceSignaturePrimaryHtml(state);
}

function samplingReferenceSignaturePrimaryHtml(state = {}) {
  return `
      <section class="console-section sampling-control-card" data-sampling-top-card="primary" data-sampling-primary-mode="referenceSignature">
        <h2>Process Pattern</h2>
        <div class="hud-muted">Choose an example process pattern.</div>
        ${state.hasSection('referenceSignature') && state.patternSource === 'referenceSignature' ? `
          <label class="compact-field" title="Choose a known observable process pattern.">
            <span>Process Pattern</span>
            <select id="roi-demo-reference-signature">
              ${ROI_REFERENCE_SIGNATURES.map((signature) => `<option value="${escapeAttr(signature.id)}" ${(state.referenceSignatureId ?? CUSTOM_REFERENCE_SIGNATURE_ID) === signature.id ? 'selected' : ''}>${escapeHtml(signature.label)}</option>`).join('')}
            </select>
          </label>
        ` : `
          ${state.hasSection('sourceField') ? '<div class="hud-muted">Edit the primitive components directly. No guided process is active.</div>' : ''}
        `}
        ${state.componentHint ? `<div class="hud-muted warning">Modified component: ${escapeHtml(state.componentHint.label)}. Expected effect: ${escapeHtml(state.componentHint.expectedEffect)} Recommended views: ${escapeHtml((state.componentHint.recommendedViews ?? []).join(', '))}.</div>` : ''}
        ${(state.compatibilityWarnings ?? []).map((warning) => `<div class="hud-muted warning">${escapeHtml(warning)}</div>`).join('')}
        ${state.legacyPresetsVisible ? `
          <details class="hud-muted">
            <summary>Advanced / Legacy Examples</summary>
            <p>Legacy MVP examples. These are kept for compatibility and debugging. The main educational workflow is guided Process Patterns.</p>
            <label class="compact-field" title="${escapeAttr(state.presetHelp.short)}">
              <span>Legacy Behavior Preset</span>
              <select id="roi-demo-behavior-preset" title="${escapeAttr(state.presetHelp.short)}">
                ${SAMPLE_FIELD_BEHAVIOR_PRESET_OPTIONS.map((preset) => `<option value="${escapeAttr(preset.id)}" ${state.behaviorPresetId === preset.id || (!state.behaviorPresetId && preset.id === CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID) ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`).join('')}
              </select>
            </label>
            <div>${escapeHtml(state.presetStatus)}</div>
          </details>
        ` : ''}
      </section>
  `;
}

function samplingCustomComposerPrimaryHtml(state = {}) {
  return `
      <section class="console-section sampling-control-card" data-sampling-top-card="primary" data-sampling-primary-mode="customComposer">
        <h2>Custom Composer</h2>
        <div class="hud-muted">Edit global process components.</div>
        ${state.componentHint ? `<div class="hud-muted warning">Modified component: ${escapeHtml(state.componentHint.label)}. Expected effect: ${escapeHtml(state.componentHint.expectedEffect)}</div>` : ''}
        ${(state.compatibilityWarnings ?? []).map((warning) => `<div class="hud-muted warning">${escapeHtml(warning)}</div>`).join('')}
      </section>
  `;
}

function samplingProcessPaintPrimaryHtml(state = {}) {
  return `
      <section class="console-section sampling-control-card" data-sampling-top-card="primary" data-sampling-primary-mode="processPaint">
        <h2>Process Paint</h2>
        <div class="hud-muted">Blank editing canvas. Paint cells, rules, groups, and source values.</div>
        ${compactMetricChipsHtml([
          ['painted', String(state.paintValidation?.paintedCellCount ?? 0)],
          ['groups', String(state.paintValidation?.groupCount ?? 0)],
          ['brush', state.selectedPaintRuleId ?? 'inert'],
          ['status', state.paintValidation?.status ?? 'PASS']
        ])}
      </section>
  `;
}

function samplingRandomRuleLabPrimaryHtml(state = {}) {
  return `
      <section class="console-section sampling-control-card" data-sampling-top-card="primary" data-sampling-primary-mode="randomRuleLab">
        <h2>Random Rule Lab</h2>
        <div class="hud-muted">Generate seeded rule, state, group, and source allocations.</div>
        ${compactMetricChipsHtml([
          ['seed', state.randomRuleSeed ?? 'sampling-random-001'],
          ['groups', String(state.randomRuleGroupCount ?? 4)],
          ['density', formatPercent(state.randomRuleActiveFraction ?? 0.18)]
        ])}
      </section>
  `;
}

export function samplingCurrentSummaryHtml(state = {}) {
  return `
      <section class="console-status sampling-summary-card" data-sampling-top-card="summary">
        <span>Current Summary</span>
        <strong>${escapeHtml(state.processStatusLabel ?? 'Custom Exploratory')}</strong>
        ${compactChipRowHtml(samplingCurrentSummaryRows(state))}
        <details class="sampling-details sampling-compact-details">
          <summary>Full recipe details</summary>
          ${compactKeyValueRowsHtml(state.summaryRows)}
        </details>
      </section>
  `;
}

function samplingCurrentSummaryRows(state = {}) {
  if (state.processMode === 'processPaint') {
    return [
      ['Mode', state.processModeLabel ?? samplingProcessModeLabel(state.processMode)],
      ['Painted cells', String(state.paintValidation?.paintedCellCount ?? 0)],
      ['Brush', state.selectedPaintRuleId ?? 'inert'],
      ['Group', String(state.selectedPaintGroupId ?? 1)],
      ['Status', state.paintValidation?.status ?? 'PASS']
    ];
  }
  if (state.processMode === 'randomRuleLab') {
    return [
      ['Mode', state.processModeLabel ?? samplingProcessModeLabel(state.processMode)],
      ['Seed', state.randomRuleSeed ?? 'sampling-random-001'],
      ['Groups', String(state.randomRuleGroupCount ?? 4)],
      ['Active density', formatPercent(state.randomRuleActiveFraction ?? 0.18)],
      ['Status', state.processStatusLabel ?? 'Custom Exploratory']
    ];
  }
  if (state.processMode === 'diagnosticsGraphInspection') {
    const diagnostics = state.graphDiagnostics ?? {};
    return [
      ['Mode', state.processModeLabel ?? samplingProcessModeLabel(state.processMode)],
      ['Display', state.displayModeLabel ?? roiDisplayModeLabel(state.displayMode)],
      ['Messages', String(diagnostics.edgeMessageTotal ?? 0)],
      ['States', String(diagnostics.activeNodeCount ?? 0)],
      ['Status', state.processStatusLabel ?? 'Custom Exploratory']
    ];
  }
  return [
    ['Mode', state.processModeLabel ?? samplingProcessModeLabel(state.processMode)],
    ['Source', patternSourceLabel(state.patternSource)],
    ['Recipe', state.recipeSummary],
    ['State', state.stateModelLabel],
    ['Sampling', state.depletionModeLabel ?? roiDepletionModeLabel(state.depletionMode)]
  ];
}

export function samplingSourceFieldSectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="sourceField">
        <h2 title="${escapeAttr(state.eventLikelihoodHelp.groupSummary)}">Source / Initial Field <span aria-label="Source Field help" title="${escapeAttr(state.eventLikelihoodHelp.short)}">i</span></h2>
        <div class="hud-muted">Where the process starts or has support.</div>
        <label class="compact-field" title="${escapeAttr(state.eventLikelihoodHelp.short)}">
          <span>Source Field Type <span aria-label="Source Field help" title="${escapeAttr(state.eventLikelihoodHelp.short)}">i</span></span>
          <select id="roi-demo-event-likelihood" title="${escapeAttr(state.eventLikelihoodHelp.short)}">
            ${ROI_DEMO_EVENT_LIKELIHOODS.map((likelihood) => {
              const help = sampleFieldBehaviorExplainer('eventLikelihood', likelihood);
              return `<option value="${escapeAttr(likelihood)}" ${state.eventLikelihood === likelihood ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiEventLikelihoodLabel(likelihood))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('eventLikelihood', `Explain ${roiEventLikelihoodLabel(state.eventLikelihood)}`)}
        <label class="compact-field">
          Source Dynamics
          <select id="roi-demo-event-likelihood-dynamics">
            ${ROI_DEMO_LIKELIHOOD_DYNAMICS.map((mode) => `<option value="${escapeAttr(mode)}" ${state.eventLikelihoodDynamics === mode ? 'selected' : ''}>${escapeHtml(roiLikelihoodDynamicsLabel(mode))}</option>`).join('')}
          </select>
        </label>
        ${state.eventLikelihoodDynamics === 'dynamic' ? `
          <label class="compact-field">
            Source Temporal Pattern
            <select id="roi-demo-event-likelihood-temporal-pattern">
              ${ROI_DEMO_TEMPORAL_PATTERNS.map((pattern) => `<option value="${escapeAttr(pattern)}" ${state.eventLikelihoodTemporalPattern === pattern ? 'selected' : ''}>${escapeHtml(roiTemporalPatternLabel(pattern))}</option>`).join('')}
            </select>
          </label>
          <label class="compact-field">
            Source Spatial Evolution
            <select id="roi-demo-event-likelihood-spatial-evolution">
              ${ROI_DEMO_SPATIAL_EVOLUTIONS.map((evolution) => `<option value="${escapeAttr(evolution)}" ${state.eventLikelihoodSpatialEvolution === evolution ? 'selected' : ''}>${escapeHtml(roiLikelihoodSpatialEvolutionLabel(evolution))}</option>`).join('')}
            </select>
          </label>
          <div class="hud-muted">Dynamic source changes L(x,y,t) over time.</div>
        ` : ''}
        ${compactMetricChipsHtml([
          ['active', formatPercent(state.activityDiagnostics?.likelihood?.activeLikelihoodCellFraction)],
          ['high', formatPercent(state.activityDiagnostics?.likelihood?.highLikelihoodCellFraction)],
          ['modes', String(state.activityDiagnostics?.likelihood?.modeCount ?? 0)]
        ])}
      </section>
  `;
}

export function samplingSpatialPatternSectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="spatialPattern">
        <h2 title="${escapeAttr(state.spatialHelp.groupSummary)}">Spatial Pattern / Geometry <span aria-label="Pattern help" title="${escapeAttr(state.spatialHelp.short)}">i</span></h2>
        <div class="hud-muted">Geometry of S(x,y,t).</div>
        <label class="compact-field" title="${escapeAttr(state.spatialHelp.short)}">
          <span>Spatial Pattern <span aria-label="Pattern help" title="${escapeAttr(state.spatialHelp.short)}">i</span></span>
          <select id="roi-demo-spatial-pattern" title="${escapeAttr(state.spatialHelp.short)}">
            ${ROI_DEMO_PURE_SPATIAL_PATTERNS.map((pattern) => {
              const help = sampleFieldBehaviorExplainer('spatialPattern', pattern);
              return `<option value="${escapeAttr(pattern)}" ${state.spatialPattern === pattern ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiPureSpatialPatternLabel(pattern))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('spatialPattern', `Explain ${roiPureSpatialPatternLabel(state.spatialPattern)}`)}
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
        <div class="hud-muted">Clusters: ${escapeHtml(state.clusterCount ?? state.hotspotCount ?? 3)} · ${escapeHtml(roiClusterSizeLabel(state.clusterSize))}</div>
      </section>
  `;
}

export function samplingValueDistributionSectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="valueDistribution">
        <h2 title="${escapeAttr(state.valueDistributionHelp.groupSummary)}">Value Distribution <span aria-label="Value Distribution help" title="${escapeAttr(state.valueDistributionHelp.short)}">i</span></h2>
        <div class="hud-muted">Magnitude shape inside the geometry.</div>
        <label class="compact-field" title="${escapeAttr(state.valueDistributionHelp.short)}">
          <span>Value Distribution <span aria-label="Value Distribution help" title="${escapeAttr(state.valueDistributionHelp.short)}">i</span></span>
          <select id="roi-demo-value-distribution" title="${escapeAttr(state.valueDistributionHelp.short)}">
            ${ROI_DEMO_VALUE_DISTRIBUTIONS.map((distribution) => {
              const help = sampleFieldBehaviorExplainer('valueDistribution', distribution);
              return `<option value="${escapeAttr(distribution)}" ${state.valueDistribution === distribution ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiValueDistributionLabel(distribution))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('valueDistribution', `Explain ${roiValueDistributionLabel(state.valueDistribution)}`)}
      </section>
  `;
}

export function samplingTemporalPatternSectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="temporalPattern">
        <h2 title="${escapeAttr(state.temporalHelp.groupSummary)}">Temporal Pattern <span aria-label="Temporal Pattern help" title="${escapeAttr(state.temporalHelp.short)}">i</span></h2>
        <div class="hud-muted">How S(x,y,t) changes over time.</div>
        <label class="compact-field">
          Time Mode
          <select id="roi-demo-time-mode">
            ${ROI_DEMO_TIME_MODES.map((mode) => `<option value="${escapeAttr(mode)}" ${state.timeMode === mode ? 'selected' : ''}>${escapeHtml(mode === 'dynamic' ? 'Dynamic' : 'Static')}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field" title="${escapeAttr(state.temporalHelp.short)}">
          Temporal Pattern
          <select id="roi-demo-temporal-pattern" title="${escapeAttr(state.temporalHelp.short)}">
            ${ROI_DEMO_TEMPORAL_PATTERNS.map((pattern) => {
              const help = sampleFieldBehaviorExplainer('temporalPattern', pattern);
              return `<option value="${escapeAttr(pattern)}" ${state.temporalPattern === pattern ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiTemporalPatternLabel(pattern))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('temporalPattern', `Explain ${roiTemporalPatternLabel(state.temporalPattern)}`)}
      </section>
  `;
}

export function samplingSpatialEvolutionSectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="spatialEvolution">
        <h2 title="${escapeAttr(state.evolutionHelp.groupSummary)}">Spatial Evolution / Motion Rule <span aria-label="Spatial Evolution help" title="${escapeAttr(state.evolutionHelp.short)}">i</span></h2>
        <div class="hud-muted">How the pattern moves, spreads, or mutates.</div>
        <label class="compact-field" title="${escapeAttr(state.evolutionHelp.short)}">
          Spatial Evolution
          <select id="roi-demo-spatial-evolution" title="${escapeAttr(state.evolutionHelp.short)}">
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
        <div class="hud-muted">Motion: ${escapeHtml(roiMotionScopeLabel(state.motionScope ?? 'perFeature'))}</div>
        <label class="compact-field">
          Dynamic Complexity
          <select id="roi-demo-dynamic-complexity">
            ${ROI_DEMO_DYNAMIC_COMPLEXITY.map((level) => `<option value="${escapeAttr(level)}" ${state.dynamicComplexity === level ? 'selected' : ''}>${escapeHtml(dynamicComplexityLabel(level))}</option>`).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('spatialEvolution', `Explain ${roiSpatialEvolutionLabel(state.spatialEvolution ?? state.patternEvolution)}`)}
      </section>
  `;
}

export function samplingInteractionScaleSectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="interactionScale">
        <h2 title="${escapeAttr(state.interactionHelp.groupSummary)}">Interaction Scale / Hierarchy <span aria-label="Interaction Scale help" title="${escapeAttr(state.interactionHelp.short)}">i</span></h2>
        <div class="hud-muted">Whether behavior is field-wide, clustered, local, or edge-based.</div>
        <label class="compact-field" title="${escapeAttr(state.interactionHelp.short)}">
          Interaction Scale
          <select id="roi-demo-interaction-scale" title="${escapeAttr(state.interactionHelp.short)}">
            ${ROI_DEMO_INTERACTION_SCALES.map((scale) => {
              const help = sampleFieldBehaviorExplainer('interactionScale', scale);
              return `<option value="${escapeAttr(scale)}" ${state.interactionScale === scale ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiInteractionScaleLabel(scale))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('interactionScale', `Explain ${roiInteractionScaleLabel(state.interactionScale)}`)}
      </section>
  `;
}

export function samplingStateUpdateSectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="stateUpdateRule">
        <h2 title="${escapeAttr(state.stateHelp.groupSummary)}">State Model / Update Rule <span aria-label="State Model help" title="${escapeAttr(state.stateHelp.short)}">i</span></h2>
        <div class="hud-muted">Memory/update model for the field.</div>
        <label class="compact-field" title="${escapeAttr(state.stateHelp.short)}">
          State Model
          <select id="roi-demo-state-model" title="${escapeAttr(state.stateHelp.short)}">
            ${ROI_DEMO_STATE_MODELS.map((model) => {
              const help = sampleFieldBehaviorExplainer('stateModel', model);
              return `<option value="${escapeAttr(model)}" ${state.stateModel === model ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiStateModelLabel(model))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('stateModel', `Explain ${state.stateModelLabel}`)}
      </section>
  `;
}

export function samplingEffectSectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="samplingEffect">
        <h2 title="${escapeAttr(state.samplingHelp.groupSummary)}">Sampling Effect / Freshness <span aria-label="Sampling Effect help" title="${escapeAttr(state.samplingHelp.short)}">i</span></h2>
        <div class="hud-muted">Synthetic sampling/freshness effect.</div>
        <label class="compact-field" title="${escapeAttr(state.samplingHelp.short)}">
          Depletion
          <select id="roi-demo-depletion-mode" title="${escapeAttr(state.samplingHelp.short)}">
            ${ROI_DEMO_DEPLETION_MODES.map((mode) => {
              const help = sampleFieldBehaviorExplainer('samplingEffect', mode);
              return `<option value="${escapeAttr(mode)}" ${state.depletionMode === mode ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiDepletionModeLabel(mode))}</option>`;
            }).join('')}
          </select>
        </label>
        <div class="hud-muted">Demo-only unless tied to actual mission visits.</div>
        ${roiHelpButtonHtml('samplingEffect', `Explain ${roiDepletionModeLabel(state.depletionMode)}`)}
      </section>
  `;
}

export function samplingDisplaySectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="display">
        <h2 title="${escapeAttr(state.displayHelp.groupSummary)}">Display / Diagnostic Layer <span aria-label="Display Layer help" title="${escapeAttr(state.displayHelp.short)}">i</span></h2>
        <div class="hud-muted">Choose the layer shown on the canvas.</div>
        <div class="hud-muted">${escapeHtml(state.displayModeCaption ?? roiDisplayModeCaption(state.displayMode))}</div>
        <label class="compact-field" title="${escapeAttr(state.displayHelp.short)}">
          Display Layer
          <select id="roi-demo-display-mode" title="${escapeAttr(state.displayHelp.short)}">
            ${ROI_DEMO_DISPLAY_MODES.map((mode) => {
              const help = sampleFieldBehaviorExplainer('displayLayer', mode);
              return `<option value="${escapeAttr(mode)}" ${state.displayMode === mode ? 'selected' : ''} title="${escapeAttr(help.short)}">${escapeHtml(roiDisplayModeLabel(mode))}</option>`;
            }).join('')}
          </select>
        </label>
        ${roiViewFilterControlsHtml({ ...state, forceViewFilters: state.hasSection('graphFilters') })}
        <label class="compact-field">
          Time Speed
          <select id="roi-demo-time-speed">
            ${[0.5, 1, 2, 5].map((speed) => `<option value="${escapeAttr(speed)}" ${Number(state.timeSpeedScale ?? 1) === speed ? 'selected' : ''}>${escapeHtml(speed)}x</option>`).join('')}
          </select>
        </label>
        ${roiHelpButtonHtml('displayLayer', `Explain ${roiDisplayModeLabel(state.displayMode)}`)}
      </section>
  `;
}

export function samplingSeedSectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="seed">
        <h2>Seed / Scenario Identity</h2>
        <div class="hud-muted">Seeded instance identity.</div>
        <label class="compact-field">
          Seed
          <input id="roi-demo-seed" type="text" value="${escapeAttr(state.seed ?? 'anchor-roi-demo')}" />
        </label>
        <label class="compact-field">
          Noise / Texture
          <input id="roi-demo-noise" type="range" min="0" max="1" step="0.05" value="${escapeAttr(state.noise ?? 0.15)}" />
        </label>
        <button data-action="regenerate" class="console-button">Regenerate</button>
        <div class="hud-muted">Noise ${escapeHtml(Number(state.noise ?? 0.15).toFixed(2))}</div>
      </section>
  `;
}

export function samplingFieldStatsHtml(state) {
  return `
      <section class="console-status sampling-compact-summary" data-sampling-section="stats">
        <span>Field Stats</span>
        ${compactMetricChipsHtml([
          ['Mean', formatDemoStat(state.activityDiagnostics?.meanValue ?? state.stats?.mean)],
          ['Active', formatPercent(state.activityDiagnostics?.activeFraction)],
          ['High', formatPercent(state.activityDiagnostics?.highValueFraction)],
          ['Max', formatDemoStat(state.activityDiagnostics?.maxValue ?? state.stats?.max)],
          ['Messages', formatDemoStat(state.graphDiagnostics?.edgeMessageTotal ?? state.activityDiagnostics?.graphDiagnostics?.edgeMessageTotal)],
          ['Transitions', formatDemoStat(state.activityDiagnostics?.ruleEngineDiagnostics?.transitionCount)]
        ])}
        ${state.processMode === 'diagnosticsGraphInspection' ? `
          <details class="sampling-compact-details" open>
            <summary>Advanced Diagnostics</summary>
            <small>BBox ${escapeHtml(formatPercent(state.activityDiagnostics?.activeBoundingBoxCoverage))} · Components ${escapeHtml(String(state.activityDiagnostics?.connectedComponentCount ?? 0))} · Hotspots ${escapeHtml(String(state.activityDiagnostics?.activeHotspotCount ?? state.activityDiagnostics?.hotspotComponentCount ?? 0))} · L/S corr ${escapeHtml(formatDemoStat(state.activityDiagnostics?.likelihoodSampleCorrelation))} · Total ${escapeHtml(formatDemoStat(state.activityDiagnostics?.totalActivityMass ?? state.stats?.totalValue))}${escapeHtml(state.graphSummary)}</small>
          </details>
        ` : ''}
      </section>
  `;
}

export function samplingComponentIsolationHtml() {
  return `
      <section class="console-section" data-sampling-section="componentExamples" data-keep-title="true">
        <h2>Learn / Compare Components</h2>
        <details class="sampling-compact-details">
          <summary>Compare presets</summary>
          <div class="hud-muted">Hold most components fixed and compare one change.</div>
          <div class="console-button-row wrap">
            <button data-action="roi-compare-temporal" class="console-button secondary">Compare Temporal Patterns</button>
            <button data-action="roi-compare-evolution" class="console-button secondary">Compare Spatial Evolution</button>
            <button data-action="roi-compare-scale" class="console-button secondary">Compare Interaction Scale</button>
          </div>
        </details>
      </section>
  `;
}

export function samplingProcessPaintSectionHtml(state = {}) {
  return `
      <section class="console-section" data-sampling-section="processPaintTools">
        <h2>Process Paint / Rule Allocation</h2>
        <div class="hud-muted">Paint states, rules, groups, and source values onto the grid.</div>
        <div class="status-card compact">
          <strong>Process Paint: paused editing canvas</strong>
          <span>Status: ${escapeHtml(state.processStatusLabel ?? 'Custom Exploratory')}</span>
          <span>Brush size: single cell</span>
        </div>
        <label class="compact-field">
          Start From
          <select id="sampling-paint-start-mode">
            <option value="blankCanvas" ${state.paintStartMode === 'blankCanvas' ? 'selected' : ''}>Blank Canvas</option>
            <option value="currentSnapshot" disabled>Current Field Snapshot (coming soon)</option>
            <option value="referenceInitialState" disabled>Current Process Pattern Initial State (coming soon)</option>
          </select>
        </label>
        <label class="compact-field">
          Paint State
          <select id="sampling-paint-state">
            ${(state.validPaintStates ?? state.processStates ?? []).map((processState) => `<option value="${escapeAttr(processState)}" ${state.selectedPaintState === processState ? 'selected' : ''}>${escapeHtml(processState)}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Paint Rule
          <select id="sampling-paint-rule">
            ${samplingProcessRuleOptgroupHtml('Basic', state.basicProcessRules ?? [], state.selectedPaintRuleId)}
            ${samplingProcessRuleOptgroupHtml('Advanced', state.advancedProcessRules ?? [], state.selectedPaintRuleId)}
          </select>
        </label>
        <label class="compact-field">
          Paint Group
          <input id="sampling-paint-group" type="number" min="0" max="99" value="${escapeAttr(state.selectedPaintGroupId ?? 1)}" />
        </label>
        <label class="compact-field">
          Source Value
          <input id="sampling-paint-source" type="range" min="0" max="1" step="0.05" value="${escapeAttr(state.selectedPaintSourceValue ?? 1)}" />
        </label>
        <div class="console-button-row">
          <button type="button" data-action="sampling-paint-assign" class="console-button">Apply to Cell</button>
          <button type="button" data-action="sampling-paint-clear" class="console-button secondary">Clear Cell</button>
          <button type="button" data-action="sampling-paint-reset" class="console-button secondary">Clear Canvas</button>
        </div>
        <div class="console-button-row wrap">
          <button type="button" data-action="sampling-paint-randomize" class="console-button secondary">Randomize Canvas</button>
          <button type="button" data-action="sampling-paint-run" class="console-button">Run Process</button>
          <button type="button" data-action="sampling-paint-export" class="console-button secondary">Export Process Recipe</button>
        </div>
        <div class="hud-muted">Painted cells: ${escapeHtml(state.paintValidation?.paintedCellCount ?? 0)} | groups: ${escapeHtml(state.paintValidation?.groupCount ?? 0)} | validation: ${escapeHtml(state.paintValidation?.status ?? 'PASS')}</div>
      </section>
  `;
}

export function samplingRandomRuleLabSectionHtml(state = {}) {
  return `
      <section class="console-section" data-sampling-section="randomRuleLab">
        <h2>Random Rule Lab</h2>
        <div class="hud-muted">Generate a seeded random state/rule/group allocation.</div>
        <label class="compact-field">
          Randomization Mode
          <select id="sampling-random-mode">
            <option value="exploratoryMixedRules" ${state.randomRuleMode !== 'scientificRandomization' ? 'selected' : ''}>Exploratory Mixed Rules</option>
            <option value="scientificRandomization" ${state.randomRuleMode === 'scientificRandomization' ? 'selected' : ''}>Scientific Randomization</option>
          </select>
        </label>
        <label class="compact-field">
          Seed
          <input id="sampling-random-seed" type="text" value="${escapeAttr(state.randomRuleSeed ?? 'sampling-random-001')}" />
        </label>
        <label class="compact-field">
          Group Count
          <input id="sampling-random-groups" type="number" min="1" max="16" value="${escapeAttr(state.randomRuleGroupCount ?? 4)}" />
        </label>
        <label class="compact-field">
          Active Fraction
          <input id="sampling-random-density" type="number" min="0" max="1" step="0.01" value="${escapeAttr(state.randomRuleActiveFraction ?? 0.18)}" />
        </label>
        <button type="button" data-action="sampling-random-generate" class="console-button">Generate Seeded Allocation</button>
        <div class="hud-muted">Status: ${escapeHtml(state.processStatusLabel ?? 'Custom Exploratory')}</div>
      </section>
  `;
}

export function samplingDiagnosticsFilterSectionHtml(state) {
  return roiViewFilterControlsHtml({ ...state, forceViewFilters: true });
}

export function samplingExportSectionHtml(state) {
  return `
      <section class="console-section" data-sampling-section="export">
        <h2>Export</h2>
        ${demoExportControlsHtml(state)}
        <button data-action="export-demo-json" class="console-button">Export Demo JSON</button>
        <details class="sampling-compact-details">
          <summary>Export contents</summary>
          <div class="hud-muted">Includes S(x,y,t), Source Field mesh, graph metadata, process layers, config, and inspector state.</div>
        </details>
        ${state.hasSection('scenarioGeneration') ? samplingScenarioGenerationSectionHtml(state) : ''}
      </section>
  `;
}

export function samplingScenarioGenerationSectionHtml(state) {
  return `
        <h2>Scenario Generation</h2>
        ${roiScenarioControlsHtml(state)}
        <div class="console-button-row">
          <button data-action="generate-roi-scenario" class="console-button">Generate Scenario</button>
          <button data-action="export-roi-scenario" class="console-button">Export Scenario JSON</button>
        </div>
        <details class="sampling-compact-details">
          <summary>Scenario export notes</summary>
          <div class="hud-muted">Creates a bounded educational time-series scenario for replay and validation.</div>
        </details>
  `;
}

export function samplingFooterHtml(state) {
  return `
      <section class="console-footer">
        <div class="hud-muted">ROI Demo UI: ${escapeHtml(state.uiVersion ?? 'reference-signature-primary-ui-v1')} | Loaded process patterns: ${escapeHtml(state.referenceSignatureCount ?? ROI_REFERENCE_SIGNATURES.length)} | Legacy presets loaded: ${escapeHtml(state.legacyPresetCount ?? SAMPLE_FIELD_BEHAVIOR_PRESETS.length)} | Legacy presets visible: ${escapeHtml(state.legacyPresetsVisible ? 'true' : 'false')}</div>
        <button data-action="menu" class="console-button secondary">Main Menu</button>
      </section>
  `;
}

function samplingProcessModeControlsHtml(state = {}) {
  if (state.processMode === 'processPaint') return samplingProcessSectionHtml('processPaintTools', state);
  if (state.processMode === 'randomRuleLab') return samplingProcessSectionHtml('randomRuleLab', state);
  return '';
}

function samplingProcessConsoleContext(state = {}) {
  const stateModel = state.stateModel ?? roiStateModelForEvolutionModel(state.evolutionModel);
  const stateModelLabel = state.stateModelLabel ?? roiStateModelLabel(stateModel);
  const stateModelDescription = state.stateModelDescription ?? roiStateModelDescription(stateModel);
  const presetHelp = sampleFieldBehaviorExplainer('behaviorPreset', state.behaviorPresetId);
  const patternSource = state.patternSource === 'legacyPreset'
    ? 'legacyPreset'
    : state.patternSource === 'custom' || state.referenceSignatureId === CUSTOM_REFERENCE_SIGNATURE_ID
      ? 'custom'
      : 'referenceSignature';
  const legacyPresetsVisible = Boolean(state.legacyPresetsVisible || globalThis.ANCHOR_DEBUG_ROI_LEGACY_PRESETS);
  const activeReferenceSignature = referenceSignatureById(state.referenceSignatureId) ?? state.referenceSignature ?? null;
  const presetStatus = state.behaviorPresetId && state.behaviorPresetId !== CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID
    ? state.behaviorPresetModified ? `Modified from ${state.behaviorPresetLabel}` : `Preset: ${state.behaviorPresetLabel}`
    : 'Preset: Custom';
  const referenceStatus = activeReferenceSignature
    ? `${activeReferenceSignature.label ?? referenceSignatureLabel(activeReferenceSignature.id)}${state.referenceSignatureModified ? ' (modified)' : ''}`
    : 'None';
  const graphDiagnostics = state.activityDiagnostics?.graphDiagnostics ?? state.graphField?.diagnostics;
  const graphSummary = graphDiagnostics
    ? ` | Graph ${graphDiagnostics.updateRule} | clusters ${graphDiagnostics.clusterCount ?? 0}/${graphDiagnostics.activeClusterCount ?? 0} active | active nodes ${graphDiagnostics.activeNodeCount ?? 0} | messages ${formatDemoStat(graphDiagnostics.edgeMessageTotal)} | states ${Object.entries(graphDiagnostics.stateCounts ?? {}).map(([key, value]) => `${key}:${value}`).join(', ')}`
    : '';
  const uiConfig = samplingProcessUiConfig(state.processMode);
  const hasSection = (sectionId) => samplingProcessModeHasSection(state.processMode, sectionId);
  const likelihoodModeText = state.activityDiagnostics?.recurringHotspots?.modeCount
    ? `${roiEventLikelihoodLabel(state.eventLikelihood)} (${roiLikelihoodDynamicsLabel(state.eventLikelihoodDynamics)}, ${state.activityDiagnostics.recurringHotspots.modeCount} separated basins)`
    : `${roiEventLikelihoodLabel(state.eventLikelihood)} (${state.eventLikelihoodDynamics === 'dynamic' ? `${roiTemporalPatternLabel(state.eventLikelihoodTemporalPattern)} / ${roiLikelihoodSpatialEvolutionLabel(state.eventLikelihoodSpatialEvolution)}` : 'Static'})`;
  const summaryRows = [
    ['Active Source', patternSourceLabel(patternSource)],
    ['Pattern', patternSource === 'referenceSignature' ? referenceStatus : 'None'],
    ['Source Field', likelihoodModeText],
    ['Spatial Pattern', state.spatialPatternLabel ?? roiPureSpatialPatternLabel(state.spatialPattern)],
    ['Value Distribution', state.valueDistributionLabel ?? roiValueDistributionLabel(state.valueDistribution)],
    ['Temporal Pattern', state.temporalPatternLabel ?? roiTemporalPatternLabel(state.temporalPattern)],
    ['Spatial Evolution', state.spatialEvolutionLabel ?? roiSpatialEvolutionLabel(state.spatialEvolution ?? state.patternEvolution)],
    ['Interaction Scale', state.interactionScaleLabel ?? roiInteractionScaleLabel(state.interactionScale)],
    ['State Update', stateModelLabel],
    ['Sampling', roiDepletionModeLabel(state.depletionMode)]
  ];
  const recipeSummary = compactRecipeSummary(state, stateModelLabel);
  const recipeChipRows = [
    ['Source', state.eventLikelihoodLabel ?? roiEventLikelihoodLabel(state.eventLikelihood)],
    ['Temporal', state.temporalPatternLabel ?? roiTemporalPatternLabel(state.temporalPattern)],
    ['Evolution', state.spatialEvolutionLabel ?? roiSpatialEvolutionLabel(state.spatialEvolution ?? state.patternEvolution)],
    ['State', stateModelLabel],
    ['Sampling', state.depletionModeLabel ?? roiDepletionModeLabel(state.depletionMode)]
  ];
  const sourceSummaryRows = patternSource === 'referenceSignature'
    ? [
        ['Active Source', 'Example Processes'],
        ['Pattern', referenceStatus],
        ['Modified', state.referenceSignatureModified ? 'yes' : 'no'],
        ['Modified component', state.componentHint?.label ?? 'none'],
        ['Recipe', recipeSummary]
      ]
    : patternSource === 'legacyPreset'
      ? [
          ['Active Source', 'Legacy Preset'],
          ['Preset', state.behaviorPresetLabel ?? 'Unknown'],
          ['Mapped Process Pattern', state.referenceSignature?.label ?? 'None'],
          ['Mode', 'Legacy compatibility mode'],
          ['Recipe', recipeSummary]
        ]
      : [
          ['Active Source', 'Custom Component Recipe'],
          ['Process Pattern', 'none'],
          ['Recipe', recipeSummary]
        ];
  return {
    ...state,
    __samplingProcessConsoleContext: true,
    stateModel,
    stateModelLabel,
    stateModelDescription,
    presetHelp,
    selectedPreset: sampleFieldBehaviorPresetById(state.behaviorPresetId),
    patternSource,
    legacyPresetsVisible,
    activeReferenceSignature,
    presetStatus,
    referenceStatus,
    eventLikelihoodHelp: sampleFieldBehaviorExplainer('eventLikelihood', state.eventLikelihood),
    spatialHelp: sampleFieldBehaviorExplainer('spatialPattern', state.spatialPattern),
    temporalHelp: sampleFieldBehaviorExplainer('temporalPattern', state.temporalPattern),
    evolutionHelp: sampleFieldBehaviorExplainer('spatialEvolution', state.spatialEvolution ?? state.patternEvolution),
    interactionHelp: sampleFieldBehaviorExplainer('interactionScale', state.interactionScale),
    stateHelp: sampleFieldBehaviorExplainer('stateModel', stateModel),
    valueDistributionHelp: sampleFieldBehaviorExplainer('valueDistribution', state.valueDistribution),
    samplingHelp: sampleFieldBehaviorExplainer('samplingEffect', state.depletionMode),
    displayHelp: sampleFieldBehaviorExplainer('displayLayer', state.displayMode),
    graphDiagnostics,
    graphSummary,
    uiConfig,
    hasSection,
    likelihoodModeText,
    summaryRows,
    recipeSummary,
    recipeChipRows,
    sourceSummaryRows
  };
}

function roiViewFilterControlsHtml(state = {}) {
  if (!state.forceViewFilters && !roiDemoDisplayModeNeedsViewFilters(state.displayMode)) return '';
  const filters = state.viewFilters ?? {};
  const nodeStates = filters.nodeStates ?? {};
  const messageTypes = filters.messageTypes ?? {};
  return `
    <div class="roi-view-filter-panel">
      <div class="hud-muted">Layer filters reduce graph clutter; hidden items are still exported unless the export explicitly stores filtered views.</div>
      <div class="console-button-row wrap">
        ${ROI_DEMO_NODE_STATES.map((nodeState) => `
          <label class="compact-field">
            ${escapeHtml(nodeState)}
            <input type="checkbox" data-roi-node-state-filter="${escapeAttr(nodeState)}" ${nodeStates[nodeState] !== false ? 'checked' : ''} />
          </label>
        `).join('')}
      </div>
      <label class="compact-field">
        Transition nodes only
        <input id="roi-filter-transition-only" type="checkbox" ${filters.transitionNodesOnly ? 'checked' : ''} />
      </label>
      <label class="compact-field">
        Fade inactive nodes
        <input id="roi-filter-fade-inactive" type="checkbox" ${filters.fadeInactiveNodes !== false ? 'checked' : ''} />
      </label>
      <div class="console-button-row wrap">
        <label class="compact-field">Topology edges <input id="roi-filter-topology-edges" type="checkbox" ${filters.showTopologyEdges !== false ? 'checked' : ''} /></label>
        <label class="compact-field">Active message edges <input id="roi-filter-message-edges" type="checkbox" ${filters.showActiveMessageEdges !== false ? 'checked' : ''} /></label>
        <label class="compact-field">Top messages <input id="roi-filter-top-messages" type="checkbox" ${filters.showTopMessagesOnly !== false ? 'checked' : ''} /></label>
      </div>
      <label class="compact-field">
        Message threshold
        <input id="roi-filter-message-threshold" type="range" min="0" max="1" step="0.01" value="${escapeAttr(filters.messageStrengthThreshold ?? 0.12)}" />
      </label>
      <label class="compact-field">
        Max messages
        <input id="roi-filter-max-messages" type="number" min="1" max="500" step="1" value="${escapeAttr(filters.maxMessages ?? 80)}" />
      </label>
      <div class="console-button-row wrap">
        ${ROI_DEMO_MESSAGE_TYPES.map((type) => `
          <label class="compact-field">
            ${escapeHtml(type)}
            <input type="checkbox" data-roi-message-type-filter="${escapeAttr(type)}" ${messageTypes[type] !== false ? 'checked' : ''} />
          </label>
        `).join('')}
      </div>
      <div class="console-button-row wrap">
        <label class="compact-field">Same community <input id="roi-filter-same-community" type="checkbox" ${filters.sameCommunity !== false ? 'checked' : ''} /></label>
        <label class="compact-field">Cross community <input id="roi-filter-cross-community" type="checkbox" ${filters.crossCommunity !== false ? 'checked' : ''} /></label>
        <label class="compact-field">Incoming selected <input id="roi-filter-incoming-selected" type="checkbox" ${filters.incomingToSelected ? 'checked' : ''} /></label>
        <label class="compact-field">Outgoing selected <input id="roi-filter-outgoing-selected" type="checkbox" ${filters.outgoingFromSelected ? 'checked' : ''} /></label>
        <label class="compact-field">Selected neighborhood <input id="roi-filter-neighborhood" type="checkbox" ${filters.selectedNeighborhood !== false ? 'checked' : ''} /></label>
      </div>
      <label class="compact-field">
        ROI Meaning Layer
        <select id="roi-filter-meaning-layer">
          ${ROI_DEMO_ROI_MEANING_LAYERS.map((layer) => `<option value="${escapeAttr(layer)}" ${filters.roiMeaningLayer === layer ? 'selected' : ''}>${escapeHtml(roiMeaningLayerLabel(layer))}</option>`).join('')}
        </select>
      </label>
      <div class="hud-muted">ROI Meaning is a conservative derived overlay from S, L, node state, messages, and transitions.</div>
    </div>
  `;
}

function roiMeaningLayerLabel(value) {
  return {
    all: 'All ROI roles',
    current: 'Current ROI',
    nearFuture: 'Near-Future ROI',
    depleted: 'Low / Depleted / Dead',
    transitionBoundary: 'Transition Boundary'
  }[value] ?? 'All ROI roles';
}

function dynamicComplexityLabel(level) {
  return {
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[level] ?? 'High';
}

function patternSourceLabel(source) {
  return {
    referenceSignature: 'Example Processes',
    custom: 'Custom Component Recipe',
    legacyPreset: 'Legacy Preset'
  }[source] ?? 'Example Processes';
}

function compactRecipeSummary(state = {}, stateModelLabel = '') {
  return [
    state.eventLikelihoodLabel ?? roiEventLikelihoodLabel(state.eventLikelihood),
    state.spatialPatternLabel ?? roiPureSpatialPatternLabel(state.spatialPattern),
    state.valueDistributionLabel ?? roiValueDistributionLabel(state.valueDistribution),
    state.temporalPatternLabel ?? roiTemporalPatternLabel(state.temporalPattern),
    state.spatialEvolutionLabel ?? roiSpatialEvolutionLabel(state.spatialEvolution ?? state.patternEvolution),
    state.interactionScaleLabel ?? roiInteractionScaleLabel(state.interactionScale),
    stateModelLabel,
    state.depletionModeLabel ?? roiDepletionModeLabel(state.depletionMode)
  ].filter(Boolean).join(' + ');
}

function compactChipRowHtml(rows = []) {
  if (!rows.length) return '';
  return `
    <div class="sampling-chip-row">
      ${rows.map(([label, value]) => `<span class="sampling-chip" title="${escapeAttr(label)}">${escapeHtml(value)}</span>`).join('')}
    </div>
  `;
}

function compactMetricChipsHtml(rows = []) {
  return `
    <div class="sampling-metric-chips">
      ${rows.map(([label, value]) => `
        <span class="sampling-metric-chip">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(value)}</strong>
        </span>
      `).join('')}
    </div>
  `;
}

function compactKeyValueRowsHtml(rows = []) {
  return `
    <div class="sampling-compact-rows">
      ${rows.map(([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('')}
    </div>
  `;
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

function roiScenarioControlsHtml(state = {}) {
  const source = state.scenarioSourceMode === 'behaviorFamily' ? 'behaviorFamily' : 'currentRecipe';
  const difficulty = ['easy', 'medium', 'hard'].includes(state.scenarioDifficulty) ? state.scenarioDifficulty : 'medium';
  const validationMode = state.scenarioValidationMode === 'allowWarn' ? 'allowWarn' : 'requirePass';
  const duration = Math.max(1, Math.round(Number(state.scenarioDuration) || 120));
  const frameCount = Math.max(1, Math.min(240, Math.round(Number(state.scenarioFrameCount) || 25)));
  const summary = state.scenarioSummary ?? null;
  return `
    <label class="compact-field">
      Scenario Source
      <select id="roi-scenario-source">
        <option value="currentRecipe" ${source === 'currentRecipe' ? 'selected' : ''}>Current Component Recipe</option>
        <option value="behaviorFamily" ${source === 'behaviorFamily' ? 'selected' : ''}>Active Pattern Source</option>
      </select>
    </label>
    <label class="compact-field">
      Scenario Seed
      <input id="roi-scenario-seed" type="text" value="${escapeAttr(state.scenarioSeed ?? 'scenario-test-001')}" />
    </label>
    <label class="compact-field">
      Difficulty
      <select id="roi-scenario-difficulty">
        ${['easy', 'medium', 'hard'].map((value) => `<option value="${escapeAttr(value)}" ${difficulty === value ? 'selected' : ''}>${escapeHtml(value[0].toUpperCase() + value.slice(1))}</option>`).join('')}
      </select>
    </label>
    <label class="compact-field">
      Duration (s)
      <input id="roi-scenario-duration" type="number" min="1" step="1" value="${escapeAttr(duration)}" />
    </label>
    <label class="compact-field">
      Frame Count
      <input id="roi-scenario-frame-count" type="number" min="1" max="240" step="1" value="${escapeAttr(frameCount)}" />
    </label>
    <label class="compact-field">
      Validation
      <select id="roi-scenario-validation-mode">
        <option value="requirePass" ${validationMode === 'requirePass' ? 'selected' : ''}>Require PASS Before Export</option>
        <option value="allowWarn" ${validationMode === 'allowWarn' ? 'selected' : ''}>Allow WARN Export</option>
      </select>
    </label>
    ${summary ? `
      <div class="console-status compact-status">
        <span>Scenario Validation</span>
        <strong>${escapeHtml(summary.validationStatus)} | ${escapeHtml(summary.family)} | ${escapeHtml(summary.frameCount)} frames / ${escapeHtml(summary.duration)}s</strong>
        <small>${escapeHtml(summary.validationSummary)}</small>
        <small>${escapeHtml(summary.observablePattern ?? '')}</small>
        <small>Mean active ${escapeHtml(formatDemoStat(summary.meanActiveFraction))} | high ${escapeHtml(formatDemoStat(summary.meanHighValueFraction))} | frame delta ${escapeHtml(formatDemoStat(summary.meanFrameDelta))} | process ${escapeHtml(summary.processClass ?? 'n/a')}</small>
        <small>${escapeHtml(summary.roiInterpretation ?? '')}</small>
        ${(summary.warnings ?? []).slice(0, 2).map((warning) => `<small>Warning: ${escapeHtml(warning)}</small>`).join('')}
        ${(summary.failures ?? []).slice(0, 2).map((failure) => `<small>Failure: ${escapeHtml(failure)}</small>`).join('')}
        ${(summary.recommendedFixes ?? []).slice(0, 2).map((fix) => `<small>Fix: ${escapeHtml(fix)}</small>`).join('')}
      </div>
    ` : '<div class="hud-muted">Export the current process pattern or custom recipe as a bounded time-series scenario.</div>'}
  `;
}

function samplingProcessRuleOptgroupHtml(label, rules = [], selectedRuleId = 'inert') {
  if (!rules.length) return '';
  return `<optgroup label="${escapeAttr(label)}">${rules.map((rule) => `<option value="${escapeAttr(rule.id)}" ${selectedRuleId === rule.id ? 'selected' : ''}>${escapeHtml(rule.label)}</option>`).join('')}</optgroup>`;
}

function formatExportTime(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
