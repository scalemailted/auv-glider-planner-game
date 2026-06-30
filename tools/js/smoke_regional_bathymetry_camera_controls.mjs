import assert from 'node:assert/strict';
import fs from 'node:fs';

const sceneSource = fs.readFileSync('src/game/phaser/scenes/RegionalBathymetryScene.js', 'utf8');
const rendererSource = fs.readFileSync('src/game/three/ThreeBathymetryRenderer.js', 'utf8');

for (const token of [
  'orbitDragCount',
  'panDragCount',
  'wheelZoomCount',
  'cameraResetCount',
  'cameraBlackoutDetected',
  'lastCameraMode'
]) {
  assert.match(sceneSource, new RegExp(token), `regional scene exposes ${token}`);
}

assert.match(rendererSource, /event\.shiftKey \|\| event\.button === 1 \|\| event\.button === 2 \? 'pan' : 'rotate'/, 'renderer supports shift/middle/right-drag pan');
assert.match(rendererSource, /wheelZoomCount \+= 1/, 'renderer counts wheel zooms');
assert.match(rendererSource, /orbitDragCount \+= 1/, 'renderer counts orbit drags');
assert.match(rendererSource, /panDragCount \+= 1/, 'renderer counts pan drags');
assert.match(rendererSource, /zoom:\s*clamp\(Number\(input\.zoom.*18,\s*220\)/s, 'renderer clamps zoom to safe range');
assert.match(rendererSource, /pitch:\s*clamp\(Number\(input\.pitch.*8,\s*78\)/s, 'renderer clamps polar angle above terrain');
assert.match(rendererSource, /new THREE\.AmbientLight/, 'renderer includes ambient light');
assert.match(rendererSource, /new THREE\.HemisphereLight/, 'renderer includes hemisphere light');
assert.match(rendererSource, /new THREE\.DirectionalLight/, 'renderer includes directional lights');

console.log('smoke_regional_bathymetry_camera_controls: ok');
