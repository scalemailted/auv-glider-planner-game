import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const files = {
  labsIndex: 'labs/index.html',
  deterministicLab: 'labs/deterministic-spatiotemporal-processes.html',
  flowLab: 'labs/deterministic-dynamic-flow-fields.html',
  coupledLab: 'labs/oracle-deterministic-coupled-sampling-space.html',
  uncertaintyLab: 'labs/stochastic-uncertainty.html',
  stochasticCoupledLab: 'labs/stochastic-coupled-sampling-space.html',
  samplingActionLab: 'labs/sampling-priority-to-glider-action-value.html',
  plannerLab: 'labs/planner-mission-evaluation.html',
  labsCss: 'css/labs.css',
  missionConsole: 'src/ui/MissionConsole.js'
};

const contents = Object.fromEntries(await Promise.all(
  Object.entries(files).map(async ([key, file]) => [key, await read(file)])
));

[
  'ANCHOR Learning Labs',
  'Guided interactive explanations for the field models used by the simulator.',
  'Deterministic Spatiotemporal Processes',
  'Deterministic Dynamic Flow Fields',
  'Oracle / Deterministic Coupled Sampling Space',
  'Stochastic / Uncertainty',
  'Stochastic Coupled Sampling Space',
  'Sampling Priority to Glider Action Value',
  'Planner / Mission Evaluation',
  'Course-level learning objectives',
  'Learning path table of contents',
  'deterministic-dynamic-flow-fields.html',
  'oracle-deterministic-coupled-sampling-space.html',
  'stochastic-uncertainty.html',
  'stochastic-coupled-sampling-space.html',
  'sampling-priority-to-glider-action-value.html',
  'planner-mission-evaluation.html',
  'Known process',
  'Known flow',
  'Known coupled sampling space',
  'Uncertain belief',
  'Mission planning',
  'process + flow + uncertainty + constraints'
].forEach((needle) => assertIncludes(contents.labsIndex, needle, files.labsIndex));

[
  'Deterministic Spatiotemporal Processes',
  'x_i(t+1)',
  'X(t+1)',
  'Deterministic and seeded evolution',
  'Cells, states, and neighborhoods',
  'Explicit cellular-automata rules',
  'Rulesets as update functions',
  'Foundational CA models',
  'Observable process patterns',
  'Non-uniform / domain rule allocation',
  'Optional sampling interpretation',
  'How this connects to the full Process Lab',
  'Elementary CA spacetime widget',
  'Neighborhood update widget',
  'Game of Life mini widget',
  'Domain rule allocation mini widget',
  'data-widget="elementary-ca"',
  'data-widget="neighborhood-update"',
  'data-widget="game-of-life"',
  'data-widget="domain-rule-allocation"',
  '../src/labs/widgets/DeterministicProcessWidgets.js',
  'Back to Learning Labs',
  'Back to Main App'
].forEach((needle) => assertIncludes(contents.deterministicLab, needle, files.deterministicLab));

[
  'Deterministic Dynamic Flow Fields',
  'F(x,y,t)',
  'Direction and magnitude',
  'Particles as flow tracers',
  'Time-varying deterministic flow',
  'Boundaries, land, and topology',
  'Additive flow layers',
  'How this connects to coupled sampling spaces',
  'data-flow-widget="vector-components"',
  'data-flow-widget="field-presets"',
  'data-flow-widget="particle-tracer"',
  '../src/labs/widgets/FlowFieldLearningWidgets.js',
  'Back to Learning Labs',
  'Open Flow Fields Sandbox'
].forEach((needle) => assertIncludes(contents.flowLab, needle, files.flowLab));

[
  'Oracle / Deterministic Coupled Sampling Space',
  'S*(x,y,t)',
  'Why couple fields?',
  'Flow changes transport and reachability',
  'Constraints define where sampling is possible',
  'The oracle sampling objective',
  'How this connects to stochastic coupled sampling',
  'data-coupled-widget="flow-carried-patch"',
  'data-coupled-widget="constraint-mask"',
  'data-coupled-widget="layer-composer"',
  '../src/labs/widgets/CoupledSamplingLearningWidgets.js',
  'Back to Learning Labs',
  'Open Coupled Fields Sandbox'
].forEach((needle) => assertIncludes(contents.coupledLab, needle, files.coupledLab));

[
  'Stochastic / Uncertainty',
  'T(x,y,t)',
  'Bayesian updating',
  'Markovian state evolution',
  'Gaussian fields',
  'Regret and value of information',
  'Acquisition value and next-best sampling',
  'data-uncertainty-widget="hidden-truth-forecast"',
  'data-uncertainty-widget="forecast-error-vs-hidden-event"',
  'data-uncertainty-widget="bayesian-cell-update"',
  '../src/labs/widgets/UncertaintyLearningWidgets.js',
  'Back to Learning Labs',
  'Open Uncertainty / Forecast Sandbox'
].forEach((needle) => assertIncludes(contents.uncertaintyLab, needle, files.uncertaintyLab));

[
  'Stochastic Coupled Sampling Space',
  'A(x,y,t)',
  'S*(x,y,t)',
  'Expected-state uncertainty and unknown-event probability',
  'Forecast error vs hidden unknown',
  'Flow consistency and hidden-event evidence',
  'Constraint-aware and reachability-aware value',
  'Oracle comparison and regret',
  'data-stochastic-coupled-widget="belief-layer-stack"',
  'data-stochastic-coupled-widget="oracle-vs-belief"',
  'data-stochastic-coupled-widget="acquisition-composer"',
  'data-stochastic-coupled-widget="oracle-regret-comparison"',
  '../src/labs/widgets/StochasticCoupledLearningWidgets.js',
  'Back to Learning Labs',
  'Open Uncertainty / Forecast Sandbox',
  'Open Coupled Fields Sandbox'
].forEach((needle) => assertIncludes(contents.stochasticCoupledLab, needle, files.stochasticCoupledLab));

[
  'From Sampling Priority to Glider Action Value',
  'Event intensity is not sampling priority',
  'Sampling priority is not glider action value',
  'Action value is not route planning',
  'A_global',
  'Q_glider',
  'currentAssist',
  'crossCurrentRisk',
  'energyCost',
  'redundancyPenalty',
  'data-sampling-action-widget="priority-vs-intensity"',
  'data-sampling-action-widget="priority-to-action"',
  '../src/labs/widgets/SamplingActionValueWidgets.js',
  'Back to Learning Labs',
  'Sampling Priority Demo',
  'Flow-Coupled Sampling Demo'
].forEach((needle) => assertIncludes(contents.samplingActionLab, needle, files.samplingActionLab));

[
  'Planner / Mission Evaluation',
  'From fields to routes',
  'Reward, cost, risk, and constraints',
  'Flow-aware planning',
  'Greedy planning as a baseline',
  'Solver workflow and fairness labels',
  'data-planner-widget="reward-cost-tradeoff"',
  'data-planner-widget="greedy-planner"',
  'data-planner-widget="debrief-scorecard"',
  '../src/labs/widgets/PlannerLearningWidgets.js',
  'Back to Learning Labs',
  'Open Main App'
].forEach((needle) => assertIncludes(contents.plannerLab, needle, files.plannerLab));

[
  '.lab-shell',
  '.lab-header',
  '.lab-nav',
  '.lab-hero',
  '.lab-badges',
  '.lab-layout',
  '.lab-toc',
  '.lab-article',
  '.lab-section',
  '.lab-card',
  '.lab-card-grid',
  '.lab-callout',
  '.lab-math',
  '.lab-translation',
  '.lab-figure',
  '.lab-caption',
  '.lab-roadmap',
  '.lab-button',
  '.lab-status',
  '.lab-symbol-grid'
].forEach((needle) => assertIncludes(contents.labsCss, needle, files.labsCss));

[
  'Learning Labs',
  'ANCHOR Learning Labs',
  'labs/index.html',
  'labs/deterministic-spatiotemporal-processes.html',
  'labs/deterministic-dynamic-flow-fields.html',
  'labs/oracle-deterministic-coupled-sampling-space.html',
  'labs/stochastic-uncertainty.html',
  'labs/stochastic-coupled-sampling-space.html',
  'labs/sampling-priority-to-glider-action-value.html',
  'labs/planner-mission-evaluation.html',
  'target="_blank"',
  'rel="noopener noreferrer"'
].forEach((needle) => assertIncludes(contents.missionConsole, needle, files.missionConsole));

assertNoExternalLinks(contents.labsIndex, files.labsIndex);
assertNoExternalLinks(contents.deterministicLab, files.deterministicLab);
assertNoExternalLinks(contents.flowLab, files.flowLab);
assertNoExternalLinks(contents.coupledLab, files.coupledLab);
assertNoExternalLinks(contents.uncertaintyLab, files.uncertaintyLab);
assertNoExternalLinks(contents.stochasticCoupledLab, files.stochasticCoupledLab);
assertNoExternalLinks(contents.samplingActionLab, files.samplingActionLab);
assertNoExternalLinks(contents.plannerLab, files.plannerLab);
assertNotIncludes(contents.labsIndex, 'cdn', files.labsIndex);
assertNotIncludes(contents.deterministicLab, 'cdn', files.deterministicLab);
assertNotIncludes(contents.flowLab, 'cdn', files.flowLab);
assertNotIncludes(contents.coupledLab, 'cdn', files.coupledLab);
assertNotIncludes(contents.uncertaintyLab, 'cdn', files.uncertaintyLab);
assertNotIncludes(contents.stochasticCoupledLab, 'cdn', files.stochasticCoupledLab);
assertNotIncludes(contents.samplingActionLab, 'cdn', files.samplingActionLab);
assertNotIncludes(contents.plannerLab, 'cdn', files.plannerLab);


const scientificWidget = path.join(ROOT, 'src/labs/widgets/ScientificModelingWidgets.js');
const scientificWidgetSource = await fs.readFile(scientificWidget, 'utf8');
assertNotIncludes(scientificWidgetSource, 'Phaser', 'src/labs/widgets/ScientificModelingWidgets.js');
assertNotIncludes(scientificWidgetSource, 'anchorGame', 'src/labs/widgets/ScientificModelingWidgets.js');
[
  'ModelLoopWidget',
  'LocalRuleNeighborhoodWidget',
  'DeterministicVsStochasticWidget',
  'FuzzyCaWidget'
].forEach((needle) => assertIncludes(scientificWidgetSource, needle, 'src/labs/widgets/ScientificModelingWidgets.js'));
await import(pathToFileUrl(scientificWidget));

const oceanCaWidget = path.join(ROOT, 'src/labs/widgets/OceanCaProcessWidgets.js');
const oceanCaWidgetSource = await fs.readFile(oceanCaWidget, 'utf8');
assertNotIncludes(oceanCaWidgetSource, 'Phaser', 'src/labs/widgets/OceanCaProcessWidgets.js');
assertNotIncludes(oceanCaWidgetSource, 'anchorGame', 'src/labs/widgets/OceanCaProcessWidgets.js');
[
  'EventIntensityPriorityWidget',
  'PlumeFrontWidget',
  'BloomGrowthDecayWidget',
  'FreshnessRevisitWidget'
].forEach((needle) => assertIncludes(oceanCaWidgetSource, needle, 'src/labs/widgets/OceanCaProcessWidgets.js'));
await import(pathToFileUrl(oceanCaWidget));
const deterministicWidget = path.join(ROOT, 'src/labs/widgets/DeterministicProcessWidgets.js');
const deterministicWidgetSource = await fs.readFile(deterministicWidget, 'utf8');
assertNotIncludes(deterministicWidgetSource, 'Phaser', 'src/labs/widgets/DeterministicProcessWidgets.js');
assertNotIncludes(deterministicWidgetSource, ' from ', 'src/labs/widgets/DeterministicProcessWidgets.js');
[
  'ElementaryCaWidget',
  'NeighborhoodUpdateWidget',
  'GameOfLifeWidget',
  'DomainRuleAllocationWidget'
].forEach((needle) => assertIncludes(deterministicWidgetSource, needle, 'src/labs/widgets/DeterministicProcessWidgets.js'));
await import(pathToFileUrl(deterministicWidget));

const flowWidget = path.join(ROOT, 'src/labs/widgets/FlowFieldLearningWidgets.js');
const flowWidgetSource = await fs.readFile(flowWidget, 'utf8');
assertNotIncludes(flowWidgetSource, 'Phaser', 'src/labs/widgets/FlowFieldLearningWidgets.js');
assertNotIncludes(flowWidgetSource, 'anchorGame', 'src/labs/widgets/FlowFieldLearningWidgets.js');
assertNotIncludes(flowWidgetSource, ' from ', 'src/labs/widgets/FlowFieldLearningWidgets.js');
[
  'VectorComponentWidget',
  'FlowPresetWidget',
  'ParticleTracerWidget'
].forEach((needle) => assertIncludes(flowWidgetSource, needle, 'src/labs/widgets/FlowFieldLearningWidgets.js'));
await import(pathToFileUrl(flowWidget));

const coupledWidget = path.join(ROOT, 'src/labs/widgets/CoupledSamplingLearningWidgets.js');
const coupledWidgetSource = await fs.readFile(coupledWidget, 'utf8');
assertNotIncludes(coupledWidgetSource, 'Phaser', 'src/labs/widgets/CoupledSamplingLearningWidgets.js');
assertNotIncludes(coupledWidgetSource, 'anchorGame', 'src/labs/widgets/CoupledSamplingLearningWidgets.js');
assertNotIncludes(coupledWidgetSource, ' from ', 'src/labs/widgets/CoupledSamplingLearningWidgets.js');
[
  'FlowCarriedPatchWidget',
  'ConstraintMaskWidget',
  'LayerComposerWidget'
].forEach((needle) => assertIncludes(coupledWidgetSource, needle, 'src/labs/widgets/CoupledSamplingLearningWidgets.js'));
await import(pathToFileUrl(coupledWidget));

const uncertaintyWidget = path.join(ROOT, 'src/labs/widgets/UncertaintyLearningWidgets.js');
const uncertaintyWidgetSource = await fs.readFile(uncertaintyWidget, 'utf8');
assertNotIncludes(uncertaintyWidgetSource, 'Phaser', 'src/labs/widgets/UncertaintyLearningWidgets.js');
assertNotIncludes(uncertaintyWidgetSource, 'anchorGame', 'src/labs/widgets/UncertaintyLearningWidgets.js');
assertNotIncludes(uncertaintyWidgetSource, ' from ', 'src/labs/widgets/UncertaintyLearningWidgets.js');
[
  'HiddenTruthForecastWidget',
  'ForecastErrorHiddenEventWidget',
  'BayesianCellUpdateWidget'
].forEach((needle) => assertIncludes(uncertaintyWidgetSource, needle, 'src/labs/widgets/UncertaintyLearningWidgets.js'));
await import(pathToFileUrl(uncertaintyWidget));

const stochasticCoupledWidget = path.join(ROOT, 'src/labs/widgets/StochasticCoupledLearningWidgets.js');
const stochasticCoupledWidgetSource = await fs.readFile(stochasticCoupledWidget, 'utf8');
assertNotIncludes(stochasticCoupledWidgetSource, 'Phaser', 'src/labs/widgets/StochasticCoupledLearningWidgets.js');
assertNotIncludes(stochasticCoupledWidgetSource, 'anchorGame', 'src/labs/widgets/StochasticCoupledLearningWidgets.js');
assertNotIncludes(stochasticCoupledWidgetSource, ' from ', 'src/labs/widgets/StochasticCoupledLearningWidgets.js');
[
  'BeliefLayerStackWidget',
  'OracleVsBeliefWidget',
  'AcquisitionComposerWidget',
  'OracleRegretComparisonWidget'
].forEach((needle) => assertIncludes(stochasticCoupledWidgetSource, needle, 'src/labs/widgets/StochasticCoupledLearningWidgets.js'));
await import(pathToFileUrl(stochasticCoupledWidget));

const samplingActionWidget = path.join(ROOT, 'src/labs/widgets/SamplingActionValueWidgets.js');
const samplingActionWidgetSource = await fs.readFile(samplingActionWidget, 'utf8');
assertNotIncludes(samplingActionWidgetSource, 'Phaser', 'src/labs/widgets/SamplingActionValueWidgets.js');
assertNotIncludes(samplingActionWidgetSource, 'anchorGame', 'src/labs/widgets/SamplingActionValueWidgets.js');
assertNotIncludes(samplingActionWidgetSource, ' from ', 'src/labs/widgets/SamplingActionValueWidgets.js');
[
  'PriorityVsIntensityWidget',
  'PriorityToActionWidget',
  'CurrentAssistWidget',
  'RedundancyWidget'
].forEach((needle) => assertIncludes(samplingActionWidgetSource, needle, 'src/labs/widgets/SamplingActionValueWidgets.js'));
await import(pathToFileUrl(samplingActionWidget));

const plannerWidget = path.join(ROOT, 'src/labs/widgets/PlannerLearningWidgets.js');
const plannerWidgetSource = await fs.readFile(plannerWidget, 'utf8');
assertNotIncludes(plannerWidgetSource, 'Phaser', 'src/labs/widgets/PlannerLearningWidgets.js');
assertNotIncludes(plannerWidgetSource, 'anchorGame', 'src/labs/widgets/PlannerLearningWidgets.js');
assertNotIncludes(plannerWidgetSource, ' from ', 'src/labs/widgets/PlannerLearningWidgets.js');
[
  'RewardCostTradeoffWidget',
  'ReachabilityTimingWidget',
  'FlowAwareRouteWidget',
  'GreedyPlannerWidget',
  'DebriefScorecardWidget'
].forEach((needle) => assertIncludes(plannerWidgetSource, needle, 'src/labs/widgets/PlannerLearningWidgets.js'));
await import(pathToFileUrl(plannerWidget));

const optionalLabShell = path.join(ROOT, 'src/labs/LabShell.js');
if (await exists(optionalLabShell)) {
  const labShellSource = await fs.readFile(optionalLabShell, 'utf8');
  assertNotIncludes(labShellSource, 'Phaser', 'src/labs/LabShell.js');
  await import(pathToFileUrl(optionalLabShell));
}

console.log('PASS learning labs static smoke');

async function read(file) {
  return fs.readFile(path.join(ROOT, file), 'utf8');
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function assertIncludes(haystack, needle, file) {
  if (!haystack.includes(needle)) {
    throw new Error(`${file} missing required text: ${needle}`);
  }
}

function assertNotIncludes(haystack, needle, file) {
  if (haystack.includes(needle)) {
    throw new Error(`${file} should not include: ${needle}`);
  }
}

function assertNoExternalLinks(html, file) {
  if (/https?:\/\//i.test(html)) {
    throw new Error(`${file} should not use external links or assets`);
  }
}

function pathToFileUrl(file) {
  return new URL(`file://${file.replace(/\\/g, '/')}`).href;
}
