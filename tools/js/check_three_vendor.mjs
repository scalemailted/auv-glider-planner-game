import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { REQUIRED_THREE_VENDOR_FILES, THREE_IMPORT_MAP, THREE_VENDOR_MANIFEST_TYPE, THREE_VENDOR_ROOT } from './three_vendor_files.mjs';

const root = process.cwd();
const failures = [];
const warnings = [];
const packageJson = await readJson('package.json');
const packageLock = await readJson('package-lock.json');
const lockVersion = packageLock.packages?.['node_modules/three']?.version ?? null;
const declaredRange = packageJson.dependencies?.three ?? packageJson.devDependencies?.three ?? null;
if (!declaredRange) failures.push('package.json must declare three.');
if (!lockVersion) failures.push('package-lock.json must include node_modules/three.');
const installedPath = path.join(root, 'node_modules', 'three', 'package.json');
if (existsSync(installedPath)) {
  const installed = JSON.parse(await readFile(installedPath, 'utf8'));
  if (installed.version !== lockVersion) failures.push(`installed three ${installed.version} does not match package-lock ${lockVersion}.`);
} else {
  warnings.push('node_modules/three is absent; validating committed vendor files against manifest and lockfile only.');
}
const manifestPath = path.join(root, THREE_VENDOR_ROOT, 'manifest.json');
if (!existsSync(manifestPath)) failures.push('vendor/three/manifest.json is missing.');
const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : null;
if (manifest) {
  if (manifest.type !== THREE_VENDOR_MANIFEST_TYPE) failures.push('vendor manifest has unexpected type.');
  if (manifest.package !== 'three') failures.push('vendor manifest package must be three.');
  if (manifest.version !== lockVersion) failures.push(`vendor version ${manifest.version} does not match lockfile ${lockVersion}.`);
  if (manifest.license !== 'MIT') failures.push('vendor manifest license must be MIT.');
}
const expectedFiles = new Set([...REQUIRED_THREE_VENDOR_FILES, 'LICENSE', 'README.md', 'manifest.json']);
for (const relative of expectedFiles) {
  if (!existsSync(path.join(root, THREE_VENDOR_ROOT, relative))) failures.push(`missing vendor file ${relative}.`);
}
const actualFiles = existsSync(path.join(root, THREE_VENDOR_ROOT)) ? await walk(path.join(root, THREE_VENDOR_ROOT)) : [];
for (const file of actualFiles) {
  const relative = path.relative(path.join(root, THREE_VENDOR_ROOT), file).replace(/\\/g, '/');
  if (!expectedFiles.has(relative)) failures.push(`unexpected vendor file ${relative}.`);
}
for (const expected of REQUIRED_THREE_VENDOR_FILES) {
  const file = path.join(root, THREE_VENDOR_ROOT, expected);
  const manifestEntry = manifest?.files?.find((entry) => entry.path === expected);
  if (!manifestEntry) failures.push(`manifest missing ${expected}.`);
  else if (existsSync(file)) {
    const digest = await sha256File(file);
    if (digest !== manifestEntry.sha256) failures.push(`checksum drift for ${expected}.`);
  }
}
const index = await readFile(path.join(root, 'index.html'), 'utf8');
if (!index.includes('<script type="importmap">')) failures.push('index.html is missing import map.');
if (!index.includes(`"three": "${THREE_IMPORT_MAP.three}"`)) failures.push('index import map does not point three to vendor runtime.');
if (!index.includes(`"three/addons/": "${THREE_IMPORT_MAP['three/addons/']}"`)) failures.push('index import map does not point three/addons/ to vendor runtime.');
const runtimeFiles = await collectRuntimeFiles(['index.html', 'src', 'css', 'labs']);
for (const file of runtimeFiles) {
  const source = await readFile(path.join(root, file), 'utf8');
  if (/node_modules\/three|node_modules\\three/.test(source)) failures.push(`${file} references node_modules/three.`);
  if (/https?:\/\/[^'"\s]+three/i.test(source)) failures.push(`${file} references external Three.js URL.`);
}
if (failures.length) {
  console.error('Three vendor check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
for (const warning of warnings) console.warn(`WARN ${warning}`);
console.log(`Three vendor check passed for three ${lockVersion}.`);

async function readJson(relative) {
  return JSON.parse(await readFile(path.join(root, relative), 'utf8'));
}
async function sha256File(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
async function collectRuntimeFiles(entries) {
  const files = [];
  for (const entry of entries) {
    const full = path.join(root, entry);
    if (!existsSync(full)) continue;
    if ((await import('node:fs')).statSync(full).isDirectory()) {
      for (const file of await walk(full)) if (/\.(html|js|mjs|css)$/.test(file)) files.push(path.relative(root, file).replace(/\\/g, '/'));
    } else files.push(entry);
  }
  return files;
}