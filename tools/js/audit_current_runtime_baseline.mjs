import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');
const failures = [];

const index = read('index.html');
if (!index.includes('src/game/main.js')) failures.push('index.html must boot src/game/main.js.');
if (index.includes('src/app/main.js')) failures.push('index.html must not boot reverted src/app/main.js.');
if (index.includes('AnchorBrowserRuntime')) failures.push('index.html must not activate AnchorBrowserRuntime.');

for (const file of ['vendor/three/build/three.module.js', 'vendor/three/build/three.core.js', 'src/core/science/DepthAwareScienceValue.js', 'src/core/science/DiveProfileFeasibility.js', 'src/core/science/DepthScoringProfiles.js']) {
  if (!existsSync(path.join(root, file))) failures.push(`${file} is missing.`);
}

const phaserGame = read('src/game/phaser/PhaserGame.js');
for (const scene of ['MainMenuScene', 'MissionBriefingScene', 'MissionWorkspaceScene', 'SimulationScene', 'DebriefScene']) {
  if (!phaserGame.includes(scene)) failures.push(`PhaserGame.js must register ${scene}.`);
}

const gameMain = read('src/game/main.js');
if (gameMain.includes('AnchorBrowserRuntime')) failures.push('src/game/main.js must not use AnchorBrowserRuntime.');
if (gameMain.includes('src/app/main.js')) failures.push('src/game/main.js must not depend on src/app/main.js.');

const appDir = path.join(root, 'src/app');
if (existsSync(appDir)) {
  const activeFiles = readdirSync(appDir, { recursive: true }).filter((name) => /main\.js$|AnchorBrowserRuntime\.js$|RouteScopedViewHost\.js$/.test(String(name)));
  if (activeFiles.length) failures.push(`reverted DOM runtime files are present under src/app: ${activeFiles.join(', ')}`);
}

assert.equal(failures.length, 0, failures.join('\n'));
console.log('Current runtime baseline audit passed: src/game/main.js + Phaser lifecycle + vendored Three.js.');
