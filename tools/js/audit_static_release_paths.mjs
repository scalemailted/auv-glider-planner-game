import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const index = readFileSync('index.html', 'utf8');
assert.match(index, /src\/game\/main\.js/, 'index must keep src/game/main.js entry');
assert.doesNotMatch(index, /src="\/|href="\//, 'index must avoid root-relative runtime assets');
assert.ok(existsSync('vendor/three/build/three.module.js'), 'vendored Three module exists');
assert.ok(existsSync('vendor/phaser.min.js'), 'vendored Phaser legacy asset exists');
const phaserBootstrap = readFileSync('src/game/phaser/PhaserProductionBootstrap.js', 'utf8');
assert.match(phaserBootstrap, /new URL\('\.\.\/\.\.\/\.\.\/vendor\/phaser\.min\.js', import\.meta\.url\)/, 'Phaser vendor path must be module-relative for Pages subpath');
const main = readFileSync('src/game/main.js', 'utf8');
assert.match(main, /import\('\.\.\/app\/production\/AnchorProductionBootstrap\.js'\)/, 'next shell dynamic import must be relative');
console.log('static release paths audit passed');
