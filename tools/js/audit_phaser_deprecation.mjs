import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const scenes = (await readdir('src/game/phaser/scenes')).filter((file) => file.endsWith('.js'));
const report = [];
for (const scene of scenes) {
  const file = `src/game/phaser/scenes/${scene}`;
  const text = await readFile(file, 'utf8');
  const classification = scene === 'MissionWorkspaceScene.js' || scene === 'SimulationScene.js'
    ? 'legacy-island-transitional'
    : /Demo|Lab|View/.test(scene) ? 'legacy-island-lab' : 'legacy-island-transitional';
  report.push({ file, classification, drawsMissionMap: text.includes('drawMissionMap'), ownsInput: /this\.input\.on|setInteractive/.test(text) });
}
const touched = ['src/game/phaser/scenes/MissionWorkspaceScene.js', 'src/game/phaser/scenes/SimulationScene.js'];
const failures = [];
for (const file of touched) {
  const text = await readFile(file, 'utf8');
  if (/usesMARL:\s*true|usesNewPlanner:\s*true|usesRouteOptimizer:\s*true/.test(text)) failures.push(`${file} adds forbidden planner/optimizer flags.`);
}
const indexHtml = await readFile('index.html', 'utf8');
if (!indexHtml.includes('src="src/app/main.js"')) failures.push('index.html active entry point should be src/app/main.js after MIG-R2.');
if (/<script\s+src="vendor\/phaser\.min\.js"/.test(indexHtml)) failures.push('Phaser should be lazy-loaded by the legacy island host, not index.html.');
const runtimeText = await readFile(path.join('src', 'app', 'runtime', 'AnchorBrowserRuntime.js'), 'utf8');
if (/app\.phaser|\.scene\.start\s*\(/.test(runtimeText)) failures.push('AnchorBrowserRuntime must not use Phaser scene APIs directly.');
assert.deepEqual(failures, []);
console.log('audit_phaser_deprecation: ok', { sceneCount: scenes.length, report });
