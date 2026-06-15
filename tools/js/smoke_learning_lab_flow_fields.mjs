import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const articlePath = 'labs/deterministic-dynamic-flow-fields.html';
const cssPath = 'css/labs.css';
const widgetPath = 'src/labs/widgets/FlowFieldLearningWidgets.js';

const article = await read(articlePath);
const css = await read(cssPath);
const widgetSource = await read(widgetPath);

[
  'What is a flow field?',
  'Direction and magnitude',
  'Flow as a vector function',
  'Particles as flow tracers',
  'Spatial structure',
  'Time-varying deterministic flow',
  'Boundaries, land, and topology',
  'Additive flow layers',
  'From flow to transport',
  'How this connects to coupled sampling spaces',
  'Open the full Flow Fields sandbox',
  'What comes next'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'F(x,y,t)',
  '&lt;u',
  'v',
  'sqrt',
  'p(t',
  '&Delta;t',
  'F_total',
  'S*'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'Uniform',
  'Shear',
  'Vortex',
  'Converging',
  'Diverging',
  'Particle',
  'Boundary',
  'Terrain',
  'Additive'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'data-flow-widget="vector-components"',
  'data-flow-widget="field-presets"',
  'data-flow-widget="particle-tracer"',
  'data-flow-widget="time-varying-flow"',
  'data-flow-widget="additive-layers"',
  '../src/labs/widgets/FlowFieldLearningWidgets.js',
  'href="index.html"',
  'href="../index.html"'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  '.lab-vector-card',
  '.lab-flow-widget',
  '.lab-widget-canvas',
  '.lab-flow-preset-grid',
  '.lab-arrow-diagram',
  '.lab-particle-diagram',
  '.lab-layer-stack',
  '.lab-equation-row',
  '.lab-field-stack',
  '.lab-flow-mini-card',
  '.lab-concept-bridge'
].forEach((needle) => assertIncludes(css, needle, cssPath));

[
  'VectorComponentWidget',
  'FlowPresetWidget',
  'ParticleTracerWidget',
  'TimeVaryingFlowWidget',
  'AdditiveLayersWidget',
  'sampleFlow',
  'seededRng',
  'requestAnimationFrame'
].forEach((needle) => assertIncludes(widgetSource, needle, widgetPath));

assertNoExternalLinks(article, articlePath);
assertNotIncludes(widgetSource, 'Phaser', widgetPath);
assertNotIncludes(widgetSource, 'anchorGame', widgetPath);
assertNotIncludes(widgetSource, ' from ', widgetPath);
await import(pathToFileUrl(path.join(ROOT, widgetPath)));

console.log('PASS deterministic dynamic flow fields learning lab smoke');

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
