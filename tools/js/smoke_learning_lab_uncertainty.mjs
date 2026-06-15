import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const articlePath = 'labs/stochastic-uncertainty.html';
const cssPath = 'css/labs.css';
const widgetPath = 'src/labs/widgets/UncertaintyLearningWidgets.js';

const article = await read(articlePath);
const css = await read(cssPath);
const widgetSource = await read(widgetPath);

[
  'Why uncertainty?',
  'Deterministic vs stochastic worlds',
  'Random variables, distributions, and realizations',
  'Hidden truth, expected state, observed state, and belief state',
  'Inaccurate forecasts vs hidden unknowns',
  'Observations and sensor noise',
  'Bayesian updating',
  'Markovian state evolution',
  'Gaussian fields',
  'Forecasting, ground truth, and data assimilation',
  'Measuring uncertainty, confidence, surprise, and calibration',
  'Regret and value of information',
  'Acquisition value and next-best sampling',
  'How this connects to stochastic coupled sampling'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'T(x,y,t)',
  'E(x,y,t)',
  '&mu;',
  'U(x,y,t)',
  'z_i',
  'posterior',
  'likelihood',
  'prior',
  'P(X_{t+1}',
  'GP',
  'GMRF',
  'innovation',
  'surprise',
  'regret',
  'acquisition'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'hidden truth',
  'forecast error',
  'hidden unknown',
  'inaccurate expected state',
  'sensor noise',
  'confidence',
  'calibration',
  'expected information gain',
  'hidden-event confidence'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'data-uncertainty-widget="hidden-truth-forecast"',
  'data-uncertainty-widget="forecast-error-vs-hidden-event"',
  'data-uncertainty-widget="bayesian-cell-update"',
  'data-uncertainty-widget="markov-transition"',
  'data-uncertainty-widget="gaussian-field-intuition"',
  'data-uncertainty-widget="regret-information-value"',
  '../src/labs/widgets/UncertaintyLearningWidgets.js',
  'href="index.html"',
  'href="../index.html"'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  '.lab-uncertainty-widget',
  '.lab-belief-stack',
  '.lab-state-layer-card',
  '.lab-probability-card',
  '.lab-prior-posterior',
  '.lab-observation-card',
  '.lab-forecast-card',
  '.lab-hidden-event-card',
  '.lab-surprise-meter',
  '.lab-confidence-meter',
  '.lab-calibration-chart',
  '.lab-regret-card',
  '.lab-acquisition-map',
  '.lab-belief-comparison',
  '.lab-metric-grid',
  '.lab-probability-table'
].forEach((needle) => assertIncludes(css, needle, cssPath));

[
  'HiddenTruthForecastWidget',
  'ForecastErrorHiddenEventWidget',
  'BayesianCellUpdateWidget',
  'MarkovTransitionWidget',
  'GaussianFieldIntuitionWidget',
  'RegretInformationWidget',
  'AcquisitionMapWidget',
  'seededRng'
].forEach((needle) => assertIncludes(widgetSource, needle, widgetPath));

assertNoExternalLinks(article, articlePath);
assertNotIncludes(widgetSource, 'Phaser', widgetPath);
assertNotIncludes(widgetSource, 'anchorGame', widgetPath);
assertNotIncludes(widgetSource, ' from ', widgetPath);
await import(pathToFileUrl(path.join(ROOT, widgetPath)));

console.log('PASS stochastic uncertainty learning lab smoke');

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
