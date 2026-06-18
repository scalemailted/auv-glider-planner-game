import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const scenes = (await readdir('src/game/phaser/scenes')).filter((file) => file.endsWith('.js'));
const report = [];
for (const scene of scenes) {
  const file = `src/game/phaser/scenes/${scene}`;
  const text = await readFile(file, 'utf8');
  const classification = scene === 'MissionWorkspaceScene.js' || scene === 'SimulationScene.js'
    ? 'transitional'
    : /Demo|Lab|View/.test(scene) ? 'lab-only' : 'transitional';
  report.push({ file, classification, drawsMissionMap: text.includes('drawMissionMap'), ownsInput: /this\.input\.on|setInteractive/.test(text) });
}
const touched = ['src/game/phaser/scenes/MissionWorkspaceScene.js', 'src/game/phaser/scenes/SimulationScene.js'];
const failures = [];
for (const file of touched) {
  const text = await readFile(file, 'utf8');
  if (/usesMARL:\s*true|usesNewPlanner:\s*true|usesRouteOptimizer:\s*true/.test(text)) failures.push(`${file} adds forbidden planner/optimizer flags.`);
}
assert.deepEqual(failures, []);
console.log('audit_phaser_deprecation: ok', { sceneCount: scenes.length, report });
