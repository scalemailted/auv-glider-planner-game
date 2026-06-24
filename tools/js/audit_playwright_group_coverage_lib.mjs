import { spawn } from 'node:child_process';
import { auditPlaywrightGroupCoverage, groupsForProfile, patternsForGroupProfile, PLAYWRIGHT_GROUPS } from './playwright_groups.mjs';
import { capabilityCoverageSummary } from '../../tests/e2e/capability_manifest.mjs';

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
  const groupAudit = auditPlaywrightGroupCoverage(titles);
  const profiles = Object.fromEntries(['smoke', 'release', 'full', 'visual'].map((profile) => [profile, selectedTitlesForProfile(profile, groupAudit)]));
  return {
    ...groupAudit,
    profiles,
    capabilities: capabilityCoverageSummary(titles, {
      smokeTitles: profiles.smoke,
      releaseTitles: profiles.release
    })
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
  if (audit.unassigned.length) console.log(`Unassigned tests:\n${audit.unassigned.map((row) => `  - ${row.title}`).join('\n')}`);
  if (audit.duplicate.length) console.log(`Multiply assigned tests:\n${audit.duplicate.map((row) => `  - ${row.title}: ${row.groups.join(', ')}`).join('\n')}`);
  const valid = audit.valid && (audit.capabilities?.valid ?? true);
  console.log(valid ? 'PASS playwright group and capability coverage are exact' : 'FAIL playwright group or capability coverage is not exact');
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
