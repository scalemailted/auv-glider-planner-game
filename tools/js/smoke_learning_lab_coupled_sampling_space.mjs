import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const articlePath = 'labs/oracle-deterministic-coupled-sampling-space.html';
const cssPath = 'css/labs.css';
const widgetPath = 'src/labs/widgets/CoupledSamplingLearningWidgets.js';

const article = await read(articlePath);
const css = await read(cssPath);
const widgetSource = await read(widgetPath);

[
  'Why couple fields?',
  'Process value is not yet sampling value',
  'Flow changes transport and reachability',
  'Constraints define where sampling is possible',
  'The oracle sampling objective',
  'Layer composition',
  'Flow-coupled examples',
  'Reachable value and timing',
  'Oracle missions before uncertainty',
  'How this connects to stochastic coupled sampling'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'X(x,y,t)',
  'V(x,y,t)',
  'F(x,y,t)',
  'C(x,y)',
  'S*',
  'h(V',
  'p(t',
  '&Delta;t',
  'A(x,y,t)',
  'regret'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'Flow-carried bloom',
  'River plume front',
  'Eddy-trapped patch',
  'Current-sheared hotspot',
  'Shoreline runoff',
  'Convergence-zone accumulation',
  'Oracle',
  'Deterministic',
  'Constraints',
  'Reachability'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'data-coupled-widget="flow-carried-patch"',
  'data-coupled-widget="constraint-mask"',
  'data-coupled-widget="layer-composer"',
  'data-coupled-widget="reachability-timing"',
  '../src/labs/widgets/CoupledSamplingLearningWidgets.js',
  'href="index.html"',
  'href="../index.html"'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  '.lab-coupled-widget',
  '.lab-layer-composer',
  '.lab-field-stack',
  '.lab-oracle-card',
  '.lab-constraint-card',
  '.lab-reachability-card',
  '.lab-comparison-table',
  '.lab-objective-stack',
  '.lab-coupled-mini-card',
  '.lab-canvas-legend',
  '.lab-layer-toggle-row'
].forEach((needle) => assertIncludes(css, needle, cssPath));

[
  'FlowCarriedPatchWidget',
  'ConstraintMaskWidget',
  'LayerComposerWidget',
  'ReachabilityTimingWidget',
  'composeOracleObjective',
  'sampleProcess',
  'sampleFlow',
  'sampleConstraint',
  'seededRng'
].forEach((needle) => assertIncludes(widgetSource, needle, widgetPath));

assertNoExternalLinks(article, articlePath);
assertNotIncludes(widgetSource, 'Phaser', widgetPath);
assertNotIncludes(widgetSource, 'anchorGame', widgetPath);
assertNotIncludes(widgetSource, ' from ', widgetPath);
await import(pathToFileUrl(path.join(ROOT, widgetPath)));

console.log('PASS oracle deterministic coupled sampling space learning lab smoke');

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
