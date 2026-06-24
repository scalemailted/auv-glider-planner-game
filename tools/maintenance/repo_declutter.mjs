import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLAYWRIGHT_GROUPS,
  groupsForProfile,
  patternsForGroupProfile
} from '../js/playwright_groups.mjs';

const ROOT = process.cwd();
const GENERATED_PATH_PATTERNS = [
  /^_site(?:\/|$)/,
  /^node_modules(?:\/|$)/,
  /^test-results(?:\/|$)/,
  /^playwright-report(?:\/|$)/,
  /^debug\.log$/,
  /^cwd.*\.txt$/,
  /(?:^|\/)__pycache__(?:\/|$)/,
  /\.pyc$/,
  /^\.last-run\.json$/,
  /^tmp(?:\/|$)/,
  /^\.tmp(?:\/|$)/
];
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.json', '.md', '.html', '.css', '.svg', '.txt', '.yml', '.yaml']);
const DOC_ROOTS = new Set(['README.md', 'HOWPLAY.md', 'ROADMAP.md', 'MILESTONES.md', 'AGENTS.md', 'SCAFFOLD_STATUS.md']);
const STATIC_PUBLIC_ROOTS = ['css/', 'vendor/', 'labs/', 'levels/', 'missions/', 'plans/', 'experiments/', 'schemas/', 'tutorials/', 'favicon.svg'];
const PRODUCTION_ROOTS = ['index.html', 'src/game/main.js', 'src/app/production/', 'src/game/phaser/PhaserGame.js', 'src/game/phaser/PhaserProductionBootstrap.js', 'src/game/phaser/scenes/', 'src/game/three/', 'src/core/', 'packages/'];
const BUILD_TOOL_ROOTS = ['package.json', 'package-lock.json', 'playwright.config.js', 'tools/js/build_github_pages.mjs', 'tools/js/run_playwright_groups.mjs', 'tools/js/playwright_groups.mjs', 'tools/check-js.mjs', 'tools/maintenance/'];
const COMPATIBILITY_HINTS = ['forwarder', 'compat', 'legacy saved-level', 'migration', 'schema', 'HeadlessSchema', 'Replay'];

const command = process.argv[2] ?? 'verify';

if (command === 'inventory') printJson(buildInventory());
else if (command === 'reachability') printJson(buildReachability());
else if (command === 'tests') printJson(buildTestPortfolio());
else if (command === 'docs') writeReports();
else if (command === 'verify') verify();
else {
  console.error(`Unknown command: ${command}`);
  console.error('Expected one of: inventory, reachability, tests, docs, verify');
  process.exit(2);
}

function buildInventory() {
  const tracked = trackedFiles();
  const classifications = tracked.map((file) => ({ path: file, classification: classifyFile(file), lines: countLines(file) }));
  const byClassification = countBy(classifications, (row) => row.classification);
  const localGenerated = generatedLocalRows();
  const pages = directoryStats('_site');
  return {
    type: 'anchor.repo-declutter.inventory',
    version: 'repo-clean-r1',
    head: git(['rev-parse', 'HEAD']).trim(),
    branch: git(['branch', '--show-current']).trim(),
    trackedFileCount: tracked.length,
    trackedSourceFileCount: tracked.filter((file) => isSource(file)).length,
    trackedDocumentationCount: tracked.filter((file) => isDocumentation(file)).length,
    trackedTestCount: tracked.filter((file) => file.startsWith('tests/')).length,
    trackedToolsJsCount: tracked.filter((file) => file.startsWith('tools/js/') && file.endsWith('.mjs')).length,
    trackedPhaserSourceCount: tracked.filter((file) => file.startsWith('src/game/phaser/') && file.endsWith('.js')).length,
    trackedThreeSourceCount: tracked.filter((file) => file.startsWith('src/game/three/') && file.endsWith('.js')).length,
    trackedLinesByCategory: lineCountsByCategory(classifications),
    byClassification,
    localGenerated,
    pages,
    packageScripts: packageScripts(),
    classifications
  };
}

function buildReachability() {
  const tracked = trackedFiles();
  const imports = importEdges(tracked);
  const unresolvedImports = imports.filter((edge) => edge.resolved && !existsSync(path.join(ROOT, edge.resolved)) && productionImportSource(edge.from));
  const packageScriptFiles = packageScriptReferences();
  const htmlReferences = htmlScriptReferences(tracked);
  const phaserRows = tracked
    .filter((file) => file.startsWith('src/game/phaser/') && file.endsWith('.js'))
    .map((file) => phaserReachabilityRow(file, imports, packageScriptFiles));
  const archiveRefs = referenceRows('archive/legacy-vanilla-shell');
  return {
    type: 'anchor.repo-declutter.reachability',
    version: 'repo-clean-r1',
    runtime: runtimeSummary(),
    importEdgeCount: imports.length,
    unresolvedImports,
    packageScriptFiles,
    htmlReferences,
    phaserRows,
    archiveRefs,
    highConfidenceDeleteCandidates: deletionCandidates(tracked, imports)
  };
}

function buildTestPortfolio() {
  const titles = testTitles();
  const byProfile = Object.fromEntries(['smoke', 'release', 'visual', 'full'].map((profile) => [profile, profileTitleCount(profile, titles)]));
  const rows = titles.map((row) => ({
    ...row,
    group: groupForTitle(row.title),
    runtime: row.title.match(/Pages|Subpath/i) ? 'static-host-browser' : 'browser',
    setupCost: estimateSetupCost(row.title),
    productionCapability: capabilityForTitle(row.title),
    userVisiblePath: userVisiblePathForTitle(row.title),
    canonicalContractChecked: contractForTitle(row.title),
    implementationDetailChecked: implementationDetailForTitle(row.title),
    overlappingTests: overlappingTests(row.title, titles),
    phase: phaseForTitle(row.title),
    proposedAction: proposedActionForTitle(row.title)
  }));
  return {
    type: 'anchor.repo-declutter.test-portfolio',
    version: 'repo-clean-r1',
    total: rows.length,
    byProfile,
    byAction: countBy(rows, (row) => row.proposedAction),
    rows
  };
}

function writeReports() {
  mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  mkdirSync(path.join(ROOT, 'tools/maintenance'), { recursive: true });
  const inventory = buildInventory();
  const reachability = buildReachability();
  const tests = buildTestPortfolio();
  const manifest = buildManifest(reachability);
  writeFileSync(path.join(ROOT, 'tools/maintenance/repo_declutter_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(ROOT, 'docs/repository_declutter_audit.md'), renderDeclutterAudit(inventory, reachability), 'utf8');
  writeFileSync(path.join(ROOT, 'docs/test_portfolio.md'), renderTestPortfolio(tests), 'utf8');
  writeFileSync(path.join(ROOT, 'docs/repository_cleanup.md'), renderCleanupReport(inventory, reachability, tests, manifest), 'utf8');
  console.log('repo_declutter docs: wrote docs/repository_declutter_audit.md, docs/test_portfolio.md, docs/repository_cleanup.md, and tools/maintenance/repo_declutter_manifest.json');
}

function verify() {
  const failures = [];
  const inventory = buildInventory();
  const reachability = buildReachability();
  const scripts = packageScripts();
  for (const name of ['test:fast', 'test:e2e:smoke', 'test:e2e', 'test:e2e:visual', 'test:full']) {
    if (!scripts[name]) failures.push(`package.json missing validation tier script: ${name}`);
  }
  if (reachability.unresolvedImports.length) failures.push(`unresolved imports: ${reachability.unresolvedImports.length}`);
  const trackedGenerated = inventory.classifications.filter((row) => row.classification === 'GENERATED_TRACKED' && existsSync(path.join(ROOT, row.path)));
  if (trackedGenerated.length) failures.push(`tracked generated files remain: ${trackedGenerated.map((row) => row.path).join(', ')}`);
  const archiveTracked = trackedFiles().filter((file) => file.startsWith('archive/legacy-vanilla-shell/'));
  if (archiveTracked.some((file) => existsSync(path.join(ROOT, file)))) failures.push('archive/legacy-vanilla-shell still exists in the working tree');
  const coverage = spawnSync(process.execPath, ['tools/js/audit_playwright_group_coverage.mjs'], { cwd: ROOT, encoding: 'utf8' });
  if (coverage.status !== 0) failures.push('Playwright group coverage audit failed');
  if (profileTitleCount('smoke').total < 12) failures.push('browser smoke profile has too few tests');
  if (profileTitleCount('release').total > 110) failures.push(`release profile exceeds REPO-CLEAN-R1 target: ${profileTitleCount('release').total}`);
  if (!existsSync(path.join(ROOT, 'tools/maintenance/repo_declutter_manifest.json'))) failures.push('missing repo_declutter_manifest.json');
  if (!existsSync(path.join(ROOT, 'docs/repository_cleanup.md'))) failures.push('missing docs/repository_cleanup.md');
  if (failures.length) {
    console.error('repo_declutter verify failed');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('repo_declutter verify: ok', {
    trackedFiles: inventory.trackedFileCount,
    smokeTests: profileTitleCount('smoke').total,
    releaseTests: profileTitleCount('release').total,
    visualTests: profileTitleCount('visual').total,
    fullTests: profileTitleCount('full').total
  });
}

function productionImportSource(file) {
  return file === 'index.html'
    || file.startsWith('src/')
    || file.startsWith('packages/')
    || file.startsWith('labs/')
    || file.startsWith('tools/js/build_')
    || file.startsWith('tools/js/smoke_github_pages')
    || file.startsWith('tools/js/check_')
    || file.startsWith('tools/js/audit_github_pages');
}

function runtimeSummary() {
  return {
    htmlEntry: 'index.html',
    moduleEntry: 'src/game/main.js',
    defaultRuntime: 'phaser',
    gatedRuntime: 'next via runtimeShell=next or ANCHOR_RUNTIME_SHELL=next',
    pagesRuntime: 'same static index.html and src/game/main.js under Pages subpath',
    phaserOwnership: 'default lifecycle shell, route/scene manager, transitional UI orchestration, Learning Lab host',
    threeOwnership: 'mission-world, bathymetry, current, replay, and editor rendering inside supported routes'
  };
}

function buildManifest(reachability) {
  const candidates = reachability.highConfidenceDeleteCandidates.map((candidate) => ({
    path: candidate.path,
    category: candidate.category,
    reason: candidate.reason,
    staticReferences: candidate.staticReferences ?? [],
    dynamicReferences: candidate.dynamicReferences ?? [],
    packageScriptReferences: candidate.packageScriptReferences ?? [],
    documentationReferences: candidate.documentationReferences ?? [],
    replacement: candidate.replacement ?? null,
    deletionConfidence: candidate.deletionConfidence,
    action: candidate.action
  }));
  return { type: 'anchor.repo-declutter.manifest', version: 'repo-clean-r1', generatedAt: new Date().toISOString(), candidates };
}

function deletionCandidates(tracked, imports) {
  const candidates = [];
  const archiveRootRefs = referenceRows('archive/legacy-vanilla-shell');
  const archiveActiveRefs = archiveRootRefs.filter((row) => !row.path.startsWith('README.md') && !row.path.startsWith('docs/'));
  for (const file of tracked) {
    if (isGeneratedPath(file)) {
      candidates.push(candidate(file, 'GENERATED_TRACKED', 'Generated local artifact is tracked and reproducible.', [], 'delete', 'high', null));
    } else if (file.startsWith('archive/legacy-vanilla-shell/')) {
      candidates.push(candidate(file, 'HISTORICAL_ONLY', `Legacy vanilla shell archive is not imported by production, tests, package scripts, or Pages copy rules; active non-doc refs=${archiveActiveRefs.length}.`, archiveRootRefs, archiveActiveRefs.length ? 'defer' : 'delete', archiveActiveRefs.length ? 'medium' : 'high', 'Git history'));
    }
  }
  return candidates;
}

function candidate(file, category, reason, refs, action, confidence, replacement) {
  return {
    path: file,
    category,
    reason,
    staticReferences: refs.filter((row) => row.kind === 'static').map((row) => row.path),
    dynamicReferences: refs.filter((row) => row.kind === 'dynamic').map((row) => row.path),
    packageScriptReferences: refs.filter((row) => row.kind === 'script').map((row) => row.path),
    documentationReferences: refs.filter((row) => row.kind === 'documentation').map((row) => row.path),
    replacement,
    deletionConfidence: confidence,
    action
  };
}

function classifyFile(file) {
  if (isGeneratedPath(file)) return 'GENERATED_TRACKED';
  if (file.startsWith('archive/legacy-vanilla-shell/')) return 'HISTORICAL_ONLY';
  if (PRODUCTION_ROOTS.some((root) => file === root || file.startsWith(root))) return 'ACTIVE_PRODUCTION';
  if (STATIC_PUBLIC_ROOTS.some((root) => file === root || file.startsWith(root))) return 'ACTIVE_PUBLIC_ASSET';
  if (file.startsWith('tests/') || file.startsWith('tools/js/') || file.startsWith('tools/python/')) return 'ACTIVE_TEST_SUPPORT';
  if (BUILD_TOOL_ROOTS.some((root) => file === root || file.startsWith(root))) return 'ACTIVE_BUILD_TOOL';
  if (isDocumentation(file)) return 'ACTIVE_DOCUMENTATION';
  if (COMPATIBILITY_HINTS.some((hint) => file.toLowerCase().includes(hint.toLowerCase()))) return 'COMPATIBILITY_REQUIRED';
  return 'UNKNOWN_REVIEW_REQUIRED';
}

function renderDeclutterAudit(inventory, reachability) {
  const lines = [];
  lines.push('# Repository Declutter Audit');
  lines.push('');
  lines.push('Generated by `node tools/maintenance/repo_declutter.mjs docs`.');
  lines.push('');
  lines.push('## Runtime Entry Points');
  lines.push('');
  lines.push(`- HTML entry: \`${reachability.runtime.htmlEntry}\``);
  lines.push(`- Module entry: \`${reachability.runtime.moduleEntry}\``);
  lines.push(`- Default runtime: ${reachability.runtime.defaultRuntime}`);
  lines.push(`- Gated runtime: ${reachability.runtime.gatedRuntime}`);
  lines.push(`- Pages runtime: ${reachability.runtime.pagesRuntime}`);
  lines.push(`- Phaser ownership: ${reachability.runtime.phaserOwnership}`);
  lines.push(`- Three ownership: ${reachability.runtime.threeOwnership}`);
  lines.push('');
  lines.push('## Inventory Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|---|---:|');
  for (const [key, value] of Object.entries({
    trackedFiles: inventory.trackedFileCount,
    sourceFiles: inventory.trackedSourceFileCount,
    docsFiles: inventory.trackedDocumentationCount,
    testFiles: inventory.trackedTestCount,
    toolsJsScripts: inventory.trackedToolsJsCount,
    phaserSourceFiles: inventory.trackedPhaserSourceCount,
    threeSourceFiles: inventory.trackedThreeSourceCount
  })) lines.push(`| ${key} | ${value} |`);
  lines.push('');
  lines.push('## Generated Clutter Table');
  lines.push('');
  lines.push('| Path/category | Present locally | Tracked | Generated | Cleanup action |');
  lines.push('|---|---:|---:|---:|---|');
  for (const row of inventory.localGenerated) lines.push(`| ${row.path} | ${row.presentLocally ? 'yes' : 'no'} | ${row.trackedCount} | yes | ${row.cleanupAction} |`);
  lines.push('');
  lines.push('## Phaser Reachability Table');
  lines.push('');
  lines.push('| Phaser module/scene | Default runtime | Gated runtime | Lab-only | Test-only | Action |');
  lines.push('|---|---:|---:|---:|---:|---|');
  for (const row of reachability.phaserRows) lines.push(`| ${row.path} | ${row.defaultRuntime ? 'yes' : 'no'} | ${row.gatedRuntime ? 'yes' : 'no'} | ${row.labOnly ? 'yes' : 'no'} | ${row.testOnly ? 'yes' : 'no'} | ${row.action} |`);
  lines.push('');
  lines.push('## Tracked File Classification');
  lines.push('');
  lines.push('| Path | Classification | Lines |');
  lines.push('|---|---|---:|');
  for (const row of inventory.classifications) lines.push(`| ${row.path} | ${row.classification} | ${row.lines} |`);
  return `${lines.join('\n')}\n`;
}

function renderTestPortfolio(portfolio) {
  const lines = [];
  lines.push('# Test Portfolio');
  lines.push('');
  lines.push('## Profile Counts');
  lines.push('');
  lines.push('| Profile | Tests |');
  lines.push('|---|---:|');
  for (const [profile, value] of Object.entries(portfolio.byProfile)) lines.push(`| ${profile} | ${value.total} |`);
  lines.push('');
  lines.push('## Capability Matrix');
  lines.push('');
  lines.push('| Title | File | Group | Capability | Contract | Proposed action |');
  lines.push('|---|---|---|---|---|---|');
  for (const row of portfolio.rows) lines.push(`| ${escapePipe(row.title)} | ${row.file} | ${row.group} | ${row.productionCapability} | ${row.canonicalContractChecked} | ${row.proposedAction} |`);
  return `${lines.join('\n')}\n`;
}

function renderCleanupReport(inventory, reachability, portfolio, manifest) {
  const lines = [];
  lines.push('# Repository Cleanup');
  lines.push('');
  lines.push('## Before/After Metrics');
  lines.push('');
  lines.push('| Metric | Before | After | Change |');
  lines.push('|---|---:|---:|---:|');
  const metrics = [
    ['tracked files', inventory.trackedFileCount, inventory.trackedFileCount - manifest.candidates.filter((item) => item.action === 'delete' && item.deletionConfidence === 'high').length],
    ['source files', inventory.trackedSourceFileCount, inventory.trackedSourceFileCount - manifest.candidates.filter((item) => item.action === 'delete' && item.path.endsWith('.js')).length],
    ['Phaser files', inventory.trackedPhaserSourceCount, inventory.trackedPhaserSourceCount],
    ['Three files', inventory.trackedThreeSourceCount, inventory.trackedThreeSourceCount],
    ['docs files', inventory.trackedDocumentationCount, inventory.trackedDocumentationCount + 3],
    ['Node smoke/audit scripts', inventory.trackedToolsJsCount, inventory.trackedToolsJsCount],
    ['Playwright tests', portfolio.byProfile.full.total, portfolio.byProfile.release.total],
    ['browser smoke duration', 0, 0],
    ['Pages file count', inventory.pages.count, inventory.pages.count]
  ];
  for (const [name, before, after] of metrics) lines.push(`| ${name} | ${before} | ${after} | ${after - before} |`);
  lines.push('');
  lines.push('## Deleted Source');
  lines.push('');
  lines.push('R1 deletion candidates are limited to high-confidence generated or historical-only files in `tools/maintenance/repo_declutter_manifest.json`.');
  lines.push('');
  lines.push('## Phaser Disposition');
  lines.push('');
  lines.push('- Active shell retained: `vendor/phaser.min.js`, npm `phaser`, `PhaserProductionBootstrap`, `PhaserGame`, and active scene routing.');
  lines.push('- Three.js mission/world rendering retained inside the default Phaser lifecycle shell.');
  lines.push('- Final Phaser dependency removal is deferred.');
  lines.push('');
  lines.push('## Test Portfolio');
  lines.push('');
  lines.push(`- Fast gate: \`npm run test:fast\`.`);
  lines.push(`- Browser smoke gate: \`npm run test:e2e:smoke\` (${portfolio.byProfile.smoke.total} selected tests).`);
  lines.push(`- Release browser gate: \`npm run test:e2e\` (${portfolio.byProfile.release.total} selected tests).`);
  lines.push(`- Visual acceptance: \`npm run test:e2e:visual\` (${portfolio.byProfile.visual.total} selected tests).`);
  lines.push(`- Full historical browser matrix: \`npm run test:e2e:full\` (${portfolio.byProfile.full.total} selected tests).`);
  lines.push('');
  lines.push('## Deferred Review');
  lines.push('');
  lines.push('- Medium/low-confidence source, compatibility forwarders, and phase-specific docs are retained until a follow-up can merge their lasting decisions into canonical docs.');
  return `${lines.join('\n')}\n`;
}

function generatedLocalRows() {
  const tracked = trackedFiles();
  const categories = ['_site', 'node_modules', 'test-results', 'playwright-report', 'debug.log', 'cwd*.txt', '**/__pycache__/**', '*.pyc', '.last-run.json'];
  return categories.map((category) => {
    const trackedCount = tracked.filter((file) => generatedCategoryMatch(category, file)).length;
    return {
      path: category,
      presentLocally: localCategoryPresent(category),
      trackedCount,
      generated: true,
      cleanupAction: trackedCount ? 'delete tracked generated artifact' : 'ignored local artifact; remove working-tree copy when not needed'
    };
  });
}

function localCategoryPresent(category) {
  if (category === 'cwd*.txt') return readdirSafe(ROOT).some((name) => /^cwd.*\.txt$/.test(name));
  if (category === '**/__pycache__/**') return trackedFiles().some((file) => file.includes('/__pycache__/')) || findLocal((file) => file.includes(`${path.sep}__pycache__${path.sep}`));
  if (category === '*.pyc') return trackedFiles().some((file) => file.endsWith('.pyc')) || findLocal((file) => file.endsWith('.pyc'));
  return existsSync(path.join(ROOT, category));
}

function generatedCategoryMatch(category, file) {
  if (category === 'cwd*.txt') return /^cwd.*\.txt$/.test(file);
  if (category === '**/__pycache__/**') return file.includes('/__pycache__/');
  if (category === '*.pyc') return file.endsWith('.pyc');
  return file === category || file.startsWith(`${category}/`);
}

function isGeneratedPath(file) {
  return GENERATED_PATH_PATTERNS.some((pattern) => pattern.test(file));
}

function importEdges(files) {
  const edges = [];
  for (const file of files.filter((candidate) => isText(candidate))) {
    const text = readText(file);
    for (const match of text.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) {
        edges.push({ from: file, specifier, resolved: null, kind: 'package' });
        continue;
      }
      const resolved = normalizePath(path.relative(ROOT, path.resolve(path.dirname(path.join(ROOT, file)), specifier)));
      edges.push({ from: file, specifier, resolved, kind: 'relative' });
    }
  }
  return edges;
}

function htmlScriptReferences(files) {
  const refs = [];
  for (const file of files.filter((candidate) => candidate.endsWith('.html'))) {
    const text = readText(file);
    for (const match of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)) refs.push({ from: file, target: match[1] });
  }
  return refs;
}

function packageScriptReferences() {
  const scripts = packageScripts();
  const refs = [];
  for (const [name, command] of Object.entries(scripts)) {
    for (const match of String(command).matchAll(/(?:node\s+)?((?:tools|src|packages|tests)\/[^\s&|]+\.(?:mjs|js|json))/g)) refs.push({ script: name, path: normalizePath(match[1]) });
  }
  return refs;
}

function phaserReachabilityRow(file, imports, packageScriptFiles) {
  const importedBy = imports.filter((edge) => edge.resolved === file || edge.resolved === file.replace(/\.js$/, ''));
  const defaultRuntime = file.includes('PhaserProductionBootstrap') || file.includes('PhaserGame') || file.includes('/scenes/') || importedBy.some((edge) => edge.from.includes('PhaserProductionBootstrap') || edge.from.includes('PhaserGame') || edge.from.includes('/scenes/'));
  const labOnly = /Learning|Tutorial|Lab/i.test(file);
  const testOnly = !defaultRuntime && importedBy.length > 0 && importedBy.every((edge) => edge.from.startsWith('tests/') || edge.from.startsWith('tools/'));
  return { path: file, defaultRuntime, gatedRuntime: false, labOnly, testOnly, action: defaultRuntime || labOnly ? 'retain' : testOnly ? 'defer-test-only-review' : 'defer-reachability-review', packageScriptReferences: packageScriptFiles.filter((row) => row.path === file).map((row) => row.script) };
}

function referenceRows(target) {
  const rows = [];
  const needle = normalizePath(target);
  for (const file of trackedFiles().filter((candidate) => isText(candidate))) {
    const text = readText(file);
    if (!text.includes(needle) && !text.includes(needle.replaceAll('/', '\\'))) continue;
    rows.push({ path: file, kind: file.startsWith('docs/') || DOC_ROOTS.has(file) ? 'documentation' : 'static' });
  }
  for (const row of packageScriptReferences()) {
    if (row.path.includes(needle)) rows.push({ path: `package.json#${row.script}`, kind: 'script' });
  }
  return rows;
}

function testTitles() {
  const rows = [];
  for (const file of trackedFiles().filter((candidate) => candidate.startsWith('tests/e2e/') && candidate.endsWith('.js'))) {
    const text = readText(file);
    for (const match of text.matchAll(/test\(\s*['`]([^'`]+)['`]/g)) rows.push({ title: match[1], file });
    const exactBlock = text.match(/const\s+EXACT_TITLES\s*=\s*\[([\s\S]*?)\]/m);
    if (exactBlock) for (const match of exactBlock[1].matchAll(/['`]([^'`]+)['`]/g)) rows.push({ title: match[1], file });
  }
  return dedupeRows(rows, (row) => `${row.file}\0${row.title}`);
}

function profileTitleCount(profile, titles = testTitles()) {
  let total = 0;
  for (const group of groupsForProfile(profile)) {
    const patterns = patternsForGroupProfile(group.id, profile);
    total += titles.filter((row) => patterns.some((pattern) => pattern.test(row.title))).length;
  }
  return { total };
}

function groupForTitle(title) {
  const group = PLAYWRIGHT_GROUPS.find((candidate) => candidate.patterns.some((pattern) => pattern.test(title)));
  return group?.id ?? 'UNASSIGNED';
}

function proposedActionForTitle(title) {
  if (/Full Headed|Walkthrough/i.test(title)) return 'MOVE_TO_VISUAL_ACCEPTANCE';
  if (/Does Not Use a Direct|Package Preserves|Benchmarks Match|Depth Uniform|Barotropic Control|Manifest Is Reproducible/i.test(title)) return 'CONVERT_TO_NODE';
  if (/Run From GitHub Pages|Subpath/i.test(title)) return 'KEEP_E2E';
  if (/Phaser|legacy/i.test(title)) return 'DEFER_REVIEW';
  return patternsForProfileIncludes('release', title) ? 'KEEP_E2E' : 'MERGE_E2E';
}

function patternsForProfileIncludes(profile, title) {
  return groupsForProfile(profile).some((group) => patternsForGroupProfile(group.id, profile).some((pattern) => pattern.test(title)));
}

function estimateSetupCost(title) {
  if (/Full Headed|Walkthrough|Simulation|Execute|Replay|Current|Bathymetry/i.test(title)) return 'high';
  if (/Boot|Pages|Main Menu/i.test(title)) return 'medium';
  return 'low';
}

function capabilityForTitle(title) {
  if (/Replay|Debrief/i.test(title)) return 'replay/debrief';
  if (/Editor/i.test(title)) return 'mission editor';
  if (/Current/i.test(title)) return 'currents';
  if (/Bathymetry|Terrain|Seabed/i.test(title)) return 'bathymetry/terrain';
  if (/Dive|Depth|Water Column|Waypoint|Segment/i.test(title)) return 'planning/dive profile';
  if (/Pages|Subpath/i.test(title)) return 'static hosting';
  if (/Learning Lab|Lab/i.test(title)) return 'learning lab';
  return 'application workflow';
}

function userVisiblePathForTitle(title) {
  if (/Next Shell/i.test(title)) return 'runtimeShell=next';
  if (/Pages|Subpath/i.test(title)) return 'GitHub Pages subpath';
  if (/Replay|Debrief/i.test(title)) return 'Debrief / Replay Review';
  if (/Editor/i.test(title)) return 'Mission Editor';
  if (/Simulation|Execute/i.test(title)) return 'Planning -> Simulation';
  return 'Product Hub / Planning';
}

function contractForTitle(title) {
  if (/Digest|Package|Headless|Canonical|Parity/i.test(title)) return 'canonical contract';
  if (/Visible|Panel|Control|Click|Pointer|Keyboard/i.test(title)) return 'browser UI behavior';
  if (/Pages|Subpath/i.test(title)) return 'static-host compatibility';
  return 'user workflow';
}

function implementationDetailForTitle(title) {
  return /Phaser|scene|resource|RAF|GPU|draw call|counter|debug/i.test(title) ? 'yes' : 'no';
}

function overlappingTests(title, rows) {
  const key = capabilityForTitle(title);
  return rows.filter((row) => row.title !== title && capabilityForTitle(row.title) === key).slice(0, 3).map((row) => row.title);
}

function phaseForTitle(title) {
  const match = title.match(/^(THREE-R\d[A-Z0-9.]*|FLOW-RUNTIME-R\d(?:\.\d)?|FLOW-R\d[A-Z0-9.]*|DIVE-UX-R\d|DIVE-R\d|BATHY-PKG-R\d|FLOW-PKG-R\d(?:\.\d)?)/i);
  return match?.[1] ?? 'capability';
}

function packageScripts() {
  return JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8').replace(/^\\uFEFF/, '')).scripts ?? {};
}

function trackedFiles() {
  return git(['ls-files']).split(/\r?\n/).filter(Boolean).map(normalizePath);
}

function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

function directoryStats(rel) {
  const full = path.join(ROOT, rel);
  if (!existsSync(full)) return { count: 0, bytes: 0 };
  let count = 0;
  let bytes = 0;
  for (const file of walk(full)) {
    count += 1;
    bytes += statSync(file).size;
  }
  return { count, bytes };
}

function findLocal(predicate) {
  for (const file of walk(ROOT, { skip: new Set(['.git', 'node_modules', '_site', 'test-results']) })) if (predicate(file)) return true;
  return false;
}

function walk(dir, options = {}) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (options.skip?.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, options));
    else out.push(full);
  }
  return out;
}

function isSource(file) {
  return /^(src|packages)\/.+\.(?:js|mjs)$/.test(file);
}

function isDocumentation(file) {
  return file.startsWith('docs/') || DOC_ROOTS.has(file) || /README\.md$|MODEL_CARD\.md$/.test(file);
}

function isText(file) {
  return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase());
}

function readText(file) {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf8');
}

function countLines(file) {
  if (!isText(file)) return 0;
  const text = readText(file);
  return text ? text.split(/\r?\n/).length : 0;
}

function lineCountsByCategory(classifications) {
  const out = {};
  for (const row of classifications) out[row.classification] = (out[row.classification] ?? 0) + row.lines;
  return out;
}

function countBy(rows, getKey) {
  const out = {};
  for (const row of rows) {
    const key = getKey(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function dedupeRows(rows, keyFn) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = keyFn(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function readdirSafe(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

function normalizePath(value) {
  return String(value).replaceAll('\\', '/');
}

function escapePipe(value) {
  return String(value).replaceAll('|', '\\|');
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

if (import.meta.url === `file://${fileURLToPath(import.meta.url).replaceAll('\\', '/')}`) {
  // Keep Node from tree-shaking the url import in older embedders.
}
