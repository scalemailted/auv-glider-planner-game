import { existsSync, statSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const runtimeRoots = ['index.html', 'src', 'packages', 'css', 'labs'];
const failures = [];
const files = await collectRuntimeFiles(runtimeRoots);
for (const file of files) {
  const text = await readFile(path.join(root, file), 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => auditLine(file, index + 1, line));
}
if (failures.length) {
  console.error('GitHub Pages path audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`GitHub Pages path audit passed (${files.length} runtime files).`);

function auditLine(file, lineNo, line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) return;
  const fail = (reason) => failures.push(`${file}:${lineNo} ${reason}`);
  if (/node_modules[\\/]three|[\\/]node_modules[\\/]/.test(line)) fail('runtime path references node_modules.');
  if (/localhost|127\.0\.0\.1|file:\/\//i.test(line) && !file.startsWith('tests/')) fail('runtime path contains local-only URL.');
  if (/https?:\/\/[^'"\s)]+/i.test(line) && /three|cdn|unpkg|jsdelivr|esm\.sh|skypack/i.test(line)) fail('runtime path contains unapproved external CDN/runtime URL.');
  for (const match of line.matchAll(/(?:src|href|fetch|url)\((?:\s*)?["']?([^"')\s]+)|(?:src|href)=["']([^"']+)["']|fetch\(["']([^"']+)["']/g)) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    if (value.startsWith('/') && !value.startsWith('//')) fail(`root-relative runtime path ${value}.`);
    if (/auv-glider-planner-game\//.test(value)) fail(`repository-name hardcoded in runtime path ${value}.`);
  }
  if (/from\s+['"]\.\/vendor\//.test(line)) fail('module import should use import map or module-relative source, not direct vendor import.');
}

async function collectRuntimeFiles(entries) {
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
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}