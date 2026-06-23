import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const siteRoot = path.join(root, '_site');

const required = [
  'packages/bathymetry/src/index.js',
  'packages/bathymetry/src/BathymetryArtifact.js',
  'packages/bathymetry/src/BathymetryManifest.js',
  'packages/bathymetry/src/BathymetrySampler.js',
  'packages/bathymetry/src/BathymetrySourceMetadata.js',
  'packages/bathymetry/src/SignedTerrainSurface.js',
  'packages/contracts/src/index.js',
  'src/core/science/BathymetrySourceMetadata.js',
  'src/core/science/SignedTerrainSurfaceModel.js'
];

for (const relative of required) {
  assert.equal(existsSync(path.join(siteRoot, relative)), true, `_site missing required package runtime file: ${relative}`);
}

for (const relative of ['src/core/science/BathymetrySourceMetadata.js', 'src/core/science/SignedTerrainSurfaceModel.js']) {
  const text = await readFile(path.join(siteRoot, relative), 'utf8');
  const match = text.match(/from\s+['"]([^'"]+)['"]/);
  assert.ok(match, `${relative} should forward to package module`);
  assert.equal(match[1].includes('\\'), false, `${relative} must not use Windows-only import separators`);
  const resolved = path.resolve(path.dirname(path.join(siteRoot, relative)), match[1]);
  assert.equal(resolved.startsWith(siteRoot + path.sep), true, `${relative} forwarding import resolves outside _site`);
  assert.equal(existsSync(resolved), true, `${relative} forwarding import target missing: ${match[1]}`);
}

for (const relative of required.filter((entry) => entry.endsWith('.js'))) {
  const text = await readFile(path.join(siteRoot, relative), 'utf8');
  for (const specifier of moduleSpecifiers(text)) {
    assert.equal(specifier.includes('\\'), false, `${relative} uses Windows-only module specifier ${specifier}`);
    if (specifier.startsWith('.')) {
      const resolved = path.resolve(path.dirname(path.join(siteRoot, relative)), specifier);
      assert.equal(resolved.startsWith(siteRoot + path.sep), true, `${relative} import resolves outside _site: ${specifier}`);
      assert.equal(existsSync(resolved), true, `${relative} import target missing: ${specifier}`);
    }
  }
}

console.log('audit_bathymetry_package_static_paths: ok');

function moduleSpecifiers(text) {
  return [...text.matchAll(/(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)].map((match) => match[1]);
}
