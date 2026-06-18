import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { REQUIRED_THREE_VENDOR_FILES, THREE_VENDOR_MANIFEST_TYPE, THREE_VENDOR_ROOT } from './three_vendor_files.mjs';

const root = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const installedPackagePath = path.join(root, 'node_modules', 'three', 'package.json');
if (!existsSync(installedPackagePath)) {
  throw new Error('node_modules/three is missing. Run npm.cmd ci to restore locked dependencies before syncing vendor/three.');
}
const installedPackage = JSON.parse(await readFile(installedPackagePath, 'utf8'));
const lockPackage = packageLock.packages?.['node_modules/three'];
const declaredRange = packageJson.dependencies?.three ?? packageJson.devDependencies?.three ?? null;
if (!declaredRange) throw new Error('package.json does not declare three.');
if (!lockPackage?.version) throw new Error('package-lock.json does not include node_modules/three.');
if (installedPackage.version !== lockPackage.version) {
  throw new Error(`Installed three ${installedPackage.version} does not match package-lock ${lockPackage.version}.`);
}
if (!declaredRange.includes(lockPackage.version.replace(/^0\./, '0.')) && declaredRange !== `^${lockPackage.version}` && declaredRange !== lockPackage.version) {
  console.warn(`package.json declares three ${declaredRange}; locked version is ${lockPackage.version}.`);
}

const sourceRoot = path.join(root, 'node_modules', 'three');
const vendorRoot = path.join(root, THREE_VENDOR_ROOT);
const expectedFiles = new Set([...REQUIRED_THREE_VENDOR_FILES, 'LICENSE', 'README.md', 'manifest.json']);
await mkdir(vendorRoot, { recursive: true });
const copied = [];
for (const relative of REQUIRED_THREE_VENDOR_FILES) {
  assertSafeRelative(relative);
  const source = path.join(sourceRoot, relative);
  if (!existsSync(source)) throw new Error(`Required Three.js vendor source is missing: ${relative}`);
  const destination = path.join(vendorRoot, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  copied.push({ path: relative.replace(/\\/g, '/'), sha256: await sha256File(destination), role: roleFor(relative) });
}
await copyFile(path.join(sourceRoot, 'LICENSE'), path.join(vendorRoot, 'LICENSE'));
const readme = `# Vendored Three.js Runtime\n\nThis directory contains the minimal browser runtime files ANCHOR needs from the locked npm package \`three@${installedPackage.version}\`.\n\n\`node_modules/\` remains ignored and is not a deployment artifact. GitHub Pages serves static repository files or a generated static artifact, so browser imports resolve through the import map in \`index.html\` to these curated files.\n\nRefresh with:\n\n\`\`\`bash\nnpm.cmd run vendor:three\n\`\`\`\n\nThen verify with:\n\n\`\`\`bash\nnpm.cmd run check:three-vendor\n\`\`\`\n\nThe npm package and lockfile remain the source of truth. The check script verifies version and checksum drift. Three.js is MIT licensed; the upstream LICENSE is copied unchanged into this directory and attribution is recorded in \`THIRD_PARTY_NOTICES.md\`.\n`;
await writeFile(path.join(vendorRoot, 'README.md'), readme, 'utf8');
const manifest = {
  type: THREE_VENDOR_MANIFEST_TYPE,
  package: 'three',
  version: installedPackage.version,
  license: 'MIT',
  sourcePackage: 'node_modules/three',
  declaredDependency: declaredRange,
  files: copied,
  generatedBy: 'tools/js/sync_three_vendor.mjs'
};
await writeFile(path.join(vendorRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await removeUnexpected(vendorRoot, expectedFiles);
console.log(`Synced Three.js ${installedPackage.version} vendor runtime: ${copied.map((entry) => entry.path).join(', ')}`);

function assertSafeRelative(relative) {
  if (path.isAbsolute(relative) || relative.includes('..') || relative.includes('node_modules')) {
    throw new Error(`Unsafe vendor allowlist path: ${relative}`);
  }
}

function roleFor(relative) {
  if (relative.startsWith('build/')) return 'core';
  if (relative.startsWith('examples/jsm/')) return 'addon';
  return 'runtime';
}

async function sha256File(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

async function removeUnexpected(base, expected) {
  for (const entry of await walk(base)) {
    const relative = path.relative(base, entry).replace(/\\/g, '/');
    if (!expected.has(relative)) await rm(entry, { force: true });
  }
  await pruneEmptyDirs(base, base);
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

async function pruneEmptyDirs(base, dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) await pruneEmptyDirs(base, path.join(dir, entry.name));
  }
  if (dir !== base && (await readdir(dir)).length === 0) await rm(dir, { recursive: true, force: true });
}