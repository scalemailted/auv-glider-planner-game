import { spawn } from 'node:child_process';
import { auditPlaywrightGroupCoverage, PLAYWRIGHT_GROUPS } from './playwright_groups.mjs';

const PLAYWRIGHT_CLI = ['./node_modules/@playwright/test/cli.js', 'test'];

export async function collectPlaywrightTestTitles(extraArgs = []) {
  const { code, stdout, stderr } = await runNode([...PLAYWRIGHT_CLI, '--list', ...extraArgs]);
  if (code !== 0) throw new Error(`Playwright --list failed with ${code}\n${stderr}`);
  return parsePlaywrightList(stdout);
}

export function parsePlaywrightList(output = '') {
  return String(output).split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes('›'))
    .map((line) => line.split('›').at(-1).trim())
    .filter(Boolean);
}

export async function runCoverageAudit() {
  const titles = await collectPlaywrightTestTitles();
  return auditPlaywrightGroupCoverage(titles);
}

export function printCoverageAudit(audit) {
  console.log(`Playwright group coverage: ${audit.total} tests`);
  for (const group of PLAYWRIGHT_GROUPS) console.log(`  ${group.id}: ${audit.byGroup[group.id]?.length ?? 0}`);
  if (audit.unassigned.length) console.log(`Unassigned tests:\n${audit.unassigned.map((row) => `  - ${row.title}`).join('\n')}`);
  if (audit.duplicate.length) console.log(`Multiply assigned tests:\n${audit.duplicate.map((row) => `  - ${row.title}: ${row.groups.join(', ')}`).join('\n')}`);
  console.log(audit.valid ? 'PASS playwright group coverage is exact' : 'FAIL playwright group coverage is not exact');
}

function runNode(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}
