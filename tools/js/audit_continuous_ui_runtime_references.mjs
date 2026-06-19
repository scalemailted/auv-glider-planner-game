import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'src/ui/HtmlMissionWorkspaceOverlay.js',
  'src/game/phaser/scenes/MissionWorkspaceScene.js',
  'src/game/phaser/scenes/SimulationScene.js',
  'src/game/three/ThreeMissionWorldRenderer.js',
  'src/game/three/ThreeMissionInteractionController.js',
  'src/game/three/ThreeMissionHitTest.js',
  'src/ui/RightWaypointPanel.js'
];
const knownVariables = [
  'waypointSnapMode',
  'coordinateProfileId',
  'fieldSamplingProfileId',
  'volumeRenderProfileId',
  'volumeRenderMode',
  'interpolationProfileId',
  'selectedDiveProfileId',
  'selectedTargetDepthLayerId',
  'continuousWaypointPosition',
  'selectedFieldId',
  'activeDepthLayerId',
  'verticalDisplayMode'
];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  assert.equal(/globalThis\.waypointSnapMode|globalThis\.coordinateProfileId|globalThis\.volumeRenderMode/.test(source), false, `${file} uses forbidden global state fallback`);
  assert.equal(/AnchorBrowserRuntime|RouteScopedViewHost|src\/app\/main\.js/.test(source), false, `${file} references reverted DOM runtime`);
}

const overlay = fs.readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');
for (const variable of ['waypointSnapMode', 'coordinateProfile', 'fieldSamplingProfile']) {
  assert.match(overlay, new RegExp(`const ${variable} = continuousUi\\.`), `Overlay renderer section must source ${variable} from continuousUi`);
}

const scene = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
for (const variable of knownVariables) {
  if (!scene.includes(variable)) continue;
  assert.equal(scene.includes(`globalThis.${variable}`), false, `${variable} must not be read from globalThis`);
}
assert.match(scene, /ensureContinuousMissionUiState\(\)/, 'Planning scene must create normalized continuous UI state');
assert.match(scene, /publishContinuousMissionDebug\(/, 'Planning scene must publish continuous mission debug');

console.log('audit_continuous_ui_runtime_references: ok', { checkedFiles: files.length });