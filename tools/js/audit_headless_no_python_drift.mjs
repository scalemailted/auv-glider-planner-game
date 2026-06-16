import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const expectedNodeRuntimeFiles = [
  'src/core/headless/runtime/HeadlessRuntimeConfig.js',
  'src/core/headless/runtime/HeadlessGrid.js',
  'src/core/headless/runtime/HeadlessFields.js',
  'src/core/headless/runtime/HeadlessFlow.js',
  'src/core/headless/runtime/HeadlessGlider.js',
  'src/core/headless/runtime/HeadlessObservation.js',
  'src/core/headless/runtime/HeadlessBeliefUpdate.js',
  'src/core/headless/runtime/HeadlessPriority.js',
  'src/core/headless/runtime/HeadlessScoring.js',
  'src/core/headless/runtime/HeadlessMissionRunner.js',
  'src/core/headless/runtime/HeadlessBundleWriter.js',
  'tools/js/headless_oceanbox.mjs',
  'tools/js/audit_headless_runtime_import_boundaries.mjs'
];

const allowedPythonFiles = new Set([
  'tools/python/README.md',
  'tools/python/example_greedy_solver.py',
  'tools/python/example_solver_readme.md',
  'tools/python/solve_greedy.py',
  'tools/python/notebooks/anchor_external_solver_template.ipynb',
  'tools/python/notebooks/oceanbox_js_colab_quickstart.md',
  'tools/python/anchor_headless/__init__.py',
  'tools/python/anchor_headless/export.py',
  'tools/python/anchor_headless/my_io.py',
  'tools/python/anchor_headless/solvers.py',
  'tools/python/anchor_headless/validation.py',
  'tools/python/anchor_headless/world.py'
]);

const forbiddenPaths = [
  'tools/python/oceanbox',
  'tools/python/oceanbox/oceanbox',
  'tools/python/oceanbox/src/oceanbox',
  'src/oceanbox',
  'oceanbox'
];

const forbiddenPackageFiles = [
  'tools/python/oceanbox/pyproject.toml',
  'pyproject.toml',
  'oceanbox/pyproject.toml'
];

const docsToAudit = [
  'README.md',
  'HOWPLAY.md',
  'docs/headless_colab_oceanbox_schema_alignment.md',
  'docs/headless_colab_bundle_manifest.md',
  'docs/headless_node_oceanbox_runtime.md',
  'docs/export_formats.md',
  'docs/testing.md',
  'docs/development_versions.md',
  'tools/js/README.md',
  'tools/python/README.md',
  'tools/python/notebooks/oceanbox_js_colab_quickstart.md'
];

const failures = [];
const warnings = [];

for (const file of expectedNodeRuntimeFiles) {
  if (!exists(file)) failures.push(`missing corrected H1 Node artifact: ${file}`);
}

for (const forbiddenPath of forbiddenPaths) {
  if (exists(forbiddenPath)) failures.push(`forbidden Python OceanBox package path exists: ${forbiddenPath}`);
}

for (const file of forbiddenPackageFiles) {
  if (exists(file)) failures.push(`forbidden Python OceanBox package config exists: ${file}`);
}

for (const file of walkFiles('tools/python')) {
  const relative = repoRelative(file);
  if (relative.includes('__pycache__') || relative.endsWith('.pyc')) continue;
  if (relative.includes('/oceanbox/')) failures.push(`forbidden tools/python/oceanbox artifact: ${relative}`);
  if (relative.endsWith('.py') && !allowedPythonFiles.has(relative)) {
    warnings.push(`Python helper outside explicit allow-list; review optional-wrapper status: ${relative}`);
  }
}

for (const file of walkFiles('.')) {
  const relative = repoRelative(file);
  if (skipPath(relative)) continue;
  if (/test_oceanbox_.*\.py$/i.test(relative)) failures.push(`forbidden OceanBox Python simulator test file: ${relative}`);
  if (/smoke_oceanbox_.*\.py$/i.test(relative)) failures.push(`forbidden OceanBox Python simulator smoke file: ${relative}`);
  if (/oceanbox[\/](cli|api|core|export|tests)[\/]/i.test(relative)) failures.push(`forbidden OceanBox Python package module path: ${relative}`);
}

for (const file of docsToAudit) {
  if (!exists(file)) {
    failures.push(`missing architecture doc: ${file}`);
    continue;
  }
  const text = read(file);
  if (!/Node headless runtime|Node\.js|Node\/JS|OceanBox-JS/i.test(text)) failures.push(`${file} does not mention Node headless runtime direction.`);
  if (file.includes('tools/python') && !/(wrapper|solver|analysis|not a second simulator|not a Python port|not add a Python OceanBox simulator)/i.test(text)) {
    failures.push(`${file} does not clearly frame Python as wrapper/solver/analysis only.`);
  }
  auditArchitectureClaims(file, text);
  auditH1DependencyDrift(file, text);
}

const jsReadme = read('tools/js/README.md');
if (!/Node headless runtime over portable ANCHOR core logic/.test(jsReadme)) failures.push('tools/js/README.md missing required Node headless runtime wording.');
const pythonReadme = read('tools/python/README.md');
if (!/canonical non-browser runtime is Node\.js/i.test(pythonReadme)) failures.push('tools/python/README.md must state Node.js is canonical non-browser runtime.');
if (!/wrapper|solver|analysis/i.test(pythonReadme)) failures.push('tools/python/README.md must frame Python as wrapper/solver/analysis workflow.');

console.log('HEADLESS NO-PYTHON-DRIFT AUDIT');
console.log(`  Node runtime files checked: ${expectedNodeRuntimeFiles.length}`);
console.log(`  Architecture docs checked: ${docsToAudit.length}`);
console.log('  Allowed Python wrapper/tool files:');
for (const file of [...allowedPythonFiles].sort()) {
  if (exists(file)) console.log(`    allowed: ${file}`);
}
if (warnings.length) {
  console.log('\nWARNINGS');
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

assert.deepEqual(failures, [], `Headless Python drift failures:\n${failures.join('\n')}`);
console.log('\nPASS headless no-Python-drift audit');

function auditArchitectureClaims(file, text) {
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (/Python.*canonical/i.test(trimmed) && !/Node\.js.*canonical|not|not a|not add|wrapper|analysis|optional/i.test(trimmed)) {
      failures.push(`${file}:${index + 1}: suspicious Python canonical-runtime claim: ${trimmed}`);
    }
    if (/(Python OceanBox|OceanBox Python).*implement/i.test(trimmed) && !/does not|not|no/i.test(trimmed)) {
      failures.push(`${file}:${index + 1}: suspicious Python OceanBox implementation claim: ${trimmed}`);
    }
    if (/Python.*(official|authoritative).*simulat/i.test(trimmed) && !/not|no|browser/i.test(trimmed)) {
      failures.push(`${file}:${index + 1}: suspicious Python official simulator claim: ${trimmed}`);
    }
    if (/Python.*second simulator/i.test(trimmed) && !/not|no/i.test(trimmed)) {
      failures.push(`${file}:${index + 1}: suspicious second simulator claim: ${trimmed}`);
    }
  });
}

function auditH1DependencyDrift(file, text) {
  let scopedText = text;
  if (file === 'docs/export_formats.md') scopedText = text.slice(Math.max(0, text.indexOf('## H1 Node Headless Bundle')));
  if (file === 'docs/development_versions.md') scopedText = text.slice(Math.max(0, text.indexOf('### H1 - Node Headless')));
  if (file === 'docs/testing.md') scopedText = text.slice(Math.max(0, text.indexOf('## H1 Node Headless Runtime Checks')));
  const h1Specific = file === 'docs/headless_node_oceanbox_runtime.md'
    || file === 'tools/python/notebooks/oceanbox_js_colab_quickstart.md'
    || file === 'tools/python/README.md'
    || file === 'tools/js/README.md'
    || /H1 Node Headless|H1 Node headless|OceanBox-JS/i.test(scopedText);
  if (!h1Specific) return;
  const dependencyPatterns = [
    /pip install -e/i,
    /pip install (numpy|scipy|pandas|pydantic|fastapi|uvicorn|xarray|zarr|pyarrow|httpx|ruff|mypy)/i,
    /^\s*import\s+(numpy|scipy|pandas|pydantic|fastapi|uvicorn|xarray|zarr|pyarrow)\b/im,
    /^\s*from\s+(numpy|scipy|pandas|pydantic|fastapi|uvicorn|xarray|zarr|pyarrow)\b/im
  ];
  for (const pattern of dependencyPatterns) {
    if (pattern.test(scopedText)) failures.push(`${file}: H1 docs should not introduce Python package dependency example: ${pattern}`);
  }
}

function walkFiles(start) {
  if (!exists(start)) return [];
  const absoluteStart = path.join(ROOT, start);
  const results = [];
  const stack = [absoluteStart];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const relative = normalize(path.relative(ROOT, full));
      if (skipPath(relative)) continue;
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) results.push(full);
    }
  }
  return results;
}

function skipPath(relative) {
  return relative === '.git'
    || relative.startsWith('.git/')
    || relative === 'node_modules'
    || relative.startsWith('node_modules/')
    || relative === 'tmp'
    || relative.startsWith('tmp/')
    || relative === 'test-results'
    || relative.startsWith('test-results/')
    || relative === 'playwright-report'
    || relative.startsWith('playwright-report/')
    || relative === 'coverage'
    || relative.startsWith('coverage/')
    || relative === 'dist'
    || relative.startsWith('dist/')
    || relative === 'build'
    || relative.startsWith('build/')
    || relative === '.cache'
    || relative.startsWith('.cache/');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function repoRelative(value) {
  const text = String(value);
  const relative = path.isAbsolute(text) ? path.relative(ROOT, text) : text;
  return normalize(relative);
}

function normalize(value) {
  return String(value).replaceAll('\\', '/').replace(/^\.\//, '');
}
