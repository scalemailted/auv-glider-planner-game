import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const articlePath = 'labs/scientific-computational-modeling.html';
const cssPath = 'css/labs.css';
const widgetPath = 'src/labs/widgets/ScientificModelingWidgets.js';

const [article, css, widget] = await Promise.all([
  read(articlePath),
  read(cssPath),
  read(widgetPath)
]);

[
  'Scientific Computational Modeling',
  'What is a scientific computational model?',
  'State, rules, parameters, and outputs',
  'Cellular automata as a first modeling language',
  'Famous CA examples',
  'Stochastic models',
  'Fuzzy, continuous, and generalized CA',
  'Model fidelity ladder',
  'X(t+1)',
  'x_i(t+1)',
  "Conway's Game of Life",
  'Forest Fire CA',
  'SIR / Epidemic CA',
  'Sandpile / Avalanche',
  'Wireworld',
  'CA is a rigorous first step in computational modeling, not a shortcut for fake hotspots.',
  'data-modeling-widget="model-loop"',
  'data-modeling-widget="deterministic-vs-stochastic"',
  '../src/labs/widgets/ScientificModelingWidgets.js',
  'Back to Learning Labs'
].forEach((needle) => assertIncludes(article, needle, articlePath));

assertNoExternalLinks(article, articlePath);
assertIncludes(css, '.lab-claim-badge', cssPath);
assertIncludes(css, '.lab-widget-map', cssPath);

[
  'ModelLoopWidget',
  'LocalRuleNeighborhoodWidget',
  'DeterministicVsStochasticWidget',
  'FuzzyCaWidget'
].forEach((needle) => assertIncludes(widget, needle, widgetPath));
assertNotIncludes(widget, 'Phaser', widgetPath);
assertNotIncludes(widget, 'anchorGame', widgetPath);
await import(pathToFileUrl(path.join(ROOT, widgetPath)));

console.log('PASS learning lab scientific modeling smoke');

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