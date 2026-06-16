import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const articlePath = 'labs/sampling-priority-to-glider-action-value.html';
const widgetPath = 'src/labs/widgets/SamplingActionValueWidgets.js';

const [article, widgetSource] = await Promise.all([
  read(articlePath),
  read(widgetPath)
]);

[
  'From Sampling Priority to Glider Action Value',
  'The problem: sampling is not hotspot chasing',
  'Event intensity, ROI, priority, and action value',
  'Global sampling priority A_global(x,y,t)',
  'Candidate sample points',
  'Why flow changes the decision',
  'Glider action value Q_glider(g,x,y,t)',
  'Example: high-priority target, bad glider action',
  'Example: lower-priority target, better current assist',
  'Example: future intercept instead of chasing the center',
  'Example: two gliders and redundancy',
  'What this still is not: not route planning yet',
  'How this connects to Planner / Mission Evaluation',
  'Open the sandboxes'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'Event intensity is not sampling priority',
  'Sampling priority is not glider action value',
  'Action value is not route planning',
  'A_global',
  'Q_glider',
  'eventIntensity(x,y,t)',
  'trueRoi(x,y,t)',
  'beliefRoi(x,y,t)',
  'candidateSamplePoint',
  'routePlan',
  'currentAssist',
  'crossCurrentRisk',
  'energyCost',
  'redundancyPenalty',
  'not a calibrated ocean model',
  'not full route planning',
  'not a production data-assimilation system',
  'not a GP/GMRF planner',
  'not a MARL environment yet'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'Sampling Priority Demo',
  'Flow-Coupled Sampling Demo',
  'Flow Fields Demo',
  'Planner / Mission Evaluation',
  'data-sampling-action-widget="priority-vs-intensity"',
  'data-sampling-action-widget="priority-to-action"',
  'data-sampling-action-widget="current-assist"',
  'data-sampling-action-widget="redundancy"',
  '../src/labs/widgets/SamplingActionValueWidgets.js'
].forEach((needle) => assertIncludes(article, needle, articlePath));

[
  'PriorityVsIntensityWidget',
  'PriorityToActionWidget',
  'CurrentAssistWidget',
  'RedundancyWidget',
  'data-action-value-weight',
  'data-action-assist-weight',
  'data-current-strength',
  'data-redundancy-toggle'
].forEach((needle) => assertIncludes(widgetSource, needle, widgetPath));

assertNoExternalLinks(article, articlePath);
assertNotIncludes(widgetSource, 'Phaser', widgetPath);
assertNotIncludes(widgetSource, 'anchorGame', widgetPath);
assertNotIncludes(widgetSource, ' from ', widgetPath);
await import(pathToFileUrl(path.join(ROOT, widgetPath)));

console.log('PASS sampling priority to glider action value learning lab smoke');

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
