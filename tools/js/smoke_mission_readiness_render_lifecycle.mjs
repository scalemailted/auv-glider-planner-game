import assert from 'node:assert/strict';
import fs from 'node:fs';

const sceneSource = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const overlaySource = fs.readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');
assert.match(sceneSource, /recordMissionReadinessRender/);
assert.match(sceneSource, /missionReadinessRenderCount/);
assert.match(sceneSource, /missionReadinessRenderCountDuringCameraGesture/);
assert.match(sceneSource, /lastMissionReadinessDigest/);
assert.match(sceneSource, /terrainValidationDebugCounters/);
assert.match(overlaySource, /missionReadinessSection/);
assert.match(overlaySource, /data-action="execute"/);
assert.doesNotMatch(sceneSource.match(/buildTerrainValidationCacheKey[\s\S]*?recordMissionReadinessRender/)?.[0] ?? '', /cameraOrbit|wheel|hover|scroll/i);
console.log('mission readiness render lifecycle smoke passed');