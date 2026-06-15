import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const articlePath = 'labs/stochastic-coupled-sampling-space.html';
const cssPath = 'css/labs.css';
const widgetPath = 'src/labs/widgets/StochasticCoupledLearningWidgets.js';

const article = await read(articlePath);
const css = await read(cssPath);
const widgetSource = await read(widgetPath);

[
  'Stochastic Coupled Sampling Space',
  'Learn how process, flow, uncertainty, observations, and constraints combine into a belief-based sampling objective.',
  'Stochastic Coupling',
  'Hidden Truth',
  'Forecast Error',
  'Hidden Events',
  'Acquisition Value',
  'Regret',
  'Open the main app, then choose Simulation Lab.',
  'From oracle coupling to uncertain coupling',
  'The layer stack: truth, forecast, flow, constraints, belief',
  'Oracle objective vs belief objective',
  'Expected-state uncertainty and unknown-event probability',
  'Forecast error vs hidden unknown',
  'Observations, innovation, and surprise',
  'Flow consistency and hidden-event evidence',
  'Building an acquisition field',
  'Constraint-aware and reachability-aware value',
  'Surfacing, updates, and replanning',
  'Oracle comparison and regret',
  'Example mission situations',
  'How this connects to Planner / Mission Evaluation',
  'Open the full sandboxes',
  'What comes next'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'T(x,y,t)',
  'X_true(x,y,t)',
  'V_true(x,y,t)',
  'E(x,y,t)',
  '&mu;_prior',
  '&mu;_post',
  'U(x,y,t)',
  'U_expected(x,y,t)',
  'P_unknown(x,y,t)',
  'F(x,y,t) = &lt;u,v&gt;',
  'C(x,y)',
  'M',
  'S*(x,y,t) = h(V_true,F,C,M)',
  'A(x,y,t) = h(&mu;_post,U,P_unknown,F,C,M)',
  'regret = S*(chosen_oracle_best) - S*(chosen_by_belief)',
  'z_i = T(x_i,y_i,t_i) + &epsilon;_i',
  'innovation_i = z_i - E(x_i,y_i,t_i)',
  'surprise_i = abs(innovation_i) / sqrt(U_expected_i^2 + &sigma;_sensor^2)',
  'hidden_event_evidence = surprise + spatial_coherence + persistence_over_time + sensor_signature_match + flow_consistency'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'We were wrong about something we thought we knew.',
  'We discovered something we did not know to look for.',
  'expected-state uncertainty',
  'unknown-event probability',
  'forecast correction',
  'hidden-event confidence',
  'fair planners can use forecasts',
  'should not use <code>T(x,y,t)</code>'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'data-stochastic-coupled-widget="belief-layer-stack"',
  'data-stochastic-coupled-widget="oracle-vs-belief"',
  'data-stochastic-coupled-widget="two-uncertainty-maps"',
  'data-stochastic-coupled-widget="forecast-error-vs-hidden-event"',
  'data-stochastic-coupled-widget="flow-consistent-anomaly"',
  'data-stochastic-coupled-widget="acquisition-composer"',
  'data-stochastic-coupled-widget="reachable-acquisition"',
  'data-stochastic-coupled-widget="surface-update-cycle"',
  'data-stochastic-coupled-widget="oracle-regret-comparison"',
  '../src/labs/widgets/StochasticCoupledLearningWidgets.js',
  'href="index.html"',
  'href="../index.html"',
  'Open Uncertainty / Forecast Sandbox',
  'Open Coupled Fields Sandbox'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  '.lab-stochastic-coupled-widget',
  '.lab-belief-layer-stack',
  '.lab-oracle-belief-grid',
  '.lab-acquisition-composer',
  '.lab-uncertainty-map-card',
  '.lab-hidden-event-card',
  '.lab-forecast-error-card',
  '.lab-surface-update-card',
  '.lab-regret-comparison',
  '.lab-evidence-meter',
  '.lab-confidence-chip',
  '.lab-objective-equation',
  '.lab-route-preview',
  '.lab-diagnosis-panel',
  '.lab-update-cycle',
  '.lab-reachability-map'
].forEach((needle) => assertIncludes(css, needle, cssPath));

[
  'BeliefLayerStackWidget',
  'OracleVsBeliefWidget',
  'TwoUncertaintyMapsWidget',
  'ForecastErrorHiddenEventWidget',
  'FlowConsistentAnomalyWidget',
  'AcquisitionComposerWidget',
  'ReachableAcquisitionWidget',
  'SurfaceUpdateCycleWidget',
  'OracleRegretComparisonWidget',
  'seededRng'
].forEach((needle) => assertIncludes(widgetSource, needle, widgetPath));

assertNoExternalLinks(article, articlePath);
assertNotIncludes(widgetSource, 'Phaser', widgetPath);
assertNotIncludes(widgetSource, 'anchorGame', widgetPath);
assertNotIncludes(widgetSource, ' from ', widgetPath);
await import(pathToFileUrl(path.join(ROOT, widgetPath)));

console.log('PASS stochastic coupled sampling-space learning lab smoke');

async function read(file) {
  return fs.readFile(path.join(ROOT, file), 'utf8');
}

function assertIncludes(haystack, needle, file) {
  if (!haystack.includes(needle)) throw new Error(`${file} missing required text: ${needle}`);
}

function assertNotIncludes(haystack, needle, file) {
  if (haystack.includes(needle)) throw new Error(`${file} should not include: ${needle}`);
}

function assertNoExternalLinks(html, file) {
  if (/https?:\/\//i.test(html)) throw new Error(`${file} should not use external links or assets`);
}

function pathToFileUrl(file) {
  return new URL(`file://${file.replace(/\\/g, '/')}`).href;
}
