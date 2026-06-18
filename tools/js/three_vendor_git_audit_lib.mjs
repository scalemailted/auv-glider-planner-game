import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { THREE_VENDOR_ROOT } from './three_vendor_files.mjs';

export async function readThreeVendorManifest(root = process.cwd()) {
  const manifestPath = path.join(root, THREE_VENDOR_ROOT, 'manifest.json');
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

export function vendorManifestFiles(manifest, { includeMetadata = false } = {}) {
  const files = (manifest?.files ?? []).map((entry) => `${THREE_VENDOR_ROOT}/${entry.path}`.replace(/\\/g, '/'));
  if (!includeMetadata) return files;
  return [...new Set([`${THREE_VENDOR_ROOT}/manifest.json`, `${THREE_VENDOR_ROOT}/LICENSE`, `${THREE_VENDOR_ROOT}/README.md`, ...files])];
}

export function gitFileState(relativePath, { cwd = process.cwd() } = {}) {
  const normalized = normalizePath(relativePath);
  const ignoredQuiet = runGit(['check-ignore', '-q', '--', normalized], { cwd, allowFailure: true });
  const ignore = ignoredQuiet.status === 0 ? runGit(['check-ignore', '-v', '--', normalized], { cwd, allowFailure: true }) : { stdout: '' };
  const tracked = runGit(['ls-files', '--', normalized], { cwd, allowFailure: true });
  const status = runGit(['status', '--short', '--untracked-files=all', '--', normalized], { cwd, allowFailure: true });
  const statusLines = status.stdout.split(/\r?\n/).filter(Boolean);
  return {
    path: normalized,
    ignored: ignoredQuiet.status === 0,
    ignoreRule: ignoredQuiet.status === 0 ? ignore.stdout.trim() : '',
    tracked: tracked.stdout.split(/\r?\n/).filter((line) => line.trim()).includes(normalized),
    visibleUntracked: statusLines.some((line) => line.startsWith('?? ')),
    status: statusLines
  };
}

export function assertGitAvailable(cwd = process.cwd()) {
  const result = runGit(['rev-parse', '--is-inside-work-tree'], { cwd, allowFailure: true });
  return result.status === 0 && result.stdout.trim() === 'true';
}

export function nodeModulesIgnored({ cwd = process.cwd() } = {}) {
  const result = runGit(['check-ignore', '-q', '--', 'node_modules/three/package.json'], { cwd, allowFailure: true });
  return result.status === 0;
}

export async function auditThreeVendorGitState({
  root = process.cwd(),
  requireTracked = process.env.CI === 'true',
  allowVisibleUntracked = process.env.CI !== 'true',
  includeMetadata = true
} = {}) {
  const failures = [];
  const warnings = [];
  const manifest = await readThreeVendorManifest(root);
  if (!manifest) {
    failures.push('vendor/three/manifest.json is missing or unparsable.');
    return { failures, warnings, manifest: null, files: [] };
  }
  const files = vendorManifestFiles(manifest, { includeMetadata });
  for (const relative of files) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) {
      failures.push(`${relative} is listed for deployment but is missing locally.`);
      continue;
    }
    const state = gitFileState(relative, { cwd: root });
    if (state.ignored) failures.push(`${relative} is ignored by Git: ${state.ignoreRule}`);
    if (state.tracked) continue;
    if (allowVisibleUntracked && state.visibleUntracked) {
      warnings.push(`${relative} is visible as untracked repair work; commit it before deployment.`);
      continue;
    }
    if (requireTracked) failures.push(`${relative} is not tracked by Git.`);
    else failures.push(`${relative} is neither tracked nor visible as an unignored untracked file.`);
  }
  if (!nodeModulesIgnored({ cwd: root })) failures.push('node_modules/ is not ignored by Git.');
  const extraFiles = await unexpectedVendorFiles(root, manifest);
  for (const file of extraFiles) failures.push(`unexpected vendor/three file ${file}; do not vendor the entire Three.js package tree.`);
  return { failures, warnings, manifest, files };
}

export async function unexpectedVendorFiles(root, manifest) {
  const allowed = new Set(vendorManifestFiles(manifest, { includeMetadata: true }).map((file) => file.replace(`${THREE_VENDOR_ROOT}/`, '')));
  const vendorRoot = path.join(root, THREE_VENDOR_ROOT);
  if (!existsSync(vendorRoot)) return [];
  const actual = await walk(vendorRoot);
  return actual
    .map((file) => path.relative(vendorRoot, file).replace(/\\/g, '/'))
    .filter((relative) => !allowed.has(relative));
}

export async function runtimeFilesReferenceNodeModules(root = process.cwd(), entries = ['index.html', 'src', 'css', 'labs']) {
  const failures = [];
  const files = await collectRuntimeFiles(root, entries);
  for (const file of files) {
    const source = await readFile(path.join(root, file), 'utf8');
    if (/node_modules\/three|node_modules\\three/.test(source)) failures.push(`${file} references node_modules/three.`);
    if (/https?:\/\/[^'"\s]+three/i.test(source)) failures.push(`${file} references external Three.js URL.`);
  }
  return failures;
}

export async function sha256File(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

export async function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

export async function collectRuntimeFiles(root, entries) {
  const files = [];
  for (const entry of entries) {
    const full = path.join(root, entry);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) {
      for (const file of await walk(full)) if (/\.(html|js|mjs|css)$/.test(file)) files.push(path.relative(root, file).replace(/\\/g, '/'));
    } else files.push(entry);
  }
  return files;
}

export function runGit(args, { cwd = process.cwd(), allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

export function normalizePath(relativePath) {
  return String(relativePath ?? '').replace(/\\/g, '/');
}
