import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const overlay = fs.readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');
const renderer = fs.readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const hitTest = fs.readFileSync('src/game/three/ThreeMissionHitTest.js', 'utf8');

assert.match(scene, /ensureContinuousMissionUiState\(\)/, 'continuous UI state must be reached from MissionWorkspaceScene');
assert.match(scene, /setWaypointSnapMode\(/, 'snap mode handler must be reachable from Planning scene');
assert.match(scene, /setWaterColumnDiveProfile\(/, 'dive profile handler must be reachable from Planning scene');
assert.match(scene, /setWaterColumnVolumeRenderMode\(/, 'volume render handler must be reachable from Planning scene');
assert.match(scene, /ANCHOR_CONTINUOUS_MISSION_DEBUG/, 'continuous mission debug must be populated');
assert.match(overlay, /Waypoint Placement/, 'waypoint placement controls must be visible');
assert.match(overlay, /Dive Planning/, 'dive planning controls must be visible');
assert.match(overlay, /Field Rendering/, 'field rendering controls must be visible');
assert.match(renderer, /ThreeVolumetricScalarFieldLayer/, 'smoothed volumetric renderer layer must be part of production renderer');
assert.match(renderer, /volumetricScalarFieldSummary/, 'renderer summary must expose volumetric scalar summary');
assert.match(hitTest, /continuousPoint/, 'Three hit testing must preserve continuous points');
assert.equal(/usesArbitraryXYZRoutePlanning:\s*true/.test(scene + overlay + renderer), false, 'must not introduce arbitrary XYZ planning');
assert.equal(/rendererOwnsPlanning:\s*true/.test(scene + overlay + renderer), false, 'renderer must not own planning');

console.log('audit_continuous_feature_activation: ok');