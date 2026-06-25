import { spawn } from 'node:child_process';
import { auditPlaywrightGroupCoverage, groupsForProfile, patternsForGroupProfile, PLAYWRIGHT_GROUPS } from './playwright_groups.mjs';
import { TEST_FILE_OWNERSHIP, capabilityCoverageSummary } from '../../tests/e2e/capability_manifest.mjs';

const PLAYWRIGHT_CLI = ['./node_modules/@playwright/test/cli.js', 'test'];

export async function collectPlaywrightTestTitles(extraArgs = []) {
  return (await collectPlaywrightTestEntries(extraArgs)).map((entry) => entry.title);
}

export async function collectPlaywrightTestEntries(extraArgs = []) {
  const { code, stdout, stderr } = await runNode([...PLAYWRIGHT_CLI, '--list', ...extraArgs]);
  if (code !== 0) throw new Error(`Playwright --list failed with ${code}\n${stderr}`);
  return parsePlaywrightListEntries(stdout);
}

export function parsePlaywrightList(output = '') {
  return parsePlaywrightListEntries(output).map((entry) => entry.title);
}

export function parsePlaywrightListEntries(output = '') {
  const sep = String.fromCharCode(0x203a);
  return String(output).replace(/\r/g, '').split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(sep))
    .map((line) => {
      const parts = line.split(sep).map((part) => part.trim());
      const title = parts.at(-1)?.trim() ?? '';
      const filePart = parts.find((part) => /\.spec\.[cm]?js:\d+:\d+/.test(part)) ?? '';
      const fileMatch = filePart.match(/([^\s].*?\.spec\.[cm]?js):\d+:\d+/);
      const file = fileMatch?.[1] ? normalizePath(fileMatch[1]) : '';
      return { title, file: file && !file.includes('/') ? `tests/e2e/${file}` : file };
    })
    .filter((entry) => entry.title);
}

export async function runCoverageAudit() {
  const entries = await collectPlaywrightTestEntries();
  const titles = entries.map((entry) => entry.title);
  const groupAudit = auditPlaywrightGroupCoverage(titles);
  const profiles = Object.fromEntries(['smoke', 'release', 'full', 'visual'].map((profile) => [profile, selectedTitlesForProfile(profile, groupAudit)]));
  return {
    ...groupAudit,
    profiles,
    capabilities: capabilityCoverageSummary(titles, {
      smokeTitles: profiles.smoke,
      releaseTitles: profiles.release
    }),
    physicalOwnership: physicalOwnershipSummary(entries)
  };
}

export function printCoverageAudit(audit) {
  console.log(`Playwright group coverage: ${audit.total} tests`);
  for (const group of PLAYWRIGHT_GROUPS) console.log(`  ${group.id}: ${audit.byGroup[group.id]?.length ?? 0}`);
  if (audit.profiles) {
    for (const [profile, titles] of Object.entries(audit.profiles)) console.log(`  profile ${profile}: ${titles.length}`);
  }
  if (audit.capabilities) {
    console.log(`Capability coverage: ${audit.capabilities.valid ? 'PASS' : 'FAIL'} (${audit.capabilities.total} capabilities)`);
    if (audit.capabilities.missing.length) {
      console.log(`Missing capability coverage:\n${audit.capabilities.missing.map((row) => `  - ${row.id}: ${row.missing.join(', ')}`).join('\n')}`);
    }
  }
  if (audit.physicalOwnership) {
    console.log(`Physical test ownership: ${audit.physicalOwnership.valid ? 'PASS' : 'FAIL'} (${audit.physicalOwnership.checked} declared tests)`);
    if (audit.physicalOwnership.mismatches.length) {
      console.log(`Physical ownership mismatches:\n${audit.physicalOwnership.mismatches.map((row) => `  - ${row.title}: expected ${row.expected}, actual ${row.actual ?? 'missing'}`).join('\n')}`);
    }
  }
  if (audit.unassigned.length) console.log(`Unassigned tests:\n${audit.unassigned.map((row) => `  - ${row.title}`).join('\n')}`);
  if (audit.duplicate.length) console.log(`Multiply assigned tests:\n${audit.duplicate.map((row) => `  - ${row.title}: ${row.groups.join(', ')}`).join('\n')}`);
  const valid = audit.valid && (audit.capabilities?.valid ?? true) && (audit.physicalOwnership?.valid ?? true);
  console.log(valid ? 'PASS playwright group, capability, and physical ownership coverage are exact' : 'FAIL playwright group, capability, or physical ownership coverage is not exact');
}

function selectedTitlesForProfile(profile, audit) {
  const out = [];
  for (const group of groupsForProfile(profile)) {
    const patterns = patternsForGroupProfile(group.id, profile);
    for (const title of audit.byGroup[group.id] ?? []) {
      if (patterns.some((pattern) => pattern.test(title))) out.push(title);
    }
  }
  return [...new Set(out)];
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

function physicalOwnershipSummary(entries) {
  const byTitle = new Map(entries.map((entry) => [entry.title, entry.file]));
  const mismatches = [];
  for (const [title, expectedFile] of Object.entries(TEST_FILE_OWNERSHIP ?? {})) {
    const actual = byTitle.get(title);
    if (normalizePath(actual) !== normalizePath(expectedFile)) mismatches.push({ title, expected: normalizePath(expectedFile), actual: normalizePath(actual) });
  }
  return {
    checked: Object.keys(TEST_FILE_OWNERSHIP ?? {}).length,
    mismatches,
    valid: mismatches.length === 0
  };
}

function normalizePath(value = '') {
  return String(value).replace(/\\/g, '/').replace(/^\.\//, '');
}
