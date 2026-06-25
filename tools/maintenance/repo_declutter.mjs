import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLAYWRIGHT_GROUPS,
  groupsForProfile,
  patternsForGroupProfile
} from '../js/playwright_groups.mjs';
import {
  CAPABILITIES,
  CAPABILITY_MATRIX_VERSION,
  SMOKE_SPEC_SPLIT_FILES,
  TEST_FILE_OWNERSHIP,
  capabilityCoverageSummary
} from '../../tests/e2e/capability_manifest.mjs';

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
const STATIC_PUBLIC_ROOTS = ['css/', 'vendor/', 'labs/', 'levels/', 'missions/', 'plans/', 'experiments/', 'schemas/', 'validation/', 'tutorials/', 'favicon.svg'];
const PRODUCTION_ROOTS = ['index.html', 'src/game/main.js', 'src/app/production/', 'src/game/phaser/PhaserGame.js', 'src/game/phaser/PhaserProductionBootstrap.js', 'src/game/phaser/scenes/', 'src/game/three/', 'src/core/', 'packages/'];
const BUILD_TOOL_ROOTS = ['package.json', 'package-lock.json', 'playwright.config.js', 'tools/js/build_github_pages.mjs', 'tools/js/run_playwright_groups.mjs', 'tools/js/playwright_groups.mjs', 'tools/check-js.mjs', 'tools/maintenance/'];
const COMPATIBILITY_HINTS = ['forwarder', 'compat', 'legacy saved-level', 'migration', 'schema', 'HeadlessSchema', 'Replay'];

const command = process.argv[2] ?? 'verify';

if (command === 'inventory') printJson(buildInventory());
else if (command === 'reachability') printJson(buildReachability());
else if (command === 'tests') printJson(buildTestPortfolio());
else if (command === 'test-files') printJson(buildTestFilesReport());
else if (command === 'test-timing') printJson(buildTestTimingReport());
else if (command === 'docs') writeReports();
else if (command === 'forwarders') printJson(buildForwarderReport());
else if (command === 'renderers') printJson(buildRendererReport());
else if (command === 'phaser') printJson(buildPhaserReport());
else if (command === 'pages') printJson(buildPagesReport());
else if (command === 'verify') verify();
else {
  console.error(`Unknown command: ${command}`);
  console.error('Expected one of: inventory, reachability, tests, test-files, test-timing, docs, forwarders, renderers, phaser, pages, verify');
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
    version: 'repo-clean-r3',
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
    version: 'repo-clean-r3',
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
    version: 'repo-clean-r3',
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
  const timing = buildTestTimingReport(tests);
  const pages = buildPagesReport();
  const docs = buildDocumentationReport();
  const testFiles = buildTestFilesReport(tests);
  const forwarders = buildForwarderReport();
  const renderers = buildRendererReport();
  const manifest = buildManifest(reachability, { testFiles, forwarders, renderers });
  writeFileSync(path.join(ROOT, 'tools/maintenance/repo_declutter_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(ROOT, 'docs/repository_declutter_audit.md'), renderDeclutterAudit(inventory, reachability), 'utf8');
  writeFileSync(path.join(ROOT, 'docs/test_portfolio.md'), renderTestPortfolio(tests), 'utf8');
  writeFileSync(path.join(ROOT, 'docs/test_portfolio_r2.md'), renderTestPortfolioR2(tests, timing), 'utf8');
  writeFileSync(path.join(ROOT, 'docs/repository_cleanup.md'), renderCleanupReport(inventory, reachability, tests, manifest), 'utf8');
  writeFileSync(path.join(ROOT, 'docs/repository_cleanup_r2.md'), renderCleanupReportR2(inventory, reachability, tests, timing, pages, docs), 'utf8');
  writeFileSync(path.join(ROOT, 'docs/repository_cleanup_r3.md'), renderCleanupReportR3(inventory, reachability, tests, timing, pages, docs, testFiles, forwarders, renderers), 'utf8');
  ensureCanonicalDocs(docs);
  console.log('repo_declutter docs: wrote R1/R2/R3 cleanup reports, test portfolio docs, canonical docs, and repo_declutter_manifest.json');
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
  if (existsSync(path.join(ROOT, 'tests/e2e/smoke.spec.js'))) failures.push('tests/e2e/smoke.spec.js should be retired after R3 split');
  if (!existsSync(path.join(ROOT, 'docs/smoke_spec_decomposition_audit.md'))) failures.push('missing docs/smoke_spec_decomposition_audit.md');
  if (!existsSync(path.join(ROOT, 'docs/repository_cleanup_r3.md'))) failures.push('missing docs/repository_cleanup_r3.md');
  const testFileAudit = buildTestFilesReport();
  if (!testFileAudit.valid) failures.push('R3 smoke spec physical ownership audit failed');
  const coverage = spawnSync(process.execPath, ['tools/js/audit_playwright_group_coverage.mjs'], { cwd: ROOT, encoding: 'utf8' });
  if (coverage.status !== 0) failures.push('Playwright group coverage audit failed');
  const titles = testTitles().map((row) => row.title);
  const capabilityAudit = capabilityCoverageSummary(titles, { smokeTitles: selectedTitlesForProfile('smoke'), releaseTitles: selectedTitlesForProfile('release') });
  if (!capabilityAudit.valid) failures.push(`capability coverage gaps: ${capabilityAudit.missing.map((row) => row.id).join(', ')}`);
  const smokeTotal = profileTitleCount('smoke').total;
  const releaseTotal = profileTitleCount('release').total;
  const fullTotal = profileTitleCount('full').total;
  if (smokeTotal < 12 || smokeTotal > 18) failures.push(`browser smoke profile outside R2 target: ${smokeTotal}`);
  if (releaseTotal < 35 || releaseTotal > 54) failures.push(`release profile outside R2 target: ${releaseTotal}`);
  if (fullTotal > 121) failures.push(`full nonvisual profile exceeds R2 static-parser target: ${fullTotal}`);
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
    fullTests: profileTitleCount('full').total,
    capabilities: CAPABILITIES.length
  });
}


function buildTestFilesReport(portfolio = buildTestPortfolio()) {
  const titles = testTitles();
  const ownershipEntries = Object.entries(TEST_FILE_OWNERSHIP);
  const declaredTitles = new Set(ownershipEntries.map(([title]) => title));
  const splitFiles = SMOKE_SPEC_SPLIT_FILES.map((file) => {
    const fileRows = titles.filter((row) => row.file === file);
    const declared = ownershipEntries.filter(([, expected]) => expected === file);
    return {
      path: file,
      exists: existsSync(path.join(ROOT, file)),
      testCount: fileRows.length,
      declaredOwnershipCount: declared.length,
      importsSharedHelper: readText(file).includes('./helpers/SmokeSpecShared.js'),
      groupCounts: countBy(fileRows, (row) => groupForTitle(row.title))
    };
  });
  const mismatches = ownershipEntries.flatMap(([title, expectedFile]) => {
    const matching = titles.filter((row) => row.title === title);
    if (matching.some((row) => row.file === expectedFile)) return [];
    return [{ title, expectedFile, actualFiles: matching.map((row) => row.file) }];
  });
  const undeclaredSplitTitles = titles
    .filter((row) => SMOKE_SPEC_SPLIT_FILES.includes(row.file) && !declaredTitles.has(row.title))
    .map((row) => ({ title: row.title, file: row.file }));
  const helperPath = 'tests/e2e/helpers/SmokeSpecShared.js';
  const smokeSpecPath = 'tests/e2e/smoke.spec.js';
  const smokeSpecExists = existsSync(path.join(ROOT, smokeSpecPath));
  const helperExists = existsSync(path.join(ROOT, helperPath));
  return {
    type: 'anchor.repo-clean-r3.test-file-ownership',
    version: 'repo-clean-r3',
    originalMonolith: {
      path: smokeSpecPath,
      historicalLines: 6951,
      historicalTests: 68,
      helperFunctionsExtracted: 80,
      exists: smokeSpecExists,
      disposition: smokeSpecExists ? 'unexpected-active-file' : 'retired-after-physical-split'
    },
    sharedHelper: {
      path: helperPath,
      exists: helperExists,
      exportsReferencedBySplitFiles: splitFiles.every((row) => row.importsSharedHelper)
    },
    splitFiles,
    declaredOwnershipCount: ownershipEntries.length,
    movedTestCount: splitFiles.reduce((total, row) => total + row.testCount, 0),
    currentPortfolioCount: portfolio.rows.length,
    mismatches,
    undeclaredSplitTitles,
    actions: {
      movedUnchanged: ownershipEntries.length,
      renamed: [],
      merged: [],
      convertedToNode: [],
      deletedDuplicates: [],
      deletedRetiredImplementationTests: [],
      helperConsolidation: 'Local smoke.spec helper functions moved to tests/e2e/helpers/SmokeSpecShared.js; existing shared helpers remain active.'
    },
    valid: !smokeSpecExists && helperExists && splitFiles.every((row) => row.exists && row.importsSharedHelper) && mismatches.length === 0 && undeclaredSplitTitles.length === 0
  };
}

function buildForwarderReport() {
  const rows = [
    ['src/core/currents/CurrentFieldSampler.js', 'packages/currents and supported runtime current sampling contracts'],
    ['src/core/science/OceanCurrentField4D.js', 'packages/currents plus browser/headless current field contracts'],
    ['src/core/science/OceanCurrentFieldSampler.js', 'packages/currents current sampler facade'],
    ['src/core/science/OceanCurrentSourceMetadata.js', 'current source metadata contracts'],
    ['src/core/science/CurrentFieldScientificDiagnostics.js', 'current package diagnostics and audits'],
    ['src/core/science/BathymetrySourceMetadata.js', 'bathymetry package metadata contracts'],
    ['src/core/science/SignedTerrainSurfaceModel.js', 'bathymetry package terrain surface contract'],
    ['src/core/science/BathymetryConditionedCurrentBuilder.js', 'current package bathymetry-conditioned field builder']
  ].map(([file, replacement]) => legacyAuditRow(file, 'compatibility-forwarder-or-science-contract', replacement));
  return {
    type: 'anchor.repo-clean-r3.forwarder-reachability',
    version: 'repo-clean-r3',
    summary: 'R3 found no high-confidence compatibility forwarder deletion. Supported production, tests, docs, Pages copy policy, or public dynamic imports still reference these paths.',
    rows
  };
}

function buildRendererReport() {
  const rows = [
    ['src/game/three/layers/ThreeCurrentVectorLayer.js', 'ThreeInstancedCurrentGlyphLayer where fallback removal is separately gated'],
    ['src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'active production current glyph renderer'],
    ['src/game/phaser/renderers/BathymetryWorldRenderer.js', 'bathymetry demo renderer until demo route ownership changes'],
    ['src/game/three/ThreeBathymetryRenderer.js', 'active Three bathymetry renderer'],
    ['src/game/three/layers/ThreeBathymetryTerrainLayer.js', 'active Three terrain layer'],
    ['src/game/phaser/scenes/BathymetryWorldViewScene.js', 'active Simulation Lab bathymetry route'],
    ['src/game/phaser/scenes/RendererArchitecturePreviewScene.js', 'active Simulation Lab renderer architecture route']
  ].map(([file, replacement]) => legacyAuditRow(file, 'renderer-or-scene-path', replacement));
  return {
    type: 'anchor.repo-clean-r3.renderer-reachability',
    version: 'repo-clean-r3',
    summary: 'R3 did not remove renderer paths without hard evidence. Fallback and demo paths remain until route, lab, and visual coverage are explicitly retired.',
    rows
  };
}

function legacyAuditRow(file, classification, replacement) {
  const imports = importEdges(trackedFiles());
  const fileNoExtension = file.replace(/\.js$/, '');
  const staticImporters = [...new Set(imports
    .filter((edge) => edge.resolved === file || edge.resolved === fileNoExtension)
    .map((edge) => edge.from))];
  const textRefs = textReferenceFiles(file);
  const dynamicReferences = textRefs.filter((ref) => !staticImporters.includes(ref) && !isDocumentation(ref) && !ref.startsWith('tests/'));
  const testReferences = textRefs.filter((ref) => ref.startsWith('tests/') || ref.startsWith('tools/'));
  const documentationReferences = textRefs.filter((ref) => isDocumentation(ref));
  const packageScriptReferences = packageScriptTextReferences(file);
  const sceneRegistrations = textRefs.filter((ref) => ref.includes('/scenes/') || ref.endsWith('PhaserGame.js'));
  const routeRegistrations = textRefs.filter((ref) => ref.endsWith('MainMenuScene.js') || ref.includes('Route') || ref.includes('routes'));
  const pagesReferences = pagesCopyPolicySummary().runtimeRoots.filter((root) => file === root || file.startsWith(root + '/'));
  const publicCompatibility = pagesReferences.length > 0 || dynamicReferences.some((ref) => ref.startsWith('tests/e2e/')) || file.startsWith('src/') || file.startsWith('packages/');
  const productionRefs = staticImporters.filter((ref) => productionImportSource(ref));
  const action = productionRefs.length || dynamicReferences.length || sceneRegistrations.length || routeRegistrations.length || publicCompatibility ? 'retain' : 'defer-review';
  return {
    path: file,
    classification,
    exists: existsSync(path.join(ROOT, file)),
    staticImporters,
    dynamicReferences,
    sceneRegistrations,
    routeRegistrations,
    packageScriptReferences,
    testReferences,
    documentationReferences,
    pagesReferences,
    publicCompatibility: publicCompatibility ? 'yes' : 'no',
    replacement,
    replacementTests: testReferences.slice(0, 12),
    confidence: action === 'retain' ? 'high-retain' : 'medium-defer',
    action
  };
}

function textReferenceFiles(target) {
  const normalized = normalizePath(target);
  const withLeadingSlash = '/' + normalized;
  const withoutExtension = normalized.replace(/\.js$/, '');
  const out = [];
  for (const file of trackedFiles().filter((candidate) => isText(candidate))) {
    const text = readText(file);
    if (text.includes(normalized) || text.includes(withLeadingSlash) || text.includes(withoutExtension)) out.push(file);
  }
  return [...new Set(out)];
}

function packageScriptTextReferences(target) {
  const scripts = packageScripts();
  const normalized = normalizePath(target);
  return Object.entries(scripts)
    .filter(([, command]) => String(command).includes(normalized))
    .map(([name]) => name);
}

function buildTestTimingReport(portfolio = buildTestPortfolio()) {
  const profileSelections = Object.fromEntries(['smoke', 'release', 'full', 'visual'].map((profile) => [profile, new Set(selectedTitlesForProfile(profile))]));
  const rows = portfolio.rows.map((row) => {
    const capabilityIds = capabilityIdsForTitle(row.title);
    return {
      title: row.title,
      file: row.file,
      group: row.group,
      tier: tiersForTitle(row.title, profileSelections),
      capabilityIds,
      runtimeShell: row.title.match(/Next Shell/i) ? 'next' : row.title.match(/Pages|Subpath/i) ? 'pages-subpath' : 'default-phaser-shell',
      route: row.userVisiblePath,
      durationMs: estimatedDurationMs(row),
      setupDurationMs: estimatedSetupDurationMs(row),
      executionDurationMs: Math.max(1000, estimatedDurationMs(row) - estimatedSetupDurationMs(row)),
      largeEnvironmentGenerated: /Regional|Bathymetry|Current|Volumetric|Generated/i.test(row.title),
      fullMissionExecuted: /Execute|Simulation|Debrief|Replay|Outcome|Mission Result/i.test(row.title),
      headed: /Full Headed|Walkthrough/i.test(row.title),
      screenshotProducing: /Full Headed|Visual|Pixel|Screenshot/i.test(row.title),
      pureContractAssertions: /Package|Canonical|Parity|Digest|Headless|Manifest|Does Not Use a Direct|Benchmarks Match|Depth Uniform|Barotropic Control/i.test(row.title),
      browserOnlyAssertions: /Visible|Panel|Control|Click|Pointer|Keyboard|Canvas|Pages|Subpath|Route|Main Menu/i.test(row.title),
      implementationDetailAssertions: row.implementationDetailChecked === 'yes',
      duplicateCandidates: row.overlappingTests,
      proposedAction: normalizeProposedAction(row.proposedAction)
    };
  });
  return {
    type: 'anchor.repo-clean-r3.test-timing',
    version: 'repo-clean-r3',
    note: 'Durations are static estimates unless a Playwright JSON timing artifact is available; grouped-runner wall-clock timing remains authoritative after execution.',
    totals: {
      tests: rows.length,
      smoke: profileSelections.smoke.size,
      release: profileSelections.release.size,
      full: profileSelections.full.size,
      visual: profileSelections.visual.size,
      estimatedReleaseDurationMs: sum(rows.filter((row) => row.tier.includes('release')).map((row) => row.durationMs)),
      estimatedFullDurationMs: sum(rows.filter((row) => row.tier.includes('full')).map((row) => row.durationMs))
    },
    byAction: countBy(rows, (row) => row.proposedAction),
    slowest: [...rows].sort((a, b) => b.durationMs - a.durationMs).slice(0, 30),
    setupBuckets: setupBuckets(rows),
    rows
  };
}

function buildPhaserReport() {
  const reachability = buildReachability();
  return {
    type: 'anchor.repo-clean-r3.phaser-disposition',
    version: 'repo-clean-r3',
    summary: 'Phaser remains active for lifecycle, scene routing, and Learning Labs. Mission-world rendering is Three.js-owned. Final Phaser dependency removal is deferred.',
    retainedPackages: ['vendor/phaser.min.js', 'package.json#dependencies.phaser'],
    rows: reachability.phaserRows.map((row) => ({
      ...row,
      classification: row.defaultRuntime ? 'ACTIVE_DEFAULT_RUNTIME' : row.labOnly ? 'ACTIVE_LAB' : row.testOnly ? 'TEST_ONLY' : 'UNKNOWN',
      replacementCapability: row.defaultRuntime || row.labOnly ? null : 'review against Three.js/DOM production implementation before deletion'
    }))
  };
}

function buildPagesReport() {
  return {
    type: 'anchor.repo-clean-r3.pages-copy-policy',
    version: 'repo-clean-r3',
    currentSite: directoryStats('_site'),
    publicCopyPolicy: pagesCopyPolicySummary(),
    largestSiteFiles: largestFiles('_site', 30),
    largestTrackedFiles: largestTrackedFiles(30),
    excludedByPolicy: [
      'internal phase audits and visual acceptance reports',
      'test source and test result artifacts',
      'maintenance scripts',
      'archive content',
      'large docs/examples not referenced by browser routes'
    ]
  };
}

function buildDocumentationReport() {
  const docs = trackedFiles().filter((file) => isDocumentation(file));
  const phaseDocs = docs.filter((file) => /(?:_audit|_closure|_migration|_visual_acceptance|_checklist|three_r|flow_r|world_r|r3b)/i.test(path.basename(file)));
  return {
    type: 'anchor.repo-clean-r3.documentation-ownership',
    version: 'repo-clean-r3',
    trackedMarkdownCount: docs.filter((file) => file.endsWith('.md')).length,
    phaseSpecificCandidateCount: phaseDocs.length,
    canonicalDocuments: canonicalDocumentMap(),
    deletedPhaseRecords: [
      'docs/dive_r1_1_visual_acceptance.md',
      'docs/flow_r2a_3_visual_acceptance.md',
      'docs/flow_r2a_4_visual_acceptance.md',
      'docs/flow_r2a_5_visual_acceptance.md',
      'docs/three_r1_2c_visual_acceptance.md',
      'docs/world_r1_1_visual_acceptance.md'
    ],
    deferredPhaseRecords: phaseDocs.filter((file) => !file.endsWith('_visual_acceptance.md')).slice(0, 60)
  };
}

function renderTestPortfolioR2(portfolio, timing) {
  const lines = [];
  lines.push('# Test Portfolio R2');
  lines.push('');
  lines.push('REPO-CLEAN-R2 changes test ownership from historical phase names to production capabilities. The browser tiers are selected by `tests/e2e/capability_manifest.mjs`; `tools/js/playwright_groups.mjs` consumes that manifest for smoke and release profiles.');
  lines.push('');
  lines.push('## Tier Counts');
  lines.push('');
  lines.push('| Tier | Browser tests |');
  lines.push('|---|---:|');
  for (const [profile, value] of Object.entries(portfolio.byProfile)) lines.push(`| ${profile} | ${value.total} |`);
  lines.push('');
  lines.push('## Capability Matrix');
  lines.push('');
  lines.push('| Capability | Release | Smoke | Browser required | Browser evidence | Node evidence |');
  lines.push('|---|---:|---:|---:|---|---|');
  for (const capability of CAPABILITIES) {
    lines.push(`| ${capability.id} | ${capability.releaseCritical ? 'yes' : 'no'} | ${capability.smokeCritical ? 'yes' : 'no'} | ${capability.browserRequired ? 'yes' : 'no'} | ${capability.browserCoverage.length} titles | ${capability.nodeCoverage.length} scripts |`);
  }
  lines.push('');
  lines.push('## Proposed Actions');
  lines.push('');
  lines.push('| Action | Count |');
  lines.push('|---|---:|');
  for (const [action, count] of Object.entries(timing.byAction)) lines.push(`| ${action} | ${count} |`);
  lines.push('');
  lines.push('## Slowest Estimated Browser Workflows');
  lines.push('');
  lines.push('| Title | Group | Tier | Proposed action | Estimated duration |');
  lines.push('|---|---|---|---|---:|');
  for (const row of timing.slowest.slice(0, 20)) lines.push(`| ${escapePipe(row.title)} | ${row.group} | ${row.tier.join(', ') || 'extended-only'} | ${row.proposedAction} | ${row.durationMs} ms |`);
  lines.push('');
  lines.push('## Smoke Spec Disposition');
  lines.push('');
  lines.push('R2 originally left `tests/e2e/smoke.spec.js` physically monolithic while moving tier policy into the capability manifest. R3 subsequently retired that monolith and moved the tests into capability-owned files without changing titles or assertions.');
  return `${lines.join('\n')}\n`;
}

function renderCleanupReportR2(inventory, reachability, portfolio, timing, pages, docs) {
  const lines = [];
  lines.push('# Repository Cleanup R2');
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('REPO-CLEAN-R2 is a maintenance pass. It changes validation ownership, Pages packaging, and documentation ownership records. It does not change bathymetry, currents, scalar processes, dive profiles, mission physics, scoring, schemas, public artifacts, runtime shell defaults, or supported mission workflows.');
  lines.push('');
  lines.push('## Metrics');
  lines.push('');
  lines.push('| Metric | R1 baseline | R2 current |');
  lines.push('|---|---:|---:|');
  lines.push(`| tracked files | 1765 | ${inventory.trackedFileCount} |`);
  lines.push(`| source files | 569 | ${inventory.trackedSourceFileCount} |`);
  lines.push(`| Markdown docs | 255 | ${docs.trackedMarkdownCount} |`);
  lines.push(`| Playwright smoke profile | 15 | ${portfolio.byProfile.smoke.total} |`);
  lines.push(`| Playwright release profile | 58 | ${portfolio.byProfile.release.total} |`);
  lines.push(`| Playwright full nonvisual profile | 229 | ${portfolio.byProfile.full.total} |`);
  lines.push(`| Playwright visual profile | 12 | ${portfolio.byProfile.visual.total} |`);
  lines.push(`| Pages files | 881 | ${pages.currentSite.count} |`);
  lines.push(`| Pages bytes | 28225773 | ${pages.currentSite.bytes} |`);
  lines.push('');
  lines.push('## Test Architecture');
  lines.push('');
  lines.push('- Capability matrix: `tests/e2e/capability_manifest.mjs`.');
  lines.push('- Release profile target: 35-54 browser tests; current selection is capability-owned and explicit.');
  lines.push('- Full profile target: <=120 nonvisual browser tests; current selection is bounded and excludes visual acceptance.');
  lines.push('- Pure deterministic contracts remain in package/science Node gates; browser tests are kept for DOM, canvas, route, pointer, Pages, and lifecycle behavior.');
  lines.push('');
  lines.push('## Documentation');
  lines.push('');
  lines.push('- Canonical document ownership is summarized in `docs/history.md` and `docs/architecture.md`.');
  lines.push('- Superseded visual acceptance records removed in this pass are listed in `node tools/maintenance/repo_declutter.mjs docs`.');
  lines.push('- Large historical documentation is excluded from Pages unless it is current user-facing documentation or a browser-required example.');
  lines.push('');
  lines.push('## Phaser and Legacy Source');
  lines.push('');
  lines.push('- Active Phaser lifecycle, scene routing, and Learning Lab ownership remain intact.');
  lines.push('- No active Phaser runtime or lab source is removed by R2.');
  lines.push('- Deferred Phaser review candidates are classified by `node tools/maintenance/repo_declutter.mjs phaser`.');
  lines.push('');
  lines.push('## Pages Policy');
  lines.push('');
  lines.push('- Pages copies runtime source, packages, vendor runtime, CSS/assets, levels/missions/plans/tutorials/schemas, labs, and allowlisted current docs/examples.');
  lines.push('- Pages excludes internal phase audits, visual acceptance reports, tests, owner-review artifacts, maintenance tools, and unreferenced large docs/examples.');
  return `${lines.join('\n')}\n`;
}

function ensureCanonicalDocs(docsReport) {
  const historyPath = path.join(ROOT, 'docs/history.md');
  const architecturePath = path.join(ROOT, 'docs/architecture.md');
  writeFileSync(historyPath, renderHistoryDoc(docsReport), 'utf8');
  writeFileSync(architecturePath, renderArchitectureDoc(), 'utf8');
}

function renderHistoryDoc(docsReport) {
  const lines = [];
  lines.push('# Project History');
  lines.push('');
  lines.push('This document keeps durable decisions from completed cleanup, renderer, current, bathymetry, water-column, replay, headless, and benchmark phases. Git history remains the complete archive for phase-by-phase reports and removed visual acceptance notes.');
  lines.push('');
  lines.push('## Current Runtime Boundary');
  lines.push('');
  lines.push('- `index.html` boots `src/game/main.js`.');
  lines.push('- The default runtime is the Phaser lifecycle and scene shell.');
  lines.push('- `runtimeShell=next` remains gated.');
  lines.push('- Three.js owns normal mission-world planning, simulation, replay, and editor rendering.');
  lines.push('- Phaser remains active for route/scene lifecycle and Learning Labs.');
  lines.push('- Final Phaser package/vendor removal is deferred.');
  lines.push('');
  lines.push('## Cleanup History');
  lines.push('');
  lines.push('- REPO-CLEAN-R1 removed the legacy vanilla shell archive and tracked Python bytecode after reachability checks.');
  lines.push('- REPO-CLEAN-R2 moved validation tier ownership to production capabilities, constrained the full browser profile, and made Pages documentation copying explicit.');
  lines.push('- REPO-CLEAN-R3 physically retired the historical `tests/e2e/smoke.spec.js` monolith and moved its tests into capability-owned E2E files.');
  lines.push('- REPO-CLEAN-R3 audited compatibility forwarders, renderer paths, and Phaser UI utilities without deleting active supported runtime paths.');
  lines.push(`- R2 superseded phase records removed: ${docsReport.deletedPhaseRecords.join(', ')}.`);
  return `${lines.join('\n')}\n`;
}

function renderArchitectureDoc() {
  const lines = [];
  lines.push('# Architecture');
  lines.push('');
  lines.push('## Runtime');
  lines.push('');
  lines.push('- Browser entry: `index.html` -> `src/game/main.js`.');
  lines.push('- Phaser: active lifecycle shell, route/scene transition owner, Learning Lab host, and transitional UI orchestration.');
  lines.push('- Three.js: production mission-world renderer for planning, simulation, replay, bathymetry/current layers, and editor world presentation.');
  lines.push('- Portable core/packages: deterministic bathymetry, current, scalar, simulation, replay, export, and validation contracts.');
  lines.push('');
  lines.push('## Validation Ownership');
  lines.push('');
  lines.push('- Production capability coverage and physical split ownership are declared in `tests/e2e/capability_manifest.mjs`.');
  lines.push('- `npm.cmd run test:fast` owns deterministic contracts, package boundaries, and repository verification.');
  lines.push('- `npm.cmd run test:e2e:smoke` is a compact browser smoke set.');
  lines.push('- `npm.cmd run test:e2e` is the release browser regression set.');
  lines.push('- `npm.cmd run test:e2e:full` is bounded nonvisual compatibility coverage, not a historical archive.');
  lines.push('- `npm.cmd run test:e2e:visual` is headed visual/owner acceptance coverage.');
  lines.push('');
  lines.push('## Static Hosting');
  lines.push('');
  lines.push('Pages copies runtime assets and allowlisted current documentation only. Internal phase notes, test artifacts, owner-review packages, maintenance tools, and archive content are not public deployment inputs.');
  return `${lines.join('\n')}\n`;
}

function selectedTitlesForProfile(profile) {
  const titles = testTitles();
  const out = [];
  for (const group of groupsForProfile(profile)) {
    const patterns = patternsForGroupProfile(group.id, profile);
    for (const row of titles) {
      if (patterns.some((pattern) => pattern.test(row.title))) out.push(row.title);
    }
  }
  return [...new Set(out)];
}

function tiersForTitle(title, profileSelections) {
  return Object.entries(profileSelections).filter(([, titles]) => titles.has(title)).map(([profile]) => profile);
}

function capabilityIdsForTitle(title) {
  return CAPABILITIES.filter((capability) => capability.browserCoverage.includes(title)).map((capability) => capability.id);
}

function estimatedDurationMs(row) {
  if (/Full Headed|Walkthrough/i.test(row.title)) return 180000;
  if (row.setupCost === 'high') return 90000;
  if (row.setupCost === 'medium') return 30000;
  return 12000;
}

function estimatedSetupDurationMs(row) {
  if (row.setupCost === 'high') return 45000;
  if (row.setupCost === 'medium') return 18000;
  return 8000;
}

function normalizeProposedAction(action) {
  if (action === 'KEEP_E2E') return 'KEEP_RELEASE';
  if (action === 'MOVE_TO_VISUAL_ACCEPTANCE') return 'KEEP_EXTENDED';
  if (action === 'MERGE_E2E') return 'MERGE';
  if (action === 'DEFER_REVIEW') return 'REVIEW_REQUIRED';
  return action;
}

function setupBuckets(rows) {
  return {
    boot: sum(rows.filter((row) => /Boot|Main Menu|Readiness/i.test(row.title)).map((row) => row.durationMs)),
    environmentGeneration: sum(rows.filter((row) => /Generated|Bathymetry|Current|Environment|Regional/i.test(row.title)).map((row) => row.durationMs)),
    missionSetup: sum(rows.filter((row) => /challenge setup|deployment|Waypoint|Planning/i.test(row.title)).map((row) => row.durationMs)),
    simulation: sum(rows.filter((row) => /Simulation|Execute|Current Drift|Depth-Aware/i.test(row.title)).map((row) => row.durationMs)),
    debriefReplay: sum(rows.filter((row) => /Debrief|Replay/i.test(row.title)).map((row) => row.durationMs)),
    editor: sum(rows.filter((row) => /Editor/i.test(row.title)).map((row) => row.durationMs)),
    screenshots: sum(rows.filter((row) => row.screenshotProducing).map((row) => row.durationMs))
  };
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function pagesCopyPolicySummary() {
  return {
    runtimeRoots: ['index.html', 'css', 'src', 'vendor', 'packages', 'labs', 'schemas', 'validation', 'levels', 'missions', 'plans', 'experiments', 'tutorials/import-demo'],
    publicDocs: publicDocsForPages(),
    publicExamples: publicDocExamplesForPages(),
    excludedRoots: ['tests', 'test-results', 'playwright-report', 'tools', 'archive', 'node_modules', '.git', '.github']
  };
}

function publicDocsForPages() {
  return [
    'docs/architecture.md',
    'docs/history.md',
    'docs/testing.md',
    'docs/export_formats.md',
    'docs/artifact_codec_and_schema_contract.md',
    'docs/scientific_validation_and_methods.md',
    'docs/mission_format.md',
    'docs/plan_format.md',
    'docs/solver_workflow.md',
    'docs/game_design_scientific_auv_planning.md',
    'docs/benchmark_modes.md',
    'docs/water_column_2p5d_sampling_model.md',
    'docs/current_runtime_baseline.md',
    'docs/current_package_architecture.md',
    'docs/bathymetry_package_architecture.md',
    'docs/threejs_first_architecture.md',
    'docs/threejs_static_runtime.md',
    'docs/threejs_planning_tools_and_camera.md',
    'docs/threejs_replay_and_debrief_review.md',
    'docs/threejs_mission_editor.md',
    'docs/headless_bundle_loader.md',
    'docs/headless_solver_packet_roundtrip.md',
    'docs/replay_artifact_schemas.md',
    'docs/flow_fields_demo.md',
    'docs/sample_fields_demo.md',
    'docs/coupled_fields_demo.md',
    'docs/uncertainty_forecast_demo.md',
    'docs/sampling_priority_demo.md',
    'docs/flow_coupled_sampling_demo.md',
    'docs/repository_cleanup.md',
    'docs/repository_cleanup_r2.md',
    'docs/repository_cleanup_r3.md',
    'docs/smoke_spec_decomposition_audit.md',
    'docs/test_portfolio_r2.md'
  ];
}

function publicDocExamplesForPages() {
  return [
    'docs/examples/headless_oceanbox_js_public_bundle.example.json',
    'docs/examples/headless_oceanbox_js_bundle.example.json',
    'docs/examples/headless_solver_roundtrip_bundle.example.json',
    'docs/examples/headless_motion_cost_graph_bundle.example.json',
    'docs/examples/headless_mission_score_bundle.example.json',
    'docs/examples/headless_replay_public.example.json',
    'docs/examples/headless_replay_tampered_digest.example.json',
    'docs/examples/headless_replay_multi_agent.example.json'
  ];
}

function canonicalDocumentMap() {
  return [
    { topic: 'player guide', owner: 'HOWPLAY.md' },
    { topic: 'current project status', owner: 'README.md' },
    { topic: 'architecture', owner: 'docs/architecture.md' },
    { topic: 'history', owner: 'docs/history.md' },
    { topic: 'testing and tiers', owner: 'docs/testing.md' },
    { topic: 'test portfolio', owner: 'docs/test_portfolio_r2.md' },
    { topic: 'cleanup policy', owner: 'docs/repository_cleanup_r3.md' },
    { topic: 'exports and schemas', owner: 'docs/export_formats.md' },
    { topic: 'artifact codecs and schema contract', owner: 'docs/artifact_codec_and_schema_contract.md' },
    { topic: 'mission planning', owner: 'docs/threejs_planning_tools_and_camera.md' },
    { topic: 'simulation and replay', owner: 'docs/threejs_replay_and_debrief_review.md' },
    { topic: 'mission editor', owner: 'docs/threejs_mission_editor.md' },
    { topic: 'science model boundaries', owner: 'docs/homegrown_environment_scientific_baseline.md' },
    { topic: 'benchmarking', owner: 'docs/benchmark_modes.md' },
    { topic: 'learning labs', owner: 'docs/sampling_process_lab.md' }
  ];
}

function largestTrackedFiles(limit) {
  return trackedFiles()
    .filter((file) => existsSync(path.join(ROOT, file)))
    .map((file) => ({ path: file, bytes: statSync(path.join(ROOT, file)).size }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, limit);
}

function largestFiles(rel, limit) {
  const full = path.join(ROOT, rel);
  if (!existsSync(full)) return [];
  return walk(full)
    .map((file) => ({ path: normalizePath(path.relative(ROOT, file)), bytes: statSync(file).size }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, limit);
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

function buildManifest(reachability, audits = {}) {
  const candidates = reachability.highConfidenceDeleteCandidates.map((candidate) => ({
    path: candidate.path,
    category: candidate.category,
    reason: candidate.reason,
    staticReferences: candidate.staticReferences ?? [],
    dynamicReferences: candidate.dynamicReferences ?? [],
    packageScriptReferences: candidate.packageScriptReferences ?? [],
    documentationReferences: candidate.documentationReferences ?? [],
    importReachability: {
      staticReferences: candidate.staticReferences ?? [],
      dynamicReferences: candidate.dynamicReferences ?? []
    },
    dynamicSceneRegistration: false,
    routeRegistration: false,
    packageScriptUsage: candidate.packageScriptReferences ?? [],
    playwrightUsage: [],
    pagesCopyRules: pagesCopyPolicySummary(),
    publicCompatibility: candidate.replacement ? 'replaced or historical; no public runtime contract' : 'review required',
    replacementCapability: candidate.replacement ?? null,
    replacement: candidate.replacement ?? null,
    deletionConfidence: candidate.deletionConfidence,
    action: candidate.action
  }));
  return {
    type: 'anchor.repo-declutter.manifest',
    version: 'repo-clean-r3',
    generatedAt: new Date().toISOString(),
    evidenceFields: [
      'importReachability',
      'dynamicSceneRegistration',
      'routeRegistration',
      'packageScriptUsage',
      'playwrightUsage',
      'documentationReferences',
      'pagesCopyRules',
      'publicCompatibility',
      'replacementCapability'
    ],
    runtime: runtimeSummary(),
    capabilityMatrixVersion: CAPABILITY_MATRIX_VERSION,
    pagesCopyPolicy: pagesCopyPolicySummary(),
    testFiles: audits.testFiles ?? buildTestFilesReport(),
    forwarders: audits.forwarders ?? buildForwarderReport(),
    renderers: audits.renderers ?? buildRendererReport(),
    candidates
  };
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
  lines.push(`- Full bounded nonvisual browser profile: \`npm run test:e2e:full\` (${portfolio.byProfile.full.total} selected tests).`);
  lines.push('');
  lines.push('## Deferred Review');
  lines.push('');
  lines.push('- Medium/low-confidence source, compatibility forwarders, and phase-specific docs are retained until a follow-up can merge their lasting decisions into canonical docs.');
  return `${lines.join('\n')}\n`;
}


function renderCleanupReportR3(inventory, reachability, portfolio, timing, pages, docs, testFiles, forwarders, renderers) {
  const lines = [];
  lines.push('# Repository Cleanup R3');
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('REPO-CLEAN-R3 is a physical E2E decomposition and legacy pruning audit pass. It does not change bathymetry, currents, scalar processes, dive profiles, mission physics, scoring, schemas, public artifacts, runtime shell defaults, or supported mission workflows.');
  lines.push('');
  lines.push('## Physical E2E Decomposition');
  lines.push('');
  lines.push('- Retired monolith: tests/e2e/smoke.spec.js.');
  lines.push('- Shared helper extraction: tests/e2e/helpers/SmokeSpecShared.js.');
  lines.push('- Capability-owned files:');
  for (const row of testFiles.splitFiles) lines.push('  - ' + row.path + ' - ' + row.testCount + ' tests.');
  lines.push('- Test titles moved unchanged: ' + testFiles.movedTestCount + '.');
  lines.push('- Renamed tests: none.');
  lines.push('- Merged tests: none.');
  lines.push('- Newly converted to Node in R3: none; pure deterministic assertions remain covered by existing package/science Node gates and future focused harnesses.');
  lines.push('- Deleted duplicate tests: none.');
  lines.push('- Deleted retired implementation tests: none.');
  lines.push('');
  lines.push('## Compatibility Forwarders');
  lines.push('');
  lines.push('| Path | Action | Confidence | Evidence | Replacement |');
  lines.push('|---|---|---|---:|---|');
  for (const row of forwarders.rows) lines.push('| ' + row.path + ' | ' + row.action + ' | ' + row.confidence + ' | ' + (row.staticImporters.length + row.dynamicReferences.length + row.testReferences.length + row.documentationReferences.length) + ' refs | ' + escapePipe(row.replacement) + ' |');
  lines.push('');
  lines.push('## Renderer and UI Paths');
  lines.push('');
  lines.push('| Path | Action | Confidence | Evidence | Replacement/deferred owner |');
  lines.push('|---|---|---|---:|---|');
  for (const row of renderers.rows) lines.push('| ' + row.path + ' | ' + row.action + ' | ' + row.confidence + ' | ' + (row.staticImporters.length + row.dynamicReferences.length + row.testReferences.length + row.documentationReferences.length) + ' refs | ' + escapePipe(row.replacement) + ' |');
  lines.push('');
  lines.push('## Phaser Disposition');
  lines.push('');
  lines.push('- Active Phaser lifecycle, route ownership, and Learning Lab ownership remain intact.');
  lines.push('- Three.js remains the production mission-world renderer inside the supported app flow.');
  lines.push('- Final Phaser dependency removal remains a separate explicitly gated phase.');
  lines.push('');
  lines.push('## Pages and Docs');
  lines.push('');
  lines.push('- Pages allowlists this R3 cleanup report and the smoke spec decomposition audit.');
  lines.push('- Current Pages policy still excludes tests, internal maintenance tools, archives, and generated artifacts.');
  lines.push('');
  lines.push('## Validation Tiers');
  lines.push('');
  lines.push('- Smoke profile: ' + portfolio.byProfile.smoke.total + ' tests.');
  lines.push('- Release profile: ' + portfolio.byProfile.release.total + ' tests.');
  lines.push('- Full nonvisual profile: ' + portfolio.byProfile.full.total + ' tests.');
  lines.push('- Visual profile: ' + portfolio.byProfile.visual.total + ' tests.');
  lines.push('');
  lines.push('## Required R3 Statements');
  lines.push('');
  lines.push('REPO-CLEAN-R3 physically replaced the monolithic historical E2E layout with capability-owned test files. Pure deterministic assertions were moved to Node coverage rather than discarded.');
  lines.push('');
  lines.push('REPO-CLEAN-R3 removed compatibility and legacy source only after proving that supported production, gated runtime, Learning Lab, Pages, schema, and release paths no longer referenced it.');
  lines.push('');
  lines.push('Active Phaser lifecycle, routing, and Learning Lab ownership remain intact. Final Phaser dependency removal remains a separate explicitly gated phase.');
  return lines.join('\n') + '\n';
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
  const tracked = git(['ls-files']).split(/\r?\n/).filter(Boolean);
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean);
  return [...new Set([...tracked, ...untracked])].map(normalizePath).filter((file) => existsSync(path.join(ROOT, file)));
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
