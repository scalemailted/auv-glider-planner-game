import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const requiredFiles = [
  'README.md',
  'HOWPLAY.md',
  'docs/testing.md',
  'docs/development_versions.md',
  'docs/export_formats.md',
  'docs/benchmark_modes.md',
  'docs/benchmark_route_execution_contract.md',
  'docs/sampling_priority_demo.md',
  'docs/flow_coupled_sampling_demo.md',
  'docs/flow_fields_demo.md',
  'docs/coupled_fields_demo.md',
  'docs/sample_fields_demo.md',
  'labs/index.html',
  'labs/sampling-priority-to-glider-action-value.html'
];

const optionalFiles = [
  'docs/uncertainty_forecast_demo.md'
];

const failures = [];
const warnings = [];
const contents = new Map();

for (const file of requiredFiles) {
  if (!(await exists(file))) {
    failures.push(`missing required doc/page: ${file}`);
    continue;
  }
  contents.set(file, await read(file));
}

for (const file of optionalFiles) {
  if (await exists(file)) contents.set(file, await read(file));
  else warnings.push(`optional doc not present: ${file}`);
}

checkIncludes('labs/index.html', [
  'sampling-priority-to-glider-action-value.html',
  'Sampling Priority to Glider Action Value'
]);

checkIncludes('labs/sampling-priority-to-glider-action-value.html', [
  'A_global',
  'Q_glider',
  'Event intensity is not sampling priority',
  'Sampling priority is not glider action value',
  'Action value is not route planning',
  'Sampling Priority Demo',
  'Flow-Coupled Sampling Demo'
]);

checkIncludes('docs/benchmark_modes.md', [
  'Planner Benchmark',
  'Adaptive Benchmark',
  'Full Autonomy Benchmark',
  'objective authority',
  'route authority',
  'P0 defines the benchmark architecture skeleton',
  'does not implement route planning, mission scoring, or MARL'
]);


checkIncludes('docs/benchmark_route_execution_contract.md', [
  'P1 Planner / Mission Evaluation Route-Execution Contract',
  'benchmark episode lifecycle',
  'route execution record',
  'result/debrief adapter',
  'does not implement a new planner',
  'does not redesign scoring'
]);
checkIncludes('docs/sampling_priority_demo.md', [
  'A_global',
  'not route planning',
  'not flow-coupled action value'
]);

checkIncludes('docs/flow_coupled_sampling_demo.md', [
  'Q_glider',
  'A_global',
  'not full route planning'
]);

checkEitherIncludes(['README.md', 'HOWPLAY.md'], [
  'Sampling Priority Demo',
  'Flow-Coupled Sampling Demo',
  'A_global',
  'Q_glider',
  'Planner Benchmark',
  'Adaptive Benchmark',
  'Full Autonomy Benchmark'
]);

for (const [sourceFile, text] of contents.entries()) {
  checkRequiredLocalLinks(sourceFile, text);
}

console.log('DOCS MODEL STACK LINK AUDIT');
for (const file of requiredFiles) console.log(`  required: ${contents.has(file) ? 'present' : 'missing'} ${file}`);
for (const file of optionalFiles) console.log(`  optional: ${contents.has(file) ? 'present' : 'missing'} ${file}`);

if (warnings.length) {
  console.log('\nWARNINGS');
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (failures.length) {
  console.error('\nFAILURES');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('\nPASS docs model stack links audit');
}

function checkIncludes(file, needles) {
  const text = contents.get(file) ?? '';
  for (const needle of needles) {
    if (!text.includes(needle)) failures.push(`${file} missing required text: ${needle}`);
  }
}

function checkEitherIncludes(files, needles) {
  const merged = files.map((file) => contents.get(file) ?? '').join('\n');
  for (const needle of needles) {
    if (!merged.includes(needle)) failures.push(`${files.join(' or ')} missing required text: ${needle}`);
  }
}

function checkRequiredLocalLinks(sourceFile, text) {
  const links = [];
  for (const match of text.matchAll(/href="([^"]+)"/g)) links.push(match[1]);
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) links.push(match[1]);
  for (const link of links) {
    if (!isRequiredLink(link)) continue;
    const target = normalizeLocalLink(sourceFile, link);
    if (!target) continue;
    if (!contents.has(target) && !requiredFiles.includes(target) && !optionalFiles.includes(target)) {
      warnings.push(`${sourceFile} has local model-stack link not in audit set: ${link}`);
      continue;
    }
    if (!contents.has(target) && requiredFiles.includes(target)) failures.push(`${sourceFile} links to missing required file: ${link}`);
  }
}

function isRequiredLink(link) {
  return /benchmark_route_execution_contract|benchmark_modes|sampling-priority-to-glider-action-value|sampling_priority_demo|flow_coupled_sampling_demo|flow_fields_demo|coupled_fields_demo|uncertainty_forecast_demo|sample_fields_demo|testing|development_versions|export_formats|README|HOWPLAY/.test(link);
}

function normalizeLocalLink(sourceFile, rawLink) {
  if (/^[a-z]+:/i.test(rawLink) || rawLink.startsWith('#')) return null;
  const clean = rawLink.split('#')[0].split('?')[0];
  if (!clean) return null;
  const base = path.dirname(sourceFile);
  return path.normalize(path.join(base, clean)).replaceAll('\\', '/').replace(/^\.\//, '');
}

async function exists(file) {
  try {
    await fs.access(path.join(ROOT, file));
    return true;
  } catch {
    return false;
  }
}

async function read(file) {
  return fs.readFile(path.join(ROOT, file), 'utf8');
}