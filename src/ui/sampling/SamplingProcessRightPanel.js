import {
  roiDepletionModeLabel,
  roiDisplayModeLabel,
  roiEventLikelihoodLabel,
  roiInteractionScaleLabel,
  roiPureSpatialPatternLabel,
  roiSpatialEvolutionLabel,
  roiStateModelLabel,
  roiTemporalPatternLabel,
  roiValueDistributionLabel,
  roiClusterSizeLabel
} from '../../core/demo/DemoRoiFields.js';
import { sampleFieldBehaviorExplainer, sampleFieldCompositionExplainer } from '../../core/demo/SampleFieldBehaviorExplainers.js';
import { formatObservableSignature } from '../../core/demo/roi/RoiReferenceSignatures.js';
import { normalizeProcessRuleId, processRuleLabel } from '../../core/demo/sampling/SamplingProcessRules.js';
import { processExampleTypeLabel } from '../../core/demo/sampling/SpatiotemporalProcessExamples.js';

export function roiPanelModeButtonsHtml(activeMode, hasSelectedCell, showPaintTools = false) {
  return `
    <div class="console-button-row wrap sampling-panel-tabs">
      ${showPaintTools ? panelModeButtonHtml('paintTools', 'Paint Tools', activeMode) : ''}
      ${panelModeButtonHtml('recipeSignature', 'Recipe', activeMode)}
      ${panelModeButtonHtml('cellInspector', hasSelectedCell ? 'Inspector' : 'Inspector', activeMode)}
      ${panelModeButtonHtml('behaviorHelp', 'Help', activeMode)}
      ${panelModeButtonHtml('diagnostics', 'Diagnostics', activeMode)}
    </div>
  `;
}

function panelModeButtonHtml(mode, label, activeMode) {
  const active = activeMode === mode;
  return `<button class="console-button secondary sampling-panel-tab ${active ? 'active sampling-panel-tab-active' : ''}" data-roi-panel-mode="${escapeAttr(mode)}" aria-selected="${active ? 'true' : 'false'}" ${active ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
}

export function roiRecipeSignatureHtml(state) {
  const source = state.patternSource ?? 'referenceSignature';
  const signature = state.referenceSignature;
  const example = state.spatiotemporalProcessExample ?? state.selectedProcessExample;
  const preset = state.behaviorPreset;
  const componentRows = componentRecipeRows(state.componentRecipe);
  const observable = signature?.expectedObservableSignature ?? {};
  const taxonomy = signature?.caTaxonomy ?? {};
  const modelGroups = referenceModelGroups(signature?.referenceModels ?? []);
  const modelPreview = (signature?.referenceModels ?? []).slice(0, 4);
  const hiddenModelCount = Math.max(0, (signature?.referenceModels ?? []).length - modelPreview.length);
  return `
    <section class="cell-inspector-shell recipe-signature-shell" data-roi-recipe-signature-view>
      ${roiPanelModeButtonsHtml('recipeSignature', Boolean(state.selectedCell))}
      <div class="cell-inspector-header">
        <span>Process Example View</span>
        <h2>${escapeHtml(source === 'referenceSignature' && (example || signature) ? example?.label ?? signature.label : source === 'legacyPreset' ? 'Legacy Preset Recipe' : 'Custom Component Recipe')}</h2>
        <p>${escapeHtml(source === 'referenceSignature' && signature
          ? `Deterministic / seeded process example: ${formatObservableSignature(signature.expectedObservableSignature)}`
          : source === 'legacyPreset'
            ? 'Legacy MVP preset compatibility view. The main taxonomy is Example Processes.'
            : 'Edit primitive components directly or choose an Example Process for a guided starting point.')}</p>
      </div>
      ${currentLabStateCardHtml(state)}
      ${source === 'referenceSignature' && signature ? `
        ${processExampleSummaryCardHtml(example, signature)}
        ${updateFunctionCardHtml(example, state.processMode)}
        <div class="cell-inspector-card selected" data-roi-reference-signature-help>
          <span>${escapeHtml(example?.exampleType ? processExampleTypeLabel(example.exampleType) : 'Observable Process Pattern')}</span>
          ${metricRows([
            ['example', `${example?.label ?? signature.label}${signature.modified ? ' (modified)' : ''}`],
            ['category', example?.processPatternFamily ?? signature.category],
            ['implementation fidelity', example?.implementationFidelity ?? 'observablePatternAnalog'],
            ['rule family', example?.ruleFamilyId ?? 'n/a'],
            ['observable process', formatObservableSignature(signature.expectedObservableSignature)],
            ['best views', (signature.bestDisplayLayers ?? []).join(', ')]
          ])}
          <small>Example Processes are deterministic or seeded CA/grid-process-inspired recipes. Sampling value is an optional interpretation layer, not the identity of this lab.</small>
        </div>
        <div class="cell-inspector-card">
          <span>Sampling Interpretation</span>
          ${metricRows([
            ['Current interpretation', signature.roiInterpretation?.current],
            ['Near-future interpretation', signature.roiInterpretation?.nearFuture],
            ['Depleted / Low-value', signature.roiInterpretation?.lowValue],
            ['Sampling intuition', signature.roiInterpretation?.samplingIntuition]
          ])}
        </div>
        <div class="cell-inspector-card">
          <span>Component Recipe</span>
          ${metricRows(componentRows)}
          <small>${escapeHtml(state.recipeSummary)}</small>
        </div>
        <div class="cell-inspector-card">
          <span>Inspired By</span>
          ${modelPreview.map((model) => `<p><strong>${escapeHtml(model.name)}</strong>: ${escapeHtml(model.usefulBehavior ?? model.usefulObservableBehavior)} <small>${escapeHtml(model.modelFamily ?? '')}</small></p>`).join('')}
          ${hiddenModelCount ? `<details><summary>More related models (${hiddenModelCount})</summary>${(signature.referenceModels ?? []).slice(modelPreview.length).map((model) => `<p><strong>${escapeHtml(model.name)}</strong>: ${escapeHtml(model.usefulBehavior ?? model.usefulObservableBehavior)}</p>`).join('')}</details>` : ''}
        </div>
        <div class="cell-inspector-card sampling-advanced-card">
          <span>Advanced Details</span>
          <details>
            <summary>CA taxonomy, QA, failure signs, and boundaries</summary>
            ${metricRows([
              ['update schedule', taxonomy.updateSchedule],
              ['stochasticity', taxonomy.stochasticity],
              ['state space', taxonomy.stateSpace],
              ['neighborhood', taxonomy.neighborhood],
              ['rule uniformity', taxonomy.ruleUniformity],
              ['memory', taxonomy.memory],
              ['phenotype class', taxonomy.phenotypeClass],
              ['coverage tags', (signature.referenceCoverageTags ?? signature.coverageTags ?? []).join(', ')],
              ['spatial QA', signature.qaExpectations?.expectedSpatialPattern],
              ['temporal QA', signature.qaExpectations?.expectedTemporalPattern],
              ['delta QA', signature.qaExpectations?.expectedDeltaBehavior],
              ['suggested metrics', (signature.qaExpectations?.suggestedMetrics ?? []).slice(0, 6).join(', ')],
              ['failure signs', (signature.failureSigns ?? []).join('; ') || 'n/a'],
              ['what this is not', signature.notA]
            ])}
            ${metricRows(Object.entries(modelGroups).map(([family, count]) => [family, `${count} model${count === 1 ? '' : 's'}`]))}
          </details>
        </div>
      ` : source === 'legacyPreset' ? `
        <div class="cell-inspector-card selected">
          <span>Legacy Preset</span>
          ${metricRows([
            ['preset', preset?.label],
            ['mapped example process', preset?.referenceSignature?.label ?? 'None'],
            ['compatibility note', 'Legacy presets are kept for old examples, exports, and debugging; Example Processes are the main educational workflow.']
          ])}
        </div>
      ` : `
        <div class="cell-inspector-card selected">
          <span>Component Composer Guide</span>
          <p>Custom mode edits Event Likelihood, Spatial Pattern, Value Distribution, Temporal Pattern, Spatial Evolution, Interaction Scale, State Model, Sampling Effect, and Display Layer directly.</p>
          <small>Choose an Example Process for a guided starting point, or click a cell to inspect local state.</small>
        </div>
      `}
      ${source === 'referenceSignature' && signature ? '' : `<div class="cell-inspector-card">
        <span>Component Recipe</span>
        ${metricRows(componentRows)}
        <small>${escapeHtml(state.recipeSummary)}</small>
      </div>`}
      ${state.componentHint ? `<div class="cell-inspector-card"><span>Modified Component</span>${metricRows([['component', state.componentHint.label], ['expected effect', state.componentHint.expectedEffect], ['recommended views', (state.componentHint.recommendedViews ?? []).join(', ')]])}</div>` : ''}
      ${(state.compatibilityWarnings ?? []).length ? `<div class="cell-inspector-card"><span>Compatibility Warnings</span><p>${escapeHtml(state.compatibilityWarnings.join('; '))}</p></div>` : ''}
    </section>
  `;
}

function processExampleSummaryCardHtml(example, signature) {
  if (!example) return '';
  const isFoundational = example.exampleType === 'foundationalCaModel';
  return `
        <div class="cell-inspector-card selected" data-process-example-summary>
          <span>${escapeHtml(isFoundational ? 'Foundational CA Model' : 'Observable Process Pattern')}</span>
          ${metricRows([
            ['example type', processExampleTypeLabel(example.exampleType)],
            ['model / family', example.modelFamily ?? example.processPatternFamily ?? signature?.category],
            ['implementation fidelity', example.implementationFidelity],
            ['rule family', example.ruleFamilyId],
            ['teaches', (example.teaches ?? example.coverageTags ?? []).slice(0, 5).join(', ') || 'deterministic process evolution'],
            ['not a', example.notA ?? signature?.notA]
          ])}
          <small>${escapeHtml(example.shortDescription ?? signature?.simplifiedClaim ?? '')}</small>
        </div>
  `;
}

function updateFunctionCardHtml(example, processMode) {
  const localUpdate = example?.localUpdateFunction ?? 'x_i(t+1) = f(x_i(t), N_i(t), theta_i)';
  const nonUniformUpdate = 'x_i(t+1) = f_{r(i)}(x_i(t), N_i(t), theta_i)';
  const globalUpdate = example?.globalUpdateFunction ?? 'X(t+1) = F(X(t))';
  const statements = example?.ruleStatement ?? [
    'A cell updates from prior state, neighboring cells, and parameters.',
    'Applying the local rule across space creates the next field.'
  ];
  return `
        <div class="cell-inspector-card" data-process-update-function-card>
          <span>Rule -> Update Function</span>
          <p>${escapeHtml(statements[0])}</p>
          ${metricRows([
            ['local update', localUpdate],
            ['global field', globalUpdate],
            ...(processMode === 'randomRuleLab' || example?.caTaxonomy?.ruleUniformity?.includes?.('non')
              ? [['non-uniform update', nonUniformUpdate]]
              : []),
            ['state variables', (example?.stateVariables ?? ['x_i(t)', 'N_i(t)', 'theta_i']).join(', ')],
            ['neighborhood', example?.neighborhoodDefinition ?? example?.caTaxonomy?.neighborhood ?? 'local or graph neighborhood']
          ])}
          <small>${escapeHtml(example?.whatTheUpdateFunctionShows ?? 'Cellular automata are concrete demonstrations; update functions are the general language; observable patterns are the behavior produced by those updates.')}</small>
        </div>
  `;
}

export function roiDiagnosticsHtml(state) {
  const diagnostics = state.activityDiagnostics ?? {};
  const graph = state.graphDiagnostics ?? {};
  return `
    <section class="cell-inspector-shell diagnostics-shell" data-roi-diagnostics-view>
      ${roiPanelModeButtonsHtml('diagnostics', Boolean(state.selectedCell), state.processMode === 'processPaint')}
      <div class="cell-inspector-header">
        <span>Validation / Diagnostics</span>
        <h2>Current Process Diagnostics</h2>
        <p>Lightweight checks for the active deterministic process example or custom component recipe.</p>
      </div>
      ${currentLabStateCardHtml(state)}
      <div class="cell-inspector-card selected">
        <span>Activity</span>
        ${metricRows([
          ['active fraction', formatPercent(diagnostics.activeFraction)],
          ['high fraction', formatPercent(diagnostics.highValueFraction)],
          ['mean value', formatStat(diagnostics.meanValue)],
          ['max value', formatStat(diagnostics.maxValue)],
          ['L/S correlation', formatStat(diagnostics.likelihoodSampleCorrelation)]
        ])}
      </div>
      <div class="cell-inspector-card" data-roi-field-process-stats>
        <span>Field / Process Stats</span>
        ${metricRows(fieldProcessStatsRows(state))}
      </div>
      <div class="cell-inspector-card">
        <span>Graph</span>
        ${metricRows([
          ['update rule', graph.updateRule],
          ['active nodes', graph.activeNodeCount],
          ['active clusters', graph.activeClusterCount],
          ['messages', formatStat(graph.edgeMessageTotal)],
          ['states', formatGraphStateSummary(graph.stateCounts)]
        ])}
      </div>
      <div class="cell-inspector-card">
        <span>Warnings</span>
        <p>${escapeHtml((diagnostics.diagnosticWarnings ?? []).join('; ') || 'none')}</p>
      </div>
    </section>
  `;
}

export function roiBehaviorHelpEmptyHtml(state = {}) {
  return `
    <section class="cell-inspector-shell behavior-help-shell" data-roi-behavior-help>
      ${roiPanelModeButtonsHtml('behaviorHelp', Boolean(state.selectedCell), state.processMode === 'processPaint')}
      <div class="cell-inspector-header">
        <span>Behavior Help</span>
        <h2>Behavior Help</h2>
        <p>Click an Explain button beside a Process Lab control to learn what that component does.</p>
      </div>
      <div class="cell-inspector-card">
        <strong>Available help</strong>
        <ul>
          <li>Event Likelihood Field</li>
          <li>Spatial Pattern / Geometry</li>
          <li>Value Distribution</li>
          <li>Temporal Pattern</li>
          <li>Spatial Evolution</li>
          <li>State Model / Memory</li>
          <li>Sampling Effects</li>
          <li>Display Layer</li>
        </ul>
      </div>
      <button class="console-button secondary" data-action="roi-show-cell-inspector">Show Cell Inspector</button>
    </section>
  `;
}

export function roiBehaviorHelpHtml(topic, state) {
  const optionId = topic.optionId ?? behaviorHelpOptionForGroup(topic.groupId, state);
  const help = sampleFieldBehaviorExplainer(topic.groupId, optionId);
  const composition = sampleFieldCompositionExplainer(state);
  return `
    <section class="cell-inspector-shell behavior-help-shell" data-roi-behavior-help>
      ${roiPanelModeButtonsHtml('behaviorHelp', Boolean(state.selectedCell), state.processMode === 'processPaint')}
      <div class="cell-inspector-header">
        <span>Behavior Help</span>
        <h2>About ${escapeHtml(help.groupLabel)}: ${escapeHtml(help.label)}</h2>
        <p>${escapeHtml(help.question)}</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Selected Behavior</span>
        ${metricRows([
          ['component', help.groupLabel],
          ['selected', help.label]
        ])}
        <small>${escapeHtml(help.short)}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Meaning</span>
        <p>${escapeHtml(help.meaning)}</p>
      </div>
      <div class="cell-inspector-card">
        <span>What This Component Changes</span>
        ${metricRows([
          ['changes', help.changes],
          ['should not change', help.shouldNotChange],
          ['look for', help.lookFor],
          ['useful views', (help.usefulDisplayLayers ?? []).join(', ') || 'n/a'],
          ['common confusion', help.commonConfusion]
        ])}
      </div>
      ${help.processContract ? `
        <div class="cell-inspector-card selected">
          <span>Recipe View</span>
          ${metricRows([
            ['preset', help.label],
            ['process class', help.processContract.processClass],
            ['process implementation', help.processContract.implementationType],
            ['domain analogies', (help.processContract.domainAnalogies ?? []).join(', ') || 'n/a'],
            ['simplified claim', help.processContract.simplifiedClaim],
            ['ROI interpretation', help.processContract.roiInterpretation],
            ['best display layers', (help.behaviorSignature?.bestViews ?? help.usefulDisplayLayers ?? []).join(', ') || 'n/a'],
            ['what this is not', help.boundaryNote]
          ])}
          ${recipeComponentTableHtml(help.recipeComponentRows ?? [])}
          <small>${escapeHtml(help.processContract.educationalPrompt ?? '')}</small>
        </div>
        <div class="cell-inspector-card">
          <span>Behavior Pattern</span>
          ${metricRows([
            ['observable pattern', help.behaviorSignature?.observablePattern],
            ['what changes over time', help.behaviorSignature?.timeBehavior],
            ['what makes cells important', help.behaviorSignature?.cellImportance],
            ['best views', (help.behaviorSignature?.bestViews ?? []).join(', ') || 'n/a'],
            ['failure signs', (help.behaviorSignature?.failureSigns ?? []).join('; ') || 'n/a']
          ])}
        </div>
        <div class="cell-inspector-card">
          <span>Sampling Interpretation</span>
          ${metricRows([
            ['current ROI', help.behaviorSignature?.roiMeaning?.current],
            ['near-future ROI', help.behaviorSignature?.roiMeaning?.nearFuture],
            ['low / depleted / dead region', help.behaviorSignature?.roiMeaning?.low],
            ['sampling intuition', help.behaviorSignature?.roiMeaning?.intuition]
          ])}
        </div>
        <div class="cell-inspector-card">
          <span>Validation Pattern</span>
          <p>${escapeHtml((help.validationSignature ?? []).join(', ') || 'n/a')}</p>
          <small>Validation checks whether seeded instances still express the intended simplified process.</small>
        </div>
      ` : ''}
      ${state.referenceSignature ? `
        <div class="cell-inspector-card selected">
          <span>Example Process</span>
          ${metricRows([
            ['example', `${state.exampleProcessLabel ?? state.referenceSignature.label}${state.referenceSignature.modified ? ' (modified)' : ''}`],
            ['category', state.referenceSignature.category],
            ['observable pattern', formatObservableSignature(state.referenceSignature.expectedObservableSignature)],
            ['simplified claim', state.referenceSignature.simplifiedClaim],
            ['CA taxonomy', Object.values(state.referenceSignature.caTaxonomy ?? {}).filter(Boolean).join(', ')],
            ['QA metrics', (state.referenceSignature.qaExpectations?.suggestedMetrics ?? []).slice(0, 6).join(', ')],
            ['best display layers', (state.referenceSignature.bestDisplayLayers ?? []).join(', ') || 'n/a'],
            ['what this is not', state.referenceSignature.notA]
          ])}
          <small>${escapeHtml(state.referenceSignature.educationalPrompt ?? '')}</small>
        </div>
        <div class="cell-inspector-card">
          <span>Inspired By</span>
          ${(state.referenceSignature.referenceModels ?? []).map((model) => `<p><strong>${escapeHtml(model.name)}</strong>: ${escapeHtml(model.usefulBehavior)} <small>${escapeHtml(model.note)}</small></p>`).join('')}
        </div>
        <div class="cell-inspector-card">
          <span>Sampling Interpretation</span>
          ${metricRows([
            ['current ROI', state.referenceSignature.roiInterpretation?.current],
            ['near-future ROI', state.referenceSignature.roiInterpretation?.nearFuture],
            ['low value', state.referenceSignature.roiInterpretation?.lowValue],
            ['sampling intuition', state.referenceSignature.roiInterpretation?.samplingIntuition]
          ])}
        </div>
        <div class="cell-inspector-card">
          <span>Failure Signs</span>
          <p>${escapeHtml((state.referenceSignature.failureSigns ?? []).join('; ') || 'n/a')}</p>
          <small>${escapeHtml(state.referenceSignature.implementationNotes ?? '')}</small>
        </div>
      ` : ''}
      <div class="cell-inspector-card">
        <span>Expected Heatmap</span>
        <p>${escapeHtml(help.expectedBehavior)}</p>
      </div>
      <div class="cell-inspector-card">
        <span>Parameters</span>
        <p>${escapeHtml((help.parameters ?? []).join(', ') || 'N/A')}</p>
      </div>
      <div class="cell-inspector-card">
        <span>Strategy</span>
        <p>${escapeHtml(help.strategy)}</p>
        <small>${escapeHtml((help.pairsWellWith ?? []).length ? `Related modes: ${help.pairsWellWith.join(', ')}` : '')}</small>
        <small>${escapeHtml(help.boundaryNote)}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Current Composition</span>
        <small>${escapeHtml(composition.label)}</small>
        <small>${escapeHtml(composition.summary)}</small>
        <small>${escapeHtml(composition.routeNote)}</small>
      </div>
      <button class="console-button secondary" data-action="roi-show-cell-inspector">Show Cell Inspector</button>
    </section>
  `;
}

export function processPaintToolsHtml(state = {}) {
  return `
    <section class="cell-inspector-shell process-paint-tools" data-process-paint-tools>
      ${roiPanelModeButtonsHtml('paintTools', Boolean(state.selectedCell), true)}
      <div class="cell-inspector-header">
        <span>Process Paint Mode</span>
        <h2>Paint Tools</h2>
        <p>Paint states, rules, groups, and source values directly onto the grid.</p>
      </div>
      ${currentLabStateCardHtml(state)}
      <div class="cell-inspector-card selected">
        <span>Current Brush</span>
        ${metricRows([
          ['State', state.selectedPaintState ?? 'active'],
          ['Rule', processRuleLabel(state.selectedPaintRuleId ?? 'propagatingFront')],
          ['Group', state.selectedPaintGroupId ?? 1],
          ['Source', formatStat(state.selectedPaintSourceValue ?? 1)]
        ])}
      </div>
      ${processPaintBrushCardHtml(state)}
      <div class="cell-inspector-card">
        <span>Status</span>
        ${metricRows([
          ['status', state.processStatusLabel ?? 'Custom Exploratory'],
          ['validation', 'Not example-validated'],
          ['painted cells', state.paintValidation?.paintedCellCount ?? 0],
          ['groups', state.paintValidation?.groupCount ?? 0],
          ['playback', state.paused ? 'paused editing canvas' : 'running from painted state']
        ])}
        <small>Custom Exploratory unless validated against an Example Process.</small>
      </div>
      <div class="console-button-row wrap">
        <button class="console-button secondary" data-action="paint-panel-clear-canvas">Clear Canvas</button>
        <button class="console-button secondary" data-action="paint-panel-randomize">Randomize Canvas</button>
        <button class="console-button" data-action="paint-panel-run">Run Process</button>
        <button class="console-button secondary" data-action="paint-panel-export">Export Process Recipe</button>
      </div>
    </section>
  `;
}

export function processPaintCellEditorHtml(inspection, state = {}) {
  const assignment = inspection.paintAssignment ?? {};
  return `
    <section class="cell-inspector-shell process-paint-editor" data-process-paint-cell-editor>
      ${roiPanelModeButtonsHtml('cellInspector', true, true)}
      <div class="cell-inspector-header">
        <span>Process Paint Cell</span>
        <h2>Cell (${escapeHtml(inspection.cell.row)}, ${escapeHtml(inspection.cell.col)})</h2>
        <p>Edit state, rule, group, and source value.</p>
      </div>
      <div class="cell-inspector-card selected">
        <span>Cell Assignment</span>
        ${metricRows([
          ['state', assignment.state ?? inspection.processState ?? 'inactive'],
          ['rule', inspection.processRuleLabel ?? processRuleLabel(assignment.ruleId ?? inspection.processRuleId ?? 'inert')],
          ['ruleId', normalizeProcessRuleId(assignment.ruleId ?? inspection.processRuleId ?? 'inert')],
          ['groupId', assignment.groupId ?? inspection.processGroupId ?? 0],
          ['ROI role', inspection.roiRole ?? 'background'],
          ['transition', inspection.processTransition ? `${inspection.processTransition.previousState ?? 'n/a'} -> ${inspection.processTransition.nextState ?? 'n/a'}` : 'none'],
          ['sourceValue', formatStat(assignment.sourceValue ?? inspection.sourceValue ?? 0)],
          ['sampling value', formatStat(inspection.value ?? 0)]
        ])}
      </div>
      ${processPaintBrushCardHtml(state)}
      <div class="console-button-row wrap">
        <button class="console-button" data-action="paint-panel-apply">Apply to Cell</button>
        <button class="console-button secondary" data-action="paint-panel-brush">Paint With Current Brush</button>
        <button class="console-button secondary" data-action="paint-panel-clear-cell">Clear Cell</button>
        <button class="console-button secondary" disabled>Apply to Group</button>
        <button class="console-button" data-action="paint-panel-run">Run Process</button>
        <button class="console-button secondary" data-action="paint-panel-export">Export Process Recipe</button>
        <button class="console-button secondary" data-action="paint-panel-tools">Return to Paint Tools</button>
      </div>
    </section>
  `;
}

export function processPaintInspectorEmptyHtml(state = {}) {
  return `
    <section class="cell-inspector-shell process-paint-editor" data-process-paint-empty-inspector>
      ${roiPanelModeButtonsHtml('cellInspector', false, true)}
      <div class="cell-inspector-header">
        <span>Process Paint Cell</span>
        <h2>Cell Inspector</h2>
        <p>Select or paint a cell to edit its state, rule, group, and source value.</p>
      </div>
      <div class="cell-inspector-card selected sampling-empty-state">
        <span>No Cell Selected</span>
        <p>Select or paint a cell to edit its state, rule, group, and source value.</p>
      </div>
      ${currentLabStateCardHtml(state)}
    </section>
  `;
}

export function processPaintBrushCardHtml(state = {}) {
  return `
    <div class="cell-inspector-card">
      <span>Current Brush</span>
      <label class="compact-field">Brush size <input type="text" value="single cell" disabled /></label>
      <label class="compact-field">
        State
        <select id="paint-panel-state">
          ${(state.validPaintStates ?? state.processStates ?? []).map((processState) => `<option value="${escapeAttr(processState)}" ${state.selectedPaintState === processState ? 'selected' : ''}>${escapeHtml(processState)}</option>`).join('')}
        </select>
      </label>
      <label class="compact-field">
        Rule
        <select id="paint-panel-rule">
          ${processRuleOptgroupHtml('Basic', state.basicProcessRules ?? [], state.selectedPaintRuleId)}
          ${processRuleOptgroupHtml('Advanced', state.advancedProcessRules ?? [], state.selectedPaintRuleId)}
        </select>
      </label>
      <label class="compact-field">Group <input id="paint-panel-group" type="number" min="0" max="99" value="${escapeAttr(state.selectedPaintGroupId ?? 1)}" /></label>
      <label class="compact-field">Source value <input id="paint-panel-source" type="range" min="0" max="1" step="0.05" value="${escapeAttr(state.selectedPaintSourceValue ?? 1)}" /></label>
    </div>
  `;
}

export function roiInspectorHtml(inspection) {
  return `
    <section class="cell-inspector-shell" data-roi-cell-inspector>
      ${roiPanelModeButtonsHtml('cellInspector', true)}
      <div class="cell-inspector-header">
        <span>Cell Inspector</span>
        <h2>Cell (${escapeHtml(inspection.cell.col)}, ${escapeHtml(inspection.cell.row)})</h2>
        <p>Type: Sample cell | t = ${formatStat(inspection.demoTime)} s</p>
      </div>
      <div class="cell-inspector-card">
        <span>Source / Initial Field</span>
        ${metricRows([
          ['L(x,y,t)', formatStat(inspection.eventLikelihoodValue)],
          ['mesh percentile', inspection.likelihoodMeshPercentile],
          ['local mesh avg', formatStat(inspection.localLikelihoodAverage)],
          ['mesh trend', inspection.localLikelihoodTrend],
          ['source model', inspection.eventLikelihoodLabel],
          ['dynamics', inspection.eventLikelihoodDynamicsLabel],
          ['temporal pattern', inspection.eventLikelihoodTemporalPatternLabel],
          ['spatial evolution', inspection.eventLikelihoodSpatialEvolutionLabel],
          ['source support', inspection.eventLikelihoodBand],
          ['nearest node', inspection.nearestLikelihoodNode ? inspection.nearestLikelihoodNode.id : 'none'],
          ['node state', inspection.nearestLikelihoodNode ? inspection.nearestLikelihoodNode.state : 'n/a'],
          ['node cooldown', inspection.nearestLikelihoodNode ? formatStat(inspection.nearestLikelihoodNode.cooldown) : 'n/a'],
          ['node distance', inspection.nearestLikelihoodNode ? formatStat(inspection.nearestLikelihoodNode.distance) : 'n/a'],
          ['role', 'biases process origins, jumps, walks, and propagation']
        ])}
        <small>Source mesh values show process support at every cell. Nodes are sources or basins that influence the mesh.</small>
        <small>L(x,y,t) is not the realized sampling value S(x,y,t), and it is not physical current.</small>
      </div>
      <div class="cell-inspector-card selected">
        <span>Sampling Value</span>
        ${metricRows([
          ['S(x,y,t)', formatStat(inspection.value)],
          ['displayed value', formatStat(inspection.displayedValue)],
          ['normalized', formatStat(inspection.normalizedValue)],
          ['trend', trendLabel(inspection.delta)],
          ['delta / 1s', formatSignedStat(inspection.delta)]
        ])}
        <small>Sampling value is the currently realized value after the selected sampling-process behavior is composed.</small>
      </div>
      <div class="cell-inspector-card">
        <span>Graph Field Node</span>
        ${metricRows([
          ['node id', inspection.graphNode ? inspection.graphNode.id : 'n/a'],
          ['process state', inspection.processState ?? 'n/a'],
          ['ruleId', inspection.processRuleId ?? 'n/a'],
          ['groupId', inspection.processGroupId ?? 'n/a'],
          ['source value', formatStat(inspection.sourceValue)],
          ['paint assignment', inspection.paintAssignment ? `${inspection.paintAssignment.state} / ${inspection.paintAssignment.ruleId} / group ${inspection.paintAssignment.groupId}` : 'none'],
          ['topology', inspection.graphTopology],
          ['update rule', inspection.graphUpdateRule],
          ['cluster id', inspection.graphNode ? inspection.graphNode.clusterId ?? inspection.nearestCluster?.id ?? 'n/a' : 'n/a'],
          ['C_k(t)', inspection.graphNode ? formatStat(inspection.graphNode.clusterLikelihood) : 'n/a'],
          ['L_i(t)', inspection.graphNode ? formatStat(inspection.graphNode.cellLikelihood ?? inspection.graphNode.likelihood) : 'n/a'],
          ['A_i(t)', inspection.graphNode ? formatStat(inspection.graphNode.activation) : 'n/a'],
          ['state', inspection.graphNode ? inspection.graphNode.state : 'n/a'],
          ['cooldown', inspection.graphNode ? formatStat(inspection.graphNode.cooldown) : 'n/a'],
          ['recovery', inspection.graphNode ? formatStat(inspection.graphNode.recovery) : 'n/a'],
          ['freshness / age', inspection.graphNode ? formatStat(inspection.graphNode.freshness ?? inspection.graphNode.age) : 'n/a'],
          ['community', inspection.graphNode ? inspection.graphNode.communityId : 'n/a'],
          ['incoming message', inspection.graphNode ? formatStat(inspection.graphNode.incomingMessage) : 'n/a'],
          ['outgoing message', inspection.graphNode ? formatStat(inspection.graphNode.outgoingMessage) : 'n/a'],
          ['filter status', inspection.graphFilterStatus ?? 'n/a'],
          ['neighbor count', inspection.graphNode ? inspection.graphNode.neighborCount : 'n/a'],
          ['active neighbors', inspection.graphNode ? inspection.graphNode.activeNeighborCount : 'n/a'],
          ['strongest incoming', inspection.graphNeighborhood?.strongestIncoming ? `${inspection.graphNeighborhood.strongestIncoming.source.x},${inspection.graphNeighborhood.strongestIncoming.source.y} (${formatStat(inspection.graphNeighborhood.strongestIncoming.strength)})` : 'n/a'],
          ['strongest outgoing', inspection.graphNeighborhood?.strongestOutgoing ? `${inspection.graphNeighborhood.strongestOutgoing.target.x},${inspection.graphNeighborhood.strongestOutgoing.target.y} (${formatStat(inspection.graphNeighborhood.strongestOutgoing.strength)})` : 'n/a'],
          ['filtered incoming', inspection.strongestIncomingFiltered ? `${inspection.strongestIncomingFiltered.source.x},${inspection.strongestIncomingFiltered.source.y} ${inspection.strongestIncomingFiltered.messageType} (${formatStat(inspection.strongestIncomingFiltered.strength)})` : 'n/a'],
          ['filtered outgoing', inspection.strongestOutgoingFiltered ? `${inspection.strongestOutgoingFiltered.target.x},${inspection.strongestOutgoingFiltered.target.y} ${inspection.strongestOutgoingFiltered.messageType} (${formatStat(inspection.strongestOutgoingFiltered.strength)})` : 'n/a'],
          ['message source', inspection.graphNeighborhood?.sourceType ?? inspection.graphNode?.messageSource ?? 'n/a'],
          ['transition cause', inspection.graphTransition?.cause ?? 'n/a'],
          ['transition label', inspection.graphTransition?.label ?? 'n/a'],
          ['transition record', inspection.graphTransition ? `${inspection.graphTransition.previousState ?? 'n/a'} -> ${inspection.graphTransition.nextState ?? 'n/a'}` : 'none'],
          ['ROI roles', roiRoleList(inspection.roiRoles)],
          ['depleted/dead', inspection.depletedStatus ?? 'n/a'],
          ['inhibited neighbors', inspection.graphNeighborhood?.inhibitedNeighborCount ?? 'n/a'],
          ['dominant incoming', inspection.graphNode ? `${inspection.graphNode.dominantIncomingDirection?.x ?? 0}, ${inspection.graphNode.dominantIncomingDirection?.y ?? 0}` : 'n/a']
        ])}
        <small>${escapeHtml(inspection.selectedNeighborhoodAction ?? '')}</small>
        <small>${escapeHtml(messageListSummary('Incoming', inspection.incomingCausalMessages))}</small>
        <small>${escapeHtml(messageListSummary('Outgoing', inspection.outgoingCausalMessages))}</small>
        <small>${escapeHtml(inspection.nearestCluster ? `Nearest cluster ${inspection.nearestCluster.id}: state ${inspection.nearestCluster.state}, C=${formatStat(inspection.nearestCluster.likelihood)}, distance ${formatStat(inspection.nearestCluster.distance)}, members ${inspection.nearestCluster.memberCellCount ?? 0}.` : 'No cluster/community metadata for this cell.')}</small>
        <small>Community membership groups cells into source basins. Node state controls whether this cell is active, cooling, recovering, susceptible, consumed, or inhibited.</small>
        <small>Process messages pass abstract ROI influence between neighboring cells. This is not physical current F(x,y,t).</small>
      </div>
      <div class="cell-inspector-card">
        <span>Pattern Composition</span>
        ${metricRows([
          ['field mode', inspection.mode === 'dynamic' ? 'Dynamic' : 'Static'],
          ['source field', inspection.eventLikelihoodLabel],
          ['displayed layer', roiDisplayModeLabel(inspection.displayMode)],
          ['spatial pattern', roiPureSpatialPatternLabel(inspection.spatialPattern)],
          ['value distribution', inspection.valueDistributionLabel],
          ['seeded value', inspection.seededValue],
          ['value band', inspection.valueBand],
          ['cluster count', inspection.clusterCount],
          ['cluster size', roiClusterSizeLabel(inspection.clusterSize)],
          ['pattern parameters', inspection.spatialParameterSummary],
          ['temporal pattern', roiTemporalPatternLabel(inspection.temporalPattern)],
          ['state model', inspection.stateModelLabel],
          ['spatial evolution', roiSpatialEvolutionLabel(inspection.spatialEvolution)],
          ['motion scope', inspection.motionScopeLabel],
          ['feature motion', inspection.behavior?.featureMotion ?? 'n/a'],
          ['burst phase', inspection.behavior?.burstPhase ?? 'n/a'],
          ['dynamic complexity', complexityLabel(inspection.dynamicComplexity)],
          ['cluster membership', inspection.hotspotMembership]
        ])}
        <small>${escapeHtml(inspection.spatialPatternHelp?.meaning ?? '')}</small>
        <small>${escapeHtml(inspection.behavior?.explanation ?? '')}</small>
      </div>
      <div class="cell-inspector-card">
        <span>Sampling Effects</span>
        ${metricRows([
          ['raw base value', formatStat(inspection.rawBase)],
          ['depleted value', formatStat(inspection.depleted)],
          ['sampling effect', roiDepletionModeLabel(inspection.depletionMode)],
          ['last sampled', inspection.lastSampled],
          ['recovery', inspection.recovery],
          ['neighbor influence', inspection.behavior?.neighborInfluence ?? (inspection.sampleFieldConfig?.neighborInfluence?.enabled ? 'enabled' : 'off')]
        ])}
      </div>
    </section>
  `;
}

export function roiInspectorEmptyHtml(state = {}) {
  return `
    <section class="cell-inspector-shell" data-roi-cell-inspector-empty>
      ${roiPanelModeButtonsHtml('cellInspector', false, state.processMode === 'processPaint')}
      <div class="cell-inspector-header">
        <span>Cell Inspector</span>
        <h2>Cell Inspector</h2>
        <p>Select a cell on the canvas to inspect its value, state, rule, messages, and ROI role.</p>
      </div>
      <div class="cell-inspector-card selected sampling-empty-state">
        <span>No Cell Selected</span>
        <p>Select a cell on the canvas to inspect its value, state, rule, messages, and ROI role.</p>
      </div>
      ${currentLabStateCardHtml(state)}
    </section>
  `;
}

function behaviorHelpOptionForGroup(groupId, state) {
  return {
    behaviorPreset: state.behaviorPresetId,
    eventLikelihood: state.eventLikelihood,
    spatialPattern: state.spatialPattern,
    valueDistribution: state.valueDistribution,
    temporalPattern: state.temporalPattern,
    spatialEvolution: state.spatialEvolution,
    interactionScale: state.interactionScale,
    stateModel: state.stateModel,
    samplingEffect: state.depletionMode,
    displayLayer: state.displayMode
  }[groupId] ?? null;
}

function currentLabStateCardHtml(state = {}) {
  const rows = currentLabStateRows(state);
  const metricRowsForState = currentLabMetricRows(state);
  const hasRecipe = Object.keys(state.componentRecipe ?? {}).length > 0;
  const recipeRows = hasRecipe ? componentRecipeRows(state.componentRecipe) : [];
  return `
    <div class="cell-inspector-card selected" data-roi-current-lab-state>
      <span>Current Lab State</span>
      ${metricRows(rows)}
      ${metricRows(metricRowsForState)}
      ${recipeRows.length ? `
        <details>
          <summary>Full recipe details</summary>
          ${metricRows(recipeRows)}
        </details>
      ` : ''}
    </div>
  `;
}

function currentLabStateRows(state = {}) {
  const mode = state.processMode ?? (state.patternSource === 'referenceSignature' ? 'referenceSignature' : 'customComposer');
  if (mode === 'processPaint') {
    return [
      ['Mode', state.processModeLabel ?? 'Process Paint'],
      ['Status', state.processStatusLabel ?? 'Custom Exploratory'],
      ['Painted cells', state.paintValidation?.paintedCellCount ?? 0],
      ['Brush', `${state.selectedPaintState ?? 'active'} / ${processRuleLabel(state.selectedPaintRuleId ?? 'propagatingFront')} / group ${state.selectedPaintGroupId ?? 1}`]
    ];
  }
  if (mode === 'randomRuleLab') {
    return [
      ['Mode', state.processModeLabel ?? 'Rule Allocation Sandbox'],
      ['Seed', state.randomRuleSeed ?? 'sampling-random-001'],
      ['Groups', state.randomRuleGroupCount ?? 4],
      ['Active density', formatPercent(state.randomRuleActiveFraction ?? 0.18)],
      ['Status', state.processStatusLabel ?? 'Custom Exploratory']
    ];
  }
  if (mode === 'diagnosticsGraphInspection') {
    return [
      ['View', 'Diagnostics'],
      ['Display', state.displayModeLabel ?? roiDisplayModeLabel(state.displayMode)],
      ['Messages', formatStat(state.graphDiagnostics?.edgeMessageTotal)],
      ['Transitions', state.graphDiagnostics?.transitionCount ?? state.graphDiagnostics?.activeNodeCount ?? 'N/A'],
      ['Status', state.processStatusLabel ?? 'Custom Exploratory']
    ];
  }
  if (state.patternSource === 'referenceSignature' && state.referenceSignature) {
    return [
      ['Mode', state.processModeLabel ?? 'Example Processes'],
      ['Status', state.processStatusLabel ?? 'Example-Validated'],
      ['Pattern', state.referenceSignature.label],
      ['Recipe', state.recipeSummary],
      ['State', roiStateModelLabel(state.componentRecipe?.stateModel)],
      ['Sampling', roiDepletionModeLabel(state.componentRecipe?.depletionMode)]
    ];
  }
  return [
    ['Mode', state.processModeLabel ?? 'Custom Composer'],
    ['Status', state.processStatusLabel ?? 'Custom Exploratory'],
    ['Recipe', state.recipeSummary],
    ['Modified', state.referenceSignatureModified || state.behaviorPreset?.modified ? 'yes' : 'no']
  ];
}

function currentLabMetricRows(state = {}) {
  const diagnostics = state.activityDiagnostics ?? {};
  const graph = state.graphDiagnostics ?? diagnostics.graphDiagnostics ?? {};
  const stats = state.stats ?? {};
  const ruleEngine = diagnostics.ruleEngineDiagnostics ?? {};
  return [
    ['Mean', formatStat(diagnostics.meanValue ?? stats.mean)],
    ['Active %', formatPercent(diagnostics.activeFraction ?? stats.activeFraction)],
    ['High %', formatPercent(diagnostics.highValueFraction ?? stats.highFraction)],
    ['Max', formatStat(diagnostics.maxValue ?? stats.max)],
    ['Messages', formatStat(graph.edgeMessageTotal)],
    ['Transitions', formatStat(ruleEngine.transitionCount ?? graph.transitionCount ?? graph.activeNodeCount)]
  ];
}

function fieldProcessStatsRows(state = {}) {
  const diagnostics = state.activityDiagnostics ?? {};
  const graph = state.graphDiagnostics ?? diagnostics.graphDiagnostics ?? {};
  const stats = state.stats ?? {};
  const likelihood = diagnostics.likelihood ?? {};
  const ruleEngine = diagnostics.ruleEngineDiagnostics ?? {};
  return [
    ['mean value', formatStat(diagnostics.meanValue ?? stats.mean)],
    ['active fraction', formatPercent(diagnostics.activeFraction ?? stats.activeFraction)],
    ['high fraction', formatPercent(diagnostics.highValueFraction ?? stats.highFraction)],
    ['max value', formatStat(diagnostics.maxValue ?? stats.max)],
    ['total activity mass', formatStat(diagnostics.totalActivityMass ?? stats.totalValue)],
    ['source active fraction', formatPercent(likelihood.activeLikelihoodCellFraction)],
    ['source high fraction', formatPercent(likelihood.highLikelihoodCellFraction)],
    ['source modes', likelihood.modeCount ?? 'N/A'],
    ['components', diagnostics.connectedComponentCount ?? 'N/A'],
    ['hotspots', diagnostics.activeHotspotCount ?? diagnostics.hotspotComponentCount ?? 'N/A'],
    ['L/S correlation', formatStat(diagnostics.likelihoodSampleCorrelation)],
    ['messages', formatStat(graph.edgeMessageTotal)],
    ['transitions', formatStat(ruleEngine.transitionCount ?? graph.transitionCount)],
    ['states', formatGraphStateSummary(graph.stateCounts)]
  ];
}

function processRuleOptgroupHtml(label, rules = [], selectedRuleId = 'inert') {
  if (!rules.length) return '';
  return `<optgroup label="${escapeAttr(label)}">${rules.map((rule) => `<option value="${escapeAttr(rule.id)}" ${selectedRuleId === rule.id ? 'selected' : ''}>${escapeHtml(rule.label)}</option>`).join('')}</optgroup>`;
}

function metricRows(rows) {
  return `
    <div class="cell-inspector-metrics">
      ${rows.map(([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function roiRoleList(roles = {}) {
  const labels = [];
  if (roles.current) labels.push('current ROI');
  if (roles.nearFuture) labels.push('near-future ROI');
  if (roles.depleted) labels.push('depleted/dead');
  if (roles.transitionBoundary) labels.push('transition boundary');
  return labels.join(', ') || 'none';
}

function messageListSummary(prefix, messages = []) {
  if (!messages.length) return `${prefix}: none after current filters.`;
  const summary = messages
    .slice(0, 3)
    .map((message) => {
      const peer = prefix === 'Incoming' ? message.source : message.target;
      return `${peer.x},${peer.y} ${message.messageType ?? 'generic'} ${formatStat(message.strength)} ${message.sourceType === 'inferred' ? '(inferred)' : ''}`.trim();
    })
    .join('; ');
  return `${prefix}: ${summary}`;
}

function componentRecipeRows(recipe = {}) {
  return [
    ['Event Likelihood', roiEventLikelihoodLabel(recipe.eventLikelihood)],
    ['Spatial Pattern / Geometry', roiPureSpatialPatternLabel(recipe.spatialPattern)],
    ['Value Distribution', roiValueDistributionLabel(recipe.valueDistribution)],
    ['Temporal Pattern', roiTemporalPatternLabel(recipe.temporalPattern)],
    ['Spatial Evolution / Motion Rule', roiSpatialEvolutionLabel(recipe.spatialEvolution ?? recipe.patternEvolution)],
    ['Interaction Scale / Hierarchy', roiInteractionScaleLabel(recipe.interactionScale)],
    ['State Model / Update Rule', roiStateModelLabel(recipe.stateModel)],
    ['Sampling Effect / Freshness', roiDepletionModeLabel(recipe.depletionMode)],
    ['Display / Diagnostic Layer', roiDisplayModeLabel(recipe.displayMode)]
  ];
}

function referenceModelGroups(models = []) {
  return models.reduce((groups, model) => {
    const family = model.modelFamily ?? 'reference';
    groups[family] = (groups[family] ?? 0) + 1;
    return groups;
  }, {});
}

function recipeComponentTableHtml(rows = []) {
  if (!rows.length) return '<small>No component recipe available.</small>';
  return `
    <div class="cell-inspector-metrics recipe-component-table">
      ${rows.map((row) => `
        <div>
          <span>${escapeHtml(row.component)}</span>
          <strong>${escapeHtml(row.selected)}</strong>
          <small>${escapeHtml(row.question)}</small>
          <small>${escapeHtml(row.role)}</small>
        </div>
      `).join('')}
    </div>
  `;
}

function trendLabel(delta) {
  const value = Number(delta) || 0;
  if (value > 0.015) return 'rising';
  if (value < -0.015) return 'falling';
  return 'stable';
}

function formatSignedStat(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return `${number >= 0 ? '+' : ''}${number.toFixed(3)}`;
}

function complexityLabel(value) {
  return {
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[value] ?? 'Medium';
}

function formatGraphStateSummary(stateCounts = {}) {
  return Object.entries(stateCounts ?? {}).map(([key, value]) => `${key}:${value}`).join(', ') || 'n/a';
}

function formatStat(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return number.toFixed(3);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return `${Math.round(number * 100)}%`;
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
