import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main = await readFile('src/game/main.js', 'utf8');
const readiness = await readFile('src/app/production/AnchorAppBootReadiness.js', 'utf8');
const phaserBootstrap = await readFile('src/game/phaser/PhaserProductionBootstrap.js', 'utf8');
const mainMenu = await readFile('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
const nextBootstrap = await readFile('src/app/production/AnchorProductionBootstrap.js', 'utf8');

assert.equal((main.match(/initializeAnchorAppBootDebug\(/g) ?? []).length, 1, 'main initializes app boot debug once');
assert.equal((readiness.match(/duplicateBootCount/g) ?? []).length >= 2, true, 'readiness contract tracks duplicate boots');
assert.equal((readiness.match(/__readyEventDispatched/g) ?? []).length >= 2, true, 'ready event is guarded against duplicate dispatch');
assert.equal((phaserBootstrap.match(/createPhaserGame\(/g) ?? []).length, 1, 'Phaser bootstrap creates one Phaser game');
assert.equal((mainMenu.match(/markAnchorRouteReady\('main-menu'/g) ?? []).length, 1, 'Phaser MainMenuScene marks main-menu ready once');
assert.equal((nextBootstrap.match(/markAnchorRouteReady\('main-menu'/g) ?? []).length, 1, 'next production bootstrap marks main-menu ready once');
console.log('PASS audit_app_boot_singleton');