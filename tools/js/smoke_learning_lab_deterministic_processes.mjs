import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const articlePath = 'labs/deterministic-spatiotemporal-processes.html';
const cssPath = 'css/labs.css';
const widgetPath = 'src/labs/widgets/DeterministicProcessWidgets.js';

const article = await read(articlePath);
const css = await read(cssPath);

[
  'What is a spatiotemporal process?',
  'Deterministic and seeded evolution',
  'Cells, states, and neighborhoods',
  'Explicit cellular-automata rules',
  'Rulesets as update functions',
  'From local update to global field',
  'Foundational CA models',
  'Observable process patterns',
  'Non-uniform / domain rule allocation',
  'Optional sampling interpretation',
  'How this connects to the full sandbox',
  'What comes next'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'x_i(t+1)',
  'X(t+1)',
  'f_{r(i)}',
  'N_i(t)',
  'In words'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  "Conway's Game of Life",
  'Forest Fire',
  'SIR / Epidemic CA',
  'Greenberg-Hastings',
  'Sandpile',
  'Wa-Tor',
  'Traffic CA',
  'Wireworld'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'Propagating Fronts',
  'Excitable Waves',
  'Diffusive / Epidemic Spread',
  'Threshold Cascades',
  'Domain / Cluster Formation',
  'Sampling Interpretation',
  'Uncertainty / Forecast',
  'Deterministic Dynamic Flow Fields'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'data-widget="elementary-ca"',
  'data-widget="neighborhood-update"',
  'data-widget="game-of-life"',
  'data-widget="domain-rule-allocation"',
  'data-elementary-ca-widget',
  'data-neighborhood-update-widget',
  'data-game-of-life-widget',
  'data-domain-rule-allocation-widget',
  'Neighborhood update widget',
  'Game of Life mini widget',
  'Domain rule allocation mini widget'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  '.lab-equation-grid',
  '.lab-rule-table',
  '.lab-mini-grid',
  '.lab-spacetime',
  '.lab-widget-controls',
  '.lab-state-on',
  '.lab-state-off',
  '.lab-neighborhood',
  '.lab-domain-grid',
  '.lab-process-stack',
  '.lab-concept-map',
  '.lab-model-card',
  '.lab-pattern-card',
  '.lab-symbol-chip',
  '.lab-what-to-notice',
  '.lab-interactive-grid',
  '.lab-neighborhood-widget-grid',
  '.lab-life-grid',
  '.lab-domain-widget-grid',
  '.lab-domain-legend'
].forEach((needle) => assertIncludes(css, needle, cssPath));

assertNoExternalLinks(article, articlePath);

const widgetFullPath = path.join(ROOT, widgetPath);
const widgetSource = await fs.readFile(widgetFullPath, 'utf8');
assertIncludes(widgetSource, 'Rule 90', widgetPath);
assertIncludes(widgetSource, 'Rule 110', widgetPath);
assertIncludes(widgetSource, 'Rule 30', widgetPath);
assertIncludes(widgetSource, 'NeighborhoodUpdateWidget', widgetPath);
assertIncludes(widgetSource, 'GameOfLifeWidget', widgetPath);
assertIncludes(widgetSource, 'DomainRuleAllocationWidget', widgetPath);
assertIncludes(widgetSource, 'data-neighborhood-mode', widgetPath);
assertIncludes(widgetSource, 'data-life-action="step"', widgetPath);
assertIncludes(widgetSource, 'data-domain-action="step"', widgetPath);
assertIncludes(widgetSource, 'seededRng', widgetPath);
assertNotIncludes(widgetSource, 'Phaser', widgetPath);
assertNotIncludes(widgetSource, ' from ', widgetPath);
await import(pathToFileUrl(widgetFullPath));

console.log('PASS deterministic process learning lab smoke');

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
