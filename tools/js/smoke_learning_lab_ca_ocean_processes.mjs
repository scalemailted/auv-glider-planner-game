import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const articlePath = 'labs/ca-for-ocean-relevant-processes.html';
const cssPath = 'css/labs.css';
const widgetPath = 'src/labs/widgets/OceanCaProcessWidgets.js';

const [article, css, widget] = await Promise.all([
  read(articlePath),
  read(cssPath),
  read(widgetPath)
]);

[
  'Cellular Automata for Ocean-Relevant Processes',
  'What CA can model honestly',
  'What CA cannot model by itself',
  'Bloom growth / decay',
  'River plume front',
  'Oil / chemical plume',
  'Marine plastic / drifting pollutant',
  'Turbidity event',
  'Thermocline',
  'Hypoxia',
  'Persistent monitoring / freshness',
  'Event intensity is not sampling priority',
  'From CA analog to mission-grade sampling model',
  'sampling_priority',
  'travel_cost',
  'current_risk',
  'hidden_event_suspicion',
  'data-ocean-ca-widget="event-intensity-vs-priority"',
  'data-ocean-ca-widget="plume-front"',
  '../src/labs/widgets/OceanCaProcessWidgets.js',
  'Back to Learning Labs'
].forEach((needle) => assertIncludes(article, needle, articlePath));

assertNoExternalLinks(article, articlePath);
assertIncludes(css, '.lab-claim-badge', cssPath);
assertIncludes(css, '.lab-widget-map', cssPath);

[
  'EventIntensityPriorityWidget',
  'PlumeFrontWidget',
  'BloomGrowthDecayWidget',
  'FreshnessRevisitWidget'
].forEach((needle) => assertIncludes(widget, needle, widgetPath));
assertNotIncludes(widget, 'Phaser', widgetPath);
assertNotIncludes(widget, 'anchorGame', widgetPath);
await import(pathToFileUrl(path.join(ROOT, widgetPath)));

console.log('PASS learning lab CA ocean processes smoke');

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