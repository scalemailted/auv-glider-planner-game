import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { DEFAULT_READY_PROBES } from '../../tests/e2e/static-server.mjs';

const required = [
  '/src/game/main.js',
  '/vendor/phaser.min.js',
  '/vendor/three/build/three.module.js',
  '/packages/contracts/src/index.js',
  '/packages/bathymetry/src/index.js',
  '/packages/currents/src/index.js'
];
for (const route of required) {
  assert.equal(DEFAULT_READY_PROBES.some((probe) => probe.path === route), true, `${route} is in static readiness probes`);
  assert.equal(existsSync(route.slice(1)), true, `${route} exists on disk`);
}
const main = await readFile('src/game/main.js', 'utf8');
assert.ok(main.includes("../../packages/contracts/src/index.js"), 'main imports contracts package entry point');
assert.ok(main.includes("../../packages/bathymetry/src/index.js"), 'main imports bathymetry package entry point');
assert.ok(main.includes("../../packages/currents/src/index.js"), 'main imports currents package entry point');
console.log('PASS audit_package_static_boot_paths');