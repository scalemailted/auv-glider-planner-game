import { spawn } from 'node:child_process';
import net from 'node:net';
import { performance } from 'node:perf_hooks';
import { PLAYWRIGHT_GROUPS, grepForGroup } from './playwright_groups.mjs';
import { printCoverageAudit, runCoverageAudit } from './audit_playwright_group_coverage_lib.mjs';

const PORT = 9321;
const RECENT_LINE_LIMIT = 40;
const passthroughArgs = process.argv.slice(2);
const continueOnFailure = passthroughArgs.includes('--continue-on-failure');
const filteredArgs = passthroughArgs.filter((arg) => arg !== '--continue-on-failure');
const hasFocusedArgs = filteredArgs.some((arg) => arg === '--grep' || arg.startsWith('--grep=') || /\.spec\.[cm]?js$/.test(arg));
let activeChild = null;

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (activeChild && !activeChild.killed) activeChild.kill(signal);
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

if (hasFocusedArgs) {
  const result = await runPlaywright(filteredArgs, 'focused-pass-through');
  process.exit(result.code);
}

const audit = await runCoverageAudit();
printCoverageAudit(audit);
if (!audit.valid) process.exit(1);

const results = [];
let failed = false;
for (const group of PLAYWRIGHT_GROUPS) {
  const selectedCount = audit.byGroup[group.id]?.length ?? 0;
  const startIso = new Date().toISOString();
  console.log(`\n=== Playwright group ${group.id}: ${selectedCount} tests; start=${startIso}; port=${PORT} ===`);
  const beforePort = await portAvailable(PORT);
  if (!beforePort) {
    const row = { group: group.id, selectedCount, code: 1, durationMs: 0, startIso, endIso: new Date().toISOString(), port: PORT, portBeforeFree: false, portAfterFree: false, cleanupResult: 'port-occupied-before-start', lastCompletedTest: null, recentLines: [] };
    results.push(row);
    printFailure(row);
    failed = true;
    if (!continueOnFailure) break;
    continue;
  }
  const started = performance.now();
  const run = await runPlaywright(groupPlaywrightArgs(group), group.id);
  const durationMs = performance.now() - started;
  const portAfterFree = await waitForPortFree(PORT, 5000);
  const row = {
    group: group.id,
    selectedCount,
    code: run.code,
    durationMs,
    startIso,
    endIso: new Date().toISOString(),
    port: PORT,
    portBeforeFree: true,
    portAfterFree,
    cleanupResult: portAfterFree ? 'port-free' : 'port-still-listening',
    lastCompletedTest: run.lastCompletedTest,
    recentLines: run.recentLines
  };
  results.push(row);
  console.log(`=== ${group.id} ${row.code === 0 ? 'PASS' : 'FAIL'} in ${formatDuration(row.durationMs)}; end=${row.endIso}; portFreeAfter=${row.portAfterFree}; cleanup=${row.cleanupResult}; last=${row.lastCompletedTest ?? 'n/a'} ===`);
  if (row.code !== 0 || !row.portAfterFree) {
    printFailure(row);
    failed = true;
    if (!continueOnFailure) break;
  }
}

console.log('\nGrouped Playwright summary');
for (const result of results) {
  console.log(`${result.code === 0 && result.portAfterFree ? 'PASS' : 'FAIL'} ${result.group}: ${result.selectedCount} tests, ${formatDuration(result.durationMs)}, start=${result.startIso}, end=${result.endIso}, port=${result.port}, portAfterFree=${result.portAfterFree}, cleanup=${result.cleanupResult}, last=${result.lastCompletedTest ?? 'n/a'}`);
}
console.log(failed ? 'FAIL grouped Playwright suite' : 'PASS grouped Playwright suite');
process.exit(failed ? 1 : 0);

function groupPlaywrightArgs(group) {
  const args = ['--reporter=line', '--workers=1', '--output', 'test-results/.playwright-' + group.id, '--grep', grepForGroup(group.id)];
  if (group.id === 'visualAcceptance') args.push('--headed', '--project=chromium');
  return args;
}

function runPlaywright(args, label) {
  return new Promise((resolve) => {
    const recentLines = [];
    let lastCompletedTest = null;
    const child = spawn(process.execPath, ['./node_modules/@playwright/test/cli.js', 'test', ...args], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    activeChild = child;
    const consume = (chunk, stream) => {
      const text = chunk.toString();
      stream.write(text);
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;
        recentLines.push(line);
        while (recentLines.length > RECENT_LINE_LIMIT) recentLines.shift();
        if (/\b\d+\)|\[\d+\/\d+\]|\.spec\.[cm]?js/.test(line)) lastCompletedTest = line.slice(0, 500);
      }
    };
    child.stdout.on('data', (chunk) => consume(chunk, process.stdout));
    child.stderr.on('data', (chunk) => consume(chunk, process.stderr));
    child.on('close', (code) => {
      if (activeChild === child) activeChild = null;
      resolve({ code: Number(code ?? 1), lastCompletedTest, recentLines });
    });
    child.on('error', (error) => {
      if (activeChild === child) activeChild = null;
      console.error(`Playwright ${label} failed to start: ${error.message}`);
      resolve({ code: 1, lastCompletedTest, recentLines: [...recentLines, `spawn error: ${error.message}`] });
    });
  });
}

function printFailure(row) {
  console.error(`FAIL ${row.group}: selected=${row.selectedCount}, code=${row.code}, port=${row.port}, cleanup=${row.cleanupResult}, duration=${formatDuration(row.durationMs)}, last=${row.lastCompletedTest ?? 'n/a'}`);
  if (row.recentLines?.length) {
    console.error(`Recent ${row.group} output:`);
    for (const line of row.recentLines.slice(-12)) console.error(`  ${line}`);
  }
}

function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

async function waitForPortFree(port, timeoutMs) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (await portAvailable(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return portAvailable(port);
}

function formatDuration(ms) {
  const seconds = ms / 1000;
  return seconds > 90 ? `${(seconds / 60).toFixed(1)}m` : `${seconds.toFixed(1)}s`;
}
