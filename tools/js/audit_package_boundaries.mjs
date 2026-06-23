import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packagesRoot = path.join(repoRoot, 'packages');

const expectedPackages = [
  'contracts',
  'bathymetry',
  'currents',
  'scalar-processes',
  'environment',
  'mission-simulator',
  'validation',
  'codecs',
];

const allowedDependencies = new Map([
  ['contracts', []],
  ['bathymetry', ['contracts']],
  ['currents', ['contracts', 'bathymetry']],
  ['scalar-processes', ['contracts', 'currents']],
  ['environment', ['contracts', 'bathymetry', 'currents', 'scalar-processes']],
  ['mission-simulator', ['contracts', 'environment']],
  ['validation', ['contracts', 'bathymetry', 'currents', 'scalar-processes', 'environment', 'mission-simulator', 'codecs']],
  ['codecs', ['contracts']],
]);

const forbiddenImportSpecs = [
  { pattern: /(^|\/)src\/game(\/|$)/, message: 'must not import app/game renderer modules' },
  { pattern: /(^|\/)src\/ui(\/|$)/, message: 'must not import app UI modules' },
  { pattern: /^three($|\/)/, message: 'must not depend on Three.js' },
  { pattern: /^phaser($|\/)/, message: 'must not depend on Phaser' },
];

const forbiddenSourceTerms = [
  { pattern: /\bdocument\b/, message: 'must not use document' },
  { pattern: /\bwindow\b/, message: 'must not use window' },
  { pattern: /\brequestAnimationFrame\b/, message: 'must not use requestAnimationFrame' },
  { pattern: /globalThis\.Phaser\b/, message: 'must not use globalThis.Phaser' },
  { pattern: /\bTHREE\b/, message: 'must not use global THREE' },
  { pattern: /ANCHOR_[A-Z0-9_]+_DEBUG/, message: 'must not write or reference project debug globals' },
];

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(absolute));
    } else {
      files.push(absolute);
    }
  }
  return files;
}

function packageNameForFile(file) {
  const relative = path.relative(packagesRoot, file);
  const [name] = relative.split(path.sep);
  return name;
}

function resolvePackageImport(fromFile, specifier) {
  if (specifier.startsWith('@anchor/')) {
    return specifier.slice('@anchor/'.length).split('/')[0];
  }
  if (!specifier.startsWith('.')) {
    return null;
  }
  const resolved = path.resolve(path.dirname(fromFile), specifier);
  const relative = path.relative(packagesRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return relative.split(path.sep)[0];
}

function importSpecifiers(source) {
  const specs = [];
  const importExportRegex = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const regex of [importExportRegex, dynamicImportRegex]) {
    let match = regex.exec(source);
    while (match) {
      specs.push(match[1]);
      match = regex.exec(source);
    }
  }
  return specs;
}

function validateDependency(currentPackage, importedPackage, file, violations) {
  if (!importedPackage || importedPackage === currentPackage) {
    return;
  }
  const allowed = allowedDependencies.get(currentPackage) || [];
  if (!allowed.includes(importedPackage)) {
    violations.push(`${path.relative(repoRoot, file)} imports ${importedPackage}, which is not allowed for ${currentPackage}`);
  }
}

async function auditPackageJson(packageDir, violations) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const text = await fs.readFile(packageJsonPath, 'utf8');
  const json = JSON.parse(text.replace(/^\uFEFF/, ''));
  const dependencyBlocks = [json.dependencies, json.devDependencies, json.peerDependencies, json.optionalDependencies];
  for (const block of dependencyBlocks) {
    for (const dependency of Object.keys(block || {})) {
      if (dependency === 'three' || dependency.startsWith('three/') || dependency === 'phaser' || dependency.startsWith('phaser/')) {
        violations.push(`${path.relative(repoRoot, packageJsonPath)} declares forbidden dependency ${dependency}`);
      }
    }
  }
}

export async function auditPackageBoundaries() {
  const violations = [];
  if (!await exists(packagesRoot)) {
    violations.push('packages directory is missing');
    return violations;
  }

  for (const packageName of expectedPackages) {
    const packageDir = path.join(packagesRoot, packageName);
    if (!await exists(packageDir)) {
      violations.push(`missing package directory packages/${packageName}`);
      continue;
    }
    await auditPackageJson(packageDir, violations);
  }

  const files = (await listFiles(packagesRoot)).filter((file) => /\.(mjs|js)$/.test(file));
  for (const file of files) {
    const currentPackage = packageNameForFile(file);
    const source = await fs.readFile(file, 'utf8');
    for (const term of forbiddenSourceTerms) {
      if (term.pattern.test(source)) {
        violations.push(`${path.relative(repoRoot, file)} ${term.message}`);
      }
    }
    for (const specifier of importSpecifiers(source)) {
      for (const forbidden of forbiddenImportSpecs) {
        if (forbidden.pattern.test(specifier.replaceAll('\\', '/'))) {
          violations.push(`${path.relative(repoRoot, file)} imports ${specifier}: ${forbidden.message}`);
        }
      }
      validateDependency(currentPackage, resolvePackageImport(file, specifier), file, violations);
    }
  }

  return violations;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const violations = await auditPackageBoundaries();
  if (violations.length) {
    console.error('audit_package_boundaries: failed');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
  } else {
    console.log('audit_package_boundaries: ok');
  }
}


