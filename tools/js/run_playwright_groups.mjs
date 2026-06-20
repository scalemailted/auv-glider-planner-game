import { spawn } from 'node:child_process';
import net from 'node:net';
import { performance } from 'node:perf_hooks';
import { PLAYWRIGHT_GROUPS, grepForGroup } from './playwright_groups.mjs';
import { printCoverageAudit, runCoverageAudit } from './audit_playwright_group_coverage_lib.mjs';

const PORT = 9321;
const passthroughArgs = process.argv.slice(2);
const continueOnFailure = passthroughArgs.includes('--continue-on-failure');
const filteredArgs = passthroughArgs.filter((arg) => arg !== '--continue-on-failure');
const hasFocusedArgs = filteredArgs.some((arg) => arg === '--grep' || arg.startsWith('--grep=') || /\.spec\.[cm]?js$/.test(arg));

if (hasFocusedArgs) {
  const code = await runPlaywright(filteredArgs, 'focused-pass-through');
  process.exit(code);
}

const audit = await runCoverageAudit();
printCoverageAudit(audit);
if (!audit.valid) process.exit(1);

const results = [];
let failed = false;
for (const group of PLAYWRIGHT_GROUPS) {
  const selectedCount = audit.byGroup[group.id]?.length ?? 0;
  console.log(`\n=== Playwright group ${group.id}: ${selectedCount} tests ===`);
  const beforePort = await portAvailable(PORT);
  if (!beforePort) {
    console.error(`FAIL ${group.id}: port ${PORT} is already occupied before group start.`);
    results.push({ group: group.id, selectedCount, code: 1, durationMs: 0, portBeforeFree: false, portAfterFree: false });
    failed = true;
    if (!continueOnFailure) break;
    continue;
  }
  const started = performance.now();
  const code = await runPlaywright(['--reporter=line', '--grep', grepForGroup(group.id)], group.id);
  const durationMs = performance.now() - started;
  const portAfterFree = await waitForPortFree(PORT, 4000);
  results.push({ group: group.id, selectedCount, code, durationMs, portBeforeFree: true, portAfterFree });
  console.log(`=== ${group.id} ${code === 0 ? 'PASS' : 'FAIL'} in ${formatDuration(durationMs)}; portFreeAfter=${portAfterFree} ===`);
  if (code !== 0 || !portAfterFree) {
    failed = true;
    if (!continueOnFailure) break;
  }
}

console.log('\nGrouped Playwright summary');
for (const result of results) {
  console.log(`${result.code === 0 && result.portAfterFree ? 'PASS' : 'FAIL'} ${result.group}: ${result.selectedCount} tests, ${formatDuration(result.durationMs)}, portAfterFree=${result.portAfterFree}`);
}
console.log(failed ? 'FAIL grouped Playwright suite' : 'PASS grouped Playwright suite');
process.exit(failed ? 1 : 0);

function runPlaywright(args, label) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['./node_modules/@playwright/test/cli.js', 'test', ...args], { cwd: process.cwd(), stdio: 'inherit' });
    child.on('close', (code) => resolve(Number(code ?? 1)));
    child.on('error', (error) => {
      console.error(`Playwright ${label} failed to start: ${error.message}`);
      resolve(1);
    });
  });
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
